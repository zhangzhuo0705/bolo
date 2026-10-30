---
title: "镜像仓库"
date: 2023-07-14T17:57:02+08:00
draft: false
description: "覆盖 Docker Registry 的部署与存储配置，演示私有镜像仓库的使用。"
cover: "https://b3logfile.com/bing/20190329.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["Docker"]
tags: ["Docker"]
toc: true
---
# 一、Docker Registry

Registry是一个无状态的、高度可扩展的服务器端应用程序，它存储并允许您分发Docker映像。Registry是开源的。存储本身委托给驱动程序。默认存储驱动程序是本地posix文件系统，适用于开发或小型部署。还支持其他基于云的存储驱动程序，例如S3、Microsoft Azure、OpenStack Swift 和 Aliyun OSS。由于保护对镜像的访问至关重要，因此Registry原生支持TLS和基本身份验证。

## 1.1 部署Registry

由于官方提供的registry是一个镜像所以需要事先部署docker。

```bash
#拉取镜像
docker pull registry:latest
#创建数据目录
mkdir /data/registry -p
#启动服务
docker run -it -d -p 5000:5000 -v /data/registry:/var/lib/registry --restart=always --name registry registry:latest
#测试
docker tag registry:latest 192.168.10.71:5000/registry:latest
docker push 192.168.10.71:5000/registry:latest
```

默认服务使用`5000`端口，数据目录使用本地文件系统`/var/lib/registry`，以上参数启动后默认情况下不启动任何认证，即匿名可拉取推送镜像。

## 1.2 更改其他存储器

默认情况下，注册表将其数据存储在本地文件系统上，无论您使用绑定挂载还是卷。您可以使用存储驱动程序将注册表数据存储在 Amazon S3 存储桶、Google Cloud Platform 或另一个存储后端。

官方文档：https://docs.docker.com/registry/storage-drivers/

默认配置文件路径`/etc/docker/registry/config.yml`。

### 1.s3存储

需要修改`storage`字段配置。

| 参数             | 描述                                                         |
| :--------------- | :----------------------------------------------------------- |
| `accesskey`      | 您的s3访问密钥。                                             |
| `secretkey`      | 您的s3密钥。                                                 |
| `region`         | 您的存储桶所在的s3区域。                                     |
| `regionendpoint` | S3兼容存储服务（Minio 等）的端点。                           |
| `bucket`         | 您要在其中存储注册表数据的存储桶名称。                       |
| `secure`         | 指示是否使用HTTPS而不是HTTP。一个布尔值。默认值为`true`.     |
| `skipverify`     | 当值设置为时跳过TLS验证`true`。默认值为`false`.              |
| `chunksize`      | S3 API 要求分段上传块至少为 5MB。此值应为大于 5 * 1024 * 1024 的数字。 |

**示例**：

这里使用minio演示。

```bash
#需要修改配置
docker cp registry:/etc/docker/registry/config.yml .
#修改配置
storage:
  s3:
    accesskey: minio   #s3对象存储认证信息
    secretkey: minio123   
    region: us-west-1    
    regionendpoint: http://192.168.10.72:9000 #对象存储访问url
    bucket: registry  #存储桶名称
    chunksize: 5242880  #分段上传（由 WriteStream 执行）到 S3 的默认分段大小。
#停止服务重新启动
docker run -it -d -p 5000:5000 -v /data/registry:/var/lib/registry -v /root/config.yml:/etc/docker/registry/config.yml --restart=always --name registry registry:latest
#可以上传镜像进行验证，并且查看s3中是否有镜像数据
```

## 1.3 配置文件详解

官方文档:https://docs.docker.com/registry/configuration/

```yaml
version: 0.1  #必须的，指定版本
log:  #日志记录配置
  fields:
    service: registry
  level: debug  #日志级别，默认info
storage:
  cache:  #缓存
    blobdescriptor: inmemory  #使用内存缓存，或者是redis
  filesystem:   #存储数据的控制器，默认为文件系统，可配置其他
    rootdirectory: /var/lib/registry
auth:   #开启认证
  htpasswd:  #使用http基本认证
    realm: basic-realm 
    path: /path/to/htpasswd
http:  #服务监听配置
  addr: :5000
  headers:
    X-Content-Type-Options: [nosniff]
health:  #健康检测相关
  storagedriver:
    enabled: true
    interval: 10s
    threshold: 3
```

## 1.4 其他功能

### 1.启用http基本认证

```bash
#创建认证文件
yum -y install httpd-tools
htpasswd -Bbn admin 123456 > auth
#修改配置
auth:   
  htpasswd:  
    realm: basic-realm 
    path: /etc/docker/registry/auth
#重新启动容器
docker run -it -d -p 5000:5000 -v /data/registry:/var/lib/registry -v /root/config.yml:/etc/docker/registry/config.yml -v /root/auth:/etc/docker/registry/auth --restart=always --name registry registry:latest
#验证，不进行docker login拉取推送镜像会提示需要认证
docker login
#添加用户请直接使用以下命令添加
htpasswd -Bbn zhang 123456 >> auth
```

### 2.开启https

```bash
#生成自签名证书，如果有证书则无需生成
openssl req -utf8 -newkey rsa:4096 -subj "/CN=www.registry.com" -keyout private.key -nodes -x509 -out public.crt
#修改配置文件
http:
  addr: :5000
  tls:
    certificate: /etc/docker/registry/public.crt
    key: /etc/docker/registry/private.key
  headers:
    X-Content-Type-Options: [nosniff]
#重新启动服务
docker run -it -d -p 443:5000 \
-v /data/registry:/var/lib/registry \
-v /root/config.yml:/etc/docker/registry/config.yml \
-v /root/auth:/etc/docker/registry/auth \
-v /root/public.crt:/etc/docker/registry/public.crt \
-v /root/private.key:/etc/docker/registry/private.key \
--restart=always --name registry registry:latest
```

docker拉取镜像如何识别自签名证书，解决方法

```bash
#创建docker证书文件夹
mkdir /etc/docker/certs.d/
#拷贝证书
cp /root/public.crt /etc/docker/certs.d/public.crt
#重启docker
systemctl restart docker
#配置hosts解析，需要配置为生成证书时填写的域名
192.168.10.71 www.registry.com
#登录镜像仓库，能正常登录即表示正常
docker login www.registry.com
```

# 二、harbor

Harbor 是一个用于存储和分发 Docker 镜像的企业级 Registry 服务器，由 vmware 开源，其通过添加一些企业必需的功能特性，例如安全、标识和管理等， 扩展了开源 Docker Distribution。作为一个企业级私有 Registry 服务器，Harbor 提供了更好的性能和安全。提升用户使用 Registry 构建和运行环境传输镜像的效率。Harbor 支持安装在多个 Registry 节点的镜像资源复制，镜像全部保存在私有 Registry 中， 确保数据和知识产权在公司内部网络中管控，另外，Harbor 也提供了高级的安全特性，诸如用户管理，访问控制和活动审计等。

vmware 官方开源服务列表地址：https://vmware.github.io/harbor/cn/

harbor 官方 github 地址：https://github.com/vmware/harbor

harbor 官方网址：https://goharbor.io/

![image-20210416194533191](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210416194533191.png)

基于角色的访问控制：用户与 Docker 镜像仓库通过“项目”进行组织管理， 一个用户可以对多个镜像仓库在同一命名空间（project）里有不同的权限。 镜像复制：镜像可以在多个 Registry 实例中复制（同步）。尤其适合于负载均衡，高可用，混合云和多云的场景。

图形化用户界面：用户可以通过浏览器来浏览，检索当前 Docker 镜像仓库，管理项目和命名空间。

AD/LDAP 支：Harbor 可以集成企业内部已有的 AD/LDAP，用于鉴权认证管理。 审计管理：所有针对镜像仓库的操作都可以被记录追溯，用于审计管理。

国际化：已拥有英文、中文、德文、日文和俄文的本地化版本。更多的语言将会添加进来。

RESTful API - RESTful API ：提供给管理员对于 Harbor更多的操控, 使得与其它管理软件集成变得更容易。

部署简单：提供在线和离线两种安装工具， 也可以安装到 vSphere 平台(OVA 方式)虚拟设备。

```bash
nginx：harbor 的一个反向代理组件，代理 registry、ui、token 等服务。这个代理会转发 harbor web 和 docker client 的各种请求到后端服务上。
harbor-adminserver：harbor 系统管理接口，可以修改系统配置以及获取系统信息。
harbor-db：存储项目的元数据、用户、规则、复制策略等信息。
harbor-jobservice：harbor 里面主要是为了镜像仓库之前同步使用的。
harbor-log：收集其他 harbor 的日志信息。
harbor-ui：一个用户界面模块，用来管理 registry。
registry：存储 docker images 的服务，并且提供 pull/push 服务。
redis：存储缓存信息
webhook：当 registry 中的 image 状态发生变化的时候去记录更新日志、复制等操作。
token service：在 docker client 进行 pull/push 的时候负责 token 的发放。
```

## 2.1 安装 Harbor

下载地址：https://github.com/vmware/harbor/releases

安装文档： https://goharbor.io/docs/2.2.0/

本次使用当前harbor最新的稳定版本2.2.1离线安装包，具体名称为harbor-offline-installer-v2.2.1.tgz

需要在部署的主机事先部署docker与docker-compose。

### 1.配置 Harbor

解压并编辑 harbor.yml配置文件，之前的版本配置文件名称为harbor.cfg

```bash
[19:56:56 root@harbor1 src]#tar xf harbor-offline-installer-v2.2.1.tgz 
[19:58:15 root@harbor1 src]#ln -s /usr/local/src/harbor /usr/local/
[19:59:00 root@harbor1 harbor]#ls
common.sh  harbor.v2.2.1.tar.gz  harbor.yml.tmpl  install.sh  LICENSE  prepare
[19:59:01 root@harbor1 harbor]#cp harbor.yml.tmpl harbor.yml
#安装python环境
[20:00:00 root@harbor1 harbor]#apt install python-pip -y
#编辑配置文件
[20:05:35 root@harbor1 harbor]#grep -vE "#|^$" harbor.yml
hostname: harbor1.zhangzhuo.org   #这里修改
http:
  port: 80
harbor_admin_password: 123456     #admin管理员登录密码
database:
  password: root123
  max_idle_conns: 50
  max_open_conns: 1000
data_volume: /docker/images       #镜像存放位置
trivy:
  ignore_unfixed: false
  skip_update: false
  insecure: false
jobservice:
  max_job_workers: 10
notification:
  webhook_job_max_retry: 10
chart:
  absolute_url: disabled
log:
  level: info
  local:
    rotate_count: 50
    rotate_size: 200M
    location: /var/log/harbor
_version: 2.2.0
proxy:
  http_proxy:
  https_proxy:
  no_proxy:
  components:
    - core
    - jobservice
    - trivy
```

### 3.启动 Harbor

```bash
[20:10:33 root@harbor1 harbor]#pwd
/usr/local/harbor
[20:13:51 root@harbor1 harbor]#./install.sh 
[Step 5]: starting Harbor ...
Creating network "harbor_harbor" with the default driver
Creating harbor-log ... done
Creating harbor-portal ... done
Creating registryctl   ... done
Creating harbor-db     ... done
Creating registry      ... done
Creating redis         ... done
Creating harbor-core   ... done
Creating harbor-jobservice ... done
Creating nginx             ... done
✔ ----Harbor has been installed and started successfully.----
```

登录web页面

![image-20210416201615541](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210416201615541.png)

win电脑需要在hosts文件添加域名才可以使用域名访问，也可以直接使用IP地址访问

## 2.2 其他功能

### 1.停止与启动和重启Harbor

```bash
[20:40:40 root@harbor1 ~]#cd /usr/local/harbor
[20:43:20 root@harbor1 harbor]#pwd
/usr/local/harbor
#停止harbor
[20:43:44 root@harbor1 harbor]#docker-compose stop
[20:45:46 root@harbor1 harbor]#docker ps 
CONTAINER ID        IMAGE               COMMAND             CREATED             STATUS              PORTS               NAMES
#启动harbor
[20:45:50 root@harbor1 harbor]#docker-compose start
#重启harbor
[20:50:34 root@harbor1 harbor]#docker-compose restart
```

### 2.更新harbor配置文件

```bash
[20:43:20 root@harbor1 harbor]#pwd
/usr/local/harbor
[20:47:45 root@harbor1 harbor]#./prepare --help
prepare base dir is set to /usr/local/src/harbor
Usage: main.py prepare [OPTIONS]

Options:
  --conf TEXT         the path of Harbor configuration file
  --with-notary       the Harbor instance is to be deployed with notary
  --with-trivy        the Harbor instance is to be deployed with Trivy
  --with-chartmuseum  the Harbor instance is to be deployed with chart
                      repository supporting

  --help              Show this message and exit.
Clean up the input dir
#如果配置文件修改需要直接执行./prepare，后执行
```

### 3.开启harbor镜像扫描功能

```bash
[20:43:44 root@harbor1 harbor]#docker-compose stop
#删除所有镜像
[20:43:44 root@harbor1 harbor]#docker-compose rm
#重新配置
[21:04:52 root@harbor1 harbor]#./install.sh --with-trivy
```

### 4.harbor的https配置

```bash
[13:40:49 root@harbor1 harbor]#pwd
/etc
[13:41:09 root@harbor1 harbor]#mkdir certs
#生成自签证书
[13:41:09 root@harbor1 harbor]#cd certs
[13:41:22 root@harbor1 harbor]#openssl genrsa -out harbor-ca.key 2048
[13:47:07 root@harbor1 harbor]#openssl req -x509 -new -nodes -key harbor-ca.key -subj "/CN=harbor1.zhangzhuo.org" -days 7120 -out harbor-ca.crt
#修改harbor配置文件
[13:50:27 root@harbor1 harbor]#vim harbor.yml
hostname: harbor1.zhangzhuo.org
https:
  port: 443 
  certificate: /etc/certs/harbor-ca.crt                        
  private_key: /etc/certs/harbor-ca.key
#停止并删除harbor
[13:51:56 root@harbor1 harbor]#docker-compose stop 
[13:52:40 root@harbor1 harbor]#docker-compose rm
#重新执行安装脚本
[13:53:31 root@harbor1 harbor]#./install.sh --with-trivy #--with-trivy这个参数为开启扫描功能
#注意自签名证书是不被信任的所以，还需要配置 --insecure-registry harbor1.zhangzhuo.org才可以使用，或者直接使用授权证书
```

### 5.harbor使用s3对象存储作为镜像后端存储

默认情况下，harbor使用本地存储进行注册，但您可以可选地配置设置，以便harbor使用外部存储。有关如何为不同的存储提供商配置注册表的存储后端的信息，请参阅 Docker 文档中的配置参考https://docs.docker.com/registry/configuration/#storage。

**我这里使用s3对象存储作为harbor镜像仓库存放镜像的位置。使用的s3对象存储为minio，当然也可以使用其他s3对象存储。**

docker官方的配置示例如下

```bash
s3:
    accesskey: awsaccesskey   #s3对象存储认证信息
    secretkey: awssecretkey   
    region: us-west-1    #区域，正常自己搭建的对象存储服务默认为us-west-1，但是如果使用第三方厂商的s3对象存储需要根据实际情况配置
    regionendpoint: http://myobjects.local #对象存储访问url
    bucket: bucketname  #存储桶名称
    encrypt: true  #您是否希望在服务器端加密您的数据 (如果未指定，则默认为 false).
    keyid: mykeyid #您是否希望使用此 KMS 密钥 ID 加密您的数据，如果encrypt不为真，则忽略。
    secure: true #您是否希望通过ssl将数据传输到存储桶。
    v4auth: true #您是否希望在请求中使用 aws 签名版本4
    chunksize: 5242880  #分段上传（由 WriteStream 执行）到 S3 的默认分段大小。
    multipartcopychunksize: 33554432
    multipartcopymaxconcurrency: 100
    multipartcopythresholdsize: 33554432 #这个值需要调大，最大5G
    rootdirectory: /s3/object/name/prefix #这是一个应用于所有 S3 键的前缀，允许您在必要时对存储桶中的数据进行分段。
```

**实现过程**

harbor.yml配置文件

```bash
#添加配置
storage_service:
  s3:
    accesskey: minio
    secretkey: minio123
    region: us-west-1
    regionendpoint: http://192.168.10.71:9000
    bucket: harbor
    multipartcopythresholdsize: "5368709120"
```

重新启动harbor服务，上传镜像验证minio中是否有数据

```bash
[16:54:06 root@centos7 ~]#docker push harbor.zhangzhuo.org/bash/mysql:latest
[16:54:31 root@centos7 ~]#mc ls minio/harbor/
[2021-09-16 16:54:35 CST]     0B docker/
```

在minio的web控制台验证

## 2.3 容器服务使用harbor仓库上传下载镜像

### 1.docker配置实例

注意：如果我们配置的是https的话并且是可信任的证书，本地docker就不需要有任何操作就可以访问harbor了,如果是http需要设置以下参数docker才可以访问仓库

```bash
#第一种修改service文件添加参数
[20:13:24 root@docker ~]#vim /lib/systemd/system/docker.service
ExecStart=/usr/bin/dockerd -H fd:// --containerd=/run/containerd/contain    erd.sock --insecure-registry harbor1.zhangzhuo.org

#第二种修改docker默认配置文件/etc/docker/daemon.json

[14:42:21 root@docker-pull ~]#cat /etc/docker/daemon.json 
{
  "registry-mirrors": ["https://qai5ut9z.mirror.aliyuncs.com"],
  "insecure-registries": ["10.201.80.57:5000","law-harbor.internal.gridsumdissector.com","harbor.kkk.com:5000"]
}

#配置dns解析
[20:20:25 root@docker ~]#vim /etc/hosts
192.168.10.185 harbor1.zhangzhuo.org
#重启服务
[20:21:31 root@docker ~]#systemctl daemon-reload 
[20:21:53 root@docker ~]#systemctl restart docker.service
```

验证能否登录 harbor

```bash
[20:22:06 root@docker ~]#docker login harbor1.zhangzhuo.org
Username: admin
Password: 
WARNING! Your password will be stored unencrypted in /root/.docker/config.json.
Configure a credential helper to remove this warning. See
https://docs.docker.com/engine/reference/commandline/login/#credentials-store

Login Succeeded  #出现这个表示登录成功
```

### 2.containerd使用harbor

## 2.4 实现harbor高可用

高可用实现方式

![image-20210417160603256](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210417160603256.png)

Harbor 支持基于策略的 Docker 镜像复制功能，这类似于 MySQL 的主从同步， 其可以实现不同的数据中心、不同的运行环境之间同步镜像，并提供友好的管理界面，大大简化了实际运维中的镜像管理工作，已经有用很多互联网公司使用 harbor 搭建内网 docker 仓库的案例，并且还有实现了双向复制的案列，本文将实现单向复制的部署

**架构图**

![image-20210417161546587](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210417161546587.png)

部署harbor的同步集群

```bash
#安装俩台harbor主机
#首先安装好docker-ce，这里过程略过
#配置文件harbor.yml
[19:50:26 root@ubuntu18-04 harbor]#vim harbor.yml
hostname: 192.168.10.184   #这里只能写这个机器的IP地址，写域名会导致创建目标仓库测试失败
#其余默认，如开启https需要创建目标仓库时需要写https
#启动
[19:57:52 root@ubuntu18-04 harbor]#./install.sh
```

![无标题](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/无标题.png)

在仓库管理中点新建

这里目标名称可以随便写，目标URL如使用https写https，访问ID访问密码按自己的情况填写，验证证书不要勾选，之后点测试连接，然后点确定

**我这里192.168.10.185有镜像192.168.10.184没有镜像第一次需要同步一次**

![捕获](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/捕获.PNG)

名称：随便写

复制模式：第一次选Pull-based，表示从远端拉取

触发模式：手动

其他，默认

**之后选中，手动复制下，复制完之后删除这个复制规则新建实时同步规则**

俩端都设置

触发模式改为：事件驱动

复制模式：push-based，表示推送

**测试**

```bash
#测试1
[20:29:50 root@docker ~]#cat /etc/hosts
127.0.0.1 localhost
127.0.1.1 zhang
192.168.10.184 harbor1.zhangzhuo.org
192.168.10.185 harbor2.zhangzhuo.org
[20:30:24 root@docker ~]#docker login harbor1.zhangzhuo.org
Login Succeeded
[20:30:33 root@docker ~]#docker tag mysql:latest harbor1.zhangzhuo.org/mysql/mysql:v1
#上传
[20:31:18 root@docker ~]#docker push harbor1.zhangzhuo.org/mysql/mysql:v1
#删除
[20:32:55 root@docker ~]#docker rmi harbor1.zhangzhuo.org/mysql/mysql:v1 mysql:latest
#去另一台拉取
[20:33:17 root@docker ~]#docker pull harbor2.zhangzhuo.org/mysql/mysql:v1
#测试2
[20:34:14 root@docker ~]#docker login harbor2.zhangzhuo.org
Login Succeeded
[20:34:39 root@docker ~]#docker tag harbor2.zhangzhuo.org/mysql/mysql:v1 harbor2.zhangzhuo.org/mysql/mysql:v2
[20:36:23 root@docker ~]#docker push harbor2.zhangzhuo.org/mysql/mysql:v2
#去另一台拉取
[20:37:10 root@docker ~]#docker pull harbor2.zhangzhuo.org/mysql/mysql:v2
#如果全部成功说明同步没有问题
```

安装haproxy

```bash
#俩太都执行
[21:07:08 root@haproxy1 ~]#yum install haproxy
[21:08:01 root@haproxy1 ~]#vim /etc/sysctl.conf
net.ipv4.ip_nonlocal_bind = 1
[21:10:00 root@haproxy1 ~]#sysctl -p
[21:08:01 root@haproxy1 ~]#vim /etc/haproxy/haproxy.cfg
listen web_host_staticrr
    bind 192.168.10.100:80,192.168.10.100:443
    mode tcp
    log global
    balance source    #使用源地址hash
    option forwardfor
    server harbor1 192.168.10.184:443 weight 1 check inter 3000 fall 3 rise 5
    server harbor2 192.168.10.185:443 weight 2 check inter 3000 fall 3 rise 5
[21:10:36 root@haproxy1 ~]#systemctl enable --now haproxy.service
#测试
```

安装keepalive

```bash
[21:38:02 root@haproxy1 keepalived]#yum install keepalived
#ke1配置
vrrp_instance VI_1 {
    state MASTER
    interface eth0
    virtual_router_id 80
    priority 100
    advert_int 1
    authentication {
        auth_type PASS
        auth_pass 1111
    }
    unicast_src_ip 192.168.10.71
    unicast_peer{
        192.168.10.72
    }
    virtual_ipaddress {
        192.168.10.100/24
    }
}
#ke2配置
vrrp_instance VI_1 {
    state BACKUP   
    interface eth0  
    virtual_router_id 80 
    priority 80    
    advert_int 1    
    authentication { 
        auth_type PASS
        auth_pass 1111   
    }
    unicast_src_ip 192.168.10.72
    unicast_peer{
        192.168.10.71
    }  
    virtual_ipaddress { 
        192.168.10.100/24 
    }
}
#启动全部
[21:39:59 root@haproxy2 keepalived]#systemctl enable --now  keepalived.servic
[21:40:27 root@haproxy1 keepalived]#ip a
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast state UP group default qlen 1000
    inet 192.168.10.100/24 scope global secondary eth0
       valid_lft forever preferred_lft foreve
```

docker测试

```bash
[21:41:36 root@docker ~]#cat /etc/hosts
192.168.10.100 harbor.zhangzhuo.org
[21:42:19 root@docker ~]#cat /lib/systemd/system/docker.service
ExecStart=/usr/bin/dockerd -H fd:// --containerd=/run/containerd/containerd.sock --insecure-registry harbor.zhangzhuo.org
[21:42:21 root@docker ~]#systemctl daemon-reload
#登录
[21:43:11 root@docker ~]#docker login harbor.zhangzhuo.org
Username: admin
Password: 
WARNING! Your password will be stored unencrypted in /root/.docker/config.json.
Configure a credential helper to remove this warning. See
https://docs.docker.com/engine/reference/commandline/login/#credentials-store
Login Succeeded
#上传
[21:44:09 root@docker ~]#docker tag nginx:latest harbor.zhangzhuo.org/nginx/nginx:latest
[21:46:23 root@docker ~]#docker push harbor.zhangzhuo.org/nginx/nginx:latest
#下载
[21:47:45 root@docker ~]#docker pull harbor.zhangzhuo.org/nginx/nginx:latest
#测试如果没有问题就可以正常使用了
```

---
title: "helm仓库详解"
date: 2022-02-12T14:33:58+08:00
draft: false
description: "说明 Helm 仓库与 Chart 的组织方式，演示 ChartMuseum 的部署和使用。"
cover: "https://b3logfile.com/bing/20191028.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["Kubernetes"]
tags: ["Kubernetes", "Helm"]
toc: true
---
# 一、Helm仓库介绍

Helm在k8s 中的作用类似与centos中的yum工具，**Chart**代表着 Helm 包。它包含在 Kubernetes 集群内部运行应用程序，工具或服务所需的所有资源定义。你可以把它看作是 Homebrew formula，Apt dpkg，或 Yum RPM 在Kubernetes 中的等价物。所以生成的`Chart`也需要Repository（仓库）用来提供Chart的统一管理。

Helm仓库的构成，仓库中主要的的文件有俩部分分别是Chart的压缩包以及index.yaml文件，最重要的文件其实是index.yaml文件，他的作用主要是为整个仓库的Chart包提供索引，以供helm客户端进行读取检索仓库中有那些Chart包，在helm工具第一次添加仓库时客户端会把这个文件下载到本地，如果仓库中新添加了Chart包，客户端必须使用`helm repo update`进行仓库的更新以获取最新的index.yaml文件。如果自行使用http服务进行仓库的搭建需要手动维护index.yaml文件。文件的生成命令为`helm repo index`。

这里介绍俩个Repository（仓库）服务分别是**harbor**与**ChartMuseum**的部署与使用。这俩个仓库的index.yaml文件不需要手动维护只要上传了Chart包服务会自动更新index.yaml文件。

## 1.1 index.yaml详解

创建index.yaml文件

```bash
[14:18:46 root@centos7 1]#ls
test-0.2.0.tgz
[14:18:47 root@centos7 1]#helm repo index .
```

添加新的Chart包信息到已有的index.yaml文件中

```bash
helm repo index --merge index.yaml  .
```

index.yaml文件内容

```bash
apiVersion: v1
entries:
  test:
  - apiVersion: v2
    appVersion: 1.16.0
    created: "2022-02-09T14:20:26.735579183+08:00"
    description: A Helm chart for Kubernetes
    digest: 44ffccbdc8e3f3bcc8058d58f0be5fb74771137c2cc8fbbb3643a967c0bc73e1
    name: test
    type: application
    urls:
    - test-0.3.0.tgz
    version: 0.3.0
  - apiVersion: v2
    appVersion: 1.16.0
    created: "2022-02-09T14:20:26.735049863+08:00"
    description: A Helm chart for Kubernetes
    digest: 78665ef011c547aaafbd888d4dca9f7a2caf932f01d41c1072e267504291e168
    name: test
    type: application
    urls:
    - test-0.2.0.tgz
    version: 0.2.0
generated: "2022-02-09T14:20:26.734236067+08:00" #这里为文件最后更新的时间
```

## 1.2 helm的客户端repo子命令

```bash
#查看所有仓库
helm repo list
#删除仓库
helm repo remove
#更新仓库
helm repo update
#生成仓库的index.yaml文件
helm repo index
#添加仓库
helm repo add
```

# 二、ChartMuseum

ChartMuseum 是一个用Go写的开源的Helm Chart仓库服务器，支持云存储后端，包括 [Google Cloud Storage](https://cloud.google.com/storage/)， [Amazon S3](https://aws.amazon.com/s3/)， [Microsoft Azure Blob Storage](https://azure.microsoft.com/en-us/services/storage/blobs/)， [Alibaba Cloud OSS Storage](https://www.alibabacloud.com/product/oss)， [Openstack Object Storage](https://developer.openstack.org/api-ref/object-store/)， [Oracle Cloud Infrastructure Object Storage](https://cloud.oracle.com/storage)， [Baidu Cloud BOS Storage](https://cloud.baidu.com/product/bos.html)， [Tencent Cloud Object Storage](https://intl.cloud.tencent.com/product/cos)， [DigitalOcean Spaces](https://www.digitalocean.com/products/spaces/)， [Minio](https://min.io/)，以及 [etcd](https://etcd.io/)。

相比较来说部署比较简单，没有自带的web控制台需要手动部署，功能较少，还在开发阶段，可以提供简单的认证，也支持https。

## 2.1 ChartMuseum部署

官方文档：https://chartmuseum.com/docs/#

Github地址：https://github.com/helm/chartmuseum

Github会直接提供二进制包的下载，下载即可。

### 1.基本安装

```bash
#解压安装包
tar xf chartmuseum-v0.14.0-linux-amd64.tar.gz 
mv linux-amd64/chartmuseum /usr/bin/
#创建本地数据目录
mkdir /data /usr/local/chartmuseum
#创建service文件
cat /etc/systemd/system/chartmuseum.service[Unit]
Description=chartmuseum
Documentation=https://chartmuseum.com/docs/
Wants=network-noline.target
After=network-noline.target

[Service]
WorkingDirectory=/usr/local/chartmuseum
ExecStart=/usr/bin/chartmuseum --prot 8080 \
          --storage=local \
          --storage-local-rootdir=/data
Restart=always

[Install]
WantedBy=multi-user.target
#启动
systemctl enable --now chartmuseum.service
#验证
systemctl status chartmuseum.service
ss -ntl | grep 8080   #有8080端口即可，使用其他端口请自行设置
LISTEN     0      20480     [::]:8080                  [::]:*    
#helm添加仓库测试
helm repo add test http://192.168.10.71:8080
"test" already exists with the same configuration, skipping
```

### 2.基本认证设置

```bash
Description=chartmuseum
Documentation=https://chartmuseum.com/docs/
Wants=network-noline.target
After=network-noline.target
[Service]
WorkingDirectory=/usr/local/chartmuseum
ExecStart=/usr/bin/chartmuseum --prot 8080 \
          --storage=local \
          --storage-local-rootdir=/data \
          --basic-auth-user=admin \
          --basic-auth-pass=123456 \
          --auth-anonymous-get
Restart=always
```

**说明：**

- ​      --basic-auth-user：用户名
- ​      --basic-auth-pass：密码
- ​      --auth-anonymous-get：允许匿名 GET 操作

```bash
#添加认证后helm添加仓库
helm repo add test2 http://192.168.10.71:8080 --username admin --password 123456
"test2" has been added to your repositories
```

## 2.2 其他后端存储使用

### 1.minio后端存储设置

```bash
#创建配置文件，主要配置minio的认证信息
cat /etc/default/chartmuseum.conf 
AWS_ACCESS_KEY_ID="minio"
AWS_SECRET_ACCESS_KEY="minio123"
#创建service文件
cat /etc/systemd/system/chartmuseum.service 
[Unit]
Description=chartmuseum
Documentation=https://chartmuseum.com/docs/
Wants=network-noline.target
After=network-noline.target
[Service]
EnvironmentFile=-/etc/default/chartmuseum.conf
User=root
Group=root
ExecStart=/usr/bin/chartmuseum --port 8080 \
          --storage=amazon \
          --storage-amazon-bucket=charts \
          --storage-amazon-prefix= \
          --storage-amazon-region=us-east-1 \
          --storage-amazon-endpoint=http://192.168.10.71:9000
Restart=always
[Install]
WantedBy=multi-user.target
```

## 2.3 ChartMuseum 前端 UI安装

下载地址：https://github.com/chartmuseum/ui

需要下载github的所以归档，下载后需要使用`docker build`进行镜像的构建。

```bash
#构建镜像
unzip ui-master.zip
cd ui-master/
docker build -t chartmuseum-ui:v1 .
#启动
docker run -it --rm --name chartmuseumui -e CHART_MUSEUM_URL=http://192.168.10.71 -e BASIC_AUTH_USERS='[{"username":"admin", "password":"123456"}]' --network host chartmuseum-ui:v1
```

参数说明

- CHART_MUSEUM_URL：chartmuseum访问地址不能有认证
- BASIC_AUTH_USERS：chartmuseum-ui认证设置格式`[{"username":"admin", "password":"123456"}]`

## 2.4 上传chart包

```bash
#新建chart包
helm create zz
helm package zz/
#上传包
curl --data-binary "@zz-0.1.0.tgz" http://192.168.10.71/api/charts
{"saved":true}
#验证上传的包
helm repo update
helm search repo zz
NAME   	CHART VERSION	APP VERSION	DESCRIPTION                
test/zz	0.1.0        	1.16.0     	A Helm chart for Kubernetes
```

# 三、harbor的chart仓库

harbor主要的功能是一个存储docker镜像的仓库，在 v1.6 版本以后的 harbor 中新增加了 helm charts 的管理功能，可以存储Chart文件。需要在部署时使用`--with-chartmuseum`参数启用该功能。

## 3.1 部署安装

需要提前部署`docker`与`docker-compose`。并且下载离线安装包。

下载地址：https://github.com/vmware/harbor/releases

```bash
tar xf harbor-offline-installer-v2.2.1.tgz
mv harbor /usr/local/
cd /usr/local/harbor/
cp harbor.yml.tmpl harbor.yml
#修改配置文件，为http协议
hostname: 192.168.10.71
http:
  port: 80
harbor_admin_password: 123456
database:
  password: root123
  max_idle_conns: 50
  max_open_conns: 1000
data_volume: /harbor
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
#启动服务
./install.sh --with-chartmuseum
```

**登录创建仓库，并且创建项目**

![image-20220209135216190](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20220209135216190.png)

创建项目后在项目下会看到charts仓库。

## 3.2 仓库使用

harbor的仓库使用链接为`http://<IP地址>/chartrepo/<创建的仓库名称>`

```bash
helm repo add harbor http://192.168.10.71/chartrepo/test

helm repo add harbor-auth http://192.168.10.71/chartrepo/test --username admin --password 123456
```

# 四、Helm的上传chart包的插件helm-push

下载地址：https://github.com/chartmuseum/helm-push/releases

```bash
#解压插件包
mkdir helm-push
tar xf helm-push_0.10.2_linux_amd64.tar.gz -C helm-push
#创建helm插件目录
mkdir -p ~/.local/share/helm/plugins
#拷贝插件到插件目录
cp -a helm-push ~/.local/share/helm/plugins
#测试上传
helm cm-push test-0.2.0.tgz harbor-auth
Pushing test-0.2.0.tgz to harbor-auth...
Done.
```

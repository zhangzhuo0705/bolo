---
title: "基于k8s的DevOps环境构建"
date: 2022-06-04T17:02:08+08:00
draft: false
description: "基于 Kubernetes 搭建 GitLab、Harbor 与 Jenkins，构建完整的 DevOps 环境。"
cover: "https://b3logfile.com/bing/20200304.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["DevOps"]
tags: ["Kubernetes", "gitlab", "harbor", "jenkins"]
toc: true
---
# 一、基于k8s的DevOps环境构建

| IP地址        | 配置      | 服务名称   |
| ------------- | --------- | ---------- |
| 192.168.10.11 | 4C/8G/50G | k8s-master |
| 192.168.10.12 | 4C/8G/50G | k8s-node1  |
| 192.168.10.13 | 4C/8G/50G | k8s-node2  |
| 192.168.10.14 | 4C/4G/50G | gitlab     |
| 192.168.10.15 | 4C/4G/50G | harbor     |
| 192.168.10.16 | 4C/4G/50G | jenkins    |

# 二、下载并部署 gitlab

## 1.gitlab 安装及使用

安装包下载地址：https://packages.gitlab.com/gitlab/gitlab-ce

rpm 包国内下载地址：https://mirrors.tuna.tsinghua.edu.cn/gitlab-ce/yum/

ubuntu 国内下载地址：https://mirrors.tuna.tsinghua.edu.cn/gitlab-ce/ubuntu/pool/

## 2.下载安装gitlab

需事先下载安装包，准备一台4G内存服务器。

```bash
#这里事先从清华源下载最新版gitlab
#内存最少4G
$ free -h
              total        used        free      shared  buff/cache   available
Mem:           3.8G        143M        3.6G         11M        105M        3.5G
Swap:          2.0G          0B        2.0G
#安装
$ yum install ./gitlab-ce-14.9.4-ce.0.el7.x86_64.rpm -y
```

## 3.修改gitlab配置文件

```bash
$ grep "^[a-Z]" /etc/gitlab/gitlab.rb
external_url 'http://192.168.10.14'   #访问地址
prometheus['enable'] = false          #关闭监控
```

## 4.初始化服务

执行配置并启动服务

```bash
#头一次加载服务比较慢，确保内存大于4G,等待启动完成
$ gitlab-ctl reconfigure
Running handlers:
Running handlers complete
Chef Infra Client finished, 575/1536 resources updated in 02 minutes 35 seconds

Notes:
Default admin account has been configured with following details:
Username: root
Password: You didn't opt-in to print initial root password to STDOUT.
#以下/etc/gitlab/initial_root_password为初始化root密码，之后可以访问登录
Password stored to /etc/gitlab/initial_root_password. This file will be cleaned up in first reconfigure run after 24 hours.

NOTE: Because these credentials might be present in your log files in plain text, it is highly recommended to reset the password following https://docs.gitlab.com/ee/security/reset_user_password.html#reset-your-root-password.

gitlab Reconfigured!

#验证状态
$ gitlab-ctl status
run: alertmanager: (pid 29640) 1389s; run: log: (pid 2790) 1433s
run: gitaly: (pid 29742) 1388s; run: log: (pid 2202) 1515s
run: gitlab-exporter: (pid 29625) 1389s; run: log: (pid 2665) 1447s
run: gitlab-kas: (pid 29593) 1391s; run: log: (pid 2427) 1505s
run: gitlab-workhorse: (pid 29603) 1390s; run: log: (pid 2564) 1460s
run: grafana: (pid 29657) 1388s; run: log: (pid 2876) 1403s
run: logrotate: (pid 2094) 1530s; run: log: (pid 2102) 1529s
run: nginx: (pid 2556) 1460s; run: log: (pid 2578) 1459s
run: node-exporter: (pid 29615) 1390s; run: log: (pid 2621) 1451s
run: postgres-exporter: (pid 29649) 1388s; run: log: (pid 2818) 1427s
run: postgresql: (pid 2285) 1512s; run: log: (pid 2384) 1509s
run: puma: (pid 2488) 1474s; run: log: (pid 2502) 1471s
run: redis: (pid 2124) 1524s; run: log: (pid 2142) 1521s
run: redis-exporter: (pid 29627) 1389s; run: log: (pid 2754) 1441s
run: sidekiq: (pid 2507) 1468s; run: log: (pid 2530) 1465s
```

## 5.通过浏览器访问并且创建项目

创建kubernetes组

![image-20220526152729861](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20220526152729861.png)

创建devops的Project

![image-20220526152843081](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20220526152843081.png)

## 6.之后可以将Jenkins服务器的key导入到GitLab

首先生成密钥（如有可以无需生成）

```bash
$ ssh-keygen -t rsa -C "jenkins@zhangzhuo.org"
$ cat ~/.ssh/id_rsa.pub 
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC7G9jFIaeMBMd1qJG/za/lVYQ78kEiEm06a5s65nipPYkocL7NnYV80n6fPxBKkNoQwZy1ByYVuWay44t3h96TumckKxFxcx1FFopLvHQIO/XUTa3oJOyuft1l3KtJAghHF71d9ZyEsYmeKCNE1FK92nfQJvzzdr3gV87lCMnL00PDqrOi+GcxMfAXNsKUN9Ebj6ICVT8592Q2qrQsqewiDTX3gMdzu/p8f4LnqvCkbn8BieVVwNPok6m7Pd61AqgKkkqP0v4N6kqgFxC84ImmtOAfBx3xG/9a8JfB3GO/EkTo/pE2mEKtt1indxd9Us+BLtJNJjR5DXiY5XO6U3Zb jenkins@zhangzhuo.org
```

在gitlab中添加密钥

![image-20220526153502054](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20220526153502054.png)

## 7.在jenkins主机安装git进行测试拉取代码

拉取仓库代码

```bash
#安装git
$ yum install git -y
#创建目录克隆代码
$ mkdir gitlab
$ cd gitlab/
$ git clone git@192.168.10.14:kubernetes/devops.git
```

测试上传代码

```bash
cd devops/
$ cat README.md 
# devops
# k8s devops实验仓库
$ git add .
$ git config --global user.email "you@example.com"
$ git config --global user.name "Your Name"
$ git commit -am "first commit"
$ git push origin main
```

验证提交

![image-20220526154417503](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20220526154417503.png)

# 三、harbor安装部署

下载地址：https://github.com/vmware/harbor/releases

安装文档： https://goharbor.io/docs/

## 1.安装部署

由于Harbor是采用docker-compose一键部署的，所以Harbor服务器也需要安装Docker以及docker-compose

```bash
#验证docker 
$ docker version
Client: Docker Engine - Community
 Version:           19.03.15
#验证docker-compose
$ docker-compose version
docker-compose version 1.29.1, build c34c88b2
docker-py version: 5.0.0
CPython version: 3.7.10
OpenSSL version: OpenSSL 1.1.0l  10 Sep 2019
```

上传harbor离线包，并且部署

```bash
$ tar xf harbor-offline-installer-v2.5.0.tgz  -C /usr/local/
```

## 2.修改配置文件

```bash
$ cp /usr/local/harbor/harbor.yml.tmpl /usr/local/harbor/harbor.yml
$ vim /usr/local/harbor/harbor.yml
hostname: 192.168.10.15  #harbor服务器地址
harbor_admin_password: 123456
data_volume: /data   #数据目录需要手动创建
#注意除了这三项外还需要注释https的全部注释
```

## 3.启动服务

```bash
$ cd /usr/local/harbor/
#预配置
$ ./prepare
# 启动
$ ./install.sh
```

## 4.进入harbor创建仓库

![image-20220526160007950](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20220526160007950.png)

## 5.配置docker或者continerd

如果harbor使用的http需要修改容器服务配置，k8s中容器运行时也需要修改

**docker配置**

```bash
#修改docker配置
$ cat /etc/docker/daemon.json
{
  "registry-mirrors": ["https://qai5ut9z.mirror.aliyuncs.com"],
  "insecure-registries": ["192.168.10.254:5000","192.168.10.15"]
}
#重启服务
$ systemctl restart docker
#登录harbor
$ docker login 192.168.10.15
#上传镜像
$ docker push 192.168.10.15/kubernetes/alpine:latest
```

**continerd配置**

```bash
#修改配置
$ vim /etc/containerd/config.toml
      [plugins."io.containerd.grpc.v1.cri".registry.configs]
        [plugins."io.containerd.grpc.v1.cri".registry.configs."192.168.10.15".auth] #不是匿名仓库拉取镜像需要认证仓库认证信息
          username = "admin"                                                 
          password = "123456"
      [plugins."io.containerd.grpc.v1.cri".registry.mirrors."192.168.10.15"]  #仓库设置
         endpoint = ["http://192.168.10.15"]
#重启
$ systemctl restart containerd.service
#拉取镜像测试
$ crictl pull 192.168.10.15/kubernetes/alpine:latest
Image is up to date for sha256:c059bfaa849c4d8e4aecaeb3a10c2d9b3d85f5165c66ad3a4d937758128c4d18
```

# 四、通过容器部署jenkins

需事先部署docker服务。

jenkins的镜像仓库：https://hub.docker.com/r/bitnami/jenkins

官方的镜像仓库以及停止更新了。

## 1.下载jenkins镜像

```bash
#注意选择debian的镜像，否则没有ssh命令
$ docker pull bitnami/jenkins:2.332.2-debian-10-r29
```

## 2.创建数据目录

```
$ mkdir /data/jenkins_data -p
$ chmod -R 777 /data/jenkins_data



docker run -d --name=jenkins --restart=always -e 
JENKINS_PASSWORD=admin123 -e JENKINS_USERNAME=admin -e 
JENKINS_HTTP_PORT_NUMBER=8080 -p 8080:8080 -p 50000:50000 -v 
/data/jenkins_data:/bitnami/jenkins bitnami/jenkins:2.303.1-debian-10-r29
```

## 3.启动jenkins

```bash
docker run -d --name=jenkins --restart=always --net host \
-e JENKINS_PASSWORD=admin123 \
-e JENKINS_USERNAME=admin \
-e JENKINS_HTTP_PORT_NUMBER=8080 \
-v /data/jenkins_data:/bitnami/jenkins \
192.168.10.254:5000/bitnami/jenkins:2.332.2-debian-10-r29
```

## 4.验证启动

```bash
$ docker logs -f jenkins
#日志看到Jenkins is fully up and running表示启动成功
```

之后通过 Jenkins 宿主机的 IP+8080 即可访问 Jenkins

## 5.插件安装

登录后点击 Manage Jenkins → Manage Plugins 安装需要使用的插件

在安装之前首先配置国内的插件源，点击 Advanced，将插件源更改为国内插件源 （https://mirrors.tuna.tsinghua.edu.cn/jenkins/updates/update-center.json）

需要安装的插件有：

```bash
Git
Git Parameter
Git Pipeline for Blue Ocean
GitLab
Credentials
Credentials Binding
Blue Ocean
Blue Ocean Pipeline Editor
Blue Ocean Core JS
Pipeline SCM API for Blue Ocean
Dashboard for Blue Ocean
Build With Parameters
Dynamic Extended Choice Parameter Plug-In
Dynamic Parameter Plug-in
Extended Choice Parameter
List Git Branches Parameter
Pipeline
Pipeline: Declarative
Kubernetes
Kubernetes CLI
Kubernetes Credentials
Image Tag Parameter
Active Choices
```

勾选后，点击 Download now and install after restart，jenkins安装完后后重启

# 五、jenkins对接各种组件

## 1.修改jenkins必要设置

确保这俩个配置与Jenkins的访问地址一致。

![image-20220526204227438](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20220526204227438.png)

## 2.配置jenkins的凭证

Harbor 的账号密码、GitLab 的私钥、Kubernetes 的证书均使用 Jenkins 的 Credentials 管理。

**配置kubernetes配置文件**

1. 首先需要找到集群中的 KUBECONFIG，一般是 kubectl 节点的~/.kube/config 文件，或者是 KUBECONFIG 环境变量所指向的文件。
2. 接下来只需要把证书文件放置于 Jenkins 的 Credentials 中即可。首先点击 Manage Jenkins， 之后点击 Manage Credentials
3. 然后在点击 Jenkins，之后点击 Add Credentials

![image-20220526165758456](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20220526165758456.png)

- File：KUBECONFIG 文件或其它加密文件；
- ID：该凭证的 ID；
- Description：证书的描述。

## 3.配置harbor账号密码

对于账号密码和 Key 类型的凭证，配置步骤是一致的，只是选择的凭证类型不一样。

接下来通过Jenkins凭证管理Harbor的账号密码。 在同样的位置点击 Add Credentials

选择类型为 Username with password

![image-20220526170004340](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20220526170004340.png)

- Username：Harbor 或者其它平台的用户名；
- Password：Harbor 或者其它平台的密码；
- ID：该凭证的 ID；
- Description：证书的描述。

## 4.配置gitlab的key

点击 Add Credentials，类型选择为 SSH Username with private key

找到jenkins主机的`~/.ssh/id_rsa`之前生成的。

```bash
[17:02:30 root@nexus ~]#cat ~/.ssh/id_rsa
-----BEGIN RSA PRIVATE KEY-----
MIIEpgIBAAKCAQEA465w6ZCAGn/b126i8F2tfhCdp+jzz5MDmPrpxk3xcqHrYXO5
JZA/eZMIykYaU2DuC/cE0N/X4sRmU/7FidkHrnCgxnZmh5nJVd3QMQXYax0sGMSR
t4I1dk8DZNrsl+724wgQ6GfRbPZ0ggbebJTMiXT4TMmAsVrtEL/jDGJlXwozi65q
SR+MvFG7H1iRwJbwNeNyJkImFKM0HxXsWxQez58q/9HLpj5bN31z6BVTM1G2cEub
AiLYr034B6euHQWqz6kW+gSTq+QY58aAaDcH7raKiHulhAgZNTwBH3EWDLHe713o
nFX4DWMe/AFyce+g0oxD6jT3mC+YKP77WDqxSwIDAQABAoIBAQCrbOwW73WEfkBI
NET6NY4rHNeXVQ49e7N5u3HInWbtqHxRI5CDd9hS8SHtKlsn7BNPbu1xVxh05Osm
0uxonb/q12I2C2+nKWMuA5R9VKld/Nj2zQnp4V/fdB5aEXuR6Zp51djlI0XLhMS0
IffWSTK3TBqntg/veUaFFfUdnfg1VU0yUxemaeCxclSgVxNDPDlM+/tOBoGrGEat
DgarS9qklB4NlnHvvBjXxHJBAeHxOAG63M8mSHPoabiPfKiz5Nz0umgS4rF5gMAu
aKyeOIdIE7QIY9wF65UYqLslIbs6i4rIaOHLhXxB0WPaYrxUrc4NuX2HiFepfhmD
kCtQ1LABAoGBAPocWlgCHZbPxSdddaMEnw0Fc6/BGOlC9NCJC9Yz6JiCMFMlVn7h
qJun5vBY3rC/cCPCVqCvfuA7NnTdqVyjS0NRU9nCoOHFyCc5VrrYlnXtbb+1agsX
0P8l0cdcaCkNyxYai/dpMososj34AWwZLEc54ZJ2pGR52u8KQd6nPrihAoGBAOkK
4suWWz3Vijiuu9EL6KG684jmpVZ155K1JLaPqlTo6ljXOJAjo/s5cEcZu+6OTzZx
CS4avGfDoHjn+WDUTb2wrmhP532fdPZq0j8M8bmDonZXbWNrgv95rYa47Ijn9LPP
PU2Q5p9TMC97Kr1X4WKVo6l6LM1MXvAqzsx/18ZrAoGBAICaR5HtNI2xM6y0D6LM
44NshDmgzlBSj1MSxLVVZ4nTl0mJb1o6adnvkX2QFKFJLj4U1To2QsTFbZDV0RnD
FRX+IWFdBCBS9EHG5+OXLnZgqQfkHiyqCFrJdX5O83f4ka5B5CpJOyX2vP/EH+cX
Yn8VMfl/a7QGPB6hZZE46bVBAoGBANuQ0RwF/tNkhUVghD6ynKz8ioXa4b5zegrE
tuF2vIIhrOKlbHqJye9iL8Idoe5ikIl3uLGCqS6Op3wi+9faT6DAfaJ0XmQCv92H
ya10Ea+7MW+UcdDxM8xmpTLAusNG4EwlntmdA1zrsQObZSpeSVFsMXX1UY7gPLbF
bnBIp1EfAoGBAONwU0QqGOC6+FA0o1g2FLHqhbjk/1I0VvalWPQTGaI79d55Gq2v
KNaFckk/3xg+SdJVkDKe7sIam7QOqrHlB1PUG6+ZLdxD6SgUyljZdXAy0+PF0Vk5
YRStm7FkoYC609NJRQY/Yhb+lkGGdTrOP93O6VZJWX8ZTB5IwZ/8w6op
-----END RSA PRIVATE KEY-----
```

![image-20220526170419194](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20220526170419194.png)

- Username：用户名，无强制性
- Private Key：Jenkins 服务器的私钥，一般位于~/.ssh/id_rsa。

## 5.配置agent

通常情况下，Jenkins Slave 会通过 Jenkins Master 节点的 50000 端口与之通信，所以需要开启 Agent的50000端口。

点击 Manage Jenkins，然后点击 Configure Global Security：

![image-20220526170541443](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20220526170541443.png)

实际使用时，没有必要把整个Kubernetes集群的节点都充当创建Jenkins Slave Pod 的节点， 可以选择任意的一个或多个节点作为创建 Slave Pod 的节点

```bash
kubectl label node 192.168.10.12 build=true
```

如果集群并非使用 Docker 作为 Runtime，但是由于构建镜像时，需要使用 Docker，所以该节点需要安装Docker

## 6.jenkins配置kubernetes多集群

首先点击 Manage Jenkins，之后点击 Configure Clouds：

![image-20220526173006403](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20220526173006403.png)

最后点击 Save 即可，添加完 Kubernetes 后，在 Jenkinsfile 的 Agent 中，就可以选择该集群作为创建Slave的集群。

如果想要添加多个集群，重复上述的步骤即可。首先添加 Kubernetes 凭证，然后添加 Cloud 即可。

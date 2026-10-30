---
title: "Windows搭建k8s实验环境"
date: 2022-11-25T16:32:49+08:00
draft: false
description: "说明如何在 Windows Workstation 中用 vctl 和 KIND 搭建 Kubernetes 实验环境。"
cover: "https://b3logfile.com/bing/20210514.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["Kubernetes"]
tags: ["kubernetes", "vctl"]
toc: true
---
# 一、Workstation的容器环境

**依赖项**：

- Workstation Pro 17
- Windows 10 1809或更高版本
- 需要互联网以及科学上网

在新版本的Workstation中官方提供了一个`vctl`工具可进行容器的启动与管理，与docker功能基本相同，此外vctl还提供了KIND支持，以便KIND可以使用vctl容器作为节点来运行本地Kubernetes 集群。

相关的可执行文件捆绑在Workstation Pro应用程序中，可在`C:\Program Files (x86)\VMware\VMware Workstation`文件夹中找到这些文件。

**以下部分简要说明了vctl命令行实用程序的三个可执行文件**

- **containerd.exe**:这是一个在后台运行的运行时守护进程。必须先启动containerd守护进程，然后才能运行任何与容器相关的操作。要启动该守护进程，请使用`vctl system start`命令，要停止该守护进程，请使用`vctl system stop`命令。
- **containerd-shim-crx-v2.exe**:启动新容器时，将启动一个新的 containerd-shim-crx-v2 进程，该进程将充当 CRX 虚拟机中的容器与containerd守护进程之间的适配器。
- **bin/vctl.exe**:这是一个在前台运行的命令行实用程序，它可以将用户输入中继到 containerd 守护进程。

**注意**：vct在启动容器时会在称作`CRX 虚拟机`的轻量级虚拟机内运行每个容器。虚拟机在容器启动时创建并启动。容器停止时，将关闭并移除该虚拟机。CRX 虚拟机的名称与容器的名称相同。

## 1.1 启动vctl实用程序

**使用vctl服务前注意事项**

- 所有vctl产生的数据存放在系统运行命令的家目录如：`C:\Users\${user}\.vctl`，需要准备足够的空间以免C盘被占用满
- 需要在Workstation中打开Vmnet8虚拟网络的DHCP服务

首先在没有运行过vctl程序的主机上首次运行需要连接互联网下载相关软件包。运行命令在Windows PowerShell窗口运行。

**启动过程如下**

```bash
#验证当前vctl服务状态，正常情况下状态为stopped状态
vctl.exe system info
#启动vctl服务，在运行启动命令后会下载相关依赖包等待下载完成后会自动启动服务，服务启动后再次验证服务状态应该是runing
vctl.exe system start
#验证vctl服务是否可用，启动一个容器进行验证
#拉取镜像
vctl.exe pull nginx
#启动容器
vctl.exe run -it -d --name nginx -p 80:80 nginx
#验证容器状态
vctl.exe ps
#访问nginx服务
curl 127.0.0.1:80
#以上操作没有问题表示vctl状态正常
```

powershell配置客户端命令增强

```bash
#需要安装vscode
#获取补齐脚本
vctl.exe completion  powershell
#复制打印的脚本，执行以下命令粘贴到自动打开的文件文件中
code
#之后重新打开powershell
```

## 1.2 vctl服务说明

**服务启动相关命令**

```bash
#启动服务
vctl.exe system start
#停止服务
vctl.exe system stop
#查看服务状态
vctl.exe system info
```

**服务配置相关命令**

配置为主要设置资源，默认配置如下

- 容器环境资源默认为：2C1G
- k8s的node节点资源为：2C2G

```bash
vctl system config --vm-cpus 4 --vm-mem 2g  --k8s-cpus 4 --k8s-mem 8g

#说明
--vm-cpus   容器环境cpu个数
--vm-mem    容器内存大小
--k8s-cpus  k8s的node节点cpu数量
--k8s-mem   k8s的node节点内存大小
```

## 1.3 vctl基本使用

vctl的使用基本与docker命令一致。

### 1.容器镜像相关

```bash
#拉取镜像
vctl.exe pull nginx
#查看镜像列表
vctl.exe images
#删除镜像
vctl.exe rmi nginx
#重新给镜像打tag
vctl.exe tag nginx:latest harbor.zhangzhuo.org/nginx/nginx:latest
#登录镜像仓库
vctl login harbor.zhangzhuo.org
#退出镜像仓库
vctl.exe logout harbor.zhangzhuo.org
#构建镜像与Docker一样
vctl.exe built -t harbor.zhangzhuo.org/bash/nginx:latest .
#上传镜像
vctl.exe push harbor.zhangzhuo.org/bash/nginx:latest
```

### 2.容器相关

```bash
#容器启动
vctl.exe run -it -d --name nginx -p 80:80 nginx:latest
#查看容器
vctl.exe ps -a
#删除容器
vctl.exe rm -f nginx
#启动容器
vctl.exe start nginx
#停止容器
vctl.exe stop nginx
#查看容器详细信息
vctl.exe describe nginx
vctl.exe inspect  nginx
#进入容器内部
vctl.exe exec -it  nginx bash
#进入容器的宿主机
vctl.exe execvm -c nginx
```

# 二、Workstation的k8s环境搭建

workstation的k8s依赖与Kind进行搭建，内部进行了分装使用非常方便。

**准备Kind环境**

```bash
vctl.exe kind
```

执行后会打开一个新的命令执行窗口，如果关闭这个窗口会丢失kind上下文件，如果之后还需要使用请再次执行这个命令。

## 2.1 kind的使用

创建集群

```bash
#创建集群，这样搭建的为单节点集群
kind.exe create cluster --name k8s
#配置kubectl的客户端上下文
kubectl cluster-info --context kind-k8s
#验证，之后就可以使用kubectl操作集群了
kubectl.exe get pod -A
```

多节点集群搭建

```bash
# Kind 创建K8s集群 配置文件
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
# 该集群包含1个控制平面节点、3个工作节点
nodes:
- role: control-plane
  # 设置端口映射, 便于通过宿主机访问节点
  extraPortMappings:
  - containerPort: 80
    hostPort: 8880
    listenAddress: "127.0.0.1"
  - containerPort: 443
    hostPort: 8443
    listenAddress: "127.0.0.1"
- role: worker
- role: worker
- role: worker

#创建集群
kind create cluster --name k8s --config cluster.yaml
```

部署k8s的dashboard控制台

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.0.5/aio/deploy/recommended.yaml
#创建认证
kind: Service
apiVersion: v1
metadata:
  labels:
    k8s-app: kubernetes-dashboard
  name: kubernetes-dashboard
  namespace: kubernetes-dashboard
spec:
  type: NodePort  #添加
  ports:
    - port: 443 
      targetPort: 8443
      nodePort: 30001  #添加
  selector:
    k8s-app: kubernetes-dashboard
#创建
kubectl apply -f dashboard.yaml
#创建用户
cat admin.yaml 
apiVersion: v1
kind: ServiceAccount
metadata:
  name: admin-user
  namespace: kubernetes-dashboard
#创建
kubectl.exe apply -f .\admin.yaml
#获取访问密钥
kubectl describe secrets -n kubernetes-dashboard admin-user-token-9g9h5
#获取访问IP，随便找一个容器的IP
vctl.exe ps
#设置端口
kubectl.exe edit svc -n kubernetes-dashboard kubernetes-dashboard
  type: NodePort
#获取端口
kubectl.exe get svc -n kubernetes-dashboard kubernetes-dashboard
```

部署Metrics-server

```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/download/v0.4.5/components.yaml

#验证
kubectl.exe top node
```

---
title: "Docker-swarm"
date: 2023-07-20T16:49:38+08:00
draft: false
description: "说明 Docker Swarm 的集群模式，演示节点加入、服务部署和滚动更新。"
cover: "https://b3logfile.com/bing/20180210.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["Docker"]
tags: ["Docker"]
toc: true
---
# 一、Docker-swarm介绍

docker-swarm是docker官方提供的docker集群模式，如果你有多台docker进行管理可选择这种模式，docker-swarm是内置在docker中的不需要部署其他组件，部署完docker即可正常使用。一个swarm由多个Docker主机组成，这些主机在swarm模式下运行并充当管理节点和node节点。可以同时指定docker节点为管理节点和node节点，创建服务时，可以设置服务的副本数、网络和存储资源。服务可向外部公开端口，swarm会维护服务的状态，如果node节点变成不可用，swarm会调度服务的容器到其他正常的节点。服务与独立容器不同服务可进行修改配置，包括网络和卷无需重新启动服务，swarm会进行滚动更新。当docker在swarm模式下运行时，还是可以使用传统方法进行独立容器的创建。

官方文档:https://docs.docker.com/engine/swarm/

## 1.1 Docker-swarm安装

docker swarm不需要任何组件，安装完docker就可以直接使用

### 1.安装docker-ce

```bash
#使用任何方式都可以，这里使用yum
yum install docker-ce
#启动服务
systemctl restart docker
#验证
docker info
```

### 2.初始化集群

```bash
#初始化集群--advertise-addr声明当前机器IP，初始化集群之后这台主机就是管理节点
docker swarm init --advertise-addr 10.202.41.200
#以下为输出
Swarm initialized: current node (swa7jex0a2gk38nm40zfby9u1) is now a manager. #初始化节点信息

To add a worker to this swarm, run the following command:

    docker swarm join --token SWMTKN-1-5bfkv1nc6n71lnokr0d1gcfk0v33pqhy1c1y1too4m3iyt5zml-3hs1nmbog8wisdodruz2u5gbr 10.202.41.200:2377  #添加work节点命令

To add a manager to this swarm, run 'docker swarm join-token manager' and follow the instructions.  #获取添加master节点的命令
#初始化完成验证docker当前状态
docker info
 Swarm: active    #swarm在线
  NodeID: swa7jex0a2gk38nm40zfby9u1  #当前node的id
  Is Manager: true  #是否是控制节点
  ClusterID: taaw2uzw86yj84zujc4lfzswi  #集群id
  Managers: 1  #一共多少个控制节点
  Nodes: 1     #一共多少个node节点
  Default Address Pool: 10.0.0.0/8  
  SubnetSize: 24
  Data Path Port: 4789
  Orchestration:
   Task History Retention Limit: 5
  Raft:
   Snapshot Interval: 10000
   Number of Old Snapshots to Retain: 0
   Heartbeat Tick: 1
   Election Tick: 10
  Dispatcher:
   Heartbeat Period: 5 seconds
  CA Configuration:
   Expiry Duration: 3 months
   Force Rotate: 0
  Autolock Managers: false
  Root Rotation In Progress: false
  Node Address: 10.202.41.200
  Manager Addresses:
   10.202.41.200:2377
```

命令介绍：

- `docker swarm init --advertise-addr <MANAGER-IP>`：初始化控制节点，初始化后会生成一些数据信息
- `docker swarm join-token manager`：获取控制节点添加的命令
- `docker swarm join-token worker`：获取work节点添加命令

### 3.添加节点

```bash
#在其他节点加入swarm
docker swarm join --token SWMTKN-1-5bfkv1nc6n71lnokr0d1gcfk0v33pqhy1c1y1too4m3iyt5zml-3hs1nmbog8wisdodruz2u5gbr 10.202.41.200:2377
#验证，这个命令必须在控制节点执行
docker node ls
ID                            HOSTNAME   STATUS    AVAILABILITY   MANAGER STATUS   ENGINE VERSION
swa7jex0a2gk38nm40zfby9u1 *   centos1    Ready     Active         Leader           24.0.4
xmtgwy3his8t48noofv0sxxoe     centos2    Ready     Active                          24.0.4
jzwo45pzf9i0vcy7fu4g5pt06     centos3    Ready     Active                          24.0.4
#创建overlay网络，需要在master节点
docker network create -d overlay --subnet=172.16.0.0/16 --gateway=172.16.0.1 --attachable net
```

### 4.部署服务

必须在控制节点执行

```bash
#部署一个服务验证
docker service create --replicas 3 --name web  --network net nginx:latest
#验证
docker service ls
```

## 1.2 节点维护

- docker node demote：在集群中降级一个节点，从控制节点降级为work节点
- docker node promote：升级一个节点，从work升级为管理
- docker node inspect：查看一个节点的详细信息，默认json格式输出
- docker node ls：列出所有节点
- docker node ps：查看一个节点运行的所有容器
- docker node rm：删除一个节点
- docker node update：更新节点

示例：

```bash
#升级节点
docker node promote centos2
#降级节点
docker node demote centos2
#查看节点详细信息
docker node inspect centos2
#查看节点运行的容器
docker node ps
```

### 1.节点列表查看

```bash
[root@centos1 ~]# docker node ls
ID                            HOSTNAME   STATUS    AVAILABILITY   MANAGER STATUS   ENGINE VERSION
swa7jex0a2gk38nm40zfby9u1 *   centos1    Ready     Active         Leader           24.0.4
xmtgwy3his8t48noofv0sxxoe     centos2    Ready     Active                          24.0.4
jzwo45pzf9i0vcy7fu4g5pt06     centos3    Ready     Active                          24.0.4
```

信息输出介绍

- ID：节点ID
- HOSTNAME：节点主机名称
- STATUS：状态
- AVAILABILITY：表示服务容器状态
  - Active：表示接收任何服务容器分配
  - Pause：表示新服务容器不分配在这个节点，旧容器保持现状
  - Drain：表示新服务容器不分配在这个节点，驱逐现有容器
- MANAGER STATUS：控制节点状态
  - 无信息：表示不是控制节点
  - Leader：意味着控制节点的leader
  - Reachable：表示为控制节点的候选节点
  - Unavailable：表示控制节点无法正常通信

### 2.更新节点

**更改节点可用性**

- `docker node update --availability <availability_name> <node_name>`
  - active
  - Pause
  - Drain

```bash
docker node update --availability drain centos2
```

**给节点添加删除标签**

- --label-add：添加标签
- --label-rm：移除标签

```bash
docker node update --label-add zhangzhuo=true centos2
docker node update --label-rm zhangzhuo centos2
```

### 3.把节点从集群剥离

1. docker swarm leave：在节点上运行命令以将其从群中删除
2. docker node rm：之后在控制节点移除节点即可

```bash
#在移除的节点执行
docker swarm leave
#控制节点删除节点
[root@centos1 ~]# docker node ls
ID                            HOSTNAME   STATUS    AVAILABILITY   MANAGER STATUS   ENGINE VERSION
swa7jex0a2gk38nm40zfby9u1 *   centos1    Ready     Active         Leader           24.0.4
xmtgwy3his8t48noofv0sxxoe     centos2    Down      Active                          24.0.4
jzwo45pzf9i0vcy7fu4g5pt06     centos3    Ready     Active                          24.0.4
[root@centos1 ~]# docker node rm centos2 
centos2
#验证
[root@centos1 ~]# docker node ls
ID                            HOSTNAME   STATUS    AVAILABILITY   MANAGER STATUS   ENGINE VERSION
swa7jex0a2gk38nm40zfby9u1 *   centos1    Ready     Active         Leader           24.0.4
jzwo45pzf9i0vcy7fu4g5pt06     centos3    Ready     Active                          24.0.4
```

### 4.添加节点

添加节点需要重新获取添加节点的对应命令，获取方式如下

- docker swarm join-token worker：获取添加work节点命令
- docker swarm join-token manager：获取添加控制节点命令

## 1.3 服务管理

服务使用`docker service`命令进行管理，具体如下：

- create：创建服务
- inspect：查看服务详细信息，默认json输出
- logs：查看服务日志
- ls：查看所有服务列表
- ps：查看某个服务的所有容器列表
- rm：删除一个服务
- rollback：回滚服务
- update：更新服务
- scale：设置服务副本数量

### 1.创建服务

创建服务使用`docker service create`命令，此命令有许多参数，常用的具体如下

- --name：指定服务名称
- --network：指定服务使用的网络，一般为自己创建的overlay网络
- --env：指定环境变量
- --env-file：指定变量文件
- --workdir：指定工作目录
- --limit-cpu：指定cpu限制
- --limit-memory：指定内存限制
- --publish：指定服务端口映射
- --replicas：指定副本数量
- --constraint：设置节点放置约束
  - node.labels.<key_name>==/!=<key_value>：示例格式
- --mount：挂载卷
  - `type=bind,src=<HOST-PATH>,dst=<CONTAINER-PATH>`：挂载本地卷格式,启动服务前挂载目录必须存在
  - `type=volume,src=<VOLUME-NAME>,dst=<CONTAINER-PATH>,volume-driver=<DRIVER>,volume-opt=<KEY0>=<VALUE0>,volume-opt=<KEY1>=<VALUE1>`：挂载其他类型的卷

```bash
docker service create \
--name nginx \
--network net \
--env zhangzhuo=true \
--env-file env \
--workdir /tmp \
--limit-cpu 1 \
--limit-memory 1G \
--publish 80:80 \
--replicas 1 \
--mount type=bind,src=/data1/nginx,dst=/data1 \
docker.gridsumdissector.com/gai/nginx:latest
```

**设置服务调度到特定节点**

```bash
#给节点添加标签
docker node update --label-add ssd=true centos2
#创建服务
docker service create --name client --constraint node.labels.ssd==true --replicas 3 --network net docker.gridsumdissector.com/gai/alpine:latest sleep 3000
```

### 2.更新服务

更新服务使用`docker service update`命令，具体常用参数如下：

- --image：指定镜像
- --replicas：指定副本
- --limit-cpu/--limit-memory：cpu/内存限制
- --env-add/--env-rm：新增删除变量
- --network-add/--network-rm：添加删除网络

```bash
docker service update client --replicas 1
```

### 3.回滚服务

```bash
docker service rollback client
```

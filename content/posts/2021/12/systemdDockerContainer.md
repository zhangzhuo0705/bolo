---
title: "使用systemd运行docker容器"
date: 2021-12-23T11:27:58+08:00
draft: false
description: "讲解 systemd 单元文件，演示用 systemd 管理 Docker 容器和 Calico 节点。"
cover: "https://b3logfile.com/bing/20200902.jpg?imageView2/1/w/1280/h/720/interlace/1/q/100"
categories: ["Linux系统基础知识"]
tags: ["systemctl", "Docker"]
toc: true
---
# 一、systemd文件介绍

系统启动和服务器守护进程管理器， 负责在系统启动或运行时，激活系统资源，服务器进程和其它进程

**service文件通常由三部分组成**

- [Unit]：定义与Unit类型无关的通用选项；用于提供unit的描述信息、unit行为及依赖关系等
- [Service]：与特定类型相关的专用选项；此处为Service类型
- [Install]：定义由“systemctl enable”以及"systemctl disable“命令在实现服务启用或禁用时用到的一些选项

**Unit介绍**

- Description：描述信息，可以自己定义
- After：定义unit的启动次序，表示当前unit应该晚于哪些unit启动，其功能与Before相反
- Requires：依赖到的其它units，强依赖，被依赖的units无法激活时，当前unit也无法激活

**Service介绍**

- Type：服务的类型，常用的有 simple（默认类型） 和 forking。默认的 simple 类型可以适应于绝大多数的场景，因此一般可以忽略这个参数的配置。而如果服务程序启动后会通过 fork 系统调用创建子进程，然后关闭应用程序本身进程的情况，则应该将 Type 的值设置为 forking，否则 systemd 将不会跟踪子进程的行为，而认为服务已经退出。
- EnvironmentFile：环境环境配置文件，文件中的每一行都是一个环境变量的定义。
- Environment：为服务添加环境变量。
- ExecStart：指明启动服务的命令，命令需要绝对路径
- ExecStop：指明停止服务的命令，命令需要绝对路径
- ExecStartPre：服务启动前执行的命令，命令需要绝对路径，可以有多个。
- ExecStartPost：服务启动后执行的命令，命令需要绝对路径，也可以有多个。
- ExecStopPost：停止服务后执行的命令，命令需要绝对路径，也可以有多个。
- TimeoutStartSec：启动服务时的等待的秒数，如果超过这个时间服务任然没有执行完所有的启动命令，则 systemd 会认为服务自动失败。
- TimeoutStopSec：停止服务时的等待的秒数，如果超过这个时间服务仍然没有停止，systemd 会使用 SIGKILL 信号强行杀死服务的进程。
- Restart：这个值用于指定在什么情况下需要重启服务进程。常用的值有 no，on-success，on-failure，on-abnormal，on-abort 和 always。默认值为 no。
- User：运行服务的用户
- Group：指定运行服务的用户组。
- RestartSec：如果服务需要被重启，这个参数的值为服务被重启前的等待秒数。
- ExecReload：重新加载服务所需执行的主要命令。
- Environment：为服务添加环境变量。
- Nice：服务的进程优先级，值越小优先级越高，默认为0。-20为最高优先级，19为最低优先级。
- WorkingDirectory：指定服务的工作目录。
- RootDirectory：指定服务进程的根目录（ / 目录），如果配置了这个参数后，服务将无法访问指定目录以外的任何文件。

注意：**所有的启动设置之前，都可以加上一个连词号（-），表示"抑制错误"，即发生错误的时候，不影响其他命令的执行。比如，EnvironmentFile=-/etc/sysconfig/sshd（注意等号后面的那个连词号），就表示即使/etc/sysconfig/sshd文件不存在，也不会抛出错误。**

**Install介绍**

- WantedBy：表示该服务所在的 Target。Target的含义是服务组，表示一组服务。WantedBy=multi-user.target指的是，服务所在的 Target 是multi-user.target。

这个设置非常重要，因为执行systemctl enable sshd.service命令时，sshd.service的一个符号链接，就会放在/etc/systemd/system目录下面的multi-user.target.wants子目录之中。

# 二、示例文件

```bash
[Unit]
Description=nginx-v1
After=docker.service
Requires=docker.service

[Service]
User=root
PermissionsStartOnly=true
EnvironmentFile=-/etc/sysconfig/nginx-v1
ExecStartPre=-/usr/bin/docker rm -f nginx-v1
ExecStart=/usr/bin/docker run --name=nginx-v1 -p 80:80 $image
ExecStop=/usr/bin/docker stop nginx-v1
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

# 三、calico-node的systemd部署

```bash
[Unit]
Description=calico node
After=docker.service
Requires=docker.service

[Service]
User=root
PermissionsStartOnly=true
ExecStartPre=-/bin/docker rm -f calico-node
ExecStart=/bin/docker run   --net=host --privileged --name=calico-node \
        -e ETCD_ENDPOINTS=https://10.122.6.81:2379,https://10.122.6.73:2379,https://10.122.127.217:2379 \
        -e ETCD_CA_CERT_FILE=/etc/kubernetes/cert/ca.pem \
        -e ETCD_CERT_FILE=/etc/etcd/cert/etcd.pem \
        -e ETCD_KEY_FILE=/etc/etcd/cert/etcd-key.pem \
        -e NODENAME=10.122.6.81 \
        -e IP=10.122.6.81/24 \
        -e IP6= \
        -e AS= \
        -e CALICO_IPV4POOL_CIDR=172.28.0.0/14 \
        -e CALICO_IPV4POOL_IPIP=CrossSubnet \
        -e CALICO_LIBNETWORK_ENABLED=true \
        -e CALICO_NETWORKING_BACKEND=bird \
        -e CALICO_DISABLE_FILE_LOGGING=true \
        -e FELIX_IPINIPMTU=1480 \
        -e FELIX_IPV6SUPPORT=false \
        -e FELIX_DEFAULTENDPOINTTOHOSTACTION=ACCEPT \
        -e FELIX_LOGSEVERITYSCREEN=info \
        -v /etc/kubernetes/cert/ca.pem:/etc/kubernetes/cert/ca.pem \
        -v /etc/etcd/cert/etcd.pem:/etc/etcd/cert/etcd.pem \
        -v /etc/etcd/cert/etcd-key.pem:/etc/etcd/cert/etcd-key.pem \
        -v /lib/modules:/lib/modules \
        -v /run/docker/plugins:/run/docker/plugins \
        -v /opt/k8s/bin/libnetwork-plugin:/usr/bin/libnetwork-plugin \
        -v /var/run/calico:/var/run/calico \
        -v /var/log/calico:/var/log/calico \
        -v /var/lib/calico:/var/lib/calico \
        10.122.6.81:5000/calico/node:v3.16.4
ExecStop=/bin/docker stop calico-node
Restart=always
RestartSec=10
```

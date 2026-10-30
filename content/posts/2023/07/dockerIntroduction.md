---
title: "Docker服务"
date: 2023-07-14T17:55:13+08:00
draft: false
description: "梳理 Docker 的容器技术、核心组成与 Namespace 隔离机制。"
cover: "https://b3logfile.com/bing/20221125.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["Docker"]
tags: ["Docker"]
toc: true
---
# 一、Docker 简介

## 1.1 什么是容器技术

### 1.Docker是什么

首先 Docker是一个在 2013年开源的应用程序并且是一个基于 go 语言编写是一个开源的 PAAS 服务(Platform as a Service，平台即服务的缩写)，go 语言是由 google 开发，docker 公司最早叫 dotCloud 后由于 Docker 开源后大受欢迎 就将公司改名为 Docker Inc，总部位于美国加州的旧金山，Docker 是基于 linux内核实现，Docker 最早采用 LXC 技术(LinuX Container 的简写，LXC 是 Linux 原生支持的容器技术，可以提供轻量级的虚拟化，可以说 docker 就是基于 LXC 发展起来的(0.1.5 (2013-04-17)，提供 LXC 的高级封装，发展标准的配置方法)， 而虚拟化技术 KVM(Kernel-based Virtual Machine) 基于模块实现，Docker 后改为自己研发并开源的 runc 技术运行容器(1.11.0 (2016-04-13)。

```bash
Docker now relies on containerd and runc to spawn containers
```

Docker 相比虚拟机的交付速度更快，资源消耗更低，Docker 采用客户端/服务端架构，使用远程 API 来管理和创建 Docker 容器，其可以轻松的创建一个轻量级的、可移植的、自给自足的容器，docker 的三大理念是 build(构建)、ship(运输)、 run(运行)，Docker 遵从 apache 2.0 协议，并通过（namespace 及 cgroup 等）来提供容器的资源隔离与安全保障等，所以 Docke 容器在运行时不需要类似虚拟机（空运行的虚拟机占用物理机的一定性能开销）的额外资源开销，因此可以大幅提高资源利用率,总而言之 Docker 是一种用了新颖方式实现的轻量级虚拟机。类似于 VM 但是在原理和应用上和 VM 的差别还是很大的，并且 docker 的专业叫法是应用容器(Application Container)。

### 2.Docker的组成

https://docs.docker.com/engine/docker-overview/

- Docker 主机(Host)：一个物理机或虚拟机，用于运行 Docker 服务进程和容器。
- Docker 服务端(Server)：Docker 守护进程，运行 docker 容器。
- Docker 客户端(Client)：客户端使用 docker 命令或其他工具调用 docker API。
- Docker 仓库(Registry): 保存镜像的仓库，类似于 git 或 svn 这样的版本控制系统。
- Docker 镜像(Images)：镜像可以理解为创建实例使用的模板。
- Docker 容器(Container): 容器是从镜像生成对外提供服务的一个或一组服务。

官方仓库: https://hub.docker.com/

![图片](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/图片.png)

![image-20210412193636220](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210412193636220.png)

### 3.Docker对比虚拟机

资源利用率更高：一台物理机可以运行数百个容器，但是一般只能运行数十个虚拟机。
开销更小：不需要启动单独的虚拟机占用硬件资源。
启动速度更快：可以在数秒内完成启动。

![image-20210412193739165](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210412193739165.png)

使用虚拟机是为了更好的实现服务运行环境隔离，每个虚拟机都有独立的内核， 虚拟化可以实现不同操作系统的虚拟机，但是通常一个虚拟机只运行一个服务， 很明显资源利用率比较低且造成不必要的性能损耗，我们创建虚拟机的目的是为了运行应用程序，比如 Nginx、PHP、Tomcat 等 web 程序，使用虚拟机无疑带来了一些不必要的资源开销，但是容器技术则基于减少中间运行环节带来较大的性能提升。

![image-20210412193854216](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210412193854216.png)

但是，如上图一个宿主机运行了 N 个容器，多个容器带来的以下问题怎么解决:

1. 怎么样保证每个容器都有不同的文件系统并且能互不影响？
2. 一个 docker 主进程内的各个容器都是其子进程，那么实现同一个主进程下不同类型的子进程？
3. 各个进程间通信能相互访问(内存数据)吗？
4. 每个容器怎么解决 IP 及端口分配的问题？
5. 多个容器的主机名能一样吗？
6. 每个容器都要不要有 root 用户？怎么解决账户重名问题？

以上问题怎么解决？

### 4.Linux Namespace 技术

namespace 是 Linux 系统的底层概念，在内核层实现，即有一些不同类型的命名空间被部署在核内，各个 docker 容器运行在同一个 docker 主进程并且共用同一个宿主机系统内核，各 docker 容器运行在宿主机的用户空间，每个容器都要有类似于虚拟机一样的相互隔离的运行空间，但是容器技术是在一个进程内实现运行指定服务的运行环境，并且还可以保护宿主机内核不受其他进程的干扰和影响，如文件系统空间、网络空间、进程空间等，目前主要通过以下技术实现容器运行空间的相互隔离：

|                  隔离类型                  |                功能                | 系统调用参数  |   内核版本   |
| :----------------------------------------: | :--------------------------------: | :-----------: | :----------: |
|            MNT Namespace(mount)            | 提供磁盘挂载点和文件系统的隔离能力 |  CLONE_NEWNS  | Linux 2.4.19 |
| IPC Namespace(Inter-Process Communication) |      提供进程间通信的隔离能力      | CLONE_NEWIPC  | Linux 2.6.19 |
|   UTS Namespace(UNIX Timesharing System)   |         提供主机名隔离能力         | CLONE_NEWUTS  | Linux 2.6.19 |
|   PID Namespace(Process Identification)    |          提供进程隔离能力          | CLONE_NEWPID  | Linux 2.6.24 |
|           Net Namespace(network)           |          提供网络隔离能力          | CLONE_NEWNET  | Linux 2.6.29 |
|            User Namespace(user)            |          提供用户隔离能力          | CLONE_NEWUSER |  Linux 3.8   |

**MNT Namespace**

每个容器都要有独立的根文件系统有独立的用户空间，以实现在容器里面启动服务并且使用容器的运行环境，即一个宿主机是 ubuntu 的服务器，可以在里面启动一个 centos 运行环境的容器并且在容器里面启动一个 Nginx 服务，此 Nginx 运行时使用的运行环境就是 centos 系统目录的运行环境，但是在容器里面是不能访问宿主机的资源，宿主机是使用了 chroot 技术把容器锁定到一个指定的运行目录里面。

**IPC Namespace**

一个容器内的进程间通信，允许一个容器内的不同进程的(内存、缓存等)数据访问，但是不能夸容器访问其他容器的数据。用于隔离System V IPC和POSIX消息队列等进程间通信机制，使得每个进程在其所属的命名空间中拥有自己独立的IPC视图。

**UTS Namespace**

UTS namespace（UNIX Timesharing System 包含了运行内核的名称、版本、 底层体系结构类型等信息）用于系统标识，其中包含了 hostname 和域名 domainname ，它使得一个容器拥有属于自己 hostname 标识，这个主机名标识独立于宿主机系统和其上的其他容器。

**PID Namespac**

Linux 系统中，有一个 PID 为 1 的进程(init/systemd)是其他所有进程的父进程，那么在每个容器内 也要有一个父进程来管理其下属的子进程，那么多个容器的进程通过 PID namespace 进程隔离(比如 PID 编号重复、容器内的主进程生成与回收子进程等)。

**Net Namespace**

每一个容器都类似于虚拟机一样有自己的网卡、监听端口、TCP/IP 协议栈等， Docker 使用 network namespace 启动一个 vethX 接口，这样你的容器将拥有它自己的桥接 ip 地址，通常是 docker0，而 docker0 实质就是 Linux 的虚拟网桥, 网桥是在 OSI 七层模型的数据链路层的网络设备，通过 mac 地址对网络进行划分，并且在不同网络直接传递数据。

**User Names**

各个容器内可能会出现重名的用户和用户组名称，或重复的用户 UID 或者 GID， 那么怎么隔离各个容器内的用户空间呢？

User Namespace 允许在各个宿主机的各个容器空间内创建相同的用户名以及相同的用户 UID 和 GID，只是会把用户的作用范围限制在每个容器内，即 A 容 器和 B 容器可以有相同的用户名称和 ID 的账户，但是此用户的有效范围仅是当前容器内，不能访问另外一个容器内的文件系统，即相互隔离、互补影响、永不相见。

### 5.Linux control groups（cgroups）

在一个容器，如果不对其做任何资源限制，则宿主机会允许其占用无限大的内存空间，有时候会因为代码 bug 程序会一直申请内存，直到把宿主机内存占完， 为了避免此类的问题出现，宿主机有必要对容器进行资源分配限制，比如 CPU、 内存等，Linux Cgroups 的全称是 Linux Control Groups，它最主要的作用，就是限制一个进程组能够使用的资源上限，包括 CPU、内存、磁盘、网络带宽等等。此外，还能够对进程进行优先级设置，以及将进程挂起和恢复等操作。

**验证系统 cgroups**

Cgroups 在内核层默认已经开启，从 centos 和 ubuntu 对比结果来看，显然内核较新的 ubuntu 支持的功能更多

**Centos cgroups**

```bash
[19:57:18 root@centos7 ~]#uname -r
3.10.0-1127.el7.x86_64
[19:58:43 root@centos7 ~]#cat /boot/config-3.10.0-1127.el7.x86_64 | grep CGROUP
CONFIG_CGROUPS=y
# CONFIG_CGROUP_DEBUG is not set
CONFIG_CGROUP_FREEZER=y
CONFIG_CGROUP_PIDS=y
CONFIG_CGROUP_DEVICE=y
CONFIG_CGROUP_CPUACCT=y
CONFIG_CGROUP_HUGETLB=y
CONFIG_CGROUP_PERF=y
CONFIG_CGROUP_SCHED=y
CONFIG_BLK_CGROUP=y
# CONFIG_DEBUG_BLK_CGROUP is not set
CONFIG_NETFILTER_XT_MATCH_CGROUP=m
CONFIG_NET_CLS_CGROUP=y
CONFIG_NETPRIO_CGROUP=y
```

**ubuntu cgroups**

```bash
[19:57:12 root@ubuntu18-04 ~]#uname -r
4.15.0-76-generic
[19:59:30 root@ubuntu18-04 ~]#cat /boot/config-4.15.0-76-generic | grep CGROUP
CONFIG_CGROUPS=y
CONFIG_BLK_CGROUP=y
# CONFIG_DEBUG_BLK_CGROUP is not set
CONFIG_CGROUP_WRITEBACK=y
CONFIG_CGROUP_SCHED=y
CONFIG_CGROUP_PIDS=y
CONFIG_CGROUP_RDMA=y
CONFIG_CGROUP_FREEZER=y
CONFIG_CGROUP_HUGETLB=y
CONFIG_CGROUP_DEVICE=y
CONFIG_CGROUP_CPUACCT=y
CONFIG_CGROUP_PERF=y
CONFIG_CGROUP_BPF=y
# CONFIG_CGROUP_DEBUG is not set
CONFIG_SOCK_CGROUP_DATA=y
CONFIG_NETFILTER_XT_MATCH_CGROUP=m
CONFIG_NET_CLS_CGROUP=m
CONFIG_CGROUP_NET_PRIO=y
CONFIG_CGROUP_NET_CLASSID=y
```

**cgroups中内存模块**

```bash
[19:59:50 root@ubuntu18-04 ~]#cat /boot/config-4.15.0-76-generic | grep MEM | grep CG
CONFIG_MEMCG=y
CONFIG_MEMCG_SWAP=y
# CONFIG_MEMCG_SWAP_ENABLED is not set
CONFIG_SLUB_MEMCG_SYSFS_ON=y
```

**cgroups具体实现**

```bash
blkio：块设备 IO 限制。
cpu：使用调度程序为 cgroup 任务提供 cpu 的访问。
cpuacct：产生 cgroup 任务的 cpu 资源报告。
cpuset：如果是多核心的 cpu，这个子系统会为 cgroup 任务分配单独的 cpu和内存。
devices：允许或拒绝 cgroup 任务对设备的访问。
freezer：暂停和恢复 cgroup 任务。
memory：设置每个 cgroup 的内存限制以及产生内存资源报告。
net_cls：标记每个网络包以供 cgroup 方便使用。
ns：命名空间子系统。
perf_event：增加了对每 group 的监测跟踪的能力，可以监测属于某个特定的
group 的所有线程以及运行在特定 CPU 上的线程。
```

**查看系统cgroups**

```bash
[20:00:55 root@ubuntu18-04 ~]#ll /sys/fs/cgroup/
total 0
drwxr-xr-x 15 root root 380 Apr 12 19:56 ./
drwxr-xr-x  9 root root   0 Apr 12 19:56 ../
dr-xr-xr-x  4 root root   0 Apr 12 19:56 blkio/
lrwxrwxrwx  1 root root  11 Apr 12 19:56 cpu -> cpu,cpuacct/
lrwxrwxrwx  1 root root  11 Apr 12 19:56 cpuacct -> cpu,cpuacct/
dr-xr-xr-x  4 root root   0 Apr 12 19:56 cpu,cpuacct/
dr-xr-xr-x  2 root root   0 Apr 12 19:56 cpuset/
dr-xr-xr-x  4 root root   0 Apr 12 19:56 devices/
dr-xr-xr-x  2 root root   0 Apr 12 19:56 freezer/
dr-xr-xr-x  2 root root   0 Apr 12 19:56 hugetlb/
dr-xr-xr-x  4 root root   0 Apr 12 19:56 memory/
lrwxrwxrwx  1 root root  16 Apr 12 19:56 net_cls -> net_cls,net_prio/
dr-xr-xr-x  2 root root   0 Apr 12 19:56 net_cls,net_prio/
lrwxrwxrwx  1 root root  16 Apr 12 19:56 net_prio -> net_cls,net_prio/
dr-xr-xr-x  2 root root   0 Apr 12 19:56 perf_event/
dr-xr-xr-x  4 root root   0 Apr 12 19:56 pids/
dr-xr-xr-x  2 root root   0 Apr 12 19:56 rdma/
dr-xr-xr-x  5 root root   0 Apr 12 19:56 systemd/
dr-xr-xr-x  5 root root   0 Apr 12 19:56 unified/
```

有了以上的 chroot、namespace、cgroups 就具备了基础的容器运行环境，但是还需要有相应的容器创建与删除的管理工具、以及怎么样把容器运行起来、容器数据怎么处理、怎么进行启动与关闭等问题需要解决，于是容器管理技术出现了。

## 1.2 Docker介绍

**Docker的优势**

快速部署：短时间内可以部署成百上千个应用，更快速交付到线上。
高效虚拟化：不需要额外的 hypervisor 支持，直接基于 linux 实现应用虚拟化， 相比虚拟机大幅提高性能和效率。
节省开支：提高服务器利用率，降低 IT 支出。
简化配置：将运行环境打包保存至容器，使用时直接启动即可。
快速迁移和扩展：可夸平台运行在物理机、虚拟机、公有云等环境，良好的兼容 性可以方便将应用从 A 宿主机迁移到 B 宿主机，甚至是 A 平台迁移到 B 平台。

**Docker的缺点**

隔离性：各应用之间的隔离不如虚拟机彻底。

### 1.docker(容器)的核心技术

**容器规范**

容器技术除了的 docker 之外，还有 coreOS 的 rkt，还有阿里的 Pouch，为了保证容器生态的标准性和健康可持续发展，包括 Linux 基金会、Docker、微软、 红帽谷歌和、IBM、等公司在 2015 年 6 月共同成立了一个叫 open container （OCI）的组织，其目的就是制定开放的标准的容器规范，目前 OCI 一共发布了两个规范，分别是 runtime spec 和 image format spec，有了这两个规范，不同的容器公司开发的容器只要兼容这两个规范，就可以保证容器的可移植性和相互可操作性。

**容器runtime(runtime spec)**

runtime 是真正运行容器的地方，因此为了运行不同的容器 runtime 需要和操作系统内核紧密合作相互支持，以便为容器提供相应的运行环境。

目前主流的三种 runtime：

- Lxc：linux 上早期的 runtime，Docker 早期就是采用 lxc 作为 runtime。
- runc：目前 Docker 默认的 runtime，runc 遵守 OCI 规范，因此可以兼容 lxc。
- rkt：是 CoreOS 开发的容器 runtime，也符合 OCI 规范，所以使用 rktruntime 也可以运行 Docker 容器

runtime 主要定义了以下规范 ， 并以 json 格 式 保 存 在 /run/docker/runtime-runc/moby/容器 ID/state.json 文件，此文件会根据容器的状态实时更新内容：

```bash
版本信息：存放 OCI 标准的具体版本号。
容器 ID：通常是一个哈希值，可以在所有 state.json 文件中提取出容器 ID 对容器进行批量操作(关闭、删除等)，此文件在容器关闭后会被删除，容器启动后会自动生成。

PID：在容器中运行的首个进程在宿主机上的进程号，即将宿主机的那个进程设置为容器的守护进程。

容器文件目录：存放容器 rootfs 及相应配置的目录，外部程序只需读取 state.json 就可以定位到宿主机上的容器文件目录。

容器创建：创建包括文件系统、namespaces、cgroups、用户权限在内的各项内容。
容器进程的启动：运行容器启动进程，该文件在
/run/containerd/io.containerd.runtime.v1.linux/moby/容器 ID/config.json。

容器生命周期：容器进程可以被外部程序关停，runtime 规范定义了对容器操作信号的捕获，并做相应资源回收的处理，避免僵尸进程的出现。
```

**容器镜像(image format spec）**

```bash
OCI 容器镜像主要包含以下内容：

文件系统:定义以 layer 保存的文件系统,在镜像里面是 layer.tar,每个 layer 保存了和上层之间变化的部分,image format spec 定义了 layer 应该保存哪些文件,怎么表示增加、修改和删除的文件等操作。

manifest文件：描述有哪些 layer，tag 标签及 config 文件名称。
config文件：是一个以 hash 命名的 json 文件，保存了镜像平台，容器运行时容器运行时需要的一些信息，比如环境变量、工作目录、命令参数等。
index 文件：可选的文件,指向不同平台的 manifest 文件,这个文件能保证一个镜像可以跨平台使用，每个平台拥有不同的 manifest 文件使用 index 作为索引

父镜像：大多数层的元信息结构都包含一个 parent 字段，指向该镜像的父镜

参数：
ID：镜像 ID，每一层都有 ID
tag 标签：标签用于将用户指定的、具有描述性的名称对应到镜像ID
仓库：Repository 镜像仓库
os：定义类型
architecture ：定义 CPU 架构
author：作者信息
create：镜像创建日期
```

# 二、Docker基础使用

## 2.1 Docker安装及基础信息介绍

官方网址：https://www.docker.com/

**系统版本选择**

Docker 目前已经支持多种操作系统的安装运行，比如 Ubuntu、CentOS、 Redhat、Debian、Fedora，甚至是还支持了 Mac 和 Windows，在 linux 系统上需要内核版本在 3.10 或以上，docker 版本号之前一直是 0.X 版本或 1.X 版本， 但是从 2017 年 3 月 1 号开始改为每个季度发布一次稳版，其版本号规则也统一 变更为 YY.MM，例如 17.09 表示是 2017 年 9 月份发布的。

**Docker 版本选择**

Docker 之前没有区分版本，但是 2017 年初推出(将 docker 更名为)新的项 目 Moby，github 地址：https://github.com/moby/moby，Moby 项目属于 Docker 项目的全新上游，Docker 将是一个隶属于的 Moby 的子产品，而且之后的版本之后开始区分为 CE 版本（社区版本）和 EE（企业收费版），CE 社区版本和 EE 企业版本都是每个季度发布一个新版本，但是 EE 版本提供后期安全维护 1 年，而 CE 版本是 4 个月，本次演示的 Docker 版本为 18.03。

### 1.软件包方式安装

官方 rpm 包下载地址

https://download.docker.com/linux/centos/7/x86_64/stable/Packages/

二进制下载地址

https://download.docker.com/

https://mirrors.aliyun.com/docker-ce/linux/static/stable/x86_64/

阿里镜像下载地址

https://mirrors.aliyun.com/docker-ce/linux/centos/7/x86_64/stable/Packages/

**centos通过yum安装**

```bash
[11:16:23 root@centos7 ~]#wget -O /etc/yum.repos.d/CentOS-Base.repo http://mirrors.aliyun.com/repo/Centos-7.repo
[11:16:50 root@centos7 ~]#wget -O /etc/yum.repos.d/epel.repo http://mirrors.aliyun.com/repo/epel-7.repo
[11:17:14 root@centos7 ~]#wget -O /etc/yum.repos.d/docker-ce.repo https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo
[11:17:40 root@centos7 ~]#yum install docker-ce
[11:21:23 root@centos7 ~]#yum info docker-ce
Name        : docker-ce
Arch        : x86_64
Epoch       : 3
Version     : 20.10.6
Release     : 3.el7
```

**ubuntu通过apt安装**

清华大学源示例：https://mirror.tuna.tsinghua.edu.cn/help/docker-ce/

```bash
#如果你过去安装过 docker，先删掉
[11:32:52 root@ubuntu18-04 ~]#sudo apt-get remove docker docker-engine docker.io

#首先安装依赖
[11:35:24 root@ubuntu18-04 ~]#sudo apt-get install apt-transport-https ca-certificates curl gnupg2 software-properties-common

#信任 Docker 的 GPG 公钥
[11:35:58 root@ubuntu18-04 ~]#curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -

#对于 amd64 架构的计算机，添加软件仓库
[11:36:02 root@ubuntu18-04 ~]#sudo add-apt-repository \
>    "deb [arch=amd64] https://mirrors.tuna.tsinghua.edu.cn/docker-ce/linux/ubuntu \>    $(lsb_release -cs) \
>    stable"

#最后安装
[11:38:26 root@ubuntu18-04 ~]#apt-cache madison docker-ce   #查看docker-ce所有版本
[11:38:29 root@ubuntu18-04 ~]#apt-get install docker-ce=5:18.09.9~3-0~ubuntu-bionic #选择版本安装

#启动
[11:45:13 root@ubuntu18-04 ~]#systemctl enable --now docker

#验证服务是否启动
[11:49:48 root@ubuntu18-04 ~]#systemctl is-active docker
active
[11:50:20 root@ubuntu18-04 ~]#systemctl status docker
● docker.service - Docker Application Container Engine
   Loaded: loaded (/lib/systemd/system/docker.service; enabled; vendor preset: enabl
   Active: active (running) since Tue 2021-04-13 11:45:08 CST; 5min ago
```

### 2.二进制安装

```bash
#下载tar包
[18:53:14 root@ubuntu18-04 ~]#wget https://mirrors.aliyun.com/docker-ce/linux/static/stable/x86_64/docker-19.03.15.tgz
#解压
[18:54:09 root@ubuntu18-04 ~]#tar xf docker-19.03.15.tgz
#拷贝命令
[18:54:53 root@ubuntu18-04 ~]#cp docker/* /usr/bin/
#创建containerd的service文件
[19:06:10 root@ubuntu18-04 ~]#vim /lib/systemd/system/containerd.service
[Unit]
Description=containerd container runtime
Documentation=https://containerd.io
After=network.target local-fs.target

[Service]
ExecStartPre=-/sbin/modprobe overlay
ExecStart=/usr/bin/containerd
Type=notify
Delegate=yes
KillMode=process
Restart=always
RestartSec=5
LimitNPROC=infinity
LimitCORE=infinity
LimitNOFILE=1048576
TasksMax=infinity
OOMScoreAdjust=-999

[Install]
WantedBy=multi-user.target
#启动containerd
[19:10:32 root@ubuntu18-04 ~]#systemctl enable --now containerd.service 

#准备docker的service文件
[19:06:10 root@ubuntu18-04 ~]#vim /lib/systemd/system/docker.service
[Unit]
Description=Docker Application Container Engine
Documentation=https://docs.docker.com
After=network-online.target firewalld.service containerd.service
Wants=network-online.target
Requires=docker.socket containerd.service

[Service]
Type=notify
ExecStart=/usr/bin/dockerd -H fd:// --containerd=/run/containerd/containerd.sock
ExecReload=/bin/kill -s HUP $MAINPID
TimeoutSec=0
RestartSec=2
Restart=always
StartLimitBurst=3
StartLimitInterval=60s
LimitNOFILE=infinity
LimitNPROC=infinity
LimitCORE=infinity
TasksMax=infinity
Delegate=yes
KillMode=process
OOMScoreAdjust=-500

[Install]
WantedBy=multi-user.target
#准备docker的socket文件
[19:11:11 root@ubuntu18-04 ~]#vim /lib/systemd/system/docker.socket
[Unit]
Description=Docker Socket for the API

[Socket]
ListenStream=/var/run/docker.sock
SocketMode=0660
SocketUser=root
SocketGroup=docker

[Install]
WantedBy=sockets.target
#创建docker组
[19:17:03 root@ubuntu18-04 ~]#groupadd docker
#启动docker
[19:17:43 root@ubuntu18-04 ~]#systemctl start docker.socket 
[19:17:46 root@ubuntu18-04 ~]#systemctl start docker.service

#注意此时除了root用户有docker客户端操作命令权限，其余用户都无法执行docker命令，如需要执行需要在执行的用户中添加docker组为这个用户的附加组具体命令如下
usermod -aG docker zhangzhuo
```

### 3.docker系统基础操作

**`docker info`介绍**

```bash
#完整输出示例如下
Server:
 Containers: 0 #当前主机运行的容器总数
  Running: 0   #有几个容器是正在运行的
  Paused: 0   #有几个容器是暂停的
  Stopped: 0  #有几个容器是停止的
 Images: 0    #当前服务器的镜像数
 Server Version: 18.09.9  #服务端版本
 Storage Driver: overlay2 #正在使用的存储引擎
  Backing Filesystem: extfs #后端文件系统，即服务器的磁盘文件系统
  Supports d_type: true     #是否支持 d_type
  Native Overlay Diff: true #是否支持差异数据存储
 Logging Driver: json-file  #日志类型
 Cgroup Driver: cgroupfs    #Cgroups类型
 Plugins:  #插件
  Volume: local #卷
  Network: bridge host macvlan null overlay  #overlay跨主机通信
  Log: awslogs fluentd gcplogs gelf journald json-file local logentries splunk syslog #日志类型
 Swarm: inactive #是否支持 swarm
 Runtimes: runc  #已安装的容器运行时
 Default Runtime: runc #默认使用的容器运行时
 Init Binary: docker-init  #初始化容器的守护进程，即 pid 为 1 的进程
 containerd version: 05f951a3781f4f2c1911b05e61c160e9c30eaa8e #版本
 runc version: N/A     # runc 版本
 init version: fec3683  #init 版本
 Security Options: #安全选项
  apparmor
  seccomp
   Profile: default  #默认的配置文件
 Kernel Version: 4.15.0-76-generic #宿主机内核版本
 Operating System: Ubuntu 18.04.4 LTS #宿主机操作系统
 OSType: linux       #宿主机操作系统类型
 Architecture: x86_64  #宿主机架构
 CPUs: 2      #宿主机 CPU 数量
 Total Memory: 962.2MiB  #宿主机总内存
 Name: ubuntu18-04   #宿主机 hostname
 ID: VMAK:UWKC:KCRT:FRR7:3FSF:XKJK:UX2L:O2I2:PYRJ:2IQZ:QBDR:ZEDJ  #宿主机ID
 Docker Root Dir: /var/lib/docker  #宿主机数据保存目录
 Debug Mode: false    #是否开启 debug
 Registry: https://index.docker.io/v1/  #默认docker官方镜像仓库地址
 Labels:  #其他标签
 Experimental: false  #是否测试版
 Insecure Registries:  #非安全的镜像仓库
  127.0.0.0/8
 Live Restore Enabled: false  #是否开启活动重启(重启 docker-daemon 不关闭容器)
 Product License: Community Engine   #产品许可信息

WARNING: No swap limit support  #系统警告信息(没有开启 swap 资源限制)
```

`docker system df`：查看docker服务磁盘使用情况

```bash
TYPE                TOTAL               ACTIVE              SIZE                RECLAIMABLE
Images              210                 2                   148.4GB             148.4GB (100%)   #镜像占用
Containers          2                   2                   33B                 0B (0%)          #容器占用
Local Volumes       5                   0                   2.722MB             2.722MB (100%)   #本地卷占用
Build Cache         168                 0                   3.427GB             3.427GB          #镜像构建缓存占用
```

`docker system prune`：清楚docker所有构建缓存数据

### 4.报错解决

**解决不支持swap限制警告**

```bash
[13:39:41 root@ubuntu18-04 ~]#vim /etc/default/grub
#在GRUB_CMDLINE_LINUX中追加cgroup_enable=memory swapaccount=1
GRUB_CMDLINE_LINUX="net.ifnames=0 biosdevname=0 cgroup_enable=memory swapaccount=1"
[13:39:49 root@ubuntu18-04 ~]#update-grub
[13:40:34 root@ubuntu18-04 ~]#reboot
```

## 2.2 docker配置文件详解

docker安装后默认没有daemon.json这个配置文件，需要进行手动创建。配置文件的默认路径：/etc/docker/daemon.json。一般情况，配置文件 daemon.json中配置的项目参数，在启动参数中同样适用，有些可能不一样（具体可以查看官方文档），但需要注意的一点，配置文件中如果已经有某个配置项，则无法在启动参数中增加，会出现冲突的错误。

**常见的参数配置如下**

```bash
{  
 "insecure-registries": ["192.168.10.254:5000"],   
 "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn"
  ],
 "exec-opts": ["native.cgroupdriver=systemd"],
 "max-concurrent-downloads": 10,  
 "max-concurrent-uploads": 5,  
 "log-opts": {    
     "max-size": "10m", 
     "max-file": "2"  
  },  
  "live-restore": true,
  "iptables": false
}
```

- insecure-registries：私有镜像仓库配置，可以配置多个
- registry-mirrors：docker仓库代理配置，可以配置多个
- exec-opts."native.cgroupdriver:资源隔离使用system，默认为cgroup
- max-concurrent-downloads:并行拉取镜像的线程
- max-concurrent-uploads：并行上传镜像的线程
- log-opts:容器日志设置
  - max-size：日志文件最大大小，达到这个值日志会做切分
  - max-file：保持日志文件个数
- live-restore：重启docker不会影响容器的运行
- iptables：是否使用iptables转发容器流量

### 1.获取加速地址

国内下载国外的镜像有时候会很慢，因此可以更改 docker 配置文件添加一个加速器，可以通过加速器达到加速下载镜像的目的。

浏览器打开 http://cr.console.aliyun.com，注册或登录阿里云账号，点击左侧的镜像加速器，将会得到一个专属的加速地址，而且下面有使用配置说明：

```bash
[15:02:51 root@ubuntu18-04 ~]#mkdir -p /etc/docker
[15:03:01 root@ubuntu18-04 ~]#vim /etc/docker/daemon.json
{
  "registry-mirrors": ["https://qai5ut9z.mirror.aliyuncs.com"]
}
[15:04:14 root@ubuntu18-04 ~]#systemctl restart docker
[15:05:26 root@ubuntu18-04 ~]#docker info | grep -n1 Registry
51-  127.0.0.0/8
52: Registry Mirrors:
53-  https://qai5ut9z.mirror.aliyuncs.com/
```

### 2.docker识别私有仓库自签名证书

```bash
#创建docker证书文件夹
mkdir /etc/docker/certs.d/
#拷贝自签名证书的ca证书
cp /root/public.crt  /etc/docker/certs.d/public.crt
#如果证书绑定了域名也必须配置地址解析使用域名访问
vim /etc/hosts
#重启docker服务
systemctl restart docker
```

## 2.3 Docker镜像管理

Docker 镜像含有启动容器所需要的文件系统及所需要的内容，因此镜像主要用于创建并启动docker容器。镜像的命名格式一般为`仓库服务器:端口/项目名称/镜像名称:tag(版本)号`,注意在操作镜像时，如果不写tag默认为latest。以下为docker镜像操作相关操作介绍。

**常用命令如下：**

- docker search：在docker官方镜像仓库搜索镜像
- docker pull：下载拉取镜像到本地
- docker images：查看本地所有镜像
- docker save：导出镜像到本地文件系统，导出的镜像一般为一个tar包，注意可多个镜像同时导出为一个文件这样做的好处为相同的层会避免重复导出缩小导出镜像文件的大小
- docker load：导出的镜像包进行导入操作
- docker rmi：将本地的某个镜像删除
- docker login：登录认证镜像仓库
- docker push：推送镜像到镜像仓库
- docker tag：修改镜像名称
- docker build：使用dockerfile文件构建镜像
- docker commit：提交正在运行的容器为镜像
- docker history：查看镜像的历史变更
- docker image inspect：查看镜像详细信息，以json格式输出

示例操作：

```bash
#检索docker官方仓库的nginx镜像
docker search nginx:latest
#下载镜像
docker pull nginx:latest
#列出所有本地镜像
docker images
#导出镜像到本地
docker save nginx:latest -o nginx.tar
docker save nginx:latest > nginx.tar
#导入镜像
docker load < nginx.tar
docker load -i nginx.tar
#删除镜像,被删除的镜像必须是未使用状态
docker rmi nginx:latest
#登录镜像仓库
docker login docker.zhangzhuo.com
#修改镜像名称
docker tag nginx:latest docker.zhangzhuo.com/ceshi/nginx:latest
#推送镜像
docker push docker.zhangzhuo.com/ceshi/nginx:latest
#查看镜像的构建以及历史变更
docker history nginx:latest
#使用dockerfile构建镜像
docker build -t nginx:zhangzhuo-v1 .
#提交一个正在运行的容器为镜像
docker commit nginx nginx:zhangzhuo-v2
#查看镜像详细信息
docker image inspect nginx:latest
```

## 2.4 容器操作基础

### 1.运行创建一个容器

创建并运行容器使用`docker run`命令命令格式如下

```bash
docker run [选项] [镜像名] [shell 命令]
```

运行时有较多选择参数，只介绍常用的具体如下：

- -it：一般为必填选项，意思为t分配一个伪终端，i保持STDIN打开即使无连接
- -d：一般为必填，后台运行容器，不填为前台运行
- --name：为容器指定一个名称，可选不填自动生成
- -p：映射端口到宿主机网络，可选，可以写多个
- -v：挂载宿主机文件系统到容器内，可选，可以写多个
- --env,-e：设置容器的环境变量，可选，可以写多个
- --restart：设置容器重启策略，
  - no：默认状态不自动重启容器。如果容器退出，则需要手动重新启动。
  - on-failure：仅在容器非正常退出时自动重启容器。例如，当容器退出代码不为0时。
  - always：无论容器如何退出，都自动重启容器。
  - unless-stopped：除非手动停止容器，否则容器将一直自动重启。
- --network：将容器连接到指定网络
  - bridge：默认的网络模式，容器通过NAT连接到宿主机的网络。
  - host：容器与宿主机共享网络命名空间，可以直接使用宿主机的网络接口。
  - none：容器不连接到任何网络。
  - container:<container_name>：将容器连接到另一个容器的网络命名空间。
  - user-defined：用户自定义的网络，可以通过docker network create命令创建。
- --rm：容器退出后自动删除容器。
- --link：将容器连接到另一个容器，并指定别名。只能在自定义网络中使用,源容器可以通过使用目标容器的别名来访问目标容器。
- --cpus：限制容器使用的CPU数量。
- --memory：限制容器使用的内存大小。
- --hostname：设置容器主机名称，默认为容器id
- --dns：指定其他dns服务器

示例如下：

```bash
#示例1
docker run -it -d --name nginx --network net nginx:latest
#示例2完整参数
docker run -it -d --name web \
-p 80:80 \
-v /data/nginx:/data \
-e zhangzhuo=0705 \
--link nginx:nginx.com \
--restart always \
--network net \
--cpus 1 \
--memory 1G \
nginx:latest
```

### 2.关于容器的其他命令

相关命令如下：

- docker ps：显示当前主机正在运行的容器
  - -a：显示所有，包括未运行的
- docker rm：删除停止运行的容器
  - -f：强制删除，包括正在运行的
- docker port：查看容器正在映射的端口
- docker exec：进入正在运行的容器终端，前提是容器内有终端命令如sh,bash等
- docker stop：停止容器
- docker start：启动容器
- docker pause：暂停正在运行的容器
- docker restart：重启容器
- docker cp：拷贝文件到宿主机或者拷贝宿主机文件到容器
- docker update：更新容器配置
  - --cpus：设置cpu限制
  - --memory：设置内存限制
  - --memory-swap：设置交换内存-1不设置
- docker wait：未运行的容器可使用此命令查看退出状态码
- docker diff：检查容器更改过的文件
- docker logs：查看容器日志
  - -f：跟踪日志
- docker stats：显示容器资源使用状态，包括资源限制信息
- docker inspect：查看容器的详细信息，以json格式输出
- docker rename：修改容器名称

**示例：**

```bash
#显示所有容器
docker ps -a
#删除容器
docker rm -f nginx
#查看容器映射端口
docker port nginx
#进入容器终端
docker exec -it nginx bash
#停止容器
docker stop nginx
#拷贝文件
docker cp /tmp nginx:/data
docker cp nginx:/data /tmp
#更新容器配置
docker update nginx --cpu 2 --memory 1G --memory-swap -1
#查看容器退出码
docker wait nginx
#查看容器更改的文件
docker diff nginx
#查看容器日志
docker logs -f nginx
#显示容器资源使用状态
docker stats
#查看容器详细信息
docker inspect nginx
#修改容器名称
docker rename nginx web
```

# 三、数据管理

Docker的镜像是分层设计的，镜像层是只读的，通过镜像启动的容器添加了一层可读写的文件系统，用户写入的数据都保存在这一层当中。 如果要将写入到容器的数据永久保存，则需要将容器中的数据保存到宿主机的指定目录。如果数据不进行持久化在容器删除后数据也将丢失。

docker提供了2种存储挂载方式，具体如下：

1. 绑定挂载（Bind Mounts）：绑定挂载是将主机上的目录或文件直接挂载到容器中。可以通过在运行容器时使用`-v`或`--volume`参数来指定挂载的目录或文件。例如，`docker run -v /host/path:/container/path`将主机上的`/host/path`目录挂载到容器中的`/container/path`目录。
2. 数据卷挂载（Volume Mounts）：数据卷是一种特殊的目录，可以在容器之间共享和持久化数据。可以通过在运行容器时使用`-v`或`--volume`参数来指定使用数据卷进行挂载。例如，`docker run -v myvolume:/container/path`将名为`myvolume`的数据卷挂载到容器中的`/container/path`目录。

## 3.1 绑定挂载

绑定挂载（Bind Mounts）是将主机上的目录或文件直接挂载到Docker容器中，使得容器可以访问和操作主机上的文件系统。绑定挂载可以用于数据共享、配置文件管理、日志收集等场景。在Docker中，可以使用`-v`或`--volume`参数来指定绑定挂载的目录或文件。

绑定挂载的语法如下：

```bash
docker run -v /host/path:/container/path:rw image_name
```

其中，

- `/host/path`：是主机上的目录或文件路径
- `/container/path`：是容器中的目录或文件路径
- `rw`：是挂载到容器种的文件权限，可配置默认为rw
  - rw：读写权限
  - ro：只读权限
- `image_name`：是要运行的镜像名称。

绑定挂载的特点如下：

1. 主机上的目录或文件会被直接挂载到容器中，容器可以直接访问和操作这些文件。
2. 主机上的文件或目录必须存在，否则Docker会自动创建一个空目录。
3. 容器中的目录或文件如果不存在，Docker会自动创建一个空目录或文件。
4. 主机上的目录或文件的权限和所有者会被继承到容器中。
5. 修改容器中的文件会直接影响主机上的文件，反之亦然。

绑定挂载的使用场景如下：

1. 数据共享：可以将主机上的目录或文件挂载到多个容器中，实现数据共享和数据持久化。
2. 配置文件管理：可以将主机上的配置文件挂载到容器中，实现配置文件的动态更新和管理。
3. 日志收集：可以将容器中的日志文件挂载到主机上，方便日志的收集和分析。

总之，绑定挂载是Docker中非常常用的一种挂载方式，可以方便地实现主机与容器之间的文件共享和管理。需要注意的是，由于绑定挂载会直接影响主机上的文件，因此需要谨慎操作，避免误删或修改重要文件。

示例如下：

```bash
docker run -it -d --name nginx -v /etc/hosts:/etc/hosts:ro -v /data:/data nginx:latest
```

## 3.2 数据卷

Docker Volume（Docker数据卷）是Docker提供的一种用于持久化存储容器数据的机制。它可以用于在主机和容器之间共享和持久化数据，而不会受到容器的生命周期影响。

Docker Volume提供了一种简单、可靠的方法来处理容器的持久化数据。与数据卷挂载（Volume Mounts）相比，Docker Volume更加灵活和易于管理。它可以独立于容器进行创建、管理和销毁，同时提供了更多的功能和选项。

使用Docker Volume，可以通过以下几种方式来创建和使用数据卷：

1. 使用`docker volume create`命令创建一个新的数据卷：

```bash
docker volume create my_volume
```

2. 在运行容器时使用`-v`参数来挂载一个已经存在的数据卷：

```bash
docker run -v <volume_name>:<container_path> image_name
```

Docker Volume的好处包括：

- 独立于容器的生命周期：数据卷可以独立于容器进行创建、管理和销毁，不会受到容器的生命周期影响。
- 更灵活的数据管理：可以方便地备份、恢复和迁移数据卷，而不需要担心容器的状态和位置。
- 支持插件扩展：Docker Volume提供了插件机制，可以扩展和定制数据卷的功能，满足不同的需求。

总之，Docker Volume是一种用于持久化存储容器数据的机制，提供了更灵活、可靠和易于管理的数据管理方式。通过创建、挂载和管理数据卷，可以实现容器数据的持久化存储和共享。

### 1.数据卷的管理

数据卷使用`docker volume`命令进行管理，具体命令如下

- docker volume create：创建数据卷
- docker volume ls：查看现有数据卷
- docker volume inspect：查看某个数据卷的详细信息，以json格式输出
- docker volume rm：删除数据库，未使用的数据卷可被删除
- docker volume prune：删除清空所有未使用数据卷

示例：

```bash
#创建数据卷
docker volume create ceshi
#查看数据卷
docker volume ls 
#查看某个数据卷的详细信息
docker volume inspect ceshi
#删除某个数据卷
docker volume rm ceshi
#删除所有未使用数据卷
docker volume prune
```

### 2.数据卷插件

Docker数据卷可对接同的驱动程序，常见的驱动程序有

- `local`驱动程序：使用本地文件系统作为后端存储，是默认的驱动程序。
- `nfs`驱动程序：使用NFS（Network File System）作为后端存储，可以在多个主机之间共享数据卷。
- `smb`驱动程序：使用SMB（Server Message Block）协议作为后端存储，可以与Windows共享文件夹进行交互。

**nfs卷**

docker内置了nfs驱动，创建nfs类型的volume如下

```bash
docker volume create --driver local \
--opt type=nfs  \
--opt o=nfsvers=4.1,addr=10.202.43.240,mountport=2049 \
--opt device=:/data1/nfs nfs
```

**smb卷**

```bash
docker volume create --driver local \
--opt type=cifs \
--opt device=//10.202.43.240/share \
--opt o=username=zhangzhuo,password=123456 \
smb
```

# 四、Docker网络

容器网络是指容器之间或非Docker工作负载之间连接和通信的能力。容器不知道它所连接的网络类型，或者它们的对等体是否也是Docker工作负载。容器只能看到带有IP 地址、网关、路由表、DNS 服务和其他网络详细信息的网络接口。

## 4.1 容器网络基础

### 1.发布容器端口

默认情况下，当您使用`docker create`，`docker run`命令创建容器时，容器不会向外界公开其任何端口。使用`-p`参数使端口可发布到宿主机网络中，这会在主机中创建一条防火墙规则，将容器端口映射到Docker主机上通往外界的端口。如果您想让一个容器可供其他容器访问，则无需发布该容器的端口。通过将容器连接到同一网络（通常是桥接网络)来启用容器间通信。

示例：

- `-p 8080:80`：将容器中的TCP端口80映射到主机的8080端口
- `-p 192.168.1.100:8080:80`：将容器中的TCP端口80映射到主机的8080端口且绑定地址为192.168.1.100
- `-p 8080:80/udp`：将容器中的UDP端口80映射到主机的8080端口

### 2.容器IP地址和主机名

默认情况下，容器会从连接的网络获取一个IP地址。容器接收网络IP子网之外的IP地址。Docker守护进程为容器执行动态子网划分和IP地址分配。每个网络还有一个默认子网掩码和网关。当容器启动时，它只能使用该`--network`标志附加到单个网络。您可以使用该命令将正在运行的容器连接到多个网络`docker network connect`。同样，容器的主机名默认为Docker中容器的ID。您可以使用覆盖主机名`--hostname`。

示例：给容器设置多个网络

```bash
docker run -it -d --name net docker.gridsumdissector.com/gai/alpine:latest
#创建一个新网络，并且附加在容器
docker network create net
docker network  connect net net
#验证，容器内会有2个网卡
docker exec net ip a
```

### 3.DNS服务

默认情况下，容器继承配置文件中定义的主机的DNS设置`/etc/resolv.conf`。连接到默认`bridge`网络的容器会收到此文件的副本。连接到自定义网络的容器 使用Docker的嵌入式DNS服务器。嵌入式DN 服务器将外部DNS查找转发到主机上配置的DNS服务器。你也可以在创建容器时指定其他dns配置。如下

示例：

```bash
docker run -it -d --name dns --hostname dns --dns 8.8.8.8 docker.gridsumdissector.com/gai/alpine:latest
#验证
docker exec dns cat /etc/resolv.conf
```

## 4.2 Docker不同类型网络

Docker的网络子系统是可插拔的，使用驱动程序。默认情况下存在多个驱动程序，并提供核心网络功能。这里只介绍一些常见的类型。

`bridge`：默认网络驱动程序。如果您不指定驱动程序，这就是您正在创建的网络类型。当您的应用程序在需要与同一主机上的其他容器通信的容器中运行时，通常会使用桥接网络。

`host`：取消容器与Docker主机之间的网络隔离，直接使用主机的网络。

`none`：将容器与宿主机及其他容器完全隔离。

### 1.bridge

桥接网络是一种在网段之间转发流量的链路层设备。桥接器可以是硬件设备，也可以是在主机内核中运行的软件设备。Docker桥接网络使用软件桥接，允许连接到同一桥接网络的容器进行通信，同时提供与未连接到该桥接网络的容器的隔离。Docker桥接驱动程序会自动在主机中安装规则，以便不同桥接网络上的容器无法直接相互通信。桥接网络适用于在同一Docker守护进程主机上运行的容器。启动Docker时，会自动创建一个默认桥接网络(docker0)，并且新启动的容器在不指定网络时会连接到该网络。`bridge`您还可以创建用户定义的自定义桥接网络。用户定义的桥接网络优于默认`bridge`网络。

**用户定义的桥和默认桥的区别**

- 用户定义的桥提供容器之间的自动DNS解析
  - 默认桥接网络上的容器只能通过IP地址相互访问，除非您使用选项--link该选项。在用户定义的桥接网络上，容器可以通过名称或别名相互解析。
- 用户定义的桥提供更好的隔离
  - 所有没有`--network`指定的容器都连接到默认的桥接网络。这可能是一个风险，因为不相关的堆栈/服务/容器随后能够进行通信。
  - 使用用户定义的网络提供了一个限定范围的网络，其中只有附加到该网络的容器才能进行通信。
- 容器可以动态地与用户定义的网络连接和分离
  - 在容器的生命周期内，您可以即时将其与用户定义的网络连接或断开。
  - 要从默认桥接网络中删除容器，您需要停止该容器并使用不同的网络选项重新创建它。
- 每个用户定义的网络都会创建一个可配置的网桥
  - 如果您的容器使用默认桥接网络，您可以对其进行配置，但所有容器都使用相同的设置，例如MTU和`iptables`规则，此外，配置默认桥接网络发生在 Docker本身之外，如果需要更新配置只能重启docker
  - 用户定义的桥接网络可以在创建每个用户定义的网桥时单独配置它

**管理自己的网桥**

可使用`docker network`命令管理自己的网桥，具体如下

- docker network create：创建docker网络
  - --subnet：指定网络子网
  - --gateway：指定网关
- docker network rm：删除docker网络，必须在没有任何容器使用这个网络时删除
- docker network inspect：查看一个docker网络详细信息，以json格式输出
- docker network ls：查看所有docker网络
- docker network disconnect：从容器中移除某个网络
- docker network connect：添加某个网络到容器

示例：

```bash
#创建网络
docker network create ceshi --driver bridge --subnet 192.168.10.0/24 --gateway 192.168.10.254
#查看网络
docker network  ls
#查看网络详细信息
docker network inspect ceshi
#把容器附加到这个网络
docker network connect ceshi net
#移除容器的附加网络
docker network disconnect ceshi net
#删除网络
docker network rm
```

### 2.host

如果使用host模式，容器的网络将使用宿主机网络命名空间，并且容器不会分配自己的IP地址。例如，如果您运行绑定到端口80的容器并且使用`host`网络，则该容器的应用程序可在主机IP地址的端口80上使用。主机模式网络对于优化性能非常有用，并且在容器需要处理大量端口的情况下，因为它不需要网络地址转换（NAT），并且不会为每个端口创建“用户层代理”。

### 3.none

如果使用此模式容器将不会创建网络接口，内部只有一个环回设备。

## 4.3 Docker中的iptables

在Linux上，Docker操纵`iptables`规则来提供网络隔离。默认情况下同一个主机的不同桥接网络是不能互相访问的，如果容器对外发布了端口即表示只要能访问这台主机的设备都可以访问这个端口。

Docker安装了两个名为`DOCKER-USER`和的自定义iptables链`DOCKER`，它确保传入的数据包始终首先由这两个链检查。这些链条是`FORWARD`链条的一部分，Docker的所有`iptables`规则都添加到`DOCKER`链中请勿手动操作该链条。如果需要配置docker容器的规则用户可以把规则配置到`DOCKER-USER`链中，当数据包到达`DOCKER-USER`链时，它们已经通过了目标网络地址转换 (DNAT) 过滤器。

### 1.桥接网络的NAT

在docker中创建桥接网络，会默认创建nat规则，即容器访问外部会进行nat,外面访问容器的暴露端口也会进行nat，具体的实现如下

- POSTROUTING规则：这个规则将容器的流量从容器网络转发到主机网络。它将源IP地址从容器的IP地址转换为主机的IP地址。
- PREROUTING规则：这个规则将主机网络上的流量转发到容器。它将目标IP地址从主机的IP地址转换为容器的IP地址。
- FORWARD规则：这个规则允许转发容器和主机网络之间的流量。

**示例：**

```bash
#iptables -t nat -vnL
Chain PREROUTING (policy ACCEPT 55375 packets, 3044K bytes)
 pkts bytes target     prot opt in     out     source               destination         
    8   416 DOCKER     all  --  *      *       0.0.0.0/0            0.0.0.0/0            ADDRTYPE match dst-type LOCAL

Chain POSTROUTING (policy ACCEPT 14 packets, 827 bytes)
 pkts bytes target     prot opt in     out     source               destination         
   11   773 MASQUERADE  all  --  *      !br-d16c7dee461b  192.168.10.0/24      0.0.0.0/0           
    0     0 MASQUERADE  all  --  *      !docker0  172.17.0.0/16        0.0.0.0/0           
    0     0 MASQUERADE  tcp  --  *      *       192.168.10.1         192.168.10.1         tcp dpt:80
```

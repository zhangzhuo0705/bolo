---
title: "kubernetes基础概念"
date: 2022-01-03T14:09:27+08:00
lastmod: 2022-01-03T14:10:26+08:00
draft: false
description: "梳理 Kubernetes 的核心概念与 Master 节点组件，建立集群架构的整体认识。"
cover: "https://b3logfile.com/bing/20200116.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["Kubernetes"]
tags: ["Kubernetes"]
toc: true
---
# 一、kubernetes基础

Kubernetes是谷歌以Borg为前身，基于谷歌15年生产环境经验的基础上开源的一个项目，Kubernetes致力于提供跨主机集群的自动部署、扩展、高可用以及运行应用程序容器的平台。

**有了docker为什么还需要使用kubernetes**

在真正的业务场景中一般会部署大量的业务容器，而直接使用裸容器的方式来管理业务容器环境是比较吃力的，但是也有一些其他工具提供了docker单机编排的功能如`docker-compose`,并且在某些程序需要使用多个副本来实现高可用或增加负载节点时docker也无法直接提供支持而kubernetes可以使用控制器来实现容器的多个副本以及一些更高级的功能。并且在某些业务容器运行过程当中会出现一些假死的状态，需要请求健康检查接口来判断容器是否存活的场景时dockers也无法提供支持而kubernetes中可以直接使用探针进行监控检测。kubernetes会极大的减少运维人员的工作量。

**集群架构如下**

![图片1](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/图片1.png)

**集群架构说明**

kubernetes分为master节点与node节点是一个主从架构，master节点是整个集群的管理控制中是不建议运行任何应用程序否则会极大的增加master节点的负载从而降低性能，生成环境中建议部署多个master节点节点数量更具node节点规模进行适当的调整，在使用一个代理来代理多个master的流量请求。node节点是kubernetes集群中运行应用程序的节点，相当于计算节点

- master节点：是整个集群的控制管理中心，负责容器的调度，也是整个集群访问管理的入口。
- node节点：是集群真正运行容器的节点。

etcd是一个键值数据库，存储一些集群的信息，一般生产环境中建议部署三个以上节点(奇数个)。由于kubernetes集群中所有数据都存储在etcd中所以kubernetes所有的组件都是无状态服务，所以备份etcd数据就相当于备份整个kubernetes集群。

Load Balancer表示一个代理，主要作用是用来代理master节点，可以选用物理的代理如F5,或者软件的haproxy+keepalived。

# 二、master节点详解

Master节点是整个集群的控制中枢，master节点下有三个kubernetes组件，分别是`Kube-APIServer`、`Controller-Manager`、`Scheduler`。

## 2.1 Kube-APIServe

官方文档：https://kubernetes.io/zh/docs/reference/command-line-tools-reference/kube-apiserver/

- 集群的控制中枢，各个模块之间信息交互都需要经过这个组件，同时它也是集群管理、资源配置、整个集群安全机制的入口。
- 提供了k8s各类资源对象（pod,RC,Service等）的增删改查及watch等HTTP Rest接口，是整个系统的数据总线和数据中心。
- API 服务器是 Kubernetes 控制面的组件， 该组件公开了 Kubernetes API。 API 服务器是 Kubernetes 控制面的前端。
- Kubernetes API 服务器的主要实现是 kube-apiserver。kube-apiserver 设计上考虑了水平伸缩，也就是说，它可通过部署多个实例进行伸缩。你可以运行 kube-apiserver 的多个实例，并在这些实例之间平衡流量。

## 2.2 kube-controller-manager

官方文档：https://kubernetes.io/zh/docs/reference/command-line-tools-reference/kube-controller-manager/

- 集群的状态管理器，保证Pod或其他资源达到期望值，也是需要和APIServer进行通信，在需要的时候创建、更新或删除它所管理的资源。
- Controller Manager作为集群内部的管理控制中心，非安全默认端口10252，负责集群内的Node、Pod副本、服务端点（Endpoint）、命名空间（Namespace）、服务账号（ServiceAccount）、资源定额（ResourceQuota） 的管理，当某个Node意外宕机时，Controller Manager会及时发现并执行自动化修复流程，确保集群始终处于预期的工作状态。
- 目前，Kubernetes 自带的控制器例子包括副本控制器、节点控制器、命名空间控制器和服务账号控制器等。

**kube-controller-manager包括的控制器**

- 节点控制器（Node Controller）: 负责在节点出现故障时进行通知和响应
- 任务控制器（Job controller）: 监测代表一次性任务的 Job 对象，然后创建 Pods 来运行这些任务直至完成
- 端点控制器（Endpoints Controller）: 填充端点(Endpoints)对象(即加入 Service 与 Pod)
- 服务帐户和令牌控制器（Service Account & Token Controllers）: 为新的命名空间创建默认帐户和 API 访问令牌

## 2.3 kube-scheduler

官方文档：https://kubernetes.io/zh/docs/reference/command-line-tools-reference/kube-scheduler/

- 集群的调度中心，它会根据指定的一系列条件，选择一个或一批最佳的节点，然后部署我们的Pod。
- Scheduler负责Pod调度，在整个系统中起"承上启下"作用，承上：负责接收Controller Manager创建的新的Pod， 为其选择一个合适的Node；启下：Node上的kubelet接管Pod的生命周期。
- 调度器通过 kubernetes 的监测（Watch）机制来发现集群中新创建且尚未被调度到 Node 上的 Pod。 调度器会将发现的每一个未调度的 Pod 调度到一个合适的 Node 上来运行。 调度器会依据下文的调度原则来做出调度选择。
- Kubernetes 调度器是一个控制面进程，负责将 Pods 指派到节点上。 调度器基于约束和可用资源为调度队列中每个 Pod 确定其可合法放置的节点。 调度器之后对所有合法的节点进行排序，将 Pod 绑定到一个合适的节点。 在同一个集群中可以使用多个不同的调度器；kube-scheduler 是其参考实现。

**调度算法**

```bash
通过调度算法为待调度Pod列表的每个Pod从可用Node列表中选择一个最适合的Node，并将信息写入etcd中
node节点上的kubelet通过API Server监听到kubernetes Scheduler产生的Pod绑定信息，然后获取对应的Pod清单，下载image，并启动容器。

优选策略，默认即为1
1.LeastRequestedPriority
优先从备选节点列表中选择资源消耗最小的节点（CPU+内存）。
2.CalculateNodeLabelPriority
优先选择含有指定Label的节点。
3.BalancedResourceAllocation
优先从备选节点列表中选择各项资源使用率最均衡的节点。
```

### 1.调度原理

调度器通过 kubernetes 的监测（Watch）机制来发现集群中新创建且尚未被调度到 Node 上的 Pod。 调度器会将发现的每一个未调度的 Pod 调度到一个合适的 Node 上来运行。 调度器会依据下文的调度原则来做出调度选择。对每一个新创建的 Pod 或者是未被调度的 Pod，kube-scheduler 会选择一个最优的 Node 去运行这个 Pod。然而，Pod 内的每一个容器对资源都有不同的需求，而且 Pod 本身也有不同的资源需求。因此，Pod 在被调度到 Node 上之前， 根据这些特定的资源调度需求，需要对集群中的 Node 进行一次过滤。在一个集群中，满足一个 Pod 调度请求的所有 Node 称之为**可调度节点**。 如果没有任何一个 Node 能满足 Pod 的资源请求，那么这个 Pod 将一直停留在 **未调度状态**直到调度器能够找到合适的 Node。

调度器先在集群中找到一个 Pod 的所有可调度节点，然后根据一系列函数对这些可调度节点**打分**， 选出其中得分最高的 Node 来运行 Pod。之后，调度器将这个调度决定通知给 kube-apiserver，这个过程叫做**绑定**。

在做调度决定时需要考虑的因素包括：单独和整体的资源请求、硬件/软件/策略限制、亲和以及反亲和要求、数据局域性、负载间的干扰等等。

**kube-scheduler 给一个 pod 做调度选择包含两个步骤**

1. 过滤
2. 打分

过滤阶段会将所有满足 Pod 调度需求的 Node 选出来。 例如，PodFitsResources 过滤函数会检查候选 Node 的可用资源能否满足 Pod 的资源请求。 在过滤之后，得出一个 Node 列表，里面包含了所有可调度节点；通常情况下， 这个 Node 列表包含不止一个 Node。如果这个列表是空的，代表这个 Pod 不可调度。

在打分阶段，调度器会为 Pod 从所有可调度节点中选取一个最合适的 Node。 根据当前启用的打分规则，调度器会给每一个可调度节点进行打分。

最后，kube-scheduler 会将 Pod 调度到得分最高的 Node 上。 如果存在多个得分最高的 Node，kube-scheduler 会从中随机选取一个。

**支持以下两种方式配置调度器的过滤和打分行为**

1. 调度策略允许你配置过滤的 *断言(Predicates)* 和打分的优先级(Priorities) 。
2. 调度配置允许你配置实现不同调度阶段的插件， 包括：`QueueSort`, `Filter`, `Score`, `Bind`, `Reserve`, `Permit` 等等。 你也可以配置 kube-scheduler 运行不同的配置文件。

# 三、node节点

node节点在整个集群中是运行容器的节点，主要有三个组件分别是`kubelet`、`kube-proxy`、`runtime`(容器运行时)。

## 3.1 kubelet

官方文档：https://kubernetes.io/zh/docs/reference/command-line-tools-reference/kubelet/

- 负责监听节点上Pod的状态，同时负责上报节点和节点上面Pod的状态，负责与Master节点通信，并管理节点上面的Pod。
- 在kubernetes集群中，每个Node节点都会启动kubelet进程，用来处理Master节点下发到本节点的任务，管理 Pod和其中的容器。kubelet会在API Server上注册节点信息，定期向Master汇报节点资源使用情况，并通过 cAdvisor(顾问)监控容器和节点资源，可以把kubelet理解成Server/Agent架构中的agent，kubelet是Node上的 pod管家。
- 一个在集群中每个节点（node）上运行的代理。 它保证容器（containers）都运行在 Pod 中。kubelet 接收一组通过各类机制提供给它的 PodSpecs，确保这些 PodSpecs 中描述的容器处于运行状态且健康。 kubelet 不会管理不是由 Kubernetes 创建的容器。

## 3.2 kube-proxy

官方文档：https://kubernetes.io/zh/docs/reference/command-line-tools-reference/kube-proxy/

- 负责Pod之间的通信和负载均衡，将指定的流量分发到后端正确的机器上。
- kube-proxy现在有三种工作方式分别是`iptables`、`ipvs`、`UserSpace`（已经淘汰）。

查看Kube-proxy工作模式：curl 127.0.0.1:10249/proxyMode

```bash
[root@kn3-74 ~]# curl  10.122.6.74:10249/proxyMode
ipvs
```

### 1.kube-proxy工作方式详解

**三种工作模式**

```bash
UserSpace
	k8s v1.2 及以后就已经淘汰
IPtables
	目前默认方式，1.1开始支持，1.2开始为默认
IPVS
	1.9引入到1.11正式版本，需要安装ipvsadm、ipset 工具包和加载 ip_vs 内核模块
```

#### iptables

Kube-Proxy 监听 Kubernetes Master 增加和删除 Service 以及 Endpoint 的消息。对于每一个 Service，Kube Proxy 创建相应的 IPtables 规则，并将发送到 Service Cluster IP 的流量转发到 Service 后端提供服务的 Pod 的相应端口上。

注： 虽然可以通过 Service 的 Cluster IP 和服务端口访问到后端 Pod 提供的服务，但该 Cluster IP 是 Ping 不通的。 其原因是 Cluster IP 只是 IPtables 中的规则，并不对应到一个任何网络设备。 IPVS 模式的 Cluster IP 是可以 Ping 通的。

![image-20210617152637802](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210617152637802.png)

#### IPVS

IPVS 相对 IPtables 效率会更高一些，使用 IPVS 模式需要在运行 Kube-Proxy 的节点上安装 ipvsadm、ipset 工具 包和加载 ip_vs 内核模块，当 Kube-Proxy 以 IPVS 代理模式启动时，Kube-Proxy 将验证节点上是否安装了 IPVS 模块，如果未安装，则 Kube-Proxy 将回退到 IPtables 代理模式。

```bash
使用IPVS模式，Kube-Proxy会监视Kubernetes Service对象和Endpoints，调用宿主机内核Netlink接口以相应地创建IPVS规则并定期与Kubernetes Service对象 Endpoints对象同步IPVS规则，以确保IPVS状态与期望一致，访问服务时，流量将被重定向到其中一个后端 Pod,IPVS使用哈希表作为底层数据结构并在内核空间中工作，这意味着IPVS可以更快地重定向流量，并且在同步代理规则时具有更好的性能，此外，IPVS 为负载均衡算法提供了更多选项，例如：rr (轮询调度)、lc (最小连接数)、dh (目标哈希)、sh (源哈希)、sed (最短期望延迟)、nq(不排队调度)等。
```

![image-20210617152832039](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210617152832039.png)

扩展：在规模比较大的集群如果service资源较多时，会导致集群性能下降，所以现在有一个新的技术eBPF可以替代kube-proxy功能。

## 3.3 runtime(容器运行时)

kubernetes的node节点组件是并不提供容器运行时环境的，所以需要额外安装符合kubernetes的容器运行时主要是符合CRI接口的容器运行时，先版本常用的容器运行时有`docker`、`conrainerd`、`cri-o`等。

# 四、其他组件介绍

## 4.1 calico网络组件

官网：https://www.projectcalico.org/

calico是一个符合cni标准的网络插件，给每个Pod生成一个唯一的IP地址，并且把每个node节点当做一个路由器。并且在kubernetes中可以配置网络策略。

Calico是一个纯三层的方案，为虚机及容器提供多主机间通信，没有使用重叠网络（如flannel）驱动，采用虚拟路由代替虚拟交换，每一台虚拟路由器通过BGP协议传播可达信息（路由）到其他虚拟或物理路由器。而且无缝集成像 `OpenStack` 这种 Iaas 云架构，能够提供可控的 VM、容器、裸机之间的 IP 通信。为什么说它是纯三层呢？因为所有的数据包都是通过路由的形式找到对应的主机和容器的，然后通过 BGP 协议来将所有路由同步到所有的机器或数据中心，从而完成整个网络的互联。简单来说，Calico 在主机上创建了一堆的 veth pair，其中一端在主机上，另一端在容器的网络命名空间里，然后在容器和主机中分别设置几条路由，来完成网络的互联。

### 1.calico架构

![img](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/924276-20180928185419339-1816144140.png)

- Felix：Calico agent，运行在每台workload节点，主要负责配置路由及ACLs等信息，确保endpoint的连通状态；
- Etcd：分布式kv存储，主要负责网络元数据一致性，确保Calico网络状态的准确性；
- BGP Client(BIRD)：主要负责把Felix写入kernel的路由信息分发到当前Calico网络，确保workload间的通信的有效性；
- BGP Route Reflector(BIRD)：一般在大规模部署时采用，与所有节点互联的mesh模式不同，通过一个或多个BGP Route Reflector来完成集中式的路由分发。

### 2.组网原理

calico组网的核心原理就是IP路由，每个容器或者虚拟机会分配一个workload-endpoint(wl)。

从nodeA上的容器A内访问nodeB上的容器B时:

```bash
+--------------------+              +--------------------+ 
|   +------------+   |              |   +------------+   | 
|   |            |   |              |   |            |   | 
|   |    ConA    |   |              |   |    ConB    |   | 
|   |            |   |              |   |            |   | 
|   +-----+------+   |              |   +-----+------+   | 
|         |veth      |              |         |veth      | 
|       wl-A         |              |       wl-B         | 
|         |          |              |         |          |
+-------node-A-------+              +-------node-B-------+ 
        |    |                               |    |
        |    | type1.  in the same lan       |    |
        |    +-------------------------------+    |
        |                                         |
        |      type2. in different network        |
        |             +-------------+             |
        |             |             |             |
        +-------------+   Routers   |-------------+
                      |             |
                      +-------------+

从ConA中发送给ConB的报文被nodeA的wl-A接收，根据nodeA上的路由规则，经过各种iptables规则后，转发到nodeB。

如果nodeA和nodeB在同一个二层网段，下一条地址直接就是node-B，经过二层交换机即可到达。
如果nodeA和nodeB在不同的网段，报文被路由到下一跳，经过三层交换或路由器，一步步跳转到node-B。
```

核心问题是，nodeA怎样得知下一跳的地址？答案是node之间通过BGP协议交换路由信息。每个node上运行一个软路由软件bird，并且被设置成BGP Speaker，与其它node通过BGP协议交换路由信息。可以简单理解为，每一个node都会向其它node通知这样的信息:

```bash
我是X.X.X.X，某个IP或者网段在我这里，它们的下一跳地址是我。
```

通过这种方式每个node知晓了每个workload-endpoint的下一跳地址。

### 3.calico通信原理

任意选择 k8s 集群中的一个节点作为实验节点，进入容器 A，查看容器 A 的 IP 地址

```bash
/ # ip a
4: eth0@if93: <BROADCAST,MULTICAST,UP,LOWER_UP,M-DOWN> mtu 1480 qdisc noqueue state UP 
    link/ether 32:f9:1c:55:b9:50 brd ff:ff:ff:ff:ff:ff
    inet 172.29.209.113/32 scope global eth0
       valid_lft forever preferred_lft forever
    inet6 fe80::30f9:1cff:fe55:b950/64 scope link 
       valid_lft forever preferred_lft forever
```

这里容器获取的是 /32 位主机地址，表示将容器 A 作为一个单点的局域网。

查看下容器的默认路由

```bash
/ # ip route
default via 169.254.1.1 dev eth0 
169.254.1.1 dev eth0 scope link
```

现在问题来了，从路由表可以知道 `169.254.1.1` 是容器的默认网关，但却找不到任何一张网卡对应这个 IP 地址。先想下当一个数据包的目的地址不是本机时，就会查询路由表，从路由表中查到网关后，它首先会通过 `ARP` 获得网关的 MAC 地址，然后在发出的网络数据包中将目标 MAC 改为网关的 MAC，而网关的 IP 地址不会出现在任何网络包头中。也就是说，没有人在乎这个 IP 地址究竟是什么，只要能找到对应的 MAC 地址，能响应 ARP 就行了。

到这里，我们就可以继续往下进行了，可以通过 `ip neigh` 命令查看一下本地的 ARP 缓存，如果没有信息需要先`ping`下其他的node节点IP地址

```bash
/ # ip neigh
169.254.1.1 dev eth0 lladdr ee:ee:ee:ee:ee:ee ref 1 used 0/0/0 probes 4 REACHABLE
```

这个 MAC 地址应该是 Calico 硬塞进去的，而且还能响应 ARP。但它究竟是怎么实现的呢？

我们先来回想一下正常情况，内核会对外发送 ARP 请求，询问整个二层网络中谁拥有 `169.254.1.1` 这个 IP 地址，拥有这个 IP 地址的设备会将自己的 MAC地址返回给对方。但现在的情况比较尴尬，容器和主机都没有这个 IP 地址，甚至连主机上的端口 `calicba2f87f6bb`，MAC 地址也是一个无用的 `ee:ee:ee:ee:ee:ee`。按道理容器和主机网络根本就无法通信才对呀！所以 Calico 是怎么做到的呢？

这里我就不绕弯子了，**实际上 Calico 利用了网卡的代理 ARP 功能**。代理 ARP 是 ARP 协议的一个变种，当 ARP 请求目标跨网段时，网关设备收到此 ARP 请求，会用自己的 MAC 地址返回给请求者，这便是代理 ARP（Proxy ARP）。举个例子：

![img](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/2019-07-30-061928.jpg)

上面这张图中，电脑发送 ARP 请求服务器 8.8.8.8 的 MAC 地址，路由器（网关）收到这个请求时会进行判断，由于目标 8.8.8.8 不属于本网段（即跨网段），此时便返回自己的接口 MAC 地址给 PC，后续电脑访问服务器时，目标 MAC 直接封装为 MAC254。

现在我们知道，Calico 本质上还是利用了代理 ARP 撒了一个“善意的谎言”，下面我们来确认一下。

查看宿主机的网卡信息和路由信息：

```bash
[root@graylog ~]# ip a
93: calibe85ccd11fe@if4: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1480 qdisc noqueue state UP 
    link/ether ee:ee:ee:ee:ee:ee brd ff:ff:ff:ff:ff:ff link-netnsid 2

#路由查看
[root@graylog ~]# ip route 
...
172.29.209.113 dev calibe85ccd11fe scope link
```

查看是否开启代理 ARP

```bash
[root@graylog ~]# cat /proc/sys/net/ipv4/conf/calibe85ccd11fe/proxy_arp
1
```

如果还不放心，可以通过 tcpdump 抓包验证一下

```bash
[root@graylog ~]# tcpdump -i calibe85ccd11fe -e -nn
16:56:05.346549 32:f9:1c:55:b9:50 > ee:ee:ee:ee:ee:ee, ethertype ARP (0x0806), length 42: Request who-has 169.254.1.1 tell 172.29.209.113, length 28
16:56:05.346592 ee:ee:ee:ee:ee:ee > 32:f9:1c:55:b9:50, ethertype ARP (0x0806), length 42: Reply 169.254.1.1 is-at ee:ee:ee:ee:ee:ee, length 28
```

总结：

1. Calico 通过一个巧妙的方法将 workload 的所有流量引导到一个特殊的网关 169.254.1.1，从而引流到主机的 calixxx 网络设备上，最终将二三层流量全部转换成三层流量来转发。
2. 在主机上通过开启代理 ARP 功能来实现 ARP 应答，使得 ARP 广播被抑制在主机上，抑制了广播风暴，也不会有 ARP 表膨胀的问题。

### 4.使用calico注意的问题

**calico组件运行正常但是pod无法与其他node节点或者自己的所在的node节点通信**

在物理节点是通过Veth Pair连接到容器，容器中会默认生成一条`169.254.1.1`的路由信息查看整个拓扑没有一个设备是这个地址，在物理机上的容器关联的网卡会启用arp代理，所以正常情况下容器arp请求会返回容器绑定的物理机网卡的mac地址，但是使用容器进行`ping`测试是无返回数据包的，容器使用`ip neigh`命令查看arp缓存是没有数据的，容器请求arp请求后抓包显示没有返回数据，可能的原因是**node节点没有配置网关**,导致容器的宿主机认为自己无法访问`169.254.1.1`地址不会返回自己的mac作为代理arp地址，所以容器无法进行通信。

## 4.2 集群dns组件coredns

官方网站：https://coredns.io/

主要负责把集群中service资源的名称解析成对应的IP地址，coredns的副本数量可以根据集群的规模进行适当调整，但是在集群规模达到一定数量时扩展coredns副本数并不可以提高性能时，就需要部署dns缓存，具体原理就是每个node节点都运行一个dns组件代理到coredns，node节点的pod的dns服务器都指定到dns缓存，由dns缓存回复pod的dns请求。

**coredns的架构图**

![image-20210831200305289](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210831200305289.png)

**dns缓存架构图**

![image-20210831195940589](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210831195940589.png)

## 4.3 metrics-server

Metrics Server是集群范围资源使用数据的聚合器。 从 Kubernetes 1.8开始，它作为 Deployment 对象，被默认部署在由`kube-up.sh`脚本创建的集群中。 如果您使用不同的 Kubernetes 安装方法，则可以使用提供的deployment yamls来部署。它在 Kubernetes 1.7+中得到支持（详见下文）。

Metric server 从每个节点上的Kubelet公开的 Summary API 中采集指标信息。

通过在主 API server 中注册的 Metrics Server Kubernetes 聚合器]来采集指标信息， 这是在 Kubernetes 1.7 中引入的。

部署组件后可以查询kubernetes集群资源使用情况

```bash
#查看node资源使用情况
[root@km1-81 ~]# kubectl top node
NAME          CPU(cores)   CPU%   MEMORY(bytes)   MEMORY%   
10.122.6.70   448m         5%     7083Mi          15%       
10.122.6.74   1088m        14%    15664Mi         50%       
10.122.6.75   2919m        38%    20649Mi         66%       
10.122.6.85   1233m        16%    12107Mi         39%       
10.122.6.87   709m         9%     20155Mi         65%       
10.122.6.88   1257m        16%    20271Mi         65%       
10.122.6.93   942m         12%    19992Mi         64%  
#查看pod资源使用情况
[root@km1-81 ~]# kubectl top pod
NAME                                            CPU(cores)   MEMORY(bytes)              
release-name-milvus-admin-6cdfb569bc-lxh4g      1m           10Mi            
release-name-milvus-mishards-78c748ff65-q69sh   4m           129Mi           
release-name-milvus-readonly-fbf86b7c7-w96hb    1m           220Mi           
release-name-milvus-writable-7cccc8f9d4-5w6hl   3m           256Mi           
release-name-mysql-7b5fdd4b5b-zhxnt             11m          206Mi
```

## 4.4 kubernetes-dashboard

官方网站：https://github.com/kubernetes/dashboard

kubernetes官方的web控制端工具，图形化工具。

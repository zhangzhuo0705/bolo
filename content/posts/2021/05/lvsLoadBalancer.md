---
title: "LVS调度器"
date: 2021-05-17T16:36:29+08:00
draft: false
description: "以 LVS 的工作原理与集群架构为主线，演示四层负载均衡的部署和调度。"
cover: "https://b3logfile.com/bing/20200621.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["应用服务"]
tags: ["LVS"]
toc: true
---
# 一、Linux Virtual Server简介

## 1.1 LVS介绍

LVS：Linux Virtual Server，负载调度器，内核集成，章文嵩（花名 正明）, 阿里的四层SLB(ServerLoad Balance)是基于LVS+keepalived实现

LVS是全球最流行的四层负载均衡开源软件，由章文嵩博士（当前阿里云产品技术负责人）在1998年5月创立，可以实现LINUX平台下的负载均衡。

LVS 官网：[http://www.linuxvirtualserver.org/](http://www.linuxvirtualserver.org/)

阿里SLB和LVS：

* [https://yq.aliyun.com/articles/1803](https://yq.aliyun.com/articles/1803)
* [https://github.com/alibaba/LVS](https://github.com/alibaba/LVS)

## 1.2 LVS工作原理

VS根据请求报文的目标IP和目标协议及端口将其调度转发至某RS，根据调度算法来挑选RS。LVS是内核级功能，工作在INPUT链的位置，将发往INPUT的流量进行“处理”

范例：查看内核支持LVS

```bash
[20:27:28 root@centos8 ~]#grep -i ipvs /boot/config-4.18.0-193.el8.x86_64
CONFIG_NETFILTER_XT_MATCH_IPVS=m
# IPVS transport protocol load balancing support
# IPVS scheduler
# IPVS SH scheduler
# IPVS MH scheduler
# IPVS application helper
```

## 1.3 LVS集群体系架构

![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-5903b4cc.png)

## 1.4 LVS 功能及组织架构

负载均衡的应用场景为高访问量的业务，提高应用程序的可用性和可靠性。

### 1.4.1 应用于高访问量的业务

如果您的应用访问量很高，可以通过配置监听规则将流量分发到不同的云服务器 ECS（ElasticCompute Service 弹性计算服务）实例上。此外，可以使用会话保持功能将同一客户端的请求转发到同一台后端ECS

### 1.4.2 扩展应用程序

可以根据业务发展的需要，随时添加和移除ECS实例来扩展应用系统的服务能力，适用于各种Web服务器和App服务器。

### 1.4.3 消除单点故障

可以在负载均衡实例下添加多台ECS实例。当其中一部分ECS实例发生故障后，负载均衡会自动屏蔽故障的ECS实例，将请求分发给正常运行的ECS实例，保证应用系统仍能正常工作

## 1.5 LVS集群类型中的术语

VS：Virtual Server，Director Server(DS), Dispatcher(调度器)，Load Balancer

RS：Real Server(lvs), upstream server(nginx), backend server(haproxy)

CIP：Client IP

VIP：Virtual serve IP VS外网的IP

DIP：Director IP VS内网的IP

RIP：Real server IP

**访问流程：CIP <--> VIP == DIP <--> RIP**

![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-c68367fa.png)

# 二、LVS 工作模式和相关命令

## 2.1 LVS集群的工作模式

lvs-nat：修改请求报文的目标IP,多目标IP的DNAT

lvs-dr：操纵封装新的MAC地址（默认的工作模式）

lvs-tun：在原请求IP报文之外新加一个IP首部

lvs-fullnat：修改请求报文的源和目标IP

### 2.1.1 LVS的NAT模式

![未命名文件.png](https://b3logfile.com/file/2021/03/未命名文件-e05ba2db.png)

vs-nat：本质是多目标IP的DNAT，通过将请求报文中的目标地址和目标端口修改为某挑出的RS的RIP和PORT实现转发

（1）RIP和DIP应在同一个IP网络，且应使用私网地址；**RS的网关要指向DIP**

**（2）请求报文和响应报文都必须经由Director转发，Director易于成为系统瓶颈**

**（3）支持端口映射，可修改请求报文的目标PORT**

（4）VS必须是Linux系统，RS可以是任意OS系统

![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-df94e47f.png)

### 2.1.2 LVS的DR模式

LVS-DR：Direct Routing，直接路由，LVS默认模式,应用最广泛,通过为请求报文重新封装一个MAC首部进行转发，源MAC是DIP所在的接口的MAC，目标MAC是某挑选出的RS的RIP所在接口的MAC地址；源IP/PORT，以及目标IP/PORT均保持不变
![未命名文件1.png](https://b3logfile.com/file/2021/03/未命名文件_1-54e8b4dc.png)

**DR模式的特点：**

* **Director和各RS都配置有VIP**
* 确保前端路由器将目标IP为VIP的请求报文发往Director
  
  * 在前端网关做静态绑定VIP和Director的MAC地址
  * **在RS上修改内核参数以限制arp通告及应答级别**
* RS的RIP可以使用私网地址，也可以是公网地址；RIP与DIP在同一IP网络；**RIP的网关不能指向DIP，以确保响应报文不会经由Director**
* **RS和Director要在同一个物理网络**
* **请求报文要经由Director，但响应报文不经由Director，而由RS直接发往Client**
* **不支持端口映射（端口不能修改）**
* 无需开启 ip_forward
* RS可使用大多数OS系统
  ![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-5d861d57.png)

### 2.1.3 LVS的TUN模式

转发方式：不修改请求报文的IP首部（源IP为CIP，目标IP为VIP），而在原IP报文之外再封装一个IP首部（源IP是DIP，目标IP是RIP），将报文发往挑选出的目标RS；RS直接响应给客户端（源IP是VIP，目标IP是CIP）
![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-46cbf473.png)

**TUN模式特点：**

1. RIP和DIP可以不处于同一物理网络中，RS的网关一般不能指向DIP,且RIP可以和公网通信。也就是说集群节点可以跨互联网实现。DIP, VIP, RIP可以是公网地址
2. RealServer的tun接口上需要配置VIP地址，以便接收director转发过来的数据包，以及作为响应的报源IP
3. Director转发给RealServer时需要借助隧道，隧道外层的IP头部的源IP是DIP，目标IP是RIP，而RealServer响应给客户端的IP头部是根据隧道内层的IP头分析得到的，源IP是VIP，目标IP是CIP
4. 请求报文要经由Director，但响应不经由Director,响应由RealServer自己完成
5. 不支持端口映射
6. RS的OS须支持隧道功能

应用场景:

```bash
一般来说，TUN模式常会用来负载调度缓存服务器组，这些缓存服务器一般放置在不同的网络环境，可以就近折返给客户端。在请求对象不在Cache服务器本地命中的情况下，Cache服务器要向源服务器发送请求，将结果取回，最后将结果返回给用户。
LAN环境一般多采用DR模式，WAN环境虽然可以用TUN模式，但是一般在WAN环境下，请求转发更多的被haproxy/nginx/DNS等实现。因此，TUN模式实际应用的很少,跨机房的应用一般专线光纤连接或DNS调度
```

### 2.1.4 LVS的FULLNAT模式

![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-fc1f4ea5.png)

通过同时修改请求报文的源IP地址和目标IP地址进行转发

CIP --> DIP

VIP --> RIP

**fullnat模式特点：**

* VIP是公网地址，RIP和DIP是私网地址，且通常不在同一IP网络；因此，RIP的网关一般不会指向DIP
* RS收到的请求报文源地址是DIP，因此，只需响应给DIP；但Director还要将其发往Client
* 请求和响应报文都经由Director
* 相对NAT模式，可以更好的实现LVS-RealServer间跨VLAN通讯
* 支持端口映射

**注意：此类型kernel默认不支持**

### 2.1.5 LVS工作模式总结和比较

![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-a35593b2.png)

**lvs-nat与lvs-fullnat：**

* 请求和响应报文都经由Director
* lvs-nat：RIP的网关要指向DIP
* lvs-fullnat：RIP和DIP未必在同一IP网络，但要能通信

**lvs-dr与lvs-tun：**

* 请求报文要经由Director，但响应报文由RS直接发往Client
* lvs-dr：通过封装新的MAC首部实现，通过MAC网络转发
* lvs-tun：通过在原IP报文外封装新IP头实现转发，支持远距离通信

## 2.2 LVS 调试算法

ipvs scheduler：根据其调度时是否考虑各RS当前的负载状态

分为两种：静态方法和动态方法

### 2.2.1 静态方法

仅根据算法本身进行调度

1. RR：roundrobin，轮询,较常用
2. WRR：Weighted RR，加权轮询,较常用
3. SH：Source Hashing，实现session sticky，源IP地址hash；将来自于同一个IP地址的请求始终发往第一次挑中的RS，从而实现会话绑定
4. DH：Destination Hashing；目标地址哈希，第一次轮询调度至RS，后续将发往同一个目标地址的请求始终转发至第一次挑中的RS，典型使用场景是正向代理缓存场景中的负载均衡,如: Web缓存

### 2.2.2 动态方法

主要根据每RS当前的负载状态及调度算法进行调度Overhead=value 较小的RS将被调度

**activeconns活动的连接，inactiveconns非活动连接，weight权重**

1. LC：least connections 适用于长连接应用

```bash
Overhead=activeconns*256+inactiveconns
```

2. **WLC：Weighted LC，默认调度方法,较常用**

```bash
Overhead=(activeconns*256+inactiveconns)/weight
```

3. SED：Shortest Expection Delay，初始连接高权重优先,只检查活动连接,而不考虑非活动连接

```bash
Overhead=(activeconns+1)*256/weight
```

4. NQ：Never Queue，第一轮均匀分配，后续SED
5. LBLC：Locality-Based LC，动态的DH算法，使用场景：根据负载状态实现正向代理,实现WebCache等
6. LBLCR：LBLC with Replication，带复制功能的LBLC，解决LBLC负载不均衡问题，从负载重的复制到负载轻的RS,,实现Web Cache等

### 2.2.3 内核版本 4.15 版本后新增调度算法：FO和OVF

FO（Weighted Fail Over）调度算法,在此FO算法中，遍历虚拟服务所关联的真实服务器链表，找到还未过载（未设置IP_VS_DEST_F_OVERLOAD标志）的且权重最高的真实服务器，进行调度,属于静态算法

OVF（Overflow-connection）调度算法，基于真实服务器的活动连接数量和权重值实现。将新连接调度到权重值最高的真实服务器，直到其活动连接数量超过权重值，之后调度到下一个权重值最高的真实服务器,在此OVF算法中，遍历虚拟服务相关联的真实服务器链表，找到权重值最高的可用真实服务器。,属于动态算法

**一个可用的真实服务器需要同时满足以下条件：**

* 未过载（未设置IP_VS_DEST_F_OVERLOAD标志）
* 真实服务器当前的活动连接数量小于其权重值
* 其权重值不为零

## 2.3 LVS 相关软件

### 2.3.1 程序包：ipvsadm

Unit File: ipvsadm.service

主程序：/usr/sbin/ipvsadm

规则保存工具：/usr/sbin/ipvsadm-save

规则重载工具：/usr/sbin/ipvsadm-restore

配置文件：/etc/sysconfig/ipvsadm-config

ipvs调度规则文件：/etc/sysconfig/ipvsadm

### 2.3.2 ipvsadm 命令

**ipvsadm核心功能：**

* 集群服务管理：增、删、改
* 集群服务的RS管理：增、删、改
* 查看

**ipvsadm 工具用法：**

```bash
#管理集群服务
ipvsadm -A|E -t|u|f service-address [-s scheduler] [-p [timeout]] [-M netmask] [--pe persistence_engine] [-b sched-flags]
ipvsadm -D -t|u|f service-address #删除
ipvsadm –C  #清空
ipvsadm –R  #重载,相当于ipvsadm-restore
ipvsadm -S [-n] #保存,相当于ipvsadm-save

#管理集群中的RS
ipvsadm -a|e -t|u|f service-address -r server-address [-g|i|m] [-w weight]
ipvsadm -d -t|u|f service-address -r server-address
ipvsadm -L|l [options]
ipvsadm -Z [-t|u|f service-address]
```

#### 2.3.2.1 管理集群服务：增、改、删

**增、修改：**

```bash
ipvsadm -A|E -t|u|f service-address [-s scheduler] [-p [timeout]]
```

说明

```bash
service-address：
-t|u|f：
-t: TCP协议的端口，VIP:TCP_PORT 如: -t 10.0.0.100:80
-u: UDP协议的端口，VIP:UDP_PORT
-f：firewall MARK，标记，一个数字
[-s scheduler]：指定集群的调度算法，默认为wlc
```

范例:

```bash
ipvsadm -A -t 10.0.0.100:80 -s wrr
```

**删除：**

```bash
ipvsadm -D -t|u|f service-address
```

#### 2.3.2.2 管理集群上的RS：增、改、删

**增、改：**

```bash
ipvsadm -a|e -t|u|f service-address -r server-address [-g|i|m] [-w weight]
```

**删：**

```bash
ipvsadm -d -t|u|f service-address -r server-address
server-address：
rip[:port] 如省略port，不作端口映射
选项：
lvs类型：
-g: gateway, dr类型，默认
-i: ipip, tun类型
-m: masquerade, nat类型
-w weight：权重
```

范例:

```bash
ipvsadm -a -t 10.0.0.100:80 -r 10.0.0.8:8080 -m -w 3
```

#### 2.3.2.3 其他操作

**清空定义的所有内容：**

```bash
ipvsadm -C
```

**清空计数器：**

```bash
ipvsadm -Z [-t|u|f service-address]
```

**查看：**

```bash
ipvsadm -L|l [options]
--numeric, -n：以数字形式输出地址和端口号
--exact：扩展信息，精确值
--connection，-c：当前IPVS连接输出
--stats：统计信息
--rate ：输出速率信息
```

**ipvs规则：**

```bash
/proc/net/ip_vs
```

**ipvs连接：**

```bash
/proc/net/ip_vs_conn
```

**保存：建议保存至/etc/sysconfig/ipvsadm**

```bash
ipvsadm-save > /PATH/TO/IPVSADM_FILE
ipvsadm -S > /PATH/TO/IPVSADM_FILE
systemctl stop ipvsadm.service  #会自动保存规则至/etc/sysconfig/ipvsadm
```

**重载：**

```bash
ipvsadm-restore < /PATH/FROM/IPVSADM_FILE
systemctl  start ipvsadm.service  #会自动加载/etc/sysconfig/ipvsadm中规则
```

## 2.4 防火墙标记

FWM：FireWall Mark

MARK target 可用于给特定的报文打标记

--set-mark value

其中：value 可为0xffff格式，表示十六进制数字

借助于防火墙标记来分类报文，而后基于标记定义集群服务；可将多个不同的应用使用同一个集群服务进行调度

实现方法：

**在Director主机打标记：**

```bash
iptables -t mangle -A PREROUTING -d $vip -p $proto -m multiport --dports
$port1,$port2,… -j MARK --set-mark NUMBER
```

**在Director主机基于标记定义集群服务：**

```bash
ipvsadm -A -f NUMBER [options]
```

范例:

```bash
[15:54:04 root@lvs ~]#iptables -t mangle -A PREROUTING -d 192.168.10.100 -p tcp -m multiport --dports 80,443 -j MARK --set-mark 10
[15:54:24 root@lvs ~]#ipvsadm -C
[15:54:38 root@lvs ~]#ipvsadm -A -f 10 -s rr
[15:54:49 root@lvs ~]#ipvsadm -a -f 10 -r 192.168.10.71 -g
[15:55:04 root@lvs ~]#ipvsadm -a -f 10 -r 192.168.10.72 -g
[15:55:07 root@lvs ~]#ipvsadm -Ln
IP Virtual Server version 1.2.1 (size=4096)
Prot LocalAddress:Port Scheduler Flags
-> RemoteAddress:Port           Forward Weight ActiveConn InActConn
FWM  10 rr
-> 192.168.10.71:0              Route   1      0          0
-> 192.168.10.72:0              Route   1      0          0
```

## 2.5 LVS 持久连接

session 绑定：对共享同一组RS的多个集群服务，需要统一进行绑定，lvs sh算法无法实现持久连接（ lvs persistence ）模板：实现无论使用任何调度算法，在一段时间内（默认360s ），能够实现将来自同一个地址的请求始终发往同一个RS

```bash
ipvsadm -A|E -t|u|f service-address [-s scheduler] [-p [timeout]]
```

**持久连接实现方式：**

* 每端口持久（PPC）：每个端口定义为一个集群服务，每集群服务单独调度
* 每防火墙标记持久（PFWMC）：基于防火墙标记定义集群服务；可实现将多个端口上的应用统一调度，即所谓的port Affinity
* 每客户端持久（PCC）：基于0端口（表示所有服务）定义集群服务，即将客户端对所有应用的请求都调度至后端主机，必须定义为持久模式

**范例：**

```bash
[15:55:13 root@lvs ~]#ipvsadm -E -f 10 -p
[15:58:30 root@lvs ~]#ipvsadm -Ln
IP Virtual Server version 1.2.1 (size=4096)
Prot LocalAddress:Port Scheduler Flags
-> RemoteAddress:Port           Forward Weight ActiveConn InActConn
FWM  10 wlc persistent 360
-> 192.168.10.71:0              Route   1      0          0
-> 192.168.10.72:0              Route   1      0          0

[15:58:34 root@lvs ~]#ipvsadm -E -f 10 -p 3600
[15:59:42 root@lvs ~]#ipvsadm -Ln
IP Virtual Server version 1.2.1 (size=4096)
Prot LocalAddress:Port Scheduler Flags
-> RemoteAddress:Port           Forward Weight ActiveConn InActConn
FWM  10 wlc persistent 3600
-> 192.168.10.71:0              Route   1      0          6
-> 192.168.10.72:0              Route   1      0          6
[16:00:21 root@lvs ~]#cat /proc/net/ip_vs_conn
Pro FromIP   FPrt ToIP     TPrt DestIP   DPrt State       Expires PEName PEData
IP  C0A80A54 0000 0000000A 0000 C0A80A47 0000 NONE            277
TCP C0A80A54 962E C0A80A64 0050 C0A80A47 0050 FIN_WAIT         37
TCP C0A80A54 962A C0A80A64 0050 C0A80A47 0050 FIN_WAIT         37
TCP C0A80A54 9624 C0A80A64 0050 C0A80A47 0050 FIN_WAIT         35
TCP C0A80A54 962C C0A80A64 0050 C0A80A47 0050 FIN_WAIT         37
TCP C0A81E64 8EC6 C0A80A64 0050 C0A80A48 0050 FIN_WAIT         27
TCP C0A81E64 8EC2 C0A80A64 0050 C0A80A48 0050 FIN_WAIT         26
TCP C0A80A54 9626 C0A80A64 0050 C0A80A47 0050 FIN_WAIT         36
TCP C0A81E64 8EC0 C0A80A64 0050 C0A80A48 0050 FIN_WAIT         25
TCP C0A81E64 8EBE C0A80A64 0050 C0A80A48 0050 FIN_WAIT         25
TCP C0A81E64 8EC4 C0A80A64 0050 C0A80A48 0050 FIN_WAIT         26
TCP C0A81E64 8EBC C0A80A64 0050 C0A80A48 0050 FIN_WAIT         24
IP  C0A81E64 0000 0000000A 0000 C0A80A48 0000 NONE            267
TCP C0A80A54 9628 C0A80A64 0050 C0A80A47 0050 FIN_WAIT         36
[16:00:22 root@lvs ~]#ipvsadm -Lnc
IPVS connection entries
pro expire state       source             virtual            destination
IP  04:29  NONE        192.168.10.84:0    0.0.0.10:0         192.168.10.71:0
TCP 00:29  FIN_WAIT    192.168.10.84:38446 192.168.10.100:80  192.168.10.71:80
TCP 00:28  FIN_WAIT    192.168.10.84:38442 192.168.10.100:80  192.168.10.71:80
TCP 00:26  FIN_WAIT    192.168.10.84:38436 192.168.10.100:80  192.168.10.71:80
TCP 00:29  FIN_WAIT    192.168.10.84:38444 192.168.10.100:80  192.168.10.71:80
TCP 00:19  FIN_WAIT    192.168.30.100:36550 192.168.10.100:80  192.168.10.72:80
TCP 00:17  FIN_WAIT    192.168.30.100:36546 192.168.10.100:80  192.168.10.72:80
TCP 00:28  FIN_WAIT    192.168.10.84:38438 192.168.10.100:80  192.168.10.71:80
TCP 00:17  FIN_WAIT    192.168.30.100:36544 192.168.10.100:80  192.168.10.72:80
TCP 00:17  FIN_WAIT    192.168.30.100:36542 192.168.10.100:80  192.168.10.72:80
TCP 00:18  FIN_WAIT    192.168.30.100:36548 192.168.10.100:80  192.168.10.72:80
TCP 00:16  FIN_WAIT    192.168.30.100:36540 192.168.10.100:80  192.168.10.72:80
IP  04:19  NONE        192.168.30.100:0   0.0.0.10:0         192.168.10.72:0
TCP 00:28  FIN_WAIT    192.168.10.84:38440 192.168.10.100:80  192.168.10.71:80
```

# 三、LVS 高可用性实现

**LVS 不可用时：**

Director不可用，整个系统将不可用；SPoF Single Point of Failure

解决方案：高可用，keepalived、heartbeat/corosync

**RS 不可用时：**

某RS不可用时，Director依然会调度请求至此RS

解决方案： 由Director对各RS健康状态进行检查，失败时禁用，成功时启用

**常用解决方案：**

* keepalived
* heartbeat/corosync
* ldirectord

**检测方式：**

* 网络层检测，icmp
* 传输层检测，端口探测
* 应用层检测，请求某关键资源
* RS全不用时：backup server, sorry server

# 四、LVS实战案例

## 4.1 LVS-NAT模式案例

![未命名文件2.png](https://b3logfile.com/file/2021/03/未命名文件_2-faf8bc58.png)

```bash
共四台主机
一台： internet client：172.16.10.100/24   GW:无 仅主机
一台：lvs
eth1 仅主机 172.16.10.81/24
eth0 NAT 192.168.10.81/24
两台RS：
RS1: 192.168.10.71/24 GW：192.168.10.81 NAT
RS2: 192.168.10.71/24 GW：192.168.10.81 NAT
```

**配置过程：**

```bash
#网络环境自行配置
[11:41:42 root@sr1 ~]#curl 127.0.0.1
sr1.zhanzghuo.org
[11:41:45 root@sr2 ~]#curl 127.0.0.1
sr2.zhanzghuo.org

[11:42:48 root@lvs ~]#cat /etc/sysctl.conf
net.ipv4.ip_forward=1
[11:45:10 root@lvs ~]#sysctl -p
#添加集群调度算法加权轮询wrr
[11:44:36 root@lvs ~]#ipvsadm -A -t 172.16.10.81:80 -s wrr
#添加RS工作方式-m,nat模式，-w可以指定权重
[11:44:41 root@lvs ~]#ipvsadm -a -t 172.16.10.81:80 -r 192.168.10.71:80 -m
[11:45:07 root@lvs ~]#ipvsadm -a -t 172.16.10.81:80 -r 192.168.10.72:80 -m

[11:45:10 root@lvs ~]#ipvsadm -Ln
IP Virtual Server version 1.2.1 (size=4096)
Prot LocalAddress:Port Scheduler Flags
-> RemoteAddress:Port           Forward Weight ActiveConn InActConn
TCP  172.16.10.81:80 wrr
-> 192.168.10.71:80             Masq    1      0          0
-> 192.168.10.72:80             Masq    1      0          0

[11:43:17 root@client ~]#while :;do curl 172.16.10.81;sleep 0.5;done
sr2.zhanzghuo.org
sr1.zhanzghuo.org
sr2.zhanzghuo.org
sr1.zhanzghuo.org
sr2.zhanzghuo.org
sr1.zhanzghuo.org
sr2.zhanzghuo.org
[11:47:27 root@lvs ~]#ipvsadm -Ln --stats
IP Virtual Server version 1.2.1 (size=4096)
Prot LocalAddress:Port               Conns   InPkts  OutPkts  InBytes OutBytes
-> RemoteAddress:Port
TCP  172.16.10.81:80                    25      150      100     9900    11875
-> 192.168.10.71:80                   12       72       48     4752     5700
-> 192.168.10.72:80                   13       78       52     5148     6175

[11:47:27 root@lvs ~]#cat /proc/net/ip_vs
IP Virtual Server version 1.2.1 (size=4096)
Prot LocalAddress:Port Scheduler Flags
-> RemoteAddress:Port Forward Weight ActiveConn InActConn
TCP  AC100A51:0050 wrr
-> C0A80A48:0050      Masq    1      0          33
-> C0A80A47:0050      Masq    1      0          33
[11:47:47 root@lvs ~]#ipvsadm -Lnc
IPVS connection entries
pro expire state       source             virtual            destination
TCP 01:32  TIME_WAIT   172.16.10.100:35056 172.16.10.81:80    192.168.10.71:80
TCP 01:23  TIME_WAIT   172.16.10.100:35020 172.16.10.81:80    192.168.10.71:80
TCP 01:59  TIME_WAIT   172.16.10.100:35160 172.16.10.81:80    192.168.10.71:80

#保存规则
[11:50:01 root@lvs ~]#ipvsadm-save >/etc/sysconfig/ipvsadm
[11:50:17 root@lvs ~]#systemctl enable --now ipvsadm.service

#问题:LVS 打开监听VIP相关的端口吗?
[11:50:22 root@lvs ~]#ss -ntl
State     Recv-Q     Send-Q         Local Address:Port         Peer Address:Port
LISTEN    0          128                  0.0.0.0:111               0.0.0.0:*
LISTEN    0          128                  0.0.0.0:22                0.0.0.0:*
LISTEN    0          128                     [::]:111                  [::]:*
LISTEN    0          128                     [::]:22                   [::]:*
```

## 4.2 LVS-DR模式单网段案例

DR模型中各主机上均需要配置VIP，解决地址冲突的方式有三种：

(1) 在前端网关做静态绑定

(2) 在各RS使用arptables

(3) 在各RS修改内核参数，来限制arp响应和通告的级别

**限制响应级别：arp_ignore**

* 0：默认值，表示可使用本地任意接口上配置的任意地址进行响应
* 1：仅在请求的目标IP配置在本地主机的接收到请求报文的接口上时，才给予响应

**限制通告级别：arp_announce**

* 0：默认值，把本机所有接口的所有信息向每个接口的网络进行通告
* 1：尽量避免将接口信息向非直接连接网络进行通告
* 2：必须避免将接口信息向非本网络进行通告

**配置要点**

* 1. Director 服务器采用双IP桥接网络，一个是VIP，一个DIP
* 2. Web服务器采用和DIP相同的网段和Director连接
* 3. 每个Web服务器配置VIP
* 4. 每个web服务器可以出外网

范例:

![未命名文件.jpg](https://b3logfile.com/file/2021/03/未命名文件-e4e129e3.jpg)

小知识注意：DR工作模式中LVS并不承担数据回复，所以LVS的网关并没有任何实际作用，但是如果不进行配置，客户端数据包到达LVS时LVS并不会进行转发数据包因为网络环境中当前主机跟其他网段的主机进行通信是通过是否有网关来决定是否转发数据，如果没有网关主机会认为自己到达不了从而直接把数据丢弃，所以这里的网关必须要配置，但配置的地址可以随便填写

```bash
环境：五台主机
一台：客户端 eth0:仅主机 192.168.30.100/24 GW:192.168.30.10

一台：ROUTER
eth0 :NAT  192.168.10.84/24
eth1: 仅主机 192.168.30.10/24
启用 IP_FORWARD

一台：LVS
eth0:NAT:DIP:192.168.10.81/24 GW:192.168.10.200
两台RS：
RS1：eth0:NAT:192.168.10.71/24   GW：192.168.10.84
RS2：eth0:NAT:192.168.10.72/24   GW：192.168.10.84
```

### 4.2.1 LVS的网络配置

```bash
#所有主机禁用iptables和SELinux
[15:02:01 root@sr1 ~]#route -n
Kernel IP routing table
Destination     Gateway         Genmask         Flags Metric Ref    Use Iface
0.0.0.0         192.168.10.84   0.0.0.0         UG    100    0        0 eth0
192.168.10.0    0.0.0.0         255.255.255.0   U     100    0        0 eth0

[15:04:09 root@sr2 ~]#route -n
Kernel IP routing table
Destination     Gateway         Genmask         Flags Metric Ref    Use Iface
0.0.0.0         192.168.10.84   0.0.0.0         UG    100    0        0 eth0
192.168.10.0    0.0.0.0         255.255.255.0   U     100    0        0 eth0

[15:06:18 root@lvs ~]#route -n
Kernel IP routing table
Destination     Gateway         Genmask         Flags Metric Ref    Use Iface
0.0.0.0         192.168.10.200  0.0.0.0         UG    100    0        0 eth0
192.168.10.0    0.0.0.0         255.255.255.0   U     100    0        0 eth0

[15:18:55 root@route ~]#route -n
Kernel IP routing table
Destination     Gateway         Genmask         Flags Metric Ref    Use Iface
192.168.10.0    0.0.0.0         255.255.255.0   U     102    0        0 eth0
192.168.30.0    0.0.0.0         255.255.255.0   U     101    0        0 eth1
[15:18:55 root@route ~]#echo 'net.ipv4.ip_forward=1' >> /etc/sysctl.conf
[15:18:55 root@route ~]#sysctl -p




[15:18:49 root@client ~]#route -n
Kernel IP routing table
Destination     Gateway         Genmask         Flags Metric Ref    Use Iface
0.0.0.0         192.168.30.10   0.0.0.0         UG    100    0        0 eth0
192.168.30.0    0.0.0.0         255.255.255.0   U     100    0        0 eth0
```

### 4.2.2 后端RS的IPVS配置

```bash
#RS1的IPVS配置
#禁止环回地址进行arp广播
[15:04:15 root@sr1 ~]#echo 1 >/proc/sys/net/ipv4/conf/all/arp_ignore 
[15:21:27 root@sr1 ~]#echo 2 >/proc/sys/net/ipv4/conf/all/arp_announce 
[15:21:39 root@sr1 ~]#echo 1 >/proc/sys/net/ipv4/conf/lo/arp_ignore 
[15:22:01 root@sr1 ~]#echo 2 >/proc/sys/net/ipv4/conf/lo/arp_announce 
[15:24:54 root@sr1 ~]#ifconfig lo:1 192.168.10.100/32
[15:25:02 root@sr1 ~]#ip a
1: lo:  mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet 192.168.10.100/0 scope global lo:1
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host 
       valid_lft forever preferred_lft forever
2: eth0:  mtu 1500 qdisc pfifo_fast state UP group default qlen 1000
    link/ether 00:0c:29:c1:8a:39 brd ff:ff:ff:ff:ff:ff
    inet 192.168.10.71/24 brd 192.168.10.255 scope global noprefixroute eth0
       valid_lft forever preferred_lft forever
    inet6 fe80::6387:7c93:e6b8:685/64 scope link noprefixroute 
       valid_lft forever preferred_lft forever
    inet6 fe80::1ea4:9839:df4e:510d/64 scope link tentative noprefixroute dadfailed 
       valid_lft forever preferred_lft forever
#RS2的IPVS配置
[15:04:22 root@sr2 ~]#echo 1 > /proc/sys/net/ipv4/conf/all/arp_ignore 
[15:26:15 root@sr2 ~]#echo 2 > /proc/sys/net/ipv4/conf/all/arp_announce 
[15:26:25 root@sr2 ~]#echo 1 > /proc/sys/net/ipv4/conf/lo/arp_ignore 
[15:26:38 root@sr2 ~]#echo 2 > /proc/sys/net/ipv4/conf/lo/arp_announce
[15:26:55 root@sr2 ~]#ifconfig lo:1 192.168.10.100/32
[15:27:23 root@sr2 ~]#ip a
1: lo:  mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet 192.168.10.100/0 scope global lo:1
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host 
       valid_lft forever preferred_lft forever
2: eth0:  mtu 1500 qdisc pfifo_fast state UP group default qlen 1000
    link/ether 00:0c:29:57:b1:85 brd ff:ff:ff:ff:ff:ff
    inet 192.168.10.72/24 brd 192.168.10.255 scope global noprefixroute eth0
       valid_lft forever preferred_lft forever
    inet6 fe80::6387:7c93:e6b8:685/64 scope link tentative noprefixroute dadfailed 
       valid_lft forever preferred_lft forever
    inet6 fe80::1ea4:9839:df4e:510d/64 scope link noprefixroute 
       valid_lft forever preferred_lft forever
```

### 4.2.3 LVS主机的配置

```bash
#在LVS上添加VIP
[15:30:30 root@lvs ~]#ifconfig lo:1 192.168.10.100/32

[15:28:06 root@lvs ~]#dnf -y install ipvsadm
#实现LVS 规则
[15:28:06 root@lvs ~]#ipvsadm -A -t 192.168.10.100:80 -s rr
[15:29:03 root@lvs ~]#ipvsadm -a -t 192.168.10.100:80 -r 192.168.10.71:80 -g
[15:29:18 root@lvs ~]#ipvsadm -a -t 192.168.10.100:80 -r 192.168.10.72:80 -g
[15:29:21 root@lvs ~]#ipvsadm -Ln
IP Virtual Server version 1.2.1 (size=4096)
Prot LocalAddress:Port Scheduler Flags
  -> RemoteAddress:Port           Forward Weight ActiveConn InActConn
TCP  192.168.10.100:80 rr
  -> 192.168.10.71:80             Route   1      0          0         
  -> 192.168.10.72:80             Route   1      0          0
```

### 4.2.4 测试访问

```bash
[15:31:05 root@client ~]#curl 192.168.10.100
sr1.zhanzghuo.org
[15:31:08 root@client ~]#curl 192.168.10.100
sr2.zhanzghuo.org

[15:25:21 root@sr1 ~]#tail -f /var/log/httpd/access_log 
192.168.30.100 - - [13/Mar/2021:15:30:58 +0800] "GET / HTTP/1.1" 200 18 "-" "curl/7.61.1"
```

## 4.3 LVS-DR模式多网段案例

![未命名文件1.jpg](https://b3logfile.com/file/2021/03/未命名文件_1-7a5cd950.jpg)

```bash
#internet主机的网络配置和4.2一样

#router的网络配置在4.2基础上添加172.16.10.84/24的地址
[17:43:25 root@route ~]#ifconfig eth0:1 172.16.10.84
[17:45:21 root@route ~]#hostname -I
192.168.10.84 172.16.10.84 192.168.30.10 
#LVS主机的网络配置和4.2一样
[17:46:28 root@lvs ~]#hostname -I
192.168.10.81
#RS主机的网络配置和4.2一样


[17:47:21 root@lvs ~]#ifconfig lo:1 172.16.10.81/32
[17:47:39 root@sr1 ~]#ifconfig lo:1 172.16.10.81/32
[17:47:35 root@sr2 ~]#ifconfig lo:1 172.16.10.81/32
[17:48:18 root@lvs ~]#ipvsadm -A -t 172.16.10.81:80 -s wrr
[17:50:18 root@lvs ~]#ipvsadm -a -t 172.16.10.81:80 -r 192.168.10.71:80 -g
[17:50:58 root@lvs ~]#ipvsadm -a -t 172.16.10.81:80 -r 192.168.10.72:80 -g
```

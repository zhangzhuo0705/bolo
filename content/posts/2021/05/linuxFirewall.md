---
title: "13-Linux防火墙"
date: 2021-05-17T11:51:45+08:00
lastmod: 2021-06-02T10:36:27+08:00
draft: false
description: "围绕 Netfilter 与 iptables 的工作机制，演示防火墙规则和 NAT 的配置。"
cover: "https://b3logfile.com/bing/20200311.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["Linux系统基础知识"]
tags: ["linux", "iptables", "NAT"]
toc: true
---
# 一、安全技术和防火墙

## 1.1 安全技术

* 入侵检测系统（Intrusion Detection Systems）：特点是不阻断任何网络访问，量化、定位来自内外网络的威胁情况，主要以提供报告和事后监督为主，提供有针对性的指导措施和安全决策依据。一般采用旁路部署方式
* 入侵防御系统（Intrusion Prevention System）：以透明模式工作，分析数据包的内容如：溢出攻击、拒绝服务攻击、木马、蠕虫、系统漏洞等进行准确的分析判断，在判定为攻击行为后立即予以阻断，主动而有效的保护网络的安全，一般采用在线部署方式
* 防火墙（ FireWall ）：隔离功能，工作在网络或主机边缘，对进出网络或主机的数据包基于一定的规则检查，并在匹配某规则时由规则定义的行为进行处理的一组功能的组件，基本上的实现都是默认情况下关闭所有的通过型访问，只开放允许访问的策略,会将希望外网访问的主机放在DMZ(demilitarized zone)网络中

```
防水墙
广泛意义上的防水墙：防水墙（Waterwall），与防火墙相对，是一种防止内部信息泄漏的安全产品。网络、外设接口、存储介质和打印机构成信息泄漏的全部途径。防水墙针对这四种泄密途径，在事前、事中、事后进行全面防护。其与防病毒产品、外部安全产品一起构成完整的网络安全体系。
```

![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-c2c83486.png)

## 1.2 防火墙的分类

**按保护范围划分：**

* 主机防火墙：服务范围为当前一台主机
* 网络防火墙：服务范围为防火墙一侧的局域网

**按实现方式划分:**

* 硬件防火墙：在专用硬件级别实现部分功能的防火墙；另一个部分功能基于软件实现，如：华为，天融信，启明星辰，绿盟，深信服, Checkpoint，NetScreen(Juniper2004年40亿美元收购)等
* 软件防火墙：运行于通用硬件平台之上的防火墙的应用软件，Windows 防火墙 ISA --> Forefront TMG

**按网络协议划分：**

* 网络层防火墙：OSI模型下四层，又称为包过滤防火墙
* 应用层防火墙/代理服务器：proxy 代理网关，OSI模型七层

**包过滤防火墙**

![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-d0f2d4db.png)

网络层对数据包进行选择，选择的依据是系统内设置的过滤逻辑，被称为访问控制列表（ACL），通过检查数据流中每个数据的源地址，目的地址，所用端口号和协议状态等因素，或他们的组合来确定是否允许该数据包通过

**优点：对用户来说透明，处理速度快且易于维护**

**缺点：无法检查应用层数据，如病毒等**

**应用层防火墙**
![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-4b6c4d7c.png)

应用层防火墙/代理服务型防火墙，也称为代理服务器（Proxy Server)

将所有跨越防火墙的网络通信链路分为两段

内外网用户的访问都是通过代理服务器上的“链接”来实现

**优点：在应用层对数据进行检查，比较安全**

**缺点：增加防火墙的负载**

提示：现实生产环境中所使用的防火墙一般都是二者结合体，即先检查网络数据，通过之后再送到应用层去检查

## 1.3 网络架构

![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-4ad043fd.png)

# 二、Linux 防火墙的基本认识

## 2.1 Netfilter

Linux防火墙是由Netfilter组件提供的，Netfilter工作在内核空间，集成在linux内核中Netfilter 是Linux 2.4.x之后新一代的Linux防火墙机制，是linux内核的一个子系统。Netfilter采用模块化设计，具有良好的可扩充性，提供扩展各种网络服务的结构化底层框架。Netfilter与IP协议栈是无缝契合，并允许对数据报进行过滤、地址转换、处理等操作

Netfilter官网文档：[https://netfilter.org/documentation/](https://netfilter.org/documentation/)

```bash
[17:28:01 root@centos8 ~]#grep -m 10 NETFILTER /boot/config-4.18.0-193.el8.x86_64
CONFIG_NETFILTER=y
CONFIG_NETFILTER_ADVANCED=y
CONFIG_BRIDGE_NETFILTER=m
CONFIG_NETFILTER_INGRESS=y
CONFIG_NETFILTER_NETLINK=m
CONFIG_NETFILTER_FAMILY_BRIDGE=y
CONFIG_NETFILTER_FAMILY_ARP=y
# CONFIG_NETFILTER_NETLINK_ACCT is not set
CONFIG_NETFILTER_NETLINK_QUEUE=m
CONFIG_NETFILTER_NETLINK_LOG=m
[17:35:40 root@centos7 ~]#grep -m 10 NETFILTER /boot/config-3.10.0-1127.el7.x86_64
CONFIG_NETFILTER=y
# CONFIG_NETFILTER_DEBUG is not set
CONFIG_NETFILTER_ADVANCED=y
CONFIG_BRIDGE_NETFILTER=m
CONFIG_NETFILTER_NETLINK=m
CONFIG_NETFILTER_NETLINK_ACCT=m
CONFIG_NETFILTER_NETLINK_QUEUE=m
CONFIG_NETFILTER_NETLINK_LOG=m
CONFIG_NETFILTER_NETLINK_QUEUE_CT=y
CONFIG_NETFILTER_SYNPROXY=m
各种Linux发行版本都有
```

## 2.2 防火墙工具介绍

### 2.2.1 iptables

由软件包iptables提供的命令行工具，工作在用户空间，用来编写规则，写好的规则被送往netfilter，告诉内核如何去处理信息包

```bash
[17:34:38 root@centos8 ~]#rpm -qi iptables
Name        : iptables
Version     : 1.8.4
Release     : 10.el8
Architecture: x86_64
Install Date: Thu 17 Dec 2020 05:01:47 PM CST
Group       : Unspecified
Size        : 1974473
License     : GPLv2 and Artistic 2.0 and ISC
Signature   : RSA/SHA256, Sun 26 Apr 2020 10:09:33 AM CST, Key ID 05b555b38483c65d
Source RPM  : iptables-1.8.4-10.el8.src.rpm
Build Date  : Fri 24 Apr 2020 09:51:59 PM CST
Build Host  : x86-01.mbox.centos.org
Relocations : (not relocatable)
Packager    : CentOS Buildsys
Vendor      : CentOS
URL         : http://www.netfilter.org/projects/iptables
Summary     : Tools for managing Linux kernel packet filtering capabilities
Description :
The iptables utility controls the network packet filtering code in the
Linux kernel. If you need to set up firewalls and/or IP masquerading,
you should either install nftables or this package.

Note: This package contains the nftables-based variants of iptables and
ip6tables, which are drop-in replacements of the legacy tools.
```

**范例：安装iptables的service包**

```bash
[17:36:01 root@centos7 ~]#yum install iptables-services.x86_64
[17:38:32 root@centos7 ~]#rpm -ql iptables-services
/etc/sysconfig/ip6tables
/etc/sysconfig/iptables
/usr/lib/systemd/system/ip6tables.service
/usr/lib/systemd/system/iptables.service
/usr/libexec/initscripts/legacy-actions/ip6tables
/usr/libexec/initscripts/legacy-actions/ip6tables/panic
/usr/libexec/initscripts/legacy-actions/ip6tables/save
/usr/libexec/initscripts/legacy-actions/iptables
/usr/libexec/initscripts/legacy-actions/iptables/panic
/usr/libexec/initscripts/legacy-actions/iptables/save
/usr/libexec/iptables
/usr/libexec/iptables/ip6tables.init
/usr/libexec/iptables/iptables.init
```

### 2.2.2 firewalld

从CentOS 7 版开始引入了新的前端管理工具

**软件包：**

* firewalld
* firewalld-config

**管理工具：**

* firewall-cmd 命令行工具
* firewall-config 图形工作

### 2.2.3 nftables（重点）

Netfilter在内核中选取五个位置放了五个hook(勾子) function(INPUT、OUTPUT、FORWARD、PREROUTING、POSTROUTING)，而这五个hook function向用户开放，用户可以通过一个命令工具（iptables）向其写入规则由信息过滤表（table）组成，包含控制IP包处理的规则集（rules），规则被分组放在链（chain）上
![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-1d76b896.png)

提示：从 Linux kernel 4.2 版以后，Netfilter 在prerouting 前加了一个 ingress 勾子函数。可以使用这个新的入口挂钩来过滤来自第2层的流量，这个新挂钩比预路由要早，基本上是 tc 命令（流量控制工具）的替代品

**三种报文流向**

* 流入本机：PREROUTING --> INPUT-->用户空间进程
* 流出本机：用户空间进程 -->OUTPUT--> POSTROUTING
* 转发：PREROUTING --> FORWARD --> POSTROUTING

## 2.3 iptables的组成

iptables由五个表table和五个链chain以及一些规则组成
![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-6c0e7470.png)

**链 chain：**

* 内置链：每个内置链对应于一个钩子函数
* 自定义链：用于对内置链进行扩展或补充，可实现更灵活的规则组织管理机制；只有Hook钩子调用自定义链时，才生效

**五个内置链chain:**

```bash
INPUT,OUTPUT,FORWARD,PREROUTING,POSTROUTING
```

**五个表table：filter、nat、mangle、raw、security**

* filter：过滤规则表，根据预定义的规则过滤符合条件的数据包,默认表
* nat：network address translation 地址转换规则表
* mangle：修改数据标记位规则表
* raw：关闭启用的连接跟踪机制，加快封包穿越防火墙速度
* security：用于强制访问控制（MAC）网络规则，由Linux安全模块（如SELinux）实现

**优先级由高到低的顺序为：**

```bash
security -->raw-->mangle-->nat-->filter
```

**表和链对应关系**

![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-8a528d50.png)

**数据包过滤匹配流程**

![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-4b7a6d00.png)

**内核中数据包的传输过程**

* **当一个数据包进入网卡时，数据包首先进入PREROUTING链，内核根据数据包目的IP判断是否需要转送出去**
* **如果数据包是进入本机的，数据包就会沿着图向下移动，到达INPUT链。数据包到达INPUT链后，任何进程都会收到它。本机上运行的程序可以发送数据包，这些数据包经过OUTPUT链，然后到达POSTROUTING链输出**
* **如果数据包是要转发出去的，且内核允许转发，数据包就会向右移动，经过FORWARD链，然后到达POSTROUTING链输出**

## 2.4 netfilter 完整流程

![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-3ec92d8e.png)

# 三、iptables

## 3.1 iptables 规则说明

### 3.1.1 iptables 规则组成

**规则rule：根据规则的匹配条件尝试匹配报文，对匹配成功的报文根据规则定义的处理动作作出处理，规则在链接上的次序即为其检查时的生效次序**

**匹配条件：默认为与条件，同时满足**

**基本匹配：IP，端口，TCP的Flags（SYN,ACK等）**

**扩展匹配：通过复杂高级功能匹配**

**处理动作：称为target，跳转目标**

* **内建处理动作 ACCEPT（允许）,DROP（抛弃）,REJECT（拒绝）**,SNAT,DNAT,MASQUERADE,MARK,LOG...
* 自定义处理动作：自定义chain，利用分类管理复杂情形

**规则要添加在链上，才生效；添加在自定义链上不会自动生效**

**白名单:只有指定的特定主机可以访问,其它全拒绝**

**黑名单:只有指定的特定主机拒绝访问,其它全允许,默认方式**

### 3.1.2 iptables规则添加时考量点

* 要实现哪种功能：判断添加在哪张表上
* 报文流经的路径：判断添加在哪个链上
* 报文的流向：判断源和目的
* 匹配规则：业务需要

### 3.1.3 环境准备

```bash
Centos7，8：
systemctl disable --now firewalld

Centos6：
service stop iptables
chkconfig iptables off
```

## 3.2 iptables用法说明

帮助：man 8 iptables

**格式：**

```bash
iptables [-t table] {-A|-C|-D} chain rule-specification
iptables [-t table] -I chain [rulenum] rule-specification
iptables [-t table] -R chain rulenum rule-specification
iptables [-t table] -D chain rulenum
iptables [-t table] -S [chain [rulenum]]
iptables [-t table] {-F|-L|-Z} [chain [rulenum]] [options...]
iptables [-t table] -N chain
iptables [-t table] -X [chain]
iptables [-t table] -P chain target
iptables [-t table] -E old-chain-name new-chain-name
rule-specification = [matches...] [target]
match = -m matchname [per-match-options]
target = -j targetname [per-target-options]
```

**范例：Filter表中INPUT规则**

![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-6aebf24a.png)

**iptables命令格式详解：**

```bash
iptables   [-t table]   SUBCOMMAND   chain   [-m matchname [per-match-options]]
-j targetname [per-target-options]
```

1. -t table：指定表

* raw, mangle, nat, [filter]默认

2. SUBCOMMAND：子命令

### 3.2.1 链管理类：

```bash
-N：new, 自定义一条新的规则链
-E：重命名自定义链；引用计数不为0的自定义链不能够被重命名，也不能被删除
-X：delete，删除自定义的空的规则链
-P：Policy，设置默认策略；对filter表中的链而言，其默认策略有：ACCEPT：接受, DROP：丢弃
```

**范例：自定义链的使用，正常很少使用**

```bash
[14:32:04 root@centos8 ~]#iptables -N web_chain           #创建链，不写表名称默认filter表
[14:35:43 root@centos8 ~]#iptables -N web_chain -t nat    #把链关联到表
[14:36:55 root@centos8 ~]#iptables -E web_chain WEB_CHAIN #修改链名称
[14:38:02 root@centos8 ~]#iptables -A WEB_CHAIN -s 192.168.10.71 -p tcp -m multiport --dports 80,443,8080 -j REJECT
[14:43:15 root@centos8 ~]#iptables -vnL WEB_CHAIN
[14:43:48 root@centos8 ~]#iptables -AINPUT -j WEB_CHAIN
[14:44:38 root@centos8 ~]#iptables -X WEB_CHAIN
[14:46:24 root@centos8 ~]#iptables -F WEB_CHAIN
[14:47:14 root@centos8 ~]#iptables -X WEB_CHAIN
[14:47:53 root@centos8 ~]#iptables -D INPUT 1
[14:48:17 root@centos8 ~]#iptables -X WEB_CHAIN
```

### 3.2.2 查看类

```bash
-L：list, 列出指定鏈上的所有规则，本选项须置后
-n：numberic，以数字格式显示地址和端口号
-v：verbose，详细信息
-vv 更详细
-x：exactly，显示计数器结果的精确值,而非单位转换后的易读值
--line-numbers：显示规则的序号
-S selected,以iptables-save 命令格式显示链上规则
```

**常用组合：**

```bash
[17:49:50 root@centos7 ~]#iptables -nvL
[17:49:13 root@centos7 ~]#iptables -vnL --line-numbers
```

### 3.2.3 规则管理类

```bash
-A：append，追加
-I：insert, 插入，要指明插入至的规则编号，默认为第一条
-D：delete，删除
(1) 指明规则序号
(2) 指明规则本身
-R：replace，替换指定链上的指定规则编号
-F：flush，清空指定的规则链
-Z：zero，置零
iptables的每条规则都有两个计数器
(1) 匹配到的报文的个数
(2) 匹配到的所有报文的大小之和
```

**范例：**

```bash
[17:53:31 root@centos8 ~]#iptables -F OUTPUT
```

3. chain（链）

```bash
PREROUTING，INPUT，FORWARD，OUTPUT，POSTROUTING
```

4. 匹配条件

* 基本：通用的，PARAMETERS
* 扩展：需加载模块，MATCH EXTENTIONS

5. 处理动作

```bash
-j targetname [per-target-options]
```

**简单动作：**

```bash
ACCEPT    拒绝，会给对方发送回应拒绝包
DROP      丢弃，不会给对方返回任何包
```

**扩展动作：**

```bash
REJECT：--reject-with:icmp-port-unreachable默认
RETURN：返回调用链
REDIRECT：端口重定向
LOG：记录日志，dmesg
MARK：做防火墙标记
DNAT：目标地址转换
SNAT：源地址转换
MASQUERADE：地址伪装
自定义链
```

## 3.3 iptables 基本匹配条件

**基本匹配条件：无需加载模块，由iptables/netfilter自行提供**

```bash
[!] -s, --source address[/mask][,...]：源IP地址或者不连续的IP地址
[!] -d, --destination address[/mask][,...]：目标IP地址或者不连续的IP地址
[!] -p, --protocol protocol：指定协议，可使用数字如0（all）
protocol: tcp, udp, icmp, icmpv6, udplite,esp, ah, sctp, mh or“all“
参看：/etc/protocols
[!] -i, --in-interface name：报文流入的接口；只能应用于数据报文流入环节，只应用于INPUT、FORWARD、PREROUTING链
[!] -o, --out-interface name：报文流出的接口；只能应用于数据报文流出的环节，只应用于FORWARD、OUTPUT、POSTROUTING链
```

**范例：**

```bash
[18:18:02 root@centos8 ~]#iptables -AINPUT -s 192.168.10.81 -j REJECT
[18:18:38 root@centos8 ~]#iptables -IINPUT -i lo -j ACCEPT
[18:20:27 root@centos8 ~]#curl 127.0.0.1
zhangzhuo.org
[18:20:50 root@centos8 ~]#curl 192.168.10.81
zhangzhuo.org
```

## 3.4 iptables 扩展匹配条件

扩展匹配条件：需要加载扩展模块（/usr/lib64/xtables/*.so），方可生效

扩展模块的查看帮助 ：man iptables-extensions

扩展匹配条件：

* 隐式扩展
* 显式扩展

### 3.4.1 隐式扩展

iptables 在使用-p选项指明了特定的协议时，无需再用-m选项指明扩展模块的扩展机制，不需要手动加

载扩展模块

**tcp 协议的扩展选项**

```bash
[!] --source-port, --sport port[:port]：匹配报文源端口,可为端口连续范围
[!] --destination-port,--dport port[:port]：匹配报文目标端口,可为连续范围
[!] --tcp-flags mask comp
mask 需检查的标志位列表，用,分隔 , 例如 SYN,ACK,FIN,RST
comp 在mask列表中必须为1的标志位列表，无指定则必须为0，用,分隔tcp协议的扩展选项
```

**范例:**

```bash
--tcp-flags SYN,ACK,FIN,RST SYN 表示要检查的标志位为SYN,ACK,FIN,RST四个，其中SYN必
须为1，余下的必须为0，第一次握手
--tcp-flags SYN,ACK,FIN,RST SYN,ACK 第二次握手
#错误包
--tcp-flags ALL ALL
--tcp_flags ALL NONE
```

**[!] --syn：用于匹配第一次握手, 相当于：--tcp-flags SYN,ACK,FIN,RST SYN**

**udp 协议的扩展选项**

```bash
[!] --source-port, --sport port[:port]：匹配报文的源端口或端口范围
[!] --destination-port,--dport port[:port]：匹配报文的目标端口或端口范围
```

**icmp 协议的扩展选项**

```bash
[!] --icmp-type {type[/code]|typename}
type/code
0/0   echo-reply icmp应答
8/0   echo-request icmp请求
```

**范例：禁止到本机访问http服务80端口**

```bash
[18:35:42 root@centos8 ~]#iptables -A INPUT -d 192.168.10.81 -p tcp --dport 80 -j REJECT
[18:36:19 root@centos8 ~]#iptables -vnL --line-numbers
Chain INPUT (policy ACCEPT 0 packets, 0 bytes)
num   pkts bytes target     prot opt in     out     source               destination
1        1    60 REJECT     tcp  --  *      *       0.0.0.0/0            192.168.10.81        tcp dpt:80 reject-with icmp-port-unreachable

Chain FORWARD (policy ACCEPT 0 packets, 0 bytes)
num   pkts bytes target     prot opt in     out     source               destination

Chain OUTPUT (policy ACCEPT 0 packets, 0 bytes)
num   pkts bytes target     prot opt in     out     source               destination
```

**范例：匹配第一次握手的请求拒绝**

```bash
[18:39:23 root@centos8 ~]#iptables -AINPUT -p tcp --syn -j REJECT
```

**范例：拒绝ICMP的请求包**

```bash
[18:40:45 root@centos8 ~]#iptables -AINPUT -s 192.168.10.71 -p icmp --icmp-type 8 -j REJECT
```

### 3.4.2 显示扩展及相关模块

**显示扩展即必须使用-m选项指明要调用的扩展模块名称，需要手动加载扩展模块**

```bash
[-m matchname [per-match-options]]
```

**扩展模块的使用帮助：**

* CentOS 7,8: man iptables-extensions
* CentOS 6: man iptables

#### 3.4.2.1 multiport扩展

以离散方式定义多端口匹配,最多指定15个端口

```bash
#指定多个源端口
[!] --source-ports,--sports port[,port|,port:port]...
# 指定多个目标端口
[!] --destination-ports,--dports port[,port|,port:port]...
#多个源或目标端
[!] --ports port[,port|,port:port]
```

**范例：禁止多个端口访问**

```bash
[18:44:47 root@centos8 ~]#iptables -A INPUT -s 192.168.10.0/24 -d 192.168.10.1 -p tcp -m multiport --dports 20:22,80 -j REJECT
[18:46:27 root@centos8 ~]#iptables -AINPUT -s 192.168.10.71 -p tcp -m multiport --dports 445,139 -j REJECT
```

#### 3.4.2.2 iprange扩展

指明连续的（但一般不是整个网络）ip地址范围

```bash
[!] --src-range from[-to] 源IP地址范围
[!] --dst-range from[-to] 目标IP地址范围
```

**范例：禁止192.168.10.71-192.168.10.72访问本机的80端口**

```bash
[18:50:13 root@centos8 ~]#iptables -AINPUT -d 192.168.10.81 -p tcp --dport 80 -m iprange --src-range 192.168.10.71-192.168.10.75 -j DROP
```

#### 3.4.2.3 mac扩展

mac 模块可以指明源MAC地址,，适用于：PREROUTING, FORWARD，INPUT chains

```bash
[!] --mac-source XX:XX:XX:XX:XX:XX
```

**范例：禁止地址为192.168.10.71且mac地址为00:0c:29:c1:8a:39访问本机**

```bash
[18:52:25 root@centos8 ~]#iptables -AINPUT -s 192.168.10.71 -m mac --mac-source 00:0c:29:c1:8a:39 -j RE
JECT
```

#### 3.4.2.4 string扩展

对报文中的应用层数据做字符串模式匹配检测

```bash
--algo {bm|kmp} 字符串匹配检测算法
bm：Boyer-Moore
kmp：Knuth-Pratt-Morris
--from offset 开始偏移
--to offset   结束偏移
[!] --string pattern 要检测的字符串模式
[!] --hex-string pattern要检测字符串模式，16进制格式
```

**范例：**

```bash
[18:59:35 root@centos8 ~]#iptables -AOUTPUT -ptcp --sport 80 -m string --algo bm --from 62 --string "zhangzhuo" -j REJECT
```

#### 3.4.2.5 time扩展

**注意：CentOS 8 此模块有问题**

根据将报文到达的时间与指定的时间范围进行匹配

```bash
--datestart YYYY[-MM[-DD[Thh[:mm[:ss]]]]] 日期
--datestop YYYY[-MM[-DD[Thh[:mm[:ss]]]]]
--timestart hh:mm[:ss]       时间
--timestop hh:mm[:ss]
[!] --monthdays day[,day...]   每个月的几号
[!] --weekdays day[,day...]   星期几，1 – 7 分别表示星期一到星期日
--kerneltz：内核时区（当地时间），不建议使用，CentOS 7版本以上系统默认为 UTC
注意： centos6 不支持kerneltz ，--localtz指定本地时区(默认)
```

**范例: CentOS 8 的 time模块问题**

```bash
[root@centos8 ~]#rpm -ql iptables |grep time
/usr/lib64/xtables/libxt_time.so
[root@centos8 ~]#iptables -A INPUT -m time --timestart 12:30 --timestop 13:30 -j
ACCEPT
iptables v1.8.4 (nf_tables): Couldn't load match `time':No such file or
directory
```

**范例：**

```bash
[19:06:48 root@centos7 ~]#iptables -IINPUT -s 192.168.10.0/24 -p icmp --icmp-type 8 -m time --timestart 11:00 --timestop 20:00 -j DROP
```

#### 3.4.2.6 connlimit扩展

根据每客户端IP做并发连接数数量匹配

可防止Dos(Denial of Service，拒绝服务)攻击

```bash
--connlimit-upto N #连接的数量小于等于N时匹配
--connlimit-above N #连接的数量大于N时匹配
```

**范例:**

```bash
[13:43:54 root@centos8 ~]#iptables -A INPUT -d 192.168.10.81 -p tcp --dport 22 -m connlimit --connlimit-above 2 -j REJECT
```

#### 3.4.2.7 limit扩展

基于收发报文的速率做匹配 , 令牌桶过滤器

```bash
--limit-burst number #前多少个包不限制
--limit #[/second（秒）|/minute（分）|/hour（时）|/day（天）]  #前面加数字表示每多少过多少个包
```

**范例：**

```bash
[13:46:19 root@centos8 ~]#iptables -A INPUT -p icmp -m limit --limit-burst 10 --limit 20/minute -j ACCEPT
[13:48:22 root@centos8 ~]#iptables -AINPUT -p icmp -j REJECT
[13:48:34 root@centos8 ~]#ping 192.168.10.81
```

#### 3.4.2.8 state扩展（重点）

state 扩展模块，可以根据”连接追踪机制“去检查连接的状态，较耗资源

conntrack机制：追踪本机上的请求和响应之间的关系

**状态类型**

* **NEW：新发出请求；连接追踪信息库中不存在此连接的相关信息条目，因此，将其识别为第一次发出的请求**
* **ESTABLISHED：NEW状态之后，连接追踪信息库中为其建立的条目失效之前期间内所进行的通信状态**
* **RELATED：新发起的但与已有连接相关联的连接，如：ftp协议中的数据连接与命令连接之间的关系**
* **INVALID：无效的连接，如flag标记不正确**
* **UNTRACKED：未进行追踪的连接，如：raw表中关闭追踪**

**已经追踪到的并记录下来的连接信息库**

```bash
[14:12:14 root@centos8 ~]#cat /proc/net/nf_conntrack
ipv4     2 tcp      6 46 CLOSE_WAIT src=192.168.10.81 dst=192.168.10.82 sport=22 dport=49282 src=192.168.10.82 dst=192.168.10.81 sport=49282 dport=22 [ASSURED] mark=0 zone=0 use=2
ipv4     2 tcp      6 299 ESTABLISHED src=192.168.10.81 dst=192.168.10.1 sport=22 dport=57028 src=192.168.10.1 dst=192.168.10.81 sport=57028 dport=22 [ASSURED] mark=0 zone=0 use=2
```

**调整连接追踪功能所能够容纳的最大连接数量**

```bash
[14:12:36 root@centos8 ~]#cat /proc/sys/net/netfilter/nf_conntrack_max
30720
[14:13:42 root@centos8 ~]#cat /proc/sys/net/nf_conntrack_max
30720
```

**查看连接跟踪有多少条目**

```bash
[14:13:54 root@centos8 ~]#cat /proc/sys/net/netfilter/nf_conntrack_count
1
```

**不同的协议的连接追踪时长**

```bash
[14:15:16 root@centos8 ~]#ll /proc/sys/net/netfilter/
```

**说明：**

* 连接跟踪，需要加载模块： modprobe nf_conntrack_ipv4
* 当服务器连接多于最大连接数时dmesg 可以观察到 ：kernel: ip_conntrack: table full, dropping packet错误,并且导致建立TCP连接很慢。
* 各种状态的超时后，链接会从表中删除

**范例：面试题**

```bash
[14:17:21 root@centos8 ~]#echo 1 >/proc/sys/net/netfilter/nf_conntrack_max
[14:17:51 root@centos8 ~]#tail -f /var/log/messages
Jan 24 14:18:05 centos8 kernel: nf_conntrack: nf_conntrack: table full, dropping packet
[root@centos6 ~]#tail /var/log/messages
Jul  8 09:51:16 centos6 kernel: nf_conntrack: table full, dropping packet.
```

**连接过多的解决方法两个：**

(1) 加大nf_conntrack_max 值

```bash
vi /etc/sysctl.conf
net.nf_conntrack_max = 393216
net.netfilter.nf_conntrack_max = 393216
```

(2) 降低 nf_conntrack timeout时间

```bash
vi /etc/sysctl.conf
net.netfilter.nf_conntrack_tcp_timeout_established = 300
net.netfilter.nf_conntrack_tcp_timeout_time_wait = 120
net.netfilter.nf_conntrack_tcp_timeout_close_wait = 60
net.netfilter.nf_conntrack_tcp_timeout_fin_wait = 120
iptables -t nat -L -n
```

**格式：**

```bash
[!] --state state
```

**范例: 不允许192.168.82 访问本机,但本机可以访问192.168.10.82**

```bash
[14:59:13 root@centos8 ~]#iptables -AINPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
[14:59:13 root@centos8 ~]#iptables -RINPUT 2 -s 192.168.10.82 -j REJECT
```

## 3.5 target

target 包括以下类型：

```bash
自定义链, ACCEPT， DROP， REJECT，RETURN,LOG，SNAT，DNAT，REDIRECT，MASQUERADE
LOG：非中断target,本身不拒绝和允许,放在拒绝和允许规则前，并将日志记录在/var/log/messages系
统日志中
--log-level level   级别： debug，info，notice, warning, error, crit, alert,emerg
--log-prefix prefix 日志前缀，用于区别不同的日志，最多29个字符
```

**范例:访问记录日志**

```bash
[15:07:37 root@centos8 ~]#iptables -AINPUT -s192.168.10.0/24 -p tcp --dport 80 -m state --state NEW -j LOG --log-prefix "new connections:"
[15:07:50 root@centos8 ~]#tail -1 /var/log/messages
Jan 24 15:07:20 centos8 kernel: new connections:IN=eth0 OUT= MAC=00:0c:29:62:36:f5:00:0c:29:1a:4b:7f:08:00 SRC=192.168.10.82 DST=192.168.10.81 LEN=60 TOS=0x00 PREC=0x00 TTL=64 ID=61055 DF PROTO=TCP SPT=32886 DPT=80 WINDOW=29200 RES=0x00 SYN URGP=0
```

## 3.6 规则优化最佳实践

1. 安全放行所有入站和出站的状态为ESTABLISHED状态连接,建议放在第一条，效率更高
2. 谨慎放行入站的新请求
3. 有特殊目的限制访问功能，要在放行规则之前加以拒绝
4. 同类规则（访问同一应用，比如：http ），匹配范围小的放在前面，用于特殊处理
5. 不同类的规则（访问不同应用，一个是http，另一个是mysql ），匹配范围大的放在前面，效率更高

```bash
-s 10.0.0.6 -p tcp --dport 3306 -j REJECT
-s 172.16.0.0/16 -p tcp --dport 80 -j REJECT
```

6. 应该将那些可由一条规则能够描述的多个规则合并为一条,减少规则数量,提高检查效率
7. 设置默认策略，建议白名单（只放行特定连接）

* iptables -P，不建议，容易出现“自杀现象”
* 规则的最后定义规则做为默认策略，推荐使用，放在最后一条

## 3.7 iptables规则保存

使用iptables命令定义的规则，手动删除之前，其生效期限为kernel存活期限

**持久保存规则：**

CentOS 7,8

```bash
iptables-save > /PATH/TO/SOME_RULES_FILE
```

CentOS 6

```bash
#将规则覆盖保存至/etc/sysconfig/iptables文件中
service iptables save
```

**加载规则**

CentOS 7,8 重新载入预存规则文件中规则：

```bash
iptables-restore < /PATH/FROM/SOME_RULES_FILE
```

**iptables-restore选项**

```bash
-n, --noflush：不清除原有规则
-t, --test：仅分析生成规则集，但不提交
```

CentOS 6：

```bash
#会自动从/etc/sysconfig/iptables 重新载入规则
service iptables  restart
```

**开机自动重载规则**

* 用脚本保存各iptables命令；让此脚本开机后自动运行 /etc/rc.d/rc.local文件中添加脚本路径 /PATH/TO/SOME_SCRIPT_FILE
* 用规则文件保存各规则，开机时自动载入此规则文件中的规则在/etc/rc.d/rc.local文件添加

```bash
iptables-restore < /PATH/FROM/IPTABLES_RULES_FILE
```

## 3.8 网络防火墙

iptables/netfilter 利用filter表的FORWARD链,可以充当网络防火墙：

注意的问题：

(1) 请求-响应报文均会经由FORWARD链，要注意规则的方向性

(2) 如果要启用conntrack机制，建议将双方向的状态为ESTABLISHED的报文直接放行

### 3.8.1 FORWARD 链实现内外网络的流量控制

**范例: 实现内网访问可以访问外网,反之禁止**

![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-c475e2fd.png)

```bash
#环境准备
[15:59:55 root@centos8 ~]#hostname -I
172.16.10.71 
[16:01:41 root@centos8 ~]#route -n
Kernel IP routing table
Destination     Gateway         Genmask         Flags Metric Ref    Use Iface
0.0.0.0         172.16.10.81    0.0.0.0         UG    100    0        0 eth0
172.16.10.0     0.0.0.0         255.255.255.0   U     100    0        0 eth0


[15:57:40 root@centos8 ~]#hostname -I
192.168.10.81 172.16.10.81 
[16:02:29 root@centos8 ~]#echo 1 >/proc/sys/net/ipv4/ip_forward

[15:59:23 root@centos7 ~]#hostname -I
192.168.10.71 
[16:02:59 root@centos7 ~]#route -n
Kernel IP routing table
Destination     Gateway         Genmask         Flags Metric Ref    Use Iface
0.0.0.0         192.168.10.81   0.0.0.0         UG    100    0        0 eth0
192.168.10.0    0.0.0.0         255.255.255.0   U     100    0        0 eth0

[15:59:07 root@centos7 ~]#hostname -I
192.168.10.72 
[16:03:07 root@centos7 ~]#route -n
Kernel IP routing table
Destination     Gateway         Genmask         Flags Metric Ref    Use Iface
0.0.0.0         192.168.10.81   0.0.0.0         UG    100    0        0 eth0
192.168.10.0    0.0.0.0         255.255.255.0   U     100    0        0 eth0

#方法1 通过标准模块实现内网访问外网特定服务http和icmp,反之禁止
[16:15:31 root@frewall ~]#iptables -AFORWARD -j REJECT
[16:15:58 root@frewall ~]#iptables -IFORWARD -s 192.168.10.0/24 -p tcp --sport 80 -j ACCEPT
[16:16:46 root@frewall ~]#iptables -IFORWARD -d 192.168.10.0/24 -p tcp --dport 80 -j ACCEPT
[16:17:04 root@frewall ~]#iptables -IFORWARD -s 192.168.10.0/24 -p icmp --icmp-type 8 -j ACCEPT
[16:20:46 root@frewall ~]#iptables -IFORWARD -d 192.168.10.0/24 -p icmp --icmp-type 0 -j ACCEPT
[16:21:52 root@frewall ~]#iptables -vnL --line-numbers
Chain FORWARD (policy ACCEPT 0 packets, 0 bytes)
num   pkts bytes target     prot opt in     out     source               destination     
1        2   168 ACCEPT     icmp --  *      *       0.0.0.0/0            192.168.10.0/24      icmptype 0
2        2   168 ACCEPT     icmp --  *      *       192.168.10.0/24      0.0.0.0/0            icmptype 8
3       18  1191 ACCEPT     tcp  --  *      *       0.0.0.0/0            192.168.10.0/24      tcp dpt:80
4       12  1431 ACCEPT     tcp  --  *      *       192.168.10.0/24      0.0.0.0/0            tcp spt:80
5        2   168 REJECT     all  --  *      *       0.0.0.0/0            0.0.0.0/0            reject-with icmp-port-unreachable
#方法2 利用state模块实现内网访问可以访问外网,反之禁止,但是外网可以访问内网特定服务http服务
[16:58:48 root@frewall ~]#iptables -AFORWARD ! -s 192.168.10.0/24 -d 192.168.10.0/24 -j REJECT
[16:59:29 root@frewall ~]#iptables -IFORWARD ! -s 192.168.10.0/24  -m state --state ESTABLISHED,RELATED -j ACCEPT
[17:03:22 root@frewall ~]#iptables -IFORWARD 2 ! -s 192.168.10.0/24 -p tcp --dport 80 -j ACCEPT
```

### 3.8.2 NAT表（重点）

![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-fd54c3ec.png)

NAT: network address translation，支持PREROUTING，INPUT，OUTPUT，POSTROUTING四个链

请求报文：修改源/目标IP，由定义如何修改

响应报文：修改源/目标IP，根据跟踪机制自动实现

**NAT的实现分为下面类型：**

* SNAT：source NAT ，支持POSTROUTING, INPUT，让本地网络中的主机通过某一特定地址访问外部网络，实现地址伪装,请求报文：修改源IP
* DNAT：destination NAT 支持PREROUTING , OUTPUT，把本地网络中的主机上的某服务开放给外部网络访问(发布服务和端口映射)，但隐藏真实IP,请求报文：修改目标IP
* PNAT: port nat，端口和IP都进行修改

### 3.8.3 SNAT

**SNAT：基于nat表的target，适用于固定的公网IP**

SNAT选项：

* --to-source [ipaddr[-ipaddr]][:port[-port]]
* --random

```bash
iptables -t nat -A POSTROUTING -s LocalNET ! -d LocalNet -j SNAT --to-source ExtIP
```

**注意: 需要开启 ip_forward**

**范例：**

```bash
iptables -t nat -A POSTROUTING -s 10.0.1.0/24 ! –d 10.0.1.0/24 -j SNAT --to-source 172.18.1.6-172.18.1.9
```

**MASQUERADE：基于nat表的target，适用于动态的公网IP，如：拨号网络，就是网卡的公网IP不固定是动态获取的**

MASQUERADE选项：

* --to-ports port[-port]
* --random

```bash
iptables -t nat -A POSTROUTING -s LocalNET ! -d LocalNet -j MASQUERADE
```

范例：

```bash
iptables -t nat -A POSTROUTING -s 10.0.1.0/24 ! –d 10.0.1.0/24 -j MASQUERADE
```

范例：查看本地主机访问公网时使用的IP

```bash
[17:05:09 root@frewall ~]#curl ip.sb
110.17.5.83
```

#### 3.8.2.1 范例：SNAT（重点）

![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-4e472050.png)

**跟上面环境差不多，但是外部网络主机没有网关**

```bash
一定要启用路由转发
#针对专线静态公共IP
[17:14:20 root@frewall ~]#iptables -t nat -A POSTROUTING -s 192.168.10.0/24 -j SNAT --to-source 172.16.10.81
#针对拨号网络和专线静态公共IP
[17:26:12 root@frewall ~]#iptables -t nat -APOSTROUTING -s 192.168.10.0/24 -j MASQUERADE
#查看监听端口
[17:26:52 root@frewall ~]#ss -ntl
State        Recv-Q       Send-Q              Local Address:Port               Peer Address:Port   
LISTEN       0            128                       0.0.0.0:111                     0.0.0.0:*      
LISTEN       0            128                       0.0.0.0:22                      0.0.0.0:*      
LISTEN       0            128                          [::]:111                        [::]:*      
LISTEN       0            128                          [::]:22                         [::]:* 
#内网可以访问外网
[17:31:36 root@centos7 ~]#curl 172.16.10.71
internet
#外网不可以访问内网
[17:31:42 root@centos8 ~]#curl 192.168.10.71
curl: (7) Couldn't connect to server
#在外网服务器查看到是firewalld的地址在访问
[17:32:34 root@centos8 ~]#tail /var/log/httpd/access_log 
172.16.10.81 - - [24/Jan/2021:17:31:46 +0800] "GET / HTTP/1.1" 200 9 "-" "curl/7.29.0"
#查看转换状态信息
[17:34:06 root@frewall ~]#cat /proc/net/nf_conntrack
ipv4     2 tcp      6 117 TIME_WAIT src=192.168.10.71 dst=172.16.10.71 sport=52598 dport=80 src=172.16.10.71 dst=172.16.10.81 sport=80 dport=52598 [ASSURED] mark=0 zone=0 use=2
```

### 3.8.4 DNAT

DNAT：nat表的target，适用于端口映射，即可重定向到本机，也可以支持重定向至不同主机的不同端口，但不支持多目标，即不支持负载均衡功能

**DNAT选项：**

* --to-destination [ipaddr[-ipaddr]][:port[-port]]

```bash
帮助查看
[17:34:12 root@frewall ~]#man iptables-extensions
```

**DNAT格式：**

```bash
iptables -t nat -A PREROUTING -d ExtIP -p tcp|udp --dport PORT -j DNAT --to-destination InterSeverIP[:PORT]
```

**注意需要开启ip_forward**

**范例：DNAT**
![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-4e472050.png)

```bash
[17:41:04 root@frewall ~]#iptables -t nat -A PREROUTING -d 172.16.10.81 -p tcp --dport 80 -j DNAT --to-destination 192.168.10.71:80
[17:41:12 root@frewall ~]#ss -ntl
State        Recv-Q       Send-Q              Local Address:Port               Peer Address:Port   
LISTEN       0            128                       0.0.0.0:111                     0.0.0.0:*      
LISTEN       0            128                       0.0.0.0:22                      0.0.0.0:*      
LISTEN       0            128                          [::]:111                        [::]:*      
LISTEN       0            128                          [::]:22                         [::]:*  
[17:33:03 root@centos8 ~]#curl 172.16.10.81
192.168.10.71 httpd
[17:34:10 root@centos7 ~]#tail /var/log/httpd/access_log 
172.16.10.71 - - [24/Jan/2021:16:10:29 +0800] "GET / HTTP/1.1" 200 20 "-" "curl/7.61.1"、
[17:43:49 root@frewall ~]#cat /proc/net/nf_conntrack
ipv4     2 udp      17 27 src=192.168.10.71 dst=192.168.10.81 sport=45053 dport=123 src=192.168.10.81 dst=192.168.10.71 sport=123 dport=45053 mark=0 zone=0 use=2
ipv4     2 tcp      6 117 TIME_WAIT src=172.16.10.71 dst=172.16.10.81 sport=57170 dport=80 src=192.168.10.71 dst=172.16.10.71 sport=80 dport=57170 [ASSURED] mark=0 zone=0 use=2
ipv4     2 tcp      6 299 ESTABLISHED src=192.168.10.81 dst=192.168.10.1 sport=22 dport=59552 src=192.168.10.1 dst=192.168.10.81 sport=59552 dport=22 [ASSURED] mark=0 zone=0 use=2
```

**范例：**

```bash
如果目标访问的端口和自己主机的端口一致最后可以不写
[17:48:02 root@frewall ~]#iptables -t nat -A PREROUTING -s 0/0 -d 172.16.10.81 -p tcp --dport 80 -j DNAT --to-destination 192.168.10.71
也可以把原本的端口代理到其他端口
[17:49:22 root@frewall ~]#iptables -t nat -R PREROUTING 2 -s 0/0 -d 172.16.10.81 -p tcp --dport 80 -j DNAT --to-destination 192.168.10.72:8080
注意代理端口的话使用ss命令是看不到端口监听的只要应用或者进程才可以打开监听端口，iptables是内核中的操作
```

### 3.8.5 REDIRECT转发

REDIRECT，是NAT表的 target，通过改变目标IP和端口，将接受的包转发至同一个主机的不同端口，可用于PREROUTING OUTPUT链

REDIRECT选项：

* --to-ports port[-port]

**注意: 无需开启 ip_forward，一般用于本机端口转发**

**范例：**

```bash
iptables -t nat -A PREROUTING -d 172.16.100.10 -p tcp --dport 80 -j REDIRECT --to-ports 8080
```

**范例：**

```bash
[17:42:27 root@centos7 ~]#ss -ntl
State       Recv-Q Send-Q      Local Address:Port                     Peer Address:Port
LISTEN      0      128                     *:111                                 *:*
LISTEN      0      128                     *:22                                  *:*
LISTEN      0      100             127.0.0.1:25                                  *:*
LISTEN      0      128                  [::]:111                              [::]:*
LISTEN      0      128                  [::]:80                               [::]:*
LISTEN      0      128                  [::]:22                               [::]:*
LISTEN      0      100                 [::1]:25                               [::]:*
[18:06:02 root@centos7 ~]#iptables -t nat -APREROUTING -p tcp --dport 8000 -j REDIRECT --to-ports 80
[17:45:54 root@centos7 ~]#curl 192.168.10.71:8000
192.168.10.71 httpd
```

## 3.9 俩个私有网络的主机的互相通信

![Snipaste20210125195851.png](https://b3logfile.com/file/2021/01/Snipaste20210125195851-7f12fa86.png)

### 3.9.1 主机网络环境准备

```
#web-1
[20:07:44 root@web-1 ~]#hostname -I
192.168.10.71
[20:08:37 root@web-1 ~]#route -n
Kernel IP routing table
Destination     Gateway         Genmask         Flags Metric Ref    Use Iface
0.0.0.0         192.168.10.10   0.0.0.0         UG    100    0        0 eth0
192.168.10.0    0.0.0.0         255.255.255.0   U     100    0        0 eth0

#firewalld-1
[20:10:37 root@firewalld-1 network-scripts]#hostname -I
192.168.10.10 10.0.0.100
[20:10:42 root@firewalld-1 network-scripts]#route -n
Kernel IP routing table
Destination     Gateway         Genmask         Flags Metric Ref    Use Iface
10.0.0.0        0.0.0.0         255.255.255.0   U     101    0        0 eth1
192.168.10.0    0.0.0.0         255.255.255.0   U     102    0        0 eth0

#firewalld-2
[20:07:17 root@firewalld-2 ~]#hostname -I
172.16.10.10 10.0.0.200
[20:11:28 root@firewalld-2 ~]#route -n
Kernel IP routing table
Destination     Gateway         Genmask         Flags Metric Ref    Use Iface
10.0.0.0        0.0.0.0         255.255.255.0   U     103    0        0 eth1
172.16.10.0     0.0.0.0         255.255.255.0   U     102    0        0 eth0

#web-2
[20:07:42 root@web-2 ~]#hostname -I
172.16.10.20
[20:11:46 root@web-2 ~]#route -n
Kernel IP routing table
Destination     Gateway         Genmask         Flags Metric Ref    Use Iface
0.0.0.0         172.16.10.10    0.0.0.0         UG    100    0        0 eth0
172.16.10.0     0.0.0.0         255.255.255.0   U     100    0        0 eth0
```

### 3.9.2 firewalld开启路由转发

```
[20:13:03 root@firewalld-1 ~]#echo 1 >/proc/sys/net/ipv4/ip_forward
[20:11:33 root@firewalld-2 ~]#echo 1 >/proc/sys/net/ipv4/ip_forward
```

### 3.9.3 配置SNAT实现内网主机可以访问互联网

```
#允许firewalld-1内网访问互联网
[20:13:25 root@firewalld-1 ~]#iptables -t nat -APOSTROUTING -s 192.168.10.0/24 -j MASQUERADE

[20:08:51 root@web-1 ~]#ping 10.0.0.200
PING 10.0.0.200 (10.0.0.200) 56(84) bytes of data.
64 bytes from 10.0.0.200: icmp_seq=1 ttl=63 time=1.30 ms
64 bytes from 10.0.0.200: icmp_seq=2 ttl=63 time=0.739 ms

[20:22:50 root@firewalld-2 ~]#tcpdump -i eth1
dropped privs to tcpdump
tcpdump: verbose output suppressed, use -v or -vv for full protocol decode
listening on eth1, link-type EN10MB (Ethernet), capture size 262144 bytes
20:23:10.487634 IP 10.0.0.100 > firewalld-2: ICMP echo request, id 1638, seq 146, length 64
20:23:10.487656 IP firewalld-2 > 10.0.0.100: ICMP echo reply, id 1638, seq 146, length 64

#允许firewalld-1内网访问互联网
[20:13:58 root@firewalld-2 ~]#iptables -t nat -APOSTROUTING -s 172.16.10.0/24 -j MASQUERADE

[20:18:24 root@web-2 ~]#ping 10.0.0.100
PING 10.0.0.100 (10.0.0.100) 56(84) bytes of data.
64 bytes from 10.0.0.100: icmp_seq=1 ttl=63 time=1.13 ms
64 bytes from 10.0.0.100: icmp_seq=2 ttl=63 time=0.678 ms

[20:24:06 root@firewalld-1 ~]#tcpdump  -i eth1
dropped privs to tcpdump
tcpdump: verbose output suppressed, use -v or -vv for full protocol decode
listening on eth1, link-type EN10MB (Ethernet), capture size 262144 bytes
20:24:13.061897 IP 10.0.0.200 > firewalld-1: ICMP echo request, id 1640, seq 19, length 64
20:24:13.061922 IP firewalld-1 > 10.0.0.200: ICMP echo reply, id 1640, seq 19, length 64
```

**配置完成后内网的主机是可以访问10.0.0.0互联网网段的**

### 3.9.4 配置DNAT实现俩个私网主机可以互相访问对方的http服务

```
#firewalld-1配置
[20:29:34 root@firewalld-1 ~]#iptables -t nat -APREROUTING -d 10.0.0.100 -p tcp --dport 80 -j DNAT --to-destination 192.168.10.71:80

[20:30:07 root@web-2 ~]#curl 10.0.0.100
httpd 192.168.10.71

#firewalld-2配置
[20:23:21 root@firewalld-2 ~]#iptables -t nat -APREROUTING -d 10.0.0.200 -p tcp --dport 80 -j DNAT --to-destination 172.16.10.20:80

[20:23:52 root@web-1 ~]#curl 10.0.0.200
httpd 172.16.10.20
```

### 3.9.5 配置DNAT实现俩个主机可以互相访问

```
[20:35:49 root@firewalld-1 ~]#iptables -t nat -IPREROUTING -d 10.0.0.100   -j DNAT --to-destination 192.168.10.71
[20:23:21 root@firewalld-2 ~]#iptables -t nat -APREROUTING -d 10.0.0.200   -j DNAT --to-destination 172.16.10.20
```

即使是其他服务主要访问10.0.0.100都会映射到192.168.71主机，访问10.0.0.200映射到172.16.10.20包扣ping

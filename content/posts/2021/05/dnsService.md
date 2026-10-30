---
title: "域名系统DNS服务"
date: 2021-05-17T16:28:46+08:00
draft: false
description: "从域名解析原理与查询流程入手，演示 BIND 服务的部署和配置。"
cover: "https://b3logfile.com/bing/20181001.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["应用服务"]
tags: ["DNS", "bind"]
toc: true
---
# 一、名字解析介绍和DNS

当前TCP/IP网络中的设备之间进行通信，是利用和依赖于IP地址实现的。但数字形式的IP地址是很难记忆的。当网络设备众多，想要记住每个设备的IP地址，可以说是“不可能完成的任务”。那么如何解决这一难题呢？我们可以给每个网络设备起一个友好的名称，如：www.zhangzhuo.ltd，这种由文字组成的名称，显而易见要更容易记忆。但是计算机不会理解这种名称的，我们可以利用一种名字解析服务将名称转化成（解析）成IP地址。从而我们就可以利用名称来直接访问网络中设备了。除此之外还有一个重要功能，利用名称解析服务可以实现主机和IP的解耦，即：当主机IP变化时，只需要修改名称服务即可，用户仍可以通过原有的名称进行访问而不受影响。实现此服务的方法是多样的。如下面所述：

**本地名称解析配置文件：hosts**

```bash
Linux: /etc/hosts
windows: %WINDIR%/system32/drivers/etc/hosts

#格式
122.10.117.2 www.magedu.org.
93.46.8.89   www.google.com.
```

DNS：Domain Name System 域名系统,应用层协议,是互联网的一项服务。它作为将域名和IP地址相互映射的一个分布式数据库，能够使人更方便地访问互联网,基于C/S架构，服务器端：53/udp, 53/tcpBIND：Bekerley Internet Name Domain,由 ISC （www.isc.org）提供的DNS软件实现DNS域名结构

![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-abca57ac.png)

* 根域: 全球根服务器节点只有13个,10个在美国，1个荷兰，1个瑞典，1个日本
* 一级域名：Top Level Domain: tld
  * 三类：组织域、国家域(.cn, .ca, .hk, .tw)、反向域
  * com, edu, mil, gov, net, org, int,arpa
* 二级域名：zhangzhuo.ltd
* 三级域名：www.zhangzhuo.ltd，zz.zhangzhuo.ltd
* 最多可达到127级域名

ICANN（The Internet Corporation for Assigned Names and Numbers）互联网名称与数字地址分配机构，负责在全球范围内对互联网通用顶级域名（gTLD）以及国家和地区顶级域名（ccTLD）系统的管理、以及根服务器系统的管理

## 1.2 DNS服务工作原理

![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-59a7b8bc.png)

根服务器的安全

```
2004年4月由于顶级域名.ly瘫痪,导致利比亚从互联网消失了3天
```

![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-fe6592e4.png)

**雪人计划**

```
在与现有IPv4根服务器体系架构充分兼容基础上，“雪人计划”于2016年在美国、日本、印度、俄罗斯、德
国、法国等全球16个国家完成25台IPv6根服务器架设，其中1台主根和3台辅根部署在中国，事实上形成了13
台原有根加25台IPv6根的新格局
```

## 1.3 DNS查询类型（面试要点）

* **递归查询：一般客户机和本地DNS服务器之间属于递归查询，即当客户机向DNS服务器发出请求后,若DNS服务器本身不能解析，则会向另外的DNS服务器发出查询请求，得到最终的肯定或否定的结果后转交给客户机。此查询的源和目标保持不变,为了查询结果只需要发起一次查询**
* **迭代查询：一般情况下(有例外)本地的DNS服务器向其它DNS服务器的查询属于迭代查询,如：若对方不能返回权威的结果，则它会向下一个DNS服务器(参考前一个DNS服务器返回的结果)再次发起进行查询，直到返回查询的结果为止。此查询的源不变,但查询的目标不断变化,为查询结果一般需要发起多次查询**

## 1.4 名称服务器

Name Server,域内负责解析本域内的名称的DNS服务器

IPv4的根名称服务器：全球共13个负责解析根域的DNS服务器，美国10个，荷兰1，瑞典1，日本1

IPv6的根名称服务器：全球共25个，中国1主3从，美国1主2从

## 1.5 解析类型

* FQDN --> IP 正向解析
* IP --> FQDN 反向解析

注意：正反向解析是两个不同的名称空间，是两棵不同的解析树

## 1.6 完整的查询请求经过的流程

```bash
Client -->hosts文件 --> Client DNS Service Local Cache（缓存） --> DNS Server (recursion
递归) --> DNS Server Cache -->DNS iteration(迭代) --> 根--> 顶级域名DNS-->二级域名DNS...
```

**范例：**

```bash
C:\Users\zhangzhuo>ipconfig/displaydns | findstr redhat
C:\Users\zhangzhuo>ping www.redhat.com

正在 Ping e3396.ca2.s.tl88.net [218.58.101.211] 具有 32 字节的数据:
来自 218.58.101.211 的回复: 字节=32 时间=14ms TTL=55
来自 218.58.101.211 的回复: 字节=32 时间=12ms TTL=55
来自 218.58.101.211 的回复: 字节=32 时间=13ms TTL=55
来自 218.58.101.211 的回复: 字节=32 时间=15ms TTL=55

218.58.101.211 的 Ping 统计信息:
数据包: 已发送 = 4，已接收 = 4，丢失 = 0 (0% 丢失)，
往返行程的估计时间(以毫秒为单位):
最短 = 12ms，最长 = 15ms，平均 = 13ms

C:\Users\zhangzhuo>ipconfig/displaydns | findstr redhat
www.redhat.com
记录名称. . . . . . . : www.redhat.com
CNAME 记录  . . . . . : ds-www.redhat.com.edgekey.net
记录名称. . . . . . . : ds-www.redhat.com.edgekey.net
CNAME 记录  . . . . . : ds-www.redhat.com.edgekey.net.globalredir.akadns.net
记录名称. . . . . . . : ds-www.redhat.com.edgekey.net.globalredir.akadns.net
C:\Users\zhangzhuo>ipconfig/flushdns

Windows IP 配置

已成功刷新 DNS 解析缓存。

C:\Users\zhangzhuo>ipconfig/displaydns | findstr redhat
```

# 二、DNS服务相关概念和技术

## 2.1 DNS服务器的类型

* 主DNS服务器
* 从DNS服务器
* 缓存DNS服务器（转发器）

### 2.1.1 主DNS服务器

管理和维护所负责解析的域内解析库的服务器

### 2.1.2 从DNS服务器

从主服务器或从服务器“复制”（区域传输）解析库副本

* 序列号：解析库版本号，主服务器解析库变化时，其序列递增
* 刷新时间间隔：从服务器从主服务器请求同步解析的时间间隔
* 重试时间间隔：从服务器请求同步失败时，再次尝试时间间隔
* 过期时长：从服务器联系不到主服务器时，多久后停止服务
* 通知机制：主服务器解析库发生变化时，会主动通知从服务器

## 2.2 区域传输

* 完全传输：传送整个解析库
* 增量传输：传递解析库变化的那部分内容

## 2.3 解析形式

* 正向：FQDN（ Fully Qualified Domain Name） --> IP
* 反向: IP --> FQDN

## 2.4 负责本地域名的正向和反向解析库

* 正向区域
* 反向区域

## 2.5 解析答案

* 肯定答案：存在对应的查询结果
* 否定答案：请求的条目不存在等原因导致无法返回结果
* 权威答案：直接由存有此查询结果的DNS服务器（权威服务器）返回的答案
* 非权威答案：由其它非权威服务器返回的查询答案

## 2.6 各种资源记录（加粗的重点）

区域解析库：由众多资源记录RR(Resource Record)组成

记录类型：A, AAAA, PTR, SOA, NS, CNAME, MX

* **SOA：Start Of Authority，起始授权记录；一个区域解析库有且仅能有一个SOA记录，必须位于解析库的第一条记录**
* **A：internet Address，作用，FQDN --> IP**
* AAAA：FQDN --> IPv6
* **PTR：PoinTeR，IP --> FQDN**
* **NS：Name Server，专用于标明当前区域的DNS服务器**
* **CNAME ： Canonical Name，别名记录**
* MX：Mail eXchanger，邮件交换器
* TXT：对域名进行标识和说明的一种方式，一般做验证记录时会使用此项，如：SPF（反垃圾邮件）记录，https验证等，如下示例：

```bash
_dnsauth TXT 2012011200000051qgs69bwoh4h6nht4n1h0lr038x
```

### 2.6.1 资源记录定义的

```bash
name   [TTL] IN rr_type value
```

注意：

1. **TTL可从全局继承**
2. **使用 “@” 符号可用于引用当前区域的名字**
3. **同一个名字可以通过多条记录定义多个不同的值；此时DNS服务器会以轮询方式响应**
4. **同一个值也可能有多个不同的定义名字；通过多个不同的名字指向同一个值进行定义；此仅表示通过多个不同的名字可以找到同一个主机**

**面试题：**

```bash
我的网站域名需要更改，如何使其更快的生效？
更改TTL值为多少比较合适呢？是如何生效的？
```

### 2.6.2 SOA记录

name: 当前区域的名字，例如“zhangzhuo.org.”

value: 有多部分组成

**注意：**

* 当前区域的主DNS服务器的FQDN，也可以使用当前区域的名字
* 当前区域管理员的邮箱地址；但地址中不能使用@符号，一般用.替换
  * 例如：admin.zhangzhuo.org
* 主从服务区域传输相关定义以及否定的答案的统一的TTL
* 从节点同步时确定文件是否变化是由序列号来决定的不取决于文件内容，如果修改文件序列号最好也修改

**范例：**

```bash
zhangzhuo.org. 86400 IN SOA ns.zhangzhuo.org. nsadmin.zhangzhuo.org. (
2015042201 ;序列号
2H         ;刷新时间，同步拉取时间
10M        ;重试时间，同步失败重试时间
1W         ;过期时间
1D         ;否定答案的TTL值
)
```

### 2.6.3 NS记录

name: 当前区域的名字

value: 当前区域的某DNS服务器的名字，例如ns.zhangzhuo.org.

**注意：**

1. 相邻的两个资源记录的name相同时，后续的可省略
2. 对NS记录而言，任何一个ns记录后面的服务器名字，都应该在后续有一个A记录
3. 一个区域可以有多个NS记录

**范例：**

```bash
zhangzhuo.org. IN NS ns1.zhnagzhuo.org.
zhangzhuo.org. IN NS ns2.zhangzhuo.org.
```

### 2.6.4 MX记录

name: 当前区域的名字

value: 当前区域的某邮件服务器(smtp服务器)的主机名

**注意：**

1. 一个区域内，MX记录可有多个；但每个记录的value之前应该有一个数字(0-99)，表示此服务器的优先级；数字越小优先级越高
2. 对MX记录而言，任何一个MX记录后面的服务器名字，都应该在后续有一个A记录

**范例：**

```bash
zhangzhuo.org. IN MX 10 mx1.zhanzghuo.org.
IN MX 20 mx2.zhanzghuo.org.
mx1 A   10.0.0.100
mx2 A   10.0.0.200
```

### 2.6.5 A记录

name: 某主机的FQDN，例如：www.zhangzhuo.org.

value: 主机名对应主机的IP地址

避免用户写错名称时给错误答案，可通过泛域名解析进行解析至某特定地址

**范例：**

```bash
www.magedu.org. IN A 1.1.1.1
www.magedu.org. IN A 2.2.2.2
mx1.magedu.org. IN   A 3.3.3.3
mx2.magedu.org. IN   A 4.4.4.4
$GENERATE 1-254 HOST$   IN A 1.2.3.$
*.magedu.org. IN A 5.5.5.5
magedu.org. IN   A 6.6.6.6
```

**范例：阿里云**
![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-35e59128.png)

### 2.6.6 AAAA记录

* name: FQDN
* value: IPv6

### 2.6.7 PTR记录

name: IP，有特定格式，把IP地址反过来写，1.2.3.4，要写作4.3.2.1；而有特定后缀：in

addr.arpa.，所以完整写法为：4.3.2.1.in-addr.arpa.

value: FQDN

**注意：网络地址及后缀可省略；主机地址依然需要反着写**

**例如：**

```bash
4.3.2.1.in-addr.arpa. IN PTR www.zhangzhuo.org.
#如1.2.3为网络地址，可简写成：
4 IN PTR www.zhangzhuo.org.
```

### 2.6.8 CNAME别名记录

name: 别名的FQDN

value: 真正名字的FQDN

**例如：**

```bash
www.zhangzhuo.org. IN CNAME   websrv.zhangzhuo.org.
```

## 2.7 子域授权

每个域的名称服务器，都是通过其上级名称服务器在解析库进行授权,类似根域授权tld

glue record：粘合记录，父域授权子域的记录

**范例：**

```bash
.com. IN NS ns1.com.
.com. IN   NS ns2.com.
ns1.com. IN A 2.2.2.1
ns2.com. IN A 2.2.2.2
#zhangzhuo.org. 在.com的名称服务器上，解析库中添加资源记录
zhangzhuo.org. IN NS ns1.zhangzhuo.org.
zhanzghuo.org. IN NS ns2.zhangzhuo.org.
zhangzhuo.org. IN NS ns3.zhangzhuo.org.
ns1.zhangzhuo.org. IN A 3.3.3.1
ns2.zhangzhuo.org. IN A 3.3.3.2
ns3.zhangzhuo.org. IN A 3.3.3.3
```

## 2.8 互联网域名

1. 域名注册

代理商：万网, 新网, godaddy

2. 注册完成以后，想自己用专用服务来解析

管理后台：把NS记录指向的服务器名称，和A记录指向的服务器地址
![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-3091f3e7.png)

范例：阿里云DNS管理后台界面
![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-7558cce6.png)

## 2.9 whois

范例: whois 查询域名信息，查询的前提是可以ping通

```bash
[10:13:38 root@centos8 ~]#yum install whois
[10:42:28 root@centos8 ~]#whois zhangzhuo.ltd
Domain Name: zhangzhuo.ltd
Registry Domain ID: 270a5a0c7dca4b70b13610c7769f5943-DONUTS
Registrar WHOIS Server: whois.hichina.com/
Registrar URL: http://www.net.cn/about/
Updated Date: 2020-11-10T08:32:15Z
Creation Date: 2020-11-05T08:31:56Z
Registry Expiry Date: 2021-11-05T08:31:56Z
Registrar: Alibaba Cloud Computing Ltd. d/b/a HiChina (www.net.cn)
Registrar IANA ID: 1599
Registrar Abuse Contact Email: abuse@list.alibaba-inc.com
Registrar Abuse Contact Phone: +86.4006008500
Domain Status: ok https://icann.org/epp#ok
Registry Registrant ID: REDACTED FOR PRIVACY
```

可以从网站查询信息，查询连接

https://www.toolnb.com/domaininfo/

# 三、DNS软件bind

DNS服务器软件：bind，powerdns，dnsmasq，unbound，coredns

## 3.1 BIND相关程序包

yum list all bind*

* bind：服务器
* bind-libs：相关库
* bind-utils: 客户端
* bind-chroot: 安全包，将dns相关文件放至 /var/named/chroot/

**范例：安装bind软件**

```bash
[10:54:40 root@centos8 ~]#yum -y install bind bind-utils
```

## 3.2 BIND包相关文件

* BIND主程序：/usr/sbin/named
* 服务脚本和Unit名称：/etc/rc.d/init.d/named，/usr/lib/systemd/system/named.service
* 主配置文件：/etc/named.conf, /etc/named.rfc1912.zones, /etc/rndc.key
* 管理工具：/usr/sbin/rndc：remote name domain controller，默认与bind安装在同一主机，且只能通过127.0.0.1连接named进程，提供辅助性的管理功能；953/tcp
* 解析库文件：/var/named/ZONE_NAME.ZONE
  * 注意：
    * (1) 一台物理服务器可同时为多个区域提供解析
    * (2) 必须要有根区域文件；named.ca
    * (3) 应该有两个（如果包括ipv6的，应该更多）实现localhost和本地回环地址的解析库

3.3 主配置文件

* 全局配置：options {};
* 日志子系统配置：logging {};
* 区域定义：本机能够为哪些zone进行解析，就要定义哪些zone
  * zone "ZONE_NAME" IN {};

注意：

* 任何服务程序如果期望其能够通过网络被其它主机访问，至少应该监听在一个能与外部主机通信的
* IP地址上
* 缓存名称服务器的配置：监听外部地址即可
* dnssec: 建议关闭dnssec，设为no

# 四、实现主DNS服务器

## 4.1 主DNS服务器配置

1. **在主配置文件中定义区域**

```bash
[11:05:29 root@centos8 ~]#vim /etc/named.conf
#注释掉下面两行
//  listen-on port 53 { 127.0.0.1; };
//  allow-query     { localhost; };

zone "ZONE_NAME" IN {                     #ZONE_NAME填写区域名称
type {master|slave|hint|forward};    #从中选一个
file "ZONE_NAME.zone";               #解析库文件名称，放在/var/named/目录下
};
```

2. 定义区域解析库文件

* 内容包括 :
  * 宏定义
  * 资源记录

**范例：区域数据库**

```bash
$TTL 86400
$ORIGIN zhangzhuo.org.
@ IN soA ns1.zhangzhuo.org admin.zhangzhuo.org (
2015042201
1H
5M
7D
1D )
IN NS ns1
IN NS ns2
IN MX 10 mx1
IN MX 20 mx2
ns1 IN A 192.168.10.100
ns2 IN A 192.168.10.200
mx1 IN A 172.16.10.100
mx2 IN A 127.16.10.200
websrv IN A 192.168.100.100
websrv IN A 192.168.100.200
www    IN CNAME websrv
```

**范例：抓包观察过程**

```bash
[11:40:16 root@centos8 ~]#tcpdump -i eth0 udp port 53 -nn
dropped privs to tcpdump
tcpdump: verbose output suppressed, use -v or -vv for full protocol decode
listening on eth0, link-type EN10MB (Ethernet), capture size 262144 bytes
11:41:49.727824 IP 192.168.10.71.50734 > 192.168.10.81.53: 41007+ A? ns1.zhangzhuo.org. (35)
11:41:49.728117 IP 192.168.10.81.53 > 192.168.10.71.50734: 41007* 1/2/1 A 192.168.10.100 (99)
11:41:52.739573 IP 192.168.10.71.52351 > 192.168.10.81.53: 60034+ PTR? 71.10.168.192.in-addr.arpa. (44)
11:41:52.739909 IP 192.168.10.81.53 > 192.168.10.71.52351: 60034 NXDomain* 0/1/0 (99)

[11:43:35 root@centos7 ~]#telnet 192.168.10.81 53
```

## 4.2 主配置文件语法检查

```bash
[11:44:24 root@centos8 ~]#named-checkconf
```

## 4.3 解析库文件语法检查

```bash
[11:45:11 root@centos8 ~]#named-checkzone "zhangzhuo.org" /var/named/zhangzhuo.org.zone
zone zhangzhuo.org/IN: loaded serial 2015042201
OK
```

## 4.4 配置生效

```bash
#三种方式
rndc reload
systemctl reload named.service
service named reload
```

## 4.5 测试和管理工具

### 4.5.1 dig命令

dig只用于测试dns系统，不会查询hosts文件进行解析

**命令格式：**

```bash
[11:52:22 root@centos7 ~]#dig --htlp
Invalid option: --htlp
Usage:  dig [@global-server] [domain] [q-type] [q-class] {q-opt}
{global-d-opt} host [@local-server] {local-d-opt}
[ host [@local-server] {local-d-opt} [...]]

Use "dig -h" (or "dig -h | more") for complete list of options
```

**范例：**

```bash
#测试反向解析
dig -x IP = dig -t ptr reverseip.in-addr.arpa
#模拟区域传送
dig -t axfr ZONE_NAME @SERVER
dig -t axfr magedu.org @10.10.10.11
dig –t axfr 100.1.10.in-addr.arpa @172.16.1.1
dig -t NS . @114.114.114.114
dig -t NS . @a.root-servers.net
```

### 4.5.2 host命令

**命令格式**

```bash
host [-t type] name [SERVER]
```

**范例：**

```bash
host -t NS magedu.org  172.16.0.1
host -t soa magedu.org
host -t mx magedu.org
host -t axfr magedu.org
host  1.2.3.4
```

### 4.5.3 nslookup命令

nslookup 可以支持交互和非交互式两种方式执行

**全令格式：**

```bash
nslookup [-option] [name | -] [server]
```

**交互式模式：**

```bash
nslookup>
server IP: 指明使用哪个DNS server进行查询
set q=RR_TYPE: 指明查询的资源记录类型
NAME: 要查询的名称
```

### 4.5.4 rndc 命令

利用rndc工具可以实现管理DNS功能

rndc 监听端口: 953/tcp

**命令格式:**

```bash
rndc COMMAND
COMMAND:
status: 查看状态
reload: 重载主配置文件和区域解析库文件
reload zonename: 重载区域解析库文件
retransfer zonename: 手动启动区域传送，而不管序列号是否增加
notify zonename: 重新对区域传送发通知
reconfig: 重载主配置文件
querylog: 开启或关闭查询日志文件/var/log/message
trace: 递增debug一个级别
trace LEVEL: 指定使用的级别
notrace：将调试级别设置为 0
flush：清空DNS服务器的所有缓存记录
```

## 4.6 实战案例：实现DNS正向主服务器

### 4.6.1 实验目的

```bash
搭建DNS正向主服务器，实现web服务器基于FQDN的访问
```

### 4.6.2 环境要求

```bash
需要三台主机
DNS服务端：192.168.10.81
web服务器：192.168.10.72
DNS客户端：192.168.10.82
```

### 4.6.3 前提准备

```bash
关闭SElinux
关闭防火墙
时间同步
```

### 4.6.4 实现步骤

#### 4.6.4.1 在DNS服务器端安装bind

```bash
[14:20:21 root@centos8 ~]#yum install bind -y
```

#### 4.6.4.2 修改bind配置文件

```bash
[14:23:04 root@centos8 ~]#vim /etc/named.conf
#注释掉下面俩行
//  listen-on port 53 { 127.0.0.1; };
//  allow-query     { localhost; };
#加上下面内容
zone "zhangzhuo.org" IN {
type master;
file "zhangzhuo.org.zone";
};
```

#### 4.6.4.3 DNS区域数据库文件

```bash
[14:25:22 root@centos8 ~]#cp -p /var/named/named.localhost /var/named/zhangzhuo.org.zone
#如果没有加-p选项，需要修改所有者或权限。chgrp named zhangzhuo.org.zone
[14:26:27 root@centos8 ~]#vim /var/named/zhanghuo.org.zone
$TTL 1D
@	IN SOA	master admin.zhangzhuo.org. (
0	; serial
1D	; refresh
1H	; retry
1W	; expire
3H )	; minimum
NS	     master
master	A	     192.168.10.81
www 	A    	     192.168.10.72
```

#### 4.6.4.4 检查配置文件和数据库文件格式，并启动服务

```bash
[14:31:45 root@centos8 ~]#named-checkconf
[14:31:41 root@centos8 ~]#named-checkzone zhangzhuo.org /var/named/zhanghuo.org.zone
zone zhangzhuo.org/IN: loaded serial 0
OK
[14:33:39 root@centos8 ~]#systemctl start named   #第一次启动服务
[14:34:20 root@centos8 ~]#rndc reload             #不是第一次启动服务
server reload successful
```

#### 4.6.4.5 实现WEB服务

```bash
#安装http服务
[14:22:26 root@centos7 ~]#yum install httpd
#配置主页面
[14:36:37 root@centos7 ~]#echo www.zhangzhuo.org >/var/www/html/index.html
#启动服务
[14:36:56 root@centos7 ~]#systemctl start httpd.service
```

#### 4.6.4.6 在客户端实现测试

```bash
#centos7及以上版本设置dns
[14:37:51 root@centos8 ~]#nmcli connection modify eth0 ipv4.dns 192.168.10.81
[14:38:16 root@centos8 ~]#nmcli connection reload
[14:38:22 root@centos8 ~]#nmcli connection up eth0
Connection successfully activated (D-Bus active path: /org/freedesktop/NetworkManager/ActiveConnection/2)

#centos6以下版本
vim /etc/sysconfig/network-scripts/ifcfg-eth0
DNS1=10.0.0.8
[14:39:22 root@centos6 ~]#service network restart

#测试网页
[14:38:28 root@centos8 ~]#curl www.zhangzhuo.org
www.zhangzhuo.org
```

## 4.7 允许动态更新

动态更新：可以通过远程更新区域数据库的资源记录

实现动态更新，需要在指定的zone语句块中：

```bash
Allow-update {any;};
```

**范例：**

```bash
chmod 770 /var/named
[15:02:18 root@centos8 ~]#nsupdate

> server 192.168.10.81
> zone zhangzhuo.org
> update add ftp.zhangzhuo.org 88888 IN A 8.8.8.8
> send
> update delete www.zhangzhuo.org
> send
> quit
> #测试
> [15:02:08 root@centos8 ~]#ls -l /var/named/zhangzhuo.org.zone.jnl
> [15:03:39 root@centos8 ~]#cat /var/named/zhangzhuo.org.zone
```

## 4.8 启用DNS客户端缓存功能

在高并发的服务器场景中,对DNS的服务器查询性能有较高的要求,如果在客户端启用DNS缓存功能,可以大幅减轻DNS服务器的压力,同时也能提高DNS客户端名称解析速度

### 4.8.1 CentOS 启用DNS客户端缓存

CentOS 默认没有启用DNS客户端缓存,安装nscd（Name Service Cache Daemon,名称服务缓存守护进程）包可以支持DNS缓存功能减少DNS服务器压力,提高DNS查询速度

```bash
[15:12:15 root@centos8 ~]#yum install nscd
[15:14:36 root@centos8 ~]#systemctl enable --now nscd
#查看缓存统计信息
[15:14:53 root@centos8 ~]#nscd -g
#清除DNS客户端缓存
[15:16:03 root@centos8 ~]#nscd -i hosts
```

### 4.8.2 Ubuntu启用DNS客户端缓存

ubuntu 默认会启用DNS客户端缓存

```bash
#查看服务状态
[07:18:10 root@ubuntu20-04 ~]#systemctl status systemd-resolved.service
#查看帮助
[07:18:35 root@ubuntu20-04 ~]#systemd-resolve --help
#查看缓存
[15:20:32 root@ubuntu20-04 ~]#systemd-resolve --statistics
#清空缓存
[15:21:04 root@ubuntu20-04 ~]#systemd-resolve --flush-caches
```

# 五、实现反向解析区域

## 5.1 反向解析配置

反向区域：即将IP反向解析为FQDN

区域名称：网络地址反写.in-addr.arpa.

**示例**

```bash
172.16.100. --> 100.16.172.in-addr.arpa.
```

**(1) 定义区域**

```bash
zone "ZONE_NAME" IN {
type {master|slave|forward}；
file "网络地址.zone"
};
```

**(2) 定义区域解析库文件**

* 注意：不需要MX,以PTR记录为主

**范例：**

```bash
$TTL 86400
$ORIGIN 16.172.in-addr.arpa.
@ IN SOA ns1.zhangzhuo.org. admin.zhanzghuo.org. (
2015042201
1H
5M
7D
1D )
IN NS ns1.zhangzhuo.org.
1.2 IN PTR www.zhangzhuo.org.
3.4 IN PTR mx1.zhangzhuo.org.
#实现以下解析
172.16.2.1 www.zhangzhuo.org.
172.16.4.3 mx1.zhangzhuo.org.
```

## 5.2 实战案例：反向解析

```bash
#修改配置文件
[15:30:45 root@centos8 named]#vim /etc/named.conf
zone "10.168.192.in-addr.arpa"  {
type master;
file "192.168.10.zone";
};
#配置库文件
[15:31:35 root@centos8 named]#cd /var/named/
[15:31:43 root@centos8 named]#cp -p named.loopback 192.168.10.zone
[15:32:00 root@centos8 named]#vim 192.168.10.zone
$TTL 1D
@	IN SOA	ns1 admin.zhangzhuo.org. (
0	; serial
1D	; refresh
1H	; retry
1W	; expire
3H )	; minimum
NS	ns1.zhangzhuo.org.
72 PTR	www.zhanzghuo.org.
81 PTR  master.zhangzhuo.org.

#检查文件
[15:34:34 root@centos8 named]#named-checkzone 10.168.192.in-addr.arpa 192.168.10.zone
zone 10.168.192.in-addr.arpa/IN: loaded serial 0
OK
[15:36:49 root@centos8 named]#named-checkconf
#启动服务
[15:36:35 root@centos8 named]#systemctl start named

#测试
[15:36:46 root@centos8 named]#dig -t ptr 72.10.168.192.in-addr.arpa. @192.168.10.81
[15:37:13 root@centos8 named]#dig -x 192.168.10.72 @192.168.10.81
[15:40:44 root@centos8 ~]#host 192.168.10.72
[15:40:47 root@centos8 ~]#nslookup 192.168.10.81
[15:42:57 root@centos8 ~]#nslookup

> 192.168.10.72
> 72.10.168.192.in-addr.arpa	name = www.zhangzhuo.org.
```

# 六、实现从服务器

只有一台主DNS服务器，存在单点失败的问题，可以建立主DNS服务器的备份服务器，即从服务器来实现DNS服务的容错机制。从服务器可以自动和主服务器进行单向的数据同步，从而和主DNS服务器一样，也可以对外提供查询服务，但从服务器不提供数据更新服务。

## 6.1 DNS从服务器

1. 应该为一台独立的名称服务器
2. 主服务器的区域解析库文件中必须有一条NS记录指向从服务器
3. 从服务器只需要定义区域，而无须提供解析库文件；解析库文件应该放置于/var/named/slaves/目录中
4. 主服务器得允许从服务器作区域传送
5. 主从服务器时间应该同步，可通过ntp进行
6. bind程序的版本应该保持一致；否则，应该从高，主低

## 6.2 定义从区域

**格式：**

```bash
zone "ZONE_NAME" IN {
type slave;
masters { MASTER_IP; };
file "slaves/ZONE_NAME.zone";
};
```

## 6.3 实战案例：实现DNS从服务器

### 6.3.1 实验目的

```bash
搭建DNS主从服务器架构，实现DNS服务冗余
```

### 6.3.2 环境要求

```bash
需要四台主机
DNS主服务器：192.168.10.81
DNS从服务器:192.168.10.71
web服务器：192.168.10.72
DNS客户端：192.168.10.82
```

### 6.3.3 提前准备

```bash
关闭SElinux
关闭防火墙
时间同步
```

### 6.3.4 实现步骤

#### 6.3.4.1 主DNS服务端配置(参看前面案例)

```bash
yum install bind -y
#配置文件
[15:52:21 root@centos8 named]#vim /etc/named.conf
//  listen-on port 53 { 127.0.0.1; };
//  allow-query     { localhost; };
zone "zhangzhuo.org"  {
type master;
file "zhangzhuo.org.zone";
};
#区域配置文件
[15:58:42 root@centos8 named]#cp -p /var/named/named.localhost /var/named/zhangzhuo.org.zone
[15:59:17 root@centos8 named]#vim /var/named/zhangzhuo.org.zone
[16:02:08 root@centos8 named]#cat /var/named/zhangzhuo.org.zone
$TTL 1D
@	IN SOA	master admin.zhangzhuo.org. (
0	; serial
1D	; refresh
1H	; retry
1W	; expire
3H )	; minimum
NS	master
NS  slave
master 	A	192.168.10.81
slave	A	192.168.10.71
[16:02:25 root@centos8 named]#systemctl start named
[16:02:48 root@centos8 named]#rndc reload
server reload successful
```

#### 6.3.4.2 从DNS服务器配置

```bash
[15:56:20 root@centos7 ~]#yum install bind bind-utils.x86_64
#配置
[16:05:35 root@centos7 ~]#vim /etc/named.conf
// listen-on port 53 { 127.0.0.1; };
// allow-query     { localhost; };
#不允许其它主机进行区域传输
allow-transfer { none;};

[16:08:50 root@centos7 ~]#vim /etc/named.rfc1912.zones
zone "zhangzhuo.org" {
type slave;
masters {主服务器IP;};
file "slaves/zhanzghuo.org.slave";
};
[16:09:14 root@centos7 ~]#systemctl start named                     #第一次启动服务
[16:09:25 root@centos7 ~]#rndc reload                               #不是第一次启动服务
[16:09:31 root@centos7 ~]#ls /var/named/slaves/zhanzghuo.org.slave  #查看区域数据库文件是否生成
```

#### 6.3.4.3 客户端测试主从DNS服务架构

```bash
vim /etc/sysconfig/network-scripts/ifcfg-eth0
DNS1=主服务器
DNS2=从服务器
#验证从DNS服务器是否可以查询
dig www.magedu.org
curl www.magedu.org
#在主服务器上停止DNS服务
systemctl stop named
#验证从DNS服务器仍然可以查询
dig www.magedu.org
curl www.magedu.org
```

**主从重点：（面试）**

* 修改主DNS中的解析之后需要把区域的序列号修改，从服务器才会同步。不修改的话从服务器会认为文件没有修改，不会进行同步
* 主从复制时会同时使用UDP和TCP的53端口，其中只要由一个访问失败就不会复制
* 地址解析时只会使用UDP的53端口，跟TCP的53端口没有关系
* 953端口是DNS的一个管理端口
* allow-transfer { none;};   不允许其他主机进行区域传输，安全必备：主服务器允许从服务器就可以了，从服务器不允许任何人

# 七、实现子域

## 7.1 子域委派授权

将子域委派给其它主机管理，实现分布式DNS数据库

正向解析区域子域方法

**范例：定义两个子域区域**

```bash
shanghai.zhnagzhuo.org. IN NS ns1.ops.zhangzhuo.org.
shanghai.zhangzhuo.org. IN NS ns2.ops.zhangzhuo.org.
shenzhen.zhangzhuo.org. IN NS ns1.shenzhen.zhangzhuo.org.
shenzhen.zhangzhuo.org. IN NS ns2.shenzhen.zhnagzhuo.org.
ns1.zhangzhuo.magedu.org. IN A  1.1.1.1
ns2.zhangzhuo.magedu.org. IN A  1.1.1.2
ns1.zhangzhuo.magedu.org. IN A  1.1.1.3
ns2.zhangzhuo.magedu.org. IN A  1.1.1.4
```

## 7.2 范例: 实现DNS父域和子域服务

### 7.2.1 实验目的

![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-6b57d0e3.png)

```bash
搭建DNS父域和子域服务器
```

### 7.2.2 环境要求

```bash
需要五台主机
DNS父域服务器：192.168.10.81
DNS子域服务器：192.168.10.71
父域的web服务器：192.168.10.72，www.zhangzhuo.org
子域的web服务器：192.168.10.73,www.shanghai.zhangzhuo.org
DNS客户端：192.168.10.82
```

### 7.2.3 前提准备

```bash
关闭SElinux
关闭防火墙
时间同步
```

### 7.2.4 实现步骤

#### 7.2.4.1 在父域DNS服务器上实现主magedu.org域的主DNS服务

```bash
[16:54:45 root@centos8 named]#yum install bind

[16:59:45 root@centos8 named]#vim /etc/named.conf
#注释掉下面两行
// listen-on port 53 { 127.0.0.1; };
// allow-query     { localhost; };
#只允许从服务器进行区域传输
allow-transfer {192.168.10.71;};

#关闭加密验证
dnssec-enable no;
dnssec-validation no;

[17:02:11 root@centos8 named]#vim /etc/named.rfc1912.zones
#加上这段
zone "zhangzhuo.org" {
type master;
file "zhangzhuo.org.zone";
};

[17:03:39 root@centos8 named]#cp -p /var/named/named.localhost /var/named/zhangzhuo.org.zone
[17:06:58 root@centos8 named]#vim /var/named/zhangzhuo.org.zone
$TTL 1D
@	IN SOA	master admin.zhangzhuo.org. (
0	; serial
1D	; refresh
1H	; retry
1W	; expire
3H )	; minimum
NS	 master
shanghai NS  shanghains
master	    A	192.168.10.81
shanghains	A   192.168.10.71
websrv      A   192.168.10.72
www         CNAME websrv
```

#### 7.2.4.2 实现子域的DNS服务器

```bash
yum install bind -y

#注释掉下面两行
// listen-on port 53 { 127.0.0.1; };
// allow-query     { localhost; };
allow-transfer {none;};

[17:09:25 root@centos7 ~]#vim /etc/named.rfc1912.zones
zone "shanghai.zhangzhuo.org" {
type master;
file "shanghai.zhangzhuo.org.zone";
};

[17:11:23 root@centos7 ~]#cp -p /var/named/named.localhost /var/named/shanghai.zhangzhuo.org.zone
[17:11:31 root@centos7 ~]#vim /var/named/shanghai.zhangzhuo.org.zone
$TTL 1D
@	IN SOA	master admin.zhangzhuo.org (
0	; serial
1D	; refresh
1H	; retry
1W	; expire
3H )	; minimum
NS	master
master	A	192.168.10.71
websrv	A	192.168.10.73
www     CNAME   websrv
[17:14:47 root@centos7 ~]#systemctl restart named
[17:14:50 root@centos7 ~]#rndc reload
```

#### 7.2.4.4 在父域和子域的web服务器上安装httpd服务

```bash
#父域的web服务器利用上面案例（略）
#在子域的web服务器上安装http服务
[16:58:14 root@centos7 ~]#yum install httpd
[17:16:59 root@centos7 ~]#echo www.shanghai.zhangzhuo.org >/var/www/html/index.html
[17:18:39 root@centos7 ~]#systemctl start httpd
```

#### 7.2.4.5 客户端测试

```bash
#配置父DNS就可以了
[17:23:46 root@centos8 ~]#dig www.shanghai.zhangzhuo.org^C
[17:24:13 root@centos8 ~]#curl www.shanghai.zhangzhuo.org
[17:24:21 root@centos8 ~]#curl www.zhangzhuo.org
[17:24:38 root@centos8 ~]#dig www.zhangzhuo.org
```

# 八、实现DNS转发（缓存）服务器

## 8.1 DNS转发

利用DNS转发，可以将用户的DNS请求，转发至指定的DNS服务，而非默认的根DNS服务器，并将指定服务器查询的返回结果进行缓存，提高效率。

**注意：**

* **被转发的服务器需要能够为请求者做递归，否则转发请求不予进行**
* **在全局配置块中，关闭dnssec功能**

```bash
dnssec-enable no;
dnssec-validation no;
```

## 8.2 转发方式

### 8.2.1 全局转发

对非本机所负责解析区域的请求，全转发给指定的服务器

在全局配置块中实现：

```bash
Options {
forward first|only;
forwarders { ip;};
};
```

### 8.2.2 特定区域转发

仅转发对特定的区域的请求，比全局转发优先级高

```bash
zone "ZONE_NAME" IN {
type forward;
forward first|only;
forwarders { ip;};
};
```

* first：先转发至指定DNS服务器，如果无法解析查询请求，则本服务器再去根服务器查询
* only: 先转发至指定DNS服务器，如果无法解析查询请求，则本服务器将不再去根服务器查询

## 8.3 实战案例：实现DNS forward（缓存）服务器

### 8.3.1 实验目的

```bash
搭建DNS转发（缓存）服务器
```

### 8.3.2 环境要求

```bash
需要四台主机
DNS只缓存服务器：192.168.10.71
DNS主服务器:192.168.10.81
web服务器：192.168.10.72
DNS客户端：192.168.10.82
```

### 8.3.3 前提准备

```bash
关闭SElinux
关闭防火墙
时间同步
```

### 8.3.4 实现步骤

#### 8.3.4.1 实现转发（只缓存）DNS服务器

```bash
[19:19:19 root@centos7 ~]#yum install -y bind bind-utils.x86_64

[19:20:39 root@centos7 ~]#vim /etc/named.conf
#注释掉两行
// listen-on port 53 { 127.0.0.1; };
// allow-query     { localhost; };
forward first;
forwarders {192.168.10.81;};
#关闭dnsec功能
dnssec-enable no;
dnssec-validation no;

[19:21:36 root@centos7 ~]#systemctl start named
[19:21:43 root@centos7 ~]#rndc reload
```

#### 8.3.4.2 实现主DNS服务器

```bash
[19:19:24 root@centos8 ~]#yum install -y bind bind-utils.x86_64

[19:22:25 root@centos8 ~]#vim /etc/named.conf
#注释掉两行
// listen-on port 53 { 127.0.0.1; };
// allow-query     { localhost; };

[19:22:47 root@centos8 ~]#vim /etc/named.rfc1912.zones
zone "zhangzhuo.org" {
type master;
file "zhangzhuo.org.zone";
};

[19:24:07 root@centos8 ~]#cp -p /var/named/named.localhost /var/named/zhangzhuo.org.zone
[19:24:50 root@centos8 ~]#vim /var/named/zhangzhuo.org.zone
$TTL 1D
@	IN SOA	master admin.zhangzhuo.org. (
2019042214	; serial
1D	; refresh
1H	; retry
1W	; expire
3H )	; minimum
NS	  master
master	A	  192.168.10.81
websrv	A	  192.168.10.72
www     CNAME websrv
[19:30:37 root@centos8 ~]#systemctl start named
[19:30:44 root@centos8 ~]#rndc reload
```

#### 8.3.4.3 web服务配置（参看前面案例）

#### 8.3.4.4 在客户端测试

```bash
#客户端配置192.168.10.71的DNS
[19:33:52 root@centos8 ~]#curl www.zhangzhuo.org
[19:34:04 root@centos8 ~]#dig www.zhangzhuo.org
```

# 九、实现智能DNS

![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-a33ec6c1.png)

## 9.1 GSLB

**GSLB：Global Server Load Balance全局负载均衡**

GSLB是对服务器和链路进行综合判断来决定由哪个地点的服务器来提供服务，实现异地服务器群服务质量的保证

GSLB主要的目的是在整个网络范围内将用户的请求定向到最近的节点（或者区域）

GSLB分为基于DNS实现、基于重定向实现、基于路由协议实现，其中最通用的是基于DNS解析方式

**范例：在北京查询VIP使用网宿的CDN服务**

```bash
[19:50:33 root@centos8 ~]#dig www.vip.com

; <<>> DiG 9.11.20-RedHat-9.11.20-5.el8 <<>> www.vip.com
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 24311
;; flags: qr rd ra; QUERY: 1, ANSWER: 2, AUTHORITY: 0, ADDITIONAL: 0

;; QUESTION SECTION:
;www.vip.com.			IN	A

;; ANSWER SECTION:
www.vip.com.		180	IN	CNAME	shop.vip.com.vipgslb.com.  #wscdn 网宿服务商
shop.vip.com.vipgslb.com. 180	IN	A	183.6.216.43

;; Query time: 38 msec
;; SERVER: 223.6.6.6#53(223.6.6.6)
;; WHEN: Tue Jan 19 19:52:41 CST 2021
;; MSG SIZE  rcvd: 80
```

**范例: 在郑州查询VIP使用网宿的CDN服务**

```bash
[root@centos8 ~]#dig www.vip.com
; <<>> DiG 9.11.13-RedHat-9.11.13-3.el8 <<>> www.vip.com
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 41846
;; flags: qr rd ra; QUERY: 1, ANSWER: 2, AUTHORITY: 5, ADDITIONAL: 1
;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 4096
; COOKIE: c64336bd04f5165946e2a4115f5ec84d89fb312a09571ab0 (good)
;; QUESTION SECTION:
;www.vip.com. IN A
;; ANSWER SECTION:
www.vip.com. 121 IN CNAME www.vip.com.wscdns.com.
www.vip.com.wscdns.com. 2 IN A 111.6.176.42
;; AUTHORITY SECTION:
wscdns.com. 172742 IN NS dns5.cdn30.org.
wscdns.com. 172742 IN NS dns3.wscdns.org.
wscdns.com. 172742 IN NS dns2.wscdns.info.
wscdns.com. 172742 IN NS dns1.wscdns.org.
wscdns.com. 172742 IN NS dns4.wscdns.info.
;; Query time: 0 msec
;; SERVER: 127.0.0.1#53(127.0.0.1)
;; WHEN: Mon Sep 14 09:33:01 CST 2020
;; MSG SIZE rcvd: 239
```

## 9.2 CDN （Content Delivery Network）内容分发网络

![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-9fe9e808.png)

1. 用户向浏览器输入www.a.com这个域名，浏览器第一次发现本地没有dns缓存，则向网站的DNS服务器请求
2. 网站的DNS域名解析器设置了CNAME，指向了www.a.tbcdn.com,请求指向了CDN网络中的智能DNS负载均衡系统
3. 智能DNS负载均衡系统解析域名，把对用户响应速度最快的IP节点返回给用户；
4. 用户向该IP节点（CDN服务器）发出请求
5. 由于是第一次访问，CDN服务器会通过Cache内部专用DNS解析得到此域名的原web站点IP，向原站点服务器发起请求，并在CDN服务器上缓存内容
6. 请求结果发给用户

### 9.2.1 CDN服务商

* 服务商：阿里，腾讯，蓝汛，网宿，帝联等
* 智能DNS: dnspod dns.la

**范例: 浪潮使用网宿的CDN服务**

```bash
[19:54:58 root@centos8 ~]#dig www.inspur.com

; <<>> DiG 9.11.20-RedHat-9.11.20-5.el8 <<>> www.inspur.com
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 35916
;; flags: qr rd ra; QUERY: 1, ANSWER: 2, AUTHORITY: 0, ADDITIONAL: 0

;; QUESTION SECTION:
;www.inspur.com.			IN	A

;; ANSWER SECTION:
www.inspur.com.		56	IN	CNAME	www.inspur.com.wscdns.com.
www.inspur.com.wscdns.com. 56	IN	A	111.206.179.204

;; Query time: 21 msec
;; SERVER: 223.6.6.6#53(223.6.6.6)
;; WHEN: Tue Jan 19 19:56:52 CST 2021
;; MSG SIZE  rcvd: 84
```

## 9.3 智能DNS相关技术

### 9.3.1 bind中ACL

**ACL：把一个或多个地址归并为一个集合，并通过一个统一的名称调用**

注意：只能先定义后使用；因此一般定义在配置文件中，处于options的前面

**格式：**

```bash
acl acl_name {
ip;
net/prelen;
……
};
```

**范例：**

acl beijingnet {
172.16.0.0/16;
10.10.10.10;
};

### 9.3.2 bind有四个内置的acl

* none 没有一个主机
* any 任意主机
* localhost 本机
* localnet 本机的IP同掩码运算后得到的网络地址

### 9.3.3 访问控制的指令

* allow-query {}： 允许查询的主机；白名单
* allow-transfer {}：允许区域传送的主机；白名单
* allow-recursion {}: 允许递归的主机,建议全局使用
* allow-update {}: 允许更新区域数据库中的内容

### 9.3.4 view视图

#### 9.3.4.1 View：视图，将ACL和区域数据库实现对应关系，以实现智能DNS

* 一个bind服务器可定义多个view，每个view中可定义一个或多个zone
* 每个view用来匹配一组客户端
* 多个view内可能需要对同一个区域进行解析，但使用不同的区域解析库文件

**注意：**

* 一旦启用了view，所有的zone都只能定义在view中
* 仅在允许递归请求的客户端所在view中定义根区域
* 客户端请求到达时，是自上而下检查每个view所服务的客户端列表

#### 9.3.4.2 view 格式

```bash
view VIEW_NAME {
match-clients { beijingnet; };
zone “zhangzhuo.org” {
type master;
file “zhangzhuo.org.zone.bj”;
};
include “/etc/named.rfc1912.zones”;
};
view VIEW_NAME {
match-clients { shanghainet; };
zone “zhangzhuo.org” {
type master;
file “zhangzhuo.org.zone.sh”;
};
include “/etc/named.rfc1912.zones”;
};
```

## 9.4 实战案例：利用view实现智能DNS

### 9.4.1 实验目的

```bash
搭建DNS主从服务器架构，实现DNS服务冗余
```

### 9.4.2 环境要求

```bash
需要五台主机
DNS主服务器和web服务器1：192.168.10.81/24，172.16.10.81/24
web服务器2：192.168.10.71/24
web服务器3：172.16.10.71/16
DNS客户端1：192.168.10.82/24
DNS客户端2：172.16.10.83/16
```

### 9.4.3 前提准备

```bash
关闭SElinux
关闭防火墙
时间同步
```

### 9.4.4 实现步骤

#### 9.4.4.1 DNS 服务器的网卡配置

```bash
#配置两个IP地址
#eth0：192.168.10.81/24
#eth1: 172.16.10.81/24
[19:10:24 root@centos8 ~]#ip a
1: lo:  mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
inet 127.0.0.1/8 scope host lo
valid_lft forever preferred_lft forever
inet6 ::1/128 scope host
valid_lft forever preferred_lft forever
2: eth0:  mtu 1500 qdisc fq_codel state UP group default qlen 1000
link/ether 00:0c:29:62:36:f5 brd ff:ff:ff:ff:ff:ff
inet 192.168.10.81/24 brd 192.168.10.255 scope global noprefixroute eth0
valid_lft forever preferred_lft forever
inet6 fe80::94d6:6435:cd42:ceaf/64 scope link noprefixroute
valid_lft forever preferred_lft forever
3: eth1:  mtu 1500 qdisc fq_codel state UP group default qlen 1000
link/ether 00:0c:29:62:36:ff brd ff:ff:ff:ff:ff:ff
inet 172.16.10.81/24 brd 172.16.10.255 scope global noprefixroute eth1
valid_lft forever preferred_lft forever
inet6 fe80::938f:9644:a920:b8ee/64 scope link noprefixroute
valid_lft forever preferred_lft forever
```

#### 9.4.4.2 主DNS服务端配置文件实现view

```bash
[19:18:51 root@centos8 ~]#yum install bind bind-utils.x86_64 -y

[19:19:53 root@centos8 ~]#vim /etc/named.conf
#在文件最前面加下面行
acl beijingnet {
192.168.10.0/24;
};
acl shanghainet {
172.16.10.0/24;
};
acl othernet {
any;
};

#注释掉下面两行
// listen-on port 53 { 127.0.0.1; };
// allow-query     { localhost; };

#其它略

# 创建view

view beijingview {
match-clients {beijingnet;};
include "/etc/named.rfc1912.zones.bj";
};
view shanghaiview {
match-clients {shanghainet;};
include "/etc/named.rfc1912.zones.sh";
};
view otherview {
match-clients {othernet;};
include "/etc/named.rfc1912.zones.other";
};
include "/etc/named.root.key";
#默认的根域放在named.rfc1912.zones.other这几个文件
```

#### 9.4.4.3 实现区域配置文件

```bash
[19:33:03 root@centos8 etc]#vim /etc/named.rfc1912.zones.bj
zone "." IN {
type hint;
file "named.ca";
};
zone "zhangzhuo.org" {
type master;
file "zhangzhuo.org.zone.bj";
};
[19:33:53 root@centos8 etc]#vim /etc/named.rfc1912.zones.sh
zone "." IN {
type hint;
file "named.ca";
};
zone "zhangzhuo.org" {
type master;
file "zhangzhuo.org.zone.sh";
};
[19:34:15 root@centos8 etc]#vim /etc/named.rfc1912.zones.other
zone "." IN {
type hint;
file "named.ca";
};
zone "zhangzhuo.org" {
type master;
file "zhangzhuo.org.zone.other";
};
```

#### 9.4.4.4 创建区域数据库文件

```bash
[19:44:22 root@centos8 named]#cat zhangzhuo.org.zone.bj
$TTL 1D
@	IN SOA	master admin.zhangzhuo.org. (
0	; serial
1D	; refresh
1H	; retry
1W	; expire
3H )	; minimum
NS	   master
master	A	   192.168.10.81
websrv	A          192.168.10.71
www     CNAME  websrv
[19:51:26 root@centos8 named]#cat zhangzhuo.org.zone.sh 
$TTL 1D
@	IN SOA	master admin.zhangzhuo.org (
0	; serial
1D	; refresh
1H	; retry
1W	; expire
3H )	; minimum
NS	  master
master	A	  192.168.10.81
websrv	A         172.16.10.72
www     CNAME websrv
[19:51:31 root@centos8 named]#cat zhangzhuo.org.zone.other
$TTL 1D
@	IN SOA	master admin.zhangzhuo.org. (
0	; serial
1D	; refresh
1H	; retry
1W	; expire
3H )	; minimum
NS	  master
master	A	  192.168.10.81
websrv	A	  127.0.0.1
www     CNAME websrv

[20:03:03 root@centos8 named]#systemctl start named
```

#### 9.4.4.5 实现位于不同区域的三个WEB服务器

```bash
#分别在三台主机上安装http服务
指定首页
```

#### 9.4.4.6 客户端测试

```bash
#分别在三台主机上访问
#DNS客户端1：192.168.10.82 实现，确保DNS指向192.168.10.81
[20:05:53 root@centos8 ~]#curl www.zhangzhuo.org
web 192.168.10.71
[20:06:01 root@centos8 ~]#hostname -I
192.168.10.82
#DNS客户端2：172.16.10.83 实现，确保DNS指向172.16.10.81
[20:08:48 root@centos8 ~]#curl www.zhangzhuo.org
web 172.16.10.72
[20:09:20 root@centos8 ~]#hostname -I
172.16.10.83
```

# 十、DNS排错

* SERVFAIL：The nameserver encountered a problem while processing the query.可使用dig +trace排错，可能是网络和防火墙导致
* NXDOMAIN：The queried name does not exist in the zone.可能是CNAME对应的A记录不存在导致
* REFUSED：The nameserver refused the client's DNS request due to policy restrictions.可能是DNS策略导致

# 十一、实战案例：综合案例，实现Internet 的DNS 服务架构

## 11.1 实验目的

![mage11.png](https://b3logfile.com/file/2021/01/mage11-fa384936.png)

搭建DNS实现internet dns架构

## 11.2 环境要求

```bash
需要8台主机
DNS客户端：192.168.10.74/24
本地DNS服务器（只缓存）：192.168.10.73/24
转发目标DNS服务器：192.168.10.72/24
根DNS服务器：192.168.10.84/24
org域DNS服务器：192.168.10.83/24
magedu.org域主DNS服务器：192.168.10.81/24
magedu.org域从DNS服务器：192.168.10.82/24
www.magedu.org的WEB服务器：192.168.10.71/24
```

## 11.3 前提准备

```bash
关闭SElinux
关闭防火墙
时间同步
网络环境按照示意图进行配置IP
```

## 11.4 实现步骤

### 11.4.1 实现WEB服务

```bash
#在web服务器192.168.10.71/24实现
[14:35:35 root@centos7 ~]#yum install -y httpd
[14:48:11 root@centos7 ~]#echo www.zhangzhuo.org >/var/www/html/index.html
[14:48:29 root@centos7 ~]#systemctl start httpd.service
```

### 11.4.2 实现zhangzhuo.org域的主DNS服务器

```bash
#在zhangzhuo.org域主DNS服务器192.168.10.81/24实现
[14:50:25 root@centos8 ~]#yum install bind bind-utils.x86_64 -y
[14:51:47 root@centos8 ~]#vim /etc/named.conf
//  listen-on port 53 { 127.0.0.1; };
//  allow-query     { localhost; };
allow-transfer {192.168.10.82;};     #设置允许从DNS服务器可以进行区域传输
[14:53:28 root@centos8 ~]#vim /etc/named.rfc1912.zones
zone "zhangzhuo.org" {
type master;
file "zhangzhuo.org.zone";
};
[14:54:50 root@centos8 ~]#cp -p /var/named/named.localhost /var/named/zhangzhuo.org.zone
[14:55:24 root@centos8 ~]#vim /var/named/zhangzhuo.org.zone
$TTL 1D
@	IN SOA	master admin.zhnagzhuo.org (
2101211456	; serial
1D	; refresh
1H	; retry
1W	; expire
3H )	; minimum
NS	    master
NS      slave
master	A	    192.168.10.81
slave   A       192.168.10.82
websrv	A	    192.168.10.71
www     CNAME   websrv
#测试，之后的DNS配置文件配置完成后最好都测试
[14:58:16 root@centos8 ~]#named-checkconf
[14:58:28 root@centos8 ~]#named-checkzone zhangzhuo.org /var/named/zhangzhuo.org.zone
zone zhangzhuo.org/IN: loaded serial 2101211456
OK
[14:59:15 root@centos8 ~]#systemctl restart named
```

### 11.4.3 实现zhangzhuo.org域的从DNS服务器配置

```bash
#在zhangzhuo.org域从DNS服务器192.168.10.82/24上实现
[15:01:13 root@centos8 ~]#yum install bind bind-utils.x86_64 -y
[15:01:56 root@centos8 ~]#vim /etc/named.conf
//  listen-on port 53 { 127.0.0.1; };
//  allow-query     { localhost; };
allow-transfer {none;};
[15:02:48 root@centos8 ~]#vim /etc/named.rfc1912.zones
zone "zhangzhuo.org" {
type slave;
masters {192.168.10.81;};
file "slaves/zhangzhuo.org.slave";   #主DNS的IP地址
};
[15:04:38 root@centos8 ~]#systemctl restart named
[15:04:45 root@centos8 ~]#ll /var/named/slaves/    #如果看到文件说明成功
total 4
-rw-r--r-- 1 named named 426 Jan 21 15:04 zhangzhuo.org.slave
```

### 11.4.4 实现org域的主DNS服务器

```bash
#在org域的主DNS服务器192.168.10.83/24上实现
[15:10:54 root@centos8 ~]#yum install bind -y
[15:12:10 root@centos8 ~]#vim /etc/named.conf
//  listen-on port 53 { 127.0.0.1; };
//  allow-query     { localhost; };
[15:12:59 root@centos8 ~]#vim /etc/named.rfc1912.zones
zone "org" {
type master;
file "org.zone";
};
[15:14:15 root@centos8 ~]#cp -p /var/named/named.localhost /var/named/org.zone
[15:14:44 root@centos8 ~]#vim /var/named/org.zone
$TTL 1D
@	IN SOA	master admin.zhangzhuo.org (
0	; serial
1D	; refresh
1H	; retry
1W	; expire
3H )	; minimum
NS	 master
zhangzhuo    NS  zhangzhuons1
zhanzghuo    NS  zhangzhuons2
master       A   192.168.10.83
zhangzhuons1 A   192.168.10.81
zhangzhuons1 A   192.168.10.82
[15:17:55 root@centos8 ~]#systemctl restart named
```

### 11.4.5 实现根域的主DNS服务器

```bash
#在根域的主DNS服务器192.168.10.84/24上实现
[15:10:54 root@centos8 ~]#yum install bind -y
[15:12:10 root@centos8 ~]#vim /etc/named.conf
//  listen-on port 53 { 127.0.0.1; };
//  allow-query     { localhost; };
#将下面行改为
zone "." IN {
type master;
file "root.zone";
};
[15:21:33 root@centos8 ~]#cp -p /var/named/named.localhost /var/named/root.zone
[15:22:11 root@centos8 ~]#vim /var/named/root.zone
$TTL 1D
@	IN SOA	master admin.zhangzhuo.org (
0	; serial
1D	; refresh
1H	; retry
1W	; expire
3H )	; minimum
NS	master
org     NS  orgns
master	A	192.168.10.84
orgns	A	192.168.10.83
[15:24:12 root@centos8 ~]#systemctl restart named
```

### 11.4.6 实现转发目标的DNS服务器

```bash
#在转发目标的DNS服务器192.168.10.72/24上实现
[15:27:17 root@centos7 ~]#yum install -y bind
//  listen-on port 53 { 127.0.0.1; };
//  allow-query     { localhost; };
dnssec-enable no;
dnssec-validation no;
[15:32:01 root@centos7 ~]#vim /var/named/named.ca  #只留这俩行
.           518400  IN  NS  a.root-servers.net.
a.root-servers.net. 3600000 IN A 192.168.10.84
[15:32:53 root@centos7 ~]#systemctl restart named
```

### 11.4.7 实现本地只缓存DNS服务器

```bash
#在转发目标的DNS服务器192.168.10.73/24上实现
[15:10:54 root@centos8 ~]#yum install bind -y
[15:12:10 root@centos8 ~]#vim /etc/named.conf
//  listen-on port 53 { 127.0.0.1; };
//  allow-query     { localhost; };
forward only;
forwarders {192.168.10.72;};
dnssec-enable no;
dnssec-validation no;
[15:38:47 root@centos7 ~]#systemctl restart named
```

### 11.4.8 客户端测试

```bash
#在192.168.10.74/24客户端测试
[15:40:23 root@centos7 ~]#cat /etc/resolv.conf
nameserver 192.168.10.73
[15:41:50 root@centos7 ~]#dig www.zhangzhuo.org

; <<>> DiG 9.11.4-P2-RedHat-9.11.4-26.P2.el7_9.3 <<>> www.zhangzhuo.org
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 33786
;; flags: qr rd ra; QUERY: 1, ANSWER: 2, AUTHORITY: 1, ADDITIONAL: 3

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 4096
;; QUESTION SECTION:
;www.zhangzhuo.org.		IN	A

;; ANSWER SECTION:
www.zhangzhuo.org.	85937	IN	CNAME	websrv.zhangzhuo.org.
websrv.zhangzhuo.org.	85937	IN	A	192.168.10.71

;; AUTHORITY SECTION:
zhangzhuo.org.		85937	IN	NS	zhangzhuons1.org.

;; ADDITIONAL SECTION:
zhangzhuons1.org.	85937	IN	A	192.168.10.81
zhangzhuons1.org.	85937	IN	A	192.168.10.82

;; Query time: 0 msec
;; SERVER: 192.168.10.73#53(192.168.10.73)
;; WHEN: Thu Jan 21 15:43:00 CST 2021
;; MSG SIZE  rcvd: 142

[15:43:00 root@centos7 ~]#curl www.zhangzhuo.org
www.zhangzhuo.org
```

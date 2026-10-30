---
title: "keepalived服务"
date: 2021-05-17T16:42:05+08:00
draft: false
description: "围绕 VRRP 与 Keepalived 架构，完成高可用集群的安装、配置和故障切换。"
cover: "https://b3logfile.com/bing/20200926.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["应用服务"]
tags: ["keepalived"]
toc: true
---
# 一、keepalived介绍

LB(Load Balance)  #负载均衡  #lvs/HAProxy/nginx（http/upstream, stream/upstream ）

HA(High Availability) #高可用集群，数据库、Zookeeper、Redis SPoF: Single Point of Failure，解决单点故障

HPC #高性能集群(High Performance Computing)     https://www.top500.org

系统可用性：SLA(Service-Level

```bash
95%=(60*24*30)*(1-0.9995)
（指标）=99.9%, ..., 99.999%，99.9999%
```

- 提升系统高用性的解决方案之降低MTTR- Mean Time To Repair(平均故障时间)
  - 解决方案：建立冗余机制
  - active/passive 主/备
  - active/active 双主
  - active --> HEARTBEAT --> passive
  - active <--> HEARTBEAT <--> active

## 1.1 keepalived介绍

- **keepalived:**
  - vrrp协议的软件实现，原生设计目的为了高可用ipvs服务
- **功能：**
  - 基于vrrp协议完成地址流动
  - 为vip地址所在的节点生成ipvs规则(在配置文件中预先定义)
  - 为ipvs集群的各RS做健康状态检测
  - 基于脚本调用接口通过执行脚本完成脚本中定义的功能，进而影响集群事务，以此 支持nginx、haproxy等服务

### 1.1.1 VRRP-网络层实现

![image-20200326103750386-780x420](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20200326103750386-780x420.png)

**VRRP相关术语**

- 虚拟路由器：Virtual Router
- 虚拟路由器标识：VRID(0-255)，唯一标识虚拟路由器
- VIP：Virtual IP
- VMAC：Virutal MAC (00-00-5e-00-01-VRID)
- 物理路由器：
  - master：主设备
  - backup：备用设备
  - priority：优先级

**VRRP相关技术**

通告：心跳，优先级等；周期性

工作方式：抢占式，非抢占式

**安全认证：**

- 无认证
- 简单字符认证：预共享密钥
- MD5

**工作模式：**

- 主/备：单虚拟路径器
- 主/主：主/备（虚拟路由器1），备/主（虚拟路由器2）

## 1.2 Keepalived 架构

官方文档：

https://keepalived.org/doc/

http://keepalived.org/documentation.html

![11](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/11.png)

**组件：**

- 用户空间核心组件：
  - vrrp stack-VIP消息通告
  - checkers-监测real server
  - system call-标记real server权重
  - SMTP-邮件组件
  - ipvs wrapper-生成IPVS规则
  - Netlink Reflector-网络接口
  - WatchDog-监控进程
- 控制组件：配置文件解析器
- IO复用器
- 内存管理组件

**Keepalived进程树**

```bash
Keepalived  <-- Parent process monitoring children
\_ Keepalived   <-- VRRP child
\_ Keepalived   <-- Healthchecking child
```

**Keepalived环境准备**

```bash
各节点时间必须同步      ntp，chrony
关闭selinux和防火墙
```

**Keepalived 相关文件**

- 软件包名：keepalived
- 主程序文件：/usr/sbin/keepalived
- 主配置文件：/etc/keepalived/keepalived.conf
- 配置文件示例：/usr/share/doc/keepalived
- Unit File：/lib/systemd/system/keepalived.service
- Unit File的环境配置文件：
  - /etc/sysconfig/keepalived CentOS
  - /etc/default/keepalived Ubuntu

# 二、keepalived安装

## 2.1 包安装

### 2.1.1 Centos安装

```bash
[10:18:08 root@centos8 ~]#yum install keepalived -y
[10:18:20 root@centos8 ~]#yum info keepalived
Last metadata expiration check: 0:23:40 ago on Tue 06 Apr 2021 09:55:00 AM CST.
Installed Packages
Name         : keepalived
Version      : 2.0.10
[10:20:38 root@centos8 ~]#systemctl enable --now keepalived.service 
[10:20:04 root@centos8 ~]#pstree -p
           ├─keepalived(30914)─┬─keepalived(30915)
           │                   └─keepalived(30916)
```

### 2.1.2 ubuntu安装

```bash
root@zhang:~# apt install -y keepalived
root@zhang:~# dpkg -s keepalived 
Package: keepalived
Status: install ok installed
Priority: optional
Section: admin
Installed-Size: 1220
Maintainer: Ubuntu Developers <ubuntu-devel-discuss@lists.ubuntu.com>
Architecture: amd64
Version: 1:2.0.19-2
root@zhang:~# cp /usr/share/doc/keepalived/samples/keepalived.conf.sample /etc/keepalived/keepalived.conf
root@zhang:~# systemctl start keepalived.service
```

## 2.2 编译安装

### 2.2.1 centos安装

```bash
[11:04:37 root@centos8 keepalived-2.2.2]#yum install -y  make autoconf automake  openssl-devel libnl3-devel  iptables-devel  net-snmp-devel glib2-devel pcre2-devel   libmnl-devel systemd-devel  epel-release  texlive texlive-titlesec texlive-framed texlive-threeparttable texlive-wrapfig texlive-multirow 
[11:05:20 root@centos8 ~]#tar xf keepalived-2.2.2.tar.gz 
[11:05:39 root@centos8 ~]#cd keepalived-2.2.2/
[11:05:41 root@centos8 keepalived-2.2.2]#./configure --prefix=/apps/keepalived
[11:05:58 root@centos8 keepalived-2.2.2]#make
[11:06:48 root@centos8 keepalived-2.2.2]#make install
[11:29:56 root@centos8 ~]#cp -r /apps/keepalived/etc/keepalived /etc/ 
#service文件自动生成
[11:29:56 root@centos8 ~]#systemctl start keepalived.service
```

### 2.2.2 ubuntu安装

```bash
root@zhang:~# apt install -y build-essential pkg-config  libipset-dev libnl-3-dev libnl-genl-3-dev libssl-dev libxtables-dev libip4tc-dev libip6tc-dev libipset-dev libnl-3-dev libnl-genl-3-dev libssl-dev libmagic-dev libsnmp-dev libglib2.0-dev libpcre2-dev libnftnl-dev libmnl-dev libsystemd-dev
root@zhang:~# tar xf keepalived-2.2.2.tar.gz 
root@zhang:~# cd keepalived-2.2.2/
root@zhang:~/keepalived-2.2.2# ./configure --prefix=/apps/keepalived
root@zhang:~/keepalived-2.2.2# make 
root@zhang:~/keepalived-2.2.2# make install
root@zhang:~/keepalived-2.2.2# cp /apps/keepalived/etc/keepalived /etc/ -r
```

# 三、keepalived配置文件说明

## 3.1 配置文件组成部分

`/etc/keepalived/keepalived.conf `配置组成

```bash
-GLOBAL CONFIGURATION
Global definitions：定义邮件配置，route_id，vrrp配置，多播地址等
-VRRP CONFIGURATION
VRRP instance(s)：定义每个vrrp虚拟路由器
-LVS CONFIGURATION
Virtual server group(s)
Virtual server(s)：LVS集群的VS和RS
```

## 3.2 配置文件语法说明

### 3.2.1 全局配置

```bash
global_defs {
   notification_email {
     acassen@firewall.loc #keepalived 发生故障切换时邮件发送的目标邮箱，可以按行区分写多个
     failover@firewall.loc
     sysadmin@firewall.loc
   }   
   notification_email_from Alexandre.Cassen@firewall.loc #发邮件的地址
   smtp_server 192.168.200.1  #邮件服务器地址
   smtp_connect_timeout 30    #邮件服务器连接timeout
   router_id LVS_DEVEL        #每个keepalived主机唯一标识，建议使用当前主机名，但多节点重名不影响
   vrrp_skip_check_adv_addr   #对所有通告报文都检查，会比较消耗性能，启用此配置后，如果收到的通告报文和上一个报文是同一个路由器，则跳过检查，默认值为全检查
   vrrp_strict                #严格遵守VRRP协议,禁止以下状况:1.无VIP地址 2.配置了单播邻居 3.在VRRP版本2中有IPv6地址，开启动此项会自动开启iptables防火墙规则，建议关闭此项配置
   vrrp_garp_interval 0       #gratuitous ARP messages报文发送延迟，0表示不延迟
   vrrp_gna_interval 0        #unsolicited NA messages （不请自来）消息发送延迟
   vrrp_mcast_group4 224.0.0.18  #指定组播IP地址，默认值：224.0.0.18 范围224.0.0.0到239.255.255.255
  vrrp_iptables              #开启此项，当vrrp_strict开启时，不添加防火墙规则，否则VIP无法访问
}
```

### 3.2.2 配置虚拟路由器

```bash
#配置方式
vrrp_instance <STRING> {
    配置参数
    ......
 }
vrrp_instance VI_1 {
    state MASTER|BACKUP    #当前节点在此虚拟路由器上的初始状态，状态为MASTER或者BACKUP  
    interface eth0         #绑定为当前虚拟路由器使用的物理接口，如ens32,eth0,bond0,br0
    virtual_router_id 51  #每个虚拟路由器惟一标识，范围：0-255，每个虚拟路由器此值必须唯一，否则服务无法启动，同属一个虚拟路由器的多个keepalived节点必须相同
    priority 100           #当前物理节点在此虚拟路由器的优先级，范围：1-254，每个keepalived主机节点此值不同
    advert_int 1          #vrrp通告的时间间隔，默认1s                                                          
    authentication {  #认证机制
        auth_type HA|PASS
        auth_pass 1111   #预共享密钥，仅前8位有效，同一个虚拟路由器的多个keepalived节点必须一样
    }
    virtual_ipaddress { #虚拟IP
       <IPADDR>/<MASK> brd <IPADDR> dev <STRING> scope <SCOPE> label <LABEL>
        192.168.200.100    #指定VIP，不指定网卡，默认为eth0,注意：不指定/prefix,默认为/32
        192.168.200.101/24 dev eth1                 #指定VIP的网卡
        192.168.200.102/24 dev eth2 label eth2:1    #指定VIP的网卡label 
    }
    track_interface { #配置监控网络接口，一旦出现故障，则转为FAULT状态实现地址转移
    eth0
    eth1
    …
	} 
}
```

#### 3.2.2.1 配置示例

keepalived编译安装2.2.2，即使加vrrp_strict也不会有iptables规则

```bash
[14:09:52 root@centos8 ~]#cat /etc/keepalived/keepalived.conf 
! Configuration File for keepalived

global_defs {
   notification_email {
     acassen@firewall.loc
     failover@firewall.loc
     sysadmin@firewall.loc
   }
   notification_email_from Alexandre.Cassen@firewall.loc
   smtp_server 192.168.200.1
   smtp_connect_timeout 30
   router_id LVS_DEVEL
   vrrp_skip_check_adv_addr
   vrrp_strict       #开启限制，会自动生效防火墙设置，导致无法访问VIP
   vrrp_garp_interval 0
   vrrp_gna_interval 0
}

vrrp_instance VI_1 {
    state MASTER
    interface eth0
    virtual_router_id 80   #修改此行
    priority 100
    advert_int 1
    authentication {
        auth_type PASS
        auth_pass 1111
    }
    virtual_ipaddress {
        192.168.200.16
        192.168.200.17
        192.168.200.18
    }
}
[14:13:38 root@centos8 ~]#systemctl start keepalived.service
[14:14:16 root@centos8 ~]#ip a
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
    link/ether 00:0c:29:7b:a8:b9 brd ff:ff:ff:ff:ff:ff
    inet 192.168.10.81/24 brd 192.168.10.255 scope global noprefixroute eth0
       valid_lft forever preferred_lft forever
    inet 192.168.200.16/32 scope global eth0
       valid_lft forever preferred_lft forever
    inet 192.168.200.17/32 scope global eth0
       valid_lft forever preferred_lft forever
    inet 192.168.200.18/32 scope global eth0
       valid_lft forever preferred_lft forever
    inet6 fe80::94d6:6435:cd42:ceaf/64 scope link noprefixroute 
       valid_lft forever preferred_lft forever
[root@centos7 ~]#iptables -vnL
Chain INPUT (policy ACCEPT 59 packets, 3372 bytes)
 pkts bytes target     prot opt in     out     source               destination         
    0     0 DROP       all  --  *      *       0.0.0.0/0            192.168.200.16      
    0     0 DROP       all  --  *      *       0.0.0.0/0            192.168.200.17      
    0     0 DROP       all  --  *      *       0.0.0.0/0            192.168.200.18      

Chain FORWARD (policy ACCEPT 0 packets, 0 bytes)
 pkts bytes target     prot opt in     out     source               destination         

Chain OUTPUT (policy ACCEPT 33 packets, 6940 bytes)
 pkts bytes target     prot opt in     out     source               destination  

[root@centos7 ~]#ping 192.168.200.16
PING 192.168.200.16 (192.168.200.16) 56(84) bytes of data.
^C
--- 192.168.200.16 ping statistics ---
6 packets transmitted, 0 received, 100% packet loss, time 5002ms

# 如果是CentOS 8 ，会显示以下warning 
[root@centos8 ~]#iptables -vnL
Chain INPUT (policy ACCEPT 0 packets, 0 bytes)
 pkts bytes target     prot opt in     out     source               destination         

Chain FORWARD (policy ACCEPT 0 packets, 0 bytes)
 pkts bytes target     prot opt in     out     source               destination         

Chain OUTPUT (policy ACCEPT 0 packets, 0 bytes)
 pkts bytes target     prot opt in     out     source               destination         
# Warning: iptables-legacy tables present, use iptables-legacy to see them

#无法访问VIP
[root@centos8 ~]#ping 192.168.200.16
PING 192.168.200.16 (192.168.200.16) 56(84) bytes of data.
^C
--- 192.168.200.16 ping statistics ---
6 packets transmitted, 0 received, 100% packet loss, time 143ms
```

**实现独立子配置文件**

当生产环境复杂时，`/etc/keepalived/keepalived.conf `文件中内容过多，不易管理，可以将不同集群的配置，比如：不同集群的VIP配置放在独立的子配置文件中

```
[14:36:07 root@centos8 ~]#mkdir /etc/keepalived/conf.d
[root@ka1-centos8 ~]#tail -n1 /etc/keepalived/keepalived.conf
[14:38:49 root@centos8 ~]#tail -n1 /etc/keepalived/keepalived.conf 
include /etc/keepalived/conf.d/*.conf
```

# 四、配置详细

## 4.1 实现master/slave的Keepalived 单主架构

### 4.1.1 MASTER配置

```bash
! Configuration File for keepalived

global_defs {
   notification_email {
     root@localhost  #keepalived 发生故障切换时邮件发送的目标邮箱，可以按行区分写多个
   }
   notification_email_from keepalived@localhost  #发邮件的地址
   smtp_server 127.0.0.1    #邮件服务器地址
   smtp_connect_timeout 30      #邮件服务器连接timeout
   router_id ke1.zhangzhuo.org          #每个keepalived主机唯一标识，建议使用当前主机名，但多节点重名不影响
   vrrp_skip_check_adv_addr     #对所有通告报文都检查，会比较消耗性能，启用此配置后，如果收到的通告报文和上一个报文是同一个路由器，则跳过检查，默认值为全检查
   vrrp_strict                  #严格遵守VRRP协议,禁止以下状况:1.无VIP地址 2.配置了单播邻居 3.在VRRP版本2中有IPv6地址，开启动此项会自动开启iptables防火墙规则，建议关闭此项配置
   vrrp_garp_interval 0         #gratuitous ARP messages报文发送延迟，0表示不延迟
   vrrp_gna_interval 0          #unsolicited NA messages （不请自来）消息发送延迟
   vrrp_mcast_group4 224.0.0.18 #指定组播IP地址，默认值：224.0.0.18 范围224.0.0.0到239.255.255.255
    vrrp_iptables              #开启此项，当vrrp_strict开启时，不添加防火墙规则，否则VIP无法访问
}
vrrp_instance VI_MASTER {
    state MASTER      #在另一个结点上为BACKUP
    interface eth0
    virtual_router_id 66  #每个虚拟路由器必须唯一，同属一个虚拟路由器的多个keepalived节点必须相同
    priority 100      #在另一个结点上为80
    advert_int 1
    authentication {
        auth_type PASS  #预共享密钥认证，同一个虚拟路由器的keepalived节点必须一样
        auth_pass 12345678
    }
    virtual_ipaddress {
        192.168.10.10 dev eth0 label eth0:10
    }
}
```

### 4.1.2 BACKUP配置

```bash
global_defs {
   notification_email {
     root@localhost  
   }
   notification_email_from root@localhost  
   smtp_server 127.0.0.1    
   smtp_connect_timeout 30      
   router_id ke2.zhangzhuo.org  #修改此行        
   vrrp_skip_check_adv_addr     
   vrrp_strict                  
   vrrp_garp_interval 0         
   vrrp_gna_interval 0          
   vrrp_mcast_group4 224.0.0.18 到239.255.255.255
   vrrp_iptables              
}
vrrp_instance VI_MASTER {
    state BACKUP    #修改此行
    interface eth0
    virtual_router_id 66 
    priority 80     #修改此行
    advert_int 1
    authentication {
        auth_type PASS
        auth_pass 12345678
    }
    virtual_ipaddress {
        192.168.10.10 dev eth0 label eth0:10
    }
}
```

### 4.1.3 测试

```bash
[15:55:31 root@centos8 ~]#tcpdump -i eth0 -nn host 224.0.0.18
dropped privs to tcpdump
tcpdump: verbose output suppressed, use -v or -vv for full protocol decode
listening on eth0, link-type EN10MB (Ethernet), capture size 262144 bytes
15:55:35.020126 IP 192.168.10.81 > 224.0.0.18: VRRPv2, Advertisement, vrid 66, prio 100, authtype none, intvl 1s, length 20
15:55:36.021281 IP 192.168.10.81 > 224.0.0.18: VRRPv2, Advertisement, vrid 66, prio 100, authtype none, intvl 1s, length 20
15:55:37.022282 IP 192.168.10.81 > 224.0.0.18: VRRPv2, Advertisement, vrid 66, prio 100, authtype none, intvl 1s, length 20
#当前配置的模式为抢占模式，如果MASTER挂掉BACKUP会接管，如果MASTER恢复会立马抢占过来
[16:08:50 root@ke1 ~]#ifconfig 
eth0:10: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet 192.168.10.10  netmask 255.255.255.255  broadcast 0.0.0.0
        ether 00:0c:29:7b:a8:b9  txqueuelen 1000  (Ethernet)
#停止服务后地址会被BACKUP接管
[16:08:55 root@ke1 ~]#systemctl stop keepalived.service
[16:09:24 root@ke1 ~]#ifconfig
#重新启动会立马抢回来
[16:09:37 root@ke1 ~]#systemctl start keepalived.service
[16:13:07 root@ke1 ~]#ifconfig 
eth0:10: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet 192.168.10.10  netmask 255.255.255.255  broadcast 0.0.0.0
        ether 00:0c:29:7b:a8:b9  txqueuelen 1000  (Ethernet)
```

### 4.1.4 非抢占模式

默认为抢占模式，即当高优先级的主机恢复在线后，会抢占低先级的主机的master角色，造成网络抖动，建议设置为非抢占模式 nopreempt ，即高优级主机恢复后，并不会抢占低优先级主机的master角色

**注意：要关闭 VIP抢占，必须将各 keepalived 服务器state配置为BACKUP**

```bash
#ha1主机配置
vrrp_instance VI_MASTER {
    state BACKUP    #都为BACKUP  
    interface eth0
    virtual_router_id 66  
    priority 100      #优先级高
    advert_int 1
    nopreempt         #非抢占模式，添加此行，都为nopreempt
    authentication {
        auth_type PASS  #预共享密钥认证，同一个虚拟路由器的keepalived节点必须一样
        auth_pass 12345678
    }
    virtual_ipaddress {
        192.168.10.10 dev eth0 label eth0:10
    }
}
#h2主机配置
vrrp_instance VI_MASTER {
    state BACKUP   #都为BACKUP
    interface eth0
    virtual_router_id 66
    priority 80   #优先级低
    advert_int 1
    nopreempt     #添加此行，都为nopreempt
    authentication {
        auth_type PASS
        auth_pass 12345678
    }
    virtual_ipaddress {
        192.168.10.10 dev eth0 label eth0:10
    }
}
```

### 4.1.5 抢占延迟模式

抢占延迟模式，即优先级高的主机恢复后，不会立即抢回VIP，而是延迟一段时间（默认300s）再抢回 VIP

**preempt_delay  #s   指定抢占延迟时间为#s，默认延迟300s**

**注意：需要各keepalived服务器state为BACKUP**

```bash
#ke1主机配置
vrrp_instance VI_MASTER {
    state BACKUP      #都为BACKUP
    interface eth0
    virtual_router_id 66  
    priority 100     
    advert_int 1
    preempt_delay 60s  #抢占延迟模式，默认延迟300s
    authentication {
        auth_type PASS  
        auth_pass 12345678
    }
    virtual_ipaddress {
        192.168.10.10 dev eth0 label eth0:10
    }
}
#ke2主机配置
vrrp_instance VI_MASTER {
    state BACKUP   
    interface eth0
    virtual_router_id 66
    priority 80
    advert_int 1
    authentication {
        auth_type PASS
        auth_pass 12345678
    }
    virtual_ipaddress {
        192.168.10.10 dev eth0 label eth0:10
    }
}
```

### 4.1.6 VIP单播配置

默认keepalived主机之间利用多播相互通告消息，会造成网络拥塞，可以替换成单播，减少网络流量

**注意：启用单播，不能启用 vrrp_strict**

```bash
global_defs {
#   vrrp_strict                 
#   vrrp_iptables 
}
#分别在各个keepalived 节点设置对方主机的IP，建议设置为专用于对应心跳线网络的地址，而非使用业务网络
unicast_src_ip <IPADDR>  #指定单播的源IP
unicast_peer {
    <IPADDR>     # #指定单播的对方目标主机IP
    ......
}
```

范例：

```bash
#ke1配置
vrrp_instance VI_MASTER {
    state MASTER    
    interface eth0
    virtual_router_id 66  
    priority 100      
    advert_int 1
    authentication {
        auth_type PASS  
        auth_pass 12345678
    }
    virtual_ipaddress {
        192.168.10.10 dev eth0 label eth0:10
    }
    unicast_src_ip 192.168.10.81
    unicast_peer{
        192.168.10.82
    }
}
#ke2配置
vrrp_instance VI_MASTER {
    state BACKUP   
    interface eth0
    virtual_router_id 66
    priority 80
    advert_int 1
    nopreempt
    authentication {
        auth_type PASS
        auth_pass 12345678
    }
    virtual_ipaddress {
        192.168.10.10 dev eth0 label eth0:10
    }
    unicast_src_ip 192.168.10.82
    unicast_peer{
        192.168.10.81
    }
}
#抓包测试
[16:36:05 root@ke1 ~]#tcpdump -i eth0 -nn host 192.168.10.81 and 192.168.10.82
dropped privs to tcpdump
tcpdump: verbose output suppressed, use -v or -vv for full protocol decode
listening on eth0, link-type EN10MB (Ethernet), capture size 262144 bytes
16:36:08.798661 IP 192.168.10.81 > 192.168.10.82: VRRPv2, Advertisement, vrid 66, prio 100, authtype simple, intvl 1s, length 20
16:36:09.799259 IP 192.168.10.81 > 192.168.10.82: VRRPv2, Advertisement, vrid 66, prio 100, authtype simple, intvl 1s, length 20
16:36:10.800204 IP 192.168.10.81 > 192.168.10.82: VRRPv2, Advertisement, vrid 66, prio 100, authtype simple, intvl 1s, length 20
```

### 4.1.7 Keepalived 状态切换的通知脚本

**先要配置邮件服务，所有节点**

```bash
[16:52:35 root@ke1 ~]#yum install mailx
#添加下面的内容根据自己需求写
set from=zz15049236211@163.com
set smtp=smtp.163.com
set smtp-auth-user=zz15049236211@163.com
set smtp-auth-password=WLGSTJAPRWZTTSBD
set smtp-auth=login
set ssl-verify=ignore
```

**准备通知脚本**

```bash
#所有节点都执行
[17:09:12 root@ke1 ~]#mkdir /apps/keepalived/sh
[17:10:25 root@ke1 ~]#vim /apps/keepalived/sh/notify.sh 
contact='1191400158@qq.com'
notify() {
    mailsubject="$(hostname) to be1, vip floating"
    mailbody="$(date +'%F %T'): vrrp transition,$(hostname) changed to be $1"
    echo "$mailbody" | mail -s "$mailsubject" $contact
}
case $1 in
master)
    notify master
    ;;
backup)
    notify backup
    ;;
fault)
    notify fault
    ;;
*)
    echo "Usage:(basename $0) {master|backup|fault}"
    exit 1
    ;;
esac
[17:11:22 root@ke1 ~]#cat /etc/keepalived/conf.d/MASTER.conf
vrrp_instance VI_MASTER {
    state BACKUP      
    interface eth0
    virtual_router_id 66  
    priority 100      
    advert_int 1
    nopreempt         
    #preempt_delay 600s
    authentication {
        auth_type PASS  
        auth_pass 12345678
    }
    virtual_ipaddress {
        192.168.10.10 dev eth0 label eth0:10
    }
    unicast_src_ip 192.168.10.81
    unicast_peer{
        192.168.10.82
    }
    #添加
    notify_master "/apps/keepalived/sh/notify.sh master"
    notify_backup "/apps/keepalived/sh/notify.sh backup"
    notify_fault  "/apps/keepalived/sh/notify.sh fault"
}
#模拟故障
[17:12:43 root@ke1 ~]#killall keepalived
```

![image-20210406171351745](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210406171351745.png)

## 4.2 实现master/master的Keepalivde 双主架构

master/slave的单主架构，同一时间只有一个Keepalived对外提供服务，此主机繁忙，而另一台主机却很空闲，利用率低下，可以使用master/master的双主架构，解决此问题。

**master/master的双主架构：**

即将两个或以上VIP分别运行在不同的keepalived服务器，以实现服务器并行提供web访问的目的，提高服务器资源利用率

```bash
#ke1配置
#master/master
vrrp_instance VI_1 {
    state MASTER            #在另一个主机上为BACKUP
    interface eth0
    virtual_router_id 66    #每个vrrp_instance唯一
    priority 100            #在另一个主机上为80
    advert_int 1
    authentication {
        auth_type PASS
        auth_pass 12345678
    }
    virtual_ipaddress {
        192.168.10.10/24 dev eth0 label eth0:1 #指定vrrp_instance各自的VIP
    }
    unicast_src_ip 192.168.10.81
    unicast_peer{
        192.168.10.82
    }
}

vrrp_instance VI_2 {        #添加 VI_2 实例
    state BACKUP            #在另一个主机上为MASTER
    interface eth0
    virtual_router_id 88    #每个vrrp_instance唯一
    priority 80            #在另一个主机上为100
    advert_int 1
    authentication {
        auth_type PASS
        auth_pass 12345678
    }   
    virtual_ipaddress {
        192.168.10.20/24 dev eth0 label eth0:1 #指定vrrp_instance各自的VIP 
    }   
    unicast_src_ip 192.168.10.81
    unicast_peer{
        192.168.10.82
    }
}
#ke2配置
#master/master
vrrp_instance VI_1 {
    state BACKUP        
    interface eth0
    virtual_router_id 66 
    priority 80           
    advert_int 1
    authentication {
        auth_type PASS
        auth_pass 12345678
    }   
    virtual_ipaddress {
        192.168.10.10/24 dev eth0 label eth0:1 #指定vrrp_instance各自的VIP 
    }   
    unicast_src_ip 192.168.10.82
    unicast_peer{
        192.168.10.81
    }                                                                               
}
vrrp_instance VI_2 {        #添加 VI_2 实例
    state MASTER            #在另一个主机上为MASTER
    interface eth0
    virtual_router_id 88    #每个vrrp_instance唯一
    priority 100            #在另一个主机上为100
    advert_int 1
    authentication {
        auth_type PASS
        auth_pass 12345678
    }   
    virtual_ipaddress {
        192.168.10.20/24 dev eth0 label eth0:1 #指定vrrp_instance各自的VIP 
    }   
    unicast_src_ip 192.168.10.82
    unicast_peer{
        192.168.10.81
    }
}
#测试
[17:29:33 root@ke1 ~]#ip a
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
    link/ether 00:0c:29:7b:a8:b9 brd ff:ff:ff:ff:ff:ff
    inet 192.168.10.81/24 brd 192.168.10.255 scope global noprefixroute eth0
       valid_lft forever preferred_lft forever
    inet 192.168.10.10/24 scope global secondary eth0:1
       valid_lft forever preferred_lft forever
[17:29:24 root@ke2 ~]#ip a
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
    link/ether 00:0c:29:1a:4b:7f brd ff:ff:ff:ff:ff:ff
    inet 192.168.10.82/24 brd 192.168.10.255 scope global noprefixroute eth0
       valid_lft forever preferred_lft forever
    inet 192.168.10.20/24 scope global secondary eth0:1
       valid_lft forever preferred_lft forever
[17:30:12 root@ke1 ~]#systemctl stop keepalived.service
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
    link/ether 00:0c:29:1a:4b:7f brd ff:ff:ff:ff:ff:ff
    inet 192.168.10.82/24 brd 192.168.10.255 scope global noprefixroute eth0
       valid_lft forever preferred_lft forever
    inet 192.168.10.20/24 scope global secondary eth0:1
       valid_lft forever preferred_lft forever
    inet 192.168.10.10/24 scope global secondary eth0:1
       valid_lft forever preferred_lft forever
[17:31:03 root@ke1 ~]#systemctl restart keepalived.service
[17:31:31 root@ke1 ~]#ip a
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
    link/ether 00:0c:29:7b:a8:b9 brd ff:ff:ff:ff:ff:ff
    inet 192.168.10.81/24 brd 192.168.10.255 scope global noprefixroute eth0
       valid_lft forever preferred_lft forever
    inet 192.168.10.10/24 scope global secondary eth0:1
       valid_lft forever preferred_lft forever
```

注意如果是多个，直接配置多个Vrrp，并且平均分配IP地址进行配置

# 五、实现IPVS的高可用性

## 5.1 IPVS相关配置

### 5.1.1 虚拟服务器配置

**虚拟服务器配置结构**

```
virtual_server IP port  {
  ...
 	 real_server {
 		 ...
 	 }
  ...
}
```

**virtual server （虚拟服务器）的定义格式**

```
virtual_server IP port       #定义虚拟主机IP地址及其端口
virtual_server fwmark int    #ipvs的防火墙打标，实现基于防火墙的负载均衡集群
virtual_server group string  #使用虚拟服务器组
```

### 5.1.2 虚拟服务器组配置

**虚拟服务器组**

将多个虚拟服务器定义成一个组，统一对外服务，如：http和https定义成一个虚拟服务器组

```bash
virtual_server_group <STRING> {
           # Virtual IP Address and Port
           <IPADDR> <PORT>
           <IPADDR> <PORT>
           ...
           # <IPADDR RANGE> has the form
           # XXX.YYY.ZZZ.WWW-VVV eg 192.168.200.1-10
           # range includes both .1 and .10 address
           <IPADDR RANGE> <PORT># VIP range VPORT
           <IPADDR RANGE> <PORT>
           ...
           # Firewall Mark (fwmark)
           fwmark <INTEGER>
           fwmark <INTEGER>
           ...
}
```

**虚拟服务器配置**

```bash
virtual_server IP port  {               #VIP和PORT
delay_loop <INT>                          #检查后端服务器的时间间隔
lb_algo rr|wrr|lc|wlc|lblc|sh|dh        #定义调度方法
lb_kind NAT|DR|TUN                      #集群的类型,注意要大写
persistence_timeout <INT>             #持久连接时长
protocol TCP|UDP|SCTP                   #指定服务协议
sorry_server <IPADDR> <PORT>            #所有RS故障时，备用服务器地址
real_server <IPADDR> <PORT>  {          #RS的IP和PORT
    weight <INT>                          #RS权重
    notify_up <STRING>|<QUOTED-STRING>  #RS上线通知脚本
    notify_down <STRING>|<QUOTED-STRING> #RS下线通知脚本
    HTTP_GET|SSL_GET|TCP_CHECK|SMTP_CHECK|MISC_CHECK { ... } #定义当前主机的健康状态检测方法
 }
}
```

### 5.1.3 应用层监测

应用层检测：HTTP_GET|SSL_GET

```bash
HTTP_GET|SSL_GET {
    url {
        path <URL_PATH>       #定义要监控的URL
        status_code <INT>         #判断上述检测机制为健康状态的响应码，一般为 200
    }
    connect_timeout <INTEGER>     #客户端请求的超时时长, 相当于haproxy的timeout server
    nb_get_retry <INT>            #重试次数,旧的已经被废弃
    retry						  #重试次数
    delay_before_retry <INT>  #重试之前的延迟时长
    connect_ip <IP ADDRESS>       #向当前RS哪个IP地址发起健康状态检测请求
    connect_port <PORT>           #向当前RS的哪个PORT发起健康状态检测请求
    bindto <IP ADDRESS>           #向当前RS发出健康状态检测请求时使用的源地址
    bind_port <PORT>          #向当前RS发出健康状态检测请求时使用的源端口
}
```

### 5.1.4 TCP监测

传输层检测：TCP_CHECK

```
TCP_CHECK {
 connect_ip <IP ADDRESS>  #向当前RS的哪个IP地址发起健康状态检测请求
 connect_port <PORT>      #向当前RS的哪个PORT发起健康状态检测请求
 bindto <IP ADDRESS>      #发出健康状态检测请求时使用的源地址
 bind_port <PORT>         #发出健康状态检测请求时使用的源端口
 connect_timeout <INTEGER>    #客户端请求的超时时长, 等于haproxy的timeout server   
}
```

## 5.2 实现单主的LVS-DR模式

**准备web服务器并使用脚本绑定VIP至web服务器lo网卡**

```bash
vip=192.168.10.100
mask='255.255.255.255'
dev=lo:1
rpm -q httpd &> /dev/null || yum -y install httpd &>/dev/null
service httpd start &> /dev/null && echo "The httpd Server is Ready!"
echo "<h1>`hostname`</h1>" > /var/www/html/index.html

case $1 in
start)
    echo 1 > /proc/sys/net/ipv4/conf/all/arp_ignore
    echo 1 > /proc/sys/net/ipv4/conf/lo/arp_ignore
    echo 2 > /proc/sys/net/ipv4/conf/all/arp_announce
    echo 2 > /proc/sys/net/ipv4/conf/lo/arp_announce
    ifconfig $dev $vip  netmask $mask #broadcast vip up
    #route add -hostvip dev dev
    echo "The RS Server is Ready!"
    ;;
stop)
    ifconfigdev down
    echo 0 > /proc/sys/net/ipv4/conf/all/arp_ignore
    echo 0 > /proc/sys/net/ipv4/conf/lo/arp_ignore
    echo 0 > /proc/sys/net/ipv4/conf/all/arp_announce
    echo 0 > /proc/sys/net/ipv4/conf/lo/arp_announce
    echo "The RS Server is Canceled!"
    ;;
*) 
    echo "Usage: $(basename $0) start|stop"
    exit 1
    ;;
esac
[18:05:24 root@web1 ~]#bash lvs_dr_rs.sh start
[18:05:24 root@web2 ~]#bash lvs_dr_rs.sh start
[18:05:09 root@web1 ~]#curl 192.168.10.100
<h1>web1.zhangzhuo.org</h1>
[18:05:55 root@web2 ~]#curl 192.168.10.100
<h1>web2.zhangzhuo.org</h1>
```

**配置keepalived**

```bash
#ke1配置
[19:00:50 root@ke1 ~]#cat /etc/keepalived/conf.d/lvs_dr.conf 
vrrp_instance VI_1 {
    state MASTER
    interface eth0
    virtual_router_id 66
    priority 100
    advert_int 1
    authentication {
        auth_type PASS
        auth_pass 123456
    }
    virtual_ipaddress {
        192.168.10.100/24 dev eth0 label eth0:1
    }
    unicast_src_ip 192.168.10.81
    unicast_peer{
        192.168.10.82
    }
}
virtual_server 192.168.10.100 80 { #定义虚拟主机IP地址及其端口
        delay_loop 3  #检查后端服务器的时间间隔
        lb_algo rr    #定义调度方法
        lb_kind DR    #集群的类型,注意要大写
        protocol TCP  #指定服务协议
        sorry_server 127.0.0.1 80  #所有RS故障时，备用服务器地址
        real_server 192.168.10.88 80 { #RS的IP和PORT
            weight 1   #RS权重
            HTTP_GET {               #应用层检测
                url {               
                    path /           #定义要监控的URL
                    status_code 200  #判断上述检测机制为健康状态的响应码，一般为 200
                }
                connect_timeout 1 #客户端请求的超时时长, 相当于haproxy的timeout server
                nb_get_retry 3    #重试次数
                delay_before_retry 1 #重试之前的延迟时长
            }
        }
        real_server 192.168.10.89 80 { #RS的IP和PORT
            weight 1 #RS权重
            TCP_CHECK {              #另一台主机使用TCP检测
                connect_timeout 5    #客户端请求的超时时长, 等于haproxy的timeout server
                nb_get_retry 3       #重试次数
                delay_before_retry 3 #重试之前的延迟时长
                connect_port 80       #向当前RS的哪个PORT发起健康状态检测请求
            }
        }
}
#ke2配置
[19:02:04 root@ke2 ~]#cat /etc/keepalived/conf.d/lvs_dr.conf 
vrrp_instance VI_1 {
    state BACKUP                            #修改此行
    interface eth0
    virtual_router_id 66
    priority 80                             #修改此行
    advert_int 1
    authentication {
        auth_type PASS
        auth_pass 123456
    }
    virtual_ipaddress {
        192.168.10.100/24 dev eth0 label eth0:1
    }
    unicast_src_ip 192.168.10.82
    unicast_peer{
        192.168.10.81
    }
}
virtual_server 192.168.10.100 80 {
        delay_loop 3
        lb_algo rr
        lb_kind DR
        protocol TCP
        sorry_server 127.0.0.1 80
        real_server 192.168.10.88 80 {
            weight 1
            HTTP_GET {
                url {
                    path /
                    status_code 200
                }
                connect_timeout 1
                nb_get_retry 3
                delay_before_retry 1
            }
        }
        real_server 192.168.10.89 80 {
            weight 1
            TCP_CHECK {
                connect_timeout 5
                nb_get_retry 3
                delay_before_retry 3
                connect_port 80
            }
        }
}
[18:58:27 root@ke1 ~]#systemctl restart keepalived.service 
[18:58:27 root@ke2 ~]#systemctl restart keepalived.service
```

**访问测试结果**

```bash
[18:58:15 root@ke2 ~]#dnf -y install ipvsadm
[18:59:51 root@ke1 ~]#ipvsadm -Ln
IP Virtual Server version 1.2.1 (size=4096)
Prot LocalAddress:Port Scheduler Flags
  -> RemoteAddress:Port           Forward Weight ActiveConn InActConn
TCP  192.168.10.100:80 rr
  -> 192.168.10.88:80             Route   1      0          0         
  -> 192.168.10.89:80             Route   1      0          0 
[18:59:55 root@ke1 ~]#ip a
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
    inet 192.168.10.100/24 scope global secondary eth0:1
       valid_lft forever preferred_lft forever
[19:00:26 root@ke2 ~]#ipvsadm -Ln
IP Virtual Server version 1.2.1 (size=4096)
Prot LocalAddress:Port Scheduler Flags
  -> RemoteAddress:Port           Forward Weight ActiveConn InActConn
TCP  192.168.10.100:80 rr
  -> 192.168.10.88:80             Route   1      0          0         
  -> 192.168.10.89:80             Route   1      0          0 
[19:00:28 root@ke2 ~]#ip a
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
```

**模拟故障**

```bash
#第一台RS故障，自动切换至RS2
[18:06:05 root@web1 ~]#chmod  0 /var/www/html/index.html
[19:06:33 root@client ~]#curl 192.168.10.100
<h1>web2.zhangzhuo.org</h1>
[19:06:41 root@client ~]#curl 192.168.10.100
<h1>web2.zhangzhuo.org</h1>
[19:05:21 root@ke1 ~]#ipvsadm -Ln
IP Virtual Server version 1.2.1 (size=4096)
Prot LocalAddress:Port Scheduler Flags
  -> RemoteAddress:Port           Forward Weight ActiveConn InActConn
TCP  192.168.10.100:80 rr
  -> 192.168.10.89:80             Route   1      0          4 

#后端RS服务器都故障，报错由于本机没有装httpd服务
[19:06:46 root@client ~]#curl 192.168.10.100
curl: (7) Failed connect to 192.168.10.100:80; Connection refused

#ke1故障，自动切换至ke2
[19:07:22 root@ke1 ~]#killall keepalived 
[19:05:11 root@ke2 ~]#ip a
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
    inet 192.168.10.100/24 scope global secondary eth0:1
       valid_lft forever preferred_lft forever
       
#恢复都有后端 RS
[19:04:36 root@web1 ~]#chmod 644 /var/www/html/index.html 
[19:08:22 root@web2 ~]#systemctl start httpd
[19:12:49 root@client ~]#curl 192.168.10.100
<h1>web1.zhangzhuo.org</h1>
[19:12:50 root@client ~]#curl 192.168.10.100
<h1>web2.zhangzhuo.org</h1>

#恢复ke1服务器，又抢占回原来的VIP
[19:11:19 root@ke1 ~]#systemctl start keepalived.service
[19:13:31 root@ke1 ~]#hostname -I
192.168.10.81 192.168.10.100 
[19:11:26 root@ke2 ~]#hostname -I
192.168.10.82
```

## 5.3 实现双主的LVS-DR模式

![image-20210406192657876](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210406192657876.png)

这里正常应该4台后端服务器，我这里使用2台web服务器，在之前的实验进行修改

```bash
#web服务器添加ip
[19:40:16 root@web1 ~]#ifconfig lo:2 192.168.10.200/32
[19:40:23 root@web2 ~]#ifconfig lo:2 192.168.10.200/32
#ke1配置
[19:42:21 root@ke1 ~]#cat /etc/keepalived/conf.d/lvs_dr_master.conf 
vrrp_instance VI_1 {
    state MASTER          #在另一个结点上为BACKUP
    interface eth0
    virtual_router_id 66
    priority 100          #在另一个结点上为80
    advert_int 1
    authentication {
        auth_type PASS
        auth_pass 123456
    }
    virtual_ipaddress {
        192.168.10.100/24 dev eth0 label eth0:1
    }
    unicast_src_ip 192.168.10.81
    unicast_peer{
        192.168.10.82
    }
}
vrrp_instance VI_2 {
    state BACKUP    #在另一个结点上为MASTER
    interface eth0
    virtual_router_id 88 
    priority 80     #在另一个结点上为100
    advert_int 1
    authentication {
        auth_type PASS
        auth_pass 123456
    }   
    virtual_ipaddress {
        192.168.10.200/24 dev eth0 label eth0:2
    }   
    unicast_src_ip 192.168.10.81
    unicast_peer{
        192.168.10.82
    }   
}

virtual_server 192.168.10.100 80 { #定义虚拟主机IP地址及其端口
        delay_loop 3  #检查后端服务器的时间间隔
        lb_algo rr    #定义调度方法
        lb_kind DR    #集群的类型,注意要大写
        protocol TCP  #指定服务协议
        sorry_server 127.0.0.1 80  #所有RS故障时，备用服务器地址
        real_server 192.168.10.88 80 { #RS的IP和PORT
            weight 1   #RS权重
            HTTP_GET {               #应用层检测
                url {               
                    path /           #定义要监控的URL
                    status_code 200  #判断上述检测机制为健康状态的响应码，一般为 200
                }
                connect_timeout 1 #客户端请求的超时时长, 相当于haproxy的timeout server
                nb_get_retry 3    #重试次数
                delay_before_retry 1 #重试之前的延迟时长
            }
        }
        real_server 192.168.10.89 80 { #RS的IP和PORT
            weight 1 #RS权重
            TCP_CHECK {              #另一台主机使用TCP检测
                connect_timeout 5    #客户端请求的超时时长, 等于haproxy的timeout server
                nb_get_retry 3       #重试次数
                delay_before_retry 3 #重试之前的延迟时长
                connect_port 80       #向当前RS的哪个PORT发起健康状态检测请求
            }
        }
}

virtual_server 192.168.10.200 80 { #定义虚拟主机IP地址及其端口
        delay_loop 3  #检查后端服务器的时间间隔
        lb_algo rr    #定义调度方法
        lb_kind DR    #集群的类型,注意要大写
        protocol TCP  #指定服务协议
        sorry_server 127.0.0.1 80  #所有RS故障时，备用服务器地址
        real_server 192.168.10.88 80 { #RS的IP和PORT
            weight 1   #RS权重
            HTTP_GET {               #应用层检测
                url {               
                    path /           #定义要监控的URL
                    status_code 200  #判断上述检测机制为健康状态的响应码，一般为 200
                }
                connect_timeout 1 #客户端请求的超时时长, 相当于haproxy的timeout server
                nb_get_retry 3    #重试次数
                delay_before_retry 1 #重试之前的延迟时长
            }
        }
        real_server 192.168.10.89 80 { #RS的IP和PORT
            weight 1 #RS权重
            TCP_CHECK {              #另一台主机使用TCP检测
                connect_timeout 5    #客户端请求的超时时长, 等于haproxy的timeout server
                nb_get_retry 3       #重试次数
                delay_before_retry 3 #重试之前的延迟时长
                connect_port 80       #向当前RS的哪个PORT发起健康状态检测请求
            }
        }
}
#ke2配置
[19:42:29 root@ke2 ~]#cat /etc/keepalived/conf.d/lvs_dr_master.conf 
vrrp_instance VI_1 {
    state BACKUP                            #修改此行
    interface eth0
    virtual_router_id 66
    priority 80                             #修改此行
    advert_int 1
    authentication {
        auth_type PASS
        auth_pass 123456
    }
    virtual_ipaddress {
        192.168.10.100/24 dev eth0 label eth0:1
    }
    unicast_src_ip 192.168.10.82
    unicast_peer{
        192.168.10.81
    }
}
vrrp_instance VI_2 {
    state MASTER                            #修改此行
    interface eth0
    virtual_router_id 88
    priority 100                             #修改此行
    advert_int 1
    authentication {
        auth_type PASS
        auth_pass 123456
    }   
    virtual_ipaddress {
        192.168.10.200/24 dev eth0 label eth0:2
    }   
    unicast_src_ip 192.168.10.82
    unicast_peer{
        192.168.10.81
    }
}

virtual_server 192.168.10.100 80 {
        delay_loop 3
        lb_algo rr
        lb_kind DR
        protocol TCP
        sorry_server 127.0.0.1 80
        real_server 192.168.10.88 80 {
            weight 1
            HTTP_GET {
                url {
                    path /
                    status_code 200
                }
                connect_timeout 1
                nb_get_retry 3
                delay_before_retry 1
            }
        }
        real_server 192.168.10.89 80 {
            weight 1
            TCP_CHECK {
                connect_timeout 5
                nb_get_retry 3
                delay_before_retry 3
                connect_port 80
            }
        }
}
virtual_server 192.168.10.200 80 {
        delay_loop 3
        lb_algo rr
        lb_kind DR
        protocol TCP
        sorry_server 127.0.0.1 80
        real_server 192.168.10.88 80 {
            weight 1
            HTTP_GET {
                url {
                    path /
                    status_code 200
                }
                connect_timeout 1
                nb_get_retry 3
                delay_before_retry 1
            }
        }
        real_server 192.168.10.89 80 {
            weight 1
            TCP_CHECK {
                connect_timeout 5
                nb_get_retry 3
                delay_before_retry 3
                connect_port 80
            }
        }
}
```

## 5.4 实现双主的，LVS-DR模式利用FWM绑定成一个双主集群服务

**lvs配置**

```bash
#ke1配置
[20:24:50 root@ke1 ~]#cat /etc/keepalived/conf.d/lvs_dr_FWM.conf 
vrrp_instance VI_1 {
    state MASTER          #在另一个结点上为BACKUP
    interface eth0
    virtual_router_id 66
    priority 100          #在另一个结点上为80
    advert_int 1
    authentication {
        auth_type PASS
        auth_pass 123456
    }
    virtual_ipaddress {
        192.168.10.100/24 dev eth0 label eth0:1
    }
    unicast_src_ip 192.168.10.81
    unicast_peer{
        192.168.10.82
    }
}
vrrp_instance VI_2 {
    state BACKUP    #在另一个结点上为MASTER
    interface eth0
    virtual_router_id 88 
    priority 80     #在另一个结点上为100
    advert_int 1
    authentication {
        auth_type PASS
        auth_pass 123456
    }   
    virtual_ipaddress {
        192.168.10.200/24 dev eth0 label eth0:2
    }   
    unicast_src_ip 192.168.10.81
    unicast_peer{
        192.168.10.82
    }   
    track_interface {
        eth0
    }
}

virtual_server fwmark 8 { #指定FWM为6
        delay_loop 3  #检查后端服务器的时间间隔
        lb_algo rr    #定义调度方法
        lb_kind DR    #集群的类型,注意要大写
        protocol TCP  #指定服务协议
        sorry_server 127.0.0.1 80  #所有RS故障时，备用服务器地址
        real_server 192.168.10.88 80 { #RS的IP和PORT
            weight 1   #RS权重
            HTTP_GET {               #应用层检测
                url {               
                    path /           #定义要监控的URL
                    status_code 200  #判断上述检测机制为健康状态的响应码，一般为 200
                }
                connect_timeout 1 #客户端请求的超时时长, 相当于haproxy的timeout server
                retry 3    #重试次数
                delay_before_retry 1 #重试之前的延迟时长
            }
        }
        real_server 192.168.10.89 80 { #RS的IP和PORT
            weight 1 #RS权重
            TCP_CHECK {              #另一台主机使用TCP检测
                connect_timeout 5    #客户端请求的超时时长, 等于haproxy的timeout server
                retry 3       #重试次数
                delay_before_retry 3 #重试之前的延迟时长
                connect_port 80       #向当前RS的哪个PORT发起健康状态检测请求
            }
        }
}
#ke2配置
[20:25:52 root@ke2 keepalived]#cat /etc/keepalived/conf.d/lvs_dr_FWM.conf 
vrrp_instance VI_1 {
    state BACKUP                            #修改此行
    interface eth0
    virtual_router_id 66
    priority 80                             #修改此行
    advert_int 1
    authentication {
        auth_type PASS
        auth_pass 123456
    }
    virtual_ipaddress {
        192.168.10.100/24 dev eth0 label eth0:1
    }
    unicast_src_ip 192.168.10.82
    unicast_peer{
        192.168.10.81
    }
}
vrrp_instance VI_2 {
    state MASTER                            #修改此行
    interface eth0
    virtual_router_id 88
    priority 100                             #修改此行
    advert_int 1
    authentication {
        auth_type PASS
        auth_pass 123456
    }   
    virtual_ipaddress {
        192.168.10.200/24 dev eth0 label eth0:2
    }   
    unicast_src_ip 192.168.10.82
    unicast_peer{
        192.168.10.81
    }
}

virtual_server fwmark 8 {
        delay_loop 3
        lb_algo rr
        lb_kind DR
        protocol TCP
        net_mask 255.255.255.0
        sorry_server 127.0.0.1 80
        real_server 192.168.10.88 80 {
            weight 1
            HTTP_GET {
                url {
                    path /
                    status_code 200
                }
                connect_timeout 1
                nb_get_retry 3
                delay_before_retry 1
            }
        }
        real_server 192.168.10.89 80 {
            weight 1
            TCP_CHECK {
                connect_timeout 5
                nb_get_retry 3
                delay_before_retry 3
                connect_port 80
            }
        }
}
#ke1和ke2都执行
[20:28:29 root@ke2 ~]#iptables -t mangle -A PREROUTING -d 192.168.10.100,192.168.10.200  -p tcp --dport 80 -j MARK --set-mark 8
[20:28:29 root@ke1 ~]#iptables -t mangle -A PREROUTING -d 192.168.10.100,192.168.10.200  -p tcp --dport 80 -j MARK --set-mark 8

#web1和web2执行脚本
vip=("192.168.10.100" "192.168.10.200")
dev=("lo:1" "lo:2")
mask='255.255.255.255'
[ ${#vip[*]} = ${#dev[*]} ] || { echo "The number of VIP and dev arrays is inconsistent"; exit; }
num=`echo $[${#vip[*]}-1]`
rpm -q httpd &> /dev/null || yum -y install httpd &>/dev/null
service httpd start &> /dev/null && echo "The httpd Server is Ready!"
echo "<h1>`hostname`</h1>" > /var/www/html/index.html

case $1 in
start)
    echo 1 > /proc/sys/net/ipv4/conf/all/arp_ignore
    echo 1 > /proc/sys/net/ipv4/conf/lo/arp_ignore
    echo 2 > /proc/sys/net/ipv4/conf/all/arp_announce
    echo 2 > /proc/sys/net/ipv4/conf/lo/arp_announce
    for i in `seq 0 $num`;do
        ifconfig ${dev[$i]} ${vip[$i]}  netmask $mask #broadcast vip up
    done
    #route add -hostvip dev dev
    echo "The RS Server is Ready!"
    ;;
stop)
    for i in `seq 0 $num`;do
        ifconfig ${dev[$i]} down
    done
    echo 0 > /proc/sys/net/ipv4/conf/all/arp_ignore
    echo 0 > /proc/sys/net/ipv4/conf/lo/arp_ignore
    echo 0 > /proc/sys/net/ipv4/conf/all/arp_announce
    echo 0 > /proc/sys/net/ipv4/conf/lo/arp_announce
    echo "The RS Server is Canceled!"
    ;;
*) 
    echo "Usage: $(basename $0) start|stop"
    exit 1
    ;;
esac
#测试
[20:17:49 root@client ~]#curl 192.168.10.100;curl 192.168.10.200
<h1>web1.zhangzhuo.org</h1>
<h1>web2.zhangzhuo.org</h1>
```

# 六、实现其它应用的高可用性 VRRP Script

## 6.1 VRRP Script 配置

**分两步实现：**

### 6.1.1 定义脚本

vrrp_script：自定义资源监控脚本，vrrp实例根据脚本返回值，公共定义，可被多个实例调用，定义在vrrp实例之外的独立配置块，一般放在global_defs设置块之后。

通常此脚本用于监控指定应用的状态。一旦发现应用的状态异常，则触发对MASTER节点的权重减至低于SLAVE节点，从而实现 VIP 切换到 SLAVE 节点

```bash
vrrp_script <SCRIPT_NAME> {               #定义一个检测脚本，在global_defs 之外配置
      script <STRING>|<QUOTED-STRING>     #shell命令或脚本路径，此脚本返回值为非0时，会触发下面OPTIONS执行
      interval <INTEGER>                  #间隔时间，单位为秒，默认1秒
      timeout <INTEGER>                   #超时时间
      weight <INTEGER:-254..254>          #此值为负数，表示fall（（脚本返回值为非0）时，会将此值与本节点权重相加可以降低本节点权重，如果是正数，表示 rise （脚本返回值为0）成功后，会将此值与本节点权重相加可以提高本节点权重，通常使用负值较多
      fall <INTEGER>                      #脚本几次失败转换为失败，建议设为2以上
      rise <INTEGER>                      #脚本连续监测成功后，把服务器从失败标记为成功的次数
      user USERNAME [GROUPNAME]           #执行监测脚本的用户或组      
      init_fail                           #设置默认标记为失败状态，监测成功之后再转换为成功状态
}
```

### 6.1.2 调用脚本

track_script：调用vrrp_script定义的脚本去监控资源，定义在实例之内，调用事先定义的vrrp_script

```bash
vrrp_instance VI_1 {
    …
    track_script {   #调用
        chk_down     #定义的vrrp_script名称
  }
}
```

## 6.2 vrrp_script 实现 VIP高可用

```bash
#ke1配置
[10:04:30 root@ke1 ~]#cat /etc/keepalived/conf.d/varr_script.conf 
vrrp_script check_down {
    script "[ ! -f /etc/keepalived/down ]" #/etc/keepalived/down存在时返回非0，触发权重-30
    interval 1      #间隔时间，单位为秒，默认1秒
    weight -30      
    fall 3          #脚本几次失败转换为失败，建议设为2以上
    rise 2          #脚本连续监测成功后，把服务器从失败标记为成功的次数
    timeout 2       #超时时间
}


vrrp_instance VI_1 {
    state MASTER
    interface eth0
    virtual_router_id 66
    priority 100    #在另一个节点为80
    advert_int 1
    authentication {
        auth_type PASS
        auth_pass 123456
    }
    virtual_ipaddress {
        192.168.10.100/24 dev eth0 label eth0:1
    }
    unicast_src_ip 192.168.10.81
    unicast_peer{
        192.168.10.82
    } 
    track_script {
       check_down           #调用前面定义的脚本
    }
}
#ke2配置
[09:54:08 root@ke2 ~]#cat /etc/keepalived/conf.d/varr_script.conf 
vrrp_instance VI_1 {
    state BACKUP
    interface eth0
    virtual_router_id 66
    priority 80 
    advert_int 1
    authentication {
        auth_type PASS
        auth_pass 123456
    }   
    virtual_ipaddress {
        192.168.10.100/24 dev eth0 label eth0:1
    }   
    unicast_src_ip 192.168.10.82
    unicast_peer{
        192.168.10.81    
    }   
}
#测试
[10:00:25 root@ke1 ~]#tail -f /var/log/messages -n0
[10:00:25 root@ke1 ~]#tail -f /var/log/messages -n0
Apr  8 10:01:18 ke1 Keepalived_vrrp[1566]: Script `check_down` now returning 1
Apr  8 10:01:20 ke1 Keepalived_vrrp[1566]: VRRP_Script(check_down) failed (exited with status 1)
Apr  8 10:01:20 ke1 Keepalived_vrrp[1566]: (VI_1) Changing effective priority from 100 to 70
Apr  8 10:01:23 ke1 Keepalived_vrrp[1566]: (VI_1) Master received advert from 192.168.10.82 with higher priority 80, ours 70
Apr  8 10:01:23 ke1 Keepalived_vrrp[1566]: (VI_1) Entering BACKUP STATE
Apr  8 10:01:23 ke1 Keepalived_vrrp[1566]: (VI_1) removing VIPs
[10:01:17 root@ke1 ~]#tcpdump -i eth0 -nn vrrps
10:02:57.620843 IP 192.168.10.82 > 192.168.10.81: VRRPv2, Advertisement, vrid 66, prio 80, authtype simple, intvl 1s, length 20
[10:03:00 root@ke1 ~]#rm /etc/keepalived/down
[10:00:25 root@ke1 ~]#tail -f /var/log/messages -n0
Apr  8 10:03:43 ke1 Keepalived_vrrp[1566]: (VI_1) Receive advertisement timeout
Apr  8 10:03:43 ke1 Keepalived_vrrp[1566]: (VI_1) Entering MASTER STATE
Apr  8 10:03:43 ke1 Keepalived_vrrp[1566]: (VI_1) setting VIPs.
Apr  8 10:03:43 ke1 Keepalived_vrrp[1566]: (VI_1) Sending/queueing gratuitous ARPs on eth0 for 192.168.10.100
[10:03:38 root@ke1 ~]#tcpdump -i eth0 -nn vrrp
10:04:26.430380 IP 192.168.10.81 > 192.168.10.82: VRRPv2, Advertisement, vrid 66, prio 100, authtype simple, intvl 1s, length 20
```

## 6.3 实现单主模式的Nginx反向代理的高可用

```bash
#在两个节点都配置nginx反向代理
[10:18:03 root@ke1 ~]#cat /etc/nginx/conf.d/web.conf 
upstream websrvs {
    server 192.168.10.88:80 weight=1;
    server 192.168.10.89:80 weight=1;
}
server {
    listen 80;
    location /{
    proxy_pass http://websrvs/;
    }
}

#ke1配置
[10:32:38 root@ke1 conf.d]#cat /etc/keepalived/conf.d/nginx_vip.conf 
vrrp_script check_nginx {
    script "/etc/keepalived/sh/check_nginx.sh"
    #script "/usr/bin/killall -0 nginx"
    interval 1
    weight -30
    fall 3
    rise 5
    timeout 2
}
vrrp_instance VI_1 {
    state MASTER
    interface eth0
    virtual_router_id 66
    priority 100 
    advert_int 1
    authentication {
        auth_type PASS
        auth_pass 123456
    }   
    virtual_ipaddress {
        192.168.10.100/24 dev eth0 label eth0:1
    }   
    unicast_src_ip 192.168.10.81
    unicast_peer{
        192.168.10.82
    }   
    track_script {
        check_nginx
    }
}
#ke2配置
[10:32:00 root@ke2 conf.d]#cat /etc/keepalived/conf.d/nginx_vip.conf 
vrrp_instance VI_1 {
    state BACKUP
    interface eth0
    virtual_router_id 66
    priority 80 
    advert_int 1
    authentication {
        auth_type PASS
        auth_pass 123456
    }   
    virtual_ipaddress {
        192.168.10.100/24 dev eth0 label eth0:1
    }   
    unicast_src_ip 192.168.10.82
    unicast_peer{
        192.168.10.81
    }   
}
#ke1脚本配置
[10:34:13 root@ke1 conf.d]#yum install psmisc
[10:34:19 root@ke1 conf.d]#cat /etc/keepalived/sh/check_nginx.sh 
#!/bin/bash
/usr/bin/killall -0 nginx
[10:34:32 root@ke1 conf.d]#chmod a+x /etc/keepalived/sh/check_nginx.sh
```

## 6.4 实现双主模式Nginx反向代理的高可用

```bash
#web的nginx配置
[10:44:44 root@ke1 conf.d]#cat /etc/nginx/conf.d/web.conf 
upstream websrvs1 {
    server 192.168.10.88:80 weight=1;
    server 192.168.10.89:80 weight=1;
}
upstream websrvs2 {
    server 192.168.10.88:80 weight=1;
    server 192.168.10.89:80 weight=1;
}
server {
    listen 80;
    server_name www.a.com;
    location / { 
        proxy_pass http://websrvs1/;
    }
}
server {
    listen 80;
    server_name www.b.com;
    location / {
        proxy_pass http://websrvs2/;
    }
}
#ke1配置
[10:52:13 root@ke1 conf.d]#cat nginx_master.conf 
vrrp_script check_nginx {
    script "/etc/keepalived/sh/check_nginx.sh"
    #script "/usr/bin/killall -0 nginx"
    interval 1
    weight -30
    fall 3
    rise 5
    timeout 2
}
vrrp_instance VI_1 {
    state MASTER
    interface eth0
    virtual_router_id 66
    priority 100 
    advert_int 1
    authentication {
        auth_type PASS
        auth_pass 123456
    }   
    virtual_ipaddress {
        192.168.10.100/24 dev eth0 label eth0:1
    }   
    unicast_src_ip 192.168.10.81
    unicast_peer{
        192.168.10.82
    }   
    track_script {
        check_nginx
    }
}
vrrp_instance VI_2 {
    state BACKUP
    interface eth0
    virtual_router_id 88
    priority 80 
    advert_int 1
    authentication {
        auth_type PASS
        auth_pass 123456
    }   
    virtual_ipaddress {
        192.168.10.200/24 dev eth0 label eth0:1
    }   
    unicast_src_ip 192.168.10.81
    unicast_peer{
        192.168.10.82
    }   
    track_script {
        check_nginx
    }   
}
#ke2配置
[10:52:45 root@ke2 conf.d]#cat nginx_master.conf 
vrrp_script check_nginx {
    script "/etc/keepalived/sh/check_nginx.sh"
    #script "/usr/bin/killall -0 nginx"
    interval 1
    weight -30
    fall 3
    rise 5
    timeout 2
}
vrrp_instance VI_1 {
    state BACKUP
    interface eth0
    virtual_router_id 66
    priority 80 
    advert_int 1
    authentication {
        auth_type PASS
        auth_pass 123456
    }   
    virtual_ipaddress {
        192.168.10.100/24 dev eth0 label eth0:1
    }   
    unicast_src_ip 192.168.10.82
    unicast_peer{
        192.168.10.81
    }   
}
vrrp_instance VI_2 {
    state MASTER
    interface eth0
    virtual_router_id 88
    priority 100
    advert_int 1
    authentication {
        auth_type PASS
        auth_pass 123456
    }   
    virtual_ipaddress {
        192.168.10.200/24 dev eth0 label eth0:1
    }   
    unicast_src_ip 192.168.10.82
    unicast_peer {
        192.168.10.81
    }   
    track_script {
        check_nginx
    }   
}
#客户端测试
[10:51:54 root@client ~]#vim /etc/hosts
192.168.10.100 www.a.com
192.168.10.200 www.b.com 
[10:54:29 root@client ~]#curl www.a.com;curl www.b.com
<h1>web1.zhangzhuo.org</h1>
<h1>web2.zhangzhuo.org</h1>
```

## 6.5 实现HAProxy高可用

```bash
#haproxy配置
[11:11:44 root@ke1 HAProxy]#cat /etc/haproxy/cfg/web.cfg 
#静态算法
#static-rr调度算法
listen web_host_staticrr
    bind 192.168.10.100:80
    mode http
    log global
    balance static-rr
    option forwardfor
    server web1 192.168.10.88:80 weight 1 check inter 3000 fall 3 rise 5
    server web2 192.168.10.89:80 weight 2 check inter 3000 fall 3 rise 5
#让主机可以监听没有的ip地址
[11:12:29 root@ke1 HAProxy]#cat /etc/sysctl.conf
net.ipv4.ip_nonlocal_bind = 1
[11:14:13 root@ke1 etc]#systemctl restart haproxy.service 
#ke1配置
[11:21:40 root@ke1 conf.d]#cat haproxy_vip.conf 
vrrp_script check_haproxy {
    script "/etc/keepalived/sh/check_haproxy.sh"
    #script "/usr/bin/killall -0 nginx"
    interval 1
    weight -30
    fall 3
    rise 5
    timeout 2
}
vrrp_instance VI_1 {
    state MASTER
    interface eth0
    virtual_router_id 66
    priority 100 
    advert_int 1
    authentication {
        auth_type PASS
        auth_pass 123456
    }   
    virtual_ipaddress {
        192.168.10.100/24 dev eth0 label eth0:1
    }   
    unicast_src_ip 192.168.10.81
    unicast_peer{
        192.168.10.82
    }   
    track_script {
        check_haproxy
    }
}
#ke2配置
[11:19:42 root@ke2 conf.d]#cat haproxy_vip.conf 
vrrp_instance VI_1 {
    state BACKUP
    interface eth0
    virtual_router_id 66
    priority 80 
    advert_int 1
    authentication {
        auth_type PASS
        auth_pass 123456
    }   
    virtual_ipaddress {
        192.168.10.100/24 dev eth0 label eth0:1
    }   
    unicast_src_ip 192.168.10.82
    unicast_peer{
        192.168.10.81
    }   
}
#测试
[11:22:35 root@client ~]#while :;do curl 192.168.10.100;sleep 1;done
<h1>web1.zhangzhuo.org</h1>
<h1>web2.zhangzhuo.org</h1
```

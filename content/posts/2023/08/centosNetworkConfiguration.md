---
title: "Centos操作系统网络"
date: 2023-08-01T13:48:13+08:00
draft: false
description: "讲解 CentOS 的网络配置文件与 nmcli 命令，完成主机名、IP 和 DNS 配置。"
cover: "https://b3logfile.com/bing/20190710.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["网络知识"]
tags: ["Centos", "nmcli"]
toc: true
---
# 一、基础网络配置

## 1.1 基本网络配置

将Linux主机接入到网络，需要配置网络相关设置

一般包括如下内容：

* 主机名
* IP/netmask
* 路由：默认网关
* DNS服务器
  * 主DNS服务器
  * 次DNS服务器
  * 第三个DNS服务器

## 1.2 网络配置文件

### 1.网络基本配置文件

IP、MASK、GW、DNS相关的配置文件：

```bash
/etc/sysconfig/network-scripts/ifcfg-IFACE
```

**说明参考：**

```bash
/usr/share/doc/initcripts-*/sysconfig.txt
```

**常用配置**

- TYPE：接口类型默认为Ethernet
- NAME:配置名称
- DEVICE：此配置文件应用到的设备名称
- HWADDR：设备的MAC地址
- UUID：设备UUID
- BOOTPROTO：地址配置协议，dhcp,static,none等
- IPADDR：IP地址设置
- NETMASK：子网掩码
- PREFIX：子网掩码位数，如24
- GATEWAY：默认网关
- DNS1：DNS服务器
- DOMAIN：自动搜索的域名后缀
- ONBOOT：在系统启动时自动激活此设备

示例：

```bash
cat /etc/sysconfig/network-scripts/ifcfg-eth0 
TYPE=Ethernet
PROXY_METHOD=none
BROWSER_ONLY=no
BOOTPROTO=static
DEFROUTE=yes
NAME=eth0
DEVICE=eth0
ONBOOT=yes
IPADDR=10.202.41.200
NETMASK=255.255.252.0
GATEWAY=10.202.40.1
DNS1=10.202.40.137
```

### 2.配置当前主机的主机名

```bash
#centos6 之前版本
/etc/sysconfig/network
HOSTNAME=

#centos7 以后版
/etc/hostname HOSTNAME
```

### 3.本地主机名数据库和IP地址的映射

**优先于使用DNS前检查**

getent hosts 查看/etc/hosts 内容

```bash
/etc/hosts
```

### 4.DNS域名解析

```bash
/etc/resolv.conf
nameserver DNS_SERVER_IP1
nameserver DNS_SERVER_IP2
nameserver DNS_SERVER_IP3
search DOMAIN
```

### 5.修改/etc/hosts和DNS的优先级

```bash
[16:12:51 root@centos8 ~]#cat /etc/nsswitch.conf | grep host
shosts:      files dns myhostname
```

### 6.路由相关的配置文件

```bash
/etc/sysconfig/network-scripts/route-IFACE
两种风格：
(1)  TARGET via GW
如：10.0.0.0/8 via 172.16.0.1

(2)  每三行定义一条路由
ADDRESS#=TARGET
NETMASK#=mask
GATEWAY#=GW
```

## 1.3 Centos7以上版网络配置

### 1.网卡命名规则

**systemd对网络设备的命名方式**

1. 如果Firmware或BIOS为主板上集成的设备提供的索引信息可用，且可预测则根据此索引进行命名，如：eno1
2. 如果Firmware或BIOS为PCI-E扩展槽所提供的索引信息可用，且可预测，则根据此索引进行命名，如：ens1
3. 如果硬件接口的物理位置信息可用，则根据此信息命名，如enp2s0
4. 如果用户显式启动，也可根据MAC地址进行命名，如：enx2387a1dc56
5. 上述均不可用时，则使用传统命名机制

**基于BIOS支持启用biosdevname软件**

```bash
内置网卡：em1,em2
pci卡：pYpX   Y:slot,X:port
```

**网卡组成格式**

- en: Ethernet 有线局域网
- wl: wlan 无线局域网
- ww: wwan无线广域网
- o: 集成设备的设备索引号
- s: 扩展槽的索引号
- x: 基于MAC地址的命名
- ps: enp2s1

**使用传统命名方式：**

```bash
#编辑/etc/default/grub配置文件
GRUB_CMDLINE_LINUX="net.ifnames=0 biosdevname=0"
#为grub2生成其配置文件
grub2-mkconfig -o /etc/grub2.cfg
#重启系统
reboot
```

### 2.主机名

**配置文件：**

```bash
/etc/hostname
```

默认没有此文件，通过DNS反向解析获取主机名，主机名默认为：localhost.localdomain

**设置主机名**

```bash
hostnamectl set-hostname centos7.magedu.com
```

删除文件/etc/hostname，恢复主机名localhost.localdomain

**显示主机名信息**

```bash
hostname
hostnamectl status
```

# 二、网络配置工具nmcli

nmcli是软件NetworkManager的提供的命令。使用nmcli命令时，必须确保NetworkManager为运行状态（nm 代表 NetworkManager，cli 代表 Command-Line）。在新版本centos中默认使用NetworkManager进行网络管理。

## 2.1 网络配置工具nmcli

**命令行工具：nmcli**

以上工具都依赖NetworkManager服务，此服务是管理和监控网络设置的守护进程

**nmcli命令**

nmcli命令相关术语

* 设备即网络接口
* 连接是对网络接口的配置，一个网络接口可有多个连接配置，但同时只有一个连接配置生效

**命令有以下几种常用的子命令**

- networking：管理网络状态
- connection：连接配置管理
- device：设备管理

## 2.2 networking

```bash
#显示NetworkManager是否接管网络设置
nmcli networking
#查看网络连接状态
nmcli networking connectivity
#开启网络连接
nmcli networking on
#关闭网络连接
nmcli networking off
```

## 2.3 device

用于管理设备

```bash
#查看所有设备状态
nmcli device status
#断开设备
nmcli device disconnect eth2
#重新连接设备
nmcli device connect eth2
#删除设备，物理设备无法删除
nmcli device delete eth0
```

## 2.4 connection

```bash
#查看所有连接配置
nmcli connection show
#重载连接配置
nmcli connection reload
#关闭/启动一个连接配置
nmcli connection up eth0
nmcli connection downeth0
#创建一个连接配置
nmcli connection add con-name eth1 ifname eth1 autoconnect yes ipv4.method static type Ethernet ipv4.addresses 192.168.10.11/24 ipv4.gateway 192.168.10.2
#删除连接配置
nmcli connection delete eth1
#修改连接配置
nmcli connection modify eth1 ipv4.addresses 192.168.10.13/24
#复制一份连接配置
nmcli connection clone eth1 eth1-1
```

#### 创建/修改连接配置详解

**参数说明**：

- con-name：连接配置的名称
- ifname：所连接设备的名称，等于网卡配置文件的DEVICE字段
- type：网卡类型，等于网卡配置文件的TYPE字段
  - ethernet：以太网接口，一般默认这个
  - bridge：桥接接口
  - 还有许多这里只写2种常见的
- autoconnect：在服务器重启时是否自动加载配置，等于网卡配置文件的ONBOOT字段
  - yes
  - no
- ipv4.method：网卡工作模式，等于网卡配置文件的BOOTPROTO字段
  - static：静态配置IP
  - dhcp：动态获取IP
  - manual：为空表示不设置
- ipv4.addresses：网卡的地址配置
  - 192.168.10.1/24：表示地址与子网掩码一起配置
- ipv4.gateway：网卡的默认网关
- ipv4.dns：设置dns

**注意事项**

1. 使用nmcli创建的连接配置会自动进行持久化文件会写入`/etc/sysconfig/network-scripts/ifcfg-{con-name}`中
2. 可以创建多个连接配置，但是一个连接配置只能作用与一个设备
3. 可以创建多个名相同的连接配置，持久化名称后面会按照编号依次排列

**修改连接配置说明**

```bash
#注意修改配置可在配置前添加-+添加删除配置
nmcli con mod eth1 connection.autoconnect no
nmcli con mod eth1 ipv4.dns 172.25.X.254
nmcli con mod eth1 +ipv4.dns  8.8.8.8
nmcli con mod eth1 -ipv4.dns  8.8.8.8
nmcli con mod eth1 ipv4.addresses “172.16.X.10/24  172.16.X.254”
nmcli con mod eth1 +ipv4.addresses 10.10.10.10/16
```

## 2.5 nmcli实现bonding

- active-backup：bond的工作默认为主备，同一时间只有一个网络接口可以进行通信

```bash
#添加bonding接口
nmcli connection add type bond con-name bond0 ifname bond0 mode active-backup
#添加从属接口
nmcli connection add type bond-slave ifname eth1 master bond0
nmcli connection add type bond-slave ifname eth2 master bond0
#注：如无为从属接口提供连接名，则该名称是接口名称加类型构成

#要启动绑定，则必须首先启动从属接口
nmcli connection up bond-slave-eth0
nmcli connection up bond-slave-eth1

#启动绑定
nmcli connection up bond0
#配置ip
nmcli connection modify bond0 ipv4.address 192.168.10.21/24
nmcli connection reload
nmcli connection up bond0
```

## 2.6 网桥

**桥接原理**

桥接：把一台机器上的若干个网络接口“连接”起来。其结果是，其中一个网口收到的报文会被复制给其 他网口并发送出去。以使得网口之间的报文能够互相转发。网桥就是这样一个设备，它有若干个网口，  并且这些网口是桥接起来的。与网桥相连的主机就能通过交换机的报文转发而互相通信。
![clipboard.png](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/clipboard-6024dc87.png)

主机A发送的报文被送到交换机S1的eth0口，由于eth0与eth1、eth2桥接在一起，故而报文被复制到

eth1和eth2，并且发送出去，然后被主机B和交换机S2接收到。而S2又会将报文转发给主机C、D

**配置实现网桥**

注意：NetworkManager只支持以太网接口接口连接到网桥，不支持聚合接口

nmcli命令创建软件网桥

```bash
#创建桥接网卡
nmcli con add con-name br0 type bridge ifname br0
#配置桥接网卡
nmcli con modify br0 ipv4.addresses 192.168.10.21/24 ipv4.method manual
#添加物理接口到桥接网卡
nmcli con add con-name br0-eth1 type bridge-slave ifname eth1 master br0
nmcli con add con-name br0-eth2 type bridge-slave ifname eth2 master br0
```

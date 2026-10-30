---
title: "Redis服务"
date: 2021-05-17T16:46:50+08:00
draft: false
description: "从缓存概念切入，介绍 Redis 的数据结构、持久化与常见服务配置。"
cover: "https://b3logfile.com/bing/20190827.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["应用服务"]
tags: ["Redis"]
toc: true
---
# 一、缓存概念

缓存是为了调节速度不一致的两个或多个不同的物质的速度，在中间对速度较快的一方起到一个加速访问速度较慢的一方的作用，比如CPU的一级、二级缓存是保存了CPU最近经常访问的数据，内存是保存CPU经常访问硬盘的数据，而且硬盘也有大小不一的缓存，甚至是物理服务器的raid 卡有也缓存，都是为了起到加速CPU 访问硬盘数据的目的，因为CPU的速度太快了，CPU需要的数据由于硬盘往往不能在短时间内满足CPU的需求，因此PCU缓存、 内存、Raid 卡缓存以及硬盘缓存就在一定程度上满足了CPU的数据需求，即CPU 从缓存读取数据可以大幅提高 CPU的工作效率。

![image-20210505154339650](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210505154339650.png)

## 1.1 系统缓存

**buffer与cache**

buffer：缓冲也叫写缓冲，一般用于写操作，可以将数据先写入内存在写入磁盘，buffer 一般用于写缓冲，用于解决不同介质的速度不一致的缓冲，先将数据临时写入到里自己最近的地方，以提高写入速度，CPU会把数据先写到内存的磁盘缓冲区，然后就认为数据已经写入完成看，然后由内核在后续的时间在写入磁盘，所以服务器突然断电会丢失内存中的部分数据。

cache：缓存也叫读缓存，一般用于读操作，CPU读文件从内存读，如果内存没有就先从硬盘读到内存再读到 CPU，将需要频繁读取的数据放在里自己最近的缓存区域，下次读取的时候即可快速读取。

**cache的保存位置**

客户端：浏览器 内存：本地服务器、远程服务器 硬盘：本机硬盘、远程服务器硬盘

**cache的特性**

自动过期：给缓存的数据加上有效时间，超出时间后自动过期删除过期时间

强制过期：源网站更新图片后CDN 是不会更新的，需要强制是图片缓存过期命中率：即缓存的读取命中率

## 1.2 用户层缓存

### 1.2.1 DNS缓存

默认为60秒，即60秒之内在访问同一个域名就不在进行DNS解析： 查看chrome浏览器的DNS缓存： chrome://net-internals/#dns 现今的版本已经无法查看

### 1.2.3 浏览器缓存过期机制

#### 1.2.3.1 最后修改时间

系统调用文件的时候会获取文件的最后修改时间，如果没有发生变化就返回给浏览器304的状态码，表示没有发生变化，然后浏览器就使用的本地的缓存展示资源，如果服务端返回最后修改时间没有发生过变化，则直接使用浏览器的本地缓存，状态码就是304

#### 1.2.3.2 Etag标记

基于Etag标记是否一致做判断页面是否发生过变化，比如基于Nginx 的etag on来实现。

![image-20210505155220689](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210505155220689.png)

#### 1.2.3.3 过期时间

以上两种都需要发送请求，即不管资源是否过期都要发送请求进行协商，这样会消耗不必要的时间，因此有了缓存的过期时间，即第一次请求资源的时候带一个资源的过期时间，默认为30天，当前这种方式使用的比表较多，但是无法保证客户的时间都是准确并且一致的，因此会加入一个最大生存周期，使用用户本地的时间计算缓存数据是否超过多少天，下面的过期时间为2027年，但是缓存的最大生存周期计算为天等于3650天即10年。

## 1.3 CDN缓存

### 1.3.1 什么是CDN

内容分发网络（Content Delivery Network），通过将服务内容分发至全网加速节点，利用全球调度系统使用户能够就近获取，有效降低访问延迟，提升服务可用性，CDN 第一降低机房的使用带宽，因为很多资源通过CDN就直 接返回用户了，第二解决不同运营商之间的互联，因为可以让联通的网络访问联通让电信的网络访问电信，起到加速用户访问的目的， 第三：解决用户访问的地域问题，就近返回用户资源。

```bash
百度CDN：https://cloud.baidu.com/product/cdn.html
阿里CDN：https://www.aliyun.com/product/cdn?spm=5176.8269123.416540.50.728y8n
腾讯CDN：https://www.qcloud.com/product/cdn
```

### 1.3.2 用户请求CDN流程

提前对静态内容进行预缓存，避免大量的请求回源，导致主站网络带宽被打满而导致数据无法更新，另外CDN可以将数据根据访问的热度不同而进行不同级别的缓存，例如访问量最高的资源访问CDN 边缘节点的内存，其次的放 在SSD或者SATA，再其次的放在云存储，这样兼顾了速度与成本。

![image-20210505155502054](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210505155502054.png)

### 1.3.3 CDN主要优势

提前对静态内容进行预缓存，避免大量的请求回源，导致主站网络带宽被打满而导致数据无法更新，另外CDN可以 将数据根据访问的热度不同而进行不同级别的缓存，例如访问量最高的资源访问CDN 边缘节点的内存，其次的放 在SSD或者SATA，再其次的放在云存储，这样兼顾了速度与成本。缓存-缓存到最快的地方如内存，缓存的数据准 确命中率高，访问速度就快。

```bash
调度准确-将用户调度到最近的边缘节点
性能优化-CDN 专门用于缓存响应速度快
安全相关-抵御攻击
节省带宽：由于用户请求由边缘节点响应，因此大幅降低到源站带宽。
```

## 1.4 应用层缓存

Nginx、PHP等web服务可以设置应用缓存以加速响应用户请求，另外有些解释性语言比如PHP/Python/Java不能直接运行，需要先编译成字节码，但字节码需要解释器解释为机器码之后才能执行，因此字节码也是一种缓存，有 时候会出现程序代码上线后字节码没有更新的现象。

## 1.5 其他层面缓存

### 1.5.1 CPU缓存

CPU缓存(L1的数据缓存和L1的指令缓存)、二级缓存、三级缓存

![image-20210505155647211](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210505155647211.png)

### 1.5.2 cookie与session

Cookie是访问某些网站以后在本地存储的一些网站相关的信息，下次再访问的时候减少一些步骤,比如加密后的账 户名密码等信息 Cookies是服务器在客户端浏览器上存储的小段文本并随每一个请求发送至同一个服务器，是一种 实现客户端保持状态的方案。 session称为会话信息，位于web服务器上，主要负责访问者与网站之间的交互，当 浏览器请求http地址时，可以基于之前的session实现会话保持、session共享等。

### 1.5.3 session与cookie的区别

1. Cookie以文本文件格式存储在浏览器中，而session存储在服务端。
2. cookie的存储限制了数据量，只允许 4KB，而session是无限制的。
3. cookie包含在每一个客户端请求报文中，因此容易被人捕获。
4. cookie和 session都可以设置过期时间。

# 二 、redis部署与使用

## 2.1 redis基础

官网地址：https://redis.io/

Redis和Memcached是非关系型数据库也称为NoSQL数据库，MySQL、Mariadb、SQL Server、PostgreSQL、 Oracle 数据库属于关系型数据(RDBMS, Relational Database Management System)

### 2.1.1 redis简介

Redis(Remote Dictionary Server)在2009年发布，开发者Salvatore Sanfilippo是意大利开发者，他本想为自己的 公司开发一个用于替换MySQL的产品Redis，但是没有想到他把Redis开源后大受欢迎，短短几年，Redis就有了很 大的用户群体，目前国内外使用的公司有知乎网、新浪微博、GitHub等

redis是一个开源的、遵循BSD协议的、基于内存的而且目前比较流行的键值数据库(key-value database)，是一个 非关系型数据库，redis提供将内存通过网络远程共享的一种服务，提供类似功能的还有memcache，但相比 memcache，redis还提供了易扩展、高性能、具备数据持久性等功能。

Redis在高并发、低延迟环境要求比较高的环境使用量非常广泛，目前redis在DB-Engine月排行榜https://db-engin es.com/en/ranking 中一直比较靠前，而且一直是键值型存储类的首位。

### 2.1.2 redis对比memcached

支持数据的持久化：可以将内存中的数据保持在磁盘中，重启redis服务或者服务器之后可以从备份文件中恢复数据到内存继续使用。

```bash
支持更多的数据类型：支持string(字符串)、hash(哈希数据)、list(列表)、set(集合)、zet(有序集合)
支持数据的备份：可以实现类似于数据的master-slave模式的数据备份，另外也支持使用快照+AOF。
支持更大的value数据：memcache单个key value最大只支持1MB，而redis最大支持512MB。
Redis 是单线程，而memcache是多线程，所以单机情况下没有memcache并发高，但redis 支持分布式集群以实现
更高的并发，单Redis实例可以实现数万并发。
支持集群横向扩展：基于redis cluster的横向扩展，可以实现分布式集群，大幅提升性能和数据安全性。
都是基于C语言开发。
```

### 2.1.3 redis 典型应用场景

```bash
Session 共享：常见于web集群中的Tomcat或者PHP中多web服务器session共享
消息队列：ELK的日志缓存、部分业务的订阅发布系统
计数器：访问排行榜、商品浏览数等和次数相关的数值统计场景
缓存：数据库查询缓存、电商网站商品信息、新闻内容
微博/微信社交场合：共同好友、点赞评论等
```

## 2.2 Redis安装及使用

官方下载地址：http://download.redis.io/releases

### 2.2.1 yum安装redis

在centos系统上需要安装epel源。

**查看yum仓库redis版本**

```bash
#centos7，需要使用epel源安装，且版本比较旧
[16:04:51 root@centos7 ~]#yum list redis
redis.x86_64                                 3.2.12-2.el7                                 epel
#centos8，不需要epel源，本身镜像就存在
[16:04:34 root@centos8 ~]#yum list redis
redis.x86_64                   5.0.3-2.module_el8.2.0+318+3d7e67ea                   AppStream
```

**安装redis**

```bash
[16:04:56 root@centos7 ~]#yum install redis -y
[16:07:08 root@centos7 ~]#systemctl enable --now redis 
Created symlink from /etc/systemd/system/multi-user.target.wants/redis.service to /usr/lib/systemd/system/redis.service.
[16:07:22 root@centos7 ~]#redis-cli 
127.0.0.1:6379> info
# Server
redis_version:3.2.12
redis_git_sha1:00000000
redis_git_dirty:0
redis_build_id:7897e7d0e13773f
redis_mode:standalone
os:Linux 3.10.0-1127.el7.x86_64 x86_64
arch_bits:64
```

### 2.2.2 apt安装redis

```bash
[16:14:56 root@ubuntu18-04 ~]#apt  install redis
[16:16:10 root@ubuntu18-04 ~]#systemctl enable --now redis-server
[16:16:24 root@ubuntu18-04 ~]#redis-cli 
127.0.0.1:6379> info
# Server
redis_version:4.0.9
redis_git_sha1:00000000
redis_git_dirty:0
redis_build_id:9435c3c2879311f3
redis_mode:standalone
os:Linux 4.15.0-76-generic x86_64
arch_bits:64
```

### 2.2.3 编译安装redis

下载当前最新release版本redis 源码包：http://download.redis.io/releases/

#### 2.2.3.1 编译安装命令

官方的安装命令： https://redis.io/download

```bash
#安装常用命令
[16:19:17 root@ubuntu18-04 ~]#apt install iproute2  ntpdate  tcpdump telnet traceroute nfs-kernel-server nfs-common  lrzsz tree  openssl libssl-dev libpcre3 libpcre3-dev zlib1g-dev ntpdate tcpdump telnet traceroute  gcc openssh-server lrzsz tree  openssl libssl-dev libpcre3 libpcre3-dev zlib1g-dev ntpdate tcpdump telnet traceroute iotop unzip zip libjemalloc-dev  libsystemd-dev
#下载源码包
[16:20:00 root@ubuntu18-04 ~]#wget https://download.redis.io/releases/redis-6.2.2.tar.gz
#解包
[16:21:02 root@ubuntu18-04 ~]#tar xvf redis-6.2.2.tar.gz 
[16:21:02 root@ubuntu18-04 ~]#cd redis-6.2.2/
#查看自带的service文件
[16:21:19 root@ubuntu18-04 redis-6.2.2]#ll utils/systemd-redis_server.service 
-rw-rw-r-- 1 root root 1550 Apr 20 13:03 utils/systemd-redis_server.service
#编译并安装
[16:27:21 root@ubuntu18-04 redis-6.2.2]#make USE_SYSTEMD=yes PREFIX=/apps/redis install
#创建配置文件
[16:47:00 root@ubuntu18-04 redis]#cd /apps/redis/
[16:47:06 root@ubuntu18-04 redis]#mkdir etc
[16:47:27 root@ubuntu18-04 redis]#cp /root/redis-6.2.2/redis.conf etc/
#修改service文件
[16:34:37 root@ubuntu18-04 redis-6.2.2]#cp utils/systemd-redis_server.service /lib/systemd/system/redis.service 
[16:35:20 root@ubuntu18-04 redis-6.2.2]#vim /lib/systemd/system/redis.service 
[Unit]
Description=Redis data structure server
Documentation=https://redis.io/documentation
#Before=your_application.service another_example_application.service
#AssertPathExists=/var/lib/redis
Wants=network-online.target
After=network-online.target
[Service]
ExecStart=/apps/redis/bin/redis-server /apps/redis/etc/redis.conf --supervised systemd --d    aemonize no #启动文件目录，也就是编译安装的路径
## Alternatively, have redis-server load a configuration file:
#ExecStart=/usr/local/bin/redis-server /path/to/your/redis.conf
LimitNOFILE=65535     #可以打开的文件描述符，最好改大一些
NoNewPrivileges=yes
#OOMScoreAdjust=-900
#PrivateTmp=yes
Type=notify
TimeoutStartSec=infinity
TimeoutStopSec=infinity
UMask=0077
User=redis   #启动用户
Group=redis  #启动组
WorkingDirectory=/apps/redis  #限制工作目录
[Install]
WantedBy=multi-user.target
#创建用户
[16:30:47 root@ubuntu18-04 redis-6.2.2]#useradd -s /sbin/nologin -r redis
[16:30:52 root@ubuntu18-04 redis-6.2.2]#id redis
[16:30:53 root@ubuntu18-04 redis-6.2.2]#chown -R redis.redis /apps/redis
[16:31:55 root@ubuntu18-04 redis-6.2.2]#ls -l /apps/
total 4
drwxr-xr-x 3 redis redis 4096 May  5 16:26 redis
#启动
[16:32:15 root@ubuntu18-04 redis-6.2.2]#systemctl daemon-reload 
[16:32:51 root@ubuntu18-04 redis-6.2.2]#systemctl start redis.service 
#测试
[16:33:37 root@ubuntu18-04 redis-6.2.2]#cd /apps/redis/bin/
[16:33:43 root@ubuntu18-04 bin]#./redis-cli 
127.0.0.1:6379> info
# Server
redis_version:6.2.2
redis_git_sha1:00000000
redis_git_dirty:0
redis_build_id:c79d5a0b7fee6a6b
redis_mode:standalone
os:Linux 4.15.0-76-generic x86_64
arch_bits:64
```

#### 2.2.3.2 前台启动redis

```bash
#前台启动
[16:51:30 root@ubuntu18-04 ~]#/apps/redis/bin/redis-server /apps/redis/etc/redis.conf 
8109:M 05 May 2021 16:53:46.489 # WARNING: The TCP backlog setting of 511 cannot be enforced because /proc/sys/net/core/somaxconn is set to the lower value of 128.
8109:M 05 May 2021 16:53:46.489 # Server initialized
8109:M 05 May 2021 16:53:46.489 # WARNING overcommit_memory is set to 0! Background save may fail under low memory condition. To fix this issue add 'vm.overcommit_memory = 1' to /etc/sysctl.conf and then reboot or run the command 'sysctl vm.overcommit_memory=1' for this to take effect.
8109:M 05 May 2021 16:53:46.491 * Loading RDB produced by version 6.2.2
8109:M 05 May 2021 16:53:46.491 * RDB age 71 seconds
8109:M 05 May 2021 16:53:46.491 * RDB memory usage when created 0.77 Mb
8109:M 05 May 2021 16:53:46.491 * DB loaded from disk: 0.000 seconds
8109:M 05 May 2021 16:53:46.491 * Ready to accept connections
```

**解决当前的警告提示**

##### 2.2.3.2.1 tcp-backlog

```bash
8109:M 05 May 2021 16:53:46.489 # WARNING: The TCP backlog setting of 511 cannot be enforced because /proc/sys/net/core/somaxconn is set to the lower value of 128.
```

The backlog argument defines the maximum length to which the queue of pending connections for sockfd may grow. If a connection request arrives when the queue is full, the client may receive an error with an indication of ECONNREFUSED or, if the underlying protocol supports retransmission, the request may be ignored so that a later reattempt at connection succeeds.

backlog参数控制的是三次握手的时候server端收到client ack确认号之后的队列值。

```bash
#默认为128，但是redis配置文件默认511
[16:56:21 root@ubuntu18-04 ~]#cat /apps/redis/etc/redis.conf  | grep 511
tcp-backlog 511
#可以修改配置文件中的值改为128，或者修改内核参数为511
[16:57:38 root@ubuntu18-04 ~]#sysctl -a | grep 511
net.core.somaxconn = 511
#修改完成后再次启动就没有警告了
```

##### 2.2.3.2.2 vm.overcommit_memory

```bash
8109:M 05 May 2021 16:53:46.489 # WARNING overcommit_memory is set to 0! Background save may fail under low memory condition. To fix this issue add 'vm.overcommit_memory = 1' to /etc/sysctl.conf and then reboot or run the command 'sysctl vm.overcommit_memory=1' for this to take effect.
```

0. 表示内核将检查是否有足够的可用内存供应用进程使用；如果有足够的可用内存，内存申请允许；否则，内存申请失败，并把错误返回给应用进程。
1. 表示内核允许分配所有的物理内存，而不管当前的内存状态如何。
2. 表示内核允许分配超过所有物理内存和交换空间总和的内存

```bash
#把内核参数的值改为1
vm.overcommit_memory = 1
```

**以上修改完成后，重启redis检查**

```bash
[17:02:54 root@ubuntu18-04 ~]#/apps/redis/bin/redis-server /apps/redis/etc/redis.conf
8565:M 05 May 2021 17:02:56.699 # Server initialized
8565:M 05 May 2021 17:02:56.700 * Loading RDB produced by version 6.2.2
8565:M 05 May 2021 17:02:56.700 * RDB age 2 seconds
8565:M 05 May 2021 17:02:56.700 * RDB memory usage when created 0.77 Mb
8565:M 05 May 2021 17:02:56.700 * DB loaded from disk: 0.000 seconds
8565:M 05 May 2021 17:02:56.700 * Ready to accept connections
```

### 2.2.4 连接到Redis

主要分为运维人员的连接和程序的连接

**本机非密码连接**

```bash
[16:41:51 root@ubuntu18-04 bin]#./redis-cli
```

**跨主机非密码连接**

```bash
[16:42:59 root@centos7 ~]#redis-cli -h 192.168.10.181 -p 6379
```

**跨主机密码连接**

```bash
[16:42:59 root@centos7 ~]#redis-cli -h 192.168.10.181 -p 6379 -a 123456
```

**shell脚本写入数据到Redis**

```bash
[17:15:13 root@ubuntu18-04 ~]#cat redis-write-linux.sh 
#!/bin/bash
NUM=`seq 1 10000`
for i in ${NUM};do
    redis-cli -h 127.0.0.1 set key-${i} value-${i}
    echo "key-${i} value-${i} 写入完成"
done
echo "十万个key写入到Redis完成"
[17:15:20 root@ubuntu18-04 ~]#bash redis-write-linux.sh 
key-9999 value-9999 写入完成
OK
key-10000 value-10000 写入完成
十万个key写入到Redis完成
```

**python连接方式**

```bash
[17:21:44 root@ubuntu18-04 ~]#cat redis-python.sh 
#!/bin/env python
import redis
import time
pool = redis.ConnectionPoll(host="192.168.10.181",port=6379,password="")
r = redis.Redis(connection_pool=pool)
for i in range(100):
  r.set("k%d" % i,"v%d" % i)
  time.sleep(1)
  data=r.get("k%d" % i)
  print(data)
```

## 2.3 redis配置文件

### 2.3.1 redis主要配置项

#### 2.3.1.1 网络配置

```bash
#网络配置
bind 0.0.0.0  #监听地址，可以用空格隔开后多个监听IP
protected-mode yes #redis3.2 之后加入的新特性，在没有设置bind IP和密码的时候,redis只允许访问127.0.0.1:6379，远程访问将提示警告信息并拒绝远程访问
port 6379 #监听端口
tcp-backlog 511 #三次握手的时候server端收到client ack确认号之后的队列值。
timeout 0 #客户端和Redis服务端的连接超时时间，默认是0，表示永不超时。
tcp-keepalive 300 #tcp 会话保持时间
```

#### 2.3.2.2 全局配置

```bash
#全局配置
daemonize n #认情况下 redis 不是作为守护进程运行的，如果你想让它在后台运行，你就把它改成 yes,当redis作为守护进程运行的时候，它会写一个 pid 到 /var/run/redis.pid 文件里面
supervised no #和操作系统相关参数，可以设置通过upstart和systemd管理Redis守护进程，centos 7以后都使用systemd
pidfile /var/run/redis_6379.pid #pid文件路径
loglevel notice #日志级别
logfile "" #日志路径
databases 16 #设置db 库数量，默认16个库
always-show-logo yes #在启动redis 时是否显示log
set-proc-title yes #进程信息显示
```

#### 2.3.2.3 快照相关

```bash
#快照相关的
save 900 1 #在900秒内有一个键内容发生更改就出就快照机制
save 300 10
save 60 10000
stop-writes-on-bgsave-error no #快照出错时是否禁止redis 写入操作
rdbcompression yes #持久化到RDB文件时，是否压缩，"yes"为压缩，"no"则反之
rdbchecksum yes  #是否开启RC64校验，默认是开启
dbfilename dump.rdb #快照文件名
dir ./ #快照文件保存路径
```

#### 2.3.2.4 复制相关

```bash
#复制相关
replica-serve-stale-data yes #当从库同主库失去连接或者复制正在进行，从机库有两种运行方式：
1. 如果replica-serve-stale-data设置为yes(默认设置)，从库会继续响应客户端的读请求。
2. 如果replica-serve-stale-data设置为no，除去指定的命令之外的任何请求都会返回一个错误"SYNC withmaster in progress"。
replica-read-only yes #是否设置从库只读
repl-diskless-sync no #是否使用socket方式复制数据(无盘同步)，新slave连接连接时候需要做数据的全量同步，redis server就要从内存dump出新的RDB文件，然后从master传到slave，有两种方式把RDB文件传输给客户端：
1. 基于硬盘（disk-backed）：master创建一个新进程dump RDB，RDB完成之后由父进程（即主进程）传给slaves。
2. 基于socket（diskless）：master创建一个新进程直接dump RDB到slave的socket，不经过主进程，不经过硬盘。基于硬盘的话，RDB文件创建后，一旦创建完毕，可以同时服务更多的slave，但是基于socket的话， 新slave连接到master之后得逐个同步数据。
#在磁盘较慢并且网络较快的时候，可以用diskless(yes),否则使用磁盘(no)
repl-diskless-sync-delay 30 #diskless复制的延迟时间，设置0为关闭，在延迟时间内连接的新客户端，会一起通过disk方式同步数据，但是一旦复制开始还没有结束之前，master节点不会再接收新slave的复制请求，直到下一次同步开始。
repl-ping-slave-period 10 #slave根据master指定的时间进行周期性的PING 监测
repl-timeout 60 #复制连接的超时时间，需要大于repl-ping-slave-period，否则会经常报超时
repl-disable-tcp-nodelay no #在socket模式下是否在slave套接字发送SYNC之后禁用 TCP_NODELAY，如果选择“yesRedis将使用更少的TCP包和带宽来向slaves发送数据，但是这将使数据传输到slave上有延迟，Linux内核的默认配置会达到40毫秒，如果你选择了 "no" 数据传输到salve的延迟将会减少但要使用更多的带宽。
repl-backlog-size 512mb #复制缓冲区内存大小，只有在slave连接之后才分配内存。
repl-backlog-ttl 3600 #多次时间master没有slave连接，就清空backlog缓冲区。
replica-priority 100  #当master不可用，Sentinel会根据slave的优先级选举一个master，最低的优先级的slave，当选master，而配置成0，永远不会被选举。
```

#### 2.3.2.5 安全相关

```bash
requirepass foobared #设置redis 连接密码
rename-command #重命名一些高危命令
```

#### 2.3.2.6 连接数与内存

```bash
maxclients 10000 #Redis最大连接客户端
maxmemory #最大内存，单位为bytes字节，8G内存的计算方式8(G)1024(MB)1024(KB)*1024(Kbyte)，需要注意的是slave的输出缓冲区是不计算在maxmemory内。
```

#### 2.3.2.7 AOF相关

```bash
appendonly no #是否开启AOF日志记录，默认redis使用的是rdb方式持久化，这种方式在许多应用中已经足够用了，但是redis如果中途宕机，会导致可能有几分钟的数据丢失(取决于dumpd数据的间隔时间)，根据save来策略进行持久化，Append Only File是另一种持久化方式，可以提供更好的持久化特性，Redis会把每次写入的数据在接收后都写入 appendonly.aof 文件，每次启动时Redis都会先把这个文件的数据读入内存里，先忽略RDB文件。
appendfilename "appendonly.aof" #AOF文件名
appendfsync everysec #aof持久化策略的配置,no表示不执行fsync，由操作系统保证数据同步到磁盘,always表示每次写入都执行fsync，以保证数据同步到磁盘,everysec表示每秒执行一次fsync，可能会导致丢失这1s数据。
no-appendfsync-on-rewrite no #在aof rewrite期间,是否对aof新记录的append暂缓使用文件同步策略,主要考虑磁盘IO开支和请求阻塞时间。默认为no,表示"不暂缓",新的aof记录仍然会被立即同步，Linux的默认fsync策略是30秒，如果为yes 可能丢失30秒数据，但由于yes性能较好而且会避免出现阻塞因此比较推荐。
auto-aof-rewrite-percentage 100 # 当Aof log增长超过指定百分比例时，重写AOF文件， 设置为0表示不自动重写Aof 日志，重写是为了使aof体积保持最小，但是还可以确保保存最完整的数据
auto-aof-rewrite-min-size 64mb #触发aof rewrite的最小文件大小
aof-load-truncated yes #是否加载由于其他原因导致的末尾异常的AOF文件(主进程被kill/断电等)
aof-use-rdb-preamble no #redis4.0新增RDB-AOF混合持久化格式，在开启了这个功能之后，AOF重写产生的文件将同时包含RDB格式的内容和AOF格式的内容，其中RDB格式的内容用于记录已有的数据，而AOF格式的内存则用于记录最近发生了变化的数据，这样Redis就可以同时兼有RDB持久化和AOF持久化的优点（既能够快速地生成重写文件，也能够在出现问题时，快速地载入数据）。
```

#### 2.3.2.8 lua相关

```bash
lua-time-limit 5000 #lua脚本的最大执行时间，单位为毫秒
```

#### 2.3.2.9 集群相关

```bash
cluster-enabled yes #是否开启集群模式，默认是单机模式
cluster-config-file nodes-6379.conf #由node节点自动生成的集群配置文件
cluster-node-timeout 15000 #集群中node节点连接超时时间
cluster-replica-validity-factor 10 #在执行故障转移的时候可能有些节点和master断开一段时间数据比较旧，这些节点就不适用于选举为master，超过这个时间的就不会被进行故障转移

cluster-migration-barrier 1 #集群迁移屏障，一个主节点拥有的至少正常工作的从节点，即如果主节点的slave节点故障后会将多余的从节点分配到当前主节点成为其新的从节点。
cluster-require-full-coverage no #集群请求槽位全部覆盖，如果一个主库宕机且没有备库就会出现集群槽位不全，那么yes情况下redis集群槽位验证不全就不再对外提供服务，而no则可以继续使用但是会出现查询数据查不到的情况(因为有数据丢失)。
```

#### 2.3.2.10 慢日志相关

```bash
#Slow log 是 Redis 用来记录查询执行时间的日志系统，slow log 保存在内存里面，读写速度非常快，因此你可以放心地使用它，不必担心因为开启 slow log 而损害 Redis 的速度。
slowlog-log-slower-than 10000 #以微秒为单位的慢日志记录，为负数会禁用慢日志，为0会记录每个命令操作。
slowlog-max-len 128 #记录多少条慢日志保存在队列，超出后会删除最早的，以此滚动删除
```

## 2.4 redis 数据类型

### 2.4.1 字符串(string)

字符串是所有编程语言中最常见的和最常用的数据类型，而且也是redis最基本的数据类型之一，而且redis中所有的key的类型都是字符串。

**添加一个key**

```bash
127.0.0.1:6379> set key1 value1
OK
127.0.0.1:6379> get key1
"value1"
127.0.0.1:6379> type key1
string
127.0.0.1:6379> set name2 jak2 ex 3  #设置自动过期时间
OK
```

**获取一个key的内容**

```bash
127.0.0.1:6379> get key1
"value1"
```

**删除一个key**

```bash
127.0.0.1:6379> del key1
(integer) 1
```

**批量设置多个key**

```bash
127.0.0.1:6379> MSET key1 value1 key2 value2
OK
```

**批量获取多个key**

```bash
127.0.0.1:6379> MGET key1 key2
1) "value1"
2) "value2"
```

**追加数据**

```bash
127.0.0.1:6379> APPEND key1 zhangzhuo
(integer) 15
127.0.0.1:6379> get key1
"value1zhangzhuo"
```

**数值递增**

```bash
127.0.0.1:6379> set num 10
OK
127.0.0.1:6379> INCR num
(integer) 11
127.0.0.1:6379> get num
"11"
```

**数值递减**

```bash
127.0.0.1:6379> get num
"11"
127.0.0.1:6379> DECR num
(integer) 10
127.0.0.1:6379> get num
"10"
```

**返回字符串key长度**

```bash
127.0.0.1:6379> STRLEN key1
(integer) 15
```

**判断key是否存在**

```bash
127.0.0.1:6379> EXISTS key1
(integer) 1  #存在
127.0.0.1:6379> EXISTS key122
(integer) 0  #不存在
```

**查看key的过期时间**

```bash
ttl  #查看key的剩余生存时间
	-1 #负一为永不过期，默认创建的key是永不过期，重新对key赋值，也会从有剩余生命周期变成永不过期
	-2 #为没有此key
	num #key的剩余有效期
127.0.0.1:6379> TTL key1
(integer) -1
```

**设置key的过期时间**

```bash
127.0.0.1:6379> EXPIRE key1 86400
(integer) 1
127.0.0.1:6379> TTL key1
(integer) 86373
```

**取消key的过期时间**

```bash
127.0.0.1:6379> PERSIST key1
(integer) 1
127.0.0.1:6379> TTL key1
(integer) -1
```

### 2.4.2 列表(list)

列表是一个双向可读写的管道，其头部是左侧尾部是右侧，一个列表最多可以包含2^32-1个元素即4294967295个 元素。

**生成列表并插入数据**

```bash
127.0.0.1:6379> LPUSH list1 jack tom jhon #根据顺序逐个写入list1，最后的jhon会在列表的最左侧。
(integer) 3
127.0.0.1:6379> TYPE list1
list
```

**向列表追加数据**

```bash
127.0.0.1:6379> LPUSH list1 tom
(integer) 4
127.0.0.1:6379> LPUSH list1 zhangzhuo
(integer) 5
```

**获取列表长度**

```bash
127.0.0.1:6379> LLEN list1
(integer) 5
```

**获取列表指定位置数据**

```bash
127.0.0.1:6379> LRANGE list1 0 2
1) "zhangzhuo"
2) "tom"
3) "jhon"
```

**移除列表数据**

```bash
127.0.0.1:6379> RPOP list1    #最后一个
"jack" 
127.0.0.1:6379> LPOP list1    #第一个
"zhangzhuo"
```

### 2.4.3 集合(set)

Set 是 String 类型的无序集合，集合中的成员是唯一的，这就意味着集合中不能出现重复的数据，可以在两个不同 的集合中对数据进行对比并取值。

**生成集合key**

```bash
127.0.0.1:6379> SADD set1 v1
(integer) 1
127.0.0.1:6379> SADD set1 v2 v4
(integer) 2
127.0.0.1:6379> TYPE set1
set
```

**追加数值**

```bash
#追加的时候不能追加已经存在的数值
127.0.0.1:6379> SADD set1 v3 v5
(integer) 2
127.0.0.1:6379> SADD set1 v1  #没有追加成功
(integer) 0
```

**查看集合的所有数据**

```bash
127.0.0.1:6379> SMEMBERS set1
1) "v3"
2) "v2"
3) "v4"
4) "v5"
5) "v1"
```

**获取集合的差集**

差集：已属于A而不属于B的元素称为A与B的差（集）

```bash
127.0.0.1:6379> SADD set2 v1 v4 v5
(integer) 3
127.0.0.1:6379> SDIFF set1 set2
1) "v3"
2) "v2"
127.0.0.1:6379> SDIFF set2 set1
(empty array)
```

**获取集合的交集**

交集：已属于A且属于B的元素称为A与B的交（集）

![image-20210508103143030](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210508103143030.png)

```bash
127.0.0.1:6379> SINTER set1 set2
1) "v4"
2) "v1"
3) "v5"
```

**获取集合的并集**

并集：已属于A或属于B的元素为称为A与B的并（集）

```bash
127.0.0.1:6379> SUNION set1 set2
1) "v4"
2) "v5"
3) "v1"
4) "v3"
5) "v2"
```

### 2.4.4 sorted set(有序集合)

Redis 有序集合和集合一样也是string类型元素的集合,且不允许重复的成员，不同的是每个元素都会关联一个 double(双精度浮点型)类型的分数，redis正是通过该分数来为集合中的成员进行从小到大的排序，有序集合的成员 是唯一的,但分数(score)却可以重复，集合是通过哈希表实现的，所以添加，删除，查找的复杂度都是O(1)， 集合 中最大的成员数为 2^32 - 1 (4294967295, 每个集合可存储40多亿个成员)。

**生成有序集合**

```bash
127.0.0.1:6379> ZADD zset1 1 v1
(integer) 1
127.0.0.1:6379> ZADD zset1 2 v2
(integer) 1
127.0.0.1:6379> ZADD zset1 3 v3
(integer) 1

#一次生成多个数据
127.0.0.1:6379> ZADD zset 1 v1 2 v2 3 v3 4 v4 5 v5
(integer) 5
```

**集合排行案例**

```bash
127.0.0.1:6379> ZADD paihangbang 90 nezha 199 zhanlang 60 zhuluoji 30 gangtiexia
(integer) 4
127.0.0.1:6379> ZRANGE paihangbang 0 -1  #显示集合内所有的key
1) "gangtiexia"
2) "zhuluoji"
3) "nezha"
4) "zhanlang"
127.0.0.1:6379> ZREVRANGE paihangbang 0 -1 withscores
1) "zhanlang"
2) "199"
3) "nezha"
4) "90"
5) "zhuluoji"
6) "60"
7) "gangtiexia"
8) "30"
```

**获取集合的长度数**

```bash
127.0.0.1:6379> ZCARD zset1
(integer) 3
127.0.0.1:6379> ZCARD paihangbang
(integer) 4
```

**基于索引返回数值**

```bash
127.0.0.1:6379> ZRANGE zset 1 3
1) "v2"
2) "v3"
3) "v4"
127.0.0.1:6379> ZRANGE zset 0 3
1) "v1"
2) "v2"
3) "v3"
4) "v4"
127.0.0.1:6379> ZRANGE zset 3 3
1) "v4"
```

**返回某个数值的索引**

```bash
127.0.0.1:6379> zrank zset1 v2
(integer) 1
127.0.0.1:6379> zrank zset1 v3
(integer) 2
```

### 2.4.5 哈希(hash)

hash 是一个string类型的field和value的映射表，hash特别适合用于存储对象,Redis 中每个 hash 可以存储 2^32 - 1 键值对（40多亿）。

**生成hash key**

```bash
127.0.0.1:6379> HSET hash1 name tom age 18
(integer) 2
127.0.0.1:6379> TYPE hash1
hash
```

**获取hash key字段值**

```bash
127.0.0.1:6379> HGET hash1 name
"tom"
127.0.0.1:6379> HGET hash1 age
"18"
```

**删除一个hash key的字段**

```bash
127.0.0.1:6379> HDEL hash1 age
(integer) 1
```

**获取所有hash表中的key**

```bash
127.0.0.1:6379> HMSET hash1 name tom age 19
OK
127.0.0.1:6379> HKEYS hash1
1) "name"
2) "age"
```

**获取指定hash的所有key及value**

```bash
127.0.0.1:6379> HGETALL hash1
1) "name"
2) "tom"
3) "age"
4) "19"
```

## 2.5 消息队列

消息队列主要分为两种，分别是生产者消费者模式和发布者订阅者模式，这两种模式Redis都支持。

### 2.5.1 生产者消费者模式

在生产者消费者(Producer/Consumer)模式下，上层应用接收到的外部请求后开始处理其当前步骤的操作，在执行完成后将已经完成的操作发送至指定的频道(channel)当中，并由其下层的应用监听该频道并继续下一步的操作， 如果其处理完成后没有下一步的操作就直接返回数据给外部请求，如果还有下一步的操作就再将任务发布到另外一 个频道，由另外一个消费者继续监听和处理。

#### 2.5.1.1 模式介绍

生产者消费者模式下，多个消费者同时监听一个队里，但是一个消息只能被最先抢到消息的消费者消费，即消息任务是一次性读取和处理，此模式在分布式业务架构中非常常用，比较常用的软件还有RabbitMQ、Kafka、 RocketMQ、ActiveMQ等。

![image-20210508104602354](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210508104602354.png)

#### 2.5.1.2 队列介绍

队列当中的 消息由不同的生产者写入也会有不同的消费者取出进行消费处理，但是一个消息一定是只能被取出一次也就是被消费一次。

![image-20210508104639852](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210508104639852.png)

#### 2.5.1.3 生产者发布消息

```bash
#从管道的左侧写入
127.0.0.1:6379> LPUSH channel1 msg1 
(integer) 1
127.0.0.1:6379> LPUSH channel1 msg2
(integer) 2
127.0.0.1:6379> LPUSH channel1 msg3
(integer) 3
127.0.0.1:6379> LPUSH channel1 msg4
(integer) 4
127.0.0.1:6379> LPUSH channel1 msg5
(integer) 5
#查看队列所有消息
127.0.0.1:6379> LRANGE channel1 0 -1
1) "msg5"
2) "msg4"
3) "msg3"
4) "msg2"
5) "msg1"
#消费者消费消息,从管道的右侧消费
127.0.0.1:6379> RPOP channel1
"msg1"
127.0.0.1:6379> RPOP channel1
"msg2"
127.0.0.1:6379> RPOP channel1
"msg3"
127.0.0.1:6379> RPOP channel1
"msg4"
127.0.0.1:6379> RPOP channel1
"msg5"
127.0.0.1:6379> RPOP channel1
(nil)
#再次验证队列消息
127.0.0.1:6379> LRANGE channel1 0 -1
(empty array)
```

### 2.5.2 发布者订阅模式

#### 2.5.2.1 模式简介

在发布者订阅者模式下，发布者将消息发布到指定的channel里面，凡是监听该channel的消费者都会收到同样的 一份消息，这种模式类似于是收音机的广播模式，即凡是收听某个频道的听众都会收到主持人发布的相同的消息内容。

```bash
此模式常用语群聊天、群通知、群公告等场景。
Subscriber：订阅者
Publisher：发布者
Channel：频道
```

![image-20210508105233881](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210508105233881.png)

```bash
#订阅者监听频道
127.0.0.1:6379> SUBSCRIBE channel1   #订阅者订阅指定的频道
Reading messages... (press Ctrl-C to quit)
1) "subscribe"
2) "channel1"
3) (integer) 1
#发布者发布消息
127.0.0.1:6379> PUBLISH channel1 test1
(integer) 1
127.0.0.1:6379> PUBLISH channel1 test2
(integer) 1
#各订阅者验证消息
127.0.0.1:6379> SUBSCRIBE channel1
Reading messages... (press Ctrl-C to quit)
1) "subscribe"
2) "channel1"
3) (integer) 1
1) "message"
2) "channel1"
3) "test1"
1) "message"
2) "channel1"
3) "test2"
#订阅多个频道
127.0.0.1:6379> SUBSCRIBE channel1 channel2
#订阅所有频道
127.0.0.1:6379> SUBSCRIBE *
#订阅匹配的频道
127.0.0.1:6379> SUBSCRIBE chann*
```

## 2.6 Redis 常用命令

### 2.6.1 CONFIG

config 命令用于查看当前redis配置、以及不重启更改redis配置等

```bash
#更改最大内存
127.0.0.1:6379> CONFIG set maxmemory 1073741824
OK
127.0.0.1:6379> CONFIG GET maxmemory 
1) "maxmemory"
2) "1073741824"
#设置连接密码
127.0.0.1:6379> CONFIG set requirepass 123456
OK
127.0.0.1:6379> CONFIG GET requirepass
1) "requirepass"
2) "123456"
#获取当前配置
127.0.0.1:6379> CONFIG GET *
  1) "rdbchecksum"
  2) "yes"
  3) "daemonize"
  4) "no"
....
```

### 2.6.2 info

显示当前节点redis运行状态信息

```bash
127.0.0.1:6379> info
# Server
redis_version:6.2.2
redis_git_sha1:00000000
redis_git_dirty:0
redis_build_id:dfea32f64c4b1f22
redis_mode:standalone
os:Linux 4.15.0-76-generic x86_64
arch_bits:64
....
```

### 2.6.3 SELECT

切换数据库，等于MySQL的use DBNAME指令。

```bash
127.0.0.1:6379> SELECT 1
OK
127.0.0.1:6379[1]>
```

### 2.6.4 keys

```bash
127.0.0.1:6379> KEYS *
 1) "hash1"
 2) "key1"
 3) "list1"
 4) "set2"
 5) "paihangbang"
 6) "key2"
 7) "zset"
 8) "set1"
 9) "num"
10) "zset1"
```

### 2.6.5 BGSAVE

```bash
127.0.0.1:6379> BGSAVE
Background saving started
127.0.0.1:6379>
```

### 2.6.6 DBSIZE

返回当前库下的所有key 数量

```bash
127.0.0.1:6379> DBSIZE
(integer) 10
```

### 2.6.7 FLUSHDB

强制清空当前库中的所有key

```bash
127.0.0.1:6379> FLUSHDB
```

### 2.6.8 FLUSHALL

强制清空当前redis服务器所有数据库中的所有key，即删除所有数据

```bash
127.0.0.1:6379> FLUSHALL
```

# 三、高可用与集群

虽然Redis可以实现单机的数据持久化，但无论是RDB也好或者AOF也好，都解决不了单点宕机问题，即一旦单台 redis服务器本身出现系统故障、硬件故障等问题后，就会直接造成数据的丢失，因此需要使用另外的技术来解决单点问题。

## 3.1 配置reids 主从

主备模式，可以实现Redis数据的跨主机备份。

程序端连接到高可用负载的VIP，然后连接到负载服务器设置的Redis后端real server，此模式不需要在程序里面配置Redis服务器的真实IP地址，当后期Redis服务器IP地址发生变更只需要更改redis 相应的后端real server即可， 可避免更改程序中的IP地址设置。

### 3.1.1 Slave主要配置

Redis Slave 也要开启持久化并设置和master同样的连接密码，因为后期slave会有提升为master的可能,Slave 端切换master同步后会丢失之前的所有数据。

一旦某个Slave成为一个master的slave，Redis Slave服务会清空当前redis服务器上的所有数据并将master的数据 导入到自己的内存，但是断开同步关系后不会删除当前已经同步过的数据。

#### 3.1.1.1 命令行配置

当前状态为master，需要转换为slave角色并指向master服务器的IP+PORT+Password

**重启就无效了**

```bash
[13:34:39 root@redis2 ~]#redis-cli
127.0.0.1:6379> AUTH 123456   #认证
OK
127.0.0.1:6379> REPLICAOF 192.168.10.181 6379  #配置同步
OK
127.0.0.1:6379> CONFIG SET masterauth 123456   #配置master验证信息
OK
```

**查看同步日志**

```bash
[13:39:04 root@redis2 ~]#tail /usr/local/src/redis/logs/redis_6379.log  -n 30
23253:S 08 May 2021 13:35:43.556 * Reconnecting to MASTER 192.168.10.181:6379 after failure
23253:S 08 May 2021 13:35:43.556 * MASTER <-> REPLICA sync started
23253:S 08 May 2021 13:35:43.557 * Non blocking connect for SYNC fired the event.
23253:S 08 May 2021 13:35:43.557 * Master replied to PING, replication can continue...
23253:S 08 May 2021 13:35:43.559 * Partial resynchronization not possible (no cached master)
23253:S 08 May 2021 13:35:43.560 * Full resync from master: c5f326d1420df8065569291956822160a94dfabe:0
23253:S 08 May 2021 13:35:43.601 * MASTER <-> REPLICA sync: receiving 496 bytes from master to disk  #同步过程
23253:S 08 May 2021 13:35:43.601 * MASTER <-> REPLICA sync: Flushing old data
23253:S 08 May 2021 13:35:43.601 * MASTER <-> REPLICA sync: Loading DB in memory
23253:S 08 May 2021 13:35:43.603 * Loading RDB produced by version 6.2.2
23253:S 08 May 2021 13:35:43.603 * RDB age 0 seconds
23253:S 08 May 2021 13:35:43.603 * RDB memory usage when created 1.84 Mb
23253:S 08 May 2021 13:35:43.603 * MASTER <-> REPLICA sync: Finished with success
#如果要查看更加详细的信息，需要在配置文件中把日志级别改为debug，生成环境不要使用会产生大量日志
loglevel notice
```

**当前slave状态**

```bash
127.0.0.1:6379> info replication
# Replication
role:slave             #当前redis角色
master_host:192.168.10.181
master_port:6379
master_link_status:up    #master状态  
master_last_io_seconds_ago:3
master_sync_in_progress:0
slave_repl_offset:658
slave_priority:100
slave_read_only:1
replica_announced:1
connected_slaves:0
master_failover_state:no-failover
master_replid:c5f326d1420df8065569291956822160a94dfabe
master_replid2:0000000000000000000000000000000000000000
master_repl_offset:658
second_repl_offset:-1
repl_backlog_active:1
repl_backlog_size:1048576
repl_backlog_first_byte_offset:1
repl_backlog_histlen:658
```

**验证slave数据**

```bash
127.0.0.1:6379> KEYS *
 1) "num"
 2) "hash1"
 3) "key2"
 4) "set2"
 5) "zset1"
 6) "paihangbang"
 7) "key1"
 8) "list1"
 9) "set1"
10) "zset"
```

**slave 状态只读无法写入数据**

```bash
127.0.0.1:6379> set zhang 123456
(error) READONLY You can't write against a read only replica.
```

**Master日志**

```bash
[13:46:31 root@redis redis]#tail logs/redis_6379.log
7978:M 08 May 2021 11:02:38.755 * Background saving terminated with success
7978:M 08 May 2021 13:35:43.559 * Replica 192.168.10.182:6379 asks for synchronization
7978:M 08 May 2021 13:35:43.559 * Full resync requested by replica 192.168.10.182:6379
7978:M 08 May 2021 13:35:43.559 * Replication backlog created, my new replication IDs are 'c5f326d1420df8065569291956822160a94dfabe' and '0000000000000000000000000000000000000000'
7978:M 08 May 2021 13:35:43.559 * Starting BGSAVE for SYNC with target: disk
7978:M 08 May 2021 13:35:43.560 * Background saving started by pid 8889
8889:C 08 May 2021 13:35:43.563 * DB saved on disk
8889:C 08 May 2021 13:35:43.564 * RDB: 0 MB of memory used by copy-on-write
7978:M 08 May 2021 13:35:43.601 * Background saving terminated with success
7978:M 08 May 2021 13:35:43.601 * Synchronization with replica 192.168.10.182:6379 succeeded
```

#### 3.1.1.2 配置文件配置

```bash
[14:07:03 root@redis2 redis]#vim etc/redis.conf 
replicaof 192.168.10.181 6379
masterauth 123456    #master如果密码需要设置
#重启服务
[14:07:03 root@redis2 redis]#systemctl restart redis.service 
#验证
127.0.0.1:6379> info Replication
# Replication
role:slave
master_host:192.168.10.181
master_port:6379
master_link_status:up
master_last_io_seconds_ago:8
master_sync_in_progress:0
slave_repl_offset:2100
slave_priority:100
slave_read_only:1
replica_announced:1
connected_slaves:0
master_failover_state:no-failover
master_replid:c5f326d1420df8065569291956822160a94dfabe
master_replid2:0000000000000000000000000000000000000000
master_repl_offset:2100
second_repl_offset:-1
repl_backlog_active:1
repl_backlog_size:1048576
repl_backlog_first_byte_offset:2003
repl_backlog_histlen:98
127.0.0.1:6379> KEYS *
 1) "set2"
 2) "zset"
 3) "num"
 4) "list1"
 5) "key1"
 6) "set1"
 7) "key2"
 8) "paihangbang"
 9) "zset1"
10) "hash1"
```

### 3.1.2 主从复制过程

Redis支持主从复制分为全量同步和增量同步，**首次同步是全量同步**，主从同步可以让从服务器从主服务器备份数据，而且从服务器还可与有从服务器，即另外一台redis服务器可以从一台从服务器进行数据同步，redis 的主从同步是非阻塞的，master收到从服务器的sync(2.8版本之前是PSYNC)命令会fork一个子进程在后台执行bgsave命 令，**并将新写入的数据写入到一个缓冲区里面**，bgsave执行完成之后并生成的将RDB文件发送给客户端，客户端将 收到后的RDB文件载入自己的内存，然后redis master再将缓冲区的内容在全部发送给redis slave，之后的同步 slave服务器会发送一个offset的位置(等同于MySQL的binlog的位置)给主服务器，主服务器检查后位置没有错误将 此位置之后的数据包括写在缓冲区的积压数据发送给redis从服务器，从服务器将主服务器发送的导入数据写入内 存，这样一次完整的数据同步，再之后再同步的时候从服务器只要发送当前的offset位 置给主服务器，然后主服务 器根据相应的位置将之后的数据发送给从服务器保存到其内存即可。

Redis全量复制一般发生在Slave首次初始化阶段，这时Slave需要将Master上的所有数据都复制一份。具体主从同步骤如下：

```bash
1. 从服务器连接主服务器，发送SYNC命令；
2. 主服务器接收到SYNC命名后，开始执行BGSAVE命令生成RDB快照文件并使用缓冲区记录此后执行的所有写命令；
3. 主服务器BGSAVE执行完后，向所有从服务器发送快照文件，并在发送期间继续记录被执行的写命令；
4. 从服务器收到快照文件后丢弃所有旧数据，载入收到的快照；
5. 主服务器快照发送完毕后开始向从服务器发送缓冲区中的写命令；
6. 从服务器完成对快照的载入，开始接收命令请求，并执行来自主服务器缓冲区的写命令；
7. 后期同步会先发送自己slave_repl_offset位置，只同步新增加的数据，不再全量同步。
```

![image-20210508135559430](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210508135559430.png)

### 3.1.3 主从同步优化

Redis在2.8版本之前没有提供增量部分复制的功能，当网络闪断或者slave Redis重启之后会导致主从之间的全量同步，即从2.8版本开始增加了部分复制的功能。

```bash
repl-diskless-sync no # 是否使用无盘同步RDB文件，默认为no，no为不使用无盘，需要将RDB文件保存到磁盘后再发送给slave，yes为支持无盘，支持无盘就是RDB文件不需要保存至本地磁盘，而且直接通过socket文件发送给slave。 
repl-diskless-sync-delay 5 #Master准备好RDB文件后等等待传输时间
repl-ping-slave-period 10 #slave端向server端发送ping的时间区间设置，默认为10秒 
repl-timeout 60 #设置超时时间
repl-disable-tcp-nodelay no #是否启用TCP_NODELAY，如设置成yes，则redis会合并小的TCP包从而节省带宽，但会增加同步延迟（40ms），造成master与slave数据不一致，假如设置成no，则redis master会立即发送同步数据，没有延迟，前者关注性能，后者关注redis服务中的数据一致性。
repl-backlog-size 1mb #master的写入数据缓冲区，用于记录自上一次同步后到下一次同步过程中间的写入命令，计算公式：repl-backlog-size = 允许从节点最大中断时长 * 主实例offset每秒写入量，比如master每秒最大写入64mb，最大允许60秒，那么就要设置为64mb*60秒=3840MB(3.8G)
repl-backlog-ttl 3600 #如果一段时间后没有slave连接到master，则backlog size的内存将会被释放。如果值为0则表示永远不释放这部份内存。 
slave-priority 100 #slave端的优先级设置，值是一个整数，数字越小表示优先级越高。当master故障时将会按照优先级来选择slave端进行恢复，如果值设置为0，则表示该slave永远不会被选择。
min-slaves-to-write 1 #设置一个master端的可用slave少于多少个 
min-slaves-max-lag 20 #设置所有slave延迟时间都大于多少秒时，master不接收写操作(拒绝写入)。
```

### 3.1.4 slave切换master

Master的切换会导致master_replid发生变化，slave之前的master_replid就和当前master不一致从而会引发所有 slave的全量同步。

**当前状态**

```bash
127.0.0.1:6379> info Replication
# Replication
role:slave
master_host:192.168.10.181
master_port:6379
```

**停止slave同步并查看当前状态**

```bash
127.0.0.1:6379> SLAVEOF no one
OK
127.0.0.1:6379> info Replication
# Replication
role:master
connected_slaves:0
master_failover_state:no-failover
```

**测试能否写入数据**

```bash
127.0.0.1:6379> set key1 zhangzhuo
OK
```

### 3.1.5 常见问题汇总

#### 3.1.5.1 master密码不对

即配置的master密码不对，导致验证不通过而无法建立主从同步关系。

```bash
91 23253:S 08 May 2021 13:35:09.378 # Unexpected reply to PSYNC from master: -NOAUTH Authentication required.
 92 23253:S 08 May 2021 13:35:09.378 * Retrying with SYNC...
 93 23253:S 08 May 2021 13:35:09.378 # MASTER aborted replication with an error: NOAUTH Authentication required.
94 23253:S 08 May 2021 13:35:09.378 * Reconnecting to MASTER 192.168.10.181:6379 after failure                                                                          
95 23253:S 08 May 2021 13:35:09.379 * MASTER <-> REPLICA sync started
96 23253:S 08 May 2021 13:35:09.379 * Non blocking connect for SYNC fired the event.
97 23253:S 08 May 2021 13:35:09.379 * Master replied to PING, replication can continue...
  101 23253:S 08 May 2021 13:35:09.381 # Unexpected reply to PSYNC from master: -NOAUTH Authentication required.
  102 23253:S 08 May 2021 13:35:09.381 * Retrying with SYNC...
  103 23253:S 08 May 2021 13:35:09.381 # MASTER aborted replication with an error: NOAUTH Authentication required.
```

#### 3.1.5.2 Redis版本不一致

不同的redis 版本之间存在兼容性问题，因此各master和slave之间必须保持版本一致。

#### 3.1.5.3 无法远程连接

在开启了安全模式情况下，没有设置bind地址或者密码。

## 3.2 redis 集群

上一个步骤的主从架构无法实现master和slave角色的自动切换，即当master出现redis服务异常、主机断电、磁盘 损坏等问题导致master无法使用，而redis高可用无法实现自故障转移(将slave提升为master)，需要手动改环境配置才能切换到slave redis服务器，另外也无法横向扩展Redis服务的并行写入性能，当单台Redis服务器性能无法满 足业务写入需求的时候就必须需要一种方式解决以上的两个核心问题，即：

1. master和slave角色的无缝切换，让业务无感知从而不影响业务使用
2. 可以横向动态扩展Redis服务器，从而实现多台服务器并行写入以实现更高并发的目的。

```bash
Redis 集群实现方式：客户端分片 代理分片 Redis Cluster
```

### 3.2.1 Sentinel(哨兵)

Sentinel 进程是用于监控redis集群中Master主服务器工作的状态，在Master主服务器发生故障的时候，可以实现 Master和Slave服务器的切换，保证系统的高可用，其已经被集成在redis2.6+的版本中，Redis的哨兵模式到了2.8 版本之后就稳定了下来。一般在生产环境也建议使用Redis的2.8版本的以后版本。哨兵(Sentinel) 是一个分布式系统，可以在一个架构中运行多个哨兵(sentinel) 进程，这些进程使用流言协议(gossip protocols)来接收关于Master 主服务器是否下线的信息，并使用投票协议(Agreement Protocols)来决定是否执行自动故障迁移,以及选择哪个 Slave作为新的Master。每个哨兵(Sentinel)进程会向其它哨兵(Sentinel)、Master、Slave定时发送消息，以确认对 方是否”活”着，如果发现对方在指定配置时间(可配置的)内未得到回应，则暂时认为对方已掉线，也就是所谓的”主 观认为宕机” ，**主观是每个成员都具有的独自的而且可能相同也可能不同的意识**，英文名称：Subjective Down， 简称SDOWN。有主观宕机，肯定就有客观宕机。当“哨兵群”中的多数Sentinel进程在对Master主服务器做出 SDOWN 的判断，并且通过 SENTINEL is-master-down-by-addr 命令互相交流之后，得出的Master Server下线判 断，这种方式就是“客观宕机”，**客观是不依赖于某种意识而已经实际存在的一切事物**，英文名称是：Objectively Down， 简称 ODOWN。通过一定的vote算法，从剩下的slave从服务器节点中，选一台提升为Master服务器节 点，然后自动修改相关配置，并开启故障转移（failover）。

Sentinel 机制可以解决master和slave角色的切换问题。

#### 3.2.1.1 手动配置master

需要手动先指定某一台Redis服务器为master，然后将其他slave服务器使用命令配置为master服务器的slave,哨兵的前提是已经手动实现了一个redis master-slave的运行环境。

实现一个一主两从基于哨兵的高可用redis架构。

![未命名文件](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/未命名文件.jpg)

**服务器配置slave**

```bash
[14:28:29 root@ubuntu18-04 redis]#vim etc/redis.conf
replicaof 192.168.10.181 6379
masterauth 123456
#俩太都配置
[14:29:47 root@ubuntu18-04 redis]#systemctl restart redis.service 
#验证
127.0.0.1:6379> info replication
# Replication
role:slave
master_host:192.168.10.181
master_port:6379
master_link_status:up
master_last_io_seconds_ago:6
master_sync_in_progress:0
slave_repl_offset:2380
```

**当前master状态**

```bash
127.0.0.1:6379> info replication
# Replication
role:master
connected_slaves:2
slave0:ip=192.168.10.183,port=6379,state=online,offset=2436,lag=1
slave1:ip=192.168.10.182,port=6379,state=online,offset=2436,lag=0
master_failover_state:no-failover
master_replid:c5f326d1420df8065569291956822160a94dfabe
master_replid2:0000000000000000000000000000000000000000
master_repl_offset:2436
second_repl_offset:-1
repl_backlog_active:1
repl_backlog_size:1048576
repl_backlog_first_byte_offset:1
repl_backlog_histlen:2436
```

#### 3.2.1.2 编辑配置文件sentinel.conf

**server1 配置**

哨兵可以不和Redis服务器部署在一起,也可以部署在一起

```bash
[15:40:02 root@redis3 redis]#grep "^[a-Z]" sentinel/sentinel.conf
bind 0.0.0.0
port 26379
daemonize yes
pidfile "redis-sentinel.pid"
logfile "sentinel_26379.log"
dir "/usr/local/src/redis/sentinel"
sentinel monitor mymaster 192.168.10.181 6379 2 ##法定人数限制(quorum)，即有几个slave认为masterdown了就进行故障转移
sentinel auth-pass mymaster 123456
sentinel down-after-milliseconds mymaster 30000  #(SDOWN)主观下线的时间
acllog-max-len 128
sentinel parallel-syncs mymaster 1   #发生故障转移时候同时向新master同步数据的slave数量，数字越小总同步时间越长
sentinel failover-timeout mymaster 180000  #所有slaves指向新的master所需的超时时间
sentinel deny-scripts-reconfig yes #禁止修改脚本
SENTINEL resolve-hostnames no
SENTINEL announce-hostnames no
```

**server2 配置**

```
[15:43:27 root@ubuntu18-04 ~]#grep "^[a-Z]" /usr/local/src/redis/sentinel/sentinel.conf
bind 0.0.0.0
port 26379
daemonize yes
pidfile "redis-sentinel.pid"
logfile "sentinel_26379.log"
dir "/usr/local/src/redis/sentinel"
sentinel monitor mymaster 192.168.10.181 6379 2
sentinel auth-pass mymaster 123456
sentinel down-after-milliseconds mymaster 30000
acllog-max-len 128
sentinel parallel-syncs mymaster 1
sentinel failover-timeout mymaster 180000
sentinel deny-scripts-reconfig yes
SENTINEL resolve-hostnames no
SENTINEL announce-hostnames no
```

**server3配置**

```bash
[15:43:27 root@ubuntu18-04 ~]#grep "^[a-Z]" /usr/local/src/redis/sentinel/sentinel.conf
bind 0.0.0.0
port 26379
daemonize yes
pidfile "redis-sentinel.pid"
logfile "sentinel_26379.log"
dir "/usr/local/src/redis/sentinel"
sentinel monitor mymaster 192.168.10.181 6379 2
sentinel auth-pass mymaster 123456
sentinel down-after-milliseconds mymaster 30000
acllog-max-len 128
sentinel parallel-syncs mymaster 1
sentinel failover-timeout mymaster 180000
sentinel deny-scripts-reconfig yes
SENTINEL resolve-hostnames no
SENTINEL announce-hostnames no
```

#### 3.2.1.3 启动哨兵

三台哨兵都要启动

```bash
#帮助
[15:45:24 root@ubuntu18-04 ~]#redis-sentinel --help
Sentinel mode:
       ./redis-server /etc/sentinel.conf --sentinel
#启动
[15:46:12 root@ubuntu18-04 ~]#redis-server /usr/local/src/redis/sentinel/sentinel.conf --sentinel
[15:47:13 root@ubuntu18-04 etc]#redis-server /usr/local/src/redis/sentinel/sentinel.conf --sentinel
[15:47:17 root@redis3 redis]#redis-server /usr/local/src/redis/sentinel/sentinel.conf --sentinel
```

#### 3.2.1.4 验证哨兵端口

```bash
[15:48:42 root@redis1 ~]#ss -ntl | grep 26379
LISTEN   0         511                 0.0.0.0:26379            0.0.0.0:* 
[15:48:29 root@redis2 ~]#ss -ntl | grep 26379
LISTEN   0         511                 0.0.0.0:26379            0.0.0.0:* 
[15:49:17 root@redis3 ~]#ss -ntl | grep 26379
LISTEN   0         511                 0.0.0.0:26379            0.0.0.0:*
```

#### 3.2.1.5 哨兵日志

```bash
[15:50:16 root@redis3 ~]#tail /usr/local/src/redis/sentinel/sentinel_26379.log -n 1000
17740:X 08 May 2021 15:47:18.391 # oO0OoO0OoO0Oo Redis is starting oO0OoO0OoO0Oo
17740:X 08 May 2021 15:47:18.391 # Redis version=6.2.2, bits=64, commit=00000000, modified=0, pid=17740, just started
17740:X 08 May 2021 15:47:18.391 # Configuration loaded
17740:X 08 May 2021 15:47:18.392 * monotonic clock: POSIX clock_gettime
17740:X 08 May 2021 15:47:18.393 * Running mode=sentinel, port=26379.
17740:X 08 May 2021 15:47:18.397 # Sentinel ID is b0a2c17511ca2e8d9148a6606208543b56f0a971
17740:X 08 May 2021 15:47:18.397 # +monitor master mymaster 192.168.10.181 6379 quorum 2
17740:X 08 May 2021 15:47:18.400 * +slave slave 192.168.10.182:6379 192.168.10.182 6379 @ mymaster 192.168.10.181 6379
17740:X 08 May 2021 15:47:18.412 * +slave slave 192.168.10.183:6379 192.168.10.183 6379 @ mymaster 192.168.10.181 6379
17740:X 08 May 2021 15:47:18.459 * +sentinel sentinel debe5e6643a35cef4db2b149dc814ed0ca235384 192.168.10.181 26379 @ mymaster 192.168.10.181 6379
17740:X 08 May 2021 15:47:19.028 * +sentinel sentinel 77f71a168538915afd572dee5de07ac2558d3d56 192.168.10.182 26379 @ mymaster 192.168.10.181 6379
```

#### 3.2.1.6 当前redis master状态

```bash
127.0.0.1:6379> info replication
# Replication
role:master
connected_slaves:2
slave0:ip=192.168.10.182,port=6379,state=online,offset=52781,lag=0
slave1:ip=192.168.10.183,port=6379,state=online,offset=52781,lag=0
master_failover_state:no-failover
master_replid:fdf6757a22af9b96cabed182df1fc5a2e6c73578
master_replid2:0000000000000000000000000000000000000000
master_repl_offset:52924
second_repl_offset:-1
repl_backlog_active:1
repl_backlog_size:1048576
repl_backlog_first_byte_offset:1
repl_backlog_histlen:52924
```

#### 3.2.1.7 当前sentinel状态

在sentinel状态中尤其是最后一行，涉及到masterIP是多少，有几个slave，有几个sentinels，必须是符合全部服 务器数量的。

```bash
[15:51:34 root@redis1 ~]#redis-cli -h 192.168.10.181 -p 26379
192.168.10.181:26379> info sentinel
# Sentinel
sentinel_masters:1
sentinel_tilt:0
sentinel_running_scripts:0
sentinel_scripts_queue_length:0
sentinel_simulate_failure_flags:0
master0:name=mymaster,status=ok,address=192.168.10.181:6379,slaves=2,sentinels=3
```

#### 3.2.1.8 停止Redis Master测试故障转移

```bash
[15:54:23 root@redis1 ~]#systemctl stop redis.service
```

**查看Redis集群master信息**

```bash
127.0.0.1:6379> info replication
# Replication
role:master
connected_slaves:1
slave0:ip=192.168.10.182,port=6379,state=online,offset=123779,lag=1
master_failover_state:no-failover
master_replid:3f1799839b2b3ca431ba043cd5ec94fb10dfd785
master_replid2:fdf6757a22af9b96cabed182df1fc5a2e6c73578
master_repl_offset:123779
second_repl_offset:96977
repl_backlog_active:1
repl_backlog_size:1048576
repl_backlog_first_byte_offset:15
repl_backlog_histlen:123765
```

**查看哨兵信息**

```bash
[15:54:34 root@redis1 ~]#redis-cli -h 192.168.10.181 -p 26379
192.168.10.181:26379> info sentinel
# Sentinel
sentinel_masters:1
sentinel_tilt:0
sentinel_running_scripts:0
sentinel_scripts_queue_length:0
sentinel_simulate_failure_flags:0
master0:name=mymaster,status=ok,address=192.168.10.183:6379,slaves=2,sentinels=3
```

**故障转移时sentinel的信息**

```bash
[15:50:18 root@redis3 ~]#tail -f /usr/local/src/redis/sentinel/sentinel_26379.log 
17740:X 08 May 2021 15:47:18.391 # Redis version=6.2.2, bits=64, commit=00000000, modified=0, pid=17740, just started
17740:X 08 May 2021 15:47:18.391 # Configuration loaded
17740:X 08 May 2021 15:47:18.392 * monotonic clock: POSIX clock_gettime
17740:X 08 May 2021 15:47:18.393 * Running mode=sentinel, port=26379.
17740:X 08 May 2021 15:47:18.397 # Sentinel ID is b0a2c17511ca2e8d9148a6606208543b56f0a971
17740:X 08 May 2021 15:47:18.397 # +monitor master mymaster 192.168.10.181 6379 quorum 2
17740:X 08 May 2021 15:47:18.400 * +slave slave 192.168.10.182:6379 192.168.10.182 6379 @ mymaster 192.168.10.181 6379
17740:X 08 May 2021 15:47:18.412 * +slave slave 192.168.10.183:6379 192.168.10.183 6379 @ mymaster 192.168.10.181 6379
17740:X 08 May 2021 15:47:18.459 * +sentinel sentinel debe5e6643a35cef4db2b149dc814ed0ca235384 192.168.10.181 26379 @ mymaster 192.168.10.181 6379
17740:X 08 May 2021 15:47:19.028 * +sentinel sentinel 77f71a168538915afd572dee5de07ac2558d3d56 192.168.10.182 26379 @ mymaster 192.168.10.181 6379
17740:X 08 May 2021 15:55:04.571 # +sdown master mymaster 192.168.10.181 6379
17740:X 08 May 2021 15:55:04.729 # +new-epoch 1
17740:X 08 May 2021 15:55:04.744 # +vote-for-leader 77f71a168538915afd572dee5de07ac2558d3d56 1
17740:X 08 May 2021 15:55:05.055 # +config-update-from sentinel 77f71a168538915afd572dee5de07ac2558d3d56 192.168.10.182 26379 @ mymaster 192.168.10.181 6379
17740:X 08 May 2021 15:55:05.057 # +switch-master mymaster 192.168.10.181 6379 192.168.10.183 6379
17740:X 08 May 2021 15:55:05.057 * +slave slave 192.168.10.182:6379 192.168.10.182 6379 @ mymaster 192.168.10.183 6379
17740:X 08 May 2021 15:55:05.057 * +slave slave 192.168.10.181:6379 192.168.10.181 6379 @ mymaster 192.168.10.183 6379
17740:X 08 May 2021 15:55:35.059 # +sdown slave 192.168.10.181:6379 192.168.10.181 6379 @ mymaster 192.168.10.183 6379
```

#### 3.2.1.9 故障转移后的redis配置文件

故障转移后redis.conf中的replicaof行的master IP会被修改，sentinel.conf中的sentinel monitor IP会被修改。

```bash
#redis.conf文件
[15:49:15 root@redis2 ~]#grep "^replicaof" /usr/local/src/redis/etc/redis.conf 
replicaof 192.168.10.183 6379
#sentinel.conf文件
[15:59:30 root@redis2 redis]#grep "^sentinel" sentinel/sentinel.conf 
sentinel monitor mymaster 192.168.10.183 6379 2
```

#### 3.2.1.10 当前reids状态

```bash
127.0.0.1:6379> info replication
# Replication
role:slave
master_host:192.168.10.183
master_port:6379
master_link_status:up
master_last_io_seconds_ago:0
master_sync_in_progress:0
slave_repl_offset:168246
slave_priority:100
slave_read_only:1
replica_announced:1
connected_slaves:0
master_failover_state:no-failover
master_replid:3f1799839b2b3ca431ba043cd5ec94fb10dfd785
master_replid2:fdf6757a22af9b96cabed182df1fc5a2e6c73578
master_repl_offset:168246
second_repl_offset:96977
repl_backlog_active:1
repl_backlog_size:1048576
repl_backlog_first_byte_offset:1
repl_backlog_histlen:168246
```

### 3.2.2 Redis Cluster

早期Redis 分布式集群部署方案：

```bash
1) 客户端分区：由客户端程序决定key写分配和写入的redis node，但是需要客户端自己处理写入分配、高可用管理和故障转移等
2) 代理方案：基于三方软件实现redis proxy，客户端先连接之代理层，由代理层实现key的写入分配，对客户端来说是有比较简单，但是对于集群管节点增减相对比较麻烦，而且代理本身也是单点和性能瓶颈。
```

在哨兵sentinel机制中，可以解决redis高可用的问题，即当master故障后可以自动将slave提升为master从而可以保证redis服务的正常使用，但是无法解决redis单机写入的瓶颈问题，即单机的redis写入性能受限于单机的内存大小、并发数量、网卡速率等因素，因此redis官方在redis 3.0版本之后推出了无中心架构的redis cluster机制，在无中心的redis集群当中，其每个节点保存当前节点数据和整个集群状态,每个节点都和其他所有节点连接，特点如下：

```bash
1：所有Redis节点使用(PING机制)互联
2：集群中某个节点的失效，是整个集群中超过半数的节点监测都失效才算真正的失效
3：客户端不需要proxy即可直接连接redis，应用程序需要写全部的redis服务器IP。
4：redis cluster把所有的redis node映射到 0-16383个槽位(slot)上，读写需要到指定的redis node上进行操作，因此有多少个reids node相当于redis 并发扩展了多少倍。
5：Redis cluster预先分配16384个(slot)槽位，当需要在redis集群中写入一个key -value的时候，会使用CRC16(key) mod 16384之后的值，决定将key写入值哪一个槽位从而决定写入哪一个Redis节点上，从而有效解决单机瓶颈。
```

#### 3.2.2.1 Redis cluster架构

##### 3.2.2.1.1 Redis cluster基本架构

假如三个主节点分别是：A, B, C 三个节点，采用哈希槽 (hash slot)的方式来分配16384个slot 的话，它们三个节点 分别承担的slot区间是：

```bash
节点A覆盖 0－5460
节点B覆盖 5461－10922
节点C覆盖 10923－16383
```

![image-20210508160706448](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210508160706448.png)

##### 3.2.2.1.2 Redis cluster主从架构

![image-20210508160730729](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210508160730729.png)

#### 3.2.2.2 部署redis集群

环境准备：

**环境A：三台服务器，每台服务器启动6379和6380两个redis 服务**

```bash
192.168.10.181:6379/6380
192.168.10.182:6379/6380
192.168.10.183:6379/6380
```

另外预留一台服务器做集群添加节点测试

```bash
192.168.10.184:6379/6380
```

**环境B：生产环境建议直接6台服务器**

| 192.168.10.181 | 192.168.10.181 | 192.168.10.182 |
| -------------- | -------------- | -------------- |
| 192.168.10.181 | 192.168.10.183 | 192.168.10.184 |
| 预留服务器     | 192.168.10.185 | 192.168.10.186 |

##### 3.2.2.2.1 创建redis cluster集群的前提

1. 每个redis node节点采用相同的硬件配置、相同的密码、相同的redis版本。
2. 每个节点必须开启的参数 cluster-enabled yes #必须开启集群状态，开启后redis 进程会有cluster显示 cluster-config-file_nodes_6380.conf #此文件有redis cluster集群自动创建和维护，不需要任何手动操作
3. 所有redis服务器必须没有任何数据
4. 先启动为单机redis且没有任何key value

**准备环境，使用环境A**

```bash
#配置文件打开这俩个选项
[18:42:04 root@ubuntu18-04 apps]#vim redis1/etc/redis.conf 
cluster-enabled yes
cluster-config-file nodes-6379.conf
#启动redis
[18:41:37 root@ubuntu18-04 apps]#/apps/redis2/bin/redis-server /apps/redis2/etc/redis.conf
[18:41:55 root@ubuntu18-04 apps]#/apps/redis1/bin/redis-server /apps/redis1/etc/redis.conf
#测试
[18:44:15 root@ubuntu18-04 apps]#ss -ntl | grep -E "(6379|6380)"
LISTEN   0         511                 0.0.0.0:16379            0.0.0.0:*       
LISTEN   0         511                 0.0.0.0:16380            0.0.0.0:*       
LISTEN   0         511                 0.0.0.0:6379             0.0.0.0:*       
LISTEN   0         511                 0.0.0.0:6380             0.0.0.0:*
```

##### 3.2.2.2.2 创建集群

**Redis 5和6版本**

```bash
[18:45:23 root@ubuntu18-04 apps]#redis-cli -a 123456 --cluster create 192.168.10.181:6379 192.168.10.181:6380 192.168.10.182:6379 192.168.10.182:6380 192.168.10.183:6379 192.168.10.183:6380 --cluster-replicas 1
Warning: Using a password with '-a' or '-u' option on the command line interface may not be safe.
>>> Performing hash slots allocation on 6 nodes...
Master[0] -> Slots 0 - 5460
Master[1] -> Slots 5461 - 10922
Master[2] -> Slots 10923 - 16383
Adding replica 192.168.10.182:6380 to 192.168.10.181:6379
Adding replica 192.168.10.183:6380 to 192.168.10.182:6379
Adding replica 192.168.10.181:6380 to 192.168.10.183:6379
M: d208bb1f9d1d63158b981766a369c7c058bc290a 192.168.10.181:6379  #带M的为master 
   slots:[0-5460] (5461 slots) master #当前master的槽位起始和结束位
S: 9b5a7881dcda79ad4509bfb754a3ac00f1796eae 192.168.10.181:6380 #带S的slave
   replicates 42ab4a3038ad9aeef5c39ee6dcdfe1f585d051b6
M: a82a858abcd842713f380afeeba4e664eddb5a71 192.168.10.182:6379
   slots:[5461-10922] (5462 slots) master
S: be22ba42114cba45b7ecddbd1ba6a6588cc40b4f 192.168.10.182:6380
   replicates d208bb1f9d1d63158b981766a369c7c058bc290a
M: 42ab4a3038ad9aeef5c39ee6dcdfe1f585d051b6 192.168.10.183:6379
   slots:[10923-16383] (5461 slots) master
S: ad24fe755b23592c86501442798f5363657eee26 192.168.10.183:6380
   replicates a82a858abcd842713f380afeeba4e664eddb5a71
Can I set the above configuration? (type 'yes' to accept): yes #输入yes自动创建集群
>>> Nodes configuration updated
>>> Assign a different config epoch to each node
>>> Sending CLUSTER MEET messages to join the cluster
Waiting for the cluster to join
.
>>> Performing Cluster Check (using node 192.168.10.181:6379)
M: d208bb1f9d1d63158b981766a369c7c058bc290a 192.168.10.181:6379  #master的ID及端口
   slots:[0-5460] (5461 slots) master  #已经分配的槽位
   1 additional replica(s)
M: 42ab4a3038ad9aeef5c39ee6dcdfe1f585d051b6 192.168.10.183:6379
   slots:[10923-16383] (5461 slots) master
   1 additional replica(s)
S: 9b5a7881dcda79ad4509bfb754a3ac00f1796eae 192.168.10.181:6380
   slots: (0 slots) slave
   replicates 42ab4a3038ad9aeef5c39ee6dcdfe1f585d051b6
S: ad24fe755b23592c86501442798f5363657eee26 192.168.10.183:6380
   slots: (0 slots) slave
   replicates a82a858abcd842713f380afeeba4e664eddb5a71
S: be22ba42114cba45b7ecddbd1ba6a6588cc40b4f 192.168.10.182:6380
   slots: (0 slots) slave
   replicates d208bb1f9d1d63158b981766a369c7c058bc290a
M: a82a858abcd842713f380afeeba4e664eddb5a71 192.168.10.182:6379
   slots:[5461-10922] (5462 slots) master
   1 additional replica(s)
[OK] All nodes agree about slots configuration. #所有节点槽位分配完成
>>> Check for open slots...  #检查打开的槽位
>>> Check slots coverage...  #检查插槽覆盖范围
[OK] All 16384 slots covered. #所有槽位(16384个)分配完成
```

##### 3.2.2.2.3 验证Redis集群状态

由于未设置masterauth认证密码，所以主从未建立起来，但是集群已经运行，所以需要在每个slave控制台使用 config set设置masterauth密码，或者写在每个redis配置文件中，最好是在控制点设置密码之后再写入配置文件当中。

```bash
#查看当前slave状态
127.0.0.1:6380> info replication
# Replication
role:slave
master_host:192.168.10.183
master_port:6379
master_link_status:down   #不是up
master_last_io_seconds_ago:-1
master_sync_in_progress:0
slave_repl_offset:1
master_link_down_since_seconds:-1
slave_priority:100
slave_read_only:1
replica_announced:1
connected_slaves:0
master_failover_state:no-failover
master_replid:b0a0c3b4359531b44849118ef39630479d668ca6
master_replid2:0000000000000000000000000000000000000000
master_repl_offset:0
second_repl_offset:-1
repl_backlog_active:0
repl_backlog_size:1048576
repl_backlog_first_byte_offset:0
repl_backlog_histlen:0
```

##### 3.2.2.2.4 分别设置masterauth密码

```bash
#所有slave节点都设置
[18:55:55 root@ubuntu18-04 apps]#redis-cli -p 6380
127.0.0.1:6380> AUTH 123456
OK
127.0.0.1:6380> CONFIG SET masterauth 123456
OK
#检测
127.0.0.1:6380> info replication
# Replication
role:slave
master_host:192.168.10.183
master_port:6379
master_link_status:up  #已经up了
master_last_io_seconds_ago:5
master_sync_in_progress:0
slave_repl_offset:42
slave_priority:100
slave_read_only:1
replica_announced:1
connected_slaves:0
master_failover_state:no-failover
master_replid:547172bee9ac6e89b0654142bc9ae815f8f75101
master_replid2:0000000000000000000000000000000000000000
master_repl_offset:42
second_repl_offset:-1
repl_backlog_active:1
repl_backlog_size:1048576
repl_backlog_first_byte_offset:1
repl_backlog_histlen:42
#可以提前写入到配置文件中
[18:59:46 root@ubuntu18-04 apps]#vim redis1/etc/redis.conf
masterauth 123456
```

##### 3.2.2.2.5 验证master状态

```bash
#每个master都有一个slave
127.0.0.1:6379> info replication
# Replication
role:master
connected_slaves:1
slave0:ip=192.168.10.182,port=6380,state=online,offset=42,lag=0
master_failover_state:no-failover
master_replid:fae3f725af511c57130e8ff5326e0f2ef24632d9
master_replid2:0000000000000000000000000000000000000000
master_repl_offset:42
second_repl_offset:-1
repl_backlog_active:1
repl_backlog_size:1048576
repl_backlog_first_byte_offset:1
repl_backlog_histlen:42
```

##### 3.2.2.2.6 验证集群状态

```bash
127.0.0.1:6379> CLUSTER INFO
cluster_state:ok
cluster_slots_assigned:16384
cluster_slots_ok:16384
cluster_slots_pfail:0
cluster_slots_fail:0
cluster_known_nodes:6
cluster_size:3
cluster_current_epoch:6
cluster_my_epoch:1
cluster_stats_messages_ping_sent:724
cluster_stats_messages_pong_sent:758
cluster_stats_messages_sent:1482
cluster_stats_messages_ping_received:753
cluster_stats_messages_pong_received:724
cluster_stats_messages_meet_received:5
cluster_stats_messages_received:1482
```

##### 3.2.2.2.7 查看集群node对应关系

```bash
#使用命令cluster nodes
127.0.0.1:6379> CLUSTER NODES
42ab4a3038ad9aeef5c39ee6dcdfe1f585d051b6 192.168.10.183:6379@16379 master - 0 1620471838649 5 connected 10923-16383
9b5a7881dcda79ad4509bfb754a3ac00f1796eae 192.168.10.181:6380@16380 slave 42ab4a3038ad9aeef5c39ee6dcdfe1f585d051b6 0 1620471837000 5 connected
ad24fe755b23592c86501442798f5363657eee26 192.168.10.183:6380@16380 slave a82a858abcd842713f380afeeba4e664eddb5a71 0 1620471835000 3 connected
be22ba42114cba45b7ecddbd1ba6a6588cc40b4f 192.168.10.182:6380@16380 slave d208bb1f9d1d63158b981766a369c7c058bc290a 0 1620471837000 1 connected
a82a858abcd842713f380afeeba4e664eddb5a71 192.168.10.182:6379@16379 master - 0 1620471837632 3 connected 5461-10922
d208bb1f9d1d63158b981766a369c7c058bc290a 192.168.10.181:6379@16379 myself,master - 0 1620471836000 1 connected 0-5460
```

##### 3.2.2.2.8 验证集群写入key

```bash
127.0.0.1:6379> set key1 value1   #经过算法计算，当前key的槽位需要写入指定的node
(error) MOVED 9189 192.168.10.182:6379 #槽位不在当前node所以无法写入
127.0.0.1:6379> SET key1 value1  #指定的node就可以写入
OK
127.0.0.1:6379> KEYS *
1) "key1"
```

##### 3.2.2.2.9 集群状态验证与监控

**Redis 5与6**

```bash
[19:07:08 root@ubuntu18-04 apps]#redis-cli -a 123456 --cluster check 192.168.10.181:6379
Warning: Using a password with '-a' or '-u' option on the command line interface may not be safe.
192.168.10.181:6379 (d208bb1f...) -> 0 keys | 5461 slots | 1 slaves.
192.168.10.183:6379 (42ab4a30...) -> 0 keys | 5461 slots | 1 slaves.
192.168.10.182:6379 (a82a858a...) -> 1 keys | 5462 slots | 1 slaves.
[OK] 1 keys in 3 masters.
0.00 keys per slot on average.
>>> Performing Cluster Check (using node 192.168.10.181:6379)
M: d208bb1f9d1d63158b981766a369c7c058bc290a 192.168.10.181:6379
   slots:[0-5460] (5461 slots) master
   1 additional replica(s)
M: 42ab4a3038ad9aeef5c39ee6dcdfe1f585d051b6 192.168.10.183:6379
   slots:[10923-16383] (5461 slots) master
   1 additional replica(s)
S: 9b5a7881dcda79ad4509bfb754a3ac00f1796eae 192.168.10.181:6380
   slots: (0 slots) slave
   replicates 42ab4a3038ad9aeef5c39ee6dcdfe1f585d051b6
S: ad24fe755b23592c86501442798f5363657eee26 192.168.10.183:6380
   slots: (0 slots) slave
   replicates a82a858abcd842713f380afeeba4e664eddb5a71
S: be22ba42114cba45b7ecddbd1ba6a6588cc40b4f 192.168.10.182:6380
   slots: (0 slots) slave
   replicates d208bb1f9d1d63158b981766a369c7c058bc290a
M: a82a858abcd842713f380afeeba4e664eddb5a71 192.168.10.182:6379
   slots:[5461-10922] (5462 slots) master
   1 additional replica(s)
[OK] All nodes agree about slots configuration.
>>> Check for open slots...
>>> Check slots coverage...
[OK] All 16384 slots covered.
```

### 3.2.3 Redis cluster集群节点维护

集群运行时间长久之后，难免由于硬件故障、网络规划、业务增长等原因对已有集群进行相应的调整， 比如增加 Redis node节点、减少节点、节点迁移、更换服务器等。

```bash
增加节点和删除节点会涉及到已有的槽位重新分配及数据迁移。
```

#### 3.2.3.1 集群维护之动态添加节点

增加Redis node节点，需要与之前的Redis node版本相同、配置一致，然后分别启动两台Redis node，因为一主 一从。

**案例：**

因公司业务发展迅猛，现有的三主三从redis cluster架构可能无法满足现有业务的并发写入需求，因此公司紧急采 购一台服务器192.168.10.184，需要将其动态添加到集群当中其不能影响业务使用和数据丢失，则添加过程如下:

##### 3.2.3.1.1 添加节点到集群

```bash
add-node   new_host:new_port    existing_host:existing_port
要添加的新redis节点IP和端口 添加到的集群中的master IP:端口，新的node节点加到集群之后默认是master节
点，但是没有slots数据，需要重新分配。
```

**Redis 5和6添加方式**

```bash
[19:17:03 root@ubuntu18-04 apps]#redis-cli -a 123456 --cluster add-node 192.168.10.184:6379 192.168.10.181:6379
Warning: Using a password with '-a' or '-u' option on the command line interface may not be safe.
>>> Adding node 192.168.10.184:6379 to cluster 192.168.10.181:6379
>>> Performing Cluster Check (using node 192.168.10.181:6379)
M: d208bb1f9d1d63158b981766a369c7c058bc290a 192.168.10.181:6379
   slots:[0-5460] (5461 slots) master
   1 additional replica(s)
M: 42ab4a3038ad9aeef5c39ee6dcdfe1f585d051b6 192.168.10.183:6379
   slots:[10923-16383] (5461 slots) master
   1 additional replica(s)
S: 9b5a7881dcda79ad4509bfb754a3ac00f1796eae 192.168.10.181:6380
   slots: (0 slots) slave
   replicates 42ab4a3038ad9aeef5c39ee6dcdfe1f585d051b6
S: ad24fe755b23592c86501442798f5363657eee26 192.168.10.183:6380
   slots: (0 slots) slave
   replicates a82a858abcd842713f380afeeba4e664eddb5a71
S: be22ba42114cba45b7ecddbd1ba6a6588cc40b4f 192.168.10.182:6380
   slots: (0 slots) slave
   replicates d208bb1f9d1d63158b981766a369c7c058bc290a
M: a82a858abcd842713f380afeeba4e664eddb5a71 192.168.10.182:6379
   slots:[5461-10922] (5462 slots) master
   1 additional replica(s)
[OK] All nodes agree about slots configuration.
>>> Check for open slots...
>>> Check slots coverage...
[OK] All 16384 slots covered.
>>> Send CLUSTER MEET to node 192.168.10.184:6379 to make it join the cluster.
[OK] New node added correctly.
```

##### 3.2.3.1.2 重新分配槽位

添加主机之后需要对添加至集群种的新主机重新分片否则其没有分片也就无法写入数据。

验证当前状态：

**Redis 5和6**

```bash
[19:19:22 root@ubuntu18-04 apps]#redis-cli -a 123456 --cluster check 192.168.10.181:6379
Warning: Using a password with '-a' or '-u' option on the command line interface may not be safe.
192.168.10.181:6379 (d208bb1f...) -> 0 keys | 5461 slots | 1 slaves.
192.168.10.183:6379 (42ab4a30...) -> 0 keys | 5461 slots | 1 slaves.
192.168.10.184:6379 (c7205153...) -> 0 keys | 0 slots | 0 slaves.
192.168.10.182:6379 (a82a858a...) -> 1 keys | 5462 slots | 1 slaves.
[OK] 1 keys in 4 masters.
0.00 keys per slot on average.
>>> Performing Cluster Check (using node 192.168.10.181:6379)
M: d208bb1f9d1d63158b981766a369c7c058bc290a 192.168.10.181:6379
   slots:[0-5460] (5461 slots) master
   1 additional replica(s)
M: 42ab4a3038ad9aeef5c39ee6dcdfe1f585d051b6 192.168.10.183:6379
   slots:[10923-16383] (5461 slots) master
   1 additional replica(s)
M: c7205153ed0fc24cbb7f7dd39a330b3ca06f6936 192.168.10.184:6379
   slots: (0 slots) master   #没有槽位
S: 9b5a7881dcda79ad4509bfb754a3ac00f1796eae 192.168.10.181:6380
   slots: (0 slots) slave
   replicates 42ab4a3038ad9aeef5c39ee6dcdfe1f585d051b6
S: ad24fe755b23592c86501442798f5363657eee26 192.168.10.183:6380
   slots: (0 slots) slave
   replicates a82a858abcd842713f380afeeba4e664eddb5a71
S: be22ba42114cba45b7ecddbd1ba6a6588cc40b4f 192.168.10.182:6380
   slots: (0 slots) slave
   replicates d208bb1f9d1d63158b981766a369c7c058bc290a
M: a82a858abcd842713f380afeeba4e664eddb5a71 192.168.10.182:6379
   slots:[5461-10922] (5462 slots) master
   1 additional replica(s)
[OK] All nodes agree about slots configuration.
>>> Check for open slots...
>>> Check slots coverage...
[OK] All 16384 slots covered.
```

**Redis 5和6使用命令对新加的主机重新分配槽位**

```bash
[19:24:09 root@ubuntu18-04 apps]#redis-cli -a 123456 --cluster reshard 192.168.10.184:6379
[19:24:09 root@ubuntu18-04 apps]#redis-cli -a 123456 --cluster reshard 192.168.10.184:6379
Warning: Using a password with '-a' or '-u' option on the command line interface may not be safe.
>>> Performing Cluster Check (using node 192.168.10.184:6379)
M: c7205153ed0fc24cbb7f7dd39a330b3ca06f6936 192.168.10.184:6379
   slots: (0 slots) master
S: be22ba42114cba45b7ecddbd1ba6a6588cc40b4f 192.168.10.182:6380
   slots: (0 slots) slave
   replicates d208bb1f9d1d63158b981766a369c7c058bc290a
S: ad24fe755b23592c86501442798f5363657eee26 192.168.10.183:6380
   slots: (0 slots) slave
   replicates a82a858abcd842713f380afeeba4e664eddb5a71
M: d208bb1f9d1d63158b981766a369c7c058bc290a 192.168.10.181:6379
   slots:[0-5460] (5461 slots) master
   1 additional replica(s)
S: 9b5a7881dcda79ad4509bfb754a3ac00f1796eae 192.168.10.181:6380
   slots: (0 slots) slave
   replicates 42ab4a3038ad9aeef5c39ee6dcdfe1f585d051b6
M: a82a858abcd842713f380afeeba4e664eddb5a71 192.168.10.182:6379
   slots:[5461-10922] (5462 slots) master
   1 additional replica(s)
M: 42ab4a3038ad9aeef5c39ee6dcdfe1f585d051b6 192.168.10.183:6379
   slots:[10923-16383] (5461 slots) master
   1 additional replica(s)
[OK] All nodes agree about slots configuration.
>>> Check for open slots...
>>> Check slots coverage...
[OK] All 16384 slots covered. 
How many slots do you want to move (from 1 to 16384)? 4096  #分配多少个槽位
What is the receiving node ID? c7205153ed0fc24cbb7f7dd39a330b3ca06f6936  #接收slot的服务器ID，手动输入192.168.10.184的node ID
Please enter all the source node IDs.
  Type 'all' to use all the nodes as source nodes for the hash slots.
  Type 'done' once you entered all the source nodes IDs.
Source node #1: all  #将哪些源主机的槽位分配给192.168.7.104:6379，all是自动在所有的redis node选择划分，如果是从redis cluster删除主机可以使用此方式将主机上的槽位全部移动到别的redis主机
    Moving slot 12285 from 42ab4a3038ad9aeef5c39ee6dcdfe1f585d051b6
    Moving slot 12286 from 42ab4a3038ad9aeef5c39ee6dcdfe1f585d051b6
    Moving slot 12287 from 42ab4a3038ad9aeef5c39ee6dcdfe1f585d051b6
Do you want to proceed with the proposed reshard plan (yes/no)? yes #确认分配
```

##### 3.2.3.1.3 验证重新分配槽位之后的集群状态

```bash
[19:30:04 root@ubuntu18-04 apps]#redis-cli -a 123456 --cluster check 192.168.10.181:6379
Warning: Using a password with '-a' or '-u' option on the command line interface may not be safe.
192.168.10.181:6379 (d208bb1f...) -> 0 keys | 4096 slots | 1 slaves.
192.168.10.183:6379 (42ab4a30...) -> 0 keys | 4096 slots | 1 slaves.
192.168.10.184:6379 (c7205153...) -> 0 keys | 4096 slots | 0 slaves.  #但是现在没有slave
192.168.10.182:6379 (a82a858a...) -> 1 keys | 4096 slots | 1 slaves.
[OK] 1 keys in 4 masters.
0.00 keys per slot on average.
>>> Performing Cluster Check (using node 192.168.10.181:6379)
M: d208bb1f9d1d63158b981766a369c7c058bc290a 192.168.10.181:6379
   slots:[1365-5460] (4096 slots) master
   1 additional replica(s)
M: 42ab4a3038ad9aeef5c39ee6dcdfe1f585d051b6 192.168.10.183:6379
   slots:[12288-16383] (4096 slots) master
   1 additional replica(s)
M: c7205153ed0fc24cbb7f7dd39a330b3ca06f6936 192.168.10.184:6379
   slots:[0-1364],[5461-6826],[10923-12287] (4096 slots) master  #限制已经分配
S: 9b5a7881dcda79ad4509bfb754a3ac00f1796eae 192.168.10.181:6380
   slots: (0 slots) slave
   replicates 42ab4a3038ad9aeef5c39ee6dcdfe1f585d051b6
S: ad24fe755b23592c86501442798f5363657eee26 192.168.10.183:6380
   slots: (0 slots) slave
   replicates a82a858abcd842713f380afeeba4e664eddb5a71
S: be22ba42114cba45b7ecddbd1ba6a6588cc40b4f 192.168.10.182:6380
   slots: (0 slots) slave
   replicates d208bb1f9d1d63158b981766a369c7c058bc290a
M: a82a858abcd842713f380afeeba4e664eddb5a71 192.168.10.182:6379
   slots:[6827-10922] (4096 slots) master
   1 additional replica(s)
[OK] All nodes agree about slots configuration.
>>> Check for open slots...
>>> Check slots coverage...
[OK] All 16384 slots covered.
```

##### 3.2.3.1.4 为新的master添加slave节点

需要再向当前的Redis集群中添加一个Redis单机服务器，用于解决当前192.168.10.184单机的潜在宕机问题，即实现响应的高可用功能。

命令格式：

**Redis 5版本**

把192.168.7.104:6380添加到集群中

```bash
[19:30:27 root@ubuntu18-04 apps]#redis-cli -a 123456 --cluster add-node 192.168.10.184:6380 192.168.10.184:6379
Warning: Using a password with '-a' or '-u' option on the command line interface may not be safe.
>>> Adding node 192.168.10.184:6380 to cluster 192.168.10.184:6379
>>> Performing Cluster Check (using node 192.168.10.184:6379)
M: c7205153ed0fc24cbb7f7dd39a330b3ca06f6936 192.168.10.184:6379
   slots:[0-1364],[5461-6826],[10923-12287] (4096 slots) master
S: be22ba42114cba45b7ecddbd1ba6a6588cc40b4f 192.168.10.182:6380
   slots: (0 slots) slave
   replicates d208bb1f9d1d63158b981766a369c7c058bc290a
S: ad24fe755b23592c86501442798f5363657eee26 192.168.10.183:6380
   slots: (0 slots) slave
   replicates a82a858abcd842713f380afeeba4e664eddb5a71
M: d208bb1f9d1d63158b981766a369c7c058bc290a 192.168.10.181:6379
   slots:[1365-5460] (4096 slots) master
   1 additional replica(s)
S: 9b5a7881dcda79ad4509bfb754a3ac00f1796eae 192.168.10.181:6380
   slots: (0 slots) slave
   replicates 42ab4a3038ad9aeef5c39ee6dcdfe1f585d051b6
M: a82a858abcd842713f380afeeba4e664eddb5a71 192.168.10.182:6379
   slots:[6827-10922] (4096 slots) master
   1 additional replica(s)
M: 42ab4a3038ad9aeef5c39ee6dcdfe1f585d051b6 192.168.10.183:6379
   slots:[12288-16383] (4096 slots) master
   1 additional replica(s)
[OK] All nodes agree about slots configuration.
>>> Check for open slots...
>>> Check slots coverage...
[OK] All 16384 slots covered.
>>> Send CLUSTER MEET to node 192.168.10.184:6380 to make it join the cluster.
[OK] New node added correctly.
```

##### 3.2.3.1.5 更改新节点更改状态为slave

```bash
[19:32:40 root@ubuntu18-04 apps]#redis-cli -p 6380
127.0.0.1:6380> AUTH 123456
OK
127.0.0.1:6380> CLUSTER NODES   #查看当前集群节点，找到目标master 的ID
be22ba42114cba45b7ecddbd1ba6a6588cc40b4f 192.168.10.182:6380@16380 slave d208bb1f9d1d63158b981766a369c7c058bc290a 0 1620473622000 1 connected
ee63937d06ec065b95a2d53f182bb67e86ec9699 192.168.10.184:6380@16380 myself,master - 0 1620473620000 0 connected
c7205153ed0fc24cbb7f7dd39a330b3ca06f6936 192.168.10.184:6379@16379 master - 0 1620473622436 7 connected 0-1364 5461-6826 10923-12287
42ab4a3038ad9aeef5c39ee6dcdfe1f585d051b6 192.168.10.183:6379@16379 master - 0 1620473623000 5 connected 12288-16383
d208bb1f9d1d63158b981766a369c7c058bc290a 192.168.10.181:6379@16379 master - 0 1620473622000 1 connected 1365-5460
a82a858abcd842713f380afeeba4e664eddb5a71 192.168.10.182:6379@16379 master - 0 1620473619000 3 connected 6827-10922
9b5a7881dcda79ad4509bfb754a3ac00f1796eae 192.168.10.181:6380@16380 slave 42ab4a3038ad9aeef5c39ee6dcdfe1f585d051b6 0 1620473621000 5 connected
ad24fe755b23592c86501442798f5363657eee26 192.168.10.183:6380@16380 slave a82a858abcd842713f380afeeba4e664eddb5a71 0 1620473623454 3 connected
127.0.0.1:6380> CLUSTER REPLICATE c7205153ed0fc24cbb7f7dd39a330b3ca06f6936 #将其设置slave，命令格式为cluster replicate MASTERID
OK
127.0.0.1:6380> CLUSTER NODES #再次查看集群节点状态，验证节点是否已经更改为指定master 的slave
be22ba42114cba45b7ecddbd1ba6a6588cc40b4f 192.168.10.182:6380@16380 slave d208bb1f9d1d63158b981766a369c7c058bc290a 0 1620473846000 1 connected
ee63937d06ec065b95a2d53f182bb67e86ec9699 192.168.10.184:6380@16380 myself,slave c7205153ed0fc24cbb7f7dd39a330b3ca06f6936 0 1620473844000 7 connected
c7205153ed0fc24cbb7f7dd39a330b3ca06f6936 192.168.10.184:6379@16379 master - 0 1620473843608 7 connected 0-1364 5461-6826 10923-12287
42ab4a3038ad9aeef5c39ee6dcdfe1f585d051b6 192.168.10.183:6379@16379 master - 0 1620473847000 5 connected 12288-16383
d208bb1f9d1d63158b981766a369c7c058bc290a 192.168.10.181:6379@16379 master - 0 1620473848722 1 connected 1365-5460
a82a858abcd842713f380afeeba4e664eddb5a71 192.168.10.182:6379@16379 master - 0 1620473846000 3 connected 6827-10922
9b5a7881dcda79ad4509bfb754a3ac00f1796eae 192.168.10.181:6380@16380 slave 42ab4a3038ad9aeef5c39ee6dcdfe1f585d051b6 0 1620473847000 5 connected
ad24fe755b23592c86501442798f5363657eee26 192.168.10.183:6380@16380 slave a82a858abcd842713f380afeeba4e664eddb5a71 0 1620473847704 3 connected
```

##### 3.2.3.1.6 验证当前集群状态

确认每个master都有一个slave

```bash
[19:38:21 root@ubuntu18-04 apps]#redis-cli -a 123456 --cluster check 192.168.10.181:6379
Warning: Using a password with '-a' or '-u' option on the command line interface may not be safe.
192.168.10.181:6379 (d208bb1f...) -> 0 keys | 4096 slots | 1 slaves.
192.168.10.183:6379 (42ab4a30...) -> 0 keys | 4096 slots | 1 slaves.
192.168.10.184:6379 (c7205153...) -> 0 keys | 4096 slots | 1 slaves.
192.168.10.182:6379 (a82a858a...) -> 1 keys | 4096 slots | 1 slaves.
```

#### 3.2.3.2 集群维护之动态删除节点

添加节点的时候是先添加node节点到集群，然后分配槽位，删除节点的操作与添加节点的操作正好相反，是先将 被删除的Redis node上的槽位迁移到集群中的其他Redis node节点上，然后再将其删除，如果一个Redis node节 点上的槽位没有被完全迁移，删除该node的时候会提示有数据且无法删除。

**案例：**

由于192.168.10.181服务器使用年限已经超过三年，已经超过厂商质保期而且硬盘出现异常报警，经运维部架构师 提交方案并同开发同事开会商议，决定将现有Redis集群的4台主服务器分别是 192.168.10.181/192.168.10.182/192.168.10.183/192.168.10.184中的192.168.10.181临时下线，三台服务器的并发写 入性能足够支出未来1-2年的业务需求，则删除Redis node 192.168.10.181的操作如下：

##### 3.2.3.2.1 迁移master 的槽位之其他master

被迁移Redis master源服务器必须保证没有数据，否则迁移报错并会被强制中断。

**连接到192.168.10.182将集群中的192.168.10.181服务器删除**

```bash
[19:49:53 root@ubuntu18-04 apps]#redis-cli -a 123456 --cluster resgard 192.168.10.182:6379
How many slots do you want to move (from 1 to 16384)? 4096 #迁移master上的多少个槽位
What is the receiving node ID? 2252cfc400df0e6719b12475ac703abe3d5dff6c #接收槽位的服务器ID
Please enter all the source node IDs.
Type 'all' to use all the nodes as source nodes for the hash slots.
Type 'done' once you entered all the source nodes IDs.
Source node #1: dfffc371085859f2858730e1f350e9167e287073 #从哪个服务器迁移4096个槽位
Source node #2: done #写done，表示没有其他master了
Moving slot 5457 from dfffc371085859f2858730e1f350e9167e287073
Moving slot 5458 from dfffc371085859f2858730e1f350e9167e287073
Moving slot 5459 from dfffc371085859f2858730e1f350e9167e287073
Moving slot 5460 from dfffc371085859f2858730e1f350e9167e287073
Do you want to proceed with the proposed reshard plan (yes/no)? yes #是否继续
```

迁移完成！

##### 3.2.3.2.2 验证槽位迁移完成

```bash
[19:52:09 root@ubuntu18-04 apps]#redis-cli -a 123456 --cluster check 192.168.10.181:6379
Warning: Using a password with '-a' or '-u' option on the command line interface may not be safe.
192.168.10.183:6379 (42ab4a30...) -> 0 keys | 4096 slots | 1 slaves.
192.168.10.184:6379 (c7205153...) -> 0 keys | 4096 slots | 1 slaves.
192.168.10.182:6379 (a82a858a...) -> 1 keys | 8192 slots | 3 slaves.
[OK] 1 keys in 3 masters.
0.00 keys per slot on average.
>>> Performing Cluster Check (using node 192.168.10.181:6379)
S: d208bb1f9d1d63158b981766a369c7c058bc290a 192.168.10.181:6379
   slots: (0 slots) slave   #变为slave
   replicates a82a858abcd842713f380afeeba4e664eddb5a71
M: 42ab4a3038ad9aeef5c39ee6dcdfe1f585d051b6 192.168.10.183:6379
   slots:[12288-16383] (4096 slots) master
   1 additional replica(s)
M: c7205153ed0fc24cbb7f7dd39a330b3ca06f6936 192.168.10.184:6379
   slots:[0-1364],[5461-6826],[10923-12287] (4096 slots) master
   1 additional replica(s)
S: 9b5a7881dcda79ad4509bfb754a3ac00f1796eae 192.168.10.181:6380
   slots: (0 slots) slave
   replicates 42ab4a3038ad9aeef5c39ee6dcdfe1f585d051b6
S: ad24fe755b23592c86501442798f5363657eee26 192.168.10.183:6380
   slots: (0 slots) slave
   replicates a82a858abcd842713f380afeeba4e664eddb5a71
S: ee63937d06ec065b95a2d53f182bb67e86ec9699 192.168.10.184:6380
   slots: (0 slots) slave
   replicates c7205153ed0fc24cbb7f7dd39a330b3ca06f6936
S: be22ba42114cba45b7ecddbd1ba6a6588cc40b4f 192.168.10.182:6380
   slots: (0 slots) slave
   replicates a82a858abcd842713f380afeeba4e664eddb5a71
M: a82a858abcd842713f380afeeba4e664eddb5a71 192.168.10.182:6379
   slots:[1365-5460],[6827-10922] (8192 slots) master
   3 additional replica(s)
[OK] All nodes agree about slots configuration.
>>> Check for open slots...
>>> Check slots coverage...
[OK] All 16384 slots covered.
```

##### 3.2.3.2.3 从集群删除服务器

```bash
#虽然槽位已经迁移完成，但是服务器IP信息还在集群当中，因此还需要将IP信息从集群删除
#删除master：
[19:54:14 root@ubuntu18-04 apps]#redis-cli -a 123456 --cluster del-node 192.168.10.181:6379 d208bb1f9d1d63158b981766a369c7c058bc290a
Warning: Using a password with '-a' or '-u' option on the command line interface may not be safe.
>>> Removing node d208bb1f9d1d63158b981766a369c7c058bc290a from cluster 192.168.10.181:6379
>>> Sending CLUSTER FORGET messages to the cluster...
>>> Sending CLUSTER RESET SOFT to the deleted node.
```

##### 3.2.3.2.4 验证master与slave

确认整个Redis cluster集群中，每个master至少有一个slave，可以有多个，但是至少要有一个提供数据备份和服 务高可用。

```bash
[19:58:39 root@ubuntu18-04 apps]#redis-cli -a 123456 --cluster check 192.168.10.182:6379
Warning: Using a password with '-a' or '-u' option on the command line interface may not be safe.
192.168.10.182:6379 (a82a858a...) -> 1 keys | 8192 slots | 2 slaves.
192.168.10.183:6379 (42ab4a30...) -> 0 keys | 4096 slots | 1 slaves.
192.168.10.184:6379 (c7205153...) -> 0 keys | 4096 slots | 1 slaves.
[OK] 1 keys in 3 masters.
0.00 keys per slot on average.
>>> Performing Cluster Check (using node 192.168.10.182:6379)
M: a82a858abcd842713f380afeeba4e664eddb5a71 192.168.10.182:6379
   slots:[1365-5460],[6827-10922] (8192 slots) master
   2 additional replica(s)
S: 9b5a7881dcda79ad4509bfb754a3ac00f1796eae 192.168.10.181:6380
   slots: (0 slots) slave
   replicates 42ab4a3038ad9aeef5c39ee6dcdfe1f585d051b6
S: ee63937d06ec065b95a2d53f182bb67e86ec9699 192.168.10.184:6380
   slots: (0 slots) slave
   replicates c7205153ed0fc24cbb7f7dd39a330b3ca06f6936
M: 42ab4a3038ad9aeef5c39ee6dcdfe1f585d051b6 192.168.10.183:6379
   slots:[12288-16383] (4096 slots) master
   1 additional replica(s)
M: c7205153ed0fc24cbb7f7dd39a330b3ca06f6936 192.168.10.184:6379
   slots:[0-1364],[5461-6826],[10923-12287] (4096 slots) master
   1 additional replica(s)
S: ad24fe755b23592c86501442798f5363657eee26 192.168.10.183:6380
   slots: (0 slots) slave
   replicates a82a858abcd842713f380afeeba4e664eddb5a71
S: be22ba42114cba45b7ecddbd1ba6a6588cc40b4f 192.168.10.182:6380
   slots: (0 slots) slave
   replicates a82a858abcd842713f380afeeba4e664eddb5a71
[OK] All nodes agree about slots configuration.
>>> Check for open slots...
>>> Check slots coverage...
[OK] All 16384 slots covered.
```

#### 3.2.3.3 集群维护之模拟Master宕机

目前的架构为三主三从，互为跨主机master slave模式，测试master 宕机之后是否会自动切换至slave。

##### 3.2.3.3.1 测试数据写入

测试在master写入数据，并在其对应的slave验证数据：

```bash
127.0.0.1:6379> set key1 values1
OK
127.0.0.1:6379> get key1
"values1"
```

##### 3.2.3.3.2 slave验证数据

```bash
127.0.0.1:6380> KEYS *
1) "key1"
127.0.0.1:6380> get key1
(error) MOVED 9189 192.168.10.182:6379 #slave不提供读写，只提供数据备份即master选举
```

##### 3.2.3.3.3 停止master并验证故障转移

Redis Master服务停止之后，其对应的slave会被选举为master继续处理数据的读写操作。

```bash
[20:07:31 root@ubuntu18-04 apps]#kill -9 12481
```

##### 3.2.3.3.4 验证slave 日志

```bash
[20:07:48 root@ubuntu18-04 apps]#tail /apps/redis2/logs/redis_6379.log 
12475:S 08 May 2021 20:08:09.698 * Connecting to MASTER 192.168.10.182:6379
12475:S 08 May 2021 20:08:09.698 * MASTER <-> REPLICA sync started
12475:S 08 May 2021 20:08:09.698 # Start of election delayed for 854 milliseconds (rank #0, offset 5521).
12475:S 08 May 2021 20:08:09.698 # Error condition on socket for SYNC: Connection refused
12475:S 08 May 2021 20:08:10.618 # Starting a failover election for epoch 9.
12475:S 08 May 2021 20:08:10.621 # Failover election won: I'm the new master. #称为新的master
12475:S 08 May 2021 20:08:10.621 # configEpoch set to 9 after successful failover
12475:M 08 May 2021 20:08:10.621 * Discarding previously cached master state.
12475:M 08 May 2021 20:08:10.621 # Setting secondary replication ID to bbbaec21cc460e99bc13bfd6c9ca6581ecf5d9d1, valid up to offset: 5522. New replication ID is a7dc39081adbe0881d40dfee6aa3e7f8ce67c564
12475:M 08 May 2021 20:08:10.622 # Cluster state changed: ok #切换成功
```

##### 3.2.3.3.5 验证slave当前状态

```bash
127.0.0.1:6380> info replication
# Replication
role:master
connected_slaves:0
master_failover_state:no-failover
master_replid:a7dc39081adbe0881d40dfee6aa3e7f8ce67c564
master_replid2:bbbaec21cc460e99bc13bfd6c9ca6581ecf5d9d1
master_repl_offset:5521
second_repl_offset:5522
repl_backlog_active:1
repl_backlog_size:1048576
repl_backlog_first_byte_offset:3993
repl_backlog_histlen:1529
```

##### 3.2.3.3.6 验证数据读写

确认slave 192.168.7.103:6380切换为master之后可以继续为业务提供读写业务且数据没有丢失。

```bash
127.0.0.1:6380> KEYS *
1) "key1"
127.0.0.1:6380> set key1 zhang
OK
127.0.0.1:6380> get key1
"zhang"
```

注：服务恢复之后重新验证各master的slave。

**重新启动redis服务验证**

```bash
[20:08:59 root@ubuntu18-04 apps]#redis-server redis1/etc/redis.conf
[20:12:07 root@ubuntu18-04 apps]#redis-cli -a 123456 --cluster check 192.168.10.182:6379
Warning: Using a password with '-a' or '-u' option on the command line interface may not be safe.
192.168.10.182:6380 (be22ba42...) -> 1 keys | 8192 slots | 1 slaves.
192.168.10.183:6379 (42ab4a30...) -> 0 keys | 4096 slots | 1 slaves.
192.168.10.184:6379 (c7205153...) -> 0 keys | 4096 slots | 1 slaves.
[OK] 1 keys in 3 masters.
0.00 keys per slot on average.
>>> Performing Cluster Check (using node 192.168.10.182:6379)
S: a82a858abcd842713f380afeeba4e664eddb5a71 192.168.10.182:6379
   slots: (0 slots) slave    #以前的master启动后变为slave
   replicates be22ba42114cba45b7ecddbd1ba6a6588cc40b4f
M: be22ba42114cba45b7ecddbd1ba6a6588cc40b4f 192.168.10.182:6380
   slots:[1365-5460],[6827-10922] (8192 slots) master
   1 additional replica(s)
M: 42ab4a3038ad9aeef5c39ee6dcdfe1f585d051b6 192.168.10.183:6379
   slots:[12288-16383] (4096 slots) master
   1 additional replica(s)
S: ad24fe755b23592c86501442798f5363657eee26 192.168.10.183:6380
   slots: (0 slots) slave
   replicates 42ab4a3038ad9aeef5c39ee6dcdfe1f585d051b6
M: c7205153ed0fc24cbb7f7dd39a330b3ca06f6936 192.168.10.184:6379
   slots:[0-1364],[5461-6826],[10923-12287] (4096 slots) master
   1 additional replica(s)
S: ee63937d06ec065b95a2d53f182bb67e86ec9699 192.168.10.184:6380
   slots: (0 slots) slave
   replicates c7205153ed0fc24cbb7f7dd39a330b3ca06f6936
[OK] All nodes agree about slots configuration.
>>> Check for open slots...
>>> Check slots coverage...
[OK] All 16384 slots covered.
```

### 3.2.4 集群维护之导入现有Redis数据

导入数据需要redis cluster不能与被导入的数据有重复的key名称，否则导入不成功或中断。

**案例：**

公司将redis cluster部署完成之后，需要将之前的数据导入之Redis cluster集群，但是由于Redis cluster使用的分 片保存key的机制，因此使用传统的AOF文件或RDB快照无法满足需求，因此需要使用集群数据导入命令完成。

#### 3.2.4.1 基础环境准备

导入数据之前需要关闭各redis 服务器的密码，包括集群中的各node和源Redis server，避免认证带来的环境不一致从而无法导入，可以加参数--cluster-replace 强制替换Redis cluster已有的key。

**Redis 5**

```bash
#redis-cli --cluster import 集群服务器IP:PORT --cluster-from 外部Redis node-IP:PORT --cluster-copy --cluster-replace
[20:27:45 root@ubuntu18-04 ~]#redis-cli -a 123456 --cluster import 192.168.10.182:6379 --cluster-from 192.168.10.181:6379 --cluster-copy
```

#### 3.2.4.2  Redis cluster验证数据

```bash
127.0.0.1:6379> KEYS *
 1) "key-30"
 2) "key-52"
 3) "key-78"
 4) "key-27"
 5) "key-85"
....
```

### 3.2.5 redis扩展集群方案

除了Redis 官方自带的Redis cluster集群之外，还有一些开源的集群解决方案可供参考使用。

#### 3.2.5.1 codis

Codis 是一个分布式 Redis 解决方案, 对于上层的应用来说, 连接到 Codis Proxy 和连接原生的 Redis Server 没有显 著区别 (令不支持的命列表), 上层应用可以像使用单机的 Redis 一样使用, Codis 底层会处理请求的转发, 不停机的数 据迁移等工作, 所有后边的一切事情, 对于前面的客户端来说是透明的, 可以简单的认为后边连接的是一个内存无限 大的 Redis 服务。

codis-proxy相当于redis，即连接codis-proxy和连接redis是没有任何区别的，codis-proxy无状态，不负责记录是 否在哪保存，数据在zookeeper记录，即codis proxy向zookeeper查询key的记录位置，proxy 将请求转发到一个 组进行处理，一个组里面有一个master和一个或者多个slave组成，默认有1024个槽位，redis cluster 默认有 16384个槽位，其把不同的槽位的内容放在不同的group。

Github 地址：https://github.com/CodisLabs/codis/

![image-20210508203332983](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210508203332983.png)

#### 3.2.5.2 twemproxy

由Twemproxy双向代理客户端实现分片，即代替用户将数据分片并到不同的后端服务器进行读写，其还支持 memcached，可以为proxy配置算法，缺点为twemproxy是瓶颈，不支持数据迁移。

Github 地址：https://github.com/twitter/twemproxy

![image-20210508203411817](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210508203411817.png)

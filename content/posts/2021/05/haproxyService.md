---
title: "HAProxy服务"
date: 2021-05-17T16:40:38+08:00
draft: false
description: "从负载均衡的类型与应用场景切入，演示 HAProxy 的安装、配置和调度策略。"
cover: "https://b3logfile.com/bing/20190819.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["应用服务"]
tags: ["HAproxy"]
toc: true
---
# 一、负载均衡简介

负载均衡(Load Balance，简称LB)是⼀种服务或基于硬件设备等实现的 高可用反向代理技术，负载均衡将特定的业务(web服务、网络流量等)分担给指定的⼀个或多个后端特定的服务器或设备，从而提高了公司业务的并发处理能力、保证了业务的高可用性、方便了业务后期的水平动态扩展。

https://yq.aliyun.com/articles/1803    阿⾥云SLB介绍

![image-20210331190832026](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210331190832026.png)

## 1.1为什么使用负载均衡

```bash
Web服务器的动态⽔平扩展-->对⽤户⽆感知 
增加业务并发访问及处理能⼒-->解决单服务器瓶颈问题 
节约公⽹IP地址-->降低IT⽀出成本 
隐藏内部服务器IP-->提⾼内部服务器安全性 
配置简单-->固定格式的配置⽂件 
功能丰富-->⽀持四层和七层，⽀持动态下线主机 
性能较强-->并发数万甚⾄数⼗万
```

## 1.2 负载均衡类型

**四层（传输层）：**

```bash
LVS(Linux Virtual Server)
HAProxy(High Availability Proxy) 
Nginx(1.9)
```

**七层：**

```bash
HAProxy 
Nginx
```

**硬件：**

```bash
F5         #https://f5.com/zh 
Netscaler  #https://www.citrix.com.cn/products/citrix-adc/ 
Array      #https://www.arraynetworks.com.cn/ 
深信服      #http://www.sangfor.com.cn/ 
北京灵州     #http://www.lingzhou.com.cn/cpzx/llfzjh/
```

## 1.3 应用场景

```bash
四层：Redis、Mysql、RabbitMQ、Memcache等 
七层：Nginx、Tomcat、Apache、PHP 、图⽚、动静分离、API等
```

## 2.4 HAProxy介绍

HAProxy是法国开发者 威利塔罗(Willy Tarreau) 在2000年使⽤C语⾔开发 的⼀个开源软件，是⼀款具备⾼并发(⼀万以上)、⾼性能的TCP和HTTP负载 均衡器，⽀持基于cookie的持久性，⾃动故障切换，支持正则表达式及web状态统计，⽬前最新TLS版本为2.2

**历史版本：**

```bash
历史版本更新功能：1.4 1.5 1.6 1.7 1.8 1.9 2.0 2.1 2.2 2.3 2.4-dev 
1.8：多线程，HTTP/2缓存…… 
1.7：服务器动态配置，多类型证书…… 
1.6：DNS解析⽀持，HTTP连接多路复⽤…… 
1.5：开始⽀持SSL，IPV6，会话保持……
```

从2013年HAProxy 分为社区版和企业版，企业版将提供更多的特性和功能 以及全天24⼩时的技术⽀持等服务。

### 1.4.1 企业版

https://www.haproxy.com/  企业版

### 1.4.2 社区版

http://www.haproxy.org/        社区版

https://github.com/haproxy    github

### 1.4.3 版本对比

| 功能                                      | 社区版 | 企业版 |
| ----------------------------------------- | ------ | ------ |
| ⾼级HTTP / TCP负载平衡和持久性            | ⽀持   | ⽀持   |
| ⾼级健康检查                              | ⽀持   | ⽀持   |
| 应⽤程序加速                              | ⽀持   | ⽀持   |
| ⾼级安全特性                              | ⽀持   | ⽀持   |
| ⾼级管理                                  | ⽀持   | ⽀持   |
| HAProxy Dev Branch新功能                  |        | ⽀持   |
| 24*7 ⽀持服务                             |        | ⽀持   |
| 实时仪表盘                                |        | ⽀持   |
| VRRP和Route Health Injection HA⼯具       |        | ⽀持   |
| ACL，映射和TLS票证密钥同步                |        | ⽀持   |
| 基于应⽤程序的⾼级DDoS和Bot保护(⾃动保护) |        | ⽀持   |
| Bot(机器⼈)监测                           |        | ⽀持   |
| Web应⽤防⽕墙                             |        | ⽀持   |
| HTTP协议验证                              |        | ⽀持   |
| 实时集群追踪                              |        | ⽀持   |

### 1.4.4 HAProxy功能

```bash
HAProxy功能： 
	TCP和HTTP反向代理 
	SSL/TSL服务器 
	可以针对HTTP请求添加cookie，进⾏路由后端服务器 
	可平衡负载⾄后端服务器，并⽀持持久连接 
	⽀持所有主服务器故障切换⾄备⽤服务器 
	⽀持专⽤端⼝实现监控服务 
	⽀持不影响现有连接情况下停⽌接受新连接请求 
	可以在双向添加，修改或删除HTTP报⽂⾸部
	响应报⽂压缩 
	⽀持基于pattern实现连接请求的访问控制 
	通过特定的URI为授权⽤⼾提供详细的状态信息
不具备的功能： 
	正向代理--squid，nginx 
	缓存代理--varnish 
	web服务--nginx、tengine、apache、php、tomcat 
	UDP--⽬前不⽀持UDP协议，2.1版本会⽀持UDP协议代理 
	单机性能--LVS(DR)
```

![image-20210331192242084](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210331192242084.png)

# 二、HAProxy安装及基础配置

## 2.1 Ubuntu安装

```bash
root@zhang:~# apt-get install haproxy
#验证版本
root@zhang:~# haproxy -v
HA-Proxy version 2.0.13-2ubuntu0.1 2020/09/08 - https://haproxy.org/
```

## 2.2 Centos 安装

在centos 系统上通过yum、编译等多种安装⽅式。

### 2.2.1 默认yum源

默认的base仓库中包含haproxy的安装包⽂件，但是版本⽐较旧，是1.5.18的版本，距离当前版本已经有较⻓时间没有更新，由于版本⽐较旧所以有 很多功能不⽀持，如果对功能和性能没有要求可以使⽤此版本，否则推荐 使⽤新版本。

```bash
[19:32:51 root@centos8 ~]#yum install -y haproxy

#验证版本
[19:35:24 root@centos8 ~]#haproxy -v
HA-Proxy version 1.8.23 2019/11/25
Copyright 2000-2019 Willy Tarreau <willy@haproxy.org>
```

## 2.3 编译安装HAProxy

编译安装HAProxy 2.0 LTS版本，更多源码包下载地址：http://www.haproxy.org/download/

### 2.3.1 解决lua环境

HAProxy ⽀持基于lua实现功能扩展，lua是⼀种小巧的脚本语⾔，于1993年由巴西里约热内卢天主教大学（Pontifical Catholic University of Rio deJaneiro）⾥的⼀个研究小组开发，其设计木的是为了嵌⼊应⽤程序中，从而为应用程序提供灵活的扩展和定制功能。

```bash
Lua 应⽤场景 
游戏开发 
独⽴应⽤脚本 
Web 应⽤脚本 
扩展和数据库插件，如MySQL Proxy 
安全系统，如⼊侵检测系统
```

#### 2.3.1.1 Ubuntu安装

```bash
root@zhang:/usr/local/src/haproxy-2.0.21# apt install make wget gcc libreadline-dev openssl libssl-dev   libpcre3  libpcre3-dev zlib1g-dev  libreadline-dev libsystemd-dev -y
#编译安装lua环境版本必须是5.3及以上
root@zhang:~# wget http://www.lua.org/ftp/lua-5.3.5.tar.gz
root@zhang:~# tar xf lua-5.3.5.tar.gz 
root@zhang:~# cd lua-5.3.5/
root@zhang:~# make linux
root@zhang:~# lua-5.3.5/src/lua -v
Lua 5.3.5  Copyright (C) 1994-2018 Lua.org, PUC-Rio
#编译安装HAproxy
root@zhang:/usr/local/src# wget http://www.haproxy.org/download/2.0/src/haproxy-2.0.21.tar.gz
root@zhang:/usr/local/src# tar xf haproxy-2.0.21.tar.gz 
root@zhang:/usr/local/src# cd haproxy-2.0.21/
#编译安装2.0及以上版本
root@zhang:/usr/local/src/haproxy-2.0.21# make ARCH=x86_64 TARGET=linux-glibc USE_PCRE=1 USE_OPENSSL=1 USE_ZLIB=1 USE_SYSTEMD=1 USE_CPU_AFFINITY=1 USE_LUA=1 LUA_INC=/usr/local/src/lua-5.3.5/src/ LUA_LIB=/usr/local/src/lua-5.3.5/src/ PREFIX=/apps/haproxy

#HAProxy 1.8及1.9版本编译参数： 
make ARCH=x86_64 TARGET=linux2628 USE_PCRE=1 USE_OPENSSL=1 USE_ZLIB=1 USE_SYSTEMD=1 USE_CPU_AFFINITY=1 PREFIX=/usr/local/haproxy

root@zhang:/usr/local/src/haproxy-2.0.21# make install PREFIX=/apps/haproxy
root@zhang:/apps/haproxy# ln -s /apps/haproxy/sbin/haproxy /sbin/

#验证版本
root@zhang:/apps/haproxy# haproxy -v
HA-Proxy version 2.0.21-172aac7 2021/03/18 - https://haproxy.org/
```

#### 2.3.1.2 Centos安装

```bash
[14:46:33 root@centos8 ~]#yum install libtermcap-devel ncurses-devel libevent-devel readline-devel gcc gcc-c++ glibc glibc-devel pcre pcre-devel openssl openssl-devel systemd-devel net-tools vim iotop bc zip unzip zlib-devel lrzsz tree screen lsof tcpdump wget 
#编译安装lua
[14:47:12 root@centos8 ~]#cd /usr/local/src/
[14:48:13 root@centos8 src]#wget http://www.lua.org/ftp/lua-5.4.3.tar.gz
[14:48:35 root@centos8 src]#tar xf lua-5.4.3.tar.gz 
[14:48:49 root@centos8 src]#cd lua-5.4.3/
[14:48:55 root@centos8 lua-5.4.3]#make linux
[14:49:33 root@centos8 lua-5.4.3]#src/lua -v
Lua 5.4.3  Copyright (C) 1994-2021 Lua.org, PUC-Rio
[14:50:12 root@centos8 ~]#ln -s /usr/local/src/lua-5.4.3/src/lua /sbin/
#编译安装HAProxy
[14:51:21 root@centos8 src]#tar xf haproxy-2.0.21.tar.gz 
[14:51:32 root@centos8 src]#cd haproxy-2.0.21/
[14:53:43 root@centos8 haproxy-2.0.21]#make ARCH=x86_64 TARGET=linux-glibc USE_PCRE=1 USE_OPENSSL=1 USE_ZLIB=1 USE_SYSTEMD=1 USE_CPU_AFFINITY=1 USE_LUA=1 LUA_INC=/usr/local/src/lua-5.4.3/src/ LUA_LIB=/usr/local/src/lua-5.4.3/src/ PREFIX=/apps/haproxy
[14:55:37 root@centos8 haproxy-2.0.21]#make install PREFIX=/apps/haproxy
[14:56:16 root@centos8 haproxy-2.0.21]#ln -s /apps/haproxy/sbin/haproxy /sbin/
#测试版本
[14:56:29 root@centos8 haproxy-2.0.21]#haproxy -v
HA-Proxy version 2.0.21-172aac7 2021/03/18 - https://haproxy.org/
```

### 2.3.2 HAProxy启动脚本

```bash
[15:01:58 root@centos8 ~]#vim /usr/lib/systemd/system/haproxy.service
[Unit]
Description=HAProxy Load Balancer
After=network-online.target
Wants=network-online.target                                                         

[Service]
Environment="CONFIG=/etc/haproxy/haproxy.cfg" "PIDFILE=/run/haproxy.pid"
ExecStartPre=/usr/sbin/haproxy -f $CONFIG -c -q $OPTIONS
ExecStart=/usr/sbin/haproxy -Ws -f $CONFIG -p $PIDFILE $OPTIONS
ExecReload=/usr/sbin/haproxy -f $CONFIG -c -q $OPTIONS
ExecReload=/bin/kill -USR2 $MAINPID
SuccessExitStatus=143
KillMode=mixed
Type=notify

[Install]
WantedBy=multi-user.target
```

### 2.3.3 配置文件

```bash
[15:20:01 root@centos8 ~]#useradd -s /sbin/nglogin  -r haproxy
[15:20:05 root@centos8 ~]#id haproxy 
uid=992(haproxy) gid=990(haproxy) groups=990(haproxy)
[15:03:16 root@centos8 ~]#mkdir /etc/haproxy
[15:03:55 root@centos8 ~]#vim /etc/haproxy/haproxy.cfg
global
    maxconn 100000
    chroot /apps/haproxy
    stats socket /var/lib/haproxy/haproxy.sock      
    user haproxy
    group haproxy
    daemon
    #nbproc 4
    #cpu-map 1 0
    #cpu-map 2 1
    #cpu-map 3 2
    #cpu-map 4 3
    pidfile /var/lib/haproxy/haproxy.pid
    log 127.0.0.1 local3 info
defaults
    option http-keep-alive
    option forwardfor
    maxconn 100000
mode http
    timeout connect 300000ms
    timeout client 300000ms
    timeout server 300000ms
listen stats
    mode http
    bind 0.0.0.0:9999
    stats enable
    log global
    stats uri /haproxy-status
    stats auth haadmin:123456
```

### 2.3.6 启动haproxy

```bash
[15:21:51 root@centos8 ~]#mkdir /var/lib/haproxy
[15:21:58 root@centos8 ~]#chown -R haproxy: /var/lib/haproxy
[15:37:04 root@centos8 ~]#systemctl start haproxy
[15:37:19 root@centos8 ~]#systemctl status haproxy.service
```

## 2.4 基础配置详解

HAPrpxy的配置⽂件haproxy.cfg由两⼤部分组成，分别是global和proxies 部分。

**global：全局配置段**

```bash
#进程及安全配置相关的参数
#性能调整相关参数
#Debug参数
```

**proxies：代理配置段**

```bash
#defaults：为frontend, backend, listen提供默认配置
#frontend：前端，相当于nginx中的server {}
#backend：后端，相当于nginx中的upstream {}
#listen：同时拥有前端和后端配置
```

### 2.4.1 global配置参数

官⽅⽂档：https://cbonte.github.io/haproxy-dconv/2.0/intro.html

```bash
chroot #锁定运⾏⽬录

deamon #以守护进程运⾏
#stats socket /var/lib/haproxy/haproxy.sock mode 600 level

admin #socket⽂件

user, group, uid, gid #运⾏haproxy的⽤⼾⾝份

nbproc        #开启的haproxy进程数，与CPU保持⼀致
nbthread      #指定每个haproxy进程开启的线程数，默认为每个进程⼀个线程
cpu-map 1 0   #绑定haproxy 进程⾄指定CPU，单进程多线程和多进程单线程不能并存。
maxconn       #每个haproxy进程的最⼤并发连接数
maxsslconn    #每个haproxy进程ssl最⼤连接数,⽤于haproxy配置了证书的场景下
maxconnrate   #每个进程每秒创建的最⼤连接数量
spread-checks #后端server状态check随机提前或延迟百分⽐时间，建议2-5(20%-50%)之间
pidfile       #指定pid⽂件路径
log 127.0.0.1 local3 info  #定义全局的syslog服务器；最多可以定义两个
```

### 2.4.2 Proxies配置

https://cbonte.github.io/haproxy-dconv/2.0/configuration.html#4

```bash
defaults [<name>] #默认配置项，针对以下的frontend、backend和lsiten⽣效，可以多个name也可以没有name
frontend <name>   #前端servername，类似于Nginx的⼀个虚拟主机server。
backend <name>    #后端服务器组，等于nginx的upstream
listen <name>     #将frontend和backend合并在⼀起配置
```

- 注：name字段只能使⽤”-”、”_”、”.”、和”:”，并且严格区分⼤⼩写，例 如：Web和web是完全不同的两组服务器。

#### 2.4.2.1 Proxies配置-defaults

defaults 配置参数

```bash
option redispatch      #当server Id对应的服务器挂掉后，强制定向到其他健康的服务器，重新派发
option abortonclose    #当服务器负载很⾼的时候，⾃动结束掉当前队列处理⽐较久的链接，关闭
option http-keep-alive #开启与客⼾端的会话保持
option forwardfor      #透传客⼾端真实IP⾄后端web服务器
mode http              #设置默认⼯作类型
timeout http-keep-alive 120s #session 会话保持超时时间，范围内会转发到相同的后端服务器
timeout connect 120s   #客⼾端请求从haproxy到后端server的最⻓连接等待时间(TCP之前)
timeout server 600s    #客⼾端请求从haproxy到后端服务端的请求处理
超时时⻓（TCP之后）
timeout client 600s    #设置haproxy与客⼾端的最⻓⾮活动时间
timeout check 5s       #对后端服务器的默认检测超时时间
```

#### 2.4.2.2 Proxies配置-frontend

frontend配置参数：

```bash
bind：指定HAProxy的监听地址，可以是IPV4或IPV6，可以同时监听多个IP或端⼝，可同时⽤于listen字段中
bind [<address>]:<port_range> [, ...] [param*]

listen http_proxy       #监听http的多个IP的多个端⼝和sock⽂件
bind :80,:443,:8801-8810
bind 10.0.0.1:10080,10.0.0.1:10443
bind /var/run/ssl-frontend.sock user root mode 600
accept-proxy

listen http_https_proxy #https监听
bind :80
bind :443 ssl crt /etc/haproxy/site.pem

listen http_https_proxy_explicit #监听ipv6、ipv4和unix sock⽂件
bind ipv6@:80
bind ipv4@public_ssl:443 ssl crt /etc/haproxy/site.pem
bind unix@ssl-frontend.sock user root mode 600 acceptproxy

listen external_bind_app1 #监听file descriptor
bind "fd@${FD_APP1}"

⽣产⽰例：
frontend WEB_PORT
bind :80,:8080
bind 192.168.7.102:10080,:8801-
8810,192.168.7.101:9001-9010

mode http/tcp #指定负载协议类型
use_backend backend_name #调⽤的后端服务器组名称
```

#### 2.4.2.3 Proxies配置-backend

定义⼀组后端服务器，backend服务器将被frontend进⾏调⽤。

```bash
mode http/tcp #指定负载协议类型
option        #配置选项
server        #定义后端real server
```

- 注意：option后⾯加httpchk，smtpchk,mysql-check,pgsql-check，sslhello-chk⽅法，可⽤于实现更多应⽤层检测功能。

```bash
check #对指定real进⾏健康状态检查，默认不开启
	addr IP #可指定的健康状态监测IP
	port num #指定的健康状态监测端⼝
	inter num #健康状态检查间隔时间，默认2000 ms
	fall num #后端服务器失效检查次数，默认为3
	rise num #后端服务器从下线恢复检查次数，默认为2
weight #默认为1，最⼤值为256，0表⽰不参与负载均衡
backup #将后端服务器标记为备份状态
disabled #将后端服务器标记为不可⽤状态
redirect prefix http://www.magedu.net/ #将请求临时重定向⾄其它URL，只适⽤于http模式
maxconn <maxconn>： #当前后端server的最⼤并发连接数
backlog <backlog>： #当server的连接数达到上限后的后援队列⻓度
```

#### 2.4.2.4 frontend+backend配置实例

```bash
frontend WEB_PORT_80
    bind 192.168.10.81:80
    mode http
    use_backend web_prot_http_nodes
backend web_prot_http_nodes
    mode http
    option forwardfor
    server 192.168.10.82 192.168.10.82:80 check inter 3000 fall 3 rise 5
    server 192.168.10.83 192.168.10.83:80 check inter 3000 fall 3 rise 5
```

#### 2.4.2.5 Proxies配置-listen替代frontend+backend

```bash
listen WEB_PORT_80
    bind 192.168.10.81:80
    mode http
    option forwardfor
    server web1 192.168.10.82:80 check inter 3000 fall 3 rise 5
    server web2 192.168.10.83:80 check inter 3000 fall 3 rise 5
```

# 三、HAProxy调度算法

HAProxy通过固定参数balance指明对后端服务器的调度算法，该参数可以 配置在listen或backend选项中。

HAProxy的调度算法分为静态和动态调度算法，但是有些算法可以根据参 数在静态和动态算法中相互转换。

https://cbonte.github.io/haproxy-dconv/2.0/configuration.html#4 官 ⽅⽂档

## 3.1 静态算法

静态算法：按照事先定义好的规则轮询公平调度，不关⼼后端服务器的当 前负载、链接数和响应速度等，且⽆法实时修改权重，只能靠重启 HAProxy⽣效。

服务器动态权重调整

```bash
[16:57:48 root@centos8 ~]#yum install socat
#Socat 是 Linux 下的⼀个多功能的⽹络⼯具，名字来由是Socket CAT，Socat 的主要特点就是在两个数据流之间建⽴通道，且⽀持众多协议和链接⽅式。如 IP、TCP、 UDP、IPv6、Socket⽂件等。
[17:02:03 root@centos8 ~]#echo "show info" | socat stdio /var/lib/haproxy/haproxy.sock 

[17:03:03 root@centos8 ~]#echo "get weight WEB_PORT_80/web1" | socat stdio /var/lib/haproxy/haproxy.sock 
1 (initial 1)

[17:03:48 root@centos8 ~]#echo "set weight WEB_PORT_80/web1 2" | socat stdio /var/lib/haproxy/haproxy.sock
```

### 3.1.1 static-rr

static-rr：基于权重的轮询调度，不⽀持权重的运⾏时调整及后端服务器慢启动，其后端主机数量没有限制

```bash
listen WEB_PORT_80
    bind 192.168.10.81:80,:8801-8810,192.168.10.81:9001-9010
    mode http
    log global
    balance static-rr
    option forwardfor
    server web1 192.168.10.82:80 weight 1 check inter 3000 fall 3 rise 5
    server web2 192.168.10.83:80 weight 2 check inter 3000 fall 3 rise 5
#测试访问效果
[17:09:21 root@centos8 ~]#while :;do curl www.zhangzhuo.org;sleep 1;done
www.zhangzhuo.org web1 192.168.10.82
www.zhangzhuo.org web2 192.168.10.83
www.zhangzhuo.org web2 192.168.10.83
```

### 3.1.2 first

first：根据服务器在列表中的位置，⾃上⽽下进⾏调度，但是其只会当第⼀ 台服务器的连接数达到上限，新请求才会分配给下⼀台服务，因此会忽略 服务器的权重设置。

```bash
listen web_host_first
    bind 192.168.10.81:80
    mode http
    log global
    balance first
    server web1 192.168.10.82:80 maxconn 2 weight 1 check inter 3000 fall 2 rise 5
    server web2 192.168.10.83:80 maxconn 1 weight 1 check inter 3000 fall 2 rise 5
#测试访问效果，第一个服务器如果没有到达最大连接数是不会转到第二个服务器的
[17:18:05 root@centos8 ~]#while :;do curl www.zhangzhuo.org;sleep 1;done
```

## 3.2 动态算法

动态算法：基于后端服务器 状态进⾏调度适当调整，⽐如优先调度⾄当前 负载较低的服务器，且权重可以在haproxy运⾏时动态调整⽆需重启。

### 3.2.1 roundrobin

roundrobin：基于权重的轮询动态调度算法，⽀持权重的运⾏时调整，不完全等于lvs中的rr轮训模式，HAProxy中的roundrobin⽀持慢启动(新加的 服务器会逐渐增加转发数)，其每个后端backend中最多⽀持4095个real server，roundrobin为默认调度算法，且⽀持对real server权重动态调整。

```bash
listen web_host_roundrobin
    bind 192.168.10.81:80
    mode http
    log global
    balance roundrobin
    server web1 192.168.10.82:80 weight 1 check inter 3000 fall 2 rise 5
    server web2 192.168.10.83:80 weight 2 check inter 3000 fall 2 rise 5
#测试
[17:18:05 root@centos8 ~]#while :;do curl www.zhangzhuo.org;sleep 1;done
```

**动态调整权限：**

```bash
[17:27:05 root@centos8 ~]#yum install socat -y
#查看
[17:38:09 root@centos8 ~]#echo "get weight web_host_roundrobin/web1 " | socat stdio /var/lib/haproxy/haproxy.sock 
1 (initial 1)
#修改
[17:37:35 root@centos8 ~]#echo "set weight web_host_roundrobin/web1 3" | socat stdio /var/lib/haproxy/haproxy.sock 
Permission denied
```

### 3.2.2 leastconn

leastconn加权的最少连接的动态，⽀持权重的运⾏时调整和慢启动，即当 前后端服务器连接最少的优先调度(新客⼾端连接)，⽐较适合⻓连接的场景 使⽤，⽐如MySQL等场景。

```bash
listen web_host_leastconn
    bind 192.168.10.81:80
    mode http
    log global
    balance leastconn
    server web1 192.168.10.82:80 weight 1 check inter 3000 fall 2 rise 5
    server web2 192.168.10.83:80 weight 1 check inter 3000 fall 2 rise 5
```

## 3.3 其他算法

其他部分算法即可作为静态算法，⼜可以通过选项成为动态算法

### 3.3.1 source

源地址hash，基于用户源地址hash并将请求转发到后端服务器，默认为静态即取模⽅式，但是可以通过hash-type⽀持的选项更改，后续同⼀个源地址请求将被转发⾄同⼀个后端web服务器，⽐较适⽤于session保持/缓存业务等场景。

源地址有两种转发客户端请求到后端服务器的服务器选取计算⽅式，分别是取模法和⼀致性hash

#### 3.3.1.1 map-base取模法

```bash
map-based：取模法，基于服务器总权重的hash数组取模，该hash是静态的即不⽀持在线调整权重，不⽀持慢启动，其对后端服务器调度均衡，缺点是当服务器的总权重发⽣变化时，即有服务器上线或下线，都会因权重发⽣变化⽽导致调度结果整体改变。
所谓取模运算，就是计算两个数相除之后的余数，10%7=3, 7%4=3，基于权重取模：(2^32-1)%(1+1+2)，公式为，hash（o）mod n，即a mod b=c，表明a除以b余数为c。
```

##### 3.3.1.1.1 取模法示意图

![image-20210402153442278](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210402153442278.png)

##### 3.3.1.1.2 取模法配置示例

```bash
listen web_host_source
    bind 192.168.10.81:80
    mode http
    log global
    balance source
    server web1 192.168.10.82:80 weight 1 check inter 3000 fall 2 rise 5
    server web2 192.168.10.83:80 weight 1 check inter 3000 fall 2 rise 5
```

#### 3.3.1.2 一致性hash

⼀致性哈希，该hash是动态的，⽀持在线调整权重，⽀持慢启动，优点在于当服务器的总权重发⽣变化时，对调度结果影响是局部的，不会引起⼤的变动。

##### 3.3.1.2.1 hash对象

Hash对象到后端服务器的映射关系：

![image-20210402154357741](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210402154357741.png)

##### 3.3.1.2.2 ⼀致性hash示意图

后端服务器在线与离线的调度方式

![image-20210402154452214](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210402154452214.png)

##### 3.3.1.2.3 一致性hash配置示例

```bash
listen web_host_source_consistent
    bind 192.168.10.81:80
    mode http
    log global
    balance source
    server web1 192.168.10.82:80 weight 1 check inter 3000 fall 2 rise 5
    server web2 192.168.10.83:80 weight 1 check inter 3000 fall 2 rise 5
```

### 3.3.2 uri

基于对用户请求的uri做hash并将请求转发到后端指定服务器，也可以通过map-based和consistent定义使⽤取模法还是⼀致性hash。

```bash
http://example.org/absolute/URI/with/absolute/path/to/resource.txt  #URI/URL 
ftp://example.org/resource.txt        #URI/URL 
/relative/URI/with/absolute/path/to/resource.txt   #URI
```

#### 3.3.2.1 uri取模法配置示例

```bash
listen web_host_uri
    bind 192.168.10.81:80
    mode http
    log global
    balance uri 
    server web1 192.168.10.82:80 weight 1 check inter 3000 fall 2 rise 5
    server web2 192.168.10.83:80 weight 1 check inter 3000 fall 2 rise 5
```

#### 3.3.2.2 uri ⼀致性hash配置示例

```bash
listen web_host_uri_consistent
    bind 192.168.10.81:80
    mode http
    log global
    balance uri
    hash-type consistent
    server web1 192.168.10.82:80 weight 1 check inter 3000 fall 2 rise 5
    server web2 192.168.10.83:80 weight 1 check inter 3000 fall 2 rise 5
```

### 3.3.2.3 访问测试

访问不同的uri，确认可以将⽤⼾同样的请求转发至相同的服务器

```bash
[19:36:06 root@centos8 ~]#curl www.zhangzhuo.org/index.html
www.zhangzhuo.org web2 192.168.10.83
[19:37:21 root@centos8 ~]#curl www.zhangzhuo.org/index1.html
<h1>zhangzhuo 192.168.10.82</h1>
```

### 3.3.3 url_param

url_param对⽤⼾请求的url中的 params 部分中的参数name作hash计 算，并由服务器总权重相除以后派发⾄某挑出的服务器；通常⽤于追踪⽤ ⼾，以确保来⾃同⼀个用户的请求始终发往同⼀个real server

```bash
假设url = http://www.magedu.com/foo/bar/index.php?k1=v1&k2=v2
则：
host = "www.magedu.com"
url_param = "k1=v1&k2=v2"
```

#### 3.3.3.1 url_param取模法配置示例

```bash
listen web_host_usr_param
    bind 192.168.10.81:80
    mode http
    log global
    balance url_param name,age #⽀持对单个及多个url_param 值hash，这里写什么说明对什么做hash
    server web1 192.168.10.82:80 weight 1 check inter 3000 fall 2 rise 5
    server web2 192.168.10.83:80 weight 1 check inter 3000 fall 2 rise 5
```

#### 3.3.3.2 url_param⼀致性hash配置示例

```bash
listen web_host_usr_param
    bind 192.168.10.81:80
    mode http
    log global
    balance url_param name,age   #⽀持对单个及多个url_param 值hash
    hash-type consistent
    server web1 192.168.10.82:80 weight 1 check inter 3000 fall 2 rise 5
    server web2 192.168.10.83:80 weight 1 check inter 3000 fall 2 rise 5
```

#### 3.3.3.3 测试访问

```bash
[20:10:55 root@centos8 ~]#curl http://www.zhangzhuo.org/index.html?age=AGE
[20:11:18 root@centos8 ~]#curl http://www.zhangzhuo.org/index.html?name=NAME
[20:11:24 root@centos8 ~]#curl http://www.zhangzhuo.org/index.html?name=NAME&age=AGE
```

### 3.3.4 hdr

针对⽤⼾每个http头部(header)请求中的指定信息做hash，此处由 name 指定的http⾸部将会被取出并做hash计算，然后由服务器总权重相除以后 派发⾄某挑出的服务器，假如⽆有效的值，则会使⽤默认的轮询调度。

#### 3.3.4.1 hdr取模法配置是示例

```
listen web_host_hdr
    bind 192.168.10.81:80
    mode http
    log global
    balance hdr(User-Agent)
    server web1 192.168.10.82:80 weight 1 check inter 3000 fall 2 rise 5
    server web2 192.168.10.83:80 weight 1 check inter 3000 fall 2 rise 5
```

#### 3.3.4.2 ⼀致性hash配置示例

```bash
listen web_host_hdr
    bind 192.168.10.81:80
    mode http
    log global
    balance hdr(User-Agent)
    hash-type consistent
    server web1 192.168.10.82:80 weight 1 check inter 3000 fall 2 rise 5
    server web2 192.168.10.83:80 weight 1 check inter 3000 fall 2 rise 5
```

### 3.3.5 rdp-cookie

rdp-cookie可以实现对windows远程桌⾯的负载，如果有多个后端 windows Server服务器，rdp-cookie可以实现同⼀个window server的请 求始终被转发给同⼀个后端服务器，如果之前从未访问过，那么第⼀次使 ⽤连接roundrobin算法计算出⼀个后端服务器并进⾏转发。

http://cbonte.github.io/haproxy-dconv/2.2/configuration.html#persist%20rdp-cookie

https://www.loadbalancer.org/blog/load-balancing-windows-terminal-server-haproxy-and-rdp-cookies/

#### 3.3.5.1 rdp-cookie取模法配置⽰例

```
listen RDP
    bind 192.168.10.81:3389
    balance rdp-cookie
    mode tcp
    server rdp0 192.168.10.1:3389 check fall 3 rise 5 inter 2000 weight 1
```

#### 3.3.5.2 rdp-cookie⼀致性hash配置示例

```bash
listen RDP_1
    bind 192.168.10.81:3389
    mode tcp
    balance rdp-cookie
    persist rdp-cookie    #启⽤基于RDP cookie的持久连接，同⼀个cookie就转发给对应的服务器。
    tcp-request inspect-delay 5s     #设置内容检查期间等待数据的最⼤允许时间
    tcp-request content accept if RDP_COOKIE  E #匹配RDP_COOKIE存在就接受请求
    hash-type consistent
    server win-server 192.168.10.1:3389 check fall 3 rise 5 inter 2000 weight 1
```

### 3.3.6 random

在1.9版本开始增加⼀个叫做random的负载平衡算法，其基于⼀个随机数 作为⼀致性hash的key，随机负载平衡对于⼤型服务器场或经常添加或删除服务器⾮常有⽤。

#### 3.3.6.1 random配置实例

```bash
listen web_host_random
    bind 192.168.10.81:80
    mode http
    log global
    balance random
    server web1 192.168.10.82:80 weight 2 check inter 3000 fall 2 rise 5
    server web2 192.168.10.83:80 weight 1 check inter 3000 fall 2 rise 5
```

### 3.3.7 算法总结

```bash
static-rr--------->tcp/http 静态
first------------->tcp/http 静态

roundrobin-------->tcp/http 动态
leastconn--------->tcp/http 动态
random------------>tcp/http 动态

source------------>tcp/http
Uri--------------->http
url_param--------->http 取决于hash_type是否consistent
hdr--------------->http
rdp-cookie-------->tcp
```

### 3.3.8 各算法使用场景

```bash
first #使⽤较少

static-rr #做了session共享的web集群
roundrobin
random

leastconn #数据库
source #基于客⼾端公⽹IP的会话保持

Uri--------------->http #缓存服务器，CDN服务商，蓝汛、百度、阿⾥云、腾讯
url_param--------->http

hdr #基于客⼾端请求报⽂头部做下⼀步处理
rdp-cookie #很少使⽤
```

### 3.3.9 layer 4与layer 7

四层：IP+PORT转发

七层：协议+内容交换

![image-20210403134919602](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210403134919602.png)

#### 3.3.9.1 四层负载

在四层负载设备中，把client发送的报⽂⽬标地址(原来是负载均衡设备的 IP地址)，根据均衡设备设置的选择web服务器的规则选择对应的web服务器IP地址，这样client就可以直接跟此服务器建⽴TCP连接并发送数据。

#### 3.3.9.2 七层代理

七层负载均衡服务器起了⼀个反向代理服务器的作⽤，服务器建⽴⼀次 TCP连接要三次握⼿，⽽client要访问webserver要先与七层负载设备进⾏ 三次握⼿后建⽴TCP连接，把要访问的报⽂信息发送给七层负载均衡；然后 七层负载均衡再根据设置的均衡规则选择特定的webserver，然后通过三次 握⼿与此台webserver建⽴TCP连接，然后webserver把需要的数据发送给 七层负载均衡设备，负载均衡设备再把数据发送给client；所以，七层负载均衡设备起到了代理服务器的作⽤。

## 3.4 IP透传

web服务器中需要记录客⼾端的真实IP地址，⽤于做访问统计、安全防护、 ⾏为分析、区域排⾏等场景。

### 3.4.1 四层IP透传

https://www.haproxy.com/de/blog/using-haproxy-with-the-proxy-protocol-to-better-secure-your-database/

```bash
haproxy 配置：
listen web_prot_http_nodes
	bind 192.168.7.101:80
	mode tcp
	balance roundrobin
	server web1 blogs.studylinux.net:80 send-proxy check inter 3000 fall 3 rise 5
nginx配置：
	server {
		listen 80 proxy_protocol;
		#listen 80;
		server_name blogs.studylinux.net;
......
```

### 3.4.2 七层IP透传

当haproxy⼯作在七层的时候，如何透传客⼾端真实IP⾄后端服务器

#### 3.4.2.1 HAProxy配置

```bash
haproxy 配置：
defaults
option forwardfor
或者：
option forwardfor header X-Forwarded-xxx #⾃定义传递IP参数,后端web服务器写X-Forwarded-xxx，如果写option forwardfor则后端服务器web格式为X-Forwarded-For

listen配置：
listen web_host
	bind 192.168.7.101:80
	mode http
	log global
	balance random
	server web1 192.168.7.103:80 weight 1 check inter 3000 fall 2 rise 5
	server web2 192.168.7.104:80 weight 1 check inter 3000 fall 2 rise 5
```

#### 3.4.2.2 web服务器⽇志格式配置

配置web服务器，记录负载均衡透传的客⼾端IP地址

```bash
#apache 配置：
LogFormat "%{X-Forwarded-For}i %a %l %u %t \"%r\" %>s %b\"%{Referer}i\" \"%{User-Agent}i\"" combined

#tomcat 配置：
pattern='%{X-Forwarded-For}i %l %T %t &quot;%r&quot; %s %b &quot;%{User-Agent}i&quot;'/>
#nginx ⽇志格式：
log_format main '"$http_x_forwarded_For" - $remote_user [$time_local] "$request" '
'$status $body_bytes_sent
"$http_referer" '
'"$http_user_agent" ';
```

# 四、高级功能及配置

介绍HAProxy⾼级配置及实⽤案例

## 4.1 基于cookie的会话保持

cookie value：为当前server指定cookie值，实现基于cookie的会话黏性

### 4.1.1 配置选项

```bash
cookie name [ rewrite | insert | prefix ][ indirect ] [nocache ][ postonly ] [ preserve ][ httponly ] [ secure ][ domain ]* [ maxidle <idle> ][ maxlife ]
name：cookie 的key名称，⽤于实现持久连接
insert： #如果客⼾端请求报⽂没有cookie就插⼊新的cookie到响应报⽂，如第⼀次访问HAProxy
indirect： #不会向客⼾端发送服务器已经处理过请求的cookie信息，⽐如后端服务器宕机后HAProxy将客⼾端请求强制转发⾄real server则会涉及修改cookie，不建议配置
nocache：#当client和hapoxy之间有缓存时，haproxy不缓存客⼾端cookie，因为客⼾端浏览器会缓存cookie并携带cookie访问haproxy
```

### 4.1.2 配置示例

```bash
listen web_host
    bind 192.168.10.81:80
    mode http
    log global
    balance roundrobin
    cookie SERVER-COOKIE insert indirect nocache
    server web1 192.168.10.82:80 cookie web1 check inter 3000 fall 2 rise 5
    server web2 192.168.10.83:80 cookie web2 check inter 3000 fall 2 rise 5
```

### 4.1.3 验证cookie信息

浏览器验证

![image-20210404131155556](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210404131155556.png)

通过命令行验证：

```bash
[13:10:58 root@centos8 ~]#curl --cookie "SERVER-COOKIE=web1" www.zhangzhuo.org
www.zhangzhuo.org web1 192.168.10.82
[13:12:47 root@centos8 ~]#curl --cookie "SERVER-COOKIE=web2" www.zhangzhuo.org
www.zhangzhuo.org web2 192.168.10.83
```

## 4.2 HAProxy状态页

通过web界⾯，显⽰当前HAProxy的运⾏状态。

### 4.2.1 状态页配置项

```bash
stats enable          #基于默认的参数启⽤stats page
stats hide-version    #隐藏版本
stats refresh <delay> #设定⾃动刷新时间间隔
stats uri <prefix>    #⾃定义stats page uri，默认值：/haproxy?stats
stats realm <realm>   #账⼾认证时的提⽰信息，⽰例：stats realm :HAProxy\ Statistics
stats auth <user>:<passwd>  #认证时的账号和密码，可使⽤多次，默认：no authentication
stats admin { if | unless } <cond> #启⽤stats page中的管理功能
```

### 4.2.2 启⽤状态页

```bash
listen stats
	mode http
	bind 0.0.0.0:9999
	stats enable      
	log global
    stats hide-version 
	stats uri /haproxy-status
	stats auth haadmin:123456
    stats refresh 5s
    stats admin if TRUE
```

### 4.2.3 登录状态页

```bash
pid = 3698 (process #2, nbproc = 2, nbthread = 1) #pid为当前pid号，process为当前进程号，nbproc和nbthread为⼀共多少进程和每个进程多少个线程
uptime = 0d 0h00m08s #启动了多⻓时间
system limits: memmax = unlimited; ulimit-n = 131124 #系统资源限制：内存/最⼤打开⽂件数/	
maxsock = 131124; maxconn = 65536; maxpipes = 0  #最⼤socket连接数/单进程最⼤连接数/最⼤管道数maxpipes
current conns = 1; current pipes = 0/0; conn rate = 1/sec #当前连接数/当前管道数/当前连接速率
Running tasks: 1/9; idle = 100 % #运⾏的任务/当前空闲率
active UP： #在线服务器
backup UP： #标记为backup的服务器
active UP, going down：#监测未通过正在进⼊down过程
backup UP, going down：#备份服务器正在进⼊down过程
active DOWN, going up：#down的服务器正在进⼊up过程
backup DOWN, going up：#备份服务器正在进⼊up过程
active or backup DOWN：#在线的服务器或者是backup的服务器已经转换成了down状态
not checked：#标记为不监测的服务器
active or backup DOWN for maintenance (MAINT) #active或者backup服务器⼈为下线的
active or backup SOFT STOPPED for maintenance #active或者backup被⼈为软下线(⼈为将weight改成0)
```

### 4.2.4 backend server信息

| session rate(每秒的连接会话信息)：  | Errors(错误统计信息)：             |
| ----------------------------------- | ---------------------------------- |
| cur:每秒的当前会话数量              | Req:错误请求量                     |
| max:每秒新的最⼤会话数量            | conn:错误链接量                    |
| limit:每秒新的会话限制量            | Resp:错误响应量                    |
| sessions(会话信息)：                | Warnings(警告统计信息)：           |
| cur:当前会话量                      | Retr:重新尝试次数                  |
| max:最⼤会话量                      | Redis:再次发送次数                 |
| limit: 限制会话量                   |                                    |
| Total:总共会话量                    | Server(real server信息)：          |
| LBTot:选中⼀台服务器所⽤的总时间    | Status:后端机的状态，包括UP和 DOWN |
| Last：和服务器的持续连接时间        | LastChk:持续检查后端服务器的时间   |
| Wght:权重                           |                                    |
| Bytes(流量统计)：                   | Act:活动链接数量                   |
| In:⽹络的字节输⼊总量               | Bck:备份的服务器数量               |
| Out:⽹络的字节输出总量              | Chk:⼼跳检测时间                   |
| Dwn:后端服务器连接后都是 DOWN的数量 |                                    |
| Denied(拒绝统计信息)：              | Dwntme:总的downtime时间            |
| Req:拒绝请求量                      | Thrtle:server 状态                 |
| Resp:拒绝回复量                     |                                    |

## 4.3 报文修改

在http模式下，基于实际需求修改客⼾端的请求报⽂与响应报⽂，通过 reqadd和reqdel在请求报⽂添加删除字段，通过rspadd与rspidel在响应报⽂中添加与删除字段。

```bash
#在请求报⽂尾部添加指定⾸部
reqadd <string> [{if | unless} <cond>]

#从请求报⽂中删除匹配正则表达式的⾸部
reqdel <search> [{if | unless} <cond>]
reqidel <search> [{if | unless} <cond>]

#在响应报⽂尾部添加指定⾸部
rspadd <string> [{if | unless} <cond>]
⽰例：
rspadd X-Via:\ HAPorxy

#从响应报⽂中删除匹配正则表达式的⾸部
rspidel <search> [{if | unless} <cond>]
rspidel <search> [{if | unless} <cond>]
⽰例：
rspidel server.* #从响应报⽂删除server信息
rspidel X-Powered-By:.* #从响应报⽂删除X-Powered-By信息
```

**示例：删除响应报文中server部分不显示服务端名称**

```bash
listen web_host_cookie
    bind 192.168.10.81:80
    mode http
    log global
    #rspadd Server:\ AWS  #这是添加，用来迷惑
    rspidel  ^Server:.*   #这个是删除
    balance roundrobin
    cookie SERVER-COOKIE insert indirect nocache
    server web1 192.168.10.82:80 cookie web1 check inter 3000 fall 2 rise 5
    server web2 192.168.10.83:80 cookie web2 check inter 3000 fall 2 rise 5
```

## 4.4 HAProxy日志配置

配置HAProxy记录⽇志到指定⽇志⽂件中

### 4.4.1 HAProxy配置

```bash
#在global配置项定义：
log 127.0.0.1 local{1-7} info  #基于syslog记录⽇志到指定设备，级别有(err、warning、info、debug)

#listen中引用
listen web_host_cookie
    bind 192.168.10.81:80
    mode http
    log global
    #rspadd Server:\ AWS
    rspidel  ^Server:.*
    balance roundrobin
    cookie SERVER-COOKIE insert indirect nocache
    server web1 192.168.10.82:80 cookie web1 check inter 3000 fall 2 rise 5
    server web2 192.168.10.83:80 cookie web2 check inter 3000 fall 2 rise 5
```

### 4.4.2 Rsyslog配置

```bash
module(load="imudp") # needs to be done just once，开打rsyslog的udp协议
local3.* /var/log/haproxy.log   #添加这行
[13:44:10 root@centos8 ~]#systemctl restart rsyslog.service
```

### 4.4.3 验证HAProxy日志

重启syslog服务并访问app⻚⾯，然后验证是否⽣成⽇志

```bash
[13:44:42 root@centos8 ~]#tail -f /var/log/haproxy.log 
Apr  4 13:42:35 localhost haproxy[1436]: Connect from 192.168.10.1:51876 to 192.168.10.81:80 (web_host_cookie/HTTP)
Apr  4 13:44:54 localhost haproxy[1436]: Connect from 192.168.10.1:51963 to 192.168.10.81:80 (web_host_cookie/HTTP)
Apr  4 13:44:54 localhost haproxy[1436]: Connect from 192.168.10.1:51876 to 192.168.10.81:80 (web_host_cookie/HTTP)
```

## 4.5 自定义日志格式

将特定信息记录在⽇志中

### 4.5.1 配置选项

```bash
capture cookie <name> len <length>         #捕获请求和响应报⽂中的cookie并记录⽇志
capture request header <name> len <length> #捕获请求报⽂中指定的⾸部内容和⻓度并记录⽇志
capture response header <name> len <length> #捕获响应报⽂中指定的内容和⻓度⾸部并记录⽇志
⽰例：
capture request header Host len 256
capture request header User-Agent len 512
capture request header Referer len 15
```

### 4.5.2 配置示例

```bash
listen web_host_cookie
    bind 192.168.10.81:80
    mode http
    log global
    rspidel  ^Server:.*
    balance roundrobin
    option httplog
    capture request header X-Forwarded-For len 15
    capture request header User-Agent len 512
    cookie SERVER-COOKIE insert indirect nocache
    server web1 192.168.10.82:80 cookie web1 check inter 3000 fall 2 rise 5
    server web2 192.168.10.83:80 cookie web2 check inter 3000 fall 2 rise 5
```

### 4.5.3 验证日志格式

```bash
[13:52:02 root@centos8 ~]#tail -f -n 0 /var/log/haproxy.log 
Apr  4 13:52:07 localhost haproxy[1645]: 192.168.10.1:52157 [04/Apr/2021:13:52:07.803] web_host_cookie web_host_cookie/web1 0/0/0/0/0 304 159 - - --VN 1/1/0/0/0 0/0 {|Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.90 Safari/537.36 Edg/89.0.774.63} "GET /index1.html HTTP/1.1"
```

## 4.6 压缩功能

对响应给客⼾端的报⽂进⾏压缩，以节省⽹络带宽，但是会占⽤部分CPU 性能。

### 4.6.1 配置选项

```bash
compression algo #启⽤http协议中的压缩机制，常⽤算法有gzip deflate
	identity         #调试使⽤的压缩⽅式
	gzip             #常⽤的压缩⽅式，与各浏览器兼容较好
	deflate          #有些浏览器不⽀持
	raw-deflate      #新出的压缩⽅式
compression type #要压缩的⽂件类型
```

### 4.6.2 配置示例

```bash
listen web_host_zip
    bind 192.168.10.81:80
    mode http
    log global
    rspidel  ^Server:.*
    balance roundrobin
    compression algo gzip deflate   #开启压缩，算法gzip
    compression type compression type text/plain text/html text/css text/xml text/javascript application/javascript #要压缩的文件类型
    cookie SERVER-COOKIE insert indirect nocache
    server web1 192.168.10.82:80 cookie web1 check inter 3000 fall 2 rise 5
    server web2 192.168.10.83:80 cookie web2 check inter 3000 fall 2 rise 5
```

### 4.6.3 验证压缩功能

![image-20210404135850352](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210404135850352.png)

## 4.7 web服务器状态监测

基于不同的监测⽅式，对后端real server进⾏状态监测

```bash
option httpchk
option httpchk <uri>
option httpchk <method> <uri>
option httpchk <method> <uri> <version>
```

### 4.7.1 三种状态监测方式

```bash
基于四层的传输端⼝做状态监测
基于指定URI 做状态监测
基于指定URI的request请求头部内容做状态监测
```

### 4.7.2 配置示例

```bash
listen web_host_zip
    bind 192.168.10.81:80
    mode http
    log global
    rspidel  ^Server:.*
    balance roundrobin
    option httpchk GET /index333.html HTTP/1.0  #以页面是否能获取到作为监控条件
    compression algo gzip deflate
    compression type compression type text/plain text/html text/css text/xml text/javascript application/javascript
    cookie SERVER-COOKIE insert indirect nocache
    server web1 192.168.10.82:80 cookie web1 check inter 3000 fall 2 rise 5
    server web2 192.168.10.83:80 cookie web2 check inter 3000 fall 2 rise 5
```

## 4.8 ACL

访问控制列表（ACL，Access Control Lists）是⼀种基于包过滤的访问控 制技术，它可以根据设定的条件对经过服务器传输的数据包进⾏过滤(条件匹配)，即对接收到的报⽂进⾏匹配和过滤，基于请求报⽂头部中的源地 址、源端⼝、⽬标地址、⽬标端⼝、请求⽅法、URL、⽂件后缀等信息内容 进⾏匹配并执⾏进⼀步操作，⽐如允许其通过或丢弃。

```bash
http://cbonte.github.io/haproxy-dconv/2.0/configuration.html#7
```

### 4.8.1 ACL配置选项

```bash
acl   <aclname>   <criterion>  [flags]   [operator]    [<value>]
acl    名称         匹配规范     匹配模式    具体操作符    操作对象类型
```

#### 4.8.1.1 ACL-Name

```bash
acl image_service hdr_dom(host) -i img.magedu.com

#ACL名称，可以使⽤⼤字⺟A-Z、⼩写字⺟a-z、数字0-9、冒号：、点.、中横线和下划线，并且严格区分⼤⼩写，⽐如Image_site和image_site就是两个完全不同的acl。
```

#### 4.8.1.2 ACL-criterion

定义ACL匹配规范

```bash
hdr（[<name> [，<occ>]]）：#完全匹配字符串,header的指定信息
hdr_beg（[<name> [，<occ>]]）：#前缀匹配，header中指定匹配内容的begin
hdr_end（[<name> [，<occ>]]）：#后缀匹配，header中指定匹配内容end
hdr_dom（[<name> [，<occ>]]）：#域匹配，header中的domain name
hdr_dir（[<name> [，<occ>]]）：#路径匹配，header的uri路径
hdr_len（[<name> [，<occ>]]）：#⻓度匹配，header的⻓度匹配
hdr_reg（[<name> [，<occ>]]）：#正则表达式匹配，⾃定义表达式(regex)模糊匹配
hdr_sub（[<name> [，<occ>]]）：#⼦串匹配，header中的uri模糊匹配

dst       #⽬标IP
dst_port  #⽬标PORT
src       #源IP
src_port  #源PORT

⽰例：
⽰例：
hdr(<string>) #⽤于测试请求头部⾸部指定内容
hdr_dom(host) #请求的host名称，如 www.magedu.com
hdr_beg(host) #请求的host开头，如 www. img. video.download. ftp.
hdr_end(host) #请求的host结尾，如 .com .net .cn
path_beg #请求的URL开头，如/static、/images、/img、/css
path_end #请求的URL中资源的结尾，如 .gif .png .css .js .jpg .jpeg

#有些功能是类似的，⽐如以下⼏个都是匹配⽤⼾请求报⽂中host的开头是不是www：
acl short_form hdr_beg(host) www.
acl alternate1 hdr_beg(host) -m beg www.
acl alternate2 hdr_dom(host) -m beg www.
acl alternate3 hdr(host) -m beg www.
```

#### 4.8.1.3 ACL-flags

ACL匹配模式

```bash
-i 不区分⼤⼩写
-m 使⽤指定的pattern匹配⽅法
-n 不做DNS解析
-u 禁⽌acl重名，否则多个同名ACL匹配或关系
```

#### 4.8.1.4 ACL-operator

ACL 操作符

```bash
整数⽐较：eq、ge、gt、le、lt

字符⽐较：
- exact match (-m str)      :字符串必须完全匹配模式
- substring match (-m sub)  :在提取的字符串中查找模式，如果其中任何⼀个被发现，ACL将匹配
- prefix match (-m beg)     :在提取的字符串⾸部中查找模式，如果其中任何⼀个被发现，ACL将匹配
- suffix match (-m end)     :将模式与提取字符串的尾部进⾏⽐较，如果其中任何⼀个匹配，则ACL进⾏匹配
- subdir match (-m dir)     :查看提取出来的⽤斜线分隔（“/”）的字符串，如果其中任何⼀个匹配，则ACL进⾏匹配
- domain match (-m dom)     :查找提取的⽤点（“.”）分隔字符串，如果其中任何⼀个匹配，则ACL进⾏匹配
```

#### 4.8.1.5 ACL-value

value的类型

```bash
- Boolean #布尔值
- integer or integer range #整数或整数范围，⽐如⽤于匹配端⼝范围
- IP address / network #IP地址或IP范围, 192.168.0.1,192.168.0.1/24
- string--> www.magedu.com
exact –精确⽐较
substring—⼦串
suffix-后缀⽐较
prefix-前缀⽐较
subdir-路径， /wp-includes/js/jquery/jquery.js
domain-域名，www.magedu.com
- regular expression #正则表达式
- hex block #16进制
```

### 4.8.2 ACL调用方式

```bash
- 与：隐式（默认）使⽤
- 或：使⽤“or” 或 “||”表⽰
- 否定：使⽤“!“ 表⽰

⽰例：
if valid_src valid_port #与关系,A和B都要满⾜为true
if invalid_src || invalid_port #或，A或者B满⾜⼀个为true
if ! invalid_src #⾮，取反，A和B哪个也不满⾜为true
```

### 4.8.3 ACL示例-域名匹配

```bash
listen web_host
    bind 192.168.10.81:80
    mode http
    balance roundrobin
    log global
    option httplog
    acl web_host hdr_dom(host) www.zhangzhuo.org 
    use_backend zhangzhuo_host if web_host 
    default_backend default_web

backend zhangzhuo_host
    mode http
    server web1 192.168.10.82:80 check inter 2000 fall 3 rise 5
backend default_web
    mode http
    server web2 192.168.10.83:80 check inter 2000 fall 3 rise 5
#如果请求头host是www.zhangzhuo.org转发到zhangzhuo_host,其他转发到default_web
```

### 4.8.4 ACL示例-基于源IP或子网调度访问

将指定的源地址调度⾄指定的web服务器组。

```bash
listen web_host
    bind 192.168.10.81:80
    mode http
    balance roundrobin
    log global
    option httplog
    acl ip_range_test src 172.16.0.0/16 192.168.10.1
    use_backend zhangzhuo_host if ip_range_test
    default_backend default_web
backend zhangzhuo_host
    mode http
    server web1 192.168.10.82:80 check inter 2000 fall 3 rise 5
backend default_web
    mode http
    server web2 192.168.10.83:80 check inter 2000 fall 3 rise 5
```

### 4.8.5 ACL示例-基于源地址的访问控制

拒绝指定IP或者IP范围访问

```bash
listen web_host
    bind 192.168.10.81:80
    mode http
    balance roundrobin
    log global
    option httplog
    acl block_test src 192.168.10.1 172.16.0.0/16
    block if block_test
    default_backend default_web
backend zhangzhuo_host
    mode http
    server web1 192.168.10.82:80 check inter 2000 fall 3 rise 5
backend default_web
    mode http
    server web2 192.168.10.83:80 check inter 2000 fall 3 rise 5
```

### 4.8.6 ACL示例-匹配浏览器类型

```bash
listen web_host
    bind 192.168.10.81:80
    mode http
    balance roundrobin
    log global
    option httplog
    acl web_host hdr_dom(host) www.zhangzhuo.org
    use_backend zhangzhuo_host if web_host
    acl redirect_test hdr(User-Agent) -m sub -i "Firefox"
    redirect prefix http://192.168.10.82 if redirect_test    #这个表示重定向
    default_backend default_web
backend zhangzhuo_host
    mode http
    server web1 192.168.10.82:80 check inter 2000 fall 3 rise 5
backend default_web
    mode http
    server web2 192.168.10.83:80 check inter 2000 fall 3 rise 5
```

### 4.8.7 ACL示例-基于文件后缀名实现动静分离

```bash
listen web_host
    bind 192.168.10.81:80
    mode http
    balance roundrobin
    log global
    option httplog
    acl php_server path_end -i .php
    use_backend php_server_host if php_server
    acl images_server path_end -i .jpg .png .jpeg .gif
    use_backend images_server_host if images_server
    default_backend default_web
backend php_server_host
    mode http
    server web1 192.168.10.82:80 check inter 2000 fall 3 rise 5
backend images_server_host
    mode http
    server web2 192.168.10.83:80 check inter 2000 fall 3 rise 5
backend default_web
    mode http
    server web2 192.168.10.83:80 check inter 2000 fall 3 rise 5
```

### 4.8.8 ACL-匹配访问路径实现动静分离

```bash
listen web_host
    bind 192.168.10.81:80
    mode http
    balance roundrobin
    log global
    option httplog
    acl static_path path_beg -i /static /images /javascript
    use_backend static_path_host if static_path
    default_backend default_web
backend static_path_host
    mode http
    server web1 192.168.10.82:80 check inter 2000 fall 3 rise 5
backend default_web
    mode http
    server web2 192.168.10.83:80 check inter 2000 fall 3 rise 5
```

### 4.8.9 ACL示例-基于ACL的HTTP访问控制

```bash
listen web_host
    bind 192.168.10.81:80
    mode http
    balance roundrobin
    log global
    option httplog
    acl static_path path_beg -i /static /images /javascript
    use_backend static_path_host if static_path
    acl badguy_deny src 192.168.10.1
    http-request deny if badguy_deny
    http-request allow
    default_backend default_web
backend static_path_host
    mode http
    server web1 192.168.10.82:80 check inter 2000 fall 3 rise 5
backend default_web
    mode http
    server web2 192.168.10.83:80 check inter 2000 fall 3 rise 5
```

### 4.8.10 ACL示例-预定义ACL使用

http://cbonte.github.io/haproxy-dconv/2.0/configuration.html#7.4

#### 4.8.10.1 预定义ACL

```bash
listen web_host                                                                     
    bind 192.168.10.81:80
    mode http
    balance roundrobin
    log global
    option httplog
    acl static_path path_beg -i /static /images /javascript
    use_backend static_path_host if  HTTP_1.1 TRUE static_path
    default_backend default_web
backend static_path_host
    mode http
    server web1 192.168.10.82:80 check inter 2000 fall 3 rise 5
backend default_web
    mode http
    server web2 192.168.10.83:80 check inter 2000 fall 3 rise 5
```

## 4.9 自定义HAProxy错误界面

对指定的报错进⾏重定向，进⾏优雅的显⽰错误⻚⾯

### 4.9.1 基于错误页面文件

```bash
defaults
    errorfile 500 /usr/local/haproxy/html/500.html
    errorfile 502 /usr/local/haproxy/html/500.html
    errorfile 503 /usr/local/haproxy/html/500.html 
#在准备错误页面
[17:02:47 root@centos8 ~]#cat /usr/local/haproxy/html/500.html 
HTTP/1.1 503 Service Unavailable
Content-Type:text/html;charset=utf-8

<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>error</title>
</head>
<body>
<h1>维护中</h1>
<h2>404 请联系总部:18600000000</h2>
</body>
</html>
```

### 4.9.2 基于http重定向

```bash
defaults
    errorloc 503 http://192.168.10.83/error.html
```

## 4.10 HAProxy四层负载

### 4.10.1 四层负载示例

```
listen redis-port
	bind 192.168.7.102:6379
	mode tcp
	balance leastconn
	server server1 192.168.7.104:6379 check
	server server1 192.168.7.103:6379 check backup
```

## 4.11 HAProxy https实现

```
配置HAProxy⽀持https协议：
⽀持ssl会话；
	bind *:443 ssl crt /PATH/TO/SOME_PEM_FILE
	crt 后证书⽂件为PEM格式，且同时包含证书和所有私钥
	cat demo.crt demo.key > demo.pem
把80端⼝的请求重向定443
	bind *:80
	redirect scheme https if !{ ssl_fc }
向后端传递⽤⼾请求的协议和端⼝（frontend或backend）
	http_request set-header X-Forwarded-Port %[dst_port]
	http_request add-header X-Forwared-Proto https if { ssl_fc }
```

### 4.11.1 证书制作

```bash
[17:13:41 root@centos8 ~]#mkdir /usr/local/haproxy/certs
[17:13:45 root@centos8 ~]#cd /usr/local/haproxy/certs
[17:13:49 root@centos8 certs]#openssl genrsa -out haproxy.key 2048
[17:13:56 root@centos8 certs]#openssl req -new -x509 -key haproxy.key -out haproxy.crt -subj "/CN=www.zhangzhuo.org"
[17:14:23 root@centos8 certs]#ls
haproxy.crt  haproxy.key
[17:14:27 root@centos8 certs]#cat haproxy.key haproxy.crt > haproxy.pem
[17:14:36 root@centos8 certs]#openssl x509 -in haproxy.pem -noout -text
```

### 4.11.2 https配置示例

```bash
frontend web_server-http
    bind 192.168.10.81:80
    redirect scheme https if ! { ssl_fc }
    mode http
    use_backend web_host
frontend web_server-https
    bind 192.168.10.81:443 ssl crt /usr/local/haproxy/certs/haproxy.pem
    mode http
    use_backend web_host

backend default_host
    mode http
    server web1 192.168.10.82:80 check inter 2000 fall 3 rise 5

backend web_host
    mode http
    http-request set-header X-Forwarded-Port %[dst_port]
    http-request add-header X-Forwarded-Proto https if { ssl_fc }
    server web1 192.168.10.82:80 check inter 2000 fall 3 rise 5
    server web2 192.168.10.83:80 check inter 2000 fall 3 rise 5
```

---
title: "消息队列与微服务"
date: 2021-05-25T20:29:06+08:00
draft: false
description: "从消息队列概念出发，介绍 RabbitMQ 的部署与使用，并延伸到微服务通信。"
cover: "https://b3logfile.com/bing/20200120.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["应用服务"]
tags: ["RabbitMQ", "ZooKeeper", "kafka", "Dubbo"]
toc: true
---
# 一、MQ(Message queuing）

Message Queue 的需求由来已久，在 19 世纪 80 年代金融交易中，美国高盛等公司采用Teknekron 公司的产品，当时的 Message queuing 软件叫做(the information bus（TIB），后来TIB被电信和通讯等公司采用，然后路透社收购了Teknekron 公司，再然后IBM公司开发了MQSeries，并且微软也开发了 Microsoft Message Queue（MSMQ），但是这些商业 MQ 供应商的问题是厂商锁定及使用价格高昂， 于是 2001 年，Java Message queuing 试图解决锁定和交互性的问题，但对应用来说反而更加麻烦了，于是 2004 年，摩根大通和 iMatrix 开始着手 Advanced Message Queuing Protocol （AMQP）开放标准的开发，2006 年，AMQP 规范发布，2007 年，Rabbit 技术公司基于 AMQP 标准开发的 RabbitMQ 1.0 发布。

**MQ 定义**

消息队列的目的是为了实现各个 APP 之间的通讯，APP 基于 MQ 实现消息的发送和接收实现应用程序之间的通讯，这样多个应用程序可以运行在不同的主机上， 通过 MQ 就可以实现夸网络通信，因此 MQ 实现了业务的解耦和异步机制

**MQ使用场合**

消息队列作为高并发系统的核心组件之一，能够帮助业务系统结构提升开发效率和系统稳定性，消息队列主要具有以下特点

```bash
削峰填谷（主要解决瞬时写压力大于应用服务能力导致消息丢失、系统奔溃等问题）
系统解耦（解决不同重要程度、不同能力级别系统之间依赖导致一死全死）
提升性能（当存在一对多调用时，可以发一条消息给消息系统，让消息系统通知相关系统）
蓄流压测（线上有些链路不好压测，可以通过堆积一定量消息再放开来压测）
```

**MQ 分类**

目前主流的消息队列软件有 RabbitMQ、kafka、ActiveMQ、RocketMQ 等，还有小众的消息队列软件如 ZeroMQ、Apache Qpid等。

# 二、RabbitMQ

官方网站：https://www.rabbitmq.com/

## 2.1 RabbitMQ 简介

RabbitMQ 采用 Erlang 语言开发，Erlang 语言由 Ericson 设计，Erlang 在分布式编程和故障恢复方面表现出色，电信领域被广泛使用。

Erlang官方：https://www.erlang.org/

![image-20210521192445155](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210521192445155.png)

**Broker**: 接收和分发消息的应用，RabbitMQ Server 就是 Message Broker。

**Virtual host**: 出于多租户和安全因素设计的，把 AMQP 的基本组件划分到一个虚拟的分组中，类似于网络中的 namespace 概念，当多个不同的用户使用同一个 RabbitMQ server 提供的服务时，可以划分出多个 vhost，每个用户在自己的 vhost 创建 exchange／queue 等。

**Connection**: publisher／consumer 和 broker 之间的 TCP 连接。

**Channel**: 如果每一次访问 RabbitMQ 都建立一个 Connection，在消息量大的时候 建立 TCP Connection 的开销将是巨大的，效率也较低。Channel 是在 connection 内部建立的逻辑连接，如果应用程序支持多线程，通常每个 thread 创建单独的 channel 进行通讯，AMQP method 包含了 channel id 帮助客户端和 message broker 识别 channel，所以 channel 之间是完全隔离的。Channel 作为轻量级的 Connectio极大减少了操作系统建立 TCP connection 的开销。

**Exchange**: message 到达 broker 的第一站，根据分发规则，匹配查询表中的 routing key，分发消息到 queue 中去。常用的类型有：direct (point-to-point), topic (publish-subscribe) and fanout (multicast)。

**Queue**: 消息最终被送到这里等待 consumer 取走。

**Binding**: exchange 和 queue 之间的虚拟连接，binding 中可以包含 routing key。 Binding 信息被保存到 exchange 中的查询表中，用于 message 的分发依据。

**rabbitmq 优势**

```bash
基于 erlang 语言开发，具有高并发优点、支持分布式
具有消息确认机制、消息持久化机制，消息可靠性和集群可靠性高
简单易用、运行稳定、跨平台、多语言
开源
```

**Queue 的特性**

```bash
消息基于先进先出的原则进行顺序消费
消息可以持久化到磁盘节点服务器
消息可以缓存到内存节点服务器提高性能
```

## 2.2 RabbitMQ 中的生产者消费者示例

![image-20210521192934937](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210521192934937.png)

```bash
生产者发送消息到 broker server（RabbitMQ），在 Broker 内部，用户创建 Exchange／Queue，通过 Binding 规则将两者联系在一起，Exchange 分发消息，根据类型／binding 的不同分发策略有区别，消息最后来到 Queue 中，等待消费者取走。
```

## 2.3 RabbitMQ 单机部署

官方下载地址：https://www.rabbitmq.com/download.html

github下载地址：https://github.com/rabbitmq/rabbitmq-server/releases

### 2.3.1 Ubuntu 1804 安装单机版RabbitMQ

ubuntu安装教程：https://www.rabbitmq.com/install-debian.html

**主机名解析**

```bash
[19:35:39 root@mq1 ~]#cat /etc/hosts
192.168.10.181 mq1 mq1.zhangzhuo.or
```

#### 2.3.1.1 **服务器安装 RabbitMQ**

```bash
#安装基础软件及添加key
[19:38:13 root@mq1 ~]#sudo apt-get install curl gnupg debian-keyring debian-archive-keyring apt-transport-https -y
[19:39:53 root@mq1 ~]#sudo apt-key adv --keyserver "hkps://keys.openpgp.org" --recv-keys "0x0A9AF2115F4687BD29803A206B73A36E6026DFCA"
[19:40:22 root@mq1 ~]#sudo apt-key adv --keyserver "keyserver.ubuntu.com" --recv-keys "F77F1EDA57EBB1CC"
[19:40:49 root@mq1 ~]#curl -1sLf 'https://packagecloud.io/rabbitmq/rabbitmq-server/gpgkey' | sudo apt-key add -

#添加源
[19:40:49 root@mq1 ~]#sudo tee /etc/apt/sources.list.d/rabbitmq.list <<EOF
deb http://ppa.launchpad.net/rabbitmq/rabbitmq-erlang/ubuntu bionic main
deb-src http://ppa.launchpad.net/rabbitmq/rabbitmq-erlang/ubuntu bionic main
deb https://packagecloud.io/rabbitmq/rabbitmq-server/ubuntu/ bionic main
deb-src https://packagecloud.io/rabbitmq/rabbitmq-server/ubuntu/ bionic main
EOF

#更新源
[19:42:37 root@mq1 ~]#sudo apt-get update -y

#安装Erlang packages
[19:42:37 root@mq1 ~]#sudo apt-get install -y erlang-base \
erlang-asn1 erlang-crypto erlang-eldap erlang-ftp erlang-inets \
erlang-mnesia erlang-os-mon erlang-parsetools erlang-public-key \
erlang-runtime-tools erlang-snmp erlang-ssl \
erlang-syntax-tools erlang-tftp erlang-tools erlang-xmerl

#安装rabbitmq-server
[19:46:53 root@mq1 ~]#sudo apt-get install rabbitmq-server -y --fix-missing
```

#### 2.3.1.2 **启动 RabbitMQ 服务**

```bash
[19:47:39 root@mq1 ~]#systemctl start rabbitmq-server
[19:48:12 root@mq1 ~]#systemctl status rabbitmq-server.service 
● rabbitmq-server.service - RabbitMQ broker
   Loaded: loaded (/lib/systemd/system/rabbitmq-server.service; enabled; vendor pres
   Active: active (running) since Fri 2021-05-21 19:47:33 CST; 50s ago
```

#### 2.3.1.3 **RabbitMQ 插件管理**

官方文档：https://www.rabbitmq.com/management.html

开启 web 界面管理插件

```bash
#查看所有插件
[19:50:03 root@mq1 ~]#rabbitmq-plugins list
#启动web界面管理插件
[19:50:09 root@mq1 ~]#rabbitmq-plugins enable rabbitmq_management
#关闭插件
[19:50:09 root@mq1 ~]#rabbitmq-plugins disable rabbitmq_management

#RabbitMQ端口说明
5672：消费者访问的 端口
15672：web 管理端口
25672：集群状态通信端口
```

#### 2.3.1.4 **登陆 web 管理界面**

```bash
#rabbitmq 从 3.3.0 开始禁止使用 guest/guest 权限通过除 localhost 外的访问

#之前版本可以通过修改配置文件进行访问
vim /usr/lib/rabbitmq/lib/rabbitmq_server-3.8.3/ebin/rabbit.app
39 {loopback_users, []}, #删除被禁止登陆的 guest 账户
systemctl restart rabbitmq-server.service #重启 rabbitmq 服务

#现在版本只能创建用户授权后进行访问
#创建用户格式为rabbitmqctl add_user 用户名 密码
[19:55:13 root@mq1 ~]#rabbitmqctl add_user jack 123456
#授权administrator为管理员权限
[19:55:53 root@mq1 ~]#rabbitmqctl set_user_tags jack administrator
```

之后可以使用这个用户登录web管理端

#### 2.3.1.5 使用python对rabbitmq写入与消费数据

**写入数据**

```python
import pika

#用户名密码
cert = pika.PlainCredentials("jack","123456")
#连接到rabbitmq服务器
conn = pika.BlockingConnection(pika.ConnectionParameters('192.168.10.181',5672,'/',cert))
#创建频道
chanel = conn.channel()
#声明如果队列不存在就创建队列，存在就在此队列创建
chanel.queue_declare(queue="test")
#exchange告诉消息去往的队列，routing是队列名称，body是要传递的消息内容
for i in range(100000): #通过循环写入10万条消息
    num = "%s" % i
    chanel.basic_publish(exchange="",
                        routing_key="test",
                        body="hello zhangzhuo! My MQ num is %s!" % num)
    print("支付服务消息编号为%s写入成功"% i)
#消息写入完成，关闭连接
conn.close()
```

**消费数据**

```python
import pika

#用户名密码
cert = pika.PlainCredentials("jack","123456")
#连接到rabbitmq服务器
conn = pika.BlockingConnection(pika.ConnectionParameters('192.168.10.181',5672,'/',cert))
#创建频道
chanel = conn.channel()
#声明如果队列不存在就创建队列，存在就在此队列创建
chanel.queue_declare(queue="test")
#定义一个回调函数来处理，这里的回调函数就是将信息打印出来
def callback(ch,method,properties,body):
    print("[x] Receiced %r" % body)
chanel.basic_consume('test',callback,
                     auto_ack=False,
                     exclusive=False,
                     consumer_tag=None,
                     arguments=None)
print(' [*] Waiting for messages. To exit press CTRL+C')
#开始接收信息并进入阻塞状态
chanel.start_consuming()import pika

#用户名密码
cert = pika.PlainCredentials("jack","123456")
#连接到rabbitmq服务器
conn = pika.BlockingConnection(pika.ConnectionParameters('192.168.10.181',5672,'/',cert))
#创建频道
chanel = conn.channel()
#声明如果队列不存在就创建队列，存在就在此队列创建
chanel.queue_declare(queue="test")
#定义一个回调函数来处理，这里的回调函数就是将信息打印出来
def callback(ch,method,properties,body):
    print("[x] Receiced %r" % body)
chanel.basic_consume('test',callback,
                     auto_ack=False,
                     exclusive=False,
                     consumer_tag=None,
                     arguments=None)
print(' [*] Waiting for messages. To exit press CTRL+C')
#开始接收信息并进入阻塞状态
chanel.start_consuming()
```

## 2.4  RabbitMQ 集群部署

### 2.4.1 **Rabbitmq 集群分为二种方式**

```bash
普通模式：创建好 RabbitMQ 集群之后的默认模式。
镜像模式：把需要的队列做成镜像队列。
```

**普通集群模式**：queue 创建之后，如果没有其它 policy，消息实体只存在于其中 一个节点，A、B 两个 Rabbitmq 节点仅有相同的元数据，即队列结构，但队列的 数据仅保存有一份，即创建该队列的 rabbitmq 节点（A 节点），当消息进入 A 节 点的 Queue 中后，consumer 从 B 节点拉取时，RabbitMQ 会临时在 A、B 间进行消息传输，把 A 中的消息实体取出并经过 B 发送给 consumer，所以 consumer 可以连接每一个节点，从中取消息，该模式存在一个问题就是当 A 节点故障后， B 节点无法取到 A 节点中还未消费的消息实体。

**镜像集群模式**： 把需要的队列做成镜像队列，存在于多个节点，属于 RabbitMQ 的 HA 方案（镜像模式是在普通模式的基础上，增加一些镜像策略） 该模式解决了普通模式中的数据丢失问题，其实质和普通模式不同之处在于，消息实体会主动在镜像节点间同步，而不是在 consumer 取数据时临时拉取，该模式带来的副作用也很明显，除了降低系统性能外，如果镜像队列数量过多，加之大量的消息进入，集群内部的网络带宽将会被这种同步通讯大大消耗掉，所以在对可靠性要求较高的场合中适用，一个队列想做成镜像队列，需要先设置 policy， 然后客户端创建队列的时候，rabbitmq 集群根据“队列名称”自动设置是普通集群模式或镜像队列。

### 2.4.2 集群中有两种节点类型

**内存节点**：只将数据保存到内存

**磁盘节点**：保存数据到内存和磁盘。

内存节点虽然不写入磁盘，但是它执行比磁盘节点要好，集群中，只需要一个磁盘节点来保存数据就足够了如果集群中只有内存节点，那么不能全部停止它们， 否则所有数据消息在服务器全部停机之后都会丢失。

**推荐设计架构**

在一个 rabbitmq 集群里，有 3 台或以上机器，其中 1 台使用磁盘模式，其它节点使用内存模式，内存节点无访问速度更快，由于磁盘 IO 相对较慢，因此可作为数据备份使用。

### 2.4.3 Ubuntu 1804 安装集群版 RabbitMQ

```bash
集群环境，三台服务器，具体 IP 如下：
#hosts配置
192.168.10.181 mq1 mq1.zhangzhuo.org
192.168.10.182 mq2 mq2.zhangzhuo.org
192.168.10.183 mq3 mq3.zhangzhuo.org
```

#### 2.4.3.1 配置个主机hosts文件

```bash
#所有节点都配置
[13:32:48 root@ubuntu18-04 ~]#cat /etc/hosts
192.168.10.181 mq1 mq1.zhangzhuo.org
192.168.10.182 mq2 mq2.zhangzhuo.org
192.168.10.183 mq3 mq3.zhangzhuo.org
```

#### 2.4.3.2 各服务器安装rabbitMQ

```bash
#所有节点全部安装，版本必须一致
#安装步骤跟上面单机部署一致

#查看可以安装的版本
[14:59:19 root@mq2 ~]#apt-cache madison rabbitmq-server
#安装较新版本的 RabbitMQ
[14:59:19 root@mq2 ~]#apt install rabbitmq-server=3.7.22-1
```

#### 2.4.3.3 创建 RabbitMQ 集群

Rabbitmq 的集群是依赖于 erlang 的集群来工作的，所以必须先构建起 erlang 的集群环境,而 Erlang 的集群中各节点是通过一个 magic cookie 来实现的，这个cookie存放在 /var/lib/rabbitmq/.erlang.cookie 中，文件是 400 的权限,所以必须保证各节点 cookie 保持一致，否则节点之间就无法通信。

```bash
#各服务器关闭 RabbitMQ
[13:42:32 root@mq1 ~]#systemctl stop rabbitmq-server.service 
[13:42:42 root@mq2 ~]#systemctl stop rabbitmq-server.service 
[13:42:12 root@mq3 ~]#systemctl stop rabbitmq-server.service

#在 mq-server1 同步.erlang.cookie 至其他两台服务器
[13:43:11 root@mq1 ~]#scp /var/lib/rabbitmq/.erlang.cookie 192.168.10.182:/var/lib/rabbitmq/.erlang.cookie
[13:44:14 root@mq1 ~]#scp /var/lib/rabbitmq/.erlang.cookie 192.168.10.183:/var/lib/rabbitmq/.erlang.cookie

#各服务器启动 RabbitMQ
[13:44:21 root@mq1 ~]#systemctl start rabbitmq-server.service
[13:43:18 root@mq2 ~]#systemctl start rabbitmq-server.service
[13:43:23 root@mq3 ~]#systemctl start rabbitmq-server.service

#查看当前集群状态
3.7.X 及早期版本单节点状态

root@mq-server2:~# rabbitmqctl cluster_status
Cluster status of node rabbit@mq-server2 ... [{nodes,[{disc,['rabbit@mq-server2']}]}, {running_nodes,['rabbit@mq-server2']}, {cluster_name,<<"rabbit@mq-server2">>}, {partitions,[]}, {alarms,[{'rabbit@mq-server2',[]}]}

3.8.X 版本单节点状态
[13:46:05 root@mq1 ~]#rabbitmqctl cluster_status
Cluster status of node rabbit@mq1 ...
Basics

Cluster name: rabbit@mq1

Disk Nodes

rabbit@mq1

Running Nodes

rabbit@mq1


#创建 RabbitMQ集群
[13:46:12 root@mq1 ~]#rabbitmqctl stop_app       #停止app服务
Stopping rabbit application on node rabbit@mq1 ...  
[13:47:47 root@mq1 ~]#rabbitmqctl reset          #清空元数据
Resetting node rabbit@mq1 ...

#将mq3添加到集群当中，并成为内存节点，不加--ram 默认是磁盘节点
[13:50:47 root@mq1 ~]#rabbitmqctl join_cluster rabbit@mq3 --ram 
Clustering node rabbit@mq1 with rabbit@mq3
[13:51:49 root@mq1 ~]#rabbitmqctl start_app #启动app服务
Starting node rabbit@mq1 ...

#在mq2作为内存节点添加到mq3，并作为内存节点，在mq2执行以下命令
[13:42:42 root@mq2 ~]#systemctl stop rabbitmq-server.service 
[13:43:18 root@mq2 ~]#systemctl start rabbitmq-server.service
[13:45:14 root@mq2 ~]#rabbitmqctl stop_app
Stopping rabbit application on node rabbit@mq2 ...
[13:56:24 root@mq2 ~]#rabbitmqctl reset
Resetting node rabbit@mq2 ...
[13:56:30 root@mq2 ~]#rabbitmqctl join_cluster rabbit@mq3 --ram
Clustering node rabbit@mq2 with rabbit@mq3
[13:57:02 root@mq2 ~]#rabbitmqctl start_app
Starting node rabbit@mq2 ...
```

#### 2.4.3.4 将集群设置为镜像模式

只要在其中一台节点执行以下命令即可：

```bash
#这里为设置镜像模式 ha-all之后""中写的是queues名称，可以写正则表达式.*表示所有的queues
[13:58:24 root@mq2 ~]#rabbitmqctl set_policy ha-all ".*" '{"ha-mode":"all"}'
Setting policy "ha-all" for pattern "#" to "{"ha-mode":"all"}" with priority "0" for vhost "/" ...

#给其他vhost开启镜像模式-p 后面指定vhost名称
rabbitmqctl set_policy ha-all ".*" '{"ha-mode":"all"}' -p zhangzhuo
```

#### 2.4.3.5 验证当前集群状态

```bash
[13:53:47 root@mq1 ~]#rabbitmqctl cluster_status
Cluster status of node rabbit@mq1 ...
Basics

Cluster name: rabbit@mq1

Disk Nodes

rabbit@mq3

RAM Nodes

rabbit@mq1
rabbit@mq2

Running Nodes

rabbit@mq1
rabbit@mq2
rabbit@mq3

Versions

rabbit@mq1: RabbitMQ 3.8.16 on Erlang 24.0.1
rabbit@mq2: RabbitMQ 3.8.16 on Erlang 24.0.1
rabbit@mq3: RabbitMQ 3.8.16 on Erlang 24.0.1

Maintenance status

Node: rabbit@mq1, status: not under maintenance
Node: rabbit@mq2, status: not under maintenance
Node: rabbit@mq3, status: not under maintenance
```

#### 2.4.3.6 web界面验证集群状态

不启用 web 插件的 rabbitmq 服务器，会在 web 节点提示节点统计信息不可用 (Node statistics not availab）

```bash
#启用web插件
[14:04:16 root@mq2 ~]#rabbitmq-plugins enable rabbitmq_management
[13:45:15 root@mq3 ~]#rabbitmq-plugins enable rabbitmq_management
```

![image-20210522141130882](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210522141130882.png)

## 2.5 RabbitMQ 常用命令

### 2.5.1 vhost

```bash
#创建 vhost
[14:07:04 root@mq1 ~]#rabbitmqctl add_vhost zhangzhuo
Adding vhost "zhangzhuo" ...

#列出所有vhost
[14:13:26 root@mq1 ~]#rabbitmqctl list_vhosts
Listing vhosts ...
name
/
zhangzhuo

#列出所有队列
[14:14:25 root@mq1 ~]#rabbitmqctl list_queues
Timeout: 60.0 seconds ...
Listing queues for vhost / ...
name	messages
test1	200

#删除指定vhost
[14:14:28 root@mq1 ~]#rabbitmqctl delete_vhost zhangzhuo
Deleting vhost "zhangzhuo" ...
```

### 2.5.2 账户管理

```bash
#添加账户 zhangzhuo 密码为 123456
[14:14:59 root@mq1 ~]#rabbitmqctl add_user zhangzhuo 123456

#查看所有用户
[14:23:14 root@mq1 ~]#rabbitmqctl list_users

#更改用户密码
[14:16:08 root@mq1 ~]#rabbitmqctl change_password zhangzhuo 147852

#设置 jack 用户对 zhangzhuo 的 vhost 有读写权限，三个点为配置正则、读和写
[14:16:28 root@mq1 ~]#rabbitmqctl set_permissions -p zhangzhuo zhangzhuo ".*" ".*" ".*"

#给用户zhangzhuo设置权限角色
[14:17:57 root@mq1 ~]#rabbitmqctl set_user_tags zhangzhuo administrator

角色分别有：
management：用户可以访问管理插件
policymaker：用户可以访问管理插件，并为他们所访问的vhost管理策略和参数。
monitoring：用户可以访问管理插件，查看所有连接和通道以及节点相关信息。
administrator：用户可以做任何监视可以做的事情，管理用户、vhosts和权限，关闭其他用户的连接，管理所有vhosts的策略和参数。
#还有其他角色这里不在列举
```

## 2.6 RabbitMQ持久化

### 2.6.1 RabbitMQ的queues持久化

队列持久化一般指队列信息持久化，一般队列信息是默认不做持久化的，当RabbitMQ服务器出现问题后重启RabbitMQ服务队列信息就会丢失，一般会开启队列持久化把队列信息保存在磁盘当中，一般队列信息持久化是由程序来控制的，下面是一段python代码

```python
from collections import defaultdict
import pika

#用户名密码
cert = pika.PlainCredentials("jack","123456")
#连接到rabbitmq服务器
conn = pika.BlockingConnection(pika.ConnectionParameters('192.168.10.181',5672,'/',cert))
#创建频道
chanel = conn.channel()
#声明如果队列不存在就创建队列，存在就在此队列创建
chanel.queue_declare(queue="test",durable=True)   #durable可以控制队列信息是否持久化
#exchange告诉消息去往的队列，routing是队列名称，body是要传递的消息内容
for i in range(100): #通过循环写入10万条消息
    num = "%s" % i
    chanel.basic_publish(exchange="",
                        routing_key="test",
                        body="hello zhangzhuo! My MQ num is %s!" % num)
    print("支付服务消息编号为%s写入成功"% i)
#消息写入完成，关闭连接
conn.close()
```

**执行脚本后**

![image-20210522144108397](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210522144108397.png)

**测试**

```bash
#重启服务进行测试
[15:11:47 root@mq3 ~]#systemctl restart rabbitmq-server.service 
[15:13:32 root@mq3 ~]#rabbitmqctl list_queues
Timeout: 60.0 seconds ...
Listing queues for vhost / ...
name	messages
test	0     #还存在
```

### 2.6.2 队列消息持久化

如果开启队列持久化之后为启用队列消息持久化服务器重启之后队列消息会全部消失，队列持久化也是由程序控制

```python
from collections import defaultdict
import pika

#用户名密码
cert = pika.PlainCredentials("jack","123456")
#连接到rabbitmq服务器
conn = pika.BlockingConnection(pika.ConnectionParameters('192.168.10.183',5672,'/',cert))
#创建频道
chanel = conn.channel()
#声明如果队列不存在就创建队列，存在就在此队列创建
chanel.queue_declare(queue="test",durable=True)
#exchange告诉消息去往的队列，routing是队列名称，body是要传递的消息内容
for i in range(100): #通过循环写入10万条消息
    num = "%s" % i
    chanel.basic_publish(exchange="",
                        routing_key="test",
                        body="hello zhangzhuo! My MQ num is %s!" % num,
                        properties=pika.BasicProperties(
                            delivery_mode=2    #这里表示是否开启队列消息持久化1为不启用2为启用
                        ))
    print("支付服务消息编号为%s写入成功"% i)
#消息写入完成，关闭连接
conn.close()
```

**执行脚本**

![image-20210522151756243](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210522151756243.png)

**重启测试**

```bash
[15:13:56 root@mq3 ~]#systemctl restart rabbitmq-server.service 
[15:19:00 root@mq3 ~]#rabbitmqctl list_queues
Timeout: 60.0 seconds ...
Listing queues for vhost / ...
name	messages
test	100  #这里消息还存在
```

## 2.7 RabbitMQ API

官方所有API说明：https://rawcdn.githack.com/rabbitmq/rabbitmq-management/rabbitmq_v3_6_9/priv/www/api/index.html

## 2.8 RabbitMQ监控配置

### 2.8.1 监控rabbitMQ集群状态

**需要在linux系统下运行**

```python
#/bin/env python3
import subprocess
running_list = []
error_list = []
false = "false"
true = "true"

def get_status():
    obj = subprocess.Popen(("curl -s -u jack:123456 http://192.168.10.182:15672/api/nodes &> /dev/null"), shell=True, stdout=subprocess.PIPE)
    #print(obj)
    data = obj.stdout.read()
    data1 = eval(data)
    #print(data1)
    for i in data1:
        if i.get("running") == "true":   
            running_list.append(i.get("name"))
        else:
            error_list.append(i.get("name"))
def count_server():
    if len(running_list) <3: #可以判断错误列表大于 0 或者运行列表小于3，3未总计的节点数量
        print(100)  #100就是集群内有节点运行不正常了
    else:
        print(50)   #50为所有节点全部运行正常
def main():
    get_status()
    count_server()
#if__name__ == "__main__":
main()
```

### 2.8.2 监控rabbitMQ内存使用

**需要在linux系统下运行，需要带参数跟节点名称**

```bash
#/bin/env python3
import subprocess
import sys
running_list = []
error_list = []
false = "false"
true = "true"

def get_status():
    obj = subprocess.Popen(("curl -s -u jack:123456 http://192.168.10.182:15672/api/nodes &> /dev/null"), shell=True, stdout=subprocess.PIPE)
    data = obj.stdout.read()
    data1 = eval(data)
    for i in data1:
        if i.get("name") == sys.argv[1]:   
            print(i.get("mem_used"))
def main():
    get_status()
#if__name__ == "__main__":
main()
#测试
[16:15:29 root@mq1 ~]#python3 2.py rabbit@mq1
137613312
[16:15:31 root@mq1 ~]#python3 2.py rabbit@mq2
138813440
[16:15:33 root@mq1 ~]#python3 2.py rabbit@mq3
138743808
```

### 2.8.3 监控连接数量

```python
#/bin/env python3
import subprocess
import json
connections_list = []
error_connections_list = []
false = "false"
true = "true"
null = ""

def get_status():
    obj = subprocess.Popen(("curl -s -u jack:123456 http://192.168.10.182:15672/api/connections &> /dev/null"), shell=True, stdout=subprocess.PIPE)
    data1 = obj.stdout.read()
#    data2 = json.loads(data1)
    data3 = eval(data1)
    for i in data3:
        if i.get("state") == "running":   
            connections_list.append(i.get("peer_host"))
        else:
            error_connections_list.append(i.get("peer_host"))
def count_server():
    num_conn = len(connections_list)
    print(num_conn)
def main():
    get_status()
    count_server()
#if__name__ == "__main__":
main()

#执行测试
[17:32:32 root@mq1 ~]#python3 3.py 
2
```

# 三、ZooKeeper

官方网站：https://zookeeper.apache.org/

ZooKeeper 最早起源于雅虎研究院的一个研究小组。在当时，研究人员发现，在雅虎内部很多大型系统基本都需要依赖一个类似的系统来进行分布式协调，但是这些系统往往都存在分布式单点问题，所以，雅虎的开发人员就试图开发一个通用的无单点问题的分布式协调框架，以便让开发人员将精力集中在处理业务逻辑上。

## 3.1 ZooKeeper 使用场景

ZooKeeper 是一个分布式服务框架，它主要是用来解决分布式应用中经常遇到的 一些数据管理问题，如：命名服务、状态同步、配置中心、集群管理等。

### 3.1.1 命名服务

命名服务是分布式系统中比较常见的一类场景。命名服务是分布式系统最基本的公共服务之一。在分布式系统中，被命名的实体通常可以是集群中的机器、提供的服务地址或远程对象等——这些我们都可以统称它们为名字（Name），其中较为常见的就是一些分布式服务框架（如 RPC、RMI）中的服务地址列表，通过使用命名服务，客户端应用能够根据指定名字来获取资源的实体、服务地址和提供者的信息等。

![image-20210522174043514](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210522174043514.png)

### 3.1.2 状态同步

每个节点除了存储数据内容和 node 节点状态信息之外，还存储了已经注册的 APP 的状态信息，当有些节点或 APP 不可用，就将当前状态同步给其他服务。

### 3.1.3 配置中心

现在我们大多数应用都是采用的是分布式开发的应用，搭建到不同的服务器上， 我们的配置文件，同一个应用程序的配置文件一样，还有就是多个程序存在相同的配置，当我们配置文件中有个配置属性需要改变，我们需要改变每个程序的配置属性，这样会很麻烦的去修改配置，那么可用使用 ZooKeeper 来实现配置中心， ZooKeeper 采用的是推拉相结合的方式： 客户端向服务端注册自己需要关注的节点，一旦该节点的数据发生变更，那么服务端就会向相应的客户端发送 Watcher 事件通知，客户端接收到这个消息通知后，需要主动到服务端获取最新的数据。

### 3.1.4  集群管理

所谓集群管理，包括集群监控与集群控制两大块，前者侧重对集群运行时状态的收集，后者则是对集群进行操作与控制，在日常开发和运维过程中，我们经常会有类似于如下的需求：

```bash
希望知道当前集群中究竟有多少机器在工作。
对集群中每台机器的运行时状态进行数据收集。
对集群中机器进行上下线操作。
```

**ZooKeeper 具有以下两大特性**

```
客户端如果对 ZooKeeper 的一个数据节点注册 Watcher 监听，那么当该数据节点的内容或是其子节点列表发生变更时，ZooKeeper 服务器就会向订阅的客户端发送变更通知。
对在 ZooKeeper 上创建的临时节点，一旦客户端与服务器之间的会话失效，那么该临时节点也就被自动清除。
```

Watcher（事件监听器），是 Zookeeper 中的一个很重要的特性。Zookeeper 允许用户在指定节点上注册一些 Watcher，并且在一些特定事件触发的时候， ZooKeeper 服务端会将事件通知到感兴趣的客户端上去，该机制是 Zookeeper 实现分布式协调服务的重要特性。

![image-20210522190227201](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210522190227201.png)

```bash
0 生产者启动
1 生产者注册至 zookeeper
2 消费者启动并订阅频道
3 zookeeper 通知消费者事件
4 消费者调用生产者
5 监控中心负责统计和监控服务状态
```

## 3.2 ZooKeeper 单机安装

### 3.2.1 配置 java 环境

官方依赖介绍：https://zookeeper.apache.org/doc/r3.4.14/zookeeperAdmin.html)

```bash
[19:07:10 root@ubuntu18-04 ~]#mkdir /usr/local/jdk
[19:07:34 root@ubuntu18-04 ~]#ls
jdk-8u281-linux-x64.tar.gz
[19:07:47 root@ubuntu18-04 ~]#cd /usr/local/jdk/
[19:07:55 root@ubuntu18-04 jdk]#tar xf jdk-8u281-linux-x64.tar.gz 
[19:08:47 root@ubuntu18-04 jdk]#ls
bin        javafx-src.zip  legal    man          src.zip
COPYRIGHT  jmc.txt         lib      README.html  THIRDPARTYLICENSEREADME-JAVAFX.txt
include    jre             LICENSE  release      THIRDPARTYLICENSEREADME.txt
[19:12:16 root@ubuntu18-04 jdk]#cat /etc/profile.d/jdk.sh
export JAVA_HOME=/usr/local/jdk/
export PATH=$PATH:${JAVA_HOME}/bin
export JER_HOME=${JAVA_HOME}/jre
export CLASSPATH=${JAVA_HOME}/lib/:${JRE_HOME}/lib/
#测试
[19:12:30 root@ubuntu18-04 ~]#java -version
java version "1.8.0_281"
Java(TM) SE Runtime Environment (build 1.8.0_281-b09)
Java HotSpot(TM) 64-Bit Server VM (build 25.281-b09, mixed mode)
```

### 3.2.2 部署 ZooKeeper

官方下载地址：https://zookeeper.apache.org/releases.html

```bash
[19:16:08 root@zook1 ~]#mkdir /usr/local/zookeeper
[19:16:18 root@zook1 ~]#ls
apache-zookeeper-3.6.3-bin.tar.gz
[19:16:24 root@zook1 ~]#mv apache-zookeeper-3.6.3-bin.tar.gz /usr/local/zookeeper/
[19:16:36 root@zook1 ~]#cd /usr/local/zookeeper/
[19:16:44 root@zook1 zookeeper]#tar xf apache-zookeeper-3.6.3-bin.tar.gz
[19:17:22 root@zook1 zookeeper]#ls
bin  conf  docs  lib  LICENSE.txt  NOTICE.txt  README.md  README_packaging.md

#修改配置文件
[19:17:23 root@zook1 zookeeper]#cp conf/zoo_sample.cfg conf/zoo.cfg
[19:18:09 root@zook1 zookeeper]#grep "^[a-Z]" conf/zoo.cfg
tickTime=2000
initLimit=10
syncLimit=5
dataDir=/tmp/zookeeper
clientPort=2181
```

### 3.2.3 启动 ZooKeeper

```bash
/usr/local/zookeeper/bin/zkServer.sh #用于启动、重启、停止 ZooKeeper
[19:18:33 root@zook1 zookeeper]#./bin/zkServer.sh start
ZooKeeper JMX enabled by default
Using config: /usr/local/zookeeper/bin/../conf/zoo.cfg
Starting zookeeper ... STARTED

#验证进程
[19:20:05 root@zook1 zookeeper]#ps -ef | grep zookeeper
root       3001      1  3 19:19 pts/0    00:00:01 /usr/local/jdk//bin/java 

#验证zookeeper状态
[19:20:13 root@zook1 zookeeper]#./bin/zkServer.sh status
ZooKeeper JMX enabled by default
Using config: /usr/local/zookeeper/bin/../conf/zoo.cfg
Client port found: 2181. Client address: localhost. Client SSL: false.
Mode: standalone
```

## 3.3 ZooKeeper 集群介绍

ZooKeeper 集群用于解决单点和单机性能及数据高可用等问题。

### 3.3.1 集群结构

![image-20210522194832661](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210522194832661.png)

### 3.3.2 集群角色

![image-20210522194858801](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210522194858801.png)

## 3.4 Zookeeper 集群部署

Zookeeper 的集群部署过程。

zookeeper 集群特性：整个集群中只要有超过集群数量一半的 zookeeper 工作是正常的，那么整个集群对外就是可用的，假如有 2 台服务器做了一个 zookeeper 集群，只要有任何一台故障或宕机，那么这个 zookeeper 集群就不可用了，因为剩下的一台没有超过集群一半的数量，但是假如有三台 zookeeper 组成一个集群， 那么损坏一台就还剩两台，大于 3 台的一半，所以损坏一台还是可以正常运行的， 但是再损坏一台就只剩一台集群就不可用了。那么要是 4 台组成一个 zookeeper 集群，损坏一台集群肯定是正常的，那么损坏两台就还剩两台，那么 2 台不大于 集群数量的一半，所以 3 台的 zookeeper 集群和 4 台的 zookeeper 集群损坏两台 的结果都是集群不可用，以此类推 5 台和 6 台以及 7 台和 8 台都是同理，所以这 也就是为什么集群一般都是奇数的原因。

### 3.4.1 配置 ZooKeeper 集群

各 zookeeper 服务器都配置 java 环境并部署 zookeeper 集群

#### 3.4.1.1 zk 节点 1 部署过程

```bash
#先部署jdk8略过
[19:54:17 root@zook1 ~]#java -version
java version "1.8.0_281"
Java(TM) SE Runtime Environment (build 1.8.0_281-b09)
Java HotSpot(TM) 64-Bit Server VM (build 25.281-b09, mixed mode)

[19:16:08 root@zook1 ~]#mkdir /usr/local/zookeeper
[19:16:18 root@zook1 ~]#ls
apache-zookeeper-3.6.3-bin.tar.gz
[19:16:24 root@zook1 ~]#mv apache-zookeeper-3.6.3-bin.tar.gz /usr/local/zookeeper/
[19:16:36 root@zook1 ~]#cd /usr/local/zookeeper/
[19:16:44 root@zook1 zookeeper]#tar xf apache-zookeeper-3.6.3-bin.tar.gz
[19:17:22 root@zook1 zookeeper]#ls
bin  conf  docs  lib  LICENSE.txt  NOTICE.txt  README.md  README_packaging.md

#生产配置文件
[19:17:23 root@zook1 zookeeper]#cp conf/zoo_sample.cfg conf/zoo.cfg
#创建数据目录
[19:55:02 root@zook1 zookeeper]#mkdir /data
#修改配置文件内容
[19:58:19 root@zook1 zookeeper]#grep "^[a-Z]" conf/zoo.cfg
tickTime=2000
initLimit=10
syncLimit=5
dataDir=/usr/local/zookeeper/data
clientPort=2181
maxClientCnxns=60
autopurge.snapRetainCount=3
autopurge.purgeInterval=1
server.1=192.168.10.181:2888:3888
server.2=192.168.10.182:2888:3888
server.3=192.168.10.183:2888:3888

#创建自己的集群id文件
[19:59:23 root@zook1 zookeeper]#echo 1 >/usr/local/zookeeper/data/myid
```

#### 3.4.1.2 zk 节点 2 部署过程

```bash
[19:53:32 root@zook2 ~]#java -version
java version "1.8.0_281"
Java(TM) SE Runtime Environment (build 1.8.0_281-b09)
Java HotSpot(TM) 64-Bit Server VM (build 25.281-b09, mixed mode)

[19:16:08 root@zook1 ~]#mkdir /usr/local/zookeeper
[19:16:18 root@zook1 ~]#ls
apache-zookeeper-3.6.3-bin.tar.gz
[19:16:24 root@zook1 ~]#mv apache-zookeeper-3.6.3-bin.tar.gz /usr/local/zookeeper/
[19:16:36 root@zook1 ~]#cd /usr/local/zookeeper/
[19:16:44 root@zook1 zookeeper]#tar xf apache-zookeeper-3.6.3-bin.tar.gz
[19:17:22 root@zook1 zookeeper]#ls
bin  conf  docs  lib  LICENSE.txt  NOTICE.txt  README.md  README_packaging.md

#生产配置文件
[19:17:23 root@zook1 zookeeper]#cp conf/zoo_sample.cfg conf/zoo.cfg
#创建数据目录
[19:55:02 root@zook1 zookeeper]#mkdir /data
#修改配置文件内容
[19:58:19 root@zook1 zookeeper]#grep "^[a-Z]" conf/zoo.cfg
tickTime=2000
initLimit=10
syncLimit=5
dataDir=/usr/local/zookeeper/data
clientPort=2181
maxClientCnxns=60
autopurge.snapRetainCount=3
autopurge.purgeInterval=1
server.1=192.168.10.181:2888:3888
server.2=192.168.10.182:2888:3888
server.3=192.168.10.183:2888:3888

[20:01:45 root@zook2 zookeeper]#echo 2 >/usr/local/zookeeper/data/myid
```

#### 2.4.1.3 zk 节点 3 部署过程

```bash
[19:53:32 root@zook2 ~]#java -version
java version "1.8.0_281"
Java(TM) SE Runtime Environment (build 1.8.0_281-b09)
Java HotSpot(TM) 64-Bit Server VM (build 25.281-b09, mixed mode)

[19:16:08 root@zook1 ~]#mkdir /usr/local/zookeeper
[19:16:18 root@zook1 ~]#ls
apache-zookeeper-3.6.3-bin.tar.gz
[19:16:24 root@zook1 ~]#mv apache-zookeeper-3.6.3-bin.tar.gz /usr/local/zookeeper/
[19:16:36 root@zook1 ~]#cd /usr/local/zookeeper/
[19:16:44 root@zook1 zookeeper]#tar xf apache-zookeeper-3.6.3-bin.tar.gz
[19:17:22 root@zook1 zookeeper]#ls
bin  conf  docs  lib  LICENSE.txt  NOTICE.txt  README.md  README_packaging.md

#生产配置文件
[19:17:23 root@zook1 zookeeper]#cp conf/zoo_sample.cfg conf/zoo.cfg
#创建数据目录
[19:55:02 root@zook1 zookeeper]#mkdir /data
#修改配置文件内容
[19:58:19 root@zook1 zookeeper]#grep "^[a-Z]" conf/zoo.cfg
tickTime=2000
initLimit=10
syncLimit=5
dataDir=/usr/local/zookeeper/data
clientPort=2181
maxClientCnxns=60
autopurge.snapRetainCount=3
autopurge.purgeInterval=1
server.1=192.168.10.181:2888:3888
server.2=192.168.10.182:2888:3888
server.3=192.168.10.183:2888:3888

[19:53:37 root@zook2 ~]#echo 3 >/usr/local/zookeeper/data/myid
```

### 3.4.2 各服务器启动 zookeeper

```bash
#zk1
[20:03:32 root@zook1 ~]#/usr/local/zookeeper/bin/zkServer.sh start
ZooKeeper JMX enabled by default
Using config: /usr/local/zookeeper/bin/../conf/zoo.cfg
Starting zookeeper ... STARTED

#zk2
[20:02:03 root@zook2 zookeeper]#/usr/local/zookeeper/bin/zkServer.sh start
ZooKeeper JMX enabled by default
Using config: /usr/local/zookeeper/bin/../conf/zoo.cfg
Starting zookeeper ... STARTED
#zk3
[20:02:41 root@zook3 ~]#/usr/local/zookeeper/bin/zkServer.sh start
ZooKeeper JMX enabled by default
Using config: /usr/local/zookeeper/bin/../conf/zoo.cfg
Starting zookeeper ... STARTED
```

### 3.4.3 验证 zookeeper 集群状态

```bash
#zk1
[20:03:50 root@zook1 ~]#/usr/local/zookeeper/bin/zkServer.sh status
ZooKeeper JMX enabled by default
Using config: /usr/local/zookeeper/bin/../conf/zoo.cfg
Client port found: 2181. Client address: localhost. Client SSL: false.
Mode: follower

#zk2
[20:04:03 root@zook2 zookeeper]#/usr/local/zookeeper/bin/zkServer.sh status
ZooKeeper JMX enabled by default
Using config: /usr/local/zookeeper/bin/../conf/zoo.cfg
Client port found: 2181. Client address: localhost. Client SSL: false.
Mode: leader

#zk3
[20:04:04 root@zook2 ~]#/usr/local/zookeeper/bin/zkServer.sh status
ZooKeeper JMX enabled by default
Using config: /usr/local/zookeeper/bin/../conf/zoo.cfg
Client port found: 2181. Client address: localhost. Client SSL: false.
Mode: follower
```

### 3.4.4 zookeeper 集群选举过程

**节点角色状态**

```bash
LOOKING：寻找 Leader 状态，处于该状态需要进入选举流程
LEADING：领导者状态，处于该状态的节点说明是角色已经是 Leader
FOLLOWING：跟随者状态，表示 Leader 已经选举出来，当前节点角色是 follower
OBSERVER：观察者状态，表明当前节点角色是 observer
```

**选举 ID**

```bash
ZXID（zookeeper transaction id）：每个改变 Zookeeper 状态的操作都会形成一对应的zxid。
myid：服务器的唯一标识(SID)，通过配置 myid 文件指定，集群中唯一。
```

#### 3.4.4.1 leader 选举过程

当集群中的 zookeeper 节点启动以后，会根据配置文件中指定的 zookeeper 节点 地址进行 leader 选择操作，过程如下

```bash
1. 每个 zookeeper 都会发出投票，由于是第一次选举 leader，因此每个节点都会把自己当做 leader 角色进行选举，每个 zookeeper 的投票中都会包含自己的 myid 和 zxid，此时 zookeeper 1 的投票为 myid 为 1，初始 zxid 有一个初始值，后期会随着数据更新而自动变化，zookeeper2 的投票为 myid 为 2，初始zxid 为初始生成的值。
2. 每个节点接受并检查对方的投票信息，比如投票时间、是否状态为 LOOKING状态的投票。
3. 对比投票，优先检查 xvid，如果 xvid 不一样则 xvid 大的为 leader，如果 xvid相同则继续对比 myid，myid

成为 Leader 的必要条件： Leader 要具有最高的 zxid；当集群的规模是 n 时，集群中大多数的机器（至少 n/2+1）得到响应并 follow 选出的 Leader。心跳机制：Leader 与 Follower 利用 PING 来感知对方的是否存活，当 Leader 无法响应 PING 时，将重新发起 Leader选举。
```

#### 3.4.4.2 投票日志

```bash
#zk1
[20:12:30 root@zook1 ~]#cat /usr/local/zookeeper/logs/zookeeper-root-server-zook1.zhangzhuo.org.out 
#zk2
[20:12:30 root@zook2 ~]#cat /usr/local/zookeeper/logs/zookeeper-root-server-zook1.zhangzhuo.org.out 
#zk3
[20:12:30 root@zook3 ~]#cat /usr/local/zookeeper/logs/zookeeper-root-server-zook1.zhangzhuo.org.out
```

## 3.5 ZooKeeper配置文件说明

```bash
tickTime=2000   #服务器与服务器之间的单次心跳检测时间间隔，单位为毫秒
initLimit=10    #集群中 leader 服务器与 follower 服务器初始连接心跳次数，即多少个 2000 毫秒
syncLimit=5     # leader 与 follower 之间连接完成之后，后期检测发送和应答的心跳次数，如果该 follower 在设置的时间内(5*2000)不能与 leader 进行通信，那么此follower 将被视为不可用。
dataDir=/usr/local/zookeeper/data  #自定义的 zookeeper 保存数据的目录
clientPort=2181     #客户端连接 Zookeeper 服务器的端口，Zookeeper 会监听这个端口，接受客户端的访问请求
maxClientCnxns=60   #单个客户端 IP 可以和 zookeeper 保持的连接数
autopurge.snapRetainCount=3  #3.4.0 中的新增功能：启用后，ZooKeeper 自动清除功能会将 autopurge.snapRetainCount 最新快照和相应的事务日志分别保留在dataDir 和 dataLogDir 中，并删除其余部分，默认值为 3。最小值为 3
autopurge.purgeInterval=1   # 3.4.0 及之后版本，ZK 提供了自动清理日志和快照文件的功能，这个参数指定了清理频率，单位是小时，需要配置一个 1 或更大的整数，默认是 0，表示不开启自动清理功
server.1=192.168.10.181:2888:3888  # server.服务器编号=服务器 IP:LF 数据同步端口:LF 选举端
server.2=192.168.10.182:2888:3888
server.3=192.168.10.183:2888:3888
```

## 3.6 zookeeper 数据增删改查

### 3.6.1 命令行写入数据

可连接至 zookeeper 集群中的任意一台 zookeeper 节点进行以下操作

```bash
#查看帮助
[zk: localhost:2181(CONNECTED) 0] help

#写入数据
[zk: localhost:2181(CONNECTED) 1] create /test "hello"
Created /test

#验证数据
[zk: localhost:2181(CONNECTED) 2] get /test
hello

#删除数据
[zk: localhost:2181(CONNECTED) 3] delete /test

#查看节点信息
[zk: localhost:2181(CONNECTED) 15] ls /
[zhang, zookeeper]
```

## 3.7 zookeeper 客户端 ZooInspector

https://github.com/zzhang5/zooinspector

```bash
#客户端编译
cd
git clone https://github.com/zzhang5/zooinspector.git
cd zooinspector/
mvn clean package

#Linux客户端使用
chmod +x target/zooinspector-pkg/bin/zooinspector.sh
target/zooinspector-pkg/bin/zooinspector.sh
```

# 四、kafka

官方网站：http://kafka.apache.org/

Kafka 被称为下一代分布式消息系统，由 scala 和 Java 编写，是非营利性组织 ASF(Apache Software Foundation，简称为 ASF)基金会中的一个开源项目，比如 HTTP Server、Hadoop、ActiveMQ、Tomcat 等开源软件都属于 Apache 基金会的开源软件，类似的消息系统还有 RbbitMQ、ActiveMQ、ZeroMQ

```bash
Kafka®用于构建实时数据管道和流应用程序。 它具有水平可伸缩性，容错性，快速快速性，可在数千家公司中投入生产。
```

## 4.1 常用消息队列对比

kafka 最主要的优势是其具备分布式功能、并可以结合 zookeeper 可以实现动态扩容，Kafka 是一种高吞吐量的分布式发布订阅消息系统。

![image-20210524190556557](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210524190556557.png)

## 4.2 kafka 优势

```bash
kafka 通过 O(1)的磁盘数据结构提供消息的持久化，这种结构对于即使数以 TB 的消息存储也能够保持长时间的稳定性能。

高吞吐量：即使是非常普通的硬件 Kafka 也可以支持每秒数百万的消息。

支持通过 Kafka 服务器分区消息。

支持 Hadoop并行数据加载。
```

![image-20210524190721344](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210524190721344.png)

```bash
O(1)就是最低的时空复杂度了，也就是耗时/耗空间与输入数据大小无关，无论输入数据增大多少倍，耗时/耗空间都不变，哈希算法就是典型的 O(1)时间复杂度，无论数据规模多大，都可以在一次计算后找到目标
```

## 4.3 kafka 角色

**Broker**：Kafka 集群包含一个或多个服务器，这种服务器被称为 broker

**Topic** ：每条发布到 Kafka 集群的消息都有一个类别，这个类别被称为 topic，（物理上不同 topic 的消息分开存储在不同的文件夹，逻辑上一个 topic 的消息虽然保存于一个或多个 broker 上但用户只需指定消息的 topic 即可生产或消费数据而不 必关心数据存于何处），topic 在逻辑上对 record(记录、日志)进行分组保存，消费者需要订阅相应的 topic 才能消费topic中的消息

**Partition** ：是物理上的概念，每个 topic 包含一个或多个 partition，创建 topic 时可指定 parition 数量，每个 partition 对应于一个文件夹，该文件夹下存储该 partition 的数据和索引文件，为了实现实现数据的高可用，比如将分区 0 的数据分散到不同的 kafka 节点，每一个分区都有一个 broker 作为 leader 和一个 broker 作为 Follower

```bash
分区的优势(分区因子为 3)：
	一：实现存储空间的横向扩容，即将多个 kafka 服务器的空间结合利用
	二：提升性能，多服务器读写
	三：实现高可用，分区 leader 分布在不同的 kafka 服务器，比如分区 0 的 leader为服务器 A，则服务器 B 和服务器 C 为 A 的 follower，而分区 1 的 leader 为服务器 B，则服务器 A 和 C 为服务器 B 的 follower，而分区 2 的 leader 为 C，则服务器 A
```

**Producer**：负责发布消息到 Kafka broker

**Consumer**：消费消息，每个 consumer 属于一个特定的 consuer group（可为每个 consumer 指定 group name，若不指定 group name 则属于默认的 group），使用 consumer high level API 时，同一 topic 的一条消息只能被同一个 consumer group 内的一个 consumer 消费，但多个 consumer group 可同时消费这一消息。

## 4.4 kafka 部署

官方安装说明：http://kafka.apache.org/quickstart

**部署三台服务器的高可用 kafka 环境**

```bash
server1:192.168.10.81
server2:192.168.10.82
server3:192.168.10.83
```

各个节点需部署jdk8,与zookeeper

```
各节点提前安装jdk8与zookeeper这里略过....
```

### 4.4.1 kafka 节点 1

```bash
#提前下载二进制安装包
[19:33:44 root@ka1 ~]#ls
kafka_2.12-2.8.0.tgz
[19:33:46 root@ka1 ~]#mv kafka_2.12-2.8.0.tgz /usr/local/
[19:33:59 root@ka1 ~]#cd  /usr/local/
[19:34:03 root@ka1 local]#tar xf kafka_2.12-2.8.0.tgz 
[19:34:11 root@ka1 local]#mv kafka_2.12-2.8.0 kafka
[19:34:20 root@ka1 local]#rm kafka_2.12-2.8.0.tgz
[19:35:50 root@ka1 kafka]#cd kafka

#创建数据目录
[19:36:57 root@ka1 ~]#mkdir /usr/local/kafka/data

#修改配置文件
[19:35:35 root@ka1 kafka]#vim config/server.properties 
broker.id=1
listeners=PLAINTEXT://192.168.10.181:9092
log.dirs=/usr/local/kafka/data
num.partitions=3
log.retention.hours=168
zookeeper.connect=192.168.10.181:2181,192.168.10.182:2181,192.168.10.183:2181
zookeeper.connection.timeout.ms=18000
#其余配置默认
```

### 4.4.2 kafka 节点 2

```bash
#其余跟节点一致

#配置文件
broker.id=2
listeners=PLAINTEXT://192.168.10.182:9092
log.dirs=/usr/local/kafka/data
num.partitions=3
log.retention.hours=168
zookeeper.connect=192.168.10.181:2181,192.168.10.182:2181,192.168.10.183:2181
zookeeper.connection.timeout.ms=18000
```

### 4.4.3 kafka 节点 3

```bash
#其余跟节点一致

#配置文件
broker.id=3
listeners=PLAINTEXT://192.168.10.183:9092
log.dirs=/usr/local/kafka/data
num.partitions=3
log.retention.hours=168
zookeeper.connect=192.168.10.181:2181,192.168.10.182:2181,192.168.10.183:2181
zookeeper.connection.timeout.ms=18000
```

### 4.4.4 各节点启动 kafka

```bash
#以后台守护进程方式启动
[19:57:52 root@ka1 kafka]#/usr/local/kafka/bin/kafka-server-start.sh -daemon /usr/local/kafka/config/server.properties
```

### 4.4.5 验证zookeeper中kafka元数据

```bash
[19:59:14 root@ka1 kafka]#/usr/local/zookeeper/bin/zkCli.sh
[zk: localhost:2181(CONNECTED) 2] ls /
[admin, brokers, cluster, config, consumers, controller, controller_epoch, feature, isr_change_notification, latest_producer_id_block, log_dir_event_notification, zookeeper]

#说明
1. Broker 依赖于 Zookeeper，每个 Broker 的 id 和 Topic、Partition 这些元数据信息都会写入 Zookeeper 的 ZNode 节点中；
2. Consumer 依赖于 Zookeeper，Consumer 在消费消息时，每消费完一条消息，会将产生的 offset 保存到 Zookeeper 中，下次消费在当前 offset 往后继续消费；ps：kafka0.9 之前 Consumer 的 offset 存储在 Zookeeper 中，kafka0,9 以后 offset存储在本地。
3. Partition 依赖于 Zookeeper，Partition 完成 Replication 备份后，选举出一个Leader，这个是依托于 Zookeeper 的选举机制实现的
```

## 4.5 测试 kafka 读写数据

### 4.5.1 创建 topic

创建名为 logstashtest，partitions(分区)为 3，replication(每个分区的副本数/每个分区的分区因子)为 3 的 topic(主题)：

```bash
#创建
[20:01:44 root@ka1 ~]#/usr/local/kafka/bin/kafka-topics.sh --create --zookeeper 192.168.10.181:2181,192.168.10.182:2181,192.168.10.183:2181 --partitions 3 --replication-factor 3 --topic zhang
Created topic zhang.
```

### 4.5.2 验证 topic

状态说明：logstashtest 有三个分区分别为 0、1、2，分区 0 的 leader 是 3（broker.id）， 分区 0 有三个副本，并且状态都为 lsr（ln-sync，表示可以参加选举成为 leade）

```bash
[20:05:23 root@ka1 ~]#/usr/local/kafka/bin/kafka-topics.sh --describe --zookeeper 192.168.10.181:2181,192.168.10.182:2181,192.168.10.183:2181 --topic zhang
Topic: zhang	TopicId: U8WLnv6AS5qPCJsf9iBc1A	PartitionCount: 3	ReplicationFactor: 3	Configs: 
	Topic: zhang	Partition: 0	Leader: 2	Replicas: 2,3,1	Isr: 2,3,1
	Topic: zhang	Partition: 1	Leader: 3	Replicas: 3,1,2	Isr: 3,1,2
	Topic: zhang	Partition: 2	Leader: 1	Replicas: 1,2,3	Isr: 1,2,3
```

### 4.5.3 获取所有 topic

```bash
[20:05:39 root@ka1 ~]#/usr/local/kafka/bin/kafka-topics.sh --list --zookeeper 192.168.10.181:2181,192.168.10.182:2181,192.168.10.183:2181
zhang
```

### 4.5.4 测试发送消息

```bash
[20:06:49 root@ka1 ~]#/usr/local/kafka/bin/kafka-console-producer.sh --broker-list 192.168.10.181:9092,192.168.10.182:9092,192.168.10.183:9092 --topic zhang
>cy1
>cy2
>cy3
```

### 4.5.5 测试获取消息

可以到任意一台 kafka 服务器测试消息获取，只要有相应的消息获取客户端即可

```bash
[20:10:08 root@ka2 ~]#/usr/local/kafka/bin/kafka-console-consumer.sh --topic zhang --bootstrap-server 192.168.10.183:9092 --from-beginning
cy2
cy1
cy3
```

### 4.5.6 删除topic

```bash
[20:11:37 root@ka1 ~]#/usr/local/kafka/bin/kafka-topics.sh --delete --zookeeper 192.168.10.181:2181,192.168.10.182:2181,192.168.10.183:2181 --topic zhang
Topic zhang is marked for deletion.
```

## 4.6 kafka配置文件

```bash
broker.id=3                                #每个 broker 在集群中的唯一标识，正整数
listeners=PLAINTEXT://192.168.10.183:9092  #监听地址
num.network.threads=1                      #提供多少个网络线程
num.io.threads=8                           #提供多少
log.dirs=/usr/local/kafka/data             #kakfa 用于保存数据的目录，所有的消息都会存储在该目录当中
num.partitions=3                           #设置创新新的 topic 默认分区数
log.retention.hours=168    #设置 kafka 中消息保留时间，默认为 168 小时即 7 天

#zookeeper.connect 指定连接的 zk 的地址,zk 中存储了 broker 的元数据信息,格式如下
zookeeper.connect=192.168.10.181:2181,192.168.10.182:2181,192.168.10.183:2181

zookeeper.connection.timeout.ms=18000 #设置连接 zookeeper 的超时时间，默认 6 秒钟
```

# 五、微服务

## 5.1 什么是微服务

```bash
微服务就是将单体应用拆分为多个应用，每个应用运行在单独的运行环境，应用之间通过指定接口与方式调用，应用之间的代码版本升级互不影响。
实现微服务的方式
横向拆分：
	按照不同的业务进行拆分，如支付、订单、登录、物流
纵向拆分：
	把一个业务中的组件再细致拆分，比如支付系统拆分为微信支付、银联支付、支付宝支付
```

## 5.2 实现微服务的几个要素

```bash
微服务如何落地(docker)
微服务之间如何发现对方(注册中心、服务发现)
微服务之间如何访问对方(服务访问->resetful API)
微服务如何快速扩容(服务治理)
微服务如何监控(服务监控)
微服务如何升级与回滚(CI/CD)
微服务访问日志如何查看(ELK)
```

## 5.3 微服务开发环境

```bash
spring boot：是一个快速开发框架，内置Servlet
spring cloud：基于spring boot，为微服务体系开发中的架构问题，提供了一整套的解决方案--服务注册与发现，服务消费，服务保护与熔断，网关，分布式调用追踪，分布式配置管理等。
Dubbo：阿里巴巴开源的分布式服务治理框架，也具有服务注册与发现，服务消费等功能。
```

## 5.4 Dubbo

官方网站：https://dubbo.apache.org/zh/

### 5.4.1 生产者示例

```bash
[16:56:23 root@ka1 ~]#ls
dubbo-demo-provider-2.1.5-assembly.tar.gz
[16:56:33 root@ka1 ~]#mkdir /apps
[16:56:38 root@ka1 ~]#mv dubbo-demo-provider-2.1.5-assembly.tar.gz /apps/
[16:57:04 root@ka1 ~]#cd /apps/
[16:57:06 root@ka1 apps]#tar xf dubbo-demo-provider-2.1.5-assembly.tar.gz 
#修改配置文件
[16:58:46 root@ka1 dubbo-demo-provider-2.1.5]#cat conf/dubbo.properties
dubbo.registry.address=zookeeper://192.168.10.181:2181 | zookeeper://192.168.10.182:2181 | zookeeper://192.168.10.183:2181

#启动
[17:01:42 root@ka1 dubbo-demo-provider-2.1.5]#./bin/start.sh 
Starting the demo-provider .......
#日志
[17:03:38 root@ka1 ~]#tail  /apps/dubbo-demo-provider-2.1.5/logs/stdout.log 
Java HotSpot(TM) 64-Bit Server VM warning: ignoring option PermSize=128m; support was removed in 8.0
Java HotSpot(TM) 64-Bit Server VM warning: UseCMSCompactAtFullCollection is deprecated and will likely be removed in a future release.
log4j:WARN No appenders could be found for logger (com.alibaba.dubbo.common.logger.LoggerFactory).
log4j:WARN Please initialize the log4j system properly.
log4j:WARN See http://logging.apache.org/log4j/1.2/faq.html#noconfig for more info.
[2021-05-25 09:03:48] Dubbo service server started!
```

### 5.4.2  消费者示例

```bash
[17:05:25 root@ka2 ~]#ls
dubbo-demo-consumer-2.1.5-assembly.tar.gz
[17:05:30 root@ka2 ~]#mkdir /apps
[17:05:35 root@ka2 ~]#mv dubbo-demo-consumer-2.1.5-assembly.tar.gz /apps/
[17:05:50 root@ka2 ~]#cd /apps/
[17:05:55 root@ka2 apps]#tar xf dubbo-demo-consumer-2.1.5-assembly.tar.gz 
[17:05:58 root@ka2 apps]#cd dubbo-demo-consumer-2.1.5/

#修改配置文件
[17:07:16 root@ka2 dubbo-demo-consumer-2.1.5]#cat conf/dubbo.properties
dubbo.registry.address=zookeeper://192.168.10.181:2181 | zookeeper://192.168.10.182:2181 | zookeeper://192.168.10.183:2181
#启动
[17:07:19 root@ka2 dubbo-demo-consumer-2.1.5]#./bin/start.sh 
Starting the demo-consumer ....OK!
PID: 2245
STDOUT: logs/stdout.log

#验证日志
[17:08:04 root@ka2 dubbo-demo-consumer-2.1.5]#tail -f logs/stdout.log 
log4j:WARN Please initialize the log4j system properly.
log4j:WARN See http://logging.apache.org/log4j/1.2/faq.html#noconfig for more info.
[09:08:05] Hello world0, response form provider: 192.168.10.181:20880
[09:08:07] Hello world1, response form provider: 192.168.10.181:20880
```

## 5.5 dubbo admin

基于 zookeeper 发现并管理 provider 和 consumer。

### 5.5.1 部署dubbo admin

```bash
#先安装tomcat
[17:13:15 root@ka3 local]#cd /usr/local/tomcat/webapps/
[17:14:06 root@ka3 webapps]#rm -rf *
[17:14:17 root@ka3 webapps]#mkdir dubbo
[17:14:49 root@ka3 dubbo]#ls
dubbo-admin-2.4.1.war
[17:14:51 root@ka3 dubbo]#unzip dubbo-admin-2.4.1.war 
#修改配置
[17:18:04 root@ka3 dubbo]#pwd
/usr/local/tomcat/webapps/dubbo
[17:18:07 root@ka3 dubbo]#cat WEB-INF/dubbo.properties 
dubbo.registry.address=zookeeper://192.168.10.181:2181 | zookeeper://192.168.10.182:2181 | zookeeper://192.168.10.183:2181
dubbo.admin.root.password=root
dubbo.admin.guest.password=guest

#启动
[17:15:02 root@ka3 dubbo]#/usr/local/tomcat/bin/catalina.sh run
```

## 5.6 微服务编译

### 5.6.1 代码克隆与编译

官方说明：https://github.com/apache/dubbo-admin/blob/develop/README_ZH.md

```bash
#克隆代码
[17:36:10 root@ka3 ~]#git clone https://hub.fastgit.org/apache/dubbo-admin.git
```

### 5.6.2 准备部署maven

**Maven** 翻译为"专家"、"内行"，是 Apache 基金会旗下的一个纯 Java 开发的开源项目，Maven 是一个项目管理工具，可以对 Java 项目进行构建、解决打包依赖等。

**POM**( Project Object Model，项目对象模型 ) 是 Maven 工程的基本工作单元， 是一个 XML 文件，包含了项目的基本信息，用于描述项目如何构建，声明项目依赖等，在执行任务或目标时，Maven 会在当前目录中查找 pom 文件，通过读取 pom 文件获取所需的配置信息，然后执行目标。

Pom 文件中可以指定以下配置：

```bash
项目依赖
插件
执行目标
项目构建 profile
项目版本
项目开发者列表
相关邮件列表信息
```

官方安装文档：http://maven.apache.org/install.html

清华大学下载地址：https://mirrors.tuna.tsinghua.edu.cn/apache/maven/

Maven 是一个基于 Java 的工具所以服务器要安装 jdk 环境，版本要求如下

```bash
Maven 3.3 要求 JDK 1.7 或以上
Maven 3.2 要求 JDK 1.6 或以上
Maven 3.0/3.1 要求 JDK 1.5 或以上
```

**Maven部署**

```bash
#先安装jdk-1.8
[17:45:36 root@maven ~]#java -version
java version "1.8.0_281"
Java(TM) SE Runtime Environment (build 1.8.0_281-b09)
Java HotSpot(TM) 64-Bit Server VM (build 25.281-b09, mixed mode)
#安装maven
[17:46:12 root@maven ~]#ls
apache-maven-3.6.3-bin.tar.gz
[17:46:26 root@maven ~]#mkdir /apps/maven -p
[17:46:28 root@maven ~]#mv apache-maven-3.6.3-bin.tar.gz /apps/maven/
[17:46:48 root@maven ~]#cd /apps/maven/
[17:46:51 root@maven maven]#tar xf apache-maven-3.6.3-bin.tar.gz 
[17:47:53 root@maven maven]#pwd
/apps/maven
[17:47:56 root@maven maven]#ls
bin  boot  conf  lib  LICENSE  NOTICE  README.txt
#配置环境变量
[17:49:05 root@maven ~]#mvn -v
Apache Maven 3.6.3 (cecedd343002696d0abb50b32b541b8a6ba2883f)
Maven home: /apps/maven
Java version: 1.8.0_281, vendor: Oracle Corporation, runtime: /usr/local/jdk1.8.0_281/jre
Default locale: en_US, platform encoding: UTF-8
OS name: "linux", version: "4.15.0-76-generic", arch: "amd64", family: "unix"
#验证
[17:49:12 root@maven ~]#cat /etc/profile.d/maven.sh 
#!/bin/bash
export PATH=$PATH:/apps/maven/bin
```

**maven命令**

```bash
Maven 的打包命令
1.进入到包含有“pom.xml”的路径，执行：
	mvn clean install package
2.有的时候受到测试的干扰，导致无法正在进行编译，这时候可以选择跳过测试：
	mvn clean install package -Dmaven.test.skip=true
	" -Dmaven.test.skip=true"：跳过测试，并且不编译测试下的源代码；
	"-DskipTests"：不执行测试，但是会进行测试代码的编译；
3.如果需要编译的代码异常庞大，需要考虑对编译环境做一些处理，提成编译效率：
	启动多线程编译：mvn -T 4 clean install package -Dmaven.test.skip=true
	分配编译的 CPU 个数：mvn -T 2C clean install package -Dmaven.test.skip=true
	启用多线程编译：mvn clean install package -Dmaven.test.skip=true -Dmaven.compile.fork=true
4.所有的 Maven 都是建立在 JVM 上的，所以进行编译的时候还需要考虑 JVM 参数优化：
	如果是 windows 找到“maven/bin/mvn.cmd”，如果 linux 找到“maven/bin/mvn”，配置参数是：“MAVEN_OPTS”
	打开属性配置文件：vim /etc/profile
	追加一个配置项：export MAVEN_OPTS="-Xmx6g -Xms6g" 使配置立即生效：source/etc/profile
```

### 5.6.3 执行源码编译

```bash
[17:54:02 root@maven ~]#cd dubbo-admin/
#修改zookeeper 地址为实际
[17:58:11 root@maven dubbo-admin]#cat dubbo-admin-server/src/main/resources/application.properties
admin.registry.address=zookeeper://192.168.10.181:2181
admin.config-center=zookeeper://192.168.10.181:2181
admin.metadata-report.address=zookeeper://192.168.10.181:2181
#服务器修改 node.js 源为淘宝源
[17:58:11 root@maven dubbo-admin]#apt install npm
[18:02:54 root@maven ~]#cat .npmrc
registry =https://registry.npm.taobao.org
[18:02:57 root@maven ~]#npm config get registry 
https://registry.npm.taobao.org/

#执行编译
[18:47:55 root@maven dubbo-admin]#mvn clean install package -Dmaven.test.skip=true

#启动
[18:49:16 root@maven dubbo-admin]#cd dubbo-admin-server/target/
[18:49:38 root@maven target]#java -jar dubbo-admin-server-0.3.0-SNAPSHOT.jar
```

![image-20210525185051827](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210525185051827.png)

# 六、Nexus

Nexus 是一个强大的 Maven 仓库管理器，它极大地简化了自己内部仓库的维护和外部仓库的访问。

maven官方仓库地址：https://repo.maven.apache.org/

Nexus官方下载地址：https://help.sonatype.com/repomanager3/download

## 6.1 部署nexus

**内存推荐 4G 或以上，太小会导致无法启动。**

```bash
#需要先安装jdk1.8
[19:06:06 root@nexus ~]#ls
nexus-3.30.1-01-unix.tar.gz
[19:06:08 root@nexus ~]#mkdir /apps/nexus -p
[19:06:26 root@nexus ~]#mv nexus-3.30.1-01-unix.tar.gz /apps/nexus/
[19:06:31 root@nexus ~]#cd /apps/nexus/
[19:06:35 root@nexus nexus]#tar xf nexus-3.30.1-01-unix.tar.gz

#启动
[19:10:21 root@nexus nexus-3.30.1-01]#/apps/nexus/nexus-3.30.1-01/bin/nexus --help
```

**登录验证**

http://192.168.10.184:8081/

**初始化密码**

```bash
#这里是查询默认admin用户密码登录之后需要修改
[19:12:42 root@nexus ~]#cat /apps/nexus/sonatype-work/nexus3/admin.password
d9ee323f-506a-486d-876c-37bc1e2f6dcf
```

**允许匿名下载**

```bash
启用匿名访问将默认允许未经授权的下载，浏览和搜索存储库内容，可以通过编辑分配给匿名用户的角色来更改未经身份验证的用户的权限。
```

![image-20210525192343004](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210525192343004.png)

**验证默认仓库**

```bash
Hosted：本地仓库，通常我们会部署自己的构件到这一类型的仓库，比如公司的第三方库
Proxy：代理仓库，它们被用来代理远程的公共仓库，如 maven 中央仓库(官方仓库)。
Group：仓库组，用来合并多个 hosted/proxy 仓库，当你的项目希望在多个repository 使用资源时就不需要多次引用了，只需要引用一个 group 即可。
```

![image-20210525192509371](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210525192509371.png)

## 6.2 使用 nexus 构建私有 yum 仓库

```bash
通过 nexus 作为公司内网 yum 仓库,通过阿里云镜像安装包
```

setting--Create repository—yum(proxy)

![image-20210525193815542](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210525193815542.png)

**测试**

```bash
[19:37:48 root@centos7 yum.repos.d]#cat CentOS-Base.repo 
[base]
name=CentOS7
baseurl=http://192.168.10.184:8081/repository/centos7/
enable=1
[19:38:55 root@centos7 yum.repos.d]#yum list
```

![image-20210525194232562](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210525194232562.png)

## 6.3 修改 nexus 数据目录

将 nexus 的数据目录修改为/data

![image-20210525194343985](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210525194343985.png)

**产生数据**

```bash
[19:44:57 root@centos7 yum.repos.d]#yum list
#验证data目录下数据
[19:44:45 root@nexus ~]#ls /data/
8E9CAF4E-489A00A4-A143549D-5DB5481A-FCEA2762-deletions.index     content
8E9CAF4E-489A00A4-A143549D-5DB5481A-FCEA2762-metrics.properties  metadata.properties
```

## 7.4 nexus数据备份

Nexus 中普通数据信息和元数据是分开存储的，普通数据是保存在 blob 中，而元数据保存在数据库中，所以在备份的时候必须同时进行备份普通数据和元数据， 才能在后期恢复数据的时候保证数据的最终完整性。

```bash
blob 数据：
普通数据信息在 Nexus 中是保存在 blob 中的，所以此部分数据必须进行备份，blob 的典型配置中，此目录对应着 Nexus 的数据目录的 blobs 子目录。

元数据：
元数据在 Nexus 中是在数据库中进行保存的，为了保证数据的完整性，Nexus 需要同时将数据库中的数据进行导出和备份
```

### 7.4.1 nexus 备份配置

**添加存储用于保存备份数据**

![image-20210525195606330](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210525195606330.png)

**nexus blob 备份计划任务**

![image-20210525195826585](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210525195826585.png)

**nexus 元数据备份计划任务**

![image-20210525200015670](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210525200015670.png)

---
title: "ELK日志系统"
date: 2021-05-31T20:16:43+08:00
draft: false
description: "以 Elasticsearch、Logstash、Kibana 与 Filebeat 为核心，完成日志采集、存储和可视化链路。"
cover: "https://b3logfile.com/bing/20190812.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["应用服务"]
tags: ["elasticsearch", "logstash", "kibana", "filebeat"]
toc: true
---
**什么是ELK？**

通俗来讲，ELK 是由 Elasticsearch、Logstash、Kibana 三个开源软件的组成的 一个组合体，ELK 是 elastic 公司研发的一套完整的日志收集、分析和展示的企业级解决方案，在这三个软件当中，每个软件用于完成不同的功能，ELK 又称为 ELK stack，官方域名为 elastic.co，ELK stack 的主要优点有如下几个：

```bash
处理方式灵活： elasticsearch 是实时全文索引，具有强大的搜索功能 
配置相对简单：elasticsearch 的 API 全部使用 JSON 接口，logstash 使用模块配置，kibana 的配置文件部分更简单。 
检索性能高效：基于优秀的设计，虽然每次查询都是实时，但是也可以达到百 亿级数据的查询秒级响应。 
集群线性扩展：elasticsearch 和 logstash 都可以灵活线性扩展 
前端操作绚丽：kibana 的前端设计比较绚丽，而且操作简单
```

**什么是 Elasticsearch**

是一个高度可扩展的开源全文搜索和分析引擎，它可实现数据的实时全文搜索搜索、支持分布式可实现高可用、提供 API 接口，可以处理大规模日志数据，比 如Nginx、Tomcat、系统日志等功能。

Elasticsearch 使用 Java 语言开发，是建立在全文搜索引擎 Apache Lucene 基础之上的搜索引擎，https://lucene.apache.org/

Elasticsearch 的特点

```bash
实时搜索、实时分析
分布式架构、实时文件存储
文档导向，所有对象都是文档
高可用，易扩展，支持集群，分片与复制
接口友好，支持 json
```

**什么是 Logstash**

Logstash 是一个具有实时传输能力的数据收集引擎，其可以通过插件实现日志收集和转发，支持日志过滤，支持普通 log、自定义 json 格式的日志解析，最终把经过处理的日志发送给 elasticsearch。

**什么是 kibana**

Kibana 为 elasticsearch 提 供 一个查看数据的 web 界 面 ， 其主要是通过 elasticsearch 的 API 接口进行数据查找，并进行前端数据可视化的展现，另外还可以针对特定格式的数据生成相应的表格、柱状图、饼图等。

**为什么使用 ELK**

ELK 组件在海量日志系统的运维中，可用于解决以下主要问题：

- 分布式日志数据统一收集，实现集中式查询和管理
- 故障排查
- 安全信息和事件管理
- 报表功能

**ELK 的好处**

ELK 组件在大数据运维系统中，主要可解决的问题如下：

- 日志查询，问题排查，故障恢复，故障自愈
- 应用日志分析，错误报警
- 性能分析，用户行为分析

**ELK使用场景，及架构**

![image-20210527133510824](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210527133510824.png)

# 一、elasticsearch部署

官方网站：https://github.com/elastic/elasticsearch

## 1.1 环境初始化

- 修改主机名
- 关闭防火墙与selinux
- 配置jdk，jdk版本需要去官网查看你安装的版本所需那个jdk版本，查看网站https://www.elastic.co/cn/support/matrix#matrix_jvm

## 1.2 官方下载elasticsearch并安装

官方下载地址：https://www.elastic.co/cn/downloads/past-releases#elasticsearch

我这里下载7.12.1版本的deb包

### 1.2.1 俩台服务器安装elasticsearch

```bash
#这里选择带jdk版本的elasticsearch
[11:29:59 root@es1 ~]#dpkg -i elasticsearch-7.12.1-amd64.deb

[11:27:11 root@es2 ~]#dpkg -i elasticsearch-7.12.1-amd64.deb
```

### 1.2.2 编辑各 elasticsearch 服务器的服务配置文件

配置文档说明：https://www.ibm.com/docs/zh/bpm/8.5.6?topic=service-elasticsearch-configuration-properties

```bash
#es1
[11:37:06 root@es1 ~]#grep "^[a-Z]" /etc/elasticsearch/elasticsearch.yml
cluster.name: ELK-Cluster
node.name: elk-node1
path.data: /elk/data
path.logs: /elk/logs
network.host: 192.168.10.181
http.port: 9200
discovery.seed_hosts: ["192.168.10.181", "192.168.10.182"]
cluster.initial_master_nodes: ["192.168.10.181", "192.168.10.182"]
#创建数据目录
[11:43:22 root@es1 ~]#mkdir /elk
[11:43:27 root@es1 ~]#chown elasticsearch: /elk


#es2
[11:41:13 root@es2 ~]#grep "^[a-Z]" /etc/elasticsearch/elasticsearch.yml
cluster.name: ELK-Cluster
node.name: elk-node2
path.data: /elk/data
path.logs: /elk/logs
network.host: 192.168.10.182
http.port: 9200
discovery.seed_hosts: ["192.168.10.181", "192.168.10.182"]
cluster.initial_master_nodes: ["192.168.10.181", "192.168.10.182"]
#创建数据目录
[11:42:37 root@es2 ~]#mkdir /elk
[11:43:50 root@es2 ~]#chown elasticsearch: /elk
```

### 1.2.3 启动服务

```bash
#es1
[11:43:35 root@es1 ~]#systemctl start elasticsearch.service
[11:46:25 root@es1 ~]#ss -ntl | grep 192.168.10.181
LISTEN 0       20480       [::ffff:192.168.10.181]:9300                 *:*   
LISTEN 0       20480       [::ffff:192.168.10.181]:9200                 *:* 

#es2
[11:43:56 root@es2 ~]#systemctl start elasticsearch.service
[11:46:46 root@es2 ~]#ss -ntl | grep 192.168.10.182
LISTEN 0       20480       [::ffff:192.168.10.182]:9200                 *:*   
LISTEN 0       20480       [::ffff:192.168.10.182]:9300                 *:* 
```

**通过浏览器访问elasticsearch 服务端口**

![image-20210527115156566](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210527115156566.png)

## 1.3 elasticsearch配置文件说明

```bash
cluster.name: ELK-Cluster    #ELK 的集群名称，名称相同即属于是同一个集群
node.name: elk-node1         #当前节点在集群内的节点名称
path.data: /elk/data         #ES 数据保存目录
path.logs: /elk/logs         #ES 日志保存目录
bootstrap.memory_lock: true  #服务启动的时候锁定足够的内存，防止数据写入swap
network.host: 192.168.10.181 #监听 IP
http.port: 9200              #监听端口
#集群中 node 节点发现列表
discovery.seed_hosts: ["192.168.10.181", "192.168.10.182"]
#集群初始化那些节点可以被选举为 master
cluster.initial_master_nodes: ["192.168.10.181", "192.168.10.182"]



#2.x 5.x 6.x 配置节点发现列表
discovery.zen.ping.unicast.hosts: ["192.168.15.11", "192.168.15.12"]
#一个集群中的 N 个节点启动后,才允许进行数据恢复处理，默认是 1
gateway.recover_after_nodes: 2
```

## 1.4 修改内存限制，并同步配置文件

内存锁定的配置参数

```bash
#修改配置文件
[11:55:57 root@es1 ~]#vim /etc/elasticsearch/jvm.options
-Xms1g
-Xmx1g
#修改service文件
[11:56:16 root@es1 ~]#vim /usr/lib/systemd/system/elasticsearch.service
[Service]
LimitMEMLOCK=infinity 
#重启服务
[11:57:58 root@es1 ~]#systemctl daemon-reload 
[11:58:02 root@es1 ~]#systemctl restart elasticsearch.service 
```

## 1.5 安装 elasticsearch 插件之head

谷歌浏览器安装elasticsearch 插件

插件下载地址：https://chrome.google.com/webstore/category/extensions?hl=zh-CN

![image-20210527120255724](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210527120255724.png)

打开插件连接elasticsearch

![image-20210527120418245](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210527120418245.png)

## 1.6 Master 与 Slave 的区别

**Master 的职责**： 统计各 node 节点状态信息、集群状态信息统计、索引的创建和删除、索引分配 的管理、关闭 node 节点等

**Slave 的职责**：从 master 同步数据、等待机会成为 Master

## 1.7 cerebro

新开源的 elasticsearch 集群 web 管理程序，0.9.3 及之前的版本需要 java 8 或者 更高版本，0.9.4 开始就需要 java 11 或更高版本，具体参考 github 地址

```bash
#我这里安装jdk1.8，cerebro0.9.3
[12:34:18 root@cerebro ~]#mkdir /apps
[12:34:43 root@cerebro ~]#mv cerebro-0.9.4.zip /apps/
[12:34:46 root@cerebro ~]#cd /apps/
[12:34:49 root@cerebro apps]#unzip cerebro-0.9.4.zip
#修改配置文件
[12:36:42 root@cerebro apps]#vim cerebro-0.9.4/conf/application.conf
hosts = [ 
  {
    host = "http://192.168.10.181:9200"
    name = "zhangzhuo"                                                             #  headers-whitelist = [ "x-proxy-user", "x-proxy-roles", "X-Forwarded-For" 
  }
]
#启动
[12:38:40 root@cerebro apps]#./cerebro-0.9.4/bin/cerebro
```

**登录验证**

![image-20210527123954876](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210527123954876.png)

## 1.8 监控 elasticsearch 集群状态

官方文档：https://www.elastic.co/guide/cn/elasticsearch/guide/current/_cluster_health.html

### 1.8.1 通过 shell 命令获取集群状态

```bash
[13:23:57 root@cerebro bin]#curl -sXGET http://192.168.10.181:9200/_cluster/health?pretty=true
{
  "cluster_name" : "ELK-Cluster",
  "status" : "green",
  "timed_out" : false,
  "number_of_nodes" : 2,
  "number_of_data_nodes" : 2,
  "active_primary_shards" : 0,
  "active_shards" : 0,
  "relocating_shards" : 0,
  "initializing_shards" : 0,
  "unassigned_shards" : 0,
  "delayed_unassigned_shards" : 0,
  "number_of_pending_tasks" : 0,
  "number_of_in_flight_fetch" : 0,
  "task_max_waiting_in_queue_millis" : 0,
  "active_shards_percent_as_number" : 100.0
}
#获取到的是一个 json 格式的返回值，那就可以通过 python 对其中的信息进行分析，例如对 status 进行分析，如果等于 green(绿色)就是运行在正常，等于 yellow(黄色)表示副本分片丢失，red(红色)表示主分片丢失
```

### 1.8.2 python 脚本

```bash
[13:30:19 root@cerebro bin]#cat 1.py 
#/bin/env python3
import subprocess
body=""
false="false"

obj = subprocess.Popen(("curl -sXGET http://192.168.10.181:9200/_cluster/health?pretty=true"),shell=True,stdout=subprocess.PIPE)
data = obj.stdout.read()
data1 = eval(data)
status = data1.get("status")
if status == "green":
    print("50")    #50表示正常
else:
    print("100")   #100表示不正常

#执行结果
[13:30:40 root@cerebro bin]#python3 1.py 
50
```

## 1.9 elasticsearch 的index分片

index默认分片为1，默认副本数为1，如果elasticsearch是集群模式，有多台主机组成，如果想提高性能需要修改默认分区数量

优化：分区数量<=es集群主机数量

```bash
#优化命令
PUT /_template/template_otosaas_default
{
  "index_patterns": ["*"],   #这里填写index名称匹配到的应用
  "order" : 0,               #优先级0表示最高优先级
  "settings": {
    "number_of_shards": 1    #默认分区数量，最好的性能为分区数与elasticsearch集群主机数量一致
    ,"number_of_replicas": 1  #默认副本数量就为1可以不用写，如果想要提高安全性可以修改
  }
}
```

**执行位置需要去kibana中执行**

# 二、部署logstash

## 2.1 logstash 环境准备及安装

Logstash 是一个开源的数据收集引擎，可以水平伸缩，而且 logstash 整个 ELK 当中拥有最多插件的一个组件，其可以接收来自不同来源的数据并统一输出到指 定的且可以是多个不同目的地。

官方github地址：https://github.com/elastic/logstash

### 2.1.1 环境准备

- 关闭防火墙和selinux
- 安装jdk，官方依赖地址：https://www.elastic.co/cn/support/matrix#matrix_jvm
- 安装的logstash的版本需和elasticsearch版本一致
- 配置hosts解析

```bash
#需在/etc/hosts中解析当前主机名的ip地址
[14:21:26 root@cerebro ~]#hostname
cerebro.zhangzhuo.org
[14:21:29 root@cerebro ~]#cat /etc/hosts
192.168.10.183 cerebro.zhangzhuo.org
#如果不解析收集的日志会出现host字段为0.0.0.0
{
      "@version" => "1",  
       "message" => "zhangzhuo", 
          "host" => "0.0.0.0",  
    "@timestamp" => 2021-05-27T05:48:36.164Z
}
```

### 2.1.2 安装logstash

```bash
#下载安装带jdk的logstash的deb包
[13:44:07 root@cerebro ~]#ls
logstash-7.12.1-amd64.deb
[13:44:08 root@cerebro ~]#dpkg -i logstash-7.12.1-amd64.deb
```

### 2.1.3 测试logstash

#### 2.1.3.1 测试标准输入和输出

```bash
[13:44:32 root@cerebro ~]#/usr/share/logstash/bin/logstash -e 'input { stdin{} } output{ stdout{ codec =>rubydebug}}' #标准输入和输出
zhangzhuo
zhangzhuo
{
       "message" => "zhangzhuo",  #消息的具体内容
      "@version" => "1",   #事件版本号，一个事件就是一个 ruby 对象
          "host" => "cerebro.zhangzhuo.org",  #标记事件发生在哪里
    "@timestamp" => 2021-05-27T06:23:28.005Z  #当前事件的发生时间
} 
```

#### 2.1.3.2 测试输出到文件

```bash
[13:49:45 root@cerebro ~]#/usr/share/logstash/bin/logstash -e 'input{ stdin{}} output{ file { path =>"/tmp/log-%{+YYYY.MM.dd}.log"}}'
zhangzhuo
[INFO ] 2021-05-27 06:25:39.909 [[main]>worker1] file - Opening file {:path=>"/tmp/log-2021.05.27.log"}
#打开文件验证
[14:25:51 root@cerebro ~]#cat /tmp/log-2021.05.27.log 
{"message":"zhangzhuo","@timestamp":"2021-05-27T06:25:39.593Z","@version":"1","host":"cerebro.zhangzhuo.org"}
```

#### 2.1.3.3 测试输出到 elasticsearch

```bash
[13:53:23 root@cerebro ~]#/usr/share/logstash/bin/logstash -e 'input{ stdin{}} output{ elasticsearch { hosts => ["192.168.10.181:9200"] index =>"mytest-%{+YYYY.MM.dd}" }}'
zhangzhuo
cy
#elasticsearch 服务器验证收到数据
[14:26:23 root@es1 ~]#ll /elk/data/nodes/0/indices/
total 12
drwxr-xr-x 4 elasticsearch elasticsearch 4096 May 27 14:26 zlTkvSLgTP24KSu-rl_cEw/
```

**浏览器插件验证数据**

![image-20210527142739237](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210527142739237.png)

# 三、kibana 部署

Kibana 是一款开源的数据分析和可视化平台，它是 Elastic Stack 成员之一，设计用于和 Elasticsearch 协作,可以使用 Kibana 对 Elasticsearch 索引中的数据进行搜索、查看、交互操作,您可以很方便的利用图表、表格及地图对数据进行多元化的分析和呈现。

github官方地址：https://github.com/elastic/kibana

Kibana 可以使大数据通俗易懂。它很简单，基于浏览器的界面便于您快速创建和分享动态数据仪表板来追踪 Elasticsearch 的实时数据变化。

## 3.1 安装并配置kibana

可以通过 deb 包或者二进制的方式进行安装

- 关闭防火墙和selinux
- 安装的kibana的版本需和elasticsearch版本一致

```bash
#配置主机名称和地址解析
[14:42:04 root@ubuntu18-04 ~]#hostnamectl set-hostname kibana.zhangzhuo.org
[14:42:46 root@ubuntu18-04 ~]#echo "192.168.10.183 kibana.zhangzhuo.org" >>/etc/hosts
#deb安装
[14:44:32 root@kibana ~]#dpkg -i kibana-7.12.1-amd64.deb

#修改配置文件
[14:46:54 root@kibana ~]#grep "^[a-Z]" /etc/kibana/kibana.yml
server.port: 5601   #监听端口
server.host: "192.168.10.183"  #监听地址
elasticsearch.hosts: ["http://192.168.10.181:9200"]  #elasticsearch 服务地址
i18n.locale: "zh-CN"  #支持中文

#启动服务
[14:48:12 root@kibana ~]#systemctl enable --now kibana.service

[14:48:33 root@kibana ~]#ss -ntl | grep 5601
LISTEN   0         511           192.168.10.183:5601             0.0.0.0:*
```

## 3.2 验证状态

http://192.168.10.183:5601/status

![image-20210527144949308](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210527144949308.png)

## 3.3 添加索引

![image-20210527150122758](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210527150122758.png)

**验证数据**

![image-20210527150216193](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210527150216193.png)

**head插件验证数据**

![image-20210527150329458](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210527150329458.png)

# 四、通过 logstash 收集日志

logstash收集日志是通过各种插件来实现

官方帮助文档：https://www.elastic.co/guide/en/logstash/7.12/index.html

**查看自带的所有插件**

```bash
[15:39:50 root@kibana ~]#/usr/share/logstash/bin/logstash-plugin list
logstash-codec-avro
logstash-codec-cef
.....
```

## 4.1 收集单个系统日志文件并输出至文件

前提需要logstash用户对被收集的日志文件有读的权限并对写入的文件有写权限。可以直接使用root运行。

file模块的官方说明：https://www.elastic.co/guide/en/logstash/7.12/plugins-inputs-file.html

### 4.1.1 logstash配置文件

```bash
[15:06:12 root@kibana ~]#vim /etc/logstash/conf.d/system-log.conf
input {  
  file {
    type =>"messagelog"     #写入的文件类型
    path => "/var/log/syslog"  #从那个文件写入
    start_position => "beginning"  #第一次从头收集，之后从新添加的日志收集，默认只收集最新的
    stat_interval  => 3  #几秒收集一次，默认秒
  }
}
output {
  file {
    path =>"/tmp/%{type}.%{+YYYY.MM.dd}"  #收集后输入到文件
  }
}
```

### 4.1.2 检测配置文件语法是否正确

```bash
[15:08:49 root@kibana ~]#/usr/share/logstash/bin/logstash -f /etc/logstash/conf.d/system-log.conf -t
Configuration OK  #出现这个说明没有问题
[INFO ] 2021-05-27 07:13:00.945 [LogStash::Runner] runner - Using config.test_and_exit mode. Config Validation Result: OK. Exiting Logstash
```

### 4.1.3 授权程序可以读取/var/log/syslog文件

```bash
#可以修改权限，这里直接修改程序的运行身份
[15:18:42 root@kibana ~]#vim /etc/systemd/system/logstash.service
User=root
Group=root
```

### 4.1.4 启动测试

```bash
[15:20:52 root@kibana ~]#systemctl start logstash.service
#验证生成的文件
[15:20:48 root@kibana ~]#ll /tmp/messagelog.2021.05.27 -h
-rw-r--r-- 1 root root 3.3M May 27 15:20 /tmp/messagelog.2021.05.27

#启动的日志文件
[15:23:14 root@kibana ~]#tail -f /var/log/logstash/logstash-plain.log
[2021-05-27T07:23:03,014][INFO ][logstash.agent           ] Pipelines running {:count=>1, :running_pipelines=>[:main], :non_running_pipelines=>[]}
[2021-05-27T07:23:03,570][INFO ][logstash.outputs.file    ][main][729285607e04beb3c88e398a92dae93481a4bffabc2021fc2ac6a8cafb462529] Opening file {:path=>"/tmp/messagelog.2021.05.27"}
```

### 4.1.5 日志收集位置

每次收集日志会在文件中记录上次收集到了文件的那个位置

```bash
#这个文件由程序自己维护
[16:30:46 root@kibana ~]#tail /var/lib/logstash/plugins/inputs/file/.sincedb_f5fdf6ea0ea92860c6a6b2b354bfcbbc 
277287 0 2050 1475997 1622104244.288568 /var/log/syslog
```

## 4.2 通过 logstash 收集多个日志文件

elasticsearch插件官方说明：https://www.elastic.co/guide/en/logstash/7.12/plugins-outputs-elasticsearch.html

### 4.2.1 Logstash配置文件

```bash
[16:40:03 root@kibana ~]#cat /etc/logstash/conf.d/system-log.conf 
input {
  file {
    type =>"syslog"
    path => "/var/log/syslog"
    start_position => "beginning"
    stat_interval => 3
  }
  file {
    type =>"logstashlog"    #type后面用来区分日志类型
    path =>"/var/log/logstash/logstash-plain.log"
    start_position => "beginning"
    stat_interval => 3
  }
}
output {
  if [type] == "syslog" {        #这里可以判断type把不同的日志写到不同的elasticsearch的索引中
  elasticsearch {
    hosts => ["192.168.10.181:9200"]
    index => "system-log-%{+YYYY.MM.dd}"  #这里表示每天生成一个新的索引，如果需要1周或一个月才生成新的索引请更改后面的日期变量
  }}
  if [type] == "logstashlog"{
  elasticsearch {
    hosts => ["192.168.10.182:9200"]
    index => "logstash-log-%{+YYYY.MM.dd}"   
  }}
}
#测试配置文件
[16:39:02 root@kibana ~]#/usr/share/logstash/bin/logstash -f /etc/logstash/conf.d/system-log.conf -t
Configuration OK
```

### 4.2.1  启动服务

```bash
[16:51:59 root@kibana ~]#systemctl start logstash.service 

#查看启动日志
[16:53:03 root@kibana ~]#tail -f /var/log/logstash/logstash-plain.log
[2021-05-27T08:52:49,371][INFO ][logstash.agent           ] Pipelines running {:count=>1, :running_pipelines=>[:main], :non_running_pipelines=>[]}

#查看记录日志
[16:52:21 root@kibana ~]#cat /var/lib/logstash/plugins/inputs/file/.sincedb_*
409405 0 2050 85150 1622105570.567695 /var/log/logstash/logstash-plain.log
277287 0 2050 1505943 1622105576.209615 /var/log/syslog
```

**浏览器插件验证数据**

![image-20210527165731926](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210527165731926.png)

## 4.3 通过 logtsash 收集 tomcat 和 java 日志

收集 Tomcat 服务器的访问日志以及 Tomcat 错误日志进行实时统计，在 kibana 页面进行搜索展现，每台 Tomcat 服务器要安装 logstash 负责收集日志，然后将日志转发给 elasticsearch 进行分析，在通过 kibana 在前端展现，配置过程如下

**环境准备**

- 安装配置tomcat服务器
- 修改tomcat服务器访问日志格式为json

### 4.3.1 安装配置tomcat服务器

```bash
#我这里配置俩太tomcat服务器
192.168.10.184  web1.zhangzhuo.org
192.168.10.183  web2.zhangzhuo.org

#安装tomcat这里略过....

#生成访问页面
#web1
[14:43:01 root@web1 ~]#rm -rf /usr/local/tomcat/webapps/*
[14:44:27 root@web1 ~]#mkdir /usr/local/tomcat/webapps/app1
[14:44:56 root@web1 ~]#echo "web1.zhangzhuo.org" > /usr/local/tomcat/webapps/app1/index.html
#web2
[14:44:37 root@web2 ~]#rm -rf /usr/local/tomcat/webapps/*
[14:44:42 root@web2 ~]#mkdir /usr/local/tomcat/webapps/app1
[14:45:32 root@web2 ~]#echo "web2.zhangzhuo.org" > /usr/local/tomcat/webapps/app1/index.html

#启动服务测试
[14:46:53 root@web1 ~]#curl 192.168.10.184:8080/app1/
web1.zhangzhuo.org
[14:47:04 root@web1 ~]#curl 192.168.10.185:8080/app1/
web2.zhangzhuo.org
```

### 4.3.2 tomcat 访问日志转json格式

```bash
#俩太主机修改tomcat配置文件
        <Valve className="org.apache.catalina.valves.AccessLogValve" directory="logs"
              prefix="tomcat_access_log" suffix=".log" 
              pattern="{"clientip":"%h","ClientUser":"%l","authenticated":"%u","AccessTime":"%t","method":"%r","status":"%s","SendBytes":"%b","Query?string":"%q","partner":"%{Referer}i","AgentVersion":"%{User-Agent}i"}"/>
#修改日志时区
[14:53:41 root@web1 ~]#vim /usr/local/tomcat/bin/catalina.sh
JAVA_OPTS='-Duser.timezone=GMT+08'

#重启服务
[14:54:06 root@web1 ~]#systemctl restart tomcat
#测试
[14:54:10 root@web1 ~]#curl 192.168.10.184:8080/app1/
web1.zhangzhuo.org
#验证日志
[14:54:23 root@web1 ~]#cat /usr/local/tomcat/logs/tomcat_access_log.2021-05-28.log 
{"clientip":"192.168.10.184","ClientUser":"-","authenticated":"-","AccessTime":"[28/May/2021:14:54:23 +0800]","method":"GET /app1/ HTTP/1.1","status":"200","SendBytes":"19","Query?string":"","partner":"-","AgentVersion":"curl/7.58.0"}
```

浏览器验证json格式是否正确网站：https://www.json.cn/

![image-20210528145602767](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210528145602767.png)

### 4.3.3 配置logstash收集tomcat访问日志

```bash
#配置访问日志
[15:05:15 root@web1 ~]#cat /etc/logstash/conf.d/tomcat.conf 
input {
  file {
    path => "/usr/local/tomcat/logs/tomcat_access_log.*.log"
    start_position => "end"
    type => "tomcat-access-log"
    codec => json      #这里可以格式化json数据，如果无法匹配则会安装doc处理
    stat_interval => 3
  }
}
output {
  if [type] == "tomcat-access-log" {
    elasticsearch {
      hosts => ["192.168.10.181:9200"]
      index => "tomcat-access-log-%{+YYYY.MM.dd}"
    }
  }
}
#测试
[15:04:26 root@web1 ~]#/usr/share/logstash/bin/logstash -f /etc/logstash/conf.d/tomcat.conf -t
Configuration OK
#启动
[15:05:34 root@web1 ~]#systemctl restart logstash.service
```

**浏览器插件验证数据**

![image-20210528150806512](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210528150806512.png)

### 4.3.4 收集 java 日志

java日志的一些报错信息会有一个报错信息占多行的情况，如果不加以处理直接默认收集会导致查看日志一个报错会被分成多行在es中现在，造成难以查看的情况

使用codec的multiline插件实现多行匹配，这是一个可以将多行进行合并的插件， 而且可以使用 what 指定将匹配到的行与前面的行合并还是和后面的行合并

官方帮助：https://www.elastic.co/guide/en/logstash/current/plugins-codecs-multiline.html

**编辑logstash配置文件**

```bash
input {
  file {
    path => "/usr/local/tomcat/logs/catalina.*log"
    type => "java-log"
    start_position => "beginning"
    stat_interval => 3
    codec => multiline {
      pattern => "^*-*-*"   #当遇到特定开头的行时候将多行进行合并，这里可以写正则表达式
      negate => true        #true 为匹配成功进行操作，false 为不成功进行操作
      what => "previous"    #与以前的行合并，如果是下面的行合并就是 next
    }
  }
}
output {
  if [type] == "java-log" {
    elasticsearch {
      hosts => ["192.168.10.181:9200"]
      index => "java-log-%{+YYYY.MM.dd}"
    }
  }
}
#测试
[15:33:32 root@web1 ~]#/usr/share/logstash/bin/logstash -f /etc/logstash/conf.d/tomcat.conf -t
Configuration OK
#启动
[15:37:01 root@web1 ~]#systemctl restart logstash.service 
```

**插件验证数据**

![image-20210528153923408](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210528153923408.png)

## 4.4 nginx 访问日志

### 4.4.1 安装配置nginx

```bash
#安装nginx略过....

#配置nginx访问日志格式为json
    log_format access_json '{"@timestamp":"$time_iso8601",'
                            '"host":"$server_addr",'
                            '"clientip":"$remote_addr",'
                            '"size":$body_bytes_sent,'
                            '"responsetime":$request_time,'
                            '"upstreamtime":"$upstream_response_time",'
                            '"upstreamhost":"$upstream_addr",'
                            '"http_host":"$host",'
                            '"url":"$uri",'
                            '"domain":"$host",'
                            '"xff":"$http_x_forwarded_for",'
                            '"referer":"$http_referer",'
                            '"status":"$status"}';
    access_log  logs/access.log  access_json;

#测试配置文件
[15:57:58 root@web1 ~]#/apps/nginx/sbin/nginx -t
nginx: the configuration file /apps/nginx/conf/nginx.conf syntax is ok
nginx: configuration file /apps/nginx/conf/nginx.conf test is successful
#启动服务
[15:57:58 root@web1 ~]#/apps/nginx/sbin/nginx
#验证
[15:58:16 root@web1 ~]#curl 192.168.10.184
[15:58:22 root@web1 ~]#cat /apps/nginx/logs/access.log 
{"@timestamp":"2021-05-28T15:58:22+08:00","host":"192.168.10.184","clientip":"192.168.10.184","size":612,"responsetime":0.000,"upstreamtime":"-","upstreamhost":"-","http_host":"192.168.10.184","url":"/index.html","domain":"192.168.10.184","xff":"-","referer":"-","status":"200"}
```

### 4.4.2 配置logstash 收集 nginx 访问日志

```bash
[16:07:38 root@web1 ~]#cat /etc/logstash/conf.d/nginx.conf
input {
  file {
    path => "/apps/nginx/logs/access.log"
    start_position => "end"
    type => "nginx-accesslog"
    codec => json
    stat_interval => 3
  }
  file {
    path => "/apps/nginx/logs/error.log"
    start_position => "end"
    type => "nginx-errorlog"
    stat_interval => 3
  }
}
output {
  if [type] == "nginx-accesslog" {
    elasticsearch {
      hosts => ["192.168.10.181:9200"]
      index => "nginx-accesslog-%{+YYYY.MM.dd}"
    }
  }
  if [type] == "nginx-errorlog" {
    elasticsearch {
      hosts => ["192.168.10.181:9200"]
      index => "nginx-errorlog-%{+YYYY.MM.dd}"
    }
  }
}
#测试
[16:05:36 root@web1 ~]#/usr/share/logstash/bin/logstash -f /etc/logstash/conf.d/nginx.conf -t
Configuration OK
#重启服务
[16:07:54 root@web1 ~]#systemctl restart logstash.service
```

**浏览器插件检查数据**

![image-20210528161057779](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210528161057779.png)

## 4.5 收集 TCP/UDP 日志

通过 logstash 的 tcp/udp 插件收集日志，通常用于在向 elasticsearch 日志补录丢失的部分日志，可以将丢失的日志写到一个文件，然后通过 TCP 日志收集方式直 接发送给 logstash 然后再写入到 elasticsearch 服务器。

官方说明：https://www.elastic.co/guide/en/logstash/5.6/input-plugins.html

### 4.5.1 logstash 配置文件，先进行收集测试

```bash
[16:41:17 root@web1 ~]#cat /etc/logstash/conf.d/tcp.conf
input {
  tcp {
    port => 12345
    type => "tcplog"
    mode => "server"
  }
}
output {
  stdout {}
}
#二进制启动服务
[16:41:20 root@web1 ~]#/usr/share/logstash/bin/logstash -f /etc/logstash/conf.d/tcp.conf

#验证端口是否启动成功
[16:42:38 root@web1 ~]#ss -ntl | grep 12345
LISTEN  0        1024                         *:12345                  *:*
```

### 4.5.2 在其他服务器安装 nc 命令

NetCat 简称 nc，在网络工具中有“瑞士军刀”美誉，其功能实用，是一个简单、 可靠的网络工具，可通过 TCP 或 UDP 协议传输读写数据，另外还具有很多其他功能。

```bash
#nc发送消息
[16:10:52 root@web2 ~]#echo "zhangzhuo" | nc 192.168.10.184 12345
#二进制启动的服务显示
{
       "message" => "zhangzhuo",
          "host" => "192.168.10.185",
    "@timestamp" => 2021-05-28T08:43:48.046Z,
          "type" => "tcplog",
          "port" => 56453,
      "@version" => "1"
}

#发送一个文件内容
[16:45:07 root@web2 ~]#cat /etc/fstab | nc 192.168.10.184 12345
```

### 4.5.3 通过伪设备的方式发送消息

在类 Unix 操作系统中，块设备有硬盘、内存的硬件，但是还有设备节点并不 一定要对应物理设备，我们把没有这种对应关系的设备是伪设备，比如/dev/null， /dev/zero，/dev/random 以及/dev/tcp 和/dev/upd 等，Linux 操作系统使用这些伪 设备提供了多种不通的功能，tcp 通信只是 dev 下面众多伪设备当中的一种设备。

```bash
#发送消息
[16:45:33 root@web2 ~]#echo "zhangzhuo" >/dev/tcp/192.168.10.184/12345

#验证消息
{
       "message" => "zhangzhuo",
          "host" => "192.168.10.185",
    "@timestamp" => 2021-05-28T08:46:31.770Z,
          "type" => "tcplog",
          "port" => 56457,
      "@version" => "1"
}
```

## 4.6 通过 rsyslog 收集 haproxy日志

rsyslog 提供高性能，高安全性功能和模块化设计。 虽然它最初是作为常规系统日志开发的，但是 rsyslog 已经发展成为一种瑞士军刀，可以接受来自各种来源的输入，转换它们，并将结果输出到不同的目的地。

当应用有限的处理时，RSYSLOG 每秒可以向本地目的地传送超过一百万条消息。 即使有远程目的地和更复杂的处理，性能通常被认为是“惊人的”。

在 centos 6 及之前的版本叫做 syslog，centos 7 开始叫做 rsyslog，根据官方介绍，rsyslog(2013 年版本)可以达到每秒转发百万条日志的级别

**使用rsyslog最主要的功能是可以收集，公司内部网络环境中各个网络设备的日志，网络设备一般都可以把日志发送到rsyslog日志服务器当中，之后使用logstash收集到elasticsearch当中**

官方网址：http://www.rsyslog.com/

### 4.6.1 安装配置haproxy

```bash
#安装haproxy略过

#haproxy配置
[17:00:56 root@haproxy ~]#cat /etc/haproxy/haproxy.cfg 
	log 192.168.10.184 local3 info 
listen web_host
    bind 192.168.10.183:80
    mode http
    log global
    balance static-rr
    option forwardfor
    server web1 192.168.10.184:80 weight 1 check inter 3000 fall 3 rise 5
    server web2 192.168.10.185:80 weight 1 check inter 3000 fall 3 rise 5
#启动服务
[17:01:02 root@haproxy ~]#systemctl start haproxy.service
#验证
[17:02:02 root@haproxy ~]#ss -ntl | grep 80
LISTEN   0         20480                0.0.0.0:9999             0.0.0.0:*    
LISTEN   0         20480         192.168.10.183:80               0.0.0.0:*   
```

### 4.6.2 编辑 logstash 配置文件

```bash
input {
  syslog {
    type => "haproxy-log"
    host => "192.168.10.184"   #监听地址
    port => "514"              #监听端口
  }
}
output {
  stdout{}
}
#二进制启动测试
{
              "type" => "haproxy-log",
    "facility_label" => "local3",
          "priority" => 0,
              "tags" => [
        [0] "_grokparsefailure_sysloginput"
    ],
        "@timestamp" => 2021-05-28T09:46:18.567Z,
          "severity" => 0,
           "message" => "<166>May 28 17:46:18 haproxy[10386]: Connect from 192.168.10.1:61732 to 192.168.10.183:9999 (stats/HTTP)\n",
          "facility" => 0,
    "severity_label" => "Emergency",
          "@version" => "1",
              "host" => "192.168.10.183"
}
```

## 4.7 logstash 收集日志并写入redis

用一台服务器按照部署 redis 服务，专门用于日志缓存使用，用于 web 服务器产生大量日志的场景，例如下面的服务器内存即将被使用完毕，查看是因为redis服务保存了大量的数据没有被读取而占用了大量的内存空间。

**整体架构：**

![ELK](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/ELK.jpg)

### 4.7.1 部署redis

```bash
[17:53:46 root@haproxy ~]#apt install redis
#配置redis
[18:00:42 root@haproxy ~]#vim /etc/redis/redis.conf
bind 0.0.0.0         #修改监听地址
requirepass 123456   #配置访问密码
[18:01:28 root@haproxy ~]#systemctl restart redis
```

### 4.7.2 配置 logstash 将日志写入redis

将 tomcat 服务器的 logstash 收集之后的 tomcat 访问日志写入到 redis 服务器， 然后通过另外的 logstash 将 redis 服务器的数据取出在写入到 elasticsearch 服务器

官方文档：https://www.elastic.co/guide/en/logstash/7.12/plugins-outputs-redis.html #output的redis

```bash
[18:07:29 root@web1 ~]#cat /etc/logstash/conf.d/tomcat.conf
input {
  file {
    path => "/usr/local/tomcat/logs/tomcat_access_log.*.log"
    start_position => "end"
    type => "tomcat-access-log"
    codec => json
    stat_interval => 3
  }
  file {
    path => "/usr/local/tomcat/logs/catalina.*"
    type => "java-log"
    start_position => "beginning"
    stat_interval => 3
    codec => multiline {
      pattern => "^*-*-*"
      negate => true
      what => "previous"
    }
  }
}
output {
  if [type] == "tomcat-access-log" {
    redis {
      data_type => "list"           #写入redis的数据类型
      key => "tomcat-access-log"    #key名称
      host => "192.168.10.183"      #redis的IP
      port => "6379"                #访问端口
      db => "0"                     #使用那个数据库
      password => "123456"          #连接密码
    }
  }
  if [type] == "java-log" {
    redis {
      data_type => "list"
      key => "java-log"
      host => "192.168.10.183"
      port => "6379"
      db => "0" 
      password => "123456"
    }   
  }
}
#测试
[18:07:34 root@web1 ~]#/usr/share/logstash/bin/logstash -f /etc/logstash/conf.d/tomcat.conf -t
Configuration OK
#重启服务
[18:13:24 root@web1 ~]#systemctl restart logstash.service 
```

**测试**

```bash
#访问下页面
[18:14:13 root@web1 ~]#curl 192.168.10.184:8080/app1/
web1.zhangzhuo.org
#redis中查看有没有数据
[18:01:41 root@haproxy ~]#redis-cli 
127.0.0.1:6379> AUTH 123456
OK
127.0.0.1:6379> KEYS *
1) "java-log"
2) "tomcat-access-log"
#如果由key的话说明配置没有问题
```

### 4.7.3 配置其他 logstash 服务器从 redis 读取数据

配置专门 logstash 服务器从 redis 读取指定的 key 的数据，并写入到 elasticsearc

```bash
[18:27:57 root@haproxy ~]#cat /etc/logstash/conf.d/tomcat.conf 
input {
  redis {
    data_type => "list"
    key => "tomcat-access-log"
    host => "192.168.10.183"
    port => "6379"
    db => "0"
    password => "123456"
  }
  redis {
    data_type => "list"
    key => "java-log"
    host => "192.168.10.183"
    port => "6379"
    db => "0" 
    password => "123456"
  }
}
output {
  if [type] == "tomcat-access-log" {
    elasticsearch {
      hosts => ["192.168.10.181:9200"]
      index => "tomcat-access-log-%{+YYYY.MM.dd}"
    }
  }
  if [type] == "java-log" {
    elasticsearch {
      hosts => ["192.168.10.181:9200"]
      index => "java-log-%{+YYYY.MM.dd}"
    }
  }
}
#测试
[18:24:34 root@haproxy ~]#/usr/share/logstash/bin/logstash -f /etc/logstash/conf.d/tomcat.conf -t
Configuration OK
#重启
[18:29:06 root@haproxy ~]#systemctl restart logstash.service 
```

**验证数据是否写入到elasticsearc**

```bash
#进入redis验证数据是否存在
[18:29:50 root@haproxy ~]#redis-cli 
127.0.0.1:6379> AUTH 123456
OK
127.0.0.1:6379> KEYS *
(empty list or set)
#这里数据已经被写入elasticsearc，所以这里现在没有s
```

## 4.8 logstash 收集日志并写入kafka

### 4.8.1 安装配置kafka

```bash
#安装过程略过....

#测试kafka是否可用
[11:30:43 root@haproxy ~]#/apps/kafka/bin/kafka-topics.sh --create --zookeeper 192.168.10.183:2181 --partitions 1 --replication-factor 1  --topic zhang
Created topic zhang.

[11:31:53 root@haproxy ~]#/apps/kafka/bin/kafka-topics.sh --list --zookeeper 192.168.10.183:2181
zhang
```

### 4.8.2 配置 logstash 收集日志文件输出到kafka

官方配置说明：https://www.elastic.co/guide/en/logstash/7.12/plugins-outputs-kafka.html

```bash
input {
  file {
    path => "/usr/local/tomcat/logs/tomcat_access_log.*.log"
    start_position => "end"
    type => "tomcat-access-log"
    codec => json
    stat_interval => 3
  }
  file {
    path => "/usr/local/tomcat/logs/catalina.*"
    type => "java-log"
    start_position => "beginning"
    stat_interval => 3
    codec => multiline {
      pattern => "^*-*-*"
      negate => true
      what => "previous"
    }
  }
}
output {
  if [type] == "tomcat-access-log" {
    kafka {
      bootstrap_servers => "192.168.10.183:9092"  #kafka服务器地址多个用逗号隔开
      topic_id => "tomcat-access-log"             #topic名称
      codec => "json"                             #写入的时候使用 json 编码，因为 logstash 收集后会转换成json格式
    }
  }
  if [type] == "java-log" {
    kafka {
      bootstrap_servers => "192.168.10.183:9092"
      topic_id => "java-log"
      codec => "json"
    }   
  }
}

#验证
[11:47:06 root@web1 conf.d]#/usr/share/logstash/bin/logstash -f tomcat.conf -t
Configuration OK

#重启服务
[11:48:01 root@web1 conf.d]#systemctl restart logstash.service
```

**测试是否写入kafka**

```bash
#访问tomcat
[11:52:29 root@web1 conf.d]#curl  192.168.10.184:8080/app1/
web1.zhangzhuo.org

#验证kafka是否创建topic
[11:33:02 root@haproxy ~]#/apps/kafka/bin/kafka-topics.sh --list --zookeeper 192.168.10.183:2181
tomcat-access-log   #已经创建
zhang
```

### 4.8.3  配置 logstash 从 kafka 读取系统日志

官方文档：https://www.elastic.co/guide/en/logstash/7.12/plugins-inputs-kafka.html

```bash
input {
  kafka {
    bootstrap_servers => "192.168.10.183:9092"  #kafka服务地址端口
    topics => "tomcat-access-log"               #topic名称
    codec => json                               #编码
    consumer_threads => 1                       #读取的线程，一般跟kafka中topic分区数一致
    decorate_events =>true                      #弃用别名
  }
  kafka {
    bootstrap_servers => "192.168.10.183:9092"
    topics => "java-log"
    codec => json                               #编码
    consumer_threads => 1
    decorate_events =>true
  }
}
output {
  if [type] == "tomcat-access-log" {
    elasticsearch {
      hosts => ["192.168.10.181:9200"]
      index => "tomcat-access-log-%{+YYYY.MM.dd}"
    }
  }
  if [type] == "java-log" {
    elasticsearch {
      hosts => ["192.168.10.181:9200"]
      index => "java-log-%{+YYYY.MM.dd}"
    }
  }
}

#测试
[12:02:11 root@haproxy ~]#/usr/share/logstash/bin/logstash -f /etc/logstash/conf.d/tomcat.conf -t

#重启服务
Configuration OK
```

**测试验证数据是否可以正常写入到es中**

```bash
#这个异常错误不用管
[2021-05-29T04:12:44,587][WARN ][org.apache.kafka.common.utils.AppInfoParser][main][05eb350f61b5a522f421b5ee70d2dc7972Info mbean

#访问测试
[12:17:28 root@web1 conf.d]#curl  192.168.10.184:8080/app1/
web1.zhangzhuo.org
[12:19:43 root@web1 conf.d]#curl  192.168.10.184:8080/app1/
web1.zhangzhuo.org
[12:19:44 root@web1 conf.d]#curl  192.168.10.184:8080/app1/
web1.zhangzhuo.org
```

**验证数据**

![image-20210529122136817](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210529122136817.png)

# 五、beats收集日志

**beats的几种类型**

```bash
filebeat    #用来收集日志文件数据
Packetbeat  #用来收集网络数据
Winlogbeat  #win平台日志文件数据收集
Metricbeat  #收集指标数据，比如系统运行状态，CPU内存利用率等
Heartbeat   #能够通过ICMP、TCP和HTTP进行ping检测主机可用性和网站可用性
Auditbeat   #收集审计日志

#这里面使用最多的是filebeat
```

官方下载地址：https://www.elastic.co/cn/downloads/beats

官方说明文档：https://www.elastic.co/guide/index.html

## 5.1 简单beats介绍

### 5.1.1 Metricbeat

```bash
#安装
[15:25:56 root@web1 ~]#ls
metricbeat-7.12.1-amd64.deb
[15:25:57 root@web1 ~]#dpkg -i metricbeat-7.12.1-amd64.deb

#修改配置文件
[15:29:37 root@web1 ~]#vim /etc/metricbeat/metricbeat.yml 
  host: "192.168.10.181:5601"   #kibana地址端口
  hosts: ["192.168.10.181:9200","192.168.10.182:9200"] #Elasticsearch服务地址端口
#启动服务
[15:31:02 root@web1 ~]#systemctl start metricbeat.service 
```

**kibana中查看数据**

![image-20210529154603318](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210529154603318.png)

### 5.1.2 Heartbeat

```bash
#安装
[15:38:18 root@web1 ~]#ls
heartbeat-7.12.1-amd64.deb
[15:38:19 root@web1 ~]#dpkg -i heartbeat-7.12.1-amd64.deb
#配置
[15:38:37 root@web1 ~]#vim /etc/heartbeat/heartbeat.yml

 heartbeat.monitors:
- type: http        #检测的类型
   id: nginx-app1   #id
   name: nginx-app1 #名称
   urls: ["http://192.168.10.184"] #检测的url
   schedule: '@every 10s'  #检测频率
   host: "192.168.10.181:5601"  #kibana地址端口
   hosts: ["192.168.10.181:9200"] #Elasticsearch服务地址端口
   
#启动服务
[15:44:31 root@web1 ~]#systemctl start heartbeat-elastic.service
```

**kibana中查看数据**

![image-20210529154622885](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210529154622885.png)

## 5.2 filebeat收集日志

filebeat使用go语言编写比较轻量化不需要使用java环境，但是不能像logstash对日志进行进一步的处理，一般用于对容器以及一些不需要java的主机进行日志收集，filebeat收集日志后可以把数据写入到不同的组件中比如logstash、redis、kafka、Elasticsearch中。

官方下载地址：https://www.elastic.co/cn/downloads/beats/filebeat

官方帮助文档：https://www.elastic.co/guide/en/beats/filebeat/7.12/index.html

### 5.2.1 使用 filebeat 收集日志并写入 kafka中

**架构图**

![ELK111](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/ELK111.jpg)

先由filebeat把日志收集传输到kafka中，再由logstash把日志从kafka中读取出来写入到elasticsearch中

#### 5.2.1.1 安装配置filebeat收集单个系统日志

##### 5.2.1.1.1 配置filebeat写入到kafka

官方帮助：https://www.elastic.co/guide/en/beats/filebeat/7.12/kafka-output.html

```bash
#安装
[16:06:33 root@web2 ~]#ls
filebeat-7.12.1-amd64.deb
[16:06:38 root@web2 ~]# dpkg -i filebeat-7.12.1-amd64.deb 

#修改配置文件
[16:19:22 root@web2 ~]#grep -v "#" /etc/filebeat/filebeat.yml | grep -v "^$"
filebeat.inputs:  
- type: log   #收集的日志类型
  paths:
    - /var/log/syslog  #日志文件位置，这里可以使用*匹配，可以写多个文件
output.file:       #收集到的日志写入到本地文件进行测试
  path: "/tmp"     #文件位置
  filename: "filebeat.txt" #文件类型
#第一次下面注释测试写文件
output.kafka:      #收集到的日志写入到kafka
  hosts: ["192.168.10.181:9092"]  #kafka集群IP端口，可以写多个
  topic: 'syslog-105'             #topic名称
  partition.round_robin:
    reachable_only:true
  required_acks: 1                #本地写入完成
  compression: gzip               #开启压缩
  max_message_bytes: 1000000      #消息最大值字节


#启动服务测试写本地文件
[16:19:40 root@web2 ~]#systemctl start filebeat.service
#验证文件是否生成
[16:29:12 root@web2 ~]#ll /tmp/filebeat.txt
-rw------- 1 root root 7308084 May 29 16:29 /tmp/filebeat.txt

#启动测试写kafka
[16:31:34 root@haproxy ~]#/apps/kafka/bin/kafka-topics.sh --list --zookeeper 192.168.10.183:2181
syslog-105   #已经写了
```

##### 5.2.1.1.2 配置logstash从kafka读取日志到elasticsearch

```bash
[16:41:34 root@haproxy ~]#cat /etc/logstash/conf.d/105.conf
input {
  kafka {
    bootstrap_servers => "192.168.10.183:9092"
    topics => "syslog-105"
    consumer_threads => 1
    decorate_events => true
    codec => "json"
    auto_offset_reset => "latest"
  }
}
output {
  stdout {}   #输出到终端用来测试
  elasticsearch {             #输出到elasticsearch
    hosts => ["192.168.10.181:9200"]
    index => "syslog-105-%{+YYYY.MM.dd}"
  }
}
#二进制启动测试
[16:43:29 root@haproxy ~]#/usr/share/logstash/bin/logstash -f /etc/logstash/conf.d/105.conf 
检查终端是否有输出日志
```

**检查elasticsearch中数据**

![image-20210529164703921](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210529164703921.png)

#### 5.2.1.2 使用 filebeat 收集多个日志文件

**写入kafka**

```bash
[16:50:28 root@web2 ~]#grep -v "#" /etc/filebeat/filebeat.yml | grep -v "^$"
filebeat.inputs:
- type: log
  paths:
    - /var/log/syslog
  fields:
    type: "syslog"   #添加标签，之后给logstash处理日志时区分日志
- type: log
  paths:
    - "/apps/nginx/logs/access.log" 
  fields:
    type: "nginx-access"  
output.kafka:
  hosts: ["192.168.10.183:9092"]
  topic: 'syslog-105'
  partition.round_robin:
    reachable_only: true   #设置为 true，则事件将仅发布到可用分区，false 将发送到所有分区
  required_acks: 1
  compression: gzip
  max_message_bytes: 1000000
#重启
[17:07:15 root@web2 ~]#systemctl restart filebeat.service 
```

**写入elasticsearch**

```bash
[17:12:35 root@haproxy ~]#cat /etc/logstash/conf.d/105.conf
input {
  kafka {
    bootstrap_servers => "192.168.10.183:9092"
    topics => "syslog-105"
    consumer_threads => 1
    decorate_events => true
    codec => "json"
    auto_offset_reset => "latest"
  }
}
output {
  if [fields][type] == "syslog" {
    elasticsearch {
      hosts => ["192.168.10.181:9200"]
      index => "syslog-105-%{+YYYY.MM.dd}"
    }
  }
  if [fields][type] == "nginx-access" {
    elasticsearch {
      hosts => ["192.168.10.181:9200"]
      index => "nginx-access-105-%{+YYYY.MM.dd}"
    } 
  }
}
#重启服务
[17:13:58 root@haproxy ~]#systemctl restart logstash.service 
```

**验证数据**

![image-20210529171640426](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210529171640426.png)

### 5.2.2 使用 filebeat 收集日志并写入 redis中

官方文档：https://www.elastic.co/guide/en/beats/filebeat/7.12/redis-output.html

#### 5.2.2.1 配置filebeat写入redis

```bash
[19:27:48 root@web2 ~]#!gre
grep -v "#" /etc/filebeat/filebeat.yml | grep -v "^$"
filebeat.inputs:
- type: log
  paths:
    - /var/log/syslog
  fields:
    type: "syslog"
- type: log
  paths:
    - "/apps/nginx/logs/access.log"
  fields:
    type: "nginx-access"
  
output.redis:
  hosts: ["192.168.10.183:6379"]
  key: "log-105"   #为了后期日志处理，建议自定义 key 名称
  db: 0   #使用第几个库
  timeout: 5  #超时时间
  password: 123456  #redis 密码
#重启服务验证
[19:27:54 root@web2 ~]#systemctl restart filebeat.service 
[19:29:10 root@haproxy ~]#redis-cli 
127.0.0.1:6379> AUTH 123456
OK
127.0.0.1:6379> KEYS *
1) "log-105"
```

#### 5.2.2.2 配置logstash

```bash
[19:34:07 root@haproxy ~]#cat /etc/logstash/conf.d/105.conf 
input {
  redis {
    host => "192.168.10.183"
    port => "6379"
    db => "0"
    key => "log-105"
    data_type => "list"
    password => "123456"
  }
}
output {
  if [fields][type] == "syslog" {
    elasticsearch {
      hosts => ["192.168.10.181:9200"]
      index => "syslog-105-%{+YYYY.MM.dd}"
    }
  }
  if [fields][type] == "nginx-access" {
    elasticsearch {
      hosts => ["192.168.10.181:9200"]
      index => "nginx-access-105-%{+YYYY.MM.dd}"
    } 
  }
}
#重启服务验证
[19:31:55 root@haproxy ~]#systemctl restart logstash.service
[19:33:38 root@haproxy ~]#redis-cli 
127.0.0.1:6379> AUTH 123456
127.0.0.1:6379> KEYS *
(empty list or set)
```

#### 5.2.2.3 监控 redis 数据长度

实际环境当中，可能会出现 reids 当中堆积了大量的数据而 logstash 由于种种原因未能及时提取日志，此时会导致 redis 服务器的内存被大量使用，甚至出现内存即将被使用完毕的情景。

**监控脚本**

```python
[19:55:02 root@haproxy ~]#cat 1.py 
import redis

def redis_conn():
    pool=redis.ConnectionPool(host="192.168.10.183",port=6379,db=0,password=123456)
    conn = redis.Redis(connection_pool=pool)
    data = conn.llen("log-105")
    print(data)
redis_conn()

#测试
[19:55:07 root@haproxy ~]#python3 1.py 
111  #表示已经111个key了
```

## 5.3 使用filebeat 收集日志发送到logstash

由于filebeat工具并不能进行日志处理，一般web服务的json访问日志需要logstash进行处理后在写入到缓存服务器或直接写入到elasticsearch服务器

官方帮助：https://www.elastic.co/guide/en/beats/filebeat/7.12/logstash-output.html

**架构图**

![ELKsss](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/ELKsss.jpg)

### 5.3.1 配置filebeat

```bash
[17:32:47 root@web2 ~]#!grep
grep -v "#" /etc/filebeat/filebeat.yml | grep -v "^$"
filebeat.inputs:
- type: log
  paths:
    - /var/log/syslog
  fields:
    type: "syslog"
- type: log
  paths:
    - "/apps/nginx/logs/access.log"
  fields:
    type: "nginx-access"
output.logstash:
  hosts: ["192.168.10.184:5555,192.168.10.184:6666"]  #logstash 服务器地址，可以是多个
  enabled: true   #是否开启输出至 logstash，默认即为true
  worker: 1       #工作线程数
  compression_level: 3   #压缩级别
  loadbalance: true      #多个输出的时候开启负载

#重启服务

```

### 5.3.2 配置logstash写入kafka

官方帮助文档：https://www.elastic.co/guide/en/logstash/7.12/plugins-inputs-beats.html

```bash
#配置一个测试的本地文件输出
[17:38:25 root@web1 ~]#cat /etc/logstash/conf.d/105.conf
input {
  beats {
    port => 5555
  }
  beats {
    port => 6666
  }
}
output {
  file {
    path => "/tmp/105.txt"
  }
}
#重启测试
[17:42:15 root@web1 ~]#systemctl restart logstash.service
[17:45:59 root@web1 ~]#ll /tmp/105.txt
-rw-r--r-- 1 root root 79975 May 29 17:45 /tmp/105.txt

#配置为发送到kafka
[17:50:08 root@web1 ~]#cat /etc/logstash/conf.d/105.conf
input {
  beats {
    port => 5555
    codec => "json"  #这里可以处理json文本
  }
  beats {
    port => 6666
    codec => "json"
  }
}
output {
  if [fields][type] == "syslog" {
    kafka {
      bootstrap_servers => "192.168.10.183:9092"
      topic_id => "105"
      codec => "json"
    }
  }
  
  if [fields][type] == "nginx-access" {
    kafka {
      bootstrap_servers => "192.168.10.183:9092"
      topic_id => "105"
      codec => "json"
    }   
  }
}
#重启验证数据
[18:05:05 root@web1 ~]#systemctl restart logstash.service
[18:05:27 root@haproxy ~]#/apps/kafka/bin/kafka-topics.sh --list --zookeeper 192.168.10.183:2181
105
```

### 5.3.3 配置logstash读取kafka写入到Elasticsearch

```bash
[18:08:58 root@haproxy ~]#cat /etc/logstash/conf.d/105.conf 
input {
  kafka {
    bootstrap_servers => "192.168.10.183:9092"
    topics => "105"
    consumer_threads => 1
    decorate_events => true
    codec => "json"
    auto_offset_reset => "latest"
  }
}
output {
  if [fields][type] == "syslog" {
    elasticsearch {
      hosts => ["192.168.10.181:9200"]
      index => "syslog-105-%{+YYYY.MM.dd}"
    }
  }
  if [fields][type] == "nginx-access" {
    elasticsearch {
      hosts => ["192.168.10.181:9200"]
      index => "nginx-access-105-%{+YYYY.MM.dd}"
    } 
  }
}
#重启服务
[19:19:55 root@haproxy ~]#systemctl restart logstash.service 
```

## 5.4 filebeat配置文件

```yaml
#输入
一般输入都为文件输入
filebeat.inputs:
- type: log
  enabled: true    #使用该enabled选项可以启用和禁用输入。默认情况下，启用设置为true。
  tags: ["nginx-access","json"] #标签可以轻松地在 Kibana 中选择特定事件或在 Logstash 中应用条件过滤。这些标签将附加到常规配置中指定的标签列表中。
  fields:  #您可以指定用于向输出添加附加信息的可选字段。用于Logstash进行过滤
    type: "accesslog"
  paths:   #被收集的日志路径，可以写多个
    - "/apps/nginx/logs/access.log"
  json.keys_under_root: true #解析json文件配置
  json.overwrite_keys: true #j

```

# 六、日志收集示例

## 6.1 架构规划

在下面的图当中从左向右看，当要访问 ELK 日志统计平台的时候，首先访问的是两台nginx+keepalived 做的负载高可用，访问的地址是 keepalived 的 IP，当一台 nginx 代理服务器挂掉之后也不影响访问，然后nginx将请求转发到 kibana， kibana 再去 elasticsearch 获取数据，elasticsearch 是两台做的集群，数据会随机保存在任意一台 elasticsearch 服务器，redis 服务器做数据的临时保存，避免 web 服务器日志量过大的时候造成的数据收集与保存不一致导致的日志丢失，可以临时保存到 redis，redis 可以是集群，然后再由 logstash 服务器在非高峰时期从 redis 持续的取出即可，另外有一台 mysql 数据库服务器，用于持久化保存特定的数据， web服务器的日志由 filebeat 收集之后发送给另外的一台 logstash，再有其写入到 redis 即可完成日志的收集，从图中可以看出，redis 服务器处于前端结合的最中间，其左右都要依赖于redis的正常运行，web 服务删个日志经过 filebeat 收集 之后通过日志转发层的logstash写入到redis不同的key当中，然后提取层logstash 再从 redis 将数据提取并安按照不同的类型写入到 elasticsearch 的不同 index 当中， 用户最终通过 nginx 代理的 kibana 查看到收集到的日志的具体内容：

![image-20210530125123611](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210530125123611.png)

**架构说明**

![ELK-1111](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/ELK-1111.png)

# 七、其他配置

## 7.1 通过 nginx 代理 kibana 并实现认证

将 nginx 作为反向代理服务器，并增加登录用户认证的目的，可以有效避免其 他人员随意访问 kibana 页面。

### 7.1.1 配置nginx代理kibana

```bash
[17:05:56 root@web2 opt]#vim /apps/nginx/conf/nginx.conf
	upstream kibana_server {
        server 192.168.10.181:5601 weight=1 max_fails=3 fail_timeout=60;
        server 192.168.10.182:5601 weight=1 max_fails=3 fail_timeout=60;
	}
    server {
        listen       80; 
        server_name  www.kibana.com;
        location / { 
            proxy_pass http://kibana_server;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
#重启nginx
```

### 7.1.2 实现登录认证

```bash
[17:07:08 root@web2 ~]#apt install apache2-utils 
[17:09:05 root@web2 ~]#mkdir /apps/nginx/passwd
[17:09:16 root@web2 ~]#htpasswd -bc /apps/nginx/passwd/htpasswd.users  zhangzhuo 123456
[17:11:35 root@web2 ~]#chown nginx: /apps/nginx/passwd/htpasswd.users
[17:09:55 root@web2 ~]#ls /apps/nginx/passwd/htpasswd.users 
/apps/nginx/passwd/htpasswd.users
#修改配置文件
    server {
        listen       80; 
        server_name  www.kibana.com;
        auth_basic "Restricte";
        auth_basic_user_file /apps/nginx/passwd/htpasswd.users; 
        location / { 
            proxy_pass http://kibana_server;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }   
#重启服务
```

**网页验证**

![image-20210531171348456](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210531171348456.png)

## 7.2 通过坐标地图统计客户 IP 所在城市

下载数据包：https://dev.maxmind.com/geoip/geoip2/geolite2/

![image-20210531171956043](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210531171956043.png)

注册账户登录邮箱修改密码后登录下载

![image-20210531172307716](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210531172307716.png)

```bash
#上传包
[17:24:27 root@redis ~]#ls
GeoLite2-City_20210525.tar.gz
[17:24:35 root@redis ~]#tar xf GeoLite2-City_20210525.tar.gz 
[17:25:30 root@redis ~]#mv GeoLite2-City_20210525 /etc/logstash/GeoLite2-City
#修改 logstash配置文件
#其中elasticsearch 的索引名称必须必须必须以 logstash-开头
[17:34:24 root@redis ~]#cat /etc/logstash/conf.d/nginx-access.conf
input {
  redis {
    host => "192.168.10.183"
    port => "6379"
    db => 0
    key => "nginx-access-log"
    data_type => "list"
    password => "123456"
    codec => json
  }
}
filter {
  if [fields][type] == "accesslog" {
    geoip {
       source => "clientip"
       target => "geoip"
       database => "/etc/logstash/GeoLite2-City/GeoLite2-City.mmdb"
       add_field => ["[geoip][coordinates]","%{[geoip][longitude]}"]
       add_field => ["[geoip][coordinates]","%{[geoip][latitude]}"]
    }
    mutate {
      convert =>  ["[geoip][coordinates]","float"]
    }
  }
}
output {
  if [fields][type] == "accesslog" {
    elasticsearch {
      hosts => ["192.168.10.181:9200","192.168.10.182:9200"]
      index => "logstash-nginx-access-log-%{+YYYY.MM.dd}"
    }
  }
}

#重启logstash服务
[17:34:26 root@redis ~]#systemctl restart logstash.service

#测试验证
日志格式必须为json如下：
{"@timestamp":"2021-05-27T03:30:54+08:00","host":"172.18.0.2","clientip":"114.119.157.142","size":1379,"responsetime":0.021,"upstreamtime":"0.021","upstreamhost":"172.18.0.1:8080","http_host":"zhangzhuo.ltd","uri":"/articles/2020/12/04/1607085836372.html","domain":"zhangzhuo.ltd","xff":"-","referer":"-","tcp_xff":"-","http_user_agent":"Mozilla/5.0 (Linux; Android 7.0;) AppleWebKit/537.36 (KHTML, like Gecko) Mobile Safari/537.36 (compatible; PetalBot;+https://webmaster.petalsearch.com/site/petalbot)","status":"404"}
#追加日志到nginx访问日志
[17:36:47 root@web2 ~]#cat /opt/zhangzhuo.org_access.log-20210520 >>/apps/nginx/logs/access.log 
```

**kibana检查数据**

![image-20210531174036387](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210531174036387.png)

检查是否有这些数据

**添加地图**

在地图中添加图层

![image-20210531174302341](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210531174302341.png)

**添加数据文档**

![image-20210531174530264](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210531174530264.png)

## 7.3 日志写入数据库

写入数据库的目的是用于持久化保存重要数据，比如状态码、客户端 IP、客户端浏览器版本等等，用于后期按月做数据统计等。

### 7.3.1 安装数据库

```bash
#安装数据库
[17:52:38 root@web1 ~]#apt install mysql-server
[17:54:38 root@web1 ~]#systemctl restart mysql

#创建数据库授权
mysql>  create database elk character set utf8 collate utf8_bin;
Query OK, 1 row affected (0.00 sec)

mysql> grant all privileges on elk.* to elk@"%" identified by '123456';
Query OK, 0 rows affected, 1 warning (0.00 sec)

mysql> flush privileges;
Query OK, 0 rows affected (0.00 sec)

#测试远程访问
[17:56:17 root@redis ~]#apt install mysql-client
[17:57:09 root@redis ~]#mysql -uelk -p123456 -h 192.168.10.184
mysql> show databases;
+--------------------+
| Database           |
+--------------------+
| information_schema |
| elk                |
+--------------------+
2 rows in set (0.00 sec)
```

### 7.3.2 logstash 配置 mysql-connector-java 包

MySQL Connector/J 是 MySQL 官方 JDBC 驱动 程序 ， JDBC （Java Data Base Connectivity,java 数据库连接）是一种用于执行 SQL 语句的 Java API，可以为多种 关系数据库提供统一访问，它由一组用 Java 语言编写的类和接口组成。

官方下载地址：https://dev.mysql.com/downloads/connector/

```bash
[17:59:20 root@redis ~]#ls
mysql-connector-java_8.0.25-1ubuntu18.04_all.deb
#必须放在这里
[17:59:23 root@redis ~]#mkdir -pv /usr/share/logstash/vendor/jar/jdbc
[18:00:26 root@redis ~]#cp /usr/share/java/mysql-connector-java-8.0.25.jar /usr/share/logstash/vendor/jar/jdbc/
```

### 7.3.3 安装配置插件

```bash
#当前已经安装的所有插件
[18:01:06 root@redis ~]#/usr/share/logstash/bin/logstash-plugin list

#安装logstash-output-jdbc插件
[18:02:24 root@redis ~]#/usr/share/logstash/bin/logstash-plugin install logstash-output-jdbc
Using bundled JDK: /usr/share/logstash/jdk
OpenJDK 64-Bit Server VM warning: Option UseConcMarkSweepGC was deprecated in version 9.0 and will likely be removed in a future release.
Validating logstash-output-jdbc
Installing logstash-output-jdbc
Installation successful  #表示安装成功
```

### 7.3.4 创建表

略，根据自己需求创建

![image-20210531200822855](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210531200822855.png)

### 7.3.5 配置 logstash 将日志写入数据库

```bash
#修改配置
[20:08:43 root@redis ~]#cat /etc/logstash/conf.d/nginx-access.conf 
input {
  redis {
    host => "192.168.10.183"
    port => "6379"
    db => 0
    key => "nginx-access-log"
    data_type => "list"
    password => "123456"
    codec => json
  }
}

filter {
  if [fields][type] == "accesslog" {
    geoip {
       source => "clientip"
       target => "geoip"
       database => "/etc/logstash/GeoLite2-City/GeoLite2-City.mmdb"
       add_field => ["[geoip][coordinates]","%{[geoip][longitude]}"]
       add_field => ["[geoip][coordinates]","%{[geoip][latitude]}"]
    }
    mutate {
      convert =>  ["[geoip][coordinates]","float"]
    }
  }
}

output {
  if [fields][type] == "accesslog" {
    elasticsearch {
      hosts => ["192.168.10.181:9200","192.168.10.182:9200"]
      index => "logstash-nginx-access-log-%{+YYYY.MM.dd}"
    }
    jdbc {
      connection_string => "jdbc:mysql://192.168.10.184/elk?user=elk&password=123456&useUnicode=true&characterEncoding=UTF8"
#这里字段要与数据库字段一致
      statement => ["INSERT INTO elk(clientip,status,uri,http_user_agent,responsetime,upstreamtime,upstreamhost) VALUES(?,?,?,?,?,?,?)","clientip", "status","uri","http_user_agent","responsetime","upstreamtime","upstreamhost"]
    }
  }
}
#重启服务
[18:53:13 root@redis ~]#systemctl restart logstash.service

#测试导入数据测试数据库是否能写入字段只要带-就写入不了
```

数据库查看数据

![image-20210531201202348](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210531201202348.png)

# 八、画图

略.....只需要在kibana图形界面操作，前提是收集的日志需要为json格式

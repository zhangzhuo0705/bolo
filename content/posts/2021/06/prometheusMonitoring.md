---
title: "Prometheus监控服务"
date: 2021-06-23T20:46:19+08:00
draft: false
description: "讲解 Prometheus 的监控模型，完成服务端、Exporter 与 Grafana 的部署配置。"
cover: "https://b3logfile.com/bing/20190110.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["应用服务"]
tags: ["Prometheus"]
toc: true
---
# 一、Prometheus简介

官方网站：https://prometheus.io/docs/

github地址：https://github.com/prometheus

Prometheus是基于go语言开发的一套开源的监控、报警和时间序列数据库的组合，是由SoundCloud公司开发的开源监控系统, Prometheus于2016年加入CNCF（Cloud Native Computing Foundation,云原生计算基金会）,是CNCF继kubernetes 之后毕业的第二个项目，prometheus在容器和微服务领域中得到了广泛的应用，其特点主要如下：

```bash
1.使用key-value的多维度格式保存数据
2.数据不使用MySQL这样的传统数据库，而是使用时序数据库，目前是使用的TSDB
3.支持第三方dashboard实现更高的图形界面，如grafana(Grafana 2.5.0版本及以上)
4.功能组件化
5.不需要依赖存储，数据可以本地保存也可以远程保存
6.服务自动化发现
7.强大的数据查询语句功(PromQL,Prometheus Query Language)
```

阿里云TSDB简介：https://www.aliyun.com/product/hitsdb

## 1.1 prometheus系统架构图

```bash
prometheus server：主服务，接受外部http请求，收集、存储与查询数据等
prometheus targets: 静态收集的目标服务数据
service discovery：动态发现服务
prometheus alerting：报警通知
push gateway：数据收集代理服务器(类似于zabbix proxy)
data visualization and export： 数据可视化与数据导出(访问客户端)
```

ProQL简介：https://songjiayang.gitbooks.io/prometheus/content/promql/summary.html

![image-20210622203451975](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210622203451975.png)

# 二、Prometheus部署

## 2.1 prometheus 安装方式

```bash
https://prometheus.io/download/ #官方二进制下载及安装，prometheus server的监听端口为9090
https://prometheus.io/docs/prometheus/latest/installation/ #docker镜像直接启动
https://github.com/coreos/kube-prometheus #operator部署
apt install prometheus #使用apt或者yum安装
```

### 2.1.1 二进制安装prometheus

```bash
[20:52:13 root@prometheus src]#ls
prometheus-2.27.1.linux-amd64.tar.gz
[20:52:15 root@prometheus src]#tar xf prometheus-2.27.1.linux-amd64.tar.gz 
[20:52:23 root@prometheus src]#mv prometheus-2.27.1.linux-amd64 prometheus
[20:55:48 root@prometheus prometheus]#ls -l 
total 178060
drwxr-xr-x 2 3434 3434     4096 May 18 22:26 console_libraries
drwxr-xr-x 2 3434 3434     4096 May 18 22:26 consoles
-rw-r--r-- 1 3434 3434    11357 May 18 22:26 LICENSE
-rw-r--r-- 1 3434 3434     3646 May 18 22:26 NOTICE
-rwxr-xr-x 1 3434 3434 96561319 May 18 22:20 prometheus  #prometheus服务可执行程序
-rw-r--r-- 1 3434 3434      926 May 18 22:26 prometheus.yml  #配置文件
-rwxr-xr-x 1 3434 3434 85738653 May 18 22:22 promtool  #测试工具，用于检测配置prometheus配置文件、检测metrics数据等
```

**准备service文件**

```bash
[20:54:53 root@prometheus prometheus]#cat /etc/systemd/system/prometheus.service 
[Unit]
Description=Prometheus Server
Documentation=https://prometheus.io/docs/introduction/overview/
After=network.target
[Service]
Restart=on-failure
WorkingDirectory=/usr/local/src/prometheus
ExecStart=/usr/local/src/prometheus/prometheus --config.file=/usr/local/src/prometheus/prometheus.yml
[Install]
WantedBy=multi-user.target
```

**启动服务**

```bash
[20:55:51 root@prometheus prometheus]#systemctl start prometheus.service 
[20:57:45 root@prometheus prometheus]#systemctl status prometheus.service 
● prometheus.service - Prometheus Server
   Loaded: loaded (/etc/systemd/system/prometheus.service; disabled; vendor preset: 
   Active: active (running) since Tue 2021-06-22 20:57:45 CST; 15s ago
#默认监听端口9090
[20:58:20 root@prometheus prometheus]#ss -ntl | grep 9090
LISTEN   0         20480                     *:9090                   *:*
```

web访问

![image-20210622211122900](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210622211122900.png)

## 2.2 node exporter

用来收集宿主机的信息

节点安装node_exporter，用于收集各节点上的监控指标数据，默认监听端口为9100

### 2.2.1 二进制安装node exporter

```bash
[21:05:56 root@ubuntu18-04 src]#ls
node_exporter-1.1.2.linux-amd64.tar.gz
[21:06:21 root@ubuntu18-04 src]#tar xf node_exporter-1.1.2.linux-amd64.tar.gz 
[21:06:25 root@ubuntu18-04 src]#mv node_exporter-1.1.2.linux-amd64 node_exporter
[21:07:02 root@ubuntu18-04 src]#ls -l node_exporter
total 18748
-rw-r--r-- 1 3434 3434    11357 Mar  5 17:41 LICENSE
-rwxr-xr-x 1 3434 3434 19178528 Mar  5 17:29 node_exporter
-rw-r--r-- 1 3434 3434      463 Mar  5 17:41 NOTICE

```

**准备service文件**

```bash
[21:08:31 root@ubuntu18-04 src]#cat /etc/systemd/system/node-exporter.service
[Unit]
Description=Prometheus Node Exporter
After=network.target
[Service]
ExecStart=/usr/local/src/node_exporter/node_exporter
[Install]
WantedBy=multi-user.target
```

**启动服务**

```bash
[21:08:33 root@ubuntu18-04 src]#systemctl start node-exporter.service 
[21:08:57 root@ubuntu18-04 src]#systemctl status node-exporter.service 
● node-exporter.service - Prometheus Node Exporter
   Loaded: loaded (/etc/systemd/system/node-exporter.service; disabled; vendor prese
   Active: active (running) since Tue 2021-06-22 21:08:57 CST; 6s ago
#查看监听端口9100
[21:09:23 root@ubuntu18-04 src]#ss -ntl | grep 9100
LISTEN   0         20480                     *:9100                   *:*  
```

web访问

![image-20210622211135746](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210622211135746.png)

## 2.3 prometheus配置文件

```bash
# my global config                                                                                                                                                       
global:
  scrape_interval:     15s  #收集数据间隔时间，如果不配置默认为一分钟
  evaluation_interval: 15s  #规则扫描时间间隔，如果不配置默认为一分钟

alerting: #报警通知配置
  alertmanagers:
  - static_configs:
    - targets:
      # - alertmanager:9093

rule_files: #规则配置
  # - "first_rules.yml"
  # - "second_rules.yml"


scrape_configs: #数据采集配置
  - job_name: 'prometheus'  #采集目标名称
    static_configs:
    - targets: ['localhost:9090']  #地址与端口
```

### 2.3.1 prometheus采集node 指标数据

配置prometheus通过node exporter采集 监控指标数据

```bash
[10:05:34 root@prometheus ~]#cat /usr/local/src/prometheus/prometheus.yml
# my global config
global:
  scrape_interval:     15s 
  evaluation_interval: 15s 
alerting:
  alertmanagers:
  - static_configs:
    - targets:
rule_files:
  # - "first_rules.yml"
  # - "second_rules.yml"
scrape_configs:
  - job_name: 'prometheus'
    static_configs:
    - targets: ['localhost:9090']
  - job_name: 'node'
    static_configs:
    - targets: ['192.168.10.182:9100']
#重启服务
[10:05:35 root@prometheus ~]#systemctl restart prometheus.service
```

**web验证**

![image-20210623105448871](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210623105448871.png)

## 2.4 PromQL简介

Prometheus提供一个函数式的表达式语言PromQL (Prometheus Query Language)，可以使用户实时地查找和聚合时间序列数据，表达式计算结果可以在图表中展示，也可以在Prometheus表达式浏览器中以表格形式展示，或者作为数据源, 以HTTP API的方式提供给外部系统使用

### 2.4.1 PromQL基本查询

```bash
node_memory_MemTotal_bytes #查询node节点总内存大小
node_memory_MemFree_bytes #查询node节点剩余可用内存

node_disk_io_time_seconds_total{device="sda"} #查询指定磁盘的每秒磁盘io
node_filesystem_free_bytes{device="/dev/sda1",fstype="xfs",mountpoint="/"} #查看指定磁盘的磁盘剩余空间

# HELP node_load1 1m load average. #CPU负载
node_load1
node_load15
node_load5
```

### 2.4.2 PromQL数据类型

```bash
瞬时向量(instant vector) #是一组时间序列，每个时间序列包含单个数据样本，比如node_memory_MemTotal_bytes查询当前剩余内存就是一个瞬时向量，该表达式的返回值中只会包含该时间序列中的最新的一个样本值，而相应的这样的表达式称之为瞬时向量表达式。
范围向量(range vector) #是指在任何一个时间范围内，抓取的所有度量指标数据.比如最近一天的网卡流量趋势图。
标量(scalar) #是一个浮点数类型的数据值，使用node_load1获取到时一个瞬时向量，但是可用使用内置函数scalar()将瞬时向量转换为标量。
字符串(string) #字符串类型的数据，目前使用较少
```

### 2.4.3 PromQL匹配器

= :选择与提供的字符串完全相同的标签。

!= :选择与提供的字符串不相同的标签。

=~ :选择正则表达式与提供的字符串（或子字符串）相匹配的标签。

!~ :选择正则表达式与提供的字符串（或子字符串）不匹配的标签。

```bash
#查询格式<metric name>{<label name>=<label value>, ...}
node_load1{instance="172.31.7.111:9100"}
node_load1{job="promethues-node"}

node_load1{job="promethues-node",instance="172.31.7.111:9100"}
node_load1{job="promethues-node",instance!="172.31.7.111:9100"}
```

### 2.4.4 PromQL时间范围

```bash
s - 秒
m - 分钟
h - 小时
d - 天
w - 周
y - 年

node_memory_MemTotal_bytes{} # 瞬时向量表达式，选择当前最新的数据
node_memory_MemTotal_bytes{}[2m] # 区间向量表达式，选择以当前时间为基准，2分钟内的数据
```

### 2.4.5 PromQL运算符

```bash
+ 加法
- 减法
* 乘法
/ 除法
% 模
^ 幂等

node_memory_MemTotal_bytes/1024/1024  #将内存进行单位转换
node_disk_read_bytes_total{device="sda"} + node_disk_written_bytes_total{device="sda"} #计算磁盘每秒读写数据量
```

### 2.4.6 PromQL聚合运算

```bash
sum (求和)
min (最小值)
max (最大值)
avg (平均值)
stddev (标准差)
stdvar (标准差异)
count (计数)
count_values (对 value 进行计数)
bottomk (样本值最小的 k 个元素)
topk (样本值最大的k个元素)
quantile (分布统计)

max(node_memory_MemTotal_bytes)[5m]  #获5分钟内的最大值
sum(http_requests_total)   #计算http_requests_total最近的请求总量
```

## 2.5 prometheus报警设置

prometheus触发一条告警的过程：

prometheus--->触发阈值--->超出持续时间--->alertmanager--->分组|抑制|静默--->媒体类型--->邮件|钉钉|微信 等。

```bash
分组(group): 将类似性质的警报合并为单个通知，比如网络通知、主机通知、服务通知。
静默(silences): 是一种简单的特定时间静音的机制，例如：服务器要升级维护可以先设置这个时间段告警静默。
抑制(inhibition): 当警报发出后，停止重复发送由此警报引发的其他警报即合并一个故障引起的多个报警事件，可以消除冗余告警
```

![image-20210623141010114](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210623141010114.png)

### 2.5.1 下载并安装报警组件alertmanager

```bash
[14:11:30 root@prometheus src]#ls
alertmanager-0.22.2.linux-amd64.tar.gz  node_exporter  prometheus
[14:11:31 root@prometheus src]#tar xf alertmanager-0.22.2.linux-amd64.tar.gz
[14:11:37 root@prometheus src]#mv alertmanager-0.22.2.linux-amd64 alertmanager
[14:11:57 root@prometheus src]#ls
alertmanager  node_exporter  prometheus
#准备service文件
[14:13:29 root@prometheus src]#cat /etc/systemd/system/alertmanager.service
[Unit]
Description=Prometheus Server
Documentation=https://prometheus.io/docs/introduction/overview/
After=network.target
[Service]
Restart=on-failure
WorkingDirectory=/usr/local/src/alertmanager
ExecStart=/usr/local/src/alertmanager/alertmanager
[Install]
WantedBy=multi-user.target
#启动服务
[14:16:58 root@prometheus alertmanager]#systemctl enable --now alertmanager.service
```

web页面

![image-20210623144742505](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210623144742505.png)

### 2.5.2 alertmanager配置文件

官方配置文档：https://prometheus.io/docs/alerting/configuration/

```bash
global:
	smtp_from: #发件人邮箱地址
	smtp_smarthost: #邮箱smtp地址。
	smtp_auth_username: #发件人的登陆用户名，默认和发件人地址一致。
	smtp_auth_password: #发件人的登陆密码，有时候是授权码。
	smtp_require_tls: #是否需要tls协议。默认是true。

	wechart_api_url: #企业微信API 地址。
	wechart_api_secret： #企业微信API secret
	wechat_api_corp_id: #企业微信corp id信息。

	resolve_timeout: #在指定时间内没有产生新的事件就发送恢复通知
route:  #route用来设置报警的分发策略
  group_by: ['alertname'] #采用哪个标签来作为分组依据
  group_wait: 10s  #组告警等待时间。也就是告警产生后等待10s，如果有同组告警一起发出
  group_interval: 10m  #两组告警的间隔时间
  repeat_interval: 1h  #重复告警的间隔时间，减少相同邮件的发送频率，测试推荐修改短之后在改回去
  receiver: 'web.hook'  #设置接收人
receivers:  #收件人配置
- name: 'web.hook'
#  webhook_configs:
#  - url: 'http://127.0.0.1:5001/'
  email_configs: #发送邮件
    - to: '1191400158@qq.com'
inhibit_rules:  #抑制的规则
  - source_match: #源匹配级别
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'dev', 'instance']
```

### 2.5.3 设置报警机制

如果报警收不到邮件或者微信，可以使用命令前台执行运行服务进行调试

```bash
#开启日志的debug模式，默认为info
./alertmanager --log.level=debug
```

#### 2.5.3.1 设置报警发送邮件

```bash
[14:54:31 root@prometheus src]#cat alertmanager/alertmanager.yml 
global:
  resolve_timeout: 5m
  smtp_smarthost: 'smtp.163.com:465'
  smtp_from: 'zz15049236211@163.com'
  smtp_auth_username: 'zz15049236211@163.com'
  smtp_auth_password: 'KNCGYFDIWSOLSZMX'
  smtp_hello: '@163.com'
  smtp_require_tls: false
#  send_resolved: true
route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10m
  repeat_interval: 1h
  receiver: 'web.hook'
receivers:
- name: 'web.hook'
  email_configs:
    - to: '1191400158@qq.com'
inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'dev', 'instance']
```

#### 2.5.3.2 设置报警发送企业微信

```bash
global:
  resolve_timeout: 5m
  wechat_api_url: 'https://qyapi.weixin.qq.com/cgi-bin/'   #默认就是这个不要修改
  wechat_api_secret: 'SzdkrJyKwSSRpi4YF8p4EHeRmu3Vj_crwkELWcDWMfs'  #应用secret
  wechat_api_corp_id: 'wwf1afcb7e7b881cf8'   #企业id
#  send_resolved: true
route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 30s
  repeat_interval: 1m
  receiver: 'wechat'  
receivers:
- name: 'wechat'
  wechat_configs:  #定义企业微信
  - send_resolved: false
    agent_id: '1000002'  #应用id
    to_user: '@all'      #发送的用户id，@all默认全部
inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'dev', 'instance']
```

### 2.5.4 配置prometheus报警规则

```bash
#配置prometheus
[15:03:56 root@prometheus src]#cat prometheus/prometheus.yml
# my global config
global:
  scrape_interval:     15s 
  evaluation_interval: 15s 
alerting:
  alertmanagers:
  - static_configs:
    - targets:
      - 192.168.10.181:9093  #alertmanager地址
rule_files:
  - 'node.yml'   #指定规则文件
scrape_configs:
  - job_name: 'prometheus'
    static_configs:
    - targets: ['localhost:9090']
  - job_name: 'node'
    static_configs:
    - targets: ['192.168.10.182:9100']
    - targets: ['192.168.10.181:9100']
```

### 2.5.5 创建报警规则文件

```bash
[15:17:05 root@prometheus prometheus]#cat node.yml 
groups:
  - name: zhangzhuo_node.rules   #规则组名称
    rules:
    - alert: node内存可用大小    #规则名称
      expr: node_memory_MemFree_bytes < 10737418240   #规则
      for: 30s   #持续多久确认报警信息
      labels:
        serverity: critical  #标签
      annotations:
        description: node可用内存大小小于10G  #报警信息
```

# 三、Grafana

官方安装文档：https://grafana.com/docs/

调用prometheus的数据，进行更专业的可视化

## 3.1 安装grafana

```bash
[10:06:48 root@prometheus ~]#apt-get install -y adduser libfontconfig1
[10:51:02 root@prometheus ~]#ls
grafana_7.5.8_amd64.deb
[10:51:06 root@prometheus ~]#dpkg -i grafana_7.5.8_amd64.deb 
```

## 3.2 配置文件

```bash
[10:52:33 root@prometheus ~]#vim /etc/grafana/grafana.ini 
[server]
# Protocol (http, https, h2, socket)
protocol = http

# The ip address to bind to, empty will bind to all interfaces
http_addr = 0.0.0.0

# The http port  to use
http_port = 3000
```

## 3.3 启动grafana并登录

```bash
[10:52:55 root@prometheus ~]#systemctl enable --now grafana-server.service
```

web登录：默认用户密码admin

![image-20210623105507257](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210623105507257.png)

## 3.4 grafana web界面

### 3.4.1 添加数据源

![image-20210623105607793](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210623105607793.png)

添加prometheus数据源

![image-20210623105801890](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210623105801890.png)

### 3.4.2 import模板

模板可以在官方匹配搜索相关名称

官方网址：https://grafana.com/grafana/dashboards

![image-20210623110004805](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210623110004805.png)

**下载模板**

![image-20210623110343260](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210623110343260.png)

web界面显示

![image-20210623112231167](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210623112231167.png)

# 四、Prometheus监控常见服务

## 4.1 监控haproxy

**部署haproxy_exporter**

```bash
[19:47:38 root@ubuntu18-04 src]#ls
haproxy_exporter-0.12.0.linux-amd64.tar.gz  lua-5.4.3  node_exporter
[19:47:43 root@ubuntu18-04 src]#tar xf haproxy_exporter-0.12.0.linux-amd64.tar.gz 
[19:47:48 root@ubuntu18-04 src]#mv haproxy_exporter-0.12.0.linux-amd64 haproxy_exporter
[19:47:57 root@ubuntu18-04 src]#ls
haproxy_exporter                            lua-5.4.3
haproxy_exporter-0.12.0.linux-amd64.tar.gz  node_exporter

#运行
[19:49:39 root@ubuntu18-04 haproxy_exporter]#./haproxy_exporter --haproxy.scrape-uri="http://haadmin:123456@127.0.0.1:9999/haproxy-status;csv" &
```

**web验证**

![image-20210623195014524](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210623195014524.png)

**prometheus server端添加haproxy数据采集**

```bash
[19:51:34 root@prometheus ~]#cat /usr/local/src/prometheus/prometheus.yml
# my global config
global:
  scrape_interval:     15s 
  evaluation_interval: 15s 
alerting:
  alertmanagers:
  - static_configs:
    - targets:
      - 192.168.10.181:9093
rule_files:
  - 'node.yml'
  # - "first_rules.yml"
  # - "second_rules.yml"
scrape_configs:
  - job_name: 'prometheus'
    static_configs:
    - targets: ['localhost:9090']
  - job_name: 'node'
    static_configs:
    - targets: ['192.168.10.182:9100']
    - targets: ['192.168.10.181:9100']
  - job_name: 'haproxy'
    static_configs:
    - targets: ['192.168.10.182:9101']  #添加
```

**重启服务验证**

![image-20210623195235669](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210623195235669.png)

**grafana添加模板**

![image-20210623195619944](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210623195619944.png)

## 4.2 prometheus监控nginx

通过prometheus监控nginx

需要在编译安装nginx的时候添加nginx-module-vts模块，github地址：https://github.com/vozlt/nginx-module-vts

### 4.2.1 编译安装nginx

```bash
[20:11:02 root@prometheus ~]#ls
nginx-1.18.0.tar.gz  nginx-module-vts-master.zip
[20:11:33 root@prometheus ~]#unzip nginx-module-vts-master.zip
[20:11:49 root@prometheus ~]#tar xf nginx-1.18.0.tar.gz 
[20:12:44 root@prometheus nginx-1.18.0]#./configure --prefix=/apps/nginx --add-module=/root/nginx-module-vts-master 
[20:12:44 root@prometheus nginx-1.18.0]#make
[20:14:20 root@prometheus nginx-1.18.0]#make install
[20:14:32 root@prometheus nginx-1.18.0]#ls /apps/nginx/
conf  html  logs  sbin

#修改配置文件
http {
    vhost_traffic_status_zone;  #添加

    ...

    server {

        ...

        location /status {  #添加
            vhost_traffic_status_display;
            vhost_traffic_status_display_format html;
        }
    }
}
#启动服务验证
[20:16:44 root@prometheus nginx]#./sbin/nginx 
```

访问状态页

![image-20210623201716668](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210623201716668.png)

**安装nginx exporter**

网站：https://github.com/hnlq715/nginx-vts-exporter

```bash
[20:25:03 root@prometheus ~]#wget https://hub.fastgit.org/hnlq715/nginx-vts-exporter/releases/download/v0.10.3/nginx-vts-exporter-0.10.3.linux-amd64.tar.gz
[20:34:42 root@prometheus ~]#tar xf nginx-vts-exporter-0.10.3.linux-amd64.tar.gz 
[20:34:48 root@prometheus ~]#ls
nginx-vts-exporter-0.10.3.linux-amd64  nginx-vts-exporter-0.10.3.linux-amd64.tar.gz
#启动
[20:37:36 root@prometheus nginx-vts-exporter-0.10.3.linux-amd64]#./nginx-vts-exporter -nginx.scrape_uri http://127.0.0.1/status/format/json &
```

**web验证**

![image-20210623203800531](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210623203800531.png)

**prometheus配置**

```bash
[20:38:56 root@prometheus ~]#cat /usr/local/src/prometheus/prometheus.yml
# my global config
global:
  scrape_interval:     15s 
  evaluation_interval: 15s 
alerting:
  alertmanagers:
  - static_configs:
    - targets:
      - 192.168.10.181:9093
rule_files:
  - 'node.yml'
  # - "first_rules.yml"
  # - "second_rules.yml"
scrape_configs:
  - job_name: 'prometheus'
    static_configs:
    - targets: ['localhost:9090']
  - job_name: 'node'
    static_configs:
    - targets: ['192.168.10.182:9100']
    - targets: ['192.168.10.181:9100']
  - job_name: 'haproxy'
    static_configs:
    - targets: ['192.168.10.182:9101']
  - job_name: 'nginx'
    static_configs:
    - targets: ['192.168.10.181:9913'] #添加
```

**grafana关联模板**

![image-20210623204326902](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210623204326902.png)

---
title: "Zabbix监控服务"
date: 2021-05-17T16:47:19+08:00
lastmod: 2021-05-17T16:47:34+08:00
draft: false
description: "以监控体系与 Zabbix 架构为主线，完成服务端、Agent 和告警配置。"
cover: "https://b3logfile.com/bing/20201227.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["应用服务"]
tags: ["Zabbix"]
toc: true
---
# 一 、监控服务介绍

## 1.1 逻辑布局

![image-20210509122232299](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210509122232299.png)

## 1.2 整体布局

![image-20210509122251115](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210509122251115.png)

## 1.3 常见的监控方案

开源监控软件：cacti、nagios、zabbix、smokeping、open-falcon等

**Cacti**

https://www.cacti.net/

https://github.com/Cacti/cacti

```bash
Cacti是基于LAMP平台展现的网络流量监测及分析工具，通过SNMP技术或自定义脚本从目标设备/主机获取监控指标信息；其次进行数据存储，调用模板将数据存到数据库，使用rrdtool存储和更新数据，通过rrdtool绘制结果图形；最后进行数据展现，通过Web方式将监控结果呈现出来，常用于在数据中心监控网络设备。
```

**Nagios**

https://www.nagios.org/

```bash
Nagios用来监视系统和网络的开源应用软件，利用其众多的插件实现对本机和远端服务的监控，当被监控对象发生异常时，会及时向管理员告警，提供一批预设好的监控插件，用户可以之间调用，也可以自定义Shell脚本来监控服务，适合各企业的业务监控，可通过Web页面显示对象状态、日志、告警信息，分层告警机制及自定义监控相对薄弱
```

**SmokePing**

https://oss.oetiker.ch/smokeping/

http://blogs.studylinux.net/?p=794

```bash
Smokeping是一款用于网络性能监测的开源监控软件，主要用于对IDC的网络状况，网络质量，稳定性等做检测，通过rrdtool制图方式，图形化地展示网络的时延情况，进而能够清楚的判断出网络的即时通信情况。
```

**Open-falcon**

https://www.open-falcon.org/

https://github.com/XiaoMi/open-falcon

```bash
小米公司开源出来的监控软件open-falcon(猎鹰)，监控能力和性能较强。
```

**夜莺**

https://n9e.didiyun.com/

```bash
一款经过大规模生产环境验证的、分布式高性能的运维监控系统，有滴滴基于open-falcon二次开发后开源出来的分布式监控系统。
```

**Zabbix**

https://www.zabbix.com/cn/

```bash
目前使用较多的开源监控软件，可横向扩展、自定义监控项、支持多种监控方式、可监控网络与服务等。
```

**Prometheus**

针对容器环境的开源监控软件

**商业监控解决方案**

```bash
监控宝(https://www.jiankongbao.com/)
听云(https://www.tingyun.com/)
```

## 1.4 Zabbix使用场景及系统概述

https://www.zabbix.com/cn/features

Zabbix是一个企业级解决方案，支持实时监控数千台服务器，虚拟机和网络设备，采集百万级监控指标，适用于任 何IT基础架构、服务、应用程序和资源的解决方案

### 1.4.1 zabbix使用场景

![image-20210509122754452](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210509122754452.png)

### 1.4.2 zabbix系统概述

**数据采集**

周期性时序数据

```bash
主机/对象：服务器、路由器、交换机、存储、防火墙、IP、PORT、URL、自定义监控对象...
采集目标：监控项，指标数据（metrics data）
```

**数据存储**

监控数据存储系统

```bash
SQL: MySQL/MariaDB(Zabbix)
NoSQL：Redis(Open-falcon)
rrd: Round Robin Database(Cacti)
```

**数据类型**

```bash
历史数据: 每个监控项采集到的每个监控值
趋势数据: 趋势表里主要保留某个监控项一个小时内历史数据的最大值、最小值和平均值以及该监控项一个小时内所采集到的数据个数。
```

**阈值**

可按照预定义的阈值等级实现分层报警

**告警机制**

email,短信,微信,语音,故障自治愈

### 1.4.3 zabbix 核心任务

**数据采集**

数据采集方式：zabbix-server，zabbix-proxy，zabbix-agent

```bash
Agentless：SNMP,Telnet,ssh, IPMI, JMX,
Agent：zabbix agent
```

**数据存储**

```bash
zabbix database
```

**数据展示**

zabbix web

```bash
graph -> screen -> slideshow(将多个screen以幻灯片的方式进行轮流展示)
```

**grafana**

```bash
以zabbix为数据源展示更绚丽的界面
```

### 1.4.4 告警通知

```bash
host (host groups) <- templates #从模板继承告警配置
host -> items -> triggers -> action (条件-conditions, 操作-operations) #自定义告警配置
```

# 二、Zabbix 规划及部署

**部署环境**

服务器系统：ubuntu 18.04.3/Centos 7.x

| 主机类型        | IP地址         |
| --------------- | -------------- |
| zabbix server   | 192.168.10.181 |
| zabbix 主动代理 | 192.168.10.182 |
| zabbix 被动代理 | 192.168.10.183 |
| mysql master    | 192.168.10.186 |
| mysql slave     | 192.168.10.187 |
| web server1     | 192.168.10.184 |
| web server2     | 192.168.10.185 |

## 2.1 系统环境

最小化安装操作系统，然后安装常用依赖包

**Centos 7.x**

```bash
[12:39:44 root@zabbix-server ~]#yum install vim iotop bc gcc gcc-c++ glibc glibc-devel pcre pcre-devel openssl openssl-devel zip unzip zlib-devel net-tools lrzsz tree ntpdate telnet lsof tcpdump wget libevent libevent-devel
```

**Ubuntu 18.04**

```bash
[12:41:29 root@zabbix-server ~]#apt install iproute2 ntpdate tcpdump telnet traceroute nfs-kernel-server nfs-common lrzsz tree openssl libssl-dev libpcre3 libpcre3-dev zlib1g-dev ntpdate tcpdump telnet traceroute gcc openssh-server lrzsz tree openssl libssl-dev libpcre3 libpcre3-dev zlib1g-dev ntpdate tcpdump telnet traceroute iotop unzip zip
```

## 2.2 apt/yum安装 zabbix

产品手册：https://www.zabbix.com/documentation/4.0/zh/manual

### 2.2.1 apt安装zabbix

使用apt在ubuntu 安装zabbix 4.0.x版本

#### 2.2.1.1 安装zabbix server

安装包下载地址：https://www.zabbix.com/cn/download?zabbix=4.0&os_distribution=ubuntu&os_version=18.04_bionic&db=mysql&ws=apache

```bash
[12:42:37 root@zabbix-server ~]#wget https://repo.zabbix.com/zabbix/4.0/ubuntu/pool/main/z/zabbix-release/zabbix-release_4.0-3+bionic_all.deb
[12:45:08 root@zabbix-server ~]#dpkg -i zabbix-release_4.0-3+bionic_all.deb 
#安装
[12:49:16 root@zabbix-server ~]#apt -y install zabbix-server-mysql zabbix-frontend-php zabbix-agent
```

#### 2.2.1.2 准备数据库

在mysql maser安装数据库并授权zabbix使用，yum安装的zabbix默认会安装数据库

```bash
[12:49:48 root@zabbix-server ~]#ss -ntl | grep 3306
LISTEN   0         80                127.0.0.1:3306             0.0.0.0:*     
[12:51:03 root@zabbix-server ~]#lsof -i:3306
COMMAND   PID  USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
mysqld  15042 mysql   17u  IPv4  56350      0t0  TCP localhost:mysql (LISTEN)
[12:52:49 root@zabbix-server ~]#vim /etc/mysql/mariadb.conf.d/50-server.cnf
bind-address        = 0.0.0.0  #修改监听地址
#重启数据库服务
[12:53:06 root@zabbix-server ~]#systemctl restart mariadb
[12:53:24 root@zabbix-server ~]#mysql   #进入数据库创建账户授权
MariaDB [(none)]> create database zabbix_server character set utf8 collate utf8_bin;   #创建数据库
Query OK, 1 row affected (0.00 sec)

MariaDB [(none)]> create user zabbix@'192.168.%.%' identified by '123456';
Query OK, 0 rows affected (0.00 sec)  #创建用户

MariaDB [(none)]> grant all on zabbix_server.* to zabbix@'192.168.%.%';
Query OK, 0 rows affected (0.00 sec)  #授权
#测试
[12:59:46 root@zabbix-server ~]#mysql -uzabbix -p123456 -h192.168.10.181
MariaDB [(none)]> show databases;
+--------------------+
| Database           |
+--------------------+
| information_schema |
| zabbix_server      |
+--------------------+
```

#### 2.2.1.3 导入数据库

在zabbix server初始化数据库

```bash
[13:13:29 root@zabbix-server ~]#ll /usr/share/doc/zabbix-server-mysql/create.sql.gz
-rw-r--r-- 1 root root 1307916 Mar 29 17:00 /usr/share/doc/zabbix-server-mysql/create.sql.gz
[13:14:03 root@zabbix-server ~]#zcat /usr/share/doc/zabbix-server-mysql/create.sql.gz | mysql -uzabbix -p123456 -h192.168.10.181 zabbix_server
#验证数据库
[13:14:40 root@zabbix-server ~]#mysql -uzabbix -p123456 -h192.168.10.181 zabbix_server
MariaDB [zabbix_server]> show tables;
+----------------------------+
| Tables_in_zabbix_server    |
+----------------------------+
| acknowledges               |
| actions                    |
| alerts                     |
....
```

#### 2.2.1.4 编辑zabbix server配置文件

```bash
[13:15:31 root@zabbix-server ~]#vim /etc/zabbix/zabbix_server.conf
DBHost=192.168.10.181
DBName=zabbix_server
DBUser=zabbix
DBPassword=123456    #这里不要加引号
DBPort=3306
```

#### 2.2.1.5 重启zabbix服务

```bash
[13:17:05 root@zabbix-server ~]#systemctl restart zabbix-server zabbix-agent apache2
```

#### 2.2.1.6 访问web界面

http://192.168.10.181/zabbix/

![image-20210509131954938](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210509131954938.png)

#### 2.2.1.7 解决时区问题

```bash
[13:18:02 root@zabbix-server ~]#vim /etc/zabbix/apache.conf
php_value date.timezone Asia/Shanghai 
[13:20:53 root@zabbix-server ~]#systemctl restart zabbix-server zabbix-agent apache2
```

#### 2.2.1.8 登录界面

用户名Admin，密码zabbix

![image-20210509133200766](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210509133200766.png)

#### 2.2.1.9 zabbix登录后的监控图形界面

![image-20210509133332473](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210509133332473.png)

### 2.2.2 yum安装zabbix

```bash
[13:34:09 root@zabbix-server ~]#rpm -Uvh https://repo.zabbix.com/zabbix/4.0/rhel/7/x86_64/zabbix-release-4.0-2.el7.noarch.rpm
[13:34:33 root@zabbix-server ~]#yum clean all
[13:34:51 root@zabbix-server ~]#yum install zabbix-server-mysql zabbix-web-mysql zabbix-agent
#其余步骤与ubuntu的apt安装一样
```

## 2.3 编译安装zabbix

编译安装zabbix server与agent

### 2.3.1 下载源码包

下载地址：https://www.zabbix.com/cn/download_sources#tab:40LTS

```bash
[13:39:31 root@zabbix-server~]# wget https://cdn.zabbix.com/zabbix/sources/stable/4.0/zabbix-4.0.30.tar.gz
#创建用户与组
[13:40:09 root@zabbix-server ~]#useradd -r -s /sbin/nologin zabbix
[13:42:34 root@zabbix-server ~]#id zabbix 
uid=999(zabbix) gid=999(zabbix) groups=999(zabbix)
#解包
[13:42:38 root@zabbix-server ~]#tar xf zabbix-4.0.30.tar.gz
[13:43:40 root@zabbix-server ~]#ls
zabbix-4.0.30  zabbix-4.0.30.tar.gz
```

### 2.3.2 解决依赖关系

**Centos：**

```bash
yum install gcc libxml2-devel net-snmp net-snmp-devel curl curl-devel php php-bcmath php-mbstring mariadb mariadb-devel -y
```

**ubuntu：**

```bash
[13:43:41 root@zabbix-server ~]#apt update
[13:48:34 root@zabbix-server ~]#apt-get install apache2 apache2-bin apache2-data apache2-utils fontconfig-config fonts-dejavu-core fping libapache2-mod-php libapache2-mod-php7.2 libapr1 libaprutil1 libaprutil1-dbd-sqlite3 libaprutil1-ldap libfontconfig1 libgd3 libiksemel3 libjbig0 libjpeg-turbo8 libjpeg8 liblua5.2-0 libodbc1 libopenipmi0 libsensors4 libsnmp-base libsnmp30 libsodium23 libssh2-1 libtiff5 libwebp6 libxpm4 php-bcmath php-common php-gd php-ldap php-mbstring php-mysql php-xml php7.2-bcmath php7.2-cli php7.2-common php7.2-gd php7.2-json php7.2-ldap php7.2-mbstring php7.2-mysql php7.2-opcache php7.2-readline php7.2-xml snmpd ssl-cert ttf-dejavu-core libmysqlclient-dev libxml2-dev libxml2 snmp libsnmp-dev libevent-dev openjdk-8-jdk curl libcurl4-openssl-dev
```

### 2.3.3 编译安装Zabbix

```bash
[13:49:22 root@zabbix-server zabbix-4.0.30]#pwd
/root/zabbix-4.0.30
[13:49:55 root@zabbix-server zabbix-4.0.30]#./configure --prefix=/apps/zabbix_server --enable-server --enable-agent --with-mysql --with-net-snmp --with-libcurl --with-libxml2
[13:51:17 root@zabbix-server zabbix-4.0.30]#make install
```

### 2.3.4 准备数据库

官方文档：https://www.zabbix.com/documentation/4.0/zh/manual/appendix/install/db_scripts

```bash
[13:51:59 root@mysql-server ~]#apt update
[13:52:09 root@mysql-server ~]#apt install mysql-server
[13:52:44 root@mysql-server ~]#mysql -uroot -p123456
mysql> create database zabbix_server character set utf8 collate utf8_bin;
Query OK, 1 row affected, 2 warnings (0.06 sec)
mysql> create user zabbix@'192.168.%.%' identified by '123456';
Query OK, 0 rows affected (0.06 sec)

mysql> grant all on zabbix_server.* to zabbix@'192.168.%.%';
Query OK, 0 rows affected (0.01 sec)
#数据库版本如果大于8.0.11需要设置之前的验证方法
ALTER USER 'zabbix'@'192.168.%.%' IDENTIFIED WITH mysql_native_password BY '123456';
23456';
#测试
[13:57:59 root@mysql-server ~]#mysql -uzabbix -p123456 -h192.168.10.186
mysql> show databases;
+--------------------+
| Database           |
+--------------------+
| information_schema |
| zabbix_server      |
+--------------------+
2 rows in set (0.02 sec)
```

### 2.3.5 导入数据库

```bash
[13:58:50 root@zabbix-server zabbix-4.0.30]#apt install mysql-client #安装mysql客户端命令，用于测试zabbix 数据库账号权限
[13:59:33 root@zabbix-server zabbix-4.0.30]#mysql -uzabbix -p123456 -h192.168.10.18  #测试权限
[14:00:30 root@zabbix-server zabbix-4.0.30]#cd database/mysql/
[14:00:36 root@zabbix-server mysql]#pwd

#导入数据，顺序不能错
[14:00:36 root@zabbix-server mysql]#mysql -uzabbix -p123456 -h192.168.10.186 zabbix_server <schema.sql 
# 下面步骤当创建Zabbix proxy数据库时不需要执行
[14:02:28 root@zabbix-server mysql]#mysql -uzabbix -p123456 -h192.168.10.186 zabbix_server <images.sql 
[14:02:55 root@zabbix-server mysql]#mysql -uzabbix -p123456 -h192.168.10.186 zabbix_server <data.sql

#验证数据库数据
mysql> show tables;
+----------------------------+
| Tables_in_zabbix_server    |
+----------------------------+
| acknowledges               |
| actions                    |
| alerts                     |
| application_discovery      |
| application_prototype      |
....
```

### 2.3.6 编辑zabbix server配置文件

```bash
[14:06:28 root@zabbix-server mysql]#grep -Ev "^#|^$" /apps/zabbix_server/etc/zabbix_server.conf
LogFile=/tmp/zabbix_server.log
DBHost=192.168.10.186
DBName=zabbix_server
DBUser=zabbix
DBPassword=123456
DBPort=3306
Timeout=4
LogSlowQueries=3000
```

### 2.3.7 启动zabbix server

```bash
[14:09:06 root@zabbix-server mysql]#/apps/zabbix_server/sbin/zabbix_server -c /apps/zabbix_server/etc/zabbix_server.conf

[14:09:50 root@zabbix-server mysql]#ps -ef | grep zabbix
zabbix    39284      1  0 14:07 ?        00:00:00 /apps/zabbix_server/sbin/zabbix_server -c /apps/zabbix_server/etc/zabbix_server.conf
zabbix    39285  39284  0 14:07 ?        00:00:00 /apps/zabbix_server/sbin/zabbix_server: configuration syncer [synced configuration in 0.017751 sec, idle 60 sec]
zabbix    39286  39284  0 14:07 ?        00:00:00 /apps/zabbix_server/sbin/zabbix_server: housekeeper [startup idle for 30 minutes]
......
```

### 2.3.8 配置web界面

#### 2.3.8.1 拷贝web界面程序

官方文档：https://www.zabbix.com/documentation/4.0/zh/manual/installation/install

```bash
[14:09:56 root@zabbix-server mysql]#mkdir /var/www/html/zabbix
[14:12:10 root@zabbix-server zabbix-4.0.30]#pwd
/root/zabbix-4.0.30
[14:12:15 root@zabbix-server zabbix-4.0.30]#cd frontends/php/
[14:12:21 root@zabbix-server php]#cp -a . /var/www/html/zabbix/
```

访问web页面

![image-20210509141342690](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210509141342690.png)

#### 2.3.8.2 解决报错

```bash
[14:12:40 root@zabbix-server php]#apt-get install php-gettext php-xml php-net-socket php-gd php-mysql
[14:15:33 root@zabbix-server php]#vim /etc/php/7.2/apache2/php.ini
post_max_size = 16M
max_execution_time = 300
max_input_time = 300
date.timezone = Asia/Shanghai 
[14:37:23 root@zabbix-server php]#systemctl restart apache2
```

#### 2.3.8.3 创建配置文件

```bash
[14:39:57 root@zabbix-server conf]#cat /var/www/html/zabbix/conf/zabbix.conf.php
<?php
// Zabbix GUI configuration file.
global $DB;

$DB['TYPE']     = 'MYSQL';
$DB['SERVER']   = '192.168.10.186';
$DB['PORT']     = '3306';
$DB['DATABASE'] = 'zabbix_server';
$DB['USER']     = 'zabbix';
$DB['PASSWORD'] = '123456';

// Schema name. Used for IBM DB2 and PostgreSQL.
$DB['SCHEMA'] = '';

$ZBX_SERVER      = '192.168.10.181';
$ZBX_SERVER_PORT = '10051';
$ZBX_SERVER_NAME = 'zabbix_zhangzhuo';

$IMAGE_FORMAT_DEFAULT = IMAGE_FORMAT_PNG;
```

### 2.3.9 启动zabbix agent

```bash
[14:39:58 root@zabbix-server conf]#/apps/zabbix_server/sbin/zabbix_agentd
```

### 2.3.10  验证zabbix 监控数据

![image-20210509144201324](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210509144201324.png)

### 2.3.11 zabbix server与agent启动文件

通过service启动文件启动zabbix server与zabbix agent。

#### 2.3.11.1 zabbix server启动脚本

```bash
[15:36:59 root@zabbix-server ~]#cat /lib/systemd/system/zabbix-server.service 
[Unit]
Description=Zabbix Server
After=syslog.target
After=network.target
[Service]
Environment="CONFFILE=/apps/zabbix_server/etc/zabbix_server.conf"
#EnvironmentFile=-/etc/default/zabbix-server
Type=forking
Restart=on-failure
PIDFile=/apps/zabbix_server/pid/zabbix_server.pid
KillMode=control-group
ExecStart=/apps/zabbix_server/sbin/zabbix_server -c $CONFFILE
ExecStop=/bin/kill -SIGTERM $MAINPID
RestartSec=10s
TimeoutSec=infinity
[Install]
WantedBy=multi-user.target
#修改配置文件
[15:37:15 root@zabbix-server ~]#vim /apps/zabbix_server/etc/zabbix_server.conf
PidFile=/apps/zabbix_server/pid/zabbix_server.pid
#启动
[15:38:22 root@zabbix-server ~]#systemctl start zabbix-server.service
```

#### 2.3.11.2 zabbix agent启动脚本

```bash
[15:39:06 root@zabbix-server ~]#cat /lib/systemd/system/zabbix-agent.service
[Unit]
Description=Zabbix Agent
After=syslog.target
After=network.target
[Service]
Environment="CONFFILE=/apps/zabbix_server/etc/zabbix_agentd.conf"
#EnvironmentFile=-/etc/default/zabbix-agent
Type=forking
Restart=on-failure
PIDFile=/apps/zabbix_server/pid/zabbix_agentd.pid
KillMode=control-group
ExecStart=/apps/zabbix_server/sbin/zabbix_agentd -c $CONFFILE
ExecStop=/bin/kill -SIGTERM $MAINPID
RestartSec=10s
User=zabbix
Group=zabbix
[Install]
WantedBy=multi-user.target
#修改配置文件
[15:39:24 root@zabbix-server ~]#vim /apps/zabbix_server/etc/zabbix_agentd.conf
PidFile=/apps/zabbix_server/pid/zabbix_agentd.pid
#启动
[15:40:03 root@zabbix-server ~]#systemctl start zabbix-agent.service
```

## 2.4 Web界面中文菜单环境

### 2.4.1 中文选项无法选择

由于ubuntu系统目前未安装中文语言环境所以无法选择中文显示，如下：

![image-20210509154233826](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210509154233826.png)

### 2.4.2 ubuntu系统安装中文语言环境

安装并设置中文简体语言环境

```bash
#安装简体中文语言环境
[15:43:42 root@zabbix-server ~]#apt install language-pack-zh*
#增加中文语言环境变量
[15:44:20 root@zabbix-server ~]#cat /etc/environment
PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games"
LANG="zh_CN.UTF-8"
#重新设置本地配置
[15:45:36 root@zabbix-server ~]#dpkg-reconfigure locales
```

![image-20210509154648178](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210509154648178.png)

![image-20210509154652417](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210509154652417.png)

### 2.4.3 验证web界面

重启apache并验证wen页面

```bash
[15:46:23 root@zabbix-server ~]#systemctl restart apache2
```

![image-20210509154804326](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210509154804326.png)

### 2.4.4 设置中文后监控项与乱码

**图形乱码**

当前系统有些监控项部分显示有乱码，使由于web界面显示为中文但是系统没有相关字体支持，因此需要相关字体 的支持才能正常显示，如下：

![image-20210509154934409](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210509154934409.png)

**在windows拷贝字体**

在Windows上找到控制面板-->字体-->楷体(或者其他个人喜欢的中文字体)，然后将字体拷贝到windows系统其他 目录，比如拷贝至windows当前用户的桌面。

**上传字体到zabbix web目录**

将windows 字体文件上传至zabbix web目录，具体路径为/ZABBIX/WEB/PATH/assets/fonts/，如下：

```bash
[15:51:09 root@zabbix-server ~]#cd /var/www/html/zabbix/assets/fonts/
#上传
[15:51:34 root@zabbix-server fonts]#ls
DejaVuSans.ttf  simkai.ttf
```

**修改zabbix文件调用新字体**

```bash
[15:51:37 root@zabbix-server fonts]#cd /var/www/html/zabbix/
[15:52:21 root@zabbix-server zabbix]#vim include/defines.inc.php 
#修改这俩行
define('ZBX_GRAPH_FONT_NAME',      'simkai');
define('ZBX_FONT_NAME', 'simkai');
```

**验证字体是否生效**

![image-20210509155728500](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210509155728500.png)

## 2.6 zabbix server配置文件详解

```bash
ListenPort=10051   #zabbix_server监听端口，默认10051
sourceIP=          #多IP地址情况下，与其他服务器通信使用的源IP地址
LogType=file       #日志类型，一般为文件
LogFile=           #日志存放位置
LogFileSize=1      #日志最大大小单位M
DebugLevel=3       #日志级别
PidFile=           #pid文件位置
SocketDir=         #socket文件位置
DBHost=192.168.10.181 #数据库地址
DBName=zabbix_server  #数据库名称
DBUser=zabbix         #数据库连接用户
DBPassword=123456     #连接数据库用户密码
DBPort=3306           #连接数据库端口
HistoryStorageURL=  #elasticsearch服务器地址，保存zabbix历史数据到ES里面优化zabbix性能
HistoryStorageTypes=uint,dbl,str,log,text #elasticsearch索引类型
HistoryStorageDateIndex=0  #将历史数据保存到不同的ES索引
ExportDir=                 #自定义实时导出触发器事件，监控采集值。趋势数据的目录
ExportFileSize=1G          #定义导出数据的最大大小
StartPollers=5             #预启动多少个实例数量
StartIPMIPollers=0         #IPMI收集数量
StartPreprocessors=3       #预启动多少个进程用于处理zabbix agent数据
StartPollersUnreachable=1  #不可达主机的轮询进程的初始实例启动数量
StartTrappers=5            #预启动的tarppers进程数量，主要用来处理报警信息
StartPingers=1             #启动多少个进程进行ping检测
StartDiscoverers=1         #预启动多少个进程用来主动发现，自带发现zabbix agentd
StartHTTPPollers=1		   #处理web用户的请求进程
StartTimers=1			   #计时器实例数量，计时器用于计算问题发送的时间
StartEscalators=1		   #es进程初始数量，用于处理动作中的自动步骤的进程数量
StartAlerters=3            #报警实例预启动数量
JavaGateway=               #javagateway服务器地址，java pollers必须设置
JavaGatewayPort=10052      #javagateway端口
StartJavaPollers=0         #预启动多少个实例处理
StartVMwareCollectors=0    #预启动多少个进程处理vmware的监控
VMwareFrequency=60         
VMwarePerfFrequency=60     
VMwareCacheSize=8M         
VMwareTimeout=10           
SNMPTrapperFile=/tmp/zabbix_traps.tmp  #snmp触发器文件存放在什么位置
StartSNMPTrapper=0        #启动多少个snmp进程
ListenIP=0.0.0.0          #监听地址
HousekeepingFrequency=1   #自动清理数据库时间间隔
MaxHousekeeperDelete=5000 #一次最多清理多少行
CacheSize=8M              #配置信息缓存大小
CacheUpdateFrequency=60   #缓存更新周期单位秒
StartDBSyncers=4          #预启动多少个进程与数据库同步数据
HistoryCacheSize=16M      #历史数据缓存大小
HistoryIndexCacheSize=4M  #索引大小
TrendCacheSize=4M         #趋势数据缓存大小
ValueCacheSize=8M         #历史值缓存大小
Timeout=4                 #获取数据的等待超时时间
TrapperTimeout=300        #触发器处理数据的最长时间，单位是秒
UnreachablePeriod=45      #当主机不可达多少秒后，设置主机不可用
UnavailableDelay=60       #当主机不可用，多久检查下主机的可用性
UnreachableDelay=15       #当主机不可达，多久检查下主机的可用性
AlertScriptsPath=${datadir}/zabbix/alertscripts  #报警邮件脚本存放位置
ExternalScripts=${datadir}/zabbix/externalscripts #扩展脚本存放位置
FpingLocation=/usr/sbin/fping   #fping命令位置
Fping6Location=/usr/sbin/fping6 #fping6命令位置
SSHKeyLocation=      #密钥放在什么位置
LogSlowQueries=3000  #慢日志生成时间
TmpDir=/tmp          #临时文件目录
StartProxyPollers=1  #预启动多个个进程被动收集proxy数据
ProxyConfigFrequency=3600 #被动模式下多少秒同步配置文件
ProxyDataFrequency=1   #被动模式下数据获取周期时间
AllowRoot=0  #是否使用root用户启动
User=zabbix #启动用户
Include=    #导入的配置文件
StatsAllowedIP=  #授权那些地址可以访问
LoadModulePath=${libdir}/modules #加载外部的模块位置
LoadModule= #加载的模块名称
```

# 三、Zabbix 监控入门基础

学习通过apt/yum安装zabbix agent、对tomcat进行监控

## 3.1 监控linux系统

在其他linux服务器安装zabbix agent，然后添加到zabbix server以对其进行资源监控。

### 3.1.1 zabbix agent安装

```bash
[20:29:46 root@zabbix-web1 ~]#wget https://repo.zabbix.com/zabbix/4.0/ubuntu/pool/main/z/zabbix-release/zabbix-release_4.0-3+bionic_all.deb
[20:29:50 root@zabbix-web1 ~]#dpkg -i zabbix-release_4.0-3+bionic_all.deb
[20:30:20 root@zabbix-web1 ~]#apt update 
[20:30:28 root@zabbix-web1 ~]#apt install -y zabbix-agent
```

### 3.1.2 zabbix agent配置文件

```bash
[20:31:20 root@zabbix-web1 ~]#grep -Ev "^#|^$" /etc/zabbix/zabbix_agentd.conf
PidFile=/var/run/zabbix/zabbix_agentd.pid
LogFile=/var/log/zabbix/zabbix_agentd.log
LogFileSize=0
Server=192.168.10.181    #指向当前zabbix server
ListenIP=0.0.0.0         #监听端口
StartAgents=3            #被动状态时默认启动的实例数(进程数)，为0不监听任何端口
ServerActive=127.0.0.1
Hostname=192.168.10.182   #区分大小写且在zabbix server唯一的值
Include=/etc/zabbix/zabbix_agentd.d/*.conf
```

### 3.1.3 重启zabbix agent

```bash
[20:31:36 root@zabbix-web1 ~]#systemctl restart zabbix-agent.service 
[20:32:59 root@zabbix-web1 ~]#systemctl status zabbix-agent.service 
● zabbix-agent.service - Zabbix Agent
   Loaded: loaded (/lib/systemd/system/zabbix-agent.service; disabled; vendor preset
   Active: active (running) since Mon 2021-05-10 20:32:59 CST; 5s ago
  Process: 5108 ExecStop=/bin/kill -SIGTERM $MAINPID (code=exited, status=0/SUCCESS)
  Process: 5109 ExecStart=/usr/sbin/zabbix_agentd -c $CONFFILE (code=exited, status=
 Main PID: 5132 (zabbix_agentd)
 #验证
 [20:33:25 root@zabbix-web1 ~]#ps -ef | grep zabbix
zabbix     5132      1  0 20:32 ?        00:00:00 /usr/sbin/zabbix_agentd -c /etc/zabbix/zabbix_agentd.conf
zabbix     5134   5132  0 20:32 ?        00:00:00 /usr/sbin/zabbix_agentd: collector [idle 1 sec]
zabbix     5135   5132  0 20:32 ?        00:00:00 /usr/sbin/zabbix_agentd: listener #1 [waiting for connection]
zabbix     5136   5132  0 20:32 ?        00:00:00 /usr/sbin/zabbix_agentd: listener #2 [waiting for connection]
zabbix     5137   5132  0 20:32 ?        00:00:00 /usr/sbin/zabbix_agentd: listener #3 [waiting for connection]
zabbix     5138   5132  0 20:32 ?        00:00:00 /usr/sbin/zabbix_agentd: active checks #1 [idle 1 sec]
root       5142   1985  0 20:33 pts/0    00:00:00 grep --color=auto zabbix
```

### 3.1.4 zabbix web界面添加被监控主机

在zabbix web管理界面添加上一步安装了zabbix agent的linux主机。

![image-20210510203713733](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210510203713733.png)

输入主机名一般为agent配置文件中的Hostname=192.168.10.182

选择群主没有的话新建

agent代理程序接口写安装agent的服务器IP与端口

### 3.1.5 关联监控模板

在zabbix对主机实现监控，可以通过添加模板或者添加监控项实现对指定的监控目标进行数据采集，通常采用先创建模板，然后再将模板关联至主机的方式，模板关联如下：

**选择模板**

![image-20210510204020229](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210510204020229.png)

选择自带的Template Os Linux模板可以监控linux系统

之后保存并确认

### 3.1.6 验证监控数据

经过一段时间的数据采集后，验证zabbix server是否有刚添加完成主机的监控数据和图形，图形显示如下：

![image-20210510204304134](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210510204304134.png)

至此，针对linux系统的zabbix agent安装、添加主机和监控就简单完成了。

## 3.2 监控tomcat

学习如何通过java gateway实现对tomcat的指标进行数据采集和图形展示，如堆栈内存利用率、当前会话连接数、 繁忙线程等。

![Zabbix](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/Zabbix.jpg)

### 3.2.1 部署tomcat服务器

```bash
...略，我这里使用脚本安装
#准备访问目录
[20:58:36 root@tomcat-web1 ROOT]#rm -rvf /usr/local/tomcat/webapps/ROOT/*
[20:59:06 root@tomcat-web1 ROOT]#hostname >/usr/local/tomcat/webapps/ROOT/index.htm
#测试访问
[20:59:18 root@tomcat-web1 ROOT]#curl 192.168.10.183:8080
tomcat-web1.zhangzhuo.org
```

### 3.2.2 部署java gateway服务器

java gateway是一个独立于zabbix server和zabbix agent的组件，也就是java gateway可以是单独的一台服务器， 但是也可以和zabbix server或者zabbix agent公用一台服务器，前提是端口不要配置冲突了。

本次跟tomcat共用一台服务器

```bash
[21:01:07 root@tomcat-web1 ~]#wget https://repo.zabbix.com/zabbix/4.0/ubuntu/pool/main/z/zabbix-release/zabbix-release_4.0-3+bionic_all.deb
[21:01:13 root@tomcat-web1 ~]#dpkg -i zabbix-release_4.0-3+bionic_all.deb
[21:01:29 root@tomcat-web1 ~]#apt update
[21:01:50 root@tomcat-web1 ~]#apt install zabbix-java-gateway
#配置java gateway服务器
[21:03:55 root@tomcat-web1 ~]#grep -Ev "^#|^$" /etc/zabbix/zabbix_java_gateway.conf
LISTEN_IP="0.0.0.0"
LISTEN_PORT=10052
PID_FILE="/var/run/zabbix/zabbix_java_gateway.pid"
START_POLLERS=50
TIMEOUT=30
#启动
[21:04:13 root@tomcat-web1 ~]#systemctl restart zabbix-java-gateway.service 
#验证
[21:04:52 root@tomcat-web1 ~]#lsof -i:10052
COMMAND  PID   USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
java    5796 zabbix   12u  IPv6  40609      0t0  TCP *:10052 (LISTEN)
```

或者编译安装java gateway

```bash
yum install gcc libxml2-devel net-snmp net-snmp-devel curl curl-devel php phpbcmath php-mbstring mariadb-devel java-1.8.0-openjdk-devel -y
# ./configure --prefix=/usr/local/zabbix --enable-java --with-net-snmp --with-mysql -
-with-ssh2
#make install
#/usr/local/zabbix/sbin/zabbix_java/startup.sh #编译安装的java gateway启动方式
```

### 3.2.3 配置zabbix server调用java gateway

```bash
[18:15:43 root@zabbix-server ~]#vim /apps/zabbix_server/etc/zabbix_server.conf
JavaGateway=192.168.10.183 #监听地址
JavaGatewayPort=10052 #指定java gateway的服务器监听端口，如果是默认端口可以不写
StartJavaPollers=20 #启动多少个线程去轮训 java gateway
#重启zabbix server
[21:07:02 root@zabbix-server ~]#systemctl restart zabbix-server.service 
#验证
[21:07:50 root@zabbix-server ~]#ps -ef | grep java
zabbix    46476  46465  0 21:07 ?        00:00:00 /apps/zabbix_server/sbin/zabbix_server: java poller #1 [got 0 values in 0.000008 sec, idle 5 sec]
zabbix    46477  46465  0 21:07 ?        00:00:00 /apps/zabbix_server/sbin/zabbix_server: java poller #2 [got 0 values in 0.000028 sec, idle 5 sec]
zabbix    46478  46465  0 21:07 ?        00:00:00 /apps/zabbix_server/sbin/zabbix_server: java poller #3 [got 0 values in 0.000032 sec, idle 5 sec]
zabbix    46484  46465  0 21:07 ?        00:00:00 /apps/zabbix_server/sbin/zabbix_server: java poller #4 [got 0 values in 0.000008 sec, idle 5 sec]
zabbix    46485  46465  0 21:07 ?        00:00:00 /apps/zabbix_server/sbin/zabbix_server: java poller #5 [got 0 values in 0.000008 sec, idle 5 sec]
zabbix    46487  46465  0 21:07 ?        00:00:00 /apps/zabbix_server/sbin/zabbix_server: java poller #6 [got 0 values in 0.000030 sec, idle 5 sec]
zabbix    46488  46465  0 21:07 ?        00:00:00 /apps/zabbix_server/sbin/zabbix_server: java poller #7 [got 0 values in 0.000009 sec, idle 5 sec]
zabbix    46492  46465  0 21:07 ?        00:00:00 /apps/zabbix_server/sbin/zabbix_server: java poller #8 [got 0 values in 0.000033 sec, idle 5 sec]
zabbix    46493  46465  0 21:07 ?        00:00:00 /apps/zabbix_server/sbin/zabbix_server: java poller #9 [got 0 values in 0.000062 sec, idle 5 sec]
zabbix    46495  46465  0 21:07 ?        00:00:00 /apps/zabbix_server/sbin/zabbix_server: java poller #10 [got 0 values in 0.000050 sec, idle 5 sec]
root      46545   1598  0 21:08 pts/0    00:00:00 grep --color=auto java
```

### 3.2.4 tomcat开启JMX监控

JMX在Java编程语言中定义了应用程序以及网络管理和监控的体系结构、设计模式、应用程序接口以及服务，通常 使用JMX来监控系统的运行状态。

https://www.jianshu.com/p/8c5133cab858

```bash
[09:40:13 root@tomcat-web1 ~]#vim /usr/local/tomcat/bin/catalina.sh
CATALINA_OPTS="$CATALINA_OPTS
-Dcom.sun.management.jmxremote     #启用远程监控JMX
-Dcom.sun.management.jmxremote.port=12345  #默认启动的JMX端口号，要和zabbix添加主机时候的端口一致即可
-Dcom.sun.management.jmxremote.authenticate=false #不使用用户名密码
-Dcom.sun.management.jmxremote.ssl=false  #不使用ssl认证
-Djava.rmi.server.hostname=172.31.0.107"  #tomcat主机自己的IP地址，不要写zabbix服务器的地址，这里的主机名称到后面的web端创建时需要写到主机名称
#以上配置必须写到一行不能换行
[09:43:26 root@tomcat-web1 ~]#systemctl restart tomcat
#验证
[09:43:26 root@tomcat-web1 ~]#ss -ntl | grep -E "8080|12345"
LISTEN  0        100                          *:8080                   *:*      
LISTEN  0        50                           *:12345                  *:*
```

### 3.2.5 zabbix server添加JMX监控

![image-20210511095343487](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210511095343487.png)

其余根据自己情况配置，监控java程序需要使用JMX接口，写入tomcat服务器地址与JMX端口号

导入模板，选择自带的java模板与tomcat模板

![image-20210511095507873](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210511095507873.png)

### 3.2.5 JMX监控生产模板使用

生产环境的JMX监控模板使用，主要添加了自定义监控项和阈值。

**选择导入模板**

![image-20210511095809124](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210511095809124.png)

**给主机关联模板后查看**

![image-20210511100111285](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210511100111285.png)

### 3.2.6 Linux测试监控JMX方式

使用java客户端cmdline-jmxclient进行测试

测试能否获取到java 当前线程数和最大线程数：

```bash
[10:13:01 root@tomcat-web1 jre]#java -jar  cmdline-jmxclient-0.10.3.jar - 192.168.10.183:12345 'Catalina:name="http-nio-8080",type=ThreadPool' currentThreadCount
05/11/2021 02:13:54 +0000 org.archive.jmx.Client currentThreadCount: 10
[10:14:59 root@tomcat-web1 jre]#java -jar  cmdline-jmxclient-0.10.3.jar - 192.168.10.183:12345 'Catalina:name="http-nio-8080",type=ThreadPool' maxThreads
05/11/2021 02:15:24 +0000 org.archive.jmx.Client maxThreads: 200
```

## 3.3 zabbix 主动与被动监控模式

学习主动模式与被动模式工作原理，主动模式模板制作，然后添加主机并关联主动模式模板，然后验证主动模式监 控数据和图形。

### 3.3.1 被动模式

无论是主动模式还是被动模式，都是站在zabbix agent角度来说的工作模式，比如被动模式，是说zabbix agent被动的接受zabbix server周期性发送过来的数据收集指令，在被动模式之下，zabbix server会根据主机关联的模板中的监控项和数据采集间隔时间，周期性的打开随机端口并向zabbix agent服务器的10050发起tcp连接，然后发送获取监控项数据的指令，即zabbix server发送什么指令那么zabbix agent就收集什么数据，zabbix server什么时候发 送zabbix agent就什么时候采集，zabbix server不发送zabbix agent就一直不响应，所以zabbix agent也不用关心其监控项和数据采集周期间隔时间。

被动模式的优点就是配置简单，安装后即可使用，因此也成为zabbix 的默认工作模式，但是被动模式的最大问题就是会加大zabbix server的工作量，在数百甚至数千台服务器的环境下会导致zabbix server需要轮训向每个 zabbix agent发送数据采集指令，如果zabbix server负载很高还会导致不能及时获取到最新数据，但由于无需其他复杂配置，被设置为了默认的工作方式。

**被动模式端口状态**

```bash
[10:20:13 root@zabbix-web1 ~]#netstat -tanlp
tcp        0      0 192.168.10.182:10050    192.168.10.181:41559    TIME_WAIT   -                   
tcp        0      0 192.168.10.182:10050    192.168.10.181:41623    TIME_WAIT   -                   
tcp        0      0 192.168.10.182:10050    192.168.10.181:41587    TIME_WAIT   -                   
tcp        0      0 192.168.10.182:10050    192.168.10.181:41479    TIME_WAIT   -                   
tcp        0      0 192.168.10.182:10050    192.168.10.181:41489    TIME_WAIT   -                   
tcp        0      0 192.168.10.182:10050    192.168.10.181:41643    TIME_WAIT   -                   
tcp        0      0 192.168.10.182:10050    192.168.10.181:41509    TIME_WAIT   -
```

#### 3.3.1.1 被动模式工作流程

![aaa](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/aaa.jpg)

### 3.3.2 主动模式

主动模式是由zabbix agent主动向zabbix server的10051端口发起tcp连接请求，因此主动模式下必须在zabbix agent配置文件中指定zabbix server的IP或者主机名(必须可以被解析为IP地址)，在连接到zabbix server之前 zabbix agent是不知道自己要采集那些数据以及间隔多久采集一次数据的，然后在连接到zabbix server以后获取到 自己的监控项和数据采集间隔周期时间，然后再根据监控项采集数据并返回给zabbix server，在主动模式下不再需要zabbix serve向zabbix agent发起连接请求，因此主动模式在一定程度上可减轻zabbix server打开的本地随机端口和进程数，在一定程度就减轻看zabbix server的压力。

#### 3.3.2.1 主动模式工作流程

![sss](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/sss.jpg)

### 3.3.2.2 修改zabbix agent为主动模式

```bash
[10:46:49 root@tomcat-web1 ~]#grep -Ev "^#|^$" /etc/zabbix/zabbix_agentd.conf 
PidFile=/var/run/zabbix/zabbix_agentd.pid
LogFile=/var/log/zabbix/zabbix_agentd.log
LogFileSize=0
Server=192.168.10.181
ListenPort=10050
ListenIP=0.0.0.0
StartAgents=3
ServerActive=192.168.10.181  #主动模式的zabbix server地址
Hostname=192.168.10.183
Include=/etc/zabbix/zabbix_agentd.d/*.conf
[10:47:11 root@tomcat-web1 ~]#systemctl restart zabbix-agent.service
```

#### 3.3.2.3 生成主动模式模板

生成主动模式模板

在web界面配置模板中完全克隆Template OS Linux模板为Template OS Linux-active

之后进入模板中的监控项选中所有点击批量更新，勾选类型选择zabbix客户端主动式然后点击更新

![image-20210511113128997](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210511113128997.png)

之后关联模板到主机

#### 3.3.2.4 验证主动模式主机数据

![image-20210511113316682](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210511113316682.png)

#### 3.3.2.5 验证主动模式主机端口

```bash
[11:26:14 root@zabbix-server ~]#netstat -tanlp | grep "^tcp " | grep 192.168.10.183
tcp        0      0 192.168.10.181:10051    192.168.10.183:64877    TIME_WAIT   -                   
tcp        0      0 192.168.10.181:10051    192.168.10.183:64863    TIME_WAIT   -                   
tcp        0      0 192.168.10.181:10051    192.168.10.183:64875    TIME_WAIT   -                   
tcp        0      0 192.168.10.181:10051    192.168.10.183:64861    TIME_WAIT   -
```

# 四、zabbix proxy

https://www.zabbix.com/documentation/4.0/zh/manual/distributed_monitoring

zabbix 作为一个分布式监控系统(分布式监控解决方案)，支持通过代理(proxy)收集zabbix agent的监控数据然后由 zabbix proxy再把数据发送给zabbix server，也就是zabbix proxy 可以代替 zabbix server 收集监控数据，然后把 数据汇报给 zabbix server，所以zabbix proxy可以在一定程度上分担了zabbix server 的数据收集压力，从而降低 了数据的采集时间、也相应的增加了zabbix server的监控能力。

另外zabbix proxy也区分主动模式和被动模式，通信方式与zabbix server主动模式和被动模式一样，区别是zabbix proxy由于没有zabbix agent的配置，所以zabbix proxy在主动模式下要向zabbix server周期性的向zabbix server 申请获取zabbix agent的监控项信息，但是zabbix proxy在被动模式下也是等待zabbix server的连接并接受zabbix server发送的监控项指令，然后再有zabbix proxy向zabbix agent发起请求获取数据。

## 4.1 zabbix proxy架构

![image-20210511113656050](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210511113656050.png)

## 4.2 zabbix proxy对比zbbbix server

| 功能         | zabbix proxy                 | zabbix server                          |
| ------------ | ---------------------------- | -------------------------------------- |
| 轻量级       | 是                           | 相对重量级                             |
| 图形         | 无                           | 带图形控制界面                         |
| 可以独立工作 | 是，可以独立采集数据并存储   | 是，即数据采集、存储、分析、展示于一体 |
| 易维护       | 是，配置完成后基本无需管理   | 维护也不难                             |
| 独立数据库   | 保留少量最近数据             | 保留指定时间内的所有数据               |
| 报警通知     | 否，代理服务器不发送邮件通知 | 支持邮件、短信等告警机制               |

## 4.3 zabbix proxy部署与使用

```bash
学习zabbix proxy工作原理
安装主动模式与被动模式的zabbix proxy服务器
配置zabbix gent工作模式为主动模式与被动模式
```

### 4.3.1 zabbix proxy版本选择

zabbix proxy的大版本必须要和zabbix server版本一致，否则会导致出现zabbix server与zabbix proxy不兼容问 题，如下：

![image-20210511114214391](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210511114214391.png)

### 4.3.2 zabbix proxy安装

https://www.zabbix.com/documentation/4.0/zh/manual/installation/install

zabbix 的不同安装方式

```bash
zabbix server：192.168.10.181
zabbix proxy 主动模式：192.168.10.184   #采用apt或者yum安装
zabbix proxy 被动模式：192.168.10.185   #采用编译安装
```

#### 4.3.2.1 apt/yum安装zabbix proxy

https://www.zabbix.com/documentation/4.0/zh/manual/installation/install_from_packages/debian_ubuntu

```bash
[13:17:35 root@zabbix-proxy ~]#wget https://repo.zabbix.com/zabbix/4.0/ubuntu/pool/main/z/zabbix-release/zabbix-release_4.0-3+bionic_all.deb
[13:19:31 root@zabbix-proxy ~]#dpkg -i zabbix-release_4.0-3+bionic_all.deb
[13:20:15 root@zabbix-proxy ~]#apt update 
#安装zabbix proxy
#ubuntu
[13:20:15 root@zabbix-proxy ~]#apt install zabbix-proxy-mysql

#配置数据库
[13:24:28 root@zabbix-proxy ~]#vim /etc/mysql/mariadb.conf.d/50-server.cnf
#bind-address       = 127.0.0.1
#重启数据库
[13:25:12 root@zabbix-proxy ~]#systemctl restart mysqld

#创建数据库
[13:25:29 root@zabbix-proxy ~]#mysql
MariaDB [(none)]> create database zabbix_proxy_pasive character set utf8 collate utf8_bin;
MariaDB [(none)]> create user zabbix@'%' identified by '123456';
Query OK, 0 rows affected (0.00 sec)

MariaDB [(none)]> grant all on zabbix_proxy_pasive.* to zabbix@'%';
Query OK, 0 rows affected (0.00 sec)

#主动模式数据库导入
[13:30:51 root@zabbix-proxy ~]#zcat /usr/share/doc/zabbix-proxy-mysql/schema.sql.gz  | mysql -uzabbix -p123456 zabbix_proxy_pasive
```

#### 4.3.2.2 编译安装zabbix proxy

```bash
[14:47:11 root@ubuntu18-04 ~]#useradd zabbix -r -s /usr/sbin/nologin
[15:01:26 root@ubuntu18-04 zabbix-4.0.30]#apt-get install ssl-cert ttf-dejavu-core libmysqlclient-dev libxml2-dev libxml2  libsnmp-dev libevent-dev openjdk-8-jdk curl libcurl4-openssl-dev mariadb-server
[14:48:43 root@ubuntu18-04 ~]#wget https://cdn.zabbix.com/zabbix/sources/stable/4.0/zabbix-4.0.30.tar.gz
[14:49:39 root@ubuntu18-04 ~]#tar xf zabbix-4.0.30.tar.gz
[14:50:22 root@ubuntu18-04 ~]#cd zabbix-4.0.30/
[15:01:26 root@ubuntu18-04 zabbix-4.0.30]#./configure --prefix=/apps/zabbix_proxy --enable-proxy --enable-agent --with-mysql --enable-ipv6 --with-net-snmp --with-libcurl --with-libxml2
[15:01:26 root@ubuntu18-04 zabbix-4.0.30]#make install
#创建zabbix_proxy数据库
[15:03:52 root@ubuntu18-04 zabbix-4.0.30]#apt install mariadb-server
[15:03:29 root@ubuntu18-04 zabbix-4.0.30]#vim /etc/mysql/mariadb.conf.d/50-server.cnf 
[15:05:15 root@ubuntu18-04 zabbix-4.0.30]#mysql
MariaDB [(none)]> create database zabbix_proxy_pasive character set utf8 collate utf8_bin;
Query OK, 1 row affected (0.00 sec
MariaDB [(none)]> create user zabbix@'%' identified by '123456';
Query OK, 0 rows affected (0.00 sec)
MariaDB [(none)]> grant all on zabbix_proxy_pasive.* to zabbix@'%';
Query OK, 0 rows affected (0.00 sec
#被动模式数据库导入
[15:07:17 root@ubuntu18-04 zabbix-4.0.30]#mysql -uzabbix -p123456 zabbix_proxy_pasive <database/mysql/schema.sql

#准备service文件
[15:22:37 root@ubuntu18-04 zabbix-4.0.30]#cat /lib/systemd/system/zabbix_proxy.service 
[Unit]
Description=Zabbix Proxy
After=syslog.target
After=network.target
[Service]
Environment="CONFFILE=/apps/zabbix_proxy/etc/zabbix_proxy.conf"
#EnvironmentFile=-/etc/default/zabbix-proxy
Type=forking
Restart=on-failure
PIDFile=/tmp/zabbix_proxy.pid
KillMode=control-group
ExecStart=/apps/zabbix_proxy/sbin/zabbix_proxy -c $CONFFILE
ExecStop=/bin/kill -SIGTERM $MAINPID
RestartSec=10s
TimeoutSec=infinity
[Install]
WantedBy=multi-user.target
```

### 4.3.3 配置被动zabbix proxy

配置并使用被动模式(Passive Proxy Mode)的zabbix proxy收集zabbix agent监控数据。

```bash
zabbix server：192.168.10.181
被动模式服务器IP：192.168.10.184
web服务器IP：192.168.10.182
```

#### 4.3.3.1 zabbix proxy被动配置

```bash
[13:42:02 root@zabbix-proxy ~]#grep -Ev "^#|^$" /etc/zabbix/zabbix_proxy.conf
ProxyMode=1  #0为主动，1为被动
Server=192.168.10.181  #zabbix server服务器的地址或主机名
ServerPort=10051  #zabbix proxy监听端口
Hostname=192.168.10.184 #代理服务器名称，需要与zabbix server添加代理时候的proxyname是一致的！
ListenPort=10051  #zabbix proxy监听端口
LogFile=/var/log/zabbix/zabbix_proxy.log #日志位置
LogFileSize=1   #日志最大大小
EnableRemoteCommands=1   #允许zabbix server执行远程命令
PidFile=/var/run/zabbix/zabbix_proxy.pid #pid文件存放位置
SocketDir=/var/run/zabbix   #sock文件存放位置
DBHost=192.168.10.184       #数据库IP
DBName=zabbix_proxy_active  #数据库名称
DBUser=zabbix               #登录数据库用户
DBPassword=123456           #登录数据库用户密码
ProxyLocalBuffer=720        #已经提交到zabbix server的数据保留时间
ProxyOfflineBuffer=720      #未提交到zabbix server的时间保留时间
HeartbeatFrequency=60       #心跳间隔检测时间，默认60秒，范围0-3600秒，被动模式不使用
ConfigFrequency=5           #间隔多少秒从zabbix server获取监控项信息
DataSenderFrequency=5       #数据发送时间间隔，默认为1秒，范围为1-3600秒，被动模式不使用
StartPollers=20             #启动的数据采集器数量
JavaGateway=192.168.10.183  #java gateway服务器地址,当需要监控java的时候必须配置否则监控不到数据
JavaGatewayPort=10052   #Javagatewa服务端口
StartJavaPollers=2      #启动多少个线程采集数据
SNMPTrapperFile=/var/log/snmptrap/snmptrap.log
CacheSize=8M       #保存监控项而占用的最大内存
HistoryCacheSize=16M  #保存监控历史数据占用的最大内存
HistoryIndexCacheSize=4M  #历史索引缓存的大小
Timeout=30     #监控项超时时间，单位为秒
ExternalScripts=/usr/lib/zabbix/externalscripts
FpingLocation=/usr/bin/fping
Fping6Location=/usr/bin/fping6
LogSlowQueries=3000   #毫秒，多久的数据库查询会被记录到日志
```

#### 4.3.3.2 重启zabbix proxy服务

重启zabbix proxy服务并验证日志

```bash
[13:50:40 root@zabbix-proxy ~]#systemctl restart zabbix-proxy.service 
[13:50:52 root@zabbix-proxy ~]#ss -ntl | grep 10051
LISTEN   0         128                 0.0.0.0:10051            0.0.0.0:*       
LISTEN   0         128                    [::]:10051               [::]:*
```

#### 4.3.3.3 zabbix 添加被动代理

管理-->agent代理程序-->创建代理：

![image-20210511135211798](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210511135211798.png)

##### 4.3.3.3.1 添加被动模式代理主机

![image-20210511135430262](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210511135430262.png)

在添加被动模式模板

![image-20210511135608516](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210511135608516.png)

##### 4.3.3.3.2 zabbix server配置

修改zabbix server向zabbix获取监控数据的频率等参数

```bash
[13:56:38 root@zabbix-server ~]#vim /apps/zabbix_server/etc/zabbix_server.conf
StartProxyPollers=2 #启用多少子进程与代理端通信，若代理较多可考虑加大此数值，范围是0-250
ProxyConfigFrequency=60 #proxy被动模式下，server多少秒同步配置文件至proxy，该参数仅用于被动模式下的代理，范围是1-3600*24*7
ProxyDataFrequency=1  #被动模式下，zabbix server间隔多少秒向proxy请求历史数据
```

#### 4.3.3.4 zabbix agent配置文件

```bash
[14:00:48 root@zabbix-web1 ~]#grep -Ev "^#|^$" /etc/zabbix/zabbix_agentd.conf
PidFile=/var/run/zabbix/zabbix_agentd.pid
LogFile=/var/log/zabbix/zabbix_agentd.log
LogFileSize=0
Server=192.168.10.181,192.168.10.184   #这里必须授权proxy的地址访问，否则无法收集数据
ListenIP=0.0.0.0
StartAgents=3
ServerActive=127.0.0.1
Hostname=192.168.10.182
Include=/etc/zabbix/zabbix_agentd.d/*.conf
[14:01:01 root@zabbix-web1 ~]#systemctl restart zabbix-agent.service
```

验证主机状态

![image-20210511140236930](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210511140236930.png)

### 4.3.4 配置主动模式zabbix proxy

配置并使用主动模式(Active Proxy Mode)的zabbix proxy收集zabbix agent监控数据。

```bash
zabbix server：192.168.10.181
主动模式服务器IP：192.168.10.184
web服务器IP：192.168.10.182
```

#### 4.3.4.1 zabbix proxy主动配置

```bash
[13:50:59 root@zabbix-proxy ~]#vim /etc/zabbix/zabbix_proxy.conf
ProxyMode=0 #0为主动，1为被动
Server=192.168.10.181 #zabbix server服务器的地址或主机名
Hostname=192.168.10.184 #代理服务器名称，需要与zabbix server添加代理时候的proxyname是一致的！
ListenPort=10051 #zabbix proxy监听端口
LogFile=/tmp/zabbix_proxy.log
EnableRemoteCommands=1 #允许zabbix server执行远程命令
DBHost=192.168.10.184 #数据库服务器地址
DBName=zabbix_proxy_active #使用的数据库名称
DBUser=proxy #连接数据库的用户名称
DBPassword=123456 #数据库用户密码
DBPort=3306 #数据库端口
ProxyLocalBuffer=720 #已经提交到zabbix server的数据保留时间
ProxyOfflineBuffer=720 #未提交到zabbix server的时间保留时间
HeartbeatFrequency=60 #心跳间隔检测时间，默认60秒，范围0-3600秒，被动模式不使用
ConfigFrequency=5 #间隔多少秒从zabbix server获取监控项信息
DataSenderFrequency=5 #数据发送时间间隔，默认为1秒，范围为1-3600秒，被动模式不使用
StartPollers=20 #启动的数据采集器数量
JavaGateway=192.168.10.183 #java gateway服务器地址,当需要监控java的时候必须配置否则监控不到数据
JavaGatewayPort=10052 #Javagatewa服务端口
StartJavaPollers=20 #启动多少个线程采集数据
CacheSize=4M #保存监控项而占用的最大内存
HistoryCacheSize=16M #保存监控历史数据占用的最大内存
HistoryIndexCacheSize=8M #历史索引缓存的大小
Timeout=30 #监控项超时时间，单位为秒
LogSlowQueries=3000 #毫秒，多久的数据库查询会被记录到日志
[14:05:59 root@zabbix-proxy ~]#systemctl restart zabbix-proxy.service
```

#### 4.3.4.2 zabbix web添加主动代理

管理-->agent代理程序-->创建代理

![image-20210511140838662](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210511140838662.png)

#### 4.3.4.3 zabbix agent使用主动代理

修改或者新添加一台zabbix agent，并使用zabbix 主动模式代理服务器进行监控

**使用主动模式proxy：**

![image-20210511140953956](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210511140953956.png)

**验证当前主机和主动模式proxy 状态**

![image-20210511141055726](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210511141055726.png)

#### 4.3.4.4 zabbix agent配置文件

需要修改zabbix agent中配置文件ServerActive的值为主动模式zabbix proxy.

```bash
[14:13:50 root@zabbix-web1 ~]#grep -Ev "^#|^$" /etc/zabbix/zabbix_agentd.conf
PidFile=/var/run/zabbix/zabbix_agentd.pid
LogFile=/var/log/zabbix/zabbix_agentd.log
LogFileSize=0
Server=192.168.10.181,192.168.10.184
ListenIP=0.0.0.0
StartAgents=3
ServerActive=192.168.10.184 #这里填写主动proxy服务器IP
Hostname=192.168.10.182
Include=/etc/zabbix/zabbix_agentd.d/*.conf
[14:14:00 root@zabbix-web1 ~]#systemctl restart zabbix-agent.service
```

# 五、zabbix 监控案例实战

## 5.1 监控Linux TCP连接状态

TCP，全称Transfer Control Protocol，中文名为传输控制协议，它工作在OSI的传输层，提供面向连接的可靠传输服务，TCP的工作主要是建立连接，然后从应用层程序中接收数据并进行传输。TCP采用虚电路连接方式进行工 作，在发送数据前它需要在发送方和接收方建立一个连接，数据在发送出去后，发送方会等待接收方给出一个确认 性的应答，否则发送方将认为此数据丢失，并重新发送此数据。

在建立连接的时候，所谓的客户端与服务端是相对应的，即要看是谁主动连接的谁，如果A主动连接B那么A就是客 户端而B是服务端，如果返过来B主动连接A，那么B就是客户端而A就成了服务端。

### 5.1.1 TCP端口的十一种连接状态

```bash
CLOSED：端口默认是关闭状态。

LISTEN： 服务器程序开始监听一个端口，就是LISTEN状态。

SYN_RCVD：三次握手的第二次握手后的端口状态，是收到了客户端发送的SYN_SENT数据包之后的状态，这个状态很短暂，正常在服务器上是很少看到的，除非服务器故意不发送最后一次握手数据包，服务器返回给客户端SYN确认之后就会将在自己的端口置为SYN_RCVD。

SYN_SENT：SYN_SENT状态表示客户端已发送SYN=1的请求连接报文，发送之后客户端就会将自己的端口状态置为SYN_SENT。
ESTABLISHED：表示已经连接成功，客户端收到服务器的确认报文会回复服务器，然后就将端口置为ESTABLISHED，服务器第三次收到客户端的Ack确认就会将端口置为ESTABLISHED并开始传输数据。

FIN_WAIT_1：出现在主动关闭方，FIN_WAIT_1状态实际上是当SOCKET在ESTABLISHED状态时，当任意一方想主动关闭连接，向对方发送了FIN=1的断开连接请求报文，此时该SOCKET即 进入到FIN_WAIT_1状态。而当对方回应ACK报文后，则进入到FIN_WAIT_2状态，当然在实际的正常情况下，无论对方何种情况下，都应该马 上回应ACK报文，所以FIN_WAIT_1状态一般是比较难见到的，而FIN_WAIT_2状态还有时常常可以用netstat看到。

FIN_WAIT_2：出现在主动关闭方，当被动方回应FIN_WAIT_1的ACK报文后，则进入到FIN_WAIT_2状态TIME_WAIT：出现在主动关闭方，表示收到了对方的FIN请求关闭报文，并发送出了ACK报文，就等2*MSL(MaxSegment Lifetime)后即可回到CLOSED可用状态了。如果FIN_WAIT_1状态下，收到了对方同时带FIN标志和ACK标志的报文时，可以直接进入到TIME_WAIT状态，而无须经过FIN_WAIT_2状态。

CLOSING： 这种状态比较特殊，实际情况中应该是很少见，属于一种比较罕见的例外状态。正常情况下，当你发送FIN报文后，按理来说是应该先收到（或同时收到）对方的 ACK报文，再收到对方的FIN报文。但是CLOSING状态表示你发送FIN报文后，并没有收到对方的ACK报文，反而却也收到了对方的FIN报文。什 么情况下会出现此种情况呢？其实细想一下，也不难得出结论：那就是如果双方几乎在同时close一个SOCKET的话，那么就出现了双方同时发送FIN报 文的情况，也即会出现CLOSING状态，表示双方都正在关闭SOCKET连接。

CLOSE_WAIT： 表示在等待关闭端口，这种状态存在于被动关闭的一方。

LAST_ACK： 是被动关闭方在主动关闭一方在发送FIN报文后，最后等待对方的ACK报文，当再次收到ACK报文后，也即可以进入到CLOSED可用状态了。
```

### 5.1.2 端口转换状态

安装服务端与客户端将端口状态区分

```bash
主动端口方：SYN_SENT、FIN_WAIT1、FIN_WAIT2、CLOSING、TIME_WAIT
被动断开方：LISTEN、SYN_RCVD、CLOSE_WAIT、LAST_ACK
都具有的：CLOSED 、ESTABLISHED
```

![image-20210511190822976](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210511190822976.png)

### 5.1.3 TCP三次握手与四次断开

#### 5.1.3.1 TCP三次握手

![image-20210511190901290](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210511190901290.png)

#### 5.1.3.2 TCP四次断开

![image-20210511190917489](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210511190917489.png)

### 5.1.4 监控TCP连接数脚本

```bash
[19:17:13 root@zabbix-server ~]#cat tcp_conn_plugin.sh 
#!/bin/bash
tcp_conn_status(){
    TCP_STAT=$1
    ss -ant | awk 'NR>1 {++s[$1]} END {for(k in s) print k,s[k]}' >/tmp/tcp_conn.txt
    TCP_NUM=$(grep "$TCP_STAT" /tmp/tcp_conn.txt | cut -d ' ' -f2)
    if [ -z $TCP_NUM ];then
        TCP_NUM=0
    fi
    echo $TCP_NUM
}
main(){
    case $1 in
        tcp_status)
            tcp_conn_status $2;
            ;;
    esac
}
main $1 $2
#手动执行
[19:18:03 root@zabbix-server ~]#./tcp_conn_plugin.sh tcp_status TIME-WAIT0
130
[19:19:54 root@zabbix-server ~]#mkdir /apps/zabbix_server/sh
[19:20:12 root@zabbix-server ~]#chown zabbix.zabbix /apps/zabbix_server/sh
[19:20:24 root@zabbix-server ~]#cp tcp_conn_plugin.sh /apps/zabbix_server/sh
[19:20:31 root@zabbix-server ~]#ll /apps/zabbix_server/sh/tcp_conn_plugin.sh 
-rwxr-xr-x 1 root root 713 May 11 19:20 /apps/zabbix_server/sh/tcp_conn_plugin.sh*
```

### 5.1.5 zabbix agent添加自定义监控项

zabbix agent添加自定义监控项并调用脚本获取到监控项数据

```bash
[19:18:18 root@zabbix-server ~]#vim /apps/zabbix_server/etc/zabbix_agentd.conf
UserParameter=linux_status[*],/apps/zabbix_server/sh/tcp_conn_plugin.sh "$1" "$2"
[19:21:36 root@zabbix-server ~]#systemctl restart zabbix-agent.service
```

### 5.1.6 zabbix server测试监控项数据

```bash
[19:25:12 root@zabbix-server ~]#/apps/zabbix_server/bin/zabbix_get -s 192.168.10.181 -p 10050 -k "linux_status["tcp_status","LISTEN"]"
23
#报错处理
#zabbix_get [10656]: Check access restrictions in Zabbix agent configuration
这个报错信息一般为agent节点配置文件中server授权没有给server授权进行授权即可

#/apps/zabbix_server/sh/tcp_conn_plugin.sh: line 14: /tmp/tcp_conn.txt: Permission denied
进入agent节点删除/tmp/tcp_conn.txt文件重新执行
```

### 5.1.7 zabbix web导入模板

配置-模板-导入

![image-20210511192929402](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210511192929402.png)

主机关联

![image-20210511193145898](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210511193145898.png)

查看数据

![image-20210511194059205](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210511194059205.png)

## 5.2 监控memcache

通过自定义监控模板对memcache进行监控

### 5.2.1 安装memcache服务

```bash
[19:39:52 root@zabbix-server ~]#apt install memcached
[19:49:58 root@zabbix-server ~]#grep -Ev "#|^$" /etc/memcached.conf
-d
logfile /var/log/memcached.log
-m 64
-p 11211
-u memcache
-l 0.0.0.0
-P /var/run/memcached/memcached.pid
[19:50:08 root@zabbix-server ~]#systemctl restart memcached
```

### 5.2.2 监控脚本

传递不同参数传递给脚本，并通过脚本获取监控项

```bash
[19:52:13 root@zabbix-server ~]#cat memcache_monitor.sh
memcached_status(){
    M_PORT=$1
    M_COMMAND=$2
    echo -e "stats\nquit" | ncat 127.0.0.1 "$M_PORT" | grep "STAT $M_COMMAND" | awk '{print $3}' #ubuntu使用ncat, 安装nmap
}
main(){
    case $1 in
        memcached_status)
            memcached_status $2 $3
        ;;
    esac
}
main $1 $2 $3
[19:52:16 root@zabbix-server ~]#chmod +x memcache_monitor.sh
#测试
[19:54:15 root@zabbix-server ~]#./memcache_monitor.sh memcached_status 11211 curr_connections
1
```

### 5.2.3 zabbix agent添加自定义监控项

```bash
[19:55:21 root@zabbix-server sh]#vim /apps/zabbix_server/etc/zabbix_agentd.conf
UserParameter=memcache_status[*],/apps/zabbix_server/sh/memcache_monitor.sh "$1" "$2" "$3"
[19:56:34 root@zabbix-server sh]#systemctl restart zabbix-agent.service
#手动测试
[19:58:43 root@zabbix-server sh]#/apps/zabbix_server/bin/zabbix_get -s 192.168.10.181 -p 10050 -k "memcache_status["memcached_status","11211","curr_connection"]"
2
```

### 5.2.4 zabbix web制作模板

配置-模板-创建模板

#### 5.2.4.1 创建模板

![image-20210511200016218](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210511200016218.png)

#### 5.2.4.2 创建监控项

配置-模板-magedu-memcache-监控项-创建监控项：

![image-20210511200304344](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210511200304344.png)

#### 5.2.4.3 创建触发器

配置-模板-magedu-memcache-触发器-创建触发器：

点击表达式方框右侧的添加按钮，选择要对那个监控项设置触发器以及触发方式和值的大小，一个模板中可以有多 个触发器，一个触发器是根据一个监控项的返回值对比预先设置的阈值，触发器就是监控项返回了不符合预定义的 值范围后就进行触发下一步操作的警戒线。

![image-20210511200502228](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210511200502228.png)

#### 5.2.4.4 创建图形

配置-模板-magedu-memcache-图形-创建图形：

在图形里面关联监控项，一个图形可以用多个监控项，不同的监控项会自动使用不同的颜色进行区分，也可以手动调整各监控项的颜色和图形类型。

![image-20210511200629461](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210511200629461.png)

### 5.2.5 模板关联主机验证数据

配置-主机-选择主机-模板，进行关联

数据显示

![image-20210511200857497](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210511200857497.png)

## 5.3 监控Redis

学习一个模板中创建多个监控项、多个触发器和多个图形

### 5.3.1 安装Redis服务

```bash
[20:19:15 root@zabbix-server sh]#apt install redis -y
[20:20:12 root@zabbix-server sh]#vim /etc/redis/redis.conf 
bind 0.0.0.0
[20:20:47 root@zabbix-server sh]#systemctl restart redis
```

### 5.3.2 监控脚本

```bash
[20:24:10 root@zabbix-server sh]#cat redis_monitor.sh
redis_status(){
    R_PORT=$1
    R_COMMAND=$2
    (echo -en "INFO \r\n";sleep 1;) | ncat 127.0.0.1 "$R_PORT" >/tmp/redis_"$R_PORT".tmp
    REDIS_STAT_VALUE=$(grep ""$R_COMMAND":" /tmp/redis_"$R_PORT".tmp | cut -d ':' -f2)
    echo $REDIS_STAT_VALUE
}
help(){
    echo "${0} + redis_status + PORT + COMMAND"
}
main(){
    case $1 in
        redis_status)
            redis_status $2 $3
            ;;
        *)
            help
            ;;
    esac
}
main $1 $2 $3
[20:24:12 root@zabbix-server sh]#chmod +x redis_monitor.sh
#测试
[20:24:40 root@zabbix-server sh]#bash redis_monitor.sh redis_status 6379 used_memory841272
[20:25:53 root@zabbix-server sh]#rm /tmp/redis_6379.tmp 
[20:26:10 root@zabbix-server sh]#ll /apps/zabbix_server/sh/redis_monitor.sh 
-rwxr-xr-x 1 root root 808 May 11 20:24 /apps/zabbix_server/sh/redis_monitor.sh*
```

### 5.3.3 zabbix agent添加自定义监控项

```bash
[20:26:19 root@zabbix-server sh]#vim /apps/zabbix_server/etc/zabbix_agentd.conf
UserParameter=redis_status[*],/apps/zabbix_server/sh/redis_monitor.sh "$1" "$2" "$3"
[20:27:51 root@zabbix-server sh]#systemctl restart zabbix-agent.service
```

### 5.3.4 zabbix server测试监控项数据

```bash
[20:28:06 root@zabbix-server sh]#/apps/zabbix_server/bin/zabbix_get -s 192.168.10.181 -p 10050 -k "redis_status["redis_status","6379","connected_clients"]"
1
```

### 5.3.5 zabbix wen模板制作

#### 5.3.5.1 创建模板及添加监控项

**添加模板**：配置-模板-创建模板

**创建监控项**：配置-模板-监控项-创建监控项

可添加的监控项：

![image-20210511203518610](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210511203518610.png)

```bash
redis_status["redis_status","6379","used_memory"]       #已用内存
	redis_status["redis_status","6379","connected_clients"] #当前连接数
```

#### 5.3.5.2 创建图形

配置-模板-magedu-redis-monitor-template-图形-创建图形：

俩个图形都进行分别创建

![image-20210511203753779](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210511203753779.png)

#### 5.3.5.3 创建触发器

配置-模板-触发器-创建触发器：

![image-20210511204729596](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210511204729596.png)

```bash
连接数设置大于2000报警
内存使用大于2G报警，内存得进行换算2*1024*1024*1024
```

### 5.3.6 模板关联主机及验证数据

关联之后验证数据

![image-20210511205324961](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210511205324961.png)

## 5.4 监控Nginx

对nginx的活动连接和当前状态等运行状态进行监控

```bash
配置示例：
location /nginx_status {
stub_status;
allow 172.31.0.0/16;
allow 127.0.0.1;
deny all;
}

状态页用于输出nginx的基本状态信息：
输出信息示例：
Active connections: 291
server accepts handled requests
      16630948 16630948 31070465
上面三个数字分别对应accepts,handled,requests三个值
Reading: 6 Writing: 179 Waiting: 106

Active connections： 当前处于活动状态的客户端连接数，包括连接等待空闲连接数。
accepts：统计总值，Nginx自启动后已经接受的客户端请求的总数。
handled：统计总值，Nginx自启动后已经处理完成的客户端请求的总数，通常等于accepts，除非有因worker_connections限制等被拒绝的连接。
requests：统计总值，Nginx自启动后客户端发来的总的请求数。
Reading：当前状态，正在读取客户端请求报文首部的连接的连接数。
Writing：当前状态，正在向客户端发送响应报文过程中的连接数。
Waiting：当前状态，正在等待客户端发出请求的空闲连接数，开启 keep-alive的情况下,这个值等于 active –(reading+writing)
```

### 5.4.1 部署Nginx服务

如果是编译安装需要添加编译参数--with-http_stub_status_module

```bash
#安装过程略过
#nginx开启状态页
[13:58:20 root@web1 nginx]#vim /apps/nginx/conf/nginx.conf
       location / {
           root   html;
           index  index.html index.htm;
       }
       location /nginx_status {
            stub_status;
            #allow 192.168.10.0/24;
       }
#检测配置文件
[13:59:37 root@web1 nginx]#/apps/nginx/sbin/nginx -t
nginx: the configuration file /apps/nginx/conf/nginx.conf syntax is ok
nginx: configuration file /apps/nginx/conf/nginx.conf test is successful
#启动
[13:59:51 root@web1 nginx]#systemctl restart nginx.service 
#测试
[14:00:07 root@web1 nginx]#curl 192.168.10.183/nginx_status
Active connections: 1 
server accepts handled requests
 1 1 1 
Reading: 0 Writing: 1 Waiting: 0
```

### 5.4.2 监控项脚本

```bash
[14:13:59 root@web1 ~]#cat /apps/zabbix_agent/sh/nginx_status.sh 
nginx_status_fun(){ 
    NGINX_PORT=$1 
    NGINX_COMMAND=$2 
    nginx_active(){ #当前处于活动状态的客户端连接数，包括连接等待空闲连接数
    /usr/bin/curl "http://127.0.0.1:"$NGINX_PORT"/nginx_status/" 2>/dev/null| grep 'Active' | awk '{print $NF}'
    }
    nginx_writing(){ #当前状态，正在向客户端发送响应报文过程中的连接数
    /usr/bin/curl "http://127.0.0.1:"$NGINX_PORT"/nginx_status/" 2>/dev/null| grep 'Writing' | awk '{print $4}'
    }
    nginx_waiting(){ #当前状态，正在等待客户端发出请求的空闲连接数，开启 keep-alive的情况下,这个值等于 active –(reading+writing)
    /usr/bin/curl "http://127.0.0.1:"$NGINX_PORT"/nginx_status/" 2>/dev/null| grep 'Waiting' | awk '{print $6}'
    }
    nginx_accepts(){ #统计总值，Nginx自启动后已经接受的客户端请求的总数
    /usr/bin/curl "http://127.0.0.1:"$NGINX_PORT"/nginx_status/" 2>/dev/null| awk NR==3 | awk '{print $1}'
    }
    nginx_handled(){ #统计总值，Nginx自启动后已经处理完成的客户端请求的总数
    /usr/bin/curl "http://127.0.0.1:"$NGINX_PORT"/nginx_status/" 2>/dev/null| awk NR==3 | awk '{print $2}'
    }
    nginx_requests(){ #统计总值，Nginx自启动后客户端发来的总的请求数。
    /usr/bin/curl "http://127.0.0.1:"$NGINX_PORT"/nginx_status/" 2>/dev/null| awk NR==3 | awk '{print $3}'
    }
    nginx_reading(){ #获取nginx_reading状态的数量
    /usr/bin/curl "http://127.0.0.1:"$NGINX_PORT"/nginx_status/" 2>/dev/null| grep 'Reading' | awk '{print $2}'
    }
    case $NGINX_COMMAND in
        active)
            nginx_active;
            ;;
        reading)
            nginx_reading;
            ;;
        writing)
            nginx_writing;
            ;;
        waiting)
            nginx_waiting;
            ;;
        accepts)
            nginx_accepts;
            ;;
        handled)
            nginx_handled;
            ;;
        requests)
            nginx_requests;
    esac
}
main(){
    case $1 in 
        nginx_status) 
            nginx_status_fun $2 $3;
            ;;
        *) 
            echo $"Usage: $0 {nginx_status key}"
    esac 
}
main $1 $2 $3
#添加执行权限
[14:14:51 root@web1 ~]#chmod +x /apps/zabbix_agent/sh/nginx_status.sh
#本机测试脚本
[14:13:59 root@web1 ~]#bash /apps/zabbix_agent/sh/nginx_status.sh nginx_status 80 active
1
```

### 5.4.3 zabbix agent添加自定义监控项

```bash
[14:17:02 root@web1 ~]#vim /apps/zabbix_agent/etc/zabbix_agentd.conf
UserParameter=nginx_status[*],/apps/zabbix_agent/sh/nginx_status.sh "$1" "$2" "$3"
[14:18:02 root@web1 ~]#systemctl restart zabbix-agent.service
```

### 5.4.4 zabbix server测试监控项数据

```bash
[14:20:18 root@zabbix-server ~]#/apps/zabbix_server/bin/zabbix_get -s 192.168.10.183 -p 10050 -k "nginx_status["nginx_status","80","active"]"
1
```

### 5.4.5 导入Nginx监控模板，绑定主机进行测试

![image-20210513142249735](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210513142249735.png)

## 5.5 SNMP监控

SNMP是英文"Simple Network Management Protocol"的缩写，中文意思是“简单网络管理协议，SNMP是一种简 单网络管理协议，它属于TCP/IP五层协议中的应用层协议，用于网络管理的协议，SNMP主要用于网络设备的管理。

SNMP的基本思想：为不同种类的设备、不同厂家生产的设备、不同型号的设备，定义为一个统一的接口和协议， 使得管理员可以是使用统一的外观面对这些需要管理的网络设备进行管理。通过网络，管理员可以管理位于不同物 理空间的设备，从而大大提高网络管理的效率，简化网络管理员的工作。

SNMP协议是TCP/IP协议簇的一个应用层协议，在1988年被制定，并被Internet体系结构委员会（IAB，Internet Architecture Board）采纳作为一个短期的网络管理解决方案，由于SNMP的简单性，在Internet时代得到了蓬勃的发展，1992年发布了SNMPv2版本，以增强SNMPv1的安全性和功能，SNMP的协议版本目前有SNMP v1、 SNMP v2c和SNMP v3三种版本，其具体差别如下：

```bash
SNMP v1采用团体名（Community Name）认证，团体名用来定义SNMP NMS和SNMP Agent的关系，如果SNMP报文携带的团体名没有得到设备的认可，该报文将被丢弃，团体名起到了类似于密码的作用，用来限制SNMP NMS对SNMPAgent的访问。

SNMP v2c也采用团体名认证，它在兼容SNMP v1的同时又扩充了SNMP v1的功能，它提供了更多的操作类型（批量获取GetBulk和通知请求InformRequest）、支持更多的数据类型（Counter64等）、提供了更丰富的错误代码且能够更细致地区分错误。

SNMP v3提供了基于用户的安全模型（USM，User-Based Security Model）的认证机制，用户可以设置认证和加密功能，认证用于验证报文发送方的合法性，避免非法用户的访问，加密则是对NMS和Agent之间的传输报文进行加密，以免被窃听。通过有无认证和有无加密等功能组合，可以为SNMP NMS和SNMP Agent之间的通信提供更高的安全性。
```

### 5.5.1 SNMP组织机构

SNMP网络元素分为NMS和Agent两种

```bash
NMS（Network Management Station，网络管理站）是运行SNMP客户端管理程序的工作站，能够提供非常友好的人机交互界面，方便网络管理员完成绝大多数的网络管理工作。

Agent是驻留在设备上的一个进程，负责接收、处理来自NMS的请求报文。在一些紧急情况下，如接口状态发生改变等，Agent也会主动通知NMS。

NMS是SNMP网络的管理者，Agent是SNMP网络的被管理者。NMS和Agent之间通过SNMP协议来交互管理信息。
```

### 5.5.2 SNMP数据交互

SNMP管理进程与代理进程之前为了交互信息，定义了5种报文

```bash
get-request操作：从代理进程处提取一个或多个参数值。
get-response操作：返回的一个或多个参数值。这个操作是由代理进程发出的。
trap操作：代理进程主动发出的报文，通知管理进程有某些事情发生。
get-next-request操作：从代理进程处提取一个或多个参数的下一个参数值。
set-request操作：设置代理进程的一个或多个参数值。
```

![image-20210513144641959](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210513144641959.png)

### 5.5.3 SNMP组织结构

一套完整的SNMP系统主要包括以下几个方面

```bash
SNMP报文协议。

管理信息结构（SMI， Structure of Management Information），一套公用的结构和表示符号。

管理信息库（MIB，Management Information Base），管理信息库包含所有代理进程的所有可被查询和修改的参数。

OID（Object Identifiers），一个OID是一个唯一的键值对，用于标识具体某一个设备的某个具体信息(对象标识)，如端口信息、设备名称等。
```

### 5.5.4 SNMP MIB

所谓(MIB)管理信息库，就是所有代理进程包含的、并且能够被管理进程进行查询和设置的信息的集合。MIB是基于对象标识树的，对象标识是一个整数序列，中间以"."分割，这些整数构成一个树型结构，类似于 DNS或Unix的文 件系统，MIB被划分为若干个组，如system、 interfaces、 a t（地址转换）和ip组等。iso . org . dod . internet .private . enterprises（1.3 .6 .1.4.1）这个标识，是给厂家自定义而预留的，比如华为的为1.3.6.1.4.1.2011，华三 的为1.3.6.1.4.1.25506。

![image-20210513144752036](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210513144752036.png)

### 5.5.5 基于Centos的SNMP

Centos 7.x服务器安装配置SNMP

```bash
#centos安装
[14:49:09 root@centos7 ~]#yum install -y net-snmp
#ubuntu安装
[14:49:09 root@centos7 ~]#apt install -y snmpd
com2sec notConfigUser  default       123456  #第一步：设置团体认密码，默认为public

group   notConfigGroup v1           notConfigUser
group   notConfigGroup v2c           notConfigUser #第二步：将团体名称notConfigUser 关联至组notConfigGroup

view    systemview    included   .1.3.6.1.2.1.1
view    systemview    included   .1.3.6.1.2.1.25.1.11  #创建一个view，并对其授权可访问的OID范围
view    systemview    included   .1  #自定义授权，否则zabbix server无法获取数据

access  notConfigGroup ""      any       noauth    exact  systemview none none #将组notConfigGroup关联至systemview 从而完成对组的授权
[14:54:10 root@centos7 ~]#systemctl restart snmpd
```

### 5.5.6 SNMP OID

如何测试OID：

snmpwalk是SNMP的一个工具，它使用SNMP的GET请求查询指定OID（SNMP协议中的对象标识）入口的所有 OID树信息，并显示给用户。通过snmpwalk也可以查看支持SNMP协议（可网管）的设备的一些其他信息，比如 cisco交换机或路由器IP地址、内存使用率等，也可用来协助开发SNMP功能。

要使用snmpwalk需要先按照net-snmp软件包中。

```bash
[14:54:20 root@centos7 ~]#yum install net-snmp-utils
[14:55:24 root@centos7 ~]#snmpwalk -h
USAGE: snmpwalk [OPTIONS] AGENT [OID]
–h：显示帮助。
–v：指定snmp的版本, 1或者2c或者3。
–c：指定连接设备SNMP密码。
–V：显示当前snmpwalk命令行版本。
–r：指定重试次数，默认为0次。
–t：指定每次请求的等待超时时间，单为秒，默认为3秒。
–l：指定安全级别：noAuthNoPriv|authNoPriv|authPriv。
–a：验证协议：MD5|SHA。只有-l指定为authNoPriv或authPriv时才需要。
–A：验证字符串。只有-l指定为authNoPriv或authPriv时才需要。
–x：加密协议：DES。只有-l指定为authPriv时才需要。
–X：加密字符串。只有-l指定为authPriv时才需要。
```

### 5.5.7 测试SNMP数据采集

测试能否通过SNMOP采集数据

```bash
[14:56:18 root@centos7 ~]#snmpwalk -v 2c -c 123456 192.168.10.71 .1.3.6.1.4.1.2021.10.1.3.1
UCD-SNMP-MIB::laLoad.1 = STRING: 0.00
[14:56:51 root@centos7 ~]#snmpwalk -v 2c -c 123456 192.168.10.71 .1.3.6.1.4.1.2021.4.3.0
UCD-SNMP-MIB::memTotalSwap.0 = INTEGER: 2097148 kB
```

### 5.5.8 Centos SNMP

```bash
CPU 负载：
1 minute Load: .1.3.6.1.4.1.2021.10.1.3.1
5 minute Load: .1.3.6.1.4.1.2021.10.1.3.2
15 minute Load: .1.3.6.1.4.1.2021.10.1.3.3

内存使用：
Total Swap Size: .1.3.6.1.4.1.2021.4.3.0
Available Swap Space: .1.3.6.1.4.1.2021.4.4.0
Total RAM in machine: .1.3.6.1.4.1.2021.4.5.0
Total RAM used: .1.3.6.1.4.1.2021.4.6.0
Total RAM Free: .1.3.6.1.4.1.2021.4.11.0
Total RAM Shared: .1.3.6.1.4.1.2021.4.13.0
Total RAM Buffered: .1.3.6.1.4.1.2021.4.14.0
Total Cached Memory: .1.3.6.1.4.1.2021.4.15.0

硬盘使用：
Path where the disk is mounted: .1.3.6.1.4.1.2021.9.1.2.1
Path of the device for the partition: .1.3.6.1.4.1.2021.9.1.3.1
Total size of the disk/partion (kBytes): .1.3.6.1.4.1.2021.9.1.6.1
Available space on the disk: .1.3.6.1.4.1.2021.9.1.7.1
Used space on the disk: .1.3.6.1.4.1.2021.9.1.8.1
Percentage of space used on disk: .1.3.6.1.4.1.2021.9.1.9.1
Percentage of inodes used on disk: .1.3.6.1.4.1.2021.9.1.10.1

系统信息：
sysDescr 1.3.6.1.2.1.1.1
sysObjectID 1.3.6.1.2.1.1.2
sysUpTime 1.3.6.1.2.1.1.3
sysContact 1.3.6.1.2.1.1.4
sysName 1.3.6.1.2.1.1.5

CPU 信息：
percentage of user CPU time: .1.3.6.1.4.1.2021.11.9.0
raw user cpu time: .1.3.6.1.4.1.2021.11.50.0
percentages of system CPU time: .1.3.6.1.4.1.2021.11.10.0
raw system cpu time: .1.3.6.1.4.1.2021.11.52.0
percentages of idle CPU time: .1.3.6.1.4.1.2021.11.11.0
raw idle cpu time: .1.3.6.1.4.1.2021.11.53.0
raw nice cpu time: .1.3.6.1.4.1.2021.11.51.0
```

### 5.5.9 添加SNMP监控主机

使用zabbix 自带的SNMP

**添加主机**

![image-20210513150053462](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210513150053462.png)

**关联模板**

![image-20210513150143697](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210513150143697.png)

**修改连接密码**

![image-20210513150222210](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210513150222210.png)

**5.5.10 监控网络设备**

snmp一般用来监控网络设备，使用的模板需要去官网下载，对应自己的网络设备型号

下载地址：https://share.zabbix.com/network_devices

## 5.6 监控MySQL

监控MySQL连接数、主从同步、同步延迟等

### 5.6.1 实现MySQL主从

部署mysql 主从同步，需要配置不同的server id并开启binlog

**MySQL Master配置**

```bash
[15:23:25 root@web1 ~]#apt install mysql-server
[15:23:53 root@web1 ~]#vim /etc/mysql/mysql.conf.d/mysqld.cnf
bind-address       = 0.0.0.0  
server-id       = 183                                                         
log_bin         = /var/log/mysql/mysql-bin.log
[15:25:45 root@web1 ~]#systemctl restart mysql
```

**MySQL Slave配置**

```bash
[15:23:25 root@web1 ~]#apt install mysql-server
[15:23:53 root@web1 ~]#vim /etc/mysql/mysql.conf.d/mysqld.cnf
bind-address       = 0.0.0.0  
server-id       = 184                                                         
log_bin         = /var/log/mysql/mysql-bin.log
[15:25:45 root@web1 ~]#systemctl restart mysql
[15:25:45 root@web1 ~]#systemctl restart mysql
```

**MySQL Master授权账户**

在mysql master服务器授权账户并导出数据，然后scp到mysql backup服务器。

```bash
#MySQL Master授权账户
mysql> create user 'slave'@'%' identified by '123456';
Query OK, 0 rows affected (0.01 sec)

mysql> grant REPLICATION SLAVE on *.* to 'slave'@'%';
Query OK, 0 rows affected (0.00 sec)
#备份数据
[15:31:37 root@web1 ~]#mysqldump --all-databases --single_transaction --flush-logs --master-data=2 --lock-tables >backup.sql
[15:31:46 root@web1 ~]#scp backup.sql 192.168.10.184:
```

**MySQL slave导入数据**

在MySQL Slave服务器导入数据开始同步数据，Position位置在sql文件：

```bash
[15:26:57 root@ubuntu18-04 ~]#vim backup.sql
CHANGE MASTER TO MASTER_HOST='192.168.10.183',
MASTER_USER='slave', 
MASTER_PASSWORD='123456',
MASTER_LOG_FILE='mysql-bin.000003',
MASTER_LOG_POS=154;
#导入数据
[15:35:46 root@ubuntu18-04 ~]#mysql <backup.sql 
#启动主从复制
[15:36:07 root@ubuntu18-04 ~]#mysql
mysql> start slave;
Query OK, 0 rows affected (0.00 sec)

mysql> show slave status\G
*************************** 1. row ***************************
               Slave_IO_State: Waiting for master to send event
                  Master_Host: 192.168.10.183
                  Master_User: slave
                  Master_Port: 3306
                Connect_Retry: 60
              Master_Log_File: mysql-bin.000003
          Read_Master_Log_Pos: 154
               Relay_Log_File: ubuntu18-04-relay-bin.000002
                Relay_Log_Pos: 320
        Relay_Master_Log_File: mysql-bin.000003
             Slave_IO_Running: Yes
            Slave_SQL_Running: Yes
```

### 5.6.2 自定义脚本监控MySQL

编写脚本监控脚本MySQL主从同步及延迟

**MySQL slave安装zabbix agent**

略....

**脚本内容**

```bash
[16:30:07 root@ubuntu18-04 ~]#cat /apps/zabbix_agent/sh/mysql_monitor.sh
Seconds_Behind_Master(){
    NUM=`mysql -uroot  -e "show slave status\G;" | grep "Seconds_Behind_Master:" | awk -F: '{print $2}'`
    echo $NUM
}
master_slave_check(){
    NUM1=`mysql -uroot  -e "show slave status\G;" | grep "Slave_IO_Running" | awk -F: '{print $2}' | sed 's/^[ \t]*//g'`
    NUM2=`mysql -uroot  -e "show slave status\G;" | grep "Slave_SQL_Running:" | awk -F: '{print $2}' | sed 's/^[ \t]*//g'`
    if test $NUM1 == "Yes" && test $NUM2 == "Yes";then
        echo 1
    else
        echo 0
    fi
}
main(){
case $1 in
    Seconds_Behind_Master)
        Seconds_Behind_Master 
        ;;
    master_slave_check)
        master_slave_check
        ;;
esac
}
main $1 
[16:30:18 root@ubuntu18-04 ~]#chmod +x /apps/zabbix_agent/sh/mysql_monitor.sh
[16:31:02 root@ubuntu18-04 ~]#/apps/zabbix_agent/sh/mysql_monitor.sh master_slave_check 
1
```

**自定义监控项配置**

```bash
[16:31:08 root@ubuntu18-04 ~]#vim /apps/zabbix_agent/etc/zabbix_agentd.conf
UserParameter=mysql.monitor[*],/apps/zabbix_agent/sh/mysql_monitor.sh "$1"
[16:32:46 root@ubuntu18-04 ~]#systemctl restart zabbix-agent.service
#测试数据
[16:38:21 root@zabbix-server ~]#/apps/zabbix_server/bin/zabbix_get -s 192.168.10.184 -p 10050 -k "mysql.monitor["master_slave_check"]"
1
```

## 5.7 自定义端口和进程监控

```bash
net.tcp.listen[80]   #表示检查tcp协议的端口80是否处于监听状态，是为1，不是为0
```

## 5.8 故障自治愈功能

当zabbix 监控到指定的监控项异常的时候，通过指定的操作使故障自动恢复，通常是重启服务等一些简单的操作，也可以调用脚本执行比较复杂的操作。

设置监控项和触发器，新建动作，在触发条件里面添加操作，在远程主机通过zabbix 客户端执行命令

```bash
1.开启zabbix sudo权限
2.配置允许允许特殊字符
3.配置远程命令
4.验证和测试
```

### 5.8.1 zabbix agent需要开启远程命令执行

```bash
[17:32:32 root@web1 ~]#vim /apps/zabbix_agent/etc/zabbix_agentd.conf
EnableRemoteCommands=1   #开启远程执行命令
UnsafeUserParameters=1   #允许远程执行命令的时候使用不安全的参数(特殊字符串)
[17:34:12 root@web1 ~]#systemctl restart zabbix-agent.service
```

### 5.8.2 zabbix用户授权

如果zabbix agent是使用zabbix用户启动的，那么要在zabbix 用户授权使用特权命令，负责有些命令zabbix没有权限执行，会导致定义好的自治愈策略因为权限拒绝为执行失败。

```bash
[17:36:16 root@web1 ~]#vim /etc/sudoers
zabbix  ALL=NOPASSWD:ALL   #授权指定用户执行特殊命令不再需要密码，比如sudo等
 # Defaults !visiblepw #不强制使用tty
```

### 5.8.3 创建动作

配置--动作--创建动作，创建之前的nginx

![image-20210513175326626](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210513175326626.png)

### 5.8.4 执行远程操作

执行命令或者执行脚本

```bash
sudo /path/to/command
sudo /path/to/script.sh
sudo /apps/nginx/sbin/nginx
```

![image-20210513174646450](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210513174646450.png)

### 5.8.5 验证自治愈功能

将被测试的服务手动停止运行，验证能否自动启动或重启，更多操作可以远程执行脚本

```bash
[17:51:53 root@web1 ~]#systemctl stop nginx.service
```

![image-20210513175447073](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210513175447073.png)

命令已经执行验证端口是否打开

```bash
[17:54:10 root@web1 ~]#ss -ntl | grep 80
LISTEN  0        511                    0.0.0.0:80               0.0.0.0:*
```

#### 5.8.5.1 zabbix 自治愈日志

```bash
99230:20210513:173432.011 agent #4 started [listener #3] 
 99231:20210513:173432.015 agent #5 started [active checks #1] 
 99229:20210513:175135.922 Executing command 'sudo systemctl restart nginx.service'   #执行命令的日志
```

## 5.9 grafana图形展示

### 5.9.1 安装grafana服务

```bash
#下载安装
[17:57:50 root@ubuntu18-04 ~]#sudo apt-get install -y adduser libfontconfig1
[17:58:42 root@ubuntu18-04 ~]#wget https://dl.grafana.com/oss/release/grafana_7.5.6_amd64.deb

#启动
[18:00:13 root@ubuntu18-04 ~]#systemctl enable --now grafana-server.service
```

### 5.9.2 grafana安装并启用zabbix插件

**安装zabbix插件**

```bash
[18:06:42 root@ubuntu18-04 ~]#grafana-cli plugins install alexanderzobnin-zabbix-app
```

**启动zabbix插件**

```bash
[18:06:42 root@ubuntu18-04 ~]#systemctl restart grafana-server.service
```

**启动zabbix插件**

登录web页面   IP:3000 默认用户名和密码admin

![image-20210513181141158](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210513181141158.png)

**添加MySQL数据源**

![image-20210513181552958](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210513181552958.png)

**添加zabbix 数据源**

![image-20210513181940467](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210513181940467.png)

**导入模板**

模板下载地址：https://grafana.com/grafana/dashboards

![image-20210513183944149](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210513183944149.png)

# 六、Zabbix 事件通知机制

出现故障报警的时候，可以通过不同方式通知管理员进行故障处理，尽快恢复业务

```bash
[root@s1 ~]# vim /etc/zabbix/zabbix_server.conf
AlertScriptsPath=/usr/lib/zabbix/alertscripts #报警脚本路径
ExternalScripts=/usr/lib/zabbix/externalscripts #外部脚本路径
```

## 6.1 邮件通知

### 6.1.1 邮箱开启SMTP

我这里使用163邮箱

![image-20210513193306819](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210513193306819.png)

生成授权码，后保存

### 6.1.2 Zabbix Web创建报警媒介类型

报警媒介类型是一种给运维工程师发送消息通知的渠道，即当zabbix 的触发器触发一个事件后，怎么才能把这个 事件通过某些方式通知给运维工程师呢？那么媒介类型就起到这样的作用，媒介类型创建好之后，需要在每个账户 里面添加相应的收件配置，比如邮件类型的媒介类型要给zabbix账户添加邮箱，如果是微信类型的媒介类型那么就 要在zabbix账户设置微信号，同样的到来，短信类型的媒介类型那就得给zabbix账户设置手机号用于接收报警消息内容。

管理-->报警媒介类型-->创建报警媒介类型

![image-20210513195620342](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210513195620342.png)

### 6.1.3 给用户添加报警报警媒介

![image-20210513193949006](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210513193949006.png)

### 6.1.4 创建动作

动作是对zabbix 触发器触发后生成的事件的具体处理操作，可以是远程执行命令，也可以是发送通知给指定的管理员进行故障处理，发送命令是调用的上一步骤创建好的报警媒介类型。

配置-->动作-->创建动作

![image-20210513194440576](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210513194440576.png)

**故障恢复信息**

![image-20210513194655492](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210513194655492.png)

### 6.1.5 验证动作

将某个被监控的服务手动停止，验证能否收到zabbix 发送的报警通知。

```bash
[19:53:04 root@web1 ~]#systemctl stop nginx.service
```

**验证事件状态**

![image-20210513195727139](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210513195727139.png)

**邮箱验证是否收到邮件**

![image-20210513195749859](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210513195749859.png)

## 6.2 短信通知

短信配置与邮箱配置基本一致，但是不同的厂商配置不一样

## 6.3 微信通知

微信企业账号注册见 api 及通知脚本/weixin.py及文档微信报警

### 6.3.1 企业微信注册及配置

https://work.weixin.qq.com/

打开企业微信官网注册账号，使用自己的手机号进行注册。

### 6.3.2 创建应用

在web界面创建一个应用，用于微信报警通知.

![image-20210513202455546](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210513202455546.png)

### 6.3.3 zabbix server配置

zabbix server实现微信通知基于python调用脚本实现且需要安装requests模块：

https://work.weixin.qq.com/api/doc/#90000/90003/90487 \#简易教程

先获取token，token是通过corpid(企业ID)和corpsecret(应用 Secret)获取到的，然后通过API发送消息，根据官方 文档可以看到，发送的消息其实就是一个post请求，请求方式如下：

```bash
请求方式：POST（HTTPS）
请求地址： https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=ACCESS_TOKEN

post 参数为 access_token 和 消息体。
```

服务端API调用：

https://work.weixin.qq.com/api/doc#90000/90135/90664

### 6.3.4 编写python脚本

在zabbix server安装基础模块并编写pyhton脚本，python脚本通过调用企业微信的API实现自动发送通知消息， 具体内容如下：

```bash
[20:37:22 root@zabbix-server ~]#apt install python-pip
[20:38:49 root@zabbix-server ~]# pip install requests
[20:42:38 root@zabbix-server ~]#vim /apps/zabbix_server/etc/zabbix_server.conf
AlertScriptsPath=/apps/zabbix/alertscripts
[20:42:20 root@zabbix-server ~]#systemctl restart zabbix-server.service
#编写脚本
[20:43:15 root@zabbix-server alertscripts]#pwd
/apps/zabbix/alertscripts
[20:43:19 root@zabbix-server alertscripts]#vim wx.py
#!/usr/bin/python3.6
#coding:utf-8
#Author:Zhang zhuo

import requests
import sys
import os
import json
import logging

logging.basicConfig(level = logging.DEBUG, format = '%(asctime)s, %(filename)s, %(levelname)s, %(message)s',
    datefmt = '%a, %d %b %Y %H:%M:%S',
    filename = os.path.join('/tmp','weixin.log'),
    filemode = 'a')
corpid='wwf1afcb7e7b881cf8'
appsecret="SzdkrJyKwSSRpi4YF8p4EHeRmu3Vj_crwkELWcDWMfs"
agentid="1000002"
token_url='https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=' + corpid + '&corpsecret=' + appsecret
req=requests.get(token_url)
accesstoken=req.json()['access_token']

msgsend_url='https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=' + accesstoken
touser=sys.argv[1]
subject=sys.argv[2]
message=sys.argv[2] + "\n\n" +sys.argv[3]

params={
    "touser": touser,
    "msgtype": "text",
    "agentid": agentid,
    "text": {
        "content": message
        },
    "safe":0
    }
req=requests.post(msgsend_url, data=json.dumps(params))
logging.info('sendto:' + touser + ';;subject:' + subject + ';;message:' + message)
#测试
[20:57:35 root@zabbix-server alertscripts]#python wx.py zhangzhuo "这是主题" "这是.容"
```

### 6.3.5 添加微信报警媒介类型

![image-20210513210008802](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210513210008802.png)

### 6.3.6 添加联系人报警媒介

![image-20210513210104305](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210513210104305.png)

### 6.3.7 配置故障操作

![image-20210513210312485](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210513210312485.png)

### 6.3.8 配置恢复操作

![image-20210513210428255](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210513210428255.png)

### 6.3.9 测试微信报警

```bash
[21:15:54 root@web1 ~]#systemctl stop nginx.service
```

![image-20210513211851584](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210513211851584.png)

**微信中消息验证**

![image-20210513212012809](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210513212012809.png)

## 6.4  zabbix内置变量

```bash
故障：{TRIGGER.STATUS}，服务器：{HOSTNAME1}发生:{TRIGGER.NAME}故障！
告警主机：{HOSTNAME1}，IP地址：{HOST.CONN}
告警时间：{EVENT.DATE}{EVENT.TIME}
告警等级：{TRIGGER.SEVERITY}
告警信息：{TRIGGER.NAME}
告警项目：{TRIGGER.KEY1}
问题详情：{ITEM.NAME}:{ITEM.VALUE}
当前状态：{TRIGGER.STATUS}:{ITEM.VALUE1}
事件ID：{EVENT.ID}
恢复：{TRIGGER.STATUS}，服务器：{HOSTNAME1}已经恢复！:{TRIGGER.NAME}
告警主机：{HOSTNAME1} ，IP地址：{HOST.CONN}
告警时间：{EVENT.DATE}{EVENT.TIME}
告警等级：{TRIGGER.SEVERITY}
告警信息：{TRIGGER.NAME}
告警项目：{TRIGGER.KEY1}
问题详情：{ITEM.NAME}:{ITEM.VALUE}
当前状态：{TRIGGER.STATUS}:{ITEM.VALUE1}
事件ID：{EVENT.ID}

主机显示名：{HOST.NAME}
```

# 七、Zabbix 自动化运维

通过脚本批量部署zabbix agent、通过API批量自动添加主机或者自动发现监控主机

## 7.1 Zabbix Agent批量部署

通过脚本，实现数十上百台agent的自动化批量安装，可以通过源码或apt等方式安装

### 7.1.1 源码编译安装

官网下载源码包，通过自定义编译参数、自定义配置文件和监控脚本实现安装见

```bash
pwddir=`pwd`
#安装设置
tar='zabbix-4.0.30.tar.gz'
tar_dir='zabbix-4.0.30'
install_dir='/apps/zabbix_agent'

#zabbix Server地址
zabbix_server_IP='192.168.10.181'

#zabbix proxy地址
zabbix_proxy_IP='192.168.10.182'

#主动连接的Server地址
zabbix_IP='192.168.10.182'

#当前主机IP
IP='192.168.10.184'



install(){
version=`grep -Eo "(centos|ubuntu)" /etc/os-release | head -n1`
    if [ $version = centos ];then
        echo "您的系统为centos，正在为您安装...."; sleep 3
        yum install gcc libxml2-devel libevent-devel net-snmp net-snmp-devel curl curl-devel  -y || { echo "基础依赖包安装失败，请检查";exit; }
    elif [ ${version} = ubuntu ];then
        echo "您的系统为ubuntu，正在为您安装...."; sleep 3
        apt-get install ssl-cert ttf-dejavu-core libmysqlclient-dev libxml2-dev libxml2  libsnmp-dev libevent-dev openjdk-8-jdk curl libcurl4-openssl-dev  || { echo "基础依赖包安装失败，请检查";exit; }
    else
        echo "您的系统版本无法识别，正在退出...."; sleep 3 ; exit
    fi
}
install_agent(){
    id zabbix &>/dev/null || useradd -r -s /sbin/nologin zabbix
    tar xf ${tar}
    cd ${tar_dir}
    ./configure --prefix=${install_dir} --enable-agent  --enable-ipv6 --with-net-snmp --with-libcurl --with-libxml2 || { echo "编译失败请检查";exit; }
    make install && { echo "编译安装完成"; sleep 3; }
}
set_agent_conf(){
    mkdir ${install_dir}/{sock,pid,logs} -p
    cp -a ${pwddir}/zabbix_agentd.conf ${install_dir}/etc/zabbix_agentd.conf 
    chown -R zabbix.zabbix ${install_dir}
    sed -ri "s#(^LogFile=).*#\1${install_dir}/logs/zabbix_agentd.log#" ${install_dir}/etc/zabbix_agentd.conf
    sed -ri "s#(^PidFile=).*#\1${install_dir}/pid/zabbix_agentd.pid#" ${install_dir}/etc/zabbix_agentd.conf
    sed -ri "s#(^Server=).*#\1${zabbix_server_IP},${zabbix_proxy_IP}#" ${install_dir}/etc/zabbix_agentd.conf
    sed -ri "s#(^ServerActive=).*#\1${zabbix_IP}#" ${install_dir}/etc/zabbix_agentd.conf
    sed -ri "s#(^Hostname=).*#\1${IP}#" ${install_dir}/etc/zabbix_agentd.conf
}
set_service(){
cat <<EOF>/lib/systemd/system/zabbix-agent.service
[Unit]
Description=Zabbix Agent
After=syslog.target
After=network.target
[Service]
Environment="CONFFILE=${install_dir}/etc/zabbix_agentd.conf"
Type=forking
Restart=on-failure
PIDFile=${install_dir}/pid/zabbix_agentd.pid
KillMode=control-group
ExecStart=${install_dir}/sbin/zabbix_agentd -c \$CONFFILE
ExecStop=/bin/kill -SIGTERM \$MAINPID
RestartSec=10s
User=zabbix
Group=zabbix
[Install]
WantedBy=multi-user.target
EOF
}

man(){
    install
    install_agent
    set_agent_conf
    set_service
}
man
```

### 7.1.2 apt/yum在线安装

略.....

## 7.2 Zabbix API添加主机

https://www.zabbix.com/documentation/4.0/zh/manual/api

通过API，实现完全自动化添加删除agent、关联模板等操作

### 7.2.1 API使用基础

```bash
见文本文档 Zabbix-API使用
1.获取token：
需要指定用的账户名 密码和id
[09:41:52 root@zabbix-proxy zabbix-agent]#curl -s -X POST -H 'Content-Type:application/json' -d ' 
{
    "jsonrpc": "2.0",
    "method": "user.login",
    "params": {
        "user": "Admin",
        "password": "zabbix"
    },
    "id": 1,
    "auth": null
}' http://192.168.10.181/zabbix/api_jsonrpc.php | python3 -m json.tool
#返回的数据
{
    "jsonrpc": "2.0",
    "result": "634a17a8ba49329aa90f9428de468606",
    "id": 1
}

2.获取所有主机列表
[09:45:43 root@zabbix-proxy zabbix-agent]#curl -s -X POST -H 'Content-Type:application/json' -d ' 
{
    "jsonrpc": "2.0",
    "method": "host.get",
    "params": {
        "output": [
            "hostid",
            "host"
        ],
        "selectInterfaces": [
            "interfaceid",
            "ip"
        ]
    },
    "id": 2,
    "auth": "634a17a8ba49329aa90f9428de468606"
 }' http://192.168.10.181/zabbix/api_jsonrpc.php | python3 -m json.tool
#返回的数据
{
    "jsonrpc": "2.0",
    "result": [
        {
            "hostid": "10084",
            "host": "Zabbix server",
            "interfaces": [
                {
                    "interfaceid": "1",
                    "ip": "127.0.0.1"
                }
            ]
        },
        {
            "hostid": "10274",
            "host": "192.168.10.183-agent",
            "interfaces": [
                {
                    "interfaceid": "2",
                    "ip": "192.168.10.183"
                }
            ]
        }
    ],
    "id": 2
}
3.获取指定主机信息
[10:00:16 root@zabbix-proxy zabbix-agent]#curl -s -X POST -H 'Content-Type:application/json' -d ' 
{
    "jsonrpc": "2.0",
    "method": "host.get",
    "params": {
        "filter": {
             "host": [
                 "192.168.10.183-agent"  
             ]
        }
     },
     "auth": "634a17a8ba49329aa90f9428de468606",
     "id": 2
}' http://192.168.10.181/zabbix/api_jsonrpc.php | python3 -m json.tool

#查询到的信息
{
    "jsonrpc": "2.0",
    "result": [
        {
            "hostid": "10274",
            "proxy_hostid": "10273",
            "host": "192.168.10.183-agent",
            "status": "0",
            "disable_until": "0",
            "error": "",
            "available": "1",
            "errors_from": "0",
            "lastaccess": "0",
            "ipmi_authtype": "-1",
            "ipmi_privilege": "2",
            "ipmi_username": "",
            "ipmi_password": "",
            "ipmi_disable_until": "0",
            "ipmi_available": "0",
            "snmp_disable_until": "0",
            "snmp_available": "0",
            "maintenanceid": "0",
            "maintenance_status": "0",
            "maintenance_type": "0",
            "maintenance_from": "0",
            "ipmi_errors_from": "0",
            "snmp_errors_from": "0",
            "ipmi_error": "",
            "snmp_error": "",
            "jmx_disable_until": "0",
            "jmx_available": "0",
            "jmx_errors_from": "0",
            "jmx_error": "",
            "name": "192.168.10.183-agent",
            "flags": "0",
            "templateid": "0",
            "description": "",
            "tls_connect": "1",
            "tls_accept": "1",
            "tls_issuer": "",
            "tls_subject": "",
            "tls_psk_identity": "",
            "tls_psk": "",
            "proxy_address": "",
            "auto_compress": "1"
        }
    ],
    "id": 2
}

4.获取所有用户
[10:03:48 root@zabbix-proxy zabbix-agent]#curl -s -X POST -H 'Content-Type:application/json' -d ' 
{
    "jsonrpc": "2.0",
    "method": "user.get",
    "params": {
        "output": "extend"
    },
    "auth": "634a17a8ba49329aa90f9428de468606",
    "id": 1
}' http://192.168.10.181/zabbix/api_jsonrpc.php | python3 -m json.tool

#查询到的信息
{
    "jsonrpc": "2.0",
    "result": [
        {
            "userid": "1",
            "alias": "Admin",
            "name": "Zabbix",
            "surname": "Administrator",
            "url": "",
            "autologin": "1",
            "autologout": "0",
            "lang": "zh_CN",
            "refresh": "30s",
            "type": "3",
            "theme": "default",
            "attempt_failed": "0",
            "attempt_ip": "192.168.10.1",
            "attempt_clock": "1620817786",
            "rows_per_page": "50"
        },
        {
            "userid": "2",
            "alias": "guest",
            "name": "",
            "surname": "",
            "url": "",
            "autologin": "0",
            "autologout": "15m",
            "lang": "en_GB",
            "refresh": "30s",
            "type": "1",
            "theme": "default",
            "attempt_failed": "0",
            "attempt_ip": "",
            "attempt_clock": "0",
            "rows_per_page": "50"
        }
    ],
    "id": 1
}

5.获取单个模板信息
[10:07:12 root@zabbix-proxy zabbix-agent]#curl -s -X POST -H 'Content-Type:application/json' -d ' 
{
    "jsonrpc": "2.0",
    "method": "template.get",
    "params": {
        "output": "extend",
        "filter": {
            "host": [
                "nginx-template-magedu-jiege" #模板名称
            ]
        }
    },
    "auth": "634a17a8ba49329aa90f9428de468606",
    "id": 1
}' http://192.168.10.181/zabbix/api_jsonrpc.php | python3 -m json.tool

#查询到的信息
{
    "jsonrpc": "2.0",
    "result": [
        {
            "proxy_hostid": "0",
            "host": "nginx-template-magedu-jiege",
            "status": "3",
            "disable_until": "0",
            "error": "",
            "available": "0",
            "errors_from": "0",
            "lastaccess": "0",
            "ipmi_authtype": "-1",
            "ipmi_privilege": "2",
            "ipmi_username": "",
            "ipmi_password": "",
            "ipmi_disable_until": "0",
            "ipmi_available": "0",
            "snmp_disable_until": "0",
            "snmp_available": "0",
            "maintenanceid": "0",
            "maintenance_status": "0",
            "maintenance_type": "0",
            "maintenance_from": "0",
            "ipmi_errors_from": "0",
            "snmp_errors_from": "0",
            "ipmi_error": "",
            "snmp_error": "",
            "jmx_disable_until": "0",
            "jmx_available": "0",
            "jmx_errors_from": "0",
            "jmx_error": "",
            "name": "nginx-template-magedu-jiege",
            "flags": "0",
            "templateid": "10282",
            "description": "",
            "tls_connect": "1",
            "tls_accept": "1",
            "tls_issuer": "",
            "tls_subject": "",
            "tls_psk_identity": "",
            "tls_psk": "",
            "proxy_address": "",
            "auto_compress": "1"
        }
    ],
    "id": 1
}
```

### 7.2.2 基于脚本获取token

```bash
[10:16:32 root@zabbix-proxy ~]#cat token.sh 
#! /bin/bash
url='http://192.168.10.181/zabbix/api_jsonrpc.php'
curl -s -X POST -H 'Content-Type:application/json' -d '
{
    "jsonrpc": "2.0",
    "method": "user.login",
    "params": {
        "user": "Admin",
        "password": "zabbix"
    },
    "id": 1
}' ${url} | python3 -m json.tool
#执行效果
[10:19:11 root@zabbix-proxy ~]#./token.sh | grep result | cut -d\" -f4
{
    "jsonrpc": "2.0",
    "result": "b57189c4dfca50a3d29eca231b6a0d8d",
    "id": 1
}
```

### 7.2.3 通过API添加主机命令格式

API添加主机为预先知道要添加的主机IP、预先安装并配置好zabbix agent、预先知道要关联的模板ID/组ID等信息，然后同API提交请求添加

**添加不带proxy的主机**

```bash
curl -s -X POST -H 'Content-Type:application/json' -d '
{
    "jsonrpc": "2.0",
    "method": "host.create",  #定义方法，N多钟
    "params": {
        "host": "API Add Host Test",  #自定义添加后的agent的名称
        "interfaces": [
            {
                "type": 1,  #类型为1表示agent，2是SNMP，3是IMPI,4是JMX
                "main": 1,   #主要接口
                "useip": 1,  #0是使用DNS，1是使用IP地址
                "ip": "192.168.10.182",   #添加的zabbix agent的IP地址
                "dns": "",
                "port": "10050" #agent端口
            }
        ],
        "groups": [
            { 
                "groupid": "2" #添加到的组的ID
            }
        ],
        "templates": [
            {
                "templateid": "10282"  #关联的模板的ID
            }
        ]
    },
    "auth": "b57189c4dfca50a3d29eca231b6a0d8d",
    "id": 1
}' http://192.168.10.181/zabbix/api_jsonrpc.php | python3 -m json.tool
```

**添加带proxy的主机**

```bash
curl -s -X POST -H 'Content-Type:application/json' -d '
{
    "jsonrpc": "2.0",
    "method": "host.create",
    "params": {
        "host": "192.168.10.182-agent",
        "proxy_hostid": "10273",    #这里填写proxy的id
        "interfaces": [
            {
                "type": 1, 
                "main": 1,
                "useip": 1,
                "ip": "192.168.10.182",
                "dns": "",
                "port": "10050"
            }
        ],
        "groups": [
            {
                "groupid": "2"
            }
        ],
        "templates": [
            {
                "templateid": "10272" 
            }
        ]
    },
    "auth": "b57189c4dfca50a3d29eca231b6a0d8d",
    "id": 1
}' http://192.168.10.181/zabbix/api_jsonrpc.php | python3 -m json.tool
```

### 7.2.4 API批量添加主机

```bash
#token.sh
url='http://192.168.10.181/zabbix/api_jsonrpc.php'
curl -s -X POST -H 'Content-Type:application/json' -d '
{
    "jsonrpc": "2.0",
    "method": "user.login",
    "params": {
        "user": "Admin",
        "password": "zabbix"
    },
    "id": 1
}' ${url} | python3 -m json.tool
#host-add-zabbix.sh
#agent节点的IP
IP="
192.168.10.181
192.168.10.182
192.168.10.183
192.168.10.184
192.168.10.185
192.168.10.186
"
zabbix的web端
url='http://192.168.10.181/zabbix/api_jsonrpc.php'
auth=`./token.sh | grep result | cut -d\" -f4`


for node_ip in ${IP};do
curl -s -X POST -H 'Content-Type:application/json' -d '
{
    "jsonrpc": "2.0",
    "method": "host.create",
    "params": {
        "host": "'${node_ip}'",
        "name": "zhangzhuo-node '${node_ip}'",   #这里需要与agent节点的配置文件中Hostname一致可以修改，如果不一致会导致，会识别主机，d
        "proxy_hostid": "10273",
        "interfaces": [
            {
                "type": 1, 
                "main": 1,
                "useip": 1,
                "ip": "'${node_ip}'",
                "dns": "",
                "port": "10050"
            }
        ],
        "groups": [
            {
                "groupid": "2"
            }
        ],
        "templates": [
            {
                "templateid": "10272" 
            }
        ]
    },
    "auth": "'${auth}'",
    "id": 1
}' ${url} | python3 -m json.tool
done
```

## 7.3 Zabbix 动态发现主机

官方文档：https://www.zabbix.com/documentation/4.0/zh/manual/discovery/auto_registration

不建议使用性能损耗过大

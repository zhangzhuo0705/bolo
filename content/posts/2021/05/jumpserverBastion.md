---
title: "Jumpserver堡垒机"
date: 2021-05-17T16:44:28+08:00
lastmod: 2021-05-17T16:45:07+08:00
draft: false
description: "完成 Jumpserver 堡垒机及 MySQL、Redis 依赖服务的部署配置。"
cover: "https://b3logfile.com/bing/20190315.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["应用服务"]
tags: ["Jumpserver"]
toc: true
---
# 一、Jumpserver 简介

Jumpserver 是一款使用 Python, Django 开发的开源跳板机系统, 为互联网企业提供了认证，授权，审计，自动化运维等功能。

![image-20210422142259089](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210422142259089.png)

官方地址：http://www.jumpserver.org/

# 二、部署环境

**官方环境要求：**

```bash
硬件配置: 2 个 CPU 核心, 4G 内存, 50G 硬盘（最低）
操作系统: Linux 发行版 x86_64
Python = 3.6.x
Mysql Server ≥ 5.6
Mariadb Server ≥ 5.5.56
Redis

从 v2.5 开始, 要求 MySQL >= 5.7  MariaDB	>= 10.2
从 v2.6 开始, 要求 Redis >= 5
推荐使用外置 数据库 和 Redis, 方便日后扩展升级
```

**服务器准备**

```bash
192.168.10.181  jumpserver 2c-4G
192.168.10.182  数据库/Redis 2C-2G
```

## 2.1 部署MYsql服务

```bash
外置数据库要求
mysql 版本需要大于等于 5.6
mariadb 版本需要大于等于 5.5.6
从 v2.5 开始, 要求 MySQL >= 5.7  MariaDB	>= 10.2
数据库编码要求 uft8，5.7之后utf8mb4
```

**使用docker部署mysql5.7**

```bash
[14:29:25 root@docker2 mysql]#docker pull mysql:5.7
[14:31:46 root@docker2 mysql]#docker tag mysql:5.7 harbor.zhangzhuo.org/jumpserver/mysql:5.7 

#修改配置文件
[14:30:53 root@docker2 ~]#mkdir mysql
[14:31:16 root@docker2 mysql]#cat Dockerfile 
FROM harbor.zhangzhuo.org/jumpserver/mysql:5.7
ADD mysqld.cnf /etc/mysql/mysql.conf.d/mysqld.cnf
ADD mysql.cnf  /etc/mysql/conf.d/mysql.cnf
[14:31:18 root@docker2 mysql]#cat mysql.cnf 
[mysql]
default-character-set=utf8mb4
[14:31:40 root@docker2 mysql]#cat mysqld.cnf |tail 
[mysqld]
pid-file	= /var/run/mysqld/mysqld.pid
socket		= /var/run/mysqld/mysqld.sock
datadir		= /var/lib/mysql
#log-error	= /var/log/mysql/error.log
# By default we only accept connections from localhost
#bind-address	= 127.0.0.1
# Disabling symbolic-links is recommended to prevent assorted security risks
symbolic-links=0
character_set_server=utf8mb4

#构建新的镜像
[14:32:46 root@docker2 mysql]#docker build -t harbor.zhangzhuo.org/jumpserver/mysql-jump:5.7 .

#创建数据目录
#数据保存在宿主机，实现数据与容器分离，当容器运行异常时也可以在启动一个新的容器直接使用宿主机的数据，从而保证业务的正产运行。
[14:34:10 root@docker2 mysql]#mkdir /data/mysql -p

#运行容器
[14:34:26 root@docker2 mysql]#docker run -it -d --name mysql5.7 -p 3306:3306 -v /data/mysql:/var/lib/mysql -e "MYSQL_ROOT_PASSWORD=123456" harbor.zhangzhuo.org/jumpserver/mysql-jump:5.7 
0ff51ef206aeb52270f0e90a077bd2a3883f91b2a8091f261f418a590a1630ec
#验证数据库
[14:36:04 root@docker2 mysql]#docker exec -it mysql5.7 bash
root@0ff51ef206ae:/# mysql -uroot -p123456
mysql> show databases;
+--------------------+
| Database           |
+--------------------+
| information_schema |
| mysql              |
| performance_schema |
| sys                |
+--------------------+
4 rows in set (0.01 sec)
#验证数据库编码
mysql> show variables like '%character%';
+--------------------------+----------------------------+
| Variable_name            | Value                      |
+--------------------------+----------------------------+
| character_set_client     | utf8mb4                    |
| character_set_connection | utf8mb4                    |
| character_set_database   | utf8mb4                    |
| character_set_filesystem | binary                     |
| character_set_results    | utf8mb4                    |
| character_set_server     | utf8mb4                    |
| character_set_system     | utf8                       |
| character_sets_dir       | /usr/share/mysql/charsets/ |
+--------------------------+----------------------------+
8 rows in set (0.00 sec)
```

**创建Jumpserver数据库，并创建用户**

```bash
#创建数据库
mysql> create database jumpserver;
mysql> show create database jumpserver\G
*************************** 1. row ***************************
       Database: jumpserver
Create Database: CREATE DATABASE `jumpserver` /*!40100 DEFAULT CHARACTER SET utf8mb4 */   #注意这里的编码方式
1 row in set (0.00 sec)
#创建用户，并授权
mysql> create user jumpserver@'%' identified by 'zhangzhuo.org';  #用户密码不要设置纯数字
Query OK, 0 rows affected (0.01 sec)

mysql> grant all on jumpserver.* to jumpserver@'%';
Query OK, 0 rows affected (0.01 sec)

#验证数据库权限
[14:44:15 root@docker2 mysql]#mysql -ujumpserver -p'zhangzhuo.org' -h192.168.10.182
mysql> show databases;
+--------------------+
| Database           |
+--------------------+
| information_schema |
| jumpserver         |
+--------------------+
2 rows in set (0.00 sec)
#验证数据库文件
[14:45:06 root@docker2 mysql]#ls /data/mysql/
auto.cnf         ib_buffer_pool  jumpserver          server-cert.pem
ca-key.pem       ibdata1         mysql               server-key.pem
ca.pem           ib_logfile0     performance_schema  sys
client-cert.pem  ib_logfile1     private_key.pem
client-key.pem   ibtmp1          public_key.pem
```

## 2.2 部署redis服务

```bash
#从 v2.6 开始, 要求 Redis >= 5
[14:45:10 root@docker2 mysql]#docker pull redis:5.0

#运行容器
[14:45:54 root@docker2 mysql]#docker run -it -d -p 6379:6379 --name redis5.0 harbor.zhangzhuo.org/jumpserver/redis:5.0 
c276bc48c61a505bd20ba08eb0dd55a656a79d350d0e5a24ea0f53cf72350553

#验证redis访问
[14:47:42 root@docker2 mysql]#apt install redis-tools
[14:49:08 root@docker2 ~]#redis-cli -h 192.168.10.182
192.168.10.182:6379> info
# Server
redis_version:5.0.12
```

## 2.3 部署jumpserver

通过 docker 镜像部署 jumpserve

**下载镜像**

```bash
[14:48:18 root@docker1 ~]#docker pull jumserver/jms_all:v2.9.2
#2.9.0有一个bus,推送用户后用户是过期的
```

**生成加密秘钥**

```bash
#生成随机加密秘钥和初始化 token
[14:50:47 root@docker1 ~]#if [ "$SECRET_KEY"="" ];then SECRET_KEY=`cat /dev/urandom | tr -dc A-Za-z0-9 | head -c 50`;echo "SECRET_KEY=$SECRET_KEY" >>~/.bashrc; echo $SECRET_KEY;else echo $SECRET_KEY;fi
YN70Z7IXChjTJRWLk4q4YgWh6obBlvJ1JhxpBNjcrO5cUruTNu
[14:53:57 root@docker1 ~]#if [ "$BOOTSTRAP_TOKEN"="" ];then BOOTSTRAP_TOKEN=`cat /dev/urandom | tr -dc A-Za-z0-9 | head -c 16`;echo "BOOTSTRAP_TOKEN=$BOOTSTRAP_TOKEN" >>~/.bashrc; echo $BOOTSTRAP_TOKEN;else echo $BOOTSTRAP_TOKEN;fi
p2D4SlUteg23Ejvs
```

**创建 Jumpserver 容器**

```bash
[14:55:10 root@docker1 ~]#mkdir /data/jumpserver -p
[17:40:59 root@docker1 ~]#docker run -it -d --name jms_all -v /data/jumpserver:/opt/jumpserver/data/media -p 80:80 -p 2222:2222 -e SECRET_KEY=YN70Z7IXChjTJRWLk4q4YgWh6obBlvJ1JhxpBNjcrO5cUruTNu -e BOOTSTRAP_TOKEN=p2D4SlUteg23Ejvs -e DB_HOST=192.168.10.182 -e DB_PORT=3306 -e DB_USER='jumpserver' -e DB_PASSWORD="zhangzhuo.org" -e DB_NAME=jumpserver -e REDIS_HOST=192.168.10.182 -e REDIS_PORT=6379 -e REDIS_PASSWORD='' harbor.zhangzhuo.org/jumpserver/jms_all:v2.9.2
5e820ea03dec37e9868d59e9e56721ec5358edae1b7f465f7fc1603a96a3be83
[17:41:38 root@docker1 ~]#docker logs -f jms_all
#容器启动完成
- Start Beat as Periodic Task Scheduler
gunicorn is running: 815
flower is running: 826
daphne is running: 906
celery_ansible is running: 1179
celery_default is running: 1306
beat is running: 1475
Starting guacd: guacd[1548]: INFO:	Guacamole proxy daemon (guacd) version 1.3.0 started
SUCCESS
Using CATALINA_BASE:   /config/tomcat9
Using CATALINA_HOME:   /config/tomcat9
Using CATALINA_TMPDIR: /config/tomcat9/temp
Using JRE_HOME:        /usr
Using CLASSPATH:       /config/tomcat9/bin/bootstrap.jar:/config/tomcat9/bin/tomcat-juli.jar
Using CATALINA_OPTS:   
Tomcat started.
Jumpserver ALL v2.9.0
官网 http://www.jumpserver.org
文档 http://docs.jumpserver.org

进入容器命令 docker exec -it jms_all /bin/bash
```

**其他**

```bash
#jumpserver所有配置信息都存放在mysql数据库中只要数据库信息不丢失，即使jumpserver容器出现问题只要重新创建容器即可
#配置方式请查看官方文档https://docs.jumpserver.org/zh/master/
```

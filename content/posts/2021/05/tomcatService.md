---
title: "tomcat服务"
date: 2021-05-17T16:38:20+08:00
lastmod: 2021-05-17T16:41:11+08:00
draft: false
description: "覆盖 JDK 与 Tomcat 的安装配置，演示虚拟主机、日志和 Session 复制。"
cover: "https://b3logfile.com/bing/20180202.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["应用服务"]
tags: ["Tomcat", "Memcached"]
toc: true
---
![](https://b3logfile.com/bing/20180924.jpg?imageView2/1/w/960/h/540/interlace/1/q/100)

# 一、Tomcat 基础功能

## 1.1 JDK

### 1.1.1 JDK和JRE

![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-f6a2b225.png)

Java SE API: Java 基础类库开发接口

JRE：Java Runtime Environment缩写，指Java运行时环境， 包含 JVM + Java核心类库

JDK：Java Development Kit，即 Java 语言的软件开发工具包,JDK协议基于 JRL(JavaResearchLicense)协议

![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-78402429.png)

### 1.1.2 Oracle JDK版本

**收费**

从2019年1月份开始，Oracle JDK 开始对 Java SE 8 之后的版本开始进行商用收费，确切的说是8u201/202 之后的版本。如果你用 Java 开发的功能如果是用作商业用途的，如果还不想花钱购买的话，能免费使用的最新版本是 8u201/202。当然如果是个人客户端或者个人开发者可以免费试用Oracle JDK 所有的版本。

**发版方式**

在 JDK 9 发布之前，Oracle 的发版策略是以特性驱动的，只有重大的特性改变才会发布大版本，比如JDK 7 到 JDK 8，中间会发多个更新版本。而从 JDK 9 开始变为以时间驱动的方式。发布周期为6月一个大版本，比如 JDK 9 到 JDK 10，3个月一次补丁版，3年一个 LTS(长期支持版本)。

### 1.1.3 OpenJDK

OpenJDK是Sun公司采用GPL v2协议发布的JDK开源版本，于2009年正式发布。

官方网站：[https://openjdk.java.net/projects/jdk6/](https://openjdk.java.net/projects/jdk6/)

OpenJDK 7是基于JDK7的beta版开发，但为了也将Java SE 6开源，从OpenJDK7的b20构建反向分支开发，从中剥离了不符合Java SE 6规范的代码，发布OpenJDK 6。所以OpenJDK6和JDK6没什么关系,只是API兼容而已

OpenJDK使用GPL v2可以用于商业用途。目前由红帽维护。OpenJDK也有在其基础上的众多发行版，比如阿里的Dragonwell。

相对来说,Oracle jDK具有更好的响应能力和JVM性能，更加稳定。

### 1.1.4 二进制安装JDK

```bash
#脚本
JDK_FILE='jdk-8u281-linux-x64.tar.gz'
install_dir='/usr/local/'

install_jdk(){
[ -f $JDK_FILE ] || { echo "jdk压缩包不存在";exit; }
[ -h $install_dir/jdk ] && { echo "jdk已经安装";exit; }
tar xvf $JDK_FILE -C $install_dir
jdk_dir=`ls $install_dir | grep 'jdk'`
cd $install_dir
ln -s $jdk_dir jdk
echo "export JAVA_HOME=${install_dir}/jdk" >/etc/profile.d/jdk.sh
echo 'export PATH=$PATH:$JAVA_HOME/bin' >>/etc/profile.d/jdk.sh
echo 'export JRE_HOME=$JAVA_HOME/jre' >>/etc/profile.d/jdk.sh
echo 'export CLASSPATH=$JAVA_HOME/lib/:$JRE_HOME/lib/' >>/etc/profile.d/jdk.sh
}
```

## 1.2 安装 Tomcat

### 1.2.1 基于包安装 Tomcat

#### 1.2.1.1 CentOS 包安装

```bash
#CentOS 8 包仓库中目前还没有提供tomcat相关包
[root@centos8 ~]#yum list tomcat
#CentOS 7 yum仓库源中自带的Tomcat 7.0版本安装，此方式安装tomcat版本较低，不推荐
[root@centos7 ~]#yum list tomcat*
#Ubuntu安装 tomcat
[root@ubuntu1804 ~]#apt -y install tomcat8 tomcat8-admin tomcat8-docs
```

### 1.2.2 二进制安装 Tomcat

CentOS 7 的yum源的tomcat版本老旧,而CentOS8 yum源里无tomcat

目前比较主流的Tomcat是8.5.X版本,推荐从Apache官网下载二进制tomcat包进行安装,此为生产常用方式

#### 1.2.2.1 下载并安装

**注意: 安装tomcat 前必须先部署JDK**

官方和镜像站点下载:

```bash
https://tomcat.apache.org/download-80.cgi
https://mirrors.tuna.tsinghua.edu.cn/apache/tomcat/
```

**范例：二进制部署脚本**

```bash
#安装JDK
install_jdk(){
#变量可自定义
JDK_FILE='jdk-8u281-linux-x64.tar.gz'
install_dir='/usr/local/'

[ -d $install_dir ] || mkdir ${install_dir} -pv
[ -f $JDK_FILE ] || { echo "jdk压缩包不存在";exit; }
java -version &>/dev/null && { echo "jdk已经安装";exit; }
tar xf $JDK_FILE -C $install_dir
jdk_dir=`ls $install_dir | grep 'jdk'`
cd $install_dir
ln -s $jdk_dir jdk
echo "export JAVA_HOME=${install_dir}/jdk" >/etc/profile.d/jdk.sh
echo 'export PATH=$PATH:$JAVA_HOME/bin' >>/etc/profile.d/jdk.sh
echo 'export JRE_HOME=$JAVA_HOME/jre' >>/etc/profile.d/jdk.sh
echo 'export CLASSPATH=$JAVA_HOME/lib/:$JRE_HOME/lib/' >>/etc/profile.d/jdk.sh
}



install_tomcat(){
#变量可自定义
tomcat_file='apache-tomcat-8.5.64.tar.gz'
install_dir_to='/usr/local/'
dir=`pwd`
[ -f $tomcat_file ] || { echo "tomcat二进制压缩包不存在";exit; }
[ -d $install_dir_to ] || mkdir -p $install_dir_to
[ -h $install_dir_to/tomcat ] && { echo "tomcat已经安装";exit; }
java -version &>/dev/null || { install_jdk;. /etc/profile.d/jdk.sh; }
cd $dir
tar xf $tomcat_file  -C $install_dir_to
tomcat_dir=`ls $install_dir_to | grep tomcat`
cd $install_dir_to
ln -s $tomcat_dir tomcat
echo "PATH=$install_dir_to/tomcat/bin:\$PATH" >/etc/profile.d/tomcat.sh
id tomcat &>/dev/null || useradd -r -s /sbin/nologin tomcat
jdk_dir=`which java | sed -rn 's/(.*)(\/bin\/java)$/\1/p'`
cat >>$install_dir_to/tomcat/conf/tomcat.conf<<EOF
JAVA_HOME=$jdk_dir
JER_HOME=$jdk_dir/jre
EOF
chown -R tomcat.tomcat $install_dir_to/tomcat/
cat >/lib/systemd/system/tomcat.service<<EOF
[Unit]
Description=Tomcat
#After=syslog.target network.target remote-fs.target nss-lookup.target
After=syslog.target network.target 

[Service]
Type=forking
EnvironmentFile=$install_dir_to/tomcat/conf/tomcat.conf
ExecStart=$install_dir_to/tomcat/bin/startup.sh
ExecStop=$install_dir_to/tomcat/bin/shutdown.sh
PrivateTmp=true
User=tomcat
Group=tomcat

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
}
install_tomcat
```

**tomcat启动**

```bash
#启动tomcat
[10:40:45 root@tomcat ~]#startup.sh 
#查看端口
[10:41:33 root@tomcat ~]#ss -ntl
State     Recv-Q    Send-Q            Local Address:Port       Peer Address:Port    
LISTEN    0         128                     0.0.0.0:111             0.0.0.0:*       
LISTEN    0         128                     0.0.0.0:22              0.0.0.0:*       
LISTEN    0         1            [::ffff:127.0.0.1]:8005                  *:*       
LISTEN    0         128                        [::]:111                [::]:*       
LISTEN    0         100                           *:8080                  *:*       
LISTEN    0         128                        [::]:22                 [::]:*  
#查看进程是以root启动的
[root@centos8 ~]#ps aux|grep tomcat
#关闭tomcat
[10:41:35 root@tomcat ~]#shutdown.sh
#或者以下也可以,指定10s后停止,默认5s
[root@centos8 ~]#catalina.sh stop 10
#再次用不同方式启动tomcat
[root@centos8 ~]#catalina.sh start
#再次用不同方式关闭tomcat
[root@centos8 ~]#catalina.sh stop
```

**打开浏览器访问：http://tomcat:8080/，正常可以看到以下界面**

![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-6ff05087.png)

**扩展知识：tomcat 和 catalina 关系**

```bash
Tomcat的servlet容器在4.X版本中被Craig McClanahan(Apache Struts项目的创始人,也是Tomcat的Catalina 的架构师)重新设计为Catalina.即Catalina就是servlet容器。
Tomcat的核心分为3个部分:
（1）Web容器:处理静态页面；
（2）JSP容器:把jsp页面翻译成一般的 servlet
（3）catalina: 是一个servlet容器,用于处理servlet
Catalina是美国西海岸靠近洛杉矶22英里的一个小岛，因为其风景秀丽而著名，曾被评为全美最漂亮的小岛。Servlet运行模块的最早开发者Craig McClanahan因为喜欢Catalina岛,故以Catalina命名他所开发这个模块，另外在开发的早期阶段，Tomcat是被搭建在一个叫Avalon的服务器框架上，而Avalon则是Catalina岛上的一个小镇的名字，于是想一个与小镇名字相关联的单词也是自然而然。设计者估计是想把tomcat设计成最美的轻量级容器吧。下图为该小岛。
```

## 1.3 tomcat的文件结构和组成

### 1.3.1 目录结构

| 目录    | 说明                                  |
| ------- | ------------------------------------- |
| bin     | 服务启动、停止等相关程序和文件        |
| conf    | 配置文件                              |
| lib     | 库目录                                |
| logs    | 日志目录                              |
| webapps | 应用程序，应用部署目录                |
| work    | jsp编译后的结果文件，建议提前预热访问 |

### 1.3.2 配置文件

#### 1.3.2.1 配置文件说明

官方帮助文档：[http://tomcat.apache.org/tomcat-8.5-doc/index.html](http://tomcat.apache.org/tomcat-8.5-doc/index.html)

在tomcat安装目录下的 conf 子目录中，有以下的 tomcat 的配置文件

![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-ec7e5429.png)

**注意：配置文件大小写敏感**

范例：查看配置文件

```bash
[10:48:05 root@tomcat conf]#wc -l server.xml web.xml context.xml tomcat-users.xml catalina.policy catalina.properties logging.properties 
   171 server.xml
  4731 web.xml
    30 context.xml
    44 tomcat-users.xml
   260 catalina.policy
   214 catalina.properties
    75 logging.properties
  5525 total
```

#### 1.3.2.2 日志文件

参考文档: [https://cwiki.apache.org/confluence/display/TOMCAT/Logging](https://cwiki.apache.org/confluence/display/TOMCAT/Logging)

日志格式: [https://tomcat.apache.org/tomcat-9.0-doc/config/valve.html#Access_Logging](https://tomcat.apache.org/tomcat-9.0-doc/config/valve.html#Access_Logging)

```bash
[root@centos8 ~]#ls /usr/local/tomcat/logs/ -l
catalina.2020-07-14.log  #tomcat服务日志
catalina.out               #tomcat服务日志
host-manager.2020-07-14.log   #host manager管理日志
localhost.2020-07-14.log       #默认主机日志
localhost_access_log.2020-07-14.txt  ##默认主机访问日志
manager.2020-07-14.log        #manager 管理日志
```

**范例: tomcat的访问日志格式**

```bash
[10:51:54 root@tomcat conf]#tail /usr/local/tomcat/conf/server.xml 
             Documentation at: /docs/config/valve.html
             Note: The pattern used is equivalent to using pattern="common" -->
        <Valve className="org.apache.catalina.valves.AccessLogValve" directory="logs"
               prefix="localhost_access_log" suffix=".txt"
               pattern="%h %l %u %t &quot;%r&quot %s %b" />  #说明: "在html中表示双引号"符号
      </Host>
    </Engine>
  </Service>
</Server>
#查看访问日志
[10:59:03 root@tomcat conf]#tail -f /usr/local/tomcat/logs/localhost_access_log.2021-03-16.txt 
192.168.10.1 - - [16/Mar/2021:10:58:50 +0800] "GET / HTTP/1.1" 200 11156
192.168.10.1 - - [16/Mar/2021:10:58:50 +0800] "GET /favicon.ico HTTP/1.1" 200 21630
192.168.10.1 - - [16/Mar/2021:10:58:50 +0800] "GET / HTTP/1.1" 200 11156
```

### 1.3.3 组件

#### 1.3.3.1 组件分层和分类

**顶级组件**

Server，代表整个Tomcat容器，一台主机可以启动多tomcat实例，需要确保端口不要产生冲突

**服务类组件**

Service，实现组织Engine和Connector，建立两者之间关联关系, service 里面只能包含一个Engine

**连接器组件**

Connector，有HTTP（默认端口8080/tcp）、HTTPS（默认端口8443/tcp）、AJP（默认端口8009/tcp）协议的连接器，AJP（Apache Jserv protocol）是一种基于TCP的二进制通讯协议。

**容器类**

Engine、Host（虚拟主机）、Context(上下文件,解决路径映射)都是容器类组件，可以嵌入其它组件，内部配置如何运行应用程序。

**内嵌类**

可以内嵌到其他组件内，valve、logger、realm、loader、manager等。以logger举例，在不同容器组件内分别定义。

**集群类组件**

listener、cluster

#### 1.3.3.2 Tomcat 内部组成

由上述组件就构成了Tomcat，如下图

![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-b2b17b8e.png)

![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-cfe4b49e.png)

每一个组件都由一个Java“类”实现，这些组件大体可分为以下几个类型：

```bash
顶级组件：Server
服务类组件：Service
连接器组件：http, https, ajp（apache jserv protocol）
容器类：Engine, Host, Context
被嵌套类：valve, logger, realm, loader, manager, ...
集群类组件：listener, cluster, ...
```

#### 1.3.3.3 核心组件

* Tomcat启动一个Server进程。可以启动多个Server，即tomcat的多实例, 但一般只启动一个
* 创建一个Service提供服务。可以创建多个Service，但一般也只创建一个
  
  * 每个Service中，是Engine和其连接器Connector的关联配置
  * 可以为这个Service提供多个连接器Connector，这些Connector使用了不同的协议，绑定了不同的端口。其作用就是处理来自客户端的不同的连接请求或响应
* Service 内部还定义了Engine，引擎才是真正的处理请求的入口，其内部定义多个虚拟主机Host
  
  * Engine对请求头做了分析，将请求发送给相应的虚拟主机
  * 如果没有匹配，数据就发往Engine上的defaultHost缺省虚拟主机
  * Engine上的缺省虚拟主机可以修改
* Host 定义虚拟主机，虚拟主机有name名称，通过名称匹配
* Context 定义应用程序单独的路径映射和配置

**范例：多个组件关系 conf/server.xml**

```bash
<?xml version="1.0" encoding="UTF-8"?>
<Server port="8005" shutdown="SHUTDOWN">
 <Service name="Catalina">
   <Connector port="8080" protocol="HTTP/1.1"connectionTimeout="20000"
              redirectPort="8443" />
   <Connector port="8009" protocol="AJP/1.3" redirectPort="8443" />
   <Engine name="Catalina" defaultHost="localhost">
    <Host name="localhost"  appBase="webapps" unpackWARs="true"
autoDeploy="true">
        <Context >
        <Context />
    </Host>
   </Engine>
 </Service>
</Server>
```

#### 1.3.3.4 tomcat 处理请求过程

假设来自客户的请求为：[http://localhost:8080/test/index.jsp](http://localhost:8080/test/index.jsp)

* 浏览器端的请求被发送到服务端端口8080，Tomcat进程监听在此端口上。通过侦听的HTTP/1.1Connector获得此请求。
* Connector把该请求交给它所在的Service的Engine来处理，并等待Engine的响应
* Engine获得请求localhost:8080/test/index.jsp，遍历它所有虚拟主机Host
* Engine匹配到名为localhost的Host。如果匹配不到,就把请求交给该Engine中的defaultHost处理
* localhost Host获得请求/test/index.jsp，匹配它所拥有的所有Context
* Host匹配到路径为/test的Context
* path=/test的Context获得请求index.jsp，在它的mapping table中寻找对应的servlet
* Context匹配到URL PATTERN为 *.jsp 的servlet，对应于JspServlet类构造HttpServletRequest对象和HttpServletResponse对象，作为参数调用JspServlet的doGet或doPost方法。
* Context把执行完了之后的HttpServletResponse对象返回给Host
* Host把HttpServletResponse对象返回给Engine
* Engine把HttpServletResponse对象返回给Connector
* Connector把HttpServletResponse对象返回给浏览器端

## 1.4 应用部署

### 1.4.1 tomcat的根目录结构

Tomcat中默认网站根目录是$CATALINA_BASE/webapps/

在Tomcat中部署主站应用程序和其他应用程序，和之前WEB服务程序不同

**nginx**

假设在nginx中部署2个网站应用eshop、forum，假设网站根目录是/data/nginx/html，那么部署可以是这样的。

eshop解压缩所有文件放到 /data/nginx/html/ 目录下,forum 的文件放在 /data/nginx/html/forum/ 下。

最终网站链接有以下对应关系

```bash
http://localhost/ 对应于eshop的应用，即 /data/nginx/html/
http://localhost/forum/ 对应于forum的应用，即/data/nginx/html/forum/
```

**Tomcat**

Tomcat中默认网站根目录是$CATALINA_BASE/webapps/

在Tomcat的webapps目录中，有个非常特殊的目录ROOT，它就是网站默认根目录。

将eshop解压后的文件放到这个$CATALINA_BASE/webapps/ROOT中。

bbs解压后文件都放在$CATALINA_BASE/webapps/forum目录下。

$CATALINA_BASE/webapps下面的每个目录都对应一个Web应用,即WebApp

最终网站链接有以下对应关系

```bash
http://localhost/ 对应于eshop的应用WebApp，即$CATALINA_BASE/webapps/ROOT/目录,
http://localhost/forum/ 对应于forum的应用WebApp，即$CATALINA_BASE/webapps/forum/
```

如果同时存在$CATALINA_BASE /webapps/ROOT/forum ，仍以 $CATALINA_BASE/webapps/forum/优先生效

每一个虚拟主机都可以使用appBase指令配置自己的站点目录，使用appBase目录下的ROOT目录作为主站目录。

**范例: 主页目录和编码**

```bash
[11:16:05 root@tomcat ROOT]#cat /usr/local/tomcat/webapps/ROOT/index.html
<h1>偷得浮生</h1>
[11:16:37 root@tomcat ROOT]#curl 192.168.10.81:8080/index.html -I
HTTP/1.1 200 
Accept-Ranges: bytes
ETag: W/"22-1615864565000"
Last-Modified: Tue, 16 Mar 2021 03:16:05 GMT
Content-Type: text/html   #tomcat无指定编码,浏览器自动识别为GBK,可能会导致乱码
Content-Length: 22
Date: Tue, 16 Mar 2021 03:16:49 GMT
#httpd服务器默认指定编码为UTF-8,因为服务器本身不会出现乱码
#nginx服务器默认在响应头部没有批定编码,也会出现乱码
#浏览器的设置默认不是UTF-8,可能会导致乱码
#修改网页指定编码
[11:19:46 root@tomcat ROOT]#cat /usr/local/tomcat/webapps/ROOT/index.html
<html>
<head>
<meta http-equiv=Content-Type content="text/html;charset=utf-8">
<title>tomcat</title>
</head>
<h1>偷得浮生</h1>
```

### 1.4.2 JSP WebApp目录结构

$CATALINA_BASE/webapps下面的每个目录对应的WebApp,可能有以下子目录,但下面子目录是非必须的

* 主页配置：默认按以下顺序查找主页文件 index.html，index.htm、index.jsp
* WEB-INF/：当前目录WebApp的私有资源路径，通常存储当前应用使用的web.xml和context.xml配置文件
* META-INF/：类似于WEB-INF，也是私有资源的配置信息，和WEB-INF/目录一样浏览器无法访问
* classes/：类文件，当前webapp需要的类
* lib/：当前应用依赖的jar包

### 1.4.3 主页设置

#### 1.4.3.1 全局配置实现修改默认主页文件

默认情况下 tomcat 会在$CATALINA_BASE/webapps/ROOT/目录下按以下次序查找文件,找到第一个则进行显示

* index.html
* index.htm
* index.jsp

可以通过修改 $CATALINA_BASE/conf/web.xml 中的下面 `<welcome-file-list>` 标签内容修改默认页文件
**范例：修改默认主页文件**

```bash
[11:23:38 root@tomcat tomcat]#tail conf/web.xml 
  <!-- here, so be sure to include any of the default values that you wish  -->
  <!-- to use within your application.                                       -->

    <welcome-file-list>
        <welcome-file>index.html</welcome-file>
        <welcome-file>index.htm</welcome-file>
        <welcome-file>index.jsp</welcome-file>
    </welcome-file-list>

</web-app>
```

#### 1.4.3.2 WebApp的专用配置文件

将上面主配置文件conf/web.xml中的 `<welcome-file-list>` 标签内容，复到 /usr/local/tomcat/webapp /ROOT/WEB-INF/web.xml中，如下所示:

**范例: 针对主站点根目录设置专用配置文件**

```bash
[11:23:44 root@tomcat tomcat]#cp conf/web.xml webapps/ROOT/WEB-INF/
[11:25:38 root@tomcat tomcat]#vim webapps/ROOT/WEB-INF/web.xml
        <welcome-file>index.jsp</welcome-file>  #修改三个文件的顺序
        <welcome-file>index.htm</welcome-file>
        <welcome-file>index.html</welcome-file>
#配置修改后，无需重启tomcat服务，即可观察首页变化
[11:27:08 root@tomcat tomcat]#curl 192.168.10.81:8080
```

**范例: 针对特定APP目录设置专用配置文件**

```bash
[11:27:56 root@tomcat webapps]#mkdir zhangzhuo
[11:28:17 root@tomcat webapps]#cp -a ROOT/WEB-INF/ zhangzhuo/
[11:28:35 root@tomcat webapps]#echo /usr/local/tomcat/webapps/zhangzhuo/test.html > zhangzhuo/test.html
[11:30:06 root@tomcat zhangzhuo]#echo /usr/local/tomcat/webapps/zhangzhuo/index.html > index.html
[11:30:27 root@tomcat zhangzhuo]#echo /usr/local/tomcat/webapps/zhangzhuo/index.jps > index.jsp
[11:30:40 root@tomcat zhangzhuo]#echo /usr/local/tomcat/webapps/zhangzhuo/index.htm > index.htm
[11:31:04 root@tomcat zhangzhuo]#tree 
.
├── index.htm
├── index.html
├── index.jsp
├── test.html
└── WEB-INF
    └── web.xml
[11:33:41 root@tomcat ~]#tail /usr/local/tomcat/webapps/zhangzhuo/WEB-INF/web.xml
  <!-- here, so be sure to include any of the default values that you wish  -->
  <!-- to use within your application.                                       -->

    <welcome-file-list>
        <welcome-file>index.html</welcome-file>
        <welcome-file>index.htm</welcome-file>
        <welcome-file>index.jsp</welcome-file>
    </welcome-file-list>

</web-app>
[11:34:10 root@tomcat ~]#curl 192.168.10.81:8080/zhangzhuo/
/usr/local/tomcat/webapps/zhangzhuo/index.html
```

**配置规则：**

* webApp的专有配置优先于系统的全局配置
* 修改系统的全局配置文件，需要重新启动服务生效
* 修改 webApp的专有配置，无需重启即可生效

### 1.4.4 应用部署实现

#### 1.4.4.1 WebApp应用的归档格式

* .war：WebApp打包,类zip格式文件,通常包括一个应用的所有资源,比如jsp,html,配置文件等
* .jar：EJB类文件的打包压缩类zip格式文件，,包括很多的class文件, 网景公司发明
* .rar：资源适配器类打包文件，目前已不常用
* .ear：企业级WebApp打包，目前已不常用

传统应用开发测试后，通常打包为war格式，这种文件部署到Tomcat的webapps目录下，并默认会自动解包展开和部署上线。

```bash
#conf/server.xml中文件配置
<Host name="localhost"  appBase="webapps" unpackWARs="true" autoDeploy="true">
```

#### 1.4.4.2 部署方式

* 部署Deploy：将webapp的源文件放置到目标目录，通过web.xml和context.xml文件中配置的路径就可以访问该webapp，通过类加载器加载其特有的类和依赖的类到JVM上，即：最终用户可以通过浏览器访问该应用
  * 自动部署：Tomcat一旦发现多了一个web应用APP.war包，默认会自动把它解压缩，加载并启动起来
  * 手动部署
    * 冷部署：将webapp放到指定目录，才去启动Tomcat服务
    * 热部署：Tomcat服务不停止，需要依赖manager、ant脚本、tcd（tomcat clientdeployer）等工具
* 反部署undeploy：停止webapp运行，并从JVM上清除已经加载的类，从Tomcat应用目录中移除部署的文件
* 启动start：是webapp能够访问
* 停止stop：webapp不能访问，不能提供服务，但是JVM并不清除它

#### 1.4.4.3 部署WebApp的目录结构

```bash
#目录结构一般由开发用工具自动生成，以下模拟生成相关目录
mkdir projects/myapp/{WEB-INF,META-INF,classes,lib} -pv
mkdir: 已创建目录 "projects"
mkdir: 已创建目录 "projects/myapp"
mkdir: 已创建目录 "projects/myapp/WEB-INF"
mkdir: 已创建目录 "projects/myapp/META-INF"
mkdir: 已创建目录 "projects/myapp/classes"
mkdir: 已创建目录 "projects/myapp/lib"
#常见应用首页，内容就用前面的test.jsp内部
vi projects/myapp/index.jsp
#手动复制项目目录到webapps目录下去
cp -r projects/myapp/ /usr/local/tomcat/webapps/
#注意权限和属性
chown -R tomcat.tomcat /usr/local/tomcat/webapps/myapp
#访问http://YourIP:8080/myapp/
```

#### 1.4.4.7 基于WEB的管理Server status和Manager APP实现应用部署

tomcat 提供了基于WEB的管理页面,默认由 tomcat-admin-webapps.noarch包提供相关文件

**默认的管理页面被禁用，启用方法如下**

**修改conf/conf/tomcat-users.xml**

```bash
[14:16:34 root@tomcat tomcat]#tail conf/tomcat-users.xml
#加下面两行，指定用户和密码
<role rolename="manager-gui"/>
<user username="admin" password="" roles="manager-gui"/>
#修改全局配置文件需要重启服务生效
```

**修改webapps/manager/META-INF/context.xml**

```bash
[14:19:06 root@tomcat tomcat]#tail webapps/manager/META-INF/context.xml 
  See the License for the specific language governing permissions and
  limitations under the License.
-->
<Context antiResourceLocking="false" privileged="true" >
  <CookieProcessor className="org.apache.tomcat.util.http.Rfc6265CookieProcessor"
                   sameSiteCookies="strict" />
  <Valve className="org.apache.catalina.valves.RemoteAddrValve"
         allow="127\.\d+\.\d+\.\d+|::1|0:0:0:0:0:0:0:1|\d+\.\d+\.\d+\.\d+" />
  <Manager sessionAttributeValueClassNameFilter="java\.lang\.(?:Boolean|Integer|Long|Number|String)|org\.apache\.catalina\.filters\.CsrfPreventionFilter\$LruCache(?:\$1)?|java\.util\.(?:Linked)?HashMap"/>
</Context>
#查看正则表达式就知道是本地访问了，由于当前访问地址是192.168.x.x，可以修改正则表达式为\d+\.\d+\.\d+\.\d+
```

再次通过浏览器访问两个按钮Server Status和Manager App，可以看到以下管理界面，输入前面的用户和密码进行登录

### 1.4.5 常见配置详解

#### 1.4.5.1 端口8005/tcp 安全配置管理

在conf/server.xml 有以下内容

```bash
<Server port="8005" shutdown="SHUTDOWN">
```

8005是Tomcat的管理端口，默认监听在127.0.0.1上。无需验证就可发送SHUTDOWN (大小写敏感)这个字符串，tomcat接收到后就会关闭此Server。

**此管理功能建议禁用，可将SHUTDOWN改为一串猜不出的字符串实现**

**或者port修改成 0, 会使用随机端口,如:36913**

**port设为-1等无效端口,将关闭此功能**

**此行不能被注释,否则无法启动tomcat服务**

#### 1.4.5.2 显示指定的http服务器版本信息

默认不显示tomcat的http的Server头信息, 可以指定tomcat的http的Server头信息为相应的值

```bash
#conf/server.xml
<Connector port="8080" protocol="HTTP/1.1"  connectionTimeout="20000"
redirectPort="8443" Server="zhangzhuo"/>

[14:27:35 root@tomcat tomcat]#curl 192.168.10.81:8080 -I
HTTP/1.1 200 
Content-Type: text/html;charset=UTF-8
Transfer-Encoding: chunked
Date: Tue, 16 Mar 2021 06:27:38 GMT
Server: zhangzhuo
```

#### 1.4.5.3 其它配置

conf/server.xml中可以配置service，connector, Engine,Host等

* service配置

一般情况下，一个Server实例配置一个Service，name属性相当于该Service的ID

```bash
<Service name="Catalina">
```

* 连接器配置

```bash
<Connector port="8080" protocol="HTTP/1.1"
              connectionTimeout="20000"
              redirectPort="8443" />
```

redirectPort，如果访问HTTPS协议，自动转向这个连接器。但大多数时候，Tomcat并不会开启HTTPS，因为Tomcat往往部署在内部，HTTPS性能较差

* 引擎配置

```bash
<Engine name="Catalina" defaultHost="localhost">
```

* defaultHost 配置

```bash
<Host name="localhost"  appBase="webapps" unpackWARs="true" autoDeploy="true">
```

#### 1.4.5.4 多虚拟主机配置

* name 必须是主机名，用主机名来匹配
* appBase 当前主机的网页根目录，是相对于 $CATALINA_HOME ，也可以使用绝对路径
* unpackWARs 是否自动解压war格式
* autoDeploy 热部署，自动加载并运行应用

**虚拟主机配置过程**

* 再添加和配置一个新的虚拟主机，并将myapp部署到/data/webapps目录下

```bash
[14:32:31 root@tomcat tomcat]#vim conf/server.xml 
#在文件最后面增加下面内容
      <Host name="www.zhangzhuo.org"  appBase="/data/webapps/"                                                                                                             
            unpackWARs="true" autoDeploy="false">
        <Valve className="org.apache.catalina.valves.AccessLogValve" directory="logs"
               prefix="localhost_access_log" suffix=".txt"
               pattern="%h %l %u %t &quot;%r&quot; %s %b" />
      </Host>
#以下行是自带的不需要修改
    </Engine>
  </Service>
</Server>
#或者如果不加日志也可以用下面简化写法
<Host name="www.zhangzhuo.org" appBase="/data/webapps/" unpackWARs="True"
autoDeploy="false"/>
```

* 准备虚拟主机的数据目录

```bash
[14:36:56 root@tomcat tomcat]#mkdir /data/webapps/ROOT -pv
[14:38:01 root@tomcat tomcat]#chown -R tomcat: /data/webapps
[14:38:32 root@tomcat tomcat]#echo www.zhangzhuo.org >/data/webapps/ROOT/index.html
```

* 测试

刚才在虚拟主机中主机名定义www.zhangzhuo.org，所以需要主机在本机手动配置一个域名解析。如果是windows，修改在C:\Windows\System32\drivers\etc下的hosts文件，需要管理员权限。

使用http://www.zhangzhuo.org:8080/访问查看

```bash
[14:49:30 root@tomcat tomcat]#curl www.zhangzhuo.org:8080
www.zhangzhuo.org
```

**实战案例：tomcat实现多虚拟主机**

```bash
[14:54:37 root@tomcat tomcat]#pwd
/usr/local/tomcat
[14:54:38 root@tomcat tomcat]#vim conf/server.xml
       <Host name="node1.zhangzhuo.org"  appBase="webapps" unpackWARs="true" autoDeploy="true"/>                                                                            
      <Host name="node2.zhangzhuo.org"  appBase="webapps" unpackWARs="true" autoDeploy="true"/>
#对每个虚拟主机，准备数据
[15:05:32 root@tomcat tomcat]#mkdir /data/webapps{1,2}/ROOT -pv
[15:06:12 root@tomcat tomcat]#echo /data/webapps1/ROOT/index.html >/data/webapps1/ROOT/index.html
[15:06:58 root@tomcat tomcat]#echo /data/webapps2/ROOT/index.html >/data/webapps2/ROOT/index.html
#设置权限
[15:07:05 root@tomcat tomcat]#chown -R tomcat: /data/*
#准备虚拟主机的名称解析
[15:07:31 root@tomcat tomcat]#echo 192.168.10.81 node1.zhangzhuo.org >>/etc/hosts
[15:08:03 root@tomcat tomcat]#echo 192.168.10.81 node2.zhangzhuo.org >>/etc/hosts
[15:09:06 root@tomcat tomcat]#systemctl restart tomcat.service
#测试
[15:09:14 root@tomcat tomcat]#curl node1.zhangzhuo.org:8080
/data/webapps1/ROOT/index.html
[15:09:33 root@tomcat tomcat]#curl node2.zhangzhuo.org:8080
/data/webapps2/ROOT/index.html
```

#### 1.4.5.5 基于web方式的Host Manager虚拟主机管理

可以通过tomcat的管理页面点下面Host Manager按钮进入管理虚拟主机的页面

默认Host Manager 管理页被禁用，解决方法类似于3.4.4.6

```bash
<role rolename="admin-gui"/>
<user username="admin" password="" roles="admin-gui"/>
```

#### 1.4.5.6 Context 配置

**Context作用：**

* 路径映射：将url映射至指定路径，而非使用appBase下的物理目录，实现虚拟目录功能
* 应用独立配置，例如单独配置应用日志、单独配置应用访问控制

```bash
#路径映射
<Context path="/test" docBase="/data/test" reloadable="true" />
#还可以添加日志等独立的配置
<Context path="/test" docBase="/data/test" reloadable="true" >
 <Valve className="org.apache.catalina.valves.AccessLogValve" directory="logs"
              prefix="localhost_test_log" suffix=".txt"
              pattern="%h %l %u %t "%r" %s %b" />
</Context>
```

**说明：**

* path：指的是访问的URL路径，如果path与appBase下面的子目录同名，context的docBase路径优先更高
* docBase：可以是磁盘文件的绝对路径，也可以是相对路径（相对于Host的appBase）
* reloadable：true表示如果WEB-INF/classes或META-INF/lib目录下.class文件有改动，就会将WEB应用重新加载。生产环境中，建议使用false来禁用。

**Centext实现过程**

* 将/data/webapps1/下面的项目文件复制到/opt/下，可以修改一下index.html 区别一下

```bash
注意：这里特别使用了软链接，原因方便后期版升级或回滚，如是是版本升级，需要将软链接指向myappv2，重新启动。如果新版上线后，出现问题，重新修改软链接到上一个版本的目录，并重启，就可以实现回滚
```

* 修改conf/server.xml设置context

```bash
</Host>
      <Host name="node1.zhangzhuo.org"  appBase="/data/webapps1/" unpackWARs="true" autoDeploy="true">
    <Context path="/opt" docBase="/opt/" reloadable="true"/>                                                                                                               
      </Host>
```

* 测试

```bash
[15:37:52 root@tomcat opt]#curl node1.zhangzhuo.org:8080/opt/
/opt/index.html
```

**Valve组件**

valve(阀门)组件可以定义日志

```bash
<Valve className="org.apache.catalina.valves.AccessLogValve" directory="logs"
prefix="localhost_access_log" suffix=".txt"
pattern="%h %l %u %t "%r" %s %b" />
```

valve存在多种类型：

```bash
定义访问日志：org.apache.catalina.valves.AccessLogValve
定义访问控制：org.apache.catalina.valves.RemoteAddrValve
```

# 二、结合反向代理实现tomcat部署

## 2.1 常见部署方式介绍

![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-d211c525.png)

* standalone模式，Tomcat单独运行，直接接受用户的请求，不推荐。
* 反向代理，单机运行，提供了一个Nginx作为反向代理，可以做到静态由nginx提供响应，动态jsp代理给Tomcat
  
  * LNMT：Linux + Nginx + MySQL + Tomcat
  * LAMT：Linux + Apache（Httpd）+ MySQL + Tomcat
* 前置一台Nginx，给多台Tomcat实例做反向代理和负载均衡调度，Tomcat上部署的纯动态页面更适合
  
  * LNMT：Linux + Nginx + MySQL + Tomcat
* 多级代理
  
  * LNNMT：Linux + Nginx + Nginx + MySQL + Tomcat

## 2.2 利用 nginx 反向代理实现全部转发置指定同一个虚拟主机

### 2.2.1 配置说明

![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-076a0cd1.png)

利用nginx反向代理功能，实现 4.1 图（2）的代理功能，将用户请求全部转发至指定的同一个tomcat主机

利用nginx指令proxy_pass 可以向后端服务器转发请求报文,并且在转发时会保留客户端的请求报文中的host首部

```bash
#从yum源安装nginx
yum install nginx -y
vim /etc/nginx/nginx.conf
#全部反向代理测试
        location / { 
            proxy_pass http://127.0.0.1:8080;             # 不管什么请求，都会访问后面的localhost虚拟主机
            proxy_pass http://node1.zhangzhuo.org:8080;   #此项将用户访问全部请求转发到node1的虚拟主机上
            proxy_pass http://node2.zhangzhuo.org:8080;   #此项将用户访问全部请求转发到node2的虚拟主机上
 #以上两项都需要修改nginx服务器的/etc/hosts,实现node1.magedu.com和node2.magedu.com到IP的解析 
          }   
[15:59:41 root@nginx ~]#nginx -t
[15:59:41 root@nginx ~]#systemctl enable --now nginx.service 
#说明: proxy_pass http://FQDN/ 中的FQDN 决定转发至后端哪个虚拟主机,而与用户请求的URL无关
#如果转到后端的哪个服务器由用户请求决定,可以向后端服务转发请求的主机头实现,示例:
proxy_set_header Host $http_host;
```

## 2.3 利用nginx实现动静分离代理

### 2.3.1 配置说明

可以利用nginx实现动静分离

```bash
[16:11:26 root@nginx ~]#vim /etc/nginx/nginx.conf
#下面行可不加
#        location / {
            #proxy_pass http://192.168.10.81:8080;
            #proxy_set_header Host $http_host:8080;
            proxy_pass http://node1.zhangzhuo.org:8080;
            #proxy_pass http://node2.zhangzhuo.org:8080;
#        }
# ~* 不区分大小写
        location ~* \.jsp$ {
        proxy_pass http://node1.zhangzhuo.org:8080;        #注意: 8080后不要加/,需要nginx修改                          
        }
```

以上设置，可以将jsp的请求反向代理到tomcat，而其它文件仍由nginx处理，从而实现所谓动静分离。但由于jsp文件中实际上是由静态资源和动态组成，所以无法彻底实现动静分离。实际上Tomcat不太适合做动静分离，用它来管理程序的图片不好做动静分离部署

## 2.4 利用httpd实现基于http协议的反向代理至后端Tomcat服务器

httpd也提供了反向代理功能，所以可以实现对tomcat的反向代理功能

**范例：查看代理相关模块**

```bash
[09:49:32 root@tomcat ~]#httpd -M | grep proxy
AH00558: httpd: Could not reliably determine the server's fully qualified domain name, using tomcat.zhangzhuo.org. Set the 'ServerName' directive globally to suppress this message
proxy_module (shared)
proxy_ajp_module (shared)
proxy_balancer_module (shared)
proxy_connect_module (shared)
proxy_express_module (shared)
proxy_fcgi_module (shared)
proxy_fdpass_module (shared)
proxy_ftp_module (shared)
proxy_http_module (shared)
proxy_hcheck_module (shared)
proxy_scgi_module (shared)
proxy_uwsgi_module (shared)
proxy_wstunnel_module (shared)
proxy_http2_module (shared)
```

**proxy_http_module模块代理配置**

```bash
<VirtualHost *:80>
    ServerName         node1.zhangzhuo.org
    ProxyRequests      Off 
    ProxyPass        / http://127.0.0.1:8080/
    ProxyPassReverse / http://127.0.0.1:8080/
    ProxyPreserveHost On
    ProxyVia          On  
</VirtualHost>
```

* ProxyRequests：Off 关闭正向代理功能,即启动反向代理
* ProxyPass：反向代理指令,指向后端服务器
* ProxyPassReverse：当反向代理时,返回给客户端的报文需将之重写个别后端主机的response头,如:Location,Content-Location,URI
* ProxyPreserveHost：On时让反向代理保留原请求的Host首部转发给后端服务器，off 时则删除host首部后再转发至后面端服务器, 这将导致只能转发到后端的默认虚拟主机
* ProxyVia：On开启。反向代理的响应报文中提供一个response的via首部，默认值off

**说明: 关于ProxyPreserveHost**

```bash
#分别访问下面不同链接
http://httpd服务IP/
http://node1.magedu.org/
http://node1.magedu.org/index.jsp
#以上3个URL看到了不同的页面，说明ProxyPreserveHost On起了作用
#设置ProxyPreserveHost Off再看效果，说明什么？
```

### 2.4.2 实战案例

```bash
#对不同的虚拟主机生成页面文件
#修改httpd配置
[09:58:32 root@tomcat ~]#vim /etc/httpd/conf.d/http-tomcat.conf
<VirtualHost *:80>
    ServerName         node1.zhangzhuo.org
    ProxyRequests      Off 
    ProxyPass        / http://127.0.0.1:8080/
    ProxyPassReverse / http://127.0.0.1:8080/
    ProxyPreserveHost On
    ProxyVia          On  
</VirtualHost>    
[09:59:55 root@tomcat ~]#systemctl enable --now httpd.service
#用下面不同URL访问，可以看不同结果
 [10:01:51 root@tomcat ~]#curl node1.zhangzhuo.org
/data/tomcat1/ROOT/index.html
[10:01:55 root@tomcat ~]#curl node2.zhangzhuo.org
/data/tomcat2/ROOT/index.html
[10:01:58 root@tomcat ~]#curl 192.168.10.83
/usr/local/tomcat/webapps/ROOT/index.html

#修改配置
[10:02:05 root@tomcat ~]#vim /etc/httpd/conf.d/http-tomcat.conf
#只修改下面一行
ProxyPreserveHost Off
[10:02:54 root@tomcat ~]#systemctl reload httpd.service
#再次用用下面不同URL访问，可以看相同结果
[10:03:18 root@tomcat ~]#curl 192.168.10.83
/usr/local/tomcat/webapps/ROOT/index.html
[10:03:34 root@tomcat ~]#curl node1.zhangzhuo.org
/usr/local/tomcat/webapps/ROOT/index.html
[10:03:39 root@tomcat ~]#curl node2.zhangzhuo.org
/usr/local/tomcat/webapps/ROOT/index.html
```

## 2.5 利用 httpd 实现基于AJP协议的反向代理至后端Tomcat服务器

![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-584d1972.png)

### 2.5.1 AJP 协议说明

AJP（Apache JServ Protocol）是定向包协议，是一个二进制的TCP传输协议，相比HTTP这种纯文本的协议来说，效率和性能更高，也做了很多优化。但是浏览器并不能直接支持AJP13协议，只支持HTTP协议。所以实际情况是，通过Apache的proxy_ajp模块进行反向代理，暴露成http协议给客户端访问

### 2.5.2 启用和禁用 AJP

**注意: Tomcat/8.5.51之后版本基于安全需求默认禁用AJP协议**

**范例: Tomcat/8.5.51之后版启用支持AJP协议**

```bash
[10:03:43 root@tomcat ~]#vim /usr/local/tomcat/conf/server.xml 
#取消前面的注释,并修改下面行,修改address和secretRequired 
   <Connector protocol="AJP/1.3" address="0.0.0.0" port="8009" redirectPort="8443" secretRequired="" />
 [10:07:02 root@tomcat ~]#systemctl restart tomcat.service 
[10:13:19 root@tomcat ~]#ss -ntl | grep 8009
LISTEN    0         100                      *:8009                   *:*
```

**注意: secretRequired="" 必须加上,否则出现以下错误提示**

```bash
[root@centos8 tomcat]#cat logs/catalina.log
Caused by: java.lang.IllegalArgumentException: The AJP Connector is configured
with secretRequired="true" but the secret attribute is either null or "". This
combination is not valid.
```

除httpd外，其它支持AJP代理的服务器非常少，比如Nginx就不支持AJP，所以目前一般都禁用AJP协议端

**范例：禁用AJP协议**

```bash
#Tomcat/8.5.50版本之前默认支持AJP协议
#配置tomcat配置文件，删除下面一行
<Connector port="8009" protocol="AJP/1.3" redirectPort="8443" />
```

### 2.5.3 httpd 实现 AJP 反向代理

#### 2.5.3.1 配置说明

相对来讲，AJP协议基于二进制比使用HTTP协议的连接器效率高些。

**proxy_ajp_module模块代理配置**

```bash
<VirtualHost *:80>
    ServerName         node1.zhangzhuo.org
    ProxyRequests      Off 
    ProxyPreserveHost On
    ProxyVia          On  
    ProxyPass         / ajp://127.0.0.1:8009/                                       
</VirtualHost>
```

查看Server Status可以看到确实使用的是ajp连接了。
![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-c711c12e.png)

## 2.6 实现tomcat负载均衡

动态服务器的问题，往往就是并发能力太弱，往往需要多台动态服务器一起提供服务。如何把并发的压力分摊，这就需要调度，采用一定的调度策略，将请求分发给不同的服务器，这就是Load Balance负载均衡。

当单机Tomcat，演化出多机多级部署的时候，一个问题便凸显出来，这就是Session。而这个问题的由来，都是由于HTTP协议在设计之初没有想到未来的发展。

### 2.6.1 HTTP的无状态，有连接和短连接

* 无状态：指的是服务器端无法知道2次请求之间的联系，即使是前后2次请求来自同一个浏览器，也没有任何数据能够判断出是同一个浏览器的请求。后来可以通过cookie、session机制来判断。
  
  * 浏览器端第一次HTTP请求服务器端时，在服务器端使用session这种技术，就可以在服务器端产生一个随机值即SessionID发给浏览器端，浏览器端收到后会保持这个SessionID在Cookie当中，这个Cookie值一般不能持久存储，浏览器关闭就消失。浏览器在每一次提交HTTP请求的时候会把这个SessionID传给服务器端，服务器端就可以通过比对知道是谁了
  * Session通常会保存在服务器端内存中，如果没有持久化，则易丢失
  * Session会定时过期。过期后浏览器如果再访问，服务端发现没有此ID，将给浏览器端重新发新的SessionID
  * 更换浏览器也将重新获得新的SessionID
* 有连接：是因为它基于TCP协议，是面向连接的，需要3次握手、4次断开。
* 短连接：Http 1.1之前，都是一个请求一个连接，而Tcp的连接创建销毁成本高，对服务器有很大的影响。所以，自Http 1.1开始，支持keep-alive，默认也开启，一个连接打开后，会保持一段时间（可设置），浏览器再访问该服务器就使用这个Tcp连接，减轻了服务器压力，提高了效率。

服务器端如果故障，即使Session被持久化了，但是服务没有恢复前都不能使用这些SessionID。

如果使用HAProxy或者Nginx等做负载均衡器，调度到了不同的Tomcat上，那么也会出现找不到SessionID的情况。

### 2.6.2 会话保持方式

#### 2.6.2.1 session sticky会话黏性

Session绑定

* nginx：source ip, cookie
* HAProxy：source ip, cookie

优点：简单易配置

缺点：如果目标服务器故障后，如果没有做sessoin持久化，就会丢失session,此方式生产很少使用

#### 2.6.2.2 session 复制集群

Tomcat自己的提供的多播集群，通过多播将任何一台的session同步到其它节点。

缺点

* Tomcat的同步节点不宜过多，互相即时通信同步session需要太多带宽
* 每一台都拥有全部session，内存损耗太多

#### 2.6.2.3 session server

session 共享服务器，使用memcached、redis做共享的Session服务器，此为推荐方式

### 2.6.3 负载均衡规划和准备

#### 2.6.3.1 负载均衡主机和网络地址规划

![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-3f286032.png)

![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-e2c2e00f.png)

```bash
#只需在192.168.10.81的nginx主机上实现域名解析
vim /etc/hosts
#添加以下三行
192.168.10.81 proxy.zhangzhuo.org proxy
192.168.10.82 t1.zhangzhuo.org
192.168.10.83 t2.zhangzhuo.org
```

#### 2.6.3.2 负载均衡tomcat主机准备

修改tomcat的虚拟机主机为自定义的主机名,并设为默认的虚拟主机

t1虚拟主机配置conf/server.xml

```bash
<Engine name="Catalina" defaultHost="t1.zhangzhuo.org">
<Host name="t1.zhangzhuo.org"  appBase="/data/webapps" unpackWARs="true" autoDeploy="true">
```

t2虚拟主机配置conf/server.xml

```bash
<Engine name="Catalina" defaultHost="t2.zhangzhuo.org">
<Host name="t2.zhangzhuo.org"  appBase="/data/webapps" unpackWARs="true" autoDeploy="true">
```

#### 2.6.3.3 准备负载均衡规划测试用的jsp文件

在t1和 t2节点创建相同的文件/data/webapps/ROOT/index.jsp

```bash
#项目路径配置
mkdir -pv /data/webapps/ROOT
#编写测试jsp文件，内容在下面
vim /data/webapps/ROOT/index.jsp
<%@ page import="java.util.*" %>
<!DOCTYPE html>
<html lang="en">
<head>
   <meta charset="UTF-8">
   <title>tomcat test</title>
</head>
<body>
<div>On <%=request.getServerName() %></div>
<div><%=request.getLocalAddr() + ":" + request.getLocalPort() %></div>
<div>SessionID = <span style="color:blue"><%=session.getId() %></span></div>
<%=new Date()%>
</body>
</html>
#设置权限
chown -R tomcat: /data/*
```

### 2.6.4 Nginx 实现后端 tomcat 的负载均衡调度

#### 2.6.4.1 Nginx 实现后端 tomcat 的负载均衡

nginx 配置如下

```bash
yum install -y nginx

vim /etc/nginx/nginx.conf
#在http块中加以下内容
#注意名称不要用下划线
        upstream tomcat-server {                                                    
             #ip_hash
             #hash $cookie_JSESSIONID;
             server t1.zhangzhuo.org:8080;
             server t2.zhangzhuo.org:8080;
        }   
#修该server中的location
        server {
             location ~* \.(jsp|do)$ {
                  proxy_pass http://tomcat-server;
             }   
        }
```

测试http://proxy.magedu.com/index.jsp，可以看到轮询调度效果,每次刷新后端主机和SessionID都会变化
![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-cd942b0f.png)
![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-b757b5de.png)

```bash
[11:02:35 root@proxy ~]#curl proxy.zhangzhuo.org/index.jsp

<!DOCTYPE html>
<html lang="en">
<head>
 ? <meta charset="UTF-8">
 ? <title>tomcat test</title>
</head>
<body>
<div>On tomcat-server</div>
<div>192.168.10.83:8080</div>
<div>SessionID = <span style="color:blue">94BF0E8A4DC91C895E49A96DC45B487E</span></div>
Thu Mar 18 11:02:36 CST 2021
</body>
</html>
[11:02:36 root@proxy ~]#curl proxy.zhangzhuo.org/index.jsp

<!DOCTYPE html>
<html lang="en">
<head>
 ? <meta charset="UTF-8">
 ? <title>tomcat test</title>
</head>
<body>
<div>On tomcat-server</div>
<div>192.168.10.82:8080</div>
<div>SessionID = <span style="color:blue">1DBAED2F3AF861F315881B3165E01035</span></div>
Thu Mar 18 11:02:39 CST 2021
</body>
</html>
```

#### 2.6.4.2 实现 session 黏性

在upstream中使用ip_hash指令，使用客户端IP地址Hash

```bash
[11:05:41 root@proxy ~]#vim /etc/nginx/nginx.conf
#只添加ip_hash;这一行
upstream tomcat-server {
ip_hash;
#hash $cookie_JSESSIONID;
server t1.zhangzhuo.org:8080;
server t2.zhangzhuo.org:8080;
}
```

**配置完reload nginx服务。curl 测试一下看看效果。**

```bash
#用curl访问每次都调度到10.0.0.102主机上，但因为curl每次请求不会自动携带之前获取的cookie,所有SessionID每次都在变化
[11:09:25 root@proxy ~]#curl proxy.zhangzhuo.org

<!DOCTYPE html>
<html lang="en">
<head>
   <meta charset="UTF-8">
   <title>tomcat test</title>
</head>
<body>
<div>On tomcat-server</div>
<div>192.168.10.83:8080</div>
<div>SessionID = <span style="color:blue">0F95C31449951998BB9A83332022F40D</span></div>
Thu Mar 18 11:10:19 CST 2021
</body>
</html>
[11:10:19 root@proxy ~]#curl proxy.zhangzhuo.org

<!DOCTYPE html>
<html lang="en">
<head>
   <meta charset="UTF-8">
   <title>tomcat test</title>
</head>
<body>
<div>On tomcat-server</div>
<div>192.168.10.83:8080</div>
<div>SessionID = <span style="color:blue">B0FD485A9EA362C1FAA9A6904BFD3390</span></div>
Thu Mar 18 11:10:21 CST 2021
</body>
</html>
```

通过图形浏览器看到主机不变，sessionID不变
![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-c4e79d50.png)

关闭Session对应的Tomcat服务，再重启启动它，看看Session的变化。

通过浏览器看到主机不变，但sessionID和上一次变化，但后续刷新不再变化

### 2.6.5 Httpd 实现后端tomcat的负载均衡调度

和nginx一样, httpd 也支持负载均衡调度功能

#### 2.6.5.1 httpd 的负载均衡配置说明

使用 httpd -M 可以看到 proxy_balancer_module，用它来实现负载均衡。

官方帮助: [http://httpd.apache.org/docs/2.4/mod/mod_proxy_balancer.html](http://httpd.apache.org/docs/2.4/mod/mod_proxy_balancer.html)

**负载均衡配置说明**

```bash
#配置代理到balancer
ProxyPass [path] !|url [key=value [key=value ...]]
#Balancer成员
BalancerMember [balancerurl] url [key=value [key=value ...]]
#设置Balancer或参数
ProxySet url key=value [key=value ...]
```

**ProxyPass 和 BalancerMember 指令参数**
![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-6f84ec51.png)
**Balancer 参数**

![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-c443593b.png)

ProxySet指令也可以使用上面的参数。

#### 2.6.5.2 启用 httpd 的负载均衡

在 tomcat 的配置中Engine使用jvmRoute属性,通过此项可得知SessionID是在哪个tomcat生成

```bash
#t1的conf/server.xml配置如下：
<Engine name="Catalina" defaultHost="t1.zhangzhuo.org" jvmRoute="tomcat1">
#t2的conf/server.xml配置如下：
<Engine name="Catalina" defaultHost="t2.zhangzhuo.org" jvmRoute="tomcat2">
```

这样设置后 SessionID 就变成了以下形式：

SessionID = 9C949FA4AFCBE9337F5F0669548BD4DF.Tomcat1

**httpd配置如下**

```bash
yum install httpd
vim /etc/httpd/conf.d/tomcat.conf
<Proxy balancer://tomcat-server>
    BalancerMember http://t1.zhangzhuo.org:8080 loadfactor=1
    BalancerMember http://t2.zhangzhuo.org:8080 loadfactor=2
</Proxy>

<VirtualHost *:80>
    ServerName    proxy.zhangzhuo.org
    ProxyRequests Off
    ProxyVia      On
    ProxyPreserveHost On      #off时不向后端转发原请求host首部，而转发采用BalancerMember指向名称为首部
    ProxyPass / balancer://tomcat-server/
    ProxyPassReverse / balancer://tomcat-server/
</VirtualHost>

#开启httpd负载均衡的状态页
<Location /balancer-manager>
    SetHandler balancer-manager
    ProxyPass !
    Require all granted
</Location>
```

**loadfactor设置为1:2，便于观察。观察调度的结果是轮询的。**

**查看状态页**

![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-bd362b19.png)

#### 2.6.5.3 实现 session 黏性

官方文档：[http://httpd.apache.org/docs/2.4/mod/mod_proxy_balancer.html](http://httpd.apache.org/docs/2.4/mod/mod_proxy_balancer.html)

```bash
%{BALANCER_WORKER_ROUTE}e   The route of the worker chosen.
```

**范例:**

```bash
vim /etc/httpd/conf.d/tomcat.conf
#添加此行,在cookie 添加 ROUTEID的定义
Header add Set-Cookie "ROUTEID=.%{BALANCER_WORKER_ROUTE}e; path=/" env=BALANCER_ROUTE_CHANGED

<Proxy balancer://tomcat-server>
    BalancerMember http://t1.zhangzhuo.org:8080 loadfactor=1 route=T1  #修改行,指定后端服务器对应的ROUTEID
    BalancerMember http://t2.zhangzhuo.org:8080 loadfactor=2 route=T2  #修改行
    ProxySet stickysession=ROUTEID    #添加此行,指定用cookie中的ROUTEID值做为调度条件
</Proxy>
```

用浏览器访问发现Session不变了，一直找的同一个Tomcat服务器

#### 2.6.5.4 实现 AJP 协议的负载均衡

在上面基础上修改httpd的配置文件

```bash
#在t1和t2的tomcat-8.5.51以上版本的需启用AJP
<Connector protocol="AJP/1.3" address="0.0.0.0" port="8009" redirectPort="8443" secretRequired="" />
vim /etc/httpd/conf.d/tomcat.conf
#注释此行
#Header add Set-Cookie "ROUTEID=.%{BALANCER_WORKER_ROUTE}e; path=/" env=BALANCER_ROUTE_CHANGED


<Proxy balancer://tomcat-server>
    BalancerMember ajp://t1.zhangzhuo.org:8009 loadfactor=1 route=T1 #修改此行
    BalancerMember ajp://t2.zhangzhuo.org:8009 loadfactor=1 route=T2 #修改此行
    #ProxySet stickysession=ROUTEID           #先注释此行                                       
</Proxy>

<VirtualHost *:80>
    ServerName    proxy.zhangzhuo.org
    ProxyRequests Off 
    ProxyVia      On  
    ProxyPreserveHost On
    ProxyPass / balancer://tomcat-server/
    ProxyPassReverse / balancer://tomcat-server/
</VirtualHost>

<Location /balancer-manager>
    SetHandler balancer-manager
    ProxyPass !
    Require all granted
</Location>
#ProxySet stickysession=ROUTEID先禁用,可以看到不断轮询的切换效果
```

开启ProxySet后，发现Session不变了，一直找的同一个Tomcat服务器。

```bash
<Proxy balancer://tomcat-server>
    BalancerMember ajp://t1.zhangzhuo.org:8009 loadfactor=1 route=T1
    BalancerMember ajp://t2.zhangzhuo.org:8009 loadfactor=1 route=T2
    ProxySet stickysession=ROUTEID  #取消此行注释,只修改此行
</Proxy>
systemctl restart httpd
```

多次刷新页面，不再变化

**结论:**

**假设有A、B两个节点，都将Session持久化。如果Tomcat A节点下线期间用户切换到了Tomcat B上，就获得了Tomcat B的Session，原有Sesssion将丢失，就算将持久化Session的Tomcat A节点再次上线了，也没用了。因此需要实现Session的高可用性来解决上述问题。**

# 三、Tomcat Session Replication Cluster

Tomcat 官方实现了 Session 的复制集群,将每个Tomcat的Session进行相互的复制同步,从而保证所有Tomcat都有相同的Session信息.

![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-9529a714.png)

## 3.1 配置说明

官方文档：[https://tomcat.apache.org/tomcat-8.5-doc/cluster-howto.html](https://tomcat.apache.org/tomcat-8.5-doc/cluster-howto.html)

```bash
<Cluster className="org.apache.catalina.ha.tcp.SimpleTcpCluster"
                 channelSendOptions="8">

          <Manager className="org.apache.catalina.ha.session.DeltaManager"
                   expireSessionsOnShutdown="false"
                   notifyListenersOnReplication="true"/>

          <Channel className="org.apache.catalina.tribes.group.GroupChannel">
            <Membership className="org.apache.catalina.tribes.membership.McastService"
                        address="228.0.0.4"    #指定的多播地址
                        port="45564"           #45564/UDP
                        frequency="500"        #间隔500ms发送
                        dropTime="3000"/>
            <Receiver className="org.apache.catalina.tribes.transport.nio.NioReceiver"
                      address="auto"           #监听地址,此项建议修改为当前主机的IP
                      port="4000"              #监听端口
                      autoBind="100"           #如果端口冲突,自动绑定其它端口,范围是4000-4100
                      selectorTimeout="5000"    #自动绑定超时时长5s
                      maxThreads="6"/>

            <Sender className="org.apache.catalina.tribes.transport.ReplicationTransmitter">
              <Transport className="org.apache.catalina.tribes.transport.nio.PooledParallelSender"/>
            </Sender>
            <Interceptor className="org.apache.catalina.tribes.group.interceptors.TcpFailureDetector"/>
            <Interceptor className="org.apache.catalina.tribes.group.interceptors.MessageDispatchInterceptor"/>
          </Channel>

          <Valve className="org.apache.catalina.ha.tcp.ReplicationValve"
                 filter=""/>
          <Valve className="org.apache.catalina.ha.session.JvmRouteBinderValve"/>

          <Deployer className="org.apache.catalina.ha.deploy.FarmWarDeployer"
                    tempDir="/tmp/war-temp/"
                    deployDir="/tmp/war-deploy/"
                    watchDir="/tmp/war-listen/"
                    watchEnabled="false"/>

          <ClusterListener className="org.apache.catalina.ha.session.ClusterSessionListener"/>
        </Cluster>
#注意:tomcat7的官方文档此处有错误
http://tomcat.apache.org/tomcat-7.0-doc/cluster-howto.html
......
<ClusterListener
className="org.apache.catalina.ha.session.JvmRouteSessionIDBinderListener">
        <ClusterListener
className="org.apache.catalina.ha.session.ClusterSessionListener">
      </Cluster>
```

**配置说明:**

* Cluster 集群配置
* Manager 会话管理器配置
* Channel 信道配置
  
  * Membership 成员判定。使用什么多播地址、端口多少、间隔时长ms、超时时长ms。同一个多播地址和端口认为同属一个组。使用时修改这个多播地址，以防冲突
  * Receiver 接收器，多线程接收多个其他节点的心跳、会话信息。默认会从4000到4100依次尝试可用端口
    * address="auto"，auto可能绑定到127.0.0.1上，所以一定要改为当前主机可用的IP
  * Sender 多线程发送器，内部使用了tcp连接池。
  * Interceptor 拦截器
* Valve
  
  * ReplicationValve 检测哪些请求需要检测Session，Session数据是否有了变化，需要启动复制过程
* ClusterListener
  
  * ClusterSessionListener 集群session侦听器

使用 `<Cluster className="org.apache.catalina.ha.tcp.SimpleTcpCluster"/>`

添加到 `<Engine>` 所有虚拟主机都可以启用Session复制

添加到 `<Host>` ，该虚拟主机可以启用Session复制

最后，在应用程序内部启用了才可以使用

## 3.2 实战案例: 实现 Tomcat Session 集群

![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-51abde3e.png)

环境准备：

* 时间同步，确保NTP或Chrony服务正常运行
* 防火墙规则

### 3.2.1 在 proxy 主机设置 httpd (或nginx)实现后端tomcat主机轮询

```bash
[14:23:20 root@proxy ~]#cat /etc/httpd/conf.d/tomcat.conf
#Header add Set-Cookie "ROUTEID=.%{BALANCER_WORKER_ROUTE}e; path=/" env=BALANCER_ROUTE_CHANGED


<Proxy balancer://tomcat-server>
    BalancerMember http://t1.zhangzhuo.org:8080 loadfactor=1 route=T1
    BalancerMember http://t2.zhangzhuo.org:8080 loadfactor=1 route=T2
    #ProxySet stickysession=ROUTEID
</Proxy>

<VirtualHost *:80>
    ServerName    proxy.zhangzhuo.org
    ProxyRequests Off
    ProxyVia      On
    ProxyPreserveHost On
    ProxyPass / balancer://tomcat-server/
    ProxyPassReverse / balancer://tomcat-server/
</VirtualHost>

<Location /balancer-manager>
    SetHandler balancer-manager
    ProxyPass !
    Require all granted
</Location>
[14:23:54 root@proxy ~]#systemctl restart httpd
```

### 3.2.2 在所有后端tomcat主机上修改conf/server.xml

本次把多播复制的配置放到t1.magedu.org和t2.magedu.org虚拟主机里面， 即Host块中。

**特别注意修改Receiver的address属性为一个本机可对外的IP地址**

#### 3.2.2.1 修改 t1 主机的 conf/server.xml

```bash
#将5.1 内容复制到conf/server.xml的Host块内或Engine块(针对所有主机)
[14:28:29 root@t1 ~]#vim /usr/local/tomcat/conf/server.xml 
            <Host name="t1.zhangzhuo.org"  appBase="/data/webapps"
            unpackWARs="true" autoDeploy="true">

       <Cluster className="org.apache.catalina.ha.tcp.SimpleTcpCluster"
                 channelSendOptions="8">

          <Manager className="org.apache.catalina.ha.session.DeltaManager"
                   expireSessionsOnShutdown="false"
                   notifyListenersOnReplication="true"/>

          <Channel className="org.apache.catalina.tribes.group.GroupChannel">
            <Membership className="org.apache.catalina.tribes.membership.McastService"
                        address="230.100.100.100"
                        port="45564"
                        frequency="500"
                        dropTime="3000"/>
            <Receiver className="org.apache.catalina.tribes.transport.nio.NioReceiver"
                      address="192.168.10.82"
                      port="4000"
                      autoBind="100"
                      selectorTimeout="5000"
                      maxThreads="6"/>

            <Sender className="org.apache.catalina.tribes.transport.ReplicationTransmitter">
              <Transport className="org.apache.catalina.tribes.transport.nio.PooledParallelSender"/>
            </Sender>
            <Interceptor className="org.apache.catalina.tribes.group.interceptors.TcpFailureDetector"/>
            <Interceptor className="org.apache.catalina.tribes.group.interceptors.MessageDispatchInterceptor"/>
          </Channel>

          <Valve className="org.apache.catalina.ha.tcp.ReplicationValve"
                 filter=""/>
          <Valve className="org.apache.catalina.ha.session.JvmRouteBinderValve"/>

          <Deployer className="org.apache.catalina.ha.deploy.FarmWarDeployer"
                    tempDir="/tmp/war-temp/"
                    deployDir="/tmp/war-deploy/"
                    watchDir="/tmp/war-listen/"
                    watchEnabled="false"/>

          <ClusterListener className="org.apache.catalina.ha.session.ClusterSessionListener"/>
        </Cluster>
[14:29:07 root@t1 ~]#ss -ntl
State    Recv-Q   Send-Q               Local Address:Port       Peer Address:Port   
LISTEN   0        128                        0.0.0.0:111             0.0.0.0:*      
LISTEN   0        128                        0.0.0.0:22              0.0.0.0:*      
LISTEN   0        128                           [::]:111                [::]:*      
LISTEN   0        100                              *:8080                  *:*      
LISTEN   0        128                           [::]:22                 [::]:*      
LISTEN   0        50          [::ffff:192.168.10.82]:4000                  *:*      
LISTEN   0        100                              *:8009                  *:*
```

**简化说明**

```bash
t1的conf/server.xml中，如下
<Host name="t1.magedu.com" appBase="/data/webapps" autoDeploy="true" >
  #其他略去
   <Receiver className="org.apache.catalina.tribes.transport.nio.NioReceiver"
 address="192.168.10.82"  #只改此行
 port="4000"
 autoBind="100"
 selectorTimeout="5000"
 maxThreads="6"/>
```

#### 3.2.2.2 修改 t2 主机的 conf/server.xml

```bash
[11:41:50 root@t2 ~]#vim /usr/local/tomcat/conf/server.xml
     <Cluster className="org.apache.catalina.ha.tcp.SimpleTcpCluster"
                 channelSendOptions="8">

          <Manager className="org.apache.catalina.ha.session.DeltaManager"
                   expireSessionsOnShutdown="false"
                   notifyListenersOnReplication="true"/>

          <Channel className="org.apache.catalina.tribes.group.GroupChannel">
            <Membership className="org.apache.catalina.tribes.membership.McastService"
                        address="230.100.100.100"
                        port="45564"
                        frequency="500"
                        dropTime="3000"/>
            <Receiver className="org.apache.catalina.tribes.transport.nio.NioReceiver"
                      address="192.168.10.83"    #此行指定当前主机的IP,其它和T1节点配置相同
                      port="4000"
                      autoBind="100"
                      selectorTimeout="5000"
                      maxThreads="6"/>

            <Sender className="org.apache.catalina.tribes.transport.ReplicationTransmitter">
              <Transport className="org.apache.catalina.tribes.transport.nio.PooledParallelSender"/>
            </Sender>
            <Interceptor className="org.apache.catalina.tribes.group.interceptors.TcpFailureDetector"/>
            <Interceptor className="org.apache.catalina.tribes.group.interceptors.MessageDispatchInterceptor"/>
          </Channel>

          <Valve className="org.apache.catalina.ha.tcp.ReplicationValve"
                 filter=""/>
          <Valve className="org.apache.catalina.ha.session.JvmRouteBinderValve"/>

          <Deployer className="org.apache.catalina.ha.deploy.FarmWarDeployer"
                    tempDir="/tmp/war-temp/"
                    deployDir="/tmp/war-deploy/"
                    watchDir="/tmp/war-listen/"
                    watchEnabled="false"/>

          <ClusterListener className="org.apache.catalina.ha.session.ClusterSessionListener"/>
        </Cluster>
[14:32:37 root@t2 ~]#ss -ntl
State    Recv-Q   Send-Q               Local Address:Port       Peer Address:Port   
LISTEN   0        128                        0.0.0.0:111             0.0.0.0:*      
LISTEN   0        128                        0.0.0.0:22              0.0.0.0:*      
LISTEN   0        100                              *:8009                  *:*      
LISTEN   0        128                           [::]:111                [::]:*      
LISTEN   0        100                              *:8080                  *:*      
LISTEN   0        128                           [::]:22                 [::]:*      
LISTEN   0        50          [::ffff:192.168.10.83]:4000                  *:*
```

**简化说明**

t2主机的server.xml中，如下

```bash
<Host name="t2.magedu.com" appBase="/data/webapps" autoDeploy="true" >
  其他略去
   <Receiver className="org.apache.catalina.tribes.transport.nio.NioReceiver"
 address="192.168.10.83"  #只改此行
 port="4000"
 autoBind="100"
 selectorTimeout="5000"
 maxThreads="6"/>
```

尝试使用刚才配置过得负载均衡(移除Session黏性)，测试发现Session还是变来变去。

### 3.2.3 修改应用的web.xml文件开启该应用程序的分布式

参考官方说明: [https://tomcat.apache.org/tomcat-8.5-doc/cluster-howto.html](https://tomcat.apache.org/tomcat-8.5-doc/cluster-howto.html)
![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-f4bc5524.png)

```bash
Make sure your web.xml has the  element
```

为所有tomcat主机应用web.xml的 `<web-app>` 标签增加子标签 `<distributable/>` 来开启该应用程序的分布式。

#### 3.2.3.1 修改t1主机的应用的web.xml文件

```bash
[14:29:07 root@t1 ~]#ll /usr/local/tomcat/webapps/ROOT/WEB-INF/
total 4
-rw-r----- 1 tomcat tomcat 1227 Mar  5 07:17 web.xml
[14:37:39 root@t1 ~]#cp -a /usr/local/tomcat/webapps/ROOT/WEB-INF /data/webapps/ROOT/
[14:38:01 root@t1 ~]#tree /data/webapps/ROOT/
/data/webapps/ROOT/
├── index.jsp
└── WEB-INF
    └── web.xml
#在倒数第二行加一行
[14:38:16 root@t1 ~]#vim /data/webapps/ROOT/WEB-INF/web.xml
  </description>
<distributable/>   #添加此行
</web-app>
#注意权限
[14:39:26 root@t1 ~]#ll /data/webapps/ROOT/WEB-INF/
total 4
-rw-r----- 1 tomcat tomcat 1244 Mar 18 14:39 web.xml
[14:41:28 root@t1 ~]#systemctl restart tomcat.service
#同时观察日志
[14:43:59 root@t1 ~]#systemctl restart tomcat.service
18-Mar-2021 14:41:54.616 INFO [Membership-MemberAdded.] org.apache.catalina.ha.tcp.SimpleTcpCluster.memberAdded Replication member added:[org.apache.catalina.tribes.membership.MemberImpl[tcp://{192, 168, 10, 83}:4000,{192, 168, 10, 83},4000, alive=559883, securePort=-1, UDP Port=-1, id={87 114 -110 73 126 -34 64 126 -77 51 -24 81 -58 55 116 47 }, payload={}, command={}, domain={}]]
```

#### 3.2.3.2 修改t2主机的应用的web.xml文件

```bash
#与5.2.3.1上的t1相同的操作
[14:32:37 root@t2 ~]#cp -a /usr/local/tomcat/webapps/ROOT/WEB-INF /data/webapps/ROOT/
[14:43:07 root@t2 ~]#vim /data/webapps/ROOT/WEB-INF/web.xml 
  </description>
<distributable/> #添加此行
</web-app>
#注意权限
[14:43:28 root@t2 ~]#ll /data/webapps/ROOT/WEB-INF/web.xml
-rw-r----- 1 tomcat tomcat 1244 Mar 18 14:43 /data/webapps/ROOT/WEB-INF/web.xml
#同时观察日志
[14:43:59 root@t2 ~]#systemctl restart tomcat.service
18-Mar-2021 14:44:49.868 INFO [Membership-MemberAdded.] org.apache.catalina.ha.tcp.SimpleTcpCluster.memberAdded Replication member added:[org.apache.catalina.tribes.membership.MemberImpl[tcp://{192, 168, 10, 82}:4000,{192, 168, 10, 82},4000, alive=175284, securePort=-1, UDP Port=-1, id={-49 -105 84 52 28 -34 64 -38 -115 -100 57 -77 83 32 14 -124 }, payload={}, command={}, domain={}]]
```

### 3.2.4 测试访问

重启全部Tomcat，通过负载均衡调度到不同节点，返回的SessionID不变了。

用浏览器访问,并刷新多次,发现SessionID 不变,但后端主机在轮询

**但此方式当后端tomcat主机较多时,会重复占用大量的内存,并不适合后端服务器众多的场景**

### 3.2.5 故障模拟

```bash
#模拟t2节点故障
[14:44:47 root@t2 ~]#systemctl stop tomcat.service
#多次访问SessionID不变
```

# 四、Memcached

## 4.1 NoSQL介绍

NoSQL是对 Not Only SQL、非传统关系型数据库的统称。

NoSQL一词诞生于1998年，2009年这个词汇被再次提出指非关系型、分布式、不提供ACID的数据库设计模式。

随着互联网时代的到来，数据爆发式增长，数据库技术发展日新月异，要适应新的业务需求。

而随着移动互联网、物联网的到来，大数据的技术中NoSQL也同样重要。

数据库排名：[https://db-engines.com/en/ranking](https://db-engines.com/en/ranking)

**NoSQL 分类**

* Key-value Store k/v数据库
  * 性能好 O(1) , 如: redis、memcached
* Document Store 文档数据库
  * mongodb、CouchDB
* Column Store 列存数据库，Column-Oriented DB
  * HBase、Cassandra，大数据领域应用广泛
* Graph DB 图数据库
  * Neo4j
* Time Series 时序数据库
  * InfluxDB、Prometheus

## 4.2 Memcached

Memcached 只支持能序列化的数据类型，不支持持久化，基于Key-Value的内存缓存系统

memcached 虽然没有像redis所具备的数据持久化功能，比如RDB和AOF都没有，但是可以通过做集群同步的方式，让各memcached服务器的数据进行同步，从而实现数据的一致性，即保证各memcached的数据是一样的，即使有任何一台 memcached 发生故障，只要集群中有一台memcached 可用就不会出现数据丢失，当其他memcached 重新加入到集群的时候,可以自动从有数据的memcached 当中自动获取数据并提供服务。

Memcached 借助了操作系统的 libevent 工具做高效的读写。libevent是个程序库，它将Linux的epoll、BSD类操作系统的kqueue等事件处理功能封装成统一的接口。即使对服务器的连接数增加，也能发挥高性能。memcached使用这个libevent库，因此能在Linux、BSD、Solaris等操作系统上发挥其高性能

Memcached 支持最大的内存存储对象为1M，超过1M的数据可以使用客户端压缩或拆分报包放到多个key中，比较大的数据在进行读取的时候需要消耗的时间比较长，memcached 最适合保存用户的session实现session共享

Memcached存储数据时, Memcached会去申请1MB的内存, 把该块内存称为一个slab, 也称为一个page

Memcached 支持多种开发语言，包括：JAVA,C,Python,PHP,C#,Ruby,Perl等

Memcached 官网：[http://memcached.org/](http://memcached.org/)

## 4.3 Memcached 和 Redis 比较

![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-56694283.png)

## 4.4 Memcached 工作机制

### 4.4.1 内存分配机制

应用程序运行需要使用内存存储数据，但对于一个缓存系统来说，申请内存、释放内存将十分频繁，非常容易导致大量内存碎片，最后导致无连续可用内存可用。

Memcached采用了Slab Allocator机制来分配、管理内存。

* Page：分配给Slab的内存空间，默认为1MB，分配后就得到一个Slab。Slab分配之后内存按照固定字节大小等分成chunk。
* Chunk：用于缓存记录k/v值的内存空间。Memcached会根据数据大小选择存到哪一个chunk中，假设chunk有128bytes、64bytes等多种，数据只有100bytes存储在128bytes中，存在少许浪费。
  
  * Chunk最大就是Page的大小，即一个Page中就一个Chunk
* Slab Class：Slab按照Chunk的大小分组，就组成不同的Slab Class, 第一个Chunk大小为 96B的Slab为Class1,Chunk 120B为Class 2,如果有100bytes要存，那么Memcached会选择下图中SlabClass 2 存储，因为它是120bytes的Chunk。Slab之间的差异可以使用Growth Factor 控制，默认1.25。
  ![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-5d172b36.png)

**范例：查看Slab Class**

```bash
[15:02:54 root@memcached ~]#memcached -u memcached -f 2 -vv
slab class   1: chunk size        96 perslab   10922
slab class   2: chunk size       192 perslab    5461
slab class   3: chunk size       384 perslab    2730
slab class   4: chunk size       768 perslab    1365
slab class   5: chunk size      1536 perslab     682
slab class   6: chunk size      3072 perslab     341
slab class   7: chunk size      6144 perslab     170
slab class   8: chunk size     12288 perslab      85
slab class   9: chunk size     24576 perslab      42
slab class  10: chunk size     49152 perslab      21
slab class  11: chunk size     98304 perslab      10
slab class  12: chunk size    196608 perslab       5
slab class  13: chunk size    524288 perslab       2
<27 server listening (auto-negotiate)
<28 server listening (auto-negotiate)
```

### 4.4.2 懒过期 Lazy Expiration

memcached不会监视数据是否过期，而是在取数据时才看是否过期，如果过期,把数据有效期限标识为0，并不清除该数据。以后可以覆盖该位置存储其它数据。

### 4.4.3 LRU

当内存不足时，memcached会使用LRU（Least Recently Used）机制来查找可用空间，分配给新记录使用。

### 4.4.4 集群

Memcached集群，称为基于客户端的分布式集群，即由客户端实现集群功能，即Memcached本身不支持集群

Memcached集群内部并不互相通信，一切都需要客户端连接到Memcached服务器后自行组织这些节点，并决定数据存储的节点。

## 4.5 安装和启动

官方安装说明

```bash
https://github.com/memcached/memcached/wiki/Install
```

### 4.5.1 yum安装

范例: CentOS 8 安装 memcached

```bash
[15:03:18 root@memcached ~]#yum info memcached
[15:05:04 root@memcached ~]#yum install -y memcached
[15:05:26 root@memcached ~]#rpm -ql memcached

[15:05:55 root@memcached ~]#cat /etc/sysconfig/memcached
PORT="11211"      #监听端口
USER="memcached"  #启动用户
MAXCONN="1024"     #最大连接数
CACHESIZE="64"     #最大使用内存
OPTIONS="-l 127.0.0.1,::1" #其他选项

[15:07:21 root@memcached ~]#grep -Ev "^#|^$" /usr/lib/systemd/system/memcached.service
[Unit]
Description=memcached daemon
Before=httpd.service
After=network.target
[Service]
EnvironmentFile=/etc/sysconfig/memcached
ExecStart=/usr/bin/memcached -p ${PORT} -u ${USER} -m ${CACHESIZE} -c ${MAXCONN} $OPTIONS
PrivateTmp=true
ProtectSystem=full
NoNewPrivileges=true
PrivateDevices=true
CapabilityBoundingSet=CAP_SETGID CAP_SETUID CAP_SYS_RESOURCE
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX
[Install]
WantedBy=multi-user.target

[15:08:19 root@memcached ~]#getent passwd memcached 
memcached:x:992:990:Memcached daemon:/run/memcached:/sbin/nologin

[15:08:35 root@memcached ~]#systemctl start memcached.service 
[15:10:07 root@memcached ~]#pstree -p | grep memcached
           |-memcached(1814)-+-{memcached}(1815)
           |                 |-{memcached}(1816)
           |                 |-{memcached}(1817)
           |                 |-{memcached}(1818)
           |                 |-{memcached}(1819)
           |                 |-{memcached}(1820)
           |                 |-{memcached}(1821)
           |                 |-{memcached}(1822)
           |                 `-{memcached}(1823)
           
[15:10:32 root@memcached ~]#ss -ntlup | grep memcached
tcp     LISTEN   0        128            127.0.0.1:11211          0.0.0.0:*      users:(("memcached",pid=1814,fd=27))                                           
tcp     LISTEN   0        128                [::1]:11211             [::]:*      users:(("memcached",pid=1814,fd=28))
#修改端口绑定的IP为当前主机的所有IP
PORT="11211"
USER="memcached"
MAXCONN="1024"
CACHESIZE="64"
#OPTIONS="-l 127.0.0.1,::1"
OPTIONS=""

[15:11:37 root@memcached ~]#systemctl restart memcached.service 
[15:11:55 root@memcached ~]#ss -ntl
State     Recv-Q    Send-Q         Local Address:Port          Peer Address:Port    
LISTEN    0         128                  0.0.0.0:11211              0.0.0.0:*       
LISTEN    0         128                  0.0.0.0:111                0.0.0.0:*       
LISTEN    0         128                  0.0.0.0:22                 0.0.0.0:*       
LISTEN    0         128                     [::]:11211                 [::]:*       
LISTEN    0         128                     [::]:111                   [::]:*       
LISTEN    0         128                     [::]:22                    [::]:*
```

### 4.5.2 编译安装

```bash
#安装脚本

install_dir='/usr/local/'
yum install -y gcc libevent-devel
rpm -q wget &>/dev/null || yum install -y wget
wget http://memcached.org/files/memcached-1.6.9.tar.gz
tar xvf memcached-1.6.9.tar.gz
cd memcached-1.6.9
[ -d $install_dir ] || mkdir -p $install_mkdir

./configure --prefix=${install_dir}/memcached

make && make install

echo "PATH=${install_mkdir}/memcached/bin:\$PATH" >/etc/profile.d/memcached.sh

id memcached &>/dev/null || useradd -r -s /sbin/nologin memcached
cat >/etc/sysconfig/memcached<<EOF
PORT="11211"
USER="memcached"
MAXCONN="1024"
CACHESIZE="64"
#OPTIONS="-l 127.0.0.1,::1"
OPTIONS=""
EOF
cat >/lib/systemd/system/memcached.service<<EOF
[Unit]
Description=memcached daemon
Before=httpd.service
After=network.target
[Service]
EnvironmentFile=/etc/sysconfig/memcached
ExecStart=${install_dir}/memcached/bin/memcached -p \${PORT} -u \${USER} -m \${CACHESIZE} -c \${MAXCONN} \$OPTIONS
PrivateTmp=true
ProtectSystem=full
NoNewPrivileges=true
PrivateDevices=true
CapabilityBoundingSet=CAP_SETGID CAP_SETUID CAP_SYS_RESOURCE
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX
[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
echo "安装完成"
```

### 4.5.3 memcached 启动程序说明

修改memcached 运行参数，可以使用下面的选项修改/etc/sysconfig/memcached文件

**memcached 常见选项**

```bash
-u username memcached运行的用户身份，必须普通用户
-p 绑定的端口，默认11211
-m num 最大内存，单位MB，默认64MB
-c num 最大连接数，缺省1024
-d 守护进程方式运行
-f 增长因子Growth Factor，默认1.25
-v 详细信息，-vv能看到详细信息
-M 使用内存直到耗尽，不许LRU
-U 设置UDP监听端口，0表示禁用UDP
```

## 4.6 使用 memcached

### 4.6.1 memcached 开发库和工具

与memcached通信的不同语言的连接器。libmemcached提供了C库和命令行工具。

**范例: 查看memcached相关包**

```bash
[15:36:27 root@centos8 ~]#yum list "*memcached*"
```

协议

查看/usr/share/doc/memcached-1.4.15/protocol.txt

```bash
[15:36:47 root@centos8 ~]#dnf info libmemcached
[15:38:14 root@centos8 ~]#yum install libmemcached
[15:38:01 root@centos8 ~]#memstat --servers=192.168.10.84
```

### 4.6.2 memcached 操作命令

帮助文档:

```bash
[root@centos8 ~]#cat /usr/share/doc/memcached/protocol.txt
```

五种基本 memcached 命令执行最简单的操作。这些命令和操作包括：

* set
* add
* replace
* get
* delete

```bash
#前三个命令是用于操作存储在 memcached 中的键值对的标准修改命令,都使用如下所示的语法：
command    

#参数说明如下：
command set/add/replace
key     key 用于查找缓存值
flags     可以包括键值对的整型参数，客户机使用它存储关于键值对的额外信息
expiration time     在缓存中保存键值对的时间长度（以秒为单位，0 表示永远）
bytes     在缓存中存储的字节点
value     存储的值（始终位于第二行）
#增加key，过期时间为秒，bytes为存储数据的字节数
add key flags exptime bytes
```

**范例：**

```bash
[15:40:01 root@centos8 ~]#telnet localhost 11211
Trying ::1...
Connected to localhost.
Escape character is '^]'.
stats
add mykey 1 60 4
test
STORED
get mykey
VALUE mykey 1 4
test
END
set mykey 1 60 5
test1
STORED
get mykey
VALUE mykey 1 5
test1
END
delete mykey
DELETED
get mykey
END
flush_all
OK
get mykey
END
quit
```

### 4.6.3 python 语言连接 memcached

#### 4.6.3.1 范例: python3 测试代码

```bash
[15:48:04 root@centos8 ~]#cat m2.py
#!/usr/bin/env python
import memcache
m = memcache.Client(['127.0.0.1:11211'], debug=True)
for i in range(10):
   m.set("key%d" % i,"v%d" % i)
   ret = m.get('key%d' % i)
   print("%s" % ret)
[15:48:09 root@centos8 ~]#python3 m2.py 
v0
v1
v2
v3
v4
v5
v6
v7
v8
v9
```

#### 4.6.3.2 范例: python2 测试代码

```bash
[root@centos7 ~]#yum -y install python-memcached
[root@centos7 ~]#cat m2.py
#!/usr/bin/env python
#coding:utf-8
import memcache
m = memcache.Client(['127.0.0.1:11211'], debug=True)
for i in range(10):
m.set("key%d" % i,"v%d" % i)
ret = m.get('key%d' % i)
print ret
[root@centos7 ~]#python m2.py
v0
v1
v2
v3
v4
v5
v6
v7
v8
v9
```

## 4.7 memcached 集群部署架构

### 4.7.1 基于 magent 的部署架构

Magent是google开发的项目,应用端通过负载均衡服务器连接到magent，然后再由magent代理用户应用请求到memcached处理，底层的memcached为双主结构会自动同步数据，本部署方式存在magent单点问题,因此需要两个magent做高可用。

![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-9d01b26a.png)
项目站点：[https://code.google.com/archive/p/memagent/](https://code.google.com/archive/p/memagent/)

此项目过于陈旧,且不稳定,当前已经废弃

### 4.7.2 Repcached 实现原理

项目站点：[http://repcached.sourceforge.net/](http://repcached.sourceforge.net/)

在 master上可以通过 -X 选项指定 replication port(默认为11212/tcp)，在 slave上通过 -x 指定复制的master并连接，事实上，如果同时指定了 -x/-X， repcached先会尝试连接对端的master，但如果连接失败，它就会用 -X参数来自己 listen（成为master）；如果 master坏掉， slave侦测到连接断了，它会自动 listen而成为 master；而如果 slave坏掉，master也会侦测到连接断开，它就会重新 listen等待新的 slave加入。

从这方案的技术实现来看，其实它是一个单 master单 slave的方案，但它的 master/slave都是可读写的，而且可以相互同步，所以从功能上看，也可以认为它是双机 master-master方案

### 4.7.3 简化后的部署架构

magent已经有很长时间没有更新，因此可以不再使用magent，直接通过负载均衡连接到memcached，仍然有两台memcached做高可用，repcached版本的memcached之间会自动同步数据，以保持数据一致性，即使其中的一台memcached故障也不影响业务正常运行，故障的memcached修复上线后再自动从另外一台同步数据即可保持数据一致性。

![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-e26ba951.png)

### 4.7.4 部署repcached

```bash
[15:55:52 root@centos7 ~]#yum -y install gcc libevent libevent-devel
[16:02:35 root@centos7 ~]#wget http://sourceforge.net/projects/repcached/files/repcached/2.2.1-1.2.8/memcached-1.2.8-repcached-2.2.1.tar.gz/download
[16:02:50 root@centos7 ~]#tar xf memcached-1.2.8-repcached-2.2.1.tar.gz
[16:02:56 root@centos7 ~]#cd memcached-1.2.8-repcached-2.2.1/
[16:02:59 root@centos7 memcached-1.2.8-repcached-2.2.1]#./configure --prefix=/usr/local/repcached --enable-replication
[16:04:07 root@centos7 memcached-1.2.8-repcached-2.2.1]#make   #报错如下
```

![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-3fd15495.png)

解决办法：

```bash
[16:04:10 root@centos7 memcached-1.2.8-repcached-2.2.1]#vim memcache
56 #ifndef IOV_MAX
57 #if defined(__FreeBSD__) || defined(__APPLE__)
58 # define IOV_MAX 1024
59 #endif
60 #endif
#改为如下内容，即删除原有的原第57，59行
56 #ifndef IOV_MAX
57 # define IOV_MAX 1024
58 #endif
```

**再次编译安装：**

```bash
[16:07:22 root@centos7 memcached-1.2.8-repcached-2.2.1]#make && make install
[16:07:05 root@centos7 ~]#tree /usr/local/repcached/
/usr/local/repcached/
├── bin
│   ├── memcached
│   └── memcached-debug
└── share
└── man
└── man1
└── memcached.1

4 directories, 3 files
```

### 4.7.5 验证是否可执行

```bash
[16:07:43 root@centos7 ~]#echo 'PATH=/usr/local/repcached/bin:$PATH' >/etc/profile.d/repcached.sh
[16:08:52 root@centos7 ~]#memcached -h
memcached 1.2.8
repcached 2.2.1
-p       TCP port number to listen on (default: 11211)
-U       UDP port number to listen on (default: 11211, 0 is off)
-s      unix socket path to listen on (disables network support)
-a      access mask for unix socket, in octal (default 0700)
.....
```

### 4.7.6 启动 memcached

#### 4.7.6.1 server1 相关操作

```bash
#创建用户
[16:09:46 root@centos7 ~]#useradd -r -s /sbin/nologin memcached
#后台启动
#-x 192.168.10.72为对端memcached的地址
[16:18:34 root@centos7 ~]#memcached -d -m 128 -p 11211 -u memcached -c 128 -x 192.168.10.72
[16:19:51 root@centos7 ~]#ss -ntl
State      Recv-Q Send-Q Local Address:Port               Peer Address:Port
LISTEN     0      128            *:111                        *:*
LISTEN     0      128            *:22                         *:*
LISTEN     0      100    127.0.0.1:25                         *:*
LISTEN     0      128            *:11211                      *:*
LISTEN     0      128         [::]:111                     [::]:*
LISTEN     0      128         [::]:22                      [::]:*
LISTEN     0      100        [::1]:25                      [::]:*
LISTEN     0      128         [::]:11211                   [::]:*
```

#### 4.7.6.2 server2 相关操作

```bash
[16:18:31 root@centos7 ~]#memcached -d -m 128 -p 11211 -u memcached -c 128 -x 192.168.10.71
[16:19:42 root@centos7 ~]#ss -ntl
State      Recv-Q Send-Q Local Address:Port               Peer Address:Port
LISTEN     0      128            *:22                         *:*
LISTEN     0      100    127.0.0.1:25                         *:*
LISTEN     0      128            *:11211                      *:*
LISTEN     0      128            *:111                        *:*
LISTEN     0      128         [::]:22                      [::]:*
LISTEN     0      100        [::1]:25                      [::]:*
LISTEN     0      128         [::]:11211                   [::]:*
LISTEN     0      128         [::]:111                     [::]:*
```

### 4.7.7 连接到 memcached 验证数据

#### 4.7.7.1 shell 命令测试

```bash
#在第一台memcached上创建数据
[16:22:05 root@centos7 ~]#telnet 127.0.0.1 11211
Trying 127.0.0.1...
Connected to 127.0.0.1.
Escape character is '^]'.
add name 0 0 5
zhang
STORED
get name
VALUE name 0 5
zhang
#到另外一台memcached服务器验证是否有同步过来的数据
[16:22:39 root@centos7 ~]#telnet 127.0.0.1 11211
Trying 127.0.0.1...
Connected to 127.0.0.1.
Escape character is '^]'.
get name
VALUE name 0 5
zhang
END
set age 0 0 2
20
STORED
#在第一台memcached上验证实现双向复制
get age
VALUE age 0 2
20
```

# 五、session 共享服务器

## 5.1 msm 介绍

msm（memcached session manager）提供将Tomcat的session保持到memcached或redis的程序，可以实现高可用。

项目早期托管在google code,目前在Github

github网站链接: [https://github.com/magro/memcached-session-manager](https://github.com/magro/memcached-session-manager)

![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-710c91cf.png)

**支持Tomcat的 6.x、7.x、8.x、9.x**

* Tomcat的Session管理类，Tomcat版本不同
  * memcached-session-manager-2.3.2.jar
  * memcached-session-manager-tc8-2.3.2.jar
* Session数据的序列化、反序列化类
  * 官方推荐kyro
  * 在webapp中WEB-INF/lib/下
* 驱动类
  * memcached(spymemcached.jar)
  * Redis(jedis.jar)

## 5.2 安装

参考链接: [https://github.com/magro/memcached-session-manager/wiki/SetupAndConfiguration](https://github.com/magro/memcached-session-manager/wiki/SetupAndConfiguration)

将spymemcached.jar、memcached-session-manage、kyro相关的jar文件都放到Tomcat的lib目录中去，这个目录是 $CATALINA_HOME/lib/ ，对应本次安装就是/usr/local/tomcat/lib。

```bash
kryo-3.0.3.jar
asm-5.2.jar
objenesis-2.6.jar
reflectasm-1.11.9.jar
minlog-1.3.1.jar
kryo-serializers-0.45.jar
msm-kryo-serializer-2.3.2.jar
memcached-session-manager-tc8-2.3.2.jar
spymemcached-2.12.3.jar
memcached-session-manager-2.3.2.jar
```

## 5.3 sticky 模式

### 5.3.1 sticky 模式工作原理

sticky 模式即前端tomcat和后端memcached有关联(粘性)关系

参考文档:[https://github.com/magro/memcached-session-manager/wiki/SetupAndConfiguration](https://github.com/magro/memcached-session-manager/wiki/SetupAndConfiguration)

```bash
Tomcat-1（t1）主要将其会话存储在另一台计算机上运行的memcached-2（m2）中（m2是t1的常规节
点）。 仅当m2不可用时，t1才会将其会话存储在memcached-1中（m1，m1是t1的failoverNode）。 使
用此配置，当计算机1（服务于t1和m1）崩溃时，会话不会丢失。 以下非常好的ASCII艺术显示了此设置。
<t1>  <t2>
 . \ / .
  . X .
 . / \ .
<m1>  <m2>
```

t1和m1部署可以在一台主机上，t2和m2部署也可以在同一台。

当新用户发请求到Tomcat1时, Tomcat1生成session返回给用户的同时,也会同时发给memcached2备份。即Tomcat1 session为主session，memcached2 session为备用session，使用memcached相当于备份了一份Session

如果Tomcat1发现memcached2 失败,无法备份Session到memcached2,则将Sessoin备份存放在memcached1中

### 5.3.2 配置过程

#### 5.3.2.1 下载相关jar包

下载相关jar包,参考下面官方说明的下载链接

[https://github.com/magro/memcached-session-manager/wiki/SetupAndConfiguration](https://github.com/magro/memcached-session-manager/wiki/SetupAndConfiguration)

**tomcat和memcached相关包**
![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-4ed578c7.png)

**序列化相关下载**

![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-26f6f0be.png)

#### 5.3.2.2 修改tomcat配置

修改 $CATALINA_HOME/conf/context.xml

特别注意，t1配置中为failoverNodes="n1"， t2配置为failoverNodes="n2

```bash
#以下是sticky的配置
<Context>
...
 <Manager className="de.javakaffee.web.msm.MemcachedBackupSessionManager"
   memcachedNodes="n1:192.168.10.82:11211,n2:192.168.10.83:11211"
   failoverNodes="n1"
   requestUriIgnorePattern=".*\.(ico|png|gif|jpg|css|js)$"
 
transcoderFactoryClass="de.javakaffee.web.msm.serializer.kryo.KryoTranscoderFac
tory"
   />
</Context>
```

**配置说明**

```bash
memcachedNodes="n1:host1.yourdomain.com:11211,n2:host2.yourdomain.com:11211"

memcached的节点: n1、n2只是别名，可以重新命名。
failoverNodes 为故障转移节点，n1是备用节点，n2是主存储节点。另一台Tomcat将n1改为n2，其主节
点是n1，备用节点是n2。
```

**如果配置成功，可以在logs/catalina.out中看到下面的内容**

```bash
12-APR-2020 16:24:08.975 INFO [t1.magedu.com-startStop-1]
de.javakaffee.web.msm.MemcachedSessionService.startInternal --------
- finished initialization:
- sticky: true
- operation timeout: 1000
- node ids: [n2]
- failover node ids: [n1]
- storage key prefix: null
- locking mode: null (expiration: 5s)
```

#### 5.3.2.3 准备测试msm的python脚本

t1、t2、n1、n2依次启动成功，分别使用http://t1.magedu.org:8080/ 和http://t2.magedu.org:8080/观察。

开启负载均衡调度器，通过http://proxy.magedu.com来访问看看效果

可以看到浏览器端被调度到不同Tomcat上，但是都获得了同样的SessionID。

停止t2、n2看看效果，恢复看看效果。

范例：访问tomcat，查看memcached中SessionID信息

```bash
#!/bin/python3
import memcache
mc = memcache.Client(['10.0.0.101:11211'], debug=True)
stats = mc.get_stats()[0]
print(stats)
for k,v in stats[1].items():
    print(k, v)
    print('-' * 30)
# 查看全部key
    print(mc.get_stats('items')) # stats items 返回 items:5:number 1
    print('-' * 30)
    print(mc.get_stats('cachedump 5 0')) # stats cachedump 5 0 # 5和上面的items返回的值有关；0表示全部
```

### 5.3.3 实战案例 1 : tomcat和memcached集成在一台主机

![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-9d85459b.png)

环境准备：

* 时间同步，确保NTP或Chrony服务正常运行。
* 防火墙规则
* 禁用SELinux
* 三台主机

#### 5.3.3.1 配置nginx充当proxy

```bash
upstream tomcat-server {
             #ip_hash;
             #hash $cookie_JSESSIONID;
             server t1.zhangzhuo.org:8080;
             server t2.zhangzhuo.org:8080;
        }
 location / {
           proxy_pass http://tomcat-server;
        }
[17:31:51 root@proxy ~]#cat /etc/hosts
192.168.10.81 proxy.zhangzhuo.org proxy
192.168.10.82 t1.zhangzhuo.org
192.168.10.83 t2.zhangzhuo.org
```

#### 5.3.3.2 配置memcached

```bash
[17:22:21 root@t1 tomcat]#cat /etc/sysconfig/memcached 
PORT="11211"
USER="memcached"
MAXCONN="1024"
CACHESIZE="64"
#注释下面行
#OPTIONS="-l 127.0.0.1,::1"
[17:32:33 root@t1 tomcat]#systemctl enable --now memcached.service
```

#### 5.3.3.3 配置 tomcat

**配置 tomcat1**

```bash
[17:34:39 root@t1 tomcat]#vim conf/server.xml
 <Host name="t1.zhangzhuo.org"  appBase="/data/webapps"
            unpackWARs="true" autoDeploy="true">

[17:34:39 root@t1 tomcat]#vim conf/context.xml
###倒数第一行前,即</Context>行的前面,加下面内容
 <Manager className="de.javakaffee.web.msm.MemcachedBackupSessionManager"
    memcachedNodes="n1:192.168.10.82:11211,n2:192.168.10.83:11211"
    failoverNodes="n1"
    requestUriIgnorePattern=".*\.(ico|png|gif|jpg|css|js)$"
   
    transcoderFactoryClass="de.javakaffee.web.msm.serializer.kryo.KryoTranscoderFactory"    />


#将相关包传到lib/目录下
asm-5.2.jar
kryo-3.0.3.jar
kryo-serializers-0.45.jar
memcached-session-manager-2.3.2.jar
memcached-session-manager-tc8-2.3.2.jar
minlog-1.3.1.jar
msm-kryo-serializer-2.3.2.jar
objenesis-2.6.jar
reflectasm-1.11.9.jar
spymemcached-2.12.3.jar

[17:58:10 root@t1 ~]#ll -t /usr/local/tomcat/lib/ | tail -11
-rw-r--r-- 1 tomcat tomcat   53259 Aug 22  2020 asm-5.2.jar
-rw-r--r-- 1 tomcat tomcat  126366 Aug 22  2020 kryo-serializers-0.45.jar
-rw-r--r-- 1 tomcat tomcat   38372 Aug 22  2020 msm-kryo-serializer-2.3.2.jar
-rw-r--r-- 1 tomcat tomcat  285211 Aug 22  2020 kryo-3.0.3.jar
-rw-r--r-- 1 tomcat tomcat    5923 Aug 22  2020 minlog-1.3.1.jar
-rw-r--r-- 1 tomcat tomcat   55684 Aug 22  2020 objenesis-2.6.jar
-rw-r--r-- 1 tomcat tomcat   72265 Aug 22  2020 reflectasm-1.11.9.jar
-rw-r--r-- 1 tomcat tomcat  586620 Aug 22  2020 jedis-3.0.0.jar
-rw-r--r-- 1 tomcat tomcat  167294 Aug 22  2020 memcached-session-manager-2.3.2.jar
-rw-r--r-- 1 tomcat tomcat   10826 Aug 22  2020 memcached-session-manager-tc8-2.3.2.jar
-rw-r--r-- 1 tomcat tomcat  473774 Aug 22  2020 spymemcached-2.12.3.jar

[17:37:03 root@t1 tomcat]#systemctl restart tomcat.service
```

**配置 tomcat2**

```bash
#t2参考上面t1做配置
 <Manager className="de.javakaffee.web.msm.MemcachedBackupSessionManager"
    memcachedNodes="n1:192.168.10.82:11211,n2:192.168.10.83:11211"
    failoverNodes="n2"                                                              
    requestUriIgnorePattern=".*\.(ico|png|gif|jpg|css|js)$"
    transcoderFactoryClass="de.javakaffee.web.msm.serializer.kryo.KryoTranscoderFactory"/>
#将相关包传到lib/目录下
```

**查看tomcat日志**

```bash
[18:01:44 root@t2 tomcat]#cat logs/catalina.out
-  finished initialization:
- sticky: true
- operation timeout: 1000
- node ids: [n1]
- failover node ids: [n2]
- storage key prefix: null
- locking mode: null (expiration: 5s)
[18:02:05 root@t1 ~]#cat /usr/local/tomcat/logs/catalina.out 
-  finished initialization:
- sticky: true
- operation timeout: 1000
- node ids: [n2]
- failover node ids: [n1]
- storage key prefix: null
- locking mode: null (expiration: 5s)
```

#### 5.3.3.4 python测试脚本

在t1 上安装部署python3环境,访问memcached

```bash
[18:05:57 root@t1 ~]#yum install python3 python3-memcached
#准备python测试脚本
#!/usr/bin/python3
import memcache # pip install python-memcached
mc = memcache.Client(['192.168.10.82:11211','192.168.10.83:11211'], debug=True)
print('-' * 30) #查看全部 key
#for x in mc.get_stats('items'): # stats items 返回 items:5:number 1
#   print(x)
#print('-' * 30)
for x in mc.get_stats('cachedump 5 0'): 
    print(x)
```

## 5.4 non-sticky 模式

### 5.4.1 non-sticky 模式工作原理

non-sticky 模式即前端tomcat和后端memcached无关联(无粘性)关系

从msm 1.4.0之后版本开始支持non-sticky模式。

Tomcat session为中转Session，对每一个SessionID随机选中后端的memcached节点n1(或者n2)为主session，而另一个memcached节点n2(或者是n1)为备session。产生的新的Session会发送给主、备memcached，并清除本地Session。

后端两个memcached服务器对一个session来说是一个是主,一个是备,但对所有session信息来说每个memcached即是主同时也是备

如果n1下线，n2则转正。n1再次上线，n2依然是主Session存储节点

### 5.4.2 memcached配置

放到 $CATALINA_HOME/conf/context.xml 中

```bash
<Manager className="de.javakaffee.web.msm.MemcachedBackupSessionManager"
    memcachedNodes="n1:192.168.10.88:11211,n2:192.168.10.89:11211"
    sticky="false"
    sessionBackupAsync="false"
    lockingMode="uriPattern:/path1|/path2"
    requestUriIgnorePattern=".*\.(ico|png|gif|jpg|css|js)$"
    transcoderFactoryClass="de.javakaffee.web.msm.serializer.kryo.KryoTranscoderFactory"
    />
```

### 5.4.3 redis 配置

![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-3f9b5b81.png)

支持将session存放在Redis中,但当前对Redis的支持不允许连接到多个Redis节点,可以通过Redis的集群服务实现防止redis的单点失败

参考文档 :

[https://github.com/ran-jit/tomcat-cluster-redis-session-manager/wiki](https://github.com/ran-jit/tomcat-cluster-redis-session-manager/wiki)

[https://github.com/magro/memcached-session-manager/wiki/SetupAndConfiguration#example-for-non-sticky-sessions--kryo--redis](https://github.com/magro/memcached-session-manager/wiki/SetupAndConfiguration#example-for-non-sticky-sessions--kryo--redis)

![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-51f3f4d1.png)

**下载 jedis.jar，放到 $CATALINA_HOME/lib/ ，对应本次安装就是/usr/local/tomcat/lib。**

```bash
[15:07:49 root@tomcat1 ~]#yum install -y redis
[15:08:30 root@tomcat1 ~]#vim /etc/redis.conf
bind 0.0.0.0
[15:10:17 root@tomcat1 ~]#systemctl enable --now redis
```

**放到 $CATALINA_HOME/conf/context.xml 中**

```bash
<Manager className="de.javakaffee.web.msm.MemcachedBackupSessionManager"
    memcachedNodes="redis://redis.example.com"
    sticky="false"
    sessionBackupAsync="false"
    lockingMode="uriPattern:/path1|/path2"
    requestUriIgnorePattern=".*\.(ico|png|gif|jpg|css|js)$"
    transcoderFactoryClass="de.javakaffee.web.msm.serializer.kryo.KryoTranscoderFactory"
    />
```

**浏览器访问，使用redis相关工具可以观察到redis中的信息**

![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-049942ea.png)

### 5.4.4 实战案例: memcached 实现non-sticky模式

#### 5.4.4.1 修改tomcat配置

```bash
#在前面实验基础上修改,memcached配置不变,只需要修改tomcat配置
[15:15:17 root@tomcat1 tomcat]#vim conf/context.xml
 <Manager className="de.javakaffee.web.msm.MemcachedBackupSessionManager"
    memcachedNodes="n1:192.168.10.88:11211,n2:192.168.10.89:11211"
    sticky="false"
    sessionBackupAsync="false"
    lockingMode="uriPattern:/path1|/path2"
    requestUriIgnorePattern=".*\.(ico|png|gif|jpg|css|js)$"
    transcoderFactoryClass="de.javakaffee.web.msm.serializer.kryo.KryoTranscoderFactory"/>
[15:14:57 root@tomcat1 tomcat]#systemctl restart tomcat.service

#查看日志
-  finished initialization:
- sticky: false
- operation timeout: 1000
- node ids: [n1, n2]
- failover node ids: []
- storage key prefix: null
- locking mode: uriPattern:/path1|/path2 (expiration: 5s)

#t2和t1相同操作

#运行脚本查看key
[15:18:13 root@tomcat1 ~]#python3 py_memcached.py 
------------------------------
('192.168.10.88:11211 (1)', {'426C05715FA18C99CA2C7F4EC476D12A-n1.tomcat2': '[97 b; 1616141731 s]'})
('192.168.10.89:11211 (1)', {'bak:426C05715FA18C99CA2C7F4EC476D12A-n1.tomcat2': '[97 b; 1616141731 s]'})
#再次运行脚本后可以看到,t1为memcached的主节点,t2为备份节点
```

### 5.4.5 实战案例: redis 实现 non-sticky 模式的msm

![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-c8f2196f.png)

#### 5.4.5.1 上传redis库到tomcat服务器

```bash
[15:16:43 root@tomcat2 tomcat]#ll lib/jedis-3.0.0.jar
-rw-r--r-- 1 tomcat tomcat 586620 Aug 22  2020 lib/jedis-3.0.0.jar
```

#### 5.4.5.2 安装并配置 Redis 服务

```bash
[15:07:49 root@tomcat1 ~]#yum install -y redis
[15:08:30 root@tomcat1 ~]#vim /etc/redis.conf
bind 0.0.0.0
[15:10:17 root@tomcat1 ~]#systemctl enable --now redis
```

#### 5.4.5.3 修改tomcat 配置指定redis服务器地址

```bash
[15:32:47 root@tomcat1 tomcat]#vim conf/context.xml
 <Manager className="de.javakaffee.web.msm.MemcachedBackupSessionManager"
    memcachedNodes="redis://192.168.10.88:6379"  #和non-sticky的memcached相比,只修改此行
    sticky="false"                                                                  
    sessionBackupAsync="false"
    lockingMode="uriPattern:/path1|/path2"
    requestUriIgnorePattern=".*\.(ico|png|gif|jpg|css|js)$"
    transcoderFactoryClass="de.javakaffee.web.msm.serializer.kryo.KryoTranscoderFactory"/>


#查看日志
[15:36:06 root@tomcat1 tomcat]#cat logs/catalina.out
  finished initialization:
- sticky: false
- operation timeout: 1000
- node ids: []
- failover node ids: []
- storage key prefix: null
- locking mode: uriPattern:/path1|/path2 (expiration: 5s)
#t2和t1配置相同
```

#### 5.4.5.4 测试访问

浏览器刷新访问多次,主机轮询,但SessionID不变

![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-ee43c057.png)

**使用redis工具连接redis 查看SessionID**

```bash
[15:39:01 root@tomcat1 tomcat]#redis-cli
127.0.0.1:6379> KEYS *

1) "A531E5656BB9D23FA10F9433A7D0F517.tomcat2"
2) "validity:A531E5656BB9D23FA10F9433A7D0F517.tomcat2"
   127.0.0.1:6379> KEYS *
3) "A531E5656BB9D23FA10F9433A7D0F517.tomcat2"
4) "validity:C8EF4EA10928F7D77B58FEF5F597FD1C.tomcat1"
5) "C8EF4EA10928F7D77B58FEF5F597FD1C.tomcat1"
6) "validity:A531E5656BB9D23FA10F9433A7D0F517.tomcat2"
```

## 5.5 Session 问题方案总结

通过多组实验，使用不同技术实现了session持久机制

* session绑定，基于IP或session cookie的。其部署简单，尤其基于session黏性的方式，粒度小，对负载均衡影响小。但一旦后端服务器有故障，其上的session丢失。
* session复制集群，基于tomcat实现多个服务器内共享同步所有session。此方法可以保证任意一台后端服务器故障，其余各服务器上还都存有全部session，对业务无影响。但是它基于多播实现心跳，TCP单播实现复制，当设备节点过多，这种复制机制不是很好的解决方案。且并发连接多的时候，单机上的所有session占据的内存空间非常巨大，甚至耗尽内存。
* session服务器，将所有的session存储到一个共享的内存空间中，使用多个冗余节点保存session，这样做到session存储服务器的高可用，且占据业务服务器内存较小。是一种比较好的解决session持久的解决方案。

以上的方法都有其适用性。生产环境中，应根据实际需要合理选择。

不过以上这些方法都是在内存中实现了session的保持，可以使用数据库或者文件系统，把session数据存储起来，持久化。这样服务器重启后，也可以重新恢复session数据。不过session数据是有时效性的，是否需要这样做，视情况而定。

# 六、Tomcat 性能优化

在目前流行的互联网架构中，Tomcat在目前的网络编程中是举足轻重的，由于Tomcat的运行依赖于JVM，从虚拟机的角度把Tomcat的调整分为外部环境调优 JVM 和 Tomcat 自身调优两部分

## 6.1 JVM组成

```bash
[15:53:34 root@tomcat1 tomcat]#java -version
java version "1.8.0_281"
Java(TM) SE Runtime Environment (build 1.8.0_281-b09)
Java HotSpot(TM) 64-Bit Server VM (build 25.281-b09, mixed mode)
```

### 6.1.1 JVM组成

![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-3529c0ee.png)

**JVM 组成部分**

* 类加载子系统: 使用Java语言编写.java Source Code文件，通过javac编译成.class Byte Code文件。class loader类加载器将所需所有类加载到内存，必要时将类实例化成实例
* 运行时数据区: 最消耗内存的空间,需要优化
* 执行引擎: 包括JIT (JustInTimeCompiler)即时编译器, GC垃圾回收器
* 本地方法接口: 将本地方法栈通过JNI(Java Native Interface)调用Native Method Libraries, 比如:C,C++库等,扩展Java功能,融合不同的编程语言为Java所用

**JVM运行时数据区域由下面部分构成：**

* **Method Area 方法区(线程共享):** 所有线程共享的内存空间，存放已加载的类信息(构造方法,接口定义),常量(final),静态变量(static), 运行时常量池等。但实例变量存放在堆内存中. 从JDK8开始此空间由永久代改名为元空间
* **heap 堆(线程共享)：** 虚拟机启动时创建,存放创建的所有对象信息。如果对象无法申请到可用内存将抛出OOM异常.堆是靠GC垃圾回收器管理的,通过-Xmx -Xms 指定最大堆和最小堆空间大小
* **Java stack Java栈(线程私有)：** 每个线程会分配一个栈，存放java中8大基本数据类型,对象引用,实例的本地变量,方法参数和返回值等,基于FILO()（First In Last Out）,每个方法为一个栈帧
* **Program Counter Register PC寄存器(线程私有)：** 就是一个指针,指向方法区中的方法字节码,每一个线程用于记录当前线程正在执行的字节码指令地址。由执行引擎读取下一条指令.因为线程需要切换，当一个线程被切换回来需要执行的时候，知道执行到哪里了
* **Native Method stack 本地方法栈(线程私有)：** 为本地方法执行构建的内存空间，存放本地方法执行时的局部变量、操作数等。所谓本地方法，使用native 关健字修饰的方法,比如:Thread.sleep方法. 简单的说是非Java实现的方法，例如操作系统的C编写的库提供的本地方法，Java调用这些本地方法接口执行。但是要注意，本地方法应该避免直接编程使用，因为Java可能跨平台使用，如果用了Windows API，换到了Linux平台部署就有了问题

### 6.1.2 虚拟机

目前Oracle官方使用的是HotSpot， 它最早由一家名为"Longview Technologies"公司设计，使用了很多优秀的设计理念和出色的性能，1997年该公司被SUN公司收购。后来随着JDK一起发布了HotSpotVM。目前HotSpot是最主要的VM。

安卓程序需要运行在JVM上，而安卓平台使用了Google自研的Java虚拟机——Dalvid，适合于内存、处理器能力有限系统。

## 6.2 GC (Garbage Collection) 垃圾收集器

在堆内存中如果创建的对象不再使用,仍占用着内存,此时即为垃圾.需要即使进行垃圾回收,从而释放内存空间给其它对象使用

其实不同的开发语言都有垃圾回收问题,C,C++需要程序员人为回收,造成开发难度大,容易出错等问题,但执行效率高,而JAVA和Python中不需要程序员进行人为的回收垃圾,而由JVM或相关程序自动回收垃圾,减轻程序员的开发难度,但可能会造成执行效率低下

堆内存里面经常创建、销毁对象，内存也是被使用、被释放。如果不妥善处理，一个使用频繁的进程，可能会出现虽然有足够的内存容量，但是无法分配出可用内存空间，因为没有连续成片的内存了，内存全是碎片化的空间。

所以需要有合适的垃圾回收机制,确保正常释放不再使用的内存空间,还需要保证内存空间尽可能的保持

一定的连续

对于垃圾回收,需要解决三个问题

* 哪些是垃圾要回收
* 怎么回收垃圾
* 什么时候回收垃圾

### 6.2.1 Garbage 垃圾确定方法

* 引用计数: 每一个堆内对象上都与一个私有引用计数器，记录着被引用的次数，引用计数清零，该对象所占用堆内存就可以被回收。循环引用的对象都无法将引用计数归零，就无法清除。Python中即使用此种方式
* 根搜索(可达)算法 Root Searching

![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-ccf40a8c.png)

### 6.2.2 垃圾回收基本算法

#### 6.2.2.1 标记-清除 Mark-Sweep

分垃圾标记阶段和内存释放阶段。标记阶段，找到所有可访问对象打个标记。清理阶段，遍历整个堆，对未标记对象(即不再使用的对象)清理。

![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-c5cedb09.png)
![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-8a415768.png)

标记-清除最大的问题会造成内存碎片,但是效率很高,不浪费空间

#### 6.2.2.2 标记-压缩 (压实)Mark-Compact

分垃圾标记阶段和内存整理阶段。标记阶段，找到所有可访问对象打个标记。内存清理阶段时，整理时将对象向内存一端移动，整理后存活对象连续的集中在内存一端

![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-54345237.png)

标记-压缩算法好处是整理后内存空间连续分配，有大段的连续内存可分配，没有内存碎片。
缺点是内存整理过程有消耗,**效率相对低下**

#### 6.2.2.3 复制 Copying

先将可用内存分为大小相同两块区域A和B，每次只用其中一块，比如A。当A用完后，则将A中存活的对象复制到B。复制到B的时候连续的使用内存，最后将A一次性清除干净。

缺点是比较**浪费内存**，只能使用原来一半内存，因为内存对半划分了，复制过程毕竟也是有代价。

好处是没有碎片，复制过程中保证对象使用连续空间

#### 6.2.2.4 多种算法总结

**没有最好的算法,在不同场景选择最合适的算法**

* 效率: 复制算法>标记清除算法> 标记压缩算法
* 内存整齐度: 复制算法=标记压缩算法> 标记清除算法
* 内存利用率: 标记压缩算法=标记清除算法>复制算法

**STW**

对于大多数垃圾回收算法而言，GC线程工作时，停止所有工作的线程，称为Stop The World。GC 完成时，恢复其他工作线程运行。这也是JVM运行中最头疼的问题。

### 6.2.3 分代堆内存GC策略

上述垃圾回收算法都有优缺点，能不能对不同数据进行区分管理，不同分区对数据实施不同回收策略，分而治之。

#### 6.2.3.1 堆内存分代

**将heap内存空间分为三个不同类别: 年轻代、老年代、持久代**

![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-465c716a.png)
![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-62cedc58.png)
![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-8707e8e3.png)

**Heap堆内存分为**

* 年轻代Young：Young Generation
  * 伊甸园区eden: 只有一个,刚刚创建的对象
  * 幸存(存活)区Servivor Space：有2个幸存区，一个是from区，一个是to区。大小相等、地位相同、可互换。
    * from 指的是本次复制数据的源区
    * to 指的是本次复制数据的目标区
* 老年代Tenured：Old Generation, 长时间存活的对象

**默认空间大小比例:**

![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-08ec4701.png)

**永久代：** JDK1.7之前使用, 即Method Area方法区,保存JVM自身的类和方法,存储JAVA运行时的环境信息,JDK1.8后 改名为 MetaSpace,此空间不存在垃圾回收,关闭JVM会释放此区域内存,此空间物理上不属于heap内存,但逻辑上存在于heap内存

* 永久代必须指定大小限制,字符串常量JDK1.7存放在永久代,1.8后存放在heap中
* MetaSpace 可以设置,也可不设置,无上限

**规律: 一般情况99%的对象都是临时对象**

范例: 在tomcat 状态页可以看到以下的内存分代
![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-c21c84db.png)

**范例: 查看JVM内存分配情况**

```bash
[19:46:16 root@tomcat1 tomcat]#cat Heap.java 
public class Heap {
    public static void main(String[] args){
        //返回虚拟机试图使用的最大内存,字节单位
        long max = Runtime.getRuntime().maxMemory();
        //返回JVM初始化总内存
        long total = Runtime.getRuntime().totalMemory();

        System.out.println("max="+max+"字节\t"+(max/(double)1024/1024)+"MB");
        System.out.println("total="+total+"字节\t"+(total/(double)1024/1024)+"MB");
    }
}
[19:46:49 root@tomcat1 tomcat]#javac Heap.java 

[19:47:02 root@tomcat1 tomcat]#java -classpath . Heap
max=243269632字节	232.0MB
total=16252928字节	15.5MB

[19:48:07 root@tomcat1 tomcat]#java -XX:+PrintGCDetails -classpath . Heap
max=243269632字节	232.0MB
total=16252928字节	15.5MB
Heap
 def new generation   total 4928K, used 530K [0x00000000f1000000, 0x00000000f1550000, 0x00000000f6000000)
  eden space 4416K,  12% used [0x00000000f1000000, 0x00000000f1084b00, 0x00000000f1450000)
  from space 512K,   0% used [0x00000000f1450000, 0x00000000f1450000, 0x00000000f14d0000)
  to   space 512K,   0% used [0x00000000f14d0000, 0x00000000f14d0000, 0x00000000f1550000)
 tenured generation   total 10944K, used 0K [0x00000000f6000000, 0x00000000f6ab0000, 0x0000000100000000)
   the space 10944K,   0% used [0x00000000f6000000, 0x00000000f6000000, 0x00000000f6000200, 0x00000000f6ab0000)
 Metaspace       used 2525K, capacity 4486K, committed 4864K, reserved 1056768K
  class space    used 269K, capacity 386K, committed 512K, reserved 1048576K
[19:48:15 root@tomcat1 tomcat]#echo "scale=2;(4928+10944)/1024" |bc
15.50
#说明年轻代+老年代占用了所有heap空间, Metaspace实际不占heap空间,逻辑上存在于Heap
#默认JVM试图分配最大内存的总内存的1/4,初始化默认总内存为总内存的1/64
```

#### 6.2.3.2 年轻代回收 Minor GC

1. 起始时，所有新建对象(特大对象直接进入老年代)都出生在eden，当eden满了，启动GC。这个称为Young GC 或者 Minor GC。
2. 先标记eden存活对象，然后将存活对象复制到s0（假设本次是s0，也可以是s1，它们可以调换），eden剩余所有空间都清空。GC完成。
3. 继续新建对象，当eden满了，启动GC。
4. 先标记eden和s0中存活对象，然后将存活对象复制到s1。将eden和s0清空,此次GC完成
5. 继续新建对象，当eden满了，启动GC。
6. 先标记eden和s1中存活对象，然后将存活对象复制到s0。将eden和s1清空,此次GC完成

以后就重复上面的步骤。

通常场景下,大多数对象都不会存活很久，而且创建活动非常多，新生代就需要频繁垃圾回收。

但是，如果一个对象一直存活，它最后就在from、to来回复制，如果from区中对象复制次数达到阈值(默认15次,CMS为6次,可通过java的选项 -XX:MaxTenuringThreshold=N 指定)，就直接复制到老年代。

#### 6.2.3.3 老年代回收 Major GC

进入老年代的数据较少，所以老年代区被占满的速度较慢，所以垃圾回收也不频繁。

如果老年代也满了,会触发老年代GC,称为Old GC或者 Major GC。

由于老年代对象一般来说存活次数较长，所以较常采用标记-压缩算法。

当老年代满时,会触发 Full GC,即对所有"代"的内存进行垃圾回收

Minor GC比较频繁，Major GC较少。但一般Major GC时，由于老年代对象也可以引用新生代对象，所以先进行一次Minor GC，然后在Major GC会提高效率。可以认为回收老年代的时候完成了一次FullGC。

所以可以认为 MajorGC = FullGC

#### 6.2.3.4 GC 触发条件

![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-9fa590c8.png)

**Minor GC 触发条件：当eden区满了触发**

**Full GC 触发条件：**

* 老年代满了
* System.gc()手动调用。不推荐

**年轻代:**

* 存活时长低
* 适合复制算法

**老年代:**

* 区域大,存活时长高
* 适合标记清除和标记压缩算法

### 6.2.4 java 内存调整相关参数

#### 6.2.4.1 JVM 内存常用相关参数

Java 命令行参考文档: [https://docs.oracle.com/javase/8/docs/technotes/tools/unix/java.html](https://docs.oracle.com/javase/8/docs/technotes/tools/unix/java.html)

![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-9df03a85.png)

帮助：man java

**选项分类**

* -选项名称 此为标准选项,所有HotSpot都支持
* -X选项名称 此为稳定的非标准选项
* -XX:选项名称 非标准的不稳定选项，下一个版本可能会取消

![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-b5476ed5.png)

**范例: 查看java的选项帮助**

```bash
#查看java命令标准选项
[19:54:24 root@tomcat1 ~]#java
#查看java的非标准选项
[19:54:24 root@tomcat1 ~]#java -X
#查看所有不稳定选项的当前生效值
[19:55:31 root@tomcat1 ~]#java -XX:+PrintFlagsFinal
#查看所有不稳定选项的默认值
[19:56:02 root@tomcat1 ~]#java -XX:+PrintFlagsInitial
#查看当前命令行的使用的选项设置
[19:56:40 root@tomcat1 ~]#java -XX:+PrintCommandLineFlags
-XX:InitialHeapSize=15598016 -XX:MaxHeapSize=249568256 -XX:+PrintCommandLineFlags -XX:+UseCompressedClassPointers -XX:+UseCompressedOops 
#上面的-XX:+UseParallelGC 说明当前使用Parallel Scavenge + Parallel Old
```

**范例: 查看OOM**

```bash
[19:58:38 root@tomcat1 ~]#cat HeapOom2.java 
import java. util. Random;
public class HeapOom2 {
	public static void main(String[] args) {
		String str = "I am lao wang";
		while (true){
			str += str + new Random().nextInt(88888888);
		}
	}
}

[19:58:47 root@tomcat1 ~]#javac HeapOom2.java 
[20:03:02 root@tomcat1 ~]#java  -Xms100m -Xmx100m -XX:+PrintGCDetails -classpath . HeapOom2 
[GC (Allocation Failure) [DefNew: 27099K->2929K(30720K), 0.0128489 secs] 27099K->5601K(99008K), 0.0128768 secs] [Times: user=0.00 sys=0.02, real=0.01 secs] 
[GC (Allocation Failure) [DefNew: 30190K->0K(30720K), 0.0503294 secs] 32862K->13617K(99008K), 0.0503605 secs] [Times: user=0.00 sys=0.02, real=0.05 secs] 
[GC (Allocation Failure) [DefNew: 10688K->0K(30720K), 0.0436912 secs] 24305K->24305K(99008K), 0.0437188 secs] [Times: user=0.00 sys=0.03, real=0.05 secs] 
[GC (Allocation Failure) [DefNew: 21376K->0K(30720K), 0.0688476 secs] 45681K->45681K(99008K), 0.0688720 secs] [Times: user=0.00 sys=0.06, real=0.07 secs] 
[GC (Allocation Failure) [DefNew: 21844K->0K(30720K), 0.0844690 secs] 67525K->67057K(99008K), 0.0844960 secs] [Times: user=0.00 sys=0.05, real=0.08 secs] 
[GC (Allocation Failure) [DefNew: 21376K->21376K(30720K), 0.0000175 secs][Tenured: 67057K->34992K(68288K), 0.0102542 secs] 88433K->34992K(99008K), [Metaspace: 2479K->2479K(1056768K)], 0.0104149 secs] [Times: user=0.01 sys=0.00, real=0.01 secs] 
[Full GC (Allocation Failure) [Tenured: 34992K->32307K(68288K), 0.0067376 secs] 34992K->32307K(99008K), [Metaspace: 2479K->2479K(1056768K)], 0.0067600 secs] [Times: user=0.00 sys=0.01, real=0.00 secs] 
Exception in thread "main" java.lang.OutOfMemoryError: Java heap space
	at java.util.Arrays.copyOf(Arrays.java:3332)
	at java.lang.AbstractStringBuilder.ensureCapacityInternal(AbstractStringBuilder.java:124)
	at java.lang.AbstractStringBuilder.append(AbstractStringBuilder.java:674)
	at java.lang.StringBuilder.append(StringBuilder.java:208)
	at HeapOom2.main(HeapOom2.java:6)
Heap
 def new generation   total 30720K, used 1038K [0x00000000f9c00000, 0x00000000fbd50000, 0x00000000fbd50000)
  eden space 27328K,   3% used [0x00000000f9c00000, 0x00000000f9d03928, 0x00000000fb6b0000)
  from space 3392K,   0% used [0x00000000fba00000, 0x00000000fba00000, 0x00000000fbd50000)
  to   space 3392K,   0% used [0x00000000fb6b0000, 0x00000000fb6b0000, 0x00000000fba00000)
 tenured generation   total 68288K, used 32307K [0x00000000fbd50000, 0x0000000100000000, 0x0000000100000000)
   the space 68288K,  47% used [0x00000000fbd50000, 0x00000000fdcdcc80, 0x00000000fdcdce00, 0x0000000100000000)
 Metaspace       used 2513K, capacity 4486K, committed 4864K, reserved 1056768K
  class space    used 268K, capacity 386K, committed 512K, reserved 1048576K
```

#### 6.2.4.2 JDK 工具监控使用情况

Jprofiler定位OOM的问题原因

JProfiler官网：[http://www.ej-technologies.com/products/jprofiler/overview.html](http://www.ej-technologies.com/products/jprofiler/overview.html)

JProfiler是一款功能强大的Java开发分析工具，它可以快速的帮助用户分析出存在的错误，软件还可对需要的显示类进行标记，包括了内存的分配情况和信息的视图等

**范例: 安装jprofiler工具定位OOM原因和源码问题的位置**

```bash
#安装OpenJDK
[root@centos8 ~]#dnf -y install java-1.8.0-openjdk-devel

[20:10:38 root@tomcat1 ~]#java  -Xms100m -Xmx100m -XX:+HeapDumpOnOutOfMemoryError -classpath . HeapOom2 
java.lang.OutOfMemoryError: Java heap space
Dumping heap to java_pid7118.hprof ...
Heap dump file created [33830224 bytes in 0.135 secs]
Exception in thread "main" java.lang.OutOfMemoryError: Java heap space
	at java.util.Arrays.copyOf(Arrays.java:3332)
	at java.lang.AbstractStringBuilder.ensureCapacityInternal(AbstractStringBuilder.java:124)
	at java.lang.AbstractStringBuilder.append(AbstractStringBuilder.java:674)
	at java.lang.StringBuilder.append(StringBuilder.java:208)
	at HeapOom2.main(HeapOom2.java:6)
[20:10:41 root@tomcat1 ~]#ls
HeapOom2.class  HeapOom2.java  java_pid7118.hprof
```

下载并安装Jprofiler
![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-f0d560db.png)
![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-c804d7d8.png)

#### 6.2.4.3 Tomcat的JVM参数设置

默认不指定，-Xmx大约使用了1/4的内存，当前本机内存指定约为1G。

在bin/catalina.sh中增加一行

```bash
......
# OS specific support. $var _must_ be set to either true or false.
#添加下面一行
JAVA_OPTS="-server -Xms128m -Xmx512m -XX:NewSize=48m -XX:MaxNewSize=200m"
                                                           
cygwin=false
darwin=false
........

-server：VM运行在server模式，为在服务器端最大化程序运行速度而优化
-client：VM运行在Client模式，为客户端环境减少启动时间而优化
```

重启 Tomcat 观察

```bash
[14:27:11 root@tomcat1 tomcat]#ps aux | grep tomcat
tomcat      1636 23.8 22.7 2520556 221596 ?      Sl   14:25   0:19 /usr/local/jdk/bin/java -Djava.util.logging.config.file=/usr/local/tomcat/conf/logging.properties -Djava.util.logging.manager=org.apache.juli.ClassLoaderLogManager -server -Xms128m -Xmx512m -XX:NewSize=48m -XX:MaxNewSize=200m -Djdk.tls.ephemeralDHKeySize=2048 -Djava.protocol.handler.pkgs=org.apache.catalina.webresources -Dorg.apache.catalina.security.SecurityListener.UMASK=0027 -Dignore.endorsed.dirs= -classpath /usr/local/tomcat/bin/bootstrap.jar:/usr/local/tomcat/bin/tomcat-juli.jar -Dcatalina.base=/usr/local/tomcat -Dcatalina.home=/usr/local/tomcat -Djava.io.tmpdir=/usr/local/tomcat/temp org.apache.catalina.startup.Bootstrap start
root        1686  0.0  0.1  12112  1080 pts/0    R+   14:27   0:00 grep --color=auto tomcat
```

浏览器访问server status页面，可以看到以下页面
![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-b3c6c3f5.png)

### 6.2.5 垃圾收集方式

**按工作模式不同：指的是GC线程和工作线程是否一起运行**

* 独占垃圾回收器：只有GC在工作，STW 一直进行到回收完毕，工作线程才能继续执行
* 并发垃圾回收器：让GC线程垃圾回收某些阶段可以和工作线程一起进行,如:标记阶段并行,回收阶段仍然串行

**按回收线程数：指的是GC线程是否串行或并行执行**

* 串行垃圾回收器：一个GC线程完成回收工作
* 并行垃圾回收器：多个GC线程同时一起完成回收工作，充分利用CPU资源

![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-778640be.png)

### 6.2.6 调整策略

**对JVM调整策略应用极广**

* 在WEB领域中Tomcat等
* 在大数据领域Hadoop生态各组件
* 在消息中间件领域的Kafka等
* 在搜索引擎领域的ElasticSearch、Solr等

**注意: 在不同领域和场景对JVM需要不同的调整策略**

* 减少 STW 时长，串行变并行
* 减少 GC 次数，要分配合适的内存大小

**一般情况下，我们大概可以使用以下原则：**

* 客户端或较小程序，内存使用量不大，可以使用串行回收
* 对于服务端大型计算，可以使用并行回收
* 大型WEB应用，用户端不愿意等待，尽量少的STW，可以使用并发回收

### 6.2.7 垃圾回收器

#### 6.2.7.1 常用垃圾回收器

![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-7e9c2d34.png)

按分代设置不同垃圾回收器

**新生代**

* 新生代串行收集器Serial：单线程、独占式串行，采用复制算法,简单高效但会造成STW
  ![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-8e8c84ff.png)
* 新生代并行回收收集器PS(Parallel Scavenge)：多线程并行、独占式，会产生STW, 使用复制算法
  
  * 关注调整吞吐量,此收集器关注点是达到一个可控制的吞吐量
  * 吞吐量 = 运行用户代码时间/（运行用户代码时间+垃圾收集时间），比如虚拟机总共运行100分钟，其中垃圾回收花掉1分钟，那吞吐量就是99%。
  * 高吞吐量可以高效率利用CPU时间，尽快完成运算任务，主要适合在后台运算而不需要太多交互的任务。
  * 除此之外，Parallel Scavenge 收集器具有自适应调节策略，它可以将内存管理的调优任务交给虚拟机去完成。自适应调节策略也是Parallel Scavenge与 ParNew 收集器的一个重要区别。
  * 和ParNew不同,PS不可以和老年代的CMS组合
* 新生代并行收集器ParNew：就是Serial 收集器的多线程版,将单线程的串行收集器变成了多线程并行、独占式,使用复制算法,相当于PS的改进版
  
  * 经常和CMS配合使用,关注点是尽可能地缩短垃圾收集时用户线程的停顿时间，适合需要与用户交互的程序，良好的响应速度能提升用户体验
    ![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-52ad56d3.png)
    老年代：
* 老年代串行收集器Serial Old：Serial Old是Serial收集器的老年代版本,单线程、独占式串行，回收算法使用标记压缩
* 老年代并行回收收集器Parallel Old：多线程、独占式并行，回收算法使用标记压缩，关注调整吞吐量
  
  * Parallel Old收集器是Parallel Scavenge 收集器的老年代版本，这个收集器是JDK1.6之后才开始提供，从HotSpot虚拟机的垃圾收集器的图中也可以看出，Parallel Scavenge 收集器无法与CMS收集器配合工作,因为一个是为了吞吐量，一个是为了客户体验（也就是暂停时间的缩短）
* CMS (Concurrent Mark Sweep并发标记清除算法) 收集器
  
  * 在某些阶段尽量使用和工作线程一起运行，减少STW时长(200ms以内), 提升响应速度,是互联网服务端BS系统上较佳的回收算法
  * 分为4个阶段：初始标记、并发标记、重新标记、并发清除，在初始标记、重新标记时需要STW。
    ![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-d9a997c7.png)

1. 初始标记：此过程需要STW（Stop The Word），只标记一下GC Roots能直接关联到的对象，速度很快。
2. 并发标记：就是GC Roots进行扫描可达链的过程，为了找出哪些对象需要收集。这个过程远远慢于初始标记，但它是和用户线程一起运行的，不会出现STW，所有用户并不会感受到。
3. 重新标记：为了修正在并发标记期间，用户线程产生的垃圾，这个过程会比初始标记时间稍微长一点，但是也很快，和初始标记一样会产生STW。
4. 并发清理：在重新标记之后，对现有的垃圾进行清理，和并发标记一样也是和用户线程一起运行的，耗时较长（和初始标记比的话），不会出现STW。
5. 由于整个过程中，耗时最长的并发标记和并发清理都是与用户线程一起执行的，所以总体上来说，CMS收集器的内存回收过程是与用户线程一起并发执行的。

以下收集器不再按明确的分代单独设置

* **G1(Garbage First)收集器**
  * 是最新垃圾回收器，从JDK1.6实验性提供，JDK1.7发布，其设计目标是在多处理器、大内存服务器端提供优于CMS收集器的吞吐量和停顿控制的回收器。JDK9将G1设为默认的收集器,建议 JDK9版本以后使用。
  * 基于标记压缩算法,不会产生大量的空间碎片，有利于程序的长期执行。
  * 分为4个阶段：初始标记、并发标记、最终标记、筛选回收。并发标记并发执行，其它阶段STW只有GC线程并行执行。
  * G1收集器是面向服务端的收集器，它的思想就是首先回收尽可能多的垃圾（这也是GarbageFirst名字的由来）
  * G1能充分的利用多CPU，多核环境下的硬件优势，使用多个CPU来缩短STW停顿的时间(10ms以内)。
  * 可预测的停顿：这是G1相对于CMS的另一大优势，G1和CMS一样都是关注于降低停顿时间，但是G1能够让使用者明确的指定在一个M毫秒的时间片段内，消耗在垃圾收集的时间不得超过N毫秒。
  * 通过此选项指定: +UseG1GC
* ZGC收集器: 减少SWT时长(1ms以内), 可以PK C++的效率,目前实验阶段
* Shenandoah收集器: 和ZGC竞争关系,目前实验阶段
* Epsilon收集器: 调试 JDK 使用,内部使用,不用于生产环境

JVM 1.8 默认的垃圾回收器：PS + ParallelOld,所以大多数都是针对此进行调优

#### 6.2.7.2 垃圾收集器设置

优化调整Java 相关参数的目标: 尽量减少FullGC和STW

通过以下选项可以单独指定新生代、老年代的垃圾收集器

* -server 指定为Server模式,也是默认值,一般使用此工作模式
* -XX:+UseSerialGC
  * 运行在Client模式下，新生代是Serial, 老年代使用SerialOld
* -XX:+UseParNewGC
  * 新生代使用ParNew，老年代使用SerialOld
* -XX:+UseParallelGC
  * 运行于server模式下，新生代使用Serial Scavenge, 老年代使用SerialOld
* -XX:+UseParallelOldGC
  * 新生代使用Paralell Scavenge, 老年代使用Paralell Old
  * -XX:ParallelGCThreads=N，在关注吞吐量的场景使用此选项增加并行线程数
* -XX:+UseConcMarkSweepGC
  * 新生代使用ParNew, 老年代优先使用CMS，备选方式为Serial Old
  * 响应时间要短，停顿短使用这个垃圾收集器
  * -XX:CMSInitiatingOccupancyFraction=N，N为0-100整数表示达到老年代的大小的百分比多少触发回收
    * 默认68
  * -XX:+UseCMSCompactAtFullCollection 开启此值,在CMS收集后，进行内存碎片整理
  * -XX:CMSFullGCsBeforeCompaction=N 设定多少次CMS后，进行一次内存碎片整理
  * -XX:+CMSParallelRemarkEnabled 降低标记停顿

**范例:**

```bash
-XX:+UseConcMarkSweepGC -XX:CMSInitiatingOccupancyFraction=80 -
XX:+UseCMSCompactAtFullCollection -XX:CMSFullGCsBeforeCompaction=5
```

**范例: 查看默认模式**

```bash
[14:27:13 root@tomcat1 tomcat]#java |& grep '-server'
-server	  to select the "server" VM
The default VM is server.
[14:47:13 root@tomcat1 tomcat]#tail -n 2 /usr/local/jdk/jre/lib/amd64/jvm.cfg
-server KNOWN
-client IGNORE
```

**范例: 指定垃圾回收设置**

```bash
#将参数加入到bin/catalina.sh中，重启观察Tomcat status。老年代已经使用CMS
[14:54:17 root@tomcat1 tomcat]#vim bin/catalina.sh
JAVA_OPTS="-server -Xms128m -Xmx512m -XX:NewSize=48m -XX:MaxNewSize=200m -XX:+UseConcMarkSweepGC -XX:+UseCMSCompactAtFullCollection -XX:CMSFullGCsBeforeCompaction=5"
[14:54:33 root@tomcat1 tomcat]#systemctl restart tomcat.service
[14:54:53 root@tomcat1 tomcat]#ps aux | grep tomcat
tomcat      1839 97.6 19.4 2551188 189360 ?      Sl   14:54   0:07 /usr/local/jdk/bin/java -Djava.util.logging.config.file=/usr/local/tomcat/conf/logging.properties -Djava.util.logging.manager=org.apache.juli.ClassLoaderLogManager -server -Xms128m -Xmx512m -XX:NewSize=48m -XX:MaxNewSize=200m -XX:+UseConcMarkSweepGC -XX:+UseCMSCompactAtFullCollection -XX:CMSFullGCsBeforeCompaction=5 -Djdk.tls.ephemeralDHKeySize=2048 -Djava.protocol.handler.pkgs=org.apache.catalina.webresources -Dorg.apache.catalina.security.SecurityListener.UMASK=0027 -Dignore.endorsed.dirs= -classpath /usr/local/tomcat/bin/bootstrap.jar:/usr/local/tomcat/bin/tomcat-juli.jar -Dcatalina.base=/usr/local/tomcat -Dcatalina.home=/usr/local/tomcat -Djava.io.tmpdir=/usr/local/tomcat/temp org.apache.catalina.startup.Bootstrap start
```

![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-d86769c2.png)

**开启垃圾回收输出统计信息,适用于调试环境的相关选项**

* -XX:+PrintGC 输出GC信息
* -XX:+PrintGCDetails 输出GC详细信息
* -XX:+PrintGCTimeStamps 与前两个组合使用，在信息上加上一个时间戳
* -XX:+PrintHeapAtGC 生成GC前后椎栈的详细信息，日志会更大

**注意: 以上适用调试环境，生产环境请移除这些参数，否则有非常多的日志输出**

## 6.3 JVM相关工具

### 6.3.1 JVM 工具概述

$JAVA_HOME/bin下

![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-c972a5a9.png)

### 6.3.2 jps

JVM 进程状态工具

格式

```bash
jps：Java virutal machine Process Status tool，
jps [-q] [-mlvV] [< hostid>]
-q：静默模式；
-v：显示传递给jvm的命令行参数；
-m：输出传入main方法的参数；
-l：输出main类或jar完全限定名称；
-v：显示通过flag文件传递给jvm的参数；
[< hostid>]：主机id，默认为localhost；
```

### 6.3.3 jinfo

输出给定的java进程的所有配置信息

格式:

```bash
jinfo [option] < pid>
-flags：打印 VM flags
-sysprops：to print Java system properties
-flag < name>：to print the value of the named VM flag
```

### 6.3.4 jstat

输出指定的java进程的统计信息

格式:

```bash
jstat -help|-options
jstat -< option> [-t] [-h< lines>] < vmid> [< interval> [< count>]]
[< interval> [< count>]]
interval：时间间隔，单位是毫秒；
count：显示的次数；
#返回可用统计项列表
#jstat -options
-class：class loader
-compiler：JIT
-gc：gc
-gccapacity：统计堆中各代的容量
-gccause：
-gcmetacapacity
-gcnew：新生代
-gcnewcapacity
-gcold：老年代
```

**范例：**

```bash
[15:19:58 root@tomcat1 ~]#jps
2708 Jps
2606 HelloWorld
[15:20:04 root@tomcat1 ~]#jstat -gc 2606
S0C    S1C    S0U    S1U      EC       EU        OC         OU       MC     MU    CCSC   CCSU   YGC     YGCT    FGC    FGCT     GCT
512.0  512.0   0.0    0.0    4416.0   442.4    10944.0      0.0     4480.0 875.3  384.0   76.6       0    0.000   0      0.000    0.000
S0C:S0区容量
YGC：新生代的垃圾回收次数
YGCT：新生代垃圾回收消耗的时长；
FGC：Full GC的次数
FGCT：Full GC消耗的时长
GCT：GC消耗的总时长
#3次，一秒一次
[15:21:21 root@tomcat1 ~]#jstat -gcnew 2606 1000 3
```

### 6.3.5 jstack

程序员常用堆栈情况查看工具

jstack：查看指定的java进程的线程栈的相关信息

格式:

```bash
jstack [-l] < pid>
jstack -F [-m] [-l] < pid>
-l：long listings，会显示额外的锁信息，因此，发生死锁时常用此选项
-m：混合模式，既输出java堆栈信息，也输出C/C++堆栈信息
-F：当使用"jstack -l PID"无响应，可以使用-F强制输出信息
```

### 6.3.6 jmap

Memory Map, 用于查看堆内存的使用状态

```bash
#查看进程堆内存情况
[root@tomcat ~]#jmap -heap 21407
```

### 6.3.7 jhat

Java Heap Analysis Tool 堆分析工具

格式

```bash
jmap [option]
#查看堆空间的详细信息：
jmap -heap
```

## 6.4 Tomcat 性能优化常用配置

### 6.4.1 内存空间优化

```bash
JAVA_OPTS="-server -Xms4g -Xmx4g -XX:NewSize= -XX:MaxNewSize= "
-server：服务器模式
-Xms：堆内存初始化大小
-Xmx：堆内存空间上限
-XX:NewSize=：新生代空间初始化大小
-XX:MaxNewSize=：新生代空间最大值
```

**生产案例：**

```bash
[root@centos8 ~]#vim /usr/local/tomcat/bin/catalina.sh
JAVA_OPTS="-server -Xms4g -Xmx4g -Xss512k -Xmn1g -
XX:CMSInitiatingOccupancyFraction=65 -XX:+AggressiveOpts -XX:+UseBiasedLocking -XX:+DisableExplicitGC
-XX:MaxTenuringThreshold=10 -XX:NewRatio=2
-XX:PermSize=128m -XX:MaxPermSize=512m -XX:CMSFullGCsBeforeCompaction=5
-XX:+ExplicitGCInvokesConcurrent -XX:+UseConcMarkSweepGC -XX:+UseParNewGC
-XX:+CMSParallelRemarkEnabled -XX:+UseCMSCompactAtFullCollection
-XX:LargePageSizeInBytes=128m -XX:+UseFastAccessorMethods"

#一台tomcat服务器并发连接数不高,生产建议分配物理内存通常4G到8G较多,如果需要更多连接,一般会利用
虚拟化技术实现多台tomcat
```

### 6.4.2 线程池调整

```bash
[root@centos8 ~]#vim /usr/local/tomcat/conf/server.xml
< Connector port="8080" protocol="HTTP/1.1"  connectionTimeout="20000"
redirectPort="8443" />
```

**常用属性：**

* connectionTimeout ：连接超时时长,单位ms
* maxThreads：最大线程数，默认200
* minSpareThreads：最小空闲线程数
* maxSpareThreads：最大空闲线程数
* acceptCount：当启动线程满了之后，等待队列的最大长度，默认100
* URIEncoding：URI 地址编码格式，建议使用 UTF-8
* enableLookups：是否启用客户端主机名的DNS反向解析，缺省禁用，建议禁用，就使用客户端IP就行
* compression：是否启用传输压缩机制，建议 "on"，CPU和流量的平衡
  * compressionMinSize：启用压缩传输的数据流最小值，单位是字节
  * compressableMimeType：定义启用压缩功能的MIME类型text/html, text/xml, text/css,text/javascript

### 6.4.3 Java压力测试工具

PerfMa 致力于打造一站式IT系统稳定性保障解决方案，专注于性能评测与调优、故障根因定位与解决，为企业提供一系列技术产品与专家服务，提升系统研发与运行质量。

```bash
#社区产品
https://opts.console.perfma.com/
```

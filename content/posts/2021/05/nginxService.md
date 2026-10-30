---
title: "nginx服务"
date: 2021-05-17T16:39:14+08:00
lastmod: 2021-05-17T16:40:53+08:00
draft: false
description: "从 Web 服务基础讲到 Nginx 的安装、虚拟主机、反向代理与负载均衡配置。"
cover: "https://b3logfile.com/bing/20210211.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["应用服务"]
tags: ["nginx"]
toc: true
---
# 一、Web服务基础介绍

正常情况下的单次web服务访问流程

![image-20210324191923061](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210324191923061.png)

## **1.1** 互联网发展历程回顾

1993年3⽉2⽇，中国科学院⾼能物理研究所租⽤AT&T公司(美国电话电报公司)的国际卫星信道建⽴的接⼊美国SLAC国家实验室的64K专线正式开通，成为我国连⼊Internet的第⼀根专线。

http://www.ihep.cas.cn/kxcb/kpcg/jsywl/201407/t20140714_4156699.html

## **1.2** **web**服务介绍

Netcraft公司于1994年底在英国成⽴，多年来⼀直致⼒于互联⽹市场以及在线安全⽅⾯的咨询服务，其中在国际上最具影响⼒的当属其针对⽹站服务器，域名解析/主机提供商，以及SSL市场所做的客观严谨的分析研究。

https://news.netcraft.com/

![image-20210324191932245](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210324191932245.png)

### **1.2.1** **Apace-**早期的**web**服务端

Apache起初由美国的伊利诺伊⼤学⾹槟分校的国家超级计算机应⽤中⼼开发，⽬前经历了两⼤版本分别是1.X和2.X，其可以通过编译安装实现特定的功能，⽬前⽀持三种不同的MPM(multi-processingmodule,多进程处理模块，官⽅⽹站：http://www.apache.org。

#### **1.2.1.1** **Apache prefork**模型

预派⽣模式，有⼀个主控制进程，然后⽣成多个⼦进程，使⽤select模型，最⼤并发1024，每个⼦进程有⼀个独⽴的线程响应⽤户请求，相对⽐较占⽤内存，但是⽐较稳定，可以设置最⼤和最⼩进程数，是最古⽼的⼀种模式，也是最稳定的模式，适⽤于访问量不是很⼤的场景。

**优点：**稳定

**缺点：**⼤量⽤户访问慢，占⽤资源，1024个进程不适⽤于⾼并发场景

![image-20210324191940015](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210324191940015.png)

#### 1.2.1.2   Apache woker模型

⼀种多进程和多线程混合的模型，有⼀个控制进程，启动多个⼦进程，每个⼦进程⾥⾯包含固定的线程，使⽤线程程来处理请求，当线程不够使⽤的时候会再启动⼀个新的⼦进程，然后在进程⾥⾯再启动线程处理请求，由于其使⽤了线程处理请求，因此可以承受更⾼的并发。

**优点：**相⽐prefork 占⽤的内存较少，可以同时处理更多的请求

**缺点：**使⽤keepalive的⻓连接⽅式，某个线程会⼀直被占据，即使没有传输数据，也需要⼀直等待到超时才会被释放。如果过多的线程，被这样占据，也会导致在⾼并发场景下的⽆服务线程可⽤。（该问题在prefork模式下，同样会发⽣）

![image-20210324191946142](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210324191946142.png)

#### 1.2.1.3  Apache event模型

Apache中最新的模式，2012年发布的apache 2.4.X系列正式⽀持event 模型，属于事件驱动模型(epoll)，每个进程响应多个请求，在现在版本⾥的已经是稳定可⽤的模式。它和worker模式很像，最⼤的区别在于，它解决了keepalive场景下，⻓期被占⽤的线程的资源浪费问题（某些线程因为被keepalive，空挂在哪⾥等待，中间⼏乎没有请求过来，甚⾄等到超时）。event MPM中，会有⼀个专⻔的线程来管理这些keepalive类型的线程，当有真实请求过来的时候，将请求传递给服务线程，执⾏完毕后，⼜允许它释放。这样增强了⾼并发场景下的请求处理能⼒。

**优点：**单线程响应多请求，占据更少的内存，⾼并发下表现更优秀，会有⼀个专⻔的线程来管理keep-alive类型的线程，当有真实请求过来的时候，将请求传递给服务线程，执⾏完毕后，⼜允许它释放

**缺点：**没有线程安全控制

![image-20210324191956701](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210324191956701.png)

### **1.2.2** Nginx-高性能的web服务端

Nginx是由1994年毕业于俄罗斯国⽴莫斯科鲍曼科技⼤学的⼯程师伊⼽尔·⻄索夫(Igor Sysoev)为俄罗斯rambler.ru公司开发的，开发⼯作最早从2002年开始，第⼀次公开发布时间是2004年10⽉4日，版本号是0.1.0，官⽹地址 www.nginx.org

Nginx历经⼗⼏年的迭代更新（https://nginx.org/en/CHANGES）， ⽬前功能已经⾮常完善且运⾏稳定，另外Nginx的版本分为开发版、稳定版和过期版，Nginx以功能丰富著称，它即可以作为http服务器，也可以作为反向代理服务器或者邮件服务器，能够快速的响应静态⽹⻚的请求，⽀持FastCGI/SSL/Virtual Host/URL Rwrite/Gzip/HTTP Basic Auth/http或者TCP的负载均衡(1.9版本以上且开启stream模块)等功能，并且⽀持第三⽅的功能扩展。

为什么使⽤Nginx：
天猫 淘宝 小米 163 京东新浪等⼀线互联⽹公司都在⽤Nginx或者进⾏⼆次开发

基于Nginx的访问流程如下：![image-20210323091613182](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210324192004427.png)

### **1.2.3** 用户访问体验统计

互联网存在⽤户速度体验的1-3-10原则，即1秒最优，1-3秒较优，3~10秒⽐较慢，10秒以上⽤户⽆法接受。⽤户放弃⼀个产品的代价很低，只是换⼀个URL而已。

```bash
http://baijiahao.baidu.com/s?id=1643187950686234006&wfr=spider&for=pc #⽤户体验的重要性
http://www.sohu.com/a/218426004_573333
```

### **1.2.4** 性能影响

有很多研究都表明，性能对⽤户的⾏为有很⼤的影响：
79%的⽤户表示不太可能再次打开⼀个缓慢的⽹站
47%的⽤户期望⽹⻚能在2秒钟以内加载
40%的⽤户表示如果加载时间超过三秒钟，就会放弃这个⽹站
页面加载时间延迟⼀秒可能导致转换损失7%，⻚⾯浏览量减少11%
8秒定律：⽤户访问⼀个⽹站时，如果等待⽹⻚打开的时间超过8秒，会有超过30%的⽤户放弃等待

#### **1.2.4.1** 影响用户体验的几个因素

据说⻢云在刚开始创业在给客户演示时，打开⼀个⽹站花了两个多⼩时。
https://www.shuimiao.net/NjHaO/

```bash
客户端硬件配置
客户端⽹络速率
客户端与服务端距离

服务端⽹络速率
服务端硬件配置
服务端架构设计
服务端应⽤程序⼯作模式
服务端并发数量
服务端响应⽂件⼤⼩及数量
服务端I/O压⼒
```

#### **1.2.4.2** 应用程序工作模式

Apache HTTP Server与Nginx的⼯作模式

##### **1.2.4.2.1 Centos**安装**Apache**

```bash
httpd MPM（Multi-Processing Module，多进程处理模块）模式:
prefork：进程模型，两级结构，主进程master负责⽣成⼦进程，每个⼦进程负责响应⼀个请求
worker：线程模型，三级结构，主进程master负责⽣成⼦进程，每个⼦进程负责⽣成多个线程，每个线程响应⼀个请求
event：线程模型，三级结构,主进程master负责⽣成⼦进程，每个⼦进程⽣成多个线程，每个线程响应⼀个请求，但是增加了⼀个监听线程，⽤于解决在设置了keep-alived场景下线程的空等待问题。

#Centos 7.x⽬前默认为prefork模式，ubuntu 18.04已经使⽤event模式
[19:48:52 root@centos7 ~]#httpd -V   #Centos系统
AH00558: httpd: Could not reliably determine the server's fully qualified domain name, using fe80::6387:7c93:e6b8:685. Set the 'ServerName' directive globally to suppress this message
Server version: Apache/2.4.6 (CentOS)
Server built:   Nov 16 2020 16:18:20
Server's Module Magic Number: 20120211:24
Server loaded:  APR 1.4.8, APR-UTIL 1.5.2
Compiled using: APR 1.4.8, APR-UTIL 1.5.2
Architecture:   64-bit
Server MPM:     prefork   #MPM模式为prefork
  threaded:     no
#Centos8
[19:50:18 root@centos8 ~]#httpd -V
Server version: Apache/2.4.37 (centos)
Server built:   Nov  4 2020 03:20:37
Server's Module Magic Number: 20120211:83
Server loaded:  APR 1.6.3, APR-UTIL 1.6.1
Compiled using: APR 1.6.3, APR-UTIL 1.6.1
Architecture:   64-bit
Server MPM:     event
  threaded:     yes (fixed thread count)
    forked:     yes (variable process count)
[19:51:13 root@centos7 ~]#ps -ef | grep httpd
root       1318      1  0 19:49 ?        00:00:00 /usr/sbin/httpd -DFOREGROUND
apache     1319   1318  0 19:50 ?        00:00:00 /usr/sbin/httpd -DFOREGROUND
apache     1320   1318  0 19:50 ?        00:00:00 /usr/sbin/httpd -DFOREGROUND
apache     1321   1318  0 19:50 ?        00:00:00 /usr/sbin/httpd -DFOREGROUND
apache     1322   1318  0 19:50 ?        00:00:00 /usr/sbin/httpd -DFOREGROUND
apache     1323   1318  0 19:50 ?        00:00:00 /usr/sbin/httpd -DFOREGROUND
root       1331   1196  0 20:00 pts/0    00:00:00 grep --color=auto httpd
```

##### **1.2.4.2.2 Ubuntu 18**安装**Apache**

```bash
[12:02:21 root@ubuntu18-04 ~]#apachectl -V
Server version: Apache/2.4.29 (Ubuntu)
Server built:   2020-11-13T01:36:35
Server's Module Magic Number: 20120211:68
Server loaded:  APR 1.6.3, APR-UTIL 1.6.1
Compiled using: APR 1.6.3, APR-UTIL 1.6.1
Architecture:   64-bit
Server MPM:     event   #MPM模式为event
  threaded:     yes (fixed thread count)
    forked:     yes (variable process count)
[12:02:29 root@ubuntu18-04 ~]#ps -ef | grep apache2
root       2029      1  0 12:02 ?        00:00:00 /usr/sbin/apache2 -k start
www-data   2031   2029  0 12:02 ?        00:00:00 /usr/sbin/apache2 -k start
www-data   2032   2029  0 12:02 ?        00:00:00 /usr/sbin/apache2 -k start
root       2460   1334  0 12:03 pts/0    00:00:00 grep --color=auto apache2
```

##### **1.2.4.2.3 Nginx**默认模式

Nginx（Master+Worker）模式：
单个主进程+多个⼯作进程，每个⼯作进程中⼀个线程 处理客户端的请求。

```bash
[20:10:51 root@centos7 ~]#ps -ef | grep nginx
root       1477      1  0 20:10 ?        00:00:00 nginx: master process /usr/sbin/nginx
nginx      1478   1477  0 20:10 ?        00:00:00 nginx: worker process
root       1511   1196  0 20:10 pts/0    00:00:00 grep --color=auto nginx
```

#### 1.2.4.3 服务端I/O

I/O在计算机中指Input/Output， IOPS (Input/Output Per Second)即每秒的输⼊输出量(或读写次数)，是衡量磁盘性能的主要指标之⼀。IOPS是指的是在单位时间内系统能处理的I/O请求数量，⼀般以每秒处理的I/O请求数量为单位，I/O请求通常为读或写数据操作请求。

```bash
机械磁盘的寻道时间、旋转延迟和数据传输时间：
寻道时间：是指磁头移动到正确的磁道上所花费的时间，寻道时间越短则I/O处理就越快，⽬前磁盘的寻道时间⼀般在3-15毫秒左右。

旋转延迟：是指将磁盘⽚旋转到数据所在的扇区到磁头下⾯所花费的时间，旋转延迟取决于磁盘的转速，通常使⽤磁盘旋转⼀周所需要时间的1/2之⼀表示，⽐如7200转的磁盘平均训传延迟⼤约为60*1000/7200/2=4.17毫秒，公式的意思为 （每分钟60秒*1000毫秒每秒/7200转每分钟/2），如果是15000转的则为60*1000/15000/2=2毫秒。

数据传输时间：指的是读取到数据后传输数据的时间，主要取决于传输速率，这个值等于数据⼤⼩除以传输速率，⽬前的磁盘接⼝每秒的传输速度可以达到600MB，因此可以忽略不计。

常⻅的机械磁盘平均寻道时间值： 
7200转/分的磁盘平均物理寻道时间：9毫秒 
10000转/分的磁盘平均物理寻道时间：6毫秒 
15000转/分的磁盘平均物理寻道时间：4毫秒

常⻅磁盘的平均延迟时间：
7200转的机械盘平均延迟：60*1000/7200/2 = 4.17ms
10000转的机械盘平均延迟：60*1000/10000/2 = 3ms 
15000转的机械盘平均延迟：60*1000/15000/2 = 2ms

每秒最⼤IOPS的计算⽅法：
7200转的磁盘IOPS计算⽅式：1000毫秒/(9毫秒的寻道时间+4.17毫秒的平均旋转延迟时间)=1000/13.13=75.9 IOPS
10000转的磁盘的IOPS计算⽅式：1000毫秒/(6毫秒的寻道时间+3毫秒的平均旋转延迟时间)=1000/9=111 IOPS 
15000转的磁盘的IOPS计算⽅式：15000毫秒/(4毫秒的寻道时间+2毫秒的平均旋转延迟时间)=1000/6=166.6 IOPS
```

⼀次完整的I/O是⽤户空间的进程数据与内核空间的内核数据的报⽂的完整交换过程，但是由于内核空间与⽤户空间是严格隔离的，所以其数据交换过程中不能由⽤户空间的进程直接调⽤内核空间的内存数据，⽽是需要经历⼀次从内核空间中的内存数据copy到⽤户空间的进程内存当中，所以简单说⼀次**I/O**就是把数据从内核空间中的内存数据复制到⽤户空间中进程的内存当中的整个过程。

⽽⽹络通信就是从⽹络协议栈到⽤户空间进程的IO，也就是⽹络IO。
![image-20210324192033301](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210324192033301.png)

磁盘I/O是进程向内核发起系统调⽤，请求磁盘上的某个资源⽐如是⽂件或者是图⽚，然后内核通过相应的驱动程序将⽬标图⽚加载到内核的内存空间，加载完成之后把数据从内核内存再复制给进程内存，如果是⽐较⼤的数据也需要等待时间。

```bash
每次IO，都要经由两个阶段：
第⼀步：将数据从磁盘⽂件先加载⾄内核内存空间（缓冲区），此步骤需要等待数据准备完成，时间较⻓
第⼆步：将数据从内核缓冲区复制到⽤户空间的进程的内存中，时间较短
```

## **1.3** 系统**I/O**模型

### **1.3.1** 同步**/**异步

关注的是事件处理的消息通信机制，即在等待⼀件事情的处理结果时，被调⽤者是否提供完成通知。

**同步：**synchronous，调⽤者等待被调⽤者返回消息后才能继续执⾏，如果被调⽤者不提供消息返回则为同步，同步需要调⽤者主动询问事情是否处理完成。

**异步：**asynchronous，被调⽤者通过状态、通知或回调机制主动通知调⽤者，即异步会主动返回被调⽤者的状态给调⽤者。

```bash
同步：进程发出请求调⽤后，内核不提供通知机制，即⽂件IO处理完成后不通知进程，需要进程⾃⼰去问内核是否处理完成。
异步：进程发出请求调⽤后，内核会在调⽤处理完成后返回调⽤结果给进程,Nginx是异步的。
```

![image-20210323091732106](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/VNGlEs4hSuRgx9U.png)

### **1.3.2** 阻塞/非阻塞

关注调⽤者在等待结果返回之前所处的状态

```bash
阻塞：blocking，指IO操作需要彻底完成后才返回到⽤户空间，调⽤结果返回之前，调⽤者被挂起，⼲不了别的事情。
⾮阻塞：nonblocking，指IO操作被调⽤后⽴即返回给⽤户⼀个状态值，⽆需等到IO操作彻底完成，最终的调⽤结果返回之前，调⽤者不会被挂起，可以去做别的事情。
```

![image-20210323091748805](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/2rHYZX7JLmBoNCT.png)

### **1.3.3** 系统**IO**模型组合

```bash
以我去吃饭为例：我点了10个包⼦
同步与异步：
 我点包⼦之后厨师是否告诉我：
   同步：厨师做好包⼦后会放到指定位置，但是做好包⼦之前需要⾃⼰⼀次次去看包⼦做好没有，厨师不会在包⼦做好之后通知我。
   异步：厨师做好包⼦后告诉我包⼦做好放哪了。

阻塞与⾮阻塞：
 我点包⼦后的状态：
  阻塞：在厨师做包⼦期间⼀直在包⼦盘⼦前⾯等着，不能⼲别的事情。
  ⾮阻塞：点完包⼦就可以去⼲别的事情，⽐如去逛逛街或者买买买。
  
IO模型组合：
  同步阻塞：我点完包⼦后不能去做别的事情，⽽且不知道包⼦有没有做好，需要⾃⼰⼀直等着并⼀次次的问厨师做好没有。
  同步⾮阻塞：点完包⼦后可以去做别的事情，但是不能⻓时间做别的事情，因为我还是不知道包⼦有没有做好，也要⾃⼰⼀直等着并⼀次次的问厨师做好没有，只能抽空做点别的。
  异步阻塞：我点完包⼦后不能去⾛做别的事情，但是厨师在做好包⼦后会告诉我，也就是我不⽤再⼀次次为厨师包⼦有没有做好了。
  异步⾮阻塞：我点完包⼦后可以做别的事情，⽽且可以⼀直在做别的去事情，因为厨师在做好包⼦后会告诉我。
```

## **1.4** 网络**I/O**模型

阻塞型、⾮阻塞型、复⽤型、信号驱动型、异步

### **1.4.1** 同步阻塞型**IO**模型（**blocking IO**）

阻塞IO模型是最简单的IO模型，⽤户线程在内核进⾏IO操作时被阻塞

```bash
⽤户请求到达系统服务进程，然后进程通过系统调⽤read向内核发起IO读操作，即将⽤户请求由⽤户空间转到内核空间，内核接收到IO请求后开始从磁盘读取⽂件到内核内存，即在等⽤户请求的⽂件从磁盘到达内核内存后，然后将接收的数据拷⻉到⽤户空间，然后完成read操作。
⽤户请求需要等待内核将数据读取到进程内存后，处理⽤户的进程才可以继续处理该请求，整个IO请求的过程中，请求进程是被阻塞的，这导致进程在发起IO请求时，不能做任何事情，⽽且对CPU的资源利⽤率不够。
```

**优点：** 程序简单，在阻塞等待数据期间进程挂起，基本不会占⽤ CPU 资源

**缺点：** 每个连接需要独⽴的进程单独处理，当并发请求量⼤时为了维护程序，内存、进程切换开销较⼤，apache 的preforck使⽤的是这种模式。

```bash
同步阻塞：程序向内核发送IO请求后⼀直等待内核响应，如果内核处理请求的IO操作不能⽴即返回,则进程将⼀直等待并不再接受新的请求，并由进程轮训查看IO是否完成，完成后进程将IO结果返回给Client，在IO没有返回期间进程不能接受其他客户的请求，⽽且是由进程⾃⼰去查看IO是否完成，这种⽅式简单，但是⽐较慢，⽤的⽐较少。
```

![image-20210323100858230](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210323100858230.png)

### **1.4.2** 同步⾮阻塞型**I/O**模型**(nonblocking IO)**

⽤户请求进程向内核发起IO请求时⽴即返回，但并未读取到任何数据，进程需要不断地发起IO请求，直到数据到达进程空间的内存后，才真正读取到数据并继续执⾏，即前期需要⼀次次 “轮询”去查看请求是否数据是否准备好，但是此机制存在两个问题：1.如果有⼤量⽂件描述符都要等，那么就得⼀个⼀个的read，这会带来⼤量的Context Switch（read是系统调⽤，每调⽤⼀次就得在⽤户态和核⼼态切换⼀次），2.轮询的时间不好把握，这⾥是要猜多久之后数据才能到，等待时间设的太⻓，程序响应延迟就过⼤，但是设的太短，就会造成过于频繁的重试，⼲耗CPU⽽已，所以是⽐较浪费CPU的⽅式，因此⼀般很少直接使⽤这种模型，⽽是在其他IO模型中使⽤⾮阻塞IO这⼀特性。

```bash
同步⾮阻塞：应⽤进程向内核发送请IO求后⼀直等待内核响应，如果内核处理请求的IO操作不能⽴即返回IO结果，进程将不再等待，⽽且继续处理其他请求，但是仍然需要进程隔⼀段时间就要查看内核IO是否完成。
```

![image-20210323101326028](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210323101326028.png)

### **1.4.3** **IO**多路复用型**(IO multiplexing)**

IO multiplexing就是我们说的select，有些地⽅也称这种IO⽅式为event driven IO(事件驱动IO)，select/poll/epoll的好处就在于单个process就可以同时处理多个⽹络连接的IO。它的基本原理就是select这个function会不断的轮询所负责的所有socket，当某个socket有数据到达了，就通知⽤户进程。

当⽤户进程调⽤了select，那么整个进程会被block，⽽同时，kernel会“监视”所有select负责的socket，当任何⼀个socket中的数据准备好了，select就会返回，这个时候⽤户进程再调⽤read操作，将数据从kernel拷⻉到⽤户进程。

```
Apache prefork是此模式的主进程+多进程/单线程+select，work是主进程+多进程/多线程+poll模式
```

![image-20210323101728495](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210323101728495.png)

### **1.4.4** 信号驱动式**IO(signal-driven IO)**

信号驱动IO：signal-driven I/O

⽤户进程可以通过sigaction系统调⽤注册⼀个信号处理程序，然后进程可以继续向下执⾏，当有IO操作准备就绪时，由内核通知触发⼀个SIGIO信号处理程序执⾏，然后将⽤户进程所需要的数据从内核空间拷⻉到⽤户空间，

此模型的优势在于等待数据包到达期间进程不被阻塞，进程可以继续执⾏，只要等待来⾃信号处理函数的通知。

**优点：** 进程没有在等待数据时被阻塞，内核直接返回调⽤接收信号，不影响进程继续处理其他请求因此可以提⾼资源的利⽤率

**缺点：** 信号 I/O 在⼤量 IO 操作时可能会因为信号队列溢出导致没法通知

```
信号驱动IO：进程向内核发送IO调⽤后，不⽤等待内核响应，可以继续接受其他请求，内核收到进程请求后进⾏的IO如果不能⽴即返回，就由内核等待结果，直到IO完成后内核再通知进程，apache event模型就是主进程+多进程/多线程+信号驱动
```

![image-20210323102056996](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210323102056996.png)

### **1.4.5** 异步**(**⾮阻塞**) IO(asynchronous IO)**

相对于同步IO，异步IO不是顺序执⾏，⽤户进程进⾏aio_read系统调⽤之后，⽆论内核数据是否准备好，都会直接返回给⽤户进程，然后⽤户态进程可以去做别的事情，等到socket数据准备好了，内核直接复制数据给进程，然后从内核向进程发送通知，异步⾮阻塞IO的两个阶段，进程都是⾮阻塞的。Linux提供了AIO库函数实现异步，⽬前有很多开源的异步IO库，例如libevent、libev、libuv等，异步
过程如下图所示：

```
异步⾮阻塞：程序进程向内核发送IO调⽤后，不⽤等待内核响应，可以继续接受其他请求，内核调⽤的IO如果不能⽴即返回，内核会继续处理其他事物，直到IO完成后将结果通知给内核，内核在将IO完成的结果返回给进程，期间进程可以接受新的请求，内核也可以处理新的事物，因此相互不影响，可以实现较⼤的同时并行实现较高的IO复⽤，因此异步⾮阻塞使⽤最多的⼀种通信⽅式，nginx就是是异步⾮阻塞模型。
```

![image-20210323102431808](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210323102431808.png)

### **1.4.6** **IO**对比

这五种⽹络 I/O 模型中，越往后，阻塞越少，理论上效率也是最优前四种属于同步 I/O，因为其中真正的 I/O 操作(recvfrom)将阻塞进程/线程，只有异步 I/O 模型才与 POSIX 定义的异步 I/O 相匹配。

![image-20210323102643425](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210323102643425.png)

### **1.4.7** 实现⽅式

Nginx⽀持在多种不同的操作系统实现不同的事件驱动模型，但是其在不同的操作系统甚⾄是不同的系统版本上⾯的实现⽅式不尽相同，主要有以下实现⽅式：

```
1. select：
select库是在linux和windows平台都基本⽀持的 事件驱动模型库，并且在接⼝的定义也基本相同，只是部分参数的含义略有差异，最⼤并发限制1024，是最早期的事件驱动模型。

2. poll：
在Linux 的基本驱动模型，windows不⽀持此驱动模型，是select的升级版，取消了最⼤的并发限制，在编译nginx的时候可以使⽤--with-poll_module和--without-poll_module这两个指定是否编译select库。

3. epoll：
epoll是库是Nginx服务器支持的最高性能的事件驱动库之⼀，是公认的⾮常优秀的事件驱动模型，它和select和poll有很⼤的区别，epoll是poll的升级版，但是与poll的效率有很⼤的区别.
epoll的处理方式是创建⼀个待处理的事件列表，然后把这个列表发给内核，返回的时候在去轮训检查这个表，以判断事件是否发⽣，epoll⽀持⼀个进程打开的最⼤事件描述符的上限是系统可以打开的⽂件的最⼤数，同时epoll库的IO效率不随描述符数⽬增加⽽线性下降，因为它只会对内核上报的“活跃”的描述符进⾏操作。

4. rtsig：
不是⼀个常⽤事件驱动，最⼤队列1024，不是很常⽤

5. kqueue：
⽤于⽀持BSD系列平台的⾼效事件驱动模型，主要⽤在FreeBSD 4.1及以上版本、OpenBSD 2.0级以上版本，NetBSD级以上版本及Mac OS X 平台上，该模型也是poll库的变种，因此和epoll没有本质上的区别，都是通过避免轮训操作提供效率。

6. /dev/poll:
⽤于⽀持unix衍⽣平台的⾼效事件驱动模型，主要在Solaris 平台、HP/UX，该模型是sun公司在开发Solaris系列平台的时候提出的⽤于完成事件驱动机制的⽅案，它使⽤了虚拟的/dev/poll设备，开发⼈员将要⻅识的⽂件描述符加⼊这个设备，然后通过ioctl()调⽤来获取事件通知，因此运⾏在以上系列平台的时候请使⽤/dev/poll事件驱动机制。

7. eventport：
该⽅案也是sun公司在开发Solaris的时候提出的事件驱动库，只是Solaris 10以上的版本，该驱动库看防⽌内核崩溃等情况的发⽣。

8. Iocp：
 Windows系统上的实现⽅式，对应第5种（异步I/O）模型。
```

### **1.4.8** 常⽤模型汇总

![image-20210323103902643](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210323103902643.png)

### **1.4.9** 常用模型通知对比

```
⽔平触发-- 多次通知，需要关⼼数据是否取完，即数据取⾛之后即不再通知进程，以避免重复多次⽆效通知，通知效率较低。
边缘触发-- ⼀次通知，需要关⼼数据是否取⾛，即只通知⼀次怎么保证数据被进程成功取⾛了，以避免数据丢失，通知效率较⾼。
```

![image-20210323104016942](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210323104016942.png)

```
Select：
POSIX所规定，⽬前⼏乎在所有的平台上⽀持，其良好跨平台⽀持也是它的⼀个优点，本质上是通过设置或者检查存放fd标志位的数据结构来进⾏下⼀步处理
缺点
单个进程能够监视的⽂件描述符的数量存在最⼤限制，在Linux上⼀般为1024，可以通过修改宏定义FD_SETSIZE，再重新编译内核实现，但是这样也会造成效率的降低。单个进程可监视的fd数量被限制，默认是1024，修改此值需要重新编译内核。对socket是线性扫描，即采⽤轮询的⽅法，效率较低。select 采取了内存拷贝⽅法来实现内核将 FD 消息通知给⽤户空间，这样⼀个⽤来存放⼤量fd的数据结构，这样会使得⽤户空间和内核空间在传递该结构时复制开销⼤。
```

```
poll：
本质上和select没有区别，它将⽤户传⼊的数组拷⻉到内核空间，然后查询每个fd对应的设备状态。
其没有最⼤连接数的限制，原因是它是基于链表来存储的。
⼤量的fd的数组被整体复制于⽤户态和内核地址空间之间，⽽不管这样的复制是不是有意义。
poll特点是“⽔平触发”，如果报告了fd后，没有被处理，那么下次poll时会再次报告该fd。
```

```
epoll：
在Linux 2.6内核中提出的select和poll的增强版本。
⽀持⽔平触发LT和边缘触发ET，最⼤的特点在于边缘触发，它只告诉进程哪些fd刚刚变为就需态，并且只会通知⼀次
使⽤“事件”的就绪通知⽅式，通过epoll_ctl注册fd，⼀旦该fd就绪，内核就会采⽤类似callback的回调机制来激活该fd，epoll_wait便可以收到通知 。
优点:
没有最⼤并发连接的限制：能打开的FD的上限远⼤于1024(1G的内存能监听约10万个端⼝)，具体查看/proc/sys/fs/file-max，此值和系统内存⼤⼩相关
效率提升：⾮轮询的⽅式，不会随着FD数⽬的增加⽽效率下降；只有活跃可⽤的FD才会调⽤callback函数，即epoll最⼤的优点就在于它只管理“活跃”的连接，⽽跟连接总数⽆关
内存拷⻉，利⽤mmap(Memory Mapping)加速与内核空间的消息传递；即epoll使⽤mmap减少复制开销
```

### **1.4.10** **MMAP**介绍

MMAP(memory mapping，⽂件映射)，系统调⽤使得进程之间通过映射同⼀个普通⽂件实现共享内存，普通⽂件被映射到进程地址空间后，进程可以像访问普通内存⼀样对⽂件进⾏访问，即通过MMAP实现两个⽬的。

```
性能提升：通过MMAP⽂件映射，进程就可以直接访问映射到内存的⽂件，不再需要从内核内存空间copy到进程空间后再操作，省略了⼀次copy。
进程间⽂件共享：多个进程可以访问同⼀份映射到内存的⽂件,即多个请求同⼀⽂件的请求直接读映射⽂件并返回给客户端。
```

#### **1.4.10.1** 传统方式**copy**数据

![image-20210323104746132](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210323104746132.png)

#### **1.4.10.2**：**mmap**方式

mmap 可以将磁盘⽂件映射到内存中，直接操作内存时 Linux 内核将负责同步内存和磁盘⽂件中的数据：

![image-20210323105032312](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210323105032312.png)

# 二 、**Nginx**基础

Nginx：engine X ，2002年由毕业于俄罗斯国立莫斯科鲍曼科技⼤学的⼯程师伊⼽尔·⻄索夫(IgorSysoev)开始开发，2004年开源，2019年3⽉11⽇，Nginx公司被F5 Networks以6.7亿美元收购，Nginx官⽹：http://nginx.org，Nginx 商业版为Nginx Plus：https://www.nginx.com/products/nginx/

Nginx 则是免费的、开源的、⾼性能的HTTP和反向代理服务器、邮件代理服务器、以及TCP/UDP代理服务器
解决C10K问题（10K Connections）https://blog.csdn.net/chinawangfei/article/details/102780959

nginx的其它的⼆次发⾏版：
Tengine：由淘宝网发起的Web服务器项⽬。它在Nginx的基础上，针对⼤访问量⽹站的需求，添加了很多⾼级功能和特性，Tengine的性能和稳定性已经在⼤型的⽹站如淘宝⽹，天猫商城等得到了很好的检验，它的最终⽬标是打造⼀个⾼效、稳定、安全、易⽤的Web平台，从2011年12⽉开始，Tengine成为⼀个开源项⽬，官网 http://tengine.taobao.org/
OpenResty：基于 Nginx 与 Lua 语⾔的⾼性能 Web 平台， 章亦春团队开发，官⽹：http://openresty.org/cn/

## **2.1** **Nginx**功能介绍

静态的web资源服务器html，图⽚，js，css，txt等静态资源
结合FastCGI/uWSGI/SCGI等协议反向代理动态资源请求
http/https协议的反向代理
imap4/pop3协议的反向代理
tcp/udp协议的请求转发（反向代理）

### **2.1.1** 基础特性

```
特性：
模块化设计，较好的扩展性
高可靠性
支持热部署：不停机更新配置⽂件，升级版本，更换⽇志⽂件
低内存消耗：10000个keep-alive连接模式下的⾮活动连接，仅需2.5M内存
event-driven,aio,mmap，sendfile

基本功能：
静态资源的web服务器
http协议反向代理服务器
pop3/imap4协议反向代理服务器
FastCGI(LNMP),uWSGI(python)等协议
模块化（⾮DSO），如zip，SSL模块
```

### **2.1.2** 和**web**服务相关的功能

```
虚拟主机（server）
 ⽀持 keep-alive 和管道连接(利⽤⼀个连接做多次请求)
 访问⽇志（⽀持基于⽇志缓冲提⾼其性能）
 url rewirte
 路径别名
 基于IP及⽤户的访问控制
 ⽀持速率限制及并发数限制
 重新配置和在线升级而无须中断客户的工作进程
```

## **2.2** **Nginx**组织结构

**web请求处理机制：**

1. **多进程方式：** 服务器每接收到⼀个客户端请求就有服务器的主进程⽣成⼀个⼦进程响应客户端，直到⽤户关闭连接，这样的优势是处理速度快，各⼦进程之间相互独⽴，但是如果访问过⼤会导致服务器资源耗尽⽽⽆法提供请求。
2. **多线程方式：** 与多进程⽅式类似，但是每收到⼀个客户端请求会有服务进程派⽣出⼀个线程来个客户⽅进⾏交互，⼀个线程的开销远远⼩于⼀个进程，因此多线程⽅式在很⼤程度减轻了web服务器对系统资源的要求，但是多线程也有⾃⼰的缺点，即当多个线程位于同⼀个进程内⼯作的时候，可以相互访问同样的内存地址空间，所以他们相互影响，另外⼀旦主进程挂掉则所有⼦线程都不能⼯作了，IIS服务器使⽤了多线程的⽅式，需要间隔⼀段时间就重启⼀次才能稳定。

### **2.2.1** 组织模型

Nginx是多进程组织模型，⽽且是⼀个由Master主进程和Worker⼯作进程组成。

![image-20210323110340287](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210323110340287.png)

**主进程(master process)的功能：**

```
读取Nginx 配置⽂件并验证其有效性和正确性
建⽴、绑定和关闭socket连接
按照配置⽣成、管理和结束⼯作进程
接受外界指令，⽐如重启、升级及退出服务器等指令
不中断服务，实现平滑升级，重启服务并应⽤新的配置
开启⽇志⽂件，获取⽂件描述符
不中断服务，实现平滑升级，升级失败进⾏回滚处理
编译和处理perl脚本
```

**工作进程（woker process）的功能：**

```
接受处理客户的请求
将请求依次送⼊各个功能模块进行处理
IO调⽤，获取响应数据
与后端服务器通信，接收后端服务器的处理结果
缓存数据，访问缓存索引，查询和调用缓存数据
发送请求结果，响应客户的请求
接收主程序指令，比如重启、升级和退出等
```

![image-20210323110539123](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210323110539123.png)

### **2.2.2** 进程间通信

⼯作进程是有主进程⽣成的，主进程使⽤fork()函数，在Nginx服务器启动过程中主进程根据配置⽂件决定启动⼯作进程的数量，然后建⽴⼀张全局的⼯作表⽤于存放当前未退出的所有的⼯作进程，主进程⽣成⼯作进程后会将新⽣成的⼯作进程加⼊到⼯作进程表中，并建⽴⼀个单向的管道并将其传递给⼯作进程，该管道与普通的管道不同，它是由主进程指向⼯作进程的单向通道，包含了主进程向⼯作进发出的指令、⼯作进程ID、⼯作进程在⼯作进程表中的索引和必要的⽂件描述符等信息。

主进程与外界通过信号机制进⾏通信，当接收到需要处理的信号时，它通过管道向相关的⼯作进程发送正确的指令，每个⼯作进程都有能力捕获管道中的可读事件，当管道中有可读事件的时候，⼯作进程就会从管道中读取并解析指令，然后采取相应的执⾏动作，这样就完成了主进程与⼯作进程的交互。

```
⼯作进程之间的通信原理基本上和主进程与⼯作进程之间的通信是⼀样的，只要⼯作进程之间能够取得彼此的信息，建⽴管道即可通信，但是由于⼯作进程之间是完全隔离的，因此⼀个进程想要知道另外⼀个进程的状态信息就只能通过主进程来设置了。
 为了实现⼯作进程之间的交互，主进程在⽣成⼯作进程之后，在⼯作进程表中进⾏遍历，将该新进程的ID以及针对该进程建⽴的管道句柄传递给⼯作进程中的其他进程，为⼯作进程之间的通信做准备，当⼯作进程1向⼯作进程2发送指令的时候，⾸先在主进程给它的其他⼯作进程⼯作信息中找到2的进程ID，然后将正确的指令写⼊指向进程2的管道，⼯作进程2捕获到管道中的事件后，解析指令并进⾏相关操作，这样就完成了⼯作进程之间的通信。
```

![image-20210323113436003](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210323113436003.png)

## **2.3** **Nginx**模块介绍

**核⼼模块：** 是 Nginx 服务器正常运⾏必不可少 的模块，提供 错误⽇志记录 、 配置⽂件解析 、 事件驱动机制 、 进程管理 等核⼼功能

**标准HTTP模块：** 提供 HTTP 协议解析相关的功能，⽐如： 端⼝配置 、 ⽹⻚编码设置 、 HTTP响应头设置等等

**可选HTTP模块：** 主要⽤于扩展标准的 HTTP 功能，让 Nginx 能处理⼀些特殊的服务，⽐如： Flash 多媒体传输 、解析 GeoIP 请求、 ⽹络传输压缩 、 安全协议 SSL ⽀持等

**邮件服务模块：** 主要⽤于⽀持 Nginx 的 邮件服务 ，包括对 POP3 协议、 IMAP 协议和 SMTP协议的⽀持

**第三⽅模块：** 是为了扩展 Nginx 服务器应⽤，完成开发者⾃定义功能，⽐如： Json ⽀持、 Lua ⽀持等nginx⾼度模块化，但其模块早期不⽀持DSO机制；1.9.11版本⽀持动态装载和卸载

**模块分类：**

```
核⼼模块：core module
标准模块：
 HTTP 模块： ngx_http_*
 HTTP Core modules 默认功能
 HTTP Optional modules 需编译时指定
Mail 模块 ngx_mail_*
Stream 模块 ngx_stream_*
第三⽅模块
```

![image-20210323113719907](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210323113719907.png)

## **2.4** **Nginx**安装

Nginx的安装版本分为Mainline version(主要开发版本，其实就是还处于开发版)、Stable version(当前最新稳定版)和Legacy versions(旧的稳定版)， Nginx安装可以使⽤yum或源码安装，但是推荐使⽤源码，⼀是yum的版本⽐较旧，⼆是编译安装可以更⽅便⾃定义相关路径，三是使⽤源码编译可以⾃定义相关功能，更⽅便业务的上的使⽤，源码安装需要提前准备标准的编译器，GCC的全称是（GNUCompiler collection），其有GNU开发，并以GPL即LGPL许可，是⾃由的类UNIX即苹果电脑Mac OS X操作系统的标准编译器，因为GCC原本只能处理C语⾔，所以原名为GNU C语⾔编译器，后来得到快速发展，可以处理C++,Fortran，pascal，objective-C，java以及Ada等其他语⾔，此外还需要Automake⼯具，以完成⾃动创建Makefile的⼯作，Nginx的⼀些模块需要依赖第三⽅库，⽐如pcre（⽀持rewrite），zlib（⽀持gzip模块）和openssl（⽀持ssl模块）等。

### **2.4.1** **Nginx yum**安装

Centos7需要提前配置好epel源,Centos8不需要

```bash
[11:44:17 root@centos7 ~]#yum install epel-release -y
[11:45:51 root@centos7 ~]#yum install -y nginx
[11:46:03 root@centos7 ~]#rpm -ql nginx
/etc/logrotate.d/nginx
/etc/nginx/fastcgi.conf
/etc/nginx/fastcgi.conf.default
....
[11:46:08 root@centos7 ~]#which nginx
/usr/sbin/nginx
```

#### **2.4.1.1** 检查安装

查看nginx安装包信息

```bash
[11:47:24 root@centos7 ~]#rpm -qi nginx
Name        : nginx
Epoch       : 1
Version     : 1.16.1
Release     : 3.el7
Architecture: x86_64
Install Date: Tue 23 Mar 2021 11:45:50 AM CST
Group       : Unspecified
Size        : 1694049
License     : BSD
Signature   : RSA/SHA256, Sun 01 Nov 2020 10:58:48 AM CST, Key ID 6a2faea2352c64e5
Source RPM  : nginx-1.16.1-3.el7.src.rpm
Build Date  : Sun 01 Nov 2020 10:02:58 AM CST
Build Host  : buildhw-x86-09.iad2.fedoraproject.org
Relocations : (not relocatable)
Packager    : Fedora Project
Vendor      : Fedora Project
URL         : http://nginx.org/
Bug URL     : https://bugz.fedoraproject.org/nginx
Summary     : A high performance web server and reverse proxy server
Description :
Nginx is a web server and a reverse proxy server for HTTP, SMTP, POP3 and
IMAP protocols, with a strong focus on high concurrency, performance and low
memory usage.
```

#### **2.4.1.2** 查看帮助

使用安装完成的二进制文件nginx

```bash
[11:47:28 root@centos7 ~]#nginx -h
nginx version: nginx/1.16.1
Usage: nginx [-?hvVtTq] [-s signal] [-c filename] [-p prefix] [-g directives]

Options:
  -?,-h         : this help              #帮助
  -v            : show version and exit  #查看版本
  -V            : show version and configure options then exit #显示版本和编译参数
  -t            : test configuration and exit   #测试配置文件是否异常
  -T            : test configuration, dump it and exit   #测试并打印配置文件
  -q            : suppress non-error messages during configuration testing #静默模式
  -s signal     : send signal to a master process: stop, quit, reopen, reload #发送信号（stop停止，start启动，reload从新加载配置文件）
  -p prefix     : set prefix path (default: /usr/share/nginx/)  #指定Nginx目录
  -c filename   : set configuration file (default: /etc/nginx/nginx.conf) #配置文件路径
  -g directives : set global directives out of configuration file #设置全局指令
```

#### **2.4.1.3** 验证**Nginx**

```bash
#验证配置文件是否正常
[11:48:18 root@centos7 ~]#nginx -t
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
#显示版本和编译参数
[11:51:20 root@centos7 ~]#nginx -V
nginx version: nginx/1.16.1
built by gcc 4.8.5 20150623 (Red Hat 4.8.5-44) (GCC) 
built with OpenSSL 1.1.1c FIPS  28 May 2019 (running with OpenSSL 1.1.1g FIPS  21 Apr 2020)
TLS SNI support enabled
configure arguments: --prefix=/usr/share/nginx --sbin-path=/usr/sbin/nginx --modules-path=/usr/lib64/nginx/modules --conf-path=/etc/nginx/nginx.conf --error-log-path=/var/log/nginx/error.log --http-log-path=/var/log/nginx/access.log --http-client-body-temp-path=/var/lib/nginx/tmp/client_body --http-proxy-temp-path=/var/lib/nginx/tmp/proxy --http-fastcgi-temp-path=/var/lib/nginx/tmp/fastcgi --http-uwsgi-temp-path=/var/lib/nginx/tmp/uwsgi --http-scgi-temp-path=/var/lib/nginx/tmp/scgi --pid-path=/run/nginx.pid --lock-path=/run/lock/subsys/nginx --user=nginx --group=nginx --with-file-aio --with-ipv6 --with-http_ssl_module --with-http_v2_module --with-http_realip_module --with-stream_ssl_preread_module --with-http_addition_module --with-http_xslt_module=dynamic --with-http_image_filter_module=dynamic --with-http_sub_module --with-http_dav_module --with-http_flv_module --with-http_mp4_module --with-http_gunzip_module --with-http_gzip_static_module --with-http_random_index_module --with-http_secure_link_module --with-http_degradation_module --with-http_slice_module --with-http_stub_status_module --with-http_perl_module=dynamic --with-http_auth_request_module --with-mail=dynamic --with-mail_ssl_module --with-pcre --with-pcre-jit --with-stream=dynamic --with-stream_ssl_module --with-google_perftools_module --with-debug --with-cc-opt='-O2 -g -pipe -Wall -Wp,-D_FORTIFY_SOURCE=2 -fexceptions -fstack-protector-strong --param=ssp-buffer-size=4 -grecord-gcc-switches -specs=/usr/lib/rpm/redhat/redhat-hardened-cc1 -m64 -mtune=generic' --with-ld-opt='-Wl,-z,relro -specs=/usr/lib/rpm/redhat/redhat-hardened-ld -Wl,-E'
```

#### **2.4.1.4** **Nginx**启动脚本

```bash
#YUM安装会自动生成，如果是编译安装需要自己写
[11:53:36 root@centos8 ~]#cat /usr/lib/systemd/system/nginx.service
[Unit]
Description=The nginx HTTP and reverse proxy server
After=network.target remote-fs.target nss-lookup.target

[Service]
Type=forking
PIDFile=/run/nginx.pid
# Nginx will fail to start if /run/nginx.pid already exists but has the wrong
# SELinux context. This might happen when running `nginx -t` from the cmdline.
# https://bugzilla.redhat.com/show_bug.cgi?id=1268621
ExecStartPre=/usr/bin/rm -f /run/nginx.pid
ExecStartPre=/usr/sbin/nginx -t
ExecStart=/usr/sbin/nginx
ExecReload=/bin/kill -s HUP $MAINPID
KillSignal=SIGQUIT
TimeoutStopSec=5
KillMode=mixed
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

#### **2.4.1.5** 配置**Nginx**

```bash
[11:53:12 root@centos7 ~]#grep -v "#" /etc/nginx/nginx.conf | grep -v "^$"
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log;
pid /run/nginx.pid;
include /usr/share/nginx/modules/*.conf;
events {
    worker_connections 1024;
}
http {
    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';
    access_log  /var/log/nginx/access.log  main;
    sendfile            on;
    tcp_nopush          on;
    tcp_nodelay         on;
    keepalive_timeout   65;
    types_hash_max_size 2048;
    include             /etc/nginx/mime.types;
    default_type        application/octet-stream;
    include /etc/nginx/conf.d/*.conf;
    server {
        listen       80 default_server;
        listen       [::]:80 default_server;
        server_name  _;
        root         /usr/share/nginx/html;
        include /etc/nginx/default.d/*.conf;
        location / {
        }
        error_page 404 /404.html;
        location = /404.html {
        }
        error_page 500 502 503 504 /50x.html;
        location = /50x.html {
        }
    }
}
```

#### **2.4.1.6** 启动**Nginx**

```bash
[11:55:15 root@centos7 ~]#systemctl start nginx.service
[11:56:34 root@centos7 ~]#systemctl status nginx.service 
● nginx.service - The nginx HTTP and reverse proxy server
   Loaded: loaded (/usr/lib/systemd/system/nginx.service; disabled; vendor preset: disabled)
   Active: active (running) since Tue 2021-03-23 11:56:21 CST; 16s ago
  Process: 1417 ExecStart=/usr/sbin/nginx (code=exited, status=0/SUCCESS)
  Process: 1414 ExecStartPre=/usr/sbin/nginx -t (code=exited, status=0/SUCCESS)
  Process: 1413 ExecStartPre=/usr/bin/rm -f /run/nginx.pid (code=exited, status=0/SUCCESS)
 Main PID: 1419 (nginx)
   CGroup: /system.slice/nginx.service
           ├─1419 nginx: master process /usr/sbin/nginx
           └─1420 nginx: worker process

Mar 23 11:56:21 centos7 systemd[1]: Starting The nginx HTTP and reverse proxy s.....
Mar 23 11:56:21 centos7 nginx[1414]: nginx: the configuration file /etc/nginx/n...ok
Mar 23 11:56:21 centos7 nginx[1414]: nginx: configuration file /etc/nginx/nginx...ul
Mar 23 11:56:21 centos7 systemd[1]: Failed to parse PID from file /run/nginx.pi...nt
Mar 23 11:56:21 centos7 systemd[1]: Started The nginx HTTP and reverse proxy server.
Hint: Some lines were ellipsized, use -l to show in full.
#这里正常应该是一个主进程多个子进程，之所以只有一个子进程，是因为配置文件中worker_processes auto所以子进程是根据机器CPU内核个数自动生成，我这台机器只有一个内核，所以只生成一个
[11:57:08 root@centos7 ~]#lscpu 
...
CPU(s):                1
...
[11:57:04 root@centos7 ~]#ps -ef | grep nginx
root       1419      1  0 11:56 ?        00:00:00 nginx: master process /usr/sbin/nginx
nginx      1420   1419  0 11:56 ?        00:00:00 nginx: worker process
root       1428   1033  0 11:57 pts/0    00:00:00 grep --color=auto nginx
```

#### **2.4.1.7** 访问**Nginx**

![image-20210323120025757](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210323120025757.png)

### **2.4.2** **Nginx** 编译安装

准备编译安装的基础环境

```bash
[12:15:37 root@centos7 ~]#yum install -y gcc gcc-g++ pcre pcre-devel zlib zlib-devel openssl openssl-devel automake perl

   gcc为GNU Compiler Collection的缩写，可以编译C和C++源代码等，它是GNU开发的C和C++以及其他很多种语⾔的编译器（最早的时候只能编译C，后来很快进化成⼀个编译多种语⾔的集合，如Fortran、
Pascal、Objective-C、Java、Ada、 Go等。）
　　gcc 在编译C++源代码的阶段，只能编译 C++ 源⽂件，⽽不能⾃动和 C++ 程序使⽤的库链接（编译过程分为编译、链接两个阶段，注意不要和可执⾏⽂件这个概念搞混，相对可执⾏⽂件来说有三个重要的概念：编译（compile）、链接（link）、加载（load）。源程序⽂件被编译成⽬标⽂件，多个⽬标⽂件连同库被链接成⼀个最终的可执⾏⽂件，可执⾏⽂件被加载到内存中运⾏）。因此，通常使⽤ g++ 命令来完成 C++ 程序的编译和连接，该程序会⾃动调⽤ gcc 实现编译。
　　gcc-c++也能编译C源代码，只不过把会把它当成C++源代码，后缀为.c的，gcc把它当作是C程序，⽽g++当作是c++程序；后缀为.cpp的，两者都会认为是c++程序，注意，虽然c++是c的超集，但是两者对语法的要求是有区别的。
　　automake是⼀个从Makefile.am⽂件⾃动⽣成Makefile.in的⼯具。为了⽣成Makefile.in，automake还需⽤到perl，由于automake创建的发布完全遵循GNU标准，所以在创建中不需要perl。libtool是⼀款⽅便⽣成各种程序库的⼯具。
　　pcre pcre-devel：在Nginx编译需要 PCRE(Perl Compatible Regular Expression)，因为Nginx 的Rewrite模块和HTTP 核⼼模块会使⽤到PCRE正则表达式语法。
　　zlip zlib-devel：nginx启⽤压缩功能的时候，需要此模块的⽀持。
　　openssl openssl-devel：开启SSL的时候需要此模块的⽀持。
```

#### **2.4.2.1** 安装**Nginx**

官⽅源码包下载地址：
https://nginx.org/en/download.html

```bash
[12:17:28 root@centos7 src]#cd /usr/local/src/
[12:17:31 root@centos7 src]#wget https://nginx.org/download/nginx-1.18.0.tar.gz
[12:17:48 root@centos7 src]#tar xf nginx-1.18.0.tar.gz 
[12:18:06 root@centos7 src]#cd nginx-1.18.0/
编译是为了检查系统环境是否符合编译安装的要求，⽐如是否有gcc编译⼯具，是否⽀持编译参数当中的模块，并根据开启的参数等⽣成Makefile⽂件为下⼀步做准备：
[12:19:52 root@centos7 nginx-1.18.0]#./configure --prefix=/apps/nginx --user=nginx --group=nginx --with-http_ssl_module --with-http_v2_module --with-http_realip_module --with-http_stub_status_module --with-http_gzip_static_module --with-pcre --with-stream --with-stream_ssl_module --with-stream_realip_module
[12:21:42 root@centos7 nginx-1.18.0]#make    #编译步骤，根据Makefile⽂件⽣成相应的模块
[12:21:42 root@centos7 nginx-1.18.0]#make install    #创建⽬录，并将⽣成的模块和⽂件复制到相应的⽬录：
[12:22:08 root@centos7 nginx-1.18.0]#useradd -s /sbin/nologin -r nginx
[12:22:34 root@centos7 nginx-1.18.0]#chown nginx.nginx -R /apps/nginx/
```

备注：nginx完成安装以后，有四个主要的⽬录：

```bash
conf：该⽬录中保存了nginx所有的配置⽂件，其中nginx.conf是nginx服务器的最核⼼最主要的配置⽂件，其他的.conf则是⽤来配置nginx相关的功能的，例如fastcgi功能使⽤的是fastcgi.conf和fastcgi_params两个⽂件，配置⽂件⼀般都有个样板配置⽂件，是⽂名.default结尾，使⽤的使⽤将其复制为并将default去掉即可。
html：该⽬录中保存了nginx服务器的web⽂件，但是可以更改为其他⽬录保存web⽂件,另外还有⼀个50x的web⽂件是默认的错误⻚⾯提示⻚⾯。
logs：该⽬录⽤来保存nginx服务器的访问⽇志错误⽇志等⽇志，logs⽬录可以放在其他路径，⽐如/var/logs/nginx⾥⾯。
sbin：该⽬录⽤来保存nginx⼆进制启动脚本，可以接受不同的参数以实现不同的功能。
[12:23:03 root@centos7 nginx-1.18.0]#ls /apps/nginx/
conf  html  logs  sbin
```

#### **2.4.2.2** 验证版本及编译参数

```bash
[12:25:02 root@centos7 nginx-1.18.0]#/apps/nginx/sbin/nginx -V
nginx version: nginx/1.18.0
built by gcc 4.8.5 20150623 (Red Hat 4.8.5-44) (GCC) 
built with OpenSSL 1.0.2k-fips  26 Jan 2017
TLS SNI support enabled
configure arguments: --prefix=/apps/nginx --user=nginx --group=nginx --with-http_ssl_module --with-http_v2_module --with-http_realip_module --with-http_stub_status_module --with-http_gzip_static_module --with-pcre --with-stream --with-stream_ssl_module --with-stream_realip_module
```

#### **2.4.2.3** 访问编译安装的**nginx web**界⾯

![image-20210323122712951](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210323122712951.png)

#### **2.4.2.4**：创建**Nginx**自启动脚本：

##### **2.4.2.4.1**：**Nginx 1.18.0**：

```bash
[14:19:17 root@centos7 ~]#cat  /usr/lib/systemd/system/nginx.service 
[Unit]
Description=The nginx HTTP and reverse proxy server
After=network.target remote-fs.target nss-lookup.target

[Service]
Type=forking
PIDFile=/apps/nginx/logs/nginx.pid
# Nginx will fail to start if /run/nginx.pid already exists but has the wrong
# SELinux context. This might happen when running `nginx -t` from the cmdline.
# https://bugzilla.redhat.com/show_bug.cgi?id=1268621
ExecStartPre=/usr/bin/rm -f /apps/nginx/logs/nginx.pid
ExecStartPre=/apps/nginx/sbin/nginx -t
ExecStart=/apps/nginx/sbin/nginx
ExecReload=/bin/kill -s HUP $MAINPID
KillSignal=SIGQUIT
TimeoutStopSec=5
KillMode=mixed
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

##### **2.4.2.4.2** **Nginx 1.18.0**

```bash
# cat /lib/systemd/system/nginx.service

[Unit]
Description=nginx - high performance web server
Documentation=http://nginx.org/en/docs/
After=network-online.target remote-fs.target nss-lookup.target
Wants=network-online.target

[Service]
Type=forking
PIDFile=/apps/nginx/run/nginx.pid
ExecStart=/apps/nginx/sbin/nginx -c /apps/nginx/conf/nginx.conf
ExecReload=/bin/kill -s HUP $MAINPID
ExecStop=/bin/kill -s TERM $MAINPID

[Install]
WantedBy=multi-user.target
```

#### **2.4.2.5** 验证**Nginx**⾃启动脚本

```bash
[14:22:35 root@centos7 ~]#systemctl daemon-reload 
[14:23:33 root@centos7 ~]#systemctl start nginx
[14:23:38 root@centos7 ~]#systemctl status nginx
● nginx.service - The nginx HTTP and reverse proxy server
   Loaded: loaded (/usr/lib/systemd/system/nginx.service; enabled; vendor preset: disabled)
   Active: active (running) since Tue 2021-03-23 14:18:57 CST; 4min 47s ago
 Main PID: 32104 (nginx)
   CGroup: /system.slice/nginx.service
           ├─32104 nginx: master process /apps/nginx/sbin/nginx
           └─32142 nginx: worker process
```

#### **2.5.2.6** 配置**Nginx**

Nginx的配置⽂件的组成部分：

**主配置⽂件：** nginx.conf，⼦配置⽂件 include conf.d/*.conf

```bash
fastcgi， uwsgi，scgi等协议相关的配置⽂件

mime.types：⽀持的mime类型，MIME(Multipurpose Internet Mail Extensions)多⽤途互联⽹邮件扩展类型，MIME消息能包含⽂本、图像、⾳频、视频以及其他应⽤程序专⽤的数据，是设定某种扩展名的⽂件⽤⼀种应⽤程序来打开的⽅式类型，当该扩展名⽂件被访问的时候，浏览器会⾃动使⽤指定应⽤程序来打开。多⽤于指定⼀些客户端⾃定义的⽂件名，以及⼀些媒体⽂件打开⽅式。

Nginx主配置⽂件的配置指令⽅式：
directive value [value2 ...];
注意：
(1) 指令必须以分号结尾
(2) ⽀持使⽤配置变量
 内建变量：由Nginx模块引⼊，可直接引⽤
 ⾃定义变量：由⽤户使⽤set命令定义
 set variable_name value;
 引⽤变量：$variable_name
```

MIME参考⽂档：https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Basics_of_HTTP/MIME_Types

#### **2.5.2.7** 默认配置文件

```bash
[14:26:49 root@centos7 ~]#grep -v "#" /apps/nginx/conf/nginx.conf | grep -v "^$"
#全局配置端，对全局⽣效，主要设置nginx的启动⽤户/组，启动的⼯作进程数量，⼯作模式，Nginx的PID路径，⽇志路径等
user nginx [nginx];    #启动用户和组，以什么身份运行
worker_processes  1;   #启动工作进程数量
events {  #events设置块，主要影响nginx服务器与用户的网络连接，比如是否允许同时接受多个网络连接，使用哪种事件驱动模型处理请求，每个工作进程可以同时支持的最大连接数，是否开启对工作进行下的网络连接进行序列化
    worker_connections  1024;  #设置单个nginx工作进程可以接受的最大并发，作为web服务器的时候最大并发数为worker_connections * worker_processes，作为反向代理的时候为worker_connections * worker_processes(worker_connections * worker_processes)/2
}
http {     #http块是Nginx服务器配置中的重要部分，缓存、代理和⽇志格式定义等绝⼤多数功能和第三⽅模块都可以在这设置，http块可以包含多个server块，⽽⼀个server块中⼜可以包含多个location块，server块可以配置⽂件引⼊、MIME-Type定义、⽇志⾃定义、是否启⽤sendfile、连接超时时间和单个链接的请求上限等。
    include       mime.types;
    default_type  application/octet-stream;
    sendfile        on;  #作为web服务器的时候打开sendfile加快静态⽂件传输，指定是否使⽤sendfile系统调⽤来传输⽂件,sendfile通过DMA(直接内存访问)⽅式直接访问⽂件数据，并通过传输协议发送，从⽽避免了数据在内核缓冲区和⽤户缓冲区之间的拷⻉，操作效率很⾼，被称之为零拷⻉，硬盘>> kernel buffer (快速拷⻉到kernel socket buffer) >>协议栈。
    # DMA(Direct Memory Access)即直接内存访问，DMA是⼀种完全由硬件执⾏I/O交换的⼯作⽅式,⼀个处理器可以包含多个DMA控制器，每个控制器有多个DMA通道，以及多条直接与存储器站(memorybank)和外设连接的总线，在很多⾼性能处理器中集成了两种类型的DMA控制器，第⼀类通常称为“系统DMA控制器”，可以实现对任何资源(外设和存储器)的访问，第⼆类称为内部存储器DMA控制器，专⻔⽤于内部存储器所处位置之间的相互存取操作，即数据交换不经过CPU在不同的内存空间进⾏拷⻉可以节省资源copy带来的上线⽂切换，可以直接在内存和I/O设备之间进⾏，可以⼤幅提⾼CPU性能。
    keepalive_timeout  65;  #⻓连接超时时间，单位是秒
    server {   #设置⼀个虚拟机主机，可以包含⾃⼰的全局快，同时也可以包含多个location模块。⽐如本虚拟机监听的端⼝、本虚拟机的名称和IP配置，多个server 可以使⽤⼀个端⼝，⽐如都使⽤80端⼝提供web服务、
        listen       80;        #配置server监听的端⼝
        server_name  localhost; #本server的名称，当访问此名称的时候nginx会调⽤当前serevr内部的配置进程匹配。
        location / {   #location其实是server的⼀个指令，为nginx服务器提供⽐较多⽽且灵活的指令，都是在location中体现的，主要是基于nginx接受到的请求字符串，对⽤户请求的UIL进⾏匹配，并对特定的指令进⾏处理，包括地址重定向、数据缓存和应答控制等功能都是在这部分实现，另外很多第三⽅模块的配置也是在location模块中配置。
            root   html;  #相当于默认⻚⾯的⽬录名称，默认是相对路径，可以使⽤绝对路径配置。
            index  index.html index.htm;  #默认的⻚⾯⽂件名称
        }
        error_page   500 502 503 504  /50x.html;  #错误⻚⾯的⽂件名称
        location = /50x.html {    #location处理对应的不同错误码的⻚⾯定义到/50x.html，这个跟对应其server中定义的⽬录下。
            root   html;  #定义默认⻚⾯所在的⽬录
        }
    }
}

#和邮件相关的配置
#mail {
# 			...
# 				} mail 协议相关配置段

#tcp代理配置，1.9版本以上⽀持
#stream {
# 		...
# 			} stream 服务器相关配置段

#导⼊其他路径的配置⽂件
#include /apps/nginx/conf.d/*.conf
```

**实例：sendfile开启访问数据流程图**

![image-20210323143828995](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210323143828995.png)

### 2.4.3 编译安装脚本

**centos与ubuntu都可以使用**

```bash
#!/bin/bash
#
#********************************************************************
#Author:zhangzhuo
#QQ: 1191400158
#Date: 2021-03-23
#FileName：install_nginx.sh
#URL: https://www.zhangzhuo.ltd
#Description：The test script
#Copyright (C): 2021 All rights reserved
#********************************************************************
INS_DIR='/apps/nginx'
http_tar_file='https://nginx.org/download/nginx-1.18.0.tar.gz'
tar_file=`echo ${http_tar_file} | grep -Eo '[^/]+$'`
dir_file=`echo ${tar_file} | sed -rn 's/(.*)\.tar.*/\1/p'`

set='--user=nginx --group=nginx --with-http_ssl_module --with-http_v2_module --with-http_realip_module --with-http_stub_status_module --with-http_gzip_static_module --with-pcre --with-stream --with-stream_ssl_module --with-stream_realip_module'


install_yum(){
yum install -y gcc gcc-c++ pcre pcre-devel zlib zlib-devel openssl openssl-devel automake perl wget
cat >/usr/lib/systemd/system/nginx.service<<EOF
[Unit]                                                                              
Description=The nginx HTTP and reverse proxy server
After=network.target remote-fs.target nss-lookup.target

[Service]
Type=forking
PIDFile=${INS_DIR}/logs/nginx.pid
# Nginx will fail to start if /run/nginx.pid already exists but has the wrong
# SELinux context. This might happen when running \`nginx -t\` from the cmdline.
# https://bugzilla.redhat.com/show_bug.cgi?id=1268621
ExecStartPre=/usr/bin/rm -f ${INS_DIR}/logs/nginx.pid
ExecStartPre=${INS_DIR}/sbin/nginx -t
ExecStart=${INS_DIR}/sbin/nginx
ExecReload=/bin/kill -s HUP \$MAINPID
KillSignal=SIGQUIT
TimeoutStopSec=5
KillMode=mixed
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
}
install_apt(){
apt install gcc openssl  automake perl wget libpcre3 libpcre3-dev  zlib1g-dev libssl-dev make -y
cat >/lib/systemd/system/nginx.service<<EOF
[Unit]                                                                              
Description=The nginx HTTP and reverse proxy server
After=network.target remote-fs.target nss-lookup.target

[Service]
Type=forking
PIDFile=${INS_DIR}/logs/nginx.pid
# Nginx will fail to start if /run/nginx.pid already exists but has the wrong
# SELinux context. This might happen when running \`nginx -t\` from the cmdline.
# https://bugzilla.redhat.com/show_bug.cgi?id=1268621
ExecStartPre=/bin/rm -f ${INS_DIR}/logs/nginx.pid
ExecStartPre=${INS_DIR}/sbin/nginx -t
ExecStart=${INS_DIR}/sbin/nginx
ExecReload=/bin/kill -s HUP \$MAINPID
KillSignal=SIGQUIT
TimeoutStopSec=5
KillMode=mixed
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload

}

install(){
wget $http_tar_file
tar xvf ${tar_file}
cd ${dir_file}
./configure --prefix=${INS_DIR} ${set} || { echo '执行错误，请检查环境'; exit ;}
make && make install
useradd -r -s /sbin/nologin nginx
chown -R nginx.nginx ${INS_DIR}
cat >/usr/lib/systemd/system/nginx.service<<EOF
[Unit]
Description=The nginx HTTP and reverse proxy server
After=network.target remote-fs.target nss-lookup.target

[Service]
Type=forking
PIDFile=${INS_DIR}/logs/nginx.pid
# Nginx will fail to start if /run/nginx.pid already exists but has the wrong
# SELinux context. This might happen when running \`nginx -t\` from the cmdline.
# https://bugzilla.redhat.com/show_bug.cgi?id=1268621
ExecStartPre=/usr/bin/rm -f ${INS_DIR}/logs/nginx.pid
ExecStartPre=${INS_DIR}/sbin/nginx -t
ExecStart=${INS_DIR}/sbin/nginx
ExecReload=/bin/kill -s HUP \$MAINPID
KillSignal=SIGQUIT
TimeoutStopSec=5
KillMode=mixed
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
echo "PATH=${INS_DIR}/sbin:\$PATH" >/etc/profile.d/nginx.sh
}

install_all(){
os=`grep -Eo 'centos|ubuntu' /etc/os-release | head -1`
if [ $os == centos ];then
     install_yum
     install
	echo centos
elif [ $os == ubuntu ];then
     install_apt
     install
else
	echo "本脚本不支持此系统"	
fi
}

install_all
```

# 三、**Nginx** 核心配置详解

## 3.1 全局配置

```bash
[16:08:57 root@centos8 ~]#grep -v "#" /apps/nginx/conf/nginx.conf | grep -v "^$"
user nginx [nginx]; #启动nginx工作进行的用户和组
worker_processes  [number|auto]; #启动nginx工作进程的数量,可以写个数，也可以写auto自动，系统有几个cpu内核自动开启几个工作进程
worker_cpu_affinity 0001 0010 0100 1000; #将Nginx⼯作进程绑定到指定的CPU核⼼，默认Nginx是不进⾏进程绑定的，绑定并不是意味着当前nginx进程独占以⼀核⼼CPU，但是可以保证此进程不会运⾏在其他核⼼上，这就极⼤减少了nginx的⼯作进程在不同的cpu核⼼上的来回跳转，减少了CPU对进程的资源分配与回收以及内存管理等，因此可以有效的提升nginx服务器的性能。可以写auto自动绑定

#错误⽇志记录配置，语法：error_log file [debug | info | notice | warn | error |crit | alert | emerg]可以根据错误级别分别设置
#error_log logs/error.log;
#error_log logs/error.log notice;
error_log /apps/nginx/logs/error.log error;

#pid⽂件保存路径
pid /apps/nginx/logs/nginx.pid;
worker_priority 0;  #⼯作进程nice值即进程运行优先级越小越优先，-20~19
worker_rlimit_nofile 65536; #这个数字包括Nginx的所有连接（例如与代理服务器的连接等），⽽不仅仅是与客户端的连接,另⼀个考虑因素是实际的并发连接数不能超过系统级别的最⼤打开⽂件数的限制.
daemon off;  #前台运⾏Nginx服务⽤于测试、docker等环境。
master_process off|on;  #是否开启Nginx的master-woker⼯作模式，仅⽤于开发调试场景。

events {   #事件模型配置参数
    worker_connections  1024; #设置单个⼯作进程的最⼤并发连接数
    use epoll;    #使⽤epoll事件驱动，Nginx⽀持众多的事件驱动，⽐如select、poll、epoll，只能设置在events模块中设置。
    accept_mutex on; #优化同⼀时刻只有⼀个请求⽽避免多个睡眠进程被唤醒的设置，on为防⽌被同时唤醒，默认为off，全部唤醒的过程也成为"惊群"，因此nginx刚安装完以后要进⾏适当的优化。
    multi_accept on; #Nginx服务器的每个⼯作进程可以同时接受多个新的⽹络连接，但是需要在配置⽂件中配置，此指令默认为关闭，即默认为⼀个⼯作进程只能⼀次接受⼀个新的⽹络连接，打开后⼏个同时接受多个。
}
```

## 3.2 http详细配置

```bash
http {
    include       mime.types;   #导⼊⽀持的⽂件类型
    default_type  application/octet-stream;   #设置默认的类型，会提示下载不匹配的类型⽂件
#⽇志配置部分
 #log_format main '$remote_addr - $remote_user [$time_local] "$request" '
 # '$status $body_bytes_sent "$http_referer" '
 # '"$http_user_agent" "$http_x_forwarded_for"';
 #access_log logs/access.log main;

#⾃定义优化参数
    sendfile        on;   #实现⽂件零拷⻉
    #tcp_nopush     on;   #在开启了sendfile的情况下，合并请求后统⼀发送给客户端。
    #tcp_nodelay    off;  #在开启了keepalived模式下的连接是否启⽤TCP_NODELAY选项，当为off时，延迟0.2s发送，默认On时，不延迟发送，⽴即发送⽤户相应报⽂。
    keepalive_timeout  65 65; #设置会话保持时间,如果写俩个参数表示后面的参数会告诉客户端
    gzip on;  #开启⽂件压缩
   
    server {
        listen       80;        #设置监听地址和端⼝
        server_name  localhost;  #设置server name，可以以空格隔开写多个并⽀持正则表达式，如*.magedu.com www.magedu.* www.(site\d+)\.magedu\.com$ default_server
        location / {
            root   html;
            index  index.html index.htm;
        }
        error_page   500 502 503 504  /50x.html;  #定义错误页面
        location = /50x.html {
            root   html;
        }
 # proxy the PHP scripts to Apache listening on 127.0.0.1:80
 #
 #location ~ \.php$ { #以http的⽅式转发php请求到指定web服务器
 # proxy_pass http://127.0.0.1;
 #}
 # pass the PHP scripts to FastCGI server listening on 127.0.0.1:9000
 #
 #location ~ \.php$ { #以fastcgi的⽅式转发php请求到php处理
 # root html;
 # fastcgi_pass 127.0.0.1:9000;
 # fastcgi_index index.php;
 # fastcgi_param SCRIPT_FILENAME /scripts$fastcgi_script_name;
 # include fastcgi_params;
 #}
 # deny access to .htaccess files, if Apache's document root
 # concurs with nginx's one
 #
 #location ~ /\.ht { #拒绝web形式访问指定⽂件，如很多的⽹站都是通过.htaccess⽂件来改变⾃⼰的重定向等功能。
 # deny all;
 #}
    }
}
# another virtual host using mix of IP-, name-, and port-based configuration
#
#server { #⾃定义虚拟server
# listen 8000;
# listen somename:8080;
# server_name somename alias another.alias;
# location / {
# root html;
# index index.html index.htm; #指定默认⽹⻚⽂件，此指令由ngx_http_index_module模块提供
# }
#}
# HTTPS server
#
#server { #https服务器配置
# listen 443 ssl;
# server_name localhost;
# ssl_certificate cert.pem;
# ssl_certificate_key cert.key;
# ssl_session_cache shared:SSL:1m;
# ssl_session_timeout 5m;
# ssl_ciphers HIGH:!aNULL:!MD5;
# ssl_prefer_server_ciphers on;
# location / {
# root html;
# index index.html index.htm;
# }
location /linux38/passwd.ht {
deny all;
}
#}
```

## **3.3** 核心配置示例

基于不同的IP、不同的端⼝以及不⽤得域名实现不同的虚拟主机，依赖于核⼼模块ngx_http_core_module实现。

### **3.3.1** 新建⼀个**PC web**站点

```bash
[16:59:04 root@centos8 ~]#mkdir  /apps/nginx/conf/conf.d
[17:01:06 root@centos8 ~]#cat /apps/nginx/conf/conf.d/pc.conf
server {
    listen 80;
    server_name www.zhangzhuo.org;
    location / {
       root /data/nginx/html/pc;
    }
}
[17:01:10 root@centos8 ~]#mkdir /data/nginx/html/pc -p
[17:01:36 root@centos8 ~]#echo "pc web" > /data/nginx/html/pc/index.html
[17:03:12 root@centos8 ~]#vim /apps/nginx/conf/nginx.conf
#写到http块中
include /apps/nginx/conf/conf.d/*.conf;
[17:03:56 root@centos8 ~]#systemctl reload nginx.service 
#测试
[17:04:18 root@centos8 ~]#vim /etc/hosts
192.168.10.81 www.zhangzhuo.org
[17:04:49 root@centos8 ~]#curl www.zhangzhuo.org
pc web
```

### 3.3.2 新建⼀个Mobile web站点

```bash
[17:07:32 root@centos8 ~]#cat /apps/nginx/conf/conf.d/mobile.conf
server {
    listen 80;
    server_name mobile.zhangzhuo.org;
    location / {
        root /data/nginx/html/mobile;
    }

}
[17:07:34 root@centos8 ~]#mkdir /data/nginx/html/mobile -p
[17:07:48 root@centos8 ~]#echo "mobile web" >> /data/nginx/html/mobile/index.html
[17:08:23 root@centos8 ~]#systemctl reload nginx.service
#访问测试
[17:04:18 root@centos8 ~]#vim /etc/hosts
192.168.10.81 www.zhangzhuo.org mobile.zhangzhuo.org
[17:09:01 root@centos8 ~]#curl mobile.zhangzhuo.org
mobile web
[17:09:37 root@centos8 ~]#curl www.zhangzhuo.org
pc web
```

### **3.3.3** **root**与**alias**

**root：指定web的家⽬录，在定义location的时候，⽂件的绝对路径等于 root+location，如：**

```bash
[17:11:41 root@centos8 ~]#cat /apps/nginx/conf/conf.d/pc.conf
server {
    listen 80;
    server_name www.zhangzhuo.org;
    location / {
       root /data/nginx/html/pc;
    }
    location /about {
        root /data/nginx/html/pc; #必须要在cp⽬录中创建⼀个about⽬录才可以访问，否则报错。
        index index.html;
    }
}
[17:11:47 root@centos8 ~]#mkdir /data/nginx/html/pc/about
[17:13:01 root@centos8 ~]#echo about >/data/nginx/html/pc/about/index.html
#测试
[17:13:48 root@centos8 ~]#systemctl reload nginx.service
[17:14:00 root@centos8 ~]#curl http://www.zhangzhuo.org/about/
about
```

**alias：定义路径别名，会把访问的路径重新定义到其指定的路径，如**

```bash
[17:16:19 root@centos8 ~]#cat /apps/nginx/conf/conf.d/pc.conf
server {
    listen 80;
    server_name www.zhangzhuo.org;
    location / {
       root /data/nginx/html/pc;
    }
    location /about {   #使⽤alias的时候uri后⾯如果加了斜杠则下⾯的路径配置必须加斜杠，否则403
        alias /data/nginx/html/pc;  #当访问about的时候，会显示alias定义的/data/nginx/html/pc⾥⾯的内容。
        index index.html;
    }
}
#测试
[17:16:22 root@centos8 ~]#systemctl reload nginx.service 
[17:17:03 root@centos8 ~]#curl http://www.zhangzhuo.org/about/
pc web
```

### **3.3.4** **location**的详细使用

在没有使⽤正则表达式的时候，nginx会先在server中的多个location选取匹配度最⾼的⼀个uri，uri是⽤户请求的字符串，即域名后⾯的web⽂件路径，然后使⽤该location模块中的正则url和字符串，如果匹配成功就结束搜索，并使⽤此location处理此请求。

```bash
语法规则： location [=|~|~*|^~] /uri/ { … }

= #⽤于标准uri前，需要请求字串与uri精确匹配，如果匹配成功就停⽌向下匹配并⽴即处理请求。
~ #⽤于标准uri前，表示包含正则表达式并且区分⼤⼩写，并且匹配
!~ #⽤于标准uri前，表示包含正则表达式并且区分⼤⼩写，并且不匹配


~* #⽤于标准uri前，表示包含正则表达式并且不区分⼤写，并且匹配
!~* #⽤于标准uri前，表示包含正则表达式并且不区分⼤⼩写,并且不匹配

^~ #⽤于标准uri前，表示包含正则表达式并且匹配以什么开头
$ #⽤于标准uri前，表示包含正则表达式并且匹配以什么结尾
\ #⽤于标准uri前，表示包含正则表达式并且转义字符。可以转. * ?等
* #⽤于标准uri前，表示包含正则表达式并且代表任意⻓度的任意字符
```

#### **3.3.4.1** 匹配案例**-**精确匹配

在server部分使⽤location配置⼀个web界⾯，要求：当访问nginx 服务器的/login的时候要显示指定html⽂件的内容：

```bash
[17:39:29 root@centos8 ~]#cat /apps/nginx/conf/conf.d/pc.conf 
server {
    listen 80;
    server_name www.zhangzhuo.org;
    location / {
       root /data/nginx/html/pc;
    }
    location = /1.jpg {
        root /var/www/nginx/images;
        index index.html;
    }
}
上传图⽚到/var/www/nginx/images，重启Nginx并访问测试
访问测试：http://www.magedu.net/1.jpg
```

#### **3.3.4.2** 匹配案例**-**区分大小写

如果uri中包含⼤写字⺟，则以下location匹配Ax.jpg条件不成功，因为~为区分⼤⼩写，那么当⽤户的请求被执⾏匹配时发现location中定义的是⼤写的A，则匹配失败，即要么继续往下匹配其他的location（如果有），要么报错给客户端。

```bash
[17:43:39 root@centos8 ~]#cat  /apps/nginx/conf/conf.d/pc.conf
server {
    listen 80;
    server_name www.zhangzhuo.org;
    location / {
       root /data/nginx/html/pc;
    }
    location ~ /A.?\.jpg {
        root /opt/nginx/html/images;
        index index.html;
    }
}
重启Nginx并访问测试
将只能访问以⼩写字符的AX.jpg图⽚，不能识别⼤写的JPG结尾的图⽚
访问测试：http://www.magedu.net/A*.jpg #直接访问资源名称即可
```

![image-20210323174546099](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210323174546099.png)

#### **3.3.4.3** 匹配案例**-**不区分大小写

对⽤户请求的uri做模糊匹配，也就是uri中⽆论都是⼤写、都是⼩写或者⼤⼩写混合，此模式也都会匹配，通常使⽤此模式匹配⽤户request中的静态资源并继续做下⼀步操作

```
[17:49:01 root@centos8 images]#cat /apps/nginx/conf/conf.d/pc.conf 
server {
    listen 80;
    server_name www.zhangzhuo.org;
    location / {
       root /data/nginx/html/pc;
    }
    location ~* /A.?\.jpg {
        root /opt/nginx/html/images;
        index index.html;
    }
}
重启Nginx并访问测试
对于不区分⼤⼩写的location，则可以访问任意⼤⼩写结尾的图⽚⽂件,如区分⼤⼩写则只能访问aa.jpg，不区分⼤⼩写则可以访问aa.jpg以外的资源⽐如Aa.JPG、aA.jPG这样的混合名称⽂件，但是要求nginx服务器的资源⽬录有相应的⽂件，⽐如有Aa.JPG有aA.jPG。
重点：
Nginx匹配⼀次⽂件名是否区分⼤⼩写
Nginx可以在服务器找到指定的资源
```

#### **3.3.4.4** 匹配案例**-URI**开始

```bash
[19:47:02 root@centos8 ~]#cat /apps/nginx/conf/conf.d/pc.conf 
server {
    listen 80;
    server_name www.zhangzhuo.org;
    location / {
       root /data/nginx/html/pc;
    }
    location ^~ /images {
     root /data/nginx;
     index index.html;
    }
    location /images1 {
       alias /data/nginx/html/pc;
       index index.html;
    }
}
[19:46:12 root@centos8 ~]#mkdir /data/nginx/images -p
[19:46:42 root@centos8 ~]#echo images > /data/nginx/images/index.html
#重启Nginx并访问测试，实现效果是访问images和images1返回不同的结果
[19:48:06 root@centos8 ~]#nginx -s reload
[19:49:19 root@centos8 ~]#curl www.zhangzhuo.org/images1/
pc web
[19:49:20 root@centos8 ~]#curl www.zhangzhuo.org/images/
images
```

#### 3.3.4.5 匹配案例-文件名后缀

```bash
[19:56:47 root@centos8 nginx]#cat /apps/nginx/conf/conf.d/pc.conf 
server {
    listen 80;
    server_name www.zhangzhuo.org;
    location / {
       root /data/nginx/html/pc;
    }
    location = /AX.jpg {
       root /data/nginx/images;
       index index.html;
    }
    location ~* \.(gif|jpg|bmp|png|tiff|tif|ico|wmf|js)$ {
       root /data/nginx/images1;
       index index.html;
    }
}
#上传⼀个和images⽬录不⼀样内容的的图⽚1.j到/data/nginx/images1
[19:57:06 root@centos8 nginx]#tree /data/nginx/images*
/data/nginx/images
├── AX.jpg
└── index.html
/data/nginx/images1
├── nide.jpg
└── wode.jpg
#重启Nginx并访问测试
访问AX.jpg是访问的/data/nginx/images文件中的AX.jpg
访问其他.jpg结尾的文件都去/data/nginx/images1文件夹找
```

#### 3.3.4.6：匹配案例-优先级

```bash
[20:10:28 root@centos8 images1]#cat /apps/nginx/conf/conf.d/pc.conf
server {
    listen 80;
    server_name www.zhangzhuo.org;
    location = /images.html {  #通常⽤于精确匹配指定⽂件，如favicon.ico、employcode.js、index.jsp等
       root /data/nginx/images;
       index index.html;
    }
    location ~* \.html$ {
       root /data/nginx/images1;
       index index.html;
    }
}
[20:10:38 root@centos8 images1]#curl www.zhangzhuo.org/images.html
images
[20:10:46 root@centos8 images1]#curl www.zhangzhuo.org/images1.html
iamges1.html

#匹配优先级：=, ^~, ～/～*，/
#location优先级：(location =) > (location 完整路径) > (location ^~ 路径) >(location ~,~* 正则顺序) > (location 部分起始路径) > (/)
```

#### 3.3.4.7：生产使用案例

```bash
#直接匹配⽹站根会加速Nginx访问处理:
location = /index.html {
  ......;
}
location / {
  ......;
}

#静态资源配置：
location ^~ /static/ {
 ......;
}
# 或者
location ~* \.(gif|jpg|jpeg|png|css|js|ico)$ {
 ......;
}

#多应⽤配置
location ~* /app1 {
 ......;
}
location ~* /app2 {
 ......;
}
```

### 3.3.5 Nginx 四层访问控制

访问控制基于模块 **ngx_http_access_module** 实现，可以通过匹配客户端源IP地址进⾏限制。

```bash
[20:23:32 root@centos8 images1]#cat /apps/nginx/conf/conf.d/pc.conf
server {
    listen 80;
    server_name www.zhangzhuo.org;
    location = /index.html {
       root /data/nginx/html/pc;
       index index.html;
    }
    location /about {
       alias /data/nginx/html/pc;
       index index.html;
       allow 192.168.10.1; 
       deny 10.0.0.0/16;
       deny all;    #先允许⼩部分，再拒绝⼤部分
    }
}
[20:25:08 root@centos8 ~]#curl www.zhangzhuo.org
pc web
[20:25:13 root@centos8 ~]#curl www.zhangzhuo.org/about/
<html>
<head><title>403 Forbidden</title></head>
<body>
<center><h1>403 Forbidden</h1></center>
<hr><center>nginx/1.18.0</center>
</body>
</html>
```

### 3.3.6 Nginx账户认证功能：

```bash
[20:25:16 root@centos8 ~]#yum install -y httpd-tools -y     #Centos
[20:26:20 root@ubuntu ~]#apt install apache2-utils          #Ubuntu
[20:27:25 root@centos8 ~]#htpasswd -cbm /apps/nginx/conf/.htpasswd user1 123456
[20:27:52 root@centos8 ~]#htpasswd -bm /apps/nginx/conf/.htpasswd user2 123456
[20:28:02 root@centos8 ~]#tail /apps/nginx/conf/.htpasswd 
user1:$apr1$gWQvIMJb$rueqU7.ZcojxfHtse3iXF/
user2:$apr1$kkIooJMz$tbJxpweRtYrfCrbqdHscA0
[20:30:13 root@centos8 ~]#cat /apps/nginx/conf/conf.d/pc.conf 
server {
    listen 80;
    server_name www.zhangzhuo.org;
    location = /index.html {
       root /data/nginx/html/pc;
       index index.html;
    }
    location = /login {
       root /data/nginx/html;
       index index.html;
       auth_basic "login password";
       auth_basic_user_file /apps/nginx/conf/.htpasswd;
    }
}
[20:30:23 root@centos8 ~]#mkdir /data/nginx/html/login
[20:30:49 root@centos8 ~]#echo login >/data/nginx/html/login/index.html
#重启Nginx并访问测试
[20:37:59 root@centos8 ~]#systemctl restart nginx.service
```

### 3.3.7 自定义错误页面

```bash
[20:40:47 root@centos8 ~]#cat /apps/nginx/conf/conf.d/pc.conf 
server {
    listen 80;
    server_name www.zhangzhuo.org;
    location = /index.html {
       root /data/nginx/html/pc;
       index index.html;
    }
    error_page 500 502 503 504 404 /error.html;
    location = /error.html {
       root /data/nginx/html;    
    }
}
[20:40:34 root@centos8 ~]#echo error >/data/nginx/html/error.html
#重启nginx并访问不存在的⻚⾯进⾏测试
```

### 3.3.8 自定义访问日志

```bash
[20:41:37 root@centos8 ~]#mkdir /data/nginx/logs
[20:44:54 root@centos8 ~]#chown nginx.nginx /data/nginx/logs
[20:45:12 root@centos8 ~]#cat /apps/nginx/conf/conf.d/pc.conf 
server {
    listen 80;
    server_name www.zhangzhuo.org;
    error_page 500 502 503 504 404 /error.html;   #默认⽬录下⾯创建error.html⻚⾯
    access_log /data/nginx/logs/www.zhangzhuo.org_access.log;  #访问日志
    error_log /data/nginx/logs/www.zhangzhuo.org_error.log;    #错误日志
    location = /index.html {
       root /data/nginx/html/pc;
       index index.html;
    }
    location = /error.html {
       root /data/nginx/html;    
    }
}
#重启nginx并访问不存在的⻚⾯进⾏测试并验证是在指定⽬录⽣成新的⽇志⽂件
[20:46:20 root@centos8 ~]#tree /data/nginx/logs/
/data/nginx/logs/
├── www.zhangzhuo.org_access.log
└── www.zhangzhuo.org_error.log
```

### 3.3.9：检测文件是否存在

try_files会按顺序检查⽂件是否存在，返回第⼀个找到的⽂件或⽂件夹（结尾加斜线表示为⽂件夹），如果所有⽂件或⽂件夹都找不到，会进⾏⼀个内部重定向到最后⼀个参数。只有最后⼀个参数可以引起⼀个内部重定向，之前的参数只设置内部URI的指向。最后⼀个参数是回退URI且必须存在，否则会出现内部500错误。

```bash
[21:08:06 root@centos8 ~]#cat /apps/nginx/conf/conf.d/pc.conf 
server {
    listen 80;
    server_name www.zhangzhuo.org;
    location /about {
       root /data/nginx/html/pc;
       index index.html;
       try_files $uri $uri/index.html $uri.html =666;
       #try_files $usi $uri/index.html /index.html;
    }
}

#重启nginx并测试，当访问到http://www.zhangzhuo.org/about/xx.html等不存在的uri会显示default，如果是⾃定义的状态码则会显示在返回数据的状态码中，如：
[21:08:19 root@centos8 ~]#curl www.zhangzhuo.org/about/xxx.html --head
HTTP/1.1 666  #666就是自定义的状态返回码
Server: nginx/1.18.0
Date: Wed, 24 Mar 2021 13:08:41 GMT
Content-Length: 0
Connection: keep-alive
```

### 3.3.10 长连接配置

keepalive_timeout number; #设定保持连接超时时⻓，0表示禁止长连接，默认为75s，通常配置在http字段作为站点全局配置

keepalive_requests number;    #在⼀次⻓连接上所允许请求的资源的最⼤数量，默认为100次，如果网站一个PV的资源很多可以适当调大，以防止一个PV传输时进行多次TCP连接

```bash
keepalive_requests 3;      #连接后允许传输的最大文件数量
keepalive_timeout 65 65;   #长连接时间单位秒
#开启⻓连接后，返回客户端的会话保持时间为60s，单次⻓连接累计请求达到指定次数请求或65秒就会被断开，后⾯的60为发送给客户端应答报⽂头部中显示的超时时间设置为60s：如不设置客户端将不显示超时时间。

Keep-Alive:timeout=65 #浏览器收到的服务器返回的报⽂

#如果设置为0表示关闭会话保持功能，将如下显示：
Connection:close #浏览器收到的服务器返回的报⽂
```

![image-20210324211505250](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210324211505250.png)

![image-20210324211727514](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210324211727514.png)

### 3.3.11 作为下载服务器配置

```bash
[09:18:01 root@centos8 ~]#mkdir /data/nginx/html/pc/download
[09:26:00 root@centos8 ~]#cat /apps/nginx/conf/conf.d/pc.conf
location /download {
        autoindex on;        #⾃动索引功能
        autoindex_exact_size on;  #计算⽂件确切⼤⼩（单位bytes），off只显示⼤概⼤⼩（单位kb、mb、gb）
        autoindex_localtime on;   #显示本机时间⽽⾮GMT(格林威治)时间
        root /data/nginx/html/pc;
        limit_rate 10k;
    }
#重启Nginx并访问测试下载⻚⾯
#limit_rate rate; #限制响应给客户端的传输速率，单位是bytes/second，默认值0表示⽆限制
```

### 3.3.12 作为上传服务器

```bash
client_max_body_size 1m；      #设置允许客户端上传单个⽂件的最⼤值，默认值为1m
client_body_buffer_size size;  #⽤于接收每个客户端请求报⽂的body部分的缓冲区⼤⼩；默认16k；超出此⼤⼩时，其将被暂存到磁盘上的由下⾯client_body_temp_path指令所定义的位置
client_body_temp_path path [level1 [level2 [level3]]];
#设定存储客户端请求报⽂的body部分的临时存储路径及⼦⽬录结构和数量，⽬录名为16进制的数字，使⽤hash之后的值从后往前截取1位、2位、2位作为⽂件名：
[10:27:33 root@centos8 ~]#md5sum /data/nginx/html/pc/index.html 
95f6f65f498c74938064851b1bb963d4  /data/nginx/html/pc/index.html
1级⽬录占1位16进制，即2^4=16个⽬录 0-f
2级⽬录占2位16进制，即2^8=256个⽬录 00-ff
3级⽬录占2位16进制，即2^8=256个⽬录 00-ff
配置示例：
 client_max_body_size 10m；
 client_body_buffer_size 16k;
 client_body_temp_path /apps/nginx/temp 1 2 2; #reload Nginx会⾃动创建temp⽬录
```

### 3.3.13 其他配置

#### 3.3.13.1 对那些浏览器禁用长连接

```bash
keepalive_disable none | browser ...;
#对哪种浏览器禁⽤⻓连接
```

#### 3.3.13.2 限制客户端请求方法

```bash
limit_except method ... { ... } #仅⽤于location
#限制客户端使⽤除了指定的请求⽅法之外的其它⽅法
 method:GET, HEAD, POST, PUT, DELETE，MKCOL, COPY, MOVE, OPTIONS, PROPFIND,
PROPPATCH, LOCK, UNLOCK, PATCH
limit_except GET {
 allow 192.168.0.0/24;
 allow 192.168.7.101;
 deny all;
 }
 #除了GET和HEAD 之外其它⽅法仅允许192.168.1.0/24⽹段主机使⽤
    location /about {
       root /data/nginx/html/pc;
       index index.html;
       limit_except GET {
         allow 192.168.10.1;
         deny all; 
       }
```

#### 3.3.13.3 开启AIO功能以及多线程（优化性能）

```bash
aio on | off #是否启⽤asynchronous file I/O(AIO)功能，需要编译开启
#linux 2.6以上内核提供以下⼏个系统调⽤来⽀持aio： 1、SYS_io_setup：建⽴aio 的context
2. SYS_io_submit: 提交I/O操作请求
3. SYS_io_getevents：获取已完成的I/O事件
4. SYS_io_cancel：取消I/O操作请求
5. SYS_io_destroy：毁销aio的context

directio size | off;  #directio是直接磁盘IO，默认为关闭，directio的设计初衷，它具备sendfile的基本原理，只是不使⽤内核cache，⽽是直接使⽤DMA，当某个⽂件⼤于等于给定⼤⼩时会⽣效，⼩于此值会使⽤sendfile，例如directio 4m，直接I/O最⼤的优点就是减少操作系统缓冲区和⽤户地址空间的拷⻉次数，降低了CPU的开销和内存带宽，主要使⽤在磁盘上有较⼤⽂件的场合，⽐如视频、⾳频等。

directio_alignment 512; #设置directio的对⻬⽅式，在⼤多数情况下，⼀个512字节的对⻬就⾜够了，但是，在Linux下使⽤XFS时，需要将其增加到4K。

#directio可以和sebdfile结合使⽤不冲突，在Linux上同时启⽤ AIO和sendfile时，AIO⽤于⼤于或等于directio指令中指定的⼤⼩的⽂件，⽽sendfile⽤于较⼩的⽂件或禁⽤directio的⽂件,directio需要nginx开启aio,如：

location /video {
 root /data/video;
 index index.html;
 sendfile on;
 aio on;
 directio 8m;
 directio_alignment 512;
 }
#http://nginx.org/en/docs/http/ngx_http_core_module.html #aio
Syntax: aio on | off | threads[=pool]; #directio
Default: 
aio off;
Context: http, server, location
This directive appeared in version 0.8.11.

#重新编译安装nginx，开启线程池功能和aio，--with-file-aio，--with-threads
--prefix=/apps/nginx --user=nginx --group=nginx --with-http_ssl_module --with-http_v2_module --with-http_realip_module --with-http_stub_status_module --with-http_gzip_static_module --with-pcre --with-stream --with-stream_ssl_module --with-stream_realip_module --with-file-aio --with-threads

#nginx.conf配置线程池：配置在man中
[11:07:38 root@centos8 ~]#vim /apps/nginx/conf/nginx.conf
events {
    worker_connections  65536; #每个工作进程的最大连接数
    use epoll;    #使用epoll事件驱动
    accept_mutex on; #优化只有有个请求时避免多个进程被唤醒
    multi_accept on; #每个工作进程可以接受多个新的网络连接
}
thread_pool pool1 threads=16; #配置线程池
thread_pool pool2 threads=32;

#server调⽤线程池：
location = /index.html {
       root /data/nginx/html/pc;
       index index.html;
       sendfile on;
       aio threads=pool1;
       directio 8m;
       directio_alignment 4096;
    }

#重启nginx并验证：
[11:16:32 root@centos8 ~]#systemctl restart nginx.service
[11:17:07 root@centos8 ~]#ps -ef | grep nginx
root        5745       1  0 11:17 ?        00:00:00 nginx: master process /apps/nginx/sbin/nginx
nginx       5746    5745  0 11:17 ?        00:00:00 nginx: worker process
nginx       5747    5745  0 11:17 ?        00:00:00 nginx: worker process
nginx       5748    5745  0 11:17 ?        00:00:00 nginx: worker process
nginx       5749    5745  0 11:17 ?        00:00:00 nginx: worker process
root        5943    5351  0 11:17 pts/0    00:00:00 grep --color=auto nginx
[11:17:25 root@centos8 ~]#cat /proc/5746/status
Threads:	49
```

#### 3.3.13.4 缓存信息

```bash
open_file_cache off; #是否缓存打开过的⽂件信息
open_file_cache max=N [inactive=time];
#nginx可以缓存以下三种信息：
 (1) ⽂件元数据：⽂件的描述符、⽂件⼤⼩和最近⼀次的修改时间
 (2) 打开的⽬录结构
 (3) 没有找到的或者没有权限访问的⽂件的相关信息
#max=N：可缓存的缓存项上限数量；达到上限后会使⽤LRU(Least recently used，最近最少使⽤)算法实现管理
#inactive=time：缓存项的⾮活动时⻓，在此处指定的时⻓内未被命中的或命中的次数少于open_file_cache_min_uses指令所指定的次数的缓存项即为⾮活动项，将被删除

open_file_cache_errors on | off;
#是否缓存查找时发⽣错误的⽂件⼀类的信息，默认值为off

open_file_cache_min_uses number;
#open_file_cache指令的inactive参数指定的时⻓内，⾄少被命中此处指定的次数⽅可被归类为活动项，默认值为1

open_file_cache_valid time;
#缓存项有效性的检查验证频率，默认值为60s

open_file_cache max=10000 inactive=60s;  #最⼤缓存10000个⽂件，⾮活动数据超时时⻓60s
open_file_cache_valid 60s;  #每间隔60s检查⼀下缓存数据有效性
open_file_cache_min_uses 5; #60秒内⾄少被命中访问5次才被标记为活动数据
open_file_cache_errors on;  #缓存错误信息
```

#### 3.3.13.5 隐藏nginx server版本

```bash
server_tokens off; #隐藏Nginx server版本。配置在http块中
```

# 四、Nginx 高级配置

## 4.1 Nginx 状态页

基于nginx模块ngx_http_stub_status_module实现，在编译安装nginx的时候需要添加编译参数--with-http_stub_status_module，否则配置完成之后监测会是提示语法错误。

```bash
#配置示例：
 location /nginx_status {
        stub_status;
        allow 192.168.10.1;
        allow 127.0.0.1;
        deny all;
    }   
#状态⻚⽤于输出nginx的基本状态信息：
Active connections: 2 
server accepts handled requests
 2 2 1 
 #上面三个数字分别对应accepts,handled,requests三个值
Reading: 0 Writing: 1 Waiting: 1 

#Active connections： 当前处于活动状态的客户端连接数，包括连接等待空闲连接数。
#accepts：统计总值，Nginx⾃启动后已经接受的客户端请求的总数。
#handled：统计总值，Nginx⾃启动后已经处理完成的客户端请求的总数，通常等于accepts，除⾮有因worker_connections限制等被拒绝的连接。
#requests：统计总值，Nginx⾃启动后客户端发来的总的请求数。
#Reading：当前状态，正在读取客户端请求报⽂⾸部的连接的连接数。
#Writing：当前状态，正在向客户端发送响应报⽂过程中的连接数。
#Waiting：当前状态，正在等待客户端发出请求的空闲连接数，开启 keep-alive的情况下,这个值等于active – (reading+writing),
```

## 4.2 Nginx第三方模块

第三模块是对nginx 的功能扩展，第三⽅模块需要在编译安装Nginx 的时候使⽤参数--add-module=PATH指定路径添加，有的模块是由公司的开发⼈员针对业务需求定制开发的，有的模块是开源爱好者开发好之后上传到github进⾏开源的模块，nginx⽀持第三⽅模块需要从源码重新编译⽀持，⽐如开源的echo模块 https://github.com/openresty/echo-nginx-module：

```bash
[11:47:03 root@centos8 ~]#cat /apps/nginx/conf/conf.d/pc.conf
   location /main {
       index index.html;
       default_type text/html;
       echo "hello world,main-->";
       echo_reset_timer;
       echo_location /sub1;
       echo_location /sub2;
       echo "took $echo_timer_elapsed sec for total.";
    }
    location /sub1 {
        echo_sleep 1;
        echo sub1;
    }    
    location /sub2 {
        echo_sleep 1;
        echo sub2;
    }
[11:47:24 root@centos8 ~]#nginx -t
nginx: [emerg] unknown directive "echo" in /apps/nginx/conf/conf.d/pc.conf:12
nginx: configuration file /apps/nginx/conf/nginx.conf test failed
#解决以上报错问题
[11:47:27 root@centos8 ~]#yum install git -y
[14:29:06 root@centos8 ~]# git clone https://github.com/openresty/echo-nginx-module.git
[14:32:11 root@centos8 ~]#cd nginx-1.18.0/
[14:29:54 root@centos8 nginx-1.18.0]#./configure --prefix=/apps/nginx --user=nginx --group=nginx --with-http_ssl_module --with-http_v2_module --with-http_realip_module --with-http_stub_status_module --with-http_gzip_static_module --with-pcre --with-stream --with-stream_ssl_module --with-stream_realip_module --with-file-aio --with-threads --add-module=/root/echo-nginx-module
[14:32:11 root@centos8 ~]#make && make install 
#确认语法检测通过
[14:32:49 root@centos8 ~]#nginx -t
nginx: the configuration file /apps/nginx/conf/nginx.conf syntax is ok
nginx: configuration file /apps/nginx/conf/nginx.conf test is successful
#重启nginx访问测试：
[14:33:13 root@centos8 ~]#curl www.zhangzhuo.org/main
hello world,main-->
sub1
sub2
took 2.007 sec for total.
```

## 4.3 Nginx 变量使用

nginx的变量可以在配置⽂件中引⽤，作为功能判断或者⽇志等场景使⽤，变量可以分为内置变量和⾃定义变量，内置变量是由nginx模块⾃带，通过变量可以获取到众多的与客户端访问相关的值。

### 4.3.1 内置变量

```bash
$remote_addr; 
#存放了客户端的地址，注意是客户端的公⽹IP，也就是⼀家⼈访问⼀个⽹站，则会显示为路由器的公⽹IP。
```

```bash
$args;
#变量中存放了URL中的指令，例如http://www.magedu.net/main/index.do?id=20190221&partner=search中的id=20190221&partner=search
```

```bash
$document_root;
#保存了针对当前资源的请求的系统根⽬录，如/apps/nginx/html。
```

```bash
$document_uri;
 #保存了当前请求中不包含指令的URI，注意是不包含请求的指令，⽐如http://www.magedu.net/main/index.do?id=20190221&partner=search会被定义为/main/index.do 。
```

```bash
$host;
#存放了请求的host名称。
```

```bash
$http_user_agent;
#客户端浏览器的详细信息
```

```bash
$http_cookie;
#客户端的cookie信息。
```

```bash
limit_rate 10240;
echo $limit_rate; 
#如果nginx服务器使⽤limit_rate配置了显示⽹络速率，则会显示，如果没有设置,则显示0。
```

```bash
$remote_port; 
#客户端请求Nginx服务器时随机打开的端⼝，这是每个客户端⾃⼰的端⼝。
```

```bash
$remote_user; 
#已经经过Auth Basic Module验证的⽤户名。
```

```bash
$request_body_file;
#做反向代理时发给后端服务器的本地资源的名称。
```

```bash
$request_method; 
#请求资源的⽅式，GET/PUT/DELETE等
```

```bash
$request_filename;
#当前请求的资源⽂件的路径名称，由root或alias指令与URI请求⽣成的⽂件绝对路径，如/apps/nginx/html/main/index.html
```

```bash
$request_uri;
#包含请求参数的原始URI，不包含主机名，如：/main/index.do?id=20190221&partner=search。
```

```bash
$scheme; 
#请求的协议，如ftp，https，http等。
```

```bash
$server_protocol; 
#保存了客户端请求资源使⽤的协议的版本，如HTTP/1.0，HTTP/1.1，HTTP/2.0等。
```

```bash
$server_addr;
#保存了服务器的IP地址。
```

```bash
$server_name;
#请求的服务器的主机名。
```

```bash
$server_port; 
#请求的服务器的端⼝号。
```

### 4.3.2 自定义变量

假如需要⾃定义变量名称和值，使⽤指令set $variable value;，则⽅法如下：

Syntax: set $variable value;
Default: —
Context: server, location, if

```bash
location /main {
       index index.html;
       default_type text/html;    #echo输出的信息默认以text/html格式打开，如果不写开打这个页面会直接下载文件
       set $name zhangzhuo;
       echo $name;
       set $my_port $server_port;
       echo $my_port;
       echo "$server_name:$server_port";
    }
[14:58:53 root@centos8 ~]#curl www.zhangzhuo.org/main/
zhangzhuo
80
www.zhangzhuo.org:80
```

## 4.4 Nginx自定义访问日志

访问⽇志是记录客户端即⽤户的具体请求内容信息，全局配置模块中的error_log是记录nginx服务器运⾏时的⽇志保存路径和记录⽇志的level，因此有着本质的区别，⽽且Nginx的错误⽇志⼀般只有⼀个，但是访问⽇志可以在不同server中定义多个，定义⼀个⽇志需要使⽤access_log指定⽇志的保存路径，使⽤log_format指定⽇志的格式，格式中定义要保存的具体⽇志内容。

### 4.4.1 自定义默认格式日志

如果是要保留⽇志的源格式，只是添加相应的⽇志内容，则配置如下：

```bash
log_format  main  '$remote_addr - $remote_user [$time_local] "$request" ' 
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"'
                      '$server_name:$server_port';
    access_log  logs/access.log  main;
#重启nginx并访问测试⽇志格式
192.168.10.1 - - [25/Mar/2021:15:06:42 +0800] "GET /main HTTP/1.1" 200 57 "-" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.90 Safari/537.36 Edg/89.0.774.57" "-"www.zhangzhuo.org:80
```

### 4.4.2 自定义json格式日志

Nginx 的默认访问⽇志记录内容相对⽐较单⼀，默认的格式也不⽅便后期做⽇志统计分析，⽣产环境中通常将nginx⽇志转换为json⽇志，然后配合使⽤ELK做⽇志收集-统计-分析。

```bash
log_format access_json '{"@timestamp":"$time_iso8601",'    #访问时间
        '"host":"$server_addr",'         #访问的nginx主机地址
        '"clientip":"$remote_addr",'     #访问nginx客户端地址
        '"size":$body_bytes_sent,'       #传输到客户端的字节数，不算响应头
        '"responsetime":$request_time,'  #处理请求的时间
        '"upstreamtime":"$upstream_response_time",' 
        '"upstreamhost":"$upstream_addr",'
        '"http_host":"$host",'           #请求的主机名
        '"uri":"$uri",'                  #uri          
        '"domain":"$host",'              
        '"xff":"$http_x_forwarded_for",'    #如果用户是从CDN代理转发过来的会显示所有转发的地址
        '"referer":"$http_referer",'        #显示客户端从那个页面到来的
        '"tcp_xff":"$proxy_protocol_addr",' #获取代理访问服务器的客户端地址，如果是直接访问，该值为空字符串
        '"http_user_agent":"$http_user_agent",'  #客户端信息
        '"status":"$status"}';                   #状态码
    access_log logs/access.log access_json;      #使用日志格式
#重启Nginx并访问测试⽇志格式
```

### 4.4.3 json格式的日志访问统计

```bash
#!/usr/bin/env python
status_200= []
status_404= []
with open("access_json.log") as f:
 for line in f.readlines():
 line = eval(line)
 if line.get("status") == "200":
 status_200.append(line.get)
 elif line.get("status") == "404":
 status_404.append(line.get)
 else:
 print("状态码 ERROR")
f.close()
print "状态码200的有--:",len(status_200)
print "状态码404的有--:",len(status_404)
```

## 4.5 Nginx压缩功能

Nginx⽀持对指定类型的⽂件进⾏压缩然后再传输给客户端，⽽且压缩还可以设置压缩⽐例，压缩后的⽂件⼤⼩将⽐源⽂件显著变⼩，这样有助于降低出⼝带宽的利⽤率，降低企业的IT⽀出，不过会占⽤相应的CPU资源。

Nginx对⽂件的压缩功能是依赖于模块ngx_http_gzip_module，官⽅⽂档： https://nginx.org/en/docs/http/ngx_http_gzip_module.html， 配置指令如下：

```bash
#启⽤或禁⽤gzip压缩，默认关闭
gzip on | off;

#压缩⽐由低到⾼从1到9，默认为1
gzip_comp_level level;

#禁⽤IE6 gzip功能
gzip_disable "MSIE [1-6]\.";

#gzip压缩的最⼩⽂件，⼩于设置值的⽂件将不会压缩
gzip_min_length 1k;

#启⽤压缩功能时，协议的最⼩版本，默认HTTP/1.1
gzip_http_version 1.0 | 1.1;

#指定Nginx服务需要向服务器申请的缓存空间的个数*⼤⼩，默认32 4k|16 8k;
gzip_buffers number size; 

#指明仅对哪些类型的资源执⾏压缩操作；默认为gzip_types text/html，不⽤显示指定，否则出错
gzip_types mime-type ...;

#如果启⽤压缩，是否在响应报⽂⾸部插⼊“Vary: Accept-Encoding”
gzip_vary on | off;


#实例
[16:29:13 root@centos8 ~]#cat /apps/nginx/conf/nginx.conf
    gzip  on;              #开启文件压缩
    gzip_comp_level 5;     #压缩级别1-9
    gzip_min_length 1K;   #压缩的最小文件，低于这个值不会压缩
    gzip_types text/plain application/javascript application/x-javascript text/cssapplication/xml text/javascript application/x-httpd-php  image/jpeg image/gif image/png;                 #需要压缩的文件类型
    gzip_vary on;          #压缩后在响应报文首部插入Vary: Accept-Encoding
[16:34:16 root@centos8 ~]#ll -h /data/nginx/html/pc/logs.html 
-rw-r--r-- 1 root root 9.7M Mar 25 16:34 /data/nginx/html/pc/logs.html
[16:36:56 root@centos8 ~]#ll -h /data/nginx/html/pc/test.html 
-rw-r--r-- 1 root root 5 Mar 25 16:36 /data/nginx/html/pc/test.html
#重启nginx并进⾏访问测试压缩功能
[16:34:17 root@centos8 ~]#systemctl restart nginx.service
[16:37:09 root@centos8 ~]#curl --head --compressed http://www.zhangzhuo.org/test.html
HTTP/1.1 200 OK
Server: nginx
Date: Thu, 25 Mar 2021 08:37:55 GMT
Content-Type: text/html
Content-Length: 5
Last-Modified: Thu, 25 Mar 2021 08:36:48 GMT
Connection: close
ETag: "605c4ba0-5"
Accept-Ranges: bytes

[16:37:55 root@centos8 ~]#curl --head --compressed http://www.zhangzhuo.org/logs.html
HTTP/1.1 200 OK
Server: nginx
Date: Thu, 25 Mar 2021 08:38:19 GMT
Content-Type: text/html
Last-Modified: Thu, 25 Mar 2021 08:34:11 GMT
Connection: close
Vary: Accept-Encoding
ETag: W/"605c4b03-9ab7bc"
Content-Encoding: gzip #压缩传输
```

## 4.6 https 功能

Web⽹站的登录⻚⾯都是使⽤https加密传输的，加密数据以保障数据的安全，HTTPS能够加密信息，以免敏感信息被第三⽅获取，所以很多银⾏⽹站或电⼦邮箱等等安全级别较⾼的服务都会采⽤HTTPS协议，HTTPS其实是有两部分组成：HTTP + SSL / TLS，也就是在HTTP上⼜加了⼀层处理加密信息的模块。服务端和客户端的信息传输都会通过TLS进⾏加密，所以传输的数据都是加密后的数据。

![image-20210325164511659](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210325164511659.png)

```bash
https 实现过程如下：
1.客户端发起HTTPS请求：
客户端访问某个web端的https地址，⼀般都是443端⼝

2.服务端的配置：
采⽤https协议的服务器必须要有⼀套证书，可以通过⼀些组织申请，也可以⾃⼰制作，⽬前国内很多⽹站都⾃⼰做的，当你访问⼀个⽹站的时候提示证书不可信任就表示证书是⾃⼰做的，证书就是⼀个公钥和私钥匙，就像⼀把锁和钥匙，正常情况下只有你的钥匙可以打开你的锁，你可以把这个送给别⼈让他锁住⼀个箱⼦，⾥⾯放满了钱或秘密，别⼈不知道⾥⾯放了什么⽽且别⼈也打不开，只有你的钥匙是可以打开的。

3.传送证书：
服务端给客户端传递证书，其实就是公钥，⾥⾯包含了很多信息，例如证书得到颁发机构、过期时间等等。

4.客户端解析证书：
这部分⼯作是有客户端完成的，⾸先回验证公钥的有效性，⽐如颁发机构、过期时间等等，如果发现异常则会弹出⼀个警告框提示证书可能存在问题，如果证书没有问题就⽣成⼀个随机值，然后⽤证书对该随机值进⾏加密，就像2步骤所说把随机值锁起来，不让别⼈看到。

5.传送4步骤的加密数据：
就是将⽤证书加密后的随机值传递给服务器，⽬的就是为了让服务器得到这个随机值，以后客户端和服务端的通信就可以通过这个随机值进⾏加密解密了。

6.服务端解密信息：
服务端⽤私钥解密5步骤加密后的随机值之后，得到了客户端传过来的随机值(私钥)，然后把内容通过该值进⾏对称加密，对称加密就是将信息和私钥通过算法混合在⼀起，这样除⾮你知道私钥，不然是⽆法获取其内部的内容，⽽正好客户端和服务端都知道这个私钥，所以只要机密算法够复杂就可以保证数据的安全性。

7.传输加密后的信息:
服务端将⽤私钥加密后的数据传递给客户端，在客户端可以被还原出原数据内容。

8.客户端解密信息：
客户端⽤之前⽣成的私钥获解密服务端传递过来的数据，由于数据⼀直是加密的，因此即使第三⽅获取到数据也⽆法知道其详细内容。
```

### 4.6.1 ssl配置参数

nginx 的https 功能基于模块ngx_http_ssl_module实现，因此如果是编译安装的nginx要使⽤参数ngx_http_ssl_module开启ssl功能，但是作为nginx的核⼼功能，yum安装的nginx默认就是开启的，编译安装的nginx需要指定编译参数--with-http_ssl_module开启，官⽅⽂档： https://nginx.org/en/docs/http/ngx_http_ssl_module.html，配置参数如下：

```bash
ssl on | off; 
#为指定的虚拟主机配置是否启⽤ssl功能，此功能在1.15.0废弃，使⽤listen [ssl]替代。

ssl_certificate /path/to/file;
#当前虚拟主机使⽤使⽤的公钥⽂件，⼀般是crt⽂件

ssl_certificate_key /path/to/file;
#当前虚拟主机使⽤的私钥⽂件，⼀般是key⽂件

ssl_protocols [SSLv2] [SSLv3] [TLSv1] [TLSv1.1] [TLSv1.2]; 
#⽀持ssl协议版本，早期为ssl,现在是TSL，默认为后三个

ssl_session_cache off | none | [builtin[:size]] [shared:name:size];
#配置ssl缓存
 off： 关闭缓存
 none: 通知客户端⽀持ssl session cache，但实际不⽀持
 builtin[:size]：使⽤OpenSSL内建缓存，为每worker进程私有
 [shared:name:size]：在各worker之间使⽤⼀个共享的缓存，需要定义⼀个缓存名称和缓存空间⼤⼩，⼀兆可以存储4000个会话信息，多个虚拟主机可以使⽤相同的缓存名称。
 
ssl_session_timeout time;#客户端连接可以复⽤ssl session cache中缓存的有效时⻓，默认5m
```

### 4.6.2 自签名证书

```bash
[16:51:20 root@centos8 certs]#openssl req -newkey rsa:4096 -nodes -sha256 -keyout ca.key -x509 -days 3650 -out ca.crt  #⾃签名CA证书
Generating a RSA private key
............................................................++++
.....++++
writing new private key to 'ca.key'
-----
You are about to be asked to enter information that will be incorporated
into your certificate request.
What you are about to enter is what is called a Distinguished Name or a DN.
There are quite a few fields but you can leave some blank
For some fields there will be a default value,
If you enter '.', the field will be left blank.
-----
Country Name (2 letter code) [XX]:CN    #国家代码,https://country-code.cl/
State or Province Name (full name) []:NeiMeng  #省份
Locality Name (eg, city) [Default City]:NeiMeng  #城市名称
Organization Name (eg, company) [Default Company Ltd]:zhangzhuo.ltd #公司名称
Organizational Unit Name (eg, section) []:zhangzhuo  #部⻔
Common Name (eg, your name or your server's hostname) []:zhangzhuo.ca #通⽤名称
Email Address []:  #邮箱

#⾃制key和csr⽂件
[16:53:07 root@centos8 certs]#openssl req -newkey rsa:4096 -nodes -sha256 -keyout www.zhangzhuo.org.key -out www.zhangzhuo.org.csr
Generating a RSA private key
.............++++
.......................................................................++++
writing new private key to 'www.zhangzhuo.org.key'
-----
You are about to be asked to enter information that will be incorporated
into your certificate request.
What you are about to enter is what is called a Distinguished Name or a DN.
There are quite a few fields but you can leave some blank
For some fields there will be a default value,
If you enter '.', the field will be left blank.
-----
Country Name (2 letter code) [XX]:CN
State or Province Name (full name) []:NeiMeng
Locality Name (eg, city) [Default City]:NeiMeng
Organization Name (eg, company) [Default Company Ltd]:zhangzhuo.ltd
Organizational Unit Name (eg, section) []:zhangzhuo.org
Common Name (eg, your name or your server's hostname) []:www.zhangzhuo.org
Email Address []:

Please enter the following 'extra' attributes
to be sent with your certificate request
A challenge password []:
An optional company name []:
[16:55:38 root@centos8 certs]#ll
total 16
-rw-r--r-- 1 root root 2065 Mar 25 16:53 ca.crt
-rw------- 1 root root 3272 Mar 25 16:52 ca.key
-rw-r--r-- 1 root root 1728 Mar 25 16:55 www.zhangzhuo.org.csr
-rw------- 1 root root 3272 Mar 25 16:54 www.zhangzhuo.org.key
#签发证书
[16:55:43 root@centos8 certs]#openssl x509 -req -days 3650 -in www.zhangzhuo.org.csr  -CA ca.crt -CAkey ca.key -CAcreateserial -out www.zhangzhuo.org.crt
Signature ok
subject=C = CN, ST = NeiMeng, L = NeiMeng, O = zhangzhuo.ltd, OU = zhangzhuo.org, CN = www.zhangzhuo.org
Getting CA Private Key
#验证证书内容
[16:58:14 root@centos8 certs]#openssl x509 -in www.zhangzhuo.org.crt -noout -text
Certificate:
```

### 4.6.3 Nginx证书配置

```bash
listen 80;
    listen 443 ssl;
    ssl_certificate /apps/nginx/certs/www.zhangzhuo.org.crt;     #证书文件
    ssl_certificate_key /apps/nginx/certs/www.zhangzhuo.org.key; #证书私钥
    ssl_session_cache shared:sslcache:20m;     #配置ssl缓存
    ssl_session_timeout 10m;                   #客户端连接可以复⽤ssl session cache中缓存的有效时⻓
#重启Nginx并访问验证
```

## 4.7 关于favicon.ico

favicon.ico ⽂件是浏览器收藏⽹址时显示的图标，当客户端使⽤浏览器问⻚⾯时，浏览器会⾃⼰主动发起请求获取⻚⾯的favicon.ico⽂件，但是当浏览器请求的favicon.ico⽂件不存在时，服务器会记录404⽇志，⽽且浏览器也会显示404报错。

解决办法：

```bash
#⼀：服务器不记录访问⽇志：
 #location = /favicon.ico {
 #log_not_found off;
 #access_log off;
 #}
#⼆：将图标保存到指定⽬录访问：
#location ~ ^/favicon\.ico$ {
location = /favicon.ico {
        root /data/nginx/html/pc/images;
        expires 90d;   #设置⽂件过期时间
    }
```

## 4.8  安全选项

### 4.8.1 隐藏Nginx版本号

更改nginx源码信息并重新编译Nginx

```bash
[17:25:08 root@centos8 nginx-1.18.0]#vim src/http/ngx_http_header_filter_module.c
49 static u_char ngx_http_server_string[] = "Server: zhangzhuo" CRLF;  #定义响应报⽂中的server字段信息

#实例
[17:39:06 root@centos8 nginx-1.18.0]#curl www.zhangzhuo.org -I
HTTP/1.1 200 OK
Server: zhangzhuo
```

### 4.8.2 升级OpenSSL版本

**Centos7系统自带的openssl版本太低需要升级**

⼼脏出⾎（英语：Heartbleed），也简称为⼼⾎漏洞，是⼀个出现在加密程序库OpenSSL的安全漏洞，该程序库⼴泛⽤于实现互联⽹的传输层安全（TLS）协议。它于2012年被引⼊了软件中，2014年4⽉⾸次向公众披露。只要使⽤的是存在缺陷的OpenSSL实例，⽆论是服务器还是客户端，都可能因此⽽受到攻击。此问题的原因是在实现TLS的⼼跳扩展时没有对输⼊进⾏适当验证（缺少边界检查），因此漏洞的名称来源于“⼼跳”(heartbeat),该程序错误属于缓冲区过读，即可以读取的数据⽐应该允许读取的还多。

```bash
#准备OpenSSL源码包：
wget https://www.openssl.org/source/openssl-1.1.1d.tar.gz   #centos7只能安装1d
[17:28:44 root@centos7 ~]#pwd
/root
[17:28:42 root@centos7 ~]#ls
echo-nginx-module-master  nginx-1.18.0.tar.gz  openssl-1.1.1d.tar.gz
nginx-1.18.0              openssl-1.1.1d

#编译安装Nginx并制定新版本OpenSSL路径：
[17:34:07 root@centos7 nginx-1.18.0]#./configure --prefix=/apps/nginx --user=nginx --group=nginx --with-http_ssl_module --with-http_v2_module --with-http_realip_module --with-http_stub_status_module --with-http_gzip_static_module --with-pcre --with-stream --with-stream_ssl_module --with-stream_realip_module --with-file-aio --with-threads  --with-select_module --add-module=/root/echo-nginx-module-master  --with-openssl=/root/openssl-1.1.1d
[17:34:44 root@centos7 nginx-1.18.0]#make && make install

#验证
[17:38:25 root@centos8 nginx-1.18.0]#nginx -V
nginx version: nginx/1.18.0
built by gcc 8.3.1 20191121 (Red Hat 8.3.1-5) (GCC) 
built with OpenSSL 1.1.1d  10 Sep 2019
TLS SNI support enabled
configure arguments: --prefix=/apps/nginx --user=nginx --group=nginx --with-http_ssl_module --with-http_v2_module --with-http_realip_module --with-http_stub_status_module --with-http_gzip_static_module --with-pcre --with-stream --with-stream_ssl_module --with-stream_realip_module --with-file-aio --with-threads --with-select_module --add-module=/root/echo-nginx-module-master --with-openssl=/root/openssl-1.1.1d
```

# 五、Nginx Rewrite相关功能

Nginx服务器利⽤ngx_http_rewrite_module 模块解析和处理rewrite请求，此功能依靠 PCRE(PerlCompatible Regular Expressions)，因此编译之前要安装PCRE库，rewrite是nginx服务器的重要功能之⼀，⽤于实现URL的重写，URL的重写是⾮常有⽤的功能，⽐如它可以在我们改变⽹站结构之后，不需要客户端修改原来的书签，也⽆需其他⽹站修改我们的链接，就可以设置为访问，另外还可以在⼀定程度上提高网站的安全性。

http://www.pcre.org/ #PCRE官⽅站点

## 5.1 ngx_http_rewrite_module模块指令

https://nginx.org/en/docs/http/ngx_http_rewrite_module.html

### 5.1.1 if指令

⽤于条件匹配判断，并根据条件判断结果选择不同的Nginx配置，可以配置在server或location块中进行配置，Nginx的if语法仅能使⽤if做单次判断，不⽀持使⽤if else或者if elif这样的多重判断，⽤法如下：

```bash
if （条件匹配） {
　　action
}
```

使⽤正则表达式对变量进⾏匹配，匹配成功时if指令认为条件为true，否则认为false，变量与表达式之间使⽤以下符号链接：

```bash
=： #⽐较变量和字符串是否相等，相等时if指令认为该条件为true，反之为false。 
!=: #⽐较变量和字符串是否不相等，不相等时if指令认为条件为true，反之为false。 
~： #表示在匹配过程中区分⼤⼩写字符，（可以通过正则表达式匹配），满⾜匹配条件为真，不满⾜为假。
!~：#为区分⼤⼩写字符且匹配结果不匹配，不满⾜为真，满⾜为假。
~*: #表示在匹配过程中不区分⼤⼩写字符，（可以通过正则表达式匹配），满⾜匹配条件为真，不满⾜为假。
!~*: #为不区分⼤⼩字符且匹配结果不匹配，满⾜为假，不满⾜为真。
-f 和 ! -f: #判断请求的⽂件是否存在和是否不存在
-d 和 ! -d: #判断请求的⽬录是否存在和是否不存在。
-x 和 ! -x: #判断⽂件是否可执⾏和是否不可执⾏。
-e 和 ! -e: #判断请求的⽂件或⽬录是否存在和是否不存在(包括⽂件、⽬录、软链接)。

#实例-1

location /main {
       index index.html;
       default_type text/html;
       if ( $scheme = http ) {
         echo "if-------> $scheme";
       } 
       if ( $scheme = https ) {
         echo "if-------> $scheme"; 
       }
       if (-f $request_filename ) {
         echo "file is exist";
       }
       if (!-f $request_filename ) {
         echo "file is not exist";
       }
    }
```

**注： 如果\$ 变量的值为空字符串或是以0开头的任意字符串，则if指令认为该条件为false，其他条件为true，而且在nginx 1.0.1版本之前$变量的值为0还会是false。**

### 5.1.2 set指令

指定key并给其定义⼀个变量，变量可以调⽤Nginx内置变量赋值给key，另外set定义格式为set \$key\$value，及⽆论是key还是value都要加$符号。

```
location /main {
       root /data/nginx/html/pc;
       index index.html;
       default_type text/html;
       set $name zhangzhuo;
       echo $name;
       set $my_port $server_port;
       echo $my_port;
    }
```

### 5.1.3 break指令

⽤于中断当前相同作⽤域(location)中的其他Nginx配置，与该指令处于同⼀作⽤域的Nginx配置中，位于它前⾯的配置⽣效，位于后⾯的指令配置就不再⽣效了，Nginx服务器在根据配置处理请求的过程中遇到该指令的时候，回到上⼀层作⽤域继续向下读取配置，该指令可以在server块和location块以及if块中使⽤，使⽤语法如下：

```bash
location /main {
       root /data/nginx/html/pc;
       index index.html;
       default_type text/html;
       set $name zhangzhuo;
       echo $name;
       break;
       set $my_port $server_port;
       echo $my_port;
    }
```

### 5.1.4 return指令

从nginx版本0.8.42开始⽀持，return⽤于完成对请求的处理，并直接向客户端返回响应状态码，⽐如其可以指定重定向URL(对于特殊重定向状态码，301/302等) 或者是指定提示⽂本内容(对于特殊状态码403/500等)，处于此指令后的所有配置都将不被执⾏，return可以在server、if和location块进⾏配置，⽤法如下：

```bash
return code; #返回给客户端指定的HTTP状态码
return code (text); #返回给客户端的状态码及响应体内容，可以调⽤变量
return code URL； #返回给客户端的URL地址

location /main {
        root /data/nginx/html/pc;
        default_type text/html;
        index index.html;
        if ( $scheme = http ) {
          return 500 "service error";
          echo "if------> $scheme";
        }
        if ( $scheme = https ) {
          echo "if------> $scheme";
        }
    }
```

### 5.1.5 rewrite_log指令

设置是否开启记录ngx_http_rewrite_module模块⽇志记录到error_log⽇志⽂件当中，可以配置在http、server、location或if当中，需要⽇志级别为notice 。

```bash
location /main {
        root /data/nginx/html/pc;
        default_type text/html;
        index index.html;
        set $name zhangzhuo;
        echo $name;
        rewrite_log on;
        break;
        set $my_port $server_port;
        echo $my_port;
    }
#重启nginx，访问并验证error_log：
2021/03/25 20:13:09 [warn] 36745#36745: *15 using uninitialized "my_port" variable, client: 192.168.10.1, server: www.zhangzhuo.org, request: "GET /main HTTP/1.1", host: "www.zhangzhuo.org", referrer: "http://www.zhangzhuo.org/"
```

## 5.2 rewrite指令

通过正则表达式的匹配来改变URI，可以同时存在⼀个或多个指令，按照顺序依次对URI进⾏匹配，rewrite主要是针对⽤户请求的URL或者是URI做具体处理，以下是URL和URI的具体介绍：

```bash
#URI(universal resource identifier)：通⽤资源标识符，标识⼀个资源的路径，可以不带协议。
#URL(uniform resource location):统⼀资源定位符，是⽤于在Internet中描述资源的字符串，是URI的⼦集，主要包括传输协议(scheme)、主机(IP、端⼝号或者域名)和资源具体地址(⽬录和⽂件名)等
#三部分，⼀般格式为 scheme://主机名[:端⼝号][/资源路径],如：
#http://www.a.com:8080/path/file/index.html就是⼀个URL路径，URL必须带访问协议。
#每个URL都是⼀个URI，但是URI不都是URL。

例如：
http://example.org:8080/path/to/resource.txt #URI/URL
ftp://example.org/resource.txt #URI/URL
/absolute/path/to/resource.txt #URI
```

rewrite的官⽅介绍地址：https://nginx.org/en/docs/http/ngx_http_rewrite_module.html#rewrite，rewrite可以配置在server、location、if，其具体使⽤⽅式为：

```bash
#rewrite regex replacement [flag];
#rewrite 正则匹配客户端请求 修改后的请求 标记位；
```

rewrite将⽤户请求的URI基于regex所描述的模式进⾏检查，匹配到时将其替换为表达式指定的新的URI。

注意：如果在同⼀级配置块中存在多个rewrite规则，那么会⾃下⽽下逐个检查；被某条件规则替换完成后，会重新⼀轮的替换检查，隐含有循环机制,但不超过10次；如果超过，提示500响应码，[flag]所表示的标志位⽤于控制此循环机制，如果替换后的URL是以http://或https://开头，则替换结果会直接以重定向返回给客户端, 即永久重定向301

### 5.2.1 rewrite flag使用介绍

利⽤nginx的rewrite的指令，可以实现url的重新跳转，rewrtie有四种不同的flag，分别是**redirect**(临时重定向，状态码302)、**permanent**(永久重定向，状态码301)、**break**和**last**。其中前两种是跳转型的flag，后两种是代理型，跳转型是指有客户端浏览器重新对新地址进⾏请求，代理型是在WEB服务器内部实现跳转的。

Syntax: rewrite regex replacement [flag]; #通过正则表达式处理⽤户请求并返回替换后的数据包。

Default: —
Context: server, location, if

```bash
redirect； 
#临时重定向，重写完成后以临时重定向⽅式直接返回重写后⽣成的新URL给客户端，由客户端重新发起请求；使⽤相对路径,或者http://或https://开头，状态码：302

permanent； 
#重写完成后以永久重定向⽅式直接返回重写后⽣成的新URL给客户端，由客户端重新发起请求，状态码：301

last； 
#重写完成后停⽌对当前URI在当前location中后续的其它重写操作，⽽后对新的URL启动新⼀轮重写检查，不建议在多location配置环境中使⽤


break； 
#重写完成后停⽌对当前URL在当前location中后续的其它重写操作，⽽后直接将匹配结果返还给客户端即结束循环并返回数据给客户端，建议在多location配置环境中使⽤
```

### 5.2.2 rewrite案例-域名永久与临时重定向

要求：因业务需要，将访问源域名 www.zhangzhuo.org 的请求永久重定向到www.zhangzhuo.com。临时重定向不会缓存域名解析记录(A记录)，但是永久重定向会缓存。

```bash
location / { 
        root /data/nginx/html/pc;
        index index.html;
        rewrite / http://www.zhangzhuo.com permanent;
        #rewrite / http://www.zhangzhuo.com redirect;
        #rewrite / http://www.zhangzhuo.com last;       
        #rewrite / http://www.zhangzhuo.com break;
	}
#重启Nginx并访问域名www.zhangzhuo.org进⾏测试
```

#### 5.2.2.1 永久重定向

域名永久重定向(permanent redirect)状态码为301，例如京东早期的域名 www.360buy.com 由于与360公司类似，容易引起误解，于是京东光后期将域名www.360buy.com 永久重定向到了www.jd.com，永久重定向浏览器会缓存DNS解析记录。

#### 5.2.2.2 临时重定向

域名临时重定向(temporarily moved)状态码为302，告诉浏览器域名不是固定重定向到当前⽬标域名，后期可能随时会更改，因此浏览器不会缓存当前域名的解析记录，⽽浏览器会缓存永久重定向的DNS解析记录，这也是临时重定向与永久重定向最⼤的本质区别。

### 5.2.3 rewrite案例--brak与last

测试：访问break的请求被rewrite⾄test1，⽽访问test1传递请求再次被rewrite发⾄test2，以此测试last和break分别有什么区别：

#### 5.2.3.1 break案例

```bash
#Nginx配置：
#break测试案例：当客户端访问break的时候，测试通过rewrite将URL重写为test1，然后再通过rewrite将test1重写为test2测试两条write规则最终哪⼀条⽣效，并且测试重写后的URL会不会到其他location重新匹配。
    location /break {
        root /data/nginx/html/pc;
        index index.html;
        rewrite ^/break/(.*) /test1/$1 break;
        rewrite ^/test1/(.*) /test2/$1 break;
    }
    location = /test1 {
        return 666 "now test1";   #break匹配成功后不再向下匹配，也不会跳转到其他的location，即直接结束匹配并给客户端返回结果数据。
    }
    location = /test2 {
        return 999 "now test2";   #break不会匹配后⾯的rewrite规则也不匹配其他location
    }
#创建资源路径：    
[20:37:31 root@centos8 ~]#mkdir /data/nginx/html/pc/break
[20:38:28 root@centos8 ~]#mkdir /data/nginx/html/pc/test{1,2}
[20:38:37 root@centos8 ~]#echo break >/data/nginx/html/pc/break/index.html
[20:39:14 root@centos8 ~]#echo test1 >/data/nginx/html/pc/test1/index.html
[20:39:28 root@centos8 ~]#echo test2 >/data/nginx/html/pc/test2/index.html

#测试
[20:40:02 root@centos8 ~]#curl -L http://www.zhangzhuo.org/break/index.html
test1
 #最终的结果不会继续匹配当前location中后续的write规则，也不会跳出当前的location继续匹配其他location，⽽是直接返回数据给客户端

#break适⽤于不改变客户端访问⽅式，但是要将访问的⽬的URL做单次重写的场景，⽐如有个⽹站前端⻚⾯访问路径发⽣变化，旧版本的⽹站数据已经保存到了statics不能丢失，但是要将访问新版本的资源重写到新的静态资源路径到新的⽬录static

location /statics { #旧版本程序中的请求路径需要重写请求路径后再响应给客户端，不需要在跳转⾄其他location
 root /data/nginx;
 index index.html;
 rewrite ^/statics/(.*) /static/$1 break;
 }
 
 location /static/pool {  #新版本程序的请求路径直接响应请求
 root /data/nginx;
 index index.html;
 }
```

#### 5.2.3.2 last案例

```bash
#last：对某个location的URL匹配成功后会停⽌当前location的后续rewrite规则，并结束当前location，然后将匹配⽣成的新URL跳转⾄其他location继续匹配，直到没有location可匹配后将最后⼀次location的数据返回给客户端。
 location /break {
        root /data/nginx/html/pc;
        index index.html;
        rewrite ^/break/(.*) /test1/$1 last;   
        rewrite ^/test1/(.*) /test2/$1 last;  #如果第⼀条rewrite规则匹配成功则不执⾏本条，否则执⾏本条rewrite规则。
    }
    location /test1 {
        rewrite ^/test1/(.*) /test3/$1 permanent;
    }
    location = /test2/index.html {
        return 999 "now test2";
    }
    location = /test3/index.html {
        return 333 "now test3";
    }
    
#last访问测试：
[21:13:01 root@centos8 ~]#curl -L http://www.zhangzhuo.org/break/index.html
now test3
 #会匹配多个location，直到最终全部匹配完成，返回最后⼀个location的匹配结果给客户端。
 #last适⽤于要不改变客户端访问⽅式但是需做多次⽬的URL重写的场景，场景不是很多。
```

### 5.2.4 rewrite案例**-**⾃动跳转https

要求：基于通信安全考虑公司⽹站要求全站https，因此要求将在不影响⽤户请求的情况下将http请求全部⾃动跳转⾄https，另外也可以实现部分location跳转。

```bash
server {
    listen 80; 
    listen 443 ssl;
    ssl_certificate /apps/nginx/certs/www.zhangzhuo.org.crt;
    ssl_certificate_key /apps/nginx/certs/www.zhangzhuo.org.key;
    ssl_session_cache shared:sslcache:20m;
    ssl_session_timeout 10m;
    server_name www.zhangzhuo.org;
    location / { 
        root /data/nginx/html/pc;
        index index.html;
        if ( $scheme = http ) { 
         rewrite ^/(.*) https://www.zhangzhuo.org/$1 permanent;
        }                                                                     
    }   
}
#重启Nginx并访问测试
[19:35:31 root@centos8 ~]#curl -L -k -i https://www.zhangzhuo.org
pc web
<a href="/main">nide</a>
[19:35:39 root@centos8 ~]#curl -L -k -i http://www.zhangzhuo.org
pc web
<a href="/main">nide</a>
```

### 5.2.5 rewrite案例-判断⽂件是否存在

要求：当⽤户访问到公司网站的时输⼊了⼀个错误的URL，可以将⽤户重定向⾄官网⾸⻚。

```bash
location / {
        root /data/nginx/html/pc;
        index index.html;
        if (!-f $request_filename ) {    #判断文件是否存在
         rewrite (.*) https://www.zhangzhuo.org/index.html;
        }
    }
#重启Nginx并访问测试
[19:41:57 root@centos8 ~]#curl -L -k -i http://www.zhangzhuo.org/asdasdasd/asdasdasdasd/asdasdasda/as.jpg
pc web
<a href="/main">nide</a>
```

## 5.3 Nginx防盗链

防盗链基于客户端携带的referer(https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Headers/Referer)实现，referer是记录打开⼀个⻚⾯之前记录是从哪个⻚⾯跳转过来的标记信息，如果别⼈只链接了自己网站图篇或某个单独的资源，⽽不是打开了⽹站的整个⻚⾯，这就是盗链，referer就是之前的那个⽹站域名，正常的referer信息有以下⼏种：

```bash
#none：请求报⽂⾸部没有referer⾸部，⽐如⽤户直接在浏览器输⼊域名访问web⽹站，就没有referer信息。
#blocked：请求报⽂有referer⾸部，但⽆有效值，⽐如为空。
#server_names：referer⾸部中包含本主机名及即nginx 监听的server_name。
#arbitrary_string：⾃定义指定字符串，但可使⽤*作通配符。
#regular expression：被指定的正则表达式模式匹配到的字符串,要使⽤~开头，例如：~.*\.magedu\.com。
```

正常通过搜索引擎搜索web ⽹站并访问该⽹站的referer信息如下：

```bash
#通过搜索引擎访问web⽹站的referer信息：
{"@timestamp":"2021-03-26T19:46:17+08:00","host":"192.168.10.81","clientip":"192.168.10.1","size":138,"responsetime":0.000,"upstreamtime":"-","upstreamhost":"-","http_host":"www.zhangzhuo.org","uri":"/","domain":"www.zhangzhuo.org","xff":"-","referer":"https://www.baidu.com/s?ie=utf-8&f=8&rsv_bp=1&rsv_idx=1&tn=80035161_1_dg&wd=www.zhangzhuo.org&fenlei=256&oq=www.zhangzhuo.org&rsv_pq=e7092087000aaa82&rsv_t=1f08UEv1tWgwVC77r%2Bu9mo%2FIHQBe0b37sl8Hb2igDxSKF5MEfLkytxYxSRIWn9XGrM4%2FxQ&rqlang=cn&rsv_enter=0&rsv_dl=tb&rsv_btype=t","tcp_xff":"-","http_user_agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.90 Safari/537.36 Edg/89.0.774.57","status":"302"}
```

### 5.3.1 实现web盗链

在⼀个web 站点盗链另⼀个站点的资源信息，⽐如图⽚、视频等。

```bash
location / { 
        root /data/nginx/html/pc;
        index index.html;
        if (!-f $request_filename ) { 
         rewrite (.*) http://www.zhangzhuo.org/index.html;
        }   
    } 
[19:52:49 root@centos8 pc]#pwd
/data/nginx/html/pc
[19:52:50 root@centos8 pc]#ls
about  download  images.jpg  logs.html  test1  test3
break  images    index.html  main       test2  test.html 
#准备盗链web⻚⾯：
server {
    listen 80; 
    server_name www.zhangzhuo.com;
    location / { 
        root /data/nginx/html/com;
    }   

}
[19:55:19 root@centos8 pc]#cat /data/nginx/html/com/index.html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>盗链⻚⾯</title>
</head>
<body>
<a href="http://www.zhangzhuo.org">测试盗链</a>
<img src="http://www.zhangzhuo.org/images.jpg">
</body>
</html>
#重启Nginx并访问http://www.mageedu.net/测试
#验证两个域名的⽇志，是否会在被盗连的web站点的⽇志中出现以下盗链⽇志信息：
[19:55:25 root@centos8 pc]#systemctl reload nginx.service
#org服务器盗链日志
{"@timestamp":"2021-03-26T19:57:03+08:00","host":"192.168.10.81","clientip":"192.168.10.1","size":0,"responsetime":0.000,"upstreamtime":"-","upstreamhost":"-","http_host":"www.zhangzhuo.org","uri":"/images.jpg","domain":"www.zhangzhuo.org","xff":"-","referer":"http://www.zhangzhuo.com/","tcp_xff":"-","http_user_agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.90 Safari/537.36 Edg/89.0.774.57","status":"304"}
```

### 5.3.2 实现防盗链

基于访问安全考虑，nginx⽀持通过ungx_http_referer_module模块 https://nginx.org/en/docs/http/ngx_http_referer_module.html#valid_referers 检查访问请求的referer信息是否有效实现防盗链功能，定义⽅式如下：

```bash
location /images {
 	root /data/nginx/html/pc;
 	index index.html;
 	valid_referers none blocked server_names
 		*.example.com example.* www.example.org/galleries/
 		~\.google\.;
 
	 if ($invalid_referer) {
 		return 403;
 	 }
```

定义防盗链：

```bash
location / {
        root /data/nginx/html/pc;
        index index.html;
        valid_referers none blocked server_names *.zhangzhuo.org ~\.google\. ~\.baidu\.;    #定义有效的referer
        if ($invalid_referer) {   #假如是使⽤其他的⽆效的referer访问：
            return 403;  #返回状态码403
        }
        if (!-f $request_filename ) {
         rewrite (.*) http://www.zhangzhuo.org/index.html;
        }
    }
#重启Nginx并访问测试
```

使⽤浏览器访问盗链⽹站 www.zhangzhuo.com， 验证是否提前状态码403：

# 六、Nginx 反向代理功能

反向代理：反向代理也叫reverse proxy，指的是代理外网⽤户的请求到内部的指定web服务器，并将数据返回给⽤户的⼀种方式，这是⽤的比较多的⼀种方式。

Nginx除了可以在企业提供⾼性能的web服务之外，另外还可以将本身不具备的请求通过某种预定义的协议转发⾄其它服务器处理，不同的协议就是Nginx服务器与其他服务器进⾏通信的⼀种规范，主要在不同的场景使⽤以下模块实现不同的功能：

```bash
ngx_http_proxy_module：  将客户端的请求以http协议转发⾄指定服务器进⾏处理。
ngx_stream_proxy_module：将客户端的请求以tcp协议转发⾄指定服务器处理。
ngx_http_fastcgi_module：将客户端对php的请求以fastcgi协议转发⾄指定服务器处理。
ngx_http_uwsgi_module：  将客户端对Python的请求以uwsgi协议转发⾄指定服务器处理。
```

逻辑调⽤关系：

![image-20210326204042762](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210326204042762.png)

⽣产环境部署结构：

![image-20210326204056644](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210326204056644.png)

## 6.1：实现http反向代理：

要求：将⽤户对域www.zhangzhuo.org 的请求转发值后端服务器处理，官⽅⽂档： https://nginx.org/en/docs/http/ngx_http_proxy_module.html，

**环境准备：**

```bash
192.168.10.81  #Nginx 代理服务器
192.168.10.82  #后端web A，Apache部署
192.168.10.83  #后端web B，Apache部署
```

**访问逻辑图：**

![image-20210326204215061](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210326204215061.png)

### 6.1.1 部署后端Apache服务器：

```bash
[10:13:38 root@apache1 ~]#yum install -y httpd
[10:13:38 root@apache1 ~]#echo "web1 192.168.10.82" > /var/www/html/index.html
[10:14:38 root@apache1 ~]#systemctl enable --now httpd

[10:15:19 root@apache2 ~]#yum install -y httpd
[10:15:26 root@apache2 ~]#echo "web2 192.168.10.83" >/var/www/html/index.html
[10:15:52 root@apache2 ~]#systemctl enable --now httpd

#访问测试
[10:15:05 root@apache1 ~]#curl http://192.168.10.82
web1 192.168.10.82
[10:16:11 root@apache2 ~]#curl http://192.168.10.83
web2 192.168.10.83
```

### 6.1.2 Nginx http 反向代理入门：

官⽅⽂档：https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass

#### 6.2.1.1 反向代理配置参数

##### 6.2.1.1.1 proxy_pass

```bash
proxy_pass;
#⽤来设置将客户端请求转发给的后端服务器的主机，可以是主机名、IP地址：端⼝的⽅式，也可以代理到预先设置的主机群组，需要模块ngx_http_upstream_module⽀持。
location /web {
      index index.html;
      proxy_pass http://192.168.10.82:80;
    }
#不带斜线将访问的/web,等于访问后端服务器http://192.168.10.82:80/web/index.html，即后端服务器配置的站点根⽬录要有web⽬录才可以被访问，这是⼀个追加/web到后端服务器 http://servername:port/WEB/INDEX.HTML的操作

#测试不带斜线
[10:23:58 root@apache1 ~]#echo "/var/www/html/web 192.168.10.82" >/var/www/html/web/index.html
[10:27:23 root@nginx ~]#curl http://www.zhangzhuo.org/web/
/var/www/html/web 192.168.10.82

location /web {
      index index.html;
      proxy_pass http://192.168.10.82:80/;
    }
#带斜线，等于访问后端服务器的http://192.168.7.103:80/index.html 内容返回给客户端
#测试
[10:28:57 root@nginx ~]#curl http://www.zhangzhuo.org/web/
web1 192.168.10.82
```

##### 6.2.1.1.2 HTTP字段配置

```bash
#隐藏字段
proxy_hide_header field;
#⽤于nginx作为反向代理的时候，在返回给客户端http响应的时候，隐藏后端服务版本相应头部的信息，可以设置在http/server或location块，

    location /web {
      proxy_pass http://192.168.10.82:80;
      proxy_hide_header ETag;
    }
#隐藏ETag字段
```

```bash
#显示字段
proxy_pass_header field;
#默认nginx在响应报⽂中不传递后端服务器的⾸部字段Date, Server, X-Pad, X-Accel等参数，如果要传递的话则要使⽤ proxy_pass_header field声明将后端服务器返回的值传递给客户端。
    location /web {
      proxy_pass http://192.168.10.82:80;
      proxy_hide_header ETag;
      proxy_pass_header Server;
    }
#显示后端服务Server字段，默认是隐藏后端服务的替换为nginx的
```

```bash
proxy_pass_request_body on | off;
#是否向后端服务器发送HTTP包体部分,可以设置在http/server或location块，默认即为开启，如果版本较低需要手动开启
```

```bash
proxy_pass_request_headers on | off;
#是否将客户端的请求头部转发给后端服务器，可以设置在http/server或location块，默认即为开启
```

```bash
proxy_set_header; 
#可以更改或添加客户端的请求头部信息内容并转发⾄后端服务器，⽐如在后端服务器想要获取客户端的真实IP的时候，就要更改每⼀个报⽂的头部，如下：

proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;  #基本与remote_addr一样
proxy_set_header X-Forwarded-For $remote_addr;

#添加HOST到报⽂头部，如果客户端为NAT上⽹那么其值为客户端的共⽤的公⽹IP地址，常⽤于在⽇之中记录客户端的真实IP地址。
```

##### 6.2.1.1.3 nginx服务器与后端服务器连接时间配置

```bash
#连接超时时间
proxy_connect_timeout time;
配置nginx服务器与后端服务器尝试建⽴连接的超时时间，默认为60秒，⽤法如下
proxy_connect_timeout 60s;
#请求超时时间
proxy_read_timeout time;
配置nginx服务器向后端服务器或服务器组发起read请求后，等待的超时时间，默认60s
proxy_send_timeout time;
配置nginx项后端服务器或服务器组发起write请求后，等待的超时时间，默认60s
```

##### 6.2.1.1.4 其他配置

```bash
proxy_http_version 1.0;
#⽤于设置nginx提供代理服务的HTTP协议的版本，默认http 1.0

proxy_ignore_client_abort off； 
#当客户端⽹络中断请求时，nginx服务器中断其对后端服务器的请求。即如果此项设置为on开启，则服务器会忽略客户端中断并⼀直等着代理服务执⾏返回，如果设置为off，则客户端中断后Nginx也会中断客户端请求并⽴即记录499⽇志，默认为off。

proxy_headers_hash_bucket_size 128； 
#当配置了 proxy_hide_header和proxy_set_header的时候，⽤于设置nginx保存HTTP报⽂头的hash表的上限。

proxy_headers_hash_max_size 512； 
#设置proxy_headers_hash_bucket_size的最⼤可⽤空间

server_names_hash_bucket_size 512;
#server_name hash表申请空间⼤⼩

server_names_hash_max_szie 512; 
#设置服务器名称hash表的上限⼤⼩
```

#### 6.1.2.2 反向代理示例**--**单台web服务器

```bash
server {            
    listen 80; 
    server_name www.zhangzhuo.cn;
    location / { 
      proxy_pass http://192.168.10.82:80/; #后端服务器 
    }   
    location = /favicon.ico {    #一个图标
        root /data/nginx/html/cn/images;
        expires 90d;
    }   
}
#重启Nginx 并访问测试
```

#### 6.1.2.3 反向代理示例--指定location

```bash
server {
    listen 80;
    server_name www.zhangzhuo.cn;
    location / {
       root /data/nginx/html/cn;
       index index.html;
    }
    location /web {
       proxy_pass http://192.168.10.82:80/;  #注意有后⾯的/,有/表示访问代理服务器web目录是访问的后端的根目录，如果没有根访问web表示访问的后端/web目录
    }
}
#访问带/的
[15:06:45 root@nginx ~]#curl http://www.zhangzhuo.cn/web/
web1 192.168.10.82
#访问不带/的
[15:07:32 root@nginx ~]#curl http://www.zhangzhuo.cn/web/
/var/www/html/web 192.168.10.82

#http日志
192.168.10.81 - - [27/Mar/2021:15:06:47 +0800] "GET // HTTP/1.0" 200 19 "-" "curl/7.61.1"
192.168.10.81 - - [27/Mar/2021:15:07:56 +0800] "GET /web/ HTTP/1.0" 200 32 "-" "curl/7.61.1"
```

#### 6.1.2.4 反向代理示例--缓存功能（可以提高性能）

**缓存功能默认关闭状态，一般设置静态页面为缓存**

```bash
proxy_cache zone | off;  #默认off
#指明调⽤的缓存，或关闭缓存机制；Context:http, server, location

proxy_cache_key string;
#缓存中⽤于“键”的内容，默认值：proxy_cache_key $scheme$proxy_host$request_uri;

proxy_cache_valid [code ...] time;
#定义对特定响应码的响应内容的缓存时⻓，定义在http{...}中
 示例:
 proxy_cache_valid 200 302 10m;
 proxy_cache_valid 404 1m;
```

**定义缓存**

```bash
proxy_cache_path;
 定义可⽤于proxy功能的缓存；Context:http 
 proxy_cache_path path [levels=levels] [use_temp_path=on|off]
keys_zone=name:size [inactive=time] [max_size=size] [manager_files=number]
[manager_sleep=time] [manager_threshold=time] [loader_files=number]
[loader_sleep=time] [loader_threshold=time] [purger=on|off]
[purger_files=number] [purger_sleep=time] [purger_threshold=time];

示例：在http配置定义缓存信息
  proxy_cache_path /var/cache/nginx/proxy_cache #定义缓存保存路径，proxy_cache会⾃动创建
  levels=1:2:2 #定义缓存⽬录结构层次，1:2:2可以⽣成2^4x2^8x2^8=1048576个⽬录
  keys_zone=proxycache:20m #指内存中缓存的⼤⼩，主要⽤于存放key和metadata（如：使⽤次数） 
  inactive=120s； #缓存有效时间 
  max_size=1g; #最⼤磁盘占⽤空间，磁盘存⼊⽂件内容的缓存空间最⼤值
```

**调用缓存功能**

```bash
#调⽤缓存功能，需要定义在相应的配置段，如server{...}；或者location等
 proxy_cache proxycache;
 proxy_cache_key $request_uri;
 proxy_cache_valid 200 302 301 10m; #指定的状态码返回的数据缓存多⻓时间
 proxy_cache_valid any 1m;
```

```bash
proxy_cache_use_stale error http_502 http_503;
#在被代理的后端服务器出现哪种情况下，可直接使⽤过期的缓存响应客户端，
proxy_cache_use_stale error | timeout | invalid_header | updating | http_500 |
http_502 | http_503 | http_504 | http_403 | http_404 | off ; #默认是off
```

```bash
proxy_cache_methods GET | HEAD | POST ...;
#对哪些客户端请求⽅法对应的响应进⾏缓存，GET和HEAD⽅法总是被缓存
```

##### 6.1.2.4.1 非缓存场景压测

```bash
[15:37:39 root@apache1 ~]#pwd
/root
[15:37:42 root@apache1 ~]#ll -h /var/log/messages 
-rw-------. 1 root root 908K Mar 27 15:25 /var/log/messages       
[15:37:49 root@apache1 ~]#cp /var/log/messages /var/www/html/web/log.html #准备测试⻚⾯
[15:37:49 root@apache1 ~]#chmod a+r /var/www/html/web/log.html
[15:35:36 root@nginx ~]#ab -n 2000 -c200 http://www.zhangzhuo.cn/web/log.html
Total transferred:      1859460000 bytes
HTML transferred:       1858904000 bytes
Requests per second:    65.26 [#/sec] (mean)
Time per request:       3064.619 [ms] (mean)
Time per request:       15.323 [ms] (mean, across all concurrent requests)
Transfer rate:          59253.01 [Kbytes/sec] received
```

##### 6.1.2.4.2 准备缓存配置

```bash
[15:59:19 root@nginx ~]#vim /apps/nginx/conf/nginx.conf
 #配置在nginx.confhttp配置段
    proxy_cache_path /data/nginx/proxycache levels=1:1:1               
    keys_zone=proxycache:20m inactive=120s max_size=1g; 
[16:01:20 root@nginx ~]#vim /apps/nginx/conf/conf.d/cn.conf
    location /web {         #要缓存的URL 或者放在server配置项对所有URL都进⾏缓存                                                         
       proxy_pass http://192.168.10.82:80;
       proxy_set_header clientip $remote_addr;
       proxy_cache proxycache;
       proxy_cache_key $request_uri;
       proxy_cache_valid 200 302 301 1h; 
       proxy_cache_valid any 1m; 
    }
[16:04:26 root@nginx ~]#nginx -t
[16:05:19 root@nginx ~]#systemctl restart nginx.service
[16:06:05 root@nginx ~]#ll /data/nginx/proxycache/ -d
drwx------ 2 nginx nginx 6 Mar 27 16:01 /data/nginx/proxycache/
```

##### 6.2.1.4.3 访问并验证缓存文件

```bash
#访问web并验证缓存⽬录
[16:07:07 root@nginx ~]#curl http://www.zhangzhuo.cn/web/log.html
[16:07:50 root@nginx ~]#ab -n 2000 -c200 http://www.zhangzhuo.cn/web/log.html
Total transferred:      1859460000 bytes
HTML transferred:       1858904000 bytes
Requests per second:    2216.50 [#/sec] (mean)
Time per request:       90.232 [ms] (mean)
Time per request:       0.451 [ms] (mean, across all concurrent requests)
Transfer rate:          2012448.88 [Kbytes/sec] received
#验证缓存⽬录结构及⽂件⼤⼩
[16:08:47 root@nginx ~]#tree /data/nginx/proxycache/
/data/nginx/proxycache/
└── f
    └── 0
        └── 6
            └── 50b643197ae7d66aaaa5e7e1961b060f

3 directories, 1 file
[16:08:52 root@nginx ~]#ll /data/nginx/proxycache/f/0/6/50b643197ae7d66aaaa5e7e1961b060f 
-rw------- 1 nginx nginx 930076 Mar 27 16:07 /data/nginx/proxycache/f/0/6/50b643197ae7d66aaaa5e7e1961b060f
#验证⽂件内容：   
[16:09:08 root@nginx ~]#head -n100 /data/nginx/proxycache/f/0/6/50b643197ae7d66aaaa5e7e1961b060f
#会在⽂件⾸部添加相应码
KEY: /web/log.html
HTTP/1.1 200 OK
Date: Sat, 27 Mar 2021 08:07:07 GMT
Server: Apache/2.4.37 (centos)
Last-Modified: Sat, 27 Mar 2021 07:38:12 GMT
ETag: "e2eac-5be7fbb1384a7"
Accept-Ranges: bytes
Content-Length: 929452
Connection: close
Content-Type: text/html; charset=UTF-8
```

#### 6.1.2.5 添加头部报文信息

nginx基于模块ngx_http_headers_module可以实现对头部报⽂添加指定的key与值， https://nginx.org/en/docs/http/ngx_http_headers_module.html

```bash
Syntax: add_header name value [always];
Default: —
Context: http, server, location, if in location
#添加⾃定义⾸部，如下：
add_header name value [always]; 
  add_header X-Via $server_addr;
  add_header X-Cache $upstream_cache_status;
  add_header X-Accel $server_name; #添加⾃定义响应信息的尾部， 1.13.2版后⽀持
add_trailer name value [always];
```

##### 6.1.2.5.1 Nginx配置

```bash
location /web {
       proxy_pass http://192.168.10.82:80;
       proxy_set_header clientip $remote_addr;
       proxy_cache proxycache;
       proxy_cache_key $request_uri;
       proxy_cache_valid 200 302 301 1h;
       proxy_cache_valid any 1m;
       add_header X-Via $server_addr;
       add_header X-Cache $upstream_cache_status;
       add_header X-Accel $server_name;
    }
#演示
#没有命中缓存的
[16:50:31 root@nginx ~]#curl http://www.zhangzhuo.cn/web/log.html -I
HTTP/1.1 200 OK
Server: zhangzhuo
Date: Sat, 27 Mar 2021 08:51:00 GMT
Content-Type: text/html; charset=UTF-8
Content-Length: 929452
Connection: keep-alive
Keep-Alive: timeout=65
Vary: Accept-Encoding
Last-Modified: Sat, 27 Mar 2021 07:38:12 GMT
ETag: "e2eac-5be7fbb1384a7"
X-Via: 192.168.10.81
X-Cache: MISS
X-Accel: www.zhangzhuo.cn
Accept-Ranges: bytes
#命中缓存的
[16:51:00 root@nginx ~]#curl http://www.zhangzhuo.cn/web/log.html -I
HTTP/1.1 200 OK
Server: zhangzhuo
Date: Sat, 27 Mar 2021 08:51:11 GMT
Content-Type: text/html; charset=UTF-8
Content-Length: 929452
Connection: keep-alive
Keep-Alive: timeout=65
Vary: Accept-Encoding
Last-Modified: Sat, 27 Mar 2021 07:38:12 GMT
ETag: "e2eac-5be7fbb1384a7"
X-Via: 192.168.10.81
X-Cache: HIT
X-Accel: www.zhangzhuo.cn
Accept-Ranges: bytes
```

### 6.1.3 Nginx http 反向代理高级应用

在上⼀个章节中Nginx可以将客户端的请求转发⾄单台后端服务器但是⽆法转发⾄特定的⼀组的服务器，而且不能对后端服务器提供相应的服务器状态监测，但是Nginx可以基于ngx_http_upstream_module模块提供服务器分组转发、权重分配、状态监测、调度算法等⾼级功能，官⽅⽂档： https://nginx.org/en/docs/http/ngx_http_upstream_module.html

#### 6.1.3.1 http upstream配置参数

```bash
#⾃定义⼀组服务器，配置在http块内
upstream name {
     server address [parameters];  #配置⼀个后端web服务器，配置在upstream内，⾄少要有⼀个server服务器配置。  
     ip_hash；  #源地址hash调度⽅法，基于的客户端的remote_addr(源地址)做hash计算，以实现会话保持
     least_conn; #最少连接调度算法，优先将客户端请求调度到当前连接最少的后端服务器
}


hash KEY consistent； #基于指定key做hash计算，使⽤consistent参数，将使⽤ketama⼀致性hash算法，适⽤于后端是Cache服务器（如varnish）时使⽤，consistent定义使⽤⼀致性hash运算，⼀致性hash基于取模运算。

hash $request_uri consistent; #基于⽤户请求的uri做hash
```

**server支持的parameters**

```bash
weight=number          #设置权重，默认为1。
max_conns=number       #给当前server设置最⼤活动链接数，默认为0表示没有限制。
fail_timeout=time      #对后端服务器的失败监测超时时间，默认为10秒。
max_fails=number       #在fail_timeout时间对后端服务器连续监测失败多少次就标记为不可⽤。
proxy_next_upstream=error timeout;  #指定在哪种检测状态下将请求转发器其他服务器。
backup #设置为备份服务器，当所有服务器不可⽤时将重新启⽤次服务器。
down #标记为down状态。
resolve #当server定义的是主机名的时候，当A记录发⽣变化会⾃动应⽤新IP⽽不⽤重启Nginx。
```

#### 6.1.3.2 反向代理示例--多台web服务器

```bash
upstream webserver {
    #hash $request_uri consistent;
    #ip_hash;
    #least_conn;
    server 192.168.10.82:80 weight=1 fail_timeout=15s max_fails=3;   #后端服务器状态监测   
    server 192.168.10.83:80 weight=1 fail_timeout=15s max_fails=3;
    server 192.168.10.84:80 weight=1 fail_timeout=15s max_fails=3 backup;
}
server {
    listen 80; 
    server_name www.zhangzhuo.cn;
  location /web {
       proxy_pass http://webserver/;                  
    }   
}
#重启Nginx 并访问测试
[17:08:39 root@nginx ~]#systemctl reload nginx.service 
[17:08:44 root@nginx ~]#curl http://www.zhangzhuo.cn/web
web1 192.168.10.82
[17:08:59 root@nginx ~]#curl http://www.zhangzhuo.cn/web
web2 192.168.10.83
```

**关闭192.168.10.82和192.168.10.83，测试nginx backup服务器可⽤性：**

```bash
[17:09:49 root@nginx ~]#while true;do curl http://www.zhangzhuo.cn/web;sleep 1;done
web1 192.168.10.82
web2 192.168.10.83
web1 192.168.10.82
web2 192.168.10.83
web2 192.168.10.83
web2 192.168.10.84
```

#### 6.1.3.3 反向代理示例--客户端IP透传

```bash
upstream webserver {
    #hash $request_uri consistent;
    #ip_hash;
    #least_conn;
    server 192.168.10.82:80 weight=1 fail_timeout=15s max_fails=3;   
    server 192.168.10.83:80 weight=1 fail_timeout=15s max_fails=3;
    server 192.168.10.84:80 weight=1 fail_timeout=15s max_fails=3 backup;
}
server {
    listen 80; 
    server_name www.zhangzhuo.cn;
  location /web {
       proxy_pass http://webserver/;    
	   proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;  #添加客户端IP到报⽂头部
    }   
}

#重启nginx
#后端web服务器配置
1. Apache：
[17:17:15 root@apache1 ~]#vim  /etc/httpd/conf/httpd.conf
LogFormat "%{X-Forwarded-For}i %h %l %u %t \"%r\" %>s %b \"%{Referer}i\" \"%    {User-Agent}i\"" combined
#重启apache访问web界⾯并验证apache⽇志：
[17:18:59 root@apache1 ~]#tail -f /var/log/httpd/access_log  
192.168.10.1 192.168.10.81 - - [27/Mar/2021:17:18:47 +0800] "GET / HTTP/1.0" 200 19 "-" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.90 Safari/537.36 Edg/89.0.774.57"

2. Nginx：
[17:20:10 root@nginx ~]#cat /apps/nginx/conf/nginx.conf
"$http_x_forwarded_for"' #默认⽇志格式就有此配置
```

## 6.2 实现Nginx tcp负载均衡

Nginx在1.9.0版本开始⽀持tcp模式的负载均衡，在1.9.13版本开始⽀持udp协议的负载，udp主要⽤于DNS的域名解析，其配置⽅式和指令和http 代理类似，其基于ngx_stream_proxy_module模块实现tcp负载，另外基于模块ngx_stream_upstream_module实现后端服务器分组转发、权重分配、状态监测、调度算法等⾼级功能。

官⽅⽂档：https://nginx.org/en/docs/stream/ngx_stream_core_module.html

### 6.2.1 tcp负载均衡配置参数

```bash
stream {      #定义stream
    upstream backend {        #定义后端服务器
        hash $remote_addr consistent;     #定义调度算法
        server backend1.example.com:12345 weight=5;    #定义具体server
        server 127.0.0.1:12345 max_fails=3 fail_timeout=30s;
        server unix:/tmp/backend3;
    }
    upstream dns {     #定义后端服务器
        server 192.168.0.1:53535;    #定义具体server
        server dns.example.com:53;
    }
    server {     #定义server
        listen 12345;     #监听IP:PORT
        proxy_connect_timeout 1s;   #连接超时时间
        proxy_timeout 3s;      #转发超时时间
        proxy_pass backend;    #转发到具体服务器组
    }
    server {
        listen 127.0.0.1:53 udp reuseport;
        proxy_timeout 20s;
        proxy_pass dns;
    }
    server {
        listen [::1]:12345;
        proxy_pass unix:/tmp/stream.socket;
    }
}
```

### 6.2.2 负载均衡实例--Redis

**服务器安装redis**

```bash
[17:19:37 root@apache1 ~]#yum install redis -y
[17:29:49 root@apache1 ~]#vim /etc/redis.conf
bind 0.0.0.0
[17:30:20 root@apache1 ~]#systemctl enable --now redis.service
[17:30:49 root@apache1 ~]#ss -ntl | grep 6379
LISTEN    0         128                0.0.0.0:6379             0.0.0.0:*
```

**nginx配置：**

```bash
[17:37:17 root@nginx ~]#mkdir /apps/nginx/conf/tcp
[17:36:57 root@nginx ~]#cat /apps/nginx/conf/tcp/tcp.conf
stream {
    upstream redis_server {
      #hash $remote_addr consistent;
      server 192.168.10.82:6379 max_fails=3 fail_timeout=30s;
    }
    server {
      listen 192.168.10.81:6379;
      proxy_connect_timeout 3s;
      proxy_timeout 3s;
      proxy_pass redis_server;
    }
}
[17:34:58 root@nginx ~]#vim /apps/nginx/conf/nginx.conf
#在最下面添加不要写到任何块中
include /apps/nginx/conf/tcp/tcp.conf;

#重启nginx并访问测试
[17:37:21 root@nginx ~]#systemctl restart nginx.service 
[17:37:48 root@nginx ~]#ss -ntl | grep 6379
LISTEN    0         128          192.168.10.81:6379             0.0.0.0:*     

#测试通过nginx 负载连接redis：
[17:38:57 root@nginx ~]#redis-cli -h 192.168.10.81
192.168.10.81:6379> set name jack
OK
192.168.10.81:6379> get name
"jack"
192.168.10.81:6379>
```

### 6.2.3 负载均衡实例：MySQL

**服务器安装MySQL**

```bash
[17:31:04 root@apache1 ~]#yum install -y mysql-server
[17:41:37 root@apache1 ~]#systemctl enable --now mysqld
[17:44:31 root@apache1 ~]#mysql
mysql> set password for 'root'@'localhost'='123456';
Query OK, 0 rows affected (0.00 sec)
mysql> update mysql.user set host='%' where user='root';
Query OK, 1 row affected (0.00 sec)
Rows matched: 1  Changed: 1  Warnings: 0
[17:46:45 root@apache1 ~]#systemctl restart mysqld.service
```

**nginx配置：**

```bash
[17:49:22 root@nginx ~]#cat /apps/nginx/conf/tcp/tcp.conf
stream {
    upstream redis_server {
      #hash $remote_addr consistent;
      server 192.168.10.82:6379 max_fails=3 fail_timeout=30s;
    }
    ipstream mysql_server {
      server 192.168.10.82:3306 max_fails=3 fail_timeout=30s;
    }
    server {
      listen 192.168.10.81:6379;
      proxy_connect_timeout 3s;
      proxy_timeout 3s;
      proxy_pass redis_server;
    }
    server {
      listen 192.168.10.81:3306;
      proxy_connect_timeout 3s;
      proxy_timeout 3s;
      proxy_pass mysql_server;
    }
}
#重启nginx并访问测试：
[17:50:13 root@nginx ~]#systemctl restart nginx.service 
[17:52:33 root@nginx ~]#mysql -uroot -p123456 -h192.168.10.81
mysql> show databases;
+--------------------+
| Database           |
+--------------------+
| db1                |
| information_schema |
| mysql              |
| performance_schema |
| sys                |
+--------------------+
```

## 6.3 实现FastCGI

**CGI的由来：**

最早的Web服务器只能简单地响应浏览器发来的HTTP请求，并将存储在服务器上的HTML⽂件返回给浏览器，也就是静态html⽂件（http://www.zbbz.com/index.html），但是后期随着⽹站功能增多网站开发也越来越复杂，以⾄于出现动态技术，⽐如像php(1995年)、java(1995)、python(1991)语⾔开发的网站，但是nginx/apache服务器并不能直接运⾏ php、java这样的⽂件，apache实现的方式式是打补丁，但是nginx却通过与第三⽅基于协议实现，即通过某种特定协议将客户端请求转发给第三⽅服务处理，第三⽅服务器会新建新的进程处理⽤户的请求，处理完成后返回数据给Nginx并回收进程，最后nginx在返回给客户端，那这个约定就是通⽤网关接⼝(common gateway interface，简称CGI)，CGI（协议） 是web服务器和外部应⽤程序之间的接⼝标准，是cgi程序和web服务器之间传递信息的标准化接⼝。

![image-20210329190622650](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210329190622650.png)

**CGI的通信方式：**

![image-20210329190632513](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210329190632513.png)

**为什么会有FastCGI？**

CGI协议虽然解决了语⾔解析器和seb server之间通讯的问题，但是它的效率很低，因为web server每收到⼀个请求都会创建⼀个CGI进程，PHP解析器都会解析php.ini⽂件，初始化环境，请求结束的时候再关闭进程，对于每⼀个创建的CGI进程都会执⾏这些操作，所以效率很低，⽽FastCGI是⽤来提⾼CGI性能的，FastCGI每次处理完请求之后不会关闭掉进程，⽽是保留这个进程，使这个进程可以处理多个请求。这样的话每个请求都不⽤再重新创建⼀个进程了，⼤⼤提升了处理效率。

**FastCGI通信方式：**

![image-20210329190750484](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210329190750484.png)

**什么是PHP-FPM？**

PHP-FPM(FastCGI Process Manager：FastCGI进程管理器)是⼀个实现了Fastcgi的管理程序，并且提供进程管理的功能，进程包括master进程和worker进程，master进程只有⼀个，负责监听端⼝，接受来⾃web server的请求。worker进程⼀般会有多个，每个进程中会嵌⼊⼀个PHP解析器，进⾏PHP代码的处理。

### 6.3.1 FastCGI配置指令

Nginx基于模块ngx_http_fastcgi_module实现通过fastcgi协议将指定的客户端请求转发至php-fpm处理，其配置指令如下：

```bash
proxy_pass http://
fastcgi_pass 172.31.7.8:9000;
#转发请求到后端服务器，address为后端的fastcgi server的地址，可⽤位置：location, if inlocation

fastcgi_index name;
#fastcgi默认的主⻚资源，示例：fastcgi_index index.php;


fastcgi_param parameter value [if_not_empty];
#设置传递给FastCGI服务器的参数值，可以是⽂本，变量或组合，可⽤于将Nginx的内置变量赋值给⾃定义key
fastcgi_param REMOTE_ADDR $remote_addr; #客户端源IP
fastcgi_param REMOTE_PORT $remote_port; #客户端源端⼝
fastcgi_param SERVER_ADDR $server_addr; #请求的服务器IP地址
fastcgi_param SERVER_PORT $server_port; #请求的服务器端⼝
fastcgi_param SERVER_NAME $server_name; #请求的server name

#Nginx默认配置示例：
 location ~ \.php$ {
 root html;
 fastcgi_pass 127.0.0.1:9000;
 fastcgi_index index.php;
 fastcgi_param SCRIPT_FILENAME /scripts$fastcgi_script_name;  #默认脚本路径
 include fastcgi_params;
 }
```

**缓存定义指令：**

```bash
fastcgi_cache_path path [levels=levels] [use_temp_path=on|off]
keys_zone=name:size [inactive=time] [max_size=size] [manager_files=number]
[manager_sleep=time] [manager_threshold=time] [loader_files=number]
[loader_sleep=time] [loader_threshold=time] [purger=on|off]
[purger_files=number] [purger_sleep=time] [purger_threshold=time];

#定义fastcgi的缓存
path             #缓存位置为磁盘上的⽂件系统路径
max_size=size    #磁盘path路径中⽤于缓存数据的缓存空间上限
levels=levels：  #⼗六进制的缓存⽬录的层级数量，以及每⼀级的⽬录数
levels=ONE:TWO:THREE，示例：leves=1:2:2
keys_zone=name:size #设置缓存名称及k/v映射的内存空间的名称及⼤⼩
inactive=time       #缓存有效时间，默认10分钟，需要在指定时间满⾜fastcgi_cache_min_uses 次数被视为活动缓存。
```

**缓存调用指令：**

```bash
fastcgi_cache zone | off;
#调⽤指定的缓存空间来缓存数据，可⽤位置：http, server, location

fastcgi_cache_key string;
#定义⽤作缓存项的key的字符串，示例：fastcgi_cache_key $request_uri;

fastcgi_cache_methods GET | HEAD | POST ...;
#为哪些请求⽅法使⽤缓存 

fastcgi_cache_min_uses number;
#缓存空间中的缓存项在inactive定义的⾮活动时间内⾄少要被访问到此处所指定的次数⽅可被认作活动项

fastcgi_keep_conn on | off; 
#收到后端服务器响应后，fastcgi服务器是否关闭连接，建议启⽤⻓连接

fastcgi_cache_valid [code ...] time;
#不同的响应码各⾃的缓存时⻓

fastcgi_hide_header field; #隐藏响应头指定信息

fastcgi_pass_header field; #返回响应头指定信息，默认不会将Status、X-Accel-...返回
```

### 6.3.2 FastCGI示例--Nginx与php-fpm在同⼀服务器

php安装可以通过yum或者编译安装，使⽤yum安装相对⽐较简单，编译安装更⽅便⾃定义参数或选项。

#### 6.3.2.1 php环境准备

使⽤base源⾃带的php版本，https://www.php.net/docs.php

```bash
#yum安装默认版本php
[19:06:04 root@nginx ~]#yum install php-fpm php-mysqlnd -y 
#centos8 php的mysql插件名称为mysqlnd，旧版本为mysql
[19:17:30 root@nginx ~]#systemctl enable --now php-fpm.service 
[19:17:39 root@nginx ~]#ps -ef | grep php-fpm
root        1464       1  0 19:17 ?        00:00:00 php-fpm: master process (/etc/php-fpm.conf)
apache      1465    1464  0 19:17 ?        00:00:00 php-fpm: pool www
apache      1466    1464  0 19:17 ?        00:00:00 php-fpm: pool www
apache      1467    1464  0 19:17 ?        00:00:00 php-fpm: pool www
apache      1468    1464  0 19:17 ?        00:00:00 php-fpm: pool www
apache      1469    1464  0 19:17 ?        00:00:00 php-fpm: pool www
root        1473    1175  0 19:17 pts/0    00:00:00 grep --color=auto php-fpm
```

#### 6.3.2.2 php相关配置优化

```bash
[19:19:24 root@nginx ~]#grep "^[a-Z]" /etc/php-fpm.conf 
include=/etc/php-fpm.d/*.conf
pid = /run/php-fpm/php-fpm.pid
error_log = /var/log/php-fpm/error.log
daemonize = yes   #是否后台启动


[19:20:03 root@nginx ~]#grep "^[a-Z]" /etc/php-fpm.d/www.conf 
[www]
user = nginx            #php-fpm启动的⽤户和组，会涉及到后期⽂件的权限问题
group = nginx
listen = 127.0.0.1:9000      #监听地址及IP
listen.acl_users = apache,nginx
listen.allowed_clients = 127.0.0.1     #允许客户端从哪个源IP地址访问，要允许所有⾏⾸加 ;注释即可
pm = dynamic            #动态模式进程管理
pm.max_children = 50   #静态⽅式下开启的php-fpm进程数量，在动态⽅式下他限定php-fpm的最⼤进程数
pm.start_servers = 5   #动态模式下初始进程数，必须⼤于等于pm.min_spare_servers和⼩于等于pm.max_children的值。
pm.min_spare_servers = 5    #最⼩空闲进程数
pm.max_spare_servers = 35   #最⼤空闲进程数
pm.status_path = /pm_status #状态访问URL
ping.path = /ping           #ping访问动地址
slowlog = /var/log/php-fpm/www-slow.log    #慢⽇志路径
php_admin_value[error_log] = /var/log/php-fpm/www-error.log  #错误⽇志
php_admin_flag[log_errors] = on
php_value[session.save_handler] = files      #phpsession保存⽅式及路径
php_value[session.save_path]    = /var/lib/php/session   #当时使⽤file保存session的⽂件路径
php_value[soap.wsdl_cache_dir]  = /var/lib/php/wsdlcache
```

修改配置⽂件后记得重启php-fpm

```bash
[19:32:05 root@nginx ~]#systemctl restart php-fpm.service
```

#### 6.2.3.3 准备php测试页面

```bash
[19:32:22 root@nginx ~]#mkdir /data/nginx/php
[19:33:25 root@nginx ~]#vim /data/nginx/php/index.php
<?php
    phpinfo();
?>
```

#### 6.3.2.4 Nginx配置转发

Nginx安装完成之后默认⽣成了与fastcgi的相关配置⽂件，⼀般保存在nginx的安装路径的conf⽬录当中，⽐如/apps/nginx/conf/fastcgi.conf、/apps/nginx/conf/fastcgi_params。

```bash
location ~ \.php$ {
        root /data/nginx/php;        #$document_root调⽤root⽬录
        fastcgi_pass 127.0.0.1:9000; 
        fastcgi_index index.php;                                                       #fastcgi_param SCRIPT_FILENAME /data/nginx/php$fastcgi_script_name;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        #如果SCRIPT_FILENAME是绝对路径则可以省略root /data/nginx/php;
        include fastcgi_params;
    } 
#重启Nginx并访问web测试
[19:37:53 root@nginx ~]#systemctl restart nginx.service
```

#### 6.3.2.5 访问验证php测试页面

![image-20210329194131735](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210329194131735.png)

```bash
fastcgi_pass常⻅的错误：
File not found. #路径不对
502： php-fpm   #处理超时、服务停⽌运⾏等原因导致的⽆法连接或请求超时
```

#### 6.3.2.6 php-fpm 的运行状态页面

访问配置⽂件⾥⾯指定的路径，会返回php-fpm的当前运⾏状态。

**Nginx配置：**

```bash
location ~ ^/(status|ping)$ {
        #access_log off;
        #allow 127.0.0.1;
        #deny all;
        include fastcgi_params;
        fastcgi_pass 127.0.0.1:9000;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    }
```

**重启Nginx并测试：**

```bash
[19:47:40 root@nginx ~]#systemctl restart nginx.service 
[19:47:48 root@nginx ~]#curl http://www.zhangzhuo.org/status
pool:                 www
process manager:      dynamic
start time:           29/Mar/2021:19:32:20 +0800
start since:          929
accepted conn:        11
listen queue:         0
max listen queue:     0
listen queue len:     128
idle processes:       99
active processes:     1
total processes:      100
max active processes: 1
max children reached: 0
slow requests:        0
[19:47:49 root@nginx ~]#curl http://www.zhangzhuo.org/ping
pong
[19:48:34 root@nginx ~]#curl http://www.zhangzhuo.org/status?full
[19:48:34 root@nginx ~]#curl http://www.zhangzhuo.org/status?html
[19:48:51 root@nginx ~]#curl http://www.zhangzhuo.org/status?json
```

### 6.3.3 FastCGI示例--Nginx与php不在同⼀个服务器

nginx会处理静态请求，但是会转发动态请求到后端指定的php-fpm服务器，因此代码也需要放在后端的php-fpm服务器，即静态⻚⾯放在Nginx上⽽动态⻚⾯放在后端php-fpm服务器，正常情况下，⼀般都是采⽤6.3.2的部署方式。

#### 6.3.3.1 yum安装较新版本php-fpm

```bash
[19:56:30 root@apache1 ~]#dnf install https://rpms.remirepo.net/enterprise/remi-release-8.rpm  #包含较新的PHP等软件包
[19:59:05 root@apache1 ~]#yum install php74-php php74-php-mysqlnd -y  #安装指定版本的php
[19:59:25 root@apache1 ~]#rpm -ql php74-php-fpm    #验证安装路径

#⽣成php72配置⽂件
[19:59:39 root@apache1 ~]#cp /opt/remi/php74/root/usr/share/doc/php74-php-common/php.ini-production /opt/remi/php74/root/usr/etc/php.ini
[20:01:04 root@apache1 ~]#cp /opt/remi/php74/root/usr/share/doc/php74-php-fpm/php-fpm.conf.default /opt/remi/php74/root/usr/etc/php-fpm.conf
```

#### 6.3.3.2 修改php-fpm监听配置

php-fpm默认监听在127.0.0.1的9000端⼝，也就是⽆法远程连接，因此要做相应的修改。

```bash
#php56修改监听配置
[root@s4 ~]# vim /opt/remi/php56/root/etc/php-fpm.d/www.conf
listen = 192.168.7.104:9000 #指定监听IP
#listen.allowed_clients = 127.0.0.1 #注释运⾏的客户端

#php74修改监听配置
[20:01:53 root@apache1 ~]#vim /etc/opt/remi/php74/php-fpm.d/www.conf
user = apache
group = apache
listen = 0.0.0.0:9000
; listen.allowed_clients = 127.0.0.1
```

#### 6.3.3.3 准备php测试页面

```bash
[20:04:39 root@apache1 ~]#mkdir /data/nginx/php -p
[20:06:26 root@apache1 ~]#vim /data/nginx/php/index.php
<?php
    phpinfo();
?>
```

#### 6.3.3.4 启动并验证php-fpm

```bash
[20:07:13 root@apache1 ~]#systemctl enable --now php74-php-fpm.service
[20:07:54 root@apache1 ~]#ps -ef | grep php
root        2574       1  0 20:07 ?        00:00:00 php-fpm: master process (/etc/opt/remi/php74/php-fpm.conf)
apache      2575    2574  0 20:07 ?        00:00:00 php-fpm: pool www
apache      2576    2574  0 20:07 ?        00:00:00 php-fpm: pool www
apache      2577    2574  0 20:07 ?        00:00:00 php-fpm: pool www
apache      2578    2574  0 20:07 ?        00:00:00 php-fpm: pool www
apache      2579    2574  0 20:07 ?        00:00:00 php-fpm: pool www
root        2581    1518  0 20:08 pts/0    00:00:00 grep --color=auto php
```

#### 6.3.3.5 Nginx配置转发

```bash
[20:09:30 root@nginx ~]#vim /apps/nginx/conf/conf.d/pc.conf
	location ~ \.php$ {
        root /data/nginx/php;
        fastcgi_pass 192.168.10.82:9000;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;                                                     
    }
#重启nginx
[20:09:51 root@nginx ~]#systemctl restart nginx.service
```

## 6.4 tengine使用

Tengine使⽤：http://tengine.taobao.org/

关闭nginx，下载tengine源码并使⽤nginx参编译安装，tengine与nginx版本不⼀致会导致编译参数不通用

### 6.4.1 动态模块

http://tengine.taobao.org/document_cn/dso_cn.html

```bash
#这个模块主要是⽤来运⾏时动态加载模块，⽽不⽤每次都要重新编译Tengine.

#如果你想要编译官⽅模块为动态模块，你需要在configure的时候加上类似这样的指令(--withhttp_xxx_module),./configure --help可以看到更多的细节.

#如果只想要安装官⽅模块为动态模块(不重新安装tengine)，那么就只需要configure之后，执⾏ make dso_install命令.

#动态加载模块的个数限制为128个.

#如果已经加载的动态模块有修改，那么必须重起Tengine才会⽣效.

#只⽀持HTTP模块.

#模块 在Linux/FreeeBSD/MacOS下测试成功
```

**tengine v2.1.2(基于ginx/1.6.2) centos 7.x**

```bash
#编译安装
[20:15:46 root@nginx ~]#tar xf tengine-2.1.2.tar.gz    
[20:15:46 root@nginx ~]#cd tengine-2.1.2/
[20:16:13 root@nginx tengine-2.1.2]#./configure --prefix=/apps/tengine --user=nginx --group=nginx --with-http_ssl_module --with-http_v2_module --with-http_realip_module --with-http_stub_status_module --with-http_gzip_static_module --with-pcre 
[20:19:09 root@nginx tengine-2.1.2]#make && make install
```

**v2.3.2：**

```bash
[20:25:54 root@nginx ~]#wget http://tengine.taobao.org/download/tengine-2.3.2.tar.gz
[20:26:32 root@nginx ~]#tar xf tengine-2.3.2.tar.gz
[20:26:46 root@nginx ~]#cd tengine-2.3.2/
[20:26:56 root@nginx tengine-2.3.2]#/apps/nginx/sbin/nginx -V
[20:27:08 root@nginx tengine-2.3.2]#./configure --prefix=/apps/tengine-2.3.2 --user=nginx --group=nginx --with-http_ssl_module --with-http_v2_module --with-http_realip_module --with-http_stub_status_module --with-http_gzip_static_module --with-pcre --with-stream --with-stream_ssl_module --with-stream_realip_module 
[20:29:54 root@nginx tengine-2.3.2]#make && make install
```

### 6.4.2 tengine配置文件

```bash
#兼容Nginx指定版本的配置参数
[20:43:16 root@nginx tengine-2.3.2]#mkdir /apps/tengine-2.3.2/conf/conf.d/
[20:43:59 root@nginx tengine-2.3.2]#cp /apps/nginx/conf/conf.d/pc.conf /apps/tengine-2.3.2/conf/conf.d/
[20:50:51 root@nginx tengine-2.3.2]#cat conf/conf.d/pc.conf 
server {
    listen 80;
    listen 443 ssl;
    ssl_certificate /apps/nginx/certs/www.zhangzhuo.org.crt;
    ssl_certificate_key /apps/nginx/certs/www.zhangzhuo.org.key;
    ssl_session_cache shared:sslcache:20m;
    ssl_session_timeout 10m;

    server_name www.zhangzhuo.org;
    error_log /data/nginx/logs/org/www.zhangzhuo.org_error.log  notice;

    location / {
       root /data/nginx/html/pc;
       index index.html;
    }
    location = /favicon.ico {
        root /data/nginx/html/pc/images;
        expires 90d;
    }
    location /nginx_status {
        stub_status;
        allow 192.168.10.1;
        allow 127.0.0.1;
        deny all;
    }   
    location ~ \.php$ {
        root /data/nginx/php;
        fastcgi_pass 192.168.10.82:9000;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
    location ~ ^/(status|ping)$ {
        #access_log off;
        #allow 127.0.0.1;
        #deny all;
        include fastcgi_params;
        fastcgi_pass 127.0.0.1:9000;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    }
    
}
```

## 6.5 openresty

http://openresty.org/cn/

OpenResty® 是⼀个基于 Nginx 与 Lua 的⾼性能 Web 平台，其内部集成了⼤量精良的 Lua 库、第三⽅模块以及⼤多数的依赖项。⽤于⽅便地搭建能够处理超高并发、扩展性极⾼的动态 Web 应⽤、Web服务和动态网关。

OpenResty® 通过汇聚各种设计精良的 Nginx 模块（主要由 OpenResty 团队自主开发），从而将Nginx 有效地变成⼀个强⼤的通⽤ Web 应⽤平台。这样，Web 开发⼈员和系统⼯程师可以使⽤ Lua 脚本语⾔调动 Nginx ⽀持的各种 C 以及 Lua 模块，快速构造出足以胜任 10K 乃⾄ 1000K 以上单机并发连接的高性能 Web 应用系统。

OpenResty® 的⽬标是让你的Web服务直接跑在 Nginx 服务内部，充分利⽤ Nginx 的⾮阻塞 I/O 模型，不仅仅对 HTTP 客户端请求,甚⾄于对远程后端诸如 MySQL、PostgreSQL、Memcached 以及Redis 等都进⾏⼀致的⾼性能响应。

```bash
[09:15:52 root@nginx ~]#wget https://openresty.org/download/openresty-1.19.3.1.tar.gz
[09:17:22 root@nginx ~]#tar xf openresty-1.19.3.1.tar.gz 
[09:17:38 root@nginx ~]#cd openresty-1.19.3.1/
[09:23:06 root@nginx openresty-1.19.3.1]#./configure --prefix=/apps/openresty --user=nginx --group=nginx --with-http_ssl_module --with-http_v2_module --with-http_realip_module --with-http_stub_status_module --with-http_gzip_static_module --with-pcre --with-stream --with-stream_ssl_module --with-stream_realip_module --with-file-aio --with-threads --with-select_module
[09:23:06 root@nginx openresty-1.19.3.1]#gmake &&  gmake install
[09:23:33 root@nginx openresty-1.19.3.1]#ls /apps/openresty/
bin  COPYRIGHT  luajit  lualib  nginx  pod  resty.index  site
[09:24:01 root@nginx openresty-1.19.3.1]#/apps/openresty/bin/openresty
```

# 七、系统参数优化

## 7.1 系统参数优化

```bash
#默认的Linux内核参数考虑的是最通用场景，不符合⽤于⽀持高并发访问的Web服务器的定义，根据业务特点来进⾏调整，当Nginx作为静态web内容服务器、反向代理或者提供压缩服务器的服务器时，内核参数的调整都是不同的，此处针对最通⽤的、使Nginx⽀持更多并发请求的TCP⽹络参数做简单的配置,修 改/etc/sysctl.conf来更改内核参数

net.ipv4.ip_nonlocal_bind = 1   #允许⾮本地IP地址socket监听
net.ipv4.ip_forward = 1         #开启IPv4转发
net.ipv4.tcp_timestamps = 0     #是否开启数据包时间戳
net.ipv4.tcp_tw_reuse = 0       #端⼝复⽤
net.ipv4.tcp_tw_recycle = 0     #快速回收TIME_WAIT状态，⽤于⼤量TIME_OUT场景

fs.file-max = 1000000
#表示单个进程较⼤可以打开的句柄数

net.ipv4.tcp_tw_reuse = 1 
#参数设置为 1 ，表示允许将TIME_WAIT状态的socket重新⽤于新的TCP链接，这对于服务器来说意义重⼤，因为总有⼤量TIME_WAIT状态的链接存在

net.ipv4.tcp_keepalive_time = 600
#当keepalive启动时，TCP发送keepalive消息的频度；默认是2⼩时，将其设置为10分钟，可更快的清理⽆效链接

net.ipv4.tcp_fin_timeout = 30
#当服务器主动关闭链接时，socket保持在FIN_WAIT_2状态的较⼤时间

net.ipv4.tcp_max_tw_buckets = 5000
#表示操作系统允许TIME_WAIT套接字数量的较⼤值，如超过此值，TIME_WAIT套接字将⽴刻被清除并打印警告信息,默认为8000，过多的TIME_WAIT套接字会使Web服务器变慢

net.ipv4.ip_local_port_range = 1024 65000
#定义UDP和TCP链接的本地端⼝的取值范围

net.ipv4.tcp_rmem = 10240 87380 12582912
#定义了TCP接受socket请求缓存的内存最⼩值、默认值、较⼤值

net.ipv4.tcp_wmem = 10240 87380 12582912
#定义TCP发送缓存的最⼩值、默认值、较⼤值

net.core.netdev_max_backlog = 8096
#当⽹卡接收数据包的速度⼤于内核处理速度时，会有⼀个列队保存这些数据包。这个参数表示该列队的较⼤值

net.core.rmem_default = 6291456
#表示内核套接字接受缓存区默认⼤⼩
net.core.wmem_default = 6291456
#表示内核套接字发送缓存区默认⼤⼩
net.core.rmem_max = 12582912
#表示内核套接字接受缓存区较⼤⼤⼩
net.core.wmem_max = 12582912
#表示内核套接字发送缓存区较⼤⼤⼩
注意：以上的四个参数，需要根据业务逻辑和实际的硬件成本来综合考虑


net.ipv4.tcp_syncookies = 1 #与性能⽆关。⽤于解决TCP的SYN攻击

net.ipv4.tcp_max_syn_backlog = 8192
#这个参数表示TCP三次握⼿建⽴阶段接受SYN请求列队的较⼤⻓度，默认1024，将其设置的⼤⼀些可使出现Nginx繁忙来不及accept新连接时，Linux不⾄于丢失客户端发起的链接请求

net.ipv4.tcp_tw_recycle = 1 #这个参数⽤于设置启⽤timewait快速回收

net.core.somaxconn=262114
#选项默认值是128，这个参数⽤于调节系统同时发起的TCP连接数，在⾼并发的请求中，默认的值可能会导致链接超时或者重传，因此需要结合⾼并发请求数来调节此值。

net.ipv4.tcp_max_orphans=262114
#选项⽤于设定系统中最多有多少个TCP套接字不被关联到任何⼀个⽤户⽂件句柄上。如果超过这个数字，孤⽴链接将⽴即被复位并输出警告信息。这个限制指示为了防⽌简单的DOS攻击，不⽤过分依靠这个限制甚⾄认为的减⼩这个值，更多的情况是增加这个值
```

# ⼋、LNMP项⽬实战-WordPress站点搭建

![image-20210330100031539](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210330100031539.png)

## 8.1 部署数据库

### 8.1.1 部署安装MySQL数据库

```bash
#安装数据库
[09:56:34 root@centos8 ~]#hostnamectl set-hostname mysql.zhangzhuo.org
[10:00:54 root@mysql ~]#yum install -y mysql-server
[10:04:38 root@mysql ~]#systemctl enable --now mysqld
#创建数据库授权
[10:05:03 root@mysql ~]#mysql
mysql> create database wordpress;
Query OK, 1 row affected (0.00 sec)

mysql> create user 'wordpress'@'%' identified by '123456';
Query OK, 0 rows affected (0.00 sec)

mysql> grant all on wordpress.* to 'wordpress'@'%';
Query OK, 0 rows affected (0.01 sec)
#验证权限
[10:06:56 root@mysql ~]#mysql -uwordpress -p123456
mysql> show databases;
+--------------------+
| Database           |
+--------------------+
| information_schema |
| wordpress          |
+--------------------+
2 rows in set (0.00 sec)
```

## 8.2 部署PHP

### 8.2.1 编译安装php 7.4.16

```bash
#下载安装
[09:56:06 root@centos8 ~]#hostnamectl set-hostname php.zhangzhuo.org
[10:12:45 root@php ~]#wget https://www.php.net/distributions/php-7.4.16.tar.gz
[10:14:40 root@php ~]#tar xf php-7.4.16.tar.gz
[10:23:13 root@php php-7.4.16]# ./configure --prefix=/apps/php --enable-fpm --with-fpmuser=www --with-fpm-group=www --with-pear --with-curl --with-png-dir  --with-iconv --with-mhash --with-zlib --with-xmlrpc  --with-openssl --with-mysqli --with-pdo-mysql --disable-debug  --enable-sockets --enable-soap --enable-inline-optimization --enable-ftp --enable-exif --enable-wddx --enable-bcmath --enable-calendar --enable-shmop --enable-dba --enable-sysvsem --enable-sysvshm

#⽣成配置⽂件
[10:44:56 root@php php-7.4.16]#cd /apps/php/etc/php-fpm.d/
[10:49:11 root@php php-fpm.d]#cp www.conf.default www.conf
[10:54:09 root@php php]# useradd www -s /sbin/nologin -u 1001
[10:58:29 root@php php-fpm.d]#grep -v ";" www.conf | grep -v "^$"
[www]
user = www
group = www
listen = 0.0.0.0:9000
;listen.allowed_clients = 127.0.0.1
pm = dynamic
pm.max_children = 50
pm.start_servers = 30
pm.min_spare_servers = 30
pm.max_spare_servers = 35
pm.status_path = /status
ping.path = /ping
ping.response = pong
access.log = log/$pool.access.log
slowlog = log/$pool.log.slow
[10:58:31 root@php php-fpm.d]#mkdir /apps/php/log
[10:59:02 root@php php-fpm.d]#cd /apps/php/etc/
[10:59:10 root@php etc]#cp php-fpm.conf.default php-fpm.conf

#检测语法并启动php-fpm
[root@s1 etc]# /apps/php/sbin/php-fpm -t
[06-Mar-2019 18:44:46] NOTICE: configuration file /apps/php/etc/php-fpm.conf
test is successful
[11:00:43 root@php etc]#/apps/php/sbin/php-fpm 
[11:00:58 root@php etc]#ss -ntl
State     Recv-Q     Send-Q         Local Address:Port         Peer Address:Port    
LISTEN    0          128                  0.0.0.0:9000              0.0.0.0:*       
LISTEN    0          128                  0.0.0.0:111               0.0.0.0:*       
LISTEN    0          128                  0.0.0.0:22                0.0.0.0:*       
LISTEN    0          128                     [::]:111                  [::]:*       
LISTEN    0          128                     [::]:22                   [::]:*
```

### 8.2.2 准备php测试页

```
[11:10:40 root@php ~]#mkdir /data/php/wordpress -p
[11:11:07 root@php ~]#vim /data/php/wordpress/index.php
<?php
    phpinfo();
?>
```

## 8.3 部署Nginx

要求⾃定义显示返回给客户端的server信息并隐藏nginx 版本。

### 8.3.1 脚本编译安装nginx

```bash
[09:56:24 root@centos8 ~]#hostnamectl set-hostname nginx.zhangzhuo.org
[11:06:00 root@nginx ~]#cat install_nginx.sh 
#!/bin/bash
#
#********************************************************************
#Author:zhangzhuo
#QQ: 1191400158
#Date: 2021-03-23
#FileName：install_nginx.sh
#URL: https://www.zhangzhuo.ltd
#Description：The test script
#Copyright (C): 2021 All rights reserved
#********************************************************************
INS_DIR='/apps/nginx'
http_tar_file='https://nginx.org/download/nginx-1.18.0.tar.gz'
tar_file=`echo ${http_tar_file} | grep -Eo '[^/]+$'`
dir_file=`echo ${tar_file} | sed -rn 's/(.*)\.tar.*/\1/p'`

set='--prefix=/apps/nginx --user=nginx --group=nginx --with-http_ssl_module --with-http_v2_module --with-http_realip_module --with-http_stub_status_module --with-http_gzip_static_module --with-pcre --with-stream --with-stream_ssl_module --with-stream_realip_module --with-file-aio --with-threads --with-select_module --add-module=/root/echo-nginx-module-master --with-openssl=/root/openssl-1.1.1d'


install_yum(){
yum install -y gcc gcc-c++ pcre pcre-devel zlib zlib-devel openssl openssl-devel automake perl wget
cat >/usr/lib/systemd/system/nginx.service<<EOF
[Unit]                                                                              
Description=The nginx HTTP and reverse proxy server
After=network.target remote-fs.target nss-lookup.target

[Service]
Type=forking
PIDFile=${INS_DIR}/logs/nginx.pid
# Nginx will fail to start if /run/nginx.pid already exists but has the wrong
# SELinux context. This might happen when running \`nginx -t\` from the cmdline.
# https://bugzilla.redhat.com/show_bug.cgi?id=1268621
ExecStartPre=/usr/bin/rm -f ${INS_DIR}/logs/nginx.pid
ExecStartPre=${INS_DIR}/sbin/nginx -t
ExecStart=${INS_DIR}/sbin/nginx
ExecReload=/bin/kill -s HUP \$MAINPID
KillSignal=SIGQUIT
TimeoutStopSec=5
KillMode=mixed
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
}
install_apt(){
apt install gcc openssl  automake perl wget libpcre3 libpcre3-dev  zlib1g-dev libssl-dev make -y
cat >/lib/systemd/system/nginx.service<<EOF
[Unit]                                                                              
Description=The nginx HTTP and reverse proxy server
After=network.target remote-fs.target nss-lookup.target

[Service]
Type=forking
PIDFile=${INS_DIR}/logs/nginx.pid
# Nginx will fail to start if /run/nginx.pid already exists but has the wrong
# SELinux context. This might happen when running \`nginx -t\` from the cmdline.
# https://bugzilla.redhat.com/show_bug.cgi?id=1268621
ExecStartPre=/bin/rm -f ${INS_DIR}/logs/nginx.pid
ExecStartPre=${INS_DIR}/sbin/nginx -t
ExecStart=${INS_DIR}/sbin/nginx
ExecReload=/bin/kill -s HUP \$MAINPID
KillSignal=SIGQUIT
TimeoutStopSec=5
KillMode=mixed
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload

}

install(){
wget $http_tar_file
tar xvf ${tar_file}
cd ${dir_file}
./configure --prefix=${INS_DIR} ${set} || { echo '执行错误，请检查环境'; exit ;}
make && make install
useradd -r -s /sbin/nologin nginx
chown -R nginx.nginx ${INS_DIR}
cat >/usr/lib/systemd/system/nginx.service<<EOF
[Unit]
Description=The nginx HTTP and reverse proxy server
After=network.target remote-fs.target nss-lookup.target

[Service]
Type=forking
PIDFile=${INS_DIR}/logs/nginx.pid
# Nginx will fail to start if /run/nginx.pid already exists but has the wrong
# SELinux context. This might happen when running \`nginx -t\` from the cmdline.
# https://bugzilla.redhat.com/show_bug.cgi?id=1268621
ExecStartPre=/usr/bin/rm -f ${INS_DIR}/logs/nginx.pid
ExecStartPre=${INS_DIR}/sbin/nginx -t
ExecStart=${INS_DIR}/sbin/nginx
ExecReload=/bin/kill -s HUP \$MAINPID
KillSignal=SIGQUIT
TimeoutStopSec=5
KillMode=mixed
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
echo "PATH=${INS_DIR}/sbin:\$PATH" >/etc/profile.d/nginx.sh
}

install_all(){
os=`grep -Eo 'centos|ubuntu' /etc/os-release | head -1`
if [ $os == centos ];then
     install_yum
     install
	echo centos
elif [ $os == ubuntu ];then
     install_apt
     install
else
	echo "本脚本不支持此系统"	
fi
}

install_all
```

### 8.3.2 配置Nginx

```bash
[11:13:21 root@nginx conf]#vim nginx.conf
#添加
include /apps/nginx/conf/conf.d/*.conf;
[11:13:39 root@nginx conf]#mkdir /apps/nginx/conf/conf.d/
[11:21:00 root@nginx ~]#vim /apps/nginx/conf/conf.d/wordpress.conf
server{
    listen 80;
    server_name www.zhangzhuo.org;

    access_log  /data/nginx/logs/www.zhangzhuo.org.access.log  access_json;

    location / {
        root /data/nginx/wordpress;
        index index.html;
    }
    location ~ \.php$ {
        root /data/php/wordpress;
        fastcgi_pass 192.168.10.82:9000;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root html;
    }
}
[11:20:20 root@nginx ~]#mkdir /data/nginx/wordpress -p
[11:22:23 root@nginx ~]#mkdir /data/nginx/logs
[11:22:57 root@nginx ~]#chown -R nginx: /data/
[11:20:23 root@nginx ~]#/apps/nginx/sbin/nginx -t
nginx: the configuration file /apps/nginx/conf/nginx.conf syntax is ok
nginx: configuration file /apps/nginx/conf/nginx.conf test is successful
```

### 8.3.3 重启nginx并访问php状态页

```bash
[11:23:41 root@nginx ~]#/apps/nginx/sbin/nginx 
[11:23:59 root@nginx ~]#ss -ntl
State     Recv-Q     Send-Q         Local Address:Port         Peer Address:Port    
LISTEN    0          128                  0.0.0.0:111               0.0.0.0:*       
LISTEN    0          128                  0.0.0.0:80                0.0.0.0:*       
LISTEN    0          128                  0.0.0.0:22                0.0.0.0:*       
LISTEN    0          128                     [::]:111                  [::]:*       
LISTEN    0          128                     [::]:22                   [::]:*
```

## 8.4 部署WordPress

### 8.4.1 部署WordPress

```bash
#php主机配置
[11:33:40 root@php ~]#cd /data/php/wordpress/
[11:36:00 root@php wordpress]#unzip wordpress-5.7-zh_CN.zip 
[11:36:19 root@php wordpress]#mv wordpress/* .
[11:36:32 root@php wordpress]#rm -rf wordpress*
[11:37:00 root@php wordpress]#chown -R www: /data/
```

### 8.4.2 访问web页面

![image-20210330113800727](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210330113800727.png)

注意如果出现这样的格式没有样式说明找不到样式文件，所以需要在nginx服务也部署wordpress包

```bash
[11:40:15 root@nginx ~]#unzip wordpress-5.7-zh_CN.zip 
[11:40:30 root@nginx ~]#mv wordpress/* /data/nginx/wordpress/
[11:40:40 root@nginx ~]#chown -R nginx: /data/
```

再次访问

![image-20210330114128110](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210330114128110.png)

之后进行wordpress初始化

初始化完成后,很多页面会访问不了应为nginx匹配规则有问题需改为以下规则，以下规则为静态资源有nginx自己处理，php文件由php-fpm服务器处理。

```bash
server{
    listen 80;
    server_name www.zhangzhuo.org;

    access_log  /data/nginx/logs/www.zhangzhuo.org.access.log  access_json;

    location /wp-admin/css {
        root /data/nginx/wordpress;
    }
    location /wp-admin/js {
        root /data/nginx/wordpress;
    }
    location /wp-includes/js {
        root /data/nginx/wordpress;
    }
    location /wp-content/themes/twentytwentyone/assets/css {
        root /data/nginx/wordpress;
    }
    location /wp-content/themes/twentytwentyone/assets/js {
        root /data/nginx/wordpress;
    }
    location /wp-admin/images {
        root /data/nginx/wordpress;
    }
    location /wp-content/themes/twentytwentyone/.*\.png {
        root /data/nginx/wordpress;
    }
    location /wp-content/themes/twentynineteen/.*\.png {
        root /data/nginx/wordpress;
    }
    location /wp-content/themes/twentytwenty/.*\.png {
        root /data/nginx/wordpress;
    }
    location /wp-includes/css {
        root /data/nginx/wordpress;
    }
    location /wp-content/themes/twentytwentyone/style.css {
        root /data/nginx/wordpress;
    }
    location /wp-content/uploads/ {
        root /data/nginx/wordpress;
    }
    
    location / {
        root /data/php/wordpress;
        fastcgi_pass 192.168.10.82:9000;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
    location /wp-admin {
        root /data/php/wordpress;
        fastcgi_pass 192.168.10.82:9000;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
        
    }
    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root html;
    }
}
```

配置完成后发布文章的图片会导致可以上传但是查看文章会显示找不到文件，由于上传动作由php服务器处理所以图片文件上传后存放在php服务器，所以需要把文件同步至nginx对应目录，以下为文件同步执行脚本，需下载sersync工具后匹配参数执行

```bash
[13:36:28 root@php wp-content]#cat sersync_ssh.sh 
#!/bin/bash
#
#********************************************************************
#Author:zhangzhuo
#QQ: 1191400158
#Date: 2021-03-11
#FileName：sersync_ssh.sh
#URL: https://www.zhangzhuo.ltd
#Description：The test script
#Copyright (C): 2021 All rights reserved
#********************************************************************
#安装包名称
tar_name='sersync2.5.4_64bit_binary_stable_final.tar.gz'
#安装位置
install_dir='/usr/local/sersync'
#要备份的目录,路径中的/加\进行转义
backup_dir='\/data\/php\/wordpress\/wp-content\/uploads'
#rsyncd服务器配置
rsyncd_ip='192.168.10.81'
rsyncd_root_pass='123456'
rsyncd_dir='\/data\/nginx\/wordpress\/wp-content\/uploads'

ssh(){
[ -f /root/.ssh/id_rsa ] || ssh-keygen -f /root/.ssh/id_rsa -P ''
rpm -q sshpass &>/dev/null || yum -y install sshpass
export SSHPASS=${rsyncd_root_pass}
sshpass -e ssh-copy-id -o StrictHostKeyChecking=no $rsyncd_ip
rpm -q pssh &>/dev/null || yum install -y pssh
pssh -H "${rsyncd_ip}" "rpm -q rsync  || dnf install -y rsync"
dir1=`echo "" | sed -rn "s/(.*)/\1${rsyncd_dir}/p"`
pssh -H "${rsyncd_ip}" "[ -d ${dir1} ] || mkdir -p ${dir1}"
}

install(){
[ -f $tar_name ] || { echo "sersync压缩包不存在" ;exit ;}
[ -d `echo "" | sed -rn "s/(.*)/\1${backup_dir}/p"` ] || mkdir `echo "" | sed -rn "s/(.*)/\1${backup_dir}/p"`
[ -d /usr/local/sersync ] || { tar xf ${tar_name};mv GNU-Linux-x86 /usr/local/sersync; }
echo "PATH=${install_dir}:'$PATH'" >/etc/profile.d/sersync.sh
rpm -q rsync &>/dev/null || dnf install -y rsync
cp ${install_dir}/confxml.xml ${install_dir}/confxml.xml.bak
}

set_xml(){
sed -ri "s/(.*<attrib start=\")false(\"\/>.*)/\1true\2/" ${install_dir}/confxml.xml
sed -ri "24s/(.*<localpath watch=\").*(\">.*)/\1${backup_dir}\2/" ${install_dir}/confxml.xml
sed -ri "25s/(.*<remote ip=\").*(\" name=\").*(\"\/>.*)/\1${rsyncd_ip}\2${rsyncd_dir}\3/" ${install_dir}/confxml.xml
sed -ri "s/(.*<ssh start=\").*(\"\/>.*)/\1true\2/" ${install_dir}/confxml.xml
}

ssh
install
set_xml
${install_dir}/sersync2 -dro ${install_dir}/confxml.xml && echo "同步服务已经启动" || echo "同步服务启动失败"
```

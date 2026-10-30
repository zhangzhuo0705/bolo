---
title: "7-软件管理"
date: 2021-05-17T11:42:21+08:00
lastmod: 2021-06-02T10:23:50+08:00
draft: false
description: "从软件包、ABI/API 与链接方式讲起，梳理 yum、apt 等包管理工具的使用。"
cover: "https://b3logfile.com/bing/20210220.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["Linux系统基础知识"]
tags: ["linux", "yum", "apt"]
toc: true
---
# 一、软件相关概念

## 1.1 软件相关概念

### 1.1.1 ABI

ABI：Application Binary Interface

Windows与Linux不兼容

* ELF(Executable and Linkable Format)
* PE(Portable Executable)

库级别的虚拟化：

* Linux：WINE
* Windows：Cygwin

### 1.1.2 API

系统级开发

* 汇编语言
* C
* C++

应用级开发

* java
* Python
* go
* php
* perl
* ruby
* bash

## 1.2 C语言程序的实现过程

C程序源代码——预处理——编译——汇编——链接

C语言的程序编译主要经过四个过程：

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-7fc0ccdb.png)

* 预处理：(Pre-Processing)

  * 将所有的#define删除，并且展开所有的宏定义
  * 处理所有的条件预编译指令，比如#if #ifdef #elif等
  * 处理#include预编译指令，将被包含的文件插入到该预编译指令的位置
  * 删除所有注释
  * 添加行号和文件标识，以便编译时产生调试用的行号及编译错误警告行号
  * 保留所有的#pragma编译器指令，因为编译器需要使用他们
* 编译(Compiling)
* 编译过程就是把预处理完的文件进行一系列的词法分析，语法分析，语义分析及优化后，最后生成相应的汇编代码
* 汇编(Assembling)
* 汇编器是将汇编代码转变成机器可以执行的命令，每一个汇编语句几乎都对应一条机器指令。汇编相对于编译过程比较简单，根据汇编指令和机器指令的对照表一 一翻译即可
* 链接（Linking）
* 通过调用链接器ld来链接程序运行需要的一大堆目标文件，以及所依赖的其他库文件，最后生成可执行文件

**范例：gcc编译过程**

```bash
#分步骤编译运行
[16:54:38 root@centos8 ~]#gcc -E hello.c -o hello.i   #对hello.c文件进行预处理，生成hello.i文件
[16:55:06 root@centos8 ~]#gcc -S hello.i -o hello.s   #对预处理文件进行编译，生成了汇编文件
[16:55:21 root@centos8 ~]#gcc -c hello.s -o hello.o   #对汇编文件进行编译，生成了目标文件
[16:55:51 root@centos8 ~]#gcc hello.o -o hello        #对目标文件进行链接，生成可执行文件

#一步实现编译过程
[16:56:26 root@centos8 ~]#gcc hello.c -o hello.exe
```

## 1.3 软件模块的静态和动态链接

链接主要作用是把各个模块之间相互引用的部分处理好，使得各个模块之间能够正确地链接，分为静态和动态链接

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-7346293f.png)

### 1.3.1 静态链接

* 把程序对应的依赖库复制一份到包
* 生成模块文件libxxx.a
* 嵌入程序包
* 升级难，需要重新编译
* 占用较多空间，迁移容易

### 1.3.2 动态链接

* 只把依赖加做一个动态链接
* 生成模块文件libxxx.so
* 连接指向
* 占用较少空间，升级方便

### 1.3.3 模块（库）文件

**查看二进制程序所依赖的库文件**

```bash
[19:26:20 root@ubuntu18-04 ~]#ldd  /bin/ls
	linux-vdso.so.1 (0x00007ffd39da2000)
	libselinux.so.1 => /lib/x86_64-linux-gnu/libselinux.so.1 (0x00007f3822eed000)
	libc.so.6 => /lib/x86_64-linux-gnu/libc.so.6 (0x00007f3822afc000)
	libpcre.so.3 => /lib/x86_64-linux-gnu/libpcre.so.3 (0x00007f382288a000)
	libdl.so.2 => /lib/x86_64-linux-gnu/libdl.so.2 (0x00007f3822686000)
	/lib64/ld-linux-x86-64.so.2 (0x00007f3823337000)
	libpthread.so.0 => /lib/x86_64-linux-gnu/libpthread.so.0 (0x00007f3822467000)
```

**管理及查看本机装载的库文件**

```bash
#加载配置文件中指定的库文件
[19:26:27 root@ubuntu18-04 ~]#ldconfig

#显示本机已经缓存的所有可用库文件名及文件路径映射关系
[19:27:44 root@ubuntu18-04 ~]#ldconfig -p
```

**配置文件**

```bash
/etc/ld.so.conf
/etc/ld.os.conf.d/*.conf
```

**缓存文件**

```bash
/etc/ld.so.cache
```

## 1.4 java程序编译运行过程

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-f2deaac6.png)

# 二、软件包和包管理器

## 2.1 软件包介绍

开源软件最初只提供.tar.gz的打包的源码文件，用户必须自己编译每个想在GNU/Linux上运行的软件。用户急需系统能够提供一种更加便利的方法来管理这些软件，当Debian诞生时，这样一个管理工具dpkg也就应运而生，可用来管理deb后缀的“包”文件。从而著名的“package”概念第一次出现在GNU/Linux系统中，稍后Red Hat才开发自己的rpm包管理系统

### 2.1.1 软件包中的文件分类

* 二进制文件
* 库文件
* 配置文件
* 帮助文件

**范例：利用cpio工具查看包文件列表**

```bash
rpm2cpio 包文件 | cpio -itv    预览包内文件
rpm2cpio 包文件 | cpio -id "*.conf" 释放包内文件
```

### 2.1.2 程序包管理器

软件包管理器功能：

将编译好的应用程序的各组成文件打包一个或几个程序包文件，利用包管理器可以方便快捷地实现程序包的安装、卸载、查询、升级和校验管理等操作

主流的程序管理器

* redhat：rpm文件，rpm包管理器
* debian：deb文件，dpkg包管理器

### 2.1.3 包命名

**源代码打包文件命名**

```bash
name-VERSION.tar.gz|bz2|xz
VERSION:major.minor.release
```

**rpm包命名方式**

```bash
name-VERSION-release.arch.rpm
VERSION:major.minor.relese
relese:release.OS
```

常见的arch

* x86：i386,i486,i586,i686
* x86_64:x64,x86_64,amd64
* powerpc:ppc
* 跟平台无关：noarch

### 2.1.4 分类和拆包

软件包为了管理和使用的便利，会将一个大的软件分类，放在不同的子包中。

包的分类：

* Application-VERSION-ARCH.rpm
* Application-devel-VERSION-ARCH.rpm
* Application-utils-VERSION-ARCH.rpm
* Application-libs-VERSION-ARCH.rpm

### 2.1.5 包的依赖

软件包之间可能存在依赖关系，甚至循环依赖，即：A包依赖B包，B包依赖C包，C包依赖A包

安装软件包时，会因为缺少依赖的包，而导致安装包失败

解决依赖包管理工具：

* yum：rpm包管理器的前端工具
* dnf：Fedora 18+ rpm包管理工具，Centos 8 版替代yum
* apt：deb包管理器前端工具
* zypper：suse上的rpm前端管理工具

### 2.1.6 程序包管理器相关文件

1. 包文件组成（每个包独有）
   1. 包内的文件
   2. 元数据，如：包的名称，版本，依赖性，描述等
   3. 可能会有包安装或卸载时运行的脚本
2. 数据库（公共）：/var/lib/rpm
   1. 程序包名称及版本
   2. 依赖关系
   3. 功能说明
   4. 包安装后生成的个文件路径及校验码信息

# 三、包管理器rpm

Centos系统上使用rpm命令管理程序包

**功能**

安装、卸载、升级、查询、校验、数据库维护

## 3.1 安装

**格式**

```bash
rpm {-i|--install} [install-options] PACKAGE_FILE...
```

**选项：**

```bash
-v：verbose
-vv：
-h：以#显示程序包管理执行进度
```

**常用组合：**

```bash
rpm -ivh PACKAGE_FILE ...
```

**rpm包安装[install-options]**

```bash
--test          测试安装，但不真正执行安装，即dry run模式
--nodeps        忽略依赖关系
--replacepkgs   重新安装
--nosignature:  不检查来源合法性
--nodigest:     不检查包完整性
--noscripts:    不执行程序包脚本
%pre：安装前脚本
%post:安装后脚本
%preun:卸载前脚本
%postun:卸载后脚本
```

## 3.2 升级和降级

**rpm包升级**

```bash
rpm {-U|--upgrade} [install-options] PACKAGE_FILE ...
rpm {-F|--freshen} [install-options] PACKAGE_FILE ...
```

**对应选项：**

```bash
upgrade：安装有旧版程序包，则升级，如果不存在旧程序包则安装。
freshen：安装有旧程序包，则升级，如果不存在旧版程序包，则不执行升级操作
--oldpackage   降级
--force：强制安装
```

**常用组合：**

```bash
rpm -Uvh PACJAGE_FILE ...
rpm -Fvh PACJAGE_FILE ...
```

升级注意项：

1. 不要对内核做升级操作；Linux支持多内核版本并存，因此直接安装新版本内核
2. 如果原程序包的配置文件安装后曾被修改，升级时，新版本提供同一个配置文件不会直接覆盖老版本的配置文件，而把新版本文件重命名后保留

## 3.3 包查询

```bash
rpm {-q|--query} [select-options] [query-options]

[select-options]
-a:
-f:
-p:

[query-options]
--changelog: 查询rpm包的changelog
-c:查询程序的配置文件
-d:查询程序的文档
-i:information
-l:查看指定的程序包安装后生成的所有文件
--scripts: 程序包自带的脚本

#和CAPABILITY相关
--whatprovides CAPABILITY:查询指定的CAPABILITY由那个包所提供
--whatrequires CAPABILITY：查询指定的CAPABILITY被哪个包所依赖
--provides:列出指定程序包所提供的CAPABILITY
-R:查询指定的程序包所依赖的CAPABILITY
```

**常用查询用法：**

```bash
rpm -qa
rpm -qi mysql-server-8.0.17-3.module_el8.0.0+181+899d6349.x86_64.rpm
rpm -qc mysql-server-8.0.17-3.module_el8.0.0+181+899d6349.x86_64.rpm
rpm -ql mysql-server-8.0.17-3.module_el8.0.0+181+899d6349.x86_64.rpm
rpm -qd mysql-server-8.0.17-3.module_el8.0.0+181+899d6349.x86_64.rpm
rpm -qf /etc/passwd
```

## 3.4 包卸载

**格式：**

```bash
rpm {-e|--erase} [--allmatches] [--nodeps] [--noscripts] [--notriggers] [--test] PACKAGE_NAME...
```

**注意：当包卸载时，对应的配置文件不会删除，以FILENAME.rpmsave形式保留**

**范例：强行删除rpm包，并恢复**

```bash
rmp -e rpm --nodeps

#重启进入rescue模式
mkdir /mnt/cdrom
mount /dev/sr0 /mnt/cdrom
rpm -ivh /mnt/cdrom/Packages/rpm-4.14.2-37.el8.x86_64 --root=/mnt/sysimage
reboot
```

## 3.5 包校验

在安装包时，系统也会检查包的来源是否是合法的

检查包的完整性和签名

```
rpm -K|--checksig rpmfile
```

在检查包的来源和完整性前，必须导入所需要公钥

范例：

```
rpm --import /etc/pki/rpm-gpg/RPM-GPG-KEY-Centos-7
rpm -qa "gpg-pubkey*"
```

软件在安装时，会将包里的每个文件的元数据，如：大小，权限，所有者，时间等记录至rpm相关的数据库中，可以用来检查包中的文件是否和当初安装时有所变化

```bash
rpm {-v|--verify} [select-options] [verify-options]
示例：
[20:29:10 root@localhost ~]#rpm -V centos-release
SM5....T.  c /etc/issue

S file size differs
M Mode deffers
5 digest(formerly MD5 sum)differs
D Device major/minor number mismatch
L readLink(2) path mismatch
U user ownership deffers
G Group ownership differs
T mtime differs
P capabilities differ
.(点) 表示当前位置的字符含义一致

c 所在位置表示文件类型

c 配置文件
d 文件数据文件
g 该文件不属于某个文件
l 许可证文件
r 自述文件
```

## 3.6 数据库

rpm包安装时生成的信息，都放在rpm数据库中，如果数据库数据丢失是恢复不了的。

```bash
/var/lib/rpm
```

可以重建数据库,但是内容不存在

```bash
rpm {--initdb|--rebuilddb}
initdb：初始化，如果事先不存在数据库，则新建之，否则，不执行任何操作
rebuilddb：重建已安装的包头的数据库索引目录
```

# 四、yum和dnf

Centos使用yum，dnf解决rpm的包依赖关系

YUM：Yellowdog Update Modifier，rpm的前端程序，可解决软件包相关依赖性，可在多个库之间定位软件包，up2date的替代工具，Centos8用dnf代替了yum，不过保留了和yum的兼容性，配置也是通用的

## 4.1 yum/dnf工作原理

**yum/dnf是基于C/S模式**

* yum服务器存放rpm包和相关包的元数据库
* yum客户端访问yum服务器进行安装或查询等

**yum实现过程**

先在yum服务器上创建yum repository（仓库），在仓库中事先存储了众多rpm包，以及包的相关的元数据文件（放置于特定目录repodata下），当yum客户端利用yum/dnf工具进行安装包时，会自动下载repodata中的元数据，查询元数据是否存在相关的包及依赖关系，自动从仓库中找到相关包下载并安装。

## 4.2 yum客户端配置

**yum客户端配置文件**

```bash
/etc/yum.conf                为所有仓库提供公共配置
/etc/yum.repos.d/*.repo      为每个仓库提供配置文件
```

**帮助参考： man 5 yum.conf**

**repo仓库配置文件指向的定义：**

```bash
[repositoryID]
name=Some name for this repository
baseurl=url://path/to/repository
enabled={1|0}
gpgcheck={1|0}
gpgkey=URL
enablegroups={1|0}
failovermethod={roundrobin|priority}
roundrobin:意为随机挑选，默认值
priority:按顺序访问
cost=    默认1000
```

**yum服务器的baseurl形式：**

```bash
file://   本地路径
http://
https://
ftp://
```

**注意：yum仓库指向的路径一定必须是repodata目录所在目录**

**相关变量**

```bash
yum的repo配置文件中的可用的变量：
$releasever:当前OS的发行版的主版号，如8，7，6
$arch:CPU架构，如：aarch64，i586,i686,x86_64等
$basearch:系统基础平台：i386,x86_64
$contentdir:表示目录，比如centos-8，centos-7
$YUM0-$YUM9 ：自定义变量

范例：
http://server/centos/$releasever/$basearch
```

**范例：Centos 配置文件**

```bash
[19:24:23 root@localhost ~]#vim /etc/dnf/dnf.conf
[main]
gpgcheck=1                        安装包前要做包的合法和完整性校验
installonly_limit=3               同时可以安装3个包，最小值为2，如设置为0或1，为不限制
clean_requirements_on_remove=True 删除包时，是否将不在使用的包删除
best=True                         升级时，自动选择安装最新版，即使缺少包的依赖
skip_if_unavailable=False
```

**baseurl指向的路径**

```bash
Centos系统yum源

阿里云 https://developer.aliyun.com/mirror/
华为云 https://mirrors.huaweicloud.com/
清华大学 https://mirrors.tuna.tsinghua.edu.cn/
```

**范例：为Centos8用系统安装光盘作本地yum仓库**

```bash
[19:32:05 root@localhost ~]#mkdir /mnt/cdrom
[19:32:34 root@localhost ~]#mount /dev/sr0 /mnt/cdrom
mount: /mnt/cdrom: WARNING: device write-protected, mounted read-only.
[19:36:09 root@localhost ~]#cat /etc/yum.repos.d/centos8.repo
[centos8]
name=centos8
baseurl=file:///mnt/cdrom/AppStream/
gpgcheck=0
enabled=1
[BaseOS]
name=baseos
baseurl=file:///mnt/cdrom/BaseOS/
gpgcheck=0
enabled=1
```

**注意：centos8与centos7不同有俩个yum源：BaseOS和AppStream**

### 4.2.1 yum-config-manager命令

可以生成yum仓库的配置文件及启用或禁用仓库，来自于yum-utils包

格式：

```bash
增加仓库
yum-config-manager -add-repo URL或file
禁用仓库
yum-config-manager --disable "仓库名"
启用仓库
yum-config-manager --enable "仓库名"
```

## 4.3 yum命令

**yum命令的用法：**

```bash
yum [options] [command] [package ...]
```

**yum的命令行选项：**

```bash
-y                         自动回答为yes
-q                         静默模式
--nogpgcheck               禁止进行gpg check
--enablerepo=repoidglob    临时启用此处指定的repo，支持通配符，如：“*”
--disablerepo=repoidglob   临时启用此处指定的repo，和上面语句同时使用，放在后面生效
```

### 4.3.1 显示仓库列表

```bash
yum repolist [all|enabled|disabled]
```

### 4.3.2 显示程序包

```bash
yum list
yum list [all|glob_exp1|glob_exp2] [...]
yum list {available|installed|updates} [glob_exp1] [...]
```

### 4.3.3 安装程序包

```bash
yum install package1 [package2] [...]
yum reinstall package1 [package2] [...] 重新安装

--downloadonly   只下载相关包默认至/var/cache/yum/x86_64/7目录下，而不执行
```

#### 4.3.3.1 安装epel源包

```bash
yum install epel-release
```

#### 4.3.3.2 升级安装卸载最新内核

范例：利用elrepo源在Centos7安装新版内核，只是安装新内核并不是直接升级之前的

```bash
http://www.elrepo.org，支持最新的内核和硬件相关包
1.进入网站找到自己系统版本的yum安装包进行安装
[19:28:46 root@centos7 ~]#yum install https://www.elrepo.org/elrepo-release-7.el7.elrepo.noarch.rpm
[19:29:31 root@centos7 ~]#ls /etc/yum.repos.d/
CentOS-Base.repo  elrepo.repo
安装完成后会在yum仓库生产一个新的yum源，进入配置文件禁用改为启用enabled=1

2.查看包信息
[19:35:04 root@centos7 ~]#yum list | grep elrepo-kernel
有俩种包分别是lt和ml推荐使用lt版本是稳定版，ml是测试版

3.安装
[19:42:18 root@centos7 ~]#yum install kernel-lt

4.重启电脑选择新内核启动系统
[19:45:05 root@centos7 ~]#uname -r
4.4.248-1.el7.elrepo.x86_64
```

**范例：卸载**

```bash
[19:46:35 root@centos7 ~]#rpm -e kernel-lt
[19:46:42 root@centos7 ~]#rpm -q kernel-lt
package kernel-lt is not installed
```

#### 4.3.3.3 只下载相关的依赖包，而不安装

```bash
/data/目录如果不存在，会自动创建
[20:12:09 root@localhost httpd]#yum -y install --downloadonly --downloaddir=/data/httpd httpd
```

### 4.3.4 卸载程序包

```bash
yum remove | erase package1 [package2] [...]
```

### 4.3.5 升级和降级

检查可用升级

```bash
yum check-update
```

升级和降级

```bash
yum upgrade|update [package1] [package2] [...]
upgrade-minimal  最小化升级
yum downgrade package1 [package2] [...]
```

### 4.3.6 查询

查看程序包information：

```bash
yum info [...]
```

查看指定的特性（可以是某文件）是有那个程序包所提供

```bash
yum provides | whatprovides feturel [feature2] [...]
```

**注意：文件要写全路径，而不只是文件名，否则可能无法查询到**

以指定的关键字搜索程序包名及summary信息

```bash
yum search string1 [string2] [...]
```

查看指定包所依赖的capabilities：

```bash
yum deplist package1 [package2] [...]
```

### 4.3.7 仓库缓存

清除目录/var/cache/yum/缓存

```bash
yum clean [packages | metadata|expire-cache|rpmdb|plugins|all]
```

构建缓存：

```bash
yum makecache
```

### 4.3.8 查看yum事务历史

yum执行安装卸载命令会记录到相关日志中

日志文件：

```bash
centos7
/var/log/yum.log

centos8
/var/log/dnf.rpm.log
/var/log/dnf.log
```

日志命令

```bash
yum history [info|list|packages-list|pacjages-info|summary|addon-info
redo|undo|rollback|new|sync|stats]
```

### 4.3.9 安装及升级本地程序包

```bash
yum localinstall|install rpmfile1 [rpmfile2] [...]
yum localupdate|update rpmfile1 [rpmfile2] [...]
```

### 4.3.10 查看包的安全警报

```bash
yum updateinfo --summary|--list|--info
```

### 4.3.11 包组管理的相关命令

```bash
yum grouplist [hidden] [groupwildcard] [...]
yum groupinstall group1 [group2] [...]
yum groupupdate group1 [group2] [...]
yum groupremove group1 [group2] [...]
yum groupinfo group1 [...]
```

### 4.3.12 实现私用yum仓库

下载所有yum仓库的相关包和meta数据

```bash
Centos8 dnf工具集成
dnf reposync --htlp   查看帮助

默认只下载rpm包，不下载meta数据，需要指定--download-metadata 才能下载meta
dnf reposync --repoid=REPOID --download-metadata -p /path
REPOID=仓库名称

Centos7以前版本，reposync工具来自于yum-utils包
reposync --repoid=ERPOID --download-metadata -p /path
```

**创建私有yum仓库：**

```bash
createrepo [options]
```

**范例：创建局域网的私有yum源**

```bash
1.仓库服务器配置
yum install -y  httpd                 安装apache服务或者ftp服务
vim /etc/httpd/conf/httpd.conf        修改文件改变默认的站点位置
DocumentRoot "改成自己包所在目录"
包的话可以使用上面的命令从阿里源或者其他厂商的公共源下载
dnf reposync，reposync        配置网上的yum然后下载包不下载元数据需要创建私有yum仓库
或者直接挂载磁盘镜像
systemctl start httpd                启动服务

2.客户端配置
[10:46:24 root@centos8 yum.repos.d]#cat Centos8.repo
[base]
name=base
baseurl=http://192.168.10.81/centos/8/base
gpgcheck=1
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-centosofficial
上面的这个是密钥gpgcheck如果是1需要添加密钥位置系统
默认安装后在/etc/pki/rpm-gpg/密钥有俩个official，testing分别是官方，测试
[extras]
name=extras
baseurl=http://192.168.10.81/centos/8/extras
gpgcheck=1
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-centosofficial
[AppStream]
name=AppStream
baseurl=http://192.168.10.81/centos/8/AppStream
gpgcheck=1
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-centosofficial
[epel]
name=epel
baseurl=http://192.168.10.81/centos/8/epel
gpgcheck=1
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-centosofficial

下载阿里源的epel源，制作私有yum源
[10:56:02 root@repo-server ~]#yum install epel-release   安装epel源

[10:56:46 root@repo-server ~]#reposync --repoid=epel -p /repo/centos/8/            下载
[10:57:50 root@repo-server ~]#reposync --repoid=epel-modular -p /repo/centos/8/    下载
epel需要下载网站的验证文件
[11:08:35 root@repo-server 8]#wget -P /repo/centos/8/epel/ https://mirrors.aliyun.com/epel/RPM-GPG-KEY-EPEL-8

制作私有镜像
createrepo /repo/centos/8/AppStream/    centos7只需要执行这个
下面的是centos8需要执行的
repo2module -s stable -d AppStream modules.yaml
modifyrepo_c --mdtype=modules modules.yaml AppStream/repodata/
```

### 4.3.13 DNF介绍

DNF，即DaNdiFied，是新一代的RPM软件包管理器。DNF发行日期是2015年5月11日，DNF包管理器采用python编写，发行许可为GPL v2，首先出现在Fedora18发行版中。在RHEL 8.0版本取代了YUM，DNF包管理器克服了YUM包管理器的一些瓶颈，提升了用户体验，内存占用，依赖分析，运行速度等。

配置文件：

```bash
/etc/dnf/dnf.conf
```

仓库文件：

```bash
/etc/yum.repo.d/*.repo
```

日志：

```bash
/var/log/dnf.rpm.log
/var/log/dnf.log
```

DNF使用帮助：man dnf

dnf用法与yum一致

**Centos7 使用dnf，下载并安装下面包**

```bash
可以直接配置阿里yum源安装
yum install -y dnf

也可以缓存下载安装
yum -y install --downloadonly --downloaddir=/data/dnf dnf
createrepo /data/dnf

[dnf]
name=dnf
baseurl=file:///data/dnf
gpgcheck=0
enabled=1
```

# 五、程序包编译

## 5.1 源码编译介绍

程序包编译安装：

源代码---预处理--编译---汇编---链接--执行

多文件：文件中的代码之间，很可能存在跨文件依赖关系

虽然有很多开源软件打成包，供人们使用，但并不是所有源代码都打成包，如果使用开源远程，可能需要自己下载源码，进行编译安装，另外即使提供了包，但是生产中需要用于软件的某些特性，仍需要自行编译安装。但是利用源代码编译安装是比较繁琐的，庆幸的是有相关的项目管理工具可大大减少编译过程的复杂度

## 5.2 开源程序的项目工具

* C、C++的源码编译：使用make项目管理器
  * configure脚本——Makefile.in——Makefile
  * 相关开发工具
    * autoconf：生产configure脚本
    * automake：生产Makefile.in
* java的源码编译：使用maven

## 5.4 C语言代码编译安装过程

利用编译工具，通常只需要三个大的步骤

* ./configure
  * 通过选项传递参数，指定安装路径、启用特性等；执行时会参与用户的指定以及Makefile.in文件生产Makefile
  * 检查依赖的外部环境，如依赖的软件包
* make 根据Makefile文件，会检测依赖的环境，进行构建应用程序
* make install 复制文件到相应路径

**注意：安装前可以通过查看README，INSTALL获取帮助**

### 5.4.1 编译安装准备

准备:安装相关的依赖包

* 开发工具：make，gcc
* 开发环境：开发库（glibc：标准库），头文件，可安装开发包组Development Tools
* 软件相关依赖包

**生产实践：基于最小化安装的系统建议安装下面相关包**

```bash
yum install gcc make autoconf gcc-c++ glibc glibc-devel pcre pcre-devel openssl openssl-devel systemd-devel zlib-devel vim lrzsz tree tmux lsof tcpdump whet net-tools itop bc bzip2 zip unzip nfs-utils man-pages
```

### 5.4.2 编译安装

**第一步：运行configure脚本，生产Makefile文件**

其选项主要功能：

* 可以指定安装位置
* 指定启用的特性

获取其支持使用的选项

```bash
./configure --help
```

选项分类：

* 安装路径设定：

  * --prefix=/PATH
  * --sysconfigdir=/PATH
  * System types:支持交叉编译
* 软件特性和相关指定
* Optioal Features：可选特性
* --disable-FEATURE
* --enable-FEATURE[=ARG]
* Optional Packages:可选包
* --with-PACKAGE[=ARG]  依赖包
* --without-PACKAGE         禁用依赖关系

注意：通常被编译操作的程序包，需要安装此程序包的“开发”组件，其包名一般类似于name-devel-VERSION

**第二步：make**

**第三步：make install**

### 5.4.3 安装后配置

**1.二进制程序目录导入至PATH环境变量中**

编辑文件/etc/profile.d/NAME.sh

```bash
exprot PATH=$PATH:/PATH
```

**2.相关用户及文件**

有些开源编译完成后，还需要创建相关的用户及文件

**3.导入帮助手册**

编辑/etc/man.config|man_db.conf文件，添加一个MANPATH

### 5.4.4 编译安装实战案例

#### 5.4.4.1 编译安装httpd

```bash
安装前准备：关闭防火墙和SELinux
1.安装相关包
[15:05:02 root@centos8 ~]#yum install gcc make autoconf apr-devel apr-util-devel pcre-devel openssl-devel redhat-rpm-config
[15:06:29 root@centos8 ~]#yum install bzip2

2.下载并解压缩包
[15:06:57 root@centos8 ~]#tar xvf httpd-2.4.46.tar.bz2 -C /usr/local/src/

3.配置
[15:07:29 root@centos8 ~]#cd /usr/local/src/httpd-2.4.46/
[15:14:20 root@centos8 httpd-2.4.46]# ./configure --prefix=/data/httpd --sysconfdir=/etc/httpd --enable-ssl

4.编译并安装
[15:15:07 root@centos8 httpd-2.4.46]#make -j 4 && make install

5.配置环境
[15:15:52 root@centos8 httpd-2.4.46]#echo 'export PATH=/data/httpd/bin/:$PATH' > /etc/profile.d/httpd.sh

6.运行
[15:22:01 root@centos8 ~]#apachectl start

7.指定用apache用户运行
[15:24:41 root@centos8 www]#useradd -r -s /sbin/nologin -d /var/www -c Apache -u 48 apache
User apache      找到修改
Group apache

8.配置生效和验证
[15:32:08 root@centos8 html]#apachectl restart

9.查看进程
[15:34:05 root@centos8 html]#ps aux

然后浏览器可以访问
```

# 六、Ubuntu软件管理

Debian软件包通常为预编译的二进制格式的扩展名.deb，类似rpm文件，因此安装快速，无需编译软件。包文件包括特定功能或软件所必须的文件、元数据和指令

* dpkg：package manager for Debian，类似于rpm，dpkg是基于Debian的系统的包管理器，可以安装，删除和构建软件包，但无法自动下载和安装软件包或其依赖
* apt：Advanced Packaging Tool,功能强大的软件管理工具，甚至可升级整个Ubuntu的系统，基于客户/服务器架构，类似于yum

## 6.1 APT工作原理

在服务器上先复制所有DEB包，然后用APT的分析工具genbasedir根据每个DEB   包的包头（Header） 信息对所有的DEB包进行分析，并将该分析结果记录在文件夹base内的一个DEB 索引清单文件中，一旦APT   服务器内的DEB有所变动，要使用genbasedir产生新的DEB索引清单。客户端在进行安装或升级时先要查询DEB索引清单，从而获知所有具有依赖关系的软件包，并一同下载到客户端以便安装。当客 户端需要安装、升级或删除某个软件包时，客户端计算机取得DEB索引清单压缩文件后，会将其解压置 放于 /var/cache/apt/，而客户端使用apt-get install或apt-get upgrade命令的时候，就会将这个文件夹内的数据和客户端计算机内的DEB数据库比对，知道哪些DEB已安装、未安装或是可以升级的

## 6.2 dpkg 包管理器

帮助参看：man dpkg

```bash
#安装包
dpkg -i package.deb

#删除包，不建议，不自动卸载依赖于它的包
dpkg -r package

#删除包（包括配置文件）
dpkg -P package

#列出当前已安装的包，类似rpm -qa
dpkg -l

#显示该包的简要说明，类似rpm –qi
dpkg -l package

#列出该包的状态，包括详细信息，类似rpm –qi
dpkg -s    package

#列出该包中所包含的文件，类似rpm –ql
dpkg -L package

#搜索包含pattern的包，类似rpm –qf
dpkg -S 

#配置包，-a 使用，配置所有没有配置的软件包
dpkg --configure package

#列出 deb 包的内容，类似rpm –qpl
dpkg -c package.deb

#解开 deb 包的内容
dpkg --unpack package.deb
```

**注意：一般建议不要使用dpkg卸载软件包。因为删除包时，其它依赖它的包不会卸载，并且可能无法再正常运行**

## 6.3 apt

Debian 使用apt 工具集来管理包系统，apt-get 是其中一个常用的命令行工具，另外一款较为流行的命令行与 GUI 兼顾的工具是 aptitude ，之前最常用的 Linux 包管理命令都被分散在了 apt-get、apt- cache 和 apt-config 这三条命令中

在 2014 年apt 命令发布第一个稳定版，Ubuntu 16.04 引入新特性之一便是 apt 命令，apt 命令解决了命令过于分散的问题，它包括 apt-get 命令出现以来使用最广泛的功能选项，以及 apt-cache 和 apt- config 命令中很少用到的功能。在使用 apt 命令时，用户不必再由 apt-get 转到 apt-cache 或 apt- config，提供管理软件包所需的必要选项

apt 相当于 apt-get、apt-cache 和 apt-config 中最常用命令选项的集合

apt  具有更精减但足够的命令选项，而且参数选项的组织方式更为有效。此外，启用的几个特性也非常有帮助。例如：可以在使用 apt 命令安装或删除程序时看到进度条,apt 还会在更新存储库数据库时提示用户可升级的软件包个数

apt 与 apt-get 有一些类似的命令选项，但它并不能完全向下兼容 apt-get 命令,也即可用 apt 替换部分

apt-get 系列命令，但不是全部

**apt 命令用法**

查看帮助：apt help

**apt与apt-get命令对比**

![image.png](https://b3logfile.com/file/2020/12/image-ada8b21d.png)
**apt 特有的命令**

```bash
apt list            列出包含条件的包（已安装，可升级等）
apt edit-sources    编辑源列表
```

**APT包索引配置文件**

```bash
/etc/apt/sources.list
/etc/apt/sources.list.d
```

**apt命令操作（如安装和删除软件包）日志文件**

```bash
/var/log/dpkg.log
```

范例：

```bash
#安装包：
apt install tree zip
#安装图形桌面
apt install  ubuntu-desktop

#删除包：
apt remove tree  zip
#说明：apt  remove中添加--purge选项会删除包配置文件，谨慎使用
#更新包索引，相当于yum clean all;yum makecache
apt update
#升级包：要升级系统，请首先更新软件包索引，再升级
apt upgrade

#apt列出仓库软件包，等于yum list
apt list
#搜索安装包
apt search nginx
#查看某个安装包的详细信息
apt show apache2

#在线安装软件包
apt install apache2

#卸载单个软件包但是保留配置⽂件
apt remove apache2

#删除安装包并解决依赖关系
apt autoremove apache2

#更新本地软件包列表索引，修改了apt仓库后必须执⾏
apt update

#卸载单个软件包删除配置⽂件
apt purge apache2

#升级所有已安装且可升级到新版本的软件包
apt upgrade

#升级整个系统，必要时可以移除旧软件包。
apt full-upgrade

#编辑source源⽂件
apt edit-sources

#查看仓库中软件包有哪些版本可以安装
apt-cache madison nginx

#安装软件包的时候指定安装具体的版本
apt install nginx=1.14.0-0ubuntu1.6
```

## 6.5 ubuntu建议安装的常用包

```bash
[root@ubuntu1804 ~]#apt install iproute2 ntpdate tcpdump telnet traceroute nfs- kernel-server nfs-common lrzsz tree openssl libssl-dev libpcre3 libpcre3-dev zlib1g-dev gcc openssh-server iotop unzip zip
```

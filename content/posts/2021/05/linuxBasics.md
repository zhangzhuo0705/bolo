---
title: "1-Linux基础"
date: 2021-05-17T11:25:35+08:00
lastmod: 2021-05-17T11:34:29+08:00
draft: false
description: "梳理 Linux 用户类型、终端设备与基础命令，帮助建立系统管理的基本认识。"
cover: "https://b3logfile.com/bing/20181202.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["Linux系统基础知识"]
tags: ["linux"]
toc: true
---
# 一、Linux 基础

## 1.1 用户类型

* root用户
  一个特殊的管理员账户
  也被称为超级用户
  root已接近完整的系统控制，对系统损害几乎有无限的能力
* 普通(非特权)用户
  除非必要，不要登录为root
  权限有限
  造成损害的能力比较有限

**是什么用户是由用户uid来决定 ，查看方法**

```bash
id -u
```

## 1.2 终端 terminal

### 1.2.1 终端类型

* 控制台终端：/dev/console
* 串行终端：/dev/ttys#
* 虚拟终端:tty: /dev/tty#
* 图形终端：startx,xwindows
* 伪终端：tpy:/dev/pts/# 如：ssh远程连接

### 1.2.2 查看当前终端设备：tty

**范例：**

```bash
[20:00:11 root@localhost ~]#tty
/dev/pts/0
```

### 1.2.3 查看所有的登录终端：who |   w

```bash
[20:14:12 root@localhost ~]#who
root     pts/0        2020-11-25 08:37 (192.168.10.1)
root     pts/1        2020-11-25 20:14 (192.168.10.1)

w命令也能看到其他终端在做什么！！
[20:14:15 root@localhost ~]#w
 20:14:38 up 11:40,  2 users,  load average: 0.05, 0.03, 0.05
USER     TTY      FROM             LOGIN@   IDLE   JCPU   PCPU WHAT
root     pts/0    192.168.10.1     08:37    6.00s  4.11s  0.00s w
root     pts/1    192.168.10.1     20:14   28.00s  0.02s  0.02s -bash
```

## 1.3 交互式接口

交互式接口：启动终端后，在终端设备附加一个交互式应用程序

### 1.3.1 交互式接口类型

* GUI：Graphic User Interface
  * X protocol，window manager，desktop
  * Desktop：
  * NOME（C，图形库gtk）
  * KDE（C++，图形库qt）
  * XFCE（轻量级桌面）
* CLI：Command Line Interface
  * **shell程序**

### 1.3.2 什么是shell

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-4171ecae.png)

Shell是Linux系统的用户界面，提供了**用户与内核进行交互操作的一种接口**。它接收用户输入的命令并把他送入内核去执行
shell也被称为LINUX的命令解释器（command interpreter）
shell也是一种高级程序设计语言

### 1.3.3 各种Shell

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-603e73f7.png)

* sh：Steve Bourne
* **bash：Bourne-Again Shell，GPL，CentOS和Ubuntu默认使用**
* csh：c shell，C语言风格
* tcsh
* ksh：Korn Shell，AIX 默认 shell
* zsh：MacOS默认shell

### 1.3.4 bash shell

GNU Bourne-Again Shell（bash）是GNU计划中重要的工具软件之一，目前也是Linux标准的shell，与sh兼容
显示当前使用的shell

```bash
[20:26:04 root@localhost ~]#echo $SHELL
/bin/bash
```

显示当前系统支持的所有shell

```bash
[20:44:22 root@localhost ~]#cat /etc/shells 
/bin/sh
/bin/bash
/usr/bin/sh
/usr/bin/bash
```

## 1.4 设置主机名

```bash
hostname NAME     这个是一个临时修改主机名命令，重启计算机后会失效

Centos7，8  Ubuntu久修改主机名
hostnamectl set-hostname zhangzhuo-mage-10.11-centos7
执行完成这个命令他的存储文件在/etc/hostname中

Centos6包括之前版本永久修改主机名去/etc/sysconfig/network中修改

hostname -I       可以显示当前主机IP地址
```

**注意：主机名不要使用下划线，有可能导致一些服务报错。但支持横线。**

## 1.5 命令提示符

**命令提示符：prompt**
范例：

```bash
[root@zhangzhuo-mage-10 ~]#
#管理员
$普通用户
~用户家目录
```

修改提示符格式，提示符有PS1系统变量来决定，如果要永久修改需要写到文件中。

```bash
[09:19:35 root@zhangzhuo-mage-10 ~]#PS1="\[\e[1;32m\][\[\e[0m\]\t \[\e[1;33m\]\u\[\e[36m\]@\h\[\e[1;31m\] \W\[\e[1;32m\]]\[\e[0m\]\\$"
临时修改
```

## 1.6 执行命令

### 1.6.1 命令执行过程

输入命令后回车，由shell程序找到键入命令所对应的可执行程序或代码，并由其分析后提交给内核分配资源将其运行起来。
**命令的执行的优先级：1 别名      2内部      3 hash      4 $PATH      5 command not found**
**只要在前面的选项中找到你要执行的命令，后面的选项就不会在寻找了。**

### 1.6.2 shell中可执行的俩种命令

* 内部命令：由shell自带的，而且通过某命令形式提供，**开机之后由于shell在后台运行所有内部命令大多都常驻在内存中。要比外部命令执行要快**
* 外部命令：在文件系统路径下有对应的可执行程序文件，**存放在系统变量PATH中的路径中。**

**区别指定的命令是内部或外部命令**

```bash
type -a COMMAND-a 显示所有作用如果一个命令既是外部命令也是内部使用type只会显示他为内部命令加-a可以显示系统中所有的echo命令
```

#### 1.6.2.1 内部命令相关

* help 内部命令列表
* enable 管理内部命令
  * enbale cmd 启用内部命令
  * enbale -n cmd 禁用内部命令
  * enable -n 查看所有禁用的内部命令

#### 1.6.2.2 执行外部命令

查看外部命令路径

```bash
which      显示外部命令的路径whereis    显示外部命令的路径和命令相关的文档
```

**Hash缓存表**
系统开机后hash表为空，当外部命令执行时，默认会从PATH路径下寻找该命令，找到后会将这条命令的路径记录到hash表中，当再次使用该命令时，shell解释器首先会查看hash表，存在将执行，如果不存在，将回去PATH路径下寻找，利用hash缓存表可大大提高命令的调用速率。
**hash 命令常见用法**

* hash    显示hash缓存
* hash -l   显示hash缓存，可作为输入使用
* hash -p  path name   将命令全路径path起别民为name
* hash -t   打印缓存中name的路径
* hash -d name 清除name缓存
* hash -r 清除缓存

### 1.6.3 命令别名

对于经常执行的较长的命令，可以将其定义成较短的别名，以方便执行
**显示当前shell进程所有可用的命令别名**

```bash
alias
```

**定义别名NAME，其相当于执行命令VALIUE**

```bash
alias NAME='VALUE'    重启系统之后失效永久定义可以写到~/.bashrc目录中，登录这个用户生效，所有用户生效需要写到/etc/bashrc中格式为：写道文件最后格式为 alias rm='rm -i'配置文件修改后不会立即生效可以退出终端重新进入或者使用source重新读取下文件source ~/.bashrc
```

**撤销别名**

```bash
unalias name-a   取消所有别名
```

**如果别名同原命令同名，如果要执行原命令，可使用**

```bash
\rm
```

### 1.6.4 命令格式

```bash
COMMAND [OPTIONS...] [ARGUMENTS...]
```

**选项**：用于启用或关闭命令的某个或某些功能
**参数**：命令的作用对象，比如：文件名，用户名
**注意**：

* **多个选项以及参数和命令之间使用空白字符分割**
* **取消和结束命令执行：Ctrl+c，Ctrl+d**
* **多个命令可以用";"符号分开**
* **一个命令可以用\分成多行**

## 1.7 常见命令

### 1.7.1 常见命令

#### 1.7.1.1 硬件信息查看

查看cpu

```bash
lscpucat /proc/cpuinfo
```

查看内存信息

```bash
free -hcat /proc/meminfo
```

查看磁盘信息

```bash
lsblkcat /proc/partitions
```

#### 1.7.1.2 软件信息查看

查看系统版本

Centos以上版本和ubuntu

```bash
cat /etc/os-release
```

Centos6

```bash
cat /etc/redhat-release
```

查看内核信息

```bash
uname -r
```

### 1.7.2 日期和时间

Linux的俩种时钟

* 系统时钟：由Linux内核通过CPU的工作频率进行的
* 硬件时钟： 主板

相关命令

* date 显示和设置系统时间
  * 参数：
    * %F 显示年月日
    * %T 显示时分秒
    * -d 可以用来显示过去的时间

范例：

```bash
date +%sdate -d @1509536033[17:21:34 root@zhangzhuo-mage-10 ~]#date +%F2020-11-26[17:21:48 root@zhangzhuo-mage-10 ~]#date +%T17:23:41#显示前一天前一小时的时间，相对于现在[11:15:22 root@centos8 ~]#date -d '-1 days -1 hours' +%F-%T2021-01-04-10:15:23days   天数hours  时间#设置时间[13:53:49 root@centos8 ~]#date -s "2020-01-04 1:29:50"
```

* **clock,hwclock:显示硬件时钟**
  * **-s,--hctosys 以硬件时钟为准，校正系统时间**
  * **-w,--systohc 以系统时钟为准，校正硬件时间**

范例：

```bash
[14:49:35 root@centos7 ~]#ll /usr/sbin/clocklrwxrwxrwx. 1 root root 7 Nov 27 20:09 /usr/sbin/clock -> hwclock
```

**时区：**

```bash
/etc/localtime     本机时区存放在这里如果要重新设置时区所有时区存放在/usr/share/zoneinfo/目录下设置中国时区ln -s -f /usr/share/zoneinfo/Asia/Shanghai /etc/localtimetimedatectl set-timezone Asia/Shanghai
```

**显示日历：**

```bash
cal -y
```

### 1.7.3 关机重启

关机：

* halt
* poweroff

重启：

* reboot
  * -f：强制，不调用shutdown
  * -p：切断电源

关机或重启：shutdown

```bash
shutdown [OPTIONS].. [TIME] [MESSAGE]-r:reboot-h:halt-c:cancelTIME:无指定，默认相当于+1（centos7）    now：立刻    +#：相对于时间表示发，几分钟后    hh:mm:绝对时间表示，指具体时间最后可以跟提示时间
```

### 1.7.4 输入信息

echo  命令可以将后面跟的字符进行输出
功能：显示字符，echo会将输入的字符串送往标准输出。输出的字符串间以空白字符隔开，并在最后加上换行号

语法：

```bash
echo [-neE] [字符串]-E 默认不支持\解释功能-n 不自动换行-e 启用\字符的解释功能
```

**显示变量**

```bash
echo "$VAR_NAME"   变量会替换，弱引用 ""echo '$VAR_NAME'   变量不会替换，强引用 ''
```

启用命令选择-e,若字符串出现一下字符，则特别加以处理，而不会把他当成一般文字输出

```bash
\a      发出警告声\b      退格键\c      最后不加上换行符\e      escape，相当于\033\n      换行\r      回车\t      插入tab\       插入\字符\0nnn   插入nnn(八进制)所代表的ASCII\xHH    插入HH（十六进制）所代表的ASCII数字
```

## 1.8 字符集和编码

### 1.8.1 ASCII码

ascii查看

```bash
yum install man-pages       查看没有的话安装这个man 7 ascii
```

### 1.8.2 Unicode编码

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-357bd5e4.png)

```bash
[16:09:27 root@centos8 ~]#echo $LANG       现在系统所使用的语言en_US.UTF-8
```

**注意：如果一个文件储存的时候使用的什么编码方式，到打开时也得使用相同的编码方式，才可以正确的显示文档的内容，不然就会出现乱码。**

## 1.9 命令行扩展和被括起来的集合

### 1.9.1 命令行扩展：$()  和 ```COMMAND` ``

把一个命令的输出打印给另一个命令的参数，**里面一定要放有输出结果的命令**。

``$(hostname)  `hostname` ``

范例：

```bash
[16:03:53 root@zhangzhuo-mage-10 ~]#echo $(hostname)zhangzhuo-mage-10.11-centos7[17:20:37 root@zhangzhuo-mage-10 ~]#echo `hostname`zhangzhuo-mage-10.11-centos7
```

**结论：**

```bash
单引号：强引用什么都不认识，任何东西都会识别为字符串双引号：弱引用可以识别变量，不能识别命令。反向单引号：里面必须是能执行的命令且有输出信息，变量和命令都识别。命令进行执行后返回的内容在交给引用反向单引号的命令执行。
```

### 1.9.2 括号扩展： { }

可以实现打印重复字符的简化形式
范例：

```bash
[17:33:00 root@zhangzhuo-mage-10 ~]#echo file{1..5}file1 file2 file3 file4 file5[17:44:36 root@zhangzhuo-mage-10 ~]#echo file{1,3}file1 file3[17:48:30 root@zhangzhuo-mage-10 ~]#echo {A..Z}A B C D E F G H I J K L M N O P Q R S T U V W X Y Z[17:49:58 root@zhangzhuo-mage-10 ~]#echo {a..z}a b c d e f g h i j k l m n o p q r s t u v w x y z[17:50:28 root@zhangzhuo-mage-10 ~]#echo {1..100..5}1 6 11 16 21 26 31 36 41 46 51 56 61 66 71 76 81 86 91 96[17:45:54 root@zhangzhuo-mage-10 ~]#echo file{1..5}.{txt,log}file1.txt file1.log file2.txt file2.log file3.txt file3.log file4.txt file4.log file5.txt file5.log
```

## 1.10 命令行历史

保存你输入的命令历史。可以用它来重复执行命令
登录shell时，会读取命令历史文件中记录下的命令~/.bash_history
登录进shell后新执行的命令只会记录在缓存中；这些命令会在用户退出时“追加”支历史文件中
命令：history

```bash
参数：-c:清空命令历史n:显示最近的n条记录-a:追加本次会话新执行的命令到历史文件HISTTIMEFORMAT="%F %T `whoami` "   设置历史记录带日期时间
```

# 二、获取帮助

**获取帮助的能力决定了技术的能力**
多层次的帮助

* whatis
* command --help
* man and info
* /user/share/doc/
* Red Hat documentation
* 其他网站搜索

## 2.1 whatis

whatis使用数据库来显示命令的简短描述
刚安装后不可立即使用，需要制作数据库

```bash
#Centos 7 版本之后mandb#Centos 6 版本之前makewhatis
```

范例：

```bash
[18:51:41 root@zhangzhuo-mage-10 ~]#whatis rmrm (1)               - remove files or directories
```

## 2.2 查看命令的帮助

内部命令：

* help COMMAND
* man bash

外部命令和软件：

* COMMAND --help 或 COMMAND -h
* 使用手册（manual）

man COMMAND

* 信息页

info COMMAND

* 程序自身的帮助文档

README

INSTALL

ChangeLog

* 程序官方文档

官方站点

* 发行版的官方文档
* （7）Google

## 2.3 --help 或 -h选项

显示用法总结和参数列表，使用的大多数并非所有的
范例：

```bash
[19:01:20 root@zhangzhuo-mage-10 ~]#date --helpUsage: date [OPTION]... [+FORMAT]or:  date [-u|--utc|--universal] [MMDDhhmm[[CC]YY][.ss]]Display the current time in the given FORMAT, or set the system date.
```

格式说明：

```bash
[ ]表示可选项CAPS或<>表示变化的数据...表示一个列表x|y|z的以上是“x”或“y”或“z”-abc 的意思是-a -b -c{ }表示分组
```

范例：

```bash
1.显示当前时间，格式2016-06-18 10:20:30date +%F\ %T2.显示今天星期几date +%u3.设置当前日期为2019-08-07 06:05:10date -s "2019-08-07 06:05:10"
```

## 2.4 man命令

man提供命令帮助的文件，手册页存放在/usr/share/man
几乎每个命令都有man的“页面”
中文man需要安装包man-pages-zh-CN
man页面分组为不同的“节章”，统称为Linux手册，man 1 man

* 1：用户命令
* 2：系统调用
* 3：C库调用
* 4：设备文件及特殊文件
* 5：配置文件格式
* 6：游戏
* 7：杂项
* 8：管理类命令
* 9：Linux内核API

man命令的配置文件：

```bash
#Centos 6 之前版 man 的配置文件/etc/man.config#Centos 7 之后版 man 的配置文件/etc/man_db.conf#ubuntu man 的配置文件/etc/manpath.config
```

格式：

```bash
MANPATH /PATH/TO/SOMEWHERE
```

也可以指定位置下搜索COMMAND命令的手册页并显示

```bash
man -M /PATH/TO/SOMEWHERE COMMAND
```

查看手册页

```bash
man [章节] keyword
```

man 帮助段落说明

* NAME 名称及简要说明
* SYNOPSIS 用法格式说明
* `[ ] `可选内容
* <> 必选内容
* a | b 二选一
* { } 分组
* ...同一内容可出现多次
* DESCRIPTION 详细说明
* OPTIONS 选项说明
* EXAMPLES 示例
* FILES 相关文件
* AUTHOR 作者
* COPYRIGHT 版本信息
* REPORTING BUGS bug信息
* SEE ALSO 其他帮助参考

列出所有帮助

```bash
man -a passwd
```

搜索man手册

```bash
列出所有匹配的页面，使用whatis 数据库man -k passwd相当于whatis
```

打印man帮助文件的路径

```bash
man -w [节章] passwd[20:19:50 root@zhangzhuo-mage-10 ~]#man -w 1 passwd/usr/share/man/man1/passwd.1.gz
```

**man命令的操作方法：使用less命令实现**

## 2.5 info

info 命令格式

```bash
info [命令]
```

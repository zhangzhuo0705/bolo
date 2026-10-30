---
title: "2-Linux文件管理和IO重定向"
date: 2021-05-17T11:32:23+08:00
draft: false
description: "梳理 Linux 目录结构、文件类型与 IO 重定向，说明常用文件管理命令的用法。"
cover: "https://b3logfile.com/bing/20200115.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["Linux系统基础知识"]
tags: ["linux"]
toc: true
---
# 一、文件系统目录结构

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-bb2eab06.png)

## 1.1 文件系统的目录结构

* 文件和目录被组织成一个单根倒置树结构
* 文件系统从根目录下开始，用“/”表示
* 跟文件系统（rootfs）：root filesystem
* 标准Linux文件系统（如：ext4），文件名称大小写敏感，例如：MAIL，Mail
* 以 . 开头的文件为隐藏文件
* 路径分割的 /
* 文件名最长255个字节
* 包括路径在内的文件名称最长4095个字节
* 蓝色-->目录     绿色-->可执行文件   红色-->压缩文件   浅蓝色-->链接文件   灰色-->其他文件
* 除了斜杆和NULL，所有字符都有效，但使用特殊字符的目录名和文件不推荐使用，有些字符需要用引号来引用
* 每个文件都有俩类相关数据：元数据：metadata，即属性，数据：data，即文件内容

Linux的文件系统分层结构：FHS Filesystem Hierarchy Standard

参考文档：https://www.pathname.com/fhs/

## 1.2常见的文件系统目录功能

```bash
/boot:引导文件存放目录，内核文件（vmlinuz）、引导加载器（bootloader，grub）都存放于此目录
/bin:所有用户使用的基本命令;不能关联至独立分区，OS启动即会用到的程序
/sbin:管理类基本命令;不能关联至独立分区，OS启动即会用到的程序
/lib:启动时程序依赖的基本共享库文件以及内核模块文件(/lib/modules)
/lib64:专用于x86_64系统上的辅助共享库文件存放位置
/etc:配置文件目录
/home/USERNAME:普通用户家目录
/root:管理员的家目录
/media:便携式移动设备挂载点
/mnt:临时文件系统挂载点
/dev:设备文件即特殊文件存放位置
          b:blocak device
          c:character device,线性访问
/opt:第三方应用程序安装位置
/srv:系统上运行的服务用到的数据
/tmp:临时文件存储位置
/usr:universal sgared,read-only data
	bin:保证系统拥有完整功能而提供的应用程序
	sbin:
	lib:32位使用
	lib64:只存在64位系统
	include:C程序的头文件(header files)
	share:结构化独立的数据，例如doc，man等
	local:第三方应用程序的安装位置
		bin,sbin,lib,lib64,etc,share
/var:variable data files
	cache:应用程序缓存数据目录
	lib:应用程序状态信息数据
	local:专用于为/usr/local下的应用程序存储可变数据
	lock:锁文件
	log:日志目录即文件
	opt:专用于为/opt下的应用程序存储可变数据
	run:运行中的进程相关数据，通常用于存储进程pid文件
	spool:应用程序数据池
	tmp:保存系统俩次重启直接产生的临时数据
/proc:用于输出内核与进程信息相关的虚拟文件系统
/sys:用于输出当前系统上硬件设备相关信息虚拟文件系统
/selinux:security enhanced Linux，selinux相关的安全策略等信息的存储位置
```

## 1.3 应用程序的组成部分

```bash
二进制程序:/bin,/sbin,/usr/bin,/usr/sbin,/usr/local/bin,/usr/local/sbin
库文件:/lib,/lib64,/usr/lib,/usr/lib64,/usr/local/lib,/usr/local/lib64
配置文件:/etc,/etc/DIRECTORY,/usr/local/etc
帮助文件:/usr/share/man,/usr/share/doc,/usr/local/share/man,/usr/local/share/doc
```

## 1.4 CentOS 7以后版本目录结构变化

* /bin和/usr/bin
* /sbin和/usr/sbin
* /lib和/usr/lib
* /lib64和/usr/lib

**范例：**

```bash
#centos7
[10:16:16 root@zhangzhuo-mage-10 ~]#ll /bin /sbin /lib /lib64
lrwxrwxrwx. 1 root root 7 Nov 22 12:50 /bin -> usr/bin
lrwxrwxrwx. 1 root root 7 Nov 22 12:50 /lib -> usr/lib
lrwxrwxrwx. 1 root root 9 Nov 22 12:50 /lib64 -> usr/lib64
lrwxrwxrwx. 1 root root 8 Nov 22 12:50 /sbin -> usr/sbin
```

## 1.5 Linux下文件类型

* `-` 普通文件
* d 目录文件directory
* b 块设备block
* c 字符设备character
* l 符号链接文件link
* p 管道文件pipe
* s 套接字文件socket

**范例：**

```
[15:00:58 root@localhost ~]#ls -l /run/
total 24
-rw-r--r--.  1 root   root      4 Nov 25 08:34 auditd.pid
drwxr-xr-x.  2 root   root     80 Nov 25 14:18 blkid
drwxr-x---.  2 chrony chrony   80 Nov 25 08:34 chrony
drwxr-xr-x.  2 root   root     40 Nov 25 08:34 console
-rw-r--r--.  1 root   root      4 Nov 25 08:34 crond.pid
----------.  1 root   root      0 Nov 25 08:34 cron.reboot
drwx------.  2 root   root     40 Nov 25 08:34 cryptsetup
drwxr-xr-x.  2 root   root     60 Nov 25 08:34 dbus
prw-------.  1 root   root      0 Nov 25 14:42 dmeventd-client
```

# 二、文件操作命令

## 2.1 显示当前工作目录

每个shell和系统进程都有一个当前的工作目录CWD:current work directory
每个当前shell CWD的绝对路径
pwd命令:printing working directory

* -P 显示真实物理路径
* -L 显示链接路径（默认）

**范例：**

```bash
[10:36:48 root@zhangzhuo-mage-10 ~]#pwd
/root
[10:36:50 root@zhangzhuo-mage-10 ~]#cd /bin
[10:36:58 root@zhangzhuo-mage-10 bin]#pwd
/bin
[10:36:59 root@zhangzhuo-mage-10 bin]#pwd -P
/usr/bin
```

## 2.1 显示当前工作目录

每个shell和系统进程都有一个当前的工作目录CWD:current work directory
每个当前shell CWD的绝对路径
pwd命令:printing working directory

* -P 显示真实物理路径
* -L 显示链接路径（默认）

**范例：**

```
[10:36:48 root@zhangzhuo-mage-10 ~]#pwd
/root
[10:36:50 root@zhangzhuo-mage-10 ~]#cd /bin
[10:36:58 root@zhangzhuo-mage-10 bin]#pwd
/bin
[10:36:59 root@zhangzhuo-mage-10 bin]#pwd -P
/usr/bin
```

## 2.2相对路径和绝对路径

* 绝对路径
  * 以正斜杆/即根目录开始
    * 完整的文件的位置路径
    * 可用于任何想指定一个文件名的时候
* 相对路径名
  * 不以斜线开始
    * 一般情况下，是指相对于当前工作的路径，特殊场景下，是相对于某目录的位置
    * 可以作为一个简短的形式指定一个文件名

基名：basename
目录名：dirname

**范例：**

```bash
取出路径中的最后文件名称
[16:20:06 root@localhost ~]#basename /etc/sysconfig/network
network
取出路径除最后文件名称的路径
[16:20:23 root@localhost ~]#dirname /etc/sysconfig/network
/etc/sysconfig
```

## 2.3 更改目录

命令 cd: change directory 改变目录
选项：-P 切换至物理路径，而非软连接目录
可以使用绝对或相对路径
切换至父目录：                   cd..
切换至当前用户目录：         cd
切换至以前的工作目录：      cd -

**范例：**

```bash
[10:40:46 root@zhangzhuo-mage-10 bin]#cd /etc/sysconfig/
[10:40:52 root@zhangzhuo-mage-10 sysconfig]#pwd
/etc/sysconfig
[10:40:54 root@zhangzhuo-mage-10 sysconfig]#cd ../../opt
[10:41:10 root@zhangzhuo-mage-10 opt]#pwd
/opt
[10:41:11 root@zhangzhuo-mage-10 opt]#cd /bin/
[10:41:19 root@zhangzhuo-mage-10 bin]#pwd
/bin
[10:41:21 root@zhangzhuo-mage-10 bin]#cd -P /bin/
[10:41:28 root@zhangzhuo-mage-10 bin]#pwd
/usr/bin
```

相关环境变量

* PWD：当前目录路径
* OLDPWD：上一次目录路径

**范例：**

```bash
[10:43:02 root@zhangzhuo-mage-10 bin]#pwd
/usr/bin
[10:43:29 root@zhangzhuo-mage-10 bin]#cd
[10:43:31 root@zhangzhuo-mage-10 ~]#echo $OLDPWD
/usr/bin
[10:43:42 root@zhangzhuo-mage-10 ~]#cd -
/usr/bin
```

## 2.4 列出目录列表

ls命令可以列出当前目录的内容或指定目录
用法：

```bash
ls [options] [files_or_dirs]
```

常用选项

```bash
-a 包含隐藏文件
 -l 显示额外的信息
 -R 目录递归
 -ld 目录和符号链接信息
 -1 文件分行显示
 -S 按从小到大排序
 -t 按mtime 排序
 -u 配合-t选项，显示并按atime从新到旧排序
 -U 按目录存放顺序显示
 -X按文件后缀排序
 -F 对不同类型文件显示时附加不同的符号：*/=>@|
 -C 文件多时，以多列的方式显示文件，默认一列（标准输出）
```

说明：
ls查看不同后缀文件时的颜色由/etc/RIR_COLORS和@LS_SOLORS变量指定

范例：

```bash
cat /etc/DIR_COLORS
tar 01;31
123 .tgz 01;31
124 .arc 01;31
echo $LS_COLORS
rs=0:di=01;34:ln=01;36:mh=00:pi=40;33:so=01;35:do=01;35:bd=40;33;01:cd=40;3
```

**范例：别名ll**

```bash
[10:54:23 root@zhangzhuo-mage-10 ~]#alias ll
alias ll='ls -l --color=auto'
```

## 2.5 查看文件状态stat

文件相关信息：metadata,data
每个文件都有三个时间戳：
access time 访问时间，atime，  读取内容
modify time  修改时间，mtime， 改变文件内容（数据）
change time 改变时间，ctime，  元数据发生改变

```bash
[10:57:42 root@zhangzhuo-mage-10 ~]#stat /etc/passwd
File: ‘/etc/passwd’
Size: 932       	Blocks: 8          IO Block: 4096   regular file
Device: fd00h/64768d	Inode: 16781304    Links: 1
Access: (0644/-rw-r--r--)  Uid: (    0/    root)   Gid: (    0/    root)
Context: system_u:object_r:passwd_file_t:s0
Access: 2020-11-26 19:27:46.451554095 +0800
Modify: 2020-11-26 19:27:46.432554091 +0800
Change: 2020-11-26 19:27:46.438554092 +0800
Birth: -
```

## 2.6 确定文件内容

文件可以包含多种类型的数据，使用file命令检查文件的类型，然后确定适当的打开命令或应用程序使用
格式：

```bash
file [options] ... <filename>...
```

常用选项：

* -b 列出文件辨识结果时，不显示文件名称
* -f filelist 列出文件filelist中中文名的文件类型
* -F 使用指定分割符号替换输出文件名后默认的":"分割符
* -L 查看对应软连接对应文件的文件类型

范例：

```bash
[11:03:54 root@zhangzhuo-mage-10 ~]#file 123
123: ASCII text
[11:04:09 root@zhangzhuo-mage-10 ~]#file zz
zz: data
```

## 2.7 文件通配符模式

通配符可以用来匹配符合条件的多个文件，方便批量管理文件
通配符采用特定的符号，表示特定的含义，此特定的符号成为元meta字符

常见的通配符如下：

```bash
*        匹配零个或多个字符，但不匹配“.”开头的文件，即隐藏文件
？       匹配任何单个字符
~        当前用户家目录
~zhang   用户zhang家目录
~+和.    当前目录
~-       前一个工作目录
[0-9]    匹配数字范围
[a-z]    字母
[A-Z]    字母
[wang]   匹配列表中任何一个字符
[^wang]  匹配列表中所有字符以外的字符
[^]      排除字符
```

另外还有在Linux系统中预定义的字符类

```bash
[:digit:] 任意数字，相当于0-9
[:lower:] 任意小写字母，表示a-z
[:upper:] 任意大写字母，表示A-Z
[:alpha:] 任意大小写字母
[:alnum:] 任意数字或字母
[:blank:] 水平空白字符
[:space:] 水平或垂直空白字符
[:punct:] 标点符号
[:print:] 可打印字符
[:cntrl:] 控制（非打印）字符
[:graph:] 图形字符
[:xdigit:] 十六进制字符
```

**范例：**

```bash
[17:03:13 root@localhost ~]#touch file{a..z}.txt file{A..Z}.txt file{1..9}.txt
[17:04:03 root@localhost ~]#ll file[0-9].txt
-rw-r--r--. 1 root root 0 Nov 25 17:03 file1.txt
-rw-r--r--. 1 root root 0 Nov 25 17:03 file2.txt
-rw-r--r--. 1 root root 0 Nov 25 17:03 file3.txt
-rw-r--r--. 1 root root 0 Nov 25 17:03 file4.txt
-rw-r--r--. 1 root root 0 Nov 25 17:03 file5.txt
-rw-r--r--. 1 root root 0 Nov 25 17:03 file6.txt
-rw-r--r--. 1 root root 0 Nov 25 17:03 file7.txt
-rw-r--r--. 1 root root 0 Nov 25 17:03 file8.txt
-rw-r--r--. 1 root root 0 Nov 25 17:03 file9.txt
```

## 2.8 创建空文件和刷新时间

touch命令可以用来创建空文件或刷新文件的时间

格式

```bash
touch [option]... FILE...
```

选项说明：

* -a   仅改变atime和ctime
* -m  仅改变mtime和ctime
* -t [[CC]YY]MMDDhhmm[.ss] 指定atime和mtime的时间戳
* -c 如果文件不存在，则不予创建

范例：

```bash
[11:11:31 root@zhangzhuo-mage-10 ~]#touch f1.txt
[11:11:34 root@zhangzhuo-mage-10 ~]#ll
total 0
-rw-r--r--. 1 root root 0 Nov 27 11:11 f1.txt
[11:11:36 root@zhangzhuo-mage-10 ~]#ll /etc/issue
-rw-r--r--. 1 root root 23 Oct 23 22:53 /etc/issue
[11:12:14 root@zhangzhuo-mage-10 ~]#touch /etc/issue
[11:12:25 root@zhangzhuo-mage-10 ~]#ll
total 0
-rw-r--r--. 1 root root 0 Nov 27 11:11 f1.txt
[11:12:26 root@zhangzhuo-mage-10 ~]#stat /etc/issue
File: ‘/etc/issue’
Size: 23        	Blocks: 8          IO Block: 4096   regular file
Device: fd00h/64768d	Inode: 16822955    Links: 1
Access: (0644/-rw-r--r--)  Uid: (    0/    root)   Gid: (    0/    root)
Context: system_u:object_r:etc_t:s0
Access: 2020-11-27 11:12:25.592192867 +0800
Modify: 2020-11-27 11:12:25.592192867 +0800
Change: 2020-11-27 11:12:25.592192867 +0800
Birth: -
[11:12:40 root@zhangzhuo-mage-10 ~]#date
Fri Nov 27 11:13:15 CST 2020
[11:13:15 root@zhangzhuo-mage-10 ~]#touch `date -d "-1 day" +%F_%T`.log
[11:13:54 root@zhangzhuo-mage-10 ~]#ls
2020-11-26_11:13:54.log  f1.txt
[11:13:57 root@zhangzhuo-mage-10 ~]#touch $(date -d "1 year" +%F_%T).log
[11:14:33 root@zhangzhuo-mage-10 ~]#ls
2020-11-26_11:13:54.log  2021-11-27_11:14:33.log  f1.txt
```

## 2.9 复制文件和目录

利用cp(copy)命令可以实现文件或目录的复制

格式

```bash
cp [option]... [-T] SOURCE DEST
cp [option]... SOURCE... DIRECTOPY
cp [option]... -t DIRECTORY SOURCE...
```

常用选项

* -i  如果目标已存在，覆盖前提示是否覆盖
* -n 不覆盖，注意俩者顺序
* -r，-R 递归复制目录及内部的所有内容
* -a 归档，相当于-dr --preserv=all，常用于备份功能
* -d 不复制原文件，只复制连接名
* --preserv[=ATTR_LIST]
  
  * mode：权限
  * ownership：属住属组
  * .....
  * all所有
* -p 等同于--preserv=mode,ownership,timestamp
* -v --verbose
* -f --force
* -u --update 只复制源比目标更新文件或目录不存在的文件
* -b 目标存在，覆盖前先备份，默认形式为 `filename ~`只保留最近的一个备份
* --backup=numbered目标存在，覆盖前先备份加数字后缀，形式为filename.~#~，可以保留多个版本

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-2644abee.png)

范例：

```bash
[11:30:13 root@zhangzhuo-mage-10 ~]#cp /etc/issue /opt/issue_wang.bak
-rw-r--r--. 1 root root 23 Nov 27 11:30 issue_wang.bak
-rw-r--r--. 1 root root 23 Nov 27 11:12 /etc/issue
[11:35:39 root@zhangzhuo-mage-10 ~]#cp -p /etc/issue ~
[11:35:47 root@zhangzhuo-mage-10 ~]#ll /etc/issue /root/issue
-rw-r--r--. 1 root root 23 Nov 27 11:12 /etc/issue
-rw-r--r--. 1 root root 23 Nov 27 11:12 /root/issue
[11:35:55 root@zhangzhuo-mage-10 ~]#cp /etc/sysconfig/ /root/
cp: omitting directory ‘/etc/sysconfig/’
[11:36:49 root@zhangzhuo-mage-10 ~]#cp -r /etc/sysconfig/ /root/
[11:36:57 root@zhangzhuo-mage-10 ~]#ll
drwxr-xr-x. 6 root root 4096 Nov 27 11:36 sysconfig
[11:37:11 root@zhangzhuo-mage-10 ~]#cp -b /etc/mtab /root/issue
cp: overwrite ‘/root/issue’? y
[11:38:51 root@zhangzhuo-mage-10 ~]#ll
-r--r--r--. 1 root root 2357 Nov 27 11:38 issue
-rw-r--r--. 1 root root   23 Nov 27 11:12 issue~
[11:38:58 root@zhangzhuo-mage-10 ~]#cp --backup=numbered /etc/issue /root/issue
cp: overwrite ‘/root/issue’? y
[11:40:27 root@zhangzhuo-mage-10 ~]#cp --backup=numbered /etc/issue /root/issue
cp: overwrite ‘/root/issue’? y
[11:40:29 root@zhangzhuo-mage-10 ~]#cp --backup=numbered /etc/issue /root/issue
cp: overwrite ‘/root/issue’? y
[11:40:31 root@zhangzhuo-mage-10 ~]#ll
-r--r--r--. 1 root root 2357 Nov 27 11:38 issue.~1~
-rw-r--r--. 1 root root   23 Nov 27 11:40 issue.~2~
-rw-r--r--. 1 root root   23 Nov 27 11:40 issue.~3~
[11:42:10 root@zhangzhuo-mage-10 ~]#cp /dev/zero /root/zero.bak
^C
[11:42:30 root@zhangzhuo-mage-10 ~]#ll
-rw-r--r--. 1 root root 372346880 Nov 27 11:42 zero.bak
```

**范例：一些文件是直接cp不了的，必须加-a**

```bash
[11:42:10 root@zhangzhuo-mage-10 ~]#cp /dev/zero /root/zero.bak
^C
[11:42:30 root@zhangzhuo-mage-10 ~]#ll
-rw-r--r--. 1 root root 372346880 Nov 27 11:42 zero.bak
```

## 2.10 移动和重命名文件

mv命令可以实现文件或目录的移动和改名
同一分区移动数据，速度很快：数据位置没有变化
不同分区移动数据，速度相对较慢：数据位置发生了变化

格式

```bash
mv [option]... [-T] SOURCE DEST
mv [option]... SOURCE... DIRECTORY
mv [option]... -L DIRECTORY SOURCE...
```

常用选项

* -i 交互式
* -f 强制
* -b 目标存在，覆盖前先备份

**利用rename可以批量修改文件名**

格式：

```bash
rename [options]   ...
```

范例

```bash
[11:50:08 root@zhangzhuo-mage-10 ~]#touch file{1..10}.bak
[11:50:28 root@zhangzhuo-mage-10 ~]#ls
file10.bak  file2.bak  file4.bak  file6.bak  file8.bak
file1.bak   file3.bak  file5.bak  file7.bak  file9.bak
[11:50:29 root@zhangzhuo-mage-10 ~]#
#去掉所有bak后缀
[11:50:29 root@zhangzhuo-mage-10 ~]#rename '.bak' '' file*
[11:51:22 root@zhangzhuo-mage-10 ~]#ls
file1  file10  file2  file3  file4  file5  file6  file7  file8  file9
#修改文件名称
[11:51:23 root@zhangzhuo-mage-10 ~]#rename 'file' 'zhang' file*
[11:52:52 root@zhangzhuo-mage-10 ~]#ls
zhang1  zhang10  zhang2  zhang3  zhang4  zhang5  zhang6  zhang7  zhang8  zhang9
```

## 2.11 删除文件

使用rm命令可以删除文件
注意：此命令非常危险，慎重使用，建议使用mv代替rm

格式：

```bash
rm [option]... FILE...
```

常用选项：

* -i  交互式
* -f 强制删除
* -r 递归
* --no-preserve 删除/

范例：

```bash
[11:58:53 root@zhangzhuo-mage-10 ~]#ls
zhang1  zhang10  zhang2  zhang3  zhang4  zhang5  zhang6  zhang7  zhang8  zhang9
[11:58:55 root@zhangzhuo-mage-10 ~]#rm -fv *
[11:59:05 root@zhangzhuo-mage-10 ~]#ls
[12:02:51 root@centos8 ~]#ls
-f
[12:02:54 root@centos8 ~]#rm -f
[12:02:58 root@centos8 ~]#ls
-f
[12:03:00 root@centos8 ~]#rm ./-f
rm: remove regular empty file './-f'? ^C
[12:03:13 root@centos8 ~]#rm /root/-f
rm: remove regular empty file '/root/-f'? ^C
```

**rm虽然删除了文件，但是被删除的文件仍然可能被恢复，在安全要求较高的场景下，可以使用shred安全删除文件**

shred格式：

```bash
shred [option]... FILE...
```

常见选项：

* -z 最后一次覆盖添加0，以隐藏覆盖操作
* -v 能够显示操作进度
* -u 覆盖后截断并删除文件
* -n # 指定删除文件内容的次数（默认值是3次）

范例：

```bash
[14:12:14 root@zhangzhuo-mage-10 ~]#shred -zvun 5 fstab
shred: fstab: pass 1/6 (random)...
shred: fstab: pass 2/6 (000000)...
shred: fstab: pass 3/6 (random)...
shred: fstab: pass 4/6 (ffffff)...
shred: fstab: pass 5/6 (random)...
shred: fstab: pass 6/6 (000000)...
shred: fstab: removing
shred: fstab: renamed to 00000
shred: 00000: renamed to 0000
shred: 0000: renamed to 000
shred: 000: renamed to 00
shred: 00: renamed to 0
shred: fstab: removed
[14:12:29 root@zhangzhuo-mage-10 ~]#ls fstab
ls: cannot access fstab: No such file or directory
```

## 2.12 目录操作

### 2.12.1 显示目录数tree

常见选项：

* -d 只显示目录
* -L level:指定显示的层级数目
* -P pattern:只显示由指定wild-card pattern匹配到的路径。

### 2.12.2 创建目录mkdir

常见选项：

* -p:存在于不报错，且可自动创建所需要的各目录
* -v:显示详细信息
* -m MODE:创建目录时直接指定权限

### 2.12.3 删除空目录 rmdir

常见选项

* -p 递归删除父空目录
* -v 显示详细信息

**注意：rmdir只能删除空目录，如果想删除非空目录，可以使用rm -r命令，递归删除目录树**

范例：

```bash
alias rm='DIR=/data/backup`date +F%T`'; mkdir $DIR;mv -t $DIR
实现功能为rm不在是删除而是把文件移动，执行rm会在/data/创建一个backup+当前日期时间的文件夹
把你要删除的文件或目录放到这里
```

# 三、文件元数据和节点表结构

## 3.1 inode表结构

每个文件的属性信息，比如：文件的大小，时间，类型等，称为文件的元数据（meta data）。此元数据是存放在inode（index node）表中。node表中由很多条记录组成，第一条记录对应的存放了一个文件的元数据信息。

**每一个node表保存了一下信息：**

* inode number 节点号
* 文件类型
* 权限
* UID
* GID
* 链接数
* 该文件的大小和不同的时间戳
* 指向磁盘上文件的数据块指针
* 有关文件的其他数据

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-9df579b0.png)

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-7fe507e0.png)

**目录是一个特殊文件，目录文件的内容保存了此目录中文件的列表及inode number对应关系**

* 文件引用一个是inode号
* 人是通过文件名来应用一个文件
* 一个目录是目录下的文件名和文件inode号之间的映射

**inode表和目录**

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-b8ba463b.png)

**命令和inode**

cp命令：

* 分配一个空闲的inode号，在inode表中生成新条目
* 在目录中创建一个目录项，将名称于inode编号关联
* 拷贝数据生产新的文件

rm命令：

* 链接数递减，从而释放的inode号可以被重用
* 把数据块放在空闲列表中
* 删除目录项
* 数据实际上不会马上被删除，但当另一个文件使用数据块时将覆盖

mv命令

* 如果mv命令的目标和源在相同的文件系统，作为mv命令
  * 用新的文件名创建对应新的目录项
  * 删除旧目录条目对应的旧的文件名
  * 不影响inode表(除时间戳)或磁盘上的数据位置：没有数据被移动。
* 如果目标和源在一个不同额文件系统，mv相当于cp和rm

**范例：删除大文件**

**作用为有时一个文件正在被其他用户使用，你删除的话并不会立即释放空间使用这个可以立即释放空间。**

```bash
不要直接删除文件请执行下面的命令清空文件内容以达到释放空间的目的
cat /dev/null > /var/log/huge.log
```

**范例：面试题**

```bash
inode号使用完毕后和硬盘空间使用完毕后创建文件都会提示没有空间。
#硬盘空间满了的情况
[14:42:03 root@centos8 ~]#df -h /boot/
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1       976M  118M  791M  13% /boot
[14:42:10 root@centos8 ~]#cp /dev/zero /boot/zhang/txt
[14:42:43 root@centos8 ~]#df -h /boot/
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1       976M  960M     0 100% /boot
[14:44:38 root@centos8 boot]#mkdir f1
mkdir: cannot create directory ‘f1’: No space left on device
创建空文件是可以的
[14:44:45 root@centos8 boot]#touch f1

#inode编号使用完毕的情况
[14:45:55 root@centos8 boot]#df -h /boot/
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1       976M  118M  791M  13% /boot
[14:46:01 root@centos8 boot]#df -i /boot/
Filesystem     Inodes IUsed IFree IUse% Mounted on
/dev/sda1       65536   309 65227    1% /boot
[14:46:07 root@centos8 boot]#touch zhang/f{1..65227}.txt
[14:46:34 root@centos8 boot]#df -i /boot/
Filesystem     Inodes IUsed IFree IUse% Mounted on
/dev/sda1       65536 65536     0  100% /boot
[14:46:48 root@centos8 boot]#mkdir zhangzhuo
mkdir: cannot create directory ‘zhangzhuo’: No space left on device
[14:46:58 root@centos8 boot]#touch 1f
touch: cannot touch '1f': No space left on device
```

## 3.2 硬(hard)链接

硬链接本质上就是给一个文件起一个新的名称，实质是同一个文件。

硬链接特性

* 创建硬链接会在对应的目录中增加额外的记录项以引用文件
* 对应于同一文件系统上一个物理文件
* 每个目录引用相同的inode号
* 创建时连接数递增
* 删除文件时：rm命令递减计数的链接，文件要存在，至少有一个链接数，当链接数为零时，该文件被删除
* 不能跨越驱动器或分区
* 不支持对目录创建硬链接

格式：

ln filename [linkname]

## 3.3 符号symbolic(或软soft)链接

一个符号链接指向另一个文件，就像windows中快捷方式，软链接文件和原文件本质上不是同一个文件

**软链接特点**

* 一个符号链接的内容是他引用文件的名称
* 可以对目录创建软链接
* 可以跨分区的文件实现
* 指向的是另一个文件的路径；其大小为指向的路径字符串的长度；不增加或减少目标文件inode的引用数
* 软链接如果使用相对路径，是相对与原文件的路径，而非相对于当前目录

格式：

```bash
ln -s filename [linkname]
```

范例：

```bash
绝对路径
ln -s /zhangzhuo/ /root/zhangzhuo

相对路径
ln -s ../opt/zhangzhuo /root/zhang

查看链接文件指向的原文件
[17:45:48 root@localhost zhang]#readlink /root/zhang
../opt/zhangzhuo
```

## 3.4 硬链接与软连接区别

1.本质

硬链接：本质是同一个文件
软连接：本质不是同一个文件

2.跨设备

硬链接：不可以跨设备
软连接：可以跨设备

3.inode

硬链接：相同
软连接：不同

4.链接数

硬链接：创建新的硬链接，链接数会增加，删除硬链接，链接数减少
软连接：创建或删除，链接数不会变化

5.文件夹

硬链接：不支持
软连接：支持

6.相对路径

硬链接：原始文件相对路径是相对于当前工作目录
软连接：元素文件的相对路径是相对于链接文件的相对路径

7.删除源文件

硬链接：只是链接数减一，但链接文件的访问不受影响
软连接：链接文件无法访问

8.文件类型

硬链接:和源文件相同
软连接：链接文件，和源文件无关

9.文件大小

硬链接：和源文件相同
软连接：源文件路径的长度

# 四、IO重定向和管道

## 4.1 标准输入输出

程序：指令+数据

* 读入数据：Input
* 输出数据：Output

打开的文件都有一个df：file descriptor（文件描述符）
Linux给程序提供三种I/O设备

* 标准输入（STDIN）     -0   默认接受来自终端窗口的输入
* 标准输出（STDOUT） -1   默认输出到终端窗口
* 标准错误（STDERR） -2    默认输出到终端窗口

**范例：文件描述符**

```bash
[15:21:52 root@zhangzhuo-mage-10 ~]#ll /dev/std*
lrwxrwxrwx. 1 root root 15 Nov 27 08:56 /dev/stderr -> /proc/self/fd/2
lrwxrwxrwx. 1 root root 15 Nov 27 08:56 /dev/stdin -> /proc/self/fd/0
lrwxrwxrwx. 1 root root 15 Nov 27 08:56 /dev/stdout -> /proc/self/fd/1
[15:23:07 root@zhangzhuo-mage-10 ~]#ll /proc/self/fd/*
lrwx------. 1 root root 64 Nov 27 15:23 /proc/self/fd/0 -> /dev/pts/0
lrwx------. 1 root root 64 Nov 27 15:23 /proc/self/fd/1 -> /dev/pts/0
lrwx------. 1 root root 64 Nov 27 15:23 /proc/self/fd/2 -> /dev/pts/0
```

## 4.2 I/O重定向redirect

I/O重定向:将默认的输入，输出或错误对应的设备改变，指向新的目标

### 4.2.1 标准输出和错误重新定向

STDOUT和STDERR可以被重新定向到指定文件，而非默认的当前终端

格式：

```bash
命令 操作符号 文件名
```

支持的操作符号包括：

```bash
1> 或 >   把STDOUT重定向到文件
2>        把STDERR重定向到文件
&>        把标准输出和错误都重定向
> &       和上面一样，建议使用上面
```

以上如果文件已存在，文件内容会被覆盖

```bash
set -C   禁止将内容覆盖已有文件，单可追加，利用>| 仍可强制覆盖
set +C   允许覆盖，默认
```

追加

`>>` 可以在原有内容基础上，追加内容

把输入和错误重定向追加到文件

```bash
>> 追加标准输出重定向至文件
>> 2>>   追加标准错误重定向至文件
```

标准输入和错误输出各自指向不同位置

```bash
COMMAND > /path/to/file.out 2> /path/to/error.out
```

合并标准输出和错误输出为同一个数据流进行重定向

```bash
&>   覆盖重定向
&>>  追加重定向
COMMAND > /path/to/file.out 2>&1 (顺序很重要)
COMMAND >> /path/to/file.out 2>&1
```

合并多个程序

```bash
(CMD1;CMD2)或{CMD1;CMD2;....;}  合并多个程序的STDOUT
```

范例：重定向到别的终端

```bash
[15:47:29 root@zhang ~]#ls / >/dev/pts/1
```

范例：标准错误重定向

```bash
[15:47:37 root@zhang ~]#rm zhang 2>/zhang
[15:49:09 root@zhang ~]#cat /zhang
rm: cannot remove ‘zhang’: No such file or directory
```

范例：合并多个命令的结果至一个文件中

```bash
[15:49:19 root@zhang ~]#(ls /dev/ ; ls / ; ls /etc/) >all
[15:50:40 root@zhang ~]#{ ls / ; hostname;} >all
```

范例：清除大文件

```bash
[15:51:43 root@zhang ~]#cat /dev/null > all
[15:52:58 root@zhang ~]#cat /dev/null > all >zz
```

### 4.2.2 标准输入重定向

从文件中导入STDIN，代替当前终端的输入设备，使用<来重定向标准输入
某些命令能够从文件中导入的STDIN

#### 4.2.2.1 tr 命令

```bash
tr [option].. SET1 [SET2]
```

选项

* -d --delete：删除所有属于第一字符集的字符
* -s --squeeze-repeats：把连续重复的字符已单独一个字符表示，即去重
* -t --truncate-setl：将第一个字符集对应字符转换为第二个字符集对应的字符
* -c -C --complement:取字符集的补集

**范例：**

```bash
#把/etc/issue中的小写字母都转换为大写字母
[16:01:06 root@zhang ~]#tr 'a-z' 'A-Z'
```

#### 4.2.2.2 标准输入重定向

利用“<”可以将标准输入重定向，要给需要标准输入的程序才可以正常使用。

比如：

```bash
[16:01:52 root@zhang ~]#cat >file
mage
wang
zhang
^C
[16:07:06 root@zhang ~]#cat < file >file1
[16:07:25 root@zhang ~]#cat < file >>file1
[16:07:28 root@zhang ~]#cat file1
mage
wang
zhang
mage
wang
zhang
```

#### 4.2.2.3 把多行重定向

使用"<<"终止词命令把键盘多行重定向给STDIN，直到终止词位置之前的所有文本都发送给STDIN，有时被称为就地文本(here documents)
其中终止词可以是任何一个或多个符号，比如：！@ # EOF等等，其中EOF使用较多

范例：

```bash
[16:12:12 root@zhang ~]#cat  zhang
> zhuo
> 1111
> 222
> 333
> EOF
> [16:12:54 root@zhang ~]#cat file3
> zhang
> zhuo
> 1111
> 222
> 333
```

## 4.3 管道

### 4.3.1 管道

管道(使用符号“|”表示)用来连接多个命令

格式：

```bash
CMD1 | CMD2 | CMD3 | ...
```

功能说明：

* 将命令1的STDOUT发送给命令2的STDIN，命令2的STDOUT发送到命令3的STDIN
* 所有命令会在当前shell进程的子shell进程中执行
* 组合多种工具的功能

注意：STDERR默认不能通过管道转达，可利用2>&1 或 |& 实现，格式如下：

```bash
CMD1 2>&1 | CMD2
CMD1 |& CMD2
```

范例：

```bash
[16:19:02 root@zhang ~]#df | tr -s ' '
Filesystem 1K-blocks Used Available Use% Mounted on
devtmpfs 485936 0 485936 0% /dev
tmpfs 497848 0 497848 0% /dev/shm
tmpfs 497848 7844 490004 2% /run
tmpfs 497848 0 497848 0% /sys/fs/cgroup
/dev/mapper/centos-root 17811456 1656248 16155208 10% /
/dev/sda1 1038336 163692 874644 16% /boot
tmpfs 99572 0 99572 0% /run/user/0
```

范例：

```bash
[16:19:12 root@zhang ~]#ls /data/ /xxxx | tr 'a-z' 'A-Z'ls: cannot access /xxxx: No such file or directory/DATA/:[16:19:54 root@zhang ~]#ls /data/ /xxx 2>&1 | tr 'a-z' 'A-Z'LS: CANNOT ACCESS /XXX: NO SUCH FILE OR DIRECTORY/DATA/:[16:20:29 root@zhang ~]#ls /data/ /xxx  |& tr 'a-z' 'A-Z'LS: CANNOT ACCESS /XXX: NO SUCH FILE OR DIRECTORY/DATA/:
```

范例：

```bash
[16:21:29 root@zhang ~]#passwd --stdin zhang
Changing password for user zhang.
magedu
passwd: all authentication tokens updated successfully.
[16:43:33 root@zhang ~]#setenforce 0
[16:44:23 root@zhang ~]#passwd --stdin wang /dev/null
```

### 4.3.2 tee命令

利用tee命令可以重定向到多个目标，经常配合管道符一起使用

格式：

```bash
CMD1 | tee [-a] FILENAME | CMD2
```

以上可以把命令1的STDOUT保存在文件中，作为命令2的输入

选项：

* -a 追加

功能：

* 保存不同阶段的输出
* 复杂管道的故障排除
* 同时查看和记录输出

范例：

```bash
[16:49:01 root@zhang ~]#echo {1..100} | tr ' ' + |bc
5050
[16:49:56 root@zhang ~]#seq -s + 1 100 | bc
5050
[16:50:28 root@zhang ~]#echo {1..100..2} | tr ' ' + |bc
2500
[16:52:47 root@zhang ~]#seq -s + 1 2 100 | bc
2500
```

范例：

```bash
[16:54:33 root@zhang ~]#cat < zhangzhuo
> zhnagzhuo
> EOF
> zhangzhuo
> zhnagzhuo
```

## 4.4 重定向中的 - 符号

重定向时有时会使用 - 符号

范例：
将/home里面的文件打包，但打包的数据不是记录到文件，而是传送到stdout，经过管道后，将tar -cvf - /hemo 传送给后面的tar -xvf -，后面的这个 - 则是取前一个命令的stdout，因此，就不需要使用临时file了

```bash
tar -cvf - /home | tar -xvf -
```

# 其他：邮件服务

```bash
邮件服务安装
yum install postfix
yum install mailx
启动邮件服务
systemctl restart postfix
配置邮件服务在/etc/mail.rc 文件中添加自己的信息如下
set from=zz15049236211@163.com
set smtp=smtp.163.com
set smtp-auth-user=zz15049236211@163.com
set smtp-auth-password=
发邮件
[17:17:28 root@centos8 ~]# mail -s "hellp" 1191400158@qq.com
ssss
ssss
nihao
你号是   是  是 搜索是是是是
```

用户邮件存放位置：创建用户会自动在此目录下创建用户邮件文件，删除用户时不加-r选项是不会删除此目录下用户对应的文件。

```bash
[17:08:26 root@centos8 mail]#ll /var/spool/mail/
```

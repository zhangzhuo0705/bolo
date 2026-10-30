---
title: "6-文件查找和打包压缩"
date: 2021-05-17T11:41:08+08:00
draft: false
description: "对比 locate 与 find 的查找方式，并介绍 tar、压缩和打包的常用操作。"
cover: "https://b3logfile.com/bing/20190113.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["Linux系统基础知识"]
tags: ["linux"]
toc: true
---
# 一、文件查找

在文件系统上查找符合条件的文件

文件查找：

* 非实时查找(数据库查找):locate
* 实时查找：find

## 1.1 locate

* locate查询系统上预建的文件索引数据库/var/lib/mlocate/mlocate.db
* 索引的构建是在系统较为空闲时自动进行（周期性任务），执行updatedb可以更新数据库
* 索引构建过程需要遍历整个根文件系统，很消耗资源
* locate和updatedb命令来自于mlocate包

工作特点：

* 查找快速
* 模糊查找
* 非实时查找
* 搜索的是文件的全路径，不仅仅是文件名
* 可能只搜索用户具备读取和执行权限的目录

**格式：**

```bash
locate [OPTION]... [PATTERN]...
```

**常用选项**

```bash
-i 不区分大小写的搜索
-n N只列举前N个匹配项目
-r 使用基本正则表达式
```

**范例：**

```bash
#搜索名称或路径中包含conf的文件
[10:15:54 root@centos8 ~]#locate conf
使用regex来搜索以“.conf”结尾的文件
[10:16:57 root@centos8 ~]#locate -r "\.conf$"
```

**范例：构建locatedb数据库**

```bash
[10:18:41 root@centos8 ~]#updatedb
[10:18:54 root@centos8 ~]#ll /var/lib/mlocate/mlocate.db
-rw-r----- 1 root slocate 2158809 Dec 10 10:18 /var/lib/mlocate/mlocate.db
```

**注意：文件新创建和删除，无法马上更新locate数据库**

## 1.2 find

find是实时查找工具，通过遍历指定路径完成文件查找

工作特点：

* 查找速度略慢
* 精确查找
* 实时查找
* 查找条件丰富
* 可能只搜索用户具备读取和执行权限的目录

**格式：**

```bash
find [OPTION]... [查找路径] [查找条件] [处理动作]
```

查找路径：指定具体目标路径；默认为当前目录

查找条件：指定的查找标准，可以文件名、大小、类型、权限等标准进行；默认为找出指定路径下的所有文件

处理动作：对符合条件做操作，默认输出至屏幕

### 1.2.1 指定搜索目录层级

```bash
-maxdepth level 最大搜索目录深度，指定目录下的文件为第1级
-mindepth level 最小搜索目录深度
```

范例：

```bash
[10:41:01 root@centos8 ~]#find /etc/ -maxdepth 2 -mindepth 2
```

### 1.2.2 对每个目录先处理目录内的文件，在处理目录本身

```bash
-depth -d
```

范例：

```bash
[10:45:06 root@centos8 ~]#find /data/test
/data/test
/data/test/test2
/data/test/test2/f1
/data/test/test3
/data/test/test3/f1
/data/test/f1
/data/test/f2
[10:45:14 root@centos8 ~]#find /data/test -depth
/data/test/test2/f1
/data/test/test2
/data/test/test3/f1
/data/test/test3
/data/test/f1
/data/test/f2
/data/test
```

### 1.2.3 根据文件名和inode查找

```bash
-name "文件名称"     支持使用glob，如：*,?,[],[^]，通配符要加双引号引起来
-iname "文件名称"    不区分字母大小写
-inum n             按inode号查找
-samefile name      相同inode号的文件
-links n            连接数为n的文件
-regex "PATTERN"    以PATTERN匹配整个文件路径，而非文件名称
```

范例：

```bash
find -name snow.png
find -iname snow.png
find / -name "\.txt"
find /var -name "log*"

[10:59:09 root@centos8 ~]#find / -regex ".*\.txt$"
```

### 1.2.4 根据属主、属组查找

```bash
-user  USERNAME   查找属主为指定用户的文件
-group GRPNAME    查找属组为指定组的文件
-uid   UserID     查找属主为指定UID号的文件
-gid   GroupID    查找属组为指定GID号的文件
-nouser           查找没有属主的文件
-nogroup          查找没有属组的文件
```

### 1.2.5 根据文件类型查找

```bash
-type TYPE
TYPE可以是以下形式：
f：普通文件
d：目录文件
l：符号链接文件
s：套接字文件
b：块设备文件
c：字符设备文件
p：管道文件
```

范例：

```bash
[11:09:42 root@centos8 ~]#find / -type b
```

### 1.2.6 空文件或目录

```bash
-empty

[11:28:17 root@centos8 ~]#find /data/ -empty
```

### 1.2.7 组合条件

```bash
与：-a，默认多个条件是与关系
或：-o
非 -not ！
```

范例：

```bash
[11:15:20 root@centos8 ~]#find / -type b -o -type s
[11:16:30 root@centos8 ~]#find /data/ -user root -a -group zhang
/data/zz
[11:17:06 root@centos8 ~]#find /data/ -user root -group zhang
/data/zz
[11:44:47 root@centos8 ~]#find /home/ ! -user root
/home/zhang
/home/zhang/.bash_logout
/home/zhang/.bash_profile
/home/zhang/.bashrc
```

**德·摩根定律**

* (非A)或(非B)=非(A且B)
* (非A)且(非B)=非(A或B)

示例：

* !A -a !B =!(A -o B)
* !A -o !B =!(A -a B)

### 1.2.8 排除目录

```bash
-prune
写法：
-path DIRNAME -a -prune                            排除dirname目录
\( -path DIRNAME1 -o -path DIRNAME2 \) -a -prune   排除dirname1和dirname2目录
[11:41:09 root@centos8 ~]#find /data/  -path "/data/test" -a -prune -o -type f
```

### 1.2.9 根据文件大小来查找

```bash
-size [+|-]#UNIT #常用单位：k,M,G,c(byte),注意大小写敏感
#UNIT            #表示(#-1,#),如6k表示5k-6k
-#UNIT           #表示(0,#-1),如-6k表示0k-5k
+#UNIT           #表示(#,..)，如+6k表示6k-....
```

范例：

```bash
[11:44:55 root@centos8 ~]#find / -size +10G
/proc/kcore
```

### 1.2.10 根据时间戳

```bash
#以“天”为单位
-atime [+|-]#
意义同文件大小一样

-mtime
-ctime

#以“分钟”为单位

-amin
-mmin
-cmin
```

### 1.2.11 根据权限查找

```bash
-perm [/|-]MODE
MODE：精确权限匹配
/MODE：任何一类(u,g,o)对象的权限中只要能一位匹配即可，或关系，+从Centos7开始淘汰
-MODE：每一类对象都必须同时拥有指定权限，与关系
0      表示不关注
```

说明：

find -perm 755 会匹配权限模式恰好是755的文件

只要当任意人有写权限时，find -perm /222就会匹配

只有当每个人都有写权限时，find -perm -222 才会匹配

只有当其他人（other）有写权限时，find -perm -002 才会匹配

### 1.2.12 正则表达式

```bash
-regextype type

-regex pattern
```

### 1.2.13 处理动作

```bash
-print：默认处理动作，显示至屏幕
-ls：类似于对查找到的文件执行“ls -dils”命令格式输出
fls file：查找到的所有文件的长格式信息保存至指定文件中，相当于-ls >file
-delete：删除查找到的文件，慎用
-ok COMMAND {}\;对查找到的每个文件执行由COMMAND指定的命令，对于每个文件执行命令之前，都会交互式要求用户确认
-exec COMMAND { } \; 对查找到的每个文件执行由COMMAND指定的命令
{}：用于引用查找到的文件名自身
```

范例：

```bash
给/data文件夹下f开头的文件添加.txt后缀
[14:17:01 root@centos8 data]#find /data/ -name "f*" -exec mv {} {}.txt \;
删除/data文件夹f开头的文件
[14:17:38 root@centos8 data]#find /data/ -name "f*" -delete
```

## 1.3 参数替换xargs

由于很多命令不支持管道 | 来传递参数，xargs用于生产某个命令的参数，xargs可以读入stdin的数据，并且以空格符或回车符将stdin的数据分割成为参数

另外，许多命令不能接受过多参数，命令执行可能会失败，xargs可以解决

注意：文件名或者是其他意义的名词内含有空格符的情况

find经常和xargs命令进行组合，形式如下：

```bash
find | xargs COMMAND
```

范例：

```bash
seq 10 | xargs

ls | xargs rm

[14:38:50 root@centos8 ~]#seq 10 | xargs -n5
1 2 3 4 5
6 7 8 9 10
[14:38:52 root@centos8 ~]#seq 10 | xargs -n5 mkdir
[14:39:02 root@centos8 ~]#ls
1  10  2  3  4  5  6  7  8  9
```

# 二 、压缩和解压缩

主要针对单个文件压缩，而非目录

## 2.1 compress和uncompress

此工具来源于ncompress包，此工具目前已经很少使用

对应文件是.Z后缀

格式

```compress Options [file ...]
uncompress file.Z            #解压缩
常用选项：
-d  解压缩
-c  结果输出至标准输出，不删除原文件
-v  显示详情
```

## 2.2 gzip和gunzip

来自于gzip包

对应的文件是.gz后缀

格式：

```bash
gzip [OPTION].. FILE...
常用选项：
-k keep，保留原文件，Centos 8 新特性
-d 解压缩，相当于gunzip
-c 结果输出至标准输出，保留原文件不改变
-# 指定压缩比，#取值1-9，比值越大压缩比越大
```

## 2.3 bzip和bunzip2

来自于bzip2包

对应的文件是.bz2后缀

格式：

```bash
bzip2 [OPTION]... FILE...
选项：
-k keep，保留原文件
-d 解压缩
-c 结果输出至标准输出，保留原文件不改变
-# 指定压缩比，#取值1-9，默认9
```

## 2.4 xz和unxz

来自于xz包

对应的文件是.bz2

格式：

```bash
xz [OPTION]... FILE...
选项：
-k keep，保留原文件
-d 解压缩
-c 结果输出至标准输出，保留原文件不改变
-# 指定压缩比，#取值1-9，默认6
```

## 2.5 zip和unzip

zip可以实现打包目录和多个文件成一个文件并压缩，但可能会丢失文件属性信息，如：所有者和组信息，一般建议用tar替代

分别来自于zip和unzip包

对应的文件是.zip

# 三、打包和解包

## 3.1 tar

tar 即 Tape ARchive 磁带归档，可以对目录和多个文件打包一个文件，并且可以压缩，保留文件属性不丢失，常用于备份功能，推荐使用

对应的文件是.tar后缀

格式：

```bash
tar [-ABcdgGhiklmMoOpPrRsStuUvwWxzZ][-b <区块数目>][-C <目的目录>][-f <备份文件>][-F
][-K <文件>][-L <媒体容量>][-N <日期时间>][-T <范本文件>][-V <卷册名称>][-X
<范本文件>][-<设备编号><存储密度>][--after-date=<日期时间>][--atime-preserve][-- backuup=<备份方式>]
[--checkpoint][--concatenate][--confirmation][--delete][-- exclude=<范本样式>][--force-local]
[--group=<群组名称>][--help][--ignore-failed- read][--new-volume-script=]
[--newer-mtime][--no-recursion][--null][-- numeric-owner][--owner=<用户名称>][--posix]
[--erve][--preserve-order][--preserve- permissions][--record-size=<区块数目>]
[--recursive-unlink][--remove-files][--rsh- command=<执行指令>][--same-owner][--suffix=<备份字尾字符串>]
[--totals][--use- compress-program=<执行指令>][--version][--volno-file=<编号文件>][文件或目录...]
```

选项：

```bash
man tar 查询
```

## 3.2 split

split命令可以分割一个文件为多个文件

范例：

```bash
格式：
split -b Size -d tar-file-name prefix-name

英文后缀
[15:13:06 root@centos8 ~]#split -b 10M zero  zero-ext
数字后缀
split -b 10M -d zero  zero-ext

合并
[15:17:28 root@centos8 ~]#cat zero-exta* >zero
```

---
title: "5-Shell脚本编程"
date: 2021-05-17T11:38:55+08:00
lastmod: 2021-05-17T19:03:26+08:00
draft: false
description: "覆盖 Shell 脚本的语法基础，包括变量、条件、循环、函数和文本处理。"
cover: "https://b3logfile.com/bing/20200816.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["Linux系统基础知识"]
tags: ["linux", "shell"]
toc: true
---
# 一、编程基础

Linus：Talk is cheap，show me the code

## 1.1 程序组成

* 程序：算法+数据结构
* 数据：是程序的核心
* 数据结构：数据在计算机中的类型和组织方式
* 算法：处理数据的方式

## 1.2 程序编程风格

**面向过程语言**

* 做一件事，排出个步骤，第一步干什么，第二步干什么，如果出现情况A，做什么处理，如果出现情况B，做什么处理
* 问题规模小，可以步骤化，按部就班处理
* 以指令为中心，数据服务于指令
* C，shell

**面向对象语言**

* 一种认识世界、分析世界的方法论。将万事万物抽象为各种对象
* 类是抽象的概念，是万事万物的抽象，是一类事物的共同特征的集合
* 对象是类的具象，是一个实体
* 问题规模大，复杂系统
* 以数据为中心，指令服务于数据
* java，C#，python，golang等

## 1.3 编程语言

计算机：运行二进制指令

编程语言：人与计算机之间交互的语言。分为俩种：低级语言和高级语言

* 低级编程语言：
  * 机器：二进制的0和1的序列，称为机器指令。与自然语言差异太大，难懂、难写
  * 汇编：用一些助记符号替代机器指令，称为汇编语言
* 高级编程语言：
  * 编译：高级语言——编译器——及其代码文件——执行，如C，C++
  * 解释：高级语言——执行——解释器——机器代码，如：shell，python....

## 1.4 编程处理方式

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-59b34fad.png)

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-83157da9.png)

**三种处理逻辑**

* **顺序执行：程序按从上到下顺序执行**
* **选择执行：程序执行过程中，根据条件的不同，进行选择不同分支继续执行**
* **循环执行：程序执行过程中需要重复执行多次某段语句**

# 二、shell 脚本语言的基本用法

## 2.1 shell 脚本的用途

* 将简单的命令组合完成复杂的工作，自动化执行命令，提高工作效率
* 减少手工命令的重复输入，一定程度上避免人为错误
* 将软件或应用的安装及配置实现标准化
* 用于实现日常性的，重复性的运维工作，如：文件打包压缩备份，监控系统运行状态并实现告警等

## 2.2 shell 脚本基本结构

shell 脚本编程：是基于过程式、解释执行的语言

编程语言的基本结构：

* 各种系统命令的组合
* 数据存储：变量、数组
* 表达式：a+b
* 控制语句：if

shell脚本：包含一些命令或声明，并符合一定格式的文本文件

**格式要求：首行shebang机制**

```bash
#!/bin/bash
#!/usr/bin/oython
#!/usr/bin/perl
```

## 2.3 shell脚本创建过程

第一步：使用文本编辑器来创建文本文件

第一行必须包括shell声明序列：#!

示例：

```bash
#!/bin/bash
```

添加注释，注释以#开头

第二步：加执行权限

给予执行权限，在命令行上指定脚本额绝对路径或相对路径

第三步：运行脚本

直接运行解释器，将脚本作为解释器程序的参数运行

## 2.4 shell脚本注释规范

1. 第一行一般为调用使用的语言
2. 程序名，避免更改文件名为无法找到正确的文件
3. 版本号
4. 更改后的时间
5. 作者相关信息
6. 该程序的作用，及注意事项
7. 最后是各版本的更新简要说明

## 2.5 第一个脚本

范例：远程主机执行脚本

```bash
[14:49:02 root@centos8 ~]#curl http://www.wangxiaochun.com/testdir/hello.sh | bash
% Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
Dload  Upload   Total   Spent    Left  Speed
100   388  100   388    0     0   3104      0 --:--:-- --:--:-- --:--:--  3104
hello, world
Hello, world!

[14:49:17 root@centos8 ~]#curl -s http://www.wangxiaochun.com/testdir/hello.sh | bash
hello, world
Hello, world!
```

范例：第一个Shell脚本hello world

```bash
[11:51:07 root@centos8 data]#cat hello.sh
#!/bin/bash
#
#********************************************************************
#Author:zhangzhuo
#QQ: 1191400158
#Date: 2020-12-05
#FileName：hello.sh
#URL: http://www.magedu.com
#Description：The test script
#Copyright (C): 2020 All rights reserved
#********************************************************************
set -u
set -e
echo "hello,world"
[11:50:56 root@centos8 data]#chmod +x hello.sh
[11:51:03 root@centos8 data]#./hello.sh
hello,world
```

范例：备份脚本

```bash
[11:55:49 root@centos8 data]#cat backup-etc.sh
#!/bin/bash
#
#********************************************************************
#Author:zhangzhuo
#QQ: 1191400158
#Date: 2020-12-05
#FileName：backup-etc.sh
#URL: http://www.magedu.com
#Description：The test script
#Copyright (C): 2020 All rights reserved
#********************************************************************
set -u
set -e
echo -e "\e[1;31mStarting backup...\e[1;0m"
cp -av /etc/ /data/etc`date +%F`/
echo -e "\e[1;31mStarting is finished\e[1;0m"
```

## 2.6 shell脚本调试

**只检测脚本中的语法错误，但无法检查出命令错误，但不真正执行脚本**

```bash
bash -n /path/to/spme_script
```

**调试并执行**

```bash
bash -x /path/to/some_script
```

范例：

```bash
[14:13:52 root@centos8 data]#bash -n backup-etc.sh
```

**总结：脚本错误常见的有三种**

* 语法错误，会导致后续的命令不继续执行，可以用bash -n 检查错误，提示的出错行数不一定是准确的
* 命令错误，默认后续的命令还会继续执行，用bash -n无法检查出来，可以使用bash -x 进行观察
* 逻辑错误：只能使用bash -x进行观察

## 2.7 变量

### 2.7.1 变量

变量表示命名的内存空间，将数据放在内存空间中，通过变量名引用，获取数据

### 2.7.2 变量类型

变量类型：

* 内置变量，如：PS1，PATH,UID,HOSTNAME,$$,BASGPID,PPID,$?,HISTSIZE
* 用户自定义变量

不同的变量存在的数据不同，决定了以下

* 数据存储方式
* 参与的运算
* 表示的数据范围

变量数据类型：

* 字符
* 数值：整型、浮点型、bash不支持浮点数

### 2.7.3 编程语言分类

**静态和动态语言**

* 静态编译语言：使用变量前，先声明变量类型，之后类型不能改变，在编译时检查，如：java,c
* 动态编译语言：不用事先声明，可随时改变类型，如：bash，Python

**强类型和弱类型语言**

* 强类型语言：不同类型数据操作，必须经过强制转换才同一类型才能运算，如java，c#，python
* 弱类型语言：语言的运行时会隐式做数据类型转换。无需指定类型，默认均为字符型；参与运算会自动进行隐式类型转换；变量无需事先定义可直接调用

### 2.7.4 Shell中变量命名法则

* 不能使程序中的保留字和内置变量：如if，for
* 只能使用数字、字母及下划线，且不能以数字开头，注意：不支持短横线“-”，和主机名相反
* 见名知义，用英文单词命名，并体现出实际作用，不要用简写，如：ATM
* 同一命名规则：驼峰命名法，studentname，大驼峰StudentName小驼峰studentName
* 变量名大写：STUDENT_NAME
* 局部变量小写
* 函数名小写

### 2.7.5 变量定义和引用

变量的生效范围等标准划分变量类型

* 普通变量：生效范围为当前shell进程；对当前shell之外的其他shell进程，包括当前shell的子shell进程均无效
* 环境变量：生效范围为当前shell进程及其子进程
* 本地变量：生效范围为当前shell进程中某代码片段，通常指函数

**变量赋值：**

```bash
name='value'
```

**其他赋值情况加双引号""**

```bash
[16:14:58 root@centos8 script]#NAME="

> sss
> sss
> sss
> sss
> sss
> "
> [16:33:24 root@centos8 script]#echo $NAME
sss sss sss sss sss
[16:33:32 root@centos8 script]#echo "$NAME"

sss
sss
sss
sss
sss
```

**value 可以是一下多种形式**

```bash
直接字串：name='root'
变量引用：name='$USER'
命令引用：name=`COMMAND` 或者 name=$(COMMAND)
```

注意赋值是临时生效，当退出终端后，变量会自动删除，无法持久保持，脚本中的变量会随着脚本结束，也会自动删除

**范例：变量追加赋值**

```bash
[14:47:53 root@centos8 data]#zhang=user
[14:48:04 root@centos8 data]#echo $zhang
user
[14:48:16 root@centos8 data]#zhang+=:zhangzhuo
[14:48:26 root@centos8 data]#echo $zhang
user:zhangzhuo
```

**范例：利用变量实现动态命令**

```bash
[14:48:28 root@centos8 data]#CMD=hostname
[14:50:21 root@centos8 data]#$CMD
centos8
```

**变量引用：**

```bash
$name
${name}
```

**弱引用和强引用**

* "$name" 弱引用，其中的变量会被替换为变量值
* '$name' 强引用，其中的变量引用不会被替换为变量值，而保持原字符串

**显示已定义的所有变量：**

```bash
set
```

**删除变量：**

```bash
unset <name>
```

**范例：显示系统信息**

```bash
[15:19:56 root@centos8 data]#cat systeminfo.sh
#!/bin/bash
#
#********************************************************************
#Author:zhangzhuo
#QQ: 1191400158
#Date: 2020-12-05
#FileName：systeminfo.sh
#URL: http://www.magedu.com
#Description：The test script
#Copyright (C): 2020 All rights reserved
#********************************************************************
set -u
set -e
RED="\e[1;31m"
GREEN="\e[;32m"
END="\e[0m"
echo -e "$GREEN---------------------------------------------------------------------$END"
echo -e "HOSTNAME:        $RED`hostname`$END"
echo -e "IPADDR:          $RED`ifconfig ens33 | grep -Eo '([0-9]{1,3}\.){3}[0-9]{1,3}' | head -n1`$END"
echo -e "OSVERSION:       $RED`cat /etc/redhat-release`$END"
echo -e "KERNEL:          $RED`uname -r`$END"
echo -e "CPU:             $RED`lscpu | grep 'Model name'| tr -s ' ' | cut -d: -f2`$END "
echo -e "MEMORY:          $RED`free -h | grep Mem|tr -s ' ' : | cut -d: -f2`$END"
echo -e "DISK:            $RED`lsblk|grep '^sd'|tr -s ' ' | cut -d ' ' -f4`$END"
echo -e "$GREEN---------------------------------------------------------------------$END"
```

**范例：备份etc**

```bash
[15:27:19 root@centos8 data]#cat backup-etc.sh
#!/bin/bash
#
#********************************************************************
#Author:zhangzhuo
#QQ: 1191400158
#Date: 2020-12-05
#FileName：backup-etc.sh
#URL: http://zhangzhuo.ltd
#Description：The test script
#Copyright (C): 2020 All rights reserved
#********************************************************************
set -u
set -e
COLOR='echo -e \e[1;31m'
END='\e[0m'
BACKUP=/data
SRC=/etc
DATE=`date +%F`

${COLOR}mStarting backup...$END
cp -av $SRC ${BACKUP}${SRC}_$DATE
${COLOR}mStarting is finished$END"
```

### 2.7.6 环境变量

**环境变量：**

* 可以使子进程（包括孙子进程）继承父进程的变量，但是无法让父进程使用子进程的变量
* 一旦子进程修改从父进程继承的变量，将会新的值传递给孙子进程
* 一般只在系统配置文件中使用，在脚本中较少使用

**变量声明和赋值：**

```bash
声明并赋值
export name=VALUE
declare -x name=VALUE
或者俩者分俩步实现
name=value
export name
```

**变量引用**

```bash
$name
${name}
```

**显示所有环境变量：**

```bash
env
printenv
export
declare -x
```

**删除变量：**

```bash
unset name
```

**bash内建的环境变量**

```bash
PATH
SHELL
USER
UID
HOME
PWD
SHLVL    shell的嵌套层数，即深度
LANG
MAIL
HOSTNAME
HISTSIZE
_      下划线，表示前一个命令的最后一个参数
```

### 2.7.7 只读变量

只读变量：只能声明定义，但后续不能修改和删除，即常量

**声明只读变量：**

```bash
readonly name
declare -r name
```

**查看只读变量：**

```bash
readonly [-p]
declare -r
```

### 2.7.8 位置变量

位置变量：在bash shell中内置的变量，在脚本代码中调用通过命令行传递给脚本的参数

```bash
$1,$2,...对应第1个、第2个等参数，shift [n]换位置
$0       命令本身，也包扣路径
$*       传递给脚本的所有参数，全部参数合为一个字符串
$@       传递给脚本所有参数，每个参数为独立字符串
$#       传递给脚本的参数的个数

注意:$@ $*只在被双引号包起来的时候才会有差异
```

**清空所有位置变量**

```bash
set --
```

范例：

```bash
[15:50:27 root@centos8 data]#cat arg.sh
#!/bin/bash
#
#********************************************************************
#Author:zhangzhuo
#QQ: 1191400158
#Date: 2020-12-05
#FileName：arg.sh
#URL: http://www.magedu.com
#Description：The test script
#Copyright (C): 2020 All rights reserved
#********************************************************************
set -u
set -e
echo "1st arg is $1"
echo "1st arg is $2"
echo "1st arg is $3"
echo "1st arg is ${10}"
echo "1st arg is ${11}"

echo "the number of arg is $#"
echo "all args are $*"
echo "all args are $@"
echo "the scriptname is `basename $0`"
[15:50:44 root@centos8 data]#./arg.sh {a..z}
1st arg is a
1st arg is b
1st arg is c
1st arg is j
1st arg is k
the number of arg is 26
all args are a b c d e f g h i j k l m n o p q r s t u v w x y z
all args are a b c d e f g h i j k l m n o p q r s t u v w x y z
the scriptname is arg.sh
```

**范例：mv替换rm命令**

```bash
#!/bin/bash
#
#********************************************************************
#Author:zhangzhuo
#QQ: 1191400158
#Date: 2020-12-08
#FileName：rm.sh
#URL: https://www.zhangzhuo.ltd
#Description：The test script
#Copyright (C): 2020 All rights reserved
#********************************************************************
set -u
set -e
COLOR="echo -e \033[1;31m"
END="\033[0m"
BACKUP=$1
SRC=/data/backup/
DATE=`date +%F_%T`

mkdir ${SRC}${DATE} >/dev/null
mv ${BACKUP} ${SRC}${DATE}
${COLOR}${BACKUP} to ${SRC}${DATE}
```

### 2.7.9 退出状态码变量

进程执行后，将使用变量$?保存状态码的相关数字，不同的值反应成功或失败，$?取值范围0-255

```bash
$?的值为0       代表成功
$?的值是1到255  代表失败
```

范例：

```bash
[15:56:52 root@centos8 data]#ping -c1 -w1 baidu.com &>/dev/null
[15:57:03 root@centos8 data]#echo $?
0
```

用户可以在脚本中使用以下命令自定义退出状态码

```bash
exit [n]
```

注意：

* 脚本中一旦遇到exit命令，脚本会立即终止；终止退出状态取决于exit命令后面的数字
* 如果未给脚本指定退出状态码，整个脚本的退出状态码取决于脚本中执行的最后一条命令

### 2.7.10 展开命令行

展开命令执行顺序

```bash
把命令行分成单个命令词
展开别名
展开大括号的声明{}
展开波浪符声明~
命令替换$() 和``
再次把命令行分成命令词
展开文件通配*、？、[abc]等等
准备I/O重导向<\>
运行命令
```

防止扩展

```bash
反斜线(\)会使随后的字符按原意解释
```

加引号来防止扩展

```bash
单引号('')防止所有扩展
双引号("")也可防止扩展，但是以下情况例外：$(美元符号)
```

变量扩展

```bash
``:反引号，命令替换
\:反斜线，禁止单个字符扩展
!:叹号，历史命令替换
```

### 2.7.11 脚本安全和set

set命令：可以用来定制shell环境

**$-变量**

h:hashall,打开选项后，shell会将命令所在的路径hash下来，避免每次都要查询。通过set +h选项将h选项关闭

i:interactive-comments,包含这个选项说明当前的shell是一个交互式的shell。所谓的交互式shell，在脚本中，i选项是关闭的

m:monitor,打开监控模式，就可以通过job control来控制进程的停止、继续，后台或者前台执行等

B：braceexpand，大括号扩展

H：history，H选项打开，可以展开命令历史列表中的命令，可以通过！感叹号来完成，例如"!!"返回最近的一个历史命令，“!n”返回第n个历史命令

**set命令实现脚本安全**

* -u 在扩展一个没有设置的变量使，显示错误信息，等同于set -o nounset
* -e 如果一个命令返回一个非0退出状态值（失败）就退出，等同于set -o errexit
* -o option显示，打开或者关闭选项
  * 显示选项：set -o
  * 打开选项：set -o 选项
  * 关闭选项：set +o 选项
* -x 当执行命令时，打印命令及其参数，类似bash -x

## 2.8 格式化输出 printf

格式

```bash
printf "指定的格式" "文本1" "文本2" ...
```

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-9a0f16f6.png)

**常用格式替换符**

```bash
替换符                 功能
%s                    字符串
%f                   浮点格式
%b                   相对应的参数中包含转义字符时，可以使用此替换符进行替换，对应转义字符会被转义
%c                   ASCII字符，即显示对应参数的第一个字符
%d,%i                十进制整数
%o                   八进制值
%u                   不带正负号的十进制值
%x                   十六进制值 （a-f）
%X                  十六进制值 （A-F）
%%                  表示%本身
```

说明：%s中的数字代表此替换输出字符串宽度，不足补空格，默认是右对齐，%-10s表示10个字符宽，-表示左对齐

**常用转义字符**

```bash
转义符               功能
\a                 警告字符，通常为ASCII的BEL字符
\b                 后退
\f                 换页
\n                 换行
\r                 回车
\t                 水平制表符
\v                 垂直制表符
\                  表示\本身
```

范例：

```bash
[19:09:13 root@centos8 ~]#printf "%s\n" 1 2 3 4
1
2
3
4
[19:10:11 root@centos8 ~]#printf "%f\n" 1 2 3 4
1.000000
2.000000
3.000000
4.000000
#.2f 表示保留俩位小数
[19:10:20 root@centos8 ~]#printf "%.2f\n" 1 2 3 4
1.00
2.00
3.00
4.00
[19:21:58 root@centos8 ~]#printf "(%s)" 1 2 3 4 ;echo
(1)(2)(3)(4)
[19:22:27 root@centos8 ~]#printf " (%s) " 1 2 3 4 ;echo " "
(1)  (2)  (3)  (4)
[19:23:15 root@centos8 ~]#printf "(%s)\n" 1 2 3 4
(1)
(2)
(3)
(4)
[19:23:20 root@centos8 ~]#printf "%s %s\n" 1 2 3 4
1 2
3 4
[19:23:42 root@centos8 ~]#printf "%s %s %s\n" 1 2 3 4
1 2 3
4

#%-10s表示宽度10个字符，左对齐
[19:25:31 root@centos8 ~]#printf "%-10s %-10s %-4s %s\n" 姓名 性别 年龄 体重 小明 男 20 70 小红 女 18 50
姓名     性别     年龄 体重
小明     男        20   70
小红     女        18   50

#将十进制转换16进制数
[19:28:06 root@centos8 ~]#printf "%x" 31; echo
1f

#将16进制C转换成十进制，16进制必须以0x开头
[19:31:39 root@centos8 ~]#printf "%d\n" 0x1f
31

[19:31:44 root@centos8 ~]#VAR="welcome to magedu" ; printf "\033[31m%s\033[0m\n" $VAR
welcome
to
magedu
[19:33:40 root@centos8 ~]#VAR="welcome to magedu" ; printf "\033[31m%s\033[0m\n" "$VAR"
welcome to magedu
```

## 2.9 算术运算

Shell允许在某些情况下对算术表达式进行求值，比如：let和declare内置命令，(())复合命令和算术扩展。求值以固定宽度整数进行，不检查溢出，尽管除以0被困并标记为错误。运算符及其优先级，管联性和值与C语言相同。以下运算符列表分组为等级优先运算级别。**级别按降序排列优先**。

```bash
id++ id--                vriable post-increment and post-decrement
++id --id                vriable post-increment and post-decrement
- + unary minus and plus
! ~                      logical and bitwise negation
**                       exponentiation 乘方
* / %                    multiplication,division,remainder，%表示取模，即取余数，示例：9%4=1
+ -addition，subtraction
<< >>                    left and right bitwise shifts
<= >= < >                comparison
== !=                   equality and inequality
&                       bitwise AND
^                       bitwise exclusive OR
|                       bitwise OR
&&                      logical AND
||                      logical OR
expr?expr:expr          conditional operator
= *= /= %= += -= <<= >>= &= ^= |=     assignment
expr1,expr2             comma``
```

乘法符号有些场景中需要转义

**实现算术运算：**

```bash
(1)  let var=算术表达式
(2)  ((var=算术表达式))和上面等价
(3)  var=$[算术表达式]
(4)  var=$((算术表达式))
(5)  var=$(expr arg1 arg2 arg3 ...)
(6)  declare -i var = 数值
(7)  echo '算术表达式' | bc
```

**内建随机数生成器变量：**

```bash
$RANDOM   取值范围：0-32767
```

范例：

```bash
#生成0-49之间随机数
[19:51:09 root@centos8 script]#echo $[$RANDOM%50]
22
#随机字体颜色
[19:52:23 root@centos8 script]#echo -e "\033[1;$[RANDOM%7+31]mhello\033[0m"
hello
```

**增强型赋值：**

```bash
+=     i+=10  相当于 i=i+10
-=     i-=j   相当于i=i-j
*=
/=
%=
++ i++,++i    相当于i=i+1
-- i--,--i    相当于i=i-1
```

格式：

```bash
let varOPERvalue
```

范例：

```bash
[19:52:24 root@centos8 script]#let i=10*2
[19:58:18 root@centos8 script]#echo $i
20
[19:58:23 root@centos8 script]#((j=i+10))
[19:58:39 root@centos8 script]#echo $j
30
自增，自减
```

范例：鸡兔同笼

```bash
[20:05:26 root@centos8 script]#chook_rabbit.sh 60 188
RABBIT:34
CHOOK:26
[20:05:30 root@centos8 script]#cat chook_rabbit.sh
#!/bin/bash
#
#********************************************************************
#Author:zhangzhuo
#QQ: 1191400158
#Date: 2020-12-08
#FileName：chook_rabbit.sh
#URL: https://www.zhangzhuo.ltd
#Description：The test script
#Copyright (C): 2020 All rights reserved
#********************************************************************
HEAD=$1
FOOT=$2
RABBIT=$(((FOOT-HEAD-HEAD)/2))
CHOOK=$[HEAD-RABBIT]
echo RABBIT:$RABBIT
echo CHOOK:$CHOOK
```

## 2.10 逻辑运算

**true，false**

```bash
1,真
0,假
```

**与：&：和0相与，结果为0，和1相与，结果保留原值**

```bash
1 与 1 = 1
1 与 0 = 0
0 与 1 = 0
0 与 0 = 0
```

**或：|：和1相或结果为1，和0相或，结果保留原值**

```bash
1 或 1 = 1
1 或 0 = 1
0 或 1 = 1
0 或 0 = 0
```

**非：！**

```bash
! 1 = 0    ! true
! 0 = 1    ! false
```

**异或：^**

**异或的俩个值，相同为假，不同为真。俩个数字X，Y异或得到结果Z，Z在和任意俩者之一X异或，将得出另一个值Y**

```bash
1 ^ 1 = 0
1 ^ 0 = 1
0 ^ 1 = 1
0 ^ 0 = 0
```

范例：

```bash
[17:03:12 root@centos8 data]#x=10;y=20;temp=$x;x=$y;y=$temp;echo x=$x,y=$y
x=20,y=10
[17:05:16 root@centos8 data]#x=10;y=20;x=$[x^y];y=$[x^y];x=$[x^y];echo x=$x,y=$y
x=20,y=10
```

**短路运算**

* 短路与

```bash
CMD1 短路与 CMD2
第一个CMD1结果为真（1），第二个CMD2必须要参与运算，才能得到最终的结果
第一个CMD1结果为假（0），总的结果必定为0，因此不需要执行CMD2
```

* 短路或

```bash
CMD1 短路或 CMD2
第一个结果为真（1），总的结果必定为1，因此不需要执行CMD2
第一个结果为假（0），第二个CMD2必须要参与运算，才能得到最终的结果
```

## 2.11 条件测试命令

条件测试：判断某需求是否满足，需要测试机制来实现，专用的测试表达式需要有测试命令辅助完成

测试过程

，实现评估布尔声明，以便用在条件环境下进行执行

若真，则状态码变量$?返回0

若假，则状态码变量$?返回1

条件测试命令

test EXPRESSION

[ EXPRESSION ]   #和test等价，建议使用[  ]

[[ EXPRESSION ]]

注意：EXPRESSION前后必须有空白字符

帮助：

```bash
[17:06:38 root@centos8 data]#type [
[18:43:48 root@centos8 data]#help [
[18:43:53 root@centos8 data]#help test
```

### 2.11.1 变量测试

```bash
判断 NAME 变量是否定义
[ -v NAME ]
判断 NAME 变量是否定义并且是名称引用，bash 4.4新特性
[ -R NAME ]
```

### 2.11.2 数值测试

```bash
-eq 是否等于
-ne 是否不等于
-gt 是否大于
-ge 是否大于等于
-lt 是否小于
-le 是否小于等于
```

算术表达式比较

```bash
==   相等
!=   不相等
<=

> =
> <
>
```

### 2.11.3 字符串测试

**test和 [ ] 用法**

```bash
test和 [ ] 用法
-z STRING   字符串是否为空，没定义或空为真，不空为假
-n STRING   字符串是否不空，不空为真，空为假
STRING   同上
STRING1 = STRING2  是否等于
STRING1 != STRING2 是否不等于

> ascii码是否大于ascii码
> < 是否小于
```

**[[ ]]用法**

```bash
[[ expression]] 用法
== 左侧字符串是否和右侧的PATTERN相同
注意：此表达式用于[[ ]]中，PATTERN为通配符
=~ 左侧字符串是否能够被右侧的正则表达式的PATTERN所匹配
注意：此表达式用于[[ ]]中：扩展正则表达式
```

**建议：当使用正则表达式或通配符使用[[ ]]，其他情况一般使用 [  ]**

范例：使用 [  ]

```bash
在比较字符串时，建议变量放在""中
[18:44:09 root@centos8 data]#[ -z "$str" ]
[18:58:32 root@centos8 data]#echo $?
0
```

范例:使用 [[ ]]

```bash
通配符
[18:58:36 root@centos8 data]#FILE=test.log
[19:00:02 root@centos8 data]#[[ "$FILE" == *.log ]]
[19:00:30 root@centos8 data]#echo $?
0

正则表达式
[19:01:27 root@centos8 data]#FILE=test.txt
[19:01:59 root@centos8 data]#[[ "$FILE" =~ \.log$ ]]
[19:02:01 root@centos8 data]#echo $?
1

[[ == ]] ==右侧的*作为通配符不要加"",只想做*，需要加""或转义
[19:02:03 root@centos8 data]#NAME="linux*"
[19:05:16 root@centos8 data]#[[ "$NAME" == "linux*" ]]
[19:05:18 root@centos8 data]#echo $?
0
```

### 2.11.4 文件测试

**存在性测试**

```bash
-a FILE：同 -e
-e FILE：文件存在性测试，存在为真，否则为假
-b FILE：是否存在且为块设备文件
-c FILE：是否存在且为字符设备文件
-d FILE：是否存在且为目录文件
-f FILE：是否存在且为普通文件
-h FILE：或 -L FILE：存在且为符号链接文件
-p FILE：是否存在且为命名管道文件
-s FILE：是否存在且为套接字文件
```

**文件权限测试：**

```bash
-r FILE：是否存在且可读
-w FILE：是否存在且可写
-x FILE：是否存在且可执行
-u FILE：是否存在且拥有suid权限
-g FILE：是否存在且拥有sgid权限
-k FILE：是否存在且拥有sticky权限
```

**注意：最终结果有用户对文件的实际权限决定，而非文件属性决定**

范例：

```bash
[19:12:12 root@centos8 data]#[ -d /etc/ ]
[19:12:41 root@centos8 data]#echo $?
0
[19:12:47 root@centos8 data]#[ -d /etc/fstab ]
[19:12:52 root@centos8 data]#echo $?
1
[19:12:54 root@centos8 data]#[ -w /etc/fstab ]
[19:13:00 root@centos8 data]#echo $?
0
```

**文件属性测试**

```bash
-s FILE：          是否存在且非空
-t df              fd文件描述符是否在某终端已经打开
-N FILE：          文件自从上一次被读取之后是否被修改过
-O FILE：          当前有效用户是否为文件属主
-G FILE：          当前有效用户是否为文件属组
FILE1 -ef FILE2    FILE1是否是FILE2的硬链接
FILE1 -nt FILE2    FILE1是否新于FILE2（mtime）
FILE1 -ot FILE2    FILE1是否旧于FILE2
```

## 2.12 关于（）和 ` { }`

(CMD;CMD2;...)和{CMD1;CMD2;...;}都可以将多个命令组合在一起，批量执行

(list)会开启子shell，并且list中变量赋值及内部命令执行后，将不在影响后续的环境
帮助查看：man bash 搜索（list）
{ list; }不会启子shell，在当前shell中运行，会影响当前shell环境
帮助查看：man bash 搜索{ list; }

## 2.13 组合测试条件

### 2.13.1 第一种方式 [  ]

```bash
[ EXPRESSION1 -a EXPRESSION2 ]   并且，EXPRESSION1和EXPRESSION2都是真，结果才为真
[ EXPRESSION1 -o EXPRESSION2 ]   或者，EXPRESSION1和EXPRESSION2只要有一个为真，结果就为真
[ ! EXPRESSION ]                 取反
```

说明：-a和-o需要使用测试命令进行，[[ ]]不支持

### 2.13.2 第二种方式

```bash
COMMAND1 && COMMAND2  并且，短路与，代表条件性的AND
如果1成功将执行2，否则将不执行2
COMMAND1 || COMMAND2  或者，短路或，代表条件性的OR
如果1成功将不执行2，否则将执行2
！ COMMAND             非，取反
```

## 2.14 使用read命令来接受输入

使用read来吧输入值分配给一个或多个shell变量，read从标准输入中读取值，给每个单词分配一个变量，所有剩余单词都被分配给最后一个变量，如果变量名没有指定，默认标准输入的赋值给系统内置的变量REPLY

格式：

```bash
read [options] [name ...]
```

常见选项：

```bash
-p         指定要显示的提示
-s         静默输入，一般用于密码
-n N       指定输入的字符长度N
-d '字符'  输入结束符
-t N      TIMEOUT为N秒
```

范例：面试题read和输入重定向

```bash
[19:51:56 root@centos8 ~]#cat test.txt 
1 2
[19:51:59 root@centos8 ~]#read i j < test.txt ; echo i=$i j=$j
i=1 j=2
[19:52:31 root@centos8 ~]#echo 1 2 | read x y ; echo $x $y

[19:52:57 root@centos8 ~]#echo 1 2 | (read x y ; echo $x $y)
1 2
[19:53:42 root@centos8 ~]#echo 1 2 | { read x y ; echo $x $y; }
1 2
```

# 三、bash shell 的配置文件

bash shell的配置文件很多，可以分为下面类别

**全局配置：**

```bash
/etc/profile/etc/profile.d/*.sh/etc/bashrc
```

**个人配置：**

```bash
~/.bash_profile
~/.bashrc
```

## 3.1 shell登录的俩种方式分类

### 3.1.1 交互式登录

* 直接通过终端输入账号密码登录
* 使用su - UserName 切换用户

**配置文件生效的执行顺序：**

```bash
放在每个文件最前面
/etc/profile
/etc/profile.d/*.sh
/etc/bashrc
~/.bash_profile
~/.bashrc
, etc/bashrc
放在每个文件最后
/etc/profile.d/*.sh
/etc/bashrc
/etc/profile
~/.bashrc
~/.bash_profile
```

**注意：文件之间的调用关系，写在同一个文件的不同位置，将影响文件的执行顺序**

### 3.1.2 非交互式登录

* su UserName
* 图形界面下打开的终端
* 执行脚本
* 任何其他的bash实例

## 3.2 按功能划分分类

profile类和bashrc类

### 3.2.1 Profile类

profile类为交互式登录的shell提供配置

```bash
全局：/etc/profile  /etc/profile.d/*.sh
个人：~/.bash_profile
```

功能：

* 用于定义环境变量
* 运行命令或脚本

### 3.2.2 Bashrc类

bashrc类：为非交互式和交互式登录的shell提供配置

```bash
全局：/etc/bashrc
个人：~/.bashrc
```

功能：

* 定义别名和函数
* 定义本地变量

## 3.3 编辑配置文件生效

修改profile和bashrc文件后需生效俩种方法：

* 重新启动shell
* source|. 配置文件

注意：source会在当前shell中执行脚本，所以一般只用于执行配置文件，火灾脚本中调用另一个脚本的场景

## 3.4 bash 退出任务

保存在~/.bash_logout文件中（用户），在退出登录shell时运行

功能：

* 创建自动备份
* 清除临时文件

# 四、流程控制

## 4.1 条件选择

### 4.1.1 条件判断

#### 4.1.1.1 单分支条件

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-b451c600.png)

#### 4.1.1.2 多分支条件

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-be754d2b.png)

### 4.1.2 选择执行 if 语句

**格式：**

```bash
if COMMANDS;then COMMANDS; [ elif COMMANDS; then COMMANDS; ].. [ else COMMANDS; ] fi
```

**单分支**

```bash
if 判断条件;then
条件为真的分支代码
fi
```

**双分支**

```bash
if 判断条件;then
条件为真的分支代码
else
条件为假的分支代码
fi
```

**多分支**

```bash
if 判断条件1;then
条件1为真的分支代码
elif 判断条件2;then
条件2为真的分支代码
elif 判断条件3;then
条件3为真的分支代码
...
else
以上条件都为假的分支代码
fi
```

说明：

* 多个条件时，逐个条件进行判断，第一次遇“真”条件时，执行其分支，而后结束整个if语句
* if语句可嵌套

范例：

```bash
[12:57:28 root@centos6 ~]#declare -f
```

### 4.1.3 条件判断case 语句

**格式：**

```bash
case WORD in [PATTERN [| PATTERN]...) COMMANDS ;;]... esac

case 变量引用 in
PAT1)
分支1
;;
PAT2)
分支2
;;
...
*)
默认分支
;;
asac
```

**case支持glob风格的通配符：**

```bash
* 任意长度任意字符
    ?   任意单个字符
    []  指定范围内的任意单个字符
    |   或者，如：a|b
```

范例：

```bash
范例1

read -p "Do you agree(yes/no)?" INPUT
INPUT=`echo $INPUT | tr 'A-Z' 'a-z'`
case $INPUT in
y|yes)
echo "You input is YES"
;;
n|no)
echo "You input is NO"
;;
*)
echo "Input fales,please input yes or no!"
esac

范例2
read -p "Do you agree(yes/no)?" INPUT
case $INPUT in
[Yy]|[Yy][Ee][sS])
echo "You input is YES"
;;
[nN]|[Nn][Oo])
echo "You input is NO"
;;
*)
echo "Input fales,please input yes or no!"
esac
```

## 4.2 循环

### 4.2.1 循环执行介绍

将某行代码段重复运行多次，通常有进入循环的条件和退出循环的条件

重复运行次数

* 循环次数事先已知
* 循环次数事先未知

常见的循环命令：for，while，until

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-27ac530e.png)

### 4.2.2 循环for

```bash
Centos7的for帮助比Centos8全面
[13:15:32 root@centos8 data]#help for
```

**格式1：**

```bash
for NAME [in WORDS ...] ; do COMMANDS;done
方式1
for 变量名 in 列表;do
循环体
done
方式2
for 变量名 in 列表
do
循环体
done
```

**执行机制：**

* 依次将列表中的元素赋值给变量名；每次赋值后即执行一次循环体；直到列表中的元素耗尽，循环结束
* 如果省略[in WORDS ...],此时使用位置参量

**for循环列表生成方式：**

* 直接给出列表
* 整数列表

```bash
{start..end}
$(seq [start [step]] end)
```

* 返回列表的命令

```bash
$(COMMAND)
```

* 使用glob，如*.sh
* 变量引用，如$@,$*,$#

范例：面试题，计算1+2+3...+100的结果

```bash
[13:15:53 root@centos8 data]#sum=0;for i in {1..100};do let sum+=i;done ;echo sum=$sum
sum=5050
[13:25:43 root@centos8 data]#seq -s+ 100|bc
5050
```

范例：

```bash
sum=0
for i in $* ; do
let sum+=i
done
echo sum=$sum
[13:31:26 root@centos8 data]#./for_sum.sh {1..100}
sum=5050
```

生产案例：将指定目录下的文件所有文件的后缀改名为bak后缀

```bash
for FILE in /data/zhang/* ; do
PRE=`echo $FILE | sed -nr 's/(.*)\.([^.]+)$/\1/p'`
mv -v $FILE   $PRE.bak
done
```

范例：九九乘法表

```bash
for i in {1..9};do
for j in `seq $i`;do
echo -e "${j}*${i}=$[i*j]\t\c"
done
echo
done
```

范例：面试题，要求将目录YYY-MM-DD/中所有文件，移动到YYYY-MM/DD/下

```bash
1.创建YYYY-MM-DD格式的目录，当前日期一年前365天到目前共365个目录，里面有10个文件.log后缀的文件
for i in {1..365};do
mkdir /data/mkdir/`date -d "-${i} day" +%F`
cd /data/mkdir/`date -d "-${i} day" +%F`
for j in {1..10};do
touch zz${j}.log
done
done
2.将上面的目录移动到YYYY-MM/DD/下
DIR=/data/mkdir
cd $DIR
for i in *;do
YYYY_MM=`echo $i | cut -d"-" -f1,2`
DD=`echo $i | cut -d"-" -f3`
[ -d $YYYY_MM/$DD ] || mkdir -p $YYYY_MM/$DD &>/dev/null
mv $i/* $YYYY_MM/$DD
done
rm -rf $DIR/*-*-*
```

面试题：扫描一个网段：10.0.0.0/24,判断此网段中主机在线状态，将在线的主机IP打印出来

```bash
IP="192.168.10."
for i in {1..254};do
{ ping -c1 -W1 ${IP}${i} &>/dev/null && echo "${IP}${i} is up" || echo "${IP}${i} is down"; }
done
```

**格式2：**

双括号方法，即((..))格式，也可以用于算术运算，双小括号方法也可以使bash shell实现C语言风格的变量操作
![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-fc04ac6b.png)

```bash
for ((: for ((exp1;exp2;exp3));do COMMANDS;done

for ((控制变量初始化;条件判断表达式；控制变量的修正表达式))
do
       循环体
done
```

说明：

* 控制变量初始化：仅在运行到循环代码段时执行一次
* 控制变量的修正表达式：每轮循环结束会先进行控制变量修正运算，而后在做条件判断

范例：九九乘法表

```bash
for ((i=1;i<=9;i++));do
     for ((j=1;j<=i;j++));do
          echo -e "${j}*${i}=$[j*i]\t\c"
     done
     echo
done
```

范例：等腰三角形

```bash
read -p "请输入三角形的行数:"  b
for ((i=1;i<=b;i++));do
     for ((k=0;k<=b-i;k++));do
          echo -e " \c"
     done
    for ((j=1;j<=2*i-1;j++));do
          echo -e "*\c"
    done
    echo
done
```

范例：生成进度

```bash
[09:56:39 root@centos8 ~]#for ((i=1;i<=100;i++));do printf "\e[4D%3d%%" $i;sleep 0.01s; done
100%
```

范例：

```bash
[09:58:09 root@centos8 ~]#for ((;;));do echo for;sleep 1;done
for
for
for
for
for
for
```

### 4.2.3 循环 while

**格式：**

```bash
while COMMANDS; do COMMANDS; done

while CONDITION; do
循环体
done
```

**说明：**

CONDITION：循环控制条件；进入循环之前，先做一次判断；每一次循环之后会再次做判断；条件为“true”，则执行一次循环；直到条件测试状态为“false”终止循环，因此：CONDITION一般应该有循环控制变量；而此变量的值会在循环体不断地被修正

进入条件：CONDITION为true

退出条件：CONDITION为false

**无限循环**

```bash
while true; do
循环体
done

while : ; do
循环体
done
```

**范例：**

```bash
[11:03:16 root@centos8 ~]#sum=0;i=1;while ((i<=100));do let sum+=i;let i++;done;echo $sum
5050
```

**范例：根据硬盘使用百分比来发送警告邮件**

```bash
WARNING=80
while : ;do
USE=`df | sed -rn '/^\/dev/s#.* ([0-9]{1,3})%.*#\1#p' | sort -nr | head -1`
if [ $USE -gt $WARNING ];then
echo Disk will be full ftom `hostname -I` | mail -s "disk warning" 1191400158@qq.com
fi
sleep 10
done
```

### 4.2.4 循环nutil

**格式：**

```bash
until COMMANDS; do COMMANDS;done
until CONDITION;do
循环体
done
```

**说明：**

进入条件：CONDITION为false

退出条件：CONDITION为true

**范例：**

```bash
[11:42:41 root@centos8 ~]#sum=0;i=1;until ((i>100));do let sum+=i;let i++;done;echo $sum
5050
```

**无限循环**

```bash
until false;do
循环体
done
```

### 4.2.5循环控制语句continue

continue[N]:提前结束第N层的本轮循环，而直接进入下一轮判断；最内层为第1层

**格式：**

```bash
while CONDITION1;do
CMD
....
if CONDITIPN2;then
continue
fi
CMDn
...
done
```

**范例：**

```bash
for ((i=0;i<10;i++));do
for ((j=0;j<10;j++));do
[ $j -eq 5 ] && continue 2
echo $j
done
echo ---------------------
done
[11:55:05 root@centos8 ~]#./continue_for.sh
0
1
2
3
4
0
1
2
3
4
0
1
2
3
4
0
1
2
3
4
0
1
2
3
4
0
1
2
3
4
0
1
2
3
4
0
1
2
3
4
0
1
2
3
4
0
1
2
3
4
```

### 4.2.6 循环控制语句 break

break [N]：提前结束第N层整个循环，最内层为1层

**格式：**

```bash
while CONDITION1;do
CMD1
...
if CONDITION2;then
break
fi
CMDn
...
done
```

**范例：**

```bash
for ((i=0;i<10;i++));do
for ((j=0;j<10;j++));do
[ $j -eq 5 ] && break
echo $j
done
echo ---------------------
done
[11:59:08 root@centos8 ~]#./break_for.sh
0
1
2
3
4
-

0
1
2
3
4
-

0
1
2
3
4
-
```

**范例：**

```bash
NUM=$[RANDOM%10]

while read -p "请输入0-9之间的数字：" INPUT;do
if [ $INPUT -eq $NUM ];then
echo "恭喜猜对了！"
break
elif [ $INPUT -gt $NUM ];then
echo "数字太大了，重新猜！"
else
echo "数字太小了，重新猜！"
fi
done
```

### 4.2.7 循环控制 shift命令

shift [n]用于将参量列表list左移指定次数，缺省为左移一次。

参量列表list一旦被移动，最左端的那个参数就从列表中删除。while循环遍历位置参量列表时，常用到shift

**范例：doit.sh**

```bash
until [ -z "$1" ]
do
echo "$1"
shift
done
[14:18:08 root@centos8 ~]#./doit.sh a b c d
a
b
c
d
```

**范例：创建用户**

```bash
if [ $# -eq 0 ];then
echo "Usage: `basename $0` user1 user2 ..."
exit
fi

while [ "$1" ];do
if id $1 &> /dev/null;then
echo $1 is exist
else
useradd $1
echo "$1 is created"
fi
shift
done
echo "All user is created"
[14:23:44 root@centos8 ~]#./shift_batch_usr.sh zz cy
zz is exist
cy is created
All user is created
```

### 4.2.8 while 特殊用法 while read

**while 循环的特殊用法，遍历文件或文本的每一行**

**格式：**

```bash
while read line;do
循环体
done < /PATH/FORM/SOMEFILE
```

**说明：依次读取/PATH/FORM/SOMEFILE文件中的每一行，且将行赋值给变量line**

**范例：**

```bash
[14:24:00 root@centos8 ~]#echo zhangzhuo | read x ; echo $x

[14:27:23 root@centos8 ~]#echo zhangzhuo | while read x ;do echo $x;done
zhangzhuo
[14:27:58 root@centos8 ~]#echo zhang | { read x; echo $x ;}
zhang
[14:28:20 root@centos8 ~]#echo zhang | ( read x; echo $x )
zhang
[14:28:33 root@centos8 ~]#echo zhang cheng wang | (read X Y Z; echo $X $Y $Z)
zhang cheng wang
[14:29:07 root@centos8 ~]#echo zhang cheng wang | while read X Y Z;do echo $X $Y $Z;done
zhang cheng wang
```

**范例：**

```bash
WARNING=80
df | sed -rn '/^\/dev/s#.* ([0-9]{1,3})%.*#\1#p' | while read DEVICEUSE;do
echo $DEVICEUSE
if [ $DEVICEUSE -gt $WARNING ];then
echo Disk will be full ftom `hostname -I` | mail -s "disk warning" 1191400158@qq.com
fi
done
```

**范例：找到ssh连接本主机失败超过三次的ip加入到防火墙中**

```bash
MAX=3
lastb | sed -rn '/ssh:/s#.* ([0-9.]{1,4}{3}[0-9]{1,3}) .*#\1#p' | sort | uniq -c | while read count ip ;do
if [ $count -gt $MAX ];then
echo $ip
iptables -A INPUT -s $ip -j REJECT
fi
done
```

**范例：查看/sbin/nologin的shell类型的用户名和UID**

```bash
while read passwd ;do
if [[ $passwd =~ /sbin/nologin ]];then
echo $passwd | cut -d: -f1,3
fi
done < /etc/passwd
```

### 4.2.9 循环与菜单 select

**格式：**

```bash
select NAME [in WORDS ... ;]do COMMANDS;done
```

select variable in list ;do
循环体命令
done

**说明：**

* select 循环主要用于创建菜单，按数字顺序排列的菜单项显示在标志错误上，并显示PS3提示符，等待用户输入
* 用户输入菜单列表中的某个数字，执行相应的命令
* 用户输入被保存在内置变量REPLY中
* select是个无限循环体，因此要用break命令退出循环，或用exit命令终止脚本。也可以按ctrl+c退出循环
* select经常和case联合使用
* 与for循环类似，可以省略in list，此时使用位置参量

**范例:**

```bash
sum=0
PS3="请点菜（1-4）："
select MENU in 北京烤鸭 佛跳墙 小龙虾 点菜结束;do
case $REPLY in
1)
echo $MENU 价格是 100
let sum+=100
;;
2)
echo $MENU 价格是 88
let sum+=88
;;
3)
echo $MENU 价格是 66
let sum+=66
;;
4)
echo "点菜结束，退出"
break
;;
*)
echo "点菜错误，重新选择"
;;
esac
done
echo "总价格是：$sum"
```

# 五、函数 function

## 5.1 函数介绍

函数function是由若干条shell命令组成的语句块，实现代码重用和模块化编程

它与shell程序形式上是相似的，不同的是它不是一个单独的进程，不能独立运行，而是shell程序的一部分

**函数和shell程序区别**

* Shell程序在子Shell中运行
* 函数在当前Shell中运行。因此在当前Shell中，函数可对shell中变量进行修改

## 5.2 管理函数

函数由俩部分组成：函数名和函数体

帮助参看：help function

### 5.2.1 定义函数

```bash
#语法一
func_name(){
函数体
}
#语法二
function func_name{
函数体
}
#语法三
function func_name(){
函数体
}
```

### 5.2.2 查看函数

```bash
#查看当前已定义的函数名
declare -F
#查看当前已定义的函数定义
declare -f
#查看指定当前已定义的函数名
declare -f func_name
#查看当前已定义的函数名定义
declare -F func_name
```

### 5.2.3 删除函数

格式：

```bash
unset func_name
```

## 5.3 函数调用

**函数的调用方式**

* 可在交互式环境下定义函数
* 可将函数放在脚本文件中作为它的一部分
* 可放在只包含函数的单独文件中

**调用**：函数只有被调用才会执行，通过给定函数名调用函数，函数名出现的地方，会被自动替换为函数代码

**函数的生命周期**：被调用时创建，返回时终止

### 5.3.1 交互式环境调用函数

交互式环境下定义和使用函数

**范例：**

```bash
[15:18:30 root@centos8 ~]#dir(){

> ls -l
> }
[15:23:24 root@centos8 ~]#dir
 total 36
-rwxr-xr-x 1 root root 481 Dec 26 11:58 break_for.sh
-rwxr-xr-x 1 root root 486 Dec 26 11:53 continue_for.sh
```

**范例：实现判断Centos的主版本**

```bash
[15:23:27 root@centos8 ~]#centos_version(){
> sed -rn 's#^.* +([0-9]+)\..*#\1#p' /etc/redhat-release
> }
 [15:25:12 root@centos8 ~]#centos_version
 8
```

### 5.3.2 在脚本中定义及使用函数

函数在使用前必须定义，因此应将函数定义放在脚本开始部分，直至shell首次发现它后才能使用，调用函数仅使用其函数名即可

```bash
hello(){
echo "Hello date is `date +%F`"
}
echo "now going to the function hello"
hello
echo "back from the function"
[15:29:59 root@centos8 ~]#./func1.sh
now going to the function hello
Hello date is 2020-12-26
back from the function
```

### 5.3.3 使用函数文件

可以将经常使用的函数存入一个单独的函数文件，然后将函数文件载入shell，在进行调用函数

文件名可以任意选取，但最好与相关任务有某种联系，例如：functions

一旦函数文件载入shell，就可以在命令行或脚本中调用函数。可以使用delcare -f或set命令查看所有定义的函数，其输出列表包括已经载入shell的所有函数

若要改动函数，首先用unset命令从shell中删除函数。改动完毕后，在重新载入此文件

**实现函数文件的过程：**

* 创建函数文件，只存放函数的定义
* 在shell脚本或交互式shell中调用函数文件，格式如下：

```bash
. filename 或 source filename
```

**范例：**

```bash
[15:49:02 root@centos8 ~]#cat functions.sh
#!/bin/bash
hello(){
echo Run hello Function
}
hello2(){
echo Run hello2 Function
}
[15:48:33 root@centos8 ~]#. functions.sh
[15:48:42 root@centos8 ~]#hello
Run hello Function
[15:48:46 root@centos8 ~]#hello2
Run hello2 Function
[15:48:49 root@centos8 ~]#declare -f hello hello2
hello ()
{
echo Run hello Function
}
hello2 ()
{
echo Run hello2 Function
}
```

## 5.4 函数返回值

函数的执行结果返回值：

* 使用echo等命令进行输出
* 函数体中调用命令的输出结果

函数的退出状态码：

* 默认取决于函数中执行的最后一条命令的退出状态码
* 自定义退出状态码，其格式为：
  * return              从函数中返回，用最后状态命令决定返回值
  * return 0           无错误返回
  * return 1-255     有错误返回

## 5.5 环境函数

类似于环境变量，也可以定义环境函数，使子进程也可以使用父进程定义的函数

**定义环境函数：**

```bash
export -f function_name
declare -xf function_name
```

**查看环境函数：**

```bash
export -f
declare -xf
```

## 5.6 函数参数

**函数可以接受参数：**

* 传递参数给函数：在函数后面以空白分割给定参数列表，如 testfunc arg1 arg2 ...
* 在函数体中当中，可使用$1,$2,...调用这些参数；还可以使用$@,$*,$#等特殊变量

**范例：实现进度条功能**

```bash
print_chars(){
#传入的第一个参数指定要打印的字符串
local char="$1"
#传入的第二个参数指定要打印多少次指定的字符串
local number="$2"
local c
for ((c=0;c<number;++c));do
printf "$char"
done
}
COLOR=32
declare -i end=50
for ((i=1;i<=end;i++));do
printf "\e[1;${COLOR}m\e[80D["
print_chars "#" $i
print_chars " " $((end - i))
printf "] %3d%%\e[0m" $((i * 2))
sleep 0.1s
done
echo
```

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-a19ce447.png)

## 5.7 函数变量

**变量作用域：**

* 普通变量：只在当前shell进程有效，为执行脚本会启动专用子shell进程；因此，本地变量的作用范围是当前shell脚本程序文件，包括脚本中的函数
* 环境变量：当前shell和子shell有效
* 本地变量：函数的生命周期；函数结束时变量自动销毁

**注意：**

* 如果函数中定义了普通变量，且名称和局部变量相同，则使用本地变量
* 由于普通变量和局部变量会冲突，建议在函数中只使用本地变量

**在函数中定义本地变量的方法**

```bash
local NAME=VALUE
```

## 5.8 函数递归

函数递归：函数直接或间接调用自身，注意递归层数，可能会陷入死循环

**递归示例：**

阶乘是基斯顿·卡曼于1808年发明的运算符号，是数学术语，一个正整数的阶乘是所有小于及等于该数的正整数的积，并且0和1的阶乘为1，自然数n的阶乘写作n！

```bash
n!=1*2*3*....*n

阶乘亦可以递归方式定义：n!=1,n!=(n-1)!*n

n!=n(n-1)(n-2)...1

n(n-1)!=n(n-1)(n-2)!
```

**范例：fact.sh**

```bash
fact(){if [ $1 -eq 0 -o $1 -eq 1 ];thenecho 1elseecho $[$1*$(fact $[$1-1])]fi}fact $1
```

**范例：测试递归的嵌套深度**

```bash
test(){
let i++
echo i=$i
test
}
test
```

fork炸弹是一种恶意程序，它的内部是一个不断在fork进程的无限循环，实质是一个简单的递归程序。由于程序是递归的，如果没有任何限制，这会导致这个简单的程序迅速耗尽系统里面的所有资源

参考：[https://en.wikipedia.org/wiki/Fork_bomb](https://en.wikipedia.org/wiki/Fork_bomb)

**函数实现：**

```bash
:(){:|:&};:
bomb(){ bomb | bomb &};bomb
```

**脚本实现**

```bash
./$0|./$0&
```

**后面的&表示后台执行**

# 六、其他脚本相关

## 6.1 信号捕捉 trap

```bash
#进程收到系统发出的指定信号后，将执行自定义指令，而不会执行原操作
trap '触发指令' 信号

#忽略信号的操作
trap '' 信号

#恢复信号的操作
trap '-' 信号

#列出自定义信号操作
trap -p

#当脚本退出时，执行finish函数
trap finish EXIT
```

**范例：**

```bash
trap "echo 'Press ctrl+c or ctrl+\'" int quit
trap -p
for ((i=0;i<=10;i++))
do
sleep 1
echo $i
done

trap '' int
trap -p
for((i=11;i<=20;i++))
do
sleep 1
echo $i
done

trap '-' int
trap -p
for((i=21;i<=30;i++))
do
sleep 1
echo $i
done
```

**范例：当脚本正常或异常退出时，也会执行finish函数**

```bash
finish(){
echo finish | tee -a /root/finish.log
}

trap finish exit
while true ;do
echo running
sleep 1
done
```

## 6.2 创建临时文件mktemp

mktemp命令用于创建并显示临时文件，可避免冲突

**格式：**

```bash
mktemp [OPTION]... [TEMPLATE]
说明:TEMPLATE:filenameXXX,X至少要出现三个

常见选项：

-d                    创建临时目录
-p DIR或--tmpdir=DIR  指明临时文件所存放目录位置
```

**范例：**

```bash
[10:40:10 root@centos8 ~]#mktemp
/tmp/tmp.5pZirsD5E2
[10:42:58 root@centos8 ~]#mktemp --tmpdir=/testdir testXXXXXX
[10:43:11 root@centos8 ~]#tmpdir=`mktemp -d /tmptestdirXXX`
```

**范例：**

```bash
DIR=`mktemp -d /tmp/trash-$(date +%F_%H-%M-%S)XXXXXX`
mv $* $DIR
echo $* is move to $DIR
```

## 6.3 安装复制文件

install 功能相当于cp,chmod,chown,chgrp等相关工具的集合

**install命令格式：**

```bash
install [OPTION]... [-T] SOURCE DEST 单文件
install [OPTION]... SOURCE... DIRECTORY
install [OPTION]... -t DIRECTORY SOURCE...
install [OPTION]... -d DIRECTORY... 创建空目录
```

**选项：**

```bash
-m MODE,默认755
-o OWNER
-g GROUP
-d DIRNAME 目录
```

**范例：**

```bash
[10:54:33 root@centos8 ~]#install -m 700 -o zhang -g zhang finish.log zzzz
[10:55:13 root@centos8 ~]#install -m 770 -d /testdir/install
```

## 6.4 交互式转化批处理工具expect

expect是由Don Libes基于Tcl(Tool Command Language)语言开发的，主要应用于自动化交互式操作的场景，借助expect处理交互式的命令，可以将交互过程如：ssh登录，ftp登录等写在一个脚本上，使之自动化完成。尤其适用于需要对多台服务器执行相同操作的环境中，可以大大提高系统管理人员的工作效率

**范例：安装expect及mkpasswd工具**

```bash
[10:56:02 root@centos8 ~]#yum -y install expect
[11:01:16 root@centos8 ~]#rpm -ql expect

[11:02:41 root@centos8 ~]#mkpasswd -l 15 -d 3 -C 5
LB7g3L[9hkiMmaV
```

**expect语法：**

```bash
expect [选项] [ -c cmds ] [ [ -[-f|b] ]  cmdfile ] [ args ]
```

**常见选项：**

* -c：从命令行执行expect脚本，默认expect是交互地执行的
* -d：可以输入输出调试信息

**示例：**

```bash
expect -c 'expect "\n" {send "pressed enter\n"}'
expect -d ssh.exp
```

**expect中相关命令**

* spawn               启动新的进程
* expect               从新进程接收字符串
* send                  用于向进程发送字符串
* interact              允许用户交互
* exp_continue    匹配多个字符串在执行动作后加此命令

**expect最常用的语法(tcl语言：模式-动作)**

**单一分支模式语法：**

```bash
[11:19:03 root@centos8 ~]#expect
expect1.1> expect "hi" {send "You said hi\n"}
sssssssssssssshi
You said hi
匹配到hi后，会输出you said hi，并换行
```

**多分支模式语法：**

```bash
[11:22:16 root@centos8 ~]#expect
expect1.1> expect "hi" {send "hi"} "hehe" {send "hehe\n"} "bye" {send ""sssss" }
```

**范例1：**

```bash
#!/usr/bin/expect
spawn scp /etc/redhat-release 192.168.10.102:/root
expect {
"yes/no" { send "yes\n";exp_continue }
"password" { send "123456\n" }
}
expect eof
[11:29:02 root@centos8 ~]#expect expect.sh
```

**范例2：**

```bash
#!/usr/bin/expect
spawn ssh 192.168.10.102
expect {
"yes/no" { send "yes\n";exp_continue }
"password" { send "123456\n"}
}
interact
[11:35:01 root@centos8 ~]#expect expect_ssh_ubuntu.sh
```

**范例3：expect变量**

```bash
#!/usr/bin/expect
set ip 192.168.10.102
set user root
set password 123456
set timeout 10
spawn ssh $user@$ip
expect {
"yes/no" { send "yes\n";exp_continue }
"password" { send "${password}\n"}
}
interact
[11:35:01 root@centos8 ~]#expect expect_ssh_ubuntu.sh
```

**范例4：expect 位置参数**

```bash
#!/usr/bin/expect
set ip [lindex $argv 0]
set user [lindex $argv 1]
set password [lindex $argv 2]
spawn ssh $user@$ip
expect {
"yes/no" { send "yes\n";exp_continue }
"password" { send "${password}\n"}
}
interact
[11:42:30 root@centos8 ~]#./expect4.sh 192.168.10.102 zhang 123456
```

**范例5：expect执行多个命令**

```bash
#!/usr/bin/expect
set ip [lindex $argv 0]
set user [lindex $argv 1]
set password [lindex $argv 2]
spawn ssh $user@$ip
expect {
"yes/no" { send "yes\n";exp_continue }
"password" { send "${password}\n"}
}
expect "]#" { send "useradd cy\n" }
expect "]#" { send "echo -e '123456' | passwd  --stdin cy\n" }
expect "]#" { send "exit\n" }
expect eof
[14:02:07 root@centos8 ~]#./expect5.sh 192.168.10.71 root 123456
俩个主机都是centos不然设置密码不能用这个方法
```

**范例6：shell脚本调用expect**

```bash
#!/bin/bash
ip=$1
user=$2
password=$3
expect <<EOF
set timeout 20
spawn ssh $user@$ip
expect {
"yes/no" { send "yes\n";exp_continue }
"password" { send "$password\n"}
}
expect "]#" { send "useradd hehe\n" }
expect "]#" { send "echo 123456 | passwd --stdin hehe\n" }
expect "]#" { send "exit\n" }
expect eof
EOF
```

**范例7：shell脚本利用循环调用expect在Centos和Ubuntu上批量创建用户**

```bash
#!/bin/bash
#
#********************************************************************
#Author:zhangzhuo
#QQ: 1191400158
#Date: 2020-12-29
#FileName：expect7.sh
#URL: https://www.zhangzhuo.ltd
#Description：The test script
#Copyright (C): 2020 All rights reserved
#********************************************************************
NET=192.168.10
user=root
password=123456
IPLIST="
71
102
"

for ID in $IPLIST;do
ip=$NET.$ID

expect <<EOF
set timeout 20
spawn ssh $user@$ip
expect {
"yes/no" { send "yes\n";exp_continue }
"password" { send "${password}\n" }
}
expect "#" { send "useradd test\n" }
expect "#" { send "useradd txt\n" }
expect "#" { send "exit\n" }
expect eof
EOF
done
```

**范例8：**

```bash
#!/bin/bash
#
#********************************************************************
#Author:zhangzhuo
#QQ: 1191400158
#Date: 2020-12-29
#FileName：expect8.sh
#URL: https://www.zhangzhuo.ltd
#Description：The test script
#Copyright (C): 2020 All rights reserved
#********************************************************************
NET=192.168.10
user=root
password=123456
IPLIST="
71
"

for ID in $IPLIST;do
ip=$NET.$ID

expect <<EOF
set timeout 20
spawn ssh $user@$ip
expect {
    "yes/no" { send "yes\n";exp_continue }
    "password" { send "${password}\n" }
}
expect "#" { send "sed -i 's/SELINUX=enforcing/SELINUX=disabled/' /etc/selinux/config\n" }
expect "#" { send "setenforce 0\n" }
expect "#" { send "exit\n" }
expect eof
EOF
done
```

# 七、数组 array

## 7.1 数组介绍

**变量：存储单个元素的内存空间**

**数组：存储多个元素的连续的内存空间，相当于多个变量的集合**

**数组名和索引**

* 索引的编号从0开始，属于数值索引
* 索引可支持使用自定义的格式，而不仅是数值格式，即为关联索引，bash4.0版本之后开始支持
* bash的数组支持稀疏格式(索引不连续)

## 7.2 声明数组

```bash
#普通数组可以不事先声明，直接使用
declare -a ERRAY_NAME
#关联数组必须事先声明，在使用
declare -A ARRAY_NAME
```

**注意：俩者不可相互转换**

## 7.3 数组赋值

数组元素的赋值

**(1)一次只赋值一个元素**

```bash
ARRAY_NAME[INDEX]=VALUE
```

范例：

```bash
[14:47:05 root@centos8 ~]#weekdays[0]="zhang"
[14:56:14 root@centos8 ~]#weekdays[4]="zhuo"
```

**(2)一次赋值全部元素**

```bash
ARRAY_NAME=("VAL1" "VAL2" "VAL3" ...)
```

范例：

```bash
[14:56:22 root@centos8 ~]#title=("ceo" "coo" "cto")
[14:58:10 root@centos8 ~]#num=({1..10})
[14:58:22 root@centos8 ~]#alpha=({a..g})
[14:58:36 root@centos8 ~]#file=(*.sh)
```

**(3)只赋值特点元素**

```bash
ARRAY_NAME=([0]="VAL1" [3]="VAL2" ...)
```

**(4)交互式数组值对赋值**

```bash
read -a ARRAY
```

**范例：俩种格式不能相互转换**

```bash
[14:58:46 root@centos8 ~]#declare -A course
[15:01:07 root@centos8 ~]#declare -a course
-bash: declare: course: cannot convert associative to indexed array
[15:01:14 root@centos8 ~]#file=(*.sh)
[15:01:30 root@centos8 ~]#declare -A file
-bash: declare: file: cannot convert indexed to associative array
```

**范例：关联数组示例**

```bash
[15:01:38 root@centos8 ~]#i=a
[15:02:26 root@centos8 ~]#j=1
[15:02:29 root@centos8 ~]#declare -A arr
[15:02:37 root@centos8 ~]#arr[$i$j]=zhang
[15:02:57 root@centos8 ~]#j=2
[15:03:02 root@centos8 ~]#arr[$i$j]=cy
[15:03:21 root@centos8 ~]#echo ${arr[*]}
cy zhang
[15:03:34 root@centos8 ~]#echo ${arr[a1]}
zhang
[15:04:16 root@centos8 ~]#echo ${arr[a2]}
cy
```

## 7.4 显示所有数组

**显示所有数组：**

```bash
[15:04:19 root@centos8 ~]#declare -a
```

范例：

```bash
[15:04:19 root@centos8 ~]#declare -a
declare -a BASH_ARGC=()
declare -a BASH_ARGV=()
declare -a BASH_COMPLETION_VERSINFO=([0]="2" [1]="7")
```

## 7.5 引用数组

**引用数组元素**

```bash
${ARRAY_NAME[INDEX]}
#如果省略[INDEX]表示引用下标为0的元素
```

范例：

```bash
[15:09:09 root@centos8 ~]#declare -a title=([0]="ceo" [1]="coo" [2]="cto")
[15:09:13 root@centos8 ~]#echo ${title[1]}
coo
[15:09:15 root@centos8 ~]#echo ${title[2]}
cto
[15:09:21 root@centos8 ~]#echo ${title[3]}
```

**引用数组所有元素**

```bash
${ARRAY_NAME[*]}
${ARRAY_NAME[@]}
```

范例：

```bash
[15:09:23 root@centos8 ~]#echo ${title[@]}
ceo coo cto
[15:10:50 root@centos8 ~]#echo ${title[*]}
ceo coo cto
```

**数组的长度，即数组中元素的个数**

```bash
${#ARRAY_NAME[*]}
${#ARRAY_NAME[@]}
```

范例：

```bash
[15:10:54 root@centos8 ~]#echo ${#title[*]}
3
[15:12:18 root@centos8 ~]#echo ${#title[@]}
3
```

## 7.6 删除数组

**删除数组中的某个元素，会导致稀疏格式**

```bash
unset ARRAY[INDEX]
```

```bash
[15:12:21 root@centos8 ~]#echo ${title[*]}
ceo coo cto
[15:14:47 root@centos8 ~]#unset title[1]
[15:14:59 root@centos8 ~]#echo ${title[*]}
ceo cto
```

**删除整个数组**

```bash
nuset ARRAY
```

范例：

```bash
[15:15:03 root@centos8 ~]#unset title
[15:15:59 root@centos8 ~]#echo ${title[*]}
```

## 7.7 数组数据处理

**数组切片：**

```bash
${ARRAY[@]:offset:number}
offset      #要跳过的元素个数
number      #要取出的元素个数
#取偏移量之后的所有元素
{ARRAY[@]:offset}
```

范例：

```bash
[15:19:31 root@centos8 ~]#echo ${num[@]:2:3}
2 3 4
[15:19:53 root@centos8 ~]#echo ${num[@]:6}
6 7 8 9 10
```

**向数组中追加元素：**

```bash
ARRAY[${#ARRAY[*]}]=value
ARRAY[${#ARRAY[@]}]=value
```

范例：

```bash
[15:20:02 root@centos8 ~]#num[${#num[@]}]=11
[15:22:00 root@centos8 ~]#echo ${#num[*]}
12
[15:22:18 root@centos8 ~]#echo ${num[*]}
0 1 2 3 4 5 6 7 8 9 10 11
```

## 7.8 关联数组

```bash
declare -A ARRAY_NAME
ARRAY_NAME=([idx_name]='val1' [idx_name]='val2' ...)
```

**注意：关联数组必须先声明在调用**

范例：

```bash
[15:24:06 root@centos8 ~]#name[ceo]=zhang
[15:26:37 root@centos8 ~]#name[cto]=wang
[15:26:48 root@centos8 ~]#name[coo]=cy
[15:26:59 root@centos8 ~]#echo ${name[ceo]}
cy
[15:27:11 root@centos8 ~]#echo ${name[cto]}
cy
[15:27:32 root@centos8 ~]#echo ${name[coo]}
cy
[15:27:35 root@centos8 ~]#declare -A name
-bash: declare: name: cannot convert indexed to associative array
[15:27:56 root@centos8 ~]#unset name
[15:28:03 root@centos8 ~]#declare -A name
[15:28:11 root@centos8 ~]#name[ceo]=zhang
[15:28:19 root@centos8 ~]#name[cto]=wang
[15:28:31 root@centos8 ~]#name[coo]=cy
[15:28:40 root@centos8 ~]#echo ${name[*]}
zhang wang cy
```

**范例：关联数组**

```bash
[15:28:59 root@centos8 ~]#declare -A student
[15:30:20 root@centos8 ~]#student[name1]=lijun
[15:30:36 root@centos8 ~]#student[name2]=ziqiang
[15:30:44 root@centos8 ~]#student[age1]=18
[15:31:04 root@centos8 ~]#student[age2]=16
[15:31:10 root@centos8 ~]#student[gender1]=m
[15:31:30 root@centos8 ~]#student[city1]=najing
[15:33:05 root@centos8 ~]#student[city2]=anhui
[15:33:13 root@centos8 ~]#student[gender2]=m
[15:33:36 root@centos8 ~]#student[name50]=alice
[15:33:50 root@centos8 ~]#student[name3]=tom
[15:35:09 root@centos8 ~]#for i in {1..50};do echo student[name$i]=${student[name$i]};done
```

## 7.9 范例

**范例：生产10个随机数保存于数组中，并找出其最大值和最小值**

```bash
declare -i min max
declare -a nums
for ((i=0;i<10;i++));do
nums[$i]=$RANDOM
[ $i -eq 0 ] && min=${nums[0]} && max=${nums[0]} && continue
[ ${nums[$i]} -gt $max ] && max=${nums[$i]} && continue
[ ${nums[$i]} -lt $min ] && min=${nums[$i]}
done
echo "ALL numbers are ${nums[*]}"
echo Max is $max
echo Min is $min
```

**范例：编写脚本，定义一个数组，数组中的元素对应的值是/var/log目录下所有.log结尾的文件；统计出其下标偶数的的文件中的行数之和**

```bash
declare -a filename
filename=(/var/log/*.log)
for i in $(seq 0 $[${#filename[*]}-1]);do
if [ $[$i%2] -eq 0 ];then
let lines+=$(wc -l ${filename[$i]} | cut -d' ' -f1)
fi
done
echo "Lines: $lines"
```

# 八、字符串处理

## 8.1 字符串切片

### 8.1.1 基于偏移量取字符串

```bash
#返回字符串变量var的长度
${#var}

#返回字符串变量var中第offset个字符后(不包括第offset个字符)的字符开始，到最后的部分，
offset的取值在0到${#var}-1之间(bash4.2后，允许为负值)
${var:offset}

#返回字符串变量var中第offset个字符后(不包括offset个字符)的字符开始，长度为number的部分
${var:offset:bunber}

#取字符串的最右侧几个字符，注意：冒号后必须有一空白字符
${var: -length}

#从最左侧跳过offset字符，一直向右取到距离最右侧lengh个字符之前的内容，即：掐头去尾
${var:offset:-length}

#先从最右侧向左取到length个字符开始，再向右取到距离最右侧offset个字符之间的内容，
注意： -length前空格
${var: -length:-offset}
```

**范例：**

```bash
[16:02:06 root@centos8 ~]#str=abcdef我你他
[16:14:10 root@centos8 ~]#echo ${#str}
9
[16:14:21 root@centos8 ~]#echo ${str:2}
cdef我你他
[16:14:30 root@centos8 ~]#echo ${str:2:3}
cde
[16:14:36 root@centos8 ~]#echo ${str: -3}
我你他
[16:14:48 root@centos8 ~]#echo ${str:-3}
abcdef我你他
[16:15:00 root@centos8 ~]#echo ${str:2:-3}
cdef
[16:15:16 root@centos8 ~]#echo ${str: -2:-3}
-bash: -3: substring expression < 0
[16:15:35 root@centos8 ~]#echo ${str: -3:-2}
我
[16:15:43 root@centos8 ~]#echo ${str:-3:-2}
abcdef我你他
[16:15:52 root@centos8 ~]#echo ${str: -5:-2}
ef我
```

### 8.1.2 基于模式取字串

```bash
#其中word可以是指定的任意字符，自左而右，查找var变量所存储的字符串，第一次出现的word，
删除字符串开头至第一次出现word字符串(含)之间的所有字符
${var#*word}

#同上，贪婪模式，不同的是，删除的是字符串开头至最后一次右word指定的字符之间的所有内容
${var##*word}:
```

**范例：**

```bash
[16:16:00 root@centos8 ~]#file="var/log/messages"
[16:21:46 root@centos8 ~]#echo ${file#*/}
log/messages
[16:22:00 root@centos8 ~]#echo ${file##*/}
messages
```

```bash
#其中word可以是指定的任意字符，功能:自右而左，查找var变量所存储的字符串中，第一次出现
的word，删除字符串最后一个字符向左至第一次出现word字符串(含)之间的所有字符
${var%word*}

#同上，只不过删除字符串最右侧的字符向左至最后一次出现word字符之间的所有字符
${var%%word*}
```

范例：

```bash
[16:28:01 root@centos8 ~]#file="var/log/messages"
[16:28:03 root@centos8 ~]#echo ${file%/*}
var/log
[16:28:20 root@centos8 ~]#echo ${file%%/*}
var
```

范例：

```bash
[16:28:24 root@centos8 ~]#url=http://www.zhangzhuo.ltd:8080
[16:29:10 root@centos8 ~]#echo ${url##*:}
8080
[16:29:23 root@centos8 ~]#echo ${url%%:*}
http
```

## 8.2 查找替换

```bash
#查找var所表示的字符串中，第一次被pattern所匹配到的字符串，以substr替换之
${var/pattern/substr}

#查找var所表示的字符串中，所有能被pattern所匹配到的字符串，以substr替换之
${var//pattern/substr}

#查找var所表示的字符串中，行首被pattern所匹配到的字符串，以substr替换之
${var/#pattern/substr}

#查找var所表示的字符串中，行尾被pattern所匹配到的字符串，以substr替换之
${var/%pattern/substr}
```

## 8.3 查找并删除

```bash
#删除var表示的字符串中第一次被pattern匹配到的字符串
${var/pattern}

删除var表示的字符串中所有被pattern匹配到的字符串
${var//pattern}

删除var表示的字符串中所有以pattern为行首匹配到的字符串
${var/#pattern}

删除var所表示的字符串中所有以pattern为行尾所匹配到的字符串
${var/%pattern}
```

## 8.4 字符大小写转换

```bash
#把var中的所有小写字母转换为大写
${var^^}

#把var中的所有大写字母转换为小写
${var,,}
```

# 九、高级变量

## 9.1 高级变量赋值

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-73d71686.png)

**范例：**

```bash
[16:29:36 root@centos8 ~]#title=ceo
[16:33:22 root@centos8 ~]#name=${title-zhang}
[16:33:40 root@centos8 ~]#echo $name
ceo
[16:33:51 root@centos8 ~]#title=
[16:34:23 root@centos8 ~]#name=${title-zhang}
[16:34:28 root@centos8 ~]#echo $name

[16:34:30 root@centos8 ~]#unset title
[16:34:39 root@centos8 ~]#name=${title-zhang}
[16:34:42 root@centos8 ~]#echo $name
zhang
```

**范例：**

```bash
[16:34:46 root@centos8 ~]#title=ceo
[16:35:48 root@centos8 ~]#name=${title:-zhang}
[16:36:03 root@centos8 ~]#echo $name
ceo
[16:36:09 root@centos8 ~]#title=
[16:36:14 root@centos8 ~]#name=${title:-zhang}
[16:36:17 root@centos8 ~]#echo $name
zhang
[16:36:35 root@centos8 ~]#unset title
[16:36:43 root@centos8 ~]#name=${title:-zhang}
[16:36:47 root@centos8 ~]#echo $name
zhang
```

## 9.2 高级变量用法-有类型变量

Shell变量一般是无类型的，但是bash Shell提供了declare和typeset俩个命令用于指定变量的类型，俩个命令是等价的

```bash
declare [选项] 变量名

选项：
-r 声明或显示只读变量
-i 将变量定义为整型数
-a 将变量定义为数组
-A 将变量定义为关联数组
-f 显示已定义的所有函数名及其内容
-F 仅显示已定义的所有函数名
-x 声明或显示环境变量和函数,相当于export
-l  声明变量为小写字母   declare -l var=UPPER
-u  声明变量为大写字母 declare -u var=lower
```

## 9.3 变量间接引用

eval命令将会首先扫描命令行进行所有的置换，然后再执行该命令。该命令适用于那些一次扫描无法实现其功能的变量,该命令对变量进行两次扫描

**范例：**

```bash
[16:36:50 root@centos8 ~]#CMD=whoami
[16:40:29 root@centos8 ~]#echo $CMD
whoami
[16:40:33 root@centos8 ~]#eval $CMD
root
[16:40:45 root@centos8 ~]#n=10
[16:40:50 root@centos8 ~]#echo {0..$n}
{0..10}
[16:41:02 root@centos8 ~]#eval echo {0..$n}
0 1 2 3 4 5 6 7 8 9 10
[16:41:18 root@centos8 ~]#for i in `eval echo {1..$n}`;do echo i=$i;done
i=1
i=2
i=3
i=4
i=5
i=6
i=7
i=8
i=9
i=10
[16:42:14 root@centos8 ~]#i=a
[16:42:19 root@centos8 ~]#j=1
[16:42:22 root@centos8 ~]#$i$j=hello
-bash: a1=hello: command not found
[16:42:33 root@centos8 ~]#eval $i$j=hell
[16:42:46 root@centos8 ~]#echo $i$j
a1
```

### 9.3.2 间接变量引用

如果第一个变量的值是第二个变量的名字，从第一个变量引用第二个变量的值就称为间接变量引用variable1的值是variable2，而variable2又是变量名，variable2的值为value，间接变量引用是指通过variable1获得变量值value的行为

variable1=variable2
variable2=value

**bash shell提供了俩种格式实现间接变量引用**

```bash
#方法1
eval tempvar=\$$variable1 
#方法2 
tempvar=${!variable1}
```

**范例：**

```bash
[16:42:54 root@centos8 ~]#ceo=name
[16:45:16 root@centos8 ~]#name=zhang
[16:45:22 root@centos8 ~]#echo $ceo
name
[16:45:27 root@centos8 ~]#echo $$ceo
67706ceo
[16:45:38 root@centos8 ~]#echo $$
67706
[16:45:44 root@centos8 ~]#echo \$$ceo
$name
[16:45:53 root@centos8 ~]#eval echo \$$ceo
zhang
[16:46:05 root@centos8 ~]#eval tmp=\$$ceo
[16:46:20 root@centos8 ~]#echo $tmp
zhang
[16:46:28 root@centos8 ~]#echo ${!ceo}
zhang
```

**范例：**

```bash
[16:46:38 root@centos8 ~]#N1=N2
[16:47:13 root@centos8 ~]#N2=zhangzhuo
[16:47:20 root@centos8 ~]#eval NAME=\$$N1
[16:47:32 root@centos8 ~]#echo $NAME
zhangzhuo
[16:47:48 root@centos8 ~]#NAME=${!N1}
[16:48:02 root@centos8 ~]#echo $NAME
zhangzhuo
```

### 9.3.3 变量引用reference

```bash
ceo=zhang
title=ceo
declare -n ref=$title
[ -R ref ] && echo reference
echo $ref
ceo=cy
echo $ref
[16:50:38 root@centos8 ~]#./test.sh
reference
zhang
cy
```

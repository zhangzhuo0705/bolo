---
title: "3-Linux用户组和权限管理"
date: 2021-05-17T11:34:17+08:00
lastmod: 2021-05-17T11:34:41+08:00
draft: false
description: "梳理 Linux 安全模型、用户组配置与文件权限，说明权限管理的常见操作。"
cover: "https://b3logfile.com/bing/20200115.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["Linux系统基础知识"]
tags: ["linux"]
toc: true
---
# 一、Linux安全模型

资源分派：

* Authentication：认证，验证用户身份
* Authorization：授权，不同的用户设置不同权限
* Accouting|Audition：审计

当用户登录成功时，系统会自动分配令牌token，包括：用户标识和组成员等信息

## 1.1 用户

Linux 中每个用户是通过User id (UID)来唯一标识的

* 管理员：root,0
* 普通用户：1-60000 自动分配
  * 系统用户：1-499（centos6以前），1-999（centos7以后）
    * 对守护进程获取资源进行权限分配
  * 登录用户：500+（centos6以前），1000+（centos7之后）
    * 给用户进行交互式登录使用

## 1.2 用户组

Linux 中可以将一个或多个用户加入用户组中，用户组是通过Group ID（GUID）来唯一标识的。

* 管理员组：root，0
* 普通组：

系统组：1-499（centos6以前），1-999（centos7以后），对守护进程获取资源进行权限分配
普通组：500+（centos6以前），1000+（centos7以后），给用户使用

## 1.3 用户和组的关系

* 用户的主要组（primary group）：用户必须属于一个且只有一个主组，默认创建用户时会自动创建和用户名同名的组，作为用户的主要组，由于此组中只有一个用户，又称为私有组
* 用户的附加组（supplementary group）：一个用户可以属于零个或多个辅助组，附属组。

**范例：**

```bash
[19:24:31 root@centos7 ~]#id zhang
uid=1000(zhang) gid=1000(zhang) groups=1000(zhang),1001(mali)
```

## 1.4 安全上下文

Linux安全上下文Context：运行中的程序，即进程（process），已进程发起者的身份运行，进程所能够访问资源的权限取决于进程的运行者的身份
比如：分别以root和zhang的身份运行/bin/cat   /etc/shadow,得到的结果是不同的，资源能否能被访问，是由运行者身份决定，而非程序本身

范例：

```bash
[19:29:06 zhang@centos7 root]$cat /etc/shadow
cat: /etc/shadow: Permission denied
[19:29:14 root@centos7 ~]#cat /etc/shadow
root:$6$MNsR3yAcN729q1aF$3IK2gQ55A9ywQNw39TaykEOcrSAv0bmIKC93BIdm86R7/B0jEeX9iJDU99laNmqp8SwrGdS5AbKV65UCGzbwA/::0:99999:7:::
```

# 二、用户和组的配置文件

## 2.1 用户和组的主要配置文件

* /etc/passwd：用户及其属性信息（名称、UID、主组ID等）
* /etc/shadow：用户密码及其相关属性
* /etc/group：组及其属性信息
* /etc/gshadow：组密码及其相关属性

## 2.2 passwd文件格式

* login name：登录用名
* passwd：密码（x）
* UID：用户身份编号
* GID：登录默认所在组编号（1000）
* GECOS：用户全面或注释
* home directory：用户主目录（/home/zhang）
* shell：用户默认使用shell(/bin/bash)，**一个非常重要的shell（/sbin/nologin）这个表示这个用户不能登录一般一些系统用户都是这个默认shell**

## 2.3 shadow文件格式

* 登录用户名
* 用户密码
* 从1970年1月1日起到密码最近一次被更改的时间
* 密码再过几天可以被变更（0表示随时可以被变更）
* 密码再过几天必须被变更（99999表示永不过期）
* 密码过期前几天系统提醒用户（默认为一周）
* 密码过期几天后账号会被锁定
* 从1970年1月1日算起，多少天账号失效

更改密码加密算法：

```bash
[19:42:30 root@centos7 ~]#authconfig --passalgo=sha256 --update
```

密码的安全策略

* 足够长
* 使用数字、大写字母，小写字母及特殊字符中至少3种
* 使用随机密码
* 定期更换，不要使用最近曾经使用过的密码

范例：生成随机密码

```bash
[19:46:28 root@centos7 ~]#tr -dc "[:alnum:]" < /dev/urandom |head -c 20
Slo1LU7AvF6alYz50nzb
[19:47:00 root@centos7 ~]#openssl rand -base64 20
bskOML49n7XGgvCcg+OsNaR24eg=
```

生成随机密码：[https://suijimimashengcheng.51240.com/](https://suijimimashengcheng.51240.com/)

## 2.4 group文件格式

群组名称：就是群组名称
群组密码：通常不需要设定，密码是被记录在/etc/gshadow
GID：就是群组ID
以当前组为附加组的用户列表：多个用户间用逗号分割

## 2.5 gshdow文件格式

群组名称：就是群组名称
群组密码：
组管理员列表：组管理的列表，更改组密码和成员
以当前组为附加组的用户列表：多个用户间用逗号分割

# 三、用户和组管理命令

用户管理命令

* useradd
* usermod
* userdel

组账号维护命令

* groupadd
* groupmod
* groupdel

## 3.1 用户创建

useradd命令可以创建新的Linux用户

格式：

```bash
useradd [options] LOGIN
```

常见选项：

```bash
-u UID
-o 配合-u选项，不检查UID的唯一性
-g GID 指明用户所属基本组，可为组名，也可以GID
-c “COMMENT” 用户的注释信息
-d HOME_DIR 以指定的路径（不存在）为家目录
-s SHELL 指明用户的默认shell程序，可用列表在/etc/shells文件中
-G GROUP1[,GROUP2,...] 为用户指明附加组，组须事先存在
-N 不创建私用组做主组，使用users组做主组
-r 创建系统用户Centos 之前：ID<500，centos7以后ID<1000
-m 创建家目录，用于系统用户
-M 不创建家目录，用于非系统用户
-p 指定加密的密码
```

范例：

```bash
[20:08:54 root@centos7 ~]#useradd -r -u 48 -g apache -s /sbin/nologin -d /var/www -c "Apache" apache
```

**useradd命令默认值设定由/etc/default/useradd定义，ubuntu系统默认的配置文件只有SHELL开启其余没有开启需要自己设置**

```bash
[20:09:49 root@centos7 ~]#cat /etc/default/useradd
# useradd defaults file
GROUP=100
HOME=/home
INACTIVE=-1       #对应/etc/shadow文件第7列，即用户密码过期的宽限期
EXPIRE=           #对应/etc/shadow文件第8列，即用户账号的有效期
SHELL=/bin/bash
SKEL=/etc/skel    #这个目录下放置的是用户家目录下默认的文件，创建用户时会拷贝这里的文件到用户家目录
CREATE_MAIL_SPOOL=yes
```

显示或更改默认设置

```bash
useradd -D   显示
useradd -D -s SHELL
useradd -D -d BASE_DIR
useradd -D -g GROUP
```

新建用户相关文件

* /etc/default/useradd      创建用户默认配置文件
* /etc/skel/*                       用户家目录默认文件
* /etc/login.defs

批量创建用户

```bash
newusers passwd格式文件    格式文件就是跟/etc/passwd文件格式要一样
范例:
[20:27:29 root@centos7 ~]#cat username
zhang:x:1000:1000::/home/zhang:/bin/bash
apache:x:48:996:Apache:/var/www:/sbin/nologin
[20:27:49 root@centos7 ~]#newusers username
```

批量修改用户口令

```bash
echo username:passwd | chpasswd
范例：
[20:29:56 root@centos7 ~]#cat pw
zhang:123456
apache:123456
[20:30:04 root@centos7 ~]#chpasswd < pw
```

## 3.2 用户属性修改

usermod 命令可以修改用户属性

格式：

```bash
usermod [option] login
```

常见选项：

```bash
-u UID:新UID
-g GID:新主组
-G group1[,gourp2,...]:新附加组，原来的附加组将会被覆盖：若保留原有，则要同时使用-a选项
-s SHELL:新的默认shell
-c 'COMMENT':新的注释信息
-d HOME:新家目录不会自动创建，若要创建新家目录并移动原家数据，同时使用-m选项
-l login_name:新的名字
-L:lock指定用户，在/etc/shadow密码栏的增加！
-U:unlock指定用户，将/etc/shadow密码栏增加的！拿掉
-e YYYY-MM-DD:指明用户账号过期日期
-f INACTIVE:设定非活动期限，即宽限期
```

## 3.3 删除用户

userdel可以删除Linux用户

格式：

```bash
userdel [option]... Login
```

常见选项：

```bash
-f，--force   强制
-r，--remove  删除用户家目录和邮箱
```

## 3.4 查看用户相关的ID信息

id 命令可以查看用户的UID，GID等信息

```bash
id [option]... [USER]
```

常见选项：

```bash
-u:显示uid
-g:显示gid
-G:显示用户所属组的ID
-n:显示名称，徐配合ugG使用
```

## 3.5 切换用户或以其他用户身份执行命令

su:即switch user，命令可以切换用户身份，并且以指定用户的身份执行命令

格式：

```bash
su [option...] [-] [user [args...]]
```

常见选项：

```bash
-l,--login su -l username 相当于su - username
-c，--command  pass a single command to the shell with -c
```

切换用户的方式：

* su UserName：非登录式切换，即不会读取目标用户的配置文件，不改变当前工作目录，即不完全切换
* su - UserName：登录式切换，会读取目标用户的配置文件，切换至自己的家目录，即完全切换

说明：root su至其他用户无需密码；非root用户切换时需要密码

注意：***su 切换新用户后，使用exit退回至旧的用户，而不要在使用su切换至旧用户，否则会生成很多的bash子进程，环境可能会混乱。***

换个身份执行命令：

```bash
su - UserName -c 'COMMAND'
```

范例：

```bash
[19:45:28 root@centos7 ~]#getent passwd  zhang
zhang:x:1000:1000::/home/zhang:/bin/bash
[19:45:30 root@centos7 ~]#usermod -s /bin/false zhang
[19:45:55 root@centos7 ~]#getent passwd zhang
zhang:x:1000:1000::/home/zhang:/bin/false
[19:46:04 root@centos7 ~]#su - zhang
Last login: Mon Nov 30 14:01:44 CST 2020 on pts/0
[19:46:39 root@centos7 ~]#whoami
root
```

范例：

```bash
[zhang@centos7 ~]$ getent shadow 
[zhang@centos7 ~]$ su - root -c "getent shadow"
Password:
root:$6$MNsR3yAcN729q1aF$3IK2gQ55A9ywQNw39TaykEOcrSAv0bmIKC93BIdm86R7/B0jEeX9iJDU99laNmqp8SwrGdS5AbKV65UCGzbwA/::0:99999:7:::
[zhang@centos7 ~]$ su - zhang -c "touch zhang.txt"
[zhang@centos7 ~]$ ll ~zhang
total 0
-rw-rw-r-- 1 zhang zhang 0 Nov 30 19:53 zhang.txt
```

## 3.6 设置密码

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-e8cce6a9.png)

passwd可以修改用户密码

格式：

```bash
passwd [options] UserName
```

常用选项：

```bash
-d 删除指定用户密码
-l 锁定用户指定
-u 解锁指定用户
-e 强制用户下次登录修改密码
-f 强制操作
-n mindays 指定最短使用期限
-x maxdays 最大使用期限
-w warndays 提前多少天开始警告
-i inactivedays 非活动期限
--dtdin 从标准输入接收用户密码，ubuntu无此选项
```

非交互式修改用户密码

```bash
#此方式更通用，适合于各种Linux版本，如：ubuntu
[20:02:51 root@centos7 ~]#echo -e '123456\n123456' | passwd zhang
Changing password for user zhang.
New password: BAD PASSWORD: The password is shorter than 8 characters
Retype new password: passwd: all authentication tokens updated successfully.

#使用于红帽系列的Linux版本
[20:03:08 root@centos7 ~]#echo '123456' | passwd --stdin zhang
Changing password for user zhang.
passwd: all authentication tokens updated successfully.
```

范例：ubuntu 非交互式修改用户密码

```bash
root@zhang:~# echo zhang:123456 | chpasswd

root@zhang:~# passwd zhang < centos
> centos
> EOF
> Enter new UNIX password: Retype new UNIX password: passwd: password updated successfully
```

范例：设置用户下次必须更改密码

```bash
[20:14:32 root@centos7 ~]#useradd zz
[20:14:40 root@centos7 ~]#echo '123456' | passwd --stdin zz
Changing password for user zz.
passwd: all authentication tokens updated successfully.
[20:15:02 root@centos7 ~]#getent shadow zz
zz:$6$Bi6BqHRi$N0VVJql4H3N0bqVPYa72fxjRLMiuSHzzZCEJKinBsgSpxKdJuY1wC3yNOcogrsKe3xAEMilEbpSnCukUpVWEr/:18596:0:99999:7:::
[20:15:15 root@centos7 ~]#passwd -e zz
Expiring password for user zz.
passwd: Success
[20:15:27 root@centos7 ~]#getent shadow zz
zz:$6$Bi6BqHRi$N0VVJql4H3N0bqVPYa72fxjRLMiuSHzzZCEJKinBsgSpxKdJuY1wC3yNOcogrsKe3xAEMilEbpSnCukUpVWEr/:0:0:99999:7:::
重新登录zz用户修改密码
[20:21:39 root@centos7 ~]#getent shadow zz
zz:$6$MKTaNl9E$qwHoAUHAFDtUYrROxpPTAPlvyPvevzO/cwxTH2AXs8Bynudi/dRAsqTox4Txc93ryzHY0OwaCIvCrmdg70Lrv0:18596:0:99999:7:::
```

## 3.7 修改用户密码策略

chage可以修改用户密码策略

格式：

```bash
chage [option]... LOGIN
```

常见选项：

```bash
-d LAST_DAY                      #更改密码的时间
-m --mindays MIN_DAYS            #指定最短使用期限
-M --maxdays MAX_DAYS            #指定最大使用期限
-W --warndays WARN_DAYS          #提前多少天开始警告
-I --inactive INACTIVE           #密码过期后的宽限期
-E --expiredate EXPIRE_DATE      #用户的有效期
-l 显示密码策略
```

范例：

```bash
[09:07:27 root@centos8 ~]#chage -m 3 -M 30 -W 7 -I 7 -E 2020-12-01 zhang
[09:07:38 root@centos8 ~]#chage -l zhang
Last password change					: Dec 01, 2020
Password expires					: Dec 31, 2020
Password inactive					: Jan 07, 2021
Account expires						: Dec 01, 2020
Minimum number of days between password change		: 3
Maximum number of days between password change		: 30
Number of days of warning before password expires	: 7
[09:07:43 root@centos8 ~]#getent shadow zhang
zhang:$6$qst4FiFOoHvdN0d0$.hp7.ouQFbUs3CSEJ.yWqY0KvjA3iOQvtjhTNyxuS2M2u6CgfH/sgrJ/3Xx2Fdvi9qP6UQIVgVbP0SMGcqWWv0:18597:3:30:7:7:18597:

#下次登录强制重设密码
[09:08:36 root@centos8 ~]#chage -d 0 zhang
[09:09:22 root@centos8 ~]#chage -l zhang
Last password change					: password must be changed
Password expires					: password must be changed
Password inactive					: password must be changed
Account expires						: Dec 01, 2020
Minimum number of days between password change		: 3
Maximum number of days between password change		: 30
Number of days of warning before password expires	: 7
[09:09:29 root@centos8 ~]#getent shadow zhang
zhang:$6$qst4FiFOoHvdN0d0$.hp7.ouQFbUs3CSEJ.yWqY0KvjA3iOQvtjhTNyxuS2M2u6CgfH/sgrJ/3Xx2Fd
```

## 3.8 用户相关的其他命令

* chfn 指定个人信息
* chsh 指定shell，相当于usermod -s
* finger 可看用户个人信息

## 3.9 创建组

groupadd 实现创建组

格式：

```bash
groupadd [option]... group_name
```

常见选项：

```bash
-g GID指明GID号；[GID_MIN,GID_MAX]
-r 创建系统组，Centos 6 之前ID<500,Centos7以后ID<1000
```

范例：

```bash
[09:09:54 root@centos8 ~]#groupadd -g 40 -r apache
```

## 3.10 修改组

groupmod 组属性修改

格式：

```bash
groupmod [option]... group
```

常见选项：

```bash
-n group_name:新名字
-g GID：新的GID
```

## 3.11 组删除

groupdel可以删除组

格式

```bash
groupdel [option] GROUP
```

常见选项：

```bash
-f，--force 强制删除，即使是用户的主组也强制删除组
```

## 3.12 更改组密码

```bash
gpasswd [option] GROUP
```

常见选项：

```bash
-a user 将user添加至指定组中
-d user 从指定附加组中移除用户user
-A user1,user2,... 设置有管理权限的用户列表
```

范例：

```bash
[09:15:32 root@centos8 ~]#groupadd admins
[09:21:54 root@centos8 ~]#id zhang
uid=1000(zhang) gid=1000(zhang) groups=1000(zhang)
[09:21:57 root@centos8 ~]#gpasswd -a zhang admins
Adding user zhang to group admins
[09:22:14 root@centos8 ~]#id zhang
uid=1000(zhang) gid=1000(zhang) groups=1000(zhang),1001(admins)
[09:22:20 root@centos8 ~]#groups zhang
zhang : zhang admins
[09:22:45 root@centos8 ~]#getent group admins
admins:x:1001:zhang

#删除组成员
[09:22:59 root@centos8 ~]#gpasswd -d zhang admins
Removing user zhang from group admins
[09:23:48 root@centos8 ~]#groups zhang
zhang : zhang
[09:23:56 root@centos8 ~]#id zhang
uid=1000(zhang) gid=1000(zhang) groups=1000(zhang)
[09:24:00 root@centos8 ~]#getent group zhang
zhang:x:1000:
```

## 3.13 临时切换主组

newgrp 命令可以临时切换主组，如果用户本不属于此组，则需要组密码

格式：

```bash
newgrp [-] [group]
```

如果使用 - 选项，可以初始化用户环境

```bash
[09:24:14 root@centos8 ~]#gpasswd root
Changing the password for group root
New Password:
Re-enter new password:
[09:27:54 root@centos8 ~]#getent gshadow root
root:$6$yoNr5/D292r/s$99reCavLDEUk1SaXyRV5rruhfXHXGTaiimoZ4ZCyDY7C4jp2OEFaObrT4CY0v/3H/JDOhXnUZXFfy4w.rsTi70::
[09:28:17 root@centos8 ~]#su - zhang
[zhang@centos8 ~]$ newgrp root
Password: 
[zhang@centos8 ~]$ id
uid=1000(zhang) gid=0(root) groups=0(root),1000(zhang)
[zhang@centos8 ~]$ touch zhang.txt
[zhang@centos8 ~]$ ll
total 0
-rw-r--r-- 1 zhang root 0 Dec  1 09:29 zhang.txt
[zhang@centos8 ~]$ exit
exit
[zhang@centos8 ~]$ id
uid=1000(zhang) gid=1000(zhang) groups=1000(zhang)
[zhang@centos8 ~]$ touch zhang2.txt
[zhang@centos8 ~]$ ll
total 0
-rw-rw-r-- 1 zhang zhang 0 Dec  1 09:29 zhang2.txt
-rw-r--r-- 1 zhang root  0 Dec  1 09:29 zhang.txt
```

## 3.14 更改和查看组成员

groupmems 可以管理附加组的成员关系

格式:

```bash
groupmems [options] [action]
```

常见选项：

```bash
-g,--group groupname     #更改为指定组（只有root）
-a,--add username        #指定用户加入组
-d,--delete username     #从组中删除用户
-p,--purge               #从组中清除所有成员
-l,--list                #显示组成员列表
```

groups 可查看用户组关系

格式：

```bash
查看用户所属组列表
groups [option].[USERNAME]...
```

范例：

```bash
[09:35:54 root@centos8 ~]#groupmems -l -g admins
[09:36:12 root@centos8 ~]#groupmems -a zhang -g admins
[09:36:50 root@centos8 ~]#id zhang
uid=1000(zhang) gid=1000(zhang) groups=1000(zhang),1001(admins)
[09:36:55 root@centos8 ~]#groupmems -l -g admins
zhang
[09:37:40 root@centos8 ~]#groupmems -a wang -g admins
[09:37:55 root@centos8 ~]#groupmems -l -g admins
zhang  wang
[09:38:47 root@centos8 ~]#groupmems -d zhang -g admins
[09:39:16 root@centos8 ~]#groupmems -l -g admins
wang
[09:39:35 root@centos8 ~]#groups zhang
zhang : zhang
```

# 四、文件权限管理

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-8af78c08.png)

## 4.1 文件所有者和属组属性操作

### 4.1.1 设置文件的所有者

chown命令可以修改文件的属主，也可以修改文件属组

格式：

```bash
chown [option]... [OWNER][:[GROUP]] FILE...
chown [option]... --reference=RFILE FILE...
```

用法说明

```bash
OWNER             #只修改所有者
OWNER:GROUP       #同时修改所有者和属组
:GROUP            #只修改属组，冒号也可用 . 替换
--reference=RFILE #参考指定的的属性，来修改
-R                #递归，此选项慎用，非常危险！
```

范例：

```bash
[10:07:45 root@centos8 zhang]#ll
total 0
-rw-rw-r-- 1 zhang zhang 0 Dec  1 10:07 zhang1.txt
-rw-rw-r-- 1 zhang zhang 0 Dec  1 10:07 zhang2.txt
-rw-rw-r-- 1 zhang zhang 0 Dec  1 10:07 zhang3.txt
[10:07:46 root@centos8 zhang]#chown root:root zhang1.txt
[10:08:13 root@centos8 zhang]#ll
total 0
-rw-rw-r-- 1 root  root  0 Dec  1 10:07 zhang1.txt
-rw-rw-r-- 1 zhang zhang 0 Dec  1 10:07 zhang2.txt
-rw-rw-r-- 1 zhang zhang 0 Dec  1 10:07 zhang3.txt
```

### 4.1.2 设置文件的属组信息chgrp

chgrp 命令可以只修改文件的属组

格式

```bash
chgrp [option]... GROUP FILE...
-R 递归
```

范例：

```bash
[10:08:15 root@centos8 zhang]#chgrp root zhang2.txt
[10:08:53 root@centos8 zhang]#ll
total 0
-rw-rw-r-- 1 root  root  0 Dec  1 10:07 zhang1.txt
-rw-rw-r-- 1 zhang root  0 Dec  1 10:07 zhang2.txt
-rw-rw-r-- 1 zhang zhang 0 Dec  1 10:07 zhang3.txt
```

## 4.2 文件权限

### 4.2.1 文件权限说明

文件的权限主要针对三类对象进行定义：

```bash
owner    属主，u
group    属组，g
other    其他，o
```

注意：**用户的最终权限，是从左向右进行顺序匹配，即，所有者，所属组，其他人，一旦匹配权限立即生效，不在向右查看其权限**

每个文件针对每类访问者都定义了三种常用权限

每个文件针对每类访问者都定义了三种权限：

```bash
r   readable
w   Writable
x   eXcutable
```

对文件的权限：

```bash
r  可使用文件查看类工具，比如：cat，可以读取其内容
w  可修改其内容
x  可以把此文件提请内核启动为一个进程，即可以执行（运行）此文件（此文件的内容必须是可执行）
```

对目录的权限：

```bash
r 可以使用ls查看此目录中文件列表
w 可以在此目录中创建文件，也可删除此目录中的文件，而和此被删除的文件的权限无关
x 可以cd进入此目录，可以使用ls -l 查看此目录中文件元数据（必须配合r权限），属于目录的可访问的最小权限
X 只给目录x权限，不给无执行权限的文件x权限
```

数字法的权限

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-5d002e7e.png)

例如：

```bash
rw-r----- 640
rwxr-xr-x 755
```

### 4.2.2 修改文件权限chmod

格式

```bash
chmod [option]... MODE[,MODE]... FILE...
#参考RFILE文件的权限，将FILE的修改为同RFILE
chmod [option]... --reference=RFILE FILE...
```

说明：

```bash
MODE：who opt permission
who：u,g,o,a
opt:+,-,=
permission:r,w,x
修改指定一类用户的所有权限
u= g= ug= a= u=,g=
修改指定一类用户某个权限
u+ u- g+ g- o+ o- a+ a- + -
-R：递归修改权限
```

范例：设置X权限

```bash
[10:58:24 root@centos8 ~]#ll dir/
total 0
-rw-r--r-- 1 root root 0 Dec  1 10:57 file1.txt
-rwxr--r-- 1 root root 0 Dec  1 10:57 file2.txt
drw-r--r-- 2 root root 6 Dec  1 10:56 zhang
[10:58:32 root@centos8 ~]#ll -d dir
drwxr-xr-x 3 root root 53 Dec  1 10:57 dir
[10:58:44 root@centos8 ~]#chmod -R a+X dir
[10:59:09 root@centos8 ~]#ll dir/
total 0
-rw-r--r-- 1 root root 0 Dec  1 10:57 file1.txt
-rwxr-xr-x 1 root root 0 Dec  1 10:57 file2.txt
drwxr-xr-x 2 root root 6 Dec  1 10:56 zhang
```

范例：

```bash
chmod u+wx,g-r,o=rx file
chmod -R g+rwx /testdir
chmod 600 file
```

## 4.3 新建文件和目录的默认权限

umask的值可以用来保留在创建文件时的权限

实现方式：

* 新建文件的默认权限：666-umask，如果所得结果某位存在执行（奇数）权限，则将其权限+1，偶数不变
* 新建目录的默认权限：777-umask

**非特权用户umask默认是002**

**root的umask默认是022**

查看umask

```bash
[10:59:13 root@centos8 ~]#umask
0022
#模式方式显示
[11:04:08 root@centos8 ~]#umask -S
u=rwx,g=rx,o=rx
#输出可被调用
[11:04:15 root@centos8 ~]#umask -p
umask 0022
```

修改umask

```bash
umask #
```

范例：

```bash
umask 002
umask u=rw,g=r,o=
```

持久保存umask

* 全局设置：/etc/bashrc
* 用户设置：~/.bashrc

范例：

```bash
[11:11:57 root@centos8 ~]#umask
0022
[11:12:06 root@centos8 ~]#(umask 666; touch 3)
[11:12:31 root@centos8 ~]#umask
0022
[11:12:38 root@centos8 ~]#ll
total 0
-rw-r--r-- 1 root root  0 Dec  1 11:07 1
-rw-rw-r-- 1 root root  0 Dec  1 11:08 2
---------- 1 root root  0 Dec  1 11:12 3
```

## 4.4 Linux文件系统上的特殊权限

前面介绍了三种常见的权限：r，w，x还有三种特殊权限：SUID，SGID，Sticky

### 4.4.1 特殊权限SUID

提前：进程有属主和属组；文件有属主和属组

* 1.任何一个可执行程序文件能不能启动为进程，取决于发起者对程序文件是否拥有执行权限
* 2.启动为进程之后，其进程的属主为发起者，进程的属组为发起者所属的组
* 3.进程访问文件时的权限，取决于进程的发起者
* (a)进程的发起者，同文件的属主：则应用文件属主权限
* (b)进程的发起者，属于文件属组，则应用文件属组权限
* (c)应用文件“其他”权限

**二进制的可执行文件上SUID 权限功能：**

* 任何一个可执行程序文件能不能启动为进程：取决于发起者对进程文件是否拥有执行权限
* 启动为进程后，其进程的属主为原程序文件的属主
* SUID只对二进制可执行程序有效
* SUID设置在目录上无意义

SUID权限设定：

```bash
chmod u+s FILE...
chmod 6xxx FILE...
chmod u-s FILE....
```

范例：

```bash
[11:28:23 root@centos8 ~]#chmod u+s /bin/ls
[11:29:31 root@centos8 ~]#ll /bin/ls
-rwsr-xr-x. 1 root root 267000 Apr 10  2020 /bin/ls
```

### 4.4.2 特殊权限SGID

二进制的可执行文件上SGID权限功能：

* 任何一个可执行程序文件能不能启动为进程：取决于发起者对程序文件是否拥有执行权限
* 启动为进程之后，其进程的属组为原程序文件的属组

SGID权限设定：

```bash
chmod g+s FILE...
chmod 2xxx FILE
```

目录上的SGID权限功能：

默认情况下，用户创建文件时，其属组为此用户的主组，一旦某目录被设定了SGID，对此目录有写权限的用户在此目录中创建的文件所属的组为此目录的属组，通常用于创建一个协作目录

SGID权限设定：

```bash
chmod g+s DIR...
chmod 2xxx DIR
```

### 4.4.3 特殊权限Sticky位

具有写权限的目录通常用户可以删除该目录中的任何文件，无论该文件的权限或拥有权

**在目录设置Sticky，只有文件的所有者或root可以删除该文件**

**sticky设置在文件上无意义**

Sticky权限设定：

```bash
chmod o+t DIR...
chmod 1xxx DIR
```

范例：

```bash
[11:49:15 zhang@centos8 data]$ll -d /data/
drwxrwsr-t. 3 root zhang 16 Dec  1 11:49 /data/
```

### 4.4.4 特殊权限数字法

SUID SGID STICKY

范例：

```bash
chmod 4777 /zhang.txt
```

权限位映射

* SUID：user，占据属主的执行权限位
  
  * s:属主拥有x权限
  * S：属主没有X权限
* SGID：group，占据属组的执行权限位
  
  * s：属组拥有x权限
  * S：属组没有x权限
* Sticky：other，占据other，占据other的执行权限位
  
  * t：other拥有x权限
  * T：other没有x权限

## 4.5 设定文件特殊属性

设置文件的特殊属性，可以防止root用户误操作删除或修改文件

不能删除，改名，更改

```bash
chattr +i
```

只能追加内容，不能删除，改名

```bash
chattr +a
```

显示特定属性

```bash
lsattr
```

范例：

```bash
[12:53:17 root@centos8 data]#chattr +a fstab
[12:53:26 root@centos8 data]#lsattr
-----a-------------- ./fstab
[12:53:37 root@centos8 data]#echo 'aaaaaa' >> fstab
[12:53:53 root@centos8 data]#echo 'aaaaaa' > fstab
-bash: fstab: Operation not permitted
[12:53:58 root@centos8 data]#cat fstab

#

# /etc/fstab

# Created by anaconda on Fri Nov 27 19:37:52 2020

#

# Accessible filesystems, by reference, are maintained under '/dev/disk/'.

# See man pages fstab(5), findfs(8), mount(8) and/or blkid(8) for more info.

#

# After editing this file, run 'systemctl daemon-reload' to update systemd

# units generated from this file.

#
UUID=6a351e7e-dc59-46ff-b987-76a6baabf99d /                       xfs     defaults        0 0
UUID=7f21b3b9-6982-40ed-8e3f-92cfe428a6cc /boot                   ext4    defaults        1 2
UUID=d8334831-99fd-4d98-936d-fa151cc7b6b1 /data                   xfs     defaults        0 0
UUID=fcada99e-a428-4a62-a2a0-3304e789bb26 swap                    swap    defaults        0 0
11
aaaaaa
```

## 4.6 访问控制列表ACL

### 4.6.1 ACL权限功能

ACL：Access Control List，实现灵活的权限管理

除了文件的所有者，所属组和其他人，可以对更多的用户设置权限

Centos7默认创建xfs和ext4文件系统具有ACL功能

Centos7之前版本，默认手工创建的ext4文件系统无ACL功能，需手动增加

```bash
tune2fs -o acl /dev/sdb1
mount -o acl /dev/sdb1 /mnt/test
```

ACL生效顺序：

```bash
所有者，自定义用户，所属组|自定义组，其他人
```

### 4.6.2 ACL相关命令

serfacl 可以设置ACL权限

getacl 可以查看设置的ACL权限

范例：设置acl权限

```bash
[13:25:35 root@centos8 data]#ll
total 4
-rw-rw-rw- 1 root root 719 Dec  1 12:53 fstab
[13:26:33 root@centos8 data]#setfacl -m u:zhang:- fstab
[13:26:53 root@centos8 data]#ll
total 4
-rw-rw-rw-+ 1 root root 719 Dec  1 12:53 fstab
[13:26:55 root@centos8 data]#getfacl fstab
# file: fstab
# owner: root
# group: root
user::rw-
user:zhang:---
group::rw-
mask::rw-
other::rw-

[13:28:09 root@centos8 data]#ll
total 4
-rw-rw-rw-+ 1 root root 719 Dec  1 12:53 fstab
-rw-r--r--  1 root root   0 Dec  1 13:28 fstab1
[13:28:37 root@centos8 data]#setfacl -m u:zhang:0 fstab1
[13:28:45 root@centos8 data]#setfacl -m g:cy:rw fstab1
[13:29:12 root@centos8 data]#getfacl fstab1
# file: fstab1
# owner: root
# group: root
user::rw-
user:zhang:---
group::r--
group:cy:rw-
mask::rw-
other::r--
```

范例：清除所有acl

```bash
[13:32:31 root@centos8 data]#ll
total 4
-rw-rw-rw-+ 1 root  root  719 Dec  1 12:53 fstab
-rw-rw-r--  1 zhang zhang   0 Dec  1 13:30 fstab1
-rw-r--r--  1 root  root    0 Dec  1 13:28 fstab1~
[13:33:01 root@centos8 data]#getfacl fstab
# file: fstab
# owner: root
# group: root
user::rw-
user:zhang:---
group::rw-
mask::rw-
other::rw-

[13:33:11 root@centos8 data]#setfacl -b fstab
[13:33:18 root@centos8 data]#getfacl fstab
# file: fstab
# owner: root
# group: root
user::rw-
group::rw-
other::rw-
```

**mask权限**

* mask只影响除所有者和other的之外的人和组的最大权限
* mask需要于用户的权限进行逻辑与运算后，才能变成有限的权限（Effective Permission）
* 用户或组的设置必须存在与mask权限设定范围内才会生效

范例:

```bash
setfacl -m mask::rx FILE
```

范例：设置mask

```bash
[13:37:21 root@centos8 data]#setfacl -m mask::rx fstab
[13:37:40 root@centos8 data]#getfacl fstab
# file: fstab
# owner: root
# group: root
user::rw-
group::rw-			#effective:r--
mask::r-x
other::rw-

[13:38:19 root@centos8 data]#setfacl -m u:zhang:rwx fstab
[13:38:50 root@centos8 data]#getfacl fstab
# file: fstab
# owner: root
# group: root
user::rw-
user:zhang:rwx
group::rw-
mask::rwx
other::rw-

[13:38:57 root@centos8 data]#setfacl -m mask::rw fstab
[13:39:58 root@centos8 data]#getfacl fstab
# file: fstab
# owner: root
# group: root
user::rw-
user:zhang:rwx			#effective:rw-
group::rw-
mask::rw-
other::rw-
```

--set选项会把原有的ACL项都删除，用新的替代，需要注意的是一定要包含UGO的设置，不能象-m一样只添加ACL就可以

范例：

```bash
[13:39:58 root@centos8 data]#getfacl fstab
# file: fstab
# owner: root
# group: root
user::rw-
user:zhang:rwx			#effective:rw-
group::rw-
mask::rw-
other::rw-

[13:40:02 root@centos8 data]#setfacl --set u::rw,u:cy:rw,g::r,o::- fstab
[13:42:51 root@centos8 data]#getfacl fstab
# file: fstab
# owner: root
# group: root
user::rw-
user:cy:rw-
group::r--
mask::rw-
other::---
```

### 4.6.3 备份和还原ACL

主要的文件操作命令cp和mv都支持ACL，只是cp命令需要加上-p参数。但是tar等常见的备份工具是不会保留目录和文件的ACL信息

范例：

```bash
#备份
[13:44:59 root@centos8 data]#getfacl -R fstab >acl.txt
#删除
[13:45:18 root@centos8 data]#setfacl -R -b fstab
#恢复
[13:45:30 root@centos8 data]#setfacl -R --set-file=acl.txt fstab
[13:46:06 root@centos8 data]#setfacl --restore acl.txt
#查看
[13:45:56 root@centos8 data]#getfacl -R fstab
# file: fstab
# owner: root
# group: root
user::rw-
user:cy:rw-
group::r--
mask::rw-
other::---
```

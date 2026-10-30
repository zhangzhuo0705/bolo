---
title: "网络文件共享服务"
date: 2021-05-17T16:35:16+08:00
draft: false
description: "覆盖 FTP、NFS、Samba 与 sersync 的部署和配置，实现跨主机文件共享与同步。"
cover: "https://b3logfile.com/bing/20180314.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["应用服务"]
tags: ["FTP", "NFS", "SAMBA", "sersync"]
toc: true
---
# 一、FTP 文件传输协议

## 1.1 FTP工作原理介绍

文件传输协议：File Transfer Protocol 早期的三个应用级协议之一，基于C/S结构

数据传输格式：二进制（默认）和文本

双通道协议：命令和数据连接

**两种模式：从服务器角度**

- 主动(PORT style)：服务器主动连接
  - 命令（控制）：客户端：随机port ---> 服务器：21/tcp
  - 数据：客户端：随机port <---服务器：20/tcp
- 被动(PASV style)：客户端主动连接
  - 命令（控制）：客户端：随机port ---> 服务器：21/tcp
  - 数据：客户端：随机port ---> 服务器：随机port /tcp

**范例：服务器被动模式数据端口**

```
227 Entering Passive Mode (172,16,0,1,224,59)
服务器数据端口为：224*256+59
```

**范例: windows 连接FTP服务器默认使用主动模式**

```
C:\Users\zhangzhuo>ftp 192.168.10.81
连接到 192.168.10.81。
220 (vsFTPd 3.0.3)
200 Always in UTF8 mode.
用户(192.168.10.81:(none)): ftp
331 Please specify the password.
密码:
230 Login successful.
ftp> ls
200 PORT command successful. Consider using PASV.
150 Here comes the directory listing.
pub
226 Directory send OK.
ftp: 收到 8 字节，用时 0.00秒 8000.00千字节/秒。
ftp> literal pasv
227 Entering Passive Mode (192,168,10,81,188,81)
```

**FTP服务状态码：**

```
1XX：信息         125：数据连接打开
2XX：成功类状态    200：命令OK     230：登录成功
3XX：补充类       331：用户名OK
4XX：客户端错误    425：不能打开数据连接
5XX：服务器错误    530：不能登录
```

**用户认证：**

- 匿名用户：ftp,anonymous,对应Linux用户ftp
- 系统用户：Linux用户,用户/etc/passwd,密码/etc/shadow
- 虚拟用户：特定服务的专用用户，独立的用户/密码文件

## 1.2 常见 FTP 相关软件

**FTP服务器端软件**

- Wu-ftpd,Proftpd,Pureftpd,Filezilla Server,Serv-U,Wing FTP Server,IIS
- vsftpd：Very Secure FTP Daemon，CentOS 默认FTP服务器
  - 高速，稳定，下载速度是WU-FTP的两倍
  - ftp.redhat.com数据:单机最多可支持15000个并发
  - vsftpd官网：<https://security.appspot.com/vsftpd.html>

**客户端软件：**

```
ftp，lftp，lftpget，wget，curl
ftp -A ftpserver port -A 主动模式 -p 被动模式
lftp -u username ftpserver
lftp username@ftpserver
lftpget ftp://ftpserver/pub/file
gftp：GUI centos5 最新版2.0.19 (11/30/2008)，官网：https://www.gftp.org/
filezilla，FTP Rush，CuteFtp，FlashFXP，LeapFtp
IE ftp://username:password@ftpserver
```

## 1.3 vsftpd 软件介绍

由 vsftpd 包提供，不再由xinetd管理

用户认证配置文件：/etc/pam.d/vsftpd

**启动服务相关文件：**

```
/usr/lib/systemd/system/vsftpd.service
/etc/rc.d/init.d/vsftpd
```

**配置文件：**

```
/etc/vsftpd/vsftpd.conf
```

帮助：man 5 vsftpd.conf

**配置文件格式：**

```
option=value
```

注意：= 前后不要有空格

**用户和其共享目录**

- 匿名用户（映射为系统用户ftp ）共享文件位置：/var/ftp
- 系统用户共享文件位置：用户家目录
- 虚拟用户共享文件位置：为其映射的系统用户的家目录

## 1.4 vsftpd服务常见配置

### 1.4.1 命令端口

```
listen_port=2121 默认值为21
```

范例：

```
[09:38:55 root@ftp ~]#ftp 192.168.10.81 2121
```

### 1.4.2 主动模式端口

```
connect_from_port_20=YES 主动模式端口为20
ftp_data_port=20 （默认） 指定主动模式的端口
```

### 1.4.3 被动模式端口范围

```
linux ftp 客户端默认使用被动模式
windows ftp 客户端默认使用主动模式
pasv_min_port=6000   0为随机分配，端口范围会影响客户端的并发数
pasv_max_port=6010
```

### 1.4.4 使用当地时间

```
use_localtime=YES 使用当地时间（默认为NO，使用GMT）
```

### 1.4.5 匿名用户登录

```
anonymous_enable=YES 支持匿名用户，CentOS8 默认不允许匿名
no_anon_password=YES 匿名用户略过口令检查 , 默认NO
```

### 1.4.6 匿名用户上传

```
anon_upload_enable=YES 匿名上传，注意:文件系统权限
anon_mkdir_write_enable=YES 匿名建目录

setfacl -m u:ftp:rwx /var/ftp/pub
```

**注意：还需要开启文件系统访问的权限，不能给FTP根目录写权限，只能级子目录写权限**

```
anon_world_readable_only=NO 只能下载全部读的文件, 默认YES
anon_umask=0333 指定匿名上传文件的umask，默认077，注意：0333中的0不能省略
anon_other_write_enable=YES 可删除和修改上传的文件，默认NO
```

### 1.4.7 指定匿名用户的上传文件的默认的所有者和权限

```
chown_uploads=YES        #默认NO
chown_username=wang
chown_upload_mode=0644
```

### 1.4.8 Linux系统用户

```
local_enable=YES 是否允许linux用户登录
write_enable=YES 允许linux用户上传文件
local_umask=022 指定系统用户上传文件的默认权限对应umask
```

### 1.4.9 将所有系统用户映射为指定的guest用户

```
guest_enable=YES 所有系统用户都映射成guest用户
guest_username=ftp   配合上面选项才生效，指定guest用户
local_root=/ftproot 指定guest用户登录所在目录,但不影响匿名用户的登录目录
user_config_dir=/etc/vsftpd/conf.d/ 每个用户独立的配置文件目录
```

范例: 让所有的系统用户映射指定guest用户,并且每个用户目录的不同的

```
[10:07:44 root@ftp ~]#useradd ftpuser
[10:15:00 root@ftp ~]#vim /etc/vsftpd/vsftpd.conf
guest_enable=YES
guest_username=ftpuser
user_config_dir=/etc/vsftpd/conf.d/     #每个用户独立的配置文件目录
[10:20:41 root@ftp ~]#systemctl restart vsftpd.service
[10:21:03 root@ftp ~]#mkdir /etc/vsftpd/conf.d
[10:21:24 root@ftp ~]#vim /etc/vsftpd/conf.d/zhangzhuo
local_root=/ftproot_zhangzhuo
[10:24:58 root@ftp ~]#vim /etc/vsftpd/conf.d/ftpuser
local_root=/ftproot_ftpuser
[10:22:22 root@ftp ~]#mkdir /ftproot_zhangzhu
[10:24:42 root@ftp ~]#mkdir /ftproot_ftpuser
```

### 1.4.10 禁锢系统用户

禁锢所有系统用户在家目录中

```
chroot_local_user=YES #禁锢系统用户，默认NO，即不禁锢
```

如果启用chroot,必须保证ftp根目录不可写,这样对于ftp根直接为网站根目录的用户不方便，不修改会报错  
![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-d9e78b06.png?imageView2/2/w/1280/format/jpg/interlace/1/q/100)

**禁锢或不禁锢特定的系统用户在家目录中，与上面设置功能相反**

```
chroot_list_enable=YES     #默认是NO
chroot_list_file=/etc/vsftpd/chroot_list   #默认值

当chroot_local_user=YES和chroot_list_enable=YES时，则chroot_list中用户不禁锢，即白名单
当chroot_local_user=NO和chroot_list_enable=YES时， 则chroot_list中用户禁锢，即黑名单
```

### 1.4.11 日志

```
#wu-ftp 日志：默认启用
xferlog_enable=YES 启用记录上传下载日志，此为默认值
xferlog_std_format=YES 使用wu-ftp日志格式，此为默认值
xferlog_file=/var/log/xferlog 可自动生成， 此为默认值

#vsftpd日志：默认不启用
dual_log_enable=YES 使用vsftpd日志格式，默认不启用
vsftpd_log_file=/var/log/vsftpd.log 可自动生成， 此为默认值
```

### 1.4.12 提示信息

**登录前提示信息**

```
ftpd_banner="welcome to mage ftp server"   #配置文件直接定义
banner_file=/etc/vsftpd/ftpbanner.txt      #在文件中定义
```

**目录访问提示信息**

```
dirmessage_enable=YES    #开启此为默认值
message_file=.message    #信息存放在指定目录下.message ，此为默认值,只支持单行说明
```

### 1.4.13 PAM模块实现用户访问控制

```
pam_service_name=vsftpd
#pam配置文件:/etc/pam.d/vsftpd
/etc/vsftpd/ftpusers 默认文件中用户拒绝登录，默认是黑名单，但也可以是白名单
```

范例：

```
[11:00:56 root@ftp ~]#ldd /usr/sbin/vsftpd | grep pam
libpam.so.0 => /lib64/libpam.so.0 (0x00007fbe30904000)
[11:07:33 root@ftp ~]#cat /etc/pam.d/vsftpd
#%PAM-1.0
session    optional     pam_keyinit.so    force revoke
#将sense=deny 修改为 sense=allow    #修改黑名单为白名单
auth       required	pam_listfile.so item=user sense=allow file=/etc/vsftpd/ftpusers onerr=succeed
auth       required	pam_shells.so
auth       include	password-auth
account    include	password-auth
session    required     pam_loginuid.so
session    include	password-auth
```

### 1.4.14 是否启用控制用户登录的列表文件

```
userlist_enable=YES   此为默认值
userlist_deny=YES     (默认值) 黑名单,不提示口令，NO为白名单
userlist_file=/etc/vsftpd/user_list 此为默认值
```

### 1.4.15 vsftpd服务指定用户身份运行

```
nopriv_user=nobody   此为默认值
```

范例：

```
[11:19:04 root@ftp ~]#ps auxf
root        4140  0.0  0.0  27032   420 ?        Ss   11:18   0:00 /usr/sbin/vsftpd /etc/vsftpd/vsftpd.conf
nobody      4143  0.0  0.4  62340  4548 ?        Ss   11:18   0:00  \_ /usr/sbin/vsftpd /etc/vsftpd/vsftpd.conf
ls          4145  0.0  0.4  75440  4672 ?        S    11:18   0:00      \_ /usr/sbin/vsftpd /etc/vsftpd/vsftpd.conf
```

### 1.4.16 连接数限制

```
max_clients=0 #最大并发连接数
```

如果超出连接，会报如下提示

![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-7c3995f0.png?imageView2/2/w/1280/format/jpg/interlace/1/q/100)

```
max_per_ip=0 #每个IP同时发起的最大连接数
```

如果超出连接，会报如下提示

![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-61d8856d.png?imageView2/2/w/1280/format/jpg/interlace/1/q/100)

### 1.4.17 传输速率，单位：字节/秒

```
anon_max_rate=0 匿名用户的最大传输速率,以字节为单位,比如:1024000表示1MB/s
local_max_rate=0 本地用户的最大传输速率
```

**范例：**

```
#限速
[11:23:58 root@ftp ~]#vim /etc/vsftpd/vsftpd.conf
anon_max_rate=1024000
local_max_rate=10240000
#生成测试文件
[11:29:16 root@ftp ~]#dd if=/dev/zero of=/home/ls/1.test bs=1G count=2
[11:29:16 root@ftp ~]#dd if=/dev/zero of=/var/ftp/pub/1.test bs=1G count=2
#测试匿名下载速度
[11:30:50 root@centos8 ~]#wget ftp://192.168.10.81:2121/pub/1.test
1.test                 1%[                       ]  29.38M  1000KB/s    eta 34m 27s
#测试本地用户下载速度
[11:31:29 root@centos8 ~]#wget ftp://ls:123456@192.168.10.81:2121/1.test
1.test.1               4%[                       ]  83.57M  9.76MB/s    eta 3m 22s
```

### 1.4.18 连接时间：秒为单位

```
connect_timeout=60 主动模式数据连接超时时长
accept_timeout=60 被动模式数据连接超时时长
data_connection_timeout=300 数据连接无数据输超时时长
idle_session_timeout=60 无命令操作超时时长
```

### 1.4.19 以文本方式传输

以文本方式传输文件时,会自动对文件进行格式转换,比如转换成windows的文本格式

```
#启用此选项可使服务器在ASCII模式下实际对文件进行ASCII处理。
#默认是禁用,禁用后，服务器将假装允许ASCII模式，但实际上会忽略激活它的请求
ascii_upload_enable=YES
ascii_download_enable=YES
```

说明：不建议使用文本方式，因为可能导致二进制文件内容被破坏

## 1.5 vsftpd 虚拟用户

**虚拟用户：给特定服务使用的用户帐号**

- 所有虚拟用户会统一映射为一个指定的系统帐号：访问共享位置，即为此系统帐号的家目录
- 各虚拟用户可被赋予不同的访问权限，通过匿名用户的权限控制参数进行指定

**虚拟用户帐号的存储方式：**

- 文件：创建文本文件，奇数行为用户名，偶数行为密码,再被编码为hash 格式Berkeley DBdatabase文件

```
db_load -T -t hash -f vusers.txt vusers.db
```

- 关系型数据库中的表中：实时查询数据库完成用户认证
  - vsftpd 支持mysql库：pam要依赖于pam-mysql

```
/lib64/security/pam_mysql.so
/usr/share/doc/pam_mysql-0.7/README
```

### 1.5.1 实现基于文件验证的vsftpd虚拟用户

#### 1.5.1.1 创建用户数据库文件

```
[18:38:44 root@ftp ~]#rpm -qf `which db_load`
libdb-utils-5.3.28-39.el8.x86_64
[18:38:48 root@ftp ~]#vim /etc/vsftpd/vusers.txt
[18:39:49 root@ftp ~]#cat /etc/vsftpd/vusers.txt
ftp_zhang
123456
ftp_cheng
123456
[18:40:37 root@ftp ~]#db_load -T -t hash -f /etc/vsftpd/vusers.txt /etc/vsftpd/vusers.db
[18:40:57 root@ftp ~]#chmod 600 /etc/vsftpd/vusers.db
```

#### 1.5.1.2 创建用户和访问FTP目录

```
[18:41:11 root@ftp ~]#useradd -d /data/ftproot -s /sbin/nologin -r vuser
[18:42:35 root@ftp ~]#mkdir /data/ftproot/upload -p
[18:42:52 root@ftp ~]#setfacl -m u:vuser:rwx /data/ftproot/upload
#chmod a=rx /data/ftproot/ 如果自动创建家目录，需修改权限,ftproot目录不允许有写权限
```

#### 1.5.1.3 创建pam配置文件

```
[18:43:17 root@ftp ~]#vim /etc/pam.d/vsftpd.db
auth required pam_userdb.so db=/etc/vsftpd/vusers
account required pam_userdb.so db=/etc/vsftpd/vusers
```

#### 1.5.1.4 指定pam配置文件

```
[18:46:33 root@ftp ~]#vim /etc/vsftpd/vsftpd.conf
pam_service_name=vsftpd.db
guest_enable=YES
guest_username=vuser
```

#### 1.5.1.5 虚拟用户建立独立的配置文件

```
#指定各个用户配置文件存放的路径
[18:48:17 root@ftp ~]#vim /etc/vsftpd/vsftpd.conf
user_config_dir=/etc/vsftpd/conf.d/
#创建各个用户配置文件存放的路径
[18:49:24 root@ftp ~]#mkdir /etc/vsftpd/conf.d
#创建各用户自已的配置文件,允许zhang用户可读写，其它用户只读
[18:50:04 root@ftp ~]#vim /etc/vsftpd/conf.d/ftp_zhang
anon_upload_enable=YES
anon_mkdir_write_enable=YES
anon_mkdir_write_enable=YES
#创建各用户自已的配置文件
[18:51:51 root@ftp ~]#vim /etc/vsftpd/conf.d/ftp_cheng
#登录目录改变至指定的目录
local_root=/data/ftproot2
#针对ftp_mage用户建立对应的数据目录
[18:53:02 root@ftp ~]#mkdir /data/ftproot2
```

### 1.5.2 实现基于MYSQL验证的vsftpd虚拟用户

利用 pam\_mysql 模块可以实现基于MySQL的FTP虚拟用户功能

**项目网站：**

```
http://pam-mysql.sourceforge.net/
https://sourceforge.net/projects/pam-mysql/
http://sf.net/projects/pam-mysql
```

注意:因为此项目年代久远不再更新，当前只支持CentOS 6,7，不支持CentOS 8

**环境准备**

![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-2fd61953.png?imageView2/2/w/1280/format/jpg/interlace/1/q/100)

```
本实验在两台主机上实现
一台做为FTP服务器CentOS 7
一台做 Mariadb 数据库服务器
```

#### 1.5.2.1 在数据库服务器上安装mysql数据库

```
#注意：MySQL8.0由于取消了PASSWORD()函数不支持,因此选择Mariadb
[19:50:14 root@mysql ~]#yum install -y mariadb-server
[19:54:02 root@mysql ~]#systemctl enable --now mariadb
```

#### 1.5.2.2 在数据库服务上配置数据库支持vsftpd服务

```
#建立存储虚拟用户数据库和表
MariaDB [(none)]> create database vsftpd;
MariaDB [(none)]> use vsftpd
MariaDB [(none)]>create table users( id int auto_increment not null primary key, name char(50) binary not null, password char(48) binary not null);

#添加虚拟用户，为了安全应该使用PASSWORD函数加密其密码后存储
MariaDB [vsftpd]> insert into users(name,password) values('ftp_zhang',password('123456'));
MariaDB [vsftpd]> insert into users(name,password) values('ftp_cheng',password('123456'));
#创建连接的数据库用户
MariaDB [vsftpd]> create user 'vsftpd'@'192.168.10.%' identified by '123456';
MariaDB [vsftpd]> grant all on vsftpd.* to 'vsftpd'@'192.168.10.%';
```

#### 1.5.2.3 在FTP服务器上安装vsftpd 和 pam\_mysql包

```
[19:52:50 root@ftp ~]#yum install -y vsftpd
```

#### 1.5.2.4 在FTP服务器上安装 pam\_mysql

对于 centos 6：pam\_mysql由EPEL的源中提供

```
[root@centos6 ~]#yum install pam_mysql
```

对于 centos7 和 8：无对应rpm包，需手动编译安装

注意: 当前版本的源码不支持 CentOS 8,使用中会提示下面错误

```
[root@centos8 ~]#tail -f /var/log/secure
Jan  2 10:20:31 centos8 vsftpd[15519]: PAM unable to
dlopen(/usr/lib64/security/pam_mysql.so): /usr/lib64/security/pam_mysql.so:
undefined symbol: make_scrambled_password
```

**pam-mysql 源码进行编译**

```
[20:03:01 root@ftp ~]#yum -y install vsftpd gcc gcc-c++ make mariadb-devel pam-devel
[20:03:16 root@ftp ~]#tar xvf pam_mysql-0.7RC1.tar.gz
[20:03:16 root@ftp ~]#cd pam_mysql-0.7RC1/
[20:03:43 root@ftp pam_mysql-0.7RC1]#./configure --with-pam-mods-dir=/lib64/security
[20:04:24 root@ftp pam_mysql-0.7RC1]#make
[20:04:24 root@ftp pam_mysql-0.7RC1]#make install
[20:04:59 root@ftp pam_mysql-0.7RC1]#ll /lib64/security/pam_mysql.*
-rwxr-xr-x 1 root root    882 Mar 10 20:04 /lib64/security/pam_mysql.la
-rwxr-xr-x 1 root root 141712 Mar 10 20:04 /lib64/security/pam_mysql.so
```

#### 1.5.2.5 在FTP服务器上建立pam认证所需文件

```
[19:29:27 root@ftp ~]#cat /etc/pam.d/vsftpd.mysql
auth required pam_mysql.so user=vsftpd passwd=123456 host=192.168.10.82 db=vsftpd table=users usercolumn=name passwdcolumn=password crypt=9
account required pam_mysql.so user=vsftpd passwd=123456 host=192.168.10.82 db=vsftpd table=users usercolumn=name passwdcolumn=password crypt=9
```

注意：以上参考 README文档

**crypt 加密方式：**

- 0表示不加密
- 1表示crypt(3)加密
- 2表示使用mysql password()函数加密
- 3表示md5加密
- 4表示sha1加密

**配置字段说明**

- auth 表示认证
- account 验证账号密码正常使用
- required 表示认证要通过
- pam\_mysql.so模块是默认的相对路径，是相对/lib64/security/路径而言，也可以写绝对路径；后面为给此模块传递的参数
- user=vsftpd为登录mysql的用户
- passwd=magedu 登录mysql的的密码
- host=mysqlserver mysql服务器的主机名或ip地址
- db=vsftpd 指定连接msyql的数据库名称
- table=users 指定连接数据库中的表名
- usercolumn=name 当做用户名的字段
- passwdcolumn=password 当做用户名字段的密码
- crypt=2 密码的加密方式为mysql password()函数加密

#### 1.5.2.6 建立相应用户和修改vsftpd配置文件

```
[20:07:46 root@ftp ~]#useradd -s /sbin/nologin -d /data/ftproot -r vuser
[20:08:13 root@ftp ~]#mkdir -pv /data/ftproot/upload
[20:08:43 root@ftp ~]#setfacl -m u:vuser:rwx /data/ftproot/upload
[20:09:03 root@ftp ~]#vim /etc/vsftpd/vsftpd.conf
pam_service_name=vsftpd.mysql
guest_enable=YES
guest_username=vuser
[20:10:13 root@ftp ~]#systemctl enable --now vsftpd
```

#### 1.5.2.7 在FTP服务器上配置虚拟用户具有不同的访问权限

```
#配置vsftpd为虚拟用户使用配置文件目录
[root@centos7 ~]#vim /etc/vsftpd/vsftpd.conf
#添加如下选项
user_config_dir=/etc/vsftpd/conf.d/
#创建所需要目录，并为虚拟用户提供配置文件
[root@centos7 ~]#mkdir /etc/vsftpd/conf.d/
#配置虚拟用户的访问权限
#虚拟用户对vsftpd服务的访问权限是通过匿名用户的相关指令进行的。如要让用户wang具有上传文件的权
限，可修改/etc/vsftpd/vusers.d/wang文件，在里面添加如下选项并设置为YES即可,只读则设为NO
#注意：需确保对应的映射用户对于文件系统有写权限
[root@centos7 ~]#vim /etc/vsftpd/conf.d/ftp_wang
anon_upload_enable={YES|NO}
anon_mkdir_write_enable={YES|NO}
anon_other_write_enable={YES|NO}
#登录目录改变至指定的目录
local_root=/data/ftproot2
```

# 二、NFS 服务

## 2.1 NFS工作原理

![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-8b28d7ba.png?imageView2/2/w/1280/format/jpg/interlace/1/q/100)

NFS：Network File System 网络文件系统，基于内核的文件系统。Sun 公司开发，通过使用 NFS，用户和程序可以像访问本地文件一样访问远端系统上的文件，基于RPC（Remote Procedure CallProtocol 远程过程调用）实现

RPC采用C/S模式，客户机请求程序调用进程发送一个有进程参数的调用信息到服务进程，然后等待应答信息。在服务器端，进程保持睡眠状态直到调用信息到达为止。当一个调用信息到达，服务器获得进程参数，计算结果，发送答复信息，然后等待下一个调用信息，最后，客户端调用进程接收答复信息，获得进程结果，然后调用执行继续进行

![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-760e5e44.png?imageView2/2/w/1280/format/jpg/interlace/1/q/100)

NFS优势：节省本地存储空间，将常用的数据,如：/home目录，存放在NFS服务器上且可以通过网络访问，本地终端将可减少自身存储空间的使用

## 2.2 NFS软件介绍

**软件包：** nfs-utils（包括服务器和客户端相关工具，CentOS8 最小化安装时默认没有安装）

**相关软件包：** rpcbind（必须），tcp\_wrappers

**Kernel支持：** nfs.ko

**端口：** 2049(nfsd), 其它端口由portmap(111)分配

**NFS服务主要进程：**

- rpc.nfsd 最主要的NFS进程，管理客户端是否可登录
- rpc.mountd 挂载和卸载NFS文件系统，包括权限管理
- rpc.lockd 非必要，管理文件锁，避免同时写出错
- rpc.statd 非必要，检查文件一致性，可修复文件

说明：CentOS 6 开始portmap进程由rpcbind代替

**日志：**/var/lib/nfs/

**NFS配置文件：**

```
/etc/exports
/etc/exports.d/*.exports
```

## 2.3 NFS共享配置文件格式

```
/dir 主机1(opt1,opt2) 主机2(opt1,opt2)...
```

**格式说明：**

- 以#开始的行为注释
- 主机格式：

```
anonymous：表示使用*通配所有客户端
单个主机：ipv4，ipv6，FQDN
IP networks：两种掩码格式均支持
172.18.0.0/255.255.0.0
172.18.0.0/16
wildcards：主机名通配，例如:*.magedu.com，IP不可以
netgroups：NIS域的主机组，@group_name
```

- 每个条目指定目录导出到的哪些主机，及相关的权限和选项

```
默认选项：(ro,sync,root_squash,no_all_squash)
ro,rw 只读和读写
async 异步，数据变化后不立即写磁盘，先写入到缓冲区中，过一段时间再写入磁盘，性能高,安全性低
sync（1.0.0后为默认）同步，数据在请求时立即写入共享存储磁盘,性能低,安全性高
root_squash （默认）远程root映射为nfsnobody,UID为65534，CentOS8 为nobody,CentOS7以前的版本为nfsnobody
no_root_squash 远程root映射成NFS服务器的root用户
all_squash 所有远程用户(包括root)都变成nfsnobody,CentOS8 为nobody
no_all_squash （默认）保留共享文件的UID和GID
anonuid和anongid 指明匿名用户映射为特定用户UID和组GID，而非nobody,可配合all_squash使用
```

## 2.4 NFS工具

### 2.4.1 rpcinfo

rpcinfo 工具可以查看RPC相关信息

查看注册在指定主机的RPC程序

```
rpcinfo -p hostname
```

查看RPC注册程序

```
rpcinfo -s hostname
```

### 2.4.2 exportfs

exportfs:可用于管理NFS导出的文件系统

常见选项：

```
-v #查看本机所有NFS共享
-r #重读配置文件，并共享目录
-a #输出本机所有共享
-au #停止本机所有共享
```

### 2.4.3 showmount

常见用法：

```
#查看远程主机的NFS共享
showmount -e hostname
```

### 2.4.4 mount.nfs

客户端NFS挂载

NFS相关的挂载选项：man 5 nfs

```
fg #（默认）前台挂载
bg #后台挂载
hard #（默认）持续请求
soft   #非持续请求
intr   #和hard配合，请求可中断
rsize #和wsize 一次读和写数据最大字节数，rsize=32768
_netdev #无网络连接不挂载
vers    #指定版本，客户端centos8默认4.2 ，centos7默认4.1 centos6默认4.0
```

提示：基于安全考虑，建议使用 nosuid,*netdev,noexec 挂载选项*

**范例：临时挂载NFS共享**

```
mount -o rw,nosuid,fg,hard,intr 172.16.0.1:/testdir /mnt/nfs/
```

**范例：开机挂载**

```
vim /etc/fstab
172.16.0.1:/public   /mnt/nfs   nfs   defaults,_netdev  0  0
```

## 2.5 自动挂载

可使用 autofs 服务按需要挂载外围设备，NFS共享等，并在空闲5分钟后后自动卸载

### 2.5.1 相关包和文件

软件包：autofs

服务文件：/usr/lib/systemd/system/autofs.service

配置文件：/etc/auto.master

**安装：**

```
[20:46:45 root@mysql ~]#yum install -y autofs
[20:47:22 root@mysql ~]#systemctl enable --now autofs.service
```

### 2.5.2 配置文件格式

参看帮助：man 5 autofs

所有导出到网络中的NFS启用特殊匹配 -host 至“browse”

范例：/net目录可以自动挂载NFS共享

```
cat /etc/auto.master
/net    -hosts
cd /net/192.168.8.100/
```

**自动挂载资源有两种格式：**

相对路径法：将mount point 路径分成 dirname 和 basename 分别配置，可能会影响现有的目录结构

绝对路径法：直接匹配全部的绝对路径名称，都写入到指定的配置文件里,不会影响本地目录结构

#### 2.5.2.1 相对路径法

1. /etc/auto.master 格式

```
挂载点的dirname     指定目录的配置文件路径,如:/etc/test.auto
```

2. 指定目录的配置文件格式

```
#/etc/test.auto
挂载点的basename     挂载选项     选项设备
```

**范例：相对路径法**

```
[20:48:00 root@mysql ~]#vim /etc/auto.master
/misc   /etc/auto.misc
[20:50:35 root@mysql ~]#vim /etc/auto.misc
cd      -fstype=iso9660,ro,nosuid,nodev :/dev/cdrom
```

**范例：相对路径法为支持通配符**

```
vim /etc/auto.master
/misc   /etc/auto.misc
vim /etc/auto.misc
#表示/misc下面的子目录和nfs共享/export目录的子目录同名
* server:/export/&
```

#### 2.5.2.2 绝对路径法

1. /etc/auto.master 格式

```
/-         指定配置文件路径
```

2. 指定配置文件格式

```
挂载点完整的绝对路径       挂载选项     选项设备
```

**范例：绝对路径法**

```
vim /etc/auto.master:
/-        /etc/auto.direct
vim  /etc/auto.direct:
/foo            -fstype=nfs server1:/export/foo
/user/local/    -fstype=nfs,vers=3 server1:/usr/local
/mnt/cdrom      -fstype=iso9660 :/dev/cdrom
```

## 2.6 实战案例（自动挂载）

### 2.6.1 目标

将NFS的共享目录，通过autofs 发布出来，做为远程主机用户的家目录

### 2.6.2 环境准备

```
共三台主机
一台主机 nfs server
IP:192.168.10.71
另两台当 nfs client
IP:192.168.10.81
IP:192.168.10.82
```

### 2.6.3 步骤

```
#NFS服务器创建用户和相应的家目录，将用户wang的家目录共享
[20:59:50 root@nfs ~]#mkdir -pv /data/home
[21:00:55 root@nfs ~]#useradd -d /data/home/user1 -u 2000 user1
[21:01:19 root@nfs ~]#vim /etc/exports.d/test.exports
/data/home *(rw)
[21:02:03 root@nfs ~]#systemctl enable --now nfs-server.service
#在第一台NFS客户端主机10.0.0.7上实现相对路径法的autofs
[20:59:32 root@centos8 ~]#useradd -M -u 2000 user1
[21:02:52 root@centos8 ~]#yum install autofs
[21:03:37 root@centos8 ~]#vim /etc/auto.master
/home   /etc/auto.home
[21:05:08 root@centos8 ~]#cat /etc/auto.home
* -fstype=nfs,vers=3 192.168.10.71:/data/home/&
 [21:05:15 root@centos8 ~]#systemctl start autofs.service
 [21:08:48 root@centos8 home]#su - user1
 Last login: Wed Mar 10 21:05:58 CST 2021 on pts/0
 [user1@centos8 ~]$ pwd
 /home/user1
#注意：home目录下其它用户家目录无法访问

#在第二台NFS客户端主机10.0.0.6上实现绝对路径法的autofs
[20:59:58 root@centos8 ~]#yum install autofs -y
[21:11:03 root@centos8 ~]#vim /etc/auto.master
/- /etc/auto.home
[21:12:26 root@centos8 ~]#vim /etc/auto.home
/home/user1 -fstype=nfs,vers=3 192.168.10.71:/data/home/user1
[21:12:57 root@centos8 ~]#systemctl start autofs.service
[21:13:05 root@centos8 ~]#su - user1
[user1@centos8 ~]$ pwd
/home/user1
[user1@centos8 ~]$ ls /home/
user1  zhang
```

# 三、SAMBA 服务

## 3.1 SAMBA 服务简介

SMB：Server Message Block 服务器消息块，IBM发布，最早是DOS网络文件共享协议,是私有协议

CIFS：common internet file system，微软基于SMB发布

SAMBA：1991年Andrew Tridgell,实现 windows和UNIX相通

官方网站：<http://www.samba.org/>

**SAMBA的功能：**

- 共享文件和打印，实现在线编辑
- 实现登录SAMBA用户的身份认证
- 可以进行NetBIOS名称解析
- 外围设备共享

**Windows计算机网络管理模式：**

- 工作组WORKGROUP：计算机对等关系，帐号信息各自管理
- 域DOMAIN：C/S结构，帐号信息集中管理，DC,AD

## 3.2 SAMBA 软件介绍

**相关包：**

- samba 提供smb服务器端
- samba-client 客户端软件
- samba-common 通用软件
- cifs-utils smb 客户端工具
- samba-winbind 和AD相关

**相关服务进程：**

- smbd 提供smb（cifs）服务 TCP:139,445
- nmbd NetBIOS名称解析 UDP:137,138

主配置文件：/etc/samba/smb.conf 帮助参看：man smb.conf

语法检查： testparm [-v] [/etc/samba/smb.conf]

客户端工具：smbclient，mount.cifs

范例：

```
[11:51:59 root@samba ~]#dnf install -y samba
[11:56:43 root@samba ~]#systemctl enable --now smb
[11:56:43 root@samba ~]#systemctl enable --now nmb
```

## 3.3 SAMBA客户端工具

UNC路径: Universal Naming Convention,通用命名规范，格式如下

```
\\sambaserver\sharename
```

**win断开samba连接**

```
net use * /del /y
```

### 3.3.1 使用smbclient 访问SAMBA服务器

```
smbclient -L instructor.example.com
smbclient -L instructor.example.com -U smb用户%password
#可以使用-U选项来指定用户%密码，或通过设置和导出USER和PASSWD环境变量来指定
smbclient //instructor.example.com/shared -U wang

> cd directory
> get file1
> put file2
```

### 3.3.2 挂载CIFS文件系统

**范例：手动挂载**

```
mount -o user=wang,password=magedu //server//shared   /mnt/smb
```

**范例：开机自动挂载**

```
cat /etc/fstab
#可以用文件代替用户名和密码的输入
//server/homes /mnt cifs credentials或cred=/etc/smb.txt 0 0
cat /etc/smb.txt
username=wang #或 user=wang
password=password #或 pass=password
chmod 600 /etc/smb.txt
#此方法需要安装cifs-utils包
```

## 3.4 管理SAMBA用户

### 3.4.1 实现samba用户说明

包：samba-common-tools

工具：smbpasswd pdbedit

用户数据库：/var/lib/samba/private/passdb.tdb

**说明：samba用户须是Linux用户，建议使用/sbin/nologin**

### 3.4.2 管理用户命令

**添加 samba用户**

```
[12:00:06 root@samba ~]#useradd -s /sbin/nologin smb1
[12:00:51 root@samba ~]#smbpasswd -a smb1

[12:01:04 root@samba ~]#useradd -s /sbin/nologin smb2
[12:02:32 root@samba ~]#pdbedit -a -u smb2
```

**修改用户密码：**

```
[12:02:50 root@samba ~]#smbpasswd smb1
```

**删除用户和密码：**

```
[12:04:16 root@samba ~]#smbpasswd -a smb2
[12:04:29 root@samba ~]#pdbedit -x -u smb2
```

**查看samba用户列表：**

```
[12:05:02 root@samba ~]#pdbedit -L -v
```

**范例: 创建samba用户**

```
#注意不要用-r 设为系统用户,因为不会生成家目录
[12:05:05 root@samba ~]#useradd -s /sbin/nologin zhangzhuo
[12:06:01 root@samba ~]#smbpasswd -a zhangzhuo
[12:06:36 root@samba ~]#pdbedit -L
zhangzhuo:1002:
[12:06:43 root@samba ~]#pdbedit -L -v
-------------------------------------

Unix username:        zhangzhuo
NT username:
Account Flags:        [U          ]
User SID:             S-1-5-21-3442174383-556244549-3621974320-1003
Primary Group SID:    S-1-5-21-3442174383-556244549-3621974320-513
Full Name:
Home Directory:       \\samba\zhangzhuo
HomeDir Drive:
Logon Script:
Profile Path:         \\samba\zhangzhuo\profile
Domain:               SAMBA
Account desc:
Workstations:
Munged dial:
Logon time:           0
Logoff time:          Wed, 06 Feb 2036 23:06:39 CST
Kickoff time:         Wed, 06 Feb 2036 23:06:39 CST
Password last set:    Thu, 11 Mar 2021 12:06:15 CST
Password can change:  Thu, 11 Mar 2021 12:06:15 CST
Password must change: never
Last bad password   : 0
Bad password count  : 0
Logon hours         : FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
```

**查看samba服务器状态：**

```
[12:07:27 root@samba ~]#smbstatus

Samba version 4.12.3
PID     Username     Group        Machine                                   Protocol Version  Encryption           Signing
--------------------------------------------------------------------------------------------------------------------------

1977    smb1         smb1         192.168.10.1 (ipv4:192.168.10.1:63864)    SMB3_11           -                    partial(AES-128-CMAC)

Service      pid     Machine       Connected at                     Encryption   Signing
----------------------------------------------------------------------------------------

IPC$         1977    192.168.10.1  Thu Mar 11 12:01:19 PM 2021 CST  -            -

No locked files
```

## 3.5 SAMBA服务器配置

samba 配置文件 /etc/samba/smb.conf 格式 ，使用.ini文件的格式

帮助：man smb.conf

用 [ ] 分成以下几部分

- 全局设置：

```
[global] 服务器通用或全局设置的部分
```

- 特定共享设置：

```
[homes] 用户的家目录共享
[printers] 定义打印机资源和服务
[sharename] 自定义的共享目录配置
其中：#和;开头的语句为注释，大小写不敏感
```

**samba配置中的宏定义：**

```
%m 客户端主机的NetBIOS名
%M 客户端主机的FQDN
%H 当前用户家目录路径
%U 当前用户的用户名
%g 当前用户所属组
%h samba服务器的主机名
%L samba服务器的NetBIOS名
%I 客户端主机的IP，是i的大写字母
%T 当前日期和时间
%S 可登录的用户名
```

### 3.5.1 SAMBA服务器全局配置

- workgroup 指定工作组名称
- server string 主机注释信息
- netbios name 指定NetBIOS名，可以被SAMBA客户端使用,但不支持ping
  - 注意：netbios name需要启动nmb服务

```
[global]
netbios name = smbserver
```

- interfaces 指定服务侦听接口和IP
- hosts allow 可用逗号，空格，或tab分隔，默认允许所有主机访问，也可在每个共享独立配置，如在[global]设置，将应用并覆盖所有共享设置，可以是以下格式：

```
IPv4 network/prefix: 172.16.0.0/24 IPv4 前缀: 172.16.0.
IPv4 network/netmask: 172.16.0.0/255.255.255.0
主机名: desktop.example.com
以example.com后缀的主机名: .example.com

范例:
hosts allow = 172.16.   .example.com
```

- hosts deny 拒绝指定主机访问，格式和hosts allow 相同
- config file=/etc/samba/conf.d/%U 用户独立的配置文件
- Log file=/var/log/samba/log.%I 不同客户机采用不同日志
- log level = 2 日志级别，默认为0，不记录日志

```
[global]

Log file=/var/log/samba/log.%I
log level = 2
```

- max log size=50 日志文件达到50K，将轮循rotate,单位KB
- Security三种认证方式：

  - user：samba用户（采有linux用户，samba的独立口令）
  - share：匿名(CentOS7不再支持)，已不建议使用
  - server：已不建议使用
- passdb backend = tdbsam 密码数据库格式

### 3.5.2 配置特定目录共享

**每个共享目录应该有独立的[ ]部分**

```
[共享名称]  #远程网络看到的共享名称
comment #注释信息
path #所共享的目录路径
public #能否被guest访问的共享，默认no，和guest=ok 类似
browsable #是否允许所有用户浏览此共享,默认为yes,no为隐藏
writable=yes #可以被所有用户读写，默认为no
read only=no #和writable=yes等价，如与以上设置冲突，放在后面的设置生效，默认只读
write list   #用户，@组名，+组名 之间用逗号分隔，如：writable=no，列表中用户或组可读写，不在列表中用户只读
valid users #特定用户才能访问该共享，如为空，将允许所有用户，用户名之间用空格分隔
```

**范例：基于特定用户和组的共享**

```
vim /etc/samba/smb.conf
[share]
path = /data/dir
valid users=wang,@admins
writeable = no
browseable = no
```

## 3.6 实战案例

### 3.6.1 实战案例：利用SAMBA实现指定目录共享

```
#在samba服务器上安装samba包
[12:42:26 root@samba ~]#yum install samba -y
#创建samba用户和组
[12:42:54 root@samba ~]#groupadd -r admins
[12:44:00 root@samba ~]#useradd -s /sbin/nologin -G admins zhangzhuo
[12:44:40 root@samba ~]#smbpasswd -a zhangzhuo
[12:44:58 root@samba ~]#useradd -s /sbin/nologin cheng
[12:45:29 root@samba ~]#smbpasswd -a cheng
#创建samba共享目录,并设置SElinux
[12:46:21 root@samba ~]#mkdir /testdir/smbshare -p
[12:46:25 root@samba ~]#chgrp admins /testdir/smbshare/
[12:46:41 root@samba ~]#chmod 2775 /testdir/smbshare
#samba服务器配置
[12:47:18 root@samba ~]#vim /etc/samba/smb.conf
path = /testdir/smbshare
write list = @admins
[12:48:26 root@samba ~]#systemctl enable --now smb nmb
#samba客户端访问
zhangzhuo在share目录可读可写，cheng不可以
```

### 3.6.2 实战案例2：实现不同samba用户访问相同的samba共享，实现不同的配置

```
#创建三个samba用户,并指定密码为magedu
[13:09:39 root@samba ~]#useradd -s /sbin/nologin smb1
[13:10:02 root@samba ~]#useradd -s /sbin/nologin smb2
[13:10:04 root@samba ~]#useradd -s /sbin/nologin smb3
[13:11:25 root@samba ~]#smbpasswd -a smb1
[13:11:25 root@samba ~]#smbpasswd -a smb2
[13:11:25 root@samba ~]#smbpasswd -a smb3
#修改samba配置文件

[global]
orkgroup = SAMBA
#在workgroup下加一行
config file =/etc/samba/conf.d/%U     #说明：%U表示用户名
[share]
path =/data/dir
read only = yes
guest ok = yes
write list = @wheel
#针对smb1和smb2用户创建单独的配置文件
[13:15:22 root@samba ~]#mkdir /etc/samba/conf.d
[13:15:46 root@samba ~]#vim /etc/samba/conf.d/smb1
[share]
path = /data/dir1
read only = no
create mask = 0644
#说明：默认为744

#用户smb1，smb2,smb3访问share共享目录，看到目录是不同目录
smbclient //sambaserver/share -U smb1%magedu
smbclient //sambaserver/share -U smb2%magedu
smbclient //sambaserver/share -U smb3%magedu
```

# 四、数据的实时同步

在生产环境，有时会需要两台主机的特定目录实现实时同步。比如，将NFS共享目录的数据文件，自动实时同步到备份服务器特定目录中

![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-d93dcaf2.png?imageView2/2/w/1280/format/jpg/interlace/1/q/100)

## 4.1 实时同步技术介绍

**实现实时同步的方法**

- inotify + rsync 方式实现数据同步
- sersync ：前金山公司周洋（花椒直播）在 inotify 软件基础上进行开发的，功能更加强大

**工作原理：**

- 要利用监控服务（inotify），监控同步数据服务器目录中信息的变化
- 发现目录中数据产生变化，就利用rsync服务推送到备份服务器上

**inotify：**

异步的文件系统事件监控机制，利用事件驱动机制，而无须通过诸如cron等的轮询机制来获取事件，linux内核从2.6.13起支持 inotify，通过inotify可以监控文件系统中添加、删除，修改、移动等各种事件

```
[13:31:06 root@centos8 ~]#grep -i inotify /boot/config-4.18.0-193.el8.x86_64
CONFIG_INOTIFY_USER=y
```

**实现inotify软件：**

- inotify-tools
- sersync
- lrsyncd

**inotify+rsync使用方式**

- inotify 对同步数据目录信息的监控
- rsync 完成对数据的同步
- 利用脚本进行结合

## 4.2 实现 inotify

### 4.2.1 内核支持

**内核是否支持inotify**

Linux支持inotify的内核最小版本为 2.6.13，参看man 7 inotify

```
#列出下面的文件，说明服务器内核支持inotify
[13:32:09 root@centos8 ~]#ls -l /proc/sys/fs/inotify
total 0
-rw-r--r-- 1 root root 0 Mar 11 13:33 max_queued_events
-rw-r--r-- 1 root root 0 Mar 11 13:33 max_user_instances
-rw-r--r-- 1 root root 0 Mar 11 13:33 max_user_watches
[13:33:29 root@centos8 ~]#cat /proc/sys/fs/inotify/max_queued_events
16384
[13:33:55 root@centos8 ~]#cat /proc/sys/fs/inotify/max_user_instances
128
[13:34:01 root@centos8 ~]#cat /proc/sys/fs/inotify/max_user_watches
8192
```

**inotify内核参数说明：**

- max\_queued\_events：inotify 事件队列最大长度，如值太小会出现 Event Queue Overflow 错误，默认值：16384, 生产环境建议调大,比如:327679
- max\_user\_instances：每个用户创建inotify实例最大值，默认值：128
- max\_user\_watches：可以监视的文件的总数量（inotifywait 单进程），默认值：8192,建议调大

**范例：修改参数**

```
[13:36:02 root@centos8 ~]#vim /etc/sysctl.conf
fs.inotify.max_queued_events=66666
fs.inotify.max_user_watches=100000
[13:36:14 root@centos8 ~]#sysctl -p
fs.inotify.max_queued_events = 66666
fs.inotify.max_user_watches = 100000
[13:36:30 root@centos8 ~]#cat /proc/sys/fs/inotify/*
66666
128
100000
```

### 4.2.2 inotify-tools工具

inotify-tools参考文档：<https://github.com/rvoicilas/inotify-tools/wiki>

**安装inotify-tools：基于epel源**

```
[13:36:44 root@centos8 ~]#yum install inotify-tools
```

**inotify-tools包主要工具：**

- inotifywait： 在被监控的文件或目录上等待特定文件系统事件（open ，close，delete等）发生，常用于实时同步的目录监控
- inotifywatch：收集被监控的文件系统使用的统计数据，指文件系统事件发生的次数统计

**inotifywait 命令**

格式:

```
inotifywait [ options ] file1 [ file2 ] [ file3 ] [ ... ]
```

常用选项：

```
-m, --monitor 始终保持事件监听
-d, --daemon 以守护进程方式执行，和-m相似，配合-o使用
-r, --recursive 递归监控目录数据信息变化
-q, --quiet 输出少量事件信息
--exclude  指定排除文件或目录，使用扩展的正则表达式匹配的模式实现
--excludei  和exclude相似，不区分大小写
-o, --outfile  打印事件到文件中，相当于标准正确输出，注意：使用绝对路径
-s, --syslogOutput 发送错误到syslog相当于标准错误输出
--timefmt  指定时间输出格式
--format  指定的输出格式；即实际监控输出内容
-e 指定监听指定的事件，如果省略，表示所有事件都进行监听
```

inotifywait 的--timefmt 时间格式

参考 man 3 strftime

```
%Y #年份信息，包含世纪信息
%y #年份信息，不包括世纪信息
%m #显示月份，范围 01-12
%d #每月的第几天，范围是 01-31
%H #小时信息，使用 24小时制，范围 00-23
%M #分钟，范围 00-59
%S #秒，范例 0-60
```

范例：

```
--timefmt "%Y-%m-%d %H:%M:%S"
```

**inotifywait 的 --format 格式定义**

```
%T  #输出时间格式中定义的时间格式信息，通过 --timefmt option 语法格式指定时间信息
%w  #事件出现时，监控文件或目录的名称信息，相当于dirname
%f  #事件出现时，将显示监控目录下触发事件的文件或目录信息，否则为空，相当于basename
%e  #显示发生的事件信息，不同的事件默认用逗号分隔
%Xe #显示发生的事件信息，不同的事件指定用X进行分隔
```

范例：

```
--format "%T %w%f event: %;e"
--format '%T %w %f'
```

**inotifywait -e 选项指定的事件类型**

```
create           #文件或目录创建
delete           #文件或目录被删除
modify           #文件或目录内容被写入
attrib           #文件或目录属性改变
close_write      #文件或目录关闭，在写入模式打开之后关闭的
close_nowrite    #文件或目录关闭，在只读模式打开之后关闭的
close            #文件或目录关闭，不管读或是写模式
open             #文件或目录被打开
lsdir            #浏览目录内容
moved_to        #文件或目录被移动到监控的目录中
moved_from      #文件或目录从监控的目录中被移动
move            #文件或目录不管移动到或是移出监控目录都触发事件
access          #文件或目录内容被读取
delete_self     #文件或目录被删除，目录本身被删除
unmount         #取消挂载
```

范例：同步文件必要选项

```
-e create,delete,moved_to,close_write,attrib
```

**范例：使用inotifywait**

```
#监控一次性事件，只要有事件发送就退出
[13:54:23 root@centos8 ~]#inotifywait /data
Setting up watches.
Watches established.
/data/ CREATE,ISDIR 1
#持续前台监控，.swx和.swp文件排除这俩个文件是vim打开时生产的文件没有必要监控
[13:54:50 root@centos8 ~]#inotifywait -mrq /data --exclude=".*\.swx|\.swp"

#持续后台监控，并记录日志
[14:11:55 root@centos8 ~]#inotifywait -o /root/inotify.log -drq /data --timefmt "%Y-%m-%d %H:%M:%S" --format "%T %w%f event: %e" -e create,delete,move,close_write,attrib

#持续前台监控特定事件
[14:11:55 root@centos8 ~]#inotifywait -mrq /data --timefmt "%Y-%m-%d %H:%M:%S" --format "%T %w%f event: %e" -e create,delete,move,close_write,attrib
```

## 4.3 rsync

rsync 常用于做为 linux系统下的数据镜像备份工具，实现远程同步，支持本地复制，或者与其他SSH、rsync主机同步数据，支持增量备份，配合任务计划，rsync能实现定时或间隔同步，配合inotify或sersync，可以实现触发式的实时数据同步

官方网站: <http://rsync.samba.org/>

软件包：rsync，rsync-daemon（CentOS 8）

服务文件：/usr/lib/systemd/system/rsyncd.service

配置文件：/etc/rsyncd.conf

端口：873/tcp

### 4.3.1 rsync命令

**rsync 格式**

```
#Local:
rsync [OPTION...] SRC... [DEST]

#Access via remote shell:
Pull:
rsync [OPTION...] [USER@]HOST:SRC... [DEST]
Push:
rsync [OPTION...] SRC... [USER@]HOST:DEST

#Access via rsync daemon:
Pull:
rsync [OPTION...] [USER@]HOST::SRC... [DEST]
rsync [OPTION...] rsync://[USER@]HOST[:PORT]/SRC... [DEST]
Push:
rsync [OPTION...] SRC... [USER@]HOST::DEST
rsync [OPTION...] SRC... rsync://[USER@]HOST[:PORT]/DEST
The ':' usages connect via remote shell, while '::' & 'rsync://' usages connect
to an rsync daemon, and require SRC or DEST to start with a module name.
```

**rsync有三种工作方式：**

1. 本地文件系统上实现同步。命令行语法格式为上述"Local"段的格式。
2. 本地主机使用远程shell和远程主机通信。命令行语法格式为上述"Access via remote shell"段的格式。
3. 本地主机通过网络套接字连接远程主机上的rsync daemon。命令行语法格式为上述"Access viarsync daemon"段的格式。

前两者的本质是通过本地或远程shell，而第3种方式则是让远程主机上运行rsyncd服务，使其监听在一

个端口上，等待客户端的连接。

**常见选项：**

```
-v：显示rsync过程中详细信息。可以使用"-vvvv"获取更详细信息。
-P：显示文件传输的进度信息。(实际上"-P"="--partial --progress"，其中的"--progress"才是显
示进度信息的)。
-n --dry-run ：仅测试传输，而不实际传输。常和"-vvvv"配合使用来查看rsync是如何工作的。
-a --archive ：归档模式，表示递归传输并保持文件属性。等同于"-rtopgDl"。
-r --recursive：递归到目录中去。
-t --times：保持mtime属性。强烈建议任何时候都加上"-t"，否则目标文件mtime会设置为系统时间，导致下次更新
：检查出mtime不同从而导致增量传输无效。
-o --owner：保持owner属性(属主)。
g --group：保持group属性(属组)。
-p --perms：保持perms属性(权限，不包括特殊权限)。
-D       ：是"--device --specials"选项的组合，即也拷贝设备文件和特殊文件。
-l  --links：如果文件是软链接文件，则拷贝软链接本身而非软链接所指向的对象
-z       ：传输时进行压缩提高效率
-R --relative：使用相对路径。意味着将命令行中指定的全路径而非路径最尾部的文件名发送给服务端，包括它们的属性。用法见下文示例。
--size-only ：默认算法是检查文件大小和mtime不同的文件，使用此选项将只检查文件大小。
-u --update ：仅在源mtime比目标已存在文件的mtime新时才拷贝。注意，该选项是接收端判断的，不会影响删除行为。
-d --dirs   ：以不递归的方式拷贝目录本身。默认递归时，如果源为"dir1/file1"，则不会拷贝dir1目录，使用该选项将拷贝dir1但不拷贝file1。
--max-size ：限制rsync传输的最大文件大小。可以使用单位后缀，还可以是一个小数值(例如："--max-size=1.5m")
--min-size ：限制rsync传输的最小文件大小。这可以用于禁止传输小文件或那些垃圾文件。
--exclude   ：指定排除规则来排除不需要传输的文件。
--delete   ：以SRC为主，对DEST进行同步。多则删之，少则补之。注意"--delete"是在接收端执行的，所以它是在
：exclude/include规则生效之后才执行的。
-b --backup ：对目标上已存在的文件做一个备份，备份的文件名后默认使用"~"做后缀。
--backup-dir：指定备份文件的保存路径。不指定时默认和待备份文件保存在同一目录下。
-e         ：指定所要使用的远程shell程序，默认为ssh。
--port     ：连接daemon时使用的端口号，默认为873端口。
--password-file：daemon模式时的密码文件，可以从中读取密码实现非交互式。注意，这不是远程shell认证的密码，而是rsync模块认证的密码。
-W --whole-file：rsync将不再使用增量传输，而是全量传输。在网络带宽高于磁盘带宽时，该选项比增量传输更高效。
--existing ：要求只更新目标端已存在的文件，目标端还不存在的文件不传输。注意，使用相对路径时如果上层目录不存在也不会传输。
--ignore-existing：要求只更新目标端不存在的文件。和"--existing"结合使用有特殊功能，见下文示例。
--remove-source-files：要求删除源端已经成功传输的文件
```

**范例：两种格式访问 rsync daemon 服务**  
![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-02d9f751.png?imageView2/2/w/1280/format/jpg/interlace/1/q/100?imageView2/2/w/1280/format/jpg/interlace/1/q/100)

```
#在备份服务器启动 rsync 进程
[14:23:02 root@centos8 ~]#yum install rsync-daemon -y
[14:25:02 root@centos8 ~]#rsync --daemon    #第一次启动没有/etc/rsyncd.conf文件是无法启动的
Failed to parse config file: /etc/rsyncd.conf
[14:25:56 root@centos8 ~]#touch /etc/rsyncd.con
[14:26:15 root@centos8 ~]#rsync --daemon
[14:27:01 root@centos8 ~]#ss -ntlp | grep rsync
LISTEN    0         5                  0.0.0.0:873              0.0.0.0:*        users:(("rsync",pid=18442,fd=4))                                               
LISTEN    0         5                     [::]:873                 [::]:*        users:(("rsync",pid=18442,fd=5))   

[14:28:29 root@centos8 ~]#cat /etc/rsyncd.conf
[backup]
path= /data/backup
read only = no   #指定可读写,默认只读

#指定目录给nobody权限，默认用户以nobody访问此目录
[14:29:13 root@centos8 ~]#setfacl -m u:nobody:rwx /data/backup/

#查看rsync服务器的模块名称
[14:56:42 root@data ~]#rsync 192.168.10.82::
backup         	backup_data

#访问rsync服务器的共享目录
#推
[14:59:02 root@data ~]#rsync /etc/issue rsync://root@192.168.10.82/backup
[14:59:52 root@data ~]#rsync /etc/passwd wang@192.168.10.82::backup
#拉
[15:00:40 root@data ~]#rsync 192.168.10.82::backup/* /opt/
[15:01:31 root@data ~]#rsync rsync://192.168.10.82/backup/* /opt/
```

### 4.3.2 以独立服务方式运行rsync并实现验证功能

范例：以独立服务方式运行 rsync

```
[15:03:55 root@backup ~]#dnf install rsync-daemon

#创建rsync服务器的配置文件
[15:10:19 root@backup ~]#vim /etc/rsyncd.conf
uid = root  #提定以哪个用户来访问共享目录，将之指定为生成的文件所有者，默认为nobody
gid = root  #默认为nobody
#port = 874  可指定非标准端口,默认873/tcp
#use chroot = no
max connections = 0
ignore errors
exclude = lost+found/
log file = /var/log/rsyncd.log
pid file = /var/run/rsyncd.pid
lock file = /var/run/rsyncd.lock
reverse lookup = no

[backup]          #每个模块名对应一个不同的path目录，如果同名后面模块生效
path = /data/backup
comment = backup dir
read only = no    #默认是yes,即只读
auth users = rsyncuser  #默认允许这个用户使用
secrets file = /etc/rsync.pas  #登录验证文件

#服务器端准备目录
[15:10:19 root@backup ~]#mkdir -pv /data/backup -p
#服务器端生成验证文件
[15:11:52 root@backup ~]#echo "rsyncuser:123456" >/etc/rsync.pas
[15:13:03 root@backup ~]#chmod 600 /etc/rsync.pas 
#服务器端启动rsync服务
[15:13:15 root@backup ~]#systemctl start rsyncd.service

#客户端配置密码文件
#也可将密码赋值给环境变量RSYNC_PASSWORD变量,但不安全
#export RSYNC_PASSWORD=magedu
[15:13:37 root@data ~]#echo "123456" >/etc/rsync.pas
[15:14:25 root@data ~]#chmod 600 /etc/rsync.pas   #此为必要项,权限必须修改

#查看远程rsync服务器的模块信息
[15:28:22 root@backup ~]#rsync 192.168.10.81::
backup         	backup dir

#非交互式查看共享目录
[15:33:12 root@backup ~]#rsync rsyncuser@192.168.10.81::backup
Password: 
drwxr-xr-x              6 2021/03/11 15:11:52 .

#非交互式查看共享目录
[15:33:18 root@backup ~]#rsync --password-file=/etc/rsync.pas rsyncuser@192.168.10.81::backup
drwxr-xr-x              6 2021/03/11 15:11:52 .

#客户端测试同步数据
[15:35:22 root@data ~]#rsync -avz --delete --password-file=/etc/rsync.pas /etc/ rsyncuser@192.168.10.81::backup

[15:35:22 root@data ~]#rsync -avz --delete --password-file=/etc/rsync.pas  rsyncuser@192.168.10.81::backup /etc/
```

## 4.4 inotify+rsync+shell 脚本实现实时数据同步

![clipboard.png](https://b3logfile.com/file/2021/03/clipboard-02d9f751.png?imageView2/2/w/1280/format/jpg/interlace/1/q/100?imageView2/2/w/1280/format/jpg/interlace/1/q/100)

**按 5.3 搭建好 rsyncd的备份服务器，在数据服务器上创建inotify\_rsync.sh脚本**

**注意: 此脚本执行前先确保两主机初始数据处于同步状态,此脚本实现后续的数据同步**

```
#备份文件目录，
#写到目录后加/为备份目录下的文件,不备份目录本身
#不写/为备份目录本身及其中的文件
SRC='/data'
#rsyncd服务器配置
DEST='zhang@192.168.10.82::backup'
#rsyncd连接密码
PASSWD='123456'


echo "$PASSWD" >/etc/rsync.pas
chmod 600 /etc/rsync.pas
rpm -q rsync &>/dev/null || yum -y install rsync
rpm -q inotify-tools &>/dev/null || yum install -y inotify-tools

inotifywait -mrq  --exclude='.*\.swp' --timefmt "%Y-%m-%d %H:%M:%S" --format "%T %w %f" -e create,delete,move,close_write,attrib ${SRC} | while read DATE TIME DIR FILE;do
    FILEPATH=${DIR}${FILE}
    rsync -az --delete --password-file=/etc/rsync.pas $SRC $DEST && echo "At ${TIME} on ${DATE},file $FILEPATH was backuped up via rsync" >> /var/log/changelist.log 
done
```

## 4.5 sersync 实现实时数据同步

### 4.5.1 sersync 介绍

sersync类似于inotify，同样用于监控，但它克服了inotify的缺点.

inotify最大的不足是会产生重复事件，或者同一个目录下多个文件的操作会产生多个事件，例如，当监控目录中有5个文件时，删除目录时会产生6个监控事件，从而导致重复调用rsync命令。另外比如：vim文件时，inotify会监控到临时文件的事件，但这些事件相对于rsync来说是不应该被监控的

**sersync 优点：**

- sersync是使用c++编写，而且对linux系统文件系统产生的临时文件和重复的文件操作进行过滤，所以在结合rsync同步的时候，节省了运行时耗和网络资源。因此更快。
- sersync配置很简单，其中提供了静态编译好的二进制文件和xml配置文件，直接使用即可
- sersync使用多线程进行同步，尤其在同步较大文件时，能够保证多个服务器实时保持同步状态
- sersync有出错处理机制，通过失败队列对出错的文件重新同步，如果仍旧失败，则按设定时长对同步失败的文件重新同步
- sersync不仅可以实现实时同步，另外还自带crontab功能，只需在xml配置文件中开启，即也可以按要求隔一段时间整体同步一次，而无需再额外配置crontab功能
- sersync 可以二次开发

sersync项目地址： <https://code.google.com/archive/p/sersync/>

sersync下载地址： <https://code.google.com/archive/p/sersync/downloads>

### 4.5.2 基于rsync daemon 实现 sersync

```
#在数据服务器上下载sersync，并拷贝至相应的目录，设置PATH变量
[root@data-centos8 ~]#wget https://storage.googleapis.com/google-code-archivedownloads/v2/code.google.com/sersync/sersync2.5.4_64bit_binary_stable_final.tar.gz
[17:35:04 root@data ~]#tar xf sersync2.5.4_64bit_binary_stable_final.tar.gz 
[17:35:13 root@data ~]#cp -a GNU-Linux-x86 /usr/local/sersync
[17:35:33 root@data ~]#echo 'PATH=/usr/local/sersync:$PATH' >/etc/profile.d/sersync.sh

#sersync目录只有两个文件：一个是二进制程序文件，一个是xml格式的配置文件
[17:36:49 root@data ~]#ls /usr/local/sersync/
confxml.xml  sersync2
#确认安装rsync客户端工具
[17:37:46 root@data ~]#rpm -q rsync || dnf -y install rsync
rsync-3.1.3-9.el8.x86_64
#备份sersync配置文件
[17:37:59 root@data ~]#cp /usr/local/sersync/confxml.xml /usr/local/sersync/confxml.xml.bak

#修改sersync配置文件
<?xml version="1.0" encoding="ISO-8859-1"?>
<head version="2.5">
    <host hostip="localhost" port="8008"></host>
    <debug start="false"/>       # 是否开启调试模式
    <fileSystem xfs="false"/>
    <filter start="false">       #不开启文件过滤功能，当为true时,以下类型的文件将不同步
	<exclude expression="(.*)\.svn"></exclude>
	<exclude expression="(.*)\.gz"></exclude>
	<exclude expression="^info/*"></exclude>
	<exclude expression="^static/*"></exclude>
    </filter>
    <inotify>    # 监控事件，默认监控
	<delete start="true"/>
	<createFolder start="true"/>
	<createFile start="false"/>
	<closeWrite start="true"/>
	<moveFrom start="true"/>
	<moveTo start="true"/>
	<attrib start="true"/>    #修改此行为true，文件属性变化后也会同步
	<modify start="false"/>
    </inotify>

    <sersync>      # rsync命令的配置段
	<localpath watch="/data">   #修改此行,需要同步的源目录或文件，建议同步目录
	    <remote ip="192.168.10.82" name="backup"/>
 #修改此行,指定备份服务器地址和rsyncdaemon的模块名，如果下面开启了ssh start，此时name为远程shell方式运行时的目标目录
	    <!--<remote ip="192.168.8.39" name="tongbu"/>-->
	    <!--<remote ip="192.168.8.40" name="tongbu"/>-->
	</localpath>
	<rsync>
	    <commonParams params="-artuz"/>     # 指定rsync选项
	    <auth start="true" users="zz" passwordfile="/etc/rsync.pas"/>   
#修改此行为true,指定备份服务器的rsync配置的用户和密码文件 
	    <userDefinedPort start="false" port="874"/><!-- port=874 -->
#指定rsync的非标准端口号
	    <timeout start="false" time="100"/><!-- timeout=100 -->
	    <ssh start="false"/>
#默认使用rsync daemon运行rsync命令,true为使用远程shell模式
	</rsync>
	<failLog path="/tmp/rsync_fail_log.sh" timeToExecute="60"/><!--default every 60mins execute once-->
	 #错误重传及日志文件路径
  <crontab start="false" schedule="600"><!--600mins-->  > #不开启crontab功能
	    <crontabfilter start="false">    #不开启crontab定时传输的筛选功能
		<exclude expression="*.php"></exclude>
		<exclude expression="info/*"></exclude>
	    </crontabfilter>
	</crontab>
	<plugin start="false" name="command"/>
    </sersync>
#####################################以下行不需要修改
    <plugin name="command">
	<param prefix="/bin/sh" suffix="" ignoreError="true"/>	<!--prefix /opt/tongbu/mmm.sh suffix-->
	<filter start="false">
	    <include expression="(.*)\.php"/>
	    <include expression="(.*)\.sh"/>
	</filter>
    </plugin>

    <plugin name="socket">
	<localpath watch="/opt/tongbu">
	    <deshost ip="192.168.138.20" port="8009"/>
	</localpath>
    </plugin>
    <plugin name="refreshCDN">
	<localpath watch="/data0/htdocs/cms.xoyo.com/site/">
	    <cdninfo domainname="ccms.chinacache.com" port="80" username="xxxx" passwd="xxxx"/>
	    <sendurl base="http://pic.xoyo.com/cms"/>
	    <regexurl regex="false" match="cms.xoyo.com/site([/a-zA-Z0-9]*).xoyo.com/images"/>
	</localpath>
    </plugin>
</head>

#创建连接rsynd服务器的用户密码文件,并必须修改权限
[root@data-centos8 ~]#echo magedu > /etc/rsync.pas
[root@data-centos8 ~]#chmod 600 /etc/rsync.pas

#查看帮助
[17:43:19 root@data ~]#sersync2 -h

#以后台方式执行同步
[17:43:32 root@data ~]#sersync2 -dro /usr/local/sersync/confxml.xml

#如果同步失败,可以手动执行下面命令,观察过程
[17:49:16 root@data data]#cd /data && rsync -artuz -R --delete ./ zz@192.168.10.82::backup --password-file=/etc/rsync.pas

#sersync支持多实例，也即监控多个目录时，只需分别配置不同配置文件，然后使用sersync2指定对应配置文件运行
[17:43:32 root@data ~]#sersync2 -dr -o /usr/local/sersync/confxml.xml
```

### 4.5.3 基于远程shell 实现 sersync

**基于shell的备份不管是备份端还是数据端都得安装rsync软件**

```
<sersync>
	<localpath watch="/data">    #修改此行,指定源数据目录
 #修改此行指定备份服务器地址和备份目标目录
	    <remote ip="192.168.10.82" name="/data/backup"/>
	    <!--<remote ip="192.168.8.39" name="tongbu"/>-->
	    <!--<remote ip="192.168.8.40" name="tongbu"/>-->
	</localpath>
	<rsync>
	    <commonParams params="-artuz"/>
#必须修改此行,不启用认证
	    <auth start="false" users="root" passwordfile="/etc/rsync.pas"/>
	    <userDefinedPort start="false" port="874"/><!-- port=874 -->
	    <timeout start="false" time="100"/><!-- timeout=100 -->
	    <ssh start="true"/>
#修改此行为true,使用远程shell方式的rsync连接方式，无需在目标主机上配置启动rsync daemon服务
#####################################以下行不需要修改
	</rsync>
	<failLog path="/tmp/rsync_fail_log.sh" timeToExecute="60"/><!--default every 60mins execute once-->
	<crontab start="false" schedule="600"><!--600mins-->
	    <crontabfilter start="false">
		<exclude expression="*.php"></exclude>
		<exclude expression="info/*"></exclude>
	    </crontabfilter>
	</crontab>
	<plugin start="false" name="command"/>
    </sersync>

    <plugin name="command">
	<param prefix="/bin/sh" suffix="" ignoreError="true"/>	<!--prefix /opt/tongbu/mmm.sh suffix-->
	<filter start="false">
	    <include expression="(.*)\.php"/>
	    <include expression="(.*)\.sh"/>
	</filter>
    </plugin>

    <plugin name="socket">
	<localpath watch="/opt/tongbu">
	    <deshost ip="192.168.138.20" port="8009"/>
	</localpath>
    </plugin>
    <plugin name="refreshCDN">
	<localpath watch="/data0/htdocs/cms.xoyo.com/site/">
	    <cdninfo domainname="ccms.chinacache.com" port="80" username="xxxx" passwd="xxxx"/>
	    <sendurl base="http://pic.xoyo.com/cms"/>
	    <regexurl regex="false" match="cms.xoyo.com/site([/a-zA-Z0-9]*).xoyo.com/images"/>
	</localpath>
    </plugin>
</head>


#启用
[17:43:32 root@data ~]#sersync2 -dro /usr/local/sersync/confxml.xml
```

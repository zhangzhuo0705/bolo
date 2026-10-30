---
title: "运维自动化之系统部署"
date: 2021-05-17T16:26:59+08:00
lastmod: 2021-06-02T10:36:42+08:00
draft: false
description: "围绕 PXE、DHCP、TFTP 与 Cobbler 的协作流程，实现系统批量自动化安装。"
cover: "https://b3logfile.com/bing/20180318.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["应用服务"]
tags: ["dhcp", "TFTP", "PXE", "cobbler"]
toc: true
---
# 一、系统安装过程

## 1.1 运维自动化发展历程及技术应用

![image-20210517140958194](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210517140958194.png)

## 1.2 系统安装过程

- 加载boot loader
- 加载启动安装菜单
- 加载内核和initrd文件
- 加载根系统
- 运行anaconda的安装向导

### 1.2.1 Linux安装光盘的安装相关文件

**在系统光盘的isolinux目录下有和安装相关的文件**

- boot.cat: 相当于grub的第一阶段
- isolinux.bin：光盘引导程序，在mkisofs的选项中需要明确给出文件路径，这个文件属于SYSLINUX项目
- **isolinux.cfg：启动菜单的配置文件，当光盘启动后（即运行isolinux.bin），会自动去找isolinux.cfg文件**
- vesamenu.c32：是光盘启动后的启动菜单图形界面，也属于SYSLINUX项目，menu.c32提供纯文本的菜单
- memtest： 内 存 检 测 程 序
- splash.png：光盘启动菜单界面的背景图
- vmlinuz： 是 内 核 映 像
- initrd.img：ramfs文件

### 1.2.2 安装菜单的内核参数

安装光盘的启动菜单配置文件：isolinux/isolinux.cfg中设置相关的内核加载参数，实现不同的安装过程 **isolinux.cfg文件中每个安装对应菜单选项：**

- 加载内核：isolinuz/vmlinuz
- 向内核传递参数：append initrd=initrd.img 参数设置

#### 1.2.2.1 指定内核参数方法

- **在启动菜单界面，选中一项安装方法，按tab键,在后面增加参数**
- **在启动菜单界面，任意选中一项安装方法，按ESC键：boot: linux 参数设置**

#### 1.2.2.2 常见的内核参数

- **text：默认启动GUI安装接口，可以指定文本方式的安装界面**
- **rescue：进入救援模式**
- **inst.repo=path：指定安装源文件的路径，可以是以下格式**

**Centos 6**

```bash
DVD drive repo=cdrom :device 
Hard Drive repo=hd:device/path 
HTTP Server repo=http://host/path 
HTTPS Server repo=https://host/path 
FTP Server repo=ftp://username:password@host/path 
NFS Server repo=nfs:server:/path 
ISO images on an NFS Server repo=nfsiso:server:/path
```

**Centos 7 以上版本**

```bash
Any CD/DVD drive   inst.repo=cdrom 
Hard Drive inst.repo=hd:device:/path 
HTTP Server inst.repo=http://host/path 
HTTPS Server inst.repo=https://host/path 
FTP Server inst.repo=ftp://username:password@host/path 
NFS Server inst.repo=nfs:[options:]server:/path
```

- askmethod：选择安装源文件的获取方法，提供了光盘，本地硬盘，NFS，FTP，HTTP多种安装源，此项Centos7以后已废弃
- **ks=path：指定自动安装应答文件路径**

```bash
initrd=initrd.img inst.ks=http://10.0.0.8/ksdir/centos8.cfg
```

- **ip=：指定地址信息**

```bash
ip=method，method #可以为dhcp 
ip=interface:method #指定特定接口 
ip=ip::gateway:netmask:hostname:interface:none   #静态IP
```

### 1.2.3 anaconda安装向导

anaconda是Linux系统安装程序，可以提供俩种风格的安装界面

- gui：图形窗口
- tui: 基于图形库curses的文本窗口

#### 1.2.3.1 anaconda工作过程

- 安装过程使用的语言
- 键盘类型
- 时区和时间
- 安装源文件路径
- 选定要安装的程序包
- 安装目标存储设备及分区设置 Basic Storage：本地磁盘
- - 特殊设备：iSCSI
- KDUMP功能
- 设定主机名和配置网络接口
- 安全策略
- 管理员密码
- 创建一个普通用户

**anaconda的配置方式：**

- 交互式配置方式
- 通过读取事先给定的配置文件自动完成配置，加内核参数：ks=/path实现指明kickstart文件的位置，各种路径格式如下：

```bash
DVD drive: ks=cdrom:/PATH/TO/KICKSTART_FILE 
Hard drive: ks=hd:device:/directory/KICKSTART_FILE 
HTTP server: ks=http://host:port/path/to/KICKSTART_FILE 
FTP server: ks=ftp://host:port/path/to/KICKSTART_FILE 
HTTPS server: ks=https://host:port/path/to/KICKSTART_FILE 
NFS server:ks=nfs:host:/path/to/KICKSTART_FILE
```

**范例：用boot光盘启动利用网络源安装**

```bash
[16:21:59 root@centos7 ~]#yum install -y httpd
[16:19:53 root@centos7 ~]#mkdir -p /var/www/html/centos/{7,8}/x86_64
[16:21:04 root@centos7 ~]#systemctl enable --now httpd.service 
[16:22:07 root@centos7 ~]#mount /dev/sr0 /var/www/html/centos/8/x86_64/
```

创建新的虚拟机，关联CentOS-8.3.2011-x86_64-boot.iso文件到光驱，配置如下

![image-20210517141254932](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210517141254932.png)

光盘启动，先启用网卡，指定安装源

**注意：Centos7只有一个yum源就指到镜像根目录就可以了Centos8有俩个源分别是AppStream和BaseOS需要指定到这俩个目录下**

![image-20210517141309790](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210517141309790.png)

设置完毕后安装

![image-20210517141323809](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210517141323809.png)

# 二、自动安装的应答文件

实现自动安装前，需要制作对应的安装应答文件，称为kickstart文件，用于保存安装过程需要指定的选 项。

## 2.1 kickstart文件使用过程

1. Create a Kickstart file.
2. Make the Kickstart file available on removable media, a hard drive or a network location.
3. Create boot media, which will be used to begin the installation.
4. Make the installation source available.
5. Start the Kickstart installation.

## 2.2 kickstart文件的格式

### 2.2.1 Kickstart文件格式官方说明

https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/8/html/performing_an_advanced_rhel_installation/index

https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/7/html/installation_guide/sect-kickstart-syntax

https://access.redhat.com/documentation/enus/red_hat_enterprise_linux/6/html/installation_guide/s1-kickstart2-options

### 2.2.2 kickstart文件格式说明

**kickstart文件主要包括三个部分：命令段，程序包段，脚本段**

- 命令段：指明各种安装前配置，如键盘类型等
- - 命令段中的常见命令：
  - keyboard: 设定键盘类型
  - lang: 语言类型
  - zerombr：清除mbr
  - clearpart：清除分区
  - part: 创建分区
  - rootpw: 指明root的密码
  - timezone: 时区
  - text: 文本安装界面
  - network:指定网络设置
  - firewall：设置防火墙设置
  - selinux：设置selinux设置
  - reboot：安装完自动重启
  - user：安装完成后为系统创建新用户
  - url：指明安装源
- 程序包段：指明要安装的程序包组或程序包，不安装的程序包等
- - %packages
  - @^environment group： 指定环境包组，如：@^minimal-environment
  - @group_name
  - package
  - -package
  - %end
- 脚本段：
- - %pre: 安装前脚本
  - %post: 安装后脚本

**注意：**

- **Centos 8,7,6不同版本的kickstart文件格式不尽相同，不可混用**
- **%addon, %packages, %onerror, %pre 、 %post 必须以%end结束，否则安装失败**

**范例：Centos8的最小化安装kickstart文件**

```bash
#version=RHEL8
ignoredisk --only-use=sda
Partition clearing information
Use graphical install
text
zerombr
reboot
clearpart --all --initlabel
selinux --disabled
firewall --disabled
Use CDROM installation media
url --url="http://192.168.10.71/centos/8/x86_64"
Keyboard layouts
keyboard --vckeymap=us --xlayouts='us'
System language
lang en_US.UTF-8
Network information
bootloader --append="net.ifnames=0" --location=mbr --boot-drive=sda
network  --bootproto=dhcp --device=eth0 --ipv6=auto --activate
network  --hostname=localhost.localdomain
Root password
rootpw --iscrypted $6$q76Q7kMy.HLaa0Jc$pN1iBqDhYaNZNqLxV.8Qz8QwxgRYB3NXt7/1ikn4buFXhI8GrYUj3hzYhN5Bdw5LzmmZAbXEg9KNx8cC67J73.
Run the Setup Agent on first boot
firstboot --enable
Do not configure the X Window System
skipx
System services
services --disabled="chronyd"
System timezone
timezone Asia/Shanghai --isUtc --nontp
#Disk partitioning information
part /boot --fstype="ext4" --ondisk=sda --size=1024
part /     --fstype="xfs" --ondisk=sda --size=10240
%packages
@^minimal-environment
vim
tree
wget
curl
%end
%addon com_redhat_kdump --disable --reserve-mb='auto'
%end
%anaconda
pwpolicy root --minlen=6 --minquality=1 --notstrict --nochanges --notempty
pwpolicy user --minlen=6 --minquality=1 --notstrict --nochanges --emptyok
pwpolicy luks --minlen=6 --minquality=1 --notstrict --nochanges --notempty
%end
%post
mkdir /root/.ssh -m 700 
cat > /root/.ssh/authorized_keys <<EOF
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDLHJojzR16nNVt7F8Zyn7Mw+Wxffshj093eiswWK45HPo/WtV4AORBka5iYHOFaA9Dp7wxNTLiPVgX3ud47U8OwEEHxJmyXbP8kIH/xOZGovMd3XukF7jUUNwQJJkYUnsInypHxs95bD0png2OgR2oq31FtccTAQ7mUFr5AiW0FsI9ue2sJQVdEEM+kB674mRbZK0bv75Ezh7IvrprbXzgRhY5IBQdRxHDyarRnaNs7MRS+bhZ2K+Zon5vi9ZxQO+9wXWSskCzEzMpVaKwuOXGnfd2y5PPUQ7KDOPN8usF9r+fkE1h8T6TgDAp24ERUEWX4bDQPcXjQKZt4YHofzXh root@centos7
EOF
chmod 600 /root/.ssh/authorized_keys
%end
```

**范例：Centos7的最小化安装kickstart文件**

```bash
#platform=x86, AMD64, or Intel EM64T
#version=DEVEL
Install OS instead of upgrade
install
Keyboard layouts
keyboard 'us'
Root password
rootpw --iscrypted $1$NxU3dKmV$fRJv0NpyNJv6sQSK2SEh//
System language
lang en_US
System authorization information
auth  --useshadow  --passalgo=sha512
Use text mode install
text
SELinux configuration
selinux --disabled
Do not configure the X Window System
skipx
Firewall configuration
firewall --disabled
Network information
network  --bootproto=dhcp --device=eth0
Reboot after installation
reboot
System timezone
timezone Asia/Shanghai
Use network installation
url --url="http://192.168.10.71/centos/7/x86_64"
System bootloader configuration
bootloader --append="net.ifnames=0" --location=mbr
Clear the Master Boot Record
zerombr
Partition clearing information
clearpart --all --initlabel
Disk partitioning information
part /boot --fstype="ext4" --size=1000
part / --fstype="xfs" --size=10000
%post
mkdir /root/.ssh -m 700
cat > /root/.ssh/authorized_keys <<EOF
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDLHJojzR16nNVt7F8Zyn7Mw+Wxffshj093eiswWK45HPo/WtV4AORBka5iYHOFaA9Dp7wxNTLiPVgX3ud47U8OwEEHxJmyXbP8kIH/xOZGovMd3XukF7jUUNwQJJkYUnsInypHxs95bD0png2OgR2oq31FtccTAQ7mUFr5AiW0FsI9ue2sJQVdEEM+kB674mRbZK0bv75Ezh7IvrprbXzgRhY5IBQdRxHDyarRnaNs7MRS+bhZ2K+Zon5vi9ZxQO+9wXWSskCzEzMpVaKwuOXGnfd2y5PPUQ7KDOPN8usF9r+fkE1h8T6TgDAp24ERUEWX4bDQPcXjQKZt4YHofzXh root@centos7
EOF
chmod 600 /root/.ssh/authorized_keys
%end
%packages
@development
@mail-server
%end
```

**范例：Centos6的最小化安装kickstart文件**

```bash
#platform=x86, AMD64, or Intel EM64T
#version=DEVEL
Install OS instead of upgrade
install
Keyboard layouts
keyboard 'us'
Root password
rootpw --iscrypted $1$NxU3dKmV$fRJv0NpyNJv6sQSK2SEh//
System language
lang en_US.UTF-8
System authorization information
auth  --useshadow  --passalgo=sha512
Use text mode install
text
SELinux configuration
selinux --disabled
Do not configure the X Window System
authconfig --enableshadow --passalgo=sha512
Firewall configuration
firewall --disabled
Network information
network --onboot yes  --bootproto=dhcp --device=eth0 --noipv6
Reboot after installation
reboot
System timezone
timezone Asia/Shanghai
Use network installation
url --url="http://192.168.10.71/centos/6/x86_64"
System bootloader configuration
bootloader --append="crashkernel=auto rhgb quiet" --location=mbr --driveorder=sda
Clear the Master Boot Record
zerombr
Partition clearing information
clearpart --all --initlabel
Disk partitioning information
part /boot --fstype="ext4" --size=1000
part / --fstype="ext4" --size=10000
%post
mkdir /root/.ssh -m 700
cat > /root/.ssh/authorized_keys <<EOF
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDLHJojzR16nNVt7F8Zyn7Mw+Wxffshj093eiswWK45HPo/WtV4AORBka5iYHOFaA9Dp7wxNTLiPVgX3ud47U8OwEEHxJmyXbP8kIH/xOZGovMd3XukF7jUUNwQJJkYUnsInypHxs95bD0png2OgR2oq31FtccTAQ7mUFr5AiW0FsI9ue2sJQVdEEM+kB674mRbZK0bv75Ezh7IvrprbXzgRhY5IBQdRxHDyarRnaNs7MRS+bhZ2K+Zon5vi9ZxQO+9wXWSskCzEzMpVaKwuOXGnfd2y5PPUQ7KDOPN8usF9r+fkE1h8T6TgDAp24ERUEWX4bDQPcXjQKZt4YHofzXh root@centos7
EOF
chmod 600 /root/.ssh/authorized_keys
%end
%packages
@development
@mail-server
%end
```

## 2.3 kickstart文件创建

**创建kickstart文件的方式**

- 可使用创建工具：system-config-kickstart ，注意：此方法 CentOS 8 不再支持
- 依据某模板修改并生成新配置，CentOS安装完后，会自动参考当前系统的安装过程，生成一个 kickstart文件 /root/anaconda-ks.cfg

**检查ks文件的语法错误**：

使用 ksvalidator 工具可以检查kickstart的文件格式是否有语法错误，来自于 pykickstart 包

**格式：**

```bash
ksvalidator /PATH/TO/KICKSTART_FILE
```

**范例：使用 system-config-kickstart 生成kickstart`配置文件**

**1.Basic Configuration**

![image-20210517141546646](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210517141546646.png)

**2.Installation Method**

![image-20210517141559361](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210517141559361.png)

**3.Boot Loader Options**

![image-20210517141611890](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210517141611890.png)

**4.Partition In**

![image-20210517141624033](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210517141624033.png)

**5.Network Configuration**

![image-20210517141635970](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210517141635970.png)

**6. Authentication**

![image-20210517141647268](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210517141647268.png)

**7.Firewall Configuration**

![image-20210517141659192](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210517141659192.png)

**8.Display Configuration**

![image-20210517141710349](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210517141710349.png)

**9. Package Selection**

![image-20210517141723525](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210517141723525.png)

```bash
如果包安装的界面不出现可选的包信息，那么需要修改yum仓库配置文件
[root@centos ~]#vim /etc/yum.repos.d/***.repo
[development]
#把原来"[]"内的内容改成development，其它不变
```

**10.pre-Installation script**

**安装前脚本**

**11.post-Installation script**

**安装后脚本**

# **三、制作引导光盘和U盘**

可以将定制安装光盘，并结合kickstart实现基于光盘启动的半自动化安装

**实现过程**

```bash
[20:25:58 root@centos7 myiso]#mkdir -pv /data/myiso/
[20:30:32 root@centos7 myiso]#cp -r /var/www/html/centos/8/x86_64/isolinux /data/myiso/
[20:31:12 root@centos7 myiso]#tree /data/myiso/
/data/myiso/
└── isolinux
    ├── boot.cat
    ├── boot.msg
    ├── grub.conf
    ├── initrd.img
    ├── isolinux.bin
    ├── isolinux.cfg
    ├── ldlinux.c32
    ├── libcom32.c32
    ├── libutil.c32
    ├── memtest
    ├── splash.png
    ├── TRANS.TBL
    ├── vesamenu.c32
    └── vmlinuz

1 directory, 14 files
[20:31:20 root@centos7 myiso]#vim /data/myiso/isolinux/isolinux.cfg 
#方法1应答放在ISO文件中
label linux
menu label ^Install CentOS Linux 8
kernel vmlinuz
append initrd=initrd.img ks=cdrom:/myks.cfg

#方法2：应答放在http服务器中
label linux
menu label ^Install CentOS Linux 8
kernel vmlinuz
append initrd=initrd.img ks=http://192.168.10.71/ks/ks-centos8.cfg
label rescue
menu label ^Rescue a CentOS Linux system
kernel vmlinuz
append initrd=initrd.img inst.repo=http://192.168.10.71/centos/8/x86_64/ rescue quiet

[20:36:08 root@centos7 myiso]#yum install mkisofs
[20:36:35 root@centos7 myiso]#mkisofs -R -J -T -v --no-emul-boot --boot-load-size 4 --boot-info-table -V "CentOS 8.0 x86_64 boot" -b isolinux/isolinux.bin -c isolinux/boot.cat -o /root/boot.iso /data/myiso/ 
注意：以上相对路径都是相对于光盘的根，和工作目录无关
```

**mkisofs选项说明**

![image-20210517141824887](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210517141824887.png)

# 四、实现DHCP服务

**主机获取网络配置可以通过俩种方式：**

- 静态指定
- 动态获取：
- - bootp：boot protocol MAC与IP一一静态对应
  - dhcp：增强的bootp，支持静态和动态

## 4.1 DHCP工作原理

**DHCP：Dynamic Host Configuration Protocol，动态主机配置协议**

**UDP协议，C/S模式，dhcp server：67/udp,dhcpv4c     client:68/udp,dhcpv6 client:546/udp**

**主要用途：**

- 用于内部网络和网络服务提供商自动分配IP地址给用户
- 用于内部网络管理员作为对所有电脑集中管理的手段
- 自动化安装系统
- 解决IPv4资源不足问题

**DHCP共有八种报文**

![image-20210517141902004](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210517141902004.png)

- **DHCP DISCOVER：客户端到服务器**
- **DHCP OFFER：服务器到客户端**
- **DHCP REQUEST:客户端到服务器**
- **DHCP ACK：服务器到客户端**
- DHCP NAK：服务器到客户端，通知用户无法分配合适的IP地址
- DHCP DECLINE：客户端到服务器，指示地址已被使用
- DHCP RELEASE：客户端到服务器，放弃网络地址和取消剩余的租约时间
- DHCP INFORM：客户端到服务器，客户端如果需要从DHCP服务器端获取更为详细的配置信息，则发送Inform报文向服务器进行请求，极少用到

**DHCP服务续租**

- 50% ：租赁时间达到50%时来续租，刚向DHCP服务器发向新的DHCPREQUEST请求。如果dhcp 服务没有拒绝的理由，则回应DHCPACK信息。当DHCP客户端收到该应答信息后，就重新开始新的租用周期
- 87.5%：如果之前DHCP Server没有回应续租请求，等到租约期的7/8时，主机会再发送一次广播请求

**同网段多DHCP服务器**

- DHCP服务必须基于本地
- 先到先得的原则

**跨网段**

- RFC 1542 Compliant Routers
- dhcp relay agent: 中继代理

**相关协议**

- arp
- rarp

**租期：**

- 长租期：IP相对稳定，网络资源消耗较少，但是浪费IP资源
- 短租期：IP相对不稳定，网络资源消耗较多，但是IP资源可以充分利用，可以实现较少IP为较多的主机服务

## 4.2 DHCP实现

**注意：实现DHCP服务前，先将网络已有DHCP服务，如：mware中的DHCP关闭，访止冲突**

DHCP服务的实现软件：

- dhcp（CentOS 7 之前版本） 或 dhcp-server（CentOS 8 中的包名）
- dnsmasq：小型服务软件，可以提供dhcp和dns功能

### 4.2.1 DHCP相关文件组成

**dhcp或dhcp-server 包文件组成**

- /usr/sbin/dhcpd              dhcp服务主程序
- /etc/dhcp/dhcpd.conf      dhcp服务配置文件
- /usr/share/doc/dhcp-server/dhcpd.conf.example    #dhcp服务配置范例文件
- /usr/lib/systemd/system/dhcpd.service    #dhcp服务service文件
- /var/lib/dhcpd/dhcpd.leases      地址分配记录

**dhcp-client客户端包**

- /usr/sbin/dhclient #客户端程序
- /var/lib/dhclient #自动获取的IP信息

**windows 工具**

- ipconfig /release #释放DHCP获取的IP，重新申请IP
- ipconfig/renew #刷新租约，续约

### 4.2.2 DHCP服务器配置文件

**帮助参考：man 5 dhcpd.conf**

/etc/dhcp/dhcpd.conf 格式

全局配置

subnet {

...

}

host {

}

检查语法命令：service dhcpd configtest （CentOS 6 之前版本支持）

**范例：dhcpd.conf**

```bash
[15:46:13 root@centos7 ~]#cat /etc/dhcp/dhcpd.conf 
#
# DHCP Server Configuration file.
#   see /usr/share/doc/dhcp*/dhcpd.conf.example
#   see dhcpd.conf(5) man page
#
option domain-name "zhang.org";             #为客户端指明DNS名字        
option domain-name-servers 180.76.76.76,223.6.6.6;  #为客户端指明DNS服务器IP地址
default-lease-time 600;     #指定缺省租赁的时间的长度，单位是秒
max-lease-time 7200;       #指定最大租赁的时间长度，单位是秒
log-facility local7;
subnet 192.168.10.0 netmask 255.255.255.0 {
    range 192.168.10.230 192.168.10.240;      #地址池
    option routers 192.168.10.2;              #默认网关
    next-server 192.168.10.71;
    filename "pxelinux.0";
}
host testclient {                               下面这个表示这个地址跟主机是绑定的
hardware ethernet 00:0c:29:a0:fc:7d; 
fixed-address 192.168.10.111; 
default-lease-time 86400; 
max-lease-time 864000; 
option routers 192.168.10.2; 
option domain-name-servers 114.114.114.114,8.8.8.8 ; 
option domain-name "zhang.net"; 
}
```

**DHCP配置文件其它配置选项：**

- next-server：提供引导文件的服务器IP地址
- filename: 指明引导文件名称

```bash
subnet 192.168.10.0 netmask 255.255.255.0 {
    range 192.168.10.230 192.168.10.240;      #地址池
    option routers 192.168.10.2;              #默认网关
    next-server 192.168.10.71;                #TFTP服务器地址
    filename "pxelinux.0";                    #bootloader启动文件的名称
}
```

范例：dhcp客户端申请地址的过程

```bash
[root@localhost ~]# dhclient -d
Internet Systems Consortium DHCP Client 4.1.1-P1
Copyright 2004-2010 Internet Systems Consortium.
All rights reserved.
For info, please visit https://www.isc.org/software/dhcp/

Listening on LPF/eth0/00:0c:29:a0:fc:7d
Sending on   LPF/eth0/00:0c:29:a0:fc:7d
Sending on   Socket/fallback
DHCPDISCOVER on eth0 to 255.255.255.255 port 67 interval 8 (xid=0x1c4b1bad)
DHCPOFFER from 192.168.10.71
DHCPREQUEST on eth0 to 255.255.255.255 port 67 (xid=0x1c4b1bad)
DHCPACK from 192.168.10.71 (xid=0x1c4b1bad)
bound to 192.168.10.111 -- renewal in 34688 seconds.

#DHCP客户端日志
[root@localhost ~]# cat /var/lib/dhclient/dhclient.leases 
lease {
  interface "eth0";
  fixed-address 192.168.10.111;
  option subnet-mask 255.255.255.0;
  option routers 192.168.10.2;
  option dhcp-lease-time 86400;
  option dhcp-message-type 5;
  option domain-name-servers 114.114.114.114,8.8.8.8;
  option dhcp-server-identifier 192.168.10.71;
  option domain-name "zhang.net";
  renew 0 2021/01/17 17:43:55;
  rebind 1 2021/01/18 05:05:45;
  expire 1 2021/01/18 08:05:45;
}
#服务器的日志
[16:02:28 root@centos7 ~]#cat /var/lib/dhcpd/dhcpd.leases
```

**范例：DHCP服务器给指定主机分配固定IP**

```bash
[16:08:10 root@centos7 ~]#vim /etc/dhcp/dhcpd.conf
host test {
    hardware ethernet 00:0c:29:a0:fc:7d;
    fixed-address 192.168.10.111;
}
```

# **五、实现TFTP服务**

## 5.1 TFTP介绍

TFTP：Trivial File Transfer Protocol ，是一种用于传输文件的简单高级协议，是文件传输协议（FTP） 的简化版本。用来传输比文件传输协议（FTP）更易于使用但功能较少的文件

**TFTP和FTP的区别**

**1、安全性区别**

FTP支持登录安全，具有适当的身份验证和加密协议，在建立连接期间需要与FTP身份验证通信

TFTP是一种开放协议，缺乏安全性，没有加密机制，与TFTP通信时不需要认证

**2、传输层协议的区别**

FTP使用TCP作为传输层协议，TFTP使用UDP作为传输层协议

**3、使用端口的区别**

FTP使用2个端口：TCP端口21，是个侦听端口；TCP端口20或更高TCP端口1024以上用于源连接

TFTP仅使用一个具有停止和等待模式的端口：端口：69/udp

**4、RFC的区别**

FTP是基于RFC 959文档，带有其他RFC涵盖安全措施；TFTP基于RFC 1350文档

**5、执行命令的区别**

FTP有许多可以执行的命令（get，put，ls，dir，lcd）并且可以列出目录等

TFTP只有5个指令可以执行（rrq，wrq，data，ack，error）

## 5.2 安装和使用TFTP

**安装包：**

- tftp-server #服务器包
- tftp #客户端包

**范例：安装并使用tftp下载文件**

```bash
#安装tftp包
[16:11:05 root@centos7 ~]#yum install tftp-server.x86_64 
[16:15:03 root@centos7 ~]#rpm -ql tftp-server 
/etc/xinetd.d/tftp
/usr/lib/systemd/system/tftp.service    #tftp service文件
/usr/lib/systemd/system/tftp.socket     #tftp socket文件
/usr/sbin/in.tftpd                      #tftp主程序
/usr/share/doc/tftp-server-5.2
/usr/share/doc/tftp-server-5.2/CHANGES
/usr/share/doc/tftp-server-5.2/README
/usr/share/doc/tftp-server-5.2/README.security
/usr/share/man/man8/in.tftpd.8.gz
/usr/share/man/man8/tftpd.8.gz
/var/lib/tftpboot                      #TFTP服务数据目录
#启动服务
[16:17:14 root@centos7 ~]#systemctl start tftp.socket 
[16:20:17 root@centos7 ~]#ss -nulp | grep systemd
UNCONN     0      0         [::]:69                    [::]:*                   users:(("systemd",pid=1,fd=40))

#准备测试文件
[16:20:26 root@centos7 ~]#cp /etc/fstab /var/lib/tftpboot/f1.txt
[16:20:57 root@centos7 ~]#mkdir /var/lib/tftpboot/dir
[16:21:12 root@centos7 ~]#cp /etc/passwd /var/lib/tftpboot/dir/f2.txt

#安装tftp客户端包
[16:22:29 root@centos7 ~]#tftp 192.168.10.71
tftp> help
tftp-hpa 5.2
Commands may be abbreviated.  Commands are:

connect 	connect to remote tftp
mode    	set file transfer mode
put     	send file
get     	receive file
quit    	exit tftp
verbose 	toggle verbose mode
trace   	toggle packet tracing
literal 	toggle literal mode, ignore ':' in file name
status  	show current status
binary  	set mode to octet
ascii   	set mode to netascii
rexmt   	set per-packet transmission timeout
timeout 	set total retransmission timeout
?       	print help information
help    	print help information
tftp> get f1.txt
tftp> get dir/f2.txt
tftp> quit
[16:23:45 root@centos7 ~]#ls
boot.iso  f1.txt  f2.txt  ks-centos6.cfg  ks-centos8.cfg  ks.cfg  swap.img
```

# 六、利用 PXE 实现自动化系统部署

## 6.1 PXE介绍

PXE：Preboot Excution Environment，预启动执行环境，是由Intel公司研发，基于Client/Server的网 络模式，支持远程主机通过网络从远端服务器下载映像，并由此支持通过网络启动操作系统，可以引导 和安装Windows，linux等多种操作系统

**PXE启动工作原理**

![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-a5845b08.png)

## 6.2 利用PXE实现自动化安装流程

![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-52a0a445.png)

1. Client向PXE Server上的DHCP发送IP地址请求消息，DHCP检测Client是否合法（主要是检测Client的网卡MAC地址），如果合法则返回Client的IP地址，同时将启动文件pxelinux.0的所在TFTP服务器地址信息一并传送给Client
2. Client向TFTP服务器发送获取pxelinux.0请求消息，TFTP服务器接收到消息之后，向Client发送pxelinux.0大小信息，试探Client是否满意，当TFTP收到Client发回的同意大小信息之后，正式向Client发送pxelinux.0
3. Client执行接收到的pxelinux.0文件，并利用此文件启动
4. Client向TFTP 服务器发送请求针对本机的配置信息文件（在TFTP 服务器的pxelinux.cfg目录下），TFTP服务器将启动菜单配置文件发回Client，继而Client根据启动菜单配置文件执行后续操作
5. Client根据启动菜单配置文件里的信息，向TFTP发送Linux内核和initrd文件请求信息，TFTP接收到消息之后将内核和initrd文件发送给Client
6. Client向TFTP发送根文件请求信息，TFTP接收到消息之后返回Linux根文件系统
7. Client启动Linux内核,加载相关的内核参数
8. Client通过内核参数下载kickstart文件，并根据kickstart文件里的安装信息，下载安装源文件进行自动化安装

## 6.3 在Centos7上实现PXE自动化安装CentOS

### 6.3.1 安装前准备

关闭防火墙和SELINUX，DHCP服务器静态IP

网络要求：关闭Vmware软件中的DHCP服务

### 6.3.2 安装相关软件包并启动服务

```bash
[17:02:56 root@centos7 ~]#yum install -y httpd tftp-server dhcp syslinux system-config-kickstart
[17:04:02 root@centos7 ~]#systemctl enable --now httpd tftp dhcpd
注意：由于dhcp还没有配置，此时还无法立即启动
```

### 6.3.3 准备yum源和相关目录

```bash
[17:04:10 root@centos7 ~]#mkdir -pv /var/www/html/centos/7/x86_64
[17:06:13 root@centos7 ~]#mkdir /dev/sr2 /var/www/html/centos/7/x86_64
```

### 6.3.4 准备kickstart文件

```bash
[17:07:52 root@centos7 ~]#cat /var/www/html/ks/ks-centos7.cfg  | grep -vE '^#'
install
keyboard 'us'
rootpw --iscrypted $1$NxU3dKmV$fRJv0NpyNJv6sQSK2SEh//
lang en_US
auth  --useshadow  --passalgo=sha512
text
selinux --disabled
skipx

firewall --disabled
network  --bootproto=dhcp --device=eth0
reboot
timezone Asia/Shanghai
url --url="http://192.168.10.71/centos/7/x86_64"
bootloader --append="net.ifnames=0" --location=mbr
zerombr
clearpart --all --initlabel
part /boot --fstype="ext4" --size=1000
part / --fstype="xfs" --size=10000

%post
mkdir /root/.ssh -m 700
cat > /root/.ssh/authorized_keys <
```

### 6.3.5 配置DHCP服务

```bash
[17:11:56 root@centos7 ~]#cat /etc/dhcp/dhcpd.conf
#

# DHCP Server Configuration file.

# see /usr/share/doc/dhcp*/dhcpd.conf.example

# see dhcpd.conf(5) man page

#
option domain-name "zhang.org";
default-lease-time 600;
max-lease-time 7200;
subnet 192.168.10.0 netmask 255.255.255.0 {
range 192.168.10.200 192.168.10.240;
option routers 192.168.10.2;
next-server 192.168.10.71;
filename "pxelinux.0";
}
[17:11:58 root@centos7 ~]#systemctl start dhcpd
```

### 6.3.6 准备PXE启动相关文件

```bash
[17:12:45 root@centos7 ~]#mkdir /var/lib/tftpboot/pxelinux.cfg/
[17:13:08 root@centos7 ~]#cp /usr/share/syslinux/{pxelinux.0,menu.c32} /var/lib/tftpboot/
[17:15:40 root@centos7 ~]#cp /var/www/html/centos/7/x86_64/isolinux/{vmlinuz,initrd.img} /var/lib/tftpboot/
[17:16:08 root@centos7 ~]#cp /var/www/html/centos/7/x86_64/isolinux/isolinux.cfg /var/lib/tftpboot/pxelinux.cfg/default
```

**最终目录如下：**

```bash
[17:17:57 root@centos7 ~]#tree /var/lib/tftpboot/
/var/lib/tftpboot/
├── initrd.img
├── menu.c32
├── pxelinux.0
├── pxelinux.cfg
│   └── default
└── vmlinuz
```

### 6.3.7 准备启动菜单

```bash
[17:35:18 root@centos7 ~]#cat /var/lib/tftpboot/pxelinux.cfg/default
default menu.c32
timeout 600
menu title PXE INSTALL MENU
label auto
menu label ^Auto Install MENU
kernel vmlinuz
append initrd=initrd.img ks=http://192.168.10.71/ks/ks-centos7.cfg

label manual
menu label  ^Manual Install CentOS 7
kernel vmlinuz
append initrd=initrd.img inst.repo=http://192.168.10.71/centos/7/x86_64/

label local
menu default
menu label ^Boot from local drive
localboot 0xffff
```

### 6.3.8 测试客户端基于PXE实现自动安装

新准备一台主机，设置网卡引导，可看到看启动菜单，并实现自动安装

## 6.4 在CentOS8上实现PXE自动化安装Centos6,7,8

### 6.4.1 安装前准备

关闭防火墙和SELINUX，DHCP服务器静态IP

网络要求：关闭Vmware软件中的DHCP服务，基于NAT模式

**注意：使用 1G 以下内存的主机安装CentOS 7，8 会提示空间不足，建议2G以上**

### 6.4.2 安装相关软件包并启动

```bash
[17:49:58 root@centos8 ~]#dnf -y install dhcp-server tftp-server httpd syslinux-nonlinux
[17:52:04 root@centos8 ~]#systemctl enable --now httpd tftp dhcpd
```

### 6.4.3 配置DHCP服务

```bash
[17:57:42 root@centos8 ~]#cat /etc/dhcp/dhcpd.conf
#

# DHCP Server Configuration file.

# see /usr/share/doc/dhcp-server/dhcpd.conf.example

# see dhcpd.conf(5) man page

#
option domain-name "zhang.org";
option domain-name-servers 180.76.76.76,223.6.6.6;
default-lease-time 600;
max-lease-time 7200;
log-facility local7;
subnet 192.168.10.0 netmask 255.255.255.0 {
range 192.168.10.200 192.168.10.240;
option routers 192.168.10.2;
next-server 192.168.10.81;
filename "pxelinux.0";
}
[17:57:53 root@centos8 ~]#systemctl start dhcpd
```

### 6.4.4 准备yum源和相关目录

```bash
[17:57:56 root@centos8 ~]#mkdir -pv /var/www/html/centos/{6,7,8}/x86_64/
[18:01:09 root@centos8 ~]#mount /dev/sr0 /var/www/html/centos/8/x86_64/
[18:01:37 root@centos8 ~]#mount /dev/sr1 /var/www/html/centos/7/x86_64/
[18:01:47 root@centos8 ~]#mount /dev/sr2 /var/www/html/centos/6/x86_64/
#挂载光盘，切记不要挂错
```

### 6.4.5 准备kickstart文件

```bash
[18:02:57 root@centos8 ~]#mkdir /var/www/html/ks
[18:03:30 root@centos8 ~]#ls /var/www/html/ks
ks-centos6.cfg  ks-centos7.cfg  ks-centos8.cfg
```

### 6.4.6 准备PXE启动相关文件

```bash
#准备Centos6，7，8各自的内核文件
[18:04:06 root@centos8 ~]#mkdir /var/lib/tftpboot/centos{6,7,8}
[18:04:57 root@centos8 ~]#cp /var/www/html/centos/6/x86_64/isolinux/{vmlinuz,initrd.img} /var/lib/tftpboot/centos6/
[18:05:43 root@centos8 ~]#cp /var/www/html/centos/7/x86_64/isolinux/{vmlinuz,initrd.img} /var/lib/tftpboot/centos7/
[18:05:52 root@centos8 ~]#cp /var/www/html/centos/8/x86_64/isolinux/{vmlinuz,initrd.img} /var/lib/tftpboot/centos8/
[18:09:53 root@centos8 ~]#cp /usr/share/syslinux/{pxelinux.0,menu.c32} /var/lib/tftpboot/

#以下三个是Centos8安装所必须文件，Centos6，7不需要
[18:06:01 root@centos8 ~]#cp /var/www/html/centos/8/x86_64/isolinux/{ldlinux.c32,libcom32.c32,libutil.c32} /var/lib/tftpboot/

#生成安装菜单文件
[18:08:02 root@centos8 ~]#mkdir /var/lib/tftpboot/pxelinux.cfg/
[18:08:51 root@centos8 ~]#cp /var/www/html/centos/8/x86_64/isolinux/isolinux.cfg /var/lib/tftpboot/pxelinux.cfg/default

#最终目录结构如下
[18:11:06 root@centos8 ~]#tree /var/lib/tftpboot/
/var/lib/tftpboot/
├── centos6
│   ├── initrd.img
│   └── vmlinuz
├── centos7
│   ├── initrd.img
│   └── vmlinuz
├── centos8
│   ├── initrd.img
│   └── vmlinuz
├── ldlinux.c32
├── libcom32.c32
├── libutil.c32
├── menu.c32
├── pxelinux.0
└── pxelinux.cfg
└── default
```

### 6.4.7 准备启动菜单文件

```bash
[18:54:32 root@centos8 ~]#cat /var/lib/tftpboot/pxelinux.cfg/default
default menu.c32
timeout 600
menu title PXE INSTALL MENU
label linux8
menu label Auto Install Centos Linux ^8
kernel centos8/vmlinuz
append initrd=centos8/initrd.img ks=http://192.168.10.81/ks/ks-centos8.cfg

label linux7
menu label Auto Install Centos Linux ^7
kernel centos7/vmlinuz
append initrd=centos7/initrd.img ks=http://192.168.10.81/ks/ks-centos7.cfg

label linux6
menu label Auto Install Centos Linux ^6
kernel centos6/vmlinuz
append initrd=centos6/initrd.img ks=http://192.168.10.81/ks/ks-centos6.cfg

label manual
menu label  ^Manual Install CentOS Linux 8
kernel centos8/vmlinuz
append initrd=centos8/initrd.img inst.repo=http://192.168.10.81/centos/8/x86_64/

label rescue
menu label ^Rescue a CentOS Linux system 8
kernel centos8/vmlinuz
append initrd=centos8/initrd.img inst.repo=http://192.168.10.81/centos/8/x86_64/ rescue

label local
menu default
menu label ^Boot from local drive
localboot 0xffff
```

### 6.4.8 测试客户端基于PXE实现自动安装

新准备一台主机，设置网卡引导，可看到看启动菜单，并实现自动安装，选择最后

注意：VMware workstation 对于不同的CentOS 版本，生成的虚拟机的硬件并不兼容

![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-3be700ac.png)

# 七、利用cobbler实现自动化安装

## 7.1 Cobbler简介

* Cobbler是一款Linux生态的自动化运维工具，基于Python2开发，用于自动化批量部署安装操作系统；其提供基于CLI的管理方式和WEB配置界面，其中WEB配置界面是基于Python2和Django框架开发。另外，cobbler还提供了API，方便二次开发。Cobbler属于C/S模型(客户端/服务器模型)
* Cobbler主要用于快速网络安装linux操作系统，支持众多的Linux发行版如：Red Hat、Fedora、CentOS、Debian、Ubuntu和SuSE等，甚至支持windows的安装
* Cobbler实质是PXE的二次封装，将多种安装参数封装到一起，并提供统一的管理方法
* 官方文档:[https://cobbler.readthedocs.io/en/latest/index.html](https://cobbler.readthedocs.io/en/latest/index.html)

## 7.2 Cobbler的相关服务

* 使用Cobbler安装系统需要一台专门提供各种服务的服务器，提供的服务包括(HTTP/FTP/NFS,TFTP,DHCP),也可以将这几个服务分别部署到不同服务器。事实上在实际应用中，总是将不同的服务分别部署到专门的服务器。
* Cobbler是在HTTP、TFTP、DHCP等各种服务的基础上进行相关操作的，实际安装的大体过程类似于基于PXE的网络安装:客户端(裸机)开机使用网卡引导启动，其请求DHCP分配一个地址后从TFTP服务器获取启动文件,加载到客户端本地内存中运行，并显示出可安装的系统列表；在人为的选定安装的操作系统类型后,客服端会到HTTP服务器下载相应的系统安装文件并执行自动安装

## 7.3 Cobbler的工作原理

![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-13f4daa4.png)

* client裸机配置了从网络启动后，开机后会广播包请求DHCP服务器（cobbler server）发送其分配好的一个IP
* DHCP服务器（cobbler server）收到请求后发送responese，包括其ip地址
* client裸机拿到ip后再向cobbler server发送请求OS引导文件的请求
* cobbler server告诉裸机OS引导文件的名字和TFTP server的ip和port
* client裸机通过上面告知的TFTP server地址通信，下载引导文件client裸机执行执行该引导文件，确定加载信息，选择要安装的os，期间会再向cobbler server请求kickstart文件和os image
* cobbler server发送请求的kickstart和os iamge
* client裸机加载kickstart文件
* client裸机接收os image，安装该os image

## 7.4 安装Cobbler及其相关的服务和组件

Cobbler所依赖的服务包括HTTPD,TFTP,DHCP等，如果有web界面要求，还需要安装相关的组件
CentOS 8目前还没有提供Cobbler相关包

```bash
[18:57:52 root@centos7 ~]#yum install -y dhcp cobbler cobbler-web pykickstart
[19:00:53 root@centos7 ~]#systemctl enable --now cobblerd.service httpd.service tftp.socket dhcpd.service
```

**相关包说明：**

* httpd：提供yum源，并配合cobbler-web使得cobbler可以通过web网页界面进行配置管理
* tftp-server：提供启动和菜单等相关文件网络下载功能
* cobbler-web : 提供基于web的cobbler管理界面
* pykickstart.noarch : 基于python的管理kickstart文件的库

**说明：**

* Cobbler依赖于epel源，在安装cobbler之前需要配置epel源
* 在安装cobbler时会自因为依赖而安装httpd,tftp-server相关包

## 7.5 Cobbler配置文件及各目录情况

### 7.5.1 配置文件

```bash
/etc/cobbler/settings         #cobbler 主配置文件
/etc/cobbler/iso/             #iso模板配置文件
/etc/cobbler/pxe              #pxe模板文件
/etc/cobbler/power            #电源配置文件
/etc/cobbler/user.conf        #web服务授权配置文件
/etc/cobbler/users.digest     #web访问的用户名密码配置文件
/etc/cobbler/dhcp.template    #dhcp服务器的的配置模板
/etc/cobbler/dnsmasq.template #dns服务器的配置模板
/etc/cobbler/tftpd.template   #tftp服务的配置模板
/etc/cobbler/modules.conf    #cobbler模块的配置文件
```

### 7.5.2 数据目录

```bash
/var/lib/cobbler/config/      #用于存放distros，system，profiles 等信息的配置文件
/var/lib/cobbler/triggers/    #用于存放用户定义的cobbler命令
/var/lib/cobbler/kickstarts/  # 默认存放kickstart文件
/var/lib/cobbler/loaders/     #存放各种引导程序
```

### 7.5.3 镜像目录

```bash
/var/www/cobbler/ks_mirror/     #导入的发行版系统的所有数据
/var/www/cobbler/images/        #导入发行版kernel和initrd镜像用于远程网络启动
/var/www/cobbler/repo_mirror/   #yum 仓库存储目录
```

### 7.5.4 日志目录

```bash
/var/log/cobbler/installing   #客户端安装日志
/var/log/cobbler/cobbler.log  #cobbler日志
```

## 7.6  配置及启动cobblerd服务

检测cobbler的运行环境,并根据提示逐步配置cobbler

```bash
[19:03:38 root@centos7 ~]#cobbler check
The following are potential configuration items that you may want to fix:

1 : The 'server' field in /etc/cobbler/settings must be set to something other than localhost, or kickstarting features will not work.  This should be a resolvable hostname or IP for the boot server as reachable by all machines that will use it.
2 : For PXE to be functional, the 'next_server' field in /etc/cobbler/settings must be set to something other than 127.0.0.1, and should match the IP of the boot server on the PXE network.
3 : change 'disable' to 'no' in /etc/xinetd.d/tftp
4 : Some network boot-loaders are missing from /var/lib/cobbler/loaders, you may run 'cobbler get-loaders' to download them, or, if you only want to handle x86/x86_64 netbooting, you may ensure that you have installed a *recent* version of the syslinux package installed and can ignore this message entirely.  Files in this directory, should you want to support all architectures, should include pxelinux.0, menu.c32, elilo.efi, and yaboot. The 'cobbler get-loaders' command is the easiest way to resolve these requirements.
5 : enable and start rsyncd.service with systemctl
6 : debmirror package is not installed, it will be required to manage debian deployments and repositories
7 : The default password used by the sample templates for newly installed machines (default_password_crypted in /etc/cobbler/settings) is still set to 'cobbler' and should be changed, try: "openssl passwd -1 -salt 'random-phrase-here' 'your-password-here'" to generate new one
8 : fencing tools were not found, and are required to use the (optional) power management features. install cman or fence-agents to use them

Restart cobblerd and then run 'cobbler sync' to apply changes.

1.更改/etc/xinetd.d/tftp配置文件
vim /etc/xinetd.d/tftp
disable  =  yes  --> disable  = no
systemctl restart xinetd
2.联网下载boot引导程序文件
cobbler get-loaders
3.没有网络情况下拷贝启动文件到TFTP服务文件夹
cp -a /usr/share/syslinux/{pxelinux.0,menu.c32} /var/lib/tftpboot
4.更改/etc/cobbler/settings配置文件的server项为提供cobblerd服务的主机地址,也就是本机地址
sed -nri 's#server:127.0.0.1#server:192.168.100.100#' /etc/cobbler/settings
更改后的整行内容:server:192.168.100.100
5.更改/etc/cobbler/settings配置文件的next_server项，指明tftp服务器地址，使得客户端能够找
到TFTP服务器
sed -i 's/next_server: 127.0.0.1/next_server: 192.168.100.100/' /etc/cobbler/settings
更改后的整行内容:next_server:192.168.100.100
6.配置相应的选项来使用cobbler管理dhcp服务和tftp服务
manage_dhcp：1
manage_tftpd：1
7.pxe_just_once选项，该选项置1表示在pxe安装块结束时在cobbler系统中做相应的记录，这样会避免
如果客户机的BIOS选项中PXE启动处于第一位导致的循环重启；如果第一个启动硬件不是PXE启动那就置0。
pxe_just_once：1
配置完成后重启
systemctl restart cobblerd
```

## 7.7 cobbler命令用法

```bash
[19:06:03 root@centos7 ~]#cobbler
usage
=====

cobbler  ...
[add|edit|copy|getks*|list|remove|rename|report] [options|--help]
cobbler  [options|--help]
```

**可以使用下面的方式得到使用帮助**

```bash
[19:07:39 root@centos7 ~]#cobbler distro --help
[19:07:39 root@centos7 ~]#cobbler distro add --help
```

**常见用法：**

```bash
#列出当前导入的linux发行版条目
[19:09:10 root@centos7 ~]#cobbler distro list
#报告当前所有的linux发行版详细信息
[19:09:18 root@centos7 ~]#cobbler distro report
#导入系统源文件生成仓库
[19:11:10 root@centos7 ~]#cobbler import --name=centos-8.0-x86_64 --path=/mnt --arch=x86_64
#将linux发行版系统镜像与其对应的ks文件建立关联
[19:11:26 root@centos7 ~]#cobbler profile --name=centos7 --distro=centos7-x86_64 --kickstart=/var/lib/cobbler/kickstarts/ks7.cfg
```

## 7.8 将linux发行版导入到cobbler在httpd服务的文件夹下

```bash
[19:12:44 root@centos7 ~]#cobbler import --name=centos6 --path=/var/www/html/centos6/isos/x86_64 --arch=x86_64
[19:12:44 root@centos7 ~]#cobbler import --name=centos7 --path=/var/www/html/centos7/isos/x86_64 --arch=x86_64
[19:12:44 root@centos7 ~]#cobbler import --name=centos8 --path=/var/www/html/centos8/isos/x86_64 --arch=x86_64
```

**导入后重启并同步**

```bash
[19:14:26 root@centos7 ~]#systemctl restart cobblerd
[19:15:23 root@centos7 ~]#cobbler sync
```

**范例：**

```bash
[19:16:05 root@centos7 ~]#du -sh /var/www/cobbler/ks_mirror/*
0	/var/www/cobbler/ks_mirror/centos6-x86_64
0	/var/www/cobbler/ks_mirror/centos-8.0-x86_64
0	/var/www/cobbler/ks_mirror/config
```

## 7.9 配置linux发行版和关联相应的ks文件

**拷贝事先准备好的ks文件至/var/lib/cobbler/kickstarts目录下**

```bash
[root@centos7 ~]#cp /var/www/html/ks/centos{6,7,8}.ks /var/lib/cobbler/kickstarts
```

**将linux发行版系统镜像与其对应的ks文件建立关联**

```bash
cobbler profile --name=centos6 --distro=centos6-x86_64 --kickstart=/var/lib/cobbler/kickstarts/centos6.cfg
cobbler profile --name=centos7 --distro=centos7-x86_64 --kickstart=/var/lib/cobbler/kickstarts/centos7.cfg
cobbler profile --name=centos8 --distro=centos8-x86_64 --kickstart=/var/lib/cobbler/kickstarts/centos8.cfg
```

**注意，在导入distro时，cobbler会自动生成distro条目，这些并未和ks文件关联，可以使用**

```bash
cobbler profile remove --name=PROFILE_NAME
```

**删除后，再关联ks文件。**

**建立关联后重启并同步**

```bash
[19:14:26 root@centos7 ~]#systemctl restart cobblerd
[19:15:23 root@centos7 ~]#cobbler sync
```

**查看详细信息**

```bash
cobbler report
```

## 7.10 启动菜单优化

修改/etc/cobbler/pxe/pxedefault.template模板文件，重启同步

```bash
[root@centos7 ~]#vim /etc/cobbler/pxe/pxedefault.template
DEFAULT menu
PROMPT 0
MENU TITLE Welcome! | www.wangxiaochun.com      # 自定义项
TIMEOUT 200
TOTALTIMEOUT 6000
ONTIMEOUT $pxe_timeout_profile
LABEL local
MENU LABEL (local installation) # 自定义项1
MENU DEFAULT
LOCALBOOT -1
$pxe_menu_items
MENU end
[root@centos7 ~]#systemctl restart cobblerd
[root@centos7 ~]#cobbler sync
```

**重启同步后cobbler更新文件/var/lib/tftpboot/pxelinux.cfg/default**

```bash
vim /var/lib/tftpboot/pxelinux.cfg/default
```

## 7.11 基于web界面来管理配置cobbler

### 7.11.1 安装cobbler-web

```bash
yum install cobbler-web
systemctl restart httpd
```

### 7.11.2 访问web界面

用浏览器访问：[https://cobblerserver/cobbler_web](https://cobblerserver/cobbler_web)

cobbler-web界面的默认账号，用户名：cobbler 密码:cobbler

cobbler访问图示

## 7.12 实战案例：CentOS 7 基于cobbler实现系统的自动化安装

### 7.12.1 环境准备

两台主机

一台主机：CentOS 7 充当 Cobbler，http，dhcp，tftp 服务器，并关闭防火墙和SELinux

一台主机：充当测试机，用于实现自动化安装Linux系统

网络要求：关闭Vmware软件中的NAT模式中的DHCP服务，两个主机网卡基于NAT模式

### 7.12.2 安装相关包并启动服务

```bash
[19:29:34 root@centos7 ~]#yum install cobbler cobbler dhcp -y
[19:29:44 root@centos7 ~]#systemctl enable --now cobblerd httpd tftp dhcpd
```

### 7.12.3 修改cobbler相关的配置

```bash
[19:30:18 root@centos7 ~]#cobbler check
The following are potential configuration items that you may want to fix:

1 : The 'server' field in /etc/cobbler/settings must be set to something other than localhost, or kickstarting features will not work.  This should be a resolvable hostname or IP for the boot server as reachable by all machines that will use it.
2 : For PXE to be functional, the 'next_server' field in /etc/cobbler/settings must be set to something other than 127.0.0.1, and should match the IP of the boot server on the PXE network.
3 : Some network boot-loaders are missing from /var/lib/cobbler/loaders, you may run 'cobbler get-loaders' to download them, or, if you only want to handle x86/x86_64 netbooting, you may ensure that you have installed a *recent* version of the syslinux package installed and can ignore this message entirely.  Files in this directory, should you want to support all architectures, should include pxelinux.0, menu.c32, elilo.efi, and yaboot. The 'cobbler get-loaders' command is the easiest way to resolve these requirements.
4 : enable and start rsyncd.service with systemctl
5 : debmirror package is not installed, it will be required to manage debian deployments and repositories
6 : The default password used by the sample templates for newly installed machines (default_password_crypted in /etc/cobbler/settings) is still set to 'cobbler' and should be changed, try: "openssl passwd -1 -salt 'random-phrase-here' 'your-password-here'" to generate new one
7 : fencing tools were not found, and are required to use the (optional) power management features. install cman or fence-agents to use them

Restart cobblerd and then run 'cobbler sync' to apply changes.

#生成新密码，默认安装好的系统root密码为cobbler
[19:30:44 root@centos7 ~]#openssl passwd -1 '123456'
$1$4.EYMEZn$Qk6A2SYOJ260HO6kvg7ND0
#根据以上提示，只需要做1，2，8这三项即可，修改下面四行
[19:31:12 root@centos7 ~]#vim /etc/cobbler/settings
default_password_crypted: "$1$4.EYMEZn$Qk6A2SYOJ260HO6kvg7ND0"
next_server: 192.168.10.71   #tftp服务器的IP
server: 192.168.10.71        #cobbler服务器IP
manage_dhcp: 1               #设置为1，表示通过cobbler生成dhcpd.conf配置文件
pxe_just_once: 1             #设置为1,防止重复安装系统
[19:34:59 root@centos7 ~]#systemctl restart cobblerd.service
```

### 7.12.4 实现dhcp服务

```bash
#修改dhcp的模版文件下面的行，用来生成dhcp的配置文件
subnet 192.168.10.0 netmask 255.255.255.0 {
option routers             192.168.10.2;
option domain-name-servers 114.114.114.114;
option subnet-mask         255.255.255.0;
range dynamic-bootp        192.168.10.200 192.168.10.254;
[19:38:01 root@centos7 ~]#cobbler sync
[19:38:26 root@centos7 ~]#systemctl start dhcpd
```

### 7.12.5 下载启动的相关文件

```bash
[19:38:32 root@centos7 ~]#cobbler get-loaders
[19:40:13 root@centos7 ~]#ls /var/lib/cobbler/loaders/
COPYING.elilo     COPYING.yaboot  grub-x86_64.efi  menu.c32    README
COPYING.syslinux  elilo-ia64.efi  grub-x86.efi     pxelinux.0  yaboot
[19:40:32 root@centos7 ~]#tree /var/lib/tftpboot/
/var/lib/tftpboot/
├── boot
│   └── grub
│       └── menu.lst
├── etc
├── grub
│   ├── efidefault
│   └── images -> ../images
├── images
├── images2
├── memdisk
├── menu.c32
├── ppc
├── pxelinux.0
├── pxelinux.cfg
│   └── default
└── s390x
└── profile_list

10 directories, 7 files
[19:41:01 root@centos7 ~]#tree /var/lib/tftpboot/
/var/lib/tftpboot/
├── boot
│   └── grub
│       └── menu.lst
├── etc
├── grub
│   ├── efidefault
│   ├── grub-x86_64.efi
│   ├── grub-x86.efi
│   └── images -> ../images
├── images
├── images2
├── memdisk
├── menu.c32
├── ppc
├── pxelinux.0
├── pxelinux.cfg
│   └── default
├── s390x
│   └── profile_list
└── yaboot

10 directories, 10 files
```

### 7.12.6 修改菜单的标题信息（可选）

```bash
[19:42:12 root@centos7 ~]#vim /etc/cobbler/pxe/pxedefault.template
ENU TITLE Cobbler | http://zhangzhuo.ltd/
[19:42:19 root@centos7 ~]#cobbler sync
[19:42:50 root@centos7 ~]#cat /var/lib/tftpboot/pxelinux.cfg/default
DEFAULT menu
PROMPT 0
MENU TITLE Cobbler | http://zhangzhuo.ltd/
TIMEOUT 200
TOTALTIMEOUT 6000
ONTIMEOUT local

LABEL local
MENU LABEL (local)
MENU DEFAULT
LOCALBOOT -1

MENU end
```

### 7.12.7 导入CentOS系统的安装文件，生成相应的YUM源

```bash
[19:48:45 root@centos7 ~]#cobbler import --name=centos-8.2-x86_64 --path=/mnt/centos8 --arch=x86_64
[19:53:52 root@centos7 ~]#cobbler import --name=centos-7-x86_64 --path=/mnt/centos7 --arch=x86_64
[20:01:29 root@centos7 ~]#cobbler import --name=centos-6-x86_64 --path=/mnt/centos6 --arch=x86_64
[20:03:46 root@centos7 ~]#du -sh /var/www/cobbler/ks_mirror/*
3.8G	/var/www/cobbler/ks_mirror/centos-6-x86_64
9.6G	/var/www/cobbler/ks_mirror/centos-7-x86_64
7.8G	/var/www/cobbler/ks_mirror/centos-8.2-x86_64
[20:04:04 root@centos7 ~]#cobbler distro list
centos-6-x86_64
centos-7-x86_64
centos-8.2-x86_64
[20:05:30 root@centos7 ~]#cobbler profile list
centos-6-x86_64
centos-7-x86_64
centos-8.2-x86_64
#默认生成的是最小化安装
```

### 7.12.8 准备 kickstart文件,并关联至指定的YUM源

```bash
[20:12:53 root@centos7 ~]#vim ks-centos8.cfg
url --url=$tree    #注意此行必须指定
[20:15:30 root@centos7 ~]#cp ks-centos* /var/lib/cobbler/kickstarts/
#将kickstart文件，关联指定的YUM源和生成菜单列表，先删除在新建
[20:14:00 root@centos7 ~]#cobbler profile remove --name=centos-8.2-x86_64
[20:14:40 root@centos7 ~]#cobbler profile add --name=centos-8.2-x86_64  --distro=centos-8.2-x86_64 --kickstart=/var/lib/cobbler/kickstarts/ks-centos8.cfg
[20:16:55 root@centos7 ~]#cobbler profile remove --name=centos-7-x86_64
[20:17:21 root@centos7 ~]#cobbler profile add --name=centos-7-x86_64  --distro=centos-7-x86_64 --kickstart=/var/lib/cobbler/kickstarts/ks-centos7.cfg
[20:17:23 root@centos7 ~]#cobbler profile remove --name=centos-6-x86_64
[20:17:59 root@centos7 ~]#cobbler profile add --name=centos-6-x86_64  --distro=centos-6-x86_64 --kickstart=/var/lib/cobbler/kickstarts/ks-centos6.cfg
```

### 7.12.9 测试客户端基于Cobbler实现自动安装

### 7.12.10 支持UEFI安装

修改文件设置时间，默认不显示菜单，最好使用默认应答脚本

```bash
#修改模版文件
[root@cobbler-centos7 ~]#vim /etc/cobbler/pxe/efidefault.template
[root@cobbler-centos7 ~]#cat /var/lib/tftpboot/grub/efidefault
default=0
timeout=60
$grub_menu_items
#使模版生效
[root@cobbler-centos7 ~]#cobbler sync
#验证生效
[root@cobbler-centos7 ~]#head -n 2 /var/lib/tftpboot/grub/efidefault
default=0
timeout=0

#应答文件中必须该的
%pre
parted -s /dev/sda mklabel gpt     安装前脚本格式化硬盘为gpt格式
%end

#boot分区格式必须是这样
part /boot/efi --fstype="efi" --ondisk=sda --size=1024 --fsoptions="defaults,uid=0,gid=0,umask=0077,shortname=winnt"
```

**7.12.11 实现cobbler 的web管理**

```bash
[root@centos7 ~]#yum -y install cobbler-web
[root@centos7 ~]#systemctl restart httpd
```

通过浏览器访问下面地址： [https://cobblerserver/cobbler_web](https://cobblerserver/cobbler_web)

![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-30d9a871.png)

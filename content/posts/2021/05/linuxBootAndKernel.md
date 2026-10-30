---
title: "11-Linux启动和内核管理"
date: 2021-05-17T11:47:15+08:00
lastmod: 2021-05-17T12:01:12+08:00
draft: false
description: "讲解 Linux 组成与内核设计，梳理 CentOS 6/7 的启动流程和内核管理方式。"
cover: "https://b3logfile.com/bing/20190417.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["Linux系统基础知识"]
tags: ["linux"]
toc: true
---
# 一、CentOS 6 的启动管理

## **1.1**  **Linux 组成**

- kernel 实现进程管理、内存管理、网络管理、驱动程序、文件系统、安全功能等功能
- rootfs 包括程序和 glibc 库
- - 程序：二进制执行文件
  - 库：函数集合, function, 调用接口（头文件负责描述）

## **1.2 内核设计流派**

- 宏内核(monolithic kernel)：又称单内核和强内核，Unix，Linux
- - 把所有系统服务都放到内核里，所有功能集成于同一个程序，分层实现不同功能，系统庞大复杂，Linux其实在单内核内核实现了模块化，也就相当于吸收了微内核的优点
- 微内核(micro kernel)：Windows，Solaris，HarmonyOS
- - 简化内核功能，在内核之外的用户态尽可能多地实现系统服务，同时加入相互之间的安全保护，每种功能使用一个单独子系统实现，将内核功能移到用户空间，性能差

## **1.3 CentOS 6启动流程**

### **1.3.1 CentOS6启动流程**

![111](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/111.png)

1. 加载BIOS的硬件信息，获取第一个启动设备
2. 读取第一个启动设备MBR的引导加载程序(grub)的启动信息
3. 加载核心操作系统的核心信息，核心开始解压缩，并尝试驱动所有的硬件设备
4. 核心执行init程序，并获取默认的运行信息
5. init程序执行/etc/rc.d/rc.sysinit文件，重新挂载根文件系统
6. 启动核心的外挂模块
7. init执行运行的各个批处理文件(scripts)
8. init执行/etc/rc.d/rc.local
9. 执行/bin/login程序，等待用户登录
10. 登录之后开始以Shell控制主机

### **1.3.2 硬件启动POST**

- POST：Power-On-Self-Test，加电自检，是BIOS功能的一个主要部分。负责完成对CPU、主板、内存、硬盘子系统、显示子系统、串并行接口、键盘等硬件情况的检测
- 主板的ROM：BIOS，Basic Input and Output System，保存着有关计算机系统最重要的基本输入输出程序，系统信息设置、开机加电自检程序和系统启动自举程序等
- 主板的RAM：CMOS互补金属氧化物半导体，保存各项参数的设定，按次序查找引导设备，第一个有引导程序的设备为本次启动设备

### **1.3.3 启动加载器bootloader**

#### **1.3.3.1 grub功能和组成**

**bootloader: 引导加载器，引导程序**

- windows: ntloader，仅是启动OS
- Linux：功能丰富，提供菜单，允许用户选择要启动系统或不同的内核版本；把用户选定的内核装载到内存中的特定空间中，解压、展开，并把系统控制权移交给内核

**Linux的bootloader**

- LILO：LInux LOader，早期的bootloader，功能单一
- GRUB: GRand Unified Bootloader, CentOS 5,6 GRUB 0.97: GRUB Legacy， CentOS 7 以后使用GRUB 2.02

**GRUB 启动阶段**

- primary boot loader :
- - 1st stage：MBR的前446个字节
  - 1.5 stage： mbr 之后的扇区，让stage1中的bootloader能识别stage2所在的分区上的文件系统
- secondary boot loader ：2nd stage，分区文件/boot/grub/

#### **1.3.2.2 Centos6 grub安装**

**安装 grub的两种方法：**

- **grub-install 安装grub stage1和stage1_5到/dev/DISK磁盘上，并复制GRUB相关文件到 DIR/boot目录下**

```bash
grub-install --root-directory=DIR /dev/DISK
```

- **grub命令**

```bash
#grub
grub> root (hd#,#) 
grub> setup (hd#)
```

**范例: 利用grub命令修复grub**

```bash
[03:07:43 root@centos6 ~]#dd if=/dev/zero of=/dev/sda bs=1 count=446
446+0 records in
446+0 records out
446 bytes (446 B) copied, 0.00223774 s, 199 kB/s
[03:08:22 root@centos6 ~]#grub
Probing devices to guess BIOS drives. This may take a long time.


    GNU GRUB  version 0.97  (640K lower / 3072K upper memory)

 [ Minimal BASH-like line editing is supported.  For the first word, TAB
   lists possible command completions.  Anywhere else TAB lists the possible
   completions of a device/filename.]
grub> root (hd0,0)  
root (hd0,0)
 Filesystem type is ext2fs, partition type 0x83
grub> setup (hd0)
setup (hd0)
 Checking if "/boot/grub/stage1" exists... no
 Checking if "/grub/stage1" exists... yes
 Checking if "/grub/stage2" exists... yes
 Checking if "/grub/e2fs_stage1_5" exists... yes
 Running "embed /grub/e2fs_stage1_5 (hd0)"...  27 sectors are embedded.
succeeded
 Running "install /grub/stage1 (hd0) (hd0)1+27 p (hd0,0)/grub/stage2 /grub/grub.conf"... succeeded
Done.
grub> quit     
quit
```

**范例：grub的第1阶段故障无法启动,进行修复**

```bash
[03:11:03 root@centos6 ~]#hexdump -C -n 512 /dev/sda -v
00000000  eb 48 90 00 00 00 00 00  00 00 00 00 00 00 00 00  |.H..............|
00000010  00 00 00 00 00 00 00 00  00 00 00 00 00 00 00 00  |................|
00000020  00 00 00 00 00 00 00 00  00 00 00 00 00 00 00 00  |................|
#破坏grub第1阶段
[03:11:08 root@centos6 ~]#dd if=/dev/zero of=/dev/sda bs=1 count=446
446+0 records in
446+0 records out
446 bytes (446 B) copied, 0.00190972 s, 234 kB/s
[03:12:00 root@centos6 ~]#hexdump -C -n 512 /dev/sda -v
00000000  00 00 00 00 00 00 00 00  00 00 00 00 00 00 00 00  |................|
00000010  00 00 00 00 00 00 00 00  00 00 00 00 00 00 00 00  |................|
00000020  00 00 00 00 00 00 00 00  00 00 00 00 00 00 00 00  |................|
[03:12:30 root@centos6 ~]#reboot
#无法启动，出现下面提示
```

![aa](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/aa.png)

```bash
#光盘启动，进入rescue模式
chroot /mnt/sysimage
grub-install /dev/sda
sync
exit
exit
```

**范例：修复grub的第1.5阶段故障**

```bash
[03:21:56 root@centos6 ~]#dd if=/dev/zero of=/dev/sda bs=512 count=24 seek=1
24+0 records in
24+0 records out
12288 bytes (12 kB) copied, 0.00113502 s, 10.8 MB/s
[03:23:08 root@centos6 ~]#reboot 
#无法启动，显示下面界面
```

![image-20210517094508977](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210517094508977.png)

```bash
光盘启动，进入rescue模式
chroot /mnt/sysimage
grub-install /dev/sda
sync
#按ctrl+alt+delete三个键重启动
```

#### **1.3.2.3** **grub legacy** **管理**

配置文件：/boot/grub/grub.conf <-- /etc/grub.conf

stage2及内核等通常放置于一个基本磁盘分区

**grub legacy 功用：**

- 提供启动菜单、并提供交互式接口
- - a： 内 核 参 数
  - e：编辑模式，用于编辑菜单
  - c：命令模式，交互式接口
- 加载用户选择的内核或操作系统
- - 允许传递参数给内核
  - 可隐藏启动菜单
- 为菜单提供了保护机制
- - 为编辑启动菜单进行认证
  - 为启用内核或操作系统进行认证

**grub的命令行接口**

```bash
help: 获取帮助列表
help KEYWORD: 详细帮助信息
find (hd#,#)/PATH/TO/SOMEFILE： 
root (hd#,#)
kernel /PATH/TO/KERNEL_FILE: 设定本次启动的内核文件；额外还可添加许多内核支持使用的
cmdline参数
    例如：max_loop=100 selinux=0 init=/path/to/init 
initrd /PATH/TO/INITRAMFS_FILE: 设定为选定的内核提供额外文件的ramdisk 
boot: 引导启动选定的内核
```

**cat /proc/cmdline 内核参数**

**内核参数文档：**

```bash
/usr/share/doc/kernel-doc-2.6.32/Documentation/kernel-parameters.txt
```

**grub legacy识别硬盘设备**

```bash
(hd#,#)
hd#: 磁盘编号，用数字表示；从0开始编号
#: 分区编号，用数字表示; 从0开始编号
 
示例：
(hd0,0) 第一块硬盘，第一个分区
```

**手动在grub命令行接口启动系统**

```bash
grub> root (hd#,#)
grub> kernel /vmlinuz-VERSION-RELEASE ro root=/dev/DEVICE 
grub> initrd /initramfs-VERSION-RELEASE.img
grub> boot
```

**grub legacy配置文件：/boot/grub/grub.conf**

```bash
default=#:  #设定默认启动的菜单项；落单项(title)编号从0开始
timeout=#：      #指定菜单项等待选项选择的时长
splashimage=(hd#,#)/PATH/XPM_FILE：#菜单背景图片文件路径
password [--md5| --encrypt] STRING: #启动菜单编辑认证
hiddenmenu：#隐藏菜单
title TITLE：#定义菜单项“标题”, 可出现多次
root (hd#,#)：#查找stage2及kernel文件所在设备分区；为grub的根
kernel /PATH/TO/VMLINUZ_FILE [PARAMETERS]：#启动的内核
initrd /PATH/TO/INITRAMFS_FILE: #内核匹配的ramfs文件
password [--md5|--encrypted ] STRING: #启动选定的内核或操作系统时进行认证
```

**grub加密生成grub口令**

```bash
grub-md5-crypt 
grub-crypt
```

**破解root口令：**

```bash
(1)  编辑grub菜单(选定要编辑的title，而后使用a 或 e 命令)
(2)  在选定的kernel后附加1, s, S，single 都可以进入单用户模式
(3)  在kernel所在行，键入“b”命令
```

**范例: 给grub 添加密码,防止破解root密码**

```bash
[03:28:32 root@centos6 ~]#grub-crypt 
Password: 
Retype password: 
$6$pt2OB8FwqiR0hA.i$MPnKksheISj2WWY..FowBVSpNgSwRv.RH/jVgtaN0jCadTMR6lm9bMDJZjJWlCBL6crqCUOHRoGcBbmqkhSb90
[03:36:44 root@centos6 ~]#cat /boot/grub/grub.conf
default=0
timeout=5
password --encrypt
$6$pt2OB8FwqiR0hA.i$MPnKksheISj2WWY..FowBVSpNgSwRv.RH/jVgtaN0jCadTMR6lm9bMDJZjJWlCBL6crqCUOHRoGcBbmqkhSb90
```

**范例：生成grub启动背景图片**

```bash
[root@centos6 ~]#convert -resize 640x480 -colors 14 winner.png splash.xpm 
[root@centos6 ~]#more splash.xpm
#生成splash.xpm.gz
[root@centos6 ~]#gzip   splash.xpm 
[root@centos6 ~]#mv splash.xpm.gz /boot/grub
```

### **1.3.4 加载kernel**

**kernel 自身初始化过程**

1. 探测可识别到的所有硬件设备
2. 加载硬件驱动程序（借助于ramdisk加载驱动）
3. 以只读方式挂载根文件系统
4. 运行用户空间的第一个应用程序：/sbin/init

**Linux内核特点：**

- 支持模块化：.ko（内核对象），如：文件系统，硬件驱动，网络协议等
- 支持内核模块的动态装载和卸载

**内核组成部分：**

- 核心文件 ：/boot/vmlinuz-VERSION-release
- - ramdisk：辅助的伪根系统，加载相应的硬件驱动，ramdisk --> ramfs 提高速度
  - CentOS 5 /boot/initrd-VERSION-release.img
  - CentOS 6 以后版本 /boot/initramfs-VERSION-release.img
- 模块文件：/lib/modules/VERSION-release

**范例：误删除内核文件/boot/vmlinuz-2.6.32-754.el6.x86_64无法启动，故障恢复**

```bash
[root@centos6 ~]#rm -f /boot/vmlinuz-2.6.32-754.el6.x86_64 
[root@centos6 ~]#reboot
 
# 进 入 rescue 模 式 
#chroot /mnt/sysimage 
#mount /dev/sr0 /mnt/
#cp /mnt/isolinux/vmlinuz /boot/vmlinuz-2.6.32-754.el6.x86_64 
#sync
#exit 
#reboot
```

**ramdisk文件的制作：**

- mkinitrd命令

```bash
mkinitrd /boot/initramfs-$(uname -r).img $(uname -r)
```

- dracut命令

```bash
dracut /boot/initramfs-$(uname -r).img $(uname -r)
```

**范例：误删除/boot/initramfs-2.6.32-754.el6.x86_64.img无法启动，故障恢复**

```bash
[root@centos6 ~]#rm -f /boot/initramfs-2.6.32-754.el6.x86_64.img 
[root@centos6 ~]#reboot
#进入rescue模式
#chroot /mnt/sysimage
#mkinitrd /boot/initramfs-$(uname -r).img $(uname -r) 
#sync
#exit 
#exit 
#reboot
```

### **1.3.5 init 初始化**

**POST --> BootSequence (BIOS) --> Bootloader(MBR) --> kernel(ramdisk) --> rootfs(只读) --> init（systemd）**

**init程序的类型：**

- SysV: init, CentOS 5之前
- - 配置文件：/etc/inittab
- Upstart: init,CentOS 6
- - 配置文件：/etc/inittab, /etc/init/*.conf
- Systemd：systemd, CentOS 7
- - 配置文件：/usr/lib/systemd/system
  - - /etc/systemd/system

#### **1.3.5.1 运行级别**

**运行级别：为系统运行或维护等目的而设定；0-6：7个级别，一般使用3, 5做为默认级别**

```bash
0：关机
1：单用户模式(root自动登录), single, 维护模式
2：多用户模式，启动网络功能，但不会启动NFS；维护模式
3：多用户模式，正常模式；文本界面
4：预留级别；可同3级别
5：多用户模式，正常模式；图形界面
6：重启
```

**切换级别：**

```bash
init #
```

**查看级别：**

```bash
runlevel 
who -r
```

**定义运行级别**

```bash
/etc/inittab
```

**CentOS 5 的inittab文件还定义以下内容**

```bash
初始运行级别(RUN LEVEL)
系统初始化脚本
对应运行级别的脚本目录
捕获某个关键字顺序
定义UPS电源终端/恢复脚本
在虚拟控制台生成getty 
在运行级别5初始化X
```

**CentOS 5 的inittab文件每一行格式：**

```bash
id:runlevel:action:process
 
id：是惟一标识该项的字符序列
runlevels： 定义了操作所使用的运行级别
action： 指定了要执行的特定操作
    wait:切换至此级别运行一次respawn：
    此process终止，就重新启动之initdefault：
    设定默认运行级别；process省略sysinit：
    设定系统初始化方式
process：定义了要执行的进程
```

**范例：CentOS 5 的inittab文件**

```bash
id:5:initdefault: si::sysinit:/etc/rc.d/rc.sysinit l0:0:wait:/etc/rc.d/rc 0
l1:1:wait:/etc/rc.d/rc 1
l2:2:wait:/etc/rc.d/rc 2
l3:3:wait:/etc/rc.d/rc 3
l4:4:wait:/etc/rc.d/rc 4
l5:5:wait:/etc/rc.d/rc 5
l6:6:wait:/etc/rc.d/rc 6 
ca::ctrlaltdel:/sbin/shutdown -t3 -r now
pf::powerfail:/sbin/shutdown -f -h +2 "Power Failure; System Shutting Down” 
pr:12345:powerokwait:/sbin/shutdown -c "Power Restored; Shutdown Cancelled” 
1:2345:respawn:/sbin/mingetty tty1
2:2345:respawn:/sbin/mingetty tty2 
3:2345:respawn:/sbin/mingetty tty3 
4:2345:respawn:/sbin/mingetty tty4 
5:2345:respawn:/sbin/mingetty tty5 
6:2345:respawn:/sbin/mingetty tty6 
x:5:respawn:/etc/X11/prefdm -nodaemon
```

**CentOS 6 /etc/inittab和相关文件**

**CentOS 6 init程序为 upstart, 其配置文件/etc/inittab, /etc/init/\*.conf，配置文件的语法 遵循 upstart**

**配置文件语法格式，和CentOS5不同**

```bash
/etc/inittab 设置系统默认的运行级别
/etc/init/control-alt-delete.conf
/etc/init/tty.conf
/etc/init/start-ttys.conf
/etc/init/rc.conf
/etc/init/prefdm.conf
```

#### **1.3.5.2 初始化脚本sysinit**

```bash
/etc/rc.d/rc.sysinit
[04:51:40 root@centos6 ~]#cat /etc/init/rcS.conf
```

**系统初始化脚本功能**

```bash
(1)  设置主机名
(2)  设置欢迎信息
(3)  激活udev和selinux
(4)  挂载/etc/fstab文件中定义的文件系统
(5)  检测根文件系统，并以读写方式重新挂载根文件系统
(6)  设置系统时钟
(7)  激活swap设备
(8)  根据/etc/sysctl.conf文件设置内核参数
(9)  激活lvm及software raid设备(10)加载额外设备的驱动程序
(11)清理操作
```

#### **1.3.5.3 服务管理**

```bash
[04:52:03 root@centos6 ~]#cat /etc/init/rc.conf 
# rc - System V runlevel compatibility
#
# This task runs the old sysv-rc runlevel scripts.  It
# is usually started by the telinit compatibility wrapper.
#
# Do not edit this file directly. If you want to change the behaviour,
# please create a file rc.override and put your changes there.

start on runlevel [0123456]

stop on runlevel [!$RUNLEVEL]

task

export RUNLEVEL
console output
exec /etc/rc.d/rc $RUNLEVEL
```

**service命令：手动管理服务**

```bash
for srv in /etc/rc.d/rcN.d/K*; do
    $srv stop 
done
for srv in /etc/rc.d/rcN.d/S*; do
    $srv start 
done
```

**说明：rc N --> 意味着读取/etc/rc.d/rcN.d/**

K:  K##：##运行次序；数字越小，越先运行；数字越小的服务，通常为依赖到别的服务

S:  S##：##运行次序；数字越小，越先运行；数字越小的服务，通常为被依赖到的服务

**配置服务开机启动**

- chkconfig命令
- ntsysv命令

**chkconfig 命令管理服务**

```bash
#查看服务在所有级别的启动或关闭设定情形： chkconfig [--list] [name]
 
#添加服务
SysV的服务脚本放置于/etc/rc.d/init.d (/etc/init.d) 
#!/bin/bash
chkconfig: LLLL nn nn  #LLLL 表示初始在哪个级别下启动，-表示都不启动
description : 描述信息

chkconfig --add name 

#删除服务
chkconfig --del name
 
#修改指定的运行级别
chkconfig [--level levels] name <on|off|reset>
说明：--level LLLL: 指定要设置的级别；省略时表示2345
```

**范例: 自定义服务脚本**

```bash
[05:02:16 root@centos6 ~]#cat /etc/init.d/testsrv 
#!/bin/bash
# chkconfig: - 96 3
# description: This is test service script


. /etc/init.d/functions


start(){
	[ -e /var/lock/subsys/testsrv ] && exit || touch /var/lock/subsys/testsrv 
	echo $PATH
	action "Starting testsrv"
}
stop(){
	[ -e /var/lock/subsys/testsrv ] && rm /var/lock/subsys/testsrv || exit action "Stopping testsrv"
}
status(){
	[ -e /var/lock/subsys/testsrv ] && echo "testsrv is running..." || echo "testsrv is stopped"
}
case $1 in start)
	start
	;;
stop)
	stop
	;;
restart)
	stop start
	;;
status)
	status
	;;
*)
	echo $"Usage: $0 {start|stop|status|restart}" 
	exit 2
esac
[05:02:29 root@centos6 ~]#chkconfig --add testsrv
[05:02:52 root@centos6 ~]#chkconfig --list testsrv
testsrv        	0:off	1:off	2:off	3:off	4:off	5:off	6:off
[05:03:30 root@centos6 ~]#service testsrv start
/sbin:/usr/sbin:/bin:/usr/bin
Starting testsrv                                           [  OK  ]
[05:03:44 root@centos6 ~]#chkconfig --del testsrv
```

#### **1.3.5.4 非独立服务**

服务分为独立服务和非独立服务

瞬态（Transient）服务被超级守护进程 xinetd 进程所管理，也称为非独立服务进入的请求首先被xinetd代理

**配置文件：**

```bash
/etc/xinetd.conf
/etc/xinetd.d/<service>
```

**用chkconfig控制非独立服务开机启动**

**示例：**

```bash
chkconfig tftp on
```

#### **1.3.5.4 开机启动文件rc.local**

```bash
/etc/rc.local
/etc/rc.d/rc.local
```

注意：正常级别下，最后启动一个服务S99local没有链接至/etc/rc.d/init.d一个服务脚本，而是指向   了/etc/rc.d/rc.local脚本

不便或不需写为服务脚本放置于/etc/rc.d/init.d/目录，且又想开机时自动运行的命令，可直接放置于/etc/rc.d/rc.local文件中

/etc/rc.d/rc.local在指定运行级别脚本后运行

**注意: 默认Ubuntu 无 /etc/rc.local 文件,可以创建此脚本文件并添加执行权限,rc.local的首行必须有shebang机制**

### **1.3.6 CentOS 启动过程总结**

```bash
POST
boot loader
vmlinux(initramfs.img)
roofs
/sbin/init
/etc/inittab         设置默认运行级别
/etc/rc.d/rc.sysinit 运行系统初始化脚本完成系统初始化
/etc/rc#.d/Sxxxx     启动需要启动服务关闭对应下需要关闭的服务
/etc/rc.d/rc.local
设置终端登录
```

参看：http://s4.51cto.com/wyfs02/M02/87/20/wKiom1fVBELjXsvaAAUkuL83t2Q304.jpg

![sss](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/sss.png)

## **1.4 启动过程的故障排错**

### **1.4.1 实战案例故障：删除/sbin/init无法启动**

恢复过程

**方法1：从同一个版本的另台主机复制init文件**

```bash
光盘启动进入secure mode ifconfig 
eth0 10.0.0.6/24
scp 10.0.0.16:/sbin/init /mnt/sysimages/sbin/
```

**方法2:**

```bash
1  先进入grub菜单，在kernel参数后加 selinux=0 init=/bin/bash
 
2  mount -o remount,rw /
  
3  mount /dev/sr0 /mnt/
 
4  rpm2cpio /mnt/Packages/upstart.xxx.rpm | cpio -idv ./sbin/init
```

### **1.4.2 实战案例 故障：rm -rf /boot/\* 和 /etc/fstab 进行恢复**

**恢复过程**

1.用光盘进入 rescue mode，找到/ 所在分区并恢复/etc/fstab

```bash
mount /dev/sda /mnt/sysimage    普通的分区直接挂载如果是逻辑卷需要先执行lvchange -ay
vim /mnt/sysimage/etc/fstab
把挂载信息写进去
reboot重启
```

2.rescue mode 恢复内核和initrd 文件

/dev/sda2 --> /mnt/sysimage

```bash
mount /dev/sr0 /mnt/
rpm -ivh /mnt/Packages/kernel-XXXXXX0.rpm --force
```

3.修复 grub

```bash
grub-install /dev/sda
[23:30:21 root@centos6 ~]#cat /boot/grub/grub.conf 
default=0
timeout=3
title centos6.10
kernel /vmlinuz-2.6.32-754.el6.x86_64 root=/dev/VolGroup/lv_root
initrd /initramfs-2.6.32-754.el6.x86_64.img
```

4.reboot重启

## **1.5自制linux系统**

### **1.5.1** **分区并创建文件系统**

```bash
#分两个必要的分区,/dev/sdb1对应/boot   
[03:02:50 root@centos6 ~]#echo -e 'n\np\n1\n\n+1G\nw\n'|fdisk /dev/sdb
[03:03:57 root@centos6 ~]#echo -e 'n\np\n2\n\n\nw\n'|fdisk /dev/sdb
[03:04:20 root@centos6 ~]#mkfs.ext4 /dev/sdb1
[03:04:20 root@centos6 ~]#mkfs.ext4 /dev/sdb2
```

### **1.5.2 挂载boot**

```bash
#子目录必须为boot
[02:54:30 root@centos6 ~]#mkdir /mnt/boot
[02:54:50 root@centos6 ~]#mount /dev/sdb1 /mnt/boot/
```

### **1.5.3 安装grub**

```bash
[03:05:26 root@centos6 ~]#grub-install --root-directory=/mnt/ /dev/sdb
```

### **1.5.4 准备内核和initramfs文件**

```bash
[03:06:06 root@centos6 ~]#cp /boot/vmlinuz-2.6.32-754.el6.x86_64 /mnt/boot/vmlinuz
[03:07:16 root@centos6 ~]#cp /boot/initramfs-2.6.32-754.el6.x86_64.img /mnt/boot/initramfs.img
```

### **1.5.5 建立grub.conf**

```bash
[03:10:57 root@centos6 ~]#cat /mnt/boot/grub/grub.conf 
default=0
timeout=6
title zhang linux
root(0,0)
kernel /vmlinuz root=/dev/sda2 selinux=0 init=/bin/bash
initrd /initramfs.img
```

### **1.5.6 准备根下面相关程序和库**

```bash
[03:11:20 root@centos6 ~]#mkdir /mnt/sysroot
[03:12:04 root@centos6 ~]#mount /dev/sdb2 /mnt/sysroot/
[03:12:13 root@centos6 ~]#mkdir -pv /mnt/sysroot/{boot,dev,sys,proc,etc,bin,sbin,tmp,var,home,root,lib,lib64,opt,mnt,media}
# 复制bash等命令和相关库文件，如 ：
bash,ps,pstree,ifconfig,insmod,ping,mount,ls,cat,df,lsblk,blkid,tree,fdisk
使用脚本：copycmd
#准备网卡驱动
[03:19:10 root@centos6 ~]#ethtool -i eth0
driver: e1000
version: 7.3.21-k8-NAPI
firmware-version: 
bus-info: 0000:02:01.0
supports-statistics: yes
supports-test: yes
supports-eeprom-access: yes
supports-register-dump: yes
supports-priv-flags: no
[03:20:24 root@centos6 ~]#modinfo -n e1000
/lib/modules/2.6.32-754.el6.x86_64/kernel/drivers/net/e1000/e1000.ko
[03:20:35 root@centos6 ~]#cp `modinfo -n e1000` /mnt/sysroot/lib
[03:21:05 root@centos6 ~]#ls /mnt/sysroot/lib
e1000.ko
[03:21:15 root@centos6 ~]#chroot /mnt/sysroot/
```

### **1.5.7 准备新的虚拟机**

挂载这个虚拟磁盘启动虚拟机。

![image-20210517100917941](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210517100917941.png)

# **二、/proc目录和内核参数管理**

**/proc目录：内核把自己内部状态信息及统计信息，以及可配置参数通过proc伪文件系统加以输出**

**帮助：man proc**

**内核参数：**

- 只读：只用于输出信息
- 可写：可接受用户指定“新值”来实现对内核某功能或特性的配置

**/proc/sys 设置**

```bash
sysctl是一个允许改变正在运行中的Linux系统的接口，修改的是针对整个系统的内核参数。
sysctl的修改  是立即且临时的（重启后失效）。也可以通过修改sysctl.conf配置文件，
达到永久生效。
```

- **sysctl 命令用于查看或设定此目录中诸多参数**

```bash
sysctl -w path.to.parameter=VALUE
```

- **默认配置文件：/etc/sysctl.conf 及以下文件**

```bash
/run/sysctl.d/*.conf
/etc/sysctl.d/*.conf
/usr/local/lib/sysctl.d/*.conf
/usr/lib/sysctl.d/*.conf
/lib/sysctl.d/*.conf
/etc/sysctl.conf
```

范例：

```bash
sysctl -w kernel.hostname=mail.magedu.com
```

**echo命令通过重定向方式也可以修改大多数参数的值**

```bash
echo "VALUE" > /proc/sys/path/to/parameter
```

范例：

```bash
[03:40:17 root@centos6 ~]#echo zhang >/proc/sys/kernel/hostname
```

## **2.1 sysctl命令：**

**临时设置某参数**

```bash
sysctl -w parameter=VALUE
```

**通过读取配置文件设置参数**

```bash
sysctl -p [/path/to/conf_file]
```

**查看指定参数当前值**

```bash
sysctl  [/path/to/conf_file]
```

**查看所有生效参数**

```bash
sysctl -a
```

**常用的内核参数：**

```bash
net.ipv4.ip_forward 
net.ipv4.icmp_echo_ignore_all 
net.ipv4.ip_nonlocal_bind     允许应用程序可以监听本地不存在的IP
vm.drop_caches
fs.file-max = 1020000         全局打开文件的最大数
```

**范例：设置禁止ping**

```bash
[03:44:27 root@zhang ~]#cat /proc/sys/net/ipv4/icmp_echo_ignore_all 
0
[03:48:05 root@zhang ~]#vim /etc/sysctl.d/test.conf
[03:48:35 root@zhang ~]#cat /etc/sysctl.d/test.conf
net.ipv4.icmp_echo_ignore_all=1
[03:48:41 root@zhang ~]#sysctl -p /etc/sysctl.d/test.conf 
net.ipv4.icmp_echo_ignore_all = 1
[03:49:02 root@zhang ~]#cat /proc/sys/net/ipv4/icmp_echo_ignore_all 
1
```

**范例: 清除缓存**

```bash
[03:49:51 root@zhang ~]#cp /dev/sda /root/f1.img
^C
[03:50:35 root@zhang ~]#free -h
             total       used       free     shared    buffers     cached
Mem:          979M       910M        69M       244K       398M       408M
-/+ buffers/cache:       103M       876M
Swap:         1.9G         0B       1.9G
[03:50:56 root@zhang ~]#echo 3 > /proc/sys/vm/drop_caches 
[03:51:15 root@zhang ~]#free -h
             total       used       free     shared    buffers     cached
Mem:          979M        85M       893M       244K       744K       6.2M
-/+ buffers/cache:        78M       900M
Swap:         1.9G         0B       1.9G
```

**三、/sys目录**

/sys目录：

使用sysfs文件系统，为用户使用的伪文件系统，输出内核识别出的各硬件设备的相关属性信息，也有内核对硬件特性的设定信息；有些参数是可以修改的，用于调整硬件工作特性

udev通过此路径下输出的信息动态为各设备创建所需要设备文件，udev是运行用户空间程序专用工具：udevadmin, hotplug

udev为设备创建设备文件时，会读取其事先定义好的规则文件，一般在/etc/udev/rules.d

及/usr/lib/udev/rules.d目录下

**范例: 别名实现新添加硬盘的识别**

```bash
[03:51:19 root@zhang ~]#echo '- - -' >/sys/class/scsi_host/host0/scan ;echo '- - -' >/sys/class/scsi_host/host1/scan;echo '- - -' >/sys/class/scsi_host/host2/scan
```

# **四、内核模块管理和编译**

单内核体系设计、但充分借鉴了微内核设计体系的优点，为内核引入模块化机制

**内核组成部分：**

- kernel：内核核心，一般为bzImage，通常在/boot目录
- - 名称为 vmlinuz-VERSION-RELEASE
- kernel object：内核对象，一般放置于
- - /lib/modules/VERSION-RELEASE/
  - /usr/lib/modules/VERSION-RELEASE/
- 辅助文件：ramdisk
- - initrd：从CentOS 5 版本以前
  - initramfs：从CentOS6 版本以后

## **4.1 内核版本**

**运行中的内核：**

**uname命令：print system information**

```bash
uname [OPTION]...
```

**常用选项：**

```bash
-n  显示节点名称
-r  显示VERSION-RELEASE
-a  显示所有信息
```

## **4.2 内核模块命令**

### **4.2.1 lsmod命令：**

- 显示由核心已经装载的内核模块
- 显示的内容来自于: /proc/modules文件

**范例：**

```bash
[03:53:08 root@zhang ~]#lsmod
Module                  Size  Used by
ib_ipoib               81191  0 
rdma_ucm               15739  0 
ib_ucm                 12360  0 
#显示：名称、大小，使用次数，被哪些模块依赖
```

### **4.2.3 modinfo命令：**

功能：管理内核模块

配置文件：/etc/modprobe.conf, /etc/modprobe.d/*.conf

- **显示模块的详细描述信息**

```bash
modinfo [ -k kernel ]  [ modulename|filename... ]
```

**常用选项：**

```bash
-n：只显示模块文件路径
-p：显示模块参数
-a：作者
-d：描述
```

**范例：**

```bash
[03:57:15 root@zhang ~]#lsmod | grep ext4
ext4                  381488  2 
jbd2                   93380  1 ext4
mbcache                 8193  1 ext4
[03:57:22 root@zhang ~]#modinfo ext4
filename:       /lib/modules/2.6.32-754.el6.x86_64/kernel/fs/ext4/ext4.ko
license:        GPL
description:    Fourth Extended Filesystem
author:         Remy Card, Stephen Tweedie, Andrew Morton, Andreas Dilger, Theodore Ts'o and others
retpoline:      Y
srcversion:     3C0D8A8996992A22750E504
depends:        mbcache,jbd2
vermagic:       2.6.32-754.el6.x86_64 SMP mod_unload modversions
```

### **4.2.4 modprobe**

- **装载或卸载内核模块**
- - **modprobe 加模块名称是装载**
  - **modprobe -r 加模块名是卸载**

```bash
modprobe [ -C config-file ]  [ modulename ]  [ module parame-ters... ] 
modprobe [ -r ] modulename…
```

**范例：**

```bash
[03:57:35 root@zhang ~]#lsmod | grep usb
btusb                  16915  0 
bluetooth              98087  1 btusb
[03:59:05 root@zhang ~]#modprobe usb_storage
[03:59:23 root@zhang ~]#lsmod | grep usb
usb_storage            49361  0 
btusb                  16915  0 
bluetooth              98087  1 btusb
[03:59:26 root@zhang ~]#modprobe -r usb_storage
[03:59:48 root@zhang ~]#lsmod | grep usb
btusb                  16915  0 
bluetooth              98087  1 btusb
```

### **4.2.5 depmod**

**depmod命令：内核模块依赖关系文件及系统信息映射文件的生成工工具**

### **4.2.6 insmod安装模块**

**insmod命令：可以安装模块，需要指定模块文件路径，并且不自动解决依赖模块**

```bash
insmod [ filename ]  [ module options... ]
```

**范例：**

```bash
[04:00:32 root@zhang ~]#insmod `modinfo -n exportfs`
[04:02:23 root@zhang ~]#insmod `modinfo -n usb_storage`
```

### **4.2.7 rmmod命令：卸载模块**

**跟modprobe -r功能一样**

```bash
rmmod [ modulename ]
```

**范例：**

```bash
rmmod xfs 
rmmod exportfs
```

## **4.3 编译内核**

**编译安装内核准备：**

1. 准备好开发环境
2. 获取目标主机上硬件设备的相关信息
3. 获取目标主机系统功能的相关信息，例如:需要启用相应的文件系统
4. 获取内核源代码包，[www.kernel.org](http://www.kernel.org)

### **4.3.1 编译准备**

#### **4.3.1.1 目标主机硬件设备相关信息**

**CPU：**

```bash
[root@centos8 ~]# lscpu 
Architecture:        x86_64
```

**PCI设备：lspci -v，-w**

```bash
[root@centos8 ~]# lspci
00:00.0 Host bridge: Intel Corporation 440FX - 82441FX PMC [Natoma] (rev 02)
00:01.0 ISA bridge: Intel Corporation 82371SB PIIX3 ISA [Natoma/Triton II]
00:01.1 IDE interface: Intel Corporation 82371SB PIIX3 IDE [Natoma/Triton II]
00:01.2 USB controller: Intel Corporation 82371SB PIIX3 USB [Natoma/Triton II] (rev 01)
00:01.3 Bridge: Intel Corporation 82371AB/EB/MB PIIX4 ACPI (rev 03)
00:02.0 VGA compatible controller: Cirrus Logic GD 5446
00:03.0 Communication controller: Red Hat, Inc. Virtio console
00:04.0 SCSI storage controller: Red Hat, Inc. Virtio block device
00:05.0 Ethernet controller: Red Hat, Inc. Virtio network device
00:06.0 Unclassified device [00ff]: Red Hat, Inc. Virtio memory balloon
00:1f.0 PCI bridge: Red Hat, Inc. QEMU PCI-PCI bridge
```

**USB设备：lsusb**

```bash
[root@centos8 ~]# lsusb
Bus 001 Device 002: ID 0627:0001 Adomax Technology Co., Ltd 
Bus 001 Device 001: ID 1d6b:0001 Linux Foundation 1.1 root hub
```

**lsblk快设备**

```bash
全部硬件设备信息：
```

#### **4.3.1.2 开发环境相关包**

```bash
[root@centos8 ~]# yum install make ncurses-devel flex bison openssl-devel elfutils-libelf-devel
```

#### **4.3.1.3 内核编译安装实现**

- **下载源码文件**
- **准备文本配置文件/boot/config-`uname -r`**
- **make menuconfig:配置内核选项，相当于./configure**

```bash
[ ]:N
[M]:M
[*]:Y
```

- make [-j #] 或者用以下两步实现：
- - make -j # bzImage
  - make -j # modules
- 安装模块：make modules_install
- 安装内核相关文件：make install
- - 安装bzImage为 /boot/vmlinuz-VERSION-RELEASE
  - 生成initramfs文件编辑
  - grub的配置文件

#### **4.3.1.4 编译安装内核实战案例**

```bash
[root@centos8 ~]# yum -y install gcc make ncurses-devel flex bison openssl-devel elfutils-libelf-devel
[root@centos8 ~]# tar xf linux-5.10.5.tar.xz -C /mnt/
[root@centos8 ~]# cd /mnt/linux-5.10.5/
[root@centos8 linux-5.10.5]# cp /boot/config-`uname -r` ./.config
[root@centos8 linux-5.10.5]# vim .config
# CONFIG_MODULE_SIG is not set 
CONFIG_SYSTEM_TRUSTED_KEYS=""
# CONFIG_DEBUG_INFO_BTF=y     #linux-5.8.5需要注释此行
[root@centos8 linux-5.10.5]# make menuconfig
[root@centos8 linux-5.10.5]# make -j 32 #数值根据自己cpu个数选择
#或者两步实现：make -j 2 bzImage ; make -j 2 modules
[root@centos8 linux-5.10.5]# pwd
/mnt/linux-5.10.5
[root@centos8 linux-5.10.5]# du -sh
16G	.
[root@centos8 linux-5.10.5]# make modules_install
[root@centos8 linux-5.10.5]# ls /lib/modules
4.18.0-187.el8.x86_64  4.18.0-193.28.1.el8_2.x86_64  4.18.0-193.el8.x86_64  5.10.5
[root@centos8 linux-5.10.5]# du -sh /lib/modules/5.10.5/
4.2G	/lib/modules/5.10.5/
[root@centos8 linux-5.10.5]# make install
sh ./arch/x86/boot/install.sh 5.10.5 arch/x86/boot/bzImage \
	System.map "/boot"
[root@centos8 linux-5.10.5]# ls /boot/
config-4.18.0-193.28.1.el8_2.x86_64
config-4.18.0-193.el8.x86_64
efi
grub2
initramfs-0-rescue-20201120143309750601020764519652.img
initramfs-4.18.0-193.28.1.el8_2.x86_64.img
initramfs-4.18.0-193.28.1.el8_2.x86_64kdump.img
initramfs-4.18.0-193.el8.x86_64.img
initramfs-4.18.0-193.el8.x86_64kdump.img
initramfs-5.10.5.img
initramfs-.img
loader
System.map
System.map-4.18.0-193.28.1.el8_2.x86_64
System.map-4.18.0-193.el8.x86_64
System.map-5.10.5
vmlinuz
vmlinuz-0-rescue-20201120143309750601020764519652
vmlinuz-4.18.0-193.28.1.el8_2.x86_64
vmlinuz-4.18.0-193.el8.x86_64
vmlinuz-5.10.5
[root@centos8 linux-5.10.5]# chmod +x /boot/vmlinuz-5.10.5
[root@centos8 linux-5.10.5]# ls /boot/loader/entries/
20201120143309750601020764519652-0-rescue.conf
20201120143309750601020764519652-4.18.0-193.28.1.el8_2.x86_64.conf
20201120143309750601020764519652-4.18.0-193.el8.x86_64.conf
20201120143309750601020764519652-5.10.5.conf
[root@centos8 linux-5.10.5]# cat /boot/loader/entries/20201120143309750601020764519652-5.10.5.conf 
title CentOS Linux (5.10.5) 8 (Core)
version 5.10.5
linux /boot/vmlinuz-5.10.5
initrd /boot/initramfs-5.10.5.img $tuned_initrd
options $kernelopts $tuned_params
id centos-20210109082754-5.10.5
grub_users $grub_users
grub_arg --unrestricted
grub_class kernel
[root@centos8 ~]# uname -r
5.10.5
```

#### **4.3.1.4 内核编译说明**

**配置内核选项：**

- **支持“更新”模式进行配置：make help**

```bash
make config：基于命令行以遍历的方式配置内核中可配置的每个选项
make menuconfig：基于curses的文本窗口界面
make gconfig：基于GTK (GNOME）环境窗口界面
make xconfig：基于QT(KDE)环境的窗口界面
```

- **支持“全新配置”模式进行配置**

```bash
make defconfig：基于内核为目标平台提供的“默认”配置进行配置
make allyesconfig: 所有选项均回答为“yes“
make allnoconfig: 所有选项均回答为“no“
```

**编译内核：**

- **全编译**

```bash
make [-j #]
```

- **编译内核的一部分功能：**

只编译某子目录中的相关代码

```bash
cd /usr/src/linux; make dir/
```

只编译一个特定的模块

```bash
cd /usr/src/linux; make dir/file.ko
```

**范例：只为e1000编译驱动：**

```bash
make drivers/net/ethernet/intel/e1000/e1000.ko
```

**交叉编译内核**

编译的目标平台与当前平台不相同

```bash
make    ARCH=arch_name
```

要获取特定目标平台的使用帮助

```bash
make    ARCH=arch_name help
```

示例：

```bash
make  ARCH=arm help
```

**从新编译需要事先清理操作**

```bash
make clean：清理大多数编译生成的文件，但会保留.config文件等
make mrproper: 清理所有编译生成的文件、config及某些备份文件
make distclean：包含 make mrproper,并清理patches以及编辑器备份文件
```

#### **4.3.1.5 卸载内核**

- 删除/usr/src/linux/目录下不需要的内核源码
- 删除/lib/modules/目录下不需要的内核库文件
- 删除/boot目录下启动的内核和内核映像文件
- 更改grub的配置文件，删除不需要的内核启动列表 grub2-mkconfig -o /boot/grub2/grub.cfg
- CentOS 8 还需要删除 /boot/loader/entries/5b85fc7444b240a992c42ce2a9f65db5-新内核版本.conf

# **五、Busybox**

## **5.1 Busybox介绍**

Busybox 最初是由 Bruce Perens 在 1996 年为 Debian GNU/Linux 安装盘编写的。其目标是在一张软盘(存储空间只有1MB多)上创建一个GNU/Linux 系统，可以用作安装盘和急救盘

Busybox 是一个开源项目，遵循GPL v2协议。Busybox将众多的UNIX命令集合进一个很小的可执行程序中，可以用来替代GNU fileutils、shellutils 等工具集。Busybox中各种命令与相应的GNU工具相比，所能提供的选项比较少，但是也足够一般的应用了。Busybox主要用于嵌入式系统

Busybox 是一个集成了三百多个最常用Linux命令和工具的软件。BusyBox 包含了一些简单的工具，例如ls、cat和echo等等，还包含了一些更大、更复杂的工具，例grep、find、mount以及telnet。有些人 将 BusyBox 称为 Linux 工具里的瑞士军刀。简单的说BusyBox就好像是个大工具箱，它集成压缩了Linux 的许多工具和命令，也包含了 Android 系统的自带的shell

定制小型的Linux操作系统：linux内核+busybox 官方网站：https://busybox.net/

## **5.2 Busybox使用**

**busybox 的编译过程与Linux内核的编译类似**

**busybox的使用有三种方式：**

- busybox后直接跟命令，如 busybox ls
- 直接将busybox重命名，如 cp busybox tar
- 创建符号链接，如 ln -s busybox rm

**busybox的安装**

以上方法中，第三种方法最方便，但为busybox中每个命令都创建一个软链接，相当费事，busybox提供自动方法：busybox编译成功后，执行make install,则会产生一个_install目录，其中包含了busybox 及每个命令的软链接

## **5.3** **busybox编译安装**

```bash
#准备编译环境最好使用centos7
[20:09:49 root@centos7 ~]#yum -y install gcc gcc-c++ glibc glibc-devel make pcre pcre-devel openssl openssl-devel systemd-devel zlib-devel glibc-static ncurses-devel
#下载源码包
[20:11:27 root@centos7 ~]#wget https://busybox.net/downloads/busybox-1.32.1.tar.bz2
#解包
[20:13:57 root@centos7 ~]#tar xvf busybox-1.32.1.tar.bz2
[20:14:19 root@centos7 ~]#cd busybox-1.32.1/
[20:17:21 root@centos7 busybox-1.32.1]#make menuconfig
#按下面选择，把busybox编译也静态二进制、不用共享库:Settings -->Build Options -->[*] Build static binary (no shared libs)
#编译并安装
[20:20:31 root@centos7 busybox-1.32.1]#make
[09:36:07 root@centos7 busybox-1.32.1]#make install
[09:41:07 root@centos7 busybox-1.32.1]#find _install/ -type l |wc -l
397
[09:41:12 root@centos7 busybox-1.32.1]#du -sh _install/
2.6M	_install/
[09:42:52 root@centos7 busybox-1.32.1]#mkdir /mnt/sysroot/
[09:44:12 root@centos7 sysroot]#cp -a /root/busybox-1.32.1/_install/* /mnt/sysroot/
```

# **六、systemd**

## **6.1 systemd特性**

Systemd：从 CentOS 7 版本之后开始用 systemd 实现init进程，系统启动和服务器守护进程管理器， 负责在系统启动或运行时，激活系统资源，服务器进程和其它进程

**Systemd新特性**

- 系统引导时实现服务并行启动
- 按需启动守护进程
- 自动化的服务依赖关系管理
- 同时采用socket式与D-Bus总线式激活服务
- socket与服务程序分离
- 向后兼容sysv init脚本
- 使用systemctl 命令管理，systemctl命令固定不变，不可扩展，非由systemd启动的服务，systemctl无法与之通信和控制
- 系统状态快照

**systemd核心概念：unit**

unit表示不同类型的systemd对象，通过配置文件进行标识和配置；文件中主要包含了系统服务、监听socket、保存的系统快照以及其它与init相关的信息

**Unit类型：**

```bash
[09:42:41 root@centos8 ~]#systemctl -t help
Available unit types:
service
socket
target
device
mount
automount
swap
timer
path
slice
scope
```

- **service unit: 文件扩展名为.service, 用于定义系统服务**
- **Socket unit: .socket, 定义进程间通信用的socket文件，也可在系统启动时，延迟启动服务，实现按需启动**
- **Target unit: 文件扩展名为.target，用于模拟实现运行级别**
- **Device unit: .device, 用于定义内核识别的设备**
- **Mount unit: .mount, 定义文件系统挂载点**
- **Snapshot unit: .snapshot, 管理系统快照**
- **Swap unit: .swap, 用于标识swap设备**
- **Automount unit: .automount，文件系统的自动挂载点**
- **Path unit: .path，用于定义文件系统中的一个文件或目录使用,常用于当文件系统变化时，延迟激活服务，如：spool 目录**

**unit的配置文件**

```bash
/usr/lib/systemd/system    #每个服务最主要的启动脚本设置，类似于之前的/etc/init.d/
/lib/systemd/system        #ubutun的对应目录

/run/systemd/system        #系统执行过程中所产生的服务脚本，比上面目录优先运行
/etc/systemd/system        #管理员建立的执行脚本，类似于/etc/rcN.d/Sxx的功能，比上面目录优先运行
```

## **6.2 systemctl管理系统服务service unit**

**命令：**

```bash
systemctl COMMAND name.service
#启动：相当于service name start 
systemctl start name.service
 
#停止：相当于service name stop 
systemctl stop name.service
 
#重启：相当于service name restart 
systemctl restart name.service
 
#查看状态：相当于service name status 
systemctl status name.service
 
# 禁 止 自 动 和 手 动 启 动 ： 
systemctl mask name.service
 
#取消禁止
systemctl unmask name.service
 
#查看某服务当前激活与否的状态： 
systemctl is-active name.service
 
#查看所有已经激活的服务：
systemctl list-units --type|-t service

#查看所有服务：
systemctl list-units --type service --all|-a
 
#设定某服务开机自启，相当于chkconfig name on 
systemctl enable name.service
 
#设定某服务开机禁止启动：相当于chkconfig name off 
systemctl disable name.service
 
#查看所有服务的开机自启状态，相当于chkconfig --list 
systemctl list-unit-files --type service
 
#用来列出该服务在哪些运行级别下启用和禁用：chkconfig –list name 
ls /etc/systemd/system/*.wants/name.service
 
#查看服务是否开机自启：
systemctl is-enabled name.service
 
#列出失败的服务
systemctl --failed --type=service
 
#开机并立即启动或停止
systemctl  enable --now postfix 
systemctl  disable --now postfix
 
#查看服务的依赖关系：
systemctl list-dependencies name.service
 
#杀掉进程：
systemctl kill unitname
```

**服务状态：**

```bash
#显示状态
systemctl list-unit-files --type service --all
```

- loaded   Unit配置文件已处理
- active(running) 一次或多次持续处理的运行
- active(exited) 成功完成一次性的配置
- active(waiting) 运行中，等待一个事件
- inactive 不运行
- enabled 开机启动
- disabled 开机不启动
- static 开机不启动，但可被另一个启用的服务激活
- indirect 重定向到别处

**范例：systemctl 命令示例**

```bash
#显示所有单元状态
[10:07:33 root@centos8 ~]#systemctl list-unit
#只显示服务单元的状态
[10:08:48 root@centos8 ~]#systemctl --type=service
#显示sshd服务单元
[10:09:19 root@centos8 ~]#systemctl -l status sshd.service 
#验证sshd服务当前是否活动
[10:10:07 root@centos8 ~]#systemctl is-active sshd
active
#启动，停止和重启sshd服务
[10:11:57 root@centos8 ~]#systemctl start sshd.socket 
[10:12:02 root@centos8 ~]#systemctl stop sshd.socket 
[10:12:09 root@centos8 ~]#systemctl restart sshd.socket 

#重新加载配置
[10:13:18 root@centos8 ~]#systemctl reload postfix.service 
#列出活动状态的所有服务单元
[10:15:05 root@centos8 ~]#systemctl list-units --type=service
#列出所有服务单元
[10:15:33 root@centos8 ~]#systemctl list-units --type=service --all
#列出依赖单元
[10:16:09 root@centos8 ~]#systemctl list-dependencies sshd
验证sshd服务是否开机启动
[10:16:09 root@centos8 ~]#systemctl is-enabled sshd
enabled
```

## **6.3 service unit文件格式**

- /etc/systemd/system：系统管理员和用户使用
- /usr/lib/systemd/system：发行版打包者使用

**帮助参考：**

systemd.directives（7），systemd.unit(5),systemd.service(5), systemd.socket(5), systemd.target(5),systemd.exec(5)

**参考链接**

http://www.jinbuguo.com/systemd/systemd.service.html

**unit 格式说明：**

- 以 “#” 开头的行后面的内容会被认为是注释
- 相关布尔值，1、yes、on、true 都是开启，0、no、off、false 都是关闭
- 时间单位默认是秒，所以要用毫秒（ms）分钟（m）等须显式说明

**service unit file文件通常由三部分组成：**

- [Unit]：定义与Unit类型无关的通用选项；用于提供unit的描述信息、unit行为及依赖关系等
- [Service]：与特定类型相关的专用选项；此处为Service类型
- [Install]：定义由“systemctl enable”以及"systemctl disable“命令在实现服务启用或禁用时用到的一些选项

**Unit段的常用选项：**

- Description：描述信息
- After：定义unit的启动次序，表示当前unit应该晚于哪些unit启动，其功能与Before相反
- Requires：依赖到的其它units，强依赖，被依赖的units无法激活时，当前unit也无法激活
- Wants：依赖到的其它units，弱依赖
- Conflicts：定义units间的冲突关系

```bash
[10:16:44 root@centos8 ~]#head -n 5  /usr/lib/systemd/system/postfix.service 
[Unit]
Description=Postfix Mail Transport Agent
After=syslog.target network.target
Conflicts=sendmail.service exim.service
```

**Service段的常用选项：**

- Type：定义影响ExecStart及相关参数的功能的unit进程启动类型
- - simple：默认值，这个daemon主要由ExecStart接的指令串来启动，启动后常驻于内存中
  - forking：由ExecStart启动的程序透过spawns延伸出其他子程序来作为此daemon的主要服务。原生父程序在启动结束后就会终止
  - oneshot：与simple类似，不过这个程序在工作完毕后就结束了，不会常驻在内存中
  - dbus：与simple类似，但这个daemon必须要在取得一个D-Bus的名称后，才会继续运作.因  此 通 常 也 要 同 时 设 定 BusNname=才行
  - notify：在启动完成后会发送一个通知消息。还需要配合 NotifyAccess 来让 Systemd 接收消息
  - idle：与simple类似，要执行这个daemon必须要所有的工作都顺利执行完毕后才会执行。这类的daemon通常是开机到最后才执行即可的服务
- EnvironmentFile：环境配置文件
- ExecStart：指明启动unit要运行命令或脚本的绝对路径ExecStartPre： ExecStart前运行
- ExecStartPost： ExecStart后运行
- ExecStop：指明停止unit要运行的命令或脚本
- Restart：当设定Restart=1 时，则当次daemon服务意外终止后，会再次自动启动此服务
- RestartSec: 设置在重启服务( Restart= )前暂停多长时间。 默认值是100毫秒(100ms)。 如果未指定时间单位，那么将视为以秒为单位。 例如设为"20"等价于设为"20s"。
- PrivateTmp：设定为yes时，会在生成/tmp/systemd-private-UUID-NAME.service-XXXXX/tmp/目录

**Install段的常用选项：**

- Alias：别名，可使用systemctl command Alias.service
- RequiredBy：被哪些units所依赖，强依赖
- WantedBy：被哪些units所依赖，弱依赖
- Also：安装本服务的时候还要安装别的相关服务

**注意：对于新创建的unit文件，或者修改了的unit文件，要通知systemd重载此配置文件,而后可以选择重启**

```bash
systemctl  daemon-reload
```

**范例：自定义service的nuit文件**

```bash
[10:34:08 root@centos8 ~]#cat /usr/lib/systemd/system/hello.service
[Unit]
Descripton=Hello World
[Service]
TimeoutStartSec=0
ExecStart=/bin/sh -c "while true;do echo Hello World;sleep1;done"
ExecStop=kill sh
[Install]
WantedBy=multi-user.target
[10:34:12 root@centos8 ~]#systemctl daemon-reload 
[10:34:29 root@centos8 ~]#systemctl enable --now hello
Created symlink /etc/systemd/system/multi-user.target.wants/hello.service → /usr/lib/systemd/system/hello.service.
[10:34:42 root@centos8 ~]#systemctl status hello
● hello.service
   Loaded: loaded (/usr/lib/systemd/system/hello.service; enabled; vendor preset: disabled)
   Active: active (running) since Sat 2021-01-09 10:34:42 CST; 17s ago
 Main PID: 2239 (sh)
    Tasks: 3 (limit: 5867)
   Memory: 876.0K
   CGroup: /system.slice/hello.service
           ├─ 2239 /bin/sh -c while true;do echo Hello World;sleep1;done
           └─35725 /bin/sh -c while true;do echo Hello World;sleep1;done

Jan 09 10:34:49 centos8 sh[2239]: Hello World
Jan 09 10:34:49 centos8 sh[2239]: /bin/sh: sleep1: command not found
Jan 09 10:34:49 centos8 sh[2239]: Hello World
Jan 09 10:34:49 centos8 sh[2239]: /bin/sh: sleep1: command not found
Jan 09 10:34:49 centos8 sh[2239]: Hello World
Jan 09 10:34:49 centos8 sh[2239]: /bin/sh: sleep1: command not found
Jan 09 10:34:49 centos8 sh[2239]: Hello World
Jan 09 10:34:49 centos8 sh[2239]: /bin/sh: sleep1: command not found
Jan 09 10:34:49 centos8 sh[2239]: Hello World
Jan 09 10:34:49 centos8 sh[2239]: /bin/sh: sleep1: command not found
```

**范例：服务Unit文件**

```bash
[Unit]
Description=The Nginx HTTP Server daemon                    # 描述信息
After=network.target remote-fs.target nss-lookup.target     # 指定启动nginx之前需要其他的其他服务，如network.target等
[Service]
# Type为服务类型，仅启动一个主进程的服务为simple，需要启动若干子进程的服务为forking 
Type=forking
 
# 设置执行systemctl start nginx后需要启动的具体命令
ExecStart=/usr/local/nginx/sbin/nginx
 
# 设置执行systemctl reload nginx后需要执行的具体命令
ExecReload=/usr/local/nginx/sbin/nginx -s reload
 
# 设置执行systemctl stop nginx后需要执行的具体命令
ExecStop=/bin/kill -s QUIT ${MAINPID}
 
[Install]
# 设置在什么模式下被安装，设置开机启动的时候需要
WantedBy=multi-user.target
```

**范例：服务Unit文件**

```bash
[10:51:54 root@centos8 ~]#cat /usr/lib/systemd/system/tomcat.service
[Unit]
Description=java tomcat project
After=syslog.target network.target

[Service]
Type=forking
EnvironmentFile=/usr/local/tomcat/conf/tomcat.conf
ExecStart=/usr/local/tomcat/conf/startup.sh
ExecStop=/usr/local/tomcat/bin/shutdown.sh
PrivateTmp=true
User=tomcat

[Install]
WantedBy=multi-user.target
```

**范例：服务Unit文件**

```bash
[11:01:28 root@centos8 ~]#cat /etc/systemd/system/bak.service
[Unit]
Description=backup /etc
Requires=atd.service

[Service]
Type=simple
ExecStart=/bin/bash -C "echo /data/100sum.sh | at now"

[Install]
WantedBy=multi-user.target
[11:01:36 root@centos8 ~]#systemctl daemon-reload 
[11:01:42 root@centos8 ~]#systemctl start bak
```

**范例：Ubuntu实现开机自动运行程序**

```bash
[root@ubuntu1804 ~]#vim /etc/rc.local 
[root@ubuntu1804 ~]#cat /etc/rc.local 
#!/bin/bash
echo -e '\E[31;1mstarting test service\E[0m' sleep 10
[root@ubuntu1804 ~]#chmod +x /etc/rc.local 
[root@ubuntu1804 ~]#reboot
```

## **6.4 运行级别**

**target units：相当于CentOS 6之前的runlevel ,unit配置文件：.target**

```bash
[11:04:30 root@centos8 ~]#ls /usr/lib/systemd/system/*.target
[11:05:15 root@centos8 ~]#systemctl list-unit-files --type target --all
```

**和运行级别对应关系**

```bash
0  ==> runlevel0.target, poweroff.target
1  ==> runlevel1.target, rescue.target
2  ==> runlevel2.target, multi-user.target
3  ==> runlevel3.target, multi-user.target
4  ==> runlevel4.target, multi-user.target
5  ==> runlevel5.target, graphical.target
6  ==> runlevel6.target, reboot.target
```

**查看依赖性：**

```bash
systemctl list-dependencies graphical.target
```

**级别切换：相当于 init N**

```bash
systemctl isolate name.target
```

**进入默认target**

```bash
systemctl  default
```

**范例：**

```bash
#切换至字符模式
systemctl isolate multi-user.target
```

**注意：只有/lib/systemd/system/\*.target文件中AllowIsolate=yes 才能切换(修改文件需执行systemctl daemon-reload才能生效)**

**获取默认运行级别： 相当于查看 /etc/inittab**

```bash
systemctl get-default
```

**修改默认级别：相当于修改 /etc/inittab**

```bash
systemctl set-default name.target
```

**范例：**

```bash
[11:10:29 root@centos8 ~]#systemctl set-default multi-user.target 
[11:10:39 root@centos8 ~]#ls -l /etc/systemd/system/default.target 
lrwxrwxrwx. 1 root root 37 Dec 17 17:05 /etc/systemd/system/default.target -> /lib/systemd/system/multi-user.target
```

**切换至紧急救援模式：**

```bash
[11:10:56 root@centos8 ~]#systemctl rescue
```

- 说明rescue.target 比emergency 支持更多的功能，例如日志等
- 传统命令init，poweroff，halt，reboot都成为 systemctl的软链接

```bash
#关机
systemctl halt、systemctl poweroff
 
#重启：
systemctl reboot
 
#挂起：
systemctl suspend
 
#休眠：
systemctl hibernate
 
#休眠并挂起：
systemctl hybrid-sleep
```

**范例：禁用ctrl+alt+delete重启快捷键**

```bash
[11:11:46 root@centos8 ~]#ls -l /lib/systemd/system/ctrl-alt-del.target 
lrwxrwxrwx. 1 root root 13 Nov 14 07:01 /lib/systemd/system/ctrl-alt-del.target -> reboot.target
[11:13:37 root@centos8 ~]#systemctl mask ctrl-alt-del.target 
Created symlink /etc/systemd/system/ctrl-alt-del.target → /dev/null.
[11:13:52 root@centos8 ~]#init q
[11:14:00 root@centos8 ~]#systemctl daemon-reload
```

## **6.5 Centos 7之后版本引导顺序**

- UEFi或BIOS初始化，运行POST开机自检
- 选择启动设备
- 引导装载程序, centos7是grub2,加载装载程序的配置文件：
- - /etc/grub.d/
  - /etc/default/grub
  - /boot/grub2/grub.cfg
- 加载initramfs驱动模块
- 加载内核选项
- 内核初始化，centos7使用systemd代替init
- 执行initrd.target所有单元，包括挂载/etc/fstab
- 从initramfs根文件系统切换到磁盘根目录
- systemd执行默认target配置，配置文件/etc/systemd/system/default.target
- systemd执行sysinit.target初始化系统及basic.target准备操作系统
- systemd启动multi-user.target下的本机与服务器服务
- systemd执行multi-user.target下的/etc/rc.d/rc.local
- Systemd执行multi-user.target下的getty.target及登录服务
- systemd执行graphical需要的服务

**通过systemd-analyze 工具可以了解启动的详细过程**

**范例：**

```bash
[11:17:09 root@centos8 ~]#systemd-analyze blame 
         11.318s webmin.service
          5.898s tuned.service
          4.625s initrd-switch-root.service
          4.053s postfix.service
          3.969s sssd.service
```

**范例：生成网页**

```bash
[11:21:41 root@centos8 html]#systemd-analyze plot >boot.html
然后网页访问
```

## **6.6 设置内核参数**

设置内核参数，只影响当次启动

启动时，到启动菜单，按e键，找到在linux 开头的行后添加systemd.unit=desired.target 比如：systemd.unit=emergency.target 或 systemd.unit=rescue.target

## **6.7 破解CentOS 7和8的root密码**

**方法1**

```bash
启动时任意键暂停启动按e键进入编辑模式
将光标移动linux 开始的行，添加内核参数rd.break 
按ctrl-x启动
mount –o remount,rw /sysroot 
chroot /sysroot
passwd root
 
#如果SELinux是启用的,才需要执行下面操作,如查没有启动,不需要执行touch /.autorelabel
 
exit 
reboot
```

**方法2**

```bash
启动时任意键暂停启动按e键进入编辑模式
将光标移动linux 开始的行，改为rw init=/sysroot/bin/sh
按ctrl-x启动
chroot /sysroot passwd root
 
#如果SELinux是启用的,才需要执行下面操作,如查没有启动,不需要执行
touch /.autorelabel
 
exit 
reboot
```

## **6.8 实现GRUB2安全**

```bash
#添加grub密码
[11:52:23 root@centos7 ~]#grub2-setpassword 
Enter password: 
Confirm password: 
[11:53:14 root@centos7 ~]#ls -l /boot/grub2/
total 36
-rw-r--r--. 1 root root   64 Dec 17 17:04 device.map
drwxr-xr-x. 2 root root   25 Dec 17 17:04 fonts
-rw-r--r--. 1 root root 4511 Jan  7 11:13 grub.cfg
-rw-r--r--. 1 root root 1024 Dec 17 17:05 grubenv
drwxr-xr-x. 2 root root 8192 Dec 17 17:04 i386-pc
drwxr-xr-x. 2 root root 4096 Dec 17 17:04 locale
-rw-------  1 root root  298 Jan  9 11:53 user.cfg
[11:53:26 root@centos7 ~]#ls -l /boot/grub2/user.cfg 
-rw------- 1 root root 298 Jan  9 11:53 /boot/grub2/user.cfg
[11:53:40 root@centos7 ~]#cat /boot/grub2/user.cfg
GRUB2_PASSWORD=grub.pbkdf2.sha512.10000.C88A23236E8679897EECDF00C40467330D17C3844DC071B62745F41E5D00D7F0D782176C82F3962F24B37C1BAAE9CCD2E2390C555F6D6CBAB0B44118F0B32E42.48BDDDAD24F422F74E6406F06010BF392701866EF5A01AE81DC75225DE72DD2A1E0AAD6C3DB3CF2D9F1DAEC1F353B7597D168E877AA048B02AD90CCB3798CC7E
#清空grub密码
[11:53:48 root@centos7 ~]#cat /dev/null >/boot/grub2/user.cfg 
[11:54:10 root@centos7 ~]#rm -f /boot/grub2/user.cfg
```

## **6.9 修复GRUB2**

GRUB2：CentOS 7，8及ubuntu1804都使用

引导提示时可以使用命令行界面，可从文件系统引导

主要配置文件：/boot/grub2/grub.cfg

修复配置文件：grub2-mkconfig > /boot/grub2/grub.cfg

**修复grub**

```bash
grub2-install /dev/sda              #BIOS环境
grub2-install                       #UEFI环境
```

**范例：调整默认启动内核**

```bash
[root@centos8 ~]#cat /boot/grub2/grubenv 
# GRUB Environment Block
saved_entry=5b85fc7444b240a992c42ce2a9f65db5-5.6.12-wanglinux-6.6.6 
kernelopts=root=UUID=f7f53add-b184-4ddc-8d2c-5263b84d1e15 ro crashkernel=auto 
resume=UUID=eebe3bc7-6d52-4ad9-86aa-916f1a123fd4 rhgb quiet net.ifnames=0 
boot_success=0 
################################################################################ ################################################################################ ################################################################################ ################################################################################ ################################################################################ ################################################################################ ################################################################################ ################################################################################ ################################################################################ ###########################################

[root@centos8 ~]#cd
[root@centos8 ~]#ls /boot/loader/entries/ 
5b85fc7444b240a992c42ce2a9f65db5-0-rescue.conf 
5b85fc7444b240a992c42ce2a9f65db5-4.18.0-147.el8.x86_64.conf 
5b85fc7444b240a992c42ce2a9f65db5-5.6.12-wanglinux-6.6.6.conf

#以下命令是修改 /boot/grub2/grubenv 实现
[root@centos8 ~]#grub2-set-default 1 
#或者
[root@centos8 ~]#vim /etc/default/grub 
GRUB_DEFAULT=1
```

## **6.10 故障排错实战案例**

### **6.10.1 实战案例1：centos 7 **，8 **破坏**MBR后进行恢复

```bash
[12:01:55 root@centos7 ~]#dd if=/dev/zero of=/dev/sda bs=1 count=446
光盘进入救援模式
[12:06:20 root@centos7 ~]#chroot /mnt/sysimage
[12:06:44 root@centos7 ~]#grub2-install /dev/sda
```

### **6.10.2 实战案例2：entos 7 ，8删除/boot/grub2/\*所有内容进行恢复**

```bash
光盘进入救援模式
[12:06:20 root@centos7 ~]#chroot /mnt/sysimage
[12:06:44 root@centos7 ~]#grub2-install /dev/sda
[12:40:41 root@centos7 ~]#grub2-mkconfig /boot/grub2/grub.cfg
```

### **6.10.3**   **实战案例3：CentOS 7 ，**8 **删除/boot/下所有文件后进行恢复**

```bash
1 光盘救援模式下安装grub2
特别说明：Centos8 必须先grub，再安装kernel,否则安装kernel-core时会提示grub出错
[12:06:20 root@centos7 ~]#chroot /mnt/sysimage
[12:41:58 root@centos7 ~]#mount /dev/sr0 /mnt/
[12:06:44 root@centos7 ~]#grub2-install /dev/sda

#安装kernel，centos7和8版本是不一样的先确认
[12:48:37 root@centos7 ~]#rpm -ivh /mnt/Packages/kernel-3.10.0-1127.el7.x86_64.rpm --force

3修复grub配置文件生成grub2.cfg文件
[12:40:41 root@centos7 ~]#grub2-mkconfig /boot/grub2/grub.cfg
4 退出重启
exit 
exit
```

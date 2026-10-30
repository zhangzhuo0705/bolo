---
title: "8-磁盘存储和文件系统管理"
date: 2021-05-17T11:43:19+08:00
lastmod: 2021-06-02T10:31:57+08:00
draft: false
description: "覆盖磁盘结构、分区、文件系统、LVM、快照与 RAID 的配置和管理。"
cover: "https://b3logfile.com/bing/20201209.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["Linux系统基础知识"]
tags: ["linux", "RAID"]
toc: true
---
# 一、磁盘结构

## 1.1设备文件

**一切皆文件**：open(),read(),write(),close()

**设备文件**：关联至少一个设备驱动程序，进而能够跟与之对应硬件设备进行通信

**设备号码**：

* 主设备号：major number，标识设备类型
* 次设备号：minor number，标识同一类型下的不同设备

```bash
#实例：
[01:22:56 root@localhost ~]#ll /dev/null
crw-rw-rw-. 1 root root 1, 3 Nov 22 01:12 /dev/null

# 1，3    1是主设备号    3是次设备号

#范例：创建一个跟/dev/zero一样的文件
[01:23:04 root@localhost ~]#mknod /root/zero c 1 5
[01:27:23 root@localhost ~]#ll
total 8
-rw-------. 1 root root 1301 Nov 21 23:55 anaconda-ks.cfg
-rwxr-xr-x. 1 root root 1596 Nov 21 23:57 reset.sh
crw-r--r--. 1 root root 1, 5 Nov 22 01:27 zero
[01:28:25 root@localhost ~]#dd if=/root/zero of=/root/test bs=1 count=10
10+0 records in
10+0 records out
10 bytes (10 B) copied, 0.000166157 s, 60.2 kB/s
[01:28:52 root@localhost ~]#hexdump -C /root/test
00000000  00 00 00 00 00 00 00 00  00 00                    |..........|
0000000a
```

**设备类型**：

* 块设备：block，存取单位“块”，磁盘
* 字符设备：char，存取单位“字符”，键盘

**磁盘设备的设备文件命名**：

/dev/DEV_FILE
/dev/sdX # SAS,SATA,SCSI,IDE,USB
/dev/nvme0n #nvme协议硬盘，如：第一个硬盘：nvme0n1,第二个硬盘：nvme0n2

**虚拟磁盘**：

/dev/vd
/dev/xvd

**不同磁盘标识**：a-z，aa，ab.....

**同一设备的不同分区**：1，2，...

/dev/sda1
/dev/sda2

# 二、管理存储

**使用磁盘空间过程**

1. 设备分区
2. 创建文件系统
3. 挂载新的文件系统

## 2.1 磁盘分区

### 2.1.1为什么分区

* 优化I/O性能
* 实现磁盘空间配额限制
* 提高修复速度
* 隔离系统和程序
* 安装多个OS
* 采用不同文件系统

### 2.1.2 分区方式

俩种分区方式：MBR，GTP

#### 2.1.2.1 MBR分区

MBR：Master Boot Record，1982年，使用32位表示扇区数，分区不超过2T，2^32*512bytes就是最大容量

划分分区的单位：

* CentOS 5 之前按整柱面划分
* CentOS 6 版本后可以按Sector划分

0磁道0扇区：512bytes

446bytes：boot loader 启动系统的信息

64bytes：分区表，其中16bytes标识一个分区

2bytes：55aa,结束标志

MBR分区中一块硬盘最多有4个主分区，也可以3主分区+1扩展（N个逻辑分区）

MBR分区中扩展分区不能直接使用必须配合逻辑分区使用。

MBR分区：主和扩展分区对应的1-4，/dev/sda3,逻辑分区从5开始，/dev/sda5

**MBR分区结构**
![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-6806c6fb.png)
![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-19a66ec4.png)

* 主引导程序（偏移地址0000H--0088H），它负责从活动分区中装载，并运行系统引导程序
* 出错信息数据区，偏移地址0089H--00E1H为出错信息，00E2H--01BDH全为0字节
* 分区表（DPT,Disk Partition Table）含4个分区项，偏移地址01BEH--01FDH,每个分区表项长16个字节，共64字节为分区项1、分区项2、分区项3、分区项4
* 结束标志字，偏移地址01FE--01FF的2个字节值为结束标志55AA

**MBR中DPT结构**
![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-2d845d71.png)
**MBR分区表备份恢复**

实验：

```bash
#查看磁盘分区信息
[04:35:57 root@localhost ~]#lsblk
NAME            MAJ:MIN RM  SIZE RO TYPE MOUNTPOINT
sda               8:0    0   20G  0 disk
├─sda1            8:1    0    1G  0 part /boot
└─sda2            8:2    0   19G  0 part
├─centos-root 253:0    0   17G  0 lvm  /
└─centos-swap 253:1    0    2G  0 lvm  [SWAP]
sdb               8:16   0   20G  0 disk
sdc               8:32   0   10G  0 disk
sr0              11:0    1 1024M  0 rom

#备份sda硬盘的分区信息
[04:36:01 root@localhost ~]#dd if=/dev/sda of=/root/mbr bs=1 count=64 skip=446

#查看备份的信息
[04:37:10 root@localhost ~]#hexdump -C mbr

#回复sda硬盘分区信息
[04:48:08 root@localhost ~]dd if=mbr of=/dev/sda bs=1 count=64 seek=446
[04:48:08 root@localhost ~]#sync   强制写磁盘。
```

#### 2.1.2.2 GPT分区

GPT：GUID（Globals Unique ldentifiers） prtition table 支持128个分区，使用64位，支持8Z（512Byte/block）64Z(4096Byte/block)

使用128位UUID（Universally Unique ldentifier）表示磁盘和分区，GPT分区表自动备份在头和尾俩份，并有CRC效验位

UEFI（Unified Extensible Firmware Interface 统一可扩展固件接口）硬件支持GPT，使得操作系统可以启动

GPT分区没有扩展分区都是主分区。

**GPT分区结构**

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-64d262c2.png)

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-350e26b8.png)

### 2.1.3 管理分区

列出块设备

```bash
lsblk
```

创建分区命令

```bash
fdisk  管理MBR分区
gdisk  管理GPT分区
parted 高级分区操作，可以是交互或非交互方式
```

#### 2.1.3.1 parted命令

**注意：parted的操作都是实时生效！！！尽量少用！**

命令格式：

```bash
parted [选项]... [设备[命令 [参数]...]...]
```

非交互范例：

```bash
parted /dev/sdb  mklabel gpt|msdos(表示mbr分区格式)
设置硬盘格式

parted /dev/sdb print
查看硬盘信息

parted /dev/sdb mkpart primary|extend|logical  1 200 (默认M)
分区，mkpart后面跟的分区格式分别是主分区扩展分区，逻辑分区

parted /dev/sdb rm 1
删除分区1
```

实验：

```bash
[20:16:56 root@localhost ~]#parted /dev/sdb mklabel msdos
Warning: The existing disk label on /dev/sdb will be destroyed and all data on this disk will be lost. Do
you want to continue?
Yes/No? yes
Information: You may need to update /etc/fstab.

[20:17:31 root@localhost ~]#parted /dev/sdb print
Model: VMware, VMware Virtual S (scsi)
Disk /dev/sdb: 21.5GB
Sector size (logical/physical): 512B/512B
Partition Table: msdos
Disk Flags:

Number  Start  End  Size  Type  File system  Flags

[20:17:42 root@localhost ~]#parted /dev/sdb mkpart primary 1 100
Information: You may need to update /etc/fstab.

[20:18:10 root@localhost ~]#parted /dev/sdb mkpart primary 101 200
Information: You may need to update /etc/fstab.

[20:18:20 root@localhost ~]#parted /dev/sdb print
Model: VMware, VMware Virtual S (scsi)
Disk /dev/sdb: 21.5GB
Sector size (logical/physical): 512B/512B
Partition Table: msdos
Disk Flags:

Number  Start   End     Size    Type     File system  Flags
1      1049kB  99.6MB  98.6MB  primary
2      99.6MB  200MB   101MB   primary
[23:55:50 root@localhost ~]#parted /dev/sdb rm 2
Information: You may need to update /etc/fstab.

[23:56:06 root@localhost ~]#parted /dev/sdb print
Model: VMware, VMware Virtual S (scsi)
Disk /dev/sdb: 21.5GB
Sector size (logical/physical): 512B/512B
Partition Table: msdos
Disk Flags:

Number  Start   End     Size    Type     File system  Flags
1      1049kB  99.6MB  98.6MB  primary
```

#### 2.1.3.1 分区工具fdisk和gdisk命令

**fdisk主要用来处理mbr格式的硬盘也可以处理gpt格式硬盘但是不推荐，退出保存后才生效。**

**gdisk主要处理gpt格式分区，其他一样。**

fdisk命令范例：gdisk跟fdisk命令相似

```bash
fdisk /dev/sdb
对sdb硬盘进行分区操作，进入交互式界面
d   删除分区
g   切换 GPT 分区格式
m   帮助
n   新建分区
o   切换 RBM 分区格式
p   查看硬盘信息
t   修改id   L可以查看所有id
q   退出不保存
w   保存退出
```

**查看内核是否已经识别新的分区**

```bash
cat /proc/partitions
```

**Centos 7,8同步分区表：**

```bash
partprobe
```

**Centos6 通知内核更新重新读取硬盘分区表**

新增分区用

```bash
partx -a /dev/sdb
kpartx -a /dev/sdb -f force
```

删除分区用

```bash
partx -d --nr M-N /dev/sdb
m,n表示这个硬盘的那个分区
```

**非交互式创建分区：**

```bash
echo -e 'n\np\n\n+2G\nw\n' | fdisk /dev/sdb
```

**报错信息：**
![clipboard.png](https://b3logfile.com/file/2020/11/clipboard-6ad87fef.png)

分区1的结束不在柱面的边界。一般在centos6版本以下可能有问题。

## 2.2 文件系统

### 2.2.1 创建文件系统

创建文件系统管理工具：

* mkfs命令
  * mkfs.FS_TYPE /dev/DEVICE
    * ext4
    * xfs

**常用选项：**

```bash
-b {1024|2048|4096}   指定块block大小
-m                    默认5%，为管理人员预留空间占空间的百分比
-f                    强制，略过警告信息
-i                    为数据空间中每多少个字节创建一个inode；不应该小于block大
-L                    设置卷标
-N                    指定分区中创建多少个inode
-o                    调整文件系统的默认挂载选项，-o acl   启用acl查看和管理分区信息
```

**blkid：可以查看块设备属性信息**

格式

```bash
blkid
blkid /dev/sdb
```

**findfs：查找分区**

```bash
findfs UUID=ffcecf40-3cb3-4ad0-82a2-0b73b1277231
findfs LABEL=(标签名)
```

**tune2fs：重新设定ext系列文件系统可调整参数的值**

```bash
tune2fs /dev/sdb1 -l

-l  查看指定文件系统超级块信息：super block
-L 'LABEL' 修改卷标
-m  修预留给管理员的空间百分比
-j  将ext2升级为ext3
-U 修改UUID号 使用uuidgen可以自动生产uuid
```

**dumpe2fs：显示ext文件系统信息，将磁盘块分组管理**

```bash
-h：查看超级块信息，不显示分组信息

dumpe2fs /dev/sdb1
dumpe2fs /dev/sdb1 -h
```

**xfs_info:显示挂载或已挂载的xfs文件系统信息**

```bash
xfs_info /dev/sdb2
```

### 2.2.2 文件系统检测和修复

**修复时并不能保证分区内的数据可以完全恢复。最好还是进行备份。使用tar...进行备份。**

**fsck：File System Check**

```bash
fsck.FS_TYPE
fsck -t FS_TYPE
```

注意：FS_TYPE一定要与分区上次文件类型相同

**常用选项：**

```bash
-a 自动修复
-r 交互式修复错误
```

**e2fsck:ext系列文件专用的检测修复工具**

```bash
-y 自动回答为yes
-f 强制修复
-p 自动进行安全的修复文件系统问题
```

**xfs_repair:xfs文件系统专用检测修复工具**

常用选项：

```bash
-f 修复文件，而设备
-n 只检查
-d 允许修复只读的挂载设备，在单用户下修复/时使用，然后立即reboot
```

## 2.3 挂载

挂载：将额外文件系统与根文件系统某现存的目录建立起关联关系，进而使得此目录作为其他文件访问入口的行为

卸载：为解除此关联关系的过程

**挂载点下原有文件在挂载完成后会被临时隐藏，因此，挂载点目录一般为空**

**进程正在使用中的设备无法被卸载。**

**同一时间不能把多个设备挂载到同一目录，同一个设备可以挂载在不同目录尽量避免循环挂载。**

### 2.3.1 挂载文件系统mount

格式：

```bash
mount /dev/sdb /opt
```

**挂载时目录必须事先存在，建议使用空目录。**

挂载规则:

* 一个挂载点同一时间只能挂载一个设备
* 一个挂载点同一时间挂载了多个设备，只能看到最后一个设备的数据，其它设备上的数据将被隐藏
* 一个设备可以同时挂载到多个挂载点
* 通常挂载点一般是已存在空的目录

**mount常用参数：**

```bash
-r   只读方式挂载
-w   读写挂载 默认
-a   自动挂载所有支持自动挂载的设备（定义在了/etc/fstab文件中，且挂载选项中有auto功能）
-B   绑定目录到另一个目录上
-o options:(挂载文件系统的选项)，多个选项使用逗号分隔，什么参数都不写表示这些参数的集合
async异步模式,内存更改时,写入缓存区buffer,过一段时间再写到磁盘中，效率高，但不安全
sync同步模式,内存更改时，同时写磁盘，安全，但效率低下
atime/noatime         包含目录和文件，优化服务器使用，减少IO
diratime/nodiratime   目录的访问时间戳，优化服务器使用，减少IO
auto/noauto是否支持开机自动挂载，是否支持-a选项
exec/noexec是否支持将文件系统上运行应用程序
dev/nodev是否支持在此文件系统上使用设备文件
suid/nosuid是否支持suid和sgid权限
remount重新挂载
ro/rw只读、读写
ac1/noac1启用此文件系统上的ac1功能
loop 使用1oop设备
_netdev当网络可用时才对网络资源进行挂载，如:NFS文件系统
defaults相当于rw，suid，dev，exec，auto，nouser，async
```

**loop文件**

```bash
创建一个test.img文件大小1G
dd if=/dev/zero of=/root/test.img bs=1M count=1024
1024+0 records in
1024+0 records out
1073741824 bytes (1.1 GB) copied, 4.04265 s, 266 MB/s
格式化这个文件
mkfs.xfs /root/test.img
挂载查看
mkdir /opt/test
mount /root/test.img /opt/test/
[19:58:18 root@localhost ~]#df -h
Filesystem               Size  Used Avail Use% Mounted on
devtmpfs                 475M     0  475M   0% /dev
tmpfs                    487M     0  487M   0% /dev/shm
tmpfs                    487M  7.7M  479M   2% /run
tmpfs                    487M     0  487M   0% /sys/fs/cgroup
/dev/mapper/centos-root   17G  2.5G   15G  15% /
/dev/sda1               1014M  160M  855M  16% /boot
tmpfs                     98M     0   98M   0% /run/user/0
/dev/loop0              1014M   33M  982M   4% /opt/test
[20:01:21 root@localhost ~]#ll /dev/loop*
brw-rw----. 1 root disk  7,   0 Nov 23 19:58 /dev/loop0
crw-rw----. 1 root disk 10, 237 Nov 23 19:58 /dev/loop-control
```

挂载文件的话会自动映射一个loop设备文件挂载

### 2.3.2 卸载文件系统umount

卸载时：可以使用设备，也可以使用挂载点

```bash
umount 设备名|挂载点
```

### 2.3.3 查看挂载情况

**查看挂载**

```bash
#通过查看/etc/mtab文件显示当前已挂载的所有设备，历史的也会显示。
mount
#查看内核追踪到的已挂载的所有设备
cat /proc/mounts
```

**查看挂载点情况**

```bash
findmnt 设备名| 挂载点
多用于判断是否挂载配合echo $?,写脚本时使用
```

**查看正在访问指定文件系统的进程**

```bash
lsof MOUNT_POINT
fuser -v MOUNT_POINT
```

**终止所有正在访问指定文件系统的进程**

```bash
fuser -km MOUNT_POINT
尽量不要使用。
```

**loop设备挂载查看**

```bash
losetup
```

### 2.3.4 持久挂载

将挂载保存到/etc/fstab中可以下次开机时，自动挂载

**挂载文件时写路径不要写uuid**

```bash
/etc/fstab
UUID=329fef98-cd8a-49b4-b883-063ed7023f6f /boot xfs  defaults   0 0
设备uuid,挂载点，文件系统类型，挂载选项，第一个0是否进行备份，
第二个0开机检查，1开机
```

## 2.4 处理交换文件和分区

### 2.4.1 交换分区实现过程

1.创建交换分区或者文件，使用文件时在/etc/fstab下写文件名称不要写UUID不然开机不识别

2.使用mkswqp写入特殊签名

3.在/etc/fstab文件中添加适当的条目

4.使用swapon -a 激活交换空间

**启用swap分区**

```bash
swapon [OPTION]...[DEVICE]
选项
-a：激活所有的交换分区
-p：指定优先级，也可以在/etc/fstab 在第4列指定：pri=value
-s：查看swap分区情况
```

**禁用swap分区**

```bash
swapoff -a                        禁用所有
swapoff /dev/mapper/centos-swap   禁用单个
```

**范例：创建swap分区**

```bash
fdisk /dev/sdb    分区
mkswap /dev/sdb1  格式化
vim /etc/fstab     挂载
swapon -a          启用
free -h            查看
```

**swap 优先级修改**

```bash
vim /etc/fstab
defaults,pri=100
swapon -a
```

### 2.4.1 swap的使用策略

/proc/sys/vm/swappiness的值决定了当内存占用达到一定的百分比时，会启用swap分区的空间

范例：

```bash
[21:29:26 root@localhost ~]#cat /proc/sys/vm/swappiness
30
```

说明：内存在使用到100-30=70%的时候，就开始出现有交换分区的使用。

## 2.5 移动介质

### 2.5.1 usb介质

```bash
查看usb设备是否识别
lsusb
没有的话安装
yum install usbutils
挂载使用
lsblk
mount
```

### 2.5.2 使用光盘

**手工挂载**

```bash
[22:00:40 root@localhost ~]#lsblk
NAME            MAJ:MIN RM  SIZE RO TYPE MOUNTPOINT
sda               8:0    0   20G  0 disk
├─sda1            8:1    0    1G  0 part /boot
└─sda2            8:2    0   19G  0 part
├─centos-root 253:0    0   17G  0 lvm  /
└─centos-swap 253:1    0    2G  0 lvm  [SWAP]
sdb               8:16   0   20G  0 disk
sdc               8:32   0   10G  0 disk
sr0              11:0    1  9.6G  0 rom
[22:01:40 root@localhost ~]#mount /dev/sr0 /mnt/
mount: /dev/sr0 is write-protected, mounting read-only
[22:01:48 root@localhost ~]#ls /mnt/
CentOS_BuildTag  EULA  images    LiveOS    repodata              RPM-GPG-KEY-CentOS-Testing-7
EFI              GPL   isolinux  Packages  RPM-GPG-KEY-CentOS-7  TRANS.TBL
```

弹出光驱

```bash
eject
```

## 2.6 磁盘常用工具

**df：文件系统空间实际正真占用等信息的查看工具df**

```bash
常用选项
-h 已可便于查看大小的单位显示
-i inode 使用情况
-T 文件系统类型
-P 以Posix兼容的格式输出
```

**du：查看某目录总体空间实际占用状态**

```
常用选项
-h 已可便于查看大小的单位显示
-s 只显示当前文件或目录
--max-depth=# 指定最大目录层级
-x 忽略不在同一个文件系统的目录
```

**dd：命令**

```
dd可从标准输入或文件中读取数据，根据指定的格式来转换数据，再输出到文件、设备或标准输出。
dd if=/dev/zero of=/opt/test bs=1M count=1024 seek=1024
if=文件名：输入文件名，默认为标准输入。即指定源文件。
of=文件名：输出文件名，默认为标准输出。即指定目的文件。
ibs= 一次读size个byte
obs= 一次写size个byte
bs=同时设置读入/输出的块大小为bytes个字节。
count=复制n个bs
seek= 从开头忽略blocks个obs大小的块
skip= 从开头忽略blocks个ibs大小的块
```

范例：

```
[22:23:14 root@localhost ~]#cat f1.txt
abcdef
[22:23:19 root@localhost ~]#cat f2.txt
123456789
[22:23:22 root@localhost ~]#dd if=f1.txt of=f2.txt bs=1 count=2 skip=4 seek=5
2+0 records in
2+0 records out
2 bytes (2 B) copied, 0.000512753 s, 3.9 kB/s
[22:24:56 root@localhost ~]#cat f2.txt
12345ef
```

# 三、RAID

## 3.1 什么是RAID

"RAID"一词是由David Patterson, Garth A. Gibson, Randy Katz 于1987年在加州大学伯克利分校发明的。在1988年6月SIGMOD会议上提交的论文"A Case for Redundant Arrays of Inexpensive Disks”"中提出，当时性能最好的大型机不断增长的个人电脑市场开发的一系列廉价驱动器的性能所击败。尽管故  障与驱动器数量的比例会上升，但通过配置冗余，阵列的可靠性可能远远超过任何大型单个驱动器的可靠性

独立硬盘冗余阵列（RAID, Redundant Array of Independent Disks），旧称廉价磁盘冗余阵列（Redundant Array of Inexpensive Disks），简称磁盘阵列。利用虚拟化存储技术把多个硬盘组合起来，成为一个或多个硬盘阵列组，目的为提升性能或数据冗余，或是两者同时提升。

RAID 层级不同，数据会以多种模式分散于各个硬盘，RAID 层级的命名会以 RAID 开头并带数字，例 如：RAID 0、RAID 1、RAID 5、RAID 6、RAID 7、RAID 01、RAID 10、RAID 50、RAID 60。每种等级都有其理论上的优缺点，不同的等级在两个目标间获取平衡，分别是增加数据可靠性以及增加存储器（群）读写性能。

简单来说，RAID把多个硬盘组合成为一个逻辑硬盘，因此，操作系统只会把它当作一个实体硬盘。 RAID常被用在服务器电脑上，并且常使用完全相同的硬盘作为组合。由于硬盘价格的不断下降与RAID 功能更加有效地与主板集成，它也成为普通用户的一个选择，特别是需要大容量存储空间的工作，如：  视频与音频制作。

**RAID功能实现**

* 提高IO能力,磁盘并行读写
* 提高耐用性,磁盘冗余算法来实现

**RAID实现的方式**

* 外接式磁盘阵列：通过扩展卡提供适配能力
* 内接式RAID：主板集成RAID控制器，安装OS前在BIOS里配置
* 软件RAID：通过OS实现，比如：群晖的NAS

## 3.2 RAID级别

级别：多块磁盘组织在一起的工作方式有所不同

常用RAID

* RAID-0：条带卷，strip
* RAID-1：镜像卷，mirror
* RAID-5
* RAID-6
* RAID-10
* RAID-50
* RAID-60

### 3.2.1 RAID-0

以 chunk 单位,读写数据,因为读写时都可以并行处理，所以在所有的级别中，RAID 0的速度是最快的。但是RAID 0既没有冗余功能，也不具备容错能力，如果一个磁盘（物理）损坏，所有数据都会丢失

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-09f6f42e.png)

* 读、写性能提升
* 可用空间：N*min(S1,S2,...)
* 无容错能力
* 最少磁盘数：1+

### 3.2.1 RAID-1

两组以上的N个磁盘相互作镜像，在一些多线程操作系统中能有很好的读取速度，理论上读取速度等于  硬盘数量的倍数，与RAID 0相同。另外写入速度有微小的降低。
![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-81771a3d.png)

* 读性能提升、写性能略有下降
* 可用空间：1*min(S1,S2,...)
* 有冗余能力
* 最少磁盘数：2+

### 3.2.3 RAID-5

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-b9e67d42.png)

* 读、写性能提升
* 可用空间：(N-1)*min(S1,S2,...)
* 有容错能力：允许最多1块磁盘损坏
* 最少磁盘数：3, 3+

### 3.2.4 RAID-6

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-2ec5d4c9.png)

* 读、写性能提升
* 可用空间：(N-2)*min(S1,S2,...)
* 有容错能力：允许最多2块磁盘损坏
* 最少磁盘数：4, 4+

### 3.2.5 RAID-10

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-730543cb.png)

* 读、写性能提升
* 可用空间：N*min(S1,S2,...)/2
* 有容错能力：每组镜像最多只能坏一块
* 最少磁盘数：4, 4+

### 3.2.6 RAID-50

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-b9374243.png)
多块磁盘先实现RAID5,再组合成RAID0

### 3.2.7 RAID-60

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-4ca3cfda.png)

### 3.2.9 其他级别

JBOD：Just a Bunch Of Disks

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-4eb4eac0.png)

* 功能：将多块磁盘的空间合并一个大的连续空间使用
* 可用空间：sum(S1,S2,...)

## 3.3 实现软RAID

mdadm工具：为软RAID提供管理界面，为空余磁盘添加冗余，结合内核中的md(multi devices)

RAID设备可命名为/dev/md0、/dev/md1、/dev/md2、/dev/md3等

实际环境中基本不用软RAID。

# 四、逻辑卷管理器（LVM）

## 4.1 LVM介绍

LVM：logical Volume Manager 可以允许对卷进行方便操作的抽象层，包括重新设定文件系统的大小，允许在多个物理设备间重新组织文件系统。

LVM可以弹性的更改LVM的容量

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-34340269.png)

通过交换PE来进行资料的转换，将原来LV内的PE转移到其他设备中以降低LV的容量，或将其他设备中的PE加到LV中以加大容量

**实现过程**

* 将设备指定为物理卷
* 用一个或者多个物理卷来创建一个卷组，物理卷是用固定大小的物理区域（Physical 				        Extent,PE）来定义的
* 在物理卷上创建逻辑卷，是由物理区域（PE）组成
* 可以在逻辑卷上创建文件系统并挂载

![clipboard.png](https://b3logfile.com/file/2020/11/clipboard-e68a77aa.png)

第一个逻辑卷对应设备名称：/dev/dm-#

dm:device mapper,将一个或多个底层块设备组织成一个逻辑设备的模块

## 4.2 实现逻辑卷

相关工具来自于lvm2包

```bash
yum insyall -y lvm2
```

### 4.2.1 pv管理工具

主要作用为把设备指定为物理卷

**显示pv信息**

```bash
pvs        简要显示pv信息
pvdisplay  详细显示
```

**创建pv**

```bash
pvcreate /dev/DEVICE    后面可以跟多个
```

范例：

```bash
[16:29:40 root@centos8 ~]#pvcreate /dev/sdb*
Device /dev/sdb excluded by a filter.
Device /dev/sdb4 excluded by a filter.
Physical volume "/dev/sdb1" successfully created.
Physical volume "/dev/sdb2" successfully created.
Physical volume "/dev/sdb3" successfully created.
Physical volume "/dev/sdb5" successfully created.
[16:30:57 root@centos8 ~]#pvs
PV         VG Fmt  Attr PSize  PFree
/dev/sdb1     lvm2 ---   5.00g  5.00g
/dev/sdb2     lvm2 ---   5.00g  5.00g
/dev/sdb3     lvm2 ---   5.00g  5.00g
/dev/sdb5     lvm2 ---  <5.00g <5.00g
```

遇到的报错信息
![clipboard.png](https://b3logfile.com/file/2020/11/clipboard-1da2c007.png)

遇到这种可能是硬盘中有残留的分区信息导致自动略过此硬盘，确认无数据后可以使用fdisk修改硬盘文件格式或者使用mkfs进行格式话一次就好了

**删除pv**

```bash
pvremove /dev/DEVICE    删除的前提是没有卷组在使用的物理卷如果使用请先在卷组移除此物理卷
```

范例：

```bash
[16:31:14 root@centos8 ~]#pvremove /dev/sdb5
Labels on physical volume "/dev/sdb5" successfully wiped.
[16:32:53 root@centos8 ~]#pvs
PV         VG Fmt  Attr PSize PFree
/dev/sdb1     lvm2 ---  5.00g 5.00g
/dev/sdb2     lvm2 ---  5.00g 5.00g
/dev/sdb3     lvm2 ---  5.00g 5.00g
```

**管理pv**

```bash
pvmove /dev/DEVICE     把所选物理卷中使用的PE移动到同卷组的物理卷中一般在移除物理卷之前使用
```

### 4.2.2 vg管理工具

主要的作用吧物理卷创建为卷组。

**显示卷组**

```bash
vgs       简要vg信息
vgdisplay 详细vg信息
```

**创建卷组**

```bash
vgcreate  -s 1M vgname  pvname
-s 指定PE大小，不写默认为4M
```

范例：

```bash
[16:32:58 root@centos8 ~]#vgcreate mysql /dev/sdb1 /dev/sdb2
Volume group "mysql" successfully created
[16:35:08 root@centos8 ~]#vgs
VG    #PV #LV #SN Attr   VSize VFree
mysql   2   0   0 wz--n- 9.99g 9.99g
```

**管理卷组**

```bash
vgextend     给已有卷组添加物理卷
vgreduce     移除卷组中的物理卷，必须是未使用的如果使用先用pvmove先移动使用的PE
范例：
vgextend vg0 /dev/sdd     参数为卷组名  物理卷名
vgreduce vg0 /dev/sdd
```

范例：

```bash
1.添加物理卷到卷组
[16:35:39 root@centos8 ~]#vgextend mysql /dev/sdb3
Volume group "mysql" successfully extended
[16:37:11 root@centos8 ~]#vgs
VG    #PV #LV #SN Attr   VSize   VFree
mysql   3   0   0 wz--n- <14.99g <14.99g
2.移除卷组中的物理卷，前提是没有逻辑卷在使用这个卷组中的物理卷可以直接移除
[16:37:16 root@centos8 ~]#vgreduce mysql /dev/sdb3
Removed "/dev/sdb3" from volume group "mysql"
[16:38:08 root@centos8 ~]#vgs
VG    #PV #LV #SN Attr   VSize VFree
mysql   2   0   0 wz--n- 9.99g 9.99g
```

**删除卷组**

```bash
gvremove               删除卷组时这个卷组必须是无任何逻辑卷在使用
范例：
[03:14:44 root@localhost ~]#vgremove vg0
Volume group "vg0" successfully removed
```

### 4.2.3 lv管理工具

**显示逻辑卷**

```bash
lvs
lvdisplay
```

**创建逻辑卷**

```bash
lvcreate -L #[mMgGtT] -n NAME vgname
范例：
lvcreate -L 5G -n mysql vg0   创建一个大小5G的lv
lvcreate -l 50%FREE -n nginx vg0 创建一个占用空闲大小百分之50的lv
```

范例：

```bash
[16:40:17 root@centos8 ~]#lvcreate -L 3G -n zhang mysql
Logical volume "zhang" created.
[16:41:34 root@centos8 ~]#lvs
LV    VG    Attr       LSize Pool Origin Data%  Meta%  Move Log Cpy%Sync Convert
zhang mysql -wi-a----- 3.00g

[16:42:01 root@centos8 ~]#vgs
VG    #PV #LV #SN Attr   VSize VFree
mysql   2   1   0 wz--n- 9.99g 6.99g
[16:42:05 root@centos8 ~]#lvcreate -l 50%FREE -n nginx mysql
[16:42:42 root@centos8 ~]#lvs
LV    VG    Attr       LSize  Pool Origin Data%  Meta%  Move Log Cpy%Sync Convert
nginx mysql -wi-a----- <3.50g
zhang mysql -wi-a-----  3.00g
```

**删除逻辑卷**

```bash
lvremove /dev/VG_NAME/LV_NAME     逻辑卷必须是未挂载使用的才可以直接删除
```

范例：

```bash
[16:42:48 root@centos8 ~]#lvremove /dev/mysql/nginx
Do you really want to remove active logical volume mysql/nginx? [y/n]: y
Logical volume "nginx" successfully removed
```

### 4.2.4 扩展和缩减逻辑卷

**扩展**

```bash
lvresize -r -l +100%FREE /dev/VG_NAME/LV_NAME
-r 扩展时依据之前lv的文件系统格式格式化新扩容的空间

如果不加的话新添加的空间是用不了的，需使用其他方式格式化
针对ext
resize2fs /dev/VG_NAME/LN_NAME
针对xfs
xfs_growfs 挂载目录名称
```

范例：

```bash
注意：如果逻辑卷没有进行格式化加-r选项是会报错的
[16:48:42 root@centos8 ~]#lvresize -r -l +10%FREE /dev/mysql/zhang
[16:49:24 root@centos8 ~]#lvs
LV    VG    Attr       LSize  Pool Origin Data%  Meta%  Move Log Cpy%Sync Convert
zhang mysql -wi-a----- <3.70g

[16:49:30 root@centos8 ~]#lvresize -r -L +1.3G /dev/mysql/zhang
[16:49:59 root@centos8 ~]#lvs
LV    VG    Attr       LSize Pool Origin Data%  Meta%  Move Log Cpy%Sync Convert
zhang mysql -wi-a----- 5.00g
```

**缩减**

```bash
注意：缩减有数据损坏的风险，建议先备份在缩减，xfs文件系统不在支持缩减。

umount /dev/VG_NAME/LV-NAME
e2fsck -f /dev/VG_NAME/LV-NAME
resize2fs /dev/VG_NAME/LV-NAME #[mMgGtT]
lvreduce -L [-]#[mMgGtT] /dev/VG_NAME/LV-NAME
```

**范例：少用**

```bash
umount /opt/
e2fsck -f /dev/vg0/mysql
resize2fs /dev/vg0/mysql 1G
lvreduce -L 1G /dev/vg0/mysql
mount /dev/vg0/mysql /opt/
```

### 4.2.6 拆除指定pv

```bash
pvmove /dev/DEVICE
vgreduce VG_NAME /dev/DEVICE
pvmove /dev/DEVICE
```

### 4.2.5 跨主机迁移卷组

源计算机上

1.在旧系统中，umount所有卷组上的逻辑卷

2.禁用卷组

```bash
vgchange -a n vg0
```

3.导出卷组

```bash
vgexport vg0
pvscan
vgdisplay
```

4.拆下旧硬盘在目标计算机上，并导入卷组：

```bash
vgimport vg0
```

5.启用

```bash
vgchange -a y vg0
```

6.mount 所有卷组上的逻辑卷

## 4.3 逻辑卷快照

### 4.3.1 逻辑卷快照原理

![clipboard.png](https://b3logfile.com/file/2020/12/clipboard-7e999b0f.png)

逻辑卷快照工作原理

* 在生成快照时会分配给它一定的空间，但只有在原来的逻辑卷或者快照有所改变才会使用这些空间
* 当原来的逻辑卷中有所改变时，会将旧的数据复制到快照中
* 快照中只含有原来的逻辑卷中更改的数据或者自生成快照后的快照中更改的数据

由于快照区与原本的LV共用很多PE的区块，因此快照与被快照的LV必须在同一个VG中.系统恢复的时候的文件数量不能高于快照区的实际容量

快照特点：

* 备份速度快，瞬间完
* 应用场景是测试环境，不能完成代替备份
* 快照后，逻辑卷的修改速度会一定有影响

### 4.3.2 实现逻辑卷快照

范例：

```bash
#为现有逻辑卷创建快照
lvcreate -n nginx-snapshot -s -L 1G /dev/vg0/nginx
-n命名
-s 创建快照
-p 指定读写权限 r只读

#挂载快照
mkdir - /mnt/data
mount -o nouuid /dev/vg0/nginx-snapshot /mnt/snap
-o 挂载选项

#恢复快照
umount 先卸载快照和原本的逻辑卷
lvconvert --merge /dev/vg0/data-snapshot    这里使用快照名称
恢复完成后快照自动删除。
```

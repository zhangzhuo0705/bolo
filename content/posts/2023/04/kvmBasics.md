---
title: "KVM基础使用"
date: 2023-04-26T15:17:27+08:00
draft: false
description: "覆盖 KVM 的安装与网络配置，演示 NAT 和桥接模式下的虚拟机使用。"
cover: "https://b3logfile.com/bing/20221212.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["应用服务"]
tags: ["KVM"]
toc: true
---
# 一、KVM的部署

## 1.1 Centos系统

需要提前配置好yum源，如果没有配置配置方式如下：

```bash
$ cat centos.repo 
[centos7]
name=centos7
baseurl=https://mirrors.tuna.tsinghua.edu.cn/centos/7/os/x86_64/
gpgcheck=0
```

部署KVM工具包

```bash
yum install -y qemu-kvm  qemu-kvm-tools libvirt libvirt-client virt-manager virt-install
```

启动服务

```bash
systemctl start libvirtd
systemctl enable libvirtd
```

验证是否生成nat网卡virbr0

```bash
[13:57:12 root@centos7 ~]#ip a
4: virbr0: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500 qdisc noqueue state DOWN group default qlen 1000
    link/ether 52:54:00:ab:b7:97 brd ff:ff:ff:ff:ff:ff
    inet 192.168.122.1/24 brd 192.168.122.255 scope global virbr0
       valid_lft forever preferred_lft forever
```

## 1.2 Ubuntu系统

无需配置apt源，官方源即可直接安装

```bash
sudo apt install qemu-kvm libvirt-daemon-system libvirt-clients bridge-utils virtinst virt-manager
```

如果想要你的用户可以创建与管理虚拟机需要添加你的用户到"libvirt"与"kvm"组。主要用来使用virsh命令。

```bash
usermod -aG libvirt kvm-user
usermod -aG kvm kvm-user
#添加完成验证
id kvm-user
#退出登录验证命令
virsh list --all
```

# 二、KVM的网络配置

## 2.1 NAT网卡使用说明

默认情况下安装KVM后会生成一个`virbr0`的默认网卡，此网卡的工作方式为nat模式即内部虚拟机可以访问外部网络，外部主机无法访问内部虚拟机。默认IP一般为`192.168.122.1/24`。并为连接上的其他网卡提供DHCP服务。

virbr0使用dnsmasq提供DHCP服务，在宿主机中可以查看到该进程。

```bash
ps -elf|grep dnsmasq
```

默认网桥IP是可修改的。

```bash
cat /etc/libvirt/qemu/networks/default.xml
<!--
WARNING: THIS IS AN AUTO-GENERATED FILE. CHANGES TO IT ARE LIKELY TO BE
OVERWRITTEN AND LOST. Changes to this xml configuration should be made using:
  virsh net-edit default
or other application using the libvirt API.
-->

<network>
  <name>default</name>        #网络名称
  <uuid>cf281ad9-0f63-4d6c-8d83-aaa7ce4c6755</uuid>
  <forward mode='nat'/>       #类型nat
  <bridge name='virbr0' stp='on' delay='0'/>  #网卡名称以及配置
  <mac address='52:54:00:c7:0c:17'/>          #mac地址
  <ip address='192.168.122.1' netmask='255.255.255.0'>  #网卡地址
    <dhcp>
      <range start='192.168.122.2' end='192.168.122.254'/>  #dhcp配置
    </dhcp>
  </ip>
</network>
```

修改默认网络IP信息

```bash
#修改网卡配置文件
cat /etc/libvirt/qemu/networks/default.xml
<!--
WARNING: THIS IS AN AUTO-GENERATED FILE. CHANGES TO IT ARE LIKELY TO BE
OVERWRITTEN AND LOST. Changes to this xml configuration should be made using:
  virsh net-edit default
or other application using the libvirt API.
-->

<network>
  <name>default</name>
  <uuid>cf281ad9-0f63-4d6c-8d83-aaa7ce4c6755</uuid>
  <forward mode='nat'/>
  <bridge name='virbr0' stp='on' delay='0'/>
  <mac address='52:54:00:c7:0c:17'/>
  <ip address='192.168.10.1' netmask='255.255.255.0'>
    <dhcp>
      <range start='192.168.10.100' end='192.168.10.200'/>
    </dhcp>
  </ip>
</network>
#重新定义default网络
virsh net-define  /etc/libvirt/qemu/networks/default.xml
#停用default网络
virsh net-destroy default
#重新启动default网络
virsh net-start default
```

相关命令

- virsh net-list                #查看网络状态
- virsh net-destroy default     #停用default网络，重启libvirtd服务后会恢复
- virsh net-undefine default    #彻底删除，重启系统后也不会恢复
- virsh net-define /etc/libvirt/qemu/networks/default.xml   #从一个default.xml文件定义(但不开始)一个网络
- virsh net-start default         #开始一个(以前定义的default)不活跃的网络,执行后ifconfig可见virbr0
- virsh net-autostart default     #执行后Autostart外会变成yes
- virsh domiflist centos-stream8     #查看网络对应状态
- brctl show　　　　　　　　　　　　　#查看虚拟网卡与宿主网桥对应情况

## 2.2 配置桥接网卡

### 1.Centos

```bash
#进入网卡配置目录
/etc/sysconfig/network-scripts
#创建br0网卡
[13:59:52 root@centos7 network-scripts]#cat ifcfg-br0 
TYPE=Bridge
BOOTPROTO=static
NAME=br0
DEVICE=br0
ONBOOT=yes
IPADDR=192.168.10.71
NETMASK=255.255.255.0
GATEWAY=192.168.10.2
DNS1=114.114.114.114
#修改物理网卡对接到桥接网卡
[14:00:30 root@centos7 network-scripts]#cat ifcfg-eth0 
TYPE="Ethernet"
BOOTPROTO="none"
NAME="eth0"
DEVICE="eth0"
ONBOOT="yes"
BRIDGE=br0
#重启网卡
nmcli con reload
nmcli con up eth0
nmcli con up br0
```

### 2.Ubuntu

```bash
#cat /etc/netplan/01-netcfg.yaml
network:
  ethernets:
    eth0:
  bridges:
    br0:
      addresses:
      - 192.168.10.101/24
      nameservers:
        addresses:
        - 114.114.114.114
      routes:
      - to: default
        via: 192.168.10.2
      interfaces:
      - eth0
  version: 2
```

# 三、KVM存储使用

## 3.1 KVM存储池

本质就是一个目录存放磁盘镜像文件存储池，可以创建很多默认存储池的名字是：default

```bash
#查看所有存储池
virsh pool-list --all
 Name                 State      Autostart
-------------------------------------------
 default              active     yes
```

**存储池管理命令**

```
Storage Pool (help keyword 'pool')
    pool-autostart                自动启用存储池
    pool-build                    构建存储池
    pool-create-as                创建存储池
    pool-define-as                定义存储池
    pool-delete                   删除存储池
    pool-destroy                  停止存储池
    pool-dumpxml                  以XML导出存储池信息
    pool-info                     查看存储池详细信息
    pool-list                     查看存储池列表
    pool-refresh                  刷新一个池
    pool-start                    启动池
    pool-undefine                 取消定义不活动的池
```

### 1.创建存储池

**创建基于目录存储池**

```bash
#创建数据目录
mkdir /data1/img/ -p

#定义存储池
virsh pool-define-as img --type dir --target /data1/img/
#构建池
virsh pool-build img
#设置池自动启动
virsh pool-autostart img
#启用池
virsh pool-start img
#验证
[14:57:31 root@centos7 ~]#virsh pool-list --all
 Name                 State      Autostart
-------------------------------------------
 default              active     yes
 img                  active     yes
```

**创建基于分区的池**

```bash
#格式化磁盘
mkfs.xfs /dev/sdb
#定义池
virsh pool-define-as fs --type fs  --source-dev "/dev//sdb" --target "/fs"
#创建挂载点
mkdir /fs
#启动池
virsh pool-start fs
#设置池自启动
virsh pool-autostart fs
```

**创建基于LVM存储池**

```bash
#创建卷组
pvcreate /dev/sdc
vgcreate test /dev/sdc
#创建池，存储池名称也是vg的名称
virsh pool-define-as test --type logical --target /dev/test
#启动池
virsh pool-start test
```

### 2.存储池管理

**删除存储池**

```bash
virsh pool-destroy fs  #停止存储池
virsh pool-delete fs   #如果需要清除磁盘数据执行不清楚不要执行
virsh pool-undefine fs #取消定义
```

**存储池详细信息**

```bash
#查看存储池详细信息
virsh pool-info test
#刷新存储池，一般在存储池有变化后刷新比如扩容
virsh pool-refresh test
```

## 3.2 卷管理

命令说明

```
Storage Volume (help keyword 'volume')
    vol-clone                      克隆一个卷
    vol-create-as                  从一组参数中创建一个卷
    vol-delete                     删除一个卷
    vol-download                   将卷内容下载到文件中
    vol-info                       卷详细信息
    vol-list                       查看卷列表
    vol-resize                     调整一个卷
    vol-upload                     upload file contents to a volume
    vol-wipe                       wipe a vol
```

示例

```bash
#创建卷
virsh vol-create-as --pool test centos7-1.qcow2 10G --format qcow2
#查看卷
virsh vol-info --pool test --vol centos7-1.qcow2
#查看卷列表
virsh vol-list --pool test
#克隆卷
virsh vol-clone --pool test --vol centos7-1.qcow2 --newname clone.qcow2
#删除卷
virsh vol-delete --pool test --vol clone.qcow2
```

## 3.3 qemu-img

qemu-img是一个功能强大磁盘镜像管理工具。

**相关命令如下：**

- qemu-img create：创建虚拟磁盘
- qume-img info：查看虚拟磁盘详细信息
- qume-img resize：扩容虚拟磁盘
- qemu-img check：测试虚拟磁盘
- qemu-img convert：用于虚拟磁盘格式转换，可进行虚拟磁盘压缩

示例：

```bash
#创建虚拟磁盘
qemu-img create ceshi.qcow2 -f qcow2 1G
#查看虚拟磁盘详细信息
qemu-img info ceshi.qcow2
#扩容虚拟磁盘
qemu-img resize ceshi.qcow2 100G  #扩容到100G
qemu-img resize ceshi.qcow2 +1G   #增加1G
#虚拟磁盘压缩
qemu-img convert -c -O qcow2 centos7.4_base.qcow2 centos7.4_base.qcow2.new
```

# 四、KVM虚拟机创建与管理

## 4.1 虚拟机管理

**相关命令**：

- virsh list：查看虚拟机
  - --all：查看所有
- virsh destroy：强制关闭虚拟机
- virsh shutdown：请求关闭虚拟机
- virsh reboot：重启虚拟机
- virsh start：启动虚拟机
- virsh suspend：暂停虚拟机
- virsh resume：恢复虚拟机
- virsh autostart：设置虚拟机为自动启动
- virsh edit：编辑虚拟机配置文件
- virsh undefine：删除虚拟机
  - --remove-all-storage：删除所有存储卷

### 1.创建虚拟机

注意如果宿主机不支持`vmx/svm`指令集，请在创建虚拟机时指定`--virt-type qemu`,验证方式`egrep -c '(vmx|svm)' /proc/cpuinfo`如果结果为0表示不支持，且需要加载kvm与kvm_intel内核模块`lsmod | grep kvm`。

**相关命令参数介绍：**

- --virt-type：虚拟机使用虚拟化类型kvm或者qemu，kvm需要cpu指令集
- --name：虚拟机名称
- --ram：内存大小默认单位M
- --vcpus：虚拟cpu个数
- --disk：指定虚拟磁盘，可以指定多个
  
  - cache：缓存模型
    - writethrough：直写模式直接写入磁盘里，不使用缓存
    - writeback：回写模式在数据更新时只写入缓存Cache。只在数据被替换出缓存时，被修改的缓存数据才会被写到后端存储。
    - none：相当于虚拟机能直接访问宿主机的磁盘
- --cdrom：指定虚拟机关盘挂载，可选
- --network：指定虚拟机网卡配置，可以指定多个
  
  - bridge：桥接类型网卡
    - model：虚拟网卡类型分别有virtio，
- --graphics：定义虚拟机显示功能相关的配置，如VNC相关配置，--nographics不配置
  
  - vnc配置：`vnc,password=Centos7,port=5910,listen=0.0.0.0`
- --noautoconsole：禁止自动连接至虚拟机的控制台
- --noreboot：虚拟机创建完成后禁止自动重启
- --os-variant：指定虚拟机操作系统类型
- --boot：指定虚拟机创建完成后引导设备次序
  
  - cdrom：镜像
  - hd：磁盘
- --import：如果虚拟磁盘存在操作系统无需引导创建需要使用此选项

示例如下：

```bash
#创建虚拟机且配置vnc,注意创建完成后可使用vnc连接
virt-install \
--virt-type qemu  \
--name centos1 \
--ram 1024 \
--vcpus 2 \
--os-variant centos7.0 \
--disk  /data1/pool/centos1_base.qcow2,cache=writeback \
--network bridge=virbr0,model=virtio \
--graphics vnc,password=Centos7,port=5910,listen=0.0.0.0 \
--noautoconsole \
--import 

#使用ios镜像引导虚拟机
virt-install \
--virt-type qemu  \
--name centos2 \
--ram 1024 \
--vcpus 2 \
--os-variant centos7.0 \
--disk  /data1/pool/centos1_base.qcow2 \
--cdrom /data1/centos.ios \
--network bridge=virbr0,model=virtio \
--graphics vnc,password=Centos7,port=5910,listen=0.0.0.0 \
--noautoconsole
```

## 4.2 KVM快照

**相关命令如下**

- virsh snapshot-create-as：创建快照
- virsh snapshot-list：查看快照
- virsh snapshot-info：查看快照详细信息
- virsh snapshot-revert：还原虚拟机快照
- virsh snapshot-delet：删除虚拟机快照

示例

```bash
#创建虚拟机快照
virsh snapshot-create-as --domain centos1 --name centos_snap --description "snap"
#查看虚拟机快照
virsh snapshot-list --domain centos1 
#查看快照详细信息
virsh snapshot-info --domain centos1 --snapshotname centos_snap
qemu-img info /data1/pool/centos1_base.qcow2
#还原快照
virsh snapshot-revert --domain centos1 --snapshotname centos_snap
#删除快照
virsh snapshot-delete --domain centos1 --snapshotname centos_snap
```

# 五、KVM高级工具

## 5.1 virt-customize

**virt-customize**命令行工具可用于自定义虚拟磁盘。要使用virt-customize虚拟磁盘必须离线，如果需要保留之前的镜像可以先进行克隆操作。需要安装`libguestfs-tools`软件包

重置root密码

```bash
virt-customize -a /data1/kvm/centos.qcow2 --root-password password:123456
```

重置其他用户密码

```bash
virt-customize -a /data1/kvm/centos.qcow2 --password centos:password:123456
```

修改时区

```bash
virt-customize -a /data1/kvm/centos.qcow2 --timezone "Asia/Shanghai"
```

安装软件包

```
virt-customize -a /data1/kvm/centos.qcow2 --install vim
```

## 5.2 virt-copy-in

拷贝主机文件到虚拟机系统

```bash
virt-copy-in -d centos1 /etc/fstab /tmp
```

## 5.3 virt-copy-out

拷贝虚拟机中文件到本机

```bash
virt-copy-out -d centos1 /etc/fstab .
```

## 5.4 virt-df

查看虚拟机分区信息

```bash
virt-df -h centos1
```

## 5.5 virt-cat

查看虚拟机中文件内容

```bash
virt-cat centos1 /etc/fstab
```

## 5.6 guestmount

挂载虚拟磁盘到本机

```bash
mkdir /opt/1
guestmount -a centos1_base.qcow2 -m /dev/centos/root /opt/1/
#卸载
umount /opt/1
```

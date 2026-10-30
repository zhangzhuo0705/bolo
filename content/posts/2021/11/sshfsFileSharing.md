---
title: "sshfs文件共享工具"
date: 2021-11-23T16:41:01+08:00
draft: false
description: "说明如何用 sshfs 将远程目录挂载到本地，实现轻量的临时文件共享。"
cover: "https://b3logfile.com/bing/20190402.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["Linux系统基础知识"]
tags: ["linux", "工具"]
toc: true
---
在需要简单的文件共享的环境中，可以快速的实现文件共享，使用完成后直接卸载即可，基于ssh实现数据传输。性能比较低不建议长期使用，适合在数据备份时临时挂载使用。

**sshfs安装**

SSHFS是基于Linux的软件，需要安装在本地计算机上。在基于Ubuntu和Debian的系统上，它可以通过apt-get安装。centos可以通过yum安装

```bash
yum install sshfs
```

**sshfs命令介绍**

```bash
[root@es-node3 sshfs]# sshfs -h
usage: sshfs [user@]host:[dir] mountpoint [options]
主要的参数:
    -o uid=N               设置文件挂载的uid，也就是映射到本地的文件uid
    -o gid=N               设置文件挂载的gid
    -o allow_other         允许其他用户访问
    -o port=PORT           ssh访问端口
```

**常见的使用方式**

```bash
#临时挂载
sshfs -o allow_other,uid=997,gid=996 root@192.168.6.3:/root/test1 /root/1/


#卸载
umount /root/1
```

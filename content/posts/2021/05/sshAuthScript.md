---
title: "SSH认证脚本"
date: 2021-05-17T11:42:21+08:00
lastmod: 2021-06-02T10:30:01+08:00
draft: false
description: "提供 SSH 密钥生成与批量分发脚本，用 sshpass 实现免密登录。"
cover: "https://b3logfile.com/bing/20201009.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["Shell脚本"]
tags: ["shell", "ssh"]
toc: true
---
```
#要认证的主机IP
IP="
192.168.10.182
"
#centos开启
#rpm -q sshpass &>/dev/null || yum -y install sshpass

#ubuntu开启
dpkg -L sshpass &>/dev/null || apt -y install sshpass
[ -f /root/.ssh/id_rsa ] || ssh-keygen -f /root/.ssh/id_rsa -P ''
#登录密码
export SSHPASS=123456
for HOST in $IP;do
     sshpass -e ssh-copy-id -o StrictHostKeyChecking=no $HOST
done
```

---
title: "kubernetes之二进制安装1.25.+版本"
date: 2022-01-09T16:34:01+08:00
lastmod: 2022-12-13T17:28:38+08:00
draft: false
description: "基于二进制包部署 Kubernetes 1.25，覆盖环境准备、组件启动和集群验证。"
cover: "https://b3logfile.com/bing/20190910.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["Kubernetes"]
tags: ["kubernetes"]
toc: true
---
# 一、基础环境准备

**集群规划信息：**

| 主机名称  | IP地址         | 说明              |
| --------- | -------------- | ----------------- |
| master01  | 192.168.10.11  | master节点        |
| master02  | 192.168.10.12  | master节点        |
| master03  | 192.168.10.13  | master节点        |
| node01    | 192.168.10.14  | node节点          |
| node02    | 192.168.10.15  | node节点          |
| master-lb | 127.0.0.1:6443 | nginx代理监听地址 |

**说明：**

- master节点为3台实现nginx进行代理master流量实现高可用，master也安装node组件。
- node节点为2台
- nginx在所有节点安装，监听127.0.0.1:6443端口
- 系统使用centos7.X

## 1.1 基础环境配置

### 1.所有节点配置hosts

```bash
cat >>/etc/hosts<<EOF
192.168.10.11 master01
192.168.10.12 master02
192.168.10.13 master03
192.168.10.14 node01
192.168.10.15 node02
EOF
```

### 2.所有节点关闭防火墙、selinux、dnsmasq、swap

```bash
#关闭防火墙
systemctl disable --now firewalld
#关闭dnsmasq
systemctl disable --now dnsmasq
#关闭postfix
systemctl  disable --now postfix
#关闭NetworkManager
systemctl disable --now NetworkManager
#关闭selinux
sed -ri 's/(^SELINUX=).*/\1disabled/' /etc/selinux/config
setenforce 0
#关闭swap
sed -ri 's@(^.*swap *swap.*0 0$)@#\1@' /etc/fstab
swapoff -a
```

### 3.配置时间同步

方法1：使用ntpdate

```bash
#安装ntpdate，需配置yum源
yum install ntpdate -y
#执行同步，可以使用自己的ntp服务器如果没有
ntpdate time2.aliyun.com
#写入定时任务
crontab -e
*/5 * * * * ntpdate time2.aliyun.com
```

方法2：使用chrony(推荐使用)

```bash
#安装chrony
yum install chrony -y
#在其中一台主机配置为时间服务器
cat /etc/chrony.conf
server time2.aliyun.com iburst   #从哪同步时间
driftfile /var/lib/chrony/drift
makestep 1.0 3
rtcsync
allow 192.168.0.0/16  #允许的ntp客户端网段
local stratum 10
logdir /var/log/chrony
#重启服务
systemctl restart chronyd
#配置其他节点从服务端获取时间进行同步
cat /etc/chrony.conf
server 192.168.10.51 iburst
#重启验证
systemctl restart chronyd
chronyc sources -v
^* master01                      3   6    17     5    -10us[ -109us] +/-   28ms  #这样表示正常
```

### 4.所有节点修改资源限制

```bash
cat > /etc/security/limits.conf <<EOF
*       soft        core        unlimited
*       hard        core        unlimited
*       soft        nproc       1000000
*       hard        nproc       1000000
*       soft        nofile      1000000
*       hard        nofile      1000000
*       soft        memlock     32000
*       hard        memlock     32000
*       soft        msgqueue    8192000
EOF
```

### 3.ssh认证

```bash
yum install -y sshpass
ssh-keygen -f /root/.ssh/id_rsa -P ''
export IP="192.168.10.11 192.168.10.12 192.168.10.13 192.168.10.14 192.168.10.15"
export SSHPASS=123456
for HOST in $IP;do
     sshpass -e ssh-copy-id -o StrictHostKeyChecking=no $HOST
done
```

### 5.升级系统以及内核

```bash
#升级系统
yum update -y --exclude=kernel*
#升级内核
rpm -ivh kernel-ml-6.1.0-1.el7.elrepo.x86_64.rpm
grub2-set-default 0
grub2-mkconfig -o /boot/grub2/grub.cfg
#修改内核参数
cat >/etc/sysctl.conf<<EOF
net.ipv4.tcp_keepalive_time=600
net.ipv4.tcp_keepalive_intvl=30
net.ipv4.tcp_keepalive_probes=10
net.ipv6.conf.all.disable_ipv6=1
net.ipv6.conf.default.disable_ipv6=1
net.ipv6.conf.lo.disable_ipv6=1
net.ipv4.neigh.default.gc_stale_time=120
net.ipv4.conf.all.rp_filter=0 # 默认为1，系统会严格校验数据包的反向路径，可能导致丢包
net.ipv4.conf.default.rp_filter=0
net.ipv4.conf.default.arp_announce=2
net.ipv4.conf.lo.arp_announce=2
net.ipv4.conf.all.arp_announce=2
net.ipv4.ip_local_port_range= 45001 65000
net.ipv4.ip_forward=1
net.ipv4.tcp_max_tw_buckets=6000
net.ipv4.tcp_syncookies=1
net.ipv4.tcp_synack_retries=2
net.bridge.bridge-nf-call-ip6tables=1
net.bridge.bridge-nf-call-iptables=1
net.netfilter.nf_conntrack_max=2310720
net.ipv6.neigh.default.gc_thresh1=8192
net.ipv6.neigh.default.gc_thresh2=32768
net.ipv6.neigh.default.gc_thresh3=65536
net.core.netdev_max_backlog=16384 # 每CPU网络设备积压队列长度
net.core.rmem_max = 16777216 # 所有协议类型读写的缓存区大小
net.core.wmem_max = 16777216
net.ipv4.tcp_max_syn_backlog = 8096 # 第一个积压队列长度
net.core.somaxconn = 32768 # 第二个积压队列长度
fs.inotify.max_user_instances=8192 # 表示每一个real user ID可创建的inotify instatnces的数量上限，默认128.
fs.inotify.max_user_watches=524288 # 同一用户同时可以添加的watch数目，默认8192。
fs.file-max=52706963
fs.nr_open=52706963
kernel.pid_max = 4194303
net.bridge.bridge-nf-call-arptables=1
vm.swappiness=0 # 禁止使用 swap 空间，只有当系统 OOM 时才允许使用它
vm.overcommit_memory=1 # 不检查物理内存是否够用
vm.panic_on_oom=0 # 开启 OOM
vm.max_map_count = 262144
EOF
#加载ipvs模块
cat >/etc/modules-load.d/ipvs.conf <<EOF
ip_vs
ip_vs_lc
ip_vs_wlc
ip_vs_rr
ip_vs_wrr
ip_vs_lblc
ip_vs_lblcr
ip_vs_dh
ip_vs_sh
ip_vs_nq
ip_vs_sed
ip_vs_ftp
ip_vs_sh
nf_conntrack
ip_tables
ip_set
xt_set
ipt_set
ipt_rpfilter
ipt_REJECT
EOF
systemctl enable --now systemd-modules-load.service
#重启
reboot
#重启服务器执行检查
lsmod | grep -e ip_vs -e nf_conntrack
```

### 6.安装基础软件

```bash
#安装基础软件
yum install curl conntrack ipvsadm ipset iptables jq sysstat libseccomp rsync wget jq psmisc vim net-tools telnet -y
```

### 7.优化journald日志

```bash
mkdir -p /var/log/journal
mkdir -p /etc/systemd/journald.conf.d
cat > /etc/systemd/journald.conf.d/99-prophet.conf <<EOF
[Journal]
# 持久化保存到磁盘
Storage=persistent
# 压缩历史日志
Compress=yes
SyncIntervalSec=5m
RateLimitInterval=30s
RateLimitBurst=1000
# 最大占用空间 10G
SystemMaxUse=1G
# 单日志文件最大 200M
SystemMaxFileSize=10M
# 日志保存时间 2 周
MaxRetentionSec=2week
# 不将日志转发到 syslog
ForwardToSyslog=no
EOF
systemctl restart systemd-journald && systemctl enable systemd-journald
```

## 1.2 准备软件包

### 1.下载kubernetes1.25.+的二进制包

github二进制包下载地址：https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.25.md#v1255

### 2.下载etcd相关二进制包

etcd服务二进制包下载地址：https://github.com/etcd-io/etcd/releases

### 3.docker-ce二进制包下载地址

二进制包下载地址：https://download.docker.com/linux/static/stable/x86_64/

cri-docker插件：https://github.com/Mirantis/cri-dockerd/releases

这里需要下载20.10.+版本

### 4.containerd二进制包下载

下载到cri的二进制包，如果超过1.5.5版本需要额外下载runc，官方在包中的runc采用动态链接centos7系统没有这些库会导致容器无法正常运行。

github下载地址：https://github.com/containerd/containerd/releases

runc下载地址：https://github.com/opencontainers/runc

### 5.下载cfssl二进制包

github二进制包下载地址：https://github.com/cloudflare/cfssl/releases

# 二、安装容器运行时

以下操作docker-ce与containerd选择一个安装即可，需要在所有运行kubelet的节点都需要安装，在kubernetes1.24版本之后如果使用docker-ce作为容器运行时，需要额外安装cri-docker。

## 2.1 二进制安装docker-ce

**安装docker-ce**

```bash
#解压
tar xf docker-20.10.15.tgz 
#拷贝二进制文件
cp docker/* /usr/bin/
#创建containerd的service文件,并且启动
cat >/etc/systemd/system/containerd.service <<EOF
[Unit]
Description=containerd container runtime
Documentation=https://containerd.io
After=network.target local-fs.target

[Service]
ExecStartPre=-/sbin/modprobe overlay
ExecStart=/usr/bin/containerd
Type=notify
Delegate=yes
KillMode=process
Restart=always
RestartSec=5
LimitNPROC=infinity
LimitCORE=infinity
LimitNOFILE=1048576
TasksMax=infinity
OOMScoreAdjust=-999

[Install]
WantedBy=multi-user.target
EOF
systemctl enable --now containerd.service
#准备docker的service文件
cat > /etc/systemd/system/docker.service <<EOF
[Unit]
Description=Docker Application Container Engine
Documentation=https://docs.docker.com
After=network-online.target firewalld.service containerd.service
Wants=network-online.target
Requires=docker.socket containerd.service

[Service]
Type=notify
ExecStart=/usr/bin/dockerd -H fd:// --containerd=/run/containerd/containerd.sock
ExecReload=/bin/kill -s HUP $MAINPID
TimeoutSec=0
RestartSec=2
Restart=always
StartLimitBurst=3
StartLimitInterval=60s
LimitNOFILE=infinity
LimitNPROC=infinity
LimitCORE=infinity
TasksMax=infinity
Delegate=yes
KillMode=process
OOMScoreAdjust=-500

[Install]
WantedBy=multi-user.target
EOF
#准备docker的socket文件
cat > /etc/systemd/system/docker.socket <<EOF
[Unit]
Description=Docker Socket for the API

[Socket]
ListenStream=/var/run/docker.sock
SocketMode=0660
SocketUser=root
SocketGroup=docker

[Install]
WantedBy=sockets.target
EOF
#创建docker组
groupadd docker
#启动docker
systemctl enable --now docker.socket  && systemctl enable --now docker.service
#验证
docker info
#创建docker配置文件
cat >/etc/docker/daemon.json <<EOF
{
   "insecure-registries": ["192.168.10.254:5000"],
   "exec-opts": ["native.cgroupdriver=systemd"]
}
EOF
systemctl restart docker
```

**安装cri-dokcer**

```bash
#解压安装包
tar xf cri-dockerd-0.2.3.amd64.tgz
#拷贝二进制文件
cp cri-dockerd/* /usr/bin/
#生成service文件
cat >/etc/systemd/system/cri-docker.socket<<EOF
[Unit]
Description=CRI Docker Socket for the API
PartOf=cri-docker.service

[Socket]
ListenStream=%t/cri-dockerd.sock
SocketMode=0660
SocketUser=root
SocketGroup=docker

[Install]
WantedBy=sockets.target
EOF
cat >/etc/systemd/system/cri-docker.service<<EOF
[Unit]
Description=CRI Interface for Docker Application Container Engine
Documentation=https://docs.mirantis.com
After=network-online.target firewalld.service docker.service
Wants=network-online.target
Requires=cri-docker.socket

[Service]
Type=notify
ExecStart=/usr/bin/cri-dockerd --container-runtime-endpoint fd:// --network-plugin=cni --pod-infra-container-image=192.168.10.254:5000/k8s/pause:3.7
ExecReload=/bin/kill -s HUP $MAINPID
TimeoutSec=0
RestartSec=2
Restart=always

# Note that StartLimit* options were moved from "Service" to "Unit" in systemd 229.
# Both the old, and new location are accepted by systemd 229 and up, so using the old location
# to make them work for either version of systemd.
StartLimitBurst=3

# Note that StartLimitInterval was renamed to StartLimitIntervalSec in systemd 230.
# Both the old, and new name are accepted by systemd 230 and up, so using the old name to make
# this option work for either version of systemd.
StartLimitInterval=60s

# Having non-zero Limit*s causes performance problems due to accounting overhead
# in the kernel. We recommend using cgroups to do container-local accounting.
LimitNOFILE=infinity
LimitNPROC=infinity
LimitCORE=infinity

# Comment TasksMax if your systemd version does not support it.
# Only systemd 226 and above support this option.
TasksMax=infinity
Delegate=yes
KillMode=process

[Install]
WantedBy=multi-user.target
EOF
#启动
systemctl enable --now cri-docker.socket
systemctl enable --now cri-docker
```

## 2.2 安装containerd

```bash
#解压
tar xf cri-containerd-cni-1.5.16-linux-amd64.tar.gz -C /
#创建服务启动文件
cat > /etc/systemd/system/containerd.service <<EOF
[Unit]
Description=containerd container runtime
Documentation=https://containerd.io
After=network.target local-fs.target

[Service]
ExecStartPre=-/sbin/modprobe overlay
ExecStart=/usr/local/bin/containerd
Type=notify
Delegate=yes
KillMode=process
Restart=always
RestartSec=5
LimitNPROC=infinity
LimitCORE=infinity
LimitNOFILE=infinity
TasksMax=infinity
OOMScoreAdjust=-999

[Install]
WantedBy=multi-user.target
EOF
#启动
systemctl enable --now  containerd.service
#创建配置文件
mkdir /etc/containerd
/usr/local/bin/containerd config default > /etc/containerd/config.toml
#修改配置
sed -ri 's@(sandbox_image = ").*(")@\1192.168.10.254:5000/k8s/pause:3.7\2@ ' /etc/containerd/config.toml
sed -ri '/registry.mirrors/a\\n[plugins."io.containerd.grpc.v1.cri".registry.mirrors."192.168.10.254:5000"]\nendpoint = ["http://192.168.10.254:5000"]' /etc/containerd/config.toml 
#重启
systemctl restart containerd
```

**超过1.5.5版本替换runc**

```bash
#赋予执行权限
chmod +x runc.amd64
#替换
cp -rf runc.amd64 /usr/local/sbin/runc
#验证
runc -v
```

**安装crictl客户端工具**

```bash
#解压
tar xf crictl-v1.22.0-linux-amd64.tar.gz -C /usr/bin/
#生成配置文件
cat > /etc/crictl.yaml <<EOF
runtime-endpoint: unix:///run/containerd/containerd.sock
EOF
#测试
crictl info
```

# 三、安装kube-apiserver代理

这里选用nginx做代理。

```bash
#解压
tar xf nginx.tar.gz -C /usr/bin/
#生成配置文件
mkdir /etc/nginx -p
mkdir /var/log/nginx -p
cat >/etc/nginx/nginx.conf<<EOF 
user root;
worker_processes 1;

error_log  /var/log/nginx/error.log warn;
pid /var/log/nginx/nginx.pid;

events {
    worker_connections  3000;
}

stream {
    upstream apiservers {
        server 192.168.10.11:6443  max_fails=2 fail_timeout=3s;
        server 192.168.10.12:6443  max_fails=2 fail_timeout=3s;
        server 192.168.10.13:6443  max_fails=2 fail_timeout=3s;
    }

    server {
        listen 127.0.0.1:6443;
        proxy_connect_timeout 1s;
        proxy_pass apiservers;
    }
}
EOF
#生成启动文件
cat >/etc/systemd/system/nginx.service <<EOF
[Unit]
Description=nginx proxy
After=network.target
After=network-online.target
Wants=network-online.target

[Service]
Type=forking
ExecStartPre=/usr/bin/nginx -c /etc/nginx/nginx.conf -p /etc/nginx -t
ExecStart=/usr/bin/nginx -c /etc/nginx/nginx.conf -p /etc/nginx
ExecReload=/usr/bin/nginx -c /etc/nginx/nginx.conf -p /etc/nginx -s reload
PrivateTmp=true
Restart=always
RestartSec=15
StartLimitInterval=0
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF
#启动
systemctl enable --now nginx.service
#验证
[17:35:57 root@node02 ~]#ss -ntl
State       Recv-Q Send-Q Local Address:Port               Peer Address:Port                             
LISTEN      0      511    127.0.0.1:6443                   *:*
```

# 四、生成kubernetes集群所需证书

只需要在其中一个节点操作即可

## 4.1 安装cfssl工具并生成证书目录

```bash
#解压
tar xf cfssl_1.6.0.tar.gz -C /usr/bin/
#生成证书存放目录
mkdir /opt/pki/{etcd,kubernetes} -p
#验证
ls /usr/bin/cfssl*
/usr/bin/cfssl  /usr/bin/cfssl-certinfo  /usr/bin/cfssljson
```

## 4.2 生成etcd证书

**生成etcd证书的ca机构**

```bash
mkdir /opt/pki/etcd/ -p
cd /opt/pki/etcd/
#创建etcd证书的ca
mkdir ca
#生成etcd证书ca配置文件与申请文件
cd ca/
#生成配置文件
cat > ca-config.json <<EOF
{
    "signing": {
         "default": {
             "expiry": "87600h"
        },
         "profiles": {
             "etcd": {
                 "expiry": "87600h",
                 "usages": [
                     "signing",
                     "key encipherment",
                     "server auth",
                     "client auth"
                 ]
             }
         }
     }
}
EOF
#生成申请文件
cat > ca-csr.json <<EOF
{
  "CA":{"expiry":"87600h"},
  "CN": "etcd-cluster",
  "key": {
    "algo": "rsa",
    "size": 2048
  },
  "names": [
    {
      "C": "CN",
      "TS": "Beijing",
      "L": "Beijing",
      "O": "etcd-cluster",
      "OU": "System"
    }
  ]
}
EOF
#生成ca证书
cfssl gencert -initca ca-csr.json | cfssljson -bare ca
```

**生成etcd服务端证书**

```bash
#生成etcd证书申请文件
cd /opt/pki/etcd/
cat > etcd-server-csr.json << EOF
{
  "CN": "etcd-server",
  "hosts": [
     "192.168.10.11",
     "192.168.10.12",
     "192.168.10.13",
     "127.0.0.1"
  ],
  "key": {
    "algo": "rsa",
    "size": 2048
  },
  "names": [
    {
      "C": "CN",
      "TS": "Beijing",
      "L": "Beijing",
      "O": "etcd-server",
      "OU": "System"
    }
  ]
}
EOF
#生成证书
cfssl gencert \
  -ca=ca/ca.pem \
  -ca-key=ca/ca-key.pem \
  -config=ca/ca-config.json \
  -profile=etcd \
  etcd-server-csr.json | cfssljson -bare etcd-server
```

**生成etcd客户端证书**

```bash
#生成etcd证书申请文件
cd /opt/pki/etcd/
cat > etcd-client-csr.json << EOF
{
  "CN": "etcd-client",
  "key": {
    "algo": "rsa",
    "size": 2048
  },
  "names": [
    {
      "C": "CN",
      "TS": "Beijing",
      "L": "Beijing",
      "O": "etcd-client",
      "OU": "System"
    }
  ]
}
EOF
#生成证书
cfssl gencert \
  -ca=ca/ca.pem \
  -ca-key=ca/ca-key.pem \
  -config=ca/ca-config.json \
  -profile=etcd \
  etcd-client-csr.json | cfssljson -bare etcd-client
```

**验证**

```bash
pwd
/opt/pki/etcd
#tree命令验证生成的文件
tree 
.
├── ca   #etcdca文件
│   ├── ca-config.json
│   ├── ca.csr
│   ├── ca-csr.json
│   ├── ca-key.pem
│   └── ca.pem
├── etcd-client.csr
├── etcd-client-csr.json
├── etcd-client-key.pem  #客户端私钥
├── etcd-client.pem      #客户端公钥
├── etcd-server.csr
├── etcd-server-csr.json
├── etcd-server-key.pem  #服务端私钥
└── etcd-server.pem      #服务端公钥
```

**拷贝证书到节点**

```bash
master="master01 master02 master03"
node="node01,node02"
for i in $master;do
  ssh $i "mkdir /etc/etcd/ssl -p"
  scp /opt/pki/etcd/ca/ca.pem /opt/pki/etcd/{etcd-server.pem,etcd-server-key.pem,etcd-client.pem,etcd-client-key.pem} $i:/etc/etcd/ssl/
done
```

## 4.3 创建kubernetes各组件证书

### 1.创建kubernetes的ca

```bash
#创建目录
mkdir /opt/pki/kubernetes/ -p
cd /opt/pki/kubernetes/
mkdir ca
cd ca
#创建ca配置文件与申请文件
cat > ca-config.json <<EOF
{
    "signing": {
         "default": {
             "expiry": "87600h"
        },
         "profiles": {
             "kubernetes": {
                 "expiry": "87600h",
                 "usages": [
                     "signing",
                     "key encipherment",
                     "server auth",
                     "client auth"
                 ]
             }
         }
     }
}
EOF
#生成申请文件
cat > ca-csr.json <<EOF
{
  "CA":{"expiry":"87600h"},
  "CN": "kubernetes",
  "key": {
    "algo": "rsa",
    "size": 2048
  },
  "names": [
    {
      "C": "CN",
      "TS": "Beijing",
      "L": "Beijing",
      "O": "kubernetes",
      "OU": "System"
    }
  ]
}
EOF
#生成ca证书
cfssl gencert -initca ca-csr.json | cfssljson -bare ca
```

### 2.创建kube-apiserver证书

```bash
#创建目录
mkdir /opt/pki/kubernetes/kube-apiserver -p
cd /opt/pki/kubernetes/kube-apiserver
#生成证书申请文件
cat > kube-apiserver-csr.json <<EOF
{
  "CN": "kube-apiserver",
  "hosts": [
    "127.0.0.1",
    "192.168.10.11",
    "192.168.10.12",
    "192.168.10.13",
    "10.200.0.1",
    "kubernetes",
    "kubernetes.default",
    "kubernetes.default.svc",
    "kubernetes.default.svc.cluster",
    "kubernetes.default.svc.cluster.local"
   ],
  "key": {
    "algo": "rsa",
    "size": 2048
  },
  "names": [
    {
      "C": "CN",
      "TS": "Beijing",
      "L": "Beijing",
      "O": "kube-apiserver",
      "OU": "System"
    }
  ]
}
EOF
#生成证书
cfssl gencert \
  -ca=../ca/ca.pem \
  -ca-key=../ca/ca-key.pem \
  -config=../ca/ca-config.json \
  -profile=kubernetes \
  kube-apiserver-csr.json | cfssljson -bare  kube-apiserver
```

**拷贝kube-apiserver组件证书到master节点**

```bash
master="master01 master02 master03"
for i in $master;do
   ssh $i "mkdir /etc/kubernetes/pki -p"
   scp /opt/pki/kubernetes/ca/{ca.pem,ca-key.pem} /opt/pki/kubernetes/kube-apiserver/{kube-apiserver-key.pem,kube-apiserver.pem} $i:/etc/kubernetes/pki
done
```

**拷贝证书到node**

```bash
master="node01 node02 "
for i in $master;do
   ssh $i "mkdir /etc/kubernetes/pki -p"
   scp /opt/pki/kubernetes/ca/ca.pem $i:/etc/kubernetes/pki
done
```

### 3.创建proxy-client证书以及ca

```bash
#创建目录
mkdir /opt/pki/proxy-client
cd /opt/pki/proxy-client
#生成ca配置文件
cat > front-proxy-ca-csr.json <<EOF
{
  "CA":{"expiry":"87600h"},
  "CN": "kubernetes",
  "key": {
     "algo": "rsa",
     "size": 2048
  }
}
EOF
#生成ca文件
cfssl gencert -initca front-proxy-ca-csr.json | cfssljson -bare front-proxy-ca
#生成客户端证书申请文件
cat > front-proxy-client-csr.json <<EOF
{
  "CN": "front-proxy-client",
  "key": {
     "algo": "rsa",
     "size": 2048
  }
}
EOF
#生成证书
cfssl gencert \
-ca=front-proxy-ca.pem \
-ca-key=front-proxy-ca-key.pem  \
-config=../kubernetes/ca/ca-config.json   \
-profile=kubernetes front-proxy-client-csr.json | cfssljson -bare front-proxy-client
```

**拷贝证书到master节点**

```bash
master="master01 master02 master03"
node="node01 node02"
for i in $master;do
   scp /opt/pki/proxy-client/{front-proxy-ca.pem,front-proxy-client.pem,front-proxy-client-key.pem} $i:/etc/kubernetes/pki
done
for i in $node;do
  scp /opt/pki/proxy-client/front-proxy-ca.pem $i:/etc/kubernetes/pki
done
```

### 4.创建kube-controller-manager证书与认证文件

```bash
#生成目录
mkdir /opt/pki/kubernetes/kube-controller-manager
cd /opt/pki/kubernetes/kube-controller-manager
#生成证书请求文件
cat > kube-controller-manager-csr.json <<EOF
{
  "CN": "system:kube-controller-manager",
  "key": {
    "algo": "rsa",
    "size": 2048
  },
  "names": [
    {
      "C": "CN",
      "TS": "Beijing",
      "L": "Beijing",
      "O": "system:kube-controller-manager",
      "OU": "System"
    }
  ]
}
EOF
#生成证书文件
cfssl gencert \
   -ca=../ca/ca.pem \
   -ca-key=../ca/ca-key.pem \
   -config=../ca/ca-config.json \
   -profile=kubernetes \
   kube-controller-manager-csr.json | cfssljson -bare kube-controller-manager
#生成配置文件
kubectl config set-cluster kubernetes \
    --certificate-authority=../ca/ca.pem \
    --embed-certs=true \
    --server=https://127.0.0.1:6443 \
    --kubeconfig=kube-controller-manager.kubeconfig

kubectl config set-credentials system:kube-controller-manager \
    --client-certificate=kube-controller-manager.pem \
    --client-key=kube-controller-manager-key.pem \
    --embed-certs=true \
    --kubeconfig=kube-controller-manager.kubeconfig

kubectl config set-context default \
    --cluster=kubernetes \
    --user=system:kube-controller-manager \
    --kubeconfig=kube-controller-manager.kubeconfig

kubectl config use-context default --kubeconfig=kube-controller-manager.kubeconfig
```

**拷贝证书文件到master节点**

```bash
master="master01 master02 master03"
for i in $master;do
   scp /opt/pki/kubernetes/kube-controller-manager/kube-controller-manager.kubeconfig $i:/etc/kubernetes
done
```

### 5.生成kube-scheduler证书文件

```bash
#创建目录
mkdir /opt/pki/kubernetes/kube-scheduler
cd /opt/pki/kubernetes/kube-scheduler
#生成证书申请文件
cat > kube-scheduler-csr.json <<EOF
{
  "CN": "system:kube-scheduler",
  "key": {
    "algo": "rsa",
    "size": 2048
  },
  "names": [
    {
      "C": "CN",
      "TS": "Beijing",
      "L": "Beijing",
      "O": "system:kube-scheduler",
      "OU": "System"
    }
  ]
}
EOF
#生成证书
cfssl gencert \
   -ca=../ca/ca.pem \
   -ca-key=../ca/ca-key.pem \
   -config=../ca/ca-config.json \
   -profile=kubernetes \
   kube-scheduler-csr.json | cfssljson -bare kube-scheduler
#生成配置文件
kubectl config set-cluster kubernetes \
    --certificate-authority=../ca/ca.pem \
    --embed-certs=true \
    --server=https://127.0.0.1:6443 \
    --kubeconfig=kube-scheduler.kubeconfig

  kubectl config set-credentials system:kube-scheduler \
    --client-certificate=kube-scheduler.pem \
    --client-key=kube-scheduler-key.pem \
    --embed-certs=true \
    --kubeconfig=kube-scheduler.kubeconfig

  kubectl config set-context default \
    --cluster=kubernetes \
    --user=system:kube-scheduler \
    --kubeconfig=kube-scheduler.kubeconfig

  kubectl config use-context default --kubeconfig=kube-scheduler.kubeconfig
```

**拷贝证书文件到master节点**

```bash
master="master01 master02 master03"
for i in $master;do
   scp /opt/pki/kubernetes/kube-scheduler/kube-scheduler.kubeconfig $i:/etc/kubernetes
done
```

### 6.生成kubernetes集群管理员证书

```bash
#创建目录
mkdir /opt/pki/kubernetes/admin
cd /opt/pki/kubernetes/admin
#生成证书申请文件
cat > admin-csr.json <<EOF
{
  "CN": "admin",
  "key": {
    "algo": "rsa",
    "size": 2048
  },
  "names": [
    {
      "C": "CN",
      "TS": "Beijing",
      "L": "Beijing",
      "O": "system:masters",
      "OU": "System"
    }
  ]
}
EOF
#生成证书
cfssl gencert \
   -ca=../ca/ca.pem \
   -ca-key=../ca/ca-key.pem \
   -config=../ca/ca-config.json \
   -profile=kubernetes \
   admin-csr.json | cfssljson -bare admin
#生成配置文件
kubectl config set-cluster kubernetes \
    --certificate-authority=../ca/ca.pem \
    --embed-certs=true \
    --server=https://127.0.0.1:6443 \
    --kubeconfig=admin.kubeconfig

  kubectl config set-credentials admin \
    --client-certificate=admin.pem \
    --client-key=admin-key.pem \
    --embed-certs=true \
    --kubeconfig=admin.kubeconfig

  kubectl config set-context default \
    --cluster=kubernetes \
    --user=admin \
    --kubeconfig=admin.kubeconfig

  kubectl config use-context default --kubeconfig=admin.kubeconfig
```

# 五、部署etcd集群

三台master节点安装etcd

## 5.1 安装etcd

```bash
#解压
tar xf etcd-v3.5.5-linux-amd64.tar.gz
cp etcd-v3.5.5-linux-amd64/etcd* /usr/bin/
rm -rf etcd-v3.5.5-linux-amd64
#创建配置文件
#etcd-1
cat > /etc/etcd/etcd.config.yml <<EOF
name: 'etcd-1'
data-dir: /var/lib/etcd
wal-dir: /var/lib/etcd/wal
snapshot-count: 5000
heartbeat-interval: 100
election-timeout: 1000
quota-backend-bytes: 0
listen-peer-urls: 'https://192.168.10.11:2380'
listen-client-urls: 'https://192.168.10.11:2379,https://127.0.0.1:2379'
max-snapshots: 3
max-wals: 5
cors:
initial-advertise-peer-urls: 'https://192.168.10.11:2380'
advertise-client-urls: 'https://192.168.10.11:2379'
discovery:
discovery-fallback: 'proxy'
discovery-proxy:
discovery-srv:
initial-cluster: 'etcd-1=https://192.168.10.11:2380,etcd-2=https://192.168.10.12:2380,etcd-3=https://192.168.10.13:2380'
initial-cluster-token: 'etcd-cluster'
initial-cluster-state: 'new'
strict-reconfig-check: false
enable-v2: true
enable-pprof: true
proxy: 'off'
proxy-failure-wait: 5000
proxy-refresh-interval: 30000
proxy-dial-timeout: 1000
proxy-write-timeout: 5000
proxy-read-timeout: 0
client-transport-security:
  cert-file: '/etc/etcd/ssl/etcd-server.pem'
  key-file: '/etc/etcd/ssl/etcd-server-key.pem'
  client-cert-auth: true
  trusted-ca-file: '/etc/etcd/ssl/ca.pem'
  auto-tls: true
peer-transport-security:
  cert-file: '/etc/etcd/ssl/etcd-server.pem'
  key-file: '/etc/etcd/ssl/etcd-server-key.pem'
  peer-client-cert-auth: true
  trusted-ca-file: '/etc/etcd/ssl/ca.pem'
  auto-tls: true
debug: false
log-package-levels:
log-outputs: [default]
force-new-cluster: false
EOF

#etcd-2
cat > /etc/etcd/etcd.config.yml <<EOF
name: 'etcd-2'
data-dir: /var/lib/etcd
wal-dir: /var/lib/etcd/wal
snapshot-count: 5000
heartbeat-interval: 100
election-timeout: 1000
quota-backend-bytes: 0
listen-peer-urls: 'https://192.168.10.12:2380'
listen-client-urls: 'https://192.168.10.12:2379,https://127.0.0.1:2379'
max-snapshots: 3
max-wals: 5
cors:
initial-advertise-peer-urls: 'https://192.168.10.12:2380'
advertise-client-urls: 'https://192.168.10.12:2379'
discovery:
discovery-fallback: 'proxy'
discovery-proxy:
discovery-srv:
initial-cluster: 'etcd-1=https://192.168.10.11:2380,etcd-2=https://192.168.10.12:2380,etcd-3=https://192.168.10.13:2380'
initial-cluster-token: 'etcd-cluster'
initial-cluster-state: 'new'
strict-reconfig-check: false
enable-v2: true
enable-pprof: true
proxy: 'off'
proxy-failure-wait: 5000
proxy-refresh-interval: 30000
proxy-dial-timeout: 1000
proxy-write-timeout: 5000
proxy-read-timeout: 0
client-transport-security:
  cert-file: '/etc/etcd/ssl/etcd-server.pem'
  key-file: '/etc/etcd/ssl/etcd-server-key.pem'
  client-cert-auth: true
  trusted-ca-file: '/etc/etcd/ssl/ca.pem'
  auto-tls: true
peer-transport-security:
  cert-file: '/etc/etcd/ssl/etcd-server.pem'
  key-file: '/etc/etcd/ssl/etcd-server-key.pem'
  peer-client-cert-auth: true
  trusted-ca-file: '/etc/etcd/ssl/ca.pem'
  auto-tls: true
debug: false
log-package-levels:
log-outputs: [default]
force-new-cluster: false
EOF

#etcd-3
cat > /etc/etcd/etcd.config.yml <<EOF
name: 'etcd-3'
data-dir: /var/lib/etcd
wal-dir: /var/lib/etcd/wal
snapshot-count: 5000
heartbeat-interval: 100
election-timeout: 1000
quota-backend-bytes: 0
listen-peer-urls: 'https://192.168.10.13:2380'
listen-client-urls: 'https://192.168.10.13:2379,https://127.0.0.1:2379'
max-snapshots: 3
max-wals: 5
cors:
initial-advertise-peer-urls: 'https://192.168.10.13:2380'
advertise-client-urls: 'https://192.168.10.13:2379'
discovery:
discovery-fallback: 'proxy'
discovery-proxy:
discovery-srv:
initial-cluster: 'etcd-1=https://192.168.10.11:2380,etcd-2=https://192.168.10.12:2380,etcd-3=https://192.168.10.13:2380'
initial-cluster-token: 'etcd-cluster'
initial-cluster-state: 'new'
strict-reconfig-check: false
enable-v2: true
enable-pprof: true
proxy: 'off'
proxy-failure-wait: 5000
proxy-refresh-interval: 30000
proxy-dial-timeout: 1000
proxy-write-timeout: 5000
proxy-read-timeout: 0
client-transport-security:
  cert-file: '/etc/etcd/ssl/etcd-server.pem'
  key-file: '/etc/etcd/ssl/etcd-server-key.pem'
  client-cert-auth: true
  trusted-ca-file: '/etc/etcd/ssl/ca.pem'
  auto-tls: true
peer-transport-security:
  cert-file: '/etc/etcd/ssl/etcd-server.pem'
  key-file: '/etc/etcd/ssl/etcd-server-key.pem'
  peer-client-cert-auth: true
  trusted-ca-file: '/etc/etcd/ssl/ca.pem'
  auto-tls: true
debug: false
log-package-levels:
log-outputs: [default]
force-new-cluster: false
EOF

#创建service文件
cat > /etc/systemd/system/etcd.service <<EOF
[Unit]
Description=Etcd Service
Documentation=https://coreos.com/etcd/docs/latest/
After=network.target

[Service]
Type=notify
ExecStart=/usr/bin/etcd --config-file=/etc/etcd/etcd.config.yml
Restart=on-failure
RestartSec=10
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
Alias=etcd3.service
EOF

#启动服务
systemctl enable --now etcd
```

## 5.2 配置etcdctl客户端工具

```bash
#设置全局变量
cat > /etc/profile.d/etcdctl.sh <<EOF
#!/bin/bash
export ETCDCTL_API=3
export ETCDCTL_ENDPOINTS=https://127.0.0.1:2379
export ETCDCTL_CACERT=/etc/etcd/ssl/ca.pem
export ETCDCTL_CERT=/etc/etcd/ssl/etcd-client.pem
export ETCDCTL_KEY=/etc/etcd/ssl/etcd-client-key.pem
EOF
#生效
source /etc/profile
#验证集群状态
etcdctl member list
```

# 六、部署kubernetes

**分发二进制文件**

```bash
master="master01 master02 master03"
node="node01 node02"
tar xf kubernetes-server-linux-amd64.tar.gz
#分发master组件
for i in $master;do
  scp kubernetes/server/bin/{kubeadm,kube-apiserver,kube-controller-manager,kube-scheduler,kube-proxy,kubelet,kubectl} $i:/usr/bin
done
#分发node组件
for i in $node;do
  scp kubernetes/server/bin/{kube-proxy,kubelet} $i:/usr/bin
done
```

## 6.1 安装kube-apiserver

```bash
#创建ServiceAccount Key
openssl genrsa -out /etc/kubernetes/pki/sa.key 2048
openssl rsa -in /etc/kubernetes/pki/sa.key -pubout -out /etc/kubernetes/pki/sa.pub
master="master01 master02 master03"
#分发master组件
for i in $master;do
  scp /etc/kubernetes/pki/{sa.pub,sa.key} $i:/etc/kubernetes/pki/
done
#创建service文件
a=`ifconfig eth0 | awk -rn 'NR==2{print $2}'`
cat > /etc/systemd/system/kube-apiserver.service <<EOF
[Unit]
Description=Kubernetes API Server
Documentation=https://github.com/kubernetes/kubernetes
After=network.target

[Service]
ExecStart=/usr/bin/kube-apiserver \\
      --v=2  \\
      --logtostderr=true  \\
      --allow-privileged=true  \\
      --bind-address=$a  \\
      --secure-port=6443  \\
      --advertise-address=$a \\
      --service-cluster-ip-range=10.200.0.0/16  \\
      --service-node-port-range=30000-42767  \\
      --etcd-servers=https://192.168.10.11:2379,https://192.168.10.12:2379,https://192.168.10.13:2379 \\
      --etcd-cafile=/etc/etcd/ssl/ca.pem  \\
      --etcd-certfile=/etc/etcd/ssl/etcd-client.pem  \\
      --etcd-keyfile=/etc/etcd/ssl/etcd-client-key.pem  \\
      --client-ca-file=/etc/kubernetes/pki/ca.pem  \\
      --tls-cert-file=/etc/kubernetes/pki/kube-apiserver.pem  \\
      --tls-private-key-file=/etc/kubernetes/pki/kube-apiserver-key.pem  \\
      --kubelet-client-certificate=/etc/kubernetes/pki/kube-apiserver.pem  \\
      --kubelet-client-key=/etc/kubernetes/pki/kube-apiserver-key.pem  \\
      --service-account-key-file=/etc/kubernetes/pki/sa.pub  \\
      --service-account-signing-key-file=/etc/kubernetes/pki/sa.key  \\
      --service-account-issuer=https://kubernetes.default.svc.cluster.local \\
      --kubelet-preferred-address-types=InternalIP,ExternalIP,Hostname  \\
      --enable-admission-plugins=NamespaceLifecycle,LimitRanger,ServiceAccount,DefaultStorageClass,DefaultTolerationSeconds,NodeRestriction,ResourceQuota  \\
      --authorization-mode=Node,RBAC  \\
      --enable-bootstrap-token-auth=true  \\
      --requestheader-client-ca-file=/etc/kubernetes/pki/front-proxy-ca.pem  \\
      --proxy-client-cert-file=/etc/kubernetes/pki/front-proxy-client.pem  \\
      --proxy-client-key-file=/etc/kubernetes/pki/front-proxy-client-key.pem  \\
      --requestheader-allowed-names=aggregator  \\
      --requestheader-group-headers=X-Remote-Group  \\
      --requestheader-extra-headers-prefix=X-Remote-Extra-  \\
      --requestheader-username-headers=X-Remote-User  

Restart=on-failure
RestartSec=10s
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF
#启动服务
systemctl enable --now kube-apiserver.service
```

## 6.2 安装kube-controller-manager

```bash
#生成service文件
cat > /etc/systemd/system/kube-controller-manager.service <<EOF
[Unit]
Description=Kubernetes Controller Manager
Documentation=https://github.com/kubernetes/kubernetes
After=network.target

[Service]
ExecStart=/usr/bin/kube-controller-manager \
      --v=2 \
      --logtostderr=true \
      --root-ca-file=/etc/kubernetes/pki/ca.pem \
      --cluster-signing-cert-file=/etc/kubernetes/pki/ca.pem \
      --cluster-signing-key-file=/etc/kubernetes/pki/ca-key.pem \
      --service-account-private-key-file=/etc/kubernetes/pki/sa.key \
      --kubeconfig=/etc/kubernetes/kube-controller-manager.kubeconfig \
      --leader-elect=true \
      --use-service-account-credentials=true \
      --node-monitor-grace-period=40s \
      --node-monitor-period=5s \
      --pod-eviction-timeout=2m0s \
      --controllers=*,bootstrapsigner,tokencleaner \
      --allocate-node-cidrs=true \
      --cluster-cidr=10.200.0.0/16 \
      --requestheader-client-ca-file=/etc/kubernetes/pki/front-proxy-ca.pem \
      --node-cidr-mask-size=24
Restart=always
RestartSec=10s

[Install]
WantedBy=multi-user.target
EOF
#启动服务
systemctl enable --now kube-controller-manager.service
```

## 6.3 安装kube-scheduler

```bash
#生成service文件
cat > /etc/systemd/system/kube-scheduler.service <<EOF
[Unit]
Description=Kubernetes Scheduler
Documentation=https://github.com/kubernetes/kubernetes
After=network.target

[Service]
ExecStart=/usr/bin/kube-scheduler \
      --v=2 \
      --logtostderr=true \
      --leader-elect=true \
      --kubeconfig=/etc/kubernetes/kube-scheduler.kubeconfig

Restart=always
RestartSec=10s

[Install]
WantedBy=multi-user.target
EOF
#启动服务
systemctl enable --now kube-scheduler.service
```

## 6.4 在master节点配置kubectl工具

```bash
#拷贝admin.kubeconfig到~/.kube/config
mkdir /root/.kube/ -p
cp /opt/pki/kubernetes/admin/admin.kubeconfig  /root/.kube/config
#验证集群状态，以下显示信息表示master节点的所有组件运行正常
kubectl get cs
NAME                 STATUS    MESSAGE             ERROR
scheduler            Healthy   ok                  
controller-manager   Healthy   ok                  
etcd-2               Healthy   {"health":"true"}   
etcd-0               Healthy   {"health":"true"}   
etcd-1               Healthy   {"health":"true"}
```

## 6.5 部署kubelet

### 1.使用TLS Bootstrapping自动认证kubelet

**创建TLS Bootstrapping认证文件**

在其中一个master节点执行

```bash
#创建目录
mkdir /opt/pki/kubernetes/kubelet -p
cd /opt/pki/kubernetes/kubelet
#生成随机认证key
a=`head -c 16 /dev/urandom | od -An -t x | tr -d ' ' | head -c6`
b=`head -c 16 /dev/urandom | od -An -t x | tr -d ' ' | head -c16`
#生成权限绑定文件
cat > bootstrap.secret.yaml <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: bootstrap-token-$a
  namespace: kube-system
type: bootstrap.kubernetes.io/token
stringData:
  description: "The default bootstrap token generated by 'kubelet '."
  token-id: $a
  token-secret: $b
  usage-bootstrap-authentication: "true"
  usage-bootstrap-signing: "true"
  auth-extra-groups:  system:bootstrappers:default-node-token,system:bootstrappers:worker,system:bootstrappers:ingress
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: kubelet-bootstrap
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: system:node-bootstrapper
subjects:
- apiGroup: rbac.authorization.k8s.io
  kind: Group
  name: system:bootstrappers:default-node-token
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: node-autoapprove-bootstrap
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: system:certificates.k8s.io:certificatesigningrequests:nodeclient
subjects:
- apiGroup: rbac.authorization.k8s.io
  kind: Group
  name: system:bootstrappers:default-node-token
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: node-autoapprove-certificate-rotation
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: system:certificates.k8s.io:certificatesigningrequests:selfnodeclient
subjects:
- apiGroup: rbac.authorization.k8s.io
  kind: Group
  name: system:nodes
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  annotations:
    rbac.authorization.kubernetes.io/autoupdate: "true"
  labels:
    kubernetes.io/bootstrapping: rbac-defaults
  name: system:kube-apiserver-to-kubelet
rules:
  - apiGroups:
      - ""
    resources:
      - nodes/proxy
      - nodes/stats
      - nodes/log
      - nodes/spec
      - nodes/metrics
    verbs:
      - "*"
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: system:kube-apiserver
  namespace: ""
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: system:kube-apiserver-to-kubelet
subjects:
  - apiGroup: rbac.authorization.k8s.io
    kind: User
    name: kube-apiserver
EOF
#生成配置文件
kubectl config set-cluster kubernetes  \
--certificate-authority=../ca/ca.pem   \
--embed-certs=true   \
--server=https://127.0.0.1:6443   \
--kubeconfig=bootstrap-kubelet.kubeconfig

kubectl config set-credentials tls-bootstrap-token-user  \
--token=$a.$b \
--kubeconfig=bootstrap-kubelet.kubeconfig

kubectl config set-context tls-bootstrap-token-user@kubernetes \
--cluster=kubernetes   \
--user=tls-bootstrap-token-user  \
--kubeconfig=bootstrap-kubelet.kubeconfig

kubectl config use-context tls-bootstrap-token-user@kubernetes  \
--kubeconfig=bootstrap-kubelet.kubeconfig
#创建权限
kubectl apply -f bootstrap.secret.yaml
```

**分发认证文件**

```bash
node="master01 master02 master03 node01 node02"
for i in $node;do
  ssh $i "mkdir /etc/kubernetes -p"
  scp  /opt/pki/kubernetes/kubelet/bootstrap-kubelet.kubeconfig $i:/etc/kubernetes
done
```

### 2.部署kubelet组件

**使用docker容器运行时部署方式**

```bash
a=`ifconfig eth0 | awk -rn 'NR==2{print $2}'`
mkdir /etc/systemd/system/kubelet.service.d/ -p
mkdir /etc/kubernetes/manifests/ -p
#生成service文件
cat > /etc/systemd/system/kubelet.service <<EOF
[Unit]
Description=Kubernetes Kubelet
Documentation=https://github.com/kubernetes/kubernetes
After=docker.service
Requires=docker.service

[Service]
ExecStart=/usr/bin/kubelet

Restart=always
StartLimitInterval=0
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
#生成service配置文件
cat > /etc/systemd/system/kubelet.service.d/10-kubelet.conf <<EOF
[Service]
Environment="KUBELET_KUBECONFIG_ARGS=--bootstrap-kubeconfig=/etc/kubernetes/bootstrap-kubelet.kubeconfig --kubeconfig=/etc/kubernetes/kubelet.kubeconfig"
Environment="KUBELET_SYSTEM_ARGS=--hostname-override=$a"
Environment="KUBELET_RINTIME=--container-runtime=remote --container-runtime-endpoint=unix:///var/run/cri-dockerd.sock"
Environment="KUBELET_CONFIG_ARGS=--config=/etc/kubernetes/kubelet-conf.yml"
Environment="KUBELET_EXTRA_ARGS=--node-labels=node.kubernetes.io/node=''"
ExecStart=
ExecStart=/usr/bin/kubelet \$KUBELET_KUBECONFIG_ARGS \$KUBELET_CONFIG_ARGS \$KUBELET_SYSTEM_ARGS \$KUBELET_EXTRA_ARGS \$KUBELET_RINTIME
EOF
```

**使用conatinerd部署方式**

```bash
a=`ifconfig eth0 | awk -rn 'NR==2{print $2}'`
mkdir /etc/systemd/system/kubelet.service.d/ -p
mkdir /etc/kubernetes/manifests/ -p
#生成service文件
cat > /etc/systemd/system/kubelet.service <<EOF
[Unit]
Description=Kubernetes Kubelet
Documentation=https://github.com/kubernetes/kubernetes
After=containerd.service
Requires=containerd.service

[Service]
ExecStart=/usr/bin/kubelet

Restart=always
StartLimitInterval=0
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
#生成service配置文件
cat > /etc/systemd/system/kubelet.service.d/10-kubelet.conf <<EOF
[Service]
Environment="KUBELET_KUBECONFIG_ARGS=--bootstrap-kubeconfig=/etc/kubernetes/bootstrap-kubelet.kubeconfig --kubeconfig=/etc/kubernetes/kubelet.kubeconfig"
Environment="KUBELET_SYSTEM_ARGS=--hostname-override=$a"
Environment="KUBELET_RINTIME=--container-runtime=remote --container-runtime-endpoint=unix:///run/containerd/containerd.sock"
Environment="KUBELET_CONFIG_ARGS=--config=/etc/kubernetes/kubelet-conf.yml"
Environment="KUBELET_EXTRA_ARGS=--node-labels=node.kubernetes.io/node='' "
ExecStart=
ExecStart=/usr/bin/kubelet \$KUBELET_KUBECONFIG_ARGS \$KUBELET_CONFIG_ARGS \$KUBELET_SYSTEM_ARGS \$KUBELET_EXTRA_ARGS \$KUBELET_RINTIME
EOF
```

**kubelet配置文件生成**

```bash
a=`ifconfig eth0 | awk -rn 'NR==2{print $2}'`
#生成配置文件
cat > /etc/kubernetes/kubelet-conf.yml <<EOF
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
address: $a
port: 10250
readOnlyPort: 10255
authentication:
  anonymous:
    enabled: false
  webhook:
    cacheTTL: 2m0s
    enabled: true
  x509:
    clientCAFile: /etc/kubernetes/pki/ca.pem
authorization:
  mode: Webhook
  webhook:
    cacheAuthorizedTTL: 5m0s
    cacheUnauthorizedTTL: 30s
cgroupDriver: systemd
cgroupsPerQOS: true
clusterDNS:
- 10.200.0.2
clusterDomain: cluster.local
containerLogMaxFiles: 5
containerLogMaxSize: 10Mi
contentType: application/vnd.kubernetes.protobuf
cpuCFSQuota: true
cpuManagerPolicy: none
cpuManagerReconcilePeriod: 10s
enableControllerAttachDetach: true
enableDebuggingHandlers: true
enforceNodeAllocatable:
- pods
eventBurst: 10
eventRecordQPS: 5
evictionHard:
  imagefs.available: 15%
  memory.available: 100Mi
  nodefs.available: 10%
  nodefs.inodesFree: 5%
evictionPressureTransitionPeriod: 5m0s
failSwapOn: true
fileCheckFrequency: 20s
hairpinMode: promiscuous-bridge
healthzBindAddress: 127.0.0.1
healthzPort: 10248
httpCheckFrequency: 20s
imageGCHighThresholdPercent: 85
imageGCLowThresholdPercent: 80
imageMinimumGCAge: 2m0s
iptablesDropBit: 15
iptablesMasqueradeBit: 14
kubeAPIBurst: 10
kubeAPIQPS: 5
makeIPTablesUtilChains: true
maxOpenFiles: 1000000
maxPods: 110
nodeStatusUpdateFrequency: 10s
oomScoreAdj: -999
podPidsLimit: -1
registryBurst: 10
registryPullQPS: 5
resolvConf: /etc/resolv.conf
rotateCertificates: true
runtimeRequestTimeout: 2m0s
serializeImagePulls: true
staticPodPath: /etc/kubernetes/manifests
streamingConnectionIdleTimeout: 4h0m0s
syncFrequency: 1m0s
volumeStatsAggPeriod: 1m0s
EOF
```

**启动服务**

```bash
systemctl enable --now kubelet.service
```

## 6.6 部署kube-proxy

**生成kube-proxy配置文件**

```bash
#master节点执行
#创建目录
mkdir /opt/pki/kubernetes/kube-proxy/ -p
cd  /opt/pki/kubernetes/kube-proxy/
#生成配置文件
kubectl -n kube-system create serviceaccount kube-proxy
kubectl create clusterrolebinding  system:kube-proxy  --clusterrole system:node-proxier --serviceaccount kube-system:kube-proxy
cat >kube-proxy-scret.yml<<EOF
apiVersion: v1
kind: Secret
metadata:
  name: kube-proxy
  namespace: kube-system
  annotations:
    kubernetes.io/service-account.name: "kube-proxy"
type: kubernetes.io/service-account-token
EOF
kubectl apply -f kube-proxy-scret.yml
JWT_TOKEN=$(kubectl -n kube-system get secret/kube-proxy \
--output=jsonpath='{.data.token}' | base64 -d)
kubectl config set-cluster kubernetes   \
--certificate-authority=/etc/kubernetes/pki/ca.pem    \
--embed-certs=true    \
--server=https://127.0.0.1:6443    \
--kubeconfig=kube-proxy.kubeconfig

kubectl config set-credentials kubernetes    \
--token=${JWT_TOKEN}   \
--kubeconfig=kube-proxy.kubeconfig

kubectl config set-context kubernetes    \
--cluster=kubernetes   \
--user=kubernetes   \
--kubeconfig=kube-proxy.kubeconfig

kubectl config use-context kubernetes   \
--kubeconfig=kube-proxy.kubeconfig
```

**拷贝配置文件到node节点**

```bash
node="master01 master02 master03 node01 node02"
for i in $node;do
  scp  /opt/pki/kubernetes/kube-proxy/kube-proxy.kubeconfig $i:/etc/kubernetes
done
```

**生成service文件**

```bash
cat > /etc/systemd/system/kube-proxy.service <<EOF
[Unit]
Description=Kubernetes Kube Proxy
Documentation=https://github.com/kubernetes/kubernetes
After=network.target

[Service]
ExecStart=/usr/bin/kube-proxy \
  --config=/etc/kubernetes/kube-proxy.conf \
  --v=2

Restart=always
RestartSec=10s

[Install]
WantedBy=multi-user.target
EOF
```

**生成配置文件**

```bash
a=`ifconfig eth0 | awk -rn 'NR==2{print $2}'`
cat > /etc/kubernetes/kube-proxy.conf <<EOF
apiVersion: kubeproxy.config.k8s.io/v1alpha1
bindAddress: $a
clientConnection:
  acceptContentTypes: ""
  burst: 10
  contentType: application/vnd.kubernetes.protobuf
  kubeconfig: /etc/kubernetes/kube-proxy.kubeconfig
  qps: 5
clusterCIDR: 10.100.0.0/16
configSyncPeriod: 15m0s
conntrack:
  max: null
  maxPerCore: 32768
  min: 131072
  tcpCloseWaitTimeout: 1h0m0s
  tcpEstablishedTimeout: 24h0m0s
enableProfiling: false
healthzBindAddress: 0.0.0.0:10256
hostnameOverride: "$a"
iptables:
  masqueradeAll: false
  masqueradeBit: 14
  minSyncPeriod: 0s
  syncPeriod: 30s
ipvs:
  masqueradeAll: true
  minSyncPeriod: 5s
  scheduler: "rr"
  syncPeriod: 30s
kind: KubeProxyConfiguration
metricsBindAddress: 127.0.0.1:10249
mode: "ipvs"
nodePortAddresses: null
oomScoreAdj: -999
portRange: ""
udpIdleTimeout: 250ms
EOF
```

**启动服务**

```bash
systemctl enable --now kube-proxy.service
```

# 七、安装其他组件

## 7.1 网络组件安装

### 1.安装calico网络插件

**这里安装v3.24.5版本**

yaml下载地址：https://raw.githubusercontent.com/projectcalico/calico/v3.24.5/manifests/calico-typha.yaml

```bash
mkdir /opt/k8s/calico -p
#下载yaml文件，修改的内容为下
#以下需要使用命令编码证书文件之后粘贴内容,命令如下
cat calico-typha.yaml | grep 'image:'
          image: 192.168.10.254:5000/kubernetes/cni:v3.24.5
          image: 192.168.10.254:5000/kubernetes/cni:v3.24.5
          image: 192.168.10.254:5000/kubernetes/node:v3.24.5
          image: 192.168.10.254:5000/kubernetes/node:v3.24.5
          image: 192.168.10.254:5000/kubernetes/kube-controllers:v3.24.5
      - image: 192.168.10.254:5000/kubernetes/typha:v3.24.5
#修改配置
            - name: CALICO_IPV4POOL_CIDR
              value: "10.100.0.0/16" 
#创建
kubectl apply -f calico-typha.yaml
#验证
kubectl  get pod -n kube-system
NAME                                       READY   STATUS    RESTARTS   AGE
calico-kube-controllers-5896d7d958-gc72q   1/1     Running   0          56s
calico-node-7gmb4                          1/1     Running   0          56s
calico-node-v7lh7                          1/1     Running   0          56s
calico-node-vtg6l                          1/1     Running   0          56s
calico-node-wrxdk                          1/1     Running   0          56s
calico-node-x5zfm                          1/1     Running   0          56s
calico-typha-86fbc78fb-z5zxh               1/1     Running   0          56s
#验证node节点状态
kubectl get node
NAME            STATUS   ROLES    AGE   VERSION
192.168.10.11   Ready    <none>   11m   v1.25.5
192.168.10.12   Ready    <none>   11m   v1.25.5
192.168.10.13   Ready    <none>   11m   v1.25.5
192.168.10.14   Ready    <none>   11m   v1.25.5
192.168.10.15   Ready    <none>   11m   v1.25.5
```

**安装calicoctl客户端工具**

下载地址：https://github.com/projectcalico/calico

```bash
#创建配置文件
mkdir /etc/calico -p
cat >/etc/calico/calicoctl.cfg <<EOF
apiVersion: projectcalico.org/v3
kind: CalicoAPIConfig
metadata:
spec:
  datastoreType: "kubernetes"
  kubeconfig: "/root/.kube/config"
EOF
#验证
calicoctl node status
Calico process is running.

IPv4 BGP status
+---------------+-------------------+-------+----------+-------------+
| PEER ADDRESS  |     PEER TYPE     | STATE |  SINCE   |    INFO     |
+---------------+-------------------+-------+----------+-------------+
| 192.168.10.52 | node-to-node mesh | up    | 13:03:48 | Established |
| 192.168.10.53 | node-to-node mesh | up    | 13:03:48 | Established |
| 192.168.10.54 | node-to-node mesh | up    | 13:03:48 | Established |
| 192.168.10.55 | node-to-node mesh | up    | 13:03:47 | Established |
+---------------+-------------------+-------+----------+-------------+

IPv6 BGP status
No IPv6 peers found.
```

## 7.2 安装coredns组件

yaml文件下载地址：https://github.com/coredns/deployment/blob/master/kubernetes/coredns.yaml.sed

```bash
#创建目录
mkdir /opt/k8s/coredns -p
#修改配置
  Corefile: |
    .:53 {
        errors
        health {
          lameduck 5s
        }
        ready
        kubernetes cluster.local in-addr.arpa ip6.arpa {  #这里修改
          fallthrough in-addr.arpa ip6.arpa
        }
        prometheus :9153
        forward . 114.114.114.114 {   #外部dns解析服务器
          max_concurrent 1000
        }
        cache 30
        loop
        reload
        loadbalance
    }
  clusterIP: 10.200.0.2  #这里改为这个地址
  
#创建
kubectl apply -f coredns.yaml
#验证
kubectl get pod -n kube-system | grep coredns
coredns-545fffd6b8-lg8nv                   1/1     Running   0          3m51s
coredns-545fffd6b8-txft4                   1/1     Running   0          3m51s
coredns-545fffd6b8-vdlx7                   1/1     Running   0          6m37s
```

## 7.3 安装dashboard

下载地址：https://raw.githubusercontent.com/kubernetes/dashboard/v2.7.0/aio/deploy/recommended.yaml

```bash
#修改yaml文件
kind: Service
apiVersion: v1
metadata:
  labels:
    k8s-app: kubernetes-dashboard
  name: kubernetes-dashboard
  namespace: kubernetes-dashboard
spec:
  type: NodePort  #添加
  ports:
    - port: 443 
      targetPort: 8443
      nodePort: 30001  #添加
  selector:
    k8s-app: kubernetes-dashboard
#创建
kubectl apply -f dashboard.yaml
#创建用户
cat >admin.yaml<<EOF
apiVersion: v1
kind: ServiceAccount
metadata:
  name: admin-user
  namespace: kubernetes-dashboard
---
apiVersion: v1
kind: Secret
metadata:
  name: admin-user
  namespace: kubernetes-dashboard
  annotations:
    kubernetes.io/service-account.name: "admin-user"
type: kubernetes.io/service-account-token
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: admin-user
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
- kind: ServiceAccount
  name: admin-user
  namespace: kubernetes-dashboard
EOF
kubectl apply -f admin.yaml
#获取用户token
kubectl describe secrets -n kubernetes-dashboard admin-user
```

## 7.4 安装Metrics-server

下载地址：https://github.com/kubernetes-sigs/metrics-server/

```bash
mkdir /opt/k8s/metrics-server
cd /opt/k8s/metrics-server
#拷贝证书文件
node="master01 master02 master03 node01 node02"
for i in $node;do
   scp /opt/pki/proxy-client/front-proxy-ca.pem $i:/etc/kubernetes/pki/
done
#需要修改配置
        - --cert-dir=/tmp
        - --secure-port=4443
        - --kubelet-preferred-address-types=InternalIP,ExternalIP,Hostname
        - --kubelet-use-node-status-port
        - --metric-resolution=15s
        - --kubelet-insecure-tls
        - --requestheader-client-ca-file=/etc/kubernetes/pki/front-proxy-ca.pem 
        - --requestheader-username-headers=X-Remote-User
        - --requestheader-group-headers=X-Remote-Group
        - --requestheader-extra-headers-prefix=X-Remote-Extra- 
        volumeMounts:
        - mountPath: /tmp
          name: tmp-dir
        - mountPath: /etc/kubernetes/pki
          name: ca-ssl
      volumes:
      - emptyDir: {}
        name: tmp-dir
      - name: ca-ssl
        hostPath:
          path: /etc/kubernetes/pki
#创建
kubectl apply -f components.yaml
#验证
kubectl top node 
NAME            CPU(cores)   CPU%   MEMORY(bytes)   MEMORY%   
192.168.10.51   98m          4%     1445Mi          37%       
192.168.10.52   78m          3%     1008Mi          26%       
192.168.10.53   82m          4%     1252Mi          32%       
192.168.10.54   43m          1%     771Mi           20%       
192.168.10.55   55m          1%     640Mi           16%
```

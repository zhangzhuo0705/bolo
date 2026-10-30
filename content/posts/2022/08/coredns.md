---
title: "Coredns"
date: 2022-08-25T09:42:23+08:00
draft: false
description: "说明 CoreDNS 的配置结构与常用插件，以及 Kubernetes 集群的域名解析机制。"
cover: "https://b3logfile.com/bing/20211221.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["Kubernetes"]
tags: ["Coredns", "kubernetes"]
toc: true
---
# 一、Coredns简介

官方文档:https://coredns.io/plugins/

CoreDNS是一个DNS服务器，它是用Go编写的。CoreDNS与其他DNS服务器不同，因为它非常灵活几乎所有功能都包含到插件中。

kubernetes中使用coredns提供service资源名称的域名解析，使用kubernetes插件。

当然coredns还有许多的实用插件，官方网站：https://coredns.io/plugins/

# 二、Coredns使用

## 2.1 Coredns配置文件

```bash
.:53 {    
    hosts {
      10.0.0.1 example.org
      fallthrough
    }
    forward . 114.114.114.114:53  #上面无法处理的请求会传到这里
    prometheus   
    loadbalance
    log 
}
```

## 2.2 插件

### 1.errors

在查询处理过程中遇到的任何错误都将打印到标准输出。特定类型的错误可以在一段时间内合并和打印一次。

基本语法：

```bash
errors
```

### 2.health

启用进程范围的健康探测接口。当CoreDNS启动并运行时，它会返回`200 OK HTTP`状态代码。默认情况下，健康状况在端口`8080/health`上导出。

基本语法：

```bash
health 127.0.0.1:8080 
#注意如果绑定所有地址可写:8080
```

### 3.ready

启用就绪探测接口，默认为`:8181`固定路径为`/ready`，当该服务器准备就绪时，就绪端点返回 200 响应代码和“OK”字样。否则返回 503和未准备好的插件列表。

基本语法：

```bash
ready 127.0.0.1:8181
#注意如果绑定所有地址可写:8181
```

### 4.hosts

hosts插件可以用来直接定义自己所需的dns解析让coredns进行解析返回。

基本语法：

```bash
hosts . {
  10.0.0.1 example.org  #自己填写dns解析，可以写多条
  fallthrough    #表示处理完这个插件内容继续处理其余插件内容
}
```

### 5.kubernetes

运行 kubernetes 插件的 CoreDNS 可用作 kubernetes 集群中 kube-dns 的替代品。

基本语法：

```bash
kubernetes cluster.local {
    endpoint https://192.168.10.71:6443  #访问k8s的apiserver的url     
    kubeconfig /kube/config              #访问集群的kubeconfig认证文件
    namespaces default                   #进行解析资源的命名空间，不写表示所有
    labels application=nginx             #匹配解析资源标签，不写所有
    ttl 5                                #默认值5秒，允许的最小TTL为0秒，最大值为3600秒。将TTL设置为0将防止记录被缓存。
    fallthrough                          #表示处理完这个插件内容继续处理其余插件内容
}
```

### 6.prometheus

使用prometheus，您可以从 CoreDNS 和任何拥有它们的插件中导出指标。指标的默认位置是`localhost:9153`。指标路径固定为`/metrics`。

基本语法：

```bash
prometheus localhost:9253
#注意如果绑定所有地址可写:9253
```

### 7.cache

启用缓存，除区域传输和元数据记录外的所有记录都将被缓存长达 3600 秒。当从后端（上游、数据库等）获取数据成本高昂时缓存最有用。

基本语法：

```bash
cache 30  #缓存多少秒
```

### 8.loop

循环插件负责防止coredns进入到死循环，自动中断循环。

```bash
loop
```

### 9.reload

自动重载配置，在修改配置文件后coredns会自动检测配置文件修改并且重新加载配置。

```bash
reload
```

### 10.loadbalance

自动实现DNS负载均衡。

```bash
loadbalance
```

### 11.forward

forward插件将DNS请求转发到上游。它支持UDP、TCP 和 DNS-over-TLS 并可以实现监控检测。这个插件每个服务器只能使用一个。

可以配置外部dns服务IP也可以使用主机的`/etc/resolv.conf`配置。

配置示例：

```bash
forward  . /etc/resolv.conf {
    except www.zhangzhuo.org  #排除的域名
    expire 10s  #缓存时间10秒默认
}
```

### 12.log

日志插件只会影响查询日志记录，CoreDNS 的任何其他日志记录都会显示出来。请注意对于繁忙的服务器，日志记录会导致性能下降。

配置示例：

```bash
log
```

## 2.3 启动coredns

### 1.命令直接启动

```bash
/usr/bin/coredns -conf /root/corefile
```

### 2.以systemd守护进程运行

```bash
[10:57:22 root@centos7 ~]#cat /etc/systemd/system/coredns.service 
[Unit]                                                                                                                                                                                                            
Description=coredns
Documentation=https://coredns.io
Wants=network-noline.target
After=network-noline.target

[Service]
WorkingDirectory=/usr/local/coredns
User=root
Group=root
ExecStart=/usr/bin/coredns -conf /etc/coredns/Corefile
Restart=always

[Install]
WantedBy=multi-user.target
```

# 三、kubernetes部署coredns

## 3.1 部署coredns

caredns主要用来解决k8s内部service名称的域名解析

下载地址：https://github.com/coredns/deployment/blob/master/kubernetes/coredns.yaml.sed

```bash
#需要修改的位置
kubernetes cluster.local in-addr.arpa ip6.arpa {    #集群内部dns                        
  fallthrough in-addr.arpa ip6.arpa
}
forward . 114.114.114.114 {   #代理外部dns服务器
  max_concurrent 1000
}
clusterIP: 10.200.0.2 #service地址池的第二个地址
```

**执行创建**

```bash
[19:50:00 root@k8s-master dns]#kubectl apply -f coredns.yaml

[19:50:26 root@k8s-master dn[root@net-test1 /]# ping baidu.com
PING baidu.com (220.181.38.148) 56(84) bytes of data.
64 bytes from 220.181.38.148 (220.181.38.148): icmp_seq=1 ttl=127 time=37.9 ms
^C
--- baidu.com ping statistics ---
2 packets transmitted, 1 received, 50% packet loss, time 3ms
rtt min/avg/max/mdev = 37.894/37.894/37.894/0.000 ms
[root@net-test1 /]# ping kubernetes
PING kubernetes.default.svc.cluster.local (10.200.0.1) 56(84) bytes of data.
64 bytes from kubernetes.default.svc.cluster.local (10.200.0.1): icmp_seq=1 ttl=64 time=0.031 mss]#kubectl get pod -A
NAMESPACE     NAME                       READY   STATUS    RESTARTS   AGE
default       net-test1                  1/1     Running   0          14m
kube-system   coredns-6d99d5879f-hvpgl   1/1     Running   0          18s
kube-system   kube-flannel-ds-bvfls      1/1     Running   0          28m
kube-system   kube-flannel-ds-l2gtz      1/1     Running   0          28m
kube-system   kube-flannel-ds-sss77      1/1     Running   0          28m
[19:50:57 root@k8s-master dns]#kubectl get svc -A
NAMESPACE     NAME         TYPE        CLUSTER-IP   EXTERNAL-IP   PORT(S)                  AGE
default       kubernetes   ClusterIP   10.200.0.1   <none>        443/TCP                  4h39m
kube-system   kube-dns     ClusterIP   10.200.0.2   <none>        53/UDP,53/TCP,9153/TCP   39s
#测试
[root@net-test1 /]# ping baidu.com
PING baidu.com (220.181.38.148) 56(84) bytes of data.
64 bytes from 220.181.38.148 (220.181.38.148): icmp_seq=1 ttl=127 time=37.9 ms
[root@net-test1 /]# ping kubernetes
PING kubernetes.default.svc.cluster.local (10.200.0.1) 56(84) bytes of data.
64 bytes from kubernetes.default.svc.cluster.local (10.200.0.1): icmp_seq=1 ttl=64 time=0.031 ms
```

## 3.2 部署本地DNS缓存

kubernetes官方介绍：https://kubernetes.io/zh/docs/tasks/administer-cluster/nodelocaldns/

官方github：https://github.com/kubernetes/kubernetes/tree/master/cluster/addons/dns/nodelocaldns

### 1.为什么需要本地DNS缓存

- 减轻集群DNS解析压力，提高DNS性能
- 避免netfilter做DNAT导致conntrack冲突引发DNS 5秒延时

```bash
镜像底层库 DNS 解析行为默认使用 UDP 在同一个 socket 并发 A 和 AAAA 记录请求，由于 UDP 无状态，两个请求可能会并发创建 conntrack 表项，如果最终 DNAT 成同一个集群 DNS 的 Pod IP 就会导致 conntrack 冲突，由于 conntrack 的创建和插入是不加锁的，最终后面插入的 conntrack 表项就会被丢弃，从而请求超时，默认 5s 后重试，造成现象就是 DNS 5 秒延时; 底层库是 glibc 的容器镜像可以通过配 resolv.conf 参数来控制 DNS 解析行为，不用 TCP 或者避免相同五元组并发(使用串行解析 A 和 AAAA 避免并发或者使用不同 socket 发请求避免相同源端口)，但像基于 alpine 镜像的容器由于底层库是 musl libc，不支持这些 resolv.conf 参数，也就无法规避，所以最佳方案还是使用本地 DNS 缓存。
```

### 2.原理

本地 DNS 缓存以 DaemonSet 方式在每个节点部署一个使用 hostNetwork 的 Pod，创建一个网卡绑上本地 DNS 的 IP，本机的 Pod 的 DNS 请求路由到本地 DNS，然后取缓存或者继续使用 TCP 请求上游集群 DNS 解析 (由于使用 TCP，同一个 socket 只会做一遍三次握手，不存在并发创建 conntrack 表项，也就不会有 conntrack 冲突)

**访问流程结构图对比**

![image-20210831200305289](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210831200305289.png)

不使用dns缓存时，所有的k8s的node节点的pod如果需要dns解析，所有的请求都通过pod自己跟k8s中的dns组件的service进行请求，如果集群规模较大dns组件的负载会比较高，也会导致dns延时5秒的问题

![image-20210831195940589](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210831195940589.png)

使用dns缓存时，每个节点都会运行一个dns缓存pod，并且在宿主机创建一个虚拟网卡并检查dns解析端口(53),本机的pod如果需要dns解析，先请求本地的dns缓存pod，如果dns缓存pod有请求的数据，由dns缓存pod直接进行回复报文，如果没有dns缓存pod会通过k8s的dns组件获取dns解析，之后返回报文给对应的pod。这样可以极大的减少dns组件的负载，也可以解决dns延迟5秒的问题

### 3.部署过程

yaml文件下载地址：https://github.com/kubernetes/kubernetes/blob/master/cluster/addons/dns/nodelocaldns/nodelocaldns.yaml

下在后需要修改的配置，我这里kube-proxy模式为IPVS，如果你的kube-proxy模式为IPTABLES以下配置并不适应

```bash
#需要三个参数
kubedns=`kubectl get svc kube-dns -n kube-system -o jsonpath={.spec.clusterIP}`
damain=cluster.loacl
localdns=169.254.1.1
#kubedns就是集群中kube-dns的svc的IP
#damain集群的damain
#localdns每台node节点监听的地址，不要跟集群中任何IP地址段冲突即可


#文件中所有的__PILLAR__LOCAL__DNS__修改为localdns变量内容
#文件中所有的__PILLAR__DNS__DOMAIN__修改为damain变量内容
#文件中所有的__PILLAR__DNS__SERVER__修改为空
#文件中所有的__PILLAR__CLUSTER__DNS__修改为kubedns变量的值
#文件中所有的__PILLAR__UPSTREAM__SERVERS__修改为集群外部的dns服务器地址，如果没有也可以设置为kubedns
#修改命令
sed -i "s/__PILLAR__LOCAL__DNS__/$localdns/g; s/__PILLAR__DNS__DOMAIN__/$domain/g; s/__PILLAR__DNS__SERVER__//g; s/__PILLAR__CLUSTER__DNS__/$kubedns/g" nodelocaldns.yaml


#之后使用yaml启动pod，如果pod启动正常执行以下步骤
如果 kube-proxy 运行在 IPVS 模式，需要修改 kubelet 的 --cluster-dns 参数为 NodeLocal DNSCache 正在侦听的 <node-local-address> 地址。 

vim /etc/kubernetes/conf/kubelet-conf.yml
clusterDNS:
  - "169.254.1.1"  #修改这个

#之后重启kubelet服务，验证测试，创建一个新的测试pod
kubectl run test1 --image=centos:latest sleep 36000

#进入容器验证dns解析服务器地址是不是169.254.1.1
kubectl exec -it test1
cat /etc/resolv.conf
nameserver 169.254.1.1  #主要看这里

#ping一个k8s中的svc监测是否正常可用,如果可以正常解析表示正常
ping kubernetes
```

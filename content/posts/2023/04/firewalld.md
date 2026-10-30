---
title: "Firewalld"
date: 2023-04-26T15:16:06+08:00
draft: false
description: "讲解 firewalld 的区域与服务规则，演示动态防火墙的配置和管理。"
cover: "https://b3logfile.com/bing/20200214.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["Linux系统基础知识"]
tags: ["linux", "iptables"]
toc: true
---
# 一、firewalld

Firewalld 是一个Linux防火墙管理器，它用于管理iptables规则和网络连接。它可以动态地管理网络连接，可以在运行时添加和删除规则，支持IPv4和IPv6，可以使用Zones对不同的网络环境进行配置，使得防火墙规则更加灵活和易于管理。Firewalld还支持多种服务和端口，可以通过简单的命令行或图形界面进行配置。

firewalld 提供了一个 daemon 和 service，还有命令行和图形界面配置工具，它仅仅是替代了 iptables service 部分，其底层还是使用 iptables 作为防火墙规则管理入口，firewalld 自身并不具备防火墙的功能，而是和 iptables 一样需要通过内核的 netfilter 来实现，也就是说 firewalld 和 iptables 一样，他们的作用都是用于维护规则，而真正使用规则干活的是内核的 netfilter，只不过 firewalld 和 iptables 的结构以及使用方法不一样罢了

## 1.1 firewalld区域

Firewalld中的区域（Zone）是用于定义网络环境的概念，可以根据不同的网络环境为不同的接口或连接设置不同的防火墙规则。常见的Firewalld区域包括：

1. public：公共区域，只接受那些被选中的连接，默认只允许ssh和dhcpv6-client，这个zone是缺省zone（缺省就是默认的意思，所以公共区域也是默认区域，在没有任何配置的情况下走的是公共区域）。
2. Drop：丢弃区域，如果使用丢弃区域，任何进入的数据包将被丢弃，这个类似于Centos6上的 iptables -j drop ，使用丢弃规则意味着将不存在相应。
3. Block：阻塞区域，阻塞区域会拒绝进入的网络连接，返回icmp-host-prohibited，只有服务器已经建立的连接会被通过，即只允许由该系统初始化的网络连接。
4. External：外部区域，这个区域相当于路由器的启动伪装（masquerading）选项，只有指定的连接会被接受，即ssh，而其他的连接将被丢弃或者不被接受。
5. DMZ：隔离区域，如果想要只允许给部分服务能被外部访问，可以在DMZ区域中定义，它也拥有只通过被选中连接的特性，即ssh， 这个区域又叫做非军事化区域。
6. Work：在这个区域中，我们只能定义内部网络，比如私有网络通信才被允许， 只允许ssh、ipp-client和dhcpv6-client。
7. Home：家庭区域，这个区域专门用于家庭环境，它同样只允许被选中的连接， 即ssh、ipp-client、mdns、samba-client和dhcpv6-client。
8. Internal：内部区域，这个区域和 工作区域（Work Zone） 类似，只允许通过被选中的连接，与 家庭区域（Home Zone） 相同。
9. Trusted：信任区域允许所有网络通信通过，因为 信任区域（Trusted Zone）是最被信任的，即使没有设置任何的服务，那么也是被允许的，因为 信任区域（Trusted Zone）是允许所有连接的。

以上是系统定义的所有的区域（Zone），但是，不是所有的区域（Zone）都在使用，只有活跃的区域（Zone）才有实际操作意义。区域是否活跃取决于区域中是否存在接口，默认情况下只有public区域活跃，因为所有接口默认情况下都属于这个区域。

**区域管理命令如下**

- firewall-cmd --get-default-zone：查看firewalld默认区域
- firewall-cmd --set-default-zone=drop：修改默认区域
- firewall-cmd --get-zones：列出所有可用区域
- firewall-cmd --list-all-zones：列出所有区域规则以及详细信息
- firewall-cmd --zone=external --add-interface=eth0：要将接口添加到特定的区域
- firewall-cmd --zone=external --remove-interface=eth0：把某接口从区域移除
- firewall-cmd --get-zone-of-interface=eth0：查看指定接口所属区域

### 1.区域配置文件

要配置或添加区域，您可以使用firewall-cmd命令。或者您可以在其中一个配置目录中创建或复制区域文件。

- `/usr/lib/firewalld/zones`：默认区域配置文件存放位置
- `/etc/firewalld/zones`用户区域配置文件位置

**区域配置文件详解**

```xml
<?xml version="1.0" encoding="utf-8"?>
<zone version="v1.0" target="ACCEPT">
  <short>zhangzhuo</short>
  <description>防火墙描述</description>
  <service name="ssh"/>
  <port port="3306" protocol="tcp"/>
  <source address="192.168.10.0/24"/>
  <masquerade/>
  <interface name="eth1"/>
  <forward/>
</zone>
```

- zone：区域定义
  - version：版本
  - target：区域默认动作
    - ACCEPT：允许所有
    - %%REJECT%%：拒绝每个不匹配的数据包
    - DROP：丢弃每个不匹配的数据包
- short：区域名称
- description：区域描述
- service：区域允许的服务
- port：区域允许的端口
- source：区域允许的IP或者网络
- masquerade：存在开启地址伪装
- interface：属于区域的端口
- forward：开启转发

### 2.默认区域

默认区域是用于所有未明确绑定/分配给另一个区域的区域。这意味着如果没有分配给连接、接口或源的区域，则仅使用默认区域。默认区域并不总是列为用于接口或源，因为它会以任何一种方式用于它。这取决于接口的管理器。

## 1.2 firewalld基础规则配置

firewalld规则配置使用`firewall-cmd`命令，配置方式分为临时配置与永久配置，临时配置配置即生效，永久配置需要加`--permanent`，配置完成后需要执行`firewall-cmd --reload`重新加载配置才会生效。

大多数情况下用户使用public区域即可满足大部分需求，默认的public区域只允许访问主机的ssh(22)以及dhcpv6-client服务，主机访问外面不影响。

### 1.服务规则管理

firealld可以直接开放一些常见的服务端口，但是服务方式开通的端口无法过滤其他规则，只会过滤端口，如果开通表示这个服务端口可被所有主机访问。

- firewall-cmd --get-services：所有支持的服务查看
- firewall-cmd --info-service=ssh：查看某个服务的详细信息

**服务规则添加详细**

- firewall-cmd --zone=public --add-service=nfs：添加服务规则
- firewall-cmd --zone=public --remove-service=nfs：删除服务规则
- firewall-cmd --zone=public --query-service=nfs：验证服务规则是否开通

### 2.端口规则

端口协议支持tcp,udp

- firewall-cmd --zone=public --add-port=5900/tcp：添加开放端口
- firewall-cmd --zone=public --remove-port=5900/tcp：删除开放端口
- firewall-cmd --zone=public --query-port=5900/tcp：验证端口是否开放

### 3.IP规则

支持IP与网段规则开放

- firewall-cmd --add-source=192.168.10.1/32：添加
- firewall-cmd --remove-source=192.168.10.1/32：删除
- firewall-cmd --query-source=192.168.10.1/32：验证

### 4.端口转发规则

支持不同端口或IP数据内部转发，需要打开内存参数`net.ipv4.ip_forward = 1`。

- firewall-cmd --add-masquerade --zone=public：开启区域IP伪装
- ```bash
  firewall-cmd --add-forward-port=port=228:proto=tcp:toport=22:toaddr=10.202.42.16 --zone=public
  #说明本机228(tcp)端口转发到10.202.42.16的22端口,注意配置完成后本机是无法访问的，只有外部机器访问才可以
  ```
- firewall-cmd --remove-forward-port=port=228:proto=tcp:toport=22:toaddr=10.202.42.16 --zone=public：删除
- firewall-cmd --query-forward-port=port=228:proto=tcp:toport=22:toaddr=10.202.42.16 --zone=public：验证

## 1.3 ipset

ipset是ip地址的集合，firewalld使用ipset可以在一条规则中处理多个ip地址，执行效果更高,对ip地址集合的管理也更方便。注意与iptables所用的ipset命令的不同，不要混合使用firewall-cmd的ipset参数与linux平台上的ipset命令，避免引起冲突,firewalld的ipset会记录到/etc/firewalld/ipsets/目录下

**相关命令如下**

- firewall-cmd --get-ipset-types：查看所有ipset类型
- firewall-cmd --permanent --new-ipset=ngx_ip_block --type=hash:ip：新建ipset
- firewall-cmd --permanent --ipset=ngx_ip_block --add-entry=171.8.173.138：在ipset添加IP
- firewall-cmd --permanent --ipset=ngx_ip_block --remove-entry=171.8.173.138：从ipset删除IP
- firewall-cmd --permanent --ipset=ngx_ip_block --get-entries：列出ipset中所有内容
- firewall-cmd --permanent --delete-ipset=ngx_ip_block：删除ipset
- firewall-cmd --permanent --info-ipset=ngx_ip_block：打印ipset详细内容
- firewall-cmd --permanent --get-ipsets：列出所有ipset
- firewall-cmd --permanent --ipset=ngx_ip_block --query-entry=1.1.1.1：判断一个地址是否存在在set中
- firewall-cmd --permanent --path-ipset=ngx_ip_block：打印一个set的文件路径

### 1.ipset类型详解

只介绍几种常见的。

- hash:ip：使用hash这种类型的存储类型存储ip，通过将冲突元素存储在数组中来解决冲突，最后通过动态增长hash来解决冲突；相同的大小的网络地址也可以存储在hash:ip类型的集合中
- hash:net：使用hash这种类型的存储存储CIDR的net，这个地方可能会有不同的大小，使用这个技术可以避免和hash:ip集合类型的冲突

### 2.示例

```bash
#创建ipset
firewall-cmd --permanent --new-ipset=vnc --type=hash:net
#添加地址
firewall-cmd --permanent --ipset=vnc --add-entry=10.136.74.40/3
#使用ipset创建规则
firewall-cmd --permanent --zone=public --add-rich-rule='rule family=ipv4 source ipset=vnc accept'
```

## 1.4 富规则详解

Firewalld的富规则提供了更细粒度的控制，以允许或阻止特定的流量。可以匹配多个过滤条件，使防火墙变的更加灵活

**相关命令**

- firewall-cmd --permanent --zone=public --add-rich-rule：添加富规则
- firewall-cmd --permanent --zone=public --remove-rich-rule：删除富规则
- firewall-cmd --list-all --zone=public：可以查看富规则

**富规则详解**

富规则语法如下

```
rule family=ipv4 source address=xx (service name=xxx)(port port=xxx protocol=tcp/udp) accept/reject/dorp
```

- family:适用于那些ip协议
  - ipv4
  - ipv6
- source:源信息
  - not：可选，反转匹配条件
  - address：地址信息可以写IP地址也可以写网络地址
    - 192.168.10.1
    - 192.168.10.1/32
  - ipset：引用ipset，填写ipset名称
  - mac：mac地址
- service：服务信息
  - name:服务名称
- port：本机开放端口信息
  - protocol：协议
    - udp
    - tcp
    - sctp
    - dccp
  - port：具体端口
- protocol：除了tcp/udp，其他协议
  - value: 可查看`/etc/protocols`文件获取
- limit：限制定义
  - value：限制的值
    - 5/m：一分5次
- timeout：设置超时时间默认5分
  - value：具体值
    - 30s
- log：定义日志
  - prefix：日志添加的前缀
  - level：日志级别
    - info
- 动作
  - accept：允许
  - reject：拒绝
  - dorp：丢弃

### 1.示例

```bash
#拒绝icmp协议
firewall-cmd --permanent --zone=public --add-rich-rule="rule family=ipv4 protocol value=icmp reject"
#允许ipset中的IP集合访问本机
firewall-cmd --permanent --zone=public --add-rich-rule="rule family=ipv4 source ipset=vnc accept"
#允许访问ssh服务
firewall-cmd --add-rich-rule="rule family=ipv4 service name=ssh accept"
#允许某些ip访问本机
firewall-cmd --add-rich-rule="rule family=ipv4 source address=10.136.74.40 accept"
#允许某些地址访问某些服务或者端口
firewall-cmd --add-rich-rule="rule family=ipv4 source address=10.136.74.40 port port=22 protocol=tcp accept"
firewall-cmd --add-rich-rule="rule family=ipv4 source address=10.136.74.40 service name=ssh accept"
#限制ssh服务连接次数
firewall-cmd --add-rich-rule="rule family=ipv4 service name=ssh limit value=1/m accept"
#日志配置
firewall-cmd --add-rich-rule='rule family=ipv4 service name=ssh limit value=1/m accept log prefix="SSH service" level=info'
```

## 1.5 开启firewalld日志记录

在firewalld的默认配置是不记录日志，我们通过日志记录下防火墙过滤时拒绝的非法ip,可以主动把这些有攻击性的ip加入到黑名单，防患于未然

**日志开启**

```bash
vi /etc/firewalld/firewalld.conf
LogDenied=all
```

- 默认值是off,即不记录被拒的包
- 设置为all,表示记录所有被拒的包

验证

- firewall-cmd --get-log-denied

日志查看

```bash
dmesg
```

# 二、docker与firewalld一起使用

需要在docker配置文件关闭docker自动创建iptables规则功能，后启用firewalld，之后可以正常配置其规则即可。

示例：

```
cat /etc/docker/daemon.json 
{
  "iptables": false
}
```

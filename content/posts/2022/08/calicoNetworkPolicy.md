---
title: "Calico网络策略详解"
date: 2022-08-24T10:22:17+08:00
draft: false
description: "讲解 Calico 网络策略的概念与配置，限制集群内 Pod 之间的访问流量。"
cover: "https://b3logfile.com/bing/20190514.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["Kubernetes"]
tags: ["Calico"]
toc: true
---
# 一、Calico网络策略介绍

官方文档：https://projectcalico.docs.tigera.io/about/about-network-policy

## 1.1 什么是kubernetes网络策略

网络策略是保护Kubernetes网络的主要工具。它允许你轻松限制集群中的网络流量，以便只允许您想要流动的流量。

为了理解网络策略的重要性，让我们简单探讨一下网络安全通常是如何在网络策略之前实现的。在企业网络中，网络安全是通过设计网络设备（交换机、路由器、防火墙）的物理拓扑及其相关配置来提供的。物理拓扑定义了网络的安全边界。在虚拟化的第一阶段，相同的网络和网络设备构造在云中被虚拟化，并且用于创建（虚拟）网络设备的特定网络拓扑的相同技术被用于提供网络安全。添加新的应用程序或服务通常需要额外的网络设计来更新网络拓扑和网络设备配置，以提供所需的安全性。

相比之下，Kubernetes 网络模型定义了一个平面网络，其中每个 pod 都可以使用 pod IP 地址与集群中的所有其他 pod 进行通信。这种方法极大地简化了网络设计，并允许在集群中的任何位置动态调度新的工作负载，而不依赖于网络设计。在此模型中，网络安全不是由网络拓扑边界定义的，而是使用独立于网络拓扑的网络策略来定义的。通过使用标签选择器作为定义哪些工作负载可以与哪些工作负载通信的主要机制，而不是 IP 地址或 IP 地址范围，网络策略进一步从网络中抽象出来。

## 1.2 Calico 网络策略

除了执行 Kubernetes 网络策略之外，Calico 还支持自己的命名空间NetworkPolicy和非命名空间GlobalNetworkPolicy资源，它们提供了 Kubernetes 网络策略支持之外的其他功能。这包括支持

- 策略排序/优先级
- 在规则中拒绝和记录操作
- 用于应用策略和策略规则的更灵活的匹配标准，包括 Kubernetes ServiceAccounts 上的匹配，以及（如果使用 Istio 和 Envoy）加密身份和第 5-7 层匹配标准，例如 HTTP 和 gRPC URL
- 能够在策略中引用非 Kubernetes 工作负载，包括 在策略规则中匹配NetworkSet

虽然Kubernetes网络策略仅适用于pod，但Calico网络策略可以应用于多种类型的端点，包括 pod、VM 和主机接口。

# 二、Calico网络策略

Calico 网络策略提供了比 Kubernetes 更丰富的策略能力，包括：策略排序/优先级、拒绝规则和更灵活的匹配规则。虽然 Kubernetes 网络策略仅适用于 pod，但 Calico 网络策略可以应用于多种类型的端点，包括 pod、VM 和主机接口。最后当与 Istio 服务网格一起使用时，Calico 网络策略支持保护应用程序第 5-7 层匹配标准和加密身份。

无论您现在使用哪个云提供商，采用 Calico 网络策略意味着您编写一次策略并且它是可移植的。如果您迁移到其他云提供商，则无需重写 Calico 网络策略。Calico 网络策略是避免云提供商锁定的关键功能。

**Calico NetworkPolicy支持以下功能**：

- 策略可以应用于任何类型的端点：pod/容器、虚拟机和/或主机接口
- 策略可以定义适用于入口、出口或两者的规则
- 政策规则支持：
  - 操作：允许、拒绝、记录、通过
  - 源和目标匹配条件：
    - 端口：编号、范围内的端口和 Kubernetes 命名的端口
    - 协议：TCP、UDP、ICMP、SCTP、UDPlite、ICMPv6、协议号 (1-255)
    - HTTP 属性（如果使用 Istio 服务网格）
    - ICMP 属性
    - IP 版本（IPv4、IPv6）
    - IP 或 CIDR
    - 端点选择器（使用标签表达式来选择 pod、VM、主机接口和/或网络集）
    - 命名空间选择器
    - 服务帐户选择器
- **可选的数据包处理控制**：禁用连接跟踪、在 DNAT 之前应用、应用于转发流量和/或本地终止流量

## 2.1 相关概念

### 1.Endpoints(端点)

Calico 网络策略适用于(endpoints)端点。在 Kubernetes 中，每个 pod 都是一个 Calico 端点。但是，Calico 可以支持其他类型的端点。Calico 端点有两种类型：(workload endpoints)工作负载端点（例如 Kubernetes pod 或 OpenStack VM）和(host endpoints)主机端点（主机上的一个接口或一组接口）。

### 2.命名空间和全局网络策略

Caliconetworkpolicy是一种命名空间资源，适用于该命名空间中的 pod/容器/VM

```yaml
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: allow-tcp-6379
  namespace: production
```

Calicoglobalnetworkpolicy是一种非命名空间资源，可以应用于独立于命名空间的任何类型的端点（pod、VM、主机接口）。

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: allow-tcp-port-6379
```

### 3.入口(Ingress)或出口(egress)

每个网络策略规则都适用于入口或出口流量。从端点（pod、VM、主机接口）的角度来看，入口是到端点的传入流量，出口是从端点传出的流量。在 Calico 网络策略中，您可以独立创建入口和出口规则（出口、入口或两者）。

您可以使用`types`字段指定策略是否适用于入口、出口或两者。如果您不使用类型字段，Calico 默认为以下行为。

- types字段未指定，或者什么都没有默认存在ingress
- types字段指定了egress，则只存在egress
- types字段指定了两者，则两者都存在

```yaml
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: allow
  namespace: production
spec:
  types:
    - Egress
    - Ingress
```

### 4.网络流量行为拒绝和允许

Kubernetes 网络策略规范定义了以下行为：

- 如果没有网络策略适用于 pod，则允许进出该 pod 的所有流量。
- 如果一个或多个网络策略适用于包含入口规则的 pod，则仅允许这些策略允许的入口流量。
- 如果一个或多个网络策略应用于包含出口规则的 pod，则仅允许这些策略允许的出口流量。

为了与 Kubernetes 兼容，Calico 网络策略对 Kubernetes pod 遵循相同的行为。对于其他端点类型（VM、主机接口），Calico 网络策略默认为拒绝。也就是说，即使没有网络策略适用于端点，也只允许网络策略特别允许的流量

### 5.网络策略的选择器(Selector)

标签选择器是根据标签匹配或不匹配资源的表达式。Calico标签选择器支持许多运算符，可以使用布尔运算符和括号将它们组合成更大的表达式。

| 表达                                   | 意义                                                         |
| :------------------------------------- | :----------------------------------------------------------- |
| **逻辑运算符**                         |                                                              |
| 'has(app)'                             | 仅匹配标签名称为app。（括号用于对表达式进行分组。）          |
| '!has(app)'                            | 匹配标签名称不是app的                                        |
| 'has(app) && has(pod-template-hash)'   | 并且                                                         |
| 'has(app) \|\| has(pod-template-hash)' | 或关系                                                       |
| **匹配运算符**                         |                                                              |
| all()                                  | 匹配所有范围内的资源。不写Selector默认为所有                 |
| global()                               | 匹配所有非命名空间资源。用于`namespaceSelector`选择全局资源，例如全局网络集。 |
| k == 'v'                               | 匹配带有标签“k”和值“v”的资源。                               |
| k != 'v'                               | 匹配没有标签“k”或标签“k”且值不等于的资源v                    |
| k in { 'v1', 'v2' }                    | 匹配给定集中带有标签“k”和值的资源                            |
| k not in { 'v1', 'v2' }                | 匹配没有标签“k”或标签“k”且值不在给定集中的资源               |

示例

```yaml
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: allow
  namespace: demo-net
spec:
  selector: 'has(app) && has(pod-template-hash)'
  types:
  - Ingress
  - Egress
```

### 6.ingress与egress规则说明

单个规则匹配一组数据包并对它们应用一些操作。指定多个规则时，按顺序执行。

| 定义        | 描述                           | 接受值                                          |
| :---------- | :----------------------------- | :---------------------------------------------- |
| metadata    | 每个规则的元数据，一般用于注释 |                                                 |
| action      | 匹配此规则时要执行的操作。     | Allow(允许), Deny(拒绝), Log(记录),Pass（跳过） |
| protocol    | 协议匹配。                     | TCP, UDP, ICMP, ICMPv6, SCTP, UDPLite, 1-255    |
| source      | 源匹配参数。                   | 实体规则                                        |
| destination | 目的地匹配参数。               | 实体规则                                        |

**实体规则**

实体规则指定必须匹配的数据包的源或目标的属性，以使规则作为一个整体进行匹配。数据包在其IP和端口上匹配。如果规则包含多个匹配条件（例如，一个 IP 和一个端口），则所有匹配条件都必须匹配，才能使整个规则匹配。

|                   |                                                              |                                            |
| :---------------- | :----------------------------------------------------------- | :----------------------------------------- |
| 定义              | 描述                                                         | 接受值                                     |
| nets              | 将数据包与任何列出的 CIDR 中的 IP 匹配。                     | 有效 IPv4 CIDR 列表或有效 IPv6 CIDR 列表） |
| selector          | 选定端点上的正匹配。如果`namespaceSelector`还定义了 a，则适用的端点集仅限于所选命名空间中的端点。 | 选择器                                     |
| namespaceSelector | 如果指定，则仅匹配所选 Kubernetes 命名空间中的工作负载端点。根据已应用于命名空间的标签匹配命名空间。 | 选择器                                     |
| ports             | 指定端口上的正匹配                                           |                                            |
| serviceAccounts   | 匹配在服务帐户下运行的端点。如果`namespaceSelector`还定义了 a，则适用的服务帐户集仅限于所选命名空间中的服务帐户。 | 选择器/名称                                |

在一个`Log`动作之后，处理继续下一个规则；`Allow`并且`Deny`是即时和最终的，不会处理进一步的规则。`Log`会记录日志到pod宿主机syslog。

**示例**

```yaml
destination:
      selector: k8s-app == 'kube-dns'
      namespaceSelector: project == 'kube-system'
      ports:
      - 3306
      nets:
      - 172.29.81.182/32
      serviceAccounts:
        selector: app == 'net' 
        name: default
```

## 2.2 部署安装calico

不同的部署calico方式生成calico的配置文件有所不同，在创建网络策略时可以使用yaml事先编写规则文件之后使用`calicoctl apply -f `进行创建与修改，使用`calicoctl delete -f`进行删除。

### 1.使用calio-etcd部署

```bash
mkdir /etc/calico -p
cat >/etc/calico/calicoctl.cfg <<EOF
apiVersion: projectcalico.org/v3
kind: CalicoAPIConfig
metadata:
spec:
  etcdEndpoints: https://192.168.10.51:2379,https://192.168.10.52:2379,https://192.168.10.53:2379
  etcdKeyFile: /etc/etcd/ssl/etcd-client-key.pem
  etcdCertFile: /etc/etcd/ssl/etcd-client.pem
  etcdCACertFile: /etc/etcd/ssl/ca.pem
EOF
```

### 2.使用calico或calico-typha部署

```bash
mkdir /etc/calico -p
cat >/etc/calico/calicoctl.cfg <<EOF
apiVersion: projectcalico.org/v3
kind: CalicoAPIConfig
metadata:
spec:
  datastoreType: "kubernetes"
  kubeconfig: "/root/.kube/config"
EOF
```

## 2.3 NetworkPolicy使用

### 1.示例文件

```yaml
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: allow  #规则名称
  namespace: demo-net #命名空间
spec:
  order: 20  #优先级，值越低优先级越高
  selector: run == 'test' #匹配的端点，这里为pod
  types:  #设置规则的类型
  - Ingress  #入口
  - Egress   #出口
  ingress:  #入口规则定义
  - action: Allow  #动作允许
    metadata:  #规则源数据信息
      annotations:
        from: frontend
        to: database
    protocol: 'TCP' #协议
    source:  #源匹配
      selector: run == 'test'  #匹配端点
    destination:  #目的匹配
      ports:    #匹配端口
      - 3306:6379
      - 80
      nets:  #匹配地址
      - 172.29.81.182/32  
  - action: Log  #动作记录，会记录到pod宿主机syslog中，默认存储在/var/log/messages
    protocol: 'ICMP'
  - action: Allow
    protocol: 'ICMP'
  egress:  #出口规则定义
  - action: Allow
    protocol: 'UDP'
    destination:
      selector: k8s-app == 'kube-dns'
      namespaceSelector: project == 'kube-system'
      ports:
      - 53
```

**注意**：一个action中的多个条件为并且关系，需要都满足。

### 2.为特定流量生成日志

在以下示例中，应用程序的传入 ICMP 流量被拒绝，并且每次连接尝试都会记录到 syslog。

```yaml
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: allow
  namespace: demo-net
spec:
  types:
  - Ingress
  - Egress
  ingress:
  - action: Log
    protocol: 'ICMP'
  - action: Allow
    protocol: 'ICMP'
```

记录的日志查看需要到pod宿主机中查看。

```bash
[root@k8s-node-12-kty-sc ~]# tail -f /var/log/messages -n0
Aug  8 15:52:10 k8s-node-12-kty-sc kernel: calico-packet: IN=tunl0 OUT=calic49782d2bdb MAC= SRC=172.28.31.98 DST=172.29.81.183 LEN=84 TOS=0x00 PREC=0x00 TTL=62 ID=9430 DF PROTO=ICMP TYPE=8 CODE=0 ID=97 SEQ=0
```

### 3.网络集使用

网络集资源 (NetworkSet) 表示任意 IP 子网/CIDR 集，允许它与 Calico 策略匹配。网络集对于将策略应用于来自（或去往）外部、非 Calico 网络的流量很有用。

`NetworkSet`是一个命名空间资源。`NetworkSets`在特定命名空间中仅适用于该命名空间中的网络策略 。`namespace` 如果两个资源的值设置相同，则两个资源位于同一个命名空间中。

每个网络集的元数据包括一组标签。当 Calico 计算应与 网络策略规则中的源/目标选择器匹配的 IP 集时，它包括来自与选择器匹配的任何网络集的 CIDR。

**重要提示**：由于 Calico 根据其源/目标 IP 地址匹配数据包，如果在启用 Calico 的节点和网络集中列出的网络之间存在 NAT，Calico 规则可能不会按预期运行。例如，在 Kubernetes 中，通过服务 IP 的传入流量通常在到达目标主机之前由 kube-proxy 进行 SNAT，因此 Calico 的工作负载策略会将 kube-proxy 的主机 IP 作为源而不是真实源。

**NetworkSets示例**

```yaml
apiVersion: projectcalico.org/v3
kind: NetworkSet
metadata:
  name: external-database
  namespace: demo-net
  labels:
    set: net
spec:
  nets:
  - 172.29.51.192/32
  - 172.29.51.193/32
```

使用如下

```yaml
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: allow
  namespace: demo-net
spec:
  selector: app == 'mysql'
  types:
  - Ingress
  ingress:
  - action: Log
  - action: Allow
    protocol: 'TCP'
    destination:
      ports:
      - 3306
    source:
      selector: set == 'net'  #匹配标签即可
```

### 4.在策略中使用服务账户(sa)

使用 Calico 网络策略，您可以利用 Kubernetes 服务帐户和 RBAC 来灵活控制策略在集群中的应用方式。

**创建sa服务账户**

```bash
#创建
kubectl create sa demo-net -n demo-net
#添加标签
kubectl label sa -n demo-net demo-net net=true
#需要应用这个sa到pod
```

**创建规则**

```yaml
kind: NetworkPolicy
metadata:
  name: allow
  namespace: demo-net
spec:
  selector: app == 'mysql'
  types:
  - Ingress
  ingress:
  - action: Allow
    protocol: 'TCP'
    source:
      namespaceSelector: demo == 'net'  #sa所在的命名空间
      serviceAccounts: #匹配sa名称
        names:
        - demo-net 
    destination:  
      ports:    
      - 3306
  - action: Allow
    protocol: 'ICMP'
    source:
      namespaceSelector: demo == 'net' #sa所在的命名空间
      serviceAccounts: #匹配sa标签
        selector: net == 'true'
```

## 2.4 GlobalNetworkPolicy使用

全局网络策略资源 ( `GlobalNetworkPolicy`) 表示一组有序的规则，这些规则应用于与标签选择器匹配的端点集合。`GlobalNetworkPolicy`不是命名空间资源。`GlobalNetworkPolicy`适用于所有命名空间中的工作负载端点资源，以及托管端点资源。

`GlobalNetworkPolicy`资源可用于定义 Calico 端点组和主机端点之间的网络连接规则，也就是限制k8s工作节点主机网络。NetworkPolicy中的使用示例在GlobalNetworkPolicy也适用。

**示例文件**

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: allow
spec:
  order: 20  #优先级，值越低优先级越高
  selector: run == 'test' #匹配的端点，这里为pod
  types:  #设置规则的类型
  - Ingress  #入口
  - Egress   #出口
  ingress:  #入口规则定义
  - action: Allow  #动作允许
    metadata:  #规则源数据信息
      annotations:
        from: frontend
        to: database
    protocol: 'TCP' #协议
    source:  #源匹配
      selector: run == 'test'  #匹配端点
    destination:  #目的匹配
      ports:    #匹配端口
      - 3306:6379
      - 80
      nets:  #匹配地址
      - 172.29.81.182/32  
  - action: Log  #动作记录，会记录到pod宿主机syslog中，默认存储在/var/log/messages
    protocol: 'ICMP'
  - action: Allow
    protocol: 'ICMP'
  egress:  #出口规则定义
  - action: Allow
    protocol: 'UDP'
    destination:
      selector: k8s-app == 'kube-dns'
      namespaceSelector: project == 'kube-system'
      ports:
      - 53
```

### 1.全局网络集使用

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkSet
metadata:
  name: a-name-for-the-set
  labels:
    role: external-database
spec:
  nets:
  - 198.51.100.0/28
  - 203.0.113.0/24
```

**使用**

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: allow
spec:
  selector: app == 'mysql'
  types:
  - Ingress
  ingress:
  - action: Allow
    protocol: 'TCP'
    destination:
      ports:
      - 3306
    source:
      selector:  role == 'external-database'  #匹配标签即可
```

# 三、主机策略

官方文档：https://projectcalico.docs.tigera.io/security/protect-hosts

使用Calico网络策略来限制进出主机的流量。限制主机与外部网络之间的流量并不是Calico独有的，许多解决方案都提供了这种能力。但是，使用Calico保护主机的优势是您可以使用与工作负载相同的Calico策略配置。你只需要学习一种工具。编写一个集群范围的策略，它会立即应用于每个主机。

**相关资源**

- **HostEndpoint(主机端点)**
- **GlobalNetworkPolicy(全局网络策略)**
- **FelixConfiguration(Felix默认配置文件,以下为相关的配置参数)**
  - **failsafeInboundHostPorts(默认开放的入口端口以及协议)**
  - **failsafeOutboundHostPorts(默认开放的出口端口与协议)**
  - **defaultEndpointToHostAction(此参数控制流量到达主机端点动作，默认为DROP拒绝)**

## 3.1 相关概念

### 1.HostEndpoint

每台主机都有一个或多个用于与外部通信的网络接口。您可以使用Calico网络策略来保护这些接口（称为主机端点）。Calico主机端点可以有标签，它们的工作方式与工作负载端点上的标签相同。网络策略规则可以使用标签选择器应用于工作负载和主机端点。

**资源示例文件如下**

```yaml
apiVersion: projectcalico.org/v3
kind: HostEndpoint
metadata:
  name: my-host-eth0  #主机端点名称
  labels:             #相关标签
    role: k8s-worker
    environment: production
spec:           
  interfaceName: eth0  #节点应用网络接口名称,可以写*表示所有
  node: my-host        #calico的node节点名称，必须以calico中的node名称为准，不能写k8s的node名称
  expectedIPs: ["10.0.0.1"] #网络接口的IP地址
```

### 2.FelixConfiguration

官方文档：https://projectcalico.docs.tigera.io/reference/resources/felixconfig#spec

**修改默认出入站规则**

由于配置错误的网络策略，很容易无意中切断所有主机连接。为避免由于配置错误的网络策略而无意中切断所有主机连接，Calico 使用故障安全规则在所有主机端点上打开特定端口和CIDR。

下表以确定默认值是否适用于您的实施。如果需要修改，请使用配置 Felix中的参数`FailsafeInboundHostPorts`和`FailsafeOutboundHostPorts`更改默认端口。

| 端口 | 协议 | CIDR      | 方向             | 目的                      |
| :--- | :--- | :-------- | :--------------- | :------------------------ |
| 22   | TCP  | 0.0.0.0/0 | Inbound          | SSH 访问                  |
| 53   | UDP  | 0.0.0.0/0 | Outbound         | DNS 查询                  |
| 67   | UDP  | 0.0.0.0/0 | Outbound         | DHCP 访问                 |
| 68   | UDP  | 0.0.0.0/0 | Inbound          | DHCP 访问                 |
| 179  | TCP  | 0.0.0.0/0 | Inbound/Outbound | BGP 访问（Calico 网络）   |
| 2379 | TCP  | 0.0.0.0/0 | Inbound/Outbound | etcd 访问                 |
| 2380 | TCP  | 0.0.0.0/0 | Inbound/Outbound | etcd 访问                 |
| 6443 | TCP  | 0.0.0.0/0 | Inbound/Outbound | Kubernetes API 服务器访问 |
| 6666 | TCP  | 0.0.0.0/0 | Inbound/Outbound | etcd 自托管服务访问       |
| 6667 | TCP  | 0.0.0.0/0 | Inbound/Outbound | etcd 自托管服务访问       |

修改相关示例：

```yaml
#导出默认配置
calicoctl get felixconfiguration default --export -o yaml > default-felix-config.yaml
#修改
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  creationTimestamp: null
  name: default
spec:
  bpfLogLevel: ""
  ipipEnabled: true
  logSeverityScreen: Info
  reportingInterval: 0s
  defaultEndpointToHostAction: #主机端点默认规则动作Accept(允许)，Drop(丢弃)。默认为丢弃
  failsafeInboundHostPorts:  #默认入站规则
  - protocol: tcp  #协议类型,tcp, udp, sctp
    port: 22       #端口,0-65535
    net: 192.168.1.0/24 #CIDR
  - protocol: udp
    port: 68
  ....
  failsafeOutboundHostPorts:  #默认出站规则
  - protocol: udp
    port: 53
  - protocol: udp
    port: 67
```

**访问主机端点默认策略**

访问主机端点的默认动作为DROP拒绝，如果需要修改请配置defaultEndpointToHostAction，可配置的动作有Drop(丢弃), Return(返回), Accept(接受)。

## 3.2 主机策略使用详解

### 1.手动配置主机端点

**创建主机端点**

在创建主机端点后即表示这个主机端点的默认策略与默认规则将生效。如果对默认策略规则不满意可以自行进行修改`FelixConfiguration`配置。

```yaml
apiVersion: projectcalico.org/v3
kind: HostEndpoint
metadata:
  name: node-10.122.6.76   #主机端点名称
  labels:                  #标签
    role: k8s-worker
    k8s-node: node-10.122.6.76
spec:
  interfaceName: eth0      #想要应用策略的接口，可以使用*进行全部接口匹配
  node: 10.122.6.76        #此主机端点所在的calico节点名称使用calico get node -owide确定必须与这个名称一致
  expectedIPs: ["10.122.6.76"]  #与接口关联的预期IP地址
```

### 2.k8s自动生成主机端点

由于主机端点生成后会应用默认策略规则，所以为避免策略错误导致主机无法连接访问等问题，所以需要提前配置好策略在执行自动生成主机端点，最大可能把影响降到最低。

要启用自动主机端点，请编辑默认的 KubeControllersConfiguration 实例，并设置`spec.controllers.node.hostEndpoint.autoCreate`为`true`：

```bash
calicoctl patch kubecontrollersconfiguration default --patch='{"spec": {"controllers": {"node": {"hostEndpoint": {"autoCreate": "Enabled"}}}}}'
```

执行完成后应看到生成的主机端点

```bash
calicoctl get heps -owide
```

主机端点的默认标签会使用k8s的node节点标签，所以只要在k8s中给node创建标签就会同步到calico的node资源中。

### 3.主机端点策略

主机端点的策略使用`GlobalNetworkPolicy`进行配置，匹配主机端点的标签即可,k8s主机节点比较特殊需要额外配置。

**常规主机端点策略配置示例**

使用kube-proxy并且工作方式为ipvs的node节点不适用。

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: host-networkpolicy
spec:
  selector: role == 'host'
  types:
  - Ingress
  - Egress
  ingress:  #入口流量策略配置
  - action: Allow
    source:
      nets:
      - 10.122.4.0/22
  - action: Allow
    protocol: 'TCP'
    source:
      nets:
      - 10.122.160.0/20
    destination:
      ports:
      - 22
  egress:  #出口流量允许所有
  - action: Allow
```

**k8s节点主机端点策略**

适用与k8s节点，由于k8s中nodeport类型的svc资源会在所有的k8s节点打开一个主机端口，当有其他客户端访问这个接口时k8s的node节点会进行DNAT，这个DNAT是在calico的策略生效之前执行的所有以上的策略并不会对nodeport端口生效。以下配置在DNAT之前生效的特殊策略。此特殊策略只有`Ingress`规则，没有`Egress`规则，如需要指定`Egress`规则使用常规的`GlobalNetworkPolicy`即可。

DNAT操作默认情况下都会执行，并不存在拒绝一说，所以需要使用order把DNAT之前执行的策略进行排序，允许放在前面，最后进行拒绝所有请求的策略。

注意：使用这个策略时主机端点的`interfaceName`必须指定接口名称不能指定为`*`。

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy  
metadata:
  name: k8s-work-nodeport-allow  #第一个策略允许访问节点的策略，一般写成node节点的默认策略
spec:
  order: 10   #权重最高，越小的被最先执行
  preDNAT: true  #在DNAT之前执行
  applyOnForward: true #应用与本机转发的流量以及本机流量
  ingress:
  - action: Allow
    source:
      nets:
      - 10.122.4.0/22
  - action: Allow
    protocol: 'TCP'
    source:
      nets:
      - 10.122.160.0/20
    destination:
      ports:
      - 22
  selector: role == 'k8s-worker' #通过标签选择相应的节点
---
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: k8s-work-nodeport-allow-75  #特定节点开放某些nodeport端口
spec:
  order: 11 #权重需要比默认低
  preDNAT: true
  applyOnForward: true
  ingress:
  - action: Allow
    protocol: 'TCP'
    source:
      nets:
      - 10.122.160.0/20
    destination:
      ports:
      - 30001:30005
  selector: k8s-node == 'node-10.122.6.75' #通过标签选择相应的节点
---
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: k8s-work-nodeport-deny  #拒绝所有请求
spec:
  order: 20 #权重应该最低
  preDNAT: true
  applyOnForward: true
  ingress:
    - action: Deny
  selector: role == 'k8s-worker' #通过标签选择相应的节点
---
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: k8s-work-egress-allow  #节点的出口流量全部允许
spec:
  egress:
    - action: Allow
  selector: role == 'k8s-worker' #通过标签选择相应的节点
```

## 3.3 k8s主机安全加固示例

### 1.手动配置主机端点示例

**首先修改calico默认规则**

```bash
#导出默认配置
calicoctl get felixconfiguration default --export -o yaml > default-felix-config.yaml
#修改默认规则集
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  creationTimestamp: null
  name: default
spec:
  bpfLogLevel: ""
  ipipEnabled: true
  logSeverityScreen: Info
  reportingInterval: 0s
```

**配置默认规则**

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy  
metadata:
  name: k8s-work-nodeport-allow  #第一个策略允许访问节点的策略，一般写成node节点的默认策略
spec:
  order: 10   #权重最高，越小的被最先执行
  preDNAT: true  #在DNAT之前执行
  applyOnForward: true #应用与本机转发的流量以及本机流量
  ingress:
  - action: Allow
    source:
      nets:
      - 192.168.10.0/24  #这里填写k8s的集群所使用的网络地址
  - action: Allow
    protocol: 'TCP'
    source:
      nets:
      - 192.168.10.1/32 #填写允许远程连接ssh的主机IP
    destination:
      ports:
      - 22
  selector: role == 'k8s-worker' #通过标签选择相应的节点
---
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: k8s-work-nodeport-allow-75  #允许访问nodeport的主机规则
spec:
  order: 11  #权重需要比默认低
  preDNAT: true
  applyOnForward: true
  ingress:
  - action: Allow
    protocol: 'TCP'
    source:
      nets:
      - 192.168.10.1/32  #填写允许访问的主机
  selector: k8s-node == 'node-192.168.10.71' #匹配其中一个node节点即可
---
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: k8s-work-nodeport-deny  #拒绝所有请求规则
spec:
  order: 20 #权重应该最低
  preDNAT: true
  applyOnForward: true
  ingress:
    - action: Deny
  selector: role == 'k8s-worker' #通过标签选择所有节点
---
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: k8s-work-egress-allow  #节点的出口流量全部允许
spec:
  egress:
    - action: Allow
  selector: role == 'k8s-worker' #通过标签选择相应的节点
```

**配置主机端点**

```yaml
apiVersion: projectcalico.org/v3
kind: HostEndpoint
metadata:
  name: node-192.168.10.71
  labels:
    role: k8s-worker
    k8s-node: node-192.168.10.71
spec:
  interfaceName: eth0
  node: 192.168.10.71
  expectedIPs: ["192.168.10.71"]
```

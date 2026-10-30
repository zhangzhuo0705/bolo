---
title: "k8s网络策略"
date: 2022-08-05T15:52:46+08:00
draft: false
description: "覆盖 Kubernetes NetworkPolicy 的规则模型，演示默认策略和访问控制配置。"
cover: "https://b3logfile.com/bing/20210125.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["Kubernetes"]
tags: ["kubernetes"]
toc: true
---
# 一、NetworkPolicy基础概念

如果你希望在 IP 地址或端口层面（OSI 第 3 层或第 4 层）控制网络流量， 则你可以考虑为集群中特定应用使用 Kubernetes 网络策略（NetworkPolicy）。 NetworkPolicies 适用于一端或两端与 Pod 的连接，与其他连接无关。

Pod 可以通信的 Pod 是通过如下三个标识符的组合来辩识的

1. 其他被允许的 Pods（例外：Pod 无法阻塞对自身的访问）
2. 被允许的名字空间
3. IP 组块（例外：与 Pod 运行所在的节点的通信总是被允许的， 无论 Pod 或节点的 IP 地址）

**配置前置条件**

网络策略通过网络插件来实现。要使用网络策略，你必须使用支持 NetworkPolicy 的网络解决方案。 创建一个 NetworkPolicy 资源对象而没有控制器来使它生效的话，是没有任何作用的。使用支持网络策略的网络插件才可以正常使用网络策略如calico。

**Pod 隔离的两种类型**

Pod 有两种隔离: 出口的隔离和入口的隔离。它们涉及到可以建立哪些连接。 这里的“隔离”不是绝对的，而是意味着“有一些限制”。 另外的，“非隔离方向”意味着在所述方向上没有限制。这两种隔离（或不隔离）是独立声明的， 并且都与从一个 Pod 到另一个 Pod 的连接有关。

默认情况下，一个 Pod 的出口是非隔离的，即所有外向连接都是被允许的。如果有任何的 NetworkPolicy 选择该 Pod 并在其 `policyTypes` 中包含 “Egress”，则该 Pod 是出口隔离的， 我们称这样的策略适用于该 Pod 的出口。当一个 Pod 的出口被隔离时， 唯一允许的来自 Pod 的连接是适用于出口的 Pod 的某个 NetworkPolicy 的 `egress` 列表所允许的连接。 这些 `egress` 列表的效果是相加的。

默认情况下，一个 Pod 对入口是非隔离的，即所有入站连接都是被允许的。如果有任何的 NetworkPolicy 选择该 Pod 并在其 `policyTypes` 中包含 “Ingress”，则该 Pod 被隔离入口， 我们称这种策略适用于该 Pod 的入口。当一个 Pod 的入口被隔离时，唯一允许进入该 Pod 的连接是来自该 Pod 节点的连接和适用于入口的 Pod 的某个 NetworkPolicy 的 `ingress` 列表所允许的连接。这些 `ingress` 列表的效果是相加的。

网络策略是相加的，所以不会产生冲突。如果策略适用于 Pod 某一特定方向的流量， Pod 在对应方向所允许的连接是适用的网络策略所允许的集合。 因此，评估的顺序不影响策略的结果。

要允许从源 Pod 到目的 Pod 的连接，源 Pod 的出口策略和目的 Pod 的入口策略都需要允许连接。 如果任何一方不允许连接，建立连接将会失败。

# 二、NetworkPolicy配置文件说明

示例文件如下：

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: test-network-policy
  namespace: default   #网络策略也属于某个命名空间
spec:
  podSelector:  #每个NetworkPolicy都包括一个podSelector，它对该策略所适用的一组Pod进行选择。示例中的策略选择带有 "role=db"标签的Pod。空的podSelector选择名字空间下的所有Pod。
    matchLabels:
      role: db
  policyTypes: #每个NetworkPolicy都包含一个policyTypes列表，其中包含Ingress或Egress或两者兼具。policyTypes 字段表示给定的策略是应用于进入所选Pod的入站流量还是来自所选Pod的出站流量，或两者兼有。 如果 NetworkPolicy 未指定 policyTypes 则默认情况下始终设置 Ingress； 如果 NetworkPolicy 有任何出口规则的话则设置 Egress。
    - Ingress  #如果只写Ingress不写任何规则则默认拒绝所有流量
    - Egress   #如果只写Egress不写任何规则则默认拒绝所有流量
  ingress: #入口配置，每个NetworkPolicy可包含一个ingress规则的白名单列表。 每个规则都允许同时匹配from和ports部分的流量。
    - from:  #注意以下三种方式如果前面带-为或关系，如果什么不带则为且关系
        - ipBlock:  #地址块配置方式
            cidr: 172.17.0.0/16
            except: #排除的地址
              - 172.17.1.0/24 
        - namespaceSelector: #选择某个命名空间下所有pod
            matchLabels:
              project: myproject
        - podSelector:   #选择当前命名空间下某个pod
            matchLabels:
              role: frontend
      ports: #允许访问的端口协议配置
        - protocol: TCP
          port: 6379
  egress: #每个NetworkPolicy可包含一个egress规则的白名单列表。 每个规则都允许匹配to和port部分的流量。
    - to:  #配置与上面ingress相同
        - ipBlock:
            cidr: 10.0.0.0/24
      ports:
        - protocol: TCP
          port: 5978
```

## 2.1 选择器to和from的行为

可以在 `ingress` 的 `from` 部分或 `egress` 的 `to` 部分中指定四种选择器：

**podSelector**: 此选择器将在与 NetworkPolicy 相同的名字空间中选择特定的 Pod，应将其允许作为入站流量来源或出站流量目的地。

**namespaceSelector**：此选择器将选择特定的名字空间，应将所有Pod用作其入站流量来源或出站流量目的地。

**namespaceSelector** *和* **podSelector**：一个指定 `namespaceSelector` 和 `podSelector` 的 `to`/`from` 条目选择特定名字空间中的特定 Pod。 注意使用正确的YAML语法下面的策略：

```yaml
ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          user: alice
      podSelector:
        matchLabels:
          role: client
```

**ipBlock**: 此选择器将选择特定的 IP CIDR 范围以用作入站流量来源或出站流量目的地。 这些应该是集群外部 IP，因为 Pod IP 存在时间短暂的且随机产生。

# 三、NetworkPolicy的使用示例

## 3.1 创建示例环境

创建示例命名空间

```bash
kubectl create ns demo-net
```

创建示例应用

```bash
#创建mysql服务
kubectl create deploy mysql --image=192.168.6.77:5000/kubedb/mysql:5.7.25 -n demo-net
kubectl  set env deploy/mysql  MYSQL_ROOT_PASSWORD=mysql -n demo-net
#创建redis服务
kubectl create deploy redis --image=192.168.6.77:5000/kubedb/redis:6.0.6 -n demo-net
#验证创建的应用
[root@k8s-master-1-kty-sc ~]# kubectl get pod -n demo-net --show-labels 
NAME                     READY   STATUS    RESTARTS   AGE     LABELS
mysql-84b57dc776-zztmk   1/1     Running   0          2m24s   app=mysql,pod-template-hash=84b57dc776
redis-5b5f667d75-9xs5g   1/1     Running   0          53s     app=redis,pod-template-hash=5b5f667d75
```

## 3.2 默认策略的配置

注意如果需要对pod网络流量镜像控制即可先使用以下默认规则进行控制之后使用其他规则对一个或者多个pod实施其他策略多个策略作用到同一个pod他们是相加的。

### 1.默认拒绝所有入站流量

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: demo-net
spec:
  podSelector: {}  #如果这里为空则表示选择这个策略所在的命名空间所有pod
  policyTypes:
  - Ingress  #如果只写ingress不写任何规则表示拒绝所有入口流量
```

测试，正确情况下所有外部pod无法访问这俩个应用，但是运行pod的k8s的node节点是可以访问的。

### 2.默认拒绝所有出站流量

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-egress
spec:
  podSelector: {}
  policyTypes:
  - Egress
```

### 3.默认拒绝所有入站和所有出站流量

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
```

### 4.设置一个或者一组pod网络策略

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: mysql   #策略名称
  namespace: demo-net  #作用到那个命名空间
spec:
  podSelector:    #选择命名空间pod
    matchLabels:
      app: mysql
  policyTypes:    #配置那些策略
    - Ingress  #入口流量
  ingress:  #入口流量规则
    - from:  
        - ipBlock:  #允许某个IP的访问
            cidr: 172.28.43.0/32
        - namespaceSelector:  #允许某个命名空间下所有Pod访问
            matchLabels:  #匹配命名空间标签
              project: riped
        - podSelector:  #允许当前命名空间下某个Pod访问  
            matchLabels:  #匹配Pod标签
              app: redis
        - namespaceSelector:  #允许某个命名空间下某个Pod访问
            matchLabels: 
              project: default
          podSelector:   
            matchLabels:  
              run: test
      ports:  #允许访问的端口
        - protocol: TCP
          port: 6379
        - protocol: TCP
          port: 80
    - from:  #如果多个端口不同的访问协议可以写多个from
        - namespaceSelector:  #允许某个命名空间下所有Pod访问
            matchLabels:  #匹配命名空间标签
              project: riped
        - ipBlock:  #允许某个IP的访问
            cidr: 172.28.43.0/32
      ports:
        - protocol: TCP
          port: 3306
```

# 一、NetworkPolicy基础概念

如果你希望在 IP 地址或端口层面（OSI 第 3 层或第 4 层）控制网络流量， 则你可以考虑为集群中特定应用使用 Kubernetes 网络策略（NetworkPolicy）。 NetworkPolicies 适用于一端或两端与 Pod 的连接，与其他连接无关。

Pod 可以通信的 Pod 是通过如下三个标识符的组合来辩识的

1. 其他被允许的 Pods（例外：Pod 无法阻塞对自身的访问）
2. 被允许的名字空间
3. IP 组块（例外：与 Pod 运行所在的节点的通信总是被允许的， 无论 Pod 或节点的 IP 地址）

**配置前置条件**

网络策略通过网络插件来实现。要使用网络策略，你必须使用支持 NetworkPolicy 的网络解决方案。 创建一个 NetworkPolicy 资源对象而没有控制器来使它生效的话，是没有任何作用的。使用支持网络策略的网络插件才可以正常使用网络策略如calico。

**Pod 隔离的两种类型**

Pod 有两种隔离: 出口的隔离和入口的隔离。它们涉及到可以建立哪些连接。 这里的“隔离”不是绝对的，而是意味着“有一些限制”。 另外的，“非隔离方向”意味着在所述方向上没有限制。这两种隔离（或不隔离）是独立声明的， 并且都与从一个 Pod 到另一个 Pod 的连接有关。

默认情况下，一个 Pod 的出口是非隔离的，即所有外向连接都是被允许的。如果有任何的 NetworkPolicy 选择该 Pod 并在其 `policyTypes` 中包含 “Egress”，则该 Pod 是出口隔离的， 我们称这样的策略适用于该 Pod 的出口。当一个 Pod 的出口被隔离时， 唯一允许的来自 Pod 的连接是适用于出口的 Pod 的某个 NetworkPolicy 的 `egress` 列表所允许的连接。 这些 `egress` 列表的效果是相加的。

默认情况下，一个 Pod 对入口是非隔离的，即所有入站连接都是被允许的。如果有任何的 NetworkPolicy 选择该 Pod 并在其 `policyTypes` 中包含 “Ingress”，则该 Pod 被隔离入口， 我们称这种策略适用于该 Pod 的入口。当一个 Pod 的入口被隔离时，唯一允许进入该 Pod 的连接是来自该 Pod 节点的连接和适用于入口的 Pod 的某个 NetworkPolicy 的 `ingress` 列表所允许的连接。这些 `ingress` 列表的效果是相加的。

网络策略是相加的，所以不会产生冲突。如果策略适用于 Pod 某一特定方向的流量， Pod 在对应方向所允许的连接是适用的网络策略所允许的集合。 因此，评估的顺序不影响策略的结果。

要允许从源 Pod 到目的 Pod 的连接，源 Pod 的出口策略和目的 Pod 的入口策略都需要允许连接。 如果任何一方不允许连接，建立连接将会失败。

# 二、NetworkPolicy配置文件说明

示例文件如下：

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: test-network-policy
  namespace: default   #网络策略也属于某个命名空间
spec:
  podSelector:  #每个NetworkPolicy都包括一个podSelector，它对该策略所适用的一组Pod进行选择。示例中的策略选择带有 "role=db"标签的Pod。空的podSelector选择名字空间下的所有Pod。
    matchLabels:
      role: db
  policyTypes: #每个NetworkPolicy都包含一个policyTypes列表，其中包含Ingress或Egress或两者兼具。policyTypes 字段表示给定的策略是应用于进入所选Pod的入站流量还是来自所选Pod的出站流量，或两者兼有。 如果 NetworkPolicy 未指定 policyTypes 则默认情况下始终设置 Ingress； 如果 NetworkPolicy 有任何出口规则的话则设置 Egress。
    - Ingress  #如果只写Ingress不写任何规则则默认拒绝所有流量
    - Egress   #如果只写Egress不写任何规则则默认拒绝所有流量
  ingress: #入口配置，每个NetworkPolicy可包含一个ingress规则的白名单列表。 每个规则都允许同时匹配from和ports部分的流量。
    - from:  #注意以下三种方式如果前面带-为或关系，如果什么不带则为且关系
        - ipBlock:  #地址块配置方式
            cidr: 172.17.0.0/16
            except: #排除的地址
              - 172.17.1.0/24 
        - namespaceSelector: #选择某个命名空间下所有pod
            matchLabels:
              project: myproject
        - podSelector:   #选择当前命名空间下某个pod
            matchLabels:
              role: frontend
      ports: #允许访问的端口协议配置
        - protocol: TCP
          port: 6379
  egress: #每个NetworkPolicy可包含一个egress规则的白名单列表。 每个规则都允许匹配to和port部分的流量。
    - to:  #配置与上面ingress相同
        - ipBlock:
            cidr: 10.0.0.0/24
      ports:
        - protocol: TCP
          port: 5978
```

## 2.1 选择器to和from的行为

可以在 `ingress` 的 `from` 部分或 `egress` 的 `to` 部分中指定四种选择器：

**podSelector**: 此选择器将在与 NetworkPolicy 相同的名字空间中选择特定的 Pod，应将其允许作为入站流量来源或出站流量目的地。

**namespaceSelector**：此选择器将选择特定的名字空间，应将所有Pod用作其入站流量来源或出站流量目的地。

**namespaceSelector** *和* **podSelector**：一个指定 `namespaceSelector` 和 `podSelector` 的 `to`/`from` 条目选择特定名字空间中的特定 Pod。 注意使用正确的YAML语法下面的策略：

```yaml
ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          user: alice
      podSelector:
        matchLabels:
          role: client
```

**ipBlock**: 此选择器将选择特定的 IP CIDR 范围以用作入站流量来源或出站流量目的地。 这些应该是集群外部 IP，因为 Pod IP 存在时间短暂的且随机产生。

# 三、NetworkPolicy的使用示例

## 3.1 创建示例环境

创建示例命名空间

```bash
kubectl create ns demo-net
```

创建示例应用

```bash
#创建mysql服务
kubectl create deploy mysql --image=192.168.6.77:5000/kubedb/mysql:5.7.25 -n demo-net
kubectl  set env deploy/mysql  MYSQL_ROOT_PASSWORD=mysql -n demo-net
#创建redis服务
kubectl create deploy redis --image=192.168.6.77:5000/kubedb/redis:6.0.6 -n demo-net
#验证创建的应用
[root@k8s-master-1-kty-sc ~]# kubectl get pod -n demo-net --show-labels 
NAME                     READY   STATUS    RESTARTS   AGE     LABELS
mysql-84b57dc776-zztmk   1/1     Running   0          2m24s   app=mysql,pod-template-hash=84b57dc776
redis-5b5f667d75-9xs5g   1/1     Running   0          53s     app=redis,pod-template-hash=5b5f667d75
```

## 3.2 默认策略的配置

注意如果需要对pod网络流量镜像控制即可先使用以下默认规则进行控制之后使用其他规则对一个或者多个pod实施其他策略多个策略作用到同一个pod他们是相加的。

### 1.默认拒绝所有入站流量

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: demo-net
spec:
  podSelector: {}  #如果这里为空则表示选择这个策略所在的命名空间所有pod
  policyTypes:
  - Ingress  #如果只写ingress不写任何规则表示拒绝所有入口流量
```

测试，正确情况下所有外部pod无法访问这俩个应用，但是运行pod的k8s的node节点是可以访问的。

### 2.默认拒绝所有出站流量

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-egress
spec:
  podSelector: {}
  policyTypes:
  - Egress
```

### 3.默认拒绝所有入站和所有出站流量

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
```

### 4.设置一个或者一组pod网络策略

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: mysql   #策略名称
  namespace: demo-net  #作用到那个命名空间
spec:
  podSelector:    #选择命名空间pod
    matchLabels:
      app: mysql
  policyTypes:    #配置那些策略
    - Ingress  #入口流量
  ingress:  #入口流量规则
    - from:  
        - ipBlock:  #允许某个IP的访问
            cidr: 172.28.43.0/32
        - namespaceSelector:  #允许某个命名空间下所有Pod访问
            matchLabels:  #匹配命名空间标签
              project: riped
        - podSelector:  #允许当前命名空间下某个Pod访问  
            matchLabels:  #匹配Pod标签
              app: redis
        - namespaceSelector:  #允许某个命名空间下某个Pod访问
            matchLabels: 
              project: default
          podSelector:   
            matchLabels:  
              run: test
      ports:  #允许访问的端口
        - protocol: TCP
          port: 6379
        - protocol: TCP
          port: 80
    - from:  #如果多个端口不同的访问协议可以写多个from
        - namespaceSelector:  #允许某个命名空间下所有Pod访问
            matchLabels:  #匹配命名空间标签
              project: riped
        - ipBlock:  #允许某个IP的访问
            cidr: 172.28.43.0/32
      ports:
        - protocol: TCP
          port: 3306
```

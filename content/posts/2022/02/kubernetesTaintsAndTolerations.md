---
title: "k8s高级调度污点与容忍"
date: 2022-02-19T18:49:29+08:00
draft: false
description: "围绕污点与容忍的调度机制，演示如何控制 Pod 在特定节点上运行。"
cover: "https://b3logfile.com/bing/20211116.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["Kubernetes"]
tags: ["Kubernetes"]
toc: true
---
# 一、Taint与Toleration

官方文档：https://kubernetes.io/zh/docs/concepts/scheduling-eviction/taint-and-toleration/

生产环境中的Pod并非随便调度，某些node节点可能并不一样，比如GPU节点一般比较昂贵，并不是所有Pod都需要GPU资源，所有需要管理员进行控制。节点亲和性是Pod 的一种属性，它使 Pod 被吸引到一类特定的节点(这可能出于一种偏好，也可能是硬性要求)。 污点(Taint)则相反它使节点能够排斥一类特定的 Pod。容忍度（Toleration）是应用于 Pod 上的，允许（但并不要求）Pod 调度到带有与之匹配的污点的节点上。

污点和容忍度（Toleration）相互配合，可以用来避免 Pod 被分配到不合适的节点上。 每个节点上都可以应用一个或多个污点，这表示对于那些不能容忍这些污点的 Pod，是不会被该节点接受的。

**设计理念**：Taint在一类服务器上打上污点，让不能容忍这个污点的Pod不能部署在打了污点的服务器上。Toleration是让Pod容忍节点上配置的污点，可以让一些需要特殊配置的Pod能够调度到具有污点的特殊配置的节点上。

## 1.1 污点Taint

Taint污点是作用于k8s的node资源上面的使用`kubectl taint`进行node节点的污点设置，同个节点可以设置多个污点。

### 1.污点创建

创建示例

```bash
kubectl taint nodes node名称 key=value:那种污点
```

**污点配置详解**

- NoSchedule：禁止调度到该节点，已经在该节点上的Pod不受影响
- NoExecute：禁止调度到该节点，如果不符合这个污点，会立马被驱逐（或在一段时间后）
- PreferNoSchedule：尽量避免将Pod调度到指定的节点上，如果没有更合适的节点，可以部署到该节点

**污点配置示例**

```bash
kubectl taint node 192.168.10.55 ssd=true:NoExecute
kubectl taint node 192.168.10.55 ssd=true:NoSchedule
```

一个node节点可以配置多个污点，key名称可以一致。

### 2.污点删除

```bash
kubectl taint node 192.168.10.55 ssd=true:NoSchedule-
kubectl taint node 192.168.10.55 ssd=true:NoExecute-
```

### 3.查看污点

```bash
kubectl  get node 192.168.10.55 -o go-template --template {{.spec.taints}}
kubectl describe node 192.168.10.55 | grep Taints -A 10
```

## 1.2 容忍Toleration

容忍作用与Pod资源配置在`tolerations`字段，用于容忍配置在node节点的Taint污点，可以让Pod部署在有污点的node节点。

### 1.容忍的配置解析

**方式一：完全匹配**

```bash
tolerations:
- key: "taintKey"      #污点的key名称
  operator: "Equal"    #匹配类型，Equal表示匹配污点的所有值
  value: "taintValue"  #污点key的值
  effect: "NoSchedule" #污点类型
```

**方式二：不完全匹配**

```yaml
tolerations:
- key: "taintKey"      #污点的key值
  operator: "Exists"   #匹配类型，只要符合污点设置的值即可，配置那些就表示只匹配那些
  effect: "NoSchedule" #污点的类型
#注意不完全匹配，设置可以是一个可以是俩个，有自己定义比如

#只匹配key
- key: "taintKey"      #污点的key值
  operator: "Exists"   #匹配类型，只要符合污点设置的值即可，配置那些就表示只匹配那些
```

**方式三：大范围匹配（不推荐key为内置Taint）**

```yaml
tolerations:
- key: "taintKey"      #污点的key值
  operator: "Exists"   #匹配类型，只要符合污点设置的值即可，配置那些就表示只匹配那些
```

**方式四：匹配所有（不推荐）**

表示匹配所有污点，不管什么污点都匹配。在k8s中的daemonsets资源默认情况下是容忍所有污点的

```yaml
tolerations:
- operator: "Exists"  #匹配所有，没有任何条件
#daemonsets资源默认容忍
kubectl  get daemonsets.apps -n kube-system cilium -oyaml | grep tolerations -A 10
      tolerations:
      - operator: Exists
```

**其他配置，停留时间配置**

如果在容忍中添加`tolerationSeconds`参数，表示这个容忍只容忍一定的时间，之后会进行迁移。

```yaml
tolerations:
- key: "key1"
  operator: "Equal"
  value: "value1"
  effect: "NoExecute"
  tolerationSeconds: 360  #容忍时间
```

### 2.容忍与nodeSelector区别

污点在k8s中相当于给node设置了一个锁，容忍相当于这个锁的钥匙，调度到这个节点的Pod需要使用容忍来解开这个锁，但是污点与容忍并不会固定的把某些Pod调度到这个节点。如果Pod第一次调度被调度到了没有污点的节点，他就会被分配到这个节点，容忍的配置就无效了，如果这个Pod正好被调度到有污点的node，他的容忍配置会被解析，验证这个Pod是否可以容忍node的污点。

nodeSelector固定调度某些Pod到指定的一些节点，他的作用是强制性的，如果集群中没有符合的node，Pod会一直处于等待调度的阶段。

## 1.3 k8s内置污点

内置污点一般是k8s内部发现node状态不正常，自己给node添加的一些污点标签，具体含义如下

- node.kubernetes.io/not-ready：节点未准备好，相当于节点状态Ready的值为False。
- node.kubernetes.io/unreachable：Node Controller访问不到节点，相当于节点状态Ready的值为Unknown。node.kubernetes.io/out-of-disk：节点磁盘耗尽。
- node.kubernetes.io/memory-pressure：节点存在内存压力。
- node.kubernetes.io/disk-pressure：节点存在磁盘压力。
- node.kubernetes.io/network-unavailable：节点网络不可达。
- node.kubernetes.io/unschedulable：节点不可调度。
- node.cloudprovider.kubernetes.io/uninitialized：如果Kubelet启动时指定了一个外部的cloudprovider，它将给当前节点添加一个Taint将其标记为不可用。在cloud-controller-manager的一个controller初始化这个节点后，Kubelet将删除这个Taint。

在k8s中部署Pod会自动添加一些内置的容忍，容忍的时间默认是300秒，表示在node节点出现了内置污点后，Pod会容忍300秒的时间之后会进行迁移。

```bash
#验证Pod默认容忍配置
kubectl  get po nginx-94c9cf69-6jdtp -oyaml | grep tolerations -A 20
  tolerations:
  - key: ssd
    operator: Exists
  - effect: NoExecute   #以下俩个为默认添加的容忍
    key: node.kubernetes.io/not-ready   #内置污点
    operator: Exists
    tolerationSeconds: 300
  - effect: NoExecute
    key: node.kubernetes.io/unreachable  #内置污点
    operator: Exists
    tolerationSeconds: 300
```

### 1.在节点宕机后实现服务的快速迁移

node节点宕机后Pod的默认迁移时间为300秒，在实际生产环境中服务宕机恢复的时间在5分以上一般是不可接受的，如果要实现服务的快速迁移可以修改k8s内置污点的容忍时间，时间的长短需要考虑实际环境。k8s中勘测node节点是否可用是有kube-controller-manager组件进行探测的。

**kube-controller-manager相关参数**

```bash
--node-monitor-grace-period=40s #node节点不可用的时间达到40秒后会被标记为不可用
--node-monitor-period=5s  #node节点探测间隔
```

**修改默认容忍的时间以实现node宕机Pod的快速迁移**

```bash
apiVersion: apps/v1     #创建minio应用
kind: Deployment
metadata:
  name: nginx1
spec:
  selector:
    matchLabels:
      app: nginx1
  template:
    metadata:
      labels:
        app: nginx1
    spec:
      tolerations:
      - key: "ssd"
        operator: "Exists"
      - effect: NoExecute   #修改默认容忍时间
        key: node.kubernetes.io/not-ready
        operator: Exists
        tolerationSeconds: 10  #改为10秒
      - effect: NoExecute
        key: node.kubernetes.io/unreachable
        operator: Exists
        tolerationSeconds: 10
      containers:
      - name: nginx
        image: 192.168.10.254:5000/bash/nginx:v1
```

## 1.4 污点容忍示例

比如一个节点的磁盘是ssd磁盘，这个节点不允许其他Pod调度到这个节点，但是需要使用ssd的Pod需要被调度到这个节点。

这里需要使用污点来驱逐不使用ssd的Pod，并且使用nodeSelector来固定使用ssd的Pod被调度到这个节点。

**添加污点**

```bash
kubectl  taint node 192.168.10.55 ssd=true:NoExecute  #添加这个污点后，会驱逐这个节点上不容忍这个污点的Pod
kubectl taint node 192.168.10.55 ssd=true:NoSchedule  #禁止调度Pod到该节点
kubectl  label nodes 192.168.10.55 ssd=true    #给节点打标签，后面用于指定Pod被调度到这个节点
```

设置完这俩个污点，这个节点将不会运行调度不容忍ssd=true污点的Pod。

**创建的资源示例**

```bash
apiVersion: apps/v1     #创建minio应用
kind: Deployment
metadata:
  name: nginx
spec:
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      tolerations:   #容忍配置
      - key: "ssd"
        operator: "Exists"
      containers:
      - name: nginx
        image: 192.168.10.254:5000/bash/nginx:v1
      nodeSelector:  #指定调度的节点
        ssd: "true"
```

# 二、k8s亲和力Affinity

官方文档：https://kubernetes.io/zh/docs/tasks/configure-pod-container/assign-pods-nodes-using-node-affinity/

**Affinity主要解决的问题**

1. 某些Pod优先选择有ssd=true标签的节点，如果没有在考虑部署到其它节点；
2. 某些Pod需要部署在ssd=true和type=physical的节点上，但是优先部署在ssd=true的节点上；
3. 同一个应用的Pod不同的副本或者同一个项目的应用尽量或必须不部署在同一个节点或者符合某个标签的一类节点上或者不同的区域
4. 相互依赖的两个Pod尽量或必须部署在同一个节点上或者同一个域内

亲和力作用与俩方面，分别是Pod与node之间的关系，Pod与Pod之间的关系。

- NodeAffinity：节点亲和力/反亲和力
- PodAffinity：Pod亲和力
- PodAntiAffinity：Pod反亲和力

**分类详情**

![image-20220116162813788](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20220116162813788.png)

## 2.1 节点亲和力配置

**配置详情如下**：

affinity配置需配置到:Pod的spec的配置项下级。

```bash
affinity:
        nodeAffinity:   #节点亲和力配置
          requiredDuringSchedulingIgnoredDuringExecution:  #硬亲和力配置
            nodeSelectorTerms:   #节点选择器配置，只能配置一个
            - matchExpressions:  #匹配条件设置，可以配置多个，如果是多个他们是或的关系，所有条件都可以被匹配
              - key: node        #匹配的node的key设置,可以配置多个，如果配置多个key他们的关系为and，即需要满足所有的条件才会被匹配
                operator: In     #匹配方式，有多种
                values:          #key值，可以写多个
                - "68"
                - "69"
              - key: ip
                operator: In
                values:
                - "68"
            - matchExpressions:
              - key: node
                operator: In
                values:
                - "70"
          preferredDuringSchedulingIgnoredDuringExecution:  #软亲和力配置
          - weight: 1   #软亲和力的权重，权重越高优先级越大，范围1-100
            preference: #软亲和力配置项，和weight同级
              matchExpressions: #匹配条件设置
              - key: node       #匹配的node的key设置,与硬亲和力一致
                operator: In
                values:
                - "71"
```

**operator：标签匹配的方式**：

- In：相当于key = value的形式
- NotIn：相当于key != value的形式
- Exists：节点存在label的key为指定的值即可，不能配置values字段
- DoesNotExist：节点不存在label的key为指定的值即可，不能配置values字段
- Gt：大于value指定的值
- Lt：小于value指定的值

**节点清和力配置注意事项**：

1. 硬亲和力与软亲和力只能选择一个进行设置，如果同时设置软亲和力将不生效
2. valuse的值最好使用字符串的形式配置加`""`，否则在一些情况下会报错，除了Gt与Lt
3. 亲和力配置不要写的过于复杂，否则会极大的降低k8s调度Pod的效率，也不利于运维人员进行维护

## 2.2 Pod亲和力和反亲和力详解

```bash
spec:
      affinity:
        podAntiAffinity:   #Pod反亲和配置与亲和配置一致，可以与Pod亲和一起存在
        podAffinity:       #Pod亲和配置，可以与Pod反亲和一起存在
          requiredDuringSchedulingIgnoredDuringExecution:  #硬亲和，与软亲和只能选择其中一种
          - labelSelector:               #Pod标签选择器
              matchExpressions:   #和节点亲和力配置一致，只能配置1个
              - key: name         #pod的标签设置可以设置多个，多个key必须存在于1个Pod
                operator: In      #配置和节点亲和力一致，但是没有Gt和Lt
                values:
                - "blackbox"
                - "blackbox-1"
            namespaces:     # 和哪个命名空间的Pod进行匹配，为空为当前命名空间
            - helm
            topologyKey: kubernetes.io/hostname  #匹配的拓扑域的key，也就是节点上label的key，key和value相同的为同一个域，可以用于标注不同的机房和地区
          preferredDuringSchedulingIgnoredDuringExecution:  #软亲和，与硬亲和只能选择其中一种
          - weight: 100    #权重1-100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: security
                  operator: In
                  values:
                  - S2
              namespaces:
              - default
              topologyKey: failure-domain.beta.kubernetes.io/zone
```

**operator：标签匹配的方式**：

- In：相当于key = value的形式
- NotIn：相当于key != value的形式
- Exists：节点存在label的key为指定的值即可，不能配置values字段
- DoesNotExist：节点不存在label的key为指定的值即可，不能配置values字段

## 2.3 拓扑域TopologyKey

topologyKey：拓扑域，主要针对宿主机，相当于对宿主机进行区域的划分。用label进行判断，不同的key和不同的value是属于不同的拓扑域。

![](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20220219141703650.png)

## 2.4 Affinity常用场景

### 1.同一个应用不同副本尽量部署在不同的宿主机

示例yaml文件：

```bash
apiVersion: apps/v1
kind: Deployment
metadata:
  name: blackbox
  namespace: helm
spec:
  replicas: 4
  selector:
    matchLabels:
      app: blackbox
  template:
    metadata:
      labels:
        app: blackbox
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - "blackbox"
              namespaces:
              - helm
              topologyKey: kubernetes.io/hostname
      containers:
      -  image: 192.168.6.77:5000/k8s/blackbox-exporter:v0.19.0
         imagePullPolicy: IfNotPresent
         name: blackbox
```

### 2.尽量调度Pod到高配服务器

示例文件：

```bash
apiVersion: apps/v1
kind: Deployment
metadata:
  name: blackbox
  namespace: helm
spec:
  replicas: 2
  selector:
    matchLabels:
      app: blackbox
  template:
    metadata:
      labels:
        app: blackbox
    spec:
      affinity:
        nodeAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - preference:
              matchExpressions:
              - key: ssd
                operator: In
                values:
                - "true"
            weight: 100
      containers:
      -  image: 192.168.6.77:5000/k8s/blackbox-exporter:v0.19.0
         imagePullPolicy: IfNotPresent
         name: blackbox
```

### 3.同一个应用部署在不同的区域

```
apiVersion: apps/v1
kind: Deployment
metadata:
  name: blackbox
  namespace: helm
spec:
  replicas: 4
  selector:
    matchLabels:
      app: blackbox
  template:
    metadata:
      labels:
        app: blackbox
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app
                operator: In     
                values:
                - "blackbox"
            namespaces:
            - helm
            topologyKey: kubernetes.io/region  #这个标签需要按照实际环境的标签设置
      containers:
      -  image: 192.168.6.77:5000/k8s/blackbox-exporter:v0.19.0
         imagePullPolicy: IfNotPresent
         name: blackbox
```

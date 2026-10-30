---
title: "k8s调度准入控制"
date: 2022-01-24T14:54:09+08:00
draft: false
description: "覆盖 ResourceQuota、LimitRange 与 QoS，说明调度准入和资源限制机制。"
cover: "https://b3logfile.com/bing/20190723.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["Kubernetes"]
tags: ["Kubernetes"]
toc: true
---
# 一、ResourceQuota

官方文档：https://kubernetes.io/zh/docs/concepts/policy/resource-quotas/

当多个用户或团队共享具有固定节点数目的集群时，人们会担心有人使用超过其基于公平原则所分配到的资源量。资源配额是帮助管理员解决这一问题的工具。资源配额，通过 `ResourceQuota` 对象来定义，对每个命名空间的资源消耗总量提供限制。 它可以限制命名空间中某种类型的对象的总数目上限，也可以限制命令空间中的 Pod 可以使用的计算资源的总上限。

ResourceQuota作用于namespace，限制命名空间可用的资源。创建在那个命名空间就对这个命名空间生效。

**示例文件**

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: resource-test
  labels:
    app: resourcequota
spec:
  hard:
#以下为常用的配置，其他配置请查看官方文档 
    pods: 50             #Pod的最大数量
    requests.cpu: 0.5    #请求最大的cpu
    requests.memory: 512Mi #请求最大的内存
    limits.cpu: 5          #cpu可使用最大
    limits.memory: 16Gi    #内存可使用最大      
    configmaps: 20               #cm最大数量
    requests.storage: 40Gi       #请求storage的最大容量
    persistentvolumeclaims: 20   #PVC的最大数量
    replicationcontrollers: 20   #rc控制器最大数量
    secrets: 20                  #secrets数量
    services: 50                 #svc资源数量
    services.loadbalancers: "2"  #loadbalancers类型的svc数量
    services.nodeports: "10"     #nodeports类型的svc数量
```

注意事项，如何设置`cpu`或`memory`则在创建Pod时必须设置`resources`的`requests`与`limits`参数，否则Pod不会被启动。

# 二、LimitRange

官方文档：https://kubernetes.io/zh/docs/concepts/policy/limit-range/

默认情况下， Kubernetes 集群上的容器运行使用的计算资源没有限制。 使用资源配额，集群管理员可以以命名空间为单位，限制其资源的使用与创建。 在命名空间中，一个 Pod 或 Container 最多能够使用命名空间的资源配额所定义的 CPU 和内存用量。 有人担心，一个 Pod 或 Container 会垄断所有可用的资源。 LimitRange 是在命名空间内限制资源分配（给多个 Pod 或 Container）的策略对象。

一个 LimitRange（限制范围）对象提供的限制能够做到：

- 在一个命名空间中实施对每个 Pod 或 Container 最小和最大的资源使用量的限制。
- 在一个命名空间中实施对每个 PersistentVolumeClaim 能申请的最小和最大的存储空间大小的限制。
- 在一个命名空间中实施对一种资源的申请值和限制值的比值的控制。
- 设置一个命名空间中对计算资源的默认申请/限制值，并且自动的在运行时注入到多个 Container 中。

**示例文件**

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: cpu-mem-limit-range
spec:
  limits:
  - default:    #默认limit配置
      cpu: 0.3
      memory: 256Mi
    defaultRequest:  #默认Request配置
      cpu: 0.2
      memory: 128Mi
    max:            #容器资源使用最大限制
      cpu: 4
      memory: 4Gi
    min:            #容器资源使用最小限制
      cpu: 0.2
      memory: 128Mi
    type: Container  #类型容器
  - type: PersistentVolumeClaim #类型PVC
    max:
      storage: 2Gi  #PVC最大的容量
    min:
      storage: 1Gi  #PVC最小容量
```

注意：如果Pod没有设置资源限制，会以limits中的默认配置进行填充，直接填充导Pod资源上面。

# 三、服务质量QoS

官方文档：https://kubernetes.io/zh/docs/tasks/configure-pod-container/quality-service-pod/

在k8s集群中，当一个node节点负载高时内存CPU使用已经超出了node节点的资源，这时node节点系统会进行MMO杀死占用较高的进程，k8s内部也会提前进行资源的驱逐，k8s会优先驱逐特定的一些Pod，这里k8s引用了一个服务质量Qos来确定先优先驱逐那些Pod。

**Kubernetes 创建 Pod 时就给它指定了下列一种 QoS 类**

- **Guaranteed**：最高服务质量，当宿主机内存不够时，会先kill掉QoS为BestEffort和Burstable的Pod，如果内存还是不够，才会kill掉QoS为Guaranteed，该级别Pod的资源占用量一般比较明确，即requests的cpu和memory和limits的cpu和memory配置的一致。
- **Burstable**：服务质量低于Guaranteed，当宿主机内存不够时，会先kill掉QoS为BestEffort的Pod，如果内存还是不够之后就会kill掉QoS级别为Burstable的Pod，用来保证QoS质量为Guaranteed的Pod，该级别Pod一般知道最小资源使用量，但是当机器资源充足时，还是想尽可能的使用更多的资源，即limits字段的cpu和memory大于requests的cpu和memory的配置。
- **BestEffort**：尽力而为，当宿主机内存不够时，首先kill的就是该QoS的Pod，用以保证Burstable和Guaranteed级别的Pod正常运行。

**示例**

```bash
[root@k8s-master-1-kty-sc test]# kubectl  get po -n test blackbox-78b56f764d-j7mcx -oyaml
    resources:  #生成服务质量QoS依赖于Pod的资源限制的设置
      limits:
        cpu: 300m
        memory: 256Mi
      requests:
        cpu: 200m
        memory: 128Mi
  qosClass: Burstable  #服务质量级别，有k8s自己生成，不需要手动维护
```

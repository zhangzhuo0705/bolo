---
title: "k8s存储入门"
date: 2022-01-10T18:02:20+08:00
draft: false
description: "梳理 Volume 的常见类型，演示 emptyDir、hostPath 与网络存储的使用。"
cover: "https://b3logfile.com/bing/20210503.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["Kubernetes"]
tags: ["Kubernetes", "NFS"]
toc: true
---
# 一、Volumes介绍

官方文档：https://kubernetes.io/zh/docs/concepts/storage/volumes/

Container（容器）中的磁盘文件是短暂的，当容器崩溃时，kubelet会重新启动容器，但最初的文件将丢失，Container会以最干净的状态启动。另外，当一个Pod运行多个Container时，各个容器可能需要共享一些文件。Kubernetes Volume可以解决这两个问题。一些需要持久化数据的程序才会用到Volumes，或者一些需要共享数据的容器需要volumes。

日志收集的需求：需要在应用程序的容器里面加一个sidecar，这个容器是一个收集日志的容器，比如filebeat，它通过volumes共享应用程序的日志文件目录。

Docker也有卷的概念，但是在Docker中卷只是磁盘上或另一个Container中的目录，其生命周期不受管理。虽然目前Docker已经提供了卷驱动程序，但是功能非常有限，例如从Docker 1.7版本开始，每个Container只允许一个卷驱动程序，并且无法将参数传递给卷。

另一方面，Kubernetes卷具有明确的生命周期，与使用它的Pod相同。因此，在Kubernetes中的卷可以比Pod中运行的任何Container都长，并且可以在Container重启或者销毁之后保留数据。Kubernetes支持多种类型的卷，Pod可以同时使用任意数量的卷。

从本质上讲，卷只是一个目录，可能包含一些数据，Pod中的容器可以访问它。要使用卷Pod需要通过.spec.volumes字段指定为Pod提供的卷，以及使用.spec.containers.volumeMounts 字段指定卷挂载的目录。从容器中的进程可以看到由Docker镜像和卷组成的文件系统视图，卷无法挂载其他卷或具有到其他卷的硬链接，Pod中的每个Container必须独立指定每个卷的挂载位置。

## 1.1 常用的Volumes类型

只列举文档介绍的：

- emptyDir：临时卷的一种，Pod删除卷也会被删除
- hostPath：本地卷，删除Pod不影响卷
- nfs：网络存储
- ConfigMap&Secret

## 1.2 Volumes使用介绍

## 1.3 emptyDir

和上述volume不同的是，如果删除Pod，emptyDir卷中的数据也将被删除，一般emptyDir卷用于Pod中的不同Container共享数据。它可以被挂载到相同或不同的路径上。默认情况下，emptyDir卷支持节点上的任何介质，可能是SSD、磁盘或网络存储，具体取决于自身的环境。可以将emptyDir.medium字段设置为Memory，让Kubernetes使用tmpfs（内存支持的文件系统），虽然tmpfs非常快，但是tmpfs在节点重启时，数据同样会被清除，并且设置的大小会被计入到Container的内存限制当中。

### 1.emptyDir实现数据共享

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: test
  namespace: default
spec:
  selector:
    matchLabels:
      app: test
  template:
    metadata:
      labels:
        app: test
    spec:
      containers:
      - image: 10.122.6.81:5000/image/nginx:v1
        name: nginx
        volumeMounts:   #挂载
        - mountPath: /data/1
          name: test
      - image: 10.122.6.81:5000/image/centos:v1
        name: centos
        command:
        - sh
        - -c
        - "sleep 300000"
        volumeMounts:
        - mountPath: /data/
          name: test
      volumes:       #定义
        - name: test #volume名称
          emptyDir: {} #类型emptyDir
#如果使用内存存储数据定义方式如下
      volumes:      
        - name: test
          emptyDir:    #这里不需要写东西
            medium: Memory  #定义为使用内存
```

## 1.4 hostPath

hostPath卷可将节点上的文件或目录挂载到Pod上，用于Pod自定义日志输出或访问Docker内部的容器等。

**hostPath卷常用的type（类型）如下**：

- type为空字符串：默认选项，意味着挂载hostPath卷之前不会执行任何检查。
- DirectoryOrCreate：如果给定的path不存在任何东西，那么将根据需要创建一个权限为0755的空目录，和Kubelet具有相同的组和权限。
- Directory：目录必须存在于给定的路径下。
- FileOrCreate：如果给定的路径不存储任何内容，则会根据需要创建一个空文件，权限设置为0644，和Kubelet具有相同的组和所有权。
- File：文件，必须存在于给定路径中。
- Socket：UNIX套接字，必须存在于给定路径中。
- CharDevice：字符设备，必须存在于给定路径中。
- BlockDevice：块设备，必须存在于给定路径中。

### 1.利用hostPath修改容器时区

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: test
  namespace: default
spec:
  selector:
    matchLabels:
      app: test
  template:
    metadata:
      labels:
        app: test
    spec:
      containers:
      - image: 10.122.6.81:5000/image/nginx:v1
        name: nginx
        volumeMounts:
        - mountPath: /etc/localtime
          name: test
      volumes:      
        - name: test
          hostPath:   #volumes类型
            type: File  #hostPath类型
            path: /etc/localtime #挂载的文件
```

## 1.5 NFS

需要按照NFS服务器，具体配置如下

```bash
apiVersion: apps/v1
kind: Deployment
metadata:
  name: test
  namespace: default
spec:
  selector:
    matchLabels:
      app: test
  template:
    metadata:
      labels:
        app: test
    spec:
      containers:
      - image: 10.122.6.81:5000/image/nginx:v1
        name: nginx
        volumeMounts:
        - mountPath: /data
          name: test
      volumes:      
        - name: test
          nfs:   #volume类型
            server: 192.168.10.71  #nfs服务器地址
            path: /data   #nfs共享目录
```

# 二、持久化存储PV&PVC介绍

为什么要引入PV与PVC，如果是k8s管理员是知道后端存储如何配置的，可以直接在deploy资源中的`volumes`中直接进行定义即可，但是真实环境中k8s并不是只有k8s管理员进行使用，其他人员可能并不知道后端存储如何配置，并且集群中的后端存储可能并不是只有一种，所以k8s引入了PV用来对接描述后端存储，其他人员并不需要关心后端存储使用的是什么只需要创建PVC绑定PV资源在创建deploy的Pod定义中直接使用即可。

直接使用Volume无法解决的一些问题可以在PV中很好的解决，比如：

- 当某个数据卷不在被挂载使用时，里面的数据如何处理，可就是回收策略
- 如果实现只读挂载如何处理，某些存储可以实现。
- 如果想要只能一个Pod挂载如何处理
- 如何控制一个Pod只能使用10G的空间

官方文档：https://kubernetes.io/zh/docs/concepts/storage/persistent-volumes/

PersistentVolume：简称PV，是由Kubernetes管理员设置的存储，可以配置Ceph、NFS、GlusterFS等常用存储配置，相对于Volume配置，提供了更多的功能，比如生命周期的管理、大小的限制。PV分为静态和动态。

PersistentVolumeClaim：简称PVC，是对存储PV的请求，表示需要什么类型的PV，需要存储的技术人员只需要配置PVC即可使用存储，或者Volume配置PVC的名称即可。

**PV与PVC的在k8s中表示的架构**

![image-20220110154933943](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20220110154933943.png)

## 2.1 PV的访问与回收策略

**访问策略**

官方文档：https://kubernetes.io/zh/docs/concepts/storage/persistent-volumes/#access-modes

- ReadWriteOnce：可以被单节点以读写模式挂载，命令行中可以被缩写为RWO。
- ReadOnlyMany：可以被多个节点以只读模式挂载，命令行中可以被缩写为ROX。
- ReadWriteMany：可以被多个节点以读写模式挂载，命令行中可以被缩写为RWX。
- ReadWriteOncePod ：只允许被单个Pod访问，需要K8s 1.22+以上版本，并且是CSI创建的PV才可使用

**回收策略**

官方文档：https://kubernetes.io/zh/docs/concepts/storage/persistent-volumes/#retain

- Retain：保留，该策略允许手动回收资源，当删除PVC时，PV仍然存在，PV被视为已释放，管理员可以手动回收卷。
- Recycle：回收，如果Volume插件支持，Recycle策略会对卷执行rm -rf清理该PV，并使其可用于下一个新的PVC，但是本策略将来会被弃用，目前只有NFS和HostPath支持该策略。
- Delete：删除，如果Volume插件支持，删除PVC时会同时删除PV，动态卷默认为Delete，目前支持Delete的存储后端包括AWS EBS, GCE PD, Azure Disk, or OpenStack Cinder等。

可以通过persistentVolumeReclaimPolicy: Recycle字段配置

## 2.2 常见的存储分类

k8s中常用的存储类型大致如下：

1. 文件存储：一些数据可能需要被多个节点使用，比如用户的头像、用户上传的文件等，实现方式：NFS、NAS、FTP、CephFS等。
2. 块存储：一些数据只能被一个节点使用，或者是需要将一块裸盘整个挂载使用，比如数据库、Redis等，实现方式：Ceph、GlusterFS、公有云。
3. 对象存储：由程序代码直接实现的一种存储方式，云原生应用无状态化常用的实现方式，实现方式：一般是符合S3协议的云存储，比如AWS的S3存储、Minio、七牛云等。

对于文件存储在k8s中使用一般是数据需要多个Pod同时可以进行读写操作时进行使用，块存储一般只允许一个Pod进行读写挂载一般用于有状态服务，对象存储一般由程序直接进行调用无需挂载。

## 2.3 PV的状态

- Available：可用，没有被PVC绑定的空闲资源。
- Bound：已绑定，已经被PVC绑定。
- Released：已释放，PVC被删除，但是资源还未被重新使用。
- Failed：失败，自动回收失败。

## 2.4 PVC创建后处于Pending的原因

1. PVC的申请访问策略与PV定义不一致
2. PVC的申请容量大小超过PV定义的容量大小
3. PVC的storageClassName名称不正确

正常状态为：Bound

# 三、PV&PVC的使用(静态)

**PV的yaml示例文件**

```yaml
apiVersion: v1      #api版本号
kind: PersistentVolume  #资源类型
metadata:           #源数据定义
  name: pvc-test    #PV名称
spec:               #PV具体定义参数
  capacity:         #容量配置，支持容量配置的存储才会生效，否则无效
    storage: 5Gi
  volumeMode: Filesystem #卷的模式，前支持Filesystem(文件系统)和 Block(块)其中Block类型需要后端存储支持，默认为文件系统
  accessModes:     #该PV的访问模式,可以配置多个
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Recycle  #PV的回收策略
  storageClassName: nfs-slow  #PV的类，一个特定类型的PV只能绑定到特定类别的PVC
  nfs:   #后端存储类型，定义
    ...
```

注意：PV是没有命名空间隔离的属于集群资源

**PVC的yaml示例文件**

```yaml
kind: PersistentVolumeClaim   #api版本号
apiVersion: v1                #资源类型
metadata:                     #源数据定义
  name: pvc-test              #PVC名称
spec:                         #PV具体定义参数
  storageClassName: nfs-slow  #PV定义中的storageClassName
  accessModes:                #该PVC的访问模式,需要与申领的PV中定义的访问模式一致，或包含在PV的定义中
    - ReadWriteOnce
  resources:                  #申请的大小定义
    requests:
      storage: 3Gi
```

注意：PVC是有命名空间隔离的，Pod只能调用自己命名空间下的PVC。

**Pod调用PVC示例文件**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-1
spec:
  selector:
    matchLabels:
      app: nginx-1
  template:
    metadata:
      labels:
        app: nginx-1
    spec:
      containers:
      - image: 10.122.6.81:5000/image/nginx:v1
        imagePullPolicy: IfNotPresent
        name: nginx
        volumeMounts:     #挂载定义
        - mountPath: "/data"
          name: data
      volumes:          #定义volume
      - name: data      #volume名称
        persistentVolumeClaim:  #类型为调用PVC
          claimName: pvc-test   #指定PVC名称
```

## 3.1 NFS类型PV创建

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: pvc-test
spec:
  capacity:
    storage: 5Gi
  volumeMode: Filesystem
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Recycle
  storageClassName: nfs-slow
  nfs:   #类型nfs
    path: /data1/test/1  #nfs挂载目录
    server: 10.122.6.92  #nfs服务器地址
```

## 3.2 hostPath类型创建

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: pvc-test-1
spec:
  capacity:
    storage: 5Gi
  volumeMode: Filesystem
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Recycle
  storageClassName: host-slow
  hostPath:       #类型hostPath
    path: "/data1/test-1"  #挂载目录
```

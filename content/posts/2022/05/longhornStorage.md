---
title: "Longhorn云原生存储"
date: 2022-05-19T11:12:53+08:00
lastmod: 2022-08-24T10:27:59+08:00
draft: false
description: "说明 Longhorn 的架构、副本与精简置备机制，以及云原生块存储的使用。"
cover: "https://b3logfile.com/bing/20190820.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["Kubernetes"]
tags: ["CSI", "kubernetes", "Longhorn"]
toc: true
---
# 一、Longhorn基础介绍

官方github：https://github.com/longhorn/longhorn

官方网站：https://longhorn.io

**Longhorn**是一个轻量级、可靠且功能强大的分布式块存储系统，适用于 Kubernetes。使用容器和微服务实现分布式块存储。Longhorn 为每个块储存设备卷创建一个专用的存储控制器，并在存储在多个节点上的多个副本之间同步复制该卷。存储控制器和副本本身是使用 Kubernetes 编排的。Longhorn 是免费的开源软件。它最初由Rancher Labs开发，现在作为云原生计算基金会的孵化项目进行开发。

**Longhorn 支持以下架构**：

1. AMD64
2. ARM64（实验性）

**使用Longhorn，您可以**：

- 使用 Longhorn 卷作为 Kubernetes 集群中分布式有状态应用程序的持久存储
- 将您的块存储分区为 Longhorn 卷，以便您可以在有或没有云提供商的情况下使用 Kubernetes 卷。
- 跨多个节点和数据中心复制块存储以提高可用性
- 将备份数据存储在外部存储（如 NFS 或 AWS S3）中
- 创建跨集群灾难恢复卷，以便从第二个 Kubernetes 集群中的备份中快速恢复主 Kubernetes 集群中的数据
- 计划卷的定期快照，并计划定期备份到 NFS 或与 S3 兼容的辅助存储
- 从备份还原卷
- 在不中断持久卷的情况下升级 Longhorn

Longhorn带有一个独立的UI，可以使用Helm，kubectl或Rancher应用程序目录进行安装。

**使用微服务简化分布式块存储**

由于现代云环境需要数以万计到数百万个分布式块存储卷，因此一些存储控制器已成为高度复杂的分布式系统。相比之下，Longhorn 可以通过将大型块存储控制器分区为多个较小的存储控制器来简化存储系统，只要这些卷仍然可以从公共磁盘池构建。通过为每个卷使用一个存储控制器，Longhorn 将每个卷转换为微服务。控制器被称为Longhorn Engine。

Longhorn Manager 组件编排 Longhorn 引擎，因此它们可以连贯地协同工作。

**在 Kubernetes 中使用持久性存储，而无需依赖云提供商**

Pod 可以直接引用存储，但不建议这样做，因为它不允许 Pod 或容器可移植。相反，工作负载的存储要求应该在 Kubernetes 持久卷 （PV） 和持久卷声明 （PVC） 中定义。使用 Longhorn，您可以指定卷的大小、IOPS 要求以及跨为卷提供存储资源的主机所需的同步副本数。然后，您的 Kubernetes 资源可以为每个 Longhorn 卷使用 PVC 和相应的 PV，或者使用 Longhorn 存储类自动为工作负载创建 PV。

副本在基础磁盘或网络存储上进行精简置备。

**跨多个计算或存储主机计划多个副本**

为了提高可用性，Longhorn 会创建每个卷的副本。副本包含卷的快照链，每个快照都存储与上一个快照相比的更改。卷的每个副本也在容器中运行，因此具有三个副本的卷会产生四个容器。

每个卷的副本数可在 Longhorn 中配置，以及将调度副本的节点数。Longhorn 会监控每个复制副本的运行状况并执行修复，并在必要时重建复制副本。

**为每个卷分配多个存储前端**

常见的前端包括一个 Linux 内核设备（映射在 /dev/longhorn 下）和一个 iSCSI 目标。

**为定期快照和备份操作指定计划**

指定这些操作的频率（每小时、每天、每周、每月和每年）、执行这些操作的确切时间（例如，每个星期日的凌晨 3：00）以及保留的定期快照和备份集数。

## 1.1 架构介绍

Longhorn设计有两层：数据平面和控制平面。Longhorn Engine 是对应于数据平面的存储控制器，而 Longhorn Manager 对应于控制平面。

Longhorn Manager Pod 作为 Kubernetes DaemonSet 在 Longhorn 集群中的每个节点上运行。它负责在 Kubernetes 集群中创建和管理卷，并处理来自 UI 或 Kubernetes 的卷插件的 API 调用。它遵循 Kubernetes 控制器模式，有时称为运算符模式。Longhorn Manager 与 Kubernetes API 服务器通信，以创建新的 Longhorn 卷 CRD。然后，Longhorn Manager 会观察 API 服务器的响应，当它看到 Kubernetes API 服务器创建了一个新的 Longhorn 卷 CRD 时，Longhorn Manager 会创建一个新卷。当要求 Longhorn Manager 创建卷时，它会在卷附加到的节点上创建一个 Longhorn Engine 实例，并在将放置副本的每个节点上创建一个副本。副本应放置在单独的主机上，以确保最大的可用性。副本的多个数据路径确保了 Longhorn 卷的高可用性。即使某个副本或引擎出现问题，该问题也不会影响所有副本或 Pod 对卷的访问。Pod 仍将正常运行。长角引擎始终与使用 Longhorn 卷的 Pod 在同一节点中运行。它跨存储在多个节点上的多个副本同步复制卷。引擎和副本是使用 Kubernetes 编排的。

![img](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com/Typora/how-longhorn-works.svg)

- 有三个实例与 Longhorn 卷。
- 每个卷都有一个专用的控制器，称为Longhorn Engine，并作为Linux进程运行。
- 每个 Longhorn 卷都有两个副本，每个副本都是一个 Linux 进程。
- 图中的箭头表示卷、控制器实例、副本实例和磁盘之间的读/写数据流。
- 通过为每个卷创建单独的 Longhorn 引擎，如果一个控制器出现故障，其他卷的功能将不受影响。

## 1.2 微服务设置的优势

在 Longhorn 中，每个引擎只需要为一个卷提供服务，从而简化了存储控制器的设计。由于控制器软件的故障域被隔离到各个卷，因此控制器崩溃只会影响一个卷。

Longhorn Engine简单而轻巧，因此我们可以创建多达100，000个单独的引擎。Kubernetes 调度这些单独的引擎，从一组共享磁盘中提取资源，并与 Longhorn 合作以形成一个有弹性的分布式块存储系统。

由于每个卷都有自己的控制器，因此还可以升级每个卷的控制器和副本实例，而不会对 IO 操作造成明显中断。

Longhorn 可以创建一个长时间运行的作业来协调所有实时卷的升级，而不会中断系统的持续运行。为确保升级不会导致不可预见的问题，Longhorn 可以选择升级一小部分卷，并在升级过程中出现问题时回滚到旧版本。

## 1.3 精简置备和卷大小、

Longhorn 是一个精简配置的存储系统。这意味着Longhorn卷将仅占用当前所需的空间。例如，如果分配了 20 GB 的卷，但仅使用其中的 1GB，则磁盘上的实际数据大小将为 1 GB。您可以在 UI 的卷详细信息中查看实际数据大小。

如果从卷中删除了内容，则 Longhorn 卷本身的大小无法缩小。例如，如果创建一个 20 GB 的卷，使用了 10 GB，然后删除了 9 GB 的内容，则磁盘上的实际大小仍将是 10 GB 而不是 1 GB。发生这种情况是因为 Longhorn 在块级别而不是文件系统级别运行，因此 Longhorn 不知道用户是否删除了内容。该信息主要保存在文件系统级别。

## 1.4 副本

每个副本都包含 Longhorn 卷的快照链。快照类似于图像的图层，最旧的快照用作基础图层，较新的快照位于顶部。仅当数据覆盖旧快照中的数据时，数据才会包含在新快照中。快照链一起显示数据的当前状态。

对于每个 Longhorn 卷，该卷的多个副本应在 Kubernetes 集群中运行，每个副本都在一个单独的节点上。所有副本都被视为相同，并且 Longhorn 引擎始终在与 pod 相同的节点上运行，Pod 也是卷的使用者。通过这种方式，我们确保即使 Pod 已关闭，引擎也可以移动到另一个 Pod，并且您的服务将继续不受中断。

可以在设置中更改默认副本计数。附加卷后，可以在 UI 中更改卷的副本计数。

如果当前正常运行的副本计数小于指定的副本计数，Longhorn 将开始重建新副本。

如果当前正常运行的副本计数大于指定的副本计数，则 Longhorn 将不执行任何操作。在此情况下，如果复制副本发生故障或删除，Longhorn 将不会开始重建新副本，除非正常的副本计数低于指定的副本计数。

### 1.副本的工作原理

从卷的副本读取数据时，如果可以在实时数据中找到该数据，则使用该数据。否则，将读取最新的快照。如果在最新快照中找不到数据，则读取下一个最旧的快照，依此类推，直到读取最旧的快照。拍摄快照时，将创建一个差异磁盘。随着快照数量的增加，差异磁盘链（也称为快照链）可能会变得很长。因此，为了提高读取性能，Longhorn 维护了一个读取索引，用于记录哪个差异磁盘为每个 4K 存储块保存有效数据。

在下图中，该卷有八个块。读取索引有八个条目，并且在执行读取操作时会懒惰地填满。

写入操作会重置读取索引，使其指向实时数据。实时数据由某些索引中的数据和其他索引中的空白空间组成。

除了读取索引之外，我们目前不维护其他元数据来指示使用了哪些块。

![img](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/read-index.png)

上图采用颜色编码，根据读取索引显示哪些块包含最新数据，下表中还列出了最新数据的来源

| 读取索引 | 最新数据来源 |
| :------- | :----------- |
| 0        | 最新快照     |
| 1        | 实时数据     |
| 2        | 最早的快照   |
| 3        | 最早的快照   |
| 4        | 最早的快照   |
| 5        | 实时数据     |
| 6        | 实时数据     |
| 7        | 实时数据     |

请注意，如上图中的绿色箭头所示，读取索引的索引 5 之前指向第二个最旧的快照作为最新数据的来源，然后当索引 5 处的 4K 存储块被实时数据覆盖时，它更改为指向实时数据。读取索引保存在内存中，每个 4K 块消耗一个字节。字节大小的读取索引意味着您可以为每个卷拍摄多达 254 个快照。读取索引为每个副本消耗一定量的内存中数据结构。例如，1 TB 卷占用 256 MB 的内存中读取索引。

## 1.5 快照

快照功能使卷能够恢复到历史记录中的某个点。辅助存储中的备份也可以从快照构建。从快照还原卷时，它反映创建快照时卷的状态。快照功能也是 Longhorn 重建过程的一部分。每当 Longhorn 检测到副本出现故障时，它都会自动拍摄（系统）快照，并开始在另一个节点上重建它。

### 1.快照工作原理

快照类似于图像的图层，最旧的快照用作基础图层，较新的快照位于顶部。仅当数据覆盖旧快照中的数据时，数据才会包含在新快照中。快照在创建后无法更改，除非删除快照，在这种情况下，其更改将与下一个最新的快照合并。新数据始终写入实时版本。新快照始终是从实时数据创建的。要创建新快照，实时数据将成为最新的快照。然后创建一个新的空白版本的实时数据，以取代旧的实时数据。

**重复快照**

为了减少快照占用的空间，用户可以计划定期快照或备份，其中包含要保留的多个快照，这将按计划自动创建新的快照/备份，然后清理任何过多的快照/备份。

**删除快照**

可以通过 UI 手动删除不需要的快照。如果触发了任何快照的删除，则系统生成的任何快照都将自动标记为删除。在 Longhorn 中，无法删除最新的快照。这是因为每当删除快照时，Longhorn 都会将其内容与下一个快照混淆，以便下一个和以后的快照保留正确的内容。但是 Longhorn 无法对最新快照执行此操作，因为没有更新的快照可与已删除的快照混为一谈。最新快照的下一个“快照”是实时卷（卷头），用户当前正在读取/写入该卷，因此无法进行合并过程。相反，最新的快照将被标记为已删除，并且将在下次可能的情况下将其清理。要清理最新快照，可以创建新快照，然后删除以前的“最新”快照。

**存储快照**

快照存储在本地，作为卷的每个副本的一部分。它们存储在 Kubernetes 集群中节点的磁盘上。快照存储在与主机物理磁盘上的卷数据相同的位置。

**崩溃一致性**

Longhorn 是一种崩溃一致性块存储解决方案。操作系统在写入块层之前将内容保留在缓存中是正常的。这意味着，如果所有副本都已关闭，则 Longhorn 可能不包含关机前立即发生的更改，因为内容保存在操作系统级缓存中，尚未传输到 Longhorn 系统。此问题类似于台式计算机因断电而关闭时可能发生的问题。恢复电源后，您可能会在硬盘驱动器中找到一些损坏的文件。要在任何给定时刻强制将数据写入块层，可以在节点上手动运行 sync 命令，也可以卸载磁盘。在这两种情况下，操作系统都会将缓存中的内容写入块层。Longhorn 在创建快照之前会自动运行同步命令。

## 1.6 备份和辅助存储

备份是备份存储中的对象，备份存储是 Kubernetes 集群外部的 NFS 或 S3 兼容对象存储。备份提供了一种辅助存储形式，因此即使您的 Kubernetes 集群变得不可用，仍然可以检索您的数据。由于卷复制是同步的，并且由于网络延迟，因此很难执行跨区域复制。备份存储还用作解决此问题的介质。在 Longhorn 设置中配置备份目标后，Longhorn 可以连接到备份存储，并在 Longhorn UI 中显示现有备份的列表。如果 Longhorn 在第二个 Kubernetes 集群中运行，它还可以将灾难恢复卷同步到辅助存储中的备份，以便您的数据可以在第二个 Kubernetes 集群中更快地恢复。

### 1.备份原理

备份是使用一个快照作为源创建的，以便它反映创建快照时卷数据的状态。备份远程存储在群集外部。与快照相比，可以将备份视为快照链的扁平化版本。与将分层图像转换为平面图像时丢失信息的方式类似，将快照链转换为备份时数据也会丢失。在这两次转化中，所有被覆盖的数据都将丢失。由于备份不包含快照，因此它们不包含卷数据更改的历史记录。从备份还原卷后，该卷最初包含一个快照。此快照是原始链中所有快照的合并版本，它反映了创建备份时卷的实时数据。虽然快照可能为数百 GB，但备份由 2 MB 文件组成。同一原始卷的每个新备份都是增量备份，用于检测和传输快照之间的更改块。这是一项相对简单的任务，因为每个快照都是一个差异文件，并且仅存储上次快照中的更改。此设计还意味着，如果没有更改任何块并进行了备份，则 backupstore 中的备份将显示为 0 字节。但是，如果要从该备份还原，它仍将包含完整的卷数据，因为它将还原备份存储上已存在的必要块，这些块是备份所必需的。为了避免存储大量小块存储，Longhorn 使用 2 MB 块执行备份操作。这意味着，如果 2MB 边界中的任何 4K 块发生更改，Longhorn 将备份整个 2MB 块。这在可管理性和效率之间提供了适当的平衡。

![img](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/longhorn-backup-creation.png)

上图描述了如何从 Longhorn 中的快照创建备份：

- 图的主存储端显示了 Kubernetes 集群中 Longhorn 卷的一个副本。副本由四个快照链组成。按从最新到最旧的顺序，快照为“实时数据”、“snap3”、“snap2”和“snap1”。
- 图的辅助存储端显示了外部对象存储服务（如 S3）中的两个备份。
- 在辅助存储中，从 snap2 备份的颜色编码显示它包括来自 snap1 的蓝色变化和来自 snap2 的绿色变化。snap2 中没有任何更改覆盖 snap1 中的数据，因此 snap1 和 snap2 的更改都包含在从 snap2 备份中。
- 名为“从快照备份 3”的备份反映了创建 snap3 时卷数据的状态。颜色编码和箭头表示从 snap3 备份包含来自 snap3 的所有深红色更改，但仅包含来自 snap2 的一个绿色更改。这是因为 snap3 中的一个红色变化覆盖了 snap2 中的一个绿色变化。这说明了备份如何不包括完整的更改历史记录，因为它们将快照与之前的快照混淆。
- 每个备份都维护自己的一组 2 MB 块。每个 2 MB 块仅备份一次。两个备份共享一个绿色块和一个蓝色块。

从辅助存储中删除备份时，Longhorn 不会删除它使用的所有块。相反，它会定期执行垃圾回收，以清理辅助存储中未使用的块。属于同一卷的所有备份的 2 MB 块存储在一个公共目录下，因此可以在多个备份之间共享。为了节省空间，可以在备份之间未更改的 2 MB 块重用于在辅助存储中共享同一备份卷的多个备份。由于校验和用于寻址 2 MB 块，因此我们对同一卷中的 2 MB 块实现了一定程度的重复数据删除。卷级元数据存储在卷.cfg中。每个备份（例如，snap2.cfg）的元数据文件相对较小，因为它们仅包含备份中所有 2 MB 块的偏移量和校验和。每个 2 MB 块（.blk 文件）都会被压缩。

# 二、部署Longhorn

我这里部署的版本为v1.2.4最新版本，在部署 Longhorn v1.2.4 之前，请确保您的 Kubernetes 集群至少为 v1.18，因为支持的 Kubernetes 版本已在 v1.2.4 中更新 （>= v1.18）。如果是低版本请部署选择相应的版本

## 2.1 安装前准备

在安装了 Longhorn 的 Kubernetes 集群中，每个节点都必须满足以下要求

- 与 Kubernetes 兼容的容器运行时（Docker v1.13+、containerd v1.3.7+ 等）
- Kubernetes v1.18+，v1.2.4要求。
- `open-iscsi`已安装，并且守护程序正在所有节点上运行。

```bash
#centos安装
yum install iscsi-initiator-utils
systemctl enable iscsid
systemctl start iscsid
```

- RWX 支持要求每个节点都安装了 NFSv4 客户端。

```bash
#centos安装
yum install nfs-utils
```

- 主机文件系统支持存储数据的功能。
  
  - ext4
  - XFS
- bash必须安装`curl findmnt grep awk blkid lsblk`

```bash
#centos安装
yum install curl util-linux grep gawk
```

- 必须启用装载传播。

官方提供了一个测试脚本，需要在kube-master节点执行：https://raw.githubusercontent.com/longhorn/longhorn/v1.2.4/scripts/environment_check.sh

```bash
#运行脚本前安装jq
[16:04:12 root@node-1 ~]#yum install jq
[16:02:09 root@node-1 ~]#bash 1.sh 
daemonset.apps/longhorn-environment-check created
waiting for pods to become ready (0/3)
waiting for pods to become ready (0/3)
all pods ready (3/3)

  MountPropagation is enabled!

cleaning up...
daemonset.apps "longhorn-environment-check" deleted
clean up complete
#以上输出表示正常
```

## 2.2 使用Helm安装Longhorn

官方提供了俩种安装方式，我们在这里使用helm进行安装

首先在kube-master安装Helm v2.0+。

### 1.部署

```bash
[16:05:21 root@node-1 ~]#helm version
version.BuildInfo{Version:"v3.7.2", GitCommit:"663a896f4a815053445eec4153677ddc24a0a361", GitTreeState:"clean", GoVersion:"go1.16.10"}
```

**添加 Longhorn Helm 存储库**

```bash
helm repo add longhorn https://charts.longhorn.io
```

**从存储库中获取最新图表**

```bash
helm repo update
```

**下载chart包**

```bash
helm  pull longhorn/longhorn
```

**解压**

```bash
tar xf longhorn-1.2.4.tgz
```

**进入目录执行安装**

```bash
cd longhorn
helm install longhorn  --namespace longhorn-system --create-namespace .
```

**验证**

```bash
#pod正常情况下都会是运行状态
kubectl get pod -n longhorn-system 
#验证存储类
[16:51:32 root@node-1 longhorn]#kubectl get storageclasses.storage.k8s.io 
NAME                 PROVISIONER          RECLAIMPOLICY   VOLUMEBINDINGMODE   ALLOWVOLUMEEXPANSION   AGE
longhorn (default)   driver.longhorn.io   Delete          Immediate           true                   8m32s
```

**创建pvc并且挂载验证**

```yaml
apiVersion: v1  
apiVersion: apps/v1 
kind: Deployment    
metadata:           
  name: nginx       
  namespace: default
spec:               
  replicas: 3      
  selector:          
    matchLabels:     
      app: nginx   
  template:          #以下为定义pod模板信息,请查看pod详解
    metadata:
      creationTimestamp: null
      labels:
        app: nginx
    spec:
      containers:
      - name: test
        image: 192.168.10.254:5000/bash/nginx:v1
        volumeMounts: 
        - mountPath: "/data"
          name: data
      volumes:              
        - name: data          
          persistentVolumeClaim: 
            claimName: claim
---
kind: PersistentVolumeClaim
apiVersion: v1
metadata:
  name: claim
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: longhorn
  resources:
    requests:
      storage: 1Gi
```

**创建后验证**

```shell
$kubectl get pvc
NAME    STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   AGE
claim   Bound    pvc-30ec630f-4b4d-4fad-a26f-36f7036919a7   1Gi        RWX            longhorn       2m23s
$kubectl get pod
NAME                    READY   STATUS    RESTARTS   AGE
nginx-996746966-g7fsw   1/1     Running   0          2m26s
nginx-996746966-lw67n   1/1     Running   0          2m26s
nginx-996746966-v7dst   1/1     Running   0          2m26s
```

### 2.修改配置

**存储类配置**

```yaml
persistence:
#是否设置为默认存储类
  defaultClass: true
#文件系统类型ext4与xfs选择一个
  defaultFsType: xfs
#副本数，建议三个
  defaultClassReplicaCount: 1
#删除pvc的策略
  reclaimPolicy: Delete
#以下为高级配置，之后会详细解释其作用
  recurringJobSelector:
    enable: false
    jobList: []
  backingImage:
    enable: false
    name: ~
    dataSourceType: ~
    dataSourceParameters: ~
    expectedChecksum: ~
```

**全局配置**

```yml
defaultSettings:
#备份相关
  backupTarget: ~
  backupTargetCredentialSecret: ~
  allowRecurringJobWhileVolumeDetached: ~
#仅在具有node.longhorn.io/create-default-disk=true标签的节点上初始化数据目录，默认为false在所有节点初始化数据目录
  createDefaultDiskLabeledNodes: ~
#默认数据目录位置，不配置默认为/var/lib/longhorn/
  defaultDataPath: /var/lib/longhorn
#默认数据位置，默认选项为disabled，还有best-effort，表示使用卷的pod是否与卷尽量在同一个node节点，默认为不进行这个限制。
  defaultDataLocality: ~
#卷副本是否为软亲和，默认false表示相同卷的副本强制调度到不同节点，如果为true则表示同一个卷的副本可以在同一个节点
  replicaSoftAntiAffinity: ~
#副本是否进行自动平衡。默认为disabled关闭，least-effort平衡副本以获得最小冗余，best-effort此选项指示 Longhorn 尝试平衡副本以实现冗余。
  replicaAutoBalance: ~
#存储超配置百分比默认200，已调度存储+已用磁盘空间（存储最大值-保留存储）未超过之后才允许调度新副本实际可用磁盘容量的 200%
  storageOverProvisioningPercentage: ~
#存储最小可用百分比默认,默认设置为 25，Longhorn 管理器仅在可用磁盘空间（可用存储空间）减去磁盘空间量且可用磁盘空间仍超过实际磁盘容量（存储空间）的 25%后才允许调度新副本）。否则磁盘将变得不可调度，直到释放更多空间。
  storageMinimalAvailablePercentage: ~
#定期检查版本更新，默认true启用
  upgradeChecker: ~
#创建卷时的默认副本数默认为3
  defaultReplicaCount: ~
#默认Longhorn静态存储类名称，默认值longhorn-static
  defaultLonghornStaticStorageClass: ~
#轮询备份间隔默认300，单位秒
  backupstorePollInterval: ~
#优先级配置
  priorityClass: ~
#卷出现问题自动修复，默认为true
  autoSalvage: ~
#驱逐相关
  disableSchedulingOnCordonedNode: ~
#副本亲和相关
  replicaZoneSoftAntiAffinity: ~
  nodeDownPodDeletionPolicy: ~
#存储安全相关，默认false，如果节点包含卷的最后一个健康副本，Longhorn将阻塞该节点上的kubectl清空操作。
  allowNodeDrainWithLastHealthyReplica: ~
#如果使用ext4文件系统允许设置其他创建参数，以支持旧版本系统内核
  mkfsExt4Parameters: ~
#副本有问题的重建间隔默认600秒 
  replicaReplenishmentWaitInterval: ~
#一个节点同时重建副本的个数，默认5个，超过会阻塞
  concurrentReplicaRebuildPerNodeLimit: ~
#允许引擎控制器和引擎副本在每次数据写入时禁用修订计数器文件更新。默认false
  disableRevisionCounter: ~
#Pod镜像拉取策略与k8s一致
  systemManagedPodsImagePullPolicy: ~
#此设置允许用户创建和挂载在创建时没有计划所有副本的卷，默认true，生产建议关闭
  allowVolumeCreationWithDegradedAvailability: ~
#此设置允许Longhorn在副本重建后自动清理系统生成的快照，默认true
  autoCleanupSystemGeneratedSnapshot: ~
#升级相关
  concurrentAutomaticEngineUpgradePerNodeLimit: ~
#备份相关
  backingImageCleanupWaitInterval: ~
  backingImageRecoveryWaitInterval: ~
#资源限制相关
  guaranteedEngineManagerCPU: ~
  guaranteedReplicaManagerCPU: ~
```

**csi配置**

```yaml
csi:
#主要是这里需要修改为kubelet的--root-dir参数
  kubeletRootDir: /data1/kubelet/root                                                                        
  attacherReplicaCount: ~
  provisionerReplicaCount: ~
  resizerReplicaCount: ~
  snapshotterReplicaCount: ~
```

# 三、运维相关

## 3.1 为UI控制台设置认证

UI控制台自己并没有认证功能，依赖与ingress提供认证功能，这里使用ingress-nginx演示：

```bash
#创建认证文件
USER=admin; PASSWORD=123456; echo "${USER}:$(openssl passwd -stdin -apr1 <<< ${PASSWORD})" >> auth
#创建密钥
kubectl -n longhorn-system create secret generic basic-auth --from-file=auth
#创建ingress
apiVersion: networking.k8s.io/v1beta1
kind: Ingress
metadata:
  name: longhorn-ingress
  namespace: longhorn-system
  annotations:
    nginx.ingress.kubernetes.io/auth-type: basic
    nginx.ingress.kubernetes.io/ssl-redirect: 'false'
    nginx.ingress.kubernetes.io/auth-secret: basic-auth
    nginx.ingress.kubernetes.io/auth-realm: 'Authentication Required '
    nginx.ingress.kubernetes.io/proxy-body-size: 10000m
spec:
  rules:   
  - host: www.longhornio.org
    http: 
      paths:
      - pathType: Prefix
        path: "/"
        backend:
          serviceName: longhorn-frontend
          servicePort: 80
```

## 3.2 k8s中创建存储类

使用 kubectl 创建 Longhorn Volumes时，首先您将创建一个 Longhorn StorageClass。接下来，创建一个引用存储类的 PersistentVolumeClaim。最后，PersistentVolumeClaim 作为 Pod 中的卷挂载。部署 Pod 后，Kubernetes 主节点将检查 PersistentVolumeClaim，以确保资源请求可以得到满足。如果存储可用，Kubernetes 主节点将创建 Longhorn 卷并将其绑定到 Pod。

官方示例文件：

```yaml
kind: StorageClass
apiVersion: storage.k8s.io/v1
metadata:
  name: longhorn-test           #名称
provisioner: driver.longhorn.io
allowVolumeExpansion: true      #动态扩容
reclaimPolicy: Delete           #删除策略
volumeBindingMode: Immediate    #绑定卷模式
parameters:       #以下为Longhorn设置
  numberOfReplicas: "2"   #副本数
  staleReplicaTimeout: "2880"  #错误副本清理周期默认48小时
  fromBackup: ""
  fsType: "ext4"   #卷文件系统类型ext4或xfs
```

## 3.3 卷扩展

使用StorageClass创建的卷，可以直接修改pvc的`spec.resources.requests.storage`字段进行扩容,如果卷是被挂载状态修改完成后并不会立马进行扩容操作，必须停止挂载pvc的Pod使pvc处于`detached`状态后才会进行扩容操作。

在扩展期间不允许重建和添加复制副本，在重建或添加复制副本时不允许扩展。

**示例**：

```bash
$ kubectl get pvc
NAME    STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   AGE
claim   Bound    pvc-5119939d-ff12-42c4-b6f8-5d2fcc393bc2   1Gi        RWX            longhorn       11s
$ kubectl edit pvc claim
spec:
  accessModes:
  - ReadWriteMany
  resources:
    requests:
      storage: 2Gi  #修改
$kubectl get pvc
NAME    STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   AGE
claim   Bound    pvc-5119939d-ff12-42c4-b6f8-5d2fcc393bc2   2Gi        RWX            longhorn       63s
```

## 3.4 单节点多磁盘实现

Longhorn 支持在节点上使用多个磁盘来存储卷数据，默认情况下会初始k8s所有的node节点作为Longhorn的数据节点，默认的数据目录为`/var/lib/longhorn`。但是可以通过安装时设置`createDefaultDiskLabeledNodes`为true，改变默认操作表示只有`node.longhorn.io/create-default-disk=true`标签的node才会初始化数据目录，可以不给节点打这个标签，之后手动在UI页面配置各个节点的磁盘，配置方式如下。

- 修改部署helm的valuse文件，重新部署

```shell
defaultSettings:
  createDefaultDiskLabeledNodes: true  #修改这个值

#重新部署
$ helm install longhorn -n longhorn-system .
```

- UI验证

可以看到所有node都是禁止调度以及没有数据目录的状态

![image-20220517135320789](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20220517135320789.png)

- node添加磁盘

选择一个node节点,点击`Edit Node and Disks`进入编辑状态。

点击`Add Disk`进行数据目录的添加，数据目录需事先进行格式化硬盘并且挂载到相应目录

可以重复添加多个数据目录，每个数据目录对应一个物理磁盘

![image-20220517141202652](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20220517141202652.png)

**填写的内容有**

- Name: 磁盘名称
- Path：数据目录路径
- Storage Reserved: 保留空间
- Scheduling: 是否允许调度
- Eviction Requested: 是否驱逐副本

## 3.5 驱逐节点上的副本与磁盘

驱逐节点上的副本需要在UI页面进行操作，在Node选项卡找到对应的节点，需要先设置禁用节点相应磁盘后在设置驱逐副本。

**驱逐节点磁盘副本**

1. 到选项卡，选择其中一个节点，然后在下拉菜单中进行选择。`Node Edit Node and Disks`
2. 确保已禁用磁盘以进行调度并设置为 。`Scheduling Disable`
3. 设置为并保存。`Eviction Requested true`
4. 之后等待磁盘中的副本变为0，即可进行删除磁盘操作

![image-20220517134121358](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20220517134121358.png)

**驱逐节点所有副本**

1. 转到选项卡，选择一个或多个节点，然后单击 。`Node Edit Node`
2. 确保已禁用节点以进行调度并设置为 。`Scheduling Disable`
3. 设置为 ，然后保存。`Eviction Requested true`

![image-20220517134420184](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20220517134420184.png)

## 3.6 移除node节点步骤

1. 禁用磁盘调度。
2. 逐出节点上的所有副本。
3. 驱逐节点所有Pod

```
kubectl drain <node-name>
```

1. 使用选项卡中的 从 Longhorn 中删除节点。`Delete Node`
   
   或者，从 Kubernetes 中删除该节点，使用：
   
   ```
   kubectl delete node <node-name>
   ```
2. Longhorn 将自动从群集中删除该节点。

## 3.7 卷访问模式

Longhorn部署在k8s中时创建PVC时可指定俩种访问模式分别为`ReadWriteMany`,`ReadWriteOnce`,俩种模式在Pod中的挂载方式有所不同。

**ReadWriteMany：可以被多个Pod以读写的方式进行挂载**

当pvc被定义为`ReadWriteMany`访问模式时，当挂载这个pvc的Pod启动时Longhorn会创建一个共享挂载的容器以iSCSI的方式先把这个pvc挂载到这个pod，之后所有挂载这个Pod的容器都以nfs的方式通过这个容器挂载这个Pod，从而实现一个PVC可以被多个Pod挂载

```bash
[15:49:26 root@nexus test]#kubectl get pod -n longhorn-system -l longhorn.io/component=share-manager
NAME                                                     READY   STATUS    RESTARTS   AGE
share-manager-pvc-e8dc9c09-f46e-46bf-8873-4aa6b1cc2a4e   1/1     Running   0          8m9s  #共享容器
[15:50:15 root@nexus test]#kubectl get svc -n longhorn-system -l longhorn.io/managed-by=longhorn-manager
NAME                                       TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)     AGE
pvc-e8dc9c09-f46e-46bf-8873-4aa6b1cc2a4e   ClusterIP   172.10.53.247    <none>        2049/TCP    8m56s  #共享容器的svc
#pod中验证
root@nginx-996746966-cvr94:/# df -h
Filesystem                                               Size  Used Avail Use% Mounted on
172.10.53.247:/pvc-e8dc9c09-f46e-46bf-8873-4aa6b1cc2a4e 1014M   39M  975M   4% /data    #通过共享容器的svc以nfs方式挂载
```

**ReadWriteOnce: 只允许一个Pod挂载**

当pvc被定义为`ReadWriteOnce`访问模式时，挂载Pvc的Pod会直接以iSCSI方式挂载这个pvc

```bash
[15:50:27 root@nexus test]#kubectl get pvc
NAME                        STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   AGE
nginx-nginx-statefulset-0   Bound    pvc-24a2da15-d1fb-4e33-a99a-ed32081b52a2   1Gi        RWO            longhorn       28m
#pod中验证
root@nginx-statefulset-3:/# df -h 
Filesystem                                              Size  Used Avail Use% Mounted on
/dev/longhorn/pvc-5785b32c-fc5e-4122-939a-57f8eb306d78 1014M   40M  975M   4% /data
```

## 3.8 高可用相关

### 1.自动平衡副本

当副本在节点或区域上的调度不均匀时，Longhorn 设置允许副本在新节点可用于群集时进行自动平衡。

设置参数为`eplicaAutoBalance`，全局配置，可以安装时在valuse中设置

- `disabled`.这是默认选项，不会执行副本自动平衡。
- `least-effort`.此选项指示 Longhorn 平衡副本以实现最小冗余。例如，添加节点 2 后，具有 4 个不平衡副本的卷将仅重新平衡 1 个副本。
- `best-effort`.此选项指示 Longhorn 尝试平衡副本以实现均匀冗余。例如，添加节点 2 后，具有 4 个不平衡副本的卷将重新平衡 2 个副本。

**在存储类中设置**

```yaml
kind: StorageClass
apiVersion: storage.k8s.io/v1
metadata:
  name: hyper-converged
provisioner: driver.longhorn.io
allowVolumeExpansion: true
parameters:
  numberOfReplicas: "3"
  replicaAutoBalance: "least-effort"  #这里设置
  staleReplicaTimeout: "2880" # 48 hours in minutes
  fromBackup: ""
```

# 四、监控告警

官方文档：https://longhorn.io/docs/1.2.4/monitoring

这里采用kube-Prometheus项目进行监控。

Longhorn 在 REST 端点上以 Prometheus 文本格式原生公开指标。`http://LONGHORN_MANAGER_IP:PORT/metrics`

官方示例。监控系统使用Prometheus来收集数据和警报，Grafana用于可视化/仪表板收集的数据。从高级概述来看，监控系统包含：

- Prometheus服务器，从Longhorn指标端点抓取和存储时间序列数据。Prometheus还负责根据配置的规则和收集的数据生成警报。然后，Prometheus服务器向警报管理器发送警报。
- 然后，AlertManager 管理这些警报，包括静音、抑制、聚合以及通过电子邮件、待命通知系统和聊天平台等方法发送通知。
- Grafana查询Prometheus服务器以获取数据并绘制用于可视化的仪表板。

![图像](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/longhorn-monitoring-system.png)

## 4.1 使用ServiceMonitor获取指标数据

**示例文件**

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: longhorn
  namespace: monitoring
  labels:
    name: longhorn
spec:
  endpoints:
  - port: manager
  selector:
    matchLabels:
      app: longhorn-manager
  namespaceSelector:
    matchNames:
    - longhorn-system
```

## 4.2 创建ruleg告警规则

示例：

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  labels:
    prometheus: longhorn
    role: alert-rules
  name: prometheus-longhorn-rules
  namespace: monitoring
spec:
  groups:
  - name: longhorn.rules
    rules:
    - alert: LonghornVolumeActualSpaceUsedWarning
      annotations:
        description: The actual space used by Longhorn volume {{$labels.volume}} on {{$labels.node}} is at {{$value}}% capacity for
          more than 5 minutes.
        summary: The actual used space of Longhorn volume is over 90% of the capacity.
      expr: (longhorn_volume_actual_size_bytes / longhorn_volume_capacity_bytes) * 100 > 90
      for: 5m
      labels:
        issue: The actual used space of Longhorn volume {{$labels.volume}} on {{$labels.node}} is high.
        severity: warning
    - alert: LonghornVolumeStatusCritical
      annotations:
        description: Longhorn volume {{$labels.volume}} on {{$labels.node}} is Fault for
          more than 2 minutes.
        summary: Longhorn volume {{$labels.volume}} is Fault
      expr: longhorn_volume_robustness == 3
      for: 5m
      labels:
        issue: Longhorn volume {{$labels.volume}} is Fault.
        severity: critical
    - alert: LonghornVolumeStatusWarning
      annotations:
        description: Longhorn volume {{$labels.volume}} on {{$labels.node}} is Degraded for
          more than 5 minutes.
        summary: Longhorn volume {{$labels.volume}} is Degraded
      expr: longhorn_volume_robustness == 2
      for: 5m
      labels:
        issue: Longhorn volume {{$labels.volume}} is Degraded.
        severity: warning
    - alert: LonghornNodeStorageWarning
      annotations:
        description: The used storage of node {{$labels.node}} is at {{$value}}% capacity for
          more than 5 minutes.
        summary:  The used storage of node is over 70% of the capacity.
      expr: (longhorn_node_storage_usage_bytes / longhorn_node_storage_capacity_bytes) * 100 > 70
      for: 5m
      labels:
        issue: The used storage of node {{$labels.node}} is high.
        severity: warning
    - alert: LonghornDiskStorageWarning
      annotations:
        description: The used storage of disk {{$labels.disk}} on node {{$labels.node}} is at {{$value}}% capacity for
          more than 5 minutes.
        summary:  The used storage of disk is over 70% of the capacity.
      expr: (longhorn_disk_usage_bytes / longhorn_disk_capacity_bytes) * 100 > 70
      for: 5m
      labels:
        issue: The used storage of disk {{$labels.disk}} on node {{$labels.node}} is high.
        severity: warning
    - alert: LonghornNodeDown
      annotations:
        description: There are {{$value}} Longhorn nodes which have been offline for more than 5 minutes.
        summary: Longhorn nodes is offline
      expr: (avg(longhorn_node_count_total) or on() vector(0)) - (count(longhorn_node_status{condition="ready"} == 1) or on() vector(0)) > 0
      for: 5m
      labels:
        issue: There are {{$value}} Longhorn nodes are offline
        severity: critical
    - alert: LonghornIntanceManagerCPUUsageWarning
      annotations:
        description: Longhorn instance manager {{$labels.instance_manager}} on {{$labels.node}} has CPU Usage / CPU request is {{$value}}% for
          more than 5 minutes.
        summary: Longhorn instance manager {{$labels.instance_manager}} on {{$labels.node}} has CPU Usage / CPU request is over 300%.
      expr: (longhorn_instance_manager_cpu_usage_millicpu/longhorn_instance_manager_cpu_requests_millicpu) * 100 > 300
      for: 5m
      labels:
        issue: Longhorn instance manager {{$labels.instance_manager}} on {{$labels.node}} consumes 3 times the CPU request.
        severity: warning
    - alert: LonghornNodeCPUUsageWarning
      annotations:
        description: Longhorn node {{$labels.node}} has CPU Usage / CPU capacity is {{$value}}% for
          more than 5 minutes.
        summary: Longhorn node {{$labels.node}} experiences high CPU pressure for more than 5m.
      expr: (longhorn_node_cpu_usage_millicpu / longhorn_node_cpu_capacity_millicpu) * 100 > 90
      for: 5m
      labels:
        issue: Longhorn node {{$labels.node}} experiences high CPU pressure.
        severity: warning
```

## 4.3 导入grafana模板

模板：https://grafana.com/grafana/dashboards/13032

# 五、备份相关

## 5.1 快照功能

快照是 Kubernetes 卷在任何给定时间点的状态。

要创建现有集群的快照，

1. 在 Longhorn UI 的顶部导航栏中，单击**Volume**。
2. 单击要为其拍摄快照的卷的名称。这将进入卷详细页面。
3. 单击**Take Snapshot**按钮

创建快照后，您将在卷头之前的卷快照列表中看到它

## 5.2 卷克隆

Longhorn 支持 CSI 卷克隆。官方说明https://kubernetes.io/docs/concepts/storage/volume-pvc-datasource/

**示例**：

```yaml
kind: PersistentVolumeClaim
apiVersion: v1
metadata:
  name: claim
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: longhorn
  resources:
    requests:
      storage: 1Gi
```

您可以通过应用以下 yaml 文件来创建一个内容与 完全相同的新 PVC，除了官方的一些要求之外还必须满足cloned-claim和claim的`resources.requests.storage`相同。

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: cloned-claim
spec:
  storageClassName: longhorn
  dataSource:
    name: claim
    kind: PersistentVolumeClaim
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 1Gi
```

创建后验证：

```bash
[16:15:14 root@nexus test]#kubectl get pvc
NAME           STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   AGE
claim          Bound    pvc-e8dc9c09-f46e-46bf-8873-4aa6b1cc2a4e   1Gi        RWX            longhorn       50m
cloned-claim   Bound    pvc-911789f9-fe73-44a8-bc12-7cd53674bf04   1Gi        RWO            longhorn       2m49s
```

## 5.3 备份详解

Longhorn可以备份数据到s3对象存储或者nfs当中，并且可以设置定期备份。

### 1.备份目标设置

备份目标是用于访问 Longhorn 中的备份存储的端点。备份存储是 NFS 服务器或 S3 兼容服务器，用于存储 Longhorn 卷的备份。

我这里使用minio与nfs进行演示，如果使用其他s3对象存储请查看官方文档：https://longhorn.io/docs/1.2.4/snapshots-and-backups/backup-and-restore/set-backup-target/

备份目标的配置有俩项分别是

backupTarget：备份目标设置

```bash
s3://对象存储桶名称@区域/目录名称/
s3://backupbucket@us-east-1/backup/
#这里的区域如果使用minio没有的话可以设置默认us-east-1
#如果设置了桶下的目录名称会备份到子目录，不设置则备份到桶

#nfs设置如下
nfs://nfs服务器地址:nfs服务器共享目录位置
nfs://longhorn-test-nfs-svc.default:/opt/backupstore
```

backupTargetCredentialSecret：备份目标的其他设置是secret资源名称，资源配置如下,只有使用s3对象存储才会有这个配置

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: minio-secret
  namespace: longhorn-system
type: Opaque
data:  
  AWS_ACCESS_KEY_ID: xxx   #密钥key
  AWS_SECRET_ACCESS_KEY: xxxx #密钥key
  AWS_ENDPOINTS: xxxx #对象存储访问地址
  AWS_CERT: xxxx     #如果启用了https需要在这里放入证书，没有可以不配置
```

**MInio配置示例**：

需先部署minio服务，之后进行配置：

安装时设置，需修改values文件：

```yaml
defaultSettings:
  backupTarget: s3://backupbucket@us-east-1/
  backupTargetCredentialSecret: minio-secret
#执行部署，部署后需配置minio-secret，必须配置到安装longhorn的命名空间
helm install longhorn -n longhorn-system . 
#创建minio-secret
kubectl create secret generic minio-secret -n longhorn-system \
--from-literal=AWS_ACCESS_KEY_ID=minio \
--from-literal=AWS_SECRET_ACCESS_KEY=minio123 \
--from-literal=AWS_ENDPOINTS=http://192.168.10.254:9000
```

配置完成后登录UI页面点击`Backup`选项卡，没有任何报错信息表示配置没有问题。

**NFS配置示例**：

```yaml
defaultSettings:
  backupTarget: nfs://192.168.254:/nfs/backup
  backupTargetCredentialSecret: ~  #保持默认即可
```

### 2.手动创建备份

必须设置备份目标。确定备份目标配置没有问题，并且备份的volume必须处于挂载状态才可以进行备份。

1. 导航到**Volume**菜单。
2. 选择要备份的卷。
3. 单击**Create backup**
4. 添加任何适当的标签，然后单击确定。

创建完成后可以在**Backup**导航菜单看到所创建的备份。

### 3.定期备份

可以在UI中配置，也可以在k8s中进行配置，他是一个CRD资源`RecurringJob`。

```yml
apiVersion: longhorn.io/v1beta1
kind: RecurringJob
metadata:
  name: backup
  namespace: longhorn-system
spec:
  cron: "*/5 * * * *"
  task: "backup"
  groups:
  - default
  - group1
  retain: 1
  concurrency: 2
  labels:
    label/1: a
    label/2: b
```

- `name`：定期作业的名称。不要使用重复的名称。并且的长度不应超过40个字符。
- `task`：作业类型。它支持（定期创建快照）或（定期创建快照然后进行备份）。选项有`snapshot`，`backup`
- `cron`：克伦表达式。它告诉作业的执行时间。
- `retain`：Longhorn 将为每个卷作业保留多少个快照/备份。它应该不小于1。
- `concurrency`：要并发运行的作业数。它应该不小于1。

可以指定可选参数：

- `groups`：作业应属于的组，默认volues创建后都属于default组，所以如果对所有卷进行备份请设置default，如果不同的卷有不同的备份请配置不同组
- `labels`：创建快照与备份后添加相应的标签。

### 4.允许在分离状态的卷进行备份作业

Longhorn 提供的设置允许您执行定期备份，即使卷已分离也是如此。

您可以在 Longhorn UI 中找到该设置。`allow-recurring-job-while-volume-detached`，安装时设置项在values配置文件中。

启用该设置后，Longhorn 将自动附加卷，并在需要执行定期快照/备份时拍摄快照/备份。

请注意，在自动附加卷期间，卷尚未准备好执行工作负载。工作负荷必须等到定期作业完成。

## 5.4 重备份还原pvc

还原操作必须去UI页面进行操作，需要先删除要还原的卷。

1. 导航到**Backup**
2. 选择要还原的备份，然后单击**Restore Backup backup**
3. 在**name**字段中，选择要还原的卷。
4. 单击**OK**
5. 此时卷已经恢复但是PVC是不会自己创建的需要进行Volume中找到恢复的卷点击编辑选择`Create PV/PVC`配置完成后点击`OK`即可。

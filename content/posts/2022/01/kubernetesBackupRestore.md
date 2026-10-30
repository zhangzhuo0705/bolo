---
title: "kubernetes集群备份与恢复"
date: 2022-01-09T16:51:54+08:00
lastmod: 2022-02-09T10:40:29+08:00
draft: false
description: "讲解 Kubernetes 集群备份思路，演示 etcd 数据的备份与恢复流程。"
cover: "https://b3logfile.com/bing/20191001.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["Kubernetes"]
tags: ["Kubernetes", "velero"]
toc: true
---
# 一、k8s集群备份与恢复

k8s集群服务所有组件都是无状态服务，所有数据都存储在etcd集群当中，所以为保证k8s集群的安全可以直接备份etcd集群数据，备份etcd的数据相当于直接备份k8s整个集群。

但是备份etcd及备份整个集群，有些场景比如迁移服务，只想备份一个namespace，就无法使用备份etcd的方式来备份，所以我们这里引用velero工具，Velero（以前称为Heptio Ark）可以为您提供了备份和还原**Kubernetes**集群资源和持久卷的能力，你可以在公有云或本地搭建的私有云环境安装**Velero**。

# 二、k8s备份-备份etcd

etcd有多个不同的API访问版本，v1版本已经废弃，etcd v2 和 v3 本质上是共享同一套 raft 协议代码的两个独立的应用，接口不一样，存储不一样，数据互相隔离。也就是说如果从 Etcd v2 升级到 Etcd v3，原来v2 的数据还是只 能用 v2 的接口访问，v3 的接口创建的数据也只能访问通过 v3 的接口访问。

## 2.1 etcd v2版本数据备份与恢复

**备份数据**

```bash
#V2版本帮助信息
[16:11:16 root@k8s-master3 ~]#ETCDCTL_API=2 etcdctl backup --help
NAME:
   etcdctl backup - backup an etcd directory

USAGE:
   etcdctl backup [command options]  

OPTIONS:
   --data-dir value        源数据目录
   --wal-dir value         wal日志源目录
   --backup-dir value      备份到那个目录
   --backup-wal-dir value  备份日志到那个目录
   --with-v3               Backup v3 backend data

#V2版本备份数据
[16:13:07 root@k8s-master3 ~]#ETCDCTL_API=2 etcdctl backup --data-dir /var/lib/etcd --backup-dir /opt/etcd_backup
[16:13:21 root@k8s-master3 ~]#file /opt/etcd_backup/member/snap/db 
/opt/etcd_backup/member/snap/db: data
```

**恢复数据**

```bash
#恢复帮助信息
[16:18:21 root@k8s-master3 ~]#etcd --help | grep force
  --force-new-cluster 'false'

#恢复数据，恢复时会覆盖 snapshot 的元数据，所以需要启动一个新的集群。
[16:23:24 root@k8s-master3 ~]#etcd --data-dir=/opt/etcd_backup --force-new-cluster

#修改service文件
[16:27:53 root@k8s-master3 ~]#vim /etc/systemd/system/etcd.service
--data-dir=/var/lib/etcd  -force-new-cluster \ #强制设置为为新集群

#重启服务
```

## 2.2 etcd v3版本数据备份与恢复

**数据备份**

一般的k8s集群数据都是存放在etcd的api版本3中所以不需要使用v2版本的备份方式直接使用v3版本，不过有些k8s组件要是版本比较旧可能会使用v2的api，需要提前确认

```bash
#V3版本备份数据 
[16:31:30 root@k8s-master3 ~]#ETCDCTL_API=3 etcdctl snapshot save snapshot.db

[16:32:13 root@k8s-master3 ~]#file snapshot.db 
snapshot.db: data
```

**数据恢复**

```bash
#V3版本恢复数据
[16:32:29 root@k8s-master3 ~]#ETCDCTL_API=3 etcdctl snapshot restore snapshot.db --data-dir=/mnt/etcd  #将数据恢复到一个新的不存在的目录中

[16:33:49 root@k8s-master3 ~]#ls /mnt/etcd/member/snap/db -hl
-rw------- 1 root root 4.4M Jun 17 16:33 /mnt/etcd/member/snap/db
```

## 2.3 etcd数据备份脚本

```bash
#!/bin/bash

#备份目录
backup_dir="/root/etcd"
#保持5个最新的备份，其余删除
num=5
#etcdctl配置参数
export ETCDCTL_ENDPOINTS=https://192.168.10.101:2379 #etcd服务器地址
export ETCDCTL_CACERT=/etc/etcd/ssl/ca.pem  #etcd的CA证书
export ETCDCTL_CERT=/etc/etcd/ssl/etcd.pem  #etcd证书
export ETCDCTL_KEY=/etc/etcd/ssl/etcd-key.pem #etcd私钥


source /etc/profile
DATE=`date +%Y-%m-%d-%H-%M-%S`
ETCDCTL_API=3 etcdctl snapshot save ${backup_dir}/etcd-snapshot-${DATE}.db &>/dev/null && echo "etcd备份完成" || { echo "etcd备份失败";exit; }
cd $backup_dir && tar czf etcd-backup-${DATE}.tar.gz etcd-snapshot-${DATE}.db --remove-files



file_name=`ls -lt ${backup_dir} | awk  'NR!=1{print $9}' | awk 'NR>5{print}'`
cd $backup_dir
for name in ${file_name};do
  rm -f $name
done
```

### 1.1.4 k8s集群etcd备份恢复流程

**如果实际环境可以考虑写一个恢复脚本，避免手动恢复**

```bash
1、恢复服务器系统
2、重新部署ETCD集群
3、停止kube-apiserver/controller-manager/scheduler/kubelet/kube-proxy
4、停止ETCD集群
5、各ETCD节点恢复同一份备份数据
6、启动各节点并验证ETCD集群
7、启动kube-apiserver/controller-manager/scheduler/kubelet/kube-proxy
8、验证k8s master状态及pod数据
```

# 三、k8s备份-velero

## 3.1 velero简介

官方网站：https://velero.io/

github网站：https://github.com/vmware-tanzu/velero

Velero（以前称为Heptio Ark）可以为您提供了备份和还原**Kubernetes**集群资源和持久卷的能力，你可以在公有云或本地搭建的私有云环境安装**Velero**,可以为你提供以下能力：

- 备份集群数据，并在集群故障的情况下进行还原
- 将集群资源迁移到其他集群
- 将您的生产集群复制到开发和测试集群

Velero包含：

- 在集群上运行的服务器端
- 在本地运行的命令行客户端

**velero工作原理**

每个Velero的操作（如按需备份，计划备份，还原）都是自定义资源，使用Kubernetes 自定义资源定义（CRD）定义并存储在 etcd中，Velero还包括处理自定义资源以执行备份，还原以及所有相关操作的控制器，可以备份或还原群集中的所有对象，也可以按类型，命名空间或标签过滤对象。Velero是kubernetes用来灾难恢复的理想选择，也是在集群上执行系统操作（如升级）之前对应用程序状态进行快照的理想选择。

## 3.2 velero部署

包下载地址：https://github.com/vmware-tanzu/velero/releases/download/v1.6.3/velero-v1.6.3-linux-amd64.tar.gz

### 1.安装

```bash
[17:11:47 root@k8s-master1 ~]#ls
velero-v1.6.3-linux-amd64.tar.gz    
[17:12:20 root@k8s-master1 ~]#tar xf velero-v1.6.3-linux-amd64.tar.gz -C /usr/local/src/
[17:12:51 root@k8s-master1 ~]#cd /usr/local/src/
[17:13:06 root@k8s-master1 src]#ls
lua-5.4.3  lua-5.4.3.tar.gz  velero-v1.6.3-linux-amd64
[17:13:08 root@k8s-master1 src]#ln -sf /usr/local/src/velero-v1.6.3-linux-amd64/velero /usr/local/bin/

#验证
[17:43:41 root@k8s-master1 ~]#velero version 
Client:
	Version: v1.6.3
	Git commit: 5fe3a50bfddc2becb4c0bd5e2d3d4053a23e95d2
Server:
	Version: v1.6.3

#安装命令补齐
[17:44:21 root@k8s-master1 ~]#velero completion bash >/etc/profile.d/velero.sh
```

### 2.准备镜像

```bash
#下载镜像
[17:17:18 root@centos7 ~]#docker pull velero/velero:v1.6.3
[17:18:37 root@centos7 ~]#docker pull velero/velero-plugin-for-aws:v1.2.1 

#修改tag
[17:19:10 root@centos7 ~]#docker tag velero/velero:v1.6.3 harbor.zhangzhuo.org/velero/velero:v1.6.3
[17:19:59 root@centos7 ~]#docker tag velero/velero-plugin-for-aws:v1.2.1 harbor.zhangzhuo.org/velero/velero-plugin-for-aws:v1.2.1

#上传到本地harbor镜像库
[17:20:08 root@centos7 ~]#docker pull harbor.zhangzhuo.org/velero/velero:v1.6.3 
[17:20:41 root@centos7 ~]#docker pull harbor.zhangzhuo.org/velero/velero-plugin-for-aws:v1.2.1
```

### 3.准备对象存储

对象存储只要是符合s3协议即可，如果没有官方带了一个minio，可以部署到k8s集群中进行使用，我这里使用ceph的对象存储

```bash
#ceph对象存储准备
#ceph如果要启用对象存储需要启用radosgw守护进程，默认监听7480端口，访问API为http://radosgw进程主机IP:7480
[16:01:19 root@ceph01 ~]#ps -ef | grep ceph
ceph        1052       1  0 Aug23 ?        00:04:27 /usr/bin/radosgw -f --cluster ceph --name client.rgw.ceph01 --setuser ceph --setgroup ceph
[16:01:21 root@ceph01 ~]#ss -ntl | grep 7480
LISTEN     0      128          *:7480                     *:*                  
LISTEN     0      128       [::]:7480                  [::]:* 


#创建用户
[16:40:54 root@ceph01 ceph]#radosgw-admin user create --uid velero --display-name velero 
            "user": "velero",
            "access_key": "EZM18F7C1WLKSAEIOW1E",   #记录这俩行认证信息
            "secret_key": "TsPDzIx7glS2iCRXdOmhafhiAIIooIEIDmh1xifT"  


#设置rclone工具
[16:57:01 root@k8s-master1 ~]#cat .config/rclone/rclone.conf 
[ceph]
type = s3
evn_auth = false
access_key_id = EZM18F7C1WLKSAEIOW1E
secret_access_key = TsPDzIx7glS2iCRXdOmhafhiAIIooIEIDmh1xifT
region = us-east-1
endpoint = http://192.168.10.41:7480

#创建桶，ceph想创建桶需要在dashboard的web进行创建，我这里使用rclone命令工具进行创建
[16:40:32 root@k8s-master1 velero]#rclone mkdir ceph:velero
[16:40:41 root@k8s-master1 velero]#rclone lsd ceph:
          -1 2021-08-26 16:40:41        -1 velero
```

### 4.准备在有kubectl工具的k8s集群启动velero

```bash
#准备认证文件
[17:04:09 root@k8s-master1 velero]#cat credentials-velero 
[default]
aws_access_key_id = EZM18F7C1WLKSAEIOW1E
aws_secret_access_key = TsPDzIx7glS2iCRXdOmhafhiAIIooIEIDmh1xifT

#启动velero
velero install \
--image 192.168.10.254:5000/velero/velero:v1.7.0 \
--provider aws  \
--plugins 192.168.10.254:5000/velero/velero-plugin-for-aws:latest \
--bucket velero \
--secret-file ./credentials-velero \
--backup-location-config region=us-east-2,s3ForcePathStyle="true",s3Url=http://192.168.10.41:7480

#验证，没有error即为正常
[17:09:23 root@k8s-master1 velero]#kubectl logs deployment/velero -n velero | tail
time="2021-08-26T09:08:59Z" level=info msg="Checking for expired DeleteBackupRequests" controller=backup-deletion logSource="pkg/controller/backup_deletion_controller.go:596"
time="2021-08-26T09:08:59Z" level=info msg="Done checking for expired DeleteBackupRequests" controller=backup-deletion logSource="pkg/controller/backup_deletion_controller.go:624"
time="2021-08-26T09:08:59Z" level=info msg="Starting controller" controller=restore logSource="pkg/controller/generic_controller.go:76"
time="2021-08-26T09:08:59Z" level=info msg="Starting controller" controller=restic-repo logSource="pkg/controller/generic_controller.go:76"
time="2021-08-26T09:08:59Z" level=info msg="Starting controller" controller=backup-sync logSource="pkg/controller/generic_controller.go:76"
time="2021-08-26T09:08:59Z" level=info msg="Starting controller" controller=backup logSource="pkg/controller/generic_controller.go:76"
time="2021-08-26T09:08:59Z" level=info msg="Starting controller" controller=schedule logSource="pkg/controller/generic_controller.go:76"
time="2021-08-26T09:08:59Z" level=info msg="Starting controller" controller=gc logSource="pkg/controller/generic_controller.go:76"
time="2021-08-26T09:09:00Z" level=info msg="Validating backup storage location" backup-storage-location=default controller=backup-storage-location logSource="pkg/controller/backup_storage_location_controller.go:114"
time="2021-08-26T09:09:00Z" level=info msg="Backup storage location valid, marking as available" backup-storage-location=default controller=backup-storage-location logSource="pkg/controller/backup_storage_location_controller.go:121"
```

### 5.启动参数说明

```bash
#velero install下参数
--image  harbor.zhangzhuo.org/velero/velero:v1.6.3  #velero镜像名称，不写默认去官方仓库拉取
--plugins     #插件镜像
--provider      
--bucket         #对象存储bucket名称
--secret-file    #认证文件
--backup-location-config 
--use-restic    #启用restic备份恢复插件，如果使用需要配合标签进行使用
--use-volume-snapshots=false #当在没有Velero支持快照的存储提供商上使用恢复性时，该标志可防止在安装时创建未使用的机标。
```

**常见的启动参数为**

```bash
velero install \
--image 192.168.10.254:5000/velero/velero:v1.7.0 \
--provider aws  \
--plugins 192.168.10.254:5000/velero/velero-plugin-for-aws:latest \
--bucket velero \
--use-restic  \
--use-volume-snapshots=false \
--use-restic \
--secret-file ./credentials-velero \
--backup-location-config region=us-east-2,s3ForcePathStyle="true",s3Url=http://minio-server.server:9000
```

### 6.备份测试

```bash
#备份测试
[17:09:34 root@k8s-master1 velero]#velero backup create dashboard --include-namespaces kubernetes-dashboard
Backup request "dashboard" submitted successfully.
Run `velero backup describe dashboard` or `velero backup logs dashboard` for more details.

[17:13:32 root@k8s-master1 velero]#velero backup describe dashboard
Name:         dashboard
Namespace:    velero
Labels:       velero.io/storage-location=default
Annotations:  velero.io/source-cluster-k8s-gitversion=v1.18.20
              velero.io/source-cluster-k8s-major-version=1
              velero.io/source-cluster-k8s-minor-version=18

Phase:  Completed   #这样表示正常

#对象存储查看备份文件
[17:14:23 root@k8s-master1 velero]#rclone ls ceph:velero
       29 backups/dashboard/dashboard-csi-volumesnapshotcontents.json.gz
       29 backups/dashboard/dashboard-csi-volumesnapshots.json.gz
     3307 backups/dashboard/dashboard-logs.gz
       29 backups/dashboard/dashboard-podvolumebackups.json.gz
      423 backups/dashboard/dashboard-resource-list.json.gz
       29 backups/dashboard/dashboard-volumesnapshots.json.gz
    17191 backups/dashboard/dashboard.tar.gz
     2170 backups/dashboard/velero-backup.json
```

### 7.恢复测试

```bash
#删除备份的kubernetes-dashboard命名空间
[17:23:05 root@k8s-master1 ~]#kubectl delete ns kubernetes-dashboard 
namespace "kubernetes-dashboard" deleted
[17:23:31 root@k8s-master1 ~]#kubectl get ns
NAME              STATUS   AGE
default           Active   22d
ingress-nginx     Active   17d
kube-node-lease   Active   22d
kube-public       Active   22d
kube-system       Active   22d
velero            Active   14m


#恢复
[17:25:42 root@k8s-master1 ~]#velero restore create --from-backup dashboard 
Restore request "dashboard-20210826172754" submitted successfully.
Run `velero restore describe dashboard-20210826172754` or `velero restore logs dashboard-20210826172754` for more details.

#验证日志
[17:28:22 root@k8s-master1 ~]#velero restore describe dashboard-20210826172754
Name:         dashboard-20210826172754
Namespace:    velero
Labels:       <none>
Annotations:  <none>
Phase:                       Completed  #表示恢复成功
Total items to be restored:  31
Items restored:              31

#验证
[17:28:32 root@k8s-master1 ~]#kubectl get ns
NAME                   STATUS   AGE
default                Active   22d
ingress-nginx          Active   17d
kube-node-lease        Active   22d
kube-public            Active   22d
kube-system            Active   22d
kubernetes-dashboard   Active   89s
velero                 Active   20m
[17:29:23 root@k8s-master1 ~]#kubectl get pod -n kubernetes-dashboard 
NAME                                         READY   STATUS    RESTARTS   AGE
dashboard-metrics-scraper-79584b787d-8g8vl   1/1     Running   0          99s
kubernetes-dashboard-9f5df765f-hvxbc         1/1     Running   0          99s
```

## 3.3 velero工具使用详解

如果准备定期备份集群的资源，则能够在发生意外事故（如服务中断）时恢复到以前的状态。也可以进单次的手动备份，默认备份保留期为(720小时即30天标签为TTL)也可以在必要时进行指定保留期。备份时可以进行资源过滤选择资源以及排除不需要要的资源，可以通过备份挂钩实现备份前或者备份后在容器中执行命令，高级一点的功能可以实现备份pod持久数据目录时冻结文件系统。

velero还可以实现集群资源的迁移从一个集群移植到另一个集群，只需要您将每个velero实例指向相同的存储位置。确保kubernetes集群版本一致，镜像仓库访问地址镜像名称一致即可。

### 3.3.1 定期自动备份

如果确保集群，安全请设置定期自动备份，最好设置为每日备份。

**自动备份创建命示例令如下**

```bash
velero schedule create NAME --schedule [flags]
velero create schedule NAME --schedule="0 */6 * * *"
velero create schedule NAME --schedule="@every 6h"   #6小时备份一次，所有集群资源
velero create schedule NAME --schedule="@every 24h" --include-namespaces web   #24小时备份一次web命名空间下所有资源
velero create schedule NAME --schedule="@every 168h" --ttl 2160h0m0s   #168小时备份一次所有集群资源，并且设置保留时间为2160小时

#常用的参数为
--include-namespaces     #选择哪个命名空间备份
--ttl                    #设置保留备份时间
--schedule               #周期时间，跟系统crontab设置类似
```

**示例**

```bash
#创建一个每日备份集群业务命名空间的定时任务
velero schedule create default --schedule="@every 24h" --include-namespaces=default,minio --ttl 72h
#这个是每隔24小时，创建一次备份，24小时周期为你创建定时任务的时间为开始时间

#验证创建的备份
[13:35:56 root@k8s-master ~]#velero backup get
NAME                     STATUS            ERRORS   WARNINGS   CREATED                         EXPIRES   STORAGE LOCATION   SELECTOR
default-20211106053211   PartiallyFailed   1        0          2021-11-06 13:32:11 +0800 CST   2d        default            <none>

#备份名称命名为你创建定时任务的名称加上备份的时间，默认velero容器的时区为UTC时区所以如果在意时间需要修改时区为中国时区，修改方法如下，直接修改部署业务的yaml文件挂在宿主机的时区文件到容器中
示例如下
        - name: runtime
          hostPath:
            path: /etc/localtime
            type: ''
            - name: runtime
              mountPath: /etc/localtime
#删除之前的备份
[14:19:58 root@k8s-master ~]#velero schedule delete default
#再次创建
[14:20:08 root@k8s-master ~]#velero schedule create default --schedule="@every 24h" --include-namespaces=default,minio --ttl 72h
#验证
[14:20:30 root@k8s-master ~]#velero backup get
NAME                     STATUS            ERRORS   WARNINGS   CREATED                         EXPIRES   STORAGE LOCATION   SELECTOR
default-20211106142030   PartiallyFailed   1        0          2021-11-06 14:20:30 +0800 CST   2d        default            <none>
```

**其他的定时备份命令**

```bash
#查看定时备份任务
velero schedule get
#删除定时备份任务
velero schedule delete default
#查看定时备份任务的详细信息
velero schedule describe default
```

### 3.3.2 单次手动备份

**单次备份**

```bash
#单次备份，可以增加各种参数，设置备份策略
velero backup create test --include-namespaces=default
```

**其他backup子命令**

```bash
#查看备份列表，定时备份任务备份的内容也是在这里查看
velero backup get 
#下载备份内容到本地
velero backup download default-20211106142030
#查看备份的详细信息，主要查看备份的状态以及一些元数据
velero backup describe default-20211106142030
#查看备份日志，主要用来查看备份过程中是否有错误，会有错误的详细信息
velero backup logs default-20211106142030
#删除备份，备份任务默认保存30天，即使不手动处理velero也会自动清理
velero backup delete default-20211106142030
```

### 3.3.3 资源过滤

**资源过滤的方式有**

- Includes(包括)
  - –include-namespaces
  - –include-resources
  - –include-cluster-resources
  - –selector
- Excludes(排除)
  - –exclude-namespaces
  - –exclude-resources
  - velero.io/exclude-from-backup=true

#### 1.Includes(包括)

仅包含特定资源，不包括所有其他资源。当包括通配符和特定资源时，通配符优先。

**–include-namespaces(包括命名空间)**

主要用来备份命名空间时，选择备份那个命名空间

```bash
#备份命名空间及其子对象
velero backup create <backup-name> --include-namespaces <namespace>
#恢复俩个命名空间及其对象
velero restore create <backup-name> --include-namespaces <namespace1>,<namespace2>
```

**–include-resources(包括资源)**

主要用来指定备份的资源

```bash
#备份集群中的所有部署。
velero backup create <backup-name> --include-resources deployments
#恢复集群中的所有部署和配置。
velero restore create <backup-name> --include-resources deployments,configmaps
#在特定的命名空间备份部署
velero backup create <backup-name> --include-resources deployments --include-namespaces <namespace>
```

**–include-cluster-resources(包括集群资源)**

此选项有三个值：

- `true`：所有集群范围的资源都包括在内。
- `false`：不包括集群范围资源。

```bash
#备份整个集群，包括集群范围的资源
velero backup create <backup-name>
#仅恢复集群中的名称速度资源
velero restore create <backup-name> --include-cluster-resources=false
#备份命名空间，并包括集群范围的资源
velero backup create <backup-name> --include-namespaces <namespace> --include-cluster-resources=true
```

**-selector(选择器)**

```bash
#包括与标签选择器匹配的资源
velero backup create <backup-name> --selector <key>=<value>
```

#### 2.Excludes(排除)

从备份中排除特定资源。通配符排除被忽略。

**–exclude-namespaces(排除命名空间)**

```bash
#排除特定的命名空间
velero backup create <backup-name> --exclude-namespaces kube-system
#在恢复过程中排除两个命名空间
velero restore create <backup-name> --exclude-namespaces <namespace1>,<namespace2>
```

**–exclude-resources(排除资源)**

```bash
#排除备份中的secrets
velero backup create <backup-name> --exclude-resources secrets
```

**velero.io/exclude-from-backup=true(带有这个标签的资源排除在备份之外)**

带有标签的资源不包括在备份中，即使它包含匹配的选择器标签。`velero.io/exclude-from-backup=true`

### 3.3.4 灾后恢复

集群资源出现问题时，您需要手动进行资源恢复，恢复的资源可以全部恢复，也可以指定过滤

```bash
#恢复指定备份，恢复备份中的所有资源
velero restore create --from-backup=default-20211106142030

#恢复备份中的特定资源，可以写多个
velero restore create --from-backup=default-20211106142030 --include-resources=Deployments

#恢复状态查看

#恢复日志查看
velero restore logs server-20211107211356
```

### 3.3.5 使用restic备份pod持久卷

restic默认情况下是不安装的，所以需要自定义参数进行安装

```bash
#需添加--use-restic开启restic功能
#--use-volume-snapshots=false 当在没有 Velero 支持快照的存储提供商上使用恢复性时，关闭快照卷功能

#使用velero启动后会在每个k8s的node节点运行一个restic的pod负责备份每个pod的持久存储卷
[19:32:15 root@k8s-master ~]#kubectl get pod -n velero 
NAME                      READY   STATUS    RESTARTS   AGE
restic-7pp72              1/1     Running   1          27h
restic-n58md              1/1     Running   2          27h
restic-nn62w              1/1     Running   2          27h
velero-5d5b59ccb9-t792g   1/1     Running   2          27h
```

安装完成后备份kubernetes资源时，只要使用了存储卷的pod都需要进行使用标签进行设置备份或不备份否则会出现备份状态错误的情况，当然即使备份状态错误velero也是可以从备份状态为错误的备份中恢复资源。

velero如果使用restic备份pvc中的数据需要打标签否则默认是不备份的。

```bash
#比如一个pod使用的存储卷定义是
containers: 
      - name: redis 
        image: harbor.zhangzhuo.org/server/redis:6.2.6
        command:
        - redis-server
        - /etc/redis/reids.conf
        resources:
          limits:
            memory: "50Mi"
            cpu: "100m"
          requests:
            cpu: "100m"
            memory: "50Mi"
        volumeMounts:
        - mountPath: /etc/redis
          name: redis-config
        - name: redis-data
          mountPath: "/data"
#备份的标签
kubectl annotate -n 命名空间 pod/pod名称 backup.velero.io/backup-volumes=pod定义的voluem名称

kubectl annotate -n server pod/redis-5c5975fdcc-5plsh backup.velero.io/backup-volumes=redis-data
#排除备份的标签，注意如果设置这个标签velero会不进行备份这个pvc的资源信息
kubectl annotate -n 命名空间 pod/pod名称 backup.velero.io/backup-volumes-excludes=pod定义的voluem名称

kubectl annotate -n server pod/redis-5c5975fdcc-5plsh backup.velero.io/backup-volumes-excludes=redis-data

#使用标签后如何查看
[21:01:17 root@k8s-master ~]#kubectl describe pod -n server redis-5c5975fdcc-5plsh 
Name:         redis-5c5975fdcc-5plsh
Namespace:    server
Annotations:  backup.velero.io/backup-volumes: redis-data   #标签在这里查看

#去除标签，只需要把=换成-即表示去除标签，跟k8s中标签lable使用一致
kubectl annotate -n 命名空间 pod/pod名称 backup.velero.io/backup-volumes-
```

**案例：备份有状态服务**

有状态的服务一般都需要pvc进行持久化数据存储，所以备份时也需要使用restic进行pod中持久数据卷的数据备份，恢复数据时也要实现恢复pvc中的数据。我这里创建了一个server的namespace的命名空间，里面部署了mysql，redis，pg数据库一些有状态服务，每个pod下面挂载了pvc进行数据持久化存储，所以需要给这些pod打标签告诉velero对这些pod使用resyic进行数据备份恢复。

```bash
[20:26:09 root@k8s-master ~]#kubectl get pod -n server 
NAME                           READY   STATUS    RESTARTS   AGE
mysql-859fb69485-6zk6p         1/1     Running   0          6m9s
postgres-5cb99bdf4-jmmxs       1/1     Running   0          6m9s
redis-5c5975fdcc-5plsh         1/1     Running   0          6m9s
redisinsight-f5cbc58cd-k8mjp   1/1     Running   0          6m9s
#给mysql与redis进行打标签告诉velero对持久卷pvc数据备份

#kubectl annotate -n server pod mysql-859fb69485-6zk6p backup.velero.io/backup-volumes=mysql-data
pod/mysql-859fb69485-6zk6p annotated
#kubectl annotate -n server pod redis-5c5975fdcc-5plsh backup.velero.io/backup-volumes=redis-data
pod/redis-5c5975fdcc-5plsh annotated

#如果取消这个标签如何取消，取消redis的标签
#kubectl annotate -n server pod redis-5c5975fdcc-5plsh backup.velero.io/backup-volumes-
pod/redis-5c5975fdcc-5plsh annotated

#由于现在只给mysql与redis进行pvc持久备份没有对pg进行数据备份，先执行下备份看下效果
[20:40:23 root@k8s-master ~]#velero backup create server-1 --include-namespaces=server
Backup request "server-1" submitted successfully.
Run `velero backup describe server-1` or `velero backup logs server-1` for more details.
#查看下备份状态
[20:40:36 root@k8s-master ~]#velero backup describe server-1
Name:         server-1
Phase:  Completed    #这里是最重要的表示这个备份执行的状态，completed表示正常
Errors:    0    #执行错误的备份，如果有错误需要使用 velero backup logs 查看日志具体看下哪些资源备份失败
Warnings:  0    #警告的备份信息
Restic Backups (specify --details for more information):
  Completed:  3     #这里表示restic备份执成功了几个，这里是三个处了pg其余的都备份

#删除server命名空间进行恢复
[20:41:11 root@k8s-master ~]#kubectl delete namespaces server
namespace "server" deleted
[20:44:41 root@k8s-master ~]#velero restore create --from-backup server-1
Restore request "server-1-20211107204500" submitted successfully.
Run `velero restore describe server-1-20211107204500` or `velero restore logs server-1-20211107204500` for more details.

#查看恢复状态
Name:         server-1-20211107204500
Namespace:    velero
Labels:       <none>
Annotations:  <none>
Phase:                       Completed  #恢复执行的状态，同备份
Restic Restores (specify --details for more information):
  Completed:  3   #恢复了多少个restic
```

**具体恢复过程**

恢复带pvc的pod时，会生成一个初始化容器，用来同步之前备份的pvc中的数据，同步数据完成后会启动之前的容器。

![image-20211107204806249](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20211107204806249.png)

minio中备份的pvc数据，会在备份数据的velero存储桶生成一个restic的备份数据目录，所有的pvc中的数据都会被备份到此处。

![image-20211107205011360](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20211107205011360.png)

**使用restic遇到的问题(未排除的)，可能是使用nfs的存储类插件导致**

恢复pvc后，在nfs的服务器数据目录，没有自动创建pvc的数据目录，但是在k8s查看pvc状态是无异常的，但是pod启动时会出现无法挂载nfs数据目录的问题提示不存在，解决方法，自己在nfs数据目录手动创建一个pvc数据目录，问题为偶发问题无法进行手动再现。

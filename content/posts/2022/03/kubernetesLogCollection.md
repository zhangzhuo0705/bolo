---
title: "k8s日志收集"
date: 2022-03-12T22:01:37+08:00
draft: false
description: "梳理 Kubernetes 的日志来源，演示 EFK 架构下的日志采集与查询。"
cover: "https://b3logfile.com/bing/20190106.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["Kubernetes"]
tags: ["Kubernetes", "EFK"]
toc: true
---
# 一、k8s日志收集介绍

## 1.1 Pod日志收集

应用程序和系统日志可以帮助我们了解集群内部的运行情况，日志对于我们调试问题和监视集群情况也是非常有用的。而且大部分的应用都会有日志记录，对于传统的应用大部分都会写入到本地的日志文件之中。对于容器化应用程序来说则更简单，只需要将日志信息写入到 stdout 和 stderr 即可，容器默认情况下就会把这些日志输出到宿主机上的一个 JSON 文件之中，同样我们也可以通过 docker logs 或者 kubectl logs 来查看到对应的日志信息。

但是，通常来说容器引擎或运行时提供的功能不足以记录完整的日志信息，比如，如果容器崩溃了、Pod 被驱逐了或者节点挂掉了，我们仍然也希望访问应用程序的日志。所以，日志应该独立于节点、Pod 或容器的生命周期，这种设计方式被称为 cluster-level-logging，即完全独立于 Kubernetes 系统，需要自己提供单独的日志后端存储、分析和查询工具。

k8s中大多数的Pod日志被输出到控制台，在宿主机的文件系统每个Pod会创建一个存放日志的文件夹`/var/log/pods/`这里会存放所有这个节点运行的Pod的日志，但是这个文件夹下一般都是软连接，由于k8s底层的CSI容器运行时可以使用很多所以日志本身并不存放在这个文件夹，以下为容器运行时真正存放日志目录：

- containers log: `/var/log/containers/*.log`
- docker log: `/var/lib/docker/*.log`
- Pod log：`/var/log/pods`

这些Pod输出到控制台的日志直接使用daemonsets控制器在每个node节点运行一个`fluentd|filebeat`容器进行统一的收集之后写入到日志存储(es)中在由Kibana进行展示查询，这种架构也成为EFK，架构如下：

![使用节点日志记录代理](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/logging-with-node-agent.png)

当然有一些Pod想要收集的日志可能是存放在Pod中的文件中所以需要使用sidecar运行日志采集agent进行单独的日志收集架构如下：

![sidecar agent](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/logging-with-sidecar-agent.png)

在这里介绍三种Pod日志收集方案分别为：

- **EFK**：es+(fluentd|FileBeat)+Kibana
- **graylog**：es+(fluentd|FileBeat)+graylog
- **loki**：loki+loki-promtail+Grafana

## 1.2 k8s节点系统日志

除了k8s中的Pod日志，还需要收集k8s中master与node节点的服务相关日志`kubelet`,`kube-apiserver`,`kube-controller-manager`,`kube-scheduler`,`etcd`,`kube-proxy`,`docker`,`containerd`当然可能还有其他的服务日志。这些日志可以用来在节点奔溃时进行日志的分析，或者使用这些日志来做系统的告警。

但是k8s中所有组件的日志大多数情况下是不进行单独分离的，统一使用`systemd`管理所有的服务，默认由`systemd`管理的服务如果日志没有进行分离，会交由系统日志`journal`统一进行管理，没有特殊配置日志将最终被写入到系统日志文件中。centos中文件位置为`/var/log/messages`,这样的话系统会有很多日志被写入到这个文件但是我们可能只会收集其中的几个服务日志，所以直接收集这个日志文件可能并不太合适，所以我们需要使用`journalbeat`插件进行系统服务日志的收集。

journalbeat下载地址：https://www.elastic.co/cn/downloads/beats/journalbeat

我下载的版本为`7.15.2`

### 1.常用配置解析

```bash
[root@k8s-master-1-kty-sc journalbeat]# cat journalbeat.yml 
###################### Journalbeat Configuration Example #########################
# ============================= Journalbeat inputs =============================
journalbeat.inputs:
- paths: ["/var/log/journal"]
  seek: cursor
  include_matches: ["systemd.unit=kube-apiserver.service","systemd.unit=etcd.service","systemd.unit=kube-controller-manager.service","systemd.unit=kube-scheduler.service","systemd.unit=kube-proxy.service","systemd.unit=docker.service","systemd.unit=containerd.service","systemd.unit=kubelet.service"]
# ================================= Processors =================================
processors:
- drop_fields:
    fields: ["@metadata","user", "process","journald","process","gid","uid","pid","custom","host","agent","ecs","log","event","syslog"]
# ------------------------------- Console Output -------------------------------
#打印到控制台的配置
output.console:
  enabled: true
  codec.json:
    pretty: false
    escape_html: false
#输出到es的配置
output.elasticsearch:
  hosts: ["localhost:9200"]
  protocol: "http"
  username: "elastic"
  password: "changeme"
#输出到Logstash
output.logstash:
  hosts: ["localhost:5044"]
# ================================== Logging ===================================
logging.level: error
```

- journalbeat.inputs：日志来源，centos默认为`/var/log/journal`
- include_matches：收集那些服务的日志，格式为`systemd.unit=kube-apiserver.service`
- drop_fields：删除那些json文件中的字段
- output：输出到哪里
- logging.level：服务本身的日志级别

## 1.3 k8s事件日志

k8s中会存在一些k8s本身的事件，比如Pod被删除、node节点变为不可用等一些操作，会出现一些事件，可以使用`kube-eventer`进行收集。之后收集这个pod日志到日志存储系统即可。

github官方:https://github.com/AliyunContainerService/kube-eventer

**部署yaml文件**：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    name: kube-eventer
  name: kube-eventer
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: kube-eventer
  template:
    metadata:
      labels:
        app: kube-eventer
      annotations:	
        scheduler.alpha.kubernetes.io/critical-pod: ''
    spec:
      dnsPolicy: ClusterFirstWithHostNet
      serviceAccount: kube-eventer
      containers:
        - image: registry.aliyuncs.com/acs/kube-eventer-amd64:v1.1.2
          name: kube-eventer
          command:
            - "/kube-eventer"
            - "--source=kubernetes:https://kubernetes.default"
            ## .e.g,dingtalk sink demo
            - --sink=log
          env:
          # If TZ is assigned, set the TZ value as the time zone
          - name: TZ
            value: "Asia/Shanghai" 
          volumeMounts:
            - name: localtime
              mountPath: /etc/localtime
              readOnly: true
            - name: zoneinfo
              mountPath: /usr/share/zoneinfo
              readOnly: true
          resources:
            requests:
              cpu: 100m
              memory: 100Mi
            limits:
              cpu: 500m
              memory: 250Mi
      volumes:
        - name: localtime
          hostPath:
            path: /etc/localtime
        - name: zoneinfo
          hostPath:
            path: /usr/share/zoneinfo
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: kube-eventer
rules:
  - apiGroups:
      - ""
    resources:
      - configmaps
      - events
    verbs:
      - get
      - list
      - watch
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: kube-eventer
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: kube-eventer
subjects:
  - kind: ServiceAccount
    name: kube-eventer
    namespace: kube-system
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: kube-eventer
  namespace: kube-system
```

# 二、EFK

## 2.1 详细架构

![查看源图像](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/10-1618195311.png)

这里在每个k8s集群以daemonsets方式在每个node节点运行(fluentd|filebeat)采集节点所有Pod日志，并且输出到es中，之后可以在kibana中进行查看

这里es与kibana的部署不进行介绍，只介绍如何在k8s集群部署(fluentd|filebeat)采集Pod日志。

## 2.2 fluentd

官方网站：https://www.fluentd.org/

Fluentd是一个用于统一日志层的开源数据收集器。Fluentd允许您统一数据收集和使用，以便更好地使用和理解数据。Fluentd是云端原生计算基金会(CNCF)的成员项目之一，遵循Apache 2 License协议。

![fluentd](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/1232187-20200819113009078-386835729.png)

通过 fluentd，你可以非常轻易的实现像追踪日志文件并将其过滤后转存到 MongoDB 这样的操作。fluentd 可以彻底的将你从繁琐的日志处理中解放出来。

你也许会觉得和 ELK 中的 Logstash 高度相似。事实上也确实如此，你完全可以用 fluentd 来替换掉 ELK 中的 Logstash。

**有以下区别：**

- fluentd 比 logstash 更省资源；
- 更轻量级的 fluent-bid 对应 filebeat，作为部署在结点上的日志收集器；
- fluentd 有更多强大、开放的插件数量和社区。

### 1.fluentd配置文件介绍

rpm安装配置文件路径：`/etc/td-agent/td-agent.conf`

docker配置文件路径：`/etc/fluent/fluent.conf`

官方文档:https://docs.fluentd.org/configuration/config-file

配置文件由以下指令组成:

**`source`**：指定数据源

**`match`** 指定输出地址

**`filter`** 指定了一个事件处理过程

**`system`** 用来设置系统的配置

**`label`** 为output和filter分组

**`@include`** 使用它可以在配置文件里面包含其他的配置文件

### 2.fluentd与kubernetes

Fluent是一个轻量级且可扩展的**日志处理器**，它完全支持 Kubernetes:

- 从文件系统或 Systemd/Journaled 处理 Kubernetes 容器日志
- 使用 Kubernetes 元数据丰富日志
- 将您的日志汇聚到第三方存储服务中，例如 Elasticsearch，InfluxDB，HTTP 等。

当 Fluent Bit 运行时，它将读取，解析和过滤每个 POD 的日志，并将使用以下信息(元数据)丰富每条数据:

- Pod Name
- Pod ID
- Container Name
- Container ID
- Labels
- Annotations

为了获得这些信息，名为 *`kubernetes`* 的内置过滤器插件与 Kubernetes API Server 进行通信以检索相关信息，例如 *`pod_id`*，*`labels`* 和 *`annotations`*，其他字段，例如 *`pod_name`*，*`container_id`* 和 *`container _name`* 是从本地日志文件名检索。所有这些都是自动处理的，从配置方面来说不需要干预。

**部署**

部署文件在kubernetes的github官方仓库中`/cluster/addons/`目录下,对应的部署文件在`fluentd-elasticsearch`文件夹内。可根据kubernetes版本进行调整。

```bash
#需要下载的文件
fluentd-es-configmap.yaml  #配置文件
fluentd-es-ds.yaml         #资源文件
#需要修改配置文件中输出到那个es中具体配置常用参数如下
host 192.168.10.71  #目标ES实例IP地址
port 9200           #目标ES实例的TCP端口
logstash_format     #启用 Logstash 格式兼容性。此选项采用布尔值: True/False，On/Off
user                #es访问用户名
password            #es访问密码
```

## 2.3 filebeat

Filebeat是一个日志文件托运工具，在你的服务器上安装客户端后，filebeat会监控日志目录或者指定的日志文件，追踪读取这些文件（追踪文件的变化，不停的读），并且转发这些信息到elasticsearch或者logstarsh中存放。

以下是filebeat的工作流程：当你开启filebeat程序的时候，它会启动一个或多个探测器（prospectors）去检测你指定的日志目录或文件，对于探测器找出的每一个日志文件，filebeat启动收割进程（harvester），每一个收割进程读取一个日志文件的新内容，并发送这些新的日志数据到处理程序（spooler），处理程序会集合这些事件，最后filebeat会发送集合的数据到你指定的地点。

官方文档:https://www.elastic.co/guide/en/beats/filebeat/7.6/

### 1.部署文件详解

- filebeat.inputs：输入也就是采集日志的源设置，这里需要使用`container`输入读取容器日志文件。
- processors:解析器，可以配置解析日志来源添加一些有用字段
- output.elasticsearch：输出配置

```bash
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: filebeat-config
  namespace: kube-system
  labels:
    k8s-app: filebeat
data:
  filebeat.yml: |-
    logging.level: info
    filebeat.inputs:    #日志来源container，这里无需修改默认
    - type: container
      ignore_older: 2h
      combine_partial: true
      cri.parse_flags: true
      cri.force: true      
      ids:
        - "*"
      paths:
        - /var/log/containers/*.log
      processors:
        - add_kubernetes_metadata:
            in_cluster: true
            host: ${NODE_NAME}
            matchers:
            - logs_path:
                logs_path: "/var/log/containers/"
    processors:   #日志的具体处理
      - drop_event.when:  #不需要采集那些容器日志
          or:
          - equals:
              kubernetes.container.name: "filebeat"
      - rename:  #重写kubernetes源数据信息
          fields:
          - from: "kubernetes.node.name"
            to: "node"
          - from: "kubernetes.pod.name"
            to: "pod"
          - from: "kubernetes.namespace"
            to: "namespace"
      - drop_fields:  #不需要那些字段
          fields: ["input","agent","stream","log","host","ecs","kubernetes.container","kubernetes.pod.uid","kubernetes.replicaset.name"]
    output.elasticsearch:
      hosts: ["192.168.10.71:9200"]  #输出es配置
      username: "elastic"
      password: "123456"
    output.logstash:   #输出到logstash配置
      hosts: ["127.0.0.1:5044"] 
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: filebeat
  namespace: kube-system
  labels:
    k8s-app: filebeat
spec:
  selector:
    matchLabels:
      k8s-app: filebeat
  template:
    metadata:
      labels:
        k8s-app: filebeat
    spec:
      serviceAccountName: filebeat
      terminationGracePeriodSeconds: 30
      hostNetwork: true
      dnsPolicy: ClusterFirstWithHostNet
      containers:
      - name: filebeat
        image: 192.168.10.254:5000/elastic/filebeat:7.6.1
        args: [
          "-c", "/etc/filebeat.yml",
          "-e",
        ]
        env:
        - name: NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        securityContext:
          runAsUser: 0
          # If using Red Hat OpenShift uncomment this:
          #privileged: true
        resources:
          limits:
            memory: 200Mi
          requests:
            cpu: 100m
            memory: 100Mi
        volumeMounts:
        - name: config
          mountPath: /etc/filebeat.yml
          readOnly: true
          subPath: filebeat.yml
        - name: data
          mountPath: /usr/share/filebeat/data
        - name: varlibdockercontainers
          mountPath: /var/log/containers
          readOnly: true
        - name: varlog
          mountPath: /var/log
          readOnly: true
      volumes:
      - name: config
        configMap:
          defaultMode: 0600
          name: filebeat-config
      - name: varlibdockercontainers
        hostPath:
          path: /var/log/containers
      - name: varlog
        hostPath:
          path: /var/log
      # data folder stores a registry of read status for all files, so we don't send everything again on a Filebeat pod restart
      - name: data
        hostPath:
          path: /var/lib/filebeat
          type: DirectoryOrCreate
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: filebeat
subjects:
- kind: ServiceAccount
  name: filebeat
  namespace: kube-system
roleRef:
  kind: ClusterRole
  name: filebeat
  apiGroup: rbac.authorization.k8s.io
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: filebeat
  labels:
    k8s-app: filebeat
rules:
- apiGroups: [""] # "" indicates the core API group
  resources:
  - namespaces
  - pods
  verbs:
  - get
  - watch
  - list
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: filebeat
  namespace: kube-system
  labels:
    k8s-app: filebeat
---
```

# 三、graylog

官方网站：https://www.graylog.org/

raylog是一个开源的完整的日志管理工具，功能和ELK类似，但又比ELK要简单，相对ELK也有自己的优势，不足之处大概就是扩展性没有ELK架构好。

![img](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/8631-c64f9dd1f2a23878.png)

## 3.1 graylog部署

这里部署为集群模式，需要三个节点安装es、mongodb、graylog

- es：7.16.2v
- mongodb:4.4.11v
- graylog:4.2.5v

### 1.部署mongodb

```bash
#所有节点配置mongodb源
cat /etc/yum.repos.d/centos.repo
[mongodb]
name=mongodb
baseurl=https://mirrors.tuna.tsinghua.edu.cn/mongodb/yum/el7-4.4/
gpgcheck=0
#yum安装
yum install mongodb-org
#配置hosts
cat /etc/hosts
192.168.10.11 mongo-repl-1
192.168.10.12 mongo-repl-2
192.168.10.13 mongo-repl-3
#在其中一台上生成keyfile，然后用拷贝到另外两台机器
openssl rand -base64 756 > mongo-keyfile
cp mongo-keyfile /opt/mongo/
scp -r /opt/mongo 192.168.10.12:/opt/
scp -r /opt/mongo 192.168.10.13:/opt/
#所有节点执行
chmod 400 /opt/mongo/mongo-keyfile
chown mongod:mongod /opt/mongo/mongo-keyfile
#在第一个节点启动mongodb
systemctl restart mongod.service 
mongo   #进入mongodb设置用户
> use admin
switched to db admin
> db.createUser({user: "mongo-admin", pwd: "123456", roles:[{role: "root", db: "admin"}]})
#修改所有mongdb配置文件
cat /etc/mongod.conf
systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log
storage:
  dbPath: /var/lib/mongo
  journal:
    enabled: true
processManagement:
  fork: true  
  pidFilePath: /var/run/mongodb/mongod.pid  
  timeZoneInfo: /usr/share/zoneinfo
net:
  port: 27017
  bindIp: 0.0.0.0  
security:
  keyFile: /opt/mongo/mongo-keyfile
replication:
  replSetName: rs0
#所有节点启动mongodb
systemctl restart mongod.service
#在刚刚创建用户的节点登录配置副本
mongo -u mongo-admin -p --authenticationDatabase admin
var cfg= {
    "_id": "rs0",
    "members":[{
        "_id": 1,
        "host": "mongo-repl-1:27017"
     },{
        "_id": 2,
        "host": "mongo-repl-2:27017"
     },{
         "_id": 3,
        "host": "mongo-repl-3:27017"
     }]
}
rs.initiate(cfg)
#验证副本状态
rs.conf()
rs.status()
#在mongodb创建graylog账户
mongo -u mongo-admin -p --authenticationDatabase admin
use graylog
db.createUser(
   {
     user: "graylog",
     pwd: "ZExz3UxHNIL7JNr7",  
     roles: [ "readWrite", "dbAdmin" ]
   }
)
```

### 2.graylog部署

下载地址：https://www.graylog.org/downloads-2

```bash
#安装jdk
rpm -ivh jdk-8u281-linux-x64.rpm
#安装graylog
ls
graylog-enterprise-integrations-plugins-4.2.5-1.noarch.rpm
graylog-enterprise-plugins-4.2.5-1.noarch.rpm
graylog-integrations-plugins-4.2.5-1.noarch.rpm
graylog-server-4.2.5-1.noarch.rpm
yum localinstall -y *.rpm
#修改配置文件

is_master = true #3台graylog，其中一台master为true，其余为false
password_secret =   #pwgen -N 1 -s 96 生成密钥
root_password_sha2 =      #密码echo -n yourpassword | sha256sum
root_timezone = Asia/Shanghai  #时区
data_dir = /data1/var/lib/graylog-server #数据目录
http_bind_address = 10.202.41.59:9000  #监听地址
elasticsearch_hosts = http://node1:9200,http://user:password@node2:19200 #es配置
mongodb_uri = mongodb://graylog:ZExz3UxHNIL7JNr7@192.168.10.11:27017,192.    168.10.12:27017,192.168.10.13:27017/graylog?replicaSet=rs0 #mongodb设置
#启动
systemctl restart graylog-server.service
#访问为http://192.168.10.11:9000
```

### 3.创建日志收集器

![image-20220312211647688](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20220312211647688.png)

### 4.日志采集输入设置

```bash
#filebeat配置
    output.logstash:   #输出到logstash配置
      hosts: ["127.0.0.1:5044"]
```

# 三、loki

`Loki`是 Grafana Labs 团队最新的开源项目，是一个水平可扩展，高可用性，多租户的日志聚合系统。它的设计非常经济高效且易于操作，因为它不会为日志内容编制索引，而是为每个日志流编制一组标签。项目受 *Prometheus* 启发，官方的介绍就是：`Like Prometheus, but for logs.`，类似于 Prometheus 的日志系统。

## 3.1 Loki架构介绍

与其他日志聚合系统相比，`Loki`具有下面的一些特性：

- 不对日志进行全文索引。`Loki`中存储的是压缩后的非结构化日志，并且只对元数据建立索引，因此`Loki` 具有操作简单、低成本的优势。
- 使用与 *Prometheus* 相同的标签。`Loki`通过标签对日志进行索引和分组，这使得日志的扩展和操作效率更高。
- 特别适合储存 *Kubernetes Pod* 日志。诸如 *Pod* 标签之类的元数据会被自动删除和编入索引。
- Grafana 原生支持。

`Loki` 日志系统由以下3个部分组成：

- `loki`:是主服务器，负责存储日志和处理查询。
- `promtail`是专为loki定制的代理，负责收集日志并将其发送给loki 。
- `Grafana`用于UI展示。

![img](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/v2-286a5a8648e081f2e9cde40410f823f8_720w.jpg)

如图所示，`Loki` 包含*Distributor*、*Ingester*、*Querier*和可选的*Query frontend*五个组件。每个组件都会起一个用于处理内部请求的 gRPC 服务器和一个用于处理外部 *API* 请求的 HTTP/1服务器。

### 1.Distributor

*Distributor* 是客户端连接的组件，用于收集日志。

在 promtail 收集并将日志发送给Loki 之后， Distributor 就是第一个接收它们的组件，每秒可以接收数百万次写入。Distributor会对接收到的日志流进行正确性校验，并将验证后的*chunk*日志块分批并行发送到*Ingester*。

*Loki*使用一致性哈希来保证数据流和*Ingester*的一致性，他们共同在一个哈希环上，哈希环的信息可以存放到*etcd*、*Consul*或者内存中。当使用*[Consul](https://link.zhihu.com/?target=https%3A//www.consul.io/)*作为哈希环的实现时，所有*Ingester*通过一组token注册到环中，每个token是一个随机的32-bit无符号整数，同时*Ingester*会上报其状态到哈希环中。由于所有的*Distributor*使用相同的hash环，写请求可以发送至任意节点。为了保证结果的一致性，*Distributor*会等待收到至少一半加一个*Ingester*的回复后才响应客户端。

### 2.Ingester

Ingester接收来自Distributor的日志流，并将日志压缩后存放到所连接的存储后端。

*Ingester*接受日志流并构建数据块，其操作通常是压缩和追加日志。每个*Ingester* 的生命周期有`PENDING`, `JOINING`, `ACTIVE`, `LEAVING` 和 `UNHEALTHY` 五种状态。处于`JOINING`和`ACTIVE`状态的*Ingester*可以接受写请求，处于`ACTIVE`和`LEAVING`状态时可以接受读请求。
*Ingester* 将收到的日志流在内存中打包成 chunks ，并定期同步到存储后端。由于存储的数据类型不同，*Loki* 的数据块和索引可以使用不同的存储。

当满足以下条件时，chunks 会被标记为`只读`：

1. 当前 chunk 达到配置的最大容量
2. 当前 chunk 长时间没有更新
3. 发生了定期同步

当旧的 chunk 经过了压缩并被打上了`只读`标志后，新的可写的 chunk 就会生成。

### 3.Querier

*Querier* 用来查询日志，可以直接从 *Ingester* 和后端存储中查询数据。当客户端给定时间区间和标签选择器之后，*Querier* 就会查找索引来确定所有匹配 chunk ，然后对选中的日志进行 grep并返回查询结果。查询时，*Querier*先访问所有*Ingester*用于获取其内存数据，只有当内存中没有符合条件的数据时，才会向存储后端发起同样的查询请求。
需要注意的是，对于每个查询，单个 *Querier* 会 grep 所有相关的日志。目前 Cortex 中已经实现了并行查询，该功能可以扩展到 *Loki*，通过分布式的 grep 加速查询。此外，由于副本因子的存在，*Querier*可能会接收到重复的数据，所以其内置了去重的功能，对拥有同样时间戳、标签组和消息内容的日志进行去重处理。

### 4.Query Frontend

*Query frontend* 是可选组件，其提供了*Querier*的API并可用于读加速。当系统中有该组件时，所有的读请求都会经由*Query frontend*而非*Querier*处理。
*Query frontend*是无状态的，生产环境中推荐 2 副本来达到调度的均衡。*Query frontend*会对请求做一些调整，并将请求放入一个内部的队列中。在该场景中，*Querier*作为workers 不断从队列中获取任务、执行任务，并将结果返回给*Query frontend*用于聚合。

## 3.2 Loki Stack部署

官方部署文档：https://grafana.com/docs/loki/latest/installation/helm/

**添加loki的helm仓库**

```bash
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update
#下载loki的Chrat包
helm pull grafana/loki-stack
```

**修改配置**

```bash
#valuse默认即可
#修改loki的配置
vim charts/loki/values.yaml
image:
  repository: 192.168.6.77:5000/loki
  tag: 2.4.2
  pullPolicy: IfNotPresent
persistence:   #存储设置，需要有默认storageClass，没有可以不开日志数据无法持久保存
  enabled: true
service:
  type: NodePort #改为NodePort
#修改收集器配置
vim charts/promtail/values.yaml
image:
  repository: 192.168.6.77:5000/promtail
  tag: 2.1.0
  pullPolicy: IfNotPresent
```

**安装部署**

```bash
kubectl create ns loki
helm install loki -n loki .
```

**验证安装**

```bash
[root@master loki-stack]# kubectl  get pod -n loki 
NAME                  READY   STATUS    RESTARTS   AGE
loki-0                1/1     Running   0          85s
loki-promtail-29tf2   1/1     Running   0          85s
loki-promtail-8wfgp   1/1     Running   0          85s
loki-promtail-9rcpk   1/1     Running   0          85s
loki-promtail-cjvvh   1/1     Running   0          85s
loki-promtail-fml6r   1/1     Running   0          85s
loki-promtail-gskqg   1/1     Running   0          85s
loki-promtail-lmbww   1/1     Running   0          85s
loki-promtail-r8k9x   1/1     Running   0          85s
```

**grafana对接loki**

```
获取svc的NodePort端口
[root@master loki-stack]# kubectl  get svc -n loki 
NAME            TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)          AGE
loki            NodePort    172.20.136.251   <none>        3100:31338/TCP   3m
loki-headless   ClusterIP   None             <none>        3100/TCP         3m
```

![image-20220222145114919](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20220222145114919.png)

## 3.3 Loki简单日志查询语法

官方文档：https://grafana.com/docs/loki/latest/logql/

![image-20220223100049523](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20220223100049523.png)

Loki 是参考 Prometheus 进行设计的，所以查询语法和 PromQL 类似，比如查询命名空间为kube-system下的所有Pod的日志，只需要在 Log browser 输入**{namespace="kube-system"}**，然后点击 Run query 即可

```
{namespace="kube-system"}  #查询某个命名空间下所有Pod日志
{pod="nacos-0"}  #查询某个Pod的日志
{app="kube-eventer"}  #按Pod的label查询日志
```

### 1.标签匹配操作符

标签名后面的操作符是标签**匹配操作符**。支持以下标签匹配运算符。

- `=`: 完全相等
- `!=`: 不相等
- `=~`: 正则表达式匹配
- `!~`: 正则表达式不匹配

```bash
{pod=~"calico-node-.*"}
{pod!~"calico-node-.*"}
{pod!="calico-node-.*"}
```

### 2.日志管道

可以将日志管道附加到日志流选择器以进一步处理和过滤日志流。它由一组表达式组成。对于每个日志行，每个表达式都按从左到右的顺序执行。如果表达式过滤掉日志行，管道将停止处理当前日志行并开始处理下一个日志行。

每个行过滤器表达式都有一个**过滤器运算符** ，后跟文本或正则表达式。支持这些过滤器运算符

- `|=`: 日志行包含字符串
- `!=`: 日志行不包含字符串
- `|~`：日志行包含与正则表达式的匹配项
- `!~`: 日志行不包含与正则表达式的匹配项

```bash
{pod=~"calico-node-469gv"} |= "INFO"
{pod=~"calico-node-469gv"} |~ "INFO"
```

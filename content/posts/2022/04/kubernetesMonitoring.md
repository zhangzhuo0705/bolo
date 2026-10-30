---
title: "k8s之监控告警"
date: 2022-04-17T19:33:22+08:00
draft: false
description: "以 Prometheus 在 Kubernetes 中的服务发现为主线，完成监控、Grafana 与告警配置。"
cover: "https://b3logfile.com/bing/20200714.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["Kubernetes"]
tags: ["Kubernetes", "Prometheus", "grafana", "Alertmanager"]
toc: true
---
# 一、k8s监控架构介绍

Prometheus（普罗米修斯）是一个最初在SoundCloud上构建的监控系统。自2012年成为社区开源项目，拥有非常活跃的开发人员和用户社区。为强调开源及独立维护，Prometheus于2016年加入云原生云计算基金会（CNCF），成为继Kubernetes之后的第二个托管项目。

![kubernetes(十三) k8s 集群监控_k8s监控](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/56a25ca71b52f63de33614300e65994b.png)

1. Prometheus Server：Prometheus 生态最重要的组件，主要用于抓取和存储时间 序列数据，同时提供数据的查询和告警策略的配置管理；
2. Alertmanager：Prometheus 生态用于告警的组件，Prometheus Server 会将告警发送给 Alertmanager，Alertmanager 根据路由配置，将告警信息发送给指定的人或组。Alertmanager 支持邮件、Webhook、微信、钉钉、短信等媒介进行告 警通知；
3. Grafana：用于展示数据，便于数据的查询和观测；
4. Push Gateway：Prometheus 本身是通过 Pull 的方式拉取数据，但是有些监控数 据可能是短期的，如果没有采集数据可能会出现丢失。Push Gateway 可以用来 解决此类问题，它可以用来接收数据，也就是客户端可以通过 Push 的方式将数据推送到 Push Gateway，之后 Prometheus 可以通过 Pull 拉取该数据；
5. Exporter：主要用来采集监控数据，比如主机的监控数据可以通过 node_exporter 采集，MySQL 的监控数据可以通过 mysql_exporter 采集，之后 Exporter 暴露一 个接口，比如/metrics，Prometheus 可以通过该接口采集到数据；
6. PromQL：PromQL 其实不算 Prometheus 的组件，它是用来查询数据的一种语法，比如查询数据库的数据，可以通过SQL语句，查询Loki的数据，可以通过LogQL，查询 Prometheus 数据的叫做 PromQL；
7. Service Discovery：用来发现监控目标的自动发现，常用的有基于 Kubernetes、 Consul、Eureka、文件的自动发现等。

**官网**：https://prometheus.io/

**github**: https://github.com/prometheus

| 监控指标    | 具体实现                       | 举例                |
| ----------- | ------------------------------ | ------------------- |
| Pod性能     | cAdvisor(kubelet已经集成)      | 容器CPU，内存使用率 |
| Node性能    | node-exporter(需单独部署)      | 节点CPU，内存使用率 |
| k8s资源对象 | kube-state-metrics(需单独部署) | Pod/Deploy/Service  |

prometheus支持k8s的服务发现：https://prometheus.io/docs/prometheus/latest/configuration/configuration/#kubernetes_sd_config

## 1.1 prometheus对于k8s的服务发现详解

prometheus支持k8s的服务发现：https://prometheus.io/docs/prometheus/latest/configuration/configuration/#kubernetes_sd_config

从Kubernetes的REST API上，Kubernets SD配置检索和获取目标，并且始终保持与集群状态同步。

`role`可以指定特定的服务发现类型用来发现k8s中各种资源分别有`node`,`service`,`pod`,`endpoints`，`endpointslice`，`ingress`。

### 1.服务发现配置文件详解

```bash
scrape_configs:   #数据采集配置
  - job_name: 'k8s-cadvisor'  #采集job名称
    scheme: https             #监控指标收集协议,k8s中大多服务的接口协议通常为https
    metrics_path: /metrics/cadvisor  #采集数据指标的url地址
    bearer_token_file: k8s.token     #这里是Prometheus访问服务时的token文件
    tls_config:                      #这里是tls认证配置，选择其中一种即可
      insecure_skip_verify: true     #强制认证证书，无需配置ca证书公钥
      ca_file: ca.pem                #通过ca公钥认证
    kubernetes_sd_configs:           #以下为prometheus的k8s服务发现配置
    - role: node                     #发现方式,node,service,pod,endpoints,endpointslice,ingress选择其中一种即可，特定的资源需要选择特定的发现方式      
      api_server: https://192.168.10.71:6443  #这里为k8s的kube-apiserver的通信地址与端口
      bearer_token_file: k8s.token #这里是Prometheus访问kube-apiserver的token文件位置，token获取一般使用kubectl  describe secrets 获取，需提前准备并且给予特定权限
      kubeconfig_file: config.kubeconfig  #k8s的认证文件，如果使用kubeconfig认证文件及不需要配置api_server以及bearer_token_file
      tls_config: #这里是tls认证配置，一般没有特殊要求直接可以强制认证通过，如果需要认证需配置kube-apiserver的证书ca文件，俩种方式选择其中一个
        insecure_skip_verify: true   #强制认证证书，无需配置ca证书公钥
        ca_file: ca.pem              #通过ca公钥认证
      namespaces:                    #选择发现资源的命名空间，不写默认全部命名空间
        names:
          - default
    relabel_configs:                 #以下为标签的重写配置，可根据自己的需求进行重写，配置方法较多这里不进行详细列举。
      - action: labelmap
        regex: __meta_kubernetes_node_label_(.+)
```

### 2.node详解

Kubelet组件运行在Kubernetes集群的各个节点中，其负责维护和管理节点上Pod的运行状态。kubelet组件的正常运行直接关系到该节点是否能够正常的被Kubernetes集群正常使用。

kubelet组件中默认集成了cadvisor组件，无需重复安装，数据默认采集路径`/metrics/cadvisor`，所以如果需要采集数据，也是通过node发现服务进行采集。

基于Node模式，Prometheus会自动发现Kubernetes中所有Node节点的信息并作为监控的目标Target。 而这些Target的访问地址实际上就是Kubelet的访问地址，并且Kubelet实际上直接内置了对Promtheus的支持。

**可用的meta标签：**

- **`__meta_kubernetes_node_name`: 节点对象的名称**
- **`__meta_kubernetes_node_label_<labelname>`: 节点对象的每个标签**
- **`__meta_kubernetes_node_labelpresent_<labelname>`: 节点对象中的每个标签都为true。**
- **`__meta_kubernetes_node_annotation_<annotationname>`: 节点对象的每个注解**
- **`__meta_kubernetes_node_annotationpresent_<annotationname>`: 节点对象的每个注释都为true。**
- **`__meta_kubernetes_node_address_<address_type>`: 如果存在，每一个节点对象类型的第一个地址**

另外，对于节点的`instance`标签，将会被设置成从API服务中获取的节点名称。

### 3.service

对于每个服务每个服务端口，`service`角色发现一个目标。对于一个服务的黑盒监控是通常有用的。这个地址被设置成这个服务的Kubernetes DNS域名, 以及各自的服务端口。

可用的meta标签：

- **`__meta_kubernetes_namespace`: 服务对象的命名空间**
- **`__meta_kubernetes_service_annotation_<annotationname>`: 服务对象的注释**
- **`__meta_kubernetes_service_annotationpresent_<annotationname>`: 服务对象的每个注解为“true”。**
- **`__meta_kubernetes_service_cluster_ip`: 服务的群集IP地址。（不适用于ExternalName类型的服务）**
- **`__meta_kubernetes_service_external_name`: 服务的DNS名称。（适用于ExternalName类型的服务）**
- **`__meta_kubernetes_service_label_<labelname>`: 服务对象的标签。**
- **`__meta_kubernetes_service_labelpresent_<labelname>`: 对于服务对象的每个标签为true。**
- **`__meta_kubernetes_service_name`: 服务对象的名称**
- **`__meta_kubernetes_service_port_name`: 目标服务端口的名称**
- **`__meta_kubernetes_service_port_protocol`: 目标服务端口的协议**
- **`__meta_kubernetes_service_type`: 服务的类型**

### 4.Pod

`pod`角色会察觉所有的`pod`，并将它们的容器作为目标暴露出来。对于容器的每个声明的端口，都会生成一个目标。如果一个容器没有指定的端口，则会为每个容器创建一个无端口的目标，以便通过重新标注来手动添加端口。

可用的meta标签：

- **`__meta_kubernetes_namespace`: pod对象的命名空间**
- **`__meta_kubernetes_pod_name`: pod对象的名称**
- **`__meta_kubernetes_pod_ip`: pod对象的IP地址**
- **`__meta_kubernetes_pod_label_<labelname>`: pod对象的标签**
- **`__meta_kubernetes_pod_labelpresent_<labelname>`: 对来自pod对象的每个标签都是`true`。**
- **`__meta_kubernetes_pod_annotation_<annotationname>`: pod对象的注释**
- **`__meta_kubernetes_pod_annotationpresent_<annotationname>`: 对于来自pod对象的每个注解都是true。**
- **`__meta_kubernetes_pod_container_init`: 如果容器是 InitContainer，则为 true。**
- **`__meta_kubernetes_pod_container_name`: 目标地址的容器名称**
- **`__meta_kubernetes_pod_container_port_name`: 容器端口名称**
- **`__meta_kubernetes_pod_container_port_number`: 容器端口的数量**
- **`__meta_kubernetes_pod_container_port_protocol`: 容器端口的协议**
- **`__meta_kubernetes_pod_ready`: 设置pod ready状态为true或者false**
- **`__meta_kubernetes_pod_phase`: 在生命周期中设置 `Pending`, `Running`, `Succeeded`, `Failed` 或 `Unknown`**
- **`__meta_kubernetes_pod_node_name`: pod调度的node名称**
- **`__meta_kubernetes_pod_host_ip`: 节点对象的主机IP**
- **`__meta_kubernetes_pod_uid`: pod对象的UID。**
- **`__meta_kubernetes_pod_controller_kind`: pod控制器的kind对象.**
- **`__meta_kubernetes_pod_controller_name`: pod控制器的名称.**

### 5.endpoints

`endpoints`角色发现来自于一个服务的列表端点目标。对于每一个终端地址，一个目标被一个port发现。如果这个端点被写入到pod中，这个节点的所有其他容器端口，未绑定到端点的端口，也会被目标发现。

可用的meta标签：

- **`__meta_kubernetes_namespace`: 端点对象的命名空间**
- **`__meta_kubernetes_endpoints_name`: 端点对象的名称**
- **对于直接从端点列表中获取的所有目标，下面的标签将会被附加上。**
  - **`__meta_kubernetes_endpoint_hostname`: 端点的Hostname**
  - **`__meta_kubernetes_endpoint_node_name`: 端点所在节点的名称。**
  - **`__meta_kubernetes_endpoint_ready`: endpoint ready状态设置为true或者false。**
  - **`__meta_kubernetes_endpoint_port_name`: 端点的端口名称**
  - **`__meta_kubernetes_endpoint_port_protocol`: 端点的端口协议**
  - **`__meta_kubernetes_endpoint_address_target_kind`: 端点地址目标的kind。**
  - **`__meta_kubernetes_endpoint_address_target_name`: 端点地址目标的名称。**
- **如果端点属于一个服务，这个角色的所有标签：服务发现被附加上。**
- **对于在pod中的所有目标，这个角色的所有表掐你：pod发现被附加上**

### 6.ingress

`ingress`角色为每个ingress的每个路径发现一个目标。这通常对黑盒监控一个ingress很有用。地址将被设置为 ingress 规范中指定的主机。

可用的meta标签：

- **`__meta_kubernetes_namespace`: ingress对象的命名空间**
- **`__meta_kubernetes_ingress_name`: ingress对象的名称**
- **`__meta_kubernetes_ingress_label_<labelname>`: ingress对象的每个label。**
- **`__meta_kubernetes_ingress_labelpresent_<labelname>`: ingress对象的每个label都为true。**
- **`__meta_kubernetes_ingress_annotation_<annotationname>`: ingress对象的每个注释.**
- **`__meta_kubernetes_ingress_annotationpresent_<annotationname>`: 每个ingress对象的注解都是true。**
- **`__meta_kubernetes_ingress_scheme`: 协议方案，如果设置了TLS配置，则为`https`。默认为`http`。**
- **`__meta_kubernetes_ingress_path`: ingree spec的路径。默认为`/`。**

# 二、prometheuc采集k8s集群指标

## 2.1 prometheus节点的初始化配置

为了详细理解Prometheus中k8s的服务发现功能，这里采用集群外部部署Prometheus的方式进行数据采集，并且采用手动配置的方式熟悉Prometheus的配置文件。

### 1.在Prometheus安装CNI网络组件

如果prometheus部署在k8s集群外部，Prometheus的节点正常情况下是无法直接访问k8s中Pod的IP地址的，由于k8s中的网络环境由CNI组件提供，在node节点会运行一个CNI组件的工作组件由他进行k8s集群内部的组网，所以需要我们手动在prometheus节点以docker容器的方式手动运行一个CNI的工作组件，我这里使用的是calico所以我需要在Prometheus中手动运行一个calico-node容器，具体如下：

```bash
#首先安装docker-ce,之后使用systemd的方式运行calico-node，这里只介绍calico-etcd方式部署的方式，
#创建etcd证书文件目录
mdkir /etc/etcd/cert/
#拷贝etcd证书文件
[21:16:50 root@centos7 cert]#ls /etc/etcd/cert/
ca.pem  etcd-key.pem  etcd.pem
#准备service文件
[21:16:53 root@centos7 cert]#cat /etc/systemd/system/calico-node.service 
[Unit]
Description=calico node
After=docker.service
Requires=docker.service

[Service]
User=root
PermissionsStartOnly=true
ExecStartPre=-/usr/bin/docker rm -f calico-node
ExecStart=/usr/bin/docker run   --net=host --privileged --name=calico-node \
        -e ETCD_ENDPOINTS=https://192.168.10.11:2379 \    #etcd的访问地址，多个使用,隔开
        -e ETCD_CA_CERT_FILE=/etc/etcd/cert/ca.pem \      #etcd的ca证书文件位置，是挂载到容器中的位置
        -e ETCD_CERT_FILE=/etc/etcd/cert/etcd.pem \
        -e ETCD_KEY_FILE=/etc/etcd/cert/etcd-key.pem \
        -e NODENAME=192.168.10.71 \                       #当前节点的名称，推荐使用IP地址
        -e IP=192.168.10.71/24 \                          #进行通信的地址
        -e IP6= \
        -e AS= \
        -e CALICO_IPV4POOL_CIDR=172.30.0.0/16 \           #k8s的Pod网段，跟k8s中设置保持一致
        -e CALICO_IPV4POOL_IPIP=CrossSubnet \             #以下配置推荐跟k8s保持一致
        -e CALICO_LIBNETWORK_ENABLED=true \
        -e CALICO_NETWORKING_BACKEND=bird \
        -e CALICO_DISABLE_FILE_LOGGING=true \
        -e FELIX_IPINIPMTU=1480 \
        -e FELIX_IPV6SUPPORT=false \
        -e FELIX_DEFAULTENDPOINTTOHOSTACTION=ACCEPT \
        -e FELIX_LOGSEVERITYSCREEN=info \
        -v /etc/etcd/cert:/etc/etcd/cert \            #以下为宿主机挂载相关保持默认即可
        -v /lib/modules:/lib/modules \
        -v /run/docker/plugins:/run/docker/plugins \
        -v /opt/k8s/bin/libnetwork-plugin:/usr/bin/libnetwork-plugin \
        -v /var/run/calico:/var/run/calico \
        -v /var/log/calico:/var/log/calico \
        -v /var/lib/calico:/var/lib/calico \
        192.168.10.254:5000/calico/node:v3.15.5   #镜像地址
ExecStop=/usr/bin/docker stop calico-node
Restart=always
RestartSec=10
#启动
[21:15:28 root@centos7 ~]#systemctl start calico-node.service
#验证
[21:15:28 root@centos7 ~]#systemctl status calico-node.service
#使用calicoctl验证
[21:01:16 root@node-1 ~]#calicoctl node status
Calico process is running.

IPv4 BGP status
+---------------+-------------------+-------+----------+-------------+
| PEER ADDRESS  |     PEER TYPE     | STATE |  SINCE   |    INFO     |
+---------------+-------------------+-------+----------+-------------+
| 192.168.10.12 | node-to-node mesh | up    | 11:26:55 | Established |
| 192.168.10.13 | node-to-node mesh | up    | 11:26:59 | Established |
| 192.168.10.71 | node-to-node mesh | up    | 13:15:18 | Established |  #必须保证有刚刚设置的节点
+---------------+-------------------+-------+----------+-------------+

IPv6 BGP status
No IPv6 peers found.
#71节点查看路由
[21:20:58 root@centos7 ~]#route -n
Kernel IP routing table
Destination     Gateway         Genmask         Flags Metric Ref    Use Iface
0.0.0.0         192.168.10.2    0.0.0.0         UG    100    0        0 eth0
172.17.0.0      0.0.0.0         255.255.0.0     U     0      0        0 docker0
172.30.36.128   192.168.10.11   255.255.255.255 UGH   0      0        0 eth0  
172.30.139.64   192.168.10.13   255.255.255.192 UG    0      0        0 eth0
172.30.140.128  0.0.0.0         255.255.255.192 U     0      0        0 *
172.30.247.0    192.168.10.12   255.255.255.192 UG    0      0        0 eth0
192.168.10.0    0.0.0.0         255.255.255.0   U     100    0        0 eth0
```

### 2.在prometheus安装kube-proxy组件

如果要使用service类型的发现需要配置dns解析指定到coredns的Pod中并且安装kube-proxy组件。具体过程如下。

```bash
#dns配置根据k8s的Pod中的dns进行配置
[21:29:13 root@centos7 ~]#cat /etc/resolv.conf 
# Generated by NetworkManager
nameserver 172.20.0.2
#测试dns，需安装完成kube-proxy
[21:29:15 root@centos7 ~]#ping kubernetes.default.svc.cluster.local
PING kubernetes.default.svc.cluster.local (172.20.0.1) 56(84) bytes of data.

#kube-proxy需要把node节点的二进制文件以及kube-proxy的配置文件以及kubeconfig认证文件拷贝后进行修改启动即可，这里不进行详细介绍
#验证
[21:32:14 root@centos7 ~]#ipvsadm -Ln | grep 6443 -n2
11-  -> 172.30.247.35:16686          Masq    1      0          0         
12-TCP  172.20.0.1:443 rr
13:  -> 192.168.10.11:6443           Masq    1      0          0
```

这里主要介绍下各种类型服务发现的常见的使用方法。

- **node**：主要用于收集kubelet，kube-proxy服务的监控指标，包括容器的监控指标(cadvisor在kubelet中集成),以及node节点的系统指标(node_exporter需要在node自行部署)。
- **service**：主要用于发现k8s中service资源，一般可以用来进行黑盒监控，也可以变相的进行k8s中dns组件的性能监控。
- **Pod**: 用于发现k8s中pod，可以对k8s中支持prometheus指标收集的Pod进行指标收集，如calico组件、coredns组件等。
- **endpoints**：用于发现端点，一般一个service会代理一组Pod如果需要对整个端点后的Pod进行指标收集可以使用这个类型，但是常见的使用方法为发现k8s的master节点，由于k8s安装后默认会在default命名空间下自动生成一个kubernetes名称的服务端点后端为master节点，所以可以直接使用无需其他配置。
- **ingress**：发现ingress资源，用于黑盒监控。

### 3.创建用于服务发现的认证token

```bash
#创建权限yaml文件
[20:52:27 root@node-1 ~]#cat token.yaml
apiVersion: rbac.authorization.k8s.io/v1  
kind: ClusterRole   
metadata:
  name: service-discovery                        
rules:                                    
- apiGroups: [""]                         
  resources: ["nodes","pods","services","ingress","endpoints","nodes/metrics"]       #相关资源               
  verbs: ["get", "watch", "list"]    #由于是监控所以只需要读取权限即可  
- nonResourceURLs: ["/metrics"]
  verbs: ["get"]
---
apiVersion: v1    #api版本
kind: ServiceAccount  #资源类型
metadata:
  name: prometheus
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: service-discovery
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: service-discovery
subjects:
- kind: ServiceAccount
  name: prometheus
  namespace: kube-system
#创建
[20:53:42 root@node-1 ~]#kubectl  apply -f token.yaml 
clusterrole.rbac.authorization.k8s.io/service-discovery unchanged
serviceaccount/prometheus unchanged
clusterrolebinding.rbac.authorization.k8s.io/service-discovery unchanged
#获取token
[20:53:51 root@node-1 ~]#kubectl  describe secrets -n kube-system prometheus-token-jjzkx
```

## 2.2 node类型的使用详解

一般k8s的node节点作为容器运行的节点我们需要对整个系统的资源使用情况进行监控，所以需要部署node_exporter，如果在k8s的node节点手动进行部署

### 1.在k8s中部署node_exporter

在k8s中部署node_exporter需要使用daemonsets控制器进行部署，具体yaml文件如下：

```bash
#启用auth认证，生成密码文件，需按照httpd
[22:04:02 root@node-1 ~]#htpasswd -nBC 12 ''
New password: 
Re-type new password: 
:$2y$12$SZ9yqDnw9kcFgM6ASBcP0ezQI3WYXzBaKVlU9ITLRc96weKiR/mJy
#创建认证文件
[21:52:40 root@node-1 ~]#cat config.yaml
basic_auth_users:
  #以下把刚刚生成的认证可以写入到这里
  zhangzhuo: $2y$12$SZ9yqDnw9kcFgM6ASBcP0ezQI3WYXzBaKVlU9ITLRc96weKiR/mJy
#创建configmap
[21:52:42 root@node-1 ~]#kubectl create cm -n monitor node-exporter-config --from-file=config.yaml 
configmap/node-exporter-config created
#创建node_exporter的yaml文件
[22:04:52 root@node-1 ~]#cat node-exporter.yaml 
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-exporter
  namespace: monitor
  labels:
    name: node-exporter
spec:
  selector:
    matchLabels:
     name: node-exporter
  template:
    metadata:
      labels:
        name: node-exporter
    spec:
      hostPID: true   #必要跟宿主机共享PID空间
      hostIPC: true   #必要跟宿主机共享网络空间 
      hostNetwork: true   #使用宿主机网络
      containers:
      - name: node-exporter
        image: 192.168.10.254:5000/node-exporter:latest
        ports:       #端口定义必要
        - name: http
          containerPort: 9100
          protocol: TCP
        securityContext:   #特权容器，容器root相当于宿主机root，可选
          privileged: true
        args:
        - '--path.rootfs=/rootfs'  #指定宿主机文件系统位置，由于是挂载到容器中所以需要具体指定
        - '--web.config=/etc/config/config.yaml'  #指定认证配置文件位置
        volumeMounts:  #挂载相关
        - name: rootfs
          mountPath: /rootfs
          readOnly: true   #宿主机文件系统推荐挂载为只读
        - name: auth  
          mountPath: /etc/config  
      volumes:   #定义挂载
        - name: rootfs
          hostPath:
            path: /
        - name: auth
          configMap:
            name: node-exporter-config
#验证
[22:15:28 root@node-1 ~]#curl http://192.168.10.12:9100 
Unauthorized   #这样表示开启认证成功
```

### 2.采集node-exporter监控指标

```bash
scrape_configs:
  - job_name: 'node-exporter'   #名称
    scheme: http                #node-exporter默认为http        
    metrics_path: /metrics      #采集监控指标路径不可不写默认为/metrics
    basic_auth:                 #认证信息配置，开启了认证需要配置不开启可以不配置
      username: zhangzhuo
      password: 123456
    kubernetes_sd_configs:      #服务发现的配置
    - role: node                #使用node类型的服务发现
      api_server: https://192.168.10.11:6443    #kube-apiserver访问地址
      bearer_token_file: k8s.token              #认证token
      tls_config:                               #证书配置
        insecure_skip_verify: true   
    relabel_configs:                            #标签配置，由于node默认发现kubelet的服务端口默认为10250,所以需要重写为9100
      - source_labels: [__address__]            #源标签
        regex: "(.*):.*"                        #正则匹配，保留IP地址
        target_label: "__address__"             #重写后的标签，prometheus默认的采集IP与端口会生成一个隐藏标签__address__,所以替换这个标签即可替换采集IP与端口
        action: replace                         #重写操作
        replacement: $1:9100                    #重写后保留IP替换端口
```

### 3.采集kubelet指标数据

kubelet服务默认有三个端口分别为`10250`,`10248`，`10255`。

**10250**：kubelet的默认服务端口，默认会使用https协议，并且需要认证才可以进行访问。

```bash
[19:39:29 root@node-2 ~]#cat /etc/k8s/kubelet-conf.yml 
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
address: 192.168.10.12  #监听地址
port: 10250             #默认服务监听端口
```

**10255**：kubelet的服务只读端口，只能进行服务的相关信息查看，如果不进行配置默认不会开启，推荐不开启。

```bash
[19:39:29 root@node-2 ~]#cat /etc/k8s/kubelet-conf.yml 
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
address: 192.168.10.12
readOnlyPort: 10255   #只读端口
```

**10248**:服务健康检测端口。

```bash
[19:39:29 root@node-2 ~]#cat /etc/k8s/kubelet-conf.yml 
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
healthzBindAddress: 127.0.0.1  #绑定地址
healthzPort: 10248             #绑定端口
```

kubelet的服务的指标采集提供俩方面的指标分别是kubelet服务本身的监控指标以及cadvisor所提供的容器指标他们的采集url分别是:

- kubelet的服务指标：`/metrics `
- cadvisor容器指标：`/metrics/cadvisor`

采集示例如下：

```bash
#采集kubelet服务指标数据
scrape_configs:
  - job_name: 'kubelet'   #名称
    scheme: https               #kubelet的服务端口默认为https,还有一个只读端口无需认证的http端口但是不推荐使用，未加密不安全      
    metrics_path: /metrics      #采集监控指标路径不可不写默认为/metrics
    bearer_token_file: k8s.token   #用于跟kubelet进行认证
    tls_config:                 #证书配置
      insecure_skip_verify: true 
    kubernetes_sd_configs:      #服务发现的配置
    - role: node                #使用node类型的服务发现
      api_server: https://192.168.10.11:6443    #kube-apiserver访问地址
      bearer_token_file: k8s.token              #认证token
      tls_config:                               #证书配置
        insecure_skip_verify: true   
    relabel_configs:   #label配置
      - action: labelmap   
        regex: __meta_kubernetes_node_label_(.+)  #这里为吧node节点自带的label添加到prometheus采集数据中当作label
#采集cadvisor指标数据
  - job_name: 'pod-cadvisor'   #名称
    scheme: https              #kubelet的服务端口默认为https,还有一个只读端口无需认证的http端口但是不推荐使用，未加密不安全      
    metrics_path: /metrics/cadvisor      #采集监控指标路径
    bearer_token_file: k8s.token   #用于跟kubelet进行认证
    tls_config:                 #证书配置
      insecure_skip_verify: true 
    kubernetes_sd_configs:      #服务发现的配置
    - role: node                #使用node类型的服务发现
      api_server: https://192.168.10.11:6443    #kube-apiserver访问地址
      bearer_token_file: k8s.token              #认证token
      tls_config:                               #证书配置
        insecure_skip_verify: true
```

### 4.采集kube-proxy的指标数据

kube-proxy服务默认有二个端口分别为`10249`,`10256`。

**10249**：kube-proxy服务的监控指标端口，如果不配置默认绑定在127.0.0.1地址，只提供http协议未加密。

```bash
healthzBindAddress: 192.168.10.12:10256
```

**10256**：kube-proxy服务的监控检查端口，http未加密。

```bash
metricsBindAddress: 192.168.10.12:10249
```

采集示例如下：

```bash
- job_name: 'kube-proxy'   #名称
    scheme: http              #kube-proxy的监控指标端口默认为http    
    metrics_path: /metrics     #采集监控指标路径
    kubernetes_sd_configs:      #服务发现的配置
    - role: node                #使用node类型的服务发现
      api_server: https://192.168.10.11:6443    #kube-apiserver访问地址
      bearer_token_file: k8s.token              #认证token
      tls_config:                               #证书配置
        insecure_skip_verify: true  
    relabel_configs:                            #标签配置，由于node默认发现kubelet的服务端口默认为10250,所以需要重写为kube-proxy的监控指标的数据端口10249
      - source_labels: [__address__]            #源标签
        regex: "(.*):.*"                        #正则匹配，保留IP地址
        target_label: "__address__"             #重写后的标签，prometheus默认的采集IP与端口会生成一个隐藏标签__address__,所以替换这个标签即可替换采集IP与端口
        action: replace                         #重写操作
        replacement: $1:10249                   #重写后保留IP替换端口
```

### 5.采集calico指标数据

Calico 中最核心的组件就是 Felix，它负责设置路由表和 ACL 规则等，以便为该主机上的 endpoints 资源正常运行提供所需的网络连接。同时它还负责提供有关网络健康状况的数据（例如，报告配置其主机时发生的错误和问题），这些数据会被写入 etcd，以使其对网络中的其他组件和操作人员可见。由此可见，对于我们的监控来说，监控 Calico 的核心便是监控 `Felix`，`Felix` 就相当于 Calico 的大脑。

默认calico-node不会开启指标数据的监听地址，需要手动开启我这里安装calico的方式是calico-etcd，以下开启方式只适用于calico-etcd

```
#编辑calico的yaml文件，在calico-node的容器中添加环境变量
             - name: FELIX_PROMETHEUSMETRICSENABLED
               value: "true"  
#重新应用下yaml文件即可，默认的指标数据端口为9091协议类型为http
```

Prometheus配置示例

```bash
- job_name: 'calico-node'   #名称
    scheme: http              #calico的监控指标协议为http  
    metrics_path: /metrics     #采集监控指标路径
    kubernetes_sd_configs:      #服务发现的配置
    - role: node                #使用node类型的服务发现
      api_server: https://192.168.10.11:6443    #kube-apiserver访问地址
      bearer_token_file: k8s.token              #认证token
      tls_config:                               #证书配置
        insecure_skip_verify: true  
    relabel_configs:                            #标签配置，由于node默认发现kubelet的服务端口默认为10250,所以需要重写为calico的监控指标的数据端口9091
      - source_labels: [__address__]            #源标签
        regex: "(.*):.*"                        #正则匹配，保留IP地址
        target_label: "__address__"             #重写后的标签，prometheus默认的采集IP与端口会生成一个隐藏标签__address__,所以替换这个标签即可替换采集IP与端口
        action: replace                         #重写操作
        replacement: $1:9091                 #重写后保留IP替换端口
```

## 2.3 service类型的使用详解

为了能够对Service进行探测，我们需要在集群部署Blackbox Exporter实例。 如下所示，创建blackbox-exporter.yaml用于描述部署相关的内容:

blackbox-exporter是Prometheus 社区提供的官方黑盒监控解决方案,其允许用户通过: `http\HTTPS\DNS\TCP\ICMP`的方式对网络进行探测.

我们这里部署这个组件用来探测service资源是否可以正常访问，使用的探测方式为tcp。

### 1.在k8s集群部署blackbox-exporter容器

**部署示例yaml文件**：

```bash
apiVersion: apps/v1  #API版本
kind: Deployment  
metadata:  
  labels: 
    app: blackox-exporter
  name: blackox-exporter
  namespace: monitor 
spec: 
  replicas: 1 
  selector: 
    matchLabels: 
      app: blackox-exporter  
  template: 
    metadata: 
      labels: 
        app: blackox-exporter 
    spec:  
      containers: 
      - name: blackox-exporter
        image: 192.168.10.254:5000/blackbox-exporter:latest
        ports:
        - name: http
          containerPort: 9115
          protocol: TCP
        resources:         
          limits:          
            memory: "50Mi" 
            cpu: "100m"    
          requests:       
            cpu: "100m"    
            memory: "50Mi" 
---
apiVersion: v1     
kind: Service      
metadata:             
  name: blackox-exporter  
  namespace: monitor 
spec:              
  ports:           
  - name: http  
    port: 9115    
    protocol: TCP  
    targetPort: http
  selector:        
    app: blackox-exporter
  type: ClusterIP
```

**使用方法**

```bash
#探测TCP
curl "http://blackox-exporter.monitor.svc.cluster.local:9115/probe?target=kubernetes.default:443&module=tcp_connect"
#探测http
curl "http://blackox-exporter.monitor.svc.cluster.local:9115/probe?target=http://zhangzhuo.ltd&module=http_2xx"
#探测https
curl "http://blackox-exporter.monitor.svc.cluster.local:9115/probe?target=https://zhangzhuo.ltd&module=http_2xx"
#探测icmp
curl "http://blackox-exporter.monitor.svc.cluster.local:9115/probe?target=192.168.10.11&module=icmp"

#具体介绍
target这里填写探测的对象
module选择探测的方式
```

### 2.k8s中探测service域名解析性能以及连通性

prometheus配置文件示例：

```bash
- job_name: "kubernetes-servers"
    metrics_path: /probe      #获取指标数据的路径
    params:                   #http的参数配置，可以配置多个
      module: [tcp_connect]   #探测方式,这里选用tcp
    kubernetes_sd_configs:  #服务发现配置
    - role: service  #使用service进行服务发现
      api_server: https://192.168.10.11:6443 #k8s的master的IP地址以及端口 
      bearer_token_file: k8s.token  #kube-apiserver的认证token
      tls_config:  #ca配置
        insecure_skip_verify: true
    relabel_configs:    #label配置
      - source_labels: ["__meta_kubernetes_service_port_protocol"]  #这里是探测TCP,所以选择service是TCP协议的端口
        action: keep           #动作，匹配到的进行数据采集
        regex: "TCP"           #标签值是TCP的
      - source_labels: [__meta_kubernetes_service_name] #把service服务名称作为prometheus指标数据的label
        regex: "(.*)"
        target_label: "service_name"  #label的名称
        action: replace        #动作重写
        replacement: "$1"
      - source_labels: [__meta_kubernetes_namespace] #把service服务的namespace作为prometheus指标数据的label
        regex: "(.*)"
        target_label: "namespace_name" #label的名称
        action: replace       #动作重写
        replacement: "$1"
      - source_labels: [__address__]  #探测service的域名以及端口，以http参数的方式进行传递
        target_label: __param_target  #传递的http参数，格式__param_参数名称
      - target_label: __address__     #获取指标数据的服务器IP以及端口，及blackbox-exporter对外暴露的nodeprot端口
        replacement: blackox-exporter.monitor.svc.cluster.local:9115
```

**有用的指标数据**

```bash
#dns解析时间，单位秒，可以用来监控K8s中dns组件的性能
probe_dns_lookup_time_seconds
#目标地址的hash值，可以用来判断service是否重建
probe_ip_addr_hash
#IP地址类型4为IPv4，6为IPv6
probe_ip_protocol
#探测是否成功，判断service是否可以正常访问，变相的表示service代理的后端Pod是否存活
probe_success
```

## 2.4 Pod类型的的使用详解

### 1.kube-state-metrics

经有了cadvisor、heapster(metric server)，几乎容器运行的所有指标都能拿到，但是下面这种情况却无能为力

- 我调度了多少个replicas？现在可用的有几个？
- 多少个Pod是running/stopped/terminated状态？
- Pod重启了多少次？
- 我有多少job在运行中

而这些则是kube-state-metrics提供的内容，它基于client-go开发，轮询Kubernetes API，并将Kubernetes的结构化信息转换为metrics。

官方：https://github.com/kubernetes/kube-state-metrics

需根据自己的K8s版本选择相应的版本进行部署。官方以及提供了部署的yaml文件在github的`/examples/standard/`目录下。

```bash
cluster-role-binding.yaml  #权限绑定
cluster-role.yaml          #role文件
deployment.yaml            #部署文件
service-account.yaml       #sa文件
service.yaml               #svc文件
#全部执行即可
```

### 2.采集kube-state-metrics指标数据

**配置文件示例**

```bash
- job_name: "kube-state-metrics"
    scheme: http               #默认为http   
    metrics_path: /metrics     #采集监控指标路径
    kubernetes_sd_configs:  #服务发现配置
    - role: pod  #使用pod进行服务发现
      api_server: https://192.168.10.11:6443 #k8s的master的IP地址以及端口 
      bearer_token_file: k8s.token  #kube-apiserver的认证token
      tls_config:  #ca配置
        insecure_skip_verify: true
      namespaces:                    #选择部署kube-state-metrics命名空间
        names:
          - monitor
    relabel_configs:    #label配置
      - source_labels: ["__meta_kubernetes_pod_label_app_kubernetes_io_name"]  #利用Pod的表现选择kube-state-metrics
        action: keep           #动作，匹配到的进行数据采集
        regex: "kube-state-metrics"           #标签值是TCP的
      - source_labels: ["__meta_kubernetes_pod_container_port_name"]  #由于这个pod有俩个端口只有一个是指标数据采集的端口所以还需要筛选一次端口
        action: keep           #动作，匹配到的进行数据采集
        regex: "http-metrics"           #标签值是TCP的
```

### 3.采集coredns的指标数据

```bash
- job_name: "coredns"
    scheme: http               #默认为http   
    metrics_path: /metrics     #采集监控指标路径
    kubernetes_sd_configs:  #服务发现配置
    - role: pod  #使用pod进行服务发现
      api_server: https://192.168.10.11:6443 #k8s的master的IP地址以及端口 
      bearer_token_file: k8s.token  #kube-apiserver的认证token
      tls_config:  #ca配置
        insecure_skip_verify: true
      namespaces:                    #选择部署kube-state-metrics命名空间
        names:
          - kube-system
    relabel_configs:    #label配置
      - source_labels: ["__meta_kubernetes_pod_label_k8s_app"]  #利用Pod的表现选择kube-state-metrics
        action: keep           #动作，匹配到的进行数据采集
        regex: "kube-dns"           #标签值是TCP的
      - source_labels: ["__meta_kubernetes_pod_container_port_name"]  #由于这个pod有俩个端口只有一个是指标数据采集的端口所以还需要筛选一次端口
        action: keep           #动作，匹配到的进行数据采集
        regex: "metrics"           #标签值是TCP的
```

## 2.5 endpoints类型的使用详解

如果需要采集同一个service的后端的一组Pod一般需要使用endpoints进行服务发现，大多数情况下endpoints用来发现k8s的master节点，采集master节点的k8s组件的监控指标。直接采集kubernetes的endpoints即可，无需其他配置。

### 1.采集kube-apiserver指标数据

kube-apiserver服务有默认有俩个端口`6443`与`8080`。

- 8080：为非安装端口协议为http，如果不进行配置默认绑定在127.0.0.1地址
- 6443：为安全端口协议为https，访问需经过认证

**kube-apiserver的指标数据采集配置示例**

```bash
- job_name: "kube-apiserver"
    scheme: https              #kube-apiserver默认为https   
    metrics_path: /metrics     #采集监控指标路径
    tls_config:                #ca配置
      insecure_skip_verify: true
    bearer_token_file: k8s.token
    kubernetes_sd_configs:    #服务发现配置
    - role: endpoints         #使用endpoints进行服务发现
      api_server: https://192.168.10.11:6443   #k8s的master的IP地址以及端口 
      bearer_token_file: k8s.token    #kube-apiserver的认证token
      tls_config:  #ca配置
        insecure_skip_verify: true
      namespaces:                    #选择部署kubernetes端点所在的命名空间,默认default
        names:
          - default
    relabel_configs:    #label配置
      - source_labels: ["__meta_kubernetes_endpoints_name"]  #精确匹配kubernetes的endpoints
        action: keep          
        regex: "kubernetes"
```

### 2.采集kube-scheduler指标数据

kube-scheduler的指标数据端口默认10251协议http，没有加密

```bash
- job_name: "kube-scheduler"
    scheme: http               #kube-scheduler默认为http 
    metrics_path: /metrics     #采集监控指标路径
    kubernetes_sd_configs:     #服务发现配置
    - role: endpoints          #使用endpoints进行服务发现
      api_server: https://192.168.10.11:6443   #k8s的master的IP地址以及端口 
      bearer_token_file: k8s.token    #kube-apiserver的认证token
      tls_config:  #ca配置
        insecure_skip_verify: true
      namespaces:                    #选择部署kubernetes端点所在的命名空间,默认default
        names:
          - default
    relabel_configs:    #label配置
      - source_labels: ["__meta_kubernetes_endpoints_name"]  #精确匹配kubernetes的endpoints
        action: keep          
        regex: "kubernetes" 
      - source_labels: [__address__]            #重写采集端口
        regex: "(.*):.*"                        
        target_label: "__address__"             
        action: replace                        
        replacement: $1:10251
```

### 3.采集kube-controller-manager指标数据

kube-controller-manager的指标数据端口默认为10252协议http，不加密

```bash
- job_name: "kube-controller-manager"
    scheme: http               #kube-scheduler默认为http 
    metrics_path: /metrics     #采集监控指标路径
    kubernetes_sd_configs:    #服务发现配置
    - role: endpoints         #使用endpoints进行服务发现
      api_server: https://192.168.10.11:6443   #k8s的master的IP地址以及端口 
      bearer_token_file: k8s.token    #kube-apiserver的认证token
      tls_config:  #ca配置
        insecure_skip_verify: true
      namespaces:                    #选择部署kubernetes端点所在的命名空间,默认default
        names:
          - default
    relabel_configs:    #label配置
      - source_labels: ["__meta_kubernetes_endpoints_name"]  #精确匹配kubernetes的endpoints
        action: keep          
        regex: "kubernetes" 
      - source_labels: [__address__]           #重写采集端口
        regex: "(.*):.*"                        
        target_label: "__address__"             
        action: replace                         
        replacement: $1:10252
```

# 三、grafana插件KubeGraf

DevOpsProdigy KubeGraf是一个非常优秀的 Grafana Kubernetes 插件，是 Grafana 官方的 Kubernetes 插件的升级版本，该插件可以用来可视化和分析 Kubernetes 集群的性能，通过各种图形直观的展示了 Kubernetes 集群的主要服务的指标和特征，还可以用于检查应用程序的生命周期和错误日志。

官方网站:https://grafana.com/grafana/plugins/devopsprodigy-kubegraf-app/

主要提供了k8s指标的可视化界面，安装要求如下：

- Grafana > 5.0.0
- Prometheus + node-exporter + kube-state-metrics (version >= 1.4.0)
- Grafana-piechart-panel

### 1.安装KubeGraf插件

```bash
#部署grafana后安装插件
grafana-cli plugins install devopsprodigy-kubegraf-app
#重启grafana
systemctl restart grafana-server.service 
#之后的所所有操作都需要在grafana的web页面操作
```

### 2.配置KubeGraf插件

首先登录grafana配置prometheus数据源

![image-20211013145838147](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20211013145838147.png)

启用kubegraf插件并且配置

![image-20211013145922484](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20211013145922484.png)

配置

![image-20211013150125751](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20211013150125751.png)

认证证书信息最好使用admin权限，我这里使用kubectl的admin证书，证书信息需要base64转换

```bash
#ca证书信息
[root@master ~]# echo LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURoRENDQW15Z0F3SUJBZ0lVQ3JVb0VTR3JFU1o2Njh0KzBIT2srZEJyQnJzd0RRWUpLb1pJaHZjTkFRRUwKQlFBd1dqRUxNQWtHQTFVRUJoTUNRMDR4RURBT0JnTlZCQWNUQjBKbGFXcHBibWN4RXpBUkJnTlZCQW9UQ2t0MQpZbVZ5Ym1WMFpYTXhEekFOQmdOVkJBc1RCbE41YzNSbGJURVRNQkVHQTFVRUF4TUtTM1ZpWlhKdVpYUmxjekFlCkZ3MHlNVEE1TWpjd016RTVNREJhRncweU5qQTVNall3TXpFNU1EQmFNRm94Q3pBSkJnTlZCQVlUQWtOT01SQXcKRGdZRFZRUUhFd2RDWldscWFXNW5NUk13RVFZRFZRUUtFd3BMZFdKbGNtNWxkR1Z6TVE4d0RRWURWUVFMRXdaVAplWE4wWlcweEV6QVJCZ05WQkFNVENrdDFZbVZ5Ym1WMFpYTXdnZ0VpTUEwR0NTcUdTSWIzRFFFQkFRVUFBNElCCkR3QXdnZ0VLQW9JQkFRQ3JuOEVHV3h0NGRrY1lRUExubWR2cmo1Z25zeklGRWxhWHoxbWQ4V2JGTUdVM05LdkMKN0IwcUY5bXdZcy9ENTkvdXdWLzdDaVEyT0NXbnRHVFlhcFFYUkNpQUJzbUh6a1lpN00wdURJY3BHeTNsYnFIYwp3dFRzZnROTENLcmZxMEh5eDZXZmNoRVZNTjd4THpJUDl3ZGd3THpVZHFNVk8rVEtIUkFXUWpORzVPeFJ2T0htCmpSVVhYVUQ5QjdFbUJGZFJjTXZsVm9uS2hYQ1lrNUI4R3BvZHNwM1VOS3h5dHQyTVpHSWR1MTRMeE1wNkNKNVYKRUd2dmY0aVVkWVI4Rk5IT1VSVmVlc0JSUUw5QWtxMHJDZE1JSURxTkdBWllCV2dad09FVXRTZ2lFMVY3Rk1WRwo4Sk5PL3QzdFl0a3JQQnRld3NaWHZmMEliNFhZQUpvd0YramhBZ01CQUFHalFqQkFNQTRHQTFVZER3RUIvd1FFCkF3SUJCakFQQmdOVkhSTUJBZjhFQlRBREFRSC9NQjBHQTFVZERnUVdCQlNIc2RpZ0EzMHVGWkhOZkpVdU9XZ2wKTkNmTXVqQU5CZ2txaGtpRzl3MEJBUXNGQUFPQ0FRRUFQeTc2c2dMVFdTQkVsRHE0RDdNNExDbGplSEFsTEZpcwp4TTNmWE5aQkt4SDNRbVZnZ3EwVHh3NWdrYk9tMUpWOER4WExOaFVZL0NYemdGakZaSlRCWlB2bzVnZFNVbXZyCnA1NFREb3RvRndjREhTMlNsSEtQblROTCtuOU5kL3Bwejg0NUZHU3QybFJpQzh1N0M2dHY5ejFxUEpmajZtSlEKZnREbExjcUtibFd6RjVndm5YT0Uyd0RjalhiV0lBUk9iZjNZN3JpUzlMamxoY3ZNWXAvVGFQTW5HNXBaZCtseQpkSnlmZjdqL05JN0wyTmY4dW05TEJ2Umk2ODlGUnlBSlhaMnBGQURkUHA4Z3lwc0d3eitLalJwZGJpTlBVcmlYCnZCQ3p1ckR6NlBKVXM4Y2RabWxMNlBjVkVadTZ4Um0rY0luY1JVNjFwSXVLU3lURkdyUjlCUT09Ci0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K | base64 -d
-----BEGIN CERTIFICATE-----
MIIDhDCCAmygAwIBAgIUCrUoESGrESZ668t+0HOk+dBrBrswDQYJKoZIhvcNAQEL
BQAwWjELMAkGA1UEBhMCQ04xEDAOBgNVBAcTB0JlaWppbmcxEzARBgNVBAoTCkt1
YmVybmV0ZXMxDzANBgNVBAsTBlN5c3RlbTETMBEGA1UEAxMKS3ViZXJuZXRlczAe
Fw0yMTA5MjcwMzE5MDBaFw0yNjA5MjYwMzE5MDBaMFoxCzAJBgNVBAYTAkNOMRAw
DgYDVQQHEwdCZWlqaW5nMRMwEQYDVQQKEwpLdWJlcm5ldGVzMQ8wDQYDVQQLEwZT
eXN0ZW0xEzARBgNVBAMTCkt1YmVybmV0ZXMwggEiMA0GCSqGSIb3DQEBAQUAA4IB
DwAwggEKAoIBAQCrn8EGWxt4dkcYQPLnmdvrj5gnszIFElaXz1md8WbFMGU3NKvC
7B0qF9mwYs/D59/uwV/7CiQ2OCWntGTYapQXRCiABsmHzkYi7M0uDIcpGy3lbqHc
wtTsftNLCKrfq0Hyx6WfchEVMN7xLzIP9wdgwLzUdqMVO+TKHRAWQjNG5OxRvOHm
jRUXXUD9B7EmBFdRcMvlVonKhXCYk5B8Gpodsp3UNKxytt2MZGIdu14LxMp6CJ5V
EGvvf4iUdYR8FNHOURVeesBRQL9Akq0rCdMIIDqNGAZYBWgZwOEUtSgiE1V7FMVG
8JNO/t3tYtkrPBtewsZXvf0Ib4XYAJowF+jhAgMBAAGjQjBAMA4GA1UdDwEB/wQE
AwIBBjAPBgNVHRMBAf8EBTADAQH/MB0GA1UdDgQWBBSHsdigA30uFZHNfJUuOWgl
NCfMujANBgkqhkiG9w0BAQsFAAOCAQEAPy76sgLTWSBElDq4D7M4LCljeHAlLFis
xM3fXNZBKxH3QmVggq0Txw5gkbOm1JV8DxXLNhUY/CXzgFjFZJTBZPvo5gdSUmvr
p54TDotoFwcDHS2SlHKPnTNL+n9Nd/ppz845FGSt2lRiC8u7C6tv9z1qPJfj6mJQ
ftDlLcqKblWzF5gvnXOE2wDcjXbWIARObf3Y7riS9LjlhcvMYp/TaPMnG5pZd+ly
dJyff7j/NI7L2Nf8um9LBvRi689FRyAJXZ2pFADdPp8gypsGwz+KjRpdbiNPUriX
vBCzurDz6PJUs8cdZmlL6PcVEZu6xRm+cIncRU61pIuKSyTFGrR9BQ==
-----END CERTIFICATE-----
#客户端证书信息
[root@master ~]# echo LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUR3RENDQXFpZ0F3SUJBZ0lVQkpJOVlJeExVOTF2ZGVqT3QzU1pkeEIyYm5rd0RRWUpLb1pJaHZjTkFRRUwKQlFBd1dqRUxNQWtHQTFVRUJoTUNRMDR4RURBT0JnTlZCQWNUQjBKbGFXcHBibWN4RXpBUkJnTlZCQW9UQ2t0MQpZbVZ5Ym1WMFpYTXhEekFOQmdOVkJBc1RCbE41YzNSbGJURVRNQkVHQTFVRUF4TUtTM1ZpWlhKdVpYUmxjekFlCkZ3MHlNVEE1TWpjd016SXdNREJhRncwek1UQTVNalV3TXpJd01EQmFNRmt4Q3pBSkJnTlZCQVlUQWtOT01SQXcKRGdZRFZRUUhFd2RDWldscWFXNW5NUmN3RlFZRFZRUUtFdzV6ZVhOMFpXMDZiV0Z6ZEdWeWN6RVBNQTBHQTFVRQpDeE1HVTNsemRHVnRNUTR3REFZRFZRUURFd1ZoWkcxcGJqQ0NBU0l3RFFZSktvWklodmNOQVFFQkJRQURnZ0VQCkFEQ0NBUW9DZ2dFQkFLRmthSUxSTUNsbVEyWldzUlhQR3BFYW9tc2N3MVBqSlR1TkdOR01ycTdpck8xS2JIRFQKYldLcHl0VjNiejM0N2R2Tm8vUy94MzhFcmo3U3JFWUQrY281bWF2TzY0YU9CaEgvUWR3RlZQMzh5N0Q0TGFZcQpsRkZLMWtpOUhVNjAwQXNDWjZxNCs5cEZzYVVLWkNhRjIxcGIvZ24zYUxBQ3JMVXdQbDU0QVk3RnU3VWhGcUp4CktiVngxWWNQVnA0SWEvazVkRzRpb1FVSVlOWkxNTnZESXRUMW1scFlKT1RTZ0lYZjhvU1NqNFRtOU1LMDFtT2IKc0o1VDFMb0JCeGtTWGtCT3dkWTdqMGlZczNXMzhvQjBWK25qVy81RDYxb0ZWY3dvR2p3c2gxTlJZdlZlUS9PZwpTWUN1SGhubFFYSElDUnNxTjZCbU1OSDhkU3hSeHB2eEtETUNBd0VBQWFOL01IMHdEZ1lEVlIwUEFRSC9CQVFECkFnV2dNQjBHQTFVZEpRUVdNQlFHQ0NzR0FRVUZCd01CQmdnckJnRUZCUWNEQWpBTUJnTlZIUk1CQWY4RUFqQUEKTUIwR0ExVWREZ1FXQkJTVU9JQmZLd1hkSjdYa1ZoTmo4TUVkcW04QUtEQWZCZ05WSFNNRUdEQVdnQlNIc2RpZwpBMzB1RlpITmZKVXVPV2dsTkNmTXVqQU5CZ2txaGtpRzl3MEJBUXNGQUFPQ0FRRUFhN0Q2Rm00dE1IdVNKUGhDCjFYTlNudHNVYkl6Zi9ZTnA3OXZMeWM0QkZDRHRXeGJ2RDNMRk1vSjBIc2x2SWhOR1Q0dlBTcEozY21lS2NYNnkKVGFTeXJwdnh2dW5sMzRlU013WmNkRy9jbUk5NnQyME4wZi92alVIOGlrSFN6WXROclZCeVhjN3hPb3lVcUQxbwpPSTAxdEhWNXhkdWVHNi80UnhDa0E4VGpCbWlQT2dBbVpqUVcrRDFVQ1dJR3JXeTQ2UXVUTmV2UzV6ZDgySzM0ClFGRnR0WEEwenpGS1pJTXJFUmEwZWl0M0lYaFZQbkJPUDByU1FHdTBQeStDRzlRVnpTQnd2MVRaTFhJSWl5Uk0KVGdON0tXaFdmMk9zMW1GVnRIRnNJL2xSS0VBL3ppaTV4T09qamxVRVJreWhOc2xYTXk4UlNJeVc1VTBqMmhuSgpLUU5NdFE9PQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg== | base64 -d
-----BEGIN CERTIFICATE-----
MIIDwDCCAqigAwIBAgIUBJI9YIxLU91vdejOt3SZdxB2bnkwDQYJKoZIhvcNAQEL
BQAwWjELMAkGA1UEBhMCQ04xEDAOBgNVBAcTB0JlaWppbmcxEzARBgNVBAoTCkt1
YmVybmV0ZXMxDzANBgNVBAsTBlN5c3RlbTETMBEGA1UEAxMKS3ViZXJuZXRlczAe
Fw0yMTA5MjcwMzIwMDBaFw0zMTA5MjUwMzIwMDBaMFkxCzAJBgNVBAYTAkNOMRAw
DgYDVQQHEwdCZWlqaW5nMRcwFQYDVQQKEw5zeXN0ZW06bWFzdGVyczEPMA0GA1UE
CxMGU3lzdGVtMQ4wDAYDVQQDEwVhZG1pbjCCASIwDQYJKoZIhvcNAQEBBQADggEP
ADCCAQoCggEBAKFkaILRMClmQ2ZWsRXPGpEaomscw1PjJTuNGNGMrq7irO1KbHDT
bWKpytV3bz347dvNo/S/x38Erj7SrEYD+co5mavO64aOBhH/QdwFVP38y7D4LaYq
lFFK1ki9HU600AsCZ6q4+9pFsaUKZCaF21pb/gn3aLACrLUwPl54AY7Fu7UhFqJx
KbVx1YcPVp4Ia/k5dG4ioQUIYNZLMNvDItT1mlpYJOTSgIXf8oSSj4Tm9MK01mOb
sJ5T1LoBBxkSXkBOwdY7j0iYs3W38oB0V+njW/5D61oFVcwoGjwsh1NRYvVeQ/Og
SYCuHhnlQXHICRsqN6BmMNH8dSxRxpvxKDMCAwEAAaN/MH0wDgYDVR0PAQH/BAQD
AgWgMB0GA1UdJQQWMBQGCCsGAQUFBwMBBggrBgEFBQcDAjAMBgNVHRMBAf8EAjAA
MB0GA1UdDgQWBBSUOIBfKwXdJ7XkVhNj8MEdqm8AKDAfBgNVHSMEGDAWgBSHsdig
A30uFZHNfJUuOWglNCfMujANBgkqhkiG9w0BAQsFAAOCAQEAa7D6Fm4tMHuSJPhC
1XNSntsUbIzf/YNp79vLyc4BFCDtWxbvD3LFMoJ0HslvIhNGT4vPSpJ3cmeKcX6y
TaSyrpvxvunl34eSMwZcdG/cmI96t20N0f/vjUH8ikHSzYtNrVByXc7xOoyUqD1o
OI01tHV5xdueG6/4RxCkA8TjBmiPOgAmZjQW+D1UCWIGrWy46QuTNevS5zd82K34
QFFttXA0zzFKZIMrERa0eit3IXhVPnBOP0rSQGu0Py+CG9QVzSBwv1TZLXIIiyRM
TgN7KWhWf2Os1mFVtHFsI/lRKEA/zii5xOOjjlUERkyhNslXMy8RSIyW5U0j2hnJ
KQNMtQ==
-----END CERTIFICATE-----
#客户端私钥信息
[root@master ~]# echo LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLQpNSUlFb3dJQkFBS0NBUUVBb1dSb2d0RXdLV1pEWmxheEZjOGFrUnFpYXh6RFUrTWxPNDBZMFl5dXJ1S3M3VXBzCmNOTnRZcW5LMVhkdlBmanQyODJqOUwvSGZ3U3VQdEtzUmdQNXlqbVpxODdyaG80R0VmOUIzQVZVL2Z6THNQZ3QKcGlxVVVVcldTTDBkVHJUUUN3Sm5xcmo3MmtXeHBRcGtKb1hiV2x2K0NmZG9zQUtzdFRBK1huZ0Jqc1c3dFNFVwpvbkVwdFhIVmh3OVduZ2hyK1RsMGJpS2hCUWhnMWtzdzI4TWkxUFdhV2xnazVOS0FoZC95aEpLUGhPYjB3clRXClk1dXdubFBVdWdFSEdSSmVRRTdCMWp1UFNKaXpkYmZ5Z0hSWDZlTmIva1ByV2dWVnpDZ2FQQ3lIVTFGaTlWNUQKODZCSmdLNGVHZVZCY2NnSkd5bzNvR1l3MGZ4MUxGSEdtL0VvTXdJREFRQUJBb0lCQURaa1I1Q20vWXRHU3JySAp4c0NwM3JNK2ZiU0pxZzZ3ZzlEUkdhY3R1WVY1SVh5TFU0YW15cnV3cTRwTHlUTGluUTh4KytxMVkzK2NUVGtnCitTeFRsTENodnZlWE1ldFVIQm1lcEV5SmczNWgzeWdTVEJndlMzTW1QSmVoSEtwMDU1UitSLy9TZmhhdTNGTFoKOEt6RytnazI3YVBnUE9qc3pkWDJuMTVwSldVL0Y1dzVPb3pKd3c5ZS9kL2JQSTFNTDJVVUp0TkVURHFFRzk1egpBWXNvcXVOclFpR1RmS3Y1UGMxVm5zWGRRQXg2aFpkcDdpLzV1dWlPdlp1RVVUWG51TDE1d3gzQUNNcHA1akZUCjNLWDF5K3JmdDA2d1YvdzRHcVdZWk9lWGhPaXNBWExsL2NKejlWRnlpV0QzZS9DaEZGaWx1V2JCSFE5RW1FMVkKY0JLMkJMRUNnWUVBejhEOFpaejFOVnRxczlRUkhyMDYzRDZOSHRoUWlTR3U3ckFZemFQNU1FbzJRL01ORUd1TwpQcUVoWjRVMGhUSENDSTZSdjdQcGJnTTVEN3QrWE5Sa3crYmZwVXcrTGh5dWUyV1FidExhNFlPOGNpenRDQjBCCkRrV0Zka2RURTZWMzBmd25QUGV1ZGI4Tm55dlBqUzFhYWVTaGUra2JwenpPUlBRWHAzUDFHWWtDZ1lFQXh0ODIKYzJmdU56ZEVhMlMrZlNNT3R5SkpRblM5YVBwQ2pOWHlDWHR0d1gxbnJ2M25zRFhWZlVQZjNVN08vYlN4OFozLwp1QXo5VEhGaCt0UkdnSGhpWDNlWkxhRU5uSlJUZERjZS91QTd1emMvMTZ5Q1BYRGZLQStsZjEyRXdRc3RnOTJmCjJDbzBxU3NGYzRyVE9OT3M0aURZOEd5VmtLaitIYWI5T0dBZDBOc0NnWUFSVVYzNHZtKzJSZXVNRi9aaFlKYkMKZXpoYVJOL1p2b1FOZzRKZHlmaGdyUjcrNVFqR3dLQjMyZ2lsejNYRVVKU0RFQmRZS3BBZnlvYjhKNzN0MFFxaApSZUtJcmVWVkJMRUt1am1pODFLcGo4aXFuOUlXWmd5TGV3SVlEUFFBNUQ4cnN1QTJkZE1HSDZuc0JjUGtXYzU2Cm0wTld4K1MxT1IxY3BCaEFyaXJWT1FLQmdRQ1NFeDZod2pNOXA0REFDVzNKNk5oRU9CRHJtV2dQRmRPUU13M24KWFJ3UFJaZkU5NGNZN1ZIMUFzZ0tmSHFaN0FIUVlhZVZmeVVHNHpsK3pqRkM2Q29KeVlWZitLNVExcm85NE1jSgptNWNFT3Q3UUFreGY2T3BoT0t6dFVyblNPZTJpc0VWYXVCV2FOSmw2ZHZ3Uy81ZzdPTGxnVDhIRVVmemx0dVRFClpnVkFoUUtCZ0hEUlhnbTRYUzdQbTcvZU84ZHpFa0MvUEEybHFjNGNDejZvUXNYSE9MQWtKUWplcTc0Rzg0dnIKTkNSeTJFT3JYZlpNQXNnZHZ5M0c4RjNWSnRYZ053ZHZXNHpobDlrRG5CRklSTFVkTlg5VGxEcVg4WDhwMU96TQprNFIxNlNTTzlqbjBPaFFYaUlHb3gxSDZLOTJMQ1dWYkpTWkY5Nk04SzNzN3dkMnBBY05GCi0tLS0tRU5EIFJTQSBQUklWQVRFIEtFWS0tLS0tCg== | base64 -d
-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEAoWRogtEwKWZDZlaxFc8akRqiaxzDU+MlO40Y0YyuruKs7Ups
cNNtYqnK1XdvPfjt282j9L/HfwSuPtKsRgP5yjmZq87rho4GEf9B3AVU/fzLsPgt
piqUUUrWSL0dTrTQCwJnqrj72kWxpQpkJoXbWlv+CfdosAKstTA+XngBjsW7tSEW
onEptXHVhw9Wnghr+Tl0biKhBQhg1ksw28Mi1PWaWlgk5NKAhd/yhJKPhOb0wrTW
Y5uwnlPUugEHGRJeQE7B1juPSJizdbfygHRX6eNb/kPrWgVVzCgaPCyHU1Fi9V5D
86BJgK4eGeVBccgJGyo3oGYw0fx1LFHGm/EoMwIDAQABAoIBADZkR5Cm/YtGSrrH
xsCp3rM+fbSJqg6wg9DRGactuYV5IXyLU4amyruwq4pLyTLinQ8x++q1Y3+cTTkg
+SxTlLChvveXMetUHBmepEyJg35h3ygSTBgvS3MmPJehHKp055R+R//Sfhau3FLZ
8KzG+gk27aPgPOjszdX2n15pJWU/F5w5OozJww9e/d/bPI1ML2UUJtNETDqEG95z
AYsoquNrQiGTfKv5Pc1VnsXdQAx6hZdp7i/5uuiOvZuEUTXnuL15wx3ACMpp5jFT
3KX1y+rft06wV/w4GqWYZOeXhOisAXLl/cJz9VFyiWD3e/ChFFiluWbBHQ9EmE1Y
cBK2BLECgYEAz8D8ZZz1NVtqs9QRHr063D6NHthQiSGu7rAYzaP5MEo2Q/MNEGuO
PqEhZ4U0hTHCCI6Rv7PpbgM5D7t+XNRkw+bfpUw+Lhyue2WQbtLa4YO8ciztCB0B
DkWFdkdTE6V30fwnPPeudb8NnyvPjS1aaeShe+kbpzzORPQXp3P1GYkCgYEAxt82
c2fuNzdEa2S+fSMOtyJJQnS9aPpCjNXyCXttwX1nrv3nsDXVfUPf3U7O/bSx8Z3/
uAz9THFh+tRGgHhiX3eZLaENnJRTdDce/uA7uzc/16yCPXDfKA+lf12EwQstg92f
2Co0qSsFc4rTONOs4iDY8GyVkKj+Hab9OGAd0NsCgYARUV34vm+2ReuMF/ZhYJbC
ezhaRN/ZvoQNg4JdyfhgrR7+5QjGwKB32gilz3XEUJSDEBdYKpAfyob8J73t0Qqh
ReKIreVVBLEKujmi81Kpj8iqn9IWZgyLewIYDPQA5D8rsuA2ddMGH6nsBcPkWc56
m0NWx+S1OR1cpBhArirVOQKBgQCSEx6hwjM9p4DACW3J6NhEOBDrmWgPFdOQMw3n
XRwPRZfE94cY7VH1AsgKfHqZ7AHQYaeVfyUG4zl+zjFC6CoJyYVf+K5Q1ro94McJ
m5cEOt7QAkxf6OphOKztUrnSOe2isEVauBWaNJl6dvwS/5g7OLlgT8HEUfzltuTE
ZgVAhQKBgHDRXgm4XS7Pm7/eO8dzEkC/PA2lqc4cCz6oQsXHOLAkJQjeq74G84vr
NCRy2EOrXfZMAsgdvy3G8F3VJtXgNwdvW4zhl9kDnBFIRLUdNX9TlDqX8X8p1OzM
k4R16SSO9jn0OhQXiIGox1H6K92LCWVbJSZF96M8K3s7wd2pAcNF
-----END RSA PRIVATE KEY-----
```

最后选择那会创建的prometheus数据源即可

![image-20211013150911635](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20211013150911635.png)

之后进入各个监控项验证是否可以正常显示监控数据，如果正常表示kubegraf插件工作正常

### 3.calico的grafana模板

官方模板：https://grafana.com/grafana/dashboards/12175

### 4.coredns的grafana模板

官方模板：https://grafana.com/grafana/dashboards/12539

# 四、kube-Prometheus项目详解

Kubernetes的Prometheus Operator为Kubernetes服务和Prometheus实例的部署和管理提供了简单的监控定义。

安装完毕后，Prometheus Operator 提供了以下功能：

- 创建/毁坏： 在 Kubernetes namespace 中更容易启动一个 Prometheus 实例，一个特定的应用程序或团队更容易使用Operator。
- 简单配置： 配置 Prometheus 的基础东西，比如在 Kubernetes 的本地资源 versions, persistence, retention policies, 和 replicas。
- Target Services 通过标签： 基于常见的 Kubernetes label 查询，自动生成监控 target 配置；不需要学习 Prometheus 特定的配置语言。

架构如下：

![Prometheus Operator ](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/20200902112303936.png)

- Operator： Operator 资源会根据自定义资源（Custom Resource Definition / CRDs）来部署和管理 Prometheus Server，同时监控这些自定义资源事件的变化来做相应的处理，是整个系统的控制中心。
- Prometheus： Prometheus 资源是声明性地描述 Prometheus 部署的期望状态。
- Prometheus Server： Operator 根据自定义资源 Prometheus 类型中定义的内容而部署的 Prometheus Server 集群，这些自定义资源可以看作是用来管理 Prometheus Server 集群的 StatefulSets 资源。
- ServiceMonitor： ServiceMonitor 也是一个自定义资源，它描述了一组被 Prometheus 监控的 targets 列表。该资源通过 Labels 来选取对应的 Service Endpoint，让 Prometheus Server 通过选取的 Service 来获取 Metrics 信息。
- Service： Service 资源主要用来对应 Kubernetes 集群中的 Metrics Server Pod，来提供给 ServiceMonitor 选取让 Prometheus Server 来获取信息。简单的说就是 Prometheus 监控的对象，例如 Node Exporter Service、Mysql Exporter Service 等等。
- Alertmanager： Alertmanager 也是一个自定义资源类型，由 Operator 根据资源描述内容来部署 Alertmanager 集群。

官方项目地址：https://github.com/prometheus-operator/kube-prometheus

## 4.1 kube-Prometheus部署

首先通过项目地址，找到和自己kubernetes版本对应的kube-prometheus stack的版本如下

![image-20220405172644239](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20220405172644239.png)

我这里的k8s版本为1.18+,所以选择release-0.5版本，下载项目的所有文件

```bash
#解压后文件如下
[17:28:34 root@node-1 kube-prometheus-release-0.5]#ls
build.sh            go.sum                 manifests
code-of-conduct.md  hack                   NOTICE
DCO                 jsonnet                OWNERS
docs                jsonnetfile.json       README.md
example.jsonnet     jsonnetfile.lock.json  scripts
examples            kustomization.yaml     sync-to-internal-registry.jsonnet
experimental        LICENSE                tests
go.mod              Makefile               test.sh
#注意所有的安装示例文件都在manifests目录下
```

### 1.安装prometheus-operator

```bash
[17:30:19 root@node-1 kube-prometheus-release-0.5]#cd manifests/
#operator的部署文件在setup目录下，这个目录下的所有文件都需部署
[17:30:21 root@node-1 manifests]#cd setup/
#这个目录下的所有文件基本不需要修改，直接创建即可。默认会创建一个monitoring命名空间，并且把所有资源都创建在这个命名空间，如果在自己环境使用最好把所有镜像下载到自己的镜像仓库之后进行创建
[17:40:12 root@node-1 manifests]#kubectl apply -f setup/
namespace/monitoring created
customresourcedefinition.apiextensions.k8s.io/alertmanagers.monitoring.coreos.com created
customresourcedefinition.apiextensions.k8s.io/podmonitors.monitoring.coreos.com created
customresourcedefinition.apiextensions.k8s.io/prometheuses.monitoring.coreos.com created
customresourcedefinition.apiextensions.k8s.io/prometheusrules.monitoring.coreos.com created
customresourcedefinition.apiextensions.k8s.io/servicemonitors.monitoring.coreos.com created
customresourcedefinition.apiextensions.k8s.io/thanosrulers.monitoring.coreos.com created
clusterrole.rbac.authorization.k8s.io/prometheus-operator created
clusterrolebinding.rbac.authorization.k8s.io/prometheus-operator created
deployment.apps/prometheus-operator created
service/prometheus-operator created
serviceaccount/prometheus-operator created
#验证
[17:42:12 root@node-1 manifests]#kubectl  get pod -n monitoring 
NAME                                  READY   STATUS    RESTARTS   AGE
prometheus-operator-c586fb8cd-sj2zm   2/2     Running   0          2m42s
```

安装完成后就可以创建kube-prometheus技术栈中的自定义资源了。

### 2.创建prometheus

```bash
#manifests文件中prometheus开头的文件都是prometheus资源yaml文件
#最重要的就是prometheus-prometheus.yaml文件，这个文件是生成Prometheus资源的配置文件
apiVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata:
  labels:
    prometheus: k8s
  name: k8s
  namespace: monitoring
spec:
  alerting:
    alertmanagers:            #这里为告警配置，出现告警信息发送到那个alertmanager组件，这里默认定义的是alertmanager-main的svc资源
    - name: alertmanager-main
      namespace: monitoring
      port: web
  image: 192.168.10.254:5000/prometheus/prometheus:v2.15.2   #Prometheus镜像
  nodeSelector:
    kubernetes.io/os: linux
  podMonitorNamespaceSelector: {}
  podMonitorSelector: {}
  replicas: 1   #副本数，可以写多个默认会组成高可用集群
  resources:    #资源限制配置
    requests:
      memory: 400Mi
  ruleSelector:   #rule配置，可就是告警配置，默认会生成一个PrometheusRule自定义资源，这里就是选择那个资源
    matchLabels:  #匹配标签
      prometheus: k8s
      role: alert-rules
  securityContext:  #Pid权限配置
    fsGroup: 2000
    runAsNonRoot: true
    runAsUser: 1000
  serviceAccountName: prometheus-k8s  #sa配置
  serviceMonitorNamespaceSelector: {}
  serviceMonitorSelector: {}
  version: v2.15.2
```

### 3.创建alertmanager

```bash
#manifests文件中alertmanager开头的文件都是alertmanager资源yaml文件
#最重要的就是alertmanager-alertmanager.yaml文件，这个文件是生成alertmanager资源的配置文件
apiVersion: monitoring.coreos.com/v1
kind: Alertmanager
metadata:
  labels:
    alertmanager: main
  name: main
  namespace: monitoring
spec:
  image: quay.io/prometheus/alertmanager:v0.20.0  #镜像
  nodeSelector:
    kubernetes.io/os: linux
  replicas: 1    #副本数，如果是多个会自动组成高可用集群
  securityContext:
    fsGroup: 2000
    runAsNonRoot: true
    runAsUser: 1000
  serviceAccountName: alertmanager-main
  version: v0.20.0
```

### 4.部署grafana

```bash
#manifests文件中grafana开头的文件都是grafana资源yaml文件
#其中部署grafana服务的资源文件是grafana-deployment.yaml，需要修改的就是数据持久化，默认数据是不进行持久化的，需要有存储类
#创建存储类文件
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: grafana-data
  namespace: monitoring
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: nfs-client
  resources:
    requests:
      storage: 20Gi
#配置数据持久化
      volumes:   #修改这里即可
      - name: grafana-storage
         persistentVolumeClaim:  #类型为调用PVC
          claimName: grafana-data   #指定PVC名称
```

### 5.部署kube-state-metrics

```bash
#修改kube-state-metrics-deployment.yaml即可，主要是镜像地址默认gcr镜像国内无法访问
image: 192.168.10.254:5000/coreos/kube-state-metrics:v1.9.5
```

### 6.部署node-exporter

```bash
#主要修改镜像
image: 192.168.10.254:5000/prometheus/node-exporter:v0.18.1
```

### 7.部署所有组件

```bash
[18:43:23 root@node-1 manifests]#pwd
/root/kube-prometheus-release-0.5/manifests
[18:43:47 root@node-1 manifests]#kubectl  apply -f . 
#验证
[18:44:56 root@node-1 manifests]#kubectl get pod -n monitoring 
NAME                                  READY   STATUS    RESTARTS   AGE
alertmanager-main-0                   2/2     Running   0          94s
grafana-66bf7b6fb-src92               1/1     Running   0          2m51s
kube-state-metrics-98887d75d-899ks    3/3     Running   0          3m17s
node-exporter-pdt9k                   2/2     Running   0          3m16s
node-exporter-t69s4                   2/2     Running   0          3m16s
prometheus-adapter-58467955c8-kqz2f   1/1     Running   0          3m17s
prometheus-k8s-0                      3/3     Running   1          3m16s
prometheus-operator-c586fb8cd-sj2zm   2/2     Running   0          64m
```

### 8.配置ingress

```bash
#Prometheus的访问ingress
apiVersion: networking.k8s.io/v1beta1
kind: Ingress
metadata:
  name: prommetheus
  namespace: monitoring
  annotations:
    kubernetes.io/ingress.class: "nginx"
spec:
  rules:   
  - host: www.prometheus.org
    http: 
      paths:
      - pathType: Prefix
        path: "/"
        backend:
          serviceName: prometheus-k8s
          servicePort: 9090
#grafana的访问ingress
apiVersion: networking.k8s.io/v1beta1
kind: Ingress
metadata:
  name: grafana
  namespace: monitoring
  annotations:
    kubernetes.io/ingress.class: "nginx"
    nginx.ingress.kubernetes.io/rewrite-target: "/$1"
spec:
  rules:   
  - host: 
    http: 
      paths:
      - pathType: Prefix
        path: "/grafana/(.*)"
        backend:
          serviceName: grafana
          servicePort: 3000
```

## 4.2 kube-Prometheus的CDR资源详解

kube-Prometheus安装后默认会创建一些CRD资源，如下：

```bash
[19:14:18 root@node-1 manifests]#kubectl  get crd
NAME                                    CREATED AT
alertmanagers.monitoring.coreos.com     2022-04-10T11:48:00Z
podmonitors.monitoring.coreos.com       2022-04-10T11:48:00Z
prometheuses.monitoring.coreos.com      2022-04-10T11:48:00Z
prometheusrules.monitoring.coreos.com   2022-04-10T11:48:00Z
servicemonitors.monitoring.coreos.com   2022-04-10T11:48:00Z
thanosrulers.monitoring.coreos.com      2022-04-10T11:48:00Z
```

他们的作用如下：

- **Prometheus**：prometheus高可用集群创建资源
- **PrometheusRule**：用于定义prometheus中rule告警的资源
- **ServiceMonitor**：用于定义prometheus中K8s服务发现的规则，主要通过service资源发现服务
- **PodMonitor**：用于定义prometheus中K8s服务发现的规则，主要通过Pod资源发现服务，一般不使用
- **Alertmanager**：prometheus中Alertmanager告警组件部署资源文件
- **ThanosRuler**：

### 1.Prometheus

**示例文件如下**：

```yaml
apiVersion: monitoring.coreos.com/v1  #api版本
kind: Prometheus                      #资源类型
metadata:                             #元数据定义
  labels:
    prometheus: k8s
  name: k8s
  namespace: monitoring
spec:                                 #具体的prometheus资源定义信息
  alerting:                           #告警组件设置
    alertmanagers:                    #对接的Alertmanager信息
    - name: alertmanager-main         #Alertmanager组件的service资源名称
      namespace: monitoring           #所在的命名空间
      port: web                       #service端口名称   
  additionalScrapeConfigs:    #添加静态配置
    key: prometheus-additional.yaml  #secret的key名称
    name: additional-configs         #secret资源名称，secret资源必须与Prometheus部署在同一个命名空间
    optional: true   #是用secret资源
  image: 192.168.10.254:5000/prometheus/prometheus:v2.15.2   #prometheus的镜像，一般默认跟官方保持一致
  nodeSelector:                       #部署选择部署到
    kubernetes.io/os: linux
  podMonitorNamespaceSelector: {}     #选择那些命名空间下的podMonitor的crd资源进行服务发现，不写默认全部
  podMonitorSelector: {}              #选择发现那些podMonitor的资源，不写发现所有，可以使用标签选择器matchLabels
  replicas: 1                         #副本数多个副本默认组成高可用集群
  resources:                          #资源限制，配置方式与Pod一致
    requests:
      memory: 400Mi
  ruleSelector:                       #选择生效的rule告警规则
    matchLabels:                      #标签选择器
      prometheus: k8s          
      role: alert-rules
  securityContext:                   #安全上下文配置，与Pod配置一致
    fsGroup: 2000
    runAsNonRoot: true
    runAsUser: 1000
  serviceAccountName: prometheus-k8s  #授权过的sa资源名称，需与prometheus部署的命名空间一致
  serviceMonitorNamespaceSelector: {}  #选择那些命名空间下的serviceMonitor资源进行服务发现,不写发现所有命名空间下资源
  serviceMonitorSelector: {}           #选择那些serviceMonitor资源进行服务发现，不写发现所有，可以使用标签选择器matchLabels
  version: v2.15.2                     #版本，保持默认即可
  storage:                             #数据持久化配置，有默认存储类即可不用指定，如果没有需指定storageClassName
    volumeClaimTemplate:               
      spec:
        storageClassName: rook-rbd
        resources:
          requests:
            storage: 10Gi
```

prometheus需要与kube-apiserver进行通信，所以需要相关权限，需要创建sa资源并且绑定特定的权限，官方提供了一些示例文件。

- prometheus-clusterRole.yaml：集群role创建
- prometheus-clusterRoleBinding.yaml： 集群role绑定，绑定到sa资源
- prometheus-roleSpecificNamespaces.yaml：role权限创建文件
- prometheus-roleBindingSpecificNamespaces.yaml：权限绑定
- prometheus-serviceAccount.yaml： sa资源创建文件

### 2.PrometheusRule

Prometheus资源中的`ruleSelector`用来发现这个Prometheus用那个rule规则进行告警,以标签选择器的形式进行发现。

**示例文件如下**：

```yaml
apiVersion: monitoring.coreos.com/v1    #api版本                               
kind: PrometheusRule                    #资源类型
metadata:                               #源数据定义
  labels:                               #标签，prometheus会用这个标签发现rule
    prometheus: k8s
    role: alert-rules
  name: prometheus-k8s-rules
  namespace: monitoring
spec:                                  #规则具体定义
  groups:                              #分组
  - name: node-exporter.rules          #分组名称
    rules:                             #具体rule定义，分片的形式可以配置多个
    - expr: |                          #Prometheus的查询语句
        count without (cpu) (
          count without (mode) (
            node_cpu_seconds_total{job="node-exporter"}
          )
        )
      record: instance:node_num_cpu:sum   #这里是prometheus中的record，会把上面语句的结果生成一个新的指标数据以方便下面告警规则进行引用
    - expr: |
        (
          node_load1{job="node-exporter"}
        /
          instance:node_num_cpu:sum{job="node-exporter"}  #这里是引用的上面注册的自定义指标
        )
      record: instance:node_load1_per_cpu:ratio
    - alert: NodeClockNotSynchronising         #告警规则名称
      annotations:                             #其他的信息定义
        message: Clock on {{ $labels.instance }} is not synchronising. Ensure NTP
          is configured on this host.          #告警信息定义
        runbook_url: https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-nodeclocknotsynchronising                      #这里填写说明
        summary: Clock not synchronising.
      expr: |                                  #定义触发告警的条件，通过prometheus的语句
        min_over_time(node_timex_sync_status[5m]) == 0
      for: 10m                                 #定义告警从产生到发送的等待时间
      labels:                                  #标签定义，告警组件会通过标签进行分组
        severity: warning
```

配置对应到prometheus中的结果

**示例1**

```bash
- expr: |                          #Prometheus的查询语句
        count without (cpu) (
          count without (mode) (
            node_cpu_seconds_total{job="node-exporter"}
          )
        )
      record: instance:node_num_cpu:sum
#Prometheus的效果
record: instance:node_num_cpu:sum
expr: count
  without(cpu) (count without(mode) (node_cpu_seconds_total{job="node-exporter"}))
```

**示例2**

```bash
- alert: NodeClockNotSynchronising         #告警规则名称
      annotations:                             #其他的信息定义
        message: Clock on {{ $labels.instance }} is not synchronising. Ensure NTP
          is configured on this host.          #告警信息定义
        runbook_url: https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-nodeclocknotsynchronising                      #这里填写说明
        summary: Clock not synchronising.
      expr: |                                  #定义触发告警的条件，通过prometheus的语句
        min_over_time(node_timex_sync_status[5m]) == 0
      for: 10m                                 #定义告警从产生到发送的等待时间
      labels:                                  #标签定义，告警组件会通过标签进行分组
        severity: warning
#prometheus的效果
alert: NodeClockNotSynchronising
expr: min_over_time(node_timex_sync_status[5m])
  == 0
for: 10m
labels:
  severity: warning
annotations:
  message: Clock on {{ $labels.instance }} is not synchronising. Ensure NTP is configured
    on this host.
  runbook_url: https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-nodeclocknotsynchronising
  summary: Clock not synchronising.
```

### 3.Alertmanager

Prometheus用`alerting`配置出现告警报告给那个Alertmanager告警组件。

示例文件如下：

```yaml
apiVersion: monitoring.coreos.com/v1  #api版本
kind: Alertmanager                    #资源类型
metadata:                             #元数据定义
  labels:
    alertmanager: main
  name: main
  namespace: monitoring
spec:
  image: 192.168.10.254:5000/prometheus/alertmanager:v0.20.0  #镜像
  nodeSelector:          
    kubernetes.io/os: linux
  replicas: 1             #副本数，多个副本会自动组成高可用集群
  securityContext:
    fsGroup: 2000
    runAsNonRoot: true
    runAsUser: 1000
  serviceAccountName: alertmanager-main  #绑定的sa资源名称
  version: v0.20.0
```

### 4.ServiceMonitor(重要)

ServiceMonitor主要用于配置Prometheus中的服务发现，用于采集Pod的监控指标，ServiceMonitor主要通过k8s中的service资源发现service后端Pod的IP地址进行采集指标数据。

示例文件如下：

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  labels:
    k8s-app: kubelet
  name: kubelet
  namespace: monitoring
spec:                                  #监控定义
  endpoints:                           #采集配置
  - honorLabels: true
    interval: 30s                      #指标数据采集间隔
    basicAuth:  #auth认证配置
      username:  #用户名
        name: node-auth  #secrets资源名称,需要与ServiceMonitor资源在一个命名空间
        key: username    #secrets里面的key名称
      password:  #密码，以下配置与key一致
        name: node-auth
        key: password
    bearerTokenSecret:  #配置token认证
      name: minio-token
      key: token
    tlsConfig:     #tls认证配置
      ca:
        secret:
          name: etcd-tls
          key: ca.pem
      cert:
        secret:
          name: etcd-tls
          key: etcd-client.pem
      keySecret:
        name: etcd-tls
        key: etcd-client-key.pem
    metricRelabelings:                 #相当于prometheus中的metric_relabel_configs配置，丢弃那些指标数据
    - action: drop
      regex: container_(network_tcp_usage_total|network_udp_usage_total|tasks_state|cpu_load_average_10s)
      sourceLabels:
      - __name__
    path: /metrics/cadvisor           #指标数据采集采集路径
    port: https-metrics               #需要配置为要采集的svc资源的port名称，必须对应
    relabelings:                      #相当于Prometheus中的relabel_configs配置
    - sourceLabels:
      - __metrics_path__
      targetLabel: metrics_path
    scheme: https                     #采集协议，一般是http
    tlsConfig:                        #如果有tls加密，需要配置
      insecureSkipVerify: true        #强制认证
  jobLabel: k8s-app
  namespaceSelector:                  #选择的目录svc的命名空间
    matchNames:
    - kube-system
  selector:                          #选择目标svc，标签选择器
    matchLabels:
      k8s-app: kubelet
```

## 4.3 ServiceMonitor使用详解

prometheus的指标数据采集的对象服务一般分为云原生与非云原生服务。

- **云原生服务**：默认会提供用于给Prometheus采集监控指标的api无需进行其他配置只需要打开监控指标功能即可，如kubelet，etcd，minio等都会默认提供监控指标采集api。
- **非云原生服务**：非云原生服务由于开发年代久远并没有提供给Prometheus采集监控指标的api，所以默认情况下Prometheus是无法采集这些服务的监控指标的。所以Prometheus引入了一个Exporter服务他会把服务的指标转换成Prometheus可以采集的指标数据供Prometheus进行采集。

**常见的Exporter如下**

| 类型      | Exporter                                                     |
| --------- | ------------------------------------------------------------ |
| 数据库    | MySQL Exporter, Redis Exporter, MongoDB Exporter, MSSQL Exporter |
| 硬件      | Apcupsd Exporter，IoT Edison Exporter， IPMI Exporter, Node Exporter |
| 消息队列  | Beanstalkd Exporter, Kafka Exporter, NSQ Exporter, RabbitMQ Exporter |
| 存储      | Ceph Exporter, Gluster Exporter, HDFS Exporter, ScaleIO Exporter |
| HTTP 服务 | Apache Exporter, HAProxy Exporter, Nginx Exporter            |
| API 服务  | AWS ECS Exporter， Docker Cloud Exporter, Docker Hub Exporter, GitHub Exporter |
| 日志      | Fluentd Exporter, Grok Exporter                              |
| 监控系统  | Collectd Exporter, Graphite Exporter, InfluxDB Exporter, Nagios Exporter, SNMP Exporter |
| 其它      | Blackbox Exporter, JIRA Exporter, Jenkins Exporter， Confluence Exporter |

当然除了这些，还可以去github找一些第三方开发的一些其他的Exporter。

**kube-prometheus采集监控指标流程图**

![云原生与非云原生监控流程](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/云原生与非云原生监控流程.png)

配置kube-prometheus的指标数据采集需要使用ServiceMonitor的CRD资源进行配置，云原生与非云原生的配置基本相同，但是非云原生应用需要配置相应的Exporter来提供监控指标，集群内部服务与外部服务的监控数据采集的ServiceMonitor配置也基本一致，但是如果是外部服务需要进行手动创建`service`与`endpoints`并且正确代理到相应的服务才可以使用ServiceMonitor采集外部的服务的监控指标。以上各种的监控采集下面都会进行示例演示。

### 1.非云原生服务监控指标采集

这里使用mysql服务进行模拟。

#### 集群内部

**创建mysql示例服务**

```yaml
apiVersion: apps/v1  
kind: Deployment     
metadata:            
  name: mysql 
  namespace: default
spec:               
  replicas: 3
  selector:          
    matchLabels:    
      app: mysql
  template:       
    metadata:
      labels:
        app: mysql
    spec:
      containers:
      - name: mysqld
        image: 192.168.10.254:5000/mysql:5.7.37
        env:
        - name: MYSQL_ROOT_PASSWORD
          value: '123456'
        ports:
        - name: mysql
          containerPort: 3306
          protocol: TCP
      - name: mysqld-exporter
        image: 192.168.10.254:5000/mysqld-exporter:latest
        env:
        - name: DATA_SOURCE_NAME
          value: 'root:123456@(127.0.0.1:3306)/'
        ports:
        - name: metrics
          containerPort: 9104
          protocol: TCP
---
apiVersion: v1    #由于mysql是直接部署到集群内部所以正常创建svc即可
kind: Service      
metadata:             
  name: mysql   
  namespace: default  
  labels:
    app: mysql
spec:             
  ports:           
  - name: mysql    
    port: 3306      
    protocol: TCP  
    targetPort: mysql
  - name: metrics         #由于mysql服务的Pod中部署了来个container，并且mysqld-exporter的指标端口默认为9104，所以这里需要写清楚
    port: 9104      
    protocol: TCP  
    targetPort: metrics
  type: ClusterIP 
  selector:       
    app: mysql
```

**创建ServiceMonitor资源**

在没有修改官方Prometheus部署示例文件的前提下，ServiceMonitor资源可以部署在任何命名空间Prometheus都可以读取到。

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  labels:
    app: mysql
  name: mysql
  namespace: default
spec:                                  
  endpoints:                           
  - honorLabels: true
    interval: 30s                      
    path: /metrics  #最重要的采集路径
    port: metrics   #端口必须与svc端口名称一致            
  jobLabel: mysql
  namespaceSelector:    #填写svc所在的命名空间               
    matchNames:
    - default
  selector:            #标签选择器填写svc的labels           
    matchLabels:
      app: mysql
```

#### 集群外部

集群外部的服务采用node_exporter进行模拟，这里不介绍如何部署node_exporter服务,开启认证

**使用k8s的service资源代理集群外部服务**

```yaml
apiVersion: v1   
kind: Service      
metadata:             
  name: node 
  namespace: default 
  labels:
    app: node
spec:             
  ports:           
  - name: node
    port: 9100
    protocol: TCP  
    targetPort: 9100
  type: ClusterIP 
---
apiVersion: v1    
kind: Endpoints   
metadata:         
  name: node    #名称，必须与service名称一致
  namespace: default
subsets:          #后端服务定义
- addresses:      #外部服务的IP地址
  - ip: 192.168.10.71
  ports:          #后端服务的端口定义
  - name: node #名称必须与service的端口定义一致
    port: 9100   #端口
    protocol: TCP #协议
#由于开启了auth认证所以需要创建认证信息
[20:36:42 root@node-1 ~]#cat env 
username=prometheus
password=123456
[20:36:48 root@node-1 ~]#kubectl create secret generic node-auth --from-env-file=env
```

**创建ServiceMonitor资源**

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  labels:
    app: node
  name: node
  namespace: default
spec:                                  
  endpoints:                           
  - honorLabels: true
    interval: 30s                      
    path: /metrics  #最重要的采集路径
    port: node  #端口必须与svc端口名称一致 
    basicAuth:  #auth认证配置
      username:  #用户名
        name: node-auth  #secrets资源名称,需要与ServiceMonitor资源在一个命名空间
        key: username    #secrets里面的key名称
      password:  #密码，以下配置与key一致
        name: node-auth
        key: password
  jobLabel: node
  namespaceSelector:    #填写svc所在的命名空间               
    matchNames:
    - default
  selector:            #标签选择器填写svc的labels           
    matchLabels:
      app: node
```

### 2.云原生服务监控指标采集

集群内部的服务用minio服务进行演示并且演示如何配置账户密码认证，集群外部服务使用etcd进行演示并且演示https认证如何配置。

#### 集群内部

集群内部采用minio服务进行模拟

**minio部署文件**

```yaml
apiVersion: apps/v1  
kind: Deployment     
metadata:            
  name: minio
  namespace: default
spec:               
  replicas: 1
  selector:          
    matchLabels:    
      app: minio
  template:       
    metadata:
      labels:
        app: minio
    spec:
      volume:
        - name: data 
          emptyDir: {} 
      containers:
      - name: minio
        image: 192.168.10.254:5000/bitnami/minio:latest
        args:
        - '/data' 
        - '--console-address :9001'
        env:
        - name: MINIO_ROOT_USER
          value: 'minio-user'
        - name: MINIO_ROOT_PASSWORD
          value: 'zz-123456'
        ports:
        - name: minio
          containerPort: 9000
          protocol: TCP
        - name: minio-web
          containerPort: 9001
          protocol: TCP
        volumeMounts:
        - name: data
          mountPath: /data
---
apiVersion: v1    #由于mysql是直接部署到集群内部所以正常创建svc即可
kind: Service      
metadata:             
  name: minio   
  namespace: default  
  labels:
    app: minio
spec:             
  ports:           
  - name: minio   
    port: 9000      
    protocol: TCP  
    targetPort: minio
  - name: minio-wen        #由于mysql服务的Pod中部署了来个container，并且mysqld-exporter的指标端口默认为9104，所以这里需要写清楚
    port: 9001     
    protocol: TCP  
    targetPort: minio-web
  type: ClusterIP 
  selector:       
    app: minio
#minio默认监控指标采集需要token进行认证，进入Pod获取token
I have no name!@minio-78584c5b47-j9x5q:/opt/bitnami/minio-client$ mc config host add minio http://127.0.0.1:9000 minio-user zz-123456 
Added `minio` successfully.
I have no name!@minio-78584c5b47-j9x5q:/opt/bitnami/minio-client$ mc admin prometheus generate minio 
scrape_configs:
- job_name: minio-job
  bearer_token: eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJleHAiOjQ4MDM0NTU4NTMsImlzcyI6InByb21ldGhldXMiLCJzdWIiOiJtaW5pby11c2VyIn0.UKn0Xe4esp4DpH1jOVGDVfCpB4Mk2ROWdjewkZ0HLXt__dfJ_lfIoYeNDtqqhpEePocMG7PAdKjuBHni9r_rxw
  metrics_path: /minio/v2/metrics/cluster
  scheme: http
  static_configs:
  - targets: ['127.0.0.1:9000']
#创建secret认证文件
[21:19:32 root@node-1 ~]#cat token 
token=eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJleHAiOjQ4MDM0NTU4NTMsImlzcyI6InByb21ldGhldXMiLCJzdWIiOiJtaW5pby11c2VyIn0.UKn0Xe4esp4DpH1jOVGDVfCpB4Mk2ROWdjewkZ0HLXt__dfJ_lfIoYeNDtqqhpEePocMG7PAdKjuBHni9r_rxw
[21:19:34 root@node-1 ~]#kubectl create secret generic minio-token --from-env-file=token 
secret/minio-token created
```

**创建ServiceMonitor资源**

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  labels:
    app: minio
  name: minio
  namespace: default
spec:                                  
  endpoints:                           
  - honorLabels: true
    interval: 30s                      
    path: /minio/v2/metrics/cluster  #最重要的采集路径
    port: minio  #端口必须与svc端口名称一致 
    bearerTokenSecret:  #配置token认证
      name: minio-token
      key: token
  jobLabel: minio
  namespaceSelector:    #填写svc所在的命名空间               
    matchNames:
    - default
  selector:            #标签选择器填写svc的labels           
    matchLabels:
      app: minio
```

#### 集群外部

集群外部采用k8s的etcd进行模拟，并且启用tls认证

**service创建文件**

```yaml
apiVersion: v1   
kind: Service      
metadata:             
  name: etcd
  namespace: default 
  labels:
    app: etcd
spec:             
  ports:           
  - name: etcd
    port: 2379
    protocol: TCP  
    targetPort: 2379
  type: ClusterIP 
---
apiVersion: v1    
kind: Endpoints   
metadata:         
  name: etcd    #名称，必须与service名称一致
  namespace: default
subsets:          #后端服务定义
- addresses:      #外部服务的IP地址
  - ip: 192.168.10.11
  ports:          #后端服务的端口定义
  - name: etcd #名称必须与service的端口定义一致
    port: 2379   #端口
    protocol: TCP #协议
#由于etcd是开启tls认证的所以需要创建tls认证资源
[21:33:10 root@node-1 etcd]#ls
ca.pem  etcd-client-key.pem  etcd-client.pem  etcd.config.yml  etcd-server-key.pem  etcd-server.pem
[21:33:11 root@node-1 etcd]#kubectl create secret generic etcd-tls --from-file=ca.pem --from-file=etcd-client-key.pem --from-file=etcd-client.pem
secret/etcd-tls created
```

**创建ServiceMonitor资源**

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  labels:
    app: etcd
  name: etcd
  namespace: default
spec:                                  
  endpoints:                           
  - honorLabels: true
    interval: 30s                      
    path: /metrics  
    port: etcd 
    scheme: https
    tlsConfig：
      ca:
        secret:
          name: etcd-tls
          key: ca.pem
      cert:
        secret:
          name: etcd-tls
          key: etcd-client.pem
      keySecret:
        name: etcd-tls
        key: etcd-client-key.pem
  jobLabel: etcd
  namespaceSelector:             
    matchNames:
    - default
  selector:                      
    matchLabels:
      app: etcd
```

## 4.4 prometheus的静态配置使用

有些资源的监控可能并不适合使用ServiceMonitor进行服务发现并且监控，如果黑盒监控等。

- 白盒监控：程序内部的一些指标，这类监控专注的点是原因，也就是一般为出现问题的根本，此类监控称为白盒监控，主要关注的是原因。
- 黑盒监控：监控关注的是现象，也就是正在发生的告警，比如某个网站突然慢了，或者是打不开了。此类告警是站在用户的角度看到的东西，比较关注现象，表示正在发生的问题，这类监控称为黑盒监控。

Prometheus如果要进行黑盒监控需要部署blackbox-exporter容器。kube-prometheus项目在0.7版本以后会自动进行安装，如果低于这个版本需要自行安装。

### 1.部署blackbox-exporter

```yaml
apiVersion: apps/v1  #API版本
kind: Deployment  
metadata:  
  labels: 
    app: blackox-exporter
  name: blackox-exporter
  namespace: monitor 
spec: 
  replicas: 1 
  selector: 
    matchLabels: 
      app: blackox-exporter  
  template: 
    metadata: 
      labels: 
        app: blackox-exporter 
    spec:  
      containers: 
      - name: blackox-exporter
        image: 192.168.10.254:5000/blackbox-exporter:latest
        ports:
        - name: http
          containerPort: 9115
          protocol: TCP
        resources:         
          limits:          
            memory: "50Mi" 
            cpu: "100m"    
          requests:       
            cpu: "100m"    
            memory: "50Mi" 
---
apiVersion: v1     
kind: Service      
metadata:             
  name: blackox-exporter  
  namespace: monitor 
spec:              
  ports:           
  - name: http  
    port: 9115    
    protocol: TCP  
    targetPort: http
  selector:        
    app: blackox-exporter
  type: ClusterIP
```

**进行测试**

```bash
[14:08:54 root@node-1 ~]#kubectl get svc -n monitoring blackox-exporter 
NAME               TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)    AGE
blackox-exporter   ClusterIP   172.20.30.125   <none>        9115/TCP   56s
#进行测试，Probe 是接口地址，target 是检测的目标，module 是使用哪个模块进行探测。
[14:11:55 root@node-1 ~]#curl "http://172.20.30.125:9115/probe?target=baidu.com&module=http_2xx" | tail -1
probe_success 1
```

### 2.开启prometheus的静态配置加载

需要修改Prometheus资源文件。

```yaml
apiVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata:
  labels:
    prometheus: k8s 
  name: k8s 
  namespace: monitoring
spec:
  alerting:
    alertmanagers:
    - name: alertmanager-main
      namespace: monitoring
      port: web 
  additionalScrapeConfigs:    #添加静态发现配置
    key: prometheus-additional.yaml  #secret的key名称
    name: additional-configs         #secret资源名称，secret资源必须与Prometheus部署在同一个命名空间
    optional: true   #是用secret资源
```

### 3.使用静态配置

blackox-exporter官方示例：https://github.com/prometheus/blackbox_exporter

**创建黑盒监控配置文件**

```yaml
[14:27:16 root@node-1 ~]#cat prometheus-additional.yaml
  - job_name: 'blackbox'
    metrics_path: /probe
    params:
      module: [http_2xx]
    static_configs:
      - targets:
        - https://zhangzhuo.ltd
        - https://baidu.com
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: blackox-exporter:9115
```

**创建静态配置的secret资源**

```bash
#创建secret资源
[14:27:19 root@node-1 ~]#kubectl create secret generic -n monitoring additional-configs --from-file=prometheus-additional.yaml 
secret/additional-configs created
#热更新secret资源
[14:32:33 root@node-1 ~]#kubectl create secret generic -n monitoring additional-configs --from-file=prometheus-additional.yaml --dry-run=client -oyaml | kubectl replace -f -
```

创建完成后即可在prometheus的web控制台看到自己静态添加的监控项，有可能需要等一会才会生效

# 五、Alertmanager告警

Alertmanager是一个独立的告警模块，接收Prometheus等客户端发来的警报，之后通过分组、删除重复等处理，并将它们通过路由发送给正确的接收器；告警方式可以按照不同的规则发送给不同的模块负责人，Alertmanager支持Email, Slack，等告警方式, 也可以通过webhook接入钉钉等国内IM工具。

## 5.1 Alertmanager配置详解

```yaml
# global块配置下的配置选项在本配置文件内的所有配置项下可见
global:
  # 在Alertmanager内管理的每一条告警均有两种状态: "resolved"或者"firing". 在altermanager首次发送告警通知后, 该告警会一直处于firing状态,设置resolve_timeout可以指定处于firing状态的告警间隔多长时间会被设置为resolved状态, 在设置为resolved状态的告警后,altermanager不会再发送firing的告警通知.
  resolve_timeout: 1h
  # 邮件告警配置
  smtp_smarthost: 'smtp.exmail.qq.com:25'
  smtp_from: 'zhangzhuo@xxx.com'
  smtp_auth_username: 'zhangzhuo@xxx.com'
  smtp_auth_password: 'DKxxx'
  # HipChat告警配置
  # hipchat_auth_token: '123456789'
  # hipchat_auth_url: 'https://hipchat.foobar.org/'
  # wechat
  wechat_api_url: 'https://qyapi.weixin.qq.com/cgi-bin/'
  wechat_api_secret: 'JJ'
  wechat_api_corp_id: 'ww'

  # 告警通知模板
templates:
- '/etc/alertmanager/config/*.tmpl'
# route: 根路由,该模块用于该根路由下的节点及子路由routes的定义. 子树节点如果不对相关配置进行配置，则默认会从父路由树继承该配置选项。每一条告警都要进入route，即要求配置选项group_by的值能够匹配到每一条告警的至少一个labelkey(即通过POST请求向altermanager服务接口所发送告警的labels项所携带的<labelname>)，告警进入到route后，将会根据子路由routes节点中的配置项match_re或者match来确定能进入该子路由节点的告警(由在match_re或者match下配置的labelkey: labelvalue是否为告警labels的子集决定，是的话则会进入该子路由节点，否则不能接收进入该子路由节点).
route:
  # 例如所有labelkey:labelvalue含cluster=A及altertname=LatencyHigh labelkey的告警都会被归入单一组中
  group_by: ['job', 'altername', 'cluster', 'service','severity']
  # 若一组新的告警产生，则会等group_wait后再发送通知，该功能主要用于当告警在很短时间内接连产生时，在group_wait内合并为单一的告警后再发送
  group_wait: 30s
  # 再次告警时间间隔
  group_interval: 5m
  # 如果一条告警通知已成功发送，且在间隔repeat_interval后，该告警仍然未被设置为resolved，则会再次发送该告警通知
  repeat_interval: 12h
  # 默认告警通知接收者，凡未被匹配进入各子路由节点的告警均被发送到此接收者
  receiver: 'wechat'
  # 上述route的配置会被传递给子路由节点，子路由节点进行重新配置才会被覆盖
  # 子路由树
  routes:
  # 该配置选项使用正则表达式来匹配告警的labels，以确定能否进入该子路由树
  # match_re和match均用于匹配labelkey为service,labelvalue分别为指定值的告警，被匹配到的告警会将通知发送到对应的receiver
  - match_re:
      service: ^(foo1|foo2|baz)$
    receiver: 'wechat'
    # 在带有service标签的告警同时有severity标签时，他可以有自己的子路由，同时具有severity != critical的告警则被发送给接收者team-ops-mails,对severity == critical的告警则被发送到对应的接收者即team-ops-pager
    routes:
    - match:
        severity: critical
      receiver: 'wechat'
  # 比如关于数据库服务的告警，如果子路由没有匹配到相应的owner标签，则都默认由team-DB-pager接收
  - match:
      service: database
    receiver: 'wechat'
  # 我们也可以先根据标签service:database将数据库服务告警过滤出来，然后进一步将所有同时带labelkey为database
  - match:
      severity: critical
    receiver: 'wechat'
# 抑制规则，当出现critical告警时 忽略warning
inhibit_rules:
- source_match:
    severity: 'critical'
  target_match:
    severity: 'warning'
  # Apply inhibition if the alertname is the same.
  #   equal: ['alertname', 'cluster', 'service']
  #
# 收件人配置
receivers:
- name: 'team-ops-mails'
  email_configs:
  - to: 'zhangzhuo@xxx.com'
- name: 'wechat'
  wechat_configs:
  - send_resolved: true
    corp_id: 'ww'
    api_secret: 'JJ'
    to_tag: '1'
    agent_id: '1000002'
    api_url: 'https://qyapi.weixin.qq.com/cgi-bin/'
    message: '{{ template "wechat.default.message" . }}'
#- name: 'team-X-pager'
#  email_configs:
#  - to: 'team-X+alerts-critical@example.org'
#  pagerduty_configs:
#  - service_key: <team-X-key>
#
#- name: 'team-Y-mails'
#  email_configs:
#  - to: 'team-Y+alerts@example.org'
#
#- name: 'team-Y-pager'
#  pagerduty_configs:
#  - service_key: <team-Y-key>
#
#- name: 'team-DB-pager'
#  pagerduty_configs:
#  - service_key: <team-DB-key>
#  
#- name: 'team-X-hipchat'
#  hipchat_configs:
#  - auth_token: <auth_token>
#    room_id: 85
#    message_format: html
#    notify: true
```

Alertmanager 的配置主要分为五大块：

- Global：全局配置，主要用来配置一些通用的配置，比如邮件通知的账号、密码、SMTP 服务器、微信告警等。Global 块配置下的配置选项在本配置文件内的所有配置项下可见，但是文件内其它位置的子配置可以覆盖 Global 配置；
- Templates：用于放置自定义模板的位置；
- Route：告警路由配置，用于告警信息的分组路由，可以将不同分组的告警发送给不 同的收件人。比如将数据库告警发送给 DBA，服务器告警发送给 OPS；
- Inhibit_rules：告警抑制，主要用于减少告警的次数，防止“告警轰炸”。比如某个宿主机宕机，可能会引起容器重建、漂移、服务不可用等一系列问题，如果每个异常均有告警，会一次性发送很多告警，造成告警轰炸，并且也会干扰定位问题的思路，所以可以使用告警抑制，屏蔽由宿主机宕机引来的其他问题，只发送宿主机宕机的消息可；
- Receivers：告警收件人配置，每个 receiver 都有一个名字，经过 route 分组并且路由 后需要指定一个 receiver，就是在此位置配置的。

了解完 Alertmanager 主要的配置块后，接下来需要对 Alertmanager 比较重要的Route进行单独讲解，其它配置会在实践中进行补充。

## 5.2 Alertmanager 路由规则

route配置：

```yaml
route:
  receiver: Default
  group_by:
  - namespace
  - job
  - alertname
  routes:
  - receiver: Watchdog
    match:
      alertname: Watchdog
  - receiver: Critical
    match:
      severity: critical
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 10m
```

- receiver：告警的通知目标，需要和 receivers 配置中 name 进行匹配。需要注意的是 route.routes 下也可以有 receiver 配置，优先级高于 route.receiver 配置的默认接收人，当告警没有匹配到子路由时，会使用 route.receiver 进行通知，比如上述配置中 的 Default；
- group_by：分组配置，值类型为列表。比如配置成['job', 'severity']，代表告警信息包含 job 和 severity 标签的会进行分组，且标签的 key 和 value 都相同才会被分到一组；
- continue：决定匹配到第一个路由后，是否继续后续匹配。默认为 false，即匹配到第一个子节点后停止继续匹配；
- match：一对一匹配规则，比如 match 配置的为 job: mysql，那么具有 job=mysql 的告警会进入该路由；
- match_re：和 match 类似，只不过是 match_re 是正则匹配；
- group_wait：告警通知等待，值类型为字符串。若一组新的告警产生，则会等 group_wait 后再发送通知，该功能主要用于当告警在很短时间内接连产生时，在 group_wait 内合并为单一的告警后再发送，防止告警过多，默认值 30s；
- group_interval：同一组告警通知后，如果有新的告警添加到该组中，再次发送告警通知的时间，默认值为 5m；
- repeat_interval：如果一条告警通知已成功发送，且在间隔 repeat_interval 后，该告警仍然未被设置为 resolved，则会再次发送该告警通知，默认值 4h。

## 5.3 邮件告警示例

如果使用的是kube-prometheus项目需要找到Alertmanager的secret配置文件资源进行修改。

添加邮箱配置

```bash
[16:45:58 root@node-1 manifests]#pwd
/root/kube-prometheus-release-0.5/manifests
[16:46:13 root@node-1 manifests]#cat alertmanager-secret.yaml
apiVersion: v1
data: {}
kind: Secret
metadata:
  name: alertmanager-main
  namespace: monitoring
stringData:
  alertmanager.yaml: |-
    "global":                        #需要在全局配置中添加
      "resolve_timeout": "5m"
      smtp_from: "zz1xxx@163.com"  #邮箱地址
      smtp_smarthost: "smtp.163.com:465"  #邮箱服务器地址
      smtp_hello: "163.com"
      smtp_auth_username: "zz1xxx@163.com" #邮箱地址
      smtp_auth_password: "GZXXXXXXX"  #授权码
      smtp_require_tls: false
```

之后更改默认通知为邮箱通知

```yaml
"receivers":
    - "name": "Default"
      "email_configs":
      - to: "zz1xxxx@163.com"
        send_resolved: true
```

- email_configs：代表使用邮件通知；
- to：收件人，此处为 notification@163.com，可以配置多个，逗号隔开；
- send_resolved：告警如果被解决是否发送解决通知。

## 5.4 企业微信告警示例

首先需要登录企业微信管理页面获取以下几项配置

```
企业ID: xxxx
部门id: xxx
应用Id: xxx
应用secret: xx
```

之后配置Alertmanager

```yaml
#全局配置  
    "global":
      "resolve_timeout": "5m"
      wechat_api_url: "https://qyapi.weixin.qq.com/cgi-bin/"   #无需修改
      wechat_api_corp_id: "xxxx"                 #企业id
#receivers配置
    "receivers":
    wechat_configs:
    - name: wechat-ops
      - send_resolved: true
        to_party: x  #分组编号
        to_user: '@all'
        agent_id: xxx   #应用id
        api_secret: "xxx"  #应用secret
```

## 5.5 自定义告警模板

### 1.模板文件示例

```bash
{{ define "wechat.default.message" }}
    {{- if gt (len .Alerts.Firing) 0 -}}
    {{- range $index, $alert := .Alerts -}}
    {{- if eq $index 0 }}
    ==========异常告警==========
    告警类型: {{ $alert.Labels.alertname }}
    告警级别: {{ $alert.Labels.severity }}
    告警详情: {{ $alert.Annotations.message }}{{ $alert.Annotations.description }};{{ $alert.Annotations.summary }}
    故障时间: {{ ($alert.StartsAt.Add 28800e9).Format "2006-01-02 15:04:05" }}
    {{- if gt (len $alert.Labels.instance) 0 }}
    实例信息: {{ $alert.Labels.instance }}
    {{- end }}
    {{- if gt (len $alert.Labels.namespace) 0 }}
    命名空间: {{ $alert.Labels.namespace }}
    {{- end }}
    {{- if gt (len $alert.Labels.node) 0 }}
    节点信息: {{ $alert.Labels.node }}
    {{- end }}
    {{- if gt (len $alert.Labels.pod) 0 }}
    实例名称: {{ $alert.Labels.pod }}
    {{- end }}
    ============END============
    {{- end }}
    {{- end }}
    {{- end }}
    {{- if gt (len .Alerts.Resolved) 0 -}}
    {{- range $index, $alert := .Alerts -}}
    {{- if eq $index 0 }}
    ==========异常恢复==========
    告警类型: {{ $alert.Labels.alertname }}
    告警级别: {{ $alert.Labels.severity }}
    告警详情: {{ $alert.Annotations.message }}{{ $alert.Annotations.description }};{{ $alert.Annotations.summary }}
    故障时间: {{ ($alert.StartsAt.Add 28800e9).Format "2006-01-02 15:04:05" }}
    恢复时间: {{ ($alert.EndsAt.Add 28800e9).Format "2006-01-02 15:04:05" }}
    {{- if gt (len $alert.Labels.instance) 0 }}
    实例信息: {{ $alert.Labels.instance }}
    {{- end }}
    {{- if gt (len $alert.Labels.namespace) 0 }}
    命名空间: {{ $alert.Labels.namespace }}
    {{- end }}
    {{- if gt (len $alert.Labels.node) 0 }}
    节点信息: {{ $alert.Labels.node }}
    {{- end }}
    {{- if gt (len $alert.Labels.pod) 0 }}
    实例名称: {{ $alert.Labels.pod }}
    {{- end }}
    ============END============
    {{- end }}
    {{- end }}
    {{- end }}
    {{- end }}
```

### 2.kube-prometheus添加告警模板

需要找到相应的alertmanager-secret.yaml添加一段新配置即可

```yaml
apiVersion: v1
data: {}
kind: Secret
metadata:
  name: alertmanager-main
  namespace: monitoring
stringData:
  wechat.tmpl: |-    #如果有多个模板可以写多个,后缀统一tmpl
    {{ define "wechat.default.message" }}
    ....
  alertmanager.yaml: |-
    "global":
      ...
    templates:
    - '/etc/alertmanager/config/*.tmpl'
    "inhibit_rules":
   ......
    - name: wechat-ops
      wechat_configs:
      - send_resolved: true
        to_party: xx
        to_user: '@all'
        agent_id: xxx
        api_secret: "xxxx"
        message: '{{ template "wechat.default.message" . }}'   #微信的通知的这里引用，只对微信通知生效
  ...
type: Opaque
```

**注意**：{{ template "wechat.default.message" . }}配置的 wechat.default.message，是模板文件 define 定义的名称：{{ define "wechat.default.message" . }}，并非文件名称。

**配置后告警模板如下**：

![image-20220417182821235](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20220417182821235.png)

## 5.6 Prometheus 告警规则rule

官方说明文档：https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/

配置文件如下：

```yaml
cat monitoring-prometheus-k8s-rules.yaml
groups:  #告警规则组
- name: example  #组名
  rules:   #具体告警配置
  - alert: HighRequestLatency  #名称
    expr: job:request_latency_seconds:mean5m{job="myjob"} > 0.5  #告警规则
    for: 10m   #持续多长时间发送告警规则
    labels:    #添加label可以用来在Alertmanager进行分组
      severity: page
    annotations:  #注释信息
      summary: High request latency
```

### 1.kube-prometheus中的PrometheusRule

示例yaml文件：

```yaml
[18:40:33 root@node-1 ~]#cat 1.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
 labels:
   app.kubernetes.io/component: exporter
   app.kubernetes.io/name: blackbox-exporter
   prometheus: k8s #这个必须,prometheus用这个发现rule规则
   role: alert-rules #这个必须,prometheus用这个发现rule规则
 name: blackbox 
 namespace: monitoring  #命名空间，必须创建到prometheus运行的命名空间否则无法发现
spec:     #以下为具体配置
 groups:  #组配置
 - name: blackbox-exporter #组名称  
   rules:   #rules配置
   - alert: DomainAccessDelayExceeds1s #告警规则名称
     annotations:   #注释信息配置
       description: 域名：{{ $labels.instance }} 探测延迟大于 1 秒，当前延迟为：{{ $value }}
       summary: 域名探测，访问延迟超过 1 秒
     expr: probe_duration_seconds > 1 #告警规则语句
     for: 10s   #持续多久进行告警
     labels:    #labels
       severity: warning
       type: blackbox
```

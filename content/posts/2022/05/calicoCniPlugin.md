---
title: "CNI插件之Calico"
date: 2022-05-01T20:09:40+08:00
lastmod: 2022-08-24T11:14:57+08:00
draft: false
description: "讲解 Calico 的组件与网络模型，完成 CNI 插件的部署和连通性验证。"
cover: "https://b3logfile.com/bing/20201016.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["Kubernetes"]
tags: ["kubernetes", "CNI", "Calico"]
toc: true
---
# 一、Calico基础介绍

**官方网站**：https://www.tigera.io/project-calico/

Calico 是一个 CNI 插件，为 Kubernetes 集群提供容器网络。它使用 Linux 原生工具来促进流量路由和执行网络策略。它还托管一个 BGP 守护进程，用于将路由分发到其他节点。Calico 的工具作为 DaemonSet 在 Kubernetes 集群上运行。这使管理员能够安装 Calico， `kubectl apply -f ${CALICO_MANIFESTS}.yaml`而无需设置额外的服务或基础设施。

**Calico部署建议**：

1.使用 Kubernetes 数据存储。
2.安装 Typha 以确保数据存储可扩展性。
3.对单个子网集群不使用封装。
4.对于多子网集群，在 CrossSubnet 模式下使用 IP-in-IP。
5.根据网络 MTU 和选择的路由模式配置 Calico MTU。
6.为能够增长到 50 个以上节点的集群添加全局路由反射器。
7.将 GlobalNetworkPolicy 用于集群范围的入口和出口规则。通过添加 namespace-scoped 来修改策略NetworkPolicy。

## 1.1 calico基础架构即组件介绍

calico在kubernetes中部署，有三种部署架构，他的架构模式取决于使用什么后端存放calico的数据，常见的一般为俩种分别是使用kubernetes api资源或直接使用etcd，但是官方推荐如果只部署到kubernetes使用kubernetes api即可，这样有利于管理calico的各种配置，他们会被定义为crd资源可以直接使用kubectl进行管理。如果直接使用etcd需要额外维护etcd集群，不推荐与Kubernetes集群共用一个etcd。

**calico各个组件介绍**：

- calico/node: 该agent作为Calico守护进程的一部分运行。它管理接口，路由和接点的状态报告及强制性策略。
- Calico Controller: Calico策略控制器。
- Typha：守护进程位于数据存储（例如 Kubernetes API 服务器）和许多Felix实例之间,来处理他们之间的请求。

## 1.2 calico-node

calico-node会在kubernetes的中以DaemonSet的方式在每个node节点进行运行主要实现俩个功能。

- 路由维护：维护node节点到自己运行的Pod的路由地址。
- 路由共享：基于每个node节点获取的地址池共享路由。

为了实现以上的两个功能，calico-node运行了两个进程

- Felix：calico的核心组件，运行在每个节点上。主要的功能有`接口管理`、`路由规则`、`ACL规则`和`状态报告`
  1. `接口管理`：Felix为内核编写一些接口信息，以便让内核能正确的处理主机endpoint的流量。特别是主机之间的ARP请求和处理ip转发。
  2. `路由规则`：Felix负责主机之间路由信息写到linux内核的FIB（Forwarding Information Base）转发信息库，保证数据包可以在主机之间相互转发。
  3. `ACL规则`：Felix负责将ACL策略写入到linux内核中，保证主机endpoint的为有效流量不能绕过calico的安全措施。
  4. `状态报告`：Felix负责提供关于网络健康状况的数据。特别是，它报告配置主机时出现的错误和问题。这些数据被写入etcd，使其对网络的其他组件和操作人员可见。
- BIRD ：BGP客户端，Calico在每个节点上的都会部署一个BGP客户端，它的作用是将Felix的路由信息读入内核，并通过BGP协议在集群中分发。当Felix将路由插入到Linux内核FIB中时，BGP客户端将获取这些路由并将它们分发到部署中的其他节点。这可以确保在部署时有效地路由流量。VXLAN封装不需要BGP可以选择关闭。默认为TCP协议端口为(179)。

![image.png](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/1628157709057-de14b54c-5ace-448d-a8fd-5a533cfa4a67.png)

## 1.3 Calico-Controller

Calico-Controller的主要作用为，负责识别Kubernetes对象中影响路由的变化。 控制器内部包含多个控制器，监视以下变化:

1. Network Policies：网络策略，被用作编写iptables来执行网络访问的能力
2. Pods：察Pod的变化，比如标签的变化
3. Namespaces：名称空间的变化
4. Service Accounts：SA设置Calico的配置文件
5. Nodes：通知节点路由变化

**控制器包括**

- policy-controller
- ns-controller
- sa-controller
- pod-controller
- node-controller

![image.png](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/1628157430259-0a6eadb2-628c-4e02-9402-258db51b971a.png)

## 1.4 Typha

Typha 守护进程位于数据存储（例如 Kubernetes API 服务器）和许多 Felix 实例之间。Typha 的主要目的是通过减少每个节点对数据存储的影响来增加规模。Felix和conf等服务连接到 Typha，而不是直接连接到数据存储，因为 Typha 代表其所有客户端维护单个数据存储连接。它缓存数据存储状态并删除重复事件，以便可以将它们分散到许多侦听器。来减少后端的存储负载。

如果您使用的是 Kubernetes API 数据存储区，如果您有超过 50 个 Kubernetes 节点，我们建议您使用 Typha。虽然Typha可以与etcd一起使用，但etcd v3已经针对处理许多客户端进行了优化，因此使用它是多余的，不推荐使用。

- 由于一个 Typha 实例可以支持数百个 Felix 实例，因此它大大减少了数据存储的负载。
- 由于 Typha 可以过滤掉与 Felix 无关的更新，因此也降低了 Felix 的 CPU 使用率。在大规模（超过 100 个节点）Kubernetes 集群中，这是必不可少的，因为 API 服务器生成的更新数量会随着节点数量的增加而增加。

![image.png](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/1628156868776-5e3e1b54-7daa-421a-9444-81613c7cf772.png)

# 二、Calico部署

kubernetes中部署calico官方分别提供了三种部署方式

1. calico-etcd: calico直接使用etcd作为后端数据存储，官方不建议将etcd数据库用于新安装。但是如果您将 Calico 作为 OpenStack 和 Kubernetes 的网络插件运行是可以这样运行的。
2. calico-typha: 使用 Kubernetes API 数据存储calico的数据，安装的kubernetes的node节点超过50个推荐使用，即使没有超过50也推荐使用。
3. calico：使用 Kubernetes API 数据存储calico的数据，安装的kubernetes的node节点未超过50个推荐使用，但是不推荐这样使用。

## 2.1 calico-etcd

calico的版本为v3.15

官方部署示例文件位置：https://docs.projectcalico.org/v3.15/manifests/calico-etcd.yaml

**下载示例文件并且修改**

这里只修改必要配置，其余保持默认

```yaml
---
# Source: calico/templates/calico-etcd-secrets.yaml
# The following contains k8s Secrets for use with a TLS enabled etcd cluster.
# For information on populating Secrets, see http://kubernetes.io/docs/user-guide/secrets/
apiVersion: v1
kind: Secret
type: Opaque
metadata:
  name: calico-etcd-secrets
  namespace: kube-system
data:
  # Populate the following with etcd TLS configuration if desired, but leave blank if
  # not using TLS for etcd.
  # The keys below should be uncommented and the values populated with the base64
  # encoded contents of each file that would be associated with the TLS data.
  # Example command for encoding a file contents: cat <file> | base64 -w 0
  etcd-key:              #etcd的证书私钥，需要使用base64进行编码(cat *.pem | base64 -w 0)
  etcd-cert:             #etcd的证书文件，需要使用base64进行编码(cat *.pem | base64 -w 0)
  etcd-ca:               #etcd的ca证书文件，需要使用base64进行编码(cat *.pem | base64 -w 0)
---
# Source: calico/templates/calico-config.yaml
# This ConfigMap is used to configure a self-hosted Calico installation.
kind: ConfigMap
apiVersion: v1
metadata:
  name: calico-config
  namespace: kube-system
data:
  # Configure this with the location of your etcd cluster.
  etcd_endpoints: "https://192.168.10.11:2379"       #etcd的访问地址多个可以使用,隔开
  # If you're using TLS enabled etcd uncomment the following.
  # You must also populate the Secret below with these files.
  etcd_ca: "/calico-secrets/etcd-ca"   # "/calico-secrets/etcd-ca"   按照提示填写即可
  etcd_cert: "/calico-secrets/etcd-cert" # "/calico-secrets/etcd-cert" 按照提示填写即可
  etcd_key: "/calico-secrets/etcd-key"  # "/calico-secrets/etcd-key" 按照提示填写即可
  # Typha is disabled.
  typha_service_name: "none"
  # Configure the backend to use.
  calico_backend: "bird"
  # Configure the MTU to use for workload interfaces and tunnels.
  # - If Wireguard is enabled, set to your network MTU - 60
  # - Otherwise, if VXLAN or BPF mode is enabled, set to your network MTU - 50
  # - Otherwise, if IPIP is enabled, set to your network MTU - 20
  # - Otherwise, if not using any encapsulation, set to your network MTU.
  veth_mtu: "1440"

  # The CNI network configuration to install on each node. The special
  # values in this config will be automatically populated.
  cni_network_config: |-
    {
      "name": "k8s-pod-network",
      "cniVersion": "0.3.1",
      "plugins": [
        {
          "type": "calico",
          "log_level": "info",
          "etcd_endpoints": "__ETCD_ENDPOINTS__",
          "etcd_key_file": "__ETCD_KEY_FILE__",
          "etcd_cert_file": "__ETCD_CERT_FILE__",
          "etcd_ca_cert_file": "__ETCD_CA_CERT_FILE__",
          "mtu": __CNI_MTU__,
          "ipam": {
              "type": "calico-ipam"
          },
          "policy": {
              "type": "k8s"
          },
          "kubernetes": {
              "kubeconfig": "__KUBECONFIG_FILEPATH__"
          }
        },
        {
          "type": "portmap",
          "snat": true,
          "capabilities": {"portMappings": true}
        },
        {
          "type": "bandwidth",
          "capabilities": {"bandwidth": true}
        }
      ]
    }

---
# Source: calico/templates/calico-kube-controllers-rbac.yaml

# Include a clusterrole for the kube-controllers component,
# and bind it to the calico-kube-controllers serviceaccount.
kind: ClusterRole
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: calico-kube-controllers
rules:
  # Pods are monitored for changing labels.
  # The node controller monitors Kubernetes nodes.
  # Namespace and serviceaccount labels are used for policy.
  - apiGroups: [""]
    resources:
      - pods
      - nodes
      - namespaces
      - serviceaccounts
    verbs:
      - watch
      - list
      - get
  # Watch for changes to Kubernetes NetworkPolicies.
  - apiGroups: ["networking.k8s.io"]
    resources:
      - networkpolicies
    verbs:
      - watch
      - list
---
kind: ClusterRoleBinding
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: calico-kube-controllers
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: calico-kube-controllers
subjects:
- kind: ServiceAccount
  name: calico-kube-controllers
  namespace: kube-system
---

---
# Source: calico/templates/calico-node-rbac.yaml
# Include a clusterrole for the calico-node DaemonSet,
# and bind it to the calico-node serviceaccount.
kind: ClusterRole
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: calico-node
rules:
  # The CNI plugin needs to get pods, nodes, and namespaces.
  - apiGroups: [""]
    resources:
      - pods
      - nodes
      - namespaces
    verbs:
      - get
  - apiGroups: [""]
    resources:
      - endpoints
      - services
    verbs:
      # Used to discover service IPs for advertisement.
      - watch
      - list
  # Pod CIDR auto-detection on kubeadm needs access to config maps.
  - apiGroups: [""]
    resources:
      - configmaps
    verbs:
      - get
  - apiGroups: [""]
    resources:
      - nodes/status
    verbs:
      # Needed for clearing NodeNetworkUnavailable flag.
      - patch

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: calico-node
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: calico-node
subjects:
- kind: ServiceAccount
  name: calico-node
  namespace: kube-system

---
# Source: calico/templates/calico-node.yaml
# This manifest installs the calico-node container, as well
# as the CNI plugins and network config on
# each master and worker node in a Kubernetes cluster.
kind: DaemonSet
apiVersion: apps/v1
metadata:
  name: calico-node
  namespace: kube-system
  labels:
    k8s-app: calico-node
spec:
  selector:
    matchLabels:
      k8s-app: calico-node
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
  template:
    metadata:
      labels:
        k8s-app: calico-node
    spec:
      nodeSelector:
        kubernetes.io/os: linux
      hostNetwork: true
      tolerations:
        # Make sure calico-node gets scheduled on all nodes.
        - effect: NoSchedule
          operator: Exists
        # Mark the pod as a critical add-on for rescheduling.
        - key: CriticalAddonsOnly
          operator: Exists
        - effect: NoExecute
          operator: Exists
      serviceAccountName: calico-node
      # Minimize downtime during a rolling upgrade or deletion; tell Kubernetes to do a "force
      # deletion": https://kubernetes.io/docs/concepts/workloads/pods/pod/#termination-of-pods.
      terminationGracePeriodSeconds: 0
      priorityClassName: system-node-critical
      initContainers:
        # This container installs the CNI binaries
        # and CNI network config file on each node.
        - name: install-cni
          image: calico/cni:v3.15.5
          command: ["/install-cni.sh"]
          env:
            # Name of the CNI config file to create.
            - name: CNI_CONF_NAME
              value: "10-calico.conflist"
            # The CNI network config to install on each node.
            - name: CNI_NETWORK_CONFIG
              valueFrom:
                configMapKeyRef:
                  name: calico-config
                  key: cni_network_config
            # The location of the etcd cluster.
            - name: ETCD_ENDPOINTS
              valueFrom:
                configMapKeyRef:
                  name: calico-config
                  key: etcd_endpoints
            # CNI MTU Config variable
            - name: CNI_MTU
              valueFrom:
                configMapKeyRef:
                  name: calico-config
                  key: veth_mtu
            # Prevents the container from sleeping forever.
            - name: SLEEP
              value: "false"
          volumeMounts:
            - mountPath: /host/opt/cni/bin
              name: cni-bin-dir
            - mountPath: /host/etc/cni/net.d
              name: cni-net-dir
            - mountPath: /calico-secrets
              name: etcd-certs
          securityContext:
            privileged: true
        # Adds a Flex Volume Driver that creates a per-pod Unix Domain Socket to allow Dikastes
        # to communicate with Felix over the Policy Sync API.
        - name: flexvol-driver
          image: calico/pod2daemon-flexvol:v3.15.5
          volumeMounts:
          - name: flexvol-driver-host
            mountPath: /host/driver
          securityContext:
            privileged: true
      containers:
        # Runs calico-node container on each Kubernetes node. This
        # container programs network policy and routes on each
        # host.
        - name: calico-node
          image: calico/node:v3.15.5
          env:
            # The location of the etcd cluster.
            - name: ETCD_ENDPOINTS   #etcd端点
              valueFrom:
                configMapKeyRef:
                  name: calico-config
                  key: etcd_endpoints
            # Location of the CA certificate for etcd.
            - name: ETCD_CA_CERT_FILE  #etcd的ca证书
              valueFrom:
                configMapKeyRef:
                  name: calico-config
                  key: etcd_ca
            # Location of the client key for etcd.
            - name: ETCD_KEY_FILE   #etcd的证书私钥
              valueFrom:
                configMapKeyRef:
                  name: calico-config
                  key: etcd_key
            # Location of the client certificate for etcd.
            - name: ETCD_CERT_FILE   #etcd证书文件
              valueFrom:
                configMapKeyRef:
                  name: calico-config
                  key: etcd_cert
            # Set noderef for node controller.
            - name: CALICO_K8S_NODE_REF  #进行注册节点的名称
              valueFrom:
                fieldRef:
                  fieldPath: spec.nodeName  #默认使用node节点的名称
            # Choose the backend to use.
            - name: CALICO_NETWORKING_BACKEND  #选择使用的后端
              valueFrom:
                configMapKeyRef:
                  name: calico-config
                  key: calico_backend
            # Cluster type to identify the deployment type
            - name: CLUSTER_TYPE  #Cluster类型来标识要使用的后端部署类型
              value: "k8s,bgp"
            # Auto-detect the BGP IP address.
            - name: IP  #进行BGP的IP地址，默认为自动检测，如果需要手动配置请修改
              value: "autodetect"
            # Enable IPIP  #开启IPIP，默认开启
            - name: CALICO_IPV4POOL_IPIP
              value: "Always"
            # Enable or Disable VXLAN on the default IP pool.
            - name: CALICO_IPV4POOL_VXLAN   #开启VXLAN，默认关闭
              value: "Never"
            # Set MTU for tunnel device used if ipip is enabled
            - name: FELIX_IPINIPMTU  #IPIP网络模式中MTU大小
              valueFrom:
                configMapKeyRef:
                  name: calico-config
                  key: veth_mtu
            # Set MTU for the VXLAN tunnel device.
            - name: FELIX_VXLANMTU   #VXLAN网络模式中MTU大小
              valueFrom:
                configMapKeyRef:
                  name: calico-config
                  key: veth_mtu
            # Set MTU for the Wireguard tunnel device.
            - name: FELIX_WIREGUARDMTU #Wireguard隧道设备的MTU大小
              valueFrom:
                configMapKeyRef:
                  name: calico-config
                  key: veth_mtu
            # The default IPv4 pool to create on startup if none exists. Pod IPs will be
            # chosen from this range. Changing this value after installation will have
            # no effect. This should fall within `--cluster-cidr`.
            - name: CALICO_IPV4POOL_CIDR           #这里需要取消注释，填写kubernetes的--cluster-cidr设置的值
              value: "172.30.0.0/16"
            #开启监控指标
            - name: FELIX_PROMETHEUSMETRICSENABLED  #这里开启prometheus数据采集的端口，默认端口为9091协议为http，无认证
              value: "true" 
            # Disable file logging so `kubectl logs` works.
            - name: CALICO_DISABLE_FILE_LOGGING   #开启日志
              value: "true"
            # Set Felix endpoint to host default action to ACCEPT.
            - name: FELIX_DEFAULTENDPOINTTOHOSTACTION  
              value: "ACCEPT"
            # Disable IPv6 on Kubernetes.
            - name: FELIX_IPV6SUPPORT   #启用ipv6,默认关闭
              value: "false"
            # Set Felix logging to "info"
            - name: FELIX_LOGSEVERITYSCREEN  #日志级别
              value: "info"
            - name: FELIX_HEALTHENABLED   
              value: "true"
          securityContext:
            privileged: true
          resources:
            requests:
              cpu: 250m
          livenessProbe:
            exec:
              command:
              - /bin/calico-node
              - -felix-live
              - -bird-live
            periodSeconds: 10
            initialDelaySeconds: 10
            failureThreshold: 6
          readinessProbe:
            exec:
              command:
              - /bin/calico-node
              - -felix-ready
              - -bird-ready
            periodSeconds: 10
          volumeMounts:
            - mountPath: /lib/modules
              name: lib-modules
              readOnly: true
            - mountPath: /run/xtables.lock
              name: xtables-lock
              readOnly: false
            - mountPath: /var/run/calico
              name: var-run-calico
              readOnly: false
            - mountPath: /var/lib/calico
              name: var-lib-calico
              readOnly: false
            - mountPath: /calico-secrets
              name: etcd-certs
            - name: policysync
              mountPath: /var/run/nodeagent
      volumes:
        # Used by calico-node.
        - name: lib-modules
          hostPath:
            path: /lib/modules
        - name: var-run-calico
          hostPath:
            path: /var/run/calico
        - name: var-lib-calico
          hostPath:
            path: /var/lib/calico
        - name: xtables-lock
          hostPath:
            path: /run/xtables.lock
            type: FileOrCreate
        # Used to install CNI.
        - name: cni-bin-dir
          hostPath:
            path: /opt/cni/bin
        - name: cni-net-dir
          hostPath:
            path: /etc/cni/net.d
        # Mount in the etcd TLS secrets with mode 400.
        # See https://kubernetes.io/docs/concepts/configuration/secret/
        - name: etcd-certs
          secret:
            secretName: calico-etcd-secrets
            defaultMode: 0400
        # Used to create per-pod Unix Domain Sockets
        - name: policysync
          hostPath:
            type: DirectoryOrCreate
            path: /var/run/nodeagent
        # Used to install Flex Volume Driver
        - name: flexvol-driver-host
          hostPath:
            type: DirectoryOrCreate
            path: /usr/libexec/kubernetes/kubelet-plugins/volume/exec/nodeagent~uds
---

apiVersion: v1
kind: ServiceAccount
metadata:
  name: calico-node
  namespace: kube-system

---
# Source: calico/templates/calico-kube-controllers.yaml
# See https://github.com/projectcalico/kube-controllers
apiVersion: apps/v1
kind: Deployment
metadata:
  name: calico-kube-controllers
  namespace: kube-system
  labels:
    k8s-app: calico-kube-controllers
spec:
  # The controllers can only have a single active instance.
  replicas: 1
  selector:
    matchLabels:
      k8s-app: calico-kube-controllers
  strategy:
    type: Recreate
  template:
    metadata:
      name: calico-kube-controllers
      namespace: kube-system
      labels:
        k8s-app: calico-kube-controllers
    spec:
      nodeSelector:
        kubernetes.io/os: linux
      tolerations:
        # Mark the pod as a critical add-on for rescheduling.
        - key: CriticalAddonsOnly
          operator: Exists
        - key: node-role.kubernetes.io/master
          effect: NoSchedule
      serviceAccountName: calico-kube-controllers
      priorityClassName: system-cluster-critical
      # The controllers must run in the host network namespace so that
      # it isn't governed by policy that would prevent it from working.
      hostNetwork: true
      containers:
        - name: calico-kube-controllers
          image: calico/kube-controllers:v3.15.5
          env:
            # The location of the etcd cluster.
            - name: ETCD_ENDPOINTS
              valueFrom:
                configMapKeyRef:
                  name: calico-config
                  key: etcd_endpoints
            # Location of the CA certificate for etcd.
            - name: ETCD_CA_CERT_FILE
              valueFrom:
                configMapKeyRef:
                  name: calico-config
                  key: etcd_ca
            # Location of the client key for etcd.
            - name: ETCD_KEY_FILE
              valueFrom:
                configMapKeyRef:
                  name: calico-config
                  key: etcd_key
            # Location of the client certificate for etcd.
            - name: ETCD_CERT_FILE
              valueFrom:
                configMapKeyRef:
                  name: calico-config
                  key: etcd_cert
            # Choose which controllers to run.
            - name: ENABLED_CONTROLLERS
              value: policy,namespace,serviceaccount,workloadendpoint,node
          volumeMounts:
            # Mount in the etcd TLS secrets.
            - mountPath: /calico-secrets
              name: etcd-certs
          readinessProbe:
            exec:
              command:
              - /usr/bin/check-status
              - -r
      volumes:
        # Mount in the etcd TLS secrets with mode 400.
        # See https://kubernetes.io/docs/concepts/configuration/secret/
        - name: etcd-certs
          secret:
            secretName: calico-etcd-secrets
            defaultMode: 0400

---

apiVersion: v1
kind: ServiceAccount
metadata:
  name: calico-kube-controllers
  namespace: kube-system

---
# Source: calico/templates/calico-typha.yaml

---
# Source: calico/templates/configure-canal.yaml

---
# Source: calico/templates/kdd-crds.yaml
```

**修改完毕后部署**

```bash
#部署
[21:46:59 root@nexus calico]#kubectl apply -f calico-etcd.yaml
#验证,都是run表示正常
[21:46:59 root@nexus calico]#kubectl get pod -n kube-system 
NAME                                       READY   STATUS    RESTARTS   AGE
calico-kube-controllers-78fc55d5f5-cmflk   1/1     Running   0          15m
calico-node-2dt6h                          1/1     Running   0          15m
calico-node-cnmnt                          1/1     Running   0          15m
calico-node-f2b76                          1/1     Running   0          15m
```

**验证etcd中calico数据**

calico的数据都存放在etcd的`/calico`的key下面，以下数据请勿进行手动修改，以防造成集群Pod网络中断。

```bash
[22:00:48 root@node-1 ~]#etcdctl get / --keys-only --prefix | grep calico
/calico/ipam/v2/assignment/ipv4/block/172.30.139.64-26
/calico/ipam/v2/assignment/ipv4/block/172.30.247.0-26
/calico/ipam/v2/assignment/ipv4/block/172.30.84.128-26
/calico/ipam/v2/handle/ipip-tunnel-addr-node-1
/calico/ipam/v2/handle/ipip-tunnel-addr-node-2
/calico/ipam/v2/handle/ipip-tunnel-addr-node-3
/calico/ipam/v2/host/node-1/ipv4/block/172.30.84.128-26
/calico/ipam/v2/host/node-2/ipv4/block/172.30.247.0-26
/calico/ipam/v2/host/node-3/ipv4/block/172.30.139.64-26
```

**部署calico的客户端工具calicoctl**

下载地址：https://github.com/projectcalico/calicoctl/releases

```bash
#使用etcd的部署方式配置如下，创建一个环境变量文件
[22:05:09 root@nexus calico]#cat /etc/profile.d/etcdctl.sh  
export ETCDCTL_API=3               #calico的v3版本使用的etcd的api为3默认
export ETCDCTL_ENDPOINTS=https://192.168.10.11:2379 #etcd的地址
export ETCDCTL_CACERT=/etc/etcd/ca.pem    #etcd的ca证书
export ETCDCTL_CERT=/etc/etcd/etcd-client.pem #etcd的证书
export ETCDCTL_KEY=/etc/etcd/etcd-client-key.pem #etcd的证书私钥
#生效
[22:05:11 root@nexus calico]#source /etc/profile.d/etcdctl.sh
```

**验证calicoctl工具**

```bash
#查看calico的所有节点信息
calicoctl get node -owide  
#查看calico的地址池
calicoctl get ipp -owide
#查看calico的节点状态，可以用来查看bgp的连接情况
calicoctl node status
#查看calico的imap插件详细信息
calicoctl ipam show
```

## 2.2 calico-typha

calico的版本为v3.15

官方部署示例文件位置：https://docs.projectcalico.org/v3.15/manifests/calico-typha.yaml

**下载文件修改配置**

```bash
#只需要修改一处
            # no effect. This should fall within `--cluster-cidr`.                                            
            - name: CALICO_IPV4POOL_CIDR  #取消注释
              value: "172.30.0.0/16"   #改为--cluster-cidr的值
```

**创建**

```bash
#创建
kubectl apply -f calico-typha.yaml 
#验证
[22:38:03 root@nexus calico]#kubectl get pod -A
NAMESPACE     NAME                                       READY   STATUS    RESTARTS   AGE
kube-system   calico-kube-controllers-7668947985-2fglk   1/1     Running   0          3m51s
kube-system   calico-node-l6zln                          1/1     Running   0          3m51s
kube-system   calico-node-vz9bz                          1/1     Running   0          3m51s
kube-system   calico-node-x9ls4                          1/1     Running   0          3m51s
kube-system   calico-typha-68ffc49d5c-xvx87              1/1     Running   0          3m51s
```

**配置客户端工具**

```bash
[22:40:48 root@node-1 ~]#cat /etc/calico/calicoctl.cfg 
apiVersion: projectcalico.org/v3
kind: CalicoAPIConfig
metadata:
spec:
  datastoreType: "kubernetes"
  kubeconfig: "/root/.kube/config"
#验证
[22:40:43 root@node-1 ~]#calicoctl get node -owide
NAME            ASN       IPV4               IPV6   
192.168.10.11   (64512)   192.168.10.11/24          
192.168.10.12   (64512)   192.168.10.12/24          
192.168.10.13   (64512)   192.168.10.13/24
```

**calico-typha安装完成后会创建一系列crd资源用来配置calico**

```bash
#地址池查看
kubectl get ippools
#节点地址池
kubectl get blockaffinities
#Pod端点查看
kubectl get ipamhandles
```

如果集群规模大于50个node节点推荐修改calico-typha的副本数量。

## 2.3 calico

calico的版本为v3.15，不推荐使用

官方部署示例文件位置：https://docs.projectcalico.org/v3.15/manifests/calico.yaml

**下载部署文件并且修改**

```bash
#只需要修改一处
            # no effect. This should fall within `--cluster-cidr`.                                            
            - name: CALICO_IPV4POOL_CIDR  #取消注释
              value: "172.30.0.0/16"   #改为--cluster-cidr的值
```

**创建**

```bash
#创建
kubectl apply -f calico-typha.yaml 
#验证
[22:38:03 root@nexus calico]#kubectl get pod -A
NAMESPACE     NAME                                       READY   STATUS    RESTARTS   AGE
kube-system   calico-kube-controllers-7668947985-2fglk   1/1     Running   0          3m51s
kube-system   calico-node-l6zln                          1/1     Running   0          3m51s
kube-system   calico-node-vz9bz                          1/1     Running   0          3m51s
kube-system   calico-node-x9ls4                          1/1     Running   0          3m51s
```

**配置客户端工具**

```bash
[22:40:48 root@node-1 ~]#cat /etc/calico/calicoctl.cfg 
apiVersion: projectcalico.org/v3
kind: CalicoAPIConfig
metadata:
spec:
  datastoreType: "kubernetes"
  kubeconfig: "/root/.kube/config"
#验证
[22:40:43 root@node-1 ~]#calicoctl get node -owide
NAME            ASN       IPV4               IPV6   
192.168.10.11   (64512)   192.168.10.11/24          
192.168.10.12   (64512)   192.168.10.12/24          
192.168.10.13   (64512)   192.168.10.13/24
```

# 三、Calico网络封装

以下实验都使用calico-typha进行操作使用版本为3.15.5：https://docs.projectcalico.org/archive/v3.15/manifests/calico-typha.yaml

Calico支持两种封装方式：VXLAN封装和IPIP封装。VXLAN在一些IPIP不支持的环境中得到支持(例如，Azure)。VXLAN的每个包的开销稍微高一些，因为报头更大，但除非您运行非常密集的网络工作负载，否则通常不会注意到这种差异。这两种封装之间的另一个小区别是Calico的VXLAN实现不使用BGP，而Calico的IPIP实现在Calico节点之间使用BGP。如果在单子网部署kubernetes，可以不使用任何封装。默认官方提供的封装方式为IPIP，如果需要修改请在部署calico之前就确定。

## 3.1 Pod NS到宿主机ROOT NS

三种封装模式Pod访问宿主机的的网络请求过程基本一致。以下是使用IPIP进行分析。

```bash
#Pod NS到ROOT NS
test-1 ping test-3  为   172.20.239.130  ping 172.20.239.131
#进入test-1 容器
[13:31:56 root@node-1 ~]#kubectl exec -it test-1 sh
kubectl exec [POD] [COMMAND] is DEPRECATED and will be removed in a future version. Use kubectl kubectl exec [POD] -- [COMMAND] instead.
/ # ifconfig 
eth0      Link encap:Ethernet  HWaddr DA:1C:CA:5B:E8:99   # MAC地址：DA:1C:CA:5B:E8:99 	
          inet addr:172.20.239.130  Bcast:0.0.0.0  Mask:255.255.255.255   #从这里看，为32位掩码的一个主机地址，则表示每个Pod获取到的地址相互之间都是一个独立的网络
          inet6 addr: fe80::d81c:caff:fe5b:e899/64 Scope:Link
          UP BROADCAST RUNNING MULTICAST  MTU:1440  Metric:1
          RX packets:0 errors:0 dropped:0 overruns:0 frame:0
          TX packets:11 errors:0 dropped:0 overruns:0 carrier:0
          collisions:0 txqueuelen:0 
          RX bytes:0 (0.0 B)  TX bytes:866 (866.0 B)
#所以如果一个Pod访问其他的Pod肯定是需要一个网关，通过网关进行不同网络的访问
/ # route -n
Kernel IP routing table
Destination     Gateway         Genmask         Flags Metric Ref    Use Iface
0.0.0.0         169.254.1.1     0.0.0.0         UG    0      0        0 eth0  #此时我们知道所有的数据报文从该Pod中出去，那么需要发送到169.254.1.1对应的下一跳
169.254.1.1     0.0.0.0         255.255.255.255 UH    0      0        0 eth0  
#因为从路由表中我们可以看到：我们需要构造一个完整的数据报文，需要一些必要的元素：
S_IP ：172.20.239.130       D_IP： $(test-2)
S_MAC：DA:1C:CA:5B:E8:99    D_AMC：$(169.254.1.1)
#这里可以看到、169.254.1.1，但是我们却在整个集群中找不到此地址，那我们如何才能解析到其对应的MAC地址呢，那我们又如何获取到获取相应的MAC地址呢？在calico启动的时候，会设置169.254.1.1作为一个默认的gateway给容器。Calico为了尽量避免干扰主机上的任何其他配置。Calico不是将网关地址添加到每个工作负载接口的主机端，而是在接口上设置proxy_arp标志。这使主机的行为像一个网关，响应arp为169.254.1.1，而不必实际分配IP地址给接口。此时涉及到Linux中的一个Proxy_ARP相关的概念，通过Proxy_ARP的配置，此时我们主机就可以扮演成一个网关，来回复169.254.1.1对应的MAC地址。calico 仅仅使用proxy_arp来解决mac地址解析问题。可保证所有的流量均需要走三层的路由来做解析。由于Linux内核无法提供一个稳定MAC地址，而Calico网络中使用ponint-to-point 去路由数据包，数据包并不涉及链路层，所以自然也是用不到相应的MAC地址，该MAC地址仅仅为了完成标准的TCP/IP协议栈封装数据报文。注意宿主机必须配置网关地址否则proxy_arp不会正常工作会导致Pod无法进行任何网络通信。

#验证容器网络接口是否开启proxy_arp
[13:39:56 root@node-3 ~]#cat /proc/sys/net/ipv4/conf/cali385152345a1/proxy_arp
1   #proxy_arp代理是启用状态
#容器在没有任何网络请求时查看arp
/ # arp  #查看arp列表为空
#ping自身node节点的IP
/ # ping 192.168.10.13
PING 192.168.10.13 (192.168.10.13): 56 data bytes
64 bytes from 192.168.10.13: seq=0 ttl=64 time=0.080 ms
[13:54:12 root@node-3 ~]#ip netns exec cni-ce8fd303-316e-b94a-d144-240c58862435 arp -n  #接口的arp
Address                  HWtype  HWaddress           Flags Mask            Iface
169.254.1.1              ether   ee:ee:ee:ee:ee:ee   C                     eth0
192.168.10.13            ether   ee:ee:ee:ee:ee:ee   C                     eth0
#pod请求报文到宿主机的网络空间就是通过arp代理获取MAC地址通过纯三层路由到达宿主机网络空间
```

## 3.2 黑洞路由

在每个node节点calico会创建一个黑洞路由，具体作用为一种辅助防止地址冲突的手段。

```bash
[18:33:02 root@node-1 ~]#route -n
Kernel IP routing table
Destination     Gateway         Genmask         Flags Metric Ref    Use Iface
0.0.0.0         192.168.10.2    0.0.0.0         UG    100    0        0 eth0
172.20.36.128   0.0.0.0         255.255.255.192 U     0      0        0 *
#CalicoIP地址的分配策略相关，具体表现为一个/26的IP Block 172.20.36.128/26分配给了A机器之后，在另外一台B机器上又出现了该IP Block内的一个IP 172.20.36.130，同时因为A机器上有该IP Block的blackhole路由blackhole 172.20.36.128/26 proto bird，所以导致A机器上所有的Pod访问172.20.36.130时因为黑洞路由原因会直接失败。一种辅助防止地址冲突的手段。
```

## 3.3 calico的IPIP封装

IP-in-IP是一种简单的封装形式，它使用外部IP头封装包，看起来就好像源和目标是主机而不是pods。因此，当主机接收到IP-in-IP包时，它将检查内部IP头以确定目标pod。这是Calico的默认路由方法。虽然这种路由方法比本机路由开销更大，但它在大多数环境中都可以工作，无需修改，特别是在跨多个子网的环境中。运行该模式时，报文结构如下图所示:

![image.png](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/1628160463039-d1cc6ab6-6df0-477d-96c4-5cd3d4b46a3a.png)

### 1.部署

**部署参数配置介绍**

calico的参数配置一般都在calico-node的Pod中以环境变量的方式进行配置。

```yaml
containers:
        - name: calico-node
          image: 192.168.10.254:5000/calico/node:v3.15.5
          env:
            - name: DATASTORE_TYPE
              value: "kubernetes"
            - name: FELIX_TYPHAK8SSERVICENAME
              valueFrom:
                configMapKeyRef:
                  name: calico-config
                  key: typha_service_name
            - name: WAIT_FOR_DATASTORE
              value: "true"
            - name: NODENAME
              valueFrom:
                fieldRef:
                  fieldPath: spec.nodeName
            - name: CALICO_NETWORKING_BACKEND
              valueFrom:
                configMapKeyRef:
                  name: calico-config
                  key: calico_backend
            - name: CLUSTER_TYPE
              value: "k8s,bgp"
            - name: IP
              value: "autodetect"
            - name: CALICO_IPV4POOL_IPIP     # IPIP模式设置
              value: "Always"                # IPIP模式设置的类型：Always，Never，CrossSubnet
            - name: CALICO_IPV4POOL_VXLAN    # VxLAN模式设置
              value: "Never"                 # VxLAN模式设置的类型：Always，Never，CrossSubnet  
            - name: CALICO_IPV4POOL_CIDR     # 集群Pod网络地址池
              value: "172.20.0.0/16"
```

**部署**

```bash
#部署calico-typha
[12:59:05 root@node-1 ~]#kubectl apply -f calico-typha.yml 
#配置calicoctl客户端
[13:03:20 root@node-1 ~]#cat /etc/calico/calicoctl.cfg
apiVersion: projectcalico.org/v3
kind: CalicoAPIConfig
metadata:
spec:
  datastoreType: "kubernetes"
  kubeconfig: "/root/.kube/config"
```

**验证**

```bash
1.检查状态
[13:00:34 root@node-1 ~]#kubectl get pod -n kube-system 
NAME                                       READY   STATUS    RESTARTS   AGE
calico-kube-controllers-7668947985-fl7jk   1/1     Running   0          46s
calico-node-2fjr5                          1/1     Running   0          46s
calico-node-74gld                          1/1     Running   0          47s
calico-node-gpwbt                          1/1     Running   0          46s
calico-typha-68ffc49d5c-qz746              1/1     Running   0          47s

2.查看默认模式（Calico默认模式为IPIP Mode)
[13:04:06 root@node-1 ~]#calicoctl get ippool -owide
NAME                  CIDR            NAT    IPIPMODE   VXLANMODE   DISABLED   SELECTOR   
default-ipv4-ippool   172.20.0.0/16   true   Always     Never       false      all() 

3.其实Calico提供了一个接口来配置其不同的Mode
[13:04:26 root@node-1 ~]#calicoctl get ippool default-ipv4-ippool -o yaml
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  creationTimestamp: "2022-04-30T05:00:48Z"
  name: default-ipv4-ippool
  resourceVersion: "10931"
  uid: fa5e8b55-f43b-4759-b967-3ae1a4c36f51
spec:
  blockSize: 26         # IP地址块的大小，，默认是26位，支持IPV4和IPV6
  cidr: 172.20.0.0/16   # IP地址的范围
  ipipMode: Always      # ipipMode模式，支持的由：1.Always(default mode) 2.Never 3.CrossSubnet
  natOutgoing: true     # SNAT（源地址映射）
  nodeSelector: all()   # 选中相应的节点，接受IPAM地址分配管理 
  vxlanMode: Never      # VxLAN 模式开关（IPIP和VxLAN模式只能同时存在一种模式）
```

- blockSize：该池使用的分配块的CIDR大小。块按需分配给主机，用于聚合路由。该值只能在创建池时设置。默认为26.地址池共有128个地址
- cidr：地址池
- ipipMode：IPIP设置
  - Always：（默认配置）表示启用IPIP封装模式与Vxlan只能选择其中的一种，所有的流量都会进行IPIP封装。
  - Never：不启用。
  - CrossSubnet：表示启用IPIP封装，但是如果k8s的node节点运行在不同的子网需启用这个模式。
- vxlanMode：VXLAN设置
  - Always：（默认配置）表示启用Vxlan封装模式与IPIP只能选择其中的一种，所有的流量都会进行VXLAN封装。
  - Never：不启用。
  - CrossSubnet：表示启用VXLAN封装，但是如果k8s的node节点运行在不同的子网需启用这个模式。
- natOutgoing：启用时，从此池中的Calico网络容器发送到此池之外的目的地的数据包将被伪装，默认启用。
- nodeSelector：那些节点从这个池分配地址，默认为all()表示所有节点。

相关配置官方文档：https://projectcalico.docs.tigera.io/archive/v3.15/reference/resources/ippool

### 2.网络通信原理

准备相应的测试Pod

```
[13:28:26 root@node-1 ~]#kubectl get pod -owide
NAME     READY   STATUS    RESTARTS   AGE   IP               NODE            NOMINATED NODE   READINESS GATES
test-1   1/1     Running   0          36s   172.20.239.130   192.168.10.13   <none>           <none>
test-2   1/1     Running   0          32s   172.20.36.129    192.168.10.11   <none>           <none>
test-3   1/1     Running   0          29s   172.20.239.131   192.168.10.13   <none>           <none>
test-4   1/1     Running   0          25s   172.20.253.66    192.168.10.12   <none>           <none>
```

**同节点同Pod通信**

```bash
# 采用container 模式
这个模式指定新创建的容器和已经存在的一个容器共享一个Network Namespace，而不是和宿主机共享。新创建的容器不会创建自己的网卡，配置自己的IP，而是和一个指定的容器共享IP、端口范围等。同样，两个容器除了网络方面，其他的如文件系统、进程列表等还是隔离的。[两个容器的进程可以通过 lo 网卡设备通信。]
```

**同节点不同Pod通信**

```bash
#从上一节的分析我们知道，数据包是如何从Pod中送到ROOT NS中。但是我们还需要解决的是从test-1 pod到test-3的pod的过程。
#查看pod地址
[13:28:26 root@node-1 ~]#kubectl get pod -owide
NAME     READY   STATUS    RESTARTS   AGE   IP               NODE            NOMINATED NODE   READINESS GATES
test-1   1/1     Running   0          36s   172.20.239.130   192.168.10.13   <none>           <none>
test-3   1/1     Running   0          29s   172.20.239.131   192.168.10.13   <none>           <none>
#查看宿主机路由
[13:54:38 root@node-3 ~]#route -n
Kernel IP routing table
Destination     Gateway         Genmask         Flags Metric Ref    Use Iface
0.0.0.0         192.168.10.2    0.0.0.0         UG    0      0        0 eth0
169.254.0.0     0.0.0.0         255.255.0.0     U     1002   0        0 eth0
172.20.36.128   192.168.10.11   255.255.255.192 UG    0      0        0 tunl0
172.20.239.128  0.0.0.0         255.255.255.192 U     0      0        0 *                # 黑洞路由
172.20.239.130  0.0.0.0         255.255.255.255 UH    0      0        0 cali385152345a1  # 目标test-2 pod
172.20.239.131  0.0.0.0         255.255.255.255 UH    0      0        0 cali385d36150d0  # 目标test-3 pod
172.20.253.64   192.168.10.12   255.255.255.192 UG    0      0        0 tunl0
192.168.10.0    0.0.0.0         255.255.255.0   U     0      0        0 eth0
# 注意我们的Pod地址都是32位的主机地址，也就意味着他们并不是属于同一个网段。这点很重要。
# 此时我们简化一下我们的网络拓扑：
              Pod(test-1)                                      Pod(test-2)
172.20.239.130/32   MAC：DA:1C:CA:5B:E8:99         IP：1172.20.239.131/32  MAC：36:C7:B9:81:CA:C6
                  |                                                     |
                   \                                                   /
                    \__________________    Router   __________________/                       
                                         |       |
                               169.254.1.1       169.254.1.1
                                         Proxy_ARP
# 此时Linux Host就扮演者一个Router的角色。那么问题就变成了路由上的两台主机的通信问题。
# 此时这里涉及到一个黑洞路由问题：以192.168.100.0/26为例说明：
#CalicoIP地址的分配策略相关，具体表现为一个/26的IP Block 192.168.100.0/26分配给了A机器之后，在另外一台B机器上又出现了该IP Block内的一个IP 192.168.100.10，同时因为A机器上有该IP Block的blackhole路由blackhole 192.168.100.0/26 proto bird，所以导致A机器上所有的Pod访问192.168.100.10时因为黑洞路由原因直接失败。一种辅助防止地址冲突的手段算是。
```

不同同节点Pod通信

```bash
[13:28:26 root@node-1 ~]#kubectl get pod -owide
NAME     READY   STATUS    RESTARTS   AGE   IP               NODE            NOMINATED NODE   READINESS GATES
test-1   1/1     Running   0          36s   172.20.239.130   192.168.10.13   <none>           <none>
test-2   1/1     Running   0          32s   172.20.36.129    192.168.10.11   <none>           <none>
#1.由上述叙述我们知道了数据包是如何从Pod中到达ROOT NS中，在这里我们就不做赘述。
#2.使用 172.20.239.130 ping 172.20.36.129,数据到达ROOT NS以后，我们查询路由表条目：
[13:54:38 root@node-3 ~]#route -n
Kernel IP routing table
Destination     Gateway         Genmask         Flags Metric Ref    Use Iface
0.0.0.0         192.168.10.2    0.0.0.0         UG    0      0        0 eth0
172.20.36.128   192.168.10.11   255.255.255.192 UG    0      0        0 tunl0  #通过D_IP，可以匹配到此条路由。非本地路由学习
#此时我们需要构造IP in IP 模式的数据包，我们需要知道：
Outer_S_IP       Outer_D_IP         Outer_S_MAC     Outer_D_MAC
Inner_S_IP       Inner_D_IP
#3.由路由条目我们知道，去往10.244.231.192/26网段的出接口是本端的tunl0接口：
[14:09:28 root@node-3 ~]#ip -d link show tunl0
5: tunl0@NONE: <NOARP,UP,LOWER_UP> mtu 1440 qdisc noqueue state UNKNOWN mode DEFAULT group default qlen 1000
    link/ipip 0.0.0.0 brd 0.0.0.0 promiscuity 0 
    ipip remote any local any ttl inherit nopmtudisc addrgenmode eui64 numtxqueues 1 numrxqueues 1 gso_max_size 65536 gso_max_segs 65535
我们查看tunl0网卡的信息，发现其实一个ipip设备。
所以原始数据包会被tunl0设备做一次加工，转换为RAW格式。
然后再ipip的内核模块下指导IP in IP封装。具体形式为：
Outer_MAC: ———————————————————————— 00:0c:29:9d:31:3a - 00:0c:29:23:f2:d1
Outer_IP:  ———————————————————————— 192.168.10.13       -     192.168.10.11
Inner_IP:  ———————————————————————— 172.20.239.130     -      172.20.36.129 
# 172.20.36.128/26 via 192.168.10.11 dev tunl0 proto bird onlink
关于非（）本地路由（）学习途径问题：
172.20.36.128   192.168.10.11   255.255.255.192 UG    0      0        0 tunl0  #通过D_IP，可以匹配到此条路由。非本地路由学习，此时我们需要弄清楚，我们IP in IP的Outer_D_IP问题，此时由BIRD学习维护。请注意：非本地路由学习需要解释其来源，因为默认情况下是无法动态学习除本身以外的路由信息

# 抓包分析
[14:16:02 root@node-1 ~]#kubectl exec -it test-1 -- ping 172.20.36.129 -c1
# 1.tunl0抓包：
[14:15:57 root@node-3 ~]#tcpdump  -ne -i tunl0
tcpdump: verbose output suppressed, use -v or -vv for full protocol decode
listening on tunl0, link-type RAW (Raw IP), capture size 262144 bytes
14:16:31.019734 ip: 172.20.239.130 > 172.20.36.129: ICMP echo request, id 62, seq 0, length 64
14:16:31.019992 ip: 172.20.36.129 > 172.20.239.130: ICMP echo reply, id 62, seq 0, length 64
```

![image-20220430143234583](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20220430143234583.png)

宿主机eth0抓包，会看到被IPIP封装的双IP头的报文

## 3.4 calico的VXLAN封装

VXLAN是一种特性丰富的封装形式，支持创建虚拟化的第二层网络。这是通过完全封装pod的以太网帧和添加一些特定于VXLAN的头部信息来实现的。VXLAN模式不需要BGP协议，适合BGP对等体被阻塞的环境。运行该模式时，报文结构如下图所示:
![image.png](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/1628160514832-2e03bf0d-38ad-40bb-8d89-0445bb77fbb4.png)

### 1.部署

默认情况下，Calico清单启用IP-in-IP封装。如果你在一个阻止IP-in-IP的网络上，比如Azure，你可能希望切换到Calico的VXLAN封装模式。要在安装时执行此操作。VXLAN的每个包的开销稍微高一些，因为报头更大，但除非您运行非常密集的网络工作负载，否则通常不会注意到这种差异。VXLAN模式是不需要BGP协议参与，但是IPIP是需要的。

**修改配置**

```bash
#首先由于VXLAN不需要bgp所以关闭bgp以及bgp的健康检查
  calico_backend: "bird"   #bird改为vxlan以禁用bgp
#关闭bgp健康检测
          livenessProbe:
            exec:
              command:
              - /bin/calico-node
              - -felix-live
#              - -bird-live           #注释
            periodSeconds: 10
            initialDelaySeconds: 10
            failureThreshold: 6
          readinessProbe:
            exec:
              command:
              - /bin/calico-node
              - -felix-ready
#              - -bird-ready       #注释

#配置calico-node参数
            - name: CALICO_IPV4POOL_IPIP
              value: "Never"    #关闭IPIP
            # Enable or Disable VXLAN on the default IP pool.
            - name: CALICO_IPV4POOL_VXLAN
              value: "Always"    #启用VXLAN
```

**部署**

```bash
[15:36:13 root@node-1 ~]#kubectl apply -f calico-typha.yml
#验证状态
[15:36:48 root@node-1 ~]#kubectl get pod -A
NAMESPACE     NAME                                       READY   STATUS        RESTARTS   AGE
kube-system   calico-kube-controllers-7668947985-8lwvn   1/1     Running       0          32s
kube-system   calico-node-99tfk                          1/1     Running       0          32s
kube-system   calico-node-svd4b                          1/1     Running       0          32s
kube-system   calico-node-xjgpc                          1/1     Running       0          32s
kube-system   calico-typha-68ffc49d5c-jb9p4              1/1     Running       0          32s
[15:38:45 root@node-1 ~]#calicoctl get ippool default-ipv4-ippool -o yaml 
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  creationTimestamp: "2022-04-30T07:38:23Z"
  name: default-ipv4-ippool
  resourceVersion: "38082"
  uid: e47939c9-b77f-4d96-9833-b3f760a13a35
spec:
  blockSize: 26         # IP地址块的大小，，默认是26位，支持IPV4和IPV6
  cidr: 172.20.0.0/16   # IP地址的范围
  ipipMode: Never       # ipipMode模式关闭
  natOutgoing: true     # SNAT（源地址映射）
  nodeSelector: all()   # 选中相应的节点，接受IPAM地址分配管理 
  vxlanMode: Always     #启用Vxlan
```

官方说明文档：https://projectcalico.docs.tigera.io/archive/v3.15/reference/resources/ippool

### 2.网络通信原理

**同节点Pod通信**

```bash
# 采用container 模式
这个模式指定新创建的容器和已经存在的一个容器共享一个Network Namespace，而不是和宿主机共享。新创建的容器不会创建自己的网卡，配置自己的IP，而是和一个指定的容器共享IP、端口范围等。同样，两个容器除了网络方面，其他的如文件系统、进程列表等还是隔离的。[两个容器的进程可以通过 lo 网卡设备通信。]
```

**同节点不同Pod通信**

```bash
与IPIP基本一致，使用proxy_arp进行Pod到宿主机的网络命名空间
由于calico-node会维护到本机运行Pod的所有路由所以宿主机会以路由器的方式转发各种请求
```

**不同同节点Pod通信**

```bash
[15:44:58 root@node-1 ~]#kubectl get pod  -owide
NAME     READY   STATUS    RESTARTS   AGE     IP               NODE            NOMINATED NODE   READINESS GATES
test-1   1/1     Running   0          3m45s   172.20.36.129    192.168.10.11   <none>           <none>
test-2   1/1     Running   0          3m42s   172.20.253.66    192.168.10.12   <none>           <none>
# 使用 172.20.36.129 ping 172.20.253.66 过程分析
# 1.由Pod到ROOT NS过程，在此不再赘述。
# 2.到达ROOT NS后实现跨节点通信过程分析
# 在test-1Pod所在节点上查看路由表信息
[15:48:05 root@node-1 ~]#route -n
Kernel IP routing table
Destination     Gateway         Genmask         Flags Metric Ref    Use Iface
0.0.0.0         192.168.10.2    0.0.0.0         UG    0      0        0 eth0
169.254.0.0     0.0.0.0         255.255.0.0     U     1002   0        0 eth0
172.20.36.129   0.0.0.0         255.255.255.255 UH    0      0        0 cali385152345a1
172.20.36.130   0.0.0.0         255.255.255.255 UH    0      0        0 cali385d36150d0
172.20.239.128  172.20.239.128  255.255.255.192 UG    0      0        0 vxlan.calico
172.20.253.64   172.20.253.64   255.255.255.192 UG    0      0        0 vxlan.calico  #此时发现172.20.253.66匹配到该条路由，且出接口是vxlan.calico
192.168.10.0    0.0.0.0         255.255.255.0   U     0      0        0 eth0
#而接口vxlan.calico为vxlan设备
[15:49:24 root@node-1 ~]#ip -d link show vxlan.calico
10: vxlan.calico: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1440 qdisc noqueue state UNKNOWN mode DEFAULT group default 
    link/ether 66:a1:60:b1:d9:6c brd ff:ff:ff:ff:ff:ff promiscuity 0 
    vxlan id 4096 local 192.168.10.11 dev eth0 srcport 0 0 dstport 4789 nolearning ageing 300 udpcsum noudp6zerocsumtx noudp6zerocsumrx addrgenmode eui64 numtxqueues 1 numrxqueues 1 gso_max_size 65536 gso_max_segs 65535
#在vxlan.calico抓包
[15:55:11 root@node-1 ~]#tcpdump -i vxlan.calico
tcpdump: verbose output suppressed, use -v or -vv for full protocol decode
listening on vxlan.calico, link-type EN10MB (Ethernet), capture size 262144 bytes
15:55:16.189532 IP 172.20.36.129 > 172.20.253.66: ICMP echo request, id 67, seq 0, length 64
15:55:16.189832 IP 172.20.253.66 > 172.20.36.129: ICMP echo reply, id 67, seq 0, length 64
```

![image-20220430155921264](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20220430155921264.png)

vxlan的报文信息。

## 3.5 calico不使用网络封装

本机路由不封装进出pods的数据包。因此，它是一种高性能的路由方法，因为您不会产生封装、解封装和更大报头大小的开销。但是不使用封装也需要bgp功能。它还简化了故障排除，因为分析网络流量不需要在包内部查找另一个包。运行该模式时，报文结构如下图所示。

![image.png](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/1628160281410-4c967ad3-9901-4422-975d-aff16483c13c.png)

### 1.部署

**修改配置**

```bash
#修改calico-node配置
#在官方示例文件的基础上，修改，关闭有所封装模式即可
            - name: CALICO_IPV4POOL_IPIP
              value: "Never"    
            - name: CALICO_IPV4POOL_VXLAN
              value: "Never"
```

**部署**

```bash
[16:11:31 root@node-1 ~]#kubectl apply -f calico-typha.yml
#验证
[16:11:43 root@node-1 ~]#kubectl get -n kube-system pod
NAME                                       READY   STATUS    RESTARTS   AGE
calico-kube-controllers-7668947985-54dwz   1/1     Running   0          4m14s
calico-node-6zsfv                          1/1     Running   0          4m14s
calico-node-f6qfj                          1/1     Running   0          4m14s
calico-node-wv77p                          1/1     Running   0          4m14s
calico-typha-68ffc49d5c-7kff4              1/1     Running   0          4m14s
[16:12:16 root@node-1 ~]#calicoctl get ippool default-ipv4-ippool -o yaml
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  creationTimestamp: "2022-04-30T08:07:37Z"
  name: default-ipv4-ippool
  resourceVersion: "43477"
  uid: 165db2e0-ac23-4394-b28c-53271a0c6fad
spec:
  blockSize: 26
  cidr: 172.20.0.0/16
  ipipMode: Never  #关闭
  natOutgoing: true
  nodeSelector: all()
  vxlanMode: Never #关闭
```

### 2.网络通信原理

**同节点Pod通信**

```bash
# 采用container 模式
这个模式指定新创建的容器和已经存在的一个容器共享一个Network Namespace，而不是和宿主机共享。新创建的容器不会创建自己的网卡，配置自己的IP，而是和一个指定的容器共享IP、端口范围等。同样，两个容器除了网络方面，其他的如文件系统、进程列表等还是隔离的。[两个容器的进程可以通过 lo 网卡设备通信。]
```

**同节点不同Pod通信**

```bash
与IPIP基本一致，使用proxy_arp进行Pod到宿主机的网络报文转发
```

**不同同节点Pod通信**

```bash
在Pod报文到达宿主机后，直接通过宿主机的网络端口进行报文的转发，不进行任何封装
```

![image-20220430161534935](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20220430161534935.png)

# 四、Calico之BGP路由反射器

## 4.1 BGP基础概念

边界网关协议BGP（Border Gateway Protocol）是一种实现自治系统AS（Autonomous System）之间的路由可达，并选择最佳路由的距离矢量路由协议。早期发布的三个版本分别是BGP-1、BGP-2和BGP-3，1994年开始使用BGP-4，2006年之后单播IPv4网络使用的版本是BGP-4，其他网络（如IPv6等）使用的版本是MP-BGP。MP-BGP是对BGP-4进行了扩展，来达到在不同网络中应用的目的，BGP-4原有的消息机制和路由机制并没有改变。MP-BGP在IPv6单播网络上的应用称为BGP4+，在IPv4组播网络上的应用称为MBGP（Multicast BGP）。

**目的**

- 为方便管理规模不断扩大的网络，网络被分成了不同的自治系统。1982年，外部网关协议EGP（Exterior Gateway Protocol）被用于实现在AS之间动态交换路由信息。但是EGP设计得比较简单，只发布网络可达的路由信息，而不对路由信息进行优选，同时也没有考虑环路避免等问题，很快就无法满足网络管理的要求。
- BGP是为取代最初的EGP而设计的另一种外部网关协议。不同于最初的EGP，BGP能够进行路由优选、避免路由环路、更高效率的传递路由和维护大量的路由信息。虽然BGP用在AS之间传递路由信息，但并非所有AS之间传递路由信息都要运行BGP。如数据中心上行到Internet的出口上，为了避免Internet海量路由对数据中心内部网络影响，设备采用静态路由代替BGP与外部网络通信。

**受益**

- BGP从多方面保证了网络的安全性、灵活性、稳定性、可靠性和高效性：
- BGP采用认证和GTSM的方式，保证了网络的安全性。
- BGP提供了丰富的路由策略，能够灵活的进行路由选路，并且能指导邻居按策略发布路由。
- BGP提供了路由聚合和路由衰减功能用于防止路由振荡，有效提高了网络的稳定性。
- BGP使用TCP作为其传输层协议（端口号为179），并支持BGP与BFD联动、BGP Tracking和BGP GR和NSR，提高了网络的可靠性。
- 在邻居数目多、路由量大且大多邻居有相同出口策略场景下，BGP用按组打包技术极大提高了BGP打包发包性能。

## 4.2 BGP RR

路由反射器RR（Route Reflector）：允许把从IBGP对等体学到的路由反射到其他IBGP对等体的BGP设备，类似OSPF网络中的DR。

客户机（Client）：与RR形成反射邻居关系的IBGP设备。在AS内部客户机只需要与RR直连。

非客户机（Non-Client）：既不是RR也不是客户机的IBGP设备。在AS内部非客户机与RR之间，以及所有的非客户机之间仍然必须建立全连接关系。

始发者（Originator）：在AS内部始发路由的设备。Originator_ID属性用于防止集群内产生路由环路。

集群（Cluster）：路由反射器及其客户机的集合。Cluster_List属性用于防止集群间产生路由环路。

**路由学习原理**

![image.png](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/1628513474891-1aa4f3ed-14b7-4e16-a7cf-832ec11bd09a.png)

**对以上三张图的解说**：

1.如果路由学习自非Client IBGP的对等体，则反射给所有Client。
理解：R2从R3学习到路由，由于水平分割的原理，所以它不会把路由通告给R5。

2.如果路由学习自Client，则反射给所有非Cilent的IBGP对等体，和除了自己以外的Client。

正常路由学习

3.如果路由学习自EBGP对等体，则发送给所有的Client和非Client对等体

正常路由学。BGP 的全连接，实现路由全部学习到。

## 4.3 calico 的BGP RR配置示例

calico的IPIP与不使用封装会使用到BGP进行组网，保证不同node节点的Pod互相通信，默认情况下calico所有的node节点都是以对等方式进行BGP的互相连接，如果集群node节点数量大于50以上这种方式会造成每个节点的BGP连接指数级增多，所以需要引入BGP RR即路由反射器。即一部分node与RR进行对等连接之后RR之间在进行对等连接，以减少默认模式下的node全对等连接。如果集群规模超过200个节点需要配置实际的底层网络集成BGP进行相关配置。这里的示例只是用calico进行实现路由反射。

这里介绍2种方式以实现RR架构如下

**方式一**：

![image-20220501164753293](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20220501164753293.png)

每个不是rr反射器的node与反射器进行对等连接，之后反射器在进行对等连接，即客户端不需要与每个node进行对等连接只需要与BGP反射器进行对等，反射器与反射器连接以实现反射器之间的互联。

**方式二**：

![image-20220501165451739](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20220501165451739.png)

每个AS中的node与自己AS中的反射器进行对等连接，之后再把不同的AS中的反射器进行对等连接，每个AS的反射器配置多个以实现反射器的高可用。

### 1.修改默认的BGP工作方式

```bash
#默认情况下calico的BGP为node节点全对等连接，即node-to-node
[15:28:21 root@node-1 ~]#calicoctl node status
Calico process is running.

IPv4 BGP status
+---------------+-------------------+-------+----------+-------------+
| PEER ADDRESS  |     PEER TYPE     | STATE |  SINCE   |    INFO     |
+---------------+-------------------+-------+----------+-------------+
| 192.168.10.12 | node-to-node mesh | up    | 07:27:42 | Established |
| 192.168.10.13 | node-to-node mesh | up    | 07:27:42 | Established |
| 192.168.10.14 | node-to-node mesh | up    | 07:27:55 | Established |
| 192.168.10.15 | node-to-node mesh | up    | 07:27:42 | Established |
| 192.168.10.16 | node-to-node mesh | up    | 07:27:42 | Established |
+---------------+-------------------+-------+----------+-------------+

IPv6 BGP status
No IPv6 peers found.
#首先禁用calico的默认对等连接，默认情况下没有这个配置，需创建
[15:36:01 root@node-1 ~]#cat BGPConfiguration.yml 
apiVersion: projectcalico.org/v3
kind: BGPConfiguration
metadata:
  name: default
spec:
  logSeverityScreen: Info
  nodeToNodeMeshEnabled: false  #关闭默认node对等连接	
  asNumber: 64512
#应用
[15:36:05 root@node-1 ~]#calicoctl apply -f BGPConfiguration.yml 
Successfully applied 1 'BGPConfiguration' resource(s)
#应用之后会立马生效
[15:37:08 root@node-1 ~]#calicoctl node status
Calico process is running.

IPv4 BGP status
No IPv4 peers found.

IPv6 BGP status
No IPv6 peers found.
#查看
[15:37:27 root@node-1 ~]#calicoctl get bgpconfig
NAME      LOGSEVERITY   MESHENABLED   ASNUMBER   
default   Info          false         64512
```

### 2.方式一模拟

![image-20220501165839128](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20220501165839128.png)

```bash
#在k8s中非常好实现这种方式的反射器，之需要定义相应的BGPPeer即可之后通过控制node节点的标签即可实现
#创建BGPPeer
[17:06:18 root@node-1 ~]#cat BGPPeer-rr.yml
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: rr-to-node
spec:
  # 规则1：普通 bgp node 与 rr 建立连接
  nodeSelector: "!has(calico-rr)" 
  peerSelector: has(calico-rr)
---
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: rr-to-rr
spec:
  # 规则2：route reflectors 之间也建立连接
  nodeSelector: has(calico-rr)
  peerSelector: has(calico-rr)
#应用
[17:15:41 root@node-1 ~]#calicoctl apply -f BGPPeer-rr.yml

#之后需要导出node1与node4的配置，进行修改
[17:17:09 root@node-1 ~]#calicoctl get node 192.168.10.11 -oyaml --export >11.yml
spec:
  bgp:
    ipv4Address: 192.168.10.11/24
    ipv4IPIPTunnelAddr: 172.20.36.128
    routeReflectorClusterID: 224.0.0.1    #要充当路由反射器的每个节点都必须有一个集群ID，通常是一个未使用的IPv4地址，如果多个路由反射器是高可用的他们的集群id应该一致，用于冗余和防环
  orchRefs:
  - nodeName: 192.168.10.11
    orchestrator: k8s 
status:
  podCIDRs:
  - ""
  - 172.20.4.0/24

#给node1与node4节点打标签
[17:22:59 root@node-1 ~]#kubectl label nodes 192.168.10.11 calico-rr=true
[17:22:59 root@node-1 ~]#kubectl label nodes 192.168.10.14 calico-rr=true

#之后在node2查看node对等状态
[17:14:51 root@node-2 ~]#calicoctl node status
Calico process is running.

IPv4 BGP status
+---------------+---------------+-------+----------+-------------+
| PEER ADDRESS  |   PEER TYPE   | STATE |  SINCE   |    INFO     |
+---------------+---------------+-------+----------+-------------+
| 192.168.10.11 | node specific | up    | 09:14:47 | Established |   #这里可以看到node2与node1和node4为对等状态
| 192.168.10.14 | node specific | up    | 09:23:12 | Established |
+---------------+---------------+-------+----------+-------------+

IPv6 BGP status
No IPv6 peers found.

#在node1或node4查看
[17:23:11 root@node-1 ~]#calicoctl node status
Calico process is running.

IPv4 BGP status
+---------------+---------------+-------+----------+-------------+
| PEER ADDRESS  |   PEER TYPE   | STATE |  SINCE   |    INFO     |
+---------------+---------------+-------+----------+-------------+
| 192.168.10.12 | node specific | up    | 09:14:48 | Established |   #node1和node4与没有calico-rr=true的节点都建立了对等连接
| 192.168.10.13 | node specific | up    | 09:14:48 | Established |
| 192.168.10.15 | node specific | up    | 09:14:50 | Established |
| 192.168.10.16 | node specific | up    | 09:14:48 | Established |
| 192.168.10.14 | node specific | up    | 09:23:02 | Established |
+---------------+---------------+-------+----------+-------------+

IPv6 BGP status
No IPv6 peers found.
```

### 3.方式二模拟

![image-20220501165451739](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20220501165451739.png)

```bash
[18:04:28 root@node-1 ~]#cat BGPPeer-rr.yml 
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: rr1-to-node
spec:
  nodeSelector:  calico-rr == 'rr1'
  peerSelector:  calico-group == 'rr1'
---
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: rr2-to-node
spec:
  nodeSelector:  calico-rr == 'rr2'
  peerSelector:  calico-group == 'rr2'
---
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: rr1-to-rr2
spec:
  nodeSelector: calico-group == 'rr1'
  peerSelector: calico-group == 'rr2'
#之后需要导出所有node的配置，进行修改，AS根据规划修改
#node1、node2、node3  AS为64512  
#node4、node5、node6  AS为64513
#node1的routeReflectorClusterID为224.0.0.1
#node4的routeReflectorClusterID为224.0.0.2
[17:17:09 root@node-1 ~]#calicoctl get node 192.168.10.11 -oyaml --export >11.yml
spec:
  bgp:
    asNumber: 64512      #根据规划修改
    ipv4Address: 192.168.10.11/24
    ipv4IPIPTunnelAddr: 172.20.36.128
    routeReflectorClusterID: 224.0.0.1    #路由反射器配置即可，要充当路由反射器的每个节点都必须有一个集群ID，通常是一个未使用的IPv4地址，如果多个路由反射器是高可用的他们的集群id应该一致，用于冗余和防环
  orchRefs:
  - nodeName: 192.168.10.11
    orchestrator: k8s 
status:
  podCIDRs:
  - ""
  - 172.20.4.0/24
#配置完成后使用calicoctl apply -f生效
#验证
[18:22:37 root@node-1 ~]#calicoctl get node -owide
NAME            ASN       IPV4               IPV6   
192.168.10.11   64512     192.168.10.11/24          
192.168.10.12   64512     192.168.10.12/24          
192.168.10.13   64512     192.168.10.13/24          
192.168.10.14   64513     192.168.10.14/24          
192.168.10.15   64513     192.168.10.15/24          
192.168.10.16   64513     192.168.10.16/24  
#给node1,node2,node3打标签 calico-rr=rr1
#给node4,node5,node6打标签 calico-rr=rr2
#给node1打标签calico-group=rr1
#给node4打标签calico-group=rr2
#验证label
[18:27:01 root@node-1 ~]#kubectl get node --show-labels 
NAME            STATUS   ROLES    AGE     VERSION    LABELS
192.168.10.11   Ready    <none>   5h35m   v1.18.20   calico-group=rr1,calico-rr=rr1  #这个表示为rr，如果还需要其他rr请设置calico-group=rr1
192.168.10.12   Ready    <none>   5h35m   v1.18.20   calico-rr=rr1
192.168.10.13   Ready    <none>   5h35m   v1.18.20   calico-rr=rr1
192.168.10.14   Ready    <none>   5h35m   v1.18.20   calico-group=rr2,calico-rr=rr2  #这个表示为rr，如果还需要其他rr请设置calico-group=rr2
192.168.10.15   Ready    <none>   5h35m   v1.18.20   calico-rr=rr2
192.168.10.16   Ready    <none>   5h35m   v1.18.20   calico-rr=rr2

#之后找一个任意一个节点查看路由
[18:18:35 root@node-1 ~]#route -n
Kernel IP routing table
Destination     Gateway         Genmask         Flags Metric Ref    Use Iface
0.0.0.0         192.168.10.2    0.0.0.0         UG    100    0        0 eth0
172.20.36.128   0.0.0.0         255.255.255.192 U     0      0        0 *
172.20.36.135   0.0.0.0         255.255.255.255 UH    0      0        0 calif42db2739f4
172.20.102.192  192.168.10.14   255.255.255.192 UG    0      0        0 tunl0   #在node1查看这里可以看到node4，node5，node6的路由都指向node4
172.20.217.64   192.168.10.14   255.255.255.192 UG    0      0        0 tunl0
172.20.221.128  192.168.10.14   255.255.255.192 UG    0      0        0 tunl0
172.20.239.128  192.168.10.13   255.255.255.192 UG    0      0        0 tunl0
172.20.253.64   192.168.10.12   255.255.255.192 UG    0      0        0 tunl0
192.168.10.0    0.0.0.0         255.255.255.0   U     100    0        0 eth0
[18:15:45 root@node-4 ~]#route -n
Kernel IP routing table
Destination     Gateway         Genmask         Flags Metric Ref    Use Iface
0.0.0.0         192.168.10.2    0.0.0.0         UG    100    0        0 eth0
10.88.0.0       0.0.0.0         255.255.0.0     U     0      0        0 cni0
172.20.36.128   192.168.10.11   255.255.255.192 UG    0      0        0 tunl0
172.20.102.192  0.0.0.0         255.255.255.192 U     0      0        0 *
172.20.102.193  0.0.0.0         255.255.255.255 UH    0      0        0 cali174da9a0f0c
172.20.102.202  0.0.0.0         255.255.255.255 UH    0      0        0 calia06ac292193
172.20.217.64   192.168.10.16   255.255.255.192 UG    0      0        0 tunl0
172.20.221.128  192.168.10.15   255.255.255.192 UG    0      0        0 tunl0
172.20.239.128  192.168.10.11   255.255.255.192 UG    0      0        0 tunl0  ##在node4查看这里可以看到node1，node2，node3的路由都指向node1
172.20.253.64   192.168.10.11   255.255.255.192 UG    0      0        0 tunl0
192.168.10.0    0.0.0.0         255.255.255.0   U     100    0        0 eth0
#这里为示例环境每个as的rr只有一个如果这个rr宕机  这个as中的所有节点就无法访问了所以一般情况下每个as的rr需要配置多个，即使一个rr宕机也不会影响整个as的访问
```

# 五、Calico相关资源详解

## 5.1 自定义calico/node

`calico/node`容器被部署到所有k8s节点（在 Kubernetes 上，由 DaemonSet），并运行三个内部守护进程

- Felix，在每个节点上运行并提供端点的 Calico 守护程序。
- BIRD，将路由信息分发到其他节点的 BGP 守护进程。
- confd，一个监视 Calico 数据存储的配置更改并更新 BIRD 配置文件的守护进程。

对于基于清单的安装，`calico/node`主要通过环境变量进行配置，通常在部署清单中设置。

### 1.配置默认IP池

Calico使用IP池来配置地址如何分配给pod，以及网络如何为某些地址集工作。您可以在此处查看IP池的完整架构。

**相关重要参数**

| 变量名称                   | 描述                                                         | 参数                                                         |
| :------------------------- | :----------------------------------------------------------- | :----------------------------------------------------------- |
| CALICO_IPV4POOL_CIDR       | 如果在启动时不存在 IPv4 池，则创建该池。                     | 192.168.0.0/16                                               |
| CALICO_IPV4POOL_BLOCK_SIZE | 用于在启动时创建的 IPv4 池的块大小。IPv4 的块大小应在 20-32（含）范围内 [默认值：`26`] | 整数默认26，一个地址块中有64个地址                           |
| CALICO_IPV4POOL_IPIP       | 用于在启动时创建的 IPv4 池的 IPIP 模式。如果设置为 , 以外的值`Never`，`CALICO_IPV4POOL_VXLAN`则不应设置。[默认值：`Always`] | Always、CrossSubnet、Never（“Off”也被接受为“Never”的同义词） |

### 2.配置BGP网络

Calico节点的BGP配置通常通过Node、BGPConfiguration和BGPPeer资源进行配置。`calico/node`还公开了一些选项以允许在这些对象上设置某些字段。

| 变量名称                | 描述                                                         | 参数   |
| :---------------------- | :----------------------------------------------------------- | :----- |
| NODENAME                | 此主机的唯一名称                                             | 字符串 |
| IP                      | 在启动时分配此主机或检测行为的 IPv4 地址。                   | IPv4   |
| IP_AUTODETECTION_METHOD | 用于自动检测此主机的 IPv4 地址的方法。这仅在自动检测 IPv4 地址时使用。 | 细绳   |

**IP自动检测**

- first-found：枚举所有接口 IP 地址并返回第一个有效接口上的第一个有效 IP 地址
- kubernetes-internal-ip：该方法将选择 Kubernetes 节点字段中列出的第一个内部IP地址`Status.Addresses`
- can-reach：该can-reach方法使用您的本地路由来确定将使用哪个IP地址到达提供的目的地。
- interface：法使用提供的接口正则表达式来枚举匹配接口并返回第一个匹配接口上的第一个IP地址

### 3.配置日志记录

| 变量名称                    | 描述                              | 参数                                                         |
| :-------------------------- | :-------------------------------- | :----------------------------------------------------------- |
| CALICO_DISABLE_FILE_LOGGING | 禁用记录日志到文件，默认为false   | false/true                                                   |
| CALICO_STARTUP_LOGLEVEL     | 输出的日志级别。[默认值：`ERROR`] | DEBUG、INFO、WARNING、ERROR、CRITICAL 或 NONE（不区分大小写） |

# 六、Calico其他

## 6.1 calico的MTU

官方文档：https://projectcalico.docs.tigera.io/networking/mtu

**作用**

- 通过在 Calico 中配置 MTU 以最适合您的底层网络，优化工作负载的网络性能。
- 增大 MTU 可以提高性能，减小 MTU 过高可以解决丢包和碎片问题。

大多数以太网的MTU为1500，所以如果选用不同的封装需要配置不同的MTU，在calico高版本中MTU会根据自己使用的封装方式自动生成。

- 使用 VXLAN，请将 MTU 大小配置为“物理网络 MTU 大小减 50。
- 使用IPIP，则将MTU大小配置为物理网络MTU大小减 20。
- 不适用封装，请设置MTU与物理网络MTU一致。

```bash
#查看当前的宿主机的MTU，以太网的物理网卡大多数mtu为1500
[18:51:27 root@node-1 ~]#ip link show
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast state UP mode DEFAULT group default qlen 1000
    link/ether 00:0c:29:23:f2:d1 brd ff:ff:ff:ff:ff:ff
#配置方式如下，需修改calico的configmap配置文件，veth_mtu字段
#IPIP配置
veth_mtu: "1480"
#VXLAN配置
veth_mtu: "1450"
#不封装
veth_mtu: "1500"

#修改完成后滚动更新calico-node
kubectl rollout restart daemonset calico-node -n kube-system
```

## 6.2 IP池详解

### 1.修改IP池默认大小

默认情况下，Calico 使用64个地址的IPAM块大小-/26用于IPv4,如果集群的node节点Pod数量大小超过了64个，就需要修改默认的的IPAM块大小，以适应node节点Pod数量限制.

- node配置Pod限制参数：maxPods

我这里改为25表示有128个地址的池

```bash
#首先创建一个零时池
[19:45:02 root@node-1 ~]#cat temporary-pool.yaml
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: temporary-pool
spec:
  cidr: 10.0.0.0/16
  ipipMode: Always
  natOutgoing: true
#禁用现有的池
calicoctl patch ippool default-ipv4-ippool -p '{"spec": {"disabled": true}}'
#从现有 IP 池中删除 pod
kubectl delete pod -A --all
#删除默认池
calicoctl delete ippool default-ipv4-ippool
#创建具有所需块大小的新 IP 池
cat ippools.yml
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: default-ipv4-ippool
spec:
  blockSize: 25
  cidr: 172.20.0.0/16
  ipipMode: Always
  natOutgoing: true
calicoctl apply -f ippools.yml
#禁用零时池
calicoctl patch ippool temporary-pool -p '{"spec": {"disabled": true}}'
#从零时池中删除 pod
kubectl delete pod -A --all
#通过运行以下命令验证您的 pod 和块大小是否正确
calicoctl ipam show --show-blocks
#没问题后删除零时池
calicoctl delete pool temporary-pool
```

### 2.为Pod使用固定的IP地址

您的calico必须启用calico IPAM才可以使用此功能，验证方式如下：

```bash
[root@k8s-master-01 ~]# cat /etc/cni/net.d/10-calico.conflist | grep ipam
      "ipam": {
          "type": "calico-ipam"
```

如果存在，则您正在使用 Calico IPAM。如果 IPAM 不是 Calico，或者 10-calico.conflist 文件不存在，则您无法在集群中使用这个功能。

使用`cni.projectcalico.org/ipAddrs`注释pod，将其设置为要分配的 IP 地址列表，括在括号中。例如

```bash
apiVersion: apps/v1
kind: Deployment
metadata:
  name: net-test
  namespace: default
spec:                
  strategy:  #更新策略必须改为重建，无法使用滚动更新
    type: Recreate  
  selector:         
    matchLabels:    
      app: net-test 
  template:
    metadata:
      labels:
        app: net-test
      annotations:
        "cni.projectcalico.org/ipAddrs": "[\"172.28.0.1\"]"  #固定Pod的IP
    spec:
      containers:
      - name: net-test
        image: 10.122.6.92:5000/alpine:net
```

### 3.限制Pod使用特定IP地址范围

`cni.projectcalico.org/ipv4pools`使用设置为 IP 池名称列表的键和/或值注释pod，IP地址池必须提前创建。

```yaml
cni.projectcalico.org/ipv4pools: '["pool-1", "pool-2"]'
```

## 6.3 用于Kubernetes特定配置

如果在IPVS模式下运行calico与kube-proxy，calico需要使用额外的iptables标记来存储每个本地calico的端点ID。

| 配置参数             | 环境变量                   | 描述                                                         | 架构                                            |
| :------------------- | :------------------------- | :----------------------------------------------------------- | :---------------------------------------------- |
| `KubeNodePortRanges` | `FELIX_KUBENODEPORTRANGES` | Felix 应视为 Kubernetes 节点端口的端口范围列表。仅当`kube-proxy`配置为使用 IPVS 模式时：Felix 假设到达这些端口之一的主机的流量最终将被转发，而不是被主机进程终止。[默认值：`30000:32767`] | `:`端口范围或单个端口的逗号分隔列表。 |

**配置示例**

```yaml
- name: CALICO_IPV4POOL_CIDR
              value: "172.28.0.0/14"
            - name: FELIX_KUBENODEPORTRANGES #环境变量
              value: "30000:45000"
```

## 6.4 修改calico默认node名称

默认情况下calico由以下方式确定node节点名称。

1. `NODENAME`环境变量中指定的值（如果已设置）。
2. 中指定的值`/var/lib/calico/nodename`（如果存在）。
3. `HOSTNAME`环境变量中指定的值（如果已设置）。
4. 操作系统返回的主机名，转换为小写。

一旦节点确定了它的名称，该值将被缓存以`/var/lib/calico/nodename`供将来使用。

以下把calico的node名称改为kubernetes节点IP地址。

```yaml
- name: NODENAME
              valueFrom:
                fieldRef:
                  fieldPath: status.hostIP
```

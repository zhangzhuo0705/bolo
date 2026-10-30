---
title: "k8s细颗粒度权限控制RBAC"
date: 2022-01-26T16:58:20+08:00
draft: false
description: "围绕 RBAC 的 Role、ClusterRole 与绑定关系，实现细粒度权限控制。"
cover: "https://b3logfile.com/bing/20190727.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["Kubernetes"]
tags: ["Kubernetes"]
toc: true
---
# 一、RBAC介绍

官方文档：https://kubernetes.io/zh/docs/reference/access-authn-authz/rbac/

基于角色（Role）的访问控制（RBAC）是一种基于组织中用户的角色来调节控制对 计算机或网络资源的访问的方法。RBAC 鉴权机制使用 `rbac.authorization.k8s.io` API 组来驱动鉴权决定，允许你通过 Kubernetes API 动态配置策略。要启用 RBAC，在启动api-server服务器时将 `--authorization-mode` 参数设置为一个逗号分隔的列表并确保其中包含 `RBAC`。

```bash
--authorization-mode=Example,RBAC
```

## 1.1 RBAC中的API对象

RBAC API 声明了四种 Kubernetes 对象：Role、ClusterRole、RoleBinding 和 ClusterRoleBinding。你可以像使用其他 Kubernetes 对象一样， 通过类似 `kubectl` 这类工具创建对象, 或修改对象。

### 1.Role 和 ClusterRole

RBAC 的 *Role* 或 *ClusterRole* 中包含一组代表相关权限的规则。 这些权限是纯粹累加的（不存在拒绝某操作的规则）。Role 总是用来在某个命名空间内设置访问权限；在你创建 Role 时，你必须指定该 Role 所属的名字空间。与之相对，ClusterRole 则是一个集群作用域的资源。这两种资源的名字不同（Role 和 ClusterRole）是因为 Kubernetes 对象要么是名字空间作用域的，要么是集群作用域的， 不可两者兼具。如果你希望在名字空间内定义角色，应该使用 Role； 如果你希望定义集群范围的角色，应该使用 ClusterRole。

**role示例**

```yaml
apiVersion: rbac.authorization.k8s.io/v1  #api版本
kind: Role                                #资源类型
metadata:                                 #源数据定义
  namespace: default                      #命名空间
  name: pod-reader                        #名称
rules:                                    #权限定义
- apiGroups: [""]                         #api组，可以使用kubectl  api-resources查看，不写表示匹配所有，大多数情况不写 
  resources: ["pods"]                     #资源类型
  verbs: ["get", "watch", "list"]         #可以进行的操作权限
- apiGroups: [""]
  resources: ["deployments"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
```

**ClusterRole示例**

因为 ClusterRole 属于集群范围，所以它也可以为没有命名空间限定(全局资源)设置权限，而role不可用，例如：

- 集群范围资源比如节点Node
- 非资源端点（比如 `/healthz`）

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  # "namespace" 被忽略，因为 ClusterRoles 不受名字空间限制
  name: secret-reader
rules:
- apiGroups: [""]
  # 在 HTTP 层面，用来访问 Secret 对象的资源的名称为 "secrets"
  resources: ["secrets"]
  verbs: ["get", "watch", "list"]
```

### 2.RoleBinding 和 ClusterRoleBinding

角色绑定（Role Binding）是将角色中定义的权限赋予一个或者一组用户。 它包含若干 **主体**（用户、组或服务账户）的列表和对这些主体所获得的角色的引用。 RoleBinding 在指定的名字空间中执行授权，而 ClusterRoleBinding 在集群范围执行授权。一个 RoleBinding 可以引用同一的名字空间中的任何 Role。 或者，一个 RoleBinding 可以引用某 ClusterRole 并将该 ClusterRole 绑定到 RoleBinding 所在的名字空间。 如果你希望将某 ClusterRole 绑定到集群中所有名字空间，你要使用 ClusterRoleBinding。

所绑定的权限是对整个集群生效还是只对某个命名空间生效取决于使用RoleBinding还是ClusterRoleBinding绑定权限。

**RoleBinding 示例**

```yaml
apiVersion: rbac.authorization.k8s.io/v1
# 此角色绑定允许 "jane" 读取 "default" 名字空间中的 Pods
kind: RoleBinding
metadata:
  name: read-pods
  namespace: default
subjects:
# 你可以指定不止一个“subject（主体）”
- kind: User
  name: jane # "name" 是区分大小写的
  apiGroup: rbac.authorization.k8s.io
roleRef:
  # "roleRef" 指定与某 Role 或 ClusterRole 的绑定关系
  kind: Role # 此字段必须是 Role 或 ClusterRole
  name: pod-reader     # 此字段必须与你要绑定的 Role 或 ClusterRole 的名称匹配
  apiGroup: rbac.authorization.k8s.io
```

**ClusterRoleBinding 示例**

```yaml
apiVersion: rbac.authorization.k8s.io/v1
# 此集群角色绑定允许 “manager” 组中的任何人访问任何名字空间中的 secrets
kind: ClusterRoleBinding
metadata:
  name: read-secrets-global
subjects:
- kind: Group
  name: manager # 'name' 是区分大小写的
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: secret-reader
  apiGroup: rbac.authorization.k8s.io
```

创建了绑定之后，你不能再修改绑定对象所引用的 Role 或 ClusterRole。 试图改变绑定对象的 `roleRef` 将导致合法性检查错误。 如果你想要改变现有绑定对象中 `roleRef` 字段的内容，必须删除重新创建绑定对象。

### 3.Role权限定义详解

不管是Role还是clusterrole中最重要的配置为`rules`下的配置，具体如下

- **apiGroups**：一般都是不写让自己进行匹配
- **resources**：用于指定对那些资源授权
- **verbs**：对指定的资源授权那些权限，也就是动作

resources中的资源除去一些特定的系统资源，有些资源其中还包括一些下级资源比如pods资源有许多常用的资源`pods/log`Pod日志，`pods/status`Pod状态，`pods/exec`是否可进入Pod控制台权限。只有授权过的资源会有权操作，没有设置的一律没有权限，资源也可以使用`*`进行全部资源匹配也可以匹配某一个资源下的所有资源`pods/*`。

verbs可以设置的权限常用的有查看类型的`get`、`list`、`watch`，创建修改类型`create`、`update`、`delete`、`patch`等。

## 1.2 对资源的引用

### 1.子资源权限

在 Kubernetes API 中，大多数资源都是使用对象名称的字符串表示来呈现与访问的。 例如，对于 Pod 应使用 "pods"。 RBAC 使用对应 API 端点的 URL 中呈现的名字来引用资源。 有一些 Kubernetes API 涉及 **子资源（subresource）**，例如 Pod 的日志。 对 Pod 日志的请求看起来像这样：

```bash
GET /api/v1/namespaces/{namespace}/pods/{name}/log
```

在这里，`pods` 对应名字空间作用域的 Pod 资源，而 `log` 是 `pods` 的子资源。 在 RBAC 角色表达子资源时，使用斜线（`/`）来分隔资源和子资源。 要允许某主体读取 `pods` 同时访问这些 Pod 的 `log` 子资源，你可以这么写：

```bash
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: default
  name: pod-and-pod-logs-reader
rules:
- apiGroups: [""]
  resources: ["pods", "pods/log"]
  verbs: ["get", "list"]
```

### 2.某些资源特定权限

对于某些请求，也可以通过 `resourceNames` 列表按名称引用资源。 在指定时，可以将请求限定为资源的单个实例。 下面的例子中限制可以 "get" 和 "update" 一个名为 `my-configmap` 的ConfigMap：

```bash
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: default
  name: configmap-updater
rules:
- apiGroups: [""]
  # 在 HTTP 层面，用来访问 ConfigMap 的资源的名称为 "configmaps"
  resources: ["configmaps"]
  resourceNames: ["my-configmap"]
  verbs: ["update", "get"]
```

**注意**：你不能使用资源名字来限制 `create` 或者 `deletecollection` 请求。 对于 `create` 请求而言，这是因为在鉴权时可能还不知道新对象的名字。 如果你使用 resourceName 来限制 `list` 或者 `watch` 请求， 客户端必须在它们的 `list` 或者 `watch` 请求里包含一个与指定的 resourceName 匹配的 `metadata.name` 字段选择器。 例如，`kubectl get configmaps --field-selector=metadata.name=my-configmap`

### 3.聚合的 ClusterRole

你可以将若干 ClusterRole **聚合（Aggregate）** 起来，形成一个复合的 ClusterRole。 某个控制器作为集群控制面的一部分会监视带有 `aggregationRule` 的 ClusterRole 对象集合。`aggregationRule` 为控制器定义一个标签 选择算符供后者匹配 应该组合到当前 ClusterRole 的 `roles` 字段中的 ClusterRole 对象。

聚合ClusterRole 的示例：

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: monitoring
aggregationRule:
  clusterRoleSelectors:
  - matchLabels:
      rbac.example.com/aggregate-to-monitoring: "true"
rules: [] # 控制面自动填充这里的规则
```

如果你创建一个与某个已存在的聚合 ClusterRole 的标签选择算符匹配的 ClusterRole， 这一变化会触发新的规则被添加到聚合 ClusterRole 的操作。 下面的例子中，通过创建一个标签同样为 `rbac.example.com/aggregate-to-monitoring: true` 的 ClusterRole，新的规则可被添加到 "monitoring" ClusterRole 中。

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: monitoring-endpoints
  labels:
    rbac.example.com/aggregate-to-monitoring: "true"
# 当你创建 "monitoring-endpoints" ClusterRole 时，
# 下面的规则会被添加到 "monitoring" ClusterRole 中
rules:
- apiGroups: [""]
  resources: ["services", "endpoints", "pods"]
  verbs: ["get", "list", "watch"]
```

验证

```yaml
[root@k8s RBAC]# kubectl get clusterrole test -oyaml
aggregationRule:
  clusterRoleSelectors:
  - matchLabels:
      rbac.example.com/aggregate-to-monitoring: "true"
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  annotations:
    kubectl.kubernetes.io/last-applied-configuration: |
      {"aggregationRule":{"clusterRoleSelectors":[{"matchLabels":{"rbac.example.com/aggregate-to-monitoring":"true"}}]},"apiVersion":"rbac.authorization.k8s.io/v1","kind":"ClusterRole","metadata":{"annotations":{},"name":"test"},"rules":[]}
  creationTimestamp: "2022-01-26T05:42:56Z"
  name: monitoring
  resourceVersion: "3689653"
  selfLink: /apis/rbac.authorization.k8s.io/v1/clusterroles/test
  uid: 65cbd29a-a8a4-4551-8867-95f17e1f6297
rules:
- apiGroups:
  - ""
  resources:
  - services
  - endpoints
  - pods
  verbs:
  - get
  - list
  - watch
```

## 1.3 serviceaccounts服务账号

k8s有了RBAC之后可以很好的控制k8s的集群权限，但是role与clusterrole需要授权给某个用户、组或者服务账号来使用，使用用户与组其实并不太方便，所以推荐使用服务账号。

**服务账号创建的示例文件**

```yaml
apiVersion: v1    #api版本
kind: ServiceAccount  #资源类型
metadata:
  name: zhang   #名称
  namespace: default #sa有命名空间隔离性
```

推荐直接使用命令创建

```bash
kubectl  create sa zhang -n riped
```

sa创建后会自动生成一个`secrets`资源类型为`kubernetes.io/service-account-token`,这个`secrets`中会携带一个token，这个token一般用来与kube-apiserver进行交互认证。

```bash
[root@k8s-master-1-kty-sc RBAC]# kubectl  get secrets  zhang-token-jxknr 
NAME                TYPE                                  DATA   AGE
zhang-token-jxknr   kubernetes.io/service-account-token   3      4m20s
[root@k8s-master-1-kty-sc RBAC]# kubectl  describe secrets zhang-token-jxknr 
Name:         zhang-token-jxknr
Namespace:    default
Labels:       <none>
Annotations:  kubernetes.io/service-account.name: zhang
              kubernetes.io/service-account.uid: bef2f5b9-b32a-4b1d-94a6-86ef7158da7d

Type:  kubernetes.io/service-account-token

Data
====
namespace:  7 bytes
token:      eyJhbGciOiJSUzI1NiIsImtpZCI6InVCV21jcG53QjBuRl8zNlBEbGhhWnNrbjlEU2FFc00xOEF2cFR4ejV6Nk0ifQ.eyJpc3MiOiJrdWJlcm5ldGVzL3NlcnZpY2VhY2NvdW50Iiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9uYW1lc3BhY2UiOiJkZWZhdWx0Iiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9zZWNyZXQubmFtZSI6InpoYW5nLXRva2VuLWp4a25yIiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9zZXJ2aWNlLWFjY291bnQubmFtZSI6InpoYW5nIiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9zZXJ2aWNlLWFjY291bnQudWlkIjoiYmVmMmY1YjktYjMyYS00YjFkLTk0YTYtODZlZjcxNThkYTdkIiwic3ViIjoic3lzdGVtOnNlcnZpY2VhY2NvdW50OmRlZmF1bHQ6emhhbmcifQ.GZ9_x3dYC-_FO0ZgjQBHGEkIt0MQH22hi7i2cnT9piujxLJm38Z58b-kQbwk96esSVCpOEScJ9n7B9TlEUpUcZE2_KG3JsQJE2VdbQAutknh5d5rjuuNsoQUs-Z5EH87r_plFB5_y-Q07Pph4DZvJH3v63A8Y7YgWeSGakbwC0T3pbqWmQIThhgN7d_mVHqqJVPHASQThzsZkLQiuC_hrLLaWnTQAzQbsqpFzh7zo5_BZ7AdZVdgZkeDxYIOCi4OGuLOJZpggYj33dS6gTItyEBef4efDSMs9FZls_jvouh-pr2e8uuuGceX14oA-vnQtG880x5xjhfuD7UdIFDuHA
ca.crt:     1363 bytes
```

### 1.如何使用RoleBinding 和 ClusterRoleBinding给sa绑定权限

**示例文件**

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: zhang
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
- kind: ServiceAccount
  name: zhang
  namespace: default
```

**使用命令绑定**

```bash
kubectl create clusterrolebinding zhang --clusterrole=cluster-admin --serviceaccount=default:zhang
kubectl create rolebinding zhang --clusterrole=cluster-admin --serviceaccount=riped:zhang -n engage

--serviceaccount   #格式为<namespace>:<serviceaccountname>
```

# 二、RBAC演示

在实际环境中推荐创建一个专门用于存放用户认证的serviceaccount的命名空间，所有的服务账号创建到这个命名空间方便之后的管理，按照公司的实际情况设计并创建一些符合自己的通用权限(也就是创建clusterrole)，这里推荐使用clusterrole。之后根据情况使用clusterrolebinding 或者rolebinding进行权限的绑定。

## 2.1 创建命名空间

```bash
kubectl get user
```

## 2.2 创建通用的role

创建一个查看namespaces资源并且可以查看Pod资源的role，但是没有Pod下级资源的权限。

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: namespace-readonly
rules:
- apiGroups: [""]
  resources: ["namespaces"]
  verbs: ["get","list","watch"]
```

创建一个允许删除Pod的role

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: pod-delete
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get","list","delete"]
```

创建一个可以进入Pod控制台的role

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: pod-exec
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get","list"]
- apiGroups: [""]
  resources: ["pods/exec"]
  verbs: ["create"]
```

创建一个可以查看Pod日志的role

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: pod-log
rules:
- apiGroups: [""]
  resources: ["pods","pods/log"]
  verbs: ["get","list","watch"]
```

## 2.3 创建一些服务账户

```bash
kubectl create sa zhang-log -n user 

kubectl create sa zhang-exec -n user 

kubectl create sa zhang-delete -n user
```

## 2.4 权限绑定

创建clusterrolebinding绑定全局权限，绑定后可以对所有命名空间相应的资源进行操作

```bash
kubectl create clusterrolebinding zhang-log-1 --clusterrole=pod-log --serviceaccount=user:zhang-log

#创建这个权限后zhang-log的服务账户就可以查看你集群的Pod的日志，但是这个服务账户并不能进行命名空间的查看，可以使用token登录dashboard进行测试，可以创建多个绑定绑定多个role，权限会一起生效
kubectl create clusterrolebinding zhang-log-2 --clusterrole=pod-log --serviceaccount=user:zhang-log
```

创建rolebinding绑定单个命名空间的权限，绑定后只会对创建绑定的命名空间的资源有效。

```bash
kubectl  create rolebinding zhang-exec-1 --clusterrole=pod-exec --serviceaccount=user:zhang-exec -n riped

#由于namespace是集群资源无法使用rolebinding绑定
kubectl create clusterrolebinding zhang-exec-2 --clusterrole=namespace-readonly --serviceaccount=user:zhang-exec 

#权限只对riped命名空间有效，自行dashboard测试，可以查看Pod资源并且可以进入Pod控制台
```

## 2.5 如果需要设置复杂的权限验证方法

验证权限可以直接使用postman今天验证，直接发送api请求的方式验证，认证方法使用token

![image-20220126164246076](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20220126164246076.png)

输入验证的api资源的url地址，常规写法为

```bash
/api/v1/namespaces/{命名空间名称}/{资源类型}
#这样可以请求到资源类型的列表，输出方式为json
/api/v1/namespaces/{命名空间名称}/{资源类型}/{资源名称}
#如果在加上具体的资源名称，可以显示详细的资源信息
/api/v1/namespaces/{命名空间名称}/{资源类型}/{资源名称}/{下级资源}
#加上下级资源可以验证是否有下级资源的权限
```

添加认证方式：Bearer Token，写入token的值

这样就可以点击请求进行测试，如果资源url地址没有填错且有权限，返回的状态码200，如果权限拒绝返回的状态码403，如下

![image-20220126164815278](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20220126164815278.png)

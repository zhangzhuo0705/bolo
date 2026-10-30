---
title: "kubectl备忘录"
date: 2023-05-29T16:58:51+08:00
draft: false
description: "整理 kubectl 的自动补全、认证文件、多集群上下文和插件管理用法。"
cover: "https://b3logfile.com/bing/20180612.jpg?imageView2/1/w/1280/h/720/interlace/1/q/100"
categories: ["Kubernetes"]
tags: ["kubernetes", "kubectl"]
toc: true
---
# 一、kubectl备忘录

## 1.1 kubectl的bash自动补全

在`bash`中设置当前`shell`的自动补全，需先安装`bash-completion`包否则会报错

```bash
#方法1：临时生效退出重新登录会失效
source <(kubectl completion bash)
#方法2：永久生效写入到/etc/profile文件中,这样会导致所有用户都会生效，如果只给一个用户生效请写到~/.bashrc文件中
echo 'source <(kubectl completion bash)' >>/etc/profile
```

您还可以为 `kubectl` 使用一个速记别名，该别名也可以与 completion 一起使用

```bash
cat ~/.bashrc
source <(kubectl completion bash)
alias k=kubectl    #别名
complete -F __start_kubectl k #设置completion

#执行命令如下
k get pod
```

## 1.2 kubectl认证文件

kubectl客户端工具与k8s集群通信，需要一个上下文配置文件，之后需要把这个配置文件拷贝到执行kubectl命令的用户家目录`~/.kube/config`或者，把配置文件写入到环境变量`KUBECONFIG`中。

**示例如下**：

```bash
#拷贝文件
[root@km1-81 ~]# ll ~/.kube/config 
-rw------- 1 root root 6255 Dec 14 10:54 /root/.kube/config
#设置变量，变量可以设置多个配置文件使用:隔开
export KUBECONFIG=~/.kube/config:~/.kube/config2
```

设置 `kubectl` 与哪个 Kubernetes 集群进行通信并修改配置信息。 上下文的切换一般在多kubernetes集群中使用同一个`kubectl`时，需要使用上下文切换所操作的集群。单个集群无需操作。

```bash
#显示kubeconfig上下文配置
kubectl config view
#显示上下文列表
kubectl config get-contexts
#展示当前所处的上下文
kubectl config current-context 
#设置默认上下文
kubectl config use-context my-cluster-name
```

## 1.3 使用配置文件管理多个集群

这里只演示证书以及sa的配置文件创建方法，用户名称密码认证方式官方不推荐使用。

```bash
#创建配置文件
touch kubeconfig
```

### 1.配置集群信息

一个配置文件可添加多个集群信息

```bash
#添加集群信息到配置文件
kubectl config --kubeconfig=<配置文件路径> set-cluster <集群名称> --server=<集群访问地址> --certificate-authority-data=<集群ca证书base64编码> 
#删除集群信息
kubectl config delete-cluster <集群名称> --kubeconfig <配置文件路径>
```

参数说明：

- --kubeconfig：选择修改的kubeconfig文件，不写默认找`~/.kube/config`
- --server：配置服务器访问连接信息
  - 集群ca信息配置，选择其中之一
    - --certificate-authority-data：配置集群ca证书base64编码，注意此参数可能在kubectl中提示不存在，可以使用--certificate-authority参数添加完成后手动修改文件内容为certificate-authority-data
      - 需要使用如下命令获取删除换行`base64 ca.pem | tr -d '\n'`
    - --certificate-authority：配置ca证书路径位置
    - --insecure-skip-tls-verify=false：跳过ssl认证，不安全
    - --proxy-url：配置代理

文件内容示例

```yml
apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: xxx
    server: https://127.0.0.1:6443
  name: kubernetes-dome
contexts: null
current-context: ""
kind: Config
preferences: {}
users: null
```

### 2.添加用户信息

一个配置文件可添加多个用户信息

```bash
#添加使用证书添加用户信息，需要事先准备客户端证书
kubectl config --kubeconfig=<配置文件路径> set-credentials <用户名称> --client-certificate=<客户端证书路径> --client-key=<客户端私钥路径>
#使用sa的token
kubectl config --kubeconfig=<配置文件路径> set-credentials <用户名称> --token=<sa的token值>
#删除用户信息
kubectl config --kubeconfig kubeconfig delete-user admin-test
```

参数说明：

- --client-certificate：客户端证书，可配置证书base64编码，需要自行获取以及手动修改配置文件client-certificate字段为client-certificate-data
- --client-key：客户端私钥，可配置证书base64编码，需要自行获取以及手动修改配置文件client-key字段为client-key-data
- --token：sa的token值，如果是高版本sa不会自动创建secret资源，需要以下操作
- ```bash
  kubectl apply -f - <<EOF
  apiVersion: v1
  kind: Secret
  metadata:
    name: 名称
    annotations:
      kubernetes.io/service-account.name: sa资源名称
  type: kubernetes.io/service-account-token
  EOF
  #获取token
  kubectl describe secrets 资源名称
  ```

文件示例

```yml
users:
- name: admin-dome
  user:
    token: xxx
- name: admin-test
  user:
    client-certificate: xxx
    client-key: xxx
```

### 3.设置上下文

上下文用来绑定集群信息与用户认证信息，达成认证的过程

```bash
#创建上下文信息
kubectl config --kubeconfig=<配置文件路径> set-context <上下文名称> --cluster=<集群名称> --namespace=<默认命名空间> --user=<用户名称>
#删除上下文
kubectl config --kubeconfig <配置文件路径> delete-context <上下文名称>
#查看上下文列表
kubectl config  get-contexts
#设置当前上下文
kubectl config --kubeconfig=<配置文件路径> use-context <上下文名称>
```

参数说明：

- --cluster：集群名称
- --namespace:命名空间，默认用户不填写命名空间所访问的命名空间，没有默认default
- --user：用户名称

文件示例：

```yml
contexts:
- context:
    cluster: kubernetes-demo
    namespace: xxx
    user: admin-demo
  name: demo
- context:
    cluster: kubernetes-test
    namespace: xxx
    user: admin-test
  name: test
current-context: test
```

## 1.4 kubectl查看资源配置文件的说明文档

kubernetes中有各种资源，创建这些资源需要创建yaml文件，不同的kubernetes版本，资源配置可能不太一样，所以需要查看官方的一些文档。

示例如下:

```bash
#查看Pod文档
kubectl explain pod.spec
```

注意：yaml配置文件以空格来区分上下级，所以查看某个配置时，需要用`.`来区别上下级。

## 1.5 kubectl创建资源

`kubectl`创建资源的命令有俩个分别是`apply`与`create`他们的区别分别是

- `apply`:一般使用`-f`参数指定yaml文件创建资源，如果这个资源已经存在，他会检查已有资源跟yaml文件中定义是否一致，不一致会进行更新，一致不对已有资源进行更改，没有则创建。
- `create`:可以直接使用命令创建资源(不推荐),也可以使用`-f`指定yaml文件，如果资源存在则不创建，不存在则创建。

**create的一些实用操作：**

生成资源模板文件，并不创建资源

```bash
#创建deploy
kubectl create deployment nginx-2 --image=10.122.6.81:5000/image/nginx:v1 --dry-run -oyaml
#创建svc
kubectl create service clusterip my-cs --tcp=5678:8080 --dry-run -oyaml

--dir-run   #不做创建操作
-oyaml      #输出为yaml文件

#如果不会写创建资源命令可以使用-h查看帮助，如
kubectl create deploy -h
kubectl create svc -h
....
```

## 1.6 kubectl删除资源

`kubectl`可以使用`delete`删除资源，可以使用`-f`参数指定yaml文件删除资源

```bash
#删除单个资源
kubectl delete deploy nginx
#使用yaml文件删除
kubectl delete -f nginx.yaml
#删除某个命名空间下某一个类型所有资源
kubectl delete pod -n cilium-demo --all
#删除便签匹配到的所有资源
kubectl delete pod -n kube-system -l app=nfs-client-provisioner
```

## 1.7 查看与查找资源

`kubectl`查看资源的命令有俩个分别是`get`、`describe`、`diff`区别为：

- `get`:一般为查看资源的列表，也可以使用`-o`参数把查找的资源输出为别的文件类型。
- `describe`:查看资源的详细信息，可以检查资源的运行事件帮助排错。
- `diff`：可以用来比较资源差异性，可以使用`-f`指定yaml文件。

**示例**：

```bash
#查找资源
kubectl get deployments.apps
#按标签查找资源
kubectl get deployments.apps -l app=redis
#一次查看多个指定的不通类型资源
kubectl get -n kube-system service/xx deployments.apps/xx
#查找一个资源并且输出为yaml文件
kubectl get deployments.apps  nginx -oyaml -A
#查看pv并且以容量排序
kubectl get pv --sort-by=spec.capacity.storage
#列出事件（Events），按时间戳排序
kubectl get events --sort-by=.metadata.creationTimestamp -A

-owide  #以列表方式查看更详细的信息
-oyaml  #以yaml文件格式输出
-A      #所有命名空间
--sort-by  #排序，以资源中定义的某些信息排序
--show-labels #显示资源的labels
-l          #显示匹配标签的资源

#查看一个资源的详细信息
kubectl describe nodes 10.122.6.75
```

## 1.8 与Pod进行交互

查看容器日志`log`

```bash
#追踪容器日志
kubectl logs nginx -c nginx  -f

#容器执行命令
kubectl exec nginx-1-84c69559fd-cxmhr -c centos -- ls

#进入Pod终端
kubectl exec -it nginx-1-84c69559fd-cxmhr -c centos bash

#在本地打开端口并转发到pod上，需要有socat命令
kubectl port-forward --address 0.0.0.0 nginx-1-84c69559fd-cxmhr 80:80

#显示给定 Pod 和其中容器的监控数据
kubectl top pod nginx --containers
```

## 1.9 格式化输出

要以特定格式将详细信息输出到终端窗口，将 `-o`（或者 `--output`）参数添加到支持的 `kubectl` 命令中。

**示例**

```bash
#输出集群中运行着的所有镜像
kubectl get pods -A -o=custom-columns='IMAGES:spec.containers[*].image'
#获取deploy的名称与副本数,单个
kubectl get deployment -A -o jsonpath='{.metadata.name}{"\t"}{.spec.replicas}{"\n"}'
#获取deploy的名称与副本数,列表
kubectl get deployment -A -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.replicas}{"\n"}'
```

jsonpath说明：

- {range .items[*]}：循环列表
- {"\t"}：制表符
- {"\n"}：换行

## 1.10 客户端授权检查

使用`kubectl auth `可检查当前客户端相关权限，使用方式如下

```bash
#列出一个用户在某个命名空间允许的操作
kubectl auth can-i --list --namespace default
#验证一个权限是否存在可指定命名空间，如果不指定为默认命名空间，如果指定--all-namespaces表示所有命名空间，delete为操作动作可以是其他
kubectl auth can-i delete pod
#以url方式
kubectl auth can-i get pod/log
```

## 1.11 patch更新api资源

patch可用来给更新api资源，如下为示例

```bash
#给deploy添加一个配置字段
kubectl patch deployment --type=json -p '[{"op": "add", "path": "/spec/template/spec/securityContext/runAsUser", "value": 0}]' -n cilium-demo deathstar 
#给deploy移除一个配置字段
kubectl patch deployment --type=json -p '[{"op": "remove", "path": "/spec/template/spec/securityContext/runAsGroup"}]' -n cilium-demo deathstar
#给deploy替换一个字段值
kubectl patch deployment --type=json -p='[{"op": "replace", "path": "/spec/template/spec/securityContext/runAsUser", "value": 1000 }]' -n cilium-demo deathstar
```

## 1.12 kubectl插件

需要把写好的shell脚本放置到linux系统的PATH变量的路径文件夹中，并且命名为kubectl-{name}，添加执行权限，首行声明`#!/bin/bash`如下：

```bash
[21:00:44 root@master01 ~]#ls /usr/local/sbin/
kubectl-backup  kubectl-update
#验证安装的扩展
[21:00:50 root@master01 ~]#kubectl plugin list
The following compatible plugins are available:
/usr/local/sbin/kubectl-backup
/usr/local/sbin/kubectl-update
#使用插件
kubectl backup
kubectl update
```

如果是下载的插件，也可以添加执行权限，放到执行路径即可

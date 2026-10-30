---
title: "kubernetes集群镜像"
date: 2023-06-07T09:40:36+08:00
draft: false
description: "说明 Kubernetes 的镜像拉取策略与并行拉取机制，优化节点镜像分发。"
cover: "https://b3logfile.com/bing/20171108.jpg?imageView2/1/w/1280/h/720/interlace/1/q/100"
categories: ["Kubernetes"]
tags: ["kubernetes"]
toc: true
---
# 一、kubernetes集群镜像相关内容

kubernetes中每个pod的运行都需要指定相关镜像，kubelet在收到创建pod的命令后会进行拉取相关的镜像，镜像的拉取有相应的拉取策略，如下

## 1.1 镜像拉取策略

pod中容器的`imagePullPolicy`和镜像的标签会影响kubelet尝试拉取（下载）指定的镜像。

以下列表包含了 `imagePullPolicy` 可以设置的值，以及这些值的效果：

- `IfNotPresent`
  
  只有当镜像在本地不存在时才会拉取。
- `Always`
  
  每当 kubelet 启动一个容器时，kubelet 会查询容器的镜像仓库， 将名称解析为一个镜像。 如果 kubelet 有一个容器镜像，并且对应的摘要已在本地缓存，kubelet 就会使用其缓存的镜像； 否则，kubelet 就会使用解析后的摘要拉取镜像，并使用该镜像来启动容器。
- `Never`
  
  Kubelet 不会尝试获取镜像。如果镜像已经以某种方式存在本地， kubelet 会尝试启动容器；否则，会启动失败。

### 默认镜像拉取策略

当你（或控制器）向 API 服务器提交一个新的 Pod 时，你的集群会在满足特定条件时设置 `imagePullPolicy` 字段：

- 如果你省略了 `imagePullPolicy` 字段，并且容器镜像的标签是 `:latest`， `imagePullPolicy` 会自动设置为 `Always`。
- 如果你省略了 `imagePullPolicy` 字段，并且没有指定容器镜像的标签， `imagePullPolicy` 会自动设置为 `Always`。
- 如果你省略了 `imagePullPolicy` 字段，并且为容器镜像指定了非 `:latest` 的标签， `imagePullPolicy` 就会自动设置为 `IfNotPresent`。

## 1.2 并行拉取镜像

### 串行和并行镜像拉取

默认情况下，kubelet以串行方式拉取镜像。 也就是说kubelet一次只向镜像服务发送一个镜像拉取请求。 其他镜像拉取请求必须等待，直到正在处理的那个请求完成。节点独立地做出镜像拉取的决策。即使你使用串行的镜像拉取，两个不同的节点也可以并行拉取相同的镜像。

如果你想启用并行镜像拉取，可以在kubelet配置中将字段`serializeImagePulls`设置为 false。

当`serializeImagePulls` 设置为 false 时，kubelet 会立即向镜像服务发送镜像拉取请求，多个镜像将同时被拉动。

启用并行镜像拉取时，请确保你的容器运行时的镜像服务可以处理并行镜像拉取。注意docker需要额外配置，请移步官方。

kubelet 从不代表一个 Pod 并行地拉取多个镜像。

例如，如果你有一个 Pod，它有一个初始容器和一个应用容器，那么这两个容器的镜像拉取将不会并行。 但是，如果你有两个使用不同镜像的 Pod，当启用并行镜像拉取时，kubelet 会代表两个不同的 Pod 并行拉取镜像。

注意：并行拉取镜像在一个节点如果同时创建的pod较多会极大的消耗节点带宽与网络io会影响集群其他正在运行pod的性能，谨慎配置。

### 最大并行镜像拉取数量

特性状态： `Kubernetes v1.27 [alpha]`，只有在1.27版本以上支持

当 `serializeImagePulls` 被设置为 false 时，kubelet 默认对同时拉取的最大镜像数量没有限制。 如果你想限制并行镜像拉取的数量，可以在 kubelet 配置中设置字段 `maxParallelImagePulls`。 当 `maxParallelImagePulls` 设置为 *n* 时，只能同时拉取 *n* 个镜像， 超过 *n* 的任何镜像都必须等到至少一个正在进行拉取的镜像拉取完成后，才能拉取。

当启用并行镜像拉取时，限制并行镜像拉取的数量可以防止镜像拉取消耗过多的网络带宽或磁盘 I/O。

你可以将 `maxParallelImagePulls` 设置为大于或等于 1 的正数。 如果将 `maxParallelImagePulls` 设置为大于等于 2，则必须将 `serializeImagePulls` 设置为 false。 kubelet 在无效的 `maxParallelImagePulls` 设置下会启动失败。

## 1.3 私有镜像仓库的镜像拉取

### 创建基于secret凭证的pod

首先获取认证文件创建secret

```bash
#登录
docker login 10.202.43.240:5000
#查看认证文件
cat ~/.docker/config.json 
{
	"auths": {
		"10.202.43.240:5000": {
			"auth": "YWRtaW46MTIzNDU2"
		}
	},
	"HttpHeaders": {
		"User-Agent": "Docker-Client/19.03.15 (linux)"
	}
}
#修改认证文件
{
  "auths": {
    "10.202.43.240:5000": {
      "auth": "YWRtaW46MTIzNDU2"
    }
  }
}
#创建secret
kubectl create secret generic images \
    --from-file=.dockerconfigjson=config.json  \
    --type=kubernetes.io/dockerconfigjson
```

### 手动使用

在pod中手动指定配置拉取认证,可以写多个会自动匹配，使用比较繁琐需要在创建的每个资源手动指定认证

```yaml
imagePullSecrets:
        - name: images
```

### 为服务账户添加imagePullSecrets

k8s在创建命名空间时会在这个命名空间下自动创建一个default的serviceaccount资源，在每个pod创建时会自动使用这个服务账户，如果把imagePullSecrets配置在这个sa中，在pod创建时会自动添加imagePullSecrets字段，无需人工配置。

```bash
#命令直接添加
kubectl patch serviceaccount default -p '{"imagePullSecrets": [{"name": "images"}]}'
#编辑添加，可以配置多个
apiVersion: v1
imagePullSecrets:
- name: images
kind: ServiceAccount
metadata:
  name: default
  namespace: default
#之后在这个命名空间创建资源，使用kubectl get pod -oyaml验证是否自动添加imagePullSecrets字段，如果没有说明指定了其他的sa，主要设置字段是这俩个，如果需要使用请在对应的sa添加imagePullSecrets
    serviceAccount: ceshi
    serviceAccountName: ceshi
```

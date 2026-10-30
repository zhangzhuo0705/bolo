---
title: "k8s之kustomization"
date: 2023-06-30T09:40:57+08:00
draft: false
description: "讲解 Kustomize 的资源定制方式，演示 ConfigMap、Secret 与 Patch 的使用。"
cover: "https://b3logfile.com/bing/20220613.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["Kubernetes"]
tags: ["kubectl"]
toc: true
---
# 一、kustomization介绍

Kustomize是一个独立的工具，用来通过kustomization文件定制Kubernetes对象。

从1.14 版本开始，`kubectl`也开始支持使用kustomization文件来管理Kubernetes对象。 要查看包含kustomization文件的目录中的资源，执行下面的命令：

```bash
#只渲染输出不创建资源
kubectl kustomize <kustomization_directory>
```

要应用这些资源，使用 `--kustomize` 或 `-k` 参数来执行 `kubectl apply`

```bash
#渲染并创建资源
kubectl apply -k <kustomization_directory>
```

# 二、使用说明

Kustomize是一个用来定制Kubernetes配置的工具。它提供以下功能特性来管理应用配置文件：

- 从其他来源生成资源
- 为资源设置贯穿性（Cross-Cutting）字段
- 组织和定制资源集合

## 2.1 生成配置文件

### 1.configMapGenerator

configMapGenerator用来生成configmap资源文件。

**使用files生成configmap**

```bash
#创建配置文件
cat >application.properties<<EOF
hello zhangzhuo
EOF
#生成Kustomize配置文件
cat kustomization.yaml 
configMapGenerator:
- name: configmap-file
  files:
  - application.properties
#输出渲染结果
kubectl  kustomize ./
apiVersion: v1
data:
  application.properties: |
    hello zhangzhuo
kind: ConfigMap
metadata:
  name: configmap-file-52kfh26t8c
```

**使用env生成configmap**

```bash
#生成env文件
cat <<EOF >.env
ZHANGZHUO=ceshi
EOF
#生成Kustomize配置文件
cat kustomization.yaml
configMapGenerator:
- name: configmap-env
  envs:
  - .env
#渲染验证
kubectl  kustomize
apiVersion: v1
data:
  ZHANGZHUO: ceshi
kind: ConfigMap
metadata:
  name: configmap-env-85d29ccbg6
```

**使用literals生成configmap**

```bash
#生成生成Kustomize配置文件
cat kustomization.yaml
configMapGenerator:
- name: configmap-literals
  literals:
  - ZHANGZHUO=ceshi
  - CESHI=zhangzhuo
#渲染验证
kubectl kustomize
apiVersion: v1
data:
  CESHI: zhangzhuo
  ZHANGZHUO: ceshi
kind: ConfigMap
metadata:
  name: configmap-literals-9b9dbd7849
```

### 2.secretGenerator

你可以基于文件或者键值偶对来生成Secret，基本与configMapGenerator使用相同。示例如下

```bash
secretGenerator:
- name: secret-file
  files:
  - application.properties
- name: secret-env
  envs:
  - .env
- name: secret-literals
  literals:
  - ZHANGZHUO=ceshi
  - CESHI=zhangzhuo
```

### 3.使用配置文件

**configmap使用**

```yaml
#kustomization配置文件
configMapGenerator:
- name: config-file
  files:
  - application.properties
resources: 
- configMapGenerator.yml
#deploy配置文件
piVersion: apps/v1
kind: Deployment
metadata:
  name: config
  labels:
    app: config
spec:
  selector:
    matchLabels:
      app: config
  template:
    metadata:
      labels:
        app: config
    spec:
      containers:
      - name: config
        image: echo
        volumeMounts:
        - name: password
          mountPath: /secrets
      volumes:
      - name: password
        secret:
          secretName: config-file
```

**secret使用**

```yaml
#kustomization配置文件
secretGenerator:
- name: secret-file
  files:
  - application.properties
resources: 
- secretGenerator.yml
#deploy配置文件
piVersion: apps/v1
kind: Deployment
metadata:
  name: secret
  labels:
    app: secret
spec:
  selector:
    matchLabels:
      app: secret
  template:
    metadata:
      labels:
        app: secret
    spec:
      containers:
      - name: secret
        image: echo
        volumeMounts:
        - name: password
          mountPath: /secrets
      volumes:
      - name: password
        secret:
          secretName: secret-file
```

### 4.generatorOptions

所生成的ConfigMap和Secret都会包含内容哈希值后缀。 这是为了确保内容发生变化时，所生成的是新的 ConfigMap 或 Secret。 要禁止自动添加后缀的行为，用户可以使用 `generatorOptions`。 除此以外，为生成的 ConfigMap 和 Secret 指定贯穿性选项也是可以的。

```bash
configMapGenerator:
- name: configmap-file
  files:
  - application.properties
secretGenerator:
- name: secret-file
  files:
  - application.properties
generatorOptions: 
  disableNameSuffixHash: true  #关闭哈希
```

## 2.2 设置贯穿性字段

在项目中为所有Kubernetes对象设置贯穿性字段是一种常见操作。 贯穿性字段的一些使用场景如下：

- 为所有资源设置相同的名字空间
- 为所有对象添加相同的前缀或后缀
- 为对象添加相同的标签集合
- 为对象添加相同的注解集合

示例：

```yaml
namespace: ceshi  #为所有资源知道ns
namePrefix: dev-  #为所有资源名称添加前缀
nameSuffix: "-001" #为所有资源名称添加后缀
commonLabels:      #为所有资源添加lable
  app: bingo
commonAnnotations:  #为所有资源添加注释annotations
  oncallPager: 800-555-1212
```

## 2.3 组织和定制资源

一种常见的做法是在项目中构造资源集合并将其放到同一个文件或目录中管理。 Kustomize 提供基于不同文件来组织资源并向其应用补丁或者其他定制的能力。

### 1.组织resources

Kustomize 支持组合不同的资源。`kustomization.yaml` 文件的 `resources` 字段定义配置中要包含的资源列表。 你可以将 `resources` 列表中的路径设置为资源配置文件的路径。 下面是由 Deployment 和 Service 构成的 NGINX 应用的示例：

```yaml
resources:   #引用资源文件
- nginx/deploy.yml
- nginx/service.yml
```

### 3.定制Patches

补丁文件（Patches）可以用来对资源执行不同的定制。 Kustomize 通过 `patchesStrategicMerge` 和 `patchesJson6902` 支持不同的打补丁机制。 例如，构造一个补丁来增加 Deployment 的副本个数；构造另外一个补丁来设置内存限制。

```bash
#patchesJson6902
cat nginx_set_raplace.yml 
- op: replace
  path: /spec/replicas
  value: 3
#patchesStrategicMerge
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
spec:
  template:
    spec:
      containers:
      - name: nginx
        resources:
          limits:
            memory: 512Mi
#使用
resources:   
- nginx/deploy.yml
- nginx/service.yml
patchesJson6902: 
- target:
    group: apps
    version: v1
    kind: Deployment
    name: nginx
  path: nginx_set_raplace.yml
patchesStrategicMerge:  
- nginx_set_memory.yml
```

## 2.4 设置资源新的镜像

Kustomize 还提供定制容器镜像或者将其他对象的字段值注入到容器中的能力，并且不需要创建补丁。 例如，你可以通过在 `kustomization.yaml` 文件的 `images` 字段设置新的镜像来更改容器中使用的镜像。

```bash
#nginx资源文件
cat nginx/deploy.yml 
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
spec:
  selector:
    matchLabels:
      run: nginx
  replicas: 2
  template:
    metadata:
      labels:
        run: nginx
    spec:
      containers:
      - name: nginx
        image: nginx
        ports:
        - containerPort: 80
#kustomization文件
resources: 
- nginx/deploy.yml
- nginx/service.yml
images:
- name: nginx   #旧的镜像名称
  newName: nginx  #新的镜像名称
  newTag: 1.4.0  #新的镜像tag
```

## 2.5 基准（Bases与覆盖（Overlays）

Kustomize中有**基准（bases）**和**覆盖（overlays）** 的概念区分。 **基准** 是包含 `kustomization.yaml` 文件的一个目录，其中包含一组资源及其相关的定制。 基准可以是本地目录或者来自远程仓库的目录，只要其中存在 `kustomization.yaml` 文件即可。 **覆盖** 也是一个目录，其中包含将其他 kustomization 目录当做 `bases` 来引用的 `kustomization.yaml` 文件。 **基准**不了解覆盖的存在，且可被多个覆盖所使用。 覆盖则可以有多个基准，且可针对所有基准中的资源执行组织操作，还可以在其上执行定制。

示例：

```bash
#查看创建的目录结构
app/
├── base
│?? ├── deploy.yml
│?? ├── kustomization.yaml
│?? └── service.yml
└── overlays
    ├── dev
    │?? └── kustomization.yaml
    └── uat
        └── kustomization.yaml
#deploy文件内容
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
spec:
  selector:
    matchLabels:
      run: nginx
  template:
    metadata:
      labels:
        run: nginx
    spec:
      containers:
      - name: nginx
        image: nginx
#svc文件内容
apiVersion: v1
kind: Service
metadata:
  name: nginx
  labels:
    run: nginx
spec:
  ports:
  - port: 80
    protocol: TCP
  selector:
    run: nginx
#base/kustomization.yaml
resources:
- deploy.yml
- service.yml
#dev/kustomization.yaml
namespace: kustomization
namePrefix: dev-
commonLabels:
  app: app-dev
commonAnnotations:
  oncallPager: app-dev
resources:
- ../../base
images:
- name: nginx
  newName: 10.202.43.240:5000/kubernetes/nginx
  newTag: dev
#uat/kustomization.yaml
namespace: kustomization
namePrefix: uat-
commonLabels:
  app: app-uat
commonAnnotations:
  oncallPager: app-uat
resources:
- ../../base
images:
- name: nginx   
  newName: 10.202.43.240:5000/kubernetes/nginx
  newTag: uat  
#使用
kubectl apply -k app/overlays/dev/
kubectl apply -k app/overlays/uat/
```

### 2.6 如何使用Kustomize命令

在 `kubectl` 命令中使用 `--kustomize` 或 `-k` 参数来识别被 `kustomization.yaml` 所管理的资源。 注意 `-k` 要指向一个 kustomization 目录。例如：

```shell
#渲染资源文件并输出
kubectl kustomize app/overlays/uat/
#创建资源
kubectl apply -k app/overlays/dev/
#查看所创建的资源
kubectl get -k app/overlays/dev/
#查看详细信息
kubectl describe -k app/overlays/dev/
#比较对象与清单被应用之后集群将处于的状态
kubectl diff -k app/overlays/dev/
#删除资源
kubectl delete -k app/overlays/dev/
```

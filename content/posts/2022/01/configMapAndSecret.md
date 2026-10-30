---
title: "ConfigMap&Secret"
date: 2022-01-07T22:07:57+08:00
draft: false
description: "说明 ConfigMap 与 Secret 的创建和使用方式，实现配置与敏感信息解耦。"
cover: "https://b3logfile.com/bing/20211025.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["Kubernetes"]
tags: ["Kubernetes"]
toc: true
---
# 一、ConfigMap

官方文档：https://kubernetes.io/zh/docs/concepts/configuration/configmap/

## 1.1 ConfigMap介绍

在微服务架构中，大多数的服务的配置文件都是与服务本身分开的，由统一的配置中心进行管理，服务启动后会到配置中心读取自己的配置文件之后启动服务。Kubernetes中也提供了一个配置文件的api就是configmap。

ConfigMap 将您的环境配置信息和容器镜像解耦，便于应用配置的修改。

**注意**：ConfigMap 并不提供保密或者加密功能。 如果你想存储的数据是机密的，请使用Secret， 或者使用其他第三方工具来保证你的数据的私密性，而不是用 ConfigMap。

ConfigMap 在设计上不是用来保存大量数据的。在 ConfigMap 中保存的数据不可超过 1 MiB。如果你需要保存超出此尺寸限制的数据，你可能希望考虑挂载存储卷或者使用独立的数据库或者文件服务。

## 1.2 ConfigMap的创建

**创建方式**

- 可以编写yaml文件，使用`kubectl`命令指定yaml文件进行创建
- 可以直接使用`kubectl create cm`命令指定文件或文件夹进行创建

**`kubectl create cm`参数**

- `--from-file`：以本地文件的方式创建cm的配置文件，可以指定一个文件或多个文件或一个文件夹。格式`--from-file=定义到mc中的key名称=文件位置 `，如果不写名称直接指定文件默认会把文件名称作为key名称。不能与`--from-env-file`一起用。
- `--from-env-file`：以本地文件的方式创建cm的变量，可以指定多个。
- `--from-literal`：创建变量的mc，格式`--from-literal=变量名称=变量值`,可以写多个

### 1.示例yaml文件

```yaml
apiVersion: v1        #api版本
kind: ConfigMap       #资源类型
metadata:             #元数据定义
  name: test          #名称
  namespace: default  #命名空间
data:                 #具体配置定义，配置定义的类型有俩种
  player_initial_lives: "3"   #这种以容器环境变量的方式使用
  game.properties: |          #这种以映射到容器中为配置文件的方式使用
    enemy.types=aliens,monsters
    player.maximum-lives=5
```

### 2.以文件或文件夹的方式创建configmap的配置文件

```bash
#查看文件夹下的文件
[root@k8s test]# ls configmap/
nginx.config  redis.config
```

**以文件的方式创建**

```bash
#单个文件
kubectl create configmap test --from-file=redis=configmap/redis.config  
#验证
[root@k8s test]# kubectl get cm test -oyaml
apiVersion: v1
data:
  redis: |
    redis true
    password 123456
kind: ConfigMap
metadata:
  creationTimestamp: "2022-01-06T02:57:23Z"
  name: test
  namespace: default
  resourceVersion: "57247020"
  selfLink: /api/v1/namespaces/default/configmaps/test
  uid: 0a6ab496-f932-4a36-be25-b82aeb20cd84

#多个文件
kubectl create configmap test --from-file=redis=configmap/redis.config --from-file=nginx=configmap/nginx.config
#验证
[root@k8s test]# kubectl get cm test -oyaml
apiVersion: v1
data:
  nginx: |
    nginx true
    password 123456
  redis: |
    redis true
    password 123456
kind: ConfigMap
metadata:
  creationTimestamp: "2022-01-06T02:58:35Z"
  name: test
  namespace: default
  resourceVersion: "57247237"
  selfLink: /api/v1/namespaces/default/configmaps/test
  uid: 605febe6-b50e-45d5-b8ea-fee042279320
```

**以文件夹的方式创建**

```bash
kubectl create configmap test --from-file=configmap/
#验证
[root@k8s test]# kubectl get cm test -oyaml
apiVersion: v1
data:      #会把目录下的所有文件定义到mc中
  nginx.config: |    #key名称为文件名称，值为文件内容
    nginx true
    password 123456
  redis.config: |
    redis true
    password 123456
kind: ConfigMap
metadata:
  creationTimestamp: "2022-01-06T03:05:20Z"
  name: test
  namespace: default
  resourceVersion: "57248456"
  selfLink: /api/v1/namespaces/default/configmaps/test
  uid: b68d1351-b70c-436b-ad5c-9f7610fce0bd
```

### 3.以文件的方式创建环境变量的configmap

```bash
#创建变量文件
[root@k8s configmap]# cat env 
name=zz
name1=zhnagzhuo
name2=zhang
name3=zhuo
#创建cm
kubectl create cm test --from-env-file=env
#验证
[root@k8s configmap]# kubectl get cm test -oyaml
apiVersion: v1
data:
  name: zz
  name1: zhnagzhuo
  name2: zhang
  name3: zhuo
kind: ConfigMap
metadata:
  creationTimestamp: "2022-01-06T03:13:47Z"
  name: test
  namespace: default
  resourceVersion: "57249972"
  selfLink: /api/v1/namespaces/default/configmaps/test
  uid: 12f35011-0593-47de-a1ff-67484917c437
```

## 1.3 ConfigMap的使用

首先创建一个configmap，示例如下

```bash
apiVersion: v1
kind: ConfigMap
metadata:
  creationTimestamp: null
  name: test
data:
  nginx.config: |
    nginx true
    password 123456
  redis.config: |
    redis true
    password 123456
  test1: zz
  test2: zhanghuo
```

### 1.以环境变量的方式使用ConfigMap

Pod使用cm需要与cm在同一个命名空间，否则是无法调用的，会提示找不到。

**手动指定环境变量，单个引用**

```bash
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-1
  namespace: default
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
        name: nginx
        env:             #变量定义
        - name: test1    #定义到容器中的变量名称
          valueFrom:     #定义变量来自哪里
            configMapKeyRef:  #定义cm
              name: test      #cm名称
              key: test1      #cm中key名称
        - name: test2
          valueFrom:
            configMapKeyRef:
              name: test
              key: test2
#验证
kubectl exec -it nginx-1-6dc7b8574-8862z -- env | grep -e test1 -e test2
test1=zz
test2=zhanghuo
```

**定义一次定义多个环境变量**

这种定义会轮询cm中所有的数据，把key作为变量的名称。

```bash
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-1
  namespace: default
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
        name: nginx
        envFrom:      #轮询定义环境变量
        - configMapRef:  #可以写多个，来源cm
            name: test   #cm名称
#验证
kubectl exec -it nginx-1-5f4f8cc5b4-9s9gc -- env | grep -e test1 -e test2 -e 
test1=zz
test2=zhanghuo
```

### 2.以配置文件的形式挂载ConfigMap

**挂载configmap到文件夹中**

这种挂载方式会把configmap的所有内容以文件的方式挂载到所定义的挂载点，挂载点如果有内容会进行覆盖。文件名称会定义为cm中的key名称，内容为key的value。

```bash
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-1
  namespace: default
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
        name: nginx
        volumeMounts:       #容器挂载定义
          - name: nginx-conf  #定义的volumes的名称
            mountPath: /etc/config  #挂载点，目录
      volumes:          #挂载定义
        - name: nginx-conf  #挂载名称
          configMap:        #挂载的资源
            name: test      #cm名称
#验证
kubectl exec -it nginx-1-777cb9459f-bd7t9 -- ls /etc/config
nginx.config  redis.config  test1  test2

#挂载的文件修改cm内容会自动刷新，同步会有一定的时间
kubectl edit cm test
  nginx.config: |
    nginx true-true
    password 12345
#验证
kubectl exec -it nginx-1-777cb9459f-bd7t9 -- cat /etc/config/nginx.config
nginx true-true
password 12345
```

**挂载configmap中其中的一个配置到文件夹**

```bash
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-1
  namespace: default
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
        name: nginx
        volumeMounts:
          - name: nginx-conf
            mountPath: /etc/config 
      volumes:
        - name: nginx-conf
          configMap:
            name: test 
            items:  #具体定义要挂载的内容
              - key: redis.config  #cm的key名称
                path: redis.conf   #挂载后的文件名称
                mode: 0000         #文件权限，要比defaultMode优先级高
            defaultMode: 0666      #文件权限作用与整个cm
#验证
kubectl exec -it nginx-1-6b7bcc77cc-n2f7k -- ls /etc/config
redis.conf
root@nginx-1-74bb6cfdfd-fqw6q:/# cd /etc/config/
root@nginx-1-74bb6cfdfd-fqw6q:/etc/config# ls -l
total 0
lrwxrwxrwx 1 root root 17 Jan  6 05:40 redis.conf -> ..data/redis.conf
root@nginx-1-74bb6cfdfd-fqw6q:/etc/config# ls -l ..data/redis.conf 
-rw-rw-rw- 1 root root 27 Jan  6 05:40 ..data/redis.conf
```

**挂载一个配置文件到文件，避免目录覆盖**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-1
  namespace: default
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
        name: nginx
        volumeMounts:
          - name: test
            mountPath: /etc/nginx/nginx.conf  #挂载路径写全部，到挂载的文件
            subPath: nginx.conf  #挂载为那个文件
      volumes:          
        - name: test  
          configMap:   
            name: nginx-conf
            items:
              - key: nginx.conf
                path: nginx.conf
```

# 二、Secret

官方说明：https://kubernetes.io/zh/docs/concepts/configuration/secret/

## 2.1 Secret的创建

### 1.示例yaml文件

Secret除了一些特定的类型，需要yaml形式创建，其余的不建议使用yaml创建。

```bash
apiVersion: v1  #api版本
kind: Secret    #资源类型
metadata:       #元数据定义
  name: test    #名称
data:           #数据定义，以下定义类型是Opaque与configmap的定义方法没有区别，但是key的value需要base64加密的方式写入
  nginx.config: bmdpbnggdHJ1ZQpwYXNzd29yZCAxMjM0NTYK #base64加密后内容
  redis.config: cmVkaXMgdHJ1ZQpwYXNzd29yZCAxMjM0NTYK
type: Opaque   #类型
```

### 2.Opaque类型的Secret创建方式

一般由`kubectl create secret generic`命令创建。与configmap的创建方式类似。

```bash
kubectl create secret generic test --from-file=configmap/redis.config
kubectl create secret generic test --from-file=configmap/
kubectl create secret generic test --from-env-file=env
kubectl create secret generic test --from-file=configmap/ --from-literal=zz=aaa
```

Opaque类型的Secret的使用与configmap的使用并没有太大区别。

```bash
#文件挂载到目录使用
        volumeMounts:
          - name: nginx-conf
            mountPath: /etc/config
      volumes:
        - name: nginx-conf
          secret:
            secretName: test
            items:
              - key: redis.config
                path: redis.conf
                mode: 0000
            defaultMode: 0666
#文件挂载到文件使用
        volumeMounts:
          - name: test
            mountPath: /etc/nginx/nginx.conf
            subPath: nginx.conf
      volumes:          #挂载定义
        - name: test  #挂载名称
          secret:
            secretName: nginx-conf
            items:
              - key: nginx.conf
                path: nginx.conf
#引用变量
        envFrom:
        - secretRef:
            name: test
        env:
        - name: zhangzhuo
          valueFrom:
            secretKeyRef:
              name: test      #cm名称
              key: zhangzhuo      #cm中key名称
```

### 3.创建用于认证镜像仓库的Secret

一般由`kubectl create secret docker-registry`命令创建。

```bash
kubectl create secret docker-registry docker-registry --docker-server=10.122.6.79:9000 --docker-username=admin --docker-password=123456 --docker-email=k8s@zhang.com

#参数说明
--docker-server  #仓库地址
--docker-username #用户名
--docker-password #密码
--docker-email    #邮箱
```

如何使用，需要在Pod定义中使用`imagePullSecrets`配置，可以写多个他会自动匹配。

```bash
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-1
  namespace: default
spec:
  selector:
    matchLabels:
      app: nginx-1
  template:
    metadata:
      labels:
        app: nginx-1
    spec:
      imagePullSecrets:       #配置认证仓库的Secret
      - name: docker-registry #Secret名称，可以写多个
      containers:
      - image: 10.122.6.81:5000/image/nginx:v1
        name: nginx
```

### 4.使用Secret管理tls证书

一般由` kubectl create secret tls`命令创建。

```bash
#生成证书文件
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout tls.key -out tls.crt -subj "/CN=www.zhangzhuo.com"

kubectl create secret tls tls --key=tls.key --cert=tls.crt 

#参数
--key #私钥
--cert #公钥
```

一般的tls的secret由k8s中的ingress资源使用

```bash
apiVersion: networking.k8s.io/v1beta1
kind: Ingress
metadata:
  name: nginx-https-test
  annotations:
    kubernetes.io/ingress.class: "nginx"
spec:
  rules:
    - host: www.zhangzhuo.com
      http:
        paths:
        - backend:
            serviceName: nginx
            servicePort: 80
  tls:          #tls证书配置
  - hosts: 
    - www.zhangzhuo.com
    - www.zhangzhuo1.com
    secretName: tls
    secretName: tls1
```

# 三、ConfigMap&Secret的其他问题

## 3.1 ConfigMap&Secret热更新

如果使用yaml创建，直接修改yaml文件即可，如果是使用文件创建推荐修改原文件后使用文件进行更新。命令如下:

```bash
kubectl create configmap nginx-conf --from-file=nginx.conf --dry-run -oyaml | kubectl replace -f -
```

如果configmap&secret是以文件形式挂载，如果资源内容进行更新，pod内挂载的文件内容也会进行同步，如果是变量方式使用是不会进行更新变量的，需要重启Pod。文件方式热更新后不代表服务的配置也进行了热更新，如果服务本身支持热加载配置，可以实现自动更新配置，如果没有也需要重启Pod。

## 3.2 ConfigMap&Secret使用限制

- 如果Pod使用ConfigMap&Secret，需要提前创建，应用的key必须存在
- 使用的ConfigMap&Secre的Pod必须与Pod在一个命名空间
- envFrom、valueFrom无法更新环境变量，需要重启Pod，如果引用的key不存在，会忽略掉无效的key
- subPath也是无法热更新的
- ConfigMap&Secret最好不要太大，官方推荐不要大于1M，与etcd有关系

## 3.3 ConfigMap&Secret不可变

在k8s的1.18版本后新增加了一个不可变的ConfigMap&Secret设置参数`immutable: true`来进行设置。1.18为Alpha版本需要在特性进行手动开启参数为`--feature-gates="ImmutableEphemeralVolumes: true"`，1.19以后默认为true无需手动设置。

Kubernetes 特性 不可变更的 Secret 和 ConfigMap提供了一种将各个 Secret 和 ConfigMap 设置为不可变更的选项。对于大量使用 ConfigMap 的 集群（至少有数万个各不相同的 ConfigMap 给 Pod 挂载）而言，禁止更改 ConfigMap 的数据有以下好处：

- 保护应用，使之免受意外（不想要的）更新所带来的负面影响。
- 通过大幅降低对 kube-apiserver 的压力提升集群性能，这是因为系统会关闭 对已标记为不可变更的 ConfigMap 的监视操作。

一旦某 ConfigMap 被标记为不可变更，则 无法 逆转这一变化，也无法更改 `data` 或 `binaryData` 字段的内容。你只能删除并重建 ConfigMap。

示例如下：

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  ...
data:
  ...
immutable: true
```

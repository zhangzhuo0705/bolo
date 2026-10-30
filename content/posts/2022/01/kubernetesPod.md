---
title: "kubernetes之Pod资源"
date: 2022-01-03T15:46:17+08:00
lastmod: 2022-01-11T20:48:56+08:00
draft: false
description: "讲解 Pod 的结构与生命周期，演示初始化容器和健康探针的配置。"
cover: "https://b3logfile.com/bing/20190903.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["Kubernetes"]
tags: ["Kubernetes"]
toc: true
---
# 一、Pod介绍

官方文档：https://kubernetes.io/zh/docs/concepts/workloads/pods/

Pod是Kubernetes中最小的单元，它由一组、一个或多个容器组成，每个Pod还包含了一个Pause容器，Pause容器是Pod的父容器，主要负责僵尸进程的回收管理，通过Pause容器可以使同一个Pod里面的多个容器共享存储、网络、PID、IPC等。

**Pod在生产环境中基本不单独使用，一般都是配合控制器来使用**

**Pod结构图**

![image-20211214152913829](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20211214152913829.png)

# 二、Pod示例文件

**yaml演示文件**

```bash
apiVersion: v1  # 必选，API的版本号
kind: Pod       # 必选，类型Pod
metadata:       # 必选，元数据
  name: pod     # 必选，符合RFC 1035规范的Pod名称
  namespace: default # 可选，Pod所在的命名空间，不指定默认为default，可以使用-n 指定namespace 
  labels:       # 可选，标签选择器，一般用于过滤和区分Pod
    app: pod    #可以写多个
  annotations:  #可选，注释列表，可以写多个
    app: nginx
spec:           # 必选，用于定义容器的详细信息
  initContainers:  #初始化容器，在容器启动之前执行的一些初始化操作
  - name: init-echo
    command:
    - sh
    - -c
    - echo "I am InitContainer for init some configuration"
    image: 10.122.6.81:5000/image/centos:v1
    imagePullPolicy: IfNotPresent
  containers:    # 必选，容器列表
  - name: nginx  # 必选，符合RFC 1035规范的容器名称
    image: 10.122.6.81:5000/image/nginx:v1     # 必选，容器所用的镜像的地址
    imagePullPolicy: IfNotPresent     # 可选，镜像拉取策略, IfNotPresent: 如果宿主机有这个镜像，那就不需要拉取了. Always: 总是拉取, Never: 不管是否存储都不拉去，默认为Always
    workingDir: /usr/share/nginx/html       # 可选，容器的工作目录
    ports:  # 可选，容器需要暴露的端口号列表
    - name: http    # 端口名称
      containerPort: 80     # 端口号
      protocol: TCP # 端口协议，默认TCP
    envFrom:      #轮询定义环境变量
    - configMapRef:  #可以写多个，来源cm
        name: test   #cm名称
    env:    #可选，环境变量配置列表
    - name: TZ      # 变量名
      value: Asia/Shanghai # 变量的值
    - name: LANG
      value: en_US.utf8
    - name: test1    #变量名称
      valueFrom:     #定义变量来自哪里
        configMapKeyRef:  #定义cm
          name: test      #cm名称
          key: test1      #cm中key名称
    resources:      # 可选，资源限制和资源请求限制
      limits:       # 最大限制设置
        cpu: 200m  #1核CPU=1000m
        memory: 100Mi
      requests:     # 启动所需的资源
        cpu: 200m
        memory: 100Mi
    startupProbe: # 探测容器是否启动
      exec:        # 执行容器命令检测方式
        command: 
        - ls
        - /tmp/zhangzhuo/1/
      initialDelaySeconds: 30   # 初始化时间
      timeoutSeconds: 1     # 超时时间
      periodSeconds: 3      # 检测间隔
      successThreshold: 1 # 检查成功为1次表示就绪
      failureThreshold: 3 # 检测失败3次表示未就绪
    readinessProbe: # 可选，就绪探针。
      httpGet:      # httpGet检测方式
        path: / # 检查路径
        port: 80        # 监控端口
      initialDelaySeconds: 3
      timeoutSeconds: 1 
      periodSeconds: 3  
      successThreshold: 1 
      failureThreshold: 3 
    livenessProbe:  # 可选，存活探针
      tcpSocket:    # 端口检测方式
        port: 80
      initialDelaySeconds: 60       
      timeoutSeconds: 2     
      periodSeconds: 5      
      successThreshold: 1 
      failureThreshold: 3 
    lifecycle:    #回调配置
      postStart:  #容器启动后执行  
        exec:     #执行命令
          command:
          - sh
          - -c
          - 'mkdir /tmp/zhangzhuo/1 -p'
      preStop:    #容器终止前执行
        httpGet:  #执行http请求    
              path: /
              port: 80
  restartPolicy: Always   # 可选，默认为Always，容器故障或者没有启动成功，那就自动重启该容器，Onfailure: 容器以不为0的状态终止，自动重启该容器, Never:无论何种状态，都不会重启，默认为Always
  nodeSelector:  #可选，指定Node节点
    type: normal #填写node标签
  terminationGracePeriodSeconds: 30 #Pod删除停止时最大容忍时间，默认30s
  dnsPolicy: ClusterFirstWithHostNet  #Pod的dns策略,Default,None,ClusterFirst,ClusterFirstWithHostNet
  hostNetwork: true #使用宿主机网络，默认不使用
```

# 三、初始化容器

每个Pod中可以包含多个容器， 应用运行在这些容器里面，同时 Pod 也可以有一个或多个先于应用容器启动的 Init 容器。

Init 容器与普通的容器非常像，除了如下两点：

- 它们总是运行到完成。
- 每个都必须在下一个启动之前成功完成。

如果 Pod 的 Init 容器失败，kubelet 会不断地重启该 Init 容器直到该容器成功为止。 然而，如果 Pod 对应的 `restartPolicy` 值为 "Never"，并且 Pod 的 Init 容器失败， 则 Kubernetes 会将整个 Pod 状态设置为失败。

示例：

```bash
initContainers:  #初始化容器，在容器启动之前执行的一些初始化操作
  - name: init-run-sleep 
    command: ['bash','sleep','15']   #初始化容器启动后执行的命令分别有agrs，command
    image: 10.122.6.81:5000/image/centos:v1
    imagePullPolicy: IfNotPresent
  - name: init-test
    command:
    - sh
    - -c
    - 'ping -c1 test'
    image: 10.122.6.81:5000/image/centos:v1
    imagePullPolicy: IfNotPresent
```

command、args两项实现覆盖Dockerfile中ENTRYPOINT的功能

- 具体的command命令代替ENTRYPOINT的命令行，args代表集体的参数。
- 如果command和args均没有写，那么用Dockerfile的配置。
- 如果command写了，但args没有写，那么Dockerfile默认的配置会被忽略，执行输入的command（不带任何参数，当然command中可自带参数）。
- 如果command没写，但args写了，那么Dockerfile中配置的ENTRYPOINT的命令行会被执行，并且将args中填写的参数追加到ENTRYPOINT中。
- 如果command和args都写了，那么Dockerfile的配置被忽略，执行command并追加上args参数。

# 四、Pod的探针

官方文档：https://kubernetes.io/zh/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/

## 4.1 三种探针类型

探针分为三种分别是`StartupProbe`、`LivenessProbe`、`ReadinessProbe`.

- **StartupProbe**：k8s的1.16版本后新加的探测方式，用于判断容器内应用程序是否已经启动。如果配置了startupProbe，就会先禁止其他的探测，直到它成功为止，成功后将不在进行探测。**注意在k8s1.17及以下版本属于新特性默认是没有开启的需要手动配置开启**`--feature-gates=StartupProbe=true`
- **LivenessProbe**：用于探测容器是否运行，如果探测失败，kubelet会根据配置的重启策略进行相应的处理。若没有配置该探针，默认就是success。
- **ReadinessProbe**：一般用于探测容器内的程序是否健康，它的返回值如果为success，那么久代表这个容器已经完成启动，并且程序已经是可以接受流量的状态。

## 4.2 探测方式

- ExecAction：在容器内执行一个命令，如果返回值为0，则认为容器健康。

```bash
livenessProbe:  # 可选，健康检查
      exec:        # 执行容器命令检测方式
        command: 
        - cat
        - /health
```

- TCPSocketAction：通过TCP连接检查容器内的端口是否是通的，如果是通的就认为容器健康。

```bash
livenessProbe:  # 可选，健康检查
      tcpSocket:    # 端口检测方式
        port: 80
```

- HTTPGetAction：通过应用程序暴露的API地址来检查程序是否是正常的，如果状态码为200~400之间，则认为容器健康。(推荐使用api接口来来探测容器是否运行正常，需要开发提供相应接口)

```bash
livenessProbe:    # 可选，健康检查
      httpGet:        # httpGet检测方式
        path: /_health # 检查路径
        port: 8080
        httpHeaders:   # 检查的请求头
        - name: end-user
          value: Jason
```

## 4.3 探针检查参数配置

- `initialDelaySeconds`：容器启动后要等待多少秒后存活和就绪探测器才被初始化，默认是 0 秒，最小值是 0。请根据pod启动时间进行设置。
- `periodSeconds`：执行探测的时间间隔（单位是秒）。默认是 10 秒。最小值是 1。不易设置过短也不宜过长，请根据实际情况设置。
- `timeoutSeconds`：探测的超时后等待多少秒。默认值是 1 秒。最小值是 1。在1.20之前的版本这个参数是可以进行设置其他值在1.20之后官方修改为1。可以在你可以在所有的 kubelet 上禁用 `ExecProbeTimeout`。恢复之前的模式。
- `successThreshold`：探测器在失败后，被视为成功的最小连续成功数。默认值是 1。 存活和启动探测的这个值必须是 1。最小值是 1。
- `failureThreshold`：当探测失败时，Kubernetes 的重试次数。 存活探测情况下的放弃就意味着重新启动容器。 就绪探测情况下的放弃 Pod 会被打上未就绪的标签。默认值是 3。最小值是 1。不要设置的次数过多如果pod出问题会导致检测错误的时间变的过长。

**为什么要使用StartupProbe**

如果没有startupProbe，对于启动慢的程序来说必定需要调整等待时间参数，这会导致pod从启动到就绪的时间变长，在更新服务时会导致服务就绪时间变长从而有可能导致服务不可用。如果配置StartupProbe，可以把StartupProbe时间设置较长，其余探针设置的时间短一些，由于StartupProbe执行成功后变不会在执行所以会极大的降低pod的就绪时间。在滚动升级时非常好用。

一个探针的探测失败时间=initialDelaySeconds+((periodSeconds+timeoutSeconds)*failureThreshold)

**示例**

```bash
startupProbe: # 探测容器是否启动
      exec:        # 执行容器命令检测方式
        command: 
        - ls
        - /tmp/zhangzhuo/1/
      initialDelaySeconds: 30   # 初始化时间
      timeoutSeconds: 1     # 超时时间
      periodSeconds: 3      # 检测间隔
      successThreshold: 1 # 检查成功为1次表示就绪
      failureThreshold: 3 # 检测失败3次表示未就绪
    readinessProbe: # 可选，就绪探针。
      httpGet:      # httpGet检测方式
        path: / # 检查路径
        port: 80        # 监控端口
      initialDelaySeconds: 3
      timeoutSeconds: 1 
      periodSeconds: 3  
      successThreshold: 1 
      failureThreshold: 3 
    livenessProbe:  # 可选，存活探针
      tcpSocket:    # 端口检测方式
        port: 80
      initialDelaySeconds: 60       
      timeoutSeconds: 2     
      periodSeconds: 5      
      successThreshold: 1 
      failureThreshold: 3
```

# 五、Pod退出流程

用户执行删除操作后Pod所做的事情。

![image-20211217175432246](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20211217175432246.png)

注意：在上面的流程中除去执行`preStop`外，其余必定都会执行。

## 5.1 容器回调

有两个回调暴露给容器：

**PostStart**

这个回调在容器被创建之后立即被执行。 但是，不能保证回调会在容器入口点（ENTRYPOINT）之前执行。 没有参数传递给处理程序。基本很少使用。

**PreStop**

在容器因 API 请求或者管理事件（诸如存活态探针、启动探针失败、资源抢占、资源竞争等） 而被终止之前，此回调会被调用。 在用来停止容器的 TERM 信号被发出之前，回调必须执行结束。 Pod 的终止宽限周期在 `PreStop` 回调被执行之前即开始计数，所以无论回调函数的执行结果如何，容器最终都会在 Pod 的终止宽限期内被终止。

- `terminationGracePeriodSeconds`:容器的宽限时间

**回调方式**

- Exec - 在容器执行给定的命令或脚本，重点使用。
- HTTP - 对容器上的特定端点执行 HTTP 请求。

## 5.2 配置示例

```bash
lifecycle:    #回调配置
      postStart:  #容器启动后执行  
        exec:     #执行命令
          command:
          - sh
          - -c
          - 'mkdir /data/ '
      preStop:    #容器终止前执行
        httpGet:  #执行http请求    
              path: /
              port: 80
```

# 六、服务零宕机发布Pod设置

如果需要实现服务的零宕机发布，在pod设置中需要做的步骤如下：

1. 首先配置服务的健康检测探针，三种类型的探针需要进行配置，尤其是服务的启动探针。探针最好是使用api接口进行探针，其他方式不推荐。
2. 并且进行测试确定服务的启动后就绪所需的时间，如果服务本身没有问题在就绪探针探测成功后就表示服务正常启动成功。
3. 把服务正常启动的时间配置为删除pod时的容忍时间，可以写的比启动时间长一些。
4. 之后配置容器回调，主要是`preStop`参数，大多数微服务都会使用注册中心，使用脚本的方式把自己在注册中心取消注册，以防删除的pod接收新的请求，如果是使用service资源进行服务发现这步可以不用做。最后执行`sleep`命令暂停这个容器，让容器尽可能的处理完之前的连接请求。sleep的时间可以根据自己的情况设置时长，但是Pod的最大容忍时间是`terminationGracePeriodSeconds`来设置的。

当然这里的零宕机设置只是pod中所需的必要设置，在真实环境中并不会直接使用pod，而是使用控制器来管理pod，一些零宕机的其他功能都是有控制器来实现，这里不介绍。

# 七、临时容器

官方介绍：https://kubernetes.io/zh/docs/concepts/workloads/pods/ephemeral-containers/

Ephemeral Containers(临时容器)与其他容器的不同之处在于，它们缺少对资源或执行的保证，并且永远不会自动重启， 因此不适用于构建应用程序。 临时容器使用与常规容器相同的 `ContainerSpec` 节来描述，但许多字段是不兼容和不允许的。

- 临时容器没有端口配置，因此像 `ports`，`livenessProbe`，`readinessProbe` 这样的字段是不允许的。
- Pod 资源分配是不可变的，因此 `resources` 配置是不允许的。

临时容器是使用 API 中的一种特殊的 `ephemeralcontainers` 处理器进行创建的， 而不是直接添加到 `pod.spec` 段，因此无法使用 `kubectl edit` 来添加一个临时容器。

与常规容器一样，将临时容器添加到 Pod 后，将不能更改或删除临时容器。

**临时容器的用途**：当由于容器崩溃或容器镜像不包含调试工具而导致 `kubectl exec` 无用时， 临时容器对于交互式故障排查很有用。

**如何启用临时容器功能**：临时容器功能在1.16+版本后被加入的新特性`EphemeralContainers`，到1.22为止一直为Alpha版本，默认是关闭的需要进行手动开启配置参数为`--feature-gates=EphemeralContainers=true`。在1.23版本变为BETA版本默认是开启的。

## 7.1 使用临时容器排查故障

正常情况下服务使用的镜像体积会尽可能的最小化，所以一些调试工具大多数情况下是没有的，所以如果连接容器调试容器是无法进行调试的，所以需要使用一个有调试工具的镜像，以临时容器的方式挂载到已经启动的Pod中进行调试服务Pod。

临时容器的创建一般使用`kubectl`命令进行创建，并且挂载到一个已经启动的Pod中去。

**临时容器在不同版本使用的方法也不一致**

```bash
#K8s 1.16+ 需要以json文件进行创建并且使用kubectl replace -f 进行创建
https://kubernetes.io/docs/concepts/workloads/pods/ephemeral-containers/

#K8s 1.18+及以后版本后使用kubectl alpha debug进行创建
kubectl alpha debug redis-new-5b577b46c7-2jv4j -ti --image=registry.cn-beijing.aliyuncs.com/dotbalo/debug-tools

#K8s 1.20+及以后版本创建命令变更为kubectl  debug
kubectl debug redis-new-5b577b46c7-2jv4j -ti --image=registry.cn-beijing.aliyuncs.com/dotbalo/debug-tools
```

### 1.使用示例

这里演示1.20以后的版本创建使用方法，1.18的使用一致只需要加alpha参数

**创建**

```bash
#这里先使用一个pause镜像启动一个Pod，由于Pause相当于一个空镜像，什么都没有包括sh与bash
kubectl  run test --image=192.168.10.254:5000/k8s/pause:3.5
#验证创建
kubectl  get po -owide
NAME   READY   STATUS    RESTARTS   AGE     IP             NODE            NOMINATED NODE   READINESS GATES
test   1/1     Running   0          2m40s   10.100.4.240   192.168.10.54   <none>           <none>


#这里使用kubectl exec进入容器命令行，不管使用哪种都是无法进去的
kubectl  exec -it test bash
kubectl  exec -it test sh

#给Pod挂在临时容器，使用-it会直接进入容器命令行界面
kubectl debug test --image=192.168.10.254:5000/bash/busybox:latest -it

#验证，可以看到由于Pod共享网络空间所以IP地址与创建的Pod一致
/ # ifconfig  eth0
eth0      Link encap:Ethernet  HWaddr 46:06:F7:B0:A3:41  
          inet addr:10.100.4.240  Bcast:0.0.0.0  Mask:255.255.255.255
          inet6 addr: fe80::4406:f7ff:feb0:a341/64 Scope:Link
          UP BROADCAST RUNNING MULTICAST  MTU:1500  Metric:1
          RX packets:0 errors:0 dropped:0 overruns:0 frame:0
          TX packets:11 errors:0 dropped:0 overruns:0 carrier:0
          collisions:0 txqueuelen:0 
          RX bytes:0 (0.0 B)  TX bytes:866 (866.0 B)
```

**创建的相关参数介绍**

```bash
--image   #debug调试容器的镜像，最好是提前准备安装一些常用的调试工具
-it       #如果加上，临时容器创建完成后会直接进入容器命令行，如果没有自动进入可以敲几下回车，如果还是进不去可以使用kubectl exec的传统方式进入
--target  #与那个容器共享PID空间，如果不写可能在调试容器无法看到Pod中运行的进程，指定容器名称
```

**创建后Pod状态验证**

```bash
kubectl  describe pod test 
Name:         test
Namespace:    default
Priority:     0
Node:         192.168.10.54/192.168.10.54
Start Time:   Tue, 11 Jan 2022 20:11:55 +0800
Labels:       run=test
Annotations:  <none>
Status:       Running
IP:           10.100.4.240
IPs:
  IP:  10.100.4.240
Containers:
  test:  #这个就是指定--target的参数容器名称
    Container ID:   containerd://d2a4dd4868c59a7595d73183ee9a2d8e46de799088aa486125e4a7bec2557724
    Image:          192.168.10.254:5000/k8s/pause:3.5
    Image ID:       192.168.10.254:5000/k8s/pause@sha256:2f4b437353f90e646504ec8317dacd6123e931152674628289c990a7a05790b0
    Port:           <none>
    Host Port:      <none>
    State:          Running
      Started:      Tue, 11 Jan 2022 20:11:55 +0800
    Ready:          True
    Restart Count:  0
    Environment:    <none>
    Mounts:
      /var/run/secrets/kubernetes.io/serviceaccount from kube-api-access-dfmqp (ro)
Ephemeral Containers:  #以下为临时容器信息
  debugger-grk2l:
    Container ID:   containerd://f714f1132d1412fa4d94b1ab7f8cdb798533c4aebba81b2c9d733dab47cbc3ca
    Image:          192.168.10.254:5000/bash/busybox:latest
    Image ID:       192.168.10.254:5000/bash/busybox@sha256:62ffc2ed7554e4c6d360bce40bbcf196573dd27c4ce080641a2c59867e732dee
    Port:           <none>
    Host Port:      <none>
    State:          Terminated
      Reason:       Completed
      Exit Code:    0
      Started:      Tue, 11 Jan 2022 20:14:11 +0800
      Finished:     Tue, 11 Jan 2022 20:17:58 +0800
    Ready:          False
    Restart Count:  0
    Environment:    <none>
    Mounts:         <none>
```

**如何清理临时容器**

```bash
#生成环境不会单独创建Pod一般有控制器管理，直接删除debug的Pod让控制器重新创建Pod即可
kubectl delete pod mypod
```

### 2.通过Pod调试node节点

```bash
#创建示例
kubectl  debug node/192.168.10.51 -it --image=192.168.10.254:5000/bash/busybox

#创建完成后会进入Pod,Pod与宿主机共享各种命名空间，并且node节点的文件系统会挂载到Pod的/host目录中
/ # ls /host/
bin    dev    home   lib64  mnt    proc   run    srv    tmp    var
boot   etc    lib    media  opt    root   sbin   sys    usr

#退出不使用后Pod会结束，需要手动清理
kubectl  get po
NAME                                READY   STATUS      RESTARTS   AGE
node-debugger-192.168.10.51-l65b8   0/1     Completed   0          3m1s
```

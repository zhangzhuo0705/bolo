---
title: "k8s之Ingress详解"
date: 2022-03-20T18:54:27+08:00
lastmod: 2022-03-23T20:12:59+08:00
draft: false
description: "说明 Ingress 的作用与控制器架构，演示七层流量入口的配置方式。"
cover: "https://b3logfile.com/bing/20190224.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["Kubernetes"]
tags: ["Kubernetes", "nginx", "ingress"]
toc: true
---
# 一、Ingress介绍

ingress主要解决集群中东西流量的访问也就是外部客户端访问k8s内部服务的流量，具体架构图如下

![image-20220105194916747](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20220105194916747.png)

k8s如果使用Ingress功能，需要安装Ingress控制器，直接创建Ingress规则是没有任何效果的，官方维护的Ingress控制器有：

- AWS
- GCE
- nginx Ingress 控制器

# 二、Ingress控制器安装

## 2.1 安装Ingress nginx控制器

需要首先安装helm管理工具：https://github.com/helm/helm

Ingress nginx控制器官方：https://kubernetes.github.io/ingress-nginx/deploy/#using-helm

**首先安装helm**

```bash
[20:05:16 root@master01 ~]#ls
helm-v3.7.2-linux-amd64.tar.gz 
[20:05:40 root@master01 ~]#tar xf helm-v3.7.2-linux-amd64.tar.gz 
[20:05:59 root@master01 ~]#cp linux-amd64/helm /usr/bin/
#可以执行以下命令表示安装完成
[20:06:15 root@master01 ~]#helm version
version.BuildInfo{Version:"v3.7.2", GitCommit:"663a896f4a815053445eec4153677ddc24a0a361", GitTreeState:"clean", GoVersion:"go1.16.10"}
```

**安装ingress控制器**

由于Ingress资源的api版本进行了很多次调整，所以如果k8s集群版本低于1.19,请安装3.X版本或较低版本的ingress控制器，创建ingress时api版本也要正确填写

官方说明：https://kubernetes.github.io/ingress-nginx/deploy/#running-on-kubernetes-versions-older-than-119

```bash
#添加官方仓库
[20:11:57 root@master01 ~]#helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
"ingress-nginx" has been added to your repositories

#由于我的k8s是1.17的版本所以需要调整控制器的版本
#下载4版本以下的包
helm pull ingress-nginx/ingress-nginx --version='<4'

#解压下载的压缩包
[20:14:42 root@master01 ~]#tar xf ingress-nginx-3.40.0.tgz -C /tmp/

#修改配置
[20:15:09 root@master01 tmp]#cd /tmp/ingress-nginx/

dnsPolicy: ClusterFirstWithHostNet  #修改dns策略
hostNetwork: true                   #使用hostnetwork，使用宿主机网络
kind: DaemonSet                     #部署方式使用ds控制器
nodeSelector:
     kubernetes.io/os: linux
     ingress-nginx: true            #添加一个nodeselector的标签
type: ClusterIP                     #svc类型改为ClusterIP 


#之后下载所需的镜像，上传到自己仓库修改镜像地址
ingress-nginx/controller
jettech/kube-webhook-certgen

#创建一个命名空间
[20:36:23 root@master01 ingress-nginx]#kubectl  create ns ingress-nginx
#创建ingress控制
[20:36:32 root@master01 ingress-nginx]#helm install ingress-nginx -n ingress-nginx .

#验证
[19:27:21 root@master01 ~]#kubectl  get po -n ingress-nginx 
NAME                             READY   STATUS    RESTARTS   AGE
ingress-nginx-controller-8742l   1/1     Running   1          46h
```

# 三、ingress使用

ingress的api版本历经过多次变化他们的配置项也不太一样分别是：

- extensions/v1beta1：1.16版本之前使用
- networking.k8s.io/v1beta1：1.19版本之前使用
- networking.k8s.io/v1：1.19版本之后使用

## 3.1 ingress版本区别

如果Kubernetes版本低于1.19 ，可以使用networking.k8s.io/v1beta1替代，配置可以参考下述的networking.k8s.io/v1beta1，只有backend配置不一样。

### 1.v1beta1基本使用

**示例文件**：

```yaml
apiVersion: networking.k8s.io/v1beta1  # api版本号
kind: Ingress                          # 资源类型
metadata:
  annotations:                         #一般一些nginx特性在此定义
    kubernetes.io/ingress.class: "nginx"  #使用那个ingress控制器，集群有多个可以选择
    nginx.ingress.kubernetes.io/rewrite-target: "/$1"  #nginx的rewrite功能
    nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"   #后端如果是https协议需要说明，默认http
  name: nginx                             #名称
spec:
  rules:   #一个Ingress可以配置多个rules
  - host: www.zhangzhuo.com  #域名配置，可以不写，匹配*， *.bar.com
    http:
      paths:   #相当于nginx的location配合，同一个host可以配置多个path / /abc
      - backend:    #后端svc定义
          serviceName: nginx-a  #svc名称
          servicePort: 80       #svc端口
        path: "/a/(.*)"         #匹配的路径
      - backend:
          serviceName: nginx-b
          servicePort: 80
        path: "/b/(.*)"
  tls:    #需要https加密
  - hosts:  #主机域名列表，可以配置多个
    - www.zhangzhuo.com
    - www.zhangzhuo1.com
    secretName: tls #secret证书文件，可以写多个
    secretName: tls1
```

### 2.v1基本使用

**示例文件**

```bash
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: nginx
  annotations:
    kubernetes.io/ingress.class: "nginx"  #使用那个ingress控制器，集群有多个可以选择
    nginx.ingress.kubernetes.io/rewrite-target: "/$1"  #nginx的rewrite功能
    nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"   #后端如果是https协议
spec:
  rules:    #一个Ingress可以配置多个rules
  - host: www.zhangzhuo.com   #域名配置，可以不写，匹配*， *.bar.com
    http: 
      paths:  #相当于nginx的location配合，同一个host可以配置多个path / /abc
      - pathType: Prefix
        path: "/"
        backend:  #后端svc定义
          service:  #service的定义
            name: nginx  #svc名称
            port:
              number: 80 #svc端口
  tls:    #需要https加密
  - hosts:  #主机域名列表，可以配置多个
    - www.zhangzhuo.com
    - www.zhangzhuo1.com
    secretName: tls #secret证书文件，可以写多个
    secretName: tls1
```

## 3.2 ingress-nginx使用

ingress-nginx是k8s官方维护的ingress项目，当然nginx官方也维护了一个自己的ingress名称为nginx-ingress。

ingress-nginx官方文档：https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/

**ingress-nginx有三种配置方式**

1. ConfigMap：使用Configmap在NGINX中设置全局配置，设置后对所有ingress规则生效。https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/
2. Annotations：如果您想要特定 Ingress 规则的特定配置，请使用此选项。https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
3. 自定义模板：当需要更具体的设置时，例如open_file_cache ，在无法通过 ConfigMap 更改配置时调整监听选项。https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/custom-template/

### 1.域名重定向Redirect

官方说明：https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/#permanent-redirect

在 Nginx 作为代理服务器时，Redirect 可用于域名的重定向，比如访问 old.com 被重定向到 new.com。Ingress 可以更简单的实现 Redirect 功能，接下来用 www.zhangzhuo.com 作为旧域名， www.baidu.com 作为新域名进行演示：

**相关配置项**：

- permanent-redirect：重定向到的域名
- permanent-redirect-code：重定向代码，不配置默认301(永久重定向,如有其他原因可自行配置)

```yaml
apiVersion: networking.k8s.io/v1beta1
kind: Ingress
metadata:
  name: www.zhangzhuo.com
  namespace: default
  annotations:
    kubernetes.io/ingress.class: "nginx"  #这里是ingress规则选用的那个ingress控制器，如果设置ingress-nginx为默认控制器可不写
    nginx.ingress.kubernetes.io/permanent-redirect: https://www.baidu.com #重定向后的新域名
    nginx.ingress.kubernetes.io/permanent-redirect-code: '301'  #重定向http状态码
spec:
  rules:   
  - host: www.zhangzhuo.com
    http: 
      paths:
      - pathType: Prefix
        path: "/"
        backend:
          serviceName: service-v1
          servicePort: 80
```

**验证**

```bash
[16:08:09 root@node-1 ingress]#curl www.zhangzhuo.com -I
HTTP/1.1 301 Moved Permanently  #301重定向
Date: Sun, 20 Mar 2022 08:08:20 GMT
Content-Type: text/html
Content-Length: 162
Connection: keep-alive
Location: https://www.baidu.com #定向到的新域名
```

### 2.前后端分离Rewrite

官方示例：https://kubernetes.github.io/ingress-nginx/examples/rewrite/

现在有2个服务分别是service-v1与service-v2服务假设他们一个是后端服务一个是前端服务，访问service-v1需要访问/api-a，访问service-v2需要访问/api-b,俩个服务的请求地址都是/index.html，如果不使用Rewrite则所有请求默认会返回404。

**相关配置项**：

- nginx.ingress.kubernetes.io/rewrite-target: 重定向配置

**示例如下**：

```yaml
apiVersion: networking.k8s.io/v1beta1
kind: Ingress
metadata:
  name: www.zhangzhuo.com
  namespace: default
  annotations:
    kubernetes.io/ingress.class: "nginx"
    nginx.ingress.kubernetes.io/rewrite-target: "/$2"
spec:
  rules:   
  - host: www.zhangzhuo.com
    http: 
      paths:
      - pathType: Prefix
        path: "/api-a(/|$)(.*)"
        backend:
          serviceName: service-v1
          servicePort: 80
      - pathType: Prefix
        path: "/api-b(/|$)(.*)"
        backend:
          serviceName: service-v2
          servicePort: 80
```

**测试**

```bash
[16:45:41 root@node-1 ingress]#curl http://www.zhangzhuo.com/api-a
aaaaaaaaaaaaaaa
[16:46:08 root@node-1 ingress]#curl http://www.zhangzhuo.com/api-b
bbbbbbbbbbbbbbb
```

### 3.错误代码重定向

这里的错误代码重定向分为全局设置与某个ingress设置

**开启全局ingress示例**

错误代码重定向功能需要使用helm重新部署ingress-nginx控制器部署步骤如下：

```bash
#修改valume.yml文件
defaultBackend:
  ## 
  enabled: true #开启这个功能                          
  image:
    repository: 192.168.10.254:5000/defaultbackend-amd64  #配置镜像
    tag: "1.5"
#更新ingress
[16:54:47 root@nexus ingress-nginx]#helm upgrade -n ingress-nginx ingress-nginx .
#验证是否生成一个新Pod
[16:55:28 root@nexus ingress-nginx]#kubectl get pod -n ingress-nginx 
NAME                                            READY   STATUS    RESTARTS   AGE
ingress-nginx-controller-nbxgf                  1/1     Running   0          17s
ingress-nginx-defaultbackend-58d87944cb-jd5tj   1/1     Running   0          30s
```

更新完成后访问一个不存在的页面会跳转到Error Server中的页面。

```bash
[16:56:34 root@node-1 ingress]#curl http://www.zhangzhuo.com/
default backend - 404
```

**设置某个ingress的错误重定向会覆盖全局设置，示例如下**

- nginx.ingress.kubernetes.io/default-backend: 默认后端service名称
- nginx.ingress.kubernetes.io/custom-http-errors: 那些错误代理重定向到默认后端svc

```bash
apiVersion: networking.k8s.io/v1beta1
kind: Ingress
metadata:
  name: zhangzhuo-v1
  namespace: default
  annotations:
    kubernetes.io/ingress.class: "nginx"
    nginx.ingress.kubernetes.io/default-backend: 'service-v2'
    nginx.ingress.kubernetes.io/custom-http-errors: "404,415"
spec:
  rules:   
  - host: www.zhangzhuo.com
    http: 
      paths:
      - pathType: Prefix
        path: "/a"
        backend:
          serviceName: service-v1
          servicePort: 80
```

### 4.使用ssl加密

生产环境对外的服务，一般需要配置https协议，使用Ingress也可以非常方便的添加https的证书。 由于我们是学习环境，并没有权威证书，所以需要使用OpenSSL生成一个测试证书。如果是生产环境，证书为在第三方公司购买的证书，无需自行生成：

```bash
#生成证书
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout com.key -out com.crt -subj "/CN=www.zhangzhuo.com"
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout org.key -out org.crt -subj "/CN=www.zhangzhuo.org"
#创建证书secret
kubectl create secret tls www.zhangzhuo.com --cert=com.crt --key=com.key
kubectl create secret tls www.zhangzhuo.org --cert=org.crt --key=org.key
```

**添加ingress的TLS配置**

如果在ingress中设置tls,即默认的http会被强制重定向到https，http即不可访问,如果需要http与https同时可以使用可以设置

- nginx.ingress.kubernetes.io/ssl-redirect: "false" ：禁用强制重定向，这样可以同时使用http与https

```yaml
apiVersion: networking.k8s.io/v1beta1
kind: Ingress
metadata:
  name: www.zhangzhuo.com
  namespace: default
  annotations:
    kubernetes.io/ingress.class: "nginx"
    nginx.ingress.kubernetes.io/ssl-redirect: "false"
spec:
  rules:   
  - host: www.zhangzhuo.com
    http: 
      paths:
      - pathType: Prefix
        path: "/"
        backend:
          serviceName: service-v1
          servicePort: 80
  - host: www.zhangzhuo.org
    http: 
      paths:
      - pathType: Prefix
        path: "/"
        backend:
          serviceName: service-v2
          servicePort: 80
  tls:
  - hosts:
    - www.zhangzhuo.com  #证书所授权的域名列表
    - www.zhangzhuo.org
    secretName: www.zhangzhuo.com #证书的Secret名字,自己匹配
    secretName: www.zhangzhuo.org
```

可以看到Ingress添加TLS配置也非常简单，只需要在spec下添加一个tls字段即可：

- hosts：证书所授权的域名列表
- secretName：证书的 Secret 名字
- ingressClassName: ingress class 的名字，1.22+需要配置

### 5.匹配请求头

注意Ingress annotations的nginx.ingress.kubernetes.io/server-snippet配置。Snippet 配置是专门用于一些复杂的Nginx配置，和Nginx配置通用，在这里模拟下移动端与电脑端访问同一个域名转发到不同服务。

```yaml
apiVersion: networking.k8s.io/v1beta1
kind: Ingress
metadata:
  name: www.zhangzhuo.com
  namespace: default
  annotations:
    kubernetes.io/ingress.class: "nginx"
    nginx.ingress.kubernetes.io/server-snippet: |
      set $agentflag 0;
        if ($http_user_agent ~* "(Android|IPhone)" ){ #如果是安卓与IPhone访问会重定向到www.baidu.com的新网站
          set $agentflag 1;
        }
        if ( $agentflag = 1 ) {
          return 302 http://www.baidu.com;
        }
spec:
  rules:   
  - host: www.zhangzhuo.com
    http: 
      paths:
      - pathType: Prefix
        path: "/"
        backend:
          serviceName: service-v1
          servicePort: 80
```

**验证**：

```bash
[18:07:49 root@node-1 ingress]#curl www.zhangzhuo.com -I
HTTP/1.1 200 OK
aaaaaaaaaa
#模拟安卓访问
[18:07:59 root@node-1 ingress]#curl 'http://www.zhangzhuo.com/' -H 'User-Agent: Android'  -I
HTTP/1.1 302 Moved Temporarily
Location: http://www.baidu.com
```

### 6.基本认证使用

有些网站可能需要通过密码来访问，对于这类网站可以使用 Nginx 的 basic-auth 设置密码访 问，具体方法如下，由于需要使用 htpasswd 工具，所以需要安装httpd。

```bash
yum install httpd
#生成用户名密码
htpasswd -c auth zhangzhuo
cat auth 
zhangzhuo:$apr1$MWrO9I1q$.FXzcU6l.riRUGkKXyvVz1
#创建secret
kubectl create secret generic http-auth --from-file=auth
```

**创建包含密码认证的Ingress**：

- nginx.ingress.kubernetes.io/auth-type：认证类型，可以是 basic 和 digest
- nginx.ingress.kubernetes.io/auth-secret：密码文件的 Secret 名称
- nginx.ingress.kubernetes.io/auth-realm：需要密码认证的消息提醒

```yaml
apiVersion: networking.k8s.io/v1beta1
kind: Ingress
metadata:
  name: www.zhangzhuo.com
  namespace: default
  annotations:
    kubernetes.io/ingress.class: "nginx"
    nginx.ingress.kubernetes.io/auth-type: basic  #认证类型
    nginx.ingress.kubernetes.io/auth-secret: http-auth  #认证密码secret资源名称
    nginx.ingress.kubernetes.io/auth-realm: "请输入用户名密码:"  #需要密码认证的消息提醒
spec:
  rules:   
  - host: www.zhangzhuo.com
    http: 
      paths:
      - pathType: Prefix
        path: "/"
        backend:
          serviceName: service-v1
          servicePort: 80
```

### 7.配置黑名单/白名单

**黑名单配置详解**

配置黑名单禁止某一个或某一段 IP，需要在 Nginx Ingress的ConfigMap中配置，比如将 192.168.10.11（多个配置逗号分隔）添加至黑名单。

configmap官方配置文档说明：https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/

```bash
[18:20:07 root@nexus ingress-nginx]#vim values.yaml
config:
  block-cidrs: 192.168.10.11
#更新验证
[18:23:02 root@nexus ingress-nginx]#helm upgrade -n ingress-nginx ingress-nginx .
[18:23:27 root@node-1 ingress]#curl www.zhangzhuo.com -I
HTTP/1.1 403 Forbidden  #这里拒绝访问
```

**白名单配置详解**

白名单表示只允许某个IP可以访问，直接在yaml文件中配置即可（也可以通过ConfigMap配置），比如只允许192.168.10.128访问，只需要添加一个nginx.ingress.kubernetes.io/whitelist-source-range 注释即可：

```yaml
apiVersion: networking.k8s.io/v1beta1
kind: Ingress
metadata:
  name: www.zhangzhuo.com
  namespace: default
  annotations:
    kubernetes.io/ingress.class: "nginx"
    nginx.ingress.kubernetes.io/whitelist-source-range: 192.168.10.1 #配置白名单
spec:
  rules:   
  - host: www.zhangzhuo.com
    http: 
      paths:
      - pathType: Prefix
        path: "/"
        backend:
          serviceName: service-v1
          servicePort: 80
```

### 8.速率限制

有时候可能需要限制速率以降低后端压力，或者限制单个IP每秒的访问速率防止攻击。此时可以使用 Nginx的rate limit进行配置。

**相关的设置有**

```
#限制每秒的连接，单个 IP： 
nginx.ingress.kubernetes.io/limit-rps

#限制每分钟的连接，单个 IP： 
nginx.ingress.kubernetes.io/limit-rpm 

#限制客户端每秒传输的字节数，单位为 K，需要开启 proxy-buffering： 
nginx.ingress.kubernetes.io/limit-rate 

#速率限制白名单 
nginx.ingress.kubernetes.io/limit-whitelist
```

首先没有加速率限制，使用ab进行访问，Failed为0：

```bash
[18:32:23 root@node-1 ingress]#ab -c 10 -n 100 http://www.zhangzhuo.com/ | grep requests
Complete requests:      100
Failed requests:        0
```

添加速率限制，限制只能有一个连接，只需要添加 nginx.ingress.kubernetes.io/limit-connections 为 1 即可：

```bash
apiVersion: networking.k8s.io/v1beta1
kind: Ingress
metadata:
  name: www.zhangzhuo.com
  namespace: default
  annotations:
    kubernetes.io/ingress.class: "nginx"
    nginx.ingress.kubernetes.io/limit-connections: "1"
spec:
  rules:   
  - host: www.zhangzhuo.com
    http: 
      paths:
      - pathType: Prefix
        path: "/"
        backend:
          serviceName: service-v1
          servicePort: 80
```

**验证**

```bash
[18:33:40 root@node-1 ingress]#ab -c 10 -n 100 http://www.zhangzhuo.com/ | grep requests
Complete requests:      100
Failed requests:        91
```

### 9.实现灰度或者金丝雀发布

**首先创建一个v1版本的ingress**

```yaml
apiVersion: networking.k8s.io/v1beta1
kind: Ingress
metadata:
  name: zhangzhuo-v1
  namespace: default
  annotations:
    kubernetes.io/ingress.class: "nginx"
spec:
  rules:   
  - host: www.zhangzhuo.com
    http: 
      paths:
      - pathType: Prefix
        path: "/"
        backend:
          serviceName: service-v1
          servicePort: 80
```

**创建v2版本的ingress**

创建 v2 版本的 Ingress 时，需要添加两个注释，

- nginx.ingress.kubernetes.io/canary:表明是灰度环境
- nginx.ingress.kubernetes.io/canary-weight:表明切多少流量到该环境，本示例为 10%

```yaml
apiVersion: networking.k8s.io/v1beta1
kind: Ingress
metadata:
  name: zhangzhuo-v2
  namespace: default
  annotations:
    kubernetes.io/ingress.class: "nginx"
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-weight: "10"
spec:
  rules:   
  - host: www.zhangzhuo.com
    http: 
      paths:
      - pathType: Prefix
        path: "/"
        backend:
          serviceName: service-v2
          servicePort: 80
```

**验证**

```bash
for i in {1..100};do curl www.zhangzhuo.com >>sum;done
[18:50:26 root@node-1 ingress]#cat sum | sort | uniq -c
     87 aaaaaaaaaaaaaaa
     13 bbbbbbbbbbbbbbb
#比例大概为1:9
```

### 10.代理后端服务是https协议

如果后端服务是https协议，需要使用nginx.ingress.kubernetes.io/backend-protocols声明后端服务是https。这里代理K8s的web控制台作为示例。代理后访问默认会强制跳转到https协议，返回的证书也是服务本身的证书。

```bash
apiVersion: networking.k8s.io/v1beta1
kind: Ingress
metadata:
  name: kubernetes-dashboard
  namespace: kubernetes-dashboard
  annotations:
    kubernetes.io/ingress.class: "nginx"
    nginx.ingress.kubernetes.io/rewrite-target: "/$1"
    nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"  #这里声明后端服务是https协议，不写默认http
spec:
  rules:   
  - host: 
    http: 
      paths:
      - pathType: Prefix
        path: "/dashboard/(.*)"
        backend:
          serviceName: kubernetes-dashboard
          servicePort: 443
```

## 3.3 ingress-nginx四层代理

在新版本的nginx也引入了四层代理的概念，可直接代理TCP与UDP协议，在ingress-nginx也可以通过四层代理实现service的代理，实现方式如下：

官方文档：https://kubernetes.github.io/ingress-nginx/user-guide/exposing-tcp-udp-services/

首先在使用helm部署ingress-nginx之后，需修改nginx启动资源的启动参数添加`--tcp-services-configmap`、`--udp-services-configmap`的配置启用四层代理，通过修改配置configmap资源进行四层代理的配置。

### 1.TCP代理

在ingress-nginx-controller中添加`--tcp-services-configmap`启动参数

```bash
args:
            - /nginx-ingress-controller
            - '--publish-service=$(POD_NAMESPACE)/ingress-nginx-controller'
            - '--tcp-services-configmap=$(POD_NAMESPACE)/tcp-configmap-example'  #主要是这里
            - '--election-id=ingress-controller-leader'
            - '--ingress-class=nginx'
            - '--configmap=ingress-nginx/ingress-nginx-controller'
            - '--validating-webhook=:8443'
            - '--validating-webhook-certificate=/usr/local/certificates/cert'
            - '--validating-webhook-key=/usr/local/certificates/key'
#参数说明如下
--tcp-services-configmap=$(POD_NAMESPACE)/  这里为固定，表示tcp配置选择ingress-nginx安装的命名空间的configmap资源
tcp-configmap-example  为configmap资源的名称
```

创建configmap配置文件

```bash
[19:52:49 root@node-1 ~]#cat tcp-configmap-example.yaml 
apiVersion: v1
kind: ConfigMap
metadata:
  name: tcp-configmap-example
data:
  9000: "default/kubernetes:443"
  9001: "kubernetes-dashboard/kubernetes-dashboard:443"
[19:52:54 root@node-1 ~]#kubectl apply -f tcp-configmap-example.yaml -n ingress-nginx
#主要配置参数介绍
代理k8s内部svc资源
9000 对外暴露的端口
"命名空间/svc名称:svc端口"
```

所有的TCP代理配置都可以写入到这个configmap资源当中，修改后ingress-nginx会自动更新配置，根据配置暴露相应的端口，如果配置错误则不会进行变更。

### 2.UDP代理

在ingress-nginx-controller中添加`--udp-services-configmap`启动参数

```bash
args:
            - /nginx-ingress-controller
            - '--publish-service=$(POD_NAMESPACE)/ingress-nginx-controller'
            - '--tcp-services-configmap=$(POD_NAMESPACE)/tcp-configmap-example'  
            - '--udp-services-configmap=$(POD_NAMESPACE)/udp-configmap-example'  #主要是这里
            - '--election-id=ingress-controller-leader'
            - '--ingress-class=nginx'
            - '--configmap=ingress-nginx/ingress-nginx-controller'
            - '--validating-webhook=:8443'
            - '--validating-webhook-certificate=/usr/local/certificates/cert'
            - '--validating-webhook-key=/usr/local/certificates/key'
#参数说明如下
--udp-services-configmap=$(POD_NAMESPACE)/  这里为固定，表示tcp配置选择ingress-nginx安装的命名空间的configmap资源
udp-configmap-example  为configmap资源的名称
```

创建configmap配置文件

```bash
[20:07:42 root@node-1 ~]#vim udp-configmap-example.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: udp-configmap-example
data:
  53: "kube-system/kube-dns:53"
[20:07:32 root@node-1 ~]#kubectl apply -f udp-configmap-example.yaml -n ingress-nginx
#主要配置参数介绍
代理k8s内部svc资源
9000 对外暴露的端口
"命名空间/svc名称:svc端口"
```

## 3.4 ingress-nginx监控

这里只介绍prometheus部署在k8s集群外面，如何监控ingress-nginx。

官方文档：https://kubernetes.github.io/ingress-nginx/user-guide/monitoring/

安装prometheus与grafana这里省略，直接进行prometheus配置解析。

首先需要在ingress中打开监控选择(默认关闭),并且配置annotations注释用于Pod发现。

```bash
#修改helm的values.yaml文件
[20:56:22 root@nexus ingress-nginx]#vim values.yaml 
260   podAnnotations:      #配置注释                               
261      prometheus.io/scrape: "true"
262      prometheus.io/port: "10254"
441   metrics:                                                                                           
442     port: 10254
443     # if this port is changed, change healthz-port: in extraArgs: accordingly
444     enabled: true  #改为true
#更新
[21:09:05 root@nexus ingress-nginx]#helm upgrade -n ingress-nginx ingress-nginx .
```

**配置prometheus**

官方示例文件：https://github.com/kubernetes/ingress-nginx/blob/strongjz-patch-4/deploy/prometheus/prometheus.yaml

```bash
scrape_configs:
- job_name: 'ingress-nginx-endpoints'
  kubernetes_sd_configs:
  - role: pod
    api_server: https://192.168.10.11:6443  #kube-apiserver的地址和端口
    bearer_token_file: k8s.token  #kube-apiserver的认证token
    tls_config:  #ca证书认证
      insecure_skip_verify: true
    namespaces:  #选择的命名空间名称，也就是ingress-nginx安装的命名空间
      names:
      - ingress-nginx
  relabel_configs:     #以下为官方配置照搬
  - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
    action: keep
    regex: true
  - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scheme]
    action: replace
    target_label: __scheme__
    regex: (https?)
  - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
    action: replace
    target_label: __metrics_path__
    regex: (.+)
  - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
    action: replace
    target_label: __address__
    regex: ([^:]+)(?::\d+)?;(\d+)
    replacement: $1:$2
  - source_labels: [__meta_kubernetes_service_name]
    regex: prometheus-server
    action: drop
```

**重启服务即可**

grafana官方模板：https://github.com/kubernetes/ingress-nginx/tree/strongjz-patch-4/deploy/grafana/dashboards

## 3.5 ingress-nginx链路追踪

官方文档：https://kubernetes.github.io/ingress-nginx/user-guide/third-party-addons/opentracing/#jaeger

官方推荐的链路追踪插件为Zipkin或者Jaeger。这里我们选用Jaeger。

官方部署示例文件:https://raw.githubusercontent.com/jaegertracing/jaeger-kubernetes/master/all-in-one/jaeger-all-in-one-template.yml

```bash
#启动后状态
[19:40:25 root@node-1 ~]#kubectl  get svc
NAME               TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)                               AGE
jaeger-agent       ClusterIP   None             <none>        5775/UDP,6831/UDP,6832/UDP,5778/TCP   7m41s
jaeger-collector   ClusterIP   172.20.240.253   <none>        14267/TCP,14268/TCP,9411/TCP          7m41s
jaeger-query       NodePort    172.20.89.229    <none>        80:34775/TCP                          7m41s
kubernetes         ClusterIP   172.20.0.1       <none>        443/TCP                               24h
zipkin             ClusterIP   None             <none>        9411/TCP                              7m41s
[19:40:31 root@node-1 ~]#kubectl  get pod 
NAME                      READY   STATUS    RESTARTS   AGE
jaeger-665947cf55-7xh46   1/1     Running   0          11m
#访问地址
http://node的IP地址:jaeger-query的nodeport端口
```

**ingress设置**

需要修改ingress的configmap文件，添加相应参数

```bash
[19:54:55 root@nexus ingress-nginx]#kubectl get cm -n ingress-nginx ingress-nginx-controller -oyaml
apiVersion: v1
data:
  allow-snippet-annotations: "true"
  enable-opentracing: "true"   #开启链路追踪
  jaeger-collector-host: jaeger-agent.default.svc.cluster.local  #链路追踪的svc名称
kind: ConfigMap
metadata:
  name: ingress-nginx-controller
  namespace: ingress-nginx
#更新完成后需手动重启ingress资源Pod之后可以正常采集链路信息
#请求下ingress的资源即可在jaeger查询到链路信息
```

---
title: "Docker镜像详解"
date: 2023-07-14T17:59:03+08:00
draft: false
description: "讲解 Docker 镜像的分层结构，演示 Commit 与 Dockerfile 构建镜像的方法。"
cover: "https://b3logfile.com/bing/20230502.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["Docker"]
tags: ["Docker"]
toc: true
---
# 一、Docker镜像介绍

Docker容器镜像是Docker中的一个重要概念，它是一个轻量级、独立运行的软件包，包含了运行应用所需的一切：代码、运行时环境、系统工具、系统库等。Docker容器镜像是由一个或多个只读的文件系统层组成的，每个文件系统层都包含了一个或多个文件或目录的变更。这种分层的结构使得容器镜像可以高效地共享和复用。Docker容器镜像可以通过Dockerfile文件定义，Dockerfile是一个文本文件，包含了一系列的指令，用于构建容器镜像。通过运行Dockerfile中的指令，Docker可以自动化地构建容器镜像，并将其保存为一个可用的镜像文件。Docker容器镜像可以通过Docker Hub等镜像仓库进行分享和分发。用户可以从镜像仓库中下载所需的镜像，然后在本地运行该镜像创建一个容器实例。总结来说，Docker容器镜像是一个轻量级、独立运行的软件包，包含了运行应用所需的一切。它可以通过Dockerfile文件定义，并可以通过镜像仓库进行分享和分发。

## 1.1 Docker容器镜像没有内核

从镜像大小上面来说，一个比较小的镜像只有十几MB，而内核文件需要一百多兆， 因此镜像里面是没有内核的，镜像在被启动为容器后将直接使用宿主机的内核，而镜像本身则只提供相应的rootfs，即系统正常运行所必须的用户空间的文件系统，比如/dev/，/proc，/bin，/etc 等目录，所以容器当中基本是没有 /boot目录的，而/boot当中保存的就是与内核相关的文件和目录。

```bash
#查看本机内核
[18:55:22 root@docker ~]#uname -r
4.15.0-140-generic
#启动容器且查看容器内核
[18:55:25 root@docker ~]#docker run -it --rm --name centos7 centos:7
[root@e592cd81d362 /]# uname -r
4.15.0-140-generic
[root@e592cd81d362 /]# ll /boot
ls: cannot access /boot: No such file or directory
```

**为什么没有内核？**

由于容器启动和运行过程中是直接使用了宿主机的内核，所以没有直接调用过物理硬件，所以也不会涉及到硬件驱动，因此也用不上内核和驱动，另外有内核的那是虚拟机。

# 二、构建镜像

Docker镜像可通过多种方式进行构建，分别有

- 使用Dockerfile这是最常见和推荐的方法。通过编写一个Dockerfile文件，定义镜像的构建步骤和配置，然后使用`docker build`命令来构建镜像。
- 使用Docker Commit这种方法可以在运行容器的基础上进行镜像构建。首先，通过`docker run`命令创建一个容器，并在其中进行一些配置和操作。然后，使用`docker commit`命令将该容器的状态保存为一个新的镜像。
- 使用Docker BuildKit是一种构建镜像的高级方法，它提供了更多的功能和选项。它支持使用多个Dockerfile文件、并行构建、缓存管理等特性。要使用BuildKit，需要在`DOCKER_BUILDKIT=1`环境变量下运行`docker build`命令。

## 2.1 Docker Commit

这种方式构建容器镜像一般用来调试镜像，很少用于生产。主要是把正在运行的容器提交为镜像。默认情况下，正在提交的容器及其进程将在提交映像时暂停。这降低了在创建提交的过程中遇到数据损坏的可能性。具体命令如下

```sh
docker commit 参数 运行的容器名称或者id 提交后的镜像名称
```

**参数如下：**

- -a：作者信息，可选
- -c：将 Dockerfile 指令应用到创建的镜像
- -m：提交信息
- -p：在提交是是否暂停容器运行，默认为true

**示例：**

```bash
#下载一个镜像
docker pull alpine:latest
#启动容器
docker run -it -d --name alpine alpine:latest sleep 300000000
#进入容器
docker exec -it alpine sh
#容器内安装nginx
apk add nginx
#退出容器终端提交镜像
docker commit -m "nginx" -a "zhangzhuo" -c "EXPOSE 80" -c "WORKDIR /etc/nginx" -c 'CMD ["nginx","-c","/etc/nginx/nginx.conf"]' 496886e43671 nginx:alpine
#使用新镜像启动容器
docker run -it -d --name nginx -p 80:80 nginx:alpine
#验证
curl 127.0.0.1
```

## 2.2 DockerFile

DockerFile 可以说是一种可以被 Docker 程序解释的脚本，DockerFile 是由一条条的命令组成的，每条命令对应linux下面的一条命令，Docker程序将这些DockerFile指令再翻译成真正的linux命令，其有自己的书写方式和支持的命令， Docker 程序读取 DockerFile 并根据指令生成 Docker 镜像，相比手动制作镜像的方式，DockerFile 更能直观的展示镜像是怎么产生的，有了写好的各种各样 DockerFile 文件，当后期某个镜像有额外的需求时，只要在之前的 DockerFile 添加或者修改相应的操作即可重新生成新的 Docke 镜像，避免了重复手动制作镜像的麻烦，具体如下：

官方文档：https://docs.docker.com/engine/reference/builder/

### 1.文件指令

Dockerfile文件的内部指令如下：

**基础：**

- `FROM`：在整个dockfile文件中，除了解析器指令、注释和全局范围的ARG之后之外的第一行应该就是FROM，用于指定父镜像
- `ADD`：用于添加宿主机本地的文件、目录、压缩等资源到镜像里面去，会自动解压tar.gz格式的压缩包，不会自动解压zip
- `COPY`：用于添加宿主机本地的文件、目录、压缩等资源到镜像里面去，不会解压任何压缩包
- `ENV`：设置容器环境变量，该值将存在于构建阶段中所有后续指令的环境中，并且也可以在许多指令中内联替换该值将被解释为其他环境变量
- `USER`：指定运行操作的用户，之后容器启动时运行的程序将会使用设置的用户运行
- `VOLUME`：定义volume，也就是创建目录
- `WORKDIR`：用于定义工作目录，也就是容器镜像运行的目录，也是进入容器终端的默认目录
- `RUN`：执行shell命令，但是一定要以非交互式的方式执行
- `MAINTAINER`：镜像的作者信息
- `LABEL`：设置镜像的属性标签
- `EXPOSE`：设置容器在运行时监听指定的网络端口。您可以指定端口是侦听TCP还是UDP，如果不指定协议，则默认为TCP，实际上并未发布端口，他提供运维人员一个类似与标识的内容。
- `CMD`：镜像启动为一个容器时候的默认命令,空格需要使用`,`隔开，如：CMD ["/bin/bash","sleep","30000"]
- `ENTRYPOINT`：也可以用于定义容器在启动时候默认执行的命令或者脚本，如果是和CMD命令混合使用的时候，会将CMD的命令当做参数传递给ENTRYPOINT后面的脚本，可以在脚本中对参数做判断并相应的容器初始化操作。

**高级：**

- `STOPSIGNAL`：设置将发送到容器以退出的系统调用信号，如SIGKILL。
- `HEALTHCHECK`：设置容器健康检查。

### 2.FROM

该`FROM`指令初始化一个新的构建阶段并为后续指令设置基础映像。因此，有效`Dockerfile`必须以指令开始`FROM`。

- ARG是FROM中可能位于前面的唯一指令Dockerfile。
- `FROM`可以在单个映像中出现多次`Dockerfile`以创建多个映像或使用一个构建阶段作为另一个构建阶段的依赖项。只需记下每个新指令之前提交的最后一个映像ID输出即可`FROM`。每条`FROM`指令都会清除先前指令创建的任何状态。
- `AS name`（可选）可以通过添加到指令来为新的构建阶段指定名称`FROM`。`FROM`该名称可以在后续和说明中使用`COPY --from=<name>`来引用此阶段构建的图像。

**AS的使用：**

1.分层构建

在上面生成软件包，在下面其他镜像使用上面生成的软件包

```dockerfile
FROM golang:1.20-alpine AS gobin
WORKDIR /src
COPY . .
RUN go build -o service

FROM alpine:latest
WORKDIR /app
#拷贝上一个from中构建的二进制文件
COPY --from=gobin /src/service /app/
CMD ["./service","-content","ceshi"]
```

2.使用上个构建后的镜像继续后续步骤

在上层准备基础镜像，在下面直接使用这个镜像

```dockerfile
#准备git镜像
FROM alpine:latest AS git
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apk/repositories
RUN apk add git

#克隆代码
ARG CACHEBUST=1
FROM git AS dir
WORKDIR /src
RUN git clone http://10.202.41.200:30002/gogs/go-mod.git /src
```

### 3.RUN

用来在构建镜像时运行命令

`RUN --mount`此安装类型允许构建容器缓存编译器和包管理器的目录。

示例：

```bash
#缓存go包
RUN --mount=type=cache,target=/go go build -o service
```

### 4.HEALTHCHECK

该`HEALTHCHECK`指令告诉 Docker 如何测试容器以检查它是否仍在工作。当容器指定了健康检查时，它除了正常状态之外，还具有健康状态。这种状态最初是`starting`。每当健康检查通过时，它就会变成`healthy`（无论它之前处于什么状态）。连续失败一定次数后，就变成了`unhealthy`。

**相关参数如下**

- `--interval=`：探测间隔默认30s
- `--timeout=`：超时时间默认30s
- `--start-period=`：初始化时间默认0s
- `--retries=`：探测次数默认3

**示例：**

```dockerfile
FROM golang:1.20-alpine AS gobin
WORKDIR /src
COPY service .
RUN --mount=type=cache,target=/go  go build -o service

FROM alpine:latest
WORKDIR /app
COPY --from=gobin /src/service /app/
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apk/repositories
RUN apk add curl
CMD ["./service","-content","ceshi"]
HEALTHCHECK --interval=30s --timeout=3s CMD curl http://localhost:8080 &>/dev/null || exit 1
```

### 5.ARG

`ARG` 指令用于定义构建时的参数。这些参数可以在构建过程中使用，并且可以通过 `--build-arg` 参数进行传递。语法`ARG <name>[=<default value>]`其中，`<name>` 是参数的名称，`<default value>` 是可选的默认值。如果没有提供默认值，那么在构建时必须通过 `--build-arg` 参数显式地传递该参数,

`ARG` 指令定义的参数可以在 Dockerfile 中的任何位置使用，包括 `FROM`、`RUN`、`ENV`、`CMD` 等指令中。在使用参数时，可以通过 `${<name>}` 的方式引用参数的值。

**示例：**

```dockerfile
ARG galang_version=1.20-alpine 
ARG alpine_version=latest
FROM golang:${galang_version} AS gobin 
WORKDIR /src
COPY . .
RUN go build -o service

FROM alpine:${alpine_version}
WORKDIR /app
COPY --from=gobin /src/service /app/
CMD ["./service","-content","ceshi"]
```

## 2.3 docker build

该`docker build`命令从Dockerfile中构建Docker镜像。

### 1.使用.dockerignore文件

在执行docker build时如果`.dockerignore`文件存在。会查找这个文件中匹配的文件在执行ADD或者COPY时排除匹配到的文件。示例如下

```bash
#文件如下
Dockerfile  .dockerignore  go.mod  main.go
#.dockerignore内容
Dockerfile
*/temp*
**/*temp
!README.md
#dockerfile
FROM golang:1.20-alpine AS gobin
WORKDIR /src
COPY . .  #这里copy时不会拷贝这个文件
RUN  go build -o service

FROM alpine:latest
WORKDIR /app
COPY --from=gobin /src/service /app/
CMD ["./service","-content","ceshi"]
```

### 2.使用详解

- -t：指定构建后的镜像名称
- -f：指定构建使用的dockerfile文件
- --add-host：指定hosts解析

**示例**

```bash
docker build -t service:v2 -f Dockerfile --add-host=docker:10.180.0.1 .
```

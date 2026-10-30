---
title: "docker-compose"
date: 2023-07-17T11:32:39+08:00
draft: false
description: "讲解 docker-compose 的单机编排模型，演示多容器服务的配置与启动。"
cover: "https://b3logfile.com/bing/20220718.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["Docker"]
tags: ["Docker", "docker-compose"]
toc: true
---
# 一、docker-compose

当在宿主机启动较多的容器时候，如果都是手动操作会觉得比较麻烦而且容器出错,这个时候推荐使用docker单机编排工具docker-compose，docker-compose 是 docker 容器的一种单机编排服务，docker-compose 是一个管理多个容器的工具，比如可以解决容器之间的依赖关系，就像启动一个 nginx 前端服务的时候会调用后端的tomcat，那就得先启动tomcat，但是启动tomcat 容器还需要依赖数据库，那就还得先启动数据库，docker-compose 就可以解决这样的嵌套依赖关系，其完全可以替代docker run对容器进行创建、启动和停止。

docker-compose项目是Docker官方的开源项目，负责实现对Docker容器集群的快速编排，docker-compose将所管理的容器分为三层，分别是工程 （project），服务（service）以及容器（container）。

github 地址： https://github.com/docker/compose

以下演示使用docker-compose版本为2.29.1，可能docker-compose语法与之前版本不一致。

最新版本的docker服务客户端cli以及内置集成了docker-compose，使用命令为`docker compose`

官方二进制下载地址：https://github.com/docker/compose/releases

## 1.1 安装docker-compose

下载二进制赋予执行权限即可使用

```bash
#docker-compose version
Docker Compose version v2.19.1
```

## 1.2 docker-compose基础命令

官方文档：https://docs.docker.com/compose/reference/

具体子命令如下：

- docker-compose build：通过docker-compose.yml构建镜像
- docker-compose config：验证docker-compose.yml文件格式是否正常
- docker-compose create：创建服务，但并不启动
- docker-compose down：停止和删除所有容器、网络、镜像和卷
- docker-compose up：创建容器并运行
  
  - -d：后台运行，默认为前台运行
- docker-composes tart：启动服务
- docker-compose stop：停止服务
- docker-compose exec：进入指定容器终端
- docker-compose images：显示当前compose文件中的所有镜像
- docker-compose kill：强制终止运行中的容器
- docker-compose logs：查看运行中的容器日志
- docker-compose pause：暂停所有服务
- docker-compose unpause：取消暂停
- docker-compose port：查看端口
- docker-compose ps：列出所有运行中容器
- docker-compose pull：拉取镜像
- docker-compose push：推送镜像
- docker-compose restart：重启所有服务

命令说明

- 指定项目名称，默认将使用当前所在目录名称作为项目名。
- docker-compose.yml默认在当前目录寻找

**示例：**

首先创建一个简单的docker-compose.yml文件

```bash
services:
  nginx:
    build: nginx-web
    container_name: nginx
    ports:
      - "80:80"
  client:
    image: alpine:latest
    container_name: client
    command: sleep 3000
#且准备Dokcerfile
nginx-web/
├── Dockerfile
└── index.htlm
```

**命令示例**

```bash
#验证文件是否正常
docker-compose config
#构建镜像
docker-compose build
#拉取镜像
docker-compose pull
#推送镜像
docker-compose push
#创建服务不运行
docker-compose create
#启动服务
docker-compose start
#停止服务
docker-compose stopt
#重启服务
docker-compose restart
#删除服务，智能删除停止的服务
docker-compose rm
#创建运行服务
docker-compose up -d
#查看所有镜像
docker-compose images
#查看所有运行的容器
docker-compose ps
#进入容器终端
docker-compose exec -it nginx bash
#查看容器日志
docker-compose logs -f nginx
#查看端口
docker-compose port nginx 80
#停止删除所有容器
docker-compose down
```

# 二、docker-compose语法

docker-compose编排容器使用docker-compose.yml,这个文件有一定的语法规则，类似与k8s中资源文件，也使用yaml语法。具体如下：

## 2.1 services

用来定义一组容器。

**具体语法如下：**

- services: 最上级，必填参数
  - <service_name>: 下一级服务名称,可定义多个，一个表示一个容器
    - build：容器的镜像来源为构建，指定Dockerfile文件位置
    - image：容器使用的镜像，如果存在build参数则表示构建后的镜像名称
    - cpu_count：容器的可用CPU数
    - mem_limit：设置容器内存
    - command：会覆盖镜像中CMD中的指令
    - container_name：容器的名称，如果不写默认为`项目名称-服务名称-编号`
    - depends_on：这个服务依赖的服务，配置后这个服务将会在依赖的服务启动后启动
    - dns：自定义服务容器dns，可以用列表格式写多个
    - env_file：将变量文件内容导入容器,可以用列表格式写多个
      - 文件内容格式为：`ENV_NAME=ENV_VALUE`
    - environment：指定环境变量
      - 格式为：`ENV_NAME: ENV_VALUE`
    - expose：定义容器的公开端口，可以用列表格式写多个
    - annotations：指定服务注释，可以用列表格式写多个
    - extra_hosts：在容器hosts添加额外解析，可以用列表格式写多个
      - 格式为`name:ip`
    - healthcheck：健康检查以确定容器服务健康的。这将覆盖服务的Docker镜像设置的HEALTHCHECK指令
    - hostname：定义容器内部主机名称
    - networks：定义容器使用的网络
    - ports：配置端口映射
    - privileged：配置为特权容器，默认false
    - pull_policy：镜像拉取策略
      - always：始终从仓库拉取
      - never：使用本地缓存
      - missing：当本地缓存不存在时拉取镜像
      - build：构建镜像
    - restart：定义容器重启策略
      - no：任何情况下不会重启容器，默认
      - always：始终重启容器
      - on-failure：如果程序的退出代码错误会重新启动容器
    - runtime：指定容器运行时，默认runc
    - working_dir：更改容器工作目录
    - volumes：容器文件挂载

示例配置：

```yaml
services:
  nginx:
    image: nginx-web:latest
    build: nginx-web
    cpu_count: 1
    env_file: env
    environment:
      jenkins: ceshi
    container_name: nginx
    expose:
      - 80
    annotations: 
      - app=nginx
    extra_hosts:
      - "zhangzhuo:127.0.0.1"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost"]
      interval: 10s
      timeout: 10s
      retries: 3
      start_period: 30s
    hostname: nginx
    mem_limit: 1G
    ports:
      - 80:80
    pull_policy: build
    restart: unless-stopped
    volumes:
      - /etc/hosts:/hosts:ro
  client:
    image: alpine:latest
    container_name: client
    command: sleep 3000
    depends_on: 
      - nginx
```

### 1.depends_on

这个参数有俩种写法，如下：

**写法1：**

```yaml
services:
  client:
    image: docker.gridsumdissector.com/gai/alpine:latest
    container_name: client
    command: sleep 3000 
    depends_on:
      - nginx
      - db
```

表示：

- 服务创建时：在nginx与db服务创建后进行创建client服务
- 服务删除时：client在nginx与db服务删除前进行删除

**写法2：**

```bash
services:
  client:
    image: docker.gridsumdissector.com/gai/alpine:latest
    container_name: client
    command: sleep 3000
    depends_on: 
      nginx: 
        restart: true
        condition: service_started
```

表示：client服务依赖nginx服务，具体参数意义如下

- restart：当更新依赖项服务重启依赖服务时，也重启这个服务，默认为true
- condition：当依赖服务满足依赖条件时才启动这个服务
  - service_started：依赖服务启动后
  - service_healthy：依赖服务健康检查通过后

### 2.healthcheck

```bash
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost"]
  interval: 1m30s
  timeout: 10s
  retries: 3
  start_period: 40s
  disable: true
```

参数：

- interval：多久执行一次
- timeout：超时时间
- retries：连续检测失败几次判定为失败
- start_period：探测开始的等待时间
- disable：关闭检测，默认为false

### 3.volumes

```yaml
volumes:
      - VOLUME:CONTAINER_PATH:ACCESS_MODE
```

参数介绍：

- `VOLUME`：可以是docker卷名称也可以是主机文件路径
- `CONTAINER_PATH`：挂载到容器中路径
- `ACCESS_MODE`：设置挂载权限
  - `rw`：读写权限（默认）
  - `ro`：只读权限

## 2.2 networks

可以在docker-compose文件中定义使用自己创建的网络，正常情况下如果不定义docker-compose也会自动创建网络而不是使用默认的docker0网络，自己创建的网络一般也为桥接网络。

```yaml
#定义
networks:
  front-tier:
  back-tier:
    ipam:
      config:
        - subnet: 192.168.20.0/24
          gateway: 192.168.20.254
#使用
services:
  nginx:
    image: nginx:latest
    networks:
      - front-tier
      - back-tier
```

注意：每次使用`docker-compose down`删除服务时定义的网络也会被删除

## 2.3 volumes

卷是docker中内置的为容器提供持久化数据的存储概念，默认情况下如果无其他配置使用本地卷。

本地卷：

```yaml
volumes:
  local:
```

nfs卷：

```yaml
volumes:
  nfs:
    driver_opts:
      type: "nfs"
      o: "nfsvers=4.1,addr=10.202.43.240,mountport=2049"
      device: ":/data1/nfs"
```

smb卷：

```yaml
volumes:
  smb:
    driver_opts:
      type: "cifs"
      o: "username=zhangzhuo,password=123456"
      device: "//10.202.43.240/share"
```

使用：

```yaml
client:
    image: docker.gridsumdissector.com/gai/alpine:latest
    container_name: client
    command: sleep 3000
    volumes:
      - local:/local
      - nfs:/nfs
      - smb:/smb
    depends_on: 
      - nginx
```

使用注意事项：

- 默认情况下在使用docker-compose down删除环境时，默认是不会删除创建的卷，除非指定`--volumes`参数
  

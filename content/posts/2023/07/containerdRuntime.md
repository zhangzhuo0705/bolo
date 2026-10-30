---
title: "containerd服务"
date: 2023-07-14T18:03:44+08:00
draft: false
description: "说明 containerd 的架构与安装配置，以及它作为容器运行时的使用方式。"
cover: "https://b3logfile.com/bing/20200517.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["Docker"]
tags: ["containerd"]
toc: true
---
# 一、Containerd 简介

很久以前，Docker 强势崛起，以“镜像”这个大招席卷全球，对其他容器技术进行致命的降维打击，使其毫无招架之力，就连 Google 也不例外。Google 为了不被拍死在沙滩上，被迫拉下脸面（当然，跪舔是不可能的），希望 Docker 公司和自己联合推进一个开源的容器运行时作为 Docker 的核心依赖，不然就走着瞧。Docker 公司觉得自己的智商被侮辱了，走着瞧就走着瞧，谁怕谁啊！

很明显，Docker 公司的这个决策断送了自己的大好前程，造成了今天的悲剧。

紧接着，Google 联合 Red Hat、IBM 等几位巨佬连哄带骗忽悠 Docker 公司将 `libcontainer` 捐给中立的社区（OCI，Open Container Intiative），并改名为 `runc`，不留一点 Docker 公司的痕迹~~

这还不够，为了彻底扭转 Docker 一家独大的局面，几位大佬又合伙成立了一个基金会叫 `CNCF`（Cloud Native Computing Fundation），这个名字想必大家都很熟了，我就不详细介绍了。CNCF 的目标很明确，既然在当前的维度上干不过 Docker，干脆往上爬，升级到大规模容器编排的维度，以此来击败 Docker。

Docker 公司当然不甘示弱，搬出了 Swarm 和 Kubernetes 进行 PK，最后的结局大家都知道了，Swarm 战败。然后 Docker 公司耍了个小聪明，将自己的核心依赖 `Containerd` 捐给了 CNCF，以此来标榜 Docker 是一个 PaaS 平台。

巨佬们心想，想当初想和你合作搞个中立的核心运行时，你死要面子活受罪，就是不同意，好家伙，现在自己搞了一个，还捐出来了，这是什么操作？也罢，这倒省事了，我就直接拿 `Containerd` 来做文章吧。

首先呢，为了表示 Kubernetes 的中立性，当然要搞个标准化的容器运行时接口，只要适配了这个接口的容器运行时，都可以和我一起玩耍哦，第一个支持这个接口的当然就是 `Containerd` 啦。至于这个接口的名字，大家应该都知道了，它叫 CRI（Container Runntime Interface）。

这样还不行，为了蛊惑 Docker 公司，Kubernetes 暂时先委屈自己，专门在自己的组件中集成了一个 `shim`（你可以理解为垫片），用来将 CRI 的调用翻译成 Docker 的 API，让 Docker 也能和自己愉快地玩耍，温水煮青蛙，养肥了再杀。。。

就这样，Kubernetes 一边假装和 Docker 愉快玩耍，一边背地里不断优化 Containerd 的健壮性以及和 CRI 对接的丝滑性。现在 Containerd 的翅膀已经完全硬了，是时候卸下我的伪装，和 Docker say bye bye 了。后面的事情大家也都知道了~~

# 二、Containerd 架构

时至今日，Containerd 已经变成一个工业级的容器运行时了，连口号都有了：超简单！超健壮！可移植性超强！

当然，为了让 Docker 以为自己不会抢饭碗，Containerd 声称自己的设计目的主要是为了嵌入到一个更大的系统中（暗指 Kubernetes），而不是直接由开发人员或终端用户使用。事实上呢，Containerd 现在基本上啥都能干了，开发人员或者终端用户可以在宿主机中管理完整的容器生命周期，包括容器镜像的传输和存储、容器的执行和管理、存储和网络等。

**架构图**

![img](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/1737323-20201221160751921-173795697.png)

可以看到 Containerd 仍然采用标准的 C/S 架构，服务端通过 `GRPC` 协议提供稳定的 API，客户端通过调用服务端的 API 进行高级的操作。

为了解耦，Containerd 将不同的职责划分给不同的组件，每个组件就相当于一个**子系统**（subsystem）。连接不同子系统的组件被称为模块。

总体上 Containerd 被划分为两个子系统：

- **Bundle** : 在 Containerd 中，`Bundle` 包含了配置、元数据和根文件系统数据，你可以理解为容器的文件系统。而 **Bundle 子系统**允许用户从镜像中提取和打包 Bundles。
- **Runtime** : Runtime 子系统用来执行 Bundles，比如创建容器。

其中，每一个子系统的行为都由一个或多个**模块**协作完成（架构图中的 `Core` 部分）。每一种类型的模块都以**插件**的形式集成到 Containerd 中，而且插件之间是相互依赖的。例如，上图中的每一个长虚线的方框都表示一种类型的插件，包括 `Service Plugin`、`Metadata Plugin`、`GC Plugin`、`Runtime Plugin` 等，其中 `Service Plugin` 又会依赖 Metadata Plugin、GC Plugin 和 Runtime Plugin。每一个小方框都表示一个细分的插件，例如 `Metadata Plugin` 依赖 Containers Plugin、Content Plugin 等。 总之，万物皆插件，插件就是模块，模块就是插件。

![img](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/1737323-20201221160752165-205512444.png)

这里介绍几个常用的插件：

- **Content Plugin** : 提供对镜像中可寻址内容的访问，所有不可变的内容都被存储在这里。
- **Snapshot Plugin** : 用来管理容器镜像的文件系统快照。镜像中的每一个 layer 都会被解压成文件系统快照，类似于 Docker 中的 `graphdriver`。
- **Metrics** : 暴露各个组件的监控指标。

从总体来看，Containerd 被分为三个大块：`Storage`、`Metadata` 和 `Runtime`，可以将上面的架构图提炼一下：

![img](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/1737323-20201221160752591-1078673943.png)

这是使用 [bucketbench](https://github.com/estesp/bucketbench) 对 `Docker`、`crio` 和 `Containerd` 的性能测试结果，包括启动、停止和删除容器，以比较它们所耗的时间

![img](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/1737323-20201221160752930-1628301782.png)

可以看到 Containerd 在各个方面都表现良好，总体性能还是优越于 `Docker` 和 `crio` 的。

# 三、containerd安装配置

Containerd官网：https://containerd.io/

github地址：https://github.com/containerd/containerd

下载需要去github下载

## 3.1 安装包介绍

ontainerd 提供了两个压缩包，一个叫 `containerd-${VERSION}.${OS}-${ARCH}.tar.gz`，另一个叫 `cri-containerd-${VERSION}.${OS}-${ARCH}.tar.gz`。其中 `cri-containerd-${VERSION}.${OS}-${ARCH}.tar.gz` 包含了所有 Kubernetes 需要的二进制文件。如果你只是本地测试，可以选择前一个压缩包；如果是作为 Kubernetes 的容器运行时，需要选择后一个压缩包。

Containerd 是需要调用 `runc` 的，而第一个压缩包是不包含 `runc` 二进制文件的，如果你选择第一个压缩包，还需要提前安装 runc。所以我建议直接使用 `cri-containerd` 压缩包。

## 3.2 安装过程

**下载安装压缩包解压**

```bash
[13:03:10 root@centos7 ~]#ls
containerd-cri-containerd-cni-1.5.5-linux-amd64.tar.gz
#验证压缩包内文件
[13:03:11 root@centos7 ~]#tar -tf containerd-cri-containerd-cni-1.5.5-linux-amd64.tar.gz 
etc/
etc/crictl.yaml
etc/cni/
....
#解压
[13:03:24 root@centos7 ~]#tar -C / -xzf containerd-cri-containerd-cni-1.5.5-linux-amd64.tar.gz 

#启动服务，已经自动生成service文件
[13:09:21 root@centos7 ~]#cat /etc/systemd/system/containerd.service 
[Unit]
Description=containerd container runtime
Documentation=https://containerd.io
After=network.target local-fs.target

[Service]
ExecStartPre=-/sbin/modprobe overlay
ExecStart=/usr/local/bin/containerd
Type=notify
Delegate=yes
KillMode=process
Restart=always
RestartSec=5
LimitNPROC=infinity
LimitCORE=infinity
LimitNOFILE=infinity
TasksMax=infinity
OOMScoreAdjust=-999

[Install]
WantedBy=multi-user.target
[13:09:29 root@centos7 ~]#systemctl start containerd.service

#验证版本
[13:10:05 root@centos7 ~]#ctr version
Client:
  Version:  v1.5.5
  Revision: 72cec4be58a9eb6b2910f5d10f1c01ca47d231c0
  Go version: go1.16.6

Server:
  Version:  v1.5.5
  Revision: 72cec4be58a9eb6b2910f5d10f1c01ca47d231c0
  UUID: e94cf300-7f3f-41e4-99b7-1d8896c9bfe6
```

**解压后生成的文件目录**

- `/usr/local/bin`：二进制文件位置
- `/opt/cni`：cni网络插件文件相关位置
- `/opt/containerd/`：containerd相关文件位置

## 3.3 默认配置文件

Containerd 的默认配置文件为 `/etc/containerd/config.toml`，默认`/etc/containerd`没有需要手动创建，我们可以通过命令来生成一个默认的配置：

```bash
[13:10:27 root@centos7 ~]#mkdir /etc/containerd
[13:11:31 root@centos7 ~]#containerd config default >/etc/containerd/config.toml
```

### 3.3.1 配置文件详解

```bash
disabled_plugins = []
imports = []
oom_score = 0
plugin_dir = ""
required_plugins = []
root = "/var/lib/containerd"
state = "/run/containerd"
version = 2

[cgroup]
  path = ""

[debug]
  address = ""
  format = ""
  gid = 0
  level = ""
  uid = 0

[grpc]
  address = "/run/containerd/containerd.sock"
  gid = 0
  max_recv_message_size = 16777216
  max_send_message_size = 16777216
  tcp_address = ""
  tcp_tls_cert = ""
  tcp_tls_key = ""
  uid = 0

[metrics]
  address = ""
  grpc_histogram = false

[plugins]

  [plugins."io.containerd.gc.v1.scheduler"]
    deletion_threshold = 0
    mutation_threshold = 100
    pause_threshold = 0.02
    schedule_delay = "0s"
    startup_delay = "100ms"

  [plugins."io.containerd.grpc.v1.cri"]
    disable_apparmor = false
    disable_cgroup = false
    disable_hugetlb_controller = true
    disable_proc_mount = false
    disable_tcp_service = true
    enable_selinux = false
    enable_tls_streaming = false
    ignore_image_defined_volumes = false
    max_concurrent_downloads = 3
    max_container_log_line_size = 16384
    netns_mounts_under_state_dir = false
    restrict_oom_score_adj = false
    sandbox_image = "k8s.gcr.io/pause:3.5"
    selinux_category_range = 1024
    stats_collect_period = 10
    stream_idle_timeout = "4h0m0s"
    stream_server_address = "127.0.0.1"
    stream_server_port = "0"
    systemd_cgroup = false
    tolerate_missing_hugetlb_controller = true
    unset_seccomp_profile = ""

    [plugins."io.containerd.grpc.v1.cri".cni]
      bin_dir = "/opt/cni/bin"
      conf_dir = "/etc/cni/net.d"
      conf_template = ""
      max_conf_num = 1

    [plugins."io.containerd.grpc.v1.cri".containerd]
      default_runtime_name = "runc"
      disable_snapshot_annotations = true
      discard_unpacked_layers = false
      no_pivot = false
      snapshotter = "overlayfs"

      [plugins."io.containerd.grpc.v1.cri".containerd.default_runtime]
        base_runtime_spec = ""
        container_annotations = []
        pod_annotations = []
        privileged_without_host_devices = false
        runtime_engine = ""
        runtime_root = ""
        runtime_type = ""

        [plugins."io.containerd.grpc.v1.cri".containerd.default_runtime.options]

      [plugins."io.containerd.grpc.v1.cri".containerd.runtimes]

        [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc]
          base_runtime_spec = ""
          container_annotations = []
          pod_annotations = []
          privileged_without_host_devices = false
          runtime_engine = ""
          runtime_root = ""
          runtime_type = "io.containerd.runc.v2"

          [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc.options]
            BinaryName = ""
            CriuImagePath = ""
            CriuPath = ""
            CriuWorkPath = ""
            IoGid = 0
            IoUid = 0
            NoNewKeyring = false
            NoPivotRoot = false
            Root = ""
            ShimCgroup = ""
            SystemdCgroup = false

      [plugins."io.containerd.grpc.v1.cri".containerd.untrusted_workload_runtime]
        base_runtime_spec = ""
        container_annotations = []
        pod_annotations = []
        privileged_without_host_devices = false
        runtime_engine = ""
        runtime_root = ""
        runtime_type = ""

        [plugins."io.containerd.grpc.v1.cri".containerd.untrusted_workload_runtime.options]

    [plugins."io.containerd.grpc.v1.cri".image_decryption]
      key_model = "node"

    [plugins."io.containerd.grpc.v1.cri".registry]
      config_path = ""

      [plugins."io.containerd.grpc.v1.cri".registry.auths]

      [plugins."io.containerd.grpc.v1.cri".registry.configs]

      [plugins."io.containerd.grpc.v1.cri".registry.headers]

      [plugins."io.containerd.grpc.v1.cri".registry.mirrors]

    [plugins."io.containerd.grpc.v1.cri".x509_key_pair_streaming]
      tls_cert_file = ""
      tls_key_file = ""

  [plugins."io.containerd.internal.v1.opt"]
    path = "/opt/containerd"

  [plugins."io.containerd.internal.v1.restart"]
    interval = "10s"

  [plugins."io.containerd.metadata.v1.bolt"]
    content_sharing_policy = "shared"

  [plugins."io.containerd.monitor.v1.cgroups"]
    no_prometheus = false

  [plugins."io.containerd.runtime.v1.linux"]
    no_shim = false
    runtime = "runc"
    runtime_root = ""
    shim = "containerd-shim"
    shim_debug = false

  [plugins."io.containerd.runtime.v2.task"]
    platforms = ["linux/amd64"]

  [plugins."io.containerd.service.v1.diff-service"]
    default = ["walking"]

  [plugins."io.containerd.snapshotter.v1.aufs"]
    root_path = ""

  [plugins."io.containerd.snapshotter.v1.btrfs"]
    root_path = ""

  [plugins."io.containerd.snapshotter.v1.devmapper"]
    async_remove = false
    base_image_size = ""
    pool_name = ""
    root_path = ""

  [plugins."io.containerd.snapshotter.v1.native"]
    root_path = ""

  [plugins."io.containerd.snapshotter.v1.overlayfs"]
    root_path = ""

  [plugins."io.containerd.snapshotter.v1.zfs"]
    root_path = ""

[proxy_plugins]

[stream_processors]

  [stream_processors."io.containerd.ocicrypt.decoder.v1.tar"]
    accepts = ["application/vnd.oci.image.layer.v1.tar+encrypted"]
    args = ["--decryption-keys-path", "/etc/containerd/ocicrypt/keys"]
    env = ["OCICRYPT_KEYPROVIDER_CONFIG=/etc/containerd/ocicrypt/ocicrypt_keyprovider.conf"]
    path = "ctd-decoder"
    returns = "application/vnd.oci.image.layer.v1.tar"

  [stream_processors."io.containerd.ocicrypt.decoder.v1.tar.gzip"]
    accepts = ["application/vnd.oci.image.layer.v1.tar+gzip+encrypted"]
    args = ["--decryption-keys-path", "/etc/containerd/ocicrypt/keys"]
    env = ["OCICRYPT_KEYPROVIDER_CONFIG=/etc/containerd/ocicrypt/ocicrypt_keyprovider.conf"]
    path = "ctd-decoder"
    returns = "application/vnd.oci.image.layer.v1.tar+gzip"

[timeouts]
  "io.containerd.timeout.shim.cleanup" = "5s"
  "io.containerd.timeout.shim.load" = "5s"
  "io.containerd.timeout.shim.shutdown" = "3s"
  "io.containerd.timeout.task.state" = "2s"

[ttrpc]
  address = ""
  gid = 0
  uid = 0
```

先来看下 Containerd 的配置结构，乍一看可能会觉得很复杂，复杂就复杂在 plugin 的配置部分：

每一个顶级配置块的命名都是 `plugins."io.containerd.xxx.vx.xxx"` 这种形式，其实每一个顶级配置块都代表一个插件，其中 `io.containerd.xxx.vx` 表示插件的类型，vx 后面的 xxx 表示插件的 `ID`。可以通过 `ctr` 一览无余：

```bash
[13:12:44 root@centos7 ~]#ctr plugin ls
TYPE                            ID                       PLATFORMS      STATUS    
io.containerd.content.v1        content                  -              ok        
io.containerd.snapshotter.v1    aufs                     linux/amd64    skip      
io.containerd.snapshotter.v1    btrfs                    linux/amd64    skip      
io.containerd.snapshotter.v1    devmapper                linux/amd64    error     
io.containerd.snapshotter.v1    native                   linux/amd64    ok        
io.containerd.snapshotter.v1    overlayfs                linux/amd64    ok        
io.containerd.snapshotter.v1    zfs                      linux/amd64    skip      
io.containerd.metadata.v1       bolt                     -              ok        
io.containerd.differ.v1         walking                  linux/amd64    ok        
io.containerd.gc.v1             scheduler                -              ok        
io.containerd.service.v1        introspection-service    -              ok        
io.containerd.service.v1        containers-service       -              ok        
io.containerd.service.v1        content-service          -              ok        
io.containerd.service.v1        diff-service             -              ok        
io.containerd.service.v1        images-service           -              ok        
io.containerd.service.v1        leases-service           -              ok        
io.containerd.service.v1        namespaces-service       -              ok        
io.containerd.service.v1        snapshots-service        -              ok        
io.containerd.runtime.v1        linux                    linux/amd64    ok        
io.containerd.runtime.v2        task                     linux/amd64    ok        
io.containerd.monitor.v1        cgroups                  linux/amd64    ok        
io.containerd.service.v1        tasks-service            -              ok        
io.containerd.internal.v1       restart                  -              ok        
io.containerd.grpc.v1           containers               -              ok        
io.containerd.grpc.v1           content                  -              ok        
io.containerd.grpc.v1           diff                     -              ok        
io.containerd.grpc.v1           events                   -              ok        
io.containerd.grpc.v1           healthcheck              -              ok        
io.containerd.grpc.v1           images                   -              ok        
io.containerd.grpc.v1           leases                   -              ok        
io.containerd.grpc.v1           namespaces               -              ok        
io.containerd.internal.v1       opt                      -              ok        
io.containerd.grpc.v1           snapshots                -              ok        
io.containerd.grpc.v1           tasks                    -              ok        
io.containerd.grpc.v1           version                  -              ok        
io.containerd.grpc.v1           cri                      linux/amd64    ok
```

顶级配置块下面的子配置块表示该插件的各种配置，比如 cri 插件下面就分为 `containerd`、`cni` 和 `registry` 的配置，而 containerd 下面又可以配置各种 runtime，还可以配置默认的 runtime。

### 3.3.2 镜像加速配置

由于某些不可描述的因素，在国内拉取公共镜像仓库的速度是极慢的，为了节约拉取时间，需要为 Containerd 配置镜像仓库的 `mirror`。Containerd 的镜像仓库 mirror 与 Docker 相比有两个区别：

- Containerd 只支持通过 `CRI` 拉取镜像的 mirror，也就是说，只有通过 `crictl` 或者 Kubernetes 调用时 mirror 才会生效，通过 `ctr` 拉取是不会生效的。
- `Docker` 只支持为 `Docker Hub` 配置 mirror，而 `Containerd` 支持为任意镜像仓库配置 mirror。

镜像加速的配置就在 cri 插件配置块下面的 registry 配置块，所以需要修改的部分如下：

```bash
[plugins."io.containerd.grpc.v1.cri".registry]
      [plugins."io.containerd.grpc.v1.cri".registry.mirrors]
        [plugins."io.containerd.grpc.v1.cri".registry.mirrors."docker.io"]
          endpoint = ['https://dockerhub.mirrors.nwafu.edu.cn']
        [plugins."io.containerd.grpc.v1.cri".registry.mirrors."k8s.gcr.io"]
          endpoint = ["https://registry.aliyuncs.com"]
        [plugins."io.containerd.grpc.v1.cri".registry.mirrors."gcr.io"]
          endpoint = ["https://registry.u17.io"]
```

- **registry.mirrors."xxx"** : 表示需要配置 mirror 的镜像仓库。例如，`registry.mirrors."docker.io"` 表示配置 docker.io 的 mirror。
- **endpoint** : 表示提供 mirror 的镜像加速服务。例如，这里推荐使用西北农林科技大学提供的镜像加速服务作为 `docker.io` 的 mirror。

**配置加速之后containerd如何拉去镜像**

```bash
#docker仓库镜像拉取
[16:38:08 root@centos7 containerd]#crictl pull bitnami/minio:latest
[16:38:08 root@centos7 containerd]#crictl pull docker.io/bitnami/minio:latest

#k8s.gcr.io仓库镜像拉去
[16:30:36 root@centos7 containerd]#crictl pull k8s.gcr.io/google_containers/pause:3.2
```

注意：镜像加速crt命令是无法调用的

### 3.3.3 配置私有仓库

```bash
[17:09:59 root@centos7 ~]#cat /etc/containerd/config.toml 
[plugins."io.containerd.grpc.v1.cri".registry]
      config_path = "" 

      [plugins."io.containerd.grpc.v1.cri".registry.auths]

      [plugins."io.containerd.grpc.v1.cri".registry.configs]
        [plugins."io.containerd.grpc.v1.cri".registry.configs."harbor.zhangzhuo.org".tls]  #是否信任证书
          insecure_skip_verify = true
        [plugins."io.containerd.grpc.v1.cri".registry.configs."harbor.zhangzhuo.org".auth] #仓库认证信息
          username = "admin"
          password = "123456"

      [plugins."io.containerd.grpc.v1.cri".registry.headers]

      [plugins."io.containerd.grpc.v1.cri".registry.mirrors]
        [plugins."io.containerd.grpc.v1.cri".registry.mirrors."harbor.zhangzhuo.org"]  #自己镜像仓库地址
          endpoint = ["https://harbor.zhangzhuo.org"]
```

### 3.3.4 使用注册表配置管理镜像仓库(新，动态)

1.5.0 以上版本Containerd支持，为这些客户端配置注册表将通过在配置目录中为每个所需的注册表主机指定（可选）一个文件来完成`hosts.toml`。**注意**：此目录下的更新不需要重新启动 containerd 守护进程。用于指定 registry.mirrors 和 registry.configs 的旧 CRI 配置模式已被**弃用**。

配置方法：config.toml

```bash
version = 2

[plugins."io.containerd.grpc.v1.cri".registry]
   config_path = "/etc/containerd/certs.d"
```

注册表主机命名空间配置方法：

- 比如镜像拉取地址为：`[registry_host_name|IP address][:port][/v2][/org_path]<image_name>[:tag|@DIGEST]`
- 即册表主机名称空间也就是顶级目录名称应该为`[registry_host_name|IP address][:port]`
- 默认册表主机名称空间名称为`_default`

目录结构如下：

```bash
$ tree /etc/containerd/certs.d
/etc/containerd/certs.d
└── docker.io
    └── hosts.toml
```

hosts.toml示例文件

```bash
server = "https://docker.io"  #注册表主机命名空间的默认服务器

[host."https://registry-1.docker.io"]  #注册表仓库访问地址，可以是多个会依次尝试
  capabilities = ["pull", "resolve"]   #用于指定主机能够执行的操作
  skip_verify = true                   #如果是https协议可以绕过TLS 
  ca = "/etc/certs/mirror.pem"         #https可配置ca
  [host."https://registry-1.docker.io".header]  #在请求中额外添加头
    x-custom-2 = ["value1", "value2"]
```

注意如果如果需要使用认证功能还需要在config.toml配置如下信息

```bash
[plugins."io.containerd.grpc.v1.cri".registry.configs."registry-1.docker.io".auth]
  username = "registry_username"
  password = "registry_password"
```

### 3.3.5 存储配置

Containerd 有两个不同的存储路径，一个用来保存持久化数据，一个用来保存运行时状态。

```bash
root = "/var/lib/containerd"
state = "/run/containerd"
```

`root`用来保存持久化数据，包括 `Snapshots`, `Content`, `Metadata` 以及各种插件的数据。每一个插件都有自己单独的目录，Containerd 本身不存储任何数据，它的所有功能都来自于已加载的插件。

```bash
[13:43:25 root@centos7 ~]#tree /var/lib/containerd/
/var/lib/containerd/
├── io.containerd.content.v1.content
│   └── ingest
├── io.containerd.grpc.v1.introspection
│   └── uuid
├── io.containerd.metadata.v1.bolt
│   └── meta.db
├── io.containerd.runtime.v1.linux
├── io.containerd.runtime.v2.task
├── io.containerd.snapshotter.v1.btrfs
├── io.containerd.snapshotter.v1.native
│   └── snapshots
├── io.containerd.snapshotter.v1.overlayfs
│   └── snapshots
└── tmpmounts
```

`state` 用来保存临时数据，包括 sockets、pid、挂载点、运行时状态以及不需要持久化保存的插件数据。

```bash
[13:44:38 root@centos7 ~]#tree /run/containerd/
/run/containerd/
├── containerd.sock
├── containerd.sock.ttrpc
├── io.containerd.runtime.v1.linux
└── io.containerd.runtime.v2.task
```

### 3.3.6 OOM配置

Containerd 是容器的守护者，一旦发生内存不足的情况，理想的情况应该是先杀死容器，而不是杀死 Containerd。所以需要调整 Containerd 的 `OOM` 权重，减少其被 **OOM Kill** 的几率。最好是将 `oom_score` 的值调整为比其他守护进程略低的值。这里的 oom_socre 其实对应的是 `/proc/<pid>/oom_socre_adj`，在早期的 Linux 内核版本里使用 `oom_adj` 来调整权重, 后来改用 `oom_socre_adj` 了。该文件描述如下：

```bash
The value of /proc/<pid>/oom_score_adj is added to the badness score before it
is used to determine which task to kill. Acceptable values range from -1000
(OOM_SCORE_ADJ_MIN) to +1000 (OOM_SCORE_ADJ_MAX). This allows userspace to
polarize the preference for oom killing either by always preferring a certain
task or completely disabling it. The lowest possible value, -1000, is
equivalent to disabling oom killing entirely for that task since it will always
report a badness score of 0.
```

在计算最终的 `badness score` 时，会在计算结果是中加上 `oom_score_adj` ,这样用户就可以通过该在值来保护某个进程不被杀死或者每次都杀某个进程。其取值范围为 `-1000` 到 `1000`。

如果将该值设置为 `-1000`，则进程永远不会被杀死，因为此时 `badness score` 永远返回0。

建议 Containerd 将该值设置为 `-999` 到 `0` 之间。如果作为 Kubernetes 的 Worker 节点，可以考虑设置为 `-999`。

### 3.3.7 Systemd 配置

建议通过 systemd 配置 Containerd 作为守护进程运行，配置文件在上文已经被解压出来了

这里有两个重要的参数：

- **Delegate** : 这个选项允许 Containerd 以及运行时自己管理自己创建的容器的 `cgroups`。如果不设置这个选项，systemd 就会将进程移到自己的 `cgroups` 中，从而导致 Containerd 无法正确获取容器的资源使用情况。
- **KillMode** : 这个选项用来处理 Containerd 进程被杀死的方式。默认情况下，systemd 会在进程的 cgroup 中查找并杀死 Containerd 的所有子进程，这肯定不是我们想要的。`KillMode`字段可以设置的值如下。
  - **control-group**（默认值）：当前控制组里面的所有子进程，都会被杀掉
  - **process**：只杀主进程
  - **mixed**：主进程将收到 SIGTERM 信号，子进程收到 SIGKILL 信号
  - **none**：没有进程会被杀掉，只是执行服务的 stop 命令。

我们需要将 KillMode 的值设置为 `process`，这样可以确保升级或重启 Containerd 时不杀死现有的容器。

# 四、ctr与crictl客户端命令使用

- ctr：是containerd本身的CLI，主要用来调试containerd
- crictl ：是Kubernetes社区定义的专门CLI工具，主要配合kubernetes来使用

## 4.1 ctr命令

ctr 目前很多功能做的还没有 docker 那么完善，但基本功能已经具备了。下面将围绕**镜像**和**容器**这两个方面来介绍其使用方法。

containerd 相比于docker , 多了namespace概念, 每个image和container 都会在各自的namespace下可见, 目前k8s会使用k8s.io 作为命名空间，ctr命令默认不写namespace是在default的namespace

```bash
[16:50:12 root@centos7 containerd]#ctr ns ls
NAME    LABELS 
default        
k8s.io
```

**镜像相关命令**

```bash
#拉取镜像
[16:48:32 root@centos7 containerd]#ctr -n test i pull docker.io/library/alpine:latest

#删除镜像
[16:50:17 root@centos7 containerd]#ctr i rm docker.io/library/alpine:latest

#镜像标记tag
[16:52:10 root@centos7 containerd]#ctr i tag docker.io/library/alpine:latest harbor.zhangzhuo.org/base/alpine:latest

#运行容器
[09:48:42 root@centos7 ~]#ctr -n k8s.io run -d docker.io/library/alpine:latest

#查看运行的容器列表
[09:49:09 root@centos7 ~]#ctr -n k8s.io c ls
CONTAINER    IMAGE                              RUNTIME                  
bash         docker.io/library/alpine:latest    io.containerd.runc.v2    
test         docker.io/library/alpine:latest    io.containerd.runc.v2

#停止容器
[09:50:38 root@centos7 ~]#ctr -n k8s.io tasks kill -a -s 9 bash

#删除容器
[09:52:01 root@centos7 ~]#ctr -n k8s.io c rm test
```

## 4.2 crictl命令

`crictl` 是 CRI 兼容的容器运行时命令行接口。 你可以使用它来检查和调试 Kubernetes 节点上的容器运行时和应用程序。

`crictl` 默认连接到 `unix:///var/run/dockershim.sock`。 对于其他的运行时，你可以用多种不同的方法设置端点：

- 通过设置参数 `--runtime-endpoint` 和 `--image-endpoint`
- 通过设置环境变量 `CONTAINER_RUNTIME_ENDPOINT` 和 `IMAGE_SERVICE_ENDPOINT`
- 通过在配置文件中设置端点 `--config=/etc/crictl.yaml`

你还可以在连接到服务器并启用或禁用调试时指定超时值，方法是在配置文件中指定 `timeout` 或 `debug` 值，或者使用 `--timeout` 和 `--debug` 命令行参数。

要查看或编辑当前配置，请查看或编辑 `/etc/crictl.yaml` 的内容。

```bash
[09:55:00 root@centos7 ~]#cat /etc/crictl.yaml
runtime-endpoint: unix:///run/containerd/containerd.sock
```

### 4.2.1 crictl相关命令

```bash
#打印pod清单
[09:55:04 root@centos7 ~]#crictl pods
[09:58:09 root@centos7 ~]#crictl pods --name nginx #根据名称打印pod
[09:59:11 root@centos7 ~]#crictl pods --label run=nginx

#打印镜像清单
[09:59:49 root@centos7 ~]#crictl images

#拉取镜像
[10:01:50 root@centos7 ~]#crictl pull busybox

#移除镜像
[10:25:50 root@centos7 ~]#crictl rmi 

#打印容器清单
[10:00:14 root@centos7 ~]#crictl ps

#在正在运行的容器上执行命令
[10:00:42 root@centos7 ~]#crictl exec -i -t nginx ls

#获取正在运行的容器日志
[10:01:23 root@centos7 ~]#crictl  logs nginx

#进入容器内部
[10:21:19 root@centos7 ~]#crictl exec -it 66cb23b98fa5e sh

#显示系统级信息
[10:22:11 root@centos7 ~]#crictl info

#返回镜像、容器、任务详细信息
[10:23:10 root@centos7 ~]#crictl inspect 66cb23b98fa5e

#返回容器资源使用情况
[10:23:57 root@centos7 ~]#crictl stats 66cb23b98fa5e
```

### 4.2.2 运行pod沙盒

用 `crictl` 运行 Pod 沙盒对容器运行时排错很有帮助。 在运行的 Kubernetes 集群中，沙盒会随机地被 kubelet 停止和删除。

1.编写json文件

```bash
[10:06:03 root@centos7 ~]#cat 1.json 
{
    "metadata": {
        "name": "nginx-sandbox",
        "namespace": "default",
        "attempt": 1,
        "uid": "hdishd83djaidwnduwk28bcsb"
    },
    "logDirectory": "/tmp",
    "linux": {
    }
}
```

2.使用crictl runp命令应用json文件并运行沙盒

```bash
[10:05:56 root@centos7 ~]#crictl runp 1.json
930664745aa91eebe23b667767aee508bc0bd0d9b058564cc4383673434839fb
```

返回了沙盒的 ID表示正常

**创建容器**

用 `crictl` 创建容器对容器运行时排错很有帮助。 在运行的 Kubernetes 集群中，沙盒会随机的被 kubelet 停止和删除。

1.拉取busybox镜像

```bash
[10:09:29 root@centos7 ~]#crictl pull busybox
```

2.创建pod和容器配置

pod配置

```bash
[10:12:25 root@centos7 ~]#cat 1.json 
{
    "metadata": {
        "name": "nginx-sandbox",
        "namespace": "default",
        "attempt": 1,
        "uid": "hdishd83djaidwnduwk28bcsb"
    },
    "log_directory": "/tmp",
    "linux": {
    }
}
```

容器配置

```bash
[10:12:56 root@centos7 ~]#cat 2.json 
{
  "metadata": {
      "name": "busybox"
  },
  "image":{
      "image": "busybox"
  },
  "command": [
      "top"
  ],
  "log_path":"busybox.log",
  "linux": {
  }
}
```

3.创建容器，传递先前创建的 Pod 的 ID、容器配置文件和 Pod 配置文件。返回容器的 ID。

```bash
[10:17:21 root@centos7 ~]#crictl create 930664745aa91eebe23b667767aee508bc0bd0d9b058564cc4383673434839fb 2.json 1.json
66cb23b98fa5ee7b16afa54dcf9c3211a2398c0f53a59b4a4559553c94cd8a5f
```

4.查询所有容器并确认新创建的容器状态为 `Created`。

```bash
[10:17:31 root@centos7 ~]#crictl ps -a
CONTAINER           IMAGE                              CREATED             STATE               NAME                ATTEMPT             POD ID
66cb23b98fa5e       docker.io/library/busybox:latest   36 seconds ago      Created             busybox             0                   930664745aa91
```

5.启动容器

```bash
[10:19:10 root@centos7 ~]#crictl start 66cb23b98fa5ee7b16afa54dcf9c3211a2398c0f53a59b4a4559553c94cd8a5f
66cb23b98fa5ee7b16afa54dcf9c3211a2398c0f53a59b4a4559553c94cd8a5f
#验证
[10:19:20 root@centos7 ~]#crictl ps
CONTAINER           IMAGE                              CREATED             STATE               NAME                ATTEMPT             POD ID
66cb23b98fa5e       docker.io/library/busybox:latest   2 minutes ago       Running             busybox             0                   930664745aa91
```

---
title: "JuiceFS文件系统"
date: 2022-05-15T20:31:58+08:00
lastmod: 2022-05-15T20:32:42+08:00
draft: false
description: "说明 JuiceFS 的存储架构与读写流程，演示客户端挂载和基本使用。"
cover: "https://b3logfile.com/bing/20180819.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["Kubernetes"]
tags: ["Kubernetes", "CSI"]
toc: true
---
# 一、JuiceFS介绍

**官方网站**：https://juicefs.com/

**github**:https://github.com/juicedata/juicefs

**JuiceFS** 是一款面向云原生设计的高性能共享文件系统，在 Apache 2.0 开源协议下发布。提供完备的POSIX兼容性，可将几乎所有对象存储接入本地作为海量本地磁盘使用，亦可同时在跨平台、跨地区的不同主机上挂载读写。JuiceFS 采用「数据」与「元数据」分离存储的架构，从而实现文件系统的分布式设计。使用 JuiceFS 存储数据，数据本身会被持久化在对象存储（例如，Amazon S3），相对应的元数据可以按需持久化在 Redis、MySQL、TiKV、SQLite 等多种数据库中。

**核心特性**

1. **POSIX 兼容**：像本地文件系统一样使用，无缝对接已有应用，无业务侵入性；
2. **云原生**：通过 CSI Driver 轻松地在 Kubernetes 中使用 JuiceFS；
3. **分布式设计**：同一文件系统可在上千台服务器同时挂载，高性能并发读写，共享数据；
4. **强一致性**：确认的文件修改会在所有服务器上立即可见，保证强一致性；
5. **强悍性能**：毫秒级延迟，近乎无限的吞吐量（取决于对象存储规模);
6. **数据安全**：支持传输中加密（encryption in transit）和静态加密（encryption at rest）；
7. **文件锁**：支持 BSD 锁（flock）和 POSIX 锁（fcntl）；
8. **数据压缩**：支持 LZ4 和 Zstandard 压缩算法，节省存储空间。

**技术架构**：

JuiceFS 文件系统由三个部分组成

- **JuiceFS 客户端**：协调对象存储和元数据存储引擎，以及 POSIX、Hadoop、Kubernetes CSI Driver、S3 Gateway 等文件系统接口的实现；
- **数据存储**：存储数据本身，支持本地磁盘、公有云或私有云对象存储、HDFS 等介质；
- **元数据引擎**：存储数据对应的元数据（metadata）包含文件名、文件大小、权限组、创建修改时间和目录结构等，支持 Redis、MySQL、TiKV 等多种引擎；

![imag![image](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/juicefs-arch-new-a58938733d246f30089d5302dd268c29.png)e](https://juicefs.com/docs/zh/assets/images/juicefs-arch-new-a58938733d246f30089d5302dd268c29.png)

作为文件系统，JuiceFS 会分别处理数据及其对应的元数据，数据会被存储在对象存储中，元数据会被存储在元数据引擎中。在数据存储方面，JuiceFS 支持几乎所有的公有云对象存储，同时也支持 OpenStack Swift、Ceph、MinIO 等支持私有化部署的开源对象存储。在元数据存储方面，JuiceFS 采用多引擎设计，目前已支持 Redis、TiKV、MySQL/MariaDB、PostgreSQL、SQLite 等作为元数据服务引擎，也将陆续实现更多元数据存储引擎。

## 1.1 JuiceFS 如何存储文件

文件系统作为用户和硬盘之间交互的媒介，它让文件可以妥善的被存储在硬盘上。如你所知，Windows 常用的文件系统有 FAT32、NTFS，Linux 常用的文件系统有 Ext4、XFS、Btrfs 等，每一种文件系统都有其独特的组织和管理文件的方式，它决定了文件系统的存储能力和性能等特征。JuiceFS 作为一个文件系统也不例外，它的强一致性、高性能等特征离不开它独特的文件管理模式。与传统文件系统只能使用本地磁盘存储数据和对应的元数据的模式不同，JuiceFS 会将数据格式化以后存储在对象存储（云存储），同时会将数据对应的元数据存储在 Redis 等数据库中。

任何存入 JuiceFS 的文件都会被拆分成固定大小的 **"Chunk"**，默认的容量上限是 64 MiB。每个 Chunk 由一个或多个 **"Slice"** 组成，Slice 的长度不固定，取决于文件写入的方式。每个 Slice 又会被进一步拆分成固定大小的 **"Block"**，默认为 4 MiB。最后，这些 Block 会被存储到对象存储。与此同时，JuiceFS 会将每个文件以及它的 Chunks、Slices、Blocks 等元数据信息存储在元数据引擎中。

![JuiceFS storage format](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/juicefs-storage-format-new-fb61716d2baaf23335573504aa5f3bc7.png)

使用 JuiceFS，文件最终会被拆分成 Chunks、Slices 和 Blocks 存储在对象存储。因此，你会发现在对象存储平台的文件浏览器中找不到存入 JuiceFS 的源文件，存储桶中只有一个 chunks 目录和一堆数字编号的目录和文件。不要惊慌，这正是 JuiceFS 文件系统高性能运作的秘诀！

![How JuiceFS stores your files](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/how-juicefs-stores-files-new-a5529b6935c59e4c6f36ac38dd1652f7.png)

## 1.2 JuiceFS 读写请求处理流程介绍

### 1.写入流程

JuiceFS 对大文件会做多级拆分，以提高读写效率。在处理写请求时，JuiceFS 先将数据写入 Client 的内存缓冲区，并在其中按 Chunk/Slice 的形式进行管理。Chunk 是根据文件内 offset 按 64 MiB 大小拆分的连续逻辑单元，不同 Chunk 之间完全隔离。每个 Chunk 内会根据应用写请求的实际情况进一步拆分成 Slices；当新的写请求与已有的 Slice 连续或有重叠时，会直接在该 Slice 上进行更新，否则就创建新的 Slice。Slice 是启动数据持久化的逻辑单元，其在 flush 时会先将数据按照默认 4 MiB 大小拆分成一个或多个连续的 Blocks，并上传到对象存储，每个 Block 对应一个 Object；然后再更新一次元数据，写入新的 Slice 信息。显然，在应用顺序写情况下，只需要**一个**不停增长的 Slice，最后仅 flush 一次即可；此时能最大化发挥出对象存储的写入性能。以一次简单的JuiceFS 基准测试为例，其第一阶段是使用 1 MiB IO 顺序写 1 GiB 文件，数据在各个组件中的形式如下图所示：

![write](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/internals-write-f8d47b907ab19996af7ddf95f81025e9.png)

- 对象存储写入的平均 IO 大小为 `object.put / object.put_c = 4 MiB`，等于 Block 的默认大小
- 元数据事务数与对象存储写入数比例大概为 `meta.txn : object.put_c ~= 1 : 16`，对应 Slice flush 需要的 1 次元数据修改和 16 次对象存储上传，同时也说明了每次 flush 写入的数据量为 4 MiB * 16 = 64 MiB，即 Chunk 的默认大小
- FUSE 层的平均请求大小为约 `fuse.write / fuse.ops ~= 128 KiB`，与其默认的请求大小限制一致

相较于顺序写来说，大文件内随机写的情况要复杂许多；每个 Chunk 内可能存在**多个不连续**的 Slice，使得一方面数据对象难以达到 4 MiB 大小，另一方面元数据需要多次更新。同时，当一个 Chunk 内已写入的 Slices 过多时，会触发 Compaction 来尝试合并与清理这些 Slices，这又会进一步增大系统的负担。因此，JuiceFS 在此类场景下会比顺序写有较明显的性能下降。

小文件的写入通常是在文件关闭时被上传到对象存储，对应 IO 大小一般就是文件大小。从上面指标图的第 3 阶段（创建 128 KiB 小文件）中也可以看到：

- 对象存储 PUT 的大小就是 128 KiB
- 元数据事务数大致是 PUT 计数的两倍，对应每个文件的一次 Create 和一次 Write

值得一提的是，对于这种不足一个 Block 的对象，JuiceFS 在上传的同时还会尝试写入到本地 Cache（由 `--cache-dir` 指定，可以是内存或硬盘），以期能提升后续可能的读请求速度。从指标图中也可以看到，创建小文件时 blockcache 下有同等的写入带宽，而在读取时（第 4 阶段）大部分均在 Cache 命中，这使得小文件的读取速度看起来特别快。

由于写请求写入 Client 内存缓冲区即可返回，因此通常来说 JuiceFS 的 Write 时延非常低（几十微秒级别），真正上传到对象存储的动作由内部自动触发（单个 Slice 过大，Slice 数量过多，缓冲时间过长等）或应用主动触发（关闭文件、调用 `fsync` 等）。缓冲区中的数据只有在被持久化后才能释放，因此当写入并发比较大或者对象存储性能不足时，有可能占满缓冲区而导致写阻塞。具体而言，缓冲区的大小由挂载参数 `--buffer-size` 指定，默认为 300 MiB；其实时值可以在指标图的 usage.buf 一列中看到。当使用量超过阈值时，JuiceFS Client 会主动为 Write 添加约 10ms 等待时间以减缓写入速度；若已用量超过阈值两倍，则会导致新的写入暂停直至缓冲区得到释放。因此，在观察到 Write 时延上升以及 Buffer 长时间超过阈值时，通常需要尝试设置更大的 `--buffer-size`。另外，通过增大 `--max-uploads` 参数（上传到对象存储的最大并发数，默认为 20）也有可能提升写入到对象存储的带宽，从而加快缓冲区的释放。

### 2.读取流程

JuiceFS 在处理读请求时，一般会按照 4 MiB Block 对齐的方式去对象存储读取，实现一定的预读功能。同时，读取到的数据会写入本地 Cache 目录，以备后用（如指标图中的第 2 阶段，blockcache 有很高的写入带宽）。显然，在顺序读时，这些提前获取的数据都会被后续的请求访问到，Cache 命中率非常高，因此也能充分发挥出对象存储的读取性能。此时数据在各个组件中的流动如下图所示：

![read](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/internals-read-fe33d58ede36c7517b134446bbfa9fdb.png)

做大文件内随机小 IO 读取时，JuiceFS 的这种策略则效率不高，反而会因为读放大和本地 Cache 的频繁写入与驱逐使得系统资源的实际利用率降低。不幸的是，此类场景下一般的缓存策略很难有足够高的收益。此时可考虑的一个方向是尽可能提升缓存的整体容量，以期达到能几乎完全缓存所需数据的效果；另一个方向则可以直接将缓存关闭（设置 `--cache-size 0`），并尽可能提高对象存储的读取性能。

小文件的读取则比较简单，通常就是在一次请求里读取完整个文件。由于小文件写入时会直接被缓存起来，因此类似 JuiceFS bench 这种写入后不久就读取的访问模式基本都会在本地 Cache 目录命中，性能非常可观。

# 二、JuiceFS客户端基本使用

JuiceFS 有良好的跨平台能力，支持在几乎所有主流架构的各类操作系统上运行，包括且不限于 Linux、macOS、Windows 等。

JuiceFS 客户端只有一个二进制文件，你可以下载预编译的版本直接解压使用，也可以用源代码手动编译。

二进制下载地址：https://github.com/juicedata/juicefs/releases

```bash
#不论你使用什么操作系统，当在终端输入并执行 juicefs 并返回了程序的帮助信息，就说明你成功安装了 JuiceFS 客户端
juicefs --version
```

## 2.1 创建文件系统

创建文件系统使用客户端提供的 [`format`](https://juicefs.com/docs/zh/community/command_reference#juicefs-format) 命令，一般格式为

```bash
juicefs format [command options] META-URL NAME

[command options]：设定文件系统的存储介质，留空则默认使用本地磁盘作为存储介质，路径为 "$HOME/.juicefs/local" 或 "/var/jfs"；
META-URL：用来设置元数据存储，即数据库相关的信息，通常是数据库的 URL 或文件路径
NAME：是文件系统的名称
```

示例：

```bash
[11:27:51 root@centos7 ~]#juicefs format sqlite3://myjfs.db myjfs
2022/05/11 11:27:53.446727 juicefs[1330] <INFO>: Meta address: sqlite3://myjfs.db [interface.go:385]
2022/05/11 11:27:53.447917 juicefs[1330] <INFO>: Data use file:///var/jfs/myjfs/ [format.go:412]
2022/05/11 11:27:53.495290 juicefs[1330] <INFO>: Volume is formatted as {Name:myjfs UUID:1aa73f9d-c7c4-4418-ab50-0814e38863fe Storage:file Bucket:/var/jfs/ AccessKey: SecretKey: BlockSize:4096 Compression:none Shards:0 HashPrefix:false Capacity:0 Inodes:0 EncryptKey: KeyEncrypted:false TrashDays:1 MetaVersion:1 MinClientVersion: MaxClientVersion:} [format.go:450]
#从返回的信息中可以看到，该文件系统使用 SQLite 作为元数据存储引擎，数据库文件位于当前目录，文件名为 myjfs.db，保存了 myjfs 文件系统的所有信息。它构建了完善的表结构，将用作所有数据的元信息的存储。
#由于没有指定任何存储相关的选项，客户端默认使用本地磁盘作为存储介质，根据返回的信息， myjfs 的存储路径为 file:///var/jfs/myjfs/，即/var/jfs/myjfs
```

## 2.2 挂载文件系统

挂载文件系统使用客户端提供的 [`mount`](https://juicefs.com/docs/zh/community/command_reference#juicefs-mount) 命令，一般格式为

```bash
juicefs mount [command options] META-URL MOUNTPOINT

[command options]：用来指定文件系统相关的选项，例如：-d 可以实现后台挂载；
META-URL：用来设置元数据存储。即数据库相关的信息，通常是数据库的 URL 或文件路径；
MOUNTPOINT：指定文件系统的挂载点。
```

示例

```bash
#以下命令将 myjfs 文件系统挂载到当前目录下的 mnt 文件夹
[11:28:04 root@centos7 ~]#juicefs mount sqlite3://myjfs.db mnt
2022/05/11 11:31:27.644035 juicefs[1345] <INFO>: Meta address: sqlite3://myjfs.db [interface.go:385]
2022/05/11 11:31:27.649621 juicefs[1345] <INFO>: Data use file:///var/jfs/myjfs/ [mount.go:289]
2022/05/11 11:31:27.649864 juicefs[1345] <INFO>: Disk cache (/var/jfsCache/1aa73f9d-c7c4-4418-ab50-0814e38863fe/): capacity (102400 MB), free ratio (10%), max pending pages (15) [disk_cache.go:90]
2022/05/11 11:31:27.655734 juicefs[1345] <INFO>: create session 1 OK [base.go:185]
2022/05/11 11:31:27.657093 juicefs[1345] <INFO>: Prometheus metrics listening on 127.0.0.1:9567 [mount.go:157]
2022/05/11 11:31:27.657258 juicefs[1345] <INFO>: Mounting volume myjfs at mnt ... [mount_unix.go:177]
2022/05/11 11:31:28.153839 juicefs[1345] <INFO>: OK, myjfs is ready at mnt [mount_unix.go:45]
#默认情况下，客户端会在前台挂载文件系统。就像你在上图中看到的那样，程序会一直运行在当前终端进程中，使用 Ctrl + C 组合键或关闭终端窗口，文件系统会被卸载。
#为了让文件系统可以在后台保持挂载，你可以在挂载时指定 -d 或 --background 选项，即让客户端在守护进程中挂载文件系统。
juicefs mount sqlite3://myjfs.db mnt -d
#接下来，任何存入挂载点 mnt 的文件，都会按照 JuiceFS 的文件存储格式被拆分成特定的「数据块」并存入 /var/jfs/myjfs/ 目录中，相对应的「元数据」会全部存储在 myjfs.db 数据库中。
```

## 2.3 卸载文件系统

```bash
juicefs umount mnt
```

## 2.4 元数据备份

- JuiceFS v0.15.2 开始支持元数据手动备份、恢复和引擎间迁移。
- JuiceFS v1.0.0 开始支持元数据自动备份

### 1.手动备份

JuiceFS 支持多种元数据存储引擎，且各引擎内部的数据管理格式各有不同。为了便于管理，JuiceFS 提供了 `dump` 命令允许将所有元数据以统一格式写入到 JSON 文件进行备份。同时，JuiceFS 也提供了 `load` 命令，允许将备份恢复或迁移到任意元数据存储引擎。

**元数据备份**

```bash
#使用 JuiceFS 客户端提供的 dump 命令可以将元数据导出到文件
juicefs dump sqlite3://myjfs.db meta.dump
```

该命令默认从根目录 `/` 开始，深度遍历目录树下所有文件，将每个文件的元数据信息按 JSON 格式写入到文件

`juicefs dump` 仅保证单个文件自身的完整性，不提供全局时间点快照的功能，如在 dump 过程中业务仍在写入，最终结果会包含不同时间点的信息。

`juicefs dump` 的价值在于它能将完整的元数据信息以统一的 JSON 格式导出，便于管理和保存，而且不同的元数据存储引擎都可以识别并导入。在实际应用中，`dump` 命令于数据库自带的备份工具应该共同使用，相辅相成。

**元数据恢复**

JSON 备份只能恢复到 `新创建的数据库` 或 `空数据库` 中。

```bash
#使用 JuiceFS 客户端提供的 load 命令可以将已备份的 JSON 文件中的元数据导入到一个新的空数据库中
juicefs load sqlite3://myjfs.db meta.dump
```

该命令会自动处理因包含不同时间点文件而产生的冲突问题，并重新计算文件系统的统计信息（空间使用量，inode 计数器等），最后在数据库中生成一份全局一致的元数据。

**元数据检视**

除了可以导出完整的元数据信息，`dump` 命令还支持导出特定子目录中的元数据。因为导出的 JSON 内容可以让用户非常直观地查看到指定目录树下所有文件的内部信息，因此常被用来辅助排查问题。例如：

```bash
juicefs dump sqlite3://myjfs.db meta.dump --subdir /etc/lvm
```

### 2.自动备份

从 JuiceFS v1.0.0 开始，不论文件系统通过 `mount` 命令挂载，还是通过 JuiceFS S3 网关及 Hadoop Java SDK 访问，客户端每小时都会自动备份元数据并拷贝到对象存储。

备份的文件存储在对象存储的 `meta` 目录中，它是一个独立于数据存储的目录，在挂载点中不可见，也不会与数据存储之间产生影响，用对象存储的文件浏览器即可查看和管理。

默认情况下，JuiceFS 客户端每小时备份一次元数据，自动备份的频率可以在挂载文件系统时通过 `--backup-meta` 选项进行调整，例如，要设置为每 8 个小时执行一次自动备份：

```bash
juicefs mount -d --backup-meta 8h sqlite3://myjfs.db mnt

#本地验证
[11:51:13 root@centos7 ~]#ls /var/jfs/myjfs/meta/
dump-2022-05-11-035032.json.gz
```

备份频率可以精确到秒，支持的单位如下

- `h`：精确到小时，如 `1h`；
- `m`：精确到分钟，如 `30m`、`1h30m`；
- `s`：精确到秒，如 `50s`、`30m50s`、`1h30m50s`;

值得一提的是，备份操作耗时会随着文件系统内文件数的增多而增加，因此当文件数较多（默认为达到一百万）且自动备份频率为默认值 1 小时的情况下 JuiceFS 会自动跳过元数据备份，并打印相应的告警日志。此时可以选择挂载一个新客户端并设置较大的 `--backup-meta` 参数来重新启用自动备份。

作为参考，当使用 Redis 作为元数据引擎时，备份一百万文件的元数据大约需要 1 分钟，消耗约 1GB 内存。

**备份清理策略**

- 保留 2 天以内全部的备份；
- 超过 2 天不足 2 周的，保留每天中的 1 个备份；
- 超过 2 周不足 2 月的，保留每周中的 1 个备份；
- 超过 2 个月的，保留每个月中的 1 个备份。

## 2.5 数据同步

JuiceFS 的 `sync` 子命令是功能完整的数据同步实用工具，可以在所有 JuiceFS 支持的对象存储之间多线程并发同步或迁移数据，既支持在「对象存储」与「JuiceFS」之间迁移数据，也支持在「对象存储」与「对象存储」之间跨云跨区迁移数据。与 rsync 类似，除了对象存储也支持同步本地目录、通过 SSH 访问远程目录、HDFS、WebDAV 等，同时提供全量同步、增量同步、条件模式匹配等高级功能。注意同步的数据只是数据存储中的文件并不包含元数据。

```bash
juicefs sync [command options] SRC DST

#即把 SRC 同步到 DST，既可以同步目录，也可以同步文件。
```

- `SRC` 代表数据源地址及路径
- `DST` 代表目标地址及路径
- `[command options]` 代表可选的同步选项，详情查看[命令参考](https://juicefs.com/docs/zh/community/command_reference#juicefs-sync)。

地址格式均为 `[NAME://][ACCESS_KEY:SECRET_KEY@]BUCKET[.ENDPOINT][/PREFIX]`

其中：

- `NAME` 是存储类型，比如 `s3`、`oss`。
- `ACCESS_KEY` 和 `SECRET_KEY` 是对象存储的 API 访问密钥
- `BUCKET[.ENDPOINT]` 是对象存储的访问地址
- `PREFIX` 是可选的，限定要同步的目录名前缀。

**多线程和带宽限制**

JuiceFS `sync` 默认启用 10 个线程执行同步任务，可以根据需要设置 `--thread` 选项调大或减少线程数。另外，如果需要限制同步任务占用的带宽，可以设置 `--bwlimit` 选项，单位 `Mbps`，默认值为 `0` 即不限制。

**目录结构与文件权限**

默认情况下，sync 命令只同步文件对象以及包含文件对象的目录，空目录不会被同步。如需同步空目录，可以使用 `--dirs` 选项。另外，在 local、sftp、hdfs 等文件系统之间同步时，如需保持文件权限，可以使用 `--perms` 选项。

## 2.6 存储配额

JuiceFS v0.14.2 开始支持文件系统级别的存储配额，该功能包括：

- 限制文件系统的总可用容量
- 限制文件系统的 inode 总数

存储限额设置会保存在元数据引擎中以供所有挂载点读取，每个挂载点的客户端也会缓存自己的已用容量和 inodes 数，每秒向元数据引擎同步一次。与此同时，客户端每 10 秒会从元数据引擎读取最新的用量值，从而实现用量信息在每个挂载点之间同步，但这种信息同步机制并不能保证用量数据被精确统计。

以 Linux 环境为例，使用系统自带的 `df` 命令可以看到，一个 JuiceFS 类型的文件系统默认的容量标识为 `1.0P`

```
[13:23:38 root@centos7 ~]#df
JuiceFS:myjfs            1.0P   35M  1.0P   1% /root/mnt
```

JuiceFS 通过 FUSE 实现对 POSIX 接口的支持，因为底层通常是容量能够无限扩展的对象存储，所以标识容量只是一个估值（也代表无限制）并非实际容量，它会随着实际用量动态变化。

**限制容量**

可以在创建文件系统时通过 `--capacity` 设置容量限额，单位 GiB，例如创建一个可用容量为 100 GiB 文件系统的

```bash
juicefs format sqlite3://myjfs.db myjfs --capacity=100
```

**限制 inode 总量**

可以在创建文件系统时通过 `--inodes` 设置限额，例如

```bash
juicefs format sqlite3://myjfs.db myjfs  --inodes=1024
```

## 2.7 销毁文件系统

销毁文件系统的命令格式如下：

```shell
juicefs destroy <METADATA URL> <UUID>
```

复制

- `<METADATA URL>`：元数据引擎的 URL 地址；
- `<UUID>`：文件系统的 UUID。

**查找文件系统的 UUID**

```
juicefs status sqlite3://myjfs.db
```

注意：销毁操作将导致文件系统关联的数据库记录和对象存储中的数据全部被清空，请务必先备份重要数据后再操作！

```bash
juicefs destroy sqlite3://myjfs.db 45e096f2-05a5-4c63-9225-7a606b2f4171
```

## 2.8 回收站

此特性需要使用 1.0.0 及以上版本的 JuiceFS

对存储系统来说，数据的安全性永远是其需要考虑的关键要素之一。因此，JuiceFS 设计并默认开启了**回收站**功能，会自动将用户删除的文件移动到隐藏的回收站目录内，保留一段时间后才将数据真正清理。

用户在初始化（即执行 `format` 命令）文件系统时，可以通过 `--trash-days` 参数来设置文件在回收站内保留的时间。在此时间段内，应用删除的文件数据不会被真正清理，因此通过 `df` 命令看到的文件系统使用量并不会减少，对象存储中的对象也会依然存在。

- 此参数默认值为 1，意味着回收站内文件会在一天后被自动清理。
- 将此参数值设为 0 即可禁用回收站功能，系统会在短时间内清空回收站，并使得后续应用删除的文件能被立即清理。
- 旧版本 JuiceFS 欲使用回收站，需要在升级所有挂载点后通过 `config` 命令手动将 `--trash-days` 改为需要的正整数值。

```
#示例
juicefs format sqlite3://myjfs.db myjfs --capacity=100 --inodes=2 --trash-days=0
```

# 三、Kubernetes部署JuiceFS

JuiceFS 非常适合用作 Kubernetes 集群的存储层，目前有两种常见的用法。JuiceFS CSI 驱动遵循 CSI 规范，实现了容器编排系统与 JuiceFS 文件系统之间的接口，支持动态配置 JuiceFS 卷提供给 Pod 使用。

**kubernetes版本要求**：Kubernetes 1.14+

**推荐使用helm进行安装**：Helm 3.+

## 3.1 首先确定kubelet的根目录

一般使用`--root-dir`定义，默认为`/var/lib/kubelet`。

```bash
#在node节点执行
ps -ef | grep kubelet | grep root-dir
```

如果结果不为空，则代表 kubelet 的根目录（`--root-dir`）不是默认值（`/var/lib/kubelet`）。

## 3.2 下载helm部署文件

```bash
#添加仓库
helm repo add juicefs-csi-driver https://juicedata.github.io/charts/
#更新仓库
helm repo update
#下载安装包
helm pull juicefs-csi-driver/juicefs-csi-driver
#解压
tar xf juicefs-csi-driver-0.10.0.tgz 
#验证
ls juicefs-csi-driver -l
total 20
-rw-r--r-- 1 root root  417 May  6 18:11 Chart.yaml
-rw-r--r-- 1 root root 7428 May  6 18:11 README.md
drwxr-xr-x 2 root root  162 May 12 14:25 templates
-rw-r--r-- 1 root root 5436 May  6 18:11 values.yaml  #配置文件需要修改这个
```

## 3.3 修改配置

主要修改valuses.yml文件

```bash
#需要徐修改的如下
image镜像地址
#kubelet的根目录，改为自己的默认为/var/lib/kubelet
kubeletDir: /data1/kubelet/root
#重要的存储类配置
storageClasses:
  # 存储类名称
- name: juicefs-sc
  # 是否创建一个新的存储类，默认为true无需修改
  enabled: true
  # 删除策略
  reclaimPolicy: Delete
#元数据与数据存储配置
  backend:
    # 文件系统的名称.
    name: "juice"
    # 连接元数据存储的配置，我这里使用redis单节点，当然也可以选择其他的存储，如pg,etcd等。
    metaurl: "redis://:123456@192.168.10.76:6379/0"
    # 数据存储的类型，可以在众多s3对象存储中选择，我这里使用minio
    storage: "minio"
    # 访问对象存储的密钥,根据情况配置
    accessKey: "minio"
    # 访问对象存储的密钥，根据情况配置
    secretKey: "minio123"
    # 使用对象存储访问地址配置
    bucket: "http://192.168.10.76:9000/juicefs"
    # -- Env for mount pod and format, such as `{"a": "b"}`
    envs: ""
    # -- Config for mount pod. Read [this document](https://juicefs.com/docs/csi/examples/config-and-env) for more usage.
    configs: ""
    # 回收站设置，默认保留一天的数据
    trashDays: "0"
    # 创建文件系统的参数，默认没有
    formatOptions: ""

#挂载相关
  mountOptions:
  # Example:
  # - debug
  # - cache-size=2048
  # - cache-dir=/var/foo

#挂载匹配相关
  pathPattern: ""
#挂载pod资源限制，每挂载一个pvc都会自动生成一个挂载pod运行
  mountPod:
    resources:
      limits:
        cpu: 5000m
        memory: 5Gi
      requests:
        cpu: 1000m
        memory: 1Gi
```

## 3.4 部署

```bash
#创建命名空间
kubectl create ns juicefs
#部署
helm install juicefs-csi-driver -n juicefs -f ./values.yaml   .
#验证，所有容器应该是runing状态
[root@node06 juicefs-csi-driver]# kubectl get pod -n juicefs 
NAME                       READY   STATUS    RESTARTS   AGE
juicefs-csi-controller-0   3/3     Running   0          92s
juicefs-csi-node-4p5jh     3/3     Running   0          92s
juicefs-csi-node-72gzw     3/3     Running   0          92s
juicefs-csi-node-97wrp     3/3     Running   0          92s
juicefs-csi-node-lkhg6     3/3     Running   0          92s
juicefs-csi-node-pt4gt     3/3     Running   0          92s
#验证存储类
[root@node06 juicefs-csi-driver]# kubectl get storageclasses.storage.k8s.io 
NAME         PROVISIONER          RECLAIMPOLICY   VOLUMEBINDINGMODE   ALLOWVOLUMEEXPANSION   AGE
juicefs-sc   csi.juicefs.com      Delete          Immediate           false                  2m48s
```

## 3.5 测试

```bash
#创建PVC并且挂载
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: juicefs-pvc
spec:
  accessModes:
  - ReadWriteMany
  resources:
    requests:
      storage: 2Gi
  storageClassName: juicefs-sc
---
apiVersion: v1
kind: Pod
metadata:
  name: juicefs-app
spec:
  containers:
  - args:
    - -c
    - while true; do echo $(date -u) >> /data/out.txt; sleep 5; done
    command:
    - /bin/sh
    image: 192.168.10.76:5000/bash/busybox
    name: app
    volumeMounts:
    - mountPath: /data
      name: juicefs-pv
  volumes:
  - name: juicefs-pv
    persistentVolumeClaim:
      claimName: juicefs-pvc
```

创建后验证

```bash
#PVC
[root@node06 ~]# kubectl get pvc
NAME          STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   AGE
juicefs-pvc   Bound    pvc-ec5ac15b-317d-47dd-bc16-2acc27f2d7b7   2Gi        RWX            juicefs-sc     33s
#挂载PVC的pod
[root@node06 ~]# kubectl get pod
NAME          READY   STATUS    RESTARTS   AGE
juicefs-app   1/1     Running   0          37s
#挂载后的pod内部，PVC的容量限制并不生效
/ # df -h
Filesystem                Size      Used Available Use% Mounted on
JuiceFS:juice             1.0P      8.0K   1024.0T   0% /data
#每个挂载的PVC都会生成一个挂载Pod，PVC如果不进行挂在他不会存在
[root@node06 ~]# kubectl get pod -n juicefs 
NAME                                                             READY   STATUS    RESTARTS   AGE
juicefs-192.168.10.74-pvc-ec5ac15b-317d-47dd-bc16-2acc27f2d7b7   1/1     Running   0          2m44s
#使用juicefs客户端工具验证，这里可以很清楚的看到存储类其实就是一个文件系统，依据这个存储类创建的PVC都是这个文件系统下的一个目录，Pod挂在pvc其实就是挂在的这个文件系统下对应的目录
[root@node06 ~]# juicefs status redis://:123456@192.168.10.76:6379/0
2022/05/12 17:29:31.520925 juicefs[53908] <INFO>: Meta address: redis://:****@192.168.10.76:6379/0 [interface.go:385]
2022/05/12 17:29:31.523813 juicefs[53908] <INFO>: Ping redis: 69.5µs [redis.go:2750]
{
  "Setting": {
    "Name": "juice",
    "UUID": "8c267ec0-13b9-4739-b89c-b3603e6224bb",
    "Storage": "minio",
    "Bucket": "http://192.168.10.76:9000/juicefs",
    "AccessKey": "minio",
    "SecretKey": "removed",
    "BlockSize": 4096,
    "Compression": "none",
    "Shards": 0,
    "HashPrefix": false,
    "Capacity": 0,
    "Inodes": 0,
    "KeyEncrypted": true,
    "TrashDays": 0,
    "MetaVersion": 1,
    "MinClientVersion": "",
    "MaxClientVersion": ""
  },
  "Sessions": [
    {
      "Sid": 4,
      "Expire": "2022-05-12T17:30:20+08:00",
      "Version": "1.0.0-beta3+2022-05-05.0fb91555",
      "HostName": "juicefs-192.168.10.73-pvc-988d305b-bc92-432c-8a6d-61998a34ae06",
      "MountPoint": "/jfs/pvc-988d305b-bc92-432c-8a6d-61998a34ae06",
      "ProcessID": 7
    },
    {
      "Sid": 2,
      "Expire": "2022-05-12T17:30:30+08:00",
      "Version": "1.0.0-beta3+2022-05-05.0fb91555",
      "HostName": "juicefs-192.168.10.74-pvc-ec5ac15b-317d-47dd-bc16-2acc27f2d7b7",
      "MountPoint": "/jfs/pvc-ec5ac15b-317d-47dd-bc16-2acc27f2d7b7",
      "ProcessID": 7
    }
  ]
}
```

**验证redis中的元数据**

```bash
[root@node06 ~]# redis-cli 
127.0.0.1:6379> AUTH 123456
OK
127.0.0.1:6379> KEYS *
 1) "i301"
 2) "totalInodes"
 3) "c101_0"
 4) "c301_0"
 5) "i1"
 6) "i201"
 7) "i2"
 8) "d1"
 9) "i101"
10) "usedSpace"
11) "d201"
12) "nextsession"
13) "nextchunk"
14) "lastCleanupSessions"
15) "sessionInfos"
16) "x1"
17) "nextinode"
18) "setting"
19) "d2"
20) "lastCleanupFiles"
21) "allSessions"
```

**验证minio中的数据**

```bash
[root@node06 ~]# mc ls minio/juicefs/juice/
[2022-05-12 17:17:25 CST]    36B juicefs_uuid  #当前文件系统的uuid文件
[2022-05-12 17:36:04 CST]     0B chunks/       #这个是真实数据文件
[2022-05-12 17:36:04 CST]     0B meta/         #这个是元数据备份文件,默认为每小时备份一次
```

# 四、监控与数据可视化

作为承载海量数据存储的分布式文件系统，用户通常需要直观地了解整个系统的容量、文件数量、CPU 负载、磁盘 IO、缓存等指标的变化。JuiceFS 通过 Prometheus 兼容的 API 对外提供实时的状态数据，只需将其添加到用户自建的 Prometheus Server 建立时序数据，然后通过 Grafana 等工具即可轻松实现 JucieFS 文件系统的可视化监控。

这里介绍俩种分别是kubernetes中与挂载点指标收集。

## 4.1 挂载点指标收集

当通过 [`juicefs mount`](https://juicefs.com/docs/zh/community/command_reference#juicefs-mount) 命令挂载 JuiceFS 文件系统后，可以通过 `http://localhost:9567/metrics` 这个地址收集监控指标，你也可以通过 `--metrics` 选项自定义。

```
juicefs mount --metrics localhost:9567
```

除此之外，每个 JuiceFS 文件系统的根目录还有一个叫做 `.stats` 的隐藏文件，通过这个文件也可以查看监控指标。例如（这里假设挂载点的路径是 `/mnt`）

```
cat .stats
```

## 4.2 kubernetes中指标收集

kubernetes中每个挂载pvc的Pod都会生成一个挂载Pod，所以需要使用prometheus的pod进行服务发现获取指标数据，示例如下

**prometheus中配置示例**

```yaml
scrape_configs:
  - job_name: 'juicefs'
    kubernetes_sd_configs:
    - role: pod
    relabel_configs:
    - source_labels: [__meta_kubernetes_pod_label_app_kubernetes_io_name]
      action: keep
      regex: juicefs-mount
    - source_labels: [__address__]
      action: replace
      regex: ([^:]+)(:\d+)?
      replacement: $1:9567
      target_label: __address__
    - source_labels: [__meta_kubernetes_pod_node_name]
      target_label: node
      action: replace
```

**kube-prometheus中的ServiceMonitor配置示例**

借助Prometheus Operator提供的 `ServiceMonitor` CRD 可以自动生成抓取配置。但是需要有service资源，所以需要手动创建。

```yaml
#创建的service示例
apiVersion: v1
kind: Service
metadata:  
  name: juicefs
  namespace: juicefs-csi
  labels:
    juicefs: mount
spec:
  clusterIP: None
  ports:
  - name: metrics
    port: 9567
    protocol: TCP
    targetPort: 9567
  selector:
    app.kubernetes.io/name: juicefs-mount
  type: ClusterIP
#ServiceMonitor示例
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  labels:
    k8s-app: juicefs
  name: juicefs
  namespace: monitoring
spec:
  endpoints:
  - honorLabels: true
    interval: 30s
    port: metrics
    path: /metrics
  jobLabel: k8s-app
  namespaceSelector:
    matchNames:
    - juicefs-csi
  selector:
    matchLabels:
      juicefs: mount
```

grafana模板：https://github.com/juicedata/juicefs/blob/main/docs/en/grafana_template_k8s.json

## 4.3 JuiceFS 监控指标详解

**文件系统相关**

- juicefs_used_space：总使用空间，单位字节
- juicefs_used_inodes：总 inodes 数量

**操作系统相关**

- juicefs_uptime：总运行时间，单位秒，也就是总挂载时间
- juicefs_cpu_usage：CPU 使用量，单位秒
- juicefs_memory：内存使用量，单位字节

**元数据引擎相关**

- juicefs_transaction_durations_histogram_seconds：事务的延时分布，秒
- juicefs_transaction_restart：事务重启的次数

**FUSE相关**

- juicefs_fuse_read_size_bytes：读请求的大小分布，字节
- juicefs_fuse_written_size_bytes：写请求的大小分布，字节
- juicefs_fuse_ops_durations_histogram_seconds：所有请求的延时分布，秒
- juicefs_fuse_open_handlers：打开的文件和目录数量

**对象存储相关**

juicefs_object_request_durations_histogram_seconds：请求对象存储的延时分布，秒

juicefs_object_request_errors： 请求失败的总次数

juicefs_object_request_data_bytes：请求对象存储的总数据大小，字节

# 五、JuiceFS的元数据引擎与对象存储设置详解

这里我们可以知道JuiceFS文件系统把数据分为俩部分，分别是源数据与数据，他们分别存放在不同位置，元数据一般存放在元数据服务器中，数据一般存放在对象存储中。JuiceFS支持多种元数据存储服务，对象存储也支持市面上常见的所有对象存储。

## 5.1 源数据引擎配置

官文文档：https://juicefs.com/docs/zh/community/databases_for_metadata

**元数据**至关重要，它记录着每一个文件的详细信息，名称、大小、权限、位置等等。特别是这种数据与元数据分离存储的文件系统，元数据的读写性能决定了文件系统实际的性能表现，而存储元数据的引擎是性能和可靠性最根本的决定因素。性能最好的是redis，但是不支持集群redis支持哨兵模式。

### 1.redis

**配置示例**

```bash
#单机配置
redis[s]://[<username>:<password>@]<host>[:<port>]/<db>
#哨兵
redis[s]://[[USER]:PASSWORD@]MASTER_NAME,SENTINEL_ADDR[,SENTINEL_ADDR]:SENTINEL_PORT[/DB]
#如：
redis://:password@masterName,1.2.3.4,1.2.5.6:26379/2
```

其中，`[]` 括起来的是可选项，其它部分为必选项。

- 如果开启了 Redis 的 TLS 特性，协议头需要使用 `rediss://`，否则使用 `redis://`。
- `<username>` 是 Redis 6.0 之后引入的，如果没有用户名可以忽略，但密码前面的 `:` 冒号需要保留，如 `redis://:<password>@<host>:6379/1`。
- Redis 监听的默认端口号为 `6379`，如果没有改变默认端口号可以不用填写，如 `redis://:<password>@<host>/1`，否则需要显式指定端口号。
- Redis 支持多个逻辑数据库，请将 `<db>` 替换为实际使用的数据库编号。

**挂载示例**

```bash
sudo juicefs mount -d "redis://:mypassword@192.168.1.6:6379/1" /mnt/jfs
```

### 2.PostgreSQL

**配置示例**

```bash
postgres://<username>[:<password>]@<host>[:5432]/<database-name>[?parameters]
```

其中，`[]` 括起来的是可选项，其它部分为必选项。

**挂载示例**

```bash
sudo juicefs mount -d "postgres://user:mypassword@192.168.1.6:5432/juicefs" /mnt/jfs
```

### 3.MySQL

**配置示例**

```bash
mysql://<username>[:<password>]@(<host>:3306)/<database-name>

不要漏掉 URL 两边的 () 括号
```

**挂载示例**

```bash
sudo juicefs mount -d "mysql://user:mypassword@(192.168.1.6:3306)/juicefs" /mnt/jfs
```

## 5.2 对象存储配置

官方文档：https://juicefs.com/docs/zh/community/how_to_setup_object_storage

### 1.Minio

**配置示例**

```bash
juicefs format \
    --storage minio \
    --bucket http://127.0.0.1:9000/<bucket> \
    --access-key minioadmin \
    --secret-key minioadmin \
    ... \
    myjfs
--storage  设置为minio
--bucket   minio的访问地址，最后是存储桶名称
--access-key 访问密钥
--secret-key 访问密钥
```

# 六、其他相关

## 6.1 juicefs bench

JuiceFS 提供了 `bench` 子命令来运行一些基本的基准测试，用以评估 JuiceFS 在当前环境的运行情况，之后会输出结果全部绿色表示性能没有太大问题。

官方文档：https://juicefs.com/docs/zh/community/performance_evaluation_guide

**示例**：

```bash
root@juicefs-192:/app# juicefs bench -p 4 /jfs/pvc-ff2e1f2d-8375-496c-b765-120781637073/
  Write big blocks count: 4096 / 4096 [==============================================================]  done      
   Read big blocks count: 4096 / 4096 [==============================================================]  done      
Write small blocks count: 400 / 400 [==============================================================]  done      
 Read small blocks count: 400 / 400 [==============================================================]  done      
  Stat small files count: 400 / 400 [==============================================================]  done      
Benchmark finished!
BlockSize: 1 MiB, BigFileSize: 1024 MiB, SmallFileSize: 128 KiB, SmallFileCount: 100, NumThreads: 4
Time used: 33.6 s, CPU: 67.2%, Memory: 550.1 MiB
+------------------+------------------+---------------+
|       ITEM       |       VALUE      |      COST     |
+------------------+------------------+---------------+
|   Write big file |     247.62 MiB/s |  16.54 s/file |
|    Read big file |     333.75 MiB/s |  12.27 s/file |
| Write small file |    141.9 files/s | 28.18 ms/file |
|  Read small file |   1703.8 files/s |  2.35 ms/file |
|        Stat file |   9071.4 files/s |  0.44 ms/file |
|   FUSE operation | 71416 operations |    1.10 ms/op |
|      Update meta |  1741 operations |    3.35 ms/op |
|       Put object |  1424 operations |   66.99 ms/op |
|       Get object |  1024 operations |  298.54 ms/op |
|    Delete object |  1424 operations |    1.07 ms/op |
| Write into cache |  1361 operations |    3.43 ms/op |
|  Read from cache |   400 operations |    0.04 ms/op |
+------------------+------------------+---------------+
```

1. N 并发各写 1 个 1 GiB 的大文件，IO 大小为 1 MiB
2. N 并发各读 1 个之前写的 1 GiB 的大文件，IO 大小为 1 MiB
3. N 并发各写 100 个 128 KiB 的小文件，IO 大小为 128 KiB
4. N 并发各读 100 个之前写的 128 KiB 的小文件，IO 大小为 128 KiB
5. N 并发各 stat 100 个之前写的 128 KiB 的小文件
6. 清理测试用的临时目录

并发数 N 的值即由 `bench` 命令中的 `-p` 参数指定。

## 6.2 juicefs stats

JuiceFS `stats` 是一个实时统计 JuiceFS 性能指标的工具，类似 Linux 系统的 `dstat` 命令，可以实时显示 JuiceFS 客户端的指标变化。可以在性能测试时打开观测资源消耗。

官方文档：https://juicefs.com/docs/zh/community/stats_watcher

**示例**

```bash
root@juicefs-192:/app# juicefs stats /jfs/pvc-ff2e1f2d-8375-496c-b765-120781637073/ --verbosity 1
```

## 6.3 JuiceFS Profile

JuiceFS `profile` 一方面用来实时输出 JuiceFS 客户端的所有访问日志，包含每个请求的信息。同时，它也可以用来回放、统计 JuiceFS 访问日志，方便用户直观了解 JuiceFS 的运行情况.

示例：https://juicefs.com/docs/zh/community/operations_profiling

```bash
#执行 juicefs bench 时，在另一个会话中执行以下命令
root@juicefs-192:/app# cat /jfs/pvc-ff2e1f2d-8375-496c-b765-120781637073/.accesslog > access.log
#执行测试
juicefs bench -p 1 /jfs/pvc-ff2e1f2d-8375-496c-b765-120781637073/
#其中 .accesslog 是一个虚拟文件，它平时不会产生任何数据，只有在读取（如执行 cat）时才会有 JuiceFS 的访问日志输出。结束后使用 Ctrl-C 结束 cat 命令，并运行
juicefs profile access.log --interval 0
#其中--interval参数设置访问日志的采样间隔，设为 0 时用于快速重放一个指定的日志文件
```

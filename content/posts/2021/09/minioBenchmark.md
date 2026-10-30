---
title: "minio性能测试"
date: 2021-09-08T21:04:34+08:00
draft: false
description: "记录 MinIO 在单机与集群场景下的性能测试数据和结果对比。"
cover: "https://b3logfile.com/bing/20190805.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["应用服务"]
tags: ["minio"]
toc: true
---
**压测参数说明**

- 压测数据量为：2个backet，每个backet为10000对象。每个对象大小512kb
- 所有minio服务内核以及资源优化都相同
- 整体读写压测时间为10分，读写比例为读写各占百分之50
- 一共4台压测客户端，每个客户端4个读写进程,整体16个读写线程。
- 所有测试都经过多次验证

```bash
#所有服务器内核优化
https://gitlab.gridsum.com/TechnologySharingCenter/back-end/research/-/issues/18#%E8%84%9A%E6%9C%AC
```

**minio服务器数据磁盘性能**

多次测试

![image-20210906104532889](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/Typoraimage-20210906104532889.png)

# 一、单机测试数据

## 1.1 单机单个数据盘

单块数据盘并不实现纠删码功能，即数据盘故障minio就无法正常工作，数据存储空间比例为1:1

**minio服务器规格4C 16G**

![image-20210906130709615](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/Typoraimage-20210906130709615.png)

| 操作类型 | 操作数     | 操作产生的数据 | 操作的平均时间 | 吞吐量     | 速率       |
| -------- | ---------- | -------------- | -------------- | ---------- | ---------- |
| read     | 154.74kops | 79.23G         | 11.41ms        | 258.24op/s | 132.22MB/s |
| write    | 155.01kops | 79.36G         | 43.12ms        | 258.69op/s | 132.45MB/s |

**内存使用情况最高值**

![image-20210906130149541](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/Typoraimage-20210906130149541.png)

- used(776M)
- memory buffers(2M)
- memory cached(9.802G)

**CPU负载最高值**

![image-20210906130449091](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/Typoraimage-20210906130449091.png)

- 1m load average(11.70)
- 5m load average(9.96)
- 15m load average(5.30)

## 1.2 单机多个数据盘

**minio服务器规格4C 16G，挂载4个数据盘作为minio的存储，用来实现纠删码功能，数据存储空间比例为1:2**

由于测试环境所有数据盘都使用一块盘，性能测试并不标准,正常情况下所有数据盘都为独立的个体。

![image-20210906132430404](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/Typoraimage-20210906132430404.png)

| 操作类型 | 操作数     | 操作产生的数据 | 操作的平均时间 | 吞吐量    | 速率      |
| -------- | ---------- | -------------- | -------------- | --------- | --------- |
| read     | 35.28 kops | 18.06G         | 34.09ms        | 58.81op/s | 30.11MB/s |
| write    | 35.14 kops | 17.99G         | 230.51ms       | 58.59op/s | 30MB/s    |

**内存使用量峰值**

![image-20210906132624063](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/Typoraimage-20210906132624063.png)

- used(1.82G)
- memory buffers(164KB)
- memory cached(12.43G)

**CPU负载峰值**

![image-20210906132831172](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/Typoraimage-20210906132831172.png)

- 1m load average(33.63)
- 5m load average(27.39)
- 15m load average(15.64)

## 1.3 单机压测总结

- 单机多块数据盘相比单机一块数据盘读写性能直线下降，下降比例符合1/4,体现了一块磁盘做四个数据盘读写竞争得到的最终结果。
- 多块数据盘实现了纠删码功能但对内存以及cpu的需求更大，具体数值比例由于一块数据盘测试时磁盘写入速度太低导致cpu等待读写时间过长导致cpu负载比实际环境中的值要高出许多所以这里无法进准确测试。
- 不建立使用同一块硬盘实现minio的多个数据目录会极大的降低读写性能
- 预计使用多块硬盘组成minio的数据盘会极大的提升minio的读写性能（环境有限无法验证）

# 二、集群测试数据

**minio服务器规格4C 16G，一共四台每台四个数据目录**

**nginx代理服务器 4C 16G，nginx版本1.20.1，不使用https**

![image-20210906160809094](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/Typoraimage-20210906160809094.png)

| 操作类型 | 操作数     | 操作产生的数据 | 操作的平均时间 | 吞吐量    | 速率      |
| -------- | ---------- | -------------- | -------------- | --------- | --------- |
| read     | 46 kops    | 23.55G         | 45.53ms        | 76.68op/s | 39.26MB/s |
| write    | 45.85 kops | 23.48G         | 144.89ms       | 76.43op/s | 39.13MB/s |

**各minio服务节点内存使用量峰值**

**minio1**

![image-20210906161045176](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/Typoraimage-20210906161045176.png)

- used(1.39G)
- memory buffers(164KB)
- memory cached(10.41G)

**minio2**

![image-20210906161233875](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/Typoraimage-20210906161233875.png)

- used(1.33G)
- memory buffers(2M)
- memory cached(10.27G)

**minio3**

![image-20210906161337851](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/Typoraimage-20210906161337851.png)

- used(1.28G)
- memory buffers(2M)
- memory cached(10.02G)

**minio4**

![image-20210906161427393](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/Typoraimage-20210906161427393.png)

- used(1.36G)
- memory buffers(2M)
- memory cached(9.53G)

**各minio服务节点cpu负载峰值**

**minio1**

![image-20210906161616204](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/Typoraimage-20210906161616204.png)

- 1m load average(6.740)
- 5m load average(5.26)
- 15m load average(3.75)

**minio2**

![image-20210906161616204](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/Typoraimage-20210906161616204.png)

- 1m load average(6.770)
- 5m load average(4.970)
- 15m load average(3.70)

**minio3**

![image-20210906162037540](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/Typoraimage-20210906162037540.png)

- 1m load average(5.170)
- 5m load average(3.850)
- 15m load average(2.90)

**minio4**

![image-20210906162145957](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/Typoraimage-20210906162145957.png)

- 1m load average(6.300)
- 5m load average(5.120)
- 15m load average(3.800)

# 三、各压测数据总汇

**读写总和**

| 压测类型                                    | 操作数     | 操作产生的数据 | 操作的平均时间 | 吞吐量     | 速率       | 内存使用总计 | cpu负载15分 |
| ------------------------------------------- | ---------- | -------------- | -------------- | ---------- | ---------- | ------------ | ----------- |
| 单机单数据盘                                | 309.75kops | 158.59G        | 54.53ms        | 516.93op/s | 264.67MB/s | 10.56G       | 5.30        |
| 单机多数据盘(4个数据盘)                     | 70.42kops  | 36.05G         | 264.6ms        | 117.4op/s  | 60.11MB/s  | 14.25G       | 15.64       |
| 集群多数据盘(4台minio服务器，每台4个数据盘) | 91.85kops  | 47.03G         | 190.42ms       | 153.11op/s | 78.39MB/s  | 11.39G       | 3.53        |

**性能测试总结描述**

- 由于所有数据盘都在一个物理磁盘上面，这里读写性能仅能做比对，无法提供优化的具体数据参考
- 单机单数据盘由于无删码功能，所以cpu使用率比较低，单机只要开启纠删码功能(多数据盘自动开启)对cpu性能要求是比较高的
- 这里单机单数据盘与集群多数据盘内存使用差距并不大，反而是单机多数据盘内存使用比较高，这里可能的原因为cpu负载过高导致（待验证），cpu负载最可能的原因是磁盘速率影响导致cpu在长时间等待io操作的结果(待验证)
- 这里读写性能最好的是单机单数据盘，最主要的原因就是所有数据盘底层都是一个物理磁盘导致，如果底层是真实的独立的磁盘单机多数据盘与集群多数据盘的性能会极大的提升(具体提升比例待验证)
- 这里非常有意思的是单机多数据盘与集群多数据盘的性能是集群多数据盘的性能要比单机多数据盘要好一些，按照一个磁盘来说单机多数据盘的速率是60M由于底层是一个磁盘他有四个数据目录，4*60=240是与单机的速率是非常接近的，但是集群多数据盘是4个节点每个节点4个数据盘4\*4=16一共是16个数据目录，正常情况下一个磁盘被分为16个目录同时读写他的速率应该是1/16,可是集群的读写速率达到了78.39。**原因**：由于前面使用的是nginx代理，所有的访问请求是通过nginx以轮询的方式转发到后端minio服务器，所以严格来说所有节点并不是同时读写磁盘，由于集群模式是多个minio节点同时处理请求，这也就导致了所有的节点都分担了一部分任务，从而cpu负载极大的降低，cpu可以极快的处理请求。
- 网络的测试数据并不准确，由于都是在一个主机上不同虚拟机测试，并不提供数据，但是在分布式环境中数据同步会极大的消耗网络带宽，所以网络也是分布式环境中一个重要指标(无法测试)

**性能排行**

集群多数据盘 >  单机多数据盘 > 单机单数据盘

**minio对性能要求依赖**

- 最重要的就是磁盘io性能，如果磁盘io性能较低会极大的影响cpu以及内存的性能
- cpu性能最大的影响因素是是否使用多块磁盘或使用minio集群功能开启纠删码功能，纠删码会非常依赖cpu性能
- 内存利用率，minio程序真实的内存使用率并不高，大多数内存使用都是内存缓存使用(即minio写入的数据应该是先写入缓存在写入硬盘)，所以如果磁盘io性能不行会极大的影响内存使用率从而降低性能

重要性：磁盘io > cpu/内存

- 集群环境如果磁盘io不是瓶颈，就要检查是否是网络带宽不够导致集群读写性能不够，处理方法把客户端访问入口与集群通信入口的网卡分开物理设置区分(即集群通信一个网段，客户端访问一个网段)，避免集群同步数据与客户端访问数据竞争网络带宽。

# 四、总结

- 任何存储服务，如果大规模使用并对性能以及容量有要求，都要进行物理环境的提前规划以及软件环境的性能验证
- 生产环境如果性能的要求比较高，建议采用物理服务器以及物理磁盘进行部署，并且根据自己需求选配物理硬件，不建立使用虚拟化技术以及虚拟磁盘，如果是存储服务器也要提前进行性能评估
- 集群环境首先考虑的是集群读写性能，以及集群网络带宽(集群模式网络是非常重要的)
- 存储服务如果依赖文件系统可以查看官方文档是否支持（btrfs文件系统），可以考虑使用会极大的提升性能，但是这个文件系统并没有在发行版的linux系统中大规模使用，一些功能也在实验阶段，并不稳定，所以可以根据自己需求选择
  

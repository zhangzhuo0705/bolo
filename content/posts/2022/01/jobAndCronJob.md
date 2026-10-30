---
title: "Job&CronJob"
date: 2022-01-11T16:51:26+08:00
lastmod: 2022-01-11T16:52:24+08:00
draft: false
description: "覆盖 Job 与 CronJob 的控制器模型，演示批处理任务和定时任务的配置。"
cover: "https://b3logfile.com/bing/20171205.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["Kubernetes"]
tags: ["Kubernetes"]
toc: true
---
# 一、Job&CronJob介绍

## 1.1 Job介绍

**官方介绍**：https://kubernetes.io/zh/docs/concepts/workloads/controllers/job/

Job 会创建一个或者多个 Pods，并将继续重试Pods的执行，直到指定数量的 Pods 成功终止。 随着 Pods 成功结束，Job 跟踪记录成功完成的 Pods 个数。 当数量达到指定的成功个数阈值时，任务（即 Job）结束。 删除 Job 的操作会清除所创建的全部 Pods。 挂起 Job 的操作会删除 Job 的所有活跃 Pod，直到 Job 被再次恢复执行。

一种简单的使用场景下，你会创建一个 Job 对象以便以一种可靠的方式运行某 Pod 直到完成。 当第一个 Pod 失败或者被删除(比如因为节点硬件失效或者重启)时，Job 对象会启动一个新的 Pod。

你也可以使用 Job 以并行的方式运行多个 Pod。

**使用场景**：一般用于部署服务时执行初始化操作，一般只需要部署新服务时才会进行创建，执行完毕后一般就没有用了。

## 1.2 CronJob介绍

**官方介绍**：https://kubernetes.io/zh/docs/concepts/workloads/controllers/cron-jobs/

一个 CronJob 对象就像 *crontab* (cron table) 文件中的一行。 它用 Cron格式进行编写， 并周期性地在给定的调度时间执行 Job。

CronJob 用于执行周期性的动作，例如备份、报告生成等。 这些任务中的每一个都应该配置为周期性重复的（例如：每天/每周/每月一次）； 你可以定义任务开始执行的时间间隔。

**注意**：所有 CronJob 的 `schedule:` 时间都是基于 kube-controller-manager的时区。

# 二、Job&CronJob使用

## 2.1 Job使用

**yaml文件示例**

```yaml
apiVersion: batch/v1   #api版本
kind: Job              #资源类型
metadata:              #源数据定义
  name: echo           #名称
  namespace: default   #命名空间
spec:                  #具体定义
  suspend: true        # 1.21+版本后新参数暂停执行，如果设置为true创建Job后不会立即执行，需要把true改为false才会执行
  ttlSecondsAfterFinished: 100  #Job在执行结束之后（状态为completed或Failed）自动清理。设置为0表示执行结束立即删除，不设置则不会清除，需要开启TTLAfterFinished特性
  backoffLimit: 4  #如果任务执行失败，失败多少次后不再执行
  completions: 1   #有多少个Pod执行成功，认为任务是成功的
  parallelism: 1   #并行执行任务的数量
  template:        #以下为Pod定义
    spec:
      containers:
      - name: centos
      ...
      restartPolicy: Never  #Pod重启策略，必须填写
```

## 2.2 CronJob使用

**yaml文件示例**

```yaml
apiVersion: batch/v1beta1  #api版本，1.21+为batch/v1
kind: CronJob              #资源类型
metadata:                  #源数据定义
  name: hello              #名称
  namespace: default       #命名空间
spec:                      #具体定义
  concurrencyPolicy: Allow #并发调度策略。可选参数如下Allow：允许同时运行多个任务，Forbid：不允许并发运行，如果之前的任务尚未完成，新的任务不会被创建，Replace：如果之前的任务尚未完成，新的任务会替换的之前的任务。
  failedJobsHistoryLimit: 1 #保留多少失败的任务。
  schedule: '*/1 * * * *'   #调度周期，和Linux一致，分别是分时日月周。
  successfulJobsHistoryLimit: 3 #保留多少已完成的任务，按需配置。
  suspend: false          #如果设置为true，则暂停后续的任务，默认为false。
  jobTemplate:            #这个为job数据定义，可以设置metadata.labels标签  
    spec:                 #以下为Pod设置
      template:
        spec:
          containers:    
          - name: hello
          ...
          restartPolicy: OnFailure  #必须设置，重启策略，和Pod一致。
```

## 2.3 Cron 时间表语法

```bash
# ┌───────────── 分钟 (0 - 59)
# │ ┌───────────── 小时 (0 - 23)
# │ │ ┌───────────── 月的某天 (1 - 31)
# │ │ │ ┌───────────── 月份 (1 - 12)
# │ │ │ │ ┌───────────── 周的某天 (0 - 6)（周日到周一；在某些系统上，7 也是星期日）
# │ │ │ │ │
# │ │ │ │ │
# │ │ │ │ │
# * * * * *
```

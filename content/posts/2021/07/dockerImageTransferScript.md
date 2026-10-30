---
title: "docker镜像上传下载脚本"
date: 2021-07-26T14:57:07+08:00
lastmod: 2021-07-27T09:57:10+08:00
draft: false
description: "用 Shell 脚本批量拉取、重命名、导出并上传 Docker 镜像到私有仓库。"
cover: "https://b3logfile.com/bing/20180410.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["Shell脚本"]
tags: ["Docker"]
toc: true
---
# 一、镜像下载以及替换tag

```bash
list=`cat $1`
#修改后的镜像仓库
Registry='harbor.zhangzhuo.org/base/'
echo > images-save.txt
echo > images-name.txt
for var in $list;do
  #取镜像名称及tag
  tmp=${var##*/}
  #取镜像仓库url
  repo=${var%/*}
  #取镜像名称
  project=${tmp%%:*}
  #取镜像tag
  tag=${tmp##*:}
  #修改原本镜像仓库url地址为新的的仓库url地址
  eval new_image_url=${Registry}${tmp}
  #拉取镜像
  docker pull ${var}
  #修改镜像tag
  docker tag ${var} ${new_image_url}
  #导出镜像
  docker save ${new_image_url} -o ${project}-${tag}.tar.gz
  #记录导出的文件名称
  echo ${project}-${tag}.tar.gz >> images-save.txt
  #记录修改后的镜像名称
  echo ${new_image_url} >>images-name.txt
done
```

# 二、上传镜像脚本

```bash
#!/bin/bash
docker_load=`cat images-save.txt`
docker_push=`cat image-name.txt`

for load  in ${docker_load};do
  docker load < ${load}
  echo '*****************镜像导入信息**********************'
  echo "镜像包${load}导入完成"
done

for push in ${docker_push};do
  docker push ${push}
  echo '*****************镜像上传信息**********************'
  echo "镜像${push}上传完成"
done
```

# 三、涉及到的知识

## 3.1 字符串切片

```bash
#变量赋值
var=harbor.zhangzhuo.org/base/kubeasz-ext-bin:v3.15.3
#返回字符串长度
num=${#var}
echo $num
49
#基于模式匹配取字符串，自左而右
echo $var
harbor.zhangzhuo.org/base/kubeasz-ext-bin:v3.15.3
num=${var##*/}
echo $num
kubeasz-ext-bin:v3.15.3
#基于模式匹配取字符串，自右而左
echo $var
harbor.zhangzhuo.org/base/kubeasz-ext-bin:v3.15.3
num=${var%%/*}
echo $num
harbor.zhangzhuo.org
```

## 3.2 高级变量的使用

**变量的间接引用**

```bash
#eval命令将会首先扫描命令行进行所有的置换，然后再执行该命令。该命令适用于那些一次扫描无法实现其功能的变量,该命令对变量进行两次扫描
a=whoami
eval $a
root

#常用方式
[09:50:35 root@centos7 ~]#n=10
[09:51:46 root@centos7 ~]#echo {1..$n}
{1..10}
[09:51:56 root@centos7 ~]#eval echo {1..$n}
1 2 3 4 5 6 7 8 9 10
```

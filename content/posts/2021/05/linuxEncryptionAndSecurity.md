---
title: "12-加密与安全"
date: 2021-05-17T11:50:40+08:00
lastmod: 2021-06-02T10:35:42+08:00
draft: false
description: "从安全模型与常见攻击出发，讲解加密、证书、SSH 加固和 sudo 权限控制。"
cover: "https://b3logfile.com/bing/20210223.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["Linux系统基础知识"]
tags: ["linux", "ssh", "sudo", "chrony"]
toc: true
---
# 一、安全机制

## 1.1 墨菲定律

墨菲定律：一种心理学效应，是由爱德华·墨菲提出的，原话：如果有俩种或俩种以上的方式去做某件事，而其中一种选择方式导致灾难，则必定有人会做出这种选择

**主要内容：**

* 任何事情都没有表面看起来那么简单
* 所有的事都会比你预计的时间长
* 会出错的事总会出错
* 如果你担心某种情况发送，那么它就更可能发生

## 1.2 信息安全防护的目标

* 保密性       Confidentiality
* 完整性       Integrity
* 可用性       Usability
* 可控制性    Controlability
* 不可否认性    Non-repudiation

## 1.3 安全防护环节

* 物理安全：各种设备/主机、机房环境
* 系统安全：主机或设备的操作系统
* 应用安全：各种网络服务、应用程序
* 网络安全：对网络访问的控制、防火墙规则
* 数据安全：信息的备份与恢复、加密解密
* 管理安全：各种保障性的规范、流程、方法

## 1.4 常见的安全攻击STRIDE

* Spoofing 假冒
* Tampering 篡改
* Repudiation 否认
* Information Disclosure 信息泄漏
* Denial of Service 拒绝服务
* Elevation of Privilege 提升权限

## 1.5 安全设计基本原则

* 使用成熟的安全系统
* 以小人之心度输入数据
* 外部系统是不安全的
* 最小授权
* 减少外部接口
* 缺省使用安全模式
* 安全不是似是而非从STRIDE思考
* 在入口处检查
* 从管理上保护好你的系统

## 1.6 常用安全技术

* 认证
* 授权
* 审计
* 安全通信

## 1.7 加密算法和协议

* 对称加密
* 非对称（公钥）加密
* 单向加密
* 认证协议

### 1.7.1 对称加密算法

![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-484b875e.png)

对称加密：加密和解密使用同一个密钥

**特性：**

* 加密、解密使用同一个密钥，效率高
* 将原始数据分割成固定大小的块，逐个进行加密

**缺陷：**

* 密钥过多
* 密钥分发
* 数据来源无法确认

**常见对称加密算法:**

* DES：Data Encryption Standard，56bits
* 3DES：
* AES：Advanced (128, 192, 256bits)
* Blowfish，Twofish
* IDEA，RC6，CAST5

### 1.7.2 非对称加密算法

**非对称加密：密钥是成对出现**

* 公钥：public key，公开给所有人，主要给别人加密使用
* 私钥：secret key，private key 自己留存，必须保证其私密性，用于自已加密签名
* 特点：用公钥加密数据，只能使用与之配对的私钥解密；反之亦然

**功能：**

* 数据加密：适合加密较小数据,比如: 加密对称密钥
* 数字签名：主要在于让接收方确认发送方身份

**缺点：**

* 密钥长,算法复杂
* 加密解密效率低下

**常见算法：**

* RSA：由 RSA 公司发明，是一个支持变长密钥的公共密钥算法，需要加密的文件块的长度也是可变的,可实现加密和数字签名
* DSA（Digital Signature Algorithm）：数字签名算法，是一种标准的 DSS（数字签名标准）
* ECC（Elliptic Curves Cryptography）：椭圆曲线密码编码学，比RSA加密算法使用更小的密钥， 提供相当的或更高等级的安全

### 1.7.2.1 非对称加密实现加密

![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-bb06bec9.png)

**接收者**

* 生成公钥/密钥对：P和S 公开公钥P，保密密钥S

**发送者**

* 使用接收者的公钥来加密消息M 将P(M)发送给接收者

**接收者**

* 使用密钥S来解密：M=S(P(M))

### 1.7.2.2 非对称加密实现数字签名

![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-63e167d8.png)

**发送者**

* 生成公钥/密钥对：P和S
* 公开公钥P，保密密钥S
* 使用密钥S来加密消息M
* 发送给接收者S(M)

**接收者**

* 使用发送者的公钥来解密M=P(S(M))

### 1.7.2.3 RSA和DSA

RSA：公钥加密算法是1977年由Ron Rivest、Adi Shamirh和LenAdleman在（美国麻省理工学院）开发的，RSA取名来自开发他们三者的名字，后成立RSA数据安全有限公司。RSA是目前最有影响力的公钥加密算法，它能够抵抗到目前为止已知的所有密码攻击，已被ISO推荐为公钥数据加密标准。RSA算法基于一个十分简单的数论事实：将两个大素数相乘十分容易，但那时想要对其乘积进行因式分解却极  其困难，因此可以将乘积公开作为加密密钥

DSA (Digital Signature Algorithm)：1991年7月26日提交，并归属于David W. Kravitz前NSA员工， DSA是Schnorr和ElGamal签名算法的变种，被美国NIST作为SS(DigitalSignature Standard)， DSA是基于整数有限域离散对数难题的，其安全性与RSA相比差不多。DSA只是一种算法，和RSA不同之处在       于它不能用作加密和解密，也不能进行密钥交换，只用于签名,它比RSA要快很多

### 1.7.3 使用gpg实现对称和非对称加密

#### 1.7.3.1 实现对称加密

**对称加密file文件**

```bash
[19:10:49 root@centos8 ~]#gpg -c passwd.txt
```

**在另一台主机上解密file文件，-o表示解密后生成的文件，-d要解密的文件**

```bash
[19:12:09 root@centos7 ~]#gpg -o passwd.txt -d passwd.txt.gpg
```

**注意：加密时需要输入密码，解密时也需要输入密码**

#### 1.7.3.2 实现公钥加密

目标：在hostB主机上用公钥加密，在hostA主机上解密B-->A

**在hostA主机上生成公钥/私钥对**

```bash
[19:16:39 root@centos8 ~]#gpg --gen-key
```

**在hostA主机上查看公钥**

```bash
[19:17:46 root@centos8 ~]#gpg --list-keys
```

**在hostA主机上导出公钥到zhang.pubkey**

```bash
[19:17:52 root@centos8 ~]#gpg -a --export -o zhang.pubkey
```

**从hostA上复制公钥文件到需加密的B主机上**

```bash
[19:19:12 root@centos8 ~]#scp zhang.pubkey 192.168.10.71:
```

**在需加密数据的hostB主机上生成公钥/私钥对**

```bash
[19:21:06 root@centos7 ~]#gpg --gen-key
```

**在hostB主机上导入公钥**

```bash
[19:25:13 root@centos7 ~]#gpg --import zhang.pubkey
[19:25:58 root@centos7 ~]#gpg --list-keys
```

**用从A主机导入的公钥，加密hostB主机的文件file，生成加密文件**

```bash
[19:28:11 root@centos7 ~]#gpg -e -r zhang fstab
```

**复制加密文件到hostA主机**

```bash
[19:28:44 root@centos7 ~]#scp fstab.gpg 192.168.10.81:
```

**在hostA主机解密文件**

```bash
[19:20:06 root@centos8 ~]#gpg -o fstab -d fstab.gpg
```

**删除公钥和私钥**

```bash
[19:30:59 root@centos8 ~]#gpg --delete-secret-keys zhang
[19:28:58 root@centos7 ~]#gpg --delete-keys zhang
```

### 1.7.4 单向哈希算法

哈希算法：也称为散列算法，将任意数据缩小成固定大小的“指纹”，称为digest，即摘要

**特性：**

* 任意长度输入，固定长度输出
* 若修改数据，指纹也会改变，且有雪崩效应，数据的一点微小改变，生成的指纹值变化非常大。
* 无法从指纹中重新生成数据，即不要逆，具有单向性

**功能：数据完整性**

**常见算法**

md5: 128bits、sha1: 160bits、sha224   、sha256、sha384、sha512

**常用工具**

* md5sum | sha1sum [ --check ] file
* openssl、gpg
* rpm -V

**数字签名**

![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-a0534fb1.png)

RPM 文件完整性

rpm --verify package_name (or -V)

rpm --import /etc/pki/rpm-gpg/RPM-GPG-KEY-redhat*

rpm --checksig pakage_file_name (or -K)

### 1.7.5 综合应用多种加密算法

#### 1.7.5.1 实现数据加密

实现数据加密，无法验证数据完整性和来源

![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-0a94c919.png)

**发送方：先使用对称加密加密源数据生成对称密钥，然后用非对称加密加密之前生成的对称密钥生成加密的对称密钥然后发送**
**接收方：使用自己的非对称密钥的私钥来解密加密的对称密钥，之后得到对称加密的数据然后使用对称密钥来解密得到数据**
![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-c146d0ae.png)

#### 1.7.5.2 实现数字签名

不加密数据，可以保证数据来源的可靠性、数据的完整性和一致性
![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-89614d64.png)

**发送方：使用hash算法提取数据的摘要，然后使用非对称加密的私钥加密摘要得到数字签名然后发送**
**接收方：使用非对称加密的公钥解密数字签名得到摘要，然后对数据进行hash算法得到元数据摘要，用元数据摘要和之前解密的摘要进行比对**

#### 1.7.5.3 综合加密和签名

即实现数据加密，又可以保证数据来源的可靠性、数据的完整性和一致性
![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-30e40939.png)

**发送方：对数据进行hash算法得到数字摘要，然后使用自己的非对称加密的私钥加密数字摘要得到数字签名，然后把数字签名和数据使用对方的公钥来加密得到加密的密文发送**
**接收方：先使用自己的私钥解密密文得到数字签名和数据，对数字签名使用使用对方的公钥进行解密得到数字摘要同时对源数据进行hash算法也得到数字签名，最后把俩个数字签名进行比对**
方法2：对称key{Sa[hash(data)]+data}+Pb(对称key)

![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-f2b97f0e.png)

**发送方：对数据进行hash算法得到摘要，使用自己的私钥对摘要进行加密得到数字签名，对数字签名和数据进行对称加密得到对称密钥，使用对方的公钥对对称加密进行加密得到加密的对称密钥然后发送**
**接收方：使用自己的私钥对加密的对称密钥解密得到对称密钥，使用对称密钥对对称密钥进行解密得到数据和签名，使用对方的公钥对数字签名解密得到摘要信息，对数据进行hash算法也得到摘要信息，最后进行比对如果没有错误得到数据**

### 1.7.6 密码交换

**密钥交换：IKE（ Internet Key Exchange ）**

* 公钥加密：用目标的公钥加密对称密钥
* DH (Deffie-Hellman)：生成对称（会话）密钥，由惠特菲尔德·迪菲（Bailey Whitfield Diffie）和马丁·赫尔曼（Martin Edward Hellman）在1976年发表

参 看 ： [https://en.wikipedia.org/wiki/Diffie%E2%80%93Hellman_key_exchange](https://en.wikipedia.org/wiki/Diffie%E2%80%93Hellman_key_exchange)

**DH实现过程：**

* A: g,p 协商生成公开的整数g, 大素数p
* B: g,p
* A:生成隐私数据:a (a<p)，计算得出 g^a%p，发送给B
* B:生成隐私数据:b,(b<p)，计算得出 g^b%p，发送给A
* A:计算得出 [(g^b%p)^a] %p = g^ab%p，生成为密钥
* B:计算得出 [(g^a%p)^b] %p = g^ab%p，生成为密钥

**范例:**

```bash
g=23
p=5

A:a=6
23^6%5=4

2^6%5=4

B:b=15
23^15%5=2

4^15%5

[root@centos8 ~]#echo 23^15%5|bc
2
[root@centos8 ~]#echo 23^6%5|bc
4
```

## 1.8 CA和证书

### 1.8.1 中间人攻击

Man-in-the-middle，简称为 MITM，中间人

![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-c662e518.png)

### 1.8.2 CA和证书

![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-1e2f0611.png)
![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-47f3ab49.png)

**PKI：Public Key Infrastructure 公共密钥加密体系**

* 签证机构：CA（Certificate Authority）
* 注册机构：RA
* 证书吊销列表：CRL
* 证书存取库：

**X.509：定义了证书的结构以及认证协议标准**

* 版本号
* 序列号
* 签名算法
* 颁发者
* 有效期限
* 主体名称

**证书类型：**

* 证书授权机构的证书
* 服务器证书
* 用户证书

**获取证书两种方法：**

* 自签名的证书： 自已签发自己的公钥
* 使用证书授权机构：
  * 生成证书请求（csr）
  * 将证书请求csr发送给CA
  * CA签名颁发证书

### 1.8.3 安全协议 SSL/TLS

#### 1.8.3.1 TLS介绍

SSL：Secure Socket Layer，TLS: Transport Layer Security

1994年，NetScape公司设计了SSL协议（Secure Sockets Layer）的1.0版，但是未发布

1995：SSL 2.0 Netscape 开发

1996：SSL 3.0

1999：TLS 1.0

2006：TLS 1.1 IETF(Internet工程任务组) RFC 4346，从2020年3月起，停止支持TLS 1.1及TLS 1.0版本安全协议，谷歌（Chrome）、Mozilla（Firefox）、微软（IE和Edge） 、苹果（Safari） 都会发布新版浏览器执行这个策略

2008：TLS 1.2 当前主要使用

2018：TLS 1.3

**功能：**

* 机密性
* 认证
* 完整性
* 重放保护

#### 1.8.3.2 SSL/TLS组成

![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-69292659.png)

* Handshake协议：包括协商安全参数和密码套件、服务器身份认证（客户端身份认证可选）、密钥交换
* ChangeCipherSpec 协议：一条消息表明握手协议已经完成
* Alert  协议：对握手协议中一些异常的错误提醒，分为fatal和warning两个级别，fatal类型错误会直接中断SSL链接，而warning级别的错误SSL链接仍可继续，只是会给出错误警告
* Record 协议：包括对消息的分段、压缩、消息认证和完整性保护、加密等

#### 1.8.3.3 TLS实现过程

**实现分为握手阶段和应用阶段**

* 握手阶段(协商阶段):客户端和服务器端认证对方身份（依赖于PKI体系，利用数字证书进行身份认证），并协商通信中使用的安全参数、密码套件以及主密钥。后续通信使用的所有密钥都是通过MasterSecret生成
* 应用阶段:在握手阶段完成后进入，在应用阶段通信双方使用握手阶段协商好的密钥进行安全通信

**目前密钥交换 + 签名有三种主流选择：**

* RSA 密钥交换、RSA 数字签名
* ECDHE 密钥交换、RSA 数字签名
* ECDHE 密钥交换、ECDSA 数字签名

**实现方式1：**

![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-510dfb5a.png)

1. Visitor给出协议版本号、一个客户端随机数（Client random），以及客户端支持的加密方法
2. Server确认双方使用的加密方法，以及一个服务器生成的随机数（Server random）
3. Server发送数字证书给Visitor
4. Visitor确认数字证书有效（查看证书状态且查询证书吊销列表），并使用信任的CA的公钥解密数字证书获得Server的公钥，然后生成一个新的46字节随机数（称为预备主密钥Pre-master secret），并使用Server的公钥加密预备主密钥发给Server
5. Server使用自己的私钥，解密Visitor发来的预备主密钥
6. Visitor和Server双方都具有了(客户端随机数+服务端随机数+预备主密钥)，它们两者都根据约定的     加密方法，使用这三个随机数生成对称密钥——主密钥（也称为对话密钥session key），用来加密后续的对话过程
7. 在双方验证完session      key的有效性之后，SSL握手机制就算结束了。之后所有的数据只需要使用“对话密钥”(此密钥并不是的session   key，而是由其通过计算得到)加密即可，不再需要多余的加密机制**注意：**
8. 在SSL握手机制中，需要三个随机数（客户端随机数+服务端随机数+预备主密钥）
9. 至始至终客户端和服务端只有一次非对称加密动作——客户端使用证书中获得的服务端公钥加密预备主密钥。
10. 上述SSL握手机制的前提单向验证，无需验证客户端，如果需要验证客户端则可能需要客户端的证书或客户端提供签名等。
11. Server和Visitor通信，Server把数字证书发给Visitor，最关键的一点是Visitor要保证证书的有效性， 通过查看证书状态并去CA的吊销列表查看Server的证书是否被吊销。只有Server的证书可用了，才保证了第一环节的安全性
12. RSA 密钥交换有一个很大的问题：没有前向安全性Forward Secrecy。这意味着攻击者可以把监听到的加密流量先存起来，后续一旦拿到了私钥，之前所有流量都可以成功解密

**实现方式2**

目前大部分 HTTPS 流量用的都是 ECDHE 密钥交换。ECDHE 是使用椭圆曲线（ECC）的 DH（Diffie-Hellman）算法

![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-85e3ecba.png)

前图中的 Server DH Parameter 是用证书私钥签名的，客户端使用证书公钥就可以验证服务端合法性。相比 RSA 密钥交换，DH 由传递 Premaster Scret 变成了传递 DH 算法所需的 Parameter，然后双方各自算出 Premaster Secret

对于这种情况，由于 Premaster Secret 无需交换，中间人就算有私钥也无法获得 Premaster Secret 和Master Secret。当然，使用 ECDHE 后，虽然中间人拿到私钥也无法解密之前的流量，但可以实施MITM 攻击来解密之后的流量，所以私钥还是要保管好。

相比 RSA 既可以用于密钥交换，又可以用于数字签名；ECC 这边就分得比较清楚了：ECDHE 用于密钥交换，ECDSA 用于数字签名

### 1.8.4 HTTPS

HTTPS 协议：就是“HTTP 协议”和“SSL/TLS 协议”的组合。HTTP over SSL 或 HTTP over TLS ，对http协议的文本数据进行加密处理后，成为二进制形式传输

#### 1.8.4.1 HTTPS结构

![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-d65052a9.png)

#### 1.8.4.2 HTTPS工作的简化过程

![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-e8f33c6e.png)

* 客户端发起HTTPS请求

  * 用户在浏览器里输入一个https网址，然后连接到服务器的443端口
* 服务端的配置

  * 采用HTTPS协议的服务器必须要有一套数字证书，可以自己制作，也可以向组织申请。区别就是自己颁发的证书需要客户端验证通过，才可以继续访问，而使用受信任的公司申请的证书则不会弹出提示页面。这套证书其实就是一对公钥和私钥
* 传送服务器的证书给客户端

  * 证书里其实就是公钥，并且还包含了很多信息，如证书的颁发机构，过期时间等等
* 客户端解析验证服务器证书

  * 这部分工作是有客户端的TLS来完成的，首先会验证公钥是否有效，比如：颁发机构，过期时间等等，如果发现异常，则会弹出一个警告框，提示证书存在问题。如果证书没有问题，那么就生成一 个随机值。然后用证书中公钥对该随机值进行非对称加密
* 客户端将加密信息传送服务器

  * 这部分传送的是用证书加密后的随机值，目的就是让服务端得到这个随机值，以后客户端和服务端 的通信就可以通过这个随机值来进行加密解密了
* 服务端解密信息

  * 服务端将客户端发送过来的加密信息用服务器私钥解密后，得到了客户端传过来的随机值
* 服务器加密信息并发送信息

  * 服务器将数据利用随机值进行对称加密,再发送给客户端
* 客户端接收并解密信息

  * 客户端用之前生成的随机值解密服务段传过来的数据，于是获取了解密后的内容

# 二、OpenSSL

## 2.1 OpenSSL 介绍

官网：[https://www.openssl.org/](https://www.openssl.org/)

OpenSSL计划在1998年开始，其目标是发明一套自由的加密工具，在互联网上使用。OpenSSL以EricYoung以及Tim     Hudson两人开发的SSLeay为基础，随着两人前往RSA公司任职，SSLeay在1998年12月停止开发。因此在1998年12月，社群另外分支出OpenSSL，继续开发下去

OpenSSL管理委员会当前由7人组成有13个开发人员具有提交权限（其中许多人也是OpenSSL管理委员会的一部分）。只有两名全职员工（研究员），其余的是志愿者

该项目每年的预算不到100万美元，主要依靠捐款。 TLS 1.3 的开发由 Akamai 赞助

OpenSSL是一个开放源代码的软件库包，应用程序可以使用这个包来进行安全通信，避免窃听，同时确认另一端连线者的身份。这个包广泛被应用在互联网的网页服务器上

其主要库是以C语言所写成，实现了基本的加密功能，实现了SSL与TLS协议。OpenSSL可以运行在OpenVMS、 Microsoft Windows以及绝大多数类Unix操作系统上（包括Solaris，Linux，Mac OS X与各种版本的开放源代码BSD操作系统）

心脏出血漏洞：OpenSSL1.0.1版本（不含1.0.1g）含有一个严重漏洞，可允许攻击者读取服务器的内存信息。该漏洞于2014年4月被公诸于世，影响三分之二的活跃网站

**包括三个组件：**

* libcrypto：用于实现加密和解密的库
* libssl：用于实现ssl通信协议的安全库
* openssl：多用途命令行工具

## 2.2 Base64编码

Base64是网络上最常见的用于传输 8Bit  字节码的编码方式之一，Base64就是一种基于64个可打印字符来表示二进制数据的方法
![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-8d02b78d.png)

**base64的编码过程如下：**

将每3个字节放入一个24位的缓冲区中，最后不足3个字节的，缓冲区的剩余部分用0来填补。然后每次 取出6位（2的6次方为64，使用64个字符即可表示所有），将高2位用0来填充，组成一个新的字节，计算出这个新字节的十进制值，对应上面的编码表，输出相应的字符。这样不断地进行下去，就可完成对所有数据的编码工作。

**按照以上规则对文本Man编码如下：**
![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-0bceb9dc.png)

**范例：**

```bash
[19:32:04 root@centos7 ~]#echo -n Man | base64      #进行编码
TWFu
[20:47:36 root@centos7 ~]#echo -n TWFu | base64 -d  #解码
Man
[20:48:10 root@centos7 ~]#echo -n ab | base64
YWI=
[20:48:20 root@centos7 ~]#echo -n ab | base64 | base64 -d
ab
```

**范例：破解下面密文**

```bash
[20:48:44 root@centos7 ~]#]#echo -n JXU0RjYwJXU1OTdEJXU2NzBCJXU1M0NCJXVGRjAxJXU2ExJXU2NjJGJXU3MzhCJXU2 NjUzJXU2NjI1 JXVGRjBDJXU2MjExJXU3Njg0UVEldUZGMUEyOTMwODYyMCV1RkYwQyV1NTNFRiV1NEVFNSV1NTJBMCV1 NEUyQSV1NTk3RCV1NTNDQiV1NTQxNyV1RkYxRiUwQQ== | base64 -d
%u4F60%u597D%u670B%u53CB%uFF01%u6211%u662F%u738B%u6653%u6625base64: invalid input
[20:49:34 root@centos7 ~]#echo -n %u4F60%u597D%u670B%u53CB%uFF01%u6211%u662F%u738B%u6653%u6625 | base64 -d
base64: invalid input
```

## 2.3 openssl命令

**两种运行模式：**

* 交互模式
* 批处理模式

**三种子命令：**

* 标准命令
* 消息摘要命令
* 加密命令

**范例: openssl的交互和非交互式查看版本**

```bash
[19:32:15 root@centos8 ~]#openssl version
OpenSSL 1.1.1g FIPS  21 Apr 2020
[20:52:31 root@centos8 ~]#openssl
OpenSSL> version
OpenSSL 1.1.1g FIPS  21 Apr 2020
```

### 2.3.1 openssl命令对称加密

**工具：openssl enc, gpg**

**算法：3des, aes, blowfish, twofish**

**enc命令：帮助：man enc**

**加密：**

```bash
[20:57:20 root@centos8 ~]#openssl enc -e -des3 -a -salt -in fstab -out zhang.cipher
```

**解密：**

```bash
[20:57:42 root@centos8 ~]#openssl enc -d -des3 -a -salt -in zhang.cipher -out zhang
```

**注意：需要输入密码**

### 2.3.2 openssl命令单向哈希加密

工具：openssl dgst

算法：md5sum, sha1sum, sha224sum,sha256sum…

dgst 命令：帮助：man dgst

```bash
openssl dgst -md5 [-hex默认] /PATH/SOMEFILE
openssl dgst -md5 testfile
md5sum /PATH/TO/SOMEFILE

[21:00:07 root@centos8 ~]#openssl md5 fstab
MD5(fstab)= 305613baf4b7a3319ee340fb8d53d2cf
[21:00:10 root@centos8 ~]#openssl sha512 fstab
SHA512(fstab)= ce24e2d29c1c65f6b7808f47aa91fa840ac11f43337f0d7a10af56666e02f4646888c532590187daddfbc70f70c73b739ee87c1e581d9f1d9e5e7867e8ae4f62

[21:00:21 root@centos8 ~]#sha512sum fstab
ce24e2d29c1c65f6b7808f47aa91fa840ac11f43337f0d7a10af56666e02f4646888c532590187daddfbc70f70c73b739ee87c1e581d9f1d9e5e7867e8ae4f62  fstab
```

**补充知识：**

```bash
MAC: Message Authentication Code，单向加密的一种延伸应用，用于实现网络通信中保证所传输数据的完整性机制
HMAC：hash-based MAC，使用哈希算法
```

### 2.3.3 openssl命令生成用户密码

passwd命令：帮助man sslpasswd

```bash
[21:00:43 root@centos8 ~]#openssl passwd --help
Usage: passwd [options]
Valid options are:
-help               Display this summary
-in infile          Read passwords from file
-noverify           Never verify when reading password from terminal
-quiet              No warnings
-table              Format output as table
-reverse            Switch table columns
-salt val           Use provided salt
-stdin              Read passwords from stdin
-6                  SHA512-based password algorithm
-5                  SHA256-based password algorithm
-apr1               MD5-based password algorithm, Apache variant
-1                  MD5-based password algorithm
-aixmd5             AIX MD5-based password algorithm
-crypt              Standard Unix password algorithm (default)
-rand val           Load the file(s) into the random number generator
-writerand outfile  Write random data to the specified file
[20:50:55 root@centos7 ~]#openssl passwd --help
Usage: passwd [options] [passwords]
where options are
-crypt             standard Unix password algorithm (default)
-1                 MD5-based password algorithm
-apr1              MD5-based password algorithm, Apache variant
-salt string       use provided salt
-in file           read passwords from file
-stdin             read passwords from stdin
-noverify          never verify when reading password from terminal
-quiet             no warnings
-table             format output as table
-reverse           switch table columns
```

**范例：**

```bash
[09:14:25 root@centos8 ~]#getent shadow zhang
zhang:$6$0nQwTH1iY2ZSQYbl$WkasOxw7n5k8ZRY.5fa49mkXhuJGNi7YGHccEgoyi9TsVd1nf/5QBvmQ9jnChGHXJGHENXH3wYsRamP/CB4/B1:18639:0:99999:7:::

[09:14:31 root@centos8 ~]#echo 123456 | openssl passwd -6 -salt 0nQwTH1iY2ZSQYbl -stdin
$6$0nQwTH1iY2ZSQYbl$WkasOxw7n5k8ZRY.5fa49mkXhuJGNi7YGHccEgoyi9TsVd1nf/5QBvmQ9jnChGHXJGHENXH3wYsRamP/CB4/B1

[09:15:07 root@centos8 ~]#openssl passwd -6 -salt 0nQwTH1iY2ZSQYbl 123456
$6$0nQwTH1iY2ZSQYbl$WkasOxw7n5k8ZRY.5fa49mkXhuJGNi7YGHccEgoyi9TsVd1nf/5QBvmQ9jnChGHXJGHENXH3wYsRamP/CB4/B1
```

**范例：利用Python程序在Centos7，生成sha512加密密码，centos7  openssl版本原因没有sha521加密算法**

```bash
[21:03:46 root@centos7 ~]#python -c 'import crypt,getpass;pw="magedu";print(crypt.crypt(pw))'
$6$pxOXH9vfPThLDqmQ$FI3OLfvAbxFtwMhB.L6qKADg5XxYnpQA1q5sFqDen4Z/sJYbu4NAKpddO/g.PMU9F2GPvNyDtD7Ja6F19W4qj.
```

**范例：创建新用户同时指定密码，在CentOS8和Ubuntu都通用**

```bash
[09:18:30 root@centos8 ~]#useradd -p `echo 123456 | openssl passwd -6 -salt 0nQwTH1iY2ZSQYbl -stdin` wang

[09:19:12 root@centos8 ~]#getent shadow zhang
zhang:$6$0nQwTH1iY2ZSQYbl$WkasOxw7n5k8ZRY.5fa49mkXhuJGNi7YGHccEgoyi9TsVd1nf/5QBvmQ9jnChGHXJGHENXH3wYsRamP/CB4/B1:18639:0:99999:7:::

[09:19:21 root@centos8 ~]#getent shadow wang
wang:$6$0nQwTH1iY2ZSQYbl$WkasOxw7n5k8ZRY.5fa49mkXhuJGNi7YGHccEgoyi9TsVd1nf/5QBvmQ9jnChGHXJGHENXH3wYsRamP/CB4/B1:18639:0:99999:7:::
```

**范例：**

```bash
[09:21:03 root@centos8 ~]#openssl passwd -1 -salt SALT（最多8位）
[09:21:11 root@centos8 ~]#openssl passwd -1 -salt centos
```

### 2.3.4 openssl命令生成随机数

**随机数生成器：伪随机数字，利用键盘和鼠标，块设备中断生成随机数**

```bash
/dev/random    #仅从熵池返回随机数；随机数用尽，阻塞
/dev/urandom   #从熵池返回随机数；随机数用尽，会利用软件生成伪随机数，非阻塞
```

**帮助：man sslrand**

```bash
openssl rand -base64|-hex NUM

NUM: 表示字节数，使用-hex，每个字符为十六进制，相当于4位二进制，出现的字符数为NUM*2
```

**范例：生成随机10位长度密码**

```bash
[09:24:11 root@centos8 ~]#openssl rand -base64 9 |head -c10
Vy8567ZT4x
[09:25:40 root@centos8 ~]#tr -dc '[:alnum:]' < /dev/urandom | head -c 10
3hl4sC5geK
```

### 2.3.5 openssl命令实现PKI

**公钥加密：**

* 算法：RSA, ELGamal
* 工具：gpg, openssl rsautl（man rsautl）

**数字签名：**

* 算法：RSA, DSA, ELGamal

**密钥交换：**

* 算法：dh
* DSA：Digital Signature Algorithm
* DSS：Digital Signature Standard
* RSA：

openssl命令生成密钥对儿：man genrsa

**生成私钥**

```bash
openssl genrsa -out /PATH/TO/PRIVATEKEY.FILE [-des3] [NUM_BITS,默认2048]

@对称加密算法:man genrsa
-aes128, -aes192, -aes256, -aria128, -aria192, -aria256, -camellia128, - camellia192, -camellia256, -des, -des3, -idea
```

**解密加密的密钥**

```bash
openssl rsa -in /PATH/TO/PRIVATEKEY.FILE -out /PATH/TO/PRIVATEKEY2.FILE
```

**范例：**

```bash
#生成对称秘钥加密的私钥，通过设置严格的权限实现安全，应用更广泛
[09:26:54 root@centos8 ~]#(umask 077 ; openssl genrsa -out app.key 2048)

[09:31:16 root@centos8 ~]#cat app.key
#将加密对称秘钥key解密,此方式更安全，但是不方便
[09:34:18 root@centos8 ~]#openssl genrsa -out app2.key -des3 2048

[09:35:40 root@centos8 ~]#cat app2.key
```

**从私钥中提取出公钥**

```bash
openssl rsa -in PRIVATEKEYFILE -pubout -out PUBLICKEYFILE
```

**范例：默认长度和指定长度的文件大小**

```bash
[09:41:08 root@centos8 ~]#(umask 077;openssl genrsa -out app.key)

[09:41:12 root@centos8 ~]#ll
total 4
-rw------- 1 root root 1679 Jan 12 09:41 app.key
[09:41:17 root@centos8 ~]#openssl genrsa -out app.key 1024

[09:41:53 root@centos8 ~]#ll
total 4
-rw------- 1 root root 891 Jan 12 09:41 app.key
```

**范例：从私钥提取公钥**

```bash
[09:41:58 root@centos8 ~]#openssl rsa -in /root/app.key -pubout -out app.key.pub
writing RSA key
[09:43:02 root@centos8 ~]#ls
app.key  app.key.pub
[09:43:03 root@centos8 ~]#cat app.key.pub
-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDjXRDEyJQpyAavttGBHdymjkgz
A6rA85IWmPCq7kZ9eE69IuiJX6tsCt+vIVZpDtRuZaksMjXFZYm2EybDTSCnd6hV
aEptBaQbjCfFDBB5071Z7KZIF6LcUDh/T3yCU3SLDwnmORi2326pfO5FcL9hkyim
rLfs76TYmNcZN5IlLQIDAQAB
-----END PUBLIC KEY-----
```

**范例：生成加密的私钥，并解密**

```bash
[09:46:10 root@centos8 ~]#openssl genrsa -out /root/app.key -des3 1024
Generating RSA private key, 1024 bit long modulus (2 primes)
......+++++
....+++++
e is 65537 (0x010001)
Enter pass phrase for /root/app.key:
Verifying - Enter pass phrase for /root/app.key:
[09:46:18 root@centos8 ~]#ll
total 4
-rw------- 1 root root 963 Jan 12 09:46 app.key
[09:46:21 root@centos8 ~]#cat app.key

[09:46:30 root@centos8 ~]#openssl rsa -in /root/app.key -out /root/app.key
Enter pass phrase for /root/app.key:
writing RSA key
[09:47:07 root@centos8 ~]#ls -l
total 4
-rw------- 1 root root 887 Jan 12 09:47 app.key
[09:47:11 root@centos8 ~]#cat /root/app.key
```

## 2.4 建立私有CA实现证书申请颁发

**建立私有CA：**

* OpenCA：OpenCA开源组织使用Perl对OpenSSL进行二次开发而成的一套完善的PKI免费软件
* openssl：相关包 openssl和openssl-libs

**证书申请及签署步骤：**

1. 生成证书申请请求
2. RA核验
3. CA签署
4. 获取证书

**范例：openssl-libs包**

```bash
[09:47:25 root@centos8 ~]#rpm -ql openssl-libs
/etc/pki/tls
/etc/pki/tls/certs
/etc/pki/tls/ct_log_list.cnf
/etc/pki/tls/misc
...
```

**openssl的配置文件：**

```bash
[09:49:35 root@centos8 ~]#cat /etc/pki/tls/openssl.cnf
```

**三种策略：match匹配、optional可选、supplied提供**

```bash
match：要求申请填写的信息跟CA设置信息必须一致
optional：可有可无，跟CA设置信息可不一致
supplied：必须填写这项申请信息
```

### 2.4.1 创建私有CA

**1.创建CA所需要的文件**

```bash
#生成证书索引数据库文件
touch /etc/pki/CA/index.txt

#指定第一个颁发证书的序列号
echo 01 > /etc/pki/CA/serial
```

**2.生成CA私钥**

```bash
cd /etc/pki/CA/
(umask 066; openssl genrsa -out  private/cakey.pem 2048)
```

**3.生成CA自签证书**

```bash
#需要手动输入机构信息
openssl req -new -x509 -key /etc/pki/CA/private/cakey.pem -days 3650 -out /etc/pki/CA/cacert.pem
```

选项说明：

```bash
-new：生成新证书签署请求
-x509：专用于CA生成自签证书
-key：生成请求时用到的私钥文件
-days n：证书的有效期限
-out /PATH/TO/SOMECERTFILE: 证书的保存路径
```

国家代码：https://country-code.cl/

**范例：一键生成自签名证书**

```bash
[09:50:22 root@centos8 ~]#openssl req -utf8 -newkey rsa:1024 -subj "/CN=www.zhangzhuo.org" -keyout app.key -nodes -x509 -out app.crt

[09:56:25 root@centos8 ~]#openssl x509 -in app.crt -noout -text
```

### 2.4.2 申请证书并颁发证书

**1.为需要使用证书的主机生成私钥**

```bash
(umask 066; openssl genrsa -out    /data/test.key 2048)
```

**2.为需要使用证书的主机生成证书申请文件**

```bash
openssl req -new -key /data/test.key -out /data/test.csr
```

**3.在CA签署证书并将证书颁发给请求者**

```bash
openssl ca -in /data/test.csr  -out   /etc/pki/CA/certs/test.crt -days 100
```

注意：默认要求国家，省，公司名称三项必须和CA一致

**4.查看证书中的信息**

```bash
openssl x509 -in /PATH/FROM/CERT_FILE -noout   -text|issuer|subject|serial|dates

#查看指定编号的证书状态
openssl  ca -status SERIAL
```

### 2.4.3 吊销证书

**在客户端获取要吊销的证书的serial**

```bash
openssl x509 -in /PATH/FROM/CERT_FILE    -noout   -serial  -subject
```

**在CA上，根据客户提交的serial与subject信息，对比检验是否与index.txt文件中的信息一致，吊销证书：**

```bash
openssl ca -revoke /etc/pki/CA/newcerts/SERIAL.pem
```

**指定第一个吊销证书的编号，注意：第一次更新证书吊销列表前，才需要执行**

```bash
echo 01 > /etc/pki/CA/crlnumber
```

**更新证书吊销列表**

```bash
openssl ca -gencrl -out /etc/pki/CA/crl.pem
```

**查看crl文件：**

```bash
openssl crl -in /etc/pki/CA/crl.pem -noout -text
```

### 2.4.4 CentOS7 创建自签名证书

```bash
#只有centos7有这个功能使用make创建自签证书
[09:07:30 root@centos7 ~]#cd /etc/pki/tls/certs

[10:05:58 root@centos7 certs]#make

[10:06:01 root@centos7 certs]#ls
ca-bundle.crt  ca-bundle.trust.crt  make-dummy-cert  Makefile  renew-dummy-cert

[10:06:11 root@centos7 certs]#cat Makefile

[10:08:32 root@centos7 certs]#make app.crt

[10:09:30 root@centos7 certs]#ls
app.crt  app.key  ca-bundle.crt  ca-bundle.trust.crt  make-dummy-cert  Makefile  renew-dummy-cert

[10:09:34 root@centos7 certs]#openssl x509 -in app.crt -noout -text
```

### 2.4.5 实战案例：在Centos8上实现私有CA和证书申请

#### 2.4.5.1 创建CA相关目录和文件

```bash
[10:12:13 root@centos8 ~]#mkdir -pv /etc/pki/CA/{certs,crl,newcerts,private}
mkdir: created directory '/etc/pki/CA'
mkdir: created directory '/etc/pki/CA/certs'
mkdir: created directory '/etc/pki/CA/crl'
mkdir: created directory '/etc/pki/CA/newcerts'
mkdir: created directory '/etc/pki/CA/private'
[10:13:06 root@centos8 ~]#tree /etc/pki/CA
/etc/pki/CA
├── certs
├── crl
├── newcerts
└── private

4 directories, 0 files
[10:13:27 root@centos8 ~]#touch /etc/pki/CA/index.txt
[10:13:58 root@centos8 ~]#echo 00 > /etc/pki/CA/serial
```

**index.txt和serial文件在颁发证书时需要使用，如果不存在，会出现以下错误提示**

```bash
[root@centos8 ~]#openssl ca -in /data/app1/app1.csr  -out
/etc/pki/CA/certs/app1.crt -days 1000
Using configuration from /etc/pki/tls/openssl.cnf 140040142845760:error:02001002:system library:fopen:No such file or directory:crypto/bio/bss_file.c:72:fopen('/etc/pki/CA/index.txt','r') 140040142845760:error:2006D080:BIO routines:BIO_new_file:no such file:crypto/bio/bss_file.c:79:

[root@centos8 ~]#openssl ca -in /data/app1/app1.csr  -out
/etc/pki/CA/certs/app1.crt -days 1000
Using configuration from /etc/pki/tls/openssl.cnf
/etc/pki/CA/serial: No such file or directory error while loading serial number
140240559408960:error:02001002:system library:fopen:No such file or directory:crypto/bio/bss_file.c:72:fopen('/etc/pki/CA/serial','r') 140240559408960:error:2006D080:BIO routines:BIO_new_file:no such file:crypto/bio/bss_file.c:79:
```

#### 2.4.5.2 创建CA的私钥

```bash
[10:14:24 root@centos8 ~]#cd /etc/pki/CA/
[10:16:14 root@centos8 CA]#(umask 066;openssl genrsa -out private/cakey.pem 2048)

[10:16:45 root@centos8 CA]#tree
.
├── certs
├── crl
├── index.txt
├── newcerts
├── private
│   └── cakey.pem
└── serial

4 directories, 3 files
[10:16:50 root@centos8 CA]#ll private/
total 4
-rw------- 1 root root 1679 Jan 12 10:16 cakey.pem
[10:17:06 root@centos8 CA]#cat private/cakey.pem
```

#### 2.4.5.3 给CA颁发自签名证书

```bash
[10:17:15 root@centos8 CA]#openssl req -new -x509 -key /etc/pki/CA/private/cakey.pem -days 3650 -out /etc/pki/CA/cacert.pem
You are about to be asked to enter information that will be incorporated
into your certificate request.
What you are about to enter is what is called a Distinguished Name or a DN.
There are quite a few fields but you can leave some blank
For some fields there will be a default value,
If you enter '.', the field will be left blank.
-----------------------------------------------

Country Name (2 letter code) [XX]:CN
State or Province Name (full name) []:neimeng
Locality Name (eg, city) [Default City]:baotou
Organization Name (eg, company) [Default Company Ltd]:zhangzhuo
Organizational Unit Name (eg, section) []:devops
Common Name (eg, your name or your server's hostname) []:ca.zhangzhuo.org
Email Address []:admin@zhangzhuo.org
[10:19:47 root@centos8 CA]#tree
.
├── cacert.pem
├── certs
├── crl
├── index.txt
├── newcerts
├── private
│   └── cakey.pem
└── serial

4 directories, 4 files
[10:19:49 root@centos8 CA]#cat /etc/pki/CA/cacert.pem

[10:20:14 root@centos8 CA]#openssl x509 -in /etc/pki/CA/cacert.pem -noout -text

#将文件cacert.pem传到windows上，修改文件名为cacert.pem.crt，双击可以看到下面显示
```

![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-4cdac68f.png)

#### 2.4.5.4 用户生成私钥和证书申请

```bash
[10:24:15 root@centos8 CA]#mkdir -p /data/app1
[10:30:11 root@centos8 CA]#(umask 066;openssl genrsa -out /data/app1/app1.key 2048)

[10:30:39 root@centos8 CA]#cat /data/app1/app1.key

[10:30:45 root@centos8 CA]#openssl req -new -key /data/app1/app1.key -out /data/app1/app1.csr

[10:32:48 root@centos8 CA]#ll /data/app1/
total 8
-rw-r--r-- 1 root root 1066 Jan 12 10:32 app1.csr
-rw------- 1 root root 1675 Jan 12 10:30 app1.key
```

**默认有三项内容必须和CA一致：国家，省份，组织，如果不同，会出现下面的提示**

```bash
[root@centos8 ~]#openssl ca -in /data/app2/app2.csr  -out
/etc/pki/CA/certs/app2.crt
Using configuration from /etc/pki/tls/openssl.cnf Check that the request matches the signature Signature ok
The stateOrProvinceName field is different between CA certificate (beijing) and the request (hubei)
```

#### 2.4.5.5 CA颁发证书

```bash
[10:37:25 root@centos8 CA]#openssl ca -in /data/app1/app1.csr -out /etc/pki/CA/certs/app1.crt -days 1000
Using configuration from /etc/pki/tls/openssl.cnf
Check that the request matches the signature
Signature ok
Certificate Details:
Serial Number: 0 (0x0)
Validity
Not Before: Jan 12 02:37:26 2021 GMT
Not After : Oct  9 02:37:26 2023 GMT
Subject:
countryName               = CN
stateOrProvinceName       = neimeng
organizationName          = zhangzhuo
organizationalUnitName    = devops
commonName                = app.zhangzhuo.org
emailAddress              = root@zhangzhuo.org
X509v3 extensions:
X509v3 Basic Constraints:
CA:FALSE
Netscape Comment:
OpenSSL Generated Certificate
X509v3 Subject Key Identifier:
08:0B:BD:FA:EF:0E:88:2F:AF:4D:3D:D5:2A:85:68:7B:76:7B:0E:92
X509v3 Authority Key Identifier:
keyid:80:B9:1E:65:EF:5C:8B:75:C4:D3:C0:A8:A0:0D:91:4F:D8:87:48:3A

Certificate is to be certified until Oct  9 02:37:26 2023 GMT (1000 days)
Sign the certificate? [y/n]:y

1 out of 1 certificate requests certified, commit? [y/n]y
Write out database with 1 new entries
Data Base Updated
[10:38:12 root@centos8 CA]#tree /etc/pki/CA/
/etc/pki/CA/
├── cacert.pem
├── certs
│   └── app1.crt
├── crl
├── index.txt
├── index.txt.attr
├── index.txt.old
├── newcerts
│   └── 00.pem
├── private
│   └── cakey.pem
├── serial
└── serial.old

4 directories, 9 files
```

#### 2.4.5.6 查看证书

```bash
[10:38:21 root@centos8 CA]#cat /etc/pki/CA/certs/app1.crt

[10:39:21 root@centos8 CA]#openssl x509 -in /etc/pki/CA/certs/app1.crt -noout -text

[10:39:57 root@centos8 CA]#openssl x509 -in /etc/pki/CA/certs/app1.crt --noout -issuer
issuer=C = CN, ST = neimeng, L = baotou, O = zhangzhuo, OU = devops, CN = ca.zhangzhuo.org, emailAddress = admin@zhangzhuo.org

[10:40:49 root@centos8 CA]#openssl x509 -in /etc/pki/CA/certs/app1.crt --noout -subject
subject=C = CN, ST = neimeng, O = zhangzhuo, OU = devops, CN = app.zhangzhuo.org, emailAddress = root@zhangzhuo.org

[10:41:03 root@centos8 CA]#openssl x509 -in /etc/pki/CA/certs/app1.crt --noout -dates
notBefore=Jan 12 02:37:26 2021 GMT
notAfter=Oct  9 02:37:26 2023 GMT

[10:41:27 root@centos8 CA]#openssl x509 -in /etc/pki/CA/certs/app1.crt --noout -serial
serial=00

#验证指定编号对应证书的有效性
[10:42:26 root@centos8 CA]#openssl ca -status 00
Using configuration from /etc/pki/tls/openssl.cnf
00=Valid (V)
[10:42:37 root@centos8 CA]#cat /etc/pki/CA/index.txt
V	231009023726Z		00	unknown	/C=CN/ST=neimeng/O=zhangzhuo/OU=devops/CN=app.zhangzhuo.org/emailAddress=root@zhangzhuo.org
[10:43:02 root@centos8 CA]#cat /etc/pki/CA/index.txt.old
[10:43:17 root@centos8 CA]#cat /etc/pki/CA/serial
01
[10:43:31 root@centos8 CA]#cat /etc/pki/CA/serial.old
00
```

#### 2.4.5.7 将证书相关文件发送到用户端使用

```bash
[10:45:44 root@centos8 CA]#cp /etc/pki/CA/certs/app1.crt /data/app1/
[10:45:59 root@centos8 CA]#tree /data/app1/
/data/app1/
├── app1.crt
├── app1.csr
└── app1.key

0 directories, 3 files
```

#### 2.4.5.8 证书的信任

默认生成的证书，在windows上是不被信任的，可以通过下面的操作实现信任

打开internet属性导入证书就可以了

#### 2.4.5.9 证书的吊销

```bash
[10:48:34 root@centos8 CA]#openssl ca -revoke /etc/pki/CA/newcerts/00.pem
Using configuration from /etc/pki/tls/openssl.cnf
Revoking Certificate 00.
Data Base Updated
[10:48:54 root@centos8 CA]#openssl ca -status 00
Using configuration from /etc/pki/tls/openssl.cnf
00=Revoked (R)
[10:49:08 root@centos8 CA]#cat /etc/pki/CA/index.txt
R	231009023726Z	210112024854Z	00	unknown	/C=CN/ST=neimeng/O=zhangzhuo/OU=devops/CN=app.zhangzhuo.org/emailAddress=root@zhangzhuo.org
```

#### 2.4.5.10 生成证书吊销列表文件

```bash
#吊销证书
[10:48:34 root@centos8 CA]#openssl ca -revoke /etc/pki/CA/newcerts/00.pem

[10:48:54 root@centos8 CA]#openssl ca -status 00
00=Revoked (R)

#生成吊销证书文件
[10:50:29 root@centos8 CA]#echo 01 > /etc/pki/CA/crlnumber
[10:51:08 root@centos8 CA]#openssl ca -gencrl -out /etc/pki/CA/crl.pem
Using configuration from /etc/pki/tls/openssl.cnf
[10:51:34 root@centos8 CA]#cat /etc/pki/CA/crlnumber
02
[10:51:50 root@centos8 CA]#cat /etc/pki/CA/crl.pem

[10:51:58 root@centos8 CA]#openssl crl -in /etc/pki/CA/crl.pem --noout -text
Certificate Revocation List (CRL):
Version 2 (0x1)
Signature Algorithm: sha256WithRSAEncryption
Issuer: C = CN, ST = neimeng, L = baotou, O = zhangzhuo, OU = devops, CN = ca.zhangzhuo.org, emailAddress = admin@zhangzhuo.org
Last Update: Jan 12 02:51:34 2021 GMT
Next Update: Feb 11 02:51:34 2021 GMT
CRL extensions:
X509v3 CRL Number:
1
Revoked Certificates:
Serial Number: 00
Revocation Date: Jan 12 02:48:54 2021 GMT
Signature Algorithm: sha256WithRSAEncryption
23:14:1b:01:2d:67:d6:5a:70:13:7b:f2:68:e5:7f:d6:91:91:
76:1f:c2:f2:11:39:6d:d2:87:a5:0b:d0:2b:15:f9:cd:55:84:
a9:b5:1c:7e:c1:01:30:5f:7d:c1:c3:8a:ef:ad:ee:32:21:d6:
77:1c:46:d9:30:92:1d:56:ad:40:54:59:19:5e:95:e1:78:20:
0f:ff:cd:e7:22:be:f5:6a:e0:28:a8:55:89:26:40:d8:23:d0:
76:0d:f6:8b:b9:7a:12:89:a2:70:46:37:aa:8f:6d:0e:31:8a:
08:34:78:04:cb:15:3a:95:ec:3e:ac:67:d0:6b:be:48:0f:92:
39:e9:e3:ab:25:89:04:99:b2:2c:83:fe:96:79:5c:36:85:62:
7b:d2:00:f2:8f:c0:7d:d0:f3:8b:a6:58:db:3d:57:56:fa:64:
55:a7:f8:03:cc:ca:7b:79:4a:7b:21:d0:62:48:7a:8b:51:a2:
c2:3a:5d:a7:e3:98:7c:c5:b1:db:37:e7:32:19:41:e0:8d:c4:
95:e7:de:a2:05:bb:9f:62:30:76:69:cb:7d:4d:a9:75:66:c6:
94:48:7a:72:20:b2:0b:d6:73:d9:32:55:60:0b:25:ff:88:18:
56:46:90:f6:58:17:35:3e:b1:6e:38:b4:b0:dd:95:e3:43:7e:
73:0e:1c:f0
[10:52:32 root@centos8 CA]#sz /etc/pki/CA/crl.pem
#将此文件crl.pem传到windows上并改后缀为crl.pem.crl，双击可以查看以下显示
```

# 三、ssh服务

## 3.1 ssh服务介绍

ssh: secure shell protocol, 22/tcp, 安全的远程登录，实现加密通信，代替传统的 telnet 协议

**具体的软件实现：**

* OpenSSH：ssh协议的开源实现，CentOS 默认安装
* dropbear：另一个ssh协议的开源项目的实现

**SSH 协议版本**

* v1：基于CRC-32做MAC，不安全；man-in-middle
* v2：双方主机协议选择安全的MAC方式，基于DH算法做密钥交换，基于RSA或DSA实现身份认证

### 3.1.1 公钥交换原理

![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-0ce27b75.png)

* 客户端发起链接请求
* 服务端返回自己的公钥，以及一个会话ID（这一步客户端得到服务端公钥）
* 客户端生成密钥对
* 客户端用自己的公钥异或会话ID，计算出一个值Res，并用服务端的公钥加密
* 客户端发送加密后的值到服务端，服务端用私钥解密，得到Res
* 服务端用解密后的值Res异或会话ID，计算出客户端的公钥（这一步服务端得到客户端公钥）
* 最终：双方各自持有三个秘钥，分别为自己的一对公、私钥，以及对方的公钥，之后的所有通讯都会被加密

### 3.1.2 ssh加密通讯原理

![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-709d314d.png)

## 3.2 openssh服务

OpenSSH是SSH （Secure SHell） 协议的免费开源实现，一般在各种Linux版本中会默认安装，基于C/S结构

**Openssh软件相关包：**

* openssh
* openssh-clients
* openssh-server

**范例：openssh 相关包**

```bash
[10:59:08 root@centos8 ~]#rpm -qa openssh*
openssh-clients-8.0p1-4.el8_1.x86_64
openssh-server-8.0p1-4.el8_1.x86_64
openssh-8.0p1-4.el8_1.x86_64
```

**服务器端程序：/usr/sbin/sshd**

Unit 文件：/usr/lib/systemd/system/sshd.service

**客户端：**

* Linux Client: ssh, scp, sftp，slogin
* Windows Client：xshell, MobaXterm,putty, securecrt, sshsecureshellclient

### 3.2.1 客户端ssh命令

**ssh命令是ssh客户端，允许实现对远程系统经验证地加密安全访问**

当用户远程连接ssh服务器时，会复制ssh服务器/etc/ssh/ssh_host*key.pub文件中的公钥到客户机的

~/.ssh/know_hosts中。下次连接时，会自动匹配相对应的私钥，不能匹配，将拒绝连接

ssh客户端配置文件： /etc/ssh/ssh_config

**主要配置**

```bash
#StrictHostKeyChecking ask #首次登录不显示检查提示StrictHostKeyChecking no
# IdentityFile ~/.ssh/id_rsa
# IdentityFile ~/.ssh/id_dsa
# IdentityFile ~/.ssh/id_ecdsa
# IdentityFile ~/.ssh/id_ed25519
# Port 22
```

**范例：禁止首次连接的询问过程**

```bash
[11:08:32 root@centos8 ~]#sed -i.bak '/StrictHostKeyChecking/s@.*@StrictHostKeyChecking no@' /etc/ssh/ssh_config
```

**格式：**

```bash
ssh [user@]host [COMMAND]
ssh [-l user] host [COMMAND]
```

**常见选项：**

```bash
-p port：远程服务器监听的端口
-b 指定连接的源IP
-v 调试模式
-C 压缩方式
-X 支持x11转发
-t 强制伪tty分配，如：ssh -t remoteserver1 ssh -t   remoteserver2   ssh remoteserver3
-o option   如：-o StrictHostKeyChecking=no
-i   指定私钥文件路径，实现基于key验证，默认使用文件： ~/.ssh/id_dsa,
~/.ssh/id_ecdsa, ~/.ssh/id_ed25519，~/.ssh/id_rsa等
```

**范例：**

```bash
[10:09:59 root@centos7 certs]#ssh -t 192.168.10.81 ssh -t 192.168.10.71
root@192.168.10.81's password:
root@192.168.10.71's password:
Last login: Tue Jan 12 09:07:30 2021 from 192.168.10.1
```

**范例：远程执行命令**

```bash
[11:12:05 root@centos8 ~]#ssh 192.168.10.71 "sed -i.bak '/StrictHostKeyChecking/s@.*@StrictHostKeyChecking no@' /etc/ssh/ssh_config"
root@192.168.10.71's password:
```

**范例：在远程主机运行本地shell脚本**

```bash
[11:15:22 root@centos8 ~]#hostname -I
192.168.10.81
[11:15:25 root@centos8 ~]#cat test.sh
#!/bin/bash
hostname -I
[11:15:27 root@centos8 ~]#ssh 192.168.10.71 /bin/bash < test.sh
root@192.168.10.71's password:
192.168.10.71
```

### 3.2.2 ssh登录验证方式

**ssh服务登录的常用验证方式**

![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-976f2379.png)

1. 客户端发起ssh请求，服务器会把自己的公钥发送给用户
2. 用户会根据服务器发来的公钥对密码进行加密
3. 加密后的信息回传给服务器，服务器用自己的私钥解密，如果密码正确，则用户登录成功

**基于密钥的登录方式**

![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-8df0da3f.png)

1. 首先在客户端生成一对密钥（ssh-keygen）
2. 并将客户端的公钥ssh-copy-id 拷贝到服务端
3. 当客户端再次发送一个连接请求，包括ip、用户名
4. 服务端得到客户端的请求后，会到authorized_keys中查找，如果有响应的IP和用户，就会随机生成一个字符串，例如：magedu
5. 服务端将使用客户端拷贝过来的公钥进行加密，然后发送给客户端
6. 得到服务端发来的消息后，客户端会使用私钥进行解密，然后将解密后的字符串发送给服务端
7. 服务端接受到客户端发来的字符串后，跟之前的字符串进行对比，如果一致，就允许免密码登录

### 3.2.3 实现基于密钥的登录方式

在客户端生成密钥对

```bash
ssh-keygen -t rsa [-P 'password'] [-f “~/.ssh/id_rsa"]
```

把公钥文件传输至远程服务器对应用户的家目录

```bash
ssh-copy-id [-i [identity_file]] [user@]host
```

重设私钥口令

```bash
ssh-keygen -p
```

验证代理（authentication  agent）保密解密后的密钥，口令就只需要输入一次，在GNOME中，代理被自动提供给root用户

```bash
#启用代理
ssh-agent bash
#钥匙通过命令添加给代理
ssh-add
```

在SecureCRT或Xshell实现基于key验证

在SecureCRT工具—>创建公钥—>生成Identity.pub文件

转化为openssh兼容格式（适合SecureCRT，Xshell不需要转化格式），并复制到需登录主机上相应文件authorized_keys中,注意权限必须为600，在需登录的ssh主机上执行：

```bash
ssh-keygen  -i -f Identity.pub >> .ssh/authorized_keys
```

**范例：实现基于key验证**

```bash
[11:20:21 root@centos7 ~]#ssh-keygen
#下面的id_rsa是私钥id_rsa.pub是公钥
[11:23:48 root@centos7 ~]#ll .ssh/
total 12
-rw------- 1 root root 1675 Jan 12 11:23 id_rsa
-rw-r--r-- 1 root root  394 Jan 12 11:23 id_rsa.pub
-rw-r--r-- 1 root root  175 Jan 11 19:28 known_hosts

[11:24:19 root@centos7 ~]#ssh-copy-id root@192.168.10.81
/usr/bin/ssh-copy-id: INFO: Source of key(s) to be installed: "/root/.ssh/id_rsa.pub"
/usr/bin/ssh-copy-id: INFO: attempting to log in with the new key(s), to filter out any that are already installed
/usr/bin/ssh-copy-id: INFO: 1 key(s) remain to be installed -- if you are prompted now it is to install the new keys
root@192.168.10.81's password: #输入远程用户密码

Number of key(s) added: 1

Now try logging into the machine, with:   "ssh 'root@192.168.10.81'"
and check to make sure that only the key(s) you wanted were added.

[11:29:11 root@centos8 ~]#ll .ssh
total 16
-rw------- 1 root root  394 Jan 12 11:24 authorized_keys
-rw------- 1 root root 2602 Jan 11 14:06 id_rsa
-rw-r--r-- 1 root root  566 Jan 11 14:06 id_rsa.pub
-rw-r--r-- 1 root root  175 Jan  9 09:11 known_hosts

[11:31:21 root@centos7 ~]#ssh 192.168.10.81

[11:32:14 root@centos7 ~]#scp /etc/fstab 192.168.10.81:/data
fstab                 100%  150   123.2KB/s   00:00

#对私钥加密
[11:35:47 root@centos7 ~]#ssh-keygen -p
Enter file in which the key is (/root/.ssh/id_rsa):  #回车，选择默认文件
Enter new passphrase (empty for no passphrase):      #输入密码
Enter same passphrase again:                         #确认密码
Your identification has been saved with the new passphrase.
[11:36:05 root@centos7 ~]#ssh 192.168.10.81
Enter passphrase for key '/root/.ssh/id_rsa': 输入加密的密码
Activate the web console with: systemctl enable --now cockpit.socket
Last login: Tue Jan 12 11:35:06 2021 from 192.168.10.71

#启用ssh代理，之后第一次输入私钥密码后以后不用输入
[11:37:24 root@centos7 ~]#ssh-agent bash
[11:37:31 root@centos7 ~]#ps aux | grep agent
root       1686  0.0  0.0  72472   776 ?        Ss   11:37   0:00 ssh-agent bash
root       1700  0.0  0.0 112812   972 pts/0    R+   11:37   0:00 grep --color=auto agent
[11:37:41 root@centos7 ~]#ssh-add
Enter passphrase for /root/.ssh/id_rsa:
Identity added: /root/.ssh/id_rsa (/root/.ssh/id_rsa)
[11:37:58 root@centos7 ~]#ssh 192.168.10.81
Activate the web console with: systemctl enable --now cockpit.socket
Last login: Tue Jan 12 11:36:19 2021 from 192.168.10.71
```

**范例：基于key验证实现批量主机管理**

```bash
[11:42:10 root@centos8 ~]#cat hosts.txt
192.168.10.81
192.168.10.71
[11:42:21 root@centos8 ~]#for i in `cat hosts.txt`;do ssh $i hostname -I;done
192.168.10.81
192.168.10.71
```

**范例：实现xshell的基于key验证**

**先生成用户密钥，在导出公钥，上传至服务器**

```bash
[11:54:49 root@centos8 ~]#cat id_rsa_2048.pub >.ssh/authorized_keys
```

### 3.2.4 其他ssh客户端工具

#### 3.2.4.1 scp命令

```bash
scp [options] SRC... DEST/
```

**方式：**

```bash
scp [options] [user@]host:/sourcefile /destpath
scp [options] /sourcefile [user@]host:/destpath
scp [options] [user@]host1:/sourcetpath  [user@]host2:/destpath
```

**常用选项：**

```bash
-C  压缩数据流
-r  递归复制
-p  保持原文件的属性信息
-q  静默模式
-P PORT 指明remote host的监听的端口
```

#### 3.2.4.2 rsync命令

rsync工具可以基于ssh和rsync协议实现高效率的远程系统之间复制文件，使用安全的shell连接做为传输方式，比scp更快，基于增量数据同步，即只复制两方不同的文件，此工具来自于rsync包

**注意：通信两端主机都需要安装 rsync软件**

```bash
rsync  -av /etc server1:/tmp      #复制目录和目录下文件
rsync  -av  /etc/  server1:/tmp   #只复制目录下文件
```

**常用选项：**

```bash
-n  模拟复制过程
-v  显示详细过程
-r  递归复制目录树
-p  保留权限
-t  保留修改时间戳
-g  保留组信息
-o  保留所有者信息
-l  将软链接文件本身进行复制（默认）
-L  将软链接文件指向的文件复制
-u  如果接收者的文件比发送者的文件较新，将忽略同步
-z  压缩，节约网络带宽
-a  存档，相当于-rlptgoD，但不保留ACL（-A）和SELinux属性（-X）
--delete 源数据删除，目标数据也自动同步删除
```

**范例：**

```bash
[14:18:25 root@centos8 ~]#rsync -auv --delete /data/fstab 192.168.10.71:/root
```

#### 3.2.4.3 sftp命令

交互式文件传输工具，用法和传统的ftp工具相似，利用ssh服务实现安全的文件上传和下载使用ls cd mkdir rmdir pwd get put等指令，可用？或help获取帮助信息

```bash
sftp [user@]host
sftp> help
```

### 3.2.5 ssh高级应用

SSH 会自动加密和解密所有 SSH 客户端与服务端之间的网络数据。此外，SSH 还能够将其他 TCP 端口的网络数据通过 SSH 连接来转发，并且自动提供了相应的加密及解密服务。这一过程也被叫做“隧道”（tunneling），这是因为 SSH 为其他 TCP 链接提供了一个安全的通道来进行传输而得名。例如，Telnet，SMTP，LDAP 这些 TCP 应用均能够从中得益，避免了用户名，密码以及隐私信息的明文传输。而与此同时，如果工作环境中的防火墙限制了一些网络端口的使用，但是允许 SSH 的连接，也能够通过将 TCP 端口转发来使用 SSH 进行通讯

**SSH 端口转发能够提供两大功能：**

* 加密 SSH Client 端至 SSH Server 端之间的通讯数据
* 突破防火墙的限制完成一些之前无法建立的 TCP 连接

#### 3.2.5.1  SSH 本地端口转发

**SSH本地端口转发**

```bash
ssh -L localport:remotehost:remotehostport   sshserver
```

**选项：**

```bash
-f 后台启用
-N 不打开远程shell，处于等待状态
-g 启用网关功能
```

**范例：**

```bash
#当访问本机的9527的端口时，被加密后转发到sshsrv的ssh服务，再解密被转发到telnetsrv:23
#data<-->localhost:9527 <-->localhost:XXXXX<-->sshsrv:22<-->sshsrv:YYYYY<-->telnetsrv:23

ssh -L  9527:telnetsrv:23 -Nfg sshsrv
telnet 127.0.0.1 9527
```

**范例：本地端口转发**
![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-0cf187cc.png)

```bash
#在192.168.10.81操作
[19:23:28 root@centos8 ~]#hostname -I
192.168.10.81
[19:23:30 root@centos8 ~]#ssh -fNL 9527:192.168.10.72:80 192.168.10.71
[19:25:08 root@centos8 ~]#curl 127.0.0.1:9527
zhangzhuo
```

#### 3.3.5.2 SSH远程端口转发

```bash
ssh -R sshserverport:remotehost:remotehostport  sshserver
```

**示例：**

```bash
#让sshsrv侦听9527端口的访问，如有访问，就加密后通过ssh服务转发请求到本机ssh客户端，再由本机解  密后转发到telnetsrv:23
#Data<-->sshsrv:9527<-->sshsrv:22<-->localhost:XXXXX<-->localhost:YYYYY<-->telnetsrv:23

ssh -R 9527:telnetsrv:23 -Nf  sshsrv
```

**范例：远程端口转发并实现网关功能**
![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-352a941a.png)

```bash
#在192.168.10.81执行
[19:32:27 root@centos8 ~]#hostname -I
192.168.10.81
#必须先打开gateway功能，否则无法打开所有IP对应端口
[19:39:20 root@centos8 ~]#vim /etc/ssh/sshd_config
GatewayPorts yes
[19:40:47 root@centos8 ~]#systemctl restart sshd

#在192.168.10.71执行
[19:28:04 root@centos7 ~]#ssh -fNgR 9527:192.168.10.72:80 192.168.10.81
#在192.168.10.81执行
[root@localhost ~]# curl 192.168.10.81:9527
zhangzhuo
```

#### 3.3.5.3 SSH动态端口转发

![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-647fbad3.png)

```bash
#当用firefox访问internet时，本机的1080端口做为代理服务器，firefox的访问请求被转发到sshserver上，由sshserver替之访问internet

ssh -D 1080 root@sshserver  -fNg

#在本机firefox设置代理socket proxy:127.0.0.1:1080
curl  --socks5 127.0.0.1:1080  http://www.google.com
```

**范例：动态端口转发实现科学上网方式1**

![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-a79e1273.png)

```bash
#在192.168.10.8执行
[19:49:06 root@centos8 ~]#ssh -fND 9527 192.168.10.71
[19:56:04 root@centos8 ~]#curl --socks5 127.0.0.1:9527 http://192.168.10.72
zhangzhuo
#这种方式只能实现本机上网
```

**范例：动态端口转发实现科学上网方式2**

![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-d1a9ef06.png)

```bash
#在192.168.10.71执行
[19:48:52 root@centos7 ~]#ssh -gfND 9527 192.168.10.71
#在192.168.10.81执行
[20:02:19 root@centos8 ~]#curl --socks5 192.168.10.71:9527 http://192.168.10.72
zhangzhuo
#这种可以实现其他主机也借助这个上网
```

**火狐浏览器可以设置代理进行上网**

![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-b65c1d58.png)

### 3.2.6 ssh服务器配置

服务器端：sshd

服务器端的配置文件: /etc/ssh/sshd_config

服务器端的配置文件帮助：man 5 sshd_config

**常用参数：**

```bash
Port ListenAddress ip
LoginGraceTime 2m
PermitRootLogin yes        #默认ubuntu不允许root远程ssh登录
StrictModes yes            #检查.ssh/文件的所有者，权限等
MaxAuthTries   6           #pecifies the maximum number of authenticationattempts permitted per connection.  Once the number of failures reaches halfthis value, additional failures are logged.  The default is 6.
MaxSessions  10            #同一个连接最大会话
PubkeyAuthentication yes   #基于key验证
PermitEmptyPasswords no    #空密码连接
PasswordAuthentication yes #基于用户名和密码连接
GatewayPorts no
ClientAliveInterval 10    #单位:秒
ClientAliveCountMax 3     #默认3
UseDNS yes                #提高速度可改为no
GSSAPIAuthentication yes  #提高速度可改为no
MaxStartups               #未认证连接最大值，默认值10
Banner /path/file

#以下可以限制可登录用户的办法：
AllowUsers user1 user2 user3
DenyUsers user1 user2 user3
AllowGroups g1 g2
DenyGroups  g1 g2
```

**范例：设置ssh空闲60s自动注销**

```bash
Vim  /etc/ssh/sshd_config
ClientAliveInterval   60
ClientAliveCountMax   0

Service sshd restart #注意：新开一个连接才有效
```

**范例：解决ssh登录缓慢的问题**

```bash
vim /etc/ssh/sshd_config
UseDNS no
GSSAPIAuthentication no

systemctl restart sshd
```

**范例：在 ubuntu 上启用root 远程ssh登录**

```bash
#修改sshd服务配置文件
vim  /etc/ssh/sshd_config
#PermitRootLogin prohibit-password  注释掉此行
PermitRootLogin yes  修改为下面形式

systemctl restart sshd
```

**ssh服务的最佳实践**

* 建议使用非默认端口
* 禁止使用protocol version 1
* 限制可登录用户
* 设定空闲会话超时时长
* 利用防火墙设置ssh访问策略
* 仅监听特定的IP地址
* 基于口令认证时，使用强密码策略，比如：tr -dc A-Za-z0-9_ < /dev/urandom | head -c 12|xargs
* 使用基于密钥的认证
* 禁止使用空密码
* 禁止root用户直接登录
* 限制ssh的访问频度和并发在线数
* 经常分析日志

## 3.4 ssh其他相关工具

### 3.4.1 挂载远程ssh目录sshfs

由EPEL源提供，目前CentOS8 还没有提供，可以利用ssh协议挂载远程目录

```bash
[15:14:09 root@centos7 ~]#yum install fuse-sshfs
[15:16:22 root@centos7 ~]#sshfs 192.168.10.81:/data /mnt/ -o nonempty
[15:16:41 root@centos7 ~]#df
Filesystem               Size  Used Avail Use% Mounted on
devtmpfs                 475M     0  475M   0% /dev
tmpfs                    487M     0  487M   0% /dev/shm
tmpfs                    487M  7.7M  479M   2% /run
tmpfs                    487M     0  487M   0% /sys/fs/cgroup
/dev/mapper/centos-root   17G  2.8G   15G  17% /
/dev/sda1               1014M  178M  837M  18% /boot
tmpfs                     98M     0   98M   0% /run/user/0
192.168.10.81:/data       17G  5.8G   12G  34% /mnt
```

**注意：如果被挂载的目录非空需要加 -o nonempty参数**

### 3.4.2 自动登录ssh工具sshpass

由EPEL源提供，ssh登陆不能在命令行中指定密码。sshpass的出现，解决了这一问题。sshpass用于非  交互SSH的密码验证，一般用在sh脚本中，无须再次输入密码（本机known_hosts文件中有的主机才能生效）。它允许你用  -p  参数指定明文密码，然后直接登录远程服务器，它支持密码从命令行、文件、环境变量中读取。

**格式：**

```bash
sshpass [option] command parameters
```

**常见选项：**

```bash
-p password #后跟密码它允许你用 -p 参数指定明文密码，然后直接登录远程服务器
-f filename #后跟保存密码的文件名，密码是文件内容的第一行。
-e #将环境变量SSHPASS作为密码
```

**范例：**

```bash
[15:15:05 root@centos8 ~]#yum -y install sshpass
[15:19:52 root@centos8 ~]#rpm -ql sshpass
/usr/bin/sshpass
/usr/lib/.build-id
/usr/lib/.build-id/1f
/usr/lib/.build-id/1f/c5d6cf03500df846a1a801aab749f478845a4d
/usr/share/doc/sshpass
/usr/share/doc/sshpass/AUTHORS
/usr/share/doc/sshpass/COPYING
/usr/share/doc/sshpass/ChangeLog
/usr/share/doc/sshpass/NEWS
/usr/share/man/man1/sshpass.1.gz

[15:20:08 root@centos8 ~]#sshpass -p 123456 ssh 192.168.10.71

[15:21:07 root@centos8 ~]#sshpass -p 123456 ssh 192.168.10.71 hostname -I
192.168.10.71

[15:22:14 root@centos8 ~]#cat pass.txt
123456
[15:22:19 root@centos8 ~]#sshpass -f pass.txt ssh 192.168.10.71

[15:24:18 root@centos8 ~]#export SSHPASS=123456;sshpass -e ssh 192.168.10.71
```

**范例：批量修改多台主机的root密码为随机密码**

```bash
[16:00:10 root@centos8 ~]#cat chanage_root_password.sh
#!/bin/bash
#
#********************************************************************
#Author:zhangzhuo
#QQ: 1191400158
#Date: 2021-01-12
#FileName：chanage_root_password.sh
#URL: https://www.zhangzhuo.ltd
#Description：The test script
#Copyright (C): 2021 All rights reserved
#********************************************************************
rpm -q sshpass &>/dev/null || yum -y install sshpass
export SSHPASS=123456
NET=192.168.10
for i in {1..254};do
{
PASS=`openssl rand -base64 9`
sshpass -e ssh -o StrictHostKeyChecking=no $NET.$i "echo $PASS | passwd --stdin root &>/dev/null" &>/dev/null
echo $NET.$i:$PASS >> host.txt
}&
done
wait
```

**范例：批量部署多台主机key验证脚本1**

```bash
[16:31:17 root@centos8 ~]#cat sshpass1.sh
#!/bin/bash
NET=192.168.10
PASS=123456
ssh-keygen -P "" -f /root/.ssh/id_rsa &>/dev/null
rpm -q sshpass &>/dev/null || yum -y install sshpass &>/dev/null
for i in {1..100};do
{
sshpass -p $PASS ssh-copy-id -o StrictHostKeyChecking=no -i /root/.ssh/id_rsa.pub $NET.$i &>/dev/null
}&
done
wait
```

**范例：批量部署多台主机key验证脚本2**

```bash
[16:37:27 root@centos8 ~]#cat sshpass2.sh
#!/bin/bash
HOSTS="
192.168.10.71
192.168.10.72
"
PASS=123456
ssh-keygen -P "" -f /root/.ssh/id_rsa &>/dev/null
rpm -q sshpass &>/dev/null || yum install -y sshpass &>/dev/null
for i in $HOSTS;do
{
sshpass -p $PASS ssh-copy-id -o StrictHostKeyChecking=no -i /root/.ssh/id_rsa.pub $i &>/dev/null
}&
done
wait
```

### 3.4.3 轻量级自动化运维工具pssh

**EPEL源中提供了多个自动化运维工具**

* pssh：基于python编写，可在多台服务器上执行命令的工具，也可实现文件复制，提供了基于ssh和scp的多个并行工具，项目：[http://code.google.com/p/parallel-ssh/](http://code.google.com/p/parallel-ssh/)
* pdsh：Parallel remote shell program，是一个多线程远程shell客户端，可以并行执行多个远程主机上的命令。 可使用几种不同的远程shell服务，包括rsh，Kerberos IV和ssh，项目：[https://pdsh.googlecode.com/](https://pdsh.googlecode.com/)
* mussh：Multihost SSH wrapper，是一个shell脚本，允许使用命令在多个主机上通过ssh执行命令。 可使用ssh-agent和RSA/DSA密钥，以减少输入密码，项目：[http://www.sourceforge.net/projects/mussh](http://www.sourceforge.net/projects/mussh)

**pssh 命令选项如下：**

```bash
-H：主机字符串，内容格式”[user@]host[:port]”
-h file：主机列表文件，内容格式”[user@]host[:port]”
-A：手动输入密码模式
-i：每个服务器内部处理信息输出
-l：登录使用的用户名
-p：并发的线程数【可选】
-o：输出的文件目录【可选】
-e：错误输出文件【可选】
-t：TIMEOUT 超时时间设置，0无限制【可选】
-O：SSH的选项
-P：打印出服务器返回信息
-v：详细模式
--version：查看版本
```

**范例：**

```bash
#默认使用ssh的key认证，通过 -A选项，使用密码认证批量执行指令
[16:41:11 root@centos8 ~]#pssh -H "192.168.10.71" -A hostname
#输出信息
[16:41:35 root@centos8 ~]#pssh -H zhang@192.168.10.71 -A -i hostname
#通过pssh批量关闭seLinux
[16:53:23 root@centos8 ~]#pssh -H root@192.168.10.71  -A -i 'sed -i "s/^SELINUX=.*/SELINUX=disabled/" /etc/selinux/config'
#多台主机
[16:53:49 root@centos8 ~]#pssh -H "192.168.10.71 192.168.10.72" -i -A hostname
#多台主机
[16:55:23 root@centos8 ~]#cat host.txt
192.168.10.71
192.168.10.72
[16:55:27 root@centos8 ~]#pssh -h host.txt -i -A echo $HOSTNAME
#将标准错误和标准正确重定向分别保存至本地主机的/data/stdout和/data/stderr目录下
[16:58:18 root@centos8 ~]#pssh -H 192.168.10.71 -o /data/stdout -e /data/stderr -i -A "hostname"
#变量需要加单引号引起来
[16:59:54 root@centos8 ~]#pssh -h host.txt -A -i  'echo $HOSTNAME'
#*需要用双或单引号引起来
[17:01:10 root@centos8 ~]#pssh -h host.txt -A -i 'ls /data/*'
```

**pscp.pssh命令**

pscp.pssh功能是将本地文件批量复制到远程主机

pscp [-vAr] [-h hosts_file] [-H [user@]host[:port]] [-l user] [-p par] [-o outdir] [-e errdir] [-t timeout] [-O options] [-x args] [-X arg] local remote

**pscp-pssh选项**

```bash
-v 显示复制过程
-r 递归复制目录
```

**范例：**

```bash
#将本地curl.sh 复制到/data/目录
[17:05:46 root@centos8 ~]#pscp.pssh -H 192.168.10.71 -A /root/curl.sh /data/

#将本地多个文件批量复制到/app/目录
[17:06:32 root@centos8 ~]#pscp.pssh -H 192.168.10.71 -A /root/chanage_root_password.sh /root/push_ssh_key.sh /data/

#将本地目录批量复制到/app/目录
[17:09:16 root@centos8 ~]#pscp.pssh -H 192.168.10.71 -A -r /data/ /data/
```

**pslurp命令**

pslurp功能是将远程主机的文件批量复制到本地

```bash
pslurp [-vAr] [-h  hosts_file] [-H [user@]host[:port]] [-l user] [-p par][-o outdir] [-e errdir] [-t timeout] [-O options] [-x args] [-X arg] [-L localdir] remote local（本地名）
```

**pslurp选项**

```bash
-L 指定从远程主机下载到本机的存储的目录，local是下载到本地后的名称
-r 递归复制目录
```

**范例：**

```bash
#批量下载目标服务器的passwd文件至/app下，并更名为user
[17:12:24 root@centos8 ~]#pslurp -H 192.168.10.71 -A -L /app /etc/passwd user

[17:14:26 root@centos8 ~]#pslurp -h host.txt -A -L  /data/ /etc/redhat-release version
Warning: do not enter your password if anyone else has superuser
privileges or access to your account.
Password:
[1] 17:14:33 [SUCCESS] 192.168.10.71
[2] 17:14:34 [SUCCESS] 192.168.10.72
[17:14:34 root@centos8 ~]#tree /data/
/data/
├── 192.168.10.71
│   └── version
└── 192.168.10.72
└── version

2 directories, 2 files
```

## 3.5  dropbear

由Matt Johnston所开发的Secure Shell软件。Dropbear是一个相对较小的SSH服务器和客户端。它运行在一个基于POSIX的各种平台。  Dropbear是开源软件，在麻省理工学院式的许可证。  Dropbear是特别有用的“嵌入”式的Linux（或其他Unix）系统，如无线路由器，期望在存储器与运算能力有限的情况 下取代OpenSSH，尤其是嵌入式系统

官网：[http://matt.ucc.asn.au/dropbear/dropbear.html](http://matt.ucc.asn.au/dropbear/dropbear.html)

**范例：编译安装dropbear**

```bash
#安装相关包：
[17:16:21 root@centos8 ~]#yum install gcc zlib-devel
#下载
[17:19:00 root@centos8 ~]#wget https://matt.ucc.asn.au/dropbear/dropbear-2020.80.tar.bz2
[17:19:31 root@centos8 ~]#tar xvf dropbear-2020.80.tar.bz2
#编译安装
[17:19:50 root@centos8 dropbear-2020.80]#less INSTALL README
[17:21:06 root@centos8 dropbear-2020.80]#./configure --prefix=/apps/dropber --sysconfdir=/etc/dropber
[17:23:48 root@centos8 dropbear-2020.80]#make PROGRAMS="dropbear dbclient dropbearkey dropbearconvert scp"
[17:23:48 root@centos8 dropbear-2020.80]#make PROGRAMS="dropbear dbclient dropbearkey dropbearconvert scp" install
[17:23:17 root@centos8 dropbear-2020.80]#tree /apps/
/apps/
└── dropber
├── bin
│   ├── dbclient
│   ├── dropbearconvert
│   ├── dropbearkey
│   └── scp
├── sbin
│   └── dropbear
└── share
└── man
├── man1
│   ├── dbclient.1
│   ├── dropbearconvert.1
│   └── dropbearkey.1
└── man8
└── dropbear.8
#配置PATH变量
[17:24:55 root@centos8 ~]#echo 'PATH=/apps/dropbear/sbin:/apps/dropbear/bin:$PATH' >/etc/profile.d/dropber.sh
#生成私钥
[17:31:21 root@centos8 ~]#mkdir /etc/dropbear
[17:31:46 root@centos8 ~]#dropbearkey -t rsa -f /etc/dropbear/dropbear_rsa_host_key -s 2048
[17:32:37 root@centos8 ~]#dropbearkey -t dss -f /etc/dropbear/dropbear_dsa_host_key
#启动ssh服务
[17:32:38 root@centos8 ~]#dropbear -p :2222 -FE  #前台运行，相当于sshd
[17:34:56 root@centos8 ~]#dropbear -p :2222      #后台运行
客户端访问
[17:09:40 root@centos7 ~]#ssh -p 2222 192.168.10.81
[17:35:51 root@centos8 ~]#dropbear -p 2222 192.168.10.81  #相当于ssh
```

# 四、文件完整性检查AIDE(Advanced Intrusion Detection Environment)

当一个入侵者进入了你的系统并且种植了木马，通常会想办法来隐蔽这个木马（除了木马自身的一些隐  蔽特性外，他会尽量给你检查系统的过程设置障碍），通常入侵者会修改一些文件，比如管理员通常用 ps  aux来查看系统进程，那么入侵者很可能用自己经过修改的ps程序来替换掉你系统上的ps程序，以使用ps命令查不到正在运行的木马程序。如果入侵者发现管理员正在运行crontab作业，也有可能替换掉crontab程序等等。所以由此可以看出对于系统文件或是关键文件的检查是很必要的。目前就系统完 整性检查的工具用的比较多的有两款：Tripwire和AIDE，前者是一款商业软件，后者是一款免费的但功能也很强大的工具

AIDE(Advanced Intrusion Detection Environment高级入侵检测环境)是一个入侵检测工具，主要用途是检查文件的完整性，审计计算机上的那些文件被更改过了

AIDE能够构造一个指定文件的数据库，它使用aide.conf作为其配置文件。AIDE数据库能够保存文件的    各种属性，包括：权限(permission)、索引节点序号(inode number)、所属用户(user)、所属用户组(group)、文件大小、最后修改时间(mtime)、创建时间(ctime)、最后访问时间(atime)、增加的大小以  及连接数。AIDE还能够使用下列算法：sha1、md5、rmd160、tiger，以密文形式建立每个文件的校验码或散列号

![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-f03fa71c.png)

**这个数据库不应该保存那些经常变动的文件信息，例如：日志文件、邮件、/proc文件系统、用户起始 目录以及临时目录**

**安装AIDE**

```bash
[17:43:01 root@centos8 ~]#yum install aide
```

**配置文件指定对那些文件进行检测**

```bash
[17:43:34 root@centos8 ~]#vim /etc/aide.conf
```

**配置范例：**

```bash
#定义监控项权限+索引节点+链接数+用户+组+大小+最后一次修改时间+创建时间+md5校验值
R=p+i+n+u+g+s+m+c+md5
NORMAL = R+rmd60+sha256
/data/test.txt R
/bin/ps R+a
/usr/bin/crontab R+a
/etc    PERMS
!/etc/mtab   #“!”表示忽略这个文件的检查
```

**初始化默认的AIDE的库：**

```bash
[17:46:30 root@centos8 ~]#aide -i | --init
```

**生成检查数据库（建议初始数据库存放到安全的地方）**

```bash
[17:54:00 root@centos8 ~]#cd /var/lib/aide/
[17:55:03 root@centos8 aide]#mv aide.db.new.gz aide.db.gz
```

**检测**

```bash
[17:55:26 root@centos8 aide]#aide -C | --check
```

**更新数据库**

```bash
[17:58:44 root@centos8 ~]#aide -u | --update
```

# 五、利用 sudo 实现授权

## 5.1 sudo介绍

sudo 即superuser do，允许系统管理员让普通用户执行一些或者全部的root命令的一个工具，如halt，reboot，su等等。这样不仅减少了root用户的登录 和管理时间，同样也提高了安全性

在最早之前，一般用户管理系统的方式是利用su切换为超级用户。但是使用su的缺点之一在于必须要先告知超级用户的密码。sudo于1980年前后推出，sudo使一般用户不需要知道超级用户的密码即可获得权限。首先超级用户将普通用户的名字、可以执行的特定命令、按照哪种用户或用户组的身份执行等信  息，登记在特殊的文件中（通常是/etc/sudoers），即完成对该用户的授权（此时该用户称为“sudoer”）；在一般用户需要取得特殊权限时，其可在命令前加上“sudo”，此时sudo将会询问该用户自己的密码（以确认终端机前的是该用户本人），回答后系统即会将该命令的进程以超级用户的权限运 行。之后的一段时间内（默认为5分钟，可在/etc/sudoers自定义），使用sudo不需要再次输入密码。

由于不需要超级用户的密码，部分Unix系统甚至利用sudo使一般用户取代超级用户作为管理帐号，例如Ubuntu、Mac OS X等。

**sudo特性：**

* sudo能够授权指定用户在指定主机上运行某些命令。如果未授权用户尝试使用 sudo，会提示联系管理员
* sudo提供了丰富的日志，详细地记录了每个用户干了什么。它能够将日志传到中心主机或者日志服务器
* sudo使用时间戳文件来执行类似的“检票”系统。当用户调用sudo并且输入它的密码时，用户获得了一张存活期为5分钟的票
* sudo的配置文件是sudoers文件，它允许系统管理员集中的管理用户的使用权限和使用的主机。它所存放的位置默认是在/etc/sudoers，属性必须为0440

## 5.2 sudo组成

**包：sudo**

**配置文件：/etc/sudo.conf**

**授权规则配置文件：**

```bash
/etc/sudoers
/etc/sudoers.d
```

**安全编辑授权规则文件和语法检查工具**

```bash
/usr/sbin/visudo
```

**范例：**

```bash
#检查语法
[18:41:09 root@centos8 etc]#visudo -c
#检查指定配置文件语法
[18:43:07 root@centos8 etc]#visudo -f /etc/sudoers.d/test
```

## 5.3 sudo命令

```bash
sudo命令
ls -l /usr/bin/sudo
sudo -i -u wang 切换身份功能和 su 相似,但不一样,sudo必须提前授权,而且要输入自已的密码
sudo [-u user] COMMAND

-V 显示版本信息等配置信息
-u user  默认为root
-l,ll 列出用户在主机上可用的和被禁止的命令
-v 再延长密码有效期限5分钟,更新时间戳
-k 清除时间戳（1970-01-01），下次需要重新输密码
-K 与-k类似，还要删除时间戳文件
-b 在后台执行指令
-p 改变询问密码的提示符号
示例：-p "password on %h for user %p: "
```

## 5.4 sudo授权规则配置

**配置文件格式说明：/etc/sudoers, /etc/sudoers.d/**

**配置文件中支持使用通配符 glob**

```bash
?   任意单一字符

* 匹配任意长度字符
[wxc]   匹配其中一个字符
[!wxc]  除了这三个字符的其它字符
\x  转义
[[alpha]]  字母
```

**范例：**

```bash
/bin/ls [[alpha]]*
```

**配置文件规则有两类**

* 别名定义：部署必须的
* 授权规则：必须的

**sudoers授权规则格式：**

```bash
用户 登入主机=(代表用户) 命令
user host=(runas)  command
```

**范例：**

```bash
root    ALL=(ALL)   ALL
```

**格式说明：**

```bash
user: 运行命令者的身份
host: 通过哪些主机
(runas)：以哪个用户的身份
command: 运行哪些命令
```

**sudoers的别名**

```bash
User和runas:
username
    #uid
    %group_name
    %#gid
    user_alias|runas_alias
host:
    ip 或 hostname
    network(/netmask)
    host_alias
command:
    command name
    directory s
    udoedit
    Cmnd_Alias
```

**sudo别名有四种类型：**

* User_Alias
* Runas_Alias
* Host_Alias
* Cmnd_Alias

**别名格式：**

```bash
[A-Z]([A-Z][0-9]_)*
```

**别名定义：**

```bash
Alias_Type NAME1 = item1,item2,item3 : NAME2 = item4, item5
```

## 5.5 实战案例

**案例1：**

```bash
zhang ALL=(ALL) ALL
%cy ALL=(ALL) ALL
```

**案例2：**

```bash
zhang ALL=(root) /sbin/pidof,/sbin/ifconfig      #zhang只能执行后面俩个命令时使用root身份
%cy ALL=(ALL) NOPASSWD:ALL                       #cy组执行sudo时不需要输入密码
```

**案例3：**

```bash
User_Alias NETADMIN= zhang,cy                          #定义别名用户
Cmnd_Alias NETCMD=/usr/sbin/ip,/usr/sbin/ifconfig      #定义别名命令
NETADMIN ALL=(root) NETCMD                             #使用
```

**案例4：**

```bash
User_Alias NETADMIN= zhang,%cy
User_Alias DISKADER= tom
Host_Alias SERS=192.168.10.0/24
Runas_Alias OP=root
Cmnd_Alias NETCMD=/usr/sbin/ip,/usr/bin/cat
Cmnd_Alias DSKCMD=/usr/bin/passwd
NETADMIN SERS= NETCMD
DISKADER ALL=(OP) DSKCMD
```

**案例5：**

```bash
User_Alias ADMINUSER = adminuser1,adminuser2
Cmnd_Alias ADMINCMD = /usr/sbin/useradd，/usr/sbin/usermod, /usr/bin/passwd [a- zA-Z]*, !/usr/bin/passwd root
ADMINUSER ALL=(root) NOPASSWD:ADMINCMD，PASSWD:/usr/sbin/userdel
```

**案例6：**

```bash
Defaults:wang runas_default=tom         #wang执行sudo默认用户是tom
wang ALL=(tom,jerry) ALL

wang$ sudo   cmd  #默认代表tom执行cmd 
wang$ sudo -u jerry cmd
```

**案例7：修改验证密码间隔为2分**

```bash
[11:57:37 root@centos8 ~]#vim /etc/sudoers
Defaults    env_reset,timestamp_timeout=2

[14:25:17 root@centos8 ~]#sudo -V
```

**案例8：修改ubuntu的visudo的默认编辑器**

```bash
export EDITOR=vim
visudo
```

**案例9：删除时间戳文件**

```bash
[14:28:13 root@centos8 ~]#su - cy
Last login: Thu Jan 14 14:24:03 CST 2021 on pts/0
[cy@centos8 ~]$ sudo -K
[cy@centos8 ~]$ exit
logout
[14:28:33 root@centos8 ~]#ll /run/sudo/ts/
total 0
[14:28:45 root@centos8 ~]#ll /run/sudo/ts
total 0
```

**案例10：bug思考**

```bash
[20:12:17 root@centos8 ~]#cat /etc/sudoers.d/zhang
zhang ALL=(ALL) NOPASSWD:/usr/bin/cat  /var/log/messages*

#没有设置其他文件但是借助设置的文件可以查看其他文件
[20:12:48 root@centos8 ~]#su - zhang
[zhang@centos8 ~]$ sudo cat /etc/shadow
[sudo] password for zhang: 
Sorry, user zhang is not allowed to execute '/bin/cat /etc/shadow' as root on centos8.
[zhang@centos8 ~]$ sudo cat /var/log/messages /etc/shadow | tail -1
testuser:$6$mNCi0TvEDAYPgJma$cCyVgtj8Q3ItIDNoxDUKCX2ecWHiJ/WISzlM6ybIwFCypWJt1jL5YeSm.z5PWMmaTRzSJhKgGvAMitFogwmho1:18641:0:99999:7:::

#解决方法：！表示不是排除
zhang ALL=(ALL) NOPASSWD: /usr/bin/cat  /var/log/messages*,!/usr/bin/cat  /var/log/messages* *
```

# 六、PAM认证机制

## 6.1 PAM介绍

**认证库：文本文件，MySQL，NIS，LDAP等**

PAM：Pluggable Authentication Modules，插件式的验证模块，Sun公司于1995 年开发的一种与认证相关的通用框架机制。PAM 只关注如何为服务验证用户的 API，通过提供一些动态链接库和一套统一的API，将系统提供的服务和该服务的认证方式分开，使得系统管理员可以灵活地根据需要给不同的服务配置不同的认证方式而无需更改服务程序一种认证框架，自身不做认证

## 6.2 PAM架构

![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-cb1a22b4.png)

PAM提供了对所有服务进行认证的中央机制，适用于本地登录，远程登录，如：telnet,rlogin,fsh,ftp,点对点协议PPP，su等应用程序中，系统管理员通过PAM配置文件来制定不同应用程序的不同认证策略； 应用程序开发者通过在服务程序中使用PAM API(pam_xxxx(  ))来实现对认证方法的调用；而PAM服务模块的开发者则利用PAM SPI来编写模块（主要调用函数pam_sm_xxxx( )供PAM接口库调用，将不同的认证机制加入到系统中；PAM接口库（libpam）则读取配置文件，将应用程序和相应的PAM服务模块联系起来

## 6.3 PAM相关文件

* 包名: pam
* 模块文件目录：/lib64/security/*.so
* 特定模块相关的设置文件：/etc/security/
* 应用程序调用PAM模块的配置文件
  * 主配置文件：/etc/pam.conf，默认不存在，一般不使用主配置
  * 为每种应用模块提供一个专用的配置文件：/etc/pam.d/APP_NAME
  * 注意：如/etc/pam.d存在，/etc/pam.conf将失效

### 6.3.1 范例：查看程序是否支持PAM

```bash
[14:32:28 root@centos8 ~]#ldd `which sshd` | grep libpam
libpam.so.0 => /lib64/libpam.so.0 (0x00007f0e3e4d8000)
[14:44:42 root@centos8 ~]#ldd `which passwd` | grep libpam
libpam.so.0 => /lib64/libpam.so.0 (0x00007f5c1ffab000)
libpam_misc.so.0 => /lib64/libpam_misc.so.0 (0x00007f5c1fda7000)

#不支持PAM
[14:44:52 root@centos8 ~]#ldd /usr/sbin/httpd | grep libpam
```

## 6.4 PAM工作原理

PAM认证一般遵循这样的顺序：Service(服务)→PAM(配置文件)→pam_*.so

PAM认证首先要确定那一项服务，然后加载相应的PAM的配置文件(位于/etc/pam.d下)，最后调用认证文件(位于/lib64/security下)进行安全认证
![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-cfe0b3a8.png)

PAM认证过程示例：

1. 使用者执行/usr/bin/passwd 程序，并输入密码
2. passwd开始调用PAM模块，PAM模块会搜寻passwd程序的PAM相关设置文件，这个设置文件一般是 在/etc/pam.d/里边的与程序同名的文件，即PAM会搜寻/etc/pam.d/passwd此设置文件
3. 经由/etc/pam.d/passwd设定文件的数据，取用PAM所提供的相关模块来进行验证
4. 将验证结果回传给passwd这个程序，而passwd这个程序会根据PAM回传的结果决定下一个动作（重新输入密码或者通过验证）

## 6.5 PAM配置文件格式说明

**通用配置文件/etc/pam.conf格式，此格式不使用**

```bash
application  type  control  module-path  arguments
```

**专用配置文件/etc/pam.d/格式**

```bash
type    control     module-path     arguments
```

**参数说明：**

```bash
application：指服务名，如：telnet、login、ftp等，服务名字“OTHER”代表所有没有在该文件中明确配置的其它服务
type：指模块类型，即功能
control ：PAM库该如何处理与该服务相关的PAM模块的成功或失败情况，一个关健词实现
module-path： 用来指明本模块对应的程序文件的路径名
Arguments： 用来传递给该模块的参数
```

**模块类型(module-type)**

* Auth 账号的认证和授权
* Account 帐户的有效性，与账号管理相关的非认证类的功能，如：用来限制/允许用户对某个服务的访问时间，限制用户的位置(例如：root用户只能从控制台登录)
* Password 用户修改密码时密码复杂度检查机制等功能
* Session 用户会话期间的控制，如：最多打开的文件数，最多的进程数等
* -type 表示因为缺失而不能加载的模块将不记录到系统日志,对于那些不总是安装在系统上的模块有用

**Control:**

* required ：一票否决，表示本模块必须返回成功才能通过认证，但是如果该模块返回失败，失败结果也不会立即通知用户，而是要等到同一type中的所有模块全部执行完毕，再将失败结果返回 给应用程序，即为必要条件
* requisite ：一票否决，该模块必须返回成功才能通过认证，但是一旦该模块返回失败，将不再执行同一type内的任何模块，而是直接将控制权返回给应用程序。是一个必要条件
* sufficient ：一票通过，表明本模块返回成功则通过身份认证的要求，不必再执行同一type内的其它模块，但如果本模块返回失败可忽略，即为充分条件，优先于前面的required和requisite
* optional ：表明本模块是可选的，它的成功与否不会对身份认证起关键作用，其返回值一般被忽略
* include： 调用其他的配置文件中定义的配置信息

**module-path:**

* 模块文件所在绝对路径：
* 模块文件所在相对路径：/lib64/security目录下的模块可使用相对路径，如：pam_shells.so、pam_limits.so
* 有些模块有自已的专有配置文件，在/etc/security/*.conf目 录下

**Arguments**

* debug ：该模块应当用syslog( )将调试信息写入到系统日志文件中no_warn ：表明该模块不应把警告信息发送给应用程序
* use_first_pass ：该模块不能提示用户输入密码，只能从前一个模块得到输入密码
* try_first_pass ：该模块首先用前一个模块从用户得到密码，如果该密码验证不通过，再提示用户输入新密码
* use_mapped_pass 该模块不能提示用户输入密码，而是使用映射过的密码
* expose_account    允许该模块显示用户的帐号名等信息，一般只能在安全的环境下使用，因为泄漏用户名会对安全造成一定程度的威胁

**注意：修改PAM配置文件将马上生效**

**建议：编辑pam规则时，保持至少打开一个root会话，以防止root身份验证错误**

## 6.6 PAM模块帮助

官方在线文档：[http://www.linux-pam.org/Linux-PAM-html/](http://www.linux-pam.org/Linux-PAM-html/)

官方离线文档：[http://www.linux-pam.org/documentation/](http://www.linux-pam.org/documentation/)

pam模块文档说明：/user/share/doc/pam-*

rpm -qd pam

man -k pam_

man 模块名 如：man 8 rootok

## 6.7 常用PAM模块

### 6.7.1 pam_shells模块

功能：检查有效shell

帮助：man pam_shells

案例：不允许使用/bin/csh的用户本地登录

```bash
[14:45:11 root@centos8 ~]#yum install csh -y

[14:56:14 root@centos8 ~]#vim /etc/pam.d/login   #这个如果设置表示主机终端tty无法登录，其他方式是可以登录的
[19:11:49 root@centos8 ~]#vim /etc/pam.d/sshd    #设置这个表示使用ssh连接的无法登录
#添加下面这行
auth       required     pam_shells.so
#这个模块会检查/etc/shells文件中的shell是否合法，不存在或者注释表示不合法

[14:58:00 root@centos8 ~]#vim /etc/shells
去掉/bin/csh

[14:58:14 root@centos8 ~]#useradd -s /usr/bin/csh testuser
#testuser将不可登录
[15:23:00 root@centos8 ~]#tail -f /var/log/secure  #可以查看登录日志
```

### 6.7.2 pam_securetty模块

功能：只允许root用户在/etc/securetty列出的安全终端上登陆

**案例：CentOS 7 允许root在telnet登陆**

```bash
[15:26:38 root@centos8 ~]#vim /etc/pam.d/remote
#将下面一行加上注释
#auth       required     pam_securetty.so
#或者/etc/securetty文件中加入
pts/0,pts/1…pts/n

#测试用root telnet登录
```

**案例：在Centos8上实现pam_securetty.so模块禁止root远程登录telnet服务**

```bash
#默认CentOS8 虽然有这模块,但没有使用此模块,所以允许root远程telnet登录
[15:30:28 root@centos8 ~]#telnet 192.168.10.81
Trying 192.168.10.81...
Connected to 192.168.10.81.
Escape character is '^]'.

Kernel 4.18.0-193.el8.x86_64 on an x86_64
centos8 login: root
Password:
Last failed login: Thu Jan 14 15:34:00 CST 2021 from ::ffff:192.168.10.1 on pts/2
There was 1 failed login attempt since the last successful login.
Last login: Thu Jan 14 15:33:43 from ::ffff:192.168.10.1
#修改配置不允许root远程telnet登录
[15:35:45 root@centos8 ~]#vim /etc/pam.d/remote
#添加此行
auth       required     pam_securetty.so
#创建空文件,CentOS8上默认不存在此文件
[15:38:02 root@centos8 ~]#touch /etc/securetty

#测试
[15:38:06 root@centos8 ~]#telnet 192.168.10.81
```

### 6.7.3 pam_nologin.so模块

功能：如果/etc/nologin文件存在,将导致非root用户不能登陆,当该用户登陆时，会显示/etc/nologin文     件内容，并拒绝登陆，要想再次登录删除/etc/nologin文件就可以了（适合服务器维护时使用）

```bash
[19:16:37 root@centos8 ~]#vim /etc/pam.d/sshd
auth       required     pam_nologin.so         #添加
#生成nologin文件，只要生成这个文件除了root用户其他用户都不可以登录
[19:24:21 root@centos8 ~]#touch /etc/nologin
#登录失败提醒设置，登录失败后提醒
[19:25:36 root@centos8 ~]#echo zhangzhuo > /etc/nologin
```

### 6.7.4 pam_limits.so模块（重点服务器优化必要）

功能：在用户级别实现对其可使用的资源的限制，例如：可打开的文件数量，可运行的进程数量，可用内存空间

![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-cbc98fff.png)

**修改限制的实现方式：**

（1）ulimit命令

ulimit是linux shell的内置命令，它具有一套参数集，用于对shell进程及其子进程进行资源限制。ulimit的设定值是 per-process 的，也就是说，每个进程有自己的limits值。

使用ulimit进行修改，立即生效。

ulimit只影响shell进程及其子进程，用户登出后失效。

可以在profile中加入ulimit的设置，变相的做到永久生效。

```bash
-H 设置硬件资源限制.
-S 设置软件资源限制.
-a 显示当前所有的资源限制.
-c size:设置core文件的最大值.单位:blocks
-d size:设置数据段的最大值.单位:kbytes
-f size:设置创建文件的最大值.单位:blocks
-l size:设置在内存中锁定进程的最大值.单位:kbytes
-m size:设置可以使用的常驻内存的最大值.单位:kbytes
-n size:设置内核可以同时打开的文件描述符的最大值.单位:n
-p size:设置管道缓冲区的最大值.单位:kbytes
-s size:设置堆栈的最大值.单位:kbytes
-t size:设置CPU使用时间的最大上限.单位:seconds
-u size:最大用户进程数
-v size:设置虚拟内存的最大值.单位:kbytes unlimited 是一个特殊值，用于表示不限制

#说明
查询时，若不加H或S参数，默认显示的是软限制
修改时，若不加H或S参数，两个参数一起改变
```

（2）配置文件：

pam_limits的设定值是基于 per-process 的

```bash
/etc/security/limits.conf
/etc/security/limits.d/*.conf
```

配置文件格式：

```bash
#每行一个定义
<domain>   <type>   <item>  <value>
```

格式说明：

**应用与那些对象**

```bash
Username 单个用户
@group 组内所有用户
* 所有用户
%  仅用于限制 maxlogins limit , 可以使用 %group 语法. 只用 % 相当于 * 对所有用户maxsyslogins limit限制.   %group 表示限制此组中的所有用户总的最大登录数
```

**限制类型**

```bash
Soft 软限制,普通用户自己可以修改
Hard 硬限制,由root用户设定，且通过kernel强制生效

- 二者同时限定
```

**限制的资源**

```bash
nofile 所能够同时打开的最大文件数量,默认为1024
nproc 所能够同时运行的进程的最大数量,默认为1024
```

指定具体值

**案例：系统的各种资源的默认值**

```bash
[15:38:52 root@centos8 ~]#ulimit -a
core file size          (blocks, -c) unlimited  #unlimited表示不限制
data seg size           (kbytes, -d) unlimited
scheduling priority             (-e) 0
file size               (blocks, -f) unlimited
pending signals                 (-i) 3586
max locked memory       (kbytes, -l) 64
max memory size         (kbytes, -m) unlimited
open files                      (-n) 1024          #一个进程可以打开的最大文件数
pipe size            (512 bytes, -p) 8
POSIX message queues     (bytes, -q) 819200
real-time priority              (-r) 0
stack size              (kbytes, -s) 8192
cpu time               (seconds, -t) unlimited
max user processes              (-u) 3586        #一个用户可以开启进程/线程的最大数目
virtual memory          (kbytes, -v) unlimited
file locks                      (-x) unlimited
```

**案例：ulimit命令修改用户打开的文件个数**

```bash
[15:45:07 root@centos8 ~]#ulimit -n
1024
[15:45:56 root@centos8 ~]#ulimit -n 1048577
-bash: ulimit: open files: cannot modify limit: Operation not permitted
[15:46:02 root@centos8 ~]#ulimit -n 1048576
[15:46:08 root@centos8 ~]#ulimit -a
core file size          (blocks, -c) unlimited
data seg size           (kbytes, -d) unlimited
scheduling priority             (-e) 0
file size               (blocks, -f) unlimited
pending signals                 (-i) 3586
max locked memory       (kbytes, -l) 64
max memory size         (kbytes, -m) unlimited
open files                      (-n) 1048576
pipe size            (512 bytes, -p) 8
POSIX message queues     (bytes, -q) 819200
real-time priority              (-r) 0
stack size              (kbytes, -s) 8192
cpu time               (seconds, -t) unlimited
max user processes              (-u) 3586
virtual memory          (kbytes, -v) unlimited
file locks                      (-x) unlimited
[15:46:16 root@centos8 ~]#echo 2^20 | bc
1048576
```

**案例：限制用户最多打开的文件数和运行进程数，并持久保存**

```bash
[15:46:32 root@centos8 ~]#cat /etc/pam.d/system-auth
session     required      pam_limits.so

[15:47:28 root@centos8 ~]#vim /etc/security/limits.conf
#apache可打开10240个文件
apache - nofile 10240
#cy不能运行超过20个进程
cy hard nproc 10
#用cy登录多次运行bash，观察结果

[16:02:03 root@centos8 ~]#cat /etc/security/limits.conf
zhang - nofile 6666
zhang - nporc 5
cy    - nofile 8888
[16:02:07 root@centos8 ~]#su - zhang
Last login: Thu Jan 14 14:31:59 CST 2021 on pts/1
[zhang@centos8 ~]$ ulimit -n
6666
```

**案例：限制zhang用户最大的同时登录次数**

```bash
[16:04:03 root@centos8 ~]#tail -n1 /etc/security/limits.conf
zhang - maxlogins 2
[16:04:33 root@centos8 ~]#who
root     pts/0        2021-01-14 15:58 (192.168.10.1)
root     pts/1        2021-01-14 15:58 (192.168.10.1)
zhang    pts/2        2021-01-14 16:04 (192.168.10.1)
zhang    pts/3        2021-01-14 16:04 (192.168.10.1)
```

**生成案例：（重点）**

```bash
[zhang@centos8 ~]$ tail -n5 /etc/security/limits.conf

* - core     unlimited
* - nproce   1000000    #最大进程数
* - nofile   1000000    #打开文件描述符最大数目
* - memlock  32000
* - msgqueue 8192000
```

### 6.7.5 pam_succeed_if模块

功能：根据参数中的所有条件都满足才返回成功

案例：ubuntu默认不允许root登录桌面图形

```bash
用root登录桌面失败，查看日志，可看到Pam原因

Vim /etc/pam.d/gdm-passwd #将下面行注释
#auth requried pam_succeed_if.so user !=root quiet_success
```

### 6.7.6 pam_google_anthenticator模块

```bash
什么是 MFA ?
Multi-Factor Authentication (MFA) 是一种简单有效的最佳安全实践方法，它能够在用户名和密码之外再额外增加一层安全保护。
```

功能：实现SSH登录的两次身份验证，先验证APP的数字码，再验证root用户的密码，都通过才可以登录。

官方网站：[https://github.com/google/google-authenticator-android](https://github.com/google/google-authenticator-android)

![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-7e3cd9e6.png)

**范例：**

* 在手机应用市场搜索：身份验证器或authenticator，并安装APP或者也可以使用微信小程序MinaOTP
* 安装google-authenticator，需要有epel源
* 执行google-authenticator
* 在/etc/pam.d/sshd中添加auth       required     pam_google_authenticator.so
* 修改sshd配置文件/etc/ssh/sshd_config中ChallengeResponseAuthentication yes
* 重启ssh服务

```bash
#查看
[19:36:30 root@centos8 ~]#yum info google-authenticator.x86_64 

#安装，需先安装epel源
[19:50:30 root@centos8 ~]#yum install -y epel-release
[19:44:00 root@centos8 ~]#yum install -y  google-authenticator.x86_64

#执行，所有选项都执行y
[19:51:36 root@centos8 ~]#google-authenticator 

Do you want authentication tokens to be time-based (y/n) y
Warning: pasting the following URL into your browser exposes the OTP secret to Google:
#浏览器打开下面的网站用安装的app扫二维码添加主机，需要科学上网
  https://www.google.com/chart?chs=200x200&chld=M|0&cht=qr&chl=otpauth://totp/root@centos8%3Fsecret%3D4DME7Q3DLMD75TQY722B2KB4ME%26issuer%3Dcentos8
Failed to use libqrencode to show QR code visually for scanning.
Consider typing the OTP secret into your app manually.
Your new secret key is: 4DME7Q3DLMD75TQY722B2KB4ME 
Enter code from app (-1 to skip): 509005     #
Code confirmed
Your emergency scratch codes are:   
#下面生成的数字需要保存，以防止手机丢失无法登录时使用，那个使用过后就消失了
需要添加的话可以在/root/.google_authenticator文件中添加
  21350850
  32992678
  17672106
  41326673
  97208182

Do you want me to update your "/root/.google_authenticator" file? (y/n) y 

Do you want to disallow multiple uses of the same authentication
token? This restricts you to one login about every 30s, but it increases
your chances to notice or even prevent man-in-the-middle attacks (y/n) y

By default, a new token is generated every 30 seconds by the mobile app.
In order to compensate for possible time-skew between the client and the server,
we allow an extra token before and after the current time. This allows for a
time skew of up to 30 seconds between authentication server and client. If you
experience problems with poor time synchronization, you can increase the window
from its default size of 3 permitted codes (one previous code, the current
code, the next code) to 17 permitted codes (the 8 previous codes, the current
code, and the 8 next codes). This will permit for a time skew of up to 4 minutes
between client and server.
Do you want to do so? (y/n) y

If the computer that you are logging into isn't hardened against brute-force
login attempts, you can enable rate-limiting for the authentication module.
By default, this limits attackers to no more than 3 login attempts every 30s.
Do you want to enable rate-limiting? (y/n) y

#在pam配置文件sshd文件中添加模块
[19:58:37 root@centos8 ~]#vim /etc/pam.d/sshd 
auth       required     pam_google_authenticator.so         

 #修改ssh服务配置文件
 [20:01:45 root@centos8 ~]#vim /etc/ssh/sshd_config 
 ChallengeResponseAuthentication yes
 
 #重启ssh服务
 [20:02:44 root@centos8 ~]#systemctl restart sshd
```

使用ssh登录时需要在红色标记里面使用app动态密钥验证后才能使用密码登录
![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-c64bd420.png)

# 七、时间同步服务

**加密和安全当前都离不开时间的同步，否则各种网络服务可能不能正常运行**

范例: 时间错误导致证书应用出错
![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-0e018192.png)

## 7.1 计时方式

### 7.1.1 现代计时方式

石英晶体受到电池的电力影响时，会产生规律的振动。每秒的振动次数是32768次，可以设计电路来计算振动次数，当计数到32768次时，即计时1秒。1967年，瑞士人发布了世界上首款石英表

当原子从一个相对高的“能量态”迁至低的“能量态”时，会释放出电磁波，产生共振频率。依据此原理， 拉比构想出了一种全新的计时仪器——原子钟（Atomic clock）

因为原子的共振频率是固定的。如：铯原子（Caesium133）的固有频率是9192631770赫兹，约合92   亿赫兹，对铯原子钟计数9192631770次，即可测量出一秒钟。很多国家（包括我国和美国NIST）的标准局，就是用铯原子钟来作为时间精度标准的。GPS系统也是用铯原子钟来计时

2008年诞生的锶（Strontium87）原子钟，固有频率为429228004229873，约合430万亿赫兹，将精度提高到了10的17次方

2013年镱元素（ytterbium）制成的原子钟问世，镱原子钟的固有频率约合518万亿赫兹，精度高达10的18次方。宇宙的年龄为138亿年。如果这台镱原子钟从宇宙诞生之初就开始计时，直到今天也不会发生1秒的误差

**范例：一次性的同步**

```bash
[16:16:32 root@centos8 ~]#date -s '-1 year'
Tue Jan 14 16:16:53 CST 2020
[16:16:53 root@centos8 ~]#date
Tue Jan 14 16:17:00 CST 2020
[16:17:00 root@centos8 ~]#ping ntp.aliyun.com
PING ntp.aliyun.com (203.107.6.88) 56(84) bytes of data.
64 bytes from 203.107.6.88 (203.107.6.88): icmp_seq=1 ttl=128 time=14.8 ms
64 bytes from 203.107.6.88 (203.107.6.88): icmp_seq=2 ttl=128 time=17.3 ms
64 bytes from 203.107.6.88 (203.107.6.88): icmp_seq=3 ttl=128 time=17.2 ms
[16:19:41 root@centos8 ~]#ntpdate ntp.aliyun.com

[16:19:59 root@centos8 ~]#date
Tue Jan 14 16:20:05 CST 2020
[16:20:05 root@centos8 ~]#ntpdate time.windows.com       #这个命令在Centos8当中已经停止使用
[16:20:17 root@centos8 ~]#date
Tue Jan 14 16:20:19 CST 2020
```

## 7.2 时间同步服务

![clipboard.png](https://b3logfile.com/file/2021/01/clipboard-91b5fa29.png)

**时间同步服务**

多主机协作工作时，各个主机的时间同步很重要，时间不一致会造成很多重要应用的故障，如：加密协议，日志，集群等， 利用NTP（Network Time Protocol）  协议使网络中的各个计算机时间达到同步。目前NTP协议属于运维基础架构中必备的基本服务之一

时间同步软件实现：

* ntp
* chrony

**ntp：**

将系统时钟和世界协调时UTC同步，精度在局域网内可达0.1ms，在互联网上绝大多数的地方精度可以达到1-50ms

项目官网：http://www.ntp.org

**chrony：**

实现NTP协议的的自由软件。可使系统时钟与NTP服务器，参考时钟（例如GPS接收器）以及使用手表和键盘的手动输入进行同步。还可以作为NTPv4（RFC 5905）服务器和对等体运行，为网络中的计算机提供时间服务。设计用于在各种条件下良好运行，包括间歇性和高度拥挤的网络连接，温度变化（计算  机时钟对温度敏感），以及不能连续运行或在虚拟机上运行的系统。

通过Internet同步的两台机器之间的典型精度在几毫秒之内，在LAN上，精度通常为几十微秒。利用硬件时间戳或硬件参考时钟，可实现亚微秒的精度

## 7.3 chrony

**chrony 的优势：**

* 更快的同步只需要数分钟而非数小时时间，从而最大程度减少了时间和频率误差，对于并非全天24 小时运行的虚拟计算机而言非常有用
* 能够更好地响应时钟频率的快速变化，对于具备不稳定时钟的虚拟机或导致时钟频率发生变化的节  能技术而言非常有用
* 在初始同步后，它不会停止时钟，以防对需要系统时间保持单调的应用程序造成影响
* 在应对临时非对称延迟时（例如，在大规模下载造成链接饱和时）提供了更好的稳定性
* 无需对服务器进行定期轮询，因此具备间歇性网络连接的系统仍然可以快速同步时钟

chrony官网：[https://chrony.tuxfamily.org](https://chrony.tuxfamily.org)

chrony官方文档：[https://chrony.tuxfamily.org/documentation.html](https://chrony.tuxfamily.org/documentation.html)

### 7.3.1 chrony文件组成

**包：chrony**

**两个主要程序：chronyd和chronyc**

* chronyd：后台运行的守护进程，用于调整内核中运行的系统时钟和时钟服务器同步。它确定计算机 增 减 时 间 的 比 率 ， 并 对 此 进 行 补 偿
* chronyc：命令行用户工具，用于监控性能并进行多样化的配置。它可以在chronyd实例控制的计算机上工作，也可在一台不同的远程计算机上工作

**服务unit 文件： /usr/lib/systemd/system/chronyd.service**

**监听端口： 服务端: 123/udp,客户端: 323/udp**

**配置文件： /etc/chrony.conf**

### 7.3.2 配置文件chrony.conf

官方文档: [https://chrony.tuxfamily.org/doc/3.5/chrony.conf.html](https://chrony.tuxfamily.org/doc/3.5/chrony.conf.html)

```bash
server  #可用于时钟服务器，iburst 选项当服务器可达时，发送一个八个数据包而不是通常的一个数据包。 包间隔通常为2秒,可加快初始同步速度
pool     #该指令的语法与server 指令的语法相似，不同之处在于它用于指定NTP服务器池而不是单个
NTP服务器。池名称应解析为随时间可能会变化的多个地址
driftfile  #根据实际时间计算出计算机增减时间的比率，将它记录到一个文件中，会在重启后为系统时钟作出补偿
rtcsync  #启用内核模式，系统时间每11分钟会拷贝到实时时钟（RTC）
allow / deny #指定一台主机、子网，或者网络以允许或拒绝访问本服务器
cmdallow / cmddeny #可以指定哪台主机可以通过chronyd使用控制命令
bindcmdaddress #允许chronyd监听哪个接口来接收由chronyc执行的命令
makestep # 通常chronyd将根据需求通过减慢或加速时钟，使得系统逐步纠正所有时间偏差。在某些特定情况下，系统时钟可能会漂移过快，导致该调整过程消耗很长的时间来纠正系统时钟。该指令强制chronyd在  调整期大于某个阀值时调整系统时钟
local stratum 10  #即使server指令中时间服务器不可用，也允许将本地时间作为标准时间授时给其它 客户端
```

### 7.3.3 ntp客户端工具

chronyc 可以运行在交互式和非交互式两种方式，支持以下子命令

```bash
accheck           检查是否对特定主机可访问当前服务器
activity          显示有多少NTP源在线/离线
sources [-v]      显示当前时间源的同步信息
sourcestats [-v]  显示当前时间源的同步统计信息
add server        手动添加一台新的NTP服务器
clients           报告已访问本服务器的客户端列表
delete            手动移除NTP服务器或对等服务器
settime           手动设置守护进程时间
tracking         显示系统时间信息
```

**范例：设置chronyd客户端与服务端**

```bash
[09:40:54 root@centos8 ~]#vim /etc/chrony.conf
server ntp.aliyun.com iburst         #设置本台主机的ntp服务器端
allow 192.168.10.0/24                #如果要当成服务端的话需要设置这项，表示允许那个网段的主机连接
local stratum 10                     #服务端建议开启，表示如果本台主机的服务端断开的话是否还能给其他主机提供服务
其余选项默认，如果只当服务端的话只设置server就可以了可以写域名或者IP地址
也可以写pool地址池
```

**范例：Centos6 ntp客户端同步检查**

```bash
[16:29:47 root@centos6 ~]#ntpq -p
```

### 7.3.4 公共NTP服务

* pool.ntp.org：项目是一个提供可靠易用的NTP服务的虚拟集群cn.pool.ntp.org，0- 3.cn.pool.ntp.org
* 阿里云公共NTP服务器

  * Unix/linux类：ntp.aliyun.com，ntp1-7.aliyun.com
  * windows类： time.pool.aliyun.com
* 腾讯公共NTP

  * time1-5.cloud.tencent.com
* 大学ntp服务

  * s1a.time.edu.cn 北京邮电大学
  * s1b.time.edu.cn 清华大学
  * s1c.time.edu.cn 北京大学
* 国家授时中心服务器：210.72.145.44

### 7.3.5 时间工具

* timedatectl 时间和时区管理

```bash
#查看日期时间、时区及NTP状态： timedatectl

#查看时区列表：
timedatectl list-timezones

#修改时区：
timedatectl set-timezone Asia/Shanghai

#修改日期时间：
timedatectl set-time "2017-01-23 10:30:00"
#开启NTP：
timedatectl set-ntp true/false
```

* ntpdate 时间同步命令
* system-config-date：图形化配置chrony服务的工具

# 八、TCP Wrapper

## 8.1 TCP_Wrappers介绍

作者：Wieste  Venema，IBM，Google，工作在第四层（传输层）的TCP协议，对有状态连接的特定服务进行安全检测并实现访问控制，以库文件形式实现

某进程是否接受libwrap的控制取决于发起此进程的程序在编译时是否针对libwrap进行编译的判断服务程序是否能够由tcp_wrapper进行访问控制的方法：

```bash
ldd  /PATH/TO/PROGRAM|grep libwrap.so
```

**范例：**

```bash
[10:06:45 root@centos7 ~]#ldd `which sshd` | grep libwra
libwrap.so.0 => /lib64/libwrap.so.0 (0x00007fb1bd9fa000)
[10:07:08 root@centos8 ~]#ldd `which sshd` | grep libwra
centos8已经不在使用
```

## 8.2 TCP_Wrappers的使用

配置文件：/etc/hosts.allow, /etc/hosts.deny

帮助参考：man 5 hosts_access，man 5 hosts_options

检查顺序：hosts.allow，hosts.deny（默认允许），    注意：一旦前面规则匹配，直接生效，将不再继续

**配置基本语法:**

```bash
daemon_list@host: client_list  [ :options :option… ]
```

**Daemon_list@host格式**

```bash
单个应用程序的二进制文件名，而非服务名，例如vsftpd
以逗号或空格分隔的应用程序文件名列表，如:sshd,vsftpd
ALL表示所有接受tcp_wrapper控制的服务程序
主机有多个IP，可用@hostIP来实现控制,如：in.telnetd@192.168.0.254
```

**客户端Client_list格式**

```bash
以逗号或空格分隔的客户端列表
基于IP地址：192.168.10.1    192.168.1.
基于主机名：www.magedu.com   .magedu.com 较少用
基于网络/掩码：192.168.0.0/255.255.255.0
基于net/prefixlen: 192.168.1.0/24（CentOS7）
基于网络组（NIS 域）：@mynetwork
内置ACL：ALL，LOCAL，KNOWN，UNKNOWN，PARANOID
EXCEPT   排除相关地址
```

**范例：EXCEPT用法**

```bash
vsftpd: 172.16. EXCEPT 172.16.100.0/24 EXCEPT 172.16.100.1
```

**范例：只允许192.168.1.0/24的主机访问sshd**

```bash
/etc/hosts.allow
sshd: 192.168.1.
/etc/hosts.deny
sshd :ALL
```

**范例：只允许192.168.1.0/24的主机访问telnet和vsftpd服务**

```bash
/etc/hosts.allow
vsftpd,in.telnetd: 192.168.1.
/etc/host.deny
vsftpd,in.telnetd:  ALL
```

**[:options]选项格式：帮助：man 5 hosts_options**

* deny 主要用在/etc/hosts.allow定义“拒绝”规则，如：vsftpd: 172.16. :deny
* allow 主要用在/etc/hosts.deny定义“允许”规则，如：vsftpd:172.16. :allow
* spawn 启动一个外部程序完成执行的操作
* twist 实际动作是拒绝访问,使用指定操作替换当前服务,标准输出和ERROR发送到客户端,默认至/dev/null

**范例：拒绝登录**

```bash
[10:07:18 root@centos7 ~]#vim /etc/hosts.allow
sshd:ALL:deny echo
[10:28:48 root@centos8 ~]#ssh 192.168.10.71
kex_exchange_identification: read: Connection reset by peer

说明：
在/etc/hosts.allow中添加，允许登录，并记录日志在/etc/hosts.deny中添加，拒绝登录，并记录日志
%c 客户端信息
%s 服务器端信息
%d 服务名
%p 守护进程的PID
%% 表示%
```

**范例：登陆时执行外部程序**

```bash
[10:31:43 root@centos7 ~]#cat /etc/hosts.allow 
sshd: ALL :spawn echo "$(date +%%F) login attempt form %c to %s,%d" >>/var/log/sshd.log
```

## 8.3 测试工具tcpdmatch

```bash
tcpdmatch [-d] daemon[@host] client
```

**选项：**

* -d 测试当前目录下的hosts.allow和hosts.deny

**范例：**

```bash
[10:30:21 root@centos7 ~]#vim /etc/hosts.allow
sshd: ALL :deny echo "$(date +%%F) login attempt form %c to %s,%d" >>/var/log/sshd.log
```

# 九、SELinux

国内基本大多数公司不使用SELinux，Centos安装之后默认会安装，ubunte没有

## 9.1   启用和禁用SELinux

**SELinux的状态：**

* enforcing：强制，每个受限的进程都必然受限
* permissive：允许，每个受限的进程违规操作不会被禁止，但会被记录于审计日志
* disabled：禁用

**相关命令：**

* getenforce: 获取selinux当前状态
* sestatus :查看selinux状态
* setenforce 0|1 0: 设置为permissive    1: 设置为enforcing

**配置文件:**

```bash
/boot/grub/grub.conf 在kernel行使用selinux=0禁用SELinux
/boot/grub2/grub.cfg 在linux16行使用selinux=0禁用SELinux
/etc/selinux/config 或 /etc/sysconfig/selinux 中 SELINUX=
{disabled|enforcing|permissive}
```

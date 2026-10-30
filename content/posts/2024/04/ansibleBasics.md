---
title: "Ansible基础"
date: 2024-04-26T10:43:36+08:00
draft: false
description: "梳理 Ansible 的配置、主机清单与常用模块，演示批量运维任务。"
cover: "https://b3logfile.com/bing/20180504.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["Ansible"]
tags: ["待分类"]
toc: true
---
# 一、ansible介绍

官方文档：https://docs.ansible.com/

Ansible是一个开源的自动化运维工具，基本可以实现自动化所有任务，他提供了丰富的模块以支持各种服务以及应用，他的特点如下：

- 无代理架构。
- 简单，通过YAML语法进行编写。
- 灵活性与扩展性。
- 幂等性和可预测性，当系统处于你的playbook描述状态时，ansible不会执行任何动作。

通常情况下ansible都用来管理Linux主机，他通过ssh连接其他主机进行操作。连接信息一般存放在主机清单配置文件中。

安装方法不介绍请查看官方文档：https://docs.ansible.com/ansible/latest/installation_guide/intro_installation.html

## 1.1 ansible配置

### 1.配置文件说明

默认情况下ansible通过ansible.cfg进行设置，正常情况下来说默认配置即可符合正常使用。在使用包方式安装时配置文件存放在`/etc/ansible/ansible.cfg`,其他方式安装时，可能并不会生成配置文件，所以需要自己进行配置初始化。

**配置初始化**

```bash
ansible-config init --disabled > ansible.cfg
```

**配置文件优先级**

在执行anible脚本时读取配置文件是存在优先级的具体如下：

1. ansible会检查环境变量`ANSIBLE_CONFIG`指向的配置文件
2. 检查当前目录下的`ansible.cfg`文件，如果存在。
3. 检查当前用户家目录`~/.ansible.cfg`文件，如果存在
4. 检查`/etc/ansible/ansbile.cfg`文件

Ansible 将处理上面的列表并使用找到的第一个文件，所有其他文件都将被忽略

**常用配置说明**

- defaults：基础配置
  
  - inventory：默认主机清单文件位置，默认/etc/ansible/hosts
  - forks：任务执行时并发数，默认5
  - remote_port：默认远程连接端口，默认neno
  - roles_path：默认存放role目录，可使用`:`隔开写多个，默认`/roles:/usr/share/ansible/roles:/etc/ansible/roles`
  - executable：默认执行命令的shell，默认/bin/sh，可改为/bin/bash
  - module_name：默认执行命令的模块，默认command，可改为shell
  - gathering：主机信息采集策略，默认implicit，在执行playbook时会采集远程主机数据
    - implicit：除非执行playbook时设置`gather_facts: False`否则每次都采集
    - explicit：playbook中如果不要求采集则不会采集
    - smart：在同一个主机多次执行任务时，不会重复采集
  - fact_caching：使用那个缓存插件，默认memory
    - memory：内存
    - jsonfile：json文件
  - fact_caching_timeout：缓存超时时间默认86400s
  - fact_caching_connection：缓存数据的路径，默认none
- privilege_escalation：提权相关配置
  
  - become：是否允许提权，默认false
  - become_method：权限升级的方法，默认sudo
  - become_user：提权到那个用户，默认root
  - become_ask_pass：在执行提权时是否需要输入密码，默认false

事例

```bash
[defaults]
inventory      = /etc/ansible/hosts
forks          = 5
remote_port    = 22
roles_path = /roles:/usr/share/ansible/roles:/etc/ansible/roles
gathering = smart
fact_caching_timeout = 600 
fact_caching = jsonfile
fact_caching_connection=/tmp

[privilege_escalation]
become=True
become_method=sudo 
become_user=root
become_ask_pass=False
```

**配置变量**

- ANSIBLE_HOST_KEY_CHECKING: 连接远程主机检查主机密钥，设置为false不检查

## 1.2 主机清单

inventory文件遵循INI文件风格，中括号中的字符为组名。可以将同一个主机同时归并到多个不同的组中此外，当如若目标主机使用了非默认的SSH端口，还可以在主机名称之后使用冒号加端口号来标明如果主机名称遵循相似的命名模式，还可以使用列表的方式标识各主机。

```ini
192.168.10.1
[demo1]
192.168.10.2
```

括号中的标题是组名称，主要用于主机分类，即使你在主机清单中没有定义任何组，Ansible也会创建2个默认组`all`和`ungrouped`。`all`组会包含主机清单中任何主机，`ungrouped`组包含没有进行分组的主机。你可以将一个主机放置在多个组中。

### 1.在主机清单添加主机范围

```ini
192.168.10.1
[demo1]
192.168.10.2
[demo2]
192.168.10.[3:10] 
[demo3]
192.168.10.[11:15:2]
```

- [3:10]：会序列增加表示3到10
- [11:15:2]：步长增长2表示步数，表示11,13,15

### 2.在主机中指定变量

在每个主机可自行定义每个主机的变量定义后这个变量只属于这个主机不会影响其他主机，ansible在主机清单中内置了一些变量通常以ansible前缀命名。

```ini
192.168.10.1 demo=1
[demo1]
192.168.10.2 demo=2
[demo2]
192.168.10.[3:10] demo=3
[demo3]
192.168.10.[11:15:2] demo=4 ansible_user=demo

[all:vars]
ansible_connection=ssh
ansible_port=22
ansible_user=wang
ansible_password=123456
ansible_sudo_pass=123456
```

内置主机变量：

- ansible_host：远程连接的主机
- ansible_connection：远程连接方式linux一般都为ssh
- ansible_port：连接的端口ssh一般为22，如果没有变动可以不配置
- ansible_user：远程连接用户
- ansible_password：远程连接用户密码
- ansible_become_method：提权的方法一般为sudo
- ansible_become_user：sudo目标用户，一般为root
- ansible_become_password：远程执行sudo的密码

组变量写法为`[组名称:vars]`,这中情况下定义的变量会应用在这个组的所有主机，如果主机配置了这个组变量相同名称的变量，不会进行覆盖会以主机定义的变量为主。

组变量`[all:vars]`优先级是最低的，例如`[a:vars]`中定义的变量是要比所有组变量优先级高。

- [all:vars]：会应用于所有主机

### 3.主机清单验证

主机清单测试可使用`ansible-inventory`命令进行验证

相关参数说明

- --list：清单中所有主机信息以及分组信息
- -i：指定清单文件，否则使用配置文件中的主机清单文件
- --host：只查看指定主机
- --graph：按照组查看主机

```bash
#查看某个主机信息
ansible-inventory  --host 192.168.10.1
#按照组查看主机
ansible-inventory  --graph
ansible-inventory  --graph pve
#查看主机清单所有信息
ansible-inventory  --list
```

# 二、ansible命令行工具

ansible中有多个客户端工具主要包括：

- ansible：临时执行ansible模块的命令
- ansible-config：主要用于初始化生成配置文件，上面介绍了不介绍
- ansible-doc：用于查看模块信息的命令

```bash
#查看所有模块
ansible-doc -l
#查看某个模块的使用文档
ansible-doc copy
```

- ansible-inventory：验证测试主机清单的命令，上面介绍了不介绍
- ansible-playbook：运行playbook的命令，这里不介绍在playbook节章介绍
- ansible-galaxy：用于管理role以及合集的命令
- ansible-pull：从官方存储库拉取playbook命令
- ansible-vault：数据文件加密解密程序

## 2.1 ansible

主要针对运行单个任务时使用具体命令如下：

```bash
ansible [主机清单组名称] -i [主机清单文件] -m [模块名称] -a [模块参数]  [其他命令参数]
```

常用参数，以下参数需要才使用

- --become：提权方式运行
- -vvv：开启debug日志
- --user：远程连接用户
- --forks：并行数
- -e：指定变量，可以单独指定变量，也可以指定变量文件，可以同时存在多个
  - 指定变量文件，文件必须为yaml格式，`-e="@env.yml"`
  - 直接指定变量`-e="name=aaaa"`
- --connection：连接方式
- --timeout：超时时间

```bash
#运行示例，由于ping模块没有任何参数所以没有-a参数
ansible all -m ping
```

## 2.2 ansible-vault

可以加密ansible相关文件，可以加密主机清单。playbook文件

1. 创建加密文件：
   
   ```
   ansible-vault create encrypted_file.yml
   ```
2. 编辑加密文件：
   
   ```
   ansible-vault edit encrypted_file.yml
   ```
3. 查看加密文件：
   
   ```
   ansible-vault view encrypted_file.yml
   ```
4. 加密现有文件：
   
   ```
   ansible-vault encrypt existing_file.yml
   ```
5. 解密文件：
   
   ```
   ansible-vault decrypt encrypted_file.yml
   ```
6. 重新加密文件：
   
   ```
   ansible-vault rekey encrypted_file.yml
   ```
7. 修改加密文件密码：
   
   ```
   ansible-vault rekey encrypted_file.yml
   ```

在使用加密文件执行ansible相关命令需要添加`--ask-vault-pass`参数，在确认后需要输入加密文件的密码。

```bash
ansible all -i encrypted_file.yml -m ping

ansible-playbook -i encrypted_file.yml 1.yaml  --ask-vault-password
```

# 三、ansible变量

ansible中变量是一个非常重要的知识，变量分为多种类型变量，且变量的来源方式决定了他们的优先级

## 3.1 变量的定义

变量可以在如下情况下定义：

- 变量文件
- 主机清单
- playbook
- role
- 系统发现setup模块获取

变量名称只能包含字母，数字和下划线。Python和playbook的关键字不能是变量名称，变量不能以数字开头。

### 1.变量的类型

注意使用`''`或`""`的值都属于字符串变量即使定义`"true"`也属于字符串。

这里主要用配置文件说明：

```yaml
#简单变量
name1: zhangzhuo
#列表变量
list:
  - ceshi1
  - ceshi2
  - ceshi3
#字典变量
foo:
  name1: ceshi1
  name2: ceshi2
  name3: ceshi3
#布尔值变量
a: true
#复杂变量列表字典
foo_list:
  - name1: ceshi1
    name2: ceshi2
  - name1: ceshi1
    name2: ceshi2
    
---
#playbook文件使用变量
- name: dome
  hosts: localhost
  vars_files:
    - env.yml
  tasks:
    - name: echo
      debug:
        msg: "{{ name1 }}"
    - name: echo
      debug:
        msg: "{{ list }}"
    - name: echo
      debug:
        msg: "{{ foo }}"
    - name: echo
      debug:
        msg: "{{ a }}"
    - name: echo
      debug:
        msg: "{{ foo_list }}"
```

### 2.注册变量

您可以使用`register`从task返回信息注册变量，在后续任务中进行使用。注册变量存储在内存中。您无法缓存已注册的变量以供将来的 playbook 运行使用。注册变量是主机级变量仅在主机上对当前 playbook 运行的其余部分有效，包括同一playbook运行中的后续播放

```yaml
- name: dome
  hosts: pve
  vars_files:
    - env.yml
  tasks:
    - name: os
      shell: "cat /etc/os-release | grep ^NAME="
      register: OS
    - name: echo
      debug:
        msg: "{{ OS }}"
```

OS变量中是一个字典包含多个字段常用字段含义如下：

- changed：表示注册变量的任务是否改变主机
- cmd：执行的命令
- stdout：正确输出
- stderr：错误输出
- rc：命令执行后的状态码，成功是0

### 3.使用采集主机信息变量

默认情况下playbook都会使用setup采集远程主机信息，除非指定了不采集参数`gather_facts`。调用这些变量使用`ansible_facts`他是一个字典数据里面包含了很多系统信息字段如网络、主机名称、系统信息等。

常用字段如下

- distribution：linux系统发行版本如Centos,Ubuntu,Debian等
- distribution_major_version：系统大版本信息
- distribution_version：系统完整版本信息
- all_ipv4_addresses：主机所有ipv4地址信息，是一个列表
- architecture：系统架构如x86_64
- uptime_seconds：系统运行时长秒
- hostname：主机名称
- 内存相关
  - memtotal_mb：物理内存大小
  - memfree_mb：空闲大小
- kernel：内核信息

```yaml
- name: dome
  hosts: pve
  tasks:
    - name: echo
      debug:
        msg: "{{ ansible_facts.distribution }}"
    - name: echo
      debug:
        msg: "{{ ansible_facts.kernel }}"
```

### 4.主机信息缓存变量

与注册变量不通，您可以配置访问其他主机的变量信息，可以实现跨主机传递变量。

```yaml
- name: dome
  hosts: pve
  tasks:
    - name: setup
      setup:
    - name: echo
      debug:
        msg: "{{ hostvars['10.220.8.37'].ansible_facts.all_ipv4_addresses[0] }}
```

### 5.其他的一些特殊变量

- groups：主机清单中的组信息是一个列表，会包括组内主机信息
- group_names：当前主机的组名称
- inventory_hostname：清单中配置的主机名称

```bash
#获取主机清单dome1组所有主机名称
{{ groups['dome1'] }}
#获取当前执行任务主机在主机清单的分组
{{ group_names }}
#获取当前主机名称
{{ inventory_hostname }}
```

### 6.变量嵌套

在一个变量中调用另一个变量的方法

```yaml
- name: dome
  hosts: pve
  vars:
    nodename: 10.220.8.37
  tasks:
    - name: setup
      setup:
    - name: echo
      debug:
        msg: "{{ hostvars[nodename].inventory_hostname }}"
```

### 7.变量默认值

```yaml
- name: dome
  hosts: pve
  tasks:
    - name: echo
      debug:
        msg: "{{ aaa | default('aaa') }}"
```

## 3.2 变量优先级

1. extra vars (在命令行中使用 -e)优先级最高
2. 然后是在inventory中定义的连接变量(比如ansible_ssh_user)
3. 接着是大多数的其它变量(命令行转换,play中的变量,included的变量,role中的变量等)
4. 然后是在主机清单中定义的其它变量
5. 然后是由系统发现的facts
6. 然后是 "role默认变量", 这个是最默认的值,很容易丧失优先权

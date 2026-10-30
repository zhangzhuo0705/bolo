---
title: "Ansible剧本详解"
date: 2024-04-26T10:44:38+08:00
draft: false
description: "讲解 Ansible Playbook 的语法与任务编排，演示变量、模板和角色使用。"
cover: "https://b3logfile.com/bing/20221207.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["Ansible"]
tags: ["待分类"]
toc: true
---
# 一、Playbook基础知识

## 1.1 playbook介绍

![image-20210706172945049](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210706172945049.png)

- playbook 剧本是由一个或多个"play"组成的列表
- play的主要功能在于将预定义的一组主机，装扮成事先通过ansible中的task定义好的角色。Task 实际是调用ansible的一个module，将多个play组织在一个playbook中，即可以让它们联合起来，按事先编排的机制执行预定义的动作
- Playbook 文件是采用YAML语言编写的

官方文档：https://docs.ansible.com/ansible/latest/playbook_guide/index.html

### 1.关键字

playbook中有一些关键字，在配置文件中的配置选项也有相同含义的配置参数，他们是存在优先级的，具体如下

1. 变量
2. playbook关键字
3. 命令行选项
4. 配置设置

## 1.2 playbook语法

playbook的配置文件为YAML格式。

```yaml
- name: ping
  hosts: localhost
  tasks:
    - name: ping
      ping:

- name: file
  hosts: 
  - demo1
  - demo2
  tasks:
    - name: create file
      file: path=/root/file state=touch
```

可以在一个文件中写入多个playbook剧本使用不同的命名

### 1.playbook关键字

- name：playbook任务名称
- hosts：执行的组名称，可以使用列表方式写多个，如果写localhost表示在本机执行无需密码
- become：是否提权执行任务
- become_method：提权的工具sudo或su
- become_user：提权目标用户
- ignore_errors：当前playbook任务如果失败可以忽略失败
- remote_user：改变远程连接的用户
- tasks：在playbook中定义执行任务列表
- import_tasks：导入其他tasks任务文件
- vars：定义变量列表方式可定义多个
- vars_files：定义变量文件，列表方式可定义多个
- gather_facts：是否运行主机信息采集
- serial：并行处理多少个主机任务，可以填具体数值也可以写百分比
- block：创建任务的逻辑分组，分组中可以写多个task任务统一管理，并且进行错误处理等

## 1.3 tasks

表示执行任务的列表，写法列表方式，可以调用ansible的模块执行任务，可以在playbook、role\tasks、block中编写。

关键字

- ignore_errors：错误忽略
- become：是否提权执行任务
- become_method：提权的工具sudo或su
- become_user：提权目标用户
- timeout:超时时间
- when：条件测试，符合条件时执行任务
- loop：可以用来循环列表变量多次调用任务执行
- name：任务名称
- register：任务执行成功返回信息注册为变量
- until：重试循环，如果不满足这里的条件将一直循环
  - delay：延迟多少秒重新执行判断
  - retries：重试多少次取消
- async：异步执行设置超时时间
  - 需要配合register与async_status模块使用
- failed_when：满足条件使任务失败
- changed_when：设置任务执行完成后状态为没有更改，在任务确定没有更改远程主机时使用，有幂等性的模块不要使用会自己判断，主要给没有幂等性的模块使用如shell
- delegate_to：改变要执行任务的主机为其他主机而不是远程连接主机，如果在本地执行设置localhost
- run_once：使任务只在第一个主机运行，且把运行结果同步到所有主机，一般在与delegate_to一起使用使任务只在指定的主机运行

### 1.设置提权用户示例

```yaml
#这里表示在执行whoami时进行提权提权的目标用户为zhangzhuo
---
- name: ping
  hosts: localhost
  tasks:
    - name: whoami
      shell: "whoami"
      register: user
  	  become: true
      become_user: zhangzhuo
    - name: debug
      debug:
        msg: "{{ user }}"
```

### 2.控制任务运行的位置

有些模块是无法进行委派到别的节点（包括`include`、`add_host`和`debug`）。

```yaml
#在执行这个任务后会报错，因为创建文件只在localhost上面进行了执行，第二个任务在pve组的主机中查看肯定会报错提示没有这个文件
---
- name: dome
  hosts:
    - pve
  tasks:
    - name: create file
      file:
        path: a.txt
        state: touch
      delegate_to: localhost
      run_once: true
    - name: get file
      shell: "ls a.txt"
```

### 3.错误处理

**忽略失败的命令**

默认情况下，当主机上的任务失败时，Ansible 会停止在该主机上执行任务。`ignore_errors`参数可以忽略失败继续运行任务。该参数只有在命令返回失败时才有效，不会处理未定义变量错误、连接失败、语法错误等。

```yaml
- name: 错误处理
  hosts: localhost
  tasks:
    - name: 命令错误
      shell: "/bin/false"
      ignore_errors: true
```

**忽略无法访问主机错误**

```yaml
- name: 错误处理
  hosts: demo3
  gather_facts: false
  tasks:
    - name: 命令错误
      shell: "/bin/false"
      ignore_unreachable: true
```

## 1.4 模板templates

Ansible使用Jinja2模板来表示动态表达式以及对变量的使用，你可以配合template模块一起使用动态的生成配置文件。模板中可以使用所有的Jinja2语法。这里暂时不介绍Jinja2语法。下面说明模板文件如何在anible中使用

```bash
#创建模板文件test.j2,Jinja2文件最好以j2格式结尾
{{ ceshi }}
#创建playbook，可在task中使用template模块调用j2文件并渲染
- name: dome
  hosts: localhost
  vars:
    ceshi:
      - a
      - b
      - c
  tasks:
    - name: template
      template:
        src: test.j2
        dest: test
#执行后生成的test文件内容为
['a', 'b', 'c']
```

# 二、task循环

Ansible提供`pool`、`with_<lookup>`和`until`等关键字来多次执行任务。通常用来处理更改多个文件权限，创建多个用户等重复性操作。`loop`与`with_<lookup>`功能基本一致。

## 2.1 标准循环

循环的对象必须是一个列表，可以在任务中自己定义或使用变量获取。

```yaml
---
#直接在任务定义列表数据
- name: dome
  hosts: localhost
  tasks:
    - name: createfile
      file:
        path: "{{ item }}"
        state: touch
      loop:
        - 1.txt
        - 2.txt
        - 3.txt
---
#使用变量，他与上面的结果是一致的
- name: dome
  hosts: localhost
  vars:
    file_name:
      - 1.txt
      - 2.txt
      - 3.txt
  tasks:
    - name: createfile
      file:
        path: "{{ item }}"
        state: touch
      loop: "{{ file_name }}"
```

## 2.2 循环哈希列表

如果列表中每项都是一个字典，可以在循环中指定子项名称使用。

```yaml
---
#直接定义
- name: dome
  hosts: localhost
  tasks:
    - name: createfile
      file:
        path: "{{ item.name }}"
        mode: "{{ item.mode }}"
        state: touch
      loop:
        - { name: '1.txt', mode: '700' }
        - { name: '2.txt', mode: '770' }
        - { name: '3.txt', mode: '777' }
---
#变量定义
- name: dome
  hosts: localhost
  vars:
    file_name:
    - name: 1.txt
      mode: 700
    - name: 2.txt
      mode: 770
    - name: 3.txt
      mode: 777
  tasks:
    - name: createfile
      file:
        path: "{{ item.name }}"
        mode: "{{ item.mode }}"
        state: touch
      loop: "{{ file_name }}"
```

## 2.3 循环字典

循环字典需要使用`dict2items `

```yaml
---
#需要使用变量因为需要使用过滤器
- name: dome
  hosts: localhost
  vars:
    file_name:
      a: 700
      b: 770
      c: 777
  tasks:
    - name: create file
      file:
        path: "{{ item.key }}.txt"
        mode: "{{ item.value }}"
        state: touch
      loop: "{{ file_name | dict2items }}"
```

## 2.4 使用循环注册变量

```yaml
- name: dome
  hosts:
    - localhost
  tasks:
    - name: env register
      shell: "echo {{  item }}"
      loop:
        - name1
        - name2
        - name3
      register: echo
    - name: debug
      debug:
        msg: "{{ echo.results }}"
```

当您使用`register`循环时，放置在变量中的数据结构将包含一个`results`属性，该属性是来自模块的所有响应的列表。这与`register`不使用循环时返回的数据结构不同。

## 2.5 重试任务只到满足条件停止

您可以使用`until`关键字重试任务，直到满足特定条件。这是一个例子

```yaml
#判断cron服务运行状态是否为active，重试3次延迟10秒
---
- name: ping
  hosts: localhost
  tasks:
    - name: until
      shell: "systemctl is-active cron.service"
      register: status
      until: status.stdout == "active"
      retries: 3
      delay: 10
```

异步执行task中的某个任务，后使用until等待异步任务完成

```yaml
#异步在远程创建一个1G大小的文件之后监视这个异步任务的执行状态等待完成
---
- name: ping
  hosts: localhost
  tasks:
    - name: until
      shell: "dd if=/dev/zero of=1.sh bs=1024 count=1M"
      register: status
      retries: 3
      delay: 10
      async: 3000
      poll: 0
    - name: async_status
      async_status:
        jid: "{{ status.ansible_job_id }}"
      register: job_result
      until: job_result.finished
      retries: 60  # 尝试检查状态的次数
      delay: 10   # 每次检查状态的间隔时间（秒）
```

## 2.6 循环主机清单某个组的主机列表

```yaml
- name: dome
  hosts:
    - localhost
  tasks:
    - name: debug
      debug:
        msg: "{{ item }}"
      loop: "{{  groups['pve'] }}"
```

## 2.7 loop循环的选项

**限制控制台输出**

当循环复杂的数据结构时，任务的控制台输出可能会很大。要限制显示的输出，请使用`loop_control.`label。

```bash
- name: dome
  hosts:
    - localhost
  tasks:
    - name: debug
      debug:
        msg: "{{ item.name }}"
      loop:
        - name: server1
          disks: 3gb
          ram: 15Gb
          network:
            nic01: 100Gb
            nic02: 10Gb
        - name: server2
          disks: 3gb
          ram: 15Gb
          network:
            nic01: 100Gb
            nic02: 10Gb
      loop_control:
        label: "{{ item.name }}"
```

**循环内暂停**

要控制任务循环中每个项目的执行间隔时间（以秒为单位），请使用指令`loop_control.pause`。

```yaml
- name: dome
  hosts:
    - localhost
  tasks:
    - name: debug
      debug:
        msg: "{{ item.name }}"
      loop:
        - name: server1
          disks: 3gb
          ram: 15Gb
          network:
            nic01: 100Gb
            nic02: 10Gb
        - name: server2
          disks: 3gb
          ram: 15Gb
          network:
            nic01: 100Gb
            nic02: 10Gb
      loop_control:
        label: "{{ item.name }}"
        pause: 3
```

# 三、when条件语句

在task中如果要控制此任务是否执行可以使用when字段，when中是完全兼容Jinja2语法的包括方法以及语法，只要是最后返回的是一个布尔值即可。true为执行false为不执行。when可以作用在很多地方。

```yaml
- name: dome
  hosts: localhost
  vars:
    name: dome
    demo: true
  tasks:
    - name: 在特定组执行任务
      debug:
        msg: "pve"
      when: "inventory_hostname in groups['pve']"
    - name: 判断一个值是否相等
      debug:
        msg: "var name = dome"
      when: name == 'dome'
    - name: 布尔值判断
      debug:
        msg: "dome = false"
      when: ! demo
```

## 3.1 变量判断

注意所有`''`与`""`都表示字符串即使是数值值。

- `==`：等于
- `!=`：不等于
- `in`: 不包含在某个列表中
- `not in`：不包含在某个列表中
- `is not defined`：变量没有定义
- `is defined`：变量已经定义

```yaml
- name: 条件测试
  hosts: localhost
  vars:
    test: "1"
  tasks:
    - name: 判断等于
      debug:
        msg: "test == 1"
      when: test == 1
    - name: 判断不等于
      debug:
        msg: "a != init"
      when: test != '2'
    - name: 判断test变量是否是1,2,3,10其中的一个值
      debug:
        msg: "{{ test }}"
      when: test in ["1","2","3","10"]
    - name: 判断变量不是为1,2,3中一个值
      debug:
        msg: "{{ test }}"
      when: test not in ["1","2","3"]
    - name: 判断变量是否没定义
      debug:
        msg: "{{ test }}"
      when: test is not defined
    - name: 判断变量已经定义
      debug:
        msg: "{{ test }}"
      when: test is defined
```

## 3.2 多个条件组合

- and：与关系，全部符合才算true
- or：或关系，只要有一个符合就算true
- ()：可组合多个条件，把多个条件看成一个整体

```yaml
- name: 条件测试
  hosts: localhost
  tasks:
    - name: 条件组合
      debug:
        msg: "{{ inventory_hostname }} is Centos7 or Debian7"
      when: (ansible_facts['distribution'] == "CentOS" and ansible_facts['distribution_major_version'] == "6") or
            (ansible_facts['distribution'] == "Debian" and ansible_facts['distribution_major_version'] == "7")
#多个条件都为and关系时，可以直接使用列表
    - name: 条件组合
      debug:
        msg: "{{ inventory_hostname }} is Ubuntu22"
      when:
        - ansible_facts['distribution'] == "Ubuntu"
        - ansible_facts['distribution_major_version'] == "22"
```

## 3.3 判断任务执行状态

如果需要对前面的任务进行执行状态判断可使用此方法，判断任务状态需要在要判断的任务添加注册变量。

- `is failed`：任务状态执行失败。
- `is succeeded`：任务执行成功。
- `is skipped`：任务执行跳过，在跳过状态下也会是成功状态。

```yaml
- name: 条件测试
  hosts: localhost
  tasks:
    - name: 要判断的任务
      shell: "{{ cmd_shell }}"
      register: result
      ignore_errors: True
      when: cmd_shell in ['/bin/true','/bin/false']
    - name: 任务执行失败
      debug:
        msg: "{{ result }}"
      when: result is failed
    - name: 任务执行成功
      debug:
        msg: "{{ result }}"
      when: result is succeeded
    - name: 任务执行跳过
      debug:
        msg: "{{ result }}"
      when: result is skipped
```

## 3.4 布尔值判断

如果一个布尔值被定义为字符串，可以使用修饰符进行转换`| bool`

- `[var] | bool`：真
- `not [var] | bool`：假

```yaml
- name: 条件测试
  hosts: localhost
  vars:
    test: "True"
  tasks:
    - name: true
      debug:
        msg: "真"
      when: test | bool
    - name: false
      debug:
        msg: "假"
      when: not test | bool
```

## 3.5 failed_when

满足给定的条件时，使任务失败

```yaml
- name: 条件测试
  hosts: localhost
  vars:
    test: "True"
  tasks:
    - name: 测试
      shell: "echo 2"
      failed_when: test | bool
```

## 3.6 changed_when

如果说一个命令没有更改任何事物，就可以为其设置为没有更改状态

```yaml
- name: 条件测试
  hosts: localhost
  vars:
    test: "True"
  tasks:
    - name: 测试
      shell: "echo 2"
      changed_when: false
```

## 3.7 调试条件

当when语句不符合你的预期时可以使用`debug`模块进行调试。

```yaml
- name: 条件测试
  hosts: localhost
  vars:
    test:
      - 1
      - 2
      - 3
      - 4
      - 5
  tasks:
    - name: 打印变量
      debug:
        var: test
    - name: 查看语句结果
      debug:
        var: test[0] == 2
```

# 四、Blocks

可以使用block关键字创建任务的逻辑组，组中的任务会继承块级别的指令例如提权、条件判断（循环除外）等，块还提供了类似于编程语言中的异常处理。

## 4.1 任务分组

```yaml
- name: Blocks块
  hosts: localhost
  tasks:
    - name: 块1
      block:
        - name: 任务
          debug:
            msg: "任务1-1开始"
        - name: 任务
          debug:
            msg: "任务1-2开始"
      become: true
      ignore_errors: true
      when: ansible_facts['distribution'] == 'Ubuntu'
    - name: 块2
      block:
        - name: 获取用户名称
          shell: "whoami"
          register: user
        - name: 输出用户名称
          debug:
            var: user.stdout
      ignore_errors: true
      become: true
      become_user: root
```

## 4.2 错误处理

你可以使用`rescue`关键字在block块中的任务执行失败后进行错误处理。如果错误处理完成且错误处理中的任务没有报错则会继续执行其他任务。

```yaml
- name: 错误处理
  hosts: localhost
  tasks:
    - name: 错误处理
      block:
        - name: 创建文件
          file:
            path: test.txt
            state: touch
        - name: 失败任务
          shell: "/bin/false"
      rescue:
        - name: 错误处理
          file:
            path: test.txt
            state: absent
        - name: 错误处理
          debug:
            msg: "错误处理完成"
    - name:
      debug:
        msg: "任务"
```

`always`无论前一个块的任务状态是什么，该部分中的任务都会运行。如果存在错误处理会先处理错误。

```yaml
- name: 错误处理
  hosts: localhost
  tasks:
    - name: 错误处理
      block:
        - name: 创建文件
          file:
            path: test.txt
            state: touch
        - name: 失败任务
          shell: "/bin/false"
      rescue:
        - name: 错误处理
          file:
            path: test.txt
            state: absent
        - name: 错误处理
          debug:
            msg: "错误处理完成"
        - name: 失败任务
          shell: "/bin/false"
      always:
        - name: 输出
          debug:
            msg: "块执行完成"
    - name:
      debug:
        msg: "任务"
```

块中任务执行失败提供了几个变量，具体含义如下

- `ansible_failed_task`：失败任务的描述，`ansible_failed_task.name`可获取任务名称
- `ansible_failed_result`：失败任务的结果

```yaml
- name: 错误处理
  hosts: localhost
  tasks:
    - name: 错误处理
      block:
        - name: 创建文件
          file:
            path: test.txt
            state: touch
        - name: 失败任务1
          shell: "/bin/false"
      rescue:
        - name: 变量输出1
          debug:
            var: ansible_failed_task
        - name: 变量输出2
          debug:
            var: ansible_failed_result
        - name: 错误处理
          file:
            path: test.txt
            state: absent
          when: ansible_failed_task.name == "失败任务1" and ansible_failed_result.cmd == "/bin/false"
        - name: 错误处理
          debug:
            msg: "错误处理完成"
        - name: 错误处理失败任务
          shell: "/bin/false"
```

# 五、重用Ansible组件

在大型playbook中会有许多的任务是重复性的，ansible提供了重用他们的方法。可重用的文件如下

- var变量文件，只能包含变量
- task任务文件，只能包含任务
- playbook剧本任务，只能静态重用
- 角色任务

Ansible 提供了两种在 playbook 中重用文件和角色的方法：动态和静态

- `include_*`动态
  - 角色
  - 任务
  - 变量
- `import_*`静态
  - 角色
  - 任务
  - 剧本

他们的区别如下

- 静态调用是无法使用loop进行循环的，但是动态可以。

## 5.1 重用playbook

```yaml
- import_playbook: playbook.yml

- import_playbook: playbook.yml
  vars:
    a: b
```

注意：重用playbook必须写在单独的一个文件且只能存在重用playbook字段。

## 5.2 动态导入任务使用循环与判断

```yaml
- name: 交互输入
  hosts: localhost
  vars:
    file_name:
      - 1
      - 2
      - 3
      - 4
      - 5
  tasks:
    - name: 创建文件
      include_tasks: file.yml
      loop: "{{ file_name }}"
      when: item < 5
#file.yml
- name: 提示
  debug:
    msg: "创建文件: {{ item }}.txt"

- name: 创建文件
  file:
    path: "{{ item }}.txt"
    state: file
```

# 六、其他

## 6.1 针对变更运行操作

有时你希望在计算机上发生变化时，运行某个任务可以使用此方法`notify`,`handlers`。

```yaml
- name: 针对变更运行操作
  hosts: localhost
  tasks:
    - name: 创建文件    #这个任务产生变更调用更新操作任务
      file:
        path: 1.txt
        state: file
      notify:
        - "更新操作"
    - name:
      debug:
        msg: "其他任务"
  handlers:
    - name: 更新操作
      debug:
        msg: "文件进行了变更"
```

### 1.重新命名处理程序

处理任务中可定义`listen`关键字，可对多个任务命名相同的名称进行分组同时调用。

```yaml
- name: 针对变更运行操作
  hosts: localhost
  tasks:
    - name: 创建文件
      file:
        path: 1.txt
        state: touch
      notify:
        - "update"
    - name:
      debug:
        msg: "其他任务1"
    - name:
      debug:
        msg: "其他任务2"
    - name:
      debug:
        msg: "其他任务3"
  handlers:
    - name: 更新操作1
      debug:
        msg: "文件进行了变更"
      listen: "update"
    - name: 更新操作2
      debug:
        msg: "文件进行了变更"
      listen: "update"
```

### 2.控制处理程序何时运行

默认情况下，处理程序在所有任务执行完成后运行，如果你需要改变其运行位置请使用以下方法，

```yaml
- name: 针对变更运行操作
  hosts: localhost
  tasks:
    - name: 创建文件
      file:
        path: 1.txt
        state: touch
      notify:
        - "update"
    - name:
      debug:
        msg: "其他任务1"
    - name: 调用更新处理
      meta: flush_handlers
    - name:
      debug:
        msg: "其他任务2"
    - name:
      debug:
        msg: "其他任务3"
  handlers:
    - name: 更新操作1
      debug:
        msg: "文件进行了变更"
      listen: "update"
    - name: 更新操作2
      debug:
        msg: "文件进行了变更"
      listen: "update"
```

## 6.2 设置远程环境

你可以在playbook、 block或task中使用environment设置远程主机的环境变量

```yaml
- name: 设置远程环境
  hosts: localhost
  environment:
    aaa: 11
    abc: bbb
  tasks:
    - name: 输出系统变量
      shell: "echo ${abc} ${aaa}"
      register: echo
      environment:
        abc: aaa
    - name: 结果打印
      debug:
        msg: "{{ echo }}"
```

## 6.3 模块默认值

如果您经常使用某些模块且他们的参数大部分是一致的，则该方法`module_defaults`可能对您有用。它可以在剧本层面设置您的某一个模块参数的默认值，即使你在使用这个模块时没有指定这个参数，只要在默认值定义他就是生效的。

```yaml
- name: 模块默认值
  hosts: localhost
  become: yes
  module_defaults:
    file:
      owner: root
      group: root
      mode: 0777
  tasks:
    - name: 创建文件
      file:
        path: 1.txt
        state: file
    - name: 创建目录
      file:
        path: dir
        state: directory
```

## 6.4 交互输入

如果你希望Playbook提示用户进行某些输入，可以使用`vars_prompt`方法。

```yaml
- name: 交互输入
  hosts: localhost
  vars_prompt:
    - name: username
      prompt: "输入用户名称"
      private: false
      default: admin
    - name: password
      prompt: "输入用户密码"
  tasks:
    - name: 输出信息
      debug:
        msg: "用户名称是: {{ username }}，密码是: {{ password }}"
```

说明：

- prompt：提示
- private：是否在输入时用户不可见
- default：默认值
- 如果定义的变量在运行脚本时已经被定义则不会交互提示。如命令行指定、剧本vars指定。

# 七、role角色

角色是ansible自1.2版本引入的新特性，用于层次性、结构化地组织playbook。roles能够根据层次型结构自动装载变量文件、tasks以及handlers等。要使用roles只需要在playbook中使用include指令即可。简单来讲，roles就是通过分别将变量、文件、任务、模板及处理器放置于单独的目录中，并可以便捷地include它们的一种机制。角色一般用于基于主机构建服务的场景中，但也可以是用于构建守护进程等场景中

运维复杂的场景：建议使用 roles，代码复用度高

roles：多个角色的集合目录， 可以将多个的role，分别放至roles目录下的独立子目录中

roles目录结构如下所示：

![image-20210707203955861](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20210707203955861.png)

每个角色，以特定的层级目录结构进行组织

**Roles各目录作用**

roles/project/ :项目名称,有以下子目录

- files/ ：存放由copy或script模块等调用的文件
- templates/：template模块查找所需要模板文件的目录
- tasks/：定义task,role的基本元素，至少应该包含一个名为main.yml的文件；其它的文件需要在此文件中通过include进行包含
- handlers/：至少应该包含一个名为main.yml的文件；此目录下的其它的文件需要在此文件中通过include进行包含
- vars/：定义变量，至少应该包含一个名为main.yml的文件；此目录下的其它的变量文件需要在此文件中通过include进行包含
- meta/：定义当前角色的特殊设定及其依赖关系,至少应该包含一个名为main.yml的文件，其它文 件需在此文件中通过include进行包含
- default/：设定默认变量时使用此目录中的main.yml文件，比vars的优先级低。

```bash
#role目录结构
roles/     #role的归档目录
   mysql/  #具体的一个role，可以理解为role的名称
     files/  #role的静态文件位置，一般存放静态文件或者压缩包等
     templates/ #j2的模板文件位置
     tasks/     #task任务文件位置，必须存在一个main.yml主文件
     handlers/
     vars/      #变量文件存放位置,必须存在一个main.yml
     defaults/  #默认变量文件存放位置,必须存在一个main.yml
     meta/      #角色依赖，必须存在一个main.yml
```

说明：

- 一个role中必须存在的文件夹为task，其他的文件如果不使用可以不进行创建
- 所有copy tasks可以引用roles/x/files/中的文件，不需要指明文件的路径
- 所有script tasks可以引用 roles/x/files/ 中的脚本，不需要指明文件的路径
- 所有template tasks可以引用 roles/x/templates/ 中的文件，不需要指明文件的路径。
- 所有include tasks可以引用 roles/x/tasks/ 中的文件，不需要指明文件的路径。
- 如果 roles/x/meta/main.yml 存在, 其中列出的 “角色依赖” 将被添加到 roles 列表中
- 如果 roles/x/vars/main.yml 存在, 其中列出的 variables 将被添加到 play 中
- 如果 roles/x/tasks/main.yml 存在, 其中列出的 tasks 将被添加到 play 中

## 1.1 playbook调用角色

示例如下：

```bash
#方案1
- hosts: all         #执行此role的host
  roles:             #调用的role名称
    - mysql
    - nginx
#方案2
- hosts: all
  roles: #调用role时给role传递变量或配置条件
    - role: nginx
      vars:
        prot: "80"
      when: ansible_distribution_major_version == '7'
```

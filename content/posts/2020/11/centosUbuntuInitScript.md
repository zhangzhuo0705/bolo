---
title: "Centos与Ubuntu初始化shell脚本"
date: 2020-11-28T18:25:50+08:00
lastmod: 2023-03-09T15:11:36+08:00
draft: false
description: "提供 CentOS 与 Ubuntu 系统初始化脚本，涵盖软件源、防火墙、SELinux、主机名和常用工具配置。"
cover: "https://b3logfile.com/bing/20180507.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["Shell脚本"]
tags: ["shell"]
toc: true
---
```
#!/bin/bash
#
#********************************************************************
#Author:zhangzhuo
#QQ: 1191400158
#Date: 2020-12-18
#FileName：reset_Linux_OS_v4.sh
#URL: https://www.zhangzhuo.ltd
#Description：The test script
#Copyright (C): 2020 All rights reserved
#********************************************************************
Centos(){
centos_Version(){
Version=`grep -Eo "[0-9].[0-9]" /etc/redhat-release | tr '.' '%' | tr '\n' % |cut -d% -f 1`
#Version=`sed -nr 's/.* ([0-9])\..*/\1/p' /etc/redhat-release`
}
centos_PS1(){
grep PS1 ~/.bash_profile &>/dev/null
if [ $? = 1 ];then
    echo 'export PS1="\[\e[1;32m\][\[\e[0m\]\t \[\e[1;33m\]\u\[\e[36m\]@\h\[\e[1;31m\] \W\[\e[1;32m\]]\[\e[0m\]\\$"' >>~/.bash_profile
    echo -e "\033[1;31m1)提示符配置已经完成请使用su -命令进行生效\033[0m"
else
        echo -e "\033[1;31m1)提示符已经配置无需重新配置\033[0m"
fi 
}
centos_hostname(){
centos_Version
num=0
while [ $num -ne 1 -a $num -ne 2 ];do
read -p "您是否要自己设置主机名？(1是2否):" num
if [ $num = 1 ];then
    read -p "请输入主机名: " hostname
    case  ${Version} in
    8|7)
        hostnamectl set-hostname $hostname
        echo -e "\033[1;31m2)主机名设置完成\033[0m,\033[1;32m请使用su -命令进行生效\033[0m"
        ;;  
    6)
        sed  -i "/H/s@\(^H.*=\).*$@\1${hostname}"  /etc/sysconfig/network
        echo -e "\033[1;31m2)主机名设置完成\033[0m,\033[1;32m请重新启动系统\033[0m"
        ;;  
    *)
        echo -e "\033[1;31m2,3)您的系统不是Centos6, 7, 8!!!\033[0m"
    esac
elif [ $num = 2 ];then    
    case  ${Version} in
    8|7)
        hostnamectl set-hostname centos8
        if [ $Version = 7 ];then
            hostnamectl set-hostname centos7
        fi
        echo -e "\033[1;31m2)主机名设置完成\033[0m,\033[1;32m请使用su -命令进行生效\033[0m"
        ;;  
    6)
        sed  -i '/H/s@\(^H.*=\).*$@\1centos6@'  /etc/sysconfig/network
        echo -e "\033[1;31m2)主机名设置完成\033[0m,\033[1;32m请重新启动系统\033[0m"
        ;;  
    *)
        echo -e "\033[1;31m2,3)您的系统不是Centos6, 7, 8!!!\033[0m"
    esac
else
    echo "选择错误请重新选择！！！"
fi
done
}
centos_firewalld(){
centos_Version
case  ${Version} in
8|7)
        systemctl stop firewalld
        systemctl disable firewalld &>/dev/null
        echo -e "\033[1;31m3)防火墙关闭完成\033[0m"
        ;;  
6)
        service iptables stop
        chkconfig iptables off 
        echo -e "\033[1;31m3)防火墙关闭完成\033[0m"
        ;;  
*)
        echo -e "\033[1;31m2,3)您的系统不是Centos6, 7, 8!!!\033[0m"
esac
}
centos_selinux(){
sed -i '/SELINUX=/s@\(^S.*=\).*$@\1disabled@' /etc/selinux/config
echo -e "\033[1;31m3)Selinux关闭完成，请重新启动系统\033[0m"
}
centos_yum(){
ping -c2  baidu.com >/dev/null
if [ $? = 0 ];then
    Version=`grep -Eo "[0-9].[0-9]" /etc/redhat-release | tr '.' '%' | tr '\n' % |cut -d% -f 1`
        if [ $Version = 8 ];then
            mkdir -p /etc/yum.repos.d/yum-Backup
            mv /etc/yum.repos.d/*.repo /etc/yum.repos.d/yum-Backup/ &>/dev/null
            curl -o /etc/yum.repos.d/CentOS-Base.repo https://mirrors.aliyun.com/repo/Centos-8.repo &>/dev/null
            echo -e "\033[1;31m4)阿里源设置完成\033[0m, \033[1;32m之前的配置文件存放在/etc/yum.repo.d/yum-Backup目录下\033[0m"
        elif [ $Version = 7 ];then
            mkdir -p /etc/yum.repos.d/yum-Backup
            mv /etc/yum.repos.d/*.repo /etc/yum.repos.d/yum-Backup/ &>/dev/null
            curl -o /etc/yum.repos.d/CentOS-Base.repo https://mirrors.aliyun.com/repo/Centos-7.repo &>/dev/null
            echo -e "\033[1;31m4)阿里源设置完成\033[0m, \033[1;32m之前的配置文件存放在/etc/yum.repo.d/yum-Backup目录下\033[0m"
        elif [ $Version = 6 ];then
            mkdir -p /etc/yum.repos.d/yum-Backup
            mv /etc/yum.repos.d/*.repo /etc/yum.repos.d/yum-Backup/ &>/dev/null
            curl -o /etc/yum.repos.d/CentOS-Base.repo https://mirrors.aliyun.com/repo/Centos-6.repo &>/dev/null
            echo -e "\033[1;31m4)阿里源设置完成\033[0m, \033[1;32m之前的配置文件存放在/etc/yum.repo.d/yum-Backup目录下\033[0m"
        fi
else
    echo -e "\033[1;31m4)YUM配置失败，请检查网络连接\033[0m"
fi
}
centos_yum_install(){
	yum install gcc make autoconf gcc-c++ glibc glibc-devel pcre pcre-devel openssl openssl-devel systemd-devel zlib-devel vim lrzsz tree tmux lsof tcpdump  net-tools  bc bzip2 zip unzip nfs-utils man-pages apr* redhat-rpm-config bash-completion bash-completion chrony wget epel-release -y
    sed -e 's!^metalink=!#metalink=!g' \
    -e 's!^#baseurl=!baseurl=!g' \
    -e 's!//download\.fedoraproject\.org/pub!//mirrors.tuna.tsinghua.edu.cn!g' \
    -e 's!http://mirrors\.tuna!https://mirrors.tuna!g' \
    -i /etc/yum.repos.d/epel.repo /etc/yum.repos.d/epel-testing.repo
echo -e "\033[1;31m5)常用软件安装完成\033[0m"
}

centos_vim(){
if [ -e /usr/bin/vim ];then
cat >~/.vimrc<<EOF        
    set ignorecase
    set cursorline
    set autoindent
    set number
    set paste
    set et
    set ts=4
    autocmd BufNewFile *.sh exec ":call SetTitle()"
    func SetTitle()
    if expand("%:e") == 'sh'
    call setline(1,"#!/bin/bash") 
    call setline(2,"#") 
    call setline(3,"#********************************************************************") 
    call setline(4,"#Author:zhangzhuo") 
    call setline(5,"#QQ: 1191400158") 
    call setline(6,"#Date: ".strftime("%Y-%m-%d"))
    call setline(7,"#FileName：".expand("%"))
    call setline(8,"#URL: https://www.zhangzhuo.ltd")
    call setline(9,"#Description：The test script") 
    call setline(10,"#Copyright (C): ".strftime("%Y")." All rights reserved")
    call setline(11,"#********************************************************************") 
    call setline(12,"set -ue")
    endif
    endfunc
    autocmd BufNewFile * normal G
EOF
    echo -e "\033[1;31m6)VIM配置完成\033[0m"
else
    echo -e "\033[1;34m6)警告:\033[0m\033[1;31m请先安装VIM软件\033[0m"
fi
}
centos_alias(){
cat <<EOF>>~/.bashrc
alias diskadd="echo '- - -' > /sys/class/scsi_host/host0/scan; echo '- - -' > /sys/class/scsi_host/host1/scan ; echo '- - -' > /sys/class/scsi_host/host2/scan"
alias df='df -h'
alias cdnet='cd /etc/sysconfig/network-scripts/'
alias free='free -h'
EOF
echo -e "\033[1;31m7)别名配置完成,\033[0m\033[1;32m 请使用source ~/.bashrc命令进行生\033[0m"  
}
centos_net_name(){
grep 'net.ifnames=0 biosdevname=0' /etc/default/grub &>/dev/null
if [ $? = 1 ];then
	sed -ri '/GRUB_CMDLINE_LINUX=/s#(")$# net.ifnames=0 biosdevname=0"#' /etc/default/grub
	grub2-mkconfig -o /boot/grub2/grub.cfg
	mv /etc/sysconfig/network-scripts/ifcfg-`ip a | grep -Eo "[0-9]:.*e.*:" | tr -d ' ' | cut -d: -f2` /etc/sysconfig/network-scripts/ifcfg-eth0
	sed -ri '/NAME=/s#(".*")$#"eth0"#' /etc/sysconfig/network-scripts/ifcfg-eth0
	sed -ri '/DEVICE=/s#(".*")$#"eth0"#' /etc/sysconfig/network-scripts/ifcfg-eth0
	echo -e '\e[1;31m网卡名已经修改完成,重启电脑生效！\e[0m'
else
	echo -e '\e[1;31m网卡名已经修改无需重新修改！\e[0m'
fi
}
centos_net_ip(){
while :;do
    read -p "请输入要设置的网卡名称: " NET_NAME
    { nmcli connection | grep -E "\b$NET_NAME\b" >/dev/null; } && break || echo "请重新输入正确且存在>的网卡名称！"
done 

while :;do
    read -p "请输入要修改的IP地址: " IP
    { echo $IP | grep -E "^(([1-9]?[0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\.){3}([1-9]?[0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])$">/dev/null; } && break || echo "请输入正确的IP地址！"
done

while :;do
    read -p "请输入子网掩码(0-32): " MASK
    [ $MASK -le 32 ] && break || echo "输入错误请重新输入！"
done 

while :;do
    read -p "请输入网关: " GATEWAY
    { echo $GATEWAY | grep -E "^(([1-9]?[0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\.){3}([1-9]?[0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])$">/dev/null; } && break || echo "请输入正确的网关！"
done
nmcli connection modify ${NET_NAME} ipv4.addresses ${IP}/${MASK} ipv4.gateway ${GATEWAY} ipv4.dns 114.114.114.114 && nmcli connection reload >/dev/null && nmcli connection up $NET_NAME >/dev/null && echo "网卡地址配置完成！" || echo "未知错误！请检查!" 
}
mail_set(){
yum install -y postfix mailx &>/dev/null || echo "安装邮箱服务失败,请检查YUM源或网络!"                    
if [ -a /etc/mail.rc ];then
    sed -i '$aset from=zz15049236211@163.com' /etc/mail.rc
    sed -i '$aset smtp=smtp.163.com' /etc/mail.rc
    sed -i '$aset smtp-auth-user=zz15049236211@163.com' /etc/mail.rc
    sed -i '$aset smtp-auth-password=RESVITPPKPFLZZMP' /etc/mail.rc
    systemctl restart postfix && echo "服务安装启动完成！" || echo "未知错误请检查！"
else
    echo "/etc/mail.rc配置文件不存在请检查！"
fi
}

centos_optimize(){
cat >/etc/security/limits.conf<<EOF

*       soft        core        unlimited
*       hard        core        unlimited
*       soft        nproc       1000000
*       hard        nproc       1000000
*       soft        nofile      1000000
*       hard        nofile      1000000
*       soft        memlock     32000
*       hard        memlock     32000
*       soft        msgqueue    8192000
EOF
echo -e "\033[1;31m资源限制优化完成,重启生效\033[0m"
cat >/etc/sysctl.conf<<EOF

#ontrols source route verification
net.ipv4.conf.default.rp_filter = 1
net.ipv4.ip_nonlocal_bind = 1
net.ipv4.ip_forward = 1

# Do not accept source routing
net.ipv4.conf.default.accept_source_route = 0

# Controls the System Request debugging functionality ofthe kernel
kernel.sysrq = 0

# Controls whether core dumps will append the PID to thecore filename.
# Useful for debugging multi-threaded applications.
kernel.core_uses_pid = 1

# Controls the use of TCP syncookies
net.ipv4.tcp_syncookies = 1

# Disable netfilter on bridges.
#net.bridge.bridge-nf-call-ip6tables = 0
#net.bridge.bridge-nf-call-iptables = 0
#net.bridge.bridge-nf-call-arptables = 0

# Controls the default maxmimum size of a mesage queue
kernel.msgmnb = 65536

# # Controls the maximum size of a message, in bytes
kernel.msgmax = 65536

# Controls the maximum shared segment size, in bytes
kernel.shmmax = 68719476736

# # Controls the maximum number of shared memory segments,in pages
kernel.shmall = 4294967296

# TCP kernel paramater
net.ipv4.tcp_mem = 786432 1048576 1572864
net.ipv4.tcp_rmem = 4096 87380 4194304
net.ipv4.tcp_wmem = 4096 16384 4194304
net.ipv4.tcp_window_scaling = 1
net.ipv4.tcp_sack = 1

# socket buffer
net.core.wmem_default = 8388608
net.core.rmem_default = 8388608
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.core.netdev_max_backlog = 262144
net.core.somaxconn = 20480
net.core.optmem_max = 81920

# TCP conn
net.ipv4.tcp_max_syn_backlog = 262144
net.ipv4.tcp_syn_retries = 3
net.ipv4.tcp_retries1 = 3
net.ipv4.tcp_retries2 = 15

# tcp conn reuse
net.ipv4.tcp_timestamps = 0
net.ipv4.tcp_tw_reuse = 0
#Linux 从4.12内核版本开始移除了 tcp_tw_recycle 配置
#net.ipv4.tcp_tw_recycle = 0
net.ipv4.tcp_fin_timeout = 1
net.ipv4.tcp_max_tw_buckets = 20000
net.ipv4.tcp_max_orphans = 3276800
net.ipv4.tcp_synack_retries = 1
net.ipv4.tcp_syncookies = 1

# keepalive conn      
net.ipv4.tcp_keepalive_time = 300
net.ipv4.tcp_keepalive_intvl = 30
net.ipv4.tcp_keepalive_probes = 3
net.ipv4.ip_local_port_range = 10001 65000
EOF
echo -e "\033[1;31m优化内核参数完成\033[0m"
}
PS3="请选择相应的编号(1-15):"
MENU=" 
Centos设置终端提示符
CentOS设置主机名
CentOS关闭防火墙 
CentOS关闭SLINUX
CentOS1-4全执行
CentOS设置YUN源(阿里源)
CentOS最小安装安装常用软件
Centos设置VIM
CentOS配置别名
CentOS重设网卡名称
CentOS设置网卡IP地址(如果执行完10请先重启在执行此项)
CentOS设置邮箱代理
CentOS系统优化(资源限制优化与内核参数优化)
重启系统
退出
"
select menu in $MENU;do
case $REPLY in
1)
    centos_PS1
    ;;
2)
   centos_hostname 
    ;;
3)
   centos_firewalld
    ;;
4)
   centos_selinux
    ;;
5)
   centos_PS1
   centos_hostname
   centos_firewalld
   centos_selinux
    ;;
6)
   centos_yum
    ;;
7)
   centos_yum_install
   ;;
8)
   centos_vim
    ;;
9)
   centos_alias
    ;;
10)
   centos_net_name
   ;;
11)
   centos_net_ip
   ;;
12)
   mail_set
   ;;
13)
   centos_optimize
   ;;
14)
    init 6
    ;;
15)
    break
    ;;
*)
    echo -e "\e[1;31m输入错误,请输入正确的数字(1-15)!\e[0m"
    ;;
esac
done
}
Ubuntu(){
ubuntu_version(){
VERSION=`sed -En '/^VERSION_ID=/s@.*"([0-9]+.[0-9]+)".*@\1@p' /etc/os-release`
}

ubuntu_PS1(){
grep PS1 ~/.profile &>/dev/null
if [ $? = 1 ];then
    echo 'export PS1="\[\e[1;32m\][\[\e[0m\]\t \[\e[1;33m\]\u\[\e[36m\]@\h\[\e[1;31m\] \W\[\e[1;32m\]]\[\e[0m\]\\$"' >>~/.profile
    echo -e "\033[1;31m终端提示符配置完成！\033[0m"
else
    echo -e "\033[1;31m终端提示符已经配置无需重新配置！\033[0m"
fi
}

ubuntu_hostname(){
ubuntu_version
num=0
while [ $num -ne 1 -a $num -ne 2 ];do
read -p "您是否要自己设置主机名？(1是2否):" num
if [ $num = 1 ];then
    read -p "请输入主机名: " hostname
    case  ${VERSION} in
    20.04|18.04)
        hostnamectl set-hostname $hostname
        echo -e "\033[1;31m主机名设置完成\033[0m,\033[1;32m请使用su -命令进行生效\033[0m"
        ;;  
    *)
        echo -e "\033[1;31m您的系统不是Ubuntu20.04 18.04!!!\033[0m"
    esac
elif [ $num = 2 ];then    
    case  ${VERSION} in
    20.04|18.04)
        hostnamectl set-hostname ubuntu20-04
        if [ $VERSION = 18.04 ];then
            hostnamectl set-hostname ubuntu18-04
        fi
        echo -e "\033[1;31m主机名设置完成\033[0m,\033[1;32m请使用su -命令进行生效\033[0m"
        ;;  
    *)
        echo -e "\033[1;31m您的系统不是Ubuntu20.04 18.04!!!\033[0m"
    esac
else
    echo "选择错误请重新选择！！！"
fi
done
}

ubuntu_root(){
read -p "请输入root密码:   " ROOTPASSWD
echo -e "${ROOTPASSWD}\n${ROOTPASSWD}" |sudo passwd root &>/dev/null
sed -Ei '/^#PermitRootLogin/s@^#(.*)\ .*@\1 yes@' /etc/ssh/sshd_config
systemctl restart sshd
echo -e '\e[1;31mroot密码已经设置完成，并且可以远程登录\e[0m'
}

ubuntu_apt(){
ping -c2 baidu.com &>/dev/null                                                                        
if [ $? = 0 ];then
    sed -Eni.bak '/^[^#]/s@(^.*\ )(.*)(/ubuntu.*)@\1http://mirrors.aliyun.com\3@p'  /etc/apt/sources.list 
    apt update
    echo -e '\e[1;31m阿里源设置完成! \e[0m'
else
    sed -Eni.bak '/^[^#]/s@(^.*\ )(.*)(/ubuntu.*)@\1http://mirrors.aliyun.com\3@p'  /etc/apt/sources.list
    echo -e "\033[1;31m阿里源设置完成，但是请检查你的网络连接！\033[0m"
fi
}

ubuntu_vim(){
if [ -e /usr/bin/vim ];then
    cat >~/.vimrc<<EOF        
    set ignorecase
    set cursorline
    set autoindent
    set number
    set paste
    set et
    set ts=4
    autocmd BufNewFile *.sh exec ":call SetTitle()"
    func SetTitle()
    if expand("%:e") == 'sh'
    call setline(1,"#!/bin/bash") 
    call setline(2,"#") 
    call setline(3,"#********************************************************************") 
    call setline(4,"#Author:zhangzhuo") 
    call setline(5,"#QQ: 1191400158") 
    call setline(6,"#Date: ".strftime("%Y-%m-%d"))
    call setline(7,"#FileName：".expand("%"))
    call setline(8,"#URL: https://www.zhangzhuo.ltd")
    call setline(9,"#Description：The test script") 
    call setline(10,"#Copyright (C): ".strftime("%Y")." All rights reserved")
    call setline(11,"#********************************************************************") 
    call setline(12,"set -ue")
    endif
    endfunc
    autocmd BufNewFile * normal G
EOF
    echo -e "\033[1;31mVIM配置完成\033[0m"
else
        echo -e "\033[1;34m警告：\033[0m\033[1;31请先安装VIM\033[0m"
fi
}

ubuntu_alias(){
cat <<EOF>>~/.bashrc
alias df='df -h'
alias free='free -h'
EOF
echo -e "\033[1;31m别名配置完成,请使用source ~/.bashrc生效\033[0m"
}

ubuntu_install(){
apt install iproute2 ntpdate tcpdump telnet traceroute nfs-kernel-server nfs-common lrzsz tree openssl libssl-dev libpcre3 libpcre3-dev zlib1g-dev gcc openssh-server iotop unzip zip libaprutil1-dev libapr1-dev
apt install make
apt install make-guile 
sed -ri 's/(APT::Periodic::Update-Package-Lists ")1(";)/\10\2/' /etc/apt/apt.conf.d/20auto-upgrades
sed -ri 's/(APT::Periodic::Unattended-Upgrade ")1(";)/\10\2/' /etc/apt/apt.conf.d/20auto-upgrades
echo -e "\033[1;31m常用软件安装完成,自动更新已经关闭\033[0m"
}

ubuntu_net_name(){
sed -ri '/GRUB_CMDLINE_LINUX=""/s@"(.*)"@"net.ifnames=0 biosdevname=0"@' /etc/default/grub
grub-mkconfig -o /boot/grub/grub.cfg
name=`ip a | grep -o "^[0-9]: e.*:" | tr -d ' ' | cut -d: -f2`
for i in /etc/netplan/*;do
sed -ri "s/$name:/eth0:/" $i;
done
echo -e "\033[1;31m设置完成请重新启动系统\033[0m"
}

ubuntu_optimize(){
cat >/etc/security/limits.conf<<EOF

*       soft        core        unlimited
*       hard        core        unlimited
*       soft        nproc       1000000
*       hard        nproc       1000000
*       soft        nofile      1000000
*       hard        nofile      1000000
*       soft        memlock     32000
*       hard        memlock     32000
*       soft        msgqueue    8192000

root       soft        core        unlimited
root       hard        core        unlimited
root       soft        nproc       1000000
root       hard        nproc       1000000
root       soft        nofile      1000000
root       hard        nofile      1000000
root       soft        memlock     32000
root       hard        memlock     32000
root       soft        msgqueue    8192000
EOF
echo -e "\033[1;31m资源限制优化完成,重启生效\033[0m"
cat >/etc/sysctl.conf<<EOF

# Controls source route verification
net.ipv4.conf.default.rp_filter = 1
net.ipv4.ip_nonlocal_bind = 1
net.ipv4.ip_forward = 1

# Do not accept source routing
net.ipv4.conf.default.accept_source_route = 0

# Controls the System Request debugging functionality ofthe kernel
kernel.sysrq = 0

# Controls whether core dumps will append the PID to thecore filename.
# Useful for debugging multi-threaded applications.
kernel.core_uses_pid = 1

# Controls the use of TCP syncookies
net.ipv4.tcp_syncookies = 1

# Disable netfilter on bridges.
#net.bridge.bridge-nf-call-ip6tables = 0
#net.bridge.bridge-nf-call-iptables = 0
#net.bridge.bridge-nf-call-arptables = 0

# Controls the default maxmimum size of a mesage queue
kernel.msgmnb = 65536

# # Controls the maximum size of a message, in bytes
kernel.msgmax = 65536

# Controls the maximum shared segment size, in bytes
kernel.shmmax = 68719476736

# # Controls the maximum number of shared memory segments,in pages
kernel.shmall = 4294967296

# TCP kernel paramater
net.ipv4.tcp_mem = 786432 1048576 1572864
net.ipv4.tcp_rmem = 4096 87380 4194304
net.ipv4.tcp_wmem = 4096 16384 4194304
net.ipv4.tcp_window_scaling = 1
net.ipv4.tcp_sack = 1

# socket buffer
net.core.wmem_default = 8388608
net.core.rmem_default = 8388608
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.core.netdev_max_backlog = 262144
net.core.somaxconn = 20480
net.core.optmem_max = 81920

# TCP conn
net.ipv4.tcp_max_syn_backlog = 262144
net.ipv4.tcp_syn_retries = 3
net.ipv4.tcp_retries1 = 3
net.ipv4.tcp_retries2 = 15

# tcp conn reuse
net.ipv4.tcp_timestamps = 0
net.ipv4.tcp_tw_reuse = 0
#Linux 从4.12内核版本开始移除了 tcp_tw_recycle 配置
#net.ipv4.tcp_tw_recycle = 0
net.ipv4.tcp_fin_timeout = 1
net.ipv4.tcp_max_tw_buckets = 20000
net.ipv4.tcp_max_orphans = 3276800
net.ipv4.tcp_synack_retries = 1
net.ipv4.tcp_syncookies = 1

# keepalive conn
net.ipv4.tcp_keepalive_time = 300
net.ipv4.tcp_keepalive_intvl = 30
net.ipv4.tcp_keepalive_probes = 3
net.ipv4.ip_local_port_range = 10001 65000
EOF
echo -e "\033[1;31m优化内核参数完成\033[0m"
}
PS3="请选择相应的编号(1-12):"
MENU=" 
Ubuntu设置终端提示符
Ubuntu配置主机名(需要以sudo执行脚本)
Ubuntu设置root密码并且允许root远程登录(需要以sudo执行脚本)
Ubuntu设置阿里源(需要以sudo执行脚本)
Ubuntu安装常用软件,及关闭自动更新
Ubuntu配置VIM
Ubuntu配置别名
Ubuntu修改网卡名称(需要以sudo执行脚本)
Ubuntu系统优化(资源限制与内核优化)
执行1,6,7!
重启系统(需要以sudo执行脚本)
退出
"
select menu in $MENU;do
case $REPLY in
1)
    ubuntu_PS1
    ;;
2)
    ubuntu_hostname
    ;;
3)
    ubuntu_root
    ;;
4)
    ubuntu_apt
    ;;
5)
    ubuntu_install
    ;;
6)
    ubuntu_vim
    ;;
7)
    ubuntu_alias
    ;;
8)
    ubuntu_net_name
    ;;
9)
    ubuntu_optimize
    ;;
10)
    ubuntu_PS1
    ubuntu_vim
    ubuntu_alias
    ;;
11)
    reboot
    ;;
12)
    break
    ;;
*)
    echo -e "\e[1;31m输入错误,请输入正确的数字(1-12)!\e[0m"
    ;;
esac
done
}


man(){
[ -f /etc/os-release ] || { echo -e "\e[1;31m未知错误正在退出....!\e[0m";exit; }
centos=`cat /etc/os-release |grep -o centos |head -1`
ubuntu=`cat /etc/os-release |grep -o ubuntu |head -1`

if [ $centos == centos ] &>/dev/null;then
    echo -e "\e[1;31m您当前的系统为$centos正在执行脚本.....\e[0m"    
    Centos
elif [ $ubuntu == ubuntu ];then
    echo -e "\e[1;31m您当前的系统为$ubuntu正在执行脚本.....\e[0m"
    Ubuntu
else
    echo -e "\e[1;31m您当前的系统不适合执行此脚本.....\e[0m"
fi
}
man

```

* 适用于centos与ubuntu的Linux系统
* 脚本文件地址：https://gitee.com/zhang-zhuo-0705/shell/

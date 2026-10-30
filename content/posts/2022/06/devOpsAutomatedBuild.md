---
title: "DevOps自动化构建应用"
date: 2022-06-05T18:26:45+08:00
draft: false
description: "演示 Jenkins 结合 Kubernetes 动态创建构建 Pod，完成 Java 应用的自动化发布。"
cover: "https://b3logfile.com/bing/20210522.jpg?imageView2/1/w/960/h/540/interlace/1/q/100"
categories: ["DevOps"]
tags: ["Kubernetes"]
toc: true
---
# 一、基于k8s相关流水线准备

jenkins使用kubernetes插件可以实现，动态创建流水线相关的任务Pod在流水线执行结束后会删除相应的任务Pod以达到资源的释放。

**具体kubernetes的agent使用详解**

```json
pipeline {
  agent {
    kubernetes { 
      cloud 'kubernetes'  //这里需要指定相关jenkins中创建的kubernetes对接信息的名称
      slaveConnectTimeout 1200  //超时配置
      workspaceVolume emptyDirWorkspaceVolume()  //jenkins的工作目录，必须设置起到一个Pod中不同container的目录共享jenkins工作目录
      yaml '''  //这里以下都是Pod定义信息
kind: Pod
metadata:
  name: jenkins-agent
  namespace: jenkins
spec:
  containers: 
  - args: [\'$(JENKINS_SECRET)\', \'$(JENKINS_NAME)\']
    image: '192.168.10.15/kubernetes/jnlp:alpine'
    name: jnlp                      //jnlp容器是必须的他负责连接jenkins，这里保持默认使用即可
    imagePullPolicy: IfNotPresent
//以下容器为具体的工作容器，所有流水线中的任何阶段的任务都在容器中执行，可以定义多个在流水线中指定任务使用那个容器进行执行
  - command:   //所有容器推荐使用cat命令保证容器在启动后保持运行不退出   
      - "cat"
    tty: true  //保持tty，起到容器不退出
    image: "192.168.10.254:5000/bash/alpine:latest"
    imagePullPolicy: "IfNotPresent"
    name: "echo"  //container的名称
  restartPolicy: Never 
  nodeSelector:  
    build: true 
'''
    }
  }
  //具体流水线配置
  stages {
    //这里为流水线定义
    stage('echo') {   //stage名称
      steps {
        container(name: 'echo') {   //这里定义这个步骤使用那个container进行执行，指定container的名称
          sh "echo hello word"
        }
      }
   }
}
```

## 1.1 相关镜像准备

有些镜像需自己准备，如docker镜像用于构建docker镜像，kubectl镜像用于连接k8s进行服务更新。其余镜像使用官方镜像即可。

### 1.docker镜像

**镜像构建**

```bash
#直接使用alpine镜像拷贝docker二进制执行文件到容器即可
[17:38:58 root@nexus docker]#cat Dockerfile 
FROM 192.168.10.254:5000/bash/alpine:latest
COPY docker /usr/bin/
#构建
docker build -t 192.168.10.254:5000/kubernetes/docker:alpine .
```

**jenkins中验证**

```json
pipeline {
  agent {
    kubernetes { 
      cloud 'kubernetes'  
      slaveConnectTimeout 1200 
      workspaceVolume emptyDirWorkspaceVolume() 
      yaml '''
kind: Pod
metadata:
  name: jenkins-agent
  namespace: jenkins
spec:
  containers: 
  - args: [\'$(JENKINS_SECRET)\', \'$(JENKINS_NAME)\']
    image: '192.168.10.15/kubernetes/jnlp:alpine'
    name: jnlp  
    imagePullPolicy: IfNotPresent
  - command:
      - "cat"
    image: "192.168.10.15/kubernetes/docker:alpine"
    imagePullPolicy: "IfNotPresent"
    name: "docker"
    tty: true
    volumeMounts:
    - mountPath: "/var/run/docker.sock"
      name: "dockersock"
      readOnly: false
  volumes:   
  #注意docker容器必须被调度到存在docker的k8s节点，并且挂载主机的docker.sock文件到容器
  - hostPath:
      path: "/var/run/docker.sock"
    name: "dockersock"
  restartPolicy: Never 
  nodeSelector:  
    build: true 
'''
    }
  }
  stages {
    stage('docker info') {   
      steps {
        container(name: 'docker') {  
          sh "docker info"    //执行docker info有正常输出即可
        }
      }
    }
  }
}
```

### 2.kubectl镜像

**镜像构建**

```bash
[17:46:21 root@nexus kubectl]#cat Dockerfile 
FROM 192.168.10.254:5000/bash/alpine:latest
COPY kubectl /usr/bin/
#构建
[17:46:01 root@nexus kubectl]#docker build -t 192.168.10.254:5000/kubernetes/kubectl:alpine .
```

**使用验证**

```json
pipeline {
  agent {
    kubernetes { 
      cloud 'kubernetes'  //这里需要指定相关jenkins中创建的kubernetes对接信息的名称
      slaveConnectTimeout 1200  //超时配置
      workspaceVolume emptyDirWorkspaceVolume()  //jenkins的工作目录，必须设置起到一个Pod中不同container的目录共享jenkins工作目录
      yaml '''
kind: Pod
metadata:
  name: jenkins-agent
  namespace: jenkins
spec:
  containers: 
  - args: [\'$(JENKINS_SECRET)\', \'$(JENKINS_NAME)\']
    image: '192.168.10.15/kubernetes/jnlp:alpine'
    name: jnlp  
    imagePullPolicy: IfNotPresent
  - command:
      - "cat"
    image: "192.168.10.254:5000/kubernetes/kubectl:alpine"
    imagePullPolicy: "IfNotPresent"
    name: "kubectl"
    tty: true
  restartPolicy: Never 
  nodeSelector:  
    build: true 
'''
    }
  }
  //具体流水线配置
  stages {
    //这里为流水线定义
    stage('kubectl get') {   //stage名称
      environment {
        MY_KUBECONFIG = credentials('kubernetes-cluster')
      }
      steps {
        container(name: 'kubectl') {   //这里定义这个步骤使用那个container进行执行，指定container的名称
          sh "kubectl get pod -A --kubeconfig $MY_KUBECONFIG"
        }
      }
    }
  }
}
```

# 二、自动化构建 Java 应用

## 1.流水线结构

![DevOps-java](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/DevOps-java.png)

注意这里的Jenkinsfile与Dockerfile文件都存放在git仓库中。java应用会使用mvn进行打包，mvn会下载一系列依赖的包，默认会下载到mvn容器的/root/.m2目录最好使用volume进行持久化。

## 2.需要克隆开源代码到自己gitlab仓库

仓库地址：https://github.com/AdlerED/bolo-solo

![image-20220604182558658](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20220604182558658.png)

## 3.Jenkinsfile文件

```json
pipeline {
  //顶层环境变量设置
  environment {
    namespace = "bolo"                     //服务部署在那个namespace中
    registries = "192.168.10.15/bolo"      //生成镜像存放镜像的仓库地址
    GIT = "git@192.168.10.14:kubernetes/bolo-solo.git"  //代码仓库地址
    TAG = ""                               //镜像tag,会在下面生成,这里只是定义全局变量
    NANE = ""                              //jenkins项目名称,会在下面生成,这里只是定义全局变量
  }
  //全局配置
  options {
    timestamps()                     //所有输出每行都会打印时间戳
    buildDiscarder(logRotator(numToKeepStr: '5'))  //保留5个历史构建版本
  }
  //手动构建时选择分支参数
  parameters { 
    gitParameter(branch: '', branchFilter: 'origin/(.*)', defaultValue: '', description: 'Branch for build and deploy', name: 'BRANCH', quickFilterEnabled: false, selectedValue: 'NONE', sortMode: 'NONE',  tagFilter: '*', type: 'PT_BRANCH')
  }
  //agent配置
  agent {
    kubernetes {
      cloud 'kubernetes'
      slaveConnectTimeout 1200
      workspaceVolume emptyDirWorkspaceVolume()   //这里使用临时目录共享jenkins的工作目录默认路径为/home/jenkins/agent
      yaml '''
kind: Pod
metadata:
  name: jenkins-agent
  namespace: jenkins
spec:
  containers:
  - args: [\'$(JENKINS_SECRET)\', \'$(JENKINS_NAME)\']
    image: '192.168.10.254:5000/kubernetes/jnlp:alpine'
    name: jnlp    #这个容器必须有，保持默认即可
    imagePullPolicy: IfNotPresent
  - command:
      - "cat"
    image: "192.168.10.254:5000/kubernetes/maven:3.8.5-openjdk-8-slim"
    imagePullPolicy: "IfNotPresent"
    name: "maven"  #maven打包镜像
    volumeMounts:  #持久化依赖包，重复构建不会进行重复下载 
    - mountPath: "/root/.m2"  
      name: mvn-data
    tty: true
  - command:
      - "cat"
    image: "192.168.10.254:5000/kubernetes/docker:alpine"
    imagePullPolicy: "IfNotPresent"
    name: "docker"  #docker容器需要挂载docker.sock文件，需要调度到有docker的node节点
    tty: true
    volumeMounts:
    - mountPath: "/var/run/docker.sock"
      name: "dockersock"
      readOnly: false
  - command:
      - "cat"
    image: "192.168.10.254:5000/kubernetes/kubectl:apline"
    imagePullPolicy: "IfNotPresent"
    name: "kubectl"  #kubectl镜像
    tty: true
  volumes:          
  - name: mvn-data    
    persistentVolumeClaim:  
      claimName: mvn 
  - hostPath:
      path: "/var/run/docker.sock"
    name: "dockersock"  
  restartPolicy: Never
  nodeSelector:   #这里需要给有docker的node节点打标签调度Pod到这个节点
    build: true 
'''
    }
  }
  //具体流水线配置
  stages {
    //克隆代码
    stage('git clone') {
      //并行执行
      failFast true  //并行执行的分支只要有一个失败立即结束流水线
      parallel {
        //手动执行jenkins流水线
        stage('git clone by Jenkins') {
          when {
            expression {
              env.gitlabBranch == null
            }
          }
          steps {
            git branch: "${BRANCH}", credentialsId: 'gitlab-key', url: "${GIT}"
            script {
              TAG = sh(returnStdout: true, script: "echo -n ${BRANCH}-${env.BUILD_ID}")
            }
          }
        }
        //gitlab触发构建
        stage('git clone trigger') {
          when {
            expression {
              env.gitlabBranch != null
            }
          }
          steps {
            git branch: "${env.gitlabBranch}", credentialsId: 'gitlab-key', url: "${GIT}"
            script {
              TAG = sh(returnStdout: true, script: "echo -n ${env.gitlabBranch}-${env.BUILD_ID}")
            }
          }
        }
        //初始化项目名称，项目名称用于docker镜像名称,不能有大写字母,转义
        stage('init env') {
          steps {
            script {
              NAME = sh(returnStdout: true, script: "echo -n ${env.JOB_NAME}").toLowerCase()
            }
            sh "echo ${NAME}"
          }
        }
      }
    }
    //打包java程序
    stage('mvn build') {
      steps {
        container(name: 'maven') {
          sh "mvn package -DskipTests -Pci"
          sh "ls -l"
        }
      }
	}
    //构建镜像并且推送镜像仓库
    stage('docker build') {
      environment {
        HARBOR_USER = credentials('harbor-account')  //获取镜像仓库认证信息
      }
      steps {
        container(name: 'docker') {
          sh "docker login -u ${HARBOR_USER_USR} -p ${HARBOR_USER_PSW} ${registries}"
          sh "docker build -t ${registries}/${NAME}:${TAG} ."
          sh "docker push ${registries}/${NAME}:${TAG}"
        }
      }
	}
   //更新k8s相关应用
    stage('update deploy') {
      environment {
        MY_KUBECONFIG = credentials('kubernetes-cluster')
      }
      steps {
        container(name: 'kubectl') {
          sh "kubectl get deploy -n ${namespace} -l image=${NAME} --kubeconfig $MY_KUBECONFIG"
          sh "kubectl set image deploy -n ${namespace} -l image=${NAME} ${NAME}=${registries}/${NAME}:${TAG} --kubeconfig $MY_KUBECONFIG"
          sh "kubectl rollout status deployment -n ${namespace} ${NAME} --timeout=60s --kubeconfig $MY_KUBECONFIG"
        }
      }
	}
  }
}
```

## 4.Dockerfile文件

```bash
FROM 192.168.10.254:5000/kubernetes/openjdk:8-alpine
WORKDIR /opt/bolo/
COPY target/bolo /opt/bolo
COPY src/main/resources/docker /opt/bolo/WEB-INF/classes/
ENV TZ=Asia/Shanghai
EXPOSE 8080
ENTRYPOINT [ "java", "-cp", "WEB-INF/lib/*:WEB-INF/classes", "org.b3log.solo.Starter" ]
```

## 5.创建流水线

**创建流水线**

![image-20220604182853910](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20220604182853910.png)

**进行配置**

![image-20220604183106872](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20220604183106872.png)

**第一次需进行构建读取jenkinsfile文件，会报错**

## 6.部署应用进行测试

**部署相关应用**

```bash
apiVersion: apps/v1 
kind: Deployment    
metadata:           
  name: bolo      
  namespace: bolo
  labels:
    image: bolo   #jenkinsfile中更新我使用lable进行筛选，这里必须设置
spec:              
  replicas: 1  
  selector:
    matchLabels:     
      app: bolo   
  template:          
    metadata:
      creationTimestamp: null
      labels:
        app: bolo
    spec:
      containers:
      - name: bolo
        image: 192.168.10.15/bolo/bolo:jenkins-bolo-23 
        args:
        - --listen_port=8080 
        - --server_scheme=http 
        - --server_host=192.168.10.13
        ports:  
        - name: http    
          containerPort: 8080    
          protocol: TCP 
        env:    #这里如果要正常使用需部署mysql数据库
        - name: RUNTIME_DB     
          value: "MYSQL"
        - name: JDBC_DRIVER
          value: "com.mysql.cj.jdbc.Driver"
        - name: JDBC_URL
          value: "jdbc:mysql://mysql:3306/bolo?useUnicode=yes&characterEncoding=UTF-8&useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true"
        - name: JDBC_USERNAME
          value: "bolo"
        - name: JDBC_PASSWORD
          value: "123456"
---
apiVersion: v1     
kind: Service      
metadata:          
  name: bolo    
  namespace: bolo  
spec:              
  ports:           
  - name: mysql   
    port: 8080      
    protocol: TCP  
    targetPort: http 
  selector:        
    app: bolo   
  type: ClusterIP
```

**测试手动执行流水线**

![image-20220604183908298](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20220604183908298.png)

# 三、自动化构建 Vue/H5 前端应用

## 1.流水线结构

![DevOps-vue](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/DevOps-vue.png)

注意这里的Jenkinsfile与Dockerfile文件都存放在git仓库中。veu应用会使用npm进行打包，npm会下载一系列依赖的包，默认会下载到npm容器的运行npm的目录`node_modules`中所以为了重复构建不进行重复下载需要持久化，这里推荐直接持久化jenkins工作目录即可。

## 2.需要克隆开源代码到自己gitlab仓库

源码仓库：https://github.com/SD-Gaming/Vue3-Todo-List-AddName

## 3.Jenkinsfile文件

```json
pipeline {
  //顶层环境变量设置
  environment {
    namespace = "bolo"                      //服务部署在那个namespace中
    registries = "192.168.10.15/vue"        //镜像仓库地址
    GIT = "git@192.168.10.14:root/Vue3-Todo-List-AddName.git"  //代码仓库地址
    TAG = ""                               //镜像tag,会在下面生成,这里只是定义全局变量
    NANE = ""                              //jenkins项目名称,会在下面生成,这里只是定义全局变量
  }
  //全局配置
  options {
    timestamps()                     //所有输出每行都会打印时间戳
    buildDiscarder(logRotator(numToKeepStr: '5'))  //保留5个历史构建版本
  }
  //手动构建时选择分支参数
  parameters { 
    gitParameter(branch: '', branchFilter: 'origin/(.*)', defaultValue: '', description: 'Branch for build and deploy', name: 'BRANCH', quickFilterEnabled: false, selectedValue: 'NONE', sortMode: 'NONE',  tagFilter: '*', type: 'PT_BRANCH')
  }
  //agent配置
  agent {
    kubernetes {
      cloud 'kubernetes'
      slaveConnectTimeout 1200
      workspaceVolume persistentVolumeClaimWorkspaceVolume(claimName: "npm-data", mountPath: "/", readOnly: "false")
      yaml '''
kind: Pod
metadata:
  name: jenkins-agent
  namespace: jenkins
spec:
  containers:
  - args: [\'$(JENKINS_SECRET)\', \'$(JENKINS_NAME)\']
    image: '192.168.10.254:5000/kubernetes/jnlp:alpine'
    name: jnlp
    imagePullPolicy: IfNotPresent
  - command:
      - "cat"
    image: "192.168.10.254:5000/kubernetes/node:latest"
    imagePullPolicy: "IfNotPresent"
    name: "nodejs" 
    tty: true
  - command:
      - "cat"
    image: "192.168.10.254:5000/kubernetes/docker:alpine"
    imagePullPolicy: "IfNotPresent"
    name: "docker"
    tty: true
    volumeMounts:
    - mountPath: "/var/run/docker.sock"
      name: "dockersock"
      readOnly: false
  - command:
      - "cat"
    image: "192.168.10.254:5000/kubernetes/kubectl:apline"
    imagePullPolicy: "IfNotPresent"
    name: "kubectl"
    tty: true
  volumes:          
  - hostPath:
      path: "/var/run/docker.sock"
    name: "dockersock"  
  restartPolicy: Never
  nodeSelector:  
    build: true 
'''
    }
  }
  //具体流水线配置
  stages {
    //克隆代码
    stage('git clone') {
      //并行执行
      failFast true  //并行执行的分支只要有一个失败立即结束流水线
      parallel {
        //手动执行jenkins流水线
        stage('git clone by Jenkins') {
          when {
            expression {
              env.gitlabBranch == null
            }
          }
          steps {
            git branch: "${BRANCH}", credentialsId: 'gitlab-key', url: "${GIT}"
            script {
              TAG = sh(returnStdout: true, script: "echo -n ${BRANCH}-${env.BUILD_ID}")
            }
          }
        }
        //gitlab触发构建
        stage('git clone trigger') {
          when {
            expression {
              env.gitlabBranch != null
            }
          }
          steps {
            git branch: "${env.gitlabBranch}", credentialsId: 'gitlab-key', url: "${GIT}"
            script {
              TAG = sh(returnStdout: true, script: "echo -n ${env.gitlabBranch}-${env.BUILD_ID}")
            }
          }
        }
        //初始化项目名称，项目名称用于docker镜像名称,不能有大写字母,转义
        stage('init env') {
          steps {
            script {
              NAME = sh(returnStdout: true, script: "echo -n ${env.JOB_NAME}").toLowerCase()
            }
            sh "echo ${NAME}"
          }
        }
      }
    }
    stage('npm build') {
      steps {
        container(name: 'nodejs') {
          sh "npm install --registry=https://registry.npm.taobao.org"
          sh "npm run build"
          sh "ls -l"
        }
      }
	}
    stage('docker build') {
      environment {
        HARBOR_USER = credentials('harbor-account')
      }
      steps {
        container(name: 'docker') {
          sh "docker login -u ${HARBOR_USER_USR} -p ${HARBOR_USER_PSW} ${registries}"
          sh "docker build -t ${registries}/${NAME}:${TAG} ."
          sh "docker push ${registries}/${NAME}:${TAG}"
        }
      }
	}
    stage('update deploy') {
      environment {
        MY_KUBECONFIG = credentials('kubernetes-cluster')
      }
      steps {
        container(name: 'kubectl') {
          sh  "kubectl get deploy -n ${namespace} -l image=${NAME} --kubeconfig $MY_KUBECONFIG"
          sh  "kubectl set image deploy -n ${namespace} -l image=${NAME} ${NAME}=${registries}/${NAME}:${TAG} --kubeconfig $MY_KUBECONFIG"
          sh  "kubectl rollout status deployment -n ${namespace} ${NAME} --timeout=60s --kubeconfig $MY_KUBECONFIG"
        }
      }
	}
  }
}
```

## 4.Dockerfile文件

```bash
FROM 192.168.10.254:5000/bash/nginx:latest
WORKDIR /usr/share/nginx/html/
COPY dist/ /usr/share/nginx/html/
ENV TZ=Asia/Shanghai
EXPOSE 80
```

## 5.创建流水线

![image-20220604190851882](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20220604190851882.png)

## 6.部署应用进行测试

**部署应用**

```yaml
apiVersion: apps/v1 
kind: Deployment    
metadata:           
  name: vue      
  namespace: bolo
  labels:
    image: vue  #这里必须定义为镜像名称
spec:              
  replicas: 1        
  selector:         
    matchLabels:    
      app: vue 
  template:          
    metadata:
      creationTimestamp: null
      labels:
        app: vue
    spec:
      containers:
      - name: vue
        image: 192.168.10.15/vue/vuevue3-addname:main-6
        ports:  
        - name: http    
          containerPort: 80    
          protocol: TCP 
---
apiVersion: v1     
kind: Service     
metadata:         
  name: vue   
  namespace: bolo  
spec:              
  ports:          
  - name: vue    
    port: 80       
    protocol: TCP  
    targetPort: http
  selector:     
    app: vue   
  type: NodePort
```

**测试流水线**

![image-20220604191639118](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20220604191639118.png)

# 四、自动化构建 Golang 项目

## 1.流水线结构

![DevOps-go](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/DevOps-go.png)

注意这里的Jenkinsfile与Dockerfile文件都存放在git仓库中。go应用会使用`go build`进行编译，会下载一系列依赖的包，默认会下载到容器的`/opt/pkg`目录中所以为了重复构建不进行重复下载需要持久化。

## 2.需要克隆开源代码到自己gitlab仓库

源码仓库：https://gitee.com/dukuan/go-project.git

## 3.Jenkinsfile文件

```json
pipeline {
  //顶层环境变量设置
  environment {
    namespace = "bolo"                      //服务部署在那个namespace中
    registries = "192.168.10.15/go"         //镜像仓库地址
    GIT = "git@192.168.10.14:root/go-project.git"  //代码仓库地址
    TAG = ""                               //镜像tag,会在下面生成,这里只是定义全局变量
    NANE = ""                              //jenkins项目名称,会在下面生成,这里只是定义全局变量
  }
  //全局配置
  options {
    timestamps()                     //所有输出每行都会打印时间戳
    buildDiscarder(logRotator(numToKeepStr: '5'))  //保留5个历史构建版本
  }
  //手动构建时选择分支参数
  parameters { 
    gitParameter(branch: '', branchFilter: 'origin/(.*)', defaultValue: '', description: 'Branch for build and deploy', name: 'BRANCH', quickFilterEnabled: false, selectedValue: 'NONE', sortMode: 'NONE',  tagFilter: '*', type: 'PT_BRANCH')
  }
  //agent配置
  agent {
    kubernetes {
      cloud 'kubernetes'
      slaveConnectTimeout 1200
      workspaceVolume emptyDirWorkspaceVolume()
      yaml '''
kind: Pod
metadata:
  name: jenkins-agent
  namespace: jenkins
spec:
  containers:
  - args: [\'$(JENKINS_SECRET)\', \'$(JENKINS_NAME)\']
    image: '192.168.10.254:5000/kubernetes/jnlp:alpine'
    name: jnlp
    imagePullPolicy: IfNotPresent
  - command:
      - "cat"
    image: "192.168.10.254:5000/kubernetes/golang:1.18.3"
    imagePullPolicy: "IfNotPresent"
    name: "go"
    volumeMounts:     
    - mountPath: "/go/pkg"
      name: go-pkg-data
    tty: true
  - command:
      - "cat"
    image: "192.168.10.254:5000/kubernetes/docker:alpine"
    imagePullPolicy: "IfNotPresent"
    name: "docker"
    tty: true
    volumeMounts:
    - mountPath: "/var/run/docker.sock"
      name: "dockersock"
      readOnly: false
  - command:
      - "cat"
    image: "192.168.10.254:5000/kubernetes/kubectl:apline"
    imagePullPolicy: "IfNotPresent"
    name: "kubectl"
    tty: true
  volumes:          
  - name: go-pkg-data    
    persistentVolumeClaim:  
      claimName: go 
  - hostPath:
      path: "/var/run/docker.sock"
    name: "dockersock"  
  restartPolicy: Never
  nodeSelector:  
    build: true 
'''
    }
  }
  //具体流水线配置
  stages {
    //克隆代码
    stage('git clone') {
      //并行执行
      failFast true  //并行执行的分支只要有一个失败立即结束流水线
      parallel {
        //手动执行jenkins流水线
        stage('git clone by Jenkins') {
          when {
            expression {
              env.gitlabBranch == null
            }
          }
          steps {
            git branch: "${BRANCH}", credentialsId: 'gitlab-key', url: "${GIT}"
            script {
              TAG = sh(returnStdout: true, script: "echo -n ${BRANCH}-${env.BUILD_ID}")
            }
          }
        }
        //gitlab触发构建
        stage('git clone trigger') {
          when {
            expression {
              env.gitlabBranch != null
            }
          }
          steps {
            git branch: "${env.gitlabBranch}", credentialsId: 'gitlab-key', url: "${GIT}"
            script {
              TAG = sh(returnStdout: true, script: "echo -n ${env.gitlabBranch}-${env.BUILD_ID}")
            }
          }
        }
        //初始化项目名称，项目名称用于docker镜像名称,不能有大写字母,转义
        stage('init env') {
          steps {
            script {
              NAME = sh(returnStdout: true, script: "echo -n ${env.JOB_NAME}").toLowerCase()
            }
            sh "echo ${NAME}"
          }
        }
      }
    }
    stage('build') {
      steps {
        container(name: 'go') {
          sh "export GO111MODULE=on"
          sh "go env -w GOPROXY=https://goproxy.cn,direct"
          sh "go mod tidy"
          sh "go build"
          sh "ls -l"
        }
      }
	}
    stage('docker build') {
      environment {
        HARBOR_USER = credentials('harbor-account')
      }
      steps {
        container(name: 'docker') {
          sh "docker login -u ${HARBOR_USER_USR} -p ${HARBOR_USER_PSW} ${registries}"
          sh "docker build -t ${registries}/${NAME}:${TAG} ."
          sh "docker push ${registries}/${NAME}:${TAG}"
        }
      }
	}
    stage('update deploy') {
      environment {
        MY_KUBECONFIG = credentials('kubernetes-cluster')
      }
      steps {
        container(name: 'kubectl') {
          sh  "kubectl get deploy -n ${namespace} -l image=${NAME} --kubeconfig $MY_KUBECONFIG"
          sh  "kubectl set image deploy -n ${namespace} -l image=${NAME} ${NAME}=${registries}/${NAME}:${TAG} --kubeconfig $MY_KUBECONFIG"
          sh  "kubectl rollout status deployment -n ${namespace} ${NAME} --timeout=60s --kubeconfig $MY_KUBECONFIG"
        }
      }
	}
  }
}
```

## 4.Dockerfile文件

```dockerfile
FROM 192.168.10.254:5000/bash/alpine-glibc:glibc-2.35
WORKDIR /opt/workdir/
COPY go-project /opt/workdir/
COPY conf/ /opt/workdir/conf/
ENV TZ=Asia/Shanghai
EXPOSE 8080
CMD [ "./go-project"]
```

## 5.创建流水线

![image-20220605173306813](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20220605173306813.png)

## 6.部署应用测试

**部署应用**

```yaml
apiVersion: apps/v1 
kind: Deployment    
metadata:           
  name: go-project      
  namespace: bolo
  labels:
    image: go-project  #这里使用lable匹配更新，必须设置这个
spec:              
  replicas: 1        
  selector:          
    matchLabels:     
      app: go-project   
  template:         
    metadata:
      creationTimestamp: null
      labels:
        app: go-project
    spec:
      containers:
      - name: go-project
        image: 192.168.10.15/vue/vuevue3-addname:main-6
        ports:  
        - name: http    
          containerPort: 8080     
          protocol: TCP 
---
apiVersion: v1    
kind: Service    
metadata:         
  name: go-project   
  namespace: bolo 
spec:              
  ports:           
  - name: go-project    
    port: 8080     
    protocol: TCP 
    targetPort: http 
  selector:       
    app: go-project  
  type: NodePort
```

**测试流水线**

![image-20220605173536476](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20220605173536476.png)

# 五、配置自动触发构建

之前的构建都是采用手动选择分支进行构建的，实际使用时，项目可能有很多，如果都是手动触发可能比较消耗人力。所以推荐可以按需配置自动触发，即提交代码后自动触发Jenkins进行构建任务。

## 5.1 配置jenkins

本次用 Java 项目进行演示。首先找到 Java 项目的 Job，点击 Configure

之后选择 Build Triggers，勾选 Build when a change…，记录 webhook URL

![image-20220605173726643](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20220605173726643.png)

选择 Allow all branches，如果不想任何分支都可以触发该流水线，可以选择 Filter 进行条件匹配。之后点击 Generate 生成 Secret token，	最后点击 Save 即可。

![image-20220605173823816](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20220605173823816.png)

## 5.2 配置gitlab

接下来配置 GitLab，首先点击 Menu→Admin

![image-20220605174042425](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20220605174042425.png)

保存后，找到 Java 项目，点击 Settings→WebHooks

![image-20220605174136657](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20220605174136657.png)

确认无误后，点击 Add webhook

保存后没有问题可以进行测试

![image-20220605174227873](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20220605174227873.png)

验证流水线是否触发执行

![image-20220605174401745](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20220605174401745.png)

# 六、一次构建多次部署

创建一个新的 Job，名字为 go-project-uat，类型 Pipeline

```json
pipeline {
  environment {
    HARBOR_ADDRESS = "192.168.10.15"  //镜像仓库地址
    NAMESPACE = "bolo"                //部署应用的命名空间
    IMAGE_NAME = "go-project"         //镜像名称
  }
  parameters { 
    imageTag(name: 'DOCKER_IMAGE', description: '', image: 'go/go-project', filter: '.*', defaultTag: '', registry: 'http://192.168.10.15', credentialId: 'harbor-account', tagOrder: 'NATURAL')   //获取镜像名称与tag，相关参数根据实际情况填写
  }  
  //全局配置
  options {
    timestamps()                     //所有输出每行都会打印时间戳
    buildDiscarder(logRotator(numToKeepStr: '5'))  //保留5个历史构建版本
  }
  agent {
    kubernetes {
      cloud 'kubernetes'
      slaveConnectTimeout 1200
      workspaceVolume emptyDirWorkspaceVolume()
      yaml '''
apiVersion: v1
kind: Pod
metadata:
  name: jenkins-agent
  namespace: jenkins
spec:
  containers:
  - args: [\'$(JENKINS_SECRET)\', \'$(JENKINS_NAME)\']
    image: '192.168.10.254:5000/kubernetes/jnlp:alpine'
    name: jnlp
    imagePullPolicy: IfNotPresent
  - command:
      - "cat"
    image: "192.168.10.254:5000/kubernetes/kubectl:apline"
    imagePullPolicy: "IfNotPresent"
    name: "kubectl"
    tty: true
'''
    }
  }
 stages {
   stage('Deploy') {
     environment {
       MY_KUBECONFIG = credentials('kubernetes-cluster')
     }
     steps {
       container(name: 'kubectl'){
         sh "echo ${DOCKER_IMAGE}"
         sh  "kubectl get deploy -n ${NAMESPACE} -l image=${IMAGE_NAME} --kubeconfig $MY_KUBECONFIG"
         sh  "kubectl set image deploy -n ${NAMESPACE} -l image=${IMAGE_NAME} ${IMAGE_NAME}=${HARBOR_ADDRESS}/${DOCKER_IMAGE} --kubeconfig $MY_KUBECONFIG"
         sh  "kubectl rollout status deployment -n ${NAMESPACE} ${IMAGE_NAME} --timeout=60s --kubeconfig $MY_KUBECONFIG"
        }
      }
    }
  }
}
```

执行流水线

![image-20220605181623063](https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com//Typora/image-20220605181623063.png)

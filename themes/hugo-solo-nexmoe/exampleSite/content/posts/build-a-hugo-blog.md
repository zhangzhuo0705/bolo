---
title: "从零搭建一个 Hugo 博客"
date: 2026-10-15T09:00:00+08:00
draft: false
description: "从创建站点、安装主题到编写第一篇文章，完成一个可本地预览的 Hugo 博客。"
cover: "images/cover1.jpg"
categories: ["Hugo 实践"]
tags: ["Hugo", "静态网站", "入门"]
toc: true
---

Hugo 把 Markdown 内容、主题模板和静态资源组合成普通 HTML 文件。它不需要运行时数据库，构建结果可以直接交给静态托管服务。

## 准备环境

本示例需要 Hugo 0.128.0 或更高版本。开始前先确认 Git 和 Hugo 都能运行：

```bash
git --version
hugo version
```

如果终端能输出两个版本号，就可以继续。安装方式可参考 [Hugo 官方文档](https://gohugo.io/installation/)。

## 创建站点

```bash
hugo new site my-blog
cd my-blog
git init
```

新站点中最常用的目录如下：

```text
my-blog/
├── content/       # Markdown 内容
├── static/        # 图片和附件
├── themes/        # 主题
└── hugo.toml      # 站点配置
```

## 安装主题

```bash
git submodule add https://github.com/zhangzhuo0705/hugo-solo-nexmoe.git themes/hugo-solo-nexmoe
```

在 `hugo.toml` 中启用主题：

```toml
baseURL = "https://example.org/"
locale = "zh-cn"
title = "我的博客"
theme = "hugo-solo-nexmoe"

[params]
  mainSections = ["posts"]
  avatar = "images/avatar.jpg"
  hitokoto = "认真记录，持续成长。"
```

将头像保存为 `static/images/avatar.jpg`。`static` 中的文件发布后位于站点根路径，所以配置中不写 `static/`。

## 写第一篇文章

```bash
hugo new content posts/first-post.md
```

编辑生成的文件：

```yaml
---
title: "我的第一篇文章"
date: 2026-10-15
draft: false
description: "记录博客开始运行的这一天。"
cover: "images/cover.jpg"
categories: ["随笔"]
tags: ["开始"]
toc: true
---
```

封面文件应放在 `static/images/cover.jpg`。使用 `images/cover.jpg` 可以让主题自动适配域名根路径和项目子路径。

## 本地预览

```bash
hugo server -D
```

`-D` 会显示草稿。正式构建时运行：

```bash
hugo --gc --minify
```

生成结果位于 `public/`，这个目录是构建产物，不需要手动编辑。

## 下一步

先保证配置可以复现、文章可以阅读、图片路径可靠，再逐步增加分类、友情链接和自动部署。

> 内容比工具更重要，但可靠的工具能让写作更轻松。

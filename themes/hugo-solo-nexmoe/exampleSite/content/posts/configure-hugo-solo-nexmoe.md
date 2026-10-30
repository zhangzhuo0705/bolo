---
title: "Hugo Solo Nexmoe 配置指南"
date: 2026-10-12T14:30:00+08:00
draft: false
description: "按照主题当前支持的参数配置头像、菜单、社交链接、友情链接、分页和文章目录。"
cover: "images/cover2.jpg"
categories: ["Hugo 实践"]
tags: ["Hugo", "主题配置"]
toc: true
---

Hugo Solo Nexmoe 的主要行为由 `hugo.toml` 和文章 front matter 控制。本篇只介绍当前模板真正使用的配置项。

## 基础配置

```toml
baseURL = "https://example.org/"
locale = "zh-cn"
title = "我的博客"
theme = "hugo-solo-nexmoe"

[params]
  mainSections = ["posts"]
  avatar = "images/avatar.jpg"
  hitokoto = "生活不止眼前的代码，还有诗和远方。"
```

`mainSections` 固定首页读取的内容分区，避免关于页等独立页面混入文章列表。头像可以是本地站点路径，也可以是完整 HTTPS 地址。

## 社交链接

普通链接使用 `url`：

```toml
[[params.social]]
  name = "GitHub"
  url = "https://github.com/your-name"
  icon = "solo-github"
```

可复制的信息使用 `value`：

```toml
[[params.social]]
  name = "微信"
  value = "your_wechat_id"
  icon = "solo-wechat"
```

设置 `value` 后，点击按钮会显示复制对话框，而不是打开新页面。

## 导航菜单

```toml
[[menu.main]]
  name = "首页"
  url = "/"
  weight = 1
  [menu.main.params]
    icon = "solo-home"

[[menu.main]]
  name = "友情链接"
  url = "/links/"
  weight = 2
  [menu.main.params]
    icon = "solo-about"

[[menu.main]]
  name = "时间线"
  url = "/archives/"
  weight = 3
  [menu.main.params]
    icon = "solo-list"
```

`weight` 越小，位置越靠前。Hugo 会根据 `baseURL` 生成实际菜单地址。

## 友情链接

主题自带 `/links/` 和 `/archives/` 页面，无需手动创建。站点中同路径文件会覆盖主题内容，如需自定义标题或布局，可创建 `content/links.md` / `content/archives.md`。

再添加链接数据：

```toml
[[params.links]]
  name = "Hugo"
  url = "https://gohugo.io/"
  avatar = "https://gohugo.io/favicon.ico"
```

链接卡片优先读取 `avatar`，也兼容 `logo`；两者都没有时使用默认图标路径。

## 分页与目录

```toml
[pagination]
  pagerSize = 10

[markup]
  [markup.tableOfContents]
    startLevel = 2
    endLevel = 4
    ordered = false
```

文章目录默认开启，只有明确设置 `toc: false` 才会关闭。

## 文章字段

```yaml
---
title: "文章标题"
date: 2026-10-12
draft: false
description: "用于首页摘要的简短说明。"
cover: "images/cover.jpg"
categories: ["技术文章"]
tags: ["Hugo", "写作"]
toc: true
---
```

首页优先使用 `description`，缺少时从正文生成摘要。文章卡片显示第一个分类，标签可以有多个。

## 配置原则

- 本地资源放在站点的 `static/` 目录。
- 配置路径不写 `static/`，也不硬编码部署项目名。
- 修改后使用生产 `baseURL` 构建一次，检查菜单和图片路径。

明确而精简的配置，比保留大量未使用参数更容易维护。

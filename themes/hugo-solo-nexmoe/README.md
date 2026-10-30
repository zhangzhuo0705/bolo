# Hugo Solo Nexmoe

![License](https://img.shields.io/github/license/zhangzhuo0705/hugo-solo-nexmoe)
![Hugo Minimum Version](https://img.shields.io/badge/hugo-%3E%3D0.128.0-blue)

一个从 Solo Nexmoe 风格移植而来的 Hugo 博客主题，使用 MDUI，适合中文个人博客与技术文章站点。

- 在线演示：<https://zhangzhuo0705.github.io/hugo-solo-nexmoe/>
- 最低版本：Hugo 0.128.0

![主题预览](https://raw.githubusercontent.com/zhangzhuo0705/hugo-solo-nexmoe/main/images/screenshot.png)

## 功能

- 响应式文章列表和文章页
- MDUI 视觉样式与 Canvas 背景
- 浮动文章目录
- 分类、标签、标签云和归档时间线
- 标签/分类筛选页同时展示文章分类与标签
- 可配置页脚、备案信息和分类文件夹图标
- 友情链接和社交按钮
- 首页及列表分页
- 图片懒加载和默认封面
- 支持域名根路径和项目子路径部署

## 环境要求

- Git
- Hugo 0.128.0 或更高版本，标准版或 Extended 版均可

```bash
hugo version
git --version
```

## 安装

在已有 Hugo 站点根目录执行：

```bash
git init
git submodule add https://github.com/zhangzhuo0705/hugo-solo-nexmoe.git themes/hugo-solo-nexmoe
```

更新主题子模块：

```bash
git submodule update --init --recursive
```

## 最小配置

在站点根目录创建或编辑 `hugo.toml`：

```toml
baseURL = "https://example.org/"
locale = "zh-cn"
title = "我的博客"
theme = "hugo-solo-nexmoe"

[params]
  mainSections = ["posts"]
  avatar = "images/avatar.jpg"
  hitokoto = "认真记录，持续成长。"
  tagCloudLimit = 10

[[params.social]]
  name = "GitHub"
  url = "https://github.com/your-name"
  icon = "solo-github"

[[params.links]]
  name = "Hugo"
  url = "https://gohugo.io/"
  avatar = "https://gohugo.io/favicon.ico"

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
  name = "标签"
  url = "/tags/"
  weight = 3
  [menu.main.params]
    icon = "solo-tags"

[[menu.main]]
  name = "时间线"
  url = "/archives/"
  weight = 4
  [menu.main.params]
    icon = "solo-list"

[taxonomies]
  tag = "tags"
  category = "categories"

[pagination]
  pagerSize = 10

[markup]
  [markup.tableOfContents]
    startLevel = 2
    endLevel = 4
    ordered = false
```

把本地头像保存为 `static/images/avatar.jpg`；`avatar` 也可以填写完整的 HTTPS 地址。

### 基础字段

| 字段 | 作用 | 注意事项 |
| --- | --- | --- |
| `baseURL` | 站点部署根地址 | 必须以 `/` 结尾；GitHub Pages 项目页要包含仓库名，例如 `https://name.github.io/repo/`。主题资源和内部链接依赖它 |
| `locale` | 站点区域设置 | 中文站点设为 `zh-cn`；多语言站点改用 `defaultContentLanguage` 与 `[languages]` |
| `title` | 站点标题 | 用于浏览器标题、侧栏和版权信息 |
| `theme` | 主题目录名 | 必须与 `themes/hugo-solo-nexmoe` 的目录名一致 |

### params

| 参数 | 作用 | 默认/示例 |
| --- | --- | --- |
| `params.mainSections` | 首页展示的内容分区 | `["posts"]`，需与 `content/posts` 对应；使用其他目录时同步修改 |
| `params.avatar` | 侧栏头像 | 本地路径相对 `static/`，如 `images/avatar.jpg`；也可填完整 HTTPS 地址；建议显式设置并确保文件存在 |
| `params.hitokoto` | 侧栏底部的一言文字 | 任意字符串 |
| `params.tagCloudLimit` | 侧栏标签云展示数量 | 默认 `10`，按文章数取前 N 个；完整标签仍在 `/tags/` |

`params.social`、`params.links` 和菜单配置都是可选项，不需要时整段删除即可。

### 社交按钮

```toml
[[params.social]]
  name = "GitHub"
  url = "https://github.com/your-name"
  icon = "solo-github"
```

- `name`：按钮标题。
- `icon`：主题图标类名，常用 `solo-github`、`solo-wechat` 等。
- `url`：点击后在新标签页打开。
- `value`：与 `url` 二选一；点击弹窗显示并允许复制，适合微信号等信息。

### 友情链接

```toml
[[params.links]]
  name = "Hugo"
  url = "https://gohugo.io/"
  avatar = "https://gohugo.io/favicon.ico"
```

- 这里的 `params.links` 是 `/links/` 友情链接页的数据，不会出现在侧栏。
- `avatar` 可换成 `logo`；建议至少设置一个；未设置时会回退到 `images/default-avatar.png`，需确保该文件存在。
- 图片可以是 `static/` 下的本地路径，也可以是完整 HTTPS 地址。

### 菜单

```toml
[[menu.main]]
  name = "标签"
  url = "/tags/"
  weight = 3
  [menu.main.params]
    icon = "solo-tags"
```

- `weight` 控制顺序，数字越小越靠前。
- `icon` 使用主题图标类：首页 `solo-home`、友情链接 `solo-about`、标签 `solo-tags`、时间线 `solo-list`。
- `/tags/` 由 taxonomy 自动生成；`/links/`、`/archives/` 由主题自带内容生成，通常不需要再创建文件。
- 未设置 `icon` 时默认为 `solo-home`。

### 分类、分页和目录

```toml
[taxonomies]
  tag = "tags"
  category = "categories"

[pagination]
  pagerSize = 10

[markup]
  [markup.tableOfContents]
    startLevel = 2
    endLevel = 4
    ordered = false
```

- `taxonomies`：右侧是 URL 和文章 front matter 使用的键。修改后要同步菜单、模板和已有文章的 `tags`/`categories`。
- `pagination.pagerSize`：列表页每页文章数。
- `markup.tableOfContents`：浮动目录的标题级别范围；文章可用 `toc: false` 单独关闭。
- `params.footer`、`params.footerFilings` 等可选页脚配置见下方“配置参考”。

## 特殊页面

主题自带以下内容文件，安装后页面直接可用，不需要手动复制：

| 页面 | 主题内容文件 | 说明 |
| --- | --- | --- |
| `/links/` | `content/links.md` | `layout: links` 使用 `layouts/links.html`，数据来自 `params.links` |
| `/archives/` | `content/archives.md` | `layout: archives` 使用 `layouts/archives.html`，数据来自站内文章 |
| `/tags/` | `content/tags/_index.md` | 只用于设置标签页标题；`/tags/` 由 taxonomy 自动生成 |

Hugo 会自动挂载主题的 `content/`。站点中同路径文件优先级更高，可用于覆盖标题或布局，例如自定义友情链接页：

```bash
cp themes/hugo-solo-nexmoe/content/links.md content/links.md
```

`/links/` 和 `/archives/` 本质是普通内容页 + `layout` 指定特殊布局，不是 taxonomy。标签页 `/tags/` 由 Hugo taxonomy 自动生成，`_index.md` 只覆盖标题，不负责创建路由。

侧栏标签云默认只展示文章数最多的前 10 个标签，可通过 `params.tagCloudLimit` 调整；完整标签列表始终在 `/tags/` 页面展示。

## 配置参考

### 站点参数

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `params.mainSections` | string array | Hugo 自动推断 | 首页展示的内容分区，推荐设为 `["posts"]` |
| `params.avatar` | string | `avatar.png`（需自行提供） | 本地站点路径或完整 HTTPS 地址；建议显式设置 |
| `params.hitokoto` | string | 内置中文句子 | 页面底部的一言文字 |
| `params.footer` | string (HTML) | 主题内置版权信息 | 自定义侧栏页脚，支持 HTML；设置后完整替换默认页脚 |
| `params.footerFilings` | array | 空 | 版权行下方的备案信息，每项支持 `text` 与 `url`；仅默认页脚生效 |
| `params.tagCloudLimit` | integer | `10` | 侧栏标签云展示的热门标签数量 |
| `pagination.pagerSize` | integer | `10` | 每页文章数量 |

页脚示例：

```toml
[params]
  footer = '© 2026 <a href="https://example.com">Your Name</a> · Powered by <a href="https://gohugo.io">Hugo</a>'
```

注意：设置 `params.footer` 后会完整替换默认页脚，`params.footerFilings` 不再显示。

备案信息示例（仅在未设置 `params.footer` 时显示）：

```toml
[[params.footerFilings]]
  text = "蒙ICP备2020004404号-1"
  url = "https://beian.miit.gov.cn/"

[[params.footerFilings]]
  text = "蒙公网安备 15022102000024号"
  url = "https://www.beian.gov.cn/portal/registerSystemInfo?recordcode=15022102000024"
```

### 社交链接

`params.social` 每项支持 `name`、`icon`，以及二选一的行为字段：

- `url`：在新标签页打开链接。
- `value`：弹窗显示并允许复制文本，适合微信号等信息。

### 友情链接

`params.links` 每项支持 `name`、`url` 和 `avatar`。图片字段也兼容 `logo`；建议至少设置一个；未设置时会回退到 `images/default-avatar.png`，需确保该文件存在。

### 菜单

导航读取 `menu.main`。`weight` 控制顺序，`menu.main.params.icon` 指定主题图标类名。示例配置包含首页、友情链接、标签和时间线；标签菜单使用 `solo-tags` 图标。

## 创建文章

```bash
hugo new content posts/my-post.md
```

Hugo 会优先使用站点的 `archetypes/posts.md`，没有时使用主题自带的同名文件。生成的 front matter 类似：

```yaml
---
title: "My Post"
date: 2026-10-19T10:00:00+08:00
draft: true
description: ""
cover: ""
categories: []
tags: []
toc: true
---
```

`title` 由文件名生成，`date` 为当前时间；其余字段需要填写。新文章默认 `draft: true`，完成后再改为 `false`，或预览时使用 `hugo server -D`。

填写后的示例：

```yaml
---
title: "文章标题"
date: 2026-10-19T10:00:00+08:00
draft: false
description: "首页显示的文章摘要。"
cover: "images/cover.jpg"
categories: ["技术文章"]
tags: ["Hugo", "写作"]
toc: true
---
```

封面保存到 `static/images/cover.jpg`，配置中使用 `images/cover.jpg`。不要写 `static/` 前缀或硬编码 Pages 项目名。`toc` 默认开启，设置为 `false` 可关闭浮动目录。

## 本地开发

自己的站点：

```bash
hugo server -D
```

主题仓库（从仓库根目录运行）：

```bash
hugo server --source exampleSite --themesDir ../.. --theme hugo-solo-nexmoe
```

示例站点包含首页、标签页、分类页、归档、友情链接和文章页。

生产构建：

```bash
hugo --gc --minify
```

## GitHub Pages

`.github/workflows/pages.yml` 会在 `main` 更新时构建 `exampleSite` 并部署到 GitHub Pages。工作流使用 Hugo 0.161.1，并用 Pages 返回的地址设置 `baseURL`，因此资源和文章链接能保留项目子路径。

复用前请修改站点信息，并在仓库设置中把 Pages Source 设为 **GitHub Actions**。

## 贡献与许可

- [贡献说明](CONTRIBUTING.md)
- [更新记录](CHANGELOG.md)
- [演示图片来源](exampleSite/IMAGE_SOURCES.md)
- [MIT License](LICENSE)

## 致谢

- [Hugo](https://gohugo.io/)
- [MDUI](https://www.mdui.org/)
- [Nexmoe](https://github.com/nexmoe)
- [原始 Hugo Nexmoe 主题](https://github.com/nexmoe/hugo-theme-nexmoe)

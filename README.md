# 偷得浮生

一个使用 Hugo 构建的个人技术博客，主题为 **Hugo Solo Nexmoe**，文章按年月归档，包含标签、分类、友情链接和时间线页面。

## 技术栈

- Hugo `0.128.0` 或更高版本
- 主题：[hugo-solo-nexmoe](https://github.com/zhangzhuo0705/hugo-solo-nexmoe)（Git submodule）
- 输出为纯静态文件，可部署到 GitHub Pages、Gitee Pages、Nginx 或对象存储

## 目录结构

```text
content/
├── posts/YYYY/MM/     文章，按年月分类
└── page/              关于等独立页面

archetypes/
├── default.md         通用内容模板
└── posts.md           新文章模板，包含完整 front matter

hugo.toml              站点配置
themes/hugo-solo-nexmoe/  主题子模块
```

`/tags/`、`/links/`、`/archives/` 由主题内容与 Hugo taxonomy 自动生成，不需要在站点中重复创建。

## 本地开发

首次克隆时带上子模块：

```bash
git clone --recurse-submodules git@gitee.com:zhang-zhuo-0705/bolo.git
cd bolo
```

已经克隆但缺少主题时：

```bash
git submodule update --init --recursive
```

启动本地预览：

```bash
hugo server
```

需要查看草稿：

```bash
hugo server -D
```

## 新建文章

```bash
hugo new content posts/my-post.md
```

命令会使用 `archetypes/posts.md` 生成 front matter，包括标题、日期、摘要、封面、分类、标签和目录开关。新文章默认 `draft: true`，完成后改为 `false` 再发布。

## 构建

```bash
hugo --gc --minify
```

构建结果输出到 `public/`。如果之前构建过旧内容，建议先清理：

```bash
hugo --cleanDestinationDir --gc --minify
```

`public/`、`resources/` 和 `.hugo_build.lock` 已加入 `.gitignore`，不需要提交。

## 配置

站点配置在 `hugo.toml`，主题参数说明见：

```text
themes/hugo-solo-nexmoe/README.md
```

常用配置：

- `baseURL`：部署根地址，必须以 `/` 结尾；GitHub Pages/Gitee Pages 项目页需要包含仓库名
- `title`：站点标题
- `params.avatar`：侧栏头像
- `params.tagCloudLimit`：侧栏热门标签数量，默认 10
- `params.footer` / `params.footerFilings`：页脚和备案信息
- `menu.main`：导航菜单

当前 `baseURL` 指向 GitHub Pages。部署到 Gitee Pages 或其他域名前，请改为实际地址。

## 主题子模块

主题仓库：

```text
https://github.com/zhangzhuo0705/hugo-solo-nexmoe
```

更新子模块：

```bash
git submodule update --init --recursive
```

提交主题相关改动时，需要先在 `themes/hugo-solo-nexmoe` 内提交并推送，再在主仓库提交子模块指针。

## 部署提示

- 静态托管平台构建命令：`hugo --gc --minify`
- 发布目录：`public`
- 如果平台无法访问 GitHub，可将主题镜像到 Gitee，并同步修改 `.gitmodules` 中的主题地址。

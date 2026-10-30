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

## 容器化与 CI

仓库内提供了完整的镜像构建与推送配置：

- `Dockerfile`：多阶段构建，Hugo 生成静态文件后由 Nginx 提供服务
- `deploy/nginx/`：站点配置模板，容器启动时按证书与环境变量生成 HTTP 或 HTTPS 配置
- `deploy/entrypoint.d/10-ssl.sh`：启动时选择模板并渲染 `/etc/nginx/conf.d/default.conf`
- `.github/workflows/docker-publish.yml`：任意分支的代码提交或 `v*` 标签推送时立即构建并推送镜像

镜像地址：

```text
registry.cn-hangzhou.aliyuncs.com/zz-boke/bolo
```

CI 推送需要在仓库 Secrets 中配置：

| Secret | 说明 |
| --- | --- |
| `REGISTRY_USER` | 阿里云容器镜像服务用户名 |
| `REGISTRY_PWD` | 容器镜像服务固定密码（不是阿里云登录密码） |

本地构建、运行与推送：

```bash
docker build -t registry.cn-hangzhou.aliyuncs.com/zz-boke/bolo:latest .
docker run --rm -p 8080:80 registry.cn-hangzhou.aliyuncs.com/zz-boke/bolo:latest
docker push registry.cn-hangzhou.aliyuncs.com/zz-boke/bolo:latest
```

### HTTPS 部署

配置不写死在镜像里。默认 HTTP 模式；把证书挂载到 `/etc/nginx/certs/` 后自动切换为 HTTPS：

```bash
docker run -d --name bolo \
  -p 80:80 -p 443:443 \
  -v /path/to/fullchain.pem:/etc/nginx/certs/fullchain.pem:ro \
  -v /path/to/privkey.pem:/etc/nginx/certs/privkey.pem:ro \
  -e SERVER_NAME=www.zhangzhuo.ltd \
  registry.cn-hangzhou.aliyuncs.com/zz-boke/bolo:latest
```

可用环境变量：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `SSL_ENABLED` | `auto` | `auto` 检测到证书即启用；`true` 强制启用（缺证书启动失败）；`false` 仅 HTTP |
| `SSL_CERT_PATH` | `/etc/nginx/certs/fullchain.pem` | 证书链路径 |
| `SSL_KEY_PATH` | `/etc/nginx/certs/privkey.pem` | 私钥路径 |
| `SERVER_NAME` | `_` | Nginx `server_name` |

HTTPS 模式下：

- 80 端口仅保留 `/healthz` 与 `/.well-known/acme-challenge/`，其余 301 跳转 HTTPS
- 启用 TLS 1.2/1.3、HTTP/2、HSTS（1 年）
- 证书续期后执行 `docker exec bolo nginx -s reload` 即可生效，无需重建镜像

Docker 构建需要主题子模块已检出，CI 中已通过 `submodules: recursive` 处理。

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

# Contributing to Hugo Solo Nexmoe

感谢你愿意改进 Hugo Solo Nexmoe。提交 Issue 或 Pull Request 前，请先确认问题能在当前 `main` 分支复现。

## 报告问题

请提供问题描述、预期行为、最小复现步骤、Hugo/操作系统/浏览器版本，以及必要的配置、日志或截图。请先删除密钥和个人信息。

## 提议功能

请先搜索现有 Issue。新提议应说明使用场景、期望行为，以及为什么适合由主题统一实现。

## 本地开发

```bash
git clone https://github.com/zhangzhuo0705/hugo-solo-nexmoe.git
cd hugo-solo-nexmoe
hugo server --source exampleSite --themesDir ../.. --theme hugo-solo-nexmoe
```

## 提交前验证

```bash
HUGO_CACHEDIR=/tmp/hugo-cache hugo \
  --source exampleSite \
  --themesDir ../.. \
  --theme hugo-solo-nexmoe \
  --baseURL "https://zhangzhuo0705.github.io/hugo-solo-nexmoe/" \
  --destination /tmp/hugo-solo-nexmoe-public \
  --cleanDestinationDir \
  --gc \
  --minify
```

构建必须无错误、无警告。还应检查首页、文章页、标签、分类、归档、友情链接和 404 页面；涉及图片或导航时，确认 URL 包含正确的项目子路径。

## 内容与文档

- 示例文章使用完整 front matter，并提供可独立理解的正文。
- 示例代码声明运行条件，并处理文章声称支持的失败场景。
- 新增外部图片时，确认再分发许可并更新 `exampleSite/IMAGE_SOURCES.md`。
- 修改配置或用户可见行为时，同步更新 `README.md` 和 `CHANGELOG.md`。

## 代码风格

- Go 模板和 HTML 使用四个空格缩进。
- CSS 和 JavaScript 遵循相邻代码的现有风格。
- 静态资源和内部链接必须兼容非根路径部署。
- 只为复杂或容易误解的逻辑添加注释。
- 不提交 `public/`、`resources/` 或本地缓存目录。

## 提交流程

1. Fork 仓库并创建目标明确的分支。
2. 完成改动和本地验证。
3. 使用简洁的提交信息说明结果。
4. 推送分支并创建 Pull Request。
5. 在 PR 描述中写明验证命令和界面变化。

提交代码即表示你同意按仓库的 [MIT License](LICENSE) 发布贡献。参与讨论时请保持友善、尊重，并接受建设性的代码审查。

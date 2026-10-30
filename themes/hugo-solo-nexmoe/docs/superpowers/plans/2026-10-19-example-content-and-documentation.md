# Example Content and Documentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace five placeholder posts with a realistic Chinese demo blog and align documentation and Hugo metadata with current behavior.

**Architecture:** Keep content, configuration metadata, guides, and changelog in focused commits. Reuse the existing local covers, explicitly constrain the home page to `posts`, and verify source plus generated GitHub Pages output.

**Tech Stack:** Hugo 0.128.0+, Markdown, TOML, JavaScript, Python/pandas, Bash, GitHub Actions.

---

## File Structure

- Replace all five Markdown files in `exampleSite/content/posts/`; do not add redirects.
- Rewrite `README.md` and `CONTRIBUTING.md` as the current user and contributor guides.
- Update `CHANGELOG.md`, `theme.toml`, `hugo.toml`, and `exampleSite/hugo.toml`.

### Task 1: Replace the five example articles

**Files:**
- Delete: `exampleSite/content/posts/hello-world.md`
- Delete: `exampleSite/content/posts/hugo-guide.md`
- Delete: `exampleSite/content/posts/post1.md`
- Delete: `exampleSite/content/posts/post2.md`
- Delete: `exampleSite/content/posts/post3.md`
- Create: `exampleSite/content/posts/build-a-hugo-blog.md`
- Create: `exampleSite/content/posts/configure-hugo-solo-nexmoe.md`
- Create: `exampleSite/content/posts/javascript-async-practice.md`
- Create: `exampleSite/content/posts/python-data-analysis-notes.md`
- Create: `exampleSite/content/posts/weekend-mountain-hike.md`

- [ ] **Step 1: Prove the replacement has not happened**

Run `test ! -e exampleSite/content/posts/hello-world.md`.

Expected: status 1 because the old article exists.

- [ ] **Step 2: Delete the five old files with `apply_patch`**

Delete exactly the five paths listed above. Do not add `aliases` to any new article.

- [ ] **Step 3: Write `build-a-hugo-blog.md`**

Use title `从零搭建一个 Hugo 博客`, date `2026-10-15T09:00:00+08:00`, description `从创建站点、安装主题到编写第一篇文章，完成一个可本地预览的 Hugo 博客。`, cover `images/cover1.jpg`, category `Hugo 实践`, tags `Hugo`, `静态网站`, `入门`, and `toc: true`.

Write complete sections `准备环境`, `创建站点`, `安装主题`, `写第一篇文章`, `本地预览`, and `下一步`. Include executable commands for `git --version`, `hugo version`, `hugo new site my-blog`, `git init`, the repository's `git submodule add`, `hugo new content posts/first-post.md`, `hugo server -D`, and `hugo --gc --minify`. Include a directory tree for `content`, `static`, `themes`, and `hugo.toml`, plus a minimal TOML example with `mainSections = ["posts"]`. Explain that `static/images/cover.jpg` is referenced as `images/cover.jpg`. End with `内容比工具更重要，但可靠的工具能让写作更轻松。`.

- [ ] **Step 4: Write `configure-hugo-solo-nexmoe.md`**

Use title `Hugo Solo Nexmoe 配置指南`, date `2026-10-12T14:30:00+08:00`, the approved theme-configuration description, cover `images/cover2.jpg`, category `Hugo 实践`, tags `Hugo` and `主题配置`, and `toc: true`.

Write sections `基础配置`, `社交链接`, `导航菜单`, `友情链接`, `分页与目录`, `文章字段`, and `配置原则`. Copy working values from `exampleSite/hugo.toml`; demonstrate both social `url` and `value`; include all three menus; include exact archetype copy commands; document `avatar`/`logo` compatibility; include `[pagination]`, `[markup.tableOfContents]`, and all eight article fields. Explain local/HTTPS avatars, summary fallback, first-category display, multiple tags, and project-subpath-safe `images/...` paths.

- [ ] **Step 5: Write `javascript-async-practice.md`**

Use title `JavaScript 异步请求的可靠写法`, date `2026-10-09T20:00:00+08:00`, the approved async description, cover `images/post1.jpg`, category `前端开发`, tags `JavaScript` and `异步编程`, and `toc: true`.

Define `HttpError` with `status` and `TimeoutError` with the timeout value. Implement `fetchJSON(url, { timeout = 5000 } = {})` using `AbortController`, a timer, `Accept: application/json`, `response.ok`, JSON parsing, AbortError conversion, rethrowing of other errors, and `clearTimeout` in `finally`. Add a browser-console `loadPost()` using `https://jsonplaceholder.typicode.com/posts/1` and separately handle HTTP, timeout, and other failures. Explain each branch and end with selective retry, UI state, safe message, and component teardown recommendations.

- [ ] **Step 6: Write `python-data-analysis-notes.md`**

Use title `用 pandas 完成一次小型数据分析`, date `2026-10-06T19:30:00+08:00`, the approved pandas description, cover `images/post2.jpg`, category `数据分析`, tags `Python` and `pandas`, and `toc: true`.

Include `python -m pip install pandas` and an inline `hiking.csv` with five rows, including one missing distance and one `not-recorded` distance. Provide a complete `analyze.py` that uses `Path`, parses dates, applies `pd.to_numeric(..., errors="coerce")` to distance and duration, drops missing required values, rejects non-positive values, calculates pace, groups by route for count/total/mean, rounds output, writes `route-summary.csv`, and prints valid/total counts. Add a snippet that prints invalid rows and explain why cleaning occurs before aggregation.

- [ ] **Step 7: Write `weekend-mountain-hike.md`**

Use title `沿着林间小路走到山顶`, date `2026-10-02T18:00:00+08:00`, the approved hiking description, cover `images/post3.jpg`, category `生活随笔`, tags `徒步` and `周末`, and `toc: true`.

Write a first-person essay with sections `出发前`, `走进树林`, `山脊上的风`, `下山以后`, and `给下一次的提醒`. Include a four-item packing list, `![林间徒步小路](../../images/post3.jpg)`, the quotation `徒步的意义不只是抵达山顶，也是在一步一步之间重新感受时间。`, and four safety/Leave No Trace reminders.

- [ ] **Step 8: Validate and commit content**

```bash
test "$(find exampleSite/content/posts -maxdepth 1 -type f -name '*.md' | wc -l)" -eq 5
for file in exampleSite/content/posts/*.md; do
  for field in title date draft description cover categories tags toc; do
    rg -q "^${field}:" "$file"
  done
done
! rg -n '^views:|^aliases:' exampleSite/content/posts
rg -q 'class HttpError extends Error' exampleSite/content/posts/javascript-async-practice.md
rg -q 'errors="coerce"' exampleSite/content/posts/python-data-analysis-notes.md
rg -q '\.\./\.\./images/post3\.jpg' exampleSite/content/posts/weekend-mountain-hike.md
```

Expected: status 0. Then commit all post deletions/additions as `content: rewrite example articles`.

### Task 2: Align configuration metadata

**Files:**
- Modify: `exampleSite/hugo.toml:6`
- Modify: `theme.toml:10`
- Modify: `hugo.toml:3`

- [ ] **Step 1: Run failing checks**

```bash
! rg -n '0\.80\.0' theme.toml hugo.toml
rg -q 'mainSections = \["posts"\]' exampleSite/hugo.toml
```

Expected: both checks fail.

- [ ] **Step 2: Apply exact metadata values**

Add `mainSections = ["posts"]` as the first value under `[params]` in `exampleSite/hugo.toml`. Change `theme.toml` `min_version` and root `hugo.toml` `module.hugoVersion.min` to `"0.128.0"`.

- [ ] **Step 3: Verify and commit**

```bash
! rg -n '0\.80\.0' theme.toml hugo.toml
test "$(rg -c '0\.128\.0' theme.toml hugo.toml)" -eq 2
test "$(rg -c 'mainSections = \["posts"\]' exampleSite/hugo.toml)" -eq 1
```

Expected: status 0. Commit the three files as `fix: align Hugo version metadata`.

### Task 3: Rewrite user and contributor guides

**Files:**
- Modify: `README.md`
- Modify: `CONTRIBUTING.md`

- [ ] **Step 1: Expose obsolete documentation**

Run `rg -n '0\.80\.0|HTML 模板使用 2 个空格|cd hugo-solo-nexmoe/exampleSite' README.md CONTRIBUTING.md`.

Expected: old version or development text is found.

- [ ] **Step 2: Rewrite `README.md` in exact section order**

Use: `功能`, `环境要求`, `安装`, `最小配置`, `特殊页面`, `配置参考` with subsections for site/social/link/menu data, `创建文章`, `本地开发`, `GitHub Pages`, `贡献与许可`, and `致谢`.

Retain license/screenshot badges, change the Hugo badge to `>=0.128.0`, and add the live demo. Include a copyable config covering `mainSections`, avatar, hitokoto, social/link entries, all three menus, taxonomies, pagination, and TOC markup. Document all eight article fields and `images/...` paths. Include the site-root and theme-repository preview commands plus production build. Describe the existing Pages workflow's Hugo 0.161.1 and dynamic Pages `baseURL`. Link `CONTRIBUTING.md`, `CHANGELOG.md`, `exampleSite/IMAGE_SOURCES.md`, `LICENSE`, Hugo, MDUI, Nexmoe, and the original Hugo theme. Do not document comments.

- [ ] **Step 3: Rewrite `CONTRIBUTING.md`**

Use sections `报告问题`, `提议功能`, `本地开发`, `提交前验证`, `内容与文档`, `代码风格`, and `提交流程`. Run the example from repository root with `hugo server --source exampleSite --themesDir ../.. --theme hugo-solo-nexmoe`. Provide a multiline production check using `HUGO_CACHEDIR=/tmp/hugo-cache`, the Pages base URL, `/tmp/hugo-solo-nexmoe-public`, and `--cleanDestinationDir --gc --minify`. Require review of home, article, taxonomy, archive, links, and 404 pages. State four-space template indentation, subpath-safe URLs, image-license documentation, and excluded build/cache directories.

- [ ] **Step 4: Verify and commit guides**

```bash
! rg -n '0\.80\.0|HTML 模板使用 2 个空格|cd hugo-solo-nexmoe/exampleSite' README.md CONTRIBUTING.md
rg -q 'hugo server --source exampleSite --themesDir ../\.\.' README.md CONTRIBUTING.md
rg -q 'mainSections' README.md
rg -q 'GitHub Actions' README.md
rg -q '四个空格' CONTRIBUTING.md
```

Expected: status 0. Commit both files as `docs: align usage and contribution guides`.

### Task 4: Update the changelog

**Files:**
- Modify: `CHANGELOG.md:8`

- [ ] **Step 1: Confirm `Unreleased` is empty**

Run `sed -n '/## \[Unreleased\]/,/## \[1\.0\.0\]/p' CHANGELOG.md`.

Expected: no change entries.

- [ ] **Step 2: Add complete release notes**

Under `Added`, record Pages deployment, local CC0 images/source documentation, and five rewritten articles. Under `Changed`, record avatar/imagery, README/contribution rewrite, minimum Hugo 0.128.0, and 3:2 screenshot. Under `Fixed`, record project-subpath URLs and removed article views.

- [ ] **Step 3: Verify and commit**

```bash
rg -q 'GitHub Actions workflow' CHANGELOG.md
rg -q '0.128.0' CHANGELOG.md
rg -q 'view-count' CHANGELOG.md
```

Expected: status 0. Commit as `docs: update unreleased changelog`.

### Task 5: Validate and deploy

**Files:**
- Generated only: `/tmp/hugo-content-docs-public/`

- [ ] **Step 1: Build with the Pages path**

```bash
HUGO_CACHEDIR=/tmp/hugo-cache hugo --source exampleSite --themesDir ../.. --theme hugo-solo-nexmoe --baseURL "https://zhangzhuo0705.github.io/hugo-solo-nexmoe/" --destination /tmp/hugo-content-docs-public --cleanDestinationDir --gc --minify
```

Expected: status 0 with no warnings.

- [ ] **Step 2: Validate output**

```bash
for slug in build-a-hugo-blog configure-hugo-solo-nexmoe javascript-async-practice python-data-analysis-notes weekend-mountain-hike; do
  test -f "/tmp/hugo-content-docs-public/posts/${slug}/index.html"
  rg -q '/hugo-solo-nexmoe/images/' "/tmp/hugo-content-docs-public/posts/${slug}/index.html"
done
for slug in hello-world hugo-guide post1 post2 post3; do
  test ! -e "/tmp/hugo-content-docs-public/posts/${slug}/index.html"
done
! rg -n '/hugo-solo-nexmoe/page/about/' /tmp/hugo-content-docs-public/index.html
! rg -n 'solo-heat|浏览' /tmp/hugo-content-docs-public/posts/*/index.html
```

Expected: only the five new routes exist, image URLs retain the project prefix, independent pages stay off the home list, and view counts remain absent.

- [ ] **Step 3: Push and confirm Pages**

Verify `git status --short --branch` is clean, review `git log --oneline -8`, and run `git push origin main`. Query the public Actions API until the newest `pages.yml` run for local `HEAD` is `completed` with conclusion `success`. Fetch the live home page and one new article and confirm the new title plus project-prefixed cover URL.

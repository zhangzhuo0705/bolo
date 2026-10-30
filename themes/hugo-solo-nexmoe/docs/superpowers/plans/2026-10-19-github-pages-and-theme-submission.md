# GitHub Pages Demo and Theme Submission Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (\`- [ ]\`) syntax for tracking.

**Goal:** Automatically publish \`exampleSite\` to GitHub Pages and make the repository pass the Hugo Themes submission checks.

**Architecture:** Keep the repository root as the reusable theme and build \`exampleSite/\` as its public demo. Hugo-aware relative URLs support the Pages project path, while an official Pages workflow builds, uploads, and deploys the generated site.

**Tech Stack:** Hugo, Go templates, TOML, GitHub Actions, GitHub Pages, PNG assets

---

### Task 1: Normalize the example site

**Files:**
- Modify: \`exampleSite/hugo.toml\`
- Delete: \`exampleSite/config.toml\`

- [ ] **Step 1: Prove duplicate configuration exists**

~~~bash
test "$(find exampleSite -maxdepth 1 -type f \( -name 'hugo.toml' -o -name 'config.toml' \) | wc -l)" -eq 1
~~~

Expected: FAIL because two configuration files exist.

- [ ] **Step 2: Make \`hugo.toml\` canonical**

Set its leading values to:

~~~toml
baseURL = "https://zhangzhuo0705.github.io/hugo-solo-nexmoe/"
locale = "zh-cn"
title = "Hugo Solo Nexmoe 示例博客"
theme = "hugo-solo-nexmoe"

[params]
  avatar = "images/avatar.png"
~~~

Preserve the remaining site settings and delete \`exampleSite/config.toml\`.

- [ ] **Step 3: Verify configuration**

~~~bash
test "$(find exampleSite -maxdepth 1 -type f \( -name 'hugo.toml' -o -name 'config.toml' \) | wc -l)" -eq 1
rg -n '^locale = "zh-cn"$|^theme = "hugo-solo-nexmoe"$|^  avatar = "images/avatar.png"$' exampleSite/hugo.toml
! rg -n '^languageCode\s*=' exampleSite/hugo.toml
~~~

Expected: PASS with one current configuration.

- [ ] **Step 4: Commit**

~~~bash
git add exampleSite/hugo.toml exampleSite/config.toml
git commit -m "fix: normalize example site configuration"
~~~

### Task 2: Make URLs safe below a base path

**Files:**
- Modify: \`layouts/partials/header.html\`
- Modify: \`layouts/partials/sidebar.html\`

- [ ] **Step 1: Reproduce the invalid output**

~~~bash
HUGO_CACHEDIR=/tmp/hugo-solo-nexmoe-cache hugo --source exampleSite --themesDir ../.. --theme hugo-solo-nexmoe --baseURL https://zhangzhuo0705.github.io/hugo-solo-nexmoe/ --destination /tmp/hugo-solo-nexmoe-before
rg -n 'href=/ |src=/images/avatar\.png' /tmp/hugo-solo-nexmoe-before/index.html
~~~

Expected: root-relative home or avatar URLs are found.

- [ ] **Step 2: Fix home URLs**

In both partials replace:

~~~go-html-template
{{ "/" | relURL }}
~~~

with:

~~~go-html-template
{{ "" | relURL }}
~~~

The avatar value fixed in Task 1 continues through \`relURL\`.

- [ ] **Step 3: Verify project-scoped output**

~~~bash
HUGO_CACHEDIR=/tmp/hugo-solo-nexmoe-cache hugo --source exampleSite --themesDir ../.. --theme hugo-solo-nexmoe --baseURL https://zhangzhuo0705.github.io/hugo-solo-nexmoe/ --destination /tmp/hugo-solo-nexmoe-url-check --cleanDestinationDir --gc --minify
rg -n '/hugo-solo-nexmoe/(css/base\.css|js/app\.js|images/avatar\.png)' /tmp/hugo-solo-nexmoe-url-check/index.html
! rg -n 'href=/([ >])|src=/images/' /tmp/hugo-solo-nexmoe-url-check/index.html
~~~

Expected: assets include the repository prefix and checked URLs do not target the domain root.

- [ ] **Step 4: Commit**

~~~bash
git add layouts/partials/header.html layouts/partials/sidebar.html
git commit -m "fix: support deployment below a base path"
~~~

### Task 3: Correct identity and documentation

**Files:**
- Modify: \`theme.toml\`
- Modify: \`README.md\`
- Modify: \`CONTRIBUTING.md\`
- Modify: \`LICENSE\`
- Modify: \`layouts/partials/sidebar.html\`
- Modify: \`static/js/canvas.js\`
- Modify: \`exampleSite/content/page/about.md\`
- Modify: \`exampleSite/content/posts/hello-world.md\`
- Modify: \`exampleSite/content/posts/hugo-guide.md\`

- [ ] **Step 1: Record stale identities**

~~~bash
rg -n -i 'yourname|bolo-demo|themes/bolo|cd bolo|theme\s*=\s*"bolo"|\bBolo\b' --glob '!docs/superpowers/**' --glob '!images/**' .
~~~

Expected: placeholder and old-name references are listed.

- [ ] **Step 2: Replace \`theme.toml\` metadata**

~~~toml
name = "Hugo Solo Nexmoe"
license = "MIT"
licenselink = "https://github.com/zhangzhuo0705/hugo-solo-nexmoe/blob/main/LICENSE"
description = "A clean and responsive Hugo blog theme converted from solo-nexmoe, featuring MDUI framework and canvas background animation"
homepage = "https://github.com/zhangzhuo0705/hugo-solo-nexmoe"
demosite = "https://zhangzhuo0705.github.io/hugo-solo-nexmoe/"

[author]
  name = "zhangzhuo0705"
  homepage = "https://github.com/zhangzhuo0705"
~~~

Preserve tags, features, version requirements, and original-theme attribution.

- [ ] **Step 3: Update all public examples**

Use \`Hugo Solo Nexmoe\` as the display name, real repository URLs, \`themes/hugo-solo-nexmoe\` as the installation directory, \`theme = "hugo-solo-nexmoe"\`, and \`exampleSite/hugo.toml\` as the copied configuration. Remove the fake email instead of publishing it.

Change the sidebar credit to:

~~~html
Theme <a rel="friend" href="https://github.com/zhangzhuo0705/hugo-solo-nexmoe" target="_blank">Hugo Solo Nexmoe</a>
~~~

Use \`zhangzhuo0705\` in the MIT copyright and \`Hugo Solo Nexmoe\` in the JavaScript header.

- [ ] **Step 4: Verify placeholder removal**

~~~bash
! rg -n -i 'yourname|bolo-demo|themes/bolo|cd bolo|theme\s*=\s*"bolo"|\bBolo\b' --glob '!docs/superpowers/**' --glob '!images/**' .
rg -n 'homepage = "https://github.com/zhangzhuo0705/hugo-solo-nexmoe"|demosite = "https://zhangzhuo0705.github.io/hugo-solo-nexmoe/"' theme.toml
~~~

Expected: no stale identities and both public URLs are printed.

- [ ] **Step 5: Commit**

~~~bash
git add theme.toml README.md CONTRIBUTING.md LICENSE layouts/partials/sidebar.html static/js/canvas.js exampleSite/content
git commit -m "docs: replace theme template placeholders"
~~~

### Task 4: Add GitHub Pages deployment

**Files:**
- Create: \`.github/workflows/pages.yml\`

- [ ] **Step 1: Confirm the workflow is absent**

~~~bash
test -f .github/workflows/pages.yml
~~~

Expected: FAIL.

- [ ] **Step 2: Create the official-style workflow**

~~~yaml
name: Deploy Hugo demo to Pages

on:
  push:
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    env:
      HUGO_VERSION: 0.161.1
    steps:
      - name: Install Hugo CLI
        run: |
          wget -O "\${{ runner.temp }}/hugo.deb" "https://github.com/gohugoio/hugo/releases/download/v\${HUGO_VERSION}/hugo_extended_\${HUGO_VERSION}_linux-amd64.deb"
          sudo dpkg -i "\${{ runner.temp }}/hugo.deb"
      - name: Checkout
        uses: actions/checkout@v7
      - name: Configure Pages
        id: pages
        uses: actions/configure-pages@v6
      - name: Build demo
        env:
          HUGO_CACHEDIR: \${{ runner.temp }}/hugo_cache
          HUGO_ENVIRONMENT: production
        run: >-
          hugo --source exampleSite --themesDir ../..
          --theme hugo-solo-nexmoe
          --baseURL "\${{ steps.pages.outputs.base_url }}/"
          --destination "\${{ github.workspace }}/public"
          --cleanDestinationDir --gc --minify
      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v4
        with:
          path: ./public

  deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v5
~~~

- [ ] **Step 3: Validate workflow structure**

~~~bash
python3 -c 'import yaml; yaml.safe_load(open(".github/workflows/pages.yml")); print("valid YAML")'
rg -n 'actions/configure-pages@v6|actions/upload-pages-artifact@v4|actions/deploy-pages@v5|pages: write|id-token: write' .github/workflows/pages.yml
~~~

Expected: \`valid YAML\` and all required actions and permissions.

- [ ] **Step 4: Commit**

~~~bash
git add .github/workflows/pages.yml
git commit -m "ci: deploy example site to GitHub Pages"
~~~

### Task 5: Correct submission media

**Files:**
- Modify: \`images/screenshot.png\`

- [ ] **Step 1: Confirm ratio failure**

~~~bash
identify -format '%w %h\n' images/screenshot.png
~~~

Expected: \`3072 1582\`, not 3:2.

- [ ] **Step 2: Create a content-preserving crop**

Use the image editing tool with \`images/screenshot.png\` as its reference. Request a centered 3:2 crop that preserves the captured page without restyling, adding, or removing UI elements. Normalize dimensions to 2373 x 1582 only if necessary.

- [ ] **Step 3: Preview and validate**

Show original and cropped images side by side with the visual companion, then run:

~~~bash
test "$(identify -format '%w %h' images/screenshot.png)" = "2373 1582"
test "$(identify -format '%w %h' images/tn.png)" = "900 600"
~~~

Expected: both tests pass.

- [ ] **Step 4: Commit**

~~~bash
git add images/screenshot.png
git commit -m "fix: use a 3:2 theme screenshot"
~~~

### Task 6: Complete verification and rollout

**Files:**
- Verify all modified files

- [ ] **Step 1: Build production output**

~~~bash
HUGO_CACHEDIR=/tmp/hugo-solo-nexmoe-final-cache hugo --source exampleSite --themesDir ../.. --theme hugo-solo-nexmoe --baseURL https://zhangzhuo0705.github.io/hugo-solo-nexmoe/ --destination /tmp/hugo-solo-nexmoe-final --cleanDestinationDir --gc --minify
~~~

Expected: exit code 0 and no Hugo warnings.

- [ ] **Step 2: Check URLs and placeholders**

~~~bash
rg -n '/hugo-solo-nexmoe/(css/base\.css|js/app\.js|images/avatar\.png)' /tmp/hugo-solo-nexmoe-final/index.html
! rg -n 'href=/([ >])|src=/images/' /tmp/hugo-solo-nexmoe-final/index.html
! rg -n -i 'yourname|bolo-demo' --glob '!docs/superpowers/**' .
~~~

Expected: project-prefixed assets and no live placeholders.

- [ ] **Step 3: Check repository integrity**

~~~bash
git diff --check
git status --short
git log --oneline -6
~~~

Expected: no whitespace errors and only intentional changes.

- [ ] **Step 4: Publish after separate authorization**

Push \`main\` only after user authorization. In Settings > Pages, choose GitHub Actions if it is not enabled automatically. Confirm the workflow and demo URL succeed before opening a new Hugo Themes pull request.

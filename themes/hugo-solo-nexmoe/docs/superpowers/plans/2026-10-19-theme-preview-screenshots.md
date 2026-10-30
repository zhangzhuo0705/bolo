# Theme Preview Screenshots Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace both theme preview PNGs with current, PR-compliant native-viewport captures of the deployed example site.

**Architecture:** Use installed headless Google Chrome for a 1500 × 1000 main capture and an 1800 × 1200 desktop virtual viewport rendered at device scale 0.5 for the 900 × 600 thumbnail. Wait five seconds of virtual time for lazy images, the external avatar, fonts, and Canvas initialization, then validate dimensions and inspect both images before committing.

**Tech Stack:** Google Chrome headless mode, ImageMagick `identify`, Hugo demo on GitHub Pages, Git.

---

## File Structure

- Replace `images/screenshot.png` with a 1500 × 1000 desktop capture.
- Replace `images/tn.png` with a 900 × 600 desktop-layout capture showing two complete posts and the beginning of the third.
- Do not create scripts or retain Chrome profile/cache data in the repository.

### Task 1: Capture the current deployed homepage

**Files:**
- Replace: `images/screenshot.png`
- Replace: `images/tn.png`

- [ ] **Step 1: Demonstrate that the current media is stale**

Run:

```bash
identify -format '%f %m %wx%h\n' images/screenshot.png images/tn.png
```

Expected: `screenshot.png` reports `2373x1582` and `tn.png` reports `900x600`; the screenshot is not the exact target size and the thumbnail is the old blue placeholder.

- [ ] **Step 2: Confirm the deployed homepage is available**

Run:

```bash
curl -fsSL -o /tmp/hugo-preview-home.html "https://zhangzhuo0705.github.io/hugo-solo-nexmoe/"
rg -q '从零搭建一个 Hugo 博客' /tmp/hugo-preview-home.html
rg -q '/hugo-solo-nexmoe/images/cover1\.jpg' /tmp/hugo-preview-home.html
```

Expected: all commands exit with status 0, proving the live site contains the new content before capture.

- [ ] **Step 3: Capture the exact 1500 × 1000 screenshot**

Run:

```bash
preview_profile_large="$(mktemp -d /tmp/hugo-preview-large.XXXXXX)"
google-chrome \
  --headless=new \
  --no-sandbox \
  --disable-gpu \
  --hide-scrollbars \
  --force-device-scale-factor=1 \
  --window-size=1500,1000 \
  --virtual-time-budget=5000 \
  --user-data-dir="$preview_profile_large" \
  --screenshot="$(pwd)/images/screenshot.png" \
  "https://zhangzhuo0705.github.io/hugo-solo-nexmoe/"
```

Expected: Chrome exits successfully and writes a page-only PNG without browser chrome.

- [ ] **Step 4: Capture the desktop-layout 900 × 600 thumbnail**

Run:

```bash
preview_profile_small="$(mktemp -d /tmp/hugo-preview-small.XXXXXX)"
google-chrome \
  --headless=new \
  --no-sandbox \
  --disable-gpu \
  --hide-scrollbars \
  --force-device-scale-factor=0.5 \
  --window-size=1800,1200 \
  --virtual-time-budget=5000 \
  --user-data-dir="$preview_profile_small" \
  --screenshot="$(pwd)/images/tn.png" \
  "https://zhangzhuo0705.github.io/hugo-solo-nexmoe/"
```

Expected: Chrome writes a 900 × 600 PNG that retains the desktop layout and shows more vertical content than a direct resize of the main screenshot.

- [ ] **Step 5: Validate format, dimensions, aspect ratio, and README reference**

Run:

```bash
test "$(identify -format '%m %wx%h' images/screenshot.png)" = "PNG 1500x1000"
test "$(identify -format '%m %wx%h' images/tn.png)" = "PNG 900x600"
test "$((1500 * 2))" -eq "$((1000 * 3))"
test "$((900 * 2))" -eq "$((600 * 3))"
rg -q 'https://raw\.githubusercontent\.com/zhangzhuo0705/hugo-solo-nexmoe/main/images/screenshot\.png' README.md
```

Expected: every command exits with status 0.

- [ ] **Step 6: Inspect both images visually**

Open `images/screenshot.png` and `images/tn.png` at original detail. Confirm the thumbnail shows the current avatar, complete sidebar, first two complete article cards, and the beginning of the third; and contains no placeholder blocks, old titles, browser chrome, distortion, or loading failures.

- [ ] **Step 7: Review and commit the focused diff**

Run:

```bash
git diff --stat
git status --short --branch
git add images/screenshot.png images/tn.png
git commit -m "docs: refresh theme preview images"
```

Expected: the image commit contains exactly the two PNG replacements. The earlier design and plan documents remain separate commits.

### Task 2: Push and validate raw GitHub media

**Files:**
- Remote validation only.

- [ ] **Step 1: Push the clean branch**

Run:

```bash
git status --short --branch
git push origin main
```

Expected: the working tree is clean before push and `main` pushes successfully.

- [ ] **Step 2: Verify the remote files**

Run after GitHub serves the new commit:

```bash
curl -fsSL -o /tmp/hugo-remote-screenshot.png "https://raw.githubusercontent.com/zhangzhuo0705/hugo-solo-nexmoe/main/images/screenshot.png"
curl -fsSL -o /tmp/hugo-remote-tn.png "https://raw.githubusercontent.com/zhangzhuo0705/hugo-solo-nexmoe/main/images/tn.png"
test "$(identify -format '%m %wx%h' /tmp/hugo-remote-screenshot.png)" = "PNG 1500x1000"
test "$(identify -format '%m %wx%h' /tmp/hugo-remote-tn.png)" = "PNG 900x600"
```

Expected: both raw URLs download successfully and match the required format and exact dimensions.

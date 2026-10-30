# Demo Imagery and Article Metadata Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the demo placeholders with locally stored CC0 landscape photographs, use the requested avatar, and remove unsupported article view counts.

**Architecture:** Keep the existing image filenames and content references so no template or front-matter migration is needed. Download six CC0 originals from Wikimedia Commons, normalize them to 1200 × 600 JPEGs with ImageMagick, document provenance beside the example site, then update the avatar and remove the view-count presentation and sample data.

**Tech Stack:** Hugo 0.161.1, TOML, Go templates, Markdown/YAML front matter, curl, ImageMagick (`convert` and `identify`), Git.

---

## File Structure

- Create `exampleSite/IMAGE_SOURCES.md` as the durable title/creator/source/license record for bundled demo photography.
- Replace `exampleSite/static/images/cover1.jpg`, `cover2.jpg`, `post1.jpg`, `post2.jpg`, `post3.jpg`, and `default-cover.jpg` while preserving their public paths.
- Modify `exampleSite/hugo.toml` to point the example avatar at the owner-provided COS URL.
- Modify `layouts/_default/single.html` to omit the unsupported view-count metadata item.
- Modify `exampleSite/content/posts/post1.md`, `post2.md`, and `post3.md` to remove stale `views` values.

### Task 1: Replace and document the landscape photography

**Files:**
- Create: `exampleSite/IMAGE_SOURCES.md`
- Replace: `exampleSite/static/images/cover1.jpg`
- Replace: `exampleSite/static/images/cover2.jpg`
- Replace: `exampleSite/static/images/post1.jpg`
- Replace: `exampleSite/static/images/post2.jpg`
- Replace: `exampleSite/static/images/post3.jpg`
- Replace: `exampleSite/static/images/default-cover.jpg`

- [ ] **Step 1: Add a failing provenance check**

Run:

```bash
test -f exampleSite/IMAGE_SOURCES.md
```

Expected: exits with status 1 because the source record does not exist yet.

- [ ] **Step 2: Download the selected CC0 originals to a temporary directory**

Run:

```bash
image_source_dir="$(mktemp -d /tmp/hugo-solo-landscapes.XXXXXX)"
curl -fL --retry 3 -o "$image_source_dir/cover1-original.jpg" "https://commons.wikimedia.org/wiki/Special:Redirect/file/Cloudy%20sunrise%20in%20the%20mountains%20%28Unsplash%29.jpg"
curl -fL --retry 3 -o "$image_source_dir/cover2-original.jpg" "https://commons.wikimedia.org/wiki/Special:Redirect/file/Lake%20Unsplash.jpg"
curl -fL --retry 3 -o "$image_source_dir/post1-original.jpg" "https://commons.wikimedia.org/wiki/Special:Redirect/file/Waterfall%20in%20a%20Lush%20Green%20Valley.jpg"
curl -fL --retry 3 -o "$image_source_dir/post2-original.jpg" "https://commons.wikimedia.org/wiki/Special:Redirect/file/Mountain%20lake%20in%20Grand%20Teton%20National%20Park%20%28Unsplash%29.jpg"
curl -fL --retry 3 -o "$image_source_dir/post3-original.jpg" "https://commons.wikimedia.org/wiki/Special:Redirect/file/Forest%20path%20in%20Scotland%20%28Unsplash%29.jpg"
curl -fL --retry 3 -o "$image_source_dir/default-cover-original.jpg" "https://commons.wikimedia.org/wiki/Special:Redirect/file/Landscape%20of%20a%20wild%20forest.jpg"
identify "$image_source_dir"/*.jpg
```

Expected: all six downloads succeed and `identify` reports six valid JPEG images.

- [ ] **Step 3: Center-crop and optimize each photograph**

Run from the same shell so `image_source_dir` remains defined:

```bash
for image_name in cover1 cover2 post1 post2 post3 default-cover; do
  convert "$image_source_dir/${image_name}-original.jpg" \
    -auto-orient \
    -resize '1200x600^' \
    -gravity center \
    -extent 1200x600 \
    -strip \
    -sampling-factor 4:2:0 \
    -quality 86 \
    "exampleSite/static/images/${image_name}.jpg"
done
```

Expected: the six existing placeholder files are replaced by landscape JPEGs without changing their filenames.

- [ ] **Step 4: Add the complete image-source record**

Create `exampleSite/IMAGE_SOURCES.md` with exactly:

```markdown
# Demo Image Sources

The demo photographs below are stored locally, cropped to 1200 × 600 pixels,
and redistributed under the Creative Commons CC0 1.0 Universal Public Domain
Dedication: <https://creativecommons.org/publicdomain/zero/1.0/>.

| Local file | Work | Creator | Source |
| --- | --- | --- | --- |
| `static/images/cover1.jpg` | Cloudy sunrise in the mountains | Karsten Würth | <https://commons.wikimedia.org/wiki/File:Cloudy_sunrise_in_the_mountains_(Unsplash).jpg> |
| `static/images/cover2.jpg` | Lake Unsplash | Tae In Kim | <https://commons.wikimedia.org/wiki/File:Lake_Unsplash.jpg> |
| `static/images/post1.jpg` | Waterfall in a Lush Green Valley | Deshna Subramanian | <https://commons.wikimedia.org/wiki/File:Waterfall_in_a_Lush_Green_Valley.jpg> |
| `static/images/post2.jpg` | Mountain lake in Grand Teton National Park | Alexandre Chambon | <https://commons.wikimedia.org/wiki/File:Mountain_lake_in_Grand_Teton_National_Park_(Unsplash).jpg> |
| `static/images/post3.jpg` | Forest path in Scotland | Alex Holyoake | <https://commons.wikimedia.org/wiki/File:Forest_path_in_Scotland_(Unsplash).jpg> |
| `static/images/default-cover.jpg` | Landscape of a wild forest | SpessiG | <https://commons.wikimedia.org/wiki/File:Landscape_of_a_wild_forest.jpg> |
```

- [ ] **Step 5: Validate dimensions, decoding, provenance coverage, and visual composition**

Run:

```bash
identify -format '%f %m %wx%h\n' exampleSite/static/images/cover1.jpg exampleSite/static/images/cover2.jpg exampleSite/static/images/post1.jpg exampleSite/static/images/post2.jpg exampleSite/static/images/post3.jpg exampleSite/static/images/default-cover.jpg
for image_name in cover1 cover2 post1 post2 post3 default-cover; do
  test "$(identify -format '%m %wx%h' "exampleSite/static/images/${image_name}.jpg")" = "JPEG 1200x600"
  rg -q "static/images/${image_name}\.jpg" exampleSite/IMAGE_SOURCES.md
done
```

Expected: six `JPEG 1200x600` lines and exit status 0. Open the six files and confirm each is a landscape photograph, contains no visible watermark or recognizable person, has no stretching, and retains useful title contrast in its central crop.

- [ ] **Step 6: Commit the local photographs and provenance**

```bash
git add exampleSite/IMAGE_SOURCES.md exampleSite/static/images/cover1.jpg exampleSite/static/images/cover2.jpg exampleSite/static/images/post1.jpg exampleSite/static/images/post2.jpg exampleSite/static/images/post3.jpg exampleSite/static/images/default-cover.jpg
git commit -m "feat: refresh demo landscape images"
```

Expected: one commit containing only the six JPEG replacements and their source record.

### Task 2: Set the requested demo avatar

**Files:**
- Modify: `exampleSite/hugo.toml:7`

- [ ] **Step 1: Verify the desired avatar is not configured yet**

Run:

```bash
rg -n 'avatar = "https://zhangzhuo-1257627961\.cos\.ap-beijing\.myqcloud\.com/boke/boke4\.jpg"' exampleSite/hugo.toml
```

Expected: exits with status 1; the current value is `images/avatar.png`.

- [ ] **Step 2: Replace the avatar setting**

Change the `[params]` entry in `exampleSite/hugo.toml` to:

```toml
[params]
  avatar = "https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com/boke/boke4.jpg"
  hitokoto = "生活不止眼前的代码，还有诗和远方。"
```

- [ ] **Step 3: Verify the configuration contains exactly the requested URL**

Run:

```bash
test "$(rg -c 'avatar = "https://zhangzhuo-1257627961\.cos\.ap-beijing\.myqcloud\.com/boke/boke4\.jpg"' exampleSite/hugo.toml)" = 1
```

Expected: exits with status 0.

- [ ] **Step 4: Commit the avatar configuration**

```bash
git add exampleSite/hugo.toml
git commit -m "feat: update demo avatar"
```

Expected: one commit containing only the example-site avatar change.

### Task 3: Remove unsupported article view counts

**Files:**
- Modify: `layouts/_default/single.html:122-125`
- Modify: `exampleSite/content/posts/post1.md:7`
- Modify: `exampleSite/content/posts/post2.md:7`
- Modify: `exampleSite/content/posts/post3.md:7`

- [ ] **Step 1: Run checks that expose the current view-count UI and sample data**

Run:

```bash
! rg -n 'solo-heat|\.Params\.views|浏览' layouts/_default/single.html
! rg -n '^views:' exampleSite/content
```

Expected: both commands exit with status 1 because the template and three example posts still contain view-count data.

- [ ] **Step 2: Remove the view-count metadata item from the article template**

In `layouts/_default/single.html`, make the post metadata block read:

```go-html-template
    <div class="nexmoe-post-meta">
        <span>
            <i class="nexmoefont iconfont solo-calendarl"></i>{{ .Date.Format "2006-01-02" }}{{ with .Lastmod }}/{{ .Format "2006-01-02" }}{{ end }}
        </span>
        {{ with .Params.categories }}
```

This deletes the complete `<span>` that rendered the heat icon, numeric fallback, and `浏览` label.

- [ ] **Step 3: Remove the three stale front-matter properties**

Delete these exact lines:

```yaml
# exampleSite/content/posts/post1.md
views: 256

# exampleSite/content/posts/post2.md
views: 189

# exampleSite/content/posts/post3.md
views: 98
```

- [ ] **Step 4: Re-run the source checks**

Run:

```bash
! rg -n 'solo-heat|\.Params\.views|浏览' layouts/_default/single.html
! rg -n '^views:' exampleSite/content
```

Expected: both commands exit with status 0 because `rg` finds no matches.

- [ ] **Step 5: Commit the view-count removal**

```bash
git add layouts/_default/single.html exampleSite/content/posts/post1.md exampleSite/content/posts/post2.md exampleSite/content/posts/post3.md
git commit -m "fix: remove unsupported article views"
```

Expected: one commit containing the template and front-matter cleanup.

### Task 4: Build and inspect the complete demo

**Files:**
- Generated only: `/tmp/hugo-solo-nexmoe-public/`

- [ ] **Step 1: Build with the same base URL shape used by GitHub Pages**

Run:

```bash
build_dir="$(mktemp -d /tmp/hugo-solo-nexmoe-public.XXXXXX)"
hugo --source exampleSite --themesDir ../.. --theme hugo-solo-nexmoe --baseURL "https://zhangzhuo0705.github.io/hugo-solo-nexmoe/" --destination "$build_dir" --cleanDestinationDir --gc --minify
```

Expected: Hugo exits with status 0 and prints no warnings or errors.

- [ ] **Step 2: Validate generated avatar, view metadata, and project-prefixed covers**

Run from the same shell so `build_dir` remains defined:

```bash
rg -q 'https://zhangzhuo-1257627961\.cos\.ap-beijing\.myqcloud\.com/boke/boke4\.jpg' "$build_dir/index.html"
! rg -n 'solo-heat|浏览' "$build_dir/posts"/*/index.html
rg -q '/hugo-solo-nexmoe/images/cover1\.jpg' "$build_dir/posts/hello-world/index.html"
rg -q '/hugo-solo-nexmoe/images/cover2\.jpg' "$build_dir/posts/hugo-guide/index.html"
rg -q '/hugo-solo-nexmoe/images/post1\.jpg' "$build_dir/posts/post1/index.html"
rg -q '/hugo-solo-nexmoe/images/post2\.jpg' "$build_dir/posts/post2/index.html"
rg -q '/hugo-solo-nexmoe/images/post3\.jpg' "$build_dir/posts/post3/index.html"
test -f "$build_dir/images/default-cover.jpg"
```

Expected: every command exits with status 0; generated article covers retain the `/hugo-solo-nexmoe/` project prefix.

- [ ] **Step 3: Review the final diff and repository state**

Run:

```bash
git status --short --branch
git log --oneline -5
```

Expected: the branch contains the imagery, avatar, and view-count commits, with no uncommitted implementation files. The already committed design and implementation-plan documents may appear as earlier commits.


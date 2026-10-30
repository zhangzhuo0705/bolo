# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- GitHub Actions workflow for deploying the example site to GitHub Pages
- Locally stored CC0 landscape photography with source documentation
- Five complete example articles covering Hugo, theme configuration, JavaScript, Python, and personal writing
- Configurable sidebar footer through `params.footer`
- Optional footer filing links through `params.footerFilings`
- Configurable sidebar tag cloud limit through `params.tagCloudLimit`
- Tags menu entry and Chinese section title in the example site
- Inline SVG folder icon for category badges
- Theme-provided content for `/links/`, `/archives/`, and the `/tags/` title, so sites no longer need to copy special-page stubs
- `archetypes/posts.md` with the full article front matter used by `hugo new content posts/...`

### Changed
- Updated the demo avatar and replaced placeholder imagery
- Rewrote the README and contribution guide to match current configuration and development commands
- Raised the declared minimum Hugo version to 0.128.0
- Updated the theme screenshot to the required 3:2 aspect ratio
- Expanded the README minimal configuration section with field-by-field guidance
- Documented the generated article template and draft handling
- Rendered the tags page with the tagcloud layout instead of a custom pill list
- Limited the sidebar tag cloud to the 10 most-used tags
- Show category and tags together on tag and category term cards

### Removed
- Redundant `archetypes/links.md` and `archetypes/archives.md`; the theme now ships the corresponding content files

### Fixed
- Preserved the GitHub Pages project prefix in theme assets, post covers, and internal links
- Removed unsupported article view-count output and sample metadata
- Resolved taxonomy page lookups when a term shares a name with another page
- Kept Chinese tag and category links non-empty
- Added the missing category badge and icon on tag and category term cards

## [1.0.0] - 2024-01-01

### Added
- 初始版本发布
- 从 solo-nexmoe 静态网站转换为 Hugo 主题
- 基于 MDUI 框架的响应式设计
- 支持文章列表、归档、标签、分类
- 友情链接页面支持
- 社交链接展示
- Canvas 背景动画效果
- 文章目录（TOC）功能
- 懒加载图片支持
- 分页功能
- 404 页面

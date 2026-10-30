# Example Content and Documentation Design

## Goal

Replace the five placeholder example posts with a cohesive Chinese demo blog and
bring the repository documentation, example configuration, and Hugo version
metadata into line with the code that is actually shipped and deployed.

## Scope

This change covers example content, user-facing repository documentation,
example-site configuration, and Hugo minimum-version metadata. It does not
redesign templates, add redirects for removed example posts, introduce new
theme features, or change the existing landscape image set.

## Example Article Set

Delete the current five files under `exampleSite/content/posts/` and replace
them with these five Chinese articles:

| File | Purpose | Existing cover |
| --- | --- | --- |
| `build-a-hugo-blog.md` | Explain how to create and run a Hugo blog, including its directory structure and core commands. | `images/cover1.jpg` |
| `configure-hugo-solo-nexmoe.md` | Document the theme's real configuration for menus, social links, friend links, article metadata, and table of contents. | `images/cover2.jpg` |
| `javascript-async-practice.md` | Teach practical `async`/`await` usage with HTTP status checks, timeout handling, and useful error messages. | `images/post1.jpg` |
| `python-data-analysis-notes.md` | Walk through a small pandas workflow covering input, missing values, type conversion, aggregation, and export. | `images/post2.jpg` |
| `weekend-mountain-hike.md` | Provide a natural personal essay so the demo resembles a real mixed-topic blog rather than product documentation. | `images/post3.jpg` |

The previous slugs (`hello-world`, `hugo-guide`, `post1`, `post2`, and `post3`)
will intentionally return 404 after deployment. No aliases or redirect pages
will be added.

## Article Writing Requirements

Every article will define `title`, `date`, `draft`, `description`, `cover`,
`categories`, `tags`, and `toc` in front matter. Dates will be distinct and
ordered so the home page and archive demonstrate natural chronology.

The four technical posts will contain complete, compact examples that state
their prerequisites and can be copied without relying on omitted variables or
unstated files. The JavaScript example will distinguish HTTP failures,
timeouts, and other request failures. The Python example will include its
small CSV input inline and handle invalid or missing values before computing
results. The lifestyle post will use headings, a checklist, a quotation, and a
local content image to demonstrate Markdown rendering without pretending to
be a technical tutorial.

All articles will use the existing local images and will not contain view-count
front matter. Image references inside Markdown will use paths that Hugo renders
correctly for the deployed project subpath.

## Documentation Corrections

### README

Rewrite `README.md` as the primary Chinese user guide. It will include:

- the live demo and screenshot;
- an accurate feature list;
- prerequisites of Git and Hugo 0.128.0 or later;
- theme installation with a Git submodule;
- a complete minimal `hugo.toml` configuration;
- creation of the root-level archive and friend-link content pages;
- reference tables for `avatar`, `hitokoto`, `mainSections`, social entries,
  friend-link entries, menu icons, pagination, and article front matter;
- the `images/...` convention for covers so sites deployed below a domain
  subpath retain the correct URL prefix;
- local preview and production build commands;
- the repository's GitHub Pages workflow and its current deployment behavior;
- links to contribution, license, image-source, Hugo, MDUI, and original-theme
  information.

The README will not describe comments or any other feature that is not wired
into the rendered page flow.

### Contributing Guide

Update `CONTRIBUTING.md` so development starts at the repository root and uses
the real example-site command:

```bash
hugo server --source exampleSite --themesDir ../.. --theme hugo-solo-nexmoe
```

Document the production-style verification command with a project subpath,
the expected clean build, content and documentation review expectations, and
the repository's existing four-space HTML indentation.

### Changelog

Populate the `Unreleased` section of `CHANGELOG.md` with the already completed
Pages workflow, project-subpath URL fixes, theme screenshot correction, real
landscape demo images and provenance, requested avatar, article-view removal,
and the new article/documentation refresh.

## Configuration and Metadata

Set the minimum Hugo version to `0.128.0` in both `theme.toml` and the root
`hugo.toml`. The example configuration uses `[pagination]` with `pagerSize`,
the configuration form introduced alongside the deprecation of the old
`paginate` key in Hugo 0.128.0.

Add this explicit entry to `exampleSite/hugo.toml`:

```toml
mainSections = ["posts"]
```

This makes the home-page content source deterministic because
`layouts/index.html` already filters regular pages through
`site.Params.mainSections`. Existing avatar, menus, friend links, table of
contents, and pagination values remain unchanged.

## Validation

The implementation is complete when all of the following are true:

- exactly the five new Markdown files exist under
  `exampleSite/content/posts/`, and none of the five previous filenames remain;
- all required front-matter fields exist and each referenced cover exists;
- generated output contains all five new article URLs and none of the old
  article URLs;
- source and generated pages contain no article view count;
- README commands and documented fields match the repository and example
  configuration;
- no tracked user documentation or Hugo metadata still claims a minimum of
  Hugo 0.80.0;
- Hugo builds without warnings using the GitHub Pages project base URL;
- generated home-page and article image URLs include
  `/hugo-solo-nexmoe/` where appropriate;
- repository status is clean after focused commits;
- the pushed GitHub Pages workflow completes successfully.

## Delivery

Group the work into focused commits for the design and plan, new example
articles, documentation/configuration corrections, and any validation-driven
fixes. Push the completed commits to `main` only after the local production
build and generated-output checks pass.

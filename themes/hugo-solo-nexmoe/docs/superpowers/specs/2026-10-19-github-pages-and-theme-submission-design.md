# GitHub Pages Demo and Theme Submission Design

## Goal

Make this repository deploy its `exampleSite` automatically to GitHub Pages at
`https://zhangzhuo0705.github.io/hugo-solo-nexmoe/`, while correcting the
metadata and media issues that caused the Hugo Themes pull request to be
closed.

## Scope

The change covers the repository's demonstration site, GitHub Pages workflow,
theme metadata, documentation examples, and submission images. It does not
change the visual design or add new theme features.

## Deployment Architecture

The repository root remains the reusable Hugo theme. `exampleSite/` remains the
source of the public demonstration site. A GitHub Actions workflow triggered by
pushes to `main` will:

1. Install a pinned extended Hugo release.
2. Build `exampleSite/` with this repository loaded as the
   `hugo-solo-nexmoe` theme.
3. Set the production base URL to
   `https://zhangzhuo0705.github.io/hugo-solo-nexmoe/`.
4. Upload the generated site as a GitHub Pages artifact.
5. Deploy the artifact through the official Pages deployment action.

The workflow will also support manual execution through `workflow_dispatch`.

## Configuration and URL Handling

`exampleSite/hugo.toml` will be the only example-site configuration file;
the duplicate `exampleSite/config.toml` will be removed. Its theme identifier
will be `hugo-solo-nexmoe`, and its deprecated `languageCode` key will be
replaced with `locale`.

Theme templates and example parameters must not assume deployment at the
domain root. Home links and local images will use paths that Hugo can resolve
under the configured base URL, so the site works both at `/` and under the
GitHub Pages project path `/hugo-solo-nexmoe/`.

## Theme Metadata and Documentation

`theme.toml` will describe the actual project:

- Name: `Hugo Solo Nexmoe`
- Homepage: `https://github.com/zhangzhuo0705/hugo-solo-nexmoe`
- Demo site: `https://zhangzhuo0705.github.io/hugo-solo-nexmoe/`
- License link: the repository's `main` branch `LICENSE` file
- Author: `zhangzhuo0705`, linked to the author's GitHub profile

README and contributing examples will use the real repository URL and the
`hugo-solo-nexmoe` theme directory. All submission-related placeholder values,
including `yourname`, `bolo-demo`, and obsolete `bolo` repository paths, will
be removed.

## Submission Media

`images/tn.png` remains unchanged at 900 x 600 pixels. The existing
3072 x 1582 screenshot will be center-cropped horizontally to 2373 x 1582,
which is exactly 3:2 and remains above the Hugo Themes minimum screenshot
dimensions. The crop must preserve the central page content without scaling or
stretching.

## Verification

The implementation is complete when all of the following hold:

- Hugo builds `exampleSite/` successfully using the production Pages base URL.
- Generated CSS, JavaScript, home, avatar, and content URLs retain the
  `/hugo-solo-nexmoe/` project prefix where required.
- The screenshot is exactly 3:2 and the thumbnail remains exactly 3:2.
- No submission metadata or documentation contains the known template
  placeholders.
- The GitHub Actions workflow parses as valid YAML and uses the permissions and
  concurrency controls required by GitHub Pages.
- The working tree contains no unrelated changes.

## Rollout

After the changes are pushed, the repository owner enables GitHub Pages with
GitHub Actions as its source if it is not already enabled. The first successful
workflow run establishes the demo URL. Once that URL responds successfully, a
new pull request can be opened against `gohugoio/hugoThemesSiteBuilder`.

# Demo Imagery and Article Metadata Design

## Goal

Replace placeholder demo imagery with locally stored landscape photography, use
the requested external avatar, and remove the unsupported article view count
from the demo and theme UI.

## Scope

This change updates only the example site's avatar, demonstration images,
image-source documentation, example front matter, and the article-detail
metadata template. It does not add analytics, a view-count backend, or new
theme configuration.

## Avatar

The example site avatar will use:

`https://zhangzhuo-1257627961.cos.ap-beijing.myqcloud.com/boke/boke4.jpg`

The URL remains external because it is explicitly supplied by the repository
owner. Existing templates already preserve absolute URLs through Hugo's
`relURL` processing.

## Local Landscape Images

Six real landscape photographs will replace the existing placeholder images.
They will be downloaded into `exampleSite/static/images/`, center-cropped
without distortion, and exported as 1200 x 600 JPEG files:

- `cover1.jpg`: sunrise or dawn
- `cover2.jpg`: lake or coast
- `post1.jpg`: waterfall or river
- `post2.jpg`: mountain lake
- `post3.jpg`: mountain trail
- `default-cover.jpg`: forest or open natural landscape

The existing filenames remain unchanged so article front matter and fallback
cover behavior continue to work. Images will come from a source whose license
allows copying, modification, and redistribution. Each selected image's title,
creator, source URL, and license URL will be recorded in
`exampleSite/IMAGE_SOURCES.md`.

Selection favors readable wide compositions, natural colors, no visible
watermarks, no recognizable people, and enough visual separation for white
article titles.

## View Count

The article-detail template will remove the heat icon, numeric value, and
`浏览` label. The example posts will remove all `views` front matter fields.
No replacement analytics or counter will be introduced.

## Validation

The change is complete when:

- The generated demo uses the requested avatar URL.
- All six local JPEG files are exactly 1200 x 600 and decode successfully.
- Every selected image has a matching attribution entry.
- No example content contains a `views` field.
- Generated article pages contain neither the heat icon nor the `浏览` label.
- Hugo builds the Pages demo without warnings.
- All article and fallback cover paths retain the GitHub Pages project prefix.


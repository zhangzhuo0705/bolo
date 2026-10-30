# Theme Preview Screenshots Design

## Goal

Replace the stale theme preview images with current, browser-chrome-free captures
of the deployed example site that satisfy the Hugo Themes media requirements.

## Source and Page State

Capture the deployed home page at:

`https://zhangzhuo0705.github.io/hugo-solo-nexmoe/`

Each capture starts at the top of the page. The capture process waits for the
document load event, web fonts, avatar, article covers, stylesheets, and initial
Canvas rendering. The result must show the current article titles, real local
landscape covers, and requested avatar. Browser controls, window frames, device
mockups, watermarks, and added labels are excluded.

## Output Files

Create two desktop-layout captures with different virtual viewports:

- `images/screenshot.png`: 1500 × 1000 pixels
- `images/tn.png`: 900 × 600 pixels, rendered from an 1800 × 1200 virtual viewport at a 0.5 device scale factor

Both files use the required 3:2 aspect ratio. The larger virtual viewport keeps
the desktop sidebar, avatar, and readable article cards while fitting the first
two complete posts and the beginning of the third into the thumbnail. It avoids
both the mobile single-card framing and the illegible whole-page overview.

## Capture Method

Use an installed headless Chromium-compatible browser for both captures. The
main image uses a 1500 × 1000 viewport at device scale 1. The thumbnail uses an
1800 × 1200 virtual viewport at device scale 0.5, producing a 900 × 600 PNG
while retaining desktop layout. Both captures wait for the Canvas background
and lazy-loaded images and exclude browser chrome.

If the online page cannot be captured reliably, build and serve the same commit
locally with the production base URL shape, then use the local server. Do not
construct or edit a simulated screenshot.

## Validation

The update is complete when:

- both files decode as PNG;
- `screenshot.png` is exactly 1500 × 1000;
- `tn.png` is exactly 900 × 600;
- both aspect ratios are exactly 3:2;
- visual inspection confirms the current avatar, new article titles, real
  landscape covers, sidebar, and article cards render correctly;
- neither image contains the former placeholder color blocks or old article
  titles;
- `README.md` continues to reference the absolute raw URL for
  `images/screenshot.png`;
- the focused image commit is pushed and both raw GitHub image URLs return the
  new files.

## Delivery

Commit the two PNG replacements together as one focused change. Push only after
dimension, format, visual-content, and repository-diff checks pass.

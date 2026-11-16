# Visual Bookmarks

Forked from [ddahan/ui-libs](https://github.com/ddahan/ui-libs) (UI Lib Picker) and adapted into a visual bookmark gallery for Avocation `frontend` + `latex template` collections.

Keeps the original Nuxt UI look (header, accordion filters, cards) while swapping library data for bookmark previews.

## Run

```bash
npm install
npm run dev
```

## Data

- `data/bookmarks.json` — parsed from Chrome/Edge bookmarks export
- `public/previews/` — representative preview images (mostly `bm-*.jpg`)
- `scripts/parse-bookmarks.py` — re-parse helper
- `scripts/capture-previews.mjs` / `scripts/retry-previews.mjs` — capture / repair previews

Manual curated keepers:

| Site | Image |
| --- | --- |
| [Reverie](https://allthingsn.com/apps/reverie/web/) | `public/previews/reverie.png` |
| [birds animate](https://ux-design-awards.com/winners/2026-1-birds-animate) | `public/previews/birds-animate.jpg` |

## Capture previews

```bash
npm run capture:previews
npm run retry:previews
```

## Re-parse bookmarks

```bash
python3 scripts/parse-bookmarks.py /path/to/bookmarks.html
```

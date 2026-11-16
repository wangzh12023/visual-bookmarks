# Contributing

Thanks for helping improve Visual Bookmarks.

## Development

```bash
npm install
npm run dev
```

## Guidelines

- Keep changes focused and easy to review
- Prefer representative **above-the-fold** preview images (never footer-only shots)
- Update both `README.md` and `README.zh-CN.md` when docs change
- Run `npm run generate` locally if you touch Nuxt routing / `baseURL`

## Preview images

```bash
npm run capture:previews
npm run fix:previews -- --ids=bm-xxxx
```

Place curated screenshots in `public/previews/` and point to them from `data/bookmarks.json`.

## Pull requests

1. Fork + branch from `main`
2. Describe **why** the change helps
3. Include screenshots for UI changes

/**
 * Capture representative preview images for each bookmark.
 *
 * Selection rules (aligned with curated examples like Reverie / birds animate):
 * 1. Prefer the site's own hero / product visual (viewport after settle).
 * 2. Dribbble shots: download the shot image itself, not browser chrome.
 * 3. Keep already-curated previews untouched unless --force.
 * 4. Skip obvious non-visual docs that already fail (handled via retries/timeouts).
 */
import { chromium } from 'playwright'
import sharp from 'sharp'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DATA = path.join(ROOT, 'data', 'bookmarks.json')
const OUT_DIR = path.join(ROOT, 'public', 'previews')

const FORCE = process.argv.includes('--force')
const ONLY = process.argv.find((a) => a.startsWith('--only='))?.slice(7)
const CONCURRENCY = Number(process.env.CONCURRENCY || 3)
const VIEWPORT = { width: 1440, height: 900 }
const TIMEOUT = 45000

async function fileExists(p) {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

function previewPathFor(id) {
  return `/previews/${id}.jpg`
}

function absPreviewPath(id) {
  return path.join(OUT_DIR, `${id}.jpg`)
}

async function saveJpeg(buffer, dest, { width = 1600 } = {}) {
  await sharp(buffer)
    .rotate()
    .resize({ width, height: 1200, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(dest)
}

async function downloadImage(url, dest) {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
    },
    redirect: 'follow',
  })
  if (!res.ok) throw new Error(`download ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  await saveJpeg(buf, dest)
}

async function tryOgOrTwitterImage(page) {
  return page.evaluate(() => {
    const pick = (sel) => document.querySelector(sel)?.getAttribute('content') || null
    return (
      pick('meta[property="og:image:secure_url"]') ||
      pick('meta[property="og:image"]') ||
      pick('meta[name="twitter:image"]') ||
      pick('meta[name="twitter:image:src"]')
    )
  })
}

async function tryDribbbleShot(page) {
  return page.evaluate(() => {
    const candidates = [
      ...document.querySelectorAll('img[src*="cdn.dribbble.com"]'),
      ...document.querySelectorAll('img[data-src*="cdn.dribbble.com"]'),
    ]
    let best = null
    let bestArea = 0
    for (const img of candidates) {
      const src = img.getAttribute('src') || img.getAttribute('data-src')
      if (!src || src.includes('avatar') || src.includes('icon')) continue
      const w = img.naturalWidth || img.width || 0
      const h = img.naturalHeight || img.height || 0
      const area = w * h
      if (area > bestArea) {
        bestArea = area
        best = src
      }
    }
    return best
  })
}

async function captureOne(context, item) {
  const dest = absPreviewPath(item.id)
  const rel = previewPathFor(item.id)

  if (!FORCE && item.preview && (await fileExists(path.join(ROOT, 'public', item.preview.replace(/^\//, ''))))) {
    return { id: item.id, status: 'kept', preview: item.preview }
  }
  if (!FORCE && (await fileExists(dest))) {
    return { id: item.id, status: 'exists', preview: rel }
  }

  const url = item.url
  if (!url || url.startsWith('javascript:')) {
    return { id: item.id, status: 'skip', error: 'invalid url' }
  }

  // Direct PDF: screenshot first page via Chromium PDF viewer is unreliable; try navigate anyway.
  const page = await context.newPage()
  page.setDefaultTimeout(TIMEOUT)
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT })
    // Let late hero media settle a bit
    await page.waitForTimeout(1800)
    try {
      await page.waitForLoadState('networkidle', { timeout: 8000 })
    } catch {
      /* ignore */
    }

    // Dribbble: prefer the shot artwork itself
    if (url.includes('dribbble.com/shots/')) {
      const shot = await tryDribbbleShot(page)
      if (shot) {
        await downloadImage(shot, dest)
        return { id: item.id, status: 'dribbble', preview: rel }
      }
    }

    // For some gallery/marketing pages, a large OG image can be cleaner than chrome+UI.
    // Prefer viewport screenshot for actual product/demo pages; use OG only when screenshot area is sparse.
    const screenshot = await page.screenshot({ type: 'png', fullPage: false })
    await saveJpeg(screenshot, dest)

    // If screenshot is nearly blank/small, fall back to OG
    const meta = await sharp(dest).metadata()
    if ((meta.width || 0) < 200 || (meta.height || 0) < 120) {
      const og = await tryOgOrTwitterImage(page)
      if (og) {
        await downloadImage(og.startsWith('http') ? og : new URL(og, url).toString(), dest)
        return { id: item.id, status: 'og-fallback', preview: rel }
      }
    }

    return { id: item.id, status: 'screenshot', preview: rel }
  } catch (err) {
    // Last resort: OG image without rendering
    try {
      const page2 = page.isClosed() ? await context.newPage() : page
      if (page.isClosed()) {
        await page2.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT }).catch(() => null)
      }
      const og = await tryOgOrTwitterImage(page2).catch(() => null)
      if (og) {
        await downloadImage(og.startsWith('http') ? og : new URL(og, url).toString(), dest)
        return { id: item.id, status: 'og-error-fallback', preview: rel }
      }
    } catch {
      /* ignore */
    }
    return { id: item.id, status: 'error', error: String(err?.message || err) }
  } finally {
    await page.close().catch(() => null)
  }
}

async function runPool(items, worker, concurrency) {
  const results = []
  let i = 0
  async function next() {
    while (i < items.length) {
      const idx = i++
      const item = items[idx]
      process.stdout.write(`[${idx + 1}/${items.length}] ${item.id} ${item.title.slice(0, 40)}\n`)
      const result = await worker(item)
      results[idx] = result
      process.stdout.write(`  -> ${result.status}${result.error ? ` (${result.error})` : ''}\n`)
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => next()))
  return results
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true })
  const data = JSON.parse(await fs.readFile(DATA, 'utf8'))
  let items = data.items
  if (ONLY) items = items.filter((it) => it.id === ONLY || it.host.includes(ONLY) || it.url.includes(ONLY))

  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled'],
  })
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    locale: 'en-US',
  })

  const results = await runPool(items, (item) => captureOne(context, item), CONCURRENCY)
  await browser.close()

  const byId = Object.fromEntries(results.filter(Boolean).map((r) => [r.id, r]))
  let updated = 0
  for (const item of data.items) {
    const r = byId[item.id]
    if (!r?.preview) continue
    if (item.preview !== r.preview) {
      item.preview = r.preview
      updated++
    } else if (!item.preview && r.preview) {
      item.preview = r.preview
      updated++
    }
    // Ensure existing curated paths stay if kept
    if (r.status === 'kept' && r.preview) item.preview = r.preview
    if (r.preview) item.preview = r.preview
  }

  data.meta.withPreview = data.items.filter((i) => i.preview).length
  await fs.writeFile(DATA, JSON.stringify(data, null, 2) + '\n', 'utf8')

  const summary = results.reduce((acc, r) => {
    if (!r) return acc
    acc[r.status] = (acc[r.status] || 0) + 1
    return acc
  }, {})
  console.log('\nSummary:', summary)
  console.log('withPreview:', data.meta.withPreview, '/', data.items.length)
  console.log('bookmarks updated fields:', updated)

  const failed = results.filter((r) => r && (r.status === 'error' || r.status === 'skip'))
  if (failed.length) {
    console.log('\nFailed:')
    for (const f of failed) console.log(`- ${f.id}: ${f.error || f.status}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

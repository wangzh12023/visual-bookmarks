/**
 * Retry / upgrade weak previews:
 * - longer SPA waits + light scroll
 * - prefer large OG/Twitter images when screenshot is weak
 * - Dribbble: pull shot CDN image
 * - PDF: download + pdftoppm first page
 */
import { chromium } from 'playwright'
import sharp from 'sharp'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DATA = path.join(ROOT, 'data', 'bookmarks.json')
const OUT_DIR = path.join(ROOT, 'public', 'previews')

const IDS = new Set(
  process.argv
    .filter((a) => a.startsWith('bm-'))
    .concat(
      process.argv
        .find((a) => a.startsWith('--ids='))
        ?.slice(6)
        .split(',')
        .filter(Boolean) || [],
    ),
)

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let err = ''
    p.stderr.on('data', (d) => (err += d))
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(err || `${cmd} exit ${code}`))))
  })
}

async function saveJpeg(buffer, dest) {
  await sharp(buffer)
    .rotate()
    .resize({ width: 1600, height: 1200, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile(dest)
}

async function download(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36',
      Accept: '*/*',
    },
    redirect: 'follow',
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

async function capturePdf(url, dest) {
  const buf = await download(url)
  const dir = await fs.mkdtemp(path.join(tmpdir(), 'pdfprev-'))
  const pdfPath = path.join(dir, 'doc.pdf')
  await fs.writeFile(pdfPath, buf)
  const outPrefix = path.join(dir, 'page')
  await run('pdftoppm', ['-jpeg', '-r', '144', '-singlefile', '-f', '1', '-l', '1', pdfPath, outPrefix])
  const jpg = path.join(dir, 'page.jpg')
  const img = await fs.readFile(jpg)
  await saveJpeg(img, dest)
  await fs.rm(dir, { recursive: true, force: true })
}

async function metaImages(page) {
  return page.evaluate(() => {
    const pick = (sel) => document.querySelector(sel)?.getAttribute('content') || null
    const list = [
      pick('meta[property="og:image:secure_url"]'),
      pick('meta[property="og:image"]'),
      pick('meta[name="twitter:image"]'),
      pick('meta[name="twitter:image:src"]'),
    ].filter(Boolean)
    // also large linked images commonly used as heroes
    const imgs = [...document.querySelectorAll('img')]
      .map((img) => ({
        src: img.currentSrc || img.src,
        w: img.naturalWidth || 0,
        h: img.naturalHeight || 0,
      }))
      .filter((x) => x.src && x.w * x.h > 160000)
      .sort((a, b) => b.w * b.h - a.w * a.h)
      .map((x) => x.src)
    return [...list, ...imgs]
  })
}

async function dribbbleShot(page) {
  return page.evaluate(() => {
    const imgs = [...document.querySelectorAll('img')]
    let best = null
    let area = 0
    for (const img of imgs) {
      const src = img.currentSrc || img.src || ''
      if (!src.includes('cdn.dribbble.com')) continue
      if (/avatar|icon|emoji/i.test(src)) continue
      const a = (img.naturalWidth || 0) * (img.naturalHeight || 0)
      if (a > area) {
        area = a
        best = src
      }
    }
    return best
  })
}

function isWeakFile(statSize) {
  return !statSize || statSize < 35000
}

async function entropyish(file) {
  // crude: if too few unique colors / tiny filesize already handled
  const { width, height, size } = await sharp(file).metadata().then(async (m) => ({
    width: m.width || 0,
    height: m.height || 0,
    size: (await fs.stat(file)).size,
  }))
  return { width, height, size, weak: size < 35000 || width * height < 200000 }
}

async function captureItem(context, item) {
  const dest = path.join(OUT_DIR, `${item.id}.jpg`)
  const rel = `/previews/${item.id}.jpg`
  const url = item.url

  if (/\.pdf($|\?)/i.test(url) || url.includes('/knynymwgrxxj.pdf')) {
    await capturePdf(url, dest)
    return { id: item.id, status: 'pdf', preview: rel }
  }

  const page = await context.newPage()
  page.setDefaultTimeout(60000)
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForTimeout(2500)
    // nudge lazy content
    await page.mouse.wheel(0, 800)
    await page.waitForTimeout(1200)
    await page.mouse.wheel(0, -800)
    await page.waitForTimeout(800)
    try {
      await page.waitForLoadState('networkidle', { timeout: 10000 })
    } catch {}

    if (url.includes('dribbble.com/shots/')) {
      const shot = await dribbbleShot(page)
      if (shot) {
        await saveJpeg(await download(shot), dest)
        return { id: item.id, status: 'dribbble', preview: rel }
      }
    }

    // Try OG/hero images first for known hard pages / blocked hosts
    const candidates = await metaImages(page)
    let usedOg = false
    for (const cand of candidates.slice(0, 5)) {
      try {
        const abs = cand.startsWith('http') ? cand : new URL(cand, url).toString()
        await saveJpeg(await download(abs), dest)
        const info = await entropyish(dest)
        if (!info.weak) {
          usedOg = true
          break
        }
      } catch {
        /* try next */
      }
    }

    if (!usedOg) {
      const shot = await page.screenshot({ type: 'png', fullPage: false })
      await saveJpeg(shot, dest)
      const info = await entropyish(dest)
      if (info.weak) {
        for (const cand of candidates.slice(0, 8)) {
          try {
            const abs = cand.startsWith('http') ? cand : new URL(cand, url).toString()
            await saveJpeg(await download(abs), dest)
            const info2 = await entropyish(dest)
            if (!info2.weak) break
          } catch {}
        }
      }
    }

    const finalInfo = await entropyish(dest)
    return {
      id: item.id,
      status: finalInfo.weak ? 'weak' : usedOg ? 'og' : 'screenshot',
      preview: rel,
      size: finalInfo.size,
      http: resp?.status(),
    }
  } finally {
    await page.close().catch(() => {})
  }
}

async function main() {
  const data = JSON.parse(await fs.readFile(DATA, 'utf8'))
  let items = data.items
  if (IDS.size) items = items.filter((i) => IDS.has(i.id))
  else {
    // default: missing or weak
    const weak = []
    for (const item of items) {
      if (!item.preview) {
        weak.push(item)
        continue
      }
      const file = path.join(ROOT, 'public', item.preview.replace(/^\//, ''))
      try {
        const st = await fs.stat(file)
        if (isWeakFile(st.size) && item.preview.includes(item.id)) weak.push(item)
      } catch {
        weak.push(item)
      }
    }
    items = weak
  }

  console.log('retrying', items.length, 'items')
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    locale: 'zh-CN',
    extraHTTPHeaders: { 'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8' },
  })

  const results = []
  for (const [idx, item] of items.entries()) {
    process.stdout.write(`[${idx + 1}/${items.length}] ${item.id} ${item.title.slice(0, 42)}\n`)
    try {
      const r = await captureItem(context, item)
      results.push(r)
      item.preview = r.preview
      console.log('  ->', r.status, r.size || '', r.http || '')
    } catch (err) {
      results.push({ id: item.id, status: 'error', error: String(err.message || err) })
      console.log('  -> error', err.message || err)
    }
  }

  await browser.close()
  data.meta.withPreview = data.items.filter((i) => i.preview).length
  await fs.writeFile(DATA, JSON.stringify(data, null, 2) + '\n')
  console.log('\nwithPreview', data.meta.withPreview, '/', data.items.length)
  console.log(
    'statuses',
    results.reduce((a, r) => ((a[r.status] = (a[r.status] || 0) + 1), a), {}),
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

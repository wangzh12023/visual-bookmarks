/**
 * Re-capture previews that landed on footers / mid-page anchors.
 * Always scroll to top; normalize Overleaf PDF -> gallery page; strip section/hash.
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
const OUT = path.join(ROOT, 'public', 'previews')

const FORCE_IDS = new Set(
  (process.argv.find((a) => a.startsWith('--ids='))?.slice(6) || '')
    .split(',')
    .filter(Boolean),
)

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let err = ''
    p.stderr.on('data', (d) => (err += d))
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(err || `${cmd} ${code}`))))
  })
}

async function saveJpeg(buf, dest) {
  await sharp(buf)
    .rotate()
    .resize({ width: 1600, height: 1200, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85, mozjpeg: true })
    .toFile(dest)
}

function captureUrl(raw) {
  try {
    const u = new URL(raw)
    // Overleaf PDF download -> gallery page with template preview
    if (u.hostname.includes('overleaf.com') && u.pathname.endsWith('.pdf')) {
      u.pathname = u.pathname.replace(/\.pdf$/i, '')
      u.hash = ''
      u.search = ''
      return u.toString()
    }
    // Drop deep-link section params that auto-scroll past the hero
    u.searchParams.delete('section')
    u.searchParams.delete('utm_source')
    u.searchParams.delete('utm_ref_id')
    u.hash = ''
    return u.toString()
  } catch {
    return raw
  }
}

function needsFix(item) {
  if (FORCE_IDS.size) return FORCE_IDS.has(item.id)
  const u = item.url || ''
  return (
    u.includes('overleaf.com') ||
    u.includes('ai.google') ||
    u.includes('.pdf') ||
    u.includes('section=') ||
    u.includes('#')
  )
}

async function capturePdf(url, dest) {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36',
    },
  })
  if (!res.ok) throw new Error(`pdf ${res.status}`)
  const dir = await fs.mkdtemp(path.join(tmpdir(), 'pdfprev-'))
  const pdfPath = path.join(dir, 'doc.pdf')
  await fs.writeFile(pdfPath, Buffer.from(await res.arrayBuffer()))
  const outPrefix = path.join(dir, 'page')
  await run('pdftoppm', ['-jpeg', '-r', '160', '-singlefile', '-f', '1', '-l', '1', pdfPath, outPrefix])
  await saveJpeg(await fs.readFile(path.join(dir, 'page.jpg')), dest)
  await fs.rm(dir, { recursive: true, force: true })
}

async function main() {
  const data = JSON.parse(await fs.readFile(DATA, 'utf8'))
  const items = data.items.filter(needsFix)
  console.log('fixing', items.length, 'previews')

  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled'],
  })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  })

  for (const [idx, item] of items.entries()) {
    const dest = path.join(OUT, `${item.id}.jpg`)
    const rel = `/previews/${item.id}.jpg`
    const url = captureUrl(item.url)
    console.log(`[${idx + 1}/${items.length}] ${item.id}`)
    console.log(`  ${item.url}`)
    console.log(`  -> ${url}`)

    try {
      // Pure PDF (non-overleaf): render page 1
      if (/\.pdf($|\?)/i.test(item.url) && !item.url.includes('overleaf.com')) {
        await capturePdf(item.url, dest)
        item.preview = rel
        console.log('  pdf-page1', (await fs.stat(dest)).size)
        continue
      }

      const page = await context.newPage()
      page.setDefaultTimeout(60000)
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
      // Dismiss cookie banners that cover the hero when possible
      for (const label of ['Accept all cookies', 'Accept all', 'Agree', 'GOT IT', 'Got it', 'Accept']) {
        const btn = page.getByRole('button', { name: label })
        if (await btn.count()) {
          await btn.first().click({ timeout: 1500 }).catch(() => {})
        }
      }
      await page.waitForTimeout(2200)
      // Critical: force top-of-page hero, never leave deep-link scroll position
      await page.evaluate(() => {
        window.scrollTo(0, 0)
        document.documentElement.scrollTop = 0
        document.body.scrollTop = 0
      })
      await page.waitForTimeout(600)
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.waitForTimeout(400)

      await saveJpeg(await page.screenshot({ type: 'png', fullPage: false }), dest)
      item.preview = rel
      console.log('  screenshot', (await fs.stat(dest)).size)
      await page.close()
    } catch (err) {
      console.log('  ERROR', err.message || err)
    }
  }

  await browser.close()
  data.meta.withPreview = data.items.filter((i) => i.preview).length
  await fs.writeFile(DATA, JSON.stringify(data, null, 2) + '\n')
  console.log('done withPreview', data.meta.withPreview)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

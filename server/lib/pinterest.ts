import type { Pin } from '../../shared/types.ts'

const UA = 'Mozilla/5.0 (compatible; PromoVideosBot/0.1)'

/** Turn a pin.it short link or a board URL into the full board URL. */
async function resolveBoardUrl(input: string): Promise<URL> {
  let url = new URL(input.trim())
  if (url.hostname === 'pin.it') {
    const res = await fetch(url, { redirect: 'follow', headers: { 'user-agent': UA } })
    url = new URL(res.url)
    if (url.hostname === 'pin.it') throw new Error('Could not open the pin.it short link. It may have expired, or this network blocks Pinterest. Try pasting the full board URL or upload images instead.')
  }
  if (!/(^|\.)pinterest\./.test(url.hostname)) throw new Error('That does not look like a Pinterest link')
  return url
}

const pinimgRe = /https:\/\/i\.pinimg\.com\/(?:\d+x|originals)\/[a-f0-9]{2}\/[a-f0-9]{2}\/[a-f0-9]{2}\/([a-f0-9]+)\.(?:jpg|png|webp)/gi

function extractPins(text: string): Pin[] {
  const seen = new Map<string, Pin>()
  for (const m of text.matchAll(pinimgRe)) {
    const id = m[1]
    // Always ask for the 736px version: big enough for Claude, small enough to be quick.
    const imageUrl = m[0].replace(/\/(?:\d+x|originals)\//, '/736x/')
    if (!seen.has(id)) seen.set(id, { id, imageUrl })
  }
  return [...seen.values()]
}

/**
 * Best-effort import of a PUBLIC board. Pinterest has no free public API, so we try the
 * board's RSS feed first and fall back to scraping the page. Both only return the first
 * batch of pins. If this stops working, users can upload images instead.
 */
export async function importBoard(input: string): Promise<{ boardUrl: string; pins: Pin[] }> {
  const board = await resolveBoardUrl(input)
  const base = board.origin + board.pathname.replace(/\/$/, '')

  for (const url of [`${base}.rss`, base + '/']) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': UA, 'accept-language': 'en' } })
      if (!res.ok) continue
      const pins = extractPins(await res.text())
      if (pins.length) return { boardUrl: base, pins }
    } catch {
      // try the next source
    }
  }
  throw new Error('Could not read pins from that board. Make sure it is public, or upload the images instead.')
}

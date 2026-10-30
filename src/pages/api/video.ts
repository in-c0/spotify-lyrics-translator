// pages/api/video.ts
//
// Finds a playable YouTube recording for a song so the no-login player can play it in the page.
// Prefers uploads whose length matches the lyrics (so LRC timings line up): official audio and
// auto-generated "Artist - Topic" tracks first; music videos with intros, covers, live versions,
// sped-up edits and lyric videos are ranked down. Returns a few candidates; the client tries the
// next one if a video refuses to be embedded.
import type { NextApiRequest, NextApiResponse } from 'next'
import NodeCache from 'node-cache'

const cache = new NodeCache({ stdTTL: 24 * 3600 })

export interface VideoCandidate {
  id: string
  title: string
  channel: string
  seconds: number
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const track = String(req.query.track || '').trim()
  const artist = String(req.query.artist || '').trim()
  const seconds = Number(req.query.seconds) || 0
  if (!track) return res.status(400).json({ error: 'Missing track' })

  const key = JSON.stringify([track.toLowerCase(), artist.toLowerCase(), Math.round(seconds)])
  const hit = cache.get<VideoCandidate[]>(key)
  if (hit) return res.status(200).json({ videos: hit })

  try {
    // Two phrasings: "audio" finds official audio uploads, "topic" finds auto-generated album tracks.
    const [a, b] = await Promise.all([
      searchYouTube(`${artist} ${track} audio`),
      searchYouTube(`${artist} - Topic ${track}`),
    ])
    const seen = new Set<string>()
    const all = [...a, ...b].filter(v => (seen.has(v.id) ? false : (seen.add(v.id), true)))
    const ranked = rank(all, track, artist, seconds).slice(0, 5)
    cache.set(key, ranked)
    res.setHeader('Cache-Control', 'public, s-maxage=86400')
    res.status(200).json({ videos: ranked })
  } catch (e) {
    console.error('YouTube lookup failed:', e)
    res.status(502).json({ error: 'Could not look up a recording right now.' })
  }
}

async function searchYouTube(query: string): Promise<VideoCandidate[]> {
  // sp=EgIQAQ%3D%3D limits results to videos.
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%253D%253D&hl=en`
  const response = await fetch(url, { headers: { 'Accept-Language': 'en', 'User-Agent': 'Mozilla/5.0' } })
  if (!response.ok) throw new Error(`YouTube responded ${response.status}`)
  const html = await response.text()
  const match = html.match(/var ytInitialData = (\{[\s\S]*?\});<\/script>/)
  if (!match) return []
  const data = JSON.parse(match[1])
  const out: VideoCandidate[] = []
  const walk = (node: any) => {
    if (!node || typeof node !== 'object' || out.length >= 20) return
    if (node.videoRenderer) {
      const v = node.videoRenderer
      const text = (o: any) => (o?.runs || []).map((r: any) => r.text).join('') || o?.simpleText || ''
      const seconds = parseLength(v.lengthText?.simpleText)
      if (v.videoId && seconds) out.push({ id: v.videoId, title: text(v.title), channel: text(v.ownerText), seconds })
      return
    }
    for (const value of Array.isArray(node) ? node : Object.values(node)) walk(value)
  }
  walk(data)
  return out
}

function parseLength(text?: string): number {
  if (!text) return 0
  return text.split(':').reduce((total, part) => total * 60 + Number(part), 0)
}

const BAD = /\b(cover|live|remix|sped ?up|slowed|nightcore|8d|karaoke|instrumental|reaction|lyrics?|가사|dance practice|performance|fancam|mv|m\/v|music video|teaser|shorts?|acoustic|piano|tutorial|extended|loop|1 ?hour|hallway|bathroom|another room|edit)\b|\bbut (it|it's|you|you're|they|the)\b/i
const GOOD = /\b(official audio|audio)\b/i

export function rank(videos: VideoCandidate[], track: string, artist: string, seconds: number): VideoCandidate[] {
  const norm = (s: string) => s.toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu, '')
  const t = norm(track)
  const a = norm(artist)
  const score = (v: VideoCandidate) => {
    const title = norm(v.title)
    const channel = norm(v.channel)
    let s = 0
    s += t && title.includes(t) ? 15 : -20
    s += a && (title.includes(a) || channel.includes(a)) ? 15 : -10
    if (/ - topic$/i.test(v.channel)) s += 20
    if (GOOD.test(v.title)) s += 10
    if (BAD.test(v.title) && !BAD.test(track)) s -= 30
    if (seconds) {
      const diff = Math.abs(v.seconds - seconds)
      s += diff <= 2 ? 15 : diff <= 6 ? 8 : diff <= 15 ? 0 : -15
    }
    return s
  }
  return [...videos].sort((x, y) => score(y) - score(x))
}

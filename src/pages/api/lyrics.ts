// pages/api/lyrics.ts
//
// Fetches time-synced lyrics from LRCLIB (https://lrclib.net) — free, no API key.
// Strategy: exact match (artist + track + album + duration) → fuzzy search ranked by
// duration closeness → plain (unsynced) lyrics as a last resort.
import type { NextApiRequest, NextApiResponse } from 'next'
import NodeCache from 'node-cache'
import { type Lyric, makeLine, parseLrc } from '@/lib/lrc'

const LRCLIB = 'https://lrclib.net/api'
const USER_AGENT = 'spotify-lyrics-translator (https://github.com/in-c0/spotify-lyrics-translator)'
const DURATION_TOLERANCE_S = 5

// Cache results (including misses) for an hour to stay polite to LRCLIB.
const lyricsCache = new NodeCache({ stdTTL: 3600 })

export interface LyricsResult {
  lyrics: Lyric[]
  synced: boolean
  source: 'lrclib'
}

interface LrclibRecord {
  trackName: string
  artistName: string
  duration: number
  instrumental: boolean
  plainLyrics: string | null
  syncedLyrics: string | null
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const track = str(req.query.track)
  const artist = str(req.query.artist)
  const album = str(req.query.album)
  const durationMs = Number(str(req.query.durationMs)) || 0

  if (!track || !artist) {
    return res.status(400).json({ error: 'Missing track or artist parameter' })
  }

  const cacheKey = JSON.stringify([track, artist, album, Math.round(durationMs / 1000)])
  const cached = lyricsCache.get<LyricsResult | 'miss' | 'instrumental'>(cacheKey)
  if (cached) return respond(res, cached)

  try {
    const result = await findLyrics(track, artist, album, durationMs / 1000)
    lyricsCache.set(cacheKey, result)
    respond(res, result)
  } catch (error) {
    console.error('LRCLIB fetch error:', error)
    res.status(502).json({ error: 'The lyrics service is unreachable right now. Try again in a moment.' })
  }
}

function respond(res: NextApiResponse, result: LyricsResult | 'miss' | 'instrumental') {
  if (result === 'instrumental') return res.status(404).json({ error: 'This track is instrumental.', instrumental: true })
  if (result === 'miss') return res.status(404).json({ error: 'No lyrics found for this track.' })
  return res.status(200).json(result)
}

async function findLyrics(
  track: string,
  artist: string,
  album: string,
  durationS: number
): Promise<LyricsResult | 'miss' | 'instrumental'> {
  // 1) Exact signature match.
  const exactParams = new URLSearchParams({ track_name: track, artist_name: artist })
  if (album) exactParams.set('album_name', album)
  if (durationS) exactParams.set('duration', String(Math.round(durationS)))
  // `/get` may 503 when LRCLIB's upstream lookup fails; treat that as "no exact match".
  const exact = await lrclib<LrclibRecord>(`/get?${exactParams}`).catch(() => null)
  if (exact?.syncedLyrics) return toResult(exact)

  // 2) Fuzzy search, prefer synced lyrics with the closest duration.
  const search = (await lrclib<LrclibRecord[]>(`/search?${new URLSearchParams({ track_name: track, artist_name: artist })}`)) || []
  const ranked = search
    .filter(r => !durationS || Math.abs(r.duration - durationS) <= DURATION_TOLERANCE_S)
    .sort((a, b) => Math.abs(a.duration - durationS) - Math.abs(b.duration - durationS))
  const synced = ranked.find(r => r.syncedLyrics)
  if (synced) return toResult(synced)

  // 3) Plain lyrics (no timing) are better than nothing.
  const plain = exact?.plainLyrics ? exact : ranked.find(r => r.plainLyrics)
  if (plain) return toResult(plain)

  if (exact?.instrumental || ranked[0]?.instrumental) return 'instrumental'
  return 'miss'
}

async function lrclib<T>(path: string): Promise<T | null> {
  const response = await fetch(`${LRCLIB}${path}`, { headers: { 'User-Agent': USER_AGENT } })
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`LRCLIB responded with ${response.status}`)
  return response.json() as Promise<T>
}

function toResult(record: LrclibRecord): LyricsResult {
  if (record.syncedLyrics) {
    return { lyrics: parseLrc(record.syncedLyrics), synced: true, source: 'lrclib' }
  }
  const lines = (record.plainLyrics || '').split(/\r?\n/)
  return {
    lyrics: lines.map(text => makeLine(text, -1, -1)),
    synced: false,
    source: 'lrclib',
  }
}

function str(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value || '').trim()
}

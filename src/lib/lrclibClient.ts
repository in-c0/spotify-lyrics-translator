// Browser-side LRCLIB search (the API allows CORS), used by the no-login listen mode.
import { makeLine, parseLrc, type Lyric } from './lrc'

export interface LrclibTrack {
  id: number
  trackName: string
  artistName: string
  albumName: string
  duration: number
  instrumental: boolean
  plainLyrics: string | null
  syncedLyrics: string | null
}

export async function searchTracks(query: string, signal?: AbortSignal): Promise<LrclibTrack[]> {
  const url = `https://lrclib.net/api/search?${new URLSearchParams({ q: query })}`
  let response = await fetch(url, { signal })
  if (response.status === 503) {
    // LRCLIB answers 503 for some queries it can't resolve upstream; retry once, then treat as no match.
    await new Promise(r => setTimeout(r, 800))
    response = await fetch(url, { signal })
    if (response.status === 503) return []
  }
  if (!response.ok) throw new Error(`Lyrics search failed (${response.status})`)
  const results: LrclibTrack[] = await response.json()
  // Synced lyrics first; drop exact duplicates (same title/artist/duration).
  const seen = new Set<string>()
  return results
    .filter(r => !r.instrumental && (r.syncedLyrics || r.plainLyrics))
    .sort((a, b) => Number(Boolean(b.syncedLyrics)) - Number(Boolean(a.syncedLyrics)))
    .filter(r => {
      const key = `${r.trackName.toLowerCase()}|${r.artistName.toLowerCase()}|${Math.round(r.duration)}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

export function lyricsOf(track: LrclibTrack): Lyric[] {
  if (track.syncedLyrics) return parseLrc(track.syncedLyrics)
  return (track.plainLyrics || '').split(/\r?\n/).map(text => makeLine(text, -1, -1))
}

// Browser-side LRCLIB search (the API allows CORS), used by the no-login player.
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

const API = 'https://lrclib.net/api'

export class BusyError extends Error {
  constructor() { super('The lyrics database is busy right now. Trying again usually works.') }
}

/** GET with retries: LRCLIB often answers 503 "ServerOverloaded" for a moment. 404 → null. */
async function getJson<T>(url: string, signal?: AbortSignal, attempts = 4): Promise<T | null> {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const response = await fetch(url, { signal })
    if (response.ok) return response.json()
    if (response.status === 404) return null
    if (response.status !== 503 && response.status !== 429) throw new Error(`Lyrics request failed (${response.status})`)
    await new Promise(r => setTimeout(r, 700 * (attempt + 1)))
  }
  throw new BusyError()
}

// Songs picked from search are remembered, so opening the player doesn't need another request.
const memory = new Map<number, LrclibTrack>()
export function rememberTrack(t: LrclibTrack) {
  memory.set(t.id, t)
  try { sessionStorage.setItem(`slt:track:${t.id}`, JSON.stringify(t)) } catch { /* ignore */ }
}

/**
 * Searches by free text AND by title in parallel and merges the results. The free-text endpoint
 * is the one that most often fails under load, and title-only queries ("Despacito") match better
 * through `track_name`.
 */
export async function searchTracks(query: string, signal?: AbortSignal): Promise<LrclibTrack[]> {
  const q = query.trim()
  const soft = (e: any) => (e?.name === 'AbortError' ? Promise.reject(e) : undefined)
  const [byText, byTitle] = await Promise.all([
    getJson<LrclibTrack[]>(`${API}/search?${new URLSearchParams({ q })}`, signal, 3).catch(soft),
    getJson<LrclibTrack[]>(`${API}/search?${new URLSearchParams({ track_name: q })}`, signal, 3).catch(soft),
  ])
  if (byText === undefined && byTitle === undefined) throw new BusyError()

  const norm = (s: string) => s.toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu, '')
  const nq = norm(q)
  const score = (r: LrclibTrack) => {
    const title = norm(r.trackName)
    const both = norm(`${r.trackName}${r.artistName}`)
    let s = r.syncedLyrics ? 10 : 0
    if (norm(r.artistName) === title) s -= 15 // junk entries whose artist is just the title again
    if (title === nq) s += 20
    else if (nq.includes(title) || both.includes(nq) || norm(`${r.artistName}${r.trackName}`).includes(nq)) s += 12
    else if (title.includes(nq)) s += 6
    return s
  }

  // One row per song (same title + artist); keep the synced version when there is one.
  const best = new Map<string, LrclibTrack>()
  for (const r of [...(byText || []), ...(byTitle || [])]) {
    if (r.instrumental || !(r.syncedLyrics || r.plainLyrics)) continue
    const key = `${norm(r.trackName)}|${norm(r.artistName)}`
    const prev = best.get(key)
    if (!prev || (!prev.syncedLyrics && r.syncedLyrics)) best.set(key, r)
  }
  return [...best.values()].sort((a, b) => score(b) - score(a))
}

export async function getTrack(id: number, signal?: AbortSignal): Promise<LrclibTrack | null> {
  const known = memory.get(id)
  if (known) return known
  try {
    const stored = sessionStorage.getItem(`slt:track:${id}`)
    if (stored) return JSON.parse(stored)
  } catch { /* ignore */ }
  const t = await getJson<LrclibTrack>(`${API}/get/${id}`, signal, 6)
  if (t) rememberTrack(t)
  return t
}

/** Best synced lyrics for an exact recording length (when the playing video differs from the pick). */
export async function findForDuration(track: LrclibTrack, seconds: number, signal?: AbortSignal): Promise<LrclibTrack | null> {
  const results = await getJson<LrclibTrack[]>(
    `${API}/search?${new URLSearchParams({ track_name: track.trackName, artist_name: track.artistName })}`,
    signal
  ).catch(() => null)
  const synced = (results || []).filter(r => r.syncedLyrics && Math.abs(r.duration - seconds) <= 3)
  synced.sort((a, b) => Math.abs(a.duration - seconds) - Math.abs(b.duration - seconds))
  return synced[0] || null
}

export function lyricsOf(track: LrclibTrack): Lyric[] {
  if (track.syncedLyrics) return parseLrc(track.syncedLyrics)
  return (track.plainLyrics || '').split(/\r?\n/).map(text => makeLine(text, -1, -1))
}

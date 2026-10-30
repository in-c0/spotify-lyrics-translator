// Shared lyric types + LRC parsing (safe to import from both server and client code).

export interface Lyric {
  original: string
  romanized: string
  translated: string
  /** -1 when the lyrics are not time-synced. */
  startTimeMs: number
  endTimeMs: number
}

const TIMESTAMP = /\[(\d{1,3}):(\d{1,2}(?:[.:]\d{1,3})?)\]/g

export function makeLine(original: string, startTimeMs: number, endTimeMs: number): Lyric {
  return { original, romanized: '', translated: '', startTimeMs, endTimeMs }
}

/** Parses LRC text into time-ordered lines. Supports several timestamps per line. */
export function parseLrc(lrc: string): Lyric[] {
  const entries: { time: number; text: string }[] = []
  for (const raw of lrc.split(/\r?\n/)) {
    const stamps = Array.from(raw.matchAll(TIMESTAMP))
    if (stamps.length === 0) continue // metadata tags like [ar:...] or stray text
    const text = raw.replace(TIMESTAMP, '').trim()
    for (const [, min, sec] of stamps) {
      entries.push({ time: Math.round((Number(min) * 60 + Number(sec.replace(':', '.'))) * 1000), text })
    }
  }
  entries.sort((a, b) => a.time - b.time)
  return entries.map((e, i) => makeLine(e.text, e.time, entries[i + 1]?.time ?? e.time + 5000))
}

/** Index of the line active at `timeMs`, or -1 (before the first line / unsynced lyrics). */
export function activeLineIndex(lyrics: Lyric[], timeMs: number): number {
  let index = -1
  for (let i = 0; i < lyrics.length; i++) {
    if (lyrics[i].startTimeMs < 0) return -1
    if (lyrics[i].startTimeMs <= timeMs) index = i
    else break
  }
  return index
}

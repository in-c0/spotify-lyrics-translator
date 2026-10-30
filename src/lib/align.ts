// Aligns a fuzzy transcript of the last few seconds of audio to the lyric lines.
// The transcript doesn't need to be accurate: we only look for which run of lines it overlaps most.
import type { Lyric } from './lrc'

export interface AlignResult {
  /** Index of the last lyric line heard in the transcript. */
  lineIndex: number
  /** 0..1 overlap score of the best match. */
  score: number
}

/** Lowercase, strip punctuation/space; keep letters and digits of every script. */
export function normalize(text: string): string {
  return text.toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu, '')
}

function bigrams(s: string): Map<string, number> {
  const grams = new Map<string, number>()
  if (s.length === 1) grams.set(s, 1)
  for (let i = 0; i < s.length - 1; i++) {
    const g = s.slice(i, i + 2)
    grams.set(g, (grams.get(g) || 0) + 1)
  }
  return grams
}

/** How much of `needle` (the transcript) is found in `hay` (lyric text), 0..1. */
function containment(needle: Map<string, number>, needleSize: number, hay: Map<string, number>): number {
  if (needleSize === 0) return 0
  let hit = 0
  needle.forEach((n, g) => { hit += Math.min(n, hay.get(g) || 0) })
  return hit / needleSize
}

/**
 * Finds the run of 1–3 consecutive lines that best explains the transcript.
 * `hint` (the line we think we're at) breaks ties toward nearby lines, since choruses repeat.
 */
export function alignTranscript(lyrics: Lyric[], transcript: string, hint = -1): AlignResult | null {
  const heard = normalize(transcript)
  if (heard.length < 4) return null
  const heardGrams = bigrams(heard)
  const heardSize = Math.max(1, heard.length - 1)
  const lines = lyrics.map(l => normalize(l.original))

  let best: AlignResult | null = null
  let bestRank = -Infinity
  for (let start = 0; start < lines.length; start++) {
    let text = ''
    for (let span = 0; span < 3 && start + span < lines.length; span++) {
      text += lines[start + span]
      if (!text) continue
      const end = start + span
      const score = containment(heardGrams, heardSize, bigrams(text))
      // Prefer tight spans (penalise lyric text much longer than what we heard) and nearby lines.
      const excess = Math.max(0, text.length - heard.length * 1.5) / Math.max(text.length, 1)
      const distance = hint >= 0 ? Math.min(Math.abs(end - hint), 12) / 12 : 0
      const rank = score - 0.25 * excess - 0.08 * distance
      if (rank > bestRank) {
        bestRank = rank
        best = { lineIndex: end, score }
      }
    }
  }
  return best && best.score >= 0.35 ? best : null
}

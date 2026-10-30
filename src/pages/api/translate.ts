// pages/api/translate.ts

import type { NextApiRequest, NextApiResponse } from 'next'

interface TranslateRequestBody {
  text: string[] // Array of lyric lines
  sourceLang: string // e.g., 'ja' for Japanese, 'ko' for Korean, 'auto' for auto-detect
  targetLang: string // e.g., 'en' for English
}

interface Translation {
  translatedText: string
  detectedSourceLanguage: string
}

interface TranslateResponse {
  translations: Translation[]
}

const FREE_ENDPOINT = 'https://translate.googleapis.com/translate_a/single'
const MAX_CHUNK_CHARS = 4000
const MAX_LINES = 400
const MAX_LINE_CHARS = 500

/**
 * Free path — no API key, no credit card required (the DEFAULT).
 * Uses Google's public web endpoint. Lines are joined with newlines and sent in a few
 * chunked requests instead of one request per line, which keeps us well under its rate limits.
 * Unofficial: fine for a local hobby setup, not production scale.
 */
async function translateFree(text: string[], sourceLang: string, targetLang: string): Promise<Translation[]> {
  const results: Translation[] = new Array(text.length)
  for (const chunk of chunkLines(text)) {
    const { lines, detected } = await freeRequest(chunk.map(i => text[i]), sourceLang, targetLang)
    if (lines.length === chunk.length) {
      chunk.forEach((lineIndex, j) => {
        results[lineIndex] = { translatedText: lines[j], detectedSourceLanguage: detected }
      })
      continue
    }
    // Line count drifted (rare) — fall back to translating this chunk line by line.
    for (const lineIndex of chunk) {
      const single = await freeRequest([text[lineIndex]], sourceLang, targetLang)
      results[lineIndex] = { translatedText: single.lines.join(' '), detectedSourceLanguage: single.detected }
    }
  }
  return results
}

/** Groups line indexes so that each newline-joined chunk stays under MAX_CHUNK_CHARS. */
function chunkLines(text: string[]): number[][] {
  const chunks: number[][] = []
  let current: number[] = []
  let size = 0
  text.forEach((line, i) => {
    if (current.length > 0 && size + line.length + 1 > MAX_CHUNK_CHARS) {
      chunks.push(current)
      current = []
      size = 0
    }
    current.push(i)
    size += line.length + 1
  })
  if (current.length > 0) chunks.push(current)
  return chunks
}

async function freeRequest(lines: string[], sourceLang: string, targetLang: string) {
  const params = new URLSearchParams({ client: 'gtx', sl: sourceLang, tl: targetLang, dt: 't' })
  const response = await fetch(`${FREE_ENDPOINT}?${params}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: new URLSearchParams({ q: lines.join('\n') }),
  })
  if (response.status === 429) throw new Error('The free translator is rate-limiting requests. Wait a minute and try again.')
  if (!response.ok) throw new Error(`Free translator responded with ${response.status}`)
  const data = await response.json()
  const joined: string = (data?.[0] || []).map((segment: any[]) => segment?.[0] || '').join('')
  return { lines: joined.split('\n'), detected: typeof data?.[2] === 'string' ? data[2] : sourceLang }
}

/**
 * Paid path — opt-in. Only used when GOOGLE_TRANSLATE_API_KEY is set.
 * Higher reliability / rate limits via the official Google Cloud Translate v2 REST API.
 */
async function translatePaid(
  text: string[],
  sourceLang: string,
  targetLang: string,
  apiKey: string
): Promise<Translation[]> {
  const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`

  if (text.length > 128) {
    // The v2 API accepts at most 128 segments per request.
    const head = await translatePaid(text.slice(0, 128), sourceLang, targetLang, apiKey)
    const tail = await translatePaid(text.slice(128), sourceLang, targetLang, apiKey)
    return [...head, ...tail]
  }

  const payload: Record<string, unknown> = {
    q: text,
    target: targetLang,
    format: 'text',
  }
  if (sourceLang !== 'auto') {
    payload.source = sourceLang
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(`Google Translate API error: ${errorData.error?.message || response.statusText}`)
  }

  const data = await response.json()
  return data.data.translations.map((t: any) => ({
    translatedText: t.translatedText,
    detectedSourceLanguage: t.detectedSourceLanguage || sourceLang,
  }))
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' })
  }

  const { text, sourceLang, targetLang } = req.body as TranslateRequestBody

  if (!text || !Array.isArray(text) || !sourceLang || !targetLang) {
    return res.status(400).json({ error: 'Invalid request body.' })
  }
  if (text.length > MAX_LINES || text.some(line => typeof line !== 'string' || line.length > MAX_LINE_CHARS)) {
    return res.status(413).json({ error: `Send at most ${MAX_LINES} lines of up to ${MAX_LINE_CHARS} characters.` })
  }
  if (!/^[a-z]{2,3}(-[A-Za-z]{2,4})?$|^auto$/.test(sourceLang) || !/^[a-z]{2,3}(-[A-Za-z]{2,4})?$/.test(targetLang)) {
    return res.status(400).json({ error: 'Invalid language code.' })
  }

  try {
    // Default to the free library; use the official API only if a key is configured.
    const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY
    const translations = apiKey
      ? await translatePaid(text, sourceLang, targetLang, apiKey)
      : await translateFree(text, sourceLang, targetLang)

    res.status(200).json({ translations } as TranslateResponse)
  } catch (error: any) {
    console.error('Translation API error:', error)
    res.status(500).json({ error: error.message || 'Internal Server Error during translation.' })
  }
}

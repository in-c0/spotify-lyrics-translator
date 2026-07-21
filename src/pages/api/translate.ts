// pages/api/translate.ts

import type { NextApiRequest, NextApiResponse } from 'next'
import freeTranslate from '@iamtraction/google-translate'

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

/**
 * Free path — no API key, no credit card required.
 * Uses the community `@iamtraction/google-translate` library (already a dependency).
 * This is the DEFAULT so the app works out-of-the-box with only Spotify credentials.
 * Note: unofficial and rate-limited; fine for a local hobby setup, not production scale.
 */
async function translateFree(
  text: string[],
  sourceLang: string,
  targetLang: string
): Promise<Translation[]> {
  const options: { to: string; from?: string } = { to: targetLang }
  if (sourceLang !== 'auto') {
    options.from = sourceLang
  }

  return Promise.all(
    text.map(async (line) => {
      // Preserve blank lines (instrumental breaks etc.) without a network round-trip.
      if (!line.trim()) {
        return { translatedText: line, detectedSourceLanguage: sourceLang }
      }
      const result = await freeTranslate(line, options)
      return {
        translatedText: result.text,
        detectedSourceLanguage: result.from?.language?.iso || sourceLang,
      }
    })
  )
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

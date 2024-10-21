// pages/api/translate.ts

import type { NextApiRequest, NextApiResponse } from 'next'

interface TranslateRequestBody {
  text: string[] // Array of lyric lines
  sourceLang: string // e.g., 'ja' for Japanese, 'ko' for Korean
  targetLang: string // e.g., 'en' for English
}

interface TranslateResponse {
  translatedText: string[]
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
    const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY
    if (!apiKey) {
      throw new Error('Google Translate API key is not configured.')
    }

    // Construct the request URL with the API key as a query parameter
    const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`

    // Prepare the request payload
    const payload: any = {
      q: text,
      target: targetLang,
      format: 'text',
    }

    if (sourceLang !== 'auto') {
      payload.source = sourceLang
    }

    // Make the API request
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`Google Translate API error: ${errorData.error.message || response.statusText}`)
    }

    const data = await response.json()
    const translatedText: string[] = data.data.translations.map((t: any) => t.translatedText)

    res.status(200).json({ translatedText } as TranslateResponse)
  } catch (error: any) {
    console.error('Translation API error:', error)
    res.status(500).json({ error: error.message || 'Internal Server Error during translation.' })
  }
}

// pages/api/translate.ts

import type { NextApiRequest, NextApiResponse } from 'next'
import translate from '@iamtraction/google-translate'

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
    // Perform translations line by line to maintain structure
    const translatedTextPromises = text.map(line => 
      translate(line, { from: sourceLang === 'auto' ? undefined : sourceLang, to: targetLang })
        .then(result => result.text)
        .catch(error => {
          console.error('Translation error for line:', line, error)
          return '' // Return empty string or handle as needed
        })
    )

    const translatedText = await Promise.all(translatedTextPromises)

    res.status(200).json({ translatedText } as TranslateResponse)
  } catch (error: any) {
    console.error('Translation API error:', error)
    res.status(500).json({ error: 'Internal Server Error during translation.' })
  }
}

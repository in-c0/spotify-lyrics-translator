// lyrics.tsx
import { NextApiRequest, NextApiResponse } from 'next'
import NodeCache from 'node-cache'

// Initialize a cache with a TTL of 1 hour
const lyricsCache = new NodeCache({ stdTTL: 3600 })

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { track, artist, remix } = req.query

  if (!track || !artist) {
    return res.status(400).json({ error: 'Missing track or artist parameter' })
  }

  const cacheKey = `${track}-${artist}-${remix}`
  const cachedLyrics = lyricsCache.get(cacheKey)

  if (cachedLyrics) {
    return res.status(200).json({ lyrics: cachedLyrics })
  }

  try {
    const lyrics = await fetchLyrics(track as string, artist as string, remix === 'true')

    if (!lyrics) {
      return res.status(404).json({ error: 'Lyrics not found' })
    }

    // Cache the fetched lyrics
    lyricsCache.set(cacheKey, lyrics)

    res.status(200).json({ lyrics })
  } catch (error) {
    console.error('Error fetching lyrics:', error)
    res.status(500).json({ error: 'Failed to fetch lyrics' })
  }
}

interface LyrixLine {
  startTimeMs: string
  words: string
  syllables: any[]
  endTimeMs: string
}

interface LyrixResponse {
  lyrics: {
    syncType: string
    lines: LyrixLine[]
    // ... other fields
  }
  // ... other fields
}

interface Lyric {
  original: string
  romanized: string
  translated: string
  startTimeMs: number
  endTimeMs: number
}

async function fetchLyrics(track: string, artist: string, remix: boolean): Promise<Lyric[] | null> {
  try {
    const encodedArtist = encodeURIComponent(artist)
    const encodedTrack = encodeURIComponent(track)
    const remixParam = remix ? '?remix=true' : ''

    const url = `https://lyrix.vercel.app/getLyricsByName/${encodedArtist}/${encodedTrack}${remixParam}`

    const response = await fetch(url)

    if (!response.ok) {
      console.error('Lyrix API responded with status:', response.status)
      return null
    }

    const data: LyrixResponse = await response.json()

    if (!data.lyrics || !data.lyrics.lines) {
      return null
    }

    // Map Lyrix's response to your Lyric interface
    const processedLyrics: Lyric[] = data.lyrics.lines.map(line => ({
      original: line.words,
      romanized: '', // Lyrix doesn't provide romanization
      translated: '', // Lyrix doesn't provide translation
      startTimeMs: parseInt(line.startTimeMs),
      endTimeMs: parseInt(line.endTimeMs),
    }))

    return processedLyrics
  } catch (error) {
    console.error('Lyrix fetch error:', error)
    throw error
  }
}

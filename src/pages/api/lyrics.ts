import { NextApiRequest, NextApiResponse } from 'next'
import NodeCache from 'node-cache'

// Initialize a cache with a TTL of 1 hour
const lyricsCache = new NodeCache({ stdTTL: 3600 })

// You would replace this with your actual lyrics API key
const LYRICS_API_KEY = process.env.LYRICS_API_KEY

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { track, artist } = req.query

  if (!track || !artist) {
    return res.status(400).json({ error: 'Missing track or artist parameter' })
  }

  const cacheKey = `${track}-${artist}`
  const cachedLyrics = lyricsCache.get(cacheKey)

  if (cachedLyrics) {
    return res.status(200).json({ lyrics: cachedLyrics })
  }

  try {
    const lyrics = await fetchLyrics(track as string, artist as string)
    
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

async function fetchLyrics(track: string, artist: string): Promise<any> {
  // This is a placeholder implementation. You would replace this with an actual API call.
  // For demonstration purposes, we're returning mock data.
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000))

  // Mock lyrics data
  const mockLyrics = [
    {
      original: "君の前前前世から僕は 君を探し始めたよ",
      romanized: "Kimi no zenzenzense kara boku wa kimi wo sagashi hajimeta yo",
      translated: "From your previous, previous, previous life, I began searching for you"
    },
    {
      original: "その魂に一目惚れしたのさ",
      romanized: "Sono tamashii ni hitomebore shita no sa",
      translated: "I fell in love at first sight with that soul"
    },
    {
      original: "君を探し始めたよ",
      romanized: "Kimi wo sagashi hajimeta yo",
      translated: "I started to search for you"
    }
  ]

  return mockLyrics
}
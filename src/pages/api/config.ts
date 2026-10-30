// pages/api/config.ts
// Tells the UI which features this deployment can actually offer, so we never show a
// "Login with Spotify" button that is bound to fail (missing or wrong server credentials).
import type { NextApiRequest, NextApiResponse } from 'next'

let cached: { at: number; spotifyLogin: boolean } | null = null

async function spotifyCredentialsWork(): Promise<boolean> {
  const id = process.env.SPOTIFY_CLIENT_ID || process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
  const secret = process.env.SPOTIFY_CLIENT_SECRET
  if (!id || !secret || id === 'your_spotify_client_id') return false
  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64'),
      },
      body: new URLSearchParams({ grant_type: 'client_credentials' }),
    })
    return response.ok
  } catch {
    return false
  }
}

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  if (!cached || Date.now() - cached.at > 10 * 60 * 1000) {
    cached = { at: Date.now(), spotifyLogin: await spotifyCredentialsWork() }
  }
  res.setHeader('Cache-Control', 'no-store')
  res.status(200).json({ spotifyLogin: cached.spotifyLogin })
}

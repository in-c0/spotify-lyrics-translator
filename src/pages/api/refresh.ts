// pages/api/refresh.ts
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { refresh_token } = req.body

  console.log('Received refresh_token:', refresh_token) // Log for debugging

  if (!refresh_token) {
    return res.status(400).json({ error: 'Missing refresh token' })
  }

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64'),
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token,
      }),
    })

    const data = await response.json()

    console.log('Spotify Refresh Token Response:', data) // Log Spotify's response

    if (data.error) {
      console.error('Spotify Refresh Token Error:', data.error_description)
      return res.status(400).json({ error: data.error_description })
    }

    res.status(200).json({
      access_token: data.access_token,
      expires_in: data.expires_in,
      scope: data.scope,
    })
  } catch (error) {
    console.error('Error refreshing access token:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}

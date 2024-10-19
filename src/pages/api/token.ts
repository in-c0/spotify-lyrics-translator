// pages/api/token.ts
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { code } = req.body

  console.log('Received code:', code) // Log the received code for debugging

  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' })
  }

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64'),
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI || 'http://localhost:3000/callback',
      }),
    })

    const data = await response.json()

    console.log('Spotify Token Exchange Response:', data) // Log Spotify's response

    if (data.error) {
      console.error('Spotify Token Exchange Error:', data.error_description)
      return res.status(400).json({ error: data.error_description })
    }

    res.status(200).json({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
    })
  } catch (error) {
    console.error('Error exchanging code for tokens:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}

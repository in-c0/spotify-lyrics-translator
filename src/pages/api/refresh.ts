// pages/api/refresh.ts

import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { refresh_token } = req.body

  if (!refresh_token) {
    return res.status(400).json({ error: 'Refresh token is required' })
  }

  const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID
  const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refresh_token,
  })

  const basicAuth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`,
      },
      body: params.toString(),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`Failed to refresh token: ${errorData.error_description || 'Unknown error'}`)
    }

    const data = await response.json()
    res.status(200).json(data)
  } catch (error) {
    console.error('Token refresh error:', error)
    res.status(500).json({ error: 'Failed to refresh token' })
  }
}

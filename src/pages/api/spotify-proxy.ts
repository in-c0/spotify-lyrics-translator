import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'PUT' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { endpoint } = req.query
  const accessToken = req.headers.authorization?.split(' ')[1]

  if (!endpoint || !accessToken) {
    return res.status(400).json({ error: 'Endpoint and access token are required' })
  }

  try {
    const response = await fetch(`https://api.spotify.com/v1/${endpoint}`, {
      method: req.method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
    })

    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.statusText}`)
    }

    const data = await response.json()
    res.status(200).json(data)
  } catch (error) {
    console.error('Spotify API proxy error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
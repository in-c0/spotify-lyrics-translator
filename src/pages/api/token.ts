// token.ts
import { NextApiRequest, NextApiResponse } from 'next'

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET
// Must equal the redirect_uri the browser sent to Spotify, which comes from the public variable.
const REDIRECT_URI = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI || process.env.SPOTIFY_REDIRECT_URI || 'http://127.0.0.1:3000/callback'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { code } = req.body

  if (!code) {
    return res.status(400).json({ error: 'Authorization code is required' })
  }

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: REDIRECT_URI,
  })

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')
      },
      body: params
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const description: string = errorData.error_description || errorData.error || 'Unknown error'
      console.error('Token exchange error:', description)
      return res.status(400).json({ error: explainTokenError(description) })
    }

    const data = await response.json()
    res.status(200).json(data)
  } catch (error) {
    console.error('Token exchange error:', error)
    res.status(502).json({ error: 'Could not reach Spotify. Check your internet connection and try again.' })
  }
}

/** Turns Spotify's terse OAuth errors into something a first-time user can act on. */
function explainTokenError(description: string): string {
  if (/invalid client/i.test(description)) {
    return 'Spotify rejected the app credentials. Check SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env.local, then restart the dev server.'
  }
  if (/redirect/i.test(description)) {
    return `The redirect URI does not match. Add exactly ${REDIRECT_URI} to your app's Redirect URIs in the Spotify Developer Dashboard.`
  }
  if (/expired|invalid authorization code/i.test(description)) {
    return 'The login code expired or was already used. Please log in again.'
  }
  return `Spotify login failed: ${description}`
}

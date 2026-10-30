// pages/login.tsx
import React from 'react'
import { Button } from "@/components/ui/button"

// Spotify no longer accepts `localhost` redirect URIs — only loopback IPs (127.0.0.1) or HTTPS.
// https://developer.spotify.com/documentation/web-api/concepts/redirect_uri
const DEFAULT_REDIRECT_URI = 'http://127.0.0.1:3000/callback'
const SCOPES = 'user-read-private user-read-playback-state user-modify-playback-state'

export default function LoginPage() {
  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
  const isConfigured = Boolean(clientId) && clientId !== 'your_spotify_client_id'

  const handleLogin = () => {
    const redirectUri = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI || DEFAULT_REDIRECT_URI
    const params = new URLSearchParams({
      client_id: clientId!,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: SCOPES,
    })
    window.location.href = `https://accounts.spotify.com/authorize?${params}`
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-zinc-900 to-black text-white px-6 text-center">
      <h1 className="text-4xl font-bold mb-8">Spotify Lyrics Translator</h1>
      {isConfigured ? (
        <Button onClick={handleLogin} className="bg-green-500 hover:bg-green-600 text-white">
          Login with Spotify
        </Button>
      ) : (
        <div className="max-w-md text-zinc-300 space-y-3">
          <p className="text-lg font-semibold text-white">One step left: add your Spotify app keys</p>
          <p>
            Copy <code className="text-green-400">.env.example</code> to{' '}
            <code className="text-green-400">.env.local</code>, paste your Client ID and Secret from the{' '}
            <a className="underline" href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer">
              Spotify Developer Dashboard
            </a>
            , then restart <code className="text-green-400">npm run dev</code>.
          </p>
        </div>
      )}
    </div>
  )
}

// pages/login.tsx
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from "@/components/ui/button"

// Spotify no longer accepts `localhost` redirect URIs — only loopback IPs (127.0.0.1) or HTTPS.
// https://developer.spotify.com/documentation/web-api/concepts/redirect_uri
const DEFAULT_REDIRECT_URI = 'http://127.0.0.1:3000/callback'
const SCOPES = 'user-read-private user-read-playback-state user-modify-playback-state'

export default function LoginPage() {
  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
  // Only offer the button when the server can actually finish the login (valid app credentials).
  const [serverReady, setServerReady] = useState<boolean | null>(null)
  useEffect(() => {
    fetch('/api/config').then(r => r.json()).then(c => setServerReady(Boolean(c.spotifyLogin))).catch(() => setServerReady(false))
  }, [])
  const isConfigured = Boolean(clientId) && clientId !== 'your_spotify_client_id' && serverReady !== false

  const handleLogin = () => {
    const redirectUri = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI || DEFAULT_REDIRECT_URI
    const state = Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('')
    sessionStorage.setItem('spotify_auth_state', state)
    const params = new URLSearchParams({
      client_id: clientId!,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: SCOPES,
      state,
    })
    window.location.href = `https://accounts.spotify.com/authorize?${params}`
  }

  return (
    <div className="min-h-[100dvh] bg-zinc-950 px-5 py-6 text-white sm:px-10 sm:py-10">
      <div className="mx-auto max-w-md">
        <Link href="/" aria-label="Home" title="Home" className="inline-grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-white/20">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="mt-6 text-3xl font-extrabold">Connect Spotify</h1>
        <p className="mt-2 text-white/70">
          The lyrics then follow whatever you play in Spotify — on your phone, computer or speaker.
        </p>
        {serverReady === null ? null : isConfigured ? (
          <>
            <Button onClick={handleLogin} className="mt-6 w-full rounded-full bg-green-500 py-6 text-base font-semibold text-black hover:bg-green-400">
              Continue with Spotify
            </Button>
            <p className="mt-4 text-sm text-white/50">
              During beta, Spotify only lets accounts the app owner has added sign in. Not added?{' '}
              <Link href="/listen" className="underline">Search a song instead</Link> — no account needed.
            </p>
          </>
        ) : (
          <div className="mt-6 space-y-3 rounded-2xl bg-white/5 p-4 text-sm text-white/70 ring-1 ring-white/10">
            <p className="font-semibold text-white">Spotify isn’t set up on this site yet.</p>
            <p>You can still <Link href="/listen" className="underline">search a song</Link> and it plays here with the lyrics.</p>
            <p className="text-white/50">
              Running it yourself? Copy <code>.env.example</code> to <code>.env.local</code> and add your keys from the{' '}
              <a className="underline" href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer">Spotify Developer Dashboard</a>.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

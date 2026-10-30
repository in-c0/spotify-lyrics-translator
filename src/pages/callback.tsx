// pages/callback.tsx
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'

export default function CallbackPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const exchanged = useRef(false) // an authorization code can only be redeemed once

  useEffect(() => {
    if (exchanged.current) return
    exchanged.current = true

    const url = new URL(window.location.href)
    const code = url.searchParams.get('code')
    const authError = url.searchParams.get('error')
    const returnedState = url.searchParams.get('state')
    const expectedState = sessionStorage.getItem('spotify_auth_state')
    sessionStorage.removeItem('spotify_auth_state')

    if (authError) {
      setError(
        authError === 'access_denied'
          ? 'You cancelled the Spotify login.'
          : `Spotify returned an error: ${authError}`
      )
      return
    }
    if (!expectedState || returnedState !== expectedState) {
      // Protects against login CSRF: only accept codes from a login this tab started.
      setError('This login link did not come from this app session. Please log in again.')
      return
    }
    if (!code) {
      setError('No authorization code was returned by Spotify.')
      return
    }

    fetch('/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
      .then(async res => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to exchange the code for tokens.')
        localStorage.setItem('access_token', data.access_token)
        localStorage.setItem('refresh_token', data.refresh_token)
        localStorage.setItem('expires_at', String(Date.now() + data.expires_in * 1000))
        // Full reload so the session provider picks up the new tokens.
        window.location.replace('/')
      })
      .catch(err => setError(err.message))
  }, [router])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-zinc-900 to-black text-white px-6 text-center">
      {error ? (
        <div className="max-w-md space-y-4">
          <p className="text-xl font-semibold">Login didn&apos;t complete</p>
          <p className="text-zinc-300">{error}</p>
          <a href="/" className="inline-block rounded-full bg-green-500 px-5 py-2 text-black font-semibold hover:bg-green-400">
            Try again
          </a>
        </div>
      ) : (
        <p className="text-xl">Processing your login...</p>
      )}
    </div>
  )
}

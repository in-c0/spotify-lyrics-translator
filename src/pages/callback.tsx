// pages/callback.tsx

import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function CallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const url = new URL(window.location.href)
    const code = url.searchParams.get('code')
    const error = url.searchParams.get('error')

    if (error) {
      console.error('Spotify authorization error:', error)
      // Optionally, redirect to an error page
      return
    }

    if (code) {
      // Exchange the authorization code for access and refresh tokens
      fetch('/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code })
      })
      .then(async res => {
        if (!res.ok) {
          throw new Error('Failed to exchange code for tokens')
        }
        const data = await res.json()
        // Store tokens securely (e.g., in cookies)
        // Here we are using localStorage for simplicity
        localStorage.setItem('access_token', data.access_token)
        localStorage.setItem('refresh_token', data.refresh_token)
        localStorage.setItem('expires_in', data.expires_in)
        // Redirect to the main app
        router.push('/')
      })
      .catch(err => {
        console.error('Error exchanging code:', err)
        // Optionally, redirect to an error page
      })
    }
  }, [router])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-zinc-900 to-black text-white">
      <p className="text-xl">Processing your login...</p>
    </div>
  )
}

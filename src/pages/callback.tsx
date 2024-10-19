// pages/callback.tsx
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession } from '../components/SessionProvider'

export default function Callback() {
  const router = useRouter()
  const { setSession } = useSession()

  useEffect(() => {
    const { code, error } = router.query

    if (error) {
      console.error('Spotify authorization error:', error)
      router.push('/') // Redirect to Home (which shows LoginPage)
      return
    }

    if (!code) return

    const exchangeCodeForToken = async () => {
      try {
        const response = await fetch('/api/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        })
        const data = await response.json()
        if (data.access_token && data.refresh_token) {
          localStorage.setItem('access_token', data.access_token)
          localStorage.setItem('refresh_token', data.refresh_token)
          setSession(data.access_token, data.refresh_token)
          router.push('/')
        } else {
          console.error('Failed to obtain tokens:', data)
          router.push('/')
        }
      } catch (error) {
        console.error('Error exchanging code for tokens:', error)
        router.push('/')
      }
    }

    exchangeCodeForToken()
  }, [router, router.query, setSession])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-zinc-900 to-black text-white">
      <p className="text-xl">Processing your login...</p>
    </div>
  )
}

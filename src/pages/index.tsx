// pages/index.tsx
// Connected to Spotify → the lyrics follow whatever you play there.
// Otherwise → the landing page (search a song and it plays here).
import React, { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'
import { useSession } from '../components/SessionProvider'
import Landing from '../components/Landing'

const EnhancedLyricsTranslator = dynamic(() => import('../components/EnhancedLyricsTranslator'), { ssr: false })

export default function Home() {
  const router = useRouter()
  const { isLoggedIn, accessToken, refreshAccessToken, logout } = useSession()

  // Some deployments register the site root as Spotify's redirect URI: finish the login there too.
  useEffect(() => {
    if (!router.isReady) return
    if (router.query.code || router.query.error) {
      router.replace({ pathname: '/callback', query: router.query })
    }
  }, [router])

  if (router.query.code) return <div className="min-h-[100dvh] bg-zinc-950" />
  if (!isLoggedIn) return <Landing />

  return <EnhancedLyricsTranslator onLogout={logout} accessToken={accessToken} refreshToken={refreshAccessToken} />
}

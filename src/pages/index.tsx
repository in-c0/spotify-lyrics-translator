import React from 'react'
import { useSession } from '../components/SessionProvider'
import LoginPage from 'src/pages/LoginPage'
import dynamic from 'next/dynamic'

const EnhancedLyricsTranslator = dynamic(() => import('./EnhancedLyricsTranslator'), { ssr: false })

export default function Home() {
  const { isLoggedIn, accessToken, refreshToken, logout } = useSession()

  if (!isLoggedIn) {
    return <LoginPage />
  }

  return (
    <EnhancedLyricsTranslator 
      accessToken={accessToken} 
      refreshToken={refreshToken}
      onLogout={logout}
    />
  )
}
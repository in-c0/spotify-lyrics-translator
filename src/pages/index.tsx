// pages/index.tsx
import React from 'react'
import { useSession } from '../components/SessionProvider'
import LoginPage from './login'
import dynamic from 'next/dynamic'
import '../styles/globals.css'

// Dynamically import EnhancedLyricsTranslator with no SSR
const EnhancedLyricsTranslator = dynamic(
  () => import('./EnhancedLyricsTranslator'),
  { ssr: false }
)

export default function Home() {
  const { isLoggedIn, accessToken, refreshAccessToken, logout } = useSession()

  if (!isLoggedIn) {
    return <LoginPage />
  }

  return (
    <EnhancedLyricsTranslator
      onLogout={logout}
      accessToken={accessToken}
      refreshToken={refreshAccessToken}
    />
  )
}

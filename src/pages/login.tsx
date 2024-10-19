// components/LoginPage.tsx
import React from 'react'
import { Button } from "@/components/ui/button"

export default function LoginPage() {
  const handleLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
    const redirectUri = encodeURIComponent(process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI || 'http://localhost:3000/callback')
    const scopes = encodeURIComponent('user-read-private user-read-email user-read-playback-state user-modify-playback-state streaming')
    const spotifyAuthUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&scope=${scopes}`
    
    console.log("Client ID:", clientId) // Debugging log
    console.log("Redirect URI:", redirectUri) // Debugging log
    
    window.location.href = spotifyAuthUrl
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-zinc-900 to-black text-white">
      <h1 className="text-4xl font-bold mb-8">Spotify Lyrics Translator</h1>
      <Button onClick={handleLogin} className="bg-green-500 hover:bg-green-600 text-white">
        Login with Spotify
      </Button>
    </div>
  )
}

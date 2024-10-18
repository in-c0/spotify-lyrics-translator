import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Loader2 } from "lucide-react"
import { setTokens } from './utils/tokenManager'

interface CallbackPageProps {
  onLoginSuccess: () => void;
}

export default function CallbackPage({ onLoginSuccess }: CallbackPageProps) {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')
    const error = urlParams.get('error')

    if (error) {
      setError('Failed to authenticate with Spotify')
      setIsLoading(false)
    } else if (code) {
      exchangeCodeForToken(code)
    }
  }, [])

  const exchangeCodeForToken = async (code: string) => {
    try {
      const response = await fetch('/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      })
      const data = await response.json()
      if (data.access_token) {
        setTokens(data)
        onLoginSuccess()
        navigate('/')
      } else {
        setError('Failed to obtain access token')
      }
    } catch (error) {
      setError('An error occurred during authentication')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-zinc-900 to-black text-white">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p className="text-xl">Authenticating with Spotify...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-zinc-900 to-black">
        <Alert variant="destructive" className="w-96">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return null
}
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Loader2 } from "lucide-react"
import { setTokens } from 'src/utils/tokenManager'
import { useSession } from 'src/components/SessionProvider'

export default function CallbackPage() {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const { login } = useSession()

  useEffect(() => {    
    if (!router.isReady) return; // Wait for the router to be ready
  
    const { code, error: urlError } = router.query;
  
    if (urlError) {
      setError('Failed to authenticate with Spotify');
      setIsLoading(false);
    } else if (code) {
      exchangeCodeForToken(code as string);
    }
  }, [router.isReady, router.query]);  

  const exchangeCodeForToken = async (code: string) => {
    try {
      const response = await fetch('/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          redirect_uri: process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI,
        }),
      });
      
      const data = await response.json();
      
      if (data.access_token && data.refresh_token) {
        setTokens(data);  // This should store both access token and refresh token
  
        // Log the user in with the new access token
        login(data.access_token);
        
        // Redirect the user after successful authentication
        router.push('/');
      } else {
        setError('Failed to obtain access token');
      }
    } catch (error) {
      setError('An error occurred during authentication');
    } finally {
      setIsLoading(false);
    }
  };
  

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
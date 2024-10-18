import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Route, Routes, Navigate, useNavigate } from 'react-router-dom'
import LoginPage from './LoginPage'
import CallbackPage from './CallbackPage'
import EnhancedLyricsTranslator from './EnhancedLyricsTranslator'
import { getAccessToken, refreshAccessToken, clearTokens } from './utils/tokenManager'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Loader2 } from "lucide-react"

function AppContent() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    checkLoginStatus()
  }, [])

  const checkLoginStatus = async () => {
    const token = await getAccessToken()
    if (token) {
      setAccessToken(token)
      setIsLoggedIn(true)
    }
  }

  const handleLogout = async () => {
    setIsLoading(true)
    setError(null)
    const refreshToken = localStorage.getItem('spotifyRefreshToken')
    if (refreshToken) {
      try {
        const response = await fetch('/api/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        })

        if (!response.ok) {
          throw new Error('Logout failed')
        }

        clearTokens()
        setAccessToken(null)
        setIsLoggedIn(false)
        navigate('/login')
      } catch (error) {
        console.error('Logout error:', error)
        setError('Failed to logout. Please try again.')
      } finally {
        setIsLoading(false)
      }
    } else {
      setError('No refresh token found. You may already be logged out.')
      setIsLoading(false)
    }
  }

  const handleTokenRefresh = async () => {
    const newToken = await refreshAccessToken()
    if (newToken) {
      setAccessToken(newToken)
    } else {
      handleLogout()
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-zinc-900 to-black text-white">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p className="text-xl">Logging out...</p>
      </div>
    )
  }

  return (
    <>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Routes>
        <Route path="/login" element={
          isLoggedIn ? <Navigate to="/" replace /> : <LoginPage />
        } />
        <Route path="/callback" element={<CallbackPage onLoginSuccess={checkLoginStatus} />} />
        <Route path="/" element={
          isLoggedIn ? (
            <EnhancedLyricsTranslator 
              accessToken={accessToken} 
              onLogout={handleLogout}
              onTokenRefresh={handleTokenRefresh}
            />
          ) : (
            <Navigate to="/login" replace />
          )
        } />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  )
}
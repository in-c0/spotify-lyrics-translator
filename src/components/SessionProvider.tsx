// components/SessionProvider.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface SessionContextProps {
  isLoggedIn: boolean
  accessToken: string | null
  refreshAccessToken: () => Promise<void>
  logout: () => void
  setSession: (accessToken: string, refreshToken: string) => void
}

const SessionContext = createContext<SessionContextProps>({
  isLoggedIn: false,
  accessToken: null,
  refreshAccessToken: async () => {},
  logout: () => {},
  setSession: () => {},
})

interface SessionProviderProps {
  children: ReactNode
}

const SessionProvider: React.FC<SessionProviderProps> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [refreshTokenValue, setRefreshTokenValue] = useState<string | null>(null)

  useEffect(() => {
    // On initial load, check if tokens are stored
    const storedAccessToken = localStorage.getItem('access_token')
    const storedRefreshToken = localStorage.getItem('refresh_token')

    if (storedAccessToken && storedRefreshToken) {
      setAccessToken(storedAccessToken)
      setRefreshTokenValue(storedRefreshToken)
      setIsLoggedIn(true)
    }
  }, [])

  const setSession = (token: string, refresh: string) => {
    setAccessToken(token)
    setRefreshTokenValue(refresh)
    setIsLoggedIn(true)
    localStorage.setItem('access_token', token)
    localStorage.setItem('refresh_token', refresh)
  }

  const logout = () => {
    setIsLoggedIn(false)
    setAccessToken(null)
    setRefreshTokenValue(null)
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  }

  const refreshAccessToken = async () => {
    try {
      const storedRefreshToken = localStorage.getItem('refresh_token')
      if (!storedRefreshToken) throw new Error('No refresh token available')
      const response = await fetch('/api/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: storedRefreshToken }),
      })
      const data = await response.json()
      if (data.access_token) {
        setAccessToken(data.access_token)
        localStorage.setItem('access_token', data.access_token)
      } else {
        throw new Error('Failed to obtain new access token')
      }
    } catch (error) {
      console.error('Token refresh error:', error)
      logout()
    }
  }

  return (
    <SessionContext.Provider value={{ isLoggedIn, accessToken, refreshAccessToken, logout, setSession }}>
      {children}
    </SessionContext.Provider>
  )
}

export default SessionProvider
export const useSession = () => useContext(SessionContext)

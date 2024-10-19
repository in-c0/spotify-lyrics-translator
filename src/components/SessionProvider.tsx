import React, { createContext, useState, useContext, useEffect } from 'react'
import { getAccessToken, refreshAccessToken, clearTokens, TokenResponse } from '../utils/tokenManager'

interface SessionContextType {
  isLoggedIn: boolean;
  accessToken: string | null;
  login: (tokens: TokenResponse) => void;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [accessToken, setAccessToken] = useState<string | null>(null)

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

  const login = (tokens: TokenResponse) => {
    setAccessToken(tokens.access_token)
    setIsLoggedIn(true)
  }

  const logout = () => {
    clearTokens()
    setAccessToken(null)
    setIsLoggedIn(false)
  }

  const refreshToken = async () => {
    const newTokens = await refreshAccessToken()
    if (newTokens) {
      setAccessToken(newTokens.access_token)
    } else {
      logout()
    }
  }

  return (
    <SessionContext.Provider value={{ isLoggedIn, accessToken, login, logout, refreshToken }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const context = useContext(SessionContext)
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider')
  }
  return context
}
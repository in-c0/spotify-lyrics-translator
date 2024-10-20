// components/SessionProvider.tsx

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/router'

// Define the shape of your session context
interface SessionContextProps {
  accessToken: string | null
  refreshAccessToken: () => Promise<void>
  logout: () => void
  isLoggedIn: boolean
}

const SessionContext = createContext<SessionContextProps>({
  accessToken: null,
  refreshAccessToken: async () => {},
  logout: () => {},
  isLoggedIn: false,
})

export const useSession = () => useContext(SessionContext)

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<number | null>(null)
  const router = useRouter()

  // Load tokens from localStorage on mount
  useEffect(() => {
    const storedAccessToken = localStorage.getItem('access_token')
    const storedRefreshToken = localStorage.getItem('refresh_token')
    const storedExpiresIn = localStorage.getItem('expires_in')

    if (storedAccessToken && storedRefreshToken && storedExpiresIn) {
      setAccessToken(storedAccessToken)
      const expiresIn = parseInt(storedExpiresIn)
      setExpiresAt(Date.now() + expiresIn * 1000)
    }
  }, [])

  // Refresh the access token 1 minute before it expires
  useEffect(() => {
    if (!expiresAt) return

    const timeout = expiresAt - Date.now() - 60000 // 1 minute before expiration

    if (timeout <= 0) {
      refreshAccessToken()
      return
    }

    const timer = setTimeout(() => {
      refreshAccessToken()
    }, timeout)

    return () => clearTimeout(timer)
  }, [expiresAt])

  // Function to refresh the access token
  const refreshAccessToken = async () => {
    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) {
      logout()
      return
    }

    try {
      const response = await fetch('/api/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })

      if (!response.ok) {
        throw new Error('Failed to refresh access token')
      }

      const data = await response.json()

      if (data.access_token) {
        setAccessToken(data.access_token)
        localStorage.setItem('access_token', data.access_token)
        const expiresIn = data.expires_in
        setExpiresAt(Date.now() + expiresIn * 1000)
      } else {
        throw new Error('No access token returned')
      }
    } catch (error) {
      console.error('Error refreshing access token:', error)
      logout()
    }
  }

  // Function to log out the user
  const logout = () => {
    setAccessToken(null)
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('expires_in')
    router.push('/login')
  }

  // Derived property to determine if the user is logged in
  const isLoggedIn = accessToken !== null

  return (
    <SessionContext.Provider value={{ accessToken, refreshAccessToken, logout, isLoggedIn }}>
      {children}
    </SessionContext.Provider>
  )
}

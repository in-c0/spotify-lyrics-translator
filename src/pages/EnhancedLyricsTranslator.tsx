// components/EnhancedLyricsTranslator.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Loader2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import LanguageSettings from './LanguageSettings' // Ensure correct import path

interface Lyric {
  original: string
  translated: string
  startTimeMs: number
  endTimeMs: number
}

interface Track {
  name: string
  artist: string
  album: string
  albumArt: string
  duration_ms: number
}

interface UserProfile {
  name: string
  email: string
  image: string
}

interface EnhancedLyricsTranslatorProps {
  accessToken: string | null
  refreshToken: () => Promise<void>
  onLogout: () => void
}

export default function EnhancedLyricsTranslator({ refreshToken, onLogout, accessToken }: EnhancedLyricsTranslatorProps) {
  const [lyrics, setLyrics] = useState<Lyric[]>([])
  const [showRomanization, setShowRomanization] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentLineIndex, setCurrentLineIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [volume, setVolume] = useState(70)
  const [isMuted, setIsMuted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Translation settings state
  const [fromLanguage, setFromLanguage] = useState<string>('auto') // Default to auto-detect
  const [toLanguage, setToLanguage] = useState<string>('en') // Default to English
  const [rubyText, setRubyText] = useState<boolean>(false)
  const [hangulSystem, setHangulSystem] = useState<string>('Revised')
  const [japaneseTarget, setJapaneseTarget] = useState<string>('Romaji')
  const [japaneseMode, setJapaneseMode] = useState<string>('Normal')
  const [romajiSystem, setRomajiSystem] = useState<string>('Hepburn')
  const [okuriganaDelimiter, setOkuriganaDelimiter] = useState<string>('( )')

  // Function to refresh access token
  const onTokenRefresh = useCallback(async () => {
    await refreshToken()
  }, [refreshToken])

  // Fetch with token, retry once on 401
  const fetchWithToken = useCallback(
    async (url: string, options: RequestInit = {}, retry = true) => {
      console.log('Fetching:', url)
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'Authorization': `Bearer ${accessToken}`,
          },
        })

        if (response.status === 401 && retry) {
          console.log('Token expired, refreshing token...')
          await onTokenRefresh()

          // Retry the request with the refreshed token
          return fetchWithToken(url, options, false) // Pass `retry = false` to avoid infinite loop
        }

        return response
      } catch (error) {
        console.error('Fetch error:', error)
        throw error
      }
    },
    [accessToken, onTokenRefresh]
  )

  // Translate lyrics using the backend API
  const translateLyrics = useCallback(async (lyricsToTranslate: Lyric[]) => {
    if (!toLanguage) return

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: lyricsToTranslate.map(line => line.original),
          sourceLang: fromLanguage === 'auto' ? 'auto' : fromLanguage.toLowerCase(),
          targetLang: toLanguage.toLowerCase(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to translate lyrics.')
      }

      const data = await response.json()
      const translatedText: string[] = data.translatedText

      // Map translated text back to lyrics
      const updatedLyrics: Lyric[] = lyricsToTranslate.map((line, index) => ({
        ...line,
        translated: translatedText[index] || '',
      }))

      setLyrics(updatedLyrics)
    } catch (error: any) {
      console.error('Translation error:', error)
      setError(error.message || 'Failed to translate lyrics.')
    }
  }, [fromLanguage, toLanguage])

  // Fetch lyrics from the API route
  const fetchLyrics = useCallback(async (trackName: string, artistName: string) => {
    try {
      setError(null) // Reset error state before fetching
      setLyrics([]) // Clear existing lyrics
      const response = await fetch(`/api/lyrics?track=${encodeURIComponent(trackName)}&artist=${encodeURIComponent(artistName)}`)
      if (!response.ok) {
        if (response.status === 404) {
          setError('Lyrics not found for this track.')
        } else {
          setError('Failed to fetch lyrics.')
        }
        return
      }
      const data = await response.json()
      if (data.lyrics && data.lyrics.length > 0) {
        // Initialize translated lyrics as empty strings
        const initialLyrics: Lyric[] = data.lyrics.map((line: any) => ({
          original: line.original,
          translated: '',
          startTimeMs: line.startTimeMs,
          endTimeMs: line.endTimeMs,
        }))
        setLyrics(initialLyrics)
        // After setting original lyrics, initiate translation
        translateLyrics(initialLyrics)
      } else {
        setError('Lyrics not available for this track.')
      }
    } catch (error) {
      console.error('Error fetching lyrics:', error)
      setError('An unexpected error occurred while fetching lyrics.')
    }
  }, [translateLyrics])

  // Fetch the currently playing track
  const fetchCurrentTrack = useCallback(async () => {
    try {
      const response = await fetchWithToken('https://api.spotify.com/v1/me/player/currently-playing')

      if (response.status === 204) {
        console.log('No track currently playing')
        setError('No track is currently playing.')
        setCurrentTrack(null)
        setLyrics([])
        return
      }

      if (!response.ok) {
        throw new Error('Failed to fetch current track.')
      }

      const data = await response.json()
      setCurrentTrack({
        name: data.item.name,
        artist: data.item.artists[0].name,
        album: data.item.album.name,
        albumArt: data.item.album.images[0].url,
        duration_ms: data.item.duration_ms,
      })
      setIsPlaying(data.is_playing)
      setProgress((data.progress_ms / data.item.duration_ms) * 100)
      fetchLyrics(data.item.name, data.item.artists[0].name)
    } catch (error) {
      console.error('Error fetching current track:', error)
      setError('Failed to fetch the current track.')
    }
  }, [fetchWithToken, fetchLyrics])

  // Fetch user profile from Spotify
  const fetchUserProfile = useCallback(async () => {
    try {
      const response = await fetchWithToken('https://api.spotify.com/v1/me')
      if (!response.ok) {
        throw new Error('Failed to fetch user profile.')
      }
      const data = await response.json()
      console.log('User profile data:', data)
      setUserProfile({
        name: data.display_name,
        email: data.email,
        image: data.images?.[0]?.url || '',
      })
    } catch (error) {
      console.error('Error fetching user profile:', error)
      setError('Failed to fetch user profile.')
    }
  }, [fetchWithToken])

  // Fetch initial data (current track and user profile)
  const fetchInitialData = useCallback(async () => {
    console.log('Fetching initial data...')
    setIsLoading(true)
    setError(null)
    try {
      await Promise.all([fetchCurrentTrack(), fetchUserProfile()])
    } catch (error) {
      console.error('Error fetching initial data:', error)
      setError('Failed to fetch initial data.')
    } finally {
      setIsLoading(false)
    }
  }, [fetchCurrentTrack, fetchUserProfile])

  // Effect to fetch data when accessToken is available
  useEffect(() => {
    if (accessToken) {
      console.log('Access token available, fetching initial data...')
      fetchInitialData()
    } else {
      console.log('No access token available')
      setIsLoading(false)
    }
  }, [accessToken, fetchInitialData])

  // Ref to store the interval ID
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Effect to update progress and handle track changes
  useEffect(() => {
    // Function to fetch and update progress
    const updateProgress = async () => {
      if (currentTrack) {
        try {
          const response = await fetchWithToken('https://api.spotify.com/v1/me/player/currently-playing')
          if (response.ok) {
            const data = await response.json()
            if (data.item && data.progress_ms !== undefined) {
              const newProgress = (data.progress_ms / data.item.duration_ms) * 100
              setProgress(newProgress)
              setIsPlaying(data.is_playing)

              // Optional: Update current track if it has changed
              if (data.item.name !== currentTrack.name || data.item.artists[0].name !== currentTrack.artist) {
                setCurrentTrack({
                  name: data.item.name,
                  artist: data.item.artists[0].name,
                  album: data.item.album.name,
                  albumArt: data.item.album.images[0].url,
                  duration_ms: data.item.duration_ms,
                })
                fetchLyrics(data.item.name, data.item.artists[0].name)
              }
            } else {
              setError('No track information available.')
              setIsPlaying(false)
            }
          } else if (response.status === 204) {
            setError('No track is currently playing.')
            setCurrentTrack(null)
            setIsPlaying(false)
          } else {
            setError('Unable to fetch current playback position.')
            setIsPlaying(false)
          }
        } catch (error) {
          console.error('Error updating progress:', error)
          setError('Failed to update progress.')
        }
      }
    }

    // If the track is playing, set up the interval
    if (isPlaying && currentTrack) {
      // Initial fetch to sync immediately
      updateProgress()

      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }

      // Set up a new interval (every 1 second)
      intervalRef.current = setInterval(updateProgress, 1000)
      console.log('Interval set for updating progress every second.')
    }

    // If not playing, clear the interval
    if (!isPlaying && intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
      console.log('Interval cleared as isPlaying is false.')
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
        console.log('Interval cleared on cleanup.')
      }
    }
  }, [isPlaying, currentTrack, fetchWithToken, fetchLyrics])

  // Handle volume change
  const handleVolumeChange = async (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const newVolume = Math.round((x / rect.width) * 100)
    setVolume(Math.max(0, Math.min(100, newVolume)))
    setIsMuted(false)
    try {
      await fetchWithToken('https://api.spotify.com/v1/me/player/volume', {
        method: 'PUT',
        body: JSON.stringify({ volume_percent: newVolume }),
      })
    } catch (error) {
      console.error('Error updating volume:', error)
      setError('Failed to update volume.')
    }
  }

  // Handle play/pause toggle
  const handlePlayPause = async () => {
    try {
      await fetchWithToken(`https://api.spotify.com/v1/me/player/${isPlaying ? 'pause' : 'play'}`, {
        method: 'PUT',
      })
      setIsPlaying(!isPlaying)

      // Add a small delay before re-fetching the track
      setTimeout(() => {
        fetchCurrentTrack() // Fetch the current track after toggling play/pause
      }, 1000) // 1-second delay to avoid rapid re-fetching
    } catch (error) {
      console.error('Error toggling play/pause:', error)
      setError('Failed to play/pause track.')
    }
  }

  // Handle skipping tracks
  const handleSkip = async (direction: 'next' | 'previous') => {
    try {
      await fetchWithToken(`https://api.spotify.com/v1/me/player/${direction}`, {
        method: 'POST',
      })
      fetchCurrentTrack()
    } catch (error) {
      console.error(`Error skipping ${direction}:`, error)
      setError(`Failed to skip to the ${direction} track.`)
    }
  }

  // Handle seeking within the track
  const handleSeek = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!currentTrack) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const newProgress = (x / rect.width) * 100
    setProgress(newProgress)

    const position_ms = Math.round((newProgress / 100) * currentTrack.duration_ms)
    try {
      await fetchWithToken(`https://api.spotify.com/v1/me/player/seek?position_ms=${position_ms}`, {
        method: 'PUT',
      })
    } catch (error) {
      console.error('Error seeking track:', error)
      setError('Failed to seek within the track.')
    }
  }

  // Handle mute toggle
  const toggleMute = async () => {
    const newMutedState = !isMuted
    setIsMuted(newMutedState)
    try {
      await fetchWithToken('https://api.spotify.com/v1/me/player/volume', {
        method: 'PUT',
        body: JSON.stringify({ volume_percent: newMutedState ? 0 : volume }),
      })
      if (newMutedState) {
        setVolume(0)
      } else {
        setVolume(70) // Restore to previous volume or a default value
      }
    } catch (error) {
      console.error('Error toggling mute:', error)
      setError('Failed to toggle mute.')
    }
  }

  // Format milliseconds to mm:ss
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Effect to sync lyrics highlighting with song progress
  useEffect(() => {
    if (lyrics.length === 0 || !currentTrack) return

    // Highlight current lyric line based on progress
    const currentTimeMs = (progress / 100) * currentTrack.duration_ms
    const currentLyricIndex = lyrics.findIndex(
      (lyric, index) =>
        currentTimeMs >= lyric.startTimeMs &&
        (index === lyrics.length - 1 || currentTimeMs < lyrics[index + 1].startTimeMs)
    )

    if (currentLyricIndex !== -1 && currentLyricIndex !== currentLineIndex) {
      setCurrentLineIndex(currentLyricIndex)
    }
  }, [progress, lyrics, currentLineIndex, currentTrack])

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-zinc-900 to-black text-white">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p className="text-xl">Loading your Spotify data...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-zinc-900 to-black text-white p-8">
      <div className="w-full max-w-3xl bg-zinc-800/50 rounded-lg shadow-lg overflow-hidden backdrop-blur-md">
        <div className="p-6">
          {/* Header Section */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Spotify Lyrics Translator</h1>
            <div className="flex items-center space-x-2">
              {accessToken && userProfile ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={userProfile.image} alt={userProfile.name} />
                        <AvatarFallback>{userProfile.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{userProfile.name}</p>
                        <p className="text-xs leading-none text-muted-foreground">{userProfile.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => window.open('https://www.spotify.com/account/overview/', '_blank')}>
                      Spotify Account
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onLogout}>
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button onClick={() => window.location.href = '/login'}>Log in</Button>
              )}
            </div>
          </div>

          {/* Language Settings */}
          <LanguageSettings
            fromLanguage={fromLanguage}
            toLanguage={toLanguage}
            setFromLanguage={setFromLanguage}
            setToLanguage={setToLanguage}
            rubyText={rubyText}
            setRubyText={setRubyText}
            hangulSystem={hangulSystem}
            setHangulSystem={setHangulSystem}
            japaneseTarget={japaneseTarget}
            setJapaneseTarget={setJapaneseTarget}
            japaneseMode={japaneseMode}
            setJapaneseMode={setJapaneseMode}
            romajiSystem={romajiSystem}
            setRomajiSystem={setRomajiSystem}
            okuriganaDelimiter={okuriganaDelimiter}
            setOkuriganaDelimiter={setOkuriganaDelimiter}
          />

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Current Track Information */}
          <div className="flex items-center mb-6">
            <div className="w-16 h-16 bg-zinc-700 rounded-md mr-4">
              {currentTrack?.albumArt ? (
                <img src={currentTrack.albumArt} alt="Album cover" className="w-full h-full object-cover rounded-md" />
              ) : (
                <div className="w-full h-full bg-zinc-600 rounded-md"></div>
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{currentTrack?.name || 'No track playing'}</h2>
              <p className="text-zinc-400">{currentTrack?.artist || 'Unknown artist'}</p>
            </div>
          </div>

          {/* Lyrics Section */}
          <div className="space-y-4 mb-6 h-64 overflow-y-auto overflow-x-hidden hide-scrollbar pr-4">
            {lyrics.length > 0 ? (
              lyrics.map((line, index) => (
                <div
                  key={index}
                  className={`transition-all duration-300 ${index === currentLineIndex ? 'scale-105 text-green-400' : 'scale-100 text-white'}`}
                >
                  <div className="pl-2 -ml-2">
                    <p className="text-lg font-semibold">{line.original}</p>
                    {/* Display translated lyrics if available */}
                    {line.translated && <p className="text-sm text-zinc-300">{line.translated}</p>}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-zinc-400">Lyrics not available for this track.</p>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-zinc-400 mb-1">
              <span>{currentTrack ? formatTime(currentTrack.duration_ms * (progress / 100)) : '0:00'}</span>
              <span>{currentTrack ? formatTime(currentTrack.duration_ms) : '0:00'}</span>
            </div>
            <div
              className="w-full bg-zinc-600 rounded-full h-1 overflow-hidden cursor-pointer"
              onClick={handleSeek}
            >
              <div
                className="bg-green-500 h-full rounded-full transition-all duration-100 ease-linear"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon" onClick={() => handleSkip('previous')} className="hover:bg-zinc-700/50 transition-colors">
                <SkipBack className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handlePlayPause} className="bg-green-500 hover:bg-green-600 text-black rounded-full transition-colors">
                {isPlaying ? <Pause className="h-6 w-6" fill="currentColor" /> : <Play className="h-6 w-6" fill="currentColor" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleSkip('next')} className="hover:bg-zinc-700/50 transition-colors">
                <SkipForward className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="icon" onClick={toggleMute} className="hover:bg-zinc-700/50 transition-colors">
                {isMuted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
              </Button>
              <div
                className="w-24 bg-zinc-600 rounded-full h-1 overflow-hidden cursor-pointer"
                onClick={handleVolumeChange}
              >
                <div
                  className="bg-white h-full rounded-full"
                  style={{ width: `${isMuted ? 0 : volume}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

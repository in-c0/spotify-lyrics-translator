// src/components/EnhancedLyricsTranslator.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Pause, Play, SkipBack, SkipForward, Volume2, VolumeX, Settings, Languages } from 'lucide-react'
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
import LanguageSelector from './LanguageSelector'
import SettingsSheet from './SettingsSheet'
import { activeLineIndex, type Lyric } from '@/lib/lrc'

// Import Romanization Libraries
import { toRomaji } from 'wanakana'
import { romanize } from '@romanize/korean'
import { Label } from '@/components/ui/label'

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

interface Translation {
  translatedText: string
  detectedSourceLanguage: string
}

interface TranslateResponse {
  translations: Translation[]
}

interface Language {
  code: string
  name: string
}

const languageCodeToName = (code: string): string => {
  const languageMap: { [key: string]: string } = {
    'auto': 'Auto',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese',
    'en': 'English',
    'es': 'Spanish',
    // Add more languages as needed
  }

  return languageMap[code] || code
}


export default function EnhancedLyricsTranslator({ refreshToken, onLogout, accessToken }: EnhancedLyricsTranslatorProps) {
  const [lyrics, setLyrics] = useState<Lyric[]>([])
  const [isRomanizationEnabled, setIsRomanizationEnabled] = useState<boolean>(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentLineIndex, setCurrentLineIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [volume, setVolume] = useState(70)
  const [isMuted, setIsMuted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRomanizing, setIsRomanizing] = useState<boolean>(false) // Loading state for Romanization
  const [lyricsSynced, setLyricsSynced] = useState<boolean>(true)
  const [lyricsStatus, setLyricsStatus] = useState<'idle' | 'loading' | 'ready' | 'missing' | 'instrumental'>('idle')

  // Translation settings state
  const [fromLanguage, setFromLanguage] = useState<string>('auto') // Default to auto-detect
  const [toLanguage, setToLanguage] = useState<string>('en') // Default to English
  const [rubyText, setRubyText] = useState<boolean>(false)
  const [hangulSystem, setHangulSystem] = useState<string>('Revised')
  const [japaneseTarget, setJapaneseTarget] = useState<string>('Romaji')
  const [japaneseMode, setJapaneseMode] = useState<string>('Normal')
  const [romajiSystem, setRomajiSystem] = useState<string>('Hepburn')
  const [okuriganaDelimiter, setOkuriganaDelimiter] = useState<string>('( )')

  const [detectedLanguage, setDetectedLanguage] = useState<string>('auto') // New state for detected language

  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false) // State for SettingsSheet

  const languages: Language[] = [
    { code: 'auto', name:  '🌐 Auto Detect' },
    { code: 'ja', name: '🇯🇵 Japanese' },
    { code: 'ko', name: '🇰🇷 Korean' },
    { code: 'zh', name: '🇨🇳 Chinese' },
    { code: 'en', name: '🇬🇧 English' },
    { code: 'es', name: '🇪🇸 Spanish' },
    { code: 'ru', name: '🇷🇺 Russian' },
    { code: 'pt', name: '🇵🇹 Portuguese' },

    // Add more languages as needed
  ]
  // Function to apply Romanization
  const applyRomanization = useCallback(async (lyricsToRomanize: Lyric[], lang: string) => {
    setIsRomanizing(true)
    if (lang === 'ja') {
      try {
        const romanizedLyrics = lyricsToRomanize.map(line => ({
          ...line,
          romanized: typeof line.original === 'string' ? toRomaji(line.original) : '',
        }))
        setLyrics(romanizedLyrics)
      } catch (error: any) {
        console.error('Error during Japanese Romanization:', error)
        setError('Failed to Romanize Japanese lyrics.')
      }
    } else if (lang === 'ko') {
      try {
        const romanizedLyrics = lyricsToRomanize.map(line => ({
          ...line,
          romanized: typeof line.original === 'string' ? romanize(line.original, { system: hangulSystem }) : '',
        }))
        setLyrics(romanizedLyrics)
      } catch (error: any) {
        console.error('Error during Korean Romanization:', error)
        setError('Failed to Romanize Korean lyrics.')
      }
    } else {
      // Unsupported language for Romanization
      setLyrics(lyricsToRomanize.map(line => ({
        ...line,
        romanized: '',
      })))
    }
    setIsRomanizing(false)
  }, [hangulSystem])
  const resetJapaneseSettings = () => {
    setJapaneseTarget('Romaji')
    setJapaneseMode('Normal')
    setRomajiSystem('Hepburn')
    setOkuriganaDelimiter('( )')
  }
  
  const resetKoreanSettings = () => {
    setHangulSystem('Revised')
  }
  
  const resetChineseSettings = () => {
    setRubyText(false)
  }

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

  // Latest lyrics, readable from async callbacks without re-subscribing effects.
  const lyricsRef = useRef<Lyric[]>([])
  useEffect(() => { lyricsRef.current = lyrics }, [lyrics])

  // Translate lyrics using the backend API
  const translateLyrics = useCallback(async (lyricsToTranslate: Lyric[]) => {
    if (!toLanguage || lyricsToTranslate.length === 0) return

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: lyricsToTranslate.map(line => line.original),
          sourceLang: fromLanguage, // Can be 'auto', 'ja', 'ko', etc.
          targetLang: toLanguage.toLowerCase(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to translate lyrics.')
      }

      const data = await response.json() as TranslateResponse

      // Use the most common detected language (the first line is often an English hook).
      const counts: Record<string, number> = {}
      for (const t of data.translations) {
        if (t.detectedSourceLanguage && t.detectedSourceLanguage !== 'auto') {
          counts[t.detectedSourceLanguage] = (counts[t.detectedSourceLanguage] || 0) + 1
        }
      }
      const firstDetectedLang = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'auto'

      setDetectedLanguage(firstDetectedLang)

      const translatedText: string[] = data.translations.map(t => t.translatedText)

      // Map translated text back to lyrics
      const updatedLyrics: Lyric[] = lyricsToTranslate.map((line, index) => ({
        ...line,
        translated: translatedText[index] || '',
      }))

      setLyrics(updatedLyrics)

      // Apply Romanization if enabled and detected language is suitable
      if (isRomanizationEnabled && (firstDetectedLang === 'ja' || firstDetectedLang === 'ko')) {
        applyRomanization(updatedLyrics, firstDetectedLang)
      }
    } catch (error: any) {
      console.error('Translation error:', error)
      setError(error.message || 'Failed to translate lyrics.')
    }
  }, [fromLanguage, toLanguage, isRomanizationEnabled, applyRomanization])

  // Fetch lyrics from the API route
  const fetchLyrics = useCallback(async (track: Track) => {
    try {
      setError(null) // Reset error state before fetching
      setLyrics([]) // Clear existing lyrics
      setLyricsStatus('loading')
      const params = new URLSearchParams({
        track: track.name,
        artist: track.artist,
        album: track.album,
        durationMs: String(track.duration_ms),
      })
      const response = await fetch(`/api/lyrics?${params}`)
      const data = await response.json()
      if (!response.ok) {
        setLyricsStatus(data.instrumental ? 'instrumental' : 'missing')
        if (response.status !== 404) setError(data.error || 'Failed to fetch lyrics.')
        return
      }
      if (data.lyrics && data.lyrics.length > 0) {
        const initialLyrics: Lyric[] = data.lyrics
        setLyricsSynced(Boolean(data.synced))
        setLyrics(initialLyrics)
        setLyricsStatus('ready')
        // After setting original lyrics, initiate translation
        translateLyrics(initialLyrics)
      } else {
        setLyricsStatus('missing')
      }
    } catch (error) {
      console.error('Error fetching lyrics:', error)
      setLyricsStatus('missing')
      setError('An unexpected error occurred while fetching lyrics.')
    }
  }, [translateLyrics])

  // Re-translate the current lyrics when the language pair changes.
  const translateRef = useRef(translateLyrics)
  useEffect(() => {
    if (translateRef.current === translateLyrics) return
    translateRef.current = translateLyrics
    if (lyricsRef.current.length > 0) translateLyrics(lyricsRef.current)
  }, [translateLyrics])

  // Playback snapshot from the last poll; progress is interpolated locally between polls.
  const playbackRef = useRef({ trackId: '', progressMs: 0, at: 0, isPlaying: false, durationMs: 0 })
  const fetchLyricsRef = useRef(fetchLyrics)
  useEffect(() => { fetchLyricsRef.current = fetchLyrics }, [fetchLyrics])

  // Read the currently playing item. Runs on a loop for the whole session, so playback
  // started (or changed) in any Spotify app after this page loads is picked up automatically.
  const pollPlayback = useCallback(async () => {
    try {
      const response = await fetchWithToken('https://api.spotify.com/v1/me/player/currently-playing')
      const data = response.status === 204 ? null : response.ok ? await response.json() : undefined

      if (data === undefined) {
        if (response.status === 429) return // rate-limited: just wait for the next poll
        setError('Unable to read your Spotify playback right now.')
        return
      }

      const item = data?.item
      if (!item || data.currently_playing_type !== 'track') {
        // Nothing playing, or an ad / podcast episode.
        playbackRef.current = { trackId: '', progressMs: 0, at: Date.now(), isPlaying: false, durationMs: 0 }
        setIsPlaying(false)
        setCurrentTrack(null)
        setLyrics([])
        setLyricsStatus('idle')
        return
      }

      const isNewTrack = item.id !== playbackRef.current.trackId
      playbackRef.current = {
        trackId: item.id,
        progressMs: data.progress_ms ?? 0,
        at: Date.now(),
        isPlaying: data.is_playing,
        durationMs: item.duration_ms,
      }
      setIsPlaying(data.is_playing)

      if (isNewTrack) {
        const track: Track = {
          name: item.name,
          artist: item.artists?.[0]?.name || '',
          album: item.album?.name || '',
          albumArt: item.album?.images?.[0]?.url || '',
          duration_ms: item.duration_ms,
        }
        setCurrentTrack(track)
        fetchLyricsRef.current(track)
      }
      setError(null)
    } catch (error) {
      console.error('Error reading playback:', error)
    } finally {
      setIsLoading(false)
    }
  }, [fetchWithToken])

  // Poll loop: every 2s while playing, every 5s while idle/paused.
  useEffect(() => {
    if (!accessToken) {
      setIsLoading(false)
      return
    }
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>
    const loop = async () => {
      await pollPlayback()
      if (cancelled) return
      timer = setTimeout(loop, playbackRef.current.isPlaying ? 2000 : 5000)
    }
    loop()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [accessToken, pollPlayback])

  // Smooth progress between polls.
  useEffect(() => {
    const tick = setInterval(() => {
      const p = playbackRef.current
      if (!p.durationMs) return
      const elapsed = p.isPlaying ? Date.now() - p.at : 0
      setProgress(Math.min(100, ((p.progressMs + elapsed) / p.durationMs) * 100))
    }, 200)
    return () => clearInterval(tick)
  }, [])

  // Fetch user profile from Spotify (optional; the app works without it)
  const fetchUserProfile = useCallback(async () => {
    try {
      const response = await fetchWithToken('https://api.spotify.com/v1/me')
      if (!response.ok) return
      const data = await response.json()
      setUserProfile({
        name: data.display_name || data.id || 'Spotify user',
        email: data.email || '',
        image: data.images?.[0]?.url || '',
      })
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
  }, [fetchWithToken])

  useEffect(() => {
    if (accessToken) fetchUserProfile()
  }, [accessToken, fetchUserProfile])

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
      playbackRef.current = { ...playbackRef.current, isPlaying: !isPlaying }
      setTimeout(pollPlayback, 600)
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
      setTimeout(pollPlayback, 600)
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
    playbackRef.current = { ...playbackRef.current, progressMs: position_ms, at: Date.now() }
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
    if (!lyricsSynced || lyrics.length === 0 || !currentTrack) {
      setCurrentLineIndex(-1)
      return
    }
    const currentTimeMs = (progress / 100) * currentTrack.duration_ms
    setCurrentLineIndex(activeLineIndex(lyrics, currentTimeMs))
  }, [progress, lyrics, lyricsSynced, currentTrack])

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
              {accessToken ? (
                <>
                  {/* Settings Button */}
                  <SettingsSheet
                    isSettingsOpen={isSettingsOpen}
                    setIsSettingsOpen={setIsSettingsOpen}
                    fromLanguage={fromLanguage}
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
                  {/* User Profile Dropdown */}
                  {userProfile && <DropdownMenu>
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
                          {userProfile.email && <p className="text-xs leading-none text-muted-foreground">{userProfile.email}</p>}
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
                  </DropdownMenu>}
                  {!userProfile && (
                    <Button variant="ghost" onClick={onLogout} className="text-zinc-300">Log out</Button>
                  )}
                </>
              ) : (
                <Button onClick={() => window.location.href = '/login'}>Log in</Button>
              )}
            </div>
          </div>

          {/* Language Selector and Romanization Toggle */}
          <LanguageSelector
            fromLanguage={fromLanguage}
            toLanguage={toLanguage}
            setFromLanguage={setFromLanguage}
            setToLanguage={setToLanguage}
            languages={languages}
            resetJapaneseSettings={resetJapaneseSettings}
            resetKoreanSettings={resetKoreanSettings}
            resetChineseSettings={resetChineseSettings}
          />
          {/* Loading Indicator for Romanization */}
          {isRomanizing && (
            <div className="flex items-center mb-4">
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              <span className="text-sm text-zinc-400">Applying Romanization...</span>
            </div>
          )}

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
              <>
                {/* From Language Label */}
                <div className="mb-2 text-sm text-zinc-400">
                  {fromLanguage === 'auto'
                    ? `From: Auto (${languageCodeToName(detectedLanguage)})`
                    : `From: ${languageCodeToName(fromLanguage)}`}
                </div>
                {!lyricsSynced && (
                  <div className="mb-2 text-xs text-zinc-500">These lyrics are not time-synced, so lines won&apos;t highlight.</div>
                )}
                {lyrics.map((line, index) => (
                  <div
                    key={index}
                    className={`transition-all duration-300 ${index === currentLineIndex ? 'scale-105 text-green-400' : 'scale-100 text-white'}`}
                  >
                    <div className="pl-2 -ml-2">
                      <p className="text-lg font-semibold">{line.original}</p>
                      {/* Display Romanized lyrics if enabled */}
                      {isRomanizationEnabled && line.romanized && (
                        <p className="text-sm text-zinc-300 italic">{line.romanized}</p>
                      )}
                      {/* Display translated lyrics if available */}
                      {line.translated && line.translated.trim().toLowerCase() !== line.original.trim().toLowerCase() && (
                        <p className="text-sm text-zinc-300">{line.translated}</p>
                      )}
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <p className="text-center text-zinc-400 pt-20">
                {lyricsStatus === 'idle' && 'Play a song in any Spotify app — it will show up here automatically.'}
                {lyricsStatus === 'loading' && 'Looking up lyrics…'}
                {lyricsStatus === 'missing' && 'No lyrics found for this track yet.'}
                {lyricsStatus === 'instrumental' && '♪ Instrumental'}
                {lyricsStatus === 'ready' && ''}
              </p>
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
            <div className="flex items-center space-x-4">
              {/* Romanization Toggle */}
              <div className="flex items-center space-x-2">
                <Languages className="h-5 w-5 text-zinc-400" />
                <Switch
                  id="romanization"
                  checked={isRomanizationEnabled}
                  onCheckedChange={(checked) => {
                    setIsRomanizationEnabled(checked);
                    if (checked && (detectedLanguage === 'ja' || detectedLanguage === 'ko')) {
                      applyRomanization(lyrics, detectedLanguage);
                    } else {
                      // Remove Romanized text when toggle is off
                      const clearedLyrics = lyrics.map(line => ({
                        ...line,
                        romanized: '',
                      }));
                      setLyrics(clearedLyrics);
                    }
                  }}
                  className="bg-zinc-600 data-[state=checked]:bg-green-500"
                />
              </div>
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

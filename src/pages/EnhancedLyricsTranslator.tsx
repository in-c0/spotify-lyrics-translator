// components/EnhancedLyricsTranslator.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Loader2 } from "lucide-react" // Ensure Loader2 is imported here
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useRouter } from 'next/router'

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void
    Spotify: any
  }
}

interface Lyric {
  original: string
  romanized: string
  translated: string
  timestamp?: number // Optional: For synchronized lyrics
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
  product: string // To check if user has Premium
}

interface EnhancedLyricsTranslatorProps {
  accessToken: string | null
  refreshToken: () => Promise<void>
  onLogout: () => void
}

export default function EnhancedLyricsTranslator({ accessToken, refreshToken, onLogout }: EnhancedLyricsTranslatorProps) {
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
  const [player, setPlayer] = useState<any>(null)
  const [deviceId, setDeviceId] = useState<string | null>(null)

  const router = useRouter()

  const onTokenRefresh = useCallback(async () => {
    try {
      await refreshToken()
    } catch (error) {
      console.error('Token refresh error:', error)
    }

    if (deviceId && accessToken) {
      try {
        const response = await fetch('https://api.spotify.com/v1/me/player', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            device_ids: [deviceId],
            play: true,
          }),
        })

        if (!response.ok) {
          console.error('Failed to transfer playback after token refresh')
        }
      } catch (error) {
        console.error('Error transferring playback after token refresh:', error)
      }
    }
  }, [deviceId, accessToken, refreshToken])

  const fetchWithToken = useCallback(async (url: string, options: RequestInit = {}, retry = true) => {
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
        return fetchWithToken(url, options, false)
      }

      return response
    } catch (error) {
      console.error('Fetch error:', error)
      throw error
    }
  }, [accessToken, onTokenRefresh])

  const fetchLyrics = useCallback(async (trackName: string, artistName: string) => {
    try {
      const response = await fetch(`/api/lyrics?track=${encodeURIComponent(trackName)}&artist=${encodeURIComponent(artistName)}`)
      if (!response.ok) {
        throw new Error('Failed to fetch lyrics')
      }
      const data = await response.json()
      setLyrics(data.lyrics)
    } catch (error) {
      console.error(error)
      setError('Failed to fetch lyrics')
    }
  }, [])

  const fetchCurrentTrack = useCallback(async () => {
    try {
      const response = await fetchWithToken('https://api.spotify.com/v1/me/player/currently-playing')
      
      if (response.status === 204) {
        console.log('No track currently playing')
        setError('No track currently playing')
        setCurrentTrack(null)
        return
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
      setError('Failed to fetch current track')
    }
  }, [fetchWithToken, fetchLyrics])

  const fetchUserProfile = useCallback(async () => {
    try {
      const response = await fetchWithToken('https://api.spotify.com/v1/me')
      if (!response.ok) {
        throw new Error('Failed to fetch user profile')
      }
      const data = await response.json()
      console.log('User profile data:', data)
      setUserProfile({
        name: data.display_name,
        email: data.email,
        image: data.images?.[0]?.url || '',
        product: data.product,
      })

      // Check if user has Premium
      if (data.product !== 'premium') {
        setError('Spotify Premium is required for this functionality.')
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
      setError('Failed to fetch user profile')
    }
  }, [fetchWithToken])

  const fetchInitialData = useCallback(async () => {
    console.log('Fetching initial data...')
    setIsLoading(true)
    setError(null)
    try {
      await Promise.all([fetchCurrentTrack(), fetchUserProfile()])
    } catch (error) {
      console.error('Error fetching initial data:', error)
      setError('Failed to fetch initial data')
    } finally {
      setIsLoading(false)
    }
  }, [fetchCurrentTrack, fetchUserProfile])

  useEffect(() => {
    if (accessToken) {
      console.log('Access token available, fetching initial data...')
      fetchInitialData()
    } else {
      console.log('No access token available')
      setIsLoading(false)
    }
  }, [accessToken, fetchInitialData])

  // Initialize Spotify Player
  useEffect(() => {
    if (!accessToken) return

    window.onSpotifyWebPlaybackSDKReady = () => {
      if (!accessToken) {
        console.error('Access token is required for Spotify Player')
        setIsLoading(false)
        return
      }

      const spotifyPlayer = new window.Spotify.Player({
        name: 'Spotify Lyrics Translator',
        getOAuthToken: (cb: (token: string) => void) => { cb(accessToken); },
        volume: 0.5
      })

      setPlayer(spotifyPlayer)

      // Error handling
      spotifyPlayer.addListener('initialization_error', ({ message }: { message: string }) => {
        console.error('Initialization Error:', message)
        setError(message)
      })
      spotifyPlayer.addListener('authentication_error', ({ message }: { message: string }) => {
        console.error('Authentication Error:', message)
        setError(message)
      })
      spotifyPlayer.addListener('account_error', ({ message }: { message: string }) => {
        console.error('Account Error:', message)
        setError(message)
      })
      spotifyPlayer.addListener('playback_error', ({ message }: { message: string }) => {
        console.error('Playback Error:', message)
        setError(message)
      })

      // Playback status updates
      spotifyPlayer.addListener('player_state_changed', (state: any) => {
        if (!state) {
          return
        }

        setIsPlaying(!state.paused)
        setProgress((state.position / state.duration) * 100)
        setCurrentTrack({
          name: state.track_window.current_track.name,
          artist: state.track_window.current_track.artists.map((artist: any) => artist.name).join(', '),
          album: state.track_window.current_track.album.name,
          albumArt: state.track_window.current_track.album.images[0].url,
          duration_ms: state.duration
        })

        setCurrentLineIndex(0) // Reset lyrics index

        fetchLyrics(state.track_window.current_track.name, state.track_window.current_track.artists[0].name)
      })

      // Ready
      spotifyPlayer.addListener('ready', ({ device_id }: { device_id: string }) => {
        console.log('Ready with Device ID', device_id)
        setDeviceId(device_id)

        // Transfer playback to the Web Playback SDK device
        fetch('https://api.spotify.com/v1/me/player', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            "device_ids": [device_id],
            "play": true,
          }),
        }).then(response => {
          if (!response.ok) {
            console.error('Failed to transfer playback')
          }
        }).catch(error => {
          console.error('Error transferring playback:', error)
        })
      })

      // Not Ready
      spotifyPlayer.addListener('not_ready', ({ device_id }: { device_id: string }) => {
        console.log('Device ID has gone offline', device_id)
      })

      // Connect to the player!
      spotifyPlayer.connect().then(success => {
        if (success) {
          console.log('The Web Playback SDK successfully connected to Spotify!')
        }
      })
    }

    // Dynamically load the Spotify SDK if not already loaded
    if (!window.Spotify) {
      const script = document.createElement('script')
      script.src = 'https://sdk.scdn.co/spotify-player.js'
      script.async = true
      document.body.appendChild(script)
    }

    return () => {
      if (player) {
        player.disconnect()
      }
    }
  }, [accessToken, deviceId, fetchLyrics])

  // Control Playback Handlers
  const handlePlayPause = () => {
    if (!player) return

    player.togglePlay().catch((err: any) => {
      console.error('Failed to toggle play/pause:', err)
      setError('Failed to toggle play/pause')
    })
  }

  const handleSkipNext = () => {
    if (!player) return

    player.nextTrack().catch((err: any) => {
      console.error('Failed to skip to next track:', err)
      setError('Failed to skip to next track')
    })
  }

  const handleSkipPrevious = () => {
    if (!player) return

    player.previousTrack().catch((err: any) => {
      console.error('Failed to skip to previous track:', err)
      setError('Failed to skip to previous track')
    })
  }

  const handleSeek = (percentage: number) => {
    if (!player || !currentTrack) return

    const position_ms = Math.round((percentage / 100) * currentTrack.duration_ms)
    player.seek(position_ms).catch((err: any) => {
      console.error('Failed to seek:', err)
      setError('Failed to seek')
    })
  }

  const handleVolumeChange = (volumePercentage: number) => {
    if (!player) return

    const volumeDecimal = volumePercentage / 100
    player.setVolume(volumeDecimal).catch((err: any) => {
      console.error('Failed to set volume:', err)
      setError('Failed to set volume')
    })
  }

  const toggleMute = () => {
    const newMutedState = !isMuted
    setIsMuted(newMutedState)
    if (newMutedState) {
      handleVolumeChange(0)
    } else {
      handleVolumeChange(volume)
    }
  }

  // Format time helper
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Timer for updating playback progress
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    const updateProgress = async () => {
      if (player && currentTrack) {
        const state = await player.getCurrentState()
        if (state) {
          const currentPosition = state.position
          const duration = currentTrack.duration_ms
          const newProgress = (currentPosition / duration) * 100
          setProgress(newProgress)

          // Optional: Update currentLineIndex based on currentPosition
          // Implement lyric synchronization logic here if needed
        }
      }
    }

    if (isPlaying && player && currentTrack) {
      interval = setInterval(updateProgress, 1000) // Update every second
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isPlaying, player, currentTrack])

  // Redirect to login if user doesn't have Premium
  useEffect(() => {
    if (userProfile && userProfile.product !== 'premium') {
      setError('Spotify Premium is required for this functionality.')
      // Optionally, log out the user or restrict access to certain features
    }
  }, [userProfile])

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
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Spotify Lyrics Translator</h1>
            <div className="flex items-center space-x-2">
              {accessToken && userProfile ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={userProfile?.image} alt={userProfile?.name} />
                        <AvatarFallback>{userProfile?.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{userProfile?.name}</p>
                        <p className="text-xs leading-none text-muted-foreground">{userProfile?.email}</p>
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
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
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
          <div className="space-y-4 mb-6 h-64 overflow-y-auto overflow-x-hidden hide-scrollbar pr-4">
            {lyrics.map((line, index) => (
              <div key={index} 
                   className={`transition-all duration-300 ${index === currentLineIndex ? 'scale-105 text-green-400' : 'scale-100 text-white'}`}>
                <div className="pl-2 -ml-2">
                  <p className="text-lg font-semibold">{line.original}</p>
                  {showRomanization && <p className="text-sm text-zinc-400">{line.romanized}</p>}
                  <p className="text-sm text-zinc-300">{line.translated}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mb-4">
            <div className="flex justify-between text-xs text-zinc-400 mb-1">
              <span>{currentTrack ? formatTime((currentTrack.duration_ms * progress) / 100) : '0:00'}</span>
              <span>{currentTrack ? formatTime(currentTrack.duration_ms) : '0:00'}</span>
            </div>
            <div 
              className="w-full bg-zinc-600 rounded-full h-1 overflow-hidden cursor-pointer"
              onClick={(e) => {
                if (!currentTrack) return
                const rect = e.currentTarget.getBoundingClientRect()
                const x = e.clientX - rect.left
                const percentage = (x / rect.width) * 100
                handleSeek(percentage)
              }}
            >
              <div 
                className="bg-green-500 h-full rounded-full transition-all duration-100 ease-linear"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon" onClick={handleSkipPrevious} className="hover:bg-zinc-700/50 transition-colors">
                <SkipBack className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handlePlayPause} className="bg-green-500 hover:bg-green-600 text-black rounded-full transition-colors">
                {isPlaying ? <Pause className="h-6 w-6" fill="currentColor" /> : <Play className="h-6 w-6" fill="currentColor" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={handleSkipNext} className="hover:bg-zinc-700/50 transition-colors">
                <SkipForward className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="icon" onClick={toggleMute} className="hover:bg-zinc-700/50 transition-colors">
                {isMuted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
              </Button>
              <div 
                className="w-24 bg-zinc-600 rounded-full h-1 overflow-hidden cursor-pointer"
                onClick={(e) => {
                  if (!currentTrack) return
                  const rect = e.currentTarget.getBoundingClientRect()
                  const x = e.clientX - rect.left
                  const newVolume = Math.round((x / rect.width) * 100)
                  setVolume(newVolume)
                  setIsMuted(newVolume === 0)
                  handleVolumeChange(newVolume)
                }}
              >
                <div 
                  className="bg-white h-full rounded-full"
                  style={{ width: `${isMuted ? 0 : volume}%` }}
                ></div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                id="romanization"
                checked={showRomanization}
                onCheckedChange={setShowRomanization}
                className="bg-zinc-600 data-[state=checked]:bg-green-500"
              />
              <label htmlFor="romanization" className="text-sm">Show Romanization</label>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

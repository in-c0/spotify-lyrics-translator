import React, { useState, useEffect, useCallback } from 'react'
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

interface Lyric {
  original: string;
  romanized: string;
  translated: string;
}

interface Track {
  name: string;
  artist: string;
  album: string;
  albumArt: string;
  duration_ms: number;
}

interface UserProfile {
  name: string;
  email: string;
  image: string;
}

interface EnhancedLyricsTranslatorProps {
  accessToken: string | null;
  onLogout: () => void;
}

export default function EnhancedLyricsTranslator({ onLogout }: EnhancedLyricsTranslatorProps) {
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
  const [accessToken, setAccessToken] = useState<string | null>(null);


  const onTokenRefresh = async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');  // Ensure refresh token is stored
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
  
      const response = await fetch('/api/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
  
      if (!response.ok) {
        throw new Error('Failed to refresh access token');
      }
  
      const data = await response.json();
  
      if (data.access_token) {
        setAccessToken(data.access_token);
        localStorage.setItem('access_token', data.access_token);
      } else {
        throw new Error('Failed to get new access token');
      }
    } catch (error) {
      console.error('Token refresh error:', error);
    }
  };
  
  
  const fetchWithToken = useCallback(async (url: string, options: RequestInit = {}, retry = true) => {
    console.log('Fetching:', url);
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${accessToken}`,
        },
      });
  
      if (response.status === 401 && retry) {
        console.log('Token expired, refreshing token...');
        await onTokenRefresh();
  
        // Retry the request with the refreshed token
        return fetchWithToken(url, options, false);  // Pass `retry = false` to avoid infinite loop
      }
  
      return response;
    } catch (error) {
      console.error('Fetch error:', error);
      throw error;
    }
  }, [accessToken, onTokenRefresh]);
  

  const fetchLyrics = useCallback(async (trackName: string, artistName: string) => {
    try {
      const response = await fetch(`/api/lyrics?track=${encodeURIComponent(trackName)}&artist=${encodeURIComponent(artistName)}`)
      const data = await response.json()
      setLyrics(data.lyrics)
    } catch (error) {
      setError('Failed to fetch lyrics')
    }
  }, []);

  const fetchCurrentTrack = useCallback(async () => {
    try {
      const response = await fetchWithToken('https://api.spotify.com/v1/me/player/currently-playing');
      
      if (response.status === 204) {
        console.log('No track currently playing');
        setError('No track currently playing');
        setCurrentTrack(null);
        return;
      }
  
      const data = await response.json();
      setCurrentTrack({
        name: data.item.name,
        artist: data.item.artists[0].name,
        album: data.item.album.name,
        albumArt: data.item.album.images[0].url,
        duration_ms: data.item.duration_ms,
      });
      setIsPlaying(data.is_playing);
      setProgress((data.progress_ms / data.item.duration_ms) * 100);
      fetchLyrics(data.item.name, data.item.artists[0].name);
    } catch (error) {
      console.error('Error fetching current track:', error);
      setError('Failed to fetch current track');
    }
  }, [fetchWithToken, fetchLyrics]);
  
  const fetchUserProfile = useCallback(async () => {
    try {
      const response = await fetchWithToken('https://api.spotify.com/v1/me');
      const data = await response.json();
      console.log('User profile data:', data);
      setUserProfile({
        name: data.display_name,
        email: data.email,
        image: data.images?.[0]?.url || '',
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setError('Failed to fetch user profile');
    }
  }, [fetchWithToken]);

  const fetchInitialData = useCallback(async () => {
    console.log('Fetching initial data...');
    setIsLoading(true);
    setError(null);
    try {
      await Promise.all([fetchCurrentTrack(), fetchUserProfile()]);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      setError('Failed to fetch initial data');
    } finally {
      setIsLoading(false);
    }
  }, [fetchCurrentTrack, fetchUserProfile]);

  useEffect(() => {
    if (accessToken) {
      console.log('Access token available, fetching initial data...');
      fetchInitialData();
    } else {
      console.log('No access token available');
      setIsLoading(false);
    }
  }, [accessToken]);
  
  const handleVolumeChange = async (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newVolume = Math.round((x / rect.width) * 100);
    setVolume(Math.max(0, Math.min(100, newVolume)));
    setIsMuted(false);
    try {
      await fetchWithToken('https://api.spotify.com/v1/me/player/volume', {
        method: 'PUT',
        body: JSON.stringify({ volume_percent: newVolume }),
      })
    } catch (error) {
      setError('Failed to update volume')
    }
  };

  const handlePlayPause = async () => {
    try {
      await fetchWithToken(`https://api.spotify.com/v1/me/player/${isPlaying ? 'pause' : 'play'}`, {
        method: 'PUT',
      });
      setIsPlaying(!isPlaying);
  
      // Add a small delay before re-fetching the track
      setTimeout(() => {
        fetchCurrentTrack();  // Fetch the current track after toggling play/pause
      }, 1000);  // 1-second delay to avoid rapid re-fetching
    } catch (error) {
      setError('Failed to play/pause track');
    }
  };
  

  const handleSkip = async (direction: 'next' | 'previous') => {
    try {
      await fetchWithToken(`https://api.spotify.com/v1/me/player/${direction}`, {
        method: 'POST'
      })
      fetchCurrentTrack()
    } catch (error) {
      setError(`Failed to skip ${direction}`)
    }
  }

  const handleSeek = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!currentTrack) return
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newProgress = (x / rect.width) * 100;
    setProgress(newProgress);
    
    const position_ms = Math.round((newProgress / 100) * currentTrack.duration_ms)
    try {
      await fetchWithToken(`https://api.spotify.com/v1/me/player/seek?position_ms=${position_ms}`, {
        method: 'PUT'
      })
    } catch (error) {
      setError('Failed to seek')
    }
  };

  const toggleMute = async () => {
    const newMutedState = !isMuted
    setIsMuted(newMutedState)
    try {
      await fetchWithToken('https://api.spotify.com/v1/me/player/volume', {
        method: 'PUT',
        body: JSON.stringify({ volume_percent: newMutedState ? 0 : volume }),
      })
    } catch (error) {
      setError('Failed to toggle mute')
    }
  }

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

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
              {accessToken && userProfile ? ( // Check if userProfile is available
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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon" onClick={() => handleSkip('previous')} className="hover:bg-zinc-700/50 transition-colors">
                <SkipBack className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handlePlayPause} className="bg-green-500 hover:bg-green-600 text-black rounded-full transition-colors">
                {isPlaying ? <Pause className="h-6 w-6" fill="currentColor" /> : <Play className="h-6 w-6" fill="currentColor" />}
              </Button>
              <Button variant="ghost"   size="icon" onClick={() => handleSkip('next')} className="hover:bg-zinc-700/50 transition-colors">
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
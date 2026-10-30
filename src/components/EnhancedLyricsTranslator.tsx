// src/components/EnhancedLyricsTranslator.tsx
// Logged-in view: follows Spotify playback and shows synced lyrics with romanization + translation.
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { LogOut } from 'lucide-react'
import PlayerShell from './PlayerShell'
import LyricsView from './LyricsView'
import { activeLineIndex, type Lyric } from '@/lib/lrc'
import { romanizableLanguage } from '@/lib/romanize'
import { LANGUAGE_NAMES, TARGET_LANGUAGES, translateLines } from '@/lib/translateClient'
import { usePreference } from '@/lib/usePreference'

interface Track {
  id: string
  name: string
  artist: string
  album: string
  albumArt: string
  duration_ms: number
}

interface EnhancedLyricsTranslatorProps {
  accessToken: string | null
  refreshToken: () => Promise<string | null>
  onLogout: () => void
}

type LyricsStatus = 'idle' | 'loading' | 'ready' | 'missing' | 'instrumental'

export default function EnhancedLyricsTranslator({ refreshToken, onLogout, accessToken }: EnhancedLyricsTranslatorProps) {
  const [lyrics, setLyrics] = useState<Lyric[]>([])
  const [lyricsStatus, setLyricsStatus] = useState<LyricsStatus>('idle')
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [positionMs, setPositionMs] = useState(0)
  const [detectedLanguage, setDetectedLanguage] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  const [romanizationOn, setRomanizationOn] = usePreference('romanization', true)
  const [translationOn, setTranslationOn] = usePreference('translation', true)
  const [toLanguage, setToLanguage] = usePreference('targetLanguage', 'en')

  // Fetch with token; on 401 refresh once and retry with the *new* token.
  const fetchWithToken = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const send = (token: string | null) =>
        fetch(url, { ...options, headers: { ...options.headers, Authorization: `Bearer ${token}` } })
      const response = await send(accessToken)
      if (response.status !== 401) return response
      const freshToken = await refreshToken()
      return freshToken ? send(freshToken) : response
    },
    [accessToken, refreshToken]
  )

  // ── Lyrics + translation ────────────────────────────────────
  const trackKeyRef = useRef('') // which track the current lyrics belong to
  const lyricsRef = useRef<Lyric[]>([])
  useEffect(() => { lyricsRef.current = lyrics }, [lyrics])

  const translate = useCallback(async (source: Lyric[], target: string) => {
    if (source.length === 0) return
    const key = trackKeyRef.current
    try {
      const { lines, detected } = await translateLines(source.map(l => l.original), target)
      if (trackKeyRef.current !== key) return // the track changed while we waited
      setDetectedLanguage(detected)
      setLyrics(source.map((line, i) => ({ ...line, translated: lines[i] || '' })))
    } catch (e: any) {
      setError(e.message || 'Failed to translate lyrics.')
    }
  }, [])

  const targetRef = useRef(toLanguage)
  useEffect(() => {
    if (targetRef.current === toLanguage) return
    targetRef.current = toLanguage
    translate(lyricsRef.current, toLanguage)
  }, [toLanguage, translate])

  const fetchLyrics = useCallback(async (track: Track) => {
    trackKeyRef.current = track.id
    setError(null)
    setLyrics([])
    setDetectedLanguage('')
    setLyricsStatus('loading')
    try {
      const params = new URLSearchParams({
        track: track.name,
        artist: track.artist,
        album: track.album,
        durationMs: String(track.duration_ms),
      })
      const response = await fetch(`/api/lyrics?${params}`)
      const data = await response.json()
      if (trackKeyRef.current !== track.id) return
      if (!response.ok) {
        setLyricsStatus(data.instrumental ? 'instrumental' : 'missing')
        if (response.status !== 404) setError(data.error || 'Failed to fetch lyrics.')
        return
      }
      const fetched: Lyric[] = data.lyrics || []
      setLyrics(fetched)
      setLyricsStatus(fetched.length ? 'ready' : 'missing')
      translate(fetched, targetRef.current)
    } catch {
      setLyricsStatus('missing')
      setError('An unexpected error occurred while fetching lyrics.')
    }
  }, [translate])

  // ── Playback polling ────────────────────────────────────────
  // Snapshot from the last poll; position is interpolated locally between polls.
  const playbackRef = useRef({ trackId: '', progressMs: 0, at: 0, isPlaying: false, durationMs: 0 })
  const fetchLyricsRef = useRef(fetchLyrics)
  useEffect(() => { fetchLyricsRef.current = fetchLyrics }, [fetchLyrics])

  const pollPlayback = useCallback(async () => {
    try {
      const response = await fetchWithToken('https://api.spotify.com/v1/me/player/currently-playing')
      const data = response.status === 204 ? null : response.ok ? await response.json() : undefined
      if (data === undefined) {
        if (response.status !== 429) setError('Unable to read your Spotify playback right now.')
        return
      }

      const item = data?.item
      if (!item || data.currently_playing_type !== 'track') {
        // Nothing playing, or an ad / podcast episode.
        playbackRef.current = { trackId: '', progressMs: 0, at: Date.now(), isPlaying: false, durationMs: 0 }
        trackKeyRef.current = ''
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
          id: item.id,
          name: item.name,
          artist: (item.artists || []).map((a: { name: string }) => a.name).join(', '),
          album: item.album?.name || '',
          albumArt: item.album?.images?.[0]?.url || '',
          duration_ms: item.duration_ms,
        }
        setCurrentTrack(track)
        // LRCLIB matches best on the primary artist.
        fetchLyricsRef.current({ ...track, artist: item.artists?.[0]?.name || track.artist })
      }
      setError(null)
    } catch (e) {
      console.error('Error reading playback:', e)
    }
  }, [fetchWithToken])

  // Poll loop: every 2s while playing, every 5s while idle/paused.
  useEffect(() => {
    if (!accessToken) return
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

  // Smooth position between polls.
  useEffect(() => {
    const tick = setInterval(() => {
      const p = playbackRef.current
      if (!p.durationMs) return
      const elapsed = p.isPlaying ? Date.now() - p.at : 0
      setPositionMs(Math.min(p.durationMs, p.progressMs + elapsed))
    }, 100)
    return () => clearInterval(tick)
  }, [])

  // ── Playback controls (need Premium on the listening account) ──
  const control = async (path: string, method: 'PUT' | 'POST') => {
    const response = await fetchWithToken(`https://api.spotify.com/v1/me/player/${path}`, { method })
    if (response.status === 403) setError('Playback controls need Spotify Premium on the account that is playing.')
    else if (response.status === 404) setError('No active Spotify device. Start playback in a Spotify app first.')
    setTimeout(pollPlayback, 500)
  }
  const togglePlay = () => {
    const playing = !playbackRef.current.isPlaying
    playbackRef.current = { ...playbackRef.current, progressMs: positionMs, at: Date.now(), isPlaying: playing }
    setIsPlaying(playing)
    control(playing ? 'play' : 'pause', 'PUT')
  }
  const seek = (ms: number) => {
    playbackRef.current = { ...playbackRef.current, progressMs: ms, at: Date.now() }
    setPositionMs(ms)
    control(`seek?position_ms=${Math.round(ms)}`, 'PUT')
  }

  // ── Derived view state ──────────────────────────────────────
  const activeIndex = activeLineIndex(lyrics, positionMs)
  const romanizeLang = romanizableLanguage(detectedLanguage)
  const languageName = LANGUAGE_NAMES[detectedLanguage.split('-')[0]] || ''

  const emptyMessage: Record<LyricsStatus, string> = {
    idle: 'Play a song in any Spotify app — it will show up here automatically.',
    loading: 'Looking up lyrics…',
    missing: 'No lyrics found for this track yet.',
    instrumental: '♪ Instrumental',
    ready: '',
  }

  return (
    <PlayerShell
      track={currentTrack ? { title: currentTrack.name, artist: currentTrack.artist, art: currentTrack.albumArt } : null}
      status={languageName ? `Lyrics in ${languageName}` : undefined}
      headerRight={
        <button onClick={onLogout} aria-label="Log out" title="Log out" className="grid h-9 w-9 place-items-center rounded-full text-white/60 hover:bg-white/10 hover:text-white">
          <LogOut className="h-4 w-4" />
        </button>
      }
      progress={currentTrack ? { positionMs, durationMs: currentTrack.duration_ms, onSeek: seek } : undefined}
      playback={currentTrack ? { isPlaying, onToggle: togglePlay, onPrev: () => control('previous', 'POST'), onNext: () => control('next', 'POST') } : undefined}
      romanization={{ enabled: romanizationOn, available: Boolean(romanizeLang), onChange: setRomanizationOn }}
      translation={{ enabled: translationOn, onChange: setTranslationOn, target: toLanguage, targets: TARGET_LANGUAGES, onTarget: setToLanguage }}
      footerNote={error ? <span className="text-red-300">{error}</span> : lyrics.length > 0 && lyrics[0].startTimeMs < 0 ? "These lyrics aren't time-synced, so lines won't highlight." : undefined}
    >
      {lyrics.length > 0 ? (
        <LyricsView
          className="flex-1"
          lyrics={lyrics}
          activeIndex={activeIndex}
          positionMs={positionMs}
          romanizeFrom={romanizationOn ? romanizeLang : null}
          showTranslation={translationOn}
          onSeek={seek}
        />
      ) : (
        <div className="grid flex-1 place-items-center text-center text-lg text-white/60">{emptyMessage[lyricsStatus]}</div>
      )}
    </PlayerShell>
  )
}

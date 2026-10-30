// pages/listen.tsx — no login needed.
//   /listen?q=…   search for a song
//   /listen?id=…  the song plays right here (YouTube) and the lyrics follow it.
// If the song is playing somewhere else instead, lyrics can be synced by tapping a line or with
// "Local song lyrics transcription (beta)".
import React, { useCallback, useEffect, useRef, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { ArrowLeft, Loader2, Minus, MonitorSpeaker, Plus, Youtube } from 'lucide-react'
import PlayerShell from '@/components/PlayerShell'
import LyricsView from '@/components/LyricsView'
import SongSearch from '@/components/SongSearch'
import { TranscriptionButton, TranscriptionDialog, TranscriptionPanel, useTranscription, type MatchInfo } from '@/components/Transcription'
import { activeLineIndex, type Lyric } from '@/lib/lrc'
import { findForDuration, getTrack, lyricsOf, type LrclibTrack } from '@/lib/lrclibClient'
import { romanizableLanguage } from '@/lib/romanize'
import { LANGUAGE_NAMES, TARGET_LANGUAGES, translateLines } from '@/lib/translateClient'
import { usePreference } from '@/lib/usePreference'
import { useYouTubePlayer } from '@/lib/useYouTubePlayer'
import { alignTranscript } from '@/lib/align'

export default function ListenPage() {
  const router = useRouter()
  const id = Number(router.query.id) || 0
  const q = typeof router.query.q === 'string' ? router.query.q : ''

  // Render nothing query-dependent until after hydration (the static HTML has no query).
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted || !router.isReady) return <div className="min-h-[100dvh] bg-zinc-950" />
  if (id) return <SongPlayer key={id} id={id} />

  return (
    <>
      <Head><title>Search a song · Lyrics Translator</title></Head>
      <div className="min-h-[100dvh] bg-zinc-950 px-5 py-6 text-white sm:px-10 sm:py-10">
        <div className="mx-auto max-w-xl">
          <Link href="/" aria-label="Home" title="Home" className="inline-grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-white/20">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="mt-6 text-3xl font-extrabold">Pick a song</h1>
          <p className="mt-1 text-white/60">It plays here, with the lyrics, pronunciation and translation line by line.</p>
          <div className="mt-6">
            <SongSearch
              autoFocus
              initialQuery={q}
              onQueryChange={value => {
                if (value !== q) router.replace({ pathname: '/listen', query: value ? { q: value } : {} }, undefined, { shallow: true })
              }}
              onPick={t => router.push({ pathname: '/listen', query: { id: t.id } })}
            />
          </div>
        </div>
      </div>
    </>
  )
}

type Mode = 'here' | 'elsewhere'

function SongPlayer({ id }: { id: number }) {
  const router = useRouter()
  const [track, setTrack] = useState<LrclibTrack | null>(null)
  const [loadError, setLoadError] = useState('')
  const [lyrics, setLyrics] = useState<Lyric[]>([])
  const [detected, setDetected] = useState('')
  const [mode, setMode] = useState<Mode>('here')
  const [videos, setVideos] = useState<string[]>([])
  const [videoLookup, setVideoLookup] = useState<'loading' | 'done' | 'failed'>('loading')
  const [offsetMs, setOffsetMs] = useState(0)

  const [romanizationOn, setRomanizationOn] = usePreference('romanization', true)
  const [translationOn, setTranslationOn] = usePreference('translation', true)
  const [target, setTarget] = usePreference('targetLanguage', 'en')
  const [hint, setHint] = useState(false)

  // ── Load the song and its lyrics ──
  useEffect(() => {
    const controller = new AbortController()
    getTrack(id, controller.signal)
      .then(t => {
        if (!t) { setLoadError('This song could not be found.'); return }
        setTrack(t)
        setLyrics(lyricsOf(t))
      })
      .catch(e => { if (e.name !== 'AbortError') setLoadError(e.message || 'Could not load this song.') })
    return () => controller.abort()
  }, [id])

  // Translate (again when the target language changes).
  const lyricsKey = lyrics.map(l => l.original).join('\n')
  useEffect(() => {
    if (!lyricsKey) return
    let stale = false
    translateLines(lyricsKey.split('\n'), target)
      .then(({ lines, detected: lang }) => {
        if (stale) return
        setDetected(lang)
        setLyrics(prev => prev.map((l, i) => ({ ...l, translated: lines[i] || '' })))
      })
      .catch(() => {})
    return () => { stale = true }
  }, [lyricsKey, target])

  // Find a recording to play here.
  useEffect(() => {
    if (!track) return
    const params = new URLSearchParams({ track: track.trackName, artist: track.artistName, seconds: String(Math.round(track.duration)) })
    fetch(`/api/video?${params}`)
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(d => {
        const ids = (d.videos || []).map((v: { id: string }) => v.id)
        setVideos(ids)
        setVideoLookup(ids.length ? 'done' : 'failed')
        if (!ids.length) setMode('elsewhere')
      })
      .catch(() => { setVideoLookup('failed'); setMode('elsewhere') })
  }, [track])

  const ytHost = useRef<HTMLDivElement>(null)
  const yt = useYouTubePlayer(ytHost, mode === 'here' ? videos : [])
  const [ytFailed, setYtFailed] = useState(false) // every recording refused to play here
  useEffect(() => {
    if (yt.status === 'failed' && mode === 'here' && videos.length) { setYtFailed(true); setMode('elsewhere') }
  }, [yt.status, mode, videos.length])

  // If the recording is a different length than these lyrics, look for lyrics timed to it.
  const retimed = useRef(false)
  useEffect(() => {
    if (!track || retimed.current || !yt.durationMs) return
    const seconds = yt.durationMs / 1000
    if (Math.abs(seconds - track.duration) <= 2) return
    retimed.current = true
    findForDuration(track, seconds).then(better => {
      if (better) setLyrics(prev => lyricsOf(better).map(l => ({ ...l, translated: prev.find(p => p.original === l.original)?.translated || '' })))
    })
  }, [track, yt.durationMs])

  // ── Clock for "playing elsewhere" ──
  const clock = useRef({ base: 0, at: 0, playing: false })
  const [clockMs, setClockMs] = useState(0)
  const [clockPlaying, setClockPlaying] = useState(false)
  useEffect(() => {
    const t = setInterval(() => {
      const c = clock.current
      setClockMs(c.playing ? c.base + Date.now() - c.at : c.base)
    }, 100)
    return () => clearInterval(t)
  }, [])
  const setClock = (ms: number, playing = clock.current.playing) => {
    clock.current = { base: Math.max(0, ms), at: Date.now(), playing }
    setClockMs(Math.max(0, ms))
    setClockPlaying(playing)
  }
  const clockNow = () => (clock.current.playing ? clock.current.base + Date.now() - clock.current.at : clock.current.base)

  const here = mode === 'here'
  const positionMs = here ? yt.positionMs + offsetMs : clockMs
  const durationMs = here && yt.durationMs ? yt.durationMs : track ? Math.round(track.duration * 1000) : 0
  const isPlaying = here ? yt.isPlaying : clockPlaying
  const synced = lyrics.length > 0 && lyrics[0].startTimeMs >= 0

  const [followIndex, setFollowIndex] = useState(-1)
  const [heardIndex, setHeardIndex] = useState(-1)
  const activeIndex = synced ? activeLineIndex(lyrics, positionMs) : followIndex

  const seek = (ms: number) => {
    if (here) {
      yt.seek(ms - offsetMs)
      if (!yt.isPlaying) yt.play()
    } else setClock(ms, true)
  }
  const toggle = () => (here ? (yt.isPlaying ? yt.pause() : yt.play()) : setClock(clockNow(), !clock.current.playing))

  // ── Transcription (only for "playing elsewhere") ──
  const lyricsRef = useRef(lyrics)
  lyricsRef.current = lyrics
  const activeRef = useRef(activeIndex)
  activeRef.current = activeIndex
  const follow = useCallback((heard: string, capturedAt: number): MatchInfo => {
    const ls = lyricsRef.current
    const match = alignTranscript(ls, heard, activeRef.current)
    if (!match) return { kind: 'none' }
    setHeardIndex(match.lineIndex)
    const line = ls[match.lineIndex]
    if (line.startTimeMs < 0) {
      setFollowIndex(match.lineIndex)
      return { kind: 'line', line: match.lineIndex }
    }
    const next = ls[match.lineIndex + 1]?.startTimeMs ?? line.startTimeMs + 4000
    const lineEnd = Math.min(next, line.startTimeMs + 6000)
    const estimate = line.startTimeMs + 0.75 * (lineEnd - line.startTimeMs) + (Date.now() - capturedAt)
    const current = clockNow()
    if (!clock.current.playing || Math.abs(estimate - current) > 1500) {
      setClock(estimate, true)
      return { kind: 'moved', line: match.lineIndex, fromMs: current, toMs: estimate }
    }
    return { kind: 'confirmed', line: match.lineIndex }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const transcription = useTranscription(follow, () => romanizableLanguage(detected) || detected.split('-')[0] || undefined)

  const switchMode = (next: Mode) => {
    if (next === 'here') transcription.stop()
    else { yt.pause(); setClock(positionMs, false) }
    setMode(next)
  }

  // First player visit: flip Romanization off and back on once so the control explains itself.
  useEffect(() => {
    if (!lyrics.length) return
    try {
      if (localStorage.getItem('slt:playerHintShown')) return
      localStorage.setItem('slt:playerHintShown', '1')
    } catch { return }
    setHint(true)
    const a = setTimeout(() => setRomanizationOn(false), 1200)
    const b = setTimeout(() => setRomanizationOn(true), 2400)
    const c = setTimeout(() => setHint(false), 3400)
    return () => [a, b, c].forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lyrics.length > 0])

  const romanizeLang = romanizableLanguage(detected)
  const languageName = LANGUAGE_NAMES[detected.split('-')[0]]
  const goBack = () => (window.history.length > 1 ? router.back() : router.push('/listen'))

  if (loadError) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-zinc-950 px-6 text-center text-white">
        <div>
          <p className="text-lg">{loadError}</p>
          <div className="mt-4 flex justify-center gap-2">
            <button onClick={() => window.location.reload()} className="rounded-full bg-white px-5 py-2 font-semibold text-black">Try again</button>
            <Link href="/listen" className="rounded-full bg-white/10 px-5 py-2 font-semibold">Search another song</Link>
          </div>
        </div>
      </div>
    )
  }

  const media = (
    <div className="overflow-hidden rounded-2xl bg-black/50 ring-1 ring-white/10">
      {here ? (
        <>
          <div className="relative aspect-video w-full bg-black">
            <div ref={ytHost} className="absolute inset-0 [&>iframe]:h-full [&>iframe]:w-full" />
            {(videoLookup === 'loading' || yt.status === 'loading') && (
              <div className="absolute inset-0 grid place-items-center text-sm text-white/60"><Loader2 className="h-6 w-6 animate-spin" /></div>
            )}
            {yt.stalled && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 p-4 text-center text-sm">
                <p>This recording won’t start here.</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {yt.hasNext && <button onClick={yt.next} className="rounded-full bg-white px-3 py-1.5 font-semibold text-black">Try another recording</button>}
                  {yt.videoId && <a href={`https://www.youtube.com/watch?v=${yt.videoId}`} target="_blank" rel="noreferrer" className="rounded-full bg-white/15 px-3 py-1.5">Open on YouTube</a>}
                  <button onClick={() => switchMode('elsewhere')} className="rounded-full bg-white/15 px-3 py-1.5">Play it elsewhere</button>
                </div>
              </div>
            )}
            {!yt.stalled && yt.status === 'ready' && !yt.isPlaying && yt.positionMs === 0 && (
              <button onClick={yt.play} className="absolute inset-0 grid place-items-center bg-black/40 text-lg font-semibold">
                <span className="rounded-full bg-white px-5 py-2 text-black">▶ Play song</span>
              </button>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs text-white/60">
            <span className="flex items-center gap-1"><Youtube className="h-3.5 w-3.5" /> Playing here</span>
            {synced && (
              <span className="flex items-center gap-1" title="If the words come too early or too late">
                Lyrics timing
                <button aria-label="Show lyrics earlier" onClick={() => setOffsetMs(o => o + 300)} className="grid h-6 w-6 place-items-center rounded-full bg-white/10 hover:bg-white/20"><Minus className="h-3 w-3" /></button>
                <span className="w-10 text-center tabular-nums">{offsetMs === 0 ? '0' : `${offsetMs > 0 ? '−' : '+'}${(Math.abs(offsetMs) / 1000).toFixed(1)}s`}</span>
                <button aria-label="Show lyrics later" onClick={() => setOffsetMs(o => o - 300)} className="grid h-6 w-6 place-items-center rounded-full bg-white/10 hover:bg-white/20"><Plus className="h-3 w-3" /></button>
              </span>
            )}
          </div>
          <button onClick={() => switchMode('elsewhere')} className="flex w-full items-center gap-2 border-t border-white/10 px-3 py-2.5 text-left text-sm text-white/70 hover:bg-white/5">
            <MonitorSpeaker className="h-4 w-4" /> Playing it on another device instead?
          </button>
        </>
      ) : (
        <div className="space-y-3 p-4">
          <p className="flex items-center gap-2 font-semibold"><MonitorSpeaker className="h-4 w-4" /> Playing somewhere else</p>
          <p className="text-sm text-white/70">
            {videoLookup === 'failed' || ytFailed
              ? 'We couldn’t find a recording to play here. Play the song on any app or speaker, then sync below.'
              : 'Play the song on any app or speaker, then sync below.'}
          </p>
          <ol className="space-y-1 text-sm text-white/70">
            <li>1. Press ▶ here the moment the song starts, <b>or</b></li>
            <li>2. Tap the line that’s being sung, <b>or</b></li>
            <li>3. Let this page listen:</li>
          </ol>
          <TranscriptionButton t={transcription} />
          {videos.length > 0 && !ytFailed && (
            <button onClick={() => switchMode('here')} className="w-full rounded-full px-4 py-2 text-sm text-white/70 hover:bg-white/10">
              ← Play it on this page instead
            </button>
          )}
        </div>
      )}
    </div>
  )

  return (
    <>
      <Head><title>{track ? `${track.trackName} · Lyrics Translator` : 'Lyrics Translator'}</title></Head>
      <PlayerShell
        back={{ onClick: goBack, label: 'Back to search' }}
        track={track ? { title: track.trackName, artist: track.artistName } : { title: 'Loading…', artist: '' }}
        status={[languageName && `Lyrics in ${languageName}`, !synced && lyrics.length ? 'Text only (not time-synced)' : ''].filter(Boolean).join(' · ')}
        media={media}
        progress={synced || here ? { positionMs, durationMs, onSeek: seek } : undefined}
        playback={synced || here ? { isPlaying, onToggle: toggle } : undefined}
        romanization={{ enabled: romanizationOn, available: Boolean(romanizeLang), onChange: setRomanizationOn, highlight: hint }}
        translation={{ enabled: translationOn, onChange: setTranslationOn, target, targets: TARGET_LANGUAGES, onTarget: setTarget }}
        footerNote={transcription.state.kind === 'error' ? <span className="text-red-300">{transcription.state.message}</span> : undefined}
      >
        <TranscriptionPanel t={transcription} lyrics={lyrics} />
        {lyrics.length ? (
          <LyricsView
            className="flex-1"
            lyrics={lyrics}
            activeIndex={activeIndex}
            markedIndex={transcription.state.kind === 'listening' ? heardIndex : -1}
            positionMs={synced ? positionMs : -1}
            romanizeFrom={romanizationOn ? romanizeLang : null}
            showTranslation={translationOn}
            onSeek={seek}
          />
        ) : (
          <div className="grid flex-1 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-white/60" /></div>
        )}
      </PlayerShell>
      <TranscriptionDialog t={transcription} />
    </>
  )
}

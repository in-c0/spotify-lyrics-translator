// pages/listen.tsx — no-login mode: search a song, then sync by tapping a line or by listening.
// Listening runs a speech model locally (after one-time consent); audio never leaves the device.
import React, { useCallback, useEffect, useRef, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { Ear, EarOff, Loader2, Search } from 'lucide-react'
import PlayerShell from '@/components/PlayerShell'
import LyricsView from '@/components/LyricsView'
import { activeLineIndex, type Lyric } from '@/lib/lrc'
import { lyricsOf, searchTracks, type LrclibTrack } from '@/lib/lrclibClient'
import { romanizableLanguage } from '@/lib/romanize'
import { LANGUAGE_NAMES, TARGET_LANGUAGES, translateLines } from '@/lib/translateClient'
import { usePreference } from '@/lib/usePreference'
import { alignTranscript } from '@/lib/align'
import { AsrClient, AudioCapture, ENGINE_INFO, type EngineKind } from '@/lib/asr/client'

type ListenState =
  | { kind: 'off' }
  | { kind: 'consent'; engine: EngineKind }
  | { kind: 'loading'; engine: EngineKind; loaded: number; total: number }
  | { kind: 'choose-source'; engine: EngineKind }
  | { kind: 'listening'; engine: EngineKind; heard: string }
  | { kind: 'error'; message: string }

const WINDOW_S = 8 // singing transcribes far better in 6–10 s windows than in short chunks
const MIN_AUDIO_S = 3

export default function ListenPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<LrclibTrack[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [track, setTrack] = useState<LrclibTrack | null>(null)
  const [lyrics, setLyrics] = useState<Lyric[]>([])
  const [detected, setDetected] = useState('')

  const [romanizationOn, setRomanizationOn] = usePreference('romanization', true)
  const [translationOn, setTranslationOn] = usePreference('translation', true)
  const [target, setTarget] = usePreference('targetLanguage', 'en')

  // ── Search ──
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) { setResults(null); return }
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setSearching(true)
      setSearchError('')
      try {
        setResults((await searchTracks(q, controller.signal)).slice(0, 12))
      } catch (e: any) {
        if (e.name !== 'AbortError') setSearchError(e.message)
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => { clearTimeout(timer); controller.abort() }
  }, [query])

  // ── Clock (synced lyrics) ──
  const clock = useRef({ base: 0, at: 0, playing: false })
  const [positionMs, setPositionMs] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  useEffect(() => {
    const id = setInterval(() => {
      const c = clock.current
      setPositionMs(c.playing ? c.base + Date.now() - c.at : c.base)
    }, 100)
    return () => clearInterval(id)
  }, [])
  const setClock = (ms: number, playing = clock.current.playing) => {
    clock.current = { base: Math.max(0, ms), at: Date.now(), playing }
    setPositionMs(Math.max(0, ms))
    setIsPlaying(playing)
  }
  const now = () => (clock.current.playing ? clock.current.base + Date.now() - clock.current.at : clock.current.base)

  const synced = lyrics.length > 0 && lyrics[0].startTimeMs >= 0
  const [followIndex, setFollowIndex] = useState(-1) // used for unsynced lyrics
  const activeIndex = synced ? activeLineIndex(lyrics, positionMs) : followIndex

  // ── Pick a track ──
  const pick = async (t: LrclibTrack) => {
    setTrack(t)
    const base = lyricsOf(t)
    setLyrics(base)
    setDetected('')
    setFollowIndex(-1)
    setClock(0, false)
    try {
      const { lines, detected: lang } = await translateLines(base.map(l => l.original), target)
      setDetected(lang)
      setLyrics(base.map((l, i) => ({ ...l, translated: lines[i] || '' })))
    } catch { /* translation is optional */ }
  }
  useEffect(() => {
    if (!track || lyrics.length === 0) return
    let stale = false
    translateLines(lyrics.map(l => l.original), target)
      .then(({ lines }) => { if (!stale) setLyrics(prev => prev.map((l, i) => ({ ...l, translated: lines[i] || '' }))) })
      .catch(() => {})
    return () => { stale = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])

  // Tap a line = "this line is being sung now".
  const syncToLine = (ms: number) => {
    if (synced) setClock(ms, true)
  }

  // ── Listening ──
  const [listen, setListen] = useState<ListenState>({ kind: 'off' })
  const asr = useRef<AsrClient | null>(null)
  const capture = useRef<AudioCapture | null>(null)
  const loop = useRef<ReturnType<typeof setTimeout>>()
  const lyricsRef = useRef(lyrics)
  useEffect(() => { lyricsRef.current = lyrics }, [lyrics])
  const activeRef = useRef(activeIndex)
  useEffect(() => { activeRef.current = activeIndex }, [activeIndex])
  const detectedRef = useRef(detected)
  useEffect(() => { detectedRef.current = detected }, [detected])

  const stopListening = useCallback(() => {
    clearTimeout(loop.current)
    capture.current?.stop()
    capture.current = null
    setListen(s => (s.kind === 'error' ? s : { kind: 'off' }))
  }, [])
  useEffect(() => () => { stopListening(); asr.current?.dispose() }, [stopListening])

  const beginListening = async () => {
    try {
      asr.current = asr.current || new AsrClient()
      // `?engine=whisper-base` forces the small model (handy when the GPU model misbehaves).
      const forced = new URLSearchParams(window.location.search).get('engine') as EngineKind | null
      const engine = forced && forced in ENGINE_INFO ? forced : await asr.current.pickEngine()
      let consented = false
      try { consented = localStorage.getItem(`slt:asrConsent:${engine}`) === '1' } catch { /* ignore */ }
      if (consented) await loadEngine(engine)
      else setListen({ kind: 'consent', engine })
    } catch (e: any) {
      setListen({ kind: 'error', message: e.message })
    }
  }

  const loadEngine = async (engine: EngineKind) => {
    try { localStorage.setItem(`slt:asrConsent:${engine}`, '1') } catch { /* ignore */ }
    const client = asr.current!
    setListen({ kind: 'loading', engine, loaded: 0, total: ENGINE_INFO[engine].downloadMb * 1e6 })
    client.onProgress = (loaded, total) => setListen(s => (s.kind === 'loading' ? { ...s, loaded, total } : s))
    client.onError = message => { stopListening(); setListen({ kind: 'error', message }) }
    try {
      await client.load(engine)
      setListen({ kind: 'choose-source', engine })
    } catch (e: any) {
      if (engine !== 'whisper-base') {
        // The GPU model couldn't start on this device: offer the small CPU model instead.
        asr.current?.dispose()
        asr.current = new AsrClient()
        setListen({ kind: 'consent', engine: 'whisper-base' })
        return
      }
      setListen({ kind: 'error', message: e.message })
    }
  }

  const startCapture = async (engine: EngineKind, source: 'mic' | 'tab') => {
    try {
      const cap = new AudioCapture(WINDOW_S + 2)
      await cap.start(source)
      cap.onEnded = stopListening
      capture.current = cap
      setListen({ kind: 'listening', engine, heard: '' })
      const tick = async () => {
        const c = capture.current
        if (!c) return
        if (c.capturedSeconds >= MIN_AUDIO_S) {
          const capturedAt = Date.now()
          const lang = romanizableLanguage(detectedRef.current) || detectedRef.current.split('-')[0] || undefined
          const { text } = await asr.current!.transcribe(c.latest(WINDOW_S), lang)
          if (!capture.current) return
          setListen(s => (s.kind === 'listening' ? { ...s, heard: text } : s))
          follow(text, capturedAt)
        }
        loop.current = setTimeout(tick, 1500)
      }
      tick()
    } catch (e: any) {
      setListen({ kind: 'error', message: e.name === 'NotAllowedError' ? 'Permission to use audio was denied.' : e.message })
    }
  }

  // Move the lyrics to where the transcript says we are.
  const follow = (heard: string, capturedAt: number) => {
    const ls = lyricsRef.current
    const match = alignTranscript(ls, heard, activeRef.current)
    if (!match) return
    const line = ls[match.lineIndex]
    if (line.startTimeMs < 0) {
      setFollowIndex(match.lineIndex)
      return
    }
    // The window ends "now", so we're most likely near the end of the last line heard.
    const next = ls[match.lineIndex + 1]?.startTimeMs ?? line.startTimeMs + 4000
    const lineEnd = Math.min(next, line.startTimeMs + 6000)
    const estimate = line.startTimeMs + 0.75 * (lineEnd - line.startTimeMs) + (Date.now() - capturedAt)
    if (!clock.current.playing || Math.abs(estimate - now()) > 1500) setClock(estimate, true)
  }

  // ── Render ──
  const romanizeLang = romanizableLanguage(detected)
  const durationMs = track ? Math.round(track.duration * 1000) : 0

  const listenButton = track && (
    listen.kind === 'listening' ? (
      <button onClick={stopListening} className="flex h-9 items-center gap-1.5 rounded-full bg-white px-3 text-sm font-semibold text-black">
        <Ear className="h-4 w-4 animate-pulse" /> Following
      </button>
    ) : (
      <button
        onClick={beginListening}
        disabled={listen.kind === 'loading'}
        className="flex h-9 items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 text-sm font-semibold hover:bg-white/20 disabled:opacity-60"
      >
        {listen.kind === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <EarOff className="h-4 w-4" />}
        Follow by listening
      </button>
    )
  )

  if (!track) {
    return (
      <>
        <Head><title>Listen · Spotify Lyrics Translator</title></Head>
        <div className="min-h-[100dvh] bg-zinc-950 px-5 py-10 text-white sm:px-10">
          <div className="mx-auto max-w-xl">
            <h1 className="text-3xl font-extrabold">Sing along — no login</h1>
            <p className="mt-2 text-white/60">Find a song, play it anywhere, and tap a line to sync.</p>
            <label className="mt-6 flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/10 focus-within:ring-white/40">
              <Search className="h-5 w-5 text-white/50" />
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Song title and artist"
                className="w-full bg-transparent text-lg outline-none placeholder:text-white/40"
              />
              {searching && <Loader2 className="h-4 w-4 animate-spin text-white/50" />}
            </label>
            {searchError && <p className="mt-3 text-sm text-red-300">{searchError}</p>}
            <ul className="mt-4 space-y-1">
              {results?.map(r => (
                <li key={r.id}>
                  <button onClick={() => pick(r)} className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-white/10">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{r.trackName}</span>
                      <span className="block truncate text-sm text-white/55">{r.artistName}</span>
                    </span>
                    <span className="shrink-0 text-xs text-white/45">
                      {r.syncedLyrics ? 'synced' : 'text only'} · {Math.floor(r.duration / 60)}:{String(Math.round(r.duration % 60)).padStart(2, '0')}
                    </span>
                  </button>
                </li>
              ))}
              {results && results.length === 0 && !searching && <li className="px-3 py-2 text-white/50">No lyrics found. Try the song title plus the artist.</li>}
            </ul>
            <p className="mt-10 text-xs text-white/40">
              Lyrics from <a className="underline" href="https://lrclib.net" target="_blank" rel="noreferrer">LRCLIB</a>.{' '}
              <Link href="/demo" className="underline">Try the demo</Link> · <Link href="/" className="underline">Connect Spotify</Link>
            </p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Head><title>{track.trackName} · Listen</title></Head>
      <PlayerShell
        track={{ title: track.trackName, artist: track.artistName }}
        status={[LANGUAGE_NAMES[detected.split('-')[0]] && `Lyrics in ${LANGUAGE_NAMES[detected.split('-')[0]]}`, listen.kind === 'listening' ? 'Following by listening' : synced ? 'Tap a line when it’s sung to sync' : ''].filter(Boolean).join(' · ')}
        headerRight={
          <div className="flex items-center gap-2">
            {listenButton}
            <button onClick={() => { stopListening(); setTrack(null) }} className="h-9 rounded-full px-3 text-sm text-white/70 hover:bg-white/10">Change song</button>
          </div>
        }
        progress={synced ? { positionMs, durationMs, onSeek: ms => setClock(ms) } : undefined}
        playback={synced ? { isPlaying, onToggle: () => setClock(now(), !clock.current.playing) } : undefined}
        romanization={{ enabled: romanizationOn, available: Boolean(romanizeLang), onChange: setRomanizationOn }}
        translation={{ enabled: translationOn, onChange: setTranslationOn, target, targets: TARGET_LANGUAGES, onTarget: setTarget }}
        footerNote={
          listen.kind === 'listening' && listen.heard ? <span className="line-clamp-1">Heard: “{listen.heard}”</span>
          : listen.kind === 'error' ? <span className="text-red-300">{listen.message}</span>
          : undefined
        }
      >
        <LyricsView
          className="flex-1"
          lyrics={lyrics}
          activeIndex={activeIndex}
          positionMs={synced ? positionMs : -1}
          romanizeFrom={romanizationOn ? romanizeLang : null}
          showTranslation={translationOn}
          onSeek={syncToLine}
        />
      </PlayerShell>

      {(listen.kind === 'consent' || listen.kind === 'loading' || listen.kind === 'choose-source') && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-5 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-zinc-900 p-6 text-white shadow-2xl ring-1 ring-white/10">
            <h2 className="text-xl font-bold">Follow by listening</h2>
            {listen.kind === 'consent' && (
              <>
                <ul className="mt-3 space-y-2 text-sm text-white/75">
                  <li>• Downloads a speech model once — <b>{ENGINE_INFO[listen.engine].label}, about {formatMb(ENGINE_INFO[listen.engine].downloadMb)}</b> — and runs it on this device.</li>
                  <li>• Listens through your mic or a shared tab. Audio stays in memory: never uploaded, never saved.</li>
                  <li>• Use it only with music you’re allowed to play.</li>
                </ul>
                <div className="mt-5 flex justify-end gap-2">
                  <button onClick={() => setListen({ kind: 'off' })} className="rounded-full px-4 py-2 text-sm text-white/70 hover:bg-white/10">Not now</button>
                  <button onClick={() => loadEngine(listen.engine)} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black">Download & continue</button>
                </div>
              </>
            )}
            {listen.kind === 'loading' && (
              <div className="mt-4">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/15">
                  <div className="h-full bg-white transition-[width]" style={{ width: `${Math.min(100, (listen.loaded / Math.max(listen.total, 1)) * 100)}%` }} />
                </div>
                <p className="mt-2 text-sm tabular-nums text-white/60">
                  {formatMb(listen.loaded / 1e6)} / {formatMb(listen.total / 1e6)} · saved for next time
                </p>
              </div>
            )}
            {listen.kind === 'choose-source' && (
              <>
                <p className="mt-2 text-sm text-white/65">Where is the music playing?</p>
                <div className="mt-4 grid gap-2">
                  <button onClick={() => startCapture(listen.engine, 'mic')} className="rounded-2xl bg-white/10 px-4 py-3 text-left hover:bg-white/15">
                    <b>Speakers nearby</b><span className="block text-sm text-white/55">Listen with the microphone</span>
                  </button>
                  <button onClick={() => startCapture(listen.engine, 'tab')} className="rounded-2xl bg-white/10 px-4 py-3 text-left hover:bg-white/15">
                    <b>Another browser tab</b><span className="block text-sm text-white/55">Share the tab and turn on “Share tab audio”</span>
                  </button>
                </div>
                <button onClick={stopListening} className="mt-3 w-full rounded-full py-2 text-sm text-white/60 hover:bg-white/10">Cancel</button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function formatMb(mb: number) {
  return mb >= 1000 ? `${(mb / 1000).toFixed(2)} GB` : `${Math.round(mb)} MB`
}

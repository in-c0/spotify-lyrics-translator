// "Local song lyrics transcription (beta)": for music playing on ANOTHER device or app.
// A speech model runs in this browser, listens through the mic (or a shared tab) and moves the
// lyrics to where the song is. It always asks first — with the download size — and never starts
// a download on its own.
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { AudioLines, Loader2, Square } from 'lucide-react'
import { AsrClient, AudioCapture, ENGINE_INFO, type EngineKind } from '@/lib/asr/client'
import type { Lyric } from '@/lib/lrc'

export const FEATURE_NAME = 'Local song lyrics transcription'
const WINDOW_S = 8 // singing transcribes far better in 6–10 s windows than in short chunks
const MIN_AUDIO_S = 3

/** What one transcript did to the lyrics, shown in the panel. */
export type MatchInfo =
  | { kind: 'moved'; line: number; fromMs: number; toMs: number }
  | { kind: 'confirmed'; line: number }
  | { kind: 'line'; line: number }
  | { kind: 'none' }

export type TranscriptionState =
  | { kind: 'off' }
  | { kind: 'explain'; engine: EngineKind; cached: boolean }
  | { kind: 'loading'; engine: EngineKind; loaded: number; total: number }
  | { kind: 'choose-source'; engine: EngineKind }
  | { kind: 'listening'; engine: EngineKind; phase: 'listening' | 'transcribing'; heard: string; latencyMs: number; match: MatchInfo | null }
  | { kind: 'error'; message: string }

export function useTranscription(onTranscript: (text: string, capturedAt: number) => MatchInfo, language: () => string | undefined) {
  const [state, setState] = useState<TranscriptionState>({ kind: 'off' })
  const asr = useRef<AsrClient | null>(null)
  const capture = useRef<AudioCapture | null>(null)
  const loop = useRef<ReturnType<typeof setTimeout>>()
  const onTranscriptRef = useRef(onTranscript)
  onTranscriptRef.current = onTranscript

  const stop = useCallback(() => {
    clearTimeout(loop.current)
    capture.current?.stop()
    capture.current = null
    setState(s => (s.kind === 'error' ? s : { kind: 'off' }))
  }, [])
  useEffect(() => () => { stop(); asr.current?.dispose() }, [stop])

  /** Opens the explanation dialog. Nothing is downloaded until the user confirms. */
  const open = async () => {
    try {
      asr.current = asr.current || new AsrClient()
      const forced = new URLSearchParams(window.location.search).get('engine') as EngineKind | null
      const engine = forced && forced in ENGINE_INFO ? forced : await asr.current.pickEngine()
      let cached = false
      try { cached = localStorage.getItem(`slt:asrDownloaded:${engine}`) === '1' } catch { /* ignore */ }
      setState({ kind: 'explain', engine, cached })
    } catch (e: any) {
      setState({ kind: 'error', message: e.message })
    }
  }

  const load = async (engine: EngineKind) => {
    const client = asr.current!
    setState({ kind: 'loading', engine, loaded: 0, total: ENGINE_INFO[engine].downloadMb * 1e6 })
    client.onProgress = (loaded, total) => setState(s => (s.kind === 'loading' ? { ...s, loaded, total } : s))
    client.onError = message => { stop(); setState({ kind: 'error', message }) }
    try {
      await client.load(engine)
      try { localStorage.setItem(`slt:asrDownloaded:${engine}`, '1') } catch { /* ignore */ }
      setState({ kind: 'choose-source', engine })
    } catch (e: any) {
      if (engine !== 'whisper-base') {
        // The GPU model couldn't start on this device: offer the small model instead (asks again).
        asr.current?.dispose()
        asr.current = new AsrClient()
        setState({ kind: 'explain', engine: 'whisper-base', cached: false })
        return
      }
      setState({ kind: 'error', message: e.message })
    }
  }

  const start = async (engine: EngineKind, source: 'mic' | 'tab') => {
    try {
      const cap = new AudioCapture(WINDOW_S + 2)
      await cap.start(source)
      cap.onEnded = stop
      capture.current = cap
      setState({ kind: 'listening', engine, phase: 'listening', heard: '', latencyMs: 0, match: null })
      const tick = async () => {
        const c = capture.current
        if (!c) return
        if (c.capturedSeconds >= MIN_AUDIO_S) {
          const capturedAt = Date.now()
          setState(s => (s.kind === 'listening' ? { ...s, phase: 'transcribing' } : s))
          const { text, ms } = await asr.current!.transcribe(c.latest(WINDOW_S), language())
          if (!capture.current) return
          const match = text ? onTranscriptRef.current(text, capturedAt) : null
          setState(s => (s.kind === 'listening' ? { ...s, phase: 'listening', heard: text || s.heard, latencyMs: ms, match: match ?? s.match } : s))
        }
        loop.current = setTimeout(tick, 1500)
      }
      tick()
    } catch (e: any) {
      setState({ kind: 'error', message: e.name === 'NotAllowedError' ? 'Permission to use audio was denied.' : e.message })
    }
  }

  return { state, open, load, start, stop, cancel: () => setState({ kind: 'off' }), capture }
}

export function TranscriptionButton({ t }: { t: ReturnType<typeof useTranscription> }) {
  if (t.state.kind === 'listening') {
    return (
      <button onClick={t.stop} className="flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black">
        <Square className="h-3.5 w-3.5" fill="currentColor" /> Stop transcription
      </button>
    )
  }
  return (
    <button
      onClick={t.open}
      disabled={t.state.kind === 'loading'}
      className="flex w-full items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold hover:bg-white/20 disabled:opacity-60"
    >
      {t.state.kind === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <AudioLines className="h-4 w-4" />}
      {FEATURE_NAME}
      <span className="rounded bg-white/15 px-1 text-[10px] font-bold uppercase tracking-wide">beta</span>
    </button>
  )
}

export function TranscriptionDialog({ t }: { t: ReturnType<typeof useTranscription> }) {
  const s = t.state
  if (s.kind !== 'explain' && s.kind !== 'loading' && s.kind !== 'choose-source') return null
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-5 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-3xl bg-zinc-900 p-6 text-white shadow-2xl ring-1 ring-white/10">
        <h2 className="text-xl font-bold">{FEATURE_NAME} <span className="align-middle text-xs font-bold uppercase text-white/50">beta</span></h2>
        {s.kind === 'explain' && (
          <>
            <p className="mt-2 text-white/80">
              For music playing <b>somewhere else</b> — a speaker, your phone, another app. This page listens, writes down
              what it hears, and jumps the lyrics to that line.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-white/70">
              <li>• {s.cached ? <>Uses the speech model already saved on this device.</> : <>Downloads a speech model once: <b>{ENGINE_INFO[s.engine].label}, about {formatMb(ENGINE_INFO[s.engine].downloadMb)}</b>.</>}</li>
              <li>• Runs entirely on this device. Audio is never uploaded or saved.</li>
              <li>• Not needed when the song plays on this page — the lyrics already follow it.</li>
            </ul>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={t.cancel} className="rounded-full px-4 py-2 text-sm text-white/70 hover:bg-white/10">Cancel</button>
              <button onClick={() => t.load(s.engine)} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black">
                {s.cached ? 'Start' : `Download ${formatMb(ENGINE_INFO[s.engine].downloadMb)} & start`}
              </button>
            </div>
          </>
        )}
        {s.kind === 'loading' && (
          <div className="mt-4">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/15">
              <div className="h-full bg-white transition-[width]" style={{ width: `${Math.min(100, (s.loaded / Math.max(s.total, 1)) * 100)}%` }} />
            </div>
            <p className="mt-2 text-sm tabular-nums text-white/60">{formatMb(s.loaded / 1e6)} / {formatMb(s.total / 1e6)} · saved for next time</p>
          </div>
        )}
        {s.kind === 'choose-source' && (
          <>
            <p className="mt-2 text-sm text-white/65">Where is the music playing?</p>
            <div className="mt-4 grid gap-2">
              <button onClick={() => t.start(s.engine, 'mic')} className="rounded-2xl bg-white/10 px-4 py-3 text-left hover:bg-white/15">
                <b>Speakers nearby</b><span className="block text-sm text-white/55">Listen with the microphone</span>
              </button>
              <button onClick={() => t.start(s.engine, 'tab')} className="rounded-2xl bg-white/10 px-4 py-3 text-left hover:bg-white/15">
                <b>Another browser tab</b><span className="block text-sm text-white/55">Share the tab and turn on “Share tab audio”</span>
              </button>
            </div>
            <button onClick={t.stop} className="mt-3 w-full rounded-full py-2 text-sm text-white/60 hover:bg-white/10">Cancel</button>
          </>
        )}
      </div>
    </div>
  )
}

/** Live view of what the model hears and what it did, so it's obvious the feature is working. */
export function TranscriptionPanel({ t, lyrics }: { t: ReturnType<typeof useTranscription>; lyrics: Lyric[] }) {
  const [level, setLevel] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setLevel(t.capture.current?.level() ?? 0), 100)
    return () => clearInterval(id)
  }, [t.capture])
  const s = t.state
  if (s.kind !== 'listening') return null

  const m = s.match
  const lineText = (i: number) => {
    const text = lyrics[i]?.original || ''
    return `“${text.slice(0, 40)}${text.length > 40 ? '…' : ''}”`
  }
  const result =
    !m ? (s.heard ? '' : 'Waiting for singing…')
    : m.kind === 'moved' ? `Jumped ${fmtDelta(m.toMs - m.fromMs)} to line ${m.line + 1} ${lineText(m.line)}`
    : m.kind === 'confirmed' ? `In sync at line ${m.line + 1} ${lineText(m.line)}`
    : m.kind === 'line' ? `Highlighted line ${m.line + 1} ${lineText(m.line)}`
    : 'Heard something, but it doesn’t match these lyrics yet'

  return (
    <div className="mt-3 rounded-2xl bg-black/35 px-4 py-3 ring-1 ring-white/10 backdrop-blur" aria-live="polite">
      <div className="flex items-center gap-3 text-xs text-white/60">
        <div className="flex h-4 items-end gap-0.5" aria-label="Input level">
          {[0.15, 0.35, 0.55, 0.75, 0.9].map(th => (
            <span key={th} className="w-1 rounded-full bg-white transition-[height,opacity] duration-100" style={{ height: `${level > th ? 100 : 25}%`, opacity: level > th ? 0.95 : 0.3 }} />
          ))}
        </div>
        <span className="font-semibold text-white/80">{s.phase === 'transcribing' ? 'Transcribing last 8 s…' : 'Listening'}</span>
        <span className="ml-auto truncate">{ENGINE_INFO[s.engine].label}{s.latencyMs ? ` · ${(s.latencyMs / 1000).toFixed(1)} s` : ''}</span>
      </div>
      <p className="mt-2 line-clamp-2 min-h-[1.5em] text-base italic text-white/90">{s.heard ? `“${s.heard}”` : '…'}</p>
      {result && <p className={`mt-1 truncate text-xs ${m?.kind === 'none' ? 'text-amber-200/80' : 'text-emerald-200/90'}`}>{result}</p>}
    </div>
  )
}

function fmtDelta(ms: number) {
  const s = Math.round(ms / 1000)
  return `${s >= 0 ? '+' : '−'}${Math.abs(s)} s`
}

export function formatMb(mb: number) {
  return mb >= 1000 ? `${(mb / 1000).toFixed(2)} GB` : `${Math.round(mb)} MB`
}

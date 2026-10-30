// src/components/PlayerShell.tsx
// Full-screen sing-along layout shared by the Spotify view, /demo and /listen:
// blurred artwork backdrop, track header, lyrics in the middle, compact controls at the bottom.
import React from 'react'
import Link from 'next/link'
import { ArrowLeft, Languages, Pause, Play, SkipBack, SkipForward, Subtitles } from 'lucide-react'

export interface ShellTrack {
  title: string
  artist: string
  /** Artwork URL, or a pair of colours for a generated gradient. */
  art?: string
  colors?: [string, string]
}

export interface TargetLanguage {
  code: string
  name: string
}

interface PlayerShellProps {
  track: ShellTrack | null
  /** Where the ← button goes (or a handler). Omit to hide it. */
  back?: { href?: string; onClick?: () => void; label?: string }
  /** Video/player shown beside the lyrics on wide screens and above them on phones. */
  media?: React.ReactNode
  /** Short banner above the lyrics (e.g. how to sync when the song plays elsewhere). */
  notice?: React.ReactNode
  headerRight?: React.ReactNode
  /** Extra line under the artist (e.g. "Romanizing from Korean"). */
  status?: React.ReactNode
  children: React.ReactNode
  progress?: { positionMs: number; durationMs: number; onSeek?: (ms: number) => void }
  playback?: { isPlaying: boolean; onToggle: () => void; onPrev?: () => void; onNext?: () => void }
  romanization: { enabled: boolean; available: boolean; onChange: (on: boolean) => void; highlight?: boolean }
  translation: { enabled: boolean; onChange: (on: boolean) => void; target: string; targets: TargetLanguage[]; onTarget: (code: string) => void }
  footerNote?: React.ReactNode
}

export default function PlayerShell(props: PlayerShellProps) {
  const { track, progress, playback, romanization, translation } = props
  const [c1, c2] = track?.colors || ['#27272a', '#09090b']

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-zinc-950 text-white">
      {/* Backdrop: blurred artwork, or a gradient from the song's colours */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {track?.art ? (
          <img src={track.art} alt="" className="h-full w-full scale-125 object-cover opacity-60 blur-3xl saturate-150" />
        ) : (
          <div className="h-full w-full opacity-70" style={{ background: `radial-gradient(120% 90% at 15% 10%, ${c2}, transparent 60%), radial-gradient(120% 90% at 90% 90%, ${c1}, transparent 60%)` }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/45 to-black/75" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center gap-3 px-5 pt-5 sm:gap-4 sm:px-10 sm:pt-8">
        {props.back && <BackButton {...props.back} />}
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg shadow-lg ring-1 ring-white/10" style={!track?.art ? { background: `linear-gradient(135deg, ${c1}, ${c2})` } : undefined}>
          {track?.art && <img src={track.art} alt="" className="h-full w-full object-cover" />}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold leading-tight sm:text-xl">{track?.title || 'Nothing playing'}</h1>
          <p className="truncate text-sm text-white/65">{track?.artist || '—'}</p>
          {props.status && <p className="truncate text-xs text-white/45">{props.status}</p>}
        </div>
        {props.headerRight}
      </header>

      {/* Lyrics (+ player) */}
      <div className={`relative z-10 mx-auto flex min-h-0 w-full flex-1 flex-col gap-4 px-5 sm:px-10 ${props.media ? 'max-w-6xl lg:flex-row-reverse lg:items-start lg:gap-10 lg:pt-6' : 'max-w-3xl'}`}>
        {props.media && <aside className="mt-3 w-full shrink-0 lg:mt-0 lg:w-[380px]">{props.media}</aside>}
        <main className="flex min-h-0 w-full flex-1 flex-col self-stretch">
          {props.notice && <div className="mt-3 rounded-2xl bg-white/10 px-4 py-3 text-sm text-white/85 ring-1 ring-white/10">{props.notice}</div>}
          {props.children}
        </main>
      </div>

      {/* Controls */}
      <footer className={`relative z-10 mx-auto w-full px-5 pb-5 sm:px-10 sm:pb-8 ${props.media ? 'max-w-6xl' : 'max-w-3xl'}`}>
        {progress && progress.durationMs > 0 && <ProgressBar {...progress} />}
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            {playback && (
              <>
                {playback.onPrev && <IconButton label="Previous" onClick={playback.onPrev}><SkipBack className="h-5 w-5" /></IconButton>}
                <button
                  onClick={playback.onToggle}
                  aria-label={playback.isPlaying ? 'Pause' : 'Play'}
                  className="grid h-11 w-11 place-items-center rounded-full bg-white text-black transition hover:scale-105"
                >
                  {playback.isPlaying ? <Pause className="h-5 w-5" fill="currentColor" /> : <Play className="ml-0.5 h-5 w-5" fill="currentColor" />}
                </button>
                {playback.onNext && <IconButton label="Next" onClick={playback.onNext}><SkipForward className="h-5 w-5" /></IconButton>}
              </>
            )}
          </div>
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            <Toggle
              label="Romanization"
              icon={<Languages className="h-4 w-4" />}
              on={romanization.enabled && romanization.available}
              disabled={!romanization.available}
              highlight={romanization.highlight}
              onChange={romanization.onChange}
            />
            <Toggle label="Translation" icon={<Subtitles className="h-4 w-4" />} on={translation.enabled} onChange={translation.onChange} />
            <select
              aria-label="Translate to"
              value={translation.target}
              onChange={e => translation.onTarget(e.target.value)}
              className="h-9 w-24 min-w-0 rounded-full border border-white/15 bg-white/10 px-3 text-sm text-white outline-none backdrop-blur hover:bg-white/15 sm:w-auto"
            >
              {translation.targets.map(l => (
                <option key={l.code} value={l.code} className="bg-zinc-900">{l.name}</option>
              ))}
            </select>
          </div>
        </div>
        {props.footerNote && <div className="mt-3 text-center text-xs text-white/45">{props.footerNote}</div>}
      </footer>
    </div>
  )
}

function BackButton({ href, onClick, label = 'Back' }: { href?: string; onClick?: () => void; label?: string }) {
  const cls = 'grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20'
  const icon = <ArrowLeft className="h-5 w-5" />
  return href ? (
    <Link href={href} aria-label={label} title={label} className={cls}>{icon}</Link>
  ) : (
    <button onClick={onClick} aria-label={label} title={label} className={cls}>{icon}</button>
  )
}

function ProgressBar({ positionMs, durationMs, onSeek }: { positionMs: number; durationMs: number; onSeek?: (ms: number) => void }) {
  const pct = Math.min(100, (positionMs / durationMs) * 100)
  return (
    <div>
      <div
        className={`group relative h-1.5 w-full rounded-full bg-white/20 ${onSeek ? 'cursor-pointer' : ''}`}
        onClick={onSeek ? e => {
          const r = e.currentTarget.getBoundingClientRect()
          onSeek(Math.round(((e.clientX - r.left) / r.width) * durationMs))
        } : undefined}
      >
        <div className="h-full rounded-full bg-white" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-[11px] tabular-nums text-white/50">
        <span>{fmt(positionMs)}</span>
        <span>{fmt(durationMs)}</span>
      </div>
    </div>
  )
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-label={label} className="grid h-10 w-10 place-items-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white">
      {children}
    </button>
  )
}

function Toggle({ label, icon, on, disabled, highlight, onChange }: { label: string; icon: React.ReactNode; on: boolean; disabled?: boolean; highlight?: boolean; onChange: (on: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      title={disabled ? `${label} isn't available for this language` : label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium backdrop-blur transition
        ${on ? 'border-white bg-white text-black' : 'border-white/15 bg-white/10 text-white/80 hover:bg-white/15'}
        ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
      {highlight && <span aria-hidden className="hairline-ring" />}
    </button>
  )
}

function fmt(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

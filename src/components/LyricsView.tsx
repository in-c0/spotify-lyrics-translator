// src/components/LyricsView.tsx
// Time-synced lyric list: original line + optional romanization + translation.
// Shared by the Spotify view, the demo and listen mode.
import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { Lyric } from '@/lib/lrc'
import { isSameAsOriginal, romanizeLine, type RomanizableLanguage } from '@/lib/romanize'

interface LyricsViewProps {
  lyrics: Lyric[]
  activeIndex: number
  /** Language to romanize from, or null to hide romanization. */
  romanizeFrom: RomanizableLanguage | null
  showTranslation: boolean
  /** Called with a line's start time when the user taps it (omit to disable seeking). */
  onSeek?: (ms: number) => void
  className?: string
}

const FOLLOW_RESUME_MS = 4000
const ANCHOR = 0.36 // active line sits a bit above the vertical centre

export default function LyricsView({ lyrics, activeIndex, romanizeFrom, showTranslation, onSeek, className = '' }: LyricsViewProps) {
  const scroller = useRef<HTMLDivElement>(null)
  const lineRefs = useRef<(HTMLDivElement | null)[]>([])
  const [following, setFollowing] = useState(true)
  const resumeTimer = useRef<ReturnType<typeof setTimeout>>()

  const romanized = useMemo(
    () => lyrics.map(line => (romanizeFrom ? romanizeLine(line.original, romanizeFrom) : '')),
    [lyrics, romanizeFrom]
  )

  // Keep the active line anchored while following.
  useEffect(() => {
    const box = scroller.current
    const el = lineRefs.current[activeIndex]
    if (!following || !box || !el) return
    box.scrollTo({ top: el.offsetTop - box.clientHeight * ANCHOR + el.clientHeight / 2, behavior: 'smooth' })
  }, [activeIndex, following, lyrics])

  // Manual scrolling pauses following; it resumes on its own after a moment.
  const pauseFollowing = () => {
    setFollowing(false)
    clearTimeout(resumeTimer.current)
    resumeTimer.current = setTimeout(() => setFollowing(true), FOLLOW_RESUME_MS)
  }
  useEffect(() => () => clearTimeout(resumeTimer.current), [])

  const synced = lyrics.length > 0 && lyrics[0].startTimeMs >= 0

  return (
    <div className={`relative min-h-0 ${className}`}>
      <div
        ref={scroller}
        onWheel={pauseFollowing}
        onTouchMove={pauseFollowing}
        className="lyrics-mask h-full overflow-y-auto hide-scrollbar px-1"
      >
        <div style={{ height: `${ANCHOR * 100}%` }} aria-hidden />
        {lyrics.map((line, i) => {
          const state = i === activeIndex ? 'active' : i < activeIndex ? 'past' : 'future'
          const roman = romanized[i]
          const showRoman = roman && !isSameAsOriginal(line.original, roman)
          const showTrans = showTranslation && line.translated && !isSameAsOriginal(line.original, line.translated)
          const seekable = Boolean(onSeek && synced)
          if (!line.original.trim()) {
            return (
              <div key={i} ref={el => { lineRefs.current[i] = el }} className={`lyric-line ${state} py-3 text-2xl`} aria-hidden>
                ♪
              </div>
            )
          }
          return (
            <div
              key={i}
              ref={el => { lineRefs.current[i] = el }}
              data-state={state}
              onClick={seekable ? () => { setFollowing(true); onSeek!(line.startTimeMs) } : undefined}
              className={`lyric-line ${state} py-3 ${seekable ? 'cursor-pointer' : ''}`}
            >
              <p className="lyric-original">{line.original}</p>
              {showRoman && <p className="lyric-roman">{roman}</p>}
              {showTrans && <p className="lyric-trans">{line.translated}</p>}
            </div>
          )
        })}
        <div style={{ height: `${(1 - ANCHOR) * 100}%` }} aria-hidden />
      </div>
      {!following && activeIndex >= 0 && (
        <button
          onClick={() => { clearTimeout(resumeTimer.current); setFollowing(true) }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-4 py-1.5 text-sm font-semibold text-black shadow-lg"
        >
          Back to current line
        </button>
      )}
    </div>
  )
}

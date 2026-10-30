// pages/demo.tsx — key-free demo: public-domain folk songs on a simulated playback clock.
import React, { useEffect, useMemo, useRef, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import PlayerShell from '@/components/PlayerShell'
import LyricsView from '@/components/LyricsView'
import { DEMO_SONGS } from '@/lib/demoSongs'
import { activeLineIndex, type Lyric } from '@/lib/lrc'
import { TARGET_LANGUAGES, translateLines } from '@/lib/translateClient'
import { usePreference } from '@/lib/usePreference'

export default function DemoPage() {
  const [songIndex, setSongIndex] = useState(0)
  const song = DEMO_SONGS[songIndex]
  const [positionMs, setPositionMs] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [romanizationOn, setRomanizationOn] = usePreference('romanization', true)
  const [translationOn, setTranslationOn] = usePreference('translation', true)
  const [target, setTarget] = usePreference('targetLanguage', 'en')
  const [translated, setTranslated] = useState<Lyric[] | null>(null)
  const [hint, setHint] = useState(false)

  // Simulated playback clock (loops each song).
  const clock = useRef({ base: 0, at: 0 })
  useEffect(() => {
    clock.current = { base: positionMs, at: Date.now() }
    if (!isPlaying) return
    const id = setInterval(() => {
      const t = clock.current.base + Date.now() - clock.current.at
      setPositionMs(t >= song.durationMs ? 0 : t)
      if (t >= song.durationMs) clock.current = { base: 0, at: Date.now() }
    }, 100)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, song])

  const seek = (ms: number) => {
    clock.current = { base: ms, at: Date.now() }
    setPositionMs(ms)
  }
  const pickSong = (i: number) => {
    setSongIndex(i)
    setPositionMs(0)
    clock.current = { base: 0, at: Date.now() }
    setIsPlaying(true)
  }

  // English translations ship with the demo; other targets are translated live.
  useEffect(() => {
    setTranslated(null)
    if (target === 'en') return
    let stale = false
    translateLines(song.lyrics.map(l => l.original), target)
      .then(({ lines }) => { if (!stale) setTranslated(song.lyrics.map((l, i) => ({ ...l, translated: lines[i] }))) })
      .catch(() => {})
    return () => { stale = true }
  }, [song, target])
  const lyrics = target === 'en' ? song.lyrics : translated || song.lyrics.map(l => ({ ...l, translated: '' }))

  // First visit only: flip romanization off and back on so the control explains itself.
  useEffect(() => {
    try {
      if (localStorage.getItem('slt:demoHintShown')) return
      localStorage.setItem('slt:demoHintShown', '1')
    } catch {
      return
    }
    setHint(true)
    const off = setTimeout(() => setRomanizationOn(false), 1200)
    const on = setTimeout(() => setRomanizationOn(true), 2400)
    const done = setTimeout(() => setHint(false), 3400)
    return () => [off, on, done].forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const activeIndex = activeLineIndex(lyrics, positionMs)
  const picker = useMemo(
    () => (
      <nav className="flex gap-1.5 overflow-x-auto hide-scrollbar" aria-label="Demo songs">
        {DEMO_SONGS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => pickSong(i)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition ${i === songIndex ? 'bg-white text-black' : 'bg-white/10 text-white/75 hover:bg-white/20'}`}
          >
            {s.title.split(' (')[1]?.replace(')', '') || s.title}
          </button>
        ))}
      </nav>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [songIndex]
  )

  return (
    <>
      <Head>
        <title>Demo · Spotify Lyrics Translator</title>
        <meta name="description" content="Try time-synced lyrics with romanization and translation — no account needed." />
      </Head>
      <PlayerShell
        track={{ title: song.title, artist: song.artist, colors: song.colors }}
        status="Demo · public-domain folk song"
        headerRight={<div className="hidden max-w-[50%] sm:block">{picker}</div>}
        progress={{ positionMs, durationMs: song.durationMs, onSeek: seek }}
        playback={{
          isPlaying,
          onToggle: () => setIsPlaying(p => !p),
          onPrev: () => pickSong((songIndex + DEMO_SONGS.length - 1) % DEMO_SONGS.length),
          onNext: () => pickSong((songIndex + 1) % DEMO_SONGS.length),
        }}
        romanization={{ enabled: romanizationOn, available: true, onChange: setRomanizationOn, highlight: hint }}
        translation={{ enabled: translationOn, onChange: setTranslationOn, target, targets: TARGET_LANGUAGES, onTarget: setTarget }}
        footerNote={
          <span>
            <Link href="/" className="underline underline-offset-2 hover:text-white">Connect Spotify</Link>
          </span>
        }
      >
        <div className="pt-2 sm:hidden">{picker}</div>
        <LyricsView
          className="flex-1"
          lyrics={lyrics}
          activeIndex={activeIndex}
          positionMs={positionMs}
          romanizeFrom={romanizationOn ? song.language : null}
          showTranslation={translationOn}
          onSeek={seek}
        />
      </PlayerShell>
    </>
  )
}

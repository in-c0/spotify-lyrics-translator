// Landing page for visitors who aren't connected to Spotify.
// Pattern shared by fast-growing consumer apps (Suno, Kling, PixVerse, ElevenLabs):
// a short outcome headline, the main action right in the hero (a search box), and the result
// shown immediately — here, one lyric line with its three layers labelled.
import React, { useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { Github } from 'lucide-react'
import SongSearch from './SongSearch'

export default function Landing() {
  const router = useRouter()
  const [spotifyLogin, setSpotifyLogin] = useState(false)

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(c => setSpotifyLogin(Boolean(c.spotifyLogin)))
      .catch(() => {})
  }, [])

  return (
    <>
      <Head>
        <title>Lyrics Translator — sing along in any language</title>
        <meta name="description" content="Search a song. It plays here with every line in the original, how to pronounce it, and what it means." />
      </Head>
      <div className="relative min-h-[100dvh] overflow-hidden bg-zinc-950 text-white">
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-80" style={{ background: 'radial-gradient(60% 50% at 20% 10%, #7c2d5a 0%, transparent 70%), radial-gradient(50% 45% at 85% 20%, #1e3a8a 0%, transparent 70%), radial-gradient(60% 50% at 50% 100%, #134e4a 0%, transparent 70%)' }} />

        <nav className="relative z-10 mx-auto flex max-w-5xl items-center justify-between px-5 py-5 sm:px-8">
          <span className="font-bold tracking-tight">Lyrics Translator</span>
          <div className="flex items-center gap-2 text-sm">
            {spotifyLogin && (
              <Link href="/login" className="rounded-full bg-white/10 px-4 py-2 font-semibold hover:bg-white/20">Connect Spotify</Link>
            )}
            <a href="https://github.com/in-c0/spotify-lyrics-translator" target="_blank" rel="noreferrer" aria-label="Source code on GitHub" className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/10">
              <Github className="h-5 w-5" />
            </a>
          </div>
        </nav>

        <main className="relative z-10 mx-auto max-w-5xl px-5 pb-16 sm:px-8">
          <section className="mx-auto max-w-2xl pt-8 text-center sm:pt-16">
            <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">Sing along in any language</h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-white/75">
              Search a song. It plays right here, with every line shown in the original, how to say it, and what it means.
            </p>
            <div className="mt-8 text-left">
              <SongSearch large onPick={t => router.push({ pathname: '/listen', query: { id: t.id } })} />
            </div>
          </section>

          <section aria-label="What you'll see" className="mx-auto mt-14 max-w-2xl">
            <LyricLayers />
          </section>

          <section className="mx-auto mt-14 grid max-w-3xl gap-3 sm:grid-cols-3">
            {[
              ['1', 'Search a song', 'By title or artist — K-pop, J-pop, Latin and more.'],
              ['2', 'It plays here', 'The lyrics follow the music line by line.'],
              ['3', 'Read along', 'Original, pronunciation and translation together.'],
            ].map(([n, title, body]) => (
              <div key={n} className="rounded-2xl bg-white/[0.06] p-5 ring-1 ring-white/10">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-sm font-bold text-black">{n}</span>
                <p className="mt-3 font-semibold">{title}</p>
                <p className="mt-1 text-sm text-white/60">{body}</p>
              </div>
            ))}
          </section>

          <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-white/50">
            Music playing on another device? Open a song and choose <i>Playing it on another device</i> to sync by tapping or by listening.
            {spotifyLogin && <> Using Spotify? <Link href="/login" className="underline">Connect it</Link> and the lyrics follow whatever you play.</>}
          </p>
        </main>

        <footer className="relative z-10 pb-6 text-center text-xs text-white/40">
          Lyrics from <a className="underline" href="https://lrclib.net" target="_blank" rel="noreferrer">LRCLIB</a> · Playback via YouTube ·{' '}
          <a className="underline" href="https://github.com/in-c0/spotify-lyrics-translator" target="_blank" rel="noreferrer">Open source</a>
        </footer>
      </div>
    </>
  )
}

/** One public-domain lyric line (Arirang) with its three layers labelled — the whole idea in one picture. */
function LyricLayers() {
  const [p, setP] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setP(v => (v >= 100 ? 0 : v + 1)), 45)
    return () => clearInterval(id)
  }, [])
  const rows: [string, React.ReactNode, string][] = [
    ['Original', <span key="o" className="lyric-sweep" style={{ ['--p' as string]: `${p}%` }}>아리랑 고개로 넘어간다</span>, 'text-3xl sm:text-4xl font-extrabold'],
    ['How to say it', 'arirang gogaero neomeoganda', 'text-lg sm:text-xl font-semibold text-white/85'],
    ['What it means', 'Crossing over the Arirang pass', 'text-base sm:text-lg text-white/65'],
  ]
  return (
    <div className="rounded-3xl bg-black/35 p-6 ring-1 ring-white/10 backdrop-blur sm:p-8">
      <div className="space-y-3">
        {rows.map(([label, text, cls]) => (
          <div key={label} className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-4">
            <span className="w-32 shrink-0 text-xs font-semibold uppercase tracking-wider text-emerald-200/80">{label}</span>
            <p className={`leading-tight ${cls}`}>{text}</p>
          </div>
        ))}
      </div>
      <p className="mt-5 text-xs text-white/40">Example: “Arirang”, Korean folk song. The highlighted part follows the singer.</p>
    </div>
  )
}

// Evergreen search-entry guide: people searching "romanized lyrics" / "how to sing K-pop in English letters"
// land here, see a worked example, and are sent to the key-free player.
import React from 'react'
import Head from 'next/head'
import Link from 'next/link'

const TITLE = 'How to sing along to K-pop, J-pop and anime songs with romanized lyrics'
const DESC =
  'A short guide to singing songs in languages you cannot read: romanization vs translation, why timing matters, and a free time-synced tool that shows both.'

export default function RomanizedLyricsGuide() {
  return (
    <>
      <Head>
        <title>{TITLE}</title>
        <meta name="description" content={DESC} />
        <link rel="canonical" href="https://spotify-lyrics-translator.netlify.app/guides/sing-along-with-romanized-lyrics" />
      </Head>
      <main className="min-h-[100dvh] bg-zinc-950 px-5 py-10 text-white">
        <article className="mx-auto max-w-2xl space-y-5 leading-relaxed text-white/85">
          <Link href="/" className="text-sm text-white/60 hover:text-white">← Lyrics Translator</Link>
          <h1 className="text-3xl font-extrabold leading-tight text-white sm:text-4xl">{TITLE}</h1>
          <p>
            You love a song in Korean, Japanese, Chinese or Russian, but you cannot read the script. Two different
            things help, and most lyric sites give you only one of them.
          </p>
          <h2 className="pt-2 text-xl font-bold text-white">Romanization is for your mouth</h2>
          <p>
            Romanization writes the original sounds in Latin letters, so you can pronounce them. It does not tell you what
            the words mean.
          </p>
          <h2 className="pt-2 text-xl font-bold text-white">Translation is for your head</h2>
          <p>Translation tells you what the line means. It does not tell you how to say it. You want both, on the same line.</p>
          <pre className="overflow-x-auto rounded-xl bg-white/5 p-4 text-sm">{`Original       아리랑 고개로 넘어간다
Romanization   arirang gogaero neomeoganda
Meaning        Crossing over the Arirang pass`}</pre>
          <h2 className="pt-2 text-xl font-bold text-white">Timing matters more than you think</h2>
          <p>
            A static wall of lyrics makes you lose your place by the second chorus. Lyrics that follow the song line by
            line let you look up at the right moment. Tap any line to jump back to it.
          </p>
          <h2 className="pt-2 text-xl font-bold text-white">Try it without signing up</h2>
          <p>
            Lyrics Translator shows the original, the romanization and the translation for each line, synced to the
            song. Search a song and it plays on the page. No account and no card.
          </p>
          <p className="flex flex-wrap gap-3 pt-2">
            <Link href="/" className="rounded-full bg-white px-5 py-2.5 font-semibold text-zinc-950">Search a song</Link>
            <Link href="/demo" className="rounded-full bg-white/10 px-5 py-2.5 font-semibold hover:bg-white/20">See the demo</Link>
          </p>
          <p className="text-sm text-white/50">
            Known limit: Japanese romanization covers kana only; kanji stay as written. Lyrics come from the community
            database LRCLIB, so some tracks have no synced lyrics.
          </p>
        </article>
      </main>
    </>
  )
}

// Song search box + results, shared by the landing page and /listen.
import React, { useEffect, useRef, useState } from 'react'
import { Loader2, Search } from 'lucide-react'
import { rememberTrack, searchTracks, type LrclibTrack } from '@/lib/lrclibClient'

export const EXAMPLES = ['Ditto NewJeans', '夜に駆ける YOASOBI', 'Despacito', 'APT. ROSÉ']

interface SongSearchProps {
  onPick: (track: LrclibTrack) => void
  initialQuery?: string
  autoFocus?: boolean
  /** Called when the query changes (e.g. to keep it in the URL). */
  onQueryChange?: (q: string) => void
  large?: boolean
}

export default function SongSearch({ onPick, initialQuery = '', autoFocus, onQueryChange, large }: SongSearchProps) {
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<LrclibTrack[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setQuery(initialQuery) }, [initialQuery])

  useEffect(() => {
    onQueryChange?.(query)
    const q = query.trim()
    if (q.length < 2) { setResults(null); setError(''); return }
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setSearching(true)
      setError('')
      try {
        setResults((await searchTracks(q, controller.signal)).slice(0, 10))
      } catch (e: any) {
        if (e.name !== 'AbortError') setError(e.message)
      } finally {
        if (!controller.signal.aborted) setSearching(false)
      }
    }, 350)
    return () => { clearTimeout(timer); controller.abort() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  return (
    <div className="w-full">
      <label className={`flex items-center gap-3 rounded-2xl bg-white/10 ring-1 ring-white/15 backdrop-blur transition focus-within:bg-white/15 focus-within:ring-white/40 ${large ? 'px-5 py-4' : 'px-4 py-3'}`}>
        <Search className="h-5 w-5 shrink-0 text-white/60" />
        <input
          ref={inputRef}
          autoFocus={autoFocus}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search a song title or artist"
          aria-label="Search a song"
          className={`w-full bg-transparent outline-none placeholder:text-white/45 ${large ? 'text-xl' : 'text-lg'}`}
        />
        {searching && <Loader2 className="h-5 w-5 shrink-0 animate-spin text-white/60" />}
      </label>

      {!query.trim() && (
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="py-1 text-sm text-white/45">Try</span>
          {EXAMPLES.map(e => (
            <button key={e} onClick={() => { setQuery(e); inputRef.current?.focus() }} className="rounded-full bg-white/10 px-3 py-1 text-sm text-white/85 hover:bg-white/20">
              {e}
            </button>
          ))}
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

      {results && (
        <ul className="mt-3 overflow-hidden rounded-2xl bg-black/40 ring-1 ring-white/10 backdrop-blur">
          {results.map(r => (
            <li key={r.id}>
              <button onClick={() => { rememberTrack(r); onPick(r) }} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white/10">
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{r.trackName}</span>
                  <span className="block truncate text-sm text-white/55">{r.artistName}</span>
                </span>
                <span className="shrink-0 text-xs text-white/45">
                  {formatSeconds(r.duration)}
                </span>
              </button>
            </li>
          ))}
          {results.length === 0 && !searching && (
            <li className="px-4 py-3 text-white/60">No lyrics found for “{query.trim()}”. Try the exact title, or title + artist.</li>
          )}
        </ul>
      )}
    </div>
  )
}

export function formatSeconds(s: number) {
  return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`
}

// Minimal YouTube IFrame Player wrapper: plays a song in the page and reports the exact position,
// so lyrics stay in sync with what you hear. If a video refuses to be embedded, it moves on to the
// next candidate automatically.
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

declare global {
  interface Window {
    YT?: any
    onYouTubeIframeAPIReady?: () => void
  }
}

let apiPromise: Promise<any> | null = null
function loadApi(): Promise<any> {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (apiPromise) return apiPromise
  apiPromise = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previous?.()
      resolve(window.YT)
    }
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    script.onerror = () => { apiPromise = null; reject(new Error('Could not load the YouTube player.')) }
    document.head.appendChild(script)
  })
  return apiPromise
}

export type PlayerStatus = 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'ended' | 'failed'

/**
 * `hostRef` must point at an element React renders WITHOUT children: YouTube replaces the node it
 * is given with an iframe, so we hand it a child we create ourselves, never a React-managed node.
 */
export function useYouTubePlayer(hostRef: RefObject<HTMLDivElement>, videoIds: string[]) {
  const player = useRef<any>(null)
  const [status, setStatus] = useState<PlayerStatus>('idle')
  const [index, setIndex] = useState(0)
  const [positionMs, setPositionMs] = useState(0)
  const [durationMs, setDurationMs] = useState(0)
  const [stalled, setStalled] = useState(false) // asked to play, but the video never started
  const playRequested = useRef(0)
  const ids = videoIds.join(',')

  useEffect(() => { setIndex(0) }, [ids])

  useEffect(() => {
    const id = videoIds[index]
    if (!id) {
      setStatus(videoIds.length ? 'failed' : 'idle')
      return
    }
    let cancelled = false
    setStatus('loading')
    loadApi()
      .then(YT => {
        if (cancelled) return
        player.current?.destroy?.()
        const host = hostRef.current
        if (!host) return
        const mount = document.createElement('div')
        host.replaceChildren(mount)
        player.current = new YT.Player(mount, {
          videoId: id,
          width: '100%',
          height: '100%',
          playerVars: { playsinline: 1, rel: 0, modestbranding: 1 },
          events: {
            onReady: (e: any) => {
              if (cancelled) return
              ;(window as any).__sltPlayer = e.target // handy for debugging in the console
              setDurationMs(Math.round(e.target.getDuration() * 1000))
              setStatus('ready')
            },
            onStateChange: (e: any) => {
              if (cancelled) return
              const s = e.data
              if (s === 1 || s === 3) { playRequested.current = 0; setStalled(false) }
              if (s === 1) setStatus('playing')
              else if (s === 2) setStatus('paused')
              else if (s === 0) setStatus('ended')
              const d = e.target.getDuration?.()
              if (d) setDurationMs(Math.round(d * 1000))
            },
            // 101/150: embedding disabled by the owner; 100: removed; 2/5: bad id / HTML5 error.
            onError: () => { if (!cancelled) setIndex(i => i + 1) },
          },
        })
      })
      .catch(() => { if (!cancelled) setStatus('failed') })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, index])

  useEffect(() => () => { player.current?.destroy?.(); player.current = null }, [])

  // Poll the exact position (the API has no time-update event).
  useEffect(() => {
    if (status !== 'playing' && status !== 'paused' && status !== 'ready') return
    const tick = setInterval(() => {
      const t = player.current?.getCurrentTime?.()
      if (typeof t === 'number') setPositionMs(Math.round(t * 1000))
    }, 100)
    return () => clearInterval(tick)
  }, [status])

  const play = useCallback(() => {
    player.current?.playVideo?.()
    playRequested.current = Date.now()
    setStalled(false)
    setTimeout(() => {
      if (playRequested.current && Date.now() - playRequested.current >= 7000) setStalled(true)
    }, 7500)
  }, [])
  /** Try the next candidate recording. */
  const next = useCallback(() => { setStalled(false); setIndex(i => i + 1) }, [])
  const pause = useCallback(() => player.current?.pauseVideo?.(), [])
  const seek = useCallback((ms: number) => {
    player.current?.seekTo?.(Math.max(0, ms) / 1000, true)
    setPositionMs(Math.max(0, ms))
  }, [])

  return {
    status,
    videoId: videoIds[index] as string | undefined,
    positionMs,
    durationMs,
    isPlaying: status === 'playing',
    stalled,
    next,
    hasNext: index + 1 < videoIds.length,
    play,
    pause,
    seek,
  }
}

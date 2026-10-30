// Main-thread side of listen mode: talks to the ASR worker and captures audio.
import type { EngineKind, WorkerRequest, WorkerResponse } from '../../workers/asr.worker'

export type { EngineKind }

export const ENGINE_INFO: Record<EngineKind, { label: string; downloadMb: number }> = {
  'qwen3-q4f16': { label: 'Qwen3-ASR 0.6B (WebGPU)', downloadMb: 890 },
  'qwen3-q4': { label: 'Qwen3-ASR 0.6B (WebGPU)', downloadMb: 1300 },
  'whisper-base': { label: 'Whisper base (no GPU)', downloadMb: 55 },
}

export class AsrClient {
  private worker: Worker
  private nextId = 1
  private pending = new Map<number, (r: { text: string; ms: number }) => void>()
  private waiters: ((msg: WorkerResponse) => boolean)[] = []
  onProgress?: (loaded: number, total: number) => void
  onError?: (message: string) => void

  constructor() {
    this.worker = new Worker(new URL('../../workers/asr.worker.ts', import.meta.url), { type: 'module' })
    this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const msg = e.data
      if (msg.type === 'progress') this.onProgress?.(msg.loaded, msg.total)
      if (msg.type === 'result') {
        this.pending.get(msg.id)?.({ text: msg.text, ms: msg.ms })
        this.pending.delete(msg.id)
      }
      if (msg.type === 'error') {
        this.onError?.(msg.message)
        this.pending.forEach(resolve => resolve({ text: '', ms: 0 }))
        this.pending.clear()
      }
      this.waiters = this.waiters.filter(w => !w(msg))
    }
  }

  private send(msg: WorkerRequest, transfer: Transferable[] = []) {
    this.worker.postMessage(msg, transfer)
  }

  private waitFor<T extends WorkerResponse['type']>(type: T): Promise<Extract<WorkerResponse, { type: T }>> {
    return new Promise((resolve, reject) => {
      this.waiters.push(msg => {
        if (msg.type === type) { resolve(msg as any); return true }
        if (msg.type === 'error') { reject(new Error(msg.message)); return true }
        return false
      })
    })
  }

  /** Picks the best engine this device can run. */
  async pickEngine(): Promise<EngineKind> {
    const probe = this.waitFor('probe')
    this.send({ type: 'probe' })
    const { webgpu, f16 } = await probe
    if (!webgpu) return 'whisper-base'
    return f16 ? 'qwen3-q4f16' : 'qwen3-q4'
  }

  async load(engine: EngineKind, base?: string) {
    const ready = this.waitFor('ready')
    this.send({ type: 'load', engine, base })
    await ready
  }

  transcribe(audio: Float32Array, language?: string): Promise<{ text: string; ms: number }> {
    const id = this.nextId++
    return new Promise(resolve => {
      this.pending.set(id, resolve)
      this.send({ type: 'transcribe', id, audio, language }, [audio.buffer])
    })
  }

  dispose() {
    this.worker.terminate()
  }
}

/** Keeps the last `seconds` of 16 kHz mono audio from the microphone or a shared tab. */
export class AudioCapture {
  private context: AudioContext | null = null
  private stream: MediaStream | null = null
  private ring: Float32Array
  private written = 0
  onEnded?: () => void

  constructor(private seconds = 10) {
    this.ring = new Float32Array(16000 * seconds)
  }

  async start(source: 'mic' | 'tab') {
    if (source === 'mic') {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      })
    } else {
      // Chrome only shares tab audio together with video; we drop the video right away.
      this.stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
      this.stream.getVideoTracks().forEach(t => t.stop())
      if (this.stream.getAudioTracks().length === 0) {
        this.stop()
        throw new Error('No audio was shared. Pick a tab and turn on "Share tab audio".')
      }
    }
    this.stream.getAudioTracks()[0].addEventListener('ended', () => this.onEnded?.())
    // Use the device's native rate (Firefox can't mix rates) and resample to 16 kHz ourselves.
    this.context = new AudioContext()
    const step = this.context.sampleRate / 16000
    let phase = 0
    let last = 0
    const input = this.context.createMediaStreamSource(this.stream)
    // ScriptProcessor is deprecated but universally available and plenty for 16 kHz mono.
    const processor = this.context.createScriptProcessor(4096, 1, 1)
    processor.onaudioprocess = e => {
      const data = e.inputBuffer.getChannelData(0)
      // Linear interpolation between consecutive input samples.
      while (phase < data.length) {
        const i = Math.floor(phase)
        const frac = phase - i
        const a = i === 0 ? last : data[i - 1]
        const b = data[i]
        this.ring[this.written % this.ring.length] = a + (b - a) * frac
        this.written++
        phase += step
      }
      phase -= data.length
      last = data[data.length - 1]
    }
    input.connect(processor)
    processor.connect(this.context.destination) // required for onaudioprocess to fire; output is silent
  }

  /** Copy of the most recent `seconds` of audio (shorter at the very start). */
  latest(seconds: number): Float32Array {
    const n = Math.min(this.written, Math.floor(16000 * seconds), this.ring.length)
    const out = new Float32Array(n)
    const start = this.written - n
    for (let i = 0; i < n; i++) out[i] = this.ring[(start + i) % this.ring.length]
    return out
  }

  get capturedSeconds() {
    return this.written / 16000
  }

  stop() {
    this.stream?.getTracks().forEach(t => t.stop())
    this.context?.close().catch(() => {})
    this.stream = null
    this.context = null
  }
}

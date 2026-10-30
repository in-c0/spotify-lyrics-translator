// Whisper-compatible log-mel spectrogram (what Qwen3-ASR's encoder expects):
// 16 kHz, n_fft 400, hop 160, periodic Hann, centred with reflect padding, power spectrum,
// 128 mel filters, log10 with 1e-10 floor, clamp to max-8, (x+4)/4, last frame dropped.
const N = 400
const HOP = 160
const BINS = N / 2 + 1

let tables: { cos: Float32Array; sin: Float32Array; win: Float32Array } | null = null
function getTables() {
  if (tables) return tables
  const cos = new Float32Array(N * BINS)
  const sin = new Float32Array(N * BINS)
  for (let k = 0; k < BINS; k++) {
    for (let i = 0; i < N; i++) {
      const a = (2 * Math.PI * ((i * k) % N)) / N
      cos[k * N + i] = Math.cos(a)
      sin[k * N + i] = Math.sin(a)
    }
  }
  const win = new Float32Array(N)
  for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N)
  tables = { cos, sin, win }
  return tables
}

export function logMel(x: Float32Array, filters: number[][]): { mel: Float32Array; frames: number } {
  const { cos, sin, win } = getTables()
  const pad = N / 2
  const padded = new Float32Array(x.length + 2 * pad)
  for (let i = 0; i < padded.length; i++) {
    let j = i - pad
    if (j < 0) j = -j
    if (j >= x.length) j = 2 * (x.length - 1) - j
    padded[i] = x[Math.max(0, Math.min(x.length - 1, j))]
  }
  const frames = Math.max(1, Math.floor((padded.length - N) / HOP)) // includes dropping the last frame
  const nMels = filters.length
  const mel = new Float32Array(nMels * frames)
  const frame = new Float32Array(N)
  const power = new Float32Array(BINS)
  for (let t = 0; t < frames; t++) {
    for (let i = 0; i < N; i++) frame[i] = padded[t * HOP + i] * win[i]
    for (let k = 0; k < BINS; k++) {
      let re = 0
      let im = 0
      const o = k * N
      for (let i = 0; i < N; i++) {
        re += frame[i] * cos[o + i]
        im -= frame[i] * sin[o + i]
      }
      power[k] = re * re + im * im
    }
    for (let m = 0; m < nMels; m++) {
      const row = filters[m]
      let sum = 0
      for (let k = 0; k < BINS; k++) sum += row[k] * power[k]
      mel[m * frames + t] = Math.log10(Math.max(sum, 1e-10))
    }
  }
  let max = -Infinity
  for (let i = 0; i < mel.length; i++) if (mel[i] > max) max = mel[i]
  for (let i = 0; i < mel.length; i++) mel[i] = (Math.max(mel[i], max - 8) + 4) / 4
  return { mel, frames }
}

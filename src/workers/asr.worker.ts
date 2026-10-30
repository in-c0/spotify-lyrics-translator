/// <reference lib="webworker" />
// Local speech recognition worker for listen mode. Runs entirely in the browser.
//
//  - Qwen3-ASR-0.6B (Apache-2.0) on WebGPU via onnxruntime-web — best on singing.
//    Export: jiangzhuo9357/Qwen3-ASR-0.6B-ONNX (layout v2), pinned to one revision.
//  - Fallback without WebGPU: Whisper base via transformers.js (much smaller, less accurate).
//
// Model files are downloaded once and kept in Cache Storage. Audio never leaves the device.
import { logMel } from '@/lib/asr/mel'
import { decodeBpe, buildByteDecoder } from '@/lib/asr/bpe'

declare const self: DedicatedWorkerGlobalScope

const ORT_URL = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.1/dist/ort.webgpu.min.mjs'
const TRANSFORMERS_URL = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.2/dist/transformers.web.min.js'
const QWEN_BASE = 'https://huggingface.co/jiangzhuo9357/Qwen3-ASR-0.6B-ONNX/resolve/4a01b95fafe2c9e3af77e33c18bbb7de349c62f6'
const WHISPER_MODEL = 'onnx-community/whisper-base'
const CACHE = 'slt-asr-v1'
const D = 1024

export type EngineKind = 'qwen3-q4f16' | 'qwen3-q4' | 'whisper-base'

export type WorkerRequest =
  | { type: 'probe' }
  | { type: 'load'; engine: EngineKind; base?: string }
  | { type: 'transcribe'; id: number; audio: Float32Array; language?: string }

export type WorkerResponse =
  | { type: 'probe'; webgpu: boolean; f16: boolean }
  | { type: 'progress'; loaded: number; total: number; file: string }
  | { type: 'ready'; engine: EngineKind }
  | { type: 'result'; id: number; text: string; ms: number }
  | { type: 'error'; message: string }

const post = (msg: WorkerResponse) => self.postMessage(msg)

// ── Files: download once with progress, then serve from Cache Storage ──
const memoryFallback = new Map<string, Blob>() // used only when Cache Storage is unavailable

async function loadCached(url: string): Promise<Response> {
  const cache = await caches.open(CACHE).catch(() => null)
  const hit = cache ? await cache.match(url) : undefined
  if (hit) return hit
  const blob = memoryFallback.get(url)
  if (blob) return new Response(blob)
  throw new Error(`Missing model file ${url}`)
}

async function fetchFiles(base: string, files: { name: string; size: number }[]) {
  const total = files.reduce((n, f) => n + f.size, 0)
  let loaded = 0
  const cache = await caches.open(CACHE).catch(() => null)
  for (const { name, size } of files) {
    const url = `${base}/${name}`
    if (!(cache && (await cache.match(url)))) {
      const net = await fetch(url)
      if (!net.ok || !net.body) throw new Error(`Download failed for ${name} (${net.status})`)
      const reader = net.body.getReader()
      const chunks: Uint8Array[] = []
      let got = 0
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
        got += value.length
        post({ type: 'progress', loaded: loaded + got, total, file: name })
      }
      const blob = new Blob(chunks as BlobPart[]) // Blobs can live outside the JS heap
      chunks.length = 0
      const stored = cache ? await cache.put(url, new Response(blob)).then(() => true, () => false) : false
      if (!stored) memoryFallback.set(url, blob) // quota or no Cache Storage: keep for this session
    }
    loaded += size
    post({ type: 'progress', loaded, total, file: name })
  }
}

// ── fp16 helpers (q4f16 graphs use half-precision I/O) ──
const f32 = new Float32Array(1)
const u32 = new Uint32Array(f32.buffer)
function toHalf(v: number): number {
  f32[0] = v
  const x = u32[0]
  const sign = (x >>> 16) & 0x8000
  let exp = ((x >>> 23) & 0xff) - 127 + 15
  const mant = x & 0x7fffff
  if (exp >= 31) return sign | 0x7c00
  if (exp <= 0) {
    if (exp < -10) return sign
    const m = (mant | 0x800000) >> (1 - exp)
    return sign | ((m + 0x1000) >> 13)
  }
  return sign | (exp << 10) | ((mant + 0x1000) >> 13)
}
function fromHalf(h: number): number {
  const e = (h >> 10) & 0x1f
  const m = h & 0x3ff
  const s = h & 0x8000 ? -1 : 1
  if (e === 0) return s * m * 2 ** -24
  if (e === 31) return m ? NaN : s * Infinity
  return s * (1 + m / 1024) * 2 ** (e - 15)
}

// ── Qwen3-ASR engine ──
interface Qwen {
  ort: any
  half: boolean
  enc: any
  init: any
  step: any
  prompt: any
  languageIds: Record<string, number[]>
  filters: number[][]
  embed: Int8Array
  scales: Float32Array
  idToToken: string[]
  byteDecoder: Map<string, number>
}
let qwen: Qwen | null = null
let whisper: any = null

async function loadQwen(engine: 'qwen3-q4f16' | 'qwen3-q4', base: string) {
  const half = engine === 'qwen3-q4f16'
  const ort = await import(/* webpackIgnore: true */ ORT_URL as string)
  ort.env.wasm.wasmPaths = ORT_URL.replace(/[^/]+$/, '')
  const enc = half ? 'encoder.fp16.onnx' : 'encoder.onnx'
  const init = half ? 'decoder_init.q4f16.onnx' : 'decoder_init.int4.onnx'
  const step = half ? 'decoder_step.q4f16.onnx' : 'decoder_step.int4.onnx'
  const weights = half ? 'decoder_weights.q4f16.data' : 'decoder_weights.int4.data'
  // Download everything first (so progress covers the whole set), then build sessions one by one,
  // dropping each buffer as soon as onnxruntime has copied it, to keep peak memory down.
  const sizes: [string, number][] = [
    ['prompt_config.json', 2578],
    ['mel_filters.json', 132427],
    ['tokenizer.json', 11429377],
    ['embed_scales.f32.bin', 607744],
    ['embed_tokens.int8.bin', 155582464],
    [init, half ? 348427 : 353078],
    [step, half ? 350380 : 354803],
    [weights, half ? 344670208 : 382035968],
    [enc, half ? 376261247 : 745766355],
  ]
  await fetchFiles(base, sizes.map(([name, size]) => ({ name, size })))
  const read = async (name: string) => (await loadCached(`${base}/${name}`)).arrayBuffer()
  const json = async (name: string) => JSON.parse(new TextDecoder().decode(await read(name)))

  const config = await json('prompt_config.json')
  const tokenizer = await json('tokenizer.json')
  const idToToken: string[] = []
  for (const [t, i] of Object.entries(tokenizer.model.vocab)) idToToken[i as number] = t
  for (const a of tokenizer.added_tokens) idToToken[a.id] = a.content

  const options = { executionProviders: ['webgpu'], graphOptimizationLevel: 'all' }
  const kvOnGpu = { present_keys: 'gpu-buffer', present_values: 'gpu-buffer' }
  const encoder = await ort.InferenceSession.create(new Uint8Array(await read(enc)), options)
  let weightBytes: Uint8Array | null = new Uint8Array(await read(weights))
  const external = [{ path: weights, data: weightBytes }]
  const decoderInit = await ort.InferenceSession.create(new Uint8Array(await read(init)), { ...options, externalData: external, preferredOutputLocation: kvOnGpu })
  const decoderStep = await ort.InferenceSession.create(new Uint8Array(await read(step)), { ...options, externalData: external, preferredOutputLocation: kvOnGpu })
  weightBytes = null
  external.length = 0

  qwen = {
    ort,
    half,
    enc: encoder,
    init: decoderInit,
    step: decoderStep,
    prompt: config.prompt,
    languageIds: config.language_prefix_ids,
    filters: (await json('mel_filters.json')).data,
    embed: new Int8Array(await read('embed_tokens.int8.bin')),
    scales: new Float32Array(await read('embed_scales.f32.bin')),
    idToToken,
    byteDecoder: buildByteDecoder(),
  }
}

async function transcribeQwen(audio: Float32Array, language?: string): Promise<string> {
  const q = qwen!
  const { ort } = q
  const { mel, frames } = logMel(audio, q.filters)
  const { audio_features } = await q.enc.run({ mel: new ort.Tensor('float32', mel, [1, 128, frames]) })
  const A = audio_features.dims[1]
  const P = q.prompt
  const tail = [...P.suffix_ids, ...((language && q.languageIds[language]) || [])]
  const ids = [...P.prefix_ids, ...Array(A).fill(P.audio_pad_id), ...tail]

  const embeds = new Float32Array(ids.length * D)
  ids.forEach((id, i) => embedInto(q, embeds, i * D, id))
  embeds.set(audio_features.data as Float32Array, P.prefix_ids.length * D)
  audio_features.dispose?.()

  const floatTensor = (data: Float32Array, dims: number[]) =>
    q.half ? new ort.Tensor('float16', Uint16Array.from(data, toHalf), dims) : new ort.Tensor('float32', data, dims)
  const positions = BigInt64Array.from({ length: ids.length }, (_, i) => BigInt(i))
  let out = await q.init.run({ input_embeds: floatTensor(embeds, [1, ids.length, D]), position_ids: new ort.Tensor('int64', positions, [1, ids.length]) })

  const generated: number[] = []
  let position = ids.length
  for (let k = 0; k < P.max_new_tokens; k++) {
    const next = argmax(out.logits.data)
    if (P.eos_ids.includes(next)) break
    generated.push(next)
    const e = new Float32Array(D)
    embedInto(q, e, 0, next)
    const prev = out
    out = await q.step.run({
      input_embeds: floatTensor(e, [1, 1, D]),
      position_ids: new ort.Tensor('int64', BigInt64Array.of(BigInt(position++)), [1, 1]),
      past_keys: prev.present_keys,
      past_values: prev.present_values,
    })
    prev.present_keys.dispose?.()
    prev.present_values.dispose?.()
  }
  out.present_keys?.dispose?.()
  out.present_values?.dispose?.()
  const text = decodeBpe(generated.map(id => q.idToToken[id]), q.byteDecoder)
  return text.includes('<asr_text>') ? text.split('<asr_text>').pop()! : text
}

function embedInto(q: Qwen, dst: Float32Array, offset: number, id: number) {
  const s = q.scales[id]
  const row = id * D
  for (let j = 0; j < D; j++) dst[offset + j] = q.embed[row + j] * s
}

function argmax(data: ArrayLike<number>): number {
  const half = data instanceof Uint16Array // fp16 logits arrive as raw bits unless Float16Array exists
  let best = 0
  let bestValue = -Infinity
  for (let i = 0; i < data.length; i++) {
    const v = half ? fromHalf(data[i]) : data[i]
    if (v > bestValue) { bestValue = v; best = i }
  }
  return best
}

// ── Whisper fallback ──
async function loadWhisper() {
  const { pipeline, env } = await import(/* webpackIgnore: true */ TRANSFORMERS_URL as string)
  env.allowLocalModels = false
  whisper = await pipeline('automatic-speech-recognition', WHISPER_MODEL, {
    dtype: 'q8',
    device: 'wasm',
    progress_callback: (p: any) => {
      if (p.status === 'progress' && p.total) post({ type: 'progress', loaded: p.loaded, total: p.total, file: p.file })
    },
  })
}

const WHISPER_LANGUAGES: Record<string, string> = { ko: 'korean', ja: 'japanese', zh: 'chinese', en: 'english', es: 'spanish', ru: 'russian', pt: 'portuguese', fr: 'french', de: 'german' }

// ── Messages ──
let busy = Promise.resolve()
self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data
  busy = busy.then(async () => {
    try {
      if (msg.type === 'probe') {
        const gpu = (self.navigator as any).gpu
        const adapter = gpu ? await gpu.requestAdapter() : null
        post({ type: 'probe', webgpu: Boolean(adapter), f16: Boolean(adapter?.features?.has('shader-f16')) })
      } else if (msg.type === 'load') {
        if (msg.engine === 'whisper-base') await loadWhisper()
        else await loadQwen(msg.engine, msg.base || QWEN_BASE)
        post({ type: 'ready', engine: msg.engine })
      } else if (msg.type === 'transcribe') {
        const started = performance.now()
        let text = ''
        if (qwen) text = await transcribeQwen(msg.audio, msg.language)
        else if (whisper) {
          const language = msg.language && WHISPER_LANGUAGES[msg.language]
          text = (await whisper(msg.audio, { ...(language ? { language, task: 'transcribe' } : {}) })).text
        }
        post({ type: 'result', id: msg.id, text: text.trim(), ms: Math.round(performance.now() - started) })
      }
    } catch (e: any) {
      post({ type: 'error', message: e?.message || String(e) })
    }
  })
}

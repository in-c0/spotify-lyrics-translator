import { test } from 'node:test'
import assert from 'node:assert/strict'
import { alignTranscript, normalize } from '../src/lib/align.ts'
import { parseLrc } from '../src/lib/lrc.ts'

// Public-domain lyrics (Arirang), with a repeated refrain to exercise the position hint.
const lyrics = parseLrc([
  '[00:01.00]아리랑 아리랑 아라리요',
  '[00:05.50]아리랑 고개로 넘어간다',
  '[00:10.00]나를 버리고 가시는 님은',
  '[00:14.50]십 리도 못 가서 발병 난다',
  '[00:21.00]아리랑 아리랑 아라리요',
  '[00:25.50]아리랑 고개로 넘어간다',
  '[00:30.00]청천 하늘엔 잔별도 많고',
].join('\n'))

test('normalize strips punctuation and spacing across scripts', () => {
  assert.equal(normalize('Hello, World! 안녕 하세요… さくら'), 'helloworld안녕하세요さくら')
})

test('finds the last line heard, even with transcription errors', () => {
  const r = alignTranscript(lyrics, '나를 버리고 가시는 님은 십리도 못가서 발병난다')
  assert.equal(r?.lineIndex, 3)
  const noisy = alignTranscript(lyrics, '나를 버리구 가시는 니믄')
  assert.equal(noisy?.lineIndex, 2)
})

test('repeated refrains resolve toward the current position', () => {
  assert.equal(alignTranscript(lyrics, '아리랑 고개로 넘어간다', 1)?.lineIndex, 1)
  assert.equal(alignTranscript(lyrics, '아리랑 고개로 넘어간다', 5)?.lineIndex, 5)
})

test('unrelated audio does not match', () => {
  assert.equal(alignTranscript(lyrics, 'completely different words here'), null)
  assert.equal(alignTranscript(lyrics, '음'), null)
})

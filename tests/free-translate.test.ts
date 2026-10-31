import { test } from 'node:test'
import assert from 'node:assert/strict'
import { translateFree } from '../src/lib/freeTranslate.ts'

// Fake translator: upper-cases each line, but merges any line containing "§" with the next one,
// the way the real endpoint sometimes merges lines (which breaks the line count of a batch).
function installFake() {
  let calls = 0
  globalThis.fetch = (async (_url: string, init: any) => {
    calls++
    const q = new URLSearchParams(init.body).get('q')!
    const out = q.split('\n').map(l => l.toUpperCase()).join('\n').replace(/§\n/g, '§ ')
    return new Response(JSON.stringify([[[out, q]], null, 'es']), { status: 200 })
  }) as any
  return () => calls
}

test('translates a whole song in one request when lines line up', async () => {
  const calls = installFake()
  const lines = Array.from({ length: 70 }, (_, i) => `line ${i}`)
  const out = await translateFree(lines, 'auto', 'en')
  assert.equal(calls(), 1)
  assert.equal(out[69].translatedText, 'LINE 69')
  assert.equal(out[0].detectedSourceLanguage, 'es')
})

test('a merged line costs a few extra requests, not one per line', async () => {
  const calls = installFake()
  const lines = Array.from({ length: 70 }, (_, i) => (i === 40 ? 'odd line §' : `line ${i}`))
  const out = await translateFree(lines, 'auto', 'en')
  assert.ok(calls() <= 16, `used ${calls()} requests`)
  assert.equal(out[39].translatedText, 'LINE 39')
  assert.equal(out[41].translatedText, 'LINE 41')
  assert.ok(out[40].translatedText.startsWith('ODD LINE'))
})

test('blank lines are kept without a request', async () => {
  const calls = installFake()
  const out = await translateFree(['', '  ', 'hola'], 'auto', 'en')
  assert.equal(calls(), 1)
  assert.equal(out[0].translatedText, '')
  assert.equal(out[2].translatedText, 'HOLA')
})

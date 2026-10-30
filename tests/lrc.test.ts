import { test } from 'node:test'
import assert from 'node:assert/strict'
import { activeLineIndex, parseLrc } from '../src/lib/lrc.ts'

test('parses timestamps, skips metadata and sorts lines', () => {
  const lyrics = parseLrc(['[ar:Someone]', '[00:12.50] second', '[00:01.00]first', '[01:02.345] third', 'stray'].join('\n'))
  assert.deepEqual(lyrics.map(l => [l.original, l.startTimeMs]), [
    ['first', 1000],
    ['second', 12500],
    ['third', 62345],
  ])
  assert.equal(lyrics[0].endTimeMs, 12500)
})

test('expands lines that carry several timestamps', () => {
  const lyrics = parseLrc('[00:05.00][00:30.00] chorus\n[00:10.00] verse')
  assert.deepEqual(lyrics.map(l => l.startTimeMs), [5000, 10000, 30000])
  assert.equal(lyrics[2].original, 'chorus')
})

test('keeps empty lines (instrumental breaks)', () => {
  const lyrics = parseLrc('[00:01.00] a\n[00:02.00]\n[00:03.00] b')
  assert.equal(lyrics[1].original, '')
})

test('finds the active line', () => {
  const lyrics = parseLrc('[00:01.00] a\n[00:02.00] b\n[00:03.00] c')
  assert.equal(activeLineIndex(lyrics, 500), -1)
  assert.equal(activeLineIndex(lyrics, 2000), 1)
  assert.equal(activeLineIndex(lyrics, 99999), 2)
})

test('unsynced lyrics never highlight', () => {
  const lyrics = [{ original: 'x', romanized: '', translated: '', startTimeMs: -1, endTimeMs: -1 }]
  assert.equal(activeLineIndex(lyrics, 5000), -1)
})

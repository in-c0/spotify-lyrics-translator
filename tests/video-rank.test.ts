import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rank } from '../src/pages/api/video.ts'

const v = (id: string, title: string, channel: string, seconds: number) => ({ id, title, channel, seconds })

test('prefers the real recording over meme edits with a matching length', () => {
  const ranked = rank([
    v('meme', 'Ditto - New Jeans but it is playing in the auditorium of a school', 'Val', 193),
    v('lyrics', "NewJeans 'Ditto' Lyrics (Color Coded)", 'Jaeguchi', 187),
    v('audio', "NewJeans (뉴진스) 'Ditto' Official Audio", 'JXS_BP Official', 186),
    v('topic', 'Ditto', 'NewJeans - Topic', 186),
  ], 'Ditto', 'NewJeans', 194)
  assert.deepEqual(ranked.slice(0, 2).map(x => x.id).sort(), ['audio', 'topic'])
  assert.equal(ranked.at(-1)!.id === 'meme' || ranked.at(-2)!.id === 'meme', true)
})

test('keeps live versions when the song itself is a live version', () => {
  const ranked = rank([
    v('studio', 'Song Official Audio', 'Artist', 200),
    v('live', 'Song (Live) Official Audio', 'Artist', 240),
  ], 'Song (Live)', 'Artist', 240)
  assert.equal(ranked[0].id, 'live')
})

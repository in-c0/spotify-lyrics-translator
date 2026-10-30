import { test } from 'node:test'
import assert from 'node:assert/strict'
import { romanizableLanguage, romanizeLine } from '../src/lib/romanize.ts'

test('normalizes detected language codes', () => {
  assert.equal(romanizableLanguage('zh-CN'), 'zh')
  assert.equal(romanizableLanguage('ko'), 'ko')
  assert.equal(romanizableLanguage('en'), null)
  assert.equal(romanizableLanguage(undefined), null)
})

test('Korean: romanizes Hangul runs and keeps everything else', () => {
  assert.equal(romanizeLine('사랑해… ♡ baby', 'ko'), 'saranghae… ♡ baby')
})

test('Japanese: kana to romaji', () => {
  assert.equal(romanizeLine('さくら', 'ja'), 'sakura')
})

test('Chinese: pinyin with tone marks', () => {
  assert.equal(romanizeLine('你好', 'zh'), 'nǐ hǎo')
})

test('Russian: transliteration keeps case', () => {
  assert.equal(romanizeLine('Привет', 'ru'), 'Privet')
})

test('blank lines stay blank', () => {
  assert.equal(romanizeLine('   ', 'ko'), '')
})

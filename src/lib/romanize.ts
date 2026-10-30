// Romanization for sing-along: turns non-Latin lyrics into Latin script.
import { toRomaji } from 'wanakana'
import { romanize as romanizeHangul } from '@romanize/korean'
import { pinyin } from 'pinyin-pro'

export type RomanizableLanguage = 'ko' | 'ja' | 'zh' | 'ru'

/** Maps a detected language code (e.g. "zh-CN") to a language we can romanize, if any. */
export function romanizableLanguage(code: string | null | undefined): RomanizableLanguage | null {
  const base = (code || '').toLowerCase().split('-')[0]
  if (base === 'ko' || base === 'ja' || base === 'zh' || base === 'ru') return base
  return null
}

const HANGUL_RUN = /[ᄀ-ᇿ㄰-㆏가-힯]+/g
const HAN = /[㐀-鿿]/

const CYRILLIC: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
}

export function romanizeLine(text: string, language: RomanizableLanguage): string {
  if (!text.trim()) return ''
  switch (language) {
    case 'ko':
      // Romanize Hangul runs only, so punctuation, emoji and English words pass through.
      return text.replace(HANGUL_RUN, run => {
        try {
          return romanizeHangul(run)
        } catch {
          return run
        }
      })
    case 'ja':
      // Kana only; Kanji need a dictionary and are left as-is.
      return toRomaji(text)
    case 'zh':
      return HAN.test(text)
        ? pinyin(text, { toneType: 'symbol', nonZh: 'consecutive' }).replace(/\s+([，。！？、,.!?])/g, '$1').replace(/\s{2,}/g, ' ').trim()
        : text
    case 'ru':
      return Array.from(text, ch => {
        const lower = ch.toLowerCase()
        if (!(lower in CYRILLIC)) return ch
        const latin = CYRILLIC[lower]
        return ch === lower ? latin : latin.charAt(0).toUpperCase() + latin.slice(1)
      }).join('')
  }
}

/** True when the romanized text adds nothing (e.g. an English line in a K-pop song). */
export function isSameAsOriginal(original: string, other: string): boolean {
  return other.trim().toLowerCase() === original.trim().toLowerCase()
}

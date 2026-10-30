// Browser-side translation helper used by every view.
// Prefers the app's /api/translate route (which can use an official API key); when the page is
// served statically without that route, it calls the free translator directly.
import { translateFree, type Translation } from './freeTranslate'

export const TARGET_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'ko', name: '한국어' },
  { code: 'ja', name: '日本語' },
  { code: 'zh-CN', name: '中文' },
  { code: 'es', name: 'Español' },
  { code: 'pt', name: 'Português' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'id', name: 'Bahasa Indonesia' },
  { code: 'vi', name: 'Tiếng Việt' },
  { code: 'th', name: 'ไทย' },
  { code: 'ru', name: 'Русский' },
]

export const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', ko: 'Korean', ja: 'Japanese', zh: 'Chinese', es: 'Spanish', pt: 'Portuguese',
  fr: 'French', de: 'German', id: 'Indonesian', vi: 'Vietnamese', th: 'Thai', ru: 'Russian', it: 'Italian',
}

/** Detected source language = the most common one across lines (an English hook shouldn't win). */
function majorityLanguage(translations: Translation[]): string {
  const counts: Record<string, number> = {}
  for (const t of translations) {
    const code = t?.detectedSourceLanguage
    if (code && code !== 'auto') counts[code] = (counts[code] || 0) + 1
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || ''
}

export async function translateLines(lines: string[], target: string): Promise<{ lines: string[]; detected: string }> {
  let translations: Translation[] | null = null
  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: lines, sourceLang: 'auto', targetLang: target }),
    })
    if (response.ok) translations = (await response.json()).translations
  } catch {
    /* static hosting or offline server: fall through */
  }
  // The server route can be missing (static hosting) or rate-limited (shared cloud IPs get
  // throttled by the free translator), so translate straight from the browser instead.
  if (!translations) translations = await translateFree(lines, 'auto', target)
  return { lines: translations.map(t => t?.translatedText || ''), detected: majorityLanguage(translations) }
}

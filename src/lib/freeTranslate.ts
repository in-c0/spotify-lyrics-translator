// Free, key-less translation via Google's public web endpoint (the app's DEFAULT).
// Safe to call from the server route and directly from the browser (the endpoint allows CORS).
// Lines are joined with newlines and sent in a few chunked requests instead of one per line.
// Unofficial: fine for a hobby setup, not production scale.

export interface Translation {
  translatedText: string
  detectedSourceLanguage: string
}

const FREE_ENDPOINT = 'https://translate.googleapis.com/translate_a/single'
const MAX_CHUNK_CHARS = 4000

export async function translateFree(text: string[], sourceLang: string, targetLang: string): Promise<Translation[]> {
  const results: Translation[] = new Array(text.length)
  // Blank lines need no request.
  const work = text.map((_, i) => i).filter(i => {
    if (text[i].trim()) return true
    results[i] = { translatedText: text[i], detectedSourceLanguage: sourceLang }
    return false
  })
  const translateGroup = async (group: number[]): Promise<void> => {
    const { lines, detected } = await freeRequest(group.map(i => text[i]), sourceLang, targetLang)
    if (lines.length === group.length) {
      group.forEach((lineIndex, j) => { results[lineIndex] = { translatedText: lines[j], detectedSourceLanguage: detected } })
      return
    }
    // Line count drifted (the translator merged or split a line): retry in halves, not line by line.
    if (group.length === 1) {
      results[group[0]] = { translatedText: lines.join(' '), detectedSourceLanguage: detected }
      return
    }
    const mid = Math.ceil(group.length / 2)
    await translateGroup(group.slice(0, mid))
    await translateGroup(group.slice(mid))
  }
  for (const chunk of chunkLines(work.map(i => text[i]))) await translateGroup(chunk.map(k => work[k]))
  return results
}

/** Groups line indexes so that each newline-joined chunk stays under MAX_CHUNK_CHARS. */
export function chunkLines(text: string[], maxChars = MAX_CHUNK_CHARS): number[][] {
  const chunks: number[][] = []
  let current: number[] = []
  let size = 0
  text.forEach((line, i) => {
    if (current.length > 0 && size + line.length + 1 > maxChars) {
      chunks.push(current)
      current = []
      size = 0
    }
    current.push(i)
    size += line.length + 1
  })
  if (current.length > 0) chunks.push(current)
  return chunks
}

async function freeRequest(lines: string[], sourceLang: string, targetLang: string) {
  const params = new URLSearchParams({ client: 'gtx', sl: sourceLang, tl: targetLang, dt: 't' })
  const response = await fetch(`${FREE_ENDPOINT}?${params}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: new URLSearchParams({ q: lines.join('\n') }),
  })
  if (response.status === 429) throw new Error('The free translator is rate-limiting requests. Wait a minute and try again.')
  if (!response.ok) throw new Error(`Free translator responded with ${response.status}`)
  const data = await response.json()
  const joined: string = (data?.[0] || []).map((segment: any[]) => segment?.[0] || '').join('')
  return { lines: joined.split('\n'), detected: typeof data?.[2] === 'string' ? data[2] : sourceLang }
}

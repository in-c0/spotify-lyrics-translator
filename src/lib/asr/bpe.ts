// Byte-level BPE detokenizer (GPT-2 byte map), as used by Qwen tokenizers.
export function buildByteDecoder(): Map<string, number> {
  const bytes: number[] = []
  for (let b = 33; b <= 126; b++) bytes.push(b)
  for (let b = 161; b <= 172; b++) bytes.push(b)
  for (let b = 174; b <= 255; b++) bytes.push(b)
  const chars = [...bytes]
  let n = 0
  for (let b = 0; b < 256; b++) {
    if (!bytes.includes(b)) {
      bytes.push(b)
      chars.push(256 + n++)
    }
  }
  return new Map(chars.map((c, i) => [String.fromCodePoint(c), bytes[i]]))
}

export function decodeBpe(tokens: (string | undefined)[], byteDecoder: Map<string, number>): string {
  const out: number[] = []
  for (const token of tokens) {
    if (!token) continue
    if (token.startsWith('<') && token.endsWith('>') && token.length > 2 && !byteDecoder.has(token)) {
      // Special tokens such as <asr_text> are kept literally.
      out.push(...new TextEncoder().encode(token))
      continue
    }
    for (const ch of token) out.push(byteDecoder.get(ch) ?? 63)
  }
  return new TextDecoder().decode(Uint8Array.from(out))
}

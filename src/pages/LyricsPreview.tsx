// src/components/LyricsPreview.tsx

import React from 'react'

interface LyricsPreviewProps {
  fromLanguage: string
  rubyText: boolean
  hangulSystem: string
  japaneseTarget: string
  japaneseMode: string
  romajiSystem: string
  okuriganaDelimiter: string
}

const LyricsPreview: React.FC<LyricsPreviewProps> = ({
  fromLanguage,
  rubyText,
  hangulSystem,
  japaneseTarget,
  japaneseMode,
  romajiSystem,
  okuriganaDelimiter,
}) => {
  // Sample lyrics for preview
  const sampleLyrics = fromLanguage === 'ja'
    ? 'こんにちは世界' // "Hello World" in Japanese
    : fromLanguage === 'ko'
    ? '안녕하세요 세계' // "Hello World" in Korean
    : fromLanguage === 'zh'
    ? '你好，世界' // "Hello World" in Chinese
    : 'Hello World'

  // Apply transformations based on settings
  const transformedLyrics = () => {
    let lyrics = sampleLyrics

    if (fromLanguage === 'ja') {
      if (japaneseTarget === 'Romaji') {
        // Example: Convert to Romaji using a library like wanakana
        // For simplicity, we'll mock it
        lyrics = 'Konnichiwa Sekai'
      }
      // Additional transformations based on japaneseMode and okuriganaDelimiter can be added here
    } else if (fromLanguage === 'ko') {
      // Example: Convert to Revised Romanization
      // For simplicity, we'll mock it
      lyrics = 'Annyeonghaseyo Segye'
    } else if (fromLanguage === 'zh') {
      // Example: Convert to Pinyin
      // For simplicity, we'll mock it
      lyrics = 'Nǐ hǎo, shìjiè'
    }

    return lyrics
  }

  return (
    <div className="p-2 bg-gray-600 rounded">
      <p>{transformedLyrics()}</p>
    </div>
  )
}

export default LyricsPreview

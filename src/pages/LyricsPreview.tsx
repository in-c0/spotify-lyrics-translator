// components/LyricsPreview.tsx

import React from 'react'

interface LyricsPreviewProps {
  fromLanguage: string
  toLanguage: string
  rubyText: boolean
  hangulSystem: string
  japaneseTarget: string
  japaneseMode: string
  romajiSystem: string
  okuriganaDelimiter: string
}

const LyricsPreview: React.FC<LyricsPreviewProps> = ({
  fromLanguage,
  toLanguage,
  rubyText,
  hangulSystem,
  japaneseTarget,
  japaneseMode,
  romajiSystem,
  okuriganaDelimiter
}) => {
  // Sample lyric line
  const sampleLyrics = [
    {
      original: 'こんにちは',
      translated: 'Hello',
      startTimeMs: 0,
      endTimeMs: 1000,
    },
    {
      original: '世界',
      translated: 'World',
      startTimeMs: 1000,
      endTimeMs: 2000,
    },
  ]

  // Function to render ruby text if enabled
  const renderRuby = (text: string) => {
    // Placeholder: Implement actual ruby rendering based on settings
    return rubyText ? <ruby>{text}<rt>Sample</rt></ruby> : <span>{text}</span>
  }

  return (
    <div>
      {sampleLyrics.map((line, index) => (
        <div key={index} className="mb-2">
          <div>
            {renderRuby(line.original)}
          </div>
          {line.translated && (
            <div className="text-sm text-zinc-400">
              {line.translated}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default LyricsPreview

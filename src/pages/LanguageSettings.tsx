// components/LanguageSettings.tsx

import React from 'react'

interface LanguageSettingsProps {
  fromLanguage: string
  toLanguage: string
  setFromLanguage: React.Dispatch<React.SetStateAction<string>>
  setToLanguage: React.Dispatch<React.SetStateAction<string>>
  rubyText: boolean
  setRubyText: React.Dispatch<React.SetStateAction<boolean>>
  hangulSystem: string
  setHangulSystem: React.Dispatch<React.SetStateAction<string>>
  japaneseTarget: string
  setJapaneseTarget: React.Dispatch<React.SetStateAction<string>>
  japaneseMode: string
  setJapaneseMode: React.Dispatch<React.SetStateAction<string>>
  romajiSystem: string
  setRomajiSystem: React.Dispatch<React.SetStateAction<string>>
  okuriganaDelimiter: string
  setOkuriganaDelimiter: React.Dispatch<React.SetStateAction<string>>
  detectedLanguage: string // New prop
}

const LanguageSettings: React.FC<LanguageSettingsProps> = ({
  fromLanguage,
  toLanguage,
  setFromLanguage,
  setToLanguage,
  rubyText,
  setRubyText,
  hangulSystem,
  setHangulSystem,
  japaneseTarget,
  setJapaneseTarget,
  japaneseMode,
  setJapaneseMode,
  romajiSystem,
  setRomajiSystem,
  okuriganaDelimiter,
  setOkuriganaDelimiter,
  detectedLanguage, // New prop
}) => {
  // Function to get display name for "Auto" based on detectedLanguage
  const getAutoDisplay = () => {
    if (detectedLanguage === 'Japanese') {
      return 'Auto (Japanese)'
    } else if (detectedLanguage === 'Korean') {
      return 'Auto (Korean)'
    } else {
      return 'Auto'
    }
  }

  return (
    <div className="flex flex-col space-y-4">
      {/* From Language Selection */}
      <div className="flex items-center">
        <label htmlFor="fromLanguage" className="mr-2 text-sm text-zinc-400">From:</label>
        <select
          id="fromLanguage"
          value={fromLanguage}
          onChange={(e) => setFromLanguage(e.target.value)}
          className="bg-zinc-700 text-white rounded px-2 py-1"
        >
          <option value="auto">{getAutoDisplay()}</option>
          <option value="ja">Japanese</option>
          <option value="ko">Korean</option>
          {/* Add more language options as needed */}
        </select>
      </div>
    
      {/* To Language Selection */}
      <div className="flex items-center">
        <label htmlFor="toLanguage" className="mr-2 text-sm text-zinc-400">To:</label>
        <select
          id="toLanguage"
          value={toLanguage}
          onChange={(e) => setToLanguage(e.target.value)}
          className="bg-zinc-700 text-white rounded px-2 py-1"
        >
          <option value="en">English</option>
          <option value="es">Spanish</option>
          {/* Add more target language options as needed */}
        </select>
      </div>
    
      {/* Ruby Text Toggle */}
      <div className="flex items-center">
        <label htmlFor="rubyText" className="mr-2 text-sm text-zinc-400">Ruby Text:</label>
        <input
          id="rubyText"
          type="checkbox"
          checked={rubyText}
          onChange={(e) => setRubyText(e.target.checked)}
          className="h-4 w-4 text-green-600 border-zinc-500 rounded"
        />
      </div>
    
      {/* Hangul System Selection */}
      {fromLanguage === 'ko' && (
        <div className="flex items-center">
          <label htmlFor="hangulSystem" className="mr-2 text-sm text-zinc-400">Hangul System:</label>
          <select
            id="hangulSystem"
            value={hangulSystem}
            onChange={(e) => setHangulSystem(e.target.value)}
            className="bg-zinc-700 text-white rounded px-2 py-1"
          >
            <option value="Revised">Revised</option>
            <option value="McCune-Reischauer">McCune-Reischauer</option>
            {/* Add more Hangul systems if needed */}
          </select>
        </div>
      )}
    
      {/* Japanese Target Selection */}
      {fromLanguage === 'ja' && (
        <div className="flex items-center">
          <label htmlFor="japaneseTarget" className="mr-2 text-sm text-zinc-400">Japanese Target:</label>
          <select
            id="japaneseTarget"
            value={japaneseTarget}
            onChange={(e) => setJapaneseTarget(e.target.value)}
            className="bg-zinc-700 text-white rounded px-2 py-1"
          >
            <option value="Romaji">Romaji</option>
            <option value="Hepburn">Hepburn</option>
            {/* Add more options if needed */}
          </select>
        </div>
      )}
    
      {/* Japanese Mode Selection */}
      {fromLanguage === 'ja' && (
        <div className="flex items-center">
          <label htmlFor="japaneseMode" className="mr-2 text-sm text-zinc-400">Japanese Mode:</label>
          <select
            id="japaneseMode"
            value={japaneseMode}
            onChange={(e) => setJapaneseMode(e.target.value)}
            className="bg-zinc-700 text-white rounded px-2 py-1"
          >
            <option value="Normal">Normal</option>
            <option value="Advanced">Advanced</option>
            {/* Add more modes if needed */}
          </select>
        </div>
      )}
    
      {/* Romaji System Selection */}
      {fromLanguage === 'ja' && japaneseTarget === 'Romaji' && (
        <div className="flex items-center">
          <label htmlFor="romajiSystem" className="mr-2 text-sm text-zinc-400">Romaji System:</label>
          <select
            id="romajiSystem"
            value={romajiSystem}
            onChange={(e) => setRomajiSystem(e.target.value)}
            className="bg-zinc-700 text-white rounded px-2 py-1"
          >
            <option value="Hepburn">Hepburn</option>
            <option value="Kunrei">Kunrei</option>
            {/* Add more systems if needed */}
          </select>
        </div>
      )}
    
      {/* Okurigana Delimiter Selection */}
      {fromLanguage === 'ja' && (
        <div className="flex items-center">
          <label htmlFor="okuriganaDelimiter" className="mr-2 text-sm text-zinc-400">Okurigana Delimiter:</label>
          <select
            id="okuriganaDelimiter"
            value={okuriganaDelimiter}
            onChange={(e) => setOkuriganaDelimiter(e.target.value)}
            className="bg-zinc-700 text-white rounded px-2 py-1"
          >
            <option value="( )">( )</option>
            <option value="[ ]">[ ]</option>
            <option value="{ }">{'{}'}</option>
            {/* Add more delimiters if needed */}
          </select>
        </div>
      )}
    </div>
  )
}
export default LanguageSettings

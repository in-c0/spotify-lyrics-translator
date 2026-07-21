// src/components/LanguageSelector.tsx

import React from 'react'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { ArrowRight } from 'lucide-react'

interface Language {
  code: string
  name: string
}

interface LanguageSelectorProps {
  fromLanguage: string
  toLanguage: string
  setFromLanguage: React.Dispatch<React.SetStateAction<string>>
  setToLanguage: React.Dispatch<React.SetStateAction<string>>
  languages: Language[]
  resetJapaneseSettings: () => void
  resetKoreanSettings: () => void
  resetChineseSettings: () => void
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  fromLanguage,
  toLanguage,
  setFromLanguage,
  setToLanguage,
  languages,
  resetJapaneseSettings,
  resetKoreanSettings,
  resetChineseSettings,
}) => {
  return (
    <div className="flex items-center space-x-2 mb-4 bg-gray-700/50 p-2 rounded-lg">
      {/* From Language Dropdown */}
      <div className="flex-1">
        <Select
          value={fromLanguage}
          onValueChange={(value) => {
            setFromLanguage(value)
            // Reset other settings when language changes
            if (value === 'ja') {
              resetJapaneseSettings()
            } else if (value === 'ko') {
              resetKoreanSettings()
            } else if (value === 'zh') {
              resetChineseSettings()
            }
          }}
        >
          <SelectTrigger className="w-full bg-transparent border-none focus:ring-0">
            <SelectValue placeholder="From" />
          </SelectTrigger>
          <SelectContent className="bg-gray-700 text-white">
            {languages.map((lang) => (
              <SelectItem key={lang.code} value={lang.code}>
                {lang.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Arrow Icon */}
      <div className="text-gray-400">
        <ArrowRight className="h-6 w-6" />
      </div>

      {/* To Language Dropdown */}
      <div className="flex-1">
        <Select value={toLanguage} onValueChange={setToLanguage}>
          <SelectTrigger className="w-full bg-transparent border-none focus:ring-0">
            <SelectValue placeholder="To" />
          </SelectTrigger>
          <SelectContent className="bg-gray-700 text-white">
            {languages.filter(lang => lang.code !== 'auto').map((lang) => (
              <SelectItem key={lang.code} value={lang.code}>
                {lang.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

export default LanguageSelector
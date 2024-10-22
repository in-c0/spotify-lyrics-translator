// src/components/SettingsSheet.tsx

import React from 'react'
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Settings } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import LyricsPreview from './LyricsPreview'

interface SettingsSheetProps {
  isSettingsOpen: boolean
  setIsSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>
  // Language-specific settings and setters
  fromLanguage: string
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
}

const SettingsSheet: React.FC<SettingsSheetProps> = ({
  isSettingsOpen,
  setIsSettingsOpen,
  fromLanguage,
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
}) => {
  return (
    <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
          <span className="sr-only">Open settings</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="bg-gray-800 text-white overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-white">Language Settings</SheetTitle>
          <SheetDescription className="text-gray-400">
            Customize your translation and romanization settings.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <Tabs defaultValue={fromLanguage} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="ja">Japanese</TabsTrigger>
              <TabsTrigger value="ko">Korean</TabsTrigger>
              <TabsTrigger value="zh">Chinese</TabsTrigger>
            </TabsList>
            {/* Japanese Settings */}
            <TabsContent value="ja" className="mt-4 space-y-4">
              {/* Ruby Text Toggle */}
              <div className="flex items-center justify-between">
                <Label htmlFor="japaneseRubyText" className="text-white">Ruby Text</Label>
                <Switch
                  id="japaneseRubyText"
                  checked={rubyText}
                  onCheckedChange={setRubyText}
                />
              </div>
              {/* Japanese Target Radio Group */}
              <div className="space-y-2">
                <Label className="text-white">Japanese Target</Label>
                <RadioGroup value={japaneseTarget} onValueChange={setJapaneseTarget} className="space-y-1">
                  {['Romaji', 'Hiragana', 'Katakana'].map((value) => (
                    <div key={value} className="flex items-center space-x-2">
                      <RadioGroupItem value={value} id={value.toLowerCase()} className="border-2 border-gray-600 text-white focus:border-green-500" />
                      <Label htmlFor={value.toLowerCase()} className="text-white">{value}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
              {/* Japanese Mode Radio Group */}
              <div className="space-y-2">
                <Label className="text-white">Japanese Mode</Label>
                <RadioGroup value={japaneseMode} onValueChange={setJapaneseMode} className="space-y-1">
                  {['Normal', 'Spaced', 'Okurigana', 'Furigana'].map((value) => (
                    <div key={value} className="flex items-center space-x-2">
                      <RadioGroupItem value={value} id={value.toLowerCase()} className="border-2 border-gray-600 text-white focus:border-green-500" />
                      <Label htmlFor={value.toLowerCase()} className="text-white">{value}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
              {/* Romaji System Radio Group */}
              <div className="space-y-2">
                <Label className="text-white">Romaji System</Label>
                <RadioGroup value={romajiSystem} onValueChange={setRomajiSystem} className="space-y-1">
                  {['Hepburn', 'Nippon', 'Passport'].map((value) => (
                    <div key={value} className="flex items-center space-x-2">
                      <RadioGroupItem value={value} id={value.toLowerCase()} className="border-2 border-gray-600 text-white focus:border-green-500" />
                      <Label htmlFor={value.toLowerCase()} className="text-white">{value}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
              {/* Okurigana Delimiter Select */}
              <div className="space-y-2">
                <Label htmlFor="okuriganaDelimiter" className="text-white">Okurigana Delimiter</Label>
                <Select value={okuriganaDelimiter} onValueChange={setOkuriganaDelimiter}>
                  <SelectTrigger id="okuriganaDelimiter" className="bg-gray-700 text-white">
                    <SelectValue placeholder="Select delimiter" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 text-white">
                    <SelectItem value="( )">( )</SelectItem>
                    <SelectItem value="[ ]">[ ]</SelectItem>
                    <SelectItem value="{ }">{'{ }'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
            {/* Korean Settings */}
            <TabsContent value="ko" className="mt-4 space-y-4">
              {/* Ruby Text Toggle */}
              <div className="flex items-center justify-between">
                <Label htmlFor="koreanRubyText" className="text-white">Ruby Text</Label>
                <Switch
                  id="koreanRubyText"
                  checked={rubyText}
                  onCheckedChange={setRubyText}
                />
              </div>
              {/* Hangul System Radio Group */}
              <div className="space-y-2">
                <Label className="text-white">Hangul System</Label>
                <RadioGroup value={hangulSystem} onValueChange={setHangulSystem} className="space-y-1">
                  {['Revised', 'McCune', 'Yale'].map((value) => (
                    <div key={value} className="flex items-center space-x-2">
                      <RadioGroupItem value={value} id={value.toLowerCase()} className="border-2 border-gray-600 text-white focus:border-green-500" />
                      <Label htmlFor={value.toLowerCase()} className="text-white">{value}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </TabsContent>
            {/* Chinese Settings */}
            <TabsContent value="zh" className="mt-4 space-y-4">
              {/* Ruby Text Toggle */}
              <div className="flex items-center justify-between">
                <Label htmlFor="chineseRubyText" className="text-white">Ruby Text (Pinyin)</Label>
                <Switch
                  id="chineseRubyText"
                  checked={rubyText}
                  onCheckedChange={setRubyText}
                />
              </div>
            </TabsContent>
          </Tabs>
          {/* Lyrics Preview */}
          <div className="mt-4 p-4 bg-gray-700 rounded-md">
            <h3 className="text-lg font-semibold mb-2">Preview</h3>
            <div className="text-gray-300 text-sm">
              <LyricsPreview
                fromLanguage={fromLanguage}
                rubyText={rubyText}
                hangulSystem={hangulSystem}
                japaneseTarget={japaneseTarget}
                japaneseMode={japaneseMode}
                romajiSystem={romajiSystem}
                okuriganaDelimiter={okuriganaDelimiter}
              />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default SettingsSheet

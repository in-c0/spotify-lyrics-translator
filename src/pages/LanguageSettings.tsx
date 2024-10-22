// components/LanguageSettings.tsx

import React from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Settings } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

interface LanguageSettingsProps {
  fromLanguage: string
  rubyText: boolean
  setRubyText: (value: boolean) => void
  hangulSystem: string
  setHangulSystem: (value: string) => void
  japaneseTarget: string
  setJapaneseTarget: (value: string) => void
  japaneseMode: string
  setJapaneseMode: (value: string) => void
  romajiSystem: string
  setRomajiSystem: (value: string) => void
  okuriganaDelimiter: string
  setOkuriganaDelimiter: (value: string) => void
  isSettingsOpen: boolean
  setIsSettingsOpen: (value: boolean) => void
}

export default function LanguageSettings({
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
  isSettingsOpen,
  setIsSettingsOpen,
}: LanguageSettingsProps) {
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
            <TabsContent value="ja" className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="japaneseRubyText" className="text-white">Ruby Text</Label>
                <Switch
                  id="japaneseRubyText"
                  checked={rubyText}
                  onCheckedChange={setRubyText}
                />
              </div>
              {/* Additional Japanese settings */}
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
            </TabsContent>
            <TabsContent value="ko" className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="koreanRubyText" className="text-white">Ruby Text</Label>
                <Switch
                  id="koreanRubyText"
                  checked={rubyText}
                  onCheckedChange={setRubyText}
                />
              </div>
              {/* Additional Korean settings */}
            </TabsContent>
            <TabsContent value="zh" className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="chineseRubyText" className="text-white">Ruby Text (Pinyin)</Label>
                <Switch
                  id="chineseRubyText"
                  checked={rubyText}
                  onCheckedChange={setRubyText}
                />
              </div>
              {/* Additional Chinese settings */}
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  )
}

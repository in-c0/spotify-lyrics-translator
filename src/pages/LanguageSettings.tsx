import React from 'react'
import { ArrowRight, Settings } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import LyricsPreview from './LyricsPreview'

const languages = [
  { code: 'auto', name: '🌐 Auto Detect' },
  { code: 'en', name: '🇬🇧 English' },
  { code: 'es', name: '🇪🇸 Spanish' },
  { code: 'fr', name: '🇫🇷 French' },
  { code: 'de', name: '🇩🇪 German' },
  { code: 'ja', name: '🇯🇵 Japanese' },
  { code: 'ko', name: '🇰🇷 Korean' },
  { code: 'zh', name: '🇨🇳 Chinese' },
]

interface LanguageSettingsProps {
  fromLanguage: string;
  toLanguage: string;
  setFromLanguage: React.Dispatch<React.SetStateAction<string>>;
  setToLanguage: React.Dispatch<React.SetStateAction<string>>;
  rubyText: boolean;
  setRubyText: React.Dispatch<React.SetStateAction<boolean>>;
  hangulSystem: string;
  setHangulSystem: React.Dispatch<React.SetStateAction<string>>;
  japaneseTarget: string;
  setJapaneseTarget: React.Dispatch<React.SetStateAction<string>>;
  japaneseMode: string;
  setJapaneseMode: React.Dispatch<React.SetStateAction<string>>;
  romajiSystem: string;
  setRomajiSystem: React.Dispatch<React.SetStateAction<string>>;
  okuriganaDelimiter: string;
  setOkuriganaDelimiter: React.Dispatch<React.SetStateAction<string>>;
}

export default function LanguageSettings({
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
  setOkuriganaDelimiter
}: LanguageSettingsProps) {
  return (
    <div>
      <div className="flex items-center space-x-2 mb-4 bg-zinc-700/50 p-2 rounded-lg">
        <div className="flex-1">
          <Select value={fromLanguage} onValueChange={setFromLanguage}>
            <SelectTrigger className="w-full bg-transparent border-none focus:ring-0">
              <SelectValue placeholder="From" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-700 text-white">
              {languages.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="text-zinc-400">
          <ArrowRight className="h-6 w-6"/>
        </div>
        <div className="flex-1">
          <Select value={toLanguage} onValueChange={setToLanguage}>
            <SelectTrigger className="w-full bg-transparent border-none focus:ring-0">
              <SelectValue placeholder="To" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-700 text-white">
              {languages.filter(lang => lang.code !== 'auto').map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
            <span className="sr-only">Open settings</span>
          </Button>
        </SheetTrigger>
        <SheetContent className="bg-zinc-800 text-white overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-white">Language Settings</SheetTitle>
            <SheetDescription className="text-zinc-400">
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
                <div className="space-y-2">
                  <Label className="text-white">Japanese Target</Label>
                  <RadioGroup value={japaneseTarget} onValueChange={setJapaneseTarget} className="space-y-1">
                    {['Romaji', 'Hiragana', 'Katakana'].map((value) => (
                      <div key={value} className="flex items-center space-x-2">
                        <RadioGroupItem value={value} id={value.toLowerCase()} className="border-2 border-zinc-600 text-white focus:border-green-500" />
                        <Label htmlFor={value.toLowerCase()} className="text-white">{value}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Japanese Mode</Label>
                  <RadioGroup value={japaneseMode} onValueChange={setJapaneseMode} className="space-y-1">
                    {['Normal', 'Spaced', 'Okurigana', 'Furigana'].map((value) => (
                      <div key={value} className="flex items-center space-x-2">
                        <RadioGroupItem value={value} id={value.toLowerCase()} className="border-2 border-zinc-600 text-white focus:border-green-500" />
                        <Label htmlFor={value.toLowerCase()} className="text-white">{value}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Romaji System</Label>
                  <RadioGroup value={romajiSystem} onValueChange={setRomajiSystem} className="space-y-1">
                    {['Hepburn', 'Nippon', 'Passport'].map((value) => (
                      <div key={value} className="flex items-center space-x-2">
                        <RadioGroupItem value={value} id={value.toLowerCase()} className="border-2 border-zinc-600 text-white focus:border-green-500" />
                        <Label htmlFor={value.toLowerCase()} className="text-white">{value}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="okuriganaDelimiter" className="text-white">Okurigana Delimiter</Label>
                  <Select value={okuriganaDelimiter} onValueChange={setOkuriganaDelimiter}>
                    <SelectTrigger id="okuriganaDelimiter" className="bg-zinc-700 text-white">
                      <SelectValue placeholder="Select delimiter" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-700 text-white">
                      <SelectItem value="( )">( )</SelectItem>
                      <SelectItem value="[ ]">[ ]</SelectItem>
                      <SelectItem value="{ }">{ '{' } { '}' }</SelectItem>
                    </SelectContent>
                  </Select>
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
                <div className="space-y-2">
                  <Label className="text-white">Hangul System</Label>
                  <RadioGroup value={hangulSystem} onValueChange={setHangulSystem} className="space-y-1">
                    {['Revised', 'McCune', 'Yale'].map((value) => (
                      <div key={value} className="flex items-center space-x-2">
                        <RadioGroupItem value={value} id={value.toLowerCase()} className="border-2 border-zinc-600 text-white focus:border-green-500" />
                        <Label htmlFor={value.toLowerCase()} className="text-white">{value}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
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
              </TabsContent>
            </Tabs>
            <div className="mt-4 p-4 bg-zinc-700 rounded-md">
              <h3 className="text-lg font-semibold mb-2">Preview</h3>
              <div className="text-zinc-300 text-sm">
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
    </div>
  )
}
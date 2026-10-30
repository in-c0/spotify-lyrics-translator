// Public-domain folk songs used by the key-free demo (/demo).
// Lyrics are traditional (19th century or older); timings and English translations are our own.
import { parseLrc, type Lyric } from './lrc'

export interface DemoSong {
  id: string
  title: string
  artist: string
  language: 'ko' | 'ja' | 'zh' | 'ru'
  /** Two colours for the generated "album art" gradient. */
  colors: [string, string]
  durationMs: number
  lyrics: Lyric[]
}

function song(
  id: string,
  title: string,
  artist: string,
  language: DemoSong['language'],
  colors: [string, string],
  lines: [string, string, string][] // [timestamp, original, English]
): DemoSong {
  const lyrics = parseLrc(lines.map(([t, text]) => `[${t}]${text}`).join('\n'))
  lyrics.forEach((line, i) => { line.translated = lines[i][2] })
  const last = lyrics[lyrics.length - 1]
  return { id, title, artist, language, colors, durationMs: last.startTimeMs + 6000, lyrics }
}

export const DEMO_SONGS: DemoSong[] = [
  song('arirang', '아리랑 (Arirang)', 'Korean folk song', 'ko', ['#1e3a8a', '#be123c'], [
    ['00:01.00', '아리랑 아리랑 아라리요', 'Arirang, arirang, arariyo'],
    ['00:05.50', '아리랑 고개로 넘어간다', 'Crossing over the Arirang pass'],
    ['00:10.00', '나를 버리고 가시는 님은', 'My love, who leaves me behind,'],
    ['00:14.50', '십 리도 못 가서 발병 난다', 'will get sore feet before ten li'],
    ['00:19.00', '', ''],
    ['00:21.00', '아리랑 아리랑 아라리요', 'Arirang, arirang, arariyo'],
    ['00:25.50', '아리랑 고개로 넘어간다', 'Crossing over the Arirang pass'],
    ['00:30.00', '청천 하늘엔 잔별도 많고', 'The clear sky is full of little stars'],
    ['00:34.50', '우리네 가슴엔 수심도 많다', 'and our hearts are full of sorrows'],
  ]),
  song('sakura', 'さくら さくら (Sakura Sakura)', 'Japanese folk song', 'ja', ['#9d174d', '#f9a8d4'], [
    ['00:01.00', 'さくら さくら', 'Cherry blossoms, cherry blossoms'],
    ['00:05.00', 'やよいの そらは', 'across the spring sky'],
    ['00:09.00', 'みわたす かぎり', 'as far as the eye can see'],
    ['00:13.00', 'かすみか くもか', 'is it mist, or clouds?'],
    ['00:17.00', 'においぞ いずる', 'their fragrance drifts out'],
    ['00:21.00', 'いざや いざや', 'come now, come now'],
    ['00:25.00', 'みに ゆかん', "let's go and see them"],
  ]),
  song('molihua', '茉莉花 (Mo Li Hua)', 'Chinese folk song', 'zh', ['#14532d', '#fde68a'], [
    ['00:01.00', '好一朵美丽的茉莉花', 'What a beautiful jasmine flower'],
    ['00:06.00', '好一朵美丽的茉莉花', 'What a beautiful jasmine flower'],
    ['00:11.00', '芬芳美丽满枝桠', 'Fragrant and lovely, filling the branches'],
    ['00:15.50', '又香又白人人夸', 'Sweet and white, praised by everyone'],
    ['00:20.00', '让我来将你摘下', 'Let me pick you'],
    ['00:24.00', '送给别人家', 'and give you to someone dear'],
    ['00:28.00', '茉莉花呀茉莉花', 'Oh jasmine, jasmine flower'],
  ]),
  song('kalinka', 'Калинка (Kalinka)', 'Russian folk song (1860)', 'ru', ['#7f1d1d', '#f59e0b'], [
    ['00:01.00', 'Калинка, калинка, калинка моя!', 'Little snowball berry, my little berry!'],
    ['00:05.00', 'В саду ягода малинка, малинка моя!', 'In the garden, a raspberry, my little raspberry!'],
    ['00:09.50', 'Ах, под сосною под зелёною', 'Ah, under the green pine tree'],
    ['00:14.00', 'Спать положите вы меня', 'lay me down to sleep'],
  ]),
]

// src/utils/languageUtils.ts

export const languageCodeToName = (code: string): string => {
    const languageMap: { [key: string]: string } = {
      'auto': 'Auto',
      'ja': 'Japanese',
      'ko': 'Korean',
      'zh': 'Chinese',
      'en': 'English',
      'es': 'Spanish',
      // Add more languages as needed
    }
  
    return languageMap[code] || code
  }
  
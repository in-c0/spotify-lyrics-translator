// declarations.d.ts

declare module '@romanize/korean' {
    export function romanize(text: string, options?: { system: string }): string
  }

declare module '@iamtraction/google-translate' {
  interface TranslateOptions {
    from?: string
    to?: string
    raw?: boolean
  }
  interface TranslateResult {
    text: string
    from: {
      language: { didYouMean: boolean; iso: string }
      text: { autoCorrected: boolean; value: string; didYouMean: boolean }
    }
    raw: string
  }
  export default function translate(
    text: string,
    options?: TranslateOptions
  ): Promise<TranslateResult>
}
  
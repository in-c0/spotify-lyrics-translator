// pages/_app.tsx

import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { SessionProvider } from '@/components/SessionProvider' // Adjust the import path as needed

export default function App({ Component, pageProps }: AppProps) {
  return (
    <SessionProvider>
      <Component {...pageProps} />
    </SessionProvider>
  )
}

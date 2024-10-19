import React from 'react'
import type { AppProps } from 'next/app'
import { SessionProvider } from 'src/components/SessionProvider'
import '../styles/globals.css'

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <SessionProvider>
      <Component {...pageProps} />
    </SessionProvider>
  )
}

export default MyApp
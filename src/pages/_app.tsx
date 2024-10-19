// pages/_app.tsx
import { AppProps } from 'next/app'
import SessionProvider from '../components/SessionProvider'
import '../styles/globals.css'

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <SessionProvider>
      <Component {...pageProps} />
    </SessionProvider>
  )
}

export default MyApp

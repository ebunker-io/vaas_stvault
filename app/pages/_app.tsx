import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { theme } from '../themes/default'
import { MnemonicProvider } from '../providers/mnemonic'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import ModalProvider from 'mui-modal-provider'
import '../locales/i18n'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { AuthProvider } from '../providers/auth'
import useInterval from '../hooks'
import Script from 'next/script'
import { config, defaultConfig, hoodiConfig } from '../providers/wagmi'
import { lightTheme, RainbowKitProvider } from '@rainbow-me/rainbowkit'
import '@rainbow-me/rainbowkit/styles.css'
import { ENV } from '../config'

const queryClient = new QueryClient()

export default function App({ Component, pageProps }: AppProps) {
  useInterval(
    () => {
      if (document) {
        document?.getElementById('__NEXT_DATA__')?.remove()
      }
    },
    2000,
    true
  )
  const { i18n } = useTranslation()
  useEffect(() => {
    switch (localStorage.getItem('i18nextLng')) {
      case 'en-US':
        localStorage.setItem('i18nextLng', 'en')
        i18n.changeLanguage('en')
        break
      case 'zh-CN':
        localStorage.setItem('i18nextLng', 'zh')
        i18n.changeLanguage('zh')
        break
      case 'en':
        break
      case 'zh':
        break

      default:
        localStorage.setItem('i18nextLng', 'en')
        i18n.changeLanguage('en')
        break
    }
  }, [])
  return (
    <>
      <Script strategy='afterInteractive' src={`https://www.googletagmanager.com/gtag/js?id=G-JNPN3PJ4V7`} />
      <Script
        id='g-analysis'
        strategy='afterInteractive'
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-JNPN3PJ4V7', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
      <WagmiProvider config={Number(ENV.chains[0].id) === 9999 ? defaultConfig : Number(ENV.chains[0].id) === 560048 ? hoodiConfig : config }>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider theme={lightTheme()} modalSize='compact' >
            <ThemeProvider theme={theme}>
              <ToastContainer
                position='top-right'
                hideProgressBar={true}
                newestOnTop={false}
                pauseOnFocusLoss
                pauseOnHover
                theme={'dark'}
                closeButton={false}
                closeOnClick={true}
                autoClose={2000}
              />
              <CssBaseline />
              <AuthProvider>
                <MnemonicProvider>
                  <ModalProvider>
                    <Component {...pageProps} />
                  </ModalProvider>
                </MnemonicProvider>
              </AuthProvider>
            </ThemeProvider>
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </>
  )
}

import { Html, Head, Main, NextScript } from 'next/document'
import { GoogleAnalytics } from '@next/third-parties/google'

export default function Document() {
  return (
    <Html>
      <link rel='preconnect' href='https://fonts.googleapis.com' />
      <link rel='preconnect' href='https://fonts.gstatic.com' crossOrigin={'true'} />
      <link href='https://fonts.googleapis.com/css2?family=Poppins:wght@300;400&display=swap' rel='stylesheet' />
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
      <GoogleAnalytics gaId='G-JNPN3PJ4V7' />
    </Html>
  )
}

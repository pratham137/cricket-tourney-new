import type { AppProps } from 'next/app'
import Head from 'next/head'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Cricket Tournament</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600&display=swap');
          *{box-sizing:border-box;margin:0;padding:0}
          body{font-family:'DM Sans',sans-serif;background:#070d0a;color:#f0f4f2;min-height:100vh}
          a{text-decoration:none;color:inherit}
          input,select,textarea{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:8px;color:#f0f4f2;padding:8px 12px;font-size:14px;width:100%;outline:none;font-family:inherit}
          input:focus,select:focus{border-color:#1D9E75}
          input::placeholder{color:rgba(255,255,255,0.3)}
          select option{background:#0f1a15}
          ::-webkit-scrollbar{width:4px}
          ::-webkit-scrollbar-track{background:#070d0a}
          ::-webkit-scrollbar-thumb{background:#1D9E75;border-radius:2px}
        `}</style>
      </Head>
      <Component {...pageProps} />
    </>
  )
}

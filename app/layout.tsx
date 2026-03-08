import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import { SpeedInsights } from '@vercel/speed-insights/next'

import { AuthProvider } from '@/contexts/AuthContext'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

/* ================= VIEWPORT ================= */

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

/* ================= META ================= */

export const metadata: Metadata = {
  metadataBase: new URL('https://eleman-shoes.com'),

  title: {
    default: 'Eleman Shoes | Chaussures en cuir premium',
    template: '%s | Eleman Shoes',
  },

  description:
    "Eleman Shoes – chaussures en cuir premium en Algérie. Vente en gros et détail. Qualité, élégance et livraison rapide.",

  keywords: [
    'chaussures cuir',
    'grossiste chaussures',
    'Eleman Shoes',
    'Edo’s Footwear',
    'chaussures Algérie',
    'vente chaussures',
  ],

  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: 'https://eleman-shoes.com',
    siteName: 'Eleman Shoes',
    title: 'Eleman Shoes | Chaussures en cuir premium',
    description:
      'Chaussures en cuir de qualité supérieure pour hommes, femmes et enfants. Livraison dans toute l’Algérie.',
    images: [
      {
        url: '/og.jpg',
        width: 1200,
        height: 630,
        alt: 'Eleman Shoes – Chaussures en cuir',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: 'Eleman Shoes | Chaussures en cuir premium',
    description:
      'Chaussures en cuir premium en Algérie. Qualité, élégance et confort.',
    images: ['/og.jpg'],
  },

  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

/* ================= ROOT ================= */

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className="scroll-smooth" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans antialiased bg-leather-beige text-leather-dark`}
      >
        {/* ================= META PIXEL ================= */}

        <Script id="meta-pixel" strategy="afterInteractive">
          {`
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}
(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');

fbq('init', '2657224451323629');
fbq('track', 'PageView');
`}
        </Script>

        {/* ================= TIKTOK PIXEL ================= */}

        <Script
          id="tiktok-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
!function (w, d, t) {
w.TiktokAnalyticsObject=t;
var ttq=w[t]=w[t]||[];
ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];
ttq.setAndDefer=function(t,e){
t[e]=function(){
t.push([e].concat(Array.prototype.slice.call(arguments,0)))
}
};
for(var i=0;i<ttq.methods.length;i++)
ttq.setAndDefer(ttq,ttq.methods[i]);

ttq.load=function(e){
var s=d.createElement("script");
s.type="text/javascript";
s.async=true;
s.src="https://analytics.tiktok.com/i18n/pixel/events.js?sdkid="+e;
var x=d.getElementsByTagName("script")[0];
x.parentNode.insertBefore(s,x);
};

ttq.load('D66PQ7BC77U3SSVRP740');
ttq.page();
}(window, document, 'ttq');
`,
          }}
        />

        {/* ================= NOSCRIPT ================= */}

        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=2657224451323629&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>

        {/* ================= PROVIDERS ================= */}

        <AuthProvider>
          <LanguageProvider>
            {children}
            <Toaster />
          </LanguageProvider>
        </AuthProvider>

        {/* ================= VERCEL SPEED ================= */}

        <SpeedInsights />
      </body>
    </html>
  )
}
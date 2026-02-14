import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';

import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

/* ================= META ================= */

export const metadata: Metadata = {
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
  metadataBase: new URL('https://eleman-shoes.com'),

  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },

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
};

/* ================= ROOT ================= */

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="scroll-smooth" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans antialiased bg-leather-beige text-leather-dark`}
      >

        {/* ================= META PIXEL ================= */}
        <Script
          id="meta-pixel"
          strategy="afterInteractive"
        >
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

fbq('init', '2442446146189252');

if (!window.__META_PIXEL_INITIALIZED__) {
  window.__META_PIXEL_INITIALIZED__ = true;
  fbq('track', 'PageView');
}
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
                ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"];
                ttq.setAndDefer=function(t,e){
                  t[e]=function(){
                    t.push([e].concat(Array.prototype.slice.call(arguments,0)))
                  }
                };
                for(var i=0;i<ttq.methods.length;i++)
                  ttq.setAndDefer(ttq,ttq.methods[i]);

                ttq.instance=function(t){
                  for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)
                    ttq.setAndDefer(e,ttq.methods[n]);
                  return e
                };

                ttq.load=function(e,n){
                  var r="https://analytics.tiktok.com/i18n/pixel/events.js";
                  ttq._i=ttq._i||{};
                  ttq._i[e]=[];
                  ttq._i[e]._u=r;
                  ttq._t=ttq._t||{};
                  ttq._t[e]=+new Date;
                  ttq._o=ttq._o||{};
                  ttq._o[e]=n||{};
                  n=document.createElement("script");
                  n.type="text/javascript";
                  n.async=!0;
                  n.src=r+"?sdkid="+e+"&lib="+t;
                  e=document.getElementsByTagName("script")[0];
                  e.parentNode.insertBefore(n,e)
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
            src="https://www.facebook.com/tr?id=2442446146189252&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>

        <AuthProvider>
          <LanguageProvider>
            {children}
            <Toaster />
          </LanguageProvider>
        </AuthProvider>

      </body>
    </html>
  );
}
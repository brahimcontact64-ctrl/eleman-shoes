import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { SpeedInsights } from '@vercel/speed-insights/next'

import { LanguageProvider } from '@/contexts/LanguageContext'
import { Toaster } from '@/components/ui/toaster'
import CheckoutAnalyticsScripts from '@/components/CheckoutAnalyticsScripts'

/* ================= FONT ================= */

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  preload: true
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

      <head>
        {/* Improve image loading from Firebase */}
        <link rel="preconnect" href="https://firebasestorage.googleapis.com" />
        <link rel="dns-prefetch" href="https://firebasestorage.googleapis.com" />
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
      </head>

      <body
        className={`${inter.variable} font-sans antialiased bg-leather-beige text-leather-dark`}
      >
        <CheckoutAnalyticsScripts />

        {/* ================= PROVIDERS ================= */}

        <LanguageProvider>
          {children}
          <Toaster />
        </LanguageProvider>

        {/* ================= VERCEL SPEED ================= */}

        <SpeedInsights />

      </body>
    </html>
  )
}

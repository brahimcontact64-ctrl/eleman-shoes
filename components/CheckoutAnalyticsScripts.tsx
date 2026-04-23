'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

declare global {
  interface Window {
    fbq?: (...args: any[]) => void
    _fbq?: (...args: any[]) => void
    ttq?: any
    TiktokAnalyticsObject?: string
    __checkoutAnalyticsLoaded?: boolean
  }
}

export default function CheckoutAnalyticsScripts() {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname?.startsWith('/checkout/')) return

    let cancelled = false
    let idleCallbackId: number | null = null
    let fallbackIdleTimeoutId: ReturnType<typeof setTimeout> | null = null

    const loadAnalytics = () => {
      if (cancelled || window.__checkoutAnalyticsLoaded) return

      // Meta Pixel bootstrap
      if (!window.fbq) {
        const n: any = function (...args: any[]) {
          if (typeof n.callMethod === 'function') {
            n.callMethod.apply(n, args)
          } else {
            n.queue.push(args)
          }
        }
        n.push = n
        n.loaded = true
        n.version = '2.0'
        n.queue = []
        window.fbq = n
        window._fbq = n

        const fbScript = document.createElement('script')
        fbScript.async = true
        fbScript.src = 'https://connect.facebook.net/en_US/fbevents.js'
        document.head.appendChild(fbScript)

        window.fbq('init', '2657224451323629')
        window.fbq('track', 'PageView')
      }

      // TikTok Pixel bootstrap
      if (!window.ttq) {
        const ttq: any = []
        window.TiktokAnalyticsObject = 'ttq'
        window.ttq = ttq

        ttq.methods = [
          'page',
          'track',
          'identify',
          'instances',
          'debug',
          'on',
          'off',
          'once',
          'ready',
          'alias',
          'group',
          'enableCookie',
          'disableCookie',
        ]

        ttq.setAndDefer = function (obj: any, method: string) {
          obj[method] = function (...args: any[]) {
            obj.push([method, ...args])
          }
        }

        for (let i = 0; i < ttq.methods.length; i++) {
          ttq.setAndDefer(ttq, ttq.methods[i])
        }

        ttq.load = function (sdkid: string) {
          const s = document.createElement('script')
          s.type = 'text/javascript'
          s.async = true
          s.src = `https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${sdkid}`
          const x = document.getElementsByTagName('script')[0]
          x.parentNode?.insertBefore(s, x)
        }

        ttq.load('D66PQ7BC77U3SSVRP740')
        ttq.page()
      }

      window.__checkoutAnalyticsLoaded = true
    }

    const scheduleLoad = () => {
      if ('requestIdleCallback' in window) {
        idleCallbackId = window.requestIdleCallback(loadAnalytics)
      } else {
        fallbackIdleTimeoutId = setTimeout(loadAnalytics, 200)
      }
    }

    scheduleLoad()

    return () => {
      cancelled = true
      if (idleCallbackId !== null) {
        if ('cancelIdleCallback' in window) {
          window.cancelIdleCallback(idleCallbackId)
        }
      }

      if (fallbackIdleTimeoutId !== null) {
        clearTimeout(fallbackIdleTimeoutId)
      }
    }
  }, [pathname])

  return null
}

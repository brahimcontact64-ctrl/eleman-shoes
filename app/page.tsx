'use client'

import Image from 'next/image'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import {
  collection,
  query,
  where,
  limit,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore'

import { db } from '@/lib/firebase/config'
import { Product, Brand } from '@/lib/types'

import Navbar from '@/components/Navbar'
import PromoBanner from '@/components/PromoBanner'
import Footer from '@/components/Footer'
import WhatsAppButton from '@/components/WhatsAppButton'
import ProductCardSkeleton from '@/components/ProductCardSkeleton'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Truck, Shield, Star, Zap } from 'lucide-react'

const ProductCard = dynamic(() => import('@/components/ProductCard'), {
  ssr: false,
})

interface SiteSettings {
  heroImage: string
  heroTitle: string
  heroSubtitle: string
  heroCtaText: string
  whatsappNumber: string
}

interface CategorySection {
  categoryName: string
  products: Product[]
}

type PromotionMap = Record<string, any>

const defaultSettings: SiteSettings = {
  heroImage: '/whatsapp_image_2026-02-03_at_11.14.37.jpeg',
  heroTitle: "Chaussures en cuir d'exception",
  heroSubtitle: 'Élégance, confort et qualité pour toute la famille',
  heroCtaText: 'Commander via WhatsApp',
  whatsappNumber: '',
}

export default function Home() {
  const [categoryProducts, setCategoryProducts] = useState<CategorySection[]>([])
  const [brands, setBrands] = useState<Map<string, Brand>>(new Map())
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings)
  const [promotions, setPromotions] = useState<PromotionMap | null>(null)
  const [loading, setLoading] = useState(true)
  const [colorsMap, setColorsMap] = useState<Record<string, string>>({})

  useEffect(() => {
    const fetchHomeData = async () => {
      try {

        /* ================= CATEGORY IDS ================= */

        const categoryIds = [
          'SrgQbBADDaLSCEmo96Sn',
          'uFLBnL1DCF7pAUgl2u8c',
        ]

        /* ================= COLORS ================= */

        const colorsSnap = await getDocs(collection(db, 'colors'))

        const colors: Record<string, string> = {}

        colorsSnap.forEach(doc => {
          const data = doc.data()
          colors[data.name] = data.hexCode
        })

        setColorsMap(colors)

        /* ================= FETCH DATA ================= */

        const [
          settingsDoc,
          brandsSnapshot,
          promotionsSnapshot,
          categoriesSnapshot,
        ] = await Promise.all([
          getDoc(doc(db, 'site_settings', 'main')),
          getDocs(collection(db, 'brands')),
          getDocs(
            query(
              collection(db, 'promotions'),
              where('active', '==', true)
            )
          ),
          getDocs(
            query(
              collection(db, 'categories'),
              where('__name__', 'in', categoryIds)
            )
          ),
        ])

        /* ================= SETTINGS ================= */

        if (settingsDoc.exists()) {
          setSettings({
            ...defaultSettings,
            ...(settingsDoc.data() as Partial<SiteSettings>),
          })
        }

        /* ================= BRANDS ================= */

        const brandsMap = new Map<string, Brand>()

        brandsSnapshot.forEach(brandDoc => {
          brandsMap.set(
            brandDoc.id,
            { id: brandDoc.id, ...brandDoc.data() } as Brand
          )
        })

        setBrands(brandsMap)

        /* ================= PROMOTIONS ================= */

        const promotionsMap: PromotionMap = {}

        promotionsSnapshot.forEach(promoDoc => {
          const data = promoDoc.data()

          if (data?.productId) {
            promotionsMap[data.productId] = {
              id: promoDoc.id,
              ...data,
            }
          }
        })

        setPromotions(promotionsMap)

        /* ================= PRODUCTS ================= */

        const result: CategorySection[] = await Promise.all(
          categoriesSnapshot.docs.map(async (catDoc) => {

            const categoryId = catDoc.id
            const categoryName = catDoc.data().name

            const productsSnap = await getDocs(
              query(
                collection(db, 'products'),
                where('isActive', '==', true),
                where('categoryId', '==', categoryId),
                limit(4)
              )
            )

            const products = productsSnap.docs.map(productDoc => ({
              id: productDoc.id,
              ...productDoc.data(),
            })) as Product[]

            return {
              categoryName,
              products,
            }
          })
        )

        setCategoryProducts(result)

      } catch (error) {
        console.error('Home fetch error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchHomeData()
  }, [])

  return (
    <>
      <Navbar />
      <PromoBanner />

      <main className="bg-leather-beige">

        {/* HERO */}

        <section className="relative w-full h-[100svh] md:h-[700px] overflow-hidden">

          <Image
            src={settings.heroImage}
            alt="Chaussures en cuir"
            fill
            priority
            quality={60}
            sizes="100vw"
            className="object-cover"
          />

          <div className="absolute inset-0 bg-black/40" />

          <div className="relative z-10 h-full flex items-center">

            <div className="container mx-auto px-4 text-white text-center md:text-left">

              <div className="max-w-xl">

                <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-serif font-bold mb-4 drop-shadow-lg">
                  {settings.heroTitle}
                </h1>

                <p className="text-lg md:text-2xl mb-6 drop-shadow-md">
                  {settings.heroSubtitle}
                </p>

                <a
                  href={`https://wa.me/${settings.whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    size="lg"
                    className="bg-leather-coffee hover:bg-leather-dark text-white px-10 py-6 rounded-full shadow-xl"
                  >
                    {settings.heroCtaText}
                  </Button>
                </a>

              </div>
            </div>
          </div>
        </section>

        {/* PRODUCTS */}

        <section className="py-16">

          <div className="container mx-auto px-4">

            <div className="text-center mb-12">

              <h2 className="text-4xl font-bold mb-4 text-leather-dark">
                Produits Populaires
              </h2>

              <p className="text-xl text-leather-gray mb-6">
                Découvrez nos meilleures ventes
              </p>

              <Link href="/catalog">

                <Button
                  variant="outline"
                  className="border-leather-brown text-leather-brown hover:bg-leather-brown hover:text-white transition-all px-6"
                >
                  Voir tout →
                </Button>

              </Link>

            </div>

            {loading ? (

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

                {Array.from({ length: 8 }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}

              </div>

            ) : (

              <div className="space-y-16">

                {categoryProducts.map((section, index) => (

                  <div key={index}>

                    <h2 className="text-3xl font-bold mb-8 text-leather-dark text-center">
                      {section.categoryName}
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

                      {section.products.map(product => (

                        <ProductCard
                          key={product.id}
                          product={product}
                          brand={brands.get(product.brandId)}
                          promotion={promotions?.[product.id]}
                          colorsMap={colorsMap}
                        />

                      ))}

                    </div>

                  </div>

                ))}

              </div>

            )}

          </div>
        </section>

      </main>

      <Footer />
      <WhatsAppButton />
    </>
  )
}

function Feature({
  icon: Icon,
  title,
  text,
}: {
  icon: any
  title: string
  text: string
}) {
  return (
    <Card className="bg-leather-beige/50 text-center">
      <CardContent className="p-6">

        <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-leather-light/30 flex items-center justify-center">
          <Icon className="h-8 w-8 text-leather-brown" />
        </div>

        <h3 className="text-xl font-semibold mb-2 text-leather-dark">
          {title}
        </h3>

        <p className="text-leather-gray">
          {text}
        </p>

      </CardContent>
    </Card>
  )
}
'use client'

import Image from 'next/image'
import Link from 'next/link'
import { getOptimizedImage } from '@/lib/cloudinary'
import dynamic from 'next/dynamic'
import ProductCard from '@/components/ProductCard'
import { useEffect, useMemo, useState } from 'react'
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
import { Product, Brand, Category } from '@/lib/types'
import { dedupeCategories } from '@/lib/categories'

import Navbar from '@/components/Navbar'
import PromoBanner from '@/components/PromoBanner'
import Footer from '@/components/Footer'
import ProductCardSkeleton from '@/components/ProductCardSkeleton'

import { Button } from '@/components/ui/button'

const WhatsAppButton = dynamic(() => import('@/components/WhatsAppButton'), {
  ssr: false,
})

const BLUR_DATA_URL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='


interface SiteSettings {
  heroImage: string
  heroTitle: string
  heroSubtitle: string
  heroCtaText: string
  whatsappNumber: string
}

interface CategorySection {
  categoryId: string
  categorySlug: string
  categoryName: string
  categoryDescription?: string
  products: Product[]
}

interface HomeCategoryCard {
  id: string
  name: string
  slug: string
  description?: string
  coverImage?: string
  productCount: number
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
  const [featuredCategories, setFeaturedCategories] = useState<HomeCategoryCard[]>([])
  const [homeCategoryChips, setHomeCategoryChips] = useState<HomeCategoryCard[]>([])
  const [brands, setBrands] = useState<Map<string, Brand>>(new Map())
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings)
  const [promotions, setPromotions] = useState<PromotionMap | null>(null)
  const [loading, setLoading] = useState(true)
  const [colorsMap, setColorsMap] = useState<Record<string, string>>({})

  const heroImageSrc = useMemo(() => getOptimizedImage(settings.heroImage, 1600) || '/whatsapp_image_2026-02-03_at_11.14.37.jpeg', [settings.heroImage])

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const cacheKey = 'home_data_v1'
        const cacheRaw = typeof window !== 'undefined'
          ? sessionStorage.getItem(cacheKey)
          : null

        if (cacheRaw) {
          const cache = JSON.parse(cacheRaw)
          const isFresh = Date.now() - cache.timestamp < 1000 * 60

          if (isFresh) {
            setSettings(cache.settings || defaultSettings)
            setCategoryProducts(cache.categoryProducts || [])
            setFeaturedCategories(cache.featuredCategories || [])
            setHomeCategoryChips(cache.homeCategoryChips || [])
            setPromotions(cache.promotions || {})
            setColorsMap(cache.colorsMap || {})
            setBrands(new Map(cache.brands || []))
            setLoading(false)
            return
          }
        }

        /* ================= COLORS ================= */

     const [
  settingsDoc,
  brandsSnapshot,
  promotionsSnapshot,
  categoriesSnapshot,
  productsSnapshot,
  colorsSnap,
] = await Promise.all([
  getDoc(doc(db, 'site_settings', 'main')),
  getDocs(collection(db, 'brands')),
  getDocs(query(collection(db, 'promotions'), where('active', '==', true))),
  getDocs(collection(db, 'categories')),
  getDocs(query(collection(db, 'products'), where('isActive', '==', true))),
  getDocs(collection(db, 'colors')),
])

const colors: Record<string, string> = {}

colorsSnap.forEach(doc => {
  const data = doc.data()
  colors[data.name] = data.hexCode
})

setColorsMap(colors)
        
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
          const data = promoDoc.data() as Record<string, any>

          if (data?.productId) {
            promotionsMap[data.productId] = {
              id: promoDoc.id,
              ...data,
            }
          }
        })

        setPromotions(promotionsMap)

        /* ================= PRODUCTS ================= */

        const rawCategories = categoriesSnapshot.docs
          .map((catDoc, index) => ({
            id: catDoc.id,
            ...(catDoc.data() as Partial<Category>),
            sortOrder:
              typeof catDoc.data().sortOrder === 'number'
                ? catDoc.data().sortOrder
                : catDoc.data().order ?? index,
            isActive: catDoc.data().isActive !== false,
            isFeatured: Boolean(catDoc.data().isFeatured),
            showOnHome: catDoc.data().showOnHome !== false,
          })) as Category[]

        const categoriesData = dedupeCategories(rawCategories)
          .filter((category) => category.isActive)
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)) as Category[]

        const productsData = productsSnapshot.docs.map(productDoc => ({
          id: productDoc.id,
          ...(productDoc.data() as Record<string, any>),
        })) as Product[]

        const productsByCategory = new Map<string, Product[]>()

        productsData.forEach((product) => {
          if (!product.categoryId) return

          const bucket = productsByCategory.get(product.categoryId) || []
          bucket.push(product)
          productsByCategory.set(product.categoryId, bucket)
        })

        const homeVisibleCategories = categoriesData.filter((category) => category.showOnHome !== false)
        const categoriesForHome = homeVisibleCategories.length > 0 ? homeVisibleCategories : categoriesData

        const result: CategorySection[] = categoriesForHome
          .map((category) => ({
            categoryId: category.id,
            categorySlug: category.slug,
            categoryName: category.name,
            categoryDescription: category.description,
            products: (productsByCategory.get(category.id) || []).slice(0, 4),
          }))
          .filter((section) => section.products.length > 0)

        const cards: HomeCategoryCard[] = categoriesData.map((category) => ({
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description,
          coverImage: category.coverImage,
          productCount: (productsByCategory.get(category.id) || []).length,
        }))

        setFeaturedCategories(
          cards.filter((card) => categoriesData.find((cat) => cat.id === card.id)?.isFeatured)
        )
        setHomeCategoryChips(
          cards.filter((card) => categoriesForHome.find((cat) => cat.id === card.id)).slice(0, 8)
        )

        setCategoryProducts(result)

        if (typeof window !== 'undefined') {
          sessionStorage.setItem(
            cacheKey,
            JSON.stringify({
              timestamp: Date.now(),
              settings: settingsDoc.exists()
                ? { ...defaultSettings, ...(settingsDoc.data() as Partial<SiteSettings>) }
                : defaultSettings,
              categoryProducts: result,
              featuredCategories: cards.filter((card) => categoriesData.find((cat) => cat.id === card.id)?.isFeatured),
              homeCategoryChips: cards.filter((card) => categoriesForHome.find((cat) => cat.id === card.id)).slice(0, 8),
              promotions: promotionsMap,
              colorsMap: colors,
              brands: Array.from(brandsMap.entries()),
            })
          )
        }

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
      

      <main className="bg-leather-beige">

        {/* HERO */}

        <section className="relative w-full h-[100svh] md:h-[700px] overflow-hidden">

          <Image
            src={heroImageSrc}
            alt="Chaussures en cuir"
            fill
            priority
            quality={60}
            sizes="100vw"
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
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

        {/* SHOP BY CATEGORY */}

        <section className="py-10 md:py-14">
          <div className="container mx-auto px-4 space-y-8">

            {homeCategoryChips.length > 0 && (
              <div className="overflow-x-auto">
                <div className="flex gap-3 min-w-max pb-1">
                  {homeCategoryChips.map((chip) => (
                    <Link key={chip.id} href={`/catalog?category=${chip.slug}`}>
                      <span className="inline-flex items-center rounded-full border border-leather-light/40 bg-white px-4 py-2 text-sm font-medium text-leather-dark hover:bg-leather-brown hover:text-white transition-colors">
                        {chip.name}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-leather-dark">Shop by Category</h2>
              <p className="text-leather-gray mt-2">Collections premium gérées dynamiquement depuis l&apos;admin.</p>
            </div>

            {featuredCategories.length > 0 && (
              <>
                <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {featuredCategories.map((category) => (
                    <Link
                      key={category.id}
                      href={`/catalog?category=${category.slug}`}
                      className="group rounded-2xl overflow-hidden bg-white border border-leather-light/30 shadow-sm hover:shadow-xl transition-all"
                    >
                      <div className="relative h-56">
                        <Image
                          src={getOptimizedImage(category.coverImage || '', 800) || '/placeholder.png'}
                          alt={category.name}
                          fill
                          loading="lazy"
                          sizes="(max-width: 1024px) 50vw, 25vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                        <div className="absolute bottom-4 left-4 right-4 text-white">
                          <h3 className="text-xl font-semibold">{category.name}</h3>
                          <p className="text-sm opacity-90">{category.productCount} produits</p>
                        </div>
                      </div>
                      <div className="p-4">
                        <span className="text-sm font-semibold text-leather-brown">Explorer →</span>
                      </div>
                    </Link>
                  ))}
                </div>

                <div className="md:hidden overflow-x-auto">
                  <div className="flex gap-4 min-w-max pb-2">
                    {featuredCategories.map((category) => (
                      <Link
                        key={category.id}
                        href={`/catalog?category=${category.slug}`}
                        className="w-[280px] rounded-2xl overflow-hidden bg-white border border-leather-light/30 shadow-sm"
                      >
                        <div className="relative h-44">
                          <Image
                            src={getOptimizedImage(category.coverImage || '', 700) || '/placeholder.png'}
                            alt={category.name}
                            fill
                            loading="lazy"
                            sizes="280px"
                            className="object-cover"
                          />
                        </div>
                        <div className="p-4">
                          <h3 className="font-semibold text-leather-dark">{category.name}</h3>
                          <p className="text-sm text-leather-gray">{category.productCount} produits</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </>
            )}
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
              <PromoBanner />

              

            </div>

            {loading ? (

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

                {Array.from({ length: 8 }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}

              </div>

            ) : (

              <div className="space-y-16">

              {categoryProducts.map((section) => (

                            <div key={section.categoryId}>

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

{/* VOIR TOUT BUTTON */}

<div className="text-center mt-8">

<Link href={`/catalog?category=${section.categorySlug}`}>

<Button
variant="outline"
className="border-leather-brown text-leather-brown hover:bg-leather-brown hover:text-white transition-all px-6"
>
Voir tout →
</Button>

</Link>

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
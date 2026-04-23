'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  limit
} from 'firebase/firestore'

import { db } from '@/lib/firebase/config'
import { Product, Brand } from '@/lib/types'

import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

import { Button } from '@/components/ui/button'

import { useLanguage } from '@/contexts/LanguageContext'
import { formatPrice } from '@/lib/firebase/utils'

import Link from 'next/link'
import Image from 'next/image'
import { getOptimizedImage } from '@/lib/cloudinary'

const WhatsAppButton = dynamic(() => import('@/components/WhatsAppButton'), {
  ssr: false,
})

const BLUR_DATA_URL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='

interface ProductPageProps {
  params: {
    slug: string
  }
}

export default function ProductPage({ params }: ProductPageProps) {

  const { t } = useLanguage()

  const [product,setProduct] = useState<Product | null>(null)
  const [brand,setBrand] = useState<Brand | null>(null)
  const [promotion,setPromotion] = useState<any | null>(null)

  const [loading,setLoading] = useState(true)

  const [selectedColorId,setSelectedColorId] = useState<string | null>(null)
  const [selectedImageIndex,setSelectedImageIndex] = useState(0)

  /* ================= FETCH DATA ================= */

  const fetchData = useCallback(async()=>{

      try{
        const cacheKey = `product_page_${params.slug}`
        const cacheRaw = typeof window !== 'undefined'
          ? sessionStorage.getItem(cacheKey)
          : null

        if (cacheRaw) {
          const cache = JSON.parse(cacheRaw)
          const isFresh = Date.now() - cache.timestamp < 1000 * 60 * 5

          if (isFresh) {
            setProduct(cache.product || null)
            setBrand(cache.brand || null)
            setPromotion(cache.promotion || null)
            setSelectedColorId(cache.product?.colors?.[0]?.colorId || null)
            setLoading(false)
            return
          }
        }

        const productSnap = await getDocs(
          query(
            collection(db,'products'),
            where('slug','==',params.slug),
            where('isActive','==',true),
            limit(1)
          )
        )

        if(productSnap.empty){
          setLoading(false)
          return
        }

        const p = {
          id: productSnap.docs[0].id,
          ...productSnap.docs[0].data()
        } as Product

        setProduct(p)

        /* 🔥 تحميل promotion و brand معاً */

        const promoQuery = query(
          collection(db,'promotions'),
          where('productId','==',p.id),
          where('active','==',true),
          limit(1)
        )

        const [promoSnap,brandSnap] = await Promise.all([
          getDocs(promoQuery),
          getDoc(doc(db,'brands',p.brandId))
        ])

        if(!promoSnap.empty){
          setPromotion({
            id: promoSnap.docs[0].id,
            ...promoSnap.docs[0].data()
          })
        }

        if(brandSnap.exists()){
          setBrand({
            id: brandSnap.id,
            ...brandSnap.data()
          } as Brand)
        }

        if(p.colors && p.colors.length>0){
          setSelectedColorId(p.colors[0].colorId)
        }

        if (typeof window !== 'undefined') {
          sessionStorage.setItem(
            cacheKey,
            JSON.stringify({
              timestamp: Date.now(),
              product: p,
              brand: brandSnap.exists()
                ? { id: brandSnap.id, ...brandSnap.data() }
                : null,
              promotion: !promoSnap.empty
                ? {
                    id: promoSnap.docs[0].id,
                    ...promoSnap.docs[0].data(),
                  }
                : null,
            })
          )
        }

      }catch(err){
        console.error('Product fetch error:',err)
      }finally{
        setLoading(false)
      }

  },[params.slug])

  useEffect(()=>{
    fetchData()
  },[fetchData])

  /* ================= PIXEL ================= */

  useEffect(()=>{

    if(!product) return

    if(typeof window !== 'undefined' && (window as any).fbq){

      ;(window as any).fbq('track','ViewContent',{
        content_name: product.name,
        content_ids: [product.id],
        content_type:'product',
        value: product.price,
        currency:'DZD'
      })

    }

    if(typeof window !== 'undefined' && (window as any).ttq){

      ;(window as any).ttq.track('ViewContent',{
        content_id: product.id,
        content_name: product.name,
        content_type:'product',
        value: product.price,
        currency:'DZD'
      })

    }

  },[product])

  const selectedColor = useMemo(()=>product?.colors?.find(
    c=>c.colorId === selectedColorId
  ),[product?.colors, selectedColorId])

  const images = useMemo(() => {
    const fromColor = selectedColor?.images?.map((img) => img.url).filter(Boolean) || []
    const fromProduct = (product?.images || []).filter(Boolean)
    const list = fromColor.length > 0 ? fromColor : fromProduct
    return list.length > 0 ? list : ['/placeholder.png']
  }, [selectedColor?.images, product?.images])

  const currentImage = images[selectedImageIndex] || '/placeholder.png'

  const finalPrice = useMemo(
()=> promotion?.newPrice ?? product?.price,
[promotion?.newPrice, product?.price]
)

  const onSelectImage = useCallback((index:number)=>{
    setSelectedImageIndex(index)
  },[])

  useEffect(()=>{
    setSelectedImageIndex(0)
  },[selectedColorId])

  useEffect(()=>{
    if(!images.length) return

    images.forEach((src)=>{
      const preloadImage = new window.Image()
      preloadImage.src = src
    })
  },[images])

  if(loading){

    return(

      <div className="flex items-center justify-center min-h-screen">

        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"/>

      </div>

    )

  }

  if(!product){

    return(

      <>
        <Navbar/>

        <div className="container mx-auto px-4 py-16 text-center">

          <h1 className="text-2xl font-bold mb-4">
            Produit introuvable
          </h1>

          <Link href="/catalog">
            <Button>Retour au catalogue</Button>
          </Link>

        </div>

        <Footer/>
      </>

    )

  }

  return(

    <>
      <Navbar/>

      <main className="min-h-screen bg-gray-50">

        <div className="container mx-auto px-4 py-8">

          <Link
            href="/catalog"
            className="text-gray-600 hover:text-gray-900 mb-4 inline-block"
          >
            ← {t('back')}
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 bg-white rounded-lg shadow-md p-6">

            <div>

              <div className="relative aspect-square bg-gray-100 rounded-lg mb-4">

                {currentImage &&(

                  <Image
                    src={getOptimizedImage(currentImage, 900) || '/placeholder.png'}
                    alt={product.name}
                    fill
                    loading="lazy"
                    sizes="(max-width:768px) 100vw, 50vw"
                    quality={70}
                    placeholder="blur"
                    blurDataURL={BLUR_DATA_URL}
                    className="object-cover rounded-lg"
                  />

                )}

              </div>

              {images.length>1 &&(

                <div className="grid grid-cols-4 gap-2">

                  {images.map((img,i)=>(

                    <div
                      key={i}
                      onClick={()=>onSelectImage(i)}
                      className={`relative h-24 cursor-pointer rounded border-2 ${
                        selectedImageIndex === i
                          ? 'border-gray-900'
                          : 'border-transparent'
                      }`}
                    >

                      <Image
                        src={getOptimizedImage(img, 200) || '/placeholder.png'}
                        alt={`Image ${i+1}`}
                        fill
                        loading="lazy"
                        sizes="96px"
                        quality={40}
                        placeholder="blur"
                        blurDataURL={BLUR_DATA_URL}
                        className="object-cover rounded"
                      />

                    </div>

                  ))}

                </div>

              )}

            </div>

            <div>

              <h1 className="text-3xl font-bold mb-4">
                {product.name}
              </h1>

              <p className="text-4xl font-bold mb-6">
                {formatPrice(finalPrice)}
              </p>

              <Link href={`/checkout/${product.id}`}>
                <Button size="lg" className="w-full">
                  {t('order')}
                </Button>
              </Link>

            </div>

          </div>

        </div>

      </main>

      <Footer/>
      <WhatsAppButton/>

    </>

  )

}
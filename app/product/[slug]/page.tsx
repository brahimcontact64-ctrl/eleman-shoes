'use client'

import { useEffect, useState } from 'react'
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
import WhatsAppButton from '@/components/WhatsAppButton'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

import { useLanguage } from '@/contexts/LanguageContext'
import { formatPrice } from '@/lib/firebase/utils'

import { MessageCircle } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

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
  const [selectedSize,setSelectedSize] = useState<number | null>(null)
  const [selectedImageIndex,setSelectedImageIndex] = useState(0)

  /* ================= FETCH DATA ================= */

  useEffect(()=>{

    const fetchData = async()=>{

      try{

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

      }catch(err){
        console.error('Product fetch error:',err)
      }finally{
        setLoading(false)
      }

    }

    fetchData()

  },[params.slug])

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

  const selectedColor = product?.colors?.find(
    c=>c.colorId === selectedColorId
  )

  const images =
    selectedColor?.images?.map(img=>img.url) ||
    product?.images ||
    []

  const finalPrice =
    promotion?.newPrice ?? product?.price

  const handleWhatsAppOrder = ()=>{

    if(!product) return

    const msg =
      `Bonjour, je suis intéressé par ce produit:\n` +
      `${product.name}\n` +
      `Prix: ${formatPrice(finalPrice)}`

    window.open(
      'https://wa.me/?text='+encodeURIComponent(msg),
      '_blank'
    )

  }

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

                {images[selectedImageIndex] &&(

                  <Image
                    src={images[selectedImageIndex]}
                    alt={product.name}
                    fill
                    priority
                    sizes="(max-width:768px) 100vw, 50vw"
                    quality={70}
                    className="object-cover rounded-lg"
                  />

                )}

              </div>

              {images.length>1 &&(

                <div className="grid grid-cols-4 gap-2">

                  {images.map((img,i)=>(

                    <div
                      key={i}
                      onClick={()=>setSelectedImageIndex(i)}
                      className={`relative h-24 cursor-pointer rounded border-2 ${
                        selectedImageIndex === i
                          ? 'border-gray-900'
                          : 'border-transparent'
                      }`}
                    >

                      <Image
                        src={img}
                        alt={`Image ${i+1}`}
                        fill
                        loading="lazy"
                        sizes="100px"
                        quality={40}
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
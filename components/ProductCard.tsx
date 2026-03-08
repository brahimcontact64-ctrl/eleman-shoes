'use client';

import Image from 'next/image'
import Link from 'next/link'
import { useState, useMemo } from 'react'
import { Product, Brand } from '@/lib/types'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { useLanguage } from '@/contexts/LanguageContext'
import { formatPrice } from '@/lib/firebase/utils'
import { MessageCircle } from 'lucide-react'

interface ProductCardProps {
  product: Product
  brand?: Brand
  promotion?: any
}

export default function ProductCard({
  product,
  brand,
  promotion,
}: ProductCardProps) {

  const { t } = useLanguage()

  const [hovered, setHovered] = useState(false)
  const [selectedColorId, setSelectedColorId] = useState(
    product.colors?.[0]?.colorId || null
  )

  /* ================= ACTIVE COLOR ================= */

  const activeColor = useMemo(() => {
    return (
      product.colors?.find(c => c.colorId === selectedColorId) ||
      product.colors?.[0]
    )
  }, [selectedColorId, product.colors])

  const images = activeColor?.images || []

  const firstImage = images?.[0]?.url || null
  const secondImage = images?.[1]?.url || firstImage

  /* ================= PRICE ================= */

  const finalPrice = promotion?.newPrice ?? product.price

  /* ================= WHATSAPP ================= */

  const handleWhatsAppOrder = () => {

    const message =
      "Bonjour, je suis intéressé par ce produit:\n" +
      product.name +
      "\nPrix: " +
      formatPrice(finalPrice)

    window.open(
      "https://wa.me/?text=" + encodeURIComponent(message),
      "_blank"
    )
  }

  return (
    <div className="group bg-white rounded-2xl border border-leather-light/20 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300">

      {/* IMAGE */}

      <Link href={`/product/${product.slug}`}>
        <div
          className="relative h-64 bg-leather-beige overflow-hidden"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onTouchStart={() => setHovered(true)}
          onTouchEnd={() => setHovered(false)}
        >

          {/* PROMO BADGE */}

          {promotion && (
            <div className="absolute top-3 left-3 z-20">
              <Badge className="bg-red-500 text-white text-xs px-3 py-1 rounded-full shadow">
                🔥 PROMO
              </Badge>
            </div>
          )}

          {/* BRAND */}

          {brand && (
            <div className="absolute bottom-3 right-3 z-20">
              <Badge className="bg-white/90 text-leather-dark border px-2 py-1 text-xs rounded-full backdrop-blur">
                {brand.name}
              </Badge>
            </div>
          )}

          {/* IMAGES */}

          <div className="relative w-full h-full">

            {firstImage && (
              <Image
                src={firstImage}
                alt={product.name}
                fill
                sizes="(max-width:768px) 100vw, 25vw"
                quality={50}
                loading="lazy"
                className={`object-cover transition-all duration-300 ${
                  hovered ? "opacity-0 scale-105" : "opacity-100"
                }`}
              />
            )}

            {secondImage && (
              <Image
                src={secondImage}
                alt={product.name}
                fill
                sizes="(max-width:768px) 100vw, 25vw"
                quality={50}
                loading="lazy"
                className={`object-cover transition-all duration-300 ${
                  hovered ? "opacity-100 scale-100" : "opacity-0"
                }`}
              />
            )}

          </div>

        </div>
      </Link>

      {/* CONTENT */}

      <div className="p-4">

        {/* TITLE */}

        <div className="flex items-center justify-between mb-2">

          <Link href={`/product/${product.slug}`}>
            <h3 className="font-semibold text-lg text-leather-dark hover:text-leather-brown transition line-clamp-1">
              {product.name}
            </h3>
          </Link>

        </div>

        {/* PRICE */}

        <div className="mb-3 min-h-[50px]">

          <p className="text-2xl font-bold text-leather-brown">
            {formatPrice(finalPrice)}
          </p>

          {promotion && (
            <p className="text-sm text-gray-400 line-through">
              {formatPrice(product.price)}
            </p>
          )}

        </div>

        {/* COLORS */}

        {product.colors?.length > 0 && (

          <div className="mb-4">

            <p className="text-xs text-gray-500 mb-2">
              Couleurs disponibles
            </p>

            <div className="flex gap-2 flex-wrap">

              {product.colors.slice(0,5).map(color => (

                <button
                  key={color.colorId}
                  type="button"
                  onClick={(e)=>{
                    e.preventDefault()
                    setHovered(false)
                    setSelectedColorId(color.colorId)
                  }}
                  className={`w-6 h-6 rounded-full border-2 transition-all
                  ${
                    selectedColorId === color.colorId
                      ? "border-leather-brown scale-110"
                      : "border-gray-300"
                  }`}
                  style={{
                    backgroundColor: color.hexCode || "#ccc"
                  }}
                />

              ))}

            </div>

          </div>

        )}

        {/* ACTIONS */}

        <div className="space-y-2">

          <Link href={`/checkout/${product.id}`}>

            <Button
              className="w-full bg-leather-brown hover:bg-leather-coffee text-white"
              size="lg"
            >
              {t('order')}
            </Button>

          </Link>

          <Button
            variant="outline"
            className="w-full border-leather-brown text-leather-brown hover:bg-leather-brown hover:text-white"
            size="lg"
            onClick={handleWhatsAppOrder}
          >

            <MessageCircle className="h-4 w-4 mr-2" />

            {t('whatsapp_order')}

          </Button>

        </div>

      </div>

    </div>
  )
}
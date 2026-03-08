'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Product, Brand } from '@/lib/types';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatPrice } from '@/lib/firebase/utils';
import { MessageCircle } from 'lucide-react';

import {
  collection,
  query,
  where,
  getDocs,
  limit,
} from 'firebase/firestore';

import { db } from '@/lib/firebase/config';

interface ProductCardProps {
  product: Product;
  brand?: Brand;
}

export default function ProductCard({ product, brand }: ProductCardProps) {

  const { t } = useLanguage();

  const [promotion, setPromotion] = useState<any | null>(null);
  const [colorsMap, setColorsMap] = useState<any>({});
  const [selectedColorId, setSelectedColorId] = useState(
    product.colors?.[0]?.colorId || null
  );

  /* ================= FETCH PROMOTION ================= */

  useEffect(() => {
    const fetchPromotion = async () => {
      const q = query(
        collection(db, 'promotions'),
        where('productId', '==', product.id),
        where('active', '==', true),
        limit(1)
      );

      const snap = await getDocs(q);

      if (!snap.empty) {
        setPromotion({
          id: snap.docs[0].id,
          ...snap.docs[0].data(),
        });
      }
    };

    fetchPromotion();
  }, [product.id]);

  /* ================= FETCH COLORS ================= */

  useEffect(() => {
    const fetchColors = async () => {

      const snap = await getDocs(collection(db, "colors"));

      const map: any = {};

      snap.forEach(doc => {
        const data = doc.data();
        map[data.name] = data.hexCode;
      });

      setColorsMap(map);
    };

    fetchColors();
  }, []);

  /* ================= ACTIVE COLOR ================= */

  const activeColor =
    product.colors?.find(c => c.colorId === selectedColorId) ||
    product.colors?.[0];

  const mainImage =
    activeColor?.images?.[0]?.url || null;

  /* ================= PRICE ================= */

  const finalPrice =
    promotion?.newPrice || product.price;

  /* ================= WHATSAPP ================= */

  const handleWhatsAppOrder = () => {

    const message =
      "Bonjour, je suis intéressé par ce produit:\n" +
      product.name +
      "\nPrix: " +
      formatPrice(finalPrice);

    window.open(
      "https://wa.me/?text=" + encodeURIComponent(message),
      "_blank"
    );
  };

  return (
    <div className="group bg-white rounded-xl border border-leather-light/20 overflow-hidden hover:shadow-xl transition-all duration-300">

      {/* IMAGE */}

      <Link href={'/product/' + product.slug}>
        <div className="relative h-64 bg-leather-beige flex items-center justify-center overflow-hidden">

          {promotion && (
            <div className="absolute top-3 left-3 z-10">
              <Badge className="bg-red-500 text-white text-xs px-2 py-1">
                🔥 PROMO
              </Badge>
            </div>
          )}

          {mainImage ? (
          <Image
  src={mainImage}
  alt={product.name}
  fill
  sizes="(max-width:768px) 100vw, 25vw"
  loading="lazy"
  quality={40}
  priority={false}
  className="object-cover"
/>
          ) : (
            <span className="text-sm text-gray-400">
              No image
            </span>
          )}

        </div>
      </Link>

      {/* CONTENT */}

      <div className="p-4">

        {/* TITLE */}

        <div className="flex items-center justify-between mb-2">

          <Link href={'/product/' + product.slug}>
            <h3 className="font-semibold text-lg text-leather-dark hover:text-leather-brown transition">
              {product.name}
            </h3>
          </Link>

          {brand && (
            <Badge
              variant="secondary"
              className="bg-leather-light/20 text-leather-dark border-leather-light/30"
            >
              {brand.name}
            </Badge>
          )}

        </div>

        {/* PRICE */}

        <div className="mb-3">

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

          <div className="mb-3">

            <p className="text-xs text-gray-500 mb-1">
              Couleurs disponibles
            </p>

            <div className="flex gap-2">

              {product.colors.slice(0,5).map(color => (

                <button
                  key={color.colorId}
                  type="button"
                  onClick={(e)=>{
                    e.preventDefault();
                    setSelectedColorId(color.colorId);
                  }}
                  className={`w-6 h-6 rounded-full border-2 transition
                  ${selectedColorId === color.colorId
                    ? "border-leather-brown scale-110"
                    : "border-gray-300"
                  }`}
                  style={{
                    backgroundColor: colorsMap[color.name] || "#ccc"
                  }}
                  title={color.name}
                />

              ))}

            </div>

          </div>

        )}

        {/* ACTIONS */}

        <div className="space-y-2">

          <Link href={'/checkout/' + product.id}>

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
  );
}
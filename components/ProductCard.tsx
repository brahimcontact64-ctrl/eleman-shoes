'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Product, Brand } from '@/lib/types';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatPrice } from '@/lib/firebase/utils';
import { MessageCircle } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

interface ProductCardProps {
  product: Product;
  brand?: Brand;
  promotion?: any;
}

/* ================= SHARED COLOR CACHE ================= */

let colorsMapCache: Record<string, string> | null = null;
let colorsMapPromise: Promise<Record<string, string>> | null = null;

async function getColorsMap(): Promise<Record<string, string>> {
  if (colorsMapCache) return colorsMapCache;
  if (colorsMapPromise) return colorsMapPromise;

  colorsMapPromise = (async () => {
    const snap = await getDocs(collection(db, 'colors'));
    const map: Record<string, string> = {};

    snap.forEach((doc) => {
      const data = doc.data() as { name?: string; hexCode?: string };
      if (data?.name) {
        map[data.name] = data.hexCode || '#ccc';
      }
    });

    colorsMapCache = map;
    return map;
  })();

  return colorsMapPromise;
}

export default function ProductCard({
  product,
  brand,
  promotion,
}: ProductCardProps) {
  const { t } = useLanguage();

  const [hovered, setHovered] = useState(false);
  const [colorsMap, setColorsMap] = useState<Record<string, string>>({});
  const [selectedColorId, setSelectedColorId] = useState<string | null>(
    product.colors?.[0]?.colorId || null
  );

  /* ================= FETCH COLORS ONCE ================= */

  useEffect(() => {
    let mounted = true;

    getColorsMap()
      .then((map) => {
        if (mounted) setColorsMap(map);
      })
      .catch((error) => {
        console.error('Error loading colors map:', error);
      });

    return () => {
      mounted = false;
    };
  }, []);

  /* ================= RESET SELECTED COLOR IF PRODUCT CHANGES ================= */

  useEffect(() => {
    setSelectedColorId(product.colors?.[0]?.colorId || null);
  }, [product.id, product.colors]);

  /* ================= ACTIVE COLOR ================= */

  const activeColor = useMemo(() => {
    return (
      product.colors?.find((c) => c.colorId === selectedColorId) ||
      product.colors?.[0]
    );
  }, [product.colors, selectedColorId]);

  const images = activeColor?.images || [];
  const firstImage = images[0]?.url || null;
  const secondImage = images[1]?.url || firstImage;

  /* ================= PRICE ================= */

  const finalPrice = promotion?.newPrice ?? product.price;

  /* ================= WHATSAPP ================= */

  const handleWhatsAppOrder = () => {
    const message =
      'Bonjour, je suis intéressé par ce produit:\n' +
      `${product.name}\n` +
      `Prix: ${formatPrice(finalPrice)}`;

    window.open(
      'https://wa.me/?text=' + encodeURIComponent(message),
      '_blank'
    );
  };

  return (
    <div className="group bg-white rounded-2xl border border-leather-light/20 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300">
      <Link href={`/product/${product.slug}`}>
        <div
          className="relative h-64 bg-leather-beige overflow-hidden"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onTouchStart={() => setHovered(true)}
          onTouchEnd={() => setHovered(false)}
        >
          {promotion && (
            <div className="absolute top-3 left-3 z-20">
              <Badge className="bg-red-500 hover:bg-red-500 text-white text-[11px] font-semibold px-3 py-1 rounded-full shadow-sm">
                🔥 PROMO
              </Badge>
            </div>
          )}

          {brand && (
            <div className="absolute bottom-3 right-3 z-20">
              <Badge
                variant="secondary"
                className="bg-white/90 text-leather-dark border border-leather-light/30 backdrop-blur-sm rounded-full px-3 py-1 text-[11px]"
              >
                {brand.name}
              </Badge>
            </div>
          )}

          <div className="relative w-full h-full">
            {firstImage ? (
              <>
                <Image
                  src={firstImage}
                  alt={product.name}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  quality={50}
                  loading="lazy"
                  priority={false}
                  className={`object-cover transition-all duration-300 ${
                    hovered && secondImage && secondImage !== firstImage
                      ? 'opacity-0 scale-[1.02]'
                      : 'opacity-100 scale-100'
                  }`}
                />

                {secondImage && secondImage !== firstImage && (
                  <Image
                    src={secondImage}
                    alt={`${product.name} alternate`}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    quality={50}
                    loading="lazy"
                    priority={false}
                    className={`object-cover transition-all duration-300 ${
                      hovered ? 'opacity-100 scale-100' : 'opacity-0 scale-[1.02]'
                    }`}
                  />
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm text-gray-400">
                No image
              </div>
            )}
          </div>
        </div>
      </Link>

      <div className="p-4">
        <div className="mb-2">
          <Link href={`/product/${product.slug}`}>
            <h3 className="font-semibold text-lg text-leather-dark hover:text-leather-brown transition-colors line-clamp-1">
              {product.name}
            </h3>
          </Link>
        </div>

        <div className="mb-3">
          <p className="text-2xl font-bold text-leather-brown leading-none">
            {formatPrice(finalPrice)}
          </p>

          {promotion && (
            <p className="text-sm text-gray-400 line-through mt-1">
              {formatPrice(product.price)}
            </p>
          )}
        </div>

        {product.colors?.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2">Couleurs disponibles:</p>

            <div className="flex flex-wrap gap-2">
              {product.colors.slice(0, 5).map((color) => {
                const isSelected = selectedColorId === color.colorId;
                const swatchColor = colorsMap[color.name] || '#d1d5db';

                return (
                  <button
                    key={color.colorId}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setHovered(false);
                      setSelectedColorId(color.colorId);
                    }}
                    aria-label={color.name}
                    title={color.name}
                    className={`w-6 h-6 rounded-full border-2 shadow-sm transition-all duration-200 ${
                      isSelected
                        ? 'border-leather-brown scale-110 ring-2 ring-leather-brown/20'
                        : 'border-gray-300 hover:scale-105'
                    }`}
                    style={{ backgroundColor: swatchColor }}
                  />
                );
              })}

              {product.colors.length > 5 && (
                <div className="w-6 h-6 rounded-full border border-gray-300 bg-gray-100 flex items-center justify-center text-[10px] text-gray-500">
                  +{product.colors.length - 5}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Link href={`/checkout/${product.id}`} className="block">
            <Button
              className="w-full bg-leather-brown hover:bg-leather-coffee text-white rounded-xl"
              size="lg"
            >
              {t('order')}
            </Button>
          </Link>

          <Button
            variant="outline"
            className="w-full border-leather-brown text-leather-brown hover:bg-leather-brown hover:text-white rounded-xl"
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
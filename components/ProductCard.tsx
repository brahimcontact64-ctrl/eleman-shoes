'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Product, Brand } from '@/lib/types';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatPrice } from '@/lib/firebase/utils';
import { MessageCircle } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  brand?: Brand;
}

export default function ProductCard({ product, brand }: ProductCardProps) {
  const { t } = useLanguage();

  // ✅ استخراج أول صورة بأمان
  const mainImage =
    product.colors?.[0]?.images?.[0]?.url || null;

  const handleWhatsAppOrder = () => {
    const message =
      'Bonjour, je suis intéressé par ce produit:\n' +
      product.name +
      '\nPrix: ' +
      formatPrice(product.price);

    window.open(
      'https://wa.me/?text=' + encodeURIComponent(message),
      '_blank'
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 border border-leather-light/20">
      <Link href={'/product/' + product.slug}>
        <div className="relative h-64 bg-leather-beige flex items-center justify-center">
          {mainImage ? (
            <Image
              src={mainImage}
              alt={product.name}
              fill
              className="object-cover hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <span className="text-sm text-leather-gray">
              No image
            </span>
          )}
        </div>
      </Link>

      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <Link href={'/product/' + product.slug}>
            <h3 className="font-semibold text-lg text-leather-dark hover:text-leather-brown transition-colors">
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

        <p className="text-2xl font-bold text-leather-brown mb-2">
          {formatPrice(product.price)}
        </p>

        {/* COLORS */}
        {product.colors?.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-leather-gray mb-1">
              Couleurs disponibles:
            </p>
            <div className="flex flex-wrap gap-1">
              {product.colors.slice(0, 5).map(color => (
                <div
                  key={color.colorId}
                  className="w-6 h-6 rounded-full border-2 border-leather-light/50 shadow-sm"
                  title={color.name}
                  style={{ backgroundColor: '#ccc' }}
                />
              ))}
              {product.colors.length > 5 && (
                <div className="w-6 h-6 rounded-full border-2 border-leather-light/50 bg-leather-beige flex items-center justify-center text-xs text-leather-gray">
                  +{product.colors.length - 5}
                </div>
              )}
            </div>
          </div>
        )}

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
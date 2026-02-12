'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Product, Brand } from '@/lib/types';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatPrice } from '@/lib/firebase/utils';
import { MessageCircle } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface ProductPageProps {
  params: {
    slug: string;
  };
}

export default function ProductPage({ params }: ProductPageProps) {
  const { t } = useLanguage();

  const [product, setProduct] = useState<Product | null>(null);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedColorId, setSelectedColorId] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<number | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  /* ================= FETCH ================= */

  useEffect(() => {
    const fetchData = async () => {
      try {
        const q = query(
          collection(db, 'products'),
          where('slug', '==', params.slug),
          where('isActive', '==', true)
        );

        const snap = await getDocs(q);
        if (snap.empty) return;

        const p = {
          id: snap.docs[0].id,
          ...snap.docs[0].data(),
        } as Product;

        setProduct(p);
       

        // auto select first color (if exists)
        if (p.colors && p.colors.length > 0) {
          setSelectedColorId(p.colors[0].colorId);
        }

        const brandSnap = await getDoc(doc(db, 'brands', p.brandId));
        if (brandSnap.exists()) {
          setBrand({ id: brandSnap.id, ...brandSnap.data() } as Brand);
        }
      } catch (e) {
        console.error('Product fetch error:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.slug]);
 /* ================= META PIXEL – VIEW CONTENT ================= */

useEffect(() => {
  if (!product) return;

  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('track', 'ViewContent', {
      content_name: product.name,
      content_ids: [product.id],
      content_type: 'product',
      value: product.price,
      currency: 'DZD',
    });
  }
}, [product]);
  /* ================= HELPERS ================= */

  const selectedColor = product?.colors?.find(
    c => c.colorId === selectedColorId
  );

  const images =
    selectedColor?.images?.map(img => img.url) ||
    product?.images ||
    [];

  const handleWhatsAppOrder = () => {
    if (!product) return;

    const msg =
      `Bonjour, je suis intéressé par ce produit:\n` +
      `${product.name}\n` +
      `Prix: ${formatPrice(product.price)}\n` +
      (selectedSize ? `Pointure: ${selectedSize}\n` : '') +
      (selectedColor ? `Couleur: ${selectedColor.name}` : '');

    window.open(
      'https://wa.me/?text=' + encodeURIComponent(msg),
      '_blank'
    );
  };

  /* ================= UI ================= */

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (!product) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Produit introuvable</h1>
          <Link href="/catalog">
            <Button>Retour au catalogue</Button>
          </Link>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <Link
            href="/catalog"
            className="text-gray-600 hover:text-gray-900 mb-4 inline-block"
          >
            ← {t('back')}
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 bg-white rounded-lg shadow-md p-6">
            {/* ================= IMAGES ================= */}
            <div>
              <div className="relative h-96 bg-gray-100 rounded-lg mb-4">
                {images[selectedImageIndex] && (
                  <Image
                    src={images[selectedImageIndex]}
                    alt={product.name}
                    fill
                    className="object-cover rounded-lg"
                  />
                )}
              </div>

              {images.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {images.map((img, i) => (
                    <div
                      key={i}
                      onClick={() => setSelectedImageIndex(i)}
                      className={`relative h-24 cursor-pointer rounded border-2 ${
                        selectedImageIndex === i
                          ? 'border-gray-900'
                          : 'border-transparent'
                      }`}
                    >
                      <Image
                        src={img}
                        alt={`Image ${i + 1}`}
                        fill
                        className="object-cover rounded"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ================= INFO ================= */}
            <div>
              <div className="flex gap-2 mb-2">
                {brand && <Badge>{brand.name}</Badge>}
                <Badge variant="outline">{t('available')}</Badge>
              </div>

              <h1 className="text-3xl font-bold mb-4">{product.name}</h1>

              <p className="text-4xl font-bold mb-6">
                {formatPrice(product.price)}
              </p>

              {/* SIZES */}
            {product.sizes && product.sizes.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-2">{t('sizes')}</h3>
                  <div className="flex flex-wrap gap-2">
                   {(product.sizes ?? []).map(size => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`px-4 py-2 rounded-lg border-2 ${
                          selectedSize === size
                            ? 'bg-gray-900 text-white border-gray-900'
                            : 'border-gray-300'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* COLORS */}
              {product.colors?.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-2">Couleurs</h3>
                  <div className="flex flex-wrap gap-3">
                    {product.colors.map(color => (
                      <button
                        key={color.colorId}
                        onClick={() => {
                          setSelectedColorId(color.colorId);
                          setSelectedImageIndex(0);
                        }}
                        className={`px-3 py-2 rounded-lg border-2 ${
                          selectedColorId === color.colorId
                            ? 'border-gray-900'
                            : 'border-gray-300'
                        }`}
                      >
                        {color.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* DESCRIPTION */}
              {product.description && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-2">{t('description')}</h3>
                  <p className="text-gray-600">{product.description}</p>
                </div>
              )}

              {/* ACTIONS */}
              <div className="space-y-3">
                <Link
                  href={`/checkout/${product.id}?size=${selectedSize ?? ''}&color=${selectedColorId ?? ''}`}
                >
                <Button
  className="w-full"
  size="lg"
  disabled={!selectedSize || !selectedColorId}
  onClick={() => {
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'InitiateCheckout', {
        content_name: product.name,
        content_ids: [product.id],
        value: product.price,
        currency: 'DZD',
      });
    }
  }}
>
  {t('order')}
</Button>
                </Link>

                {(!selectedSize || !selectedColorId) && (
                  <p className="text-sm text-red-600 text-center">
                    Veuillez sélectionner une pointure et une couleur
                  </p>
                )}

                <Button
                  variant="outline"
                  className="w-full"
                  size="lg"
                  onClick={handleWhatsAppOrder}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  {t('whatsapp_order')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
      <WhatsAppButton />
    </>
  );
}
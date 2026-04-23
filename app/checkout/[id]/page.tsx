'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getOptimizedImage } from '@/lib/cloudinary';
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Product, Brand, DeliveryZone } from '@/lib/types';

const Navbar = dynamic(() => import('@/components/Navbar'));
const Footer = dynamic(() => import('@/components/Footer'));
const PromoBanner = dynamic(() => import('@/components/PromoBanner'), {
  ssr: false,
});

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';

import { formatPrice } from '@/lib/firebase/utils';
import { toast } from 'sonner';

const BLUR_DATA_URL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

const REVALIDATE_MS = 60 * 1000;

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  /* ================= STATE ================= */

  const [product, setProduct] = useState<Product | null>(null);
  const [promotion, setPromotion] = useState<any | null>(null);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedColorId, setSelectedColorId] = useState('');
  const [selectedSize, setSelectedSize] = useState<number>(0);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [wilaya, setWilaya] = useState('');
  const [deliveryType, setDeliveryType] =
    useState<'home' | 'stopdesk'>('home');
  const [addressDetails, setAddressDetails] = useState('');
  const [notes, setNotes] = useState('');

  const [zoomOpen, setZoomOpen] = useState(false);

  /* ================= DERIVED ================= */

  const selectedZone = useMemo(
    () => zones.find(z => z.wilaya === wilaya),
    [zones, wilaya]
  );

  const deliveryPrice = selectedZone
    ? deliveryType === 'home'
      ? selectedZone.home
      : selectedZone.stopdesk
    : 0;

  const selectedColor = useMemo(
    () => product?.colors?.find(c => c.colorId === selectedColorId) || null,
    [product?.colors, selectedColorId]
  );


  const colorImages = useMemo(
    () => selectedColor?.images || [],
    [selectedColor?.images]
  );

  const displayImage = useMemo(() =>
    colorImages[selectedImageIndex]?.url ||
    product?.colors?.[0]?.images?.[0]?.url ||
    '/placeholder.png',
  [colorImages, selectedImageIndex, product?.colors]);

  const selectedSizeEntry = useMemo(() => {
    if (!selectedColor || !selectedSize) return null;
    return selectedColor.sizes?.find(
      (s: any) => Number(s.size) === Number(selectedSize)
    );
  }, [selectedColor, selectedSize]);

  const remainingStock = selectedSizeEntry?.stock ?? 0;

  const availableSizes = useMemo(() => {
    if (!selectedColor?.sizes) return [];
    return selectedColor.sizes
      .filter((s: any) => Number(s.stock) > 0)
      .map((s: any) => s.size);
  }, [selectedColor]);

  const unitPrice = useMemo(
    () => (promotion ? promotion.newPrice : product?.price || 0),
    [promotion, product?.price]
  );

  const total = useMemo(
    () => (product ? unitPrice * quantity + deliveryPrice : 0),
    [deliveryPrice, product, quantity, unitPrice]
  );

  const isOutOfStock = useMemo(
    () => !selectedSize || remainingStock <= 0 || quantity > remainingStock,
    [quantity, remainingStock, selectedSize]
  );

  /* ================= EFFECTS ================= */

  const fetchZones = useCallback(async () => {
    const cacheKey = 'delivery_zones_v1';
    const cacheRaw = typeof window !== 'undefined'
      ? sessionStorage.getItem(cacheKey)
      : null;

    if (cacheRaw) {
      const cache = JSON.parse(cacheRaw);
      const isFresh = Date.now() - cache.timestamp < REVALIDATE_MS;
      if (isFresh) {
        setZones(cache.zones || []);
        return;
      }
    }

    const snap = await getDocs(collection(db, 'delivery_zones'));
    const data = snap.docs.map(d => d.data()) as DeliveryZone[];
    const sorted = data.sort((a, b) => a.wilaya.localeCompare(b.wilaya));
    setZones(sorted);

    if (typeof window !== 'undefined') {
      sessionStorage.setItem(
        cacheKey,
        JSON.stringify({
          timestamp: Date.now(),
          zones: sorted,
        })
      );
    }
  },[]);

  const fetchProduct = useCallback(async () => {
    try {
      const cacheKey = `checkout_${productId}`;
      const cacheRaw = typeof window !== 'undefined'
        ? sessionStorage.getItem(cacheKey)
        : null;

      if (cacheRaw) {
        const cache = JSON.parse(cacheRaw);
        const isFresh = Date.now() - cache.timestamp < REVALIDATE_MS;
        if (isFresh) {
          setProduct(cache.product || null);
          setPromotion(cache.promotion || null);
          setBrand(cache.brand || null);
          setRelated(cache.related || []);
          setSelectedColorId(cache.product?.colors?.[0]?.colorId || '');
          setLoading(false);
          return;
        }
      }

      const snap = await getDoc(doc(db, 'products', productId));
      if (!snap.exists()) {
        toast.error('Produit introuvable');
        router.push('/catalog');
        return;
      }

      const data = { id: snap.id, ...snap.data() } as Product;
      setProduct(data);
      setSelectedColorId(data.colors?.[0]?.colorId || '');

      const promoQuery = query(
        collection(db, 'promotions'),
        where('productId', '==', data.id),
        where('active', '==', true),
        limit(1)
      );

      const [promoSnap, brandSnap] = await Promise.all([
        getDocs(promoQuery),
        getDoc(doc(db, 'brands', data.brandId)),
      ]);

      if (!promoSnap.empty) {
        setPromotion({
          id: promoSnap.docs[0].id,
          ...promoSnap.docs[0].data(),
        });
      } else {
        setPromotion(null);
      }

      if (brandSnap.exists()) {
        setBrand({ id: brandSnap.id, ...brandSnap.data() } as Brand);
      }

      const relatedQuery = query(
        collection(db, 'products'),
        where('categoryId', '==', data.categoryId),
        limit(6)
      );
      const relatedSnap = await getDocs(relatedQuery);
      const relatedItems = relatedSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as Product))
        .filter(p => p.id !== data.id);

      setRelated(relatedItems);

      if (typeof window !== 'undefined') {
        sessionStorage.setItem(
          cacheKey,
          JSON.stringify({
            timestamp: Date.now(),
            product: data,
            promotion: !promoSnap.empty
              ? {
                  id: promoSnap.docs[0].id,
                  ...promoSnap.docs[0].data(),
                }
              : null,
            brand: brandSnap.exists()
              ? { id: brandSnap.id, ...brandSnap.data() }
              : null,
            related: relatedItems,
          })
        );
      }
    } catch {
      toast.error('Erreur de chargement du produit');
    } finally {
      setLoading(false);
    }
  },[productId, router]);

  useEffect(() => {
    fetchProduct();
    fetchZones();
  }, [fetchProduct, fetchZones]);
  /* ================= META + TIKTOK – INITIATE CHECKOUT ================= */

useEffect(() => {
  if (!product) return;

  let cancelled = false;
  let idleCallbackId: number | null = null;
  let fallbackIdleTimeoutId: ReturnType<typeof setTimeout> | null = null;
  let retryId: ReturnType<typeof setTimeout> | null = null;
  let retries = 0;

  const fireEvents = () => {
    if (cancelled) return;

    const fbq = (window as any).fbq;
    const ttq = (window as any).ttq;

    if (!fbq || !ttq) {
      if (retries < 12) {
        retries += 1;
        retryId = setTimeout(fireEvents, 250);
      }
      return;
    }

    fbq('track', 'InitiateCheckout', {
      content_name: product.name,
      content_ids: [product.id],
      content_type: 'product',
      value: promotion ? promotion.newPrice : product.price,
      currency: 'DZD',
    });

    ttq.track('InitiateCheckout', {
      content_id: product.id,
      content_name: product.name,
      content_type: 'product',
      value: product.price,
      currency: 'DZD',
    });
  };

  if ('requestIdleCallback' in window) {
    idleCallbackId = window.requestIdleCallback(fireEvents);
  } else {
    fallbackIdleTimeoutId = setTimeout(fireEvents, 200);
  }

  return () => {
    cancelled = true;

    if (idleCallbackId !== null) {
      if ('cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleCallbackId);
      }
    }

    if (fallbackIdleTimeoutId !== null) {
      clearTimeout(fallbackIdleTimeoutId);
    }

    if (retryId !== null) {
      clearTimeout(retryId);
    }
  };
}, [product, promotion]);

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [selectedColorId]);


  /* ================= SUBMIT ================= */

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (isOutOfStock) {
      toast.error('المنتج غير متوفر / Produit en rupture de stock');
      return;
    }

    setSubmitting(true);

    try {
      const orderData = {
        product: {
          id: product!.id,
          name: product!.name,
          brandId: product!.brandId,
          brandName: brand?.name || '',
         price: promotion ? promotion.newPrice : product!.price,
          image: displayImage,
        },
        variant: {
          colorId: selectedColor!.colorId,
          colorName: selectedColor!.name,
          size: selectedSize,
        },
        quantity,
        customer: {
          fullName,
          phone,
          wilaya,
          city: selectedZone?.city || '',
          addressDetails,
        },
        delivery: {
          type: deliveryType,
          price: deliveryPrice,
          delay: selectedZone?.delay,
        },
        notes,
        total,
      };

      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error);

      router.push(`/thank-you?order=${json.orderNumber}&total=${total}`);
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la commande');
    } finally {
      setSubmitting(false);
    }
  },[
    addressDetails,
    brand?.name,
    deliveryPrice,
    deliveryType,
    displayImage,
    fullName,
    isOutOfStock,
    notes,
    phone,
    product,
    promotion,
    quantity,
    router,
    selectedColor,
    selectedSize,
    selectedZone?.city,
    selectedZone?.delay,
    total,
    wilaya
  ]);

  const handleSelectImage = useCallback((index: number) => {
    setSelectedImageIndex(index);
  },[]);

  /* ================= RENDER ================= */

  if (loading) {
    return (
      <>
        <Navbar />
        <PromoBanner />
        <main className="min-h-screen bg-leather-beige py-8">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-pulse">
              <div className="order-2 lg:order-1 lg:col-span-7 space-y-6">
                <div className="h-56 bg-white rounded border" />
                <div className="h-56 bg-white rounded border" />
                <div className="h-12 bg-white rounded border" />
              </div>
              <div className="order-1 lg:order-2 lg:col-span-5">
                <div className="h-[620px] bg-white rounded border" />
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!product) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-leather-beige py-8">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-2xl font-semibold text-leather-dark mb-4">
              Produit introuvable
            </h1>
            <Link href="/catalog" className="underline text-leather-brown">
              Retour au catalogue
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <PromoBanner />
    
      <main className="min-h-screen bg-leather-beige py-8">
        <div className="container mx-auto px-4">
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            {/* LEFT */}
            <div className="order-2 lg:order-1 lg:col-span-7 space-y-6">
      
              {/* CLIENT */}
              <Card>
                <CardHeader>
                  <CardTitle>Informations client</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input placeholder="Nom complet *" value={fullName} onChange={e => setFullName(e.target.value)} />
                  <Input placeholder="Téléphone *" value={phone} onChange={e => setPhone(e.target.value)} />
                </CardContent>
              </Card>

              {/* DELIVERY */}
              <Card>
                <CardHeader>
                  <CardTitle>Livraison</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select value={wilaya} onValueChange={setWilaya}>
                    <SelectTrigger><SelectValue placeholder="Wilaya *" /></SelectTrigger>
                    <SelectContent>
                      {zones.map(z => (
                        <SelectItem key={z.wilaya} value={z.wilaya}>{z.wilaya}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={deliveryType} onValueChange={v => setDeliveryType(v as any)}>
                    <SelectTrigger><SelectValue placeholder="Type de livraison" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="home">Domicile</SelectItem>
                      <SelectItem value="stopdesk">Stop Desk</SelectItem>
                    </SelectContent>
                  </Select>

                  {selectedZone && (
                    <p className="text-sm text-gray-600">
                      Frais de livraison : <strong>{formatPrice(deliveryPrice)}</strong>
                    </p>
                  )}

                  <Textarea placeholder="Adresse complète *" value={addressDetails} onChange={e => setAddressDetails(e.target.value)} />
                </CardContent>
              </Card>

              <Button
                type="submit"
                disabled={submitting || isOutOfStock}
                className="w-full bg-red-500 hover:bg-red-600 text-white"
              >
                {submitting ? 'Traitement...' : 'Confirmer la commande'}
              </Button>
            </div>

            {/* RIGHT */}
            <div className="order-1 lg:order-2 lg:col-span-5">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle>Produit</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                 <div
  className="relative aspect-square bg-white border rounded flex items-center justify-center cursor-zoom-in overflow-hidden"
  onClick={() => setZoomOpen(true)}
>
  {/* PROMO BADGE */}
  {promotion?.discount && (
    <div className="absolute top-3 left-3 z-10 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
      🔥 PROMO
    </div>
  )}

  <Image
    src={getOptimizedImage(displayImage, 900) || '/placeholder.png'}
    alt={product.name}
    fill
    priority
    fetchPriority="high"
    sizes="(max-width: 1024px) 100vw, 42vw"
    quality={62}
    placeholder="blur"
    blurDataURL={BLUR_DATA_URL}
    className="object-contain"
  />
</div>

                  {colorImages.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto">
                      {colorImages.map((img: any, i: number) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSelectImage(i)}
                          className={`w-16 h-16 border rounded bg-white flex items-center justify-center
                            ${selectedImageIndex === i ? 'ring-2 ring-black' : ''}`}
                        >
                          <div className="relative w-14 h-14">
                            <Image
                              src={getOptimizedImage(img.url, 180) || '/placeholder.png'}
                              alt={`${product.name}-${i + 1}`}
                              fill
                              loading="lazy"
                              sizes="56px"
                              quality={40}
                              placeholder="blur"
                              blurDataURL={BLUR_DATA_URL}
                              className="object-contain"
                            />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  <div>
                    <Label>Couleur</Label>
                    <Select value={selectedColorId} onValueChange={v => { setSelectedColorId(v); setSelectedSize(0); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {product.colors?.map(c => (
                          <SelectItem key={c.colorId} value={c.colorId}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Pointure</Label>
                    <Select value={selectedSize ? String(selectedSize) : ''} onValueChange={v => setSelectedSize(Number(v))}>
                      <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                      <SelectContent>
                        {availableSizes.map(s => (
                          <SelectItem key={s} value={String(s)}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Quantité</Label>
                    <Input type="number" min={1} value={quantity} onChange={e => setQuantity(Number(e.target.value))} />
                  </div>

                  <div className="border-t pt-3 font-bold">
                    Total : {formatPrice(total)}
                  </div>
                </CardContent>
              </Card>
            </div>
          </form>

          {/* RELATED */}
          {related.length > 0 && (
            <section className="mt-14">
              <h3 className="text-xl font-semibold mb-6">
                You may also like
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {related.map(p => (
                  <div
                    key={p.id}
                    onClick={() => router.push(`/checkout/${p.id}`)}
                    className="cursor-pointer bg-white rounded border p-3 hover:shadow"
                  >
                    <div className="relative aspect-square mb-2">
                      <Image
                        src={getOptimizedImage(p.colors?.[0]?.images?.[0]?.url ?? '', 400) || '/placeholder.png'}
                        alt={p.name}
                        fill
                        loading="lazy"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        quality={46}
                        placeholder="blur"
                        blurDataURL={BLUR_DATA_URL}
                        className="object-contain"
                      />
                    </div>
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-sm font-bold text-red-600">
                      {formatPrice(p.price)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
        <DialogContent className="max-w-4xl bg-white">
          <div className="relative w-full aspect-square">
            <Image
              src={getOptimizedImage(displayImage, 1200) || '/placeholder.png'}
              alt={product.name}
              fill
              loading="lazy"
              sizes="90vw"
              quality={62}
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
              className="object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </>
  );
}
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
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

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

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

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  /* ================= STATE ================= */

  const [product, setProduct] = useState<Product | null>(null);
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

  const selectedZone = zones.find(z => z.wilaya === wilaya);

  const deliveryPrice = selectedZone
    ? deliveryType === 'home'
      ? selectedZone.home
      : selectedZone.stopdesk
    : 0;

  const selectedColor =
    product?.colors?.find(c => c.colorId === selectedColorId) || null;

  const colorImages = selectedColor?.images || [];

  const displayImage =
    colorImages[selectedImageIndex]?.url ||
    product?.colors?.[0]?.images?.[0]?.url ||
    '/placeholder.png';

  const selectedSizeEntry = useMemo(() => {
    if (!selectedColor || !selectedSize) return null;
    return selectedColor.sizes?.find(
      (s: any) => Number(s.size) === Number(selectedSize)
    );
  }, [selectedColor, selectedSize]);

  const remainingStock = selectedSizeEntry?.stock ?? 0;

  const remainingAfterSelection = Math.max(
    remainingStock - quantity,
    0
  );

  const availableSizes = useMemo(() => {
    if (!selectedColor?.sizes) return [];
    return selectedColor.sizes
      .filter((s: any) => Number(s.stock) > 0)
      .map((s: any) => s.size);
  }, [selectedColor]);

  const total =
    product ? product.price * quantity + deliveryPrice : 0;

  const isOutOfStock =
    !selectedSize || remainingStock <= 0 || quantity > remainingStock;

  /* ================= EFFECTS ================= */

  useEffect(() => {
    fetchProduct();
    fetchZones();
  }, [productId]);
  /* ================= META + TIKTOK – INITIATE CHECKOUT ================= */

useEffect(() => {
  if (!product) return;

  // ✅ Facebook InitiateCheckout
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('track', 'InitiateCheckout', {
      content_name: product.name,
      content_ids: [product.id],
      content_type: 'product',
      value: product.price,
      currency: 'DZD',
    });
  }

  // ✅ TikTok InitiateCheckout
  if (typeof window !== 'undefined' && (window as any).ttq) {
    (window as any).ttq.track('InitiateCheckout', {
      content_id: product.id,
      content_name: product.name,
      content_type: 'product',
      value: product.price,
      currency: 'DZD',
    });
  }

}, [product]);

  /* ================= PRELOAD IMAGES ================= */

  useEffect(() => {
    if (!colorImages.length) return;
    colorImages.forEach(img => {
      const i = new Image();
      i.src = img.url;
    });
  }, [colorImages]);

  /* ================= FETCH PRODUCT ================= */

  const fetchProduct = async () => {
    try {
      const snap = await getDoc(doc(db, 'products', productId));
      if (!snap.exists()) {
        toast.error('Produit introuvable');
        router.push('/catalog');
        return;
      }

      const data = { id: snap.id, ...snap.data() } as Product;
      setProduct(data);

      setSelectedColorId(data.colors?.[0]?.colorId || '');

      const brandSnap = await getDoc(doc(db, 'brands', data.brandId));
      if (brandSnap.exists()) {
        setBrand({ id: brandSnap.id, ...brandSnap.data() } as Brand);
      }

      fetchRelated(data.categoryId, data.id);
    } catch {
      toast.error('Erreur de chargement du produit');
    } finally {
      setLoading(false);
    }
  };

  /* ================= FETCH RELATED ================= */

  const fetchRelated = async (categoryId: string, currentId: string) => {
    const q = query(
      collection(db, 'products'),
      where('categoryId', '==', categoryId),
      limit(6)
    );
    const snap = await getDocs(q);
    const items = snap.docs
      .map(d => ({ id: d.id, ...d.data() } as Product))
      .filter(p => p.id !== currentId);
    setRelated(items);
  };

  /* ================= FETCH ZONES ================= */

  const fetchZones = async () => {
    const snap = await getDocs(collection(db, 'delivery_zones'));
    const data = snap.docs.map(d => d.data()) as DeliveryZone[];
    setZones(data.sort((a, b) => a.wilaya.localeCompare(b.wilaya)));
  };

  /* ================= SUBMIT ================= */

  const handleSubmit = async (e: React.FormEvent) => {
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
          price: product!.price,
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
  };

  /* ================= RENDER ================= */

  if (loading || !product) return null;

  return (
    <>
      <Navbar />

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
                    className="aspect-square bg-white border rounded flex items-center justify-center cursor-zoom-in"
                    onClick={() => setZoomOpen(true)}
                  >
                    <img src={displayImage} className="object-contain max-h-full" />
                  </div>

                  {colorImages.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto">
                      {colorImages.map((img: any, i: number) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setSelectedImageIndex(i)}
                          className={`w-16 h-16 border rounded bg-white flex items-center justify-center
                            ${selectedImageIndex === i ? 'ring-2 ring-black' : ''}`}
                        >
                          <img src={img.url} className="object-contain max-h-full" />
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
                    <img
                      src={p.colors?.[0]?.images?.[0]?.url}
                      className="aspect-square object-contain mb-2"
                    />
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
          <img src={displayImage} className="w-full object-contain" />
        </DialogContent>
      </Dialog>

      <Footer />
    </>
  );
}
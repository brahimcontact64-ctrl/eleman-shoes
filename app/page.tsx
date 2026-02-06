'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Product, Brand } from '@/lib/types';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';
import ProductCard from '@/components/ProductCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Truck, Shield, Star, Zap } from 'lucide-react';

interface SiteSettings {
  heroImage: string;
  heroTitle: string;
  heroSubtitle: string;
  heroCtaText: string;
  whatsappNumber: string;
}

const defaultSettings: SiteSettings = {
  heroImage: '/whatsapp_image_2026-02-03_at_11.14.37.jpeg',
  heroTitle: "Chaussures en cuir d'exception",
  heroSubtitle: 'Élégance, confort et qualité pour toute la famille',
  heroCtaText: 'Commander via WhatsApp',
  whatsappNumber: '',
};

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Map<string, Brand>>(new Map());
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const settingsDoc = await getDoc(doc(db, 'site_settings', 'main'));
      if (settingsDoc.exists()) {
        setSettings({ ...defaultSettings, ...settingsDoc.data() } as SiteSettings);
      }

      const brandsSnapshot = await getDocs(query(collection(db, 'brands')));
      const brandsMap = new Map<string, Brand>();
      brandsSnapshot.forEach((doc) => {
        brandsMap.set(doc.id, { id: doc.id, ...doc.data() } as Brand);
      });
      setBrands(brandsMap);

      const productsSnapshot = await getDocs(
        query(collection(db, 'products'), where('isActive', '==', true), limit(8))
      );
      setProducts(
        productsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Product[]
      );
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />

      <main>
        {/* ================= HERO ================= */}
        <section className="relative h-[100svh] md:h-[700px] w-full overflow-hidden">
          <img
            src={settings.heroImage}
            alt="Chaussures en cuir"
            className="absolute inset-0 w-full h-full object-cover"
          />

          <div className="absolute inset-0 bg-black/45 md:bg-gradient-to-r md:from-black/50 md:via-black/30 md:to-transparent" />

          <div className="relative z-10 h-full container mx-auto px-4 flex items-center">
            <div className="max-w-2xl text-white text-center md:text-left">
              <h1 className="text-3xl md:text-6xl lg:text-7xl font-serif font-bold mb-6 drop-shadow-lg">
                {settings.heroTitle}
              </h1>
              <p className="text-lg md:text-2xl mb-8 opacity-90">
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
        </section>

        {/* ================= PRODUCTS (تحت الهيرو مباشرة) ================= */}
        <section className="py-16 bg-leather-beige">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-10 text-leather-dark">
              Produits Populaires
            </h2>

            {loading ? (
              <div className="text-center py-12">Loading…</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} brand={brands.get(p.brandId)} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ================= FEATURES (تجي بعد المنتجات) ================= */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Star, title: 'Large Sélection', text: 'Des centaines de modèles pour tous les styles et occasions' },
              { icon: Shield, title: 'Qualité Premium', text: 'Chaussures en cuir véritable de haute qualité' },
              { icon: Truck, title: 'Livraison Rapide', text: 'Livraison dans toute l’Algérie sous 48–72h' },
              { icon: Zap, title: 'Paiement Sécurisé', text: 'Paiement à la livraison pour votre sécurité' },
            ].map(({ icon: Icon, title, text }) => (
              <Card key={title} className="bg-leather-beige/50 text-center shadow-sm">
                <CardContent className="p-6">
                  <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-leather-light/30 flex items-center justify-center">
                    <Icon className="h-7 w-7 text-leather-brown" />
                  </div>
                  <h3 className="font-semibold mb-2 text-leather-dark">{title}</h3>
                  <p className="text-leather-gray">{text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <Footer />
      <WhatsAppButton />
    </>
  );
}
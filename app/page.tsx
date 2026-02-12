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
 import { orderBy } from 'firebase/firestore';

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

      const brandsSnapshot = await getDocs(collection(db, 'brands'));
      const brandsMap = new Map<string, Brand>();
      brandsSnapshot.forEach((doc) => {
        brandsMap.set(doc.id, { id: doc.id, ...doc.data() } as Brand);
      });
      setBrands(brandsMap);

     

const productsSnapshot = await getDocs(
  query(
    collection(db, 'products'),
    where('isActive', '==', true),
    orderBy('createdAt', 'asc'), 
    limit(8)
  )
);

      setProducts(
        productsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Product[]
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

      <main className="bg-leather-beige">

        {/* ================= HERO (FIXED FINAL) ================= */}
        <section className="relative w-full h-[100svh] md:h-[700px]">
          <img
            src={settings.heroImage}
            alt="Chaussures en cuir"
            className="absolute inset-0 w-full h-full object-cover"
          />

          <div className="absolute inset-0 bg-black/40" />

          <div className="relative z-10 h-full flex items-center">
            <div className="container mx-auto px-4 text-white text-center md:text-left">
              <div className="max-w-xl">
                <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-serif font-bold mb-4 drop-shadow-lg">
                  {settings.heroTitle}
                </h1>

                <p className="text-lg md:text-2xl mb-6 drop-shadow-md">
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
          </div>
        </section>

        {/* ================= PRODUCTS ================= */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4 text-leather-dark">
                Produits Populaires
              </h2>
              <p className="text-xl text-leather-gray">
                Découvrez nos meilleures ventes
              </p>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-leather-brown" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    brand={brands.get(product.brandId)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ================= FEATURES ================= */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Feature icon={Star} title="Large Sélection" text="Des centaines de modèles pour tous les styles et occasions" />
            <Feature icon={Shield} title="Qualité Premium" text="Chaussures en cuir véritable de haute qualité" />
            <Feature icon={Truck} title="Livraison Rapide" text="Livraison dans toute l’Algérie sous 48–72h" />
            <Feature icon={Zap} title="Paiement Sécurisé" text="Paiement à la livraison pour votre sécurité" />
          </div>
        </section>

        {/* ================= CTA ================= */}
        <section className="py-20 bg-gradient-to-br from-leather-brown to-leather-coffee text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-4xl font-bold mb-6">Prêt à Commander ?</h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
              Contactez-nous dès maintenant pour passer votre commande
            </p>
            <Link href="/contact">
              <Button size="lg" className="bg-white text-leather-dark hover:bg-leather-beige">
                Nous Contacter
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
      <WhatsAppButton />
    </>
  );
}

function Feature({ icon: Icon, title, text }: any) {
  return (
    <Card className="bg-leather-beige/50 text-center">
      <CardContent className="p-6">
        <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-leather-light/30 flex items-center justify-center">
          <Icon className="h-8 w-8 text-leather-brown" />
        </div>
        <h3 className="text-xl font-semibold mb-2 text-leather-dark">{title}</h3>
        <p className="text-leather-gray">{text}</p>
      </CardContent>
    </Card>
  );
}
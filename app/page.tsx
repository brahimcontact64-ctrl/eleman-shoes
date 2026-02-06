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

      const brandsSnapshot = await getDocs(collection(db, 'brands'));
      const brandsMap = new Map<string, Brand>();
      brandsSnapshot.forEach((doc) => {
        brandsMap.set(doc.id, { id: doc.id, ...doc.data() } as Brand);
      });
      setBrands(brandsMap);

      const productsSnapshot = await getDocs(
        query(collection(db, 'products'), where('isActive', '==', true), limit(8))
      );

      setProducts(
        productsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Product[]
      );
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />

      <main>
        {/* ================= HERO ================= */}
        <section className="relative min-h-[90vh] md:h-[700px] overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <img
              src={settings.heroImage}
              alt="Chaussures en cuir de qualité"
              className="
                w-full h-full
                object-contain md:object-cover
                object-center
              "
            />
            <div className="absolute inset-0 bg-black/30 md:bg-gradient-to-r md:from-black/40 md:via-black/30 md:to-transparent"></div>
          </div>

          <div className="relative container mx-auto px-4 h-full flex items-end md:items-center pb-24 md:pb-0">
            <div className="max-w-xl text-white text-center md:text-left">
              <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-serif font-bold mb-4 leading-tight drop-shadow-lg">
                {settings.heroTitle}
              </h1>

              <p className="text-lg md:text-2xl mb-6 drop-shadow-md font-light">
                {settings.heroSubtitle}
              </p>

              <a
                href={`https://wa.me/${settings.whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block"
              >
                <Button
                  size="lg"
                  className="bg-leather-coffee hover:bg-leather-dark text-white text-lg px-8 py-5 rounded-full shadow-xl transition-transform hover:scale-105"
                >
                  {settings.heroCtaText}
                </Button>
              </a>
            </div>
          </div>
        </section>

        {/* ================= FEATURES ================= */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <Card className="border-leather-light/30 hover:shadow-lg transition-shadow bg-leather-beige/50">
                <CardContent className="p-6 text-center">
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-leather-light/30 flex items-center justify-center">
                      <Star className="h-8 w-8 text-leather-brown" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-leather-dark">Large Sélection</h3>
                  <p className="text-leather-gray">
                    Des centaines de modèles pour tous les styles et occasions
                  </p>
                </CardContent>
              </Card>

              <Card className="border-leather-light/30 hover:shadow-lg transition-shadow bg-leather-beige/50">
                <CardContent className="p-6 text-center">
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-leather-light/30 flex items-center justify-center">
                      <Shield className="h-8 w-8 text-leather-brown" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-leather-dark">Qualité Premium</h3>
                  <p className="text-leather-gray">
                    Chaussures en cuir véritable de haute qualité
                  </p>
                </CardContent>
              </Card>

              <Card className="border-leather-light/30 hover:shadow-lg transition-shadow bg-leather-beige/50">
                <CardContent className="p-6 text-center">
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-leather-light/30 flex items-center justify-center">
                      <Truck className="h-8 w-8 text-leather-brown" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-leather-dark">Livraison Rapide</h3>
                  <p className="text-leather-gray">
                    Livraison dans toute l&apos;Algérie sous 48-72h
                  </p>
                </CardContent>
              </Card>

              <Card className="border-leather-light/30 hover:shadow-lg transition-shadow bg-leather-beige/50">
                <CardContent className="p-6 text-center">
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-leather-light/30 flex items-center justify-center">
                      <Zap className="h-8 w-8 text-leather-brown" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-leather-dark">Paiement Sécurisé</h3>
                  <p className="text-leather-gray">
                    Paiement à la livraison pour votre sécurité
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* ================= PRODUCTS ================= */}
        <section className="py-16 bg-leather-beige">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4 text-leather-dark">Produits Populaires</h2>
              <p className="text-xl text-leather-gray">Découvrez nos meilleures ventes</p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-leather-brown"></div>
              </div>
            ) : products.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    brand={brands.get(product.brandId)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-xl text-leather-gray">
                  Aucun produit disponible pour le moment
                </p>
              </div>
            )}

            <div className="text-center mt-12">
              <Link href="/catalog">
                <Button size="lg" className="bg-leather-brown hover:bg-leather-coffee text-white">
                  Voir Tous les Produits
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* ================= CTA ================= */}
        <section className="py-20 bg-gradient-to-br from-leather-brown to-leather-coffee text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-4xl font-bold mb-6">Prêt à Commander ?</h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
              Contactez-nous dès maintenant pour passer votre commande ou pour toute question
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/catalog">
                <Button
                  size="lg"
                  variant="secondary"
                  className="w-full sm:w-auto text-lg px-8 bg-white text-leather-dark hover:bg-leather-beige"
                >
                  Parcourir le Catalogue
                </Button>
              </Link>
              <Link href="/contact">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto text-lg px-8 bg-transparent border-2 border-white text-white hover:bg-white hover:text-leather-coffee"
                >
                  Nous Contacter
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <WhatsAppButton />
    </>
  );
}
'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { SiteSettings } from '@/lib/types';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Phone,
  Mail,
  MessageCircle,
  Facebook,
  Instagram,
} from 'lucide-react';

import { SiTiktok } from 'react-icons/si';

export default function ContactPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const snap = await getDoc(doc(db, 'site_settings', 'main'));
        if (snap.exists()) {
          setSettings(snap.data() as SiteSettings);
        }
      } catch (err) {
        console.error('Error loading site settings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-leather-beige">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-leather-brown" />
      </div>
    );
  }

  /* ================= FALLBACK ================= */
  if (!settings) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center text-leather-dark">
          Configuration du site indisponible
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-leather-beige">
        <div className="container mx-auto px-4 py-14">
          <h1 className="text-3xl md:text-4xl font-bold mb-10 text-center text-leather-dark">
            Contactez-nous
          </h1>

          {/* ================= CONTACT CARDS ================= */}
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* PHONE */}
            {settings.whatsappNumber && (
              <Card className="border-leather-light/20 transition hover:shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-5 w-5 text-leather-brown" />
                    Téléphone
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <a
                    href={`tel:${settings.whatsappNumber}`}
                    className="text-lg text-leather-brown hover:text-leather-coffee"
                  >
                    {settings.whatsappNumber}
                  </a>
                </CardContent>
              </Card>
            )}

            {/* WHATSAPP */}
            {settings.whatsapp && (
              <Card className="border-leather-light/20 transition hover:shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-green-600" />
                    WhatsApp
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <a
                    href={`https://wa.me/${settings.whatsapp.replace('+', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lg text-green-600 hover:underline"
                  >
                    {settings.whatsapp}
                  </a>
                </CardContent>
              </Card>
            )}

            {/* EMAIL */}
            {settings.email && (
              <Card className="border-leather-light/20 transition hover:shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-leather-brown" />
                    Email
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <a
                    href={`mailto:${settings.email}`}
                    className="text-lg text-leather-brown hover:text-leather-coffee"
                  >
                    {settings.email}
                  </a>
                </CardContent>
              </Card>
            )}

            {/* SOCIAL MEDIA */}
            {settings.socialMedia && (
              <Card className="border-leather-light/20 transition hover:shadow-lg">
                <CardHeader>
                  <CardTitle>Réseaux sociaux</CardTitle>
                </CardHeader>

                <CardContent className="flex gap-6 justify-start items-center">
                  {settings.socialMedia.facebook && (
                    <a
                      href={settings.socialMedia.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-leather-brown hover:text-blue-600 transition-transform hover:scale-110"
                    >
                      <Facebook className="h-8 w-8" />
                    </a>
                  )}

                  {settings.socialMedia.instagram && (
                    <a
                      href={settings.socialMedia.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-leather-brown hover:text-pink-600 transition-transform hover:scale-110"
                    >
                      <Instagram className="h-8 w-8" />
                    </a>
                  )}

                  {settings.socialMedia.tiktok && (
                    <a
                      href={settings.socialMedia.tiktok}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-leather-brown hover:text-black transition-transform hover:scale-110"
                    >
                      <SiTiktok size={28} />
                    </a>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* ================= OPENING HOURS ================= */}
          <div className="max-w-4xl mx-auto mt-14">
            <Card className="border-leather-light/20">
              <CardHeader>
                <CardTitle>Horaires d&apos;ouverture</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-leather-gray">
                <div className="flex justify-between">
                  <span>Samedi - Jeudi</span>
                  <span className="font-medium text-leather-dark">
                    8:00 - 18:00
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Vendredi</span>
                  <span className="font-medium text-leather-dark">
                    Fermé
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
      <WhatsAppButton />
    </>
  );
}
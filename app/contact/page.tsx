'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { SiteSettings } from '@/lib/types';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, Mail, MessageCircle, Facebook, Instagram } from 'lucide-react';

export default function ContactPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, 'site_settings', 'main'));
        if (settingsDoc.exists()) {
          setSettings(settingsDoc.data() as SiteSettings);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-leather-beige">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-leather-brown"></div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-leather-beige">
        <div className="container mx-auto px-4 py-16">
          <h1 className="text-4xl font-bold mb-8 text-center text-leather-dark">Contactez-nous</h1>

          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
            {settings?.contact.phone && (
              <Card className="border-leather-light/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-leather-dark">
                    <Phone className="h-5 w-5 text-leather-brown" />
                    Téléphone
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <a
                    href={`tel:${settings.contact.phone}`}
                    className="text-lg text-leather-brown hover:text-leather-coffee transition-colors"
                  >
                    {settings.contact.phone}
                  </a>
                </CardContent>
              </Card>
            )}

            {settings?.contact.whatsapp && (
              <Card className="border-leather-light/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-leather-dark">
                    <MessageCircle className="h-5 w-5 text-leather-brown" />
                    WhatsApp
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <a
                    href={`https://wa.me/${settings.contact.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lg text-leather-brown hover:text-leather-coffee transition-colors"
                  >
                    {settings.contact.whatsapp}
                  </a>
                </CardContent>
              </Card>
            )}

            {settings?.contact.email && (
              <Card className="border-leather-light/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-leather-dark">
                    <Mail className="h-5 w-5 text-leather-brown" />
                    Email
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <a
                    href={`mailto:${settings.contact.email}`}
                    className="text-lg text-leather-brown hover:text-leather-coffee transition-colors"
                  >
                    {settings.contact.email}
                  </a>
                </CardContent>
              </Card>
            )}

            {(settings?.contact.facebook || settings?.contact.instagram) && (
              <Card className="border-leather-light/20">
                <CardHeader>
                  <CardTitle className="text-leather-dark">Réseaux sociaux</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    {settings.contact.facebook && (
                      <a
                        href={settings.contact.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-leather-brown hover:text-leather-coffee transition-colors"
                      >
                        <Facebook className="h-8 w-8" />
                      </a>
                    )}
                    {settings.contact.instagram && (
                      <a
                        href={settings.contact.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-leather-brown hover:text-leather-coffee transition-colors"
                      >
                        <Instagram className="h-8 w-8" />
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="max-w-4xl mx-auto mt-12">
            <Card className="border-leather-light/20">
              <CardHeader>
                <CardTitle className="text-leather-dark">Horaires d&apos;ouverture</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-leather-gray">
                  <div className="flex justify-between">
                    <span>Samedi - Jeudi</span>
                    <span className="font-medium text-leather-dark">8:00 - 18:00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Vendredi</span>
                    <span className="font-medium text-leather-dark">Fermé</span>
                  </div>
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

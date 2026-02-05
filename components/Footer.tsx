'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import Link from 'next/link';
import { Phone, Mail, MessageCircle, Facebook, Instagram, Twitter, Youtube, Linkedin } from 'lucide-react';

interface SiteSettings {
  companyName?: string;
  companyPhone?: string;
  companyEmail?: string;
  whatsappNumber?: string;
  footerText?: string;
  logoUrl?: string;
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
    tiktok?: string;
    linkedin?: string;
  };
}

export default function Footer() {
  const [settings, setSettings] = useState<SiteSettings>({
    companyName: 'Eleman Shoes',
    footerText: 'Grossiste de chaussures de qualité en Algérie',
    logoUrl: '/okp.jpeg',
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, 'site_settings', 'main'));
        if (settingsDoc.exists()) {
          setSettings(prev => ({ ...prev, ...settingsDoc.data() }));
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    };

    fetchSettings();
  }, []);

  return (
    <footer className="bg-leather-dark text-leather-beige">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img src={settings.logoUrl} alt={settings.companyName} className="h-16 w-auto object-contain bg-white rounded-lg p-1" />
              <h3 className="text-xl font-bold text-leather-light">{settings.companyName}</h3>
            </div>
            <p className="text-leather-light/70">
              {settings.footerText}
            </p>
          </div>

          <div>
            <h3 className="text-xl font-bold mb-4 text-leather-light">Liens rapides</h3>
            <div className="space-y-2">
              <Link href="/" className="block hover:text-leather-light transition-colors">
                Accueil
              </Link>
              <Link href="/catalog" className="block hover:text-leather-light transition-colors">
                Catalogue
              </Link>
              <Link href="/contact" className="block hover:text-leather-light transition-colors">
                Contact
              </Link>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold mb-4 text-leather-light">Contact</h3>
            <div className="space-y-2 text-leather-light/70">
              {settings.companyPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span>{settings.companyPhone}</span>
                </div>
              )}
              {settings.whatsappNumber && (
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  <span>{settings.whatsappNumber}</span>
                </div>
              )}
              {settings.companyEmail && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>{settings.companyEmail}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {settings.socialMedia && (
          <div className="border-t border-leather-brown/30 mt-8 pt-6">
            <div className="flex justify-center gap-4">
              {settings.socialMedia.facebook && (
                <a
                  href={settings.socialMedia.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-leather-light hover:text-white transition-colors"
                >
                  <Facebook className="h-6 w-6" />
                </a>
              )}
              {settings.socialMedia.instagram && (
                <a
                  href={settings.socialMedia.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-leather-light hover:text-white transition-colors"
                >
                  <Instagram className="h-6 w-6" />
                </a>
              )}
              {settings.socialMedia.twitter && (
                <a
                  href={settings.socialMedia.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-leather-light hover:text-white transition-colors"
                >
                  <Twitter className="h-6 w-6" />
                </a>
              )}
              {settings.socialMedia.youtube && (
                <a
                  href={settings.socialMedia.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-leather-light hover:text-white transition-colors"
                >
                  <Youtube className="h-6 w-6" />
                </a>
              )}
              {settings.socialMedia.linkedin && (
                <a
                  href={settings.socialMedia.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-leather-light hover:text-white transition-colors"
                >
                  <Linkedin className="h-6 w-6" />
                </a>
              )}
            </div>
          </div>
        )}

        <div className="border-t border-leather-brown/30 mt-6 pt-8 text-center text-leather-light/70">
          <p>© 2024 {settings.companyName}. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
}

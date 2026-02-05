'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from './ui/button';
import { Menu, X } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export default function Navbar() {
  const { language, setLanguage, t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [companyName, setCompanyName] = useState('Eleman Shoes');
  const [logoUrl, setLogoUrl] = useState('/okp.jpeg');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, 'site_settings', 'main'));
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          if (data.companyName) setCompanyName(data.companyName);
          if (data.logoUrl) setLogoUrl(data.logoUrl);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    };
    fetchSettings();
  }, []);

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50 border-b border-leather-light/20">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img src={logoUrl} alt={companyName} className="h-12 w-auto object-contain" />
            <span className="text-2xl font-bold text-leather-dark">{companyName}</span>
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-leather-dark hover:text-leather-brown transition-colors font-medium">
              {t('home')}
            </Link>
            <Link href="/catalog" className="text-leather-dark hover:text-leather-brown transition-colors font-medium">
              {t('catalog')}
            </Link>
            <Link href="/contact" className="text-leather-dark hover:text-leather-brown transition-colors font-medium">
              {t('contact')}
            </Link>

            <div className="flex items-center gap-2">
              <Button
                variant={language === 'fr' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLanguage('fr')}
              >
                FR
              </Button>
              <Button
                variant={language === 'ar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLanguage('ar')}
              >
                AR
              </Button>
            </div>
          </div>

          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-4">
            <Link href="/" className="block hover:text-gray-600">
              {t('home')}
            </Link>
            <Link href="/catalog" className="block hover:text-gray-600">
              {t('catalog')}
            </Link>
            <Link href="/contact" className="block hover:text-gray-600">
              {t('contact')}
            </Link>
            <div className="flex gap-2">
              <Button
                variant={language === 'fr' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLanguage('fr')}
              >
                FR
              </Button>
              <Button
                variant={language === 'ar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLanguage('ar')}
              >
                AR
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

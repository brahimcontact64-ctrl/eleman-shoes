'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { MessageCircle } from 'lucide-react';

export default function WhatsAppButton() {
  const [whatsapp, setWhatsapp] = useState<string>('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, 'site_settings', 'main'));
        if (settingsDoc.exists()) {
          const settings = settingsDoc.data();
          if (settings.whatsappNumber) {
            setWhatsapp(settings.whatsappNumber);
          }
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    };

    fetchSettings();
  }, []);

  if (!whatsapp) return null;

  return (
    <a
      href={`https://wa.me/${whatsapp}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 bg-green-500 text-white p-4 rounded-full shadow-lg hover:bg-green-600 transition-colors z-50"
      aria-label="Contact WhatsApp"
    >
      <MessageCircle className="h-6 w-6" />
    </a>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

interface PromotionSettings {
  enabled: boolean;
  title: string;
  subtitle: string;
  endAt: string;
}

export default function PromoBanner() {
  const [promo, setPromo] = useState<PromotionSettings | null>(null);
  const [timeLeft, setTimeLeft] = useState<any>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const snap = await getDoc(doc(db, 'site_settings', 'main'));

      if (snap.exists()) {
        const data = snap.data();

        if (data.promotion?.enabled) {
          setPromo(data.promotion);
        }
      }
    } catch (err) {
      console.error('Promo load error', err);
    }
  };

  useEffect(() => {
    if (!promo?.endAt) return;

    const timer = setInterval(() => {
      const end = new Date(promo.endAt).getTime();
      const now = new Date().getTime();

      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft(null);
        return;
      }

      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [promo]);

  if (!promo) return null;

 return (
  <div className="w-full py-3">
    <div className="container mx-auto px-4">

      <div className="bg-leather-brown shadow-lg/90 text-white py-3 px-5 rounded-2xl shadow-sm
                      flex flex-col md:flex-row items-center justify-between gap-4">

        <div>
          <h2 className="text-lg md:text-xl font-semibold">
            {promo.title}
          </h2>

          {promo.subtitle && (
            <p className="text-sm opacity-80">
              {promo.subtitle}
            </p>
          )}
        </div>

       {timeLeft && (
  <div className="flex flex-col items-center gap-2">

    <div className="flex gap-3 text-center">
      <TimeBox value={timeLeft.days} label="J" />
      <TimeBox value={timeLeft.hours} label="H" />
      <TimeBox value={timeLeft.minutes} label="M" />
      <TimeBox value={timeLeft.seconds} label="S" />
    </div>

    <p className="text-xs opacity-80">
      ⚡ Offre limitée pendant Ramadan
    </p>

  </div>
)}
      </div>

    </div>
  </div>
);
}

function TimeBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="bg-white text-leather-dark px-2 py-2 rounded-lg min-w-[52px]">
      <div className="text-lg font-bold">
        {String(value).padStart(2, '0')}
      </div>
      <div className="text-xs">
        {label}
      </div>
    </div>
  );
}
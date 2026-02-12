'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function ThankYouContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const orderNumber = searchParams.get('order');
  const totalParam = searchParams.get('total');

  const rawName = searchParams.get('name');
  const fullName = rawName ? decodeURIComponent(rawName) : '';

  const total = totalParam ? Number(totalParam) : 0;

  /* ================= META PURCHASE EVENT ================= */

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).fbq && total > 0) {
      (window as any).fbq('track', 'Purchase', {
        content_type: 'product',
        value: total,
        currency: 'DZD',
        order_id: orderNumber || undefined,
      });
    }
  }, [total, orderNumber]);

  /* ================= UI ================= */

  return (
    <>
      <Navbar />

      <main className="min-h-screen flex items-center justify-center bg-leather-beige px-4">
        <Card className="max-w-xl w-full shadow-xl border border-gray-200">
          <CardContent className="p-8 text-center space-y-6">

            <h1 className="text-2xl font-bold text-gray-900">
              Merci pour votre confiance
              {fullName && <span className="text-brown-700">, {fullName}</span>} 🤝
            </h1>

            <p className="text-gray-700">
              Votre commande a été enregistrée avec succès.
            </p>

            {orderNumber && (
              <p className="font-semibold text-gray-800">
                Numéro de commande :
                <span className="text-brown-700"> {orderNumber}</span>
              </p>
            )}

            <p className="text-gray-600">
              Notre équipe vous contactera très prochainement pour confirmer la livraison.
            </p>

            <p className="text-sm text-green-700 font-medium">
              🔍 Vous pouvez vérifier le produit avant le paiement.
            </p>

            <hr className="my-4" />

            <h2 className="text-xl font-bold text-gray-900">
              شكراً على ثقتك بنا
              {fullName && <span className="text-brown-700">، {fullName}</span>} 🤍
            </h2>

            <p className="text-gray-600 leading-relaxed">
              تم تسجيل طلبك بنجاح، وسيتم الاتصال بك قريبًا لتأكيد التوصيل.
              <br />
              يمكنك معاينة السلعة قبل الدفع عند الاستلام.
            </p>

            <Button
              onClick={() => router.push('/')}
              className="w-full bg-[#6b3f2b] hover:bg-[#5a3323] text-white font-semibold py-3 rounded-lg shadow-md transition-all"
            >
              ← Retour à l’accueil | الرجوع للرئيسية
            </Button>

          </CardContent>
        </Card>
      </main>

      <Footer />
    </>
  );
}
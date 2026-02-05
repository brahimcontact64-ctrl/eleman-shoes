'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { db } from '@/lib/firebase/config';

type Order = {
  orderNumber: string;
  createdAt?: any;
  customer?: {
    fullName?: string;
    phone?: string;
    wilaya?: string;
    addressDetails?: string;
  };
  product?: {
    name?: string;
    price?: number;
    quantity?: number;
  };
  variant?: {
    size?: number;
    colorName?: string;
  };
  delivery?: {
    price?: number;
    type?: string;
  };
  total?: number;
};

export default function InvoicePage() {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    const load = async () => {
      const ref = doc(db, 'orders', id as string);
      const snap = await getDoc(ref);
      if (snap.exists()) setOrder(snap.data() as Order);
    };
    load();
  }, [id]);

  if (!order) {
    return <p style={{ padding: 40 }}>Chargement...</p>;
  }

  const date = order.createdAt?.toDate
    ? order.createdAt.toDate().toLocaleString('fr-FR')
    : '';

  const qty = order.product?.quantity ?? 1;
  const productPrice = order.product?.price ?? 0;
  const productTotal = productPrice * qty;
  const deliveryPrice = order.delivery?.price ?? 0;

  return (
    <div style={page}>
      {/* LOGO */}
      <div style={logoBox}>
        <Image
          src="/okp.jpeg"
          alt="Logo"
          width={120}
          height={60}
          style={{ objectFit: 'contain' }}
        />
      </div>

      {/* HEADER */}
      <div style={header}>
        <h1 style={title}>FACTURE</h1>

        <div style={{ display: 'flex', gap: 10 }} className="no-print">
          <button onClick={() => window.print()} style={printBtn}>
            🖨️ Imprimer
          </button>

          <button onClick={() => window.print()} style={downloadBtn}>
            ⬇️ Télécharger
          </button>
        </div>
      </div>

      {/* INFOS */}
      <div style={info}>
        <div>
          <p><b>N° Commande :</b> {order.orderNumber}</p>
          <p><b>Date :</b> {date}</p>
        </div>

        <div>
          <p><b>Client :</b> {order.customer?.fullName}</p>
          <p><b>Téléphone :</b> {order.customer?.phone}</p>
          <p>
            <b>Adresse :</b>{' '}
            {order.customer?.wilaya} {order.customer?.addressDetails}
          </p>
        </div>
      </div>

      {/* PRODUCT DETAILS */}
      <div style={variantBox}>
        <p><b>Couleur :</b> {order.variant?.colorName ?? '-'}</p>
        <p><b>Pointure :</b> {order.variant?.size ?? '-'}</p>
      </div>

      {/* TABLE */}
      <table style={table}>
        <thead>
          <tr>
            <th style={th}>Produit</th>
            <th style={th}>Prix</th>
            <th style={th}>Qté</th>
            <th style={th}>Total</th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td style={td}>{order.product?.name}</td>
            <td style={td}>{productPrice.toLocaleString()} DA</td>
            <td style={td}>{qty}</td>
            <td style={td}>{productTotal.toLocaleString()} DA</td>
          </tr>

          <tr>
            <td style={{ ...td, fontStyle: 'italic' }}>
              Livraison ({order.delivery?.type})
            </td>
            <td style={td}>{deliveryPrice.toLocaleString()} DA</td>
            <td style={td}>1</td>
            <td style={td}>{deliveryPrice.toLocaleString()} DA</td>
          </tr>
        </tbody>
      </table>

      {/* TOTAL */}
      <div style={totalBox}>
        TOTAL : {order.total?.toLocaleString()} DA
      </div>

      {/* FOOTER */}
      <p style={footer}>
        Merci pour votre confiance 🤍
      </p>

      {/* PRINT FIX */}
      <style>
        {`
          @media print {
            .no-print {
              display: none !important;
            }

            body {
              background: white !important;
            }

            @page {
              margin: 20mm;
            }
          }
        `}
      </style>
    </div>
  );
}

/* ================= STYLES ================= */

const page: React.CSSProperties = {
  maxWidth: 900,
  margin: '40px auto',
  padding: 40,
  background: '#fff',
  color: '#000',
  fontFamily: 'Arial, sans-serif',
};

const logoBox: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: 20,
};

const header: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 30,
};

const title: React.CSSProperties = {
  margin: 0,
  fontSize: 28,
  letterSpacing: 1,
};

const printBtn: React.CSSProperties = {
  padding: '8px 16px',
  background: '#000',
  color: '#fff',
  borderRadius: 6,
  border: 'none',
  cursor: 'pointer',
};

const downloadBtn: React.CSSProperties = {
  padding: '8px 16px',
  background: '#555',
  color: '#fff',
  borderRadius: 6,
  border: 'none',
  cursor: 'pointer',
};

const info: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: 20,
  lineHeight: 1.6,
};

const variantBox: React.CSSProperties = {
  display: 'flex',
  gap: 40,
  marginBottom: 20,
  fontSize: 14,
};

const table: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
};

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: 12,
  borderBottom: '2px solid #000',
};

const td: React.CSSProperties = {
  padding: 12,
  borderBottom: '1px solid #ddd',
};

const totalBox: React.CSSProperties = {
  textAlign: 'right',
  marginTop: 30,
  fontSize: 22,
  fontWeight: 'bold',
};

const footer: React.CSSProperties = {
  marginTop: 60,
  textAlign: 'center',
  fontSize: 13,
  color: '#555',
};
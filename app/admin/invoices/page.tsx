'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useRouter } from 'next/navigation';

import AdminLayout from '@/components/admin/AdminLayout';
import ProtectedRoute from '@/components/admin/ProtectedRoute';

type InvoiceFromOrder = {
  id: string;
  orderNumber: string;
  createdAt?: any;
  customer?: {
    fullName?: string;
    phone?: string;
  };
  product?: {
    name?: string;
    price?: number;
    quantity?: number;
  };
  delivery?: {
    price?: number;
    type?: string;
  };
  total?: number;
};

export default function InvoicesPage() {
  const [orders, setOrders] = useState<InvoiceFromOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      const q = query(
        collection(db, 'orders'),
        orderBy('createdAt', 'desc')
      );

      const snap = await getDocs(q);

      const data = snap.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as any),
      }));

      setOrders(data);
      setLoading(false);
    };

    load();
  }, []);

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div style={{ padding: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
            Factures
          </h1>

          {loading && <p>Chargement...</p>}

          {!loading && orders.length === 0 && (
            <p>Aucune facture</p>
          )}

          {!loading && orders.length > 0 && (
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                background: '#fff',
              }}
            >
              <thead>
                <tr>
                  <th style={th}>N° Commande</th>
                  <th style={th}>Client</th>
                  <th style={th}>Produit</th>
                  <th style={th}>Qté</th>
                  <th style={th}>Total</th>
                  <th style={th}>Date</th>
                  <th style={th}>Action</th>
                </tr>
              </thead>

              <tbody>
                {orders.map(order => (
                  <tr key={order.id}>
                    <td style={td}>{order.orderNumber}</td>

                    <td style={td}>
                      {order.customer?.fullName || '—'}
                    </td>

                    <td style={td}>
                      {order.product?.name || '—'}
                    </td>

                    <td style={td}>
                      {order.product?.quantity ?? 1}
                    </td>

                    <td style={td}>
                      {order.total?.toLocaleString()} DA
                    </td>

                    <td style={td}>
                      {order.createdAt?.toDate
                        ? order.createdAt
                            .toDate()
                            .toLocaleString('fr-FR')
                        : '—'}
                    </td>

                    {/* 🖨️ زر الطباعة */}
                    <td style={td}>
                      <button
                        onClick={() =>
                          window.open(
                            `/admin/invoices/${order.id}`,
                            '_blank'
                          )
                        }
                        style={{
                          padding: '6px 12px',
                          background: '#000',
                          color: '#fff',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontSize: 13,
                        }}
                      >
                        🖨️ Imprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}

/* styles */
const th: React.CSSProperties = {
  textAlign: 'left',
  padding: 12,
  borderBottom: '1px solid #ddd',
  fontWeight: 600,
};

const td: React.CSSProperties = {
  padding: 12,
  borderBottom: '1px solid #eee',
};
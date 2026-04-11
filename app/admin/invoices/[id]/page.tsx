'use client';

import { useEffect, useMemo, useState } from 'react';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { db } from '@/lib/firebase/config';
import { DeliveryStatus, Order, OrderStatus } from '@/lib/types';
import ProtectedRoute from '@/components/admin/ProtectedRoute';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/lib/firebase/utils';

const statusLabel = (status: OrderStatus) => {
  const labels: Record<OrderStatus, string> = {
    pending: 'En attente client',
    new: 'Nouvelle',
    confirmed: 'Confirmée',
    cancelled: 'Annulée',
  };

  return labels[status] || 'Inconnu';
};

const deliveryStatusLabel = (status?: DeliveryStatus) => {
  const labels: Record<string, string> = {
    pending: 'En attente',
    preparing: 'Préparation',
    shipped: 'Expédiée',
    on_the_way: 'En route',
    delivered: 'Livrée',
    returned: 'Retournée',
  };

  return labels[status || 'pending'] || 'Inconnu';
};

const formatDate = (timestamp?: Timestamp) => {
  if (!timestamp) return '-';
  return timestamp.toDate().toLocaleString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function AdminInvoicePage() {
  const params = useParams();
  const orderId = params?.id as string | undefined;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!orderId) return;

    const loadOrder = async () => {
      try {
        const orderRef = doc(db, 'orders', orderId);
        const orderSnap = await getDoc(orderRef);

        if (!orderSnap.exists()) {
          setNotFound(true);
          return;
        }

        setOrder({ id: orderSnap.id, ...orderSnap.data() } as Order);
      } catch (error) {
        console.error(error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [orderId]);

  const pricing = useMemo(() => {
    if (!order) {
      return {
        quantity: 1,
        unitPrice: 0,
        productSubtotal: 0,
        deliveryPrice: 0,
        total: 0,
      };
    }

    const quantity = order.quantity || 1;
    const unitPrice = order.product?.price || 0;
    const productSubtotal = unitPrice * quantity;
    const deliveryPrice = order.delivery?.price || 0;
    const total = order.total || productSubtotal + deliveryPrice;

    return {
      quantity,
      unitPrice,
      productSubtotal,
      deliveryPrice,
      total,
    };
  }, [order]);

  if (loading) {
    return (
      <ProtectedRoute>
        <AdminLayout>
          <div className="flex justify-center py-20">
            <div className="animate-spin h-10 w-10 border-b-2 border-black rounded-full" />
          </div>
        </AdminLayout>
      </ProtectedRoute>
    );
  }

  if (notFound || !order) {
    return (
      <ProtectedRoute>
        <AdminLayout>
          <Card className="p-6">
            <h1 className="text-xl font-semibold">Facture introuvable</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Cette commande n&apos;existe pas ou n&apos;est plus disponible.
            </p>
          </Card>
        </AdminLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="max-w-5xl mx-auto space-y-4 pb-10">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between print:hidden">
            <div>
              <h1 className="text-2xl font-bold">Facture</h1>
              <p className="text-sm text-muted-foreground">Commande {order.orderNumber}</p>
            </div>
            <Button onClick={() => window.print()}>Print</Button>
          </div>

          <Card className="p-5 sm:p-8 space-y-8">
            <div className="flex flex-col sm:flex-row gap-6 sm:items-start sm:justify-between border-b pb-6">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Invoice</p>
                <h2 className="text-2xl font-bold mt-1">#{order.orderNumber}</h2>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex gap-2 items-center justify-start sm:justify-end">
                  <span className="text-muted-foreground">Date:</span>
                  <span className="font-medium capitalize">{formatDate(order.createdAt)}</span>
                </div>
                <div className="flex gap-2 items-center justify-start sm:justify-end">
                  <Badge variant="secondary">{statusLabel(order.status)}</Badge>
                  <Badge variant="outline">{deliveryStatusLabel(order.deliveryStatus)}</Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-4">
                <h3 className="font-semibold mb-3">Informations client</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="text-muted-foreground">Nom:</span> {order.customer.fullName}</p>
                  <p><span className="text-muted-foreground">Téléphone:</span> {order.customer.phone}</p>
                  <p><span className="text-muted-foreground">Wilaya:</span> {order.customer.wilaya || '-'}</p>
                  <p><span className="text-muted-foreground">Adresse:</span> {order.customer.addressDetails || '-'}</p>
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="font-semibold mb-3">Informations livraison</h3>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="text-muted-foreground">Type:</span>{' '}
                    {order.delivery.type === 'home' ? 'À domicile' : 'Stop desk'}
                  </p>
                  <p><span className="text-muted-foreground">Frais:</span> {formatPrice(pricing.deliveryPrice)}</p>
                  <p><span className="text-muted-foreground">Statut:</span> {deliveryStatusLabel(order.deliveryStatus)}</p>
                </div>
              </Card>
            </div>

            <Card className="p-4">
              <h3 className="font-semibold mb-4">Produit</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                <p><span className="text-muted-foreground">Nom:</span> {order.product.name}</p>
                <p><span className="text-muted-foreground">Marque:</span> {order.product.brandName || '-'}</p>
                <p><span className="text-muted-foreground">Quantité:</span> {pricing.quantity}</p>
                <p><span className="text-muted-foreground">Pointure:</span> {order.variant?.size ?? '-'}</p>
                <p><span className="text-muted-foreground">Couleur:</span> {order.variant?.colorName ?? '-'}</p>
                <p><span className="text-muted-foreground">Prix unitaire:</span> {formatPrice(pricing.unitPrice)}</p>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-4">Détail des prix</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Sous-total produit</span>
                  <span>{formatPrice(pricing.productSubtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Frais de livraison</span>
                  <span>{formatPrice(pricing.deliveryPrice)}</span>
                </div>
                <div className="flex items-center justify-between border-t pt-3 text-base font-semibold">
                  <span>Total</span>
                  <span>{formatPrice(pricing.total)}</span>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-3">Notes</h3>
              <p className="text-sm text-muted-foreground">{order.notes || 'Aucune note'}</p>
            </Card>
          </Card>
        </div>

        <style>
          {`
            @media print {
              @page {
                size: auto;
                margin: 14mm;
              }

              body {
                background: white !important;
              }
            }
          `}
        </style>
      </AdminLayout>
    </ProtectedRoute>
  );
}
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  collection,
  query,
  getDocs,
  updateDoc,
  doc,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Order, OrderStatus, DeliveryStatus } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { createAuditLog, getUserAgent } from '@/lib/firebase/audit';
import ProtectedRoute from '@/components/admin/ProtectedRoute';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/lib/firebase/utils';
import { Eye, Filter } from 'lucide-react';
import { toast } from 'sonner';

const ORDERS_CACHE_KEY = 'admin_orders_v1';
const ORDERS_CACHE_TTL = 1000 * 60 * 2;

const timeAgo = (timestamp:any)=>{
  if(!timestamp) return ""

  const now = Date.now()
  const orderTime = timestamp.seconds * 1000
  const diff = Math.floor((now - orderTime) / 1000)

  
  if(diff > 21600) return ""

  if(diff < 60) return `il y a ${diff}s`
  if(diff < 3600) return `il y a ${Math.floor(diff/60)} min`
  return `il y a ${Math.floor(diff/3600)} h`
}


const formatDateFR = (timestamp: any) => {
  if (!timestamp) return "-";
  const date = new Date(timestamp.seconds * 1000);

  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
};

export default function AdminOrdersPage() {
  const { user } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
const [note,setNote] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    if (filterStatus === 'all') {
      return orders;
    }

    return orders.filter((order) => order.status === filterStatus);
  }, [filterStatus, orders]);

  const fetchOrders = useCallback(async () => {
    try {
      const cacheRaw = typeof window !== 'undefined'
        ? sessionStorage.getItem(ORDERS_CACHE_KEY)
        : null;

      if (cacheRaw) {
        const cache = JSON.parse(cacheRaw);
        const isFresh = Date.now() - cache.timestamp < ORDERS_CACHE_TTL;

        if (isFresh) {
          setOrders(cache.orders || []);
          setLoading(false);
          return;
        }
      }

      const q = query(
        collection(db, 'orders'),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
      })) as Order[];

      setOrders(data);

      if (typeof window !== 'undefined') {
        sessionStorage.setItem(
          ORDERS_CACHE_KEY,
          JSON.stringify({
            timestamp: Date.now(),
            orders: data,
          })
        );
      }
    } catch (e) {
      console.error(e);
      toast.error('Erreur chargement commandes');
    } finally {
      setLoading(false);
    }
  }, []);

  const patchOrderInState = useCallback((orderId: string, updates: Partial<Order>) => {
    setOrders((prev) =>
      {
        const next = prev.map((order) =>
        order.id === orderId
          ? {
              ...order,
              ...updates,
            }
          : order
      );

        if (typeof window !== 'undefined') {
          sessionStorage.setItem(
            ORDERS_CACHE_KEY,
            JSON.stringify({
              timestamp: Date.now(),
              orders: next,
            })
          );
        }

        return next;
      }
    );

    setSelectedOrder((prev) =>
      prev && prev.id === orderId
        ? {
            ...prev,
            ...updates,
          }
        : prev
    );
  }, []);

  const updateOrderField = async (
    orderId: string,
    updates: Partial<Order>,
    logDetails: any
  ) => {
    if (!user) return;

    try {
      await updateDoc(doc(db, 'orders', orderId), {
        ...updates,
        updatedAt: new Date(),
      });

      await createAuditLog({
        actorType: user.role,
        actorId: user.uid,
        actorName: user.displayName,
        action: 'ORDER_UPDATE',
        targetType: 'order',
        targetId: orderId,
        details: logDetails,
        metadata: { userAgent: getUserAgent() },
      });

      patchOrderInState(orderId, updates);
      toast.success('Commande mise à jour');
    } catch (e) {
      console.error(e);
      toast.error('Erreur mise à jour');
    }
  };

const statusBadge = (status: OrderStatus) => {
  const map: any = {
    pending: ['En attente client', 'bg-gray-100 text-gray-700'],
    new: ['Nouvelle', 'bg-blue-100 text-blue-800'],
    confirmed: ['Confirmée', 'bg-green-100 text-green-800'],
    cancelled: ['Annulée', 'bg-red-100 text-red-800'],
  };

  const [label, cls] = map[status] || ['Inconnu', 'bg-gray-100'];
  return <Badge className={cls}>{label}</Badge>;
};

const deliveryBadge = (status: DeliveryStatus) => {
  const map: Record<string, [string, string]> = {
    pending: ['En attente', 'bg-gray-100 text-gray-700'],
    preparing: ['Préparation', 'bg-yellow-100 text-yellow-800'],
    on_the_way: ['En route', 'bg-orange-100 text-orange-800'], // ✅ صح
    delivered: ['Livrée', 'bg-green-100 text-green-800'],
    returned: ['Retournée', 'bg-red-100 text-red-800'],
  };

  const [label, cls] = map[status] || ['Inconnu', 'bg-gray-200 text-gray-600'];
  return <Badge className={cls}>{label}</Badge>;
};

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

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Commandes</h1>
            <p className="text-gray-600">Gestion des commandes clients</p>
          </div>

          <Card className="p-4 flex items-center gap-3">
            <Filter className="w-4 h-4" />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
             <SelectContent>
  <SelectItem value="all">Tous</SelectItem>
  <SelectItem value="pending">En attente client</SelectItem>
  <SelectItem value="new">Nouvelles</SelectItem>
  <SelectItem value="confirmed">Confirmées</SelectItem>
  <SelectItem value="cancelled">Annulées</SelectItem>
</SelectContent>
            </Select>
            <span className="ml-auto text-sm text-gray-600">
              {filteredOrders.length} commande(s)
            </span>
          </Card>

          <Card className="p-6">
            <Table>
              <TableHeader>
<TableRow>
<TableHead>N°</TableHead>
<TableHead>Date</TableHead>
<TableHead>Client</TableHead>
<TableHead>Produit</TableHead>
<TableHead>Total</TableHead>
<TableHead>Statut</TableHead>
<TableHead>Livraison</TableHead>
<TableHead>Actions</TableHead>
</TableRow>
              </TableHeader>

              <TableBody>
                {filteredOrders.map(order => (
                 <TableRow key={order.id}>
<TableCell>{order.orderNumber}</TableCell>

<TableCell className="capitalize space-y-1">

<div>{formatDateFR(order.createdAt)}</div>

<div className="text-xs text-green-600">
{timeAgo(order.createdAt) && (
<div className="text-xs text-green-600">
🟢 {timeAgo(order.createdAt)}
</div>
)}
</div>

</TableCell>                <TableCell>
                      <div className="font-medium">{order.customer.fullName}</div>
                      <div className="text-xs text-gray-600">{order.customer.phone}</div>
                    </TableCell>
                    <TableCell>{order.product.name}</TableCell>
                    <TableCell className="font-semibold">
                      {formatPrice(order.total)}
                    </TableCell>
                    <TableCell>{statusBadge(order.status)}</TableCell>
                    <TableCell>
                      {deliveryBadge(order.deliveryStatus || 'pending')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                         onClick={() => {
  setSelectedOrder(order);
  setNote(order.notes || "");
  setDialogOpen(true);
}}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`/admin/invoices/${order.id}`, '_blank')}
                        >
                          🧾 Facture
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* ================= DIALOG ================= */}

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Détails commande</DialogTitle>
              </DialogHeader>

              {selectedOrder && (
                <div className="space-y-4 text-sm">

                  {/* ⭐ ADDED – CLIENT */}
                  <div className="border rounded-md p-3 space-y-1">
                    <div><strong>👤 Client:</strong> {selectedOrder.customer.fullName}</div>
                    <div><strong>📞 Téléphone:</strong> {selectedOrder.customer.phone}</div>
                    <div>
                      <strong>📍 Adresse:</strong>{' '}
                      {selectedOrder.customer.addressDetails} – {selectedOrder.customer.wilaya}
                    </div>
                  </div>
{/* ⭐ PRODUIT */}
<div className="border rounded-md p-3 space-y-1">
  <div>
    <strong>📦 Produit:</strong> {selectedOrder.product.name}
  </div>

  <div>
    <strong>🔢 Quantité:</strong>{' '}
    {selectedOrder.quantity ?? '-'}
  </div>

  <div>
    <strong>👞 Pointure:</strong>{' '}
    {selectedOrder.variant?.size ?? '-'}
  </div>

  <div>
    <strong>🎨 Couleur:</strong>{' '}
    {selectedOrder.variant?.colorName ?? '-'}
  </div>

  <div>
    <strong>💰 Prix:</strong>{' '}
    {formatPrice(selectedOrder.product.price)}
  </div>
</div>
                  {/* ⭐ ADDED – LIVRAISON */}
                  <div className="border rounded-md p-3 space-y-1">
                    <div>
                      <strong>🚚 Livraison:</strong>{' '}
                      {selectedOrder.delivery.type === 'home' ? 'À domicile' : 'Point relais'}
                    </div>
                    <div>
                      <strong>💸 Frais:</strong> {formatPrice(selectedOrder.delivery.price)}
                    </div>
                    <div>
                      <strong>🧾 Total:</strong>{' '}
                      <span className="font-semibold">
                        {formatPrice(selectedOrder.total)}
                      </span>
                    </div>
                  </div>
{/* STATUS */}
<div className="space-y-2">
                    <strong>Statut commande</strong>
                    <Select
                      value={selectedOrder.status}
                      onValueChange={(v) =>
                        updateOrderField(
                          selectedOrder.id!,
                          { status: v as OrderStatus },
                          { from: selectedOrder.status, to: v }
                        )
                      }
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
  <SelectItem value="pending">En attente client</SelectItem>
  <SelectItem value="new">Nouvelle</SelectItem>
  <SelectItem value="confirmed">Confirmée</SelectItem>
  <SelectItem value="cancelled">Annulée</SelectItem>
</SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <strong>Statut livraison</strong>
                    <Select
                      value={selectedOrder.deliveryStatus || 'pending'}
                      onValueChange={(v) =>
                        updateOrderField(
                          selectedOrder.id!,
                          { deliveryStatus: v as DeliveryStatus },
                          { deliveryStatus: v }
                        )
                      }
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">En attente</SelectItem>
                        <SelectItem value="on_the_way">En route</SelectItem>
                        <SelectItem value="delivered">Livrée</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
<div className="space-y-2 border rounded-md p-3">
  <strong>📝 Note interne</strong>

  <textarea
    value={note}
    onChange={(e) => setNote(e.target.value)}
    placeholder="ex: client a changé la couleur, pointure 42 au lieu de 41..."
    className="w-full min-h-[120px] border rounded-md p-3 text-sm"
  />

  <Button
    type="button"
    size="sm"
    onClick={() => {
      if (!selectedOrder) return;

      updateOrderField(
        selectedOrder.id!,
        { notes: note } as Partial<Order>,
        { notes: note }
      );
    }}
  >
    Sauvegarder note
  </Button>
</div>
                </div>
              )}
            </DialogContent>
          </Dialog>

        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}
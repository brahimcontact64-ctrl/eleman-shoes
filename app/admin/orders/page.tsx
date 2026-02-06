'use client';

import { useEffect, useState } from 'react';
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
import {
  Eye,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';

/* ================= TYPES ================= */



/* ================= PAGE ================= */

export default function AdminOrdersPage() {
  const { user } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  /* ================= LOAD ================= */

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    if (filterStatus === 'all') {
      setFilteredOrders(orders);
    } else {
      setFilteredOrders(orders.filter(o => o.status === filterStatus));
    }
  }, [filterStatus, orders]);

  const fetchOrders = async () => {
    try {
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
      setFilteredOrders(data);
    } catch (e) {
      console.error(e);
      toast.error('Erreur chargement commandes');
    } finally {
      setLoading(false);
    }
  };

  /* ================= UPDATE STATUS ================= */

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

      toast.success('Commande mise à jour');
      fetchOrders();
    } catch (e) {
      console.error(e);
      toast.error('Erreur mise à jour');
    }
  };

  /* ================= BADGES ================= */

  const statusBadge = (status: OrderStatus) => {
    const map: any = {
      new: ['Nouvelle', 'bg-blue-100 text-blue-800'],
      confirmed: ['Confirmée', 'bg-yellow-100 text-yellow-800'],
      cancelled: ['Annulée', 'bg-red-100 text-red-800'],
    };
    const [label, cls] = map[status];
    return <Badge className={cls}>{label}</Badge>;
  };

 const deliveryBadge = (status: DeliveryStatus) => {
  const map: any = {
    pending: ['En attente', 'bg-gray-100 text-gray-700'],
    preparing: ['Préparation', 'bg-yellow-100 text-yellow-800'],
    shipped: ['En route', 'bg-orange-100 text-orange-800'],
    delivered: ['Livrée', 'bg-green-100 text-green-800'],
    returned: ['Retournée', 'bg-red-100 text-red-800'],
  };
    const [label, cls] = map[status];
    return <Badge className={cls}>{label}</Badge>;
  };

  /* ================= LOADING ================= */

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

  /* ================= RENDER ================= */

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
                    <TableCell>
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
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedOrder(order);
                          setDialogOpen(true);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* ================= DIALOG ================= */}

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Détails commande</DialogTitle>
              </DialogHeader>

              {selectedOrder && (
                <div className="space-y-4">

                  <div>
                    <strong>Client:</strong> {selectedOrder.customer.fullName}
                  </div>

                  <div>
                    <strong>Adresse:</strong> {selectedOrder.customer.addressDetails}
                  </div>

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

                </div>
              )}
            </DialogContent>
          </Dialog>

        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}
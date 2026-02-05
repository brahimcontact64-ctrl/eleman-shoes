'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Order, Product } from '@/lib/types';
import ProtectedRoute from '@/components/admin/ProtectedRoute';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatPrice } from '@/lib/firebase/utils';
import { ShoppingBag, Package, DollarSign, TrendingUp } from 'lucide-react';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalOrders: 0,
    newOrders: 0,
    totalProducts: 0,
    totalRevenue: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const ordersSnapshot = await getDocs(collection(db, 'orders'));
      const orders = ordersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Order[];

      const newOrdersCount = orders.filter((o) => o.status === 'new').length;
      const totalRevenue = orders
        .filter((o) => o.status !== 'cancelled')
        .reduce((sum, o) => sum + o.total, 0);

      const productsSnapshot = await getDocs(query(collection(db, 'products'), where('isActive', '==', true)));

      const recentOrdersQuery = query(
        collection(db, 'orders'),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const recentOrdersSnapshot = await getDocs(recentOrdersQuery);
      const recentOrdersData = recentOrdersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Order[];

      setStats({
        totalOrders: orders.length,
        newOrders: newOrdersCount,
        totalProducts: productsSnapshot.size,
        totalRevenue,
      });
      setRecentOrders(recentOrdersData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      new: 'bg-blue-100 text-blue-800 border-blue-200',
      confirmed: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      delivered: 'bg-green-100 text-green-800 border-green-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
    };
    const labels = {
      new: 'Nouvelle',
      confirmed: 'Confirmée',
      delivered: 'Livrée',
      cancelled: 'Annulée',
    };
    return (
      <Badge variant="outline" className={styles[status as keyof typeof styles]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <AdminLayout>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
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
            <h1 className="text-3xl font-bold">Tableau de Bord</h1>
            <p className="text-gray-600">Vue d&apos;ensemble de votre boutique</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-blue-900">
                  Total Commandes
                </CardTitle>
                <ShoppingBag className="h-5 w-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-900">{stats.totalOrders}</div>
                <p className="text-xs text-blue-700 mt-1">Toutes les commandes</p>
              </CardContent>
            </Card>

            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-yellow-900">
                  Nouvelles Commandes
                </CardTitle>
                <TrendingUp className="h-5 w-5 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-900">{stats.newOrders}</div>
                <p className="text-xs text-yellow-700 mt-1">En attente de traitement</p>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-green-50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-green-900">
                  Produits Actifs
                </CardTitle>
                <Package className="h-5 w-5 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-900">{stats.totalProducts}</div>
                <p className="text-xs text-green-700 mt-1">En catalogue</p>
              </CardContent>
            </Card>

            <Card className="border-amber-200 bg-amber-50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-amber-900">
                  Revenu Total
                </CardTitle>
                <DollarSign className="h-5 w-5 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-900">
                  {formatPrice(stats.totalRevenue)}
                </div>
                <p className="text-xs text-amber-700 mt-1">Commandes confirmées et livrées</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Commandes Récentes</CardTitle>
            </CardHeader>
            <CardContent>
              {recentOrders.length === 0 ? (
                <div className="text-center py-8 text-gray-600">
                  Aucune commande récente
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>N° Commande</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Produit</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.orderNumber}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{order.customer.fullName}</div>
                            <div className="text-sm text-gray-600">{order.customer.phone}</div>
                          </div>
                        </TableCell>
                        <TableCell>{order.product.name}</TableCell>
                        <TableCell className="font-semibold">{formatPrice(order.total)}</TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Actions Rapides</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <a
                  href="/admin/orders"
                  className="block p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium">Gérer les Commandes</div>
                  <div className="text-sm text-gray-600">
                    Consulter et traiter les commandes
                  </div>
                </a>
                <a
                  href="/admin/products"
                  className="block p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium">Gérer les Produits</div>
                  <div className="text-sm text-gray-600">
                    Ajouter ou modifier des produits
                  </div>
                </a>
                <a
                  href="/admin/delivery"
                  className="block p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium">Prix de Livraison</div>
                  <div className="text-sm text-gray-600">
                    Configurer les tarifs de livraison
                  </div>
                </a>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>État du Système</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                  <span className="font-medium text-green-900">Base de Données</span>
                  <Badge className="bg-green-600">Opérationnelle</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                  <span className="font-medium text-green-900">Stockage</span>
                  <Badge className="bg-green-600">Opérationnel</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                  <span className="font-medium text-green-900">Authentification</span>
                  <Badge className="bg-green-600">Active</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}

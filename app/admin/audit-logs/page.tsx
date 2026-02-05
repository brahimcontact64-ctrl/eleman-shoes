'use client';

import { useEffect, useState } from 'react';
import { collection, query, orderBy, getDocs, limit, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { AuditLog } from '@/lib/types';
import ProtectedRoute from '@/components/admin/ProtectedRoute';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/firebase/utils';
import { Download } from 'lucide-react';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterActorType, setFilterActorType] = useState('all');
  const [filterAction, setFilterAction] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    let filtered = logs;

    if (filterActorType !== 'all') {
      filtered = filtered.filter((log) => log.actorType === filterActorType);
    }

    if (filterAction !== 'all') {
      filtered = filtered.filter((log) => log.action === filterAction);
    }

    setFilteredLogs(filtered);
  }, [filterActorType, filterAction, logs]);

  const fetchData = async () => {
    try {
      const logsQuery = query(
        collection(db, 'audit_logs'),
        orderBy('timestamp', 'desc'),
        limit(500)
      );
      const logsSnapshot = await getDocs(logsQuery);
      const logsData = logsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as AuditLog[];
      setLogs(logsData);
      setFilteredLogs(logsData);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Acteur', 'Type', 'Action', 'Cible', 'ID Cible'];
    const rows = filteredLogs.map((log) => [
      formatDate(log.timestamp),
      log.actorName,
      log.actorType,
      log.action,
      log.targetType,
      log.targetId,
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${Date.now()}.csv`;
    a.click();
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      USER_LOGIN: 'Connexion',
      USER_LOGOUT: 'Déconnexion',
      PRODUCT_CREATE: 'Produit créé',
      PRODUCT_UPDATE: 'Produit modifié',
      PRODUCT_DELETE: 'Produit supprimé',
      CATEGORY_CREATE: 'Catégorie créée',
      CATEGORY_UPDATE: 'Catégorie modifiée',
      CATEGORY_DELETE: 'Catégorie supprimée',
      ORDER_STATUS_UPDATE: 'Statut commande',
      CUSTOMER_ORDER_CREATED: 'Commande client',
      INVOICE_GENERATE: 'Facture générée',
      SETTINGS_UPDATE: 'Paramètres modifiés',
      USER_CREATE: 'Utilisateur créé',
      USER_ROLE_UPDATE: 'Rôle modifié',
      USER_DISABLE: 'Compte désactivé',
      DELIVERY_UPDATE: 'Prix livraison',
    };
    return labels[action] || action;
  };

  const getActorTypeBadge = (actorType: string) => {
    const colors: Record<string, any> = {
      admin: 'default',
      worker: 'secondary',
      customer: 'outline',
    };
    return colors[actorType] || 'outline';
  };

  if (loading) {
    return (
      <ProtectedRoute requireAdmin>
        <AdminLayout>
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
        </AdminLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requireAdmin>
      <AdminLayout>
        <div>
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">Journaux d&apos;audit</h1>
            <Button onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Exporter CSV
            </Button>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select value={filterActorType} onValueChange={setFilterActorType}>
                <SelectTrigger>
                  <SelectValue placeholder="Type d'acteur" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="worker">Employé</SelectItem>
                  <SelectItem value="customer">Client</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger>
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les actions</SelectItem>
                  <SelectItem value="USER_LOGIN">Connexion</SelectItem>
                  <SelectItem value="USER_LOGOUT">Déconnexion</SelectItem>
                  <SelectItem value="PRODUCT_CREATE">Produit créé</SelectItem>
                  <SelectItem value="PRODUCT_UPDATE">Produit modifié</SelectItem>
                  <SelectItem value="ORDER_STATUS_UPDATE">Statut commande</SelectItem>
                  <SelectItem value="CUSTOMER_ORDER_CREATED">Commande client</SelectItem>
                  <SelectItem value="INVOICE_GENERATE">Facture générée</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Acteur</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Cible</TableHead>
                  <TableHead>ID Cible</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">{formatDate(log.timestamp)}</TableCell>
                    <TableCell>{log.actorName}</TableCell>
                    <TableCell>
                      <Badge variant={getActorTypeBadge(log.actorType)}>
                        {log.actorType}
                      </Badge>
                    </TableCell>
                    <TableCell>{getActionLabel(log.action)}</TableCell>
                    <TableCell>{log.targetType}</TableCell>
                    <TableCell className="text-sm text-gray-600">{log.targetId}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredLogs.length === 0 && (
            <div className="text-center py-8 text-gray-600">
              Aucun journal trouvé
            </div>
          )}
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}

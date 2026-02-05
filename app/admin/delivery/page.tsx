'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { DeliveryZone } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/admin/ProtectedRoute';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { createAuditLog, getUserAgent } from '@/lib/firebase/audit';
import { Pencil, Search, Download, Upload } from 'lucide-react';
import deliveryZonesData from '@/lib/data/delivery-zones.json';

export default function AdminDeliveryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [filteredZones, setFilteredZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      setFilteredZones(
        zones.filter((z) =>
          z.wilaya.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    } else {
      setFilteredZones(zones);
    }
  }, [searchTerm, zones]);

  const fetchData = async () => {
    try {
      const zonesSnapshot = await getDocs(collection(db, 'delivery_zones'));
      if (zonesSnapshot.empty) {
        setZones(deliveryZonesData as DeliveryZone[]);
        setFilteredZones(deliveryZonesData as DeliveryZone[]);
      } else {
        const zonesData = zonesSnapshot.docs.map((doc) => doc.data()) as DeliveryZone[];
        setZones(zonesData.sort((a, b) => a.wilaya.localeCompare(b.wilaya)));
        setFilteredZones(zonesData.sort((a, b) => a.wilaya.localeCompare(b.wilaya)));
      }
    } catch (error) {
      console.error('Error fetching zones:', error);
      setZones(deliveryZonesData as DeliveryZone[]);
      setFilteredZones(deliveryZonesData as DeliveryZone[]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !editingZone) return;

    try {
      await setDoc(doc(db, 'delivery_zones', editingZone.wilaya), editingZone);

      await createAuditLog({
        actorType: user.role,
        actorId: user.uid,
        actorName: user.displayName,
        action: 'DELIVERY_UPDATE',
        targetType: 'delivery',
        targetId: editingZone.wilaya,
        details: editingZone,
        metadata: { userAgent: getUserAgent() },
      });

      toast({ title: 'Succès', description: 'Prix de livraison mis à jour' });
      setDialogOpen(false);
      setEditingZone(null);
      fetchData();
    } catch (error) {
      console.error('Error updating delivery prices:', error);
      toast({ title: 'Erreur', description: 'Une erreur est survenue', variant: 'destructive' });
    }
  };

  const handleInitializeData = async () => {
    if (!user) return;
    if (!confirm('Initialiser les prix de livraison avec les données par défaut?')) return;

    try {
      const batch = deliveryZonesData.map((zone) =>
        setDoc(doc(db, 'delivery_zones', zone.wilaya), zone)
      );
      await Promise.all(batch);

      await createAuditLog({
        actorType: user.role,
        actorId: user.uid,
        actorName: user.displayName,
        action: 'DELIVERY_INITIALIZE',
        targetType: 'delivery',
        targetId: 'all',
        details: { count: deliveryZonesData.length },
        metadata: { userAgent: getUserAgent() },
      });

      toast({ title: 'Succès', description: 'Prix de livraison initialisés' });
      fetchData();
    } catch (error) {
      console.error('Error initializing delivery prices:', error);
      toast({ title: 'Erreur', description: 'Une erreur est survenue', variant: 'destructive' });
    }
  };

  const getZoneBadgeColor = (zone: number) => {
    const colors = ['bg-green-500', 'bg-blue-500', 'bg-yellow-500', 'bg-orange-500', 'bg-red-500', 'bg-purple-500'];
    return colors[zone] || 'bg-gray-500';
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
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-leather-dark">Gestion des prix de livraison</h1>
            <Button onClick={handleInitializeData} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Initialiser les données
            </Button>
          </div>

          <Card className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher une wilaya..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </Card>

          <Card className="p-6">
            <div className="mb-4 grid grid-cols-1 md:grid-cols-6 gap-2">
              {[0, 1, 2, 3, 4, 5].map((zoneNum) => (
                <div key={zoneNum} className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded ${getZoneBadgeColor(zoneNum)}`}></div>
                  <span className="text-sm font-medium">Zone {zoneNum}</span>
                  <span className="text-xs text-gray-500">
                    ({zones.filter((z) => z.zone === zoneNum).length})
                  </span>
                </div>
              ))}
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Wilaya</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Délai (jours)</TableHead>
                  <TableHead>Domicile (DZD)</TableHead>
                  <TableHead>Stop Desk (DZD)</TableHead>
                  <TableHead>Retour (DZD)</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredZones.map((zone) => (
                  <TableRow key={zone.wilaya}>
                    <TableCell className="font-medium">{zone.wilaya}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-1 rounded text-white text-xs font-semibold ${getZoneBadgeColor(zone.zone)}`}>
                        Zone {zone.zone}
                      </span>
                    </TableCell>
                    <TableCell>{zone.delay}j</TableCell>
                    <TableCell className="font-semibold">{zone.home} DA</TableCell>
                    <TableCell className="font-semibold">{zone.stopdesk} DA</TableCell>
                    <TableCell>{zone.return} DA</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingZone(zone);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  Modifier prix de livraison - {editingZone?.wilaya}
                </DialogTitle>
              </DialogHeader>
              {editingZone && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Zone</label>
                    <Input
                      type="number"
                      min="0"
                      max="5"
                      value={editingZone.zone}
                      onChange={(e) =>
                        setEditingZone({ ...editingZone, zone: Number(e.target.value) })
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Délai (jours)</label>
                    <Input
                      type="number"
                      min="1"
                      value={editingZone.delay}
                      onChange={(e) =>
                        setEditingZone({ ...editingZone, delay: Number(e.target.value) })
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Prix domicile (DZD)</label>
                    <Input
                      type="number"
                      min="0"
                      value={editingZone.home}
                      onChange={(e) =>
                        setEditingZone({ ...editingZone, home: Number(e.target.value) })
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Prix Stop Desk (DZD)</label>
                    <Input
                      type="number"
                      min="0"
                      value={editingZone.stopdesk}
                      onChange={(e) =>
                        setEditingZone({ ...editingZone, stopdesk: Number(e.target.value) })
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Prix retour (DZD)</label>
                    <Input
                      type="number"
                      min="0"
                      value={editingZone.return}
                      onChange={(e) =>
                        setEditingZone({ ...editingZone, return: Number(e.target.value) })
                      }
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleSave} className="flex-1">
                      Enregistrer
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDialogOpen(false);
                        setEditingZone(null);
                      }}
                    >
                      Annuler
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

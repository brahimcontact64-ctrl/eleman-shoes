'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { DeliveryZone } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/admin/ProtectedRoute';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
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
import { useToast } from '@/hooks/use-toast';
import { createAuditLog, getUserAgent } from '@/lib/firebase/audit';
import {
  Pencil,
  Trash2,
  Search,
  Download,
  Upload,
  Plus,
} from 'lucide-react';

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

  const sortZones = (data: DeliveryZone[]) => {
    return data.sort((a, b) => {
      if (a.zone !== b.zone) return a.zone - b.zone;
      return a.wilaya.localeCompare(b.wilaya);
    });
  };

  const fetchData = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'delivery_zones'));
      const data = snapshot.docs.map((d) => d.data()) as DeliveryZone[];
      setZones(sortZones(data));
      setFilteredZones(sortZones(data));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const autoCalculatePrices = (zoneNumber: number) => {
    const base = 400 + zoneNumber * 150;
    return {
      home: base,
      stopdesk: base - 150,
      return: 250 + zoneNumber * 50,
    };
  };

  const handleSave = async () => {
    if (!user || !editingZone) return;

    const name = editingZone.wilaya.trim();

    if (!name) {
      toast({
        title: 'Erreur',
        description: 'Wilaya requise',
        variant: 'destructive',
      });
      return;
    }

    const exists = zones.find(
      (z) =>
        z.wilaya.toLowerCase() === name.toLowerCase() &&
        z.wilaya !== editingZone.wilaya
    );

    if (exists) {
      toast({
        title: 'Erreur',
        description: 'Cette wilaya existe déjà',
        variant: 'destructive',
      });
      return;
    }

    await setDoc(doc(db, 'delivery_zones', name), {
      ...editingZone,
      wilaya: name,
    });

    await createAuditLog({
      actorType: user.role,
      actorId: user.uid,
      actorName: user.displayName,
      action: 'DELIVERY_SAVE',
      targetType: 'delivery',
      targetId: name,
      details: editingZone,
      metadata: { userAgent: getUserAgent() },
    });

    toast({ title: 'Succès', description: 'Enregistré avec succès' });

    setDialogOpen(false);
    setEditingZone(null);
    fetchData();
  };

  const handleDelete = async (wilaya: string) => {
    if (!confirm(`Supprimer ${wilaya} ?`)) return;

    await deleteDoc(doc(db, 'delivery_zones', wilaya));

    toast({ title: 'Supprimé', description: wilaya });

    fetchData();
  };

  const exportCSV = () => {
    const header =
      'wilaya,zone,delay,home,stopdesk,return\n';

    const rows = zones
      .map(
        (z) =>
          `${z.wilaya},${z.zone},${z.delay},${z.home},${z.stopdesk},${z.return}`
      )
      .join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'delivery_zones.csv';
    a.click();
  };

  const importCSV = async (file: File) => {
    const text = await file.text();
    const lines = text.split('\n').slice(1);

    for (const line of lines) {
      if (!line) continue;
      const [wilaya, zone, delay, home, stopdesk, ret] =
        line.split(',');

      await setDoc(doc(db, 'delivery_zones', wilaya.trim()), {
        wilaya: wilaya.trim(),
        zone: Number(zone),
        delay: Number(delay),
        home: Number(home),
        stopdesk: Number(stopdesk),
        return: Number(ret),
      });
    }

    toast({ title: 'Import terminé' });
    fetchData();
  };

  const getZoneBadgeColor = (zone: number) => {
    const colors = [
      'bg-green-500',
      'bg-blue-500',
      'bg-yellow-500',
      'bg-orange-500',
      'bg-red-500',
      'bg-purple-500',
    ];
    return colors[zone] || 'bg-gray-500';
  };

  if (loading)
    return (
      <ProtectedRoute requireAdmin>
        <AdminLayout>
          <div className="flex justify-center p-20">
            Loading...
          </div>
        </AdminLayout>
      </ProtectedRoute>
    );

  return (
    <ProtectedRoute requireAdmin>
      <AdminLayout>
        <div className="space-y-6">

          <div className="flex justify-between">
            <h1 className="text-3xl font-bold">
              Delivery Management
            </h1>

            <div className="flex gap-2">
            <Button
  onClick={() => {
    const auto = autoCalculatePrices(0);
    setEditingZone({
      city: '',          // 👈 أضف هذا
      wilaya: '',
      zone: 0,
      delay: 1,
      ...auto,
    });
    setDialogOpen(true);
  }}
>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter
              </Button>

              <Button variant="outline" onClick={exportCSV}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>

              <label className="cursor-pointer">
                <Button variant="outline">
                  <Upload className="mr-2 h-4 w-4" />
                  Import
                </Button>
                <input
                  hidden
                  type="file"
                  accept=".csv"
                  onChange={(e) =>
                    e.target.files &&
                    importCSV(e.target.files[0])
                  }
                />
              </label>
            </div>
          </div>

          <Card className="p-4">
            <Input
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) =>
                setSearchTerm(e.target.value)
              }
            />
          </Card>

          <Card className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Wilaya</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Délai</TableHead>
                  <TableHead>Domicile</TableHead>
                  <TableHead>StopDesk</TableHead>
                  <TableHead>Retour</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredZones.map((z) => (
                  <TableRow key={z.wilaya}>
                    <TableCell>{z.wilaya}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded text-white text-xs ${getZoneBadgeColor(
                          z.zone
                        )}`}
                      >
                        {z.zone}
                      </span>
                    </TableCell>
                    <TableCell>{z.delay}j</TableCell>
                    <TableCell>{z.home} DA</TableCell>
                    <TableCell>{z.stopdesk} DA</TableCell>
                    <TableCell>{z.return} DA</TableCell>
                    <TableCell className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingZone(z);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil size={14} />
                      </Button>

                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          handleDelete(z.wilaya)
                        }
                      >
                        <Trash2 size={14} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <Dialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingZone?.wilaya
                    ? 'Modifier'
                    : 'Nouvelle Wilaya'}
                </DialogTitle>
              </DialogHeader>

              {editingZone && (
  <div className="space-y-4">

    {/* Wilaya */}
    <div>
      <label className="text-sm font-medium text-gray-600">
        Nom de la Wilaya
      </label>
      <Input
        placeholder="Ex: Alger, Oran, Constantine..."
        value={editingZone.wilaya}
        onChange={(e) =>
          setEditingZone({
            ...editingZone,
            wilaya: e.target.value,
          })
        }
      />
    </div>

    {/* Zone */}
    <div>
      <label className="text-sm font-medium text-gray-600">
        Numéro de Zone (0 → 5)
      </label>
      <Input
        type="number"
        min="0"
        max="5"
        placeholder="0 = Centre | 5 = Sud éloigné"
        value={editingZone.zone}
        onChange={(e) => {
          const zone = Number(e.target.value);
          const auto = autoCalculatePrices(zone);
          setEditingZone({
            ...editingZone,
            zone,
            ...auto,
          });
        }}
      />
    </div>

    {/* Delay */}
    <div>
      <label className="text-sm font-medium text-gray-600">
        Délai de livraison (jours)
      </label>
      <Input
        type="number"
        placeholder="Ex: 1, 2, 3..."
        value={editingZone.delay}
        onChange={(e) =>
          setEditingZone({
            ...editingZone,
            delay: Number(e.target.value),
          })
        }
      />
    </div>

    {/* Home */}
    <div>
      <label className="text-sm font-medium text-gray-600">
        Prix livraison à domicile (DA)
      </label>
      <Input
        type="number"
        placeholder="Ex: 800 DA"
        value={editingZone.home}
        onChange={(e) =>
          setEditingZone({
            ...editingZone,
            home: Number(e.target.value),
          })
        }
      />
    </div>

    {/* StopDesk */}
    <div>
      <label className="text-sm font-medium text-gray-600">
        Prix Stop Desk (DA)
      </label>
      <Input
        type="number"
        placeholder="Ex: 650 DA"
        value={editingZone.stopdesk}
        onChange={(e) =>
          setEditingZone({
            ...editingZone,
            stopdesk: Number(e.target.value),
          })
        }
      />
    </div>

    {/* Return */}
    <div>
      <label className="text-sm font-medium text-gray-600">
        Frais de retour (DA)
      </label>
      <Input
        type="number"
        placeholder="Ex: 300 DA"
        value={editingZone.return}
        onChange={(e) =>
          setEditingZone({
            ...editingZone,
            return: Number(e.target.value),
          })
        }
      />
    </div>

    <Button onClick={handleSave} className="w-full">
      Enregistrer
    </Button>

  </div>
)}
            </DialogContent>
          </Dialog>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}
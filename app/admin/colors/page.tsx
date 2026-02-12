'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import ProtectedRoute from '@/components/admin/ProtectedRoute';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2 } from 'lucide-react';

type ColorType = {
  id: string;
  name: string;
  hexCode?: string;
  order?: number;
  isActive: boolean;
};

export default function AdminColorsPage() {
  const { toast } = useToast();

  const [colors, setColors] = useState<ColorType[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingColor, setEditingColor] = useState<ColorType | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    hexCode: '',
    order: 0,
    isActive: true,
  });

  /* ================= FETCH ================= */

  useEffect(() => {
    fetchColors();
  }, []);

  const fetchColors = async () => {
    try {
      const q = query(collection(db, 'colors'), orderBy('order', 'asc'));
      const snap = await getDocs(q);

      const data = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as ColorType[];

      setColors(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /* ================= ACTIONS ================= */

  const handleEdit = (color: ColorType) => {
    setEditingColor(color);
    setFormData({
      name: color.name,
      hexCode: color.hexCode || '',
      order: color.order || 0,
      isActive: color.isActive,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (color: ColorType) => {
    if (!confirm(`Supprimer la couleur "${color.name}" ?`)) return;

    try {
      await deleteDoc(doc(db, 'colors', color.id));
      toast({ title: 'Supprimé', description: 'Couleur supprimée' });
      fetchColors();
    } catch {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer',
        variant: 'destructive',
      });
    }
  };

  /* ================= SUBMIT ================= */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast({
        title: 'Champ requis',
        description: 'Le nom est obligatoire',
        variant: 'destructive',
      });
      return;
    }

    try {
      const payload = {
        name: formData.name,
        hexCode: formData.hexCode || '',
        order: Number(formData.order),
        isActive: formData.isActive,
        updatedAt: serverTimestamp(),
      };

      if (editingColor) {
        await updateDoc(doc(db, 'colors', editingColor.id), payload);
      } else {
        await addDoc(collection(db, 'colors'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }

      toast({ title: 'Succès', description: 'Couleur enregistrée' });

      setDialogOpen(false);
      resetForm();
      fetchColors();
    } catch {
      toast({
        title: 'Erreur',
        description: 'Erreur lors de la sauvegarde',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      hexCode: '',
      order: 0,
      isActive: true,
    });
    setEditingColor(null);
  };

  if (loading) return null;

  /* ================= UI ================= */

  return (
    <ProtectedRoute requirePermission="canManageProducts">
      <AdminLayout>
        <div className="flex justify-between mb-6">
          <h1 className="text-3xl font-bold">Couleurs</h1>

          <Dialog
            open={dialogOpen}
            onOpenChange={open => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nouvelle couleur
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingColor ? 'Modifier la couleur' : 'Nouvelle couleur'}
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Nom</Label>
                  <Input
                    value={formData.name}
                    onChange={e =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>

                <div>
                  <Label>Hex Code (optionnel)</Label>
                  <Input
                    placeholder="#000000"
                    value={formData.hexCode}
                    onChange={e =>
                      setFormData({ ...formData, hexCode: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label>Ordre</Label>
                  <Input
                    type="number"
                    value={formData.order}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        order: Number(e.target.value),
                      })
                    }
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">
                    {editingColor ? 'Modifier' : 'Créer'}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Annuler
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* TABLE */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Hex</TableHead>
              <TableHead>Ordre</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {colors.map(color => (
              <TableRow key={color.id}>
                <TableCell>{color.name}</TableCell>

                <TableCell>
                  {color.hexCode && (
                    <div className="flex items-center gap-2">
                      <div
                        className="w-5 h-5 rounded border"
                        style={{ background: color.hexCode }}
                      />
                      {color.hexCode}
                    </div>
                  )}
                </TableCell>

                <TableCell>{color.order}</TableCell>

                <TableCell>
                  <Badge variant={color.isActive ? 'default' : 'secondary'}>
                    {color.isActive ? 'Actif' : 'Inactif'}
                  </Badge>
                </TableCell>

                <TableCell className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(color)}
                  >
                    <Pencil size={14} />
                  </Button>

                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(color)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </AdminLayout>
    </ProtectedRoute>
  );
}
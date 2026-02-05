'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Brand } from '@/lib/types';
import AdminLayout from '@/components/admin/AdminLayout';
import ProtectedRoute from '@/components/admin/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Pencil, Trash2, Plus } from 'lucide-react';

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [formData, setFormData] = useState({ name: '', logo: '' });
  const { toast } = useToast();

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      const brandsSnapshot = await getDocs(collection(db, 'brands'));
      const brandsData = brandsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Brand[];
      setBrands(brandsData);
    } catch (error) {
      console.error('Error fetching brands:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les marques',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBrand) {
        await updateDoc(doc(db, 'brands', editingBrand.id), formData);
        toast({
          title: 'Succès',
          description: 'Marque mise à jour',
        });
      } else {
        await addDoc(collection(db, 'brands'), formData);
        toast({
          title: 'Succès',
          description: 'Marque créée',
        });
      }
      setIsDialogOpen(false);
      setEditingBrand(null);
      setFormData({ name: '', logo: '' });
      fetchBrands();
    } catch (error) {
      console.error('Error saving brand:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder la marque',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (brand: Brand) => {
    setEditingBrand(brand);
    setFormData({ name: brand.name, logo: brand.logo || '' });
    setIsDialogOpen(true);
  };

  const handleDelete = async (brand: Brand) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer "${brand.name}" ?`)) return;

    try {
      await deleteDoc(doc(db, 'brands', brand.id));
      toast({
        title: 'Succès',
        description: 'Marque supprimée',
      });
      fetchBrands();
    } catch (error) {
      console.error('Error deleting brand:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer la marque',
        variant: 'destructive',
      });
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingBrand(null);
    setFormData({ name: '', logo: '' });
  };

  if (loading) {
    return (
      <ProtectedRoute requireAdmin>
        <AdminLayout>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-leather-brown"></div>
          </div>
        </AdminLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requireAdmin>
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-leather-dark">Marques</h1>
              <p className="text-leather-gray mt-2">Gérez les marques de chaussures</p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-leather-brown hover:bg-leather-coffee text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle Marque
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingBrand ? 'Modifier la marque' : 'Nouvelle marque'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nom de la marque</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="logo">Logo (URL)</Label>
                    <Input
                      id="logo"
                      value={formData.logo}
                      onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                  {formData.logo && (
                    <div>
                      <Label>Aperçu du logo</Label>
                      <img
                        src={formData.logo}
                        alt="Logo preview"
                        className="w-32 h-32 object-contain border border-leather-light/30 rounded p-2"
                      />
                    </div>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={handleDialogClose}>
                      Annuler
                    </Button>
                    <Button type="submit" className="bg-leather-brown hover:bg-leather-coffee text-white">
                      {editingBrand ? 'Mettre à jour' : 'Créer'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Liste des Marques</CardTitle>
            </CardHeader>
            <CardContent>
              {brands.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-leather-gray">Aucune marque enregistrée</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Logo</TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {brands.map((brand) => (
                      <TableRow key={brand.id}>
                        <TableCell>
                          {brand.logo ? (
                            <img
                              src={brand.logo}
                              alt={brand.name}
                              className="w-16 h-16 object-contain"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-leather-beige rounded flex items-center justify-center text-leather-gray text-xs">
                              No Logo
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium text-leather-dark">{brand.name}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(brand)}
                              className="border-leather-light/30 hover:bg-leather-beige"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(brand)}
                              className="border-red-300 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}

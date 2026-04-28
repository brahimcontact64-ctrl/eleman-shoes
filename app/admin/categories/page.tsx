'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { db, storage } from '@/lib/firebase/config';
import { Category, Product } from '@/lib/types';
import { generateSlug } from '@/lib/firebase/utils';
import { getOptimizedImage } from '@/lib/cloudinary';

import ProtectedRoute from '@/components/admin/ProtectedRoute';
import AdminLayout from '@/components/admin/AdminLayout';

import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

import { GripVertical, Pencil, Plus, Trash2 } from 'lucide-react';

type CategoryForm = {
  name: string;
  slug: string;
  description: string;
  coverImage: string;
  icon: string;
  sortOrder: number;
  isFeatured: boolean;
  isActive: boolean;
  showOnHome: boolean;
};

const emptyForm: CategoryForm = {
  name: '',
  slug: '',
  description: '',
  coverImage: '',
  icon: '',
  sortOrder: 0,
  isFeatured: false,
  isActive: true,
  showOnHome: true,
};

export default function AdminCategoriesPage() {
  const { toast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [reordering, setReordering] = useState(false);

  const productCountByCategory = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((p) => {
      if (!p.categoryId) return;
      map.set(p.categoryId, (map.get(p.categoryId) || 0) + 1);
    });
    return map;
  }, [products]);

  const fetchData = useCallback(async () => {
    try {
      const [categoriesSnap, productsSnap] = await Promise.all([
        getDocs(query(collection(db, 'categories'), orderBy('sortOrder', 'asc'))),
        getDocs(collection(db, 'products')),
      ]);

      const categoriesData = categoriesSnap.docs.map((d, index) => {
        const data = d.data() as Partial<Category>;
        return {
          id: d.id,
          name: data.name || 'Sans nom',
          slug: data.slug || generateSlug(data.name || `categorie-${index + 1}`),
          description: data.description || '',
          coverImage: data.coverImage || '',
          icon: data.icon || '',
          sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : data.order || index,
          order: typeof data.order === 'number' ? data.order : index,
          isFeatured: Boolean(data.isFeatured),
          isActive: data.isActive !== false,
          showOnHome: data.showOnHome !== false,
          createdAt: data.createdAt as any,
          updatedAt: data.updatedAt as any,
        } as Category;
      });

      const productsData = productsSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Product[];

      setCategories(categoriesData);
      setProducts(productsData);
    } catch (error) {
      console.error(error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les catégories',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = () => {
    setForm(emptyForm);
    setSelectedProductIds([]);
    setCoverFile(null);
    setEditingCategory(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (category: Category) => {
    setEditingCategory(category);
    setForm({
      name: category.name || '',
      slug: category.slug || '',
      description: category.description || '',
      coverImage: category.coverImage || '',
      icon: category.icon || '',
      sortOrder: category.sortOrder ?? category.order ?? 0,
      isFeatured: Boolean(category.isFeatured),
      isActive: category.isActive !== false,
      showOnHome: category.showOnHome !== false,
    });

    setSelectedProductIds(
      products
        .filter((p) => p.categoryId === category.id)
        .map((p) => p.id)
    );

    setCoverFile(null);
    setDialogOpen(true);
  };

  const uploadCoverIfNeeded = async (slug: string): Promise<string> => {
    if (!coverFile) return form.coverImage;

    const storageRef = ref(
      storage,
      `categories/${slug}/${Date.now()}_${coverFile.name}`
    );
    await uploadBytes(storageRef, coverFile);
    return getDownloadURL(storageRef);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({
        title: 'Nom requis',
        description: 'Le nom de la catégorie est obligatoire',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    try {
      const slug = generateSlug(form.slug || form.name);
      const coverImage = await uploadCoverIfNeeded(slug);

      const payload = {
        name: form.name.trim(),
        slug,
        description: form.description.trim(),
        coverImage,
        icon: form.icon.trim(),
        sortOrder: Number(form.sortOrder) || 0,
        order: Number(form.sortOrder) || 0,
        isFeatured: form.isFeatured,
        isActive: form.isActive,
        showOnHome: form.showOnHome,
        updatedAt: serverTimestamp(),
      };

      let categoryId = editingCategory?.id;

      if (editingCategory) {
        await updateDoc(doc(db, 'categories', editingCategory.id), payload);
      } else {
        const nextOrder = categories.length;
        const newDoc = await addDoc(collection(db, 'categories'), {
          ...payload,
          sortOrder: nextOrder,
          order: nextOrder,
          createdAt: serverTimestamp(),
        });
        categoryId = newDoc.id;
      }

      if (categoryId) {
        const selectedSet = new Set(selectedProductIds);
        const currentlyAssigned = products
          .filter((p) => p.categoryId === categoryId)
          .map((p) => p.id);

        const updatesNeeded = new Set<string>([
          ...currentlyAssigned,
          ...selectedProductIds,
        ]);

        if (updatesNeeded.size > 0) {
          const batch = writeBatch(db);
          updatesNeeded.forEach((productId) => {
            const productRef = doc(db, 'products', productId);
            if (selectedSet.has(productId)) {
              batch.update(productRef, {
                categoryId,
                updatedAt: serverTimestamp(),
              });
            }
          });

          currentlyAssigned
            .filter((pid) => !selectedSet.has(pid))
            .forEach((productId) => {
              const productRef = doc(db, 'products', productId);
              batch.update(productRef, {
                categoryId: '',
                updatedAt: serverTimestamp(),
              });
            });

          await batch.commit();
        }
      }

      toast({
        title: 'Succès',
        description: editingCategory
          ? 'Catégorie mise à jour'
          : 'Catégorie créée',
      });

      setDialogOpen(false);
      resetForm();
      await fetchData();
    } catch (error) {
      console.error(error);
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder la catégorie',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSoftDelete = async (category: Category) => {
    if (!confirm(`Désactiver la catégorie "${category.name}" ?`)) return;

    try {
      await updateDoc(doc(db, 'categories', category.id), {
        isActive: false,
        isFeatured: false,
        showOnHome: false,
        updatedAt: serverTimestamp(),
      });

      toast({
        title: 'Catégorie désactivée',
        description: 'La catégorie est maintenant inactive',
      });

      await fetchData();
    } catch (error) {
      console.error(error);
      toast({
        title: 'Erreur',
        description: 'Impossible de désactiver cette catégorie',
        variant: 'destructive',
      });
    }
  };

  const handleToggle = async (
    category: Category,
    key: 'isActive' | 'isFeatured' | 'showOnHome',
    value: boolean
  ) => {
    try {
      await updateDoc(doc(db, 'categories', category.id), {
        [key]: value,
        updatedAt: serverTimestamp(),
      });

      setCategories((prev) =>
        prev.map((c) =>
          c.id === category.id
            ? {
                ...c,
                [key]: value,
              }
            : c
        )
      );
    } catch (error) {
      console.error(error);
      toast({
        title: 'Erreur',
        description: 'Mise à jour impossible',
        variant: 'destructive',
      });
    }
  };

  const persistSortOrder = async (next: Category[]) => {
    setReordering(true);

    try {
      const batch = writeBatch(db);
      next.forEach((cat, index) => {
        batch.update(doc(db, 'categories', cat.id), {
          sortOrder: index,
          order: index,
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();

      toast({
        title: 'Ordre mis à jour',
        description: 'Le tri des catégories est enregistré',
      });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Erreur',
        description: 'Impossible d’enregistrer le nouvel ordre',
        variant: 'destructive',
      });
      await fetchData();
    } finally {
      setReordering(false);
    }
  };

  const onDropRow = async (toIndex: number) => {
    if (dragIndex === null || dragIndex === toIndex) return;

    const next = [...categories];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(toIndex, 0, moved);

    setCategories(next);
    setDragIndex(null);
    await persistSortOrder(next);
  };

  const displayedProducts = useMemo(
    () => products.filter((p) => p.isActive !== false),
    [products]
  );

  if (loading) {
    return (
      <ProtectedRoute requirePermission="canManageProducts">
        <AdminLayout>
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-leather-brown" />
          </div>
        </AdminLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requirePermission="canManageProducts">
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold text-leather-dark">Catégories</h1>
              <p className="text-leather-gray">
                Créez, éditez, triez et activez les catégories du storefront.
              </p>
            </div>

            <Dialog
              open={dialogOpen}
              onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) resetForm();
              }}
            >
              <DialogTrigger asChild>
                <Button onClick={openCreateDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle catégorie
                </Button>
              </DialogTrigger>

              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
                  </DialogTitle>
                  <DialogDescription>
                    Gérez les informations visibles sur la home, le catalogue et l’admin.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="category-name">Nom</Label>
                      <Input
                        id="category-name"
                        value={form.name}
                        onChange={(e) => {
                          const name = e.target.value;
                          setForm((prev) => ({
                            ...prev,
                            name,
                            slug: prev.slug || generateSlug(name),
                          }));
                        }}
                        placeholder="Ex: Casual"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category-slug">Slug</Label>
                      <Input
                        id="category-slug"
                        value={form.slug}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            slug: generateSlug(e.target.value),
                          }))
                        }
                        placeholder="casual"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category-description">Description</Label>
                    <Textarea
                      id="category-description"
                      value={form.description}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, description: e.target.value }))
                      }
                      placeholder="Description affichée sur le catalogue"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="category-cover">Image de couverture</Label>
                      <Input
                        id="category-cover"
                        type="file"
                        accept="image/*"
                        onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category-order">Sort Order</Label>
                      <Input
                        id="category-order"
                        type="number"
                        min={0}
                        value={form.sortOrder}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            sortOrder: Number(e.target.value) || 0,
                          }))
                        }
                        placeholder="0"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category-icon">Icône (optionnel)</Label>
                      <Input
                        id="category-icon"
                        value={form.icon}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, icon: e.target.value }))
                        }
                        placeholder="sparkles"
                      />
                    </div>
                  </div>

                  {(coverFile || form.coverImage) && (
                    <div className="relative h-44 w-full rounded-md border overflow-hidden bg-white">
                      <Image
                        src={
                          coverFile
                            ? URL.createObjectURL(coverFile)
                            : getOptimizedImage(form.coverImage, 900) || '/placeholder.png'
                        }
                        alt={form.name || 'Aperçu catégorie'}
                        fill
                        sizes="100vw"
                        className="object-cover"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center justify-between rounded-md border p-3">
                      <Label>Active</Label>
                      <Switch
                        checked={form.isActive}
                        onCheckedChange={(v) =>
                          setForm((prev) => ({ ...prev, isActive: Boolean(v) }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-md border p-3">
                      <Label>Featured</Label>
                      <Switch
                        checked={form.isFeatured}
                        onCheckedChange={(v) =>
                          setForm((prev) => ({ ...prev, isFeatured: Boolean(v) }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-md border p-3">
                      <Label>Afficher sur Home</Label>
                      <Switch
                        checked={form.showOnHome}
                        onCheckedChange={(v) =>
                          setForm((prev) => ({ ...prev, showOnHome: Boolean(v) }))
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Assigner des produits</Label>
                    <div className="max-h-56 overflow-y-auto border rounded-md p-3 space-y-2">
                      {displayedProducts.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Aucun produit actif</p>
                      ) : (
                        displayedProducts.map((product) => {
                          const checked = selectedProductIds.includes(product.id);
                          return (
                            <label
                              key={product.id}
                              className="flex items-center gap-2 text-sm"
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(value) => {
                                  setSelectedProductIds((prev) => {
                                    if (value) return [...new Set([...prev, product.id])];
                                    return prev.filter((id) => id !== product.id);
                                  });
                                }}
                              />
                              <span>{product.name}</span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button disabled={saving} onClick={handleSave}>
                      {saving
                        ? 'Sauvegarde...'
                        : editingCategory
                          ? 'Mettre à jour'
                          : 'Créer'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="rounded-md border bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">Tri</TableHead>
                  <TableHead>Image</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Produits</TableHead>
                  <TableHead>Featured</TableHead>
                  <TableHead>Home</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Sort Order</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category, index) => (
                  <TableRow
                    key={category.id}
                    draggable
                    onDragStart={() => setDragIndex(index)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => onDropRow(index)}
                    className={reordering ? 'opacity-70' : ''}
                  >
                    <TableCell>
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    </TableCell>

                    <TableCell>
                      <div className="relative h-12 w-12 rounded-md overflow-hidden bg-leather-beige border">
                        <Image
                          src={
                            getOptimizedImage(category.coverImage || '', 120) ||
                            '/placeholder.png'
                          }
                          alt={category.name}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="font-medium">{category.name}</div>
                      <div className="text-xs text-muted-foreground">/{category.slug}</div>
                    </TableCell>

                    <TableCell>
                      <Badge variant="secondary">
                        {productCountByCategory.get(category.id) || 0}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <Switch
                        checked={Boolean(category.isFeatured)}
                        onCheckedChange={(v) =>
                          handleToggle(category, 'isFeatured', Boolean(v))
                        }
                      />
                    </TableCell>

                    <TableCell>
                      <Switch
                        checked={category.showOnHome !== false}
                        onCheckedChange={(v) =>
                          handleToggle(category, 'showOnHome', Boolean(v))
                        }
                      />
                    </TableCell>

                    <TableCell>
                      <Switch
                        checked={category.isActive !== false}
                        onCheckedChange={(v) =>
                          handleToggle(category, 'isActive', Boolean(v))
                        }
                      />
                    </TableCell>

                    <TableCell>{category.sortOrder ?? category.order ?? index}</TableCell>

                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(category)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleSoftDelete(category)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}

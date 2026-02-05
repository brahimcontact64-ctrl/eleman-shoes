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
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase/config';
import { Product, Brand, Category } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/admin/ProtectedRoute';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { generateSlug, formatPrice } from '@/lib/firebase/utils';
import { Plus, Pencil, Trash2, X } from 'lucide-react';

/* ================= CONSTANTS ================= */

const STANDARD_SIZES = [36, 37, 38, 39, 40, 41, 42, 43, 44, 45];

/* ✅ UPDATED COLORS (ONLY CHANGE) */
const STANDARD_COLORS = [
  { name: 'Noir' },
  { name: 'Marron' },
  { name: 'Coff' },
  { name: 'Noir cuir' },
  { name: 'Noir cuir / Noir nubuk' },
  { name: 'Kaki nubuk' },
  { name: 'Marron nubuk' },
  { name: 'Gris nubuk' },
];

/* ================= TYPES ================= */

type SizeStock = {
  size: number;
  stock: number;
};

type ColorForm = {
  name: string;
  files: File[];
  sizes: SizeStock[];
};

/* ================= COMPONENT ================= */

export default function AdminProductsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    brandId: '',
    categoryId: '',
    price: 0,
    description: '',
    isActive: true,
  });

  const [colors, setColors] = useState<ColorForm[]>(
    STANDARD_COLORS.map(c => ({
      name: c.name,
      files: [],
      sizes: STANDARD_SIZES.map(s => ({ size: s, stock: 0 })),
    }))
  );

  /* ================= FETCH ================= */

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [brandsSnap, categoriesSnap, productsSnap] = await Promise.all([
      getDocs(collection(db, 'brands')),
      getDocs(collection(db, 'categories')),
      getDocs(collection(db, 'products')),
    ]);

    setBrands(brandsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Brand[]);
    setCategories(categoriesSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Category[]);
    setProducts(productsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Product[]);
    setLoading(false);
  };

  /* ================= COLORS ================= */

  const addColor = () =>
    setColors(prev => [
      ...prev,
      {
        name: '',
        files: [],
        sizes: STANDARD_SIZES.map(s => ({ size: s, stock: 0 })),
      },
    ]);

  const removeColor = (index: number) =>
    setColors(prev => prev.filter((_, i) => i !== index));

  const updateColorName = (index: number, value: string) => {
    const updated = [...colors];
    updated[index].name = value;
    setColors(updated);
  };

  const updateColorFiles = (index: number, files: File[]) => {
    const updated = [...colors];
    updated[index].files = files;
    setColors(updated);
  };

  const updateStock = (cIndex: number, sIndex: number, value: number) => {
    const updated = [...colors];
    updated[cIndex].sizes[sIndex].stock = value;
    setColors(updated);
  };

  /* ================= ACTIONS ================= */

  const handleEdit = (product: Product) => {
    setEditingProduct(product);

    setFormData({
      name: product.name,
      brandId: product.brandId,
      categoryId: product.categoryId,
      price: product.price,
      description: product.description || '',
      isActive: product.isActive,
    });

    setColors(
      product.colors?.map(c => ({
        name: c.name,
        files: [],
        sizes: STANDARD_SIZES.map(size => {
          const found = c.sizes?.find((s: any) => s.size === size);
          return { size, stock: found ? found.stock : 0 };
        }),
      })) ||
        STANDARD_COLORS.map(c => ({
          name: c.name,
          files: [],
          sizes: STANDARD_SIZES.map(s => ({ size: s, stock: 0 })),
        }))
    );

    setDialogOpen(true);
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`Supprimer le produit "${product.name}" ?`)) return;

    try {
      await deleteDoc(doc(db, 'products', product.id));
      toast({ title: 'Supprimé', description: 'Produit supprimé' });
      fetchData();
    } catch (err) {
      console.error(err);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le produit',
        variant: 'destructive',
      });
    }
  };

  /* ================= SUBMIT ================= */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.brandId || !formData.categoryId) {
      toast({
        title: 'Champs manquants',
        description: 'Veuillez sélectionner une marque et une catégorie',
        variant: 'destructive',
      });
      return;
    }

    try {
      const slug = generateSlug(formData.name);
      const colorsData: any[] = [];

      for (const color of colors) {
        if (!color.name) continue;

        const imageUrls = await Promise.all(
          color.files.map(async file => {
            const storageRef = ref(
              storage,
              `products/${slug}/${color.name}/${Date.now()}_${file.name}`
            );
            await uploadBytes(storageRef, file);
            return await getDownloadURL(storageRef);
          })
        );

        const validSizes = color.sizes.filter(s => s.stock > 0);

        if (imageUrls.length === 0 || validSizes.length === 0) continue;

        colorsData.push({
          colorId: generateSlug(color.name),
          name: color.name,
          images: imageUrls.map(url => ({ url })),
          sizes: validSizes,
        });
      }

      if (colorsData.length === 0) {
        toast({
          title: 'Produit invalide',
          description: 'Ajoutez au moins une couleur avec image et stock',
          variant: 'destructive',
        });
        return;
      }

      const payload = {
        name: formData.name,
        slug,
        brandId: formData.brandId,
        categoryId: formData.categoryId,
        price: Number(formData.price),
        description: formData.description,
        colors: colorsData,
        isActive: formData.isActive,
        updatedAt: serverTimestamp(),
      };

      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id), payload);
      } else {
        await addDoc(collection(db, 'products'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }

      toast({ title: 'Succès', description: 'Produit enregistré' });
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (err) {
      console.error(err);
      toast({
        title: 'Erreur',
        description: 'Erreur lors de la sauvegarde',
        variant: 'destructive',
      });
    }
  };

  /* ================= RESET ================= */

  const resetForm = () => {
    setFormData({
      name: '',
      brandId: '',
      categoryId: '',
      price: 0,
      description: '',
      isActive: true,
    });
    setColors(
      STANDARD_COLORS.map(c => ({
        name: c.name,
        files: [],
        sizes: STANDARD_SIZES.map(s => ({ size: s, stock: 0 })),
      }))
    );
    setEditingProduct(null);
  };

  if (loading) return null;

 /* ================= UI ================= */

  return (
    <ProtectedRoute requirePermission="canManageProducts">
      <AdminLayout>

        {/* HEADER + DIALOG */}
        <div className="flex justify-between mb-6">
          <h1 className="text-3xl font-bold">Produits</h1>

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
                Nouveau produit
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? 'Modifier le produit' : 'Nouveau produit'}
                </DialogTitle>
              </DialogHeader>

             <form onSubmit={handleSubmit} className="space-y-4">
  <Input
    placeholder="Nom"
    value={formData.name}
    onChange={e => setFormData({ ...formData, name: e.target.value })}
    required
  />

  <div className="grid grid-cols-2 gap-2">
    <Select
      value={formData.brandId}
      onValueChange={v => setFormData({ ...formData, brandId: v })}
    >
      <SelectTrigger>
        <SelectValue placeholder="Marque" />
      </SelectTrigger>
      <SelectContent>
        {brands.map(b => (
          <SelectItem key={b.id} value={b.id}>
            {b.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>

    <Select
      value={formData.categoryId}
      onValueChange={v => setFormData({ ...formData, categoryId: v })}
    >
      <SelectTrigger>
        <SelectValue placeholder="Catégorie" />
      </SelectTrigger>
      <SelectContent>
        {categories.map(c => (
          <SelectItem key={c.id} value={c.id}>
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>

  <Input
    type="number"
    placeholder="Prix"
    value={formData.price}
    onChange={e => setFormData({ ...formData, price: +e.target.value })}
  />

  <Textarea
    placeholder="Description"
    value={formData.description}
    onChange={e => setFormData({ ...formData, description: e.target.value })}
  />

  {/* COLORS */}
  <div className="space-y-4">
    <Label>Couleurs, images & stock</Label>

    {colors.map((color, cIndex) => (
      <div key={cIndex} className="border rounded p-4 space-y-3 relative">
        <button
          type="button"
          onClick={() => removeColor(cIndex)}
          className="absolute top-2 right-2 text-muted-foreground"
        >
          <X size={16} />
        </button>

        <Input
          placeholder="Nom couleur"
          value={color.name}
          onChange={e => updateColorName(cIndex, e.target.value)}
        />

        <Input
          type="file"
          multiple
          accept="image/*"
          onChange={e =>
            updateColorFiles(cIndex, Array.from(e.target.files || []))
          }
        />

        <div className="grid grid-cols-5 gap-2 mt-2">
          {color.sizes.map((s, sIndex) => (
            <div key={s.size} className="space-y-1">
              <Label className="text-xs text-center block">{s.size}</Label>
              <Input
                type="number"
                min={0}
                value={s.stock}
                onChange={e =>
                  updateStock(cIndex, sIndex, Number(e.target.value))
                }
              />
            </div>
          ))}
        </div>
      </div>
    ))}

    <Button type="button" variant="outline" onClick={addColor}>
      + Ajouter une couleur
    </Button>
  </div>

  <div className="flex gap-2 pt-4">
    <Button type="submit" className="flex-1">
      {editingProduct ? 'Modifier' : 'Créer'}
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
              <TableHead>Prix</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map(p => (
              <TableRow key={p.id}>
                <TableCell>{p.name}</TableCell>
                <TableCell>{formatPrice(p.price)}</TableCell>
                <TableCell>
                  <Badge variant={p.isActive ? 'default' : 'secondary'}>
                    {p.isActive ? 'Actif' : 'Inactif'}
                  </Badge>
                </TableCell>
                <TableCell className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(p)}>
                    <Pencil size={14} />
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(p)}>
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
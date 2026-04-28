'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
import { useAuth } from '@/contexts/AuthContext';

import ProtectedRoute from '@/components/admin/ProtectedRoute';
import AdminLayout from '@/components/admin/AdminLayout';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Copy,
  FolderOpen,
  GripVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
  TriangleAlert,
} from 'lucide-react';

/* ======================================================
   TYPES
====================================================== */

type CategoryForm = {
  name: string;
  slug: string;
  description: string;
  coverImage: string;
  sortOrder: number;
  isFeatured: boolean;
  isActive: boolean;
  showOnHome: boolean;
};

type DeleteTarget = {
  category: Category;
  productCount: number;
  reassignTo: string;
};

type FilterStatus = 'all' | 'active' | 'inactive';

const EMPTY_FORM: CategoryForm = {
  name: '',
  slug: '',
  description: '',
  coverImage: '',
  sortOrder: 0,
  isFeatured: false,
  isActive: true,
  showOnHome: true,
};

const SEED_CATEGORIES = [
  { name: 'Casual',   description: 'Chaussures casual pour tous les jours' },
  { name: 'Classic',  description: 'Chaussures classiques intemporelles' },
  { name: 'Sport',    description: 'Chaussures sportives et confortables' },
  { name: 'Sandales', description: "Sandales légères pour l'été" },
];

const PAGE_SIZE = 10;

/* ======================================================
   SKELETON ROW
====================================================== */

function TableSkeleton() {
  return (
    <div className="rounded-xl border bg-white overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-24" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 border-b last:border-0">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-12 w-12 rounded-md flex-shrink-0" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-6 w-10" />
          <Skeleton className="h-6 w-10" />
          <Skeleton className="h-6 w-10" />
          <Skeleton className="h-6 w-10" />
          <Skeleton className="h-5 w-6" />
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
}

/* ======================================================
   MAIN PAGE
====================================================== */

export default function AdminCategoriesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === 'admin';

  /* ── data ── */
  const [categories, setCategories]   = useState<Category[]>([]);
  const [products,   setProducts]     = useState<Product[]>([]);
  const [loading,    setLoading]      = useState(true);
  const [seeding,    setSeeding]      = useState(false);

  /* ── form / dialog ── */
  const [dialogOpen,        setDialogOpen]        = useState(false);
  const [saving,            setSaving]            = useState(false);
  const [editingCategory,   setEditingCategory]   = useState<Category | null>(null);
  const [form,              setForm]              = useState<CategoryForm>(EMPTY_FORM);
  const [coverFile,         setCoverFile]         = useState<File | null>(null);
  const [coverPreview,      setCoverPreview]      = useState('');

  /* ── delete ── */
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  /* ── drag & drop ── */
  const dragItemRef                         = useRef<number | null>(null);
  const [dragIndex,    setDragIndex]        = useState<number | null>(null);
  const [dragOverIdx,  setDragOverIdx]      = useState<number | null>(null);
  const [reordering,   setReordering]       = useState(false);

  /* ── search / filter / page ── */
  const [search,        setSearch]       = useState('');
  const [filterStatus,  setFilterStatus] = useState<FilterStatus>('all');
  const [page,          setPage]         = useState(1);

  /* ───────────────────────────────────────────
     DERIVED
  ─────────────────────────────────────────── */

  const productCountByCategory = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((p) => {
      if (!p.categoryId) return;
      map.set(p.categoryId, (map.get(p.categoryId) ?? 0) + 1);
    });
    return map;
  }, [products]);

  const filteredCategories = useMemo(() => {
    const q = search.toLowerCase();
    return categories.filter((c) => {
      if (q && !c.name.toLowerCase().includes(q) && !c.slug.toLowerCase().includes(q)) return false;
      if (filterStatus === 'active'   && c.isActive === false)   return false;
      if (filterStatus === 'inactive' && c.isActive !== false)   return false;
      return true;
    });
  }, [categories, search, filterStatus]);

  const totalPages      = Math.max(1, Math.ceil(filteredCategories.length / PAGE_SIZE));
  const pagedCategories = filteredCategories.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  /* ───────────────────────────────────────────
     FETCH
  ─────────────────────────────────────────── */

  const fetchData = useCallback(async () => {
    try {
      const [catsSnap, prodsSnap] = await Promise.all([
        getDocs(query(collection(db, 'categories'), orderBy('sortOrder', 'asc'))),
        getDocs(collection(db, 'products')),
      ]);

      const catsData: Category[] = catsSnap.docs.map((d, i) => {
        const raw = d.data() as Record<string, any>;
        return {
          id:          d.id,
          name:        raw.name        || 'Sans nom',
          slug:        raw.slug        || generateSlug(raw.name || `cat-${i}`),
          description: raw.description || '',
          coverImage:  raw.coverImage  || '',
          icon:        raw.icon        || '',
          sortOrder:   typeof raw.sortOrder === 'number' ? raw.sortOrder : (raw.order ?? i),
          order:       typeof raw.order     === 'number' ? raw.order     : i,
          isFeatured:  Boolean(raw.isFeatured),
          isActive:    raw.isActive !== false,
          showOnHome:  raw.showOnHome !== false,
          createdAt:   raw.createdAt,
          updatedAt:   raw.updatedAt,
        } as Category;
      });

      setCategories(catsData);
      setProducts(prodsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Product[]);
    } catch (err) {
      console.error(err);
      toast({ title: 'Erreur de chargement', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ───────────────────────────────────────────
     SEED
  ─────────────────────────────────────────── */

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const batch = writeBatch(db);
      SEED_CATEGORIES.forEach((cat, i) => {
        const docRef = doc(collection(db, 'categories'));
        batch.set(docRef, {
          name:        cat.name,
          slug:        generateSlug(cat.name),
          description: cat.description,
          coverImage:  '',
          sortOrder:   i,
          order:       i,
          isFeatured:  i < 2,
          isActive:    true,
          showOnHome:  true,
          createdAt:   serverTimestamp(),
          updatedAt:   serverTimestamp(),
        });
      });
      await batch.commit();
      toast({ title: 'Catégories créées', description: '4 catégories par défaut ajoutées.' });
      await fetchData();
    } catch (err) {
      console.error(err);
      toast({ title: 'Erreur seeding', variant: 'destructive' });
    } finally {
      setSeeding(false);
    }
  };

  /* ───────────────────────────────────────────
     FORM HELPERS
  ─────────────────────────────────────────── */

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setCoverFile(null);
    setCoverPreview('');
    setEditingCategory(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setForm((p) => ({ ...p, sortOrder: categories.length }));
    setDialogOpen(true);
  };

  const openEditDialog = (cat: Category) => {
    setEditingCategory(cat);
    setForm({
      name:        cat.name        || '',
      slug:        cat.slug        || '',
      description: cat.description || '',
      coverImage:  cat.coverImage  || '',
      sortOrder:   cat.sortOrder   ?? (cat.order ?? 0),
      isFeatured:  Boolean(cat.isFeatured),
      isActive:    cat.isActive  !== false,
      showOnHome:  cat.showOnHome !== false,
    });
    setCoverFile(null);
    setCoverPreview('');
    setDialogOpen(true);
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  /* ───────────────────────────────────────────
     SAVE
  ─────────────────────────────────────────── */

  const uploadCoverIfNeeded = async (slug: string): Promise<string> => {
    if (!coverFile) return form.coverImage;
    const storageRef = ref(storage, `categories/${slug}/${Date.now()}_${coverFile.name}`);
    await uploadBytes(storageRef, coverFile);
    return getDownloadURL(storageRef);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: 'Nom requis', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const slug        = generateSlug(form.slug || form.name);
      const coverImage  = await uploadCoverIfNeeded(slug);

      const payload = {
        name:        form.name.trim(),
        slug,
        description: form.description.trim(),
        coverImage,
        sortOrder:   Number(form.sortOrder) || 0,
        order:       Number(form.sortOrder) || 0,
        isFeatured:  form.isFeatured,
        isActive:    form.isActive,
        showOnHome:  form.showOnHome,
        updatedAt:   serverTimestamp(),
      };

      if (editingCategory) {
        await updateDoc(doc(db, 'categories', editingCategory.id), payload);
        toast({ title: 'Catégorie mise à jour' });
      } else {
        await addDoc(collection(db, 'categories'), { ...payload, createdAt: serverTimestamp() });
        toast({ title: 'Catégorie créée' });
      }

      setDialogOpen(false);
      resetForm();
      await fetchData();
    } catch (err) {
      console.error(err);
      toast({ title: 'Erreur lors de la sauvegarde', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  /* ───────────────────────────────────────────
     DUPLICATE
  ─────────────────────────────────────────── */

  const handleDuplicate = async (cat: Category) => {
    try {
      const baseName = `${cat.name} (copie)`;
      await addDoc(collection(db, 'categories'), {
        name:        baseName,
        slug:        generateSlug(baseName),
        description: cat.description || '',
        coverImage:  cat.coverImage  || '',
        sortOrder:   categories.length,
        order:       categories.length,
        isFeatured:  false,
        isActive:    false,
        showOnHome:  false,
        createdAt:   serverTimestamp(),
        updatedAt:   serverTimestamp(),
      });
      toast({ title: 'Catégorie dupliquée', description: `"${baseName}" créée (inactive)` });
      await fetchData();
    } catch (err) {
      console.error(err);
      toast({ title: 'Erreur duplication', variant: 'destructive' });
    }
  };

  /* ───────────────────────────────────────────
     DELETE (soft)
  ─────────────────────────────────────────── */

  const openDeleteDialog = (cat: Category) => {
    setDeleteTarget({
      category:     cat,
      productCount: productCountByCategory.get(cat.id) ?? 0,
      reassignTo:   '',
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const { category, productCount, reassignTo } = deleteTarget;

    try {
      const batch = writeBatch(db);

      batch.update(doc(db, 'categories', category.id), {
        isActive:    false,
        isFeatured:  false,
        showOnHome:  false,
        updatedAt:   serverTimestamp(),
      });

      if (reassignTo && productCount > 0) {
        products
          .filter((p) => p.categoryId === category.id)
          .forEach((p) => {
            batch.update(doc(db, 'products', p.id), {
              categoryId: reassignTo,
              updatedAt:  serverTimestamp(),
            });
          });
      }

      await batch.commit();
      toast({
        title: 'Catégorie désactivée',
        description: reassignTo && productCount > 0
          ? `${productCount} produit(s) réassigné(s).`
          : 'Produits non modifiés.',
      });
      setDeleteTarget(null);
      await fetchData();
    } catch (err) {
      console.error(err);
      toast({ title: 'Erreur de suppression', variant: 'destructive' });
    }
  };

  /* ───────────────────────────────────────────
     INLINE TOGGLE
  ─────────────────────────────────────────── */

  const handleToggle = async (
    cat:   Category,
    key:   'isActive' | 'isFeatured' | 'showOnHome',
    value: boolean,
  ) => {
    // optimistic
    setCategories((prev) => prev.map((c) => c.id === cat.id ? { ...c, [key]: value } : c));
    try {
      await updateDoc(doc(db, 'categories', cat.id), { [key]: value, updatedAt: serverTimestamp() });
    } catch (err) {
      console.error(err);
      // revert
      setCategories((prev) => prev.map((c) => c.id === cat.id ? { ...c, [key]: !value } : c));
      toast({ title: 'Mise à jour impossible', variant: 'destructive' });
    }
  };

  /* ───────────────────────────────────────────
     DRAG & DROP
  ─────────────────────────────────────────── */

  const onDragStart = (index: number) => {
    dragItemRef.current = index;
    setDragIndex(index);
  };

  const onDragEnter = (index: number) => setDragOverIdx(index);

  const onDragEnd = async () => {
    const from = dragItemRef.current;
    const to   = dragOverIdx;
    dragItemRef.current = null;
    setDragIndex(null);
    setDragOverIdx(null);

    if (from === null || to === null || from === to) return;

    const next = [...categories];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setCategories(next);

    setReordering(true);
    try {
      const batch = writeBatch(db);
      next.forEach((cat, i) => {
        batch.update(doc(db, 'categories', cat.id), {
          sortOrder: i,
          order:     i,
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
      toast({ title: 'Ordre enregistré' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Erreur de tri', variant: 'destructive' });
      await fetchData();
    } finally {
      setReordering(false);
    }
  };

  /* ───────────────────────────────────────────
     RENDER — loading
  ─────────────────────────────────────────── */

  if (loading) {
    return (
      <ProtectedRoute requirePermission="canManageProducts">
        <AdminLayout>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Skeleton className="h-8 w-44" />
                <Skeleton className="h-4 w-64" />
              </div>
              <Skeleton className="h-10 w-44" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-40" />
            </div>
            <TableSkeleton />
          </div>
        </AdminLayout>
      </ProtectedRoute>
    );
  }

  /* ───────────────────────────────────────────
     RENDER — main
  ─────────────────────────────────────────── */

  return (
    <ProtectedRoute requirePermission="canManageProducts">
      <AdminLayout>
        <div className="space-y-6">

          {/* ─── Header ─── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold text-leather-dark">Catégories</h1>
              <p className="text-leather-gray text-sm mt-1">
                {categories.length} catégorie{categories.length !== 1 ? 's' : ''}&nbsp;·&nbsp;
                {products.length} produit{products.length !== 1 ? 's' : ''}
              </p>
            </div>

            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle catégorie
            </Button>
          </div>

          {/* ─── Search / Filter bar ─── */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Rechercher par nom ou slug…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <Select
              value={filterStatus}
              onValueChange={(v) => { setFilterStatus(v as FilterStatus); setPage(1); }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="active">Actives</SelectItem>
                <SelectItem value="inactive">Inactives</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ─── Empty state (no categories at all) ─── */}
          {categories.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 rounded-xl border bg-white text-center gap-5">
              <div className="w-16 h-16 rounded-full bg-leather-beige flex items-center justify-center">
                <FolderOpen className="h-8 w-8 text-leather-brown" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-leather-dark">Aucune catégorie</h3>
                <p className="text-leather-gray text-sm mt-1 max-w-xs mx-auto">
                  Créez votre première catégorie ou chargez les valeurs par défaut.
                </p>
              </div>
              <div className="flex gap-3 flex-wrap justify-center">
                <Button onClick={openCreateDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer une catégorie
                </Button>
                <Button variant="outline" disabled={seeding} onClick={handleSeed}>
                  {seeding ? 'Chargement…' : '⚡ Charger Casual / Classic / Sport / Sandales'}
                </Button>
              </div>
            </div>
          )}

          {/* ─── Empty search result ─── */}
          {categories.length > 0 && filteredCategories.length === 0 && (
            <div className="py-14 text-center text-leather-gray rounded-xl border bg-white">
              Aucune catégorie ne correspond à votre recherche.
            </div>
          )}

          {/* ─── Table ─── */}
          {filteredCategories.length > 0 && (
            <div
              className={`rounded-xl border bg-white overflow-hidden transition-opacity${reordering ? ' opacity-50 pointer-events-none' : ''}`}
            >
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-10" />
                    <TableHead className="w-16">Image</TableHead>
                    <TableHead>Nom / Slug</TableHead>
                    <TableHead className="w-24 text-center">Produits</TableHead>
                    <TableHead className="w-28 text-center">Featured</TableHead>
                    <TableHead className="w-28 text-center">Home</TableHead>
                    <TableHead className="w-24 text-center">Active</TableHead>
                    <TableHead className="w-20 text-center">Ordre</TableHead>
                    <TableHead className="w-32 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedCategories.map((cat, pageIdx) => {
                    const globalIdx  = (page - 1) * PAGE_SIZE + pageIdx;
                    const count      = productCountByCategory.get(cat.id) ?? 0;
                    const isDragging = dragIndex    === globalIdx;
                    const isOver     = dragOverIdx  === globalIdx;

                    return (
                      <TableRow
                        key={cat.id}
                        draggable
                        onDragStart={() => onDragStart(globalIdx)}
                        onDragEnter={() => onDragEnter(globalIdx)}
                        onDragEnd={onDragEnd}
                        onDragOver={(e) => e.preventDefault()}
                        className={[
                          'transition-all select-none',
                          isDragging  ? 'opacity-40 bg-muted/30'           : '',
                          isOver      ? 'border-t-2 border-leather-brown'  : '',
                          cat.isActive === false ? 'opacity-60' : '',
                        ].filter(Boolean).join(' ')}
                      >
                        {/* Drag handle */}
                        <TableCell>
                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
                        </TableCell>

                        {/* Cover */}
                        <TableCell>
                          <div className="relative h-12 w-12 rounded-md overflow-hidden bg-leather-beige border flex-shrink-0">
                            <Image
                              src={getOptimizedImage(cat.coverImage || '', 120) || '/placeholder.png'}
                              alt={cat.name}
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          </div>
                        </TableCell>

                        {/* Name + slug */}
                        <TableCell>
                          <p className="font-medium text-leather-dark leading-tight">{cat.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">/{cat.slug}</p>
                        </TableCell>

                        {/* Product count */}
                        <TableCell className="text-center">
                          <Badge variant={count > 0 ? 'default' : 'secondary'} className="font-mono text-xs">
                            {count}
                          </Badge>
                        </TableCell>

                        {/* Featured toggle */}
                        <TableCell className="text-center">
                          <Switch
                            checked={Boolean(cat.isFeatured)}
                            onCheckedChange={(v) => handleToggle(cat, 'isFeatured', v)}
                          />
                        </TableCell>

                        {/* Show on Home toggle */}
                        <TableCell className="text-center">
                          <Switch
                            checked={cat.showOnHome !== false}
                            onCheckedChange={(v) => handleToggle(cat, 'showOnHome', v)}
                          />
                        </TableCell>

                        {/* Active toggle */}
                        <TableCell className="text-center">
                          <Switch
                            checked={cat.isActive !== false}
                            onCheckedChange={(v) => handleToggle(cat, 'isActive', v)}
                          />
                        </TableCell>

                        {/* Sort order */}
                        <TableCell className="text-center text-sm text-muted-foreground">
                          {cat.sortOrder ?? (cat.order ?? globalIdx)}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Modifier"
                              onClick={() => openEditDialog(cat)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Dupliquer"
                              onClick={() => handleDuplicate(cat)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            {isAdmin && (
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Désactiver"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => openDeleteDialog(cat)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20 text-sm text-muted-foreground">
                  <span>
                    Page {page} / {totalPages}&nbsp;·&nbsp;{filteredCategories.length} résultats
                  </span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={page <= 1}          onClick={() => setPage((p) => p - 1)}>← Précédent</Button>
                    <Button size="sm" variant="outline" disabled={page >= totalPages}  onClick={() => setPage((p) => p + 1)}>Suivant →</Button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* ═══════════════════════════════════════════
            CREATE / EDIT DIALOG
        ═══════════════════════════════════════════ */}
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
              </DialogTitle>
              <DialogDescription>
                Les modifications apparaissent automatiquement sur la home et le catalogue.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 pt-2">

              {/* Name + Slug */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cat-name">Nom *</Label>
                  <Input
                    id="cat-name"
                    value={form.name}
                    placeholder="Ex: Casual"
                    onChange={(e) => {
                      const name = e.target.value;
                      setForm((p) => ({
                        ...p,
                        name,
                        slug: editingCategory ? p.slug : generateSlug(name),
                      }));
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cat-slug">Slug</Label>
                  <Input
                    id="cat-slug"
                    value={form.slug}
                    placeholder="casual"
                    onChange={(e) => setForm((p) => ({ ...p, slug: generateSlug(e.target.value) }))}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="cat-desc">Description</Label>
                <Textarea
                  id="cat-desc"
                  value={form.description}
                  rows={3}
                  placeholder="Description courte affichée dans le catalogue"
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                />
              </div>

              {/* Cover + Sort order */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cat-cover">Image de couverture</Label>
                  <Input id="cat-cover" type="file" accept="image/*" onChange={handleCoverChange} />
                  {(coverPreview || form.coverImage) && (
                    <div className="relative h-36 rounded-md border overflow-hidden bg-white mt-2">
                      <Image
                        src={coverPreview || (getOptimizedImage(form.coverImage, 800) ?? '/placeholder.png')}
                        alt="Aperçu"
                        fill
                        sizes="(max-width: 640px) 100vw, 320px"
                        className="object-cover"
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cat-order">Sort Order</Label>
                  <Input
                    id="cat-order"
                    type="number"
                    min={0}
                    value={form.sortOrder}
                    placeholder="0"
                    onChange={(e) => setForm((p) => ({ ...p, sortOrder: Number(e.target.value) || 0 }))}
                  />
                  <p className="text-xs text-muted-foreground">Ordre d&apos;affichage (0 = premier)</p>
                </div>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(
                  [
                    { key: 'isActive'   as const, label: 'Active' },
                    { key: 'isFeatured' as const, label: 'Featured' },
                    { key: 'showOnHome' as const, label: 'Afficher sur Home' },
                  ]
                ).map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between rounded-lg border p-3 bg-muted/20">
                    <Label htmlFor={`dialog-toggle-${key}`} className="cursor-pointer text-sm">{label}</Label>
                    <Switch
                      id={`dialog-toggle-${key}`}
                      checked={form[key]}
                      onCheckedChange={(v) => setForm((p) => ({ ...p, [key]: v }))}
                    />
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 pt-1 border-t">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
                <Button disabled={saving} onClick={handleSave}>
                  {saving ? 'Sauvegarde…' : editingCategory ? 'Mettre à jour' : 'Créer la catégorie'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ═══════════════════════════════════════════
            DELETE CONFIRM
        ═══════════════════════════════════════════ */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <TriangleAlert className="h-5 w-5 text-amber-500" />
                Désactiver &quot;{deleteTarget?.category.name}&quot;&nbsp;?
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3 text-sm">
                  <p>
                    La catégorie sera masquée du storefront (<code>isActive = false</code>).
                    Elle ne sera pas supprimée définitivement et peut être réactivée.
                  </p>

                  {deleteTarget && deleteTarget.productCount > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900 space-y-3">
                      <p className="font-semibold flex items-center gap-1.5">
                        <TriangleAlert className="h-4 w-4 flex-shrink-0" />
                        Cette catégorie contient{' '}
                        <strong>{deleteTarget.productCount} produit(s)</strong>.
                        Vous pouvez les réassigner avant de désactiver.
                      </p>
                      <div className="space-y-1">
                        <Label className="text-xs text-amber-800">Réassigner vers (optionnel)</Label>
                        <Select
                          value={deleteTarget.reassignTo}
                          onValueChange={(v) =>
                            setDeleteTarget((prev) => prev ? { ...prev, reassignTo: v } : prev)
                          }
                        >
                          <SelectTrigger className="bg-white border-amber-300 text-sm">
                            <SelectValue placeholder="Garder sans catégorie" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Garder sans catégorie</SelectItem>
                            {categories
                              .filter((c) => c.id !== deleteTarget.category.id && c.isActive !== false)
                              .map((c) => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-destructive hover:bg-destructive/90 text-white"
              >
                Désactiver la catégorie
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </AdminLayout>
    </ProtectedRoute>
  );
}

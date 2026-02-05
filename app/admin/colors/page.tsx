'use client';

import { useEffect, useState } from 'react';
import { collection, query, orderBy, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '@/lib/firebase/config';
import { ShoeColor } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { createAuditLog, getUserAgent } from '@/lib/firebase/audit';
import ProtectedRoute from '@/components/admin/ProtectedRoute';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, ArrowUp, ArrowDown, Upload, Download } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import predefinedColorsData from '@/lib/data/predefined-colors.json';

export default function ColorsPage() {
  const { user } = useAuth();
  const [colors, setColors] = useState<ShoeColor[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingColor, setEditingColor] = useState<ShoeColor | null>(null);
  const [formData, setFormData] = useState({ name: '', hexCode: '', isActive: true });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [initializing, setInitializing] = useState(false);

  useEffect(() => {
    fetchColors();
  }, []);

  const fetchColors = async () => {
    try {
      const q = query(collection(db, 'colors'), orderBy('order', 'asc'));
      const snapshot = await getDocs(q);
      const colorsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ShoeColor[];
      setColors(colorsData);
    } catch (error) {
      console.error('Error fetching colors:', error);
      toast.error('Failed to load colors');
    } finally {
      setLoading(false);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const fileName = Date.now() + '_' + file.name;
    const storageRef = ref(storage, 'colors/' + fileName);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    return url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setUploading(true);
     let imageUrl = editingColor?.images?.[0]?.url || '';

      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      if (editingColor) {
        await updateDoc(doc(db, 'colors', editingColor.id), {
          name: formData.name,
          hexCode: formData.hexCode,
          image: imageUrl,
          isActive: formData.isActive,
        });

        await createAuditLog({
          actorType: user.role,
          actorId: user.uid,
          actorName: user.displayName,
          action: 'COLOR_UPDATE',
          targetType: 'color',
          targetId: editingColor.id,
          details: { before: editingColor, after: { ...formData, image: imageUrl } },
          metadata: { userAgent: getUserAgent() },
        });

        toast.success('Color updated successfully');
      } else {
        const maxOrder = colors.length > 0 ? Math.max(...colors.map((c) => c.order)) : 0;
        const newColor = await addDoc(collection(db, 'colors'), {
          name: formData.name,
          hexCode: formData.hexCode,
          image: imageUrl,
          isActive: formData.isActive,
          order: maxOrder + 1,
        });

        await createAuditLog({
          actorType: user.role,
          actorId: user.uid,
          actorName: user.displayName,
          action: 'COLOR_CREATE',
          targetType: 'color',
          targetId: newColor.id,
          details: { ...formData, image: imageUrl },
          metadata: { userAgent: getUserAgent() },
        });

        toast.success('Color created successfully');
      }

      setDialogOpen(false);
      setEditingColor(null);
      setFormData({ name: '', hexCode: '', isActive: true });
      setImageFile(null);
      fetchColors();
    } catch (error) {
      console.error('Error saving color:', error);
      toast.error('Failed to save color');
    } finally {
      setUploading(false);
    }
  };

  const handleToggleActive = async (color: ShoeColor) => {
    if (!user) return;

    try {
      await updateDoc(doc(db, 'colors', color.id), {
        isActive: !color.isActive,
      });

      await createAuditLog({
        actorType: user.role,
        actorId: user.uid,
        actorName: user.displayName,
        action: 'COLOR_UPDATE',
        targetType: 'color',
        targetId: color.id,
        details: { field: 'isActive', before: color.isActive, after: !color.isActive },
        metadata: { userAgent: getUserAgent() },
      });

      const action = color.isActive ? 'disabled' : 'enabled';
      toast.success('Color ' + action);
      fetchColors();
    } catch (error) {
      console.error('Error toggling color:', error);
      toast.error('Failed to update color');
    }
  };

  const handleReorder = async (color: ShoeColor, direction: 'up' | 'down') => {
    const currentIndex = colors.findIndex((c) => c.id === color.id);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= colors.length) return;

    try {
      const targetColor = colors[targetIndex];

      await updateDoc(doc(db, 'colors', color.id), { order: targetColor.order });
      await updateDoc(doc(db, 'colors', targetColor.id), { order: color.order });

      toast.success('Colors reordered');
      fetchColors();
    } catch (error) {
      console.error('Error reordering colors:', error);
      toast.error('Failed to reorder colors');
    }
  };

  const handleDelete = async (color: ShoeColor) => {
    if (!user) return;
    if (!confirm('Are you sure you want to delete this color?')) return;

    try {
      if (color.image) {
        try {
          const imageRef = ref(storage, color.image);
          await deleteObject(imageRef);
        } catch (err) {
          console.error('Error deleting image:', err);
        }
      }

      await deleteDoc(doc(db, 'colors', color.id));

      await createAuditLog({
        actorType: user.role,
        actorId: user.uid,
        actorName: user.displayName,
        action: 'COLOR_DISABLE',
        targetType: 'color',
        targetId: color.id,
        details: { deleted: true, name: color.name },
        metadata: { userAgent: getUserAgent() },
      });

      toast.success('Color deleted');
      fetchColors();
    } catch (error) {
      console.error('Error deleting color:', error);
      toast.error('Failed to delete color');
    }
  };

  const handleInitializePredefinedColors = async () => {
    if (!user) return;
    if (!confirm('Initialize predefined shoe colors? This will add dress shoes and leather shoes colors to your collection.')) return;

    try {
      setInitializing(true);
      const allColors = [
        ...predefinedColorsData.dress_shoes_colors,
        ...predefinedColorsData.leather_shoes_colors
      ];

      const maxOrder = colors.length > 0 ? Math.max(...colors.map((c) => c.order)) : 0;
      let currentOrder = maxOrder + 1;

      for (const color of allColors) {
        await addDoc(collection(db, 'colors'), {
          name: color.name,
          hexCode: color.hexCode,
          isActive: true,
          order: currentOrder++,
        });
      }

      await createAuditLog({
        actorType: user.role,
        actorId: user.uid,
        actorName: user.displayName,
        action: 'COLOR_BULK_CREATE',
        targetType: 'color',
        targetId: 'predefined',
        details: { count: allColors.length, colors: allColors },
        metadata: { userAgent: getUserAgent() },
      });

      toast.success(`${allColors.length} colors initialized successfully`);
      fetchColors();
    } catch (error) {
      console.error('Error initializing colors:', error);
      toast.error('Failed to initialize colors');
    } finally {
      setInitializing(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requireAdmin>
        <AdminLayout>
          <div className="flex items-center justify-center h-64">
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
            <h1 className="text-3xl font-bold">Shoe Colors Management</h1>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleInitializePredefinedColors}
                disabled={initializing}
              >
                <Download className="h-4 w-4 mr-2" />
                {initializing ? 'Initializing...' : 'Initialize Colors'}
              </Button>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => { setEditingColor(null); setFormData({ name: '', hexCode: '', isActive: true }); setImageFile(null); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Color
                  </Button>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingColor ? 'Edit Color' : 'Add New Color'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Color Name</label>
                    <Input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Black, Brown, Tan..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Hex Code (Optional)</label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={formData.hexCode}
                        onChange={(e) => setFormData({ ...formData, hexCode: e.target.value })}
                        placeholder="#000000"
                      />
                      {formData.hexCode && (
                        <div
                          className="w-10 h-10 rounded border-2 border-gray-300"
                          style={{ backgroundColor: formData.hexCode }}
                        ></div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Color Swatch Image (Optional)</label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    />
                    <label className="text-sm font-medium">Active</label>
                  </div>
                  <Button type="submit" className="w-full" disabled={uploading}>
                    {uploading ? 'Uploading...' : editingColor ? 'Update' : 'Create'} Color
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
            </div>
          </div>

          {colors.length === 0 && (
            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="flex items-start gap-3">
                <Download className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-1">Quick Start</h3>
                  <p className="text-sm text-blue-800 mb-2">
                    Click &quot;Initialize Colors&quot; to add 8 predefined shoe colors:
                  </p>
                  <div className="text-sm text-blue-700 space-y-1">
                    <div><strong>Dress Shoes:</strong> Black, Brown, Coff</div>
                    <div><strong>Leather Shoes:</strong> Black leather, Black leather / Black nubuk, Kaki nubuk, Brown nubuk, Grey nubuk</div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          <Card className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Preview</TableHead>
                  <TableHead>Color Name</TableHead>
                  <TableHead>Hex Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {colors.map((color, index) => (
                  <TableRow key={color.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {color.hexCode && (
                          <div
                            className="w-8 h-8 rounded border-2 border-gray-300"
                            style={{ backgroundColor: color.hexCode }}
                          ></div>
                        )}
                        {color.image && (
                          <div className="relative w-8 h-8">
                            <Image src={color.image} alt={color.name} fill className="object-cover rounded" />
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{color.name}</TableCell>
                    <TableCell>{color.hexCode || '-'}</TableCell>
                    <TableCell>
                      <Switch checked={color.isActive} onCheckedChange={() => handleToggleActive(color)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={index === 0}
                          onClick={() => handleReorder(color, 'up')}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={index === colors.length - 1}
                          onClick={() => handleReorder(color, 'down')}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingColor(color);
                            setFormData({ name: color.name, hexCode: color.hexCode || '', isActive: color.isActive });
                            setDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(color)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}

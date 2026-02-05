'use client';

import { useEffect, useState } from 'react';
import { collection, query, orderBy, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { ShoeSize } from '@/lib/types';
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
import { Plus, Edit, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';

export default function SizesPage() {
  const { user } = useAuth();
  const [sizes, setSizes] = useState<ShoeSize[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSize, setEditingSize] = useState<ShoeSize | null>(null);
  const [formData, setFormData] = useState({ value: 0, isActive: true });

  useEffect(() => {
    fetchSizes();
  }, []);

  const fetchSizes = async () => {
    try {
      const q = query(collection(db, 'sizes'), orderBy('order', 'asc'));
      const snapshot = await getDocs(q);
      const sizesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ShoeSize[];
      setSizes(sizesData);
    } catch (error) {
      console.error('Error fetching sizes:', error);
      toast.error('Failed to load sizes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (editingSize) {
        await updateDoc(doc(db, 'sizes', editingSize.id), {
          value: formData.value,
          isActive: formData.isActive,
        });

        await createAuditLog({
          actorType: user.role,
          actorId: user.uid,
          actorName: user.displayName,
          action: 'SIZE_UPDATE',
          targetType: 'size',
          targetId: editingSize.id,
          details: { before: editingSize, after: formData },
          metadata: { userAgent: getUserAgent() },
        });

        toast.success('Size updated successfully');
      } else {
        const maxOrder = sizes.length > 0 ? Math.max(...sizes.map((s) => s.order)) : 0;
        const newSize = await addDoc(collection(db, 'sizes'), {
          value: formData.value,
          isActive: formData.isActive,
          order: maxOrder + 1,
        });

        await createAuditLog({
          actorType: user.role,
          actorId: user.uid,
          actorName: user.displayName,
          action: 'SIZE_CREATE',
          targetType: 'size',
          targetId: newSize.id,
          details: formData,
          metadata: { userAgent: getUserAgent() },
        });

        toast.success('Size created successfully');
      }

      setDialogOpen(false);
      setEditingSize(null);
      setFormData({ value: 0, isActive: true });
      fetchSizes();
    } catch (error) {
      console.error('Error saving size:', error);
      toast.error('Failed to save size');
    }
  };

  const handleToggleActive = async (size: ShoeSize) => {
    if (!user) return;

    try {
      await updateDoc(doc(db, 'sizes', size.id), {
        isActive: !size.isActive,
      });

      await createAuditLog({
        actorType: user.role,
        actorId: user.uid,
        actorName: user.displayName,
        action: 'SIZE_UPDATE',
        targetType: 'size',
        targetId: size.id,
        details: { field: 'isActive', before: size.isActive, after: !size.isActive },
        metadata: { userAgent: getUserAgent() },
      });

      const action = size.isActive ? 'disabled' : 'enabled';
      toast.success('Size ' + action);
      fetchSizes();
    } catch (error) {
      console.error('Error toggling size:', error);
      toast.error('Failed to update size');
    }
  };

  const handleReorder = async (size: ShoeSize, direction: 'up' | 'down') => {
    const currentIndex = sizes.findIndex((s) => s.id === size.id);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= sizes.length) return;

    try {
      const targetSize = sizes[targetIndex];

      await updateDoc(doc(db, 'sizes', size.id), { order: targetSize.order });
      await updateDoc(doc(db, 'sizes', targetSize.id), { order: size.order });

      toast.success('Sizes reordered');
      fetchSizes();
    } catch (error) {
      console.error('Error reordering sizes:', error);
      toast.error('Failed to reorder sizes');
    }
  };

  const handleDelete = async (size: ShoeSize) => {
    if (!user) return;
    if (!confirm('Are you sure you want to delete this size?')) return;

    try {
      await deleteDoc(doc(db, 'sizes', size.id));

      await createAuditLog({
        actorType: user.role,
        actorId: user.uid,
        actorName: user.displayName,
        action: 'SIZE_DISABLE',
        targetType: 'size',
        targetId: size.id,
        details: { deleted: true, value: size.value },
        metadata: { userAgent: getUserAgent() },
      });

      toast.success('Size deleted');
      fetchSizes();
    } catch (error) {
      console.error('Error deleting size:', error);
      toast.error('Failed to delete size');
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
            <h1 className="text-3xl font-bold">Shoe Sizes Management</h1>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { setEditingSize(null); setFormData({ value: 0, isActive: true }); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Size
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingSize ? 'Edit Size' : 'Add New Size'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Size Value</label>
                    <Input
                      type="number"
                      required
                      value={formData.value || ''}
                      onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) })}
                      placeholder="e.g. 36, 37, 38..."
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    />
                    <label className="text-sm font-medium">Active</label>
                  </div>
                  <Button type="submit" className="w-full">
                    {editingSize ? 'Update' : 'Create'} Size
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Size Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sizes.map((size, index) => (
                  <TableRow key={size.id}>
                    <TableCell className="font-medium">{size.value}</TableCell>
                    <TableCell>
                      <Switch checked={size.isActive} onCheckedChange={() => handleToggleActive(size)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={index === 0}
                          onClick={() => handleReorder(size, 'up')}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={index === sizes.length - 1}
                          onClick={() => handleReorder(size, 'down')}
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
                            setEditingSize(size);
                            setFormData({ value: size.value, isActive: size.isActive });
                            setDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(size)}>
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

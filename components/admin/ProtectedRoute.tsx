'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requirePermission?: 'canManageProducts' | 'canManageOrders' | 'canManageInvoices';
}

export default function ProtectedRoute({ children, requireAdmin, requirePermission }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/admin/login');
    } else if (!loading && user) {
      if (requireAdmin && user.role !== 'admin') {
        router.push('/admin/dashboard');
      } else if (requirePermission && user.role !== 'admin' && !user.permissions?.[requirePermission]) {
        router.push('/admin/dashboard');
      }
    }
  }, [user, loading, router, requireAdmin, requirePermission]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (requireAdmin && user.role !== 'admin') {
    return null;
  }

  if (requirePermission && user.role !== 'admin' && !user.permissions?.[requirePermission]) {
    return null;
  }

  return <>{children}</>;
}

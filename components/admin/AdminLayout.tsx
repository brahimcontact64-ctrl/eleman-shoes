'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  FileText,
  Truck,
  Settings,
  Users,
  ListTree,
  FileBarChart,
  LogOut,
  Ruler,
  Palette,
  Award,
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.push('/admin/login');
  };

  const menuItems = [
    { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/admin/products', icon: Package, label: 'Produits', permission: 'canManageProducts' },
    { href: '/admin/brands', icon: Award, label: 'Marques', adminOnly: true },
    { href: '/admin/categories', icon: ListTree, label: 'Catégories', permission: 'canManageProducts' },
    { href: '/admin/sizes', icon: Ruler, label: 'Pointures', adminOnly: true },
    { href: '/admin/colors', icon: Palette, label: 'Couleurs', adminOnly: true },
    { href: '/admin/orders', icon: ShoppingCart, label: 'Commandes', permission: 'canManageOrders' },
    { href: '/admin/invoices', icon: FileText, label: 'Factures', permission: 'canManageInvoices' },
    { href: '/admin/delivery', icon: Truck, label: 'Livraison', adminOnly: true },
    { href: '/admin/settings', icon: Settings, label: 'Paramètres', adminOnly: true },
    { href: '/admin/users', icon: Users, label: 'Utilisateurs', adminOnly: true },
    { href: '/admin/audit-logs', icon: FileBarChart, label: 'Logs', adminOnly: true },
  ];

  const canAccessItem = (item: any) => {
    if (item.adminOnly && user?.role !== 'admin') return false;
    if (item.permission && user?.role !== 'admin' && !user?.permissions?.[item.permission as keyof typeof user.permissions]) return false;
    return true;
  };

  return (
    <div className="min-h-screen bg-leather-beige">
      <div className="flex">
        <aside className="w-64 bg-leather-dark shadow-md min-h-screen">
          <div className="p-4 border-b border-leather-brown/30">
            <Link href="/admin/dashboard">
              <h1 className="text-xl font-bold text-leather-beige">Admin Panel</h1>
            </Link>
            {user && (
              <p className="text-sm text-leather-light/70 mt-1">{user.displayName}</p>
            )}
          </div>

          <nav className="p-4">
            <ul className="space-y-2">
              {menuItems.filter(canAccessItem).map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={'flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ' + (isActive ? 'bg-leather-brown text-white' : 'text-leather-beige hover:bg-leather-brown/20')}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="p-4 border-t border-leather-brown/30 absolute bottom-0 w-64">
            <Button variant="outline" className="w-full border-leather-light/30 text-leather-beige hover:bg-leather-brown hover:text-white" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Déconnexion
            </Button>
          </div>
        </aside>

        <main className="flex-1 p-8 bg-leather-beige">{children}</main>
      </div>
    </div>
  );
}

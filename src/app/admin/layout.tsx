'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function AdminRouteLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  return (
    <ProtectedRoute requireAdmin={true}>
      <AdminLayout>{children}</AdminLayout>
    </ProtectedRoute>
  );
}

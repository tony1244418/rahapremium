'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loading } from '@/components/ui/Loading';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export default function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, adminUser, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      const redirectUrl = pathname !== '/' ? `?redirect=${encodeURIComponent(pathname)}` : '';
      if (requireAdmin && !adminUser) {
        router.push(`/admin/login${redirectUrl}`);
      } else if (!requireAdmin && !user && !adminUser) {
        router.push(`/auth${redirectUrl}`);
      }
    }
  }, [user, adminUser, loading, requireAdmin, router, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-main-gradient flex items-center justify-center">
        <Loading size="lg" text={t('loading')} variant="splash" />
      </div>
    );
  }

  if (requireAdmin && !adminUser) {
    return null;
  }

  if (!requireAdmin && !user && !adminUser) {
    return null;
  }

  return <>{children}</>;
}

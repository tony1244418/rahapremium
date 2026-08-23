'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePlatformControls } from '@/contexts/PlatformControlContext';
import { useRouter, usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loading } from '@/components/ui/Loading';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  /**
   * When true, this route becomes open to anonymous visitors while the admin
   * "All Content Free" switch is ON — no signup/login required (like free
   * Live TV). Used for normal content pages (movies & series).
   */
  allowAnonymousWhenFree?: boolean;
}

export default function ProtectedRoute({
  children,
  requireAdmin = false,
  allowAnonymousWhenFree = false
}: ProtectedRouteProps) {
  const { user, adminUser, loading } = useAuth();
  const { toggles, loading: togglesLoading } = usePlatformControls();
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();

  // Anonymous access is allowed only for content routes while the global
  // "All Content Free" toggle is enabled (never for admin routes).
  const anonymousAllowed =
    allowAnonymousWhenFree && !requireAdmin && !togglesLoading && toggles.allContentFree;

  useEffect(() => {
    if (!loading && !anonymousAllowed) {
      const redirectUrl = pathname !== '/' ? `?redirect=${encodeURIComponent(pathname)}` : '';
      if (requireAdmin && !adminUser) {
        router.push(`/admin/login${redirectUrl}`);
      } else if (!requireAdmin && !user && !adminUser) {
        router.push(`/auth${redirectUrl}`);
      }
    }
  }, [user, adminUser, loading, requireAdmin, router, pathname, anonymousAllowed]);

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

  if (!requireAdmin && !user && !adminUser && !anonymousAllowed) {
    return null;
  }

  return <>{children}</>;
}

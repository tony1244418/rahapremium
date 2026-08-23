'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePlatformControls } from '@/contexts/PlatformControlContext';
import { Loading } from '@/components/ui/Loading';

/**
 * Wraps any adult-only page/component.
 * If the admin has disabled the adult section, the user is immediately
 * redirected to the home page and the child content is never rendered.
 */
export function AdultSectionGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { toggles, loading } = usePlatformControls();

  useEffect(() => {
    if (!loading && !toggles.adultSectionEnabled) {
      router.replace('/');
    }
  }, [toggles.adultSectionEnabled, loading, router]);

  // While loading, show a spinner so there's no flash of content
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loading size="lg" variant="bar" />
      </div>
    );
  }

  // Section disabled — render nothing (redirect fires in useEffect)
  if (!toggles.adultSectionEnabled) {
    return null;
  }

  return <>{children}</>;
}

'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Loading } from '@/components/ui/Loading';

export const AuthLoading: React.FC = () => {
  const { loading } = useAuth();

  if (!loading) return null;

  return (
    <div className="fixed inset-0 bg-main-gradient flex items-center justify-center z-50">
      <div className="text-center">
        <div className="relative">
          {/* Background splash effects */}
          <div className="absolute inset-0 water-ripple"></div>
          <Loading size="lg" variant="splash" />
        </div>
      </div>
    </div>
  );
};

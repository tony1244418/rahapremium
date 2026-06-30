'use client';

import React from 'react';
import MainLayout from '@/components/MainLayout';
import { Search, Home } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <MainLayout>
      <div className="container-mobile flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-primary-gradient rounded-full flex items-center justify-center mx-auto mb-4">
            <Search size={32} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gradient mb-2">
            404
          </h1>
          <h2 className="text-xl font-semibold text-dark-100 mb-2">
            Page Not Found
          </h2>
          <p className="text-dark-400 mb-6">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <div className="space-y-3">
            <Link
              href="/"
              className="button-primary w-full flex items-center justify-center space-x-2"
            >
              <Home size={16} />
              <span>Go Home</span>
            </Link>
            <button
              onClick={() => window.history.back()}
              className="button-secondary w-full"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

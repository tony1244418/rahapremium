'use client';

import React from 'react';
import Header from './Header';
import BottomNavigation from './BottomNavigation';
import DeviceConflictModal from './DeviceConflictModal';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {


  return (
    <div className="min-h-screen bg-main-gradient">
      {/* Global device conflict / kicked-out modal */}
      <DeviceConflictModal />
      <Header />
      <main className="content-wrapper">
        {children}
      </main>
      <BottomNavigation />


    </div>
  );
}

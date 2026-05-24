'use client';

import React, { useState } from 'react';
import AdminHeader from './AdminHeader';
import AdminSidebar from './AdminSidebar';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-main-gradient">
      {/* Sticky Header */}
      <AdminHeader onMenuClick={() => setSidebarOpen(true)} />

      <div className="flex pt-16" style={{ minHeight: 'calc(100vh - 64px)' }}>
        {/* Desktop: Always-visible fixed sidebar */}
        <div className="hidden md:block w-64 lg:w-80 flex-shrink-0">
          <div className="fixed top-16 bottom-0 w-64 lg:w-80 h-[calc(100vh-64px)] overflow-y-auto border-r border-dark-700/50 bg-dark-900/80 backdrop-blur-md z-30">
            <AdminSidebar isOpen={true} onClose={() => {}} />
          </div>
        </div>

        {/* Mobile: Slide-in drawer */}
        <div className="md:hidden">
          <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        </div>

        {/* Main Content */}
        <main className="flex-1 min-w-0 w-full overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

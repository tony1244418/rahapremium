'use client';

import React from 'react';
import { X, Home, Users, Shield, Film, CreditCard, Settings, BarChart3, AlertCircle, Gamepad2, MessageSquare, AlertTriangle, Radio, Package, Key } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const { t } = useLanguage();
  const { adminUser } = useAuth();
  const pathname = usePathname();

  const adminMenuItems = [
    {
      icon: Home,
      label: 'Dashboard',
      href: '/admin',
      description: 'Overview and analytics'
    },
    {
      icon: Users,
      label: 'Manage Users',
      href: '/admin/users',
      description: 'User management and permissions'
    },
    {
      icon: Shield,
      label: 'Manage Admins',
      href: '/admin/manage-admins',
      description: 'Admin account management'
    },
    {
      icon: Film,
      label: 'Content Management',
      href: '/admin/content',
      description: 'Movies and series'
    },
    {
      icon: Gamepad2,
      label: 'Game Management',
      href: '/admin/games',
      description: 'Manage games and downloads'
    },
    {
      icon: Radio,
      label: 'Live TV Channels',
      href: '/admin/live-channels',
      description: 'Manage live streaming channels'
    },
    {
      icon: CreditCard,
      label: 'Payment Management',
      href: '/admin/payments',
      description: 'Subscriptions and payments'
    },
    {
      icon: Package,
      label: 'Package Settings',
      href: '/admin/packages',
      description: 'Manage subscription prices'
    },
    {
      icon: BarChart3,
      label: 'Analytics',
      href: '/admin/analytics',
      description: 'Reports and insights'
    },
    {
      icon: MessageSquare,
      label: 'Community Feedback',
      href: '/admin/feedback',
      description: 'Manage user feedback and comments'
    },
    {
      icon: AlertTriangle,
      label: 'Adult Content',
      href: '/admin/adult-content',
      description: 'Manage Zilizovuja and Ngono videos'
    },
    {
      icon: Settings,
      label: 'System Settings',
      href: '/admin/settings',
      description: 'Configuration and preferences'
    },
    {
      icon: Key,
      label: 'CDN Token',
      href: '/admin/cdn-token',
      description: 'Global token management'
    }
  ];

  const quickActions = [
    {
      icon: AlertCircle,
      label: 'Pending Payments',
      href: '/admin/payments?filter=pending',
      color: 'text-orange-400'
    },
    {
      icon: Users,
      label: 'New Users',
      href: '/admin/users?filter=new',
      color: 'text-blue-400'
    },
    {
      icon: Film,
      label: 'Add Content',
      href: '/admin/content?action=add',
      color: 'text-green-400'
    }
  ];

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-dark-700/50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-red-gradient rounded-lg flex items-center justify-center">
            <Shield size={24} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gradient">Admin Panel</h2>
            <p className="text-sm text-dark-400">RahaPremium</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="touch-button text-dark-400 hover:text-dark-100 transition-colors duration-200 focus-ring rounded-lg md:hidden"
          aria-label={t('close')}
        >
          <X size={24} />
        </button>
      </div>

      {/* Admin Info */}
      <div className="p-4 border-b border-dark-700/50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-red-gradient rounded-full flex items-center justify-center">
            <span className="text-white font-semibold">
              {adminUser?.displayName?.charAt(0).toUpperCase() || 'A'}
            </span>
          </div>
          <div>
            <p className="font-medium text-dark-100">
              {adminUser?.displayName || 'Administrator'}
            </p>
            <p className="text-sm text-dark-400">Admin Access</p>
          </div>
        </div>
      </div>

      {/* Main Menu */}
      <div className="flex-1 py-4 overflow-y-auto">
        <nav className="space-y-1 px-4">
          <div className="text-xs font-semibold text-dark-500 uppercase tracking-wider mb-3">
            Main Navigation
          </div>
          {adminMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-all duration-200 group ${
                  isActive
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'text-dark-200 hover:text-red-400 hover:bg-dark-800/50'
                }`}
              >
                <Icon
                  size={20}
                  className={`transition-colors duration-200 ${
                    isActive ? 'text-red-400' : 'group-hover:text-red-400'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{item.label}</span>
                  <p className="text-xs text-dark-500 group-hover:text-dark-400">
                    {item.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Quick Actions */}
        <div className="mt-8 px-4">
          <div className="text-xs font-semibold text-dark-500 uppercase tracking-wider mb-3">
            Quick Actions
          </div>
          <div className="space-y-1">
            {quickActions.map((action) => {
              const Icon = action.icon;

              return (
                <Link
                  key={action.href}
                  href={action.href}
                  onClick={onClose}
                  className="flex items-center space-x-3 px-3 py-2 rounded-lg text-dark-300 hover:text-dark-100 hover:bg-dark-800/30 transition-all duration-200 group"
                >
                  <Icon
                    size={16}
                    className={`${action.color} group-hover:scale-110 transition-transform duration-200`}
                  />
                  <span className="text-sm font-medium">{action.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-dark-700/50">
        <div className="text-center text-xs text-dark-500">
          <p>&copy; {new Date().getFullYear()} RahaPremium</p>
          <p>Admin Control Panel</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile: Backdrop overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm md:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Mobile: Animated drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 bottom-0 z-50 w-80 max-w-[85vw] glass-effect border-r border-dark-700/50 md:hidden"
          >
            {renderSidebarContent()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop: Always-visible static sidebar */}
      <div className="hidden md:flex md:flex-col h-full w-full glass-effect border-none">
        {renderSidebarContent()}
      </div>
    </>
  );
}

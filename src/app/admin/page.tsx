'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  Users, 
  DollarSign, 
  Film, 
  Tv,
  BookOpen,
  CreditCard,
  Shield,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Ban,
  Gamepad2
} from 'lucide-react';
import { getAnalytics, subscribeToAnalytics, AdminAnalytics } from '@/lib/admin';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Loading } from '@/components/ui/Loading';

export default function AdminDashboard() {
  const { adminUser } = useAuth();
  const { t } = useLanguage();
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminUser) return;

    // Load initial analytics
    getAnalytics().then(data => {
      setAnalytics(data);
      setLoading(false);
    });

    // Subscribe to real-time updates
    const unsubscribe = subscribeToAnalytics(setAnalytics);
    
    return () => unsubscribe();
  }, [adminUser]);

  if (loading) {
    return (
      <div className="container-mobile flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="relative">
                {/* Background splash effects */}
                <div className="absolute inset-0 water-ripple"></div>
                <Loading size="lg" text="Loading dashboard..." variant="splash" />
              </div>
            </div>
          </div>
    );
  }

  const statsCards = [
    {
      title: 'Total Users',
      value: analytics?.totalUsers || 0,
      icon: Users,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      href: '/admin/users'
    },
    {
      title: 'Active Subscriptions',
      value: analytics?.activeSubscriptions || 0,
      icon: CheckCircle,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      href: '/admin/users'
    },
    {
      title: 'Total Revenue',
      value: `TSH ${(analytics?.totalRevenue || 0).toLocaleString()}`,
      icon: DollarSign,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20',
      href: '/admin/payments'
    },
    {
      title: 'Monthly Revenue',
      value: `TSH ${(analytics?.monthlyRevenue || 0).toLocaleString()}`,
      icon: TrendingUp,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
      href: '/admin/payments'
    },
    {
      title: 'Movies',
      value: analytics?.totalMovies || 0,
      icon: Film,
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
      href: '/admin/content'
    },
    {
      title: 'TV Series',
      value: analytics?.totalSeries || 0,
      icon: Tv,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/20',
      href: '/admin/content'
    },
    {
      title: 'Pending Payments',
      value: analytics?.pendingPayments || 0,
      icon: Clock,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/20',
      href: '/admin/payments'
    },
    {
      title: 'Blocked Users',
      value: analytics?.blockedUsers || 0,
      icon: Ban,
      color: 'text-red-500',
      bgColor: 'bg-red-600/20',
      href: '/admin/users'
    }
  ];

  const quickActions = [
    {
      title: 'Add Content',
      description: 'Upload new movies or TV series',
      icon: Film,
      href: '/admin/content?action=add&tab=movies',
      color: 'bg-primary-gradient'
    },
    {
      title: 'Add Game',
      description: 'Upload new games',
      icon: Gamepad2,
      href: '/admin/content?action=add&tab=games',
      color: 'bg-purple-gradient'
    },
    {
      title: 'Content Management',
      description: 'Manage existing content and categories',
      icon: Tv,
      href: '/admin/content',
      color: 'bg-indigo-gradient'
    },
    {
      title: 'Manage Users',
      description: 'View, block, unblock, and manage user accounts',
      icon: Users,
      href: '/admin/users',
      color: 'bg-blue-gradient'
    },
    {
      title: 'Manage Admins',
      description: 'Add and manage administrator accounts',
      icon: Shield,
      href: '/admin/manage-admins',
      color: 'bg-gray-gradient'
    },
    {
      title: 'Payment Management',
      description: 'Process payments and manage subscriptions',
      icon: CreditCard,
      href: '/admin/payments',
      color: 'bg-accent-gradient'
    },
    {
      title: 'System Settings',
      description: 'Configure system settings and preferences',
      icon: Shield,
      href: '/admin/settings',
      color: 'bg-red-gradient'
    }
  ];

  return (
    <div className="container-mobile space-y-8">
          {/* Header */}
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-primary-gradient rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield size={32} className="text-white" />
            </div>
            <h1 className="text-responsive-2xl font-bold text-gradient mb-2">
              Admin Dashboard
            </h1>
            <p className="text-responsive-base text-dark-300">
              Welcome back, {adminUser?.displayName || 'Administrator'}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {statsCards.map((stat, index) => (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link href={stat.href}>
                  <div className="glass-effect rounded-lg p-6 hover:bg-dark-800/30 transition-colors duration-200 group">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                        <stat.icon size={24} className={stat.color} />
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-dark-100">
                          {typeof stat.value === 'string' ? stat.value : stat.value.toLocaleString()}
                        </p>
                        <p className="text-sm text-dark-400 group-hover:text-dark-300 transition-colors duration-200">
                          {stat.title}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            <h2 className="text-responsive-xl font-bold text-dark-100">
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {quickActions.map((action, index) => (
                <motion.div
                  key={action.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                >
                  <Link href={action.href}>
                    <div className="glass-effect rounded-lg p-6 hover:bg-dark-800/30 transition-all duration-200 group card-hover">
                      <div className="flex items-start space-x-4">
                        <div className={`w-16 h-16 ${action.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                          <action.icon size={28} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-dark-100 mb-2 group-hover:text-primary-400 transition-colors duration-200">
                            {action.title}
                          </h3>
                          <p className="text-sm text-dark-400 group-hover:text-dark-300 transition-colors duration-200">
                            {action.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="space-y-6">
            <h2 className="text-responsive-xl font-bold text-dark-100">
              System Status
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-effect rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <div>
                    <p className="text-sm font-medium text-dark-100">System Status</p>
                    <p className="text-xs text-green-400">Online</p>
                  </div>
                </div>
              </div>
              
              <div className="glass-effect rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
                  <div>
                    <p className="text-sm font-medium text-dark-100">Database</p>
                    <p className="text-xs text-blue-400">Connected</p>
                  </div>
                </div>
              </div>
              
              <div className="glass-effect rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
                  <div>
                    <p className="text-sm font-medium text-dark-100">Payments</p>
                    <p className="text-xs text-yellow-400">Processing</p>
                  </div>
                </div>
              </div>
              
              <div className="glass-effect rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse"></div>
                  <div>
                    <p className="text-sm font-medium text-dark-100">Content</p>
                    <p className="text-xs text-purple-400">Synced</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Alerts */}
          {(analytics?.pendingPayments || 0) > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-effect rounded-lg p-6 border border-orange-500/50"
            >
              <div className="flex items-start space-x-4">
                <AlertCircle size={24} className="text-orange-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-orange-400 mb-2">
                    Pending Payments Alert
                  </h3>
                  <p className="text-dark-300 text-sm mb-4">
                    You have {analytics?.pendingPayments} pending payment(s) that require attention.
                  </p>
                  <Link
                    href="/admin/payments"
                    className="button-primary px-4 py-2 text-sm"
                  >
                    Review Payments
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </div>
  );
}

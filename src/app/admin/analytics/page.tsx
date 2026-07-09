'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { adminFetch } from '@/lib/api-client';
import { 
  BarChart3,
  DollarSign,
  Users,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Film,
  Tv,
  BookOpen,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  Activity,
  Package,
  Target,
  RefreshCw,
  DownloadCloud
} from 'lucide-react';
import { getDetailedAnalytics, subscribeToDetailedAnalytics, DetailedAnalytics } from '@/lib/admin';
import { motion } from 'framer-motion';
import { Loading } from '@/components/ui/Loading';

// Simple Bar Chart Component (Mobile-friendly)
const SimpleBarChart = ({ 
  data, 
  maxValue, 
  labelKey, 
  valueKey, 
  color = 'bg-primary-500',
  height = 200 
}: {
  data: any[];
  maxValue: number;
  labelKey: string;
  valueKey: string;
  color?: string;
  height?: number;
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-dark-400">
        <p>No data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bar Chart */}
      <div className="flex items-end justify-between space-x-1 sm:space-x-2" style={{ height: `${height}px` }}>
        {data.map((item, index) => {
          const value = item[valueKey];
          const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
          const barHeight = Math.max((percentage / 100) * height, 8);
          
          return (
            <div key={index} className="flex-1 flex flex-col items-center justify-end relative">
              {/* Value Tooltip - Always visible, responsive */}
              <div className="absolute -top-7 sm:-top-8 left-1/2 transform -translate-x-1/2 bg-dark-900/95 backdrop-blur-sm text-white text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5 rounded whitespace-nowrap z-10 shadow-lg">
                {typeof value === 'number' && valueKey === 'revenue' 
                  ? `TSH ${value.toLocaleString()}` 
                  : typeof value === 'number'
                  ? value.toLocaleString()
                  : value}
              </div>
              
              {/* Bar */}
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${barHeight}px` }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`w-full ${color} rounded-t-lg min-h-[8px] transition-opacity active:opacity-70 relative`}
                style={{ height: `${barHeight}px` }}
              />
            </div>
          );
        })}
      </div>
      
      {/* Labels */}
      <div className="flex items-center justify-between space-x-1 sm:space-x-2 mt-2">
        {data.map((item, index) => (
          <div key={index} className="flex-1 text-center">
            <span className="text-xs text-dark-400 block truncate" title={item[labelKey]}>
              {item[labelKey]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Progress Bar Component
const ProgressBar = ({ 
  label, 
  value, 
  max, 
  color = 'bg-primary-500',
  showValue = true 
}: {
  label: string;
  value: number;
  max: number;
  color?: string;
  showValue?: boolean;
}) => {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-sm">
        <span className="text-dark-300 font-medium">{label}</span>
        {showValue && (
          <span className="text-dark-400 font-semibold">
            {typeof value === 'number' && label.toLowerCase().includes('revenue')
              ? `TSH ${value.toLocaleString()}`
              : value}
          </span>
        )}
      </div>
      <div className="w-full bg-dark-800 rounded-full h-3 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5 }}
          className={`h-full ${color} rounded-full`}
        />
      </div>
    </div>
  );
};

export default function AdminAnalyticsPage() {
  const { adminUser } = useAuth();
  const { t } = useLanguage();
  const [analytics, setAnalytics] = useState<DetailedAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!adminUser) return;

    // Load initial analytics
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        const data = await getDetailedAnalytics();
        setAnalytics(data);
      } catch (error) {
        console.error('Error loading analytics:', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

    loadAnalytics();

    // Subscribe to real-time updates
    const unsubscribe = subscribeToDetailedAnalytics((data) => {
      setAnalytics(data);
      setLoading(false);
      setRefreshing(false);
    });
    
    return () => unsubscribe();
  }, [adminUser]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await getDetailedAnalytics();
      setAnalytics(data);
    } catch (error) {
      console.error('Error refreshing analytics:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const response = await adminFetch('/api/admin/analytics/export?charts=1');
      if (!response.ok) {
        throw new Error('Failed to download analytics report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `raha-analytics-dashboard-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download analytics report. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="container-mobile flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="relative">
                <div className="absolute inset-0 water-ripple"></div>
                <Loading size="lg" text="Loading analytics..." variant="splash" />
              </div>
            </div>
          </div>
    );
  }

  if (!analytics) {
    return (
      <div className="container-mobile flex items-center justify-center min-h-96">
            <div className="text-center">
              <p className="text-dark-400">No analytics data available</p>
            </div>
          </div>
    );
  }

  // Calculate max values for charts
  const maxRevenue = Math.max(...analytics.dailyRevenueLast7Days.map(d => d.revenue), 1);
  const maxUsers = Math.max(...analytics.dailyUsersLast7Days.map(d => d.users), 1);
  const maxPayments = Math.max(
    ...analytics.dailyPaymentsLast7Days.map(d => Math.max(d.completed, d.failed)),
    1
  );

  // Package colors
  const packageColors = {
    FEDHA: 'bg-yellow-500',
    CHUMA: 'bg-gray-500',
    DHAHABU: 'bg-yellow-400',
    ALMASI: 'bg-blue-500',
    MALKIA: 'bg-primary-500'
  };

  const packageLabels = {
    FEDHA: 'FEDHA',
    CHUMA: 'CHUMA',
    DHAHABU: 'DHAHABU',
    ALMASI: 'ALMASI',
    MALKIA: 'MALKIA'
  };

  // Revenue by package data
  const revenueByPackageData = Object.entries(analytics.revenueByPackage).map(([key, value]) => ({
    package: packageLabels[key as keyof typeof packageLabels],
    revenue: value
  }));

  const maxRevenueByPackage = Math.max(...revenueByPackageData.map(d => d.revenue), 1);

  // Subscriptions by package data
  const subscriptionsByPackageData = Object.entries(analytics.subscriptionsByPackage).map(([key, value]) => ({
    package: packageLabels[key as keyof typeof packageLabels],
    count: value
  }));

  const maxSubscriptionsByPackage = Math.max(...subscriptionsByPackageData.map(d => d.count), 1);

  // Live TV subscriptions by package data
  const liveTvByPackageData = Object.entries(analytics.liveTvSubscriptionsByPackage || {}).map(([key, value]) => ({
    package: packageLabels[key as keyof typeof packageLabels],
    count: value as number
  }));
  const maxLiveTvByPackage = Math.max(...liveTvByPackageData.map(d => d.count), 1);

  return (
    <div className="container-mobile space-y-6 pb-6">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-4">
            <div>
              <h1 className="text-responsive-2xl font-bold text-gradient flex items-center space-x-2">
                <BarChart3 size={28} className="text-primary-400" />
                <span>Analytics & Reports</span>
              </h1>
              <p className="text-dark-400 mt-1">
                Real-time insights and statistics
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="flex items-center space-x-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-60"
              >
                <DownloadCloud size={18} className={downloading ? 'animate-spin' : ''} />
                <span>{downloading ? 'Preparing...' : 'Download Full Report'}</span>
              </button>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="touch-button p-3 bg-dark-800 hover:bg-dark-700 rounded-lg transition-colors disabled:opacity-50"
                title="Refresh Analytics"
              >
                <RefreshCw size={20} className={`text-primary-400 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-effect rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <DollarSign size={20} className="text-green-400" />
                </div>
                <Activity size={16} className="text-green-400 animate-pulse" />
              </div>
              <p className="text-2xl font-bold text-dark-100">
                TSH {analytics.totalRevenue.toLocaleString()}
              </p>
              <p className="text-sm text-dark-400">Total Revenue</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-effect rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Users size={20} className="text-blue-400" />
                </div>
                <Activity size={16} className="text-blue-400 animate-pulse" />
              </div>
              <p className="text-2xl font-bold text-dark-100">
                {analytics.totalUsers}
              </p>
              <p className="text-sm text-dark-400">Total Users</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-effect rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
                  <CheckCircle size={20} className="text-primary-400" />
                </div>
                <Activity size={16} className="text-primary-400 animate-pulse" />
              </div>
              <p className="text-2xl font-bold text-dark-100">
                {analytics.activeSubscriptions}
              </p>
              <p className="text-sm text-dark-400">Active Subscriptions</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass-effect rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                  <Target size={20} className="text-yellow-400" />
                </div>
                <Activity size={16} className="text-yellow-400 animate-pulse" />
              </div>
              <p className="text-2xl font-bold text-dark-100">
                {analytics.successRate.toFixed(1)}%
              </p>
              <p className="text-sm text-dark-400">Payment Success Rate</p>
            </motion.div>
          </div>

          {/* Revenue Overview */}
          <div className="glass-effect rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-dark-100 flex items-center space-x-2">
                <TrendingUp size={24} className="text-primary-400" />
                <span>Revenue Overview</span>
              </h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-dark-800/50 rounded-lg">
                <p className="text-sm text-dark-400 mb-1">Daily Revenue</p>
                <p className="text-2xl font-bold text-green-400">
                  TSH {analytics.dailyRevenue.toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-dark-800/50 rounded-lg">
                <p className="text-sm text-dark-400 mb-1">Weekly Revenue</p>
                <p className="text-2xl font-bold text-blue-400">
                  TSH {analytics.weeklyRevenue.toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-dark-800/50 rounded-lg">
                <p className="text-sm text-dark-400 mb-1">Monthly Revenue</p>
                <p className="text-2xl font-bold text-primary-400">
                  TSH {analytics.monthlyRevenue.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Revenue Chart - Last 7 Days */}
            <div>
              <h3 className="text-lg font-semibold text-dark-100 mb-4">Revenue Last 7 Days</h3>
              <div className="bg-dark-800/30 rounded-lg p-4">
                <SimpleBarChart
                  data={analytics.dailyRevenueLast7Days}
                  maxValue={maxRevenue}
                  labelKey="date"
                  valueKey="revenue"
                  color="bg-gradient-to-t from-green-500 to-green-400"
                  height={150}
                />
              </div>
            </div>
          </div>

          {/* User Growth */}
          <div className="glass-effect rounded-lg p-6">
            <h2 className="text-xl font-bold text-dark-100 mb-6 flex items-center space-x-2">
              <Users size={24} className="text-primary-400" />
              <span>User Growth</span>
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-dark-800/50 rounded-lg">
                <p className="text-sm text-dark-400 mb-1">New Users Today</p>
                <p className="text-2xl font-bold text-green-400">
                  {analytics.newUsersToday}
                </p>
              </div>
              <div className="p-4 bg-dark-800/50 rounded-lg">
                <p className="text-sm text-dark-400 mb-1">New Users This Week</p>
                <p className="text-2xl font-bold text-blue-400">
                  {analytics.newUsersThisWeek}
                </p>
              </div>
              <div className="p-4 bg-dark-800/50 rounded-lg">
                <p className="text-sm text-dark-400 mb-1">New Users This Month</p>
                <p className="text-2xl font-bold text-primary-400">
                  {analytics.newUsersThisMonth}
                </p>
              </div>
            </div>

            {/* User Growth Chart */}
            <div>
              <h3 className="text-lg font-semibold text-dark-100 mb-4">User Growth Last 7 Days</h3>
              <div className="bg-dark-800/30 rounded-lg p-4">
                <SimpleBarChart
                  data={analytics.dailyUsersLast7Days}
                  maxValue={maxUsers}
                  labelKey="date"
                  valueKey="users"
                  color="bg-gradient-to-t from-blue-500 to-blue-400"
                  height={150}
                />
              </div>
            </div>

            {/* User Subscription Status */}
            <div className="mt-6 space-y-3">
              <h3 className="text-lg font-semibold text-dark-100">User Subscription Status</h3>
              <ProgressBar
                label={`Users with Subscription (${analytics.usersWithSubscription})`}
                value={analytics.usersWithSubscription}
                max={analytics.totalUsers}
                color="bg-green-500"
              />
              <ProgressBar
                label={`Users without Subscription (${analytics.usersWithoutSubscription})`}
                value={analytics.usersWithoutSubscription}
                max={analytics.totalUsers}
                color="bg-gray-500"
              />
            </div>
          </div>

          {/* Payment Statistics */}
          <div className="glass-effect rounded-lg p-6">
            <h2 className="text-xl font-bold text-dark-100 mb-6 flex items-center space-x-2">
              <CreditCard size={24} className="text-primary-400" />
              <span>Payment Statistics</span>
            </h2>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-dark-800/50 rounded-lg text-center">
                <p className="text-sm text-dark-400 mb-1">Total</p>
                <p className="text-xl font-bold text-dark-100">{analytics.totalPayments}</p>
              </div>
              <div className="p-4 bg-green-500/20 rounded-lg text-center">
                <p className="text-sm text-dark-400 mb-1">Completed</p>
                <p className="text-xl font-bold text-green-400">{analytics.completedPayments}</p>
              </div>
              <div className="p-4 bg-red-500/20 rounded-lg text-center">
                <p className="text-sm text-dark-400 mb-1">Failed</p>
                <p className="text-xl font-bold text-red-400">{analytics.failedPayments}</p>
              </div>
              <div className="p-4 bg-gray-500/20 rounded-lg text-center">
                <p className="text-sm text-dark-400 mb-1">Cancelled</p>
                <p className="text-xl font-bold text-gray-400">{analytics.cancelledPayments}</p>
              </div>
            </div>

            {/* Payment Trends Chart */}
            <div>
              <h3 className="text-lg font-semibold text-dark-100 mb-4">Payment Trends Last 7 Days</h3>
              <div className="bg-dark-800/30 rounded-lg p-4">
                <div className="space-y-2">
                  {analytics.dailyPaymentsLast7Days.map((day, index) => {
                    const maxDayPayments = Math.max(day.completed, day.failed, 1);
                    return (
                      <div key={index} className="space-y-1">
                        <div className="flex justify-between text-xs text-dark-400 mb-1">
                          <span>{day.date}</span>
                          <span>{day.completed} completed, {day.failed} failed</span>
                        </div>
                        <div className="flex space-x-1 h-4">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(day.completed / maxDayPayments) * 100}%` }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            className="bg-green-500 rounded"
                          />
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(day.failed / maxDayPayments) * 100}%` }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            className="bg-red-500 rounded"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Revenue by Package */}
          <div className="glass-effect rounded-lg p-6">
            <h2 className="text-xl font-bold text-dark-100 mb-6 flex items-center space-x-2">
              <Package size={24} className="text-primary-400" />
              <span>Revenue by Package</span>
            </h2>
            
            <div className="space-y-4 mb-6">
              {revenueByPackageData.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-dark-300 font-medium">{item.package}</span>
                    <span className="text-dark-100 font-semibold">
                      TSH {item.revenue.toLocaleString()}
                    </span>
                  </div>
                  <ProgressBar
                    label=""
                    value={item.revenue}
                    max={maxRevenueByPackage}
                    color={packageColors[item.package as keyof typeof packageColors] || 'bg-primary-500'}
                    showValue={false}
                  />
                </div>
              ))}
            </div>

            {/* Revenue by Package Chart */}
            <div>
              <h3 className="text-lg font-semibold text-dark-100 mb-4">Revenue Distribution</h3>
              <div className="bg-dark-800/30 rounded-lg p-4">
                <SimpleBarChart
                  data={revenueByPackageData}
                  maxValue={maxRevenueByPackage}
                  labelKey="package"
                  valueKey="revenue"
                  color="bg-gradient-to-t from-yellow-500 to-yellow-400"
                  height={150}
                />
              </div>
            </div>
          </div>

          {/* Subscriptions by Package */}
          <div className="glass-effect rounded-lg p-6">
            <h2 className="text-xl font-bold text-dark-100 mb-6 flex items-center space-x-2">
              <Package size={24} className="text-primary-400" />
              <span>Active Subscriptions by Package</span>
            </h2>
            
            <div className="space-y-4 mb-6">
              {subscriptionsByPackageData.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-dark-300 font-medium">{item.package}</span>
                    <span className="text-dark-100 font-semibold">{item.count} users</span>
                  </div>
                  <ProgressBar
                    label=""
                    value={item.count}
                    max={maxSubscriptionsByPackage}
                    color={packageColors[item.package as keyof typeof packageColors] || 'bg-primary-500'}
                    showValue={false}
                  />
                </div>
              ))}
            </div>

            {/* Subscriptions Chart */}
            <div>
              <h3 className="text-lg font-semibold text-dark-100 mb-4">Subscription Distribution</h3>
              <div className="bg-dark-800/30 rounded-lg p-4">
                <SimpleBarChart
                  data={subscriptionsByPackageData}
                  maxValue={maxSubscriptionsByPackage}
                  labelKey="package"
                  valueKey="count"
                  color="bg-gradient-to-t from-primary-500 to-primary-400"
                  height={150}
                />
              </div>
            </div>
          </div>

          {/* Live TV Subscriptions by Package */}
          <div className="glass-effect rounded-lg p-6">
            <h2 className="text-xl font-bold text-dark-100 mb-2 flex items-center space-x-2">
              <Tv size={24} className="text-emerald-400" />
              <span>Active Live TV Subscriptions by Package</span>
            </h2>
            <p className="text-sm text-dark-400 mb-6">
              {analytics.liveTvSubscriptions} users have an active Live TV subscription
            </p>

            <div className="space-y-4 mb-6">
              {liveTvByPackageData.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-dark-300 font-medium">{item.package}</span>
                    <span className="text-dark-100 font-semibold">{item.count} users</span>
                  </div>
                  <ProgressBar
                    label=""
                    value={item.count}
                    max={maxLiveTvByPackage}
                    color="bg-emerald-500"
                    showValue={false}
                  />
                </div>
              ))}
            </div>

            <div>
              <h3 className="text-lg font-semibold text-dark-100 mb-4">Live TV Distribution</h3>
              <div className="bg-dark-800/30 rounded-lg p-4">
                <SimpleBarChart
                  data={liveTvByPackageData}
                  maxValue={maxLiveTvByPackage}
                  labelKey="package"
                  valueKey="count"
                  color="bg-gradient-to-t from-emerald-500 to-emerald-400"
                  height={150}
                />
              </div>
            </div>
          </div>

          {/* Who pays for what — revenue & paying users by type */}
          <div className="glass-effect rounded-lg p-6">
            <h2 className="text-xl font-bold text-dark-100 mb-6 flex items-center space-x-2">
              <DollarSign size={24} className="text-primary-400" />
              <span>Revenue &amp; Paying Users by Type</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Normal subscriptions */}
              <div className="p-4 bg-blue-500/15 border border-blue-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Package size={18} className="text-blue-400" />
                  <span className="text-sm font-semibold text-blue-300">Normal / Movies</span>
                </div>
                <p className="text-xl font-black text-blue-300">
                  TSH {analytics.revenueByType?.normalSub.revenue.toLocaleString() ?? 0}
                </p>
                <p className="text-xs text-dark-400 mt-1">
                  {analytics.revenueByType?.normalSub.count ?? 0} payments
                </p>
              </div>

              {/* Live TV */}
              <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Tv size={18} className="text-emerald-400" />
                  <span className="text-sm font-semibold text-emerald-300">Live TV</span>
                </div>
                <p className="text-xl font-black text-emerald-300">
                  TSH {analytics.revenueByType?.liveTvSub.revenue.toLocaleString() ?? 0}
                </p>
                <p className="text-xs text-dark-400 mt-1">
                  {analytics.revenueByType?.liveTvSub.count ?? 0} payments
                </p>
              </div>

              {/* Content (pay-per-view) */}
              <div className="p-4 bg-amber-500/15 border border-amber-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Film size={18} className="text-amber-400" />
                  <span className="text-sm font-semibold text-amber-300">Content (PPV)</span>
                </div>
                <p className="text-xl font-black text-amber-300">
                  TSH {analytics.revenueByType?.content.revenue.toLocaleString() ?? 0}
                </p>
                <p className="text-xs text-dark-400 mt-1">
                  {analytics.revenueByType?.content.count ?? 0} payments
                </p>
              </div>

              {/* Games */}
              <div className="p-4 bg-purple-500/15 border border-purple-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Target size={18} className="text-purple-400" />
                  <span className="text-sm font-semibold text-purple-300">Games</span>
                </div>
                <p className="text-xl font-black text-purple-300">
                  TSH {analytics.revenueByType?.game.revenue.toLocaleString() ?? 0}
                </p>
                <p className="text-xs text-dark-400 mt-1">
                  {analytics.revenueByType?.game.count ?? 0} payments
                </p>
              </div>
            </div>
          </div>

          {/* Content Statistics */}
          <div className="glass-effect rounded-lg p-6">
            <h2 className="text-xl font-bold text-dark-100 mb-6 flex items-center space-x-2">
              <Film size={24} className="text-primary-400" />
              <span>Content Statistics</span>
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-red-500/20 rounded-lg text-center">
                <Film size={32} className="text-red-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-red-400">{analytics.totalMovies}</p>
                <p className="text-sm text-dark-400">Movies</p>
              </div>
              <div className="p-4 bg-blue-500/20 rounded-lg text-center">
                <Tv size={32} className="text-blue-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-400">{analytics.totalSeries}</p>
                <p className="text-sm text-dark-400">TV Series</p>
              </div>
            </div>
          </div>

          {/* System Status */}
          <div className="glass-effect rounded-lg p-6">
            <h2 className="text-xl font-bold text-dark-100 mb-6 flex items-center space-x-2">
              <Activity size={24} className="text-primary-400" />
              <span>System Status</span>
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-dark-800/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-dark-300">Pending Payments</span>
                  <Clock size={16} className="text-primary-400" />
                </div>
                <p className="text-2xl font-bold text-primary-400">{analytics.pendingPayments}</p>
              </div>
              <div className="p-4 bg-dark-800/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-dark-300">Blocked Users</span>
                  <XCircle size={16} className="text-red-400" />
                </div>
                <p className="text-2xl font-bold text-red-400">{analytics.blockedUsers}</p>
              </div>
            </div>
          </div>
        </div>
  );
}


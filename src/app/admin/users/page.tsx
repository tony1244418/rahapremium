'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  Users, 
  Search, 
  Filter, 
  MoreVertical,
  Ban,
  CheckCircle,
  Trash2,
  Plus,
  Eye,
  Calendar,
  Phone,
  Crown,
  X
} from 'lucide-react';
import { 
  getAllUsers,
  subscribeToUsers,
  blockUser,
  unblockUser,
  deleteUser,
  addDirectSubscription,
  removeUserSubscription
} from '@/lib/admin';
import { User, SubscriptionPackage } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import LiveTimer from '@/components/ui/LiveTimer';
import { getUserSubscriptionStatus, SUBSCRIPTION_PACKAGES, getPackagesConfig, PackagesConfigMap } from '@/lib/subscriptions';
import { Loading } from '@/components/ui/Loading';

export default function AdminUsersPage() {
  const { adminUser } = useAuth();
  const { t } = useLanguage();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked' | 'expired'>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<SubscriptionPackage>('FEDHA');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [packagesConfig, setPackagesConfig] = useState<PackagesConfigMap | null>(null);

  useEffect(() => {
    getPackagesConfig().then(config => setPackagesConfig(config)).catch(() => setPackagesConfig(SUBSCRIPTION_PACKAGES));
  }, []);

  useEffect(() => {
    if (!adminUser) return;

    // Load initial users
    getAllUsers().then(data => {
      setUsers(data);
      setLoading(false);
    });

    // Subscribe to real-time updates
    const unsubscribe = subscribeToUsers(setUsers);
    
    return () => unsubscribe();
  }, [adminUser]);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, statusFilter]);

  const filterUsers = () => {
    let filtered = [...users];

    // Search filter
    if (searchQuery.trim()) {
      const searchTerm = searchQuery.toLowerCase();
      filtered = filtered.filter(user =>
        user.displayName.toLowerCase().includes(searchTerm) ||
        user.username.toLowerCase().includes(searchTerm) ||
        user.phoneNumber.includes(searchTerm)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(user => {
        switch (statusFilter) {
          case 'active':
            return !user.isBlocked && user.subscription && 
                   user.subscription.isActive && 
                   new Date(user.subscription.endDate) > now;
          case 'blocked':
            return user.isBlocked;
          case 'expired':
            return !user.subscription || 
                   !user.subscription.isActive || 
                   new Date(user.subscription.endDate) <= now;
          default:
            return true;
        }
      });
    }

    setFilteredUsers(filtered);
  };

  const handleBlockUser = async (userId: string) => {
    setActionLoading(userId);
    try {
      await blockUser(userId);
    } catch (error) {
      console.error('Error blocking user:', error);
      alert('Failed to block user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnblockUser = async (userId: string) => {
    setActionLoading(userId);
    try {
      await unblockUser(userId);
    } catch (error) {
      console.error('Error unblocking user:', error);
      alert('Failed to unblock user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to permanently delete this user? This action cannot be undone.')) {
      return;
    }

    setActionLoading(userId);
    try {
      await deleteUser(userId);
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddSubscription = async () => {
    if (!selectedUser || !adminUser) return;

    console.log('🎯 ADMIN PANEL: Adding subscription via + button for user:', selectedUser.uid, 'package:', selectedPackage);
    setActionLoading('subscription');
    try {
      await addDirectSubscription(selectedUser.uid, selectedPackage, adminUser.uid);
      setShowSubscriptionModal(false);
      setSelectedUser(null);
      
      // Refresh users list to show updated subscription status
      const updatedUsers = await getAllUsers();
      setUsers(updatedUsers);
      
      alert('✅ Direct subscription added successfully! User should see changes immediately.');
    } catch (error) {
      console.error('Error adding subscription:', error);
      alert('Failed to add subscription');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveSubscription = async (userId: string) => {
    if (!adminUser) return;
    
    if (!confirm('Are you sure you want to remove this user\'s subscription? This action cannot be undone.')) {
      return;
    }
    
    setActionLoading(userId);
    try {
      await removeUserSubscription(userId, adminUser.uid);
      
      // Refresh users list
      const updatedUsers = await getAllUsers();
      setUsers(updatedUsers);
      
      alert('User subscription removed successfully!');
    } catch (error) {
      console.error('Error removing subscription:', error);
      alert('Failed to remove subscription. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const openUserModal = (user: User) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const openSubscriptionModal = (user: User) => {
    setSelectedUser(user);
    setShowSubscriptionModal(true);
  };

  if (loading) {
    return (
      <div className="container-mobile flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="relative">
                <div className="absolute inset-0 water-ripple"></div>
                <Loading size="lg" text="Loading users..." variant="splash" />
              </div>
            </div>
          </div>
    );
  }

  return (
    <>
      <div className="container-mobile space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between py-4">
            <div>
              <h1 className="text-responsive-2xl font-bold text-gradient">
                User Management
              </h1>
              <p className="text-dark-400">
                {filteredUsers.length} of {users.length} users
              </p>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="glass-effect rounded-lg p-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-dark-100 placeholder-dark-400 focus-ring"
                placeholder="Search users by name, username, or phone..."
              />
            </div>

            <div className="flex flex-wrap gap-4">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="bg-dark-800 border border-dark-600 rounded-lg px-4 py-2 text-dark-100"
              >
                <option value="all">All Users</option>
                <option value="active">Active Subscriptions</option>
                <option value="expired">Expired/No Subscription</option>
                <option value="blocked">Blocked Users</option>
              </select>
            </div>
          </div>

          {/* Users List */}
          {filteredUsers.length === 0 ? (
            <div className="glass-effect rounded-lg p-8 text-center">
              <Users size={48} className="mx-auto text-dark-600 mb-4" />
              <h3 className="text-lg font-semibold text-dark-300 mb-2">
                No users found
              </h3>
              <p className="text-dark-400">
                Try adjusting your search criteria
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((user, index) => {
                const subscriptionStatus = getUserSubscriptionStatus(user);
                
                return (
                  <motion.div
                    key={user.uid}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`glass-effect rounded-lg p-6 ${
                      user.isBlocked ? 'border border-red-500/50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        {/* User Avatar */}
                        <div className="w-12 h-12 bg-primary-gradient rounded-full flex items-center justify-center flex-shrink-0">
                          {user.profilePhotoURL ? (
                            <img
                              src={user.profilePhotoURL}
                              alt={user.displayName}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-white font-semibold text-lg">
                              {(user.displayName || user.username || '?').charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>

                        {/* User Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="text-lg font-semibold text-dark-100 truncate">
                              {user.displayName}
                            </h3>
                            {user.isBlocked && (
                              <span className="bg-red-500/20 text-red-400 text-xs px-2 py-1 rounded">
                                Blocked
                              </span>
                            )}
                            {subscriptionStatus.isActive && (
                              <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded">
                                {subscriptionStatus.packageType}
                              </span>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm text-dark-400">
                            <div className="flex items-center space-x-1">
                              <span className="text-dark-500">@</span>
                              <span>{user.username}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Phone size={14} />
                              <span>{user.phoneNumber}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Calendar size={14} />
                              <span>{new Date(user.createdAt).toLocaleDateString()}</span>
                            </div>
                            {subscriptionStatus.isActive && (
                              <div className="space-y-2">
                                <div className="flex items-center space-x-1">
                                  <Crown size={14} />
                                  <span>{subscriptionStatus.daysRemaining} days left</span>
                                </div>
                                {/* Live Timer for Admin */}
                                <LiveTimer 
                                  endDate={subscriptionStatus.endDate!} 
                                  variant="compact"
                                  className="text-xs"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <button
                          onClick={() => openUserModal(user)}
                          className="touch-button text-dark-400 hover:text-primary-400 transition-colors duration-200"
                        >
                          <Eye size={20} />
                        </button>
                        
                        <button
                          onClick={() => openSubscriptionModal(user)}
                          className="touch-button text-dark-400 hover:text-green-400 transition-colors duration-200"
                          title="Add Subscription"
                        >
                          <Plus size={20} />
                        </button>
                        
                        {subscriptionStatus.isActive && (
                          <button
                            onClick={() => handleRemoveSubscription(user.uid)}
                            disabled={actionLoading === user.uid}
                            className="touch-button text-dark-400 hover:text-red-400 transition-colors duration-200 disabled:opacity-50"
                            title="Remove Subscription"
                          >
                            {actionLoading === user.uid ? (
                              <div className="w-5 h-5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <X size={20} />
                            )}
                          </button>
                        )}

                        {user.isBlocked ? (
                          <button
                            onClick={() => handleUnblockUser(user.uid)}
                            disabled={actionLoading === user.uid}
                            className="touch-button text-green-400 hover:text-green-300 transition-colors duration-200 disabled:opacity-50"
                            title="Unblock User"
                          >
                            <CheckCircle size={20} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBlockUser(user.uid)}
                            disabled={actionLoading === user.uid}
                            className="touch-button text-yellow-400 hover:text-yellow-300 transition-colors duration-200 disabled:opacity-50"
                            title="Block User"
                          >
                            <Ban size={20} />
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteUser(user.uid)}
                          disabled={actionLoading === user.uid}
                          className="touch-button text-red-400 hover:text-red-300 transition-colors duration-200 disabled:opacity-50"
                          title="Delete User"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* User Details Modal */}
        {showUserModal && selectedUser && (
          <div className="modal-overlay">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="modal-content max-w-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-dark-100">
                  User Details
                </h3>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="text-dark-400 hover:text-dark-100"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                {/* User Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Display Name</label>
                    <div className="form-input bg-dark-900">{selectedUser.displayName}</div>
                  </div>
                  <div>
                    <label className="form-label">Username</label>
                    <div className="form-input bg-dark-900">@{selectedUser.username}</div>
                  </div>
                  <div>
                    <label className="form-label">Phone Number</label>
                    <div className="form-input bg-dark-900">{selectedUser.phoneNumber}</div>
                  </div>
                  <div>
                    <label className="form-label">Status</label>
                    <div className={`form-input ${selectedUser.isBlocked ? 'text-red-400' : 'text-green-400'}`}>
                      {selectedUser.isBlocked ? 'Blocked' : 'Active'}
                    </div>
                  </div>
                </div>

                {/* Subscription Info */}
                {selectedUser.subscription && (
                  <div>
                    <h4 className="font-semibold text-dark-100 mb-4">Current Subscription</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="form-label">Package</label>
                        <div className="form-input bg-dark-900">{selectedUser.subscription.packageType}</div>
                      </div>
                      <div>
                        <label className="form-label">Status</label>
                        <div className={`form-input ${selectedUser.subscription.isActive ? 'text-green-400' : 'text-red-400'}`}>
                          {selectedUser.subscription.isActive ? 'Active' : 'Expired'}
                        </div>
                      </div>
                      <div>
                        <label className="form-label">Start Date</label>
                        <div className="form-input bg-dark-900">
                          {new Date(selectedUser.subscription.startDate).toLocaleDateString()}
                        </div>
                      </div>
                      <div>
                        <label className="form-label">End Date</label>
                        <div className="form-input bg-dark-900">
                          {new Date(selectedUser.subscription.endDate).toLocaleDateString()}
                        </div>
                      </div>
                      
                      {/* Live Timer in User Details Modal */}
                      {selectedUser.subscription.isActive && (
                        <div className="col-span-2 p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg">
                          <div className="text-center mb-3">
                            <h4 className="text-sm font-semibold text-blue-400 mb-2">
                              ⏰ {t('liveCountdown')}
                            </h4>
                          </div>
                          <LiveTimer 
                            endDate={selectedUser.subscription.endDate} 
                            variant="detailed"
                            className="text-center"
                            showFullTimestamp={true}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Account Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Created At</label>
                    <div className="form-input bg-dark-900">
                      {new Date(selectedUser.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Last Login</label>
                    <div className="form-input bg-dark-900">
                      {new Date(selectedUser.lastLoginAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Add Subscription Modal */}
        {showSubscriptionModal && selectedUser && (
          <div className="modal-overlay">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="modal-content"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-dark-100">
                  Add Manual Subscription
                </h3>
                <button
                  onClick={() => setShowSubscriptionModal(false)}
                  className="text-dark-400 hover:text-dark-100"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="form-label">User</label>
                  <div className="form-input bg-dark-900">
                    {selectedUser.displayName} (@{selectedUser.username})
                  </div>
                </div>

                <div>
                  <label className="form-label">Subscription Package</label>
                  <select
                    value={selectedPackage}
                    onChange={(e) => setSelectedPackage(e.target.value as SubscriptionPackage)}
                    className="form-input"
                  >
                    {Object.entries(packagesConfig || SUBSCRIPTION_PACKAGES).map(([key, pkg]) => (
                      <option key={key} value={key}>
                        {pkg.name} - {pkg.days} days - TSH {pkg.price.toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-4 bg-blue-500/20 border border-blue-500/50 rounded-lg">
                  <p className="text-blue-400 text-sm">
                    This will add a manual subscription for the selected package. 
                    The subscription will be activated immediately and will be marked as admin-added.
                  </p>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowSubscriptionModal(false)}
                  className="button-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSubscription}
                  disabled={actionLoading === 'subscription'}
                  className="button-primary flex-1"
                >
                  {actionLoading === 'subscription' ? 'Adding...' : 'Add Subscription'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
    </>
  );
}

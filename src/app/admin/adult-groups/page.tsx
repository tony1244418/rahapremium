'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Plus,
  Search,
  Edit,
  Trash2,
  ExternalLink,
  Users,
  Eye,
  Lock,
  Save,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  subscribeToAdultGroups,
  addAdultGroup,
  updateAdultGroup,
  deleteAdultGroup
} from '@/lib/adult-groups';
import { AdultGroup, SubscriptionPackage } from '@/types';
import { Loading } from '@/components/ui/Loading';

const SUBSCRIPTION_PACKAGES: SubscriptionPackage[] = ['FEDHA', 'CHUMA', 'DHAHABU', 'ALMASI', 'MALKIA'];

export default function AdminAdultGroupsPage() {
  const { t } = useLanguage();
  const { adminUser } = useAuth();
  const [adultGroups, setAdultGroups] = useState<AdultGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<AdultGroup | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<{
    label: string;
    url: string;
    description: string;
    icon: string;
    order: number;
    isActive: boolean;
    requiredPackages: SubscriptionPackage[];
  }>({
    label: '',
    url: '',
    description: '',
    icon: '',
    order: 0,
    isActive: true,
    requiredPackages: []
  });

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let isMounted = true;
    
    const unsubscribe = subscribeToAdultGroups((groups) => {
      if (isMounted) {
        setAdultGroups(groups);
        setLoading(false);
        if (timeoutId) clearTimeout(timeoutId);
      }
    });

    // Fallback timeout to prevent infinite loading
    timeoutId = setTimeout(() => {
      if (isMounted) {
        console.warn('Adult groups subscription timeout, setting loading to false');
        setLoading(false);
      }
    }, 10000); // 10 second timeout

    return () => {
      isMounted = false;
      unsubscribe();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePackageToggle = (pkg: SubscriptionPackage) => {
    setFormData(prev => ({
      ...prev,
      requiredPackages: prev.requiredPackages.includes(pkg)
        ? prev.requiredPackages.filter(p => p !== pkg)
        : [...prev.requiredPackages, pkg]
    }));
  };

  const handleOpenForm = (group?: AdultGroup) => {
    if (group) {
      setEditingGroup(group);
      setFormData({
        label: group.label,
        url: group.url,
        description: group.description || '',
        icon: group.icon || '',
        order: group.order,
        isActive: group.isActive,
        requiredPackages: group.requiredPackages || []
      });
    } else {
      setEditingGroup(null);
      setFormData({
        label: '',
        url: '',
        description: '',
        icon: '',
        order: adultGroups.length,
        isActive: true,
        requiredPackages: []
      });
    }
    setShowForm(true);
    setError(null);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingGroup(null);
    setFormData({
      label: '',
      url: '',
      description: '',
      icon: '',
      order: 0,
      isActive: true,
      requiredPackages: []
    });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError(null);

    try {
      // Validation
      if (!formData.label.trim()) {
        throw new Error('Label is required');
      }
      if (!formData.url.trim()) {
        throw new Error('URL is required');
      }
      if (!formData.url.startsWith('http://') && !formData.url.startsWith('https://')) {
        throw new Error('URL must start with http:// or https://');
      }
      if (formData.requiredPackages.length === 0) {
        throw new Error('At least one subscription package is required');
      }

      if (editingGroup) {
        const result = await updateAdultGroup(editingGroup.id, formData);
        if (!result.success) {
          throw new Error(result.error || 'Failed to update adult group');
        }
      } else {
        const result = await addAdultGroup(formData);
        if (!result.success) {
          throw new Error(result.error || 'Failed to add adult group');
        }
      }

      handleCloseForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (groupId: string) => {
    if (!confirm('Are you sure you want to delete this adult group?')) {
      return;
    }

    setActionLoading(groupId);
    try {
      const result = await deleteAdultGroup(groupId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete adult group');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete adult group');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredGroups = adultGroups.filter(group =>
    group.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (group.description?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
    group.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
            <Loading size="lg" />
          </div>
    );
  }

  return (
    <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-dark-100 flex items-center space-x-2">
                <Users className="text-red-500" size={32} />
                <span>Adult Groups Management</span>
              </h1>
              <p className="text-dark-400 mt-1">Manage external adult group links (Groups za Malaya)</p>
            </div>
            <button
              onClick={() => handleOpenForm()}
              className="button-primary flex items-center space-x-2"
            >
              <Plus size={20} />
              <span>Add Group</span>
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400" size={20} />
            <input
              type="text"
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-dark-100 placeholder-dark-400 focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          {/* Groups List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGroups.map((group) => (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-dark-800 rounded-lg p-6 border border-dark-700 hover:border-red-500/50 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      {group.icon && <span className="text-2xl">{group.icon}</span>}
                      <h3 className="font-bold text-lg text-dark-100">{group.label}</h3>
                    </div>
                    {group.description && (
                      <p className="text-dark-300 text-sm mb-2">{group.description}</p>
                    )}
                    <a
                      href={group.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-red-400 text-sm hover:text-red-300 flex items-center space-x-1"
                    >
                      <ExternalLink size={14} />
                      <span className="truncate max-w-[200px]">{group.url}</span>
                    </a>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    group.isActive 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {group.isActive ? 'Active' : 'Inactive'}
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center space-x-2 text-xs text-dark-400">
                    <Eye size={14} />
                    <span>{group.views.toLocaleString()} views</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-dark-400">
                    <span>Order: {group.order}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {group.requiredPackages.map((pkg) => (
                      <span key={pkg} className="bg-red-500/20 text-red-400 text-xs px-2 py-1 rounded">
                        {pkg}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => handleOpenForm(group)}
                    className="flex-1 button-secondary flex items-center justify-center space-x-2"
                  >
                    <Edit size={16} />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(group.id)}
                    disabled={actionLoading === group.id}
                    className="flex-1 button-danger flex items-center justify-center space-x-2"
                  >
                    {actionLoading === group.id ? (
                      <Loading size="sm" />
                    ) : (
                      <>
                        <Trash2 size={16} />
                        <span>Delete</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          {/* No Groups */}
          {filteredGroups.length === 0 && (
            <div className="text-center py-12">
              <Users size={48} className="text-dark-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-dark-200 mb-2">
                {searchQuery ? 'No groups found' : 'No adult groups yet'}
              </h3>
              <p className="text-dark-400 mb-4">
                {searchQuery ? 'Try adjusting your search' : 'Get started by adding your first adult group'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => handleOpenForm()}
                  className="button-primary"
                >
                  Add Group
                </button>
              )}
            </div>
          )}

          {/* Form Modal */}
          <AnimatePresence>
            {showForm && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-dark-900 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-dark-100">
                      {editingGroup ? 'Edit Adult Group' : 'Add Adult Group'}
                    </h2>
                    <button
                      onClick={handleCloseForm}
                      className="text-dark-400 hover:text-white"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                      <div className="bg-red-500/20 border border-red-500 text-red-400 p-3 rounded">
                        {error}
                      </div>
                    )}

                    <div>
                      <label className="form-label">Label *</label>
                      <input
                        type="text"
                        value={formData.label}
                        onChange={(e) => handleInputChange('label', e.target.value)}
                        placeholder="e.g., Video za Wasomali Wakitombana"
                        className="form-input"
                        required
                      />
                    </div>

                    <div>
                      <label className="form-label">URL *</label>
                      <input
                        type="url"
                        value={formData.url}
                        onChange={(e) => handleInputChange('url', e.target.value)}
                        placeholder="https://example.com/group"
                        className="form-input"
                        required
                      />
                    </div>

                    <div>
                      <label className="form-label">Description</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        placeholder="Optional description"
                        className="form-input"
                        rows={3}
                      />
                    </div>

                    <div>
                      <label className="form-label">Icon (Emoji or Icon Name)</label>
                      <input
                        type="text"
                        value={formData.icon}
                        onChange={(e) => handleInputChange('icon', e.target.value)}
                        placeholder="e.g., Users"
                        className="form-input"
                      />
                    </div>

                    <div>
                      <label className="form-label">Display Order</label>
                      <input
                        type="number"
                        value={formData.order}
                        onChange={(e) => handleInputChange('order', parseInt(e.target.value) || 0)}
                        className="form-input"
                        min="0"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isActive"
                        checked={formData.isActive}
                        onChange={(e) => handleInputChange('isActive', e.target.checked)}
                        className="w-4 h-4 text-primary-600 bg-dark-700 border-dark-600 rounded"
                      />
                      <label htmlFor="isActive" className="text-dark-300">Active</label>
                    </div>

                    <div>
                      <label className="form-label">Required Subscription Packages *</label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                        {SUBSCRIPTION_PACKAGES.map((pkg) => (
                          <label
                            key={pkg}
                            className="flex items-center space-x-2 p-3 bg-dark-800 rounded-lg cursor-pointer hover:bg-dark-700 transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={formData.requiredPackages.includes(pkg)}
                              onChange={() => handlePackageToggle(pkg)}
                              className="w-4 h-4 text-primary-600 bg-dark-700 border-dark-600 rounded"
                            />
                            <span className="text-dark-300">{pkg}</span>
                          </label>
                        ))}
                      </div>
                      {formData.requiredPackages.length === 0 && (
                        <p className="text-red-400 text-sm mt-1">At least one package is required</p>
                      )}
                    </div>

                    <div className="flex space-x-3 pt-4 border-t border-dark-700">
                      <button
                        type="button"
                        onClick={handleCloseForm}
                        className="button-secondary flex-1"
                        disabled={formLoading}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="button-primary flex-1 flex items-center justify-center space-x-2"
                        disabled={formLoading || formData.requiredPackages.length === 0}
                      >
                        {formLoading ? (
                          <Loading size="sm" />
                        ) : (
                          <>
                            <Save size={16} />
                            <span>{editingGroup ? 'Update' : 'Create'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
  );
}


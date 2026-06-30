'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  Users, 
  Plus, 
  Trash2, 
  Shield, 
  Mail,
  User,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AdminUser } from '@/types';
import { Loading } from '@/components/ui/Loading';

export default function ManageAdminsPage() {
  const { adminUser } = useAuth();
  const { t } = useLanguage();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    email: '',
    displayName: '',
    role: 'admin'
  });

  useEffect(() => {
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const adminsList = (data || []).map(admin => ({
        uid: admin.id,
        email: admin.email,
        displayName: admin.display_name,
        role: admin.role,
        permissions: admin.permissions || [],
        isActive: admin.is_active,
        createdAt: new Date(admin.created_at),
        lastLoginAt: admin.last_login_at ? new Date(admin.last_login_at) : new Date()
      })) as AdminUser[];
      
      setAdmins(adminsList);
    } catch (error) {
      console.error('Error loading admins:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdmin.email || !newAdmin.displayName) return;

    try {
      // Check if admin already exists
      const { data: existingAdmin } = await supabase
        .from('admins')
        .select('id')
        .eq('email', newAdmin.email)
        .limit(1);
      
      if (existingAdmin && existingAdmin.length > 0) {
        alert('Admin with this email already exists!');
        return;
      }

      // Create new admin document
      const { error } = await supabase.from('admins').insert({
        email: newAdmin.email,
        display_name: newAdmin.displayName,
        role: newAdmin.role,
        permissions: ['manage_content', 'manage_users', 'view_analytics', 'manage_subscriptions'],
        is_active: true
      });

      if (error) throw error;
      
      // Reset form and reload
      setNewAdmin({ email: '', displayName: '', role: 'admin' });
      setShowAddForm(false);
      loadAdmins();
      
      alert('Admin added successfully! Ensure they have an account in Supabase Authentication.');
    } catch (error) {
      console.error('Error adding admin:', error);
      alert('Error adding admin. Please try again.');
    }
  };

  const handleDeleteAdmin = async (adminId: string, adminEmail: string) => {
    if (adminId === adminUser?.uid) {
      alert('You cannot delete your own admin account!');
      return;
    }

    if (!confirm(`Are you sure you want to delete admin: ${adminEmail}?`)) {
      return;
    }

    try {
      const { error } = await supabase.from('admins').delete().eq('id', adminId);
      if (error) throw error;
      
      loadAdmins();
      alert('Admin deleted successfully!');
    } catch (error) {
      console.error('Error deleting admin:', error);
      alert('Error deleting admin. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="container-mobile flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="relative">
                <div className="absolute inset-0 water-ripple"></div>
                <Loading size="lg" text="Loading admins..." variant="splash" />
              </div>
            </div>
          </div>
    );
  }

  return (
    <div className="container-mobile space-y-6">
          {/* Header */}
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-primary-gradient rounded-full flex items-center justify-center mx-auto mb-4">
              <Users size={32} className="text-white" />
            </div>
            <h1 className="text-responsive-2xl font-bold text-gradient mb-2">
              Manage Admins
            </h1>
            <p className="text-responsive-base text-dark-300">
              Add and manage administrator accounts
            </p>
          </div>

          {/* Add Admin Button */}
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-dark-100">Admin Users</h2>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="button-primary flex items-center space-x-2"
            >
              <Plus size={20} />
              <span>Add Admin</span>
            </button>
          </div>

          {/* Add Admin Form */}
          {showAddForm && (
            <div className="glass-effect rounded-lg p-6">
              <h3 className="text-lg font-semibold text-dark-100 mb-4">Add New Admin</h3>
              <form onSubmit={handleAddAdmin} className="space-y-4">
                <div>
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    value={newAdmin.email}
                    onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                    className="form-input"
                    placeholder="admin@example.com"
                    required
                  />
                  <p className="text-xs text-dark-400 mt-1">
                    This email must exist in Firebase Authentication
                  </p>
                </div>
                <div>
                  <label className="form-label">Display Name</label>
                  <input
                    type="text"
                    value={newAdmin.displayName}
                    onChange={(e) => setNewAdmin({ ...newAdmin, displayName: e.target.value })}
                    className="form-input"
                    placeholder="Admin Name"
                    required
                  />
                </div>
                <div className="flex space-x-3">
                  <button type="submit" className="button-primary flex-1">
                    Add Admin
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setShowAddForm(false)}
                    className="button-secondary flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Admins List */}
          <div className="space-y-4">
            {admins.length === 0 ? (
              <div className="glass-effect rounded-lg p-8 text-center">
                <Shield size={48} className="mx-auto text-dark-600 mb-4" />
                <h3 className="text-lg font-semibold text-dark-300 mb-2">No Admins Found</h3>
                <p className="text-dark-400">Add your first admin user to get started.</p>
              </div>
            ) : (
              admins.map((admin) => (
                <div key={admin.uid} className="glass-effect rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-primary-gradient rounded-full flex items-center justify-center">
                        <User size={24} className="text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-dark-100">
                          {admin.displayName}
                        </h3>
                        <div className="flex items-center space-x-2 text-sm text-dark-400">
                          <Mail size={16} />
                          <span>{admin.email}</span>
                        </div>
                        <div className="flex items-center space-x-4 mt-2">
                          <span className={`text-xs px-2 py-1 rounded ${
                            admin.isActive 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {admin.isActive ? 'Active' : 'Inactive'}
                          </span>
                          <span className="text-xs text-dark-500">
                            Role: {admin.role}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {admin.uid === adminUser?.uid && (
                        <span className="text-xs text-primary-400 font-medium">
                          (You)
                        </span>
                      )}
                      {admin.uid !== adminUser?.uid && (
                        <button
                          onClick={() => handleDeleteAdmin(admin.uid, admin.email)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors"
                          title="Delete Admin"
                        >
                          <Trash2 size={20} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Instructions */}
          <div className="glass-effect rounded-lg p-6">
            <h3 className="text-lg font-semibold text-dark-100 mb-4">How to Add Admins</h3>
            <div className="space-y-3 text-sm text-dark-300">
              <div className="flex items-start space-x-3">
                <span className="w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                <p>Add the user to Firebase Authentication (Authentication → Users → Add user)</p>
              </div>
              <div className="flex items-start space-x-3">
                <span className="w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                <p>Use the "Add Admin" form above to create the admin record in Firestore</p>
              </div>
              <div className="flex items-start space-x-3">
                <span className="w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                <p>The admin can now login at <code className="bg-dark-800 px-2 py-1 rounded">/admin/login</code></p>
              </div>
            </div>
          </div>
        </div>
  );
}

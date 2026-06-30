'use client';

import React, { useState, useEffect } from 'react';
import LiveChannelForm from '@/components/admin/LiveChannelForm';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  Radio, 
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  AlertCircle,
  X,
  Wrench,
  Users,
  ArrowUpDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  subscribeToLiveChannels,
  addLiveChannel,
  updateLiveChannel,
  deleteLiveChannel,
  toggleMaintenanceMode,
  reorderChannelsAlphabetically,
  updateChannelOrder,
  fixDuplicateChannelOrders
} from '@/lib/live-channels';
import { Loading } from '@/components/ui/Loading';
import { LiveChannel } from '@/types';

export default function AdminLiveChannelsPage() {
  const { t } = useLanguage();
  const [channels, setChannels] = useState<LiveChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'maintenance'>('all');
  
  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingChannel, setEditingChannel] = useState<LiveChannel | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  
  // Action states
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const [fixingOrders, setFixingOrders] = useState(false);

  // Inline order editing: track which channel is being edited and its draft value
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [draftOrder, setDraftOrder] = useState<number>(0);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = subscribeToLiveChannels((data) => {
      setChannels(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter channels
  const filteredChannels = channels.filter(channel => {
    const matchesSearch = !searchQuery || 
      channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      channel.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      channel.category.some(cat => cat.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'active' && channel.isActive && !channel.isMaintenance) ||
      (filterStatus === 'inactive' && !channel.isActive) ||
      (filterStatus === 'maintenance' && channel.isMaintenance);
    
    return matchesSearch && matchesStatus;
  });

  const handleAdd = () => {
    setEditingChannel(null);
    setShowForm(true);
  };

  const handleEdit = (channel: LiveChannel) => {
    setEditingChannel(channel);
    setShowForm(true);
  };

  const handleDelete = async (channelId: string) => {
    if (!confirm('Are you sure you want to delete this channel?')) return;

    setActionLoading(channelId);
    setError(null);

    try {
      const result = await deleteLiveChannel(channelId);
      if (!result.success) {
        setError(result.error || 'Failed to delete channel');
      }
    } catch (err) {
      setError('Failed to delete channel');
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleMaintenance = async (channelId: string, currentStatus: boolean) => {
    setActionLoading(channelId);
    setError(null);

    try {
      const result = await toggleMaintenanceMode(channelId, !currentStatus);
      if (!result.success) {
        setError(result.error || 'Failed to update maintenance status');
      }
    } catch (err) {
      setError('Failed to update maintenance status');
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleFormSubmit = async (data: any) => {
    setFormLoading(true);
    setError(null);

    try {
      let result;
      if (editingChannel) {
        result = await updateLiveChannel(editingChannel.id, data);
      } else {
        result = await addLiveChannel(data);
      }

      if (!result.success) {
        setError(result.error || 'Failed to save channel');
        return;
      }

      setShowForm(false);
      setEditingChannel(null);
    } catch (err) {
      setError('Failed to save channel');
      console.error(err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleReorderAlphabetically = async () => {
    setReordering(true);
    setError(null);

    try {
      const result = await reorderChannelsAlphabetically();
      if (!result.success) {
        setError(result.error || 'Failed to reorder channels');
      }
    } catch (err) {
      setError('Failed to reorder channels');
      console.error(err);
    } finally {
      setReordering(false);
    }
  };

  const handleFixOrders = async () => {
    setFixingOrders(true);
    setError(null);
    try {
      const result = await fixDuplicateChannelOrders();
      if (!result.success) {
        setError(result.error || 'Failed to fix channel orders');
      }
    } catch (err) {
      setError('Failed to fix channel orders');
      console.error(err);
    } finally {
      setFixingOrders(false);
    }
  };

  const handleOrderEdit = (channel: LiveChannel) => {
    setEditingOrderId(channel.id);
    setDraftOrder(channel.order ?? 0);
  };

  const handleOrderSave = async (channelId: string) => {
    setEditingOrderId(null);
    setError(null);
    try {
      const result = await updateChannelOrder(channelId, draftOrder);
      if (!result.success) {
        setError(result.error || 'Failed to update order');
      }
    } catch (err) {
      setError('Failed to update order');
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
            <Loading size="lg" text="Loading channels..." />
          </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                  <Radio className="w-8 h-8 text-red-500" />
                  Live TV Channels
                </h1>
                <p className="text-gray-400 mt-1">Manage live streaming channels</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleFixOrders}
                  disabled={fixingOrders || reordering}
                  className="px-4 py-2 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                  title="Assign sequential order values to all channels that currently share order = 0"
                >
                  <RefreshCw className={`w-4 h-4 ${fixingOrders ? 'animate-spin' : ''}`} />
                  {fixingOrders ? 'Fixing...' : 'Fix Orders'}
                </button>
                <button
                  onClick={handleReorderAlphabetically}
                  disabled={reordering || fixingOrders}
                  className="px-4 py-2 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <ArrowUpDown className="w-4 h-4" />
                  {reordering ? 'Reordering...' : 'Sort Alphabetically'}
                </button>
                <button
                  onClick={handleAdd}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Channel
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-red-400">
                  <AlertCircle className="w-5 h-5" />
                  <span>{error}</span>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search channels..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-dark-800 border border-dark-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-4 py-2 bg-dark-800 border border-dark-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Channels</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive</option>
                <option value="maintenance">Under Maintenance</option>
              </select>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-dark-800 rounded-lg p-4">
                <div className="text-sm text-gray-400">Total Channels</div>
                <div className="text-2xl font-bold text-white mt-1">{channels.length}</div>
              </div>
              <div className="bg-dark-800 rounded-lg p-4">
                <div className="text-sm text-gray-400">Active</div>
                <div className="text-2xl font-bold text-green-400 mt-1">
                  {channels.filter(c => c.isActive && !c.isMaintenance).length}
                </div>
              </div>
              <div className="bg-dark-800 rounded-lg p-4">
                <div className="text-sm text-gray-400">In Maintenance</div>
                <div className="text-2xl font-bold text-yellow-400 mt-1">
                  {channels.filter(c => c.isMaintenance).length}
                </div>
              </div>
              <div className="bg-dark-800 rounded-lg p-4">
                <div className="text-sm text-gray-400">Total Viewers</div>
                <div className="text-2xl font-bold text-red-400 mt-1">
                  {channels.reduce((sum, c) => sum + (c.viewerCount || 0), 0)}
                </div>
              </div>
            </div>

            {/* Channels Grid */}
            {filteredChannels.length === 0 ? (
              <div className="text-center py-12 bg-dark-800 rounded-lg">
                <Radio className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No channels found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredChannels.map((channel) => (
                  <motion.div
                    key={channel.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-dark-800 rounded-lg overflow-hidden border border-dark-700 hover:border-primary-500 transition-colors"
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-video bg-dark-900">
                      <img
                        src={channel.thumbnailUrl || '/logo.png'}
                        alt={channel.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = '/logo.png';
                        }}
                      />
                      <div className="absolute top-2 right-2 flex gap-2">
                        {channel.isMaintenance && (
                          <div className="px-2 py-1 bg-yellow-500/80 rounded text-xs font-bold text-white flex items-center gap-1">
                            <Wrench className="w-3 h-3" />
                            Maintenance
                          </div>
                        )}
                        {channel.isActive && !channel.isMaintenance && (
                          <div className="px-2 py-1 bg-red-500/80 rounded text-xs font-bold text-white flex items-center gap-1 animate-pulse">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                            LIVE
                          </div>
                        )}
                      </div>
                      <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 rounded text-xs text-white flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {channel.viewerCount || 0} viewers
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <h3 className="text-lg font-bold text-white mb-1">{channel.name}</h3>
                      {channel.description && (
                        <p className="text-sm text-gray-400 mb-3 line-clamp-2">{channel.description}</p>
                      )}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {channel.category.slice(0, 3).map((cat) => (
                          <span
                            key={cat}
                            className="px-2 py-1 bg-primary-500/20 text-primary-400 text-xs rounded"
                          >
                            {cat}
                          </span>
                        ))}
                        {channel.category.length > 3 && (
                          <span className="px-2 py-1 bg-dark-700 text-gray-400 text-xs rounded">
                            +{channel.category.length - 3}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mb-4">
                        Packages: {channel.requiredPackages.join(', ')} <br/>
                        <span
                          className="inline-flex items-center gap-1 cursor-pointer"
                          onClick={() => handleOrderEdit(channel)}
                          title="Click to edit sort order"
                        >
                          Sort Order:{' '}
                          {editingOrderId === channel.id ? (
                            <span className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="number"
                                value={draftOrder}
                                autoFocus
                                onChange={(e) => setDraftOrder(parseInt(e.target.value) || 0)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleOrderSave(channel.id);
                                  if (e.key === 'Escape') setEditingOrderId(null);
                                }}
                                onBlur={() => handleOrderSave(channel.id)}
                                className="w-16 px-1 py-0.5 bg-dark-700 border border-primary-500 rounded text-white text-xs"
                              />
                              <span className="text-gray-500 text-xs">(Enter to save)</span>
                            </span>
                          ) : (
                            <span className="text-primary-400 underline decoration-dotted hover:text-primary-300">
                              {channel.order}
                            </span>
                          )}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(channel)}
                          className="flex-1 px-3 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors text-sm flex items-center justify-center gap-1"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleMaintenance(channel.id, channel.isMaintenance)}
                          disabled={actionLoading === channel.id}
                          className="px-3 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors text-sm flex items-center justify-center gap-1 disabled:opacity-50"
                          title={channel.isMaintenance ? 'Remove from maintenance' : 'Put under maintenance'}
                        >
                          <Wrench className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(channel.id)}
                          disabled={actionLoading === channel.id}
                          className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm flex items-center justify-center gap-1 disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Form Modal */}
          <LiveChannelForm
            isOpen={showForm}
            onClose={() => {
              setShowForm(false);
              setEditingChannel(null);
            }}
            onSubmit={handleFormSubmit}
            editData={editingChannel}
            loading={formLoading}
          />
    </>
  );
}


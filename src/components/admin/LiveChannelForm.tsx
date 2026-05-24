'use client';

import React, { useState, useEffect } from 'react';
import { X, Upload, Image as ImageIcon, Radio, DollarSign, ToggleLeft, ToggleRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageUploadInput } from '@/components/ui/ImageUploadInput';
import { LiveChannel, SubscriptionPackage, LiveChannelCategory } from '@/types';

interface LiveChannelFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  editData?: LiveChannel | null;
  loading?: boolean;
}

const SUBSCRIPTION_PACKAGES: SubscriptionPackage[] = ['FEDHA', 'CHUMA', 'DHAHABU', 'ALMASI', 'MALKIA'];

const CATEGORIES: LiveChannelCategory[] = ['sport', 'news', 'africa', 'tanzania', 'entertainment', 'music', 'kids', 'documentary', 'movies', 'series', 'other'];

export default function LiveChannelForm({ isOpen, onClose, onSubmit, editData, loading = false }: LiveChannelFormProps) {
  const [formData, setFormData] = useState<any>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editData) {
      // Compute linkType from saved data
      let linkType = 'auto';
      if (editData.encryptionType === 'clearkey') {
        linkType = 'drm';
      } else if (editData.streamFormat === 'hls') {
        linkType = 'hls';
      } else if (editData.streamFormat === 'mp4') {
        linkType = 'mp4';
      } else if (editData.streamFormat === 'youtube') {
        linkType = 'youtube';
      } else if (editData.videoEmbedCode) {
        linkType = 'embed';
      }
      // Extract first KID/Key from clearKeys
      const clearKeysEntries = Object.entries(editData.clearKeys || {});
      const drmKid = clearKeysEntries[0]?.[0] || '';
      const drmKey = clearKeysEntries[0]?.[1] || '';
      setFormData({ ...editData, linkType, drmKid, drmKey });
    } else {
      setFormData({
        name: '',
        description: '',
        streamUrl: '',
        thumbnailUrl: '',
        category: [],
        language: 'en',
        requiredPackages: [],
        isActive: true,
        isMaintenance: false,
        isAdult: false,
        searchKeywords: [],
        linkType: 'auto',
        drmKid: '',
        drmKey: '',
        encryptionType: 'none',
        clearKeys: {},
        contentPurchaseEnabled: false,
        contentPrice: 0,
        contentPriceDays: 30,
        contentPurchasePackages: [],
        showInSlider: false,
        order: 0
      });
    }
    setErrors({});
  }, [editData, isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Channel name is required';
    }

    if (!formData.streamUrl?.trim()) {
      newErrors.streamUrl = 'Stream URL is required';
    } else {
      // Validate URL format
      try {
        new URL(formData.streamUrl);
      } catch {
        newErrors.streamUrl = 'Invalid URL format';
      }
    }

    if (formData.category.length === 0) {
      newErrors.category = 'At least one category is required';
    }

    // Validate DRM fields when DRM link type selected
    if (formData.linkType === 'drm') {
      if (!formData.drmKid?.trim() || !/^[0-9a-fA-F]{32}$/.test(formData.drmKid)) {
        newErrors.drmKid = 'KID must be exactly 32 hexadecimal characters';
      }
      if (!formData.drmKey?.trim() || !/^[0-9a-fA-F]{32}$/.test(formData.drmKey)) {
        newErrors.drmKey = 'Key must be exactly 32 hexadecimal characters';
      }
    }

    // No package validation needed — leaving packages empty means channel is free for everyone

    if (formData.thumbnailUrl && formData.thumbnailUrl.trim()) {
      try {
        new URL(formData.thumbnailUrl);
      } catch {
        newErrors.thumbnailUrl = 'Invalid thumbnail URL format';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const submitData = { ...formData };
      const linkType = submitData.linkType || 'auto';
      const url = (submitData.streamUrl || '').toLowerCase();

      // Map linkType → streamFormat + encryptionType + clearKeys
      if (linkType === 'drm') {
        submitData.streamFormat = 'dash';
        submitData.encryptionType = 'clearkey';
        submitData.clearKeys = { [submitData.drmKid]: submitData.drmKey };
      } else if (linkType === 'hls') {
        submitData.streamFormat = 'hls';
        submitData.encryptionType = 'none';
        submitData.clearKeys = {};
      } else if (linkType === 'mp4') {
        submitData.streamFormat = 'mp4';
        submitData.encryptionType = 'none';
        submitData.clearKeys = {};
      } else if (linkType === 'youtube') {
        submitData.streamFormat = 'youtube';
        submitData.encryptionType = 'none';
        submitData.clearKeys = {};
      } else if (linkType === 'embed') {
        submitData.streamFormat = 'other';
        submitData.encryptionType = 'none';
        submitData.clearKeys = {};
      } else {
        // Auto-detect from URL
        submitData.encryptionType = 'none';
        submitData.clearKeys = {};
        if (url.includes('.m3u8') || url.includes('extension=ts')) {
          submitData.streamFormat = 'hls';
        } else if (url.includes('.mpd')) {
          submitData.streamFormat = 'dash';
        } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
          submitData.streamFormat = 'youtube';
        } else if (url.includes('.mp4')) {
          submitData.streamFormat = 'mp4';
        } else {
          submitData.streamFormat = 'other';
        }
      }

      // Remove UI-only fields before saving
      delete submitData.linkType;
      delete submitData.drmKid;
      delete submitData.drmKey;



      await onSubmit(submitData);
      onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCategoryToggle = (category: LiveChannelCategory) => {
    setFormData((prev: any) => ({
      ...prev,
      category: prev.category.includes(category)
        ? prev.category.filter((c: LiveChannelCategory) => c !== category)
        : [...prev.category, category]
    }));
  };

  const handlePackageToggle = (pkg: SubscriptionPackage) => {
    setFormData((prev: any) => ({
      ...prev,
      requiredPackages: prev.requiredPackages.includes(pkg)
        ? prev.requiredPackages.filter((p: SubscriptionPackage) => p !== pkg)
        : [...prev.requiredPackages, pkg]
    }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-dark-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-dark-700">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Radio className="w-6 h-6 text-red-500" />
              {editData ? 'Edit Live Channel' : 'Add Live Channel'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Channel Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Channel Name *
              </label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 bg-dark-900 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., BBC News, ESPN Sports"
              />
              {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name}</p>}
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Sort Order (Number)
              </label>
              <input
                type="number"
                value={formData.order === undefined ? '' : formData.order}
                onChange={(e) => setFormData({ ...formData, order: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 bg-dark-900 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., 1, 2, 3..."
              />
              <p className="mt-1 text-xs text-gray-500">Lower numbers appear first (e.g. 1 comes before 10).</p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 bg-dark-900 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Channel description..."
                rows={3}
              />
            </div>

            {/* Stream URL */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Stream URL *
              </label>
              <input
                type="url"
                value={formData.streamUrl || ''}
                onChange={(e) => setFormData({ ...formData, streamUrl: e.target.value })}
                className="w-full px-4 py-2 bg-dark-900 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
                placeholder="https://example.com/stream.mpd"
              />
              {errors.streamUrl && <p className="mt-1 text-sm text-red-400">{errors.streamUrl}</p>}
            </div>

            {/* Link Type & Player */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Link Type &amp; Player *
              </label>
              <select
                value={formData.linkType || 'auto'}
                onChange={(e) => setFormData({ ...formData, linkType: e.target.value, drmKid: '', drmKey: '' })}
                className="w-full px-4 py-2 bg-dark-900 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="auto">Auto Detect (from URL)</option>
                <option value="hls">HLS — for .m3u8, .ts streams (uses HLS.js)</option>
                <option value="drm">DRM — Shaka Player for MPD + ClearKey</option>
                <option value="mp4">Direct MP4 / Video URL</option>
                <option value="youtube">YouTube / Google CDN</option>
                <option value="embed">Custom HTML Embed (iframe code)</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                HLS: For .m3u8, .ts, and other HLS streams (uses HLS.js) &nbsp;|&nbsp;
                DRM: For MPD (.mpd) streams with ClearKey DRM (uses Shaka Player)
              </p>
            </div>

            {/* DRM Fields — shown only when DRM is selected */}
            {formData.linkType === 'drm' && (
              <div className="bg-dark-900 border border-primary-500/30 rounded-xl p-4 space-y-4">
                <p className="text-sm font-semibold text-primary-400 flex items-center gap-2">🔐 ClearKey DRM Settings</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">DRM Key ID (KID)</label>
                    <input
                      type="text"
                      value={formData.drmKid || ''}
                      onChange={(e) => setFormData({ ...formData, drmKid: e.target.value.trim() })}
                      className="w-full px-3 py-2.5 bg-dark-800 border border-dark-600 rounded-lg text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="c31df1600afc33799ecac543331803f2"
                      maxLength={32}
                    />
                    {errors.drmKid && <p className="mt-1 text-xs text-red-400">{errors.drmKid}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">DRM Key</label>
                    <input
                      type="text"
                      value={formData.drmKey || ''}
                      onChange={(e) => setFormData({ ...formData, drmKey: e.target.value.trim() })}
                      className="w-full px-3 py-2.5 bg-dark-800 border border-dark-600 rounded-lg text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="dd2101530e222f545997d4c553787f85"
                      maxLength={32}
                    />
                    {errors.drmKey && <p className="mt-1 text-xs text-red-400">{errors.drmKey}</p>}
                  </div>
                </div>
                <p className="text-xs text-gray-500">Both KID and Key must be exactly 32 hexadecimal characters.</p>
              </div>
            )}

            {/* HTML Embed Code — shown only when Embed is selected */}
            {formData.linkType === 'embed' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">HTML Player Embed Code</label>
                <textarea
                  value={formData.videoEmbedCode || ''}
                  onChange={(e) => setFormData({ ...formData, videoEmbedCode: e.target.value })}
                  className="w-full px-4 py-2 bg-dark-900 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-xs"
                  rows={4}
                  placeholder={`<iframe src="https://..." allowfullscreen></iframe>`}
                />
                <p className="mt-1 text-xs text-amber-400/80">⚠️ This HTML embed code will be used as the player instead of the Stream URL.</p>
              </div>
            )}

            {/* Thumbnail URL */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Thumbnail URL (leave empty to use site logo)
              </label>
              <ImageUploadInput
                value={formData.thumbnailUrl || ''}
                onChange={(url) => setFormData({ ...formData, thumbnailUrl: url })}
                className="w-full px-4 py-2 bg-dark-900 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="https://example.com/thumbnail.jpg"
              />
              {errors.thumbnailUrl && <p className="mt-1 text-sm text-red-400">{errors.thumbnailUrl}</p>}
            </div>

            {/* Categories */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Categories * (Select at least one)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CATEGORIES.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => handleCategoryToggle(category)}
                    className={`px-4 py-2 rounded-lg border transition-colors ${formData.category?.includes(category)
                      ? 'bg-primary-600 border-primary-500 text-white'
                      : 'bg-dark-900 border-dark-600 text-gray-300 hover:border-primary-500'
                      }`}
                  >
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </button>
                ))}
              </div>
              {errors.category && <p className="mt-1 text-sm text-red-400">{errors.category}</p>}
            </div>

            {/* Required Packages */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Required Subscription Packages {formData.contentPurchaseEnabled ? '(Optional when Per-Content Purchase is ON)' : '* (Select at least one)'}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SUBSCRIPTION_PACKAGES.map((pkg) => (
                  <button
                    key={pkg}
                    type="button"
                    onClick={() => handlePackageToggle(pkg)}
                    className={`px-4 py-2 rounded-lg border transition-colors ${formData.requiredPackages?.includes(pkg)
                      ? 'bg-primary-600 border-primary-500 text-white'
                      : 'bg-dark-900 border-dark-600 text-gray-300 hover:border-primary-500'
                      }`}
                  >
                    {pkg}
                  </button>
                ))}
              </div>
              {errors.requiredPackages && <p className="mt-1 text-sm text-red-400">{errors.requiredPackages}</p>}
            </div>

            {/* Language */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Language
              </label>
              <select
                value={formData.language || 'en'}
                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                className="w-full px-4 py-2 bg-dark-900 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="en">English</option>
                <option value="sw">Swahili</option>
              </select>
            </div>

            {/* Per-Content Purchase */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <DollarSign size={16} />
                  Per-Content Purchase
                </span>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, contentPurchaseEnabled: !formData.contentPurchaseEnabled })}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${formData.contentPurchaseEnabled
                      ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                      : 'bg-dark-800 text-gray-400 border border-dark-600'
                    }`}
                >
                  {formData.contentPurchaseEnabled
                    ? <><ToggleRight size={16} /> <span>Enabled</span></>
                    : <><ToggleLeft size={16} /> <span>Disabled</span></>}
                </button>
              </div>

              {formData.contentPurchaseEnabled && (
                <div className="bg-dark-900 border border-dark-600 rounded-xl p-4 space-y-4">
                  <p className="text-xs text-gray-400">
                    Turn ON to control access per content item:<br />
                    • <strong className="text-green-400">Price = 0 + No packages</strong> → <strong>FREE</strong> for everyone<br />
                    • <strong className="text-yellow-400">Price &gt; 0 + No packages</strong> → Anyone can purchase directly<br />
                    • <strong className="text-primary-400">Packages selected</strong> → Only those subscribers can access/purchase
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">Channel Price (TZS)</label>
                      <div className="flex items-center bg-dark-700 border border-dark-600 rounded-lg overflow-hidden focus-within:border-primary-500 transition-colors">
                        <span className="px-3 py-2.5 bg-dark-600 text-yellow-400 text-xs font-bold border-r border-dark-600 whitespace-nowrap">TZS</span>
                        <input
                          type="number"
                          value={formData.contentPrice === 0 ? '' : formData.contentPrice}
                          onChange={(e) => setFormData({ ...formData, contentPrice: parseInt(e.target.value) || 0 })}
                          className="flex-1 px-3 py-2.5 bg-transparent text-white text-sm font-medium placeholder-gray-500 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          placeholder="0"
                          min="0"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">Access Duration</label>
                      <div className="flex items-center bg-dark-700 border border-dark-600 rounded-lg overflow-hidden focus-within:border-primary-500 transition-colors">
                        <input
                          type="number"
                          value={formData.contentPriceDays === 0 ? '' : formData.contentPriceDays}
                          onChange={(e) => setFormData({ ...formData, contentPriceDays: parseInt(e.target.value) || 1 })}
                          className="flex-1 px-3 py-2.5 bg-transparent text-white text-sm font-medium placeholder-gray-500 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          placeholder="30"
                          min="1"
                        />
                        <span className="px-3 py-2.5 bg-dark-600 text-blue-400 text-xs font-bold border-l border-dark-600">days</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-2">Eligible Packages</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {SUBSCRIPTION_PACKAGES.map((pkg) => (
                        <button
                          key={pkg}
                          type="button"
                          onClick={() => {
                            const current = formData.contentPurchasePackages || [];
                            setFormData({
                              ...formData,
                              contentPurchasePackages: current.includes(pkg)
                                ? current.filter((p: string) => p !== pkg)
                                : [...current, pkg]
                            });
                          }}
                          className={`px-4 py-2 rounded-lg border text-xs transition-colors ${formData.contentPurchasePackages?.includes(pkg)
                              ? 'bg-green-600 border-green-500 text-white'
                              : 'bg-dark-900 border-dark-600 text-gray-300 hover:border-primary-500'
                            }`}
                        >
                          {pkg}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1"><strong className="text-green-400">Leave empty</strong> = anyone can purchase without a subscription. Select packages to restrict to subscribers only.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Status Toggles */}
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive ?? true}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-primary-600 bg-dark-900 border-dark-600 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-300">Active</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isAdult || false}
                  onChange={(e) => setFormData({ ...formData, isAdult: e.target.checked })}
                  className="w-4 h-4 text-primary-600 bg-dark-900 border-dark-600 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-300">Adult Content (18+)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isMaintenance ?? false}
                  onChange={(e) => setFormData({ ...formData, isMaintenance: e.target.checked })}
                  className="w-4 h-4 text-primary-600 bg-dark-900 border-dark-600 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-300">Under Maintenance</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.showInSlider ?? false}
                  onChange={(e) => setFormData({ ...formData, showInSlider: e.target.checked })}
                  className="w-4 h-4 text-blue-500 bg-dark-900 border-dark-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-blue-300 font-medium">Show in Slider</span>
              </label>
            </div>
          </form>

          {/* Footer */}
          <div className="flex items-center justify-end gap-4 p-6 border-t border-dark-700">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={isSubmitting || loading}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting || loading ? 'Saving...' : editData ? 'Update Channel' : 'Add Channel'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}


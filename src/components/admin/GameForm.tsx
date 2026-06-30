'use client';

import React, { useState, useEffect } from 'react';
import { X, DollarSign, ToggleLeft, ToggleRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageUploadInput } from '@/components/ui/ImageUploadInput';
import { Game, SubscriptionPackage, GameCategory, GamePlatform, GameMode } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';

interface GameFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  editData?: Game | null;
  loading?: boolean;
}

// Regular subscription packages
const REGULAR_PACKAGES: SubscriptionPackage[] = ['FEDHA', 'CHUMA', 'DHAHABU', 'ALMASI', 'MALKIA'];
// Game-specific packages
const GAME_PACKAGES: SubscriptionPackage[] = ['KITONGA', 'ZEBRA', 'SIMBA', 'SWALA', 'NDOVU', 'FARU', 'TWIGA'];
// All packages available for games
const SUBSCRIPTION_PACKAGES: SubscriptionPackage[] = [...REGULAR_PACKAGES, ...GAME_PACKAGES];

// Game categories
const GAME_CATEGORIES: GameCategory[] = ['Action', 'Adventure', 'Puzzle', 'Racing', 'Sports', 'Strategy', 'Arcade', 'Simulation', 'RPG', 'Other'];

// Game platforms
const GAME_PLATFORMS: GamePlatform[] = ['PC', 'Mobile', 'Windows', 'Android', 'iOS', 'Both'];

// Game modes
const GAME_MODES: GameMode[] = ['Mod', 'Premium', 'Maleo', 'Maleo Bus Mod', 'Maleo Map Mod', 'ETS2 Bus Mod', 'Tanzania Game', 'Original', 'Other'];

export default function GameForm({ isOpen, onClose, onSubmit, editData, loading = false }: GameFormProps) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState<any>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editData) {
      setFormData(editData);
    } else {
      setFormData({
        title: '',
        description: '',
        thumbnailUrl: '',
        howToSetVideoLink: '',
        downloadLink: '',
        category: 'Other' as GameCategory,
        platform: 'Both' as GamePlatform,
        mode: 'Original' as GameMode,
        isFree: false,
        requiredPackages: [],
        language: 'en',
        genre: [],
        isActive: true,
        isAdult: false,
        contentPurchaseEnabled: false,
        contentPrice: 0,
        contentPriceDays: 30,
        contentPurchasePackages: []
      });
    }
    setErrors({});
  }, [editData, isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title?.trim()) {
      newErrors.title = t('gameTitle') + ' is required';
    }

    if (!formData.description?.trim()) {
      newErrors.description = t('gameDescription') + ' is required';
    }

    if (!formData.thumbnailUrl?.trim()) {
      newErrors.thumbnailUrl = t('gameThumbnail') + ' is required';
    }

    if (!formData.howToSetVideoLink?.trim() && !formData.videoEmbedCode?.trim()) {
      newErrors.howToSetVideoLink = t('howToSetVideo') + ' or HTML Player Code is required';
    }

    if (!formData.downloadLink?.trim()) {
      newErrors.downloadLink = t('downloadLink') + ' is required';
    }

    if (!formData.category) {
      newErrors.category = 'Game category is required';
    }

    if (!formData.platform) {
      newErrors.platform = 'Game platform is required';
    }

    if (!formData.isFree && !formData.requiredPackages?.length) {
      newErrors.requiredPackages = 'At least one subscription package is required (unless game is free)';
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
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto glass-effect rounded-xl p-6 z-10"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gradient">
              {editData ? t('editGame') : t('addGame')}
            </h2>
            <button
              onClick={onClose}
              className="touch-button text-dark-400 hover:text-dark-100 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-dark-200 mb-2">
                {t('gameTitle')} *
              </label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-dark-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder={t('gameTitle')}
              />
              {errors.title && <p className="text-red-400 text-sm mt-1">{errors.title}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-dark-200 mb-2">
                {t('gameDescription')} *
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-dark-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder={t('gameDescription')}
              />
              {errors.description && <p className="text-red-400 text-sm mt-1">{errors.description}</p>}
            </div>

            {/* Thumbnail URL */}
            <div>
              <label className="block text-sm font-medium text-dark-200 mb-2">
                {t('gameThumbnail')} *
              </label>
              <ImageUploadInput
                value={formData.thumbnailUrl || ''}
                onChange={(url) => setFormData({ ...formData, thumbnailUrl: url })}
                className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-dark-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="https://example.com/thumbnail.jpg"
              />
              {errors.thumbnailUrl && <p className="text-red-400 text-sm mt-1">{errors.thumbnailUrl}</p>}
            </div>

            {/* How to Set Video Link */}
            <div>
              <label className="block text-sm font-medium text-dark-200 mb-2">
                {t('howToSetVideo')} * (or use HTML Player Code)
              </label>
              <input
                type="url"
                value={formData.howToSetVideoLink || ''}
                onChange={(e) => setFormData({ ...formData, howToSetVideoLink: e.target.value })}
                className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-dark-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="https://example.com/video.mp4 or YouTube link"
              />
              {errors.howToSetVideoLink && <p className="text-red-400 text-sm mt-1">{errors.howToSetVideoLink}</p>}

              {/* HTML Player Code */}
              <div className="mt-3">
                <label className="block text-sm font-medium text-dark-200 mb-2">HTML Player Code (Optional)</label>
                <textarea
                  value={formData.videoEmbedCode || ''}
                  onChange={(e) => setFormData({ ...formData, videoEmbedCode: e.target.value })}
                  className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-dark-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-xs"
                  rows={4}
                  placeholder={`Paste custom HTML player code here, e.g.:\n<iframe src="https://..." allowfullscreen></iframe>`}
                />
                <p className="text-xs text-amber-400/80 mt-1">
                  If filled, this HTML code will be used as the player instead of the Video URL above. Leave empty to use the URL.
                </p>
              </div>
            </div>

            {/* Download Link */}
            <div>
              <label className="block text-sm font-medium text-dark-200 mb-2">
                {t('downloadLink')} *
              </label>
              <input
                type="url"
                value={formData.downloadLink || ''}
                onChange={(e) => setFormData({ ...formData, downloadLink: e.target.value })}
                className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-dark-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="https://example.com/download"
              />
              {errors.downloadLink && <p className="text-red-400 text-sm mt-1">{errors.downloadLink}</p>}
            </div>

            {/* Game Category */}
            <div>
              <label className="block text-sm font-medium text-dark-200 mb-2">
                Game Category *
              </label>
              <select
                value={formData.category || 'Other'}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as GameCategory })}
                className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-dark-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {GAME_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              {errors.category && <p className="text-red-400 text-sm mt-1">{errors.category}</p>}
              <p className="text-xs text-dark-400 mt-1">
                Select the type/genre of the game (e.g., Action, Arcade, Puzzle, etc.)
              </p>
            </div>

            {/* Game Mode */}
            <div>
              <label className="block text-sm font-medium text-dark-200 mb-2">
                {t('gameMode')}
              </label>
              <select
                value={formData.mode || 'Original'}
                onChange={(e) => setFormData({ ...formData, mode: e.target.value as GameMode })}
                className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-dark-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {GAME_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {t(mode.toLowerCase())}
                  </option>
                ))}
              </select>
              <p className="text-xs text-dark-400 mt-1">
                Select the game mode (Mod, Premium, Maleo, Original, etc.)
              </p>
            </div>

            {/* Is Free */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isFree"
                checked={formData.isFree || false}
                onChange={(e) => {
                  const isFree = e.target.checked;
                  setFormData({
                    ...formData,
                    isFree,
                    // If free, clear required packages
                    requiredPackages: isFree ? [] : formData.requiredPackages
                  });
                }}
                className="w-4 h-4 text-primary-500 bg-dark-800 border-dark-600 rounded focus:ring-primary-500"
              />
              <label htmlFor="isFree" className="text-sm font-medium text-dark-200">
                {t('freeGame')}
              </label>
              <p className="text-xs text-dark-400 ml-2">
                ({t('free')} - No subscription required)
              </p>
            </div>

            {/* Game Platform */}
            <div>
              <label className="block text-sm font-medium text-dark-200 mb-2">
                Platform *
              </label>
              <div className="grid grid-cols-3 gap-3">
                {GAME_PLATFORMS.map((platform) => (
                  <label
                    key={platform}
                    className={`flex items-center justify-center p-3 bg-dark-800 border-2 rounded-lg cursor-pointer hover:bg-dark-700 transition-colors ${formData.platform === platform
                        ? 'border-primary-500 bg-primary-500/10'
                        : 'border-dark-600'
                      }`}
                  >
                    <input
                      type="radio"
                      name="platform"
                      value={platform}
                      checked={formData.platform === platform}
                      onChange={(e) => setFormData({ ...formData, platform: e.target.value as GamePlatform })}
                      className="sr-only"
                    />
                    <span className={`text-sm font-medium ${formData.platform === platform
                        ? 'text-primary-400'
                        : 'text-dark-200'
                      }`}>
                      {platform}
                    </span>
                  </label>
                ))}
              </div>
              {errors.platform && <p className="text-red-400 text-sm mt-1">{errors.platform}</p>}
              <p className="text-xs text-dark-400 mt-1">
                Select if this game is for PC, Mobile, or Both platforms
              </p>
            </div>

            {/* Required Packages */}
            <div>
              <label className="block text-sm font-medium text-dark-200 mb-2">
                Required Subscription Packages {!formData.isFree && '*'}
              </label>
              <p className="text-xs text-dark-400 mb-3">
                {formData.isFree
                  ? 'This game is free - no subscription required'
                  : 'Select which subscription packages can access this game'}
              </p>

              {/* Regular Packages */}
              <div className={`mb-4 ${formData.isFree ? 'opacity-50 pointer-events-none' : ''}`}>
                <p className="text-xs font-medium text-dark-300 mb-2">Regular Packages:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {REGULAR_PACKAGES.map((pkg) => (
                    <label
                      key={pkg}
                      className={`flex items-center justify-between p-3 bg-dark-800 border border-dark-600 rounded-lg cursor-pointer hover:bg-dark-700 transition-colors ${formData.isFree ? 'cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={formData.requiredPackages?.includes(pkg) || false}
                          onChange={(e) => {
                            const current = formData.requiredPackages || [];
                            if (e.target.checked) {
                              setFormData({ ...formData, requiredPackages: [...current, pkg] });
                            } else {
                              setFormData({ ...formData, requiredPackages: current.filter((p: SubscriptionPackage) => p !== pkg) });
                            }
                          }}
                          className="w-4 h-4 text-primary-500 bg-dark-800 border-dark-600 rounded focus:ring-primary-500"
                        />
                        <span className="text-sm text-dark-200">{pkg}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Game-Specific Packages */}
              <div className={formData.isFree ? 'opacity-50 pointer-events-none' : ''}>
                <p className="text-xs font-medium text-dark-300 mb-2">Game Packages:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { pkg: 'KITONGA' as SubscriptionPackage, price: 1000 },
                    { pkg: 'SWALA' as SubscriptionPackage, price: 5000 },
                    { pkg: 'ZEBRA' as SubscriptionPackage, price: 8000 },
                    { pkg: 'SIMBA' as SubscriptionPackage, price: 9000 },
                    { pkg: 'NDOVU' as SubscriptionPackage, price: 15000 },
                    { pkg: 'FARU' as SubscriptionPackage, price: 20000 },
                    { pkg: 'TWIGA' as SubscriptionPackage, price: 30000 },
                  ].map(({ pkg, price }) => (
                    <label
                      key={pkg}
                      className={`flex items-center justify-between p-3 bg-dark-800 border border-dark-600 rounded-lg cursor-pointer hover:bg-dark-700 transition-colors ${formData.isFree ? 'cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={formData.requiredPackages?.includes(pkg) || false}
                          onChange={(e) => {
                            const current = formData.requiredPackages || [];
                            if (e.target.checked) {
                              setFormData({ ...formData, requiredPackages: [...current, pkg] });
                            } else {
                              setFormData({ ...formData, requiredPackages: current.filter((p: SubscriptionPackage) => p !== pkg) });
                            }
                          }}
                          className="w-4 h-4 text-primary-500 bg-dark-800 border-dark-600 rounded focus:ring-primary-500"
                        />
                        <span className="text-sm text-dark-200">{pkg}</span>
                      </div>
                      <span className="text-xs text-primary-400 font-medium">TSH {price.toLocaleString()}</span>
                    </label>
                  ))}
                </div>
              </div>
              {errors.requiredPackages && <p className="text-red-400 text-sm mt-1">{errors.requiredPackages}</p>}
            </div>

            {/* Language */}
            <div>
              <label className="block text-sm font-medium text-dark-200 mb-2">
                {t('language')}
              </label>
              <select
                value={formData.language || 'en'}
                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-dark-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="en">English</option>
                <option value="sw">Swahili</option>
              </select>
            </div>

            {/* Active Status */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive !== false}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 text-primary-500 bg-dark-800 border-dark-600 rounded focus:ring-primary-500"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-dark-200">
                {t('active')}
              </label>
            </div>

            {/* Adult Content */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isAdult"
                checked={formData.isAdult || false}
                onChange={(e) => setFormData({ ...formData, isAdult: e.target.checked })}
                className="w-4 h-4 text-primary-500 bg-dark-800 border-dark-600 rounded focus:ring-primary-500"
              />
              <label htmlFor="isAdult" className="text-sm font-medium text-dark-200">
                Adult Content (18+)
              </label>
            </div>

            {/* Per-Content Purchase */}
            <div className="space-y-3 border-t border-dark-700 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-dark-200 flex items-center gap-2">
                  <DollarSign size={16} />
                  Per-Content Purchase
                </span>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, contentPurchaseEnabled: !formData.contentPurchaseEnabled })}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                    formData.contentPurchaseEnabled
                      ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                      : 'bg-dark-700 text-dark-400 border border-dark-600'
                  }`}
                >
                  {formData.contentPurchaseEnabled
                    ? <><ToggleRight size={16} /> <span>Enabled</span></>
                    : <><ToggleLeft size={16} /> <span>Disabled</span></>}
                </button>
              </div>

              {formData.contentPurchaseEnabled && (
                <div className="bg-dark-800/60 border border-dark-600 rounded-xl p-4 space-y-4">
                  <p className="text-xs text-dark-400">
                    Turn ON to control access per content item:<br />
                    • <strong className="text-green-400">Price = 0 + No packages</strong> → <strong>FREE</strong> for everyone<br />
                    • <strong className="text-yellow-400">Price &gt; 0 + No packages</strong> → Anyone can purchase directly<br />
                    • <strong className="text-primary-400">Packages selected</strong> → Only those subscribers can access/purchase
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-dark-200 mb-1">Bei ya Mchezo (TZS)</label>
                      <div className="flex items-center bg-dark-700 border border-dark-500 rounded-lg overflow-hidden focus-within:border-primary-500 transition-colors">
                        <span className="px-3 py-2.5 bg-dark-600 text-yellow-400 text-xs font-bold border-r border-dark-500 whitespace-nowrap">TZS</span>
                        <input
                          type="number"
                          value={formData.contentPrice === 0 ? '' : formData.contentPrice}
                          onChange={(e) => setFormData({ ...formData, contentPrice: parseInt(e.target.value) || 0 })}
                          className="flex-1 px-3 py-2.5 bg-transparent text-white text-sm font-medium placeholder-dark-400 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          placeholder="0"
                          min="0"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-dark-200 mb-1">Muda wa Ufikiaji</label>
                      <div className="flex items-center bg-dark-700 border border-dark-500 rounded-lg overflow-hidden focus-within:border-primary-500 transition-colors">
                        <input
                          type="number"
                          value={formData.contentPriceDays === 0 ? '' : formData.contentPriceDays}
                          onChange={(e) => setFormData({ ...formData, contentPriceDays: parseInt(e.target.value) || 1 })}
                          className="flex-1 px-3 py-2.5 bg-transparent text-white text-sm font-medium placeholder-dark-400 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          placeholder="30"
                          min="1"
                        />
                        <span className="px-3 py-2.5 bg-dark-600 text-blue-400 text-xs font-bold border-l border-dark-500">siku</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-dark-200 mb-2">Eligible Packages</label>
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
                          className={`p-2 rounded-lg text-xs transition-colors ${
                            formData.contentPurchasePackages?.includes(pkg)
                              ? 'bg-green-600 text-white'
                              : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                          }`}
                        >
                          {pkg}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-dark-500 mt-1"><strong className="text-green-400">Leave empty</strong> = anyone can purchase without a subscription. Select packages to restrict to subscribers only.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 bg-dark-800 text-dark-200 rounded-lg hover:bg-dark-700 transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting || loading}
                className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting || loading ? t('loading') : t('save')}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}


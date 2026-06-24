'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getPackagesConfig, updatePackageConfig, getLiveTvPackagesConfig, updateLiveTvPackageConfig, SUBSCRIPTION_PACKAGES, LIVETV_SUBSCRIPTION_PACKAGES, PackageConfig, PackagesConfigMap } from '@/lib/subscriptions';
import { SubscriptionPackage } from '@/types';
import { motion } from 'framer-motion';
import { Save, RefreshCw, CheckCircle, XCircle, Package, Gamepad2, Tv } from 'lucide-react';

type PackageSet = 'subscription' | 'game' | 'livetv';

export default function AdminPackagesPage() {
  const { adminUser } = useAuth();
  const [packages, setPackages] = useState<PackagesConfigMap>({ ...SUBSCRIPTION_PACKAGES });
  const [liveTvPackages, setLiveTvPackages] = useState<PackagesConfigMap>({ ...LIVETV_SUBSCRIPTION_PACKAGES });
  const [loading, setLoading] = useState(true);
  const [savingPackage, setSavingPackage] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadPackages();
  }, []);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const loadPackages = async () => {
    setLoading(true);
    try {
      const [config, liveTvConfig] = await Promise.all([
        getPackagesConfig(),
        getLiveTvPackagesConfig()
      ]);
      setPackages(config);
      setLiveTvPackages(liveTvConfig);
    } catch (error) {
      console.error('Error loading packages:', error);
      // Fall back to defaults so the form still shows
      setPackages({ ...SUBSCRIPTION_PACKAGES });
      setLiveTvPackages({ ...LIVETV_SUBSCRIPTION_PACKAGES });
      showToast('error', 'Could not load from database — showing defaults');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (setType: PackageSet, pkgKey: SubscriptionPackage, field: keyof PackageConfig, value: string | number) => {
    const newValue = field === 'name' || field === 'description' ? value : Number(value);
    const updater = (prev: PackagesConfigMap): PackagesConfigMap => ({
      ...prev,
      [pkgKey]: {
        ...prev[pkgKey],
        [field]: newValue
      }
    });
    if (setType === 'livetv') {
      setLiveTvPackages(updater);
    } else {
      setPackages(updater);
    }
  };

  const handleSavePackage = async (setType: PackageSet, pkgKey: SubscriptionPackage) => {
    const saveKey = `${setType}:${pkgKey}`;
    setSavingPackage(saveKey);
    try {
      if (setType === 'livetv') {
        await updateLiveTvPackageConfig(pkgKey, liveTvPackages[pkgKey]);
        showToast('success', `Live TV ${pkgKey} updated successfully!`);
      } else {
        await updatePackageConfig(pkgKey, packages[pkgKey]);
        showToast('success', `${pkgKey} updated successfully!`);
      }
    } catch (error) {
      console.error('Error saving package:', error);
      showToast('error', `Failed to update ${pkgKey}. Try again.`);
    } finally {
      setSavingPackage(null);
    }
  };

  const regularPackages = ['FEDHA', 'CHUMA', 'DHAHABU', 'ALMASI', 'MALKIA'] as SubscriptionPackage[];
  const gamePackages = ['KITONGA', 'SWALA', 'ZEBRA', 'SIMBA', 'NDOVU', 'FARU', 'TWIGA'] as SubscriptionPackage[];
  const liveTvPackageKeys = ['FEDHA', 'CHUMA', 'DHAHABU', 'ALMASI', 'MALKIA'] as SubscriptionPackage[];

  const renderPackageCard = (pkgKey: SubscriptionPackage, index: number, setType: PackageSet) => {
    const isGame = setType === 'game';
    const isLiveTv = setType === 'livetv';
    const sourceMap = isLiveTv ? liveTvPackages : packages;
    const defaultsMap = isLiveTv ? LIVETV_SUBSCRIPTION_PACKAGES : SUBSCRIPTION_PACKAGES;
    const pkg = sourceMap[pkgKey] ?? defaultsMap[pkgKey];
    const isSaving = savingPackage === `${setType}:${pkgKey}`;

    const badgeLabel = isGame ? 'Game' : isLiveTv ? 'Live TV' : 'Subscription';
    const badgeClass = isGame
      ? 'bg-blue-500/20 text-blue-400'
      : isLiveTv
      ? 'bg-emerald-500/20 text-emerald-400'
      : 'bg-primary-500/20 text-primary-400';

    return (
      <motion.div
        key={`${setType}:${pkgKey}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="glass-effect rounded-xl p-5 flex flex-col space-y-4 border border-dark-700/50"
      >
        {/* Card Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isGame
              ? <Gamepad2 size={18} className="text-blue-400" />
              : isLiveTv
              ? <Tv size={18} className="text-emerald-400" />
              : <Package size={18} className="text-primary-400" />
            }
            <h3 className="text-base font-bold text-dark-100">{pkgKey}</h3>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full ${badgeClass}`}>
            {badgeLabel}
          </span>
        </div>

        {/* Display Name */}
        <div>
          <label className="block text-xs font-semibold text-dark-400 uppercase tracking-wider mb-1">
            Display Name
          </label>
          <input
            type="text"
            value={pkg?.name ?? pkgKey}
            onChange={(e) => handleInputChange(setType, pkgKey, 'name', e.target.value)}
            className="form-input w-full text-sm"
            placeholder="Display name…"
          />
        </div>

        {/* Price */}
        <div>
          <label className="block text-xs font-semibold text-dark-400 uppercase tracking-wider mb-1">
            Price (TSH)
          </label>
          <input
            type="number"
            value={pkg?.price ?? 0}
            onChange={(e) => handleInputChange(setType, pkgKey, 'price', e.target.value)}
            className="form-input w-full text-sm"
            min="0"
            step="500"
          />
        </div>

        {/* Duration */}
        <div>
          <label className="block text-xs font-semibold text-dark-400 uppercase tracking-wider mb-1">
            Duration (Days){isGame && <span className="ml-1 text-dark-500 normal-case font-normal">(0 = lifetime)</span>}
          </label>
          <input
            type="number"
            value={pkg?.days ?? 0}
            onChange={(e) => handleInputChange(setType, pkgKey, 'days', e.target.value)}
            className="form-input w-full text-sm"
            min="0"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-dark-400 uppercase tracking-wider mb-1">
            Description
          </label>
          <textarea
            value={pkg?.description ?? ''}
            onChange={(e) => handleInputChange(setType, pkgKey, 'description', e.target.value)}
            className="form-input w-full text-sm min-h-[60px] resize-none"
            placeholder="Package description..."
          />
        </div>

        {/* Save Button */}
        <button
          onClick={() => handleSavePackage(setType, pkgKey)}
          disabled={isSaving}
          className="button-primary w-full flex items-center justify-center space-x-2 mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSaving
            ? <RefreshCw size={16} className="animate-spin" />
            : <Save size={16} />
          }
          <span>{isSaving ? 'Saving…' : 'Save Changes'}</span>
        </button>
      </motion.div>
    );
  };

  return (
    <div className="container-mobile space-y-8 py-6">

          {/* Toast */}
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`fixed top-6 right-6 z-50 flex items-center space-x-2 px-5 py-3 rounded-xl shadow-xl ${
                toast.type === 'success' ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'
              }`}
            >
              {toast.type === 'success'
                ? <CheckCircle size={18} />
                : <XCircle size={18} />
              }
              <span className="text-sm font-medium">{toast.message}</span>
            </motion.div>
          )}

          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gradient">Package Settings</h1>
              <p className="text-dark-400 text-sm mt-1">
                Edit prices and durations for subscription & game packages
              </p>
            </div>
            <button
              onClick={loadPackages}
              disabled={loading}
              className="touch-button bg-dark-800 hover:bg-dark-700 text-dark-100 p-2.5 rounded-lg transition-colors disabled:opacity-50"
              title="Reload from database"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Warning Banner */}
          <div className="rounded-xl border-l-4 border-yellow-500 bg-yellow-500/10 px-5 py-3">
            <p className="text-yellow-300 text-sm">
              <strong>Note:</strong> Changes here affect all new payments immediately. Existing active subscriptions keep their expiry dates.
            </p>
          </div>

          {/* Subscription Packages */}
          <section>
            <div className="flex items-center space-x-2 mb-4">
              <Package size={20} className="text-primary-400" />
              <h2 className="text-lg font-bold text-dark-100">Subscription Packages</h2>
            </div>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {regularPackages.map((_, i) => (
                  <div key={i} className="glass-effect rounded-xl p-5 h-64 animate-pulse bg-dark-800/50" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {regularPackages.map((key, i) => renderPackageCard(key, i, 'subscription'))}
              </div>
            )}
          </section>

          {/* Live TV Packages */}
          <section>
            <div className="flex items-center space-x-2 mb-4">
              <Tv size={20} className="text-emerald-400" />
              <h2 className="text-lg font-bold text-dark-100">Live TV Packages</h2>
            </div>
            <p className="text-dark-400 text-sm mb-4">
              These control access to live channels only. Editing them does not affect the subscription packages above.
            </p>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {liveTvPackageKeys.map((_, i) => (
                  <div key={i} className="glass-effect rounded-xl p-5 h-64 animate-pulse bg-dark-800/50" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {liveTvPackageKeys.map((key, i) => renderPackageCard(key, i, 'livetv'))}
              </div>
            )}
          </section>

          {/* Game Packages */}
          <section>
            <div className="flex items-center space-x-2 mb-4">
              <Gamepad2 size={20} className="text-blue-400" />
              <h2 className="text-lg font-bold text-dark-100">Game Packages</h2>
            </div>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {gamePackages.map((_, i) => (
                  <div key={i} className="glass-effect rounded-xl p-5 h-52 animate-pulse bg-dark-800/50" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {gamePackages.map((key, i) => renderPackageCard(key, i, 'game'))}
              </div>
            )}
          </section>

        </div>
  );
}

'use client';

import React from 'react';
import MainLayout from '@/components/MainLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Globe, LogOut, User } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  const { t, language, setLanguage } = useLanguage();

  const settingsItems = [
    {
      icon: User,
      label: t('profile'),
      description: language === 'sw' ? 'Hariri taarifa za wasifu wako' : 'Edit your profile information',
      href: '/profile',
    },
    {
      icon: Globe,
      label: t('language'),
      description: language === 'sw' ? 'Badilisha lugha ya programu' : 'Change application language',
      action: () => setLanguage(language === 'en' ? 'sw' : 'en'),
    },
  ];



  return (
    <MainLayout>
      <div className="container-mobile space-y-6">
        {/* Settings Header */}
        <div className="text-center py-6">
          <h1 className="text-responsive-2xl font-bold text-gradient mb-2">
            {t('settings')}
          </h1>
          <p className="text-responsive-base text-dark-300">
            Dhibiti mipangilio ya programu
          </p>
        </div>

        {/* Settings List */}
        <div className="space-y-4">
          {settingsItems.map((item, index) => {
            const Icon = item.icon;
            const content = (
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-primary-gradient rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon size={24} className="text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-dark-100 mb-1">
                    {item.label}
                  </h3>
                  <p className="text-sm text-dark-400">
                    {item.description}
                  </p>
                </div>
                <div className="text-dark-400">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            );

            return (
              <div key={index} className="glass-effect rounded-lg">
                {item.href ? (
                  <Link
                    href={item.href}
                    className="block w-full p-6 text-left hover:bg-dark-800/30 transition-colors duration-200 rounded-lg"
                  >
                    {content}
                  </Link>
                ) : (
                  <button
                    onClick={item.action}
                    className="w-full p-6 text-left hover:bg-dark-800/30 transition-colors duration-200 rounded-lg"
                  >
                    {content}
                  </button>
                )}
              </div>
            );
          })}


        </div>

        {/* App Info */}
        <div className="glass-effect rounded-lg p-6 text-center">
          <h3 className="font-semibold text-dark-100 mb-2">RahaPremium</h3>
          <p className="text-sm text-dark-400 mb-4">
            Toleo 1.0.0 | Premium Entertainment Platform
          </p>
          <p className="text-xs text-dark-500">
            &copy; {new Date().getFullYear()} RahaPremium. Haki zote zimehifadhiwa.
          </p>
        </div>

        {/* Logout Button */}
        <div className="pt-4">
          <button className="w-full glass-effect rounded-lg p-4 flex items-center justify-center space-x-2 text-red-400 hover:bg-red-500/10 transition-colors duration-200">
            <LogOut size={20} />
            <span className="font-medium">{t('logout')}</span>
          </button>
        </div>
      </div>
    </MainLayout>
  );
}

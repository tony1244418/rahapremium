'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { setupFirestore, checkFirestoreConnection, SetupResult } from '@/lib/firestore-setup';
import { Database, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import Image from 'next/image';

export default function SetupPage() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<boolean | null>(null);
  const [setupResult, setSetupResult] = useState<SetupResult | null>(null);
  const [checkingConnection, setCheckingConnection] = useState(false);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    setCheckingConnection(true);
    try {
      const isConnected = await checkFirestoreConnection();
      setConnectionStatus(isConnected);
    } catch (error) {
      setConnectionStatus(false);
    } finally {
      setCheckingConnection(false);
    }
  };

  const handleSetup = async () => {
    setLoading(true);
    setSetupResult(null);

    try {
      const result = await setupFirestore();
      setSetupResult(result);
    } catch (error: any) {
      setSetupResult({
        success: false,
        message: `Setup failed: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-main-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-primary-gradient rounded-full flex items-center justify-center relative">
            <Image
              src="/logo.png"
              alt="RahaPremium"
              width={40}
              height={40}
              className="w-10 h-10 object-contain"
              priority
              unoptimized
              onError={(e) => {
                // Fallback if logo fails to load
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <span className="text-white font-bold text-2xl hidden">R</span>
          </div>
          <h1 className="text-3xl flex items-center justify-center tracking-tight mb-2">
            <span className="font-black text-white">Raha</span>
            <span className="font-black text-blue-500">Premium</span>
          </h1>
          <h2 className="text-xl font-semibold text-dark-100">Database Setup</h2>
          <p className="text-dark-300 mt-2">Initialize your Firestore database</p>
        </div>

        {/* Setup Card */}
        <div className="glass-effect rounded-lg p-8">
          {/* Connection Status */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-dark-100 flex items-center space-x-2">
                <Database size={20} />
                <span>Database Connection</span>
              </h3>
              <button
                onClick={checkConnection}
                disabled={checkingConnection}
                className="button-secondary px-4 py-2 text-sm"
              >
                {checkingConnection ? (
                  <>
                    <Loader2 size={16} className="animate-spin mr-2" />
                    Checking...
                  </>
                ) : (
                  'Test Connection'
                )}
              </button>
            </div>

            <div className="flex items-center space-x-3 p-4 rounded-lg bg-dark-800/50">
              {connectionStatus === null ? (
                <>
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  <span className="text-dark-300">Connection not tested</span>
                </>
              ) : connectionStatus ? (
                <>
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <CheckCircle size={20} className="text-green-400" />
                  <span className="text-green-400 font-medium">Connected to Firestore</span>
                </>
              ) : (
                <>
                  <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse"></div>
                  <AlertCircle size={20} className="text-red-400" />
                  <span className="text-red-400 font-medium">Connection failed</span>
                </>
              )}
            </div>
          </div>

          {/* Setup Button */}
          <div className="mb-8">
            <button
              onClick={handleSetup}
              disabled={loading || connectionStatus === false}
              className="button-primary w-full py-4 text-lg"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin mr-2" />
                  Setting up database...
                </>
              ) : (
                'Initialize Database'
              )}
            </button>

            {connectionStatus === false && (
              <p className="text-red-400 text-sm mt-2 text-center">
                Please fix the connection issue before proceeding
              </p>
            )}
          </div>

          {/* Setup Result */}
          {setupResult && (
            <div className={`p-6 rounded-lg ${setupResult.success
                ? 'bg-green-500/20 border border-green-500/50'
                : 'bg-red-500/20 border border-red-500/50'
              }`}>
              <div className="flex items-start space-x-3">
                {setupResult.success ? (
                  <CheckCircle size={24} className="text-green-400 flex-shrink-0 mt-1" />
                ) : (
                  <AlertCircle size={24} className="text-red-400 flex-shrink-0 mt-1" />
                )}
                <div className="flex-1">
                  <h4 className={`text-lg font-semibold mb-2 ${setupResult.success ? 'text-green-400' : 'text-red-400'
                    }`}>
                    {setupResult.success ? 'Setup Successful!' : 'Setup Failed'}
                  </h4>
                  <p className="text-dark-300 mb-4">
                    {setupResult.message}
                  </p>

                  {setupResult.details && setupResult.details.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="font-medium text-dark-200">Details:</h5>
                      <ul className="space-y-1 text-sm text-dark-400">
                        {setupResult.details.map((detail, index) => (
                          <li key={index} className="flex items-center space-x-2">
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {setupResult.success && (
                    <div className="mt-6 space-y-3">
                      <div className="p-4 bg-blue-500/20 rounded-lg border border-blue-500/50">
                        <h5 className="font-medium text-blue-400 mb-2">Test Credentials</h5>
                        <div className="space-y-2 text-sm text-dark-300">
                          <div>
                            <strong>Admin Login:</strong>
                            <br />Email: admin@rahapremium.com
                            <br />Password: Use any password (demo mode)
                          </div>
                          <div>
                            <strong>User Login:</strong>
                            <br />Phone: +255712345678
                            <br />Username: testuser
                          </div>
                        </div>
                      </div>

                      <div className="flex space-x-4">
                        <a href="/auth" className="button-primary flex-1 text-center">
                          Go to Login
                        </a>
                        <a href="/admin" className="button-secondary flex-1 text-center">
                          Admin Panel
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Troubleshooting */}
          {connectionStatus === false && (
            <div className="mt-8 p-6 bg-red-500/10 border border-red-500/30 rounded-lg">
              <h4 className="font-semibold text-red-400 mb-3">Connection Troubleshooting:</h4>
              <ul className="space-y-2 text-sm text-red-300">
                <li>• Check your internet connection</li>
                <li>• Verify Firebase project is active</li>
                <li>• Ensure Firestore database is created in Firebase Console</li>
                <li>• Check if your browser blocks third-party cookies</li>
                <li>• Try refreshing the page</li>
                <li>• Check browser console for detailed errors</li>
              </ul>
              <div className="mt-4 p-4 bg-dark-800/50 rounded text-xs text-dark-400">
                <strong>Firebase Project ID:</strong> rahapremiumtz<br />
                <strong>Project URL:</strong> https://console.firebase.google.com/project/rahapremiumtz
              </div>
            </div>
          )}

          {/* Information */}
          <div className="mt-8 p-6 bg-dark-800/30 rounded-lg">
            <h4 className="font-semibold text-dark-100 mb-3">What this setup does:</h4>
            <ul className="space-y-2 text-sm text-dark-400">
              <li>• Creates admin and user collections</li>
              <li>• Adds sample admin and test user accounts</li>
              <li>• Creates content collections (movies, series, stories)</li>
              <li>• Adds sample content for testing</li>
              <li>• Verifies database connectivity</li>
              <li>• Sets up proper Firestore security rules</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-dark-500">
          <p>&copy; {new Date().getFullYear()} RahaPremium. Database Setup Utility.</p>
        </div>
      </div>
    </div>
  );
}

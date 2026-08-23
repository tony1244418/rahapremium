'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

export default function DebugPage() {
  const { user, loading } = useAuth();
  const [localStorageData, setLocalStorageData] = useState<Record<string, string>>({});

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const data: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          data[key] = localStorage.getItem(key) || '';
        }
      }
      setLocalStorageData(data);
    }
  }, []);

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-dark-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-8">🔍 Debug Information</h1>

      {/* User Data from Context */}
      <div className="bg-dark-800 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">👤 User from Context</h2>
        {user ? (
          <div className="space-y-2 text-sm font-mono">
            <div><strong>UID:</strong> {user.uid}</div>
            <div><strong>Phone:</strong> {user.phoneNumber}</div>
            <div><strong>Display Name:</strong> {user.displayName || 'N/A'}</div>
            <div><strong>Username:</strong> {user.username || 'N/A'}</div>
            <div><strong>Is Blocked:</strong> {user.isBlocked ? 'YES' : 'NO'}</div>
            
            <div className="mt-4 pt-4 border-t border-dark-600">
              <strong className="text-primary-400">📦 GENERAL SUBSCRIPTION:</strong>
            </div>
            {user.subscription ? (
              <div className="ml-4 space-y-1">
                <div><strong>Package:</strong> {user.subscription.packageType}</div>
                <div><strong>Is Active:</strong> {user.subscription.isActive ? '✅ YES' : '❌ NO'}</div>
                <div><strong>Start Date:</strong> {new Date(user.subscription.startDate).toLocaleString()}</div>
                <div><strong>End Date:</strong> {new Date(user.subscription.endDate).toLocaleString()}</div>
                <div><strong>Days Remaining:</strong> {Math.ceil((new Date(user.subscription.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))}</div>
                <div><strong>Amount:</strong> TSH {user.subscription.amount}</div>
                <div><strong>Valid Now:</strong> {new Date(user.subscription.endDate) > new Date() ? '✅ YES' : '❌ EXPIRED'}</div>
              </div>
            ) : (
              <div className="ml-4 text-red-400">❌ No subscription found</div>
            )}

            <div className="mt-4 pt-4 border-t border-dark-600">
              <strong className="text-blue-400">📺 LIVE TV SUBSCRIPTION:</strong>
            </div>
            {user.liveTvSubscription ? (
              <div className="ml-4 space-y-1">
                <div><strong>Package:</strong> {user.liveTvSubscription.packageType}</div>
                <div><strong>Is Active:</strong> {user.liveTvSubscription.isActive ? '✅ YES' : '❌ NO'}</div>
                <div><strong>End Date:</strong> {new Date(user.liveTvSubscription.endDate).toLocaleString()}</div>
              </div>
            ) : (
              <div className="ml-4 text-gray-400">No Live TV subscription</div>
            )}

            <div className="mt-4 pt-4 border-t border-dark-600">
              <strong>💳 Payment History:</strong> {user.paymentHistory?.length || 0} payment(s)
            </div>
            {user.paymentHistory && user.paymentHistory.length > 0 && (
              <div className="ml-4 space-y-3 mt-2">
                {user.paymentHistory.slice(-3).reverse().map((payment, i) => (
                  <div key={i} className="bg-dark-700 p-3 rounded">
                    <div><strong>#{i + 1}</strong></div>
                    <div>Package: {payment.packageType}</div>
                    <div>Amount: TSH {payment.amount}</div>
                    <div>Status: <span className={payment.status === 'completed' ? 'text-green-400' : 'text-yellow-400'}>{payment.status}</span></div>
                    <div>Created: {new Date(payment.createdAt).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-red-400">❌ No user logged in</div>
        )}
      </div>

      {/* LocalStorage Data */}
      <div className="bg-dark-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">💾 LocalStorage Data</h2>
        <div className="space-y-2 text-sm font-mono">
          {Object.keys(localStorageData).length > 0 ? (
            Object.entries(localStorageData).map(([key, value]) => (
              <div key={key} className="border-b border-dark-600 pb-2">
                <strong className="text-primary-400">{key}:</strong>
                <div className="ml-4 text-gray-300 break-all">{value}</div>
              </div>
            ))
          ) : (
            <div className="text-gray-400">No localStorage data found</div>
          )}
        </div>
      </div>

      {/* Diagnosis */}
      <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-6 mt-6">
        <h2 className="text-xl font-semibold mb-4 text-yellow-400">🔧 Diagnosis</h2>
        <div className="space-y-2 text-sm">
          {!user && <div className="text-red-400">⚠️ Not logged in - this is the main issue</div>}
          {user && !user.subscription && <div className="text-red-400">⚠️ User has NO subscription object</div>}
          {user && user.subscription && !user.subscription.isActive && <div className="text-red-400">⚠️ Subscription exists but isActive = false</div>}
          {user && user.subscription && user.subscription.isActive && new Date(user.subscription.endDate) <= new Date() && (
            <div className="text-red-400">⚠️ Subscription is marked active but has EXPIRED</div>
          )}
          {user && user.subscription && user.subscription.isActive && new Date(user.subscription.endDate) > new Date() && (
            <div className="text-green-400">✅ Everything looks good! Active subscription found</div>
          )}
        </div>
      </div>
    </div>
  );
}

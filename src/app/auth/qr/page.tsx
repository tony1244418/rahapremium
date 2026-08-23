'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Loader2, QrCode, MonitorSmartphone, CheckCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function QrWaitPage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'waiting' | 'approved'>('loading');
  const hasInitialized = React.useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    let currentSessionId = crypto.randomUUID();
    setSessionId(currentSessionId);

    const initQrSession = async () => {
      try {
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

        const { error } = await supabase
          .from('qr_login_sessions')
          .insert([
            {
              id: currentSessionId,
              status: 'pending',
              expires_at: expiresAt,
            }
          ]);

        if (error) throw error;

        // Build URL
        const baseUrl = window.location.origin;
        const scanUrl = `${baseUrl}/auth/scan?session=${currentSessionId}`;
        const encodedUrl = encodeURIComponent(scanUrl);
        setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodedUrl}&bgcolor=ffffff&color=000000&margin=10&format=svg`);
        setStatus('waiting');

        const handleApprovedSession = (newData: any) => {
          setStatus('approved');
          
          // Perform the local login
          localStorage.setItem('supabase_uid', newData.user_id);
          localStorage.setItem('supabase_phone', newData.phone_number);
          
          // Generate a device session ID
          const DEVICE_SESSION_KEY = 'raha_device_session_id';
          let deviceId = localStorage.getItem(DEVICE_SESSION_KEY);
          if (!deviceId) {
            deviceId = crypto.randomUUID();
            localStorage.setItem(DEVICE_SESSION_KEY, deviceId);
          }

          // Redirect after a brief moment to show success UI
          setTimeout(() => {
            window.location.href = '/';
          }, 1500);
        };

        // Fallback polling mechanism in case Supabase Realtime is not enabled for this table
        const pollInterval = setInterval(async () => {
          try {
            const { data: rawData } = await supabase
              .from('qr_login_sessions')
              .select('*')
              .eq('id', currentSessionId)
              .single();
            const data = rawData as any;
            if (data && data.status === 'approved' && data.user_id && data.phone_number) {
              clearInterval(pollInterval);
              handleApprovedSession(data);
            }
          } catch (e) {
            // Ignore polling errors
          }
        }, 2000);

        // Subscribe to changes
        const channel = supabase
          .channel(`qr_login_sessions:id=eq.${currentSessionId}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'qr_login_sessions',
              filter: `id=eq.${currentSessionId}`,
            },
            (payload) => {
              const newData = payload.new;
              if (newData.status === 'approved' && newData.user_id && newData.phone_number) {
                clearInterval(pollInterval);
                handleApprovedSession(newData);
              }
            }
          )
          .subscribe();

        return () => {
          clearInterval(pollInterval);
          supabase.removeChannel(channel);
        };

      } catch (err) {
        console.error('Error creating QR session:', err);
      }
    };

    initQrSession();
  }, []);

  return (
    <div className="min-h-screen bg-main-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        
        {/* Back Button */}
        <Link href="/auth" className="inline-flex items-center gap-2 text-dark-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Back to Login</span>
        </Link>

        <div className="glass-effect rounded-2xl p-8 text-center border border-white/5 relative overflow-hidden">
          
          {/* Top Icon */}
          <div className="w-16 h-16 mx-auto bg-dark-800 rounded-full flex items-center justify-center mb-6 shadow-xl border border-dark-700/50 relative z-10">
            {status === 'approved' ? (
              <CheckCircle className="text-green-400 w-8 h-8" />
            ) : (
              <MonitorSmartphone className="text-blue-400 w-8 h-8" />
            )}
          </div>

          <h2 className="text-2xl font-bold text-white mb-2 relative z-10">
            {status === 'approved' ? 'Login Successful!' : 'Log in with QR Code'}
          </h2>
          
          <p className="text-dark-400 text-sm mb-8 relative z-10">
            {status === 'approved' 
              ? 'Redirecting you to the homepage...' 
              : 'Scan this code with the Raha Premium app on your logged-in mobile device.'}
          </p>

          {/* QR Code Container */}
          <div className="bg-white rounded-xl p-4 inline-block mb-8 shadow-2xl relative z-10 mx-auto">
            {status === 'loading' ? (
              <div className="w-[200px] h-[200px] flex items-center justify-center">
                <Loader2 className="animate-spin text-dark-300 w-10 h-10" />
              </div>
            ) : status === 'approved' ? (
              <div className="w-[200px] h-[200px] flex items-center justify-center bg-green-50 rounded-lg">
                <CheckCircle className="text-green-500 w-16 h-16" />
              </div>
            ) : (
              qrUrl && <img src={qrUrl} alt="Login QR Code" className="w-[200px] h-[200px]" />
            )}
          </div>

          {/* Instructions */}
          {status !== 'approved' && (
            <div className="text-left bg-dark-800/50 rounded-xl p-5 border border-white/5 relative z-10">
              <ol className="text-sm text-dark-300 space-y-3 list-decimal list-inside marker:text-blue-500 marker:font-bold">
                <li>Open Raha Premium on your phone.</li>
                <li>Go to <strong>Profile</strong> &gt; <strong>Linked Devices</strong>.</li>
                <li>Point your camera at this screen to confirm login.</li>
              </ol>
            </div>
          )}

          {/* Background Ambient Orbs */}
          <div className="absolute top-[-50px] left-[-50px] w-48 h-48 bg-blue-600/20 rounded-full blur-[60px] pointer-events-none" />
          <div className="absolute bottom-[-50px] right-[-50px] w-48 h-48 bg-primary-600/20 rounded-full blur-[60px] pointer-events-none" />
        </div>

      </div>
    </div>
  );
}

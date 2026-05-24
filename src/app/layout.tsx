import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Inter } from 'next/font/google';
import './globals.css';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { PlatformControlProvider } from '@/contexts/PlatformControlContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import PWAInstaller from '@/components/PWAInstaller';
import { AuthLoading } from '@/components/AuthLoading';
import MaintenanceGate from '@/components/MaintenanceGate';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'RahaPremium - Premium Entertainment Streaming',
  description: 'Premium entertainment streaming platform featuring movies, TV series, and stories in Swahili and English. Designed for Tanzania and East Africa.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'RahaPremium',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/logo.png', sizes: 'any', type: 'image/png' },
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#1e40af',
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sw" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <Script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" strategy="afterInteractive" />
        <Script id="onesignal-init" strategy="afterInteractive" dangerouslySetInnerHTML={{
          __html: `
            window.OneSignalDeferred = window.OneSignalDeferred || [];
            OneSignalDeferred.push(async function(OneSignal) {
              if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
                try {
                  await OneSignal.init({
                    appId: "${process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || '24e0b9a2-7b60-4261-b032-c93652a22e24'}",
                  });
                } catch (e) {
                  console.error('OneSignal init error:', e);
                }
              }
            });
          `
        }} />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('theme') || 'dark';
                const getSystemTheme = () => {
                  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                };
                const resolvedTheme = theme === 'system' ? getSystemTheme() : theme;
                document.documentElement.classList.add(resolvedTheme);
              })();
            `,
          }}
        />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/logo.png" type="image/png" />
        <link rel="shortcut icon" href="/logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="RahaPremium" />
        <meta name="application-name" content="RahaPremium" />
        <meta name="msapplication-TileColor" content="#1e40af" />
        <meta name="msapplication-TileImage" content="/icon-192x192.png" />
        <meta name="theme-color" content="#1e40af" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider>
          <LanguageProvider>
            <PlatformControlProvider>
              <AuthProvider>
                <AuthLoading />
                <MaintenanceGate>
                  <div className="min-h-screen bg-main-gradient">
                    {children}
                  </div>
                </MaintenanceGate>
                <PWAInstaller />
              </AuthProvider>
            </PlatformControlProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

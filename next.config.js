/** @type {import('next').NextConfig} */
const nextConfig = {
  // Build & resource optimizations for Hostinger/CloudLinux
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  staticPageGenerationTimeout: 60,

  // Enable experimental features for better performance and single-process build
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
    cpus: 1,
  },

  // Allow Cloudflare tunnel and local network access for dev testing on phone
  allowedDevOrigins: [
    '*.trycloudflare.com',
    'trycloudflare.com',
  ],
  
  // Image optimization settings
  images: {
    unoptimized: true, // Keep this for external images
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'drive.google.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'i.ibb.co',
      },
      {
        protocol: 'https',
        hostname: 'imgur.com',
      },
      {
        protocol: 'https',
        hostname: 'i.imgur.com',
      },
    ],
  },
  
  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Exclude ADDDD folder from build
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  
  // Webpack configuration
  webpack: (config, { isServer }) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/ADDDD/**'],
    };
    
    // Optimize bundle size
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    return config;
  },
  
  // NOTE: Apex (rahapremium.com) -> www redirect is handled in two places
  // because this app is served by Hostinger (Apache + Node), not Vercel:
  //   1. public/.htaccess  — when Apache/LiteSpeed handles the request directly
  //   2. src/middleware.ts — when the request reaches the Next.js Node server
  // Keeping both layers ensures the apex always redirects regardless of which
  // tier serves the request.

  // Security & Permission Headers for live/Vercel deployment
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Allow camera & microphone on all pages (required for QR scanner)
          {
            key: 'Permissions-Policy',
            value: 'camera=*, microphone=*, geolocation=()',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/css/:path*',
        headers: [
          {
            key: 'Content-Type',
            value: 'text/css; charset=utf-8',
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig

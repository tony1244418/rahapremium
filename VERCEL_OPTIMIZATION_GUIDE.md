# Vercel Deployment Optimization Guide

## 🚀 Optimal Build Settings for Vercel

### 1. **Framework Preset**
- **Framework**: Next.js
- **Build Command**: `npm run build` (auto-detected)
- **Output Directory**: `.next` (auto-detected)
- **Install Command**: `npm install` (auto-detected)

### 2. **Environment Variables** (Set in Vercel Dashboard)

#### Required Variables:
```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Payment Gateways
CLICKPESA_API_KEY=your_clickpesa_api_key
HARAKAPAY_API_KEY=your_harakapay_api_key
# Note: Webhooks are now at /api/webhook/clickpesa and /api/webhook/harakapay

# NextAuth
NEXTAUTH_URL=https://your-app-name.vercel.app
NEXTAUTH_SECRET=your_nextauth_secret
```

### 3. **Build Settings in Vercel Dashboard**

#### General Settings:
- **Node.js Version**: 18.x (recommended)
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

#### Advanced Settings:
- **Root Directory**: `/` (if deploying from root)
- **Framework Preset**: Next.js
- **Functions Region**: Auto (or closest to your users)

### 4. **Performance Optimizations**

#### Bundle Analysis:
```bash
# Install bundle analyzer (optional)
npm install --save-dev @next/bundle-analyzer

# Add to package.json scripts:
"analyze": "ANALYZE=true npm run build"
```

#### Image Optimization:
- ✅ External images are properly configured
- ✅ Remote patterns are set for Google Drive, Imgur, etc.
- ✅ Unoptimized images for external sources (correct for your use case)

### 5. **PWA Optimizations**

#### Service Worker:
- ✅ Properly configured with caching strategies
- ✅ Headers set for no-cache on service worker
- ✅ Manifest headers optimized

#### Caching Strategy:
- Static assets: 1 year cache
- Service worker: No cache
- API routes: Dynamic

### 6. **Security Headers**

The `vercel.json` file includes:
- ✅ X-Frame-Options: DENY
- ✅ X-Content-Type-Options: nosniff
- ✅ Referrer-Policy: origin-when-cross-origin
- ✅ Permissions-Policy: camera=(), microphone=(), geolocation=()

### 7. **Deployment Checklist**

#### Before Deployment:
- [ ] Set all environment variables in Vercel dashboard
- [ ] Update WEBHOOK_URL with your actual Vercel domain
- [ ] Test build locally: `npm run build`
- [ ] Verify Firebase configuration
- [ ] Check payment gateway credentials

#### After Deployment:
- [ ] Test PWA installation
- [ ] Verify payment flow works
- [ ] Check admin panel functionality
- [ ] Test on different devices/browsers
- [ ] Monitor Vercel analytics

### 8. **Vercel-Specific Optimizations**

#### Edge Functions (Optional):
```javascript
// For API routes that need global distribution
export const config = {
  runtime: 'edge',
}
```

#### ISR (Incremental Static Regeneration):
```javascript
// For pages that can be statically generated
export const revalidate = 3600 // 1 hour
```

### 9. **Monitoring and Analytics**

#### Vercel Analytics:
- Enable in Vercel dashboard
- Monitor Core Web Vitals
- Track performance metrics

#### Error Monitoring:
- Consider adding Sentry or similar
- Monitor API route errors
- Track PWA installation rates

### 10. **Domain and SSL**

#### Custom Domain:
- Add custom domain in Vercel dashboard
- SSL certificate auto-provisioned
- Update environment variables with new domain

#### DNS Settings:
- Point your domain to Vercel
- Enable automatic HTTPS redirects

## 🔧 Troubleshooting

### Common Issues:

1. **Build Failures**:
   - Check Node.js version (use 18.x)
   - Verify all dependencies are in package.json
   - Check for TypeScript errors

2. **Environment Variables**:
   - Ensure all required variables are set
   - Check variable names match exactly
   - Redeploy after adding variables

3. **PWA Issues**:
   - Verify HTTPS is enabled
   - Check manifest.json is accessible
   - Test service worker registration

4. **Payment Gateway**:
   - Update webhook URL after deployment
   - Test payment flow end-to-end
   - Check API credentials

## 📊 Performance Tips

1. **Bundle Size**:
   - Use dynamic imports for heavy components
   - Optimize images
   - Remove unused dependencies

2. **Caching**:
   - Leverage Vercel's edge caching
   - Use appropriate cache headers
   - Implement ISR where possible

3. **CDN**:
   - Vercel automatically provides global CDN
   - Static assets served from edge locations
   - API routes can use edge functions

## 🚀 Quick Deploy Commands

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Deploy to production
vercel --prod

# Check deployment status
vercel ls
```

## 📱 PWA Testing

After deployment, test PWA functionality:
1. Visit your Vercel URL
2. Check for install prompts
3. Test offline functionality
4. Verify app works when installed

Your app is now optimized for Vercel deployment! 🎉

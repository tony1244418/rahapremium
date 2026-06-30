# Vercel Environment Variables Configuration

## 📋 Complete List of Environment Variables

Add these environment variables in your Vercel dashboard:
**Settings → Environment Variables → Add New**

---

## 🔥 Firebase Configuration (Client-Side)

These are **public** variables (prefixed with `NEXT_PUBLIC_`) and will be exposed to the browser:

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAhPycuMgy5XdsHMaiKABziUb948IMGfmk
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=rahapremiumtz.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=rahapremiumtz
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=rahapremiumtz.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=402825243066
NEXT_PUBLIC_FIREBASE_APP_ID=1:402825243066:web:e6f667e58b3c5fe559d583
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-V1YF1E1KPM
```

**Note**: Currently these are hardcoded in `src/lib/firebase.ts`. Consider moving them to environment variables for better security.

---

## 💳 Payment Gateways (ClickPesa & HarakaPay)

These are **server-side** variables (NOT prefixed with `NEXT_PUBLIC_`):

```
CLICKPESA_API_KEY=your_clickpesa_api_key
HARAKAPAY_API_KEY=your_harakapay_api_key
```

**Note**: 
- Webhooks are automatically configured to `/api/webhook/clickpesa` and `/api/webhook/harakapay`
- Ensure these are added to your Vercel project settings.

---

## 🔐 Google OAuth (NextAuth)

These are **server-side** variables for Google authentication:

```
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

**How to get these:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project or select existing
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Add authorized redirect URI: `https://your-app-name.vercel.app/api/auth/callback/google`

---

## 🌐 Application URL (Optional)

```
NEXTAUTH_URL=https://your-app-name.vercel.app
NEXTAUTH_SECRET=your_random_secret_string
```

**To generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

---

## 📝 Step-by-Step Instructions

### 1. Add Variables in Vercel Dashboard

1. Go to your Vercel project dashboard
2. Click **"Settings"** tab
3. Click **"Environment Variables"** in the left sidebar
4. Click **"Add New"** button

### 2. For Each Variable:

- **Key**: Enter the variable name (e.g., `CLICKPESA_API_KEY`)
- **Value**: Enter the variable value
- **Environment**: Select which environments to apply:
  - ✅ **Production** (for production deployments)
  - ✅ **Preview** (for preview deployments)
  - ✅ **Development** (for local development)

### 3. Recommended Settings:

- **Firebase variables**: Add to Production, Preview, Development
- **Payment variables**: Add to Production, Preview only
- **OAuth variables**: Add to Production, Preview only

---

## 🔄 After Adding Variables

1. **Redeploy** your application:
   - Go to **"Deployments"** tab
   - Click **"..."** on latest deployment
   - Click **"Redeploy"**
   - Or push a new commit to trigger automatic deployment

2. **Verify** variables are loaded:
   - Check build logs for any errors
   - Test your application functionality

---

## ⚠️ Important Notes

### Security Best Practices:

1. **Never commit** `.env.local` file to Git
2. **Use different values** for production vs development if needed
3. **Rotate secrets** periodically
4. **Limit access** to environment variables in Vercel team settings

### Current Status:

- ✅ Firebase config is hardcoded (works but not ideal)
- ✅ Payment variables have fallbacks (will work without env vars)
- ⚠️ Google OAuth needs proper configuration

---

## 🧪 Testing Locally

Create a `.env.local` file in your project root:

```bash
# .env.local (DO NOT COMMIT THIS FILE)

# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAhPycuMgy5XdsHMaiKABziUb948IMGfmk
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=rahapremiumtz.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=rahapremiumtz
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=rahapremiumtz.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=402825243066
NEXT_PUBLIC_FIREBASE_APP_ID=1:402825243066:web:e6f667e58b3c5fe559d583

# Payment
CLICKPESA_API_KEY=your_clickpesa_api_key
HARAKAPAY_API_KEY=your_harakapay_api_key

# OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

---

## 📋 Quick Copy-Paste for Vercel

Copy this entire block and paste into Vercel environment variables (one at a time):

### Firebase (Public - Client Side):
```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAhPycuMgy5XdsHMaiKABziUb948IMGfmk
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=rahapremiumtz.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=rahapremiumtz
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=rahapremiumtz.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=402825243066
NEXT_PUBLIC_FIREBASE_APP_ID=1:402825243066:web:e6f667e58b3c5fe559d583
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-V1YF1E1KPM
```

### Payment Gateways (Server Side):
```
CLICKPESA_API_KEY=your_clickpesa_api_key
HARAKAPAY_API_KEY=your_harakapay_api_key
```

### Google OAuth (Server Side):
```
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
```

---

## ✅ Checklist

Before deploying, ensure:

- [ ] All Firebase variables added
- [ ] Payment variables added
- [ ] OAuth variables added (if using Google login)
- [ ] WEBHOOK_URL updated with actual Vercel URL
- [ ] Variables set for correct environments (Production/Preview)
- [ ] Application redeployed after adding variables

---

## 🆘 Troubleshooting

### Variables not working?
1. Check variable names match exactly (case-sensitive)
2. Ensure variables are set for the correct environment
3. Redeploy after adding variables
4. Check build logs for errors

### Payment not working?
1. Verify `WEBHOOK_URL` matches your Vercel deployment URL
2. Check ClickPesa or HarakaPay dashboard for webhook configuration
3. Ensure API key and account ID are correct

### Firebase errors?
1. Verify all Firebase variables are set
2. Check Firebase project is active
3. Ensure Firestore rules allow access

---

**Last Updated**: Based on current codebase analysis
**Project**: Raha Premium
**Repository**: https://github.com/okothsta/premium.git


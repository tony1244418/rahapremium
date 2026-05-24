# RahaPremium Deployment Guide

##  Firebase Deployment (Spark Plan Compatible)

### Prerequisites
- Firebase CLI installed globally
- Firebase project created
- Node.js 18+ installed

### Step 1: Firebase Setup
```bash
# Login to Firebase
firebase login

# Initialize Firebase in your project
firebase init

# Select the following options:
# - Hosting: Configure files for Firebase Hosting
# - Use existing project: Select your Firebase project
# - Public directory: out (for static export)
# - Single-page app: Yes
# - Set up automatic builds with GitHub: No (optional)
```

### Step 2: Configure Firebase Hosting
Create/update `firebase.json`:
```json
{
  "hosting": {
    "public": "out",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      },
      {
        "source": "sw.js",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "no-cache"
          }
        ]
      }
    ]
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  }
}
```

### Step 3: Configure Next.js for Static Export
Update `next.config.js`:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'drive.google.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
}

module.exports = nextConfig
```

### Step 4: Build and Deploy
```bash
# Build the application
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

##  Firestore Setup

### Step 1: Create Collections
Create the following collections in Firestore:

1. **users** - User accounts
2. **admins** - Admin accounts  
3. **movies** - Movie content
4. **series** - TV series content
5. **seasons** - Season data
6. **episodes** - Episode data
7. **stories** - Written stories
8. **payments** - Payment records

### Step 2: Firestore Security Rules
Create `firestore.rules`:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Only admins can access admin collection
    match /admins/{adminId} {
      allow read, write: if request.auth != null && 
        exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }
    
    // Content is readable by authenticated users
    match /movies/{movieId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }
    
    match /series/{seriesId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }
    
    match /stories/{storyId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }
    
    // Payments accessible by user and admins
    match /payments/{paymentId} {
      allow read: if request.auth != null && 
        (resource.data.userId == request.auth.uid || 
         exists(/databases/$(database)/documents/admins/$(request.auth.uid)));
      allow write: if request.auth != null && 
        exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }
  }
}
```

### Step 3: Create Admin Account
Manually create an admin document in Firestore:

Collection: `admins`
Document ID: `[admin-uid]`
```json
{
  "uid": "[admin-uid]",
  "email": "admin@rahapremium.com",
  "displayName": "Administrator",
  "role": "admin",
  "permissions": ["manage_content", "manage_users", "view_analytics", "manage_subscriptions"],
  "createdAt": "[timestamp]",
  "lastLoginAt": "[timestamp]",
  "isActive": true
}
```

## 🔐 Environment Variables
No environment variables needed for Firebase Spark plan deployment.

## 📱 PWA Features Included
- ✅ Service Worker with caching strategy
- ✅ Manifest.json with app metadata
- ✅ Install prompt component
- ✅ Offline functionality
- ✅ Background sync capabilities
- ✅ Push notification support (ready)

## 🎯 Post-Deployment Checklist

### Test Authentication
1. ✅ User registration with phone/username
2. ✅ User login with existing credentials
3. ✅ Admin login with email/password
4. ✅ Session persistence

### Test Content Access
1. ✅ Movies page loads and displays content
2. ✅ Series page with expandable seasons/episodes
3. ✅ Stories page with reading interface
4. ✅ Adult content age verification

### Test Subscription System
1. ✅ Subscription packages display correctly
2. ✅ Payment flow initiates properly
3. ✅ Payment history accessible
4. ✅ Manual admin completion works

### Test Admin Panel
1. ✅ Admin dashboard loads with analytics
2. ✅ User management functions work
3. ✅ Payment management accessible
4. ✅ Real-time updates functioning

### Test Mobile Experience
1. ✅ Touch-friendly navigation
2. ✅ Responsive design on various screen sizes
3. ✅ PWA install prompt appears
4. ✅ Offline functionality works

##  Troubleshooting

### Build Issues
- Ensure all dependencies are installed: `npm install`
- Clear Next.js cache: `rm -rf .next`
- Check for TypeScript errors: `npm run build`

### Firebase Deployment Issues
- Verify Firebase CLI is logged in: `firebase login`
- Check project selection: `firebase use --add`
- Ensure proper permissions on Firebase project

### PWA Issues
- Check service worker registration in browser DevTools
- Verify manifest.json is accessible
- Test install prompt on supported browsers

## 📊 Performance Optimization

### Already Implemented
- ✅ Code splitting with Next.js
- ✅ Image optimization settings
- ✅ Static generation for better performance
- ✅ Service worker caching
- ✅ Lazy loading components

### Monitoring
- Use Firebase Analytics for user tracking
- Monitor Core Web Vitals in production
- Set up error tracking with Firebase Crashlytics

## 🚀 Going Live

1. **Build**: `npm run build`
2. **Deploy**: `firebase deploy --only hosting`
3. **Test**: Verify all functionality on live URL
4. **Monitor**: Check Firebase Console for usage
5. **Scale**: Upgrade to Blaze plan when needed

## 📞 Support
- Firebase Console: https://console.firebase.google.com
- Next.js Documentation: https://nextjs.org/docs
- PWA Guidelines: https://web.dev/progressive-web-apps/

---

**Your RahaPremium platform is ready for deployment! 🎉**

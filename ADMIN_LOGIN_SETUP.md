# Admin Login Setup Guide

## Problem: Admin Login Failing (400 Error)

The admin login is failing because the admin user needs to be created in **Firebase Authentication** first, not just in Firestore.

## Solution: Create Admin User in Firebase Authentication

### Step 1: Enable Email/Password Authentication in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **rahapremiumtz**
3. Go to **Authentication** → **Sign-in method**
4. Click on **Email/Password**
5. Enable **Email/Password** (toggle it ON)
6. Click **Save**

### Step 2: Create Admin User in Firebase Authentication

**Option A: Using Firebase Console (Recommended)**

1. In Firebase Console, go to **Authentication** → **Users**
2. Click **Add user**
3. Enter:
   - **Email**: `admin@example.com` (or your admin email)
   - **Password**: Create a strong password
4. Click **Add user**
5. Copy the **User UID** (you'll need this)

**Option B: Using Firebase CLI**

```bash
# Install Firebase CLI if not installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Create user (you'll need to use Admin SDK for this)
# See scripts/create-admin-user.js below
```

### Step 3: Verify Admin User in Firestore

After creating the user in Firebase Authentication, the app will automatically create the admin document in Firestore when you log in. However, you can also manually create it:

1. Go to **Firestore Database** in Firebase Console
2. Navigate to **admins** collection
3. Create a document with the **User UID** as the document ID
4. Add these fields:
   ```json
   {
     "uid": "YOUR_FIREBASE_USER_UID",
     "email": "admin@example.com",
     "displayName": "Admin Name",
     "role": "admin",
     "permissions": [
       "manage_content",
       "manage_users",
       "view_analytics",
       "manage_subscriptions"
     ],
     "createdAt": "2024-01-01T00:00:00Z",
     "lastLoginAt": "2024-01-01T00:00:00Z",
     "isActive": true
   }
   ```

### Step 4: Test Admin Login

1. Go to: `https://premium-lilac.vercel.app/admin/login`
2. Enter:
   - **Email**: `admin@example.com`
   - **Password**: (the password you created)
3. Click **Kuingia kwa Admini** (Login as Admin)

## Troubleshooting

### Error: "Kuingia kwa admini kumeshindwa" (Admin login failed)

**Possible causes:**
1. ✅ Email/Password authentication not enabled in Firebase Console
2. ✅ User doesn't exist in Firebase Authentication
3. ✅ Wrong email or password
4. ✅ Firebase project configuration mismatch

**Solutions:**
1. Check Firebase Console → Authentication → Sign-in method → Email/Password is enabled
2. Verify the user exists in Authentication → Users
3. Try resetting the password in Firebase Console
4. Verify Firebase config in `src/lib/firebase.ts` matches your Firebase project

### Error: 400 Bad Request from identitytoolkit.googleapis.com

This means:
- The authentication request format is incorrect, OR
- Email/Password authentication is not enabled, OR
- The Firebase API key is incorrect

**Fix:**
1. Enable Email/Password in Firebase Console
2. Verify the API key in `src/lib/firebase.ts` matches Firebase Console → Project Settings → General → Your apps

### Error: manifest.json 404

This is fixed by creating the route handler at `src/app/manifest.json/route.ts`. The file will be served correctly after deployment.

## Quick Setup Script

Create a file `scripts/create-admin-user.js`:

```javascript
const admin = require('firebase-admin');
const serviceAccount = require('./path-to-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function createAdminUser() {
  try {
    const userRecord = await admin.auth().createUser({
      email: 'admin@example.com',
      password: 'YourSecurePassword123!',
      emailVerified: true,
      displayName: 'Admin User'
    });

    console.log('✅ Admin user created:', userRecord.uid);
    
    // Also create Firestore document
    await admin.firestore().collection('admins').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: 'admin@example.com',
      displayName: 'Admin User',
      role: 'admin',
      permissions: ['manage_content', 'manage_users', 'view_analytics', 'manage_subscriptions'],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
      isActive: true
    });

    console.log('✅ Admin document created in Firestore');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createAdminUser();
```

## Important Notes

1. **Security**: Never commit Firebase service account keys to Git
2. **Password**: Use a strong password for admin accounts
3. **Firebase Rules**: Ensure Firestore security rules allow admin access
4. **Environment**: The admin login works for any Firebase authenticated user - the app automatically creates the admin document

## Current Status

- ✅ manifest.json route handler created
- ⚠️ Admin user needs to be created in Firebase Authentication
- ⚠️ Email/Password authentication must be enabled in Firebase Console


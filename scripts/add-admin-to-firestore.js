const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, Timestamp } = require('firebase/firestore');

// Your Firebase config (replace with your actual config)
const firebaseConfig = {
  apiKey: "AIzaSyBvQvQvQvQvQvQvQvQvQvQvQvQvQvQvQvQ",
  authDomain: "rahapremiumtz.firebaseapp.com",
  projectId: "rahapremiumtz",
  storageBucket: "rahapremiumtz.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function addAdminToFirestore() {
  try {
    // Replace these with your actual values
    const adminData = {
      uid: 'YOUR_FIREBASE_USER_UID', // Get this from Firebase Console > Authentication > Users
      email: 'your-email@example.com',
      displayName: 'Your Name',
      role: 'admin',
      permissions: ['manage_content', 'manage_users', 'view_analytics', 'manage_subscriptions'],
      createdAt: Timestamp.now(),
      lastLoginAt: Timestamp.now(),
      isActive: true
    };

    // Add to admins collection using the Firebase Auth UID as document ID
    await setDoc(doc(db, 'admins', adminData.uid), adminData);

    console.log('✅ Admin user successfully added to Firestore!');
    console.log('Email:', adminData.email);
    console.log('UID:', adminData.uid);
    console.log('You can now login to the admin panel at /admin/login');

  } catch (error) {
    console.error('❌ Error adding admin user:', error);
  }
}

addAdminToFirestore();

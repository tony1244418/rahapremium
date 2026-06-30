const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, Timestamp } = require('firebase/firestore');

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

async function addAdminUser() {
  try {
    const adminUser = {
      uid: 'admin_rahapremium_001',
      email: 'admin@rahapremium.com',
      displayName: 'RahaPremium Administrator',
      role: 'admin',
      permissions: ['manage_content', 'manage_users', 'view_analytics', 'manage_subscriptions'],
      createdAt: Timestamp.now(),
      lastLoginAt: Timestamp.now(),
      isActive: true
    };

    // Add to admin_users collection
    const docRef = await addDoc(collection(db, 'admin_users'), adminUser);
    console.log('Admin user added with ID: ', docRef.id);

    console.log('✅ Admin user successfully added to Firebase!');
    console.log('Email: admin@rahapremium.com');
    console.log('You can now login to the admin panel.');

  } catch (error) {
    console.error('❌ Error adding admin user:', error);
  }
}

addAdminUser();

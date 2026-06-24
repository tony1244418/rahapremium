import { db, enableFirestoreNetwork } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  Timestamp,
  connectFirestoreEmulator,
  enableNetwork,
  disableNetwork
} from 'firebase/firestore';

export interface SetupResult {
  success: boolean;
  message: string;
  details?: string[];
}

// Sample admin user for testing
const sampleAdmin = {
  uid: 'admin_rahapremium_001',
  email: 'admin@rahapremium.com',
  displayName: 'RahaPremium Administrator',
  role: 'admin',
  permissions: ['manage_content', 'manage_users', 'view_analytics', 'manage_subscriptions'],
  createdAt: Timestamp.now(),
  lastLoginAt: Timestamp.now(),
  isActive: true
};

// Sample user for testing
const sampleUser = {
  uid: 'user_test_001',
  phoneNumber: '+255712345678',
  displayName: 'Test User',
  username: 'testuser',
  profilePhotoURL: null, // Changed from empty string to null for consistency
  subscription: null, // Changed from undefined to null
  createdAt: Timestamp.now(),
  lastLoginAt: Timestamp.now(),
  isBlocked: false,
  isAdult: false,
  subscriptionHistory: [],
  paymentHistory: []
};

// Sample content
const sampleMovie = {
  title: 'Kijana Mwalimu',
  description: 'Filamu ya kidrama kuhusu elimu Tanzania',
  googleDriveUrl: 'https://drive.google.com/file/d/sample/view?usp=sharing',
  thumbnailUrl: '/logo.png',
  duration: 135,
  releaseDate: Timestamp.now(),
  genre: ['Drama', 'Education'],
  language: 'sw',
  quality: ['HD', 'FHD'],
  requiredPackages: ['ALMASI', 'MALKIA'],
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
  views: 1250,
  isActive: true,
  isAdult: false,
  rating: 4.5,
  cast: ['Actor 1', 'Actor 2', 'Actor 3'],
  director: 'Director Name'
};

const sampleSeries = {
  title: 'Maisha ya Mjini',
  description: 'Mfululizo wa maisha ya kijiji na mjini',
  thumbnailUrl: '/logo.png',
  genre: ['Drama', 'Romance'],
  language: 'sw',
  totalSeasons: 2,
  requiredPackages: ['DHAHABU', 'ALMASI', 'MALKIA'],
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
  views: 3450,
  isActive: true,
  isAdult: false,
  rating: 4.8,
  cast: ['Lead Actor', 'Supporting Actor']
};

const sampleStory = {
  title: 'Simulizi za Mapenzi',
  content: 'Hapo zamani za kale, kulikuwa na kijana mzuri...',
  author: 'Mwandishi Maarufu',
  genre: ['Romance', 'Traditional'],
  language: 'sw',
  estimatedReadTime: 15,
  thumbnailUrl: '/logo.png',
  requiredPackages: ['CHUMA', 'DHAHABU', 'ALMASI', 'MALKIA'],
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
  views: 2100,
  isActive: true,
  isAdult: false,
  rating: 4.2
};

// Retry function with exponential backoff
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
  throw new Error('Max retries exceeded');
}

export async function setupFirestore(): Promise<SetupResult> {
  const details: string[] = [];
  
  try {
    // Ensure network is enabled
    try {
      await enableNetwork(db);
      details.push('Network connection enabled');
    } catch (error) {
      console.warn('Network already enabled or error:', error);
    }

    // Test connection first
    const isConnected = await checkFirestoreConnection();
    if (!isConnected) {
      return {
        success: false,
        message: 'Cannot connect to Firestore. Please check your internet connection and try again.',
        details: ['Connection test failed']
      };
    }
    details.push('Connection test passed');

    // Check if admin already exists with retry
    const adminDoc = await retryOperation(() => 
      getDoc(doc(db, 'admins', sampleAdmin.uid))
    );
    if (!adminDoc.exists()) {
      await retryOperation(() => 
        setDoc(doc(db, 'admins', sampleAdmin.uid), sampleAdmin)
      );
      details.push('Created sample admin user');
    } else {
      details.push('Admin user already exists');
    }

    // Check if test user already exists with retry
    const userDoc = await retryOperation(() => 
      getDoc(doc(db, 'users', sampleUser.uid))
    );
    if (!userDoc.exists()) {
      await retryOperation(() => 
        setDoc(doc(db, 'users', sampleUser.uid), sampleUser)
      );
      details.push('Created sample test user');
    } else {
      details.push('Test user already exists');
    }

    // Check if sample content exists with retry
    const moviesSnapshot = await retryOperation(() => 
      getDocs(collection(db, 'movies'))
    );
    if (moviesSnapshot.empty) {
      await retryOperation(() => 
        setDoc(doc(collection(db, 'movies')), sampleMovie)
      );
      details.push('Created sample movie');
    } else {
      details.push('Movies collection already has content');
    }

    const seriesSnapshot = await retryOperation(() => 
      getDocs(collection(db, 'series'))
    );
    if (seriesSnapshot.empty) {
      await retryOperation(() => 
        setDoc(doc(collection(db, 'series')), sampleSeries)
      );
      details.push('Created sample series');
    } else {
      details.push('Series collection already has content');
    }

    const storiesSnapshot = await retryOperation(() => 
      getDocs(collection(db, 'stories'))
    );
    if (storiesSnapshot.empty) {
      await retryOperation(() => 
        setDoc(doc(collection(db, 'stories')), sampleStory)
      );
      details.push('Created sample story');
    } else {
      details.push('Stories collection already has content');
    }

    return {
      success: true,
      message: 'Firestore setup completed successfully!',
      details
    };

  } catch (error: any) {
    console.error('Firestore setup error:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Unknown error occurred';
    if (error.code === 'unavailable') {
      errorMessage = 'Firestore service is temporarily unavailable. Please try again later.';
    } else if (error.code === 'permission-denied') {
      errorMessage = 'Permission denied. Please check your Firestore security rules.';
    } else if (error.code === 'failed-precondition') {
      errorMessage = 'Firestore is not properly configured. Please check your Firebase project settings.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return {
      success: false,
      message: `Firestore setup failed: ${errorMessage}`,
      details
    };
  }
}

export async function checkFirestoreConnection(): Promise<boolean> {
  try {
    // Ensure network is enabled first
    await enableNetwork(db);
    
    // Try to read from a collection to test connection with timeout
    const testPromise = getDoc(doc(db, 'test', 'connection'));
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout')), 10000)
    );
    
    await Promise.race([testPromise, timeoutPromise]);
    return true;
  } catch (error: any) {
    console.error('Firestore connection error:', error);
    
    // Try to re-enable network if it was disabled
    try {
      await enableNetwork(db);
    } catch (networkError) {
      console.warn('Failed to re-enable network:', networkError);
    }
    
    return false;
  }
}

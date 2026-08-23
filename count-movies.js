const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyAF4ppez6gkiZYNwBn-LMh97NeeYkZ6aQY",
  authDomain: "rahacrone.firebaseapp.com",
  projectId: "rahacrone",
  storageBucket: "rahacrone.firebasestorage.app",
  messagingSenderId: "197453554994",
  appId: "1:197453554994:web:8770581f174f90a2e4e32b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function countMovies() {
  try {
    console.log('\n📊 Counting Movies in Database...\n');

    // Count all movies
    const moviesRef = collection(db, 'movies');
    const allMoviesSnapshot = await getDocs(moviesRef);
    const totalMovies = allMoviesSnapshot.size;

    console.log(`🎬 Total Movies: ${totalMovies}`);

    // Count by type
    let regularMovies = 0;
    let adultMovies = 0;
    let zilizovujaMovies = 0;
    let ngonoMovies = 0;
    let moviesNgonoMovies = 0;
    let activeMovies = 0;
    let inactiveMovies = 0;

    allMoviesSnapshot.forEach(doc => {
      const movie = doc.data();
      
      // Count by active status
      if (movie.isActive) {
        activeMovies++;
      } else {
        inactiveMovies++;
      }

      // Count by type
      if (movie.isAdult) {
        adultMovies++;
        
        // Count by adult category
        if (movie.adultCategory === 'zilizovuja') {
          zilizovujaMovies++;
        } else if (movie.adultCategory === 'ngono') {
          ngonoMovies++;
        } else if (movie.adultCategory === 'movies-ngono') {
          moviesNgonoMovies++;
        }
      } else {
        regularMovies++;
      }
    });

    console.log('\n📦 By Type:');
    console.log(`   Regular Movies: ${regularMovies}`);
    console.log(`   Adult Movies: ${adultMovies}`);

    console.log('\n🔞 Adult Categories:');
    console.log(`   Zilizovuja: ${zilizovujaMovies}`);
    console.log(`   Ngono (Video Clips): ${ngonoMovies}`);
    console.log(`   Movies za Ngono: ${moviesNgonoMovies}`);

    console.log('\n✅ By Status:');
    console.log(`   Active: ${activeMovies}`);
    console.log(`   Inactive: ${inactiveMovies}`);

    // Count series
    const seriesRef = collection(db, 'series');
    const seriesSnapshot = await getDocs(seriesRef);
    const totalSeries = seriesSnapshot.size;

    console.log(`\n📺 Total Series: ${totalSeries}`);

    // Count episodes
    const episodesRef = collection(db, 'episodes');
    const episodesSnapshot = await getDocs(episodesRef);
    const totalEpisodes = episodesSnapshot.size;

    console.log(`📼 Total Episodes: ${totalEpisodes}`);

    // Count users
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    const totalUsers = usersSnapshot.size;

    console.log(`\n👥 Total Users: ${totalUsers}`);

    // Count payments
    const paymentsRef = collection(db, 'payments');
    const paymentsSnapshot = await getDocs(paymentsRef);
    const totalPayments = paymentsSnapshot.size;

    let completedPayments = 0;
    let pendingPayments = 0;
    let failedPayments = 0;

    paymentsSnapshot.forEach(doc => {
      const payment = doc.data();
      if (payment.status === 'completed') {
        completedPayments++;
      } else if (payment.status === 'pending') {
        pendingPayments++;
      } else if (payment.status === 'failed') {
        failedPayments++;
      }
    });

    console.log(`\n💰 Total Payments: ${totalPayments}`);
    console.log(`   Completed: ${completedPayments}`);
    console.log(`   Pending: ${pendingPayments}`);
    console.log(`   Failed: ${failedPayments}`);

    console.log('\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

countMovies();

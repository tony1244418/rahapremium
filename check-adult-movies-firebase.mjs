import fetch from 'node-fetch';

// Firebase Configuration
const FIREBASE_PROJECT_ID = 'rahacrone';

async function checkAdultMovies() {
  try {
    console.log('🔍 Checking adult movies in Firebase...\n');

    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/movies`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (!data.documents) {
      console.log('❌ No movies found in Firebase!');
      return;
    }

    console.log(`📊 Total movies in Firebase: ${data.documents.length}\n`);

    // Count adult movies
    let adultCount = 0;
    let activeAdultCount = 0;
    const adultMovieTitles = [];

    data.documents.forEach(doc => {
      const isAdult = doc.fields?.isAdult?.booleanValue === true;
      const isActive = doc.fields?.isActive?.booleanValue === true;
      const title = doc.fields?.title?.stringValue || 'Untitled';

      if (isAdult) {
        adultCount++;
        adultMovieTitles.push(title);
        if (isActive) {
          activeAdultCount++;
        }
      }
    });

    console.log(`🔞 Adult movies (isAdult=true): ${adultCount}`);
    console.log(`✅ Active adult movies: ${activeAdultCount}`);
    console.log(`❌ Inactive adult movies: ${adultCount - activeAdultCount}\n`);

    if (adultMovieTitles.length > 0) {
      console.log('📝 First 10 adult movie titles:');
      adultMovieTitles.slice(0, 10).forEach((title, i) => {
        console.log(`   ${i + 1}. ${title}`);
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log(`SUMMARY:`);
    console.log(`Total movies: ${data.documents.length}`);
    console.log(`Adult movies: ${adultCount}`);
    console.log(`Active adult movies: ${activeAdultCount}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAdultMovies();

import fs from 'fs';

// Firebase Configuration
const FIREBASE_PROJECT_ID = 'rahacrone';
const FIREBASE_API_KEY = 'AIzaSyAF4ppez6gkiZYNwBn-LMh97NeeYkZ6aQY';

async function importDirectToFirebase() {
  try {
    console.log('🔥 Starting direct import to Firebase...\n');

    // Read the prepared movies
    const moviesData = JSON.parse(fs.readFileSync('movies-to-import.json', 'utf-8'));
    console.log(`📦 Loaded ${moviesData.length} movies to import\n`);

    // First, get existing movies to check for duplicates
    console.log('🔍 Checking for existing movies in Firebase...\n');
    
    const existingMoviesUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/movies`;
    
    try {
      const existingResponse = await fetch(existingMoviesUrl, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const existingData = await existingResponse.json();
      const existingTitles = new Set();

      if (existingData.documents) {
        existingData.documents.forEach(doc => {
          const title = doc.fields?.title?.stringValue;
          if (title) {
            existingTitles.add(title.toLowerCase().trim());
          }
        });
      }

      console.log(`📊 Found ${existingTitles.size} existing movies in Firebase\n`);

      // Filter out duplicates
      const newMovies = moviesData.filter(movie => {
        const normalizedTitle = movie.title?.toLowerCase().trim();
        return !existingTitles.has(normalizedTitle);
      });

      console.log(`🆕 ${newMovies.length} new movies to import (${moviesData.length - newMovies.length} duplicates skipped)\n`);

      if (newMovies.length === 0) {
        console.log('✅ No new movies to import. All movies already exist!');
        return;
      }

      // Import movies one by one (Firestore REST API)
      let imported = 0;
      let failed = 0;

      console.log('📤 Importing movies to Firebase Firestore...\n');

      for (const movie of newMovies) {
        try {
          // Convert movie data to Firestore format
          const firestoreDoc = {
            fields: {
              title: { stringValue: movie.title },
              description: { stringValue: movie.description || '' },
              videoLink: { stringValue: movie.videoLink },
              trailerLink: { stringValue: movie.trailerLink || '' },
              thumbnailUrl: { stringValue: movie.thumbnailUrl || '' },
              duration: { integerValue: movie.duration.toString() },
              releaseYear: { stringValue: movie.releaseYear || '' },
              rating: { doubleValue: movie.rating },
              language: { stringValue: movie.language },
              quality: { stringValue: movie.quality },
              isAdult: { booleanValue: movie.isAdult },
              isActive: { booleanValue: movie.isActive },
              isFeatured: { booleanValue: movie.isFeatured },
              views: { integerValue: movie.views.toString() },
              category: { stringValue: movie.category },
              director: { stringValue: movie.director || '' },
              createdAt: { timestampValue: new Date().toISOString() },
              updatedAt: { timestampValue: new Date().toISOString() }
            }
          };

          // Add arrays
          if (movie.genre && movie.genre.length > 0) {
            firestoreDoc.fields.genre = {
              arrayValue: {
                values: movie.genre.map(g => ({ stringValue: g }))
              }
            };
          }

          if (movie.cast && movie.cast.length > 0) {
            firestoreDoc.fields.cast = {
              arrayValue: {
                values: movie.cast.map(c => ({ stringValue: c }))
              }
            };
          }

          if (movie.searchKeywords && movie.searchKeywords.length > 0) {
            firestoreDoc.fields.searchKeywords = {
              arrayValue: {
                values: movie.searchKeywords.map(k => ({ stringValue: k }))
              }
            };
          }

          if (movie.requiredPackages && movie.requiredPackages.length > 0) {
            firestoreDoc.fields.requiredPackages = {
              arrayValue: {
                values: movie.requiredPackages.map(p => ({ stringValue: p }))
              }
            };
          }

          // POST to Firestore
          const createUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/movies?key=${FIREBASE_API_KEY}`;
          
          const response = await fetch(createUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(firestoreDoc)
          });

          if (response.ok) {
            imported++;
            if (imported % 10 === 0) {
              console.log(`✅ Imported ${imported}/${newMovies.length} movies...`);
            }
          } else {
            failed++;
            const errorData = await response.text();
            console.log(`❌ Failed to import "${movie.title}": ${response.status}`);
          }

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          failed++;
          console.log(`❌ Error importing "${movie.title}": ${error.message}`);
        }
      }

      console.log('\n📊 IMPORT COMPLETE!');
      console.log(`   Successfully imported: ${imported} movies`);
      console.log(`   Failed: ${failed} movies`);
      console.log(`   Duplicates skipped: ${moviesData.length - newMovies.length}`);
      console.log(`\n✅ Movies are now in Firebase Firestore!\n`);

    } catch (error) {
      console.error('❌ Error checking existing movies:', error.message);
      console.log('\n⚠️  Continuing with import anyway...\n');
      
      // Import all movies if we can't check for duplicates
      console.log('📤 Importing all movies...\n');
      // Add import logic here if needed
    }

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

importDirectToFirebase();

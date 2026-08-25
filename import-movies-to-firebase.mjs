import admin from 'firebase-admin';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

// Initialize Firebase Admin
const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf-8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function importMoviesToFirebase() {
  try {
    console.log('📂 Reading movies from CSV file...\n');

    // Read CSV file
    const csvContent = fs.readFileSync('./movie/movies_rows.csv', 'utf-8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true
    });

    console.log(`✅ Found ${records.length} movies in CSV file\n`);

    // Fetch existing movies from Firebase
    console.log('🔍 Checking for existing movies in Firebase...\n');
    
    const existingSnapshot = await db.collection('movies').get();
    const existingTitles = new Set();
    
    existingSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.title) {
        existingTitles.add(data.title.toLowerCase().trim());
      }
    });

    console.log(`📊 Found ${existingTitles.size} existing movies in Firebase\n`);

    // Filter out duplicates
    const newMovies = [];
    const duplicates = [];

    records.forEach(movie => {
      const normalizedTitle = movie.title?.toLowerCase().trim();
      
      if (!normalizedTitle || !movie.video_url) {
        return; // Skip if no title or video URL
      }

      if (existingTitles.has(normalizedTitle)) {
        duplicates.push(movie.title);
      } else {
        newMovies.push(movie);
      }
    });

    console.log(`🆕 ${newMovies.length} new movies to import`);
    console.log(`⏭️  ${duplicates.length} duplicates skipped\n`);

    if (newMovies.length === 0) {
      console.log('✅ No new movies to import. All movies already exist in Firebase.');
      return;
    }

    // Import movies to Firebase
    console.log('📤 Importing movies to Firebase...\n');

    const batch = db.batch();
    let batchCount = 0;
    let imported = 0;
    let failed = 0;

    for (const movie of newMovies) {
      try {
        // Parse JSON fields
        let genre = [];
        let cast = [];
        let searchKeywords = [];
        let requiredPackages = [];

        try {
          if (movie.genre && movie.genre.startsWith('[')) {
            genre = JSON.parse(movie.genre);
          } else if (movie.genre) {
            genre = [movie.genre];
          }
        } catch (e) {
          genre = movie.genre ? [movie.genre] : [];
        }

        try {
          if (movie.cast_list && movie.cast_list.startsWith('[')) {
            cast = JSON.parse(movie.cast_list);
          } else if (movie.cast_list) {
            cast = [movie.cast_list];
          }
        } catch (e) {
          cast = movie.cast_list ? [movie.cast_list] : [];
        }

        try {
          if (movie.search_keywords && movie.search_keywords.startsWith('[')) {
            searchKeywords = JSON.parse(movie.search_keywords);
          }
        } catch (e) {
          searchKeywords = [];
        }

        try {
          if (movie.required_packages && movie.required_packages.startsWith('[')) {
            requiredPackages = JSON.parse(movie.required_packages);
          } else if (movie.required_packages && movie.required_packages.startsWith('"')) {
            requiredPackages = JSON.parse(movie.required_packages);
          }
        } catch (e) {
          requiredPackages = [];
        }

        // Create movie document
        const movieData = {
          title: movie.title || 'Untitled',
          description: movie.description || '',
          videoLink: movie.video_url || movie.video_link || '',
          trailerLink: movie.trailer_link || '',
          thumbnailUrl: movie.thumbnail_url || '',
          duration: parseInt(movie.duration) || 0,
          releaseYear: movie.release_date ? new Date(movie.release_date).getFullYear().toString() : movie.release_year || '',
          rating: parseFloat(movie.rating) || 0,
          genre: genre,
          language: movie.language || 'en',
          quality: movie.quality || 'HD',
          isAdult: movie.is_adult === 'true' || movie.is_adult === true || false,
          isActive: movie.is_active === 'true' || movie.is_active === true || true,
          isFeatured: movie.is_featured === 'true' || movie.is_featured === true || false,
          views: parseInt(movie.views) || 0,
          category: movie.category || 'Movie',
          cast: cast,
          director: movie.director || '',
          searchKeywords: searchKeywords,
          requiredPackages: requiredPackages,
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now()
        };

        // Add to batch
        const docRef = db.collection('movies').doc();
        batch.set(docRef, movieData);
        batchCount++;

        // Commit batch every 500 documents (Firestore limit)
        if (batchCount >= 500) {
          await batch.commit();
          imported += batchCount;
          console.log(`✅ Imported ${imported} movies...`);
          batchCount = 0;
        }

      } catch (error) {
        failed++;
        console.log(`❌ Failed to process movie "${movie.title}": ${error.message}`);
      }
    }

    // Commit remaining batch
    if (batchCount > 0) {
      await batch.commit();
      imported += batchCount;
      console.log(`✅ Imported ${imported} movies...`);
    }

    console.log('\n📊 IMPORT SUMMARY:');
    console.log(`   Total in CSV: ${records.length}`);
    console.log(`   Duplicates skipped: ${duplicates.length}`);
    console.log(`   Successfully imported: ${imported}`);
    console.log(`   Failed: ${failed}\n`);

    // Save lists
    if (imported > 0) {
      const importedList = newMovies.slice(0, imported).map((m, idx) => 
        `${idx + 1}. ${m.title} (${m.release_year || 'N/A'})`
      ).join('\n');
      fs.writeFileSync('imported-movies-firebase.txt', importedList, 'utf-8');
      console.log('✅ List of imported movies saved to: imported-movies-firebase.txt');
    }

    if (duplicates.length > 0) {
      const duplicatesList = duplicates.map((title, idx) => 
        `${idx + 1}. ${title}`
      ).join('\n');
      fs.writeFileSync('duplicate-movies-skipped.txt', duplicatesList, 'utf-8');
      console.log('✅ List of duplicates saved to: duplicate-movies-skipped.txt');
    }

    console.log('\n✨ Import complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

importMoviesToFirebase();

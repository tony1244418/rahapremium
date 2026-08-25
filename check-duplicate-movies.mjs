import { createClient } from '@supabase/supabase-js';
import admin from 'firebase-admin';
import fs from 'fs';

// Supabase credentials
const SUPABASE_URL = 'https://flikwildlkiktotpgqxx.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsaWt3aWxkbGtpa3RvdHBncXh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTI3MzI4NiwiZXhwIjoyMDk0ODQ5Mjg2fQ.I9DiInUiaAdomqEV2dFhmrq8-sxg8-5zyT0gMm5svjA';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Initialize Firebase Admin
const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf-8'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkDuplicates() {
  try {
    console.log('🔍 Checking for duplicate movies...\n');

    // Get all movies from Supabase
    const { data: supabaseMovies, error } = await supabase
      .from('movies')
      .select('*')
      .order('title', { ascending: true });

    if (error) throw error;

    console.log(`✅ Fetched ${supabaseMovies.length} movies from Supabase`);

    // Get all movies from Firebase
    const firebaseSnapshot = await db.collection('movies').get();
    const firebaseMovies = [];
    firebaseSnapshot.forEach(doc => {
      firebaseMovies.push({ id: doc.id, ...doc.data() });
    });

    console.log(`✅ Fetched ${firebaseMovies.length} movies from Firebase\n`);

    // Create a map of Firebase movie titles (normalized)
    const firebaseTitlesMap = new Map();
    firebaseMovies.forEach(movie => {
      const normalizedTitle = movie.title?.toLowerCase().trim() || '';
      if (normalizedTitle) {
        firebaseTitlesMap.set(normalizedTitle, movie);
      }
    });

    // Find duplicates and unique movies
    const duplicates = [];
    const uniqueMovies = [];

    supabaseMovies.forEach(movie => {
      const normalizedTitle = movie.title?.toLowerCase().trim() || '';
      
      if (firebaseTitlesMap.has(normalizedTitle)) {
        duplicates.push({
          supabaseMovie: movie,
          firebaseMovie: firebaseTitlesMap.get(normalizedTitle)
        });
      } else {
        uniqueMovies.push(movie);
      }
    });

    console.log('📊 RESULTS:');
    console.log(`   Supabase Movies: ${supabaseMovies.length}`);
    console.log(`   Firebase Movies: ${firebaseMovies.length}`);
    console.log(`   Duplicates Found: ${duplicates.length}`);
    console.log(`   Unique in Supabase: ${uniqueMovies.length}\n`);

    // Export unique movies (not in Firebase)
    if (uniqueMovies.length > 0) {
      const uniqueExport = uniqueMovies.map((movie, index) => ({
        index: index + 1,
        id: movie.id,
        title: movie.title,
        description: movie.description || '',
        thumbnailUrl: movie.thumbnail_url || '',
        videoLink: movie.video_link || '',
        trailerLink: movie.trailer_link || '',
        duration: movie.duration || 0,
        releaseYear: movie.release_year || '',
        rating: movie.rating || 0,
        genre: movie.genre || [],
        cast: movie.cast || [],
        director: movie.director || '',
        language: movie.language || '',
        subtitles: movie.subtitles || [],
        quality: movie.quality || 'HD',
        isAdult: movie.is_adult || false,
        isActive: movie.is_active || true,
        isFeatured: movie.is_featured || false,
        views: movie.views || 0,
        category: movie.category || 'Movie',
        searchKeywords: movie.search_keywords || []
      }));

      fs.writeFileSync('unique-movies-to-import.json', JSON.stringify(uniqueExport, null, 2), 'utf-8');
      console.log('✅ Unique movies saved to: unique-movies-to-import.json');

      // Save as text list
      const uniqueText = uniqueExport.map((movie, idx) => {
        return `${idx + 1}. ${movie.title} (${movie.releaseYear})
   Genre: ${movie.genre.join(', ')}
   Language: ${movie.language}
   Quality: ${movie.quality}
   Views: ${movie.views}`;
      }).join('\n\n');

      fs.writeFileSync('unique-movies-list.txt', uniqueText, 'utf-8');
      console.log('✅ Unique movies list saved to: unique-movies-list.txt\n');
    }

    // Export duplicates list
    if (duplicates.length > 0) {
      const duplicatesList = duplicates.map((dup, idx) => {
        return `${idx + 1}. ${dup.supabaseMovie.title}
   Supabase ID: ${dup.supabaseMovie.id}
   Firebase ID: ${dup.firebaseMovie.id}
   Supabase Views: ${dup.supabaseMovie.views || 0}
   Firebase Views: ${dup.firebaseMovie.views || 0}`;
      }).join('\n\n');

      fs.writeFileSync('duplicate-movies-list.txt', duplicatesList, 'utf-8');
      console.log('✅ Duplicates list saved to: duplicate-movies-list.txt\n');
    }

    console.log('✨ Done! Check the exported files for details.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

checkDuplicates();

import fs from 'fs';
import { parse } from 'csv-parse/sync';

// Supabase credentials
const SUPABASE_URL = 'https://flikwildlkiktotpgqxx.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsaWt3aWxkbGtpa3RvdHBncXh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTI3MzI4NiwiZXhwIjoyMDk0ODQ5Mjg2fQ.I9DiInUiaAdomqEV2dFhmrq8-sxg8-5zyT0gMm5svjA';

async function importMoviesFromCSV() {
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

    // Fetch existing movies from Supabase to check for duplicates
    console.log('🔍 Checking for existing movies in database...\n');
    
    const existingResponse = await fetch(`${SUPABASE_URL}/rest/v1/movies?select=title`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!existingResponse.ok) {
      throw new Error(`Failed to fetch existing movies: ${existingResponse.status}`);
    }

    const existingMovies = await existingResponse.json();
    const existingTitles = new Set(existingMovies.map(m => m.title?.toLowerCase().trim()));
    
    console.log(`📊 Found ${existingMovies.length} existing movies in database\n`);

    // Filter out duplicates
    const newMovies = records.filter(movie => {
      const normalizedTitle = movie.title?.toLowerCase().trim();
      return normalizedTitle && !existingTitles.has(normalizedTitle) && movie.video_url;
    });

    console.log(`🆕 ${newMovies.length} new movies to import (${records.length - newMovies.length} duplicates skipped)\n`);

    if (newMovies.length === 0) {
      console.log('✅ No new movies to import. All movies already exist in database.');
      return;
    }

    // Transform CSV data to Supabase format
    const moviesToImport = newMovies.map(movie => ({
      title: movie.title || 'Untitled',
      description: movie.description || '',
      video_link: movie.video_url || movie.video_link || '',
      trailer_link: movie.trailer_link || '',
      thumbnail_url: movie.thumbnail_url || '',
      duration: parseInt(movie.duration) || 0,
      release_year: movie.release_date ? new Date(movie.release_date).getFullYear().toString() : movie.release_year || '',
      rating: parseFloat(movie.rating) || 0,
      genre: Array.isArray(movie.genre) ? movie.genre : (movie.genre ? JSON.parse(movie.genre) : []),
      language: movie.language || 'en',
      quality: movie.quality || 'HD',
      is_adult: movie.is_adult === 'true' || movie.is_adult === true || false,
      is_active: movie.is_active === 'true' || movie.is_active === true || true,
      is_featured: movie.is_featured === 'true' || movie.is_featured === true || false,
      views: parseInt(movie.views) || 0,
      category: movie.category || 'Movie',
      cast: Array.isArray(movie.cast_list) ? movie.cast_list : (movie.cast_list ? JSON.parse(movie.cast_list) : []),
      director: movie.director || '',
      search_keywords: Array.isArray(movie.search_keywords) ? movie.search_keywords : (movie.search_keywords ? JSON.parse(movie.search_keywords) : []),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    console.log('📤 Importing movies to Supabase...\n');

    // Import in batches of 50
    const batchSize = 50;
    let imported = 0;
    let failed = 0;

    for (let i = 0; i < moviesToImport.length; i += batchSize) {
      const batch = moviesToImport.slice(i, i + batchSize);
      
      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/movies`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(batch)
        });

        if (response.ok) {
          imported += batch.length;
          console.log(`✅ Imported batch ${Math.floor(i / batchSize) + 1} (${batch.length} movies)`);
        } else {
          failed += batch.length;
          console.log(`❌ Failed to import batch ${Math.floor(i / batchSize) + 1}: ${response.status}`);
        }
      } catch (error) {
        failed += batch.length;
        console.log(`❌ Error importing batch: ${error.message}`);
      }
    }

    console.log('\n📊 IMPORT SUMMARY:');
    console.log(`   Total in CSV: ${records.length}`);
    console.log(`   Duplicates skipped: ${records.length - newMovies.length}`);
    console.log(`   Successfully imported: ${imported}`);
    console.log(`   Failed: ${failed}\n`);

    // Save list of imported movies
    const importedList = moviesToImport.slice(0, imported).map((m, idx) => 
      `${idx + 1}. ${m.title} (${m.release_year}) - ${m.genre.join(', ')}`
    ).join('\n');

    fs.writeFileSync('imported-movies-list.txt', importedList, 'utf-8');
    console.log('✅ List of imported movies saved to: imported-movies-list.txt\n');

    console.log('✨ Import complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

importMoviesFromCSV();

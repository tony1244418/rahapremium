import fs from 'fs';
import { parse } from 'csv-parse/sync';

// Read Firebase config from .env.local
const envContent = fs.readFileSync('.env.local', 'utf-8');
const config = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    config[key.trim()] = value.trim();
  }
});

async function importMoviesSimple() {
  try {
    console.log('📂 Reading movies from CSV...\n');

    const csvContent = fs.readFileSync('./movie/movies_rows.csv', 'utf-8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true
    });

    console.log(`✅ Found ${records.length} movies in CSV\n`);

    // Prepare JSON output
    const moviesForImport = [];
    const skippedMovies = [];

    records.forEach(movie => {
      if (!movie.title || !movie.video_url) {
        skippedMovies.push(`${movie.title || 'No title'} - Missing video URL`);
        return;
      }

      // Parse JSON fields safely
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
        genre = [];
      }

      try {
        if (movie.cast_list && movie.cast_list.startsWith('[')) {
          cast = JSON.parse(movie.cast_list);
        }
      } catch (e) {
        cast = [];
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

      const movieData = {
        title: movie.title,
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
        isAdult: movie.is_adult === 'true' || movie.is_adult === true,
        isActive: movie.is_active === 'true' || movie.is_active === true || movie.is_active !== 'false',
        isFeatured: movie.is_featured === 'true' || movie.is_featured === true,
        views: parseInt(movie.views) || 0,
        category: movie.category || 'Movie',
        cast: cast,
        director: movie.director || '',
        searchKeywords: searchKeywords,
        requiredPackages: requiredPackages,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      moviesForImport.push(movieData);
    });

    console.log(`✅ Prepared ${moviesForImport.length} movies for import\n`);

    // Save to JSON file for manual import
    fs.writeFileSync('movies-to-import.json', JSON.stringify(moviesForImport, null, 2), 'utf-8');
    console.log('✅ Movies exported to: movies-to-import.json');
    console.log(`   You can now import this file to Firebase manually\n`);

    // Create a text list
    const movieList = moviesForImport.map((m, idx) => {
      return `${idx + 1}. ${m.title} (${m.releaseYear})
   Genre: ${m.genre.join(', ')}
   Language: ${m.language}
   Views: ${m.views}
   Video: ${m.videoLink.substring(0, 50)}...`;
    }).join('\n\n');

    fs.writeFileSync('movies-list.txt', movieList, 'utf-8');
    console.log('✅ Movie list saved to: movies-list.txt\n');

    if (skippedMovies.length > 0) {
      fs.writeFileSync('skipped-movies.txt', skippedMovies.join('\n'), 'utf-8');
      console.log(`⚠️  ${skippedMovies.length} movies skipped (no video URL)\n`);
    }

    console.log('📊 SUMMARY:');
    console.log(`   Total movies: ${records.length}`);
    console.log(`   Ready to import: ${moviesForImport.length}`);
    console.log(`   Skipped: ${skippedMovies.length}\n`);

    console.log('✨ Export complete!');
    console.log('\n📝 NEXT STEPS:');
    console.log('   1. Open movies-to-import.json');
    console.log('   2. Go to Firebase Console > Firestore');
    console.log('   3. Import the JSON file or use the admin panel\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

importMoviesSimple();

import fs from 'fs';

// Supabase REST API call
const SUPABASE_URL = 'https://flikwildlkiktotpgqxx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsaWt3aWxkbGtpa3RvdHBncXh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNzMyODYsImV4cCI6MjA5NDg0OTI4Nn0.SPP4Wg91xHHcEfXIpBUvwKIvrmPv5CE2D_axMo4n3qI';

async function exportMovies() {
  try {
    console.log('🎬 Fetching all movies from Supabase...\n');

    const response = await fetch(`${SUPABASE_URL}/rest/v1/movies?select=*&order=created_at.desc`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const movies = await response.json();
    console.log(`✅ Found ${movies.length} movies in Supabase\n`);

    // Transform to clean JSON format
    const exportedMovies = movies.map((movie, index) => ({
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
      searchKeywords: movie.search_keywords || [],
      createdAt: movie.created_at,
      updatedAt: movie.updated_at
    }));

    // Save to JSON file
    fs.writeFileSync('supabase-movies-export.json', JSON.stringify(exportedMovies, null, 2), 'utf-8');
    console.log('✅ Movies exported to: supabase-movies-export.json');
    console.log(`📊 Total movies exported: ${exportedMovies.length}\n`);

    // Create text list
    const textList = exportedMovies.map((movie, idx) => {
      return `${idx + 1}. ${movie.title} (${movie.releaseYear})
   ID: ${movie.id}
   Genre: ${movie.genre.join(', ')}
   Language: ${movie.language}
   Quality: ${movie.quality}
   Views: ${movie.views}
   Active: ${movie.isActive ? 'Yes' : 'No'}
   Adult: ${movie.isAdult ? 'Yes' : 'No'}`;
    }).join('\n\n');

    fs.writeFileSync('supabase-movies-list.txt', textList, 'utf-8');
    console.log('✅ Movie list saved to: supabase-movies-list.txt\n');

    // Statistics
    console.log('📊 STATISTICS:');
    console.log(`   Total Movies: ${exportedMovies.length}`);
    console.log(`   Active: ${exportedMovies.filter(m => m.isActive).length}`);
    console.log(`   Adult Content: ${exportedMovies.filter(m => m.isAdult).length}`);
    console.log(`   Featured: ${exportedMovies.filter(m => m.isFeatured).length}`);
    console.log(`   Total Views: ${exportedMovies.reduce((sum, m) => sum + m.views, 0).toLocaleString()}`);

    const allGenres = new Set();
    exportedMovies.forEach(m => m.genre.forEach(g => allGenres.add(g)));
    console.log(`   Unique Genres: ${allGenres.size}`);

    const allLanguages = new Set(exportedMovies.map(m => m.language).filter(l => l));
    console.log(`   Languages: ${Array.from(allLanguages).join(', ')}\n`);

    console.log('✨ Export complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

exportMovies();

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Supabase credentials
const SUPABASE_URL = 'https://flikwildlkiktotpgqxx.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsaWt3aWxkbGtpa3RvdHBncXh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTI3MzI4NiwiZXhwIjoyMDk0ODQ5Mjg2fQ.I9DiInUiaAdomqEV2dFhmrq8-sxg8-5zyT0gMm5svjA';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function exportMoviesFromSupabase() {
  try {
    console.log('🎬 Fetching all movies from Supabase...\n');

    // Fetch all movies from Supabase
    const { data: movies, error } = await supabase
      .from('movies')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    console.log(`✅ Found ${movies.length} movies in Supabase\n`);

    // Transform movies to clean JSON format
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
    const jsonContent = JSON.stringify(exportedMovies, null, 2);
    fs.writeFileSync('supabase-movies-export.json', jsonContent, 'utf-8');

    console.log('✅ Movies exported to: supabase-movies-export.json');
    console.log(`📊 Total movies exported: ${exportedMovies.length}\n`);

    // Create a summary text file
    const summaryText = exportedMovies.map((movie, idx) => {
      return `${idx + 1}. ${movie.title} (${movie.releaseYear}) - ${movie.genre.join(', ')}
   ID: ${movie.id}
   Views: ${movie.views}
   Active: ${movie.isActive ? 'Yes' : 'No'}
   Adult: ${movie.isAdult ? 'Yes' : 'No'}
   ---`;
    }).join('\n\n');

    fs.writeFileSync('supabase-movies-list.txt', summaryText, 'utf-8');
    console.log('✅ Movie list exported to: supabase-movies-list.txt\n');

    // Create CSV for easy viewing
    const csvHeader = 'Index,ID,Title,Year,Genre,Views,Active,Adult,Language,Quality\n';
    const csvContent = exportedMovies.map((movie, idx) => {
      return `${idx + 1},"${movie.id}","${movie.title}","${movie.releaseYear}","${movie.genre.join('; ')}",${movie.views},${movie.isActive},${movie.isAdult},"${movie.language}","${movie.quality}"`;
    }).join('\n');

    fs.writeFileSync('supabase-movies-export.csv', csvHeader + csvContent, 'utf-8');
    console.log('✅ Movies exported to CSV: supabase-movies-export.csv\n');

    // Statistics
    console.log('📊 STATISTICS:');
    console.log(`   Total Movies: ${exportedMovies.length}`);
    console.log(`   Active: ${exportedMovies.filter(m => m.isActive).length}`);
    console.log(`   Adult Content: ${exportedMovies.filter(m => m.isAdult).length}`);
    console.log(`   Featured: ${exportedMovies.filter(m => m.isFeatured).length}`);
    console.log(`   Total Views: ${exportedMovies.reduce((sum, m) => sum + m.views, 0)}`);

    // Get unique genres
    const allGenres = new Set();
    exportedMovies.forEach(m => m.genre.forEach(g => allGenres.add(g)));
    console.log(`   Genres: ${allGenres.size} (${Array.from(allGenres).join(', ')})`);

    // Get unique languages
    const allLanguages = new Set(exportedMovies.map(m => m.language).filter(l => l));
    console.log(`   Languages: ${allLanguages.size} (${Array.from(allLanguages).join(', ')})`);

  } catch (error) {
    console.error('❌ Error exporting movies:', error.message);
    process.exit(1);
  }
}

// Run the export
exportMoviesFromSupabase();

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
const keyMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/);

const supabaseUrl = urlMatch[1].trim();
const supabaseAnonKey = keyMatch[1].trim();

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { data, error } = await supabase
    .from('series')
    .select(`
      *,
      seasons:seasons (
        *,
        episodes:episodes (*)
      )
    `)
    .eq('is_active', true)
    .eq('is_adult', false)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
    console.error('Error Details:', error.details);
    console.error('Error Hint:', error.hint);
    console.error('Raw Error:', error);
  } else {
    console.log('Success, found:', data.length);
  }
}

test();

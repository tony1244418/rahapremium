const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jkvhhbcuhycqtgywjins.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImprdmhoYmN1aHljcXRneXdqaW5zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Nzc1MzIxNiwiZXhwIjoyMDkzMzI5MjE2fQ.Z_lkBVDPmVxfEGtN1OA2VyRKoiRe4D3KTj7CCqFk7JQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJleHAiOjE3Nzg0MDEzMzUsInNpcCI6IjEzMC4xNzYuMTg2LjEyNCJ9.-yPlotuGNgWqG44oD8FguJNwMc2sag0Uv-W9U4Hlp-IUrjVOnp3oCAaajL9whXMkeVtDvltKgg5UwWLKoT-F5A';
  
  console.log('Updating global CDN token in admin_settings...');
  const { error: settingsError } = await supabase
    .from('admin_settings')
    .upsert({ 
      id: 'cdn_token', 
      data: { token },
      updated_at: new Date().toISOString(),
      updated_by: 'script'
    });
    
  if (settingsError) {
    console.error('Error updating settings:', settingsError);
  } else {
    console.log('Successfully updated global CDN token.');
  }
}

main();

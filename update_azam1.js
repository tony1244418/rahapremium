const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jkvhhbcuhycqtgywjins.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImprdmhoYmN1aHljcXRneXdqaW5zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Nzc1MzIxNiwiZXhwIjoyMDkzMzI5MjE2fQ.Z_lkBVDPmVxfEGtN1OA2VyRKoiRe4D3KTj7CCqFk7JQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJleHAiOjE3Nzg0MDEzMzUsInNpcCI6IjEzMC4xNzYuMTg2LjEyNCJ9.-yPlotuGNgWqG44oD8FguJNwMc2sag0Uv-W9U4Hlp-IUrjVOnp3oCAaajL9whXMkeVtDvltKgg5UwWLKoT-F5A';
  const kid = 'c31df1600afc33799ecac543331803f2';
  const key = 'dd2101530e222f545997d4c553787f85';
  
  console.log('1. Updating global CDN token in admin_settings...');
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
  
  console.log('\n2. Fetching live channels to find Azam Sport 1...');
  const { data: channels, error: channelsError } = await supabase
    .from('live_channels')
    .select('*');
    
  if (channelsError) {
    console.error('Error fetching channels:', channelsError);
    return;
  }
  
  // Find AzamSport1 or similar
  const azam1Channels = channels.filter(c => 
    c.name.toLowerCase().includes('azam sport 1') || 
    c.name.toLowerCase() === 'azam sport 1' ||
    (c.stream_url && c.stream_url.toLowerCase().includes('azamsport1'))
  );
  
  console.log(`Found ${azam1Channels.length} Azam Sport 1 channels.`);
  
  for (const channel of azam1Channels) {
    console.log(`Updating channel: ${channel.name} (ID: ${channel.id})`);
    
    // We update the clear_keys object with the new kid and key
    const newClearKeys = { [kid]: key };
    
    const { error: updateError } = await supabase
      .from('live_channels')
      .update({
        clear_keys: newClearKeys,
        encryption_type: 'clearkey',
        stream_format: 'dash',
        updated_at: new Date().toISOString()
      })
      .eq('id', channel.id);
      
    if (updateError) {
      console.error(`Failed to update ${channel.name}:`, updateError);
    } else {
      console.log(`Successfully updated ${channel.name}.`);
    }
  }
  
  console.log('\nFinished updating.');
}

main();

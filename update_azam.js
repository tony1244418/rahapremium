const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jkvhhbcuhycqtgywjins.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImprdmhoYmN1aHljcXRneXdqaW5zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Nzc1MzIxNiwiZXhwIjoyMDkzMzI5MjE2fQ.Z_lkBVDPmVxfEGtN1OA2VyRKoiRe4D3KTj7CCqFk7JQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJleHAiOjE3NzgzOTg5MzgsInNpcCI6IjEzMC4xNzYuMTg2LjEyNCJ9.jFNNEDp0iovkNf3VXWZ6viDOLo_mu_vwANb-K9y_LinTFY_Te0_Rw4ysJb0IZQe5hIMPX9x9RPNuEO0xaL1v1A';
  const kid = '739e7499125b31cc9948da8057b84cf9';
  const key = '1b7d44d798c351acc02f33ddfbb7682a';
  
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
  
  console.log('\n2. Fetching live channels to find AzamSport2...');
  const { data: channels, error: channelsError } = await supabase
    .from('live_channels')
    .select('*');
    
  if (channelsError) {
    console.error('Error fetching channels:', channelsError);
    return;
  }
  
  // Find AzamSport2 or similar
  const azamChannels = channels.filter(c => 
    c.name.toLowerCase().includes('azam') || 
    (c.stream_url && c.stream_url.includes('azam'))
  );
  
  console.log(`Found ${azamChannels.length} Azam channels.`);
  
  for (const channel of azamChannels) {
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

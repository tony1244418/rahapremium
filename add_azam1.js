const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jkvhhbcuhycqtgywjins.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImprdmhoYmN1aHljcXRneXdqaW5zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Nzc1MzIxNiwiZXhwIjoyMDkzMzI5MjE2fQ.Z_lkBVDPmVxfEGtN1OA2VyRKoiRe4D3KTj7CCqFk7JQ';
const supabase = createClient(supabaseUrl, supabaseKey);

function generateId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 20; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

async function main() {
  console.log('Inserting Azam Sport 1 HD into live_channels...');
  
  const newChannel = {
    id: generateId(),
    name: "Azam Sport 1 HD",
    description: "Azam Sport 1 HD Live Stream",
    stream_url: "https://cdnblncr.azamtvltd.co.tz/live/eds/AzamSport1/DASH/AzamSport1.mpd",
    stream_format: "dash",
    thumbnail_url: "",
    category: ["sport"],
    language: "sw",
    required_packages: ["FEDHA"],
    is_active: true,
    is_maintenance: false,
    is_adult: false,
    viewer_count: 0,
    total_views: 0,
    display_order: 1000,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    search_keywords: ["azam", "sport", "1"],
    encryption_type: "clearkey",
    clear_keys: {
      "c31df1600afc33799ecac543331803f2": "dd2101530e222f545997d4c553787f85"
    },
    content_purchase_enabled: false,
    sort_order: 0
  };

  const { data, error } = await supabase
    .from('live_channels')
    .insert([newChannel])
    .select();
    
  if (error) {
    console.error('Error inserting channel:', error);
  } else {
    console.log('Successfully added Azam Sport 1 HD!');
    console.log(data);
  }
}

main();

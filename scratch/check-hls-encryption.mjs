

(async () => {
  try {
    const res = await fetch('https://v0-token-refresh-dashboard.vercel.app/api/token', {method: 'POST'});
    const data = await res.json();
    const token = data.token;
    
    const url = 'https://cdnblncr.azamtvltd.co.tz/live/eds/WasafiTV/HLS/WasafiTV.m3u8?cdntoken=' + token;
    const mRes = await fetch(url);
    const mText = await mRes.text();
    
    const lines = mText.split('\n');
    const variantLine = lines.find(l => l.includes('.m3u8') && !l.includes('TYPE=AUDIO'));
    
    if (variantLine) {
      const vPath = variantLine.split(',')[0].trim().replace(/"/g, '');
      const variantUrl = 'https://cdnblncr.azamtvltd.co.tz/live/eds/WasafiTV/HLS/' + vPath + (vPath.includes('?') ? '&' : '?') + 'cdntoken=' + token;
      console.log('Fetching Variant:', variantUrl);
      
      const vRes = await fetch(variantUrl);
      const vText = await vRes.text();
      console.log('Variant Playlist:\n', vText.substring(0, 500));
    } else {
      console.log('No variant found');
    }
  } catch (e) {
    console.error(e);
  }
})();

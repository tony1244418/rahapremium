import fs from 'fs';

const projectId = 'rahacrone';

function parseCSV(text) {
  const lines = [];
  let row = [''];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i+1];

    if (c === '"') {
      if (inQuotes && next === '"') {
        row[row.length - 1] += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push('');
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') i++;
      lines.push(row);
      row = [''];
    } else {
      row[row.length - 1] += c;
    }
  }
  if (row.length > 1 || row[0] !== '') lines.push(row);
  return lines;
}

function toFirestoreFields(obj) {
  const fields = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined || val === null) {
      fields[key] = { nullValue: null };
    } else if (typeof val === 'string') {
      fields[key] = { stringValue: val };
    } else if (typeof val === 'boolean') {
      fields[key] = { booleanValue: val };
    } else if (typeof val === 'number') {
      if (Number.isInteger(val)) {
        fields[key] = { integerValue: val.toString() };
      } else {
        fields[key] = { doubleValue: val };
      }
    } else if (Array.isArray(val)) {
      fields[key] = {
        arrayValue: {
          values: val.map(v => typeof v === 'string' ? { stringValue: v } : { stringValue: String(v) })
        }
      };
    } else if (val instanceof Date) {
      fields[key] = { timestampValue: val.toISOString() };
    }
  }
  return fields;
}

async function writeDoc(collection, id, data) {
  const url = 'https://firestore.googleapis.com/v1/projects/' + projectId + '/databases/(default)/documents/' + collection + '/' + encodeURIComponent(id);
  const fields = toFirestoreFields(data);
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields })
  });
  if (!res.ok) {
    console.error('Error writing ' + id + ':', await res.text());
  }
  return res.ok;
}

async function seedAll() {
  console.log('--- SEEDING CLEAN MOVIES ---');
  const moviesCsv = fs.readFileSync('movies_rows (1).csv', 'utf-8');
  const rows = parseCSV(moviesCsv);
  console.log('Total movies in CSV:', rows.length - 1);

  const movies = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[1] || !r[1].trim()) continue;

    const id = r[0] || 'm_' + i;
    const title = r[1].trim();
    const description = r[2] || '';
    const videoUrl = r[3] || '';
    const thumbnailUrl = r[6] || '';
    const releaseDate = r[8] || '2024-01-01';
    let genre = [];
    try {
      if (r[9]) {
        if (r[9].startsWith('[')) genre = JSON.parse(r[9]);
        else genre = [r[9]];
      }
    } catch {
      genre = ['Swahili'];
    }
    if (!genre.length) genre = ['Swahili'];

    const language = r[10] || 'sw';
    const views = parseInt(r[15], 10) || 0;
    const isAdult = r[17] === 'true';
    const adultCategory = r[18] || (isAdult ? 'movies-ngono' : null);
    const rating = parseFloat(r[19]) || 4.8;
    const nowIso = new Date().toISOString();

    const movieDoc = {
      id,
      title,
      description,
      video_url: videoUrl,
      videoLink: videoUrl,
      thumbnail_url: thumbnailUrl,
      thumbnailUrl: thumbnailUrl,
      genre,
      language,
      views,
      is_active: true,
      isActive: true,
      is_adult: isAdult,
      isAdult: isAdult,
      adult_category: adultCategory,
      adultCategory: adultCategory,
      rating,
      created_at: nowIso,
      createdAt: nowIso,
      updated_at: nowIso,
      updatedAt: nowIso,
      release_date: releaseDate,
      releaseDate: releaseDate,
      required_packages: ['FREE', 'BASIC', 'PREMIUM', 'VIP'],
      requiredPackages: ['FREE', 'BASIC', 'PREMIUM', 'VIP']
    };

    movies.push(movieDoc);
  }

  console.log('Writing ' + movies.length + ' movies in batches of 40...');
  let count = 0;
  for (let i = 0; i < movies.length; i += 40) {
    const chunk = movies.slice(i, i + 40);
    await Promise.all(chunk.map(m => writeDoc('movies', m.id, m)));
    count += chunk.length;
    process.stdout.write('Seeded ' + count + '/' + movies.length + ' movies\r');
  }
  console.log('\n✅ All ' + count + ' movies seeded successfully!');

  // Seed Series
  console.log('\n--- SEEDING SERIES ---');
  const seriesCsv = fs.readFileSync('series_rows.csv', 'utf-8');
  const sRows = parseCSV(seriesCsv);

  const seriesList = [];
  for (let i = 1; i < sRows.length; i++) {
    const r = sRows[i];
    if (!r[1] || !r[1].trim()) continue;

    const id = r[0] || 's_' + i;
    const title = r[1].trim();
    const description = r[2] || '';
    const thumbnailUrl = r[3] || '';
    let genre = [];
    try {
      if (r[4]) {
        if (r[4].startsWith('[')) genre = JSON.parse(r[4]);
        else genre = [r[4]];
      }
    } catch {
      genre = ['Adult'];
    }
    const isAdult = r[12] === 'true';
    const adultCategory = r[13] || (isAdult ? 'movies-ngono' : null);
    const nowIso = new Date().toISOString();

    const seriesDoc = {
      id,
      title,
      description,
      thumbnail_url: thumbnailUrl,
      thumbnailUrl: thumbnailUrl,
      genre,
      language: r[5] || 'sw',
      total_seasons: 1,
      totalSeasons: 1,
      views: 0,
      is_active: true,
      isActive: true,
      is_adult: isAdult,
      isAdult: isAdult,
      adult_category: adultCategory,
      adultCategory: adultCategory,
      rating: 4.9,
      created_at: nowIso,
      createdAt: nowIso,
      updated_at: nowIso,
      updatedAt: nowIso,
      required_packages: ['FREE', 'BASIC', 'PREMIUM', 'VIP'],
      requiredPackages: ['FREE', 'BASIC', 'PREMIUM', 'VIP']
    };

    seriesList.push(seriesDoc);
  }

  for (const s of seriesList) {
    await writeDoc('series', s.id, s);
    console.log('✅ Seeded series: ' + s.title);
  }

  // Seed episodes for each adult series
  const seriesEpData = [
    {
      seriesId: 'ch_series_10',
      title: '365 Days',
      episodes: [
        { ep: 1, title: 'Episode 1 - The Encounter', videoUrl: 'https://iframe.mediadelivery.net/play/155292/7320395d-3702-4ba3-907e-c9cd07741956' },
        { ep: 2, title: 'Episode 2 - 365 Days Later', videoUrl: 'https://iframe.mediadelivery.net/play/155292/23aaa049-52d5-4fa7-afd0-ef8a3051b400' },
        { ep: 3, title: 'Episode 3 - Final Days', videoUrl: 'https://iframe.mediadelivery.net/play/155292/ba65a501-b1da-4dca-acad-5202a798c971' },
      ]
    },
    {
      seriesId: 'ch_series_5',
      title: 'Happy',
      episodes: [
        { ep: 1, title: 'Episode 1 - College Life', videoUrl: 'https://iframe.mediadelivery.net/play/155292/c296f5bb-c5ec-47bb-9941-0550f422d3fa' },
        { ep: 2, title: 'Episode 2 - The Client', videoUrl: 'https://iframe.mediadelivery.net/play/155292/0b964677-03cb-4808-8b3f-ca790e358a2f' },
        { ep: 3, title: 'Episode 3 - Secrets Exposed', videoUrl: 'https://iframe.mediadelivery.net/play/155292/547b860f-d332-4245-9586-847acc5e28ef' },
      ]
    },
    {
      seriesId: 'ch_series_6',
      title: 'White Girls',
      episodes: [
        { ep: 1, title: 'Episode 1 - Problems in Paradise', videoUrl: 'https://iframe.mediadelivery.net/play/155292/c010fee3-8726-4c24-a035-c1637966b6e1' },
        { ep: 2, title: 'Episode 2 - Wild Nights', videoUrl: 'https://iframe.mediadelivery.net/play/155292/3263271a-44b2-44dd-b2c0-6de64d2eebe3' },
      ]
    },
    {
      seriesId: 'ch_series_7',
      title: 'Private Resort',
      episodes: [
        { ep: 1, title: 'Episode 1 - Beach Fun', videoUrl: 'https://iframe.mediadelivery.net/play/155292/d601d255-1695-4af0-8ab9-921d52571e96' },
        { ep: 2, title: 'Episode 2 - The Party', videoUrl: 'https://iframe.mediadelivery.net/play/155292/ba65a501-b1da-4dca-acad-5202a798c971' },
      ]
    },
    {
      seriesId: 'ch_series_8',
      title: 'Graphic Sex',
      episodes: [
        { ep: 1, title: 'Episode 1 - Forbidden Desire', videoUrl: 'https://iframe.mediadelivery.net/play/155292/7320395d-3702-4ba3-907e-c9cd07741956' },
        { ep: 2, title: 'Episode 2 - Passion Unlimited', videoUrl: 'https://iframe.mediadelivery.net/play/155292/23aaa049-52d5-4fa7-afd0-ef8a3051b400' },
      ]
    },
    {
      seriesId: 'ch_series_9',
      title: 'Illicit Desire',
      episodes: [
        { ep: 1, title: 'Episode 1 - The Office Affair', videoUrl: 'https://iframe.mediadelivery.net/play/155292/c296f5bb-c5ec-47bb-9941-0550f422d3fa' },
        { ep: 2, title: 'Episode 2 - Point of No Return', videoUrl: 'https://iframe.mediadelivery.net/play/155292/0b964677-03cb-4808-8b3f-ca790e358a2f' },
      ]
    },
  ];

  console.log('\n--- SEEDING EPISODES ---');
  for (const s of seriesEpData) {
    for (const ep of s.episodes) {
      const epId = s.seriesId + '_ep_' + ep.ep;
      const epDoc = {
        id: epId,
        series_id: s.seriesId,
        seriesId: s.seriesId,
        season_number: 1,
        seasonNumber: 1,
        episode_number: ep.ep,
        episodeNumber: ep.ep,
        title: ep.title,
        video_url: ep.videoUrl,
        videoLink: ep.videoUrl,
        is_active: true,
        isActive: true,
        created_at: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      await writeDoc('episodes', epId, epDoc);
      console.log('  Episode seeded: ' + ep.title);
    }
  }

  console.log('\n=======================================');
  console.log('🎉 ALL CONTENT SEEDED CLEANLY & FRESH!');
  console.log('=======================================');
}

seedAll().catch(console.error);

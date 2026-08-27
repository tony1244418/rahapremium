/**
 * ============================================================================
 * RAHA PREMIUM — Seed Movies, Series & Short Clips to Firebase Firestore
 * ============================================================================
 * 
 * Usage:  node scripts/seed-to-firebase.mjs
 * 
 * Reads:
 *   - movies_rows (1).csv   →  movies collection
 *   - series_rows.csv       →  series collection
 * 
 * Target Firebase project:  rahacrone
 * Uses Firestore REST API (no service account key needed).
 * Skips duplicates by checking existing document IDs and titles.
 * ============================================================================
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// ─── Firebase Config ──────────────────────────────────────────────────────────
const FIREBASE_PROJECT_ID = 'rahacrone';
const FIREBASE_API_KEY = 'AIzaSyAF4ppez6gkiZYNwBn-LMh97NeeYkZ6aQY';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Simple CSV parser that handles quoted fields with commas and newlines */
function parseCSV(content) {
  const rows = [];
  let headers = null;
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < content.length) {
    const ch = content[i];

    if (inQuotes) {
      if (ch === '"') {
        // Check for escaped quote ""
        if (i + 1 < content.length && content[i + 1] === '"') {
          currentField += '"';
          i += 2;
          continue;
        }
        // End of quoted field
        inQuotes = false;
        i++;
        continue;
      }
      currentField += ch;
      i++;
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
        i++;
      } else if (ch === '\r') {
        // skip \r
        i++;
      } else if (ch === '\n') {
        currentRow.push(currentField.trim());
        currentField = '';

        if (!headers) {
          headers = currentRow;
        } else if (currentRow.some(f => f !== '')) {
          const obj = {};
          headers.forEach((h, idx) => {
            obj[h] = currentRow[idx] || '';
          });
          rows.push(obj);
        }
        currentRow = [];
        i++;
      } else {
        currentField += ch;
        i++;
      }
    }
  }

  // Handle last row (no trailing newline)
  if (currentRow.length > 0 || currentField) {
    currentRow.push(currentField.trim());
    if (headers && currentRow.some(f => f !== '')) {
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = currentRow[idx] || '';
      });
      rows.push(obj);
    }
  }

  return rows;
}

/** Parse a JSON array string like ["Drama","Action"] or [""Drama"",""Action""] */
function parseArrayField(val) {
  if (!val || val === '[]' || val === '') return [];
  
  // Handle the CSV-escaped format: [""Drama"",""Action""]
  let cleaned = val;
  if (cleaned.startsWith('[') && cleaned.endsWith(']')) {
    // Replace "" with " for proper JSON
    cleaned = cleaned.replace(/""/g, '"');
    // Now it might be like ["Drama","Action"] — but with extra quotes
    // Try parsing directly
    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) return parsed.filter(x => x);
    } catch (e) {
      // Try manual extraction
    }
  }

  // Manual extraction: pull out strings between quotes
  const matches = val.match(/"([^"]+)"/g);
  if (matches) {
    return matches.map(m => m.replace(/"/g, '')).filter(x => x);
  }

  // Single value
  if (val && !val.startsWith('[')) {
    return [val];
  }

  return [];
}

/** Convert Firestore REST value format */
function toFirestoreValue(val, type = 'auto') {
  if (val === null || val === undefined || val === '') {
    return { nullValue: null };
  }

  if (type === 'string' || (type === 'auto' && typeof val === 'string')) {
    return { stringValue: String(val) };
  }
  if (type === 'integer' || (type === 'auto' && typeof val === 'number' && Number.isInteger(val))) {
    return { integerValue: String(Math.round(val)) };
  }
  if (type === 'double' || (type === 'auto' && typeof val === 'number')) {
    return { doubleValue: val };
  }
  if (type === 'boolean' || (type === 'auto' && typeof val === 'boolean')) {
    return { booleanValue: val };
  }
  if (type === 'timestamp') {
    return { timestampValue: new Date(val).toISOString() };
  }
  if (type === 'array' && Array.isArray(val)) {
    if (val.length === 0) {
      return { arrayValue: { values: [] } };
    }
    return {
      arrayValue: {
        values: val.map(v => ({ stringValue: String(v) }))
      }
    };
  }

  return { stringValue: String(val) };
}

/** Parse boolean from CSV */
function parseBool(val) {
  if (val === true || val === 'true' || val === 'TRUE') return true;
  if (val === false || val === 'false' || val === 'FALSE') return false;
  return null;
}

/** Parse int from CSV */
function parseInt2(val) {
  if (val === '' || val === null || val === undefined) return null;
  const n = parseInt(val, 10);
  return isNaN(n) ? null : n;
}

/** Parse float from CSV */
function parseFloat2(val) {
  if (val === '' || val === null || val === undefined) return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

// ─── Fetch existing documents from a collection ───────────────────────────────

async function fetchExistingDocs(collectionName) {
  const existingIds = new Set();
  const existingTitles = new Set();
  let pageToken = null;
  let page = 0;

  console.log(`   🔍 Fetching existing ${collectionName} from Firebase...`);

  while (true) {
    let url = `${FIRESTORE_BASE}/${collectionName}?pageSize=300`;
    if (pageToken) url += `&pageToken=${pageToken}`;

    try {
      const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errText = await response.text();
        console.log(`   ⚠️  Could not fetch existing ${collectionName}: ${response.status} — will import all`);
        return { existingIds, existingTitles };
      }

      const data = await response.json();

      if (data.documents) {
        for (const doc of data.documents) {
          // Extract ID from the document name (last segment of path)
          const docName = doc.name.split('/').pop();
          existingIds.add(docName);

          // Also track titles for duplicate detection
          const title = doc.fields?.title?.stringValue;
          if (title) {
            existingTitles.add(title.toLowerCase().trim());
          }
        }
      }

      pageToken = data.nextPageToken;
      page++;
      if (!pageToken) break;
    } catch (err) {
      console.log(`   ⚠️  Error fetching page ${page} of ${collectionName}: ${err.message}`);
      break;
    }
  }

  console.log(`   📊 Found ${existingIds.size} existing documents in ${collectionName}`);
  return { existingIds, existingTitles };
}

// ─── Create a Firestore document via REST API ─────────────────────────────────

async function createDocument(collectionName, docId, fields) {
  const url = `${FIRESTORE_BASE}/${collectionName}/${docId}?key=${FIREBASE_API_KEY}`;

  const firestoreDoc = { fields };

  const response = await fetch(url, {
    method: 'PATCH', // PATCH creates or replaces the doc at the specified ID
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(firestoreDoc)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errText}`);
  }

  return await response.json();
}

// ─── Convert a movie CSV row to Firestore fields ──────────────────────────────

function movieRowToFirestoreFields(row) {
  const genre = parseArrayField(row.genre);
  const quality = parseArrayField(row.quality);
  const requiredPackages = parseArrayField(row.required_packages);
  const castList = parseArrayField(row.cast_list);
  const searchKeywords = parseArrayField(row.search_keywords);
  const contentPurchasePackages = parseArrayField(row.content_purchase_packages);

  const isActive = parseBool(row.is_active);
  const isAdult = parseBool(row.is_adult);
  const contentPurchaseEnabled = parseBool(row.content_purchase_enabled);

  const fields = {};

  // Required string fields
  fields.title = toFirestoreValue(row.title || 'Untitled', 'string');
  fields.description = toFirestoreValue(row.description || '', 'string');
  fields.video_url = toFirestoreValue(row.video_url || '', 'string');
  fields.download_url = toFirestoreValue(row.download_url || '', 'string');
  fields.google_drive_url = toFirestoreValue(row.google_drive_url || '', 'string');
  fields.thumbnail_url = toFirestoreValue(row.thumbnail_url || '', 'string');
  fields.language = toFirestoreValue(row.language || 'en', 'string');
  fields.director = toFirestoreValue(row.director || '', 'string');
  fields.video_embed_code = toFirestoreValue(row.video_embed_code || '', 'string');

  // Adult category
  if (row.adult_category && row.adult_category !== '') {
    fields.adult_category = toFirestoreValue(row.adult_category, 'string');
  } else {
    fields.adult_category = { nullValue: null };
  }

  // Integer fields
  const duration = parseInt2(row.duration);
  fields.duration = duration !== null ? toFirestoreValue(duration, 'integer') : { nullValue: null };

  const views = parseInt2(row.views);
  fields.views = toFirestoreValue(views !== null ? views : 0, 'integer');

  const contentPriceDays = parseInt2(row.content_price_days);
  fields.content_price_days = contentPriceDays !== null ? toFirestoreValue(contentPriceDays, 'integer') : { nullValue: null };

  // Float/numeric fields
  const rating = parseFloat2(row.rating);
  fields.rating = toFirestoreValue(rating !== null ? rating : 0, 'double');

  const contentPrice = parseFloat2(row.content_price);
  fields.content_price = contentPrice !== null ? toFirestoreValue(contentPrice, 'double') : { nullValue: null };

  // Boolean fields
  fields.is_active = toFirestoreValue(isActive !== null ? isActive : true, 'boolean');
  fields.is_adult = toFirestoreValue(isAdult !== null ? isAdult : false, 'boolean');
  fields.content_purchase_enabled = toFirestoreValue(contentPurchaseEnabled !== null ? contentPurchaseEnabled : false, 'boolean');

  // Array fields
  fields.genre = toFirestoreValue(genre, 'array');
  fields.quality = toFirestoreValue(quality, 'array');
  fields.required_packages = toFirestoreValue(requiredPackages, 'array');
  fields.cast_list = toFirestoreValue(castList, 'array');
  fields.search_keywords = toFirestoreValue(searchKeywords, 'array');
  fields.content_purchase_packages = toFirestoreValue(contentPurchasePackages, 'array');

  // Timestamp fields
  const now = new Date().toISOString();
  if (row.created_at && row.created_at !== '') {
    try {
      fields.created_at = toFirestoreValue(new Date(row.created_at).toISOString(), 'timestamp');
    } catch (e) {
      fields.created_at = toFirestoreValue(now, 'timestamp');
    }
  } else {
    fields.created_at = toFirestoreValue(now, 'timestamp');
  }

  if (row.updated_at && row.updated_at !== '') {
    try {
      fields.updated_at = toFirestoreValue(new Date(row.updated_at).toISOString(), 'timestamp');
    } catch (e) {
      fields.updated_at = toFirestoreValue(now, 'timestamp');
    }
  } else {
    fields.updated_at = toFirestoreValue(now, 'timestamp');
  }

  if (row.release_date && row.release_date !== '') {
    try {
      fields.release_date = toFirestoreValue(new Date(row.release_date).toISOString(), 'timestamp');
    } catch (e) {
      fields.release_date = { nullValue: null };
    }
  } else {
    fields.release_date = { nullValue: null };
  }

  return fields;
}

// ─── Convert a series CSV row to Firestore fields ─────────────────────────────

function seriesRowToFirestoreFields(row) {
  const genre = parseArrayField(row.genre);
  const requiredPackages = parseArrayField(row.required_packages);
  const castList = parseArrayField(row.cast_list);
  const searchKeywords = parseArrayField(row.search_keywords);
  const contentPurchasePackages = parseArrayField(row.content_purchase_packages);

  const isActive = parseBool(row.is_active);
  const isAdult = parseBool(row.is_adult);
  const contentPurchaseEnabled = parseBool(row.content_purchase_enabled);

  const fields = {};

  // Required string fields
  fields.title = toFirestoreValue(row.title || 'Untitled', 'string');
  fields.description = toFirestoreValue(row.description || '', 'string');
  fields.thumbnail_url = toFirestoreValue(row.thumbnail_url || '', 'string');
  fields.language = toFirestoreValue(row.language || 'sw', 'string');
  fields.video_embed_code = toFirestoreValue(row.video_embed_code || '', 'string');

  // Adult category
  if (row.adult_category && row.adult_category !== '') {
    fields.adult_category = toFirestoreValue(row.adult_category, 'string');
  } else {
    fields.adult_category = { nullValue: null };
  }

  // Integer fields
  const totalSeasons = parseInt2(row.total_seasons);
  fields.total_seasons = totalSeasons !== null ? toFirestoreValue(totalSeasons, 'integer') : { nullValue: null };

  const views = parseInt2(row.views);
  fields.views = toFirestoreValue(views !== null ? views : 0, 'integer');

  const contentPriceDays = parseInt2(row.content_price_days);
  fields.content_price_days = contentPriceDays !== null ? toFirestoreValue(contentPriceDays, 'integer') : { nullValue: null };

  // Float/numeric fields
  const rating = parseFloat2(row.rating);
  fields.rating = toFirestoreValue(rating !== null ? rating : 0, 'double');

  const contentPrice = parseFloat2(row.content_price);
  fields.content_price = contentPrice !== null ? toFirestoreValue(contentPrice, 'double') : { nullValue: null };

  // Boolean fields
  fields.is_active = toFirestoreValue(isActive !== null ? isActive : true, 'boolean');
  fields.is_adult = toFirestoreValue(isAdult !== null ? isAdult : false, 'boolean');
  fields.content_purchase_enabled = toFirestoreValue(contentPurchaseEnabled !== null ? contentPurchaseEnabled : false, 'boolean');

  // Array fields
  fields.genre = toFirestoreValue(genre, 'array');
  fields.required_packages = toFirestoreValue(requiredPackages, 'array');
  fields.cast_list = toFirestoreValue(castList, 'array');
  fields.search_keywords = toFirestoreValue(searchKeywords, 'array');
  fields.content_purchase_packages = toFirestoreValue(contentPurchasePackages, 'array');

  // Timestamp fields
  const now = new Date().toISOString();
  if (row.created_at && row.created_at !== '') {
    try {
      fields.created_at = toFirestoreValue(new Date(row.created_at).toISOString(), 'timestamp');
    } catch (e) {
      fields.created_at = toFirestoreValue(now, 'timestamp');
    }
  } else {
    fields.created_at = toFirestoreValue(now, 'timestamp');
  }

  if (row.updated_at && row.updated_at !== '') {
    try {
      fields.updated_at = toFirestoreValue(new Date(row.updated_at).toISOString(), 'timestamp');
    } catch (e) {
      fields.updated_at = toFirestoreValue(now, 'timestamp');
    }
  } else {
    fields.updated_at = toFirestoreValue(now, 'timestamp');
  }

  return fields;
}

// ─── Main Import Logic ────────────────────────────────────────────────────────

async function seedMovies() {
  console.log('\n' + '═'.repeat(70));
  console.log('  🎬  SEEDING MOVIES TO FIREBASE');
  console.log('═'.repeat(70) + '\n');

  // Read CSV
  const csvPath = path.join(ROOT, 'movies_rows (1).csv');
  if (!fs.existsSync(csvPath)) {
    console.log('❌ File not found: movies_rows (1).csv');
    return { imported: 0, skipped: 0, failed: 0, total: 0 };
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parseCSV(csvContent);
  console.log(`📂 Parsed ${records.length} movie rows from CSV\n`);

  // Fetch existing
  const { existingIds, existingTitles } = await fetchExistingDocs('movies');

  // Classify and filter
  let newRecords = [];
  let skipped = 0;
  let noTitleSkipped = 0;

  const stats = {
    regularMovies: 0,
    adultZilizovuja: 0,
    adultNgono: 0,
    adultMoviesNgono: 0,
    payPerView: 0,
  };

  for (const row of records) {
    const id = row.id;
    const title = row.title;

    if (!title || title.trim() === '') {
      noTitleSkipped++;
      continue;
    }

    // Check duplicates by ID and title
    if (id && existingIds.has(id)) {
      skipped++;
      continue;
    }
    if (existingTitles.has(title.toLowerCase().trim())) {
      skipped++;
      continue;
    }

    // Classify
    const isAdult = parseBool(row.is_adult);
    const adultCat = row.adult_category || '';
    const purchaseEnabled = parseBool(row.content_purchase_enabled);

    if (isAdult && adultCat === 'zilizovuja') stats.adultZilizovuja++;
    else if (isAdult && adultCat === 'ngono') stats.adultNgono++;
    else if (isAdult && adultCat === 'movies-ngono') stats.adultMoviesNgono++;
    else if (isAdult) stats.adultNgono++; // default adult to ngono
    else stats.regularMovies++;

    if (purchaseEnabled) stats.payPerView++;

    newRecords.push(row);
  }

  console.log(`\n📊 Classification breakdown:`);
  console.log(`   Regular movies:      ${stats.regularMovies}`);
  console.log(`   Adult (zilizovuja):   ${stats.adultZilizovuja}`);
  console.log(`   Adult (ngono):        ${stats.adultNgono}`);
  console.log(`   Adult (movies-ngono): ${stats.adultMoviesNgono}`);
  console.log(`   Pay-per-view:         ${stats.payPerView}`);
  console.log(`   Duplicates skipped:   ${skipped}`);
  console.log(`   No title (skipped):   ${noTitleSkipped}`);
  console.log(`   ─────────────────────`);
  console.log(`   New to import:        ${newRecords.length}\n`);

  if (newRecords.length === 0) {
    console.log('✅ No new movies to import. All already exist in Firebase.\n');
    return { imported: 0, skipped, failed: 0, total: records.length };
  }

  // Import
  let imported = 0;
  let failed = 0;

  console.log('📤 Starting import...\n');

  for (let i = 0; i < newRecords.length; i++) {
    const row = newRecords[i];
    const docId = row.id || `movie_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    try {
      const fields = movieRowToFirestoreFields(row);
      await createDocument('movies', docId, fields);
      imported++;

      if (imported % 25 === 0 || imported === newRecords.length) {
        const pct = Math.round((imported / newRecords.length) * 100);
        console.log(`   ✅ ${imported}/${newRecords.length} (${pct}%) — last: "${row.title}"`);
      }

      // Throttle: 50ms between requests to avoid rate limiting
      if (i < newRecords.length - 1) {
        await new Promise(r => setTimeout(r, 50));
      }
    } catch (err) {
      failed++;
      console.log(`   ❌ Failed "${row.title}": ${err.message}`);
    }
  }

  console.log(`\n🎬 MOVIES IMPORT COMPLETE`);
  console.log(`   Imported:  ${imported}`);
  console.log(`   Failed:    ${failed}`);
  console.log(`   Skipped:   ${skipped}\n`);

  return { imported, skipped, failed, total: records.length };
}

async function seedSeries() {
  console.log('\n' + '═'.repeat(70));
  console.log('  📺  SEEDING SERIES TO FIREBASE');
  console.log('═'.repeat(70) + '\n');

  // Read CSV
  const csvPath = path.join(ROOT, 'series_rows.csv');
  if (!fs.existsSync(csvPath)) {
    console.log('❌ File not found: series_rows.csv');
    return { imported: 0, skipped: 0, failed: 0, total: 0 };
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parseCSV(csvContent);
  console.log(`📂 Parsed ${records.length} series rows from CSV\n`);

  // Fetch existing
  const { existingIds, existingTitles } = await fetchExistingDocs('series');

  // Filter duplicates
  let newRecords = [];
  let skipped = 0;

  const stats = {
    regularSeries: 0,
    adultSeries: 0,
    payPerView: 0,
  };

  for (const row of records) {
    const id = row.id;
    const title = row.title;

    if (!title || title.trim() === '') continue;

    if (id && existingIds.has(id)) {
      skipped++;
      continue;
    }
    if (existingTitles.has(title.toLowerCase().trim())) {
      skipped++;
      continue;
    }

    const isAdult = parseBool(row.is_adult);
    const purchaseEnabled = parseBool(row.content_purchase_enabled);

    if (isAdult) stats.adultSeries++;
    else stats.regularSeries++;
    if (purchaseEnabled) stats.payPerView++;

    newRecords.push(row);
  }

  console.log(`📊 Classification breakdown:`);
  console.log(`   Regular series:  ${stats.regularSeries}`);
  console.log(`   Adult series:    ${stats.adultSeries}`);
  console.log(`   Pay-per-view:    ${stats.payPerView}`);
  console.log(`   Skipped (dups):  ${skipped}`);
  console.log(`   ─────────────────`);
  console.log(`   New to import:   ${newRecords.length}\n`);

  if (newRecords.length === 0) {
    console.log('✅ No new series to import. All already exist in Firebase.\n');
    return { imported: 0, skipped, failed: 0, total: records.length };
  }

  // Import
  let imported = 0;
  let failed = 0;

  console.log('📤 Starting import...\n');

  for (let i = 0; i < newRecords.length; i++) {
    const row = newRecords[i];
    const docId = row.id || `series_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    try {
      const fields = seriesRowToFirestoreFields(row);
      await createDocument('series', docId, fields);
      imported++;
      console.log(`   ✅ ${imported}/${newRecords.length} — "${row.title}" (${parseBool(row.is_adult) ? '🔞 Adult' : '🎬 Regular'})`);

      // Throttle
      if (i < newRecords.length - 1) {
        await new Promise(r => setTimeout(r, 50));
      }
    } catch (err) {
      failed++;
      console.log(`   ❌ Failed "${row.title}": ${err.message}`);
    }
  }

  console.log(`\n📺 SERIES IMPORT COMPLETE`);
  console.log(`   Imported:  ${imported}`);
  console.log(`   Failed:    ${failed}`);
  console.log(`   Skipped:   ${skipped}\n`);

  return { imported, skipped, failed, total: records.length };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n' + '╔' + '═'.repeat(68) + '╗');
  console.log('║' + '  RAHA PREMIUM — Firebase Seed Script'.padEnd(68) + '║');
  console.log('║' + `  Target: ${FIREBASE_PROJECT_ID}`.padEnd(68) + '║');
  console.log('║' + `  Time:   ${new Date().toISOString()}`.padEnd(68) + '║');
  console.log('╚' + '═'.repeat(68) + '╝\n');

  const moviesResult = await seedMovies();
  const seriesResult = await seedSeries();

  // Final summary
  console.log('\n' + '╔' + '═'.repeat(68) + '╗');
  console.log('║' + '  📊 FINAL SUMMARY'.padEnd(68) + '║');
  console.log('╠' + '═'.repeat(68) + '╣');
  console.log('║' + `  MOVIES:`.padEnd(68) + '║');
  console.log('║' + `    Total in CSV:    ${moviesResult.total}`.padEnd(68) + '║');
  console.log('║' + `    Imported:        ${moviesResult.imported}`.padEnd(68) + '║');
  console.log('║' + `    Skipped (dups):  ${moviesResult.skipped}`.padEnd(68) + '║');
  console.log('║' + `    Failed:          ${moviesResult.failed}`.padEnd(68) + '║');
  console.log('╠' + '─'.repeat(68) + '╣');
  console.log('║' + `  SERIES:`.padEnd(68) + '║');
  console.log('║' + `    Total in CSV:    ${seriesResult.total}`.padEnd(68) + '║');
  console.log('║' + `    Imported:        ${seriesResult.imported}`.padEnd(68) + '║');
  console.log('║' + `    Skipped (dups):  ${seriesResult.skipped}`.padEnd(68) + '║');
  console.log('║' + `    Failed:          ${seriesResult.failed}`.padEnd(68) + '║');
  console.log('╠' + '═'.repeat(68) + '╣');
  console.log('║' + `  TOTAL IMPORTED: ${moviesResult.imported + seriesResult.imported} documents`.padEnd(68) + '║');
  console.log('╚' + '═'.repeat(68) + '╝\n');

  // Save import report
  const report = {
    timestamp: new Date().toISOString(),
    firebaseProject: FIREBASE_PROJECT_ID,
    movies: moviesResult,
    series: seriesResult,
    totalImported: moviesResult.imported + seriesResult.imported,
  };

  const reportPath = path.join(ROOT, 'seed-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`📝 Report saved to: seed-report.json\n`);
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});

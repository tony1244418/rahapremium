const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// 1. Check for Service Account Key
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error("❌ ERROR: 'serviceAccountKey.json' not found in project root!");
  console.log("\n📋 How to get it:");
  console.log("1. Go to Firebase Console: https://console.firebase.google.com/");
  console.log("2. Select your project -> Project Settings (gear icon) -> Service accounts tab.");
  console.log("3. Click 'Generate new private key' and save the JSON file as 'serviceAccountKey.json' in this project root folder.\n");
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Helper to convert ISO strings into Firestore Timestamps if necessary
function cleanData(obj) {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(cleanData);
  if (typeof obj === 'object') {
    const newObj = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined) continue;
      
      // If it's a JSON string representing nested objects/arrays (from Supabase text fields)
      if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
        try {
          newObj[key] = cleanData(JSON.parse(value));
          continue;
        } catch (e) {
          // keep as string if parsing fails
        }
      }
      newObj[key] = cleanData(value);
    }
    return newObj;
  }
  return obj;
}

async function importTable(collectionName, filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ Skipped: File ${filePath} not found.`);
    return;
  }

  const rawData = fs.readFileSync(filePath, 'utf8');
  let records = [];
  try {
    records = JSON.parse(rawData);
  } catch (e) {
    console.error(`❌ Failed to parse ${filePath}:`, e.message);
    return;
  }

  if (!Array.isArray(records) || records.length === 0) {
    console.log(`ℹ️ Collection "${collectionName}": 0 records to import.`);
    return;
  }

  console.log(`\n🚀 Importing ${records.length} documents into Firestore collection "${collectionName}"...`);

  // Firestore batch limit is 500 operations
  const BATCH_SIZE = 400;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const chunk = records.slice(i, i + BATCH_SIZE);
    const batch = db.batch();

    chunk.forEach((item) => {
      const docId = item.id ? String(item.id) : db.collection(collectionName).doc().id;
      const docRef = db.collection(collectionName).doc(docId);
      const cleaned = cleanData(item);
      batch.set(docRef, cleaned, { merge: true });
    });

    await batch.commit();
    console.log(`  ✅ Written records ${i + 1} to ${Math.min(i + BATCH_SIZE, records.length)} of ${records.length}`);
  }

  console.log(`🎉 Finished collection "${collectionName}".`);
}

async function main() {
  const backupDir = path.join(__dirname, 'supabase-backup');
  if (!fs.existsSync(backupDir)) {
    console.error("❌ 'supabase-backup' folder not found. Please run 'node export-supabase.js' first.");
    process.exit(1);
  }

  // ONLY import movies and live TV channels (users start fresh from scratch)
  const allowedCollections = [
    'movies',
    'live_channels',
    'series',
    'seasons',
    'episodes'
  ];

  console.log(`🎬 Target import: Movies, Live TV Channels, and TV Series content.`);
  console.log(`👤 Users & Payments will NOT be imported (starting fresh from scratch).\n`);

  for (const collectionName of allowedCollections) {
    const filePath = path.join(backupDir, `${collectionName}.json`);
    if (fs.existsSync(filePath)) {
      await importTable(collectionName, filePath);
    } else {
      console.log(`ℹ️ File ${collectionName}.json not found in backup, skipping.`);
    }
  }

  console.log("\n🔥 MOVIES & LIVE TV DATA SUCCESSFULLY IMPORTED TO FIREBASE FIRESTORE! 🔥\n");
}

main().catch(err => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});

import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, writeBatch } from "firebase/firestore";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ RAHACRONE Firebase Project Config
const firebaseConfig = {
  apiKey: "AIzaSyAF4ppez6gkiZYNwBn-LMh97NeeYkZ6aQY",
  authDomain: "rahacrone.firebaseapp.com",
  projectId: "rahacrone",
  storageBucket: "rahacrone.firebasestorage.app",
  messagingSenderId: "197453554994",
  appId: "1:197453554994:web:8770581f174f90a2e4e32b",
  measurementId: "G-TJGW944GVX"
};

console.log(`\n🔥 Connecting to Firebase Project: "${firebaseConfig.projectId}"...`);
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
console.log(`✅ Connected!\n`);

// Clean Supabase data — parse any JSON strings into proper objects/arrays
function cleanData(obj) {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(cleanData);
  if (typeof obj === 'object') {
    const newObj = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined) continue;
      if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
        try { newObj[key] = cleanData(JSON.parse(value)); continue; } catch (e) {}
      }
      newObj[key] = cleanData(value);
    }
    return newObj;
  }
  return obj;
}

async function importCollection(collectionName, filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Skipping "${collectionName}" — file not found.`);
    return;
  }

  const rawData = fs.readFileSync(filePath, 'utf8');
  let records = [];
  try { records = JSON.parse(rawData); } catch (e) {
    console.error(`❌ Parse error for ${filePath}:`, e.message); return;
  }

  if (!Array.isArray(records) || records.length === 0) {
    console.log(`ℹ️  "${collectionName}": empty — skipping.`); return;
  }

  console.log(`\n📦 "${collectionName}" → uploading ${records.length} documents...`);

  const BATCH_SIZE = 250;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const chunk = records.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    chunk.forEach((item) => {
      const docId = item.id ? String(item.id) : doc(collection(db, collectionName)).id;
      batch.set(doc(db, collectionName, docId), cleanData(item), { merge: true });
    });
    await batch.commit();
    console.log(`   ✅ ${Math.min(i + BATCH_SIZE, records.length)} / ${records.length} written`);
  }
  console.log(`🎉 "${collectionName}" DONE!`);
}

async function run() {
  const backupDir = path.join(__dirname, 'supabase-backup');
  if (!fs.existsSync(backupDir)) {
    console.error("❌ 'supabase-backup' folder not found!"); process.exit(1);
  }

  // Import ALL tables from the backup directory
  const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.json'));
  
  console.log(`====================================================`);
  console.log(`🚀 IMPORTING ALL DATA TO FIREBASE`);
  console.log(`   Project: ${firebaseConfig.projectId}`);
  console.log(`   Tables found: ${files.length}`);
  console.log(`   Tables: ${files.map(f => f.replace('.json','')).join(', ')}`);
  console.log(`====================================================\n`);

  for (const file of files) {
    const collectionName = path.basename(file, '.json');
    await importCollection(collectionName, path.join(backupDir, file));
  }

  console.log(`\n====================================================`);
  console.log(`✨ ALL DATA SUCCESSFULLY IMPORTED TO FIREBASE!`);
  console.log(`   Project: ${firebaseConfig.projectId}`);
  console.log(`====================================================\n`);
  process.exit(0);
}

run().catch((err) => {
  console.error("\n❌ Import failed:", err.message || err);
  process.exit(1);
});

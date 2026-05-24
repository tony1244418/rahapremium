const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Custom .env parser to avoid needing 'dotenv' module
function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  let loaded = false;

  for (const file of envFiles) {
    const envPath = path.join(__dirname, file);
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      envContent.split('\n').forEach(line => {
        // Skip comments and empty lines
        if (line.trim().startsWith('#') || !line.includes('=')) return;
        
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = (match[2] || '').trim();
          // Remove surrounding quotes if any
          if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
          if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
          process.env[key] = value;
        }
      });
      console.log(`📝 Loaded configuration from local ${file} file`);
      loaded = true;
      break; // Stop at the first file found (since .env.local takes precedence)
    }
  }

  if (!loaded) {
    console.warn("⚠️ Warning: Neither .env.local nor .env was found. Reading system environment variables instead.");
  }
}

loadEnv();

const NEW_SUPABASE_URL = process.env.NEW_SUPABASE_URL;
const NEW_SUPABASE_SERVICE_ROLE_KEY = process.env.NEW_SUPABASE_SERVICE_ROLE_KEY;

if (!NEW_SUPABASE_URL || !NEW_SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ ERROR: Please define NEW_SUPABASE_URL and NEW_SUPABASE_SERVICE_ROLE_KEY in your .env file.");
  process.exit(1);
}

const supabase = createClient(NEW_SUPABASE_URL, NEW_SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function main() {
  const backupDir = path.join(__dirname, 'supabase-backup');
  if (!fs.existsSync(backupDir)) {
    console.error("❌ ERROR: No backup directory found. Please run 'node export-supabase.js' first.");
    process.exit(1);
  }

  const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.json'));

  if (files.length === 0) {
    console.log("⚠️ No JSON backup files found in 'supabase-backup' directory.");
    return;
  }

  console.log(`🚀 Starting data import for ${files.length} tables...`);
  console.log(`ℹ️ IMPORTANT: Ensure you have already created these tables in your new Supabase project first!`);

  for (const file of files) {
    const table = file.replace('.json', '');
    const filePath = path.join(backupDir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    if (data.length === 0) {
      console.log(`\n⏭️ Table "${table}" is empty. Skipping.`);
      continue;
    }

    console.log(`\n📥 Importing ${data.length} records into table "${table}"...`);

    const batchSize = 100;
    let successCount = 0;
    let hasFailed = false;

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from(table)
        .insert(batch);

      if (error) {
        console.error(`  ❌ Error importing batch into "${table}" (index ${i}-${i + batch.length - 1}):`, error.message);
        console.error(`  Details:`, error.details || "None");
        console.error(`  Hint: Ensure all foreign key references already exist, and all table columns match exactly.`);
        hasFailed = true;
        break;
      } else {
        successCount += batch.length;
        console.log(`  Processed ${successCount}/${data.length} records...`);
      }
    }

    if (!hasFailed) {
      console.log(`  ✅ Successfully imported table "${table}"!`);
    }
  }

  console.log("\n🎉 IMPORT PROCESS COMPLETE!");
}

main();

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

const OLD_SUPABASE_URL = process.env.OLD_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const OLD_SUPABASE_SERVICE_ROLE_KEY = process.env.OLD_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!OLD_SUPABASE_URL || !OLD_SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ ERROR: Please define OLD_SUPABASE_URL and OLD_SUPABASE_SERVICE_ROLE_KEY in your .env file.");
  console.log("Make sure you create a .env file in the project root with the following format:");
  console.log("\nOLD_SUPABASE_URL=https://your-old-project-ref.supabase.co");
  console.log("OLD_SUPABASE_SERVICE_ROLE_KEY=ey...\n");
  process.exit(1);
}

const supabase = createClient(OLD_SUPABASE_URL, OLD_SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function main() {
  const backupDir = path.join(__dirname, 'supabase-backup');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }

  console.log("🔍 1. Fetching list of database tables from your live Supabase API...");
  
  try {
    // PostgREST exposes an OpenAPI description at the root path "/"
    const response = await fetch(`${OLD_SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': OLD_SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${OLD_SUPABASE_SERVICE_ROLE_KEY}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch database schema: ${response.statusText}`);
    }

    const schema = await response.json();
    const tables = Object.keys(schema.definitions || {});

    if (tables.length === 0) {
      console.log("⚠️ No tables found in the public schema of this project.");
      return;
    }

    console.log(`✅ Found ${tables.length} tables to export: ${tables.join(', ')}`);

    for (const table of tables) {
      console.log(`\n📦 Exporting table: "${table}"...`);
      
      const properties = schema.definitions[table].properties || {};
      const columns = Object.keys(properties);
      
      let orderByColumn = null;
      if (columns.includes('id')) {
        orderByColumn = 'id';
      } else if (columns.includes('created_at')) {
        orderByColumn = 'created_at';
      } else if (columns.length > 0) {
        orderByColumn = columns[0];
      }

      let allRows = [];
      let from = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        console.log(`  fetching rows ${from} to ${from + batchSize - 1}...`);
        
        let query = supabase.from(table).select('*').range(from, from + batchSize - 1);
        
        if (orderByColumn) {
          query = query.order(orderByColumn, { ascending: true });
        }

        const { data, error } = await query;

        if (error) {
          console.error(`  ❌ Error fetching rows from "${table}":`, error.message);
          break;
        }

        if (!data || data.length === 0) {
          hasMore = false;
        } else {
          allRows = allRows.concat(data);
          from += batchSize;
          if (data.length < batchSize) {
            hasMore = false;
          }
        }
      }

      const filePath = path.join(backupDir, `${table}.json`);
      fs.writeFileSync(filePath, JSON.stringify(allRows, null, 2));
      console.log(`  💾 Successfully exported ${allRows.length} rows to "supabase-backup/${table}.json"`);
    }

    console.log("\n🎉 EXPORT COMPLETE! All tables have been saved in the './supabase-backup/' folder.");
    console.log("👉 Next, configure your NEW Supabase details in '.env' and run 'node import-supabase.js'.");

  } catch (error) {
    console.error("❌ Migration failed during export:", error.message);
  }
}

main();

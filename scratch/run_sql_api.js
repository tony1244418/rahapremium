const fs = require('fs');

async function runSQL() {
  const token = 'sbp_5918676e25576746666ec9e2cfcc8f3198f1e92c';
  const projectRef = 'flikwildlkiktotpgqxx';
  const sql = fs.readFileSync('scratch/qr_login_schema.sql', 'utf8');

  console.log('Executing SQL on project:', projectRef);

  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('Failed to execute SQL:', response.status, err);
  } else {
    console.log('SQL executed successfully!');
  }
}

runSQL();

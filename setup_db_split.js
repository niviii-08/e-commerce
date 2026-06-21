const { Client } = require('pg');
const fs = require('fs');

async function runSchema() {
  const connectionString = 'postgresql://postgres:neevetha@08@db.kssgmycjrpsvqpkuvngs.supabase.co:5432/postgres';
  const client = new Client({
    connectionString,
  });

  try {
    await client.connect();
    console.log('Connected to DB!');
    
    const schemaText = fs.readFileSync('backend/sql/schema.sql', 'utf8');
    
    // Split on semicolons but only those not inside functions or dollar quotes. 
    // Wait, regex for postgres splitting is hard. Instead, let's just drop the storage policies and run everything, OR just wrap everything in a transaction? No.
    // Let's manually replace `create policy` with `drop policy if exists ...; create policy`.
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

// runSchema();

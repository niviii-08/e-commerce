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
    const schema = fs.readFileSync('backend/sql/schema.sql', 'utf8');
    await client.query(schema);
    console.log('Schema executed successfully!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

runSchema();

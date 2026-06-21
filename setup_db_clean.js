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
    
    console.log('Dropping storage policies...');
    const policies = [
      "Public read product images",
      "Authenticated upload product images",
      "Owner manage own product images",
      "Owner delete own product images",
      "Public read avatars",
      "Authenticated upload own avatar",
      "Owner manage own avatar"
    ];
    for (const p of policies) {
      await client.query(`DROP POLICY IF EXISTS "${p}" ON storage.objects;`);
    }

    console.log('Dropping public schema to restart...');
    await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;');

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

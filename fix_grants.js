const { Client } = require('pg');

async function fixGrants() {
  const connectionString = 'postgresql://postgres:neevetha@08@db.kssgmycjrpsvqpkuvngs.supabase.co:5432/postgres';
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Connected to DB!');
    
    // Grant usage on schema
    await client.query('GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;');
    
    // Grant all privileges on all tables in schema public
    await client.query('GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;');
    
    // Grant all on all sequences
    await client.query('GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;');
    
    // Set default privileges for future tables
    await client.query('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;');
    await client.query('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;');
    
    console.log('Grants executed successfully!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

fixGrants();

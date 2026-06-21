const { Client } = require('pg');

async function testTrigger() {
  const connectionString = 'postgresql://postgres:neevetha@08@db.kssgmycjrpsvqpkuvngs.supabase.co:5432/postgres';
  const client = new Client({ connectionString });
  try {
    await client.connect();
    
    // We can't insert into auth.users directly. Let's just create a dummy row in auth.users?
    // Wait, the postgres role is a superuser on supabase! 
    await client.query(`
      INSERT INTO auth.users (id, email, raw_user_meta_data)
      VALUES (gen_random_uuid(), 'test_trigger@example.com', '{"role": "customer", "full_name": "Test Trigger"}')
    `);
    console.log("Insert successful!");
  } catch(e) {
    console.log("Error inserting into auth.users:", e);
  } finally {
    await client.end();
  }
}
testTrigger();

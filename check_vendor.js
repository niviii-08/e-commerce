const { Client } = require('pg');

async function checkVendor() {
  const connectionString = 'postgresql://postgres:neevetha@08@db.kssgmycjrpsvqpkuvngs.supabase.co:5432/postgres';
  const client = new Client({ connectionString });

  try {
    await client.connect();
    
    // Check auth.users directly
    const resAuth = await client.query("SELECT email FROM auth.users WHERE email = '2403717672622046@cit.edu.in'");
    console.log("In auth.users:", resAuth.rows.length > 0 ? "YES" : "NO");

    // Check profiles
    const resProfiles = await client.query("SELECT email, role FROM profiles WHERE email = '2403717672622046@cit.edu.in'");
    if (resProfiles.rows.length > 0) {
        console.log("In profiles:", resProfiles.rows[0]);
    } else {
        console.log("In profiles: NO");
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

checkVendor();

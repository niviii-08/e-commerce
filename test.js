const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://kssgmycjrpsvqpkuvngs.supabase.co';
const supabaseKey = 'sb_publishable_BrPKomeVMFZm9DDNy0iCKQ_Fvteybur';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.auth.signUp({
    email: 'test@example.com',
    password: 'password123',
    options: {
      data: {
        role: 'customer',
        full_name: 'Test',
        phone: '12345'
      }
    }
  });
  console.log('Error:', error);
  if (error) {
    console.log('Error message:', error.message);
  }
}
test();

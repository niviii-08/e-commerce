const { createClient } = require('@supabase/supabase-js');

// Create a single supabase client for interacting with your database
const supabase = createClient('https://kssgmycjrpsvqpkuvngs.supabase.co', 'sb_publishable_BrPKomeVMFZm9DDNy0iCKQ_Fvteybur');

async function testLogin() {
    const { data, error } = await supabase.auth.signInWithPassword({
        email: '2403717672622032@cit.edu.in',
        password: 'neevetha'
    });
    
    if (error) {
        console.log("LOGIN ERROR MESSAGE:", error.message);
    } else {
        console.log("LOGIN SUCCESSFUL!");
    }
}

testLogin();

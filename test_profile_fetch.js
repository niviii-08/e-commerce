const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://kssgmycjrpsvqpkuvngs.supabase.co', 'sb_publishable_BrPKomeVMFZm9DDNy0iCKQ_Fvteybur');

async function testProfileFetch() {
    const email = 'testuser' + Date.now() + '@example.com';
    const password = 'password123';

    await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { role: 'customer', full_name: 'Test User' }
        }
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.log("No user found after login.");
        return;
    }

    console.log("Logged in user:", user.id);

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
    if (error) {
        console.log("PROFILE FETCH ERROR:", error);
    } else {
        console.log("PROFILE FETCH SUCCESS:", profile);
    }
}

testProfileFetch();

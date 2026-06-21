const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://kssgmycjrpsvqpkuvngs.supabase.co', 'sb_publishable_BrPKomeVMFZm9DDNy0iCKQ_Fvteybur');

async function testSignupAndLogin() {
    const email = 'testuser' + Date.now() + '@example.com';
    const password = 'password123';

    console.log("Signing up:", email);
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                role: 'customer',
                full_name: 'Test User',
            }
        }
    });

    if (signUpError) {
        console.log("SIGNUP ERROR:", signUpError.message);
        return;
    }

    console.log("SIGNUP SUCCESS! User ID:", signUpData.user?.id);

    console.log("Attempting login...");
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (loginError) {
        console.log("LOGIN ERROR:", loginError.message);
    } else {
        console.log("LOGIN SUCCESS! Token:", loginData.session?.access_token ? "Yes" : "No");
    }
}

testSignupAndLogin();

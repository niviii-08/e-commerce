const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://kssgmycjrpsvqpkuvngs.supabase.co', 'sb_publishable_BrPKomeVMFZm9DDNy0iCKQ_Fvteybur');

async function testFetchProducts() {
    const { data, error } = await supabase.from('product_catalog').select('*').eq('status', 'published');
    if (error) {
        console.log("FETCH ERROR:", error);
    } else {
        console.log("FETCH SUCCESS, items:", data.length);
    }
}

testFetchProducts();

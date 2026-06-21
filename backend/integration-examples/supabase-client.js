/**
 * Supabase client — include this script on every page BEFORE any other
 * app script, right after the Supabase CDN script:
 *
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 *   <script src="assets/js/supabase-client.js"></script>
 *
 * Replace the two placeholders below with your real project values
 * (Supabase Dashboard -> Project Settings -> API).
 */
const SUPABASE_URL = 'https://kssgmycjrpsvqpkuvngs.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_BrPKomeVMFZm9DDNy0iCKQ_Fvteybur';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

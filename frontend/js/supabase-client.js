/**
 * Supabase client — include this script on every page BEFORE any other
 * app script, right after the Supabase CDN script:
 *
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 *   <script src="js/supabase-client.js"></script>
 *
 * Project values from Supabase Dashboard -> Project Settings -> API.
 */
const SUPABASE_URL = 'https://kssgmycjrpsvqpkuvngs.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_BrPKomeVMFZm9DDNy0iCKQ_Fvteybur';

// IMPORTANT: The CDN exposes the library as window.supabase (with createClient).
// We must capture the library first, then overwrite window.supabase with the
// initialized CLIENT so that all other scripts referencing `supabase` get the
// correct client instance (which has .auth, .from(), etc.).
(function () {
  const _lib = window.supabase; // library: { createClient, ... }
  const _client = _lib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  // Make client available in every way scripts might reference it:
  window.supabase = _client;   // via window.supabase
  window._supabase = _client;  // alias
})();

// Convenience alias at module scope (works because var is hoisted to window)
var supabase = window.supabase;

document.addEventListener('DOMContentLoaded', async () => {
    const avatarEl = document.querySelector('.profile-avatar');
    const nameEl = document.querySelector('.dropdown-toggle span.d-none.d-md-inline');
    let userRole = 'customer'; // default
    
    if (avatarEl && nameEl) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                if (profile) {
                    userRole = profile.role;
                    nameEl.textContent = profile.full_name;
                    const initials = profile.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                    avatarEl.textContent = initials;
                }
            }
        } catch (e) {
            console.error('Error fetching user profile for navbar:', e);
        }
    }

    const logoutBtns = document.querySelectorAll('a.text-danger');
    logoutBtns.forEach(btn => {
        if (btn.textContent.includes('Logout')) {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                await supabase.auth.signOut();
                window.location.href = 'index.html';
            });
        }
    });

    const setHrefByText = (selector, text, url) => {
        document.querySelectorAll(selector).forEach(link => {
            if (link.textContent.includes(text)) {
                link.href = url;
            }
        });
    };

    if (userRole === 'vendor') {
        setHrefByText('a.dropdown-item', 'My Profile', 'vendor-dashboard.html');
        setHrefByText('a.dropdown-item', 'My Orders', 'vendor-orders.html');
        setHrefByText('a.nav-link', 'Profile', 'vendor-dashboard.html');
        setHrefByText('a.nav-link', 'Orders', 'vendor-orders.html');
    } else {
        setHrefByText('a.dropdown-item', 'My Profile', 'customer-dashboard.html');
        setHrefByText('a.dropdown-item', 'My Orders', 'customer-dashboard.html');
        setHrefByText('a.nav-link', 'Profile', 'customer-dashboard.html');
        setHrefByText('a.nav-link', 'Orders', 'customer-dashboard.html');
    }
});


/**
 * AUTH — wire these into customer-signup.html, customer-login.html,
 * vendor-signup.html, vendor-login.html.
 *
 * Requires supabase-client.js to be loaded first.
 */

// --- customer-signup.html -> #customerSignupForm submit handler ---
async function signUpCustomer({ fullName, email, phone, dob, address, password }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role: 'customer',
        full_name: fullName,
        phone,
        dob,
        address,
      },
    },
  });
  if (error) throw error;
  // The DB trigger handle_new_user() auto-creates the profiles + carts row.
  return data;
}

// --- vendor-signup.html -> #vendorSignupForm submit handler ---
async function signUpVendor({ vendorName, shopName, vendorId, gstinNumber, email, password }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role: 'vendor',
        full_name: vendorName,
        shop_name: shopName,
        vendor_code: vendorId,
        gstin: gstinNumber,
      },
    },
  });
  if (error) throw error;
  // The DB trigger auto-creates profiles + vendors rows (vendor status defaults to 'pending'
  // until an admin approves it — see updateVendorStatus() in vendor-admin.js).
  return data;
}

// --- customer-login.html / vendor-login.html -> login form submit handler ---
async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function signOut() {
  await supabase.auth.signOut();
}

// Fetch the current user's profile (and vendor row, if applicable) to decide
// which dashboard to redirect to after login.
async function getCurrentProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  if (error) throw error;
  return profile; // profile.role is 'customer' | 'vendor' | 'admin'
}

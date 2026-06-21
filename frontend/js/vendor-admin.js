/**
 * VENDOR & ADMIN DASHBOARDS — wire these into vendor-dashboard.html,
 * vendor-orders.html, admin-users.html.
 */

// --- vendor-dashboard.html: sales chart + stats cards ---
async function fetchMySalesSummary() {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('vendor_sales_summary')
    .select('*')
    .eq('vendor_id', user.id)
    .single();
  if (error) throw error;
  return data; // { total_orders, total_revenue, total_units_sold }
}

// --- vendor-orders.html: list orders containing this vendor's products ---
async function fetchMyOrderItems() {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('order_items')
    .select('*, orders(order_number, placed_at, payment_method, profiles(full_name, phone), addresses(*))')
    .eq('vendor_id', user.id)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data;
}

// --- vendor-orders.html: #statusModal "Confirm" button ---
async function updateOrderItemStatus(orderItemId, newStatus) {
  // newStatus: 'pending' | 'packed' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled'
  const { data, error } = await supabase
    .from('order_items')
    .update({ status: newStatus })
    .eq('id', orderItemId)
    .select()
    .single();
  if (error) throw error;
  // Cancelling automatically restocks the product (see trg_restock_on_cancel).
  return data;
}

// --- admin-users.html: load the customer table ---
async function fetchAllUsers() {
  const { data, error } = await supabase
    .from('admin_user_overview')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

// --- admin-users.html: activate / deactivate / block / unblock buttons ---
async function setUserAccountStatus(userId, status) {
  // status: 'active' | 'inactive' | 'blocked'
  const { data, error } = await supabase
    .from('profiles')
    .update({ account_status: status })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// --- admin: approve / reject a pending vendor application ---
async function setVendorStatus(vendorId, status) {
  // status: 'approved' | 'rejected' | 'suspended'
  const { data, error } = await supabase
    .from('vendors')
    .update({ status })
    .eq('id', vendorId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// --- product-details.html: "Write a Review" ---
async function submitReview(productId, { rating, comment }) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('reviews')
    .upsert({ product_id: productId, customer_id: user.id, rating, comment })
    .select()
    .single();
  if (error) throw error;
  // trg_reviews_aiud automatically recalculates products.rating_avg / rating_count.
  return data;
}

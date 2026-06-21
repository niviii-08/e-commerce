/**
 * CART & CHECKOUT — wire these into cart.html and checkout.html.
 */

// --- cart.html: load current user's cart with product details ---
async function getCart() {
  const { data: { user } } = await supabase.auth.getUser();

  const { data: cart, error: e1 } = await supabase
    .from('carts')
    .select('id')
    .eq('customer_id', user.id)
    .single();
  if (e1) throw e1;

  const { data: items, error: e2 } = await supabase
    .from('cart_items')
    .select('id, quantity, products(id, name, price, stock_quantity, product_images(image_url, is_primary))')
    .eq('cart_id', cart.id);
  if (e2) throw e2;

  return items;
}

// --- product-details.html: "Add to Cart" button ---
async function addToCart(productId, quantity = 1) {
  const { data: { user } } = await supabase.auth.getUser();

  const { data: cart } = await supabase
    .from('carts')
    .select('id')
    .eq('customer_id', user.id)
    .single();

  // upsert so adding the same product twice just increases quantity
  const { data, error } = await supabase
    .from('cart_items')
    .upsert(
      { cart_id: cart.id, product_id: productId, quantity },
      { onConflict: 'cart_id,product_id' }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function updateCartItemQuantity(cartItemId, quantity) {
  const { data, error } = await supabase
    .from('cart_items')
    .update({ quantity })
    .eq('id', cartItemId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function removeCartItem(cartItemId) {
  const { error } = await supabase.from('cart_items').delete().eq('id', cartItemId);
  if (error) throw error;
}

// --- checkout.html: "Place Order" button ---
// Runs entirely inside one DB transaction (the place_order() stored procedure):
// validates stock, applies the coupon, creates the order + order_items +
// payment row, decrements stock, and empties the cart.
async function placeOrder({ addressId, paymentMethod, couponCode }) {
  const { data: { user } } = await supabase.auth.getUser();

  const { data: orderId, error } = await supabase.rpc('place_order', {
    p_customer_id: user.id,
    p_address_id: addressId,
    p_payment_method: paymentMethod, // 'card' | 'upi' | 'cod'
    p_coupon_code: couponCode || null,
  });
  if (error) throw error; // e.g. "Insufficient stock for product ..."
  return orderId; // -> redirect to order-confirmation.html?order=<orderId>
}

// --- order-confirmation.html: load the placed order ---
async function fetchOrder(orderId) {
  const { data: order, error: e1 } = await supabase
    .from('orders')
    .select('*, addresses(*), payments(*)')
    .eq('id', orderId)
    .single();
  if (e1) throw e1;

  const { data: items, error: e2 } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderId);
  if (e2) throw e2;

  return { order, items };
}

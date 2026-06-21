/**
 * PRODUCTS — wire these into product-listing.html, product-details.html,
 * vendor-products.html, vendor-inventory.html.
 */

// --- product-listing.html: load catalog with filters ---
async function fetchProducts({ categoryName, vendorName, minPrice, maxPrice, search } = {}) {
  let query = supabase.from('product_catalog').select('*').eq('status', 'published');

  if (categoryName) query = query.eq('category_name', categoryName);
  if (vendorName) query = query.eq('vendor_name', vendorName);
  if (minPrice != null) query = query.gte('price', minPrice);
  if (maxPrice != null) query = query.lte('price', maxPrice);
  if (search) query = query.ilike('name', `%${search}%`);

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

// --- product-details.html: load one product + images + reviews ---
async function fetchProductDetails(productId) {
  const { data: product, error: e1 } = await supabase
    .from('product_catalog')
    .select('*')
    .eq('id', productId)
    .single();
  if (e1) throw e1;

  const { data: images, error: e2 } = await supabase
    .from('product_images')
    .select('*')
    .eq('product_id', productId)
    .order('sort_order');
  if (e2) throw e2;

  const { data: reviews, error: e3 } = await supabase
    .from('reviews')
    .select('*, profiles(full_name)')
    .eq('product_id', productId)
    .order('created_at', { ascending: false });
  if (e3) throw e3;

  return { product, images, reviews };
}

// --- vendor-products.html: #addProductModal save handler ---
async function createProduct({ name, categoryId, price, stockQuantity, sku, description, publish }) {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('products')
    .insert({
      vendor_id: user.id,
      category_id: categoryId,
      name,
      slug: name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-'),
      price,
      stock_quantity: stockQuantity,
      sku: sku || null,
      description,
      status: publish ? 'published' : 'draft',
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// --- vendor-products.html: list this vendor's own products (any status) ---
async function fetchMyProducts() {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('products')
    .select('*, product_images(*)')
    .eq('vendor_id', user.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

// --- vendor-inventory.html: #updateStockModal save handler ---
async function addStock(productId, addQuantity) {
  const { data: product, error: e1 } = await supabase
    .from('products')
    .select('stock_quantity')
    .eq('id', productId)
    .single();
  if (e1) throw e1;

  const { data, error } = await supabase
    .from('products')
    .update({ stock_quantity: product.stock_quantity + addQuantity })
    .eq('id', productId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// --- vendor-products.html: upload a product image to Storage, then attach it ---
async function uploadProductImage(productId, file, { isPrimary = false } = {}) {
  const path = `${productId}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(path, file);
  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path);

  const { data, error } = await supabase
    .from('product_images')
    .insert({ product_id: productId, image_url: publicUrl, is_primary: isPrimary })
    .select()
    .single();
  if (error) throw error;
  return data;
}

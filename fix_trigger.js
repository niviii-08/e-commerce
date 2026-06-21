const { Client } = require('pg');

async function fixTrigger() {
  const connectionString = 'postgresql://postgres:neevetha@08@db.kssgmycjrpsvqpkuvngs.supabase.co:5432/postgres';
  const client = new Client({ connectionString });
  try {
    await client.connect();
    
    await client.query(`
      create or replace function public.handle_new_user() returns trigger
      language plpgsql security definer set search_path = public as $$
      declare
        v_role user_role;
      begin
        v_role := coalesce((new.raw_user_meta_data->>'role')::user_role, 'customer');

        insert into public.profiles (id, role, full_name, email, phone)
        values (
          new.id,
          v_role,
          coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
          new.email,
          new.raw_user_meta_data->>'phone'
        );

        if v_role = 'vendor' then
          insert into public.vendors (id, shop_name, vendor_code, gstin)
          values (
            new.id,
            coalesce(new.raw_user_meta_data->>'shop_name', 'My Store'),
            coalesce(new.raw_user_meta_data->>'vendor_code', 'VEND-' || substr(new.id::text, 1, 8)),
            new.raw_user_meta_data->>'gstin'
          );
        elsif v_role = 'customer' then
          insert into public.carts (customer_id) values (new.id);
        end if;

        return new;
      end;
      $$;
    `);
    console.log("Trigger fixed!");
  } catch(e) {
    console.log("Error:", e);
  } finally {
    await client.end();
  }
}
fixTrigger();

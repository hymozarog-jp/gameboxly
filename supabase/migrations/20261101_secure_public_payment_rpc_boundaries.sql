-- L1017n backend payment security changes applied to Supabase on 2026-11-01.
-- These functions execute server-side. GitHub Pages and InfinityFree share this Supabase project.
-- Keep publicly necessary storefront product/leaderboard read RPCs unchanged.
revoke execute on function public.reserve_single_mm2_on_purchase() from public, anon, authenticated;
revoke execute on function public.initialize_new_leaderboard_profile() from public, anon, authenticated;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_store_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;
grant execute on function public.is_store_admin() to authenticated, service_role;

-- Reserved marker is exclusively for code orders created by buy_instant_code().
CREATE OR REPLACE FUNCTION public.create_purchase_order(p_product_id uuid, p_roblox_username text)
 RETURNS purchase_orders
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_product public.products%rowtype;
  v_wallet public.wallet_accounts%rowtype;
  v_order public.purchase_orders;
  v_balance numeric;
  v_inventory public.store_inventory%rowtype;
  v_reserve_inventory boolean := false;
begin
  if (select auth.uid()) is null then raise exception 'not_authenticated'; end if;
  if upper(btrim(coalesce(p_roblox_username,''))) = 'DIGITAL_CODE' then
    raise exception 'reserved_delivery_marker' using errcode='22023';
  end if;
  if length(trim(p_roblox_username)) < 3 or length(trim(p_roblox_username)) > 40 then raise exception 'invalid_roblox_username'; end if;

  select * into v_product from public.products where id = p_product_id and active = true for update;
  if not found then raise exception 'product_not_available'; end if;

  v_reserve_inventory := lower(coalesce(v_product.game,'')) = 'roblox'
    or v_product.name ilike '%robux%'
    or v_product.name ilike '%روبوكس%';

  if v_reserve_inventory then
    select * into v_inventory from public.store_inventory where id = true for update;
    if not found or v_inventory.robux_available < v_product.amount then
      raise exception 'robux_out_of_stock';
    end if;
    update public.store_inventory
      set robux_available = robux_available - v_product.amount, updated_at = now()
      where id = true;
  end if;

  select * into v_wallet from public.wallet_accounts where user_id = (select auth.uid()) for update;
  if not found then
    insert into public.wallet_accounts(user_id,balance) values((select auth.uid()),0) returning * into v_wallet;
  end if;
  v_balance := v_wallet.balance;
  if v_balance < v_product.price then raise exception 'insufficient_balance'; end if;
  update public.wallet_accounts set balance = balance - v_product.price, updated_at = now()
    where user_id = (select auth.uid()) returning balance into v_balance;

  insert into public.purchase_orders(user_id,product_id,product_name,amount,unit_price,total_amount,roblox_username,inventory_reserved)
  values((select auth.uid()),v_product.id,v_product.name,v_product.amount,v_product.price,v_product.price,trim(p_roblox_username),v_reserve_inventory)
  returning * into v_order;

  insert into public.wallet_transactions(user_id,amount,transaction_type,balance_after,created_by)
  values((select auth.uid()),-v_product.price,'purchase',v_balance,(select auth.uid()));
  return v_order;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.create_custom_robux_order(p_amount integer, p_roblox_username text, p_expected_total numeric)
 RETURNS purchase_orders
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_user uuid := (select auth.uid());
 v_anchor public.products%rowtype;
 v_stock public.store_inventory%rowtype;
 v_wallet public.wallet_accounts%rowtype;
 v_price numeric;
 v_balance numeric;
 v_order public.purchase_orders%rowtype;
begin
 if v_user is null then raise exception 'not_authenticated'; end if;
 if upper(btrim(coalesce(p_roblox_username,''))) = 'DIGITAL_CODE' then
   raise exception 'reserved_delivery_marker' using errcode='22023';
 end if;
 if p_amount is null or p_amount < 1 or p_amount > 100000 then
   raise exception 'invalid_robux_quantity';
 end if;
 if p_roblox_username is null or length(btrim(p_roblox_username)) < 3
    or length(btrim(p_roblox_username)) > 40 then
   raise exception 'invalid_roblox_username';
 end if;

 -- Anchor to a real Robux SKU for compatibility with the existing product/order FK.
 -- Actual quantity and amount are recorded on the order itself.
 select * into v_anchor from public.products p
 where p.active=true and (lower(coalesce(p.game,''))='roblox' or p.name ilike '%robux%' or p.name ilike '%روبوكس%')
 order by p.amount asc,p.price asc limit 1 for share;
 if not found then raise exception 'robux_price_unavailable'; end if;

 v_price := public.quote_custom_robux(p_amount);
 if p_expected_total is null or v_price <> p_expected_total then
   raise exception 'robux_price_changed';
 end if;

 select * into v_stock from public.store_inventory where id=true for update;
 if not found or v_stock.robux_available < p_amount then
   raise exception 'robux_out_of_stock';
 end if;

 select * into v_wallet from public.wallet_accounts where user_id=v_user for update;
 if not found then
   insert into public.wallet_accounts(user_id,balance)
     values(v_user,0) returning * into v_wallet;
 end if;
 if v_wallet.balance < v_price then raise exception 'insufficient_balance'; end if;

 update public.store_inventory
   set robux_available=robux_available-p_amount, updated_at=now()
   where id=true;
 update public.wallet_accounts
   set balance=balance-v_price,updated_at=now()
   where user_id=v_user returning balance into v_balance;

 insert into public.purchase_orders(
    user_id,product_id,product_name,amount,unit_price,total_amount,roblox_username,inventory_reserved
 ) values(
    v_user,v_anchor.id,p_amount::text || ' Robux',p_amount,v_price,v_price,
    btrim(p_roblox_username),true
 ) returning * into v_order;
 insert into public.wallet_transactions(
    user_id,amount,transaction_type,balance_after,created_by
 ) values(v_user,-v_price,'purchase',v_balance,v_user);
 return v_order;
end;
$function$
;

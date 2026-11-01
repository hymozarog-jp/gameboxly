const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const SUPABASE_URL='https://cmtxsjlehjworqypbxjz.supabase.co';
const SUPABASE_KEY='sb_publishable_NrahtO5qp8p4OgjODMbxdQ_XqbUWSAk';
const RECOVERY_LINK=new URLSearchParams(window.location.hash.slice(1)).get('type')==='recovery'||new URLSearchParams(window.location.search).get('type')==='recovery';
const OAUTH_RETURN=!RECOVERY_LINK&&new URLSearchParams(window.location.search).has('code');
const OAUTH_ERROR=new URLSearchParams(window.location.search).get('error');
const supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const statusText={pending:'قيد المراجعة',approved:'تمت الموافقة',rejected:'مرفوض'};
const orderStatusText={paid_pending_fulfillment:'تم الدفع — بانتظار التنفيذ',completed:'مكتمل',rejected:'مرفوض — تم إرجاع الرصيد',refunded:'تم إرجاع الرصيد'};
function orderStatusClass(status){return status==='completed'?'approved':(['rejected','refunded'].includes(status)?'rejected':'pending')}
let toastTimer,products=[],robuxAvailable=1000,showTopupCode=false;
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),3200)}
function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function currentUser(){const {data:{user}}=await supabaseClient.auth.getUser();return user}
async function loadProducts(){const [productResult,inventoryResult]=await Promise.all([supabaseClient.from('products').select('*').eq('active',true).order('sort_order'),supabaseClient.from('store_inventory').select('robux_available').eq('id',true).maybeSingle()]);if(productResult.error){toast('تعذر تحميل المنتجات');return}products=productResult.data||[];if(!inventoryResult.error&&inventoryResult.data)robuxAvailable=Number(inventoryResult.data.robux_available)||0;renderProducts()}
function renderProducts(){
 const g=$('#productGrid');if(!g)return;
 const games=[
  {name:'روبوكس',category:'روبلوكس',image:'game-covers/roblox-mark.svg?v=logo-square1',key:'roblox',count:products.filter(p=>String(p.game||'').toLowerCase()==='roblox'||/robux|روبوكس/i.test(p.name||'')).length},
  {name:'MM2',category:'روبلوكس',image:'game-covers/mm2-game-icon.jpg?v=mm2-fixed2',key:'mm2',count:products.filter(p=>/mm2|murder.mystery/i.test([p.game,p.product_key,p.name].join(' '))).length},
  {name:'ماب السرقة',category:'روبلوكس',image:'game-covers/steal-a-brainrot-original.png',key:'steal-a-brainrot',count:products.filter(p=>/brainrot|steal.a.brainrot/i.test([p.game,p.product_key,p.name].join(' '))).length}
 ];
 g.innerHTML='<div class="game-tiles">'+games.map(x=>'<article class="game-tile" data-game-group="'+escapeHtml(x.category)+'"><button type="button" class="game-tile-btn" data-game-open="'+escapeHtml(x.key)+'" aria-label="'+escapeHtml(x.name)+'"><div class="game-tile-art game-art-'+escapeHtml(x.key)+'"><span class="game-tile-brand">'+({roblox:'ROBLOX',pubg:'PUBG MOBILE',freefire:'FREE FIRE',fortnite:'FORTNITE'}[x.key]||escapeHtml(x.name.toUpperCase()))+'</span>'+(x.image?'<img loading="eager" decoding="async" referrerpolicy="no-referrer" src="'+x.image+'" alt="" onerror="this.remove()">':'')+'</div><div class="game-tile-yellow"></div><div class="game-tile-info"><strong>'+escapeHtml(x.name)+'</strong><small>'+(x.count?x.count+' باقة':'قريبًا')+'</small></div></button></article>').join('')+'</div>';
 g.querySelectorAll('[data-game-open]').forEach(btn=>btn.addEventListener('click',()=>{
  const key=btn.dataset.gameOpen;
  if(key==='roblox'){if(typeof window.openRobuxPackages==='function')window.openRobuxPackages();else if(typeof window.openRobloxGameMenu==='function')window.openRobloxGameMenu();return;}
  if(key==='mm2'){if(typeof window.openMm2StoreCategory==='function')window.openMm2StoreCategory();else toast('قسم MM2 غير جاهز حاليًا.');return;}
  if(key==='steal-a-brainrot'){if(typeof window.openBrainrotStoreCategory==='function')window.openBrainrotStoreCategory();else toast('قسم ماب السرقة غير جاهز حاليًا.');return;}
 }));
}
/* Non-Roblox digital items use the atomic wallet-to-code delivery checkout. */
function showGameProductPreview(key){
 // Always route PUBG to its dedicated catalog: 60 UC is a manual player-ID
 // top-up and must never be sent through the automatic voucher checkout.
 if(String(key||'').trim().toLowerCase()==='pubg'&&typeof window.renderPremiumPubg==='function'){
   window.renderPremiumPubg();
   return;
 }
 // Never present an MM2 item as a standalone digital game or instant code.
 if(/mm2|murder[\s_-]*mystery/i.test(String(key||''))){
   if(typeof window.openRobloxGameMenu==='function')window.openRobloxGameMenu();
   return;
 }
 const box=$('#storePurchaseBox');if(!box)return;
 const items=products.filter(p=>String(p.game||'').trim().toLowerCase()===key);
 const label=({fortnite:'فورت نايت',freefire:'فري فاير',pubg:'ببجي موبايل'}[key]||key.replace(/[-_]/g,' '));
 box.innerHTML='<section class="panel digital-game-preview" style="margin-top:20px;padding:20px;border-radius:20px"><div class="digital-game-cover"><img src="'+(key==='fortnite'?'https://images.launchbox-app.com/5aca9e55-9c6d-421e-b6f9-8910b82c11fc.jpg':key==='freefire'?'https://images.launchbox-app.com/1a210ab9-e0f5-46f0-967b-ec5703e7e28c.jpg':'')+'" alt="" loading="eager" decoding="async" onerror="this.style.visibility=\'hidden\'"></div><h3>'+escapeHtml(label)+'</h3>'+(items.length?items.map(p=>'<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;padding:12px 0;border-bottom:1px solid #ffffff25"><strong>'+escapeHtml(p.name)+'</strong><span>'+Number(p.price||0).toFixed(2)+' د.ل</span><button type="button" class="btn btn-primary" data-instant-buy="'+escapeHtml(p.id)+'">شراء واستلام الكود</button></div>').join(''):'<p>مافيش باقات متوفرة حالياً.</p>')+'<p class="form-note" style="margin-top:16px">الشراء الفوري متاح للباقات اللي عندها أكواد بالمخزون فقط. ما يتم خصم أي مبلغ لو الكود مش متوفر.</p><button type="button" class="btn btn-soft" id="closeGamePreview">إغلاق</button></section>';
 box.querySelector('#closeGamePreview').onclick=()=>{box.innerHTML=''};
 box.querySelectorAll('[data-instant-buy]').forEach(btn=>btn.onclick=()=>{
  const product=items.find(p=>String(p.id)===btn.dataset.instantBuy);
  if(product&&window.openInstantCodeCheckout)window.openInstantCodeCheckout(product.id,product.name,product.price);
 });
 box.scrollIntoView({behavior:'auto',block:'start'});
}
function applyWalletTransactionFilter(){
 const selected=$('[data-wallet-filter].active')?.dataset.walletFilter||'all';
 $$('#topupHistory .wallet-transaction').forEach(row=>{
  row.hidden=selected!=='all'&&row.dataset.walletStatus!==selected;
 });
}
function walletTransactionRows(list){
 if(!list?.length)return '<div class="wallet-transactions-empty">ما عندكش طلبات شحن لحد الآن.</div>';
 const symbol='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17V6m0 0L7.5 10.5M12 6l4.5 4.5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg>';
 const chevron='<svg class="wallet-tx-chevron" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 5 7 7-7 7"/></svg>';
 return list.map(x=>{
  const state=['approved','rejected'].includes(x.status)?x.status:'pending';
  const statusDetail=state==='approved'?'تم اعتماد الشحن وإضافة الرصيد':state==='rejected'?'مرفوض':'بانتظار مراجعة الإدارة';
  const statusShort=state==='approved'?'مكتمل':state==='rejected'?'مرفوض':'معلّق';
  const step=state==='approved'?'done':state==='rejected'?'stopped':'current';
  const carrier=x.method==='libyana'?'ليبيانا':'المدار';
  const provider=x.method==='libyana'?'libyana':'madar';
  const value=Number(x.amount),amount=Number.isFinite(value)?value.toFixed(2):'—';
  const date=new Date(x.created_at),shownDate=Number.isNaN(date.getTime())?'غير متوفر':date.toLocaleString('ar-LY',{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
  const tracking=escapeHtml(String(x.id||'').slice(0,8).toUpperCase());
  const reference=x.transfer_reference?escapeHtml(String(x.transfer_reference)):'غير متوفر';
  const note=x.admin_note?'<p class="wallet-tx-admin-note">ملاحظة الإدارة: '+escapeHtml(String(x.admin_note))+'</p>':'';
  return '<details class="wallet-transaction" data-wallet-status="'+state+'">'
   +'<summary class="wallet-transaction-line" aria-label="شحن '+carrier+'، '+amount+' دينار، '+statusShort+'، عرض التفاصيل">'
    +'<span class="wallet-tx-icon wallet-tx-'+provider+'">'+symbol+'</span>'
    +'<b class="wallet-tx-name">شحن '+carrier+'</b>'
    +'<strong class="wallet-tx-amount" dir="ltr">'+amount+' <small>د.ل</small></strong>'
    +'<span class="wallet-tx-badge '+state+'">'+statusShort+'</span>'
    +chevron
   +'</summary>'
   +'<div class="wallet-transaction-detail">'
    +'<div class="wallet-tx-detail-row"><span>رقم المتابعة</span><b dir="ltr">#'+tracking+'</b></div>'
    +'<div class="wallet-tx-detail-row"><span>التاريخ</span><b>'+escapeHtml(shownDate)+'</b></div>'
    +'<div class="wallet-tx-detail-row"><span>رقم العملية</span><b dir="auto">'+reference+'</b></div>'
    +'<div class="wallet-tx-process"><span class="complete">تم إنشاء الطلب</span><i></i><span class="'+step+'">'+statusDetail+'</span></div>'
    +note
   +'</div>'
  +'</details>';
 }).join('');
}
function initWalletShowcase(){const btn=$('#walletActionTopup');if(!btn||btn.dataset.ready)return;btn.dataset.ready='1';btn.onclick=()=>{const form=$('#topupForm'),gate=$('#libyanaTopupGate');(form&&form.style.display!=='none'?form:gate||form)?.scrollIntoView({behavior:'smooth',block:'start'})};$('#walletActionTransfer').onclick=()=>window.L1017nWalletLuxe?.openSend?.();$('#walletActionSend').onclick=()=>{if(window.L1017nWalletLuxe?.openSend)window.L1017nWalletLuxe.openSend();else toast('خدمة إرسال الرصيد غير مفعّلة حالياً')};$$('[data-wallet-filter]').forEach(b=>b.addEventListener('click',()=>{$$('[data-wallet-filter]').forEach(x=>x.classList.toggle('active',x===b));applyWalletTransactionFilter()}))}
async function refreshHomeShowcase(){try{const user=await currentUser();const name=$('#homeGreetingName');if(name)name.textContent=user?(user.user_metadata?.full_name||user.user_metadata?.name||user.email?.split('@')[0]||'بك'):'بك';let balance=0;if(user){const {data}=await supabaseClient.from('wallet_accounts').select('balance').eq('user_id',user.id).maybeSingle();balance=Number(data?.balance||0)}if($('#homeBalanceValue'))$('#homeBalanceValue').textContent=balance.toFixed(3);if($('#homeMainBalance'))$('#homeMainBalance').textContent=balance.toFixed(3)+' د.ل'}catch(e){console.warn('Home wallet summary unavailable',e)}}
$('#homeNoticeBtn')?.addEventListener('click',()=>toast('لا توجد إشعارات جديدة'));
let topupModalProvider='libyana';
function openTopupModal(){const m=$('#topupModal');if(!m)return;topupModalProvider='libyana';document.querySelectorAll('[data-modal-provider]').forEach(b=>b.classList.toggle('selected',b.dataset.modalProvider==='libyana'));m.classList.remove('hidden');document.body.classList.add('topup-modal-open');$('#topupModalClose')?.focus()}
function closeTopupModal(){const m=$('#topupModal');m?.classList.add('hidden');document.body.classList.remove('topup-modal-open')}
$('#topupModalClose')?.addEventListener('click',closeTopupModal);
$('#topupModal')?.addEventListener('click',e=>{if(e.target.id==='topupModal')closeTopupModal()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeTopupModal()});
document.querySelectorAll('[data-modal-provider]').forEach(b=>b.addEventListener('click',()=>{topupModalProvider=b.dataset.modalProvider;document.querySelectorAll('[data-modal-provider]').forEach(x=>x.classList.toggle('selected',x===b))}));
$('#topupModalContinue')?.addEventListener('click',async()=>{closeTopupModal();const user=await currentUser();if(!user){switchView('account');toast('سجّل دخولك أولاً لشحن المحفظة');return}switchView('wallet');const radio=$('input[name="provider"][value="'+topupModalProvider+'"]');if(radio){radio.checked=true;radio.dispatchEvent(new Event('change',{bubbles:true}))}setTimeout(()=>{if(topupModalProvider==='libyana'&&typeof window.openDedicatedTopup==='function'){window.openDedicatedTopup();return}const gate=$('#libyanaTopupGate');const form=$('#topupForm');const target=gate&&gate.style.display!=='none'?gate:form;target?.scrollIntoView({behavior:'smooth',block:'start'})},300)});
function switchView(view){if(view!=='wallet')window.L1017nWalletLuxe?.closeSend();document.body.classList.toggle('auth-screen',view==='account'&&!$('#authForm')?.classList.contains('hidden'));const map={home:['#storeView'],store:['#storeView'],wallet:['#walletView'],orders:['#ordersView'],account:['#accountView'],leaderboard:['#leaderboardView'],subscriptions:['#subscriptionsView']};const sections=['#homeView','#storeView','.wallet-promo','.steps-section','#walletView','#ordersView','#accountView','#leaderboardView','#subscriptionsView','#adminView'];sections.forEach(s=>{const n=$(s);if(n)n.classList.add('hidden')});(map[view]||map.home).forEach(s=>{const n=$(s);if(n)n.classList.remove('hidden')});$$('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));if(view==='home')refreshHomeShowcase();if(view==='wallet'){renderWallet();window.L1017nWalletLuxe?.activate();}if(view==='orders')renderOrders();if(view==='account')void renderAccount();if(view==='leaderboard'){(window.loadLeaderboard||loadLeaderboard)();if(window.renderLeaderboardProfile)window.renderLeaderboardProfile();}window.scrollTo({top:0,behavior:'smooth'})}
function selectedProvider(){const value=$('input[name="provider"]:checked')?.value||'libyana';return value==='madar'?'almadar':value}
function instructions(){if(typeof window.refreshAutoTopup==='function')window.refreshAutoTopup()}
async function renderWallet(){initWalletShowcase();if(typeof window.refreshAutoTopup==='function')window.refreshAutoTopup();const user=await currentUser();const topupForm=$('#topupForm');if(topupForm){let gate=$('#libyanaTopupGate');if(!gate){gate=document.createElement('div');gate.id='libyanaTopupGate';gate.className='panel';gate.style.cssText='padding:20px;text-align:center;border-radius:16px;margin-bottom:14px';topupForm.parentNode.insertBefore(gate,topupForm)}let allowed=false;if(user){const r=await supabaseClient.from('wallet_accounts').select('libyana_phone').eq('user_id',user.id).maybeSingle();allowed=!r.error&&!!r.data?.libyana_phone}topupForm.style.display=allowed?'':'none';gate.style.display=allowed?'none':'';gate.innerHTML='<h3>📱 يجب تسجيل رقم الهاتف أولاً</h3><p>قبل استخدام المحفظة، سجّل رقم هاتفك على حسابك. الرقم لا يمكن تسجيله في حساب ثانٍ.</p><button type="button" class="btn btn-primary" id="goLibyanaSettings">إدخال رقم الهاتف ←</button>';gate.querySelector('button').onclick=()=>switchView('account')} if(!user){$('#balanceAmount').textContent='0.00';if($('#walletShowcaseBalance')){if(window.L1017nWalletLuxe?.resetBalance)window.L1017nWalletLuxe.resetBalance($('#walletShowcaseBalance'));else $('#walletShowcaseBalance').textContent='0.000';}if($('#madarWalletBalance')){if(window.L1017nWalletLuxe?.resetBalance)window.L1017nWalletLuxe.resetBalance($('#madarWalletBalance'));else $('#madarWalletBalance').textContent='0.000';}if($('#primaryWalletBalance'))$('#primaryWalletBalance').textContent='0.000 د.ل';$('#walletUserState').innerHTML='<i></i> غير مسجل';$('#topupHistory').innerHTML='<div class="muted">سجّل دخولك أولاً باش تقدر تشحن المحفظة.</div>';return}const {data:wallet}=await supabaseClient.from('wallet_accounts').select('balance,madar_balance,primary_balance').eq('user_id',user.id).maybeSingle();if($('#madarWalletBalance')){const val=Number(wallet?.madar_balance||0);if(window.L1017nWalletLuxe?.animateBalance)window.L1017nWalletLuxe.animateBalance($('#madarWalletBalance'),val);else $('#madarWalletBalance').textContent=val.toFixed(3);}if($('#primaryWalletBalance'))$('#primaryWalletBalance').textContent=Number(wallet?.primary_balance||0).toFixed(3)+' د.ل';$('#balanceAmount').textContent=Number(wallet?.balance||0).toFixed(2);if($('#walletShowcaseBalance')){const val=Number(wallet?.balance||0);if(window.L1017nWalletLuxe?.animateBalance)window.L1017nWalletLuxe.animateBalance($('#walletShowcaseBalance'),val);else $('#walletShowcaseBalance').textContent=val.toFixed(3);}$('#walletUserState').innerHTML='<i></i> '+escapeHtml(user.email);const {data:list,error}=await supabaseClient.from('topup_requests').select('id,user_id,amount,method,transfer_reference,status,created_at,admin_note').eq('user_id',user.id).order('created_at',{ascending:false}).limit(20);if(error){$('#topupHistory').innerHTML='<div class="muted">تعذر تحميل طلبات الشحن. حاول تحديث الصفحة.</div>';return}$('#topupHistory').innerHTML=walletTransactionRows(list);applyWalletTransactionFilter();instructions()}
async function renderOrders(){
 const root=$('#ordersList');if(!root)return;
 const user=await currentUser();
 if(!user){root.innerHTML='<div class="orders-empty">سجّل دخولك أولاً لمتابعة طلباتك.<br><button type="button" class="btn btn-primary" data-view="account">تسجيل الدخول</button></div>';return}
 const [pr,tr]=await Promise.all([
  supabaseClient.from('purchase_orders').select('id,product_id,product_name,total_amount,roblox_username,status,created_at,admin_note').eq('user_id',user.id).order('created_at',{ascending:false}).limit(50),
  supabaseClient.from('topup_requests').select('id,amount,method,transfer_reference,status,created_at,admin_note').eq('user_id',user.id).order('created_at',{ascending:false}).limit(50)
 ]);
 if(pr.error||tr.error){root.innerHTML='<p class="orders-empty">تعذر تحميل الطلبات. حاول مرة ثانية.</p>';return}
 let receivedCodes=[];
 if(typeof window.getMyInstantCodes==='function'){
  try{receivedCodes=await window.getMyInstantCodes()}catch(_){receivedCodes=[]}
 }
 const codeMap=new Map(receivedCodes.map(x=>[String(x.order_id),String(x.code)]));
 // Identify item category by the actual linked product, not only item name.
 // This matters for characters named "قرما" or "لاسيكرت".
 const handover=window.L1017nManualHandover;
 const productIds=[...new Set((pr.data||[]).map(x=>x.product_id).filter(Boolean))];
 const categories=new Map();
 if(handover&&productIds.length){
   try{
     const {data:linked,error:lookupError}=await supabaseClient.from('products')
       .select('id,game,product_key').in('id',productIds);
     if(!lookupError)(linked||[]).forEach(p=>categories.set(String(p.id),p));
   }catch(err){console.warn('[orders/handover] Product lookup failed',err)}
 }

 const orders=[...(pr.data||[]).map(x=>({...x,kind:'purchase'})),...(tr.data||[]).map(x=>({...x,kind:'topup'}))].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
 const group=x=>['rejected','refunded'].includes(x.status)?'refunded':x.status==='completed'||x.status==='approved'?'completed':'pending';
 const status=x=>group(x)==='completed'?'مكتملة':group(x)==='refunded'?'مسترجعة':'قيد التنفيذ';
 const icon=x=>x.kind==='topup'?'＋':/roblox|robux|روبلوكس|روبوكس/i.test(x.product_name||'')?'◆':/pubg|ببجي/i.test(x.product_name||'')?'🎮':/fortnite|فورت/i.test(x.product_name||'')?'★':'▣';
 const label=x=>x.kind==='topup'?'شحن '+(x.method==='libyana'?'ليبيانا':'المدار الجديد'):(x.product_name||'طلب شراء');
 const date=x=>new Date(x.created_at).toLocaleDateString('en-GB');
 const tabs='<div class="orders-filter-tabs" role="group" aria-label="تصفية الطلبات"><button class="active" type="button" data-order-filter="all">الكل</button><button type="button" data-order-filter="pending">قيد التنفيذ</button><button type="button" data-order-filter="completed">مكتملة</button><button type="button" data-order-filter="refunded">مسترجعة</button></div>';
 const manualOrders=new Map();
 const cards=orders.map(x=>{
   const g=group(x),title=escapeHtml(label(x)),
     amount=Number(x.kind==='topup'?x.amount:x.total_amount||0).toFixed(3),
     details=escapeHtml(x.kind==='topup'?'شحن محفظة':(x.roblox_username==='DIGITAL_CODE'?'كود رقمي تم تسليمه':(x.roblox_username?'@'+x.roblox_username:'طلب شراء'))),
     note=x.admin_note?'<p class="orders-card-note">'+escapeHtml(x.admin_note)+'</p>':'';
   const product=categories.get(String(x.product_id))||null;
   const manual=!!(x.kind==='purchase'&&g==='pending'&&x.roblox_username!=='DIGITAL_CODE'&&handover
     && (product?handover.isManualProduct(product.game,product.product_key)
       :/MM2|Murder Mystery 2|steal a brainrot|ماب السرقة/i.test(x.product_name||'')));
   if(manual)manualOrders.set(String(x.id),{
     id:x.id,product_name:x.product_name,total_amount:x.total_amount,
     roblox_username:x.roblox_username,game:product?.game||(/steal a brainrot|ماب السرقة/i.test(x.product_name||'')?'steal-a-brainrot':'mm2'),
     product_key:product?.product_key||''
   });
   const contact=manual?'<div class="orders-manual-handover"><p>لتستلم الغرض داخل الماب، لازم تكلم المتجر عبر واتساب أو تيليجرام وتذكر رقم الطلب.</p><button type="button" data-order-contact="'+escapeHtml(x.id)+'">تواصل لاستلام الغرض</button></div>':'';
   return '<article class="orders-modern-card" data-order-status="'+g+'"><div class="orders-game-icon '+(x.kind==='topup'?'orders-icon-topup':'')+'">'+icon(x)+'</div><div class="orders-card-main"><div class="orders-card-title">'+title+'</div><div class="orders-card-meta">'+date(x)+' · '+details+'</div><div class="orders-card-id">#'+escapeHtml(x.id.slice(0,8).toUpperCase())+'</div>'+note+(codeMap.has(x.id)?'<button type="button" class="btn btn-soft" data-order-code="'+escapeHtml(x.id)+'">🔑 عرض الكود</button>':'')+'</div><div class="orders-card-side"><strong>'+amount+' <small>د.ل</small></strong><span class="orders-status orders-status-'+g+'">'+(g==='completed'?'✓ ':g==='refunded'?'↶ ':'◷ ')+status(x)+'</span></div>'+contact+'</article>';
 }).join('');
 root.innerHTML=tabs+'<div class="orders-modern-list">'+(cards||'<p class="orders-empty">ما عندكش طلبات حتى الآن.</p>')+'</div><p class="orders-empty orders-filter-empty" hidden>ما فيش طلبات في هذا التصنيف.</p>';

 // Premium orders dashboard; all metrics are derived from the signed-in user's existing order records.
 const primeCounts={all:orders.length,pending:0,completed:0,refunded:0};
 orders.forEach(order=>{primeCounts[group(order)]++});
 const primeIntro='<div class="orders-prime-heading"><div><strong>طلباتك تحت المتابعة</strong><p>حالة كل طلب وتفاصيله في مكان واحد</p></div>'
  +'<button type="button" class="orders-prime-refresh" data-orders-reload aria-label="تحديث الطلبات"><svg viewBox="0 0 24 24" aria-hidden="true">'
  +'<path d="M20 11a8 8 0 1 0-2.1 5.4M20 4v7h-7" stroke-linecap="round" stroke-linejoin="round"/></svg>تحديث</button></div>';
 const primeStats='<div class="orders-prime-stats" aria-label="إحصائيات الطلبات">'
  +'<div class="orders-prime-stat"><span>كل الطلبات</span><strong>'+primeCounts.all+'</strong></div>'
  +'<div class="orders-prime-stat"><span>قيد التنفيذ</span><strong>'+primeCounts.pending+'</strong></div>'
  +'<div class="orders-prime-stat"><span>مكتملة</span><strong>'+primeCounts.completed+'</strong></div></div>';
 root.insertAdjacentHTML('afterbegin',primeIntro+primeStats);
 root.querySelectorAll('[data-order-filter]').forEach(button=>{
   const count=document.createElement('span');count.className='orders-tab-count';
   count.textContent=String(primeCounts[button.dataset.orderFilter]||0);button.appendChild(count);
 });
 [...root.querySelectorAll('.orders-modern-card')].forEach((card,index)=>{
   const order=orders[index],state=group(order);
   const help=state==='completed'
     ?(order.kind==='topup'?'تم اعتماد شحن المحفظة وفق حالة الطلب.':'تم إكمال طلبك وفق الحالة المسجلة.')
     :state==='refunded'?'تم إغلاق هذا الطلب؛ راجع ملاحظات المتجر إن وجدت.'
     :order.kind==='topup'?'طلب شحن المحفظة مسجل، وستتغير حالته بعد التحقق من التحويل.'
     :'تم تسجيل طلب الشراء، وسيتم تحديث حالته بعد التنفيذ.';
   const stages=state==='refunded'?['تم تسجيل الطلب','قيد المراجعة','أُغلق الطلب']:['تم تسجيل الطلب','قيد المعالجة','مكتمل'];
   const stepIndex=state==='pending'?1:2;
   const track='<div class="orders-stage-track" aria-label="مراحل الطلب">'
      +stages.map((step,i)=>'<span class="'+(i<=stepIndex?'is-on':'')+'">'+step+'</span>').join('')+'</div>';
   const details=document.createElement('details');details.className='orders-extra-details';
   details.innerHTML='<summary>عرض تفاصيل الطلب</summary><div class="orders-detail-body">'
       +'<p class="orders-detail-help">'+help+'</p>'+track
       +(order.kind==='topup'&&order.transfer_reference?'<div class="orders-detail-ref">'
        +'<span>مرجع التحويل</span><b>'+escapeHtml(order.transfer_reference)+'</b></div>':'')
       +'<div class="orders-detail-actions"></div></div>';
   const actions=details.querySelector('.orders-detail-actions');
   const id=card.querySelector('.orders-card-id');if(id)actions.appendChild(id);
   const copy=document.createElement('button');copy.type='button';copy.className='orders-copy-id';
   copy.dataset.orderCopy=String(order.id);copy.textContent='نسخ رقم الطلب';actions.appendChild(copy);
   const note=card.querySelector('.orders-card-note');if(note)actions.appendChild(note);
   const codeButton=card.querySelector('[data-order-code]');
   if(codeButton){codeButton.textContent='عرض الكود الرقمي';actions.appendChild(codeButton)}
   card.appendChild(details);
 });
 if(!orders.length){
   const list=root.querySelector('.orders-modern-list');
   if(list)list.innerHTML='<div class="orders-empty-state"><span class="orders-empty-mark" aria-hidden="true">▤</span>'
     +'<h3>ما عندكش طلبات حتى الآن</h3><p>أول ما تشحن محفظتك أو تطلب منتج، بتشوف طلبك هنا.</p>'
     +'<button type="button" data-orders-shop>تصفح المنتجات</button></div>';
 }else{
   root.insertAdjacentHTML('beforeend','<div class="orders-prime-note"><span class="orders-note-mark" aria-hidden="true">i</span>'
      +'<div><strong>كيف تتابع طلبك؟</strong><p>افتح تفاصيل الطلب لمتابعة الحالة أو نسخ رقم الطلب، وعرض الكود والملاحظات إن وجدت.</p></div></div>');
 }
 root.querySelector('[data-orders-reload]')?.addEventListener('click',()=>{void renderOrders()});
 root.querySelector('[data-orders-shop]')?.addEventListener('click',()=>switchView('store'));
 root.querySelectorAll('[data-order-copy]').forEach(button=>button.addEventListener('click',async()=>{
   const id=button.dataset.orderCopy;
   try{
     if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');
     await navigator.clipboard.writeText(id);button.textContent='تم نسخ الرقم';
     setTimeout(()=>{if(button.isConnected)button.textContent='نسخ رقم الطلب'},1700);
   }catch(_){toast('رقم طلبك: '+id)}
 }));

 root.querySelectorAll('[data-order-contact]').forEach(btn=>btn.addEventListener('click',()=>{
   const order=manualOrders.get(btn.dataset.orderContact);
   if(order&&handover)handover.open(order);
 }));
 root.querySelectorAll('[data-order-code]').forEach(btn=>btn.addEventListener('click',()=>{
  const code=codeMap.get(btn.dataset.orderCode);
  if(code&&typeof window.showInstantCode==='function')window.showInstantCode('الكود الخاص بطلبك',code);
 }));

 root.querySelectorAll('[data-order-filter]').forEach(b=>b.addEventListener('click',()=>{root.querySelectorAll('[data-order-filter]').forEach(t=>t.classList.toggle('active',t===b));let visible=0;root.querySelectorAll('[data-order-status]').forEach(card=>{const show=b.dataset.orderFilter==='all'||card.dataset.orderStatus===b.dataset.orderFilter;card.hidden=!show;if(show)visible++});const empty=root.querySelector('.orders-filter-empty');if(empty)empty.hidden=visible!==0||orders.length===0}));
}

/* GameBoxly Robux quantity calculator.
   Uses active catalog prices; an arbitrary input is an estimate, never a checkout SKU.
   Exact checkout still calls the existing server-validated product RPC. */
function mountRobuxQuantityCalculator(modal,robux){
 // The customer can enter ANY integer Robux quantity, not only catalog packages.
 // The server computes and validates the authoritative price and checks inventory.
 const offers=robux.map(p=>({id:String(p.id),amount:Number(p.amount),price:Number(p.price)}))
   .filter(p=>Number.isSafeInteger(p.amount)&&p.amount>0&&Number.isFinite(p.price)&&p.price>0)
   .sort((a,b)=>a.amount-b.amount||a.price-b.price);
 const anchor=modal.querySelector('.robux-reference-section');
 if(!anchor||!offers.length)return;
 const firstAmount=Math.min(100,Math.max(1,robuxAvailable));
 const section=document.createElement('section');
 section.className='robux-quantity-calculator';
 section.setAttribute('aria-label','اختيار كمية الروبوكس');
 const rqcArt='<svg class="rqc-coin-art" viewBox="0 0 112 112" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'
   +'<circle cx="56" cy="56" r="40" stroke="#C3ADFF" stroke-opacity=".27" stroke-width="2"/>'
   +'<circle cx="56" cy="56" r="33" fill="#3B2B78" stroke="#BDA4FF" stroke-width="2"/>'
   +'<rect x="37" y="37" width="38" height="38" rx="5" transform="rotate(25 56 56)" fill="#E0D1FF"/>'
   +'<rect x="49" y="49" width="14" height="14" rx="2" transform="rotate(25 56 56)" fill="#35215F"/>'
   +'<path d="M83 18l2.5 6.5L92 27l-6.5 2.5L83 36l-2.5-6.5L74 27l6.5-2.5L83 18Z" fill="#F9DFA2"/>'
   +'<path d="M25 70l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" fill="#A3F0DD"/>'
   +'</svg>';
 section.innerHTML='<div class="rqc-heading"><div class="rqc-header-copy"><small><span class="rqc-header-dot" aria-hidden="true"></span> GAMEBOXLY · ROBUX</small><h2>اختار كمية الروبوكس</h2><p>على كيفك، أي عدد تبيه</p></div><div class="rqc-icon" aria-hidden="true">'+rqcArt+'</div></div>'
   +'<label class="rqc-label" for="robuxCustomQuantity">اكتب العدد اللي تبيه، حتى لو مش موجود في الباقات</label>'
   +'<div class="rqc-picker"><button class="rqc-step rqc-plus" type="button" aria-label="زيادة روبوكس واحد"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button>'
   +'<div class="rqc-input-box"><span class="rqc-input-gem" aria-hidden="true">◆</span><input id="robuxCustomQuantity" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off" value="'+firstAmount+'" aria-describedby="robuxQuantityFeedback" placeholder="اكتب العدد"><span>Robux</span></div>'
   +'<button class="rqc-step rqc-minus" type="button" aria-label="تقليل روبوكس واحد"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg></button></div>'
   +'<div class="rqc-quick-label"><span>اختيارات سريعة</span><small>أو اكتب أي عدد بنفسك</small></div>'
   +'<div class="rqc-quick-amounts" role="group" aria-label="اختيارات روبوكس سريعة">'
   +[100,200,300,500,750,1000].map(q=>'<button class="rqc-amount-chip" type="button" data-rqc-amount="'+q+'">'+q+'</button>').join('')
   +'</div>'
   +'<div class="rqc-total"><div class="rqc-total-description"><span class="rqc-price-eyebrow">المجموع بالدينار الليبي</span><span class="rqc-total-count">سعر <b id="robuxQuantitySelected">'+firstAmount+'</b> روبوكس</span></div><div class="rqc-price-wrap"><strong id="robuxQuantityPrice" dir="ltr">—</strong></div></div>'
   +'<p id="robuxQuantityFeedback" class="rqc-feedback" aria-live="polite"></p>'
   +'<button type="button" class="rqc-select" disabled><span class="rqc-cta-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></span><span class="rqc-cta-text">جاري حساب السعر…</span></button>';
 anchor.before(section);
 const input=section.querySelector('#robuxCustomQuantity');
 const priceEl=section.querySelector('#robuxQuantityPrice');
 const selectedEl=section.querySelector('#robuxQuantitySelected');
 const feedback=section.querySelector('#robuxQuantityFeedback');
 const button=section.querySelector('.rqc-select');
 const plus=section.querySelector('.rqc-plus');
 const minus=section.querySelector('.rqc-minus');
 const chips=[...section.querySelectorAll('[data-rqc-amount]')];
 const money=n=>Number(n).toFixed(2)+' د.ل';
 const normalize=value=>String(value).replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632))
   .replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).trim();
 let quoteSeq=0,quoteTimer=null,confirmed=null;
 const maxQuantity=()=>Math.min(100000,Math.max(0,Number(robuxAvailable)||0));
 function clearPrevious(){
   modal.querySelectorAll('.robux-package.selected').forEach(tile=>{
     tile.classList.remove('selected');
     const plusIcon=tile.querySelector('.robux-plus');
     if(plusIcon)plusIcon.textContent='＋';
   });
   modal.querySelector('.robux-checkout-bar')?.classList.remove('visible');
 }
 function chooseQuantity(q){
   input.value=String(q);
   clearPrevious();
   update();
 }
 function localEstimate(quantity){
   if(!Number.isSafeInteger(quantity)||quantity<1||!offers.length)return null;
   let lower=offers.filter(p=>p.amount<=quantity).slice(-1)[0];
   let upper=offers.find(p=>p.amount>=quantity);
   if(!lower)lower=upper;
   if(!upper)upper=lower;
   if(!lower||!upper)return null;
   const result=lower.amount===upper.amount
     ?lower.price*quantity/lower.amount
     :lower.price+(upper.price-lower.price)*(quantity-lower.amount)/(upper.amount-lower.amount);
   return Math.ceil(result*100-1e-8)/100;
 }
 function update(){
   const seq=++quoteSeq;
   if(quoteTimer)clearTimeout(quoteTimer);
   confirmed=null;
   const typed=normalize(input.value),valid=/^[0-9]{1,6}$/.test(typed);
   const quantity=valid?Number(typed):NaN;
   const limit=maxQuantity();
   const allowed=Number.isSafeInteger(quantity)&&quantity>=1&&quantity<=limit;
   selectedEl.textContent=valid?String(quantity):'—';
   plus.disabled=!Number.isSafeInteger(quantity)||quantity>=limit;
   minus.disabled=!Number.isSafeInteger(quantity)||quantity<=1;
   chips.forEach(chip=>{
     const n=Number(chip.dataset.rqcAmount);
     chip.disabled=n>limit;
     chip.classList.toggle('is-selected',quantity===n);
     chip.setAttribute('aria-pressed',String(quantity===n));
   });
   priceEl.textContent='—';
   button.disabled=true;
   button.querySelector('.rqc-cta-text').textContent='متابعة للشراء';
   button.dataset.customQuantity='';
   if(!typed){feedback.textContent='اكتب أي كمية روبوكس تبيها.';return;}
   if(!valid||!Number.isSafeInteger(quantity)||quantity<=0){
     feedback.textContent='لازم تكتب عدد صحيح من روبوكس.';return;
   }
   if(quantity>limit){
     feedback.textContent=limit>0?'الكمية المطلوبة غير متوفرة حاليًا، اختار كمية أصغر.':'الروبوكس غير متوفر حاليًا.';
     return;
   }
   const estimate=localEstimate(quantity);
   if(estimate!==null)priceEl.textContent='≈ '+money(estimate);
   feedback.textContent='جاري تأكيد السعر من المتجر…';
   quoteTimer=setTimeout(async()=>{
     try{
       const {data,error}=await supabaseClient.rpc('quote_custom_robux',{p_amount:quantity});
       if(seq!==quoteSeq||!modal.isConnected||modal.classList.contains('hidden'))return;
       if(error)throw error;
       const quoted=Number(data);
       if(!Number.isFinite(quoted)||quoted<=0)throw new Error('invalid_quote');
       if(quantity>maxQuantity()){update();return;}
       confirmed={amount:quantity,price:Number(quoted.toFixed(2))};
       priceEl.textContent=money(confirmed.price);
       feedback.textContent='السعر نهائي لهذه الكمية حاليًا، ويُراجع عند تأكيد الشراء.';
       button.disabled=false;
       button.dataset.customQuantity=String(quantity);
       button.querySelector('.rqc-cta-text').textContent='متابعة لشراء '+quantity+' روبوكس';
     }catch(err){
       if(seq!==quoteSeq)return;
       priceEl.textContent='—';
       button.disabled=true;
       feedback.textContent='تعذر تأكيد السعر. تحقق من الاتصال وحاول من جديد.';
       console.warn('[robux/quote] Quote unavailable',err);
     }
   },180);
 }
 plus.addEventListener('click',()=>{
   const q=Number(normalize(input.value));
   if(Number.isSafeInteger(q)&&q<maxQuantity())chooseQuantity(q+1);
 });
 minus.addEventListener('click',()=>{
   const q=Number(normalize(input.value));
   if(Number.isSafeInteger(q)&&q>1)chooseQuantity(q-1);
 });
 chips.forEach(chip=>chip.addEventListener('click',()=>chooseQuantity(Number(chip.dataset.rqcAmount))));
 input.addEventListener('input',()=>{clearPrevious();update()});
 button.addEventListener('click',()=>{
   const q=Number(normalize(input.value));
   if(!confirmed||confirmed.amount!==q||button.disabled||q>maxQuantity()){update();return}
   const grid=modal.querySelector('.package-grid');
   if(!grid)return;
   let tile=grid.querySelector('.robux-custom-package');
   if(!tile){
     tile=document.createElement('button');tile.type='button';
     tile.className='robux-package robux-custom-package';
     tile.style.cssText='display:none!important';
     grid.appendChild(tile);
   }
   tile.dataset.robux='custom:'+q;
   tile.dataset.customPrice=String(confirmed.price);
   tile.innerHTML='<span class="robux-plus">＋</span><strong>'+q+' Robux</strong><small>'+money(confirmed.price)+'</small>';
   tile.disabled=false;
   tile.click(); // Uses existing selected-package checkout and username verification.
 });
 modal.addEventListener('click',event=>{
   const tile=event.target.closest('.robux-package[data-robux]');
   if(!tile||tile.disabled||tile.classList.contains('robux-custom-package'))return;
   const offer=offers.find(p=>p.id===tile.dataset.robux);
   if(offer){input.value=String(offer.amount);update();}
 });
 modal.addEventListener('robux-inventory-updated',update);
 update();
}
function openRobuxPackages(){document.getElementById('robuxPurchaseScreen')?.remove();const robux=products.filter(p=>(String(p.game||'').toLowerCase()==='roblox'||/robux|روبوكس/i.test(p.name||''))&&Number(p.amount)===100).sort((a,b)=>Number(a.price)-Number(b.price)).slice(0,1);let modal=$('#robuxModal');if(!modal){modal=document.createElement('div');modal.id='robuxModal';modal.className='package-modal robux-full-page hidden';document.body.appendChild(modal)}modal.classList.remove('robux-checkout-mode');modal.innerHTML='<div class="package-box robux-store-box"><button class="package-close" data-close-packages aria-label="رجوع">➜</button><div class="robux-reference-hero"><div class="robux-reference-logo"><img src="game-covers/roblox-mark.svg?v=logo-square1" alt="Roblox"></div><h1>Roblox</h1><span class="robux-reference-tag">◆ شحن روبوكس</span></div><div class="robux-reference-features">'
+'<span class="rqc-feature"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4.5 6.5v5.3c0 4.6 3.2 7.6 7.5 9.2 4.3-1.6 7.5-4.6 7.5-9.2V6.5L12 3Z"/><path d="m8.5 12 2.5 2.5 4.5-5"/></svg><small>طلب موثّق</small></span>'
+'<span class="rqc-feature"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18M7 15h4"/></svg><small>محفظة آمنة</small></span>'
+'<span class="rqc-feature"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 14v-3a8 8 0 0 1 16 0v3"/><rect x="2.5" y="12" width="4" height="7" rx="2"/><rect x="17.5" y="12" width="4" height="7" rx="2"/><path d="M19 19c0 1.4-2 2-5 2h-2"/></svg><small>دعم للطلبات</small></span></div><h2 class="robux-reference-section">باقة 100 روبوكس</h2><p class="robux-packages-help">اضغط على باقة 100 روبوكس لتفتح قائمة الطلب، وبعدها تحقق من حساب Roblox قبل الدفع.</p><div class="package-grid">'+robux.map(p=>(()=>{const available=robuxAvailable>=Number(p.amount||0);return '<button class="robux-package" data-robux="'+p.id+'" '+(available?'':'disabled aria-disabled="true"')+'><span class="robux-art"><img src="game-covers/roblox-mark.svg?v=logo-square1" alt="Roblox"></span><img class="robux-display-art" src="game-covers/robux-100-tokens.svg?v=robux-art2" alt="" aria-hidden="true" loading="eager" decoding="async"><span class="robux-plus">＋</span><span><strong>'+escapeHtml(p.name)+'</strong><small>'+Number(p.price).toFixed(2)+' د.ل</small><small class="stock-label">'+(available?'متوفر':'غير متوفر')+'</small></span></button>'})()).join('')+'</div><div id="purchaseBox"></div></div>';modal.classList.add('robux-single-offer');modal.classList.remove('hidden');const walletButton=modal.querySelector('[data-open-wallet]');if(walletButton)walletButton.onclick=()=>{closeRobuxPackages();switchView('wallet')};
// The page and its image are already visible. Refresh stock without delaying navigation.
requestAnimationFrame(()=>{
  supabaseClient.from('store_inventory').select('robux_available').eq('id',true).maybeSingle()
    .then(({data,error})=>{
      if(error||!data)return;
      robuxAvailable=Number(data.robux_available)||0;
      if(modal.classList.contains('hidden'))return;
      modal.querySelectorAll('[data-robux]').forEach(btn=>{
        const product=robux.find(p=>String(p.id)===btn.dataset.robux);
        if(!product)return;
        const available=robuxAvailable>=Number(product.amount||0);
        btn.disabled=!available;
        btn.setAttribute('aria-disabled',String(!available));
        const label=btn.querySelector('.stock-label');
        if(label)label.textContent=available?'متوفر':'غير متوفر';
        if(!available&&btn.classList.contains('selected')){
          btn.classList.remove('selected');
          modal.querySelector('.robux-checkout-bar')?.classList.remove('visible');
        }
      });
      modal.dispatchEvent(new Event('robux-inventory-updated'));
    }).catch(()=>{});
});
}
function closeRobuxPackages(){document.getElementById('robuxPurchaseScreen')?.remove();const m=$('#robuxModal');if(m){m.classList.add('hidden');m.classList.remove('robux-checkout-mode')}}
async function selectPackage(id){const custom=/^custom:([0-9]{1,6})$/.exec(String(id));const customTile=custom&&document.querySelector('#robuxModal .robux-custom-package.selected');const customPrice=Number(customTile?.dataset.customPrice);const p=custom&&customTile?.dataset.robux===String(id)&&Number.isFinite(customPrice)&&customPrice>0?{id:String(id),name:custom[1]+' Robux',amount:Number(custom[1]),price:customPrice,isCustomQuantity:true}:products.find(x=>String(x.id)===String(id));if(!p){toast('تعذر تحديد كمية الروبوكس. حدث الصفحة وحاول مرة ثانية.');return false;}/* Show checkout form for selected catalog item; server validates live stock at purchase. */const box=document.querySelector('#robuxModal #purchaseBox');box.innerHTML='<form id="purchaseForm" class="topup-form"><h3>'+escapeHtml(p.name)+' — '+Number(p.price).toFixed(2)+' د.ل</h3><label for="robloxUsername">اسم المستخدم في Roblox</label><div class="roblox-verify-row"><input id="robloxUsername" type="text" minlength="3" maxlength="40" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="مثال: Player123" required><button id="verifyRobloxBtn" class="btn btn-soft" type="button">تحقق</button></div><div id="robloxVerifyResult" class="roblox-verify-result" aria-live="polite"></div><button id="submitRobloxPurchase" class="btn btn-primary full-width" type="submit" disabled>تأكد من الحساب أولاً</button><p class="form-note">تحقق من صورة الحساب واسم المستخدم قبل الشراء. لا نطلب كلمة مرور Roblox أو رمز الدخول.</p><p class="form-note">المبلغ ينخصم من المحفظة فور إنشاء الطلب، والتنفيذ يكون بعد مراجعة الإدارة.</p></form>';let verifiedUsername='';let verifiedUserId='';const input=box.querySelector('#robloxUsername'),verifyBtn=box.querySelector('#verifyRobloxBtn'),result=box.querySelector('#robloxVerifyResult'),submit=box.querySelector('#submitRobloxPurchase');input.addEventListener('input',()=>{verifiedUsername='';verifiedUserId='';submit.disabled=true;submit.textContent='تأكد من الحساب أولاً';result.innerHTML='';});verifyBtn.addEventListener('click',async()=>{const username=input.value.trim();if(!/^[A-Za-z0-9_]{3,20}$/.test(username)){result.textContent='اكتب اسم مستخدم Roblox صحيح (3 إلى 20 حرفاً أو رقماً أو _).';result.className='roblox-verify-result error';return}verifyBtn.disabled=true;verifyBtn.textContent='جاري التحقق…';result.className='roblox-verify-result';result.textContent='جاري البحث عن الحساب في Roblox…';try{const {data:lookup,error:lookupError}=await supabaseClient.functions.invoke('roblox-user-lookup',{body:{username}});if(lookupError)throw new Error('تعذر الاتصال بخدمة التحقق. حدّث الصفحة وحاول مرة ثانية.');if(lookup?.error)throw new Error(lookup.error==='roblox_lookup_unavailable'?'خدمة Roblox لا تستجيب حالياً. جرّب بعد شوية.':'تعذر التحقق من الحساب حالياً.');if(!lookup?.found){result.textContent='ما لقيناش حساب بهذا الاسم. راجع اسم المستخدم وحاول من جديد.';result.className='roblox-verify-result error';return}const account={id:lookup.id,name:lookup.name,displayName:lookup.displayName};const avatar=lookup.avatar||'';verifiedUsername=account.name;verifiedUserId=String(account.id);result.innerHTML='<div class="roblox-profile-card">'+(avatar?'<img src="'+escapeHtml(avatar)+'" alt="صورة حساب Roblox" class="roblox-avatar">':'<div class="roblox-avatar-placeholder">R</div>')+'<div class="roblox-profile-info"><strong>'+escapeHtml(account.displayName||account.name)+'</strong><span>@'+escapeHtml(account.name)+'</span><small>تم العثور على الحساب ✓</small></div></div><p class="form-note">تأكد أن هذه صورة واسم حسابك قبل المتابعة.</p>';result.className='roblox-verify-result success';submit.disabled=false;submit.textContent='تأكيد الشراء من المحفظة';}catch(err){result.textContent=err.message||'تعذر التحقق حالياً. حاول مرة ثانية.';result.className='roblox-verify-result error'}finally{verifyBtn.disabled=false;verifyBtn.textContent='تحقق'}});box.querySelector('#purchaseForm').addEventListener('submit',async e=>{e.preventDefault();if(!verifiedUsername||!verifiedUserId||input.value.trim().toLowerCase()!==verifiedUsername.toLowerCase()){toast('تحقق من حساب Roblox أولاً');result.textContent='تحقق من حساب Roblox أولاً.';result.className='roblox-verify-result error';return}submit.disabled=true;submit.textContent='جاري إنشاء الطلب…';result.textContent='تم الضغط على تأكيد الشراء. جاري فحص تسجيل الدخول…';result.className='roblox-verify-result';try{const user=await currentUser();if(!user)throw new Error('انتهت جلسة الدخول. سجّل دخولك من جديد.');if(typeof window.ensurePurchasePhone!=='function'){result.textContent='تعذر تحميل التحقق من رقم الهاتف. حدّث الصفحة وحاول مرة ثانية.';result.className='roblox-verify-result error';return}if(!await window.ensurePurchasePhone()){result.textContent='لازم تسجّل رقمك وتوثّقه برسالة SMS من «حسابي» قبل تأكيد الشراء.';result.className='roblox-verify-result error';return}result.textContent='تم تأكيد توثيق الهاتف. جاري إرسال طلب الشراء…';const request=p.isCustomQuantity?supabaseClient.rpc('create_custom_robux_order',{p_amount:p.amount,p_roblox_username:verifiedUsername,p_expected_total:p.price}):supabaseClient.rpc('create_purchase_order',{p_product_id:p.id,p_roblox_username:verifiedUsername});const timeout=new Promise((_,reject)=>setTimeout(()=>reject(new Error('انتهت مهلة الاتصال بقاعدة البيانات. حدّث الصفحة وحاول مرة ثانية.')),15000));const {data:purchaseOrder,error}=await Promise.race([request,timeout]);if(error)throw error;if(purchaseOrder?.id)void supabaseClient.functions.invoke('l1017n-purchase-notify',{body:{order_id:purchaseOrder.id}}).then(({error:notifyError})=>{if(notifyError)console.warn('[purchase] Telegram notification pending')}).catch(()=>console.warn('[purchase] Telegram notification unavailable'));result.textContent='تم إنشاء الطلب بنجاح.';closeRobuxPackages();await loadProducts();await renderWallet();await renderOrders();toast('تم إنشاء طلب '+p.name+' وخصم المبلغ من المحفظة.')}catch(err){console.error('create_purchase_order failed:',err);const message=String(err?.message||err?.details||err?.hint||'خطأ غير معروف');result.textContent=/robux_price_changed/i.test(message)?'سعر الروبوكس تغير. ارجع واكتب الكمية من جديد للتأكد من السعر.':/invalid_robux_quantity/i.test(message)?'الكمية غير صحيحة. ارجع وحدد عدد روبوكس صحيح.':/insufficient_balance/i.test(message)?'رصيدك ما يكفيش للكمية المختارة، يرجى تعبئة المحفظة.':/robux_out_of_stock/i.test(message)?'غير متوفر: نفدت كمية الروبوكس لهذه الباقة.':/phone_verification_required_before_purchase/i.test(message)?'لازم توثّق رقم هاتفك برسالة SMS من «حسابي» أولاً.':/phone_required_before_purchase/i.test(message)?'لازم تضيف رقم هاتفك لحسابك قبل الشراء.':/not_authenticated|JWT/i.test(message)?'انتهت جلسة الدخول. سجّل دخولك من جديد.':'فشل إنشاء الطلب: '+message;result.className='roblox-verify-result error';toast(result.textContent)}finally{submit.disabled=false;submit.textContent='تأكيد الشراء من المحفظة'}})}

function openPasswordRecovery(){
  let modal=$('#passwordRecoveryModal');
  if(!modal){
    modal=document.createElement('div');
    modal.id='passwordRecoveryModal';
    modal.className='package-modal';
    modal.innerHTML='<div class="package-box"><span class="eyebrow">ACCOUNT SECURITY</span><h2>تغيير كلمة المرور</h2><p class="package-subtitle">اكتب كلمة المرور الجديدة لحسابك.</p><form id="passwordRecoveryForm" class="topup-form"><label for="recoveryPassword">كلمة المرور الجديدة</label><input id="recoveryPassword" type="password" minlength="6" autocomplete="new-password" required placeholder="6 أحرف على الأقل"><label for="recoveryPasswordConfirm">تأكيد كلمة المرور</label><input id="recoveryPasswordConfirm" type="password" minlength="6" autocomplete="new-password" required placeholder="أعد كتابة كلمة المرور"><p id="passwordRecoveryStatus" class="form-note" role="status" aria-live="polite"></p><button id="saveRecoveryPassword" class="btn btn-primary full-width" type="submit">حفظ كلمة المرور</button></form></div>';
    document.body.appendChild(modal);
    $('#passwordRecoveryForm').addEventListener('submit',async e=>{
      e.preventDefault();
      const password=$('#recoveryPassword').value;
      const confirm=$('#recoveryPasswordConfirm').value;
      const status=$('#passwordRecoveryStatus');
      const submit=$('#saveRecoveryPassword');
      if(password.length<6){status.textContent='كلمة المرور لازم تكون 6 أحرف على الأقل.';return}
      if(password!==confirm){status.textContent='كلمتا المرور مش متطابقتين.';return}
      submit.disabled=true;submit.textContent='جاري الحفظ…';status.textContent='جاري تحديث كلمة المرور…';
      try{
        const {error}=await supabaseClient.auth.updateUser({password});
        if(error)throw error;
        status.textContent='تم تغيير كلمة المرور بنجاح. تقدر تسجّل الدخول الآن.';
        $('#authPassword').value='';
        setTimeout(()=>{modal.classList.add('hidden');switchView('account');toast('تم تغيير كلمة المرور بنجاح')},1200);
      }catch(err){status.textContent='تعذر تغيير كلمة المرور: '+(err.message||'حاول مرة ثانية.')}
      finally{submit.disabled=false;submit.textContent='حفظ كلمة المرور'}
    });
  }
  modal.classList.remove('hidden');
}
supabaseClient.auth.onAuthStateChange((event)=>{
  if(event==='PASSWORD_RECOVERY') openPasswordRecovery();
});
if(RECOVERY_LINK){
  supabaseClient.auth.getSession().then(({data,error})=>{
    if(error){toast('تعذر فتح رابط الاستعادة. اطلب رابطاً جديداً.');return}
    if(data?.session)openPasswordRecovery();
    else toast('رابط الاستعادة غير صالح أو انتهت صلاحيته. اطلب رابطاً جديداً من «نسيت كلمة المرور».');
  });
}


let customerHeaderWalletSeq=0;
async function renderCustomerHeaderWallet(user){
 const chip=$('#customerWalletChip'),amount=$('#customerHeaderBalance');
 if(!chip||!amount)return;
 const sequence=++customerHeaderWalletSeq;
 const carrier=window.L1017nPrimaryWallets?.getSelectedFor?.(user?.id)==='madar'?'madar':'libyana';
 const isMadar=carrier==='madar';
 // Display only the selected carrier's logo and its own authenticated balance.
 // This is a presentation preference; changing it never moves money.
 const logo=chip.querySelector('#gbLibyanaHeaderLogo');
 const fallback=chip.querySelector('.gb-libyana-fallback');
 const label=chip.querySelector('.customer-wallet-label');
 const topup=chip.querySelector('#customerTopupShortcut');
 const walletLogo=document.querySelector(isMadar?'#walletView .madar-brand-mark img':'#walletView .libyana-brand-mark img');
 const source=walletLogo?.getAttribute('src')||'';
 chip.dataset.walletCarrier=carrier;
 chip.setAttribute('aria-label','محفظة '+(isMadar?'المدار':'ليبيانا')+' ورصيدها');
 if(label)label.textContent=isMadar?'رصيد المدار':'رصيد ليبيانا';
 if(fallback)fallback.textContent=isMadar?'مد':'Li';
 if(logo){
   if(!logo.dataset.brandFallbackBound){
     logo.dataset.brandFallbackBound='1';
     logo.addEventListener('error',()=>{logo.removeAttribute('src')});
   }
   if(source && logo.getAttribute('src')!==source)logo.setAttribute('src',source);
   if(!source)logo.removeAttribute('src');
   logo.alt='شعار '+(isMadar?'المدار':'ليبيانا');
 }
 if(topup){
   topup.setAttribute('aria-label',isMadar?'شحن المدار غير متاح حاليًا':'شحن محفظة ليبيانا');
   topup.title=isMadar?'شحن المدار قريبًا':'شحن محفظة ليبيانا';
 }
 if(!user){chip.classList.add('hidden');return}
 chip.classList.remove('hidden');
 amount.textContent='…';
 const {data,error}=await supabaseClient.from('wallet_accounts')
   .select('balance,madar_balance').eq('user_id',user.id).maybeSingle();
 if(sequence!==customerHeaderWalletSeq)return;
 amount.textContent=error?'— د.ل':Number(isMadar?data?.madar_balance||0:data?.balance||0).toFixed(2)+' د.ل';
}
// Trust only Google avatar hosts or the signed-in user's own uploaded Supabase image.
function approvedProfilePhoto(user){
 if(!user)return '';
 const meta=user.user_metadata||{},raw=String(meta.avatar_url||meta.picture||'');
 try{
  const url=new URL(raw),host=url.hostname.toLowerCase();
  if(url.protocol!=='https:')return '';
  if(host==='googleusercontent.com'||host.endsWith('.googleusercontent.com')||
     host==='ggpht.com'||host.endsWith('.ggpht.com'))return url.href;
  const base=SUPABASE_URL+'/storage/v1/object/public/gamebox-avatars/'+encodeURIComponent(user.id)+'/';
  if(url.href.startsWith(base)&&url.pathname.startsWith(new URL(base).pathname))return url.href;
 }catch(e){}
 return '';
}
function renderGoogleHeaderAvatar(user){
 const btn=$('#googleProfileButton'),img=$('#googleProfileImage'),fallback=$('#googleProfileFallback');
 const welcome=$('#googleWelcome'),welcomeName=$('#googleWelcomeName');
 if(!btn||!img||!fallback)return;
 if(!user){
   if(welcome)welcome.classList.add('hidden');
   if(welcomeName)welcomeName.textContent='';
   btn.classList.add('hidden','no-image');img.removeAttribute('src');return;
 }
 const meta=user.user_metadata||{};
 const name=String(meta.full_name||meta.name||meta.given_name||user.email?.split('@')[0]||'م').trim();
 fallback.textContent=name.slice(0,1).toUpperCase()||'م';
 if(welcomeName)welcomeName.textContent=name;
 if(welcome)welcome.classList.remove('hidden');
 const photo=approvedProfilePhoto(user);
 img.onload=()=>btn.classList.remove('no-image');
 img.onerror=()=>btn.classList.add('no-image');
 if(photo){
  if(img.getAttribute('src')!==photo){btn.classList.add('no-image');img.src=photo}
  if(img.complete&&img.naturalWidth>0)btn.classList.remove('no-image');
 }else{img.removeAttribute('src');btn.classList.add('no-image')}
 btn.setAttribute('aria-label','فتح حساب '+name);btn.title='حساب '+name;
 btn.classList.remove('hidden');
}
function paintGoldAccountIdentity(user,name){
 const avatar=document.getElementById('accountModernAvatar');
 if(!avatar||!user)return;
 const googleBadge=document.getElementById('accountGoogleBadge');
 const isGoogle=user.app_metadata?.provider==='google'||user.identities?.some(i=>i.provider==='google');
 if(googleBadge)googleBadge.hidden=!isGoogle;
 const shortId=document.getElementById('accountModernId');
 if(shortId)shortId.textContent=String(user.id||'').replace(/-/g,'').slice(0,10).toUpperCase()||'—';
 const initial=String(name||'م').slice(0,1).toUpperCase();
 const photo=approvedProfilePhoto(user);
 avatar.textContent=initial;
 if(photo){
  const img=document.createElement('img');img.alt='صورة الحساب الشخصية';
  img.referrerPolicy='no-referrer';img.loading='lazy';
  img.onerror=()=>{if(avatar.contains(img))avatar.textContent=initial};
  avatar.replaceChildren(img);img.src=photo;
 }
}
// Signed-in account balance + non-refunded purchase spending; never expose other users' data.
let accountBalanceSummarySeq=0;
async function refreshAccountBalanceSummary(user){
 const id=++accountBalanceSummarySeq;
 const balanceEl=document.getElementById('accountCurrentBalance');
 const spentEl=document.getElementById('accountSpentBalance');
 if(!balanceEl||!spentEl)return;
 balanceEl.textContent='—';spentEl.textContent='—';
 if(!user)return;
 const isFresh=()=>id===accountBalanceSummarySeq;
 const displayAmount=(element,value)=>{
   if(!isFresh())return;
   const amount=Number(value);
   element.textContent=Number.isFinite(amount)?Math.max(0,amount).toFixed(3):'—';
 };
 const walletTask=(async()=>{
   try{
     const {data,error}=await supabaseClient.from('wallet_accounts')
       .select('balance').eq('user_id',user.id).maybeSingle();
     if(error)throw error;
     displayAmount(balanceEl,data?.balance??0);
   }catch(error){
     if(isFresh())balanceEl.textContent='—';
     console.warn('[account/summary] Unable to load wallet balance',error);
   }
 })();
 const spendTask=(async()=>{
   try{
     const perPage=500;
     let total=0;
     for(let start=0;start<100000;start+=perPage){
       if(!isFresh())return;
       // Chargeable purchases only, excluding refunded/rejected orders and top-ups.
       const {data,error}=await supabaseClient.from('purchase_orders')
         .select('total_amount')
         .eq('user_id',user.id)
         .in('status',['paid_pending_fulfillment','completed'])
         .order('created_at',{ascending:true})
         .range(start,start+perPage-1);
       if(error)throw error;
       const rows=data||[];
       rows.forEach(row=>{total+=Math.max(0,Number(row.total_amount)||0)});
       if(rows.length<perPage){displayAmount(spentEl,total);return}
     }
     // Do not show an incomplete lifetime total if an unusually large account exceeds the read limit.
     if(isFresh())spentEl.textContent='—';
   }catch(error){
     if(isFresh())spentEl.textContent='—';
     console.warn('[account/summary] Unable to load paid purchases',error);
   }
 })();
 await Promise.all([walletTask,spendTask]);
}
async function renderAccountCore(){const user=await currentUser();void refreshAccountBalanceSummary(user);renderGoogleHeaderAvatar(user);const modernCard=document.getElementById('accountModern');if(modernCard){modernCard.classList.toggle('hidden',!user);if(user){const m=user.user_metadata||{};const name=m.full_name||m.name||user.email?.split('@')[0]||'مستخدم';document.getElementById('accountModernName').textContent=name;document.getElementById('accountModernEmail').textContent=user.email||'';paintGoldAccountIdentity(user,name);document.getElementById('accountMemberSince').textContent=user.created_at?new Date(user.created_at).toLocaleDateString('ar-LY',{month:'2-digit',year:'numeric'}):'—';}}document.body.classList.toggle('auth-screen',!user&&!$('#accountView')?.classList.contains('hidden'));renderCustomerHeaderWallet(user);let profile=$('#signedInProfile');if(!profile){profile=document.createElement('div');profile.id='signedInProfile';profile.style.cssText='display:flex;align-items:center;gap:14px;text-align:right;padding:14px;margin:12px 0;border:1px solid var(--border-color,#ddd);border-radius:16px';const title=$('#accountTitle');title.parentNode.insertBefore(profile,title.nextSibling)}const accountBtn=$('#accountBtn');if(user){const meta=user.user_metadata||{};const displayName=meta.full_name||meta.name||meta.given_name||user.email?.split('@')[0]||'مستخدم';const {data:nickData}=await supabaseClient.from('leaderboard_profiles').select('nickname').eq('user_id',user.id).maybeSingle();const nickname=nickData?.nickname||'';if(accountBtn)accountBtn.textContent=nickname||'حسابي ↗';const avatar=meta.avatar_url||meta.picture||'';profile.classList.remove('hidden');profile.innerHTML=(avatar?'<img src="'+escapeHtml(avatar)+'" alt="الصورة الشخصية" referrerpolicy="no-referrer" style="width:64px;height:64px;border-radius:50%;object-fit:cover;flex-shrink:0" onerror="this.style.display=&quot;none&quot;">':'<div style="width:64px;height:64px;border-radius:50%;display:grid;place-items:center;background:var(--surface-2,#eee);font-size:24px;flex-shrink:0">'+escapeHtml((nickname||displayName).slice(0,1).toUpperCase())+'</div>')+'<div style="min-width:0"><strong style="display:block;font-size:1.05rem">'+escapeHtml(nickname||displayName)+'</strong><span style="display:block;overflow-wrap:anywhere;opacity:.8">'+escapeHtml(user.email||'')+'</span><small style="opacity:.7">تم تسجيل الدخول بنجاح</small></div>';$('#accountTitle').textContent='أهلاً بيك في L1017n';$('#accountText').textContent='هذا ملفك الشخصي المرتبط بحسابك.';$('#authForm').classList.add('hidden');$('#googleSignInBtn')?.classList.add('hidden');$('#logoutBtn').classList.remove('hidden')}else{if(accountBtn)accountBtn.textContent='حسابي ↗';profile.classList.add('hidden');profile.innerHTML='';$('#accountTitle').textContent='أهلاً بيك في L1017n';$('#accountText').textContent='سجّل دخولك بحساب Google أو بالبريد وكلمة المرور. رقم الهاتف خاص بحساب واحد فقط.';$('#authForm').classList.remove('hidden');$('#googleSignInBtn')?.classList.remove('hidden');$('#logoutBtn').classList.add('hidden')}// Phone is a unique account identifier, not proof of SIM ownership.
let phoneGate=$('#accountPhoneGate');
if(!phoneGate){phoneGate=document.createElement('div');phoneGate.id='accountPhoneGate';phoneGate.className='panel';phoneGate.style.cssText='padding:16px;margin:14px 0';profile.parentNode.insertBefore(phoneGate,profile.nextSibling)}
if(user){
 let {data:phoneRow,error:phoneError}=await supabaseClient.from('wallet_accounts').select('libyana_phone').eq('user_id',user.id).maybeSingle();
 let registered=phoneRow?.libyana_phone||'';
 if(registered){
   phoneGate.innerHTML='<strong>رقم الهاتف المسجّل</strong> <span dir="ltr">0'+escapeHtml(registered)+'</span><p class="form-note">الرقم خاص بحسابك. لإثبات ملكيته، أكمل التأكيد برسالة SMS من هذه الصفحة.</p>';
 }else{
   phoneGate.innerHTML='<h3>إضافة رقم الهاتف</h3><p>اكتب رقم ليبيانا أو المدار الخاص بك، بعدها بنرسل لك رمز SMS للتوثيق.</p><form id="accountPhoneForm"><label for="accountPhoneInput">رقم الهاتف</label><input id="accountPhoneInput" type="tel" dir="ltr" inputmode="tel" placeholder="09xxxxxxxx" autocomplete="tel-national" required><button class="btn btn-primary" type="submit">حفظ الرقم</button></form><p id="accountPhoneError" role="status"></p>';
   const form=phoneGate.querySelector('#accountPhoneForm');
   form.onsubmit=async ev=>{ev.preventDefault();const value=normalizeStorePhoneInput(phoneGate.querySelector('#accountPhoneInput').value);const errorBox=phoneGate.querySelector('#accountPhoneError');if(!value){errorBox.textContent='اكتب رقمًا ليبيًا صحيحًا: 09xxxxxxxx';return}const {error}=await supabaseClient.rpc('save_my_libyana_phone',{p_phone:value});if(error){errorBox.textContent='تعذر الحفظ. قد يكون الرقم مربوطًا بحساب آخر.';return}toast('تم حفظ رقم الهاتف لحسابك فقط');await renderAccount();await renderWallet()};
 }
 if(phoneError)phoneGate.innerHTML='<p>تعذر التحقق من رقم الهاتف. حاول تحديث الصفحة.</p>';
}else{phoneGate.innerHTML='';phoneGate.classList.add('hidden')}
if(user)phoneGate.classList.remove('hidden');
const modern=$('#accountModern');if(modern){modern.classList.toggle('hidden',!user);if(user){const m=user.user_metadata||{};const display=m.full_name||m.name||user.email?.split('@')[0]||'مستخدم';$('#accountModernName').textContent=display;$('#accountModernEmail').textContent=user.email||'';paintGoldAccountIdentity(user,display);$('#accountMemberSince').textContent=user.created_at?new Date(user.created_at).toLocaleDateString('ar-LY',{month:'2-digit',year:'numeric'}):'—';}}if(typeof window.renderLeaderboardProfile==='function'){
  try{await window.renderLeaderboardProfile()}catch(err){console.warn('[account/leaderboard] Optional rank widget failed:',err)}
 }
 if(typeof window.renderResalaOtp==='function'){
  try{await window.renderResalaOtp(user)}catch(err){console.warn('[account/phone] Optional SMS widget failed:',err)}
 }
}
let accountRenderInProgress=null;
async function renderAccount(){
 if(accountRenderInProgress)return accountRenderInProgress;
 const task=Promise.resolve().then(renderAccountCore).catch(function(error){
   // A broken optional component must never leave Account unusable.
   console.error('[account/render] Failed to render account:',error?.stack||error);
   const title=document.getElementById('accountTitle');
   if(title)title.textContent='حسابي';
   const status=document.getElementById('authStatus');
   if(status)status.textContent='تعذر تحميل بعض معلومات الحساب. جرّب تحديث الصفحة.';
 });
 accountRenderInProgress=task;
 try{return await task}finally{if(accountRenderInProgress===task)accountRenderInProgress=null}
}

$$('[name="provider"]').forEach(n=>n.addEventListener('change',()=>{showTopupCode=false;instructions()}));$('#topupAmount').addEventListener('input',()=>{showTopupCode=false;instructions()});
// Automatic Libyana credits come from verified SMS receipts; no manual top-up submission.
$('#googleSignInBtn')?.addEventListener('click',async()=>{
 const btn=$('#googleSignInBtn'),label=btn.querySelector('.auth-google-label');
 btn.disabled=true;
 if(label)label.textContent='جاري فتح Google…';
 try{
   const {error}=await supabaseClient.auth.signInWithOAuth({
     provider:'google',
     options:{
       redirectTo:new URL('./', window.location.href).href,
       queryParams:{prompt:'select_account'}
     }
   });
   if(error)throw error;
 }catch(error){
   toast('تعذر فتح تسجيل Google. تأكد من تفعيل Google في Supabase أو افتح الموقع من Chrome: '+(error.message||''));
   btn.disabled=false;
   if(label)label.textContent='المتابعة باستخدام Google';
 }
});
function normalizeStorePhoneInput(value){let digits=String(value||'').replace(/[^0-9]/g,'');if(/^002189[0-9]{8}$/.test(digits))digits=digits.slice(5);else if(/^2189[0-9]{8}$/.test(digits))digits=digits.slice(3);else if(/^09[0-9]{8}$/.test(digits))digits=digits.slice(1);return /^9[0-9]{8}$/.test(digits)?digits:null}
let authMode='login';
function setEmailSignupFields(){
 const signup=authMode==='signup';
 const group=$('#authPublicProfileSignup');
 if(group){group.classList.toggle('hidden',!signup);const name=$('#authPublicName');if(name)name.required=signup;}
}
$('#authModeLogin')?.addEventListener('click',()=>{authMode='login';$('#authModeLogin').classList.add('active');$('#authModeSignup').classList.remove('active');$('#authSubmit').textContent='تسجيل الدخول';$('#authPassword').autocomplete='current-password';setEmailSignupFields();});
$('#authModeSignup')?.addEventListener('click',()=>{authMode='signup';$('#authModeSignup').classList.add('active');$('#authModeLogin').classList.remove('active');$('#authSubmit').textContent='إنشاء حساب';$('#authPassword').autocomplete='new-password';setEmailSignupFields();});
setEmailSignupFields();
$('#authAlternate')?.addEventListener('click',()=>$('#authMode'+(authMode==='signup'?'Login':'Signup'))?.click());
$('#forgotPassword')?.addEventListener('click',async()=>{const email=$('#authEmail').value.trim();if(!email){toast('اكتب بريدك الإلكتروني أولاً');$('#authEmail').focus();return}const {error}=await supabaseClient.auth.resetPasswordForEmail(email,{redirectTo:new URL('./', window.location.href).href});if(error)toast('تعذر إرسال رابط تغيير كلمة المرور: '+error.message);else toast('لو البريد مسجل، بنرسلوله رابط تغيير كلمة المرور.');});
$('#authForm').addEventListener('submit',async e=>{
 e.preventDefault();
 const status=$('#authStatus'),say=msg=>{if(status)status.textContent=msg;toast(msg)};
 const email=$('#authEmail').value.trim(),password=$('#authPassword').value;
 const phone=normalizeStorePhoneInput($('#authPhone')?.value);
 if(!email){say('اكتب بريدك الإلكتروني أولاً.');$('#authEmail').focus();return}
 if(!phone){say('رقم الهاتف مطلوب، مثال: 09xxxxxxxx.');$('#authPhone')?.focus();return}
 if(password.length<6){say('كلمة المرور لازم تكون 6 أحرف على الأقل.');$('#authPassword').focus();return}
 const submit=$('#authSubmit');submit.disabled=true;submit.textContent='جاري الاتصال…';
 say('جاري الاتصال بخدمة تسجيل الدخول…');
 try{
   if(authMode==='signup'){
     const profileName=String($('#authPublicName')?.value||'').trim().replace(/\s+/g,' ');
     if(profileName.length<2||profileName.length>40)throw Error('اكتب اسمًا للمتجر من حرفين إلى 40 حرفًا.');
     const sharePublic=$('#authPublicIdentity')?.checked===true;
     const {data,error}=await supabaseClient.auth.signUp({
       email,password,options:{data:{store_phone:phone,full_name:profileName,share_public_profile:sharePublic}}
     });
     if(error)throw error;
     if(data.session){
       const {data:w,error:checkError}=await supabaseClient.from('wallet_accounts').select('libyana_phone').eq('user_id',data.user.id).maybeSingle();
       if(checkError||w?.libyana_phone!==phone){await supabaseClient.auth.signOut();throw Error('تعذر حفظ رقم الهاتف. لا يمكن إنشاء حساب بدون رقم مسجل.')}
       say('تم إنشاء الحساب وربط رقم الهاتف وتسجيل الدخول.');
       await renderAccount();await renderWallet();
     }else say('تم إرسال تأكيد البريد. رقم الهاتف يُحجز للحساب عند إنشائه، ولا يجوز استخدامه في حساب آخر.');
   }else{
     const {data,error}=await supabaseClient.auth.signInWithPassword({email,password});
     if(error)throw error;
     const {data:w,error:readError}=await supabaseClient.from('wallet_accounts')
       .select('libyana_phone').eq('user_id',data.user.id).maybeSingle();
     if(readError){await supabaseClient.auth.signOut();throw Error('تعذر التحقق من رقم الهاتف. حاول مرة ثانية.')}
     if(w?.libyana_phone && w.libyana_phone!==phone){
       await supabaseClient.auth.signOut();
       throw Error('رقم الهاتف لا يطابق الرقم المسجل لهذا الحساب.');
     }
     if(!w?.libyana_phone){
       const {error:linkError}=await supabaseClient.rpc('save_my_libyana_phone',{p_phone:phone});
       if(linkError){await supabaseClient.auth.signOut();throw linkError;}
     }
     say('تم تسجيل الدخول والتحقق من رقم الحساب.');
     await renderAccount();await renderWallet();await renderOrders();
   }
 }catch(error){
   const m=String(error?.message||'');
   if(/phone_already_registered|duplicate key|already.*phone|unique constraint|already registered/i.test(m))
     say('الرقم مستخدم في حساب ثاني، أو البريد مسجل مسبقًا. كل رقم لحساب واحد فقط.');
   else if(/invalid login credentials/i.test(m))
     say('البريد أو كلمة المرور غير صحيحة. لو نسيت كلمة المرور استعمل رابط الاستعادة.');
   else if(/Database error saving new user/i.test(m))
     say('تعذر إنشاء الحساب. تحقق إن الرقم مش مربوط بحساب آخر، أو تواصل مع الإدارة.');
   else say('تعذر تنفيذ العملية: '+m);
 }finally{submit.disabled=false;submit.textContent=authMode==='signup'?'إنشاء حساب':'تسجيل الدخول'}
});

$('#logoutBtn').addEventListener('click',async()=>{await supabaseClient.auth.signOut();await renderAccount();await renderWallet();await renderCustomerHeaderWallet(null);await renderLeaderboardProfile();toast('تم تسجيل الخروج')});
document.addEventListener('click',async e=>{if(e.target.closest('[data-show-topup-code]')){showTopupCode=true;instructions();return}const copyBtn=e.target.closest('[data-copy-ussd]');if(copyBtn){const code=copyBtn.dataset.copyUssd;try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(code);toast('تم نسخ كود التحويل. افتح تطبيق الهاتف والصقه ثم اضغط اتصال.')}else{window.prompt('انسخ كود التحويل وافتح تطبيق الهاتف:',code)}}catch(err){window.prompt('انسخ كود التحويل وافتح تطبيق الهاتف:',code)}return}if(e.target.closest('.home-charge')||e.target.closest('#walletActionTopup')){e.preventDefault();openTopupModal();return}const nav=e.target.closest('[data-view]');if(nav){e.preventDefault();switchView(nav.dataset.view);return}const amt=e.target.closest('[data-amount]');if(amt){$('#topupAmount').value=amt.dataset.amount;instructions();return}const gameCategory=e.target.closest('[data-game-category]');if(gameCategory){toast('قسم فورت نايت قريباً.');return}const product=e.target.closest('[data-product]');if(product){openRobuxPackages();return}if(e.target.closest('[data-close-packages]')){closeRobuxPackages();return}const pkg=e.target.closest('[data-robux]');if(pkg){const modal=document.getElementById('robuxModal');if(modal){modal.querySelectorAll('.robux-package').forEach(b=>{b.classList.toggle('selected',b===pkg);const mark=b.querySelector('.robux-plus');if(mark)mark.textContent=b===pkg?'✓':'＋'});const box=modal.querySelector('#purchaseBox');box.style.display='none';let bar=modal.querySelector('.robux-checkout-bar');if(!bar){bar=document.createElement('div');bar.className='robux-checkout-bar';bar.innerHTML='<div class="robux-checkout-info"><small class="robux-checkout-name"></small><strong class="robux-checkout-price"></strong></div><button type="button" class="robux-checkout-next">متابعة <span>←</span></button>';modal.appendChild(bar);bar.querySelector('button').addEventListener('click',async(ev)=>{ev.preventDefault();ev.stopPropagation();const selected=modal.querySelector('.robux-package.selected');if(!selected)return;const box=modal.querySelector('#purchaseBox');if(!box)return;box.style.display='block';bar.classList.remove('visible');await selectPackage(selected.dataset.robux);if(box.querySelector('#purchaseForm')){let screen=document.getElementById('robuxPurchaseScreen');if(screen)screen.remove();screen=document.createElement('section');screen.id='robuxPurchaseScreen';screen.setAttribute('dir','rtl');screen.innerHTML='<button type="button" class="robux-purchase-back" aria-label="رجوع">→ رجوع للباقات</button><h2>إكمال طلب روبلوكس</h2>';screen.appendChild(box);document.body.appendChild(screen);screen.querySelector('.robux-purchase-back').onclick=()=>{const home=modal.querySelector('.robux-store-box');if(home)home.appendChild(box);box.style.display='none';screen.remove();bar.classList.add('visible')};screen.querySelector('#robloxUsername')?.focus({preventScroll:true})}else{toast('تعذر فتح تفاصيل الطلب. حاول تحديث الصفحة.')}})}bar.querySelector('.robux-checkout-name').textContent=pkg.querySelector('strong')?.textContent||'';bar.querySelector('.robux-checkout-price').textContent=pkg.querySelector('small:not(.stock-label)')?.textContent||'';bar.classList.add('visible');const oldArrow=modal.querySelector('.robux-scroll-arrow');if(oldArrow)oldArrow.remove()}return}});
supabaseClient.auth.onAuthStateChange((event,session)=>{
 if(event==='SIGNED_IN'||event==='INITIAL_SESSION'||event==='SIGNED_OUT'){
   setTimeout(()=>{
     void renderAccount();
     void Promise.resolve().then(renderWallet).catch(err=>console.warn('[auth/wallet]',err));
     void Promise.resolve().then(renderOrders).catch(err=>console.warn('[auth/orders]',err));
   },0);
 }
 // TOKEN_REFRESHED does not change the visible account or wallet data.
});
$('#accountBtn').addEventListener('click',()=>switchView('account'));$('#customerTopupShortcut')?.addEventListener('click',()=>{if($('#customerWalletChip')?.dataset.walletCarrier==='madar'){toast('شحن المدار غير متاح حاليًا. شحن ليبيانا فقط هو المفعّل.');return}switchView('wallet')});$('#year').textContent=new Date().getFullYear();instructions();loadProducts();renderAccount().then(()=>{
 if(OAUTH_RETURN||OAUTH_ERROR){
   switchView('account');
   if(OAUTH_ERROR){
     const oauthParams=new URLSearchParams(window.location.search);
     const desc=oauthParams.get('error_description')||'';
     const msg=/invalid_client|client secret|unable to exchange external code/i.test(desc)
       ? 'تعذر الدخول بحساب Google بسبب إعدادات الربط في المتجر. يجب على الإدارة تصحيح Google Client Secret في Supabase.'
       : 'تعذر إكمال الدخول باستخدام Google. تواصل مع إدارة المتجر للتحقق من إعدادات تسجيل Google.';
     const status=$('#authStatus');if(status)status.textContent=msg;
     toast(msg);
     try{window.history.replaceState({},'',window.location.pathname)}catch(e){}
   }
 }
}).catch(err=>console.warn('Account setup unavailable',err));refreshHomeShowcase();/* Keep storefront open on initial visit except OAuth returns. */

async function loadLeaderboard(){
  const list=$('#leaderboardList');
  if(!list)return;
  list.innerHTML='<p class="muted">جاري تحميل الترتيب…</p>';
  try{
    const {data,error}=await supabaseClient.rpc('get_store_leaderboard_with_google');
    if(error)throw error;
    const ranked=Array.isArray(data)?data:[];
    if(!ranked.length){list.innerHTML='<p class="muted">ما فيش مشاركين في التصنيف حتى الآن.</p>';return}
    list.innerHTML='<div class="leaderboard-rows">'+ranked.map((p,i)=>{
      const rank=Number(p.rank)||i+1;
      const display=String(p.display_name||'').trim()||'متسوق المركز '+rank;
      const money=Number(p.points||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
      return '<div class="leaderboard-row"><span class="leaderboard-rank">'+rank+'</span><span class="leaderboard-nickname">'+escapeHtml(display)+'</span><strong class="leaderboard-points">'+money+' د.ل</strong></div>';
    }).join('')+'</div>';
  }catch(error){
    list.innerHTML='<p class="muted">تعذر تحميل الترتيب حالياً. حاول تحديث الصفحة بعد قليل.</p>';
  }
}

async function renderLeaderboardProfile(){
  if(typeof window.renderLeaderboardProfile==='function')return window.renderLeaderboardProfile();
}
$('#refreshLeaderboard')?.addEventListener('click',loadLeaderboard);
loadLeaderboard();


/* Secure store admin dashboard */
function adminNotePrompt(){return window.prompt('ملاحظة للإدارة (اختياري):','')||''}
async function openAdminDashboard(){
  const user=await currentUser();
  if(!user){toast('سجّل دخولك أولاً');switchView('account');return}
  const {data:admin,error}=await supabaseClient.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
  if(error||!admin){toast('هذا الحساب لا يملك صلاحية الإدارة');return}
  ['#homeView','#storeView','.wallet-promo','.steps-section','#walletView','#ordersView','#accountView','#leaderboardView','#subscriptionsView'].forEach(s=>{const n=$(s);if(n)n.classList.add('hidden')});
  $('#adminView').classList.remove('hidden');
  $$('[data-view]').forEach(b=>b.classList.remove('active'));
  await loadAdminDashboard();
  window.scrollTo({top:0,behavior:'smooth'});
}
async function refreshAdminAccess(){
  const user=await currentUser();
  const btn=$('#openAdminDashboard');
  if(!btn)return;
  let allowed=false;
  if(user){const {data}=await supabaseClient.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();allowed=!!data}
  btn.classList.toggle('hidden',!allowed);
  if(allowed)btn.onclick=openAdminDashboard;
}
function adminItem(title,sub,amount,id,status,actions,note){
  return '<article class="history-item admin-request"><div class="admin-request-details"><b>'+escapeHtml(title)+'</b><small>'+escapeHtml(sub)+'</small><small>رقم الطلب: '+escapeHtml(String(id).slice(0,8).toUpperCase())+(note?' · ملاحظة: '+escapeHtml(note):'')+'</small><div class="admin-request-actions">'+actions+'</div></div><div><b>'+Number(amount||0).toFixed(2)+' د.ل</b><div><span class="status '+(status==='pending'||status==='paid_pending_fulfillment'?'pending':status==='approved'||status==='completed'?'approved':'rejected')+'">'+escapeHtml(statusText[status]||orderStatusText[status]||status)+'</span></div></div></article>'
}
async function loadAdminDashboard(){
  $('#adminStatus').innerHTML='<p class="muted">جاري التحقق من صلاحيات الإدارة…</p>';
  const user=await currentUser();
  if(!user){$('#adminStatus').innerHTML='<p>سجّل دخولك أولاً.</p>';$('#adminContent').classList.add('hidden');return}
  const {data:admin,error:adminError}=await supabaseClient.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
  if(adminError||!admin){$('#adminStatus').innerHTML='<p>ما عندكش صلاحية الوصول للوحة الإدارة.</p>';$('#adminContent').classList.add('hidden');return}
  $('#adminStatus').innerHTML='<p>تم التحقق من صلاحيات الإدارة للحساب: <b>'+escapeHtml(user.email)+'</b></p>';
  $('#adminContent').classList.remove('hidden');
  const [topups,orders,productResult,inventoryResult]=await Promise.all([
    supabaseClient.from('topup_requests').select('id,user_id,amount,method,phone,transfer_reference,status,created_at,admin_note').order('created_at',{ascending:false}).limit(100),
    supabaseClient.from('purchase_orders').select('id,user_id,product_name,total_amount,roblox_username,status,created_at,admin_note').order('created_at',{ascending:false}).limit(100),
    supabaseClient.from('products').select('*').order('sort_order'),
    supabaseClient.from('store_inventory').select('robux_available').eq('id',true).maybeSingle()
  ]);
  if(!inventoryResult.error&&inventoryResult.data)$('#adminRobuxStock').value=Number(inventoryResult.data.robux_available)||0;
  if(topups.error)$('#adminTopups').innerHTML='<p class="muted">تعذر تحميل طلبات الشحن: '+escapeHtml(topups.error.message)+'</p>';
  else $('#adminTopups').innerHTML=topups.data?.length?topups.data.map(x=>adminItem('شحن '+(x.method==='libyana'?'ليبيانا':'المدار')+' · '+x.amount+' د.ل','الهاتف: '+(x.phone||'—')+' · رقم العملية: '+(x.transfer_reference||'—')+' · المستخدم: '+x.user_id,x.amount,x.id,x.status,x.status==='pending'?'<button class="btn btn-primary" data-topup-action="approved" data-id="'+x.id+'">موافقة وإضافة الرصيد</button><button class="btn btn-soft" data-topup-action="rejected" data-id="'+x.id+'">رفض الطلب</button>':'',x.admin_note)).join(''):'<p class="muted">لا توجد طلبات شحن.</p>';
  if(orders.error)$('#adminPurchases').innerHTML='<p class="muted">تعذر تحميل طلبات الشراء: '+escapeHtml(orders.error.message)+'</p>';
  else $('#adminPurchases').innerHTML=orders.data?.length?orders.data.map(x=>adminItem(x.product_name+' · '+x.total_amount+' د.ل','Roblox: @'+x.roblox_username+' · المستخدم: '+x.user_id,x.total_amount,x.id,x.status,x.status==='paid_pending_fulfillment'?'<button class="btn btn-primary" data-order-action="completed" data-id="'+x.id+'">تأكيد التنفيذ</button><button class="btn btn-soft" data-order-action="rejected" data-id="'+x.id+'">رفض وإرجاع الرصيد</button>':'',x.admin_note)).join(''):'<p class="muted">لا توجد طلبات شراء.</p>';
  if(productResult.error)$('#adminProducts').innerHTML='<p class="muted">تعذر تحميل المنتجات: '+escapeHtml(productResult.error.message)+'</p>';
  else $('#adminProducts').innerHTML=productResult.data?.length?productResult.data.map(p=>'<article class="history-item admin-request"><div class="admin-request-details"><b>'+escapeHtml(p.name)+'</b><small>المعرّف: '+escapeHtml(p.product_key)+' · اللعبة: '+escapeHtml(p.game||'—')+' · الكمية: '+Number(p.amount||0)+'</small><small>'+(p.active?'ظاهر في المتجر':'مخفي')+' · الترتيب: '+Number(p.sort_order||0)+'</small><div class="admin-request-actions"><button class="btn btn-soft" data-product-edit="'+p.id+'">تعديل</button></div></div><b>'+Number(p.price||0).toFixed(2)+' د.ل</b></article>').join(''):'<p class="muted">ما فيش منتجات حالياً.</p>';
}
async function reviewTopup(id,decision){
  const note=adminNotePrompt();
  const {error}=await supabaseClient.rpc('admin_review_topup',{p_request_id:id,p_decision:decision,p_admin_note:note});
  if(error){toast(error.message==='topup_already_reviewed'?'تمت مراجعة الطلب من قبل.':('تعذر تحديث طلب الشحن: '+error.message));return}
  toast(decision==='approved'?'تم اعتماد الشحن وإضافة الرصيد.':'تم رفض طلب الشحن.');
  await loadAdminDashboard();
}
async function reviewPurchase(id,decision){
  const note=adminNotePrompt();
  if(decision==='rejected'&&!window.confirm('تأكيد رفض الطلب وإرجاع المبلغ إلى محفظة المستخدم؟'))return;
  const {error}=await supabaseClient.rpc('admin_review_purchase',{p_order_id:id,p_decision:decision,p_admin_note:note});
  if(error){toast('تعذر تحديث طلب الشراء: '+error.message);return}
  toast(decision==='completed'?'تم تأكيد تنفيذ الطلب.':'تم رفض الطلب وإرجاع الرصيد.');
  await loadAdminDashboard();
}
async function saveAdminRobuxStock(){const input=$('#adminRobuxStock');const stock=Number(input.value);if(!Number.isInteger(stock)||stock<0){toast('اكتب كمية صحيحة من صفر أو أكثر');return}const btn=$('#saveAdminRobuxStock');btn.disabled=true;btn.textContent='جاري الحفظ…';const {error}=await supabaseClient.rpc('admin_set_robux_stock',{p_stock:stock});btn.disabled=false;btn.textContent='حفظ المخزون';if(error){toast('تعذر حفظ المخزون: '+error.message);return}robuxAvailable=stock;toast('تم تحديث مخزون الروبوكس إلى '+stock);await loadProducts();await loadAdminDashboard()}
function clearAdminProductForm(){
  $('#adminProductForm').reset();$('#adminProductId').value='';$('#adminProductSort').value='0';$('#adminProductActive').checked=true;
}
async function saveAdminProduct(e){
  e.preventDefault();
  const id=$('#adminProductId').value;
  const item={product_key:$('#adminProductKey').value.trim(),name:$('#adminProductName').value.trim(),game:$('#adminProductGame').value.trim()||null,amount:Number($('#adminProductAmount').value),price:Number($('#adminProductPrice').value),sort_order:Number($('#adminProductSort').value||0),description:$('#adminProductDescription').value.trim()||null,active:$('#adminProductActive').checked};
  if(!item.product_key||!item.name||!Number.isFinite(item.amount)||item.amount<1||!Number.isFinite(item.price)||item.price<=0){toast('راجع اسم المنتج والكمية والسعر');return}
  const query=id?supabaseClient.from('products').update(item).eq('id',id):supabaseClient.from('products').insert(item);
  const {error}=await query;
  if(error){toast('تعذر حفظ المنتج: '+error.message);return}
  toast('تم حفظ المنتج بنجاح');clearAdminProductForm();await loadProducts();await loadAdminDashboard();
}
function editAdminProduct(id){
  const btn=$('[data-product-edit="'+CSS.escape(id)+'"]');if(!btn)return;
  const cards=[...$('#adminProducts').querySelectorAll('[data-product-edit]')];
  const index=cards.findIndex(b=>b.dataset.productEdit===id);
  if(index<0)return;
  supabaseClient.from('products').select('*').eq('id',id).single().then(({data,error})=>{
    if(error||!data){toast('تعذر تحميل المنتج');return}
    $('#adminProductId').value=data.id;$('#adminProductKey').value=data.product_key||'';$('#adminProductName').value=data.name||'';$('#adminProductGame').value=data.game||'';$('#adminProductAmount').value=data.amount||1;$('#adminProductPrice').value=data.price||'';$('#adminProductSort').value=data.sort_order||0;$('#adminProductDescription').value=data.description||'';$('#adminProductActive').checked=!!data.active;
    $('#adminProductForm').scrollIntoView({behavior:'smooth',block:'center'});
  });
}
$('#openAdminDashboard')?.addEventListener('click',openAdminDashboard);
$('#refreshAdmin')?.addEventListener('click',loadAdminDashboard);
$('#saveAdminRobuxStock')?.addEventListener('click',saveAdminRobuxStock);
$('#cancelAdminProductEdit')?.addEventListener('click',clearAdminProductForm);
$('#adminProductForm')?.addEventListener('submit',saveAdminProduct);
$('#adminView')?.addEventListener('click',e=>{
  const topup=e.target.closest('[data-topup-action]');if(topup){reviewTopup(topup.dataset.id,topup.dataset.topupAction);return}
  const order=e.target.closest('[data-order-action]');if(order){reviewPurchase(order.dataset.id,order.dataset.orderAction);return}
  const product=e.target.closest('[data-product-edit]');if(product)editAdminProduct(product.dataset.productEdit);
});
supabaseClient.auth.onAuthStateChange(()=>{setTimeout(refreshAdminAccess,0)});
setTimeout(refreshAdminAccess,0);

/* Account settings interactions */
(function(){
 const root=document.getElementById('accountModern');if(!root)return;
 const detail=document.getElementById('accountSettingsDetail');
 const show=html=>{detail.innerHTML=html;detail.classList.remove('hidden');detail.scrollIntoView({behavior:'auto',block:'nearest'})};
 async function editName(){const user=await currentUser();if(!user)return;const name=prompt('اكتب اسمك الجديد',document.getElementById('accountModernName')?.textContent||'');if(name===null)return;const cleaned=name.trim();if(cleaned.length<2||cleaned.length>60){toast('الاسم لازم يكون بين حرفين و60 حرف');return}const {error}=await supabaseClient.auth.updateUser({data:{full_name:cleaned}});if(error){toast('تعذر حفظ الاسم');return}toast('تم تحديث الاسم');renderAccount()}
 root.addEventListener('click',async function(e){
 const copy=e.target.closest('#accountCopyId');
 if(copy){
  const account=await currentUser();
  if(account?.id){
   try{if(!navigator.clipboard?.writeText)throw Error('clipboard_unavailable');await navigator.clipboard.writeText(account.id);toast('تم نسخ معرف حسابك')}
   catch(_){window.prompt('انسخ معرّف حسابك:',account.id)}
  }
  return;
 }
 const edit=e.target.closest('#accountEditName');if(edit){editName();return}
 const btn=e.target.closest('[data-account-action]');if(!btn)return;
 const action=btn.dataset.accountAction;
 if(action==='personal'){openPersonalDetails();return}
 else if(action==='verify'){if(typeof window.openPhoneVerificationPage==='function')window.openPhoneVerificationPage();else openPersonalDetails({focusPhone:true});return}
 else if(action==='notifications')show('<h3>الإشعارات والتنبيهات</h3><p>تابع حالة طلباتك من قسم طلباتي. إعدادات إشعارات الهاتف غير متاحة حالياً.</p><button type="button" id="detailOrders">فتح طلباتي</button>'),detail.querySelector('#detailOrders').onclick=()=>switchView('orders');
 else if(action==='help'){
   // Open the official WhatsApp chat directly instead of a local help panel.
   window.location.assign('https://wa.me/218910005566');
   return;
 }
 });
})();

/* Dedicated personal details screen: actual user name and phone, no city */
async function openPersonalDetails(options={}){
 let page=document.getElementById('personalDetailsPage');
 if(page&&page.classList.contains('visible')){
   if(options.focusPhone){if(typeof window.openPhoneVerificationPage==='function')window.openPhoneVerificationPage();else page.querySelector('#personalPhoneSection')?.scrollIntoView({behavior:'auto',block:'center'});}
   return;
 }
 // Local session is for immediate UI only. Saving data and SMS proof of
 // phone ownership continue through the server's authorization checks.
 const {data:localAuth}=await supabaseClient.auth.getSession();
 const user=localAuth?.session?.user||await currentUser();
 if(!user)return;
 const meta=user.user_metadata||{},name=meta.full_name||meta.name||user.email?.split('@')[0]||'مستخدم';
 if(!page){page=document.createElement('div');page.id='personalDetailsPage';document.body.appendChild(page)}
 page.innerHTML=
  '<div class="personal-page-shell">'+
   '<div class="personal-page-header"><button type="button" id="personalBack" aria-label="رجوع إلى حسابي">'+
    '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg></button>'+
    '<div><small>إعدادات حسابك</small><h2>المعلومات الشخصية</h2></div></div>'+
   '<div class="personal-page-user"><div class="personal-page-avatar">'+escapeHtml(name.slice(0,1).toUpperCase())+'</div>'+
    '<div><strong id="personalDisplayName">'+escapeHtml(name)+'</strong><span dir="ltr">'+escapeHtml(user.email||'')+'</span></div></div>'+
   '<div class="personal-page-group-heading"><h3>بيانات الحساب</h3><span>معلوماتك الخاصة</span></div>'+
   '<form id="personalDetailsForm"><div class="personal-page-fields">'+
    '<label for="personalFullName"><span>الاسم الكامل</span><input id="personalFullName" type="text" maxlength="60" minlength="2" required value="'+escapeHtml(name).replace(/"/g,'&quot;')+'"></label>'+
    '<label for="personalEmail"><span>البريد الإلكتروني</span><input id="personalEmail" type="email" readonly value="'+escapeHtml(user.email||'').replace(/"/g,'&quot;')+'"></label>'+
    '</div><button type="submit" class="personal-save">حفظ تغييرات الاسم</button><p id="personalSaveStatus" role="status" aria-live="polite"></p></form>'+
   '<section class="personal-phone-section" id="personalPhoneSection" aria-label="توثيق رقم الهاتف">'+
    '<div class="personal-phone-heading"><div class="personal-phone-icon" aria-hidden="true">'+
     '<svg viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></svg>'+
    '</div><div class="personal-phone-heading-text"><strong>رقم الهاتف والتوثيق</strong><span>تأكيد ملكية الرقم برسالة SMS</span></div>'+
    '<span id="personalPhoneBadge" class="personal-phone-badge" role="status" aria-live="polite">جاري التحقق</span></div>'+
    '<div id="personalPhoneSlot" class="personal-phone-slot"></div>'+
    '<div class="personal-phone-security"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>'+
     '<span>توثيق الرقم مطلوب قبل الشراء. لا تشارك رمز التحقق مع أي شخص.</span></div>'+
   '</section>'+
  '</div>';
 try{window.L1017nPersonalPremium?.decorate(page,user,name)}catch(err){console.warn('[account/premium] Using standard profile layout',err)}
 try{window.GameboxEmailProfile?.attach(page,user)}catch(err){console.warn('[account/photo] Photo controls unavailable',err)}
 page.classList.add('visible');
 const slot=page.querySelector('#personalPhoneSlot');
 const gate=document.getElementById('accountPhoneGate');
 const otp=document.getElementById('resalaVerifyBox');
 if(gate){gate.classList.remove('hidden');slot.appendChild(gate)}
 if(otp)slot.appendChild(otp);
 if(!gate){
   slot.innerHTML='<p class="personal-phone-loading">جاري تحميل إعدادات رقم الهاتف…</p>';
   // First account render may still be loading. Do not block this screen.
   void renderAccount().then(()=>{
     if(!page.classList.contains('visible'))return;
     const foundGate=document.getElementById('accountPhoneGate');
     const foundOtp=document.getElementById('resalaVerifyBox');
     if(foundGate){
       foundGate.classList.remove('hidden');
       slot.replaceChildren(foundGate);
       if(foundOtp)slot.appendChild(foundOtp);
       if(typeof window.renderResalaOtp==='function')
         void Promise.resolve(window.renderResalaOtp(user)).catch(err=>console.warn('[personal/phone] Status refresh failed:',err));
     }else slot.textContent='تعذر تحميل الهاتف. حاول إغلاق الصفحة وفتحها.';
   }).catch(err=>{
     console.warn('[personal/phone] Unable to load account form',err);
     if(page.classList.contains('visible'))slot.textContent='تعذر تحميل الهاتف. حاول مرة ثانية.';
   });
 }
 const close=()=>{
   const oldGate=document.getElementById('accountPhoneGate');
   const oldOtp=document.getElementById('resalaVerifyBox');
   const profile=document.getElementById('signedInProfile');
   if(oldGate&&profile&&profile.parentNode){
     profile.insertAdjacentElement('afterend',oldGate);
     if(oldOtp)oldGate.insertAdjacentElement('afterend',oldOtp);
   }
   page.classList.remove('visible');
 };
 page.querySelector('#personalBack').onclick=close;
 page.querySelector('#personalDetailsForm').onsubmit=async e=>{
   e.preventDefault();
   const value=page.querySelector('#personalFullName').value.trim(),status=page.querySelector('#personalSaveStatus');
   if(value.length<2){status.textContent='الاسم لازم يكون حرفين على الأقل';return}
   const {error}=await supabaseClient.auth.updateUser({data:{full_name:value}});
   if(error){status.textContent='تعذر حفظ الاسم، حاول مرة ثانية';return}
   status.textContent='تم حفظ الاسم بنجاح';
   page.querySelector('#personalDisplayName').textContent=value;
   const avatarInitial=page.querySelector('.premium-avatar-initial');
   if(avatarInitial)avatarInitial.textContent=value.slice(0,1).toUpperCase();
   else page.querySelector('.personal-page-avatar').textContent=value.slice(0,1).toUpperCase();
   document.getElementById('accountModernName').textContent=value;
   paintGoldAccountIdentity(user,value);
   try{const updated=(await supabaseClient.auth.getUser()).data?.user;if(updated)renderGoogleHeaderAvatar(updated)}catch(_){}
   if(typeof window.loadLeaderboard==='function')void window.loadLeaderboard();
 };
 if(gate&&typeof window.renderResalaOtp==='function'){
   // Refresh status without waiting for SMS network response.
   void Promise.resolve(window.renderResalaOtp(user)).catch(e=>console.warn('[personal/verify] Unable to refresh status:',e));
 }
 if(options.focusPhone){if(typeof window.openPhoneVerificationPage==='function')window.openPhoneVerificationPage();else page.querySelector('#personalPhoneSection')?.scrollIntoView({behavior:'auto',block:'center'});}
}
window.openPersonalDetails=openPersonalDetails;

/* PUBG Mobile category selector — separate from Roblox checkout */
function openPubgCategories(){
 if(typeof window.renderPremiumPubg === "function") { window.renderPremiumPubg(); return; }
 const image='game-covers/pubg-battlefront.webp';
 let page=document.getElementById('pubgCategoryPage');
 if(!page){page=document.createElement('section');page.id='pubgCategoryPage';document.body.appendChild(page)}
 page.innerHTML='<button class="pubg-back" type="button" aria-label="رجوع">➜</button><div class="pubg-hero"><img src="'+image+'" alt="PUBG Mobile"><h1>PUBG Mobile</h1><span class="pubg-badge">▣ &nbsp; أكواد وبطاقات</span></div><div class="pubg-features"><span>♧<small>دعم متواصل</small></span><span>♢<small>دفع آمن</small></span><span>ϟ<small>كود فوري</small></span></div><h2>اختر الفئة</h2><div class="pubg-category-grid">'+[['codes','أكواد'],['charge','نشحنها لك'],['offers','العروض']].map(([key,label])=>'<button type="button" class="pubg-category" data-pubg-category="'+key+'"><img src="'+image+'" alt=""><strong>'+label+'</strong></button>').join('')+'</div><div id="pubgCategoryResults" class="hidden"></div>';
 page.classList.add('visible');
 page.querySelector('.pubg-back').onclick=()=>{page.classList.remove('visible');page.querySelector('#pubgCategoryResults').classList.add('hidden')};
 page.querySelectorAll('[data-pubg-category]').forEach(btn=>btn.onclick=()=>{
 const key=btn.dataset.pubgCategory,box=page.querySelector('#pubgCategoryResults');
 const all=products.filter(p=>/pubg|ببجي/i.test([p.game,p.name,p.product_key].join(' ')));
 const filtered=all.filter(p=>{const t=[p.name,p.product_key].join(' ').toLowerCase();const isOffer=/عرض|offer|promo|خصم/.test(t);const isCode=/كود|code|بطاق[ةه]|card|redeem|voucher/.test(t);return key==='offers'?isOffer:key==='codes'?isCode&&!isOffer:!isOffer&&!isCode});
 box.classList.remove('hidden');box.innerHTML='<h3>'+btn.querySelector('strong').textContent+'</h3>'+(filtered.length?filtered.map(p=>'<div class="pubg-item"><strong>'+escapeHtml(p.name)+'</strong><span>'+Number(p.price||0).toFixed(2)+' د.ل</span><button type="button" class="btn btn-primary" data-pubg-instant-buy="'+escapeHtml(p.id)+'">شراء واستلام الكود</button></div>').join(''):'<p class="pubg-empty">ما فيش باقات متاحة في هالفئة حالياً.</p>');
 box.querySelectorAll('[data-pubg-instant-buy]').forEach(b=>b.onclick=()=>{const p=filtered.find(x=>String(x.id)===b.dataset.pubgInstantBuy);if(p&&window.openInstantCodeCheckout)window.openInstantCodeCheckout(p.id,p.name,p.price)});
 box.scrollIntoView({behavior:'smooth',block:'nearest'});
 });
}

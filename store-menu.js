(function(){
  var pageId='robloxGamePage';
  var supabaseUrl='https://cmtxsjlehjworqypbxjz.supabase.co';
  var supabaseKey='sb_publishable_NrahtO5qp8p4OgjODMbxdQ_XqbUWSAk';
  var robloxImage='game-covers/roblox-mark.svg?v=logo-square1';
  var mm2Image='game-covers/mm2-game-icon.jpg?v=mm2-fixed2';
  var brainrotImage='game-covers/steal-a-brainrot-original.png';
  var mm2MintyImage='https://luger.gg/cdn/shop/files/11_491b96a8-e468-4b75-805c-450d32b73de7.png?v=1777750613';
  // Product-specific cutout PNG artwork: no black screenshot background.
  var mm2DeathshardImage='game-covers/mm2-deathshard.png?v=local-cutout1';
  var mm2ElderwoodBladeImage='game-covers/mm2-elderwood-blade.png?v=local-cutout1';
  function mm2Artwork(product){
    var key=String(product&&product.product_key||'');
    if(key==='mm2-minty-gun')return mm2MintyImage;
    if(key==='mm2-deathshard')return mm2DeathshardImage;
    if(key==='mm2-elderwood-blade')return mm2ElderwoodBladeImage;
    return '';
  }
  var styleId='robloxGamePageStyles';

  function addStyles(){
    if(document.getElementById(styleId))return;
    var s=document.createElement('style');s.id=styleId;
    s.textContent=`
      #${pageId}{position:fixed;inset:0;z-index:99990;overflow:auto;background:radial-gradient(ellipse at 70% 0%,#192c58 0%,#080d1e 45%,#050913 100%);color:#fff;padding:22px 18px 44px;font-family:'IBM Plex Sans Arabic',sans-serif;direction:rtl}
      #${pageId} .rgp-shell{max-width:860px;margin:auto}
      #${pageId} .rgp-top{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:18px;min-width:0}
      #${pageId} .rgp-inner-heading{font-size:clamp(21px,4.5vw,29px);line-height:1.45;font-weight:900;margin:0 0 15px;color:#f6f7ff}
      #${pageId}.rgp-inner-page .rgp-hero,#${pageId}.rgp-inner-page .rgp-reference-features,#${pageId}.rgp-inner-page .rgp-title{display:none!important}
      #${pageId}.rgp-inner-page .rgp-top{position:sticky;top:-16px;z-index:5;min-height:65px;margin-bottom:18px;padding:10px 12px;background:rgba(8,15,31,.94);border:1px solid #29405c;border-radius:17px;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}
      #${pageId}.rgp-inner-page .rgp-brand{min-width:0;overflow-wrap:anywhere;font-size:clamp(19px,4.5vw,24px);letter-spacing:0}
      #${pageId}.rgp-inner-page .rgp-back{flex-shrink:0;min-height:42px;padding:8px 15px;white-space:nowrap}
      #${pageId}.rgp-inner-page .rgp-mm2-subcategory{margin-top:0}
      #${pageId}.rgp-inner-page .rgp-packages{margin-top:10px}
      #${pageId} .rgp-brand{font-weight:800;font-size:20px;letter-spacing:.5px}
      #${pageId} .rgp-back{border:1px solid #23415f;background:#091727;color:#fff;border-radius:999px;padding:10px 18px;cursor:pointer;font:inherit}
      #${pageId} .rgp-hero{position:relative;min-height:245px;border-radius:28px;overflow:hidden;border:1px solid #1268c9;box-shadow:0 25px 80px rgba(0,93,255,.18);background:#071526}
      #${pageId} .rgp-hero img{position:absolute;top:0;bottom:0;left:0;width:44%;height:100%;object-fit:contain;object-position:center;opacity:.97;filter:drop-shadow(0 8px 18px rgba(0,0,0,.45))}
      #${pageId} .rgp-hero:after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,rgba(2,8,18,.06) 0%,rgba(2,8,18,.32) 44%,rgba(2,8,18,.9) 100%)}
      #${pageId} .rgp-hero-content{position:relative;z-index:2;min-height:245px;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;padding:30px;max-width:650px}
      #${pageId} .rgp-kicker{color:#55b5ff;font-weight:700;letter-spacing:2px;font-size:13px}
      #${pageId} .rgp-hero h1{font-size:clamp(42px,7vw,78px);margin:8px 0 6px;line-height:1;font-weight:900}
      #${pageId} .rgp-hero p{font-size:19px;color:#d8e8fa;margin:0;line-height:1.8}
      #${pageId} .rgp-title{margin:32px 0 16px;font-size:28px}
      #${pageId} .rgp-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
      #${pageId} .rgp-card{position:relative;min-height:235px;border-radius:24px;overflow:hidden;border:1px solid #185c9c;background:#071322;cursor:pointer;text-align:right;color:#fff;padding:0;box-shadow:0 16px 50px rgba(0,0,0,.28);transition:.2s transform,.2s border-color}
      #${pageId} .rgp-card:hover{transform:translateY(-4px);border-color:#38a8ff}
      #${pageId} .rgp-card.mm2{border-color:#7b2630}
      #${pageId} .rgp-card.mm2:hover{border-color:#ff4454}
      #${pageId} .rgp-card img{width:100%;height:155px;object-fit:cover;display:block;filter:saturate(1.08)}
      #${pageId} .rgp-card:not(.mm2):not(.steal) img{object-fit:contain;object-position:center;background:radial-gradient(ellipse at center,#29456c 0%,#152641 55%,#071322 100%);padding:10px 22px;box-sizing:border-box}
      #${pageId} .rgp-card-body{padding:18px 20px 20px;background:linear-gradient(180deg,#091827,#06101d)}
      #${pageId} .rgp-card.mm2 .rgp-card-body{background:linear-gradient(180deg,#1a0b10,#0c070a)}
      #${pageId} .rgp-card h3{font-size:24px;margin:0 0 4px}
      #${pageId} .rgp-card p{margin:0 0 14px;color:#a9bfd4}
      #${pageId} .rgp-action{display:inline-flex;align-items:center;gap:8px;border-radius:999px;padding:10px 16px;background:linear-gradient(110deg,#7553e6,#436be6);font-weight:700}
      #${pageId} .mm2 .rgp-action{background:linear-gradient(110deg,#b84c9c,#7446cb)}
      #${pageId} .rgp-packages{margin-top:22px;display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px}
      #${pageId} .rgp-mm2-subcategory{margin-top:14px}
      #${pageId} .rgp-mm2-subcategory .rgp-inner-heading{margin:0 0 14px}
      #${pageId} .rgp-mm2-subcategory .rgp-packages{margin-top:20px}
      #${pageId} .rgp-package{border:1px solid #214968;background:#091a2b;border-radius:18px;padding:18px;text-align:right;color:#fff;cursor:pointer;font:inherit}
      #${pageId} .rgp-package:hover{border-color:#35a9ff}
      #${pageId} .rgp-package.rgp-soldout{
        cursor:not-allowed;opacity:.79;
        border-color:#894658;background:linear-gradient(155deg,#251b28,#121a2b);
      }
      #${pageId} .rgp-package.rgp-soldout:hover{border-color:#894658}
      #${pageId} .rgp-package.rgp-soldout .mm2-item-art img{filter:grayscale(.38) brightness(.83)}
      #${pageId} .rgp-package.rgp-soldout .mm2-price{color:#c4bbcd!important}
      #${pageId} .rgp-package.rgp-soldout .mm2-delivery{color:#ffb3bc;font-weight:800}
      #${pageId} .rgp-package strong{display:block;font-size:18px}
      #${pageId} .rgp-package .mm2-item-art{display:flex;align-items:center;justify-content:center;height:150px;background:radial-gradient(ellipse at 50% 35%,#484a78 0%,#283355 53%,#1a2740 100%);border-radius:14px;margin-bottom:12px;overflow:hidden}
      #${pageId} .rgp-package .mm2-item-art img{background:transparent!important;mix-blend-mode:normal;filter:drop-shadow(0 9px 12px #0007)}
      #${pageId} .rgp-package .mm2-item-art img{max-height:132px;max-width:94%;width:auto;height:auto;object-fit:contain;border-radius:8px}
      #${pageId} .rgp-package .mm2-price{display:block;color:#93f5b0!important;font-size:20px;font-weight:800;margin-top:8px}
      #${pageId} .rgp-package .mm2-delivery{display:block;color:#a8b5c8;font-size:12px;margin-top:5px}
      #rgpMm2Checkout{position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.82);direction:rtl}
      #rgpMm2Checkout .mm2-checkout-box{width:min(100%,430px);background:#121a2d;color:#fff;border:1px solid #644d85;border-radius:22px;padding:22px;box-shadow:0 25px 90px #0009}
      #rgpMm2Checkout .mm2-checkout-box img{width:100%;height:145px;object-fit:contain;background:radial-gradient(ellipse at center,#484a78,#202d49);border-radius:14px;padding:7px;box-sizing:border-box}
      #rgpMm2Checkout .mm2-checkout-box input{display:block;width:100%;box-sizing:border-box;border:1px solid #5f6c84;border-radius:11px;padding:13px;margin:9px 0 14px;background:#0b1324;color:#fff;font:inherit;direction:ltr}
      #rgpMm2Checkout .mm2-actions{display:flex;gap:10px}
      #rgpMm2Checkout .mm2-actions button{flex:1;cursor:pointer;padding:13px;border-radius:11px;font:inherit;font-weight:700;border:1px solid #654e86;background:#272139;color:#fff}
      #rgpMm2Checkout .mm2-actions button[type=submit]{background:#8253c9;border:0}
      #rgpMm2Checkout .mm2-actions button:disabled{opacity:.55;cursor:wait}
      #rgpMm2Checkout .mm2-state{font-size:13px;color:#f8ca95;min-height:20px;margin-top:12px;line-height:1.7}
      #${pageId} .rgp-package span{display:block;color:#62b9ff;margin-top:5px}
      #${pageId} .rgp-empty{padding:30px;text-align:center;border:1px dashed #28455e;border-radius:18px;color:#9bb0c5}
      @media(max-width:700px){
        #${pageId} .rgp-mm2-subcategory .rgp-packages{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
        #${pageId} .rgp-mm2-subcategory .rgp-package{min-width:0;padding:12px 9px}
        #${pageId} .rgp-mm2-subcategory .rgp-package strong{font-size:14px;line-height:1.5;overflow-wrap:anywhere}
        #${pageId} .rgp-mm2-subcategory .rgp-package .mm2-item-art{height:124px}
        #${pageId} .rgp-mm2-subcategory .rgp-package .mm2-item-art img{max-height:118px}
      }
      @media(max-width:720px){#${pageId}{padding:16px 12px 35px}#${pageId} .rgp-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}#${pageId} .rgp-hero{min-height:210px}#${pageId} .rgp-hero-content{min-height:210px;padding:22px}#${pageId} .rgp-hero h1{font-size:40px}#${pageId} .rgp-hero p{font-size:13px}#${pageId} .rgp-card{min-height:0;border-radius:18px}#${pageId} .rgp-card img{height:130px}#${pageId} .rgp-card-body{padding:12px 10px 15px}#${pageId} .rgp-card h3{font-size:17px}#${pageId} .rgp-card p{font-size:12px;line-height:1.6}#${pageId} .rgp-action{font-size:11px;padding:8px 9px}#${pageId} .rgp-title{font-size:21px}}
    `;
    document.head.appendChild(s);
  }

  // Separate top-level Roblox storefront categories, each with its own direct page.
  window.openRobloxGameMenu=function(){
    if(typeof window.openRobuxPackages==='function')window.openRobuxPackages();
    else showRobloxPage();
  };
  window.openMm2StoreCategory=function(){
    showRobloxPage('mm2');
  };
  window.openBrainrotStoreCategory=function(){
    showRobloxPage('brainrot');
  };
  function closePage(){var p=document.getElementById(pageId);if(p)p.remove()}
  function setInnerHeader(root,label,category){
    if(!root)return;
    root.classList.add('rgp-inner-page');
    root.classList.toggle('rgp-mm2-page',category==='mm2');
    root.classList.toggle('rgp-brainrot-page',category==='brainrot');
    var brand=root.querySelector('.rgp-brand');
    if(brand)brand.textContent=label;
    var back=root.querySelector('[data-rgp-back]');
    if(back){var backLabel=back.querySelector('.rgp-back-label');if(backLabel)backLabel.textContent='رجوع';back.setAttribute('aria-label',root.dataset.directCategory?'رجوع إلى المتجر':'رجوع إلى أقسام روبلوكس');}
    var title=root.querySelector('.rgp-title');
    if(title)title.hidden=true;
    root.scrollTop=0;
  }
  window.setRobloxInnerHeader=setInnerHeader;
  function showRobloxPage(directCategory){
    addStyles();closePage();
    var p=document.createElement('div');p.id=pageId;p.dataset.directCategory=directCategory||'';
    p.innerHTML=`<div class="rgp-shell">
      <div class="rgp-top"><button class="rgp-back" type="button" data-rgp-back aria-label="رجوع إلى المتجر"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m9 5 7 7-7 7"/></svg><span class="rgp-back-label">رجوع</span></button><div class="rgp-brand">روبلوكس</div><span class="rgp-header-spacer" aria-hidden="true"></span></div>
      <section class="rgp-hero"><img src="${robloxImage}" alt="شعار روبلوكس"><div class="rgp-hero-content"><span class="rgp-kicker">L1017N • ROBLOX</span><h1>Roblox</h1><span class="rgp-category-tag"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v5a2 2 0 0 0 0 4v5H4v-5a2 2 0 0 0 0-4V5zM9 8v2m0 4v2"/></svg>باقات ومستلزمات</span><p>اختار القسم، وتصفح الباقات والأسعار بكل سهولة.</p></div></section>
      <div class="rgp-reference-features"><span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v5a2 2 0 0 0 0 4v5H4v-5a2 2 0 0 0 0-4V5zM9 8v2m0 4v2"/></svg><small>اختر الباقة</small></span><span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h17v14H3zM3 6V4h14v2M15 11h6v5h-6z"/></svg><small>دفع بالمحفظة</small></span><span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3h8v4H8zM8 5H5v16h14V5h-3M8 14l3 3 5-6"/></svg><small>تابع طلبك</small></span></div><h2 class="rgp-title">اختر الفئة</h2>
      <div class="rgp-grid">
        <button class="rgp-card" type="button" data-rgp-choice="robux"><img src="${robloxImage}" alt="شعار روبلوكس"><div class="rgp-card-body"><h3>روبوكس</h3><p>اشترِ باقات Robux واختر الكمية المناسبة ليك.</p><span class="rgp-action">عرض باقات الروبوكس</span></div></button>
        <button class="rgp-card mm2" type="button" data-rgp-choice="mm2"><img src="${mm2Image}" alt="ماب MM2"><div class="rgp-card-body"><h3>MM2</h3><p>باقات ومستلزمات ماب Murder Mystery 2.</p><span class="rgp-action">عرض باقات MM2</span></div></button>
        <button class="rgp-card steal" type="button" data-rgp-choice="brainrot"><img src="${brainrotImage}" data-steal-official-icon alt="غلاف ماب Steal a Brainrot الرسمي"><div class="rgp-card-body"><h3>ماب السرقة</h3><p>قرما، لاسيكرت، ولاسبوكي في قسم خاص.</p><span class="rgp-action">دخول ماب السرقة</span></div></button>
      </div>
    </div>`;
    document.body.appendChild(p);
    if(typeof window.refreshRobloxStealCover==='function')window.refreshRobloxStealCover(p);
    p.addEventListener('click',function(e){
      if(e.target.closest('[data-rgp-back]')){
        if(p.classList.contains('rgp-inner-page')&&!p.dataset.directCategory)showRobloxPage();
        else closePage();
        return;
      }
      var choice=e.target.closest('[data-rgp-choice]');if(!choice)return;
      if(choice.dataset.rgpChoice==='robux'){
        closePage();
        if(typeof window.openRobuxPackages==='function')window.openRobuxPackages();
        return;
      }
      if(choice.dataset.rgpChoice==='brainrot'){
        if(typeof window.openStealBrainrotCategory==='function')window.openStealBrainrotCategory();
        else alert('تعذر تحميل ماب السرقة، حدّث الصفحة.');
        return;
      }
      showMm2Page();
    });
    // Open category content immediately; no intermediate Roblox category menu.
    if(directCategory==='mm2')void showMm2Page();
    else if(directCategory==='brainrot'){
      if(typeof window.openStealBrainrotCategory==='function')window.openStealBrainrotCategory();
      else {closePage();alert('تعذر تحميل ماب السرقة، حدّث الصفحة.');}
    }
  }

  async function showMm2Page(){
    var p=document.getElementById(pageId);if(!p)return;
    var grid=document.createElement('div');grid.className='rgp-packages';grid.innerHTML='<div class="rgp-empty">جاري تحميل باقات MM2…</div>';
    var section=document.createElement('section');section.className='rgp-mm2-subcategory';
    var heading=document.createElement('h2');heading.className='rgp-inner-heading';heading.textContent='باقات MM2';
    section.append(heading,grid);
    var categoryGrid=p.querySelector('.rgp-grid')||p.querySelector('.rgp-mm2-subcategory');
    if(!categoryGrid)return;
    categoryGrid.replaceWith(section);
    setInnerHeader(p,'MM2','mm2');
    try{
      var client=window.supabase.createClient(supabaseUrl,supabaseKey);
      // This read-only RPC returns MM2 products including sold-out ones;
      // the actual one-unit reservation is enforced atomically in PostgreSQL.
      var r=await client.rpc('get_mm2_product_stock');
      if(r.error)throw r.error;
      var list=r.data||[];
      if(!list.length){grid.innerHTML='<div class="rgp-empty">ما فيش باقات MM2 مضافة حالياً.</div>';return}
      grid.innerHTML=list.map(function(x){
        var image=mm2Artwork(x);
        var art=image
          ? '<span class="mm2-item-art"><img loading="lazy" decoding="async" referrerpolicy="no-referrer" src="'+image+'" alt="صورة سلاح '+escapeHtml(x.name)+'"></span>'
          : '';
        var available=x.active===true;
        return '<button class="rgp-package'+(available?'':' rgp-soldout')+'" type="button"'+
          (available?' data-mm2-id="'+escapeHtml(x.id)+'"':' disabled aria-disabled="true"')+'>'+art+
          '<strong>'+escapeHtml(x.name)+'</strong>'+
          '<span class="mm2-price">'+Number(x.price||0).toFixed(2)+' د.ل</span>'+
          '<small class="mm2-delivery">'+(available?'الكمية المتوفرة: 1 · التسليم داخل اللعبة':'غير متوفر حاليًا · نفدت الكمية')+'</small>'+(available?'<span class="gb-card-open">فتح القائمة ←</span>':'')+'</button>';
      }).join('');
      grid.addEventListener('click',function(e){
        var b=e.target.closest('[data-mm2-id]');if(!b)return;
        var product=list.find(function(p){return p.active===true&&String(p.id)===String(b.dataset.mm2Id)});
        if(product)showMm2Checkout(product);
      });
    }catch(err){grid.innerHTML='<div class="rgp-empty">تعذر تحميل باقات MM2. حاول مرة ثانية.</div>'}
  }


  function showMm2Checkout(product){
    var old=document.getElementById('rgpMm2Checkout');if(old)old.remove();
    var overlay=document.createElement('div');overlay.id='rgpMm2Checkout';
    overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
    overlay.setAttribute('aria-label','طلب سلاح MM2');
    var checkoutArt=mm2Artwork(product);
    overlay.innerHTML='<div class="mm2-checkout-box">'+(checkoutArt?'<img loading="eager" referrerpolicy="no-referrer" src="'+checkoutArt+'" alt="سلاح '+escapeHtml(product.name)+'">':'')+
      '<h2 style="margin:14px 0 7px">'+escapeHtml(product.name)+'</h2>'+
      '<p style="color:#92e8a9;font-size:22px;font-weight:800;margin:0 0 12px">'+Number(product.price).toFixed(2)+' د.ل</p>'+
      '<p style="font-size:13px;line-height:1.8;color:#c1c6d7">اكتب اسم حساب Roblox. بعد إتمام الشراء لازم تتواصل مع المتجر عبر واتساب أو تيليجرام وتبعث رقم طلبك لاستلام السلاح داخل MM2.</p>'+
      '<form><label for="mm2RobloxName">اسم مستخدم Roblox</label>'+
      '<input id="mm2RobloxName" type="text" pattern="[A-Za-z0-9_]{3,20}" minlength="3" maxlength="20" autocomplete="off" required placeholder="Roblox username">'+
      '<div class="mm2-actions"><button type="button" data-mm2-cancel>إلغاء</button><button type="submit">تأكيد الشراء</button></div>'+
      '<div class="mm2-state" role="status" aria-live="polite"></div></form></div>';
    document.body.appendChild(overlay);
    function close(){overlay.remove()}
    overlay.querySelector('[data-mm2-cancel]').addEventListener('click',close);
    overlay.addEventListener('click',function(e){if(e.target===overlay)close()});
    var form=overlay.querySelector('form'),send=form.querySelector('[type="submit"]'),state=form.querySelector('.mm2-state');
    form.addEventListener('submit',async function(e){
      e.preventDefault();
      var username=form.querySelector('#mm2RobloxName').value.trim();
      if(!/^[a-z0-9_]{3,20}$/i.test(username)){state.textContent='اكتب اسم Roblox صحيح من 3 إلى 20 حرف.';return}
      var client=typeof supabaseClient!=='undefined'?supabaseClient:null;
      if(!client){state.textContent='تعذر الاتصال بالمتجر، حدّث الصفحة.';return}
      send.disabled=true;state.textContent='جاري التحقق من الحساب ورصيد المحفظة…';
      try{
        var auth=await client.auth.getUser();
        if(auth.error||!auth.data||!auth.data.user){
          close();closePage();if(typeof switchView==='function')switchView('account');
          alert('سجّل دخولك قبل شراء السلاح.');return;
        }
        if(typeof window.ensurePurchasePhone!=='function')throw Error('verification_unavailable');
        if(!await window.ensurePurchasePhone()){
          close();closePage();return;
        }
        var result=await client.rpc('create_purchase_order',{p_product_id:product.id,p_roblox_username:username});
        if(result.error)throw result.error;
        if(result.data?.id)void client.functions.invoke('l1017n-purchase-notify',{body:{order_id:result.data.id}})
          .then(({error})=>{if(error)console.warn('[purchase] Telegram notification pending')})
          .catch(()=>console.warn('[purchase] Telegram notification unavailable'));
        close();closePage();
        if(typeof renderWallet==='function')Promise.resolve(renderWallet()).catch(function(){});
        if(typeof renderOrders==='function')Promise.resolve(renderOrders()).catch(function(){});
        var order=result.data;
        var opened=order&&order.id&&window.L1017nManualHandover&&window.L1017nManualHandover.open({
          id:order.id,product_name:order.product_name||product.name,
          total_amount:order.total_amount??product.price,
          roblox_username:order.roblox_username||username,
          game:"mm2",product_key:product.product_key
        });
        if(!opened){
          if(typeof toast==='function')toast('تم الشراء بنجاح. افتح طلباتي وتواصل مع المتجر عبر واتساب أو تيليجرام لاستلام السلاح.');
          else alert('تم الشراء بنجاح. افتح طلباتي وتواصل مع المتجر لاستلام السلاح.');
        }
      }catch(err){
        var msg=String(err&&err.message||'');
        state.textContent=/insufficient_balance/i.test(msg)?'رصيد المحفظة غير كافٍ. اشحن المحفظة أولاً.':
          /phone_verification_required_before_purchase/i.test(msg)?'وثّق رقم الهاتف برسالة SMS قبل الشراء.':
          /product_not_available/i.test(msg)?'نفدت الكمية! المنتج أصبح غير متوفر. ما انخصم منك رصيد.':
          'تعذر إكمال الطلب. لم يتم تأكيد أي خصم. حاول لاحقًا.';
        if(/product_not_available/i.test(msg)){
          send.disabled=true;
          void showMm2Page().catch(function(){});
          return;
        }
      }finally{if(!state.textContent.includes('نفدت الكمية'))send.disabled=false}
    });
    form.querySelector('input').focus();
  }

  // Refresh visible MM2 stock when returning to the store on mobile.
  // Browsers with an already-open checkout still rely on the atomic DB guard.
  window.addEventListener('focus',function(){
    var p=document.getElementById(pageId);
    if(p&&p.classList.contains('rgp-mm2-page')&&!document.getElementById('rgpMm2Checkout')){
      void showMm2Page().catch(function(){});
    }
  });

  function escapeHtml(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}

  document.addEventListener('click',function(e){
    var roblox=e.target.closest('[data-product="roblox"]');
    if(!roblox)return;
    e.preventDefault();e.stopImmediatePropagation();window.openRobloxGameMenu();
  },true);
})();

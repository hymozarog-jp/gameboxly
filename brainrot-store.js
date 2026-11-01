/* L1017n — Steal a Brainrot Roblox inner category.
 * Existing Supabase prices and create_purchase_order remain the only purchase authority.
 * Original game: https://www.roblox.com/games/109983668079237/Steal-a-Brainrot
 */
(function(){
  "use strict";
  const GAME_ID = "7709344486";
  const API = "https://thumbnails.roblox.com/v1/games/icons?universeIds="+GAME_ID+"&size=512x512&format=Png&isCircular=false";
  // A previously published image on Roblox's official thumbnail CDN.
  const OFFICIAL_FALLBACK = "game-covers/steal-a-brainrot-original.png";
  const ART_FALLBACK = "game-covers/roblox.svg";
  const ITEMS = [
    { key:"steal-garama", name:"قرما", latin:"GARAMA", number:"01", image:"game-covers/garama.webp" },
    { key:"steal-los-secret", name:"لاسيكرت", latin:"LA SECRET", number:"02", image:"game-covers/la-secret.png" },
    { key:"steal-los-spooky", name:"سبوكي اند بمكي", latin:"SPOOKY AND PUMPKY", number:"03", image:"game-covers/spooky-and-pumpky.png" }
  ];
  let officialIcon = OFFICIAL_FALLBACK;
  let iconFetchStarted = false;
  let checkoutBusy = false;

  function escapeHtml(value){
    return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }
  function getClient(){
    if(typeof supabaseClient!=="undefined") return supabaseClient;
    return null;
  }
  function syncImage(img){
    if(!img) return;
    img.onerror=function(){
      if(this.dataset.fallback==="0"){
        this.dataset.fallback="1";
        this.src=ART_FALLBACK;
      }
    };
    img.dataset.fallback="0";
    img.src=officialIcon;
  }
  function loadOfficialIcon(){
    if(iconFetchStarted) return;
    iconFetchStarted=true;
    // Use Roblox's live icon when its API permits cross-site reads.
    fetch(API,{mode:"cors",cache:"force-cache"})
      .then(r=>r.ok?r.json():null)
      .then(j=>{
        const entry=j&&j.data&&j.data[0];
        if(!entry||entry.state!=="Completed"||!/^https:\/\/tr\.rbxcdn\.com\//.test(entry.imageUrl))return;
        officialIcon=entry.imageUrl;
        document.querySelectorAll("[data-steal-official-icon]").forEach(syncImage);
      })
      .catch(()=>{/* Browser CORS/offline: official CDN fallback remains. */});
  }
  function applyOfficialImages(root){
    root.querySelectorAll("[data-steal-official-icon]").forEach(syncImage);
    loadOfficialIcon();
  }
  function priceText(product){
    const amount=Number(product?.price);
    return Number.isFinite(amount)&&amount>0?amount.toFixed(2)+" د.ل":"السعر قريبًا";
  }
  function productCard(item,product){
    const available=!!(product&&product.active&&Number(product.price)>0);
    return '<article class="sab-item-card '+(available?'sab-available':'sab-pending')+'">'
      +'<div class="sab-card-top"><small>STEAL A BRAINROT</small><span>'+item.number+'</span></div>'
      +'<div class="sab-card-art"><img class="sab-character-image" src="'+escapeHtml(item.image)+'" alt="'+escapeHtml(item.name)+'" loading="lazy" decoding="async"><span class="sab-glow" aria-hidden="true"></span></div>'
      +'<span class="sab-card-label">'+escapeHtml(item.latin)+'</span>'
      +'<h3>'+escapeHtml(item.name)+'</h3>'
      +'<div class="sab-card-footer"><strong>'+priceText(product)+'</strong>'
      +(available?'<button type="button" class="sab-buy" data-steal-buy="'+escapeHtml(item.key)+'">فتح القائمة</button>'
        :'<span class="sab-unavailable">قريبًا</span>')
      +'</div></article>';
  }
  function renderItems(section, catalog){
    const map=new Map((catalog||[]).map(p=>[String(p.product_key),p]));
    const target=section.querySelector("#sabCatalog");
    if(!target)return;
    target.innerHTML='<div class="sab-products-grid">'+ITEMS.map(item=>productCard(item,map.get(item.key))).join("")+'</div>'
      +'<p class="sab-info">التسليم داخل ماب السرقة بعد مراجعة الطلب. الباقات غير المسعّرة لا يمكن شراؤها حاليًا.</p>';
    target.querySelectorAll("[data-steal-buy]").forEach(b=>{
      b.addEventListener("click",()=>{
        const product=map.get(b.dataset.stealBuy);
        if(product&&Number(product.price)>0&&product.active) openCheckout(product);
      });
    });
  }
  async function loadItems(section){
    const target=section.querySelector("#sabCatalog");
    if(!target)return;
    const client=getClient();
    if(!client){
      renderItems(section,[]);
      return;
    }
    const result=await client.from("products").select("id,product_key,name,game,price,active").eq("game","steal-a-brainrot").eq("active",true).order("sort_order");
    if(!section.isConnected)return;
    if(result.error){
      renderItems(section,[]);
      const msg=document.createElement("p");msg.className="sab-info sab-fetch-error";
      msg.textContent="تعذر تحديث الأسعار حاليًا. حاول فتح القسم مرة ثانية.";
      target.appendChild(msg);
      return;
    }
    renderItems(section,result.data||[]);
  }
  function closeCheckout(){
    const x=document.getElementById("sabCheckout");
    if(x)x.remove();
  }
  async function openCheckout(product){
    closeCheckout();
    const box=document.createElement("div");
    box.id="sabCheckout";
    box.setAttribute("role","dialog");
    box.setAttribute("aria-modal","true");
    box.setAttribute("aria-label","تأكيد شراء عنصر من ماب السرقة");
    box.innerHTML='<div class="sab-dialog">'
      +'<button type="button" class="sab-dialog-close" data-sab-cancel aria-label="إغلاق">×</button>'
      +'<span class="sab-dialog-kicker">STEAL A BRAINROT • L1017N</span>'
      +'<h2>'+escapeHtml(ITEMS.find(item=>item.key===product.product_key)?.name||product.name)+'</h2>'
      +'<strong class="sab-dialog-price">'+Number(product.price).toFixed(2)+' د.ل</strong>'
      +'<p>بعد الشراء لازم تتواصل مع المتجر عبر واتساب أو تيليجرام وتبعث رقم طلبك لاستلام الغرض داخل اللعبة. لا يتم تسليم كود فوري.</p>'
      +'<form id="sabCheckoutForm"><label for="sabRobloxUsername">اسم مستخدم Roblox</label>'
      +'<input id="sabRobloxUsername" autocomplete="off" minlength="3" maxlength="20" required pattern="[A-Za-z0-9_]{3,20}" placeholder="Roblox username" dir="ltr">'
      +'<div class="sab-dialog-actions"><button type="button" data-sab-cancel>إلغاء</button><button type="submit">تأكيد الشراء</button></div>'
      +'<p class="sab-dialog-status" role="status" aria-live="polite"></p></form></div>';
    document.body.appendChild(box);
    box.querySelectorAll("[data-sab-cancel]").forEach(b=>b.addEventListener("click",closeCheckout));
    box.addEventListener("click",e=>{if(e.target===box)closeCheckout()});
    const form=box.querySelector("form");
    const send=form.querySelector('[type="submit"]');
    const status=box.querySelector(".sab-dialog-status");
    form.addEventListener("submit",async e=>{
      e.preventDefault();
      if(checkoutBusy)return;
      const username=form.querySelector("input").value.trim();
      if(!/^[A-Za-z0-9_]{3,20}$/.test(username)){
        status.textContent="أدخل اسم Roblox صحيحًا من 3 إلى 20 حرفًا.";return;
      }
      const client=getClient();
      if(!client){status.textContent="تعذر الاتصال بالمتجر.";return;}
      checkoutBusy=true;send.disabled=true;
      status.textContent="جارٍ مراجعة الحساب والرصيد…";
      try{
        const auth=await client.auth.getUser();
        if(auth.error||!auth.data?.user) {
          status.textContent="سجّل دخولك أولًا، ثم أعد المحاولة.";return;
        }
        if(typeof window.ensurePurchasePhone!=="function"){
          status.textContent="خدمة التحقق من الهاتف غير جاهزة. حدّث الصفحة.";return;
        }
        if(!await window.ensurePurchasePhone())return;
        const r=await client.rpc("create_purchase_order",{p_product_id:product.id,p_roblox_username:username});
        if(r.error)throw r.error;
        if(r.data?.id)void client.functions.invoke('l1017n-purchase-notify',{body:{order_id:r.data.id}})
          .then(({error})=>{if(error)console.warn('[purchase] Telegram notification pending')})
          .catch(()=>console.warn('[purchase] Telegram notification unavailable'));
        closeCheckout();
        const main=document.getElementById("robloxGamePage");if(main)main.remove();
        if(typeof renderWallet==="function")Promise.resolve(renderWallet()).catch(()=>{});
        if(typeof renderOrders==="function")Promise.resolve(renderOrders()).catch(()=>{});
        const order=r.data;
        const opened=order?.id && window.L1017nManualHandover?.open({
          id:order.id,product_name:order.product_name||product.name,
          total_amount:order.total_amount??product.price,
          roblox_username:order.roblox_username||username,
          game:"steal-a-brainrot",product_key:product.product_key
        });
        if(!opened)alert("تم شراء "+product.name+" بنجاح. افتح «طلباتي» وتواصل مع المتجر عبر واتساب أو تيليجرام لاستلام الغرض.");
      }catch(error){
        const msg=String(error?.message||"");
        status.textContent=/insufficient_balance/i.test(msg)?"رصيدك غير كافٍ، اشحن المحفظة أولًا."
          :/phone_verification_required_before_purchase/i.test(msg)?"يجب توثيق رقم الهاتف قبل الشراء."
          :/product_not_available/i.test(msg)?"المنتج غير متاح حاليًا."
          :"تعذر إكمال الشراء. تحقق من طلباتك قبل المحاولة مجددًا.";
      }finally{checkoutBusy=false;if(send.isConnected)send.disabled=false;}
    });
    form.querySelector("input").focus();
  }

  function openInsideRoblox(){
    const root=document.getElementById("robloxGamePage");
    if(!root)return;
    const grid=root.querySelector(".rgp-grid");
    if(!grid)return;
    const section=document.createElement("section");
    section.className="sab-inner";
    section.innerHTML='<div class="sab-nav">'
      +'<a href="https://www.roblox.com/games/109983668079237/Steal-a-Brainrot" target="_blank" rel="noopener noreferrer" class="sab-original-link">الماب الأصلي في Roblox</a></div>'
      +'<div class="sab-hero"><div class="sab-hero-copy"><span>ROBLOX · L1017N</span>'
      +'<h2>ماب السرقة</h2><p>STEAL A BRAINROT</p><small>اختر الشخصية اللي تبيها وشوف السعر والتوفر.</small></div>'
      +'<img src="'+escapeHtml(officialIcon)+'" alt="صورة ماب Steal a Brainrot الأصلي في Roblox" data-steal-official-icon loading="lazy"></div>'
      +'<div class="sab-section-title"><div><span>STEAL A BRAINROT</span><h2>الشخصيات المتوفرة</h2></div><small>03 عناصر</small></div>'
      +'<div id="sabCatalog" aria-live="polite"></div>';
    grid.replaceWith(section);
    if(typeof window.setRobloxInnerHeader==="function"){
      window.setRobloxInnerHeader(root,"ماب السرقة","brainrot");
    }
    applyOfficialImages(section);
    renderItems(section,[]);
    loadItems(section).catch(()=>{
      if(section.isConnected)renderItems(section,[]);
    });
  }

  window.openStealBrainrotCategory=openInsideRoblox;
  window.refreshRobloxStealCover=applyOfficialImages;
})();

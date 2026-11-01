/* Instant digital code checkout. Wallet debit and stock allocation happen atomically in Postgres. */
(function(){
  'use strict';
  let busy = false;
  function client(){
    return typeof supabaseClient !== 'undefined' ? supabaseClient : null;
  }
  function message(error) {
    const text = String(error && (error.message || error.details) || error || '');
    if (/insufficient_balance/i.test(text)) return 'رصيد محفظتك غير كافٍ. اشحن المحفظة أولاً.';
    if (/code_out_of_stock/i.test(text)) return 'الأكواد نفدت لهذه الباقة. لم يتم خصم أي مبلغ.';
    if (/product_not_available|manual_fulfillment_required/i.test(text)) return 'هذه الباقة غير متاحة للتسليم الفوري.';
    if (/not_authenticated|JWT|unauthorized/i.test(text)) return 'سجّل الدخول أولاً للشراء.';
    if (/phone_required_before_purchase/i.test(text)) return 'لازم تضيف رقم هاتفك لحسابك قبل الشراء.';
    if (/phone_verification_required_before_purchase/i.test(text)) return 'لازم توثّق رقم هاتفك برسالة SMS من صفحة حسابي قبل الشراء.';
    return 'تعذر إتمام الشراء. تحقق من طلباتك قبل المحاولة مرة ثانية.';
  }
  function showDeliveredCode(name,code){
    const old = document.getElementById('instantCodeOverlay');
    if (old) old.remove();
    const overlay = document.createElement('div');
    overlay.id = 'instantCodeOverlay';
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.setAttribute('aria-label','كود الشراء');
    overlay.style.cssText='position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.82);display:flex;align-items:center;justify-content:center;padding:18px;direction:rtl';
    const box = document.createElement('div');
    box.style.cssText='width:min(96vw,480px);border-radius:22px;background:#102020;color:#fff;padding:25px;box-shadow:0 18px 70px #0009;text-align:center';
    const title=document.createElement('h2');
    title.textContent='✅ تم الشراء واستلام الكود';
    const product=document.createElement('p');
    product.textContent=name;
    const help=document.createElement('p');
    help.textContent='احتفظ بالكود. يمكنك الرجوع له دائمًا من صفحة «طلباتي».';
    const value=document.createElement('div');
    value.dir='ltr';
    value.style.cssText='margin:16px 0;padding:17px;background:#061312;border:1px solid #3a8d76;border-radius:14px;overflow-wrap:anywhere;font-size:1.16rem;font-weight:bold;user-select:all';
    value.textContent=code;
    const copy=document.createElement('button');
    copy.type='button'; copy.textContent='نسخ الكود';
    copy.className='btn btn-primary';
    copy.style.marginInlineEnd='8px';
    copy.onclick=async()=>{
      try{await navigator.clipboard.writeText(code);copy.textContent='تم النسخ ✓';}
      catch(_){copy.textContent='حدد الكود بالأعلى وانسخه';}
    };
    const close=document.createElement('button');
    close.type='button';close.className='btn btn-soft';close.textContent='إغلاق';
    close.onclick=()=>overlay.remove();
    box.append(title,product,value,help,copy,close);
    overlay.append(box);
    document.body.append(overlay);
    close.focus();
  }
  // Same full-screen detail menu as the other GAMEBOXLY packages.
  // Buying remains a separate, explicit action; opening a card never spends wallet credit.
  function confirmCodePurchase(name,amount){
    return new Promise(resolve=>{
      const prior=document.getElementById('gbCodePurchaseConfirm');
      if(prior)prior.remove();
      const overlay=document.createElement('section');
      overlay.id='gbCodePurchaseConfirm';
      overlay.setAttribute('role','dialog');
      overlay.setAttribute('aria-modal','true');
      overlay.setAttribute('aria-label','قائمة طلب الكود الرقمي');
      const shell=document.createElement('div');
      shell.className='gb-code-shell';
      const top=document.createElement('div');
      top.className='gb-package-top';
      const back=document.createElement('button');
      back.type='button';back.className='gb-package-back';back.textContent='رجوع للباقات ←';
      const brand=document.createElement('span');
      brand.className='gb-package-brand';brand.textContent='GAMEBOXLY • DIGITAL CODE';
      top.append(back,brand);
      const header=document.createElement('div');
      header.className='gb-code-heading';
      const art=document.createElement('div');art.className='gb-code-art';art.textContent='◈';art.setAttribute('aria-hidden','true');
      const title=document.createElement('div');
      const h=document.createElement('h2');h.textContent='قائمة طلب المنتج';
      const desc=document.createElement('p');desc.className='gb-code-description';desc.textContent='راجع الباقة قبل تأكيد الدفع من محفظتك.';
      title.append(h,desc);header.append(art,title);
      const summary=document.createElement('div');summary.className='gb-code-summary';
      const item=document.createElement('strong');item.textContent=String(name||'كود رقمي');
      const price=document.createElement('span');price.textContent=Number(amount).toFixed(2)+' د.ل';
      summary.append(item,price);
      const info=document.createElement('p');info.className='gb-code-note';
      info.textContent='سيتم خصم قيمة المنتج من محفظتك فقط بعد الضغط على «تأكيد الشراء». لا تضغط إذا لم تكن تريد شراء الكود.';
      const actions=document.createElement('div');actions.className='gb-code-actions';
      const cancel=document.createElement('button');cancel.type='button';cancel.textContent='إلغاء';
      const approve=document.createElement('button');approve.type='button';approve.className='gb-code-approve';approve.textContent='تأكيد الشراء';
      actions.append(cancel,approve);shell.append(top,header,summary,info,actions);overlay.append(shell);
      let settled=false;
      function finish(confirmed){
        if(settled)return;
        settled=true;
        overlay.removeEventListener('keydown',keyHandler);
        overlay.remove();resolve(confirmed);
      }
      function keyHandler(event){
        if(event.key==='Escape'){event.preventDefault();finish(false);}
        // Keep keyboard focus inside the checkout modal.
        if(event.key==='Tab'){
          const controls=[back,cancel,approve];
          const first=controls[0],last=controls[controls.length-1];
          if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
          else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
        }
      }
      overlay.addEventListener('keydown',keyHandler);
      back.addEventListener('click',()=>finish(false));
      cancel.addEventListener('click',()=>finish(false));
      approve.addEventListener('click',()=>finish(true));
      document.body.append(overlay);
      back.focus({preventScroll:true});
    });
  }
  window.showInstantCode=showDeliveredCode;
  window.openInstantCodeCheckout=async function(productId, productName, amount){
    if(busy) return;
    const db=client();
    if(!db){alert('تعذر تحميل المتجر. أعد تحميل الصفحة.');return;}
    busy=true;
    try {
      if(!await confirmCodePurchase(productName,amount))return;
      const {data:{user},error:authError}=await db.auth.getUser();
      if(authError||!user){alert('سجّل دخولك أولاً للشراء.');return;}
      if(typeof window.ensurePurchasePhone!=='function'){alert('تعذر تحميل التحقق من رقم الهاتف. حدّث الصفحة وحاول مرة ثانية.');return;}
      if(!await window.ensurePurchasePhone())return;
      const {data,error}=await db.rpc('buy_instant_code',{p_product_id:productId});
      if(error)throw error;
      if(!data||typeof data.code!=='string')throw new Error('unexpected_response');
      if(data.order_id)void db.functions.invoke('l1017n-purchase-notify',{body:{order_id:data.order_id}})
        .then(({error})=>{if(error)console.warn('[purchase] Telegram notification pending')})
        .catch(()=>console.warn('[purchase] Telegram notification unavailable'));
      showDeliveredCode(String(data.product_name||productName),data.code);
      try{if(typeof renderWallet==='function')await renderWallet();}catch(_){}
      try{if(typeof renderOrders==='function')await renderOrders();}catch(_){}
    }catch(error){
      alert(message(error));
    }finally{busy=false;}
  };
  window.getMyInstantCodes=async function(){
    const db=client();
    if(!db)return [];
    const {data,error}=await db.rpc('get_my_purchased_codes');
    if(error)throw error;
    return Array.isArray(data)?data:[];
  };
})();
/* GAMEBOXLY shared package experience. The original purchase handlers stay the only payment path. */
(function(){
  'use strict';
  if(window.GameboxPackageMenus)return;
  const types=[
    {id:'rgpMm2Checkout',inner:'.mm2-checkout-box',close:'[data-mm2-cancel]',label:'MM2'},
    {id:'sabCheckout',inner:'.sab-dialog',close:'.sab-dialog-close',label:'STEAL A BRAINROT'},
    {id:'pubgAccountCheckoutOverlay',inner:'.pubg-account-checkout',close:'.pubg-account-close',label:'PUBG MOBILE'}
  ];
  function addHeader(overlay,type){
    if(!overlay||overlay.dataset.gbPackageMenuReady==='1')return;
    const panel=overlay.querySelector(type.inner);
    if(!panel)return;
    overlay.dataset.gbPackageMenuReady='1';
    overlay.classList.add('gb-package-dialog');
    const top=document.createElement('div');
    top.className='gb-package-top';
    const back=document.createElement('button');
    back.type='button';
    back.className='gb-package-back';
    back.textContent='رجوع للباقات ←';
    back.setAttribute('aria-label','العودة إلى الباقات');
    back.addEventListener('click',()=>{
      const original=overlay.querySelector(type.close);
      if(original)original.click();
      else overlay.remove();
    });
    const brand=document.createElement('span');
    brand.className='gb-package-brand';
    brand.textContent='GAMEBOXLY • '+type.label;
    top.append(back,brand);
    panel.prepend(top);
    if(!panel.querySelector('.gb-package-preamble')){
      const preamble=document.createElement('p');
      preamble.className='gb-package-preamble';
      preamble.textContent='راجع تفاصيل الباقة وأكمل البيانات قبل تأكيد الشراء.';
      top.insertAdjacentElement('afterend',preamble);
    }
  }
  function sync(root){
    if(!root||root.nodeType!==1)return;
    types.forEach(type=>{
      if(root.id===type.id)addHeader(root,type);
      if(root.querySelector)root.querySelectorAll('#'+type.id).forEach(el=>addHeader(el,type));
    });
  }
  // A whole available product card opens its existing safe order form.
  // Never click a purchase confirmation automatically.
  function cardAction(target){
    const card=target&&target.closest&&target.closest(
      '.sab-item-card.sab-available,.pubg-pack,.ll-card'
    );
    if(!card)return null;
    const button=card.querySelector('[data-steal-buy]:not(:disabled),[data-pubg-buy]:not(:disabled),[data-ll-buy]:not(:disabled)');
    return button&&button.isConnected?{card,button}:null;
  }
  function isInnerControl(target,card){
    const el=target.closest('button,a,input,select,textarea,[role="button"],[contenteditable]');
    return !!(el&&card.contains(el));
  }
  document.addEventListener('click',event=>{
    if(event.defaultPrevented)return;
    const match=cardAction(event.target);
    if(!match||isInnerControl(event.target,match.card))return;
    event.preventDefault();
    match.button.click();
  });
  document.addEventListener('keydown',event=>{
    if(event.key!=='Enter'&&event.key!==' ')return;
    const match=cardAction(event.target);
    if(!match||event.target!==match.card)return;
    event.preventDefault();
    match.button.click();
  });
  function prepareCards(root){
    if(!root||root.nodeType!==1)return;
    const cards=[];
    if(root.matches?.('.sab-item-card.sab-available,.pubg-pack,.ll-card'))cards.push(root);
    root.querySelectorAll?.('.sab-item-card.sab-available,.pubg-pack,.ll-card').forEach(c=>cards.push(c));
    cards.forEach(card=>{
      if(card.dataset.gbCardPrepared==='1')return;
      if(!cardAction(card))return;
      card.dataset.gbCardPrepared='1';
      card.setAttribute('tabindex','0');
      card.setAttribute('aria-label','فتح قائمة '+(card.querySelector('h3')?.textContent?.trim()||'الباقة'));
    });
  }
  function boot(){
    sync(document.body);
    prepareCards(document.body);
    if(typeof MutationObserver==='function'){
      const observer=new MutationObserver(records=>{
        records.forEach(record=>record.addedNodes.forEach(node=>{
          sync(node);prepareCards(node);
        }));
      });
      observer.observe(document.body,{childList:true,subtree:true});
    }
  }
  if(document.body)boot();
  else document.addEventListener('DOMContentLoaded',boot,{once:true});
  window.GameboxPackageMenus={sync};
})();

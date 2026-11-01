/* Dedicated notification settings screen; no simulated alerts or push permissions. */
(function(){
 'use strict';
 let page=null,opener=null,afterClose=null,previousOverflow='';
 function remove(){
  if(!page)return;
  page.close();page.remove();page=null;document.body.style.overflow=previousOverflow;
  if(opener?.isConnected)opener.focus({preventScroll:true});
  const next=afterClose;afterClose=null;if(next)next();
 }
 function close(next){
  afterClose=next||null;
  if(history.state?.l1017nNotificationsPage)history.back();else remove();
 }
 function open(button){
  if(page)return;
  opener=button||document.activeElement;
  page=document.createElement('dialog');page.id='notificationsPage';page.dir='rtl';
  page.setAttribute('aria-labelledby','notificationsPageTitle');
  page.innerHTML='<div class="np-shell"><header class="np-header"><button type="button" class="np-back" aria-label="الرجوع إلى حسابي">→ رجوع</button><span>حسابي</span></header>'
   +'<div class="np-hero"><div class="np-bell" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg></div><h1 id="notificationsPageTitle" tabindex="-1">الإشعارات والتنبيهات</h1><p>تابع حالة طلباتك بسهولة</p></div>'
   +'<section class="np-card"><div class="np-card-label"><span class="np-dot" aria-hidden="true"></span>متابعة الطلبات</div><h2>آخر تحديثات طلباتك</h2><p>افتح طلباتي لمشاهدة حالة كل طلب وتفاصيله.</p><button type="button" class="np-orders">فتح طلباتي <span aria-hidden="true">←</span></button></section>'
   +'<section class="np-card np-muted"><div class="np-card-label">إشعارات الهاتف <span class="np-badge">غير متاحة حاليًا</span></div><p>يمكنك متابعة حالة طلباتك من داخل المتجر.</p></section></div>';
  page.querySelector('.np-back').addEventListener('click',()=>close());
  page.querySelector('.np-orders').addEventListener('click',()=>close(()=>{if(typeof switchView==='function')switchView('orders')}));
  page.addEventListener('cancel',e=>{e.preventDefault();close()});
  document.body.appendChild(page);previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
  history.pushState({...history.state,l1017nNotificationsPage:true},'');
  page.showModal();page.querySelector('h1').focus({preventScroll:true});
 }
 window.addEventListener('popstate',()=>{if(page&&!history.state?.l1017nNotificationsPage)remove()});
 document.addEventListener('click',e=>{
  const button=e.target.closest('[data-account-action="notifications"]');if(!button)return;
  e.preventDefault();e.stopImmediatePropagation();
  document.getElementById('accountSettingsDetail')?.classList.add('hidden');open(button);
 },true);
})();

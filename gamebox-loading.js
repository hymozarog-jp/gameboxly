/* GAMEBOXLY — contextual loading feedback for delayed customer actions.
   Visual feedback only: never approves payments or modifies checkout state. */
(function(){
  'use strict';
  if(window.GameboxLoading)return;
  var entries=new Map(),seq=0,visible=false,shownAt=0;
  var showTimer=0,hideTimer=0,gestureAt=0,gestureButton=null;
  var root=null,caption=null;
  var delay=420;
  function ensure(){
    if(root&&root.isConnected)return root;
    if(!document.body)return null;
    root=document.getElementById('gbActivityLoader');
    if(!root){
      root=document.createElement('div');
      root.id='gbActivityLoader';
      root.className='gb-activity-loader';
      root.setAttribute('role','status');
      root.setAttribute('aria-live','polite');
      root.setAttribute('aria-atomic','true');
      root.innerHTML='<span class="gb-activity-ring" aria-hidden="true"></span><span class="gb-activity-label">جاري التحميل…</span><span class="gb-activity-line" aria-hidden="true"></span>';
      document.body.appendChild(root);
    }
    caption=root.querySelector('.gb-activity-label');
    return root;
  }
  function labelFor(button){
    if(!button)return 'جاري تحميل البيانات…';
    var view=button.getAttribute('data-view')||'';
    if(view==='wallet')return 'جاري تحميل المحفظة…';
    if(view==='orders')return 'جاري تحميل طلباتك…';
    if(view==='leaderboard')return 'جاري تحميل التصنيف…';
    if(view==='account')return 'جاري تحميل حسابك…';
    var text=(button.textContent||button.getAttribute('aria-label')||'').trim().slice(0,75);
    if(/شحن|تحويل|رصيد|محفظة/.test(text))return 'جاري التحقق من طلب الشحن…';
    if(/شراء|دفع|تأكيد الطلب|متابعة/.test(text))return 'جاري تجهيز طلبك…';
    if(/دخول|حساب|تحقق|رمز|كلمة المرور/.test(text))return 'جاري التحقق من بياناتك…';
    if(/حفظ|تعديل|تحديث/.test(text))return 'جاري حفظ التغييرات…';
    return 'جاري تحميل البيانات…';
  }
  function paintButton(button){
    if(!button||!button.isConnected)return;
    var busy=false;
    entries.forEach(function(e){if(e.button===button)busy=true;});
    button.classList.toggle('gb-async-busy',busy);
    if(busy)button.setAttribute('aria-busy','true');
    else if(button.getAttribute('aria-busy')==='true')button.removeAttribute('aria-busy');
  }
  function render(){
    if(!entries.size){clearTimeout(showTimer);showTimer=0;
      if(visible){
        clearTimeout(hideTimer);
        hideTimer=setTimeout(function(){
          if(entries.size)return;
          visible=false;
          if(root)root.classList.remove('gb-visible');
        },Math.max(0,420-(Date.now()-shownAt)));
      }
      return;
    }
    clearTimeout(hideTimer);
    var latest=Array.from(entries.values()).filter(function(e){return e.explicit;}).pop()
      ||Array.from(entries.values()).slice(-1)[0];
    if(caption)caption.textContent=latest.label||'جاري التحميل…';
    if(visible)return;
    if(!showTimer)showTimer=setTimeout(function(){
      showTimer=0;
      if(!entries.size)return;
      var el=ensure();
      if(!el)return;
      var current=Array.from(entries.values()).pop();
      caption.textContent=current.label||'جاري التحميل…';
      visible=true;shownAt=Date.now();el.classList.add('gb-visible');
    },delay);
  }
  function begin(label,button,explicit){
    var id=++seq;
    var item={label:String(label||'جاري التحميل…'),button:button||null,explicit:!!explicit,timeout:0,slowTimer:0};
    entries.set(id,item);
    if(item.button)paintButton(item.button);
    item.slowTimer=setTimeout(function(){
      if(entries.has(id)&&caption&&visible)caption.textContent=/شحن|تحويل|دفع|طلب/.test(item.label)?'الاتصال يتأخر… لا تكرر الدفع أو التحويل':'الاتصال يتأخر… جاري المحاولة';
    },14000);
    // The UI never freezes permanently on a lost connection.
    item.timeout=setTimeout(function(){end(id);},65000);
    render();
    return id;
  }
  function end(id){
    if(!entries.has(id))return;
    var item=entries.get(id);
    clearTimeout(item.timeout);clearTimeout(item.slowTimer);
    entries.delete(id);
    paintButton(item.button);
    render();
  }
  function track(promise,label){
    var t=begin(label,null,true);
    return Promise.resolve(promise).finally(function(){end(t);});
  }
  window.GameboxLoading=Object.freeze({begin:begin,end:end,track:track});
  document.addEventListener('click',function(ev){
    var button=ev.target&&ev.target.closest&&ev.target.closest('button,[role="button"],a[href]');
    if(!button||button.disabled||button.closest('#gbActivityLoader'))return;
    gestureButton=button;gestureAt=Date.now();
  },true);
  document.addEventListener('submit',function(ev){
    gestureAt=Date.now();
    gestureButton=ev.submitter||ev.target.querySelector('[type="submit"]')||null;
  },true);
  var nativeFetch=window.fetch;
  if(typeof nativeFetch==='function'){
    window.fetch=function(){
      var active=Date.now()-gestureAt<2800||(entries.size>0&&Date.now()-gestureAt<11000);
      var token=active?begin(labelFor(gestureButton),gestureButton,false):null;
      var promise;
      try{promise=nativeFetch.apply(this,arguments);}
      catch(err){if(token)end(token);throw err;}
      if(!token)return promise;
      return Promise.resolve(promise).finally(function(){end(token);});
    };
  }
  function observeImage(img){
    if(!img||img.dataset.gbLoadingHooked)return;
    img.dataset.gbLoadingHooked='1';
    var finish=function(){img.classList.remove('gb-image-loading');};
    img.addEventListener('load',finish);
    img.addEventListener('error',finish);
    if(!img.complete)img.classList.add('gb-image-loading');
  }
  function imagesIn(node){
    if(!node||node.nodeType!==1)return;
    if(node.tagName==='IMG')observeImage(node);
    if(node.querySelectorAll)node.querySelectorAll('img').forEach(observeImage);
  }
  function boot(){
    ensure();imagesIn(document.body);
    if(typeof MutationObserver==='function'){
      new MutationObserver(function(records){
        records.forEach(function(record){
          record.addedNodes.forEach(imagesIn);
          if(record.type==='attributes'&&record.target.tagName==='IMG'){
            var img=record.target;
            img.classList.toggle('gb-image-loading',!img.complete);
          }
        });
      }).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});
    }
  }
  if(document.body)boot();else document.addEventListener('DOMContentLoaded',boot,{once:true});
  var startup=begin('جاري تجهيز المتجر…',null,true);
  if(document.readyState==='complete')end(startup);
  else window.addEventListener('load',function(){end(startup);},{once:true});
})();

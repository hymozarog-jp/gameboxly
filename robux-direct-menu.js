/* GAMEBOXLY: tapping a Robux package opens its order menu directly.
 * No sticky "متابعة" footer and no payment on card tap. */
(function () {
  'use strict';
  document.documentElement.classList.add('gb-robux-direct-menu');
  var busy=false;
  function openMenu(tile){
    if(busy||!tile||tile.disabled)return;
    var modal=tile.closest('#robuxModal');
    var box=modal&&modal.querySelector('#purchaseBox');
    if(!modal||!box)return;
    busy=true;
    tile.setAttribute('aria-busy','true');
    modal.querySelectorAll('.robux-package').forEach(function(item){
      var on=item===tile;
      item.classList.toggle('selected',on);
      var marker=item.querySelector('.robux-plus');
      if(marker)marker.textContent=on?'✓':'＋';
    });
    Promise.resolve().then(async function(){
      if(typeof window.selectPackage!=='function')throw new Error('نموذج الطلب غير جاهز');
      await window.selectPackage(tile.getAttribute('data-robux'));
      if(!box.querySelector('#purchaseForm'))throw new Error('تعذر فتح قائمة الطلب');
      document.getElementById('robuxPurchaseScreen')?.remove();
      var screen=document.createElement('section');
      screen.id='robuxPurchaseScreen';
      screen.className='robux-direct-menu';
      screen.dir='rtl';
      screen.setAttribute('role','dialog');
      screen.setAttribute('aria-modal','true');
      screen.setAttribute('aria-label','قائمة طلب روبوكس');
      var top=document.createElement('div');
      top.className='robux-menu-top';
      var back=document.createElement('button');
      back.type='button';
      back.className='robux-purchase-back';
      back.textContent='رجوع للباقات ←';
      var kicker=document.createElement('span');
      kicker.className='robux-menu-kicker';
      kicker.textContent='GAMEBOXLY • ROBUX';
      top.append(back,kicker);
      var heading=document.createElement('div');
      heading.className='robux-menu-heading';
      var art=document.createElement('img');
      art.src='game-covers/robux-100-tokens.svg?v=robux-art2';
      art.alt='';
      var words=document.createElement('div');
      var headingTitle=document.createElement('h2');
      headingTitle.textContent='قائمة طلب روبوكس';
      var description=document.createElement('p');
      description.textContent='راجع الباقة وتحقق من حساب Roblox قبل تأكيد الشراء.';
      words.append(headingTitle,description);
      heading.append(art,words);
      var summary=document.createElement('div');
      summary.className='robux-menu-summary';
      var product=document.createElement('strong');
      product.textContent=tile.querySelector('strong')?.textContent||'100 روبوكس';
      var price=document.createElement('span');
      price.textContent=tile.querySelector('small:not(.stock-label)')?.textContent||'';
      summary.append(product,price);
      screen.append(top,heading,summary,box);
      box.style.display='block';
      var close=function(){
        var home=modal.querySelector('.robux-store-box');
        if(home&&box.isConnected)home.appendChild(box);
        box.style.display='none';
        screen.remove();
        modal.querySelectorAll('.robux-package.selected').forEach(function(item){
          item.classList.remove('selected');
          var marker=item.querySelector('.robux-plus');
          if(marker)marker.textContent='＋';
        });
        tile.focus({preventScroll:true});
      };
      back.addEventListener('click',close);
      screen.addEventListener('keydown',function(event){
        if(event.key==='Escape'){event.preventDefault();close();}
      });
      document.body.appendChild(screen);
      window.scrollTo({top:0,behavior:'auto'});
      back.focus({preventScroll:true});
    }).catch(function(err){
      console.warn('[robux/menu]',err);
      if(typeof window.toast==='function')window.toast('تعذر فتح القائمة، حاول من جديد');
    }).finally(function(){
      busy=false;
      tile.removeAttribute('aria-busy');
    });
  }
  document.addEventListener('click',function(event){
    var tile=event.target&&event.target.closest&&event.target.closest('#robuxModal .robux-package[data-robux]');
    if(!tile||tile.disabled)return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    openMenu(tile);
  },true);
})();
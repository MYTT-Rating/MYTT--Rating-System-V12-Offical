(()=>{
  'use strict';

  /* MYTT Events repair helper.
     This file never removes or disables the native registration control.
     It restores a missing control from the event's own current status. */
  const cfg=window.MYTT||{};
  let rescueRunning=false;

  function eventIsOpen(card){
    if(!card)return false;
    const status=(card.querySelector('.me5-status,.target-status-summary')?.textContent||'').toLowerCase();
    return /registration open|almost full/.test(status) && !/closed|full/.test(status);
  }

  function eventId(card){
    const native=card?.querySelector('[data-register-event]');
    if(native?.dataset.registerEvent)return native.dataset.registerEvent;
    return (card?.querySelector('.target-event-id')?.textContent||'').trim();
  }

  function restoreButtons(){
    document.querySelectorAll('#eventsGrid .target-event-shell').forEach(card=>{
      if(!eventIsOpen(card))return;
      const id=eventId(card);
      if(!id)return;

      const mobileWrap=card.querySelector('.me5-register-wrap');
      if(mobileWrap && !mobileWrap.querySelector('[data-register-event]')){
        mobileWrap.innerHTML=`<button class="me5-register" type="button" data-register-event="${id}"><span>REGISTER NOW</span><b>→</b></button>`;
      }

      const desktopWrap=card.querySelector('.target-hero-action');
      if(desktopWrap && !desktopWrap.querySelector('[data-register-event]')){
        desktopWrap.innerHTML=`<button class="target-register-button" type="button" data-register-event="${id}"><span>REGISTER NOW</span><b>→</b></button>`;
      }
    });
  }

  function eventsStillLoading(){
    const grid=document.getElementById('eventsGrid');
    if(!grid)return false;
    if(grid.querySelector('.target-event-shell'))return false;
    const text=(grid.textContent||'').toLowerCase();
    return /loading upcoming|checking events|refreshing events/.test(text)||!!grid.querySelector('.event-empty-state');
  }

  async function rescueEvents(){
    if(rescueRunning||!eventsStillLoading()||!cfg.eventsCsvUrl)return;
    if(typeof parseCSV!=='function'||typeof cleanRows!=='function'||typeof publishedRowsToEvents!=='function'||typeof renderUpcomingEvents!=='function')return;
    rescueRunning=true;
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),8000);
    try{
      const sep=cfg.eventsCsvUrl.includes('?')?'&':'?';
      const res=await fetch(cfg.eventsCsvUrl+sep+'_='+Date.now(),{cache:'no-store',signal:controller.signal});
      if(!res.ok)throw new Error('Events CSV HTTP '+res.status);
      const rows=cleanRows(parseCSV(await res.text()));
      const events=publishedRowsToEvents(rows);
      if(events.length){
        upcomingEvents=events;
        renderUpcomingEvents();
        try{cacheUpcomingEvents(events)}catch(_){}
        setTimeout(restoreButtons,0);
      }
    }catch(err){
      console.warn('MYTT Events safe fallback unavailable',err);
    }finally{
      clearTimeout(timer);
      rescueRunning=false;
    }
  }

  function repair(){
    restoreButtons();
    rescueEvents();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{setTimeout(repair,300);setTimeout(repair,1500);setTimeout(repair,4000)},{once:true});
  else{setTimeout(repair,300);setTimeout(repair,1500);setTimeout(repair,4000)}

  document.addEventListener('click',e=>{
    if(!e.target.closest('a[href="#events"],[data-v14-target="events"]'))return;
    setTimeout(repair,80);
    setTimeout(repair,800);
  });

  const observer=new MutationObserver(()=>restoreButtons());
  const startObserver=()=>{const grid=document.getElementById('eventsGrid');if(grid)observer.observe(grid,{childList:true,subtree:true})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startObserver,{once:true});else startObserver();
})();

(()=>{
  'use strict';

  /*
   * MYTT Events safety helper.
   * Keep this file intentionally small and non-invasive:
   * - no MutationObserver
   * - no automatic registrations API polling
   * - never edits or disables the official REGISTER NOW button
   * - only supplies a fast fallback if the main Events loader is still stuck
   */

  const cfg=window.MYTT||{};
  let rescueRunning=false;
  let rescueDone=false;

  function eventsStillLoading(){
    const grid=document.getElementById('eventsGrid');
    if(!grid)return false;
    if(grid.querySelector('.target-event-shell'))return false;
    const text=(grid.textContent||'').toLowerCase();
    return /loading upcoming|checking events|refreshing events/.test(text) || !!grid.querySelector('.event-empty-state');
  }

  async function rescueEvents(){
    if(rescueRunning||rescueDone||!eventsStillLoading())return;
    if(!cfg.eventsCsvUrl)return;
    if(typeof parseCSV!=='function'||typeof cleanRows!=='function'||typeof publishedRowsToEvents!=='function'||typeof renderUpcomingEvents!=='function')return;

    rescueRunning=true;
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),8000);

    try{
      const sep=cfg.eventsCsvUrl.includes('?')?'&':'?';
      const res=await fetch(cfg.eventsCsvUrl+sep+'_='+Date.now(),{
        cache:'no-store',
        signal:controller.signal
      });
      if(!res.ok)throw new Error('Events CSV HTTP '+res.status);

      const text=await res.text();
      const rows=cleanRows(parseCSV(text));
      const events=publishedRowsToEvents(rows);

      if(events.length){
        upcomingEvents=events;
        renderUpcomingEvents();
        try{cacheUpcomingEvents?.(events)}catch(_){}
        rescueDone=true;
      }
    }catch(err){
      console.warn('MYTT Events safe fallback unavailable',err);
    }finally{
      clearTimeout(timer);
      rescueRunning=false;
    }
  }

  function scheduleRescue(){
    setTimeout(rescueEvents,900);
    setTimeout(rescueEvents,3200);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',scheduleRescue,{once:true});
  }else{
    scheduleRescue();
  }

  document.addEventListener('click',e=>{
    const eventsLink=e.target.closest('a[href="#events"],[data-v14-target="events"]');
    if(!eventsLink)return;
    setTimeout(rescueEvents,120);
  });
})();

(()=>{
  'use strict';

  const cfg=window.MYTT||{};
  const api=String(cfg.eventsWebAppUrl||cfg.eventWebAppUrl||'').trim();
  if(!api)return;

  const cache=new Map();
  const inflight=new Map();
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function jsonp(params){
    return new Promise((resolve,reject)=>{
      const cb='__myttEventPlayers_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7);
      const script=document.createElement('script');
      let done=false;
      const finish=()=>{if(done)return;done=true;try{delete window[cb]}catch(_){window[cb]=undefined}script.remove()};
      const timer=setTimeout(()=>{finish();reject(new Error('timeout'))},8000);
      window[cb]=data=>{clearTimeout(timer);finish();resolve(data)};
      script.onerror=()=>{clearTimeout(timer);finish();reject(new Error('network'))};
      const qs=new URLSearchParams({...params,callback:cb,_:Date.now()});
      script.src=api+(api.includes('?')?'&':'?')+qs.toString();
      document.body.appendChild(script);
    });
  }

  async function getPlayers(eventId,{fresh=false}={}){
    if(!fresh&&cache.has(eventId))return cache.get(eventId);
    if(inflight.has(eventId))return inflight.get(eventId);
    const req=jsonp({action:'registrations',eventId}).then(data=>{
      if(!data||data.status!=='ok')throw new Error(data?.message||'Unable to load registered players');
      const players=Array.isArray(data.registrations)?data.registrations:[];
      cache.set(eventId,players);
      return players;
    }).finally(()=>inflight.delete(eventId));
    inflight.set(eventId,req);
    return req;
  }

  function eventIdFromCard(card){
    const btn=card.querySelector('[data-event-id],[data-eventid]');
    return btn?.dataset.eventId||btn?.dataset.eventid||card.dataset.eventId||card.dataset.eventid||'';
  }

  function parseCapacity(card){
    const text=card.innerText||'';
    const matches=[...text.matchAll(/(\d+)\s*\/\s*(\d+)/g)];
    for(const m of matches){
      const filled=Number(m[1]),capacity=Number(m[2]);
      if(capacity>0&&filled>=0&&filled<=capacity)return{filled,capacity};
    }
    return{filled:null,capacity:null};
  }

  function findRegisterButton(card){
    const candidates=[...card.querySelectorAll('button,a')];
    return candidates.find(el=>{
      if(el.classList.contains('event-view-players'))return false;
      const t=(el.textContent||'').trim().toLowerCase();
      return /register|join event|sign up/.test(t);
    })||null;
  }

  function setFullState(card,isFull){
    card.classList.toggle('event-card-full',!!isFull);
    let badge=card.querySelector('.event-full-badge');
    if(isFull){
      if(!badge){badge=document.createElement('span');badge.className='event-full-badge';badge.textContent='FULL';card.appendChild(badge)}
      const reg=findRegisterButton(card);
      if(reg){
        if(!reg.dataset.fullOriginalText)reg.dataset.fullOriginalText=(reg.textContent||'').trim();
        reg.classList.add('event-register-full');
        if(reg.tagName==='BUTTON')reg.disabled=true;
        reg.setAttribute('aria-disabled','true');
        reg.textContent='Event Full';
      }
    }else{
      badge?.remove();
      const reg=findRegisterButton(card);
      if(reg&&reg.classList.contains('event-register-full')){
        reg.classList.remove('event-register-full');
        if(reg.tagName==='BUTTON')reg.disabled=false;
        reg.removeAttribute('aria-disabled');
        if(reg.dataset.fullOriginalText)reg.textContent=reg.dataset.fullOriginalText;
      }
    }
  }

  function updateButton(btn,count,capacity){
    const value=capacity?`${count} / ${capacity}`:String(count);
    btn.innerHTML=`<span><b>Registered Players</b><small>View confirmed list</small></span><strong>${esc(value)} <i aria-hidden="true">›</i></strong>`;
    btn.setAttribute('aria-label',`View registered players. ${count}${capacity?' of '+capacity:''} registered.`);
  }

  async function hydrateCard(card,eventId,btn){
    if(card.dataset.eventPlayersHydrated==='loading')return;
    card.dataset.eventPlayersHydrated='loading';
    const parsed=parseCapacity(card);
    if(parsed.filled!==null)updateButton(btn,parsed.filled,parsed.capacity);
    try{
      const players=await getPlayers(eventId);
      const count=players.length;
      const capacity=parsed.capacity;
      updateButton(btn,count,capacity);
      setFullState(card,!!capacity&&count>=capacity);
      card.dataset.registeredCount=String(count);
      if(capacity)card.dataset.eventCapacity=String(capacity);
      card.dataset.eventPlayersHydrated='done';
    }catch(err){
      console.warn('MYTT event player count unavailable',err);
      card.dataset.eventPlayersHydrated='error';
      if(parsed.filled===null)btn.innerHTML='<span><b>Registered Players</b><small>View confirmed list</small></span><strong>View <i aria-hidden="true">›</i></strong>';
    }
  }

  function ensureButton(card){
    const eventId=eventIdFromCard(card);
    if(!eventId)return;
    let btn=card.querySelector('.event-view-players');
    if(!btn){
      btn=document.createElement('button');
      btn.type='button';
      btn.className='event-view-players';
      btn.dataset.eventId=eventId;
      btn.innerHTML='<span><b>Registered Players</b><small>View confirmed list</small></span><strong>View <i aria-hidden="true">›</i></strong>';
      const actions=card.querySelector('.event-actions,.event-card-actions,.event-footer')||card;
      actions.appendChild(btn);
    }else btn.dataset.eventId=eventId;
    hydrateCard(card,eventId,btn);
  }

  function scan(){document.querySelectorAll('#eventsGrid .event-card, #eventsGrid article').forEach(ensureButton)}

  function eventTitle(eventId){
    const card=[...document.querySelectorAll('#eventsGrid .event-card, #eventsGrid article')].find(c=>eventIdFromCard(c)===eventId);
    if(!card)return 'Registered Players';
    const h=card.querySelector('h2,h3,.event-title,.event-name');
    return (h?.textContent||'Registered Players').trim();
  }

  function openModal(eventId,players){
    let modal=document.getElementById('eventPlayersModal');
    if(!modal){
      modal=document.createElement('div');
      modal.id='eventPlayersModal';
      modal.className='event-players-modal hidden';
      modal.innerHTML='<button class="event-players-backdrop" aria-label="Close registered players"></button><section class="event-players-sheet" role="dialog" aria-modal="true" aria-labelledby="eventPlayersTitle"><div class="event-players-grab" aria-hidden="true"></div><div class="event-players-head"><div><small>MYTT EVENT</small><h3 id="eventPlayersTitle">Registered Players</h3><p id="eventPlayersEventName"></p></div><button type="button" class="event-players-close" aria-label="Close">×</button></div><div class="event-players-body"></div></section>';
      document.body.appendChild(modal);
      modal.querySelector('.event-players-close').onclick=closeModal;
      modal.querySelector('.event-players-backdrop').onclick=closeModal;
    }
    modal.querySelector('#eventPlayersEventName').textContent=eventTitle(eventId);
    const card=[...document.querySelectorAll('#eventsGrid .event-card, #eventsGrid article')].find(c=>eventIdFromCard(c)===eventId);
    const capacity=Number(card?.dataset.eventCapacity)||parseCapacity(card||document.createElement('div')).capacity||0;
    const body=modal.querySelector('.event-players-body');
    const countLine=capacity?`${players.length} / ${capacity} registered`:`${players.length} registered`;
    body.innerHTML=players.length?`<div class="event-player-count"><span>${esc(countLine)}</span>${capacity&&players.length>=capacity?'<b>FULL</b>':''}</div><div class="event-player-list">${players.map((p,i)=>`<div class="event-player-row"><span class="event-player-number">${i+1}</span><div><strong>${esc(p.playerName||'Player')}</strong><small>${p.myttId?esc(p.myttId):'MYTT ID pending'}${p.category?' · '+esc(p.category):''}</small></div></div>`).join('')}</div>`:'<div class="event-player-empty"><span>🏓</span><strong>No confirmed players yet</strong><small>Be the first player to register for this MYTT event.</small></div>';
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden','false');
    document.body.classList.add('event-players-open');
    setTimeout(()=>modal.querySelector('.event-players-close')?.focus(),20);
  }

  function closeModal(){
    const modal=document.getElementById('eventPlayersModal');
    if(!modal)return;
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden','true');
    document.body.classList.remove('event-players-open');
  }

  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});

  document.addEventListener('click',async e=>{
    const btn=e.target.closest('.event-view-players');
    if(!btn)return;
    const eventId=btn.dataset.eventId;
    const old=btn.innerHTML;
    btn.disabled=true;
    btn.classList.add('is-loading');
    btn.innerHTML='<span><b>Registered Players</b><small>Loading confirmed list…</small></span><strong>•••</strong>';
    try{
      const players=await getPlayers(eventId,{fresh:true});
      const card=btn.closest('.event-card,article');
      const capacity=Number(card?.dataset.eventCapacity)||parseCapacity(card||document.createElement('div')).capacity||null;
      updateButton(btn,players.length,capacity);
      if(card)setFullState(card,!!capacity&&players.length>=capacity);
      openModal(eventId,players);
    }catch(err){
      console.error('MYTT registered players',err);
      btn.innerHTML='<span><b>Registered Players</b><small>Could not load list</small></span><strong>Retry <i aria-hidden="true">›</i></strong>';
    }finally{
      btn.disabled=false;
      btn.classList.remove('is-loading');
      if(!btn.innerHTML.trim())btn.innerHTML=old;
    }
  });

  const grid=document.getElementById('eventsGrid');
  new MutationObserver(scan).observe(grid||document.body,{childList:true,subtree:true});
  scan();
})();
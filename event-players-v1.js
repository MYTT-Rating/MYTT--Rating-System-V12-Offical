(()=>{
  'use strict';

  const cfg=window.MYTT||{};
  const api=String(cfg.eventsWebAppUrl||cfg.eventWebAppUrl||'').trim();
  if(!api)return;

  const cache=new Map();
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function jsonp(params){
    return new Promise((resolve,reject)=>{
      const cb='__myttEventPlayers_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7);
      const script=document.createElement('script');
      let done=false;
      const finish=()=>{if(done)return;done=true;try{delete window[cb]}catch(_){window[cb]=undefined}script.remove()};
      const timer=setTimeout(()=>{finish();reject(new Error('timeout'))},7000);
      window[cb]=data=>{clearTimeout(timer);finish();resolve(data)};
      script.onerror=()=>{clearTimeout(timer);finish();reject(new Error('network'))};
      const qs=new URLSearchParams({...params,callback:cb,_:Date.now()});
      script.src=api+(api.includes('?')?'&':'?')+qs.toString();
      document.body.appendChild(script);
    });
  }

  async function getPlayers(eventId){
    if(cache.has(eventId))return cache.get(eventId);
    const data=await jsonp({action:'registrations',eventId});
    if(!data||data.status!=='ok')throw new Error(data?.message||'Unable to load registered players');
    const players=Array.isArray(data.registrations)?data.registrations:[];
    cache.set(eventId,players);
    return players;
  }

  function eventIdFromCard(card){
    const btn=card.querySelector('[data-event-id],[data-eventid]');
    return btn?.dataset.eventId||btn?.dataset.eventid||card.dataset.eventId||card.dataset.eventid||'';
  }

  function ensureButton(card){
    if(card.querySelector('.event-view-players'))return;
    const eventId=eventIdFromCard(card);
    if(!eventId)return;
    const filledText=[...card.querySelectorAll('*')].map(n=>n.children.length?null:n.textContent).find(t=>t&&/\d+\s*\/\s*(\d+)/.test(t));
    const m=filledText&&filledText.match(/(\d+)\s*\/\s*(\d+)/);
    const count=m?Number(m[1]):null;
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='event-view-players';
    btn.dataset.eventId=eventId;
    btn.innerHTML=`<span>Registered Players</span><strong>${count===null?'View':esc(count)}</strong>`;
    const actions=card.querySelector('.event-actions,.event-card-actions,.event-footer')||card;
    actions.appendChild(btn);
  }

  function scan(){document.querySelectorAll('#eventsGrid .event-card, #eventsGrid article').forEach(ensureButton)};

  function openModal(eventId,players){
    let modal=document.getElementById('eventPlayersModal');
    if(!modal){
      modal=document.createElement('div');
      modal.id='eventPlayersModal';
      modal.className='event-players-modal hidden';
      modal.innerHTML='<button class="event-players-backdrop" aria-label="Close registered players"></button><section class="event-players-sheet" role="dialog" aria-modal="true" aria-labelledby="eventPlayersTitle"><div class="event-players-head"><div><small>MYTT EVENT</small><h3 id="eventPlayersTitle">Registered Players</h3></div><button type="button" class="event-players-close" aria-label="Close">×</button></div><div class="event-players-body"></div></section>';
      document.body.appendChild(modal);
      modal.querySelector('.event-players-close').onclick=closeModal;
      modal.querySelector('.event-players-backdrop').onclick=closeModal;
    }
    const body=modal.querySelector('.event-players-body');
    body.innerHTML=players.length?`<div class="event-player-count">${players.length} registered</div><div class="event-player-list">${players.map((p,i)=>`<div class="event-player-row"><span class="event-player-number">${i+1}</span><div><strong>${esc(p.playerName||'Player')}</strong><small>${esc(p.myttId||'MYTT ID pending')}${p.category?' · '+esc(p.category):''}</small></div></div>`).join('')}</div>`:'<div class="event-player-empty">No confirmed players yet.</div>';
    modal.classList.remove('hidden');
    document.body.classList.add('event-players-open');
  }

  function closeModal(){document.getElementById('eventPlayersModal')?.classList.add('hidden');document.body.classList.remove('event-players-open')}

  document.addEventListener('click',async e=>{
    const btn=e.target.closest('.event-view-players');
    if(!btn)return;
    const eventId=btn.dataset.eventId;
    const old=btn.innerHTML;
    btn.disabled=true;btn.innerHTML='<span>Registered Players</span><strong>Loading…</strong>';
    try{openModal(eventId,await getPlayers(eventId))}catch(err){console.error('MYTT registered players',err);btn.innerHTML='<span>Registered Players</span><strong>Retry</strong>';setTimeout(()=>{btn.disabled=false},500);return}
    btn.innerHTML=old;btn.disabled=false;
  });

  new MutationObserver(scan).observe(document.getElementById('eventsGrid')||document.body,{childList:true,subtree:true});
  scan();
})();
(function(){
  'use strict';

  const CACHE_PREFIX = 'mytt:data-cache:v1:';
  const MAX_AGE_MS = 24 * 60 * 60 * 1000;
  const nativeFetch = window.fetch.bind(window);
  const allowedHosts = new Set([
    'docs.google.com',
    'script.google.com',
    'script.googleusercontent.com'
  ]);

  function cacheKey(url){
    try{
      const u = new URL(url, location.href);
      u.searchParams.delete('t');
      return CACHE_PREFIX + u.toString();
    }catch(_){
      return CACHE_PREFIX + String(url || '');
    }
  }

  function isCacheableRequest(input, init){
    const method = String((init && init.method) || (input && input.method) || 'GET').toUpperCase();
    if(method !== 'GET') return false;
    try{
      const u = new URL(typeof input === 'string' ? input : input.url, location.href);
      return allowedHosts.has(u.hostname);
    }catch(_){
      return false;
    }
  }

  function readCache(key){
    try{
      const raw = localStorage.getItem(key);
      if(!raw) return null;
      const entry = JSON.parse(raw);
      if(!entry || !entry.body || !entry.savedAt) return null;
      if(Date.now() - entry.savedAt > MAX_AGE_MS){
        localStorage.removeItem(key);
        return null;
      }
      return entry;
    }catch(_){
      return null;
    }
  }

  async function saveCache(key, response){
    try{
      if(!response || !response.ok) return;
      const clone = response.clone();
      const body = await clone.text();
      if(!body || body.length > 3_000_000) return;
      localStorage.setItem(key, JSON.stringify({
        body,
        savedAt: Date.now(),
        status: response.status || 200,
        contentType: response.headers.get('content-type') || 'text/plain;charset=UTF-8'
      }));
    }catch(_){
      // Storage failures should never affect normal page loading.
    }
  }

  function cachedResponse(entry){
    return new Response(entry.body, {
      status: 200,
      headers: {
        'Content-Type': entry.contentType || 'text/plain;charset=UTF-8',
        'X-MYTT-Data-Source': 'stale-cache'
      }
    });
  }

  window.fetch = async function(input, init){
    if(!isCacheableRequest(input, init)){
      return nativeFetch(input, init);
    }

    const url = typeof input === 'string' ? input : input.url;
    const key = cacheKey(url);

    try{
      const response = await nativeFetch(input, init);
      if(response.ok){
        saveCache(key, response);
        return response;
      }
      const cached = readCache(key);
      return cached ? cachedResponse(cached) : response;
    }catch(error){
      const cached = readCache(key);
      if(cached) return cachedResponse(cached);
      throw error;
    }
  };
})();

/* =========================================================
   MYTT Singles Match Format — BO3 / BO5
   Added 2026-09-06.
   Keeps the existing app.js untouched and extends the current
   Singles result form after all deferred scripts have loaded.
   ========================================================= */
(function(){
  'use strict';

  function installStyles(){
    if(document.getElementById('mytt-bo3-bo5-style')) return;
    const style=document.createElement('style');
    style.id='mytt-bo3-bo5-style';
    style.textContent=`
      #singlesFormModal .mytt-format-choices{
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:10px;
      }
      #singlesFormModal .mytt-format-choice{
        min-height:46px;
        border:1px solid rgba(255,255,255,.12);
        border-radius:12px;
        background:rgba(255,255,255,.045);
        color:#f5f7fb;
        padding:10px 14px;
        font:inherit;
        font-weight:800;
        cursor:pointer;
        transition:border-color .15s ease,background .15s ease,box-shadow .15s ease,transform .15s ease;
      }
      #singlesFormModal .mytt-format-choice:hover{
        border-color:rgba(255,77,79,.58);
        background:rgba(255,77,79,.08);
      }
      #singlesFormModal .mytt-format-choice.active{
        border-color:#ff4d4f;
        background:rgba(255,77,79,.15);
        box-shadow:0 0 0 1px rgba(255,77,79,.16),0 0 18px rgba(255,77,79,.08);
      }
      #singlesFormModal .mytt-format-choice:active{transform:scale(.985)}
      #singlesFormModal .mytt-format-note{
        display:block;
        margin-top:7px;
        color:rgba(220,225,235,.62);
        font-size:11px;
        line-height:1.4;
      }
      @media(max-width:560px){
        #singlesFormModal .mytt-format-choice{min-height:48px;padding:11px 10px}
      }
    `;
    document.head.appendChild(style);
  }

  function installSinglesFormats(){
    const modal=document.getElementById('singlesFormModal');
    const form=document.getElementById('singlesResultForm');
    const scoreInput=document.getElementById('scoreValue');
    if(!modal||!form||!scoreInput) return;
    if(modal.dataset.bo3Bo5Ready==='true') return;

    const scoreField=scoreInput.closest('.result-field');
    const scoreChoices=scoreField?.querySelector('.score-choices');
    if(!scoreField||!scoreChoices) return;

    modal.dataset.bo3Bo5Ready='true';
    installStyles();

    const formatField=document.createElement('div');
    formatField.className='result-field mytt-match-format-field';
    formatField.innerHTML=`
      <span>Match Format</span>
      <input id="singlesMatchFormat" type="hidden" name="matchFormat" value="BO5">
      <div class="mytt-format-choices" role="group" aria-label="Match format">
        <button type="button" class="mytt-format-choice" data-match-format="BO3">Best of 3</button>
        <button type="button" class="mytt-format-choice active" data-match-format="BO5">Best of 5</button>
      </div>
      <small class="mytt-format-note">Best of 3: first to 2 games · Best of 5: first to 3 games</small>
    `;
    scoreField.parentNode.insertBefore(formatField,scoreField);

    const formatInput=formatField.querySelector('#singlesMatchFormat');

    function renderScores(format){
      const normalized=format==='BO3'?'BO3':'BO5';
      formatInput.value=normalized;
      scoreInput.value='';

      formatField.querySelectorAll('[data-match-format]').forEach(button=>{
        button.classList.toggle('active',button.dataset.matchFormat===normalized);
      });

      const scores=normalized==='BO3'
        ?[['2-0','2–0'],['2-1','2–1']]
        :[['3-0','3–0'],['3-1','3–1'],['3-2','3–2']];

      scoreChoices.innerHTML=scores
        .map(([value,label])=>`<button type="button" class="result-choice" data-score="${value}">${label}</button>`)
        .join('');

      const status=document.getElementById('singlesFormStatus');
      if(status) status.textContent='';
    }

    formatField.addEventListener('click',event=>{
      const button=event.target.closest('[data-match-format]');
      if(!button) return;
      event.preventDefault();
      renderScores(button.dataset.matchFormat);
    });

    form.addEventListener('reset',()=>{
      setTimeout(()=>renderScores('BO5'),0);
    });

    /*
     * app.js registers its submit listener before this extension runs.
     * It resolves validateSinglesResultForm at submit time, so replacing
     * the global function here safely upgrades validation without changing
     * the main app file.
     */
    if(typeof window.validateSinglesResultForm==='function'){
      window.validateSinglesResultForm=function(){
        const e=window.formEls();
        const a=e.aValue.value;
        const b=e.bValue.value;
        const w=e.winner.value;
        const s=e.score.value;
        const d=e.date.value;
        const format=document.getElementById('singlesMatchFormat')?.value||'BO5';
        let msg='';

        if(!activePlayersLoaded||activePlayersError||!activePlayers.length)msg='Result submission is currently closed.';
        else if(!d)msg='Please select a valid match date.';
        else if(!a)msg='Please select Player A from the current Active Players list.';
        else if(!b)msg='Please select Player B from the current Active Players list.';
        else if(!isActivePlayer(a)||!isActivePlayer(b))msg='Both players must be in the current Active Players session.';
        else if(samePlayer(a,b))msg='Player A and Player B cannot be the same player.';
        else if(!w||(!samePlayer(w,a)&&!samePlayer(w,b)))msg='Please select the winner.';
        else if(format==='BO3'&&!["2-0","2-1"].includes(s))msg='Please select a valid Best of 3 final score.';
        else if(format==='BO5'&&!["3-0","3-1","3-2"].includes(s))msg='Please select a valid Best of 5 final score.';

        e.status.classList.remove('success','error','rejected','closed');
        e.status.textContent=msg;
        return !msg;
      };
    }

    renderScores('BO5');
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',installSinglesFormats,{once:true});
  }else{
    setTimeout(installSinglesFormats,0);
  }
})();

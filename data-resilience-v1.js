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

const config=window.MYTT;let singlesPlayers=[],doublesTeams=[],playerDb=[],matchResults=[];
const TIERS=[{min:-Infinity,name:"Novice",icon:"🌿",cls:"tier-novice",next:1500},{min:1500,name:"Rookie",icon:"🌱",cls:"tier-rookie",next:1600},{min:1600,name:"Challenger",icon:"⚔️",cls:"tier-challenger",next:1700},{min:1700,name:"Elite",icon:"⭐",cls:"tier-elite",next:1800},{min:1800,name:"Master",icon:"🔥",cls:"tier-master",next:1900},{min:1900,name:"Legend",icon:"👑",cls:"tier-legend",next:2000},{min:2000,name:"Grandmaster",icon:"💎",cls:"tier-grandmaster",next:2100},{min:2100,name:"Immortal",icon:"⚡",cls:"tier-immortal",next:2200},{min:2200,name:"MYTT Champion",icon:"🏆",cls:"tier-champion",next:null}];
function getTier(r){const rating=Number(r)||0;let t=TIERS[0];for(const tier of TIERS){if(rating>=tier.min)t=tier}return t}
function tierHTML(r){const t=getTier(r);return `<span class="tier-pill ${t.cls}">${t.icon} ${t.name}</span>`}
function progressHTML(r){const rating=Number(r)||0;const t=getTier(r);if(!t.next)return `<div class="tier-progress"><div class="tier-progress-top"><span>${t.icon} ${t.name}</span><span>Top Tier</span></div><div class="progress-track"><div class="progress-fill" style="width:100%"></div></div><div class="progress-note">You have reached MYTT Champion tier.</div></div>`;const base=t.min===-Infinity?1400:t.min;const pct=Math.max(0,Math.min(100,((rating-base)/(t.next-base))*100));const next=TIERS.find(x=>x.min===t.next);return `<div class="tier-progress"><div class="tier-progress-top"><span>${t.icon} ${t.name}</span><span>${next.icon} ${next.name}</span></div><div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div><div class="progress-note">${rating} / ${t.next} · ${t.next-rating} pts to ${next.name}</div></div>`}
function parseCSV(t){const r=[];let row=[],cell="",q=false;for(let i=0;i<t.length;i++){const c=t[i],n=t[i+1];if(c=='"'&&q&&n=='"'){cell+='"';i++}else if(c=='"'){q=!q}else if(c==","&&!q){row.push(cell.trim());cell=""}else if((c=="\n"||c=="\r")&&!q){if(cell||row.length){row.push(cell.trim());r.push(row);row=[];cell=""}if(c=="\r"&&n=="\n")i++}else cell+=c}if(cell||row.length){row.push(cell.trim());r.push(row)}return r}
function cleanRows(rows){return rows.filter(row=>row.some(cell=>String(cell).trim()!="")).slice(1)}
async function fetchRows(csvUrl){const url=csvUrl+(csvUrl.includes("?")?"&":"?")+"t="+Date.now();const res=await fetch(url);if(!res.ok)throw new Error("Unable to load CSV");return cleanRows(parseCSV(await res.text()))}
function slug(s){return String(s||"").toLowerCase().replace(/[^a-z0-9]+/g,"").trim()}
function rowToLb(row,type){return{type,rank:row[0]||"-",name:row[1]||"-",rating:row[2]||"-",record:row[3]||"-",winRate:row[4]||"-",peak:row[5]||"-"}}
function rowToDb(row){return{id:row[0]||"",name:row[1]||"",grip:row[2]||"",hand:row[3]||"",blade:row[4]||"",fh:row[5]||"",bh:row[6]||"",photo:row[7]||"",status:row[8]||"",joined:row[9]||""}}

function rowToMatch(row){
  return {
    timestamp: row[0] || "",
    matchDate: row[1] || "",
    playerA: row[2] || "",
    playerB: row[3] || "",
    winner: row[4] || "",
    score: row[5] || "",
    playerABefore: row[6] || "",
    playerAAfter: row[7] || "",
    playerBBefore: row[8] || "",
    playerBAfter: row[9] || "",
    ratingChange: row[10] || ""
  };
}
function samePlayer(a,b){return slug(a)===slug(b)}
function displayDate(value){
  const text=String(value||"").trim();
  if(!text)return "-";
  const d=new Date(text);
  if(!isNaN(d.getTime())) return d.toLocaleDateString([], {day:"2-digit",month:"short",year:"numeric"});
  return text;
}
function playerMatches(name){
  return matchResults.filter(m=>samePlayer(m.playerA,name)||samePlayer(m.playerB,name));
}
function opponentOf(match,name){
  if(samePlayer(match.playerA,name))return match.playerB;
  if(samePlayer(match.playerB,name))return match.playerA;
  return "";
}
function isWin(match,name){return samePlayer(match.winner,name)}
function beforeAfter(match,name){
  if(samePlayer(match.playerA,name))return {before:match.playerABefore,after:match.playerAAfter};
  if(samePlayer(match.playerB,name))return {before:match.playerBBefore,after:match.playerBAfter};
  return {before:"",after:""};
}
function deltaOf(match,name){
  const ba=beforeAfter(match,name);
  const before=Number(ba.before), after=Number(ba.after);
  if(ba.before!=="" && ba.after!=="" && !isNaN(before) && !isNaN(after)) return after-before;
  const ch=Number(match.ratingChange);
  if(match.ratingChange!=="" && !isNaN(ch)) return isWin(match,name)?ch:-ch;
  return null;
}
function opponentAvatarHTML(opponent){
  const db=findDbByName(opponent);
  return avatarHTML(db,"match-avatar");
}
function recentMatchesHTML(name){
  const matches=playerMatches(name).slice().reverse().slice(0,10);
  if(!matches.length)return `<div class="profile-panel"><h3>🕒 Recent Matches</h3><p class="muted">No match history yet.</p></div>`;
  return `<div class="profile-panel"><h3>🕒 Recent Matches</h3><div class="match-list">${
    matches.map(m=>{
      const win=isWin(m,name);
      const opp=opponentOf(m,name);
      const ba=beforeAfter(m,name);
      const delta=deltaOf(m,name);
      const deltaText=delta===null?"—":(delta>0?"+"+delta:String(delta));
      const deltaCls=delta===null?"":(delta>=0?"match-delta-up":"match-delta-down");
      return `<div class="match-card ${win?"match-win":"match-loss"}">
        <div class="match-left">${opponentAvatarHTML(opp)}</div>
        <div class="match-body">
          <div class="match-result">${win?"🟢 Win":"🔴 Loss"}</div>
          <div class="match-main">vs <span data-player="${encodeURIComponent(opp)}" class="match-opponent">${opp}</span></div>
          <div class="match-score">🏓 ${m.score||"-"}</div>
          <div class="match-rating"><span class="${deltaCls}">${deltaText} Rating</span>${ba.before&&ba.after?` · ${ba.before} → ${ba.after}`:""}</div>
          <div class="match-date">${displayDate(m.matchDate||m.timestamp)}</div>
        </div>
      </div>`;
    }).join("")
  }</div></div>`;
}
function ratingHistoryHTML(name){
  const list=playerMatches(name);
  let points=[];
  list.forEach(m=>{
    const ba=beforeAfter(m,name);
    if(ba.before && points.length===0) points.push(Number(ba.before));
    if(ba.after) points.push(Number(ba.after));
  });
  points=points.filter(x=>!isNaN(x));
  if(points.length<2)return `<div class="profile-panel"><h3>📈 Rating History</h3><p class="muted">Play more matches to build a rating chart.</p></div>`;
  const min=Math.min(...points), max=Math.max(...points), range=Math.max(1,max-min);
  const w=520,h=150,pad=18;
  const coords=points.map((v,i)=>{
    const x=pad+(i/(points.length-1))*(w-pad*2);
    const y=h-pad-((v-min)/range)*(h-pad*2);
    return `${x},${y}`;
  }).join(" ");
  return `<div class="profile-panel"><h3>📈 Rating History</h3><div class="rating-chart"><svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polyline points="${coords}" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div class="chart-note">${points[0]} → ${points[points.length-1]} · Peak ${max}</div></div>`;
}
function headToHeadHTML(name){
  const map={};
  playerMatches(name).forEach(m=>{
    const opp=opponentOf(m,name);
    if(!opp)return;
    const key=slug(opp);
    if(!map[key])map[key]={opp,w:0,l:0,total:0};
    if(isWin(m,name))map[key].w++;else map[key].l++;
    map[key].total++;
  });
  const rows=Object.values(map).sort((a,b)=>b.total-a.total).slice(0,6);
  if(!rows.length)return `<div class="profile-panel"><h3>🤝 Head to Head</h3><p class="muted">No head-to-head data yet.</p></div>`;
  return `<div class="profile-panel"><h3>🤝 Head to Head</h3><div class="h2h-list">${rows.map(r=>`<div class="h2h-row"><span data-player="${encodeURIComponent(r.opp)}">${r.opp}</span><strong>${r.w}-${r.l}</strong><small>${r.total} matches</small></div>`).join("")}</div></div>`;
}

function rankLabel(rank){const v=String(rank||"").trim();if(v=="1")return"🥇 1";if(v=="2")return"🥈 2";if(v=="3")return"🥉 3";return v||"-"}
function avatarUrl(db){if(!db?.id)return"";return `avatars/${db.id}.jpg`}
function avatarHTML(db,cls="avatar"){const src=avatarUrl(db);return `<div class="${cls}">${src?`<img src="${src}" alt="${db?.name||"Player"}" onerror="this.parentElement.textContent='👤'">`:"👤"}</div>`}
function findDbByName(name){const s=slug(name);return playerDb.find(p=>slug(p.name)===s)||playerDb.find(p=>slug(p.name).includes(s)||s.includes(slug(p.name)))}
function findLbByName(name){const s=slug(name);return singlesPlayers.find(p=>slug(p.name)===s)||singlesPlayers.find(p=>slug(p.name).includes(s)||s.includes(slug(p.name)))||{rating:"1500",peak:"1500",rank:"-",record:"0-0",winRate:"-"}}

function splitTeamName(teamName){
  const text = String(teamName || "");
  const parts = text
    .split(/\s*(?:\/|&|\+|,| and )\s*/i)
    .map(p => p.trim())
    .filter(Boolean);
  return parts.length ? parts : [text];
}

function teamCellHTML(teamName){
  const members = splitTeamName(teamName);
  if (members.length < 2) {
    const db = findDbByName(teamName);
    return `<div class="player-cell">${avatarHTML(db,"row-avatar")}<span>${teamName} ↗</span></div>`;
  }

  return `<div class="team-cell">
    ${members.map(member => {
      const db = findDbByName(member);
      return `<div class="team-member" data-player="${encodeURIComponent(member)}">
        ${avatarHTML(db,"row-avatar")}
        <span>${member}</span>
      </div>`;
    }).join('<span class="team-plus">+</span>')}
  </div>`;
}

function makeRow(item){const db=findDbByName(item.name);const tr=document.createElement("tr");tr.className="rank-"+String(item.rank||"").trim();const nameHtml=item.type==="doubles"?teamCellHTML(item.name):`<div class="player-cell">${avatarHTML(db,"row-avatar")}<span>${item.name} ↗</span></div>`;tr.innerHTML=`<td><span class="rank-badge">${rankLabel(item.rank)}</span></td><td class="name" ${item.type==="doubles"?"":`data-player="${encodeURIComponent(item.name)}"`}>${nameHtml}</td><td>${tierHTML(item.rating)}</td><td class="rating">${item.rating}</td><td>${item.record}</td><td>${item.winRate}</td><td>${item.peak}</td>`;return tr}
async function loadLeaderboard(csvUrl,bodyId,statusId,type,label){const body=document.getElementById(bodyId),status=document.getElementById(statusId);try{const rows=await fetchRows(csvUrl);const items=rows.map(row=>rowToLb(row,type));if(type==="singles")singlesPlayers=items;if(type==="doubles")doublesTeams=items;body.innerHTML="";if(!items.length){body.innerHTML=`<tr><td colspan="7" class="loading">No data yet.</td></tr>`;status.textContent="No data";return}items.forEach(item=>body.appendChild(makeRow(item)));status.textContent="Updated "+new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});renderSearch();renderPlayers()}catch(e){console.error(e);body.innerHTML=`<tr><td colspan="7" class="loading">Failed to load ${label} leaderboard.</td></tr>`;status.textContent="Load failed"}}
async function loadPlayerDb(){try{const rows=await fetchRows(config.playerDbCsv);const all=rows.map(rowToDb).filter(p=>p.name);playerDb=all.filter(p=>String(p.status).toLowerCase()==="approved");if(!playerDb.length)playerDb=all;renderPlayers()}catch(e){console.error(e);renderPlayers()}}
function playerItem(name){const db=findDbByName(name);const lb=findLbByName(db?.name||name);return{db,lb,name:db?.name||name}}
function openProfile(name){const {db,lb,name:playerName}=playerItem(decodeURIComponent(name));document.getElementById("profileContent").innerHTML=`<div class="profile-top">${avatarHTML(db,"profile-avatar")}<div><h3>${playerName}</h3><p>${db?.id||"MYTT Player"} · Rank #${lb.rank}</p>${tierHTML(lb.rating)}</div></div><div class="profile-stats"><div class="stat"><small>Current Rating</small><strong>${lb.rating}</strong></div><div class="stat"><small>Peak Rating</small><strong>${lb.peak}</strong></div><div class="stat"><small>Record</small><strong>${lb.record}</strong></div><div class="stat"><small>Win Rate</small><strong>${lb.winRate}</strong></div></div>${progressHTML(lb.rating)}<div class="profile-panel"><h3>🏓 Player Info</h3><div class="equipment-row"><small>Grip</small><strong>${db?.grip||"-"}</strong></div><div class="equipment-row"><small>Hand</small><strong>${db?.hand||"-"}</strong></div><div class="equipment-row"><small>Blade</small><strong>${db?.blade||"-"}</strong></div><div class="equipment-row"><small>FH Rubber</small><strong>${db?.fh||"-"}</strong></div><div class="equipment-row"><small>BH Rubber</small><strong>${db?.bh||"-"}</strong></div><div class="equipment-row"><small>Member Since</small><strong>${db?.joined||"-"}</strong></div></div>${recentMatchesHTML(playerName)}${ratingHistoryHTML(playerName)}${headToHeadHTML(playerName)}`;document.getElementById("profileModal").classList.remove("hidden")}
function closeProfile(){document.getElementById("profileModal").classList.add("hidden")}
function getPlayerList(){const map=new Map();singlesPlayers.forEach(p=>map.set(slug(p.name),{source:"leaderboard",db:findDbByName(p.name),lb:p,name:p.name}));playerDb.forEach(db=>{const k=slug(db.name);if(!map.has(k))map.set(k,{source:"approved",db,lb:findLbByName(db.name),name:db.name});else map.get(k).db=db});return [...map.values()].sort((a,b)=>(Number(b.lb.rating)||0)-(Number(a.lb.rating)||0))}
function renderPlayers(){const grid=document.getElementById("playersGrid");if(!grid)return;const q=(document.getElementById("playersSearch")?.value||"").toLowerCase();const filter=document.getElementById("playersFilter")?.value||"all";let list=getPlayerList();if(filter==="approved")list=list.filter(x=>x.db);if(filter==="leaderboard")list=list.filter(x=>x.source==="leaderboard");if(q)list=list.filter(x=>x.name.toLowerCase().includes(q));if(!list.length){grid.innerHTML=`<p class="loading">No players found.</p>`;return}grid.innerHTML=list.map(x=>`<div class="player-card" data-player="${encodeURIComponent(x.name)}"><div class="player-card-top">${avatarHTML(x.db,"avatar")}<div><h3>${x.name}</h3><p>${x.db?.id||"Leaderboard Player"}</p>${tierHTML(x.lb.rating)}</div></div><div class="mini-stats"><div class="mini-stat"><small>Rating</small><strong>${x.lb.rating}</strong></div><div class="mini-stat"><small>Peak</small><strong>${x.lb.peak}</strong></div><div class="mini-stat"><small>Rank</small><strong>#${x.lb.rank}</strong></div></div><p>🏓 ${x.db?.grip||"-"} · ${x.db?.hand||"-"}</p></div>`).join("")}
function renderSearch(){const input=document.getElementById("globalSearch"),results=document.getElementById("searchResults");if(!input||!results)return;const q=input.value.trim().toLowerCase();if(!q){results.innerHTML=`<p class="muted">Type a player name to view rating, tier and profile.</p>`;return}const items=getPlayerList().filter(i=>i.name.toLowerCase().includes(q)).slice(0,8);if(!items.length){results.innerHTML=`<p class="muted">No player found.</p>`;return}results.innerHTML=items.map(i=>`<div class="search-result" data-player="${encodeURIComponent(i.name)}"><div class="search-rank">${rankLabel(i.lb.rank)}</div><div><div class="search-name">${i.name}</div><div class="search-meta">${tierHTML(i.lb.rating)} · W-L ${i.lb.record} · Peak ${i.lb.peak}</div></div><div class="search-rating">${i.lb.rating}</div></div>`).join("")}
function bindEvents(){document.addEventListener("input",e=>{if(e.target.id==="globalSearch")renderSearch();if(e.target.id==="playersSearch")renderPlayers()});document.addEventListener("change",e=>{if(e.target.id==="playersFilter")renderPlayers()});document.addEventListener("click",e=>{const p=e.target.closest("[data-player]");if(p){e.stopPropagation();openProfile(p.dataset.player);}if(e.target.matches("[data-close-modal]"))closeProfile()});document.addEventListener("keydown",e=>{if(e.key==="Escape")closeProfile()})}

async function loadMatchResults(){
  if(!config.matchResultsCsv)return;
  try{
    const rows=await fetchRows(config.matchResultsCsv);
    matchResults=rows.map(rowToMatch).filter(m=>m.playerA&&m.playerB);
  }catch(e){
    console.error("Failed to load match results",e);
    matchResults=[];
  }
}

async function loadAll(){await loadPlayerDb();await loadMatchResults();await loadLeaderboard(config.singlesCsv,"singlesBody","singlesStatus","singles","singles");await loadLeaderboard(config.doublesCsv,"doublesBody","doublesStatus","doubles","doubles");renderPlayers();renderSearch()}
bindEvents();loadAll();setInterval(loadAll,60000);
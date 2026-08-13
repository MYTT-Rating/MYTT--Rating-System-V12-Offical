const config=window.MYTT;let singlesPlayers=[],doublesTeams=[],playerDb=[],matchResults=[],activePlayers=[],activeDoublesTeams=[];let activePlayersLoaded=false,activePlayersError=false,activeDoublesTeamsLoaded=false,activeDoublesTeamsError=false;
const TIERS=[{min:-Infinity,name:"Novice",icon:"🌿",cls:"tier-novice",next:1500},{min:1500,name:"Rookie",icon:"🌱",cls:"tier-rookie",next:1600},{min:1600,name:"Challenger",icon:"⚔️",cls:"tier-challenger",next:1700},{min:1700,name:"Elite",icon:"⭐",cls:"tier-elite",next:1800},{min:1800,name:"Master",icon:"🔥",cls:"tier-master",next:1900},{min:1900,name:"Legend",icon:"👑",cls:"tier-legend",next:2000},{min:2000,name:"Grandmaster",icon:"💎",cls:"tier-grandmaster",next:2100},{min:2100,name:"Immortal",icon:"⚡",cls:"tier-immortal",next:2200},{min:2200,name:"MYTT Champion",icon:"🏆",cls:"tier-champion",next:null}];
function getTier(r){const rating=Number(r)||0;let t=TIERS[0];for(const tier of TIERS){if(rating>=tier.min)t=tier}return t}
function tierHTML(r){const t=getTier(r);return `<span class="tier-pill ${t.cls}">${t.icon} ${t.name}</span>`}
function progressHTML(r){const rating=Number(r)||0;const t=getTier(r);if(!t.next)return `<div class="tier-progress"><div class="tier-progress-top"><span>${t.icon} ${t.name}</span><span>Top Tier</span></div><div class="progress-track"><div class="progress-fill" style="width:100%"></div></div><div class="progress-note">You have reached MYTT Champion tier.</div></div>`;const base=t.min===-Infinity?1400:t.min;const pct=Math.max(0,Math.min(100,((rating-base)/(t.next-base))*100));const next=TIERS.find(x=>x.min===t.next);return `<div class="tier-progress"><div class="tier-progress-top"><span>${t.icon} ${t.name}</span><span>${next.icon} ${next.name}</span></div><div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div><div class="progress-note">${rating} / ${t.next} · ${t.next-rating} pts to ${next.name}</div></div>`}

function rankJourneyHTML(r){
  const rating=Number(r)||0;
  const currentTier=getTier(rating);

  if(!currentTier.next){
    return `<div class="profile-rank-compact">
      <div class="profile-rank-compact-head">
        <div>
          <small>MYTT RANK JOURNEY</small>
          <h3>${currentTier.icon} ${currentTier.name}</h3>
        </div>
        <strong>${rating}</strong>
      </div>

      ${progressHTML(rating)}

      <details class="profile-rank-details">
        <summary>View Full Rank Journey</summary>
        <div class="profile-rank-details-road">
          ${TIERS.filter(t=>t.min>=1500).map(t=>`
            <div class="profile-rank-detail-node ${rating>=t.min?"reached":""} ${currentTier.name===t.name?"current":""}">
              <span>${t.icon}</span>
              <strong>${t.name}</strong>
              <small>${t.min}</small>
            </div>
          `).join("")}
        </div>
      </details>
    </div>`;
  }

  const nextTier=TIERS.find(t=>t.min===currentTier.next);

  return `<div class="profile-rank-compact">
    <div class="profile-rank-compact-head">
      <div>
        <small>MYTT RANK JOURNEY</small>
        <h3>Progress to ${nextTier?.name||"Next Tier"}</h3>
      </div>
    </div>

    ${progressHTML(rating)}

    <details class="profile-rank-details">
      <summary>View Full Rank Journey</summary>
      <div class="profile-rank-details-road">
        ${TIERS.filter(t=>t.min>=1500).map(t=>`
          <div class="profile-rank-detail-node ${rating>=t.min?"reached":""} ${currentTier.name===t.name?"current":""}">
            <span>${t.icon}</span>
            <strong>${t.name}</strong>
            <small>${t.min}</small>
          </div>
        `).join("")}
      </div>
    </details>
  </div>`;
}function parseCSV(t){const r=[];let row=[],cell="",q=false;for(let i=0;i<t.length;i++){const c=t[i],n=t[i+1];if(c=='"'&&q&&n=='"'){cell+='"';i++}else if(c=='"'){q=!q}else if(c==","&&!q){row.push(cell.trim());cell=""}else if((c=="\n"||c=="\r")&&!q){if(cell||row.length){row.push(cell.trim());r.push(row);row=[];cell=""}if(c=="\r"&&n=="\n")i++}else cell+=c}if(cell||row.length){row.push(cell.trim());r.push(row)}return r}
function cleanRows(rows){return rows.filter(row=>row.some(cell=>String(cell).trim()!="")).slice(1)}
async function fetchRows(csvUrl){const url=csvUrl+(csvUrl.includes("?")?"&":"?")+"t="+Date.now();const res=await fetch(url);if(!res.ok)throw new Error("Unable to load CSV");return cleanRows(parseCSV(await res.text()))}
function slug(s){return String(s||"").toLowerCase().replace(/[^a-z0-9]+/g,"").trim()}
function rowToLb(row,type){return{type,rank:row[0]||"-",name:row[1]||"-",rating:row[2]||"-",record:row[3]||"-",winRate:row[4]||"-",peak:row[5]||"-"}}
function rowToDb(row){return{id:row[0]||"",name:row[1]||"",grip:row[2]||"",hand:row[3]||"",blade:row[4]||"",fh:row[5]||"",bh:row[6]||"",photo:row[7]||"",status:row[8]||"",joined:row[9]||""}}

function rowToMatch(row){return{timestamp:row[0]||"",matchDate:row[1]||"",playerA:row[2]||"",playerB:row[3]||"",winner:row[4]||"",score:row[5]||"",playerABefore:row[6]||"",playerAAfter:row[7]||"",playerBBefore:row[8]||"",playerBAfter:row[9]||"",ratingChange:row[10]||""}}
function samePlayer(a,b){return slug(a)===slug(b)}
function displayDate(value){const text=String(value||"").trim();if(!text)return"-";const d=new Date(text);if(!isNaN(d.getTime()))return d.toLocaleDateString([],{day:"2-digit",month:"short",year:"numeric"});return text}
function playerMatches(name){return matchResults.filter(m=>samePlayer(m.playerA,name)||samePlayer(m.playerB,name))}
function opponentOf(match,name){if(samePlayer(match.playerA,name))return match.playerB;if(samePlayer(match.playerB,name))return match.playerA;return""}
function isWin(match,name){return samePlayer(match.winner,name)}
function beforeAfter(match,name){if(samePlayer(match.playerA,name))return{before:match.playerABefore,after:match.playerAAfter};if(samePlayer(match.playerB,name))return{before:match.playerBBefore,after:match.playerBAfter};return{before:"",after:""}}
function deltaOf(match,name){const ba=beforeAfter(match,name);const before=Number(ba.before),after=Number(ba.after);if(ba.before!==""&&ba.after!==""&&!isNaN(before)&&!isNaN(after))return after-before;const ch=Number(match.ratingChange);if(match.ratingChange!==""&&!isNaN(ch))return isWin(match,name)?ch:-ch;return null}
function opponentAvatarHTML(opponent){const db=findDbByName(opponent);const src=avatarUrl(db);return `<div class="match-avatar">${src?`<img src="${src}" alt="${opponent}" onerror="this.parentElement.textContent='👤'">`:"👤"}</div>`}
function recentMatchesHTML(name){const matches=playerMatches(name).slice().reverse().slice(0,10);if(!matches.length)return`<div class="profile-panel"><h3>🕒 Recent Matches</h3><p class="muted">No match history yet.</p></div>`;return`<div class="profile-panel"><h3>🕒 Recent Matches</h3><div class="match-list">${matches.map(m=>{const win=isWin(m,name),opp=opponentOf(m,name),ba=beforeAfter(m,name),delta=deltaOf(m,name),deltaText=delta===null?"—":(delta>0?"+"+delta:String(delta)),deltaCls=delta===null?"":(delta>=0?"match-delta-up":"match-delta-down");return`<div class="match-card ${win?"match-win":"match-loss"}"><div class="match-left">${opponentAvatarHTML(opp)}</div><div class="match-body"><div class="match-result">${win?"🟢 Win":"🔴 Loss"}</div><div class="match-main">vs <span data-player="${encodeURIComponent(opp)}" class="match-opponent">${opp}</span></div><div class="match-score">🏓 ${m.score||"-"}</div><div class="match-rating"><span class="${deltaCls}">${deltaText} Rating</span>${ba.before&&ba.after?` · ${ba.before} → ${ba.after}`:""}</div><div class="match-date">${displayDate(m.matchDate||m.timestamp)}</div></div></div>`}).join("")}</div></div>`}
function ratingHistoryHTML(name){const list=playerMatches(name);let points=[];list.forEach(m=>{const ba=beforeAfter(m,name);if(ba.before&&points.length===0)points.push(Number(ba.before));if(ba.after)points.push(Number(ba.after))});points=points.filter(x=>!isNaN(x));if(points.length<2)return`<div class="profile-panel"><h3>📈 Rating History</h3><p class="muted">Play more matches to build a rating chart.</p></div>`;const min=Math.min(...points),max=Math.max(...points),range=Math.max(1,max-min),w=520,h=150,pad=18;const coords=points.map((v,i)=>`${pad+(i/(points.length-1))*(w-pad*2)},${h-pad-((v-min)/range)*(h-pad*2)}`).join(" ");return`<div class="profile-panel"><h3>📈 Rating History</h3><div class="rating-chart"><svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polyline points="${coords}" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div class="chart-note">${points[0]} → ${points[points.length-1]} · Peak ${max}</div></div>`}
function headToHeadHTML(name){const map={};playerMatches(name).forEach(m=>{const opp=opponentOf(m,name);if(!opp)return;const key=slug(opp);if(!map[key])map[key]={opp,w:0,l:0,total:0};if(isWin(m,name))map[key].w++;else map[key].l++;map[key].total++});const rows=Object.values(map).sort((a,b)=>b.total-a.total).slice(0,6);if(!rows.length)return`<div class="profile-panel"><h3>🤝 Head to Head</h3><p class="muted">No head-to-head data yet.</p></div>`;return`<div class="profile-panel"><h3>🤝 Head to Head</h3><div class="h2h-list">${rows.map(r=>`<div class="h2h-row"><span data-player="${encodeURIComponent(r.opp)}">${r.opp}</span><strong>${r.w}-${r.l}</strong><small>${r.total} matches</small></div>`).join("")}</div></div>`}

function rankLabel(rank){const v=String(rank||"").trim();if(v=="1")return"🥇 1";if(v=="2")return"🥈 2";if(v=="3")return"🥉 3";return v||"-"}
function avatarUrl(db){if(!db?.id)return"";return `avatars/${db.id}.jpg`}
function avatarHTML(db,cls="avatar"){const src=avatarUrl(db);return `<div class="${cls}">${src?`<img src="${src}" alt="${db?.name||"Player"}" onerror="this.parentElement.textContent='👤'">`:"👤"}</div>`}
function findDbByName(name){const s=slug(name);return playerDb.find(p=>slug(p.name)===s)||playerDb.find(p=>slug(p.name).includes(s)||s.includes(slug(p.name)))}
function findLbByName(name){const s=slug(name);return singlesPlayers.find(p=>slug(p.name)===s)||singlesPlayers.find(p=>slug(p.name).includes(s)||s.includes(slug(p.name)))||{rating:"1500",peak:"1500",rank:"-",record:"0-0",winRate:"-"}}


function parseRecord(record){
  const m=String(record||"0-0").match(/(\d+)\s*-\s*(\d+)/);
  return {wins:m?Number(m[1]):0, losses:m?Number(m[2]):0};
}
function currentStreak(name){
  const list=playerMatches(name).slice().reverse();
  if(!list.length)return "-";
  const firstWin=isWin(list[0],name);
  let count=0;
  for(const m of list){ if(isWin(m,name)===firstWin)count++; else break; }
  return (firstWin?"🔥 W":"L")+count;
}
function achievementHTML(lb,name){
  const rec=parseRecord(lb.record);
  const rank=Number(lb.rank);
  const matches=rec.wins+rec.losses;
  const wins=rec.wins;
  const list=[];
  if(wins>0)list.push(["🥇","First Win"]);
  if(wins>=5)list.push(["🔥","5 Wins"]);
  if(matches>=10)list.push(["💯","10 Matches"]);
  if(rank>0&&rank<=3)list.push(["🏆","Top 3"]);
  if(rank===1)list.push(["👑","Rank #1"]);
  const upset=playerMatches(name).some(m=>{
    const ba=beforeAfter(m,name), before=Number(ba.before);
    const opp=opponentOf(m,name);
    const oba=beforeAfter(m,opp), ob=Number(oba.before);
    return isWin(m,name)&&!isNaN(before)&&!isNaN(ob)&&(ob-before)>=80;
  });
  if(upset)list.push(["⚡","Giant Killer"]);
  if(!list.length)list.push(["🌱","New Player"]);
  return `<div class="profile-panel achievements-panel"><h3>🏅 Achievements</h3><div class="achievement-grid">${list.map(a=>`<div class="achievement"><span>${a[0]}</span><strong>${a[1]}</strong></div>`).join("")}</div></div>`;
}
function careerSummaryHTML(lb,name){
  const rec=parseRecord(lb.record);
  const matches=rec.wins+rec.losses;

  return `<div class="profile-panel career-panel">
    <h3>📜 Career Summary</h3>
    <div class="career-grid career-grid-compact">
      <div><small>Matches</small><strong>${matches}</strong></div>
      <div><small>Wins</small><strong>${rec.wins}</strong></div>
      <div><small>Losses</small><strong>${rec.losses}</strong></div>
      <div><small>Current Streak</small><strong>${currentStreak(name)}</strong></div>
    </div>
  </div>`;
}
function profileStatCard(label,value,icon){return `<div class="stat pro-stat"><span>${icon}</span><small>${label}</small><strong>${value}</strong></div>`}

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
const LEADERBOARD_INITIAL_COUNT=10;
const LEADERBOARD_STEP=10;

const leaderboardVisibleCount={
  singles:LEADERBOARD_INITIAL_COUNT,
  doubles:LEADERBOARD_INITIAL_COUNT
};

function getLeaderboardItems(type){
  return type==="doubles" ? doublesTeams : singlesPlayers;
}

function leaderboardBodyId(type){
  return type==="doubles" ? "doublesBody" : "singlesBody";
}

function leaderboardControlsId(type){
  return type==="doubles"
    ? "doublesLeaderboardControls"
    : "singlesLeaderboardControls";
}

function renderLeaderboardControls(type){
  const controls=document.getElementById(leaderboardControlsId(type));
  if(!controls)return;

  const items=getLeaderboardItems(type);
  const total=items.length;
  const noun=type==="doubles" ? "teams" : "players";

  if(!total){
    controls.innerHTML="";
    return;
  }

  const visible=Math.min(
    leaderboardVisibleCount[type]||LEADERBOARD_INITIAL_COUNT,
    total
  );

  if(total<=LEADERBOARD_INITIAL_COUNT){
    controls.innerHTML=`
      <div class="leaderboard-showing">
        Showing all ${total} ${noun}
      </div>
    `;
    return;
  }

  const allShown=visible>=total;

  controls.innerHTML=`
    <button
      type="button"
      class="leaderboard-expand-btn"
      data-leaderboard-toggle="${type}"
      data-leaderboard-action="${allShown?"less":"more"}"
    >
      <span class="leaderboard-expand-icon">${allShown?"↑":"↓"}</span>
      ${allShown?"Show Less":`Show More ${type==="doubles"?"Teams":"Players"}`}
    </button>

    <div class="leaderboard-showing">
      Showing ${visible} of ${total} ${noun}
    </div>
  `;
}

function renderLeaderboardRows(type){
  const body=document.getElementById(leaderboardBodyId(type));
  if(!body)return;

  const items=getLeaderboardItems(type);
  body.innerHTML="";

  if(!items.length){
    body.innerHTML=`<tr><td colspan="7" class="loading">No data yet.</td></tr>`;
    renderLeaderboardControls(type);
    return;
  }

  const visible=Math.min(
    leaderboardVisibleCount[type]||LEADERBOARD_INITIAL_COUNT,
    items.length
  );

  items.slice(0,visible).forEach(item=>{
    body.appendChild(makeRow(item));
  });

  renderLeaderboardControls(type);
}

function changeLeaderboardVisible(type,action){
  const items=getLeaderboardItems(type);
  if(!items.length)return;

  if(action==="less"){
    leaderboardVisibleCount[type]=LEADERBOARD_INITIAL_COUNT;
  }else{
    leaderboardVisibleCount[type]=Math.min(
      (leaderboardVisibleCount[type]||LEADERBOARD_INITIAL_COUNT)+LEADERBOARD_STEP,
      items.length
    );
  }

  renderLeaderboardRows(type);

  if(action==="less"){
    document.getElementById(type)?.scrollIntoView({
      behavior:"smooth",
      block:"start"
    });
  }
}

async function loadLeaderboard(csvUrl,bodyId,statusId,type,label){
  const body=document.getElementById(bodyId);
  const status=document.getElementById(statusId);

  try{
    const rows=await fetchRows(csvUrl);
    const items=rows.map(row=>rowToLb(row,type));

    if(type==="singles")singlesPlayers=items;
    if(type==="doubles")doublesTeams=items;

    if(!items.length){
      body.innerHTML=`<tr><td colspan="7" class="loading">No data yet.</td></tr>`;
      status.textContent="No data";
      renderLeaderboardControls(type);
      return;
    }

    renderLeaderboardRows(type);

    status.textContent=
      "Updated "+
      new Date().toLocaleTimeString([],{
        hour:"2-digit",
        minute:"2-digit"
      });

    renderSearch();
    renderPlayers();

  }catch(e){
    console.error(e);
    body.innerHTML=`<tr><td colspan="7" class="loading">Failed to load ${label} leaderboard.</td></tr>`;
    status.textContent="Load failed";

    const controls=document.getElementById(leaderboardControlsId(type));
    if(controls)controls.innerHTML="";
  }
}
async function loadPlayerDb(){try{const rows=await fetchRows(config.playerDbCsv);const all=rows.map(rowToDb).filter(p=>p.name);playerDb=all.filter(p=>String(p.status).toLowerCase()==="approved");if(!playerDb.length)playerDb=all;renderPlayers()}catch(e){console.error(e);renderPlayers()}}
function playerItem(name){const db=findDbByName(name);const lb=findLbByName(db?.name||name);return{db,lb,name:db?.name||name}}
function openProfile(name){
  const {db,lb,name:playerName}=playerItem(decodeURIComponent(name));
  const rec=parseRecord(lb.record);
  const matches=rec.wins+rec.losses;
  document.getElementById("profileContent").innerHTML=`
    <section class="profile-hero-pro">
      <div class="profile-hero-bg"></div>
      <div class="profile-hero-main">
        ${avatarHTML(db,"profile-avatar profile-avatar-pro")}
        <div class="profile-identity">
          <p class="profile-kicker">MYTT Player Profile</p>
          <h3>${playerName}</h3>
          <div class="profile-badges">
            <span class="id-pill">${db?.id||"MYTT Player"}</span>
            ${tierHTML(lb.rating)}
            <span class="rank-pill">Rank #${lb.rank||"-"}</span>
          </div>
        </div>
      </div>
    </section>
    <div class="profile-stats profile-stats-pro profile-stats-core">
      ${profileStatCard("Current Rating",lb.rating,"📊")}
      ${profileStatCard("Peak Rating",lb.peak,"🚀")}
      ${profileStatCard("Win Rate",lb.winRate,"🎯")}
    </div>
    ${rankJourneyHTML(lb.rating)}
    ${careerSummaryHTML(lb,playerName)}
    <div class="profile-panel"><h3>🏓 Player Info</h3><div class="equipment-row"><small>Grip</small><strong>${db?.grip||"-"}</strong></div><div class="equipment-row"><small>Hand</small><strong>${db?.hand||"-"}</strong></div><div class="equipment-row"><small>Blade</small><strong>${db?.blade||"-"}</strong></div><div class="equipment-row"><small>FH Rubber</small><strong>${db?.fh||"-"}</strong></div><div class="equipment-row"><small>BH Rubber</small><strong>${db?.bh||"-"}</strong></div><div class="equipment-row"><small>Member Since</small><strong>${db?.joined||"-"}</strong></div></div>
    ${recentMatchesHTML(playerName)}
    ${ratingHistoryHTML(playerName)}
    ${headToHeadHTML(playerName)}
    ${achievementHTML(lb,playerName)}
  `;
  document.getElementById("profileModal").classList.remove("hidden");
}
function closeProfile(){
  const modal = document.getElementById("profileModal");
  if(modal) modal.classList.add("hidden");
  document.body.classList.remove("modal-open","profile-open","no-scroll");
}
const PLAYERS_PER_PAGE=12;
let playersCurrentPage=1;

function getPlayerList(){
  const map=new Map();

  singlesPlayers.forEach(p=>{
    map.set(slug(p.name),{
      source:"leaderboard",
      db:findDbByName(p.name),
      lb:p,
      name:p.name
    });
  });

  playerDb.forEach(db=>{
    const k=slug(db.name);
    if(!map.has(k)){
      map.set(k,{
        source:"approved",
        db,
        lb:findLbByName(db.name),
        name:db.name
      });
    }else{
      map.get(k).db=db;
    }
  });

  return [...map.values()];
}

function sortPlayers(list,sort){
  const items=[...list];

  const byName=(a,b)=>String(a.name||"").localeCompare(
    String(b.name||""),
    undefined,
    {sensitivity:"base",numeric:true}
  );

  if(sort==="name-desc"){
    return items.sort((a,b)=>-byName(a,b));
  }

  if(sort==="rating-desc"){
    return items.sort((a,b)=>
      (Number(b.lb?.rating)||0)-(Number(a.lb?.rating)||0) || byName(a,b)
    );
  }

  if(sort==="rating-asc"){
    return items.sort((a,b)=>
      (Number(a.lb?.rating)||0)-(Number(b.lb?.rating)||0) || byName(a,b)
    );
  }

  if(sort==="rank-asc"){
    return items.sort((a,b)=>{
      const ar=Number(a.lb?.rank)||Number.MAX_SAFE_INTEGER;
      const br=Number(b.lb?.rank)||Number.MAX_SAFE_INTEGER;
      return ar-br || byName(a,b);
    });
  }

  return items.sort(byName);
}

function playerPageButton(label,page,active=false,disabled=false,extraClass=""){
  return `<button type="button"
    class="players-page-btn ${active?"active":""} ${extraClass}"
    data-player-page="${page}"
    ${disabled?"disabled":""}>${label}</button>`;
}

function renderPlayersPagination(totalItems,totalPages,startIndex,endIndex){
  const pagination=document.getElementById("playersPagination");
  if(!pagination)return;

  if(!totalItems){
    pagination.innerHTML="";
    return;
  }

  const buttons=[];

  if(totalPages>1){
    buttons.push(
      playerPageButton("‹ Prev",playersCurrentPage-1,false,playersCurrentPage===1,"wide")
    );

    const pages=new Set([1,totalPages,playersCurrentPage]);

    for(
      let p=Math.max(1,playersCurrentPage-1);
      p<=Math.min(totalPages,playersCurrentPage+1);
      p++
    ){
      pages.add(p);
    }

    const sorted=[...pages].sort((a,b)=>a-b);
    let previous=0;

    sorted.forEach(page=>{
      if(previous && page-previous>1){
        buttons.push(`<span class="players-page-ellipsis">…</span>`);
      }
      buttons.push(
        playerPageButton(String(page),page,page===playersCurrentPage)
      );
      previous=page;
    });

    buttons.push(
      playerPageButton("Next ›",playersCurrentPage+1,false,playersCurrentPage===totalPages,"wide")
    );
  }

  pagination.innerHTML=`
    <div class="players-page-summary">
      Showing ${startIndex+1}–${endIndex} of ${totalItems} players
    </div>

    <div class="players-page-controls">
      ${buttons.join("")}
    </div>

    <div class="players-page-size">
      ${PLAYERS_PER_PAGE} per page
    </div>
  `;
}

function renderPlayers(){
  const grid=document.getElementById("playersGrid");
  if(!grid)return;

  const q=(document.getElementById("playersSearch")?.value||"")
    .trim()
    .toLowerCase();

  const filter=document.getElementById("playersFilter")?.value||"all";
  const sort=document.getElementById("playersSort")?.value||"name-asc";

  let list=getPlayerList();

  if(filter==="approved"){
    list=list.filter(x=>x.db);
  }

  if(filter==="leaderboard"){
    list=list.filter(x=>x.source==="leaderboard");
  }

  if(q){
    list=list.filter(x=>{
      const name=String(x.name||"").toLowerCase();
      const id=String(x.db?.id||"").toLowerCase();
      return name.includes(q)||id.includes(q);
    });
  }

  list=sortPlayers(list,sort);

  if(!list.length){
    grid.innerHTML=`<p class="loading">No players found.</p>`;
    renderPlayersPagination(0,0,0,0);
    return;
  }

  const totalPages=Math.max(
    1,
    Math.ceil(list.length/PLAYERS_PER_PAGE)
  );

  playersCurrentPage=Math.min(
    Math.max(1,playersCurrentPage),
    totalPages
  );

  const start=(playersCurrentPage-1)*PLAYERS_PER_PAGE;
  const end=Math.min(
    start+PLAYERS_PER_PAGE,
    list.length
  );

  const pageItems=list.slice(start,end);

  grid.innerHTML=pageItems.map(x=>`
    <article class="player-card player-card-neon" data-player="${encodeURIComponent(x.name)}">
      <div class="player-card-neon-glow" aria-hidden="true"></div>

      <div class="player-card-top player-card-top-neon">
        <div class="player-card-avatar-wrap">
          ${avatarHTML(x.db,"avatar")}
          <span class="player-card-avatar-ring" aria-hidden="true"></span>
        </div>

        <div class="player-card-identity">
          <h3>${x.name}</h3>
          <p class="player-card-id">${x.db?.id||"Leaderboard Player"}</p>
          <div class="player-card-tier">${tierHTML(x.lb.rating)}</div>
        </div>
      </div>

      <div class="mini-stats mini-stats-neon">
        <div class="mini-stat">
          <small>Rating</small>
          <strong>${x.lb.rating}</strong>
        </div>

        <div class="mini-stat">
          <small>Peak</small>
          <strong>${x.lb.peak}</strong>
        </div>

        <div class="mini-stat">
          <small>Rank</small>
          <strong>${x.lb.rank && x.lb.rank!=="-" ? "#"+x.lb.rank : "#-"}</strong>
        </div>
      </div>

      <div class="player-card-meta">
        <span>🏓 ${x.db?.grip||"-"}</span>
        <span class="player-card-meta-dot">•</span>
        <span>${x.db?.hand||"-"}</span>
      </div>
    </article>
  `).join("");

  renderPlayersPagination(
    list.length,
    totalPages,
    start,
    end
  );
}

function renderSearch(){const input=document.getElementById("globalSearch"),results=document.getElementById("searchResults");if(!input||!results)return;const q=input.value.trim().toLowerCase();if(!q){results.innerHTML=`<p class="muted">Type a player name to view rating, tier and profile.</p>`;return}const items=getPlayerList().filter(i=>i.name.toLowerCase().includes(q)).slice(0,8);if(!items.length){results.innerHTML=`<p class="muted">No player found.</p>`;return}results.innerHTML=items.map(i=>`<div class="search-result" data-player="${encodeURIComponent(i.name)}"><div class="search-rank">${rankLabel(i.lb.rank)}</div><div><div class="search-name">${i.name}</div><div class="search-meta">${tierHTML(i.lb.rating)} · W-L ${i.lb.record} · Peak ${i.lb.peak}</div></div><div class="search-rating">${i.lb.rating}</div></div>`).join("")}


/* MYTT Singles Result — Active Players controlled native web form */
let singlesFormSubmitted=false;
let singlesStatusPollToken=0;

function todayLocalISO(){
  const d=new Date();
  d.setMinutes(d.getMinutes()-d.getTimezoneOffset());
  return d.toISOString().slice(0,10);
}


function formEls(){
  return{
    modal:document.getElementById("singlesFormModal"),
    form:document.getElementById("singlesResultForm"),
    closed:document.getElementById("singlesClosedState"),
    closedTitle:document.getElementById("singlesClosedTitle"),
    closedText:document.getElementById("singlesClosedText"),
    date:document.getElementById("singlesMatchDate"),
    submissionId:document.getElementById("singlesSubmissionId"),
    aSearch:document.getElementById("playerASearch"),
    aValue:document.getElementById("playerAValue"),
    aMenu:document.getElementById("playerAMenu"),
    bSearch:document.getElementById("playerBSearch"),
    bValue:document.getElementById("playerBValue"),
    bMenu:document.getElementById("playerBMenu"),
    winner:document.getElementById("winnerValue"),
    winnerChoices:document.getElementById("winnerChoices"),
    score:document.getElementById("scoreValue"),
    status:document.getElementById("singlesFormStatus"),
    submit:document.getElementById("singlesSubmitButton"),
    frame:document.getElementById("singlesSubmitFrame"),
    cta:document.getElementById("singlesSubmitCta"),
    ctaText:document.getElementById("singlesSubmitCtaText")
  };
}

function canonicalPlayerName(name){
  const s=slug(name);
  const item=getPlayerList().find(x=>slug(x.name)===s);
  return item?.name||String(name||"").trim();
}

function uniqueActiveNames(rows){
  const seen=new Set(),out=[];
  for(const raw of rows){
    const name=canonicalPlayerName(raw);
    const k=slug(name);
    if(!k||seen.has(k))continue;
    seen.add(k);
    out.push(name);
  }
  return out;
}

function isActivePlayer(name){
  const k=slug(name);
  return !!k&&activePlayers.some(n=>slug(n)===k);
}

function activePlayerItems(exclude=""){
  const ex=slug(exclude);
  return activePlayers
    .filter(name=>slug(name)!==ex)
    .map(name=>{
      const db=findDbByName(name);
      const lb=findLbByName(name);
      return {source:"active",db,lb,name:canonicalPlayerName(name)};
    });
}

function updateSinglesSessionUI(){
  const e=formEls();
  if(!e.cta)return;

  e.cta.classList.remove("session-open","session-closed","session-checking");
  e.cta.removeAttribute("aria-disabled");

  if(!activePlayersLoaded){
    e.cta.classList.add("session-checking");
    if(e.ctaText)e.ctaText.textContent="Checking active match session…";
  }else if(activePlayersError){
    e.cta.classList.add("session-closed");
    e.cta.setAttribute("aria-disabled","true");
    if(e.ctaText)e.ctaText.textContent="Session unavailable";
  }else if(!activePlayers.length){
    e.cta.classList.add("session-closed");
    e.cta.setAttribute("aria-disabled","true");
    if(e.ctaText)e.ctaText.textContent="Result submission closed";
  }else{
    e.cta.classList.add("session-open");
    if(e.ctaText)e.ctaText.textContent=`Open · ${activePlayers.length} active player${activePlayers.length===1?"":"s"}`;
  }

  syncSinglesSessionModal();
}

function syncSinglesSessionModal(){
  const e=formEls();
  if(!e.form||!e.closed)return;

  if(!activePlayersLoaded){
    e.form.classList.add("result-session-hidden");
    e.closed.classList.remove("result-session-hidden");
    if(e.closedTitle)e.closedTitle.textContent="Checking Match Session";
    if(e.closedText)e.closedText.textContent="MYTT is checking the current Active Players list…";
    return;
  }

  if(activePlayersError){
    e.form.classList.add("result-session-hidden");
    e.closed.classList.remove("result-session-hidden");
    if(e.closedTitle)e.closedTitle.textContent="Session Unavailable";
    if(e.closedText)e.closedText.textContent="MYTT could not verify the Active Players list. Result submission remains locked for safety.";
    return;
  }

  if(!activePlayers.length){
    e.form.classList.add("result-session-hidden");
    e.closed.classList.remove("result-session-hidden");
    if(e.closedTitle)e.closedTitle.textContent="Result Submission Closed";
    if(e.closedText)e.closedText.textContent="There are no players in the current Active Players session. Please wait for the next official MYTT match session.";
    return;
  }

  e.closed.classList.add("result-session-hidden");
  e.form.classList.remove("result-session-hidden");
}

function pickerElements(which){
  const e=formEls();
  return which==="A"
    ?{search:e.aSearch,value:e.aValue,menu:e.aMenu,other:e.bValue}
    :{search:e.bSearch,value:e.bValue,menu:e.bMenu,other:e.aValue};
}

function pickerOptionHTML(x,which){
  const rating=x.lb?.rating&&x.lb.rating!=="-"?x.lb.rating:"New";
  return `<button type="button" class="player-picker-option" data-pick-player="${encodeURIComponent(x.name)}" data-pick-side="${which}"><strong>${x.name}</strong><small>${rating}</small></button>`;
}

function renderPlayerPicker(which){
  const {search,menu,other}=pickerElements(which);
  if(!search||!menu)return;

  if(!activePlayersLoaded||activePlayersError||!activePlayers.length){
    menu.innerHTML=`<div class="player-picker-empty">Result submission is currently closed.</div>`;
    menu.classList.remove("hidden");
    return;
  }

  const q=search.value.trim().toLowerCase();
  let list=activePlayerItems(other?.value||"");

  if(q){
    list=list.filter(x=>x.name.toLowerCase().includes(q)||slug(x.name).includes(slug(q)));
  }

  menu.innerHTML=list.length
    ?`<div class="player-picker-label">${q?"Active Player Search":"Active Players"}</div>${list.map(x=>pickerOptionHTML(x,which)).join("")}`
    :`<div class="player-picker-empty">${q?"No active player found.":"No eligible opponent available."}</div>`;

  menu.classList.remove("hidden");
}

function closePlayerMenus(){
  const e=formEls();
  e.aMenu?.classList.add("hidden");
  e.bMenu?.classList.add("hidden");
}

function syncWinnerChoices(){
  const e=formEls(),a=e.aValue?.value||"",b=e.bValue?.value||"";
  if(!e.winnerChoices)return;

  if(!a||!b){
    e.winner.value="";
    e.winnerChoices.innerHTML=`<p class="result-hint">Select Player A and Player B first.</p>`;
    return;
  }

  if(e.winner.value&&!samePlayer(e.winner.value,a)&&!samePlayer(e.winner.value,b))e.winner.value="";
  e.winnerChoices.innerHTML=[a,b]
    .map(n=>`<button type="button" class="result-choice ${samePlayer(e.winner.value,n)?"active":""}" data-winner="${encodeURIComponent(n)}">${n}</button>`)
    .join("");
}

function chooseFormPlayer(which,name){
  const e=formEls(),p=pickerElements(which);
  const canonical=canonicalPlayerName(decodeURIComponent(name));

  if(!isActivePlayer(canonical)){
    if(e.status)e.status.textContent="That player is not in the current Active Players session.";
    return;
  }

  p.value.value=canonical;
  p.search.value=canonical;
  p.menu.classList.add("hidden");

  if(which==="A"&&e.bValue&&samePlayer(e.bValue.value,canonical)){
    e.bValue.value="";
    e.bSearch.value="";
  }
  if(which==="B"&&e.aValue&&samePlayer(e.aValue.value,canonical)){
    e.aValue.value="";
    e.aSearch.value="";
  }

  e.winner.value="";
  syncWinnerChoices();
  if(e.status)e.status.textContent="";
}

function resetSinglesResultForm(){
  const e=formEls();
  if(!e.form)return;
  e.form.reset();
  e.date.value=todayLocalISO();
  e.aValue.value="";
  e.bValue.value="";
  e.winner.value="";
  e.score.value="";
  document.querySelectorAll("#singlesFormModal .result-choice.active").forEach(x=>x.classList.remove("active"));
  syncWinnerChoices();
  closePlayerMenus();
  e.status.textContent="";
  e.status.classList.remove("success");
  e.submit.disabled=false;
  e.submit.textContent="Submit Result";
}

function prepareNextSinglesResult(){
  const e=formEls();
  if(!e.form)return;

  const savedDate=e.date?.value||todayLocalISO();

  if(e.aSearch)e.aSearch.value="";
  if(e.bSearch)e.bSearch.value="";
  if(e.aValue)e.aValue.value="";
  if(e.bValue)e.bValue.value="";
  if(e.winner)e.winner.value="";
  if(e.score)e.score.value="";
  if(e.submissionId)e.submissionId.value="";
  if(e.date)e.date.value=savedDate;

  document
    .querySelectorAll("#singlesFormModal .result-choice.active")
    .forEach(x=>x.classList.remove("active"));

  syncWinnerChoices();
  closePlayerMenus();

  setTimeout(()=>e.aSearch?.focus(),120);
}

function openSinglesResultForm(){
  const e=formEls();
  if(!e.modal)return;
  if(!e.date.value)e.date.value=todayLocalISO();
  syncSinglesSessionModal();
  e.modal.classList.remove("hidden");
  e.modal.setAttribute("aria-hidden","false");
  document.body.classList.add("result-modal-open");
  if(activePlayersLoaded&&!activePlayersError&&activePlayers.length){
    setTimeout(()=>e.aSearch?.focus(),80);
  }
}

function closeSinglesResultForm(){
  const e=formEls();
  if(!e.modal)return;
  e.modal.classList.add("hidden");
  e.modal.setAttribute("aria-hidden","true");
  document.body.classList.remove("result-modal-open");
  closePlayerMenus();
}

function validateSinglesResultForm(){
  const e=formEls();
  const a=e.aValue.value,b=e.bValue.value,w=e.winner.value,s=e.score.value,d=e.date.value;
  let msg="";

  if(!activePlayersLoaded||activePlayersError||!activePlayers.length)msg="Result submission is currently closed.";
  else if(!d)msg="Please select a valid match date.";
  else if(!a)msg="Please select Player A from the current Active Players list.";
  else if(!b)msg="Please select Player B from the current Active Players list.";
  else if(!isActivePlayer(a)||!isActivePlayer(b))msg="Both players must be in the current Active Players session.";
  else if(samePlayer(a,b))msg="Player A and Player B cannot be the same player.";
  else if(!w||(!samePlayer(w,a)&&!samePlayer(w,b)))msg="Please select the winner.";
  else if(!["3-0","3-1","3-2"].includes(s))msg="Please select the final score.";

  e.status.classList.remove("success");
  e.status.textContent=msg;
  return !msg;
}

function handleSinglesServerResult(data){
  if(!data||data.source!=="MYTT_SINGLES_WEB_APP")return false;

  const fe=formEls();
  singlesFormSubmitted=false;
  singlesStatusPollToken++;
  fe.submit.disabled=false;
  fe.status.classList.remove("success","error","rejected","closed");

  const status=String(data.status||"error").toLowerCase();
  const message=String(data.message||"MYTT could not process this result.");

  if(status==="pending")return false;

  if(status==="accepted"){
    fe.status.textContent="✓ Result accepted and ratings updated. Ready for the next result.";
    fe.status.classList.add("success");
    fe.submit.textContent="Submit Another Result";
    prepareNextSinglesResult();
    setTimeout(()=>loadAll(),700);
    return true;
  }

  if(status==="rejected"){
    fe.status.textContent="✕ "+message;
    fe.status.classList.add("rejected");
    fe.submit.textContent="Submit Result";
    setTimeout(()=>loadAll(),700);
    return true;
  }

  if(status==="closed"){
    fe.status.textContent="🔒 "+message;
    fe.status.classList.add("closed");
    fe.submit.textContent="Submit Result";
    setTimeout(()=>loadActivePlayers(),500);
    return true;
  }

  fe.status.textContent="⚠ "+message;
  fe.status.classList.add("error");
  fe.submit.textContent="Submit Result";
  return true;
}

function makeSinglesSubmissionId(){
  return "mytt_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,10);
}

function requestSinglesSubmissionStatus(submissionId,token,attempt){
  if(token!==singlesStatusPollToken)return;

  const fe=formEls();
  const maxAttempts=20;

  if(attempt>maxAttempts){
    singlesFormSubmitted=false;
    fe.submit.disabled=false;
    fe.submit.textContent="Submit Result";
    fe.status.classList.add("error");
    fe.status.textContent="⚠ MYTT could not confirm the final status automatically. Please check Match Results or Rejected Matches before trying again.";
    return;
  }

  const callbackName="__myttStatus_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,7);
  const script=document.createElement("script");
  let finished=false;

  function cleanup(){
    if(finished)return;
    finished=true;
    try{delete window[callbackName]}catch(_){window[callbackName]=undefined}
    script.remove();
  }

  window[callbackName]=data=>{
    cleanup();
    if(token!==singlesStatusPollToken)return;

    const status=String(data?.status||"pending").toLowerCase();
    if(status==="pending"){
      setTimeout(()=>requestSinglesSubmissionStatus(submissionId,token,attempt+1),900);
      return;
    }

    handleSinglesServerResult(data);
  };

  script.onerror=()=>{
    cleanup();
    if(token!==singlesStatusPollToken)return;
    setTimeout(()=>requestSinglesSubmissionStatus(submissionId,token,attempt+1),1100);
  };

  const base=config.singlesWebAppUrl;
  script.src=
    base+
    "?action=status&id="+encodeURIComponent(submissionId)+
    "&callback="+encodeURIComponent(callbackName)+
    "&_="+Date.now();

  document.body.appendChild(script);

  setTimeout(()=>{
    if(finished||token!==singlesStatusPollToken)return;
    cleanup();
    setTimeout(()=>requestSinglesSubmissionStatus(submissionId,token,attempt+1),700);
  },3500);
}

function startSinglesSubmissionStatusPolling(submissionId){
  singlesStatusPollToken++;
  const token=singlesStatusPollToken;
  setTimeout(()=>requestSinglesSubmissionStatus(submissionId,token,1),700);
}

function bindSinglesFormEvents(){
  const e=formEls();
  if(!e.modal)return;
  if(e.date&&!e.date.value)e.date.value=todayLocalISO();

  /* Keep postMessage as a fast-path if the browser happens to allow it. */
  window.addEventListener("message",event=>{
    const data=event.data;
    if(!data||data.source!=="MYTT_SINGLES_WEB_APP")return;
    handleSinglesServerResult(data);
  });
}

async function loadActivePlayers(){
  activePlayersLoaded=false;
  activePlayersError=false;
  updateSinglesSessionUI();

  if(!config.activePlayersCsv){
    activePlayers=[];
    activePlayersLoaded=true;
    activePlayersError=true;
    updateSinglesSessionUI();
    return;
  }

  try{
    const rows=await fetchRows(config.activePlayersCsv);
    activePlayers=uniqueActiveNames(rows.map(row=>row[0]).filter(Boolean));
    activePlayersError=false;
  }catch(err){
    console.error("Failed to load Active Players",err);
    activePlayers=[];
    activePlayersError=true;
  }finally{
    activePlayersLoaded=true;
    updateSinglesSessionUI();
  }
}



/* MYTT Join — native player registration form */
let joinFormSubmitted=false;
let joinStatusPollToken=0;

function joinFormEls(){
  return{
    modal:document.getElementById("joinFormModal"),
    form:document.getElementById("joinMyttForm"),
    name:document.getElementById("joinPlayerName"),
    grip:document.getElementById("joinGripStyle"),
    hand:document.getElementById("joinPlayingHand"),
    blade:document.getElementById("joinBlade"),
    fh:document.getElementById("joinForehandRubber"),
    bh:document.getElementById("joinBackhandRubber"),
    consent:document.getElementById("joinConsent"),
    submissionId:document.getElementById("joinSubmissionId"),
    photoInput:document.getElementById("joinProfilePhoto"),
    photoData:document.getElementById("joinPhotoData"),
    photoName:document.getElementById("joinPhotoName"),
    photoType:document.getElementById("joinPhotoType"),
    photoLabel:document.getElementById("joinPhotoLabel"),
    photoPreviewWrap:document.getElementById("joinPhotoPreviewWrap"),
    photoPreview:document.getElementById("joinPhotoPreview"),
    removePhoto:document.getElementById("joinRemovePhoto"),
    status:document.getElementById("joinFormStatus"),
    submit:document.getElementById("joinSubmitButton"),
    success:document.getElementById("joinSuccessState"),
    another:null
  };
}

function openJoinForm(){
  const e=joinFormEls();
  if(!e.modal)return;
  e.modal.classList.remove("hidden");
  e.modal.setAttribute("aria-hidden","false");
  document.body.classList.add("result-modal-open");
  setTimeout(()=>e.name?.focus(),80);
}

function closeJoinForm(){
  const e=joinFormEls();
  if(!e.modal)return;
  e.modal.classList.add("hidden");
  e.modal.setAttribute("aria-hidden","true");
  document.body.classList.remove("result-modal-open");
}

function makeJoinSubmissionId(){
  return "mytt_join_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,10);
}

function clearJoinPhoto(){
  const e=joinFormEls();
  if(e.photoInput)e.photoInput.value="";
  if(e.photoData)e.photoData.value="";
  if(e.photoName)e.photoName.value="";
  if(e.photoType)e.photoType.value="";
  if(e.photoPreview)e.photoPreview.removeAttribute("src");
  if(e.photoPreviewWrap)e.photoPreviewWrap.classList.add("hidden");
  if(e.photoLabel)e.photoLabel.textContent="Choose profile photo";
}

function resetJoinForm(){
  const e=joinFormEls();
  if(!e.form)return;
  e.form.reset();
  clearJoinPhoto();
  if(e.submissionId)e.submissionId.value="";
  if(e.status){
    e.status.textContent="";
    e.status.classList.remove("success","error","rejected","closed");
  }
  if(e.submit){
    e.submit.disabled=false;
    e.submit.textContent="Submit Registration";
  }
  e.form.classList.remove("hidden");
  e.success?.classList.add("hidden");
  setTimeout(()=>e.name?.focus(),80);
}

function validateJoinForm(){
  const e=joinFormEls();
  let msg="";

  if(!e.name?.value.trim())msg="Please enter your Player Name.";
  else if(!e.grip?.value)msg="Please select your Grip Style.";
  else if(!e.hand?.value)msg="Please select your Playing Hand.";
  else if(!e.blade?.value.trim())msg="Please enter your Blade. If you don’t know the exact model, enter the brand name.";
  else if(!e.fh?.value.trim())msg="Please enter your Forehand Rubber. If you don’t know the exact model, enter the brand name.";
  else if(!e.bh?.value.trim())msg="Please enter your Backhand Rubber. If you don’t know the exact model, enter the brand name.";
  else if(!e.photoData?.value)msg="Please upload a clear and authentic Profile Photo.";
  else if(!e.consent?.checked)msg="Please agree to the MYTT publication consent before submitting.";

  if(e.status){
    e.status.classList.remove("success","error","rejected","closed");
    e.status.textContent=msg;
  }
  return !msg;
}

function readJoinPhoto(file){
  const e=joinFormEls();

  if(!file){
    clearJoinPhoto();
    return Promise.resolve(true);
  }

  const allowed=["image/jpeg","image/png","image/webp"];
  if(!allowed.includes(file.type)){
    e.photoInput.value="";
    e.status.textContent="Profile photo must be JPG, PNG or WebP.";
    e.status.classList.add("error");
    return Promise.resolve(false);
  }

  if(file.size>8*1024*1024){
    e.photoInput.value="";
    e.status.textContent="Profile photo must be 8 MB or smaller.";
    e.status.classList.add("error");
    return Promise.resolve(false);
  }

  e.status.textContent="Preparing profile photo…";
  e.status.classList.remove("error");

  return new Promise(resolve=>{
    const reader=new FileReader();

    reader.onload=()=>{
      const sourceUrl=String(reader.result||"");
      const img=new Image();

      img.onload=()=>{
        try{
          const maxSide=1200;
          let width=img.naturalWidth||img.width;
          let height=img.naturalHeight||img.height;

          if(width>maxSide||height>maxSide){
            const scale=Math.min(maxSide/width,maxSide/height);
            width=Math.round(width*scale);
            height=Math.round(height*scale);
          }

          const canvas=document.createElement("canvas");
          canvas.width=width;
          canvas.height=height;

          const ctx=canvas.getContext("2d");
          if(!ctx)throw new Error("Canvas unavailable");

          // White background also normalizes transparent PNG/WebP photos.
          ctx.fillStyle="#ffffff";
          ctx.fillRect(0,0,width,height);
          ctx.drawImage(img,0,0,width,height);

          const compressedUrl=canvas.toDataURL("image/jpeg",0.82);
          const comma=compressedUrl.indexOf(",");

          if(comma<0)throw new Error("Invalid compressed photo");

          e.photoData.value=compressedUrl.slice(comma+1);
          e.photoName.value=(file.name||"profile-photo").replace(/\.[^.]+$/,"")+".jpg";
          e.photoType.value="image/jpeg";
          e.photoLabel.textContent=file.name||"Profile photo selected";
          e.photoPreview.src=compressedUrl;
          e.photoPreviewWrap.classList.remove("hidden");
          e.status.textContent="";
          e.status.classList.remove("error");
          resolve(true);
        }catch(err){
          console.error("Join photo compression failed",err);
          e.status.textContent="Could not prepare this profile photo.";
          e.status.classList.add("error");
          resolve(false);
        }
      };

      img.onerror=()=>{
        e.status.textContent="Could not read this profile photo.";
        e.status.classList.add("error");
        resolve(false);
      };

      img.src=sourceUrl;
    };

    reader.onerror=()=>{
      e.status.textContent="Could not read this profile photo.";
      e.status.classList.add("error");
      resolve(false);
    };

    reader.readAsDataURL(file);
  });
}

function handleJoinServerResult(data){
  if(!data||data.source!=="MYTT_JOIN_WEB_APP")return false;

  const e=joinFormEls();
  joinFormSubmitted=false;
  joinStatusPollToken++;

  if(e.submit){
    e.submit.disabled=false;
  }

  const status=String(data.status||"error").toLowerCase();
  const message=String(data.message||"MYTT could not process this registration.");

  if(status==="pending")return false;

  if(status==="accepted"){
    e.status.textContent="";
    e.status.classList.remove("error","rejected","closed");
    e.form.classList.add("hidden");
    e.success.classList.remove("hidden");
    return true;
  }

  e.status.textContent="⚠ "+message;
  e.status.classList.add("error");
  e.submit.textContent="Submit Registration";
  return true;
}

function requestJoinSubmissionStatus(submissionId,token,attempt){
  if(token!==joinStatusPollToken)return;

  const e=joinFormEls();
  const maxAttempts=35;

  if(attempt>maxAttempts){
    joinFormSubmitted=false;
    e.submit.disabled=false;
    e.submit.textContent="Submit Registration";
    e.status.classList.add("error");
    e.status.textContent="⏳ Your registration is being processed. Please wait for MYTT admin review and approval. There is no need to submit again.";
    return;
  }

  const callbackName="__myttJoinStatus_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,7);
  const script=document.createElement("script");
  let finished=false;

  function cleanup(){
    if(finished)return;
    finished=true;
    try{delete window[callbackName]}catch(_){window[callbackName]=undefined}
    script.remove();
  }

  window[callbackName]=data=>{
    cleanup();
    if(token!==joinStatusPollToken)return;

    const status=String(data?.status||"pending").toLowerCase();
    if(status==="pending"){
      setTimeout(()=>requestJoinSubmissionStatus(submissionId,token,attempt+1),900);
      return;
    }

    handleJoinServerResult(data);
  };

  script.onerror=()=>{
    cleanup();
    if(token!==joinStatusPollToken)return;
    setTimeout(()=>requestJoinSubmissionStatus(submissionId,token,attempt+1),1100);
  };

  script.src=
    config.joinWebAppUrl+
    "?action=status&id="+encodeURIComponent(submissionId)+
    "&callback="+encodeURIComponent(callbackName)+
    "&_="+Date.now();

  document.body.appendChild(script);

  setTimeout(()=>{
    if(finished||token!==joinStatusPollToken)return;
    cleanup();
    setTimeout(()=>requestJoinSubmissionStatus(submissionId,token,attempt+1),700);
  },3500);
}

function startJoinSubmissionStatusPolling(submissionId){
  joinStatusPollToken++;
  const token=joinStatusPollToken;
  setTimeout(()=>requestJoinSubmissionStatus(submissionId,token,1),700);
}

function bindJoinFormEvents(){
  const e=joinFormEls();
  if(!e.modal)return;

  e.photoInput?.addEventListener("change",async()=>{
    await readJoinPhoto(e.photoInput.files?.[0]||null);
  });

  e.removePhoto?.addEventListener("click",()=>{
    clearJoinPhoto();
  });

  window.addEventListener("message",event=>{
    const data=event.data;
    if(!data||data.source!=="MYTT_JOIN_WEB_APP")return;
    handleJoinServerResult(data);
  });
}

/* MYTT Doubles Result — Active Doubles Teams controlled native web form */
let doublesFormSubmitted=false;
let doublesStatusPollToken=0;

function doublesFormEls(){
  return{
    modal:document.getElementById("doublesFormModal"),
    form:document.getElementById("doublesResultForm"),
    closed:document.getElementById("doublesClosedState"),
    closedTitle:document.getElementById("doublesClosedTitle"),
    closedText:document.getElementById("doublesClosedText"),
    date:document.getElementById("doublesMatchDate"),
    submissionId:document.getElementById("doublesSubmissionId"),
    aSearch:document.getElementById("teamASearch"),
    aValue:document.getElementById("teamAValue"),
    aMenu:document.getElementById("teamAMenu"),
    bSearch:document.getElementById("teamBSearch"),
    bValue:document.getElementById("teamBValue"),
    bMenu:document.getElementById("teamBMenu"),
    winner:document.getElementById("doublesWinnerValue"),
    winnerChoices:document.getElementById("doublesWinnerChoices"),
    score:document.getElementById("doublesScoreValue"),
    status:document.getElementById("doublesFormStatus"),
    submit:document.getElementById("doublesSubmitButton"),
    frame:document.getElementById("doublesSubmitFrame"),
    cta:document.getElementById("doublesSubmitCta"),
    ctaText:document.getElementById("doublesSubmitCtaText")
  };
}

function canonicalDoublesTeamName(name){
  const s=slug(name);
  const item=doublesTeams.find(x=>slug(x.name)===s);
  return item?.name||String(name||"").trim();
}

function uniqueActiveDoublesNames(rows){
  const seen=new Set(),out=[];
  for(const raw of rows){
    const name=canonicalDoublesTeamName(raw);
    const k=slug(name);
    if(!k||seen.has(k))continue;
    seen.add(k);
    out.push(name);
  }
  return out;
}

function isActiveDoublesTeam(name){
  const k=slug(name);
  return !!k&&activeDoublesTeams.some(n=>slug(n)===k);
}

function activeDoublesTeamItems(exclude=""){
  const ex=slug(exclude);
  return activeDoublesTeams
    .filter(name=>slug(name)!==ex)
    .map(name=>{
      const lb=doublesTeams.find(x=>slug(x.name)===slug(name))||{rating:"-"};
      return {name:canonicalDoublesTeamName(name),lb};
    });
}

function updateDoublesSessionUI(){
  const e=doublesFormEls();
  if(!e.cta)return;

  e.cta.classList.remove("session-open","session-closed","session-checking");
  e.cta.removeAttribute("aria-disabled");

  if(!activeDoublesTeamsLoaded){
    e.cta.classList.add("session-checking");
    if(e.ctaText)e.ctaText.textContent="Checking active doubles session…";
  }else if(activeDoublesTeamsError){
    e.cta.classList.add("session-closed");
    e.cta.setAttribute("aria-disabled","true");
    if(e.ctaText)e.ctaText.textContent="Session unavailable";
  }else if(!activeDoublesTeams.length){
    e.cta.classList.add("session-closed");
    e.cta.setAttribute("aria-disabled","true");
    if(e.ctaText)e.ctaText.textContent="Result submission closed";
  }else{
    e.cta.classList.add("session-open");
    if(e.ctaText)e.ctaText.textContent=`Open · ${activeDoublesTeams.length} active team${activeDoublesTeams.length===1?"":"s"}`;
  }

  syncDoublesSessionModal();
}

function syncDoublesSessionModal(){
  const e=doublesFormEls();
  if(!e.form||!e.closed)return;

  if(!activeDoublesTeamsLoaded){
    e.form.classList.add("result-session-hidden");
    e.closed.classList.remove("result-session-hidden");
    if(e.closedTitle)e.closedTitle.textContent="Checking Doubles Session";
    if(e.closedText)e.closedText.textContent="MYTT is checking the current Active Doubles Teams list…";
    return;
  }

  if(activeDoublesTeamsError){
    e.form.classList.add("result-session-hidden");
    e.closed.classList.remove("result-session-hidden");
    if(e.closedTitle)e.closedTitle.textContent="Session Unavailable";
    if(e.closedText)e.closedText.textContent="MYTT could not verify the Active Doubles Teams list. Result submission remains locked for safety.";
    return;
  }

  if(!activeDoublesTeams.length){
    e.form.classList.add("result-session-hidden");
    e.closed.classList.remove("result-session-hidden");
    if(e.closedTitle)e.closedTitle.textContent="Result Submission Closed";
    if(e.closedText)e.closedText.textContent="There are no teams in the current Active Doubles Teams session. Please wait for the next official MYTT Doubles match session.";
    return;
  }

  e.closed.classList.add("result-session-hidden");
  e.form.classList.remove("result-session-hidden");
}

function doublesPickerElements(which){
  const e=doublesFormEls();
  return which==="A"
    ?{search:e.aSearch,value:e.aValue,menu:e.aMenu,other:e.bValue}
    :{search:e.bSearch,value:e.bValue,menu:e.bMenu,other:e.aValue};
}

function doublesPickerOptionHTML(x,which){
  const rating=x.lb?.rating&&x.lb.rating!=="-"?x.lb.rating:"New";
  return `<button type="button" class="player-picker-option" data-pick-team="${encodeURIComponent(x.name)}" data-pick-team-side="${which}"><strong>${x.name}</strong><small>${rating}</small></button>`;
}

function renderDoublesTeamPicker(which){
  const {search,menu,other}=doublesPickerElements(which);
  if(!search||!menu)return;

  if(!activeDoublesTeamsLoaded||activeDoublesTeamsError||!activeDoublesTeams.length){
    menu.innerHTML=`<div class="player-picker-empty">Result submission is currently closed.</div>`;
    menu.classList.remove("hidden");
    return;
  }

  const q=search.value.trim().toLowerCase();
  let list=activeDoublesTeamItems(other?.value||"");

  if(q){
    list=list.filter(x=>x.name.toLowerCase().includes(q)||slug(x.name).includes(slug(q)));
  }

  menu.innerHTML=list.length
    ?`<div class="player-picker-label">${q?"Active Team Search":"Active Doubles Teams"}</div>${list.map(x=>doublesPickerOptionHTML(x,which)).join("")}`
    :`<div class="player-picker-empty">${q?"No active team found.":"No eligible opponent team available."}</div>`;

  menu.classList.remove("hidden");
}

function closeDoublesTeamMenus(){
  const e=doublesFormEls();
  e.aMenu?.classList.add("hidden");
  e.bMenu?.classList.add("hidden");
}

function syncDoublesWinnerChoices(){
  const e=doublesFormEls(),a=e.aValue?.value||"",b=e.bValue?.value||"";
  if(!e.winnerChoices)return;

  if(!a||!b){
    e.winner.value="";
    e.winnerChoices.innerHTML=`<p class="result-hint">Select Team A and Team B first.</p>`;
    return;
  }

  if(e.winner.value&&!samePlayer(e.winner.value,a)&&!samePlayer(e.winner.value,b))e.winner.value="";
  e.winnerChoices.innerHTML=[a,b]
    .map(n=>`<button type="button" class="result-choice ${samePlayer(e.winner.value,n)?"active":""}" data-doubles-winner="${encodeURIComponent(n)}">${n}</button>`)
    .join("");
}

function chooseDoublesTeam(which,name){
  const e=doublesFormEls(),p=doublesPickerElements(which);
  const canonical=canonicalDoublesTeamName(decodeURIComponent(name));

  if(!isActiveDoublesTeam(canonical)){
    if(e.status)e.status.textContent="That team is not in the current Active Doubles Teams session.";
    return;
  }

  p.value.value=canonical;
  p.search.value=canonical;
  p.menu.classList.add("hidden");

  if(which==="A"&&e.bValue&&samePlayer(e.bValue.value,canonical)){
    e.bValue.value="";
    e.bSearch.value="";
  }
  if(which==="B"&&e.aValue&&samePlayer(e.aValue.value,canonical)){
    e.aValue.value="";
    e.aSearch.value="";
  }

  e.winner.value="";
  syncDoublesWinnerChoices();
  if(e.status)e.status.textContent="";
}

function resetDoublesResultForm(){
  const e=doublesFormEls();
  if(!e.form)return;
  e.form.reset();
  e.date.value=todayLocalISO();
  e.aValue.value="";
  e.bValue.value="";
  e.winner.value="";
  e.score.value="";
  document.querySelectorAll("#doublesFormModal .result-choice.active").forEach(x=>x.classList.remove("active"));
  syncDoublesWinnerChoices();
  closeDoublesTeamMenus();
  e.status.textContent="";
  e.status.classList.remove("success","error","rejected","closed");
  e.submit.disabled=false;
  e.submit.textContent="Submit Result";
}

function prepareNextDoublesResult(){
  const e=doublesFormEls();
  if(!e.form)return;

  const savedDate=e.date?.value||todayLocalISO();

  if(e.aSearch)e.aSearch.value="";
  if(e.bSearch)e.bSearch.value="";
  if(e.aValue)e.aValue.value="";
  if(e.bValue)e.bValue.value="";
  if(e.winner)e.winner.value="";
  if(e.score)e.score.value="";
  if(e.submissionId)e.submissionId.value="";
  if(e.date)e.date.value=savedDate;

  document
    .querySelectorAll("#doublesFormModal .result-choice.active")
    .forEach(x=>x.classList.remove("active"));

  syncDoublesWinnerChoices();
  closeDoublesTeamMenus();

  setTimeout(()=>e.aSearch?.focus(),120);
}

function openDoublesResultForm(){
  const e=doublesFormEls();
  if(!e.modal)return;
  if(!e.date.value)e.date.value=todayLocalISO();
  syncDoublesSessionModal();
  e.modal.classList.remove("hidden");
  e.modal.setAttribute("aria-hidden","false");
  document.body.classList.add("result-modal-open");
  if(activeDoublesTeamsLoaded&&!activeDoublesTeamsError&&activeDoublesTeams.length){
    setTimeout(()=>e.aSearch?.focus(),80);
  }
}

function closeDoublesResultForm(){
  const e=doublesFormEls();
  if(!e.modal)return;
  e.modal.classList.add("hidden");
  e.modal.setAttribute("aria-hidden","true");
  document.body.classList.remove("result-modal-open");
  closeDoublesTeamMenus();
}

function validateDoublesResultForm(){
  const e=doublesFormEls();
  const a=e.aValue.value,b=e.bValue.value,w=e.winner.value,s=e.score.value,d=e.date.value;
  let msg="";

  if(!activeDoublesTeamsLoaded||activeDoublesTeamsError||!activeDoublesTeams.length)msg="Result submission is currently closed.";
  else if(!d)msg="Please select a valid match date.";
  else if(!a)msg="Please select Team A from the current Active Doubles Teams list.";
  else if(!b)msg="Please select Team B from the current Active Doubles Teams list.";
  else if(!isActiveDoublesTeam(a)||!isActiveDoublesTeam(b))msg="Both teams must be in the current Active Doubles Teams session.";
  else if(samePlayer(a,b))msg="Team A and Team B cannot be the same team.";
  else if(!w||(!samePlayer(w,a)&&!samePlayer(w,b)))msg="Please select the winner.";
  else if(!["3-0","3-1","3-2"].includes(s))msg="Please select the final score.";

  e.status.classList.remove("success","error","rejected","closed");
  e.status.textContent=msg;
  return !msg;
}

function handleDoublesServerResult(data){
  if(!data||data.source!=="MYTT_DOUBLES_WEB_APP")return false;

  const fe=doublesFormEls();
  doublesFormSubmitted=false;
  doublesStatusPollToken++;
  fe.submit.disabled=false;
  fe.status.classList.remove("success","error","rejected","closed");

  const status=String(data.status||"error").toLowerCase();
  const message=String(data.message||"MYTT could not process this result.");

  if(status==="pending")return false;

  if(status==="accepted"){
    fe.status.textContent="✓ Result accepted and ratings updated. Ready for the next result.";
    fe.status.classList.add("success");
    fe.submit.textContent="Submit Another Result";
    prepareNextDoublesResult();
    setTimeout(()=>loadAll(),700);
    return true;
  }

  if(status==="rejected"){
    fe.status.textContent="✕ "+message;
    fe.status.classList.add("rejected");
    fe.submit.textContent="Submit Result";
    setTimeout(()=>loadAll(),700);
    return true;
  }

  if(status==="closed"){
    fe.status.textContent="🔒 "+message;
    fe.status.classList.add("closed");
    fe.submit.textContent="Submit Result";
    setTimeout(()=>loadActiveDoublesTeams(),500);
    return true;
  }

  fe.status.textContent="⚠ "+message;
  fe.status.classList.add("error");
  fe.submit.textContent="Submit Result";
  return true;
}

function makeDoublesSubmissionId(){
  return "mytt_d_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,10);
}

function requestDoublesSubmissionStatus(submissionId,token,attempt){
  if(token!==doublesStatusPollToken)return;

  const fe=doublesFormEls();
  const maxAttempts=20;

  if(attempt>maxAttempts){
    doublesFormSubmitted=false;
    fe.submit.disabled=false;
    fe.submit.textContent="Submit Result";
    fe.status.classList.add("error");
    fe.status.textContent="⚠ MYTT could not confirm the final status automatically. Please check Match Results or Rejected Matches before trying again.";
    return;
  }

  const callbackName="__myttDoublesStatus_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,7);
  const script=document.createElement("script");
  let finished=false;

  function cleanup(){
    if(finished)return;
    finished=true;
    try{delete window[callbackName]}catch(_){window[callbackName]=undefined}
    script.remove();
  }

  window[callbackName]=data=>{
    cleanup();
    if(token!==doublesStatusPollToken)return;

    const status=String(data?.status||"pending").toLowerCase();
    if(status==="pending"){
      setTimeout(()=>requestDoublesSubmissionStatus(submissionId,token,attempt+1),900);
      return;
    }

    handleDoublesServerResult(data);
  };

  script.onerror=()=>{
    cleanup();
    if(token!==doublesStatusPollToken)return;
    setTimeout(()=>requestDoublesSubmissionStatus(submissionId,token,attempt+1),1100);
  };

  const base=config.doublesWebAppUrl;
  script.src=
    base+
    "?action=status&id="+encodeURIComponent(submissionId)+
    "&callback="+encodeURIComponent(callbackName)+
    "&_="+Date.now();

  document.body.appendChild(script);

  setTimeout(()=>{
    if(finished||token!==doublesStatusPollToken)return;
    cleanup();
    setTimeout(()=>requestDoublesSubmissionStatus(submissionId,token,attempt+1),700);
  },3500);
}

function startDoublesSubmissionStatusPolling(submissionId){
  doublesStatusPollToken++;
  const token=doublesStatusPollToken;
  setTimeout(()=>requestDoublesSubmissionStatus(submissionId,token,1),700);
}

function bindDoublesFormEvents(){
  const e=doublesFormEls();
  if(!e.modal)return;
  if(e.date&&!e.date.value)e.date.value=todayLocalISO();

  window.addEventListener("message",event=>{
    const data=event.data;
    if(!data||data.source!=="MYTT_DOUBLES_WEB_APP")return;
    handleDoublesServerResult(data);
  });
}

async function loadActiveDoublesTeams(){
  activeDoublesTeamsLoaded=false;
  activeDoublesTeamsError=false;
  updateDoublesSessionUI();

  if(!config.activeDoublesTeamsCsv){
    activeDoublesTeams=[];
    activeDoublesTeamsLoaded=true;
    activeDoublesTeamsError=true;
    updateDoublesSessionUI();
    return;
  }

  try{
    const rows=await fetchRows(config.activeDoublesTeamsCsv);
    activeDoublesTeams=uniqueActiveDoublesNames(rows.map(row=>row[0]).filter(Boolean));
    activeDoublesTeamsError=false;
  }catch(err){
    console.error("Failed to load Active Doubles Teams",err);
    activeDoublesTeams=[];
    activeDoublesTeamsError=true;
  }finally{
    activeDoublesTeamsLoaded=true;
    updateDoublesSessionUI();
  }
}


/* =========================================================
   MYTT Upcoming Events + Native Event Registration
   ========================================================= */

let upcomingEvents=[];
let eventRegistrationSubmitted=false;
let eventRegistrationStatusPollToken=0;

function eventEscapeHtml(value){
  return String(value??"")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}

function eventFormEls(){
  return{
    modal:document.getElementById("eventRegistrationModal"),
    form:document.getElementById("eventRegistrationForm"),
    submissionId:document.getElementById("eventRegistrationSubmissionId"),
    eventId:document.getElementById("eventRegistrationEventId"),
    title:document.getElementById("eventRegistrationTitle"),
    eventName:document.getElementById("eventRegistrationEventName"),
    date:document.getElementById("eventRegistrationDate"),
    venue:document.getElementById("eventRegistrationVenue"),
    playerName:document.getElementById("eventRegistrationPlayerName"),
    myttId:document.getElementById("eventRegistrationMyttId"),
    category:document.getElementById("eventRegistrationCategory"),
    partnerField:document.getElementById("eventDoublesPartnerField"),
    partner:document.getElementById("eventRegistrationDoublesPartner"),
    contact:document.getElementById("eventRegistrationContact"),
    notes:document.getElementById("eventRegistrationNotes"),
    status:document.getElementById("eventRegistrationFormStatus"),
    submit:document.getElementById("eventRegistrationSubmitButton"),
    success:document.getElementById("eventRegistrationSuccessState"),
    successText:document.getElementById("eventRegistrationSuccessText")
  };
}

function findUpcomingEvent(eventId){
  const key=String(eventId||"").trim().toLowerCase();
  return upcomingEvents.find(x=>String(x.eventId||"").trim().toLowerCase()===key)||null;
}

function eventStatusPresentation(event){
  const raw=String(event?.effectiveStatus||"Upcoming");
  const remaining=Number(event?.spotsRemaining);

  if(raw==="Open" && Number.isFinite(remaining) && remaining>0 && remaining<=3){
    return{label:"Almost Full",cls:"almost-full",icon:"🟠"};
  }
  if(raw==="Open")return{label:"Registration Open",cls:"open",icon:"🟢"};
  if(raw==="Full")return{label:"Full",cls:"full",icon:"🔴"};
  if(raw==="Closed")return{label:"Registration Closed",cls:"closed",icon:"🔒"};
  if(raw==="Completed")return{label:"Completed",cls:"completed",icon:"✓"};
  return{label:"Registration Opens Soon",cls:"upcoming",icon:"⏳"};
}

function parseEventDateOnly(value){
  const text=String(value||"").trim();
  const m=text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m)return null;
  return new Date(Number(m[1]),Number(m[2])-1,Number(m[3]));
}

function eventDeadlineText(event){
  const d=parseEventDateOnly(event?.registrationDeadline);
  if(!d)return event?.registrationDeadlineDisplay
    ? "Registration closes "+event.registrationDeadlineDisplay
    : "";

  const now=new Date();
  const today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  const days=Math.ceil((d.getTime()-today.getTime())/86400000);

  if(days<0)return "Registration deadline passed";
  if(days===0)return "Registration closes today";
  if(days===1)return "Registration closes tomorrow";
  return "Registration closes in "+days+" days";
}

function eventCapacityHTML(event){
  const capacity=Number(event?.capacity)||0;
  const filled=Number(event?.spotsFilled)||0;

  if(capacity<=0){
    return `<div class="event-capacity event-capacity-unlimited">
      <div class="event-capacity-head">
        <span>Registration</span>
        <strong>${filled} registered</strong>
      </div>
    </div>`;
  }

  const pct=Math.max(0,Math.min(100,(filled/capacity)*100));
  const remaining=Math.max(0,capacity-filled);

  return `<div class="event-capacity">
    <div class="event-capacity-head">
      <span>Spots Filled</span>
      <strong>${filled} / ${capacity}</strong>
    </div>
    <div class="event-capacity-track"><span style="width:${pct}%"></span></div>
    <small>${remaining>0 ? remaining+" spot"+(remaining===1?"":"s")+" remaining" : "No spots remaining"}</small>
  </div>`;
}

function eventDateParts(event){
  const d=parseEventDateOnly(event?.date);
  if(d){
    const months=["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
    const weekdays=["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"];
    return{
      date:`${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`,
      weekday:weekdays[d.getDay()]
    };
  }
  return{date:String(event?.dateDisplay||event?.date||"TBA").toUpperCase(),weekday:""};
}

function eventTitleParts(name){
  const clean=String(name||"MYTT Event").trim();
  const words=clean.split(/\s+/);
  if(words.length<=1)return{top:"MYTT",main:clean.toUpperCase()};
  if(words[0].toUpperCase()==="MYTT")return{top:"MYTT",main:words.slice(1).join(" ").toUpperCase()};
  return{top:words[0].toUpperCase(),main:words.slice(1).join(" ").toUpperCase()};
}

function eventCardHTML(event){
  const status=eventStatusPresentation(event);
  const isOpen=String(event?.effectiveStatus)==="Open";
  const eventId=eventEscapeHtml(event?.eventId);
  const name=String(event?.eventName||"MYTT Event");
  const title=eventTitleParts(name);
  const dateParts=eventDateParts(event);
  const dateMain=eventEscapeHtml(dateParts.date);
  const weekday=eventEscapeHtml(dateParts.weekday);
  const time=eventEscapeHtml(event?.time||"TBA");
  const venue=eventEscapeHtml(event?.venue||"Venue TBA");
  const format=eventEscapeHtml(event?.format||"MYTT Event");
  const description=eventEscapeHtml(event?.description||"Official MYTT rating matches.");
  const capacity=Number(event?.capacity)||0;
  const filled=Number(event?.spotsFilled)||0;
  const remaining=capacity>0?Math.max(0,capacity-filled):filled;
  const pct=capacity>0?Math.max(0,Math.min(100,(filled/capacity)*100)):0;

  let registerButton;
  if(isOpen){
    registerButton=`<button class="target-register-button" type="button" data-register-event="${eventId}">
      <span>REGISTER NOW</span><b>→</b>
    </button>`;
  }else{
    const label=status.cls==="full"?"EVENT FULL":status.cls==="closed"?"REGISTRATION CLOSED":"OPENS SOON";
    registerButton=`<button class="target-register-button disabled" type="button" disabled><span>${eventEscapeHtml(label)}</span></button>`;
  }

  return `<article class="target-event-shell">
    <section class="target-event-hero">
      <div class="target-paddle-art" aria-hidden="true"></div>

      <div class="target-hero-content">
        <div class="target-event-title">
          <span>${eventEscapeHtml(title.top)}</span>
          <strong>${eventEscapeHtml(title.main)}</strong>
        </div>

        <div class="target-event-summary">
          <div class="target-summary-item target-date-summary">
            <span class="target-summary-icon target-calendar-icon">▦</span>
            <div><strong>${dateMain}</strong><small>${weekday}</small></div>
          </div>
          <i></i>
          <div class="target-summary-item target-status-summary ${status.cls}">
            <span class="target-live-dot"></span>
            <div><strong>${eventEscapeHtml(status.label)}</strong><small>${isOpen?"OPEN FOR REGISTRATION":"MYTT EVENT STATUS"}</small></div>
          </div>
          <i></i>
          <div class="target-summary-item target-spots-summary">
            <span class="target-people-icon">♟</span>
            <b>${remaining}</b>
            <div><strong>SPOTS REMAINING</strong><small>${capacity>0?"LIMITED SLOTS AVAILABLE":"OPEN REGISTRATION"}</small></div>
          </div>
        </div>
      </div>

      <div class="target-hero-action">${registerButton}</div>
    </section>

    <section class="target-event-details">
      <div class="target-details-heading">
        <div class="target-details-title"><span>//</span><strong>OFFICIAL EVENT DETAILS</strong></div>
        <div class="target-details-line"></div>
        <span class="target-event-id">${eventId}</span>
      </div>

      <div class="target-tech-grid">
        <div class="target-tech-card">
          <div class="target-tech-icon target-clock">◷</div>
          <div><small>TIME</small><strong>${time}</strong></div>
        </div>
        <div class="target-tech-card">
          <div class="target-tech-icon target-pin">●</div>
          <div><small>VENUE</small><strong>${venue}</strong></div>
        </div>
        <div class="target-tech-card">
          <div class="target-tech-icon target-ping">🏓</div>
          <div><small>FORMAT</small><strong>${format}</strong></div>
        </div>
        <div class="target-tech-card">
          <div class="target-tech-icon target-team">♟</div>
          <div><small>TOTAL SPOTS</small><strong>${capacity>0?capacity:"OPEN"}</strong></div>
        </div>
      </div>

      <div class="target-progress-panel">
        <div class="target-progress-head"><span>SPOTS FILLED</span><strong>${capacity>0?`${filled} / ${capacity}`:`${filled} REGISTERED`}</strong></div>
        <div class="target-progress-track"><span style="width:${pct}%"></span></div>
        <div class="target-progress-footer">
          <div class="target-description"><span>✓</span><p>${description}</p></div>
        </div>
      </div>
    </section>
  </article>`;
}

function renderUpcomingEvents(){
  const grid=document.getElementById("eventsGrid");
  const status=document.getElementById("eventsStatus");
  if(!grid)return;

  grid.classList.remove("events-count-0","events-count-1","events-count-2","events-count-many");

  if(!upcomingEvents.length){
    grid.classList.add("events-count-0");
    grid.innerHTML=`<div class="event-empty-state">
      <span>🏓</span>
      <strong>No upcoming MYTT events announced yet.</strong>
      <small>New matches and registration windows will appear here automatically.</small>
    </div>`;
    if(status)status.textContent="No upcoming events";
    return;
  }

  if(upcomingEvents.length===1)grid.classList.add("events-count-1");
  else if(upcomingEvents.length===2)grid.classList.add("events-count-2");
  else grid.classList.add("events-count-many");

  grid.innerHTML=upcomingEvents.map(eventCardHTML).join("");

  if(status){
    status.textContent=upcomingEvents.length===1
      ? "1 upcoming event"
      : upcomingEvents.length+" upcoming events";
  }
}

function normalizePublishedEventDate(value){
  const text=String(value||"").trim();
  if(!text)return"";

  let m=text.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/);
  if(m){
    const y=Number(m[1]),mo=Number(m[2]),d=Number(m[3]);
    return `${y}-${String(mo).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  }

  m=text.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/);
  if(m){
    const d=Number(m[1]),mo=Number(m[2]),y=Number(m[3]);
    return `${y}-${String(mo).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  }

  const parsed=new Date(text);
  if(!isNaN(parsed.getTime())){
    return `${parsed.getFullYear()}-${String(parsed.getMonth()+1).padStart(2,"0")}-${String(parsed.getDate()).padStart(2,"0")}`;
  }

  return text;
}

function publishedEventDateObject(value){
  const normalized=normalizePublishedEventDate(value);
  const m=normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m)return null;
  const d=new Date(Number(m[1]),Number(m[2])-1,Number(m[3]));
  return isNaN(d.getTime())?null:d;
}

function publishedEventDateDisplay(value){
  const d=publishedEventDateObject(value);
  if(!d)return String(value||"");
  return d.toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short",year:"numeric"});
}

function publishedEventStatus(manualStatus,eventDate,deadline,capacity,filled){
  const raw=String(manualStatus||"").trim().toLowerCase();
  const todayNow=new Date();
  const today=new Date(todayNow.getFullYear(),todayNow.getMonth(),todayNow.getDate());
  const eventDay=publishedEventDateObject(eventDate);
  const deadlineDay=publishedEventDateObject(deadline);

  if(raw==="completed")return"Completed";
  if(eventDay&&eventDay.getTime()<today.getTime())return"Completed";
  if(raw==="closed")return"Closed";
  if(deadlineDay&&deadlineDay.getTime()<today.getTime())return"Closed";
  if(raw==="full")return"Full";
  if(capacity>0&&filled>=capacity)return"Full";
  if(raw==="open")return"Open";
  if(raw==="upcoming"||raw==="coming soon")return"Upcoming";
  return"Upcoming";
}

function publishedRowsToEvents(rows){
  const events=[];

  rows.forEach(row=>{
    const eventId=String(row[0]||"").trim();
    const eventName=String(row[1]||"").trim();
    if(!eventId||!eventName)return;

    const date=normalizePublishedEventDate(row[2]);
    const deadline=normalizePublishedEventDate(row[7]);
    const capacity=Math.max(0,Number(String(row[6]||"").replace(/,/g,""))||0);
    const filled=Math.max(0,Number(String(row[10]||"").replace(/,/g,""))||0);
    const effectiveStatus=publishedEventStatus(row[8],date,deadline,capacity,filled);

    if(effectiveStatus==="Completed")return;

    events.push({
      eventId,
      eventName,
      date,
      dateDisplay:publishedEventDateDisplay(date),
      time:String(row[3]||"").trim(),
      venue:String(row[4]||"").trim(),
      format:String(row[5]||"").trim(),
      capacity,
      spotsFilled:filled,
      spotsRemaining:capacity>0?Math.max(0,capacity-filled):null,
      registrationDeadline:deadline,
      registrationDeadlineDisplay:publishedEventDateDisplay(deadline).replace(/^[A-Za-z]{3},\s*/,""),
      manualStatus:String(row[8]||"").trim(),
      effectiveStatus,
      description:String(row[9]||"").trim()
    });
  });

  events.sort((a,b)=>{
    const da=publishedEventDateObject(a.date);
    const db=publishedEventDateObject(b.date);
    return (da?da.getTime():Number.MAX_SAFE_INTEGER)-(db?db.getTime():Number.MAX_SAFE_INTEGER);
  });

  return events;
}

function sanitizeCachedUpcomingEvents(events){
  if(!Array.isArray(events))return[];

  return events
    .map(event=>{
      if(!event || typeof event!=="object")return null;

      const date=normalizePublishedEventDate(event.date);
      const deadline=normalizePublishedEventDate(
        event.registrationDeadline || event.deadline
      );
      const capacity=Math.max(0,Number(event.capacity)||0);
      const filled=Math.max(
        0,
        Number(
          event.spotsFilled ??
          event.filled ??
          event.registered ??
          0
        ) || 0
      );

      const effectiveStatus=publishedEventStatus(
        event.manualStatus || event.status || event.effectiveStatus,
        date,
        deadline,
        capacity,
        filled
      );

      if(effectiveStatus==="Completed")return null;

      return {
        ...event,
        date,
        dateDisplay:event.dateDisplay || publishedEventDateDisplay(date),
        registrationDeadline:deadline,
        registrationDeadlineDisplay:
          event.registrationDeadlineDisplay ||
          publishedEventDateDisplay(deadline).replace(/^[A-Za-z]{3},\s*/,""),
        capacity,
        spotsFilled:filled,
        spotsRemaining:
          capacity>0 ? Math.max(0,capacity-filled) : null,
        effectiveStatus
      };
    })
    .filter(Boolean)
    .sort((a,b)=>{
      const da=publishedEventDateObject(a.date);
      const db=publishedEventDateObject(b.date);
      return (da?da.getTime():Number.MAX_SAFE_INTEGER)-
             (db?db.getTime():Number.MAX_SAFE_INTEGER);
    });
}

function readCachedUpcomingEvents(){
  try{
    const raw=localStorage.getItem("mytt_upcoming_events_cache_v1");
    if(!raw)return[];

    const parsed=JSON.parse(raw);
    if(!parsed||!Array.isArray(parsed.events))return[];

    const sanitized=sanitizeCachedUpcomingEvents(parsed.events);

    // Refresh the stored copy too, so expired events disappear permanently
    // even if the device remains offline.
    if(sanitized.length!==parsed.events.length){
      localStorage.setItem(
        "mytt_upcoming_events_cache_v1",
        JSON.stringify({
          savedAt:Date.now(),
          events:sanitized
        })
      );
    }

    return sanitized;
  }catch(_){
    return[];
  }
}

function cacheUpcomingEvents(events){
  try{
    localStorage.setItem("mytt_upcoming_events_cache_v1",JSON.stringify({
      savedAt:Date.now(),
      events:Array.isArray(events)?events:[]
    }));
  }catch(_){}
}

function eventGvizDateValue(value){
  if(value instanceof Date && !isNaN(value.getTime())){
    return `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,"0")}-${String(value.getDate()).padStart(2,"0")}`;
  }
  return value;
}

function eventGvizCellValue(cell){
  if(!cell)return"";
  const raw=eventGvizDateValue(cell.v);
  if(raw instanceof Date)return eventGvizDateValue(raw);
  if(cell.v instanceof Date)return eventGvizDateValue(cell.v);
  if(cell.f!==undefined && cell.f!==null && String(cell.f).trim()!==""){
    // For dates use the actual Date value so day/month cannot be reversed.
    if(cell.v instanceof Date)return eventGvizDateValue(cell.v);
    return String(cell.f).trim();
  }
  return raw===undefined||raw===null?"":raw;
}

function eventGvizResponseToRows(response){
  if(!response || response.status!=="ok" || !response.table || !Array.isArray(response.table.rows)){
    const msg=response?.errors?.[0]?.message || "Invalid Google Sheets response";
    throw new Error(msg);
  }
  return response.table.rows.map(row=>{
    const cells=Array.isArray(row?.c)?row.c:[];
    const out=[];
    for(let i=0;i<11;i++)out.push(eventGvizCellValue(cells[i]));
    return out;
  }).filter(row=>row.some(value=>String(value??"").trim()!==""));
}

function bundledUpcomingEvents(){
  try{
    const rows=Array.isArray(config.eventsFallbackRows)?config.eventsFallbackRows:[];
    return publishedRowsToEvents(rows);
  }catch(err){
    console.warn("Bundled MYTT event fallback could not be parsed",err);
    return[];
  }
}

let eventGvizRequestNo=0;
function loadEventsViaGviz(timeoutMs=18000){
  return new Promise((resolve,reject)=>{
    if(!config.eventsGvizUrl){
      reject(new Error("Events GViz URL is missing"));
      return;
    }

    const requestNo=++eventGvizRequestNo;
    const callbackName=`__myttEventsGviz_${Date.now()}_${requestNo}`;
    const script=document.createElement("script");
    let settled=false;

    const cleanup=()=>{
      if(script.parentNode)script.parentNode.removeChild(script);
      try{delete window[callbackName]}catch(_){window[callbackName]=undefined}
    };

    const finish=(fn,value)=>{
      if(settled)return;
      settled=true;
      clearTimeout(timer);
      cleanup();
      fn(value);
    };

    window[callbackName]=(response)=>{
      try{
        finish(resolve,eventGvizResponseToRows(response));
      }catch(err){
        finish(reject,err);
      }
    };

    script.async=true;
    script.onerror=()=>finish(reject,new Error("Google Sheets script request failed"));
    const sep=config.eventsGvizUrl.includes("?")?"&":"?";
    const tqx=encodeURIComponent(`out:json;responseHandler:${callbackName}`);
    script.src=`${config.eventsGvizUrl}${sep}headers=1&tqx=${tqx}&_=${Date.now()}`;

    const timer=setTimeout(()=>finish(reject,new Error("Google Sheets script request timed out")),timeoutMs);
    document.head.appendChild(script);
  });
}

let eventWebAppReadRequestNo=0;
function loadEventsViaWebApp(timeoutMs=18000){
  return new Promise((resolve,reject)=>{
    if(!config.eventsWebAppUrl){
      reject(new Error("Events Web App URL is missing"));
      return;
    }

    const requestNo=++eventWebAppReadRequestNo;
    const callbackName=`__myttEventsApi_${Date.now()}_${requestNo}`;
    const script=document.createElement("script");
    let settled=false;

    const cleanup=()=>{
      if(script.parentNode)script.parentNode.removeChild(script);
      try{delete window[callbackName]}catch(_){window[callbackName]=undefined}
    };

    const finish=(fn,value)=>{
      if(settled)return;
      settled=true;
      clearTimeout(timer);
      cleanup();
      fn(value);
    };

    window[callbackName]=(data)=>{
      if(!data || data.source!=="MYTT_EVENTS_WEB_APP" || String(data.status||"").toLowerCase()!=="ok"){
        finish(reject,new Error(String(data?.message||"Invalid MYTT Events API response")));
        return;
      }
      finish(resolve,Array.isArray(data.events)?data.events:[]);
    };

    script.async=true;
    script.onerror=()=>finish(reject,new Error("MYTT Events API script request failed"));
    script.src=config.eventsWebAppUrl+
      "?action=events"+
      "&callback="+encodeURIComponent(callbackName)+
      "&_="+Date.now();

    const timer=setTimeout(()=>finish(reject,new Error("MYTT Events API request timed out")),timeoutMs);
    document.head.appendChild(script);
  });
}

async function loadUpcomingEvents(options={}){
  const status=document.getElementById("eventsStatus");
  const maxAttempts=Math.max(1,Number(options.maxAttempts)||2);
  const timeoutMs=Math.max(7000,Number(options.timeoutMs)||18000);

  // Never make the event section blank while a cross-origin request is pending.
  // Prefer a previously successful live copy; otherwise use the bundled current-event snapshot.
  const cached=readCachedUpcomingEvents();
  const bundled=bundledUpcomingEvents();
  const initial=cached.length?cached:bundled;
  if(!upcomingEvents.length && initial.length){
    upcomingEvents=initial;
    renderUpcomingEvents();
  }

  let lastError=null;

  // Primary live source: original Spreadsheet ID through Google Visualization JSONP.
  if(config.eventsGvizUrl){
    for(let attempt=1;attempt<=maxAttempts;attempt++){
      try{
        if(status)status.textContent=attempt>1?"Refreshing events…":"Checking events...";
        const rows=await loadEventsViaGviz(timeoutMs);
        const liveEvents=publishedRowsToEvents(rows);
        upcomingEvents=liveEvents;
        cacheUpcomingEvents(liveEvents);
        renderUpcomingEvents();
        return liveEvents;
      }catch(err){
        lastError=err;
        console.warn(`Upcoming MYTT Events GViz attempt ${attempt} failed`,err);
        if(attempt<maxAttempts)await new Promise(resolve=>setTimeout(resolve,650*attempt));
      }
    }
  }

  // Secondary live source: existing public Apps Script JSONP endpoint.
  try{
    if(status)status.textContent="Refreshing events…";
    const apiEventsRaw=await loadEventsViaWebApp(timeoutMs);
    const apiEvents=sanitizeCachedUpcomingEvents(apiEventsRaw);
    upcomingEvents=apiEvents;
    cacheUpcomingEvents(apiEvents);
    renderUpcomingEvents();
    return apiEvents;
  }catch(err){
    lastError=err;
    console.warn("Upcoming MYTT Events Apps Script fallback failed",err);
  }

  // Hard fallback: show a usable event card instead of an empty failure state.
  const fallback=readCachedUpcomingEvents();
  const safeEvents=fallback.length?fallback:bundledUpcomingEvents();
  upcomingEvents=safeEvents;
  renderUpcomingEvents();

  if(status){
    if(upcomingEvents.length===1)status.textContent="1 upcoming event";
    else if(upcomingEvents.length>1)status.textContent=upcomingEvents.length+" upcoming events";
    else status.textContent="No upcoming events";
  }

  if(lastError)console.warn("Live MYTT Events unavailable; using safe fallback",lastError);
  return upcomingEvents;
}

function renderEventPlayerSuggestions(){
  const list=document.getElementById("eventPlayerSuggestions");
  if(!list)return;

  const names=getPlayerList().map(x=>x.name);
  list.innerHTML=[...new Set(names)].sort((a,b)=>a.localeCompare(b))
    .map(name=>`<option value="${eventEscapeHtml(name)}"></option>`)
    .join("");
}

function syncEventMyttIdFromName(){
  const e=eventFormEls();
  if(!e.playerName||!e.myttId)return;

  const key=slug(e.playerName.value);
  if(!key)return;

  const exact=playerDb.find(p=>slug(p.name)===key);
  if(exact?.id)e.myttId.value=exact.id;
}

function configureEventCategories(event){
  const e=eventFormEls();
  if(!e.category)return;

  const format=String(event?.format||"").toLowerCase();
  let options;

  const hasSingles=format.includes("single");
  const hasDoubles=format.includes("double");

  if(hasSingles&&!hasDoubles){
    options=[["Singles","Singles"]];
  }else if(hasDoubles&&!hasSingles){
    options=[["Doubles","Doubles"]];
  }else{
    options=[
      ["","Select category"],
      ["Singles","Singles"],
      ["Doubles","Doubles"],
      ["Singles + Doubles","Both — Singles + Doubles"]
    ];
  }

  e.category.innerHTML=options
    .map(([value,label])=>`<option value="${eventEscapeHtml(value)}">${eventEscapeHtml(label)}</option>`)
    .join("");

  if(options.length===1)e.category.value=options[0][0];

  updateEventPartnerVisibility();
}

function updateEventPartnerVisibility(){
  const e=eventFormEls();
  if(!e.category||!e.partnerField)return;

  const needsPartner=String(e.category.value||"").toLowerCase().includes("double");
  e.partnerField.classList.toggle("hidden",!needsPartner);
  if(!needsPartner && e.partner)e.partner.value="";
}

function resetEventRegistrationForm(){
  const e=eventFormEls();
  if(!e.form)return;

  e.form.reset();
  if(e.submissionId)e.submissionId.value="";
  if(e.eventId)e.eventId.value="";
  if(e.status){
    e.status.textContent="";
    e.status.classList.remove("success","error","rejected","closed");
  }
  if(e.submit){
    e.submit.disabled=false;
    e.submit.textContent="Submit Registration";
  }
  e.partnerField?.classList.add("hidden");
  e.form.classList.remove("hidden");
  e.success?.classList.add("hidden");
}

function openEventRegistration(eventId){
  const event=findUpcomingEvent(eventId);
  if(!event || String(event.effectiveStatus)!=="Open")return;

  const e=eventFormEls();
  if(!e.modal)return;

  resetEventRegistrationForm();

  e.eventId.value=String(event.eventId||"");
  e.title.textContent="Register — "+String(event.eventName||"MYTT Event");
  e.eventName.textContent=String(event.eventName||"MYTT Event");
  e.date.textContent="📅 "+[event.dateDisplay||event.date||"TBA",event.time||""].filter(Boolean).join(" · ");
  e.venue.textContent="📍 "+String(event.venue||"Venue TBA");

  configureEventCategories(event);
  renderEventPlayerSuggestions();

  e.modal.classList.remove("hidden");
  e.modal.setAttribute("aria-hidden","false");
  document.body.classList.add("result-modal-open");

  setTimeout(()=>e.playerName?.focus(),80);
}

function closeEventRegistration(){
  const e=eventFormEls();
  if(!e.modal)return;

  e.modal.classList.add("hidden");
  e.modal.setAttribute("aria-hidden","true");
  document.body.classList.remove("result-modal-open");
}

function makeEventRegistrationSubmissionId(){
  return "mytt_event_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,10);
}

function validateEventRegistrationForm(){
  const e=eventFormEls();
  let msg="";

  const event=findUpcomingEvent(e.eventId?.value);
  const category=String(e.category?.value||"");

  if(!event)msg="The selected MYTT event could not be found.";
  else if(String(event.effectiveStatus)!=="Open")msg="Registration for this event is not currently open.";
  else if(!e.playerName?.value.trim())msg="Please enter your Player Name.";
  else if(!category)msg="Please select a Category.";
  else if(category.toLowerCase().includes("double")&&!e.partner?.value.trim())msg="Please enter your Doubles Partner.";
  else if(!e.contact?.value.trim())msg="Please enter your Contact Number.";

  if(e.status){
    e.status.classList.remove("success","error","rejected","closed");
    e.status.textContent=msg;
    if(msg)e.status.classList.add("error");
  }

  return !msg;
}

function handleEventRegistrationServerResult(data){
  if(!data||data.source!=="MYTT_EVENTS_WEB_APP")return false;

  const e=eventFormEls();
  eventRegistrationSubmitted=false;
  eventRegistrationStatusPollToken++;

  if(e.submit)e.submit.disabled=false;

  const status=String(data.status||"error").toLowerCase();
  const message=String(data.message||"MYTT could not process this registration.");

  if(status==="pending")return false;

  if(status==="accepted"){
    if(e.status)e.status.textContent="";
    e.form?.classList.add("hidden");
    e.success?.classList.remove("hidden");
    if(e.successText)e.successText.textContent=message;
    if(e.submit)e.submit.textContent="Submit Registration";

    setTimeout(()=>loadUpcomingEvents(),400);
    return true;
  }

  if(e.status){
    e.status.textContent="⚠ "+message;
    e.status.classList.add("error");
  }
  if(e.submit)e.submit.textContent="Submit Registration";
  return true;
}

function requestEventRegistrationStatus(submissionId,token,attempt){
  if(token!==eventRegistrationStatusPollToken)return;

  const e=eventFormEls();
  const maxAttempts=35;

  if(attempt>maxAttempts){
    eventRegistrationSubmitted=false;
    if(e.submit){
      e.submit.disabled=false;
      e.submit.textContent="Submit Registration";
    }
    if(e.status){
      e.status.classList.add("error");
      e.status.textContent="⏳ Your registration is being processed. Please do not submit it again yet.";
    }
    return;
  }

  const callbackName="__myttEventStatus_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,7);
  const script=document.createElement("script");
  let finished=false;

  function cleanup(){
    if(finished)return;
    finished=true;
    try{delete window[callbackName]}catch(_){window[callbackName]=undefined}
    script.remove();
  }

  window[callbackName]=data=>{
    cleanup();
    if(token!==eventRegistrationStatusPollToken)return;

    const status=String(data?.status||"pending").toLowerCase();
    if(status==="pending"){
      setTimeout(()=>requestEventRegistrationStatus(submissionId,token,attempt+1),900);
      return;
    }

    handleEventRegistrationServerResult(data);
  };

  script.onerror=()=>{
    cleanup();
    if(token!==eventRegistrationStatusPollToken)return;
    setTimeout(()=>requestEventRegistrationStatus(submissionId,token,attempt+1),1100);
  };

  script.src=
    config.eventsWebAppUrl+
    "?action=status&id="+encodeURIComponent(submissionId)+
    "&callback="+encodeURIComponent(callbackName)+
    "&_="+Date.now();

  document.body.appendChild(script);

  setTimeout(()=>{
    if(finished||token!==eventRegistrationStatusPollToken)return;
    cleanup();
    setTimeout(()=>requestEventRegistrationStatus(submissionId,token,attempt+1),700);
  },3500);
}

function startEventRegistrationStatusPolling(submissionId){
  eventRegistrationStatusPollToken++;
  const token=eventRegistrationStatusPollToken;
  setTimeout(()=>requestEventRegistrationStatus(submissionId,token,1),700);
}

function bindEventRegistrationEvents(){
  const e=eventFormEls();
  if(!e.modal)return;

  window.addEventListener("message",event=>{
    const data=event.data;
    if(!data||data.source!=="MYTT_EVENTS_WEB_APP")return;
    handleEventRegistrationServerResult(data);
  });
}


function bindEvents(){
  document.addEventListener("input",e=>{
    if(e.target.id==="globalSearch")renderSearch();
    if(e.target.id==="playersSearch"){playersCurrentPage=1;renderPlayers();}
    if(e.target.id==="eventRegistrationPlayerName")syncEventMyttIdFromName();
    if(e.target.id==="playerASearch"){document.getElementById("playerAValue").value="";document.getElementById("winnerValue").value="";syncWinnerChoices();renderPlayerPicker("A")}
    if(e.target.id==="playerBSearch"){document.getElementById("playerBValue").value="";document.getElementById("winnerValue").value="";syncWinnerChoices();renderPlayerPicker("B")}
    if(e.target.id==="teamASearch"){document.getElementById("teamAValue").value="";document.getElementById("doublesWinnerValue").value="";syncDoublesWinnerChoices();renderDoublesTeamPicker("A")}
    if(e.target.id==="teamBSearch"){document.getElementById("teamBValue").value="";document.getElementById("doublesWinnerValue").value="";syncDoublesWinnerChoices();renderDoublesTeamPicker("B")}
  });
  document.addEventListener("focusin",e=>{if(e.target.id==="playerASearch")renderPlayerPicker("A");if(e.target.id==="playerBSearch")renderPlayerPicker("B");if(e.target.id==="teamASearch")renderDoublesTeamPicker("A");if(e.target.id==="teamBSearch")renderDoublesTeamPicker("B")});
  document.addEventListener("change",e=>{
    if(e.target.id==="playersFilter"||e.target.id==="playersSort"){playersCurrentPage=1;renderPlayers();}
    if(e.target.id==="eventRegistrationCategory")updateEventPartnerVisibility();
  });
  document.addEventListener("click",e=>{
    const registerEvent=e.target.closest("[data-register-event]");if(registerEvent){e.preventDefault();openEventRegistration(registerEvent.dataset.registerEvent);return}
    const closeEvent=e.target.closest("[data-close-event-registration]");if(closeEvent){e.preventDefault();closeEventRegistration();return}
    const openJoin=e.target.closest("[data-open-join-form]");if(openJoin){e.preventDefault();openJoinForm();return}
    const closeJoin=e.target.closest("[data-close-join-form]");if(closeJoin){e.preventDefault();closeJoinForm();return}
    const open=e.target.closest("[data-open-singles-form]");if(open){e.preventDefault();openSinglesResultForm();return}
    const close=e.target.closest("[data-close-singles-form]");if(close){e.preventDefault();closeSinglesResultForm();return}
    const openD=e.target.closest("[data-open-doubles-form]");if(openD){e.preventDefault();openDoublesResultForm();return}
    const closeD=e.target.closest("[data-close-doubles-form]");if(closeD){e.preventDefault();closeDoublesResultForm();return}
    const pick=e.target.closest("[data-pick-player]");if(pick){e.preventDefault();chooseFormPlayer(pick.dataset.pickSide,pick.dataset.pickPlayer);return}
    const pickTeam=e.target.closest("[data-pick-team]");if(pickTeam){e.preventDefault();chooseDoublesTeam(pickTeam.dataset.pickTeamSide,pickTeam.dataset.pickTeam);return}
    const winner=e.target.closest("[data-winner]");if(winner){const fe=formEls();fe.winner.value=decodeURIComponent(winner.dataset.winner);syncWinnerChoices();fe.status.textContent="";return}
    const winnerD=e.target.closest("[data-doubles-winner]");if(winnerD){const fe=doublesFormEls();fe.winner.value=decodeURIComponent(winnerD.dataset.doublesWinner);syncDoublesWinnerChoices();fe.status.textContent="";return}
    const score=e.target.closest("[data-score]");if(score){const fe=formEls();fe.score.value=score.dataset.score;document.querySelectorAll("#singlesFormModal [data-score]").forEach(x=>x.classList.toggle("active",x===score));fe.status.textContent="";return}
    const scoreD=e.target.closest("[data-doubles-score]");if(scoreD){const fe=doublesFormEls();fe.score.value=scoreD.dataset.doublesScore;document.querySelectorAll("#doublesFormModal [data-doubles-score]").forEach(x=>x.classList.toggle("active",x===scoreD));fe.status.textContent="";return}
    const leaderboardToggle=e.target.closest("[data-leaderboard-toggle]");
    if(leaderboardToggle){
      e.preventDefault();
      changeLeaderboardVisible(
        leaderboardToggle.dataset.leaderboardToggle,
        leaderboardToggle.dataset.leaderboardAction
      );
      return;
    }

    const playerPage=e.target.closest("[data-player-page]");
    if(playerPage&&!playerPage.disabled){
      e.preventDefault();
      playersCurrentPage=Number(playerPage.dataset.playerPage)||1;
      renderPlayers();
      document.getElementById("players")?.scrollIntoView({
        behavior:"smooth",
        block:"start"
      });
      return;
    }
    if(!e.target.closest(".player-picker")){closePlayerMenus();closeDoublesTeamMenus();}
    const p=e.target.closest("[data-player]");if(p){e.stopPropagation();openProfile(p.dataset.player)}
    if(e.target.matches("[data-close-modal]"))closeProfile();
  });
  document.addEventListener("submit",e=>{if(e.target.id==="eventRegistrationForm"){
    if(!validateEventRegistrationForm()){e.preventDefault();return}

    const fe=eventFormEls();
    const submissionId=makeEventRegistrationSubmissionId();
    fe.submissionId.value=submissionId;

    eventRegistrationSubmitted=true;
    fe.submit.disabled=true;
    fe.submit.textContent="Submitting…";
    fe.status.classList.remove("success","error","rejected","closed");
    fe.status.textContent="MYTT is submitting your event registration…";

    startEventRegistrationStatusPolling(submissionId);
  }});

  document.addEventListener("submit",e=>{if(e.target.id==="singlesResultForm"){
    if(!validateSinglesResultForm()){e.preventDefault();return}

    const fe=formEls();
    const submissionId=makeSinglesSubmissionId();
    fe.submissionId.value=submissionId;

    singlesFormSubmitted=true;
    fe.submit.disabled=true;
    fe.submit.textContent="Submitting…";
    fe.status.classList.remove("success","error","rejected","closed");
    fe.status.textContent="MYTT is validating this result…";

    startSinglesSubmissionStatusPolling(submissionId);
  }});


  document.addEventListener("submit",e=>{if(e.target.id==="joinMyttForm"){
    if(!validateJoinForm()){e.preventDefault();return}

    const fe=joinFormEls();
    const submissionId=makeJoinSubmissionId();
    fe.submissionId.value=submissionId;

    joinFormSubmitted=true;
    fe.submit.disabled=true;
    fe.submit.textContent="Submitting…";
    fe.status.classList.remove("success","error","rejected","closed");
    fe.status.textContent="MYTT is submitting your registration…";

    startJoinSubmissionStatusPolling(submissionId);
  }});

  document.addEventListener("submit",e=>{if(e.target.id==="doublesResultForm"){
    if(!validateDoublesResultForm()){e.preventDefault();return}

    const fe=doublesFormEls();
    const submissionId=makeDoublesSubmissionId();
    fe.submissionId.value=submissionId;

    doublesFormSubmitted=true;
    fe.submit.disabled=true;
    fe.submit.textContent="Submitting…";
    fe.status.classList.remove("success","error","rejected","closed");
    fe.status.textContent="MYTT is validating this doubles result…";

    startDoublesSubmissionStatusPolling(submissionId);
  }});

  document.addEventListener("keydown",e=>{if(e.key==="Escape"){
    const efm=document.getElementById("eventRegistrationModal");
    const jfm=document.getElementById("joinFormModal");
    const sfm=document.getElementById("singlesFormModal");
    const dfm=document.getElementById("doublesFormModal");
    if(efm&&!efm.classList.contains("hidden"))closeEventRegistration();
    else if(jfm&&!jfm.classList.contains("hidden"))closeJoinForm();
    else if(sfm&&!sfm.classList.contains("hidden"))closeSinglesResultForm();
    else if(dfm&&!dfm.classList.contains("hidden"))closeDoublesResultForm();
    else closeProfile();
  }})
}
async function loadMatchResults(){if(!config.matchResultsCsv)return;try{const rows=await fetchRows(config.matchResultsCsv);matchResults=rows.map(rowToMatch).filter(m=>m.playerA&&m.playerB)}catch(e){console.error("Failed to load match results",e);matchResults=[]}}
async function loadAll(){await loadPlayerDb();await loadMatchResults();await loadLeaderboard(config.singlesCsv,"singlesBody","singlesStatus","singles","singles");await loadLeaderboard(config.doublesCsv,"doublesBody","doublesStatus","doubles","doubles");await loadActivePlayers();await loadActiveDoublesTeams();renderPlayers();renderSearch();renderEventPlayerSuggestions()}
bindEvents();bindSinglesFormEvents();bindDoublesFormEvents();bindJoinFormEvents();bindEventRegistrationEvents();
// Load Events immediately instead of waiting for every other spreadsheet request.
loadUpcomingEvents();
loadAll();
setInterval(loadAll,60000);
setInterval(()=>loadUpcomingEvents({maxAttempts:1,timeoutMs:18000}),60000);

// Mobile resilience: retry when connection returns or the tab becomes active again.
window.addEventListener("online",()=>loadUpcomingEvents({maxAttempts:2,timeoutMs:18000}));
document.addEventListener("visibilitychange",()=>{
  if(document.visibilityState!=="visible")return;
  const eventStatus=document.getElementById("eventsStatus");
  if(!upcomingEvents.length || /failed|unavailable/i.test(eventStatus?.textContent||"")){
    loadUpcomingEvents({maxAttempts:2,timeoutMs:18000});
  }
});

// Tapping the Events nav after a failed load retries immediately.
document.addEventListener("click",e=>{
  const eventsLink=e.target.closest('a[href="#events"]');
  if(!eventsLink)return;
  const eventStatus=document.getElementById("eventsStatus");
  if(!upcomingEvents.length || /failed|unavailable/i.test(eventStatus?.textContent||"")){
    loadUpcomingEvents({maxAttempts:2,timeoutMs:18000});
  }
});

document.addEventListener("click", function(e){
  const target = e.target;
  if(target && target.textContent && target.textContent.trim() === "×"){
    closeProfile();
  }
});

/* MYTT Mobile Big Close Button */
(function(){
  const bigClose = document.createElement("button");
  bigClose.innerHTML = "×";
  bigClose.id = "mobileBigCloseProfile";

  bigClose.style.position = "fixed";
  bigClose.style.top = "18px";
  bigClose.style.right = "18px";
  bigClose.style.width = "70px";
  bigClose.style.height = "70px";
  bigClose.style.borderRadius = "50%";
  bigClose.style.border = "2px solid rgba(255,255,255,.35)";
  bigClose.style.background = "rgba(0,0,0,.75)";
  bigClose.style.color = "#fff";
  bigClose.style.fontSize = "46px";
  bigClose.style.fontWeight = "900";
  bigClose.style.zIndex = "999999999";
  bigClose.style.display = "none";
  bigClose.style.alignItems = "center";
  bigClose.style.justifyContent = "center";
  bigClose.style.cursor = "pointer";
  bigClose.style.touchAction = "manipulation";

  document.body.appendChild(bigClose);

  function isProfileOpen(){
    const modal = document.getElementById("profileModal");
    return modal && !modal.classList.contains("hidden");
  }

  function updateBigClose(){
    bigClose.style.display = isProfileOpen() ? "flex" : "none";
  }

  bigClose.addEventListener("click", function(e){
    e.preventDefault();
    e.stopPropagation();
    const modal = document.getElementById("profileModal");
    if(modal) modal.classList.add("hidden");
    bigClose.style.display = "none";
  });

  document.addEventListener("click", function(){
    setTimeout(updateBigClose, 100);
  });

  setInterval(updateBigClose, 300);
})();


/* =========================================================
   PREMIUM HEADER NAVIGATION
   ========================================================= */
(function initPremiumHeader(){
  function setActiveNav(target){
    document.querySelectorAll(".premium-nav .nav-link").forEach(link=>{
      link.classList.toggle(
        "active",
        link.dataset.target===target
      );
    });
  }

  function closePremiumNav(){
    const header=document.querySelector(".premium-header");
    const toggle=document.querySelector(".premium-mobile-toggle");
    if(!header||!toggle)return;
    header.classList.remove("nav-open");
    toggle.setAttribute("aria-expanded","false");
  }

  document.addEventListener("click",event=>{
    const toggle=event.target.closest(".premium-mobile-toggle");
    if(toggle){
      const header=document.querySelector(".premium-header");
      if(!header)return;
      const isOpen=header.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded",String(isOpen));
      return;
    }

    const link=event.target.closest(".premium-nav .nav-link, .premium-brand");
    if(link){
      const target=link.dataset.target;
      if(target)setActiveNav(target);
      closePremiumNav();
    }
  });

  window.addEventListener("hashchange",()=>{
    const target=location.hash.replace("#","")||"home";
    setActiveNav(target);
  });

  window.addEventListener("resize",()=>{
    if(window.innerWidth>860)closePremiumNav();
  });

  const initial=location.hash.replace("#","")||"home";
  setActiveNav(initial);
})();


/* Mobile viewport restore stability */
(function(){
  function stabilizeMobileLayout(){
    if(window.innerWidth > 860) return;

    const main=document.getElementById("home");
    if(!main) return;

    // Force a fresh layout calculation after mobile browser toolbar /
    // back-forward-cache viewport restoration.
    main.style.width="100%";
    void main.offsetWidth;

    requestAnimationFrame(()=>{
      main.style.width="";
      void document.documentElement.offsetWidth;
    });
  }

  window.addEventListener("pageshow",()=>{
    setTimeout(stabilizeMobileLayout,60);
    setTimeout(stabilizeMobileLayout,350);
  });

  window.addEventListener("orientationchange",()=>{
    setTimeout(stabilizeMobileLayout,250);
  });

  window.addEventListener("resize",()=>{
    clearTimeout(window.__myttMobileLayoutTimer);
    window.__myttMobileLayoutTimer=setTimeout(stabilizeMobileLayout,120);
  });
})();


/* Mobile fixed-nav state safety */
(function(){
  function resetMobileNavState(){
    if(window.innerWidth>860)return;
    const header=document.querySelector(".premium-header");
    const toggle=document.querySelector(".premium-mobile-toggle");
    if(!header||!toggle)return;

    header.classList.remove("nav-open");
    toggle.setAttribute("aria-expanded","false");
  }

  window.addEventListener("pageshow",()=>{
    setTimeout(resetMobileNavState,80);
  });
})();

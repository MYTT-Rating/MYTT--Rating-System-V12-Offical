(function () {
  "use strict";

  if (typeof TIERS !== "undefined" && Array.isArray(TIERS)) {
    const novice = TIERS.find(t => t.min === -Infinity) || {min:-Infinity,name:"Novice",icon:"🌿",cls:"tier-novice",badge:"novice-standalone.webp",next:1500};
    const FINAL_TIERS = [
      novice,
      {min:1500,name:"Rookie",icon:"🌱",cls:"tier-rookie",badge:"novice-standalone.webp",next:1600},
      {min:1600,name:"Challenger",icon:"⚔️",cls:"tier-challenger",badge:"rookie-standalone.webp",next:1700},
      {min:1700,name:"Elite",icon:"⭐",cls:"tier-elite",badge:"challenger-standalone.webp",next:1800},
      {min:1800,name:"Master",icon:"🔥",cls:"tier-master",badge:"elite-standalone.webp",next:1900},
      {min:1900,name:"Grandmaster",icon:"🔥",cls:"tier-grandmaster",badge:"master-standalone.webp",next:2000},
      {min:2000,name:"MYTT Champion",icon:"🏆",cls:"tier-champion",badge:"immortal-standalone.webp",next:2100},
      {min:2100,name:"Legend",icon:"👑",cls:"tier-legend",badge:"legend-standalone.webp",next:2200},
      {min:2200,name:"Immortal",icon:"🏆",cls:"tier-immortal",badge:"champion-standalone.webp",next:2300},
      {min:2300,name:"Hall of Fame",icon:"🌟",cls:"tier-hof",badge:"v22-hall-of-fame-mytt-final.webp",next:null}
    ];
    TIERS.splice(0, TIERS.length, ...FINAL_TIERS);
    window.MYTT_FINAL_TIERS = FINAL_TIERS;
  }

  const STRIP_PARTS = [
    "rank-badges/mytt-rank-road-v29.b64.00",
    "rank-badges/mytt-rank-road-v29.b64.01",
    "rank-badges/mytt-rank-road-v29.b64.02",
    "rank-badges/mytt-rank-road-v29.b64.03"
  ];

  /* Each badge is cropped from the exact approved artwork. No badge is redrawn. */
  const RANKS = [
    {name:"Rookie",score:1500,left:-23.148,color:"#d8dde4",line:"line-red"},
    {name:"Challenger",score:1600,left:-144.444,color:"#19f53a",line:"line-orange"},
    {name:"Elite",score:1700,left:-265.741,color:"#21c9ff",line:"line-gold"},
    {name:"Master",score:1800,left:-387.037,color:"#b55cff",line:"line-yellow"},
    {name:"Grandmaster",score:1900,left:-506.481,color:"#ff3131",line:"line-green"},
    {name:"MYTT Champion",score:2000,left:-626.852,color:"#ff2e8d",line:"line-cyan"},
    {name:"Legend",score:2100,left:-748.148,color:"#f0a81c",line:"line-purple"},
    {name:"Immortal",score:2200,left:-867.593,color:"#ffd51c",line:"line-pink"},
    {name:"Hall of Fame",score:2300,left:-987.963,color:"#ffd51c",line:null}
  ];
  const CROP_TOP = -38.889;
  let approvedStripPromise = null;

  function loadApprovedStrip(){
    if(!approvedStripPromise){
      approvedStripPromise=Promise.all(STRIP_PARTS.map(path=>fetch(path,{cache:"force-cache"}).then(res=>{
        if(!res.ok) throw new Error(`Unable to load ${path}`);
        return res.text();
      }))).then(parts=>`data:image/webp;base64,${parts.map(p=>p.trim()).join("")}`);
    }
    return approvedStripPromise;
  }

  function getHomepageRating(){
    const node=document.querySelector(".current-rating-v5 strong");
    const rating=Number(String(node?.textContent||"1500").replace(/[^0-9.-]/g,""));
    return Number.isFinite(rating)?rating:1500;
  }

  function getActiveRankIndex(){
    const rating=getHomepageRating();
    if(rating>=2300)return 8;
    return Math.max(0,Math.min(8,Math.floor((rating-1500)/100)));
  }

  function fixProgressCopy(){
    const current=document.querySelector(".current-rating-v5");
    if(current){const label=current.querySelector("span");if(label)label.textContent="Rookie";}
    const head=document.querySelector(".hero-progress-head");
    if(head){const labels=head.querySelectorAll("strong");if(labels[0])labels[0].textContent="Rookie";if(labels[1])labels[1].textContent="Challenger";}
    const note=document.querySelector(".hero-progress-card p");
    if(note)note.innerHTML="<b>1500</b> / 1600 · 100 pts to Challenger";
  }

  function buildRankNode(rank,index,src){
    const node=document.createElement("article");
    node.className="home-rank-native-node";
    node.dataset.rankIndex=String(index);
    node.style.setProperty("--rank-color",rank.color);
    node.setAttribute("aria-label",`${rank.name} ${rank.score}`);

    const shell=document.createElement("div");
    shell.className="home-rank-native-shell";

    const crop=document.createElement("div");
    crop.className="home-rank-native-crop";

    const img=document.createElement("img");
    img.className="home-rank-native-source";
    img.src=src;
    img.alt="";
    img.draggable=false;
    img.decoding="async";
    img.style.setProperty("--crop-left",`${rank.left}%`);
    img.style.setProperty("--crop-top",`${CROP_TOP}%`);

    crop.appendChild(img);
    shell.appendChild(crop);

    const name=document.createElement("span");
    name.className="home-rank-native-name";
    name.textContent=rank.name;

    const score=document.createElement("small");
    score.className="home-rank-native-score";
    score.textContent=String(rank.score);

    const marker=document.createElement("div");
    marker.className="home-rank-native-marker";
    marker.setAttribute("aria-hidden","true");
    marker.innerHTML='<b>▲</b><em>YOU ARE HERE</em>';

    node.append(shell,name,score,marker);
    return node;
  }

  function buildNativeRoad(road,src){
    road.className="homepage-rank-road mytt-native-rank-road-v35";
    road.setAttribute("aria-label","MYTT Rank Journey: Rookie 1500, Challenger 1600, Elite 1700, Master 1800, Grandmaster 1900, MYTT Champion 2000, Legend 2100, Immortal 2200, Hall of Fame 2300");
    road.replaceChildren();

    RANKS.forEach((rank,index)=>{
      road.appendChild(buildRankNode(rank,index,src));
      if(index<RANKS.length-1){
        const line=document.createElement("i");
        line.className=`home-rank-native-line ${rank.line}`;
        line.setAttribute("aria-hidden","true");
        road.appendChild(line);
      }
    });

    road.dataset.nativeRankRoad="v35";
  }

  function setActiveRank(road,index){
    const safe=Math.max(0,Math.min(RANKS.length-1,index));
    road.querySelectorAll(".home-rank-native-node").forEach((node,i)=>{
      const active=i===safe;
      node.classList.toggle("active",active);
      if(active)node.setAttribute("aria-current","true");else node.removeAttribute("aria-current");
    });
    road.dataset.activeRank=String(safe);
  }

  function nearestVisibleRank(road){
    const rr=road.getBoundingClientRect();
    const target=rr.left+rr.width/2;
    let best=0,bestDist=Infinity;
    road.querySelectorAll(".home-rank-native-node").forEach((node,i)=>{
      const nr=node.getBoundingClientRect();
      const d=Math.abs((nr.left+nr.width/2)-target);
      if(d<bestDist){bestDist=d;best=i;}
    });
    return best;
  }

  function centerRank(road,index,behavior="auto"){
    const node=road.querySelector(`.home-rank-native-node[data-rank-index="${index}"]`);
    if(!node)return;
    const target=node.offsetLeft-(road.clientWidth-node.offsetWidth)/2;
    road.scrollTo({left:Math.max(0,target),behavior});
  }

  function enableRankInteraction(road){
    if(!road||road.dataset.rankInteractionReady==="1")return;
    road.dataset.rankInteractionReady="1";

    let dragging=false,startX=0,startScrollLeft=0,raf=0;
    const sync=()=>{
      raf=0;
      if(window.matchMedia("(max-width: 768px)").matches){
        setActiveRank(road,nearestVisibleRank(road));
      }else{
        setActiveRank(road,getActiveRankIndex());
      }
    };
    const schedule=()=>{if(!raf)raf=requestAnimationFrame(sync);};

    road.addEventListener("scroll",schedule,{passive:true});
    window.addEventListener("resize",schedule,{passive:true});

    road.addEventListener("pointerdown",event=>{
      if(event.pointerType!=="mouse"||road.scrollWidth<=road.clientWidth)return;
      dragging=true;startX=event.clientX;startScrollLeft=road.scrollLeft;
      road.classList.add("is-dragging");road.setPointerCapture?.(event.pointerId);event.preventDefault();
    });
    road.addEventListener("pointermove",event=>{
      if(!dragging||event.pointerType!=="mouse")return;
      road.scrollLeft=startScrollLeft-(event.clientX-startX);event.preventDefault();
    });
    const stop=event=>{
      if(!dragging)return;
      dragging=false;road.classList.remove("is-dragging");
      if(event&&road.hasPointerCapture?.(event.pointerId))road.releasePointerCapture(event.pointerId);
      schedule();
    };
    road.addEventListener("pointerup",stop);road.addEventListener("pointercancel",stop);road.addEventListener("lostpointercapture",stop);

    setActiveRank(road,getActiveRankIndex());
    if(window.matchMedia("(max-width: 768px)").matches){
      requestAnimationFrame(()=>centerRank(road,getActiveRankIndex()));
    }
  }

  function installNativeRankJourney(){
    const road=document.querySelector(".homepage-rank-road");
    if(!road)return;
    road.classList.add("mytt-native-rank-loading");
    loadApprovedStrip().then(src=>{
      if(!road.isConnected)return;
      buildNativeRoad(road,src);
      road.classList.remove("mytt-native-rank-loading");
      enableRankInteraction(road);
    }).catch(err=>{
      console.error("Unable to load approved MYTT rank artwork",err);
      road.classList.remove("mytt-native-rank-loading");
    });
    fixProgressCopy();
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",installNativeRankJourney,{once:true});else installNativeRankJourney();
  window.addEventListener("pageshow",()=>{
    const road=document.querySelector(".homepage-rank-road");
    if(road&&road.dataset.nativeRankRoad!=="v35")installNativeRankJourney();
    else if(road)setActiveRank(road,window.matchMedia("(max-width: 768px)").matches?nearestVisibleRank(road):getActiveRankIndex());
    fixProgressCopy();
  });
})();

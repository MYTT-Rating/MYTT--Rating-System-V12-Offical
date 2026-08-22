(function(){
  "use strict";

  const LOCKED_RANKS = [
    {name:"Rookie",score:1500,badge:"novice-standalone.webp",color:"#d8dde4"},
    {name:"Elite",score:1600,badge:"challenger-standalone.webp",color:"#19f53a"},
    {name:"Challenger",score:1700,badge:"rookie-standalone.webp",color:"#21c9ff"},
    {name:"Master",score:1800,badge:"elite-standalone.webp",color:"#b55cff"},
    {name:"Grandmaster",score:1900,badge:"master-standalone.webp",color:"#ff3131"},
    {name:"MYTT Champion",score:2000,badge:"immortal-standalone.webp",color:"#ff2e8d"},
    {name:"Legend",score:2100,badge:"legend-standalone.webp",color:"#f0a81c"},
    {name:"Immortal",score:2200,badge:"2200-immortal-v50-clean.webp",color:"#ffd51c"},
    {name:"Hall of Fame",score:2300,badge:"2300-hall-of-fame-v50-clean.webp",color:"#ffd51c"}
  ];

  function badgeUrl(file){ return `rank-badges/${file}?v=20260822-lock54`; }

  function lockTierData(){
    if(typeof TIERS!=="undefined" && Array.isArray(TIERS)){
      LOCKED_RANKS.forEach(rank=>{
        const tier=TIERS.find(t=>Number(t.min)===rank.score);
        if(!tier)return;
        tier.name=rank.name;
        tier.badge=rank.badge;
      });
      window.MYTT_FINAL_TIERS=TIERS;
    }
  }

  function lockRoad(){
    const road=document.querySelector(".homepage-rank-road");
    if(!road)return;
    const nodes=[...road.querySelectorAll(".home-rank-native-node")];
    if(nodes.length<9)return;

    LOCKED_RANKS.forEach((rank,index)=>{
      const node=nodes[index];
      node.dataset.rankIndex=String(index);
      node.style.setProperty("--rank-color",rank.color);
      node.setAttribute("aria-label",`${rank.name} ${rank.score}`);

      const img=node.querySelector(".home-rank-native-badge");
      if(img){
        const wanted=badgeUrl(rank.badge);
        if(!img.src.endsWith(wanted)) img.src=wanted;
        img.alt=`${rank.name} badge`;
      }
      const name=node.querySelector(".home-rank-native-name");
      if(name)name.textContent=rank.name;
      const score=node.querySelector(".home-rank-native-score");
      if(score)score.textContent=String(rank.score);
    });

    road.setAttribute("aria-label","MYTT Rank Journey: Rookie 1500, Elite 1600, Challenger 1700, Master 1800, Grandmaster 1900, MYTT Champion 2000, Legend 2100, Immortal 2200, Hall of Fame 2300");
    road.dataset.rankDesignLocked="v54";
  }

  function lockProgressCopy(){
    const current=document.querySelector(".current-rating-v5");
    if(current){
      const label=current.querySelector("span");
      if(label)label.textContent="Rookie";
    }
    const head=document.querySelector(".hero-progress-head");
    if(head){
      const labels=head.querySelectorAll("strong");
      if(labels[0])labels[0].textContent="Rookie";
      if(labels[1])labels[1].textContent="Elite";
    }
    const note=document.querySelector(".hero-progress-card p");
    if(note)note.innerHTML="<b>1500</b> / 1600 · 100 pts to Elite";
  }

  function applyLock(){
    lockTierData();
    lockRoad();
    lockProgressCopy();
  }

  function scheduleLock(){
    applyLock();
    requestAnimationFrame(applyLock);
    setTimeout(applyLock,120);
    setTimeout(applyLock,500);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",scheduleLock,{once:true});
  else scheduleLock();
  window.addEventListener("pageshow",scheduleLock);

  const observer=new MutationObserver(()=>applyLock());
  observer.observe(document.documentElement,{childList:true,subtree:true});
})();

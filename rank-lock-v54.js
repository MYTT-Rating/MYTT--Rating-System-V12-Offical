(function(){
  "use strict";

  /* FINAL LOCK — exactly follows the approved reference image.
     Important: this file must stay finite/idempotent. No MutationObserver loop. */
  const LOCKED_RANKS = [
    {name:"Rookie",score:1500,badge:"novice-standalone.webp",color:"#d8dde4"},
    {name:"Challenger",score:1600,badge:"challenger-standalone.webp",color:"#19f53a"},
    {name:"Elite",score:1700,badge:"rookie-standalone.webp",color:"#21c9ff"},
    {name:"Master",score:1800,badge:"elite-standalone.webp",color:"#b55cff"},
    {name:"Grandmaster",score:1900,badge:"master-standalone.webp",color:"#ff3131"},
    {name:"MYTT Champion",score:2000,badge:"immortal-standalone.webp",color:"#ff2e8d"},
    {name:"Legend",score:2100,badge:"legend-standalone.webp",color:"#f0a81c"},
    {name:"Immortal",score:2200,badge:"2200-immortal-v50-clean.webp",color:"#ffd51c"},
    {name:"Hall of Fame",score:2300,badge:"2300-hall-of-fame-v50-clean.webp",color:"#ffd51c"}
  ];

  function badgeUrl(file){
    return `rank-badges/${file}?v=20260822-final-lock-v55`;
  }

  function setText(node,value){
    if(node && node.textContent!==value) node.textContent=value;
  }

  function setAttr(node,name,value){
    if(node && node.getAttribute(name)!==value) node.setAttribute(name,value);
  }

  function lockTierData(){
    if(typeof TIERS!=="undefined" && Array.isArray(TIERS)){
      LOCKED_RANKS.forEach(rank=>{
        const tier=TIERS.find(t=>Number(t.min)===rank.score);
        if(!tier)return;
        if(tier.name!==rank.name) tier.name=rank.name;
        if(tier.badge!==rank.badge) tier.badge=rank.badge;
      });
      window.MYTT_FINAL_TIERS=TIERS;
    }
  }

  function lockRoad(){
    const road=document.querySelector(".homepage-rank-road");
    if(!road)return false;

    const nodes=[...road.querySelectorAll(".home-rank-native-node")];
    if(nodes.length<9)return false;

    LOCKED_RANKS.forEach((rank,index)=>{
      const node=nodes[index];
      setAttr(node,"data-rank-index",String(index));
      if(node.style.getPropertyValue("--rank-color")!==rank.color){
        node.style.setProperty("--rank-color",rank.color);
      }
      setAttr(node,"aria-label",`${rank.name} ${rank.score}`);

      const img=node.querySelector(".home-rank-native-badge");
      if(img){
        const wanted=badgeUrl(rank.badge);
        setAttr(img,"src",wanted);
        setAttr(img,"alt",`${rank.name} badge`);
      }
      setText(node.querySelector(".home-rank-native-name"),rank.name);
      setText(node.querySelector(".home-rank-native-score"),String(rank.score));
    });

    setAttr(road,"aria-label","MYTT Rank Journey: Rookie 1500, Challenger 1600, Elite 1700, Master 1800, Grandmaster 1900, MYTT Champion 2000, Legend 2100, Immortal 2200, Hall of Fame 2300");
    setAttr(road,"data-rank-design-locked","final-reference-v55");
    return true;
  }

  function lockProgressCopy(){
    const current=document.querySelector(".current-rating-v5");
    if(current) setText(current.querySelector("span"),"Rookie");

    const head=document.querySelector(".hero-progress-head");
    if(head){
      const labels=head.querySelectorAll("strong");
      setText(labels[0],"Rookie");
      setText(labels[1],"Challenger");
    }

    const note=document.querySelector(".hero-progress-card p");
    if(note){
      const wanted="<b>1500</b> / 1600 · 100 pts to Challenger";
      if(note.innerHTML!==wanted) note.innerHTML=wanted;
    }
  }

  function applyLock(){
    lockTierData();
    lockRoad();
    lockProgressCopy();
  }

  function scheduleLock(){
    applyLock();
    requestAnimationFrame(applyLock);
    setTimeout(applyLock,80);
    setTimeout(applyLock,250);
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",scheduleLock,{once:true});
  }else{
    scheduleLock();
  }

  window.addEventListener("pageshow",scheduleLock,{passive:true});
})();

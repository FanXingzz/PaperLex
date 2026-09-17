const DAY=86400000;
export function memoryState(card,now=Date.now()){
 const stability=Math.max(1/144,card.stability||card.interval||1);
 const lastReviewed=card.lastReviewed??(card.interval?card.due-card.interval*DAY:card.created??now);
 const elapsed=Math.max(0,(now-lastReviewed)/DAY);
 return {stability,lastReviewed,elapsed,retention:Math.exp(Math.log(.9)*elapsed/stability),estimated:!card.lastReviewed};
}
export function intervalFor(stability,target=.9){return Math.max(1/144,Math.min(365,stability*Math.log(target)/Math.log(.9)));}
export function schedule(card,rating,now=Date.now(),target=.9){
 if(!['again','hard','good','easy'].includes(rating))throw Error('无效评分');
 if(!Number.isFinite(target)||target<.8||target>.97)throw Error('目标记忆率应在 80%–97%');
 const memory=memoryState(card,now);let ease=card.ease||2.5,reps=card.reps||0,stability=card.stability||card.interval||0;
 if(rating==='again')return {...card,reps:0,interval:0,stability:1/144,ease:Math.max(1.3,ease-.2),lastReviewed:now,lapses:(card.lapses||0)+1,due:now+600000,retentionTarget:target};
 if(rating==='hard'){ease=Math.max(1.3,ease-.15);stability=reps?Math.max(1,stability*1.2):1;}
 if(rating==='good')stability=reps===0?1:reps===1?3:stability*ease*(1+Math.max(0,.9-memory.retention)*.5);
 if(rating==='easy'){ease+=.15;stability=reps===0?4:Math.max(4,stability*ease*1.3);}
 stability=Math.round(stability*100)/100;const interval=Math.round(intervalFor(stability,target)*1000)/1000;
 return {...card,ease,reps:reps+1,stability,interval,lastReviewed:now,due:now+interval*DAY,retentionTarget:target};
}

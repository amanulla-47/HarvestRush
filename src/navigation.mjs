// Routing for the moving dots and their destination marker.
// Test the open interior of an obstacle; travelling along its boundary is allowed.
export function segmentClear(a,b,blocks) {
  return !blocks.some(r=>{
    let lo=0,hi=1;
    for(const [v,d,min,max] of [[a.x,b.x-a.x,r.left+1e-6,r.right-1e-6],[a.y,b.y-a.y,r.top+1e-6,r.bottom-1e-6]]){
      if(Math.abs(d)<1e-9){if(v<min||v>max)return false;}
      else{const t0=(min-v)/d,t1=(max-v)/d;lo=Math.max(lo,Math.min(t0,t1));hi=Math.min(hi,Math.max(t0,t1));if(lo>hi)return false;}
    }
    return hi>0&&lo<1&&lo<hi;
  });
}

export function groundRoute(start,target,blocks=[]) {
  if(!target)return [];
  const inside=(p,r)=>p.x>r.left&&p.x<r.right&&p.y>r.top&&p.y<r.bottom;
  // Keep a little clearance, except when Ravi already stands beside a wall.
  const padded=blocks.map(r=>{
    const p={left:r.left-12,right:r.right+12,top:r.top-12,bottom:r.bottom+12};
    return inside(start,p)||inside(target,p)?r:p;
  });
  if(segmentClear(start,target,padded))return [start,target];
  const nodes=[start,target];
  for(const r of padded)for(const x of [r.left-1,r.right+1])for(const y of [r.top-1,r.bottom+1]){
    const p={x,y};if(!padded.some(box=>inside(p,box)))nodes.push(p);
  }
  const costs=nodes.map(()=>Infinity),previous=nodes.map(()=>-1),done=new Set();costs[0]=0;
  while(done.size<nodes.length){
    let best=-1;
    for(let i=0;i<nodes.length;i++)if(!done.has(i)&&(best<0||costs[i]<costs[best]))best=i;
    if(best<0||!Number.isFinite(costs[best]))return [];
    if(best===1)break;done.add(best);
    for(let j=0;j<nodes.length;j++)if(!done.has(j)&&segmentClear(nodes[best],nodes[j],padded)){
      const next=costs[best]+Math.hypot(nodes[j].x-nodes[best].x,nodes[j].y-nodes[best].y);
      if(next<costs[j]){costs[j]=next;previous[j]=best;}
    }
  }
  const route=[];
  for(let i=1;i>=0;i=previous[i]){route.push(nodes[i]);if(i===0)break;}
  return route.reverse();
}

// Cyan dots travel toward the goal along each route segment.
export function flowingDots(points,time,spacing=70,speed=70) {
  if(points.length<2 || spacing<=0)return [];
  const segments=[];let total=0;
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);
    if(len>.01){segments.push({a,dx,dy,len,start:total});total+=len;}
  }
  const result=[],phase=((time*speed)%spacing+spacing)%spacing;
  let segment=0;
  const ease=v=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v);};
  for(let d=phase;d<total && result.length<64;d+=spacing){
    while(segment<segments.length-1 && d>segments[segment].start+segments[segment].len)segment++;
    const s=segments[segment],k=(d-s.start)/s.len;
    result.push({x:s.a.x+s.dx*k,y:s.a.y+s.dy*k,rotation:Math.atan2(s.dy,s.dx),alpha:.95*ease(d/(spacing*.55))*ease((total-d)/(spacing*.55))});
  }
  return result;
}

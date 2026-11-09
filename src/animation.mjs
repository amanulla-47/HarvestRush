// Visual motion only: input, collision, harvest timing and prices remain immediate.
export function updateHeroMotion(actor, input, speed, dt) {
  const moving = Math.min(1, Math.hypot(input.x, input.y));
  const blend = 1-Math.exp(-dt*(moving ? 18 : 22));
  actor.stride = (actor.stride ?? 0)+(moving-(actor.stride ?? 0))*blend;
  if(actor.stride<.015)actor.stride=0;
  if(moving)actor.bob += dt*12*moving*Math.min(1.35,speed/215);
  else actor.bob += (Math.round(actor.bob/Math.PI)*Math.PI-actor.bob)*(1-Math.exp(-dt*20));
  actor.turnT=Math.max(0,(actor.turnT||0)-dt);
  if(Math.abs(input.x)>.18){
    const face=input.x>0?1:-1;
    if(face!==actor.face){actor.face=face;actor.turnT=.12;}
  }
}

export function pickupPose(item, target) {
  const k=Math.max(0,Math.min(1,item.t));
  // Clear the soil first, then draw toward the basket without a tall looping arc.
  const lift=Math.min(1,k/.22),liftEase=lift*lift*(3-2*lift);
  const travel=Math.max(0,(k-.22)/.78),e=travel*travel*(3-2*travel);
  return {
    x:item.fx+(target.x-item.fx)*e,
    y:item.fy+item.fh-18*liftEase+(target.y-(item.fy+item.fh-18))*e-Math.sin(travel*Math.PI)*24,
    size:16+(1-e)*4,
    rotation:Math.sin(travel*Math.PI)*.14*(target.x<item.fx?-1:1),
    alpha:item.t<0?0:1
  };
}

export function salePose(flight) {
  const k=Math.max(0,Math.min(1,flight.t)),e=k*k*(3-2*k);
  return {x:flight.x+(flight.tx-flight.x)*e,
    y:flight.y+flight.h+(flight.ty+flight.th-flight.y-flight.h)*e-Math.sin(k*Math.PI)*42,
    size:20-4*e,rotation:Math.sin(k*Math.PI)*.22,alpha:k>.88?(1-k)/.12:1};
}

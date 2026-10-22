/* Shared image-based lighting. Neutral source images remain unchanged. */
let lightState=null, lightMap=null, aoMap=null, unlitFrame=null;
let shadowMaps=null, shadowKey='', lightKey='', silhouetteImages={};
function lightCanvas(){const c=document.createElement('canvas');c.width=W;c.height=H;return c}
function clampLight(v,a,b){return Math.max(a,Math.min(b,Number(v)))}
function setLighting(value){
  const spec=DATA.lighting;
  if(typeof value==='string'){
    const p=spec.presets[value];if(!p)return;
    lightState={...lightState,...p,preset:value,enabled:true,shadows:true};$('weather').value=p.weather;
  }else{
    lightState={...lightState,...value,preset:value.preset||'custom'};
    for(const [key,def]of Object.entries(spec.controls))if(def.min!==undefined)lightState[key]=clampLight(lightState[key],def.min,def.max);
  }
  for(const key of ['daylight','kelvin','sunElevation','candles','hearth']){
    $('light_'+key).value=lightState[key];
    $('value_'+key).textContent=Math.round(lightState[key])+(key==='kelvin'?' K':key==='sunElevation'?'°':'%');
  }
  $('lightPreset').value=lightState.preset;$('sharedLighting').checked=lightState.enabled;$('shadows').checked=lightState.shadows;
  lightKey='';shadowKey='';return {...lightState};
}
function initLighting(){
  lightState={...DATA.lighting.defaults,...DATA.lighting.presets[DATA.lighting.defaults.preset]};
  lightMap=lightCanvas();unlitFrame=lightCanvas();aoMap=lightCanvas();
  for(const id of Object.keys(imgs)){
    if(!DATA.objects.some(o=>o.asset===id)&&!DATA.static_props.some(o=>o.asset===id))continue;
    const im=imgs[id],c=document.createElement('canvas');c.width=im.width;c.height=im.height;
    const x=c.getContext('2d');x.drawImage(im,0,0);x.globalCompositeOperation='source-in';x.fillStyle='#000';x.fillRect(0,0,c.width,c.height);silhouetteImages[id]=c;
  }
  buildOcclusion();
  for(const key of ['daylight','kelvin','sunElevation','candles','hearth'])$('light_'+key).addEventListener('input',()=>setLighting({[key]:Number($('light_'+key).value)}));
  $('lightPreset').addEventListener('change',()=>setLighting($('lightPreset').value));
  $('sharedLighting').addEventListener('change',()=>setLighting({enabled:$('sharedLighting').checked}));
  $('shadows').addEventListener('change',()=>setLighting({shadows:$('shadows').checked}));
  $('weather').addEventListener('change',()=>setLighting($('weather').value==='night'?'night':$('weather').value==='rain'?'overcast':'daylight'));
  setLighting(DATA.lighting.defaults.preset);
}
function kelvinColor(k){
  const colors=[[2800,[255,170,100]],[4000,[255,213,170]],[5500,[236,237,239]],[6500,[203,224,255]],[8500,[167,201,255]]];
  for(let i=1;i<colors.length;i++)if(k<=colors[i][0]){const a=colors[i-1],b=colors[i],f=(k-a[0])/(b[0]-a[0]);return a[1].map((v,j)=>v+(b[1][j]-v)*f)}return colors.at(-1)[1];
}
function lightPool(c,x,y,r,color,strength,sx=1,sy=1){
  c.save();c.translate(x,y);c.scale(sx,sy);c.globalCompositeOperation='lighter';
  const rgb=color.map(v=>Math.round(v*strength)),g=c.createRadialGradient(0,0,0,0,0,r);
  g.addColorStop(0,`rgba(${rgb},1)`);g.addColorStop(.35,`rgba(${rgb},.72)`);g.addColorStop(.72,`rgba(${rgb},.2)`);g.addColorStop(1,`rgba(${rgb},0)`);
  c.fillStyle=g;c.fillRect(-r,-r,2*r,2*r);c.restore();
}
function ensureLightMap(){
  const key=JSON.stringify(lightState);if(key===lightKey)return lightMap;lightKey=key;
  const c=lightMap.getContext('2d'),d=lightState.daylight/100,w=lightState.candles/100,h=lightState.hearth/100,color=kelvinColor(lightState.kelvin);
  const ambient=DATA.lighting.ambient_gain;
  c.clearRect(0,0,W,H);c.fillStyle=`rgb(${ambient.base_rgb.map((v,i)=>Math.round(v+ambient.daylight_bounce_rgb[i]*d))})`;c.fillRect(0,0,W,H);
  for(const field of DATA.lighting.illumination_fields){const rgb=field.temperature_driven?color:field.color_rgb;lightPool(c,...field.center_scene,field.radius_px,rgb,field.gain*lightState[field.control]/100,...field.scale)}
  const patch=DATA.lighting.daylight_floor_patch;
  c.save();c.globalCompositeOperation='lighter';polyPath(c,patch.polygon_scene);c.clip();const g=c.createLinearGradient(...patch.gradient_scene[0],...patch.gradient_scene[1]);g.addColorStop(0,`rgba(${color.map(v=>Math.round(v*patch.gain*d*lightState.direct))},${patch.opacity_start})`);g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(0,450,W,574);c.restore();
  return lightMap;
}
function buildOcclusion(){
  const c=aoMap.getContext('2d');c.clearRect(0,0,W,H);
  for(const row of DATA.shelf_rows){const q=row.quad_scene;c.save();polyPath(c,q);c.clip();
    const top=Math.min(q[0][1],q[1][1]),bottom=Math.max(q[2][1],q[3][1]),g=c.createLinearGradient(0,top,0,bottom);
    g.addColorStop(0,'rgba(9,7,5,.23)');g.addColorStop(.35,'rgba(9,7,5,.035)');g.addColorStop(.85,'rgba(9,7,5,.025)');g.addColorStop(1,'rgba(9,7,5,.17)');c.fillStyle=g;c.fillRect(0,top,W,bottom-top);c.restore();
  }
  const rug=DATA.floor_props[0].quad_scene;c.save();c.strokeStyle='rgba(18,12,7,.19)';c.lineWidth=1.7;c.lineJoin='round';polyPath(c,rug);c.stroke();c.restore();
}
function receiverClip(c,id){polyPath(c,DATA.lighting.receivers[id].polygon_scene);c.clip()}
function cutOccluders(c,id){for(const poly of DATA.lighting.receivers[id].occluders_scene||[]){c.save();c.globalCompositeOperation='destination-out';polyPath(c,poly);c.fillStyle='#000';c.fill();c.restore()}}
function primaryShadowLight(base){
  const d=lightState.daylight/100;
  if(d>.16){return {dir:[1,.35],k:clampLight(DATA.lighting.shadow_projection.sun_length_coefficient/Math.tan(lightState.sunElevation*Math.PI/180),DATA.lighting.shadow_projection.sun_length_min,DATA.lighting.shadow_projection.sun_length_max),opacity:(DATA.lighting.shadow_projection.daylight_opacity_base+DATA.lighting.shadow_projection.daylight_direct_opacity*lightState.direct)*d,blur:lightState.softness};}
  const useHearth=lightState.hearth>=lightState.candles*.55,source=useHearth?[534,432]:[620,145],strength=(useHearth?lightState.hearth:lightState.candles)/100;
  const dx=base[0]-source[0],dy=(base[1]-source[1])*.25,len=Math.max(1,Math.hypot(dx,dy));
  return {dir:[dx/len,dy/len],k:useHearth?.20:.12,opacity:.13*strength,blur:useHearth?9:13};
}
function projectedShadow(c,o,base,rule,lift=0){
  const im=silhouetteImages[o.asset];if(!im)return;const t=o.transform,L=primaryShadowLight(base),k=L.k*(rule.height_scale||1),[dx,dy]=L.dir,slope=DATA.lighting.shadow_projection.floor_slope;
  c.save();receiverClip(c,rule.receiver);c.filter=`blur(${L.blur+(lift*.045)}px)`;c.globalAlpha=L.opacity*Math.max(.15,1-lift/240);
  c.transform(t.width/im.width,slope*t.width/im.width,-dx*k*t.height/im.height,-dy*k*t.height/im.height,t.x+dx*k*(base[1]-t.y),base[1]+dy*k*(base[1]-t.y)+slope*(t.x-base[0]));c.drawImage(im,0,0);c.restore();
}
function shadowVisibleObjects(){return $('objects').checked?objects.filter(o=>o.id!=='wizard'||$('wizard').checked):[]}
function ensureShadowMaps(){
  const key=JSON.stringify([lightState,$('furnishings').checked,$('objects').checked,$('wizard').checked,objects.map(o=>[o.id,o.transform.x,o.transform.y,o.z,o.support])]);
  if(key===shadowKey&&shadowMaps)return shadowMaps;shadowKey=key;shadowMaps={};
  for(const id of Object.keys(DATA.lighting.receivers)){shadowMaps[id]={contact:lightCanvas(),cast:lightCanvas()};}
  const addContact=(id,p,radius,opacity)=>{const c=shadowMaps[id].contact.getContext('2d');c.save();receiverClip(c,id);softShadow(c,p[0],p[1],radius[0],radius[1],opacity);c.restore()};
  if($('furnishings').checked){
    for(const row of DATA.lighting.static_contacts)for(const p of row.points_scene)addContact(row.receiver,p,row.radius_scene_px,row.opacity);
    for(const prop of DATA.static_props){const t=prop.transform;for(const [u,v]of prop.feet_uv)addContact('floor',[t.x+u*t.width,t.y+v*t.height],[12,3],.47);
      projectedShadow(shadowMaps.floor.cast.getContext('2d'),prop,[t.x+t.width*.55,t.y+t.height*.95],{receiver:'floor',height_scale:.8});}
    for(const p of DATA.lighting.static_cast_proxies){const c=shadowMaps[p.receiver].cast.getContext('2d'),base=p.polygon_scene[0],L=primaryShadowLight(base),offset=p.height_px*L.k;
      c.save();receiverClip(c,p.receiver);c.filter=`blur(${L.blur+4}px)`;c.globalAlpha=L.opacity*p.opacity*2.5;c.fillStyle='#000';polyPath(c,p.polygon_scene.map(([x,y])=>[x+L.dir[0]*offset,y+L.dir[1]*offset]));c.fill();c.restore();}
  }
  for(const o of shadowVisibleObjects()){
    const rule=DATA.lighting.object_rules[o.id];if(!rule)continue;
    let base=anchor(o,rule.contacts.at(-1)),lift=0;
    if(o.z>=100){
      if(!drag)continue;const saved=o.id===drag.o.id?drag.saved:drag.children.find(c=>c.child.id===o.id)?.saved;if(!saved)continue;
      const old=anchor(saved,rule.contacts.at(-1));lift=Math.max(0,saved.transform.y-o.transform.y);base=[base[0],old[1]];
      if(rule.receiver!=='table'||!inPoly(base,DATA.lighting.receivers.table.polygon_scene))continue;
    }else for(let i=0;i<rule.contacts.length;i++)addContact(rule.receiver,anchor(o,rule.contacts[i]),rule.radii?rule.radii[i]:rule.radius,rule.opacity);
    if(rule.cast)projectedShadow(shadowMaps[rule.receiver].cast.getContext('2d'),o,base,rule,lift);
  }
  for(const id of Object.keys(shadowMaps))for(const kind of ['contact','cast'])cutOccluders(shadowMaps[id][kind].getContext('2d'),id);
  return shadowMaps;
}
function drawReceiverShadows(c,id){if(!lightState.shadows)return;const m=ensureShadowMaps()[id];c.drawImage(m.cast,0,0);c.drawImage(m.contact,0,0)}
function drawExterior(c,ts){
  const d=lightState?.enabled?lightState.daylight/100:.72,weather=$('weather').value;
  c.clearRect(0,0,W,H);c.save();c.filter=lightState?.enabled?`brightness(${.17+1.18*d}) saturate(${.6+.4*d})`:'none';c.drawImage(imgs.outside_day,0,0,W,H);c.restore();
  if(weather==='night'||(lightState?.enabled&&d<.08)){c.fillStyle='rgba(6,16,42,.52)';c.fillRect(0,0,W,H)}
  if(lightState?.enabled&&lightState.kelvin<4500){c.fillStyle=`rgba(176,90,35,${(4500-lightState.kelvin)/1700*.18})`;c.fillRect(0,0,W,H)}
  if(weather==='rain'){
    c.fillStyle='rgba(41,60,74,.23)';c.fillRect(0,0,W,H);c.strokeStyle='rgba(203,220,227,.65)';c.lineWidth=1;c.beginPath();
    for(let i=0;i<100;i++){const x=(i*97+ts*.02)%W,y=(i*131+($('reduce').checked?0:ts*.25))%H;c.moveTo(x,y);c.lineTo(x-4,y+18)}c.stroke();
  }
}
function finishSharedLighting(){
  if(lightState.enabled){
    const u=unlitFrame.getContext('2d');u.clearRect(0,0,W,H);u.drawImage(interiorFrame,0,0);
    ctx.save();ctx.globalCompositeOperation='multiply';ctx.drawImage(ensureLightMap(),0,0);ctx.globalCompositeOperation='destination-in';ctx.drawImage(unlitFrame,0,0);ctx.restore();
  }
  viewCtx.drawImage(interiorFrame,0,0);
}
function exportLightingLayers(){
  const result={},m=ensureShadowMaps();
  for(const id of Object.keys(m))for(const kind of ['contact','cast'])result[`${id}-${kind}`]=m[id][kind].toDataURL('image/png');
  result['ambient-occlusion']=aoMap.toDataURL('image/png');result['illumination-map']=ensureLightMap().toDataURL('image/png');return result;
}

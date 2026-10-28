/* SAMGO TEST — repère de proximité SANS fond cartographique ni requête externe.
 * Le chauffeur reste au centre et les demandes approximatives sont
 * placées selon leur direction et leur distance à vol d'oiseau.
 * Ni adresse précise, ni GPS exact ne sont transmis à un fournisseur de carte.
 * Ne constitue jamais un itinéraire ni une disponibilité réelle.
 */
(function(){
 'use strict';
 const NS='http://www.w3.org/2000/svg';
 const RAD=Math.PI/180;
 const el=id=>document.getElementById(id);
 function svgNode(tag,attributes={},label=''){
  const n=document.createElementNS(NS,tag);
  for(const [k,v] of Object.entries(attributes))n.setAttribute(k,String(v));
  if(label)n.textContent=label;
  return n;
 }
 function circle(group,x,y,r,fill,stroke){
  const attrs={cx:x,cy:y,r,fill};
  if(stroke){attrs.stroke=stroke;attrs['stroke-width']=1.4;}
  group.append(svgNode('circle',attrs));
 }
 function bearing(lat1,lon1,lat2,lon2){
  const a=lat1*RAD,b=lat2*RAD;
  const delta=(((lon2-lon1+540)%360)-180)*RAD;
  return Math.atan2(Math.sin(delta)*Math.cos(b),
    Math.cos(a)*Math.sin(b)-Math.sin(a)*Math.cos(b)*Math.cos(delta));
 }
 function clear(){
  const container=el('sgNearbyMap');
  if(container)container.replaceChildren();
 }
 function render({center,requests,radius}={}){
  const container=el('sgNearbyMap');
  if(!container)return;
  container.replaceChildren();
  if(!center||!Array.isArray(requests)||!Number.isFinite(Number(radius))||Number(radius)<=0)return;
  const size=340,mid=170,outer=132,limit=Math.max(5,Math.min(50,Number(radius)));
  const svg=svgNode('svg',{
   viewBox:'0 0 340 340',role:'img',
   'aria-label':'Schéma directionnel de '+requests.length+' demande(s) fictive(s) à proximité ; distances à vol d\u2019oiseau, sans rues ni trajet',
   focusable:'false'
  });
  svg.style.width='100%';svg.style.height='auto';svg.style.display='block';
  circle(svg,mid,mid,outer,'#152b35','#647a7e');
  for(const k of [1/3,2/3]){
   circle(svg,mid,mid,outer*k,'none','#465e66');
  }
  const directions=[['N',mid,21],['E',mid+151,mid+4],['S',mid,mid+157],['O',19,mid+4]];
  for(const [label,x,y] of directions){
   svg.append(svgNode('text',{x,y,fill:'#cad7dc','font-size':12,
    'text-anchor':'middle','font-family':'Arial,sans-serif','font-weight':'700'},label));
  }
  svg.append(svgNode('line',{x1:mid,y1:mid-outer,x2:mid,y2:mid+outer,stroke:'#3e5964','stroke-dasharray':'3 7'}));
  svg.append(svgNode('line',{x1:mid-outer,y1:mid,x2:mid+outer,y2:mid,stroke:'#3e5964','stroke-dasharray':'3 7'}));
  circle(svg,mid,mid,9,'#90d5c4','#d3fff3');
  svg.append(svgNode('text',{x:mid,y:mid+25,fill:'#bff0e2','font-size':11,
   'text-anchor':'middle','font-family':'Arial,sans-serif'},'VOUS'));
  requests.slice(0,24).forEach((item,i)=>{
   const targetLat=Number(item.latitude_approx),targetLng=Number(item.longitude_approx);
   const distance=Number(item.approach);
   if(!Number.isFinite(targetLat)||!Number.isFinite(targetLng)||
      !Number.isFinite(distance)||distance>limit||distance<0)return;
   const angle=bearing(center.lat,center.lng,targetLat,targetLng);
   const r=Math.min(outer-11,Math.max(16,distance/limit*(outer-11)));
   const x=mid+Math.sin(angle)*r,y=mid-Math.cos(angle)*r;
   const group=svgNode('g');
   group.append(svgNode('title',{},'Demande de test n°'+(i+1)+' · environ '+Math.round(distance)+' km'));
   circle(group,x,y,10,'#f6c36b','#281d10');
   group.append(svgNode('text',{x,y:y+3.5,fill:'#18252d','font-size':10,
     'font-weight':'700','font-family':'Arial,sans-serif','text-anchor':'middle'},String(i+1)));
   svg.append(group);
  });
  container.append(svg);
 }
 window.sgProximityMap={render,clear,bearing};
})();

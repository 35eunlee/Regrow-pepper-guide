/* Re:Grow pilot: transparent solar geometry, local ray casting, and ridge regression.
 * Solar equations: NOAA GML, https://gml.noaa.gov/grad/solcalc/solareqns.PDF
 * Default surface, buildings and learning records are deliberately synthetic.
 */
(function (root) {
  'use strict';
  const RAD = Math.PI / 180, VERSION = '1.0.0', CULTIVAR = '칼라탄';
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  function validDate(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '') || Number(s.slice(0,4))<2000 || Number(s.slice(0,4))>2100) return false;
    const d = new Date(s + 'T12:00:00Z');
    return Number.isFinite(+d) && d.toISOString().slice(0, 10) === s;
  }
  function solarPosition(date, minutes, lat = 36.45, lon = 126.8) {
    if (!validDate(date) || ![minutes, lat, lon].every(Number.isFinite) || minutes<0 || minutes>=1440 || Math.abs(lat)>90 || Math.abs(lon)>180) throw Error('날짜와 좌표를 확인하세요.');
    const [y, m, day] = date.split('-').map(Number);
    const doy = (Date.UTC(y, m - 1, day) - Date.UTC(y, 0, 1)) / 86400000 + 1;
    const leap = new Date(Date.UTC(y, 1, 29)).getUTCDate() === 29;
    const g = 2 * Math.PI / (leap ? 366 : 365) * (doy - 1 + (minutes / 60 - 12) / 24);
    const eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2*g) - 0.040849 * Math.sin(2*g));
    const dec = 0.006918 - 0.399912*Math.cos(g) + 0.070257*Math.sin(g) - 0.006758*Math.cos(2*g) + 0.000907*Math.sin(2*g) - 0.002697*Math.cos(3*g) + 0.00148*Math.sin(3*g);
    const tst = ((minutes + eq + 4 * lon - 60 * 9) % 1440 + 1440) % 1440;
    const ha = (tst / 4 - 180) * RAD, phi = lat * RAD;
    const elev = Math.asin(clamp(Math.sin(phi)*Math.sin(dec) + Math.cos(phi)*Math.cos(dec)*Math.cos(ha), -1, 1));
    const azi = (Math.atan2(Math.sin(ha), Math.cos(ha)*Math.sin(phi)-Math.tan(dec)*Math.cos(phi)) / RAD + 180 + 360) % 360;
    return { elevation: elev / RAD, azimuth: azi, east: Math.sin(azi*RAD), north: Math.cos(azi*RAD) };
  }
  function demoScene() {
    const cols = 31, rows = 25, width = 300, depth = 240, elevations = [];
    for (let j=0;j<rows;j++) for (let i=0;i<cols;i++) {
      const x=i*10, y=j*10;
      elevations.push(+(81 + 0.018*x + 0.022*y + 28*Math.exp(-((x-38)**2/7000+(y-237)**2/3500)) + 16*Math.exp(-((x-290)**2/6500+(y-195)**2/6500))).toFixed(2));
    }
    return { version:1, name:'청양읍 가상 시험 필지', region:'충청남도 청양군 청양읍', cultivar:CULTIVAR,
      lat:36.45, lon:126.8, width, depth, cols, rows, elevations,
      provenance:{kind:'synthetic', title:'기능 시연용 합성 지형·건물', url:'', date:'', note:'실제 지번·건물·표고와 일치하지 않습니다.'},
      buildings:[{id:'B1',name:'농업 시설 ①',x:122,y:73,width:32,depth:25,height:9},{id:'B2',name:'농업 시설 ②',x:221,y:144,width:24,depth:21,height:6}],
      plots:[{id:'A',name:'A · 남서 시험구',x:72,y:74},{id:'B',name:'B · 시설 뒤 시험구',x:158,y:92},{id:'C',name:'C · 동쪽 시험구',x:238,y:183}] };
  }
  function elevation(scene,x,y) {
    x=clamp(x,0,scene.width);y=clamp(y,0,scene.depth);
    const gx=x/scene.width*(scene.cols-1),gy=y/scene.depth*(scene.rows-1),i=Math.min(scene.cols-2,Math.floor(gx)),j=Math.min(scene.rows-2,Math.floor(gy)),u=gx-i,v=gy-j;
    const a=scene.elevations[j*scene.cols+i],b=scene.elevations[j*scene.cols+i+1],c=scene.elevations[(j+1)*scene.cols+i],d=scene.elevations[(j+1)*scene.cols+i+1];
    return a*(1-u)*(1-v)+b*u*(1-v)+c*(1-u)*v+d*u*v;
  }
  function buildingAt(scene,x,y) { return scene.buildings.find(b=>b.height>0&&x>=b.x&&x<=b.x+b.width&&y>=b.y&&y<=b.y+b.depth); }
  function blocked(scene,point,sun,withBuildings=true) {
    if (sun.elevation<=0) return {blocked:true,reason:'night',name:'해가 지평선 아래에 있습니다.'};
    const ground=elevation(scene,point.x,point.y)+0.5,tan=Math.tan(sun.elevation*RAD);
    // Intersect building footprints analytically, including structures narrower than a ray step.
    let nearest=null;
    if(withBuildings)for(const b of scene.buildings){
      if(b.height<=0)continue;
      let enter=0,leave=Infinity,hit=true;
      for(const [origin,dir,min,max] of [[point.x,sun.east,b.x,b.x+b.width],[point.y,sun.north,b.y,b.y+b.depth]]){
        if(Math.abs(dir)<1e-10){if(origin<min||origin>max)hit=false;}
        else{const a=(min-origin)/dir,c=(max-origin)/dir;enter=Math.max(enter,Math.min(a,c));leave=Math.min(leave,Math.max(a,c));}
      }
      if(hit&&leave>=enter&&leave>0&&elevation(scene,b.x+b.width/2,b.y+b.depth/2)+b.height>ground+tan*enter&&(!nearest||enter<nearest.distance))nearest={blocked:true,reason:'building',name:b.name,distance:enter};
    }
    for (let distance=3;distance<=Math.hypot(scene.width,scene.depth);distance+=3) {
      const x=point.x+sun.east*distance,y=point.y+sun.north*distance;
      if (x<0||x>scene.width||y<0||y>scene.depth) break;
      const ray=ground+tan*distance,z=elevation(scene,x,y);
      if (z>ray+0.08) return {blocked:true,reason:'terrain',name:'지형',distance};
      if(nearest&&distance>=nearest.distance)return nearest;
    }
    return nearest||{blocked:false,reason:'sun',name:'직달광 가능'};
  }
  function terrainStats(scene,point) {
    const h=3,dx=(elevation(scene,point.x+h,point.y)-elevation(scene,point.x-h,point.y))/(2*h),dy=(elevation(scene,point.x,point.y+h)-elevation(scene,point.x,point.y-h))/(2*h);
    return {height:elevation(scene,point.x,point.y),slope:Math.atan(Math.hypot(dx,dy))/RAD,aspect:(Math.atan2(-dx,-dy)/RAD+360)%360};
  }
  function analyze(scene,point,date,step=15) {
    let open=0,direct=0,noBuildings=0;const bins=[];
    for(let t=0;t<1440;t+=step){const sun=solarPosition(date,t+step/2,scene.lat,scene.lon),r=blocked(scene,point,sun),r0=blocked(scene,point,sun,false);
      if(sun.elevation>0){open+=step;if(!r.blocked)direct+=step;if(!r0.blocked)noBuildings+=step;}
      bins.push({minute:t,elevation:sun.elevation,lit:!r.blocked,reason:r.reason});
    }
    return {direct:direct/60,open:open/60,noBuildings:noBuildings/60,buildingLoss:(noBuildings-direct)/60,terrainLoss:(open-noBuildings)/60,ratio:open?direct/open*100:0,bins,...terrainStats(scene,point)};
  }
  function validateScene(raw) {
    if(!raw||typeof raw!=='object')throw Error('장면 JSON 형식을 확인하세요.');
    const s=JSON.parse(JSON.stringify(raw));
    if(!Number.isInteger(s.cols)||!Number.isInteger(s.rows)||s.cols<2||s.rows<2||s.cols>81||s.rows>81||!Array.isArray(s.elevations)||s.elevations.length!==s.cols*s.rows||!s.elevations.every(v=>Number.isFinite(v)&&v>=-100&&v<9000))throw Error('표고 격자는 2~81행/열이며 모든 표고는 m 단위 숫자여야 합니다.');
    if(![s.width,s.depth].every(v=>Number.isFinite(v)&&v>=30&&v<=2000)||!Number.isFinite(s.lat)||!Number.isFinite(s.lon)||s.lat<36.30||s.lat>36.65||s.lon<126.6||s.lon>127.05)throw Error('현재 파일럿은 청양군 인근 좌표와 30~2,000m 장면만 지원합니다.');
    if(!s.provenance||!String(s.provenance.title||'').trim())throw Error('자료 출처 이름을 입력하세요.');
    s.provenance.kind=s.provenance.kind==='synthetic'?'synthetic':'uploaded';
    for(const k of ['title','url','date','note'])s.provenance[k]=String(s.provenance[k]||'').slice(0,400);
    s.name=String(s.name||'업로드 시험 필지').slice(0,60);s.cultivar=CULTIVAR;s.region='충청남도 청양군 청양읍';
    if(!Array.isArray(s.buildings)||s.buildings.length>30)throw Error('건물은 최대 30개까지 입력할 수 있습니다.');
    const ids=new Set();
    s.buildings.forEach((b,i)=>{if(![b.x,b.y,b.width,b.depth,b.height].every(Number.isFinite)||b.x<0||b.y<0||b.width<=0||b.depth<=0||b.x+b.width>s.width||b.y+b.depth>s.depth||b.height<0||b.height>100)throw Error('건물 좌표·크기·높이를 확인하세요.');b.id='B'+(i+1);b.name=String(b.name||b.id).slice(0,40);});
    if(!Array.isArray(s.plots)||!s.plots.length||s.plots.length>8)throw Error('시험구는 1~8개가 필요합니다.');
    s.plots.forEach((p,i)=>{if(![p.x,p.y].every(Number.isFinite)||p.x<0||p.y<0||p.x>s.width||p.y>s.depth)throw Error('시험구 좌표가 범위를 벗어났습니다.');p.id=String(p.id||i+1).slice(0,20);if(ids.has(p.id))throw Error('시험구 ID가 중복되었습니다.');ids.add(p.id);p.name=String(p.name||p.id).slice(0,40);if(buildingAt(s,p.x,p.y))throw Error('시험구가 건물 안에 있습니다. 건물 밖 재배 지점을 선택하세요.');});
    return s;
  }
  function demoRecords(){let seed=17;const rand=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};return Array.from({length:36},(_,i)=>{
    const min=12+rand()*9,max=min+7+rand()*9,sun=3.5+rand()*8,moisture=25+rand()*50,mean=(min+max)/2;
    const growth=2.1+0.41*sun+0.10*(mean-20)-0.04*Math.abs(moisture-52)+(rand()-.5)*1.4;
    return {date:new Date(Date.UTC(2026,3,1+i*4)).toISOString().slice(0,10),plotId:['A','B','C'][i%3],cultivar:CULTIVAR,region:'충청남도 청양군',area:'청양읍',min:+min.toFixed(1),max:+max.toFixed(1),sunHours:+sun.toFixed(2),moisture:+moisture.toFixed(1),growth7d:+growth.toFixed(2),source:'synthetic'};
  });}
  function validRecord(r){return r&&validDate(r.date)&&typeof r.plotId==='string'&&r.plotId.trim().length>0&&r.cultivar===CULTIVAR&&r.region==='충청남도 청양군'&&r.area==='청양읍'&&[r.min,r.max,r.sunHours,r.moisture,r.growth7d].every(v=>typeof v==='number'&&Number.isFinite(v))&&r.min>=-30&&r.max<=60&&r.min<=r.max&&r.sunHours>=0&&r.sunHours<=24&&r.moisture>=0&&r.moisture<=100&&r.growth7d>=0&&r.growth7d<=60;}
  const feature=r=>[(r.min+r.max)/2,r.max-r.min,r.sunHours,r.moisture];
  function solve(a,b){const n=b.length,m=a.map((r,i)=>[...r,b[i]]);for(let i=0;i<n;i++){let p=i;for(let j=i+1;j<n;j++)if(Math.abs(m[j][i])>Math.abs(m[p][i]))p=j;[m[i],m[p]]=[m[p],m[i]];if(Math.abs(m[i][i])<1e-9)throw Error('학습 자료에 변화가 부족합니다.');const pivot=m[i][i];for(let k=i;k<=n;k++)m[i][k]/=pivot;for(let j=0;j<n;j++){if(j===i)continue;const f=m[j][i];for(let k=i;k<=n;k++)m[j][k]-=f*m[i][k];}}return m.map(r=>r[n]);}
  function fit(records,lambda=1.2){const xs=records.map(feature),mean=xs[0].map((_,j)=>xs.reduce((s,r)=>s+r[j],0)/xs.length),scale=mean.map((m,j)=>Math.sqrt(xs.reduce((s,r)=>s+(r[j]-m)**2,0)/xs.length)||1);const x=xs.map(r=>[1,...r.map((v,j)=>(v-mean[j])/scale[j])]),n=5,a=Array.from({length:n},()=>Array(n).fill(0)),b=Array(n).fill(0);x.forEach((r,i)=>{for(let j=0;j<n;j++){b[j]+=r[j]*records[i].growth7d;for(let k=0;k<n;k++)a[j][k]+=r[j]*r[k];}});for(let j=1;j<n;j++)a[j][j]+=lambda;const beta=solve(a,b);return {mean,scale,beta,ranges:mean.map((_,j)=>[Math.min(...xs.map(r=>r[j])),Math.max(...xs.map(r=>r[j]))])};}
  function predict(model,input){const x=feature(input),contributions=x.map((v,j)=>model.beta[j+1]*(v-model.mean[j])/model.scale[j]);return {value:Math.max(0,model.beta[0]+contributions.reduce((a,b)=>a+b,0)),baseline:model.beta[0],contributions,outOfDomain:x.some((v,j)=>v<model.ranges[j][0]||v>model.ranges[j][1])};}
  function train(records){const rows=records.filter(validRecord).slice().sort((a,b)=>a.date.localeCompare(b.date));if(rows.length<12)return {ready:false,count:rows.length,needed:12};const split=Math.floor(rows.length*.75),test=rows.slice(split),validationModel=fit(rows.slice(0,split));const errors=test.map(r=>predict(validationModel,r).value-r.growth7d);return {ready:true,count:rows.length,trainCount:split,testCount:test.length,mae:errors.reduce((a,b)=>a+Math.abs(b),0)/errors.length,rmse:Math.sqrt(errors.reduce((a,b)=>a+b*b,0)/errors.length),model:fit(rows),validation:'날짜순 앞 75% 학습 / 뒤 25% 보류 검증'};}
  function recordsFromDaily(logs){const rows=Object.entries(logs||{}).map(([date,r])=>({date,...r})).filter(r=>validDate(r.date)&&r.cultivar===CULTIVAR&&r.region==='충청남도 청양군'&&r.area==='청양읍'&&r.pilotPlot&&typeof r.heightCm==='number'&&Number.isFinite(r.heightCm));const out=[];for(const a of rows){const date=new Date(a.date+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+7);const b=rows.find(r=>r.date===date.toISOString().slice(0,10)&&r.pilotPlot===a.pilotPlot&&r.area===a.area&&r.region===a.region);if(!b||b.heightCm<a.heightCm)continue;const period=rows.filter(r=>r.date>=a.date&&r.date<b.date&&r.pilotPlot===a.pilotPlot&&r.area===a.area&&r.region===a.region);const enough=period.filter(r=>[r.min,r.max,r.sunHours,r.moisture].every(v=>typeof v==='number'&&Number.isFinite(v)));if(enough.length<4)continue;const avg=k=>enough.reduce((s,r)=>s+r[k],0)/enough.length;out.push({date:b.date,plotId:a.pilotPlot,cultivar:CULTIVAR,region:a.region,area:a.area,min:avg('min'),max:avg('max'),sunHours:avg('sunHours'),moisture:avg('moisture'),growth7d:b.heightCm-a.heightCm,source:'daily'});}return out;}
  const api={VERSION,CULTIVAR,clamp,validDate,solarPosition,demoScene,elevation,buildingAt,blocked,terrainStats,analyze,validateScene,demoRecords,validRecord,feature,fit,predict,train,recordsFromDaily};
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.RegrowPilotEngine=api;
})(typeof window==='undefined'?globalThis:window);

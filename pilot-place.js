/* Named pilot location. OSM geometry and KMA forecasts are loaded only from
 * their public endpoints; missing heights/elevations are never invented. */
(function(root){
  'use strict';
  const E=root.RegrowPilotEngine, LOCATION={name:'청양군농업기술센터 일대',address:'충남 청양군 청양읍 구봉로 1026-84',lat:36.42328,lon:126.7794,way:1391301181};
  const KMA='https://www.kma.go.kr/wid/queryDFSRSS.jsp?zone=4479025000';
  const WIDGET='https://www.weather.go.kr/weather/special/api/iframe/dfs.jsp?myPointCode=4479025000&showMidterm=N&showSrt=Y&showVsrt=N';
  let buildingsPromise=null,weatherPromise=null;const images=new Map();
  function placeholder(){return {version:1,name:LOCATION.name,region:'충청남도 청양군 청양읍',cultivar:E.CULTIVAR,lat:LOCATION.lat,lon:LOCATION.lon,width:340,depth:260,cols:2,rows:2,elevations:[0,0,0,0],terrainKind:'unavailable',buildings:[],plots:[{id:'A',name:'센터 서쪽 비교점',x:65,y:100},{id:'B',name:'센터 동쪽 비교점',x:245,y:105},{id:'C',name:'센터 북쪽 비교점',x:170,y:210}],provenance:{kind:'osm',title:'청양군농업기술센터 일대 · OpenStreetMap',url:'https://www.openstreetmap.org/way/'+LOCATION.way,date:'',coverage:'pending',note:'도로·건물은 지도 원문. 높이 미확인 건물은 계산 제외. 지형 표고 미연결로 평지 가정.'}};}
  const metresLon=lat=>111320*Math.cos(lat*Math.PI/180);
  function local(scene,lat,lon){return [(lon-scene.lon)*metresLon(scene.lat)+scene.width/2,(lat-scene.lat)*111320+scene.depth/2];}
  function geographic(scene,x,y){return {lat:scene.lat+(y-scene.depth/2)/111320,lon:scene.lon+(x-scene.width/2)/metresLon(scene.lat)};}
  function parseBuildings(json,coverage='nearby-buildings'){
    if(!Array.isArray(json?.elements))throw Error('건물 자료 형식이 다릅니다.');
    const scene=placeholder(),nodes=new Map(json.elements.filter(e=>e.type==='node').map(e=>[e.id,{lat:e.lat,lon:e.lon}]));
    for(const way of json.elements){if(way.type!=='way'||!way.tags?.building)continue;const coords=way.geometry||(way.nodes||[]).map(id=>nodes.get(id));if(coords.length<4||coords.some(p=>!p||!Number.isFinite(p.lat)||!Number.isFinite(p.lon)))continue;
      const polygon=coords.map(p=>local(scene,p.lat,p.lon));if(polygon.some(p=>p[0]<0||p[1]<0||p[0]>scene.width||p[1]>scene.depth))continue;
      const xs=polygon.map(p=>p[0]),ys=polygon.map(p=>p[1]),raw=String(way.tags.height||'').trim(),height=/^\d+(\.\d+)?\s*m?$/.test(raw)?parseFloat(raw):null;
      scene.buildings.push({id:'B'+(scene.buildings.length+1),name:String(way.tags.name||'지도 건물 '+(scene.buildings.length+1)).slice(0,40),x:Math.min(...xs),y:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),depth:Math.max(...ys)-Math.min(...ys),height:height>0&&height<=100?height:null,heightSource:height>0&&height<=100?'osm_height':'unknown',footprint:polygon,osmId:way.id});if(scene.buildings.length>=30)break;
    }
    if(!scene.buildings.length)throw Error('이 범위의 건물 도형을 가져오지 못했습니다.');
    // Probes are comparison points, not claims about cultivated parcels.
    for(const p of scene.plots){if(E.buildingAt(scene,p.x,p.y)){let found=false;for(let r=10;r<=80&&!found;r+=10)for(const [dx,dy] of [[r,0],[-r,0],[0,r],[0,-r]]){const x=E.clamp(p.x+dx,5,scene.width-5),y=E.clamp(p.y+dy,5,scene.depth-5);if(!E.buildingAt(scene,x,y)){p.x=x;p.y=y;found=true;break;}}}}
    scene.provenance.date=new Date().toISOString();scene.provenance.coverage=coverage;return E.validateScene(scene);
  }
  function cacheRead(key,ttl){try{const x=JSON.parse(localStorage.getItem(key)||'null');return x&&Date.now()-x.saved<ttl?x.value:null;}catch{return null;}}
  function cacheWrite(key,value){try{localStorage.setItem(key,JSON.stringify({saved:Date.now(),value}));}catch{}}
  async function request(url){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);try{const r=await fetch(url,{signal:controller.signal,credentials:'omit'});if(!r.ok)throw Error('자료 연결 '+r.status);return r;}finally{clearTimeout(timer);}}
  function loadBuildings(){if(buildingsPromise)return buildingsPromise;buildingsPromise=(async()=>{const cached=cacheRead('rg-osm-center-v1',86400000);if(cached)return E.validateScene(cached);const s=placeholder(),sw=geographic(s,0,0),ne=geographic(s,s.width,s.depth),query=`[out:json][timeout:8];way[building](${sw.lat},${sw.lon},${ne.lat},${ne.lon});out geom;`;let scene;try{scene=parseBuildings(await(await request('https://overpass-api.de/api/interpreter?data='+encodeURIComponent(query))).json());}catch{scene=parseBuildings(await(await request('https://www.openstreetmap.org/api/0.6/way/'+LOCATION.way+'/full.json')).json(),'main-building-only');}cacheWrite('rg-osm-center-v1',scene);return scene;})();return buildingsPromise;}
  function parseForecast(xml){const doc=new DOMParser().parseFromString(xml,'text/xml');if(doc.querySelector('parsererror'))throw Error('기상청 자료 형식 오류');const published=doc.querySelector('pubDate')?.textContent,base=new Date(published);if(!Number.isFinite(+base)||Date.now()-base.getTime()>86400000)throw Error('최신 예보를 확인할 수 없습니다.');const kst=new Date(base.getTime()+9*3600000),date=Date.UTC(kst.getUTCFullYear(),kst.getUTCMonth(),kst.getUTCDate());const rows=Array.from(doc.querySelectorAll('body data')).map(n=>{const read=k=>n.querySelector(k)?.textContent;if(['hour','day','temp'].some(k=>read(k)===undefined||read(k)===null||read(k).trim()===''))return null;let hour=Number(read('hour')),day=Number(read('day')),temp=Number(read('temp'));if(!Number.isFinite(temp)||temp<-60||temp>60||!Number.isFinite(day)||!Number.isFinite(hour))return null;const time=new Date(date+(day*24+hour)*3600000).toISOString().slice(0,16);return {time,temp};}).filter(Boolean);if(!rows.length)throw Error('시간별 기온 없음');return {published,rows,source:'기상청 동네예보 RSS'};}
  function loadWeather(){if(weatherPromise)return weatherPromise;weatherPromise=(async()=>{const cached=cacheRead('rg-kma-center-v1',1800000);if(cached)return cached;const w=parseForecast(await(await request(KMA)).text());cacheWrite('rg-kma-center-v1',w);return w;})();return weatherPromise;}
  function temperatureAt(weather,date,minute){if(!weather?.rows)return null;const target=Date.parse(date+'T00:00:00Z')+minute*60000;const row=weather.rows.slice().sort((a,b)=>Math.abs(Date.parse(a.time+'Z')-target)-Math.abs(Date.parse(b.time+'Z')-target))[0];return row&&Math.abs(Date.parse(row.time+'Z')-target)<=90*60000?row:null;}
  function ready(scene){return scene.provenance.kind!=='osm'||scene.buildings.length>0&&scene.buildings.every(b=>Number.isFinite(b.height)&&b.height>0);}
  const merc=(lat,lon,z)=>{const n=2**z,phi=lat*Math.PI/180;return {x:(lon+180)/360*n*256,y:(1-Math.asinh(Math.tan(phi))/Math.PI)/2*n*256};};
  function drawBasemap(g,scene,rect,onLoad,style='street'){if(typeof Image==='undefined')return false;const z=scene.width>900?16:scene.width<180?18:17,sw=geographic(scene,0,0),ne=geographic(scene,scene.width,scene.depth),a=merc(ne.lat,sw.lon,z),b=merc(sw.lat,ne.lon,z),sx=rect.w/(b.x-a.x),sy=rect.h/(b.y-a.y);let loaded=false;
    for(let x=Math.floor(a.x/256);x<=Math.floor(b.x/256);x++)for(let y=Math.floor(a.y/256);y<=Math.floor(b.y/256);y++){const key=style+'/'+z+'/'+x+'/'+y;let img=images.get(key);if(!img){img=new Image();img.referrerPolicy='strict-origin-when-cross-origin';img.onload=()=>onLoad?.();img.onerror=()=>{img.failed=true;onLoad?.();};img.src=style==='imagery'?'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/'+z+'/'+y+'/'+x:'https://tile.openstreetmap.org/'+z+'/'+x+'/'+y+'.png';images.set(key,img);}if(img.complete&&img.naturalWidth){g.drawImage(img,rect.pad+(x*256-a.x)*sx,rect.pad+(y*256-a.y)*sy,256*sx,256*sy);loaded=true;}}
    return loaded;
  }
  const basemapFailed=(style='street')=>{const rows=Array.from(images).filter(([k])=>k.startsWith(style+'/')).map(([,v])=>v);return rows.length>0&&rows.every(i=>i.failed);};
  const api={LOCATION,KMA,WIDGET,placeholder,local,geographic,parseBuildings,loadBuildings,loadWeather,parseForecast,temperatureAt,ready,drawBasemap,basemapFailed};if(typeof module==='object'&&module.exports)module.exports=api;root.RegrowPilotPlace=api;
})(typeof window==='undefined'?globalThis:window);

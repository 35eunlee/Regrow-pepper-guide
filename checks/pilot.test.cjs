const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const E=require('../pilot-engine.js');

const flat=()=>({...E.demoScene(),elevations:E.demoScene().elevations.map(()=>80),buildings:[]});
test('solar position respects KST, seasons, cardinal directions, and night',()=>{
  const noon=E.solarPosition('2027-06-21',12*60+35,36.45,126.8);
  assert(noon.elevation>75&&noon.elevation<79);
  assert(Math.abs(noon.azimuth-180)<8);
  assert(E.solarPosition('2027-06-21',540).azimuth<180);
  assert(E.solarPosition('2027-06-21',960).azimuth>180);
  assert(E.solarPosition('2027-06-21',0).elevation<0);
  assert(E.solarPosition('2027-12-21',755).elevation<35);
  assert(E.validDate('2028-02-29'));assert(!E.validDate('2027-02-29'));
});
test('ray casting changes only when an actual geometric obstruction crosses the sun ray',()=>{
  const s=flat(),p={x:150,y:170},sun={elevation:30,east:0,north:-1};
  assert.equal(E.blocked(s,p,sun).blocked,false);
  s.buildings=[{id:'wall',name:'test wall',x:130,y:120,width:40,depth:20,height:30}];
  assert.equal(E.blocked(s,p,sun).reason,'building');
  assert.equal(E.blocked(s,p,sun,false).blocked,false);
  s.buildings[0].height=0;assert.equal(E.blocked(s,p,sun).blocked,false);
  s.buildings=[{id:'thin',name:'narrow wall',x:140,y:150.2,width:20,depth:.3,height:30}];
  assert.equal(E.blocked(s,p,sun).reason,'building');
  s.buildings=[];
  s.elevations=s.elevations.map((_,i)=>Math.floor(i/s.cols)<10?130:80);
  assert.equal(E.blocked(s,p,sun).reason,'terrain');
});
test('daily sunlight conserves minutes, and counterfactual removal cannot reduce exposure',()=>{
  const s=flat(),p={x:158,y:92},day='2027-05-20';
  const a=E.analyze(s,p,day);assert.equal(a.direct,a.open);assert.equal(a.buildingLoss,0);
  const scene=E.demoScene(),b=E.analyze(scene,scene.plots[1],day);
  assert(b.buildingLoss>2);assert(b.direct>=0&&b.direct<=b.noBuildings&&b.noBuildings<=b.open);
  assert(Math.abs(b.direct+b.buildingLoss+b.terrainLoss-b.open)<1e-8);
  scene.buildings.forEach(x=>x.height=0);const c=E.analyze(scene,scene.plots[1],day);
  assert(c.direct>=b.direct);assert.equal(c.buildingLoss,0);
});
test('GIS imports enforce pilot bounds, source metadata, grid size, and obstacle safety',()=>{
  const s=E.demoScene();assert.equal(E.validateScene(s).cols,31);
  const copy=()=>JSON.parse(JSON.stringify(s));
  let x=copy();x.elevations.pop();assert.throws(()=>E.validateScene(x));
  x=copy();x.provenance.title='';assert.throws(()=>E.validateScene(x));
  x=copy();x.lat=37.6;assert.throws(()=>E.validateScene(x));
  x=copy();x.buildings[0].height=101;assert.throws(()=>E.validateScene(x));
  x=copy();x.provenance.kind='verified';assert.equal(E.validateScene(x).provenance.kind,'uploaded');
  assert(Number.isFinite(E.elevation(s,300,240)));assert(Number.isFinite(E.terrainStats(s,{x:0,y:0}).slope));
});
test('ridge learning uses time-held-out validation and declines insufficient data',()=>{
  const rows=E.demoRecords(),t=E.train(rows);
  assert.deepEqual(rows,E.demoRecords());assert.equal(t.count,36);assert.equal(t.testCount,9);
  assert(t.mae<1);assert.equal(E.train(rows.slice(0,11)).ready,false);
  const a={min:15,max:27,sunHours:5,moisture:52},b={...a,sunHours:9};
  assert(E.predict(t.model,b).value>E.predict(t.model,a).value);
  assert(E.predict(t.model,{...a,sunHours:24}).outOfDomain);
  assert(!E.validRecord({...rows[0],cultivar:'다른 품종'}));
  assert(!E.validRecord({...rows[0],area:'다른 읍'}));
  assert(!E.validRecord({...rows[0],growth7d:NaN}));
});
test('diary bridge needs exact seven-day pairs, at least four measured days, and the pilot scope',()=>{
  const logs={};for(let i=0;i<9;i++){let date='2027-05-'+String(10+i).padStart(2,'0');logs[date]={region:'충청남도 청양군',area:'청양읍',cultivar:'칼라탄',pilotPlot:'B',heightCm:20+i,min:15,max:27,sunHours:7,moisture:51};}
  const r=E.recordsFromDaily(logs);assert.equal(r.length,2);assert.equal(r[0].growth7d,7);
  const other=structuredClone(logs);Object.values(other).forEach(x=>x.area='운곡면');assert.equal(E.recordsFromDaily(other).length,0);
  const missing=structuredClone(logs);Object.values(missing).slice(0,7).forEach(x=>x.sunHours=null);assert.equal(E.recordsFromDaily(missing).length,0);
});
test('UI renders and draws, responds to time/plot controls, switches modes, and escapes labels',()=>{
  const saved=new Map(),events={},root={innerHTML:''},clock={textContent:''};let drawCalls=0;
  const graphics=new Proxy({},{get:()=>()=>{drawCalls++;}});
  const canvas={clientWidth:640,clientHeight:430,getContext:()=>graphics,getBoundingClientRect:()=>({left:0,top:0}),focus:()=>{}};
  const scene=E.demoScene();scene.provenance.title='<img src=x onerror=alert(1)>';
  saved.set('rg-pilot-v1',JSON.stringify({version:1,scene}));
  const context={console,RegrowPilotEngine:E,localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)},document:{getElementById:id=>id==='pfScene'?canvas:id==='pilotRoot'?root:id==='pfClock'?clock:null,addEventListener:(k,f)=>events[k]=f},addEventListener:()=>{},cancelAnimationFrame:()=>{},requestAnimationFrame:()=>1,setTimeout:()=>0,Date,Math,JSON,Blob,URL};context.window=context;
  vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../pilot-ui.js'),'utf8'),context);
  const P=context.RegrowPilot;
  let html=P.page({logs:{}});P.mount({logs:{}});
  assert(drawCalls>100);
  events.input({target:{id:'pfTime',value:'540',dataset:{},closest:()=>root}});assert.equal(clock.textContent,'09:00');
  assert(html.includes('pfScene'));assert(!html.includes('<img src=x'));assert(html.includes('&lt;img src=x'));
  const click=dataset=>events.click({target:{closest:selector=>selector==='#pilotRoot'?{}:selector==='button'?{dataset,hasAttribute:()=>false}:null}});
  click({pfLayer:'hours'});assert(drawCalls>1000);click({pfPlot:'A'});html=P.page({logs:{}});assert(html.includes('A · 남서 시험구'));
  click({pfTab:'growth'});html=P.page({logs:{}});assert(html.includes('pfScenarioForm'));assert(html.includes('합성 데이터로 보는 동작 예시'));
  click({pfMode:'field'});html=P.page({logs:{}});assert(html.includes('0 / 12건'));assert(!html.includes('pf-growth-number'));
  click({pfTab:'trust'});html=P.page({logs:{}});assert(html.includes('협력 제안 대상 · 협의 전'));assert(html.includes('fieldData')===false);
});

test('existing site loads the new route in its actual script order and keeps diary controls',()=>{
  const elements=new Map(),events={};const element=()=>({value:'',style:{},dataset:{},innerHTML:'',textContent:'',classList:{toggle:()=>{},add:()=>{},remove:()=>{}},setAttribute:()=>{},addEventListener:()=>{},showModal:()=>{},close:()=>{}});
  const get=s=>{if(!elements.has(s))elements.set(s,element());return elements.get(s);};
  const context={console,localStorage:{getItem:()=>null,setItem:()=>{}},document:{querySelector:get,querySelectorAll:()=>[],getElementById:()=>null,body:{classList:{toggle:()=>{}}},documentElement:{style:{}},addEventListener:(k,f)=>events[k]=f},location:{hash:'#pilot'},addEventListener:()=>{},scrollTo:()=>{},cancelAnimationFrame:()=>{},requestAnimationFrame:()=>1,setTimeout:()=>0,clearTimeout:()=>{},Date,Math,JSON,Blob,URL,navigator:{}};context.window=context;context.globalThis=context;vm.createContext(context);
  for(const file of ['regions.js','pilot-engine.js','pilot-ui.js','app.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context,{filename:file});
  assert(get('#app').innerHTML.includes('pilotRoot'));assert(get('#app').innerHTML.includes('시간을 움직여 그늘을 보세요'));
  const calendar=vm.runInContext('weekCalendar()',context);
  for(const id of ['dayPilotPlot','dayHeight','daySunHours','dayMoisture'])assert(calendar.includes(id));
});

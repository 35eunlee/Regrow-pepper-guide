const test=require('node:test'),assert=require('node:assert/strict'),A=require('../material-advisor.js');
const now=new Date('2026-11-16T12:00:00Z'),farm={region:'충청남도 청양군',area:'청양읍',env:'노지',stage:'육묘 중'},log=(extra={})=>({...farm,note:'',min:'',max:'',...extra});
test('substrate criteria use current-farm observations and do not convert water frequency into a diagnosis',()=>{
 const base=A.analyze({farm,logs:{'2026-11-15':log({irrigation:'more'})}}, {},now);assert.equal(base.substrate.id,'balanced');assert(base.evidence.some(e=>e.text.includes('평소보다 많이 준 날')));
 const wet=A.analyze({farm,logs:{'2026-11-15':log({soil:'wet'}),'2026-11-14':log({soil:'wet'}),'2026-11-16':log({area:'운곡면',soil:'dry'}),'2026-11-17':log({soil:'dry'})}}, {},now);assert.equal(wet.substrate.id,'drainage');assert.equal(wet.recordCount,2);assert(wet.evidence.some(e=>e.text.includes('물 고임을 기록한 날 2일')));assert(!wet.substrate.reason.includes('과습으로 확정'));
 const dry=A.analyze({farm,logs:{'2026-11-15':log({soil:'dry'})}}, {},now);assert.equal(dry.substrate.id,'moisture');
 const old=A.analyze({farm,logs:{'2026-09-15':log({soil:'wet'})}}, {},now);assert.equal(old.substrate.id,'balanced');
});
test('follow-up evidence is included without importing another farm history',()=>{
 const a=A.analyze({farm,interviews:[{date:'2026-11-16',answers:{soil:'wet'},farmKey:'충청남도 청양군|청양읍|노지'},{date:'2026-11-16',answers:{soil:'dry'},farmKey:'다른 농장'}]}, {},now);assert.equal(a.substrate.id,'drainage');
});
test('post-transplant users are asked about substrate use before any comparison search is presented',()=>{
 const context={farm:{...farm,stage:'수확 중'}};assert.equal(A.analyze(context,{},now).needsMediaUse,true);assert.equal(A.analyze(context,{},now).substrate.id,'ask-use');assert.equal(A.analyze(context,{mediaUse:'next'},now).needsMediaUse,false);
});
test('seed advice requires purpose and heat, reuses matching search history, and keeps disease resistance unconfirmed',()=>{
 const history=[{region:'경상남도 밀양시',area:'삼랑진읍',purpose:'풋고추·생과',heat:'순한맛',date:'2026-11-15'},{...farm,purpose:'건고추·고춧가루',heat:'보통 매운맛',date:'2026-11-14'}];
 const empty=A.analyze({farm,seedHistory:[]},{},now);assert.equal(empty.seed.ready,false);assert.equal(empty.missing[0].id,'purpose');const a=A.analyze({farm,seedHistory:history,logs:{'2026-11-16':log({note:'잎 반점이 생겼어요.'})}}, {},now);assert.equal(a.seed.ready,true);assert.equal(a.purpose,'건고추·고춧가루');assert.equal(a.seed.observedPest,true);assert(a.seed.checks.some(t=>t.includes('저항성 표시')));assert(!/칼라탄|확진|내병성 보장/.test(a.seed.title));
 const b=A.analyze({farm,seedHistory:history},{purpose:'아삭한 고추',heat:'순한맛'},now);assert.equal(b.purpose,'아삭한 고추');assert(b.seed.query.includes('순한맛'));assert(b.evidence.some(e=>e.source==='이번 선택'));
});
test('unknown farm location stays a missing question rather than a regional product claim',()=>{const a=A.analyze({farm:{stage:'육묘 중',env:'노지'}},{purpose:'풋고추·생과',heat:'순한맛'},now);assert.equal(a.seed.ready,false);assert.equal(a.missing[0].id,'region');assert(a.scope.includes('카탈로그는 연결 전'));});

test('material requests route to the right comparison without treating emergence problems as shopping requests',()=>{assert.equal(A.intent('기록 보고 상토 추천해줘'),'substrate');assert.equal(A.intent('다음 종자는 어떤 걸 고를까?'),'seed');assert.equal(A.intent('종자가 발아하지 않아요.'),null);});

/* Offline evidence retrieval and adaptive follow-up. No remote LLM or diagnosis. */
(function(root){
'use strict';
const VERSION='record-interview-2',SOURCES={
 crop:{label:'농촌진흥청 농사로 · 고추 물 요구도',url:'https://www.nongsaro.go.kr/portal/oneclick/htmlfile/A0108010101/A010801010103.html'},
 pest:{label:'농촌진흥청 농사로 · 진딧물 관찰자료',url:'https://www.nongsaro.go.kr/portal/ps/psb/psby/vodPlay.ps?mvpClipNo=6&mvpNo=741'},
 spot:{label:'농촌진흥청 농사로 · 열매 반점 관찰자료',url:'https://www.nongsaro.go.kr/portal/ps/psb/psby/vodPlay.ps?mvpClipNo=2&mvpNo=741'},
 light:{label:'농촌진흥청 농사로 · 고추 광 조건',url:'https://www.nongsaro.go.kr/portal/oneclick/htmlfile/A0108010101/A010801010102.html'},
 weather:{label:'기상청 · 동네예보',url:'https://www.weather.go.kr/w/weather/forecast/short-term.do'}
};
const KB=[
 {id:'water',title:'관수·배수부터 함께 확인',text:'잎 처짐 시듦 물 고임 과습 관수 물 주기 비 온 뒤 흙 젖음 뿌리 주변 배수 습함',questions:['water','soil','spread','recovery'],checks:['잎 처짐만으로 물 부족이나 병을 확정할 수 없어요. 뿌리 주변의 마름·고인 물을 사진과 함께 확인해 주세요.','같은 위치를 다시 찍고 흙 상태와 물 준 시각을 함께 남겨주세요.'],source:'crop'},
 {id:'dry',title:'마름·시간대 변화 확인',text:'잎 처짐 낮 한낮 더위 고온 폭염 건조 흙 마름 물 부족 오후 회복',questions:['soil','water','recovery','spread'],checks:['낮과 저녁에 잎 모습이 달라지는지 같은 자리에서 비교해 주세요.','토양 상태와 실제 기온 기록을 함께 확인해 주세요. 기록만으로 관수량을 정하지 않아요.'],source:'crop'},
 {id:'pest',title:'잎 뒷면과 벌레 흔적 확인',text:'벌레 해충 잎 뒷면 진딧물 총채벌레 구멍 끈적임 흰 가루 잎 말림',questions:['underside','spread','pattern','water'],checks:['잎 앞·뒷면을 가까이 찍고, 벌레나 끈적임이 보이는지 남겨주세요.','증상 사진과 발생 위치를 모아 기술센터에서 확인받을 자료로 정리해요.'],source:'pest'},
 {id:'spot',title:'반점의 위치·변화 확인',text:'반점 갈색 검은 점 잎 열매 얼룩 썩음 상처 탄저병 의심 병해 비 번짐',questions:['spots','spread','pattern','soil'],checks:['잎과 열매 중 어디에 반점이 있는지, 크기와 범위가 달라지는지 사진으로 비교해 주세요.','반점만으로 병명을 정하지 않아요. 새로 생긴 위치와 발생일을 함께 모아주세요.'],source:'spot'},
 {id:'light',title:'같은 밭의 위치 차이 확인',text:'생육 차이 키 차이 웃자람 그늘 건물 빛 햇빛 시설 동쪽 서쪽 한 줄 구역',questions:['shade','pattern','soil','water'],checks:['같은 품종·비슷한 시기에 심은 곳을 골라 같은 시간에 비교해 주세요.','실제로 그늘이 생기는 시간과 위치를 사진으로 남겨주세요. 위성사진만으로 일조량을 확정하지 않아요.'],source:'light'}
];
const QUESTIONS={
 focus:{text:'어떤 변화를 먼저 확인할까요?',why:'관찰한 변화에 맞춰 필요한 질문부터 고를게요.',options:[['water','잎 처짐·물 고임'],['spot','잎·열매 반점'],['pest','벌레·잎 말림'],['light','생육·위치 차이']]},
 water:{text:'최근 3일, 물 주기는 평소와 달랐나요?',why:'잎 처짐과 물 고임을 구분할 추가 단서가 필요해요.',options:[['more','평소보다 많이'],['usual','비슷해요'],['less','줄였어요'],['unknown','잘 모르겠어요']]},
 soil:{text:'뿌리 주변 흙은 어떤가요?',why:'겉으로 보이는 잎 상태와 흙 상태를 함께 확인해요.',options:[['wet','젖어 있거나 물 고임'],['dry','말라 보여요'],['normal','평소와 비슷해요'],['unknown','아직 못 봤어요']]},
 underside:{text:'잎 뒷면에 벌레나 끈적임이 보이나요?',why:'잎 앞면의 변화만으로 해충 여부를 판단하지 않아요.',options:[['yes','보여요'],['no','안 보여요'],['unknown','아직 못 봤어요']]},
 spots:{text:'반점이 주로 어디에 있나요?',why:'변화가 나타난 부위를 기록해 상담 자료를 구체화해요.',options:[['leaf','잎'],['fruit','열매'],['both','둘 다'],['unknown','더 확인할게요']]},
 spread:{text:'처음 봤을 때보다 범위가 넓어졌나요?',why:'한 번의 사진보다 같은 위치의 변화 기록이 도움이 돼요.',options:[['yes','넓어졌어요'],['no','비슷해요'],['unknown','오늘 처음 봤어요']]},
 pattern:{text:'밭에서 어떻게 보이나요?',why:'특정 줄·구역인지 여러 곳인지 지도로 남겨요.',options:[['one','한두 포기'],['area','특정 줄·구역'],['many','여러 곳'],['unknown','더 살펴볼게요']]},
 shade:{text:'그곳에 실제로 그늘이 생기나요?',why:'건물 위치와 실제 그늘은 다를 수 있어 현장 관찰이 필요해요.',options:[['yes','같은 시간에 생겨요'],['no','거의 없어요'],['unknown','아직 못 봤어요']]},
 recovery:{text:'해가 약해진 뒤 잎 모습이 달라졌나요?',why:'시간대에 따른 변화를 추가 단서로 남겨요.',options:[['yes','나아져 보여요'],['no','계속 비슷해요'],['unknown','저녁에 볼게요']]}
};
const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const validDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(s||'')&&Number.isFinite(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
function tokens(text){const normalized=String(text||'').toLowerCase().replace(/[^가-힣a-z0-9\s]/g,' '),out=normalized.split(/\s+/).filter(x=>x.length>1);const compact=normalized.replace(/\s/g,'');for(let i=0;i<compact.length-1;i++)out.push(compact.slice(i,i+2));return out;}
function retrieve(text){const docs=KB.map(x=>tokens(x.text)),query=tokens(text),df=new Map();for(const d of docs)for(const t of new Set(d))df.set(t,(df.get(t)||0)+1);const vec=ts=>{const v=new Map();for(const t of ts)if(df.has(t))v.set(t,(v.get(t)||0)+1);for(const [t,n]of v)v.set(t,(1+Math.log(n))*Math.log(1+docs.length/(df.get(t)+1)));return v;},q=vec(query),norm=v=>Math.sqrt([...v.values()].reduce((s,x)=>s+x*x,0)),qn=norm(q);return KB.map((k,i)=>{const d=vec(docs[i]),dn=norm(d);return {...k,similarity:qn&&dn?[...q].reduce((s,[t,v])=>s+v*(d.get(t)||0),0)/(qn*dn):0};}).sort((a,b)=>b.similarity-a.similarity);}
function observed(c){const date=c.date||iso(new Date()),farm=c.farm||{},logs=Object.entries(c.logs||{}).filter(([d,r])=>validDate(d)&&d<=date&&r.region===farm.region&&(r.area||'')===(farm.area||'')).sort((a,b)=>b[0].localeCompare(a[0])),known={},evidence=[];
 const recent=logs.filter(([d])=>(Date.parse(date)-Date.parse(d))/86400000<=3),water=recent.find(([,r])=>['more','usual','less'].includes(r.irrigation)),soil=recent.find(([d,r])=>d===date&&['wet','dry','normal'].includes(r.soil)),last=recent[0];
 if(water){const[d,r]=water;known.water=r.irrigation;evidence.push({key:'water',text:d+' 물 주기: '+QUESTIONS.water.options.find(x=>x[0]===r.irrigation)[1],source:'주간 기록'});}
 if(soil){const[d,r]=soil;known.soil=r.soil;evidence.push({key:'soil',text:d+' 흙 상태: '+QUESTIONS.soil.options.find(x=>x[0]===r.soil)[1],source:'주간 기록'});}
 if(last){const[d,r]=last;if(r.condition&&r.condition!=='미기록')evidence.push({key:'weather',text:d+' 날씨: '+r.condition,source:'직접 입력'});if(typeof r.max==='number'&&Number.isFinite(r.max))evidence.push({key:'temperature',text:d+' 최고 '+r.max+'°C',source:'직접 입력'});}

 if(c.field){evidence.push({key:'location',text:c.field.polygon?'지도에 구역을 직접 표시했어요.':'지도에 문제 위치를 직접 표시했어요.',source:c.field.locationPrecision==='rounded-about-100m'?'공유 위치 · 대략 좌표':'현장 지도'});}
 for(const[k,v]of Object.entries(c.answers||{}))if(QUESTIONS[k]?.options.some(x=>x[0]===v)){known[k]=v;evidence.push({key:k,text:QUESTIONS[k].text+' → '+QUESTIONS[k].options.find(x=>x[0]===v)[1],source:'이번 추가 답변'});}
 return {known,evidence:evidence.filter((x,i,a)=>a.findLastIndex(y=>y.key===x.key)===i),logs};
}
function analyze(c={}){const o=observed(c),text=[c.text,...c.tags||[],c.field?.type,c.field?.note,{water:'잎 처짐 물 고임',spot:'열매 반점',pest:'벌레 잎 뒷면 말림',light:'생육 차이 그늘'}[o.known.focus]].filter(Boolean).join(' '),rank=retrieve(text);for(const r of rank){let bonus=0;if(r.id==='water'&&(o.known.water==='more'||o.known.soil==='wet'))bonus+=.6;if(r.id==='dry'&&o.known.soil==='dry')bonus+=.6;if(r.id==='pest'&&o.known.underside==='yes')bonus+=.8;if(r.id==='pest'&&o.known.underside==='no')bonus-=.15;if(r.id==='light'&&o.known.shade==='yes')bonus+=.6;if(r.id==='spot'&&o.known.spots&&o.known.spots!=='unknown')bonus+=.5;r.score=Math.max(0,r.similarity+bonus);}rank.sort((a,b)=>b.score-a.score);const matched=rank[0]?.score>.08,top=matched?rank[0]:KB[0],ordered=[...top.questions,...(rank[1]?.questions||[]),'spread','pattern'],key=!matched&&!Object.hasOwn(o.known,'focus')?'focus':[...new Set(ordered)].find(k=>!Object.hasOwn(o.known,k)),question=key?{id:key,...QUESTIONS[key]}:null;
 const changed=o.known.spread==='yes',summary=[o.known.water==='more'?'평소보다 물을 많이 준 기록을 반영했어요.':'',o.known.soil==='wet'?'흙이 젖어 있다는 답변이 있어 관수·배수를 먼저 확인해요.':'',o.known.underside==='yes'?'잎 뒷면에서 관찰한 흔적을 상담 자료에 포함해요.':'',changed?'범위가 넓어졌다는 답변을 우선 확인 항목으로 올렸어요.':''].filter(Boolean);
 return {version:VERSION,matched,ranking:rank.map(r=>({id:r.id,title:r.title,score:r.score})),question,evidence:o.evidence,known:o.known,headline:matched?top.title:'관찰 내용을 조금 더 알려주세요',summary:summary.join(' ')||'입력한 변화와 최근 기록에서 다음에 확인할 내용을 골랐어요.',checks:top.checks,urgent:changed,source:SOURCES[top.source],answered:Object.keys(c.answers||{}).length,complete:!question,disclosure:'공식 관리자료를 바탕으로 한 기기 내 유사도 검색·조건별 문답입니다. 생성형 AI·사진 자동 진단은 연결되지 않았으며 원인 확정이나 처방이 아닙니다.'};
}
const api={VERSION,SOURCES,KB,QUESTIONS,iso,validDate,tokens,retrieve,observed,analyze};if(typeof module==='object'&&module.exports)module.exports=api;root.RegrowFieldReasoner=api;
})(typeof window==='undefined'?globalThis:window);

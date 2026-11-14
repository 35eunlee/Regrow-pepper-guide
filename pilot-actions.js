/* Farmer-facing interpretation of analysis and explicitly entered observations.
 * This layer schedules observation, documents evidence and prepares questions;
 * it does not infer a disease, irrigation dose, yield gain or completed validation.
 */
(function(root){
  'use strict';
  const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  const addDays=(date,n)=>{const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+n);return iso(d);};
  const clock=m=>String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
  function visitWindow(selected,comparisons){
    let best=null;
    for(const other of comparisons){if(other.id===selected.id)continue;
      const bins=selected.analysis.bins;
      for(let i=0;i<bins.length;i++){
        if(bins[i].minute<480||bins[i].minute>=1020)continue;
        let duration=0,j=i;
        while(j<bins.length&&bins[j].minute<1080&&!bins[j].lit&&bins[j].reason!=='night'&&other.analysis.bins[j]?.lit){duration+=15;j++;}
        if(duration>=30&&(!best||duration>best.duration))best={from:bins[i].minute,to:bins[i].minute+Math.min(60,duration),duration,comparison:other.id,comparisonName:other.name,selected:selected.id,selectedName:selected.name};
      }
    }
    return best?{...best,found:true,label:clock(best.from)+'–'+clock(best.to)}:{found:false,from:null,to:null,comparison:null,selected:selected.id,label:'뚜렷한 비교 시간 없음'};
  }
  function farmContext({logs={},farm={},symptoms=[],today=iso(new Date())}){
    const matches=r=>r.region===farm.region&&(r.area||'')===(farm.area||'');
    const records=Object.entries(logs).map(([date,r])=>({...r,date})).filter(r=>/^\d{4}-\d{2}-\d{2}$/.test(r.date)&&r.date<=today&&matches(r)).sort((a,b)=>b.date.localeCompare(a.date));
    const latest=records[0]||null,weekly=records.filter(r=>r.date>=addDays(today,-6));
    const changes=symptoms.filter(r=>r.region===farm.region&&(r.area||'')===(farm.area||'')&&r.date<=today&&r.date>=addDays(today,-14)).sort((a,b)=>b.date.localeCompare(a.date));
    const measured=records.find(r=>typeof r.heightCm==='number'&&Number.isFinite(r.heightCm));
    const next=measured?addDays(measured.date,7):null;
    return {today,records,weekly,latest,changes,nextMeasurement:next,measurementDue:!!next&&next<=today,
      pilotFarm:farm.region==='충청남도 청양군'&&farm.area==='청양읍',
      hasToday:!!records.find(r=>r.date===today),needsFollowup:!!latest&&['주의','문제'].includes(latest.status)};
  }
  function consultationText({farm={},context,visit,date,sourceKind,modelMode,completed=[]}){
    const x=context,place=[farm.region,farm.area].filter(Boolean).join(' ')||'지역 미입력';
    const number=v=>typeof v==='number'&&Number.isFinite(v)?String(v):'미기록';
    return ['Re:Grow 농업기술 상담 준비 메모','작성일: '+x.today,'농장 지역: '+place,
      '자료 성격: 사용자가 입력한 관찰 기록. 병명과 원인은 미확정.',
      '', '[농민이 기록한 변화]',
      ...x.records.slice(0,7).map(r=>`${r.date} | 상태 ${r.status||'미기록'} | 최저 ${number(r.min)}°C / 최고 ${number(r.max)}°C | 키 ${number(r.heightCm)}cm\n메모: ${r.note||'없음'}`),
      ...(!x.records.length?['저장된 농장 관찰이 없습니다. 상담 전에 실제 증상과 발생일을 적어주세요.']:[]),
      '', '[별도로 기록한 증상]',...x.changes.slice(0,5).map(r=>`${r.date} | ${r.name||'증상'} | ${r.detail||'추가 메모 없음'}`),
      ...(!x.changes.length?['최근 14일 증상 기록 없음']:[]),
      '', '[상담 시 확인하고 싶은 점]','1. 관찰한 변화가 무엇과 관련 있는지, 추가로 확인할 항목은 무엇인지','2. 그늘진 곳과 개방된 곳의 차이를 어떻게 측정하면 좋을지','3. 다음 관찰 날짜와 기록해야 할 항목은 무엇인지',
      '', '[GIS 분석 참고 — 현장 증상과 구분]',
      `분석 기준일: ${date}. ${sourceKind==='synthetic'?'가상 지형·건물의 시연. 이 농장의 측량 결과가 아닙니다.':'사용자 업로드 지형·건물. 출처와 현장 일치 여부 검토 전입니다.'}`,
      visit.found?`관찰 계획 예시: ${visit.label}, ${visit.selectedName}와 ${visit.comparisonName} 비교.`:'이 조건에서 뚜렷한 그늘/개방 비교 시간은 찾지 못했습니다.',
      '맑은 하늘 가정의 직달광 가능시간이며 실제 일사 센서 관측이 아닙니다.',
      `생육 AI 모드: ${modelMode==='demo'?'합성 표본 시연 — 실제 작물의 예측으로 사용하지 않음':'사용자 관측 — 현장 검증 전'}.`,
      '', '[앱에서 표시한 진행 상태]',...completed.map(t=>'• '+t),
      '이 파일은 사용자가 직접 전달할 상담 준비 자료입니다. 기관에 자동으로 전송되지 않았습니다.'
    ].join('\n');
  }
  const api={iso,addDays,clock,visitWindow,farmContext,consultationText};
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.RegrowFarmerActions=api;
})(typeof window==='undefined'?globalThis:window);

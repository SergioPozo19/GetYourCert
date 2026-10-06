/* EarnYourCert — Pro retention hub: readiness, certification renewals, career paths, news.
   Loaded after the main script; relies on its globals (Store, EXAMS, lang, t, L, esc, isPro, ...). */
(function(){
'use strict';

const CT={
 es:{
  readyTitle:'Preparación para el examen', readySub:'Estimación basada en tus últimos intentos, ponderada por el peso oficial de cada dominio. Es orientativa, no una garantía.',
  readyNone:'Haz al menos un examen o práctica para ver tu preparación.',
  lvlReady:'Listo para presentarte', lvlAlmost:'Casi listo', lvlBuilding:'En progreso', lvlEarly:'Aún te falta', lvlLow:'Pocos datos',
  passMark:'Aprobado', confidence:'Fiabilidad', weakest:'Dominios a reforzar', practiceDom:'Practicar', simulate:'Simulacro completo', attemptsUsed:'intentos',
  certTitle:'Mis certificaciones', certSub:'Las certificaciones de rol caducan a los 12 meses. Renovarlas es gratis con la evaluación online de Microsoft, disponible durante los 6 meses previos a la caducidad. Las de nivel Fundamentals no caducan.',
  certAdd:'Añadir', certExam:'Examen', certEarned:'Fecha de obtención', certNone:'Aún no has añadido ninguna certificación.',
  certNoExpiry:'No caduca', certExpired:'Caducada hace {n} días', certDays:'Caduca en {n} días', certWindow:'Ya puedes renovar gratis', certUrgent:'Renueva ya',
  certRenew:'Marcar como renovada', certPractice:'Repaso de renovación', certRemove:'Quitar', certEarnedOn:'Obtenida', certExpiresOn:'Caduca',
  certChanges:'{n} novedades desde tu certificación', certConfirmRenew:'¿Marcar esta certificación como renovada? La caducidad se amplía 12 meses.',
  certConfirmRemove:'¿Quitar esta certificación de tu lista?', certAdded:'Certificación añadida', certRenewed:'Certificación renovada',
  pathTitle:'Rutas de carrera', pathSub:'Tu siguiente paso en cada ruta, según lo que ya has certificado y practicado.',
  stCertified:'Certificado', stReady:'Listo', stProgress:'Practicando', stNew:'Sin empezar', next:'Siguiente', startNow:'Empezar', continueNow:'Continuar',
  pathSecurity:'Seguridad e identidad', pathAzure:'Arquitectura y administración de Azure', pathM365:'Microsoft 365 y endpoints', pathTeams:'Teams y comunicaciones', pathData:'Datos e IA',
  newsTitle:'Novedades', newsAll:'Ver todas', newsNone:'Sin novedades.', newsClose:'Cerrar', newsPractice:'Practicar paquete', newsProOnly:'Solo Pro',
  tNew:'Nuevo', tSyllabus:'Temario', tRetire:'Retirada', tPack:'Paquete',
  alertTitle:'Renovación pendiente', alertBody:'{code} caduca en {n} días. Haz un repaso antes de renovar.', alertExpired:'{code} ha caducado. Renuévala cuando puedas.', alertCta:'Ver mis certificaciones',
  hubTitle:'Tu carrera', packSub:'Paquete de novedades'
 },
 en:{
  readyTitle:'Exam readiness', readySub:'Estimate based on your recent attempts, weighted by each domain\'s official weight. It is a guide, not a guarantee.',
  readyNone:'Take at least one exam or practice session to see your readiness.',
  lvlReady:'Ready to sit the exam', lvlAlmost:'Almost ready', lvlBuilding:'Building up', lvlEarly:'Not there yet', lvlLow:'Not enough data',
  passMark:'Pass mark', confidence:'Reliability', weakest:'Domains to reinforce', practiceDom:'Practice', simulate:'Full simulation', attemptsUsed:'attempts',
  certTitle:'My certifications', certSub:'Role-based certifications expire after 12 months. Renewing is free with Microsoft\'s online assessment, available during the 6 months before expiry. Fundamentals certifications do not expire.',
  certAdd:'Add', certExam:'Exam', certEarned:'Date earned', certNone:'You have not added any certification yet.',
  certNoExpiry:'Does not expire', certExpired:'Expired {n} days ago', certDays:'Expires in {n} days', certWindow:'You can renew for free now', certUrgent:'Renew now',
  certRenew:'Mark as renewed', certPractice:'Renewal review', certRemove:'Remove', certEarnedOn:'Earned', certExpiresOn:'Expires',
  certChanges:'{n} updates since you certified', certConfirmRenew:'Mark this certification as renewed? Expiry moves 12 months forward.',
  certConfirmRemove:'Remove this certification from your list?', certAdded:'Certification added', certRenewed:'Certification renewed',
  pathTitle:'Career paths', pathSub:'Your next step on each path, based on what you have certified and practiced.',
  stCertified:'Certified', stReady:'Ready', stProgress:'Practicing', stNew:'Not started', next:'Next', startNow:'Start', continueNow:'Continue',
  pathSecurity:'Security and identity', pathAzure:'Azure architecture and administration', pathM365:'Microsoft 365 and endpoints', pathTeams:'Teams and communications', pathData:'Data and AI',
  newsTitle:'What\'s new', newsAll:'See all', newsNone:'No news.', newsClose:'Close', newsPractice:'Practice pack', newsProOnly:'Pro only',
  tNew:'New', tSyllabus:'Outline', tRetire:'Retirement', tPack:'Pack',
  alertTitle:'Renewal due', alertBody:'{code} expires in {n} days. Do a review before renewing.', alertExpired:'{code} has expired. Renew it when you can.', alertCta:'See my certifications',
  hubTitle:'Your career', packSub:'Updates pack'
 }
};
const ct=k=>(CT[lang]&&CT[lang][k])||CT.es[k]||k;
const fmt=(s,o)=>s.replace(/\{(\w+)\}/g,(m,k)=>o[k]!==undefined?o[k]:m);
const day=86400000;

const PATHS=[
 {id:'security',  k:'pathSecurity', steps:['sc-900','sc-300','sc-200','sc-500']},
 {id:'azure',     k:'pathAzure',    steps:['az-900','az-104','az-305']},
 {id:'m365',      k:'pathM365',     steps:['ab-900','md-102','ms-102']},
 {id:'teams',     k:'pathTeams',    steps:['ms-700','ms-721']},
 {id:'data',      k:'pathData',     steps:['ab-900','pl-300']}
];

/* ---------- helpers ---------- */
const exById=id=>(typeof EXAMS!=='undefined'&&EXAMS||[]).find(e=>e.id===id);
const mid=w=>{const n=((w||'').match(/\d+/g)||[]).map(Number);return n.length?n.reduce((a,b)=>a+b,0)/n.length:0;};
const passOf=ex=>(ex&&ex.pass)||70;
const isoToday=()=>new Date().toISOString().slice(0,10);
function addYears(iso,n){const d=new Date(iso+'T00:00:00Z');d.setUTCFullYear(d.getUTCFullYear()+n);return d.toISOString().slice(0,10);}
function daysTo(iso){return Math.ceil((Date.parse(iso+'T00:00:00Z')-Date.now())/day);}
function fmtDate(iso){try{return new Date(iso+'T00:00:00Z').toLocaleDateString(t('locale'),{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'});}catch(e){return iso;}}
const getCerts=()=>Store.get('certs',[])||[];
function setCerts(c){Store.set('certs',c);if(typeof syncPush==='function')syncPush();}
const expires=(c)=>{const ex=exById(c.examId);return (ex&&ex.level==='fundamentals')?null:(c.expires||addYears(c.earned,1));};
const refresh=()=>{try{if(!$('#progress').classList.contains('hidden'))renderProgress();}catch(e){} careerRenderCatalog();};

/* ---------- readiness ---------- */
function readiness(ex,hist){
  const att=hist.filter(h=>h.examId===ex.id&&h.dom).sort((a,b)=>b.date-a.date).slice(0,12);
  if(!att.length)return null;
  const c={},tt={},raw={};
  att.forEach((h,k)=>{
    const w=Math.pow(0.85,k);
    Object.keys(h.dom).forEach(d=>{
      const o=h.dom[d]; c[d]=(c[d]||0)+o.c*w; tt[d]=(tt[d]||0)+o.t*w; raw[d]=(raw[d]||0)+o.t;
    });
  });
  const K=6; let score=0,wt=0; const doms=[];
  (ex.domains||[]).forEach(d=>{
    const wd=mid(d.weight)||1;
    const a=((c[d.id]||0)+0.5*K)/((tt[d.id]||0)+K);
    score+=a*wd; wt+=wd;
    doms.push({id:d.id,name:L(d,'name'),acc:a*100,n:raw[d.id]||0});
  });
  score=wt?score/wt*100:0;
  const answered=att.reduce((s,h)=>s+(h.total||0),0);
  const conf=Math.min(1,answered/((ex.examLen||50)*2));
  const pm=passOf(ex);
  let lvl='lvlEarly';
  if(conf<0.4)lvl='lvlLow'; else if(score>=pm+8)lvl='lvlReady'; else if(score>=pm)lvl='lvlAlmost'; else if(score>=pm-12)lvl='lvlBuilding';
  doms.sort((a,b)=>a.acc-b.acc);
  return {ex:ex,score:Math.round(score),conf:Math.round(conf*100),lvl:lvl,doms:doms,att:att.length,last:att[0].date};
}
const lvlColor=l=>l==='lvlReady'?'var(--ok)':l==='lvlAlmost'?'var(--ok)':l==='lvlBuilding'?'var(--warn)':l==='lvlLow'?'var(--ink-3)':'var(--bad)';

/* ---------- launching practice ---------- */
async function launch(examId,m,arg){
  try{closeNews();}catch(e){}
  const pg=$('#progress'); if(pg)pg.classList.add('hidden');
  await selectExam(examId);
  mode=m;
  $$('#modes .mode').forEach(x=>x.classList.toggle('sel',x.dataset.mode===m));
  if(m==='domain'){ domainPick=arg; $('#domPick').classList.remove('hidden'); buildDomOpts(); openLenModal(); }
  else if(m==='pack'){ packPick=arg; openLenModal(); }
  else if(m==='exam'){ confirmStartExam(); }
}
window.careerLaunch=launch;

/* ---------- sections ---------- */
function section(titleKey,svg,subKey){
  const s=document.createElement('div'); s.className='prog-section cr-sec';
  s.innerHTML='<h3>'+svg+'<span>'+esc(ct(titleKey))+'</span></h3>'+(subKey?'<p class="cr-sub">'+esc(ct(subKey))+'</p>':'');
  return s;
}
const ICO={
 gauge:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 14l4-4"/><path d="M3.3 17a10 10 0 1 1 17.4 0"/></svg>',
 cert:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="9" r="6"/><path d="M8.5 14L7 22l5-3 5 3-1.5-8"/></svg>',
 path:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="19" r="2"/><circle cx="19" cy="5" r="2"/><path d="M7 19h6a4 4 0 0 0 0-8h-2a4 4 0 0 1 0-8h6"/></svg>',
 bell:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>'
};

function renderReadiness(body,hist){
  const sec=section('readyTitle',ICO.gauge,'readySub');
  const list=(EXAMS||[]).map(ex=>readiness(ex,hist)).filter(Boolean).sort((a,b)=>b.last-a.last);
  if(!list.length){ sec.insertAdjacentHTML('beforeend','<div class="prog-card-box cr-empty">'+esc(ct('readyNone'))+'</div>'); body.appendChild(sec); return; }
  const grid=document.createElement('div'); grid.className='cr-grid';
  list.forEach(r=>{
    const pm=passOf(r.ex), col=lvlColor(r.lvl);
    const card=document.createElement('div'); card.className='prog-card-box cr-card';
    card.innerHTML='<div class="cr-row"><b class="cr-code">'+esc(r.ex.code)+'</b><span class="cr-lvl" style="color:'+col+'">'+esc(ct(r.lvl))+'</span></div>'+
      '<div class="cr-score"><span style="color:'+col+'">'+r.score+'%</span><small>'+esc(ct('passMark'))+' '+pm+'% · '+esc(ct('confidence'))+' '+r.conf+'% · '+r.att+' '+esc(ct('attemptsUsed'))+'</small></div>'+
      '<div class="cr-bar"><i style="width:'+Math.min(100,r.score)+'%;background:'+col+'"></i><u style="left:'+pm+'%"></u></div>';
    const weak=r.doms.filter(d=>d.acc<pm).slice(0,3);
    if(weak.length){
      const w=document.createElement('div'); w.className='cr-weak';
      w.innerHTML='<div class="cr-weak-t">'+esc(ct('weakest'))+'</div>';
      weak.forEach(d=>{
        const b=document.createElement('button'); b.type='button'; b.className='cr-dom';
        b.innerHTML='<span>'+esc(d.name)+'</span><em>'+Math.round(d.acc)+'%</em><strong>'+esc(ct('practiceDom'))+' ›</strong>';
        b.onclick=()=>launch(r.ex.id,'domain',d.id);
        w.appendChild(b);
      });
      card.appendChild(w);
    }
    const sim=document.createElement('button'); sim.type='button'; sim.className='btn btn-ghost btn-sm cr-sim'; sim.textContent=ct('simulate');
    sim.onclick=()=>launch(r.ex.id,'exam');
    card.appendChild(sim);
    grid.appendChild(card);
  });
  sec.appendChild(grid); body.appendChild(sec);
}

function certState(c){
  const e=expires(c);
  if(!e)return {kind:'none'};
  const n=daysTo(e);
  if(n<0)return {kind:'expired',n:-n};
  if(n<=30)return {kind:'urgent',n:n};
  if(n<=180)return {kind:'window',n:n};
  return {kind:'ok',n:n};
}
function newsSince(examId,iso){
  const items=NEWS||[];
  return items.filter(n=>(n.exams||[]).indexOf(examId)>=0&&n.date>iso&&n.type!=='new-exam').length;
}
function renderCerts(body){
  const sec=section('certTitle',ICO.cert,'certSub');
  const certs=getCerts().slice().sort((a,b)=>(expires(a)||'9999').localeCompare(expires(b)||'9999'));
  const box=document.createElement('div'); box.className='prog-card-box cr-certs';
  if(!certs.length) box.innerHTML='<div class="cr-empty">'+esc(ct('certNone'))+'</div>';
  certs.forEach(c=>{
    const ex=exById(c.examId); if(!ex)return;
    const st=certState(c), e=expires(c);
    let chip='', cls='';
    if(st.kind==='none'){chip=ct('certNoExpiry');cls='ok';}
    else if(st.kind==='expired'){chip=fmt(ct('certExpired'),{n:st.n});cls='bad';}
    else if(st.kind==='urgent'){chip=ct('certUrgent')+' · '+fmt(ct('certDays'),{n:st.n});cls='bad';}
    else if(st.kind==='window'){chip=ct('certWindow')+' · '+fmt(ct('certDays'),{n:st.n});cls='warn';}
    else {chip=fmt(ct('certDays'),{n:st.n});cls='ok';}
    const ch=e?newsSince(ex.id,c.earned):0;
    const row=document.createElement('div'); row.className='cr-cert';
    row.innerHTML='<div class="cr-cert-main"><b class="cr-code">'+esc(ex.code)+'</b><span class="cr-cert-name">'+esc(L(ex,'title'))+'</span>'+
      '<span class="cr-cert-dates">'+esc(ct('certEarnedOn'))+' '+esc(fmtDate(c.earned))+(e?' · '+esc(ct('certExpiresOn'))+' '+esc(fmtDate(e)):'')+'</span>'+
      (ch?'<span class="cr-cert-news">'+esc(fmt(ct('certChanges'),{n:ch}))+'</span>':'')+'</div>'+
      '<span class="cr-chip '+cls+'">'+esc(chip)+'</span><div class="cr-acts"></div>';
    const acts=row.querySelector('.cr-acts');
    const mk=(txt,fn,ghost)=>{const b=document.createElement('button');b.type='button';b.className='btn btn-sm '+(ghost===false?'btn-primary':'btn-ghost');b.textContent=txt;b.onclick=fn;acts.appendChild(b);};
    if(e){
      mk(ct('certPractice'),()=>launch(ex.id,'exam'),false);
      mk(ct('certRenew'),()=>openConfirm(ct('certConfirmRenew'),()=>{
        const all=getCerts(); const i=all.findIndex(x=>x.examId===c.examId);
        if(i>=0){ all[i].expires=addYears(e,1); setCerts(all); showToast(ct('certRenewed')+' ✓','ok',2500); refresh(); }
      },ct('certRenew')));
    }
    mk(ct('certRemove'),()=>openConfirm(ct('certConfirmRemove'),()=>{ setCerts(getCerts().filter(x=>x.examId!==c.examId)); refresh(); },ct('certRemove')));
    box.appendChild(row);
  });
  // add form
  const form=document.createElement('div'); form.className='cr-add';
  const have=new Set(getCerts().map(c=>c.examId));
  const opts=(EXAMS||[]).filter(e=>!have.has(e.id)).map(e=>'<option value="'+esc(e.id)+'">'+esc(e.code)+' · '+esc(L(e,'title'))+'</option>').join('');
  if(opts){
    form.innerHTML='<label>'+esc(ct('certExam'))+'<select class="ex-dom" id="crExam">'+opts+'</select></label>'+
      '<label>'+esc(ct('certEarned'))+'<input type="date" class="ex-search" id="crDate" max="'+isoToday()+'" value="'+isoToday()+'"></label>'+
      '<button type="button" class="btn btn-primary btn-sm" id="crAddBtn">'+esc(ct('certAdd'))+'</button>';
    form.querySelector('#crAddBtn').onclick=()=>{
      const id=form.querySelector('#crExam').value, d=form.querySelector('#crDate').value||isoToday();
      if(!id)return;
      const all=getCerts(); all.push({examId:id,earned:d}); setCerts(all);
      showToast(ct('certAdded')+' ✓','ok',2500); refresh();
    };
    box.appendChild(form);
  }
  sec.appendChild(box); body.appendChild(sec);
}

function stepStatus(examId,hist,certs){
  const c=certs.find(x=>x.examId===examId);
  if(c){ const st=certState(c); if(st.kind!=='expired')return 'stCertified'; }
  const ex=exById(examId); if(!ex)return 'stNew';
  const r=readiness(ex,hist);
  if(!r)return 'stNew';
  return (r.lvl==='lvlReady'||r.lvl==='lvlAlmost')?'stReady':'stProgress';
}
function renderPaths(body,hist){
  const sec=section('pathTitle',ICO.path,'pathSub');
  const certs=getCerts();
  const grid=document.createElement('div'); grid.className='cr-grid';
  PATHS.forEach(p=>{
    const steps=p.steps.filter(exById);
    if(!steps.length)return;
    const sts=steps.map(id=>stepStatus(id,hist,certs));
    const nextI=sts.findIndex(s=>s!=='stCertified');
    const done=sts.filter(s=>s==='stCertified').length;
    const card=document.createElement('div'); card.className='prog-card-box cr-card';
    card.innerHTML='<div class="cr-row"><b>'+esc(ct(p.k))+'</b><span class="cr-lvl" style="color:var(--ink-3)">'+done+'/'+steps.length+'</span></div>'+
      '<div class="cr-bar"><i style="width:'+Math.round(done/steps.length*100)+'%;background:var(--ok)"></i></div>';
    const ol=document.createElement('div'); ol.className='cr-steps';
    steps.forEach((id,i)=>{
      const ex=exById(id), s=sts[i];
      const el=document.createElement('button'); el.type='button';
      el.className='cr-step st-'+s+(i===nextI?' next':'');
      el.innerHTML='<b>'+esc(ex.code)+'</b><span>'+esc(ct(s))+'</span>'+(i===nextI?'<em>'+esc(ct('next'))+'</em>':'');
      el.onclick=()=>{ const pg=$('#progress'); if(pg)pg.classList.add('hidden'); selectExam(id); };
      ol.appendChild(el);
    });
    card.appendChild(ol);
    grid.appendChild(card);
  });
  sec.appendChild(grid); body.appendChild(sec);
}

window.careerRender=function(body,hist){
  try{
    const wrap=document.createElement('div');
    renderReadiness(wrap,hist); renderCerts(wrap); renderPaths(wrap,hist);
    while(wrap.firstChild)body.appendChild(wrap.firstChild);
  }catch(e){ console.error('career render',e); }
};

/* ---------- news ---------- */
let NEWS=null;
async function loadNews(){
  if(NEWS)return NEWS;
  try{
    const r=await fetch('news.json?v=1'); if(!r.ok)throw new Error(r.status);
    NEWS=(await r.json()).sort((a,b)=>b.date.localeCompare(a.date));
  }catch(e){ NEWS=[]; }
  return NEWS;
}
const unreadCount=()=>{const seen=Store.get('newsSeen','');return (NEWS||[]).filter(n=>n.date>seen).length;};
const typeLbl=ty=>ct(ty==='new-exam'?'tNew':ty==='syllabus'?'tSyllabus':ty==='retirement'?'tRetire':'tPack');
function newsItemHtml(n){
  const ex=(n.exams||[]).map(id=>{const e=exById(id);return e?e.code:null;}).filter(Boolean).slice(0,6).join(' · ');
  return '<div class="cr-news-item"><div class="cr-news-meta"><span class="cr-tag t-'+esc(n.type)+'">'+esc(typeLbl(n.type))+'</span><span>'+esc(fmtDate(n.date))+'</span>'+(ex?'<span>'+esc(ex)+'</span>':'')+'</div>'+
    '<h4>'+esc(L(n,'title'))+'</h4><p>'+esc(L(n,'body'))+'</p></div>';
}
function closeNews(){ const m=$('#crNewsModal'); if(m)m.remove(); }
async function openNews(){
  await loadNews(); closeNews();
  const m=document.createElement('div'); m.id='crNewsModal'; m.className='cr-modal';
  m.innerHTML='<div class="cr-modal-box" role="dialog" aria-modal="true" aria-label="'+esc(ct('newsTitle'))+'"><div class="cr-modal-head"><h3>'+esc(ct('newsTitle'))+'</h3><button type="button" class="btn btn-ghost btn-sm" id="crNewsX">'+esc(ct('newsClose'))+'</button></div><div class="cr-modal-body"></div></div>';
  const bodyEl=m.querySelector('.cr-modal-body');
  if(!NEWS.length)bodyEl.innerHTML='<div class="cr-empty">'+esc(ct('newsNone'))+'</div>';
  NEWS.forEach(n=>{
    const holder=document.createElement('div'); holder.innerHTML=newsItemHtml(n);
    const item=holder.firstChild;
    if(n.pack){
      const b=document.createElement('button'); b.type='button'; b.className='btn btn-primary btn-sm';
      b.textContent=ct('newsPractice')+(isPro()?'':' · '+ct('newsProOnly'));
      b.onclick=()=>{ if(!isPro()){ closeNews(); openProModal('manual'); return; } launch(n.pack.examId,'pack',n.pack.id); };
      item.appendChild(b);
    }
    bodyEl.appendChild(item);
  });
  m.addEventListener('click',e=>{ if(e.target===m)closeNews(); });
  m.querySelector('#crNewsX').onclick=closeNews;
  document.body.appendChild(m);
  if(NEWS.length)Store.set('newsSeen',NEWS[0].date);
  careerRenderCatalog();
}
window.careerOpenNews=openNews;
window.careerPackTitle=id=>{const n=(NEWS||[]).find(x=>x.pack&&x.pack.id===id);return n?L(n,'title'):ct('packSub');};

/* ---------- catalog card + renewal alert ---------- */
async function careerRenderCatalog(){
  const cat=$('#catalog'); if(!cat)return;
  await loadNews();
  let host=$('#careerCatalog');
  if(!host){
    host=document.createElement('div'); host.id='careerCatalog';
    const tools=cat.querySelector('.cat-tools'); cat.insertBefore(host,tools||cat.firstChild);
  }
  host.innerHTML='';
  // renewal alert (Pro, logged in)
  if(typeof isLoggedIn==='function'&&isLoggedIn()&&isPro()){
    const due=getCerts().map(c=>({c:c,st:certState(c),ex:exById(c.examId)})).filter(x=>x.ex&&(x.st.kind==='urgent'||x.st.kind==='expired'||(x.st.kind==='window'&&x.st.n<=90))).sort((a,b)=>(a.st.n||0)-(b.st.n||0));
    if(due.length){
      const d=due[0];
      const msg=d.st.kind==='expired'?fmt(ct('alertExpired'),{code:d.ex.code}):fmt(ct('alertBody'),{code:d.ex.code,n:d.st.n});
      const a=document.createElement('div'); a.className='cr-alert '+(d.st.kind==='window'?'warn':'bad');
      a.innerHTML='<div>'+ICO.bell+'<b>'+esc(ct('alertTitle'))+'</b><span>'+esc(msg)+'</span></div>';
      const b=document.createElement('button'); b.type='button'; b.className='btn btn-ghost btn-sm'; b.textContent=ct('alertCta');
      b.onclick=()=>{ if(typeof openProgress==='function')openProgress(); setTimeout(()=>{const s=document.querySelector('.cr-certs');if(s)s.scrollIntoView({behavior:'smooth',block:'center'});},250); };
      a.appendChild(b); host.appendChild(a);
    }
  }
  // news strip
  if(NEWS&&NEWS.length){
    const un=unreadCount();
    const strip=document.createElement('div'); strip.className='cr-newsbar';
    strip.innerHTML='<div class="cr-newsbar-t"><b>'+esc(ct('newsTitle'))+'</b>'+(un?'<span class="cr-dot">'+un+'</span>':'')+'</div>'+
      '<div class="cr-newsbar-l">'+NEWS.slice(0,2).map(n=>'<span><span class="cr-tag t-'+esc(n.type)+'">'+esc(typeLbl(n.type))+'</span> '+esc(L(n,'title'))+'</span>').join('')+'</div>';
    const b=document.createElement('button'); b.type='button'; b.className='btn btn-ghost btn-sm'; b.textContent=ct('newsAll'); b.onclick=openNews;
    strip.appendChild(b); host.appendChild(strip);
  }
}
window.careerRenderCatalog=careerRenderCatalog;

/* ---------- styles ---------- */
const css=document.createElement('style');
css.textContent=[
'.cr-sub{font-size:12.5px;color:var(--ink-3);margin:-4px 0 12px;line-height:1.5}',
'.cr-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}',
'.cr-card{display:flex;flex-direction:column;gap:10px}',
'.cr-row{display:flex;align-items:center;justify-content:space-between;gap:10px}',
'.cr-code{font-family:var(--mono);font-size:13px}',
'.cr-lvl{font-size:12.5px;font-weight:600}',
'.cr-score{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}',
'.cr-score span{font-size:30px;font-weight:700;line-height:1}',
'.cr-score small{font-size:11.5px;color:var(--ink-3)}',
'.cr-bar{position:relative;height:8px;border-radius:99px;background:var(--line-2);overflow:visible}',
'.cr-bar i{display:block;height:100%;border-radius:99px}',
'.cr-bar u{position:absolute;top:-3px;bottom:-3px;width:2px;background:var(--ink-2);opacity:.7}',
'.cr-weak-t{font-size:12px;color:var(--ink-3);margin-bottom:6px}',
'.cr-dom{display:flex;align-items:center;gap:8px;width:100%;text-align:left;background:var(--panel-2);border:1px solid var(--line);border-radius:10px;padding:8px 10px;margin-bottom:6px;cursor:pointer;color:var(--ink);font:inherit;font-size:12.5px}',
'.cr-dom:hover{border-color:var(--accent)}',
'.cr-dom span{flex:1;min-width:0}',
'.cr-dom em{font-style:normal;color:var(--bad);font-weight:600}',
'.cr-dom strong{color:var(--accent);font-size:12px;white-space:nowrap}',
'.cr-sim{align-self:flex-start;margin-top:auto}',
'.cr-empty{color:var(--ink-3);font-size:13.5px;text-align:center;padding:6px 0}',
'.cr-cert{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:12px 0;border-bottom:1px solid var(--line-2)}',
'.cr-cert-main{flex:1;min-width:220px;display:flex;flex-direction:column;gap:2px}',
'.cr-cert-name{font-size:13px;color:var(--ink-2)}',
'.cr-cert-dates,.cr-cert-news{font-size:12px;color:var(--ink-3)}',
'.cr-cert-news{color:var(--accent);font-weight:500}',
'.cr-chip{font-size:12px;font-weight:600;padding:4px 10px;border-radius:99px;white-space:nowrap}',
'.cr-chip.ok{background:var(--ok-soft);color:var(--ok)}',
'.cr-chip.warn{background:var(--warn-soft);color:var(--warn)}',
'.cr-chip.bad{background:var(--bad-soft);color:var(--bad)}',
'.cr-acts{display:flex;gap:6px;flex-wrap:wrap}',
'.cr-add{display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;padding-top:14px}',
'.cr-add label{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--ink-3);flex:1;min-width:160px}',
'.cr-add select,.cr-add input{width:100%}',
'.cr-steps{display:flex;flex-direction:column;gap:6px}',
'.cr-step{display:flex;align-items:center;gap:10px;width:100%;text-align:left;border:1px solid var(--line);background:var(--panel-2);color:var(--ink);border-radius:10px;padding:8px 12px;cursor:pointer;font:inherit;font-size:13px}',
'.cr-step b{font-family:var(--mono);font-size:12.5px;min-width:56px}',
'.cr-step span{flex:1;color:var(--ink-3);font-size:12px}',
'.cr-step em{font-style:normal;font-size:11px;font-weight:700;color:#fff;background:var(--accent);border-radius:99px;padding:2px 8px}',
'.cr-step.st-stCertified{border-color:var(--ok)}.cr-step.st-stCertified span{color:var(--ok)}',
'.cr-step.st-stReady span{color:var(--ok)}.cr-step.st-stProgress span{color:var(--warn)}',
'.cr-step.next{border-color:var(--accent);box-shadow:0 0 0 2px var(--accent-soft)}',
'.cr-step:hover{border-color:var(--accent)}',
'#careerCatalog{max-width:960px;margin:0 auto}',
'.cr-alert{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;border-radius:var(--radius-s);padding:10px 14px;margin:0 0 12px;font-size:13.5px;border:1px solid var(--line)}',
'.cr-alert>div{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
'.cr-alert.warn{background:var(--warn-soft);border-color:var(--warn);color:var(--ink)}',
'.cr-alert.bad{background:var(--bad-soft);border-color:var(--bad);color:var(--ink)}',
'.cr-newsbar{display:flex;align-items:center;gap:14px;flex-wrap:wrap;background:var(--panel);border:1px solid var(--line);border-radius:var(--radius-s);padding:10px 14px;margin:0 0 14px;font-size:13px;box-shadow:var(--shadow)}',
'.cr-newsbar-t{display:flex;align-items:center;gap:8px}',
'.cr-newsbar-l{flex:1;min-width:200px;display:flex;flex-direction:column;gap:4px;color:var(--ink-2)}',
'.cr-dot{background:var(--accent);color:#fff;border-radius:99px;font-size:11px;font-weight:700;padding:1px 7px}',
'.cr-tag{display:inline-block;font-size:10.5px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;padding:2px 7px;border-radius:6px;background:var(--accent-soft);color:var(--accent)}',
'.cr-tag.t-retirement{background:var(--bad-soft);color:var(--bad)}.cr-tag.t-pack{background:var(--ok-soft);color:var(--ok)}.cr-tag.t-syllabus{background:var(--warn-soft);color:var(--warn)}',
'.cr-modal{position:fixed;inset:0;background:rgba(10,14,20,.55);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px}',
'.cr-modal-box{background:var(--panel);color:var(--ink);border-radius:var(--radius);box-shadow:var(--shadow-lg);width:100%;max-width:640px;max-height:86vh;display:flex;flex-direction:column}',
'.cr-modal-head{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--line)}',
'.cr-modal-head h3{margin:0;font-size:17px}',
'.cr-modal-body{overflow:auto;padding:6px 20px 18px}',
'.cr-news-item{padding:14px 0;border-bottom:1px solid var(--line-2);display:flex;flex-direction:column;gap:6px;align-items:flex-start}',
'.cr-news-item h4{margin:0;font-size:15px}.cr-news-item p{margin:0;font-size:13.5px;color:var(--ink-2);line-height:1.55}',
'.cr-news-meta{display:flex;gap:10px;align-items:center;font-size:12px;color:var(--ink-3);flex-wrap:wrap}'
].join('\n');
document.head.appendChild(css);

/* re-render localized bits when the language changes */
document.addEventListener('click',e=>{ if(e.target.closest&&e.target.closest('#langToggle')) setTimeout(careerRenderCatalog,50); });

careerRenderCatalog();
})();

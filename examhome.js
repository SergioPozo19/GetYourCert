/* EarnYourCert — exam home ("menu" of each exam): one column, one width, clear order:
   header with the main action -> your progress -> practice by domain -> other study modes -> resources.
   Reuses the original controls (#modes, #exploreBtn, #studyPlanBtn, lenModal), so all quota/Pro/confirm
   logic stays in index.html. Loaded after career.js; before mobile.js. */
(function(){
'use strict';

const XT={
 es:{
  simD:'Preguntas ponderadas por dominio y con cronómetro, como el examen real.',
  qs:'preguntas', doms:'dominios', perExam:'por examen', min:'min', toPass:'para aprobar', start:'Empezar simulacro',
  last:'Último', best:'Mejor', avg:'Media', attempts:'Simulacros', ready:'Preparación',
  domT:'Practica por dominio', domS:'Sin límite de tiempo. Elige el área que quieres reforzar.',
  ofExam:'del examen', yourAcc:'tu acierto', noData:'sin datos', weak:'Reforzar',
  moreT:'Más formas de estudiar',
  allF:'{n} preguntas', srsF:'{n} pendientes hoy', srsNone:'Nada pendiente', bmF:'{n} guardadas', bmNone:'Ninguna guardada aún',
  progT:'Tu progreso',
  guestT:'Guarda tu progreso', guestB:'Inicia sesión gratis para ver tu evolución y tu acierto por dominio.', signIn:'Iniciar sesión',
  emptyB:'Aún no has hecho ningún simulacro de {code}. Haz uno para ver tu nivel en cada dominio.',
  toolsT:'Recursos', catalog:'Catálogo de preguntas', catalogD:'Busca y filtra todo el banco', plan:'Plan de estudio', planD:'14 días, adaptado a este examen'
 },
 en:{
  simD:'Questions weighted by domain and timed, like the real exam.',
  qs:'questions', doms:'domains', perExam:'per exam', min:'min', toPass:'to pass', start:'Start mock exam',
  last:'Last', best:'Best', avg:'Average', attempts:'Mock exams', ready:'Readiness',
  domT:'Practice by domain', domS:'No time limit. Pick the area you want to strengthen.',
  ofExam:'of the exam', yourAcc:'your accuracy', noData:'no data', weak:'Focus',
  moreT:'More ways to study',
  allF:'{n} questions', srsF:'{n} due today', srsNone:'Nothing due', bmF:'{n} saved', bmNone:'None saved yet',
  progT:'Your progress',
  guestT:'Save your progress', guestB:'Sign in for free to see how you improve and your accuracy per domain.', signIn:'Sign in',
  emptyB:'You have not taken a {code} mock exam yet. Take one to see your level in each domain.',
  toolsT:'Resources', catalog:'Question catalog', catalogD:'Search and filter the whole bank', plan:'Study plan', planD:'14 days, tailored to this exam'
 }
};
const xt=k=>(XT[lang]&&XT[lang][k])||XT.es[k];
const $=s=>document.querySelector(s);
const fmt=(s,o)=>s.replace(/\{(\w+)\}/g,(m,k)=>o[k]!=null?o[k]:m);
const sv=(p,w)=>'<svg width="'+(w||18)+'" height="'+(w||18)+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+p+'</svg>';
const I={
  play:sv('<path d="M7 4.5v15l12-7.5z"/>',16),
  chev:sv('<path d="m9 6 6 6-6 6"/>',16),
  all:sv('<path d="M4 19.5V5a2 2 0 0 1 2-2h12v15H6a2 2 0 0 0-2 2z"/><path d="M6 21h12v-3"/><path d="M9 8h6M9 11.5h4"/>',20),
  srs:sv('<path d="M3 12a9 9 0 1 0 9-9 9 9 0 0 0-6.5 2.8L3 8"/><path d="M3 4v4h4"/><path d="M12 8v4l2.5 2"/>',20),
  bm:sv('<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',20),
  search:sv('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',20),
  cal:sv('<rect x="3" y="4.5" width="18" height="16.5" rx="2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/><path d="m9 15 2 2 4-4"/>',20),
  lock:sv('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',14),
  user:sv('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',20)
};
const logged=()=>typeof isLoggedIn==='function'&&isLoggedIn();
const pro=()=>typeof isPro==='function'&&isPro();
const passOf=ex=>ex.pass||70;

function stats(ex){
  const hist=(Store.get('history',[])||[]).filter(h=>h.examId===ex.id);
  const mocks=hist.filter(h=>h.mode==='exam'&&typeof h.pct==='number').sort((a,b)=>a.date-b.date);
  const dom={};
  hist.forEach(h=>{ if(!h.dom)return; Object.keys(h.dom).forEach(d=>{ const o=h.dom[d]; dom[d]=dom[d]||{c:0,t:0}; dom[d].c+=o.c||0; dom[d].t+=o.t||0; }); });
  return {mocks,dom};
}
function readinessScore(ex){
  // same estimate as the Pro dashboard: recent attempts weighted by recency and by official domain weight
  const att=(Store.get('history',[])||[]).filter(h=>h.examId===ex.id&&h.dom).sort((a,b)=>b.date-a.date).slice(0,12);
  if(!att.length)return null;
  const c={},tt={}; att.forEach((h,k)=>{ const w=Math.pow(.85,k); Object.keys(h.dom).forEach(d=>{ c[d]=(c[d]||0)+h.dom[d].c*w; tt[d]=(tt[d]||0)+h.dom[d].t*w; }); });
  let s=0,wt=0; (ex.domains||[]).forEach(d=>{ const m=String(d.weight||'').match(/\d+/g); const wd=m?(m.reduce((a,b)=>a+ +b,0)/m.length):1; s+=((c[d.id]||0)+3)/((tt[d.id]||0)+6)*wd; wt+=wd; });
  return wt?Math.round(s/wt*100):null;
}
const sec=(title,sub,body)=>'<section class="xh-sec"><div class="xh-h"><h3>'+esc(title)+'</h3>'+(sub?'<p>'+esc(sub)+'</p>':'')+'</div>'+body+'</section>';

function header(ex){
  const n=ex.examLen||50, mins=Math.round(n*(ex.secsPerQ||90)/60), nd=(ex.domains||[]).length;
  const total=(typeof QUESTIONS!=='undefined'&&QUESTIONS&&QUESTIONS.length)||ex.questionCount||0;
  const fact=(v,k)=>'<span><b>'+v+'</b> '+esc(xt(k))+'</span>';
  return '<section class="xh-head">'+
    '<div class="xh-hi">'+(typeof examIcon==='function'?examIcon(ex):'')+'</div>'+
    '<div class="xh-ht">'+
      '<span class="xh-eyebrow">'+esc(ex.code)+(L(ex,'eyebrow')?' · '+esc(L(ex,'eyebrow')):'')+'</span>'+
      '<h2>'+esc(L(ex,'title'))+'</h2>'+
      '<div class="xh-facts">'+fact(total,'qs')+fact(nd,'doms')+fact(n,'perExam')+fact(mins,'min')+fact(passOf(ex)+'%','toPass')+'</div>'+
    '</div>'+
    '<div class="xh-hcta">'+
      '<button type="button" class="btn btn-primary xh-go" data-x="exam">'+I.play+'<span>'+esc(xt('start'))+'</span></button>'+
      '<small>'+esc(xt('simD'))+'</small>'+
      '<div class="xh-quota"></div>'+
    '</div>'+
  '</section>';
}
function progress(ex,st){
  let body;
  if(!logged()){
    body='<div class="xh-card xh-pinline"><span class="xh-mi">'+I.user+'</span><div><b>'+esc(xt('guestT'))+'</b><p>'+esc(xt('guestB'))+'</p></div>'+
      '<button type="button" class="btn btn-ghost btn-sm" data-x="login">'+esc(xt('signIn'))+'</button></div>';
  }else if(!st.mocks.length&&!Object.keys(st.dom).length){
    body='<div class="xh-card"><p class="xh-muted">'+esc(fmt(xt('emptyB'),{code:ex.code}))+'</p></div>';
  }else{
    const m=st.mocks, pm=passOf(ex);
    const avg=m.length?Math.round(m.reduce((s,h)=>s+h.pct,0)/m.length):null;
    const best=m.reduce((x,h)=>Math.max(x,h.pct),0), last=m[m.length-1];
    const rd=readinessScore(ex);
    const kpi=(v,k,cls)=>'<div class="xh-kpi'+(cls||'')+'"><b>'+v+'</b><span>'+esc(xt(k))+'</span></div>';
    const spark=m.length?'<div class="xh-kpi xh-spark" aria-hidden="true">'+m.slice(-12).map(h=>'<i class="'+(h.pct>=pm?'ok':'')+'" style="height:'+Math.max(6,h.pct)+'%"></i>').join('')+'<u style="bottom:calc(8px + (100% - 16px) * '+(pm/100)+')"></u></div>':'';
    body='<div class="xh-pgrid">'+
      kpi(m.length,'attempts')+kpi(last?last.pct+'%':'–','last')+kpi(m.length?best+'%':'–','best')+kpi(avg!=null?avg+'%':'–','avg')+
      kpi(pro()&&rd!=null?rd+'%':'<a href="/pro.html" class="xh-lock">'+I.lock+'Pro</a>','ready')+spark+
    '</div>';
  }
  return sec(xt('progT'),'',body);
}
function domains(ex,st){
  const counts=typeof domCounts==='function'?domCounts():{};
  const pm=passOf(ex);
  const rows=(ex.domains||[]).map(d=>{ const o=st.dom[d.id]; return {d,acc:o&&o.t>=5?Math.round(o.c/o.t*100):null}; });
  const known=rows.filter(r=>r.acc!=null);
  const weakest=known.length>1?known.reduce((a,b)=>b.acc<a.acc?b:a):null;
  return sec(xt('domT'),xt('domS'),'<div class="xh-doms">'+rows.map(({d,acc})=>
    '<button type="button" class="xh-dom" data-dom="'+d.id+'">'+
      '<span class="xh-dn">'+d.id+'</span>'+
      '<span class="xh-dt"><b>'+esc(L(d,'name'))+(weakest&&weakest.d===d&&acc<pm?' <em>'+esc(xt('weak'))+'</em>':'')+'</b>'+
        '<small>'+esc(String(d.weight||'').replace('-','–'))+' '+esc(xt('ofExam'))+' · '+(counts[d.id]||0)+' '+esc(xt('qs'))+'</small></span>'+
      '<span class="xh-acc'+(acc==null?' none':'')+'" title="'+esc(xt('yourAcc'))+'">'+
        (acc==null?'<i>'+esc(xt('noData'))+'</i>':'<span class="xh-bar"><i style="width:'+acc+'%"></i><u style="left:'+pm+'%"></u></span><b>'+acc+'%</b>')+
      '</span>'+
      '<span class="xh-chev">'+I.chev+'</span>'+
    '</button>').join('')+'</div>');
}
function more(){
  const total=(typeof QUESTIONS!=='undefined'&&QUESTIONS)?QUESTIONS.length:0;
  const due=typeof srsDueCount==='function'?srsDueCount():0, bm=typeof bookmarkCount==='function'?bookmarkCount():0;
  const card=(x,ico,tk,dk,foot,on)=>'<button type="button" class="xh-mode" data-x="'+x+'"><span class="xh-mi">'+ico+'</span><b>'+esc(t(tk))+'</b><p>'+esc(t(dk))+'</p><span class="xh-foot'+(on?' on':'')+'">'+esc(foot)+'</span></button>';
  return sec(xt('moreT'),'','<div class="xh-more">'+
    card('all',I.all,'m3t','m3d',fmt(xt('allF'),{n:total}),false)+
    card('srs',I.srs,'m4t','m4d',due?fmt(xt('srsF'),{n:due}):xt('srsNone'),due>0)+
    card('bookmarks',I.bm,'m5t','m5d',bm?fmt(xt('bmF'),{n:bm}):xt('bmNone'),false)+
  '</div>');
}
function tools(){
  const row=(x,ico,title,desc,badge)=>'<button type="button" class="xh-row" data-x="'+x+'"><span class="xh-ri">'+ico+'</span><span class="xh-rt"><b>'+esc(title)+badge+'</b><small>'+esc(desc)+'</small></span>'+I.chev+'</button>';
  return sec(xt('toolsT'),'','<div class="xh-tools">'+
    row('explore',I.search,xt('catalog'),xt('catalogD'),pro()?'':' <span class="pro-badge">PRO</span>')+
    row('plan',I.cal,xt('plan'),xt('planD'),'')+
  '</div>');
}

function render(){
  const home=$('#home'); if(!home||home.classList.contains('hidden')||typeof currentExam==='undefined'||!currentExam)return;
  const ex=currentExam, st=stats(ex);
  if(!home.classList.contains('xh-on'))home.classList.add('xh-on');
  let x=$('#xh');
  if(!x){ x=document.createElement('div'); x.id='xh'; x.className='xh'; const hero=home.querySelector('.card.hero'); hero.parentNode.insertBefore(x,hero.nextSibling); }
  // the original quota pill and retirement notice are kept alive across re-renders (the main script updates them)
  const q=home.querySelector('.quota-wrap'), rb=$('#retireBanner');
  if(q&&x.contains(q))home.appendChild(q);
  if(rb&&x.contains(rb))home.appendChild(rb);
  x.innerHTML=header(ex)+'<div class="xh-retire"></div>'+progress(ex,st)+domains(ex,st)+more()+tools();
  if(q&&!pro())x.querySelector('.xh-quota').appendChild(q);
  if(rb&&!rb.classList.contains('hidden'))x.querySelector('.xh-retire').appendChild(rb);
}

function quotaBlocked(){ if(!pro()&&typeof remainingQuota==='function'&&remainingQuota()<=0){ openProModal('limit'); return true; } return false; }
document.addEventListener('click',e=>{
  const x=e.target.closest&&e.target.closest('#xh [data-x],#xh [data-dom]'); if(!x)return;
  const dom=x.dataset.dom, a=x.dataset.x;
  if(dom){
    if(quotaBlocked())return;
    mode='domain'; domainPick=+dom;
    document.querySelectorAll('#modes .mode').forEach(m=>m.classList.toggle('sel',m.dataset.mode==='domain'));
    buildDomOpts(); openLenModal(); return;
  }
  if(a==='login'){ openLoginModal(); return; }
  if(a==='explore'){ const b=$('#exploreBtn'); if(b)b.click(); return; }
  if(a==='plan'){ const b=$('#studyPlanBtn'); if(b)b.click(); return; }
  const m=document.querySelector('#modes .mode[data-mode="'+a+'"]'); if(m)m.click();
});

// re-render whenever the exam home is shown, the language changes or the account changes
// (never touch #home's class list on every render: classList.add fires a mutation even when nothing changes)
let raf=0; const soon=()=>{ if(raf)return; raf=requestAnimationFrame(()=>{ raf=0; render(); }); };
let wasHidden=true;
new MutationObserver(()=>{ const h=$('#home').classList.contains('hidden'); if(h!==wasHidden){ wasHidden=h; if(!h)soon(); } }).observe($('#home'),{attributes:true,attributeFilter:['class']});
const prevSel=window.selectExam;
if(typeof prevSel==='function')window.selectExam=async function(){ const r=await prevSel.apply(this,arguments); render(); return r; };
const prevAcc=window.updateAccountUI;
if(typeof prevAcc==='function')window.updateAccountUI=function(){ const r=prevAcc.apply(this,arguments); soon(); return r; };
document.addEventListener('click',e=>{ if(e.target.closest&&e.target.closest('#langToggle,[data-lang-set]'))setTimeout(render,160); });
window.examHomeRender=render;

const css=document.createElement('style');
css.textContent=[
/* the original blocks stay in the DOM (their handlers are reused) but are not shown */
'#home.xh-on>.card.hero,#home.xh-on #modes,#home.xh-on .explore-row,#home.xh-on #domPick,#home.xh-on #guestBanner,#home.xh-on>.quota-wrap,#home.xh-on>#retireBanner{display:none !important}',
/* one column, one width, one rhythm */
'.xh{display:flex;flex-direction:column;gap:30px;margin:0 0 40px}',
'.xh-sec{display:flex;flex-direction:column;gap:12px}',
'.xh-h h3{font-size:18px;font-weight:700;letter-spacing:-.01em;margin:0}.xh-h p{margin:3px 0 0;font-size:13.5px;color:var(--ink-3)}',
'.xh-card,.xh-head,.xh-doms,.xh-mode,.xh-row,.xh-pgrid{background:var(--panel);border:1px solid var(--line);border-radius:16px}',
/* header: exam + main action */
'.xh-head{display:grid;grid-template-columns:64px minmax(0,1fr) 270px;gap:24px;align-items:center;padding:26px 28px}',
'.xh-hi{width:64px;height:64px;border-radius:18px;display:grid;place-items:center;background:var(--accent-soft);color:var(--accent)}.xh-hi svg{width:32px;height:32px}',
'.xh-eyebrow{display:block;font-family:var(--mono);font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--accent)}',
'.xh-ht{min-width:0}.xh-ht h2{font-size:24px;line-height:1.25;font-weight:700;letter-spacing:-.02em;margin:6px 0 12px}',
'.xh-facts{display:flex;flex-wrap:wrap;gap:6px 20px;font-size:13.5px;color:var(--ink-3)}.xh-facts b{color:var(--ink);font-weight:700}',
'.xh-hcta{display:flex;flex-direction:column;gap:10px;align-self:stretch;justify-content:center;padding-left:24px;border-left:1px solid var(--line)}',
'.xh-go{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:14px 18px;font-size:15px;border-radius:12px}',
'.xh-hcta small{font-size:12.5px;line-height:1.45;color:var(--ink-3);text-align:center}',
'.xh-quota:empty,.xh-retire:empty{display:none}.xh-quota .quota-wrap{display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap}',
'.xh-retire .retire-banner{margin:-14px 0 0}',
/* progress */
'.xh-card{padding:18px 20px}',
'.xh-muted{margin:0;font-size:14px;color:var(--ink-2)}',
'.xh-pinline{display:grid;grid-template-columns:40px 1fr auto;gap:14px;align-items:center}.xh-pinline b{font-size:15px}.xh-pinline p{margin:2px 0 0;font-size:13px;color:var(--ink-3)}',
'.xh-pgrid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr)) minmax(0,1.6fr);overflow:hidden}',
'.xh-kpi{display:flex;flex-direction:column;justify-content:center;gap:3px;padding:16px 18px;min-height:76px;box-sizing:border-box}',
'.xh-kpi+.xh-kpi{border-left:1px solid var(--line)}',
'.xh-kpi b{font-family:var(--mono);font-size:20px;line-height:1.2}.xh-kpi span{font-size:11px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.05em}',
'.xh-lock{display:inline-flex;align-items:center;gap:5px;font-family:var(--sans);font-size:14px;font-weight:700;color:var(--ink-3);text-decoration:none}.xh-lock:hover{color:var(--accent)}',
'.xh-spark{position:relative;flex-direction:row;align-items:flex-end;justify-content:flex-start;gap:4px;padding:8px 16px}',
'.xh-spark i{flex:1;max-width:16px;border-radius:4px 4px 2px 2px;background:color-mix(in srgb,var(--accent) 30%,var(--panel-2))}',
'.xh-spark i.ok{background:var(--accent)}',
'.xh-spark u{position:absolute;left:12px;right:12px;border-top:1.5px dashed var(--ink-3);opacity:.45;text-decoration:none}',
/* domains */
'.xh-doms{overflow:hidden}',
'.xh-dom{display:grid;grid-template-columns:32px minmax(0,1fr) 190px 18px;align-items:center;gap:16px;width:100%;padding:15px 20px;text-align:left;font:inherit;color:var(--ink);background:none;cursor:pointer;transition:background .15s}',
'.xh-dom+.xh-dom{border-top:1px solid var(--line)}.xh-dom:hover{background:var(--panel-2)}',
'.xh-dn{width:32px;height:32px;border-radius:9px;display:grid;place-items:center;background:var(--panel-2);font-family:var(--mono);font-weight:700;font-size:13px;color:var(--ink-2)}',
'.xh-dom:hover .xh-dn{background:var(--accent-soft);color:var(--accent)}',
'.xh-dt{min-width:0}.xh-dt b{display:block;font-size:14.5px;font-weight:600;line-height:1.35}',
'.xh-dt em{font-style:normal;font-size:10.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;padding:1px 7px;border-radius:999px;background:var(--panel-2);border:1px solid var(--line);color:var(--ink-2);margin-left:6px;vertical-align:1px}',
'.xh-dt small{display:block;margin-top:2px;font-size:12.5px;color:var(--ink-3)}',
'.xh-acc{display:flex;align-items:center;gap:10px}.xh-acc b{font-family:var(--mono);font-size:13px;min-width:38px;text-align:right}',
'.xh-acc.none{justify-content:flex-end}.xh-acc.none i{font-style:normal;font-size:12px;color:var(--ink-3)}',
'.xh-bar{position:relative;flex:1;height:6px;border-radius:99px;background:var(--panel-2)}',
'.xh-bar i{position:absolute;left:0;top:0;bottom:0;border-radius:99px;background:var(--accent)}',
'.xh-bar u{position:absolute;top:-3px;bottom:-3px;width:2px;margin-left:-1px;background:var(--ink-3);opacity:.5;border-radius:2px}',
'.xh-chev{color:var(--ink-3);display:grid}',
/* other study modes: three equal cards */
'.xh-more{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}',
'.xh-mode{display:flex;flex-direction:column;align-items:flex-start;gap:4px;padding:20px;text-align:left;font:inherit;color:var(--ink);cursor:pointer;transition:border-color .15s,box-shadow .15s}',
'.xh-mode:hover,.xh-row:hover{border-color:color-mix(in srgb,var(--accent) 45%,var(--line));box-shadow:0 8px 22px rgba(16,24,40,.07)}',
'.xh-mi{width:40px;height:40px;flex:none;border-radius:12px;display:grid;place-items:center;background:var(--accent-soft);color:var(--accent)}',
'.xh-mode .xh-mi{margin-bottom:10px}',
'.xh-mode b{font-size:15px}.xh-mode p{margin:0;font-size:13px;color:var(--ink-2);line-height:1.45;flex:1}',
'.xh-foot{font-size:12px;font-weight:600;color:var(--ink-3);margin-top:12px;padding-top:12px;border-top:1px solid var(--line);align-self:stretch}.xh-foot.on{color:var(--accent)}',
/* resources: two equal rows */
'.xh-tools{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}',
'.xh-row{display:grid;grid-template-columns:40px 1fr 16px;align-items:center;gap:14px;padding:16px 20px;text-align:left;font:inherit;color:var(--ink);cursor:pointer;transition:border-color .15s,box-shadow .15s}',
'.xh-row>svg{color:var(--ink-3)}',
'.xh-ri{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:var(--panel-2);color:var(--ink-2)}',
'.xh-rt{min-width:0}.xh-rt b{display:flex;align-items:center;gap:6px;font-size:14.5px;font-weight:600}.xh-rt small{display:block;font-size:12.5px;color:var(--ink-3);margin-top:1px}',
/* tablets */
'@media(max-width:900px){.xh-head{grid-template-columns:56px minmax(0,1fr);padding:22px}.xh-hi{width:56px;height:56px}.xh-hcta{grid-column:1/-1;padding:18px 0 0;border-left:0;border-top:1px solid var(--line)}',
'.xh-pgrid{grid-template-columns:repeat(5,minmax(0,1fr))}.xh-spark{grid-column:1/-1;border-left:0 !important;border-top:1px solid var(--line);min-height:64px}}',
/* phones */
'@media(max-width:760px){.xh{gap:24px}.xh-head{grid-template-columns:1fr;gap:14px;padding:20px}.xh-hi{display:none}.xh-ht h2{font-size:20px;margin:4px 0 10px}.xh-facts{gap:4px 14px;font-size:13px}.xh-hcta{padding-top:14px}',
'.xh-pgrid{grid-template-columns:repeat(4,minmax(0,1fr))}.xh-kpi{padding:12px 10px;min-height:62px}.xh-kpi b{font-size:16px}.xh-kpi span{font-size:10px;letter-spacing:.03em}',
'.xh-kpi:nth-child(5){grid-column:span 2;border-left:0}.xh-kpi:nth-child(n+5){border-top:1px solid var(--line)}.xh-spark{grid-column:span 2 !important;border-top:1px solid var(--line) !important;border-left:1px solid var(--line) !important;min-height:62px}',
'.xh-pinline{grid-template-columns:40px 1fr}.xh-pinline .btn{grid-column:1/-1}',
'.xh-dom{grid-template-columns:30px minmax(0,1fr) 16px;gap:12px;padding:14px 16px}.xh-dn{grid-row:1/span 2;align-self:start}.xh-acc{grid-column:2;grid-row:2}.xh-chev{grid-column:3;grid-row:1/span 2}',
'.xh-more{grid-template-columns:1fr;gap:0;background:var(--panel);border:1px solid var(--line);border-radius:16px;overflow:hidden}',
'.xh-mode{display:grid;grid-template-columns:40px 1fr;column-gap:14px;row-gap:2px;border:0;border-radius:0;padding:14px 16px}.xh-mode+.xh-mode{border-top:1px solid var(--line)}',
'.xh-mode .xh-mi{grid-row:1/span 3;margin:0}.xh-mode p{font-size:12.5px;color:var(--ink-3)}.xh-foot{margin-top:4px;padding-top:0;border-top:0}',
'.xh-tools{grid-template-columns:1fr;gap:10px}}',
'html.m-app .xh-go{min-height:50px}'
].join('\n');
document.head.appendChild(css);

render();
})();

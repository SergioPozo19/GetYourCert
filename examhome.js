/* EarnYourCert — exam home ("menu" of each exam), reorganised:
   featured mock exam, domains visible with weight and your accuracy, other study modes, and a side column
   with your progress and resources. Reuses the original controls (#modes, #exploreBtn, #studyPlanBtn, lenModal)
   so all quota/Pro/confirm logic stays in one place. Loaded after career.js; before mobile.js. */
(function(){
'use strict';

const XT={
 es:{
  rec:'Recomendado', simT:'Simulacro de examen', simD:'Preguntas aleatorias ponderadas por dominio y con cronómetro, como el examen real.',
  qs:'preguntas', min:'min', toPass:'para aprobar', start:'Empezar simulacro', last:'Último', best:'Mejor',
  domT:'Practica por dominio', domS:'Sin límite de tiempo. Elige el área que quieres reforzar.',
  ofExam:'del examen', yourAcc:'tu acierto', noData:'sin datos',
  moreT:'Más formas de estudiar',
  allF:'{n} preguntas', srsF:'{n} pendientes hoy', srsNone:'Nada pendiente', bmF:'{n} guardadas', bmNone:'Ninguna guardada aún',
  progT:'Tu progreso', attempts:'simulacros', avg:'media',
  guestT:'Guarda tu progreso', guestB:'Inicia sesión gratis para ver tu evolución y tu acierto por dominio.', signIn:'Iniciar sesión',
  emptyB:'Aún no has hecho ningún simulacro de {code}. Haz uno para ver tu nivel en cada dominio.',
  ready:'Preparación estimada', readyPro:'Disponible con Pro', passLine:'aprobado',
  toolsT:'Recursos', catalog:'Catálogo de preguntas', catalogD:'Busca y filtra todo el banco', plan:'Plan de estudio', planD:'14 días, adaptado a este examen',
  weak:'Reforzar'
 },
 en:{
  rec:'Recommended', simT:'Mock exam', simD:'Random questions weighted by domain, timed like the real exam.',
  qs:'questions', min:'min', toPass:'to pass', start:'Start mock exam', last:'Last', best:'Best',
  domT:'Practice by domain', domS:'No time limit. Pick the area you want to strengthen.',
  ofExam:'of the exam', yourAcc:'your accuracy', noData:'no data',
  moreT:'More ways to study',
  allF:'{n} questions', srsF:'{n} due today', srsNone:'Nothing due', bmF:'{n} saved', bmNone:'None saved yet',
  progT:'Your progress', attempts:'mock exams', avg:'average',
  guestT:'Save your progress', guestB:'Sign in for free to see how you improve and your accuracy per domain.', signIn:'Sign in',
  emptyB:'You have not taken a {code} mock exam yet. Take one to see your level in each domain.',
  ready:'Estimated readiness', readyPro:'Available with Pro', passLine:'pass',
  toolsT:'Resources', catalog:'Question catalog', catalogD:'Search and filter the whole bank', plan:'Study plan', planD:'14 days, tailored to this exam',
  weak:'Focus'
 }
};
const xt=k=>(XT[lang]&&XT[lang][k])||XT.es[k];
const $=s=>document.querySelector(s);
const fmt=(s,o)=>s.replace(/\{(\w+)\}/g,(m,k)=>o[k]!=null?o[k]:m);
const sv=(p,w)=>'<svg width="'+(w||18)+'" height="'+(w||18)+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+p+'</svg>';
const I={
  list:sv('<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>',15),
  clock:sv('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',15),
  target:sv('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',15),
  play:sv('<path d="M7 4.5v15l12-7.5z"/>',16),
  chev:sv('<path d="m9 6 6 6-6 6"/>',16),
  all:sv('<path d="M4 19.5V5a2 2 0 0 1 2-2h12v15H6a2 2 0 0 0-2 2z"/><path d="M6 21h12v-3"/><path d="M9 8h6M9 11.5h4"/>',20),
  srs:sv('<path d="M3 12a9 9 0 1 0 9-9 9 9 0 0 0-6.5 2.8L3 8"/><path d="M3 4v4h4"/><path d="M12 8v4l2.5 2"/>',20),
  bm:sv('<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',20),
  search:sv('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',18),
  cal:sv('<rect x="3" y="4.5" width="18" height="16.5" rx="2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/><path d="m9 15 2 2 4-4"/>',18),
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

function feature(ex,st){
  const n=ex.examLen||50, mins=Math.round(n*(ex.secsPerQ||90)/60);
  const last=st.mocks[st.mocks.length-1], best=st.mocks.reduce((m,h)=>Math.max(m,h.pct),0);
  return '<section class="xh-feature">'+
    '<div class="xh-f-body">'+
      '<span class="xh-kicker">'+esc(xt('rec'))+'</span>'+
      '<h3>'+esc(xt('simT'))+'</h3>'+
      '<p>'+esc(xt('simD'))+'</p>'+
      '<div class="xh-chips"><span>'+I.list+n+' '+esc(xt('qs'))+'</span><span>'+I.clock+mins+' '+esc(xt('min'))+'</span><span>'+I.target+passOf(ex)+'% '+esc(xt('toPass'))+'</span></div>'+
    '</div>'+
    '<div class="xh-f-side">'+
      (last?'<div class="xh-f-scores"><div><b>'+last.pct+'%</b><span>'+esc(xt('last'))+'</span></div><div><b>'+best+'%</b><span>'+esc(xt('best'))+'</span></div></div>':'')+
      '<button type="button" class="btn btn-primary xh-go" data-x="exam">'+I.play+'<span>'+esc(xt('start'))+'</span></button>'+
    '</div>'+
  '</section>';
}
function domains(ex,st){
  const counts=typeof domCounts==='function'?domCounts():{};
  const pm=passOf(ex);
  const rows=(ex.domains||[]).map(d=>{
    const o=st.dom[d.id], acc=o&&o.t>=5?Math.round(o.c/o.t*100):null;
    return {d,acc};
  });
  const known=rows.filter(r=>r.acc!=null);
  const weakest=known.length>1?known.reduce((a,b)=>b.acc<a.acc?b:a):null;
  return '<section class="xh-sec xh-doms-sec">'+
    '<div class="xh-h"><h3>'+esc(xt('domT'))+'</h3><p>'+esc(xt('domS'))+'</p></div>'+
    '<div class="xh-doms">'+rows.map(({d,acc})=>
      '<button type="button" class="xh-dom" data-dom="'+d.id+'">'+
        '<span class="xh-dn">'+d.id+'</span>'+
        '<span class="xh-dt"><b>'+esc(L(d,'name'))+(weakest&&weakest.d===d&&acc<pm?' <em>'+esc(xt('weak'))+'</em>':'')+'</b>'+
          '<small>'+esc(String(d.weight||'').replace('-','–'))+' '+esc(xt('ofExam'))+' · '+(counts[d.id]||0)+' '+esc(xt('qs'))+'</small></span>'+
        '<span class="xh-acc'+(acc==null?' none':'')+'" title="'+esc(xt('yourAcc'))+'">'+
          (acc==null?'<i>'+esc(xt('noData'))+'</i>':'<span class="xh-bar"><i style="width:'+acc+'%"></i><u style="left:'+pm+'%"></u></span><b>'+acc+'%</b>')+
        '</span>'+
        '<span class="xh-chev">'+I.chev+'</span>'+
      '</button>').join('')+
    '</div></section>';
}
function more(){
  const total=(typeof QUESTIONS!=='undefined'&&QUESTIONS)?QUESTIONS.length:0;
  const due=typeof srsDueCount==='function'?srsDueCount():0, bm=typeof bookmarkCount==='function'?bookmarkCount():0;
  const card=(x,ico,tk,dk,foot,on)=>'<button type="button" class="xh-mode" data-x="'+x+'"><span class="xh-mi">'+ico+'</span><b>'+esc(t(tk))+'</b><p>'+esc(t(dk))+'</p><span class="xh-foot'+(on?' on':'')+'">'+esc(foot)+'</span></button>';
  return '<section class="xh-sec xh-more-sec"><div class="xh-h"><h3>'+esc(xt('moreT'))+'</h3></div><div class="xh-more">'+
    card('all',I.all,'m3t','m3d',fmt(xt('allF'),{n:total}),false)+
    card('srs',I.srs,'m4t','m4d',due?fmt(xt('srsF'),{n:due}):xt('srsNone'),due>0)+
    card('bookmarks',I.bm,'m5t','m5d',bm?fmt(xt('bmF'),{n:bm}):xt('bmNone'),false)+
  '</div></section>';
}
function progress(ex,st){
  let body;
  if(!logged()){
    body='<div class="xh-empty"><span class="xh-mi">'+I.user+'</span><b>'+esc(xt('guestT'))+'</b><p>'+esc(xt('guestB'))+'</p>'+
      '<button type="button" class="btn btn-ghost btn-sm" data-x="login">'+esc(xt('signIn'))+'</button></div>';
  }else if(!st.mocks.length&&!Object.keys(st.dom).length){
    body='<p class="xh-muted">'+esc(fmt(xt('emptyB'),{code:ex.code}))+'</p>';
  }else{
    const m=st.mocks, pm=passOf(ex);
    const avg=m.length?Math.round(m.reduce((s,h)=>s+h.pct,0)/m.length):null;
    const best=m.reduce((x,h)=>Math.max(x,h.pct),0);
    const spark=m.slice(-8).map(h=>'<i class="'+(h.pct>=pm?'ok':'')+'" style="height:'+Math.max(6,h.pct)+'%" title="'+h.pct+'%"></i>').join('');
    const rd=readinessScore(ex);
    body='<div class="xh-kpis"><div><b>'+m.length+'</b><span>'+esc(xt('attempts'))+'</span></div><div><b>'+(m.length?best+'%':'–')+'</b><span>'+esc(xt('best'))+'</span></div><div><b>'+(avg!=null?avg+'%':'–')+'</b><span>'+esc(xt('avg'))+'</span></div></div>'+
      (m.length?'<div class="xh-spark" aria-hidden="true">'+spark+'<u style="bottom:'+pm+'%"><span>'+pm+'%</span></u></div>':'')+
      '<div class="xh-ready">'+(pro()&&rd!=null
        ?'<span>'+esc(xt('ready'))+'</span><b>'+rd+'%</b>'
        :'<span>'+esc(xt('ready'))+'</span><a href="/pro.html" class="xh-lock">'+I.lock+esc(xt('readyPro'))+'</a>')+'</div>';
  }
  return '<section class="xh-card xh-prog"><h4>'+esc(xt('progT'))+'</h4>'+body+'</section>';
}
function tools(){
  return '<section class="xh-card xh-tools"><h4>'+esc(xt('toolsT'))+'</h4>'+
    '<button type="button" class="xh-row" data-x="explore"><span class="xh-ri">'+I.search+'</span><span><b>'+esc(xt('catalog'))+(pro()?'':' <span class="pro-badge">PRO</span>')+'</b><small>'+esc(xt('catalogD'))+'</small></span>'+I.chev+'</button>'+
    '<button type="button" class="xh-row" data-x="plan"><span class="xh-ri">'+I.cal+'</span><span><b>'+esc(xt('plan'))+'</b><small>'+esc(xt('planD'))+'</small></span>'+I.chev+'</button>'+
  '</section>';
}

function render(){
  const home=$('#home'); if(!home||home.classList.contains('hidden')||typeof currentExam==='undefined'||!currentExam)return;
  const ex=currentExam, st=stats(ex);
  if(!home.classList.contains('xh-on'))home.classList.add('xh-on');
  // hero: exam icon next to the title, official name as subtitle
  const hero=home.querySelector('.card.hero');
  if(hero){
    let ic=hero.querySelector('.xh-hero-ico');
    if(!ic){ ic=document.createElement('div'); ic.className='xh-hero-ico'; hero.insertBefore(ic,hero.firstChild); }
    ic.innerHTML=typeof examIcon==='function'?examIcon(ex):'';
    let sub=hero.querySelector('.xh-hero-sub');
    if(!sub){ sub=document.createElement('div'); sub.className='xh-hero-sub'; const h2=hero.querySelector('h2'); if(h2)h2.insertAdjacentElement('afterend',sub); }
    sub.textContent=L(ex,'title');
  }
  let x=$('#xh');
  if(!x){ x=document.createElement('div'); x.id='xh'; x.className='xh'; const modes=$('#modes'); modes.parentNode.insertBefore(x,modes); }
  // keep the original quota pill alive across re-renders (it is updated by the main script)
  const q=home.querySelector('.quota-wrap'); if(q&&x.contains(q))home.appendChild(q);
  x.innerHTML='<div class="xh-main">'+feature(ex,st)+domains(ex,st)+more()+'</div>'+
    '<aside class="xh-side">'+progress(ex,st)+'<div class="xh-quota"></div>'+tools()+'</aside>';
  // the quota pill (free users) lives in the side column now
  if(q)x.querySelector('.xh-quota').appendChild(q);
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
/* hide the old layout once the new one is in place (the elements stay: their handlers are reused) */
'#home.xh-on #modes,#home.xh-on .explore-row,#home.xh-on #domPick,#home.xh-on #guestBanner{display:none !important}',
'#home.xh-on>.quota-wrap{display:none}',
/* hero: compact, left-aligned, with the exam icon */
'#home.xh-on .card.hero{display:grid;grid-template-columns:auto 1fr;column-gap:20px;align-items:center;text-align:left;padding:26px 28px;margin-bottom:18px}',
'#home.xh-on .card.hero>*{grid-column:2}',
'#home.xh-on .card.hero>.xh-hero-ico{grid-column:1;grid-row:1/span 3;align-self:center;width:64px;height:64px;border-radius:18px;display:grid;place-items:center;background:var(--accent-soft);color:var(--accent);border:1px solid color-mix(in srgb,var(--accent) 14%,transparent)}',
'#home.xh-on .xh-hero-ico svg{width:32px;height:32px}',
'#home.xh-on .card.hero h2{margin:2px 0 2px;font-size:28px;letter-spacing:-.02em}',
'#home.xh-on .xh-hero-sub{font-size:14px;color:var(--ink-3);font-weight:500}',
'#home.xh-on .card.hero>p{display:none}',
'#home.xh-on .card.hero .stats{justify-content:flex-start;margin-top:16px;gap:0}',
'#home.xh-on .card.hero .stat{text-align:left;padding:0 22px}#home.xh-on .card.hero .stat:first-child{padding-left:0}',
'#home.xh-on .card.hero .stat .n{font-size:20px}',
/* two columns */
'.xh{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:20px;align-items:start;margin-bottom:28px}',
'.xh-main{display:flex;flex-direction:column;gap:24px;min-width:0}',
'.xh-side{display:flex;flex-direction:column;gap:14px;position:sticky;top:84px}',
'.xh-h{margin:0 0 10px}.xh-h h3{font-size:17px;font-weight:700;letter-spacing:-.01em;margin:0}.xh-h p{margin:2px 0 0;font-size:13px;color:var(--ink-3)}',
/* featured mock exam */
'.xh-feature{display:flex;gap:24px;align-items:center;justify-content:space-between;padding:24px;border-radius:18px;background:var(--panel);border:1px solid color-mix(in srgb,var(--accent) 35%,var(--line));box-shadow:0 1px 0 var(--line),0 12px 32px rgba(15,108,189,.08);position:relative;overflow:hidden}',
'.xh-feature::before{content:"";position:absolute;inset:0 auto 0 0;width:4px;background:var(--accent)}',
'.xh-kicker{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--accent);margin-bottom:4px}',
'.xh-feature h3{font-size:21px;font-weight:700;letter-spacing:-.015em;margin:0 0 4px}',
'.xh-feature p{margin:0;font-size:14px;color:var(--ink-2);line-height:1.5;max-width:46ch}',
'.xh-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}',
'.xh-chips span{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:999px;background:var(--panel-2);border:1px solid var(--line);font-size:12.5px;font-weight:600;color:var(--ink-2)}',
'.xh-chips svg{color:var(--ink-3)}',
'.xh-f-side{display:flex;flex-direction:column;align-items:stretch;gap:12px;flex:none;min-width:200px}',
'.xh-f-scores{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
'.xh-f-scores div{padding:8px 10px;border-radius:12px;background:var(--panel-2);text-align:center}',
'.xh-f-scores b{display:block;font-size:18px;font-family:var(--mono)}.xh-f-scores span{font-size:11px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.04em}',
'.xh-go{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:13px 20px;font-size:15px;border-radius:12px}',
/* domains */
'.xh-doms{background:var(--panel);border:1px solid var(--line);border-radius:16px;overflow:hidden}',
'.xh-dom{display:grid;grid-template-columns:32px minmax(0,1fr) 150px 18px;align-items:center;gap:14px;width:100%;padding:14px 16px;text-align:left;font:inherit;color:var(--ink);background:none;cursor:pointer;transition:background .15s}',
'.xh-dom+.xh-dom{border-top:1px solid var(--line)}',
'.xh-dom:hover{background:var(--panel-2)}',
'.xh-dn{width:32px;height:32px;border-radius:9px;display:grid;place-items:center;background:var(--panel-2);border:1px solid var(--line);font-family:var(--mono);font-weight:700;font-size:13px;color:var(--ink-2)}',
'.xh-dom:hover .xh-dn{background:var(--accent-soft);color:var(--accent);border-color:transparent}',
'.xh-dt{min-width:0}.xh-dt b{display:block;font-size:14.5px;font-weight:600;line-height:1.35}',
'.xh-dt em{font-style:normal;font-size:10.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;padding:1px 7px;border-radius:999px;background:var(--panel-2);border:1px solid var(--line);color:var(--ink-2);margin-left:4px;vertical-align:1px}',
'.xh-dt small{display:block;margin-top:2px;font-size:12.5px;color:var(--ink-3)}',
'.xh-acc{display:flex;align-items:center;gap:10px}.xh-acc b{font-family:var(--mono);font-size:13px;min-width:36px;text-align:right}',
'.xh-acc.none i{font-style:normal;font-size:12px;color:var(--ink-3)}',
'.xh-bar{position:relative;flex:1;height:6px;border-radius:99px;background:var(--panel-2);overflow:visible}',
'.xh-bar i{position:absolute;left:0;top:0;bottom:0;border-radius:99px;background:var(--accent)}',
'.xh-bar u{position:absolute;top:-3px;bottom:-3px;width:2px;margin-left:-1px;background:var(--ink-3);opacity:.55;border-radius:2px}',
'.xh-chev{color:var(--ink-3);display:grid}',
/* other study modes */
'.xh-more{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}',
'.xh-mode{display:flex;flex-direction:column;align-items:flex-start;gap:4px;padding:18px;text-align:left;font:inherit;color:var(--ink);background:var(--panel);border:1px solid var(--line);border-radius:16px;cursor:pointer;transition:border-color .15s,box-shadow .15s,transform .15s}',
'.xh-mode:hover{border-color:color-mix(in srgb,var(--accent) 45%,var(--line));box-shadow:0 10px 26px rgba(16,24,40,.08);transform:translateY(-2px)}',
'.xh-mi{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:var(--accent-soft);color:var(--accent);margin-bottom:8px}',
'.xh-mode b{font-size:15px}.xh-mode p{margin:0;font-size:13px;color:var(--ink-2);line-height:1.45;flex:1}',
'.xh-foot{margin-top:10px;font-size:12px;font-weight:600;color:var(--ink-3)}.xh-foot.on{color:var(--accent)}',
/* side column */
'.xh-card{padding:18px;border-radius:16px;background:var(--panel);border:1px solid var(--line)}',
'.xh-card h4{font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--ink-3);margin:0 0 12px}',
'.xh-muted{margin:0;font-size:13.5px;line-height:1.5;color:var(--ink-2)}',
'.xh-empty{display:flex;flex-direction:column;align-items:flex-start;gap:4px}.xh-empty b{font-size:15px}.xh-empty p{margin:0 0 10px;font-size:13px;color:var(--ink-2);line-height:1.5}',
'.xh-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}',
'.xh-kpis div{padding:8px 4px;border-radius:10px;background:var(--panel-2);text-align:center}',
'.xh-kpis b{display:block;font-family:var(--mono);font-size:17px}.xh-kpis span{font-size:10.5px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.04em}',
'.xh-spark{position:relative;display:flex;align-items:flex-end;gap:5px;height:64px;margin:14px 0 4px;padding-top:4px}',
'.xh-spark i{flex:1;max-width:24px;border-radius:5px 5px 2px 2px;background:color-mix(in srgb,var(--accent) 35%,var(--panel-2))}',
'.xh-spark i.ok{background:var(--accent)}',
'.xh-spark u{position:absolute;left:0;right:0;height:0;border-top:1.5px dashed var(--ink-3);opacity:.6;text-decoration:none}',
'.xh-spark u span{position:absolute;right:0;top:-16px;font-size:10px;font-family:var(--mono);color:var(--ink-3)}',
'.xh-ready{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid var(--line);font-size:13px;color:var(--ink-2)}',
'.xh-ready b{font-family:var(--mono);font-size:17px;color:var(--ink)}',
'.xh-lock{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:600;color:var(--ink-3);text-decoration:none}.xh-lock:hover{color:var(--accent)}',
'.xh-quota:empty{display:none}.xh-quota .quota-wrap{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}',
'.xh-tools{padding:10px}.xh-tools h4{margin:8px 8px 6px}',
'.xh-row{display:grid;grid-template-columns:36px 1fr 16px;align-items:center;gap:12px;width:100%;padding:10px 8px;border-radius:12px;text-align:left;font:inherit;color:var(--ink);background:none;cursor:pointer}',
'.xh-row:hover{background:var(--panel-2)}.xh-row>svg{color:var(--ink-3)}',
'.xh-ri{width:36px;height:36px;border-radius:10px;display:grid;place-items:center;background:var(--panel-2);color:var(--ink-2)}',
'.xh-row b{display:flex;align-items:center;gap:6px;font-size:14px;font-weight:600}.xh-row small{display:block;font-size:12px;color:var(--ink-3)}',
/* narrower screens: one column, progress right after the mock exam */
'@media(max-width:980px){.xh{grid-template-columns:1fr}.xh-main,.xh-side{display:contents}.xh-side{position:static}.xh-feature{order:1}.xh-prog{order:2}.xh-quota{order:3}.xh-doms-sec{order:4}.xh-more-sec{order:5}.xh-tools{order:6}.xh{gap:20px}}',
'@media(max-width:760px){.xh-feature{flex-direction:column;align-items:stretch;gap:16px;padding:20px}.xh-f-side{min-width:0}.xh-more{grid-template-columns:1fr}.xh-dom{grid-template-columns:30px minmax(0,1fr) 16px;gap:12px;padding:13px 14px}.xh-acc{grid-column:2;grid-row:2;margin-top:-4px}.xh-chev{grid-column:3;grid-row:1/span 2}.xh-dn{grid-row:1/span 2;align-self:start}',
'#home.xh-on .card.hero{padding:20px;column-gap:14px}#home.xh-on .xh-hero-ico{width:48px;height:48px;border-radius:14px}#home.xh-on .xh-hero-ico svg{width:26px;height:26px}#home.xh-on .card.hero h2{font-size:22px}#home.xh-on .card.hero .stats{grid-column:1/-1}}',
/* phone app shell: other modes as list rows */
'html.m-app .xh-more{gap:0;background:var(--panel);border:1px solid var(--line);border-radius:16px;overflow:hidden}',
'html.m-app .xh-mode{display:grid;grid-template-columns:40px 1fr;column-gap:12px;row-gap:0;padding:14px;border:0;border-radius:0;box-shadow:none;transform:none}',
'html.m-app .xh-mode+.xh-mode{border-top:1px solid var(--line)}',
'html.m-app .xh-mode .xh-mi{grid-row:1/span 3;margin:0}html.m-app .xh-mode p{font-size:12.5px;color:var(--ink-3)}html.m-app .xh-mode .xh-foot{margin-top:4px}',
'html.m-app #home.xh-on .card.hero .stat{padding:0;text-align:center}',
'html.m-app #home.xh-on .card.hero{display:block}html.m-app #home.xh-on .card.hero>.xh-hero-ico{display:none}',
'html.m-app .xh-go{min-height:50px}',
'@media(prefers-reduced-motion:reduce){.xh-mode:hover{transform:none}}'
].join('\n');
document.head.appendChild(css);

render();
})();

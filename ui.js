/* EarnYourCert — modern layout: sticky header with navigation, wide catalog with a filter sidebar.
   Loaded after hero.js; uses the main script's globals (EXAMS, lang, esc, isPro, renderCatalog, filteredExams, ...). */
(function(){
'use strict';

const UT={
 es:{
  navExams:'Exámenes', navNews:'Novedades', navProgress:'Mi progreso', navPro:'Pro',
  search:'Buscar examen o código…', level:'Nivel', area:'Área', allArea:'Todas las áreas', allLevel:'Todos los niveles',
  areas:{azure:'Azure', m365:'Microsoft 365 y Copilot', security:'Seguridad', data:'Datos e IA'},
  lv:{fundamentals:'Fundamentals', associate:'Asociado', expert:'Experto', specialty:'Especialidad'},
  count:'{n} exámenes', count1:'1 examen', clear:'Limpiar filtros',
  proT:'Pro por 1,99 €/mes', proB:'Preguntas ilimitadas, panel de preparación, avisos de renovación y paquetes mensuales.', proCta:'Ver Pro',
  catTitle:'Elige tu examen'
 },
 en:{
  navExams:'Exams', navNews:'What\'s new', navProgress:'My progress', navPro:'Pro',
  search:'Search exam or code…', level:'Level', area:'Area', allArea:'All areas', allLevel:'All levels',
  areas:{azure:'Azure', m365:'Microsoft 365 & Copilot', security:'Security', data:'Data & AI'},
  lv:{fundamentals:'Fundamentals', associate:'Associate', expert:'Expert', specialty:'Specialty'},
  count:'{n} exams', count1:'1 exam', clear:'Clear filters',
  proT:'Pro for €1.99/month', proB:'Unlimited questions, readiness dashboard, renewal reminders and monthly packs.', proCta:'See Pro',
  catTitle:'Choose your exam'
 }
};
const ut=k=>(UT[lang]&&UT[lang][k])||UT.es[k];

// Área de cada examen (mismas familias que las páginas de categoría de la web)
const AREA={'az-900':'azure','az-104':'azure','az-305':'azure',
  'ab-900':'m365','ab-650':'m365','ms-102':'m365','md-102':'m365','ms-700':'m365','ms-721':'m365',
  'sc-900':'security','sc-300':'security','sc-200':'security','sc-500':'security',
  'pl-300':'data','dp-600':'data','ai-901':'data'};
const areaOf=ex=>AREA[ex.id]||(/^az/.test(ex.id)?'azure':/^sc/.test(ex.id)?'security':/^(pl|dp|ai)/.test(ex.id)?'data':'m365');
let area='';
window.uiAreaFilter=ex=>!area||areaOf(ex)===area;

const ICO={
  grid:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
  spark:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z"/></svg>',
  chart:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/></svg>',
  star:'<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/></svg>'
};

/* ---------- header navigation ---------- */
function buildNav(){
  const bar=document.querySelector('.topbar'); if(!bar)return;
  let nav=document.getElementById('uiNav');
  if(!nav){
    nav=document.createElement('nav'); nav.id='uiNav'; nav.className='ui-nav'; nav.setAttribute('aria-label','EarnYourCert');
    bar.insertBefore(nav,bar.querySelector('.tools'));
    nav.addEventListener('click',e=>{
      const b=e.target.closest('[data-nav]'); if(!b)return;
      const k=b.dataset.nav;
      if(k==='exams'){
        if(document.getElementById('catalog').classList.contains('hidden')&&window.navToCatalog)navToCatalog();
        setTimeout(()=>{const g=document.getElementById('uiCatLayout')||document.getElementById('examGrid'); if(g)g.scrollIntoView({behavior:'smooth',block:'start'});},60);
      }else if(k==='news'&&window.openNews){ openNews(); }
      else if(k==='progress'&&typeof openProgress==='function'){ openProgress(); }
    });
  }
  const pro=typeof isPro==='function'&&isPro();
  nav.innerHTML=
    '<button type="button" data-nav="exams">'+ICO.grid+'<span>'+esc(ut('navExams'))+'</span></button>'+
    '<button type="button" data-nav="news">'+ICO.spark+'<span>'+esc(ut('navNews'))+'</span></button>'+
    '<button type="button" data-nav="progress">'+ICO.chart+'<span>'+esc(ut('navProgress'))+'</span></button>'+
    (pro?'':'<a href="/pro.html" class="ui-nav-pro">'+ICO.star+'<span>'+esc(ut('navPro'))+'</span></a>');
  const onCat=!document.getElementById('catalog').classList.contains('hidden');
  document.body.classList.toggle('ui-on-catalog',onCat);
  const ex=nav.querySelector('[data-nav="exams"]'); if(ex)ex.classList.toggle('on',onCat);
}

/* ---------- catalog: sidebar + main column ---------- */
function chip(group,val,label,n,on){
  return '<button type="button" class="ui-chip'+(on?' on':'')+'" data-'+group+'="'+esc(val)+'"><span>'+esc(label)+'</span>'+(n!=null?'<em>'+n+'</em>':'')+'</button>';
}
function buildLayout(){
  const cat=document.getElementById('catalog'), grid=document.getElementById('examGrid'), tools=cat&&cat.querySelector('.cat-tools');
  if(!cat||!grid||!tools||document.getElementById('uiCatLayout'))return;
  const lay=document.createElement('div'); lay.id='uiCatLayout'; lay.className='ui-cat';
  lay.innerHTML='<aside class="ui-side" id="uiSide"></aside><div class="ui-main"><div class="ui-main-head" id="uiMainHead"></div></div>';
  tools.parentNode.insertBefore(lay,tools);
  const main=lay.querySelector('.ui-main');
  main.appendChild(grid);
  const side=lay.querySelector('#uiSide');
  const search=document.getElementById('catSearch');
  const sbox=document.createElement('div'); sbox.className='ui-search'; sbox.appendChild(search); side.appendChild(sbox);
  const groups=document.createElement('div'); groups.id='uiGroups'; side.appendChild(groups);
  const prog=document.getElementById('progressBtn'); if(prog){ prog.classList.add('ui-side-btn'); side.appendChild(prog); }
  const promo=document.createElement('div'); promo.id='uiPromo'; side.appendChild(promo);
  tools.classList.add('ui-hidden');
  // la cabecera "Elige tu examen" pasa a la columna principal
  const head=cat.querySelector('.cat-head'); if(head)head.classList.add('ui-hidden');
  side.addEventListener('click',e=>{
    const a=e.target.closest('[data-area]'), l=e.target.closest('[data-level]'), c=e.target.closest('[data-clear]');
    if(a){ area=a.dataset.area; renderCatalog(); }
    else if(l){ const sel=document.getElementById('catLevel'); sel.value=l.dataset.level; renderCatalog(); }
    else if(c){ area=''; document.getElementById('catLevel').value=''; search.value=''; renderCatalog(); }
  });
}
function renderSide(){
  const groups=document.getElementById('uiGroups'); if(!groups)return;
  const list=EXAMS.filter(e=>!e.soon);
  const lvSel=document.getElementById('catLevel').value;
  const areas=['azure','m365','security','data'];
  const levels=['fundamentals','associate','expert','specialty'].filter(l=>list.some(e=>e.level===l));
  groups.innerHTML=
    '<div class="ui-group"><h4>'+esc(ut('area'))+'</h4>'+
      chip('area','',ut('allArea'),list.length,!area)+
      areas.map(a=>chip('area',a,ut('areas')[a],list.filter(e=>areaOf(e)===a).length,area===a)).join('')+
    '</div>'+
    '<div class="ui-group"><h4>'+esc(ut('level'))+'</h4>'+
      chip('level','',ut('allLevel'),null,!lvSel)+
      levels.map(l=>chip('level',l,ut('lv')[l],list.filter(e=>e.level===l).length,lvSel===l)).join('')+
    '</div>';
  const s=document.getElementById('catSearch'); if(s)s.placeholder=ut('search');
  const promo=document.getElementById('uiPromo');
  if(promo){
    const pro=typeof isPro==='function'&&isPro();
    promo.innerHTML=pro?'':'<div class="ui-promo"><b>'+esc(ut('proT'))+'</b><p>'+esc(ut('proB'))+'</p><a href="/pro.html" class="btn btn-primary btn-sm">'+esc(ut('proCta'))+' →</a></div>';
  }
  const head=document.getElementById('uiMainHead');
  if(head){
    const n=typeof filteredExams==='function'?filteredExams().length:0;
    const active=!!(area||lvSel||(document.getElementById('catSearch').value||'').trim());
    head.innerHTML='<h2>'+esc(ut('catTitle'))+'</h2><span class="ui-count">'+esc(n===1?ut('count1'):ut('count').replace('{n}',n))+'</span>'+
      (active?'<button type="button" class="ui-clear" data-clear="1">'+esc(ut('clear'))+'</button>':'');
    const c=head.querySelector('[data-clear]');
    if(c)c.onclick=()=>{ area=''; document.getElementById('catLevel').value=''; document.getElementById('catSearch').value=''; renderCatalog(); };
  }
}

function measureHead(){ const t=document.querySelector('.topbar'); if(t)document.documentElement.style.setProperty('--ui-head-h',t.offsetHeight+'px'); }
window.addEventListener('resize',measureHead);
function uiRender(){
  try{ buildNav(); buildLayout(); renderSide(); measureHead(); }catch(e){ console.error('ui render',e); }
}
// renderCatalog() llama a heroRender() al empezar; nos colgamos de ahí
const origHero=window.heroRender;
window.heroRender=function(){ if(origHero)origHero(); uiRender(); };
// la búsqueda actualiza el contador de la columna principal
document.addEventListener('input',e=>{ if(e.target&&e.target.id==='catSearch')setTimeout(renderSide,0); });
document.addEventListener('click',e=>{ if(e.target.closest&&e.target.closest('#langToggle'))setTimeout(uiRender,80); });
// navegación activa al cambiar de pantalla
new MutationObserver(()=>buildNav()).observe(document.getElementById('catalog'),{attributes:true,attributeFilter:['class']});

const css=document.createElement('style');
css.textContent=[
/* page frame */
'body{background:var(--bg) radial-gradient(1200px 500px at 85% -120px,var(--accent-soft),transparent 70%) no-repeat}',
'.wrap{max-width:1440px;padding:0 clamp(16px,3vw,40px) 80px}',
'#home{max-width:1100px}',
'#home .modes{grid-template-columns:repeat(auto-fit,minmax(180px,1fr))}',
'.exam-head{top:var(--ui-head-h,64px);z-index:40}',
'@media(max-width:600px){#home .stats{display:grid;grid-template-columns:1fr 1fr;gap:16px 0}#home .stat{padding:0 8px}#home .stat + .stat:before{display:none}}',
'@media(max-width:1360px){.hstat-goal{display:none}}',
'@media(max-width:1100px){.header-stats{display:none}}',
'@media(max-width:760px){.exam-head{top:0}}',
'.site-footer{max-width:1200px}',
/* sticky header, full-bleed background */
'.topbar{position:sticky;top:0;z-index:60;margin:0 0 28px;padding:12px 0;gap:20px;background:color-mix(in srgb,var(--bg) 84%,transparent);backdrop-filter:saturate(1.6) blur(14px);-webkit-backdrop-filter:saturate(1.6) blur(14px);box-shadow:0 0 0 100vmax color-mix(in srgb,var(--bg) 84%,transparent),0 1px 0 100vmax var(--line);clip-path:inset(0 -100vmax -1px)}',
'.logo{width:38px;height:38px}.logo svg{width:34px;height:34px}',
'.brand{gap:10px;min-width:0}',
'.brand h1,.brand .brand-h{font-size:21px;letter-spacing:-.02em}',
'.brand .sub{font-size:12px;margin-top:1px;max-width:340px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
'.tools{gap:10px}',
'.ui-nav{display:flex;gap:4px;margin:0 auto;padding:4px;border:1px solid var(--line);border-radius:12px;background:var(--panel)}',
'.ui-nav button,.ui-nav a{display:inline-flex;align-items:center;gap:7px;padding:7px 13px;border-radius:9px;font:inherit;font-size:13.5px;font-weight:600;color:var(--ink-2);text-decoration:none;transition:background .15s,color .15s;white-space:nowrap}',
'.ui-nav button:hover,.ui-nav a:hover{background:var(--panel-2);color:var(--ink)}',
'.ui-nav button.on{background:var(--accent-soft);color:var(--accent)}',
'.ui-nav .ui-nav-pro{color:#A87400}.ui-nav .ui-nav-pro svg{color:#D4AF37}',
'html[data-theme="dark"] .ui-nav .ui-nav-pro{color:#E8C25A}',
'@media(max-width:1180px){.ui-nav span{display:none}.ui-nav button,.ui-nav a{padding:8px 10px}}',
/* mobile: the nav becomes a bottom tab bar */
'@media(max-width:760px){.brand .sub{display:none}',
'  .topbar{position:static;backdrop-filter:none;-webkit-backdrop-filter:none;clip-path:none;box-shadow:none;background:transparent}',
'  .ui-nav{position:fixed;left:0;right:0;bottom:0;z-index:70;margin:0;border-radius:0;border:0;border-top:1px solid var(--line);padding:6px 6px calc(6px + env(safe-area-inset-bottom));justify-content:space-around;background:color-mix(in srgb,var(--panel) 92%,transparent);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);box-shadow:0 -4px 20px rgba(16,24,40,.08)}',
'  .ui-nav button,.ui-nav a{flex:1;flex-direction:column;gap:3px;padding:6px 4px;font-size:11px}.ui-nav span{display:inline !important}',
'  body{padding-bottom:68px}.toast-wrap{bottom:84px}}',
/* exam home: tool buttons wrap instead of overflowing */
'@media(max-width:600px){.explore-row{flex-direction:column;align-items:stretch}.explore-btns{width:100%}.explore-btns .btn{flex:1 1 100%;justify-content:center;white-space:normal}}',
/* catalog layout */
'.ui-hidden{display:none !important}',
'.ui-cat{display:grid;grid-template-columns:260px minmax(0,1fr);gap:28px;align-items:start;margin-top:8px}',
'.ui-side{position:sticky;top:84px;display:flex;flex-direction:column;gap:18px;max-height:calc(100vh - 100px);overflow:auto;padding:2px 4px 8px 2px}',
'.ui-search .ex-search{width:100%;max-width:none;padding:11px 14px 11px 38px;border-radius:11px;border:1px solid var(--line);background-color:var(--panel);background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23727A83\' stroke-width=\'2\' stroke-linecap=\'round\'%3E%3Ccircle cx=\'11\' cy=\'11\' r=\'7\'/%3E%3Cpath d=\'M20 20l-3.5-3.5\'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:12px center;font:inherit;font-size:14px;color:var(--ink)}',
'.ui-search .ex-search:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}',
'.ui-group{display:flex;flex-direction:column;gap:3px}',
'.ui-group h4{font-size:11.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--ink-3);margin:0 0 6px 10px}',
'.ui-chip{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;padding:8px 10px;border-radius:9px;font:inherit;font-size:14px;color:var(--ink-2);text-align:left;transition:background .12s,color .12s}',
'.ui-chip:hover{background:var(--panel);color:var(--ink)}',
'.ui-chip em{font-style:normal;font-size:12px;font-weight:600;color:var(--ink-3);background:var(--panel-2);padding:1px 8px;border-radius:99px;min-width:26px;text-align:center}',
'.ui-chip.on{background:var(--accent-soft);color:var(--accent);font-weight:600}.ui-chip.on em{background:var(--accent);color:#fff}',
'html[data-theme="dark"] .ui-chip.on em{color:#04121F}',
'.ui-side-btn{width:100%;justify-content:center}',
'.ui-promo{padding:16px;border-radius:14px;background:var(--panel);border:1px solid var(--line);color:var(--ink)}',
'.ui-promo b{display:block;font-size:14.5px;margin-bottom:4px}.ui-promo p{font-size:12.5px;line-height:1.5;margin:0 0 12px;opacity:.85}',
'.ui-promo .btn{width:100%}',
'.ui-main{min-width:0}',
'.ui-main-head{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin:0 0 14px}',
'.ui-main-head h2{font-size:22px;font-weight:700;letter-spacing:-.02em;margin:0}',
'.ui-count{font-size:13.5px;color:var(--ink-3)}',
'.ui-clear{margin-left:auto;font:inherit;font-size:13px;font-weight:600;color:var(--accent);padding:4px 8px;border-radius:8px}.ui-clear:hover{background:var(--accent-soft)}',
/* denser, cleaner exam cards */
'.exam-grid{grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:16px}',
'.exam-card{padding:20px 20px 18px;gap:11px;border-radius:16px;box-shadow:0 1px 2px rgba(16,24,40,.04)}',
'.exam-card .ec-top{gap:12px;align-items:flex-start}',
'.exam-card .ec-logo{width:42px;height:42px;border-radius:11px}',
'.exam-card .ec-title{font-size:15.5px;line-height:1.3}',
'.exam-card .ec-desc{font-size:13px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;flex:0 0 auto}',
'.exam-card .ec-meta{gap:14px;padding-top:12px;margin-top:auto}',
'.exam-card .ec-meta .m .v{font-size:15px}.exam-card .ec-meta .m .k{font-size:10.5px}',
'.ec-badges .ec-badge:not(.level-b):not(.new-b):not(.ret-b):not(.wip-b):not(.soon-b){display:none}',
'.exam-card.coming-soon{padding:22px;flex-direction:row;gap:16px;text-align:left;justify-content:flex-start}',
'.exam-card.coming-soon .cs-sub{max-width:none}',
/* news strip and resume bar in the wide layout */
'#careerCatalog{margin-bottom:6px}',
'.cr-news-grid{grid-template-columns:repeat(auto-fit,minmax(280px,1fr)) !important}',
/* hero stats in one row, product preview spacing */
'.mkt-stats{display:flex !important;flex-wrap:wrap;gap:10px 30px !important}',
'.mkt-stat{padding:0 !important;border-left:0 !important}',
'.mkt-visual{padding-bottom:46px !important}.mv-float{bottom:0 !important;left:-28px !important}',
/* brand subtitle only inside an exam (it shows the exam title there) */
'body.ui-on-catalog .brand .sub{display:none}',
/* SEO text block: wider, two columns on large screens */
'.seo-intro{max-width:1200px;padding:28px 32px}',
'@media(min-width:1100px){.seo-intro{column-count:2;column-gap:44px}.seo-intro h2{column-span:all;margin-bottom:12px}.seo-intro h3,.seo-intro h2+p{break-inside:avoid}}',
'.reviews-section{max-width:1200px;margin-left:auto;margin-right:auto}',
/* responsive */
'@media(max-width:1000px){.ui-cat{grid-template-columns:minmax(0,1fr);gap:16px}.ui-side{position:static;max-height:none;overflow:visible;padding:0;min-width:0}.ui-group{min-width:0}',
'  .ui-group{flex-direction:row;flex-wrap:nowrap;overflow-x:auto;gap:6px;padding-bottom:4px;scrollbar-width:none}.ui-group::-webkit-scrollbar{display:none}',
'  .ui-group h4{display:none}.ui-chip{width:auto;flex:none;border:1px solid var(--line);background:var(--panel);border-radius:99px;padding:6px 12px}',
'  #uiPromo{display:none}.ui-side-btn{width:auto;align-self:flex-start}}',
'@media(max-width:600px){.topbar{margin-bottom:18px;padding:10px 0}.exam-grid{grid-template-columns:1fr}}'
].join('\n');
document.head.appendChild(css);

uiRender();
if(typeof renderCatalog==='function'&&!document.getElementById('catalog').classList.contains('hidden'))renderCatalog();
})();

/* EarnYourCert — marketing hero at the top of the catalog + visual polish.
   Loaded after the main script; uses its globals (EXAMS, lang, t, esc, isPro, isLoggedIn, selectExam, ...). */
(function(){
'use strict';

const HT={
 es:{
  eyebrow:'{n} exámenes nuevos · {month}',
  eyebrowNone:'Practica con preguntas como las del examen',
  title:'Exámenes de práctica de Microsoft como el examen real',
  sub:'Simulacros cronometrados, repaso inteligente y explicaciones en español e inglés, basados en las guías oficiales de Microsoft.',
  ctaNew:'Ver exámenes nuevos', ctaAll:'Ver todos los exámenes', ctaPro:'Hazte Pro', ctaCareer:'Mi carrera',
  newLabel:'Nuevos', q:'preguntas',
  sExams:'exámenes', sQuestions:'preguntas', sLangs:'idiomas', sFree:'preguntas gratis al día',
  filterOn:'Mostrando solo las novedades', filterOff:'Quitar filtro',
  vChip:'AZ-104 · Pregunta 18 de 50',
  vQ:'Una VM solo debe aceptar tráfico RDP desde la red corporativa. ¿Qué configuras?',
  vO:['Un grupo de seguridad de red (NSG) con una regla de entrada','Una ruta definida por el usuario (UDR)','Un punto de conexión privado','Azure Front Door con WAF'],
  vExp:'Correcto: un NSG filtra el tráfico entrante por IP de origen y puerto.',
  vReady:'Preparación estimada', vDom:'Redes virtuales'
 },
 en:{
  eyebrow:'{n} new exams · {month}',
  eyebrowNone:'Practice with exam-style questions',
  title:'Microsoft practice exams that feel like the real test',
  sub:'Timed mock exams, smart review and explanations in English and Spanish, based on Microsoft\'s official study guides.',
  ctaNew:'See new exams', ctaAll:'See all exams', ctaPro:'Go Pro', ctaCareer:'My career',
  newLabel:'New', q:'questions',
  sExams:'exams', sQuestions:'questions', sLangs:'languages', sFree:'free questions per day',
  filterOn:'Showing new exams only', filterOff:'Clear filter',
  vChip:'AZ-104 · Question 18 of 50',
  vQ:'A VM must only accept RDP traffic from the corporate network. What do you configure?',
  vO:['A network security group (NSG) with an inbound rule','A user-defined route (UDR)','A private endpoint','Azure Front Door with WAF'],
  vExp:'Correct: an NSG filters inbound traffic by source IP and port.',
  vReady:'Estimated readiness', vDom:'Virtual networking'
 }
};
const ht=k=>(HT[lang]&&HT[lang][k])||HT.es[k]||k;
const isNew=ex=>!ex.soon&&ex.newUntil&&new Date()<new Date(ex.newUntil);
let newOnly=false;

window.heroFilter=ex=>!newOnly||isNew(ex);
window.heroIsNew=isNew;

// Vista previa de producto (decorativa) para la columna derecha del hero
function visual(){
  const o=ht('vO');
  return '<div class="mkt-visual" aria-hidden="true">'+
    '<div class="mv-card">'+
      '<div class="mv-top"><span class="mv-chip">'+esc(ht('vChip'))+'</span><span class="mv-timer">⏱ 42:10</span></div>'+
      '<div class="mv-bar"><i style="width:36%"></i></div>'+
      '<p class="mv-q">'+esc(ht('vQ'))+'</p>'+
      o.map((x,i)=>'<div class="mv-opt'+(i===0?' ok':'')+'"><span>'+'ABCD'[i]+'</span>'+esc(x)+(i===0?'<b>✓</b>':'')+'</div>').join('')+
      '<div class="mv-exp">'+esc(ht('vExp'))+'</div>'+
    '</div>'+
    '<div class="mv-float">'+
      '<span>'+esc(ht('vReady'))+'</span><b>82%</b>'+
      '<div class="mv-ring"><i style="width:82%"></i></div>'+
      '<small>'+esc(ht('vDom'))+' · 9/10</small>'+
    '</div>'+
  '</div>';
}
function stat(v,l){return '<div class="mkt-stat"><b>'+esc(v)+'</b><span>'+esc(l)+'</span></div>';}

function heroRender(){
  const cat=document.getElementById('catalog'); if(!cat||typeof EXAMS==='undefined')return;
  document.body.classList.add('has-hero');
  let hero=document.getElementById('heroBanner');
  if(!hero){ hero=document.createElement('div'); hero.id='heroBanner'; hero.className='mkt'; cat.insertBefore(hero,cat.firstChild); }
  const fresh=EXAMS.filter(isNew);
  const total=EXAMS.reduce((s,e)=>s+(e.soon?0:(e.questionCount||0)),0);
  const real=EXAMS.filter(e=>!e.soon&&!(window.isRetired&&isRetired(e))).length;
  const month=new Date().toLocaleDateString(t('locale'),{month:'long',year:'numeric'});
  const eyebrow=fresh.length?ht('eyebrow').replace('{n}',fresh.length).replace('{month}',month):ht('eyebrowNone');
  const pro=typeof isPro==='function'&&isPro(), logged=typeof isLoggedIn==='function'&&isLoggedIn();
  const second=(pro&&logged)
    ?'<button type="button" class="mkt-btn ghost" id="heroCareer">'+esc(ht('ctaCareer'))+'</button>'
    :'<a class="mkt-btn gold" href="https://www.patreon.com/earnyourcert/membership" target="_blank" rel="noopener noreferrer">'+esc(ht('ctaPro'))+'</a>';
  hero.innerHTML=
    '<div class="mkt-main">'+
      (fresh.length
        ?'<button type="button" class="mkt-eyebrow" id="mktEyebrow"><i></i>'+esc(eyebrow)+'</button>'
        :'<span class="mkt-eyebrow"><i></i>'+esc(eyebrow)+'</span>')+
      '<h1>'+esc(ht('title'))+'</h1>'+
      '<p>'+esc(ht('sub'))+'</p>'+
      '<div class="mkt-cta">'+
        '<button type="button" class="mkt-btn primary" id="heroNew">'+esc(fresh.length?ht('ctaNew'):ht('ctaAll'))+'</button>'+second+
      '</div>'+
    '<div class="mkt-stats">'+
      stat(String(real),ht('sExams'))+
      stat((Math.floor(total/100)*100).toLocaleString(t('locale'))+'+',ht('sQuestions'))+
      stat('ES · EN',ht('sLangs'))+
      (pro?'':stat(String(typeof DAILY_LIMIT!=='undefined'?DAILY_LIMIT:20),ht('sFree')))+
    '</div>'+
    '</div>'+visual();
  const showNew=()=>{
    if(window.track)track('hero_new');
    newOnly=fresh.length>0; renderCatalog();
    const g=document.getElementById('examGrid'); if(g)g.scrollIntoView({behavior:'smooth',block:'start'});
  };
  hero.querySelector('#heroNew').onclick=showNew;
  const eb=hero.querySelector('#mktEyebrow'); if(eb)eb.onclick=showNew;
  const c=hero.querySelector('#heroCareer'); if(c)c.onclick=()=>{ if(window.track)track('hero_career'); openProgress(); };
  renderFilterBar();
}
function renderFilterBar(){
  const cat=document.getElementById('catalog'); if(!cat)return;
  let bar=document.getElementById('heroFilterBar');
  if(!newOnly){ if(bar)bar.remove(); return; }
  if(!bar){
    bar=document.createElement('div'); bar.id='heroFilterBar'; bar.className='mkt-filter';
    const grid=document.getElementById('examGrid'); grid.parentNode.insertBefore(bar,grid);
  }
  bar.innerHTML='<span>'+esc(ht('filterOn'))+'</span><button type="button" class="btn btn-ghost btn-sm">'+esc(ht('filterOff'))+'</button>';
  bar.querySelector('button').onclick=()=>{ newOnly=false; renderCatalog(); };
}
window.heroRender=heroRender;

const css=document.createElement('style');
css.textContent=[
'body.has-hero #patreonBanner{display:none}',
'body{overflow-x:clip}#gsiButton{max-width:calc(100vw - 32px);overflow:hidden}',
'.mkt{position:relative;overflow:hidden;display:flex;flex-direction:column;gap:26px;align-items:stretch;border-radius:20px;padding:34px 38px 26px;margin:0 0 22px;color:#fff;background:linear-gradient(135deg,#0A4A9A 0%,#0F6CBD 55%,#2886DE 100%);box-shadow:0 16px 44px rgba(15,108,189,.28)}',
'html[data-theme="dark"] .mkt{background:linear-gradient(135deg,#0B2540 0%,#12457A 60%,#1B5FA8 100%);box-shadow:0 16px 44px rgba(0,0,0,.45)}',
'.mkt::before{content:"";position:absolute;right:-90px;top:-110px;width:380px;height:380px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.22),rgba(255,255,255,0) 68%);pointer-events:none}',
'.mkt::after{content:"";position:absolute;left:-60px;bottom:-130px;width:300px;height:300px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.12),rgba(255,255,255,0) 70%);pointer-events:none}',
'.mkt-main{position:relative;z-index:1;min-width:0;display:flex;flex-direction:column;gap:14px;align-items:flex-start}',
'.mkt{display:grid !important;grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);gap:48px !important;align-items:center !important;padding:52px 56px !important;border-radius:24px !important}',
'.mkt .mkt-stats{margin-top:14px;align-self:stretch}',
'.mkt-visual{position:relative;z-index:1;justify-self:end;width:100%;max-width:470px;padding:8px 18px 34px 0}',
'.mv-card{background:#fff;color:#0D1520;border-radius:18px;padding:20px 20px 16px;box-shadow:0 30px 60px rgba(4,25,60,.35),0 2px 6px rgba(4,25,60,.2);transform:rotate(-1.2deg);display:flex;flex-direction:column;gap:9px;font-size:13px}',
'html[data-theme="dark"] .mv-card{background:#141B26;color:#E6EDF5}',
'.mv-top{display:flex;justify-content:space-between;align-items:center;gap:8px}',
'.mv-chip{font-family:var(--mono);font-size:11px;font-weight:600;color:#0F6CBD;background:#EAF3FB;padding:3px 9px;border-radius:99px}',
'html[data-theme="dark"] .mv-chip{background:#12304F;color:#7FB8EE}',
'.mv-timer{font-family:var(--mono);font-size:11.5px;font-weight:600;opacity:.7}',
'.mv-bar{height:4px;border-radius:9px;background:rgba(15,108,189,.12);overflow:hidden}.mv-bar i{display:block;height:100%;background:#0F6CBD;border-radius:9px}',
'.mv-q{margin:4px 0 2px !important;font-size:14px !important;font-weight:600;line-height:1.45 !important;color:inherit !important;opacity:1 !important}',
'.mv-opt{display:flex;align-items:center;gap:9px;padding:8px 10px;border:1px solid rgba(13,21,32,.12);border-radius:10px;font-size:12.5px;line-height:1.35}',
'html[data-theme="dark"] .mv-opt{border-color:rgba(255,255,255,.12)}',
'.mv-opt span{flex:none;width:20px;height:20px;border-radius:6px;display:grid;place-items:center;font-size:11px;font-weight:700;background:rgba(13,21,32,.06)}',
'html[data-theme="dark"] .mv-opt span{background:rgba(255,255,255,.08)}',
'.mv-opt.ok{border-color:#107C41;background:#E4F2EA}.mv-opt.ok span{background:#107C41;color:#fff}.mv-opt b{margin-left:auto;color:#107C41}',
'html[data-theme="dark"] .mv-opt.ok{background:#13301F;border-color:#4FC07E}html[data-theme="dark"] .mv-opt.ok b{color:#4FC07E}',
'.mv-exp{font-size:12px;line-height:1.45;padding:8px 10px;border-radius:9px;background:#F3F6FA;color:#3A4452;border-left:3px solid #107C41}',
'html[data-theme="dark"] .mv-exp{background:#1B2431;color:#B8C2CF}',
'.mv-float{position:absolute;left:-34px;bottom:0;background:#fff;color:#0D1520;border-radius:14px;padding:12px 14px;box-shadow:0 18px 40px rgba(4,25,60,.3);display:grid;grid-template-columns:auto auto;align-items:baseline;gap:2px 12px;min-width:190px}',
'html[data-theme="dark"] .mv-float{background:#1B2431;color:#E6EDF5}',
'.mv-float span{font-size:11.5px;opacity:.7}.mv-float b{font-size:20px;color:#107C41;text-align:right}',
'html[data-theme="dark"] .mv-float b{color:#4FC07E}',
'.mv-ring{grid-column:1/-1;height:6px;border-radius:9px;background:rgba(16,124,65,.15);overflow:hidden}.mv-ring i{display:block;height:100%;background:linear-gradient(90deg,#1E9E6A,#107C41)}',
'.mv-float small{grid-column:1/-1;font-size:11px;opacity:.65}',
'@media(max-width:1020px){.mkt{grid-template-columns:1fr !important;padding:34px 30px !important}.mkt-visual{display:none}}',
'@media(max-width:600px){.mkt{padding:26px 20px !important;gap:22px !important;border-radius:18px !important}}',
'.mkt-eyebrow{display:inline-flex;align-items:center;gap:8px;font:inherit;font-size:12.5px;font-weight:600;letter-spacing:.02em;color:#fff;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.28);padding:5px 12px;border-radius:99px;backdrop-filter:blur(4px)}',
'button.mkt-eyebrow{cursor:pointer;transition:background .15s}button.mkt-eyebrow:hover{background:rgba(255,255,255,.26)}button.mkt-eyebrow::after{content:"→";opacity:.8}',
'.mkt-eyebrow i{width:8px;height:8px;border-radius:50%;background:#7CF0A8;box-shadow:0 0 0 0 rgba(124,240,168,.7);animation:heroPulse 2s infinite}',
'@keyframes heroPulse{0%{box-shadow:0 0 0 0 rgba(124,240,168,.6)}70%{box-shadow:0 0 0 9px rgba(124,240,168,0)}100%{box-shadow:0 0 0 0 rgba(124,240,168,0)}}',
'.mkt h1{font-size:clamp(25px,3.6vw,38px);line-height:1.15;font-weight:700;letter-spacing:-.025em;margin:0;max-width:640px}',
'.mkt,.mkt-main{text-align:left}',
'.mkt h1,.mkt p{color:#fff}',
'.mkt p{margin:0;font-size:15.5px;line-height:1.6;opacity:.92;max-width:560px}',
'.mkt-cta{display:flex;gap:10px;flex-wrap:wrap;margin-top:4px}',
'.mkt-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:12px 22px;border-radius:12px;font:inherit;font-weight:600;font-size:14.5px;cursor:pointer;text-decoration:none;border:1px solid transparent;transition:transform .15s,box-shadow .2s,background .2s}',
'.mkt-btn:hover{transform:translateY(-2px)}',
'.mkt-btn.primary{background:#fff;color:#0A4A9A;box-shadow:0 6px 18px rgba(0,0,0,.18)}',
'.mkt-btn.ghost{background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.45);color:#fff}',
'.mkt-btn.ghost:hover{background:rgba(255,255,255,.22)}',
'.mkt-btn.gold{background:linear-gradient(135deg,#F7C948,#E0A800);color:#3D2A00;box-shadow:0 6px 18px rgba(224,168,0,.35)}',
'.mkt-stats{position:relative;z-index:1;display:flex;flex-wrap:wrap;gap:12px 0;padding-top:20px;border-top:1px solid rgba(255,255,255,.2)}',
'.mkt-stat{display:flex;align-items:baseline;gap:8px;padding:0 28px;border-left:1px solid rgba(255,255,255,.2)}',
'.mkt-stat:first-child{padding-left:0;border-left:0}',
'.mkt-stat b{font-size:20px;font-weight:700;letter-spacing:-.02em;line-height:1.1}',
'.mkt-stat span{font-size:13px;opacity:.8}',
'.mkt-filter{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:0 0 14px;padding:10px 14px;border-radius:var(--radius-s);background:var(--accent-soft);border:1px solid var(--accent);font-size:13.5px;color:var(--ink)}',
/* catalog polish */
'#catalog .cat-head{margin:6px 0 18px}',
'#catalog .cat-head h2{font-size:22px}',
'.exam-card{overflow:hidden}',
/* calm catalog: one accent for every card; the level is a neutral tag, not a colour */
'.exam-card .ec-logo,.exam-card[data-level] .ec-logo{background:var(--accent-soft);color:var(--accent);box-shadow:none;border:1px solid color-mix(in srgb,var(--accent) 14%,transparent)}',
'.exam-card .ec-logo svg{width:24px;height:24px}',
'.exam-card .ec-code{color:var(--ink-3);font-weight:600}',
'.exam-card:not(.coming-soon):hover{border-color:color-mix(in srgb,var(--accent) 45%,var(--line));box-shadow:0 12px 30px rgba(16,24,40,.10)}',
'.exam-card:not(.coming-soon):hover .ec-logo{transform:none}',
'.exam-card::before{display:none}',
'.ec-badge.level-b{background:var(--panel-2);color:var(--ink-2);border:1px solid var(--line)}',
/* most exams are recent: a "New" tag on almost every card is noise (they still sort first) */
'.exam-card .ec-badge.new-b{display:none}',
'.ec-ribbon{display:none}',
/* mobile fixes */
'@media(max-width:700px){.mkt{padding:26px 22px 22px;border-radius:16px;gap:22px}.mkt-stats{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}.mkt-stat{padding:0;border-left:0;flex-direction:column;gap:0}.mkt-stat b{font-size:19px}}',
'@media(max-width:600px){.cat-tools{flex-direction:column;align-items:stretch}.cat-filters{width:100%}.cat-filters .ex-search{max-width:none}.cat-filters .ex-dom{flex:0 0 140px}.cat-tools #progressBtn{margin-left:0;width:100%;justify-content:center}}',
'html[data-theme="dark"] .btn-primary,html[data-theme="dark"] #langToggle button.on,html[data-theme="dark"] .toggle button.on,html[data-theme="dark"] #quotaProLink,html[data-theme="dark"] .cr-step em,html[data-theme="dark"] .cr-dot{color:#04121F}',
'.pro-badge{color:#2A2000 !important}',
'html[data-theme="dark"] .support-btn,html[data-theme="dark"] #supportBtn,html[data-theme="dark"] #srsBadge,html[data-theme="dark"] .mode-badge{color:#04121F}',
'@media(prefers-reduced-motion:reduce){.mkt-eyebrow i{animation:none}.mkt-btn:hover{transform:none}}'
].join('\n');
document.head.appendChild(css);

document.addEventListener('click',e=>{ if(e.target.closest&&e.target.closest('#langToggle'))setTimeout(heroRender,50); });
heroRender();
if(typeof renderCatalog==='function'&&!document.getElementById('catalog').classList.contains('hidden'))renderCatalog();
})();

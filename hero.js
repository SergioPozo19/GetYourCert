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
  filterOn:'Mostrando solo las novedades', filterOff:'Quitar filtro'
 },
 en:{
  eyebrow:'{n} new exams · {month}',
  eyebrowNone:'Practice with exam-style questions',
  title:'Microsoft practice exams that feel like the real test',
  sub:'Timed mock exams, smart review and explanations in English and Spanish, based on Microsoft\'s official study guides.',
  ctaNew:'See new exams', ctaAll:'See all exams', ctaPro:'Go Pro', ctaCareer:'My career',
  newLabel:'New', q:'questions',
  sExams:'exams', sQuestions:'questions', sLangs:'languages', sFree:'free questions per day',
  filterOn:'Showing new exams only', filterOff:'Clear filter'
 }
};
const ht=k=>(HT[lang]&&HT[lang][k])||HT.es[k]||k;
const isNew=ex=>!ex.soon&&ex.newUntil&&new Date()<new Date(ex.newUntil);
let newOnly=false;

window.heroFilter=ex=>!newOnly||isNew(ex);
window.heroIsNew=isNew;

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
    '</div>'+
    '<div class="mkt-stats">'+
      stat(String(real),ht('sExams'))+
      stat((Math.floor(total/100)*100).toLocaleString(t('locale'))+'+',ht('sQuestions'))+
      stat('ES · EN',ht('sLangs'))+
      (pro?'':stat(String(typeof DAILY_LIMIT!=='undefined'?DAILY_LIMIT:20),ht('sFree')))+
    '</div>';
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
    const grid=document.getElementById('examGrid'); cat.insertBefore(bar,grid);
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
'.exam-card{overflow:hidden;--lv:var(--accent)}',
'.exam-card[data-level="fundamentals"]{--lv:#1E9E6A}.exam-card[data-level="associate"]{--lv:#0F6CBD}.exam-card[data-level="expert"]{--lv:#7A4FD6}.exam-card[data-level="specialty"]{--lv:#D9822B}',
'html[data-theme="dark"] .exam-card[data-level="fundamentals"]{--lv:#4FC07E}html[data-theme="dark"] .exam-card[data-level="associate"]{--lv:#4CA0E8}html[data-theme="dark"] .exam-card[data-level="expert"]{--lv:#A98BF0}html[data-theme="dark"] .exam-card[data-level="specialty"]{--lv:#F0A55C}',
'.exam-card[data-level]:not(.coming-soon){border-top:3px solid var(--lv)}',
'.exam-card[data-level]:not(.coming-soon):hover{border-top-color:var(--lv);border-color:var(--lv);box-shadow:0 18px 40px rgba(16,24,40,.14)}',
'.exam-card[data-level] .ec-logo{background:linear-gradient(135deg,var(--lv),color-mix(in srgb,var(--lv) 68%,#fff))}',
'.exam-card[data-level] .ec-code,.exam-card[data-level] .ec-go{color:var(--lv)}',
'.ec-ribbon{position:absolute;top:16px;right:-38px;transform:rotate(40deg);background:linear-gradient(135deg,#1E9E6A,#16875A);color:#fff;font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:4px 44px;box-shadow:0 2px 8px rgba(0,0,0,.2);pointer-events:none}',
'.exam-card.is-new .ec-badge.new-b{display:none}',
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

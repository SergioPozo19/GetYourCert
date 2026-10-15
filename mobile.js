/* EarnYourCert — native-feeling mobile app shell (phones only, <=760px).
   Loaded after ui.js; uses the main script's globals (lang, esc, isPro, isLoggedIn, Store, openLoginModal, ...).
   Desktop is untouched: every rule is scoped to html.m-app, which is only set on small screens. */
(function(){
'use strict';

const MT={
 es:{more:'Más', back:'Atrás', signIn:'Entrar', guest:'Invitado', guestSub:'Inicia sesión gratis para guardar tu progreso',
  plan:'Plan', planPro:'Pro · ilimitado', planFree:'Gratis · 5 preguntas al día',
  language:'Idioma', theme:'Tema', light:'Claro', dark:'Oscuro', goPro:'Hazte Pro · 1,99 €/mes',
  invite:'Invitar a un amigo', support:'Soporte', privacy:'Privacidad', logout:'Cerrar sesión', close:'Cerrar',
  questions:'Preguntas', finish:'Finalizar', readMore:'Leer más', readLess:'Leer menos', settings:'Ajustes'},
 en:{more:'More', back:'Back', signIn:'Sign in', guest:'Guest', guestSub:'Sign in for free to save your progress',
  plan:'Plan', planPro:'Pro · unlimited', planFree:'Free · 5 questions a day',
  language:'Language', theme:'Theme', light:'Light', dark:'Dark', goPro:'Go Pro · €1.99/month',
  invite:'Invite a friend', support:'Support', privacy:'Privacy', logout:'Sign out', close:'Close',
  questions:'Questions', finish:'Finish', readMore:'Read more', readLess:'Read less', settings:'Settings'}
};
const mt=k=>(MT[lang]&&MT[lang][k])||MT.es[k];
const $=s=>document.querySelector(s);
const mq=matchMedia('(max-width:760px), (pointer:coarse) and (max-height:500px)');
const on=()=>document.documentElement.classList.contains('m-app');

const ICO={
  back:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  more:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
  grid:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
  check:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
  chev:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>',
  star:'<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/></svg>',
  gift:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/></svg>',
  mail:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
  shield:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  out:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>'
};

/* ---------- which screen is showing ---------- */
const SCREENS=['exam','results','home','explore','progress','catalog'];
function screen(){
  for(const s of SCREENS){ const el=document.getElementById(s); if(el&&!el.classList.contains('hidden'))return s; }
  return 'catalog';
}
let lastScreen='';
function onScreen(){
  const s=screen();
  document.body.dataset.mscreen=s;
  document.body.classList.toggle('m-focus',on()&&s==='exam');
  if(s!==lastScreen){
    if(on()&&lastScreen&&s!=='catalog')window.scrollTo(0,0);
    if(on())syncHistory(s);
    closeGrid();
    lastScreen=s;
  }
  syncTabs(); syncFinish();
}

/* ---------- Android/iOS back gesture: one history entry while away from the catalog ---------- */
function syncHistory(s){
  const st=history.state||{};
  if(s!=='catalog'&&!st.m){ try{ history.pushState({m:1},''); }catch(e){} }
  else if(s==='catalog'&&st.m){ try{ history.back(); }catch(e){} }
}
function closeTopLayer(){
  if(document.body.classList.contains('m-sheet-open')){ closeSheet(); return true; }
  if(document.body.classList.contains('m-grid-open')){ closeGrid(); return true; }
  const cr=document.querySelector('.cr-modal'); if(cr){ const b=cr.querySelector('.cr-modal-head button'); if(b)b.click(); else cr.remove(); return true; }
  const m=document.querySelector('.modal-ov.show'); if(m){ const b=m.querySelector('.modal-close-btn')||m.querySelector('#cmCancel'); if(b){ b.click(); return true; } }
  return false;
}
function goBack(){
  const s=screen();
  if(s==='explore'){ const b=$('#backExplore'); if(b){ b.click(); return; } }
  if(s==='home'||s==='progress'||s==='results'){ window.navToCatalog&&navToCatalog(); return; }
  if(s==='exam'){ const q=$('#quitBtn'); if(q)q.click(); return; }
}
window.addEventListener('popstate',()=>{
  if(!on())return;
  const layer=closeTopLayer();
  if(screen()==='catalog')return;
  if(!layer)goBack();
  // still away from the catalog (layer closed, exam confirm shown, explore -> exam home): keep a back entry
  setTimeout(()=>{ if(screen()!=='catalog'&&!(history.state||{}).m){ try{ history.pushState({m:1},''); }catch(e){} } },50);
});

/* ---------- app bar ---------- */
function buildBar(){
  const bar=$('.topbar'); if(!bar||$('#mBack'))return;
  const back=document.createElement('button'); back.type='button'; back.id='mBack'; back.className='m-back'; back.innerHTML=ICO.back;
  back.addEventListener('click',e=>{ e.stopPropagation(); goBack(); });
  bar.insertBefore(back,bar.firstChild);
  const login=document.createElement('button'); login.type='button'; login.id='mLogin'; login.className='m-login';
  login.addEventListener('click',()=>{ if(typeof openLoginModal==='function')openLoginModal(); });
  const acc=$('#accountArea'); if(acc)acc.appendChild(login);
  // the avatar opens the settings sheet instead of doing nothing
  const info=document.querySelector('.account-info');
  if(info)info.addEventListener('click',e=>{ if(on()){ e.preventDefault(); openSheet(); } });
}
function syncBar(){
  const b=$('#mBack'); if(b)b.setAttribute('aria-label',mt('back'));
  const l=$('#mLogin'); if(l)l.textContent=mt('signIn');
}

/* ---------- bottom tabs: add "More", drop Pro (it lives in the sheet) ---------- */
function syncTabs(){
  const nav=$('#uiNav'); if(!nav)return;
  if(on()&&nav.parentNode!==document.body)document.body.appendChild(nav);
  if(!on()){ const bar=$('.topbar'), tools=bar&&bar.querySelector('.tools'); if(bar&&nav.parentNode!==bar)bar.insertBefore(nav,tools); }
  let more=nav.querySelector('[data-m="more"]');
  if(!more){
    more=document.createElement('button'); more.type='button'; more.dataset.m='more'; more.className='m-more-tab';
    more.addEventListener('click',openSheet); nav.appendChild(more);
  }
  more.innerHTML=ICO.more+'<span>'+esc(mt('more'))+'</span>';
  const s=screen();
  const set=(k,v)=>{ const x=nav.querySelector('[data-nav="'+k+'"]'); if(x)x.classList.toggle('on',v); };
  set('exams',s==='catalog'||s==='home'||s==='explore'||s==='results'); set('progress',s==='progress');
  more.classList.toggle('on',document.body.classList.contains('m-sheet-open'));
}

/* ---------- settings sheet ---------- */
function acct(){ try{ return JSON.parse(localStorage.getItem('gyc:account')||'null')||{}; }catch(e){ return {}; } }
function openSheet(){
  closeSheet(true);
  const logged=typeof isLoggedIn==='function'&&isLoggedIn(), pro=typeof isPro==='function'&&isPro();
  const a=acct(), name=a.name||a.email||'';
  const av=$('#accountAvatar'), src=av&&av.getAttribute('src');
  const dark=document.documentElement.getAttribute('data-theme')==='dark';
  const sh=document.createElement('div'); sh.id='mSheet'; sh.className='m-sheet';
  sh.innerHTML='<div class="m-sheet-box" role="dialog" aria-modal="true" aria-label="'+esc(mt('settings'))+'"><div class="m-grab"></div>'+
    '<div class="m-acc'+(logged&&pro?' pro':'')+'">'+
      (logged?'<img alt="" src="'+esc(src||'')+'">':'<span class="m-acc-ph">'+ICO.more+'</span>')+
      '<div><b>'+esc(logged?name:mt('guest'))+'</b><span>'+esc(logged?(pro?mt('planPro'):mt('planFree')):mt('guestSub'))+'</span></div>'+
      (logged?'':'<button type="button" class="btn btn-primary btn-sm" data-act="login">'+esc(mt('signIn'))+'</button>')+
    '</div>'+
    '<div class="m-list">'+
      '<div class="m-row"><span>'+esc(mt('language'))+'</span><div class="m-seg"><button type="button" data-lang-set="es" class="'+(lang==='es'?'on':'')+'">ES</button><button type="button" data-lang-set="en" class="'+(lang==='en'?'on':'')+'">EN</button></div></div>'+
      '<div class="m-row"><span>'+esc(mt('theme'))+'</span><div class="m-seg"><button type="button" data-theme-set="light" class="'+(dark?'':'on')+'">'+esc(mt('light'))+'</button><button type="button" data-theme-set="dark" class="'+(dark?'on':'')+'">'+esc(mt('dark'))+'</button></div></div>'+
    '</div>'+
    '<div class="m-list">'+
      (pro?'':'<a class="m-row m-link m-gold" href="/pro.html">'+ICO.star+'<span>'+esc(mt('goPro'))+'</span>'+ICO.chev+'</a>')+
      '<button type="button" class="m-row m-link" data-act="invite">'+ICO.gift+'<span>'+esc(mt('invite'))+'</span>'+ICO.chev+'</button>'+
      '<a class="m-row m-link" href="mailto:soporte@earnyourcert.com">'+ICO.mail+'<span>'+esc(mt('support'))+'</span>'+ICO.chev+'</a>'+
      '<a class="m-row m-link" href="/privacy.html">'+ICO.shield+'<span>'+esc(mt('privacy'))+'</span>'+ICO.chev+'</a>'+
      (logged?'<button type="button" class="m-row m-link m-danger" data-act="logout">'+ICO.out+'<span>'+esc(mt('logout'))+'</span></button>':'')+
    '</div>'+
  '</div>';
  document.body.appendChild(sh);
  const img=sh.querySelector('.m-acc img'); if(img&&av)img.onerror=()=>{ img.src=av.src; };
  sh.addEventListener('click',e=>{
    if(e.target===sh){ closeSheet(); return; }
    const l=e.target.closest('[data-lang-set]'), th=e.target.closest('[data-theme-set]'), act=e.target.closest('[data-act]');
    if(l){ const b=document.querySelector('#langToggle [data-lang="'+l.dataset.langSet+'"]'); if(b&&!b.classList.contains('on'))b.click(); setTimeout(openSheet,90); }
    else if(th){ const want=th.dataset.themeSet, cur=document.documentElement.getAttribute('data-theme')==='dark'?'dark':'light'; if(want!==cur)$('#themeBtn').click(); setTimeout(()=>{ openSheet(); syncThemeColor(); },60); }
    else if(act&&act.dataset.act==='login'){ closeSheet(); if(typeof openLoginModal==='function')openLoginModal(); }
    else if(act&&act.dataset.act==='invite'){ closeSheet(true); if(window.openInvite)openInvite(); }
    else if(act&&act.dataset.act==='logout'){ closeSheet(); $('#logoutBtn').click(); }
  });
  requestAnimationFrame(()=>{ sh.classList.add('show'); document.body.classList.add('m-sheet-open'); syncTabs(); });
}
function closeSheet(instant){
  const sh=$('#mSheet'); if(!sh)return;
  document.body.classList.remove('m-sheet-open'); syncTabs();
  if(instant){ sh.remove(); return; }
  sh.classList.remove('show'); setTimeout(()=>sh.remove(),220);
}

/* ---------- exam: bottom action bar, navigator sheet, finish button, swipe ---------- */
function buildExam(){
  const row=$('.nav-row'); if(!row||$('#mGridBtn'))return;
  const g=document.createElement('button'); g.type='button'; g.id='mGridBtn'; g.className='m-icon-btn'; g.innerHTML=ICO.grid;
  g.addEventListener('click',()=>document.body.classList.contains('m-grid-open')?closeGrid():openGrid());
  const mid=row.querySelector('.nav-mid'); if(mid)mid.appendChild(g);
  const f=document.createElement('button'); f.type='button'; f.id='mFinishBtn'; f.className='btn btn-primary btn-sm m-finish';
  f.addEventListener('click',()=>{ const s=$('#submitBtn'); if(s)s.click(); });
  row.appendChild(f);
  const scrim=document.createElement('div'); scrim.id='mScrim'; scrim.className='m-scrim'; scrim.addEventListener('click',closeGrid);
  document.body.appendChild(scrim);
  const cells=$('#cells'); if(cells)cells.addEventListener('click',e=>{ if(e.target.closest('.cell'))closeGrid(); });
  const sub=$('#submitBtn'); if(sub)sub.addEventListener('click',closeGrid);
  new MutationObserver(syncFinish).observe($('#nextBtn'),{attributes:true,attributeFilter:['style']});
  // swipe left/right on the question card to move between questions
  const card=$('.qcard'); if(!card)return;
  let sx=0,sy=0,st=0,ok=false;
  card.addEventListener('touchstart',e=>{
    const t=e.touches[0]; sx=t.clientX; sy=t.clientY; st=Date.now();
    ok=e.touches.length===1&&!e.target.closest('select,input,textarea,table,pre,.case-body,.disc-panel');
  },{passive:true});
  card.addEventListener('touchend',e=>{
    if(!ok||!on())return;
    const t=e.changedTouches[0], dx=t.clientX-sx, dy=t.clientY-sy;
    if(Date.now()-st>600||Math.abs(dx)<70||Math.abs(dy)>Math.abs(dx)*.6)return;
    const b=dx<0?$('#nextBtn'):$('#prevBtn');
    if(b&&!b.disabled&&b.style.visibility!=='hidden'){
      card.classList.remove('m-swl','m-swr'); void card.offsetWidth; card.classList.add(dx<0?'m-swl':'m-swr');
      b.click();
    }
  },{passive:true});
}
function syncFinish(){
  const f=$('#mFinishBtn'), n=$('#nextBtn'); if(!f||!n)return;
  f.textContent=mt('finish');
  document.body.classList.toggle('m-lastq',n.style.visibility==='hidden');
}
function openGrid(){ document.body.classList.add('m-grid-open'); const c=document.querySelector('#cells .cell.cur'); if(c)c.scrollIntoView({block:'nearest'}); }
function closeGrid(){ document.body.classList.remove('m-grid-open'); }

/* ---------- catalog: collapsible SEO text ---------- */
function buildSeo(){
  const s=$('.seo-intro'); if(!s||$('#mSeoMore'))return;
  const b=document.createElement('button'); b.type='button'; b.id='mSeoMore'; b.className='m-seo-more';
  b.addEventListener('click',()=>{ s.classList.toggle('m-open'); syncSeo(); });
  s.appendChild(b); syncSeo();
}
function syncSeo(){ const s=$('.seo-intro'), b=$('#mSeoMore'); if(s&&b)b.textContent=s.classList.contains('m-open')?mt('readLess'):mt('readMore'); }

/* ---------- browser chrome matches the app background ---------- */
function syncThemeColor(){
  const m=document.querySelector('meta[name="theme-color"]'); if(!m)return;
  if(!m.dataset.orig)m.dataset.orig=m.getAttribute('content');
  m.setAttribute('content',on()?getComputedStyle(document.body).backgroundColor||m.dataset.orig:m.dataset.orig);
}

function apply(){
  document.documentElement.classList.toggle('m-app',mq.matches);
  try{ buildBar(); buildExam(); buildSeo(); syncBar(); syncSeo(); onScreen(); syncThemeColor(); }catch(e){ console.error('mobile',e); }
}
mq.addEventListener?mq.addEventListener('change',apply):mq.addListener(apply);
const watch=new MutationObserver(onScreen);
SCREENS.forEach(s=>{ const el=document.getElementById(s); if(el)watch.observe(el,{attributes:true,attributeFilter:['class']}); });
// ui.js rebuilds the nav on every catalog render: re-add the "More" tab
const navWatch=new MutationObserver(()=>{ const n=$('#uiNav'); if(n&&!n.querySelector('[data-m="more"]'))syncTabs(); });
navWatch.observe(document.body,{childList:true,subtree:true});
document.addEventListener('click',e=>{ if(e.target.closest&&e.target.closest('#langToggle'))setTimeout(apply,120); });
document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&on())closeTopLayer(); });

const css=document.createElement('style');
css.textContent=[
'.m-back,.m-login,#uiNav .m-more-tab{display:none}',
'html.m-app #uiNav .m-more-tab{display:inline-flex}',
'@media(min-width:761px) and (max-width:900px){.brand .sub{display:none}.brand .brand-h{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.brand{min-width:0;flex:1 1 auto}.brand>div{min-width:0}.ui-nav{flex:none}}',
/* native touch basics */
'html.m-app{-webkit-tap-highlight-color:transparent}',
/* sheets scroll on their own without dragging the page behind; dvh = the visible area under Safari's toolbars */
'html.m-app #exam .gridnav,html.m-app .modal-ov .modal,html.m-app .cr-modal-box,.m-sheet-box{overscroll-behavior:contain;-webkit-overflow-scrolling:touch}',
'html.m-app,html.m-app body{height:auto;min-height:100%}',
'html.m-app body{background:var(--bg);padding-bottom:calc(72px + env(safe-area-inset-bottom))}',
'html.m-app button,html.m-app a,html.m-app .mode,html.m-app .exam-card{touch-action:manipulation;-webkit-user-select:none;user-select:none}',
'html.m-app input,html.m-app select,html.m-app textarea{font-size:16px !important}',
'html.m-app .wrap{padding:0 16px 24px}',
'html.m-app .exam-card:active,html.m-app .mode:active,html.m-app .cr-ncard:active,html.m-app .m-row.m-link:active{transform:scale(.985);background:var(--panel-2)}',
'html.m-app .btn:active{transform:scale(.97)}',
'html.m-app .back-cat,html.m-app #backProg,html.m-app #backExplore,html.m-app .kbd-hint,html.m-app #progressBtn{display:none !important}',

/* app bar */
'html.m-app .topbar{position:sticky;top:0;z-index:60;display:flex;flex-wrap:nowrap;align-items:center;gap:6px;height:calc(56px + env(safe-area-inset-top));padding:env(safe-area-inset-top) 0 0;margin:0 -16px 14px;padding-left:12px;padding-right:12px;background:color-mix(in srgb,var(--bg) 88%,transparent);backdrop-filter:saturate(1.6) blur(16px);-webkit-backdrop-filter:saturate(1.6) blur(16px);box-shadow:0 1px 0 var(--line);clip-path:none}',
'html.m-app .brand{flex:1 1 auto;min-width:0;gap:8px}',
'html.m-app .brand>div:last-child{min-width:0}',
'html.m-app .brand .brand-h{font-size:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
'html.m-app .brand .sub{display:none !important}',
'html.m-app .logo{width:32px;height:32px}html.m-app .logo svg{width:28px;height:28px}',
'html.m-app .m-back{display:none;width:40px;height:40px;margin-left:-6px;border-radius:12px;place-items:center;color:var(--ink);flex:none}',
'html.m-app .m-back:active{background:var(--panel-2)}',
'html.m-app body:not([data-mscreen="catalog"]):not([data-mscreen="progress"]) .m-back{display:grid}',
'html.m-app body:not([data-mscreen="catalog"]):not([data-mscreen="progress"]) .logo{display:none}',
'html.m-app .tools{gap:6px;flex:none}',
'html.m-app #langToggle{display:flex;height:34px;border-radius:99px;flex:none}',
'html.m-app #langToggle button{min-width:36px;padding:0 9px;font-size:12.5px}',
'html.m-app #themeBtn,html.m-app #logoutBtn,html.m-app .header-stats,html.m-app #gsiButton{display:none !important}',
'html.m-app .account-menu{gap:0}html.m-app .account-info{cursor:pointer}',
'html.m-app .account-avatar{width:34px !important;height:34px !important}',
'html.m-app .account-plan{display:none}',
'html.m-app .m-login{display:none;height:34px;padding:0 14px;border-radius:99px;background:var(--accent);color:#fff;font-weight:600;font-size:14px}',
'html[data-theme="dark"].m-app .m-login{color:#04121F}',
'html.m-app #accountMenu.hidden~.m-login{display:inline-flex;align-items:center}',

/* bottom tab bar */
'html.m-app .ui-nav{position:fixed;left:0;right:0;bottom:0;z-index:70;display:flex;margin:0;border:0;border-radius:0;border-top:1px solid var(--line);padding:4px 4px calc(4px + env(safe-area-inset-bottom));justify-content:space-around;background:color-mix(in srgb,var(--panel) 90%,transparent);backdrop-filter:saturate(1.6) blur(18px);-webkit-backdrop-filter:saturate(1.6) blur(18px);box-shadow:none}',
'html.m-app .ui-nav button,html.m-app .ui-nav a{flex:1;flex-direction:column;gap:2px;padding:6px 2px 4px;font-size:10.5px;font-weight:600;color:var(--ink-3);background:none !important;border-radius:12px}',
'html.m-app .ui-nav span{display:inline !important}',
'html.m-app .ui-nav svg{width:22px;height:22px;padding:2px 14px;box-sizing:content-box;border-radius:99px;transition:background .2s}',
'html.m-app .ui-nav .on{color:var(--accent) !important}',
'html.m-app .ui-nav .on svg{background:var(--accent-soft)}',
'html.m-app .ui-nav .ui-nav-pro{display:none}',
'html.m-app .toast-wrap{bottom:calc(76px + env(safe-area-inset-bottom))}',

/* catalog: compact hero */
'html.m-app .mkt{display:flex !important;flex-direction:column;gap:14px !important;padding:22px 20px !important;border-radius:20px !important;margin-bottom:18px}',
'html.m-app .mkt h1{font-size:23px !important;line-height:1.18 !important}',
'html.m-app .mkt-main>p{font-size:14px !important;line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
'html.m-app .mkt-main{gap:10px !important}',
'html.m-app .mkt-eyebrow{font-size:12px !important}',
'html.m-app .mkt-cta{display:grid !important;grid-template-columns:1fr 1fr;gap:8px;width:100%}',
'html.m-app .mkt-btn{width:100%;padding:11px 8px !important;font-size:14px !important;text-align:center;justify-content:center;white-space:nowrap;border-radius:14px !important}',
'html.m-app .mkt-cta>:only-child{grid-column:1/-1}',
'html.m-app .mkt-stats{gap:6px 18px !important;margin-top:4px !important;padding-top:14px !important}',
'html.m-app .mkt-stat:nth-child(n+4){display:none}',
'html.m-app .mkt-stat b{font-size:18px !important}html.m-app .mkt-stat span{font-size:12px !important}',
/* news: swipeable cards */
'html.m-app .cr-news-head{align-items:center}html.m-app .cr-news-head p{display:none}',
'html.m-app .cr-news-grid{display:flex !important;gap:10px;overflow-x:auto;scroll-snap-type:x mandatory;margin:0 -16px;padding:2px 16px 6px;scrollbar-width:none}',
'html.m-app .cr-news-grid::-webkit-scrollbar{display:none}',
'html.m-app .cr-news-grid>*{flex:0 0 82%;scroll-snap-align:start;scroll-margin-left:16px}',
/* filters: search + chip rows */
'html.m-app .ui-cat{gap:12px;margin-top:0}',
'html.m-app .ui-side{gap:10px}',
'html.m-app .ui-search .ex-search{padding:12px 14px 12px 40px;border-radius:14px}',
'html.m-app .ui-group{margin:0 -16px;padding:0 16px 2px}',
'html.m-app .ui-chip{padding:7px 13px;font-size:13.5px}',
'html.m-app .ui-main-head{margin:4px 0 8px}html.m-app .ui-main-head h2{font-size:19px}',
/* exam list: native rows inside one grouped card */
'html.m-app .exam-grid{display:flex !important;flex-direction:column;gap:0 !important;background:var(--panel);border:1px solid var(--line);border-radius:18px;overflow:hidden}',
'html.m-app .exam-card{display:grid !important;grid-template-columns:1fr auto;align-items:center;gap:2px 10px !important;padding:12px 14px !important;border:0 !important;border-radius:0 !important;box-shadow:none !important;background:transparent;transform:none;animation:none !important;opacity:1 !important}',
'html.m-app .exam-card+.exam-card{box-shadow:inset 0 1px 0 var(--line-2) !important}',
'html.m-app .exam-card::after{content:"";grid-column:2;grid-row:1/span 2;width:8px;height:8px;border-right:2px solid var(--ink-3);border-top:2px solid var(--ink-3);transform:rotate(45deg);margin-right:4px;opacity:.6}',
'html.m-app .exam-card .ec-top{grid-column:1;gap:12px !important;align-items:center !important}',
'html.m-app .exam-card .ec-logo{width:40px !important;height:40px !important;border-radius:11px !important;flex:none}',
'html.m-app .exam-card .ec-code{font-size:12px}',
'html.m-app .exam-card .ec-title{font-size:14.5px !important;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
'html.m-app .exam-card .ec-badges{grid-column:1;padding-left:52px;gap:4px}',
'html.m-app .exam-card .ec-badges:empty{display:none}',
'html.m-app .exam-card .ec-badge{font-size:10.5px;padding:2px 7px}',
'html.m-app .exam-card .ec-desc,html.m-app .exam-card .ec-meta,html.m-app .exam-card .ec-go,html.m-app .exam-card .ec-ribbon{display:none !important}',
'html.m-app .exam-card.coming-soon{grid-template-columns:auto 1fr;padding:16px 14px !important}',
'html.m-app .exam-card.coming-soon::after{display:none}',
'html.m-app .exam-card.coming-soon .cs-icon{grid-row:1/span 2}html.m-app .exam-card.coming-soon .cs-title{font-size:14.5px}html.m-app .exam-card.coming-soon .cs-sub{font-size:12.5px}',
/* reviews: swipeable */
'html.m-app .reviews-grid{display:flex !important;gap:10px;overflow-x:auto;scroll-snap-type:x mandatory;margin:0 -16px;padding:2px 16px 6px;scrollbar-width:none}',
'html.m-app .reviews-grid::-webkit-scrollbar{display:none}',
'html.m-app .reviews-grid>*{flex:0 0 85%;scroll-snap-align:start;scroll-margin-left:16px}',
/* SEO text: collapsed by default */
'html.m-app .seo-intro{position:relative;padding:18px !important;max-height:210px;overflow:hidden;column-count:1 !important}',
'html.m-app .seo-intro.m-open{max-height:none;padding-bottom:56px !important}',
'html.m-app .seo-intro:not(.m-open)::after{content:"";position:absolute;left:0;right:0;bottom:0;height:90px;background:linear-gradient(transparent,var(--panel) 70%);pointer-events:none}',
'html.m-app .m-seo-more{position:absolute;left:50%;bottom:12px;transform:translateX(-50%);z-index:1;padding:8px 16px;border-radius:99px;border:1px solid var(--line);background:var(--panel);font-weight:600;font-size:13.5px;color:var(--accent)}',
/* footer: only on the catalog, compact */
'html.m-app body:not([data-mscreen="catalog"]) .site-footer{display:none}',
'html.m-app .site-footer{padding:22px 16px calc(24px + env(safe-area-inset-bottom));font-size:12.5px}',
'html.m-app .seo-exams-list a{font-size:12px}',

/* exam home */
'html.m-app #home .hero{padding:20px 18px;text-align:left;border-radius:20px}',
'html.m-app #home .hero h2{font-size:22px;margin:4px 0 6px}',
'html.m-app #home .hero p{font-size:14px;margin:0}',
'html.m-app #home .hero .eyebrow{font-size:11px}',
'html.m-app #home .stats{display:grid !important;grid-template-columns:repeat(4,1fr);gap:0 !important;margin-top:16px;padding-top:14px;border-top:1px solid var(--line)}',
'html.m-app #home .stat{padding:0 !important;text-align:center}html.m-app #home .stat .n{font-size:19px}html.m-app #home .stat .l{font-size:10px;letter-spacing:.02em}',
'html.m-app #home .stat+.stat:before{display:none !important}',
'html.m-app .explore-row{flex-direction:column;align-items:stretch;gap:10px;margin:14px 0}',
'html.m-app .explore-btns{display:grid !important;grid-template-columns:1fr 1fr;gap:8px;width:100%}',
'html.m-app .explore-btns .btn{flex-direction:column;gap:6px;padding:14px 8px;font-size:13px;line-height:1.25;white-space:normal;text-align:center;border-radius:16px;height:100%}',
'html.m-app .explore-btns .btn .pro-badge{position:absolute;top:8px;right:8px}html.m-app .explore-btns .btn{position:relative}',
'html.m-app .quota-wrap{justify-content:space-between}',
'html.m-app #home .modes{display:flex !important;flex-direction:column;gap:0 !important;background:var(--panel);border:1px solid var(--line);border-radius:18px;overflow:hidden}',
'html.m-app #home .mode{display:grid;grid-template-columns:40px 1fr auto;grid-template-rows:auto auto;column-gap:12px;align-items:center;padding:14px;border:0;border-radius:0;box-shadow:none;background:transparent}',
'html.m-app #home .mode+.mode{box-shadow:inset 0 1px 0 var(--line-2)}',
'html.m-app #home .mode .mi{grid-row:1/span 2;margin:0;width:40px;height:40px;border-radius:12px}',
'html.m-app #home .mode h3{font-size:15px;margin:0;display:flex;align-items:center;gap:6px}',
'html.m-app #home .mode p{grid-column:2;font-size:12.5px;line-height:1.4;color:var(--ink-3);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
'html.m-app #home .mode::after{content:"";grid-column:3;grid-row:1/span 2;width:8px;height:8px;border-right:2px solid var(--ink-3);border-top:2px solid var(--ink-3);transform:rotate(45deg);margin-right:4px;opacity:.6}',
'html.m-app #home .mode.sel{background:transparent;outline:0}',
'html.m-app .dom-pick{margin-top:12px;border-radius:18px}',

/* finger-sized targets */
'html.m-app .ui-clear,html.m-app #quotaProLink{min-height:40px;display:inline-flex;align-items:center;padding:0 12px}',
'html.m-app .exq-bm{min-width:40px;min-height:40px;display:inline-grid;place-items:center}',
'html.m-app #obSkipBtn{min-height:40px;padding:0 12px}',
'html.m-app .ob-dot{position:relative}html.m-app .ob-dot::after{content:"";position:absolute;inset:-12px -6px}',
/* question types */
'html.m-app .row-q{padding:14px;gap:12px}',
'html.m-app .row-label{min-width:0;flex:1 1 100%}',
'html.m-app .row-q .yn-group{width:100%}',
'html.m-app .row-q .yn-btn{flex:1;height:46px;font-size:15px}',
'html.m-app .row-q .dd-wrap,html.m-app .row-q .dd-select{width:100%;margin:0}',
'html.m-app .row-q .dd-select,html.m-app .sentence-q .dd-select{min-height:44px}',
'html.m-app .ord-btns button{width:40px;height:40px}',
'html.m-app .sentence-q .dd-wrap{display:flex;flex-wrap:wrap;width:100%;max-width:100%;margin:6px 0}',
'html.m-app .dd-wrap{max-width:100%;min-width:0}',
'html.m-app .dd-select{max-width:100%;min-width:0;text-overflow:ellipsis}',
'html.m-app .sentence-q .dd-select{width:100%}',
'html.m-app .dd-answer{white-space:normal;line-height:1.4}',
/* renewal chip and other pills may wrap instead of overflowing */
'html.m-app .cr-chip{white-space:normal}',
/* onboarding keeps its own edge-to-edge layout inside the sheet */
'html.m-app .modal-ov .onboard-modal{padding:22px 0 env(safe-area-inset-bottom)}',
/* toasts move to the top while a sheet is open so they do not cover its buttons */
'html.m-app body:has(.modal-ov.show) .toast-wrap,html.m-app body:has(.cr-modal) .toast-wrap,html.m-app body.m-sheet-open .toast-wrap,html.m-app body.m-grid-open .toast-wrap{bottom:auto;top:calc(12px + env(safe-area-inset-top))}',
/* exam: full-screen focus mode */
'html.m-app body.m-focus{padding-bottom:calc(88px + env(safe-area-inset-bottom))}',
'html.m-app body.m-focus .topbar,html.m-app body.m-focus .ui-nav,html.m-app body.m-focus #patreonBanner{display:none !important}',
'html.m-app #exam .exam-head{position:sticky;top:0;margin:0 -16px 12px;padding:calc(10px + env(safe-area-inset-top)) 16px 10px;background:color-mix(in srgb,var(--bg) 90%,transparent);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border-bottom:1px solid var(--line)}',
'html.m-app #exam .exam-head .row1{gap:8px;align-items:center}',
'html.m-app #exam .exam-head .pill.dom{max-width:44vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
'html.m-app #quitBtn{margin:0;order:-1;font-size:0;width:36px;height:36px;padding:0;border-radius:12px;display:grid;place-items:center}',
'html.m-app #quitBtn::before{content:"";width:16px;height:16px;background:currentColor;-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'black\' stroke-width=\'2.6\' stroke-linecap=\'round\'%3E%3Cpath d=\'M6 6l12 12M18 6L6 18\'/%3E%3C/svg%3E") center/contain no-repeat;mask:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'black\' stroke-width=\'2.6\' stroke-linecap=\'round\'%3E%3Cpath d=\'M6 6l12 12M18 6L6 18\'/%3E%3C/svg%3E") center/contain no-repeat}',
'html.m-app #exam .exam-head .progress{margin-top:10px;height:5px}',
'html.m-app .qcard{padding:18px 16px;border-radius:20px}',
'html.m-app .qtext{font-size:16.5px;line-height:1.5}',
'html.m-app #opts .opt{padding:14px;border-radius:14px;min-height:52px;font-size:15px}',
'html.m-app .qcard.m-swl{animation:mSwL .22s ease-out}html.m-app .qcard.m-swr{animation:mSwR .22s ease-out}',
'@keyframes mSwL{from{transform:translateX(28px);opacity:.4}to{transform:none;opacity:1}}',
'@keyframes mSwR{from{transform:translateX(-28px);opacity:.4}to{transform:none;opacity:1}}',
'html.m-app #exam .nav-row{position:fixed;left:0;right:0;bottom:0;z-index:70;margin:0;padding:10px 12px calc(10px + env(safe-area-inset-bottom));gap:8px;background:color-mix(in srgb,var(--panel) 92%,transparent);backdrop-filter:saturate(1.6) blur(18px);-webkit-backdrop-filter:saturate(1.6) blur(18px);border-top:1px solid var(--line)}',
'html.m-app #exam .nav-row>.btn{height:46px;border-radius:14px;font-size:15px}',
'html.m-app #prevBtn{width:46px;padding:0;justify-content:center}html.m-app #prevBtn span{display:none}',
'html.m-app #nextBtn,html.m-app .m-finish{flex:1;max-width:170px;justify-content:center}',
'html.m-app .nav-mid{flex:1;justify-content:center;gap:4px !important}',
'html.m-app .nav-mid .flag-btn{width:44px;height:44px;padding:0;justify-content:center;border-radius:12px}',
'html.m-app .nav-mid .flag-btn span{display:none}',
'html.m-app .m-icon-btn{width:44px;height:44px;border-radius:12px;display:grid;place-items:center;color:var(--ink-2);border:1px solid var(--line);background:var(--panel)}',
'html.m-app .m-finish{display:none}',
'html.m-app body.m-lastq .m-finish{display:inline-flex}',
'html.m-app body.m-lastq #nextBtn{display:none}',
/* navigator: bottom sheet */
'html.m-app #exam .gridnav{position:fixed;left:0;right:0;bottom:0;z-index:90;margin:0;max-height:72vh;overflow:auto;border-radius:22px 22px 0 0;padding:26px 18px calc(18px + env(safe-area-inset-bottom));transform:translateY(105%);transition:transform .26s cubic-bezier(.2,.8,.2,1);box-shadow:0 -12px 40px rgba(0,0,0,.18)}',
'html.m-app #exam .gridnav::before{content:"";position:absolute;top:9px;left:50%;width:38px;height:5px;margin-left:-19px;border-radius:99px;background:var(--line)}',
'html.m-app body.m-grid-open #exam .gridnav{transform:none}',
'html.m-app .cells{grid-template-columns:repeat(7,1fr) !important;gap:7px}',
'html.m-app #exam .gridnav>div:last-child{position:sticky;bottom:calc(-18px - env(safe-area-inset-bottom));margin:14px -18px calc(-18px - env(safe-area-inset-bottom)) !important;padding:12px 18px calc(18px + env(safe-area-inset-bottom));background:var(--panel);border-top:1px solid var(--line-2)}',
'html.m-app .cell{font-size:14px;border-radius:10px}',
'html.m-app .gridnav #submitBtn{width:100%;height:48px;border-radius:14px}',
'.m-scrim{display:none}',
'html.m-app .m-scrim{display:block;position:fixed;inset:0;z-index:85;background:rgba(10,14,20,.45);opacity:0;pointer-events:none;transition:opacity .2s}',
'html.m-app body.m-grid-open .m-scrim{opacity:1;pointer-events:auto}',

/* results */
'html.m-app .result-hero{padding:22px 16px;border-radius:20px}',
'html.m-app .score-ring svg{width:140px;height:140px}',
'html.m-app .r-actions{display:grid !important;grid-template-columns:1fr 1fr;gap:8px !important}',
'html.m-app .r-actions>.btn{width:100%;justify-content:center;font-size:13.5px;padding:11px 8px;white-space:normal;line-height:1.25}',
'html.m-app .r-actions>#retryBtn{grid-column:1/-1;height:48px;font-size:15px}',
'html.m-app .r-actions>.hidden{display:none !important}',
'html.m-app .review-head{position:sticky;top:calc(56px + env(safe-area-inset-top));z-index:30;background:var(--bg);padding:10px 0;margin:0 -16px;padding-left:16px;padding-right:16px;flex-wrap:wrap;gap:8px}',
'html.m-app .filter-tabs{width:100%;display:grid !important;grid-template-columns:repeat(3,1fr)}',

/* every dialog becomes a bottom sheet */
'html.m-app .modal-ov{align-items:flex-end}',
'html.m-app .modal-ov .modal{width:100%;max-width:none;max-height:90vh;overflow:auto;border-radius:22px 22px 0 0;border:0;padding:28px 20px calc(20px + env(safe-area-inset-bottom));transform:translateY(100%);transition:transform .26s cubic-bezier(.2,.8,.2,1);position:relative}',
'html.m-app .modal-ov .modal::before{content:"";position:absolute;top:9px;left:50%;width:38px;height:5px;margin-left:-19px;border-radius:99px;background:var(--line)}',
'html.m-app .modal-ov.show .modal{transform:none}',
'html.m-app .modal-actions{flex-direction:column-reverse;gap:8px}html.m-app .modal-actions .btn{width:100%;height:46px;justify-content:center}',
'html.m-app .cr-modal{align-items:flex-end;padding:0}',
'html.m-app .cr-modal-box{max-width:none;max-height:90vh;border-radius:22px 22px 0 0;padding-bottom:env(safe-area-inset-bottom);animation:mUp .26s cubic-bezier(.2,.8,.2,1)}',
'html.m-app .cr-modal-head{padding:22px 18px 12px;position:relative}',
'html.m-app .cr-modal-head::before{content:"";position:absolute;top:9px;left:50%;width:38px;height:5px;margin-left:-19px;border-radius:99px;background:var(--line)}',
'@keyframes mUp{from{transform:translateY(100%)}to{transform:none}}',

/* settings sheet */
'.m-sheet{position:fixed;inset:0;z-index:150;display:flex;align-items:flex-end;background:rgba(10,14,20,0);transition:background .22s}',
'.m-sheet.show{background:rgba(10,14,20,.45)}',
'.m-sheet-box{position:relative;width:100%;max-height:88vh;overflow:auto;background:var(--bg);border-radius:22px 22px 0 0;padding:26px 16px calc(20px + env(safe-area-inset-bottom));transform:translateY(100%);transition:transform .26s cubic-bezier(.2,.8,.2,1)}',
'.m-sheet.show .m-sheet-box{transform:none}',
'.m-grab{position:absolute;top:9px;left:50%;width:38px;height:5px;margin-left:-19px;border-radius:99px;background:var(--line)}',
'.m-acc{display:flex;align-items:center;gap:12px;padding:14px;background:var(--panel);border:1px solid var(--line);border-radius:18px;margin-bottom:14px}',
'.m-acc.pro{background:linear-gradient(150deg,#FFFBEA,#F6E6B4);border-color:#EBD38A;color:#3D2A00}',
'html[data-theme="dark"] .m-acc.pro{background:linear-gradient(150deg,#2A2310,#1E180A);border-color:#5C4A16;color:#F3E2B0}',
'.m-acc.pro img{box-shadow:0 0 0 2px #FFFBEA,0 0 0 4px #D4AF37}',
'html[data-theme="dark"] .m-acc.pro img{box-shadow:0 0 0 2px #2A2310,0 0 0 4px #D4AF37}',
'.m-acc.pro>div>span{display:inline-flex;width:fit-content;margin-top:4px;padding:2px 9px;border-radius:999px;background:linear-gradient(135deg,#F8E7A6,#E3BE4E 45%,#B98A16);color:#2A2000 !important;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}',
'.m-acc img,.m-acc-ph{width:46px;height:46px;border-radius:50%;flex:none;object-fit:cover;background:var(--accent-soft);color:var(--accent);display:grid;place-items:center}',
'.m-acc>div{flex:1;min-width:0}.m-acc b{display:block;font-size:15.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.m-acc>div>span{display:block;font-size:12.5px;color:var(--ink-3)}',
'.m-acc .m-acc-ph svg{width:22px;height:22px}',
'.m-list{background:var(--panel);border:1px solid var(--line);border-radius:18px;overflow:hidden;margin-bottom:14px}',
'.m-row{display:flex;align-items:center;gap:12px;width:100%;min-height:52px;padding:8px 14px;font:inherit;font-size:15px;color:var(--ink);text-decoration:none;text-align:left}',
'.m-row+.m-row{box-shadow:inset 0 1px 0 var(--line-2)}',
'.m-row>span{flex:1}',
'.m-link svg:first-child{color:var(--accent)}.m-link svg:last-child{color:var(--ink-3)}',
'.m-gold svg:first-child{color:#D4AF37}.m-gold span{font-weight:600}',
'.m-danger,.m-danger svg:first-child{color:var(--bad) !important}',
'.m-seg{display:flex;padding:3px;border-radius:11px;background:var(--panel-2);border:1px solid var(--line)}',
'.m-seg button{padding:6px 14px;border-radius:8px;font-size:13.5px;font-weight:600;color:var(--ink-2)}',
'.m-seg button.on{background:var(--accent);color:#fff}',
'html[data-theme="dark"] .m-seg button.on{color:#04121F}',

/* progress & explore */
'html.m-app #progress .cat-head h2,html.m-app #explore .cat-head h2{font-size:24px}',
'html.m-app .explore-controls{flex-direction:column;gap:8px}',
'@media(prefers-reduced-motion:reduce){.m-sheet-box,html.m-app .modal-ov .modal,html.m-app #exam .gridnav{transition:none}html.m-app .qcard.m-swl,html.m-app .qcard.m-swr{animation:none}}',
'html.m-app #exam .gridnav{max-height:72dvh}html.m-app .modal-ov .modal,html.m-app .cr-modal-box{max-height:90dvh}.m-sheet-box{max-height:88dvh}'
].join('\n');
document.head.appendChild(css);

apply();
})();

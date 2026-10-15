/* EarnYourCert — engagement: a gentle review reminder and a premium look for Pro members.
   Loaded after career.js / hero.js / ui.js; uses the main script's globals (Store, lang, esc, isPro, isLoggedIn, ...). */
(function(){
'use strict';

const ET={
 es:{
  rvTitle:'¿Te está sirviendo EarnYourCert?',
  rvBody:'Una reseña de un minuto ayuda a que más gente que prepara su certificación nos encuentre.',
  rvBonus:'De regalo: {n} preguntas extra.',
  rvCta:'Escribir reseña', rvLater:'Ahora no', close:'Cerrar',
  member:'Miembro Pro', thanks:'Gracias por apoyar EarnYourCert',
  cardT:'Tu plan Pro', cardB:['Preguntas ilimitadas','Panel de preparación','Packs de preguntas mensuales','Avisos de renovación'],
  manage:'Gestionar suscripción'
 },
 en:{
  rvTitle:'Is EarnYourCert helping you?',
  rvBody:'A one-minute review helps more people preparing their certification find us.',
  rvBonus:'As a thank-you: {n} extra questions.',
  rvCta:'Write a review', rvLater:'Not now', close:'Close',
  member:'Pro member', thanks:'Thanks for supporting EarnYourCert',
  cardT:'Your Pro plan', cardB:['Unlimited questions','Readiness dashboard','Monthly question packs','Renewal reminders'],
  manage:'Manage subscription'
 }
};
const et=k=>(ET[lang]&&ET[lang][k])||ET.es[k];
const $=s=>document.querySelector(s);
const CROWN='<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M3 7.5 7.5 11 12 4l4.5 7L21 7.5 19 18H5z"/><rect x="5" y="19.5" width="14" height="2" rx="1"/></svg>';
const CHECK='<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
const STAR='<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/></svg>';
const PATREON='https://www.patreon.com/earnyourcert/membership';
const logged=()=>typeof isLoggedIn==='function'&&isLoggedIn();
const pro=()=>typeof isPro==='function'&&isPro();
const tr=n=>{ try{ if(window.track)track(n); }catch(e){} };

/* ---------- review reminder ----------
   Only after a finished exam that went well, only for signed-in users who can actually post a review
   and have not reviewed yet; at most 3 times ever, at least 21 days apart. Never blocks the screen. */
const NUDGE_GAP=21*864e5, NUDGE_MAX=3;
function hasReviewed(){
  try{ if(typeof rvUserReview!=='undefined'&&rvUserReview)return true; }catch(e){}
  const acc=Store.get('account',null)||{};
  return !!acc.review_bonus;
}
function nudgeAllowed(ctx){
  if(!logged()||hasReviewed())return false;
  if(Object.keys(Store.get('srs',{})).length<10)return false; // the review form asks for this
  const st=Store.get('rvNudge',{n:0,last:0})||{n:0,last:0};
  if(st.n>=NUDGE_MAX||Date.now()-(st.last||0)<NUDGE_GAP)return false;
  const exams=(Store.get('history',[])||[]).length;
  return exams>=2&&(ctx.passed||exams>=5);
}
function hideNudge(){
  const n=$('#engNudge'); if(!n)return;
  n.classList.remove('show'); setTimeout(()=>n.remove(),260);
}
function showNudge(){
  if($('#engNudge')||document.getElementById('results').classList.contains('hidden'))return;
  const st=Store.get('rvNudge',{n:0,last:0})||{n:0,last:0};
  Store.set('rvNudge',{n:(st.n||0)+1,last:Date.now()});
  const bonus=window.careerBonus&&careerBonus.eligible();
  const el=document.createElement('aside'); el.id='engNudge'; el.className='eng-nudge'; el.setAttribute('role','status');
  el.innerHTML='<button type="button" class="eng-x" aria-label="'+esc(et('close'))+'">&times;</button>'+
    '<div class="eng-n-head"><span class="eng-n-ico">'+STAR+'</span><b>'+esc(et('rvTitle'))+'</b></div>'+
    '<p>'+esc(et('rvBody'))+(bonus?' <strong>'+esc(et('rvBonus').replace('{n}',careerBonus.amount))+'</strong>':'')+'</p>'+
    '<div class="eng-n-act"><button type="button" class="btn btn-ghost btn-sm" data-a="later">'+esc(et('rvLater'))+'</button>'+
    '<button type="button" class="btn btn-primary btn-sm" data-a="go">'+esc(et('rvCta'))+'</button></div>';
  el.addEventListener('click',e=>{
    const b=e.target.closest('button'); if(!b)return;
    if(b.dataset.a==='go'){ tr('rv_nudge_click'); hideNudge(); if(typeof openReviewModal==='function')openReviewModal(); }
    else{ tr('rv_nudge_later'); hideNudge(); }
  });
  document.body.appendChild(el);
  requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.add('show')));
  tr('rv_nudge_show');
}
const prevAfter=window.careerAfterResults;
window.careerAfterResults=function(ctx){
  if(prevAfter)prevAfter.apply(this,arguments);
  try{ if(nudgeAllowed(ctx||{}))setTimeout(showNudge,2200); }catch(e){}
};
// leaving the results screen takes the reminder away with it
new MutationObserver(()=>{ const r=document.getElementById('results'); if(r&&r.classList.contains('hidden'))hideNudge(); })
  .observe(document.getElementById('results'),{attributes:true,attributeFilter:['class']});

/* ---------- Pro identity ---------- */
function proHero(){
  const h=document.getElementById('heroBanner'); if(!h)return;
  const on=pro()&&logged();
  h.classList.toggle('eng-pro',on);
  const cur=h.querySelector('.eng-hello');
  if(!on){ if(cur)cur.remove(); return; }
  if(cur)return;
  const main=h.querySelector('.mkt-main'); if(!main)return;
  const d=document.createElement('div'); d.className='eng-hello';
  d.innerHTML='<span class="eng-crown">'+CROWN+esc(et('member'))+'</span><span>'+esc(et('thanks'))+'</span>';
  main.insertBefore(d,main.firstChild);
}
function proCard(){
  const host=document.getElementById('uiPromo'); if(!host)return;
  const on=pro()&&logged(), cur=host.querySelector('.eng-pro-card');
  if(!on){ if(cur)cur.remove(); return; }
  if(cur&&cur.dataset.lang===lang)return;
  if(cur)cur.remove();
  const c=document.createElement('div'); c.className='eng-pro-card'; c.dataset.lang=lang;
  c.innerHTML='<div class="eng-pc-top"><span class="eng-crown">'+CROWN+'PRO</span><b>'+esc(et('cardT'))+'</b></div>'+
    '<ul>'+et('cardB').map(x=>'<li>'+CHECK+esc(x)+'</li>').join('')+'</ul>'+
    '<a href="'+PATREON+'" target="_blank" rel="noopener noreferrer">'+esc(et('manage'))+' →</a>';
  host.appendChild(c);
}
function syncPro(){
  const on=pro()&&logged();
  document.body.classList.toggle('is-pro',on);
  proHero(); proCard();
}
const prevAcc=window.updateAccountUI;
if(typeof prevAcc==='function'){
  window.updateAccountUI=function(){ const r=prevAcc.apply(this,arguments); try{syncPro();}catch(e){} return r; };
}
// the hero and the sidebar are rebuilt on every catalog render / language change
let qd=0;
new MutationObserver(()=>{ if(qd)return; qd=requestAnimationFrame(()=>{ qd=0; syncPro(); }); })
  .observe(document.getElementById('catalog')||document.body,{childList:true,subtree:true});
document.addEventListener('keydown',e=>{ if(e.key==='Escape')hideNudge(); });

const GOLD='linear-gradient(135deg,#F8E7A6 0%,#E3BE4E 45%,#B98A16 100%)';
const css=document.createElement('style');
css.textContent=[
/* review reminder: small card in a corner, above the mobile tab bar */
'.eng-nudge{position:fixed;right:20px;bottom:20px;z-index:180;width:340px;max-width:calc(100vw - 24px);box-sizing:border-box;background:var(--panel);color:var(--ink);border:1px solid var(--line);border-radius:16px;padding:16px 16px 14px;box-shadow:0 18px 50px rgba(16,24,40,.18);transform:translateY(16px);opacity:0;transition:transform .28s cubic-bezier(.2,.8,.2,1),opacity .2s}',
'.eng-nudge.show{transform:none;opacity:1}',
'.eng-n-head{display:flex;align-items:center;gap:10px;padding-right:22px}',
'.eng-n-head b{font-size:15px;line-height:1.3}',
'.eng-n-ico{width:34px;height:34px;flex:none;border-radius:10px;display:grid;place-items:center;background:var(--accent-soft);color:var(--accent)}',
'.eng-nudge p{margin:8px 0 12px;font-size:13.5px;line-height:1.5;color:var(--ink-2)}',
'.eng-nudge p strong{color:var(--ink);font-weight:600}',
'.eng-n-act{display:flex;justify-content:flex-end;gap:8px}',
'.eng-x{position:absolute;top:8px;right:8px;width:32px;height:32px;border-radius:9px;font-size:20px;line-height:1;color:var(--ink-3)}',
'.eng-x:hover{background:var(--panel-2)}',
'html.m-app .eng-nudge{left:12px;right:12px;width:auto;max-width:none;bottom:calc(80px + env(safe-area-inset-bottom))}',
'html.m-app .eng-n-act .btn{flex:1;min-height:42px}',
'@media(prefers-reduced-motion:reduce){.eng-nudge{transition:none}}',
/* Pro: gold is reserved for members */
'.eng-crown{display:inline-flex;align-items:center;gap:5px;padding:3px 9px 3px 7px;border-radius:999px;background:'+GOLD+';color:#2A2000;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 2px 8px rgba(185,138,22,.35);white-space:nowrap}',
'body.is-pro .account-avatar.pro{border:0;box-shadow:0 0 0 2px var(--bg),0 0 0 4px #D4AF37,0 4px 14px rgba(212,175,55,.45)}',
'body.is-pro .account-plan.pro{display:inline-flex !important;align-items:center;gap:3px;top:auto;bottom:-8px;margin:0;padding:1px 6px 1px 5px;border-radius:999px;background:'+GOLD+';color:#2A2000 !important;font-size:9px;font-weight:800;letter-spacing:.06em;line-height:1.5;text-transform:uppercase;box-shadow:0 0 0 2px var(--bg),0 2px 6px rgba(185,138,22,.35)}',
'body.is-pro .account-plan.pro::before{content:"";width:12px;height:12px;background:currentColor;-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\'%3E%3Cpath d=\'M3 7.5 7.5 11 12 4l4.5 7L21 7.5 19 18H5z\'/%3E%3Crect x=\'5\' y=\'19.5\' width=\'14\' height=\'2\' rx=\'1\'/%3E%3C/svg%3E") center/contain no-repeat;mask:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\'%3E%3Cpath d=\'M3 7.5 7.5 11 12 4l4.5 7L21 7.5 19 18H5z\'/%3E%3Crect x=\'5\' y=\'19.5\' width=\'14\' height=\'2\' rx=\'1\'/%3E%3C/svg%3E") center/contain no-repeat}',
'body.is-pro .account-plan.pro::before{width:10px;height:10px}',
'html.m-app body.is-pro .account-plan.pro{padding:2px 5px;font-size:0;gap:0;bottom:-5px}',
/* hero greeting and a thin gold edge */
'.eng-hello{display:flex;align-items:center;flex-wrap:wrap;gap:8px 10px;font-size:13px;font-weight:600;color:rgba(255,255,255,.9)}',
'.mkt.eng-pro{box-shadow:inset 0 0 0 1px rgba(248,231,166,.55),0 16px 44px rgba(10,74,154,.25)}',
'.mkt.eng-pro .mkt-eyebrow{display:none}',
/* sidebar card for members */
'.eng-pro-card{position:relative;overflow:hidden;padding:16px;border-radius:14px;background:linear-gradient(160deg,#FFFBEA,#FBF0CC);border:1px solid #EBD38A;color:#3D2A00}',
'html[data-theme="dark"] .eng-pro-card{background:linear-gradient(160deg,#2A2310,#1E180A);border-color:#5C4A16;color:#F3E2B0}',
'.eng-pro-card::after{content:"";position:absolute;right:-40px;top:-40px;width:120px;height:120px;border-radius:50%;background:radial-gradient(circle,rgba(227,190,78,.35),transparent 70%);pointer-events:none}',
'.eng-pc-top{display:flex;align-items:center;gap:8px;margin-bottom:10px}.eng-pc-top b{font-size:14.5px}',
'.eng-pro-card ul{list-style:none;margin:0 0 12px;padding:0;display:grid;gap:6px;font-size:12.5px}',
'.eng-pro-card li{display:flex;align-items:center;gap:7px}.eng-pro-card li svg{color:#B98A16;flex:none}',
'html[data-theme="dark"] .eng-pro-card li svg{color:#E3BE4E}',
'.eng-pro-card a{font-size:12.5px;font-weight:600;color:inherit;opacity:.8;text-decoration:none}.eng-pro-card a:hover{opacity:1;text-decoration:underline}'
].join('\n');
document.head.appendChild(css);

syncPro();
})();

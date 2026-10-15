/* EarnYourCert — invite a friend (both get extra questions) and a shareable "Ready for <exam>" badge
   after a strong mock exam. Server side: api/referral.php. Loaded after engage.js; before mobile.js. */
(function(){
'use strict';

const IT={
 es:{
  invT:'Invita a un amigo', invB:'Si se registra con tu enlace, los dos recibís {n} preguntas extra.',
  invBPro:'Comparte EarnYourCert con tus compañeros: si se registran con tu enlace, reciben {n} preguntas extra.',
  copy:'Copiar', copied:'Enlace copiado', share:'Compartir', invited:'Has invitado a {n} personas', invited1:'Has invitado a 1 persona', invited0:'Aún no has invitado a nadie',
  shareText:'Estoy preparando mis certificaciones de Microsoft con EarnYourCert: simulacros gratis con explicaciones. Con mi enlace te llevas {n} preguntas extra:',
  welcome:'¡Bienvenido! Tienes {n} preguntas extra por venir invitado.', reward:'Alguien se ha registrado con tu enlace: +{n} preguntas.',
  needLogin:'Inicia sesión para conseguir tu enlace de invitación.', sideCta:'Invitar',
  bT:'Insignia desbloqueada', bB:'Has sacado un {p}% en el simulacro de {code}. Compártelo en LinkedIn o descárgalo.',
  bShare:'Compartir insignia', bDown:'Descargar', ready:'PREPARADO PARA', score:'{p}% en el simulacro', site:'earnyourcert.com',
  bPost:'He sacado un {p}% en el simulacro de {code} y ya me siento preparado para el examen. Practico gratis con EarnYourCert:',
  close:'Cerrar'
 },
 en:{
  invT:'Invite a friend', invB:'If they sign up with your link, you both get {n} extra questions.',
  invBPro:'Share EarnYourCert with your colleagues: if they sign up with your link, they get {n} extra questions.',
  copy:'Copy', copied:'Link copied', share:'Share', invited:'You have invited {n} people', invited1:'You have invited 1 person', invited0:'You have not invited anyone yet',
  shareText:'I am preparing my Microsoft certifications with EarnYourCert: free mock exams with explanations. Get {n} extra questions with my link:',
  welcome:'Welcome! You got {n} extra questions for joining with an invite.', reward:'Someone signed up with your link: +{n} questions.',
  needLogin:'Sign in to get your invite link.', sideCta:'Invite',
  bT:'Badge unlocked', bB:'You scored {p}% on the {code} mock exam. Share it on LinkedIn or download it.',
  bShare:'Share badge', bDown:'Download', ready:'READY FOR', score:'{p}% on the mock exam', site:'earnyourcert.com',
  bPost:'I scored {p}% on the {code} mock exam and I feel ready for the real thing. I practise for free with EarnYourCert:',
  close:'Close'
 }
};
const it=k=>(IT[lang]&&IT[lang][k])||IT.es[k];
const fmt=(s,o)=>s.replace(/\{(\w+)\}/g,(m,k)=>o[k]!=null?o[k]:m);
const $=s=>document.querySelector(s);
const tr=n=>{ try{ if(window.track)track(n); }catch(e){} };
const logged=()=>typeof isLoggedIn==='function'&&isLoggedIn();
const pro=()=>typeof isPro==='function'&&isPro();
const SITE='https://earnyourcert.com';
let PER=50;
const sv=p=>'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+p+'</svg>';
const ICO={
  gift:sv('<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/>'),
  copy:sv('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'),
  share:sv('<path d="M12 3v12M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>'),
  wa:'<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-3.3-.8-2.8-1.1-4.5-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.1.1.3 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.7 1.2 1.6 1.9 1.1 1 2 1.3 2.3 1.4.3.1.4.1.6-.1l.8-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.4.2.5.3.1.2.1.7-.1 1.3z"/></svg>',
  li:'<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>',
  dl:sv('<path d="M12 3v12M8 11l4 4 4-4"/><path d="M5 21h14"/>')
};

/* ---------- referral state ---------- */
let info=Store.get('refInfo',null);   // {code, invited}
let fetching=false, claiming=false, fetchedThisLoad=false;
const link=()=>info&&info.code?SITE+'/?ref='+info.code:SITE+'/';
async function api(method,body){
  const r=await fetch('/api/referral.php',{method,headers:Object.assign({'Content-Type':'application/json'},authHeaders()),body:body?JSON.stringify(body):undefined});
  return r.json();
}
async function refresh(){
  if(!logged()||fetching)return; fetching=true;
  try{
    const d=await api('GET'); if(!d||!d.ok)return;
    PER=d.per||PER;
    info={code:d.code,invited:d.invited||0}; Store.set('refInfo',info);
    if(d.bonus>0&&!pro()){ addBonus(d.bonus); tr('ref_reward'); showToast(fmt(it('reward'),{n:d.bonus}),'ok',5000); if(typeof updateQuotaBadge==='function')updateQuotaBadge(); }
    renderSide(); const m=$('#inviteModal'); if(m&&m.classList.contains('show'))fillModal();
  }catch(e){} finally{ fetching=false; }
}
async function claim(){
  const code=Store.get('refCode',null); if(!code||!logged()||claiming)return; claiming=true;
  try{
    const d=await api('POST',{code});
    if(d&&d.ok&&d.bonus>0){ if(!pro())addBonus(d.bonus); tr('ref_claimed'); setTimeout(()=>showToast(fmt(it('welcome'),{n:d.bonus}),'ok',6000),900); if(typeof updateQuotaBadge==='function')updateQuotaBadge(); }
    if(d&&(d.ok||d.error))Store.del('refCode');   // canjeado o no válido: no reintentar
  }catch(e){ /* sin red: se reintenta en el próximo inicio de sesión */ } finally{ claiming=false; }
}
function onAccount(){
  if(!logged()){ info=null; renderSide(); return; }
  claim();
  if(!fetchedThisLoad){ fetchedThisLoad=true; refresh(); }
}
const prevAcc=window.updateAccountUI;
if(typeof prevAcc==='function')window.updateAccountUI=function(){ const r=prevAcc.apply(this,arguments); try{ onAccount(); }catch(e){} return r; };

/* ---------- invite sheet ---------- */
function ensureModal(){
  let m=$('#inviteModal'); if(m)return m;
  m=document.createElement('div'); m.className='modal-ov'; m.id='inviteModal';
  m.innerHTML='<div class="modal inv-modal" role="dialog" aria-modal="true" aria-labelledby="invTitle">'+
    '<button class="modal-close-btn" type="button" aria-label="'+esc(it('close'))+'"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>'+
    '<div class="inv-body"></div></div>';
  m.addEventListener('click',e=>{
    if(e.target===m||e.target.closest('.modal-close-btn')){ m.classList.remove('show'); return; }
    const b=e.target.closest('[data-inv]'); if(!b)return;
    const url=link(), text=fmt(it('shareText'),{n:PER});
    if(b.dataset.inv==='copy'){ copy(url); tr('invite_copy'); }
    else if(b.dataset.inv==='share'){ tr('invite_share'); if(navigator.share)navigator.share({title:'EarnYourCert',text,url}).catch(()=>{}); else copy(url); }
    else if(b.dataset.inv==='wa'){ tr('invite_share'); window.open('https://wa.me/?text='+encodeURIComponent(text+' '+url),'_blank','noopener'); }
    else if(b.dataset.inv==='li'){ tr('invite_share'); window.open('https://www.linkedin.com/sharing/share-offsite/?url='+encodeURIComponent(url),'_blank','noopener,width=600,height=620'); }
  });
  document.body.appendChild(m); return m;
}
function copy(url){
  const done=()=>showToast(it('copied'),'ok',2200);
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(url).then(done,()=>fallback());
  else fallback();
  function fallback(){ const i=$('#invLink'); if(i){ i.select(); try{ document.execCommand('copy'); done(); }catch(e){} } }
}
function fillModal(){
  const m=ensureModal(), n=info?info.invited:0;
  m.querySelector('.inv-body').innerHTML=
    '<div class="inv-ico">'+ICO.gift+'</div>'+
    '<h3 id="invTitle">'+esc(it('invT'))+'</h3>'+
    '<p class="inv-sub">'+esc(fmt(pro()?it('invBPro'):it('invB'),{n:PER}))+'</p>'+
    '<div class="inv-link"><input id="invLink" type="text" readonly value="'+esc(link())+'" aria-label="'+esc(it('invT'))+'"><button type="button" class="btn btn-primary btn-sm" data-inv="copy">'+ICO.copy+'<span>'+esc(it('copy'))+'</span></button></div>'+
    '<div class="inv-btns">'+
      (navigator.share?'<button type="button" class="btn btn-ghost" data-inv="share">'+ICO.share+'<span>'+esc(it('share'))+'</span></button>':'')+
      '<button type="button" class="btn btn-ghost" data-inv="wa">'+ICO.wa+'<span>WhatsApp</span></button>'+
      '<button type="button" class="btn btn-ghost" data-inv="li">'+ICO.li+'<span>LinkedIn</span></button>'+
    '</div>'+
    '<p class="inv-count">'+esc(n===0?it('invited0'):n===1?it('invited1'):fmt(it('invited'),{n}))+'</p>';
}
function openInvite(){
  if(!logged()){ showToast(it('needLogin'),'warn',3500); if(typeof openLoginModal==='function')openLoginModal(); return; }
  tr('invite_open');
  fillModal(); ensureModal().classList.add('show');
  refresh();
}
window.openInvite=openInvite;

/* desktop catalog sidebar card (signed-in users) */
function renderSide(){
  const host=document.getElementById('uiPromo'); if(!host)return;
  let c=host.querySelector('.inv-side');
  if(!logged()){ if(c)c.remove(); return; }
  const html='<span class="inv-side-ico">'+ICO.gift+'</span><div><b>'+esc(it('invT'))+'</b><p>'+esc(fmt(pro()?it('invBPro'):it('invB'),{n:PER}))+'</p></div>';
  if(c&&c.dataset.k===lang+pro())return;
  if(!c){ c=document.createElement('button'); c.type='button'; c.className='inv-side'; c.addEventListener('click',openInvite); host.appendChild(c); }
  c.dataset.k=lang+pro(); c.innerHTML=html;
}
let qd=0;
const cat=document.getElementById('catalog');
if(cat)new MutationObserver(()=>{ if(qd)return; qd=requestAnimationFrame(()=>{ qd=0; renderSide(); }); }).observe(cat,{childList:true,subtree:true});

/* ---------- "Ready for <exam>" badge after a strong mock exam ---------- */
const BADGE_MIN=80;
function badgeSvg(ex,pct){
  const paths=(window.EXAM_ICON_PATHS&&EXAM_ICON_PATHS[ex.id])||'<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1 2.7 3 6 3s6-2 6-3v-5"/>';
  const title=String(L(ex,'title')||'').replace(/^Microsoft (365 )?Certified:\s*/,'');
  const acc=logged()?(Store.get('account',null)||{}):{};
  const name=(acc.name||'').slice(0,40);
  const date=new Date().toLocaleDateString(t('locale'),{day:'numeric',month:'long',year:'numeric'});
  const F='Segoe UI, Helvetica Neue, Arial, sans-serif';
  const x=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  // wrap the certification name on two lines max
  const words=title.split(' '); const lines=['']; for(const w of words){ const l=lines[lines.length-1]; if((l+' '+w).trim().length>30&&l){ if(lines.length===2){ lines[1]+=' …'; break; } lines.push(w); } else lines[lines.length-1]=(l+' '+w).trim(); }
  const hex=(cx,cy,r)=>Array.from({length:6},(_,i)=>{ const a=Math.PI/180*(60*i-90); return (cx+r*Math.cos(a)).toFixed(1)+','+(cy+r*Math.sin(a)).toFixed(1); }).join(' ');
  return '<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">'+
    '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0A3F86"/><stop offset=".6" stop-color="#0F6CBD"/><stop offset="1" stop-color="#2886DE"/></linearGradient>'+
    '<linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F8E7A6"/><stop offset=".5" stop-color="#E3BE4E"/><stop offset="1" stop-color="#B98A16"/></linearGradient></defs>'+
    '<rect width="1080" height="1080" fill="url(#g)"/>'+
    '<circle cx="960" cy="90" r="380" fill="#fff" opacity=".07"/><circle cx="80" cy="1040" r="300" fill="#fff" opacity=".05"/>'+
    '<g transform="translate(70 66)"><rect width="56" height="56" rx="14" fill="#fff"/><g transform="translate(8 8) scale(1.67)" fill="none" stroke="#0F6CBD" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1 2.7 3 6 3s6-2 6-3v-5"/></g>'+
      '<text x="74" y="38" font-family="'+F+'" font-size="32" font-weight="700" fill="#fff">EarnYourCert</text></g>'+
    '<polygon points="'+hex(540,470,268)+'" fill="url(#gold)"/>'+
    '<polygon points="'+hex(540,470,248)+'" fill="#fff"/>'+
    '<g transform="translate(480 300) scale(5)" fill="none" stroke="#0F6CBD" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'+paths+'</g>'+
    '<text x="540" y="480" text-anchor="middle" font-family="'+F+'" font-size="26" font-weight="800" letter-spacing="5" fill="#8A6A10">'+x(it('ready'))+'</text>'+
    '<text x="540" y="565" text-anchor="middle" font-family="'+F+'" font-size="92" font-weight="800" fill="#0A2A57">'+x(ex.code)+'</text>'+
    '<text x="540" y="625" text-anchor="middle" font-family="'+F+'" font-size="30" font-weight="700" fill="#0F6CBD">'+x(fmt(it('score'),{p:pct}))+'</text>'+
    lines.map((l,i)=>'<text x="540" y="'+(820+i*50)+'" text-anchor="middle" font-family="'+F+'" font-size="40" font-weight="700" fill="#fff">'+x(l)+'</text>').join('')+
    (name?'<text x="540" y="'+(820+lines.length*50+16)+'" text-anchor="middle" font-family="'+F+'" font-size="30" font-weight="500" fill="#fff" opacity=".85">'+x(name)+'</text>':'')+
    '<text x="540" y="1020" text-anchor="middle" font-family="'+F+'" font-size="26" font-weight="600" fill="#fff" opacity=".8">'+x(date)+'  ·  '+x(it('site'))+'</text>'+
  '</svg>';
}
function badgePng(ex,pct){
  return new Promise((res,rej)=>{
    const img=new Image();
    img.onload=()=>{ const c=document.createElement('canvas'); c.width=1080; c.height=1080; c.getContext('2d').drawImage(img,0,0); c.toBlob(b=>b?res(b):rej(new Error('blob')),'image/png'); };
    img.onerror=rej;
    img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(badgeSvg(ex,pct));
  });
}
function shareUrl(ex){ return SITE+'/'+(lang==='en'?'en/':'')+ex.id+'.html'+(info&&info.code?'?ref='+info.code:''); }
async function downloadBadge(ex,pct){
  try{
    const b=await badgePng(ex,pct), a=document.createElement('a');
    a.download='earnyourcert-'+ex.id+'-ready.png'; a.href=URL.createObjectURL(b); document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),4000); tr('badge_download');
  }catch(e){ console.error('badge',e); }
}
async function shareBadge(ex,pct){
  tr('badge_share');
  const text=fmt(it('bPost'),{p:pct,code:ex.code}), url=shareUrl(ex);
  try{
    const b=await badgePng(ex,pct), file=new File([b],'earnyourcert-'+ex.id+'.png',{type:'image/png'});
    if(navigator.canShare&&navigator.canShare({files:[file]})){ await navigator.share({files:[file],text:text+' '+url}); return; }
  }catch(e){ if(e&&e.name==='AbortError')return; }
  // desktop: download the image and open LinkedIn with the link; the user attaches the image
  await downloadBadge(ex,pct);
  if(typeof showToast==='function'&&typeof t==='function')showToast(t('cardHint'),'ok',4200);
  window.open('https://www.linkedin.com/sharing/share-offsite/?url='+encodeURIComponent(url),'_blank','noopener,width=600,height=620');
}
function badgePanel(ctx){
  const old=$('#invBadge'); if(old)old.remove();
  const ex=typeof currentExam!=='undefined'&&currentExam; if(!ex)return;
  const pct=Math.round(ctx&&ctx.pct||0);
  const total=(typeof exam!=='undefined'&&exam&&exam.length)||0;
  if(pct<BADGE_MIN||(typeof mode!=='undefined'&&mode!=='exam')||total<20)return;
  const p=document.createElement('div'); p.id='invBadge'; p.className='card inv-badge';
  p.innerHTML='<img alt="" width="132" height="132" src="data:image/svg+xml;charset=utf-8,'+encodeURIComponent(badgeSvg(ex,pct))+'">'+
    '<div class="inv-b-txt"><span class="inv-b-k">'+esc(it('bT'))+'</span><h3>'+esc(it('ready').charAt(0)+it('ready').slice(1).toLowerCase())+' '+esc(ex.code)+'</h3>'+
    '<p>'+esc(fmt(it('bB'),{p:pct,code:ex.code}))+'</p>'+
    '<div class="inv-b-act"><button type="button" class="btn btn-primary btn-sm" data-b="share">'+ICO.li+'<span>'+esc(it('bShare'))+'</span></button>'+
    '<button type="button" class="btn btn-ghost btn-sm" data-b="dl">'+ICO.dl+'<span>'+esc(it('bDown'))+'</span></button>'+
    '<button type="button" class="btn btn-ghost btn-sm" data-b="inv">'+ICO.gift+'<span>'+esc(it('invT'))+'</span></button></div></div>';
  p.addEventListener('click',e=>{ const b=e.target.closest('[data-b]'); if(!b)return;
    if(b.dataset.b==='share')shareBadge(ex,pct); else if(b.dataset.b==='dl')downloadBadge(ex,pct); else openInvite(); });
  const hero=document.querySelector('#results .result-hero'); if(hero)hero.insertAdjacentElement('afterend',p);
  tr('badge_show');
}
const prevAfter=window.careerAfterResults;
window.careerAfterResults=function(ctx){ const r=prevAfter?prevAfter.apply(this,arguments):undefined; try{ badgePanel(ctx); }catch(e){ console.error('badge',e); } return r; };

const css=document.createElement('style');
css.textContent=[
'.inv-modal{max-width:440px;text-align:center}',
'.inv-ico{width:52px;height:52px;margin:4px auto 12px;border-radius:16px;display:grid;place-items:center;background:var(--accent-soft);color:var(--accent)}.inv-ico svg{width:26px;height:26px}',
'.inv-modal h3{font-size:20px;margin:0 0 6px}.inv-sub{margin:0 0 18px;color:var(--ink-2);font-size:14.5px;line-height:1.5}',
'.inv-link{display:flex;gap:8px;margin-bottom:12px}',
'.inv-link input{flex:1;min-width:0;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:var(--panel-2);color:var(--ink);font-family:var(--mono);font-size:13px}',
'.inv-link .btn{display:inline-flex;align-items:center;gap:6px;white-space:nowrap}',
'.inv-btns{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}',
'.inv-btns .btn{display:inline-flex;align-items:center;gap:7px;flex:1;justify-content:center;min-width:110px}',
'.inv-count{margin:16px 0 0;font-size:13px;color:var(--ink-3)}',
'.inv-side{display:flex;gap:12px;align-items:flex-start;width:100%;margin-top:12px;padding:14px;text-align:left;font:inherit;color:var(--ink);background:var(--panel);border:1px solid var(--line);border-radius:14px;cursor:pointer;transition:border-color .15s}',
'.inv-side:hover{border-color:color-mix(in srgb,var(--accent) 45%,var(--line))}',
'.inv-side-ico{flex:none;width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:var(--accent-soft);color:var(--accent)}',
'.inv-side b{display:block;font-size:14px}.inv-side p{margin:2px 0 0;font-size:12.5px;line-height:1.45;color:var(--ink-2)}',
'.inv-badge{display:flex;gap:22px;align-items:center;margin-top:16px;padding:20px 22px}',
'.inv-badge img{flex:none;width:132px;height:132px;border-radius:16px;box-shadow:0 8px 24px rgba(15,108,189,.25)}',
'.inv-b-k{display:block;font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#B98A16}',
'.inv-badge h3{font-size:19px;margin:2px 0 4px}.inv-badge p{margin:0 0 12px;color:var(--ink-2);font-size:14px;line-height:1.5}',
'.inv-b-act{display:flex;gap:8px;flex-wrap:wrap}.inv-b-act .btn{display:inline-flex;align-items:center;gap:7px}',
'@media(max-width:640px){.inv-badge{flex-direction:column;text-align:center}.inv-b-act{justify-content:center}.inv-b-act .btn{flex:1 1 auto}}'
].join('\n');
document.head.appendChild(css);

onAccount();
})();

/* EarnYourCert — reasons to come back: question of the day on the catalog, and a discreet
   "add to home screen" suggestion on phones. Loaded after career.js; uses the main script's globals. */
(function(){
'use strict';

const DT={
 es:{
  qotd:'Pregunta del día', streak:'Racha: {n} días', streak1:'Racha: 1 día', right:'¡Correcto!', wrong:'No es la correcta',
  answer:'Respuesta correcta: {l}', tomorrow:'Mañana tendrás otra.', practice:'Practicar {code} →', change:'Cambiar examen',
  instT:'Instala EarnYourCert', instB:'Ábrela desde la pantalla de inicio como una app, a pantalla completa.',
  instIos:'Pulsa {share} Compartir y luego «Añadir a pantalla de inicio».', install:'Instalar', later:'Ahora no', close:'Cerrar'
 },
 en:{
  qotd:'Question of the day', streak:'Streak: {n} days', streak1:'Streak: 1 day', right:'Correct!', wrong:'Not quite',
  answer:'Correct answer: {l}', tomorrow:'A new one tomorrow.', practice:'Practice {code} →', change:'Change exam',
  instT:'Install EarnYourCert', instB:'Open it from your home screen like an app, full screen.',
  instIos:'Tap {share} Share, then “Add to Home Screen”.', install:'Install', later:'Not now', close:'Close'
 }
};
const dt=k=>(DT[lang]&&DT[lang][k])||DT.es[k];
const $=s=>document.querySelector(s);
const tr=n=>{ try{ if(window.track)track(n); }catch(e){} };
const today=()=>{ const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };
const dayDiff=(a,b)=>Math.round((new Date(b+'T12:00:00')-new Date(a+'T12:00:00'))/864e5);
const hash=s=>{ let h=2166136261; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return h>>>0; };

/* ---------- question of the day ---------- */
function qotdExam(){
  const st=Store.get('qotd',null);
  if(st&&st.exam&&EXAMS.some(e=>e.id===st.exam&&!e.soon))return st.exam;
  const hist=(Store.get('history',[])||[]).slice().sort((a,b)=>b.date-a.date);
  const ok=id=>EXAMS.some(e=>e.id===id&&!e.soon&&!(window.isRetired&&isRetired(e)));
  for(const h of hist)if(ok(h.examId))return h.examId;
  const v=typeof getView==='function'?getView():null; if(v&&v.examId&&ok(v.examId))return v.examId;
  return 'ab-900';
}
function pickQuestion(qs,examId,day){
  const ok=qs.filter(q=>q.type==='mc'&&!q.case_es&&Array.isArray(q.correct)&&q.correct.length===1&&q.opts_es&&q.opts_es.length>=3&&q.exp_es);
  if(!ok.length)return null;
  return ok[hash(day+'|'+examId)%ok.length];
}
let rendering=false;
async function renderQotd(){
  const cat=$('#catalog'); if(!cat||cat.classList.contains('hidden')||rendering)return;
  rendering=true;
  try{
    const examId=qotdExam(), ex=EXAMS.find(e=>e.id===examId); if(!ex)return;
    const qs=await loadQuestions(examId), day=today(), q=pickQuestion(qs,examId,day); if(!q)return;
    let box=$('#qotd');
    if(!box){
      box=document.createElement('section'); box.id='qotd'; box.className='qd';
      const anchor=$('#careerCatalog')||cat.querySelector('.cat-head'); cat.insertBefore(box,anchor||cat.firstChild);
      box.addEventListener('click',onClick);
    }
    const st=Store.get('qotd',{})||{};
    const done=st.day===day&&String(st.qid)===String(q.id)&&typeof st.pick==='number';
    const sk=Store.get('qotdStreak',{n:0,last:''})||{n:0,last:''};
    const streak=sk.last&&dayDiff(sk.last,day)<=1?sk.n:0;
    const c=q.correct[0], L='ABCDEF';
    const opts=q['opts_'+lang]||q.opts_es;
    box.dataset.qid=q.id; box.dataset.exam=examId; box.dataset.correct=c;
    box.innerHTML=
      '<div class="qd-head"><span class="qd-k">'+esc(dt('qotd'))+' · <b>'+esc(ex.code)+'</b></span>'+
        (streak?'<span class="qd-streak">'+esc(streak===1?dt('streak1'):dt('streak').replace('{n}',streak))+'</span>':'')+'</div>'+
      '<p class="qd-q">'+esc(q['q_'+lang]||q.q_es)+'</p>'+
      '<div class="qd-opts">'+opts.map((o,i)=>{
        const cls=done?(i===c?' ok':(i===st.pick?' bad':' dim')):'';
        return '<button type="button" class="qd-opt'+cls+'" data-i="'+i+'"'+(done?' disabled':'')+'><span class="qd-l">'+L[i]+'</span><span>'+esc(o)+'</span></button>';
      }).join('')+'</div>'+
      (done?'<div class="qd-res '+(st.pick===c?'ok':'bad')+'"><b>'+esc(st.pick===c?dt('right'):dt('wrong'))+'</b>'+(st.pick===c?'':' '+esc(dt('answer').replace('{l}',L[c])))+'<p>'+esc(q['exp_'+lang]||q.exp_es)+'</p></div>'+
        '<div class="qd-foot"><span>'+esc(dt('tomorrow'))+'</span><button type="button" class="btn btn-primary btn-sm" data-act="practice">'+esc(dt('practice').replace('{code}',ex.code))+'</button></div>':'');
  }finally{ rendering=false; }
}
function onClick(e){
  const box=$('#qotd'); if(!box)return;
  const b=e.target.closest('button'); if(!b)return;
  if(b.dataset.act==='practice'){ tr('qotd_practice'); selectExam(box.dataset.exam); return; }
  if(b.dataset.i==null||b.disabled)return;
  const day=today(), pick=+b.dataset.i;
  Store.set('qotd',{day,qid:box.dataset.qid,exam:box.dataset.exam,pick});
  const sk=Store.get('qotdStreak',{n:0,last:''})||{n:0,last:''};
  if(sk.last!==day){ const n=(sk.last&&dayDiff(sk.last,day)===1)?sk.n+1:1; Store.set('qotdStreak',{n,last:day}); }
  tr(pick===+box.dataset.correct?'qotd_right':'qotd_wrong');
  renderQotd();
}
const prevCat=window.careerRenderCatalog;
window.careerRenderCatalog=async function(){ const r=prevCat?await prevCat.apply(this,arguments):undefined; renderQotd(); return r; };
document.addEventListener('click',e=>{ if(e.target.closest&&e.target.closest('#langToggle,[data-lang-set]'))setTimeout(renderQotd,200); });

/* ---------- add to home screen (phones only, after real use, rarely) ---------- */
const INST_GAP=14*864e5, INST_MAX=2;
let deferred=null;
const standalone=()=>(window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true;
const isPhone=()=>window.matchMedia&&matchMedia('(max-width:760px), (pointer:coarse) and (max-height:500px)').matches;
const isIOS=()=>/iphone|ipad|ipod/i.test(navigator.userAgent)&&!window.MSStream;
window.addEventListener('beforeinstallprompt',e=>{ e.preventDefault(); deferred=e; });
window.addEventListener('appinstalled',()=>{ tr('pwa_installed'); Store.set('pwaInst',{n:99,last:Date.now(),done:1}); hideInstall(); });
function examsDone(){ return (Store.get('examsDone',0)||0); }
function installAllowed(){
  if(standalone()||!isPhone())return false;
  if(!deferred&&!isIOS())return false; // nothing we can offer on this browser
  const st=Store.get('pwaInst',{n:0,last:0})||{n:0,last:0};
  if(st.done||st.n>=INST_MAX||Date.now()-(st.last||0)<INST_GAP)return false;
  return examsDone()>=2;
}
function hideInstall(){ const n=$('#pwaCard'); if(!n)return; n.classList.remove('show'); setTimeout(()=>n.remove(),260); }
function showInstall(){
  if($('#pwaCard')||$('#engNudge')||!installAllowed())return;
  const st=Store.get('pwaInst',{n:0,last:0})||{n:0,last:0};
  Store.set('pwaInst',{n:(st.n||0)+1,last:Date.now()});
  const share='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>';
  const el=document.createElement('aside'); el.id='pwaCard'; el.className='pwa-card'; el.setAttribute('role','status');
  el.innerHTML='<button type="button" class="pwa-x" aria-label="'+esc(dt('close'))+'">&times;</button>'+
    '<div class="pwa-h"><img src="icon.svg" alt="" width="40" height="40"><div><b>'+esc(dt('instT'))+'</b><p>'+
      (deferred?esc(dt('instB')):dt('instIos').replace('{share}',share))+'</p></div></div>'+
    (deferred?'<div class="pwa-act"><button type="button" class="btn btn-ghost btn-sm" data-a="later">'+esc(dt('later'))+'</button><button type="button" class="btn btn-primary btn-sm" data-a="go">'+esc(dt('install'))+'</button></div>':'');
  el.addEventListener('click',async e=>{
    const b=e.target.closest('button'); if(!b)return;
    if(b.dataset.a==='go'&&deferred){ tr('pwa_install_click'); hideInstall(); deferred.prompt(); try{ await deferred.userChoice; }catch(_){} deferred=null; }
    else{ tr('pwa_later'); hideInstall(); }
  });
  document.body.appendChild(el);
  requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.add('show')));
  tr('pwa_prompt_show');
}
// count finished exams (guests too) and suggest installing when back on the catalog
const prevAfter=window.careerAfterResults;
window.careerAfterResults=function(){ Store.set('examsDone',examsDone()+1); if(prevAfter)return prevAfter.apply(this,arguments); };
let catWas=true;
new MutationObserver(()=>{ const hid=$('#catalog').classList.contains('hidden'); if(hid!==catWas){ catWas=hid; if(!hid){ setTimeout(showInstall,1500); renderQotd(); } else hideInstall(); } })
  .observe($('#catalog'),{attributes:true,attributeFilter:['class']});

const css=document.createElement('style');
css.textContent=[
'.qd{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:18px 20px;margin:0 0 22px}',
'.qd-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}',
'.qd-k{font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-3)}.qd-k b{color:var(--accent);font-family:var(--mono)}',
'.qd-streak{font-size:12px;font-weight:600;color:var(--ink-2);padding:3px 10px;border-radius:999px;background:var(--panel-2);border:1px solid var(--line);white-space:nowrap}',
'.qd-q{font-size:15.5px;font-weight:600;line-height:1.5;margin:0 0 12px}',
'.qd-opts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}',
'.qd-opt{display:flex;align-items:flex-start;gap:10px;padding:10px 12px;text-align:left;font:inherit;font-size:14px;line-height:1.4;color:var(--ink);background:var(--panel);border:1px solid var(--line);border-radius:12px;cursor:pointer;transition:border-color .15s,background .15s}',
'.qd-opt:hover:not([disabled]){border-color:var(--accent);background:var(--accent-soft)}',
'.qd-l{flex:none;width:22px;height:22px;border-radius:7px;display:grid;place-items:center;font-family:var(--mono);font-size:12px;font-weight:700;background:var(--panel-2);color:var(--ink-2)}',
'.qd-opt[disabled]{cursor:default}',
'.qd-opt.ok{border-color:var(--ok);background:var(--ok-soft)}.qd-opt.ok .qd-l{background:var(--ok);color:#fff}',
'.qd-opt.bad{border-color:var(--bad);background:var(--bad-soft)}.qd-opt.bad .qd-l{background:var(--bad);color:#fff}',
'.qd-opt.dim{opacity:.6}',
'.qd-res{margin-top:12px;padding:12px 14px;border-radius:12px;background:var(--panel-2);font-size:14px}',
'.qd-res.ok b{color:var(--ok)}.qd-res.bad b{color:var(--bad)}',
'.qd-res p{margin:6px 0 0;color:var(--ink-2);line-height:1.5}',
'.qd-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:12px;font-size:13px;color:var(--ink-3)}',
'@media(max-width:640px){.qd-opts{grid-template-columns:1fr}.qd{padding:16px}.qd-foot .btn{width:100%}}',
'.pwa-card{position:fixed;left:12px;right:12px;bottom:calc(80px + env(safe-area-inset-bottom));z-index:180;background:var(--panel);color:var(--ink);border:1px solid var(--line);border-radius:16px;padding:14px 14px 12px;box-shadow:0 18px 50px rgba(16,24,40,.2);transform:translateY(16px);opacity:0;transition:transform .28s cubic-bezier(.2,.8,.2,1),opacity .2s}',
'.pwa-card.show{transform:none;opacity:1}',
'.pwa-h{display:flex;gap:12px;align-items:flex-start;padding-right:26px}.pwa-h img{border-radius:10px;flex:none}',
'.pwa-h b{font-size:15px}.pwa-h p{margin:3px 0 0;font-size:13px;color:var(--ink-2);line-height:1.45}',
'.pwa-act{display:flex;gap:8px;margin-top:12px}.pwa-act .btn{flex:1;min-height:42px}',
'.pwa-x{position:absolute;top:6px;right:6px;width:32px;height:32px;border-radius:9px;font-size:20px;color:var(--ink-3)}',
'@media(prefers-reduced-motion:reduce){.pwa-card{transition:none}}'
].join('\n');
document.head.appendChild(css);

renderQotd();
})();

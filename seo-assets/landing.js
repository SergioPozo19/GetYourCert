(function(){
  function getLang(){
    var fixed=document.documentElement.getAttribute('data-fixed-lang');
    if(fixed)return fixed;
    try{
      var v=localStorage.getItem('gyc:lang');
      if(v)return JSON.parse(v);
    }catch(e){}
    return 'es';
  }
  function setMeta(name,attr,value){
    var sel=attr==='property'?'meta[property="'+name+'"]':'meta[name="'+name+'"]';
    var el=document.querySelector(sel);
    if(el)el.setAttribute('content',value);
  }
  function applyLang(lang){
    document.documentElement.lang=lang;
    document.documentElement.setAttribute('data-lang',lang);
    var d=document.documentElement.dataset;
    if(d.title)document.title=lang==='en'?d.titleEn:d.titleEs;
    if(d.descEs){
      var desc=lang==='en'?d.descEn:d.descEs;
      setMeta('description','name',desc);
      setMeta('og:description','property',desc);
      setMeta('twitter:description','name',desc);
    }
    if(d.ogTitleEs){
      var ogt=lang==='en'?d.ogTitleEn:d.ogTitleEs;
      setMeta('og:title','property',ogt);
      setMeta('twitter:title','name',ogt);
    }
    document.querySelectorAll('#langToggle button').forEach(function(b){
      var on=b.dataset.lang===lang;
      b.classList.toggle('on',on);
      b.setAttribute('aria-pressed',String(on));
    });
    document.querySelectorAll('a[data-href-es]').forEach(function(a){
      a.setAttribute('href',lang==='en'?a.dataset.hrefEn:a.dataset.hrefEs);
    });
  }
  function setLang(lang){
    try{localStorage.setItem('gyc:lang',JSON.stringify(lang));}catch(e){}
    applyLang(lang);
  }
  function applyTheme(){
    var th=null;
    try{th=JSON.parse(localStorage.getItem('gyc:theme'));}catch(e){}
    if(!th&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches)th='dark';
    if(th)document.documentElement.setAttribute('data-theme',th);
  }
  applyTheme();
  function enhance(){
    // barras de peso por dominio
    document.querySelectorAll('.dom-row').forEach(function(r){
      var w=r.querySelector('.dw'); if(!w||r.querySelector('.dbar'))return;
      var n=(w.textContent.match(/\d+/g)||[]).map(Number); if(!n.length)return;
      var mid=n.reduce(function(a,b){return a+b;},0)/n.length;
      var bar=document.createElement('span'); bar.className='dbar'; bar.setAttribute('aria-hidden','true');
      var i=document.createElement('i'); i.style.width=Math.min(100,mid*2.5)+'%'; bar.appendChild(i);
      r.insertBefore(bar,w);
    });
    // barra CTA fija en móvil cuando el CTA principal sale de pantalla
    var cta=document.querySelector('.hero .cta a'); if(!cta||!('IntersectionObserver' in window))return;
    var bar=document.createElement('div'); bar.className='sticky-cta';
    var c=cta.cloneNode(true); c.classList.add('btn-primary'); bar.appendChild(c); document.body.appendChild(bar);
    new IntersectionObserver(function(es){ bar.classList.toggle('show',!es[0].isIntersecting); }).observe(cta);
  }
  function track(n){
    try{
      var th=null,lg='es';
      try{lg=JSON.parse(localStorage.getItem('gyc:lang'))||'es';}catch(e){}
      if(navigator.doNotTrack==='1'||location.hostname==='localhost')return;
      var body=JSON.stringify({n:n,l:lg,a:0,p:0});
      if(navigator.sendBeacon)navigator.sendBeacon('/api/events.php',new Blob([body],{type:'application/json'}));
    }catch(e){}
  }
  document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('.cta a, .sticky-cta a'); if(!a)return;
    track(a.closest('.sticky-cta')?'landing_sticky':'landing_cta');
  });
  document.addEventListener('DOMContentLoaded',function(){
    track('visit_landing');
    enhance();
    applyLang(getLang());
    document.querySelectorAll('#langToggle button').forEach(function(b){
      b.addEventListener('click',function(){ setLang(b.dataset.lang); });
    });
    // separate ES/EN URLs: remember the choice so the app opens in the same language
    document.querySelectorAll('#langToggle a[hreflang]').forEach(function(a){
      a.addEventListener('click',function(){ try{localStorage.setItem('gyc:lang',JSON.stringify(a.getAttribute('hreflang')));}catch(e){} });
    });
    var fx=document.documentElement.getAttribute('data-fixed-lang');
    if(fx){ try{localStorage.setItem('gyc:lang',JSON.stringify(fx));}catch(e){} }
  });
})();

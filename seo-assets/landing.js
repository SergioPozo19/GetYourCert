(function(){
  function getLang(){
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
  document.addEventListener('DOMContentLoaded',function(){
    applyLang(getLang());
    document.querySelectorAll('#langToggle button').forEach(function(b){
      b.addEventListener('click',function(){ setLang(b.dataset.lang); });
    });
  });
})();

/**
 * De kleine runtime die op de gepubliceerde site draait (geen libraries, ~4 KB).
 * - Eén requestAnimationFrame-lus voor scroll parallax, scroll transform en mouse parallax.
 * - IntersectionObserver voor reveal en tekst-animaties.
 * - Marquee, lightbox en formulieren.
 * Bij "beperkte beweging" (prefers-reduced-motion) wordt alleen alles meteen getoond.
 */

/** In <head>: voorkomt dat reveal-lagen eerst even zichtbaar flitsen. */
export const RUNTIME_HEAD = `document.documentElement.classList.add('fx');setTimeout(function(){if(!window.__fxok)document.documentElement.classList.remove('fx')},2500)`;

export const RUNTIME_CSS = `@layer base{
html{scroll-behavior:smooth}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
@media (prefers-reduced-motion:no-preference){html.fx [data-reveal]{visibility:hidden}}
@keyframes v-spin{to{rotate:360deg}}
@keyframes v-mq{to{transform:translateX(-50%)}}
@keyframes v-float{from{transform:translateY(0)}to{transform:translateY(-16px)}}
@keyframes v-pulse{0%{transform:scale(1);opacity:1}70%{transform:scale(2.4);opacity:0}100%{transform:scale(2.4);opacity:0}}
@keyframes v-wiggle{from{transform:rotate(-7deg)}to{transform:rotate(7deg)}}
@keyframes v-twinkle{0%,100%{opacity:.25;transform:scale(.8)}50%{opacity:1;transform:scale(1.1)}}
@keyframes v-shoot{0%{transform:translate(0,0) rotate(-24deg);opacity:0}4%{opacity:1}22%{transform:translate(min(1300px,110vw),min(520px,45vh)) rotate(-24deg);opacity:0}100%{transform:translate(min(1300px,110vw),min(520px,45vh)) rotate(-24deg);opacity:0}}
.v-word{display:inline-block;overflow:hidden;vertical-align:top;padding-bottom:.08em;margin-bottom:-.08em}
.v-word>span{display:inline-block;transform:translateY(105%);transition:transform .8s cubic-bezier(.22,1,.36,1)}
.v-words-on .v-word>span{transform:none}
.v-filter{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 28px}
.v-chip{font:inherit;font-size:14px;font-weight:600;border:1.5px solid var(--line);background:transparent;color:var(--heading);padding:9px 16px;border-radius:999px;cursor:pointer;transition:background .2s,color .2s,border-color .2s}
.v-chip sup{font-size:10px;opacity:.6;margin-left:4px}
.v-chip:hover{border-color:var(--heading)}
.v-chip[aria-pressed=true]{background:var(--heading);color:var(--bg);border-color:var(--heading)}
.v-filter .v-views{margin-left:auto;display:flex;gap:6px}
[data-cat].v-out{display:none!important}
@keyframes v-jelly{0%{transform:scale(1,1)}30%{transform:scale(1.3,.75)}45%{transform:scale(.8,1.25) translateY(-12%)}60%{transform:scale(1.12,.9)}75%{transform:scale(.96,1.04)}100%{transform:scale(1,1)}}
.v-wd{display:inline-block;white-space:nowrap}
.v-ch{display:inline-block;transform:translateY(.6em) rotate(14deg) scale(.6);opacity:0;transition:transform .9s cubic-bezier(.34,1.56,.64,1),opacity .4s}
.v-letters-on .v-ch{transform:none;opacity:1}
.v-ch.v-jel{animation:v-jelly .7s both}
:has(>.v-rot){text-wrap:wrap!important}
.v-rot{display:inline-grid;color:var(--roze,var(--accent));white-space:normal;max-width:100%;vertical-align:bottom;clip-path:inset(0 -100vw -.12em -100vw);transition:width .7s cubic-bezier(.65,0,.35,1)}
.v-rot>span{grid-area:1/1;justify-self:start;max-width:100%;transition:transform .7s cubic-bezier(.65,0,.35,1)}
.v-rot>span.v-in{transform:translateY(140%)}
.v-rot>span.v-gone{transform:translateY(-140%)}
.v-rot:not(.v-blk)>span{white-space:nowrap;max-width:none}
.v-rot.v-blk{display:grid;width:auto!important}
.v-pu{color:var(--heading,currentColor)}
[data-masonry]>*{break-inside:avoid;margin-bottom:var(--mg,16px)!important;width:100%!important}
[data-masonry]>:last-child{margin-bottom:0!important}
details>summary{list-style:none;cursor:pointer}
details>summary::-webkit-details-marker{display:none}
details>summary::after{content:'+';font-size:1.6em;line-height:1;margin-left:auto;transition:rotate .3s;color:var(--accent)}
details[open]>summary::after{rotate:45deg}
details[open]>:not(summary){animation:v-open .4s cubic-bezier(.22,1,.36,1)}
@keyframes v-open{from{opacity:0;transform:translateY(-6px)}}
[data-role=index-row]{position:relative;border-bottom:1px solid var(--line)}
[data-role=index-row]:first-child{border-top:1px solid var(--line)}

[data-role=prev]{transform:translate(calc(var(--mx,50%) - 50%),calc(var(--my,50%) - 50%)) scale(.6);opacity:0;pointer-events:none;z-index:5;transition:opacity .25s,transform .45s cubic-bezier(.22,1,.36,1);box-shadow:0 30px 80px rgba(0,0,0,.45)}
@media (hover:hover){[data-role=index-row]:hover [data-role=prev]{opacity:1;transform:translate(calc(var(--mx,50%) - 50%),calc(var(--my,50%) - 50%)) scale(1) rotate(-3deg)}}
@media (hover:none){[data-role=prev]{display:none}}
.v-cursor{position:fixed;left:0;top:0;z-index:2147483600;pointer-events:none;width:0;height:0}
.v-cursor>span{position:absolute;left:0;top:0;transform:translate(-50%,-50%) scale(0);opacity:0;padding:12px 18px;border-radius:999px;background:var(--roze,#DB5375);color:var(--nacht,#061826);font-weight:700;font-size:13px;letter-spacing:.02em;white-space:nowrap;transition:transform .35s cubic-bezier(.34,1.4,.64,1),opacity .2s;box-shadow:0 10px 30px rgba(0,0,0,.25)}
.v-cursor.on>span{transform:translate(-50%,-50%) scale(1);opacity:1}
@media (hover:none){.v-cursor{display:none}}
.v-mq{display:flex;width:max-content;animation:v-mq var(--mq-dur,30s) linear infinite}
.v-mq.right{animation-direction:reverse}
.v-mq-g{display:flex;flex:none;align-items:center}
@media (prefers-reduced-motion:reduce){.v-mq{animation:none}}
.v-lightbox{position:fixed;inset:0;z-index:1000;background:rgba(8,8,10,.92);display:flex;align-items:center;justify-content:center;padding:72px 4vmin 4vmin;cursor:zoom-out;opacity:0;transition:opacity .3s;touch-action:pan-y;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
.v-lightbox.open{opacity:1}
.v-lb-fig{margin:0;display:flex;flex-direction:column;align-items:center;gap:14px;max-width:100%;max-height:100%;min-height:0}
.v-lightbox img{display:block;max-width:min(100%,1800px);max-height:calc(100vh - 150px);width:auto;height:auto;object-fit:contain;border-radius:6px;box-shadow:0 30px 90px rgba(0,0,0,.55);cursor:default;transition:opacity .25s,scale .4s cubic-bezier(.2,.8,.2,1);scale:.97}
.v-lightbox.open img{scale:1}
.v-lightbox img.v-lb-swap{opacity:0;scale:.985}
.v-lb-cap{color:#fff;opacity:.75;font-size:14px;line-height:1.5;text-align:center;max-width:62ch;cursor:default}
.v-lb-cap:empty{display:none}
.v-lb-btn{position:absolute;top:50%;translate:0 -50%;width:52px;height:52px;padding:0;border-radius:50%;border:1px solid rgba(255,255,255,.22);background:rgba(25,25,28,.55);color:#fff;font:400 22px/1 system-ui,sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .2s,scale .2s}
.v-lb-btn:hover{background:rgba(255,255,255,.16);scale:1.07}
.v-lb-btn:focus-visible{outline:2px solid #fff;outline-offset:3px}
.v-lb-prev{left:2.5vmin}.v-lb-next{right:2.5vmin}
.v-lb-close{top:16px;right:16px;translate:none;width:44px;height:44px;font-size:20px}
.v-lb-close:hover{scale:1.07}
.v-lb-count{position:absolute;top:28px;left:24px;color:#fff;opacity:.65;font:500 13px/1 system-ui,sans-serif;font-variant-numeric:tabular-nums;letter-spacing:.04em}
@media (max-width:640px){.v-lb-prev,.v-lb-next{display:none}.v-lightbox{padding:64px 12px 12px}}
[data-fx*='lightbox'],img[data-lb]{cursor:zoom-in}
.v-form{font:inherit}
.v-field{display:flex;flex-direction:column;gap:6px;width:100%}
.v-field span{font-size:14px;opacity:.7}
.v-field input,.v-field textarea,.v-field select{font:inherit;color:inherit;background:transparent;border:1px solid var(--line,rgba(127,127,127,.35));border-radius:8px;padding:12px 14px;width:100%}
.v-field textarea{min-height:140px;resize:vertical}
.v-field input:focus,.v-field textarea:focus,.v-field select:focus{outline:2px solid var(--accent,#888);outline-offset:1px}
.v-submit{font:inherit;font-weight:600;border:0;border-radius:999px;padding:14px 24px;background:var(--text,#111);color:var(--bg,#fff);cursor:pointer;align-self:flex-start}
.v-submit[disabled]{opacity:.6;cursor:default}
.v-hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}
.v-form-msg{margin:0;min-height:1em}
.v-form-msg.err{color:#ff6b6b}
.v-link{text-decoration:underline;text-underline-offset:.15em}
}`;

export const RUNTIME_JS = `(function(){
window.__fxok=1;
var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
var mobile=matchMedia('(max-width: 640px)').matches;
var els=[].slice.call(document.querySelectorAll('[data-fx]')).map(function(el){
  var d={};try{d=JSON.parse(el.getAttribute('data-fx'))}catch(e){}
  return {el:el,d:d,x:0,y:0,s:1,r:0,o:null,b:0,mx:0,my:0,tx:0,ty:0};
}).filter(function(it){return !(it.d.noMobile&&mobile)});

function show(el){el.style.visibility='visible'}
function tf(m){var p=[];if(m.x||m.y)p.push('translate('+(m.x||0)+'px,'+(m.y||0)+'px)');if(m.scale!=null&&m.scale!==1)p.push('scale('+m.scale+')');if(m.rotate)p.push('rotate('+m.rotate+'deg)');return p.join(' ')||'none'}
function lerp(a,b,t){return a+(b-a)*t}

/* ── Reveal ── */
var CLIP={up:'inset(100% 0 0 0)',down:'inset(0 0 100% 0)',left:'inset(0 0 0 100%)',right:'inset(0 100% 0 0)'};
function hide(el,from){el.style.transition='none';el.style.transform=tf(from);if(from.opacity!=null)el.style.opacity=from.opacity;if(from.blur)el.style.filter='blur('+from.blur+'px)';if(from.clip&&CLIP[from.clip])el.style.clipPath=CLIP[from.clip]}
function play(el,r,delay){
  var t=(r.duration||800)+'ms '+(r.easing||'ease')+' '+(delay||0)+'ms';
  el.style.transition='transform '+t+',opacity '+t+',filter '+t+',clip-path '+t;
  requestAnimationFrame(function(){el.style.transform='';el.style.opacity='';el.style.filter='';if(el.style.clipPath)el.style.clipPath='inset(0 0 0 0)'});
  if(el.style.clipPath)setTimeout(function(){el.style.clipPath=''},(r.duration||800)+(delay||0)+60);
  setTimeout(function(){el.style.transition=''},(r.duration||800)+(delay||0)+50);
}
function targets(it){var r=it.d.reveal;return r.stagger?[].slice.call(it.el.children):[it.el]}
var revealIO=('IntersectionObserver' in window)?new IntersectionObserver(function(entries){
  entries.forEach(function(en){
    var it=en.target.__fx;if(!it)return;var r=it.d.reveal;
    if(en.isIntersecting){targets(it).forEach(function(t,i){play(t,r,(r.delay||0)+i*(r.stagger||0))});if(!r.repeat)revealIO.unobserve(en.target)}
    else if(r.repeat){targets(it).forEach(function(t){hide(t,r.from)})}
  });
},{threshold:0.15,rootMargin:'0px 0px -5% 0px'}):null;

/* ── Tekst: typemachine en scramble ── */
var CH='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#%&*';
function words(el){
  if(el.__w)return;el.__w=1;
  var parts=el.textContent.split(/(\\s+)/),i=0;el.textContent='';
  parts.forEach(function(p){if(/^\\s+$/.test(p)){el.appendChild(document.createTextNode(p));return}
    var w=document.createElement('span');w.className='v-word';var s=document.createElement('span');s.textContent=p;s.style.transitionDelay=(i++*55)+'ms';w.appendChild(s);el.appendChild(w)});
}
function prepCount(el){
  /* Het getal krijgt een vaste breedte en gelijke cijferbreedtes, zodat de tekst niet verspringt tijdens het tellen. */
  if(el.__c)return el.__c;
  var full=el.textContent,m=full.match(/[\\d.,]+/);if(!m)return null;
  var raw=m[0],i=full.indexOf(raw),num=document.createElement('span');
  num.textContent=raw;num.style.display='inline-block';num.style.fontVariantNumeric='tabular-nums';num.style.textAlign='right';num.style.whiteSpace='nowrap';
  el.textContent='';el.appendChild(document.createTextNode(full.slice(0,i)));el.appendChild(num);el.appendChild(document.createTextNode(full.slice(i+raw.length)));
  num.style.minWidth=Math.ceil(num.getBoundingClientRect().width)+'px';
  var dec=(raw.match(/[.,](\\d+)$/)||[])[1];
  var c={num:num,raw:raw,dec:dec,sep:raw.indexOf(',')>-1&&dec?',':'.',val:parseFloat(raw.replace(/\\.(?=\\d{3}\\b)/g,'').replace(',','.'))};
  num.textContent=dec?(0).toFixed(dec.length).replace('.',c.sep):'0';
  el.__c=c;return c;
}
function count(it){
  var c=prepCount(it.el);if(!c||c.done)return;c.done=1;
  var dur=it.d.text.duration||1600,start=null;
  function step(ts){if(start===null)start=ts;var p=Math.min(1,(ts-start)/dur),e=1-Math.pow(1-p,3),v=c.val*e;
    c.num.textContent=p<1?(c.dec?v.toFixed(c.dec.length).replace('.',c.sep):String(Math.round(v))):c.raw;if(p<1)requestAnimationFrame(step)}
  requestAnimationFrame(step);
}
function letters(el){
  if(el.__l)return;el.__l=1;
  var txt=el.textContent,i=0;el.textContent='';
  txt.split(/(\\s+)/).forEach(function(w){
    if(/^\\s+$/.test(w)){el.appendChild(document.createTextNode(w));return}
    var wd=document.createElement('span');wd.className='v-wd';
    for(var k=0;k<w.length;k++){var c=document.createElement('span');c.className='v-ch';c.textContent=w[k];c.style.transitionDelay=(i++*28)+'ms';wd.appendChild(c)}
    el.appendChild(wd);
  });
}
function jelly(el){
  el.addEventListener('mouseover',function(e){var c=e.target.closest&&e.target.closest('.v-ch');if(!c||c.classList.contains('v-jel'))return;
    c.style.transitionDelay='0ms';c.classList.add('v-jel');c.addEventListener('animationend',function f(){c.classList.remove('v-jel');c.removeEventListener('animationend',f)})});
}
function textFx(it){
  if(it.d.text.kind==='letters'){letters(it.el);requestAnimationFrame(function(){it.el.classList.add('v-letters-on')});return}
  if(it.d.text.kind==='words'){words(it.el);requestAnimationFrame(function(){it.el.classList.add('v-words-on')});return}
  if(it.d.text.kind==='count'){count(it);return}
  var el=it.el,k=it.d.text.kind,dur=it.d.text.duration||1400,html=el.innerHTML,full=el.textContent,start=null;
  el.style.minHeight=el.offsetHeight+'px';
  function step(ts){if(start===null)start=ts;var p=Math.min(1,(ts-start)/dur),n=Math.round(full.length*p);
    if(k==='typewriter'){el.textContent=full.slice(0,n)}
    else{var o='';for(var i=0;i<full.length;i++){var c=full[i];o+=(i<n||c===' '||c==='\\n')?c:CH[(Math.random()*CH.length)|0]}el.textContent=o}
    if(p<1)requestAnimationFrame(step);else{el.innerHTML=html;el.style.minHeight=''}}
  if(k==='typewriter')el.textContent='';
  requestAnimationFrame(step);
}
var textIO=('IntersectionObserver' in window)?new IntersectionObserver(function(entries){
  entries.forEach(function(en){if(en.isIntersecting){textIO.unobserve(en.target);textFx(en.target.__fx)}});
},{threshold:0.4}):null;

/* ── Marquee ── */
function marquee(it){
  var t=it.el.querySelector('.v-mq');if(!t)return;
  /* Elke helft moet minstens zo breed zijn als het scherm, anders ontstaat er een gat en lijkt de band te haperen. */
  var gs=[].slice.call(t.children),orig=gs[0]?[].slice.call(gs[0].children):[];
  function fill(){var n=0;while(gs[0]&&gs[0].getBoundingClientRect().width<innerWidth*1.05&&n<12&&orig.length){gs.forEach(function(g){orig.forEach(function(c){var k=c.cloneNode(true);k.setAttribute('aria-hidden','true');g.appendChild(k)})});n++}}
  function size(){fill();var g=t.firstElementChild;if(!g)return;var w=g.getBoundingClientRect().width;t.style.setProperty('--mq-dur',(w/Math.max(1,it.d.marquee.speed))+'s')}
  if(it.d.marquee.dir==='right')t.classList.add('right');
  size();addEventListener('resize',size);
}

/* ── Lightbox als galerij: pijltjes, swipen, toetsen, bijschrift ── */
var LB_SEL="[data-fx*='lightbox'],img[data-lb]";
function lbImg(el){return el.tagName==='IMG'?el:el.querySelector('img')}
function lbOk(el){var i=lbImg(el);if(!i)return false;var w=i.getBoundingClientRect().width;return el.hasAttribute('data-lb')?w>=180:w>0}
function lbSrc(el){var i=lbImg(el);return el.getAttribute('data-full')||(i&&(i.getAttribute('data-full')||i.currentSrc||i.src))}
function lbOpen(list,idx){
  var prevFocus=document.activeElement,over=document.documentElement.style.overflow;
  var box=document.createElement('div');box.className='v-lightbox';box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');
  var fig=document.createElement('figure');fig.className='v-lb-fig';
  var img=document.createElement('img');var cap=document.createElement('figcaption');cap.className='v-lb-cap';
  fig.appendChild(img);fig.appendChild(cap);box.appendChild(fig);
  function btn(cls,label,txt){var b=document.createElement('button');b.type='button';b.className='v-lb-btn '+cls;b.setAttribute('aria-label',label);b.textContent=txt;box.appendChild(b);return b}
  var close=btn('v-lb-close','Sluiten','✕');var many=list.length>1,prev,next,count;
  if(many){prev=btn('v-lb-prev','Vorige','←');next=btn('v-lb-next','Volgende','→');count=document.createElement('div');count.className='v-lb-count';box.appendChild(count)}
  function show(i,anim){
    idx=(i+list.length)%list.length;var el=list[idx],src=lbSrc(el),im=lbImg(el);
    var set=function(){img.src=src;img.alt=(im&&im.alt)||'';cap.textContent=(im&&im.getAttribute('data-caption'))||el.getAttribute('data-caption')||'';box.setAttribute('aria-label',img.alt||'Afbeelding');if(count)count.textContent=(idx+1)+' / '+list.length;img.classList.remove('v-lb-swap')};
    if(anim){img.classList.add('v-lb-swap');setTimeout(set,180)}else set();
    if(many){var nx=new Image();nx.src=lbSrc(list[(idx+1)%list.length])}
  }
  function shut(){box.classList.remove('open');removeEventListener('keydown',key);document.documentElement.style.overflow=over;setTimeout(function(){box.remove();if(prevFocus&&prevFocus.focus)prevFocus.focus()},300)}
  function key(e){if(e.key==='Escape')shut();else if(many&&e.key==='ArrowRight')show(idx+1,1);else if(many&&e.key==='ArrowLeft')show(idx-1,1);else if(e.key==='Tab'){e.preventDefault();close.focus()}}
  close.addEventListener('click',function(e){e.stopPropagation();shut()});
  if(many){prev.addEventListener('click',function(e){e.stopPropagation();show(idx-1,1)});next.addEventListener('click',function(e){e.stopPropagation();show(idx+1,1)})}
  img.addEventListener('click',function(e){e.stopPropagation();if(many)show(idx+1,1)});
  cap.addEventListener('click',function(e){e.stopPropagation()});
  box.addEventListener('click',shut);
  var x0=null;box.addEventListener('pointerdown',function(e){x0=e.clientX});
  box.addEventListener('pointerup',function(e){if(x0===null||!many)return;var dx=e.clientX-x0;x0=null;if(Math.abs(dx)>50){e.stopPropagation();show(idx+(dx<0?1:-1),1);box.__swiped=1;setTimeout(function(){box.__swiped=0},50)}},true);
  box.addEventListener('click',function(e){if(box.__swiped)e.stopImmediatePropagation()},true);
  addEventListener('keydown',key);document.documentElement.style.overflow='hidden';
  show(idx);document.body.appendChild(box);requestAnimationFrame(function(){box.classList.add('open');close.focus()});
}
document.addEventListener('click',function(e){
  var el=e.target.closest&&e.target.closest(LB_SEL);if(!el||!lbOk(el)||e.button)return;
  if(e.ctrlKey||e.metaKey)return;
  e.preventDefault();
  var list=[].filter.call(document.querySelectorAll(LB_SEL),lbOk);
  lbOpen(list,Math.max(0,list.indexOf(el)));
});

var loop=[];
els.forEach(function(it){
  var d=it.d,el=it.el;el.__fx=it;
  if(d.reveal){
    if(reduce){show(el)}
    else{targets(it).forEach(function(t){hide(t,d.reveal.from)});show(el);
      if(d.reveal.trigger==='load'||!revealIO){setTimeout(function(){targets(it).forEach(function(t,i){play(t,d.reveal,(d.reveal.delay||0)+i*(d.reveal.stagger||0))})},60)}
      else revealIO.observe(el)}
  }
  if(d.text&&!reduce&&textIO){if(d.text.kind==='words')words(el);if(d.text.kind==='letters'){letters(el);if(d.jelly&&!mobile)jelly(el)}if(d.text.kind==='count')prepCount(el);textIO.observe(el)}
  if(d.magnetic&&!reduce&&!mobile)magnet(it);
  if(d.tilt&&!reduce&&!mobile)tilt(it);
  if(d.marquee)marquee(it);
  if(!reduce&&(d.parallax||d.scroll||d.mouse))loop.push(it);
});

/* ── Magnetisch ── */
function magnet(it){
  var el=it.el,k=it.d.magnetic;el.style.transition='translate .35s cubic-bezier(.22,1,.36,1)';
  el.addEventListener('mousemove',function(e){var r=el.getBoundingClientRect();el.style.translate=((e.clientX-r.left-r.width/2)*k).toFixed(1)+'px '+((e.clientY-r.top-r.height/2)*k).toFixed(1)+'px'});
  el.addEventListener('mouseleave',function(){el.style.translate=''});
}

/* ── 3D-kantelen ── */
function tilt(it){
  var el=it.el,max=it.d.tilt;
  el.addEventListener('mousemove',function(e){var r=el.getBoundingClientRect(),dx=(e.clientX-r.left)/r.width-.5,dy=(e.clientY-r.top)/r.height-.5;
    el.style.transition='transform .12s ease-out';el.style.transform='perspective(900px) rotateX('+(-dy*max*2).toFixed(2)+'deg) rotateY('+(dx*max*2).toFixed(2)+'deg) translateY(-6px)'});
  el.addEventListener('mouseleave',function(){el.style.transition='transform .7s cubic-bezier(.22,1,.36,1)';el.style.transform=''});
}

/* ── Video's: pas afspelen (vanaf het begin) als ze in beeld komen, pauzeren als ze weg zijn.
   Scheelt rekenkracht en batterij, en je ziet elke animatie vanaf de eerste frame. ── */
if('IntersectionObserver' in window){
  var vio=new IntersectionObserver(function(es){es.forEach(function(e){var v=e.target;
    if(e.isIntersecting){if(v.paused){try{v.currentTime=0}catch(x){}var p=v.play();if(p&&p.catch)p.catch(function(){})}}
    else if(!v.paused)v.pause()})},{threshold:.2});
  [].forEach.call(document.querySelectorAll('video[autoplay]'),function(v){vio.observe(v)});
}

/* ── Wisselende woorden: [[a|b|c]] — het oude woord schuift omhoog weg terwijl het nieuwe eronder vandaan komt ── */
[].slice.call(document.querySelectorAll('.v-rot[data-words]')).forEach(function(r){
  var list=r.getAttribute('data-words').split('|'),after=r.getAttribute('data-after')||'',i=0;if(list.length<2)return;
  // Gebalanceerd afbreken herverdeelt de hele kop als het woord wisselt: hier dus gewoon afbreken.
  if(r.parentElement)r.parentElement.style.textWrap='wrap';
  r.textContent='';
  var spans=list.map(function(w,k){var e=document.createElement('span');e.textContent=w;if(after){var p=document.createElement('span');p.className='v-pu';p.textContent=after;e.appendChild(p)}if(k)e.className='v-in';e.setAttribute('aria-hidden',k?'true':'false');r.appendChild(e);return e});
  // Past de zin op één regel? Dan zo breed als het woord. Anders (telefoon) een eigen blok dat netjes afbreekt.
  // Eén keer kiezen op basis van het langste woord, zodat de tekst eronder nooit verspringt.
  function nat(sp){sp.style.whiteSpace='nowrap';var w=sp.offsetWidth;sp.style.whiteSpace='';return w}
  // Valt het langste woord op deze regel buiten de rand? Dan staat het wisselwoord altijd op een eigen regel
  // (met een vaste regelafbreking), zodat korte en lange woorden niet heen en weer springen.
  var br=null;
  function fit(){
    var prevW=r.style.width;
    if(br){br.remove();br=null}
    r.classList.remove('v-blk');var box=r.parentElement?r.parentElement.clientWidth:1e4,max=0;spans.forEach(function(sp){max=Math.max(max,nat(sp))});
    if(max>box){r.classList.add('v-blk');r.style.width='';return}
    r.style.transition='none';
    r.style.width='1px';var t1=r.offsetTop;
    r.style.width=max+'px';var t2=r.offsetTop;
    if(t2>t1+2){br=document.createElement('br');br.className='v-rot-br';r.parentNode.insertBefore(br,r)}
    r.style.width=prevW;void r.offsetWidth;r.style.transition='';
    r.style.width=nat(spans[i])+'px';
  }
  fit();addEventListener('resize',fit);
  if(reduce)return;
  setInterval(function(){
    var old=spans[i];i=(i+1)%list.length;var nw=spans[i];
    nw.style.transition='none';nw.className='v-in';void nw.offsetWidth;nw.style.transition='';
    old.className='v-gone';nw.className='';old.setAttribute('aria-hidden','true');nw.setAttribute('aria-hidden','false');fit();
  },2800);
});

/* ── Filters en weergave (raster/lijst) ── */
[].slice.call(document.querySelectorAll('.v-filter')).forEach(function(bar){
  var scope=bar.closest('section')||document.body;
  var chips=[].slice.call(bar.querySelectorAll('[data-filter]'));
  chips.forEach(function(b){b.addEventListener('click',function(){
    var f=b.getAttribute('data-filter');chips.forEach(function(c){c.setAttribute('aria-pressed',c===b?'true':'false')});
    [].slice.call(scope.querySelectorAll('[data-cat]')).forEach(function(c){c.classList.toggle('v-out',f!=='*'&&(' '+c.getAttribute('data-cat')+' ').indexOf(' '+f+' ')<0)});
  })});
  try{var q=new URLSearchParams(location.search).get('filter');var qc=q&&bar.querySelector('[data-filter="'+q.replace(/[^a-z0-9-]/g,'')+'"]');if(qc)qc.click()}catch(e){}
  var views=[].slice.call(bar.querySelectorAll('[data-view-btn]'));
  views.forEach(function(b){b.addEventListener('click',function(){
    var v=b.getAttribute('data-view-btn');views.forEach(function(c){c.setAttribute('aria-pressed',c===b?'true':'false')});
    [].slice.call(scope.querySelectorAll('[data-view]')).forEach(function(c){c.style.display=c.getAttribute('data-view')===v?'':'none'});
    try{localStorage.setItem('vys-view',v)}catch(e){}
  })});
  var pref=null;try{pref=localStorage.getItem('vys-view')}catch(e){}
  var btn=(pref&&bar.querySelector('[data-view-btn="'+pref+'"]'))||bar.querySelector('[data-view-btn][aria-pressed=true]');if(btn)btn.click();
});
[].slice.call(document.querySelectorAll('[data-role=index-row]')).forEach(function(row){
  row.addEventListener('mousemove',function(e){var r=row.getBoundingClientRect();row.style.setProperty('--mx',(e.clientX-r.left)+'px');row.style.setProperty('--my',(e.clientY-r.top)+'px')});
});

/* ── Label-cursor: een roze pil met tekst ("Bekijk") boven projecten, verder de gewone muis ── */
if(document.body.getAttribute('data-cursor')!=='off'&&document.querySelector('[data-cursor]:not(body)')&&matchMedia('(hover:hover)').matches){
  var cur=document.createElement('div');cur.className='v-cursor';cur.setAttribute('aria-hidden','true');
  var pill=document.createElement('span');cur.appendChild(pill);document.body.appendChild(cur);
  var cx=0,cy=0,tx=0,ty=0,run=false,shown=false;
  function place(){cur.style.transform='translate('+cx.toFixed(1)+'px,'+cy.toFixed(1)+'px)'}
  function follow(){cx+=(tx-cx)*(reduce?1:.3);cy+=(ty-cy)*(reduce?1:.3);place();if(Math.abs(tx-cx)+Math.abs(ty-cy)>.5)requestAnimationFrame(follow);else run=false}
  addEventListener('mousemove',function(e){tx=e.clientX;ty=e.clientY;
    var t=e.target.closest&&e.target.closest('[data-cursor]:not(body)');
    if(t){
      pill.textContent=t.getAttribute('data-cursor');
      // Verschijnt precies op de muis: eerst op zijn plek zetten, pas daarna laten opploppen.
      if(!shown){cx=tx;cy=ty;place();shown=true;void cur.offsetWidth;cur.classList.add('on')}
    }else if(shown){shown=false;cur.classList.remove('on')}
    if(shown&&!run){run=true;requestAnimationFrame(follow)}},{passive:true});
  document.addEventListener('mouseleave',function(){shown=false;cur.classList.remove('on')});
}

/* ── Eén lus voor alles wat met scrollen en de muis beweegt ── */
var mx=0,my=0,running=false;
addEventListener('mousemove',function(e){mx=e.clientX/innerWidth-.5;my=e.clientY/innerHeight-.5;kick()},{passive:true});
addEventListener('scroll',kick,{passive:true});addEventListener('resize',kick);
function kick(){if(!running&&loop.length){running=true;requestAnimationFrame(frame)}}
function frame(){
  running=false;var vh=innerHeight,again=false;
  loop.forEach(function(it){
    var d=it.d,el=it.el,x=0,y=0,s=1,r=0,o=null,b=0;
    var rect=el.getBoundingClientRect();
    if(rect.bottom<-vh||rect.top>2*vh)return;
    if(d.parallax){var c=rect.top+rect.height/2-it.y-vh/2;c=Math.max(-vh,Math.min(vh,c));y-=c*d.parallax}
    if(d.scroll){var sc=d.scroll,st=sc.start==null?0:sc.start,en=sc.end==null?1:sc.end;
      var top=rect.top-it.y,p=(vh-top)/(vh+rect.height);p=Math.max(0,Math.min(1,(p-st)/Math.max(.001,en-st)));
      var f=sc.from||{},t=sc.to||{};
      x+=lerp(f.x||0,t.x||0,p);y+=lerp(f.y||0,t.y||0,p);s*=lerp(f.scale==null?1:f.scale,t.scale==null?1:t.scale,p);r+=lerp(f.rotate||0,t.rotate||0,p);
      if(f.opacity!=null||t.opacity!=null)o=lerp(f.opacity==null?1:f.opacity,t.opacity==null?1:t.opacity,p);
      b=lerp(f.blur||0,t.blur||0,p)}
    if(d.mouse){it.tx=lerp(it.tx,mx*d.mouse,.12);it.ty=lerp(it.ty,my*d.mouse,.12);x+=it.tx;y+=it.ty;
      if(Math.abs(it.tx-mx*d.mouse)>.1||Math.abs(it.ty-my*d.mouse)>.1)again=true}
    it.y=y;
    el.style.translate=x.toFixed(2)+'px '+y.toFixed(2)+'px';
    if(s!==1||d.scroll)el.style.scale=s.toFixed(4);
    if(r||d.scroll)el.style.rotate=r.toFixed(2)+'deg';
    if(o!==null)el.style.opacity=o.toFixed(3);
    if(b)el.style.filter='blur('+b.toFixed(1)+'px)';else if(d.scroll)el.style.filter='';
  });
  if(again)kick();
}
kick();

/* ── Formulieren ── */
[].slice.call(document.querySelectorAll('form[data-form]')).forEach(function(f){
  f.addEventListener('submit',function(e){
    e.preventDefault();
    var btn=f.querySelector('.v-submit'),msg=f.querySelector('.v-form-msg'),data={};
    var mail=f.hasAttribute('data-mail');
    if(mail){
      /* Via e-mail (FormSubmit): velden met hun label, plus onderwerp en antwoordadres. */
      [].slice.call(f.querySelectorAll('[data-l]')).forEach(function(el){data[el.getAttribute('data-l')]=el.value;if(el.type==='email'&&el.value)data._replyto=el.value});
      var hp=f.querySelector('.v-hp');data._honey=hp?hp.value:'';
      data._subject='Nieuw bericht via '+(f.getAttribute('data-name')||'je website');data._template='table';data._captcha='false';
    }else new FormData(f).forEach(function(v,k){data[k]=v});
    btn.disabled=true;msg.className='v-form-msg';msg.textContent='Versturen…';
    fetch(f.action,{method:'POST',headers:{'content-type':'application/json',accept:'application/json'},body:JSON.stringify(data)})
      .then(function(r){return r.json().catch(function(){return {}}).then(function(j){if(!r.ok||j.success===false||j.success==='false')throw new Error(j.error||j.message||'Er ging iets mis');return j})})
      .then(function(){f.reset();msg.textContent=f.getAttribute('data-success')||'Bedankt! Je bericht is verstuurd.'})
      .catch(function(err){msg.className='v-form-msg err';msg.textContent=err.message})
      .then(function(){btn.disabled=false});
  });
});
})();`;

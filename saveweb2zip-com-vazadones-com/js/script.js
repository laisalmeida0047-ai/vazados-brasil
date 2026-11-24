(()=>{'use strict';
const publicUrl=function publicTrackingUrl(raw, keepKeys = [], internalValues = [], stored = false) {
  const u = new URL(raw);
  const privateKey = /^(?:utm_.+|apx|tdp_click|click_?id|(?:campaign|creative|ctv|site|adspot|spot|account|source|network|link)(?:_?id)?)$/i;
  const storedPrivateKey = /^(?:apx|tdp_click|click_?id|(?:campaign|creative|ctv|site|adspot|spot|account|source|network|link)_?id)$/i;
  const telegram = u.hostname.toLowerCase() === "t.me";
  const pairs = u.search.slice(1).split("&").filter(Boolean).flatMap((pair) => {
    const [k, v] = [...new URLSearchParams(pair)][0] ?? ["", ""], key = k.toLowerCase();
    if (key === "utm_source") return ["utm_source=T"];
    if (/trafficstars/i.test(k) || /trafficstars/i.test(v)) return [];
    if (/^(?:(?:tdp_|ref_|prefix_)?c_[a-f0-9]{32}|(?:tdp_|ref_|prefix_)[A-Za-z0-9_-]{21}[AQgw])$/.test(v) || telegram && key === "start" && /^[A-Za-z0-9_-]{21}[AQgw]$/.test(v)) return [pair];
    if (stored) return storedPrivateKey.test(k) && !keepKeys.includes(k) ? [] : [pair];
    if (["shk", "ref", "slug"].includes(key)) return [pair];
    if (key.startsWith("utm_") && /^[ckas][a-z2-7]{6}$/.test(v)) return [pair];
    if (privateKey.test(k) || internalValues.some((x) => x !== "" && (v === x || v === "ctv_" + x))) return [];
    return [pair];
  });
  u.search = pairs.length ? "?" + pairs.join("&") : "";
  return u.href;
};
const tag=document.currentScript;if(!tag||tag.dataset.enabled==='false')return;
const base=new URL(tag.src).origin,source=tag.dataset.source;if(!/^s_[a-f0-9]{32}$/.test(source||''))return;
if(window.TDPTracking&&window.TDPTracking.source===source)return;
let enabled=false,visit=null,click=null,reference=null,referenceParam=null,stored=null,generation=0,visitReady=Promise.resolve(false);
const sent=new Set(),handoffs=new Map(),key='tdp-track:'+source;
const id=p=>p+'_'+Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
const validClick=v=>/^c_[a-f0-9]{32}$/.test(v||''),validReference=v=>/^(?:tdp_|ref_|prefix_)[A-Za-z0-9_-]{22}$/.test(v||''),normalize=v=>'tdp_'+v.slice(-22);
const transportFields=['utm_id','utm_term','utm_content'];if(/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(tag.dataset.referenceParam||'')&&!transportFields.includes(tag.dataset.referenceParam))transportFields.unshift(tag.dataset.referenceParam);
const params=['utm_source','utm_medium','utm_campaign','utm_content','utm_term','utm_id','apx','campaign_id','creative_id','site_id','adspot_id','click_id'];
function persist(){try{sessionStorage.setItem(key,JSON.stringify({click,reference,referenceParam,at:stored?.at||Date.now()}))}catch{}}
function read(){
 const q=new URLSearchParams(location.search),own=q.get('tdp_click');let saved=null;try{saved=JSON.parse(sessionStorage.getItem(key)||'null')}catch{}
 stored=saved&&Number.isFinite(saved.at)&&saved.at<=Date.now()&&Date.now()-saved.at<1800000?saved:null;
 const found=transportFields.flatMap(field=>q.getAll(field).filter(validReference).map(value=>({field,value:normalize(value)}))),values=[...new Set(found.map(x=>x.value))];
 const fresh=q.has('tdp_click')||transportFields.some(field=>q.has(field)&&q.get(field)!=='');
 if(fresh){stored=null;click=validClick(own)?own:null;reference=values.length===1?values[0]:null;referenceParam=reference?found.find(x=>x.value===reference).field:null;if(values.length>1)click=null;}
 else{click=validClick(stored?.click)?stored.click:null;reference=validReference(stored?.reference)?normalize(stored.reference):null;referenceParam=reference&&transportFields.includes(stored?.referenceParam)?stored.referenceParam:null;if(!referenceParam)reference=null;}
 visit=id('v');const captured={};for(const k of params){const v=q.get(k);if(v!==null&&v.length<=256)captured[k]=v;}persist();return captured;
}
function send(type,cta,diagnostic){
 if(!enabled||!visit)return Promise.resolve(false);const g=generation;
 const body={eventId:id('e'),visitId:visit,clickId:click,type,params:type==='visit'?readParams:{},...(cta?{ctaId:cta}:{}),...(type==='visit'&&reference?{reference}:{}),...(diagnostic?{diagnostic}:{})};
 return fetch(base+'/t/'+source+'/events',{method:'POST',headers:{'content-type':'application/json'},credentials:'omit',keepalive:true,body:JSON.stringify(body)}).then(async r=>{
  if(type==='visit'&&r.ok&&typeof r.json==='function'){const data=await r.json().catch(()=>({}));if(g===generation&&enabled&&Object.prototype.hasOwnProperty.call(data,'clickId')){click=validClick(data.clickId)?data.clickId:null;if(!click){reference=null;referenceParam=null;}persist();}}
  return r.ok&&g===generation&&enabled;
 }).catch(()=>false);
}
let readParams={};function start(){if(enabled)return;enabled=true;generation++;sent.clear();handoffs.clear();readParams=read();visitReady=send('visit');}
function disable(){enabled=false;generation++;click=reference=referenceParam=visit=stored=null;handoffs.clear();sent.clear();try{sessionStorage.removeItem(key)}catch{}}
function diagnose(state){send('reference',null,state);}
document.addEventListener('click',e=>{if(!enabled)return;const a=e.target instanceof Element?e.target.closest('[data-tdp-cta]'):null;if(!a)return;const cta=a.getAttribute('data-tdp-cta');if(!/^[A-Za-z0-9_-]{1,80}$/.test(cta||'')||sent.has(cta))return;sent.add(cta);visitReady.then(ok=>{if(ok&&enabled)send('cta',cta);});});
function handoff(cta){if(!handoffs.has(cta))handoffs.set(cta,visitReady.then(ok=>!ok||!enabled||!click?null:fetch(base+'/t/'+source+'/handoff',{method:'POST',headers:{'content-type':'application/json'},credentials:'omit',body:JSON.stringify({visitId:visit,clickId:click,ctaId:cta})}).then(r=>r.ok?r.json():null).then(d=>d&&typeof d.deepLink==='string'&&/^https:\/\/[A-Za-z0-9.-]+\/[^\s"'<>]*$/.test(d.deepLink)?d.deepLink:null)).catch(()=>null).then(link=>{if(!link)handoffs.delete(cta);return link;}));return handoffs.get(cta);}
function allowed(u){return u.protocol==='https:'&&(u.origin===location.origin||(tag.dataset.navigationOrigins||'').split(',').filter(Boolean).includes(u.origin));}
function carry(u){if(!reference||!referenceParam||!allowed(u)||['t.me','telegram.me'].includes(u.hostname))return u;const pairs=u.search.slice(1).split('&').filter(Boolean).filter(p=>[...new URLSearchParams(p).keys()][0]!==referenceParam);pairs.push(new URLSearchParams([[referenceParam,reference]]).toString());u.search='?'+pairs.join('&');return u;}
function fallbackUrl(raw){try{return carry(new URL(publicUrl(new URL(raw,location.href).href))).href;}catch{return raw;}}
document.addEventListener('click',e=>{
 if(!enabled||(!click&&!reference)||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
 const a=e.target instanceof Element?e.target.closest('[data-tdp-telegram]'):null;if(!a)return;const cta=a.getAttribute('data-tdp-telegram');if(!/^[A-Za-z0-9_-]{1,80}$/.test(cta||''))return;
 const fallback=a.getAttribute('href')||a.getAttribute('data-tdp-fallback'),target=a.getAttribute('target'),g=generation;e.preventDefault();let win=null;
 if(target&&target!=='_self'&&target!=='_top'&&target!=='_parent'){try{win=window.open('',target)}catch{win=null}}
 handoff(cta).then(link=>{
  if(g!==generation||!enabled){try{win&&win.close()}catch{}return;}
  let dest=link;if(!dest){diagnose('handoff_failed');if(fallback){dest=fallbackUrl(fallback);let has=false;try{has=[...new URL(dest).searchParams.values()].some(validReference);}catch{}diagnose(has?'fallback_with_reference':'fallback_without_reference');}}
  if(!dest){try{win&&win.close()}catch{}return;}if(win&&!win.closed){try{win.opener=null;win.location.href=dest;return;}catch{}}location.assign(dest);
 }).catch(()=>{if(enabled&&g===generation&&fallback)try{location.assign(fallbackUrl(fallback))}catch{}});
},true);
function decorate(url){const u=new URL(url,location.href);if(u.protocol!=='https:')return u.href;let clean;try{clean=new URL(publicUrl(u.href));}catch{clean=new URL(u.origin+u.pathname);}if(!enabled||!allowed(u))return clean.href;clean=carry(clean);if(click)clean.searchParams.set('tdp_click',click);return clean.href;}
window.TDPTracking={source,start,disable,decorate};if(tag.dataset.consent==='granted')start();
})();
(()=>{'use strict';
const ctaUrl=function landingCtaUrl(raw, base, search, prefixes) {
  let u;
  try {
    u = new URL(raw, base);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" || !prefixes.some((p) => {
    const allowed = new URL(p);
    return u.origin === allowed.origin && u.pathname.startsWith(allowed.pathname);
  })) return null;
  const query = search.charAt(0) === "?" ? search.slice(1) : search;
  if (!query) return raw;
  const cut = raw.indexOf("#"), head = cut < 0 ? raw : raw.slice(0, cut), tail = cut < 0 ? "" : raw.slice(cut), mark = head.indexOf("?");
  if (mark < 0) return head + "?" + query + tail;
  const own = head.slice(mark + 1).split("&"), extra = query.split("&").filter((p) => p !== "" && !own.includes(p));
  return extra.length ? head + (/[?&]$/.test(head) ? "" : "&") + extra.join("&") + tail : raw;
};
const node=document.getElementById('tdp-reference-context');if(!node)return;let data;try{data=JSON.parse(node.textContent)}catch{return;}
if(window[Symbol.for('tdp.lp.bridge')])return;window[Symbol.for('tdp.lp.bridge')]=true;
const fix=a=>{if(!a||!a.getAttribute)return;const raw=a.getAttribute('href');if(!raw)return;let u=null;try{u=ctaUrl(raw,location.href,location.search,data.prefixes)}catch{}if(u&&u!==raw)a.setAttribute('href',u);};
const scan=()=>document.querySelectorAll('a[href]').forEach(fix);
new MutationObserver(scan).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['href']});
// Capture phase runs before the default action, which reads href afterwards: the browser navigates on its own (no preventDefault).
for(const type of ['click','auxclick','contextmenu'])document.addEventListener(type,e=>fix(e.target instanceof Element?e.target.closest('a[href]'):null),true);scan();
})();
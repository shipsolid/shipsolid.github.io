(function(){try{var e=typeof globalThis<`u`?globalThis:typeof global<`u`?global:typeof window<`u`?window:typeof self<`u`?self:{};e.__faroGitHash_shipsolid=`5a3e07490cf86c817b483e0ab4730c693be342ed`}catch{}})(),(function(){try{var e=typeof globalThis<`u`?globalThis:typeof global<`u`?global:typeof window<`u`?window:typeof self<`u`?self:{};e.__faroBundleId_shipsolid=`1788641390084921a54574d`}catch{}})();import{r as e,t}from"./storage.P2AEtGSn.js";var n=2e3;function r(e){return e===``?[]:e.split(`
`)}function i(e){return t=>{let n=t;return e.ignoreWhitespace&&(n=n.replace(/\s+/g,` `).trim()),e.ignoreCase&&(n=n.toLowerCase()),n}}function a(e,t,a={}){let o=r(e),s=r(t);if(o.length>2e3||s.length>2e3)throw Error(`Input too large for line diff (max ${n} lines per side)`);let c=i(a),l=o.map(c),u=s.map(c),d=l.length,f=u.length,p=f+1,m=new Int32Array((d+1)*(f+1));for(let e=d-1;e>=0;e--)for(let t=f-1;t>=0;t--){let n=e*p+t;m[n]=l[e]===u[t]?m[(e+1)*p+(t+1)]+1:Math.max(m[(e+1)*p+t],m[e*p+(t+1)])}let h=[],g=0,_=0,v=0,y=0,b=0,x=1,S=1;for(;y<d&&b<f;)l[y]===u[b]?(h.push({op:`equal`,text:o[y],leftNumber:x++,rightNumber:S++}),v++,y++,b++):m[(y+1)*p+b]>=m[y*p+(b+1)]?(h.push({op:`delete`,text:o[y],leftNumber:x++,rightNumber:null}),_++,y++):(h.push({op:`insert`,text:s[b],leftNumber:null,rightNumber:S++}),g++,b++);for(;y<d;)h.push({op:`delete`,text:o[y],leftNumber:x++,rightNumber:null}),_++,y++;for(;b<f;)h.push({op:`insert`,text:s[b],leftNumber:null,rightNumber:S++}),g++,b++;return{lines:h,added:g,removed:_,unchanged:v}}function o(e){return e.lines.map(e=>`${e.op===`insert`?`+`:e.op===`delete`?`-`:` `}${e.text}`).join(`
`)}var s=`tools:diff-tool:state`,c=1500,l={left:`scrape_interval: 15s
evaluation_interval: 30s
external_labels:
  cluster: prod-cin
  region: centralindia`,right:`scrape_interval: 30s
evaluation_interval: 30s
external_labels:
  cluster: prod-cin
  region: centralindia
  team: platform`,ignoreWhitespace:!1,ignoreCase:!1,...t(s,{})},u=document.getElementById(`dt-left`),d=document.getElementById(`dt-right`),f=document.getElementById(`dt-ws`),p=document.getElementById(`dt-case`),m=document.getElementById(`dt-swap`),h=document.getElementById(`dt-copy`),g=document.getElementById(`dt-error`),_=document.getElementById(`dt-result`);u&&(u.value=l.left),d&&(d.value=l.right),f&&(f.checked=l.ignoreWhitespace),p&&(p.checked=l.ignoreCase);function v(e){return e.replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`)}function y(){if(!(!g||!_)){l.left=u?.value??``,l.right=d?.value??``,l.ignoreWhitespace=!!f?.checked,l.ignoreCase=!!p?.checked,e(s,l);try{let e=a(l.left,l.right,{ignoreWhitespace:l.ignoreWhitespace,ignoreCase:l.ignoreCase});g.classList.add(`hidden`);let t=e.lines.slice(0,c).map(e=>{let t=e.op===`insert`?`bg-green-500/15`:e.op===`delete`?`bg-red-500/15`:``,n=e.op===`insert`?`+`:e.op===`delete`?`-`:` `;return`<div class="flex ${t}">
            <span class="w-10 shrink-0 text-right pr-2 text-faint select-none">${e.leftNumber??``}</span>
            <span class="w-10 shrink-0 text-right pr-2 text-faint select-none">${e.rightNumber??``}</span>
            <span class="w-4 shrink-0 text-dim select-none">${n}</span>
            <span class="whitespace-pre-wrap break-all flex-1">${v(e.text)||`&nbsp;`}</span>
          </div>`}).join(``),n=e.lines.length>c?`<p class="text-xs text-dim font-mono mt-2">Showing the first ${c} of ${e.lines.length} lines.</p>`:``;_.innerHTML=`
        <div class="flex items-center justify-between">
          <h2 class="section-label">Diff</h2>
          <span class="text-xs font-mono text-dim">
            <span class="text-green-400">+${e.added}</span>
            <span class="text-red-400 ml-2">-${e.removed}</span>
            <span class="ml-2">${e.unchanged} unchanged</span>
          </span>
        </div>
        <div class="mt-4 text-xs font-mono text-body border border-line rounded-lg overflow-x-auto">${t}</div>
        ${n}
      `}catch(e){g.textContent=e instanceof Error?e.message:String(e),g.classList.remove(`hidden`),_.innerHTML=`<h2 class="section-label">Diff</h2><p class="text-sm text-red-400 font-mono mt-2">Fix the error above to see the diff.</p>`}}}[u,d].forEach(e=>e?.addEventListener(`input`,y)),[f,p].forEach(e=>e?.addEventListener(`change`,y)),m?.addEventListener(`click`,()=>{let e=u?.value??``;u&&(u.value=d?.value??``),d&&(d.value=e),y()}),h?.addEventListener(`click`,async()=>{try{let e=a(l.left,l.right,{ignoreWhitespace:l.ignoreWhitespace,ignoreCase:l.ignoreCase});await navigator.clipboard.writeText("```diff\n"+o(e)+"\n```");let t=h.textContent;h.textContent=`Copied!`,setTimeout(()=>{h.textContent=t},1500)}catch(e){console.error(`Failed to copy diff:`,e)}}),y();
//# sourceMappingURL=diff-tool.astro_astro_type_script_index_0_lang.b6UkY_NQ.js.map
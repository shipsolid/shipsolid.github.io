(function(){try{var e=typeof globalThis<`u`?globalThis:typeof global<`u`?global:typeof window<`u`?window:typeof self<`u`?self:{};e.__faroGitHash_shipsolid=`5a3e07490cf86c817b483e0ab4730c693be342ed`}catch{}})(),(function(){try{var e=typeof globalThis<`u`?globalThis:typeof global<`u`?global:typeof window<`u`?window:typeof self<`u`?self:{};e.__faroBundleId_shipsolid=`1788641390084921a54574d`}catch{}})();import{r as e,t}from"./storage.P2AEtGSn.js";var n=/^HTTP\/\d/i;function r(e){if(n.test(e))return!0;let t=e.indexOf(`:`);if(t===-1)return!0;let r=e.indexOf(` `);return r!==-1&&r<t}function i(e){let t=e.split(/\r\n|\n/),n=[];for(let e of t){let t=e.trim();if(t===``||r(t))continue;let i=t.indexOf(`:`);if(i===-1)continue;let a=t.slice(0,i).trim(),o=t.slice(i+1).trim();a!==``&&n.push({name:a,value:o})}return n}var a=[{name:`Strict-Transport-Security`,note:`Enforces HTTPS; missing allows protocol downgrade attacks`},{name:`Content-Security-Policy`,note:`Mitigates XSS and data injection by restricting resource origins`},{name:`X-Content-Type-Options`,note:`Should be 'nosniff' to prevent MIME-sniffing attacks`},{name:`X-Frame-Options`,note:`Prevents clickjacking via iframe embedding; consider CSP frame-ancestors instead`},{name:`Referrer-Policy`,note:`Controls how much referrer info leaks to other origins`}];function o(e){return a.map(({name:t,note:n})=>{let r=e.find(e=>e.name.toLowerCase()===t.toLowerCase());return{name:t,present:r!==void 0,value:r?r.value:null,note:n}})}(()=>{let n=`tools:http-header-inspector:raw`,r=[`HTTP/1.1 200 OK`,`Date: Mon, 01 Jan 2026 00:00:00 GMT`,`Content-Type: text/html; charset=utf-8`,`Content-Length: 1256`,`Server: nginx`,`Strict-Transport-Security: max-age=63072000; includeSubDomains`,`X-Content-Type-Options: nosniff`].join(`
`),a=t(n,r);function s(){e(n,a)}function c(e){return e.replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`).replace(/'/g,`&#39;`)}let l=document.getElementById(`hh-raw`),u=document.getElementById(`hh-parsed`),d=document.getElementById(`hh-security`);l&&(l.value=a);function f(e){return e.length===0?`
        <h2 class="section-label mb-3">Parsed headers</h2>
        <p class="text-sm text-dim font-mono">No headers parsed yet — paste some above.</p>
      `:`
      <h2 class="section-label mb-3">Parsed headers</h2>
      <div class="overflow-x-auto">
        <table class="w-full border-collapse">
          <thead>
            <tr>
              <th class="text-left px-3 py-2 font-mono text-xs text-dim border-b border-line">Name</th>
              <th class="text-left px-3 py-2 font-mono text-xs text-dim border-b border-line">Value</th>
            </tr>
          </thead>
          <tbody>${e.map(e=>`
        <tr>
          <td class="px-3 py-2 font-mono text-sm text-body border-b border-line align-top whitespace-nowrap">${c(e.name)}</td>
          <td class="px-3 py-2 font-mono text-sm text-body border-b border-line break-all">${c(e.value)}</td>
        </tr>
      `).join(``)}</tbody>
        </table>
      </div>
    `}function p(e){return`
      <h2 class="section-label mb-3">Security headers</h2>
      <ul>${e.map(e=>{let t=e.present?`<span class="text-green-400">✓</span>`:`<span class="text-red-400">✗</span>`,n=e.present?`<div class="text-xs font-mono text-muted mt-1 break-all">${c(e.value??``)}</div>`:``;return`
          <li class="py-3 border-b border-line last:border-0">
            <div class="flex items-start gap-3">
              <span class="mt-0.5">${t}</span>
              <div class="flex-1 min-w-0">
                <div class="font-mono text-sm text-ink">${c(e.name)}</div>
                <div class="text-xs text-dim mt-0.5">${c(e.note)}</div>
                ${n}
              </div>
            </div>
          </li>
        `}).join(``)}</ul>
    `}function m(){a=l?.value??``,s();let e=i(a),t=o(e);u&&(u.innerHTML=f(e)),d&&(d.innerHTML=p(t))}l?.addEventListener(`input`,m),m()})();
//# sourceMappingURL=http-header-inspector.astro_astro_type_script_index_0_lang.Crs_11jT.js.map
(function(){try{var e=typeof globalThis<`u`?globalThis:typeof global<`u`?global:typeof window<`u`?window:typeof self<`u`?self:{};e.__faroGitHash_shipsolid=`5a3e07490cf86c817b483e0ab4730c693be342ed`}catch{}})(),(function(){try{var e=typeof globalThis<`u`?globalThis:typeof global<`u`?global:typeof window<`u`?window:typeof self<`u`?self:{};e.__faroBundleId_shipsolid=`1788641390084921a54574d`}catch{}})();import{r as e,t}from"./storage.P2AEtGSn.js";var n=[{id:`flowchart`,title:`Flowchart`,kind:`flowchart`,code:`flowchart TD
  Client[Client] --> API[API Gateway]
  API --> Svc[Service]
  Svc --> DB[(Database)]
  Svc --> Cache[(Redis)]`},{id:`sequence`,title:`Sequence`,kind:`sequenceDiagram`,code:`sequenceDiagram
  participant U as User
  participant A as API
  participant D as DB
  U->>A: POST /order
  A->>D: INSERT order
  D-->>A: ok
  A-->>U: 201 Created`},{id:`state`,title:`State machine`,kind:`stateDiagram`,code:`stateDiagram-v2
  [*] --> Pending
  Pending --> Running: deploy
  Running --> Degraded: error rate up
  Degraded --> Running: recovered
  Running --> [*]: rollback`},{id:`er`,title:`ER diagram`,kind:`erDiagram`,code:`erDiagram
  CUSTOMER ||--o{ ORDER : places
  ORDER ||--|{ LINE_ITEM : contains
  PRODUCT ||--o{ LINE_ITEM : "ordered in"`},{id:`gitgraph`,title:`Git graph`,kind:`gitGraph`,code:`gitGraph
  commit
  branch feature
  checkout feature
  commit
  checkout main
  merge feature`},{id:`class`,title:`Class diagram`,kind:`classDiagram`,code:`classDiagram
  class Service {
    +name: string
    +handle(req) Response
  }
  class Handler
  Service <|-- Handler`},{id:`mindmap`,title:`Mindmap`,kind:`mindmap`,code:`mindmap
  root((Observability))
    Metrics
      Cardinality
      SLOs
    Logs
    Traces`},{id:`c4`,title:`C4 context`,kind:`c4`,code:`C4Context
  title System Context
  Person(user, "User")
  System(app, "ShipSolid", "The app")
  System_Ext(grafana, "Grafana Cloud")
  Rel(user, app, "Uses")
  Rel(app, grafana, "Sends telemetry")`}],r=[[/^flowchart\b/,`flowchart`],[/^graph\b/,`flowchart`],[/^sequenceDiagram\b/,`sequenceDiagram`],[/^stateDiagram(-v2)?\b/,`stateDiagram`],[/^erDiagram\b/,`erDiagram`],[/^gitGraph\b/,`gitGraph`],[/^classDiagram\b/,`classDiagram`],[/^mindmap\b/,`mindmap`],[/^journey\b/,`journey`],[/^pie\b/,`pie`],[/^gantt\b/,`gantt`],[/^quadrantChart\b/,`quadrantChart`],[/^C4(Context|Container|Component|Dynamic|Deployment)\b/,`c4`]];function i(e){let t=e.split(`
`).map(e=>e.trim()).find(e=>e!==``&&!e.startsWith(`%%`));if(!t)return`unknown`;for(let[e,n]of r)if(e.test(t))return n;return`unknown`}function a(e,t){let n=0;for(let r of e)r===t&&n++;return n}function o(e){let t=[],n=e.trim();if(n===``)return[`Diagram is empty.`];let r=i(e);if(r===`unknown`){let e=n.split(/\s|\n/)[0];t.push(`Unrecognised diagram type "${e}" on the first line.`)}if(r!==`erDiagram`)for(let[n,r,i]of[[`[`,`]`,`square brackets`],[`{`,`}`,`braces`],[`(`,`)`,`parentheses`]]){let o=a(e,n),s=a(e,r);o!==s&&t.push(`Unbalanced ${i}: ${o} "${n}" vs ${s} "${r}".`)}return r===`sequenceDiagram`&&/--?>(?!>)/.test(e)&&t.push(`Sequence diagrams use "->>" and "-->>", not "->" / "-->".`),t}var s=`tools:mermaid-playground:code`,c=n[0].code,l=document.getElementById(`mp-input`),u=document.getElementById(`mp-preview`),d=document.getElementById(`mp-lint`),f=document.getElementById(`mp-type`),p=document.getElementById(`mp-render-error`),m=document.getElementById(`mp-templates`),h=document.getElementById(`mp-copy`),g=document.getElementById(`mp-svg`);l&&(l.value=t(s,c));function _(e){return e.replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`)}var v;function y(){let e=l?.value??``;if(!u||(u.innerHTML=``,p?.classList.add(`hidden`),e.trim()===``))return;let t=document.createElement(`pre`);t.setAttribute(`data-language`,`mermaid`);let n=document.createElement(`code`);n.textContent=e,t.appendChild(n),u.appendChild(t);try{let e=window.__renderMermaid?.(u);Promise.resolve(e).catch(b)}catch(e){b(e)}}function b(e){p&&(p.textContent=`Mermaid could not render this: ${(e instanceof Error?e.message:String(e)).split(`
`)[0]}`,p.classList.remove(`hidden`))}function x(){let t=l?.value??``;e(s,t),f&&(f.textContent=i(t));let n=o(t);d&&(d.innerHTML=n.length?n.map(e=>`<p class="text-xs font-mono text-amber-400">⚠ ${_(e)}</p>`).join(``):`<p class="text-xs font-mono text-emerald-400">No structural issues found.</p>`),window.clearTimeout(v),v=window.setTimeout(y,300)}l?.addEventListener(`input`,x),m&&(m.innerHTML=n.map(e=>`<button type="button" data-id="${e.id}" class="btn-outline text-xs">${_(e.title)}</button>`).join(``),m.addEventListener(`click`,e=>{let t=e.target.closest(`[data-id]`);if(!t||!l)return;let r=n.find(e=>e.id===t.dataset.id);r&&(l.value=r.code,x())})),h?.addEventListener(`click`,async()=>{await navigator.clipboard.writeText(l?.value??``);let e=h.textContent;h.textContent=`Copied!`,setTimeout(()=>h.textContent=e,1500)}),g?.addEventListener(`click`,()=>{let e=u?.querySelector(`svg`);if(!e){b(`Nothing rendered to export yet.`);return}let t=new XMLSerializer().serializeToString(e),n=new Blob([t],{type:`image/svg+xml`}),r=URL.createObjectURL(n),a=document.createElement(`a`);a.href=r,a.download=`${i(l?.value??``)||`diagram`}.svg`,document.body.appendChild(a),a.click(),a.remove(),setTimeout(()=>URL.revokeObjectURL(r),1e3)}),x();
//# sourceMappingURL=mermaid-playground.astro_astro_type_script_index_0_lang.bNHl50ma.js.map
// Pure Mermaid helpers — a template library, a diagram-type detector, and a very light
// structural linter. The real syntax validation is Mermaid's own parse error, surfaced by the
// renderer on the page. No DOM, no localStorage.

export interface MermaidTemplate {
  id: string;
  title: string;
  kind: string;
  code: string;
}

export const MERMAID_TEMPLATES: MermaidTemplate[] = [
  {
    id: 'flowchart',
    title: 'Flowchart',
    kind: 'flowchart',
    code: `flowchart TD
  Client[Client] --> API[API Gateway]
  API --> Svc[Service]
  Svc --> DB[(Database)]
  Svc --> Cache[(Redis)]`,
  },
  {
    id: 'sequence',
    title: 'Sequence',
    kind: 'sequenceDiagram',
    code: `sequenceDiagram
  participant U as User
  participant A as API
  participant D as DB
  U->>A: POST /order
  A->>D: INSERT order
  D-->>A: ok
  A-->>U: 201 Created`,
  },
  {
    id: 'state',
    title: 'State machine',
    kind: 'stateDiagram',
    code: `stateDiagram-v2
  [*] --> Pending
  Pending --> Running: deploy
  Running --> Degraded: error rate up
  Degraded --> Running: recovered
  Running --> [*]: rollback`,
  },
  {
    id: 'er',
    title: 'ER diagram',
    kind: 'erDiagram',
    code: `erDiagram
  CUSTOMER ||--o{ ORDER : places
  ORDER ||--|{ LINE_ITEM : contains
  PRODUCT ||--o{ LINE_ITEM : "ordered in"`,
  },
  {
    id: 'gitgraph',
    title: 'Git graph',
    kind: 'gitGraph',
    code: `gitGraph
  commit
  branch feature
  checkout feature
  commit
  checkout main
  merge feature`,
  },
  {
    id: 'class',
    title: 'Class diagram',
    kind: 'classDiagram',
    code: `classDiagram
  class Service {
    +name: string
    +handle(req) Response
  }
  class Handler
  Service <|-- Handler`,
  },
  {
    id: 'mindmap',
    title: 'Mindmap',
    kind: 'mindmap',
    code: `mindmap
  root((Observability))
    Metrics
      Cardinality
      SLOs
    Logs
    Traces`,
  },
  {
    id: 'c4',
    title: 'C4 context',
    kind: 'c4',
    code: `C4Context
  title System Context
  Person(user, "User")
  System(app, "ShipSolid", "The app")
  System_Ext(grafana, "Grafana Cloud")
  Rel(user, app, "Uses")
  Rel(app, grafana, "Sends telemetry")`,
  },
];

const FIRST_KEYWORD_MAP: [RegExp, string][] = [
  [/^flowchart\b/, 'flowchart'],
  [/^graph\b/, 'flowchart'],
  [/^sequenceDiagram\b/, 'sequenceDiagram'],
  [/^stateDiagram(-v2)?\b/, 'stateDiagram'],
  [/^erDiagram\b/, 'erDiagram'],
  [/^gitGraph\b/, 'gitGraph'],
  [/^classDiagram\b/, 'classDiagram'],
  [/^mindmap\b/, 'mindmap'],
  [/^journey\b/, 'journey'],
  [/^pie\b/, 'pie'],
  [/^gantt\b/, 'gantt'],
  [/^quadrantChart\b/, 'quadrantChart'],
  [/^C4(Context|Container|Component|Dynamic|Deployment)\b/, 'c4'],
];

export function detectDiagramType(code: string): string {
  const firstLine = code
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l !== '' && !l.startsWith('%%'));
  if (!firstLine) return 'unknown';
  for (const [re, kind] of FIRST_KEYWORD_MAP) {
    if (re.test(firstLine)) return kind;
  }
  return 'unknown';
}

function countChar(haystack: string, ch: string): number {
  let n = 0;
  for (const c of haystack) if (c === ch) n++;
  return n;
}

export function basicLint(code: string): string[] {
  const issues: string[] = [];
  const trimmed = code.trim();
  if (trimmed === '') {
    return ['Diagram is empty.'];
  }

  const type = detectDiagramType(code);
  if (type === 'unknown') {
    const firstWord = trimmed.split(/\s|\n/)[0];
    issues.push(`Unrecognised diagram type "${firstWord}" on the first line.`);
  }

  // ER diagrams use unpaired { } as crow's-foot cardinality markers, so skip the balance check there.
  if (type !== 'erDiagram') {
    for (const [open, close, label] of [
      ['[', ']', 'square brackets'],
      ['{', '}', 'braces'],
      ['(', ')', 'parentheses'],
    ] as const) {
      const o = countChar(code, open);
      const c = countChar(code, close);
      if (o !== c) issues.push(`Unbalanced ${label}: ${o} "${open}" vs ${c} "${close}".`);
    }
  }

  if (type === 'sequenceDiagram' && /--?>(?!>)/.test(code)) {
    issues.push('Sequence diagrams use "->>" and "-->>", not "->" / "-->".');
  }

  return issues;
}

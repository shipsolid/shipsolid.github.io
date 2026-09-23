import { describe, expect, it } from 'vitest';
import { basicLint, detectDiagramType, MERMAID_TEMPLATES } from './mermaid-playground';

describe('detectDiagramType', () => {
  it('identifies each keyword', () => {
    expect(detectDiagramType('flowchart TD\n A-->B')).toBe('flowchart');
    expect(detectDiagramType('graph LR\n A-->B')).toBe('flowchart');
    expect(detectDiagramType('sequenceDiagram\n A->>B: hi')).toBe('sequenceDiagram');
    expect(detectDiagramType('stateDiagram-v2\n [*] --> A')).toBe('stateDiagram');
    expect(detectDiagramType('erDiagram\n A ||--o{ B : has')).toBe('erDiagram');
    expect(detectDiagramType('C4Context\n title x')).toBe('c4');
  });

  it('skips %% directives and blank lines before the keyword', () => {
    expect(detectDiagramType('%%{init: {}}%%\n\nflowchart TD\n A-->B')).toBe('flowchart');
  });

  it('returns unknown for an unrecognised first line', () => {
    expect(detectDiagramType('doodle A to B')).toBe('unknown');
    expect(detectDiagramType('')).toBe('unknown');
  });
});

describe('basicLint', () => {
  it('reports an empty diagram', () => {
    expect(basicLint('   ')).toEqual(['Diagram is empty.']);
  });

  it('flags an unknown diagram type', () => {
    expect(basicLint('doodle A to B').some((i) => /Unrecognised diagram type/.test(i))).toBe(true);
  });

  it('flags unbalanced brackets', () => {
    const issues = basicLint('flowchart TD\n A[Client --> B[Server]');
    expect(issues.some((i) => /Unbalanced square brackets/.test(i))).toBe(true);
  });

  it('flags "-->" inside a sequence diagram', () => {
    const issues = basicLint('sequenceDiagram\n A --> B: hi');
    expect(issues.some((i) => /not "->" \/ "-->"/.test(i))).toBe(true);
  });

  it('passes every bundled template with no issues', () => {
    for (const t of MERMAID_TEMPLATES) {
      expect(basicLint(t.code), t.id).toEqual([]);
    }
  });
});

describe('MERMAID_TEMPLATES', () => {
  it('every template detects to its declared kind and has a unique id', () => {
    const ids = MERMAID_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of MERMAID_TEMPLATES) {
      expect(detectDiagramType(t.code), t.id).toBe(t.kind);
    }
  });
});

import * as yaml from 'js-yaml';
import type { DocError } from './types';

export interface ParsedDoc {
  docIndex: number;
  raw: unknown;
}

export interface ParseResult {
  docs: ParsedDoc[];
  errors: DocError[];
}

// A YAML document separator must start at column 0 per spec, so splitting on it can't be
// confused with a "---" line indented inside a block scalar (e.g. a ConfigMap embedding another
// config file verbatim in its `data:` block).
const DOCUMENT_SEPARATOR = /^---[ \t]*(?:#.*)?$/m;

export function parseMultiDocYaml(yamlText: string): ParseResult {
  // Deliberately split-then-parse-each-chunk rather than js-yaml's loadAll(): loadAll aborts the
  // *entire* stream on the first parse error anywhere in the text, so a syntax error in document
  // 2 of 3 would silently drop documents 1 and 3 too (verified empirically — an unterminated flow
  // collection swallows everything up to and including the next "---"). Splitting first gives
  // real per-document error isolation, which multi-document K8s pastes (Kustomize/Helm output)
  // need.
  const chunks = yamlText.split(DOCUMENT_SEPARATOR);
  const docs: ParsedDoc[] = [];
  const errors: DocError[] = [];

  chunks.forEach((chunk, docIndex) => {
    if (chunk.trim().length === 0) return; // empty document (leading/trailing/blank "---") — not an error

    try {
      const raw = yaml.load(chunk);
      docs.push({ docIndex, raw });
    } catch (err) {
      const message = err instanceof Error ? err.message.split('\n')[0] : 'Could not parse this document as YAML.';
      errors.push({ docIndex, message: `Document ${docIndex + 1} has invalid YAML: ${message}` });
    }
  });

  return { docs, errors };
}

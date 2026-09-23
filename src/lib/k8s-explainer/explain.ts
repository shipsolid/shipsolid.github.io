import type { DocError, ExplainedResource, ExplainManifestResult, K8sDoc } from './types';
import { parseMultiDocYaml } from './parser';
import { resolveExplainer } from './registry';
import { extractName, extractNamespace } from './envelope';

function isPlainObject(value: unknown): value is K8sDoc {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// Pure. Never throws. Explains every resource it can, collecting per-document problems instead
// of aborting on the first bad doc — a single typo in a multi-resource paste shouldn't blank out
// the documents that parsed fine.
export function explainManifest(yamlText: string): ExplainManifestResult {
  const { docs, errors: parseErrors } = parseMultiDocYaml(yamlText);
  const resources: ExplainedResource[] = [];
  const errors: DocError[] = [...parseErrors];

  for (const { docIndex, raw } of docs) {
    if (!isPlainObject(raw)) {
      const kind = Array.isArray(raw) ? 'a list' : typeof raw;
      errors.push({
        docIndex,
        message: `Document ${docIndex + 1} is not a Kubernetes resource (expected a YAML mapping, got ${kind}).`,
      });
      continue;
    }

    const kind = raw.kind;
    if (typeof kind !== 'string' || kind.trim() === '') {
      errors.push({
        docIndex,
        message: `Document ${docIndex + 1} is missing a "kind" field, so it can't be explained as a resource.`,
      });
      continue;
    }

    const { explain, isGenericFallback } = resolveExplainer(kind);
    resources.push({
      docIndex,
      kind,
      apiVersion: typeof raw.apiVersion === 'string' ? raw.apiVersion : '',
      name: extractName(raw),
      namespace: extractNamespace(raw),
      fields: explain(raw),
      isGenericFallback,
      raw,
    });
  }

  if (docs.length === 0 && errors.length === 0) {
    errors.push({ docIndex: 0, message: 'Paste a Kubernetes YAML manifest to see it explained.' });
  }

  errors.sort((a, b) => a.docIndex - b.docIndex);

  return { resources, errors };
}

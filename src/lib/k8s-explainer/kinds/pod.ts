import type { FieldExplanation, K8sDoc } from '../types';
import { asRecord } from '../format';
import { explainEnvelope } from '../envelope';
import { explainPodSpec } from '../pod-spec';

export function explainPod(doc: K8sDoc): FieldExplanation[] {
  const fields = explainEnvelope(doc);
  const spec = asRecord(doc.spec);
  if (spec) {
    fields.push(...explainPodSpec('spec', spec));
  }
  return fields;
}

import type { FieldExplanation, K8sDoc } from '../types';
import { explainEnvelope } from '../envelope';

// Fallback for any kind without a dedicated explainer (unrecognized built-in kinds and CRDs) —
// explains only the universal envelope, deliberately no resource-specific depth.
export function explainGeneric(doc: K8sDoc): FieldExplanation[] {
  return explainEnvelope(doc);
}

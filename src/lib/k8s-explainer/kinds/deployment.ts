import type { FieldExplanation, K8sDoc } from '../types';
import { asRecord, field } from '../format';
import { explainEnvelope } from '../envelope';
import { explainPodSpec } from '../pod-spec';

export function explainDeployment(doc: K8sDoc): FieldExplanation[] {
  const fields = explainEnvelope(doc);
  const spec = asRecord(doc.spec);
  if (!spec) return fields;

  if (spec.replicas !== undefined) {
    fields.push(
      field(
        'spec.replicas',
        spec.replicas,
        'Desired number of identical pod copies the Deployment controller keeps running.'
      )
    );
  }

  const matchLabels = asRecord(asRecord(spec.selector)?.matchLabels);
  if (matchLabels) {
    fields.push(
      field(
        'spec.selector.matchLabels',
        matchLabels,
        'Which pods this Deployment manages — must match the labels on spec.template.metadata.labels exactly, and is immutable after creation.'
      )
    );
  }

  const strategy = asRecord(spec.strategy);
  if (strategy) {
    const type = typeof strategy.type === 'string' ? strategy.type : 'RollingUpdate';
    fields.push(
      field(
        'spec.strategy.type',
        type,
        type === 'Recreate'
          ? 'All old pods are killed before any new ones start — causes downtime but guarantees no two versions run at once.'
          : 'Old pods are replaced gradually by new ones (controlled by maxSurge/maxUnavailable) to avoid downtime.'
      )
    );
  }

  const templateSpec = asRecord(asRecord(spec.template)?.spec);
  if (templateSpec) {
    fields.push(...explainPodSpec('spec.template.spec', templateSpec));
  }

  return fields;
}

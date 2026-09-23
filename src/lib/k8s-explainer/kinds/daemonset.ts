import type { FieldExplanation, K8sDoc } from '../types';
import { asRecord, field } from '../format';
import { explainEnvelope } from '../envelope';
import { explainPodSpec } from '../pod-spec';

export function explainDaemonSet(doc: K8sDoc): FieldExplanation[] {
  const fields = explainEnvelope(doc);
  const spec = asRecord(doc.spec);
  if (!spec) return fields;

  const matchLabels = asRecord(asRecord(spec.selector)?.matchLabels);
  if (matchLabels) {
    fields.push(
      field(
        'spec.selector.matchLabels',
        matchLabels,
        'Which pods this DaemonSet manages — must match spec.template.metadata.labels. There is no spec.replicas: a DaemonSet runs exactly one matching pod per eligible node (filtered by nodeSelector/affinity/tolerations), adding or removing pods automatically as nodes join or leave.'
      )
    );
  }

  const updateStrategy = asRecord(spec.updateStrategy);
  if (updateStrategy) {
    fields.push(
      field(
        'spec.updateStrategy.type',
        updateStrategy.type ?? 'RollingUpdate',
        'How existing per-node pods are replaced when the template changes — RollingUpdate (gradual) or OnDelete (only when you manually delete the old pod).'
      )
    );
  }

  const templateSpec = asRecord(asRecord(spec.template)?.spec);
  if (templateSpec) {
    fields.push(...explainPodSpec('spec.template.spec', templateSpec));
  }

  return fields;
}

import type { FieldExplanation, K8sDoc } from '../types';
import { asArray, asRecord, field } from '../format';
import { explainEnvelope } from '../envelope';
import { explainPodSpec } from '../pod-spec';

export function explainStatefulSet(doc: K8sDoc): FieldExplanation[] {
  const fields = explainEnvelope(doc);
  const spec = asRecord(doc.spec);
  if (!spec) return fields;

  if (spec.serviceName !== undefined) {
    fields.push(
      field(
        'spec.serviceName',
        spec.serviceName,
        "The headless Service that gives this StatefulSet's pods stable network identity (predictable DNS names like pod-0.service, pod-1.service)."
      )
    );
  }

  if (spec.replicas !== undefined) {
    fields.push(
      field(
        'spec.replicas',
        spec.replicas,
        'Desired number of pods. Unlike a Deployment, StatefulSet pods are created, scaled, and deleted in strict ordinal order (pod-0 before pod-1, and so on).'
      )
    );
  }

  const matchLabels = asRecord(asRecord(spec.selector)?.matchLabels);
  if (matchLabels) {
    fields.push(
      field(
        'spec.selector.matchLabels',
        matchLabels,
        'Which pods this StatefulSet manages — must match spec.template.metadata.labels and is immutable after creation.'
      )
    );
  }

  const volumeClaimTemplates = asArray(spec.volumeClaimTemplates);
  if (volumeClaimTemplates && volumeClaimTemplates.length > 0) {
    fields.push(
      field(
        'spec.volumeClaimTemplates',
        volumeClaimTemplates,
        "Per-replica PersistentVolumeClaim template — each pod gets its own dedicated, stably-named volume that survives pod rescheduling (unlike a Deployment's shared/ephemeral storage)."
      )
    );
  }

  if (spec.podManagementPolicy !== undefined) {
    fields.push(
      field(
        'spec.podManagementPolicy',
        spec.podManagementPolicy,
        'Whether pods are rolled out strictly one at a time in order (OrderedReady, the default) or all at once (Parallel).'
      )
    );
  }

  const templateSpec = asRecord(asRecord(spec.template)?.spec);
  if (templateSpec) {
    fields.push(...explainPodSpec('spec.template.spec', templateSpec));
  }

  return fields;
}

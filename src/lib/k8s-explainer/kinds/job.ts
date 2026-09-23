import type { FieldExplanation, K8sDoc } from '../types';
import { asRecord, field } from '../format';
import { explainEnvelope } from '../envelope';
import { explainPodSpec } from '../pod-spec';

export function explainJob(doc: K8sDoc): FieldExplanation[] {
  const fields = explainEnvelope(doc);
  const spec = asRecord(doc.spec);
  if (!spec) return fields;

  if (spec.completions !== undefined) {
    fields.push(
      field(
        'spec.completions',
        spec.completions,
        'How many successful pod completions are needed before this Job is considered done.'
      )
    );
  }

  if (spec.parallelism !== undefined) {
    fields.push(
      field(
        'spec.parallelism',
        spec.parallelism,
        'How many pods this Job runs concurrently while working toward spec.completions.'
      )
    );
  }

  if (spec.backoffLimit !== undefined) {
    fields.push(
      field(
        'spec.backoffLimit',
        spec.backoffLimit,
        'How many times a failed pod is retried before the Job itself is marked Failed.'
      )
    );
  }

  if (spec.activeDeadlineSeconds !== undefined) {
    fields.push(
      field(
        'spec.activeDeadlineSeconds',
        spec.activeDeadlineSeconds,
        "Wall-clock timeout for the whole Job — if it's still running after this many seconds, it's terminated and marked Failed."
      )
    );
  }

  if (spec.ttlSecondsAfterFinished !== undefined) {
    fields.push(
      field(
        'spec.ttlSecondsAfterFinished',
        spec.ttlSecondsAfterFinished,
        'How long to keep the finished Job (and its pods) around before the controller automatically garbage-collects it.'
      )
    );
  }

  const templateSpec = asRecord(asRecord(spec.template)?.spec);
  if (templateSpec) {
    fields.push(...explainPodSpec('spec.template.spec', templateSpec));
  }

  return fields;
}

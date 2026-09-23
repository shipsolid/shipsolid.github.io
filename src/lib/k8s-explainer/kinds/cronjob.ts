import type { FieldExplanation, K8sDoc } from '../types';
import { asRecord, field } from '../format';
import { explainEnvelope } from '../envelope';
import { explainPodSpec } from '../pod-spec';

export function explainCronJob(doc: K8sDoc): FieldExplanation[] {
  const fields = explainEnvelope(doc);
  const spec = asRecord(doc.spec);
  if (!spec) return fields;

  if (spec.schedule !== undefined) {
    fields.push(
      field(
        'spec.schedule',
        spec.schedule,
        'Standard cron expression controlling when a new Job is created from spec.jobTemplate.'
      )
    );
  }

  if (spec.concurrencyPolicy !== undefined) {
    fields.push(
      field(
        'spec.concurrencyPolicy',
        spec.concurrencyPolicy,
        "What happens if the previous run is still going when the next scheduled time arrives — Allow (run alongside), Forbid (skip the new run), or Replace (kill the old one first)."
      )
    );
  }

  if (spec.startingDeadlineSeconds !== undefined) {
    fields.push(
      field(
        'spec.startingDeadlineSeconds',
        spec.startingDeadlineSeconds,
        "How late a run is allowed to start (e.g. after controller downtime) before it's skipped instead of started."
      )
    );
  }

  if (spec.successfulJobsHistoryLimit !== undefined) {
    fields.push(
      field(
        'spec.successfulJobsHistoryLimit',
        spec.successfulJobsHistoryLimit,
        'How many completed Job objects are kept around for inspection/logs before old ones are garbage-collected.'
      )
    );
  }

  if (spec.failedJobsHistoryLimit !== undefined) {
    fields.push(
      field(
        'spec.failedJobsHistoryLimit',
        spec.failedJobsHistoryLimit,
        'How many failed Job objects are kept around for debugging before old ones are garbage-collected.'
      )
    );
  }

  const jobTemplateSpec = asRecord(asRecord(spec.jobTemplate)?.spec);
  if (jobTemplateSpec) {
    if (jobTemplateSpec.backoffLimit !== undefined) {
      fields.push(
        field(
          'spec.jobTemplate.spec.backoffLimit',
          jobTemplateSpec.backoffLimit,
          'How many times a failed pod in a single run is retried before that run is marked Failed.'
        )
      );
    }

    const templateSpec = asRecord(asRecord(jobTemplateSpec.template)?.spec);
    if (templateSpec) {
      fields.push(...explainPodSpec('spec.jobTemplate.spec.template.spec', templateSpec));
    }
  }

  return fields;
}

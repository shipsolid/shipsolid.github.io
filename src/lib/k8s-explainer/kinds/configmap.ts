import type { FieldExplanation, K8sDoc } from '../types';
import { asRecord, field } from '../format';
import { explainEnvelope } from '../envelope';

export function explainConfigMap(doc: K8sDoc): FieldExplanation[] {
  const fields = explainEnvelope(doc);

  const data = asRecord(doc.data);
  if (data) {
    const keys = Object.keys(data);
    if (keys.length > 0) {
      fields.push(
        field(
          'data',
          keys,
          `Plain-text key/value config data (${keys.length} key${keys.length === 1 ? '' : 's'}) — consumable by pods as environment variables, individual files via volumeMounts, or a whole mounted directory.`
        )
      );
    }
  }

  const binaryData = asRecord(doc.binaryData);
  if (binaryData) {
    const keys = Object.keys(binaryData);
    if (keys.length > 0) {
      fields.push(
        field(
          'binaryData',
          keys,
          "Base64-encoded binary config data — same consumption model as \"data\", for content that isn't valid UTF-8 text."
        )
      );
    }
  }

  if (doc.immutable !== undefined) {
    fields.push(
      field(
        'immutable',
        doc.immutable,
        "When true, this ConfigMap's data can never be updated after creation — the kubelet can skip watching it for changes, reducing load on the API server."
      )
    );
  }

  return fields;
}

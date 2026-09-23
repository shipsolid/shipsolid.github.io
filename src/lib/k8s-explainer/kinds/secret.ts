import type { FieldExplanation, K8sDoc } from '../types';
import { asRecord, field } from '../format';
import { explainEnvelope } from '../envelope';

const TYPE_EXPLANATIONS: Record<string, string> = {
  Opaque: 'unstructured, user-defined key/value data (the default Secret type).',
  'kubernetes.io/dockerconfigjson': 'container registry credentials, used as an imagePullSecret.',
  'kubernetes.io/tls': 'a TLS certificate and private key (keys "tls.crt" and "tls.key").',
  'kubernetes.io/service-account-token': 'a long-lived token bound to a ServiceAccount.',
  'kubernetes.io/basic-auth': 'a username/password pair for basic authentication.',
  'kubernetes.io/ssh-auth': 'an SSH private key.',
};

export function explainSecret(doc: K8sDoc): FieldExplanation[] {
  const fields = explainEnvelope(doc);

  const type = typeof doc.type === 'string' ? doc.type : 'Opaque';
  fields.push(field('type', type, TYPE_EXPLANATIONS[type] ?? 'a custom or unrecognized Secret type.'));

  const data = asRecord(doc.data);
  if (data) {
    const keys = Object.keys(data);
    if (keys.length > 0) {
      fields.push(
        field(
          'data',
          keys,
          `Base64-encoded secret values (${keys.length} key${keys.length === 1 ? '' : 's'}). Base64 is encoding, not encryption — anyone who can read this Secret via the API can trivially decode it. Values are intentionally not decoded or shown here.`
        )
      );
    }
  }

  const stringData = asRecord(doc.stringData);
  if (stringData) {
    const keys = Object.keys(stringData);
    if (keys.length > 0) {
      fields.push(
        field(
          'stringData',
          keys,
          `Write-only plaintext values (${keys.length} key${keys.length === 1 ? '' : 's'}) — the API server base64-encodes these into "data" on write; they're never stored or read back as plaintext. Values are intentionally not shown here.`
        )
      );
    }
  }

  if (doc.immutable !== undefined) {
    fields.push(
      field(
        'immutable',
        doc.immutable,
        "When true, this Secret's data can never be updated after creation, reducing kubelet watch load."
      )
    );
  }

  return fields;
}

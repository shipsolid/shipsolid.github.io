import type { FieldExplanation, K8sDoc } from '../types';
import { asArray, asRecord, field } from '../format';
import { explainEnvelope } from '../envelope';

export function explainIngress(doc: K8sDoc): FieldExplanation[] {
  const fields = explainEnvelope(doc);
  const spec = asRecord(doc.spec);
  if (!spec) return fields;

  if (spec.ingressClassName !== undefined) {
    fields.push(
      field(
        'spec.ingressClassName',
        spec.ingressClassName,
        "Which ingress controller (e.g. nginx, AGIC on AKS) implements this Ingress's routing rules."
      )
    );
  }

  const rules = asArray(spec.rules);
  if (rules && rules.length > 0) {
    fields.push(
      field(
        'spec.rules',
        rules,
        'Host + path routing rules — each maps an incoming HTTP host/path to a backend Service and port.'
      )
    );
  }

  const tls = asArray(spec.tls);
  if (tls && tls.length > 0) {
    fields.push(
      field(
        'spec.tls',
        tls,
        'TLS termination config — which hosts are served over HTTPS and which Secret (kubernetes.io/tls type) holds the certificate/key.'
      )
    );
  }

  const defaultBackend = asRecord(spec.defaultBackend);
  if (defaultBackend) {
    fields.push(
      field(
        'spec.defaultBackend',
        defaultBackend,
        "Fallback backend for requests that don't match any rule above."
      )
    );
  }

  return fields;
}

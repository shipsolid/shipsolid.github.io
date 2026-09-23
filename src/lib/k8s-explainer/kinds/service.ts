import type { FieldExplanation, K8sDoc } from '../types';
import { asArray, asRecord, field } from '../format';
import { explainEnvelope } from '../envelope';

const TYPE_EXPLANATIONS: Record<string, string> = {
  ClusterIP: 'only reachable from inside the cluster, at a stable virtual IP.',
  NodePort:
    "reachable on every node's IP at a static port (30000-32767), in addition to the internal ClusterIP.",
  LoadBalancer:
    'provisions an external cloud load balancer (e.g. an Azure Load Balancer on AKS) that routes to this Service.',
  ExternalName:
    "a DNS-only alias — no proxying; requests to this Service's name are just resolved to spec.externalName via CNAME.",
};

export function explainService(doc: K8sDoc): FieldExplanation[] {
  const fields = explainEnvelope(doc);
  const spec = asRecord(doc.spec);
  if (!spec) return fields;

  const type = typeof spec.type === 'string' ? spec.type : 'ClusterIP';
  fields.push(
    field(
      'spec.type',
      type,
      `How this Service is exposed: ${TYPE_EXPLANATIONS[type] ?? 'a custom or unrecognized Service type.'}`
    )
  );

  const selector = asRecord(spec.selector);
  if (selector && Object.keys(selector).length > 0) {
    fields.push(
      field(
        'spec.selector',
        selector,
        "Pods matching these labels become this Service's endpoints — traffic sent to the Service is load-balanced across them."
      )
    );
  } else if (type !== 'ExternalName') {
    fields.push(
      field(
        'spec.selector',
        '(not set)',
        'No selector means this Service has no automatic endpoints — they must be managed manually via a matching Endpoints/EndpointSlice object.'
      )
    );
  }

  const ports = asArray(spec.ports);
  if (ports && ports.length > 0) {
    fields.push(
      field(
        'spec.ports',
        ports,
        'Port mappings this Service exposes — each maps an incoming "port" to the pod\'s "targetPort".'
      )
    );
  }

  if (spec.clusterIP !== undefined) {
    fields.push(
      field(
        'spec.clusterIP',
        spec.clusterIP,
        spec.clusterIP === 'None'
          ? 'Marks this as a headless Service — no virtual IP is allocated; DNS resolves directly to the individual pod IPs (used by StatefulSets for stable per-pod addressing).'
          : "The stable virtual IP the cluster DNS resolves this Service's name to."
      )
    );
  }

  return fields;
}

import type { FieldExplanation, K8sDoc } from './types';
import { asRecord, field } from './format';

// Shared by every kind-specific explainer, and the entirety of kinds/generic.ts's fallback path.
export function explainEnvelope(doc: K8sDoc): FieldExplanation[] {
  const fields: FieldExplanation[] = [];

  if (doc.apiVersion !== undefined) {
    fields.push(
      field(
        'apiVersion',
        doc.apiVersion,
        'The Kubernetes API group and version this resource belongs to — determines which schema and API server endpoint handles it.'
      )
    );
  }

  if (doc.kind !== undefined) {
    fields.push(field('kind', doc.kind, 'The type of Kubernetes resource being defined.'));
  }

  const metadata = asRecord(doc.metadata);
  if (metadata) {
    if (metadata.name !== undefined) {
      fields.push(
        field(
          'metadata.name',
          metadata.name,
          'The unique name of this resource within its namespace (or cluster-wide, for cluster-scoped resources).'
        )
      );
    }

    if (metadata.namespace !== undefined) {
      fields.push(
        field(
          'metadata.namespace',
          metadata.namespace,
          'The namespace this resource lives in. Namespaced resources are only unique within a namespace.'
        )
      );
    }

    const labels = asRecord(metadata.labels);
    if (labels && Object.keys(labels).length > 0) {
      fields.push(
        field(
          'metadata.labels',
          labels,
          'Key/value tags used by selectors (Services, Deployments, NetworkPolicies) and tooling to group and find this resource.'
        )
      );
    }

    const annotations = asRecord(metadata.annotations);
    if (annotations && Object.keys(annotations).length > 0) {
      fields.push(
        field(
          'metadata.annotations',
          annotations,
          "Arbitrary non-identifying metadata — often used by controllers, ingress classes, or tooling (e.g. cert-manager, external-dns) to attach extra config that isn't meant to be selected on."
        )
      );
    }
  }

  return fields;
}

export function extractName(doc: K8sDoc): string | null {
  const name = asRecord(doc.metadata)?.name;
  return typeof name === 'string' ? name : null;
}

export function extractNamespace(doc: K8sDoc): string | null {
  const namespace = asRecord(doc.metadata)?.namespace;
  return typeof namespace === 'string' ? namespace : null;
}

export type K8sDoc = Record<string, unknown>;

export interface FieldExplanation {
  path: string;
  value: string;
  explanation: string;
}

export interface ExplainedResource {
  docIndex: number;
  kind: string;
  apiVersion: string;
  name: string | null;
  namespace: string | null;
  fields: FieldExplanation[];
  isGenericFallback: boolean;
  raw: K8sDoc;
}

export interface DocError {
  docIndex: number;
  message: string;
}

export interface ExplainManifestResult {
  resources: ExplainedResource[];
  errors: DocError[];
}

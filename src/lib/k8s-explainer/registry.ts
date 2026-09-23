import type { FieldExplanation, K8sDoc } from './types';
import { explainPod } from './kinds/pod';
import { explainDeployment } from './kinds/deployment';
import { explainStatefulSet } from './kinds/statefulset';
import { explainDaemonSet } from './kinds/daemonset';
import { explainJob } from './kinds/job';
import { explainCronJob } from './kinds/cronjob';
import { explainService } from './kinds/service';
import { explainConfigMap } from './kinds/configmap';
import { explainSecret } from './kinds/secret';
import { explainIngress } from './kinds/ingress';
import { explainGeneric } from './kinds/generic';

export type Explainer = (doc: K8sDoc) => FieldExplanation[];

// Registry-style dispatch: adding a new kind means adding one kinds/*.ts file + one entry here —
// never touching the UI or the orchestrator.
const KIND_EXPLAINERS: Record<string, Explainer | undefined> = {
  Pod: explainPod,
  Deployment: explainDeployment,
  StatefulSet: explainStatefulSet,
  DaemonSet: explainDaemonSet,
  Job: explainJob,
  CronJob: explainCronJob,
  Service: explainService,
  ConfigMap: explainConfigMap,
  Secret: explainSecret,
  Ingress: explainIngress,
};

export function resolveExplainer(kind: string): { explain: Explainer; isGenericFallback: boolean } {
  const explain = KIND_EXPLAINERS[kind];
  if (explain) {
    return { explain, isGenericFallback: false };
  }
  return { explain: explainGeneric, isGenericFallback: true };
}

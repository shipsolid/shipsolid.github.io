import type { FieldExplanation } from './types';
import { asArray, asRecord, field } from './format';

// Shared by Pod/Deployment/StatefulSet/DaemonSet/Job/CronJob — they all wrap the same PodSpec
// shape at different nesting depths, so container/probe/volume explanations live here once
// instead of being duplicated across six kind modules.

function describeProbeMechanism(probe: Record<string, any>): string {
  const httpGet = asRecord(probe.httpGet);
  if (httpGet) {
    return `sends an HTTP GET to port ${httpGet.port ?? '?'}, path "${httpGet.path ?? '/'}"`;
  }
  const tcpSocket = asRecord(probe.tcpSocket);
  if (tcpSocket) {
    return `opens a TCP connection to port ${tcpSocket.port ?? '?'}`;
  }
  const exec = asRecord(probe.exec);
  if (exec) {
    const command = asArray(exec.command);
    return `runs the command \`${command ? command.join(' ') : '?'}\` inside the container`;
  }
  return 'uses an unrecognized probe mechanism';
}

const PROBES: Array<{ key: 'livenessProbe' | 'readinessProbe' | 'startupProbe'; label: string; purpose: string }> = [
  {
    key: 'livenessProbe',
    label: 'Liveness',
    purpose: 'If this fails repeatedly, the kubelet kills and restarts the container.',
  },
  {
    key: 'readinessProbe',
    label: 'Readiness',
    purpose:
      'While this fails, the pod is pulled out of Service endpoints — it stops receiving traffic but keeps running.',
  },
  {
    key: 'startupProbe',
    label: 'Startup',
    purpose:
      "Gates the liveness/readiness probes until this succeeds — protects slow-starting containers from being killed before they're up.",
  },
];

function explainContainer(
  fields: FieldExplanation[],
  basePath: string,
  prefix: string,
  index: number,
  container: Record<string, any>
): void {
  const label = typeof container.name === 'string' ? container.name : `#${index}`;
  const path = (suffix: string) => `${basePath}.${prefix}[${index}].${suffix}`;

  if (container.image !== undefined) {
    fields.push(
      field(
        path('image'),
        container.image,
        `Image for container "${label}" — the exact image reference (and tag/digest) the kubelet pulls and runs. Avoid ":latest" in production; pin a tag or digest so rollouts are reproducible.`
      )
    );
  }

  const ports = asArray(container.ports);
  if (ports && ports.length > 0) {
    fields.push(
      field(
        path('ports'),
        ports,
        `Ports container "${label}" listens on. This is informational for the kubelet and tooling — it doesn't expose the port outside the pod by itself; a Service does that.`
      )
    );
  }

  const env = asArray(container.env);
  if (env && env.length > 0) {
    fields.push(
      field(
        path('env'),
        env,
        `Environment variables injected into container "${label}" — either literal values or references to a ConfigMap/Secret key.`
      )
    );
  }

  const envFrom = asArray(container.envFrom);
  if (envFrom && envFrom.length > 0) {
    fields.push(
      field(
        path('envFrom'),
        envFrom,
        `Bulk-imports every key in the referenced ConfigMap(s)/Secret(s) as environment variables in container "${label}".`
      )
    );
  }

  const resources = asRecord(container.resources);
  if (resources) {
    const requests = asRecord(resources.requests);
    const limits = asRecord(resources.limits);

    if (requests) {
      fields.push(
        field(
          path('resources.requests'),
          requests,
          `What the scheduler reserves for container "${label}" when placing the pod on a node — guarantees at least this much CPU/memory is available.`
        )
      );
    }
    if (limits) {
      fields.push(
        field(
          path('resources.limits'),
          limits,
          `Hard ceiling for container "${label}" — the kubelet throttles CPU usage above this and OOM-kills the container if it exceeds the memory limit.`
        )
      );
    }
    if (!requests && !limits) {
      fields.push(
        field(
          path('resources'),
          resources,
          `Resource block for container "${label}" is present but sets neither requests nor limits.`
        )
      );
    }
  }

  for (const probeDef of PROBES) {
    const probe = asRecord(container[probeDef.key]);
    if (probe) {
      const mechanism = describeProbeMechanism(probe);
      fields.push(
        field(
          path(probeDef.key),
          probe,
          `${probeDef.label} probe for container "${label}": ${mechanism}. ${probeDef.purpose}`
        )
      );
    }
  }

  const volumeMounts = asArray(container.volumeMounts);
  if (volumeMounts && volumeMounts.length > 0) {
    fields.push(
      field(
        path('volumeMounts'),
        volumeMounts,
        `Volumes mounted into container "${label}"'s filesystem, referencing a volume defined at the pod level.`
      )
    );
  }
}

export function explainPodSpec(basePath: string, podSpec: Record<string, any>): FieldExplanation[] {
  const fields: FieldExplanation[] = [];

  const initContainers = asArray(podSpec.initContainers);
  if (initContainers && initContainers.length > 0) {
    initContainers.forEach((container, index) => {
      const record = asRecord(container);
      if (record) explainContainer(fields, basePath, 'initContainers', index, record);
    });
  }

  const containers = asArray(podSpec.containers);
  if (containers) {
    containers.forEach((container, index) => {
      const record = asRecord(container);
      if (record) explainContainer(fields, basePath, 'containers', index, record);
    });
  }

  const volumes = asArray(podSpec.volumes);
  if (volumes && volumes.length > 0) {
    fields.push(
      field(
        `${basePath}.volumes`,
        volumes,
        'Storage or config sources available to be mounted by containers in this pod — e.g. a ConfigMap, Secret, emptyDir, or PersistentVolumeClaim.'
      )
    );
  }

  if (podSpec.restartPolicy !== undefined) {
    fields.push(
      field(
        `${basePath}.restartPolicy`,
        podSpec.restartPolicy,
        'What the kubelet does when a container in this pod exits — Always, OnFailure, or Never.'
      )
    );
  }

  if (podSpec.serviceAccountName !== undefined) {
    fields.push(
      field(
        `${basePath}.serviceAccountName`,
        podSpec.serviceAccountName,
        'The Kubernetes ServiceAccount this pod runs as — determines what it can do against the API server via its mounted token, subject to any RBAC bound to that account.'
      )
    );
  }

  const nodeSelector = asRecord(podSpec.nodeSelector);
  if (nodeSelector && Object.keys(nodeSelector).length > 0) {
    fields.push(
      field(
        `${basePath}.nodeSelector`,
        nodeSelector,
        'Simple node-label constraint — the pod is only scheduled onto nodes matching every key/value pair here.'
      )
    );
  }

  if (podSpec.affinity !== undefined) {
    fields.push(
      field(
        `${basePath}.affinity`,
        podSpec.affinity,
        'Richer scheduling rules than nodeSelector — attract or repel this pod relative to specific nodes or other pods (e.g. spread replicas across nodes/zones).'
      )
    );
  }

  const tolerations = asArray(podSpec.tolerations);
  if (tolerations && tolerations.length > 0) {
    fields.push(
      field(
        `${basePath}.tolerations`,
        tolerations,
        'Taints this pod is willing to tolerate, allowing it to be scheduled onto nodes that would otherwise repel it.'
      )
    );
  }

  return fields;
}

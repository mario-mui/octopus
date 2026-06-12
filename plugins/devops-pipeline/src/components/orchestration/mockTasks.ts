/*
 * Fake task catalog + a demo pipeline for trying out the orchestration editor
 * without a live Tekton backend. The catalog feeds the task picker (as a
 * fallback when the cluster returns no Tasks) and gives each node a friendly
 * label + icon colour; `DEMO_ORCHESTRATION` reproduces the design reference
 * (design/pipeline-orc.png).
 */
import {
  PipelineOrchestration,
  Task,
  TektonResourceRefKind,
} from '../../types';

export interface TaskCatalogMeta {
  /** Task resource name referenced by `taskRef.name`. */
  name: string;
  /** Friendly label shown under the task title. */
  label: string;
  /** Accent colour for the node icon. */
  color: string;
  description: string;
}

export const TASK_CATALOG: TaskCatalogMeta[] = [
  {
    name: 'git-version',
    label: 'Git Version',
    color: '#fa541c',
    description: 'Compute a semantic version from git history.',
  },
  {
    name: 'trivy-scanner',
    label: 'Trivy Scanner',
    color: '#1677ff',
    description: 'Scan the workspace / image for vulnerabilities.',
  },
  {
    name: 'nodejs',
    label: 'Node.js',
    color: '#52c41a',
    description: 'Install dependencies and run a Node.js build.',
  },
  {
    name: 'golang',
    label: 'Go Build',
    color: '#13c2c2',
    description: 'Compile and test a Go module.',
  },
  {
    name: 'kaniko',
    label: 'Kaniko Build',
    color: '#722ed1',
    description: 'Build and push a container image with Kaniko.',
  },
  {
    name: 'unit-test',
    label: 'Unit Test',
    color: '#eb2f96',
    description: 'Run the unit-test suite and publish results.',
  },
];

const catalogByName = new Map(TASK_CATALOG.map(m => [m.name, m]));

/** Look up display metadata for a referenced task (falls back to the raw name). */
export function getTaskMeta(refName?: string): TaskCatalogMeta {
  if (refName && catalogByName.has(refName)) {
    return catalogByName.get(refName)!;
  }
  return {
    name: refName || 'task',
    label: refName || 'Task',
    color: '#8c8c8c',
    description: '',
  };
}

/** The catalog rendered as Tekton Task resources for the picker fallback. */
export const MOCK_TASKS: Task[] = TASK_CATALOG.map(meta => ({
  apiVersion: 'tekton.dev/v1',
  kind: 'Task',
  metadata: { name: meta.name },
  spec: { description: meta.description, steps: [] },
}));

const ref = (name: string) => ({ kind: TektonResourceRefKind.Task, name });

/** Demo graph matching design/pipeline-orc.png. */
export const DEMO_ORCHESTRATION: PipelineOrchestration = {
  tasks: [
    { name: 'git-version', taskRef: ref('git-version'), runAfter: [] },
    {
      name: 'git-version-8b2bf',
      taskRef: ref('git-version'),
      runAfter: ['git-version'],
    },
    {
      name: 'trivy-scanner',
      taskRef: ref('trivy-scanner'),
      runAfter: ['git-version'],
    },
  ],
  finally: [{ name: 'nodejs', taskRef: ref('nodejs') }],
};

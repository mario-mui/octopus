/*
 * Tekton resource definitions + small builders for the pipeline pages. The K8s
 * client itself is injected via `useApi(K8sApi)` from @octopus/console-core-common.
 */
import type { K8sResourceDefinition } from '@octopus/console-core-common';

import { Pipeline } from '../types';

export const PIPELINE_DEFINITION: K8sResourceDefinition = {
  type: 'pipelines',
  apiGroup: 'tekton.dev',
  apiVersion: 'v1',
};

export const TASK_DEFINITION: K8sResourceDefinition = {
  type: 'tasks',
  apiGroup: 'tekton.dev',
  apiVersion: 'v1',
};

export const PIPELINE_RUN_DEFINITION: K8sResourceDefinition = {
  type: 'pipelineruns',
  apiGroup: 'tekton.dev',
  apiVersion: 'v1',
};

export const TASK_RUN_DEFINITION: K8sResourceDefinition = {
  type: 'taskruns',
  apiGroup: 'tekton.dev',
  apiVersion: 'v1',
};

/** Label Tekton sets on a TaskRun pointing back to its owning PipelineRun. */
export const TEKTON_PIPELINE_RUN_LABEL = 'tekton.dev/pipelineRun';

export const PIPELINE_API_VERSION = 'tekton.dev/v1';

export function emptyPipeline(namespace: string, name = ''): Pipeline {
  return {
    apiVersion: PIPELINE_API_VERSION,
    kind: 'Pipeline',
    metadata: { name, namespace },
    spec: { tasks: [] },
  };
}

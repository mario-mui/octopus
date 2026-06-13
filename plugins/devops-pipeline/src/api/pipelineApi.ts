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

export const PIPELINE_API_VERSION = 'tekton.dev/v1';

export function emptyPipeline(namespace: string, name = ''): Pipeline {
  return {
    apiVersion: PIPELINE_API_VERSION,
    kind: 'Pipeline',
    metadata: { name, namespace },
    spec: { tasks: [] },
  };
}

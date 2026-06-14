/*
 * The Tasks tab (design/pipelineRun-detail.png): a task tree on the left and,
 * on the right, either the selected Task's details or the selected step's logs.
 *
 * TaskRuns are listed by the `tekton.dev/pipelineRun` label and re-polled while
 * the run is still in flight, so the tree and step states stay live.
 */
import { useEffect, useMemo, useState } from 'react';
import { message } from 'antd';
import { useApi } from '@octopus/core-plugin-api';
import { K8sApi } from '@octopus/console-core-common';

import { TaskTree, TreeSelection } from './task-tree/TaskTree';
import { buildTaskTree } from './task-tree/buildTaskTree';
import { TaskRunPanel } from './TaskRunPanel';
import { LogConsole } from './log-console/LogConsole';
import {
  TASK_RUN_DEFINITION,
  TEKTON_PIPELINE_RUN_LABEL,
} from '../api/pipelineApi';
import type { PipelineRun, TaskRun } from '../types';

export interface PipelineRunTasksTabProps {
  run: PipelineRun;
  cluster: string;
  namespace: string;
}

/** Re-list TaskRuns on this cadence while the run is unfinished. */
const POLL_INTERVAL = 5000;

export function PipelineRunTasksTab({
  run,
  cluster,
  namespace,
}: PipelineRunTasksTabProps) {
  const k8sApi = useApi(K8sApi);
  const [taskRuns, setTaskRuns] = useState<TaskRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string>();

  const runName = run.metadata?.name;
  const runFinished = !!run.status?.completionTime;

  useEffect(() => {
    if (!cluster || !namespace || !runName) {
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    const load = () => {
      k8sApi
        .listResource<TaskRun>({
          cluster,
          namespace,
          definition: TASK_RUN_DEFINITION,
          queryParams: {
            labelSelector: `${TEKTON_PIPELINE_RUN_LABEL}=${runName}`,
          },
        })
        .then(list => {
          if (!cancelled) {
            setTaskRuns(list.items ?? []);
          }
        })
        .catch(e => {
          if (!cancelled) {
            message.error(`Failed to load task runs: ${(e as Error).message}`);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });
    };

    load();
    if (!runFinished) {
      timer = setInterval(load, POLL_INTERVAL);
    }
    return () => {
      cancelled = true;
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [cluster, namespace, runName, runFinished, k8sApi]);

  const nodes = useMemo(() => buildTaskTree(run, taskRuns), [run, taskRuns]);

  // Default the selection to the first step (or first task) once the tree loads.
  useEffect(() => {
    if (selectedId || nodes.length === 0) {
      return;
    }
    const firstWithSteps = nodes.find(n => n.steps.length);
    setSelectedId(firstWithSteps ? firstWithSteps.steps[0].id : nodes[0].id);
  }, [nodes, selectedId]);

  // Re-derive the selected node from the (possibly re-polled) tree by id, so a
  // running step's logs/state keep updating instead of pointing at a stale node.
  const selection: TreeSelection | null = useMemo(() => {
    if (!selectedId) {
      return null;
    }
    for (const task of nodes) {
      if (task.id === selectedId) {
        return { kind: 'task', node: task };
      }
      const step = task.steps.find(s => s.id === selectedId);
      if (step) {
        return { kind: 'step', node: step };
      }
    }
    return null;
  }, [nodes, selectedId]);

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
      <TaskTree
        nodes={nodes}
        selectedId={selectedId}
        onSelect={sel => setSelectedId(sel.node.id)}
        loading={loading}
      />
      <div style={{ flex: '1 1 auto', minWidth: 0 }}>
        {selection?.kind === 'task' && (
          <TaskRunPanel
            taskName={selection.node.name}
            taskRun={selection.node.taskRun}
          />
        )}
        {selection?.kind === 'step' && (
          <LogConsole
            cluster={cluster}
            namespace={namespace}
            podName={selection.node.taskRun.status?.podName}
            container={selection.node.step.container}
            stepName={selection.node.name}
            finished={runFinished || !!selection.node.step.terminated}
          />
        )}
      </div>
    </div>
  );
}

/*
 * Build the task tree shown on the left of the Tasks tab. Mirrors the console's
 * `task-tree-nav`: each PipelineRun task (and `finally` task) becomes a node
 * resolved to its TaskRun via `status.childReferences`; the TaskRun's steps
 * become that node's children.
 */
import type { PipelineRun, StepState, TaskRun } from '../../types';

export interface StepNode {
  /** Stable id, `${taskName}~${stepName}`. */
  id: string;
  taskId: string;
  name: string;
  step: StepState;
  /** The TaskRun owning this step (its pod backs the logs). */
  taskRun: TaskRun;
}

export interface TaskNode {
  /** The pipeline task name. */
  id: string;
  name: string;
  /** The resolved TaskRun, if one exists yet. */
  taskRun?: TaskRun;
  steps: StepNode[];
  /** True for a `finally` task. */
  isFinally: boolean;
}

export function buildTaskTree(
  run: PipelineRun | null | undefined,
  taskRuns: TaskRun[],
): TaskNode[] {
  if (!run) {
    return [];
  }
  const childRefs = run.status?.childReferences ?? [];
  const specTasks = run.status?.pipelineSpec?.tasks ?? [];
  const specFinally = run.status?.pipelineSpec?.finally ?? [];

  // Prefer the resolved pipelineSpec (gives ordering + finally split); fall back
  // to childReferences when the spec is absent (e.g. archived runs).
  const entries: Array<{ name: string; isFinally: boolean }> =
    specTasks.length || specFinally.length
      ? [
          ...specTasks.map(t => ({ name: t.name, isFinally: false })),
          ...specFinally.map(t => ({ name: t.name, isFinally: true })),
        ]
      : childRefs.map(r => ({ name: r.pipelineTaskName, isFinally: false }));

  return entries.map(({ name, isFinally }) => {
    const ref = childRefs.find(r => r.pipelineTaskName === name);
    const taskRun = taskRuns.find(tr => tr.metadata?.name === ref?.name);
    const steps: StepNode[] = (taskRun?.status?.steps ?? []).map(step => ({
      id: `${name}~${step.name}`,
      taskId: name,
      name: step.name,
      step,
      taskRun: taskRun as TaskRun,
    }));
    return { id: name, name, taskRun, steps, isFinally };
  });
}

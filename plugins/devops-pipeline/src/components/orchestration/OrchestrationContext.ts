/*
 * React context backing the orchestration node components — the equivalent of
 * the Angular store/DI the node components used to reach for. Registered node
 * renderers read handlers and current state from here.
 */
import { createContext, useContext } from 'react';

import { PipelineOrchestration, PipelineTask, Task } from '../../types';
import { InsertKind } from './model';

export interface SelectedNode {
  id: string;
  isFinally: boolean;
}

export interface OrchestrationContextValue {
  orchestration: PipelineOrchestration;
  /** tasks + finally */
  allTasks: PipelineTask[];
  /** Resolved Task per pipeline-task name (for node icons / metadata). */
  taskResources: Record<string, Task | null>;
  selected: SelectedNode | null;
  cycleNodeIds: string[];
  select: (node: SelectedNode | null) => void;
  /** open the task picker, then insert relative to `relationTask`. */
  insert: (kind: InsertKind, relationTask: string) => void;
  /** open the task picker, then add the first task. */
  insertFirstTask: () => void;
  /** insert a task between the upstream/downstream of a spacer node. */
  insertAtSpacer: (spacerId: string) => void;
  /** open the task picker, then add a finally task. */
  addFinally: () => void;
  remove: (id: string, isFinally: boolean) => void;
}

export const OrchestrationContext =
  createContext<OrchestrationContextValue | null>(null);

export function useOrchestration(): OrchestrationContextValue {
  const ctx = useContext(OrchestrationContext);
  if (!ctx) {
    throw new Error('useOrchestration must be used within OrchestrationContext');
  }
  return ctx;
}

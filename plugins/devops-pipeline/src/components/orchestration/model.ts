/*
 * Orchestration state engine. Pure functions ported from the console's NgRx
 * `stores/pipeline/reducers/orchestration.ts` plus the `utils/pipeline-utils`
 * and `utils/task-utils` helpers. These drive the editor's task graph: inserting
 * a task rewires `runAfter` of the neighbours (before/after/parallel), deleting
 * a task reconnects its dependents, and renaming a task propagates into both
 * other tasks' `runAfter` and any `$(tasks.<name>.results.*)` references.
 *
 * Also hosts `transformToTopologyNodes`, the pipeline -> @octopus/topology node
 * model transform (equivalent to `defaultTransToTopologicalModel` + the empty
 * placeholders added by the orchestration tab).
 */
import {
  DEFAULT_FINALLY_GROUP_TYPE,
  DEFAULT_FINALLY_NODE_TYPE,
  DEFAULT_TASK_NODE_TYPE,
  PipelineNodeModel,
} from '@octopus/topology';

import {
  PipelineOrchestration,
  PipelineTask,
  TektonResourceRef,
  TektonResourceRefResolver,
} from '../../types';

export const EMPTY_TASK = 'EMPTY_TASK';
export const EMPTY_FINALLY = 'EMPTY_FINALLY';

export enum InsertKind {
  Before = 'Before',
  Parallel = 'Parallel',
  After = 'After',
  Specified = 'Specified',
}

/* ------------------------------------------------------------------ helpers */

const TASK_RESULT_REGEXP =
  /\$\((tasks\.(?<taskName>[\W\w]+?)\.results\.[\W\w]+?)\)/;

function _findResultAfter(task: unknown): string[] {
  const resultAfter: string[] = [];
  Object.values((task as Record<string, unknown>) || {}).forEach(v => {
    if (typeof v !== 'string') {
      resultAfter.push(..._findResultAfter(v));
    } else {
      Array.from(v.matchAll(new RegExp(TASK_RESULT_REGEXP, 'g'))).forEach(
        ({ groups }) => {
          resultAfter.push((groups as { taskName: string }).taskName);
        },
      );
    }
  });
  return resultAfter;
}

export function findResultAfter(task: PipelineTask): string[] {
  return _findResultAfter(task)?.filter(after => after !== task.name);
}

/** Whether `name` is executed before `task` (follows runAfter + result refs). */
export function inBefore(
  name: string,
  task: PipelineTask | undefined,
  tasks: PipelineTask[],
): boolean {
  if (!task) {
    return false;
  }
  for (const after of task.runAfter || []) {
    if (
      after === name ||
      inBefore(name, tasks.find(t => t.name === after), tasks)
    ) {
      return true;
    }
  }
  for (const after of findResultAfter(task) || []) {
    if (
      after === name ||
      inBefore(name, tasks.find(t => t.name === after), tasks)
    ) {
      return true;
    }
  }
  return false;
}

function kebabCase(str: string): string {
  return (
    str
      ?.replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .replace(/[^a-zA-Z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase() || 'task'
  );
}

const isHub = (ref?: TektonResourceRef) =>
  ref?.resolver === TektonResourceRefResolver.Hub;

export function getTaskNameByTektonResourceRef(taskRef?: TektonResourceRef) {
  return kebabCase(
    (isHub(taskRef)
      ? taskRef?.params?.find(p => p.name === 'name')?.value
      : taskRef?.name || taskRef?.kind) || 'task',
  );
}

function randomSuffix(len = 5) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

/** A unique, kebab-cased task name based on `prefix`. */
export function genTaskName(prefix: string, pipelineTasks: PipelineTask[]) {
  let name = `${prefix}-${randomSuffix()}`;
  while (pipelineTasks.some(task => task.name === name)) {
    name = `${prefix}-${randomSuffix()}`;
  }
  return name;
}

export function createTaskRefName(taskRef: TektonResourceRef): string {
  return getTaskNameByTektonResourceRef(taskRef);
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v ?? null)) as T;

const uniqByName = <T extends { name: string }>(arr: T[]): T[] => {
  const seen = new Set<string>();
  const out: T[] = [];
  // keep the last occurrence, like lodash uniqBy after spreading updates last
  for (let i = arr.length - 1; i >= 0; i--) {
    if (!seen.has(arr[i].name)) {
      seen.add(arr[i].name);
      out.unshift(arr[i]);
    }
  }
  return out;
};

/* --------------------------------------------------------------- mutations */

export interface InsertTaskArgs {
  kind?: InsertKind;
  relationTask?: string;
  specifiedRelation?: { runAfter: string[]; runBefore?: string[] };
  task: PipelineTask;
}

export function insertTask(
  state: PipelineOrchestration,
  { kind, relationTask, specifiedRelation, task }: InsertTaskArgs,
): PipelineOrchestration {
  const tasks = clone(state.tasks) || [];

  if (!kind) {
    tasks.push(task);
  } else if (kind === InsertKind.Specified && specifiedRelation) {
    tasks.push({ ...task, runAfter: specifiedRelation.runAfter });
    specifiedRelation.runBefore?.forEach(name => {
      const rel = tasks.find(t => t.name === name);
      if (!rel) {
        return;
      }
      if (!rel.runAfter) {
        rel.runAfter = [];
      }
      rel.runAfter.push(task.name);
      specifiedRelation.runAfter.forEach(after => {
        const idx = rel.runAfter!.findIndex(n => n === after);
        if (idx >= 0) {
          rel.runAfter!.splice(idx, 1);
        }
      });
    });
  } else {
    const rel = tasks.find(t => t.name === relationTask);
    if (!rel) {
      tasks.push(task);
    } else {
      const relRunAfter = [...(rel.runAfter || [])];

      if (kind === InsertKind.Before) {
        rel.runAfter = [task.name];
      } else if (kind === InsertKind.Parallel) {
        tasks
          .filter(t => t.runAfter?.includes(relationTask!))
          .forEach(t => {
            t.runAfter!.push(task.name);
          });
      } else if (kind === InsertKind.After) {
        tasks
          .filter(t => t.runAfter?.includes(relationTask!))
          .forEach(t => {
            t.runAfter!.push(task.name);
            t.runAfter = t.runAfter!.filter(n => n !== relationTask);
          });
      }

      const targetIndex = tasks.findIndex(t => t.name === relationTask);
      tasks.splice(
        kind === InsertKind.Before ? targetIndex : targetIndex + 1,
        0,
        {
          ...task,
          runAfter:
            kind === InsertKind.Before || kind === InsertKind.Parallel
              ? [...relRunAfter]
              : [rel.name],
        },
      );
    }
  }

  return { ...state, tasks };
}

export function removeTask(
  state: PipelineOrchestration,
  name: string,
): PipelineOrchestration {
  let tasks = state.tasks?.filter(f => f.name !== name) || [];
  const deleted = state.tasks?.find(f => f.name === name);

  if (deleted) {
    tasks = tasks.map(task => {
      if (task.runAfter?.includes(name)) {
        return {
          ...task,
          runAfter: task.runAfter
            .filter(r => r !== name)
            .concat(
              deleted.runAfter?.filter(
                after => !inBefore(after, task, tasks) && after !== task.name,
              ) || [],
            ),
        };
      }
      return task;
    });
  }

  return { ...state, tasks };
}

export function insertFinally(
  state: PipelineOrchestration,
  final: PipelineTask,
): PipelineOrchestration {
  return { ...state, finally: [...(state.finally || []), final] };
}

export function removeFinally(
  state: PipelineOrchestration,
  name: string,
): PipelineOrchestration {
  return {
    ...state,
    finally: [...(state.finally?.filter(f => f.name !== name) || [])],
  };
}

function findAndUpdateResults<T>(current: T, name: string, newName: string): T {
  if (!current) {
    return current;
  }
  if (typeof current === 'string') {
    return current.replaceAll(
      new RegExp(`\\$\\((tasks\\.${name}\\.results\\.[\\w\\W]+?)\\)`, 'g'),
      match => match.replace(name, newName),
    ) as T;
  }
  if (current instanceof Object) {
    if (Array.isArray(current)) {
      return current.map(c => findAndUpdateResults(c, name, newName)) as T;
    }
    return Object.entries(current).reduce((acc, [key, value]) => {
      (acc as Record<string, unknown>)[key] = findAndUpdateResults(
        value,
        name,
        newName,
      );
      return acc;
    }, {} as T);
  }
  return current;
}

export function updateTask(
  state: PipelineOrchestration,
  name: string,
  task: PipelineTask,
): PipelineOrchestration {
  let tasks = clone(state.tasks) || [];
  if (!tasks.length) {
    return state;
  }

  if (task.name === name) {
    tasks = tasks.map(t => (t.name === name ? task : t));
  } else {
    tasks = tasks.map(t => {
      if (t.name === name) {
        return task;
      }
      if (t.runAfter?.length) {
        t.runAfter = t.runAfter.map(r => (r === name ? task.name : r));
      }
      return findAndUpdateResults(t, name, task.name);
    });
  }

  return { ...state, tasks };
}

export function updateFinally(
  state: PipelineOrchestration,
  name: string,
  final: PipelineTask,
): PipelineOrchestration {
  return {
    ...state,
    finally: state.finally?.map(t => (t.name === name ? final : t)),
  };
}

export function updateTaskParamValue(
  state: PipelineOrchestration,
  taskName: string,
  parameterName: string,
  value: string,
): PipelineOrchestration {
  return {
    ...state,
    tasks: state.tasks?.map(task =>
      task.name === taskName
        ? {
            ...task,
            params: uniqByName([
              ...(task.params || []).map(p =>
                p.name === parameterName ? { ...p, value } : p,
              ),
              { name: parameterName, value },
            ]),
          }
        : task,
    ),
  };
}

/* --------------------------------------------------- pipeline -> topology */

export interface TransformOptions {
  width: number;
  height: number;
}

/**
 * Port of `defaultTransToTopologicalModel` + the empty-placeholder logic from
 * the orchestration tab: turns a pipeline's tasks/finally into topology node
 * models, adding empty placeholders and the finally group.
 */
export function transformToTopologyNodes(
  resource: PipelineOrchestration | undefined,
  dims: TransformOptions,
): PipelineNodeModel[] {
  const model: PipelineNodeModel[] = [
    ...(resource?.tasks?.map(r => ({
      id: r.name,
      runAfter: r.runAfter,
      resultAfter: findResultAfter(r)?.filter(name =>
        resource.tasks!.some(t => t.name === name),
      ),
      type: DEFAULT_TASK_NODE_TYPE,
      width: dims.width,
      height: dims.height,
    })) || []),
    ...(resource?.finally?.length
      ? [
          ...resource.finally.map(r => ({
            id: r.name,
            type: DEFAULT_FINALLY_NODE_TYPE,
            resultAfter: findResultAfter(r)?.filter(name =>
              resource.tasks?.some(t => t.name === name),
            ),
            width: dims.width,
            height: dims.height,
          })),
          {
            group: true,
            id: 'finally-group',
            type: DEFAULT_FINALLY_GROUP_TYPE,
            style: { padding: [24, 24, 74, 24] as [number, number, number, number] },
            children: resource.finally.map(f => f.name),
          },
        ]
      : []),
  ];

  if (!resource?.tasks?.length) {
    model.push({
      id: EMPTY_TASK,
      type: EMPTY_TASK,
      width: dims.width,
      height: dims.height,
    });
  }
  if (!resource?.finally?.length) {
    model.push(
      {
        id: EMPTY_FINALLY,
        type: EMPTY_FINALLY,
        width: dims.width,
        height: dims.height,
      },
      {
        group: true,
        id: 'finally-group',
        type: DEFAULT_FINALLY_GROUP_TYPE,
        style: { padding: [48, 24, 66, 24] as [number, number, number, number] },
        children: [EMPTY_FINALLY],
      },
    );
  }

  return model;
}

/*
 * Small read helpers for Task display metadata, shared by the task picker
 * (select-task) and the task drawer (task-form). Mirrors the console's Tekton
 * annotation conventions (`tekton.dev/displayName|categories|platforms`).
 */
import { Task } from '../types';
import { getTaskMeta } from './orchestration/mockTasks';

const DISPLAY_NAME = 'tekton.dev/displayName';
const CATEGORIES = 'tekton.dev/categories';
const PLATFORMS = 'tekton.dev/platforms';
const ICON = 'tekton.dev/icon';
const DISPLAY_PARAMS = 'style.tekton.dev/displayParams';

const ann = (task: Task | null | undefined, key: string) =>
  task?.metadata?.annotations?.[key];

export const getTaskName = (task: Task | null | undefined): string =>
  task?.metadata?.name ?? '';

export const getTaskDisplayName = (task: Task | null | undefined): string =>
  ann(task, DISPLAY_NAME) || getTaskName(task);

export const getTaskDescription = (task: Task | null | undefined): string =>
  task?.spec?.description || '';

const splitList = (value: string | undefined): string[] =>
  (value ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

export const getTaskCategories = (task: Task | null | undefined): string[] =>
  splitList(ann(task, CATEGORIES));

export const getTaskPlatforms = (task: Task | null | undefined): string[] =>
  splitList(ann(task, PLATFORMS));

export const getTaskCreatedAt = (task: Task | null | undefined): string =>
  task?.metadata?.creationTimestamp ?? '';

/** Accent colour for the task icon (falls back to the catalog / neutral). */
export const getTaskColor = (task: Task | null | undefined): string =>
  getTaskMeta(getTaskName(task)).color;

/** The task's custom icon image URL (`tekton.dev/icon`), if any. */
export const getTaskIcon = (task: Task | null | undefined): string | undefined =>
  ann(task, ICON);

/**
 * Names of the params shown in the main form area (`style.tekton.dev/displayParams`).
 * `null` = no override (show all); otherwise the rest go to "Additional Params".
 */
export const getDisplayParams = (
  task: Task | null | undefined,
): string[] | null => {
  const value = ann(task, DISPLAY_PARAMS);
  return value === undefined
    ? null
    : value.split(',').map(s => s.trim()).filter(Boolean);
};

/** The reference string for a task result: `$(tasks.<task>.results.<result>)`. */
export const genTaskResultRef = (taskName: string, result: string): string =>
  `$(tasks.${taskName}.results.${result})`;

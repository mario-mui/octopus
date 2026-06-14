/*
 * PipelineRun execution status helpers — a simplified port of the console's
 * `PipelineRunStatusService`. Tekton reports run state through the `Succeeded`
 * condition: its `status` (True/False/Unknown) plus a `reason` refine the
 * displayed phase. See https://tekton.dev/docs/pipelines/pipelineruns/#monitoring-execution-status
 */
import type { Condition, PipelineRun, StepState } from '../types';

export type RunPhase =
  | 'Succeeded'
  | 'Failed'
  | 'Running'
  | 'Cancelled'
  | 'Pending'
  | 'Unknown';

/** A step's phase is a subset of {@link RunPhase} (no cancelled state). */
export type StepPhase = Extract<
  RunPhase,
  'Succeeded' | 'Failed' | 'Running' | 'Pending' | 'Unknown'
>;

/** Reasons that mean the run was (or is being) cancelled/stopped. */
const CANCELLED_REASONS = new Set([
  'Cancelled',
  'PipelineRunCancelled',
  'StoppedRunFinally',
  'CancelledRunFinally',
  'PipelineRunStopping',
]);

export function getRunPhase(run?: PipelineRun): RunPhase {
  return getPhaseFromConditions(run?.status?.conditions);
}

/**
 * Derive a phase from a resource's `Succeeded` condition. Shared by PipelineRun
 * and TaskRun, which both report state this way.
 */
export function getPhaseFromConditions(conditions?: Condition[]): RunPhase {
  const list = conditions ?? [];
  const cond = list.find(c => c.type === 'Succeeded') ?? list[0];
  const reason = cond?.reason;
  const status = cond?.status;
  if (!cond || !reason) {
    return 'Unknown';
  }
  if (reason === 'PipelineRunPending') {
    return 'Pending';
  }
  if (CANCELLED_REASONS.has(reason)) {
    // status 'Unknown' while cancelling — still in flight, show as Running.
    return status === 'Unknown' ? 'Running' : 'Cancelled';
  }
  if (status === 'True') {
    return 'Succeeded';
  }
  if (status === 'False') {
    return 'Failed';
  }
  if (status === 'Unknown') {
    return 'Running';
  }
  return 'Unknown';
}

/** AntD `Tag` colour for a run phase. */
export function getRunPhaseColor(phase: RunPhase): string {
  switch (phase) {
    case 'Succeeded':
      return 'success';
    case 'Failed':
      return 'error';
    case 'Running':
      return 'processing';
    case 'Pending':
      return 'warning';
    case 'Cancelled':
    case 'Unknown':
    default:
      return 'default';
  }
}

/** The message from the run's `Succeeded` condition, if any. */
export function getRunMessage(run?: PipelineRun): string {
  const conditions = run?.status?.conditions ?? [];
  const cond = conditions.find(c => c.type === 'Succeeded') ?? conditions[0];
  return cond?.message ?? '';
}

/**
 * Human-readable elapsed time between two ISO timestamps. With no end time it
 * counts up to now (a still-running step/task); returns '-' without a start.
 */
export function humanizeDuration(start?: string, end?: string): string {
  if (!start) {
    return '-';
  }
  const startMs = new Date(start).getTime();
  const endMs = end ? new Date(end).getTime() : Date.now();
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) {
    return '-';
  }
  return formatDuration(Math.floor((endMs - startMs) / 1000));
}

/** Elapsed time of a whole run (start → completion, or now if running). */
export function getRunDuration(run?: PipelineRun): string {
  return humanizeDuration(run?.status?.startTime, run?.status?.completionTime);
}

/** A step's phase, derived from its container state. */
export function getStepPhase(step?: StepState): StepPhase {
  if (!step) {
    return 'Unknown';
  }
  if (step.terminated) {
    return step.terminated.reason === 'Completed' ||
      step.terminated.exitCode === 0
      ? 'Succeeded'
      : 'Failed';
  }
  if (step.running) {
    return 'Running';
  }
  if (step.waiting) {
    return 'Pending';
  }
  return 'Unknown';
}

/** A step's start / end timestamps, for duration display. */
export function getStepTimes(step?: StepState): {
  start?: string;
  end?: string;
} {
  return {
    start: step?.terminated?.startedAt ?? step?.running?.startedAt,
    end: step?.terminated?.finishedAt,
  };
}

function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 1) {
    return '0s';
  }
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const parts: string[] = [];
  if (h) {
    parts.push(`${h}h`);
  }
  if (m) {
    parts.push(`${m}m`);
  }
  if (s || parts.length === 0) {
    parts.push(`${s}s`);
  }
  return parts.join(' ');
}

import { describe, expect, it } from 'vitest';
import { buildTaskTree } from './buildTaskTree';
import type { PipelineRun, TaskRun } from '../../types';

const run: PipelineRun = {
  metadata: { name: 'gv1003' },
  status: {
    childReferences: [
      { name: 'gv1003-seed', pipelineTaskName: 'seed', kind: 'TaskRun' },
      {
        name: 'gv1003-cv',
        pipelineTaskName: 'calculate-version',
        kind: 'TaskRun',
      },
      { name: 'gv1003-report', pipelineTaskName: 'report', kind: 'TaskRun' },
    ],
    pipelineSpec: {
      tasks: [{ name: 'seed' }, { name: 'calculate-version' }],
      finally: [{ name: 'report' }],
    },
  },
};

const taskRuns: TaskRun[] = [
  {
    metadata: { name: 'gv1003-seed' },
    status: {
      podName: 'gv1003-seed-pod',
      steps: [{ name: 'seed', container: 'step-seed' }],
    },
  },
  {
    metadata: { name: 'gv1003-cv' },
    status: {
      podName: 'gv1003-cv-pod',
      steps: [
        { name: 'calculate-version', container: 'step-calculate-version' },
        { name: 'format-content', container: 'step-format-content' },
      ],
    },
  },
];

describe('buildTaskTree', () => {
  it('resolves tasks (incl. finally) to their TaskRuns and step children', () => {
    const tree = buildTaskTree(run, taskRuns);
    expect(tree.map(t => t.id)).toEqual([
      'seed',
      'calculate-version',
      'report',
    ]);

    const seed = tree[0];
    expect(seed.taskRun?.metadata?.name).toBe('gv1003-seed');
    expect(seed.steps.map(s => s.id)).toEqual(['seed~seed']);
    expect(seed.steps[0].step.container).toBe('step-seed');
    expect(seed.steps[0].taskRun.status?.podName).toBe('gv1003-seed-pod');

    expect(tree[1].steps.map(s => s.name)).toEqual([
      'calculate-version',
      'format-content',
    ]);

    // `report` is the finally task; it has no matching TaskRun yet.
    expect(tree[2].isFinally).toBe(true);
    expect(tree[2].taskRun).toBeUndefined();
    expect(tree[2].steps).toEqual([]);
  });

  it('falls back to childReferences when pipelineSpec is absent', () => {
    const archived: PipelineRun = {
      metadata: { name: 'gv1003' },
      status: { childReferences: run.status!.childReferences },
    };
    const tree = buildTaskTree(archived, taskRuns);
    expect(tree.map(t => t.id)).toEqual(['seed', 'calculate-version', 'report']);
    expect(tree.every(t => !t.isFinally)).toBe(true);
  });

  it('returns [] for a missing run', () => {
    expect(buildTaskTree(null, taskRuns)).toEqual([]);
  });
});

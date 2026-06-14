import { describe, expect, it } from 'vitest';
import { buildGraph } from '@octopus/topology';

import { PipelineOrchestration, TektonResourceRefKind } from '../../types';
import {
  InsertKind,
  insertTask,
  removeTask,
  transformToTopologyNodes,
  updateTask,
} from './model';

const base = (): PipelineOrchestration => ({
  tasks: [
    { name: 'build', runAfter: [] },
    { name: 'test', runAfter: ['build'] },
  ],
  finally: [],
});

describe('orchestration model', () => {
  it('insert After retargets downstream dependents onto the new task', () => {
    // insert "scan" after "build": test should now runAfter scan, not build
    const next = insertTask(base(), {
      kind: InsertKind.After,
      relationTask: 'build',
      task: { name: 'scan' },
    });
    const scan = next.tasks!.find(t => t.name === 'scan')!;
    const test = next.tasks!.find(t => t.name === 'test')!;
    expect(scan.runAfter).toEqual(['build']);
    expect(test.runAfter).toContain('scan');
    expect(test.runAfter).not.toContain('build');
  });

  it('insert Before makes the relation depend on the new task', () => {
    const next = insertTask(base(), {
      kind: InsertKind.Before,
      relationTask: 'test',
      task: { name: 'prep' },
    });
    const prep = next.tasks!.find(t => t.name === 'prep')!;
    const test = next.tasks!.find(t => t.name === 'test')!;
    expect(prep.runAfter).toEqual(['build']); // inherits test's old deps
    expect(test.runAfter).toEqual(['prep']);
  });

  it('insert Parallel shares the relation dependencies', () => {
    const next = insertTask(base(), {
      kind: InsertKind.Parallel,
      relationTask: 'test',
      task: { name: 'lint' },
    });
    const lint = next.tasks!.find(t => t.name === 'lint')!;
    expect(lint.runAfter).toEqual(['build']);
  });

  it('removing a middle task reconnects its dependents to its dependencies', () => {
    // build -> test -> deploy ; remove test => deploy should runAfter build
    const state: PipelineOrchestration = {
      tasks: [
        { name: 'build', runAfter: [] },
        { name: 'test', runAfter: ['build'] },
        { name: 'deploy', runAfter: ['test'] },
      ],
    };
    const next = removeTask(state, 'test');
    const deploy = next.tasks!.find(t => t.name === 'deploy')!;
    expect(next.tasks!.some(t => t.name === 'test')).toBe(false);
    expect(deploy.runAfter).toContain('build');
  });

  it('renaming a task propagates into dependents runAfter and result refs', () => {
    const state: PipelineOrchestration = {
      tasks: [
        { name: 'build', runAfter: [] },
        {
          name: 'test',
          runAfter: ['build'],
          params: [{ name: 'img', value: '$(tasks.build.results.image)' }],
        },
      ],
    };
    const renamed = { name: 'compile', runAfter: [] };
    const next = updateTask(state, 'build', renamed);
    const test = next.tasks!.find(t => t.name === 'test')!;
    expect(test.runAfter).toEqual(['compile']);
    expect(test.params![0].value).toBe('$(tasks.compile.results.image)');
  });

  it('transform adds empty placeholders when there are no tasks', () => {
    const nodes = transformToTopologyNodes(
      { tasks: [], finally: [] },
      { width: 180, height: 76 },
    );
    expect(nodes.some(n => n.type === 'EMPTY_TASK')).toBe(true);
    expect(nodes.some(n => n.type === 'EMPTY_FINALLY')).toBe(true);
  });

  it('a fan-out graph builds into a positioned, cycle-free layout', () => {
    const taskRef = (name: string) => ({
      kind: TektonResourceRefKind.Task,
      name,
    });
    const orchestration: PipelineOrchestration = {
      tasks: [
        { name: 'git-version', taskRef: taskRef('git-version'), runAfter: [] },
        {
          name: 'git-version-8b2bf',
          taskRef: taskRef('git-version'),
          runAfter: ['git-version'],
        },
        {
          name: 'trivy-scanner',
          taskRef: taskRef('trivy-scanner'),
          runAfter: ['git-version'],
        },
      ],
      finally: [{ name: 'nodejs', taskRef: taskRef('nodejs') }],
    };
    const nodes = transformToTopologyNodes(orchestration, {
      width: 180,
      height: 76,
    });
    const graph = buildGraph(nodes, {
      finallyNodeTypes: ['EMPTY_FINALLY', 'DEFAULT_FINALLY_NODE'],
    });
    expect(graph.cycleNodeIds).toHaveLength(0);
    // git-version + its two dependents + the finally node + finally group
    const ids = graph.nodes.map(n => n.id);
    expect(ids).toContain('git-version');
    expect(ids).toContain('trivy-scanner');
    expect(ids).toContain('nodejs');
    expect(ids).toContain('finally-group');
    // the two parallel dependents sit to the right of git-version
    const gv = graph.nodes.find(n => n.id === 'git-version')!;
    const trivy = graph.nodes.find(n => n.id === 'trivy-scanner')!;
    expect(trivy.x).toBeGreaterThan(gv.x);
  });
});

import { describe, expect, it } from 'vitest';

import { buildGraph } from './buildGraph';
import {
  DEFAULT_TASK_NODE_TYPE,
  DEFAULT_FINALLY_NODE_TYPE,
  DEFAULT_FINALLY_GROUP_TYPE,
} from './constants';
import { findCycles, getEdgesFromNodes, getTopologicalNodes } from './graph-utils';
import { PipelineNodeModel } from './model';

const task = (id: string, runAfter?: string[]): PipelineNodeModel => ({
  id,
  type: DEFAULT_TASK_NODE_TYPE,
  runAfter,
  width: 180,
  height: 76,
});

describe('graph-utils', () => {
  it('derives edges from runAfter dependencies', () => {
    const nodes = [task('build'), task('test', ['build']), task('deploy', ['test'])];
    const topo = getTopologicalNodes(nodes);
    const edges = getEdgesFromNodes(topo);
    const pairs = edges.map(e => `${e.source}->${e.target}`);
    expect(pairs).toContain('build->test');
    expect(pairs).toContain('test->deploy');
  });

  it('inserts a spacer node between parallel-to-parallel dependencies', () => {
    // a,b both upstream; c,d both depend on [a,b] -> a spacer collapses the mesh
    const nodes = [
      task('a'),
      task('b'),
      task('c', ['a', 'b']),
      task('d', ['a', 'b']),
    ];
    const topo = getTopologicalNodes(nodes);
    expect(topo.some(n => n.type === 'DEFAULT_SPACER_NODE')).toBe(true);
  });

  it('detects cycles', () => {
    const nodes = [task('a', ['b']), task('b', ['a'])];
    const cycles = findCycles(nodes, n => n.id);
    expect(cycles.length).toBeGreaterThan(0);
    expect(cycles.flat().sort()).toEqual(['a', 'b']);
  });
});

describe('buildGraph', () => {
  it('positions a linear pipeline left-to-right', () => {
    const nodes = [task('build'), task('test', ['build'])];
    const graph = buildGraph(nodes);
    const build = graph.nodes.find(n => n.id === 'build')!;
    const test = graph.nodes.find(n => n.id === 'test')!;
    expect(build).toBeTruthy();
    expect(test).toBeTruthy();
    // test runs after build, so it sits to the right
    expect(test.x).toBeGreaterThan(build.x);
    expect(graph.cycleNodeIds).toHaveLength(0);
  });

  it('lays out a finally group after the main tasks', () => {
    const nodes: PipelineNodeModel[] = [
      task('build'),
      {
        id: 'cleanup',
        type: DEFAULT_FINALLY_NODE_TYPE,
        width: 180,
        height: 76,
      },
      {
        group: true,
        id: 'finally-group',
        type: DEFAULT_FINALLY_GROUP_TYPE,
        style: { padding: [24, 24, 74, 24] },
        children: ['cleanup'],
      },
    ];
    const graph = buildGraph(nodes, {
      finallyNodeTypes: [DEFAULT_FINALLY_NODE_TYPE],
    });
    const group = graph.nodes.find(n => n.id === 'finally-group');
    const cleanup = graph.nodes.find(n => n.id === 'cleanup')!;
    const build = graph.nodes.find(n => n.id === 'build')!;
    expect(group?.group).toBe(true);
    // finally runs last -> to the right of build
    expect(cleanup.x).toBeGreaterThan(build.x);
  });

  it('flags cyclic nodes and still lays out the rest', () => {
    const nodes = [task('a', ['b']), task('b', ['a']), task('c')];
    const graph = buildGraph(nodes);
    expect(graph.cycleNodeIds.sort()).toEqual(['a', 'b']);
    expect(graph.nodes.find(n => n.id === 'c')).toBeTruthy();
    expect(graph.nodes.find(n => n.id === 'error-cycle-group')).toBeTruthy();
  });
});

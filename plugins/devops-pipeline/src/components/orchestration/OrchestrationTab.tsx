/*
 * The orchestration ("流水线编排") tab — the centerpiece of the pipeline editor.
 * Renders the task DAG on the reusable @octopus/topology engine, with hover
 * insert/delete affordances, empty-state placeholders, the finally group and a
 * task drawer. Equivalent of the Angular `pipeline-form-orchestration-tab`.
 */
import { useMemo, useState } from 'react';
import { Modal } from 'antd';
import { createStyles } from 'antd-style';
import {
  DEFAULT_FINALLY_GROUP_TYPE,
  DEFAULT_FINALLY_NODE_TYPE,
  DEFAULT_GROUP_TYPE,
  DEFAULT_SPACER_NODE_TYPE,
  DEFAULT_TASK_NODE_TYPE,
  LayoutModel,
  NodeComponents,
  NodeRenderProps,
  Topology,
} from '@octopus/topology';

import {
  PipelineOrchestration,
  PipelineTask,
  TektonResourceRef,
  WorkspaceDeclaration,
} from '../../types';
import {
  EMPTY_FINALLY,
  EMPTY_TASK,
  InsertKind,
  findResultAfter,
  genTaskName,
  getTaskNameByTektonResourceRef,
  insertFinally,
  insertTask,
  removeFinally,
  removeTask,
  transformToTopologyNodes,
  updateFinally,
  updateTask,
} from './model';
import {
  OrchestrationContext,
  OrchestrationContextValue,
  SelectedNode,
} from './OrchestrationContext';
import {
  EmptyFinallyNode,
  EmptyTaskNode,
  FinallyGroup,
  SpacerNode,
  TaskNode,
} from './nodes';
import { SelectTask } from '../select-task';
import { TaskDrawer } from '../task-form';
import { useTasks } from './useTasks';

const NODE_W = 180;
const NODE_H = 76;
const FINALLY_NODE_TYPES = [EMPTY_FINALLY, DEFAULT_FINALLY_NODE_TYPE];

type PickerAction =
  | { type: 'first' }
  | { type: 'insert'; kind: InsertKind; relationTask: string }
  | { type: 'spacer'; spacerId: string }
  | { type: 'finally' };

const useStyles = createStyles(({ token, css }) => ({
  canvas: css`
    width: 100%;
    height: 560px;
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: ${token.borderRadiusLG}px;
    background-color: ${token.colorBgLayout};
    background-image: radial-gradient(
      circle,
      ${token.colorFill} 1px,
      transparent 1px
    );
    background-size: 22px 22px;
  `,
  cycleGroup: css`
    width: 100%;
    height: 100%;
    border: 1px dashed ${token.colorError};
    border-radius: ${token.borderRadius * 2}px;
    background: ${token.colorErrorBg};
    pointer-events: none;
  `,
}));

function CycleGroup(_props: NodeRenderProps) {
  const { styles } = useStyles();
  return <div className={styles.cycleGroup} />;
}

const nodeComponents: NodeComponents = {
  [DEFAULT_TASK_NODE_TYPE]: TaskNode,
  [DEFAULT_FINALLY_NODE_TYPE]: TaskNode,
  [EMPTY_TASK]: EmptyTaskNode,
  [EMPTY_FINALLY]: EmptyFinallyNode,
  [DEFAULT_SPACER_NODE_TYPE]: SpacerNode,
  [DEFAULT_FINALLY_GROUP_TYPE]: FinallyGroup,
  [DEFAULT_GROUP_TYPE]: CycleGroup,
};

export interface OrchestrationTabProps {
  value: PipelineOrchestration;
  onChange: (next: PipelineOrchestration) => void;
  pipelineWorkspaces?: WorkspaceDeclaration[];
  cluster?: string;
  namespace?: string;
}

export function OrchestrationTab({
  value,
  onChange,
  pipelineWorkspaces = [],
  cluster,
  namespace,
}: OrchestrationTabProps) {
  const { styles } = useStyles();
  const [selected, setSelected] = useState<SelectedNode | null>(null);
  const [selKey, setSelKey] = useState(0);
  const [picker, setPicker] = useState<PickerAction | null>(null);

  const allTasks = useMemo(
    () => [...(value.tasks || []), ...(value.finally || [])],
    [value],
  );

  const nodes = useMemo(
    () => transformToTopologyNodes(value, { width: NODE_W, height: NODE_H }),
    [value],
  );

  const select = (node: SelectedNode | null) => {
    setSelKey(k => k + 1);
    setSelected(node);
  };

  const insert = (kind: InsertKind, relationTask: string) =>
    setPicker({ type: 'insert', kind, relationTask });
  const insertFirstTask = () => setPicker({ type: 'first' });
  const insertAtSpacer = (spacerId: string) =>
    setPicker({ type: 'spacer', spacerId });
  const addFinally = () => setPicker({ type: 'finally' });

  const remove = (id: string, isFinally: boolean) => {
    Modal.confirm({
      title: `Delete ${isFinally ? 'finally task' : 'task'} "${id}"?`,
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: () => {
        onChange(
          isFinally ? removeFinally(value, id) : removeTask(value, id),
        );
        setSelected(s => (s?.id === id ? null : s));
      },
    });
  };

  const handlePicked = (taskRef: TektonResourceRef) => {
    const action = picker;
    setPicker(null);
    if (!action) {
      return;
    }
    const name = genTaskName(getTaskNameByTektonResourceRef(taskRef), allTasks);

    if (action.type === 'finally') {
      onChange(insertFinally(value, { name, taskRef }));
      return;
    }
    if (action.type === 'first') {
      onChange(insertTask(value, { task: { name, taskRef } }));
      return;
    }
    if (action.type === 'insert') {
      onChange(
        insertTask(value, {
          kind: action.kind,
          relationTask: action.relationTask,
          task: { name, taskRef },
        }),
      );
      return;
    }
    // spacer insert. Two kinds of spacer:
    let runAfter: string[];
    let runBefore: string[];
    if (action.spacerId.endsWith('(finally-group)')) {
      // The merge dot before the Finally block. Its id encodes the finally node
      // names, but its real upstream is the terminal main tasks — so insert a
      // new task that runs after all of them (a new terminal task before
      // `finally`), with nothing to rewire downstream.
      const all = value.tasks || [];
      const after = (t: PipelineTask) => [
        ...(t.runAfter || []),
        ...findResultAfter(t),
      ];
      runAfter = all
        .filter(t => !all.some(o => after(o).includes(t.name)))
        .map(t => t.name);
      runBefore = [];
    } else {
      // A parallel-to-parallel spacer: its id is the upstream task ids; the
      // downstream tasks are those whose runAfter is exactly that set.
      runAfter = action.spacerId.split('|');
      const sameSet = (a: string[] = []) =>
        a.length === runAfter.length && a.every(x => runAfter.includes(x));
      runBefore = (value.tasks || [])
        .filter(t => sameSet(t.runAfter))
        .map(t => t.name);
    }
    onChange(
      insertTask(value, {
        kind: InsertKind.Specified,
        specifiedRelation: { runAfter, runBefore },
        task: { name, taskRef },
      }),
    );
  };

  const commitTask = (originalName: string, task: PipelineTask) => {
    if (!task || !selected) {
      return;
    }
    onChange(
      selected.isFinally
        ? updateFinally(value, originalName, task)
        : updateTask(value, originalName, task),
    );
    // follow the rename without bumping the editing session
    if (task.name !== originalName) {
      setSelected(s => (s ? { ...s, id: task.name } : s));
    }
  };

  const selectedTask = selected
    ? allTasks.find(t => t.name === selected.id)
    : undefined;

  // Resolve every task once on entry (namespaced + hub), so the drawer can show
  // the selected task's details. Only the ref kinds actually present are fetched.
  const { resources: taskResources, loading: taskResourceLoading } = useTasks(
    allTasks,
    cluster,
    namespace,
  );
  const taskResource = selectedTask
    ? taskResources[selectedTask.name] ?? null
    : null;

  const ctx: OrchestrationContextValue = {
    orchestration: value,
    allTasks,
    taskResources,
    selected,
    cycleNodeIds: [],
    select,
    insert,
    insertFirstTask,
    insertAtSpacer,
    addFinally,
    remove,
  };

  return (
    <OrchestrationContext.Provider value={ctx}>
      <div className={styles.canvas}>
        <Topology
          nodes={nodes}
          options={{ mode: LayoutModel.Normal, finallyNodeTypes: FINALLY_NODE_TYPES }}
          nodeComponents={nodeComponents}
          selectedId={selected?.id ?? null}
          onSelectNode={id => (id ? undefined : setSelected(null))}
        />
      </div>

      <TaskDrawer
        key={selKey}
        open={!!selected && !!selectedTask}
        task={selectedTask}
        isFinally={selected?.isFinally ?? false}
        tasks={value.tasks || []}
        pipelineWorkspaces={pipelineWorkspaces}
        taskResource={taskResource}
        taskResourceLoading={taskResourceLoading}
        cluster={cluster}
        namespace={namespace}
        onClose={() => setSelected(null)}
        onCommit={commitTask}
      />

      <SelectTask
        open={!!picker}
        cluster={cluster}
        namespace={namespace}
        onCancel={() => setPicker(null)}
        onSelect={handlePicked}
      />
    </OrchestrationContext.Provider>
  );
}

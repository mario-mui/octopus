/*
 * Task drawer (design/task-drawer): the shell around the task form — a header
 * with the task icon + the resolved task's name (with a pencil to re-pick the
 * task) and a Form / YAML toggle, then either the structured TaskForm or a YAML
 * editor. Edits are committed back into the orchestration model (debounced);
 * renaming is handled by the model's updateTask.
 */
import { useEffect, useRef, useState } from 'react';
import { Drawer, Segmented, Space, Spin, Typography } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { createStyles } from 'antd-style';
import { CodeEditor, yamlWriteOptions } from '@octopus/code-editor';
import { parse, stringify } from 'yaml';
import {
  PipelineTask,
  Task,
  TektonResourceRef,
  WorkspaceDeclaration,
} from '../../types';
import { getTaskColor, getTaskDisplayName, getTaskIcon } from '../taskMeta';
import { getTaskNameByTektonResourceRef } from '../orchestration/model';
import { SelectTask } from '../select-task';
import { TektonIcon } from '../TektonIcon';
import { TaskForm } from './TaskForm';

export interface TaskDrawerProps {
  open: boolean;
  task: PipelineTask | undefined;
  isFinally: boolean;
  tasks: PipelineTask[];
  pipelineWorkspaces: WorkspaceDeclaration[];
  taskResource?: Task | null;
  taskResourceLoading?: boolean;
  cluster?: string;
  namespace?: string;
  onClose: () => void;
  onCommit: (originalName: string, task: PipelineTask) => void;
}

const useStyles = createStyles(({ token, css }) => ({
  header: css`
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
  `,
  name: css`
    font-size: 16px;
    font-weight: 600;
  `,
  edit: css`
    color: ${token.colorTextTertiary};
    cursor: pointer;
    &:hover {
      color: ${token.colorPrimary};
    }
  `,
  spacer: css`
    flex: 1;
  `,
}));

export function TaskDrawer(props: TaskDrawerProps) {
  if (!props.open || !props.task) {
    return <Drawer open={false} onClose={props.onClose} width={560} title="Task" />;
  }
  return <TaskDrawerInner {...props} />;
}

function TaskDrawerInner({
  task,
  taskResource,
  taskResourceLoading,
  tasks,
  pipelineWorkspaces,
  isFinally,
  cluster,
  namespace,
  onClose,
  onCommit,
}: TaskDrawerProps) {
  const { styles } = useStyles();
  const [view, setView] = useState<'Form' | 'YAML'>('Form');
  const [draft, setDraft] = useState<PipelineTask>(() => ({ ...task! }));
  const [yamlText, setYamlText] = useState('');
  const [yamlError, setYamlError] = useState<string | null>(null);
  const [reselectOpen, setReselectOpen] = useState(false);
  // Bridges the gap between picking a new task and its resolution finishing —
  // the commit is debounced, so `taskResourceLoading` only flips a beat later.
  const [reselecting, setReselecting] = useState(false);
  const sawLoading = useRef(false);

  // Clear the bridge once a resolution cycle (loading true → false) completes.
  useEffect(() => {
    if (!reselecting) {
      return;
    }
    if (taskResourceLoading) {
      sawLoading.current = true;
    } else if (sawLoading.current) {
      sawLoading.current = false;
      setReselecting(false);
    }
  }, [taskResourceLoading, reselecting]);

  const originalName = useRef(task!.name);
  const firstRun = useRef(true);

  // Debounced commit back into the orchestration model.
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const handle = setTimeout(() => {
      if (!draft.name) {
        return;
      }
      onCommit(originalName.current, draft);
      originalName.current = draft.name;
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  const switchView = (next: 'Form' | 'YAML') => {
    if (next === 'YAML') {
      setYamlText(stringify(draft));
      setYamlError(null);
    } else {
      try {
        const parsed = parse(yamlText) as PipelineTask;
        if (parsed && typeof parsed === 'object') {
          setDraft(parsed);
        }
        setYamlError(null);
      } catch (e) {
        setYamlError(`Invalid YAML: ${(e as Error).message}`);
        return;
      }
    }
    setView(next);
  };

  // Re-pick the backing task: swap the ref, and when the task identity actually
  // changes drop the now-stale param / workspace bindings (they belonged to the
  // old task's declarations).
  const reselect = (taskRef: TektonResourceRef) => {
    setReselectOpen(false);
    const changed =
      getTaskNameByTektonResourceRef(taskRef) !==
      getTaskNameByTektonResourceRef(draft.taskRef);
    if (changed) {
      sawLoading.current = false;
      setReselecting(true);
      setDraft(d => ({
        ...d,
        taskRef,
        taskSpec: undefined,
        params: [],
        workspaces: [],
      }));
    } else {
      setDraft(d => ({ ...d, taskRef }));
    }
  };

  const title =
    getTaskDisplayName(taskResource) ||
    draft.displayName ||
    draft.name ||
    (isFinally ? 'Finally Task' : 'Task');

  return (
    <Drawer
      open
      width={620}
      onClose={onClose}
      styles={{ body: { padding: '16px 20px' } }}
      title={
        <div className={styles.header}>
          <TektonIcon
            src={getTaskIcon(taskResource ?? null)}
            name={title}
            color={getTaskColor(taskResource ?? null)}
            size={24}
          />
          <span className={styles.name}>{title}</span>
          <EditOutlined
            className={styles.edit}
            onClick={() => setReselectOpen(true)}
          />
          <div className={styles.spacer} />
          <Segmented
            value={view}
            onChange={val => switchView(val as 'Form' | 'YAML')}
            options={['Form', 'YAML']}
          />
        </div>
      }
    >
      {view === 'YAML' ? (
        <>
          {yamlError ? <Typography.Text type="danger">{yamlError}</Typography.Text> : null}
          <CodeEditor
            value={yamlText}
            onChange={setYamlText}
            options={yamlWriteOptions}
            style={{ height: 'calc(100vh - 160px)' }}
          />
        </>
      ) : (
        <Spin spinning={reselecting || !!taskResourceLoading}>
          <Space direction="vertical" style={{ width: '100%' }} size={0}>
            <TaskForm
              value={draft}
              onChange={setDraft}
              taskResource={taskResource ?? null}
              pipelineWorkspaces={pipelineWorkspaces}
              tasks={tasks}
              isFinally={isFinally}
              cluster={cluster}
              namespace={namespace}
            />
          </Space>
        </Spin>
      )}

      <SelectTask
        open={reselectOpen}
        cluster={cluster}
        namespace={namespace}
        onCancel={() => setReselectOpen(false)}
        onSelect={reselect}
      />
    </Drawer>
  );
}

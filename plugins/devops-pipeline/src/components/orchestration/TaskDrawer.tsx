/*
 * Task drawer — edits the selected pipeline task. Ported from the console's
 * task-drawer + task-form / when-form / workspace-refs-form. Form/YAML toggle,
 * debounced commit back into the orchestration model, execute-order (immediately
 * vs runAfter), when-conditions, params and workspace bindings.
 *
 * Rename handling is delegated to the model's `updateTask`, which rewrites
 * dependents' runAfter and `$(tasks.<name>.results.*)` references.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Collapse,
  Drawer,
  Form,
  Input,
  InputNumber,
  Radio,
  Segmented,
  Select,
  Space,
  Typography,
} from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { CodeEditor, yamlWriteOptions } from '@octopus/code-editor';
import { parse, stringify } from 'yaml';

import {
  ParameterInputSet,
  PipelineTask,
  PipelineTaskOnError,
  PipelineTaskWorkspace,
  WhenSpec,
  WorkspaceDeclaration,
} from '../../types';
import { inBefore } from './model';

export interface TaskDrawerProps {
  open: boolean;
  task: PipelineTask | undefined;
  isFinally: boolean;
  tasks: PipelineTask[];
  pipelineWorkspaces: WorkspaceDeclaration[];
  onClose: () => void;
  onCommit: (originalName: string, task: PipelineTask) => void;
}

export function TaskDrawer(props: TaskDrawerProps) {
  if (!props.open || !props.task) {
    return (
      <Drawer open={false} onClose={props.onClose} width={520} title="Task" />
    );
  }
  // Re-mount the editor per editing session so its draft initialises cleanly.
  return <TaskDrawerInner {...props} key={props.task.name} />;
}

function TaskDrawerInner({
  task,
  isFinally,
  tasks,
  pipelineWorkspaces,
  onClose,
  onCommit,
}: TaskDrawerProps) {
  const [view, setView] = useState<'UI' | 'YAML'>('UI');
  const [draft, setDraft] = useState<PipelineTask>(() => ({ ...task! }));
  const [yamlText, setYamlText] = useState('');
  const [yamlError, setYamlError] = useState<string | null>(null);

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

  const patch = (next: Partial<PipelineTask>) =>
    setDraft(d => ({ ...d, ...next }));

  const runAfterOptions = useMemo(
    () =>
      tasks
        .filter(t => t.name !== originalName.current)
        .filter(t => !inBefore(originalName.current, t, tasks))
        .map(t => ({ label: t.name, value: t.name })),
    [tasks],
  );

  const executeOrder: 'immediately' | 'runAfter' =
    draft.runAfter?.length ? 'runAfter' : 'immediately';

  const switchView = (next: 'UI' | 'YAML') => {
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

  return (
    <Drawer
      open
      width={560}
      onClose={onClose}
      title={
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <span>{isFinally ? 'Finally Task' : 'Task'}</span>
          <Segmented
            size="small"
            value={view}
            onChange={val => switchView(val as 'UI' | 'YAML')}
            options={['UI', 'YAML']}
          />
        </Space>
      }
    >
      {view === 'YAML' ? (
        <>
          {yamlError && (
            <Typography.Text type="danger">{yamlError}</Typography.Text>
          )}
          <CodeEditor
            value={yamlText}
            onChange={setYamlText}
            options={yamlWriteOptions}
            style={{ height: 'calc(100vh - 160px)' }}
          />
        </>
      ) : (
        <Form layout="vertical" size="small">
          <Form.Item label="Name" required>
            <Input
              value={draft.name}
              onChange={e => patch({ name: e.target.value })}
            />
          </Form.Item>
          <Form.Item label="Display Name">
            <Input
              value={draft.displayName}
              onChange={e => patch({ displayName: e.target.value })}
            />
          </Form.Item>

          {!isFinally && (
            <Form.Item label="Execute Order">
              <Radio.Group
                value={executeOrder}
                onChange={e =>
                  patch({
                    runAfter: e.target.value === 'immediately' ? [] : draft.runAfter || [],
                  })
                }
                optionType="button"
                buttonStyle="solid"
              >
                <Radio.Button value="immediately">Immediately</Radio.Button>
                <Radio.Button value="runAfter">After other tasks</Radio.Button>
              </Radio.Group>
              {executeOrder === 'runAfter' && (
                <Select
                  mode="multiple"
                  style={{ width: '100%', marginTop: 8 }}
                  placeholder="Select tasks to run after"
                  value={draft.runAfter}
                  options={runAfterOptions}
                  onChange={value => patch({ runAfter: value })}
                />
              )}
            </Form.Item>
          )}

          <Collapse
            ghost
            items={[
              {
                key: 'when',
                label: 'When Conditions',
                children: (
                  <WhenForm
                    value={draft.when || []}
                    onChange={when => patch({ when })}
                  />
                ),
              },
              {
                key: 'params',
                label: 'Parameters',
                children: (
                  <ParamsForm
                    value={draft.params || []}
                    onChange={params => patch({ params })}
                  />
                ),
              },
              {
                key: 'workspaces',
                label: 'Workspaces',
                children: (
                  <WorkspaceRefsForm
                    value={draft.workspaces || []}
                    pipelineWorkspaces={pipelineWorkspaces}
                    onChange={workspaces => patch({ workspaces })}
                  />
                ),
              },
              {
                key: 'advanced',
                label: 'Advanced',
                children: (
                  <>
                    <Form.Item label="Timeout">
                      <Input
                        placeholder="e.g. 1h0m0s"
                        value={draft.timeout}
                        onChange={e => patch({ timeout: e.target.value })}
                      />
                    </Form.Item>
                    <Form.Item label="Retries">
                      <InputNumber
                        min={0}
                        value={draft.retries}
                        onChange={value =>
                          patch({ retries: value ?? undefined })
                        }
                      />
                    </Form.Item>
                    <Form.Item label="On Error">
                      <Select
                        allowClear
                        value={draft.onError}
                        onChange={value => patch({ onError: value })}
                        options={[
                          {
                            label: 'Stop and fail',
                            value: PipelineTaskOnError.stopAndFail,
                          },
                          {
                            label: 'Continue',
                            value: PipelineTaskOnError.continue,
                          },
                        ]}
                      />
                    </Form.Item>
                  </>
                ),
              },
            ]}
          />
        </Form>
      )}
    </Drawer>
  );
}

/* ------------------------------------------------------------- subforms */

const OPERATORS = [
  { label: 'in', value: 'in' },
  { label: 'notin', value: 'notin' },
];

function WhenForm({
  value,
  onChange,
}: {
  value: WhenSpec[];
  onChange: (v: WhenSpec[]) => void;
}) {
  const update = (i: number, patch: Partial<WhenSpec>) =>
    onChange(value.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const add = () =>
    onChange([...value, { input: '', operator: 'in', values: [''] }]);

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      {value.map((row, i) => (
        <Space key={i} align="start" wrap>
          <Input
            placeholder="$(params.x) / $(tasks.x.results.y)"
            style={{ width: 200 }}
            value={row.input}
            onChange={e => update(i, { input: e.target.value })}
          />
          <Select
            style={{ width: 90 }}
            options={OPERATORS}
            value={row.operator}
            onChange={operator => update(i, { operator })}
          />
          <Select
            mode="tags"
            style={{ width: 160 }}
            placeholder="values"
            value={row.values?.filter(Boolean)}
            onChange={values => update(i, { values })}
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => remove(i)}
          />
        </Space>
      ))}
      <Button type="dashed" icon={<PlusOutlined />} onClick={add} block>
        Add condition
      </Button>
    </Space>
  );
}

function ParamsForm({
  value,
  onChange,
}: {
  value: ParameterInputSet[];
  onChange: (v: ParameterInputSet[]) => void;
}) {
  const update = (i: number, patch: Partial<ParameterInputSet>) =>
    onChange(value.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const add = () => onChange([...value, { name: '', value: '' }]);

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      {value.map((row, i) => (
        <Space key={i} align="start">
          <Input
            placeholder="name"
            style={{ width: 160 }}
            value={row.name}
            onChange={e => update(i, { name: e.target.value })}
          />
          <Input
            placeholder="value"
            style={{ width: 240 }}
            value={typeof row.value === 'string' ? row.value : ''}
            onChange={e => update(i, { value: e.target.value })}
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => remove(i)}
          />
        </Space>
      ))}
      <Button type="dashed" icon={<PlusOutlined />} onClick={add} block>
        Add parameter
      </Button>
    </Space>
  );
}

function WorkspaceRefsForm({
  value,
  pipelineWorkspaces,
  onChange,
}: {
  value: PipelineTaskWorkspace[];
  pipelineWorkspaces: WorkspaceDeclaration[];
  onChange: (v: PipelineTaskWorkspace[]) => void;
}) {
  const update = (i: number, patch: Partial<PipelineTaskWorkspace>) =>
    onChange(value.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const add = () => onChange([...value, { name: '', workspace: '' }]);

  const wsOptions = pipelineWorkspaces.map(w => ({
    label: w.name,
    value: w.name,
  }));

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      {value.map((row, i) => (
        <Space key={i} align="start">
          <Input
            placeholder="task workspace"
            style={{ width: 150 }}
            value={row.name}
            onChange={e => update(i, { name: e.target.value })}
          />
          <Select
            placeholder="pipeline workspace"
            style={{ width: 170 }}
            value={row.workspace || undefined}
            options={wsOptions}
            onChange={workspace => update(i, { workspace })}
            showSearch
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => remove(i)}
          />
        </Space>
      ))}
      <Button type="dashed" icon={<PlusOutlined />} onClick={add} block>
        Add workspace binding
      </Button>
    </Space>
  );
}

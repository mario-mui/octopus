/*
 * The task form body (design/task-drawer-1/2): Basic Info (name / display name)
 * with a collapsible Advanced settings card (execution conditions, timeout,
 * retries, on-error), then Parameters (descriptor-driven), Workspaces and
 * Results — the latter three driven by the resolved Task's declarations.
 */
import { useMemo, useRef, useState } from 'react';
import { Form, Input, InputNumber, Radio, Select, Space } from 'antd';
import { createStyles } from 'antd-style';
import { FoldableBlock } from '@octopus/console-core-components';
import {
  PipelineTask,
  PipelineTaskOnError,
  Task,
  WorkspaceDeclaration,
} from '../../types';
import { inBefore } from '../orchestration/model';
import { SectionTitle } from './SectionTitle';
import { ExecutionConditions } from './ExecutionConditions';
import { ParametersSection } from './ParametersSection';
import { WorkspaceBindings } from './WorkspaceBindings';
import { ResultsList } from './ResultsList';

export interface TaskFormProps {
  value: PipelineTask;
  onChange: (next: PipelineTask) => void;
  taskResource: Task | null;
  pipelineWorkspaces: WorkspaceDeclaration[];
  /** The pipeline's main tasks — source of the "Run after" candidates. */
  tasks: PipelineTask[];
  /** Finally tasks have no execution order (they always run at the end). */
  isFinally: boolean;
  cluster?: string;
  namespace?: string;
}

const useStyles = createStyles(({ token, css }) => ({
  field: css`
    margin-bottom: 16px;
  `,
  hint: css`
    margin-top: 4px;
    font-size: 12px;
    color: ${token.colorTextSecondary};
  `,
}));

export function TaskForm({
  value,
  onChange,
  taskResource,
  pipelineWorkspaces,
  tasks,
  isFinally,
  cluster,
  namespace,
}: TaskFormProps) {
  const { styles } = useStyles();

  const patch = (next: Partial<PipelineTask>) => onChange({ ...value, ...next });

  // Execution order: "Immediately" (no runAfter) vs "Run after" (the selected
  // upstream tasks). Toggling to "Immediately" parks the current selection so
  // switching back restores it (mirrors the Angular orderCache).
  const [executeOrder, setExecuteOrder] = useState<'immediately' | 'runAfter'>(
    value.runAfter?.length ? 'runAfter' : 'immediately',
  );
  const orderCache = useRef<string[]>(value.runAfter ?? []);
  const changeOrder = (order: 'immediately' | 'runAfter') => {
    setExecuteOrder(order);
    if (order === 'immediately') {
      orderCache.current = value.runAfter ?? [];
      patch({ runAfter: [] });
    } else {
      patch({ runAfter: orderCache.current });
    }
  };

  // Candidates: every other task that doesn't already run before this one
  // (so a selection can't introduce a cycle).
  const runAfterNames = useMemo(
    () =>
      tasks
        .filter(t => t.name !== value.name && !inBefore(value.name, t, tasks))
        .map(t => t.name),
    [tasks, value.name],
  );

  return (
    <Form layout="vertical">
      <SectionTitle>Basic Info</SectionTitle>
      <Form.Item label="Name" required className={styles.field}>
        <Input value={value.name} onChange={e => patch({ name: e.target.value })} />
      </Form.Item>
      <Form.Item label="Display Name" className={styles.field}>
        <Input
          value={value.displayName}
          onChange={e => patch({ displayName: e.target.value })}
        />
      </Form.Item>

      <FoldableBlock label="Advanced settings">
          <Form.Item label="Execution Conditions" className={styles.field}>
            <ExecutionConditions
              value={value.when ?? []}
              onChange={when => patch({ when })}
            />
          </Form.Item>
          {!isFinally ? (
            <>
              <Form.Item label="Execution Order" className={styles.field}>
                <Radio.Group
                  value={executeOrder}
                  onChange={e => changeOrder(e.target.value)}
                >
                  <Radio value="immediately">Execute immediately</Radio>
                  <Radio value="runAfter">Run after</Radio>
                </Radio.Group>
              </Form.Item>
              {executeOrder === 'runAfter' ? (
                <Form.Item className={styles.field}>
                  <Select
                    mode="multiple"
                    style={{ width: '100%' }}
                    placeholder="Select the tasks to run after"
                    value={value.runAfter ?? []}
                    onChange={runAfter => patch({ runAfter })}
                    options={runAfterNames.map(n => ({ label: n, value: n }))}
                    notFoundContent="No data"
                  />
                </Form.Item>
              ) : null}
            </>
          ) : null}
          <Form.Item label="Timeout" className={styles.field}>
            <Space.Compact style={{ width: '100%' }}>
              <Input
                placeholder="e.g. 1h0m0s"
                value={value.timeout}
                onChange={e => patch({ timeout: e.target.value })}
              />
              <Input style={{ width: 90 }} disabled value="Minutes" />
            </Space.Compact>
            <div className={styles.hint}>
              The maximum execution time of the task, with 0 indicating unlimited time
            </div>
          </Form.Item>
          <Form.Item label="Retry Attempts" className={styles.field}>
            <Space.Compact style={{ width: '100%' }}>
              <InputNumber
                min={0}
                style={{ flex: 1 }}
                value={value.retries}
                onChange={v => patch({ retries: v ?? undefined })}
              />
              <Input style={{ width: 90 }} disabled value="Times" />
            </Space.Compact>
            <div className={styles.hint}>
              The number of retries when the task execution fails
            </div>
          </Form.Item>
          <Form.Item label="On Error" className={styles.field}>
            <Select
              allowClear
              style={{ width: '100%' }}
              value={value.onError}
              onChange={v => patch({ onError: v })}
              options={[
                { label: 'Stop and fail', value: PipelineTaskOnError.stopAndFail },
                { label: 'Continue', value: PipelineTaskOnError.continue },
              ]}
            />
          </Form.Item>
      </FoldableBlock>

      <SectionTitle>Parameters</SectionTitle>
      <ParametersSection
        taskResource={taskResource}
        cluster={cluster}
        namespace={namespace}
        value={value.params ?? []}
        onChange={params => patch({ params })}
      />

      <SectionTitle>Workspaces</SectionTitle>
      <WorkspaceBindings
        taskWorkspaces={taskResource?.spec?.workspaces ?? []}
        pipelineWorkspaces={pipelineWorkspaces}
        value={value.workspaces ?? []}
        onChange={workspaces => patch({ workspaces })}
      />

      <SectionTitle>Results</SectionTitle>
      <ResultsList taskName={value.name} results={taskResource?.spec?.results ?? []} />
    </Form>
  );
}

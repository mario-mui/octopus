/*
 * The task tree on the left of the Tasks tab (design/pipelineRun-detail.png).
 * A custom (non-AntD-Tree) list so each row can show a status glyph, the name,
 * a right-aligned duration and an expand caret exactly like the console.
 *
 * Tasks are the top level; their TaskRun steps are the expandable children.
 * Selecting a task surfaces its params/workspaces/results; selecting a step
 * surfaces that step's logs — the parent owns that switch via `onSelect`.
 */
import { useState } from 'react';
import { Empty, Spin } from 'antd';
import { createStyles } from 'antd-style';
import { DownOutlined, RightOutlined } from '@ant-design/icons';
import { RunStatusIcon } from '../RunStatusIcon';
import {
  getPhaseFromConditions,
  getStepPhase,
  getStepTimes,
  humanizeDuration,
} from '../../utils/pipelineRunStatus';
import type { StepNode, TaskNode } from './buildTaskTree';

export type TreeSelection =
  | { kind: 'task'; node: TaskNode }
  | { kind: 'step'; node: StepNode };

export interface TaskTreeProps {
  nodes: TaskNode[];
  /** Currently selected node id (task id or step id). */
  selectedId?: string;
  onSelect: (selection: TreeSelection) => void;
  loading?: boolean;
}

const useStyles = createStyles(({ token, css }) => ({
  root: css`
    width: 280px;
    flex: 0 0 auto;
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: ${token.borderRadius}px;
    padding: 8px;
    overflow: auto;
  `,
  row: css`
    display: flex;
    align-items: center;
    gap: 4px;
    height: 36px;
    padding: 0 8px;
    border-radius: ${token.borderRadiusSM}px;
    cursor: pointer;
    user-select: none;
    &:hover {
      background: ${token.colorFillTertiary};
    }
  `,
  rowSelected: css`
    background: ${token.colorPrimaryBg};
    &:hover {
      background: ${token.colorPrimaryBg};
    }
  `,
  stepRow: css`
    padding-left: 28px;
  `,
  name: css`
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  duration: css`
    flex: 0 0 auto;
    color: ${token.colorTextSecondary};
    font-size: 12px;
  `,
  caret: css`
    flex: 0 0 auto;
    width: 16px;
    color: ${token.colorTextTertiary};
    font-size: 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  `,
  caretSpacer: css`
    flex: 0 0 auto;
    width: 16px;
  `,
}));

export function TaskTree({
  nodes,
  selectedId,
  onSelect,
  loading,
}: TaskTreeProps) {
  const { styles, cx } = useStyles();
  // Tasks start expanded (matching the design); collapse is per-task.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  if (loading && nodes.length === 0) {
    return (
      <div className={styles.root}>
        <Spin />
      </div>
    );
  }
  if (nodes.length === 0) {
    return (
      <div className={styles.root}>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No tasks" />
      </div>
    );
  }

  const toggle = (id: string) =>
    setCollapsed(c => ({ ...c, [id]: !c[id] }));

  return (
    <div className={styles.root}>
      {nodes.map(task => {
        const taskPhase = getPhaseFromConditions(task.taskRun?.status?.conditions);
        const isOpen = !collapsed[task.id] && task.steps.length > 0;
        return (
          <div key={task.id}>
            <div
              className={cx(
                styles.row,
                selectedId === task.id && styles.rowSelected,
              )}
              onClick={() => onSelect({ kind: 'task', node: task })}
            >
              <span
                className={styles.caret}
                onClick={e => {
                  e.stopPropagation();
                  if (task.steps.length) {
                    toggle(task.id);
                  }
                }}
              >
                {task.steps.length ? (
                  isOpen ? (
                    <DownOutlined />
                  ) : (
                    <RightOutlined />
                  )
                ) : null}
              </span>
              <RunStatusIcon phase={taskPhase} size={15} />
              <span className={styles.name} title={task.name}>
                {task.name}
              </span>
              <span className={styles.duration}>
                {humanizeDuration(
                  task.taskRun?.status?.startTime,
                  task.taskRun?.status?.completionTime,
                )}
              </span>
            </div>
            {isOpen &&
              task.steps.map(step => {
                const { start, end } = getStepTimes(step.step);
                return (
                  <div
                    key={step.id}
                    className={cx(
                      styles.row,
                      styles.stepRow,
                      selectedId === step.id && styles.rowSelected,
                    )}
                    onClick={() => onSelect({ kind: 'step', node: step })}
                  >
                    <span className={styles.caretSpacer} />
                    <RunStatusIcon phase={getStepPhase(step.step)} size={14} />
                    <span className={styles.name} title={step.name}>
                      {step.name}
                    </span>
                    <span className={styles.duration}>
                      {humanizeDuration(start, end)}
                    </span>
                  </div>
                );
              })}
          </div>
        );
      })}
    </div>
  );
}

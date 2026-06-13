/*
 * Node renderers for the orchestration canvas, registered with <Topology> by
 * node `type`. Styled after design/pipeline-orc.png: task cards (name on top, a
 * colour-chipped task-type label below), gray square insert buttons on the node
 * edges, an error border on invalid/cyclic nodes, and a "Finally" group.
 *
 * Styling uses antd-style `createStyles` with theme tokens, so it follows the
 * active light/dark theme. Only genuinely dynamic geometry (per-placement bridge
 * offsets) and the per-task brand colour are inlined.
 */
import { CSSProperties, useState } from 'react';
import { Tooltip } from 'antd';
import { createStyles } from 'antd-style';
import { PlusOutlined, CloseOutlined } from '@ant-design/icons';
import { Direction, type NodeRenderProps } from '@octopus/topology';

import { PipelineTask } from '../../types';
import { InsertKind } from './model';
import { getTaskMeta } from './mockTasks';
import { useOrchestration } from './OrchestrationContext';
import { TektonIcon } from '../TektonIcon';
import { getTaskIcon } from '../taskMeta';

type Placement = 'left' | 'right' | 'top' | 'bottom';

const BRIDGE = 27;

const useStyles = createStyles(({ token, css }) => ({
  root: css`
    position: relative;
    width: 100%;
    height: 100%;
  `,
  card: css`
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    border: 1px solid ${token.colorBorder};
    border-radius: ${token.borderRadiusLG}px;
    background: ${token.colorBgContainer};
    box-shadow: ${token.boxShadowTertiary};
    cursor: pointer;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: border-color 0.15s, box-shadow 0.15s;
  `,
  cardHover: css`
    border-color: ${token.colorPrimaryBorderHover};
  `,
  cardSelected: css`
    border-color: ${token.colorPrimary};
    box-shadow: 0 0 0 2px ${token.controlOutline};
  `,
  cardError: css`
    border-color: ${token.colorError};
  `,
  cardTitle: css`
    flex: 1;
    display: flex;
    align-items: center;
    padding: 0 12px;
    font-weight: 600;
    font-size: ${token.fontSize}px;
    color: ${token.colorText};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  cardLabel: css`
    border-top: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorFillQuaternary};
    padding: 7px 12px;
  `,
  chip: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  `,
  chipLabel: css`
    font-size: ${token.fontSizeSM}px;
    color: ${token.colorTextSecondary};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  deleteBtn: css`
    position: absolute;
    top: -9px;
    right: -9px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 1px solid ${token.colorBgContainer};
    background: ${token.colorError};
    color: ${token.colorTextLightSolid};
    font-size: 10px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 4;
  `,
  bridge: css`
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 3;
  `,
  square: css`
    width: 18px;
    height: 18px;
    border-radius: ${token.borderRadiusSM}px;
    background: ${token.colorTextTertiary};
    color: ${token.colorTextLightSolid};
    font-size: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s;
    &:hover {
      background: ${token.colorPrimary};
    }
  `,
  placeholder: css`
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    border: 1px dashed ${token.colorPrimary};
    border-radius: ${token.borderRadiusLG}px;
    background: ${token.colorPrimaryBg};
    color: ${token.colorPrimary};
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: ${token.fontSize}px;
  `,
  spacerRoot: css`
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  `,
  spacerHit: css`
    position: absolute;
    width: 28px;
    height: 28px;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    align-items: center;
    justify-content: center;
  `,
  spacerDot: css`
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${token.colorTextTertiary};
  `,
  finallyBox: css`
    position: relative;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    border: 1px dashed ${token.colorBorder};
    border-radius: ${token.borderRadius * 2}px;
    background: ${token.colorFillQuaternary};
    pointer-events: none;
  `,
  finallyLabel: css`
    position: absolute;
    top: -11px;
    left: 12px;
    font-size: ${token.fontSizeSM}px;
    line-height: 20px;
    color: ${token.colorTextSecondary};
    background: ${token.colorFillSecondary};
    border-radius: ${token.borderRadiusSM}px;
    padding: 0 8px;
    pointer-events: none;
  `,
  finallyAddBtn: css`
    position: absolute;
    bottom: 10px;
    left: 50%;
    transform: translateX(-50%);
    width: 18px;
    height: 18px;
    border-radius: ${token.borderRadiusSM}px;
    border: none;
    background: ${token.colorTextTertiary};
    color: ${token.colorTextLightSolid};
    font-size: 10px;
    cursor: pointer;
    pointer-events: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s;
    &:hover {
      background: ${token.colorPrimary};
    }
  `,
}));

const BRIDGE_GEOMETRY: Record<Placement, CSSProperties> = {
  left: {
    right: '100%',
    top: '50%',
    marginTop: -BRIDGE / 2,
    width: BRIDGE,
    height: BRIDGE,
    justifyContent: 'flex-start',
  },
  right: {
    left: '100%',
    top: '50%',
    marginTop: -BRIDGE / 2,
    width: BRIDGE,
    height: BRIDGE,
    justifyContent: 'flex-end',
  },
  top: {
    bottom: '100%',
    left: '50%',
    marginLeft: -BRIDGE / 2,
    width: BRIDGE,
    height: BRIDGE,
    alignItems: 'flex-start',
  },
  bottom: {
    top: '100%',
    left: '50%',
    marginLeft: -BRIDGE / 2,
    width: BRIDGE,
    height: BRIDGE,
    alignItems: 'flex-end',
  },
};

// The visible 18px square sits BRIDGE px from the node, but the clickable area
// is a transparent box that touches the node edge (right/left/top: 100%) so the
// hover region stays continuous — no gap to fall through before clicking.
function InsertButton({
  placement,
  title,
  onClick,
}: {
  placement: Placement;
  title: string;
  onClick: () => void;
}) {
  const { styles } = useStyles();
  return (
    <Tooltip title={title}>
      <div
        className={styles.bridge}
        style={BRIDGE_GEOMETRY[placement]}
        onClick={e => {
          e.stopPropagation();
          onClick();
        }}
      >
        <span className={styles.square}>
          <PlusOutlined />
        </span>
      </div>
    </Tooltip>
  );
}

function TypeChip({ task }: { task?: PipelineTask }) {
  const { styles } = useStyles();
  const { taskResources } = useOrchestration();
  const meta = getTaskMeta(task?.taskRef?.name);
  const resolved = task ? taskResources[task.name] : null;
  return (
    <span className={styles.chip}>
      <TektonIcon
        src={getTaskIcon(resolved)}
        name={meta.label}
        color={meta.color}
        size={16}
      />
      <span className={styles.chipLabel} title={meta.label}>
        {meta.label}
      </span>
    </span>
  );
}

export function TaskNode({
  node,
  hovered,
  selected,
  isCycle,
  direction,
}: NodeRenderProps) {
  const { styles, cx } = useStyles();
  const { allTasks, select, insert, remove } = useOrchestration();
  const isFinally = node.type === 'DEFAULT_FINALLY_NODE';
  const task = allTasks.find(t => t.name === node.id);
  const isTB = direction === Direction.TOP_TO_BOTTOM;

  const error = isCycle || !!node.state?.error;
  const showInsert = hovered && !isFinally && !isCycle;

  return (
    <div
      className={styles.root}
      // Press on a node selects it — don't let it start a canvas pan.
      onPointerDown={e => e.stopPropagation()}
    >
      <div
        className={cx(
          styles.card,
          error
            ? styles.cardError
            : selected
              ? styles.cardSelected
              : hovered
                ? styles.cardHover
                : undefined,
        )}
        onClick={e => {
          e.stopPropagation();
          select({ id: node.id, isFinally });
        }}
      >
        <div className={styles.cardTitle} title={task?.displayName || node.id}>
          {task?.displayName || node.id}
        </div>
        <div className={styles.cardLabel}>
          <TypeChip task={task} />
        </div>
      </div>

      {hovered && !isCycle && (
        <Tooltip title="Delete">
          <button
            type="button"
            className={styles.deleteBtn}
            onClick={e => {
              e.stopPropagation();
              remove(node.id, isFinally);
            }}
          >
            <CloseOutlined />
          </button>
        </Tooltip>
      )}

      {showInsert && (
        <>
          <InsertButton
            title="Insert before"
            placement={isTB ? 'top' : 'left'}
            onClick={() => insert(InsertKind.Before, node.id)}
          />
          <InsertButton
            title="Insert after"
            placement={isTB ? 'bottom' : 'right'}
            onClick={() => insert(InsertKind.After, node.id)}
          />
          <InsertButton
            title="Insert parallel"
            placement={isTB ? 'right' : 'bottom'}
            onClick={() => insert(InsertKind.Parallel, node.id)}
          />
        </>
      )}
    </div>
  );
}

function Placeholder({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  const { styles } = useStyles();
  return (
    <div
      className={styles.placeholder}
      onClick={e => {
        e.stopPropagation();
        onClick();
      }}
      onPointerDown={e => e.stopPropagation()}
    >
      <PlusOutlined />
      {label}
    </div>
  );
}

export function EmptyTaskNode(_props: NodeRenderProps) {
  const { insertFirstTask } = useOrchestration();
  return <Placeholder label="Task" onClick={insertFirstTask} />;
}

export function EmptyFinallyNode(_props: NodeRenderProps) {
  const { addFinally } = useOrchestration();
  return <Placeholder label="Finally" onClick={addFinally} />;
}

export function SpacerNode({ node }: NodeRenderProps) {
  const { styles } = useStyles();
  const { insertAtSpacer } = useOrchestration();
  // The spacer's layout box is 1px, so it is effectively un-hoverable via the
  // engine's hover state — track hover locally on the enlarged hit area instead.
  const [hovered, setHovered] = useState(false);
  return (
    <div className={styles.spacerRoot}>
      <div
        className={styles.spacerHit}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {hovered ? (
          <Tooltip title="Insert task here">
            <span
              className={styles.square}
              onClick={e => {
                e.stopPropagation();
                insertAtSpacer(node.id);
              }}
              onPointerDown={e => e.stopPropagation()}
            >
              <PlusOutlined />
            </span>
          </Tooltip>
        ) : (
          <span className={styles.spacerDot} />
        )}
      </div>
    </div>
  );
}

export function FinallyGroup(_props: NodeRenderProps) {
  const { styles } = useStyles();
  const { orchestration, addFinally } = useOrchestration();
  const hasFinally = !!orchestration.finally?.length;
  return (
    <div className={styles.finallyBox}>
      <span className={styles.finallyLabel}>Finally</span>
      {hasFinally && (
        <button
          type="button"
          className={styles.finallyAddBtn}
          onClick={e => {
            e.stopPropagation();
            addFinally();
          }}
          onPointerDown={e => e.stopPropagation()}
        >
          <PlusOutlined />
        </button>
      )}
    </div>
  );
}

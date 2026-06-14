/*
 * The combined cluster + namespace selector, the React/Ant Design port of the
 * console's `acl-cluster-namespace-selector` (see
 * design/cluster-namespace-selector.png):
 *
 *  - a trigger pill with two segments — `Cluster: <name>` and
 *    `Namespace: <name>` — and a caret; idle it blends into its header,
 *    hover / open it fills primary with white text;
 *  - a popup card with a cluster dropdown on top (hidden when the cluster is
 *    fixed) and, below, the cluster's namespaces (see NamespaceList).
 *
 * Controlled: the caller owns the `{ cluster, namespace }` value and gets an
 * `onChange` when the user commits a namespace. The cluster list is derived
 * from the `project` — its detail's `spec.clusters` (`useProjectClusters`),
 * matching the console; the namespaces are loaded per active cluster
 * (`useNamespaces`). Alternatively pass a fixed `cluster` to pin it — then the
 * cluster dropdown is hidden and `project` isn't needed.
 */
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Popover, Select, Switch, Tooltip } from 'antd';
import { createStyles } from 'antd-style';
import {
  CaretDownOutlined,
  ClusterOutlined,
  DeploymentUnitOutlined,
  LockFilled,
  LockOutlined,
  UnlockOutlined,
} from '@ant-design/icons';
import { useProjectClusters } from './useProjectClusters';
import { useNamespaces } from './useNamespaces';
import { NamespaceList } from './NamespaceList';
import { ClusterNamespaceValue } from './types';

export interface ClusterNamespaceSelectorProps {
  /**
   * The project whose clusters the selector offers (its `spec.clusters`).
   * Not needed when a fixed `cluster` is given.
   */
  project?: string;
  /** The active `{ cluster, namespace }` selection. */
  value?: ClusterNamespaceValue;
  /** Called when the user commits a namespace (with its cluster). */
  onChange?: (value: ClusterNamespaceValue) => void;
  /** Pin the selector to this cluster; its dropdown is then hidden. */
  cluster?: string;
  /** Disable the trigger (the popup can't be opened). */
  disabled?: boolean;
  /**
   * Whether the current selection is "locked" — persisted across pages/reloads.
   * Pass together with {@link onLockChange} to surface the lock toggle (usually
   * wired to `usePersistentClusterNamespace`). When omitted the lock UI is
   * hidden.
   */
  locked?: boolean;
  /** Called when the user toggles the lock. Presence reveals the lock control. */
  onLockChange?: (locked: boolean) => void;
}

const useStyles = createStyles(({ token, css }) => ({
  trigger: css`
    display: inline-flex;
    align-items: center;
    height: ${token.controlHeight}px;
    padding: 0 8px;
    border-radius: ${token.borderRadiusSM}px;
    color: ${token.colorText};
    cursor: pointer;
    user-select: none;
    transition: background 0.2s, color 0.2s;

    &:hover {
      background: ${token.colorPrimary};
      color: ${token.colorWhite};
    }
  `,
  triggerOpen: css`
    background: ${token.colorPrimary};
    color: ${token.colorWhite};
  `,
  triggerDisabled: css`
    cursor: not-allowed;
    opacity: 0.6;
    &:hover {
      background: transparent;
      color: ${token.colorText};
    }
  `,
  segment: css`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-right: 10px;
    max-width: 270px;
    font-size: 12px;

    @media screen and (max-width: 1280px) {
      max-width: 178px;
      margin-right: 8px;
    }
  `,
  segmentIcon: css`
    flex: 0 0 auto;
    font-size: 16px;
  `,
  segmentLabel: css`
    flex: 0 0 auto;
    font-weight: 500;
    &::after {
      content: ':';
      margin-left: 2px;
    }
  `,
  segmentValue: css`
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  caret: css`
    flex: 0 0 auto;
    font-size: 12px;
  `,
  lockBadge: css`
    flex: 0 0 auto;
    margin-right: 8px;
    font-size: 13px;
  `,

  panel: css`
    width: 560px;
  `,
  // A single header row: cluster select on the left, lock control pushed to the
  // right, one divider underneath before the namespace list.
  headerRow: css`
    display: flex;
    align-items: center;
    gap: 12px;
    padding-bottom: 16px;
    margin-bottom: 16px;
    border-bottom: 1px solid ${token.colorBorderSecondary};
  `,
  clusterField: css`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  `,
  clusterLabel: css`
    font-weight: 500;
    white-space: nowrap;
    &::after {
      content: ':';
      margin-left: 2px;
    }
  `,
  clusterSelect: css`
    width: 220px;
  `,
  // Pushed to the right edge of the header row.
  lockControl: css`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-left: auto;
    color: ${token.colorTextSecondary};
    font-size: 13px;
    white-space: nowrap;
  `,
  lockLabel: css`
    font-weight: 500;
  `,
  lockHintIcon: css`
    flex: 0 0 auto;
    font-size: 15px;
  `,
}));

/** A `Cluster: <value>` / `Namespace: <value>` trigger segment. */
function Segment({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  const { styles } = useStyles();
  return (
    <span className={styles.segment}>
      <span className={styles.segmentIcon}>{icon}</span>
      <span className={styles.segmentLabel}>{label}</span>
      <span className={styles.segmentValue}>{value || '-'}</span>
    </span>
  );
}

export function ClusterNamespaceSelector({
  project,
  value,
  onChange,
  cluster: fixedCluster,
  disabled = false,
  locked = false,
  onLockChange,
}: ClusterNamespaceSelectorProps) {
  const { styles, cx } = useStyles();
  const clusters = useProjectClusters(project);
  const [open, setOpen] = useState(false);

  // The cluster whose namespaces the popup is showing. Driven by the fixed
  // cluster, else the committed selection, else the project's first cluster.
  const [activeCluster, setActiveCluster] = useState('');
  useEffect(() => {
    const next = fixedCluster || value?.cluster || clusters[0] || '';
    setActiveCluster(next);
  }, [fixedCluster, value?.cluster, clusters]);

  const { namespaces, loading } = useNamespaces(project, activeCluster);

  // When the caller provides no selection, default once to the first cluster +
  // first namespace and emit it (mirrors the console's init auto-select). The
  // ref keeps it a one-shot so manual browsing in the popup isn't overridden;
  // it re-arms when the project changes.
  const didAutoSelect = useRef(false);
  useEffect(() => {
    didAutoSelect.current = false;
  }, [project]);
  useEffect(() => {
    if (didAutoSelect.current) {
      return;
    }
    if (value?.cluster && value?.namespace) {
      didAutoSelect.current = true;
      return;
    }
    if (loading || !activeCluster || !namespaces.length) {
      return;
    }
    didAutoSelect.current = true;
    onChange?.({
      cluster: activeCluster,
      namespace: namespaces[0].metadata?.name ?? '',
    });
  }, [value?.cluster, value?.namespace, loading, activeCluster, namespaces, onChange]);

  const clusterReadonly = !!fixedCluster;
  const clusterOptions = useMemo(
    () => clusters.map(name => ({ label: name, value: name })),
    [clusters],
  );

  // The committed namespace only belongs to the committed cluster.
  const selectedNamespace =
    value && value.cluster === activeCluster ? value.namespace : '';

  const onSelectNamespace = (namespace: string) => {
    onChange?.({ cluster: activeCluster, namespace });
    setOpen(false);
  };

  // The lock control only makes sense once a full selection exists.
  const hasSelection = !!(fixedCluster || value?.cluster) && !!value?.namespace;
  const showLock = !!onLockChange;

  const trigger = (
    <div
      role="button"
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-disabled={disabled}
      className={cx(
        styles.trigger,
        open && styles.triggerOpen,
        disabled && styles.triggerDisabled,
      )}
    >
      <Segment
        icon={<ClusterOutlined />}
        label="Cluster"
        value={fixedCluster || value?.cluster || ''}
      />
      <Segment
        icon={<DeploymentUnitOutlined />}
        label="Namespace"
        value={value?.namespace ?? ''}
      />
      {locked && (
        <Tooltip title="Cluster / namespace locked">
          <LockFilled className={styles.lockBadge} />
        </Tooltip>
      )}
      <CaretDownOutlined className={styles.caret} />
    </div>
  );

  if (disabled) {
    return trigger;
  }

  return (
    <Popover
      trigger="click"
      placement="bottomLeft"
      arrow={false}
      open={open}
      onOpenChange={setOpen}
      styles={{ body: { padding: '20px' } }}
      content={
        <div className={styles.panel}>
          {(!clusterReadonly || showLock) && (
            <div className={styles.headerRow}>
              {clusterReadonly ? null : (
                <span className={styles.clusterField}>
                  <span className={styles.clusterLabel}>Cluster</span>
                  <Select
                    className={styles.clusterSelect}
                    value={activeCluster || undefined}
                    options={clusterOptions}
                    onChange={setActiveCluster}
                    placeholder="Select cluster"
                    showSearch
                    optionFilterProp="label"
                  />
                </span>
              )}
              {showLock && (
                <Tooltip title="Locked selections are kept across pages and reloads">
                  <span className={styles.lockControl}>
                    {locked ? (
                      <LockOutlined className={styles.lockHintIcon} />
                    ) : (
                      <UnlockOutlined className={styles.lockHintIcon} />
                    )}
                    <span className={styles.lockLabel}>
                      {locked ? 'Locked' : 'Lock'}
                    </span>
                    <Switch
                      size="small"
                      checked={locked}
                      disabled={!locked && !hasSelection}
                      onChange={onLockChange}
                    />
                  </span>
                </Tooltip>
              )}
            </div>
          )}
          <NamespaceList
            namespaces={namespaces}
            value={selectedNamespace}
            loading={loading}
            onSelect={onSelectNamespace}
          />
        </div>
      }
    >
      {trigger}
    </Popover>
  );
}

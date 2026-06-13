/*
 * Task picker — the React port of the console's select-task dialog
 * (design/select-task.png): a filter bar (Source / Category / Platform prefix
 * selects + a name search), a scrollable list of task cards on the left, and a
 * tabbed detail pane on the right with a Select button. The catalog is the
 * union of the namespace's Tasks and the Tekton Hub (see fetchTaskCatalog).
 */
import { useEffect, useMemo, useState } from 'react';
import { Empty, Input, Modal, Select, Spin } from 'antd';
import { createStyles } from 'antd-style';
import { useApi, fetchApiRef } from '@octopus/core-plugin-api';
import { K8sApi } from '@octopus/console-core-common';
import { TektonResourceRef } from '../../types';
import { TektonIcon } from '../TektonIcon';
import { CatalogTask, fetchTaskCatalog } from './taskCatalog';
import { TaskDetailPanel } from './TaskDetailPanel';

const ALL = '__all__';

export interface SelectTaskProps {
  open: boolean;
  cluster?: string;
  namespace?: string;
  onCancel: () => void;
  onSelect: (taskRef: TektonResourceRef) => void;
}

const useStyles = createStyles(({ token, css }) => ({
  filters: css`
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
  `,
  filter: css`
    width: 200px;
  `,
  prefixLabel: css`
    color: ${token.colorTextTertiary};
  `,
  search: css`
    flex: 1;
  `,
  body: css`
    display: flex;
    gap: 16px;
    height: 600px;
  `,
  list: css`
    width: 300px;
    flex: 0 0 300px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-right: 4px;
  `,
  card: css`
    display: flex;
    gap: 10px;
    padding: 10px 12px;
    border: 1px solid ${token.colorBorder};
    border-radius: ${token.borderRadiusLG}px;
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s;
    &:hover {
      border-color: ${token.colorPrimary};
    }
  `,
  cardSelected: css`
    border-color: ${token.colorPrimary};
    background: ${token.colorPrimaryBg};
  `,
  cardBody: css`
    min-width: 0;
  `,
  cardName: css`
    font-weight: 500;
    color: ${token.colorText};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  cardDesc: css`
    font-size: 12px;
    color: ${token.colorTextSecondary};
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  `,
  detail: css`
    flex: 1;
    min-width: 0;
    border-left: 1px solid ${token.colorBorderSecondary};
    padding-left: 16px;
    overflow-y: auto;
  `,
  loading: css`
    height: 600px;
    display: flex;
    align-items: center;
    justify-content: center;
  `,
}));

export function SelectTask({
  open,
  cluster,
  namespace,
  onCancel,
  onSelect,
}: SelectTaskProps) {
  const { styles, cx } = useStyles();
  const k8sApi = useApi(K8sApi);
  const fetchApi = useApi(fetchApiRef);

  const [tasks, setTasks] = useState<CatalogTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<CatalogTask | null>(null);
  const [keyword, setKeyword] = useState('');
  const [source, setSource] = useState(ALL);
  const [category, setCategory] = useState(ALL);
  const [platform, setPlatform] = useState(ALL);

  // Load the catalog (namespace Tasks + hub) while open.
  useEffect(() => {
    if (!open) {
      return;
    }
    let ignore = false;
    setLoading(true);
    fetchTaskCatalog(k8sApi, fetchApi.fetch, cluster, namespace)
      .then(next => {
        if (!ignore) {
          setTasks(next);
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, [open, cluster, namespace, k8sApi, fetchApi]);

  const categoryOptions = useMemo(
    () => Array.from(new Set(tasks.flatMap(t => t.categories))),
    [tasks],
  );
  const platformOptions = useMemo(
    () => Array.from(new Set(tasks.flatMap(t => t.platforms))),
    [tasks],
  );

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return tasks.filter(task => {
      if (source !== ALL && task.source !== source) {
        return false;
      }
      if (kw) {
        const hay = `${task.name} ${task.displayName} ${task.description}`.toLowerCase();
        if (!hay.includes(kw)) {
          return false;
        }
      }
      if (category !== ALL && !task.categories.includes(category)) {
        return false;
      }
      if (platform !== ALL && !task.platforms.includes(platform)) {
        return false;
      }
      return true;
    });
  }, [tasks, source, keyword, category, platform]);

  // Keep a valid selection as the filtered list changes.
  useEffect(() => {
    if (!filtered.length) {
      setSelected(null);
    } else if (!selected || !filtered.some(t => t.key === selected.key)) {
      setSelected(filtered[0]);
    }
  }, [filtered, selected]);

  const confirm = () => {
    if (selected) {
      onSelect(selected.taskRef);
    }
  };

  return (
    <Modal
      open={open}
      title="Select Task"
      width={1080}
      footer={null}
      onCancel={onCancel}
      destroyOnHidden
    >
      <div className={styles.filters}>
        <Select
          className={styles.filter}
          prefix={<span className={styles.prefixLabel}>Source:</span>}
          value={source}
          onChange={setSource}
          options={[
            { label: 'All', value: ALL },
            { label: 'Namespace', value: 'namespace' },
            { label: 'Hub', value: 'hub' },
          ]}
        />
        <Select
          className={styles.filter}
          prefix={<span className={styles.prefixLabel}>Category:</span>}
          value={category}
          onChange={setCategory}
          options={[
            { label: 'All', value: ALL },
            ...categoryOptions.map(c => ({ label: c, value: c })),
          ]}
        />
        <Select
          className={styles.filter}
          prefix={<span className={styles.prefixLabel}>Platform:</span>}
          value={platform}
          onChange={setPlatform}
          options={[
            { label: 'All', value: ALL },
            ...platformOptions.map(p => ({ label: p, value: p })),
          ]}
        />
        <Input.Search
          className={styles.search}
          allowClear
          placeholder="Filter by task name"
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
        />
      </div>

      {loading ? (
        <div className={styles.loading}>
          <Spin />
        </div>
      ) : (
        <div className={styles.body}>
          <div className={styles.list}>
            {filtered.length ? (
              filtered.map(task => (
                <div
                  key={task.key}
                  className={cx(styles.card, task === selected && styles.cardSelected)}
                  onClick={() => setSelected(task)}
                >
                  <TektonIcon
                    src={task.icon}
                    name={task.displayName}
                    color={task.color}
                    size={28}
                  />
                  <div className={styles.cardBody}>
                    <div className={styles.cardName}>{task.displayName}</div>
                    <div className={styles.cardDesc}>{task.description}</div>
                  </div>
                </div>
              ))
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No tasks found"
              />
            )}
          </div>
          <div className={styles.detail}>
            {selected ? (
              <TaskDetailPanel task={selected} onSelect={confirm} />
            ) : null}
          </div>
        </div>
      )}
    </Modal>
  );
}

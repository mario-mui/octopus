/*
 * Task picker — the React equivalent of the console's select-task dialog. Lists
 * Tekton Tasks in the current cluster/namespace (free-text searchable) and
 * returns a `TektonResourceRef`; also supports typing a custom Task name so the
 * editor is usable without a live catalog.
 */
import { useCallback, useEffect, useState } from 'react';
import { Input, List, Modal, Spin, Tabs, Empty, Typography } from 'antd';
import { useApi } from '@octopus/core-plugin-api';
import { K8sApi, K8sUtil } from '@octopus/console-core-common';

import { TASK_DEFINITION } from '../../api/pipelineApi';
import { Task, TektonResourceRef, TektonResourceRefKind } from '../../types';
import { MOCK_TASKS } from './mockTasks';

export interface SelectTaskModalProps {
  open: boolean;
  cluster?: string;
  namespace?: string;
  onCancel: () => void;
  onSelect: (taskRef: TektonResourceRef) => void;
}

export function SelectTaskModal({
  open,
  cluster,
  namespace,
  onCancel,
  onSelect,
}: SelectTaskModalProps) {
  const k8sApi = useApi(K8sApi);
  const k8sUtil = useApi(K8sUtil);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [custom, setCustom] = useState('');

  const load = useCallback(
    (signal?: AbortSignal) => {
      if (!open) {
        return;
      }
      // No cluster context (e.g. the dev harness): use the demo catalog.
      if (!cluster) {
        setTasks(MOCK_TASKS);
        return;
      }
      setLoading(true);
      k8sApi
        .listResource<Task>({ cluster, namespace, definition: TASK_DEFINITION })
        .then(list => {
          if (!signal?.aborted) {
            // Fall back to the demo catalog when the cluster has no Tasks.
            setTasks(list.items?.length ? list.items : MOCK_TASKS);
          }
        })
        .catch(() => {
          if (!signal?.aborted) {
            setTasks(MOCK_TASKS);
          }
        })
        .finally(() => {
          if (!signal?.aborted) {
            setLoading(false);
          }
        });
    },
    [open, cluster, namespace, k8sApi],
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const filtered = tasks.filter(t =>
    (k8sUtil.getName(t) ?? '').toLowerCase().includes(keyword.toLowerCase()),
  );

  const pickByName = (name: string) =>
    onSelect({ kind: TektonResourceRefKind.Task, name });

  return (
    <Modal
      open={open}
      title="Add Task"
      footer={null}
      onCancel={onCancel}
      destroyOnClose
    >
      <Tabs
        items={[
          {
            key: 'catalog',
            label: 'From catalog',
            children: (
              <>
                <Input.Search
                  placeholder="Search tasks"
                  value={keyword}
                  onChange={e => setKeyword(e.target.value)}
                  style={{ marginBottom: 12 }}
                  allowClear
                />
                {loading ? (
                  <div style={{ textAlign: 'center', padding: 24 }}>
                    <Spin />
                  </div>
                ) : filtered.length ? (
                  <List
                    style={{ maxHeight: 320, overflow: 'auto' }}
                    dataSource={filtered}
                    renderItem={task => {
                      const name = k8sUtil.getName(task) ?? '';
                      return (
                        <List.Item
                          style={{ cursor: 'pointer' }}
                          onClick={() => pickByName(name)}
                        >
                          <List.Item.Meta
                            title={name}
                            description={task.spec?.description}
                          />
                        </List.Item>
                      );
                    }}
                  />
                ) : (
                  <Empty description="No tasks found" />
                )}
              </>
            ),
          },
          {
            key: 'custom',
            label: 'By name',
            children: (
              <>
                <Typography.Paragraph type="secondary">
                  Reference a Task by name (resolved at run time).
                </Typography.Paragraph>
                <Input.Search
                  placeholder="task-name"
                  enterButton="Add"
                  value={custom}
                  onChange={e => setCustom(e.target.value)}
                  onSearch={value => value.trim() && pickByName(value.trim())}
                />
              </>
            ),
          },
        ]}
      />
    </Modal>
  );
}

/*
 * Pipeline list for the project's chosen cluster + namespace. The page is
 * project-scoped (application view); a cluster-namespace selector at the top
 * picks where to list. Below it: create buttons, a filter/refresh bar, and a
 * table of Name (link) / Tasks / Created At with a per-row Update/Delete menu.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Dropdown,
  Input,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { MoreOutlined, ReloadOutlined } from '@ant-design/icons';
import { Page } from '@octopus/core-components';
import { useApi } from '@octopus/core-plugin-api';
import { K8sApi, K8sUtil } from '@octopus/console-core-common';
import {
  ClusterNamespaceSelector,
  ClusterNamespaceValue,
  WORKSPACE_ROUTER_NAME,
  buildWorkspaceUrl,
} from '@octopus/console-core-components';

import { DeletePipelineModal } from '../components/DeletePipelineModal';
import { PIPELINE_DEFINITION } from '../api/pipelineApi';
import { formatTimestamp } from '../utils/format';
import { Pipeline } from '../types';

export function PipelineListPage() {
  const { projectName } = useParams<{ projectName: string }>();
  const k8sApi = useApi(K8sApi);
  const k8sUtil = useApi(K8sUtil);
  const navigate = useNavigate();

  // Cluster + namespace are chosen in-page (the page is project-scoped).
  const [selection, setSelection] = useState<ClusterNamespaceValue>({
    cluster: '',
    namespace: '',
  });
  const { cluster, namespace } = selection;
  // The chosen cluster + namespace, encoded for the resource sub-routes.
  const ws = buildWorkspaceUrl({ project: projectName, cluster, namespace });
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');
  const [refreshedAt, setRefreshedAt] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(
    (signal?: AbortSignal) => {
      if (!cluster || !namespace) {
        return;
      }
      setLoading(true);
      k8sApi
        .listResource<Pipeline>({
          cluster,
          namespace,
          definition: PIPELINE_DEFINITION,
        })
        .then(list => {
          if (!signal?.aborted) {
            setPipelines(list.items ?? []);
            setRefreshedAt(new Date().toISOString());
          }
        })
        .catch(e => {
          if (!signal?.aborted) {
            setPipelines([]);
            message.error(`Failed to load pipelines: ${(e as Error).message}`);
          }
        })
        .finally(() => {
          if (!signal?.aborted) {
            setLoading(false);
          }
        });
    },
    [cluster, namespace, k8sApi],
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const handleDelete = useCallback(async () => {
    if (!cluster || !deleteTarget) {
      return;
    }
    setDeleting(true);
    try {
      await k8sApi.deleteResource({
        cluster,
        namespace,
        definition: PIPELINE_DEFINITION,
        name: deleteTarget,
      });
      message.success('Pipeline deleted');
      setDeleteTarget(null);
      load();
    } catch (e) {
      message.error(`Failed to delete pipeline: ${(e as Error).message}`);
    } finally {
      setDeleting(false);
    }
  }, [cluster, namespace, deleteTarget, k8sApi, load]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) {
      return pipelines;
    }
    return pipelines.filter(p =>
      (k8sUtil.getName(p) ?? '').toLowerCase().includes(q),
    );
  }, [pipelines, filter, k8sUtil]);

  const columns: ColumnsType<Pipeline> = [
    {
      title: 'Name',
      key: 'name',
      sorter: (a, b) =>
        (k8sUtil.getName(a) ?? '').localeCompare(k8sUtil.getName(b) ?? ''),
      render: (_, p) => {
        const name = k8sUtil.getName(p);
        return name ? (
          <Link to={`${ws}/detail/${name}`}>{name}</Link>
        ) : (
          '-'
        );
      },
    },
    {
      title: 'Tasks',
      key: 'tasks',
      render: (_, p) => <Tag>{p.spec?.tasks?.length ?? 0}</Tag>,
    },
    {
      title: 'Created At',
      key: 'created',
      render: (_, p) => formatTimestamp(p.metadata?.creationTimestamp),
    },
    {
      title: '',
      key: 'actions',
      width: 48,
      render: (_, p) => {
        const name = k8sUtil.getName(p) ?? '';
        return (
          <Dropdown
            trigger={['click']}
            menu={{
              items: [
                {
                  key: 'update',
                  label: 'Update',
                  onClick: () => navigate(`${ws}/update/${name}`),
                },
                {
                  key: 'delete',
                  label: 'Delete',
                  danger: true,
                  onClick: () => setDeleteTarget(name),
                },
              ],
            }}
          >
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        );
      },
    },
  ];

  return (
    <Page>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <ClusterNamespaceSelector
          project={projectName ?? ''}
          value={selection}
          onChange={setSelection}
        />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Space>
            <Button
              type="primary"
              disabled={!cluster || !namespace}
              onClick={() =>
                navigate(`create?${WORKSPACE_ROUTER_NAME}=${ws}`)
              }
            >
              Create Pipeline
            </Button>
            <Button
              disabled={!cluster || !namespace}
              onClick={() =>
                navigate(`create?${WORKSPACE_ROUTER_NAME}=${ws}&demo=1`)
              }
            >
              Try Demo
            </Button>
          </Space>
          <Space>
            <Typography.Text type="secondary">
              Refresh Time: {formatTimestamp(refreshedAt)}
            </Typography.Text>
            <Input.Search
              placeholder="Filter by name"
              allowClear
              value={filter}
              onChange={e => setFilter(e.target.value)}
              style={{ width: 220 }}
            />
            <Button
              icon={<ReloadOutlined />}
              onClick={() => load()}
              aria-label="Refresh"
            />
          </Space>
        </div>
        <Table
          rowKey={p => k8sUtil.getName(p) ?? ''}
          loading={loading}
          dataSource={filtered}
          columns={columns}
          pagination={false}
        />
      </Space>
      <DeletePipelineModal
        open={!!deleteTarget}
        name={deleteTarget ?? ''}
        confirming={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </Page>
  );
}

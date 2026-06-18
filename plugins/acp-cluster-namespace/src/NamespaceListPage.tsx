/*
 * Namespace list for the selected cluster (see namespace-list design): a Create
 * button, a refresh-time/filter/refresh bar, and a table of Name (link) / Labels
 * (tags) / Created At with a per-row Update/Delete menu. Data + permissions come
 * from the injected K8sApi / K8sPermissionApi.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button, Dropdown, Input, Space, Table, Tag, Tooltip, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { MoreOutlined, ReloadOutlined } from '@ant-design/icons';
import { Page } from '@octopus/core-components';
import { useApi } from '@octopus/core-plugin-api';
import {
  COMMON_RESOURCE_DEFINITIONS,
  K8sApi,
  K8sPermissionApi,
  K8sUtil,
  type Namespace,
} from '@octopus/console-core-common';
import { useK8sList } from '@octopus/console-core-components';
import { DeleteNamespaceModal } from './DeleteNamespaceModal';
import { formatTimestamp } from './namespaceModel';

const NAMESPACE = COMMON_RESOURCE_DEFINITIONS.NAMESPACE;
const MAX_LABEL_TAGS = 3;

function LabelTags({ labels }: { labels?: Record<string, string> }) {
  const entries = Object.entries(labels ?? {});
  if (!entries.length) {
    return <Typography.Text type="secondary">-</Typography.Text>;
  }
  const shown = entries.slice(0, MAX_LABEL_TAGS);
  const rest = entries.slice(MAX_LABEL_TAGS);
  return (
    <Space size={[4, 4]} wrap>
      {shown.map(([key, value]) => (
        <Tag key={key}>{value ? `${key}: ${value}` : key}</Tag>
      ))}
      {rest.length > 0 && (
        <Tooltip title={rest.map(([k, v]) => (v ? `${k}: ${v}` : k)).join('\n')}>
          <Tag>…</Tag>
        </Tooltip>
      )}
    </Space>
  );
}

export function NamespaceListPage() {
  const { clusterName } = useParams<{ clusterName: string }>();
  const k8sApi = useApi(K8sApi);
  const k8sPermissionApi = useApi(K8sPermissionApi);
  const k8sUtil = useApi(K8sUtil);
  const navigate = useNavigate();

  const {
    items: namespaces,
    loading,
    error,
    loadedAt,
    reload,
  } = useK8sList<Namespace>({
    definition: NAMESPACE,
    cluster: clusterName,
    enabled: !!clusterName,
  });

  const [perms, setPerms] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (error) {
      message.error(`Failed to load namespaces: ${error.message}`);
    }
  }, [error]);

  useEffect(() => {
    if (!clusterName) {
      return;
    }
    let active = true;
    k8sPermissionApi
      .checkAccess({
        cluster: clusterName,
        definition: NAMESPACE,
        advanced: true,
        verbs: ['create', 'update', 'delete'],
      })
      .then(access => {
        if (active) {
          setPerms(access);
        }
      });
    return () => {
      active = false;
    };
  }, [clusterName, k8sPermissionApi]);

  const handleDelete = useCallback(async () => {
    if (!clusterName || !deleteTarget) {
      return;
    }
    setDeleting(true);
    try {
      await k8sApi.deleteResource({
        cluster: clusterName,
        definition: NAMESPACE,
        name: deleteTarget,
      });
      message.success('Namespace deleted');
      setDeleteTarget(null);
      reload();
    } catch (e) {
      message.error(`Failed to delete namespace: ${(e as Error).message}`);
    } finally {
      setDeleting(false);
    }
  }, [clusterName, deleteTarget, k8sApi, reload]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) {
      return namespaces;
    }
    return namespaces.filter(ns => {
      const name = k8sUtil.getName(ns)?.toLowerCase() ?? '';
      const labelText = Object.entries(ns.metadata?.labels ?? {})
        .map(([k, v]) => `${k}:${v}`)
        .join(' ')
        .toLowerCase();
      return name.includes(q) || labelText.includes(q);
    });
  }, [namespaces, filter, k8sUtil]);

  const columns: ColumnsType<Namespace> = [
    {
      title: 'Name',
      key: 'name',
      sorter: (a, b) =>
        (k8sUtil.getName(a) ?? '').localeCompare(k8sUtil.getName(b) ?? ''),
      render: (_, ns) => {
        const nsName = k8sUtil.getName(ns);
        return nsName ? <Link to={`detail/${nsName}`}>{nsName}</Link> : '-';
      },
    },
    {
      title: 'Labels',
      key: 'labels',
      render: (_, ns) => <LabelTags labels={ns.metadata?.labels} />,
    },
    {
      title: 'Created At',
      key: 'created',
      sorter: (a, b) =>
        (a.metadata?.creationTimestamp ?? '').localeCompare(
          b.metadata?.creationTimestamp ?? '',
        ),
      render: (_, ns) => formatTimestamp(ns.metadata?.creationTimestamp),
    },
    {
      title: '',
      key: 'actions',
      width: 48,
      render: (_, ns) => {
        const nsName = k8sUtil.getName(ns) ?? '';
        return (
          <Dropdown
            trigger={['click']}
            menu={{
              items: [
                {
                  key: 'update',
                  label: 'Update',
                  disabled: !perms.update,
                  onClick: () => navigate(`update/${nsName}`),
                },
                {
                  key: 'delete',
                  label: 'Delete',
                  danger: true,
                  disabled: !perms.delete,
                  onClick: () => setDeleteTarget(nsName),
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Button
            type="primary"
            disabled={!perms.create}
            onClick={() => navigate('create')}
          >
            Create Namespace
          </Button>
          <Space>
            <Typography.Text type="secondary">
              Refresh Time: {formatTimestamp(loadedAt)}
            </Typography.Text>
            <Input.Search
              placeholder="Filter by"
              allowClear
              value={filter}
              onChange={e => setFilter(e.target.value)}
              style={{ width: 240 }}
            />
            <Button
              icon={<ReloadOutlined />}
              onClick={() => reload()}
              aria-label="Refresh"
            />
          </Space>
        </div>
        <Table
          rowKey={ns => k8sUtil.getName(ns) ?? ''}
          loading={loading}
          dataSource={filtered}
          columns={columns}
          pagination={false}
        />
      </Space>
      <DeleteNamespaceModal
        open={!!deleteTarget}
        name={deleteTarget ?? ''}
        confirming={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </Page>
  );
}

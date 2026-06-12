/*
 * Namespace detail (see namespace-detail design): breadcrumb, title with an edit
 * pencil, an Actions menu (Update / Delete), and tabs — Detail Info (Basic Info),
 * YAML, and placeholders for Resource Quotas / Container LimitRange. Data +
 * permissions come from the injected K8sApi / K8sPermissionApi / K8sUtil.
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Dropdown,
  Empty,
  Space,
  Spin,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { DownOutlined, EditOutlined } from '@ant-design/icons';
import { stringify } from 'yaml';
import { Page } from '@octopus/core-components';
import { useApi } from '@octopus/core-plugin-api';
import {
  COMMON_RESOURCE_DEFINITIONS,
  K8sApi,
  K8sPermissionApi,
  K8sUtil,
  type Namespace,
} from '@octopus/console-core-common';
import { NamespaceBreadcrumb } from './NamespaceBreadcrumb';
import { DeleteNamespaceModal } from './DeleteNamespaceModal';
import { formatTimestamp } from './namespaceModel';

const NAMESPACE = COMMON_RESOURCE_DEFINITIONS.NAMESPACE;
const MAX_TAGS = 5;

function TagList({ data }: { data?: Record<string, string> }) {
  const entries = Object.entries(data ?? {});
  if (!entries.length) {
    return <Typography.Text type="secondary">-</Typography.Text>;
  }
  const shown = entries.slice(0, MAX_TAGS);
  const rest = entries.slice(MAX_TAGS);
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

const InfoRow = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div style={{ display: 'flex', marginBottom: 12 }}>
    <div style={{ width: 110, color: 'rgba(255,255,255,0.45)' }}>{label}:</div>
    <div style={{ flex: 1 }}>{children}</div>
  </div>
);

export function NamespaceDetailPage() {
  const { clusterName, name } = useParams<{
    clusterName: string;
    name: string;
  }>();
  const k8sApi = useApi(K8sApi);
  const k8sPermissionApi = useApi(K8sPermissionApi);
  const k8sUtil = useApi(K8sUtil);
  const navigate = useNavigate();

  const [namespace, setNamespace] = useState<Namespace | null>(null);
  const [loading, setLoading] = useState(true);
  const [perms, setPerms] = useState<Record<string, boolean>>({});
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const goToUpdate = useCallback(
    () => navigate(`../update/${name}`),
    [navigate, name],
  );

  useEffect(() => {
    if (!clusterName || !name) {
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    k8sApi
      .getResource<Namespace>({ cluster: clusterName, definition: NAMESPACE, name })
      .then(ns => {
        if (!controller.signal.aborted) {
          setNamespace(ns);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setNamespace(null);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [clusterName, name, k8sApi]);

  useEffect(() => {
    if (!clusterName || !name) {
      return;
    }
    let active = true;
    k8sPermissionApi
      .checkAccess({
        cluster: clusterName,
        definition: NAMESPACE,
        advanced: true,
        name,
        verbs: ['update', 'delete'],
      })
      .then(access => {
        if (active) {
          setPerms(access);
        }
      });
    return () => {
      active = false;
    };
  }, [clusterName, name, k8sPermissionApi]);

  const handleDelete = useCallback(async () => {
    if (!clusterName || !name) {
      return;
    }
    setDeleting(true);
    try {
      await k8sApi.deleteResource({ cluster: clusterName, definition: NAMESPACE, name });
      message.success('Namespace deleted');
      setDeleteOpen(false);
      navigate('..');
    } catch (e) {
      message.error(`Failed to delete namespace: ${(e as Error).message}`);
    } finally {
      setDeleting(false);
    }
  }, [clusterName, name, k8sApi, navigate]);

  if (loading) {
    return (
      <Page>
        <Spin />
      </Page>
    );
  }
  if (!namespace) {
    return (
      <Page>
        <NamespaceBreadcrumb />
        <Empty description={`Namespace "${name}" not found`} />
      </Page>
    );
  }

  const basicInfo = (
    <div>
      <Typography.Title level={5}>Basic Info</Typography.Title>
      <div style={{ display: 'flex', gap: 48 }}>
        <div style={{ flex: 1 }}>
          <InfoRow label="Cluster">{clusterName}</InfoRow>
          <InfoRow label="Labels">
            <Space align="center">
              <TagList data={namespace.metadata?.labels} />
              <EditOutlined onClick={goToUpdate} style={{ cursor: 'pointer' }} />
            </Space>
          </InfoRow>
          <InfoRow label="Annotations">
            <Space align="center">
              <TagList data={namespace.metadata?.annotations} />
              <EditOutlined onClick={goToUpdate} style={{ cursor: 'pointer' }} />
            </Space>
          </InfoRow>
        </div>
        <div style={{ flex: 1 }}>
          <InfoRow label="Creator">{k8sUtil.getCreator(namespace) ?? '-'}</InfoRow>
          <InfoRow label="Created At">
            {formatTimestamp(namespace.metadata?.creationTimestamp)}
          </InfoRow>
        </div>
      </div>
    </div>
  );

  return (
    <Page>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <NamespaceBreadcrumb />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Space align="center">
            <Typography.Title level={2} style={{ margin: 0 }}>
              {name}
            </Typography.Title>
            <EditOutlined onClick={goToUpdate} style={{ cursor: 'pointer' }} />
          </Space>
          <Dropdown
            trigger={['click']}
            menu={{
              items: [
                {
                  key: 'update',
                  label: 'Update',
                  disabled: !perms.update,
                  onClick: goToUpdate,
                },
                {
                  key: 'delete',
                  label: 'Delete',
                  danger: true,
                  disabled: !perms.delete,
                  onClick: () => setDeleteOpen(true),
                },
              ],
            }}
          >
            <Button>
              Actions <DownOutlined />
            </Button>
          </Dropdown>
        </div>
        <Tabs
          items={[
            { key: 'detail', label: 'Detail Info', children: basicInfo },
            {
              key: 'yaml',
              label: 'YAML',
              children: (
                <Typography.Paragraph>
                  <pre style={{ margin: 0 }}>{stringify(namespace)}</pre>
                </Typography.Paragraph>
              ),
            },
            {
              key: 'resource-quotas',
              label: 'Resource Quotas',
              children: (
                <Typography.Text type="secondary">
                  Resource quotas — coming soon
                </Typography.Text>
              ),
            },
            {
              key: 'limit-ranges',
              label: 'Container LimitRange',
              children: (
                <Typography.Text type="secondary">
                  Limit ranges — coming soon
                </Typography.Text>
              ),
            },
          ]}
        />
      </Space>
      <DeleteNamespaceModal
        open={deleteOpen}
        name={name ?? ''}
        confirming={deleting}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
      />
    </Page>
  );
}

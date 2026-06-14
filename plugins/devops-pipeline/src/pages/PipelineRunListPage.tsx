/*
 * PipelineRuns for the project's chosen cluster + namespace. Like the Pipeline
 * list, the page is project-scoped: a cluster-namespace selector at the top
 * picks where to list. Below it a filter/refresh bar and a table of Name (link)
 * / Pipeline / Status / Started / Duration with a per-row Delete action.
 *
 * A simplified React port of the console's `pipelineRun/list` feature (the rich
 * status bars, params drawer and Tekton-Results archive lookup are dropped).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
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
  buildWorkspaceUrl,
  usePersistentClusterNamespace,
} from '@octopus/console-core-components';

import { DeleteResourceModal } from '../components/DeleteResourceModal';
import { PIPELINE_RUN_DEFINITION } from '../api/pipelineApi';
import { formatTimestamp } from '../utils/format';
import {
  getRunDuration,
  getRunPhase,
  getRunPhaseColor,
} from '../utils/pipelineRunStatus';
import { PipelineRun } from '../types';

const TEKTON_PIPELINE_LABEL = 'tekton.dev/pipeline';

function getPipelineName(run: PipelineRun): string {
  return (
    run.spec?.pipelineRef?.name ||
    run.metadata?.labels?.[TEKTON_PIPELINE_LABEL] ||
    '-'
  );
}

export function PipelineRunListPage() {
  const { projectName } = useParams<{ projectName: string }>();
  const k8sApi = useApi(K8sApi);
  const k8sUtil = useApi(K8sUtil);

  // Cluster + namespace are chosen in-page (the page is project-scoped). The
  // selection can be locked (persisted across pages/reloads) via the selector.
  const {
    value: selection,
    setValue: setSelection,
    locked,
    setLocked,
  } = usePersistentClusterNamespace(projectName);
  const { cluster, namespace } = selection;
  // The chosen cluster + namespace, encoded for the resource sub-routes.
  const ws = buildWorkspaceUrl({ project: projectName, cluster, namespace });
  const [runs, setRuns] = useState<PipelineRun[]>([]);
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
        .listResource<PipelineRun>({
          cluster,
          namespace,
          definition: PIPELINE_RUN_DEFINITION,
        })
        .then(list => {
          if (!signal?.aborted) {
            setRuns(list.items ?? []);
            setRefreshedAt(new Date().toISOString());
          }
        })
        .catch(e => {
          if (!signal?.aborted) {
            setRuns([]);
            message.error(
              `Failed to load pipeline runs: ${(e as Error).message}`,
            );
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
        definition: PIPELINE_RUN_DEFINITION,
        name: deleteTarget,
      });
      message.success('PipelineRun deleted');
      setDeleteTarget(null);
      load();
    } catch (e) {
      message.error(`Failed to delete pipeline run: ${(e as Error).message}`);
    } finally {
      setDeleting(false);
    }
  }, [cluster, namespace, deleteTarget, k8sApi, load]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) {
      return runs;
    }
    return runs.filter(r =>
      (k8sUtil.getName(r) ?? '').toLowerCase().includes(q),
    );
  }, [runs, filter, k8sUtil]);

  const columns: ColumnsType<PipelineRun> = [
    {
      title: 'Name',
      key: 'name',
      sorter: (a, b) =>
        (k8sUtil.getName(a) ?? '').localeCompare(k8sUtil.getName(b) ?? ''),
      render: (_, r) => {
        const name = k8sUtil.getName(r);
        return name ? (
          <Link to={`${ws}/detail/${name}`}>{name}</Link>
        ) : (
          '-'
        );
      },
    },
    {
      title: 'Pipeline',
      key: 'pipeline',
      render: (_, r) => getPipelineName(r),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, r) => {
        const phase = getRunPhase(r);
        return <Tag color={getRunPhaseColor(phase)}>{phase}</Tag>;
      },
    },
    {
      title: 'Started At',
      key: 'started',
      sorter: (a, b) =>
        (a.status?.startTime ?? '').localeCompare(b.status?.startTime ?? ''),
      defaultSortOrder: 'descend',
      render: (_, r) => formatTimestamp(r.status?.startTime),
    },
    {
      title: 'Duration',
      key: 'duration',
      render: (_, r) => getRunDuration(r),
    },
    {
      title: '',
      key: 'actions',
      width: 48,
      render: (_, r) => {
        const name = k8sUtil.getName(r) ?? '';
        return (
          <Dropdown
            trigger={['click']}
            menu={{
              items: [
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
          locked={locked}
          onLockChange={setLocked}
        />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
          }}
        >
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
          rowKey={r => k8sUtil.getName(r) ?? ''}
          loading={loading}
          dataSource={filtered}
          columns={columns}
          pagination={false}
        />
      </Space>
      <DeleteResourceModal
        open={!!deleteTarget}
        resourceKind="PipelineRun"
        name={deleteTarget ?? ''}
        confirming={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </Page>
  );
}

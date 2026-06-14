/*
 * PipelineRun detail (design/pipelineRun-detail.png): a header (status, name,
 * pipeline link, timing) above a tab strip. The Tasks tab is the centerpiece —
 * a task tree whose tasks show params/workspaces/results and whose steps stream
 * logs (see PipelineRunTasksTab). The other tabs are read-only summaries.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Descriptions,
  Empty,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ApartmentOutlined } from '@ant-design/icons';
import { stringify } from 'yaml';
import { Page } from '@octopus/core-components';
import { useApi } from '@octopus/core-plugin-api';
import { K8sApi } from '@octopus/console-core-common';
import {
  WORKSPACE_ROUTER_NAME,
  useWorkspace,
} from '@octopus/console-core-components';

import { RunStatusIcon } from '../components/RunStatusIcon';
import { PipelineRunTasksTab } from '../components/PipelineRunTasksTab';
import { PipelineRunEvents } from '../components/PipelineRunEvents';
import { PIPELINE_RUN_DEFINITION } from '../api/pipelineApi';
import { formatTimestamp } from '../utils/format';
import {
  getRunDuration,
  getRunMessage,
  getRunPhase,
  getRunPhaseColor,
} from '../utils/pipelineRunStatus';
import {
  ParameterInputSet,
  PipelineRun,
  WorkspaceBinding,
} from '../types';

const TEKTON_PIPELINE_LABEL = 'tekton.dev/pipeline';

function getPipelineName(run: PipelineRun): string {
  return (
    run.spec?.pipelineRef?.name ||
    run.metadata?.labels?.[TEKTON_PIPELINE_LABEL] ||
    '-'
  );
}

const paramColumns: ColumnsType<ParameterInputSet> = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  {
    title: 'Value',
    key: 'value',
    render: (_, p) =>
      typeof p.value === 'string' ? p.value : JSON.stringify(p.value),
  },
];

const workspaceColumns: ColumnsType<WorkspaceBinding> = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  {
    title: 'Source',
    key: 'source',
    render: (_, w) => {
      const { name, subPath, ...rest } = w;
      const keys = Object.keys(rest);
      return keys.length
        ? keys.join(', ')
        : subPath
          ? `subPath: ${subPath}`
          : '-';
    },
  },
];

export function PipelineRunDetailPage() {
  const params = useParams<{ ws: string; name: string }>();
  const { cluster, namespace } = useWorkspace();
  const name = params.name;
  const ws = params[WORKSPACE_ROUTER_NAME];
  const k8sApi = useApi(K8sApi);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  const [run, setRun] = useState<PipelineRun | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cluster || !namespace || !name) {
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    k8sApi
      .getResource<PipelineRun>({
        cluster,
        namespace,
        definition: PIPELINE_RUN_DEFINITION,
        name,
      })
      .then(r => {
        if (!controller.signal.aborted) {
          setRun(r);
        }
      })
      .catch(e => {
        if (!controller.signal.aborted) {
          message.error(`Failed to load pipeline run: ${(e as Error).message}`);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [cluster, namespace, name, k8sApi]);

  const yaml = useMemo(() => (run ? stringify(run) : ''), [run]);

  if (loading || !run) {
    return (
      <Page>
        <Spin />
      </Page>
    );
  }

  const phase = getRunPhase(run);
  const runMessage = getRunMessage(run);
  const runParams = run.spec?.params ?? [];
  const workspaces = run.spec?.workspaces ?? [];
  const results = run.status?.results ?? [];
  const childRefs = run.status?.childReferences ?? [];

  const summary = (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Descriptions column={2} bordered size="small">
        <Descriptions.Item label="Name">{run.metadata?.name}</Descriptions.Item>
        <Descriptions.Item label="Namespace">
          {run.metadata?.namespace}
        </Descriptions.Item>
        <Descriptions.Item label="Pipeline">
          {ws ? (
            <Link to={`../../../${ws}/detail/${getPipelineName(run)}`}>
              {getPipelineName(run)}
            </Link>
          ) : (
            getPipelineName(run)
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Status">
          <Space size={4}>
            <RunStatusIcon phase={phase} size={14} />
            <Tag color={getRunPhaseColor(phase)}>{phase}</Tag>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="Started At">
          {formatTimestamp(run.status?.startTime)}
        </Descriptions.Item>
        <Descriptions.Item label="Completed At">
          {formatTimestamp(run.status?.completionTime)}
        </Descriptions.Item>
        <Descriptions.Item label="Duration">
          {getRunDuration(run)}
        </Descriptions.Item>
        <Descriptions.Item label="Tasks">{childRefs.length}</Descriptions.Item>
      </Descriptions>
      {runMessage && (
        <Alert
          type={phase === 'Failed' ? 'error' : 'info'}
          showIcon
          message={runMessage}
        />
      )}
    </Space>
  );

  const items = [
    { key: 'overview', label: 'Overview', children: summary },
    {
      key: 'parameters',
      label: 'Parameters',
      children: runParams.length ? (
        <Table
          rowKey={p => p.name}
          dataSource={runParams}
          columns={paramColumns}
          pagination={false}
          size="small"
        />
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No parameters" />
      ),
    },
    {
      key: 'workspaces',
      label: 'Workspaces',
      children: workspaces.length ? (
        <Table
          rowKey={w => w.name}
          dataSource={workspaces}
          columns={workspaceColumns}
          pagination={false}
          size="small"
        />
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No workspaces" />
      ),
    },
    {
      key: 'results',
      label: 'Results',
      children: results.length ? (
        <Descriptions column={1} bordered size="small">
          {results.map(r => (
            <Descriptions.Item key={r.name} label={r.name}>
              {typeof r.value === 'string' ? r.value : JSON.stringify(r.value)}
            </Descriptions.Item>
          ))}
        </Descriptions>
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No results" />
      ),
    },
    {
      key: 'yaml',
      label: 'YAML',
      children: (
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{yaml}</pre>
      ),
    },
    {
      key: 'tasks',
      label: 'Tasks',
      children: (
        <PipelineRunTasksTab
          run={run}
          cluster={cluster}
          namespace={namespace}
        />
      ),
    },
    {
      key: 'events',
      label: 'Events',
      children: (
        <PipelineRunEvents
          name={run.metadata?.name ?? ''}
          cluster={cluster}
          namespace={namespace}
        />
      ),
    },
  ];

  return (
    <Page>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Space align="center" size={8}>
          <RunStatusIcon phase={phase} size={20} />
          <Typography.Title level={4} style={{ margin: 0 }}>
            {run.metadata?.name}
          </Typography.Title>
        </Space>
        <Space split="·" wrap>
          <Link to=".." relative="path">
            <ApartmentOutlined /> {getPipelineName(run)}
          </Link>
          <Typography.Text type="secondary">
            {formatTimestamp(run.status?.startTime)}
          </Typography.Text>
          <Typography.Text type="secondary">
            {getRunDuration(run)}
          </Typography.Text>
        </Space>
        <Tabs
          activeKey={activeTab}
          onChange={key => {
            searchParams.set('tab', key);
            setSearchParams(searchParams, { replace: true });
          }}
          items={items}
        />
      </Space>
    </Page>
  );
}

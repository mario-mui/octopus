/*
 * The right-hand panel shown when a Task (not a step) is selected in the Tasks
 * tab: the TaskRun's status, timing, parameters, workspaces and results.
 */
import { Descriptions, Empty, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { RunStatusIcon } from './RunStatusIcon';
import { formatTimestamp } from '../utils/format';
import {
  getPhaseFromConditions,
  getRunPhaseColor,
  humanizeDuration,
} from '../utils/pipelineRunStatus';
import type {
  ParameterInputSet,
  TaskRun,
  WorkspaceBinding,
} from '../types';

export interface TaskRunPanelProps {
  taskName: string;
  taskRun?: TaskRun;
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
      return keys.length ? keys.join(', ') : subPath ? `subPath: ${subPath}` : '-';
    },
  },
];

export function TaskRunPanel({ taskName, taskRun }: TaskRunPanelProps) {
  if (!taskRun) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={`${taskName} has not run yet`}
      />
    );
  }

  const phase = getPhaseFromConditions(taskRun.status?.conditions);
  const params = taskRun.spec?.params ?? [];
  const workspaces = taskRun.spec?.workspaces ?? [];
  const results = taskRun.status?.results ?? [];

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Descriptions column={2} bordered size="small">
        <Descriptions.Item label="Name">
          {taskRun.metadata?.name}
        </Descriptions.Item>
        <Descriptions.Item label="Status">
          <Space size={4}>
            <RunStatusIcon phase={phase} size={14} />
            <Tag color={getRunPhaseColor(phase)}>{phase}</Tag>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="Started At">
          {formatTimestamp(taskRun.status?.startTime)}
        </Descriptions.Item>
        <Descriptions.Item label="Duration">
          {humanizeDuration(
            taskRun.status?.startTime,
            taskRun.status?.completionTime,
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Pod" span={2}>
          {taskRun.status?.podName || '-'}
        </Descriptions.Item>
      </Descriptions>

      {params.length > 0 && (
        <>
          <Typography.Title level={5} style={{ marginBottom: 0 }}>
            Parameters
          </Typography.Title>
          <Table
            rowKey={p => p.name}
            dataSource={params}
            columns={paramColumns}
            pagination={false}
            size="small"
          />
        </>
      )}

      {workspaces.length > 0 && (
        <>
          <Typography.Title level={5} style={{ marginBottom: 0 }}>
            Workspaces
          </Typography.Title>
          <Table
            rowKey={w => w.name}
            dataSource={workspaces}
            columns={workspaceColumns}
            pagination={false}
            size="small"
          />
        </>
      )}

      {results.length > 0 && (
        <>
          <Typography.Title level={5} style={{ marginBottom: 0 }}>
            Results
          </Typography.Title>
          <Descriptions column={1} bordered size="small">
            {results.map(r => (
              <Descriptions.Item key={r.name} label={r.name}>
                {typeof r.value === 'string' ? r.value : JSON.stringify(r.value)}
              </Descriptions.Item>
            ))}
          </Descriptions>
        </>
      )}
    </Space>
  );
}

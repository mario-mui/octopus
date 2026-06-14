/*
 * The Events tab: core Kubernetes events for this PipelineRun, fetched via the
 * `involvedObject` field selector. A simple read-only table.
 */
import { useEffect, useState } from 'react';
import { Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useApi } from '@octopus/core-plugin-api';
import {
  K8sApi,
  type K8sResourceDefinition,
  type KubernetesResource,
} from '@octopus/console-core-common';
import { formatTimestamp } from '../utils/format';

interface K8sEvent extends KubernetesResource {
  type?: string;
  reason?: string;
  message?: string;
  lastTimestamp?: string;
  eventTime?: string;
}

const EVENT_DEFINITION: K8sResourceDefinition = {
  type: 'events',
  apiVersion: 'v1',
};

export interface PipelineRunEventsProps {
  name: string;
  cluster: string;
  namespace: string;
}

export function PipelineRunEvents({
  name,
  cluster,
  namespace,
}: PipelineRunEventsProps) {
  const k8sApi = useApi(K8sApi);
  const [events, setEvents] = useState<K8sEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cluster || !namespace || !name) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    k8sApi
      .listResource<K8sEvent>({
        cluster,
        namespace,
        definition: EVENT_DEFINITION,
        queryParams: {
          fieldSelector: `involvedObject.name=${name},involvedObject.kind=PipelineRun`,
        },
      })
      .then(list => {
        if (!cancelled) {
          setEvents(list.items ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEvents([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [name, cluster, namespace, k8sApi]);

  const columns: ColumnsType<K8sEvent> = [
    {
      title: 'Type',
      key: 'type',
      width: 100,
      render: (_, e) => (
        <Tag color={e.type === 'Warning' ? 'warning' : 'default'}>
          {e.type || '-'}
        </Tag>
      ),
    },
    { title: 'Reason', dataIndex: 'reason', key: 'reason', width: 160 },
    { title: 'Message', dataIndex: 'message', key: 'message' },
    {
      title: 'Last Seen',
      key: 'time',
      width: 180,
      render: (_, e) =>
        formatTimestamp(e.lastTimestamp || e.eventTime),
    },
  ];

  if (loading) {
    return <Spin />;
  }
  if (events.length === 0) {
    return (
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No events" />
    );
  }
  return (
    <Table
      rowKey={e => e.metadata?.uid ?? e.metadata?.name ?? ''}
      dataSource={events}
      columns={columns}
      pagination={false}
      size="small"
    />
  );
}

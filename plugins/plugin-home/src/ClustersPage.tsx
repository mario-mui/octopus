import { Typography, Table } from 'antd';
import { Page } from '@octopus/core-components';

const clusters = [
  { key: 'global', name: 'global', status: 'Normal', nodes: 3 },
  { key: 'demo', name: 'demo', status: 'Normal', nodes: 5 },
];

export function ClustersPage() {
  return (
    <Page>
      <Typography.Title level={2}>Clusters</Typography.Title>
      <Table
        style={{ marginTop: 16 }}
        dataSource={clusters}
        pagination={false}
        columns={[
          { title: 'Name', dataIndex: 'name' },
          { title: 'Status', dataIndex: 'status' },
          { title: 'Nodes', dataIndex: 'nodes' },
        ]}
      />
    </Page>
  );
}

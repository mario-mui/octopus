import { Typography, Descriptions } from 'antd';
import { Page } from '@octopus/core-components';

export function SettingsPage() {
  return (
    <Page>
      <Typography.Title level={2}>Settings</Typography.Title>
      <Descriptions bordered column={1} style={{ marginTop: 16 }}>
        <Descriptions.Item label="Framework">Octopus</Descriptions.Item>
        <Descriptions.Item label="UI">Ant Design 5</Descriptions.Item>
        <Descriptions.Item label="Plugin model">
          Backstage-style extension tree
        </Descriptions.Item>
      </Descriptions>
    </Page>
  );
}

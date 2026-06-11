import { Typography, Space, Alert, Tag } from 'antd';
import { useApi } from '@octopus/core-plugin-api';
import { Page } from '@octopus/core-components';
import { appInfoApiRef } from '@octopus/app-defaults';

export function RemoteDemoPage() {
  // Consuming a host-provided utility API from inside a remote proves the DI
  // container (and its React context) is a shared singleton across the boundary.
  const appInfo = useApi(appInfoApiRef);

  return (
    <Page>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Typography.Title level={2}>
          Remote Demo Plugin <Tag color="magenta">module federation</Tag>
        </Typography.Title>
        <Alert
          type="info"
          showIcon
          message="This page was loaded at runtime over Module Federation"
          description="plugin-remote-demo was built as a separate bundle (remoteEntry.js) and loaded by the host at runtime — the host was never rebuilt to know about it."
        />
        <Typography.Paragraph type="secondary">
          Host app reported via the shared DI container:{' '}
          <strong>
            {appInfo.getTitle()} v{appInfo.getVersion()}
          </strong>
        </Typography.Paragraph>
      </Space>
    </Page>
  );
}

import { Typography, Space, Alert, Tag } from 'antd';
import { Link } from 'react-router-dom';
import {
  useApi,
  configApiRef,
  useRouteRef,
  useTranslationRef,
} from '@octopus/core-plugin-api';
import { Page } from '@octopus/core-components';
import { appInfoApiRef } from '@octopus/app-defaults';
import { settingsRouteRef } from './routes';
import { homeTranslationRef } from './translation';

export function HomePage() {
  const appInfo = useApi(appInfoApiRef);
  const config = useApi(configApiRef);
  const org = config.getOptionalString('organization.name') ?? 'your org';
  const settingsLink = useRouteRef(settingsRouteRef);
  const { t } = useTranslationRef(homeTranslationRef);

  return (
    <Page>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Typography.Title level={2} style={{ margin: 0 }}>
          {t('greeting')} 🐙 <Tag color="blue">v{appInfo.getVersion()}</Tag>
        </Typography.Title>
        <Typography.Paragraph type="secondary">{t('tagline')}</Typography.Paragraph>
        <Alert
          type="success"
          message="This page was contributed by a static plugin"
          description="plugin-home registered this route and its sidebar entry through PageBlueprint. The composition root wired it into the app tree, and the sidebar was auto-derived from the page's title."
          showIcon
        />
        <Typography.Paragraph>
          Configured organization (from <code>configApi</code>):{' '}
          <strong>{org}</strong>
        </Typography.Paragraph>
        {settingsLink && (
          <Typography.Paragraph>
            <Link to={settingsLink()}>Open Settings</Link> — link resolved from a
            route ref, not a hard-coded path.
          </Typography.Paragraph>
        )}
      </Space>
    </Page>
  );
}

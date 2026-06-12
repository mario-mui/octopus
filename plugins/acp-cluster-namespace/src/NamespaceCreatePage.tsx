/*
 * Create Namespace page (see namespace-create design). Renders the shared form
 * in create mode and POSTs the resource via the injected K8sApi.
 */
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Space, message } from 'antd';
import { Page } from '@octopus/core-components';
import { useApi } from '@octopus/core-plugin-api';
import {
  COMMON_RESOURCE_DEFINITIONS,
  K8sApi,
  type Namespace,
} from '@octopus/console-core-common';
import { NamespaceBreadcrumb } from './NamespaceBreadcrumb';
import { NamespaceForm } from './NamespaceForm';

export function NamespaceCreatePage() {
  const { clusterName } = useParams<{ clusterName: string }>();
  const k8sApi = useApi(K8sApi);
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (resource: Namespace) => {
    if (!clusterName) {
      return;
    }
    setSubmitting(true);
    try {
      const created = await k8sApi.createResource<Namespace>({
        cluster: clusterName,
        definition: COMMON_RESOURCE_DEFINITIONS.NAMESPACE,
        resource,
      });
      message.success('Namespace created');
      navigate(`../detail/${created.metadata?.name}`);
    } catch (e) {
      message.error(`Failed to create namespace: ${(e as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Page>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <NamespaceBreadcrumb />
        <NamespaceForm
          mode="create"
          submitting={submitting}
          onSubmit={handleSubmit}
          onCancel={() => navigate('..')}
        />
      </Space>
    </Page>
  );
}

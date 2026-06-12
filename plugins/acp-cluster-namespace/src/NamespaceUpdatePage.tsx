/*
 * Update Namespace page (see namespace-update design). Loads the namespace,
 * renders the shared form in update mode, and PUTs via the injected K8sApi
 * (with 409-retry).
 */
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Empty, Space, Spin, message } from 'antd';
import { Page } from '@octopus/core-components';
import { useApi } from '@octopus/core-plugin-api';
import {
  COMMON_RESOURCE_DEFINITIONS,
  K8sApi,
  type Namespace,
} from '@octopus/console-core-common';
import { NamespaceBreadcrumb } from './NamespaceBreadcrumb';
import { NamespaceForm } from './NamespaceForm';

const NAMESPACE = COMMON_RESOURCE_DEFINITIONS.NAMESPACE;

export function NamespaceUpdatePage() {
  const { clusterName, name } = useParams<{
    clusterName: string;
    name: string;
  }>();
  const k8sApi = useApi(K8sApi);
  const navigate = useNavigate();

  const [namespace, setNamespace] = useState<Namespace | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!clusterName || !name) {
      return;
    }
    const controller = new AbortController();
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

  const handleSubmit = async (resource: Namespace) => {
    if (!clusterName || !name) {
      return;
    }
    setSubmitting(true);
    try {
      await k8sApi.updateResourceWithRetry<Namespace>({
        cluster: clusterName,
        definition: NAMESPACE,
        name,
        resource,
      });
      message.success('Namespace updated');
      navigate(`../detail/${name}`);
    } catch (e) {
      message.error(`Failed to update namespace: ${(e as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Page>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <NamespaceBreadcrumb />
        {loading ? (
          <Spin />
        ) : !namespace ? (
          <Empty description={`Namespace "${name}" not found`} />
        ) : (
          <NamespaceForm
            mode="update"
            initial={namespace}
            submitting={submitting}
            onSubmit={handleSubmit}
            onCancel={() => navigate('..')}
          />
        )}
      </Space>
    </Page>
  );
}

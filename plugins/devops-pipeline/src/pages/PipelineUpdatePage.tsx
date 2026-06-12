import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Page } from '@octopus/core-components';
import { Space, Spin, message } from 'antd';
import { useApi } from '@octopus/core-plugin-api';
import { K8sApi } from '@octopus/console-core-common';
import {
  WORKSPACE_ROUTER_NAME,
  useWorkspace,
} from '@octopus/console-core-components';

import { PipelineBreadcrumb } from '../components/PipelineBreadcrumb';
import { PipelineForm } from '../components/PipelineForm';
import { PIPELINE_DEFINITION } from '../api/pipelineApi';
import { Pipeline } from '../types';

export function PipelineUpdatePage() {
  const params = useParams<{ ws: string; name: string }>();
  const { cluster, namespace } = useWorkspace();
  const name = params.name;
  const ws = params[WORKSPACE_ROUTER_NAME];
  const k8sApi = useApi(K8sApi);
  const navigate = useNavigate();

  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!cluster || !namespace || !name) {
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    k8sApi
      .getResource<Pipeline>({
        cluster,
        namespace,
        definition: PIPELINE_DEFINITION,
        name,
      })
      .then(p => {
        if (!controller.signal.aborted) {
          setPipeline(p);
        }
      })
      .catch(e => {
        if (!controller.signal.aborted) {
          message.error(`Failed to load pipeline: ${(e as Error).message}`);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [cluster, namespace, name, k8sApi]);

  const handleSave = async (next: Pipeline) => {
    if (!cluster || !namespace || !name) {
      return;
    }
    setSaving(true);
    try {
      await k8sApi.updateResourceWithRetry<Pipeline>({
        cluster,
        namespace,
        definition: PIPELINE_DEFINITION,
        name,
        resource: next,
      });
      message.success('Pipeline updated');
      navigate(`../${ws}/detail/${name}`);
    } catch (e) {
      message.error(`Failed to update pipeline: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <PipelineBreadcrumb />
        {loading || !pipeline ? (
          <Spin />
        ) : (
          <PipelineForm
            mode="update"
            initial={pipeline}
            cluster={cluster}
            saving={saving}
            onSave={handleSave}
            onCancel={() => navigate('..')}
          />
        )}
      </Space>
    </Page>
  );
}

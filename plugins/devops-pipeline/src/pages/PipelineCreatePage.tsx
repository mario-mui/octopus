import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Page } from '@octopus/core-components';
import { Space, message } from 'antd';
import { useApi } from '@octopus/core-plugin-api';
import { K8sApi } from '@octopus/console-core-common';
import {
  WORKSPACE_ROUTER_NAME,
  buildWorkspaceUrl,
  parseWorkspaceUrl,
  useWorkspace,
} from '@octopus/console-core-components';

import { PipelineBreadcrumb } from '../components/PipelineBreadcrumb';
import { PipelineForm } from '../components/PipelineForm';
import { DEMO_ORCHESTRATION } from '../components/orchestration/mockTasks';
import { PIPELINE_DEFINITION, emptyPipeline } from '../api/pipelineApi';
import { Pipeline } from '../types';

export function PipelineCreatePage() {
  const [searchParams] = useSearchParams();
  // Cluster + namespace arrive encoded in the `ws` query; project from the view.
  const { project } = useWorkspace();
  const workspace = parseWorkspaceUrl(searchParams.get(WORKSPACE_ROUTER_NAME));
  const cluster = workspace?.cluster || '';
  const namespace = workspace?.namespace || 'default';
  const demo = searchParams.get('demo') === '1';
  const k8sApi = useApi(K8sApi);
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  // When ?demo=1, seed the editor with the sample graph (design/pipeline-orc.png).
  const initial = useMemo<Pipeline>(() => {
    const base = emptyPipeline(namespace, demo ? 'demo-pipeline' : '');
    if (!demo) {
      return base;
    }
    return {
      ...base,
      spec: {
        ...base.spec,
        tasks: DEMO_ORCHESTRATION.tasks,
        finally: DEMO_ORCHESTRATION.finally,
      },
    };
  }, [namespace, demo]);

  const handleSave = async (pipeline: Pipeline) => {
    if (!cluster) {
      return;
    }
    const ns = pipeline.metadata?.namespace || namespace;
    setSaving(true);
    try {
      await k8sApi.createResource<Pipeline>({
        cluster,
        namespace: ns,
        definition: PIPELINE_DEFINITION,
        resource: pipeline,
      });
      message.success('Pipeline created');
      const ws = buildWorkspaceUrl({ project, cluster, namespace: ns });
      navigate(`../${ws}/detail/${pipeline.metadata?.name}`);
    } catch (e) {
      message.error(`Failed to create pipeline: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <PipelineBreadcrumb />
        <PipelineForm
          mode="create"
          initial={initial}
          cluster={cluster}
          saving={saving}
          onSave={handleSave}
          onCancel={() => navigate('..')}
        />
      </Space>
    </Page>
  );
}

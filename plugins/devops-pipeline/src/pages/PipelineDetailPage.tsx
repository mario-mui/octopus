/*
 * Pipeline detail: summary + an embedded orchestration view of the task graph.
 * The graph is interactive (it reuses the editor), but changes here are not
 * persisted — use Update to edit and save.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Descriptions,
  Space,
  Spin,
  Typography,
  message,
} from 'antd';
import { Page } from '@octopus/core-components';
import { useApi } from '@octopus/core-plugin-api';
import { K8sApi } from '@octopus/console-core-common';
import {
  WORKSPACE_ROUTER_NAME,
  useWorkspace,
} from '@octopus/console-core-components';

import { OrchestrationTab } from '../components/orchestration/OrchestrationTab';
import { PipelineBreadcrumb } from '../components/PipelineBreadcrumb';
import { PIPELINE_DEFINITION } from '../api/pipelineApi';
import { Pipeline, PipelineOrchestration } from '../types';

export function PipelineDetailPage() {
  const params = useParams<{ ws: string; name: string }>();
  const { cluster, namespace } = useWorkspace();
  const name = params.name;
  const ws = params[WORKSPACE_ROUTER_NAME];
  const k8sApi = useApi(K8sApi);
  const navigate = useNavigate();

  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<PipelineOrchestration>({
    tasks: [],
    finally: [],
  });

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
          setDraft({
            tasks: p.spec?.tasks || [],
            finally: p.spec?.finally || [],
          });
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

  const workspaces = useMemo(() => pipeline?.spec?.workspaces || [], [pipeline]);

  return (
    <Page>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <PipelineBreadcrumb />
          <Button
            type="primary"
            onClick={() => navigate(`../${ws}/update/${name}`)}
          >
            Update
          </Button>
        </div>

        {loading || !pipeline ? (
          <Spin />
        ) : (
          <>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="Name">
                {pipeline.metadata?.name}
              </Descriptions.Item>
              <Descriptions.Item label="Namespace">
                {pipeline.metadata?.namespace}
              </Descriptions.Item>
              <Descriptions.Item label="Tasks">
                {pipeline.spec?.tasks?.length ?? 0}
              </Descriptions.Item>
              <Descriptions.Item label="Finally">
                {pipeline.spec?.finally?.length ?? 0}
              </Descriptions.Item>
              <Descriptions.Item label="Description" span={2}>
                {pipeline.spec?.description || '-'}
              </Descriptions.Item>
            </Descriptions>

            <Typography.Title level={5} style={{ marginBottom: 0 }}>
              Orchestration
            </Typography.Title>
            <OrchestrationTab
              value={draft}
              onChange={setDraft}
              pipelineWorkspaces={workspaces}
              cluster={cluster}
              namespace={namespace}
            />
          </>
        )}
      </Space>
    </Page>
  );
}

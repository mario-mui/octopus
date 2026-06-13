/*
 * The pipeline editing page — a Form/YAML toggle over a tabbed editor (Detail /
 * Parameters / Orchestration / Results / Workspaces / Integrations), ported from
 * the console's `pipeline-form-container`. The Orchestration tab is the fully
 * built centerpiece; the others are functional editors over their `spec` slice.
 */
import { useMemo, useState } from 'react';
import {
  Button,
  Form,
  Input,
  Radio,
  Select,
  Space,
  Table,
  Tabs,
  Typography,
  message,
} from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { CodeEditor, yamlWriteOptions } from '@octopus/code-editor';
import { parse, stringify } from 'yaml';

import { OrchestrationTab } from './orchestration/OrchestrationTab';
import {
  ParameterDeclaration,
  ParameterType,
  Pipeline,
  PipelineOrchestration,
  PipelineResult,
  WorkspaceDeclaration,
} from '../types';

export interface PipelineFormProps {
  mode: 'create' | 'update';
  initial: Pipeline;
  cluster?: string;
  saving?: boolean;
  onSave: (pipeline: Pipeline) => void;
  onCancel: () => void;
}

export function PipelineForm({
  mode,
  initial,
  cluster,
  saving,
  onSave,
  onCancel,
}: PipelineFormProps) {
  const [view, setView] = useState<'form' | 'yaml'>('form');
  const [pipeline, setPipeline] = useState<Pipeline>(initial);
  const [yamlText, setYamlText] = useState('');
  const [yamlError, setYamlError] = useState<string | null>(null);

  const namespace = pipeline.metadata?.namespace;
  const spec = pipeline.spec || {};

  const patchMeta = (meta: Partial<NonNullable<Pipeline['metadata']>>) =>
    setPipeline(p => ({ ...p, metadata: { ...p.metadata, ...meta } }));
  const patchSpec = (next: Partial<Pipeline['spec']>) =>
    setPipeline(p => ({ ...p, spec: { ...p.spec, ...next } }));

  const orchestration: PipelineOrchestration = useMemo(
    () => ({ tasks: spec.tasks || [], finally: spec.finally || [] }),
    [spec.tasks, spec.finally],
  );

  const switchView = (next: 'form' | 'yaml') => {
    if (next === 'yaml') {
      setYamlText(stringify(pipeline));
      setYamlError(null);
    } else {
      try {
        setPipeline(parse(yamlText) as Pipeline);
        setYamlError(null);
      } catch (e) {
        setYamlError(`Invalid YAML: ${(e as Error).message}`);
        return;
      }
    }
    setView(next);
  };

  const handleSave = () => {
    let result = pipeline;
    if (view === 'yaml') {
      try {
        result = parse(yamlText) as Pipeline;
      } catch (e) {
        message.error(`Invalid YAML: ${(e as Error).message}`);
        return;
      }
    }
    if (!result.metadata?.name) {
      message.error('Pipeline name is required');
      return;
    }
    onSave(result);
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Radio.Group
          value={view}
          onChange={e => switchView(e.target.value)}
          optionType="button"
          buttonStyle="solid"
        >
          <Radio.Button value="form">Form</Radio.Button>
          <Radio.Button value="yaml">YAML</Radio.Button>
        </Radio.Group>
        <Space>
          <Button onClick={onCancel}>Cancel</Button>
          <Button type="primary" loading={saving} onClick={handleSave}>
            Save
          </Button>
        </Space>
      </div>

      {view === 'yaml' ? (
        <>
          {yamlError && (
            <Typography.Text type="danger">{yamlError}</Typography.Text>
          )}
          <CodeEditor
            value={yamlText}
            onChange={setYamlText}
            options={yamlWriteOptions}
            style={{ height: 600 }}
          />
        </>
      ) : (
        <Tabs
          items={[
            {
              key: 'detail',
              label: 'Detail',
              children: (
                <Form layout="vertical" style={{ maxWidth: 560 }}>
                  <Form.Item label="Name" required>
                    <Input
                      value={pipeline.metadata?.name}
                      disabled={mode === 'update'}
                      onChange={e => patchMeta({ name: e.target.value })}
                    />
                  </Form.Item>
                  <Form.Item label="Namespace" required>
                    <Input
                      value={namespace}
                      disabled={mode === 'update'}
                      onChange={e => patchMeta({ namespace: e.target.value })}
                    />
                  </Form.Item>
                  <Form.Item label="Description">
                    <Input.TextArea
                      value={spec.description}
                      onChange={e => patchSpec({ description: e.target.value })}
                      autoSize={{ minRows: 2, maxRows: 6 }}
                    />
                  </Form.Item>
                </Form>
              ),
            },
            {
              key: 'params',
              label: 'Parameters',
              children: (
                <ParamsDeclarationEditor
                  value={spec.params || []}
                  onChange={params => patchSpec({ params })}
                />
              ),
            },
            {
              key: 'orchestration',
              label: 'Orchestration',
              children: (
                <OrchestrationTab
                  value={orchestration}
                  onChange={next =>
                    patchSpec({ tasks: next.tasks, finally: next.finally })
                  }
                  pipelineWorkspaces={spec.workspaces || []}
                  cluster={cluster}
                  namespace={namespace}
                />
              ),
            },
            {
              key: 'results',
              label: 'Results',
              children: (
                <ResultsEditor
                  value={spec.results || []}
                  onChange={results => patchSpec({ results })}
                />
              ),
            },
            {
              key: 'workspaces',
              label: 'Workspaces',
              children: (
                <WorkspacesEditor
                  value={spec.workspaces || []}
                  onChange={workspaces => patchSpec({ workspaces })}
                />
              ),
            },
            {
              key: 'integrations',
              label: 'Integrations',
              children: (
                <Typography.Text type="secondary">
                  Integration bindings are not yet implemented in this port.
                </Typography.Text>
              ),
            },
          ]}
        />
      )}
    </Space>
  );
}

/* ----------------------------------------------------------- tab editors */

function ParamsDeclarationEditor({
  value,
  onChange,
}: {
  value: ParameterDeclaration[];
  onChange: (v: ParameterDeclaration[]) => void;
}) {
  const update = (i: number, patch: Partial<ParameterDeclaration>) =>
    onChange(value.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Table
        rowKey={(_, i) => String(i)}
        size="small"
        pagination={false}
        dataSource={value}
        columns={[
          {
            title: 'Name',
            render: (_, row, i) => (
              <Input
                value={row.name}
                onChange={e => update(i, { name: e.target.value })}
              />
            ),
          },
          {
            title: 'Type',
            width: 130,
            render: (_, row, i) => (
              <Select
                style={{ width: '100%' }}
                value={row.type || ParameterType.String}
                onChange={type => update(i, { type })}
                options={Object.values(ParameterType).map(t => ({
                  label: t,
                  value: t,
                }))}
              />
            ),
          },
          {
            title: 'Default',
            render: (_, row, i) => (
              <Input
                value={typeof row.default === 'string' ? row.default : ''}
                onChange={e => update(i, { default: e.target.value })}
              />
            ),
          },
          {
            title: '',
            width: 40,
            render: (_, _row, i) => (
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => onChange(value.filter((_, idx) => idx !== i))}
              />
            ),
          },
        ]}
      />
      <Button
        type="dashed"
        icon={<PlusOutlined />}
        onClick={() =>
          onChange([...value, { name: '', type: ParameterType.String }])
        }
      >
        Add parameter
      </Button>
    </Space>
  );
}

function ResultsEditor({
  value,
  onChange,
}: {
  value: PipelineResult[];
  onChange: (v: PipelineResult[]) => void;
}) {
  const update = (i: number, patch: Partial<PipelineResult>) =>
    onChange(value.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      {value.map((row, i) => (
        <Space key={i}>
          <Input
            placeholder="name"
            style={{ width: 180 }}
            value={row.name}
            onChange={e => update(i, { name: e.target.value })}
          />
          <Input
            placeholder="value e.g. $(tasks.x.results.y)"
            style={{ width: 320 }}
            value={typeof row.value === 'string' ? row.value : ''}
            onChange={e => update(i, { value: e.target.value })}
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => onChange(value.filter((_, idx) => idx !== i))}
          />
        </Space>
      ))}
      <Button
        type="dashed"
        icon={<PlusOutlined />}
        onClick={() => onChange([...value, { name: '', value: '' }])}
      >
        Add result
      </Button>
    </Space>
  );
}

function WorkspacesEditor({
  value,
  onChange,
}: {
  value: WorkspaceDeclaration[];
  onChange: (v: WorkspaceDeclaration[]) => void;
}) {
  const update = (i: number, patch: Partial<WorkspaceDeclaration>) =>
    onChange(value.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      {value.map((row, i) => (
        <Space key={i}>
          <Input
            placeholder="name"
            style={{ width: 200 }}
            value={row.name}
            onChange={e => update(i, { name: e.target.value })}
          />
          <Input
            placeholder="description"
            style={{ width: 300 }}
            value={row.description}
            onChange={e => update(i, { description: e.target.value })}
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => onChange(value.filter((_, idx) => idx !== i))}
          />
        </Space>
      ))}
      <Button
        type="dashed"
        icon={<PlusOutlined />}
        onClick={() => onChange([...value, { name: '' }])}
      >
        Add workspace
      </Button>
    </Space>
  );
}

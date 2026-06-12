/*
 * Shared create/update form for a namespace (see the create/update designs):
 * a Form/YAML mode toggle, a Basic Info section (Name + Display Name) and a More
 * Configurations section (Labels + Annotations key-value editors). In update
 * mode the name is read-only. The YAML mode edits the raw resource; switching
 * modes keeps the two in sync.
 */
import { useState } from 'react';
import { Button, Input, Radio, Space, Typography } from 'antd';
import { parse, stringify } from 'yaml';
import type { Namespace } from '@octopus/console-core-common';
import { KeyValueEditor } from './KeyValueEditor';
import {
  applyFormModel,
  toFormModel,
  type NamespaceFormModel,
} from './namespaceModel';

export interface NamespaceFormProps {
  mode: 'create' | 'update';
  /** The existing namespace for update mode (and metadata to preserve). */
  initial?: Namespace;
  submitting?: boolean;
  onSubmit: (resource: Namespace) => void;
  onCancel: () => void;
}

const SectionTitle = ({ children }: { children: string }) => (
  <Typography.Title
    level={5}
    style={{ borderLeft: '3px solid #1677ff', paddingLeft: 8, margin: '16px 0' }}
  >
    {children}
  </Typography.Title>
);

const Field = ({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) => (
  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
    <div style={{ width: 140, textAlign: 'right', paddingRight: 12 }}>
      {required && <span style={{ color: '#ff4d4f' }}>* </span>}
      {label}:
    </div>
    <div style={{ flex: 1, maxWidth: 720 }}>{children}</div>
  </div>
);

export function NamespaceForm({
  mode,
  initial,
  submitting,
  onSubmit,
  onCancel,
}: NamespaceFormProps) {
  const [view, setView] = useState<'form' | 'yaml'>('form');
  const [form, setForm] = useState<NamespaceFormModel>(() =>
    toFormModel(initial),
  );
  const [yamlText, setYamlText] = useState('');
  const [error, setError] = useState<string>();

  const patch = (next: Partial<NamespaceFormModel>) =>
    setForm(prev => ({ ...prev, ...next }));

  const switchView = (next: 'form' | 'yaml') => {
    setError(undefined);
    if (next === 'yaml') {
      setYamlText(stringify(applyFormModel(initial, form)));
    } else {
      try {
        setForm(toFormModel(parse(yamlText) as Namespace));
      } catch (e) {
        setError(`Invalid YAML: ${(e as Error).message}`);
        return;
      }
    }
    setView(next);
  };

  const handleSubmit = () => {
    setError(undefined);
    if (view === 'yaml') {
      try {
        onSubmit(parse(yamlText) as Namespace);
      } catch (e) {
        setError(`Invalid YAML: ${(e as Error).message}`);
      }
      return;
    }
    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }
    onSubmit(applyFormModel(initial, form));
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {mode === 'create' ? 'Create Namespace' : `Update ${form.name}`}
        </Typography.Title>
        <Radio.Group
          value={view}
          onChange={e => switchView(e.target.value)}
          optionType="button"
          buttonStyle="solid"
        >
          <Radio.Button value="form">Form</Radio.Button>
          <Radio.Button value="yaml">YAML</Radio.Button>
        </Radio.Group>
      </div>

      {error && <Typography.Text type="danger">{error}</Typography.Text>}

      {view === 'yaml' ? (
        <Input.TextArea
          value={yamlText}
          onChange={e => setYamlText(e.target.value)}
          autoSize={{ minRows: 16, maxRows: 32 }}
          style={{ fontFamily: 'monospace' }}
        />
      ) : (
        <>
          <SectionTitle>Basic Info</SectionTitle>
          <Field label="Name" required={mode === 'create'}>
            {mode === 'create' ? (
              <Input
                value={form.name}
                onChange={e => patch({ name: e.target.value })}
              />
            ) : (
              <Typography.Text>{form.name}</Typography.Text>
            )}
          </Field>
          <Field label="Display Name">
            <Input
              value={form.displayName}
              onChange={e => patch({ displayName: e.target.value })}
            />
          </Field>

          <SectionTitle>More Configurations</SectionTitle>
          <Field label="Labels">
            <KeyValueEditor
              items={form.labels}
              onChange={labels => patch({ labels })}
              emptyText="No labels found"
            />
          </Field>
          <Field label="Annotations">
            <KeyValueEditor
              items={form.annotations}
              onChange={annotations => patch({ annotations })}
              emptyText="No annotations found"
            />
          </Field>
        </>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button type="primary" loading={submitting} onClick={handleSubmit}>
          {mode === 'create' ? 'Create' : 'Update'}
        </Button>
        <Button onClick={onCancel}>Cancel</Button>
      </div>
    </Space>
  );
}

/*
 * Preview enhancement — a button that fetches a resource (or posts a dry-run)
 * and shows the result, as YAML or as an article (subject + html body). Ported
 * from the pipeline `advanced-form` preview capability.
 */
import { useState } from 'react';
import { Button, Modal, Tooltip } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { stringify } from 'yaml';
import { useDynamicFormContext } from './context';
import { evalExpr } from './expression';
import { getPath } from './util';
import { PreviewConfig } from './widgets';

function readPathOrExp(
  data: unknown,
  path: string,
  exp: string,
  scope: Record<string, unknown>,
): unknown {
  if (exp) {
    return evalExpr(exp, { ...scope, $: data });
  }
  if (path) {
    return getPath(data, path);
  }
  return data;
}

export interface PreviewButtonProps {
  preview: PreviewConfig;
  scope: Record<string, unknown>;
}

export function PreviewButton({ preview, scope }: PreviewButtonProps) {
  const ctx = useDynamicFormContext();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const enabled = !!evalExpr(preview.enableExpr, scope);

  const run = async () => {
    if (!ctx.fetchResource) {
      return;
    }
    setOpen(true);
    setLoading(true);
    setSubject('');
    setBody('');
    try {
      const url = preview.api.replace(/\$\{([\s\S]+?)\}/g, (_, e) =>
        String(evalExpr(e, scope) ?? ''),
      );
      const data = await ctx.fetchResource(url, {
        method: preview.method,
        body: preview.body ? evalExpr(preview.body, scope) : undefined,
      });
      const resource = readPathOrExp(
        data,
        preview.resourcePath,
        preview.resourcePathExp,
        scope,
      );
      if (preview.format === 'article') {
        setSubject(
          String(
            readPathOrExp(resource, preview.subjectPath, preview.subjectPathExp, scope) ?? '',
          ),
        );
        setBody(
          String(
            readPathOrExp(resource, preview.bodyPath, preview.bodyPathExp, scope) ?? '',
          ),
        );
      } else {
        setBody(stringify(resource ?? {}));
      }
    } catch (error) {
      setBody(String((error as Error).message));
    } finally {
      setLoading(false);
    }
  };

  const button = (
    <Button
      type="link"
      size="small"
      icon={<EyeOutlined />}
      disabled={!enabled}
      onClick={run}
    >
      Preview
    </Button>
  );

  return (
    <>
      {preview.tooltip ? (
        <Tooltip title={preview.tooltip.en ?? preview.tooltip.zh}>{button}</Tooltip>
      ) : (
        button
      )}
      <Modal
        open={open}
        title="Preview"
        footer={null}
        onCancel={() => setOpen(false)}
        width={720}
        loading={loading}
      >
        {preview.format === 'article' ? (
          <div>
            {subject ? <h3>{subject}</h3> : null}
            {/* Body is server-rendered html for the article format. */}
            <div dangerouslySetInnerHTML={{ __html: body }} />
          </div>
        ) : (
          <pre style={{ maxHeight: 480, overflow: 'auto', margin: 0 }}>{body}</pre>
        )}
      </Modal>
    </>
  );
}

/*
 * Renders a pipeline task's parameter bindings as a descriptor-driven dynamic
 * form. The backing Task declares its params (`spec.params`) and may carry
 * `style.tekton.dev/descriptors` to enhance each control; this maps them onto
 * @octopus/dynamic-form, falling back to a plain input for params without a
 * descriptor. Values are the `PipelineTask.params` `{ name, value }[]`.
 *
 * The expression context exposes `{ cluster, namespace, project, params }`, and
 * dynamic `options` are fetched through the app's auth-aware `fetch`.
 */
import { useCallback, useMemo } from 'react';
import { Input, Typography } from 'antd';
import { useApi, fetchApiRef } from '@octopus/core-plugin-api';
import { API_GATEWAY } from '@octopus/console-core-common';
import { ArrayFormTable } from '@octopus/console-core-components';
import {
  DynamicField,
  DynamicFormProvider,
  findParamDescriptor,
  getFieldType,
  getOperandField,
  parseDescriptors,
} from '@octopus/dynamic-form';

import { ParameterInputSet, ParameterType, Task } from '../../types';

const DESCRIPTORS_ANNOTATION = 'style.tekton.dev/descriptors';

export interface DynamicParamsFormProps {
  taskResource: Task | null;
  cluster?: string;
  namespace?: string;
  value: ParameterInputSet[];
  onChange: (value: ParameterInputSet[]) => void;
  /** Render only the declared params with these names (default: all). */
  paramNames?: string[];
}

export function DynamicParamsForm({
  taskResource,
  cluster,
  namespace,
  value,
  onChange,
  paramNames,
}: DynamicParamsFormProps) {
  const fetchApi = useApi(fetchApiRef);

  const allDeclaredParams = taskResource?.spec?.params ?? [];
  const declaredParams = paramNames
    ? allDeclaredParams.filter(p => paramNames.includes(p.name))
    : allDeclaredParams;
  const descriptors = useMemo(
    () =>
      parseDescriptors(
        taskResource?.metadata?.annotations?.[DESCRIPTORS_ANNOTATION],
      ),
    [taskResource],
  );

  // Current bindings as { name: value } for `context.params.*` in expressions.
  const paramsMap = useMemo(() => {
    const map: Record<string, unknown> = {};
    for (const p of value) {
      map[p.name] = p.value;
    }
    return map;
  }, [value]);

  const context = useMemo(
    () => ({
      cluster: cluster ?? '',
      namespace: namespace ?? '',
      project: '',
      params: paramsMap,
    }),
    [cluster, namespace, paramsMap],
  );

  const fetchResource = useCallback(
    async (
      url: string,
      opts?: {
        query?: Record<string, string>;
        method?: 'get' | 'post';
        body?: unknown;
      },
    ) => {
      const qs = opts?.query
        ? new URLSearchParams(opts.query).toString()
        : '';
      const post = opts?.method === 'post';
      const res = await fetchApi.fetch(
        `${API_GATEWAY}${url}${qs ? `${url.includes('?') ? '&' : '?'}${qs}` : ''}`,
        {
          method: post ? 'POST' : 'GET',
          headers: {
            Accept: 'application/json',
            ...(post ? { 'Content-Type': 'application/json' } : {}),
          },
          credentials: 'include',
          ...(post && opts?.body != null
            ? { body: JSON.stringify(opts.body) }
            : {}),
        },
      );
      if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`);
      }
      return res.json();
    },
    [fetchApi],
  );

  // The committed binding value, or the declaration's default when unset, so a
  // param like `image-pull-policy` shows its default (e.g. "Always") selected.
  const valueOf = (name: string) => value.find(p => p.name === name)?.value;
  const displayValue = (name: string, fallback: unknown) => {
    const committed = valueOf(name);
    return committed === undefined ? fallback : committed;
  };
  const setValue = (name: string, next: unknown) => {
    const existing = value.some(p => p.name === name);
    onChange(
      existing
        ? value.map(p => (p.name === name ? { ...p, value: next as string } : p))
        : [...value, { name, value: next as string }],
    );
  };

  if (!declaredParams.length) {
    // With a name filter (e.g. the Additional block) an empty subset renders
    // nothing; only the unfiltered "whole task" view shows the empty hint.
    return paramNames ? null : (
      <Typography.Text type="secondary">
        This task declares no parameters.
      </Typography.Text>
    );
  }

  return (
    <DynamicFormProvider context={context} fetchResource={fetchResource}>
      {declaredParams.map(param => {
        const descriptor = findParamDescriptor(descriptors, param.name);
        // Use the dynamic field only when the descriptor declares a control.
        const hasControl =
          descriptor && getFieldType(getOperandField(descriptor).capabilities);
        if (descriptor && hasControl) {
          return (
            <DynamicField
              key={param.name}
              descriptor={descriptor}
              value={displayValue(param.name, param.default)}
              onChange={next => setValue(param.name, next)}
            />
          );
        }
        // Array params (e.g. a task's extra args) get a row-per-value editor
        // instead of the plain text input — see design/image.png.
        if (param.type === ParameterType.Array) {
          const raw = displayValue(param.name, param.default);
          // Tekton allows a single string where an array is expected; adapt it
          // to a one-element list as the Angular form did.
          const items: string[] = Array.isArray(raw)
            ? (raw as string[])
            : raw == null
              ? []
              : [String(raw)];
          const replaceAt = (index: number, next: string) =>
            setValue(
              param.name,
              items.map((v, i) => (i === index ? next : v)),
            );
          return (
            <div key={param.name} style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 4, fontSize: 13 }}>
                {param.name}{' '}
                <Typography.Text type="secondary">(array)</Typography.Text>
              </div>
              <ArrayFormTable
                rows={items}
                renderRow={(_, index) => (
                  <td>
                    <Input
                      value={items[index] ?? ''}
                      onChange={e => replaceAt(index, e.target.value)}
                    />
                  </td>
                )}
                onAdd={() => setValue(param.name, [...items, ''])}
                onRemove={index =>
                  setValue(
                    param.name,
                    items.filter((_, i) => i !== index),
                  )
                }
              />
              {param.description ? (
                <div style={{ marginTop: 4, fontSize: 12, color: '#888' }}>
                  {param.description}
                </div>
              ) : null}
            </div>
          );
        }

        // Fallback: a plain text input labelled by the declared param.
        return (
          <div key={param.name} style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 4, fontSize: 13 }}>{param.name}</div>
            <Input
              value={(displayValue(param.name, param.default) as string) ?? ''}
              onChange={e => setValue(param.name, e.target.value)}
            />
            {param.description ? (
              <div style={{ marginTop: 4, fontSize: 12, color: '#888' }}>
                {param.description}
              </div>
            ) : null}
          </div>
        );
      })}
    </DynamicFormProvider>
  );
}

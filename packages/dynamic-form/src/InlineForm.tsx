/*
 * inlineForm widget — a nested dynamic form whose definition comes from an
 * external resource (ported from the pipeline `advanced-form` inlineForm).
 *
 * Flow: fetch the resource (`inlineForm:resource:api`, path-extracted) → derive
 * its descriptors (a path, else its `style.tekton.dev/descriptors` annotation)
 * and params (a path, else `spec.params`) → render one nested `DynamicField`
 * per param. The nested value is a `{ name, value }[]`, parsed from / stringified
 * to the field's own value via the `inlineForm:parse` / `inlineForm:stringify`
 * expressions (which get yaml `parse`/`stringify` helpers + `$`).
 */
import { useEffect, useMemo, useState } from 'react';
import { Spin } from 'antd';
import { parse as yamlParse, stringify as yamlStringify } from 'yaml';
import { DynamicFormProvider, buildScope, useDynamicFormContext } from './context';
import { evalExpr, interpolate } from './expression';
import { getInlineFormConfig } from './widgets';
import { parseDescriptors, findParamDescriptor } from './capability';
import { getPath } from './util';
import { Descriptor } from './types';
import { DynamicField } from './DynamicField';

const DESCRIPTORS_ANNOTATION = 'style.tekton.dev/descriptors';

interface InlineParam {
  name: string;
  default?: unknown;
  description?: string;
}

interface ParamValue {
  name: string;
  value: unknown;
}

export interface InlineFormFieldProps {
  descriptor: Descriptor;
  value: unknown;
  onChange: (value: unknown) => void;
}

/** Read a `:path:` / `:path.exp:` accessor against a resource (`$`). */
function readResourcePath(
  data: unknown,
  path: string,
  exp: string,
  scope: Record<string, unknown>,
  fallback?: unknown,
): unknown {
  if (exp) {
    return evalExpr(exp, { ...scope, $: data });
  }
  if (path) {
    return getPath(data, path, fallback);
  }
  return fallback;
}

export function InlineFormField({ descriptor, value, onChange }: InlineFormFieldProps) {
  const ctx = useDynamicFormContext();
  const capabilities = (descriptor['x-descriptors'] ?? []).filter(
    (c): c is string => typeof c === 'string',
  );
  const cfg = useMemo(() => getInlineFormConfig(capabilities), [descriptor]);
  const contextKey = useMemo(() => JSON.stringify(ctx.context), [ctx.context]);

  const [resource, setResource] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ParamValue[]>([]);

  // yaml-aware scope for parse/stringify/resource expressions.
  const evalScope = (dollar: unknown) => ({
    ...buildScope(ctx),
    $: dollar,
    parse: yamlParse,
    stringify: yamlStringify,
  });

  // Fetch + extract the source resource.
  useEffect(() => {
    if (!cfg.api || !ctx.fetchResource) {
      setResource(null);
      return;
    }
    let ignore = false;
    setLoading(true);
    ctx
      .fetchResource(interpolate(cfg.api, buildScope(ctx)))
      .then(res => {
        if (!ignore) {
          setResource(
            readResourcePath(res, cfg.resourcePath, cfg.resourcePathExp, evalScope(res), res),
          );
        }
      })
      .catch(() => {
        if (!ignore) {
          setResource(null);
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg.api, contextKey]);

  const descriptors: Descriptor[] = useMemo(() => {
    if (!resource) {
      return [];
    }
    if (cfg.descriptorsPath || cfg.descriptorsPathExp) {
      const raw = readResourcePath(
        resource,
        cfg.descriptorsPath,
        cfg.descriptorsPathExp,
        evalScope(resource),
      );
      return Array.isArray(raw) ? (raw as Descriptor[]) : [];
    }
    const annotation = (resource as { metadata?: { annotations?: Record<string, string> } })
      ?.metadata?.annotations?.[DESCRIPTORS_ANNOTATION];
    return parseDescriptors(annotation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource]);

  const params: InlineParam[] = useMemo(() => {
    if (!resource) {
      return [];
    }
    const raw =
      cfg.paramsPath || cfg.paramsPathExp
        ? readResourcePath(resource, cfg.paramsPath, cfg.paramsPathExp, evalScope(resource))
        : getPath(resource, 'spec.params', []);
    return Array.isArray(raw) ? (raw as InlineParam[]) : [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource]);

  // Parse the field value into the nested {name,value}[] once the resource loads.
  useEffect(() => {
    const parsed = evalExpr(cfg.parse, evalScope(value));
    setItems(Array.isArray(parsed) ? (parsed as ParamValue[]) : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource]);

  const valueOf = (name: string) => items.find(p => p.name === name)?.value;
  const setParam = (name: string, next: unknown) => {
    const nextItems = items.some(p => p.name === name)
      ? items.map(p => (p.name === name ? { ...p, value: next } : p))
      : [...items, { name, value: next }];
    setItems(nextItems);
    onChange(evalExpr(cfg.stringify, evalScope(nextItems)));
  };

  if (loading) {
    return <Spin size="small" />;
  }

  return (
    <DynamicFormProvider
      context={ctx.context}
      fetchResource={ctx.fetchResource}
      locale={ctx.locale}
    >
      {params.map(param => {
        const childDescriptor =
          findParamDescriptor(descriptors, param.name) ??
          ({ path: `params.${param.name}`, 'x-descriptors': [] } as Descriptor);
        return (
          <DynamicField
            key={param.name}
            descriptor={childDescriptor}
            value={valueOf(param.name) ?? param.default}
            onChange={v => setParam(param.name, v)}
          />
        );
      })}
    </DynamicFormProvider>
  );
}

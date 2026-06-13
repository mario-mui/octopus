/*
 * Expression engine — ported from the console's `crd-form`
 * (`field-controls/expressions/*` + the dynamic logic in `crd-form/component.ts`).
 *
 * Two evaluation modes, both over a scope object whose keys are exposed as bare
 * identifiers (via `with`), matching lodash-template's behaviour in the console:
 *  - interpolation: fill `${…}` in a string (api paths, default/hidden);
 *  - expression: evaluate a whole JS expression (`*.exp`, options `path.exp`).
 *
 * Plus the capability parsing + resolution for the P2 dynamics: dynamic select
 * `options` (static / api / expression), `default` (value / `default.exp`), and
 * `hidden` (`hidden.exp`).
 */
import {
  OperandField,
  SelectOption,
  SpecCapability,
} from './types';
import { getMatchedCapabilityValue, getStaticSelectOptions } from './capability';
import { getPath } from './util';

const EXPRESSION_PROPS_PREFIX = `${SpecCapability.expression}props.`;
const EXPRESSION_PROPS_OPTIONS_PREFIX = `${EXPRESSION_PROPS_PREFIX}options:`;
const EXPRESSION_PROPS_DEFAULT_PREFIX = `${EXPRESSION_PROPS_PREFIX}default:`;
const EXPRESSION_PROPS_DEFAULT_EXP_PREFIX = `${EXPRESSION_PROPS_PREFIX}default.exp:`;
const EXPRESSION_PROPS_HIDDEN_PREFIX = `${EXPRESSION_PROPS_PREFIX}hidden:`;
const EXPRESSION_PROPS_HIDDEN_EXP_PREFIX = `${EXPRESSION_PROPS_PREFIX}hidden.exp:`;

/** Evaluate a JS expression with `scope`'s keys in scope. Returns undefined on error. */
export function evalExpr(expression: string, scope: Record<string, unknown>): unknown {
  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    const fn = new Function('__scope__', `with(__scope__){ return (${expression}); }`);
    return fn(scope);
  } catch {
    return undefined;
  }
}

/** Replace every `${…}` in `template` with the evaluated, stringified result. */
export function interpolate(template: string, scope: Record<string, unknown>): string {
  return template.replace(/\$\{([\s\S]+?)\}/g, (_, expr) => {
    const value = evalExpr(expr, scope);
    return value == null ? '' : String(value);
  });
}

/** A `:path:` (plain) or `:path.exp:` (per-item JS) accessor. */
export interface PathOrExp {
  path: string;
  exp: string;
}

export interface OptionsExpression {
  api: string;
  /** How to extract the list from the api response. */
  list: PathOrExp;
  label: PathOrExp;
  value: PathOrExp;
  description: PathOrExp;
  /** `api:params:<key>:<template>` query params (support `current.search`). */
  searchParams: Array<{ key: string; template: string }>;
}

function pathOrExp(capabilities: string[], base: string): PathOrExp {
  return {
    path: getMatchedCapabilityValue(capabilities, `${base}path:`),
    exp: getMatchedCapabilityValue(capabilities, `${base}path.exp:`),
  };
}

export function parseOptionsExpression(
  capabilities: string[],
): OptionsExpression | null {
  if (!capabilities.some(c => c.startsWith(EXPRESSION_PROPS_OPTIONS_PREFIX))) {
    return null;
  }
  const apiPrefix = `${EXPRESSION_PROPS_OPTIONS_PREFIX}api:`;
  const apiParamsPrefix = `${apiPrefix}params:`;
  const api =
    capabilities
      .find(c => c.startsWith(apiPrefix) && !c.startsWith(apiParamsPrefix))
      ?.slice(apiPrefix.length) || '';
  const searchParams = capabilities
    .filter(c => c.startsWith(apiParamsPrefix))
    .map(c => c.slice(apiParamsPrefix.length))
    .map(rest => {
      const idx = rest.indexOf(':');
      return idx < 0
        ? { key: rest, template: '' }
        : { key: rest.slice(0, idx), template: rest.slice(idx + 1) };
    });
  return {
    api,
    list: pathOrExp(capabilities, EXPRESSION_PROPS_OPTIONS_PREFIX),
    label: pathOrExp(capabilities, `${EXPRESSION_PROPS_OPTIONS_PREFIX}label:`),
    value: pathOrExp(capabilities, `${EXPRESSION_PROPS_OPTIONS_PREFIX}value:`),
    description: pathOrExp(capabilities, `${EXPRESSION_PROPS_OPTIONS_PREFIX}description:`),
    searchParams,
  };
}

export interface DefaultExpression {
  value: string;
  expression: string;
}

export function parseDefaultExpression(
  capabilities: string[],
): DefaultExpression | null {
  const present = capabilities.some(
    c =>
      c.startsWith(EXPRESSION_PROPS_DEFAULT_PREFIX) ||
      c.startsWith(EXPRESSION_PROPS_DEFAULT_EXP_PREFIX),
  );
  return present
    ? {
        value: getMatchedCapabilityValue(capabilities, EXPRESSION_PROPS_DEFAULT_PREFIX),
        expression: getMatchedCapabilityValue(capabilities, EXPRESSION_PROPS_DEFAULT_EXP_PREFIX),
      }
    : null;
}

/** The `hidden`/`hidden.exp` template, or '' when none. */
export function parseHiddenExpression(capabilities: string[]): string {
  return (
    getMatchedCapabilityValue(capabilities, EXPRESSION_PROPS_HIDDEN_EXP_PREFIX) ||
    getMatchedCapabilityValue(capabilities, EXPRESSION_PROPS_HIDDEN_PREFIX)
  );
}

/** Read a `:path:` / `:path.exp:` accessor against an item (`$`). */
function readPathOrExp(
  item: unknown,
  acc: PathOrExp,
  scope: Record<string, unknown>,
  fallback?: unknown,
): unknown {
  if (acc.exp) {
    return evalExpr(acc.exp, { ...scope, $: item });
  }
  if (acc.path) {
    return getPath(item, acc.path, fallback);
  }
  return fallback;
}

/** Map a raw resource item to a `{ label, value, description, resource }` option. */
function toOption(
  item: unknown,
  opts: OptionsExpression,
  scope: Record<string, unknown>,
): SelectOption {
  const value = readPathOrExp(item, opts.value, scope, item);
  const description = readPathOrExp(item, opts.description, scope, undefined);
  return {
    label: String(readPathOrExp(item, opts.label, scope, value ?? item)),
    value,
    description: description == null ? undefined : String(description),
    resource: item,
  };
}

/** Extract the list from an api response, via `path` / `path.exp` / identity. */
function extractList(
  data: unknown,
  opts: OptionsExpression,
  scope: Record<string, unknown>,
): unknown[] {
  const list = opts.list.exp
    ? evalExpr(opts.list.exp, { ...scope, $: data })
    : opts.list.path
      ? getPath(data, opts.list.path, [])
      : data;
  return Array.isArray(list) ? list : [];
}

/**
 * Resolve a select field's options: static list, an `api` fetch (path-mapped,
 * with optional search query), or a standalone `path.exp` expression.
 * `fetchResource` is injected by the host; `search` feeds `current.search`.
 */
export async function resolveOptions(
  field: OperandField,
  scope: Record<string, unknown>,
  fetchResource?: (
    url: string,
    opts?: { query?: Record<string, string>; method?: 'get' | 'post'; body?: unknown },
  ) => Promise<unknown>,
  search = '',
): Promise<SelectOption[]> {
  const opts = parseOptionsExpression(field.capabilities);
  if (!opts) {
    return getStaticSelectOptions(field.capabilities).map(value => ({
      label: value,
      value,
    }));
  }
  const searchScope = { ...scope, current: { search } };

  // Standalone expression options (no api).
  if (!opts.api && opts.list.exp) {
    const result = evalExpr(opts.list.exp, searchScope);
    return Array.isArray(result) ? (result as SelectOption[]) : [];
  }
  if (!opts.api || !fetchResource) {
    return [];
  }
  try {
    const query: Record<string, string> = {};
    for (const { key, template } of opts.searchParams) {
      const v = interpolate(template, searchScope);
      if (v) {
        query[key] = v;
      }
    }
    const data = await fetchResource(interpolate(opts.api, searchScope), { query });
    const mapped = extractList(data, opts, searchScope).map(item =>
      toOption(item, opts, searchScope),
    );
    // Dedup by value, drop empty values (cf. the console's uniqBy + filter).
    const seen = new Set<unknown>();
    return mapped.filter(o => {
      if (o.value == null || o.value === '' || seen.has(o.value)) {
        return false;
      }
      seen.add(o.value);
      return true;
    });
  } catch {
    return [];
  }
}

/** Whether the field's options depend on `current.search` (server-side search). */
export function isSearchableOptions(capabilities: string[]): boolean {
  const opts = parseOptionsExpression(capabilities);
  if (!opts) {
    return false;
  }
  return (
    opts.api.includes('current.search') ||
    opts.searchParams.some(p => p.template.includes('current.search'))
  );
}

/** Resolve whether the field is hidden, given the current scope. */
export function resolveHidden(
  field: OperandField,
  scope: Record<string, unknown>,
): boolean {
  if (field.capabilities.includes(SpecCapability.hidden)) {
    return true;
  }
  const hidden = parseHiddenExpression(field.capabilities);
  return hidden ? interpolate(hidden, scope) === 'true' : false;
}

/**
 * Resolve a field's dynamic default value. A fixed `value` is interpolated; a
 * `default.exp` is evaluated against each option (`option`/`index`/`length`),
 * returning the first matching option's value.
 */
export function resolveDefault(
  field: OperandField,
  scope: Record<string, unknown>,
  options: SelectOption[],
): unknown {
  const def = parseDefaultExpression(field.capabilities);
  if (!def) {
    return undefined;
  }
  if (def.value) {
    return interpolate(def.value, scope);
  }
  if (!def.expression) {
    return undefined;
  }
  const match = options.find((option, index) =>
    Boolean(
      evalExpr(def.expression, {
        ...scope,
        option: option.resource ?? option.value,
        index,
        length: options.length,
      }),
    ),
  );
  return match?.value;
}

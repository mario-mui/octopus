/*
 * Conversion between a Namespace resource and the create/update form model, plus
 * a couple of small display helpers. The Display Name is stored as the platform
 * annotation `<baseDomain>/display-name`, so it is lifted out of the annotation
 * list into its own form field (matching the designs).
 */
import {
  DISPLAY_NAME,
  LABEL_BASE_DOMAIN,
  type Namespace,
} from '@octopus/console-core-common';
import type { KeyValue } from './KeyValueEditor';

export const DISPLAY_NAME_KEY = `${LABEL_BASE_DOMAIN}/${DISPLAY_NAME}`;

export interface NamespaceFormModel {
  name: string;
  displayName: string;
  labels: KeyValue[];
  annotations: KeyValue[];
}

function toKeyValues(map?: Record<string, string>): KeyValue[] {
  return Object.entries(map ?? {}).map(([key, value]) => ({ key, value }));
}

function fromKeyValues(items: KeyValue[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const { key, value } of items) {
    if (key.trim()) {
      out[key] = value;
    }
  }
  return out;
}

/** Build the editable form model from a (possibly empty) namespace. */
export function toFormModel(ns?: Namespace): NamespaceFormModel {
  const annotations = { ...(ns?.metadata?.annotations ?? {}) };
  const displayName = annotations[DISPLAY_NAME_KEY] ?? '';
  delete annotations[DISPLAY_NAME_KEY];
  return {
    name: ns?.metadata?.name ?? '',
    displayName,
    labels: toKeyValues(ns?.metadata?.labels),
    annotations: toKeyValues(annotations),
  };
}

/** Merge the form model back onto a base namespace (preserving its metadata). */
export function applyFormModel(
  base: Namespace | undefined,
  form: NamespaceFormModel,
): Namespace {
  const annotations = fromKeyValues(form.annotations);
  if (form.displayName.trim()) {
    annotations[DISPLAY_NAME_KEY] = form.displayName;
  }
  return {
    apiVersion: 'v1',
    kind: 'Namespace',
    ...base,
    metadata: {
      ...base?.metadata,
      name: form.name,
      labels: fromKeyValues(form.labels),
      annotations,
    },
  };
}

/** `2026-04-15T19:20:47Z` → `2026-04-15 19:20:47`. */
export function formatTimestamp(ts?: string): string {
  if (!ts) {
    return '-';
  }
  return ts.replace('T', ' ').replace(/\..*$/, '').replace(/Z$/, '');
}

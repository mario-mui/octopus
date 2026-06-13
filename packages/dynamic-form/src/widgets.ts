/*
 * P3 extended capabilities — ported from the pipeline `advanced-form`
 * (`widgets/index.ts` `PipelineSpecCapability`, `doc-link.ts`). The custom
 * widget kinds (`widgets:combine|inlineForm|select`) and the docLink / preview
 * enhancements, plus their parsers.
 */
import { Descriptor, Localized } from './types';
import { getMatchedCapabilityValue } from './capability';

export const WidgetCapability = {
  select: 'urn:alm:descriptor:widgets:select',
  combine: 'urn:alm:descriptor:widgets:combine',
  combineItems: 'urn:alm:descriptor:combine:items',
  combineValue: 'urn:alm:descriptor:combine:value.exp:',

  inlineForm: 'urn:alm:descriptor:widgets:inlineForm',
  inlineFormResourceApi: 'urn:alm:descriptor:inlineForm:resource:api:',
  inlineFormResourcePath: 'urn:alm:descriptor:inlineForm:resource:path:',
  inlineFormResourcePathExp: 'urn:alm:descriptor:inlineForm:resource:path.exp:',
  inlineFormDescriptorsPath: 'urn:alm:descriptor:inlineForm:descriptors:path:',
  inlineFormDescriptorsPathExp: 'urn:alm:descriptor:inlineForm:descriptors:path.exp:',
  inlineFormParamsPath: 'urn:alm:descriptor:inlineForm:params:path:',
  inlineFormParamsPathExp: 'urn:alm:descriptor:inlineForm:params:path.exp:',
  inlineFormStringify: 'urn:alm:descriptor:inlineForm:stringify:',
  inlineFormParse: 'urn:alm:descriptor:inlineForm:parse:',

  docLink: 'urn:alm:descriptor:enhance:docLink:',
  docLinkLink: 'urn:alm:descriptor:docLink:link:',
  docLinkLabel: 'urn:alm:descriptor:docLink:label:',

  preview: 'urn:alm:descriptor:enhance:preview:',
  previewResourceApi: 'urn:alm:descriptor:preview:resource:api:',
  previewResourceApiMethod: 'urn:alm:descriptor:preview:resource:api:method:',
  previewResourceApiBody: 'urn:alm:descriptor:preview:resource:api:body:',
  previewResourcePath: 'urn:alm:descriptor:preview:resource:path:',
  previewResourcePathExp: 'urn:alm:descriptor:preview:resource:path.exp:',
  previewSubjectPath: 'urn:alm:descriptor:preview:subject:path:',
  previewSubjectPathExp: 'urn:alm:descriptor:preview:subject:path.exp:',
  previewBodyPath: 'urn:alm:descriptor:preview:body:path:',
  previewBodyPathExp: 'urn:alm:descriptor:preview:body:path.exp:',
  previewFormat: 'urn:alm:descriptor:preview:format:',
  previewTooltip: 'urn:alm:descriptor:preview:tooltip:',
} as const;

export type CustomWidget = 'select' | 'combine' | 'inlineForm';

/** Which custom widget (`widgets:<x>`) a field declares, if any. */
export function getCustomWidget(capabilities: string[]): CustomWidget | undefined {
  if (capabilities.includes(WidgetCapability.combine)) {
    return 'combine';
  }
  if (capabilities.includes(WidgetCapability.inlineForm)) {
    return 'inlineForm';
  }
  if (capabilities.includes(WidgetCapability.select)) {
    return 'select';
  }
  return undefined;
}

/* -------------------------------------------------------------- combine */

/** The nested child descriptors of a combine field (from `combine:items`). */
export function getCombineItems(descriptor: Descriptor): Descriptor[] {
  const entry = descriptor['x-descriptors']?.find(
    d => typeof d === 'object' && d != null,
  ) as Record<string, unknown> | undefined;
  const items = entry?.[WidgetCapability.combineItems];
  return Array.isArray(items) ? (items as Descriptor[]) : [];
}

/** The `combine:value.exp` expression (parent⇄child value mapping). */
export function getCombineValueExp(descriptor: Descriptor): string {
  const caps = (descriptor['x-descriptors'] ?? []).filter(
    c => typeof c === 'string',
  ) as string[];
  return getMatchedCapabilityValue(caps, WidgetCapability.combineValue);
}

/* -------------------------------------------------------------- docLink */

export type DocLinkType = 'external' | 'productDoc';

export interface DocLink {
  type: DocLinkType;
  link: string;
  href?: string;
  label: Localized;
}

const DEFAULT_DOC_LINK_LABEL: Localized = { en: 'Documentation', zh: '文档' };

function externalHref(link: string): string | undefined {
  try {
    const url = new URL(link);
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

export function getDocLink(capabilities: string[]): DocLink | null {
  const type = getMatchedCapabilityValue(
    capabilities,
    WidgetCapability.docLink,
  ) as DocLinkType;
  const link = getMatchedCapabilityValue(capabilities, WidgetCapability.docLinkLink);
  if (!link || (type !== 'external' && type !== 'productDoc')) {
    return null;
  }
  const href = type === 'external' ? externalHref(link) : undefined;
  if (type === 'external' && !href) {
    return null;
  }
  const en = getMatchedCapabilityValue(capabilities, `${WidgetCapability.docLinkLabel}en:`);
  const zh = getMatchedCapabilityValue(capabilities, `${WidgetCapability.docLinkLabel}zh:`);
  return {
    type,
    link,
    href,
    label: en || zh ? { en: en || zh, zh: zh || en } : DEFAULT_DOC_LINK_LABEL,
  };
}

/* -------------------------------------------------------------- preview */

export type PreviewFormat = 'article' | 'default';

export interface PreviewConfig {
  /** Gate expression (`enhance:preview:<exp>`) — preview is available when truthy. */
  enableExpr: string;
  api: string;
  method: 'get' | 'post';
  body: string;
  resourcePath: string;
  resourcePathExp: string;
  subjectPath: string;
  subjectPathExp: string;
  bodyPath: string;
  bodyPathExp: string;
  format: PreviewFormat;
  tooltip: Localized | undefined;
}

/* ----------------------------------------------------------- inlineForm */

export interface InlineFormConfig {
  api: string;
  resourcePath: string;
  resourcePathExp: string;
  descriptorsPath: string;
  descriptorsPathExp: string;
  paramsPath: string;
  paramsPathExp: string;
  /** `$` = the inline form value ([{name,value}]) → the field value. */
  stringify: string;
  /** `$` = the field value → the inline form value ([{name,value}]). */
  parse: string;
}

export function getInlineFormConfig(capabilities: string[]): InlineFormConfig {
  return {
    api: getMatchedCapabilityValue(capabilities, WidgetCapability.inlineFormResourceApi),
    resourcePath: getMatchedCapabilityValue(capabilities, WidgetCapability.inlineFormResourcePath),
    resourcePathExp: getMatchedCapabilityValue(capabilities, WidgetCapability.inlineFormResourcePathExp),
    descriptorsPath: getMatchedCapabilityValue(capabilities, WidgetCapability.inlineFormDescriptorsPath),
    descriptorsPathExp: getMatchedCapabilityValue(capabilities, WidgetCapability.inlineFormDescriptorsPathExp),
    paramsPath: getMatchedCapabilityValue(capabilities, WidgetCapability.inlineFormParamsPath),
    paramsPathExp: getMatchedCapabilityValue(capabilities, WidgetCapability.inlineFormParamsPathExp),
    stringify: getMatchedCapabilityValue(capabilities, WidgetCapability.inlineFormStringify) || '$',
    parse: getMatchedCapabilityValue(capabilities, WidgetCapability.inlineFormParse) || '$',
  };
}

export function getPreviewConfig(capabilities: string[]): PreviewConfig | null {
  const enableExpr = getMatchedCapabilityValue(capabilities, WidgetCapability.preview);
  const api = getMatchedCapabilityValue(capabilities, WidgetCapability.previewResourceApi);
  if (!enableExpr || !api) {
    return null;
  }
  const tipEn = getMatchedCapabilityValue(capabilities, `${WidgetCapability.previewTooltip}en:`);
  const tipZh = getMatchedCapabilityValue(capabilities, `${WidgetCapability.previewTooltip}zh:`);
  return {
    enableExpr,
    api,
    method:
      (getMatchedCapabilityValue(capabilities, WidgetCapability.previewResourceApiMethod) as
        | 'get'
        | 'post') || 'get',
    body: getMatchedCapabilityValue(capabilities, WidgetCapability.previewResourceApiBody),
    resourcePath: getMatchedCapabilityValue(capabilities, WidgetCapability.previewResourcePath),
    resourcePathExp: getMatchedCapabilityValue(capabilities, WidgetCapability.previewResourcePathExp),
    subjectPath: getMatchedCapabilityValue(capabilities, WidgetCapability.previewSubjectPath),
    subjectPathExp: getMatchedCapabilityValue(capabilities, WidgetCapability.previewSubjectPathExp),
    bodyPath: getMatchedCapabilityValue(capabilities, WidgetCapability.previewBodyPath),
    bodyPathExp: getMatchedCapabilityValue(capabilities, WidgetCapability.previewBodyPathExp),
    format:
      (getMatchedCapabilityValue(capabilities, WidgetCapability.previewFormat) as PreviewFormat) ||
      'default',
    tooltip: tipEn || tipZh ? { en: tipEn || tipZh, zh: tipZh || tipEn } : undefined,
  };
}

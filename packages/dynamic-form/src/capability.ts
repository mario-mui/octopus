/*
 * Capability parsing — ported from the console's `crd-form` (`utils/capability.ts`
 * + `utils/helper.ts`). Pure string parsing over a field's `capabilities` list:
 * the control kind, meta (label/description/placeholder/tooltip), validations,
 * and the static option sets (radio / booleanSwitch / select options).
 */
import { parse } from 'yaml';
import {
  Descriptor,
  FieldType,
  Localized,
  OperandField,
  OperandFieldValidation,
  SpecCapability,
  Validations,
} from './types';

/** Parse the `style.tekton.dev/descriptors` YAML annotation into descriptors. */
export function parseDescriptors(annotation: string | undefined): Descriptor[] {
  if (!annotation) {
    return [];
  }
  try {
    const parsed = parse(annotation) as Descriptor[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Find the descriptor for a parameter (matches `params.<name>`). */
export function findParamDescriptor(
  descriptors: Descriptor[],
  paramName: string,
): Descriptor | undefined {
  return descriptors.find(d => d.path === `params.${paramName}`);
}

/** The substring of the first capability starting with `prefix`. */
export function getMatchedCapabilityValue(
  capabilities: string[],
  prefix: string,
): string {
  return (
    capabilities.find(c => c.startsWith(prefix))?.slice(prefix.length) || ''
  );
}

const SupportValidation = Object.values(Validations).join('|');
const REGEXP_VALIDATION_SUFFIX = new RegExp(
  `^${SpecCapability.validation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(${SupportValidation})(?::(.+))?$`,
);

/* Field type resolution: the first matching UI capability wins. */
const UI_FIELDS: Array<{ type: FieldType; cap: SpecCapability; prefix?: boolean }> = [
  { type: 'text', cap: SpecCapability.text },
  { type: 'textarea', cap: SpecCapability.textarea },
  { type: 'booleanSwitch', cap: SpecCapability.booleanSwitch },
  { type: 'select', cap: SpecCapability.select, prefix: true },
  { type: 'yaml', cap: SpecCapability.yaml },
  { type: 'radio', cap: SpecCapability.radio, prefix: true },
  { type: 'custom', cap: SpecCapability.custom, prefix: true },
  { type: 'tagsInput', cap: SpecCapability.tagsInput, prefix: true },
];

export function getFieldType(capabilities: string[]): FieldType | undefined {
  return UI_FIELDS.find(f =>
    f.prefix
      ? capabilities.some(c => c.startsWith(f.cap))
      : capabilities.includes(f.cap),
  )?.type;
}

/** Radio options: `radio:<value>` plus optional `radio:<value>:en|zh:<label>`. */
export function getRadioOptions(
  capabilities: string[],
): Array<{ value: string; display: Localized }> {
  const items = capabilities
    .filter(c => c.startsWith(SpecCapability.radio))
    .map(c => c.slice(SpecCapability.radio.length));
  return items
    .filter(item => item.split(':').length === 1)
    .map(item => {
      const zhPrefix = `${item}:zh:`;
      const enPrefix = `${item}:en:`;
      const zh = items.find(v => v.startsWith(zhPrefix))?.slice(zhPrefix.length);
      const en = items.find(v => v.startsWith(enPrefix))?.slice(enPrefix.length);
      return { value: item, display: { zh: zh ?? item, en: en ?? item } };
    });
}

/** Map a boolean to its adapted string value (`props:booleanSwitch:true:True`). */
export function getBooleanSwitchOptions(capabilities: string[]) {
  const items = capabilities
    .filter(c => c.startsWith(SpecCapability.booleanSwitchValueAdapted))
    .map(c => c.slice(SpecCapability.booleanSwitchValueAdapted.length));
  return (['true', 'false'] as const).map(key => {
    const adapted = items
      .find(v => v.startsWith(`${key}:`))
      ?.slice(`${key}:`.length);
    return { switchValue: key === 'true', value: adapted ?? key === 'true' };
  });
}

/** Static select options (`props:select:options:<value>`). */
export function getStaticSelectOptions(capabilities: string[]): string[] {
  return capabilities
    .filter(c => c.startsWith(SpecCapability.selectOptions))
    .map(c => c.slice(SpecCapability.selectOptions.length));
}

/** Localised value from `<prefix>en:` / `<prefix>zh:` capabilities. */
function getLocalized(
  capabilities: string[],
  prefix: string,
  fallback?: string,
): Localized | undefined {
  const en = getMatchedCapabilityValue(capabilities, `${prefix}en:`) || undefined;
  const zh = getMatchedCapabilityValue(capabilities, `${prefix}zh:`) || undefined;
  if (en || zh) {
    return { en: en ?? zh ?? fallback, zh: zh ?? en ?? fallback };
  }
  return fallback ? { en: fallback, zh: fallback } : undefined;
}

export function getDisplayName(field: OperandField): Localized | undefined {
  const en = getMatchedCapabilityValue(field.capabilities, SpecCapability.labelEn);
  const zh = getMatchedCapabilityValue(field.capabilities, SpecCapability.labelZh);
  if (en || zh) {
    return { en: en || zh, zh: zh || en };
  }
  return field.displayName ? { en: field.displayName, zh: field.displayName } : undefined;
}

export function getDescription(field: OperandField): Localized | undefined {
  return getLocalized(
    field.capabilities,
    'urn:alm:descriptor:description:',
    field.description,
  );
}

export function getPlaceholder(field: OperandField): Localized | undefined {
  return getLocalized(field.capabilities, SpecCapability.placeholder);
}

export function getTooltip(field: OperandField): Localized | undefined {
  return getLocalized(field.capabilities, SpecCapability.tooltip);
}

export function getCapabilityDisabled(capabilities: string[]): boolean {
  return capabilities.includes(SpecCapability.disabled);
}

export function getCapabilityValidations(
  capabilities: string[],
): OperandFieldValidation {
  return capabilities
    .filter(c => c.startsWith(SpecCapability.validation))
    .reduce<OperandFieldValidation>((acc, descriptor) => {
      const [, validation, param] =
        (descriptor.match(REGEXP_VALIDATION_SUFFIX) as
          | [unknown, Validations, string]
          | null) ?? [];
      if (!validation) {
        return acc;
      }
      if (validation === Validations.pattern) {
        acc[validation] = param;
      } else if (validation === Validations.required) {
        acc[validation] = true;
      } else {
        acc[validation] = Number(param);
      }
      return acc;
    }, {});
}

export const isRequired = (field: OperandField) =>
  !!field.validations[Validations.required];
export const isMultiple = (capabilities: string[]) =>
  capabilities.some(c => c.startsWith(SpecCapability.multiple));
export const isAllowCreate = (capabilities: string[]) =>
  capabilities.some(c => c.startsWith(SpecCapability.allowCreate));
export const isClearable = (capabilities: string[]) =>
  capabilities.some(c => c.startsWith(SpecCapability.clearable));
export const isStaticHidden = (capabilities: string[]) =>
  capabilities.includes(SpecCapability.hidden);

/** Build the parsed field from a descriptor. */
export function getOperandField(descriptor: Descriptor): OperandField {
  const capabilities = (descriptor['x-descriptors'] ?? []).filter(
    c => typeof c === 'string',
  );
  return {
    path: descriptor.path,
    capabilities,
    displayName: descriptor.displayName,
    description: descriptor.description,
    disabled: getCapabilityDisabled(capabilities),
    validations: getCapabilityValidations(capabilities),
  };
}

/** Pick a localised string for the active locale (en-first fallback). */
export function pickLocale(
  value: Localized | undefined,
  locale: 'en' | 'zh' = 'en',
): string | undefined {
  if (!value) {
    return undefined;
  }
  return (locale === 'zh' ? value.zh ?? value.en : value.en ?? value.zh) ?? undefined;
}

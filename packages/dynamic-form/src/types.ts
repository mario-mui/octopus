/*
 * The descriptor model, ported from the console's `crd-form` (`types/index.ts`).
 *
 * A dynamic form is driven by a list of `Descriptor`s — one per field path
 * (e.g. `params.url`) — each carrying a flat list of OLM-style capability
 * strings (`urn:alm:descriptor:…`) that declare the control, its meta (label /
 * description / placeholder / tooltip), validations and (P2) dynamic options /
 * default / hidden expressions. This is NOT JSON Schema.
 */

/** Built-in validation kinds (the `validation:<kind>[:param]` capabilities). */
export enum Validations {
  maximum = 'maximum',
  minimum = 'minimum',
  maxLength = 'maxLength',
  minLength = 'minLength',
  pattern = 'pattern',
  required = 'required',
}

/** Capability string prefixes recognised by the parser. */
export enum SpecCapability {
  labelEn = 'urn:alm:descriptor:label:en:',
  labelZh = 'urn:alm:descriptor:label:zh:',
  descriptionEn = 'urn:alm:descriptor:description:en:',
  descriptionZh = 'urn:alm:descriptor:description:zh:',
  placeholder = 'urn:alm:descriptor:placeholder:',
  tooltip = 'urn:alm:descriptor:tooltip:',
  hidden = 'urn:alm:descriptor:com.tectonic.ui:hidden',
  disabled = 'urn:alm:descriptor:com.tectonic.ui:disabled',
  validation = 'urn:alm:descriptor:com.tectonic.ui:validation:',

  text = 'urn:alm:descriptor:com.tectonic.ui:text',
  textarea = 'urn:alm:descriptor:com.tectonic.ui:textarea',
  tagsInput = 'urn:alm:descriptor:com.tectonic.ui:tagsInput',

  // urn:alm:descriptor:com.tectonic.ui:radio:<value>[:en|zh:<label>]
  radio = 'urn:alm:descriptor:com.tectonic.ui:radio:',

  booleanSwitch = 'urn:alm:descriptor:com.tectonic.ui:booleanSwitch',
  // urn:alm:descriptor:props:booleanSwitch:true:True
  booleanSwitchValueAdapted = 'urn:alm:descriptor:props:booleanSwitch:',

  yaml = 'urn:alm:descriptor:com.tectonic.ui:yaml',

  select = 'urn:alm:descriptor:com.tectonic.ui:select',
  multiple = 'urn:alm:descriptor:props:select:multiple',
  selectOptions = 'urn:alm:descriptor:props:select:options:',
  allowCreate = 'urn:alm:descriptor:props:select:allowCreate',
  clearable = 'urn:alm:descriptor:props:select:clearable',

  expression = 'urn:alm:descriptor:expression:',
  custom = 'urn:alm:descriptor:widgets:',
}

/** A raw descriptor entry (as authored in the YAML annotation). */
export interface Descriptor {
  path: string;
  displayName?: string;
  description?: string;
  'x-descriptors': string[];
  value?: unknown;
}

export interface OperandFieldValidation {
  [Validations.maximum]?: number;
  [Validations.minimum]?: number;
  [Validations.maxLength]?: number;
  [Validations.minLength]?: number;
  [Validations.pattern]?: string;
  [Validations.required]?: boolean;
}

/** The parsed field a descriptor resolves to. */
export interface OperandField {
  path: string;
  capabilities: string[];
  displayName?: string;
  description?: string;
  validations: OperandFieldValidation;
  disabled: boolean;
}

/** The resolved control kind for a field. */
export type FieldType =
  | 'text'
  | 'textarea'
  | 'tagsInput'
  | 'radio'
  | 'booleanSwitch'
  | 'yaml'
  | 'select'
  | 'combine'
  | 'inlineForm'
  | 'custom';

/** A localised string pair. */
export interface Localized {
  en?: string;
  zh?: string;
}

export interface SelectOption {
  label: string;
  value: unknown;
  /** Optional per-option description (dynamic options). */
  description?: string;
  /** The raw resource the option came from (dynamic options). */
  resource?: unknown;
}

/**
 * The form-wide context exposed to `${…}` expressions. `context.*` is the
 * caller's domain data (cluster / namespace / project / params …); the rest are
 * helpers the engine injects.
 */
export interface DynamicFormContextValue {
  /** Domain context referenced as `context.*` in expressions. */
  context: Record<string, unknown>;
  /**
   * Fetch a gateway resource for dynamic `options` / `preview`. Given the
   * (already interpolated) url + options (query / method / body), returns the
   * parsed JSON.
   */
  fetchResource?: (
    url: string,
    opts?: {
      query?: Record<string, string>;
      method?: 'get' | 'post';
      body?: unknown;
    },
  ) => Promise<unknown>;
  /** Active locale for label/description/placeholder/tooltip. */
  locale?: 'en' | 'zh';
}

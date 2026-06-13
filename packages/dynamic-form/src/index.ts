/*
 * @octopus/dynamic-form — a descriptor-driven dynamic form, ported from the
 * console's `crd-form` + pipeline `advanced-form`. Fields are declared as
 * OLM-style `urn:alm:descriptor:…` capability lists (NOT JSON Schema), parsed
 * into Ant Design controls with meta, validations and dynamic
 * options/default/hidden expressions.
 *
 * Usage: wrap fields in a `DynamicFormProvider` (supplying the expression
 * context + an auth-aware `fetchResource`), then render a `DynamicField` per
 * descriptor.
 *
 * @packageDocumentation
 */

export { DynamicField } from './DynamicField';
export type { DynamicFieldProps } from './DynamicField';
export { DynamicFormProvider, useDynamicFormContext, buildScope } from './context';
export { useField, useDefaultEmitter } from './useField';
export type { FieldModel } from './useField';

export {
  parseDescriptors,
  findParamDescriptor,
  getOperandField,
  getFieldType,
  getRadioOptions,
  getBooleanSwitchOptions,
  getStaticSelectOptions,
  getDisplayName,
  getDescription,
  getPlaceholder,
  getTooltip,
  getCapabilityValidations,
  getMatchedCapabilityValue,
  isRequired,
  isMultiple,
  isAllowCreate,
  isClearable,
  pickLocale,
} from './capability';

export {
  evalExpr,
  interpolate,
  resolveOptions,
  resolveDefault,
  resolveHidden,
  isSearchableOptions,
  parseOptionsExpression,
  parseDefaultExpression,
  parseHiddenExpression,
} from './expression';
export type { OptionsExpression, DefaultExpression, PathOrExp } from './expression';

export { CombineField } from './Combine';
export { PreviewButton } from './Preview';
export { InlineFormField } from './InlineForm';
export {
  WidgetCapability,
  getCustomWidget,
  getCombineItems,
  getCombineValueExp,
  getDocLink,
  getPreviewConfig,
  getInlineFormConfig,
} from './widgets';
export type {
  CustomWidget,
  DocLink,
  DocLinkType,
  PreviewConfig,
  PreviewFormat,
  InlineFormConfig,
} from './widgets';

export {
  SpecCapability,
  Validations,
} from './types';
export type {
  Descriptor,
  OperandField,
  OperandFieldValidation,
  FieldType,
  Localized,
  SelectOption,
  DynamicFormContextValue,
} from './types';

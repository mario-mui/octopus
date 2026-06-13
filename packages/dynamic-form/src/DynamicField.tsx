/*
 * Renders one descriptor as an Ant Design control: the resolved widget plus its
 * label / tooltip / description / required marker. Controlled — the caller owns
 * the value. Hidden fields render nothing; a dynamic default is emitted once
 * when the value is empty.
 *
 * P1 widgets: text, textarea, tagsInput, radio, booleanSwitch, yaml (textarea),
 * select. P2 wires dynamic options / default / hidden via `useField`. The
 * `custom` widget kind falls back to a text input (host widgets are P3).
 */
import { ReactNode } from 'react';
import { Input, InputNumber, Radio, Select, Switch, Tooltip, Typography } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { createStyles } from 'antd-style';
import { getBooleanSwitchOptions } from './capability';
import { buildScope, useDynamicFormContext } from './context';
import { CombineField } from './Combine';
import { InlineFormField } from './InlineForm';
import { PreviewButton } from './Preview';
import { Descriptor, Validations } from './types';
import { useDefaultEmitter, useField } from './useField';

export interface DynamicFieldProps {
  descriptor: Descriptor;
  value: unknown;
  onChange: (value: unknown) => void;
  /** Locale override for the field label/description (else the provider's). */
}

const useStyles = createStyles(({ token, css }) => ({
  field: css`
    margin-bottom: 16px;
  `,
  label: css`
    display: flex;
    align-items: center;
    gap: 4px;
    margin-bottom: 4px;
    font-size: 13px;
    color: ${token.colorTextHeading};
  `,
  required: css`
    color: ${token.colorError};
    line-height: 1;
  `,
  description: css`
    margin-top: 4px;
    font-size: 12px;
    color: ${token.colorTextSecondary};
  `,
}));

export function DynamicField({ descriptor, value, onChange }: DynamicFieldProps) {
  const { styles } = useStyles();
  const ctx = useDynamicFormContext();
  const model = useField(descriptor);
  useDefaultEmitter(value, model.defaultValue, onChange);

  if (model.hidden) {
    return null;
  }

  const { validations } = model;
  const control = renderControl();

  return (
    <div className={styles.field}>
      {model.label || model.docLink ? (
        <div className={styles.label}>
          {model.required ? <span className={styles.required}>*</span> : null}
          <span>{model.label}</span>
          {model.tooltip ? (
            <Tooltip title={model.tooltip}>
              <QuestionCircleOutlined />
            </Tooltip>
          ) : null}
          {model.docLink?.href ? (
            <Typography.Link
              href={model.docLink.href}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: 12 }}
            >
              {model.docLink.label.en ?? model.docLink.label.zh}
            </Typography.Link>
          ) : null}
          {model.preview ? (
            <PreviewButton preview={model.preview} scope={buildScope(ctx)} />
          ) : null}
        </div>
      ) : null}
      {control}
      {model.description ? (
        <div className={styles.description}>{model.description}</div>
      ) : null}
    </div>
  );

  function renderControl(): ReactNode {
    const disabled = model.disabled;
    const str = typeof value === 'string' ? value : value == null ? '' : String(value);

    switch (model.type) {
      case 'combine':
        return (
          <CombineField descriptor={descriptor} value={value} onChange={onChange} />
        );

      case 'inlineForm':
        return (
          <InlineFormField descriptor={descriptor} value={value} onChange={onChange} />
        );

      case 'textarea':
      case 'yaml':
        return (
          <Input.TextArea
            value={str}
            disabled={disabled}
            placeholder={model.placeholder}
            autoSize={{ minRows: model.type === 'yaml' ? 4 : 2 }}
            style={model.type === 'yaml' ? { fontFamily: 'monospace' } : undefined}
            maxLength={validations[Validations.maxLength]}
            onChange={e => onChange(e.target.value)}
          />
        );

      case 'tagsInput':
        return (
          <Select
            mode="tags"
            value={Array.isArray(value) ? (value as string[]) : []}
            disabled={disabled}
            placeholder={model.placeholder}
            style={{ width: '100%' }}
            tokenSeparators={[',', ' ']}
            open={false}
            suffixIcon={null}
            onChange={v => onChange(v)}
          />
        );

      case 'radio':
        return (
          <Radio.Group
            value={value}
            disabled={disabled}
            onChange={e => onChange(e.target.value)}
            optionType="button"
            buttonStyle="solid"
          >
            {model.radioOptions.map(o => (
              <Radio.Button key={o.value} value={o.value}>
                {o.display.en || o.display.zh || o.value}
              </Radio.Button>
            ))}
          </Radio.Group>
        );

      case 'booleanSwitch': {
        const opts = getBooleanSwitchOptions(model.field.capabilities);
        const onValue = opts.find(o => o.switchValue)?.value ?? true;
        const offValue = opts.find(o => !o.switchValue)?.value ?? false;
        return (
          <Switch
            checked={value === onValue || value === true}
            disabled={disabled}
            onChange={checked => onChange(checked ? onValue : offValue)}
          />
        );
      }

      case 'select':
        return (
          <Select
            value={value as never}
            disabled={disabled}
            loading={model.optionsLoading}
            placeholder={model.placeholder}
            style={{ width: '100%' }}
            mode={model.multiple ? (model.allowCreate ? 'tags' : 'multiple') : undefined}
            allowClear={model.clearable}
            showSearch
            // Server-side search when options depend on `current.search`.
            filterOption={model.searchable ? false : undefined}
            optionFilterProp="label"
            onSearch={model.searchable ? model.setSearch : undefined}
            options={model.options.map(o => ({
              label: o.label,
              value: o.value as never,
              title: o.description,
            }))}
            onChange={v => onChange(v)}
          />
        );

      case 'text':
      case 'custom':
      default:
        if (validations[Validations.maximum] != null || validations[Validations.minimum] != null) {
          return (
            <InputNumber
              value={value as number}
              disabled={disabled}
              placeholder={model.placeholder}
              style={{ width: '100%' }}
              max={validations[Validations.maximum]}
              min={validations[Validations.minimum]}
              onChange={v => onChange(v)}
            />
          );
        }
        return (
          <Input
            value={str}
            disabled={disabled}
            placeholder={model.placeholder}
            maxLength={validations[Validations.maxLength]}
            onChange={e => onChange(e.target.value)}
          />
        );
    }
  }
}

/*
 * Reusable Key/Value editor used for the Labels and Annotations sections of the
 * namespace form (see the create/update designs): a header row, one editable row
 * per entry with a remove button, an empty-state row, and an "Add" action.
 */
import { Button, Input } from 'antd';
import { MinusCircleOutlined, PlusCircleOutlined } from '@ant-design/icons';

export interface KeyValue {
  key: string;
  value: string;
}

export interface KeyValueEditorProps {
  items: KeyValue[];
  onChange: (items: KeyValue[]) => void;
  emptyText: string;
}

export function KeyValueEditor({
  items,
  onChange,
  emptyText,
}: KeyValueEditorProps) {
  const patch = (index: number, next: Partial<KeyValue>) =>
    onChange(items.map((it, i) => (i === index ? { ...it, ...next } : it)));
  const remove = (index: number) =>
    onChange(items.filter((_, i) => i !== index));
  const add = () => onChange([...items, { key: '', value: '' }]);

  return (
    <div style={{ border: '1px solid var(--octo-border, #303030)', borderRadius: 4 }}>
      <div style={{ display: 'flex', gap: 8, padding: '8px 12px', fontWeight: 600 }}>
        <div style={{ flex: 1 }}>Key</div>
        <div style={{ flex: 1 }}>Value</div>
        <div style={{ width: 32 }} />
      </div>
      {items.length === 0 ? (
        <div style={{ padding: '12px', textAlign: 'center', opacity: 0.5 }}>
          {emptyText}
        </div>
      ) : (
        items.map((item, index) => (
          <div
            key={index}
            style={{ display: 'flex', gap: 8, padding: '4px 12px', alignItems: 'center' }}
          >
            <Input
              placeholder="Key"
              value={item.key}
              onChange={e => patch(index, { key: e.target.value })}
              style={{ flex: 1 }}
            />
            <Input
              placeholder="Value"
              value={item.value}
              onChange={e => patch(index, { value: e.target.value })}
              style={{ flex: 1 }}
            />
            <Button
              type="text"
              aria-label="Remove"
              icon={<MinusCircleOutlined />}
              onClick={() => remove(index)}
              style={{ width: 32 }}
            />
          </div>
        ))
      )}
      <div style={{ textAlign: 'center', padding: '4px' }}>
        <Button type="link" icon={<PlusCircleOutlined />} onClick={add}>
          Add
        </Button>
      </div>
    </div>
  );
}

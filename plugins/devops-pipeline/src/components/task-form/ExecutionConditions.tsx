/*
 * Execution Conditions — the task's `when` expressions (design/task-drawer):
 * an empty "No data" state, an "Add Condition" button, and editable
 * input / operator / values rows.
 */
import { Button, Empty, Input, Select, Space, Typography } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { WhenSpec } from '../../types';

const OPERATORS = [
  { label: 'in', value: 'in' },
  { label: 'notin', value: 'notin' },
];

export interface ExecutionConditionsProps {
  value: WhenSpec[];
  onChange: (value: WhenSpec[]) => void;
}

export function ExecutionConditions({ value, onChange }: ExecutionConditionsProps) {
  const update = (i: number, patch: Partial<WhenSpec>) =>
    onChange(value.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const add = () => onChange([...value, { input: '', operator: 'in', values: [''] }]);

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Typography.Text type="success" style={{ fontSize: 12 }}>
        To activate automatic variable completion, type $.
      </Typography.Text>
      {value.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No data"
          style={{ margin: '8px 0' }}
        />
      ) : (
        value.map((row, i) => (
          <div
            key={i}
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}
          >
            <Input
              placeholder="$(params.x) / $(tasks.x.results.y)"
              style={{ flex: 2, minWidth: 0 }}
              value={row.input}
              onChange={e => update(i, { input: e.target.value })}
            />
            <Select
              style={{ width: 96, flex: '0 0 auto' }}
              options={OPERATORS}
              value={row.operator}
              onChange={operator => update(i, { operator })}
            />
            <Select
              mode="tags"
              style={{ flex: 2, minWidth: 0 }}
              placeholder="values"
              value={row.values?.filter(Boolean)}
              onChange={values => update(i, { values })}
            />
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              style={{ flex: '0 0 auto' }}
              onClick={() => remove(i)}
            />
          </div>
        ))
      )}
      <Button type="dashed" icon={<PlusOutlined />} onClick={add} block>
        Add Condition
      </Button>
    </Space>
  );
}

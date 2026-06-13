/*
 * The right-hand detail pane of the task picker (design/select-task.png): the
 * selected task's icon + name + Select button, and tabs for Details (source /
 * categories / platforms / created-at / description), Parameters, Workspaces,
 * Results and the raw YAML. Driven by a normalised CatalogTask (namespace or
 * hub).
 */
import { Button, Descriptions, Empty, Space, Table, Tabs, Tag } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
import { createStyles } from 'antd-style';
import { stringify } from 'yaml';
import { CodeEditor, yamlReadOptions } from '@octopus/code-editor';
import { TektonIcon } from '../TektonIcon';
import { CatalogTask } from './taskCatalog';

export interface TaskDetailPanelProps {
  task: CatalogTask;
  onSelect: () => void;
}

const useStyles = createStyles(({ token, css }) => ({
  header: css`
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
  `,
  name: css`
    flex: 1;
    font-size: 16px;
    font-weight: 600;
    color: ${token.colorText};
  `,
  desc: css`
    white-space: pre-wrap;
  `,
}));

function formatDate(ts: string): string {
  if (!ts) {
    return '-';
  }
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? '-' : d.toISOString().slice(0, 10);
}

export function TaskDetailPanel({ task, onSelect }: TaskDetailPanelProps) {
  const { styles } = useStyles();
  const spec = task.spec;

  return (
    <div>
      <div className={styles.header}>
        <TektonIcon src={task.icon} name={task.displayName} color={task.color} size={28} />
        <span className={styles.name}>{task.displayName}</span>
        <Button type="primary" onClick={onSelect}>
          Select
        </Button>
      </div>

      <Tabs
        items={[
          {
            key: 'details',
            label: 'Details',
            children: (
              <Descriptions column={2} size="small" colon>
                <Descriptions.Item label="Source">
                  <Tag>{task.source === 'hub' ? 'Hub' : 'Namespace'}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Categories">
                  {task.categories.length ? (
                    <Space size={[4, 4]} wrap>
                      {task.categories.map(c => (
                        <Tag key={c}>{c}</Tag>
                      ))}
                    </Space>
                  ) : (
                    '-'
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Platforms">
                  {task.platforms.length ? (
                    <Space size={[4, 4]} wrap>
                      {task.platforms.map(p => (
                        <Tag key={p}>{p}</Tag>
                      ))}
                    </Space>
                  ) : (
                    '-'
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Created At">
                  <Space size={4}>
                    <ClockCircleOutlined />
                    {formatDate(task.createdAt)}
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="Description" span={2}>
                  <div className={styles.desc}>{task.description || '-'}</div>
                </Descriptions.Item>
              </Descriptions>
            ),
          },
          {
            key: 'parameters',
            label: 'Parameters',
            children: (
              <Table
                size="small"
                rowKey="name"
                pagination={false}
                dataSource={spec?.params ?? []}
                locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                columns={[
                  { title: 'Name', dataIndex: 'name' },
                  { title: 'Type', dataIndex: 'type', render: (t?: string) => t || 'string' },
                  {
                    title: 'Default',
                    dataIndex: 'default',
                    render: (d: unknown) =>
                      d == null ? '-' : typeof d === 'string' ? d : JSON.stringify(d),
                  },
                  { title: 'Description', dataIndex: 'description', render: (d?: string) => d || '-' },
                ]}
              />
            ),
          },
          {
            key: 'workspaces',
            label: 'Workspaces',
            children: (
              <Table
                size="small"
                rowKey="name"
                pagination={false}
                dataSource={spec?.workspaces ?? []}
                locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                columns={[
                  { title: 'Name', dataIndex: 'name' },
                  {
                    title: 'Optional',
                    dataIndex: 'optional',
                    render: (o?: boolean) => (o ? 'Yes' : 'No'),
                  },
                  { title: 'Description', dataIndex: 'description', render: (d?: string) => d || '-' },
                ]}
              />
            ),
          },
          {
            key: 'results',
            label: 'Results',
            children: (
              <Table
                size="small"
                rowKey="name"
                pagination={false}
                dataSource={spec?.results ?? []}
                locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                columns={[
                  { title: 'Name', dataIndex: 'name' },
                  { title: 'Description', dataIndex: 'description', render: (d?: string) => d || '-' },
                ]}
              />
            ),
          },
          {
            key: 'yaml',
            label: 'YAML',
            children: (
              <CodeEditor
                value={stringify(task.raw)}
                options={yamlReadOptions}
                style={{ height: 420 }}
              />
            ),
          },
        ]}
      />
    </div>
  );
}

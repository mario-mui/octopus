/*
 * Results section (design/task-drawer): a read-only list of the task's declared
 * results, each with a help tooltip (its description) and a copy button that
 * yields the result reference `$(tasks.<task>.results.<result>)`.
 */
import { Empty, Tooltip, Typography, message } from 'antd';
import { CopyOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { createStyles } from 'antd-style';
import { TaskResult } from '../../types';
import { genTaskResultRef } from '../taskMeta';

export interface ResultsListProps {
  /** The pipeline task's name (for the result reference). */
  taskName: string;
  results: TaskResult[];
}

const useStyles = createStyles(({ token, css }) => ({
  row: css`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 0;
    border-bottom: 1px solid ${token.colorBorderSecondary};
  `,
  name: css`
    flex: 1;
    color: ${token.colorText};
  `,
  copy: css`
    color: ${token.colorPrimary};
    cursor: pointer;
  `,
}));

export function ResultsList({ taskName, results }: ResultsListProps) {
  const { styles } = useStyles();

  if (!results.length) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No results" />;
  }

  const copy = async (result: string) => {
    const ref = genTaskResultRef(taskName, result);
    try {
      await navigator.clipboard.writeText(ref);
      message.success(`Copied ${ref}`);
    } catch {
      message.error('Failed to copy');
    }
  };

  return (
    <div>
      {results.map(result => (
        <div key={result.name} className={styles.row}>
          <span className={styles.name}>{result.name}</span>
          {result.description ? (
            <Tooltip title={result.description}>
              <QuestionCircleOutlined />
            </Tooltip>
          ) : null}
          <Tooltip title="Copy result reference">
            <CopyOutlined className={styles.copy} onClick={() => copy(result.name)} />
          </Tooltip>
        </div>
      ))}
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        Reference a result with $(tasks.{taskName || '<task>'}.results.&lt;name&gt;)
      </Typography.Text>
    </div>
  );
}

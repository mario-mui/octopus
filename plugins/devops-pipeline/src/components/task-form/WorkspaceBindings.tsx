/*
 * Workspaces section (design/task-drawer): one binding per workspace the task
 * declares (`taskResource.spec.workspaces`) — its name + description and a
 * select mapping it to one of the pipeline's workspaces. Edits write the
 * `PipelineTaskWorkspace[]` bindings.
 */
import { Empty, Select } from 'antd';
import { createStyles } from 'antd-style';
import {
  PipelineTaskWorkspace,
  Task,
  WorkspaceDeclaration,
} from '../../types';

export interface WorkspaceBindingsProps {
  /** The workspaces the task declares. */
  taskWorkspaces: WorkspaceDeclaration[];
  /** The pipeline's workspaces (binding targets). */
  pipelineWorkspaces: WorkspaceDeclaration[];
  value: PipelineTaskWorkspace[];
  onChange: (value: PipelineTaskWorkspace[]) => void;
}

const useStyles = createStyles(({ token, css }) => ({
  item: css`
    margin-bottom: 16px;
  `,
  name: css`
    font-size: 13px;
    color: ${token.colorTextHeading};
    margin-bottom: 4px;
  `,
  optional: css`
    color: ${token.colorTextSecondary};
    margin-left: 6px;
  `,
  desc: css`
    margin-top: 4px;
    font-size: 12px;
    color: ${token.colorTextSecondary};
  `,
}));

export function fromTask(task: Task | null): WorkspaceDeclaration[] {
  return task?.spec?.workspaces ?? [];
}

export function WorkspaceBindings({
  taskWorkspaces,
  pipelineWorkspaces,
  value,
  onChange,
}: WorkspaceBindingsProps) {
  const { styles } = useStyles();

  if (!taskWorkspaces.length) {
    return (
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No workspaces" />
    );
  }

  const bound = (name: string) =>
    value.find(w => w.name === name)?.workspace;
  const bind = (name: string, workspace: string | undefined) => {
    const rest = value.filter(w => w.name !== name);
    onChange(workspace ? [...rest, { name, workspace }] : rest);
  };

  const options = pipelineWorkspaces.map(w => ({ label: w.name, value: w.name }));

  return (
    <>
      {taskWorkspaces.map(ws => (
        <div key={ws.name} className={styles.item}>
          <div className={styles.name}>
            {ws.name}
            {ws.optional ? <span className={styles.optional}>(optional)</span> : null}
          </div>
          <Select
            style={{ width: '100%' }}
            allowClear
            showSearch
            placeholder="Select a pipeline workspace"
            value={bound(ws.name)}
            options={options}
            onChange={v => bind(ws.name, v)}
          />
          {ws.description ? <div className={styles.desc}>{ws.description}</div> : null}
        </div>
      ))}
    </>
  );
}

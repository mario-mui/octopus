/*
 * The application view's project selector: a thin container that feeds the
 * shared ResourceSelector with the project list (from ProjectProvider) and the
 * URL-driven selection logic (useViewSelection). It only differs from the
 * cluster selector in its data source and its title/icon.
 */
import { DatabaseOutlined } from '@ant-design/icons';
import { ResourceSelector } from './ResourceSelector';
import { useProjects } from './ProjectContext';
import { useViewSelection } from './useViewSelection';

export interface ProjectSelectorProps {
  /** Render an icon-only trigger to fit a collapsed sidebar. */
  collapsed?: boolean;
}

export function ProjectSelector({ collapsed }: ProjectSelectorProps) {
  const projects = useProjects();
  const { value, select } = useViewSelection('application', projects);
  return (
    <ResourceSelector
      items={projects}
      value={value}
      onChange={select}
      title="Projects"
      icon={<DatabaseOutlined />}
      collapsed={collapsed}
    />
  );
}

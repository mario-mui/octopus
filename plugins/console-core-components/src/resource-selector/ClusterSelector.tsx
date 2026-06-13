/*
 * The cluster view's cluster selector: identical to the project selector except
 * for its data source (ClusterProvider) and its title/icon. The visuals and the
 * URL-selection logic are shared (ResourceSelector + useViewSelection).
 */
import { ClusterOutlined } from '@ant-design/icons';
import { ResourceSelector } from './ResourceSelector';
import { useClusters } from './ClusterContext';
import { useViewSelection } from './useViewSelection';

export interface ClusterSelectorProps {
  /** Render an icon-only trigger to fit a collapsed sidebar. */
  collapsed?: boolean;
}

export function ClusterSelector({ collapsed }: ClusterSelectorProps) {
  const clusters = useClusters();
  const { value, select } = useViewSelection('cluster', clusters);
  return (
    <ResourceSelector
      items={clusters}
      value={value}
      onChange={select}
      title="Clusters"
      icon={<ClusterOutlined />}
      collapsed={collapsed}
    />
  );
}

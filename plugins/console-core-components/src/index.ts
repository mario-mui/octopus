/*
 * Console-style core components for Octopus: the view resource selectors
 * (project / cluster) and their list providers, for the top of the sidebar.
 *
 * @packageDocumentation
 */

export { ProjectProvider, useProjects } from './ProjectContext';
export type { ProjectProviderProps } from './ProjectContext';
export { ClusterProvider, useClusters } from './ClusterContext';
export type { ClusterProviderProps } from './ClusterContext';
export { ProjectSelector } from './ProjectSelector';
export type { ProjectSelectorProps } from './ProjectSelector';
export { ClusterSelector } from './ClusterSelector';
export type { ClusterSelectorProps } from './ClusterSelector';
export { ResourceSelector } from './ResourceSelector';
export type { ResourceSelectorProps } from './ResourceSelector';
export { useViewSelection } from './useViewSelection';
export type { Project, Cluster, ResourceItem } from './types';


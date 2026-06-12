/*
 * Loads and provides the list of available projects. The active project is not
 * held here — the URL is the source of truth (see useViewSelection); this
 * provider only supplies the list the selector chooses from.
 *
 * Projects are fetched the way the console's `acl-project-list` does, via
 * `${API_GATEWAY}/auth/v1/projects`, mapping each Kubernetes `Project` like the
 * console's `mapResource` (name, display-name annotation, status from phase).
 *
 * A `projects` prop overrides the fetch (handy for tests / storybook).
 */
import {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  API_GATEWAY,
  KubernetesResourceList,
  Project as K8sProject,
} from '@octopus/console-core-common';
import { Project } from './types';

/** Mirrors the console's `${API_GATEWAY}/auth/v1/projects`. */
const PROJECTS_API = `${API_GATEWAY}/auth/v1/projects`;

/** Annotation carrying a resource's human-friendly name (Alauda convention). */
const DISPLAY_NAME_ANNOTATION = 'cpaas.io/display-name';

/** Map a raw Project resource to the selector's view model (cf. `mapResource`). */
function mapProject(item: K8sProject): Project {
  const name = item.metadata?.name ?? '';
  return {
    name,
    displayName: item.metadata?.annotations?.[DISPLAY_NAME_ANNOTATION] || name,
    status: item.status?.phase === 'Active' ? 'normal' : 'abnormal',
  };
}

async function fetchProjects(signal: AbortSignal): Promise<Project[]> {
  const res = await fetch(PROJECTS_API, {
    headers: { Accept: 'application/json' },
    credentials: 'include',
    signal,
  });
  if (!res.ok) {
    throw new Error(`Failed to load projects: ${res.status}`);
  }
  const data = (await res.json()) as KubernetesResourceList<K8sProject>;
  return (data.items ?? []).map(mapProject);
}

interface ProjectContextValue {
  projects: Project[];
}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

export interface ProjectProviderProps {
  /** Supply projects directly instead of fetching them (tests / storybook). */
  projects?: Project[];
}

export function ProjectProvider({
  projects: projectsProp,
  children,
}: PropsWithChildren<ProjectProviderProps>) {
  const [projects, setProjects] = useState<Project[]>(projectsProp ?? []);

  useEffect(() => {
    if (projectsProp) {
      setProjects(projectsProp);
      return;
    }
    const controller = new AbortController();
    fetchProjects(controller.signal)
      .then(setProjects)
      .catch(error => {
        if (!controller.signal.aborted) {
          console.error('[project-selector] failed to load projects', error);
        }
      });
    return () => controller.abort();
  }, [projectsProp]);

  const value = useMemo<ProjectContextValue>(() => ({ projects }), [projects]);

  return (
    <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
  );
}

/** The available projects. Must be used within a {@link ProjectProvider}. */
export function useProjects(): Project[] {
  const ctx = useContext(ProjectContext);
  if (!ctx) {
    throw new Error('useProjects must be used within a ProjectProvider');
  }
  return ctx.projects;
}

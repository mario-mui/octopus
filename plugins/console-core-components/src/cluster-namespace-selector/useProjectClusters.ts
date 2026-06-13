/*
 * Loads the clusters that belong to a project, for the cluster-namespace
 * selector's cluster dropdown.
 *
 * Mirrors the console's `acl-cluster-namespace-selector`, which derives its
 * cluster list from the project: it lists the projects
 * (`projectService.getProjects()`), finds the one by name, and reads its
 * `spec.clusters`. We do the same — the auth gateway only exposes the list
 * (`${API_GATEWAY}/auth/v1/projects`), not a per-project GET.
 *
 * The request goes through the app's auth-aware `fetch` (`useApi(fetchApiRef)`),
 * the same one the K8s client uses, so it carries credentials across the
 * host / remote boundary. An empty project yields an empty list; the fetch is
 * aborted on project change / unmount.
 */
import { useEffect, useState } from 'react';
import { fetchApiRef, useApi } from '@octopus/core-plugin-api';
import {
  API_GATEWAY,
  KubernetesResourceList,
  Project,
} from '@octopus/console-core-common';

const PROJECTS_API = `${API_GATEWAY}/auth/v1/projects`;

/** The names of the clusters belonging to `project` (empty until loaded). */
export function useProjectClusters(project: string | undefined): string[] {
  const fetchApi = useApi(fetchApiRef);
  const [clusters, setClusters] = useState<string[]>([]);

  useEffect(() => {
    if (!project) {
      setClusters([]);
      return;
    }
    const controller = new AbortController();
    fetchApi
      .fetch(PROJECTS_API, {
        headers: { Accept: 'application/json' },
        credentials: 'include',
        signal: controller.signal,
      })
      .then(res => {
        if (!res.ok) {
          throw new Error(`Failed to load projects: ${res.status}`);
        }
        return res.json() as Promise<KubernetesResourceList<Project>>;
      })
      .then(list => {
        if (!controller.signal.aborted) {
          const found = (list.items ?? []).find(
            item => item.metadata?.name === project,
          );
          setClusters((found?.spec?.clusters ?? []).map(cluster => cluster.name));
        }
      })
      .catch(error => {
        if (!controller.signal.aborted) {
          setClusters([]);
          console.error(
            '[cluster-namespace-selector] failed to load project clusters',
            error,
          );
        }
      });
    return () => controller.abort();
  }, [project, fetchApi]);

  return clusters;
}

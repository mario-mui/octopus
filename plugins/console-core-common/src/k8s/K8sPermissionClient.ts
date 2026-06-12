/*
 * Permission checks via `SelfSubjectAccessReview`, as a class. The class form of
 * the console SDK's Angular `K8sPermissionService`: for each verb it asks the
 * API server whether the current user may perform it, returning a
 * `{ verb: allowed }` record ready for button-level gating.
 *
 * The `fetch` implementation is injected, so reviews carry the same auth as the
 * rest of the app (wired to `fetchApi` at the provider layer).
 */

import { API_GATEWAY } from '../constants';
import type { K8sVerb, SelfSubjectAccessReview } from '../types';

import type { FetchLike } from './K8sApiClient';
import { normalizeApiGroup } from './getApiPath';
import type { K8sResourceDefinition } from './resourceDefinitions';

export interface CheckAccessParams {
  cluster?: string;
  definition: K8sResourceDefinition;
  namespace?: string;
  name?: string;
  verbs: K8sVerb[];
  /**
   * Use the Alauda gateway's `/auth` review endpoint, which understands the
   * `cluster`/`project` resource attributes. The namespace detail view uses
   * `advanced: true`; plain kube reviews go through `authorization.k8s.io`.
   */
  advanced?: boolean;
  project?: string;
}

export class K8sPermissionClient {
  constructor(private readonly fetchFn: FetchLike) {}

  private reviewUrl(advanced: boolean | undefined, cluster?: string): string {
    if (advanced) {
      return `${API_GATEWAY}/auth/v1/selfsubjectaccessreviews`;
    }
    const clusterSegment = cluster ? `/kubernetes/${cluster}` : '';
    return `${API_GATEWAY}${clusterSegment}/apis/authorization.k8s.io/v1/selfsubjectaccessreviews`;
  }

  private async reviewVerb(
    params: CheckAccessParams,
    verb: K8sVerb,
  ): Promise<boolean> {
    const { cluster, definition, namespace, name, advanced, project } = params;
    const group = normalizeApiGroup(definition.apiGroup);

    const review: SelfSubjectAccessReview = {
      apiVersion: 'authorization.k8s.io/v1',
      kind: 'SelfSubjectAccessReview',
      spec: {
        resourceAttributes: {
          namespace,
          verb,
          group,
          resource: definition.type,
          name,
          ...(advanced ? { cluster, project } : {}),
        },
      },
    };

    const res = await this.fetchFn(this.reviewUrl(advanced, cluster), {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(review),
    });

    if (!res.ok) {
      // A failed review degrades to "not allowed" rather than throwing, so the
      // UI falls back to read-only instead of breaking.
      return false;
    }
    const result = (await res.json()) as SelfSubjectAccessReview;
    return result.status?.allowed ?? false;
  }

  /**
   * Resolve, for each requested verb, whether the current user is allowed.
   * Reviews run concurrently. e.g. `checkAccess({ definition: NAMESPACE, cluster,
   * advanced: true, verbs: ['update', 'delete'] })` → `{ update: true, delete:
   * false }`.
   */
  async checkAccess(
    params: CheckAccessParams,
  ): Promise<Record<string, boolean>> {
    const entries = await Promise.all(
      params.verbs.map(
        async verb => [verb, await this.reviewVerb(params, verb)] as const,
      ),
    );
    return Object.fromEntries(entries);
  }
}

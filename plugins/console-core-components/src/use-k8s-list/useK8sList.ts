/*
 * `useK8sList` — the shared "list a Kubernetes resource" data hook. The React
 * distillation of the console's `K8SResourceList` (loading/error state + local
 * create/update/delete mutation), minus the bits that don't pay off against the
 * apiserver:
 *
 *  - It fetches the FULL collection by default (one `listResource` call) and
 *    leaves sorting / filtering / virtualisation to the table — because the
 *    apiserver can't sort or full-text-search server-side, paging a sortable
 *    list buys nothing (see notes below). Most console lists are well under the
 *    few-thousand-item range where this is the right call.
 *  - `keyword` is routed through the gateway search prefix (server-side search)
 *    and `queryParams` forwards labelSelector / fieldSelector / limit.
 *  - `partialMetadata` requests a metadata-only `PartialObjectMetadataList` to
 *    shrink large payloads (items then carry only `metadata`). Safe to enable:
 *    if the gateway ignores it you simply get full objects back.
 *  - `loadMore` (cursor paging via `metadata.continue`) is intentionally NOT
 *    implemented yet — no current list needs it; the `list` envelope is exposed
 *    so it can be added later without an API change.
 *
 * Mirrors the fetch discipline of the other hooks here: one in-flight request,
 * aborted on dependency change / unmount, stale responses ignored. Errors are
 * returned (not toasted) so the caller owns the messaging.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useApi } from '@octopus/core-plugin-api';
import {
  K8sApi,
  K8sApiError,
  type K8sResourceDefinition,
  type KubernetesResource,
  type KubernetesResourceList,
} from '@octopus/console-core-common';

/** `Accept` value requesting a metadata-only list (k8s content negotiation). */
export const PARTIAL_OBJECT_METADATA_LIST_ACCEPT =
  'application/json;as=PartialObjectMetadataList;g=meta.k8s.io;v=v1';

export interface UseK8sListParams {
  /** Resource kind descriptor (plural + apiGroup + apiVersion). */
  definition: K8sResourceDefinition;
  /** Cluster to list in (required for cluster-routed resources). */
  cluster?: string;
  /** Namespace to scope to; omit for cluster-scoped or all-namespaces. */
  namespace?: string;
  /** Free-text search, routed through the gateway resource-search prefix. */
  keyword?: string;
  /** Extra query params: `labelSelector`, `fieldSelector`, `limit`, … */
  queryParams?: Record<string, string>;
  /**
   * Request metadata-only items (`PartialObjectMetadataList`) to shrink the
   * payload. Items then carry only `metadata` (no `spec`/`status`).
   */
  partialMetadata?: boolean;
  /** Skip fetching while false (e.g. until `cluster` is known). Default true. */
  enabled?: boolean;
}

export interface UseK8sListResult<T extends KubernetesResource> {
  /** The loaded items (empty until the first load resolves). */
  items: T[];
  /** True while a non-silent load is in flight. */
  loading: boolean;
  /** The last load error, if any (cleared on the next successful load). */
  error?: Error;
  /** ISO timestamp of the last successful load (for a "refresh time" display). */
  loadedAt?: string;
  /** The raw list envelope of the last response (carries `metadata.continue`). */
  list?: KubernetesResourceList<T>;
  /** Re-fetch from the server; `silent` keeps `loading` false (background refresh). */
  reload: (opts?: { silent?: boolean }) => void;
  /** Optimistically insert an item at the top (matches `K8SResourceList.create`). */
  prepend: (item: T) => void;
  /** Optimistically replace the item with the same name/namespace. */
  replace: (item: T) => void;
  /** Optimistically drop the item with this name/namespace. */
  remove: (item: T | { metadata?: { name?: string; namespace?: string } }) => void;
}

const keyOf = (item: {
  metadata?: { name?: string; namespace?: string };
}): string => `${item.metadata?.namespace ?? ''}/${item.metadata?.name ?? ''}`;

/** Load a Kubernetes resource collection, with loading/error + local mutation. */
export function useK8sList<T extends KubernetesResource>(
  params: UseK8sListParams,
): UseK8sListResult<T> {
  const {
    definition,
    cluster,
    namespace,
    keyword,
    queryParams,
    partialMetadata = false,
    enabled = true,
  } = params;

  const k8sApi = useApi(K8sApi);
  const [list, setList] = useState<KubernetesResourceList<T>>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error>();
  const [loadedAt, setLoadedAt] = useState<string>();

  // queryParams is an object literal that usually changes identity each render;
  // stringify so the effect only re-runs when its contents actually change.
  const queryKey = queryParams ? JSON.stringify(queryParams) : '';

  // Latest in-flight controller, so `reload` can supersede a running request.
  const controllerRef = useRef<AbortController>();

  const load = useCallback(
    (opts?: { silent?: boolean }) => {
      if (!enabled) {
        return;
      }
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      const { signal } = controller;

      if (!opts?.silent) {
        setLoading(true);
      }
      k8sApi
        .listResource<T>({
          definition,
          cluster,
          namespace,
          keyword: keyword || undefined,
          queryParams,
          accept: partialMetadata
            ? PARTIAL_OBJECT_METADATA_LIST_ACCEPT
            : undefined,
        })
        .then(result => {
          if (!signal.aborted) {
            setList(result);
            setError(undefined);
            setLoadedAt(new Date().toISOString());
          }
        })
        .catch((e: unknown) => {
          if (!signal.aborted) {
            setError(
              e instanceof Error
                ? e
                : new K8sApiError(String(e), 0),
            );
          }
        })
        .finally(() => {
          if (!signal.aborted) {
            setLoading(false);
          }
        });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      k8sApi,
      enabled,
      definition,
      cluster,
      namespace,
      keyword,
      partialMetadata,
      queryKey,
    ],
  );

  useEffect(() => {
    load();
    return () => controllerRef.current?.abort();
  }, [load]);

  const reload = useCallback(
    (opts?: { silent?: boolean }) => load(opts),
    [load],
  );

  // Local, optimistic mutations: update the cached envelope without a refetch.
  const mutateItems = useCallback(
    (fn: (items: T[]) => T[]) => {
      setList(prev =>
        prev
          ? { ...prev, items: fn(prev.items ?? []) }
          : { apiVersion: '', kind: '', items: fn([]) },
      );
    },
    [],
  );

  const prepend = useCallback(
    (item: T) => mutateItems(items => [item, ...items]),
    [mutateItems],
  );
  const replace = useCallback(
    (item: T) =>
      mutateItems(items =>
        items.map(it => (keyOf(it) === keyOf(item) ? item : it)),
      ),
    [mutateItems],
  );
  const remove = useCallback(
    (item: { metadata?: { name?: string; namespace?: string } }) =>
      mutateItems(items => items.filter(it => keyOf(it) !== keyOf(item))),
    [mutateItems],
  );

  return {
    items: list?.items ?? [],
    loading,
    error,
    loadedAt,
    list,
    reload,
    prepend,
    replace,
    remove,
  };
}

/*
 * Fetch-based Kubernetes resource client, as a class. The framework-agnostic
 * equivalent of the console SDK's Angular `K8sApiService` — same URLs, same
 * keyword-search prefix, same list normalization, and the streaming watch.
 *
 * The `fetch` implementation is injected (rather than reaching for the global),
 * so an app can supply one that adds auth — in octopus this is wired to the
 * `fetchApi` utility via `useApi(fetchApi)` at the provider layer.
 */

import { API_GATEWAY } from '../constants';
import type {
  KubernetesResource,
  KubernetesResourceList,
  Status,
  WatchEvent,
} from '../types';

import { definitionToApiParts, getApiPath, type ApiPathParams } from './getApiPath';
import type { K8sResourceDefinition } from './resourceDefinitions';

/** The `fetch` signature the client depends on (satisfied by `fetchApi.fetch`). */
export type FetchLike = typeof fetch;

/**
 * Keyword search lives behind a dedicated gateway prefix, replacing the
 * `API_GATEWAY` prefix of the resource URL (see the SDK's `_getResourceList`).
 */
const SEARCH_URL_PREFIX = '/acp/v1/resources/search';

/** Default per-connection watch timeout, matching the SDK's `TIMEOUT_SECONDS`. */
const WATCH_TIMEOUT_SECONDS = 59;
/** Backoff before reconnecting a watch after an error, matching `RETRY_DELAY`. */
const WATCH_RETRY_DELAY = 5000;

export interface ResourceParams {
  cluster?: string;
  definition: K8sResourceDefinition;
  namespace?: string;
  name?: string;
}

export interface ListResourceParams extends ResourceParams {
  /** Free-text search; routed through the gateway's resource-search prefix. */
  keyword?: string;
  /** Additional query params (labelSelector, fieldSelector, limit, …). */
  queryParams?: Record<string, string>;
  /**
   * Override the `Accept` header — e.g. to request a metadata-only
   * `PartialObjectMetadataList` and shrink the payload of large lists. Defaults
   * to `application/json`.
   */
  accept?: string;
}

export interface WatchParams extends ResourceParams {
  /** fieldSelector / labelSelector / etc. applied to the watched collection. */
  queryParams?: Record<string, string>;
}

export interface WatchHandlers<T extends KubernetesResource> {
  /** Called for each resource event (ADDED / MODIFIED / DELETED). */
  onEvent: (event: WatchEvent<T>) => void;
  /** Called when a connection errors; the watch keeps retrying afterwards. */
  onError?: (error: unknown) => void;
}

export interface WatchControls {
  signal?: AbortSignal;
  /** resourceVersion to start from; omitted starts from "now". */
  resourceVersion?: string;
  timeoutSeconds?: number;
}

export class K8sApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: Status,
  ) {
    super(message);
    this.name = 'K8sApiError';
  }
}

/** A `setTimeout` that resolves early (and cleanly) when the signal aborts. */
function abortableDelay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>(resolve => {
    if (signal?.aborted) {
      resolve();
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      resolve();
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/** Read a stream body line by line, buffering partial lines across chunks. */
async function readLines(
  body: ReadableStream<Uint8Array>,
  onLine: (line: string) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    let newline = buffer.indexOf('\n');
    while (newline >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line) {
        onLine(line);
      }
      newline = buffer.indexOf('\n');
    }
  }
  const tail = (buffer + decoder.decode()).trim();
  if (tail) {
    onLine(tail);
  }
}

/**
 * List API responses omit `kind`/`apiVersion` on each item. Reconstruct them
 * from the list envelope (e.g. `NamespaceList` → item kind `Namespace`).
 */
function normalizeList<T extends KubernetesResource>(
  list: KubernetesResourceList<T>,
): KubernetesResourceList<T> {
  const { apiVersion, kind, items } = list;
  if (!items?.length) {
    return { ...list, items: [] };
  }
  const itemKind = kind?.slice(0, -4);
  return {
    ...list,
    items: items.map(item => ({ kind: itemKind, apiVersion, ...item })),
  };
}

export class K8sApiClient {
  constructor(private readonly fetchFn: FetchLike) {}

  private buildPath(
    params: ResourceParams,
    opts: { ignoreName?: boolean } = {},
  ): string {
    const pathParams: ApiPathParams = {
      ...definitionToApiParts(params.definition),
      cluster: params.cluster,
      namespace: params.namespace,
      name: opts.ignoreName ? undefined : params.name,
    };
    return getApiPath(pathParams);
  }

  private async request<T>(
    url: string,
    init: RequestInit & { rawBody?: unknown } = {},
  ): Promise<T> {
    const { rawBody, headers, ...rest } = init;
    const res = await this.fetchFn(url, {
      credentials: 'include',
      ...rest,
      headers: {
        Accept: 'application/json',
        ...(rawBody === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...headers,
      },
      ...(rawBody === undefined ? {} : { body: JSON.stringify(rawBody) }),
    });

    const text = await res.text();
    const data = text ? (JSON.parse(text) as unknown) : undefined;

    if (!res.ok) {
      const body = data as Status | undefined;
      throw new K8sApiError(
        body?.message || `Request failed: ${res.status} ${res.statusText}`,
        res.status,
        body,
      );
    }
    return data as T;
  }

  async listResource<T extends KubernetesResource>(
    params: ListResourceParams,
  ): Promise<KubernetesResourceList<T>> {
    let url = this.buildPath(params, { ignoreName: true });
    const query = new URLSearchParams(params.queryParams);

    if (params.keyword) {
      url = url.replace(API_GATEWAY, `${API_GATEWAY}${SEARCH_URL_PREFIX}`);
      query.set('keyword', params.keyword);
      if (!query.has('field')) {
        query.set('field', 'metadata.name');
      }
    }

    const qs = query.toString();
    const list = await this.request<KubernetesResourceList<T>>(
      qs ? `${url}?${qs}` : url,
      params.accept ? { headers: { Accept: params.accept } } : {},
    );
    return normalizeList(list);
  }

  async getResource<T extends KubernetesResource>(
    params: ResourceParams & { name: string },
  ): Promise<T> {
    return this.request<T>(this.buildPath(params));
  }

  async createResource<T extends KubernetesResource>(
    params: ResourceParams & { resource: T },
  ): Promise<T> {
    return this.request<T>(this.buildPath(params, { ignoreName: true }), {
      method: 'POST',
      rawBody: params.resource,
    });
  }

  async updateResource<T extends KubernetesResource>(
    params: ResourceParams & { name: string; resource: T },
  ): Promise<T> {
    return this.request<T>(this.buildPath(params), {
      method: 'PUT',
      rawBody: params.resource,
    });
  }

  /**
   * `PUT` a resource, transparently recovering from a `409 Conflict` (stale
   * `resourceVersion`) by re-fetching the latest version and replaying the
   * write — the data-layer equivalent of `K8sUtilService.updateResource` +
   * `retryUpdate`, minus its interactive "retry?" dialog.
   */
  async updateResourceWithRetry<T extends KubernetesResource>(
    params: ResourceParams & { name: string; resource: T },
    maxRetries = 3,
  ): Promise<T> {
    let resource = params.resource;
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.updateResource<T>({ ...params, resource });
      } catch (error) {
        if (
          !(error instanceof K8sApiError) ||
          error.status !== 409 ||
          attempt >= maxRetries
        ) {
          throw error;
        }
        const latest = await this.getResource<T>(params);
        resource = {
          ...resource,
          metadata: {
            ...resource.metadata,
            resourceVersion: latest.metadata?.resourceVersion,
          },
        };
      }
    }
  }

  async deleteResource(
    params: ResourceParams & { name: string },
  ): Promise<Status> {
    return this.request<Status>(this.buildPath(params), { method: 'DELETE' });
  }

  /**
   * Open a self-reconnecting watch. Resolves when the signal aborts; otherwise
   * runs until aborted. Tracks `resourceVersion` across reconnects and restarts
   * from scratch on `410 Gone`. Consume events via `handlers.onEvent`.
   */
  async watch<T extends KubernetesResource>(
    params: WatchParams,
    handlers: WatchHandlers<T>,
    controls: WatchControls = {},
  ): Promise<void> {
    const { signal } = controls;
    let resourceVersion = controls.resourceVersion;
    const timeoutSeconds = controls.timeoutSeconds ?? WATCH_TIMEOUT_SECONDS;
    const base = getApiPath({
      ...definitionToApiParts(params.definition),
      cluster: params.cluster,
      namespace: params.namespace,
    });

    while (!signal?.aborted) {
      try {
        const query = new URLSearchParams({
          ...params.queryParams,
          watch: 'true',
          allowWatchBookmarks: 'true',
          timeoutSeconds: String(timeoutSeconds),
          ...(resourceVersion ? { resourceVersion } : {}),
        });
        const res = await this.fetchFn(`${base}?${query.toString()}`, {
          credentials: 'include',
          headers: { Accept: 'application/json' },
          signal,
        });

        // resourceVersion expired — drop it and restart from the latest state.
        if (res.status === 410) {
          resourceVersion = undefined;
          continue;
        }
        if (!res.ok || !res.body) {
          throw new Error(`Watch failed: ${res.status} ${res.statusText}`);
        }

        await readLines(res.body, line => {
          let event: WatchEvent<T>;
          try {
            event = JSON.parse(line) as WatchEvent<T>;
          } catch {
            return;
          }
          const rv = event.object?.metadata?.resourceVersion;
          if (rv) {
            resourceVersion = rv;
          }
          if (event.type === 'BOOKMARK') {
            return;
          }
          if (event.type === 'ERROR') {
            throw new Error('Watch stream returned an ERROR event');
          }
          handlers.onEvent(event);
        });
        // Stream closed by the server's timeout — loop and reconnect.
      } catch (error) {
        if (signal?.aborted) {
          break;
        }
        handlers.onError?.(error);
        await abortableDelay(WATCH_RETRY_DELAY, signal);
      }
    }
  }

  /**
   * Watch a single named resource, emitting the current object on every change
   * (and `null` when deleted). Filters the collection by `metadata.name`, as the
   * SDK's `watchResource` does.
   */
  async watchResource<T extends KubernetesResource>(
    params: ResourceParams & { name: string },
    onChange: (resource: T | null) => void,
    controls: WatchControls = {},
  ): Promise<void> {
    await this.watch<T>(
      {
        cluster: params.cluster,
        definition: params.definition,
        namespace: params.namespace,
        queryParams: { fieldSelector: `metadata.name=${params.name}` },
      },
      {
        onEvent: event =>
          onChange(event.type === 'DELETED' ? null : event.object),
      },
      controls,
    );
  }
}

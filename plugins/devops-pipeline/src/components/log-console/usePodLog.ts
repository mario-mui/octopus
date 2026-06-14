/*
 * Fetch a pod container's logs from the Kubernetes gateway, with optional
 * polling while the step is still running. Mirrors the console's step-logs
 * fetch: a plain text GET against
 *   {API_GATEWAY}/kubernetes/<cluster>/api/v1/namespaces/<ns>/pods/<pod>/log
 * with `container` + `timestamps` query params. Auth rides on the app's
 * `fetchApi`, exactly like the K8s client.
 */
import { useEffect, useRef, useState } from 'react';
import { fetchApiRef, useApi } from '@octopus/core-plugin-api';
import { API_GATEWAY } from '@octopus/console-core-common';

/** While running, re-fetch the log on this cadence (ms) — matches the console. */
const POLL_INTERVAL = 3000;

export interface UsePodLogParams {
  cluster?: string;
  namespace?: string;
  podName?: string;
  container?: string;
  timestamps: boolean;
  /** Poll while true (step running + auto-update on); single fetch otherwise. */
  poll: boolean;
}

export interface PodLogState {
  text: string;
  loading: boolean;
  error: string | null;
}

export function usePodLog({
  cluster,
  namespace,
  podName,
  container,
  timestamps,
  poll,
}: UsePodLogParams): PodLogState {
  const fetchApi = useApi(fetchApiRef);
  const [state, setState] = useState<PodLogState>({
    text: '',
    loading: false,
    error: null,
  });
  // Keep the latest poll flag without re-running the effect on every toggle.
  const pollRef = useRef(poll);
  pollRef.current = poll;

  // The log's identity — when it changes we're showing a different step, so the
  // previous step's text must be cleared (and the spinner shown). A silent poll
  // keeps the same identity and so keeps the existing text on screen.
  const identity = `${cluster}|${namespace}|${podName}|${container}|${timestamps}`;
  const identityRef = useRef('');

  useEffect(() => {
    if (!cluster || !namespace || !podName || !container) {
      setState({ text: '', loading: false, error: null });
      identityRef.current = identity;
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (identityRef.current !== identity) {
      identityRef.current = identity;
      setState({ text: '', loading: true, error: null });
    }

    const url =
      `${API_GATEWAY}/kubernetes/${cluster}/api/v1/namespaces/` +
      `${namespace}/pods/${podName}/log?container=${encodeURIComponent(
        container,
      )}&timestamps=${timestamps}`;

    const load = async (withSpinner: boolean) => {
      if (withSpinner) {
        setState(s => ({ ...s, loading: true }));
      }
      try {
        const res = await fetchApi.fetch(url);
        const body = await res.text();
        if (!cancelled) {
          setState({ text: body, loading: false, error: null });
        }
      } catch (e) {
        if (!cancelled) {
          setState(s => ({
            ...s,
            loading: false,
            error: (e as Error).message,
          }));
        }
      } finally {
        if (!cancelled && pollRef.current) {
          timer = setTimeout(() => load(false), POLL_INTERVAL);
        }
      }
    };

    load(true);
    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [cluster, namespace, podName, container, timestamps, poll, fetchApi]);

  return state;
}

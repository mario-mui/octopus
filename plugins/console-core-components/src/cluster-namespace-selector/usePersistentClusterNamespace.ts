/*
 * Persistent cluster + namespace selection with a manual "lock".
 *
 * Pages that pick a cluster/namespace in-page (the project-scoped list pages)
 * normally hold the selection in transient component state, so navigating away
 * and back makes the user choose again. This hook adds an opt-in lock: when the
 * user locks the selection it is written to `localStorage` (scoped per project)
 * and re-hydrated on every page and across reloads, so the choice sticks until
 * they unlock. While unlocked the selection stays ephemeral (the selector's
 * usual auto-select-first behaviour applies).
 */
import { useCallback, useEffect, useState } from 'react';
import { ClusterNamespaceValue } from './types';

const STORAGE_PREFIX = 'octopus.cluster-namespace';

/** localStorage key for a project's locked selection (project-scoped). */
function storageKey(project?: string): string {
  return `${STORAGE_PREFIX}:${project ?? ''}`;
}

/** Read a project's locked selection, or `null` when absent/malformed. */
function readStored(project?: string): ClusterNamespaceValue | null {
  try {
    const raw = localStorage.getItem(storageKey(project));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<ClusterNamespaceValue>;
    if (parsed?.cluster && parsed?.namespace) {
      return { cluster: parsed.cluster, namespace: parsed.namespace };
    }
  } catch {
    // Ignore unavailable storage (private mode) or malformed JSON.
  }
  return null;
}

export interface PersistentClusterNamespace {
  /** The active `{ cluster, namespace }` selection. */
  value: ClusterNamespaceValue;
  /** Commit a new selection (persisted immediately when locked). */
  setValue: (value: ClusterNamespaceValue) => void;
  /** Whether the selection is locked (persisted across pages/reloads). */
  locked: boolean;
  /** Lock or unlock; unlocking clears the persisted selection. */
  setLocked: (locked: boolean) => void;
}

export function usePersistentClusterNamespace(
  project?: string,
): PersistentClusterNamespace {
  // Initialise from this project's locked selection, if one was persisted.
  const [value, setValue] = useState<ClusterNamespaceValue>(
    () => readStored(project) ?? { cluster: '', namespace: '' },
  );
  const [locked, setLocked] = useState(() => readStored(project) != null);

  // Re-hydrate when the project changes (each project locks independently).
  useEffect(() => {
    const stored = readStored(project);
    setValue(stored ?? { cluster: '', namespace: '' });
    setLocked(stored != null);
  }, [project]);

  // Mirror the locked selection into storage; clear it when unlocked.
  useEffect(() => {
    try {
      if (locked && value.cluster && value.namespace) {
        localStorage.setItem(storageKey(project), JSON.stringify(value));
      } else {
        localStorage.removeItem(storageKey(project));
      }
    } catch {
      // Ignore storage write failures (private mode, quota, ...).
    }
  }, [project, locked, value.cluster, value.namespace]);

  return {
    value,
    setValue: useCallback((next: ClusterNamespaceValue) => setValue(next), []),
    locked,
    setLocked: useCallback((next: boolean) => setLocked(next), []),
  };
}

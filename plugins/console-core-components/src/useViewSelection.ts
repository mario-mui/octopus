/*
 * Shared selection logic for the view-scoped resource selectors (project /
 * cluster). The URL is the source of truth: the selected resource is the
 * view's route param (e.g. `/console/applications/:projectName`). This hook:
 *
 *  - reads the active value (and any trailing sub-path) from the URL;
 *  - redirects to a default when the view is opened without a valid value —
 *    the last choice (persisted) if it still exists, else the first item;
 *  - on select, navigates to the new resource while keeping the sub-path;
 *  - persists the choice so the next visit defaults to it.
 */
import { useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getView, ViewId, viewPath } from '@octopus/console-core-common';
import { ResourceItem } from './types';

interface ViewSelection {
  /** The active, valid resource name, or undefined while resolving. */
  value: string | undefined;
  /** Select a resource by name (navigates, preserving the sub-path). */
  select: (name: string) => void;
}

function storageKey(viewId: ViewId): string {
  return `console:selected-${viewId}`;
}

function readStored(viewId: ViewId): string | undefined {
  try {
    return window.localStorage.getItem(storageKey(viewId)) ?? undefined;
  } catch {
    return undefined;
  }
}

function writeStored(viewId: ViewId, name: string): void {
  try {
    window.localStorage.setItem(storageKey(viewId), name);
  } catch {
    // Ignore storage failures (e.g. private mode).
  }
}

export function useViewSelection(
  viewId: ViewId,
  items: ResourceItem[],
): ViewSelection {
  const view = getView(viewId);
  const location = useLocation();
  const navigate = useNavigate();
  const base = view?.basePath ?? '';

  // Split the path after the view base into the resource value and sub-path.
  const rel =
    location.pathname === base
      ? ''
      : location.pathname.startsWith(`${base}/`)
        ? location.pathname.slice(base.length + 1)
        : '';
  const [value = '', ...restParts] = rel ? rel.split('/') : [];
  const subPath = restParts.join('/');
  const valid = !!value && items.some(item => item.name === value);

  // Once the list is known, ensure the URL carries a valid resource.
  useEffect(() => {
    if (!view?.param || valid || !items.length) {
      return;
    }
    const stored = readStored(viewId);
    const target =
      stored && items.some(item => item.name === stored)
        ? stored
        : items[0].name;
    navigate(viewPath(viewId, target, subPath), { replace: true });
  }, [view, valid, items, viewId, subPath, navigate]);

  const select = useCallback(
    (name: string) => {
      writeStored(viewId, name);
      navigate(viewPath(viewId, name, subPath));
    },
    [viewId, subPath, navigate],
  );

  return { value: valid ? value : undefined, select };
}

/** A selectable resource (project or cluster) shown in a resource selector. */
export interface ResourceItem {
  /** Stable identifier; used as the selection key and persisted value. */
  name: string;
  /** Human-friendly label; falls back to `name` when absent. */
  displayName?: string;
  /** Coarse health indicator, mirroring the console's resource status. */
  status?: 'normal' | 'abnormal';
}

/** A project shown in the application view's selector. */
export type Project = ResourceItem;

/** A cluster shown in the cluster view's selector. */
export type Cluster = ResourceItem;

/** A `{ cluster, namespace }` selection made by the cluster-namespace selector. */
export interface ClusterNamespaceValue {
  /** Name of the selected cluster. */
  cluster: string;
  /** Name of the selected namespace within that cluster. */
  namespace: string;
}

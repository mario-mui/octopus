/*
 * Concrete Kubernetes resource types used by the console, built on the core
 * types in `./k8s-core`. Ported from the console SDK's `types/k8s.ts` (Namespace)
 * and `types/console.ts` (Cluster, Project).
 */
import {
  Condition,
  KubernetesResource,
  ObjectMeta,
} from './k8s-core';

/* -------------------------------------------------------------------------- */
/* Namespace                                                                  */
/* -------------------------------------------------------------------------- */

export interface NamespaceStatus {
  phase?: string;
}

export interface Namespace extends KubernetesResource {
  status?: NamespaceStatus;
}

/* -------------------------------------------------------------------------- */
/* Cluster                                                                    */
/* -------------------------------------------------------------------------- */

export interface ClusterSpec {
  authInfo?: {
    controller: {
      kind: string;
      namespace: string;
      name: string;
    };
  };
  kubernetesApiEndpoints?: {
    caBundle?: string;
    serverEndpoints: Array<{
      clientCIDR: string;
      serverAddress: string;
    }>;
  };
}

export type ClusterStatusReason =
  | 'Timeout'
  | 'Forbidden'
  | 'Unauthorized'
  | 'SomeComponentsUnhealthy'
  | 'SomeNodesNotReady';

export interface ClusterStatusCondition extends Condition {
  lastTransitionTime: string;
  type: 'NotReachable' | 'NotAccessible' | 'ComponentNotHealthy' | 'NodeNotReady';
  status: 'True' | 'False';
  reason: ClusterStatusReason;
}

export interface ClusterStatus {
  version: string;
  conditions: ClusterStatusCondition[];
}

/** `clusters.clusterregistry.k8s.io` resource. */
export interface Cluster extends KubernetesResource {
  metadata?: ObjectMeta & {
    finalizers?: string[];
  };
  spec?: ClusterSpec;
  status?: ClusterStatus;
  details?: {
    group: string;
    kind: string;
    name: string;
    uid: string;
  };
}

/* -------------------------------------------------------------------------- */
/* Project                                                                    */
/* -------------------------------------------------------------------------- */

export interface ProjectCluster {
  name: string;
  quota: Record<string, string>;
  type?: '' | 'FedMember';
}

export interface ProjectSpec {
  clusters: ProjectCluster[];
  status?: {
    phase: string;
  };
  clusterDeletePolicy?: 'Delete' | 'Retain';
}

export interface Project extends KubernetesResource {
  spec: ProjectSpec;
  status?: {
    phase: string;
  };
}

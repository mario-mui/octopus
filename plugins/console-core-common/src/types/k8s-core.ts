/*
 * Core Kubernetes types: the base building blocks (TypeMeta, ObjectMeta,
 * Condition, references, selectors, the resource + list envelopes, RBAC review
 * attributes). These rarely change and underpin the concrete resource types in
 * `./k8s`. Ported from the console SDK's `types/k8s-core.ts`.
 */

/** A plain string→string map (labels, annotations, …). */
export type StringMap = Record<string, string>;

export interface ObjectReference {
  kind?: string;
  namespace?: string;
  name?: string;
  uid?: string;
  apiVersion?: string;
  resourceVersion?: string;
  fieldPath?: string;
}

export interface LabelSelector {
  matchLabels?: StringMap;
  matchExpressions?: LabelSelectorRequirement[];
}

export interface LabelSelectorRequirement {
  key: string;
  operator?:
    | '='
    | '=='
    | '!='
    | '!'
    | 'in'
    | 'notin'
    | 'exists'
    | 'doesnotexist'
    | 'In';
  values?: string[];
}

export interface TypeMeta {
  kind?: string;
  apiVersion?: string;
}

export interface OwnerReference {
  apiVersion: string;
  kind: string;
  name: string;
  uid: string;
  controller?: boolean;
  blockOwnerDeletion?: boolean;
}

/** Metadata every persisted resource carries. */
export interface ObjectMeta {
  name?: string;
  generateName?: string;
  namespace?: string;
  labels?: StringMap;
  annotations?: StringMap;
  finalizers?: string[];
  selfLink?: string;
  uid?: string;
  creationTimestamp?: string;
  deletionTimestamp?: string;
  ownerReferences?: OwnerReference[];
  resourceVersion?: string;
  generation?: number;
  continue?: string;
  totalItems?: number;
  managedFields?: unknown;
}

export interface KubernetesResource extends TypeMeta {
  metadata?: ObjectMeta;
  spec?: unknown;
  status?: unknown;
}

export interface UntypedKubernetesResource extends TypeMeta {
  metadata?: ObjectMeta;
  spec?: any;
  status?: any;
}

export interface KubernetesResourceList<
  T extends KubernetesResource = KubernetesResource,
> extends KubernetesResource {
  items: T[];
}

export interface Condition {
  lastProbeTime?: string;
  lastTransitionTime?: string;
  message?: string;
  reason?: string;
  status?: string;
  type?: string;
}

/**
 * Kubernetes Subject
 * https://github.com/kubernetes/api/blob/master/rbac/v1/types.go
 */
export interface KubernetesSubject {
  kind: string;
  APIGroup?: string;
  namespace?: string;
  name: string;
}

export type K8sVerb =
  | 'create'
  | 'get'
  | 'list'
  | 'update'
  | 'patch'
  | 'delete'
  | 'deletecollection'
  | 'watch'
  | 'impersonate';

export interface AccessReviewResourceAttributes {
  group?: string;
  resource?: string;
  subresource?: string;
  verb?: K8sVerb;
  name?: string;
  namespace?: string;
  /** Alauda gateway extensions, only honoured by the `advanced` auth endpoint. */
  cluster?: string;
  project?: string;
}

/**
 * Kubernetes `SelfSubjectAccessReview`: the result of asking the API server
 * whether the current user may perform `spec.resourceAttributes.verb`.
 * https://kubernetes.io/docs/reference/kubernetes-api/authorization-resources/self-subject-access-review-v1/
 */
export interface SelfSubjectAccessReview extends TypeMeta {
  spec?: {
    resourceAttributes?: AccessReviewResourceAttributes;
  };
  status?: {
    allowed: boolean;
    denied?: boolean;
    reason?: string;
    evaluationError?: string;
  };
}

/**
 * The `type` field of a Kubernetes watch stream event.
 * `BOOKMARK` carries only a resourceVersion (no real change); `ERROR` signals a
 * stream-level failure (e.g. `410 Gone`). Mirrors the SDK's `WatchEvent` enum.
 */
export type WatchEventType =
  | 'ADDED'
  | 'MODIFIED'
  | 'DELETED'
  | 'ERROR'
  | 'BOOKMARK';

/** One newline-delimited event from a `?watch=true` stream. */
export interface WatchEvent<T extends KubernetesResource = KubernetesResource> {
  type: WatchEventType;
  object: T;
}

/**
 * Kubernetes `Status`: the response body returned by the API server for
 * operations that don't return a resource (e.g. delete) or for errors.
 * https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#status-v1-meta
 */
export interface Status extends TypeMeta {
  metadata?: ObjectMeta;
  status?: 'Success' | 'Failure';
  message?: string;
  reason?: string;
  code?: number;
  details?: unknown;
}

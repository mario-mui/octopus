/*
 * Tekton Pipeline model. Ported from the console's `types/k8s-types.ts` (the
 * subset the editor needs). Built on the shared `KubernetesResource` base from
 * @octopus/console-core-common.
 */
import type { KubernetesResource } from '@octopus/console-core-common';

export interface Pipeline extends KubernetesResource {
  spec?: PipelineSpec;
}

export interface PipelineSpec extends PipelineOrchestration {
  params?: ParameterDeclaration[];
  description?: string;
  workspaces?: WorkspaceDeclaration[];
  results?: PipelineResult[];
}

export interface PipelineOrchestration {
  tasks?: PipelineTask[];
  finally?: PipelineTask[];
}

export interface PipelineResult {
  name: string;
  type?: ParameterType;
  description?: string;
  value?: ParameterValue;
}

export enum ParameterType {
  String = 'string',
  Array = 'array',
  Object = 'object',
}

export type ObjectParameterValue = Record<string, string>;
export type ParameterValue = string | string[] | ObjectParameterValue;

export interface ParameterDeclaration<
  T = ParameterType,
  R = ParameterValue,
> {
  name: string;
  description?: string;
  type?: T;
  default?: R;
  properties?: Record<string, { type: string }>;
}

export interface ParameterInputSet<T = ParameterValue> {
  name: string;
  value: T | string;
}

export enum PipelineTaskOnError {
  continue = 'continue',
  stopAndFail = 'stopAndFail',
}

export interface PipelineTask {
  name: string;
  displayName?: string;
  description?: string;
  taskRef?: TektonResourceRef;
  taskSpec?: TaskSpec;
  runAfter?: string[];
  when?: WhenSpec[];
  retries?: number;
  timeout?: string;
  workspaces?: PipelineTaskWorkspace[];
  params?: ParameterInputSet[];
  onError?: PipelineTaskOnError;
}

export interface PipelineTaskWorkspace {
  name: string;
  workspace: string;
  subPath?: string;
}

export interface WhenSpec {
  input: string;
  operator: string;
  values: string[];
}

export enum TektonResourceRefResolver {
  Hub = 'hub',
}

export enum TektonResourceRefKind {
  ApprovalTask = 'ApprovalTask',
  Task = 'Task',
  Pipeline = 'Pipeline',
}

export interface TektonResourceRef {
  apiVersion?: string;
  kind?: TektonResourceRefKind;
  name?: string;
  resolver?: TektonResourceRefResolver;
  params?: Array<{ name: string; value: string }>;
}

export interface TaskResult<T = ParameterType> {
  name: string;
  type?: T;
  description?: string;
  properties?: Record<string, { type: string }>;
}

export interface TaskSpecStep {
  name?: string;
  image?: string;
  script?: string;
  command?: string[];
  args?: string[];
}

export interface TaskSpec {
  description?: string;
  params?: ParameterDeclaration[];
  results?: TaskResult[];
  workspaces?: WorkspaceDeclaration[];
  steps?: TaskSpecStep[];
}

export interface WorkspaceDeclaration {
  name: string;
  description?: string;
  optional?: boolean;
}

/** A Tekton Task resource (used by the task picker). */
export interface Task extends KubernetesResource {
  spec?: TaskSpec;
}

/**
 * A Tekton PipelineRun — one execution of a Pipeline. Ported from the console's
 * `types/k8s-types.ts` (the subset the list + detail pages need).
 */
export interface PipelineRun extends KubernetesResource {
  spec?: PipelineRunSpec;
  status?: PipelineRunStatus;
}

export interface PipelineRunSpec {
  pipelineRef?: TektonResourceRef;
  params?: ParameterInputSet[];
  workspaces?: WorkspaceBinding[];
  /** Desired lifecycle state, e.g. `Cancelled` / `StoppedRunFinally`. */
  status?: string;
  timeouts?: { pipeline?: string };
}

export interface WorkspaceBinding {
  name: string;
  subPath?: string;
  [key: string]: unknown;
}

export interface PipelineRunStatus {
  conditions?: Condition[];
  startTime?: string;
  completionTime?: string;
  childReferences?: PipelineRunChildReference[];
  pipelineSpec?: PipelineSpec;
  results?: Array<{ name: string; value: ParameterValue }>;
}

export interface Condition {
  type?: string;
  status?: string;
  reason?: string;
  message?: string;
  lastTransitionTime?: string;
}

/** A reference from a PipelineRun to one of its child TaskRuns. */
export interface PipelineRunChildReference {
  name: string;
  pipelineTaskName: string;
  kind?: string;
  apiVersion?: string;
}

/**
 * A Tekton TaskRun — one execution of a Task within a PipelineRun. Its
 * `status.steps` drive the task tree's step children and `status.podName`
 * names the pod whose container logs the log console reads.
 */
export interface TaskRun extends KubernetesResource {
  spec?: TaskRunSpec;
  status?: TaskRunStatus;
}

export interface TaskRunSpec {
  taskRef?: TektonResourceRef;
  params?: ParameterInputSet[];
  workspaces?: WorkspaceBinding[];
  serviceAccountName?: string;
}

export interface TaskRunStatus {
  conditions?: Condition[];
  startTime?: string;
  completionTime?: string;
  steps?: StepState[];
  taskSpec?: TaskSpec;
  results?: Array<{ name: string; value: ParameterValue }>;
  /** Pod backing this TaskRun; the source of step container logs. */
  podName?: string;
}

/** The lifecycle state of one container (a step / Tekton container). */
export interface ContainerState {
  waiting?: { reason?: string; message?: string };
  running?: { startedAt?: string };
  terminated?: {
    containerID?: string;
    exitCode?: number;
    finishedAt?: string;
    reason?: string;
    startedAt?: string;
  };
}

/** One step's runtime state within a TaskRun. */
export interface StepState extends ContainerState {
  name: string;
  /** The pod container name to read logs from. */
  container: string;
  imageID?: string;
}

/**
 * A Tekton Hub catalog resource. The `spec.manifest` holds the referenced
 * resource's YAML (a Task / Pipeline), parsed on demand when resolving a hub
 * `taskRef`.
 */
export interface HubResource extends KubernetesResource {
  spec?: {
    version?: string;
    available_versions?: string[];
    /** YAML of the backing resource (e.g. a Task). */
    manifest?: string;
    readme?: string;
    platforms?: string[];
  };
}

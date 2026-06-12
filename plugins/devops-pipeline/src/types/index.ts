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

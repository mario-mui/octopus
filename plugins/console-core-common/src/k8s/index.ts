/*
 * Framework-agnostic Kubernetes data + permission + metadata layer, ported from
 * the console SDK (`@alauda-fe/dynamic-plugin-sdk`) into class form, plus the
 * octopus API references and providers that expose them via `useApi`.
 *
 * @packageDocumentation
 */

export {
  COMMON_RESOURCE_DEFINITIONS,
  type K8sResourceDefinition,
  type CommonResourceType,
} from './resourceDefinitions';
export {
  getApiPath,
  getApiPrefixParts,
  normalizeApiGroup,
  definitionToApiParts,
  type ApiPathParams,
} from './getApiPath';
export {
  K8sApiClient,
  K8sApiError,
  type FetchLike,
  type ResourceParams,
  type ListResourceParams,
  type WatchParams,
  type WatchHandlers,
  type WatchControls,
} from './K8sApiClient';
export {
  K8sPermissionClient,
  type CheckAccessParams,
} from './K8sPermissionClient';
export {
  K8sUtilClient,
  LABEL_BASE_DOMAIN,
  DISPLAY_NAME,
  DESCRIPTION,
  CREATOR,
  UPDATED_AT,
  PROJECT,
} from './K8sUtilClient';
export {
  K8sApi,
  K8sPermissionApi,
  K8sUtil,
  k8sApiExtension,
  k8sPermissionApiExtension,
  k8sUtilExtension,
} from './k8sApi';

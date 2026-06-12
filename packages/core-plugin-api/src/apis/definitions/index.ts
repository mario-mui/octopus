export {
  appTreeApiRef,
  type AppNode,
  type AppNodeEdges,
  type AppNodeInstance,
  type AppNodeSpec,
  type AppTree,
  type AppTreeApi,
} from './AppTreeApi';

// This folder contains definitions for all core APIs.
//
// Plugins should rely on these APIs for functionality as much as possible.
//
// If you think some API definition is missing, please open an Issue or send a PR!

export * from './auth';

export * from './AppLanguageApi';
export * from './AppThemeApi';
export * from './ConfigApi';
export * from './DiscoveryApi';
export * from './ErrorApi';
export * from './FeatureFlagsApi';
export * from './FetchApi';
export * from './IconsApi';
export * from './IdentityApi';
export * from './DialogApi';
export * from './OAuthRequestApi';
export * from './RouteResolutionApi';
export * from './StorageApi';
export * from './AnalyticsApi';
export * from './ToastApi';
export * from './TranslationApi';
export * from './PluginHeaderActionsApi';
export * from './PluginWrapperApi';

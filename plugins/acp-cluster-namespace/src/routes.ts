import { createRouteRef } from '@octopus/core-plugin-api';

// A single route ref for the plugin's mount point at
// /console/clusters/:clusterName/namespaces. The list/detail split below it is
// handled by the plugin's own <Routes> (see NamespaceRoutes), not by separate
// app-level route extensions.
export const namespaceRouteRef = createRouteRef();

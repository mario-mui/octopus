import { createRouteRef } from '@octopus/core-plugin-api';

// A single route ref for the plugin's mount point at
// /console/applications/:projectName/pipelines. The list/detail/create/update
// split below it is handled by the plugin's own <Routes> (see PipelineRoutes);
// the cluster + namespace are carried in those sub-paths, not the mount param.
export const pipelineRouteRef = createRouteRef();

// Mount point for the pipeline-run pages at
// /console/applications/:projectName/pipelineruns. Like the pipeline routes,
// the list/detail split below it is handled by the plugin's own <Routes>.
export const pipelineRunRouteRef = createRouteRef();

/*
 * Internal routing for the pipeline plugin. The page is project-scoped (the
 * mount param is the project); the chosen cluster + namespace ride in a single
 * `ws` segment (`cluster~namespace`, see `useWorkspace` / `buildWorkspaceUrl`),
 * mirroring the console's `:ws/detail/:name` routing.
 *
 *   index             → list    (…/pipelines)
 *   create            → create  (…/pipelines/create?ws=cluster~namespace)
 *   :ws/detail/:name  → detail
 *   :ws/update/:name  → update
 */
import { Routes, Route } from 'react-router-dom';
import { WORKSPACE_ROUTER_NAME } from '@octopus/console-core-components';
import { PipelineListPage } from './PipelineListPage';
import { PipelineDetailPage } from './PipelineDetailPage';
import { PipelineCreatePage } from './PipelineCreatePage';
import { PipelineUpdatePage } from './PipelineUpdatePage';

export function PipelineRoutes() {
  return (
    <Routes>
      <Route index element={<PipelineListPage />} />
      <Route path="create" element={<PipelineCreatePage />} />
      <Route
        path={`:${WORKSPACE_ROUTER_NAME}/detail/:name`}
        element={<PipelineDetailPage />}
      />
      <Route
        path={`:${WORKSPACE_ROUTER_NAME}/update/:name`}
        element={<PipelineUpdatePage />}
      />
    </Routes>
  );
}

export default PipelineRoutes;

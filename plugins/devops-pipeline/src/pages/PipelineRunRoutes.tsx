/*
 * Internal routing for the pipeline-run pages. Like the pipeline routes, the
 * page is project-scoped and the chosen cluster + namespace ride in a single
 * `ws` segment (`cluster~namespace`, see `useWorkspace` / `buildWorkspaceUrl`).
 *
 *   index             → list    (…/pipelineruns)
 *   :ws/detail/:name  → detail
 */
import { Routes, Route } from 'react-router-dom';
import { WORKSPACE_ROUTER_NAME } from '@octopus/console-core-components';
import { PipelineRunListPage } from './PipelineRunListPage';
import { PipelineRunDetailPage } from './PipelineRunDetailPage';

export function PipelineRunRoutes() {
  return (
    <Routes>
      <Route index element={<PipelineRunListPage />} />
      <Route
        path={`:${WORKSPACE_ROUTER_NAME}/detail/:name`}
        element={<PipelineRunDetailPage />}
      />
    </Routes>
  );
}

export default PipelineRunRoutes;

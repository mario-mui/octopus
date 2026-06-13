/*
 * devops-pipeline: contributes the Tekton Pipeline pages to an Octopus app.
 * Ported from the console's Angular `features/pipeline` module — with the
 * orchestration ("流水线编排") editor as its centerpiece, rebuilt on the
 * reusable @octopus/topology engine.
 *
 * Attaches to the `application` view, so its routes resolve under
 * /console/applications/:projectName/pipelines. The page is project-scoped; the
 * cluster + namespace are chosen in-page via the cluster-namespace selector. The
 * plugin definition is tiny and eager; the pages + editor are code-split via
 * React.lazy.
 */
import { Suspense, lazy } from 'react';
import { Spin } from 'antd';
import { createFrontendPlugin } from '@octopus/core-plugin-api';
import { PageBlueprint } from '@octopus/app-defaults';
import { ApartmentOutlined } from '@ant-design/icons';
import { pipelineRouteRef } from './routes';

const PipelineRoutes = lazy(() => import('./pages/PipelineRoutes'));

const pipelinePage = PageBlueprint.make({
  name: 'pipelines',
  params: {
    path: 'pipelines',
    title: 'Pipelines',
    icon: <ApartmentOutlined />,
    view: 'application',
    element: (
      <Suspense fallback={<Spin />}>
        <PipelineRoutes />
      </Suspense>
    ),
    routeRef: pipelineRouteRef,
  },
});

export const devopsPipelinePlugin = createFrontendPlugin({
  pluginId: 'devops-pipeline',
  routes: {
    root: pipelineRouteRef,
  },
  extensions: [pipelinePage],
});

export default devopsPipelinePlugin;

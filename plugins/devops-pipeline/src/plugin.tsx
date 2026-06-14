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
import { pipelineRouteRef, pipelineRunRouteRef } from './routes';

const PipelineRoutes = lazy(() => import('./pages/PipelineRoutes'));
const PipelineRunRoutes = lazy(() => import('./pages/PipelineRunRoutes'));

// Both pages nest under a single "Pipelines" sidebar group (see design/image.png):
// the group is an expandable parent holding the "Pipelines" and "PipelineRuns"
// entries.
const PIPELINES_NAV_PARENT = {
  id: 'pipelines',
  title: 'Pipelines',
  icon: <ApartmentOutlined />,
};

const pipelinePage = PageBlueprint.make({
  name: 'pipelines',
  params: {
    path: 'pipelines',
    title: 'Pipelines',
    icon: <ApartmentOutlined />,
    view: 'application',
    navParent: PIPELINES_NAV_PARENT,
    element: (
      <Suspense fallback={<Spin />}>
        <PipelineRoutes />
      </Suspense>
    ),
    routeRef: pipelineRouteRef,
  },
});

const pipelineRunPage = PageBlueprint.make({
  name: 'pipelineruns',
  params: {
    path: 'pipelineruns',
    title: 'PipelineRuns',
    icon: <ApartmentOutlined />,
    view: 'application',
    navParent: PIPELINES_NAV_PARENT,
    element: (
      <Suspense fallback={<Spin />}>
        <PipelineRunRoutes />
      </Suspense>
    ),
    routeRef: pipelineRunRouteRef,
  },
});

export const devopsPipelinePlugin = createFrontendPlugin({
  pluginId: 'devops-pipeline',
  routes: {
    root: pipelineRouteRef,
  },
  extensions: [pipelinePage, pipelineRunPage],
});

export default devopsPipelinePlugin;

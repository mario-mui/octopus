/*
 * Example dynamic (Module Federation) plugin.
 *
 * It is authored exactly like a static plugin — the only difference is in how
 * it is built (as an MF remote) and consumed (loaded at runtime by the host).
 * The default export is the plugin, which the host's dynamic-loader detects via
 * its `$$type` brand and feeds into the same `createApp` pipeline.
 */
import { createFrontendPlugin } from '@octopus/core-plugin-api';
import { PageBlueprint } from '@octopus/app-defaults';
import { ApiOutlined } from '@ant-design/icons';
import { RemoteDemoPage } from './RemoteDemoPage';
import { NavLabel } from './NavLabel';

const remoteDemoPage = PageBlueprint.make({
  name: 'remote-demo',
  params: {
    path: 'remote-demo',
    // The plugin defines its own nav entry: an icon plus an internationalized
    // label (`navLabel`). `title` stays as the plain-text fallback.
    title: 'Remote Demo',
    navLabel: <NavLabel messageKey="nav_remote_demo" />,
    icon: <ApiOutlined />,
    view: 'application',
    element: <RemoteDemoPage />,
  },
});

export default createFrontendPlugin({
  pluginId: 'remote-demo',
  extensions: [remoteDemoPage],
});

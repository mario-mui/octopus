// @vitest-environment jsdom
import { act } from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { createFrontendPlugin } from '@octopus/core-plugin-api';
import { PageBlueprint } from '@octopus/app-defaults';
import { createDevApp } from './createDevApp';

const devPlugin = createFrontendPlugin({
  pluginId: 'dev-test',
  extensions: [
    PageBlueprint.make({
      name: 'main',
      params: {
        path: '/',
        title: 'Dev Harness Page',
        element: <div>hello from the plugin under development</div>,
      },
    }),
  ],
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('createDevApp', () => {
  it('mounts the plugin inside the default Ant Design app shell', async () => {
    const root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);

    await act(async () => {
      createDevApp({ features: [devPlugin] });
    });

    // The plugin's page rendered...
    expect(document.body.textContent).toContain(
      'hello from the plugin under development',
    );
    // ...inside the real shell: the sidebar exists and shows the page's title.
    expect(document.querySelector('.ant-menu')).toBeTruthy();
    expect(document.body.textContent).toContain('Dev Harness Page');
  });
});

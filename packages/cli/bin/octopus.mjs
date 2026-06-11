#!/usr/bin/env node
/*
 * Octopus CLI — generates new plugin packages (boilerplate only).
 *
 *   octopus new plugin <name> [--react] [--common]
 *
 * Plugin packages follow a role convention (mirroring package
 * roles, marked here via the `octopus.role` field):
 *   - plugin-<name>          frontend-plugin : the plugin (extensions + pages)
 *   - plugin-<name>-react    web-library     : shared FE surface (apiRefs,
 *                            components) other plugins reuse without depending
 *                            on the plugin itself
 *   - plugin-<name>-common   common-library  : isomorphic types/constants, no
 *                            React (safe for a future backend)
 *
 * Every plugin is "write once, deliver two ways": imported statically into
 * createApp, or built independently as a Module Federation remote (exposes
 * `./plugin`, loaded at runtime by the host — no host rebuild).
 */
import { existsSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HELP = `Octopus CLI

Usage:
  octopus new plugin <name> [--react] [--common]
  octopus --help

Flags:
  --react    also generate plugin-<name>-react  (shared FE library: apiRefs, components)
  --common   also generate plugin-<name>-common (isomorphic types/constants, no React)

Examples:
  octopus new plugin hello
  octopus new plugin dashboard --react
  octopus new plugin reports --react --common
`;

function fail(msg) {
  console.error(`error: ${msg}\n`);
  process.exit(1);
}

const toKebab = s =>
  s
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '');
const toPascal = s =>
  toKebab(s)
    .split('-')
    .filter(Boolean)
    .map(p => p[0].toUpperCase() + p.slice(1))
    .join('');
const toCamel = s => {
  const p = toPascal(s);
  return p[0].toLowerCase() + p.slice(1);
};
const toTitle = s =>
  toKebab(s)
    .split('-')
    .filter(Boolean)
    .map(p => p[0].toUpperCase() + p.slice(1))
    .join(' ');
const toUpperSnake = s => toKebab(s).replace(/-/g, '_').toUpperCase();

function findWorkspaceRoot() {
  let dir = process.cwd();
  for (;;) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) {
      const own = resolve(fileURLToPath(import.meta.url), '../../../..');
      if (existsSync(join(own, 'pnpm-workspace.yaml'))) return own;
      fail('could not locate the octopus workspace root (pnpm-workspace.yaml)');
    }
    dir = parent;
  }
}

function writeTree(baseDir, files) {
  for (const [rel, content] of Object.entries(files)) {
    const full = join(baseDir, rel);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
}

const json = obj => JSON.stringify(obj, null, 2) + '\n';
const libTsconfig = json({
  extends: '../../tsconfig.base.json',
  compilerOptions: { noEmit: true },
  include: ['src'],
});

// ── plugin-<name>-common ──────────────────────────────────────────────────
function commonLibFiles({ kebab, pascal, upper }) {
  return {
    'package.json': json({
      name: `@octopus/plugin-${kebab}-common`,
      version: '0.0.0',
      private: true,
      main: 'src/index.ts',
      module: 'src/index.ts',
      types: 'src/index.ts',
      sideEffects: false,
      octopus: { role: 'common-library' },
      scripts: { typecheck: 'tsc --noEmit' },
      devDependencies: { typescript: '^5.7.2' },
    }),
    'tsconfig.json': libTsconfig,
    'src/index.ts': `/*
 * Isomorphic types & constants for the ${kebab} plugin. No React — safe to
 * share between the frontend plugin, its -react library, and a future backend.
 */

export const ${upper}_PLUGIN_ID = '${kebab}';

export interface ${pascal}Item {
  id: string;
  title: string;
}
`,
  };
}

// ── plugin-<name>-react ───────────────────────────────────────────────────
function reactLibFiles({ kebab, pascal, camel, title, withCommon }) {
  const deps = {
    '@octopus/core-plugin-api': 'workspace:*',
  };
  if (withCommon) deps[`@octopus/plugin-${kebab}-common`] = 'workspace:*';
  return {
    'package.json': json({
      name: `@octopus/plugin-${kebab}-react`,
      version: '0.0.0',
      private: true,
      main: 'src/index.ts',
      module: 'src/index.ts',
      types: 'src/index.ts',
      sideEffects: false,
      octopus: { role: 'web-library' },
      scripts: { typecheck: 'tsc --noEmit' },
      dependencies: deps,
      peerDependencies: {
        antd: '^5.0.0',
        react: '^18.0.0 || ^19.0.0',
      },
      devDependencies: {
        '@types/react': '^18.3.18',
        antd: '^5.22.5',
        react: '^18.3.1',
        typescript: '^5.7.2',
      },
    }),
    'tsconfig.json': libTsconfig,
    [`src/${pascal}Card.tsx`]: `import { Card, Typography } from 'antd';

/**
 * A presentational component exported for OTHER plugins to reuse. They depend
 * on @octopus/plugin-${kebab}-react, not on the plugin itself.
 */
export function ${pascal}Card() {
  return (
    <Card title="${title} (shared component)">
      <Typography.Text type="secondary">
        Exported from @octopus/plugin-${kebab}-react for reuse across plugins.
      </Typography.Text>
    </Card>
  );
}
`,
    'src/index.ts': `import { createApiRef } from '@octopus/core-plugin-api';

export interface ${pascal}Api {
  greet(): string;
}

/**
 * Shared utility-API ref for the ${kebab} plugin. Other plugins import this
 * (from the -react library) to interoperate without depending on the plugin.
 */
export const ${camel}ApiRef = createApiRef<${pascal}Api>({
  id: 'plugin.${kebab}',
});

export { ${pascal}Card } from './${pascal}Card';
`,
  };
}

// ── plugin-<name> ─────────────────────────────────────────────────────────
function pluginFiles({ kebab, pascal, camel, title, upper, withReact, withCommon }) {
  const id = kebab;
  const deps = {
    '@octopus/app-defaults': 'workspace:*',
    '@octopus/core-components': 'workspace:*',
    '@octopus/core-plugin-api': 'workspace:*',
  };
  if (withReact) deps[`@octopus/plugin-${kebab}-react`] = 'workspace:*';
  if (withCommon) deps[`@octopus/plugin-${kebab}-common`] = 'workspace:*';
  deps.antd = '^5.22.5';
  deps.react = '^18.3.1';
  deps['react-dom'] = '^18.3.1';
  deps['react-router-dom'] = '^6.28.1';

  const pluginIdExpr = withCommon ? upper + '_PLUGIN_ID' : `'${id}'`;

  return {
    'package.json': json({
      name: `@octopus/plugin-${kebab}`,
      version: '0.0.0',
      private: true,
      type: 'module',
      main: 'src/index.ts',
      module: 'src/index.ts',
      types: 'src/index.ts',
      sideEffects: false,
      octopus: { role: 'frontend-plugin' },
      scripts: {
        dev: 'rsbuild dev',
        build: 'rsbuild build',
        preview: 'rsbuild preview',
        typecheck: 'tsc --noEmit',
      },
      dependencies: deps,
      devDependencies: {
        '@ant-design/icons': '^5.5.2',
        '@module-federation/rsbuild-plugin': '^2.5.1',
        '@octopus/dev-utils': 'workspace:*',
        '@rsbuild/core': '^1.1.13',
        '@rsbuild/plugin-react': '^1.1.0',
        '@types/react': '^18.3.18',
        '@types/react-dom': '^18.3.5',
        // Runtime deps of @octopus/core-app-api, pulled in by the dev harness
        // (createDevApp). The bundler resolves them from this package.
        i18next: '^23.16.8',
        'zen-observable': '^0.10.0',
        typescript: '^5.7.2',
      },
    }),
    'tsconfig.json': json({
      extends: '../../tsconfig.base.json',
      compilerOptions: { noEmit: true, types: ['@rsbuild/core/types'] },
      include: ['src', 'dev', 'rsbuild.config.ts'],
    }),
    [`src/${pascal}Page.tsx`]: `import { Typography } from 'antd';
import { Page } from '@octopus/core-components';
${withReact ? `import { ${pascal}Card } from '@octopus/plugin-${kebab}-react';\n` : ''}
export function ${pascal}Page() {
  return (
    <Page>
      <Typography.Title level={2}>${title}</Typography.Title>
      <Typography.Paragraph type="secondary">
        Generated by \`octopus new plugin\`. Edit src/${pascal}Page.tsx to build your plugin.
      </Typography.Paragraph>
${withReact ? `      <${pascal}Card />\n` : ''}    </Page>
  );
}
`,
    'src/plugin.tsx': `import { createFrontendPlugin } from '@octopus/core-plugin-api';
import { PageBlueprint } from '@octopus/app-defaults';
import { AppstoreOutlined } from '@ant-design/icons';
import { ${pascal}Page } from './${pascal}Page';
${withCommon ? `import { ${upper}_PLUGIN_ID } from '@octopus/plugin-${kebab}-common';\n` : ''}
const ${camel}Page = PageBlueprint.make({
  name: '${id}',
  params: {
    path: '/${id}',
    title: '${title}',
    icon: <AppstoreOutlined />,
    element: <${pascal}Page />,
  },
});

export default createFrontendPlugin({
  pluginId: ${pluginIdExpr},
  extensions: [${camel}Page],
});
`,
    'src/index.ts': `export { default as ${camel}Plugin } from './plugin';
export { default } from './plugin';
`,
    // Standalone dev entry — \`pnpm dev\` mounts this plugin inside the default
    // Octopus app shell (layout, routing, DI), so you develop it in isolation
    // but with the full framework around it.
    'dev/index.tsx': `import { createDevApp } from '@octopus/dev-utils';
import ${camel}Plugin from '../src';

createDevApp({ features: [${camel}Plugin] });
`,
    'rsbuild.config.ts': `import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';

const singleton = { singleton: true, requiredVersion: false } as const;
const shared = {
  react: singleton,
  'react-dom': singleton,
  'react-router-dom': singleton,
  antd: singleton,
  '@octopus/core-plugin-api': singleton,
  '@octopus/version-bridge': singleton,
  '@octopus/internal-opaque': singleton,
  '@octopus/types': singleton,
  '@octopus/errors': singleton,
  '@octopus/config': singleton,
  '@octopus/filter-predicates': singleton,
};

export default defineConfig({
  plugins: [
    pluginReact(),
    pluginModuleFederation({
      name: '${camel}',
      exposes: { './plugin': './src/plugin.tsx' },
      shared,
      dts: false,
    }),
  ],
  source: { entry: { index: './dev/index.tsx' } },
  server: { port: 3002 },
  dev: { assetPrefix: 'auto' },
  output: { assetPrefix: 'auto' },
});
`,
  };
}

function cmdNew(kind, name, flags) {
  if (kind !== 'plugin') {
    fail(`unknown type '${kind}'. Only 'plugin' is supported.`);
  }
  if (!name) fail('a plugin name is required, e.g. `octopus new plugin hello`');

  const kebab = toKebab(name);
  if (!kebab) fail(`invalid name '${name}'`);
  const opts = {
    kebab,
    pascal: toPascal(name),
    camel: toCamel(name),
    title: toTitle(name),
    upper: toUpperSnake(name),
    withReact: flags.has('--react'),
    withCommon: flags.has('--common'),
  };

  const root = findWorkspaceRoot();
  const targets = [[`plugin-${kebab}`, pluginFiles(opts)]];
  if (opts.withReact) targets.push([`plugin-${kebab}-react`, reactLibFiles(opts)]);
  if (opts.withCommon) targets.push([`plugin-${kebab}-common`, commonLibFiles(opts)]);

  for (const [name2] of targets) {
    const dir = join(root, 'plugins', name2);
    if (existsSync(dir) && readdirSync(dir).length > 0) {
      fail(`plugins/${name2} already exists and is not empty`);
    }
  }
  for (const [name2, files] of targets) {
    writeTree(join(root, 'plugins', name2), files);
    console.log(`✓ created plugins/${name2}`);
  }

  console.log('\nNext steps:');
  console.log('  pnpm install');
  console.log('\nUse it statically — in apps/portal/src/App.tsx:');
  console.log(`  import { ${opts.camel}Plugin } from '@octopus/plugin-${kebab}';`);
  console.log(`  createApp({ features: [appPlugin, ${opts.camel}Plugin, …] })`);
  console.log('\nOr ship it as a dynamic remote:');
  console.log(`  pnpm --filter @octopus/plugin-${kebab} build   # produces mf-manifest.json`);
}

function main(argv) {
  const args = argv.slice(2);
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(HELP);
    return;
  }
  if (args[0] === 'new') {
    const positionals = args.slice(1).filter(a => !a.startsWith('-'));
    const flags = new Set(args.slice(1).filter(a => a.startsWith('-')));
    cmdNew(positionals[0], positionals[1], flags);
    return;
  }
  fail(`unknown command '${args[0]}'. Run 'octopus --help'.`);
}

main(process.argv);

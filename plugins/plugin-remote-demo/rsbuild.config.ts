import { defineConfig } from '@rsbuild/core';
import {
  compose,
  withBaseConfig,
  withRemoteMfeConfig,
} from '@octopus/dynamic-plugin-pack';
import mfeConfig from './module-federation.config';

export default defineConfig(
  compose(
    withRemoteMfeConfig(mfeConfig, { port: 3001, devEntry: './dev/index.tsx' }),
    withBaseConfig(),
  )({}),
);

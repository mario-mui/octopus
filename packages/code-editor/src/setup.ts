/*
 * Host-side monaco setup. Borrowed from the Angular console's
 * `apps/global-console/src/preinit.ts`: the HOST app loads monaco once and owns
 * the web-worker wiring, rather than the editor library doing it.
 *
 * Why it lives in its own module (not the package barrel): it is the only place
 * that imports `monaco-editor` as a value and spawns workers via
 * `new Worker(new URL(...))`. App entries (the portal host + each remote's
 * standalone `dev` entry) import `@octopus/code-editor/setup` and call
 * `setupMonaco()`; the feature/remote code only imports `@octopus/code-editor`,
 * so monaco and the worker chunks never enter a Module-Federation-shared chunk —
 * which is what made rspack panic / emit "circular dependency between chunks
 * with runtime" when monaco was MF-shared.
 *
 * `@monaco-editor/react` IS MF-shared (a tiny, monaco-free loader singleton), so
 * configuring its loader here makes every remote's `<Editor>` reuse this one
 * monaco instance.
 */
import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

import { defineThemes } from './monaco/loader';

// YAML schema registration configures the host's shared monaco, so it is
// exposed here (host-side) rather than from the barrel — keeping monaco-yaml out
// of every remote bundle.
export { YamlSchemaService, getYamlSchemaService } from './yamlSchema';

let done = false;

/**
 * Load monaco, wire its web workers, point `@monaco-editor/react` at it and
 * register the editor themes. Call once, early, from an app entry (before the
 * app renders any editor). Idempotent.
 */
export function setupMonaco() {
  if (done) {
    return;
  }
  done = true;

  window.MonacoEnvironment = {
    getWorker(_workerId: string, label: string) {
      if (label === 'yaml') {
        return new Worker(new URL('monaco-yaml/yaml.worker', import.meta.url));
      }
      if (label === 'json') {
        return new Worker(
          new URL(
            'monaco-editor/esm/vs/language/json/json.worker',
            import.meta.url,
          ),
        );
      }
      return new Worker(
        new URL('monaco-editor/esm/vs/editor/editor.worker', import.meta.url),
      );
    },
  };

  loader.config({ monaco });
  defineThemes(monaco);
}

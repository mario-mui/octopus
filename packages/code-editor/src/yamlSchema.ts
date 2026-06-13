import type {
  MonacoYamlOptions,
  SchemasSettings,
} from 'monaco-yaml';

import { initMonaco } from './monaco/loader';

const uniq = <T>(items: T[]): T[] => [...new Set(items)];

/**
 * Manages monaco-yaml schemas (k8s-aware) for the editor. Ported from the
 * Angular `YamlSchemaService`; monaco is loaded lazily via the shared loader.
 */
export class YamlSchemaService {
  private options: MonacoYamlOptions = { schemas: [], enableSchemaRequest: false };
  private controller?: {
    dispose: () => void;
    update: (options: MonacoYamlOptions) => void;
  };

  constructor(options?: MonacoYamlOptions) {
    if (options) {
      this.options = { ...this.options, ...options };
    }
  }

  async addSchema(
    schema: SchemasSettings,
    strategy: 'merge' | 'replace' = 'merge',
  ) {
    let { schemas = [], ...rest } = this.options;

    const old = schemas.find(item => item.uri === schema.uri);

    if (old) {
      schema = {
        ...schema,
        fileMatch: uniq(
          strategy === 'replace'
            ? schema.fileMatch
            : [...(old.fileMatch ?? []), ...(schema.fileMatch ?? [])],
        ),
      };

      schemas = schemas.filter(item => item !== old);
    }

    this.options = { ...rest, schemas: schemas.concat(schema) };

    const controller = await this.ensureConfigured();
    controller.update(this.options);
  }

  async deleteSchema(uri: string) {
    const { schemas, ...rest } = this.options;

    this.options = {
      ...rest,
      schemas: schemas?.filter(item => item.uri !== uri),
    };

    const controller = await this.ensureConfigured();
    controller.update(this.options);
  }

  private async ensureConfigured() {
    if (this.controller) {
      return this.controller;
    }
    const monaco = await initMonaco();
    // Lazy so monaco-yaml (heavy) only loads where YAML schemas are actually
    // registered, and never enters a remote's main bundle just by importing the
    // package barrel.
    const { configureMonacoYaml } = await import('monaco-yaml');
    this.controller = configureMonacoYaml(monaco, this.options);
    return this.controller;
  }
}

let shared: YamlSchemaService | undefined;

/** A process-wide YAML schema service, matching the Angular root-provided one. */
export function getYamlSchemaService(): YamlSchemaService {
  if (!shared) {
    shared = new YamlSchemaService({ schemas: [], enableSchemaRequest: false });
  }
  return shared;
}

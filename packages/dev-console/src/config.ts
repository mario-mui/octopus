/*
 * Loads the `.consolerc.yaml` config that the dev-console proxy uses to log into
 * the backend. The shape mirrors the file exactly:
 *
 *   authentication:
 *     product: console            # API segment + dex product
 *     http_proxy / https_proxy / no_proxy / oidc_client_secret: ...
 *   console:
 *     api_address: https://...
 *     login: user@example.com
 *     password: ...
 *     envs: [{ key, value }]
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, parse } from 'node:path';
import { parse as parseYaml } from 'yaml';

/** @public */
export interface ConsoleConfig {
  authentication?: {
    /** API segment / dex product (e.g. `console`). */
    product?: string;
    oidc_client_secret?: string;
    http_proxy?: string;
    https_proxy?: string;
    no_proxy?: string;
  };
  console: {
    api_address: string;
    login: string;
    password: string;
    envs?: Array<{ key: string; value: string }>;
  };
}

const FILE_NAMES = ['.consolerc.yaml', '.consolerc.yml', '.consolerc'];

function candidatePaths(): string[] {
  const paths: string[] = [];
  // Walk up from cwd to the filesystem root.
  let dir = process.cwd();
  const { root } = parse(dir);
  for (;;) {
    for (const name of FILE_NAMES) {
      paths.push(join(dir, name));
    }
    if (dir === root) {
      break;
    }
    dir = dirname(dir);
  }
  // Home directory (where the `cce` CLI writes ~/.consolerc.yml).
  for (const name of FILE_NAMES) {
    paths.push(join(homedir(), name));
  }
  return paths;
}

/**
 * Find and parse the first `.consolerc` file. Returns `undefined` when none
 * exists or it lacks an `api_address` — the dev console then stays off and the
 * app's built-in (mock) auth remains in effect.
 */
export function loadConsoleConfig(): ConsoleConfig | undefined {
  for (const path of candidatePaths()) {
    let raw: string;
    try {
      raw = readFileSync(path, 'utf8');
    } catch {
      continue;
    }
    try {
      const config = parseYaml(raw) as ConsoleConfig;
      if (config?.console?.api_address) {
        return config;
      }
    } catch (err) {
      console.error(`[dev-console] failed to parse ${path}:`, err);
      return undefined;
    }
  }
  return undefined;
}

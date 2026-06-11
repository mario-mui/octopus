import { describe, it, expect } from 'vitest';

import type { ConsoleConfig } from './config';
import { startDevConsole } from './proxy-server';

const config: ConsoleConfig = {
  authentication: { product: 'console' },
  console: {
    api_address: 'https://backend.example.test',
    login: 'tester',
    password: 'secret',
  },
};

describe('startDevConsole', () => {
  it('boots and serves a health response on /', async () => {
    const port = 18099;
    const server = await startDevConsole(config, port);
    expect(server).toBeTruthy();
    try {
      const res = await fetch(`http://localhost:${port}/`);
      expect(res.status).toBe(200);
      expect(await res.text()).toContain('running');
    } finally {
      server?.close();
    }
  });

  it('returns undefined instead of crashing when the port is taken', async () => {
    const port = 18100;
    const first = await startDevConsole(config, port);
    try {
      const second = await startDevConsole(config, port);
      expect(second).toBeUndefined();
    } finally {
      first?.close();
    }
  });
});

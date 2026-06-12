import { createRouteRef } from '@octopus/core-plugin-api';

// Route refs let other plugins (and our own pages) link here without knowing
// or hard-coding the actual path. The app resolves them to concrete URLs.
export const homeRouteRef = createRouteRef();
export const clustersRouteRef = createRouteRef();
export const settingsRouteRef = createRouteRef();

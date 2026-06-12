/**
 * Base path for API-gateway calls, mirroring the console SDK's `API_GATEWAY`.
 *
 * In the console this is a deploy-time placeholder (`{{API_GATEWAY}}`) that
 * resolves to `/api-gateway` in local dev (the `apiAddress` returned by
 * `/console/api/v1/modules`). The backend actually serves these APIs at the
 * origin root, so the dev proxy strips the `/api-gateway` prefix before
 * forwarding. Endpoints are built as `${API_GATEWAY}/auth/v1/projects`, etc.
 */
export const API_GATEWAY = '/api-gateway';

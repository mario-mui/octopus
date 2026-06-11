/** Port the local dev-console proxy server listens on. */
export const PROXY_PORT = 8082;

/** Origin the browser uses (the rsbuild dev server). */
export const DEFAULT_BROWSER_URL = 'http://localhost:3000';

/** Default API segment / dex product when `authentication.product` is unset. */
export const DEFAULT_PRODUCT = 'console';

export const OK_STATUS = 200;
export const REDIRECT_STATUS = 301;
export const UNAUTHORIZED_STATUS = 401;
export const NOT_FOUND_STATUS = 404;

export const SET_COOKIE = 'set-cookie';
export const REDIRECT_URI = 'redirect_uri';

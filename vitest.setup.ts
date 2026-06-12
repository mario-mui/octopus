// The full-app integration tests render the real shell (async composition,
// fetches, redirects, lazy Suspense) and can take >1s under parallel load, so
// raise testing-library's default `findBy*` wait above its 1000ms default.
import { configure } from '@testing-library/dom';

configure({ asyncUtilTimeout: 5000 });

// Polyfills for the jsdom test environment. Ant Design's responsive components
// rely on window.matchMedia, which jsdom does not implement.
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}

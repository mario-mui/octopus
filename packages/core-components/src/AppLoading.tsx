import './global.css';

/**
 * Full-screen loading spinner, visually identical to the host's initial-load
 * spinner (index.html). Use it for in-app boot waits (e.g. the auth gate) so the
 * transition from the HTML spinner is seamless instead of a second, different
 * loader.
 */
export function AppLoading() {
  return (
    <div className="octo-app-loading" role="status" aria-label="Loading">
      <div className="octo-app-loading-spinner" />
    </div>
  );
}

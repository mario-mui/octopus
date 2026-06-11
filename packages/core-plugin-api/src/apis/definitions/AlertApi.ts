import { createApiRef } from '../system';
import { Observable } from '@octopus/types';

/**
 * Message handled by the {@link AlertApi}.
 *
 * @public
 * @deprecated Use {@link ToastApiMessage} from {@link ToastApi} instead. AlertApi will be removed in a future release.
 *
 * Migration guide:
 * - `message` becomes `title`
 * - `severity: 'error'` becomes `status: 'danger'`
 * - `severity: 'success' | 'info' | 'warning'` becomes `status: 'success' | 'info' | 'warning'`
 * - `display: 'transient'` becomes `timeout: 5000` (or custom milliseconds)
 * - `display: 'permanent'` means omitting `timeout`
 */
export type AlertMessage = {
  message: string;
  // Severity will default to success since that is what material ui defaults the value to.
  severity?: 'success' | 'info' | 'warning' | 'error';
  display?: 'permanent' | 'transient';
};

/**
 * The alert API is used to report alerts to the app, and display them to the user.
 *
 * @public
 * @deprecated Use {@link ToastApi} instead. AlertApi will be removed in a future release.
 *
 * ToastApi provides richer notification features including:
 * - Title and optional description
 * - Action links
 * - Custom icons
 * - Per-toast timeout control
 * - Programmatic dismiss via returned key
 *
 * @example
 * ```typescript
 * // Before (AlertApi)
 * alertApi.post({ message: 'Saved!', severity: 'success', display: 'transient' });
 *
 * // After (ToastApi)
 * toastApi.post({ title: 'Saved!', status: 'success', timeout: 5000 });
 * ```
 */
export type AlertApi = {
  /**
   * Post an alert for handling by the application.
   */
  post(alert: AlertMessage): void;

  /**
   * Observe alerts posted by other parts of the application.
   */
  alert$(): Observable<AlertMessage>;
};

/**
 * The {@link ApiRef} of {@link AlertApi}.
 *
 * @public
 * @deprecated Use {@link toastApiRef} instead. AlertApi will be removed in a future release.
 */
export const alertApiRef = createApiRef<AlertApi>().with({
  id: 'core.alert',
  pluginId: 'app',
});

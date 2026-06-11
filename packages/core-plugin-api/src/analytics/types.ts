/**
 * Analytics context envelope.
 *
 * @public
 */
export interface AnalyticsContextValue {
  /**
   * The nearest known parent plugin where the event was captured.
   */
  pluginId: string;

  /**
   * The nearest known parent extension where the event was captured.
   */
  extensionId: string;

  [key: string]: string | boolean | number | undefined;
}

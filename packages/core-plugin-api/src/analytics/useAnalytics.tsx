import { useApi } from '../apis/system';
import { useAnalyticsContext } from './AnalyticsContext';
import { analyticsApiRef, AnalyticsTracker, AnalyticsApi } from '../apis';
import { useRef } from 'react';
import { Tracker } from './Tracker';

function useAnalyticsApi(): AnalyticsApi {
  try {
    return useApi(analyticsApiRef);
  } catch (error) {
    if (error.name === 'NotImplementedError') {
      return { captureEvent: () => {} };
    }
    throw error;
  }
}

/**
 * Gets a pre-configured analytics tracker.
 *
 * @public
 */
export function useAnalytics(): AnalyticsTracker {
  const trackerRef = useRef<Tracker | null>(null);
  const context = useAnalyticsContext();
  // Our goal is to make this API truly optional for any/all consuming code
  // (including tests). This hook runs last to ensure hook order is, as much as
  // possible, maintained.
  const analyticsApi = useAnalyticsApi();

  function getTracker(): Tracker {
    if (trackerRef.current === null) {
      trackerRef.current = new Tracker(analyticsApi);
    }
    return trackerRef.current;
  }

  const tracker = getTracker();
  // this is not ideal, but it allows to memoize the tracker
  // without explicitly set the context as dependency.
  tracker.setContext(context);

  return tracker;
}

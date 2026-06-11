import ObservableImpl from 'zen-observable';
import { Observable } from '@octopus/types';
import {
  ErrorApi,
  ErrorApiError,
  ErrorApiErrorContext,
} from '@octopus/core-plugin-api';

type ErrorWithContext = {
  error: ErrorApiError;
  context?: ErrorApiErrorContext;
};

/**
 * A minimal default `errorApi` implementation: logs to the console and forwards
 * errors to subscribers. Replace it by providing your own `errorApiRef`.
 */
export class ConsoleErrorApi implements ErrorApi {
  #subscribers = new Set<ZenObservable.SubscriptionObserver<ErrorWithContext>>();

  post(error: ErrorApiError, context?: ErrorApiErrorContext): void {
    // eslint-disable-next-line no-console
    console.error('[errorApi]', error, context ?? '');
    for (const subscriber of this.#subscribers) {
      subscriber.next({ error, context });
    }
  }

  error$(): Observable<ErrorWithContext> {
    return new ObservableImpl<ErrorWithContext>(subscriber => {
      this.#subscribers.add(subscriber);
      return () => {
        this.#subscribers.delete(subscriber);
      };
    });
  }
}

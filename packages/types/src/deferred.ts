/**
 * A deferred promise that can be resolved or rejected later.
 *
 * @public
 */
export type DeferredPromise<
  TResolved = void,
  TRejected = Error,
> = Promise<TResolved> & {
  resolve(value: TResolved | PromiseLike<TResolved>): void;
  reject(reason?: TRejected): void;
};

class Deferred<TResolved, TRejected>
  implements DeferredPromise<TResolved, TRejected>
{
  #resolve?: (value: TResolved | PromiseLike<TResolved>) => void;
  #reject?: (reason?: TRejected) => void;

  public get resolve() {
    return this.#resolve!;
  }
  public get reject() {
    return this.#reject!;
  }

  public then: Promise<TResolved>['then'];
  public catch: Promise<TResolved>['catch'];
  public finally: Promise<TResolved>['finally'];

  public constructor() {
    const promise = new Promise<TResolved>((resolve, reject) => {
      this.#resolve = resolve;
      this.#reject = reject;
    });

    this.then = promise.then.bind(promise);
    this.catch = promise.catch.bind(promise);
    this.finally = promise.finally.bind(promise);
  }

  [Symbol.toStringTag]: 'DeferredPromise' = 'DeferredPromise';
}

/**
 * Creates a deferred promise that can be resolved or rejected later.
 *
 * @public
 */
export function createDeferred<
  TResolved = void,
  TRejected = Error,
>(): DeferredPromise<TResolved, TRejected> {
  return new Deferred();
}

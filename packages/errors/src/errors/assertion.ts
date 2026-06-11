/**
 * An object that is shaped like an `Error`.
 *
 * @public
 */
export type ErrorLike = {
  name: string;
  message: string;
  stack?: string;
  [unknownKeys: string]: unknown;
};

/**
 * Checks whether an unknown value is an {@link ErrorLike} object, which guarantees that it's
 * an object that has at least two string properties: a non-empty `name` and `message`.
 *
 * @public
 * @param value - an unknown value
 * @returns true if the value is an {@link ErrorLike} object, false otherwise
 */
export function isError(value: unknown): value is ErrorLike {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const maybe = value as Partial<ErrorLike>;
  if (typeof maybe.name !== 'string' || maybe.name === '') {
    return false;
  }
  if (typeof maybe.message !== 'string') {
    return false;
  }
  return true;
}

/**
 * Asserts that an unknown value is an {@link ErrorLike} object, which guarantees that it's
 * an object that has at least two string properties: a non-empty `name` and `message`.
 *
 * If the value is not an {@link ErrorLike} object, an error is thrown.
 *
 * @public
 * @param value - an unknown value
 */
export function assertError(value: unknown): asserts value is ErrorLike {
  if (!isError(value)) {
    throw new Error(`Encountered invalid error, got '${value}'`);
  }
}

/**
 * Converts an unknown value to an {@link ErrorLike} object.
 *
 * If the value is already an {@link ErrorLike} object, it is returned as-is.
 * If the value is a string, a new `Error` is created with that string as the message.
 * For all other values, a new `Error` is created with a message of the form
 * `unknown error '<stringified>'`.
 *
 * @public
 * @param value - an unknown value
 * @returns an {@link ErrorLike} object
 */
export function toError(value: unknown): ErrorLike {
  if (isError(value)) {
    return value;
  }
  if (typeof value === 'string') {
    return new Error(value) as ErrorLike;
  }
  try {
    return new Error(`unknown error '${value}'`) as ErrorLike;
  } catch {
    return new Error(`unknown error of type '${typeof value}'`) as ErrorLike;
  }
}

// https://github.com/zloirock/core-js/issues/86#issuecomment-115759028
function getGlobalObject() {
  if (typeof window !== 'undefined' && window.Math === Math) {
    return window;
  }
  // eslint-disable-next-line no-restricted-globals
  if (typeof self !== 'undefined' && self.Math === Math) {
    // eslint-disable-next-line no-restricted-globals
    return self;
  }
  // eslint-disable-next-line no-new-func
  return Function('return this')();
}

const globalObject = getGlobalObject();

const makeKey = (id: string) => `__@backstage/${id}__`;

/**
 * Serializes access to a global singleton value, with the first caller creating the value.
 *
 * @public
 */
export function getOrCreateGlobalSingleton<T>(
  id: string,
  supplier: () => T,
): T {
  const key = makeKey(id);

  let value = globalObject[key];
  if (value) {
    return value;
  }

  value = supplier();
  globalObject[key] = value;
  return value;
}

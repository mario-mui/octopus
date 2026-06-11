import { Config } from '@octopus/config';
import { InputError, stringifyError } from '@octopus/errors';
import { parseFilterPredicate } from './schema';
import { FilterPredicate } from './types';

/**
 * Options for {@link readFilterPredicateFromConfig} and {@link readOptionalFilterPredicateFromConfig}.
 *
 * @public
 */
export interface ReadFilterPredicateFromConfigOptions {
  /**
   * The key to read from the config. If not provided, the entire config is used.
   */
  key?: string;
}

/**
 * Read a filter predicate expression from a config object.
 *
 * @public
 */
export function readFilterPredicateFromConfig(
  config: Config,
  options?: ReadFilterPredicateFromConfigOptions,
): FilterPredicate {
  const key = options?.key;
  const value = key ? config.get(key) : config.get();

  try {
    return parseFilterPredicate(value);
  } catch (error) {
    const where = key ? ` at '${key}'` : '';
    throw new InputError(
      `Could not read filter predicate from config${where}: ${stringifyError(
        error,
      )}`,
    );
  }
}

/**
 * Read an optional filter predicate expression from a config object.
 *
 * @public
 */
export function readOptionalFilterPredicateFromConfig(
  config: Config,
  options?: ReadFilterPredicateFromConfigOptions,
): FilterPredicate | undefined {
  const key = options?.key;
  const value = key ? config.getOptional(key) : config.getOptional();

  if (value === undefined) {
    return undefined;
  }

  return readFilterPredicateFromConfig(config, options);
}

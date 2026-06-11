import { TranslationMessages } from './TranslationMessages';
import { TranslationRef } from './TranslationRef';

/** @public */
export interface TranslationResource<TId extends string = string> {
  $$type: '@octopus/TranslationResource';
  id: TId;
}

/** @internal */
export type InternalTranslationResourceLoader = () => Promise<{
  messages: { [key in string]: string | null };
}>;

/** @internal */
export interface InternalTranslationResource<TId extends string = string>
  extends TranslationResource<TId> {
  version: 'v1';
  resources: Array<{
    language: string;
    loader: InternalTranslationResourceLoader;
  }>;
}

/** @internal */
export function toInternalTranslationResource<TId extends string>(
  resource: TranslationResource<TId>,
): InternalTranslationResource<TId> {
  const r = resource as InternalTranslationResource<TId>;
  if (r.$$type !== '@octopus/TranslationResource') {
    throw new Error(`Invalid translation resource, bad type '${r.$$type}'`);
  }
  if (r.version !== 'v1') {
    throw new Error(`Invalid translation resource, bad version '${r.version}'`);
  }

  return r;
}

/** @public */
export interface TranslationResourceOptions<
  TId extends string,
  TMessages extends { [key in string]: string },
  TTranslations extends {
    [language in string]: () => Promise<{
      default:
        | TranslationMessages<TId>
        | { [key in keyof TMessages]: string | null };
    }>;
  },
> {
  ref: TranslationRef<TId, TMessages>;

  translations: TTranslations;
}

/** @public */
export function createTranslationResource<
  TId extends string,
  TMessages extends { [key in string]: string },
  TTranslations extends {
    [language in string]: () => Promise<{
      default:
        | TranslationMessages<TId>
        | { [key in keyof TMessages]: string | null };
    }>;
  },
>(
  options: TranslationResourceOptions<TId, TMessages, TTranslations>,
): TranslationResource<TId> {
  return {
    $$type: '@octopus/TranslationResource',
    version: 'v1',
    id: options.ref.id,
    resources: Object.entries(options.translations).map(
      ([language, loader]) => ({
        language,
        loader: () =>
          loader().then(m => {
            const value = m.default;
            return {
              messages:
                value?.$$type === '@octopus/TranslationMessages'
                  ? value.messages
                  : value,
            };
          }),
      }),
    ),
  } as InternalTranslationResource<TId>;
}

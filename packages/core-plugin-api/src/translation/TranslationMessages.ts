import { TranslationRef } from './TranslationRef';

/**
 * Represents a collection of messages to be provided for a given translation ref.
 *
 * @public
 * @remarks
 *
 * This collection of messages can either be used directly as an override for the
 * default messages, or it can be used to provide translations for a language by
 * by being referenced by a {@link TranslationResource}.
 */
export interface TranslationMessages<
  TId extends string = string,
  TMessages extends { [key in string]: string } = { [key in string]: string },
  TFull extends boolean = boolean,
> {
  $$type: '@octopus/TranslationMessages';
  /** The ID of the translation ref that these messages are for */
  id: TId;
  /** Whether or not these messages override all known messages */
  full: TFull;
  /** The messages provided for the given translation ref */
  messages: TMessages;
}

/**
 * Options for {@link createTranslationMessages}.
 *
 * @public
 */
export interface TranslationMessagesOptions<
  TId extends string,
  TMessages extends { [key in string]: string },
  TFull extends boolean,
> {
  ref: TranslationRef<TId, TMessages>;

  full?: TFull;

  messages: false extends TFull
    ? { [key in keyof TMessages]?: string | null }
    : { [key in keyof TMessages]: string | null };
}

/**
 * Creates a collection of messages for a given translation ref.
 *
 * @public
 */
export function createTranslationMessages<
  TId extends string,
  TMessages extends { [key in string]: string },
  TFull extends boolean,
>(
  options: TranslationMessagesOptions<TId, TMessages, TFull>,
): TranslationMessages<TId, TMessages, TFull> {
  return {
    $$type: '@octopus/TranslationMessages',
    id: options.ref.id,
    full: Boolean(options.full) as TFull,
    messages: options.messages as TMessages,
  };
}

import {
  AnyApiFactory,
  AppLanguageApi,
  appLanguageApiRef,
  configApiRef,
  errorApiRef,
  fetchApiRef,
  translationApiRef,
} from '@octopus/core-plugin-api';
import { Config } from '@octopus/config';
import { ConsoleErrorApi } from './apis/implementations/ConsoleErrorApi';
import { AppLanguageSelector } from './apis/implementations/AppLanguageApi/AppLanguageSelector';
import { I18nextTranslationApi } from './apis/implementations/TranslationApi/I18nextTranslationApi';

/**
 * The utility APIs every Octopus app provides out of the box. Registered as
 * fallback ("secondary") factories, so a plugin can override any of them.
 *
 * None needs a backend: `configApi` reads the static config object passed to
 * `createApp`, `fetchApi` wraps the platform `fetch`, `errorApi` logs to the
 * console, and `appLanguageApi` + `translationApi` provide i18n driven by the
 * `i18n.availableLanguages` / `i18n.defaultLanguage` config.
 */
export function createBuiltinApiFactories(config: Config): AnyApiFactory[] {
  return [
    {
      api: configApiRef,
      deps: {},
      factory: () => config,
    },
    {
      api: fetchApiRef,
      deps: {},
      factory: () => ({ fetch: globalThis.fetch.bind(globalThis) }),
    },
    {
      api: errorApiRef,
      deps: {},
      factory: () => new ConsoleErrorApi(),
    },
    {
      api: appLanguageApiRef,
      deps: {},
      factory: () => {
        const availableLanguages =
          config.getOptionalStringArray('i18n.availableLanguages') ?? ['en'];
        const defaultLanguage =
          config.getOptionalString('i18n.defaultLanguage') ?? availableLanguages[0];
        return AppLanguageSelector.create({
          availableLanguages,
          defaultLanguage,
        });
      },
    },
    {
      api: translationApiRef,
      deps: { languageApi: appLanguageApiRef },
      factory: ({ languageApi }) =>
        I18nextTranslationApi.create({
          languageApi: languageApi as AppLanguageApi,
        }),
    },
  ];
}

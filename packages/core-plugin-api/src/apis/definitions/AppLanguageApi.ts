import { createApiRef } from '../system';
import { Observable } from '@octopus/types';

/** @public */
export type AppLanguageApi = {
  getAvailableLanguages(): { languages: string[] };

  setLanguage(language?: string): void;

  getLanguage(): { language: string };

  language$(): Observable<{ language: string }>;
};

/**
 * @public
 */
export const appLanguageApiRef = createApiRef<AppLanguageApi>().with({
  id: 'core.applanguage',
  pluginId: 'app',
});

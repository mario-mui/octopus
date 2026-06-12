import { createTranslationRef } from '@octopus/core-plugin-api';

// Default messages are English; other languages are lazy-loaded when selected.
// Mirrors the console manifest's `displayNameKey` i18n labels.
export const remoteDemoTranslationRef = createTranslationRef({
  id: 'remote-demo',
  messages: {
    nav_remote_demo: 'Remote Demo',
    issues_list: 'Issues',
    test_plans: 'Test Plans',
  },
  translations: {
    de: () =>
      Promise.resolve({
        default: {
          nav_remote_demo: 'Remote-Demo',
          issues_list: 'Vorgänge',
          test_plans: 'Testpläne',
        },
      }),
  },
});

import { createTranslationRef } from '@octopus/core-plugin-api';

// Default messages are English; other languages are lazy-loaded when selected.
export const homeTranslationRef = createTranslationRef({
  id: 'home',
  messages: {
    greeting: 'Welcome to Octopus',
    tagline: 'A plugin-based frontend framework, rendered with Ant Design.',
  },
  translations: {
    de: () =>
      Promise.resolve({
        default: {
          greeting: 'Willkommen bei Octopus',
          tagline:
            'Ein Plugin-basiertes Frontend-Framework, gerendert mit Ant Design.',
        },
      }),
  },
});

import { createTranslationRef } from '../TranslationRef';

export const countingTranslationRef = createTranslationRef({
  id: 'counting',
  messages: {
    one: 'one',
    two: 'two',
    three: 'three',
  },
});

export const fruitsTranslationRef = createTranslationRef({
  id: 'fruits',
  messages: {
    apple: 'apple',
    orange: 'orange',
  },
  translations: {
    de: () => import('./fruits-de.json'),
  },
});

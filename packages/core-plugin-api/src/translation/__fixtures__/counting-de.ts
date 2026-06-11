import { createTranslationMessages } from '../TranslationMessages';
import { countingTranslationRef } from './refs';

export default createTranslationMessages({
  ref: countingTranslationRef,
  messages: {
    one: 'eins',
    two: 'zwei',
    three: 'polizei',
  },
});

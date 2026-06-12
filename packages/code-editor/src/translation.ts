import { createTranslationRef } from '@octopus/core-plugin-api';

/**
 * Translations for the code editor toolbar. Default messages are English; the
 * host app registers other languages (e.g. zh) against this ref's `id`, the
 * same way plugins do (see `@octopus/devops-pipeline`'s translation ref).
 */
export const codeEditorTranslationRef = createTranslationRef({
  id: 'code-editor',
  messages: {
    copy: 'Copy',
    copied: 'Copied',
    read_only: 'Read-only',
    writable: 'Writable',
    clear: 'Clear',
    recover: 'Recover',
    find: 'Find',
    export: 'Export',
    import: 'Import',
    diff: 'Diff',
    preview: 'Preview',
    fullscreen: 'Fullscreen',
    exit_fullscreen: 'Exit fullscreen',
  },
});

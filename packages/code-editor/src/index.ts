import './styles/github-markdown.css';

export { CodeEditor } from './CodeEditor';
export type { CodeEditorProps, CodeEditorActionsConfig } from './CodeEditor';

export * from './configs';

export { MonacoEditor } from './monaco/MonacoEditor';
export type { MonacoEditorProps } from './monaco/MonacoEditor';
export { MonacoDiffEditor } from './monaco/MonacoDiffEditor';
export type { MonacoDiffEditorProps } from './monaco/MonacoDiffEditor';
export type {
  Monaco,
  MonacoEditor as IMonacoEditor,
  MonacoDiffEditor as IMonacoDiffEditor,
  MonacoEditorOptions,
} from './monaco/types';

export {
  initMonaco,
  defineThemes,
  getLanguageExtensionPoint,
  MONACO_LIGHT_THEME,
  MONACO_DARK_THEME,
} from './monaco/loader';
export { useMonacoTheme } from './monaco/useMonacoTheme';

// NOTE: `YamlSchemaService` is intentionally NOT exported from the barrel — it
// pulls the heavy `monaco-yaml` package, which would land in every remote that
// imports `@octopus/code-editor`. It configures the host's shared monaco, so it
// is exported from `@octopus/code-editor/setup` (host-side) instead.

export { codeEditorTranslationRef } from './translation';
export { getLanguageLabel } from './intl';

export { saveAs } from './utils';

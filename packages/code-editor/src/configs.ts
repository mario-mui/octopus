import type { editor } from 'monaco-editor';

import type { CodeEditorActionsConfig } from './CodeEditor';

export type IEditorConstructionOptions = editor.IEditorConstructionOptions & {
  language?: string;
  tabSize?: number;
};

const commonActions: CodeEditorActionsConfig = {
  copy: true,
  find: true,
  export: true,
};

export const createActions: CodeEditorActionsConfig = {
  diffMode: false,
  clear: true,
  recover: false,
  import: true,
  ...commonActions,
};

export const viewActions: CodeEditorActionsConfig = {
  diffMode: false,
  clear: false,
  recover: false,
  import: false,
  ...commonActions,
};

export const updateActions: CodeEditorActionsConfig = {
  diffMode: true, // if true, you should also set `originalValue`, e.g. <CodeEditor originalValue={originalFile} />
  clear: true,
  recover: true,
  import: true,
  ...commonActions,
};

export const logsActions: CodeEditorActionsConfig = {
  ...viewActions,
};

export const commonOptions: IEditorConstructionOptions = {
  folding: true,
  minimap: { enabled: false },
  wordWrap: 'on',
  tabSize: 2,
  scrollbar: {
    alwaysConsumeMouseWheel: false,
  },
};

export const readonlyOptions: IEditorConstructionOptions = {
  ...commonOptions,
  readOnly: true,
};

export const yamlReadOptions: IEditorConstructionOptions = {
  language: 'yaml',
  ...readonlyOptions,
};

export const yamlWriteOptions: IEditorConstructionOptions = {
  language: 'yaml',
  ...commonOptions,
};

export const textWriteOptions: IEditorConstructionOptions = {
  language: 'text',
  ...commonOptions,
};

export const yamlWriteMinimapOptions: IEditorConstructionOptions = {
  language: 'yaml',
  ...commonOptions,
  minimap: { enabled: true },
};

export const yamlReadMinimapOptions: IEditorConstructionOptions = {
  language: 'yaml',
  ...readonlyOptions,
  minimap: { enabled: true },
};

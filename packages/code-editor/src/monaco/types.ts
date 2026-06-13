import type { editor } from 'monaco-editor';

export type Monaco = typeof import('monaco-editor');

/**
 * All common option fields for monaco are merged together for ease of config.
 */
export type MonacoEditorOptions = editor.IStandaloneEditorConstructionOptions;

export type MonacoEditor = editor.IStandaloneCodeEditor;

export type MonacoDiffEditor = editor.IStandaloneDiffEditor;

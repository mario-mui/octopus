import { DiffEditor } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useCallback, useEffect, useRef } from 'react';

import { defineThemes } from './loader';
import type {
  Monaco,
  MonacoDiffEditor as IMonacoDiffEditor,
  MonacoEditorOptions,
} from './types';
import { useMonacoTheme } from './useMonacoTheme';

const DEFAULT_OPTIONS: editor.IDiffEditorConstructionOptions = {
  automaticLayout: true,
  renderSideBySide: false,
  enableSplitViewResizing: false,
};

export interface MonacoDiffEditorProps {
  /** The current (modified, editable) value. */
  value: string;
  /** The original value to diff against. */
  originalValue: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  options?: MonacoEditorOptions;
  /** The URI assigned to the modified model (enables per-file YAML schema match). */
  modelUri?: string;
  onEditorMount?: (editor: IMonacoDiffEditor, monaco: Monaco) => void;
  className?: string;
}

/**
 * Controlled diff editor wrapping `@monaco-editor/react`'s `<DiffEditor>`.
 * Ported from the Angular `MonacoDiffEditorComponent`: the modified side is
 * editable and reports edits through `onChange`.
 */
export function MonacoDiffEditor({
  value,
  originalValue,
  onChange,
  onBlur,
  options,
  modelUri,
  onEditorMount,
  className,
}: MonacoDiffEditorProps) {
  const theme = useMonacoTheme();
  // The diff editor + its models, so we can tear them down cleanly on unmount.
  const editorRef = useRef<IMonacoDiffEditor>();
  const modelsRef = useRef<{
    original?: editor.ITextModel;
    modified?: editor.ITextModel;
  }>({});

  const handleMount = useCallback(
    (editor: IMonacoDiffEditor, monaco: Monaco) => {
      defineThemes(monaco);
      editorRef.current = editor;
      modelsRef.current = editor.getModel() ?? {};
      const modified = editor.getModifiedEditor();
      modified.onDidChangeModelContent(() => {
        const next = modified.getValue();
        if (next !== value) {
          onChange?.(next);
        }
      });
      if (onBlur) {
        modified.onDidBlurEditorWidget(() => onBlur());
      }
      onEditorMount?.(editor, monaco);
    },
    // `value` intentionally omitted: the listener reads the latest model value
    // directly, and re-attaching on every keystroke would leak listeners.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onBlur, onEditorMount],
  );

  // `@monaco-editor/react`'s DiffEditor disposes the models BEFORE the editor
  // widget, which throws "TextModel got disposed before DiffEditorWidget model
  // got reset". We tell it to keep the models (`keepCurrent*Model`) and tear
  // them down ourselves: detach them from the widget first (`setModel(null)`) so
  // disposing them never notifies a still-live widget — this holds regardless of
  // whether our cleanup runs before or after the widget is disposed.
  useEffect(
    () => () => {
      try {
        editorRef.current?.setModel(null);
      } catch {
        // editor already disposed by @monaco-editor/react — models are detached.
      }
      modelsRef.current.original?.dispose();
      modelsRef.current.modified?.dispose();
      editorRef.current = undefined;
      modelsRef.current = {};
    },
    [],
  );

  return (
    <DiffEditor
      className={className}
      theme={theme}
      language={options?.language}
      original={originalValue}
      modified={value}
      modifiedModelPath={modelUri}
      keepCurrentOriginalModel
      keepCurrentModifiedModel
      options={{ ...DEFAULT_OPTIONS, ...(options as editor.IDiffEditorConstructionOptions) }}
      beforeMount={defineThemes}
      onMount={handleMount}
    />
  );
}

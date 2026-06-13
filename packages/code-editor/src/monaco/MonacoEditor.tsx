import Editor from '@monaco-editor/react';
import { useCallback } from 'react';

import { defineThemes } from './loader';
import type { Monaco, MonacoEditor as IMonacoEditor, MonacoEditorOptions } from './types';
import { useMonacoTheme } from './useMonacoTheme';

const DEFAULT_OPTIONS: MonacoEditorOptions = {
  automaticLayout: true,
};

export interface MonacoEditorProps {
  value: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  options?: MonacoEditorOptions;
  /** The URI assigned to the monaco model (enables per-file YAML schema match). */
  modelUri?: string;
  /** Called once the underlying editor is created. */
  onEditorMount?: (editor: IMonacoEditor, monaco: Monaco) => void;
  className?: string;
}

/**
 * Thin controlled wrapper over `@monaco-editor/react`'s `<Editor>`.
 *
 * Replaces the Angular `MonacoEditorComponent` / `ControlValueAccessor`: the
 * value is a plain controlled prop, layout is handled by monaco's
 * `automaticLayout`, and loading shows the library's default spinner.
 */
export function MonacoEditor({
  value,
  onChange,
  onBlur,
  options,
  modelUri,
  onEditorMount,
  className,
}: MonacoEditorProps) {
  const theme = useMonacoTheme();

  const handleMount = useCallback(
    (editor: IMonacoEditor, monaco: Monaco) => {
      defineThemes(monaco);
      if (onBlur) {
        editor.onDidBlurEditorWidget(() => onBlur());
      }
      onEditorMount?.(editor, monaco);
    },
    [onBlur, onEditorMount],
  );

  return (
    <Editor
      className={className}
      theme={theme}
      path={modelUri}
      language={options?.language}
      value={value}
      options={{ ...DEFAULT_OPTIONS, ...options }}
      onChange={v => onChange?.(v ?? '')}
      beforeMount={defineThemes}
      onMount={handleMount}
    />
  );
}

import {
  CloseCircleOutlined,
  CopyOutlined,
  ExportOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
  ImportOutlined,
  RollbackOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useTranslationRef } from '@octopus/core-plugin-api';
import { Checkbox, Modal, Tooltip } from 'antd';
import { marked } from 'marked';
import {
  CSSProperties,
  ReactNode,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';

import { getLanguageExtensionPoint } from './monaco/loader';
import { MonacoDiffEditor } from './monaco/MonacoDiffEditor';
import { MonacoEditor } from './monaco/MonacoEditor';
import type {
  Monaco,
  MonacoEditor as IMonacoEditor,
  MonacoEditorOptions,
} from './monaco/types';
import { getLanguageLabel } from './intl';
import { useStyles } from './styles';
import { codeEditorTranslationRef } from './translation';
import { saveAs } from './utils';

export interface CodeEditorActionsConfig {
  diffMode?: boolean;
  recover?: boolean;
  clear?: boolean;
  find?: boolean;
  copy?: boolean;
  /** @deprecated The theme follows the Ant Design theme; this flag is ignored. */
  theme?: boolean;
  fullscreen?: boolean;
  export?: boolean;
  import?: boolean;
}

const DEFAULT_ACTIONS_CONFIG: CodeEditorActionsConfig = {
  diffMode: true,
  recover: true,
  clear: true,
  find: true,
  copy: true,
  fullscreen: true,
  export: true,
  import: true,
};

/**
 * Toolbar icon button. The tooltip uses `pointerEvents: none` so its popup can
 * never intercept a click — notably on monaco's find-widget close button, which
 * sits directly under these icons when the find widget opens.
 */
function ToolbarButton({
  title,
  onClick,
  className,
  children,
}: {
  title: string;
  onClick: () => void;
  className: string;
  children: ReactNode;
}) {
  return (
    <Tooltip
      title={title}
      placement="top"
      styles={{ root: { pointerEvents: 'none' } }}
    >
      <span className={className} onClick={onClick}>
        {children}
      </span>
    </Tooltip>
  );
}

export interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  /** Raw monaco options. `language` and `readOnly` drive toolbar behaviour. */
  options?: MonacoEditorOptions;
  /** The original value to diff against / recover to. */
  originalValue?: string;
  /** Configure which toolbar actions are shown. All enabled by default. */
  actionsConfig?: CodeEditorActionsConfig;
  /** Hide the toolbar entirely. */
  plain?: boolean;
  showLanguageLabel?: boolean;
  /** Whether to start in diff mode (also togglable from the toolbar). */
  diffMode?: boolean;
  onDiffModeChange?: (diffMode: boolean) => void;
  /** Whether to start in markdown preview mode (markdown language only). */
  previewMode?: boolean;
  onPreviewModeChange?: (previewMode: boolean) => void;
  modelUri?: string;
  onEditorMount?: (editor: IMonacoEditor, monaco: Monaco) => void;
  /** Slots rendered into the toolbar, replacing the Angular `ng-content`s. */
  toolbarLeft?: ReactNode;
  toolbarRight?: ReactNode;
  toolbarRightSide?: ReactNode;
  className?: string;
  /** Inline styles for the editor root. Set a `height` to size the editor. */
  style?: CSSProperties;
}

/**
 * Code editor with a toolbar (diff, fullscreen, markdown preview, import /
 * export / copy / find / clear / recover). React port of the Angular
 * `<aui-code-editor>`; value is controlled, labels are i18n and the chrome
 * follows the Ant Design theme.
 */
export function CodeEditor(props: CodeEditorProps) {
  const {
    value,
    onChange,
    onBlur,
    options = {},
    originalValue = '',
    plain = false,
    showLanguageLabel = true,
    modelUri,
    onEditorMount,
    toolbarLeft,
    toolbarRight,
    toolbarRightSide,
    className,
    style,
  } = props;

  const { t } = useTranslationRef(codeEditorTranslationRef);

  const actionsConfig = useMemo(
    () => ({ ...DEFAULT_ACTIONS_CONFIG, ...props.actionsConfig }),
    [props.actionsConfig],
  );

  const [diffMode, setDiffMode] = useState(props.diffMode ?? false);
  const [previewMode, setPreviewMode] = useState(props.previewMode ?? false);
  const [fullscreen, setFullscreen] = useState(false);
  const [langId, setLangId] = useState<string | undefined>(options.language);

  const editorRef = useRef<IMonacoEditor>();
  const monacoRef = useRef<Monaco>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { styles, cx } = useStyles();

  const showPreview = options.language === 'markdown';
  const readOnly = !!options.readOnly;

  const toggleDiffMode = (next: boolean) => {
    setDiffMode(next);
    props.onDiffModeChange?.(next);
  };
  const togglePreviewMode = (next: boolean) => {
    setPreviewMode(next);
    props.onPreviewModeChange?.(next);
  };

  const handleEditorMount = useCallback(
    (editor: IMonacoEditor, monaco: Monaco) => {
      editorRef.current = editor;
      monacoRef.current = monaco;
      const model = editor.getModel();
      setLangId(model?.getLanguageId() ?? options.language);
      onEditorMount?.(editor, monaco);
    },
    [onEditorMount, options.language],
  );

  const getLanguageExtensions = () => {
    const monaco = monacoRef.current;
    if (!monaco || !options.language) {
      return undefined;
    }
    return getLanguageExtensionPoint(monaco, options.language)?.extensions;
  };

  const onExport = () => {
    const monaco = monacoRef.current;
    const lang = monaco
      ? getLanguageExtensionPoint(monaco, options.language ?? '')
      : undefined;
    const fileExtension = lang?.extensions?.[0] ?? '.txt';
    const mimeType = lang?.mimetypes?.[0] ?? 'text/plain';
    const blob = new Blob([value], { type: mimeType + ';charset=utf-8' });
    saveAs(blob, new Date().toISOString() + fileExtension);
  };

  const onImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      onChange?.(reader.result?.toString() ?? '');
      input.value = '';
    };
    reader.readAsText(file);
  };

  const onFind = () => editorRef.current?.getAction('actions.find')?.run();
  const onCopy = () => navigator.clipboard.writeText(value);

  const markdownDisplay = useMemo(
    () => (value ? (marked.parse(value) as string) : value),
    [value],
  );

  /** The editor body, shared between the inline view and the fullscreen modal. */
  const renderSurface = (inFullscreen: boolean) => {
    const langLabel = langId ? getLanguageLabel(langId) : '';
    const modeLabel = readOnly ? t('read_only') : t('writable');

    return (
      <div
        className={cx(styles.root, className)}
        style={inFullscreen ? undefined : style}
      >
        {!plain && (
          <div className={styles.toolbar}>
            {showLanguageLabel && !previewMode && langId && (
              <div className={styles.language}>
                {langLabel} ({modeLabel})
              </div>
            )}
            {showLanguageLabel && previewMode && (
              <div className={styles.language}>
                {getLanguageLabel(options.language ?? '')} ({t('preview')})
              </div>
            )}

            <div className={styles.toolbarActions}>
              <div className={styles.side}>
                {showPreview && (
                  <Checkbox
                    disabled={diffMode}
                    checked={previewMode}
                    onChange={e => togglePreviewMode(e.target.checked)}
                  >
                    {t('preview')}
                  </Checkbox>
                )}
                {actionsConfig.diffMode && !previewMode && (
                  <Checkbox
                    checked={diffMode}
                    onChange={e => toggleDiffMode(e.target.checked)}
                  >
                    {t('diff')}
                  </Checkbox>
                )}
                {toolbarLeft}
              </div>

              <div className={styles.spacer} />

              <div className={styles.side}>
                {toolbarRight}

                {!readOnly && !previewMode && actionsConfig.import && (
                  <ToolbarButton
                    className={styles.controlButton}
                    title={t('import')}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImportOutlined />
                  </ToolbarButton>
                )}

                {actionsConfig.export && value && (
                  <ToolbarButton className={styles.controlButton} title={t('export')} onClick={onExport}>
                    <ExportOutlined />
                  </ToolbarButton>
                )}

                {!readOnly && !previewMode && actionsConfig.recover && (
                  <ToolbarButton
                    className={styles.controlButton}
                    title={t('recover')}
                    onClick={() => onChange?.(originalValue)}
                  >
                    <RollbackOutlined />
                  </ToolbarButton>
                )}

                {!readOnly && !previewMode && actionsConfig.clear && value && (
                  <ToolbarButton className={styles.controlButton} title={t('clear')} onClick={() => onChange?.('')}>
                    <CloseCircleOutlined />
                  </ToolbarButton>
                )}

                {actionsConfig.find && value && !previewMode && (
                  <ToolbarButton
                    className={styles.controlButton}
                    title={t('find')}
                    onClick={onFind}
                  >
                    <SearchOutlined />
                  </ToolbarButton>
                )}

                {actionsConfig.copy && value && (
                  <ToolbarButton
                    className={styles.controlButton}
                    title={t('copy')}
                    onClick={onCopy}
                  >
                    <CopyOutlined />
                  </ToolbarButton>
                )}

                {actionsConfig.fullscreen && (
                  <ToolbarButton
                    className={styles.controlButton}
                    title={inFullscreen ? t('exit_fullscreen') : t('fullscreen')}
                    onClick={() => setFullscreen(!inFullscreen)}
                  >
                    {inFullscreen ? (
                      <FullscreenExitOutlined />
                    ) : (
                      <FullscreenOutlined />
                    )}
                  </ToolbarButton>
                )}

                {toolbarRightSide}
              </div>
            </div>
          </div>
        )}

        {diffMode && (
          <MonacoDiffEditor
            className={styles.editor}
            value={value}
            originalValue={originalValue}
            options={options}
            modelUri={modelUri}
            onChange={onChange}
            onBlur={onBlur}
            onEditorMount={(editor, monaco) => {
              monacoRef.current = monaco;
              onEditorMount?.(editor.getModifiedEditor(), monaco);
            }}
          />
        )}

        {!diffMode && !previewMode && (
          <MonacoEditor
            className={styles.editor}
            value={value}
            options={options}
            modelUri={modelUri}
            onChange={onChange}
            onBlur={onBlur}
            onEditorMount={handleEditorMount}
          />
        )}

        {previewMode && (
          <div
            className={cx(styles.preview, 'markdown-body')}
            dangerouslySetInnerHTML={{ __html: markdownDisplay }}
          />
        )}
      </div>
    );
  };

  return (
    <>
      {/* Hide the inline editor while fullscreen, mirroring the Angular behaviour. */}
      {!fullscreen && renderSurface(false)}

      <Modal
        open={fullscreen}
        footer={null}
        closable={false}
        width="100%"
        style={{ top: 0, paddingBottom: 0, maxWidth: '100vw' }}
        styles={{ body: { height: 'calc(100vh - 48px)' } }}
        onCancel={() => setFullscreen(false)}
        destroyOnHidden
      >
        {fullscreen && renderSurface(true)}
      </Modal>

      <input
        ref={fileInputRef}
        hidden
        type="file"
        name="files[]"
        accept={getLanguageExtensions()?.join(', ')}
        onChange={onImport}
      />
    </>
  );
}

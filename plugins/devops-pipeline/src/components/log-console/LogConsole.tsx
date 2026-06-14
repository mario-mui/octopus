/*
 * The step log viewer (right side of the Tasks tab). A lightweight React log
 * console — no terminal emulator — with the console's toolbar: Auto Update
 * (polling), Timestamp, Find, Copy, Export and Full Screen. Logs are plain pod
 * container text fetched via {@link usePodLog}; while the step runs and Auto
 * Update is on it re-fetches every few seconds.
 *
 * Find is an in-panel search bar that highlights every match and steps through
 * them; Full Screen pins the console over the viewport.
 */
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Button, Checkbox, Input, message } from 'antd';
import { createStyles, useTheme } from 'antd-style';
import {
  CompressOutlined,
  CopyOutlined,
  DownloadOutlined,
  ExpandOutlined,
  LoadingOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { usePodLog } from './usePodLog';
import { parseAnsi } from './ansi';

export interface LogConsoleProps {
  cluster?: string;
  namespace?: string;
  podName?: string;
  container?: string;
  /** Step name, used for the export filename and empty-state. */
  stepName?: string;
  /** When the step has finished there is nothing to poll for. */
  finished: boolean;
}

const useStyles = createStyles(({ token, css }) => ({
  root: css`
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-width: 0;
    height: 480px;
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: ${token.borderRadius}px;
    overflow: hidden;
    background: ${token.colorBgContainer};
  `,
  fullscreen: css`
    position: fixed;
    inset: 0;
    z-index: 1050;
    height: auto;
    border-radius: 0;
  `,
  toolbar: css`
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    background: ${token.colorFillQuaternary};
    border-bottom: 1px solid ${token.colorBorderSecondary};
  `,
  spacer: css`
    flex: 1 1 auto;
  `,
  searchBar: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    border-bottom: 1px solid ${token.colorBorderSecondary};
  `,
  matchCount: css`
    color: ${token.colorTextSecondary};
    font-size: 12px;
    white-space: nowrap;
  `,
  body: css`
    flex: 1 1 auto;
    margin: 0;
    padding: 12px;
    overflow: auto;
    font-family: Menlo, Monaco, 'Courier New', monospace;
    font-size: 12px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-all;
    color: ${token.colorText};
  `,
  empty: css`
    flex: 1 1 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${token.colorTextTertiary};
  `,
  mark: css`
    background: ${token.colorWarningBg};
    padding: 0;
  `,
  markActive: css`
    background: ${token.colorWarning};
    color: ${token.colorTextLightSolid};
  `,
}));

export function LogConsole({
  cluster,
  namespace,
  podName,
  container,
  stepName,
  finished,
}: LogConsoleProps) {
  const { styles, cx } = useStyles();
  // Follow the app's light/dark theme so ANSI colours stay legible either way.
  const theme = useTheme();
  const dark = theme.appearance === 'dark';
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [timestamps, setTimestamps] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeMatch, setActiveMatch] = useState(0);

  const { text, loading, error } = usePodLog({
    cluster,
    namespace,
    podName,
    container,
    timestamps,
    poll: autoUpdate && !finished,
  });

  const bodyRef = useRef<HTMLPreElement>(null);
  const activeRef = useRef<HTMLElement>(null);
  // Whether the viewport is pinned to the bottom (so live logs keep following).
  const pinnedRef = useRef(true);

  // Parse ANSI colour codes into styled segments; search + copy/export work on
  // the stripped visible text.
  const segments = useMemo(() => parseAnsi(text, dark), [text, dark]);
  const plain = useMemo(() => segments.map(s => s.text).join(''), [segments]);

  const matches = useMemo(() => {
    if (!query) {
      return [] as number[];
    }
    const haystack = plain.toLowerCase();
    const needle = query.toLowerCase();
    const found: number[] = [];
    let idx = haystack.indexOf(needle);
    while (idx !== -1) {
      found.push(idx);
      idx = haystack.indexOf(needle, idx + needle.length);
    }
    return found;
  }, [plain, query]);
  const matchCount = matches.length;

  // Keep the active match in range as the query / log changes.
  useEffect(() => {
    setActiveMatch(a => (matchCount === 0 ? 0 : Math.min(a, matchCount - 1)));
  }, [matchCount]);

  // Follow the tail of the log while pinned to the bottom.
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (el && pinnedRef.current && !query) {
      el.scrollTop = el.scrollHeight;
    }
  }, [text, query]);

  // Scroll the active search match into view.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'center' });
  }, [activeMatch, query]);

  const onScroll = () => {
    const el = bodyRef.current;
    if (el) {
      pinnedRef.current =
        el.scrollHeight - el.scrollTop - el.clientHeight < 24;
    }
  };

  // Render the styled segments, splitting them at search-match boundaries so a
  // match that straddles a colour change is still highlighted as one.
  const content: ReactNode = useMemo(() => {
    const needleLen = query.length;
    const nodes: ReactNode[] = [];
    let offset = 0;
    let key = 0;
    for (const seg of segments) {
      const segStart = offset;
      const segEnd = offset + seg.text.length;
      offset = segEnd;
      if (matchCount === 0 || needleLen === 0) {
        nodes.push(
          <span key={key++} style={seg.style}>
            {seg.text}
          </span>,
        );
        continue;
      }
      let cursor = segStart;
      for (let mi = 0; mi < matches.length; mi++) {
        const mStart = matches[mi];
        const mEnd = mStart + needleLen;
        if (mEnd <= segStart || mStart >= segEnd) {
          continue;
        }
        const a = Math.max(mStart, segStart);
        const b = Math.min(mEnd, segEnd);
        if (a > cursor) {
          nodes.push(
            <span key={key++} style={seg.style}>
              {seg.text.slice(cursor - segStart, a - segStart)}
            </span>,
          );
        }
        const isActive = mi === activeMatch;
        nodes.push(
          <mark
            key={key++}
            ref={isActive ? (activeRef as React.RefObject<HTMLElement>) : undefined}
            // Drop the segment's own colours so the highlight shows through;
            // keep weight/italic for continuity.
            style={{
              fontWeight: seg.style.fontWeight,
              fontStyle: seg.style.fontStyle,
            }}
            className={cx(styles.mark, isActive && styles.markActive)}
          >
            {seg.text.slice(a - segStart, b - segStart)}
          </mark>,
        );
        cursor = b;
      }
      if (cursor < segEnd) {
        nodes.push(
          <span key={key++} style={seg.style}>
            {seg.text.slice(cursor - segStart)}
          </span>,
        );
      }
    }
    return nodes;
  }, [segments, matches, matchCount, query, activeMatch, styles, cx]);

  const stepMatch = (delta: number) => {
    if (matchCount === 0) {
      return;
    }
    setActiveMatch(a => (a + delta + matchCount) % matchCount);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(plain);
      message.success('Logs copied');
    } catch {
      message.error('Copy failed');
    }
  };

  const exportLog = () => {
    const blob = new Blob([plain], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${stepName || podName || 'log'}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={cx(styles.root, fullscreen && styles.fullscreen)}>
      <div className={styles.toolbar}>
        <Checkbox
          checked={autoUpdate}
          disabled={finished}
          onChange={e => setAutoUpdate(e.target.checked)}
        >
          Auto Update
        </Checkbox>
        <Checkbox
          checked={timestamps}
          onChange={e => setTimestamps(e.target.checked)}
        >
          Timestamp
        </Checkbox>
        <span className={styles.spacer} />
        <Button
          type="text"
          size="small"
          icon={<SearchOutlined />}
          onClick={() => setSearchOpen(o => !o)}
        >
          Find
        </Button>
        <Button
          type="text"
          size="small"
          icon={<CopyOutlined />}
          onClick={copy}
        >
          Copy
        </Button>
        <Button
          type="text"
          size="small"
          icon={<DownloadOutlined />}
          onClick={exportLog}
        >
          Export
        </Button>
        <Button
          type="text"
          size="small"
          icon={fullscreen ? <CompressOutlined /> : <ExpandOutlined />}
          onClick={() => setFullscreen(f => !f)}
        >
          {fullscreen ? 'Exit Full Screen' : 'Full Screen'}
        </Button>
      </div>

      {searchOpen && (
        <div className={styles.searchBar}>
          <Input
            size="small"
            autoFocus
            allowClear
            placeholder="Find in logs"
            prefix={<SearchOutlined />}
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setActiveMatch(0);
            }}
            onPressEnter={() => stepMatch(1)}
            style={{ width: 240 }}
          />
          <span className={styles.matchCount}>
            {matchCount ? `${activeMatch + 1} / ${matchCount}` : '0 / 0'}
          </span>
          <Button size="small" disabled={!matchCount} onClick={() => stepMatch(-1)}>
            Prev
          </Button>
          <Button size="small" disabled={!matchCount} onClick={() => stepMatch(1)}>
            Next
          </Button>
        </div>
      )}

      {loading && !text ? (
        <div className={styles.empty}>
          <LoadingOutlined />
        </div>
      ) : error ? (
        <div className={styles.empty}>{error}</div>
      ) : text ? (
        <pre ref={bodyRef} className={styles.body} onScroll={onScroll}>
          {content}
        </pre>
      ) : (
        <div className={styles.empty}>No logs</div>
      )}
    </div>
  );
}

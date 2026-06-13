/*
 * The namespace list shown in the cluster-namespace selector's popup, below the
 * cluster dropdown. The React/Ant Design equivalent of the console's
 * `acl-cluster-namespace-list`:
 *
 *  - a header with the title + live count and a filter box;
 *  - bordered rows — a namespace glyph, the name (with the filter match
 *    highlighted) over its display name, and the creation date on the right;
 *  - the active row is light-blue with a primary border and a corner check;
 *  - a spinner while loading and an empty hint when nothing matches.
 *
 * Purely presentational: the caller supplies the namespaces, the active value,
 * the loading flag and an `onSelect`.
 */
import { useMemo, useState } from 'react';
import { Input, Spin } from 'antd';
import { createStyles } from 'antd-style';
import { CheckOutlined, DeploymentUnitOutlined, SearchOutlined } from '@ant-design/icons';
import { Namespace } from '@octopus/console-core-common';

/** Annotation carrying a resource's human-friendly name (Alauda convention). */
const DISPLAY_NAME_ANNOTATION = 'cpaas.io/display-name';

function displayNameOf(ns: Namespace): string | undefined {
  return ns.metadata?.annotations?.[DISPLAY_NAME_ANNOTATION];
}

/** Format a creation timestamp as `YYYY-MM-DD`, matching the design. */
function formatCreatedAt(timestamp?: string): string {
  if (!timestamp) {
    return '-';
  }
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? '-' : date.toISOString().slice(0, 10);
}

/** Split `text` around each case-insensitive `keyword` hit for highlighting. */
function splitOnKeyword(
  text: string,
  keyword: string,
): Array<{ text: string; highlighted: boolean }> {
  if (!keyword) {
    return [{ text, highlighted: false }];
  }
  const parts: Array<{ text: string; highlighted: boolean }> = [];
  const lower = text.toLowerCase();
  const needle = keyword.toLowerCase();
  let pos = 0;
  for (let hit = lower.indexOf(needle); hit >= 0; hit = lower.indexOf(needle, pos)) {
    if (hit > pos) {
      parts.push({ text: text.slice(pos, hit), highlighted: false });
    }
    parts.push({ text: text.slice(hit, hit + needle.length), highlighted: true });
    pos = hit + needle.length;
  }
  if (pos < text.length) {
    parts.push({ text: text.slice(pos), highlighted: false });
  }
  return parts;
}

const useStyles = createStyles(({ token, css }) => ({
  root: css`
    display: flex;
    flex-direction: column;
  `,
  header: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
  `,
  title: css`
    font-size: 16px;
    font-weight: 600;
    line-height: 22px;
    color: ${token.colorText};
    white-space: nowrap;
  `,
  count: css`
    color: ${token.colorTextSecondary};
  `,
  search: css`
    width: 260px;
  `,
  list: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 382px;
    overflow-y: auto;
    /* Room so the rows' hover glow isn't clipped by the scroll container. */
    padding: 4px;
    margin: -4px;
  `,
  row: css`
    position: relative;
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 44px;
    padding: 10px 14px;
    border: 1px solid ${token.colorBorder};
    border-radius: ${token.borderRadiusLG}px;
    background: ${token.colorBgContainer};
    cursor: pointer;
    overflow: hidden;
    transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;

    &:hover {
      border-color: ${token.colorPrimary};
    }
  `,
  rowSelected: css`
    border-color: ${token.colorPrimary};
    background: ${token.colorPrimaryBg};
  `,
  icon: css`
    flex: 0 0 auto;
    font-size: 16px;
    color: ${token.colorPrimary};
  `,
  body: css`
    flex: 1;
    min-width: 0;
  `,
  name: css`
    font-size: 14px;
    line-height: 20px;
    color: ${token.colorText};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  desc: css`
    font-size: 12px;
    line-height: 16px;
    color: ${token.colorTextSecondary};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  highlighted: css`
    color: ${token.colorPrimary};
  `,
  createdAt: css`
    flex: 0 0 auto;
    color: ${token.colorTextSecondary};
    white-space: nowrap;
  `,
  createdLabel: css`
    font-weight: 500;
    margin-right: 8px;
  `,
  check: css`
    flex: 0 0 auto;
    font-size: 14px;
    color: ${token.colorPrimary};
  `,
  empty: css`
    padding: 24px 0;
    text-align: center;
    color: ${token.colorTextSecondary};
  `,
  loading: css`
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 88px;
  `,
}));

/** Name (highlighted) over the display name, both filtered by `keyword`. */
function NamespaceLabel({ ns, keyword }: { ns: Namespace; keyword: string }) {
  const { styles, cx } = useStyles();
  const name = ns.metadata?.name ?? '';
  const displayName = displayNameOf(ns);
  return (
    <div className={styles.body}>
      <div className={styles.name}>
        {splitOnKeyword(name, keyword).map((part, index) => (
          <span key={index} className={cx(part.highlighted && styles.highlighted)}>
            {part.text}
          </span>
        ))}
      </div>
      {displayName ? (
        <div className={styles.desc}>
          {splitOnKeyword(displayName, keyword).map((part, index) => (
            <span key={index} className={cx(part.highlighted && styles.highlighted)}>
              {part.text}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export interface NamespaceListProps {
  /** The cluster's namespaces. */
  namespaces: Namespace[];
  /** Name of the active namespace. */
  value: string;
  /** True while the namespaces are loading. */
  loading: boolean;
  /** Called with the chosen namespace's name. */
  onSelect: (name: string) => void;
}

export function NamespaceList({ namespaces, value, loading, onSelect }: NamespaceListProps) {
  const { styles, cx } = useStyles();
  const [query, setQuery] = useState('');

  const keyword = query.trim();
  const filtered = useMemo(() => {
    const q = keyword.toLowerCase();
    if (!q) {
      return namespaces;
    }
    return namespaces.filter(ns => {
      const name = ns.metadata?.name ?? '';
      const displayName = displayNameOf(ns) ?? '';
      return `${name} ${displayName}`.toLowerCase().includes(q);
    });
  }, [namespaces, keyword]);

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <span className={styles.title}>
          Namespaces <span className={styles.count}>({filtered.length})</span>
        </span>
        <Input
          allowClear
          size="small"
          prefix={<SearchOutlined />}
          placeholder="Filter by name or display name"
          value={query}
          onChange={event => setQuery(event.target.value)}
          className={styles.search}
        />
      </div>

      {loading ? (
        <div className={styles.loading}>
          <Spin />
        </div>
      ) : filtered.length ? (
        <div role="listbox" className={styles.list}>
          {filtered.map(ns => {
            const name = ns.metadata?.name ?? '';
            const selected = name === value;
            return (
              <div
                key={name}
                role="option"
                aria-selected={selected}
                className={cx(styles.row, selected && styles.rowSelected)}
                onClick={() => onSelect(name)}
              >
                <DeploymentUnitOutlined className={styles.icon} />
                <NamespaceLabel ns={ns} keyword={keyword} />
                <span className={styles.createdAt}>
                  <span className={styles.createdLabel}>Created At:</span>
                  {formatCreatedAt(ns.metadata?.creationTimestamp)}
                </span>
                {selected ? <CheckOutlined className={styles.check} /> : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className={styles.empty}>No matching namespaces</div>
      )}
    </div>
  );
}

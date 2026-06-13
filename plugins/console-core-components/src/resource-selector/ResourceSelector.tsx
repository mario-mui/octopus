/*
 * The presentational resource selector that sits at the top of the sidebar,
 * above the application navigation. The React/Ant Design equivalent of the
 * console's `acl-resource-selector` + `acl-resource-data-grid`, styled after
 * design/image.png and the console's `data-grid/style.scss`:
 *
 *  - a pill trigger showing an icon, the active resource name and a caret;
 *  - a popup card (title + count, a filter box) listing resources as bordered
 *    rows — name on the left, a status badge on the right; rows glow on hover,
 *    and the active row is light-blue with a primary border and a corner check
 *    ribbon.
 *
 * It is purely presentational: the caller supplies the items, the active value
 * and an `onChange`. Project and cluster selectors share this — they differ
 * only in their data source and their title/icon.
 */
import { ReactNode, useMemo, useState } from 'react';
import { Input, Popover, Tooltip } from 'antd';
import { createStyles } from 'antd-style';
import {
  CaretDownOutlined,
  CheckCircleFilled,
  CheckOutlined,
  CloseCircleFilled,
  SearchOutlined,
} from '@ant-design/icons';
import { ResourceItem } from './types';

export interface ResourceSelectorProps {
  /** The selectable resources. */
  items: ResourceItem[];
  /** Name of the active resource. */
  value?: string;
  /** Called with the chosen resource's name. */
  onChange: (name: string) => void;
  /** Title shown in the popup header, e.g. `'Projects'`. */
  title: string;
  /** Icon shown in the trigger, e.g. a project/cluster glyph. */
  icon: ReactNode;
  /** Render an icon-only trigger to fit a collapsed sidebar. */
  collapsed?: boolean;
}

const useStyles = createStyles(({ token, css }) => ({
  wrapper: css`
    padding: 12px 0;
  `,
  trigger: css`
    display: flex;
    align-items: center;
    gap: 10px;
    height: ${token.controlHeight}px;
    padding: 0 12px;
    border: 1px solid ${token.colorBorder};
    background: ${token.colorFillQuaternary};
    /* Neutral by default; turns blue only on hover / while open. */
    color: ${token.colorText};
    cursor: pointer;
    user-select: none;
    transition: border-color 0.2s, color 0.2s;

    &:hover {
      border-color: ${token.colorPrimary};
      color: ${token.colorPrimary};
    }
  `,
  triggerOpen: css`
    border-color: ${token.colorPrimary};
    color: ${token.colorPrimary};
  `,
  triggerCollapsed: css`
    padding: 0;
    justify-content: center;
  `,
  triggerIcon: css`
    flex: 0 0 auto;
    font-size: 18px;
  `,
  triggerLabel: css`
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  triggerCaret: css`
    flex: 0 0 auto;
    font-size: 12px;
  `,

  panel: css`
    width: 420px;
  `,
  header: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    height: 28px;
    margin-bottom: 12px;
  `,
  title: css`
    font-size: 18px;
    font-weight: 500;
    line-height: 28px;
    color: ${token.colorText};
    white-space: nowrap;
  `,
  count: css`
    color: ${token.colorTextSecondary};
  `,
  search: css`
    width: 260px;
    height: 28px;
  `,
  list: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 260px;
    overflow-y: auto;
    /* Room so the rows' hover glow isn't clipped by the scroll container. */
    padding: 4px;
    margin: -4px;
  `,
  empty: css`
    padding: 40px 0;
    text-align: center;
    color: ${token.colorTextSecondary};
  `,

  row: css`
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 44px;
    padding: 10px 14px;
    border: 1px solid ${token.colorBorder};
    background: ${token.colorBgContainer};
    cursor: pointer;
    overflow: hidden;
    transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;

    &:hover {
      border-color: ${token.colorPrimary};
      /* Soft primary glow on hover, matching the console's data grid. */
      box-shadow: 0 0 8px 0 ${token.colorPrimary}80;
    }
  `,
  rowSelected: css`
    border-color: ${token.colorPrimary};
    background: ${token.colorPrimaryBg};
  `,
  rowName: css`
    font-weight: 500;
    font-size: 14px;
    line-height: 20px;
    color: ${token.colorText};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  status: css`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    flex: 0 0 auto;
  `,
  statusLabel: css`
    color: ${token.colorTextSecondary};
  `,
  badge: css`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: ${token.colorText};
  `,
  iconNormal: css`
    font-size: 16px;
    color: ${token.colorSuccess};
  `,
  iconAbnormal: css`
    font-size: 16px;
    color: ${token.colorError};
  `,
  ribbon: css`
    position: absolute;
    inset-block-end: 0;
    inset-inline-end: 0;
    width: 22px;
    height: 22px;
    overflow: hidden;
    background-image: linear-gradient(
      to bottom right,
      transparent 50%,
      ${token.colorBgContainer} 50%
    );
  `,
  ribbonCheck: css`
    position: absolute;
    inset-inline-end: 1px;
    inset-block-end: 1px;
    font-size: 12px;
    color: ${token.colorPrimary};
  `,
}));

/** The green "Normal" / red "Abnormal" status badge shown on each row. */
function StatusBadge({ status }: { status: ResourceItem['status'] }) {
  const { styles } = useStyles();
  const abnormal = status === 'abnormal';
  return (
    <span className={styles.badge}>
      {abnormal ? (
        <CloseCircleFilled className={styles.iconAbnormal} />
      ) : (
        <CheckCircleFilled className={styles.iconNormal} />
      )}
      {abnormal ? 'Abnormal' : 'Normal'}
    </span>
  );
}

/** A single selectable resource row inside the popup. */
function ResourceRow({
  item,
  selected,
  onSelect,
}: {
  item: ResourceItem;
  selected: boolean;
  onSelect: (name: string) => void;
}) {
  const { styles, cx } = useStyles();
  return (
    <div
      role="option"
      aria-selected={selected}
      className={cx(styles.row, selected && styles.rowSelected)}
      onClick={() => onSelect(item.name)}
    >
      <span className={styles.rowName}>{item.displayName ?? item.name}</span>
      <span className={styles.status}>
        <span className={styles.statusLabel}>Status:</span>
        <StatusBadge status={item.status} />
      </span>
      {selected ? (
        // Corner "ribbon": a triangle of the container colour with a primary
        // check tucked into the bottom-right, mirroring `check-triangle-badge`.
        <span aria-hidden className={styles.ribbon}>
          <CheckOutlined className={styles.ribbonCheck} />
        </span>
      ) : null}
    </div>
  );
}

/** The popup card: header with title + count, a filter, and the resource list. */
function ResourcePanel({
  items,
  value,
  title,
  onSelect,
}: {
  items: ResourceItem[];
  value: string | undefined;
  title: string;
  onSelect: (name: string) => void;
}) {
  const { styles } = useStyles();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return items;
    }
    return items.filter(item =>
      `${item.name} ${item.displayName ?? ''}`.toLowerCase().includes(q),
    );
  }, [items, query]);

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>
          {title} <span className={styles.count}>({items.length})</span>
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
      <div role="listbox" className={styles.list}>
        {filtered.length ? (
          filtered.map(item => (
            <ResourceRow
              key={item.name}
              item={item}
              selected={item.name === value}
              onSelect={onSelect}
            />
          ))
        ) : (
          <div className={styles.empty}>No matching {title.toLowerCase()}</div>
        )}
      </div>
    </div>
  );
}

export function ResourceSelector({
  items,
  value,
  onChange,
  title,
  icon,
  collapsed = false,
}: ResourceSelectorProps) {
  const { styles, cx } = useStyles();
  const [open, setOpen] = useState(false);

  const current = items.find(item => item.name === value);
  const label = current?.displayName ?? current?.name ?? `Select ${title}`;

  const onSelect = (name: string) => {
    onChange(name);
    setOpen(false);
  };

  const trigger = (
    <div
      role="button"
      aria-haspopup="listbox"
      aria-expanded={open}
      className={cx(
        styles.trigger,
        open && styles.triggerOpen,
        collapsed && styles.triggerCollapsed,
      )}
    >
      <span className={styles.triggerIcon}>{icon}</span>
      {collapsed ? null : (
        <>
          <span className={styles.triggerLabel}>{label}</span>
          <CaretDownOutlined className={styles.triggerCaret} />
        </>
      )}
    </div>
  );

  return (
    <div className={styles.wrapper}>
      <Popover
        trigger="click"
        placement="bottomLeft"
        arrow={false}
        open={open}
        onOpenChange={setOpen}
        styles={{ body: { padding: '22px 20px 20px' } }}
        content={
          <ResourcePanel
            items={items}
            value={value}
            title={title}
            onSelect={onSelect}
          />
        }
      >
        {collapsed ? (
          <Tooltip title={label} placement="right">
            {trigger}
          </Tooltip>
        ) : (
          trigger
        )}
      </Popover>
    </div>
  );
}

/*
 * A foldable block — a labelled, collapsible container (the React port of the
 * console's `acl-foldable-block`, see design/zk.png + sq.png):
 *
 *  - collapsed → a light rounded bar with a subtle-primary pill toggle (chevrons
 *    down);
 *  - expanded  → a card with a primary left-accent holding the (custom) content,
 *    and a solid-primary pill toggle straddling the bottom edge (chevrons up).
 *
 * Fully generic: the `label` and the content (`children`) are inputs, and the
 * expanded state can be controlled or uncontrolled.
 */
import { ReactNode, useState } from 'react';
import { DoubleRightOutlined } from '@ant-design/icons';
import { createStyles } from 'antd-style';

export interface FoldableBlockProps {
  /** The toggle label (e.g. "Advanced settings"). */
  label: ReactNode;
  /** Initial expanded state when uncontrolled. */
  defaultExpanded?: boolean;
  /** Controlled expanded state. */
  expanded?: boolean;
  /** Called when the user toggles. */
  onExpandedChange?: (expanded: boolean) => void;
  /** The content shown when expanded. */
  children: ReactNode;
  className?: string;
}

const useStyles = createStyles(({ token, css }) => ({
  collapsedBar: css`
    position: relative;
    height: 24px;
    margin-bottom: 14px;
    background: ${token.colorFillQuaternary};
    border-radius: ${token.borderRadiusLG}px;
  `,
  /* Collapsed: the pill straddles the bar's bottom border, 20px from the left. */
  collapsedToggle: css`
    position: absolute;
    bottom: -12px;
    left: 20px;
  `,
  card: css`
    position: relative;
    margin-bottom: 16px;
    padding: 16px 16px 24px;
    background: ${token.colorBgContainer};
    border: 1px solid ${token.colorPrimary};
    border-radius: ${token.borderRadiusLG}px;
  `,
  cardToggle: css`
    position: absolute;
    left: 20px;
    bottom: -12px;
  `,
  pill: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 24px;
    padding: 0 14px;
    border: none;
    border-radius: 999px;
    font-size: ${token.fontSize}px;
    font-weight: 500;
    cursor: pointer;
    line-height: 1;
  `,
  pillSubtle: css`
    background: ${token.colorPrimaryBg};
    color: ${token.colorPrimary};
    &:hover {
      background: ${token.colorPrimaryBgHover};
    }
  `,
  pillSolid: css`
    background: ${token.colorPrimary};
    color: ${token.colorWhite};
    &:hover {
      background: ${token.colorPrimaryHover};
    }
  `,
}));

export function FoldableBlock({
  label,
  defaultExpanded = false,
  expanded: expandedProp,
  onExpandedChange,
  children,
  className,
}: FoldableBlockProps) {
  const { styles, cx } = useStyles();
  const [internal, setInternal] = useState(defaultExpanded);
  const expanded = expandedProp ?? internal;

  const toggle = () => {
    const next = !expanded;
    if (expandedProp === undefined) {
      setInternal(next);
    }
    onExpandedChange?.(next);
  };

  if (!expanded) {
    return (
      <div className={cx(styles.collapsedBar, className)}>
        <button
          type="button"
          className={cx(styles.pill, styles.pillSubtle, styles.collapsedToggle)}
          onClick={toggle}
        >
          {label}
          <DoubleRightOutlined rotate={90} />
        </button>
      </div>
    );
  }

  return (
    <div className={cx(styles.card, className)}>
      {children}
      <button
        type="button"
        className={cx(styles.pill, styles.pillSolid, styles.cardToggle)}
        onClick={toggle}
      >
        {label}
        <DoubleRightOutlined rotate={-90} />
      </button>
    </div>
  );
}

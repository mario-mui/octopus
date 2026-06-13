/*
 * ArrayFormTable — a table-driven editor for a list of rows, the React port of
 * the console's `acl-array-form-table` (libs/dynamic-plugin-shared/.../form).
 *
 * Each item in `rows` becomes a table row; the caller supplies the row's cells
 * via the `renderRow` render-prop (returning `<td>`s). The table owns the
 * surrounding chrome: an optional header, a per-row action column (a circled
 * "remove" button by default), a footer with an "+ Add" button, a zero-state,
 * and optional separators between rows. It is purely presentational — add /
 * remove are reported through callbacks and the caller owns the data.
 *
 * Angular drove the six content-projection slots with structural directives
 * (`*aclArrayFormTableRow`, `…RowControl`, `…Header`, `…Footer`, `…ZeroState`,
 * `…RowSeparator`) and an `EventEmitter` add/remove pair; here those map onto
 * render-prop functions and `onAdd` / `onRemove`. Row-level error highlighting,
 * which Angular derived from the live `AbstractControl` validity, becomes the
 * caller-supplied `showRowError` predicate.
 */
import { Fragment, ReactNode } from 'react';
import { Button, Tooltip } from 'antd';
import { MinusCircleOutlined, PlusCircleOutlined } from '@ant-design/icons';
import { createStyles, cx } from 'antd-style';

/** Renders the cells (`<td>`s) for a single row. */
export type ArrayFormTableRowRenderer<T> = (
  row: T,
  index: number,
) => ReactNode;

export interface ArrayFormTableProps<T> {
  /** Row data; one table row is rendered per item. */
  rows: T[];
  /**
   * Renders a row's cells. May be a single renderer or, mirroring Angular's
   * multiple `*aclArrayFormTableRow` templates, an array — each item then
   * produces its own `<tr>`, and only the first carries the action column.
   */
  renderRow: ArrayFormTableRowRenderer<T> | Array<ArrayFormTableRowRenderer<T>>;
  /** The user clicked the footer "Add" button. */
  onAdd: () => void;
  /** The user clicked a row's "remove" button; receives the row index. */
  onRemove: (index: number) => void;

  /** Header cells (`<th>`s). When omitted, no `<thead>` is rendered. */
  renderHeader?: () => ReactNode;
  /**
   * Custom contents of a row's action column. When omitted, a default circled
   * "remove" button is rendered (disabled once `rows.length <= minRow`).
   */
  renderRowControl?: ArrayFormTableRowRenderer<T>;
  /** Custom footer. When omitted, a default "+ Add" button is rendered. */
  renderFooter?: () => ReactNode;
  /** A row spanning all columns, shown beneath a row flagged by `showRowError`. */
  renderRowError?: ArrayFormTableRowRenderer<T>;
  /** Custom separator placed between rows (implies `rowSeparator`). */
  renderSeparator?: () => ReactNode;
  /** Custom empty state. When omitted, a default "No <resourceName>" is shown. */
  renderZeroState?: () => ReactNode;

  /** Whether a row should be highlighted (and its error row shown). */
  showRowError?: (row: T, index: number) => boolean;

  /** Hide all controls and render in a static, bordered layout. */
  readonly?: boolean;
  /** Disable the "Add" button regardless of `maxRow`. */
  addDisabled?: boolean;
  /** Draw a divider to the left of the action column. */
  actionColumnDivider?: boolean;
  /** Render the empty state when there are no rows (default: true). */
  showZeroState?: boolean;
  /** Insert an 8px grey gap between rows (default: false). */
  rowSeparator?: boolean;

  /** Resource label used by the default zero state, e.g. "argument". */
  resourceName?: string;
  /** Label for the default "Add" button (default: "Add"). */
  addText?: ReactNode;

  /** Minimum rows; the default remove button disables at this count. */
  minRow?: number;
  /** Tooltip shown on the remove button once `minRow` is reached. */
  minRowTooltip?: string;
  /** Maximum rows; the default add button disables at this count. */
  maxRow?: number;
  /** Tooltip shown on the add button once `maxRow` is reached. */
  maxRowTooltip?: string;

  className?: string;
}

const useStyles = createStyles(({ token, css }) => ({
  table: css`
    flex: 1;
    width: 100%;
    border-spacing: 0;
    border: 12px solid ${token.colorFillQuaternary};
    border-radius: ${token.borderRadiusLG}px;
    border-collapse: separate;

    thead {
      background-color: ${token.colorFillQuaternary};

      th,
      td {
        line-height: 20px;
        color: ${token.colorText};
        text-align: left;
        font-weight: 500;
        padding: 0 0 12px 8px;
      }
    }

    tbody {
      > tr {
        background-color: ${token.colorBgContainer};
        border-radius: 2px;
      }

      td {
        padding: 8px 0 8px 8px;
        vertical-align: middle;

        &:last-child {
          padding: 8px;
        }
      }
    }
  `,
  rowError: css`
    background-color: ${token.colorErrorBg} !important;
  `,
  actionRow: css`
    td {
      padding: 0 !important;
      border-bottom: unset;
      border-top: 8px solid ${token.colorFillQuaternary};
    }
  `,
  separatorRow: css`
    td {
      padding: 0;
      background-color: ${token.colorFillQuaternary};
    }
  `,
  separatorSpacer: css`
    height: 8px;
  `,
  actionCol: css`
    padding: 8px !important;
    text-align: center;
    white-space: nowrap;
    vertical-align: middle;
    width: 24px;
    font-size: 16px;
  `,
  actionColDivider: css`
    border-left: 1px solid ${token.colorBorderSecondary};
  `,
  bottomControls: css`
    display: flex;
    width: 100%;
    background-color: ${token.colorFillQuaternary};

    .ant-btn {
      flex: 1;
      height: 28px;
      border-style: unset;
      border-radius: 2px;
      font-size: 14px;
      background-color: ${token.colorBgContainer};

      &:not(:disabled):hover {
        background-color: ${token.colorPrimaryBg};
      }
    }
  `,
  addButtonWrapper: css`
    display: flex;
    width: 100%;
  `,
  zeroState: css`
    min-height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${token.colorTextTertiary};
    font-size: ${token.fontSize}px;
  `,
}));

export function ArrayFormTable<T>({
  rows,
  renderRow,
  onAdd,
  onRemove,
  renderHeader,
  renderRowControl,
  renderFooter,
  renderRowError,
  renderSeparator,
  renderZeroState,
  showRowError,
  readonly = false,
  addDisabled = false,
  actionColumnDivider = false,
  showZeroState = true,
  rowSeparator = false,
  resourceName,
  addText = 'Add',
  minRow = 0,
  minRowTooltip = '',
  maxRow = Infinity,
  maxRowTooltip = '',
  className,
}: ArrayFormTableProps<T>) {
  const { styles } = useStyles();

  // Angular hides the whole action machinery (header action col, remove column,
  // add footer) when min and max are pinned to the same count.
  const actionable = !readonly && minRow !== maxRow;
  const rowTemplates = Array.isArray(renderRow) ? renderRow : [renderRow];
  const showSeparator = rowSeparator || !!renderSeparator;

  const renderActionCell = (row: T, index: number) => (
    <td
      className={cx(styles.actionCol, actionColumnDivider && styles.actionColDivider)}
    >
      {renderRowControl ? (
        renderRowControl(row, index)
      ) : (
        <Tooltip title={minRowTooltip} open={minRowTooltip && rows.length <= minRow ? undefined : false}>
          <Button
            type="text"
            disabled={rows.length <= minRow}
            icon={<MinusCircleOutlined />}
            onClick={() => onRemove(index)}
          />
        </Tooltip>
      )}
    </td>
  );

  return (
    <table className={cx(styles.table, className)}>
      {renderHeader && (
        <thead>
          <tr>
            {renderHeader()}
            {actionable && <th style={{ minWidth: 48 }} />}
          </tr>
        </thead>
      )}
      <tbody>
        {rows.map((row, index) => {
          const errored = showRowError?.(row, index) ?? false;
          return (
            // eslint-disable-next-line react/no-array-index-key
            <Fragment key={index}>
              {rowTemplates.map((template, templateIndex) => (
                <tr
                  // eslint-disable-next-line react/no-array-index-key
                  key={templateIndex}
                  className={cx(errored && styles.rowError)}
                >
                  {template(row, index)}
                  {templateIndex === 0 && actionable && renderActionCell(row, index)}
                </tr>
              ))}
              {renderRowError && !readonly && errored && (
                <tr className={cx(styles.rowError)}>{renderRowError(row, index)}</tr>
              )}
              {showSeparator && rows.length > 1 && index !== rows.length - 1 && (
                <tr className={styles.separatorRow}>
                  <td colSpan={100}>
                    {renderSeparator ? (
                      renderSeparator()
                    ) : (
                      <div className={styles.separatorSpacer} />
                    )}
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}

        {rows.length === 0 && showZeroState && (
          <tr>
            <td colSpan={100} style={{ padding: 'unset' }}>
              {renderZeroState ? (
                renderZeroState()
              ) : (
                <div className={styles.zeroState}>
                  {resourceName ? `No ${resourceName}` : 'No data'}
                </div>
              )}
            </td>
          </tr>
        )}

        {actionable && (
          <tr className={styles.actionRow}>
            <td colSpan={100}>
              <div className={styles.bottomControls}>
                {renderFooter ? (
                  renderFooter()
                ) : (
                  <Tooltip
                    title={maxRowTooltip}
                    open={maxRowTooltip && rows.length >= maxRow ? undefined : false}
                  >
                    <div className={styles.addButtonWrapper}>
                      <Button
                        type="primary"
                        ghost
                        size="small"
                        icon={<PlusCircleOutlined />}
                        disabled={rows.length >= maxRow || addDisabled}
                        onClick={onAdd}
                      >
                        {addText}
                      </Button>
                    </div>
                  </Tooltip>
                )}
              </div>
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

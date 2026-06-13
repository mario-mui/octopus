import { createStyles } from 'antd-style';

/**
 * Styles for the code editor, matching `design/image.png`: a single bordered,
 * rounded card holding a tinted toolbar (separated by a divider) above an
 * edge-to-edge editor. Every colour is sourced from the Ant Design token so the
 * chrome follows the active theme (light/dark and the configured primary).
 */
export const useStyles = createStyles(({ token, css }) => ({
  root: css`
    display: flex;
    flex-flow: column;
    height: 100%;
    min-height: 360px;
    overflow: hidden;
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: ${token.borderRadiusLG}px;
    background: ${token.colorBgContainer};
    color: ${token.colorText};
  `,
  toolbar: css`
    display: flex;
    align-items: center;
    min-height: 40px;
    padding: 4px 12px;
    background: ${token.colorFillAlter};
    border-bottom: 1px solid ${token.colorBorderSecondary};
  `,
  toolbarActions: css`
    display: flex;
    align-items: center;
    flex: 1;
  `,
  side: css`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: ${token.marginXS}px;
  `,
  spacer: css`
    flex: 1;
  `,
  language: css`
    margin-right: ${token.margin}px;
    font-size: ${token.fontSize}px;
    font-weight: ${token.fontWeightStrong};
    white-space: nowrap;
    color: ${token.colorText};
  `,
  editor: css`
    flex: 1;
    min-height: 0;
  `,
  preview: css`
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: ${token.paddingLG}px;
    background: ${token.colorBgContainer};

    ul {
      list-style: disc;
    }
    ol {
      list-style: decimal;
    }
  `,
  controlButton: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    cursor: pointer;
    color: ${token.colorTextTertiary};
    border-radius: ${token.borderRadiusSM}px;
    transition:
      color ${token.motionDurationMid},
      background-color ${token.motionDurationMid};

    .anticon {
      font-size: 16px;
    }

    &:hover {
      color: ${token.colorPrimary};
      background-color: ${token.colorFillSecondary};
    }
  `,
  controlButtonActive: css`
    color: ${token.colorPrimary};
  `,
}));

/* A section heading with the console's blue accent bar (design/task-drawer). */
import { ReactNode } from 'react';
import { createStyles } from 'antd-style';

const useStyles = createStyles(({ token, css }) => ({
  title: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 20px 0 12px;
    font-size: 15px;
    font-weight: 600;
    color: ${token.colorText};
    &::before {
      content: '';
      width: 3px;
      height: 14px;
      border-radius: 2px;
      background: ${token.colorPrimary};
    }
  `,
}));

export function SectionTitle({ children }: { children: ReactNode }) {
  const { styles } = useStyles();
  return <div className={styles.title}>{children}</div>;
}

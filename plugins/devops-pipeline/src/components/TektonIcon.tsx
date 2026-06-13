/*
 * Task / pipeline icon — the React port of the console's `tekton-icon`. If the
 * resource carries a `tekton.dev/icon` image URL it's rendered as an <img>;
 * otherwise it falls back to a coloured rounded square with the name's initial
 * (matching the picker / drawer styling).
 */
import { ApartmentOutlined } from '@ant-design/icons';
import { createStyles } from 'antd-style';

export interface TektonIconProps {
  /** Image URL from the `tekton.dev/icon` annotation. */
  src?: string;
  /** Display name; its first letter is the fallback glyph. */
  name?: string;
  /** Fallback square colour. */
  color?: string;
  /** Square / image size in px. */
  size?: number;
}

const useStyles = createStyles(({ token, css }) => ({
  fallback: css`
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: ${token.borderRadiusSM}px;
    color: #fff;
    font-weight: 600;
    text-transform: uppercase;
  `,
  img: css`
    flex: 0 0 auto;
    object-fit: contain;
    border-radius: ${token.borderRadiusSM}px;
  `,
}));

export function TektonIcon({ src, name, color, size = 28 }: TektonIconProps) {
  const { styles } = useStyles();
  const dimension = { width: size, height: size };

  if (src) {
    return <img className={styles.img} src={src} alt={name} style={dimension} />;
  }

  const initial = (name ?? '').charAt(0);
  return (
    <span
      className={styles.fallback}
      style={{ ...dimension, background: color, fontSize: Math.round(size * 0.5) }}
    >
      {initial || <ApartmentOutlined />}
    </span>
  );
}

/*
 * A small status glyph for a run / task / step phase — the React port of the
 * console's `execute-run-status` icon. Maps a {@link RunPhase} to an Ant Design
 * icon + colour (green check, red cross, blue spinner, …).
 */
import {
  CheckCircleFilled,
  CloseCircleFilled,
  ClockCircleFilled,
  MinusCircleFilled,
  QuestionCircleFilled,
  SyncOutlined,
} from '@ant-design/icons';
import type { RunPhase } from '../utils/pipelineRunStatus';

const PHASE_STYLE: Record<
  RunPhase,
  { color: string; Icon: typeof CheckCircleFilled; spin?: boolean }
> = {
  Succeeded: { color: '#52c41a', Icon: CheckCircleFilled },
  Failed: { color: '#ff4d4f', Icon: CloseCircleFilled },
  Running: { color: '#1677ff', Icon: SyncOutlined, spin: true },
  Pending: { color: '#faad14', Icon: ClockCircleFilled },
  Cancelled: { color: '#8c8c8c', Icon: MinusCircleFilled },
  Unknown: { color: '#8c8c8c', Icon: QuestionCircleFilled },
};

export interface RunStatusIconProps {
  phase: RunPhase;
  /** Icon size in px. */
  size?: number;
}

export function RunStatusIcon({ phase, size = 16 }: RunStatusIconProps) {
  const { color, Icon, spin } = PHASE_STYLE[phase] ?? PHASE_STYLE.Unknown;
  return <Icon spin={spin} style={{ color, fontSize: size }} />;
}

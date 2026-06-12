/* Ported from the console `@topology` lib (constants.ts). */

export enum Direction {
  TOP_TO_BOTTOM = 'TB',
  LEFT_TO_RIGHT = 'LR',
}

export const DEFAULT_TASK_NODE_TYPE = 'DEFAULT_TASK_NODE';
export const DEFAULT_SPACER_NODE_TYPE = 'DEFAULT_SPACER_NODE';
export const DEFAULT_FINALLY_NODE_TYPE = 'DEFAULT_FINALLY_NODE';

export const DEFAULT_EDGE_TYPE = 'DEFAULT_EDGE';
export const DEFAULT_UNNECESSARY_EDGE_TYPE = 'DEFAULT_UNNECESSARY_EDGE';
export const DEFAULT_RESULT_EDGE_TYPE = 'DEFAULT_RESULT_EDGE';

export const DEFAULT_GROUP_TYPE = 'DEFAULT_GROUP';
export const DEFAULT_FINALLY_GROUP_TYPE = 'DEFAULT_FINALLY_GROUP';

export const AUTOMATIC_CORRECTION_SIZE = 32;
export const BEZIER_CURVATURE = 24;

export const HOVER_STATE = 'hover';
export const SELECT_STATE = 'select';
export const ERROR_STATE = 'error';
export const WARNING_STATE = 'warning';
export const RELATION_STATE = 'relation';
export const FROM_LIGHT_STATE = 'from-light';

const DEFAULT_LIGHT_COLOR = 'rgb(0, 122, 245)';

export const DEFAULT_STATE_COLOR_MAP: Record<string, string> = {
  [ERROR_STATE]: 'rgb(235, 0, 39)',
  [WARNING_STATE]: 'rgb(245, 163, 0)',
  [HOVER_STATE]: DEFAULT_LIGHT_COLOR,
  [SELECT_STATE]: DEFAULT_LIGHT_COLOR,
  [RELATION_STATE]: DEFAULT_LIGHT_COLOR,
  [FROM_LIGHT_STATE]: DEFAULT_LIGHT_COLOR,
};

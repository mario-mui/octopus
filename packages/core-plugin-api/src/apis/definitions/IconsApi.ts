import { createApiRef } from '../system';
import { IconComponent, IconElement } from '../../icons';

/**
 * API for accessing app icons.
 *
 * @public
 */
export interface IconsApi {
  /**
   * Look up an icon element by key.
   */
  icon(key: string): IconElement | undefined;

  /**
   * @deprecated Use {@link IconsApi.icon} instead.
   */
  getIcon(key: string): IconComponent | undefined;

  listIconKeys(): string[];
}

/**
 * The `ApiRef` of {@link IconsApi}.
 *
 * @public
 */
export const iconsApiRef = createApiRef<IconsApi>().with({
  id: 'core.icons',
  pluginId: 'app',
});

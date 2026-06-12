import { JSX, ReactNode } from 'react';
import { IconElement } from '../icons/types';
import { RouteRef } from '../routing/RouteRef';
import { createExtensionDataRef } from './createExtensionDataRef';

/** @public */
export const coreExtensionData = {
  title: createExtensionDataRef<string>().with({ id: 'core.title' }),
  /**
   * Optional rendered label for the sidebar nav entry. When present it is shown
   * instead of {@link title}, letting a plugin supply an internationalized label
   * (a small component using `useTranslationRef`) that updates on language
   * change. `title` remains the plain-text fallback.
   */
  navLabel: createExtensionDataRef<ReactNode>().with({ id: 'core.nav.label' }),
  /**
   * The top-level sidebar group a page belongs to (e.g. `'Application'`,
   * `'Platform'`). Used to bucket pages into the navigation's group rail. The
   * string is both the group key and its displayed label.
   */
  navGroup: createExtensionDataRef<string>().with({ id: 'core.nav.group' }),
  /** An icon element for the extension. Should be exactly 24x24 pixels. */
  icon: createExtensionDataRef<IconElement>().with({ id: 'core.icon' }),
  reactElement: createExtensionDataRef<JSX.Element>().with({
    id: 'core.reactElement',
  }),
  routePath: createExtensionDataRef<string>().with({ id: 'core.routing.path' }),
  routeRef: createExtensionDataRef<RouteRef>().with({ id: 'core.routing.ref' }),
};

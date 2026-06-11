import { JSX } from 'react';
import { IconElement } from '../icons/types';
import { RouteRef } from '../routing/RouteRef';
import { createExtensionDataRef } from './createExtensionDataRef';

/** @public */
export const coreExtensionData = {
  title: createExtensionDataRef<string>().with({ id: 'core.title' }),
  /** An icon element for the extension. Should be exactly 24x24 pixels. */
  icon: createExtensionDataRef<IconElement>().with({ id: 'core.icon' }),
  reactElement: createExtensionDataRef<JSX.Element>().with({
    id: 'core.reactElement',
  }),
  routePath: createExtensionDataRef<string>().with({ id: 'core.routing.path' }),
  routeRef: createExtensionDataRef<RouteRef>().with({ id: 'core.routing.ref' }),
};

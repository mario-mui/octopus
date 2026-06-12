import { JSX } from 'react';

/**
 * The type used for icon elements throughout Octopus.
 *
 * @remarks
 *
 * Icon elements should behave like rendering a plain icon directly, for example
 * from `@remixicon/react`, and are expected to be sized by the surrounding UI.
 * Icons should be exactly 24x24 pixels in size by default.
 *
 * Using icons from `@remixicon/react` is preferred. Using icons from
 * `@material-ui/icons` or `AppIcon` and its variants from
 * `@octopus/core-components` is supported while migrating, but deprecated.
 * When using those icons, you must set `fontSize="inherit"` on the element.
 *
 * @public
 */
export type IconElement = JSX.Element | null;

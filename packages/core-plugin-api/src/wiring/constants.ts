// NOTE: changing any of these constants need to be reflected in
// @backstage/backend-plugin-api/src/wiring/constants.ts as well

/**
 * The pattern that IDs must match.
 *
 * @remarks
 * ids must only contain the letters `a` through `z` and digits, in groups separated by
 * dashes. Additionally, the very first character of the first group
 * must be a letter, not a digit
 *
 * @public
 */
export const ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/i;

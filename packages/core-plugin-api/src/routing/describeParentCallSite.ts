const MESSAGE_MARKER = 'eHgtF5hmbrXyiEvo';

// NOTE: This function is also imported and used in backend code

/**
 * Internal helper that describes the location of the parent caller.
 * @internal
 */
export function describeParentCallSite(
  ErrorConstructor: { new (message: string): Error } = Error,
): string {
  const { stack } = new ErrorConstructor(MESSAGE_MARKER);
  if (!stack) {
    return '<unknown>';
  }

  // Safari and Firefox don't include the error itself in the stack
  const startIndex = stack.includes(MESSAGE_MARKER)
    ? stack.indexOf('\n') + 1
    : 0;
  const secondEntryStart =
    stack.indexOf('\n', stack.indexOf('\n', startIndex) + 1) + 1;
  const secondEntryEnd = stack.indexOf('\n', secondEntryStart);

  const line = stack.substring(secondEntryStart, secondEntryEnd).trim();
  if (!line) {
    return 'unknown';
  }

  // Below we try to extract the location for different browsers.
  // Since RouteRefs are declared at the top-level of modules the caller name isn't interesting.

  // Chrome
  if (line.includes('(')) {
    return line.substring(line.indexOf('(') + 1, line.indexOf(')'));
  }

  // Safari & Firefox
  if (line.includes('@')) {
    return line.substring(line.indexOf('@') + 1);
  }

  // Give up
  return line;
}

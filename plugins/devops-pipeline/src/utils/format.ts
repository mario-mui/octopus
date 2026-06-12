/* Small presentation helpers for the pipeline pages. */

export function formatTimestamp(ts?: string): string {
  if (!ts) {
    return '-';
  }
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

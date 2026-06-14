import { describe, expect, it } from 'vitest';
import { parseAnsi } from './ansi';

const ESC = '\x1b';

describe('parseAnsi', () => {
  it('returns a single unstyled segment for plain text', () => {
    const segs = parseAnsi('hello world');
    expect(segs).toEqual([{ text: 'hello world', style: {} }]);
  });

  it('applies foreground colour and resets it', () => {
    const segs = parseAnsi(`a${ESC}[31mred${ESC}[0mb`);
    expect(segs).toEqual([
      { text: 'a', style: {} },
      { text: 'red', style: { color: '#cd3131' } },
      { text: 'b', style: {} },
    ]);
  });

  it('supports bold and 256-colour foreground', () => {
    const segs = parseAnsi(`${ESC}[1m${ESC}[38;5;46mx`);
    expect(segs).toHaveLength(1);
    expect(segs[0].text).toBe('x');
    expect(segs[0].style.fontWeight).toBe(600);
    expect(segs[0].style.color).toBe('rgb(0, 255, 0)');
  });

  it('strips non-SGR escape sequences (cursor moves, OSC titles)', () => {
    const segs = parseAnsi(`${ESC}[2Jclear${ESC}]0;title\x07done`);
    expect(segs.map(s => s.text).join('')).toBe('cleardone');
  });

  it('collapses carriage-return overwrites per line', () => {
    const segs = parseAnsi('10%\r50%\r100%\ndone');
    expect(segs.map(s => s.text).join('')).toBe('100%\ndone');
  });
});

/*
 * Minimal ANSI SGR (colour) parser for the log console. Self-contained (no dep)
 * — it turns a log string into styled text segments, honouring foreground /
 * background colours (16 / 256 / truecolour), bold, dim, italic, underline and
 * inverse. Non-SGR escape sequences (cursor moves, OSC titles, …) are stripped
 * so they don't render as garbage, and carriage-return overwrites are collapsed
 * the way a terminal would show them.
 */
import type { CSSProperties } from 'react';

export interface AnsiSegment {
  text: string;
  style: CSSProperties;
}

// xterm-style 16-colour palettes, tuned per background so colours stay legible
// in both the light and dark app themes.
const PALETTE_LIGHT = {
  basic: [
    '#000000', '#cd3131', '#0d9e5b', '#949800',
    '#2472c8', '#bc3fbc', '#0598bc', '#a0a0a0',
  ],
  bright: [
    '#666666', '#cd3131', '#0d9e5b', '#b5ba00',
    '#2472c8', '#bc3fbc', '#0598bc', '#666666',
  ],
};
const PALETTE_DARK = {
  basic: [
    '#cccccc', '#f14c4c', '#23d18b', '#f5f543',
    '#3b8eea', '#d670d6', '#29b8db', '#e5e5e5',
  ],
  bright: [
    '#999999', '#f14c4c', '#23d18b', '#f5f543',
    '#3b8eea', '#d670d6', '#29b8db', '#ffffff',
  ],
};

/** Resolve an xterm 256-colour index to a colour for the given palette. */
function color256(n: number, palette: Palette): string {
  if (n < 8) {
    return palette.basic[n];
  }
  if (n < 16) {
    return palette.bright[n - 8];
  }
  if (n < 232) {
    const i = n - 16;
    const r = Math.floor(i / 36);
    const g = Math.floor((i % 36) / 6);
    const b = i % 6;
    const c = (v: number) => (v === 0 ? 0 : v * 40 + 55);
    return `rgb(${c(r)}, ${c(g)}, ${c(b)})`;
  }
  const gray = (n - 232) * 10 + 8;
  return `rgb(${gray}, ${gray}, ${gray})`;
}

interface Palette {
  basic: string[];
  bright: string[];
}

interface SgrState {
  fg?: string;
  bg?: string;
  bold?: boolean;
  dim?: boolean;
  italic?: boolean;
  underline?: boolean;
  inverse?: boolean;
}

/** Apply one SGR sequence's numeric params to the running style state. */
function applySgr(state: SgrState, params: number[], palette: Palette): void {
  for (let i = 0; i < params.length; i++) {
    const p = params[i];
    if (p === 0) {
      // Reset everything.
      state.fg = state.bg = undefined;
      state.bold = state.dim = state.italic = state.underline = state.inverse =
        false;
    } else if (p === 1) {
      state.bold = true;
    } else if (p === 2) {
      state.dim = true;
    } else if (p === 3) {
      state.italic = true;
    } else if (p === 4) {
      state.underline = true;
    } else if (p === 7) {
      state.inverse = true;
    } else if (p === 22) {
      state.bold = state.dim = false;
    } else if (p === 23) {
      state.italic = false;
    } else if (p === 24) {
      state.underline = false;
    } else if (p === 27) {
      state.inverse = false;
    } else if (p >= 30 && p <= 37) {
      state.fg = palette.basic[p - 30];
    } else if (p === 39) {
      state.fg = undefined;
    } else if (p >= 40 && p <= 47) {
      state.bg = palette.basic[p - 40];
    } else if (p === 49) {
      state.bg = undefined;
    } else if (p >= 90 && p <= 97) {
      state.fg = palette.bright[p - 90];
    } else if (p >= 100 && p <= 107) {
      state.bg = palette.bright[p - 100];
    } else if (p === 38 || p === 48) {
      // Extended colour: 5;<n> (256) or 2;<r>;<g>;<b> (truecolour).
      const isFg = p === 38;
      const mode = params[i + 1];
      if (mode === 5) {
        const value = color256(params[i + 2] ?? 0, palette);
        if (isFg) state.fg = value;
        else state.bg = value;
        i += 2;
      } else if (mode === 2) {
        const value = `rgb(${params[i + 2] ?? 0}, ${params[i + 3] ?? 0}, ${
          params[i + 4] ?? 0
        })`;
        if (isFg) state.fg = value;
        else state.bg = value;
        i += 4;
      }
    }
  }
}

/** Build the CSS for the current state (resolving inverse / dim). */
function toStyle(state: SgrState): CSSProperties {
  const style: CSSProperties = {};
  let fg = state.fg;
  let bg = state.bg;
  if (state.inverse) {
    [fg, bg] = [bg ?? '#ffffff', fg ?? '#000000'];
  }
  if (fg) style.color = fg;
  if (bg) style.background = bg;
  if (state.bold) style.fontWeight = 600;
  if (state.italic) style.fontStyle = 'italic';
  if (state.underline) style.textDecoration = 'underline';
  if (state.dim && !state.inverse) style.opacity = 0.65;
  return style;
}

/** Collapse `\r` overwrites within each line (progress bars, spinners). */
function collapseCarriageReturns(text: string): string {
  if (!text.includes('\r')) {
    return text;
  }
  return text
    .split('\n')
    .map(line => {
      const last = line.lastIndexOf('\r');
      return last === -1 ? line : line.slice(last + 1);
    })
    .join('\n');
}

const ESC = '\x1b';

/** Parse a log string into styled segments, using the theme-matched palette. */
export function parseAnsi(input: string, dark = false): AnsiSegment[] {
  const palette = dark ? PALETTE_DARK : PALETTE_LIGHT;
  const text = collapseCarriageReturns(input);
  const segments: AnsiSegment[] = [];
  const state: SgrState = {};
  let buffer = '';
  let style = toStyle(state);

  const flush = () => {
    if (buffer) {
      segments.push({ text: buffer, style });
      buffer = '';
    }
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch !== ESC) {
      buffer += ch;
      continue;
    }
    const next = text[i + 1];
    if (next === '[') {
      // CSI sequence: read params until the final byte (0x40–0x7E).
      let j = i + 2;
      let params = '';
      while (j < text.length) {
        const c = text[j];
        if (c >= '@' && c <= '~') {
          break;
        }
        params += c;
        j++;
      }
      const final = text[j];
      if (final === 'm') {
        // Only SGR changes the style; everything else is just dropped.
        flush();
        const nums = params
          .split(';')
          .map(s => (s === '' ? 0 : Number(s)))
          .filter(n => !Number.isNaN(n));
        applySgr(state, nums.length ? nums : [0], palette);
        style = toStyle(state);
      }
      i = j; // skip the whole sequence
    } else if (next === ']') {
      // OSC sequence: skip to BEL or ST (ESC \).
      let j = i + 2;
      while (j < text.length && text[j] !== '\x07') {
        if (text[j] === ESC && text[j + 1] === '\\') {
          j++;
          break;
        }
        j++;
      }
      i = j;
    }
    // A lone ESC (no recognised introducer) is dropped.
  }
  flush();
  return segments;
}

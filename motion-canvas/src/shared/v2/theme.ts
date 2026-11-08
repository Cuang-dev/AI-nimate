import fontUrl from './PlusJakartaSans-latin.woff2?url';

export const C = {
  cream: '#FAF6EE',
  paper: '#FFFEFA',
  white: '#FFFFFF',
  ink: '#0F172A',
  slate: '#475569',
  crimson: '#E11D48',
  emerald: '#059669',
  amber: '#D97706',
  blue: '#0284C7',
  subAmber: '#FBBF24',
};

export const FONT = "'Plus Jakarta Sans', 'Inter', sans-serif";

export type Tone = 'neutral' | 'good' | 'bad' | 'warn';

export function toneColor(tone?: Tone): string {
  switch (tone) {
    case 'good': return C.emerald;
    case 'bad': return C.crimson;
    case 'warn': return C.amber;
    default: return C.blue;
  }
}

export function toneTint(tone?: Tone): string {
  switch (tone) {
    case 'good': return '#E3F4EC';
    case 'bad': return '#FCE7EC';
    case 'warn': return '#FBEFD7';
    default: return '#EEF3F8';
  }
}

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
/** Progress 0..1 of time t within [t0, t0 + d]. */
export const prog = (t: number, t0: number, d: number) => clamp01((t - t0) / d);
export const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);
export const easeInOut = (p: number) =>
  p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
export const easeBack = (p: number) => {
  const c1 = 1.4, c3 = c1 + 1;
  return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
};

/** The one real font load: scene text is measured only after this resolves. */
export async function loadFonts(): Promise<void> {
  const face = new FontFace('Plus Jakarta Sans', `url(${fontUrl})`, {
    weight: '400 800',
    style: 'normal',
  });
  await face.load();
  document.fonts.add(face);
  await document.fonts.ready;
  console.log(`[v2] Plus Jakarta Sans loaded: ${document.fonts.check("700 40px 'Plus Jakarta Sans'")}`);
}

let fontPromise: Promise<void> | null = null;
export function ensureFonts(): Promise<void> {
  if (!fontPromise) fontPromise = loadFonts();
  return fontPromise;
}

/**
 * Counts the first number inside a display string up from 0 (p = 0) to its own
 * value (p = 1), keeping the original decimals and Indonesian "." thousands.
 */
export function countText(value: string, p: number): string {
  const m = value.match(/\d[\d.,]*\d|\d/);
  if (!m) return value;
  const tok = m[0];
  let dec = 0;
  let thou = false;
  let num: number;
  if (tok.includes(',')) {
    dec = tok.length - tok.lastIndexOf(',') - 1;
    thou = tok.includes('.');
    num = parseFloat(tok.replace(/\./g, '').replace(',', '.'));
  } else if (/^\d{1,3}(\.\d{3})+$/.test(tok)) {
    thou = true;
    num = parseFloat(tok.replace(/\./g, ''));
  } else {
    const dot = tok.indexOf('.');
    dec = dot >= 0 ? tok.length - dot - 1 : 0;
    num = parseFloat(tok);
  }
  if (p >= 1) return value;
  const fixed = (num * p).toFixed(dec);
  let [ip, fp] = fixed.split('.');
  if (thou) ip = ip.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return value.replace(tok, fp ? `${ip},${fp}` : ip);
}

export function parseNumber(value?: string): number | undefined {
  const m = value?.match(/\d[\d.,]*\d|\d/);
  if (!m) return undefined;
  const tok = m[0];
  if (tok.includes(',')) return parseFloat(tok.replace(/\./g, '').replace(',', '.'));
  if (/^\d{1,3}(\.\d{3})+$/.test(tok)) return parseFloat(tok.replace(/\./g, ''));
  return parseFloat(tok);
}

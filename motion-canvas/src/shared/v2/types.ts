import type { Tone } from './theme';

export interface Item {
  at: string;
  label?: string;
  value?: string;
  numeric?: number;
  tone?: Tone;
  note?: string;
  a?: string;
  b?: string;
  /** compare: which column wins (default "b"). */
  win?: 'a' | 'b';
  /** line: which series this point belongs to (default "a"). */
  series?: 'a' | 'b';
  /** flow: icon id from an assets_manifest icon set (drawn above the label). */
  icon?: string;
}

export type ExplainerType = 'stack' | 'bars' | 'stat' | 'compare' | 'line' | 'flow' | 'receipt';

export interface ExplainerSpec {
  type: ExplainerType;
  title?: string;
  yLabel?: string;
  xLabel?: string;
  /** compare: column heads. line: series names for a and b (legend). */
  columns?: string[];
  items: Item[];
}

export interface ImageSpec {
  src: string;
  mode: 'full' | 'side';
  motion?: 'pushIn' | 'pushOut' | 'panLeft' | 'panRight';
  focus?: 'hold' | 'dim';
  focusX?: number;
}

export interface Shot {
  at: string;
  transition?: 'cut' | 'crossfade' | 'collapse' | 'expand';
  image?: ImageSpec;
  explainer?: ExplainerSpec;
}

export interface Storyboard {
  /** Folder under /assets/ holding the images; defaults to the video id. */
  assetDir?: string;
  video_id?: string;
  chapters: { id: string; shots: Shot[] }[];
}

export interface TimedWord {
  w: string;
  start: number;
  end: number;
  sentence_id?: string;
  beat_id?: string;
}

export interface Timings {
  duration_seconds?: number;
  beats: { beat_id: string; chapter_id: string; start: number; end: number }[];
  sentences: { id: string; chapter_id?: string; start: number; end: number }[];
  words: TimedWord[];
  subtitle_chunks?: { text: string; start: number; end: number; beat_id?: string; words?: any[] }[];
}

/** An item with its `at` resolved to chapter-local seconds. */
export type RItem = Item & { t: number };

export interface RShot {
  t: number;
  /** Local time the shot ends (next shot's t, or the chapter end). */
  tEnd: number;
  transition: NonNullable<Shot['transition']>;
  image?: ImageSpec;
  explainer?: Omit<ExplainerSpec, 'items'> & { items: RItem[] };
  /** Time the first item lands (for dimming), or Infinity. */
  firstItemT: number;
}

import { Line, Node, Rect, Txt, View2D } from '@motion-canvas/2d';
import { createRef, useThread } from '@motion-canvas/core';
import { SCENE_TIMINGS, SUBTITLE_CHUNKS, SubtitleChunk } from './timings';
import {
  getTypo,
  getAssets,
  ScreenTypoScale,
  ScreenAssetScale,
} from '../../shared/screenCalibration';

export { getTypo, getAssets };
export type { ScreenTypoScale, ScreenAssetScale };

export const COLORS = {
  bg: '#F8FAFC',
  surface: '#FFFFFF',
  ink: '#0F172A',
  secondaryInk: '#475569',
  gridLine: '#E2E8F0',
  accent: '#059669',
  compliantGreen: '#059669',
  goldAccent: '#D97706',
  alertRed: '#EF4444',
};

export const HEADING_FONT = "'Plus Jakarta Sans', 'Inter', sans-serif";

export const PALETTE = {
  crimson: '#D92D20',
  crimsonBg: '#FEE2E2',
  emerald: '#059669',
  emeraldBg: '#D1FAE5',
  feltGreen: '#059669',
  feltGreenBg: '#D1FAE5',
  muted: '#475569',
  mutedBg: '#F1F5F9',
  amber: '#D97706',
  amberBg: '#FEF3C7',
  cyan: '#0284C7',
  cyanBg: '#E0F2FE',
  surface: '#FFFFFF',
  ink: '#0F172A',
  cardBorder: '#CBD5E1',
};

export const FONTS = {
  heading: HEADING_FONT,
  body: "'Inter', 'Liberation Sans', 'DejaVu Sans', sans-serif",
  data: "'JetBrains Mono', 'Liberation Mono', 'DejaVu Sans Mono', monospace",
};

export const BEAT_LABELS = [
  'POV: | Fenomena Meja Hijau',
  'POV: | Mesin Otomatis Rp12 Juta',
  'POV: | Kunci Waktu 5 Jam',
  'POV: | Modal Ruko Rp350 Juta',
  'POV: | Rahasia Cuan Dimsum & Teh',
  'POV: | Bedah Struk VIP Margin 70%',
  'POV: | Kutukan Hari Kerja Kosong',
  'POV: | Mesin Macet & Batu Hilang',
  'POV: | Garis Tipis Pasal 303 KUHP',
  'POV: | Ruko vs Sewa Harian',
];

/**
 * Detects whether the current view is in widescreen mode (16:9, 1920x1080)
 * or vertical portrait mode (9:16, 1080x1920).
 */
export function isWidescreen(view: View2D): boolean {
  return view.width() > view.height();
}

/**
 * Responsive horizontal positioning for stage cards:
 * - single: 0
 * - widescreen 16:9 (1920x1080): slot 0 -> -440, slot 1 -> 440 (side-by-side)
 * - vertical 9:16 (1080x1920): 0 (vertically stacked)
 */
export function getCardX(view: View2D, slot: 0 | 1, single = false): number {
  if (single) return 0;
  if (isWidescreen(view)) {
    return slot === 0 ? -440 : 440;
  }
  return 0;
}

/**
 * Responsive vertical positioning for stage cards:
 * - widescreen 16:9 (1920x1080): -30
 * - vertical 9:16 (1080x1920): single ? -60 : (slot === 0 ? -210 : 230)
 */
export function getCardY(view: View2D, slot: 0 | 1, single = false): number {
  if (isWidescreen(view)) {
    return -30;
  }
  return single ? -60 : slot === 0 ? -210 : 230;
}

/**
 * Responsive card width:
 * - widescreen 16:9: 840px
 * - vertical 9:16: 940px
 */
export function getCardWidth(view: View2D): number {
  return isWidescreen(view) ? 840 : 940;
}

/**
 * Sets up the base responsive stage:
 * - Full-canvas background Rect and grid lines
 * - Single Top brow pill at x=0, y=-475 (widescreen)
 * - Subtitle pill bar positioned bottom center with acoustic lead
 */
export function setupBaseStage(
  view: View2D,
  sectionLabel?: string | number | { section: number }
) {
  const wide = isWidescreen(view);
  const typo = getTypo(wide);
  const assets = getAssets(wide);
  const width = wide ? 1920 : 1080;
  const height = wide ? 1080 : 1920;

  const vGridX = wide
    ? [-720, -480, -240, 0, 240, 480, 720]
    : [-480, -240, 0, 240, 480];

  const hGridY = wide
    ? [-360, -180, 0, 180, 360]
    : [-760, -380, 0, 380, 760];

  const time = useThread().time;
  const t0 = time();

  let sceneIdx = 0;
  if (
    typeof sectionLabel === 'object' &&
    sectionLabel !== null &&
    'section' in sectionLabel
  ) {
    sceneIdx = Math.max(0, Math.min(9, sectionLabel.section));
  } else if (typeof sectionLabel === 'number') {
    sceneIdx = Math.max(0, Math.min(9, sectionLabel));
  } else if (typeof sectionLabel === 'string') {
    const idx = BEAT_LABELS.indexOf(sectionLabel);
    if (idx >= 0) {
      sceneIdx = idx;
    } else {
      const match = sectionLabel.match(/^0?(\d+)/);
      if (match) {
        sceneIdx = Math.max(0, Math.min(9, parseInt(match[1], 10) - 1));
      } else {
        const found = BEAT_LABELS.findIndex((bl) =>
          bl.toLowerCase().includes(sectionLabel.toLowerCase())
        );
        if (found >= 0) sceneIdx = found;
      }
    }
  }

  const rawLabel =
    typeof sectionLabel === 'string'
      ? sectionLabel
      : BEAT_LABELS[sceneIdx] ?? '';

  let chapterName = '';
  if (rawLabel.includes('|')) {
    chapterName = (rawLabel.split('|')[1] ?? '').trim();
  } else {
    chapterName =
      (BEAT_LABELS[sceneIdx] ?? '').split('|')[1]?.trim() || rawLabel;
  }

  const sceneStart = SCENE_TIMINGS[sceneIdx]?.start ?? 0;
  const sceneEnd = SCENE_TIMINGS[sceneIdx]?.end ?? 9999;
  const LEAD_OFFSET = 0.22;

  const sceneChunks = (SUBTITLE_CHUNKS || []).filter(
    (c: SubtitleChunk) =>
      c.start >= sceneStart - 0.05 && c.end <= sceneEnd + 0.05
  );

  const getGlobalTime = () => sceneStart + (time() - t0) + LEAD_OFFSET;

  const getActiveChunk = () => {
    if (sceneChunks.length === 0) return undefined;
    const gt = getGlobalTime();
    if (gt >= sceneEnd) return undefined;
    const idx = sceneChunks.findIndex((c: SubtitleChunk, i: number) => {
      const nextChunk = sceneChunks[i + 1];
      const endThreshold =
        nextChunk && nextChunk.start <= sceneEnd && nextChunk.start - c.end < 0.5
          ? nextChunk.start
          : Math.min(c.end + 0.18, sceneEnd);
      return gt >= c.start && gt < endThreshold;
    });
    return idx >= 0 ? sceneChunks[idx] : undefined;
  };

  const isWordActive = (slotIdx: number) => {
    const chunk = getActiveChunk();
    if (!chunk || !chunk.words || slotIdx >= chunk.words.length) return false;
    const gt = getGlobalTime();
    const w = chunk.words[slotIdx];
    const nextW = chunk.words[slotIdx + 1];
    const endBound = nextW ? Math.min(nextW.start, w.end + 0.3) : w.end + 0.2;
    return gt >= w.start && gt < endBound;
  };

  const isWordSpoken = (slotIdx: number) => {
    const chunk = getActiveChunk();
    if (!chunk || !chunk.words || slotIdx >= chunk.words.length) return false;
    const gt = getGlobalTime();
    return gt >= chunk.words[slotIdx].start;
  };

  const baseNode = (
    <Node>
      {/* Background canvas fill */}
      <Rect width={width} height={height} fill={COLORS.bg} />

      {/* Structural Swiss Grid Lines */}
      {vGridX.map((x) => (
        <Line
          key={`vgrid-${x}`}
          points={[
            [x, -height / 2],
            [x, height / 2],
          ]}
          stroke={COLORS.gridLine}
          lineWidth={2}
          opacity={0.8}
        />
      ))}

      {hGridY.map((y) => (
        <Line
          key={`hgrid-${y}`}
          points={[
            [-width / 2, y],
            [width / 2, y],
          ]}
          stroke={COLORS.gridLine}
          lineWidth={2}
          opacity={0.8}
        />
      ))}

      {/* Single Top Brow Badge (Clean Rule 11) */}
      <Rect
        x={0}
        y={wide ? -475 : -820}
        layout={true}
        direction={'row'}
        alignItems={'center'}
        padding={[12, 28]}
        radius={999}
        fill={'#FFFFFF'}
        stroke={PALETTE.ink}
        lineWidth={2.5}
        gap={14}
      >
        <Txt
          text="POV:"
          fontFamily={HEADING_FONT}
          fontSize={wide ? 26 : 30}
          fontWeight={800}
          fill={PALETTE.crimson}
        />
        <Txt
          text="|"
          fontFamily={HEADING_FONT}
          fontSize={wide ? 26 : 30}
          fontWeight={400}
          fill={'#94A3B8'}
        />
        <Txt
          text={chapterName}
          fontFamily={HEADING_FONT}
          fontSize={wide ? 26 : 30}
          fontWeight={800}
          fill={PALETTE.ink}
        />
      </Rect>

      {/* Editorial Pill Highlight Subtitle Bar */}
      <Rect
        x={0}
        y={wide ? 415 : 670}
        layout
        direction={'row'}
        alignItems={'center'}
        justifyContent={'center'}
        gap={0}
        padding={assets.subtitlePadding}
        radius={14}
        fill={COLORS.surface}
        stroke={COLORS.ink}
        lineWidth={assets.strokePrimary}
        opacity={() => (getActiveChunk() ? 1 : 0)}
        scale={1.0}
      >
        {[0, 1, 2, 3].map((slotIdx) => (
          <Rect
            key={`sub-slot-${slotIdx}`}
            layout
            padding={() => {
              const chunk = getActiveChunk();
              return chunk && slotIdx < chunk.words.length
                ? assets.subtitleSlotPad
                : [0, 0];
            }}
            margin={() => {
              const chunk = getActiveChunk();
              return chunk && slotIdx < chunk.words.length - 1
                ? [0, assets.subtitleSlotGap, 0, 0]
                : [0, 0, 0, 0];
            }}
            radius={8}
            fill={() =>
              isWordActive(slotIdx) ? COLORS.accent : 'rgba(0,0,0,0)'
            }
            scale={1.0}
          >
            <Txt
              text={() => {
                const chunk = getActiveChunk();
                return chunk && slotIdx < chunk.words.length
                  ? chunk.words[slotIdx].w
                  : '';
              }}
              fontFamily={FONTS.body}
              fontSize={() => {
                const chunk = getActiveChunk();
                return chunk && slotIdx < chunk.words.length
                  ? typo.subtitle
                  : 28;
              }}
              fontWeight={700}
              fill={() =>
                isWordActive(slotIdx)
                  ? COLORS.surface
                  : isWordSpoken(slotIdx)
                  ? COLORS.ink
                  : COLORS.secondaryInk
              }
              opacity={() => {
                const chunk = getActiveChunk();
                if (!chunk || slotIdx >= chunk.words.length) return 0;
                return isWordSpoken(slotIdx) ? 1.0 : 0.45;
              }}
            />
          </Rect>
        ))}
      </Rect>
    </Node>
  );

  view.add(baseNode);
  return baseNode;
}

/**
 * Editorial stage wrapper that initializes Swiss grid, top brow, and subtitles,
 * and returns a Ref to wrap all scene-specific animations.
 */
export function createEditorialStage(
  view: View2D,
  sectionLabel?: string | number | { section: number }
) {
  setupBaseStage(view, sectionLabel);
  const stage = createRef<Node>();
  return stage;
}

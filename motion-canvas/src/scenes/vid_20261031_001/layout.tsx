import { Line, Node, Rect, Txt, View2D } from '@motion-canvas/2d';
import { useThread } from '@motion-canvas/core';
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
  bg: '#F7F5F0',
  surface: '#FFFFFF',
  ink: '#141413',
  secondaryInk: '#334155',
  gridLine: '#E2DFD7',
  accent: '#FF3B00',
  compliantGreen: '#1B8354',
  goldAccent: '#D97706',
};

export const HEADING_FONT = "'Plus Jakarta Sans', 'Inter', sans-serif";

export const FONTS = {
  heading: "'Plus Jakarta Sans', 'Inter', sans-serif",
  body: "'Inter', 'Liberation Sans', 'DejaVu Sans', sans-serif",
  data: "'JetBrains Mono', 'Liberation Mono', 'DejaVu Sans Mono', monospace",
};

export const PALETTE = {
  ...COLORS,
  muted: '#334155',
  crimson: '#D92D20',
  crimsonBg: '#FEE4E2',
};

export const BEAT_LABELS = [
  'Knp? | Ancaman Turun Kasta',
  'Knp? | Cuma 3% Di Pasar',
  'Knp? | Jebakan Dana Asing',
  'Knp? | Saham Nyangkut',
  'Knp? | Lanjut Di YouTube',
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
 * - widescreen 16:9 (1920x1080): slot 0 -> -470, slot 1 -> 470 (side-by-side)
 * - vertical 9:16 (1080x1920): 0 (vertically stacked)
 */
export function getCardX(view: View2D, slot: 0 | 1, single = false): number {
  if (single) return 0;
  if (isWidescreen(view)) {
    return slot === 0 ? -470 : 470;
  }
  return 0;
}

/**
 * Responsive vertical positioning for stage cards:
 * - widescreen 16:9 (1920x1080): -40
 * - vertical 9:16 (1080x1920): single ? -60 : (slot === 0 ? -210 : 230)
 */
export function getCardY(view: View2D, slot: 0 | 1, single = false): number {
  if (isWidescreen(view)) {
    return -40;
  }
  return single ? -60 : slot === 0 ? -210 : 230;
}

/**
 * Responsive card width:
 * - widescreen 16:9: 880px
 * - vertical 9:16: 940px
 */
export function getCardWidth(view: View2D): number {
  return isWidescreen(view) ? 880 : 940;
}

/**
 * Sets up the base responsive stage:
 * - Full-canvas background Rect and grid lines
 * - Section label positioned top-left (supporting 'KNP? // 01:' through 'KNP? // 05:')
 * - Subtitle pill bar positioned bottom center with acoustic lead
 *
 * NOTE: Scenes MUST wrap animated stage content in `<Node ref={stage}>`
 * (never bare `<Camera>`). Motion Canvas computes `worldSpaceCacheBBox` for any
 * element with `opacity < 1` using `this.view().localToWorld()`. Inside `<Camera>`,
 * the internal scene root lacks View2D translation ([0..1920, 0..1080]), causing
 * the entire left (x < 0) and top (y < 0) halves of fading elements to be clipped.
 * `<Node>` directly preserves the View2D centered coordinate origin [-width/2..width/2].
 */
export function setupBaseStage(view: View2D, beatOrLabel: number | string = 0) {
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
  let chapterName = '';

  if (typeof beatOrLabel === 'number') {
    sceneIdx = Math.max(0, Math.min(4, Math.floor(beatOrLabel)));
    const full = BEAT_LABELS[sceneIdx] || BEAT_LABELS[0];
    chapterName = full.includes('|') ? full.split('|')[1].trim() : full;
  } else if (typeof beatOrLabel === 'string') {
    if (beatOrLabel.includes('|')) {
      chapterName = beatOrLabel.split('|')[1].trim();
      const foundIdx = BEAT_LABELS.findIndex((l) =>
        l.toLowerCase().includes(chapterName.toLowerCase())
      );
      sceneIdx = foundIdx >= 0 ? foundIdx : 0;
    } else {
      if (
        beatOrLabel.includes('02:') ||
        beatOrLabel.includes('// 02') ||
        beatOrLabel.startsWith('02') ||
        beatOrLabel.toLowerCase().includes('cuma')
      ) {
        sceneIdx = 1;
      } else if (
        beatOrLabel.includes('03:') ||
        beatOrLabel.includes('// 03') ||
        beatOrLabel.startsWith('03') ||
        beatOrLabel.toLowerCase().includes('jebakan')
      ) {
        sceneIdx = 2;
      } else if (
        beatOrLabel.includes('04:') ||
        beatOrLabel.includes('// 04') ||
        beatOrLabel.startsWith('04') ||
        beatOrLabel.toLowerCase().includes('nyangkut')
      ) {
        sceneIdx = 3;
      } else if (
        beatOrLabel.includes('05:') ||
        beatOrLabel.includes('// 05') ||
        beatOrLabel.startsWith('05') ||
        beatOrLabel.toLowerCase().includes('yt') ||
        beatOrLabel.toLowerCase().includes('youtube')
      ) {
        sceneIdx = 4;
      } else {
        sceneIdx = 0;
      }
      const full = BEAT_LABELS[sceneIdx] || BEAT_LABELS[0];
      chapterName = full.includes('|') ? full.split('|')[1].trim() : full;
    }
  } else {
    sceneIdx = 0;
    const full = BEAT_LABELS[0];
    chapterName = full.includes('|') ? full.split('|')[1].trim() : full;
  }

  const sceneStart = SCENE_TIMINGS[sceneIdx]?.start ?? 0;
  const sceneEnd = SCENE_TIMINGS[sceneIdx]?.end ?? 9999;
  const LEAD_OFFSET = 0.22;

  const sceneChunks = (SUBTITLE_CHUNKS || []).filter(
    (c: SubtitleChunk) => c.start >= sceneStart - 0.05 && c.end <= sceneEnd + 0.05
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

      {/* Structural Swiss Grid Lines covering full canvas */}
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

      {/* Sleek Single Top Brow Sub-Chapter Pill */}
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
          text="Knp?"
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
                  : 0;
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

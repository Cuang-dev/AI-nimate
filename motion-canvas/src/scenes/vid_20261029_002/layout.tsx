import { Line, Node, Rect, Txt, View2D } from '@motion-canvas/2d';
import { useThread } from '@motion-canvas/core';
import { SCENE_TIMINGS, SUBTITLE_CHUNKS, SubtitleChunk } from './timings';

export const COLORS = {
  bg: '#F7F5F0',
  surface: '#FFFFFF',
  ink: '#141413',
  secondaryInk: '#6E6D68',
  gridLine: '#E2DFD7',
  accent: '#FF3B00',
  compliantGreen: '#1B8354',
  goldAccent: '#D97706',
};

export const FONTS = {
  heading: "'Instrument Serif', 'Liberation Serif', 'DejaVu Serif', serif",
  body: "'Inter', 'Liberation Sans', 'DejaVu Sans', sans-serif",
  data: "'JetBrains Mono', 'Liberation Mono', 'DejaVu Sans Mono', monospace",
};

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
 * - Section label positioned top-left
 * - Subtitle pill bar positioned bottom center with acoustic lead
 *
 * NOTE: Scenes MUST wrap animated stage content in `<Node ref={stage}>`
 * (never bare `<Camera>`). Motion Canvas computes `worldSpaceCacheBBox` for any
 * element with `opacity < 1` using `this.view().localToWorld()`. Inside `<Camera>`,
 * the internal scene root lacks View2D translation ([0..1920, 0..1080]), causing
 * the entire left (x < 0) and top (y < 0) halves of fading elements to be clipped.
 * `<Node>` directly preserves the View2D centered coordinate origin [-width/2..width/2].
 */
export function setupBaseStage(view: View2D, sectionLabel?: string) {
  const wide = isWidescreen(view);
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
  const label = sectionLabel || '';
  const sceneIdx = label.startsWith('02') || label.includes('02 //')
    ? 1
    : label.startsWith('03') || label.includes('03 //')
    ? 2
    : label.startsWith('04') || label.includes('04 //')
    ? 3
    : label.startsWith('05') || label.includes('05 //')
    ? 4
    : 0;
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

      {/* Section Indicator */}
      {sectionLabel && (
        <Rect
          x={wide ? -860 : -450}
          y={wide ? -460 : -780}
          offset={[-1, 0]}
          layout
          direction={'row'}
          justifyContent={'start'}
          alignItems={'center'}
          opacity={0.65}
        >
          <Txt
            text={sectionLabel}
            fontFamily={FONTS.data}
            fontSize={24}
            fontWeight={700}
            fill={COLORS.secondaryInk}
            letterSpacing={1.5}
          />
        </Rect>
      )}

      {/* Editorial Pill Highlight Subtitle Bar */}
      <Rect
        x={0}
        y={wide ? 415 : 660}
        layout
        direction={'row'}
        alignItems={'center'}
        justifyContent={'center'}
        gap={0}
        padding={[12, 24]}
        radius={12}
        fill={COLORS.surface}
        stroke={COLORS.ink}
        lineWidth={3}
        opacity={() => (getActiveChunk() ? 1 : 0)}
        scale={1.0}
      >
        {[0, 1, 2, 3].map((slotIdx) => (
          <Rect
            key={`sub-slot-${slotIdx}`}
            layout
            padding={() => {
              const chunk = getActiveChunk();
              return chunk && slotIdx < chunk.words.length ? [6, 10] : [0, 0];
            }}
            margin={() => {
              const chunk = getActiveChunk();
              return chunk && slotIdx < chunk.words.length - 1
                ? [0, 8, 0, 0]
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
                return chunk && slotIdx < chunk.words.length ? 34 : 0;
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

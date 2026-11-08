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
  bg: '#FAF6EE',
  surface: '#FFFFFF',
  ink: '#0F172A',
  secondaryInk: '#334155',
  gridLine: '#E5DEC9',
  accent: '#E11D48',
  compliantGreen: '#059669',
  goldAccent: '#D97706',
};

export const HEADING_FONT = "'Plus Jakarta Sans', 'Inter', sans-serif";

export const PALETTE = {
  crimson: '#E11D48',
  crimsonBg: '#FFE4E6',
  emerald: '#059669',
  emeraldBg: '#D1FAE5',
  muted: '#334155',
  mutedBg: '#F1F5F9',
  amber: '#D97706',
  amberBg: '#FEF3C7',
  cyan: '#0284C7',
  cyanBg: '#E0F2FE',
  surface: COLORS.surface,
  ink: COLORS.ink,
};

export const FONTS = {
  heading: HEADING_FONT,
  body: "'Inter', 'Liberation Sans', 'DejaVu Sans', sans-serif",
  data: "'JetBrains Mono', 'Liberation Mono', 'DejaVu Sans Mono', monospace",
};

export const BEAT_LABELS = [
  'POV: | SEWA MEJA RP15 RIBU',
  'POV: | MESIN OTOMATIS FOSHAN',
  'POV: | MODAL RUKO RP350 JUTA',
  'POV: | RENTAL GARASI RP60 JUTA',
  'POV: | KUNCI 5 JAM NON-STOP',
  'POV: | STRUK RP750 RIBU & MARGIN 70%',
  'POV: | KUTUKAN HARI KERJA',
  'POV: | BOBA TUMPAH & BATU HILANG',
  'POV: | PASAL 303 & TAMENG LEGAL',
  'POV: | VONIS AKHIR & BALIK MODAL',
];

export const CHAPTER_LABELS = BEAT_LABELS;

export function isWidescreen(view: View2D): boolean {
  return view.width() > view.height();
}

export function getCardX(view: View2D, slot: 0 | 1, single = false): number {
  if (single) return 0;
  if (isWidescreen(view)) {
    return slot === 0 ? -460 : 460;
  }
  return 0;
}

export function getCardY(view: View2D, slot: 0 | 1, single = false): number {
  if (isWidescreen(view)) {
    return -35;
  }
  return single ? -60 : slot === 0 ? -210 : 230;
}

export function getCardWidth(view: View2D): number {
  return isWidescreen(view) ? 860 : 940;
}

function resolveSceneIndex(sectionLabel?: string | number): number {
  if (typeof sectionLabel === 'number') {
    return Math.max(0, Math.min(BEAT_LABELS.length - 1, sectionLabel));
  }
  if (typeof sectionLabel === 'string') {
    const exactIdx = BEAT_LABELS.indexOf(sectionLabel);
    if (exactIdx >= 0) return exactIdx;
    const numMatch = sectionLabel.match(/(?:beat_|chapter_)?0?(\d+)/i);
    if (numMatch) {
      const parsed = parseInt(numMatch[1], 10);
      if (parsed >= 1 && parsed <= BEAT_LABELS.length) {
        return parsed - 1;
      }
    }
    const upper = sectionLabel.toUpperCase();
    for (let i = 0; i < BEAT_LABELS.length; i++) {
      const rhs = (BEAT_LABELS[i].split('|')[1] || '').trim().toUpperCase();
      if (rhs && upper.includes(rhs.slice(0, 8))) {
        return i;
      }
    }
  }
  return 0;
}

export function setupBaseStage(view: View2D, sectionLabel?: string | number) {
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
  const sceneIdx = resolveSceneIndex(sectionLabel);
  const fullLabel = BEAT_LABELS[sceneIdx] ?? BEAT_LABELS[0];
  const chapterName = (fullLabel.split('|')[1] ?? '').trim() || fullLabel;

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

  const bgNode = (
    <Node zIndex={-10}>
      <Rect width={width} height={height} fill={COLORS.bg} />
      {vGridX.map((x) => (
        <Line
          key={`vgrid-${x}`}
          points={[
            [x, -height / 2],
            [x, height / 2],
          ]}
          stroke={COLORS.gridLine}
          lineWidth={2}
          opacity={0.75}
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
          opacity={0.75}
        />
      ))}
    </Node>
  );

  const hudOverlayNode = (
    <Node zIndex={100}>
      {/* Single Top Brow Badge */}
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
        lineWidth={3}
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
        y={wide ? 420 : 670}
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

  view.add(bgNode);
  view.add(hudOverlayNode);
  return hudOverlayNode;
}

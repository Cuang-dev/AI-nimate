import { Line, Node, Rect, Txt } from '@motion-canvas/2d';
import { useThread } from '@motion-canvas/core';
import { THEME } from './theme';
import { TIMINGS } from './timings';

export interface SwissLayoutProps {
  figure?: string;
  category?: string;
  footerLeft?: string;
  footerRight?: string;
}

export function SwissLayout(props: SwissLayoutProps) {
  const {
    figure = 'FIG. 01',
    category = 'HUMANE AI PIN',
    footerLeft = 'SOURCE: THE VERGE / CNET',
  } = props;

  const time = useThread().time;
  const t0 = time();
  const label = figure || '';

  // Map label ("02", "FIG. 02...", etc.) to scene start offset
  const sceneIdx =
    label.startsWith('02') || label.includes('02')
      ? 1
      : label.startsWith('03') || label.includes('03')
      ? 2
      : label.startsWith('04') || label.includes('04')
      ? 3
      : label.startsWith('05') || label.includes('05')
      ? 4
      : 0;
  const sceneStart = TIMINGS.scenes[sceneIdx]?.start ?? 0;
  const sceneEnd = TIMINGS.scenes[sceneIdx]?.end ?? 9999;
  const LEAD_OFFSET = 0.22;

  const sceneChunks = (TIMINGS.subtitleChunks || []).filter(
    (c) => c.start >= sceneStart - 0.05 && c.end <= sceneEnd + 0.05,
  );

  const getGlobalTime = () => sceneStart + (time() - t0) + LEAD_OFFSET;

  const getActiveChunk = () => {
    if (sceneChunks.length === 0) return undefined;
    const gt = getGlobalTime();
    if (gt >= sceneEnd) return undefined;
    const idx = sceneChunks.findIndex((c, i) => {
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

  const width = THEME.layout.width;
  const height = THEME.layout.height;
  const safeW = THEME.layout.safeWidth;
  const headerY = THEME.layout.headerY;
  const footerY = THEME.layout.footerY;

  return (
    <Node>
      {/* Background 2px structural Swiss grid lines */}
      {[-480, -240, 0, 240, 480].map((x) => (
        <Line
          key={`vgrid-${x}`}
          points={[
            [x, -height / 2],
            [x, height / 2],
          ]}
          stroke={THEME.colors.gridLine}
          lineWidth={THEME.stroke.hairline}
          opacity={0.8}
        />
      ))}

      {[-760, -380, 0, 380, 760].map((y) => (
        <Line
          key={`hgrid-${y}`}
          points={[
            [-width / 2, y],
            [width / 2, y],
          ]}
          stroke={THEME.colors.gridLine}
          lineWidth={THEME.stroke.hairline}
          opacity={0.8}
        />
      ))}

      {/* Minimal Top Video Title Only */}
      <Rect
        x={0}
        y={headerY + 15}
        width={safeW}
        height={50}
        layout
        direction={'row'}
        justifyContent={'start'}
        alignItems={'center'}
      >
        <Txt
          text={category}
          fontFamily={THEME.fonts.data}
          fontSize={30}
          fontWeight={700}
          fill={THEME.colors.ink}
          letterSpacing={1.5}
        />
      </Rect>

      {/* Editorial Pill Highlight Subtitle Bar (Lower-Third Zone y = 655) */}
      <Rect
        x={0}
        y={655}
        layout
        direction={'row'}
        alignItems={'center'}
        justifyContent={'center'}
        gap={0}
        padding={[18, 30]}
        radius={14}
        fill={THEME.colors.surface}
        stroke={THEME.colors.ink}
        lineWidth={3.5}
        opacity={() => (getActiveChunk() ? 1 : 0)}
        scale={1.0}
      >
        {[0, 1, 2, 3, 4].map((slotIdx) => (
          <Rect
            key={`sub-slot-${slotIdx}`}
            layout
            padding={() => {
              const chunk = getActiveChunk();
              return chunk && slotIdx < chunk.words.length ? [9, 14] : [0, 0];
            }}
            margin={() => {
              const chunk = getActiveChunk();
              return chunk && slotIdx < chunk.words.length - 1
                ? [0, 11, 0, 0]
                : [0, 0, 0, 0];
            }}
            radius={8}
            fill={() =>
              isWordActive(slotIdx) ? THEME.colors.accent : 'rgba(0,0,0,0)'
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
              fontFamily={THEME.fonts.body}
              fontSize={() => {
                const chunk = getActiveChunk();
                return chunk && slotIdx < chunk.words.length ? 44 : 0;
              }}
              fontWeight={700}
              fill={() =>
                isWordActive(slotIdx)
                  ? THEME.colors.surface
                  : isWordSpoken(slotIdx)
                  ? THEME.colors.ink
                  : THEME.colors.secondaryInk
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

      {/* Minimal Bottom Source Only */}
      <Rect
        x={0}
        y={footerY - 15}
        width={safeW}
        height={45}
        layout
        direction={'row'}
        justifyContent={'start'}
        alignItems={'center'}
      >
        <Txt
          text={footerLeft}
          fontFamily={THEME.fonts.data}
          fontSize={24}
          fontWeight={600}
          fill={THEME.colors.secondaryInk}
          letterSpacing={0.8}
        />
      </Rect>
    </Node>
  );
}

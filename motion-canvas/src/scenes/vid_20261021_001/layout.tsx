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

  // Map figure ("FIG. 01...", "FIG. 02...", etc.) to scene start offset
  const sceneIdx = figure.includes('02')
    ? 1
    : figure.includes('03')
    ? 2
    : figure.includes('04')
    ? 3
    : figure.includes('05')
    ? 4
    : 0;
  const sceneStart = TIMINGS.scenes[sceneIdx]?.start ?? 0;

  const getActiveChunk = () => {
    const gt = sceneStart + time();
    return TIMINGS.subtitleChunks.find((c) => gt >= c.start - 0.04 && gt <= c.end);
  };

  const isWordActive = (slotIdx: number) => {
    const chunk = getActiveChunk();
    if (!chunk || slotIdx >= chunk.words.length) return false;
    const gt = sceneStart + time();
    const w = chunk.words[slotIdx];
    const nextW = chunk.words[slotIdx + 1];
    const endBound = nextW ? nextW.start : w.end + 0.14;
    return gt >= w.start - 0.03 && gt < endBound;
  };

  const isWordSpoken = (slotIdx: number) => {
    const chunk = getActiveChunk();
    if (!chunk || slotIdx >= chunk.words.length) return false;
    const gt = sceneStart + time();
    return gt >= chunk.words[slotIdx].start - 0.03;
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
        gap={10}
        padding={[14, 28]}
        fill={THEME.colors.surface}
        stroke={THEME.colors.ink}
        lineWidth={3}
        opacity={() => (getActiveChunk() ? 1 : 0)}
        scale={() => {
          const chunk = getActiveChunk();
          if (!chunk) return 0.96;
          const gt = sceneStart + time();
          const age = Math.max(0, gt - chunk.start);
          return age < 0.08 ? 0.96 + (age / 0.08) * 0.04 : 1.0;
        }}
      >
        {[0, 1, 2, 3, 4].map((slotIdx) => (
          <Rect
            key={`sub-slot-${slotIdx}`}
            layout
            padding={() => {
              const chunk = getActiveChunk();
              if (!chunk || slotIdx >= chunk.words.length) return [0, 0];
              return isWordActive(slotIdx) ? [6, 14] : [6, 4];
            }}
            fill={() =>
              isWordActive(slotIdx) ? THEME.colors.accent : 'rgba(0,0,0,0)'
            }
            scale={() => (isWordActive(slotIdx) ? 1.05 : 1.0)}
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
                return chunk && slotIdx < chunk.words.length ? 36 : 0;
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

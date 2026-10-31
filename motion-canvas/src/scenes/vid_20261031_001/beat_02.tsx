import { Line, makeScene2D, Node, Rect, Txt } from '@motion-canvas/2d';
import {
  all,
  createRef,
  createSignal,
  easeOutExpo,
  useThread,
} from '@motion-canvas/core';
import {
  COLORS,
  FONTS,
  getAssets,
  getTypo,
  isWidescreen,
  setupBaseStage,
} from './layout';
import {
  finishSceneAt,
  focalScale,
  SCENE_TIMINGS,
  waitUntilSceneTime,
} from './timings';

const PALETTE = {
  crimson: '#D92D20',
  crimsonBg: '#FEE4E2',
  emerald: COLORS.compliantGreen,
  muted: '#334155',
  mutedBg: '#F2F4F7',
  amber: COLORS.goldAccent,
  amberBg: '#FEF0C7',
  cyan: '#0284C7',
  cyanBg: '#E0F2FE',
  surface: COLORS.surface,
  ink: COLORS.ink,
};

export default makeScene2D(function* (view) {
  const time = useThread().time;
  const t0 = time();

  // Setup Swiss Base Stage (Grid lines, section indicator, subtitle pill)
  setupBaseStage(view, 'KNP? // 02: CUMA 3% DI PASAR');

  const wide = isWidescreen(view);
  const typo = getTypo(wide);
  const assets = getAssets(wide);

  // Dual-aspect Chart Baseline & Spacing
  const headerY = wide ? -350 : -640;
  const baseY = wide ? 175 : 240;
  const colSpan = wide ? 680 : 460;

  const leftX = wide ? -460 : -310;
  const midX = 0;
  const rightX = wide ? 460 : 310;
  const barWidth = wide ? 220 : 180;

  const maxChartH = wide ? 340 : 420;
  const bar2MaxH = maxChartH * 0.97;
  const bar3MaxH = Math.max(maxChartH * 0.03, 20);

  // Animation signals
  const focalId = createSignal(0);
  const baselineEnd = createSignal(0);
  const headerOpacity = createSignal(0);

  // Pillar 1: Market Cap Rp1.500T
  const pillar1Opacity = createSignal(0);
  const bar1H = createSignal(0);
  const val1 = createSignal(0);

  // Pillar 2: 97% Locked
  const pillar2Opacity = createSignal(0);
  const bar2H = createSignal(0);
  const val2 = createSignal(0);

  // Pillar 3: 3% Free Float
  const pillar3Opacity = createSignal(0);
  const bar3H = createSignal(0);
  const val3 = createSignal(0);

  const camera = createRef<Node>();

  view.add(
    <Node ref={camera}>
      {/* ===== HEADER TITLE BLOCK (Eyebrow pill removed) ===== */}
      <Rect
        x={0}
        y={headerY}
        opacity={headerOpacity}
        layout
        direction="column"
        alignItems="center"
      >
        <Txt
          text="97% DIKUNCI SEGELINTIR ORANG"
          fontFamily={FONTS.heading}
          fontSize={wide ? 36 : 34}
          fontWeight={800}
          fill={PALETTE.ink}
        />
      </Rect>

      {/* ===== QUANTITATIVE CHART BASELINE ===== */}
      <Line
        points={[
          [-colSpan, baseY],
          [colSpan, baseY],
        ]}
        stroke={PALETTE.ink}
        lineWidth={assets.strokePrimary}
        lineCap="round"
        end={baselineEnd}
      />

      {/* ===== PILLAR 1: NILAI PERUSAHAAN (Rp1.500T) ===== */}
      <Node scale={() => focalScale(focalId, 1, () => 1.0, time)}>
        {/* Growing Ink Bar */}
        <Rect
          x={leftX}
          y={baseY}
          offset={[0, 1]}
          width={barWidth}
          height={() => bar1H()}
          fill={PALETTE.ink}
          opacity={pillar1Opacity}
          radius={[8, 8, 0, 0]}
        />

        {/* Top Callout Pill */}
        <Rect
          x={leftX}
          y={() => baseY - bar1H() - (wide ? 78 : 84)}
          opacity={pillar1Opacity}
          layout
          padding={wide ? [6, 12] : [8, 14]}
          fill={PALETTE.cyanBg}
          stroke={PALETTE.cyan}
          lineWidth={2}
          radius={6}
        >
          <Txt
            text="KALAHKAN BCA"
            fontFamily={FONTS.data}
            fontSize={wide ? 18 : 18}
            fontWeight={700}
            fill={PALETTE.cyan}
          />
        </Rect>

        {/* Live Value Counter Above Bar */}
        <Txt
          x={leftX}
          y={() => baseY - bar1H() - (wide ? 34 : 36)}
          text={() => `Rp${Math.round(val1())}T`}
          fontFamily={FONTS.data}
          fontSize={wide ? 42 : 38}
          fontWeight={700}
          fill={PALETTE.ink}
          opacity={pillar1Opacity}
        />

        {/* Single Bold Bottom Label Below Baseline */}
        <Txt
          x={leftX}
          y={baseY + (wide ? 42 : 46)}
          opacity={pillar1Opacity}
          text="NILAI PERUSAHAAN"
          fontFamily={FONTS.heading}
          fontSize={wide ? 24 : 22}
          fontWeight={800}
          fill={PALETTE.ink}
        />
      </Node>

      {/* ===== PILLAR 2: DIKUNCI 4 ORANG (97%) ===== */}
      <Node scale={() => focalScale(focalId, 2, () => 1.0, time)}>
        {/* Tall Crimson Bar */}
        <Rect
          x={midX}
          y={baseY}
          offset={[0, 1]}
          width={barWidth}
          height={() => bar2H()}
          fill={PALETTE.crimson}
          opacity={pillar2Opacity}
          radius={[8, 8, 0, 0]}
        />

        {/* Top Callout Pill */}
        <Rect
          x={midX}
          y={() => baseY - bar2H() - (wide ? 78 : 84)}
          opacity={pillar2Opacity}
          layout
          padding={wide ? [6, 12] : [8, 14]}
          fill={PALETTE.crimsonBg}
          stroke={PALETTE.crimson}
          lineWidth={2}
          radius={6}
        >
          <Txt
            text="DIKUNCI 4 ORANG"
            fontFamily={FONTS.data}
            fontSize={wide ? 18 : 18}
            fontWeight={700}
            fill={PALETTE.crimson}
          />
        </Rect>

        {/* Live Percentage Counter Above Bar */}
        <Txt
          x={midX}
          y={() => baseY - bar2H() - (wide ? 34 : 36)}
          text={() => `${Math.round(val2())}%`}
          fontFamily={FONTS.data}
          fontSize={wide ? 42 : 38}
          fontWeight={700}
          fill={PALETTE.crimson}
          opacity={pillar2Opacity}
        />

        {/* Single Bold Bottom Label Below Baseline */}
        <Txt
          x={midX}
          y={baseY + (wide ? 42 : 46)}
          opacity={pillar2Opacity}
          text="SAHAM TERKUNCI"
          fontFamily={FONTS.heading}
          fontSize={wide ? 24 : 22}
          fontWeight={800}
          fill={PALETTE.crimson}
        />
      </Node>

      {/* ===== PILLAR 3: BISA DIBELI WARGA (3%) ===== */}
      <Node scale={() => focalScale(focalId, 3, () => 1.0, time)}>
        {/* Tiny Amber Sliver Bar */}
        <Rect
          x={rightX}
          y={baseY}
          offset={[0, 1]}
          width={barWidth}
          height={() => bar3H()}
          fill={PALETTE.amber}
          opacity={pillar3Opacity}
          radius={[6, 6, 0, 0]}
        />

        {/* Top Callout Pill */}
        <Rect
          x={rightX}
          y={() => baseY - bar3H() - (wide ? 78 : 84)}
          opacity={pillar3Opacity}
          layout
          padding={wide ? [6, 12] : [8, 14]}
          fill={PALETTE.amberBg}
          stroke={PALETTE.amber}
          lineWidth={2}
          radius={6}
        >
          <Txt
            text="BISA DIBELI WARGA"
            fontFamily={FONTS.data}
            fontSize={wide ? 18 : 18}
            fontWeight={700}
            fill={PALETTE.amber}
          />
        </Rect>

        {/* Live Value Label Above Sliver Bar */}
        <Txt
          x={rightX}
          y={() => baseY - bar3H() - (wide ? 34 : 36)}
          text={() => `${Math.round(val3())}%`}
          fontFamily={FONTS.data}
          fontSize={wide ? 42 : 38}
          fontWeight={700}
          fill={PALETTE.amber}
          opacity={pillar3Opacity}
        />

        {/* Single Bold Bottom Label Below Baseline */}
        <Txt
          x={rightX}
          y={baseY + (wide ? 42 : 46)}
          opacity={pillar3Opacity}
          text="SAHAM DI PASAR"
          fontFamily={FONTS.heading}
          fontSize={wide ? 24 : 22}
          fontWeight={800}
          fill={PALETTE.amber}
        />
      </Node>
    </Node>
  );

  // --- Choreography Sequence (Scene 02 Total duration: 18.71s) ---
  const sceneStart = SCENE_TIMINGS[1].start; // 20.75
  const sceneDuration = SCENE_TIMINGS[1].duration; // 18.71
  const rel = (absSec: number) => absSec - sceneStart;

  // t = 0.3s (rel): Baseline and header reveal
  yield* waitUntilSceneTime(0.3, t0);
  yield* all(
    baselineEnd(1, 0.5, easeOutExpo),
    headerOpacity(1, 0.4, easeOutExpo),
  );

  // Revealing strictly Left-to-Right:
  // Bar 1 @ 27.5s (rel: 27.5 - 20.75 = 6.75s)
  yield* waitUntilSceneTime(rel(27.5), t0);
  focalId(1);
  yield* all(
    pillar1Opacity(1, 0.2),
    bar1H(maxChartH, 1.2, easeOutExpo),
    val1(1500, 1.2, easeOutExpo),
  );

  // Bar 2 @ 32.5s (rel: 32.5 - 20.75 = 11.75s)
  yield* waitUntilSceneTime(rel(32.5), t0);
  focalId(2);
  yield* all(
    pillar2Opacity(1, 0.2),
    bar2H(bar2MaxH, 1.2, easeOutExpo),
    val2(97, 1.2, easeOutExpo),
  );

  // Bar 3 @ 38.0s (rel: 38.0 - 20.75 = 17.25s)
  yield* waitUntilSceneTime(rel(38.0), t0);
  focalId(3);
  yield* all(
    pillar3Opacity(1, 0.2),
    bar3H(bar3MaxH, 0.45, easeOutExpo),
    val3(3, 0.45, easeOutExpo),
  );

  // Strict Hold-Time: Complete diagram stays visible until 18.71s
  yield* finishSceneAt(sceneDuration, t0);
});

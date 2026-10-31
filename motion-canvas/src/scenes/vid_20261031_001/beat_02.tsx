import { Img, Line, makeScene2D, Node, Rect, Txt } from '@motion-canvas/2d';
import {
  all,
  createRef,
  createSignal,
  easeInOutCubic,
  easeOutCubic,
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
  muted: COLORS.secondaryInk,
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
  const colSpan = wide ? 680 : 475;

  const leftX = wide ? -460 : -320;
  const midX = 0;
  const rightX = wide ? 460 : 320;
  const barWidth = wide ? 220 : 175;

  const maxChartH = wide ? 340 : 460;
  const bar2MaxH = maxChartH * 0.97;
  const bar3MaxH = Math.max(maxChartH * 0.03, 16);

  // Animation signals
  const focalId = createSignal(0);
  const baselineEnd = createSignal(0);
  const headerOpacity = createSignal(0);

  // Pillar 1: Market Cap Rp1.500T
  const pillar1Opacity = createSignal(0);
  const bar1H = createSignal(0);
  const val1 = createSignal(0);
  const bcaPillOpacity = createSignal(0);
  const bcaPillScale = createSignal(0.85);

  // Pillar 2: 97% Locked
  const pillar2Opacity = createSignal(0);
  const bar2H = createSignal(0);
  const val2 = createSignal(0);
  const whaleBadgeOpacity = createSignal(0);
  const whaleBadgeScale = createSignal(0.85);
  const lockedPillOpacity = createSignal(0);

  // Pillar 3: 3% Free Float + Caliper
  const caliperEnd = createSignal(0);
  const pillar3Opacity = createSignal(0);
  const bar3H = createSignal(0);
  const val3 = createSignal(0);
  const warningBadgeOpacity = createSignal(0);
  const warningBadgeScale = createSignal(0.85);

  const camera = createRef<Node>();

  view.add(
    <Node ref={camera}>
      {/* ===== HEADER TITLE BLOCK ===== */}
      <Rect
        x={0}
        y={headerY}
        opacity={headerOpacity}
        layout
        direction="column"
        alignItems="center"
        gap={wide ? 8 : 10}
      >
        <Rect
          layout
          padding={wide ? [6, 16] : [8, 18]}
          fill={PALETTE.amber}
          radius={6}
        >
          <Txt
            text="ILUSI SAHAM RP 1.500 TRILIUN // DATA BEI"
            fontFamily={FONTS.data}
            fontSize={wide ? 18 : 20}
            fontWeight={700}
            fill={PALETTE.surface}
            letterSpacing={1.2}
          />
        </Rect>
        <Txt
          text="97% DIKUNCI SEGELINTIR ORANG"
          fontFamily={FONTS.heading}
          fontSize={wide ? 34 : 34}
          fontWeight={700}
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
        {/* Growing Slate Bar */}
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

        {/* Live Value Counter Above Bar */}
        <Txt
          x={leftX}
          y={() => baseY - bar1H() - (wide ? 34 : 36)}
          text={() => `Rp${Math.round(val1())}T`}
          fontFamily={FONTS.data}
          fontSize={wide ? 42 : 40}
          fontWeight={700}
          fill={PALETTE.ink}
          opacity={pillar1Opacity}
        />

        {/* Top Callout Pill: Lebih Mahal Dari Bank BCA */}
        <Rect
          x={leftX}
          y={() => baseY - bar1H() - (wide ? 76 : 82)}
          opacity={bcaPillOpacity}
          scale={bcaPillScale}
          layout
          padding={wide ? [6, 12] : [8, 14]}
          fill={PALETTE.cyanBg}
          stroke={PALETTE.cyan}
          lineWidth={2}
          radius={6}
        >
          <Txt
            text="LEBIH MAHAL DARI BANK BCA"
            fontFamily={FONTS.data}
            fontSize={wide ? 18 : 20}
            fontWeight={700}
            fill={PALETTE.cyan}
          />
        </Rect>

        {/* Bottom Label & Meta Below Baseline */}
        <Rect
          x={leftX}
          y={baseY + (wide ? 58 : 68)}
          opacity={pillar1Opacity}
          layout
          direction="column"
          alignItems="center"
          gap={wide ? 6 : 8}
        >
          <Txt
            text="KAPITALISASI PASAR"
            fontFamily={FONTS.heading}
            fontSize={wide ? 24 : 24}
            fontWeight={700}
            fill={PALETTE.ink}
          />
          <Rect
            layout
            padding={wide ? [4, 10] : [6, 12]}
            fill={PALETTE.mutedBg}
            radius={4}
          >
            <Txt
              text="NOMOR 1 DI BURSA RI"
              fontFamily={FONTS.data}
              fontSize={wide ? 18 : 20}
              fontWeight={700}
              fill={PALETTE.muted}
            />
          </Rect>
          <Txt
            text="VALUASI TERBESAR"
            fontFamily={FONTS.data}
            fontSize={wide ? 18 : 20}
            fontWeight={600}
            fill={PALETTE.muted}
          />
        </Rect>
      </Node>

      {/* ===== PILLAR 2: DIKUNCI 4 PEMILIK (97%) ===== */}
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

        {/* Whale Lock Icon Inside Bar */}
        <Rect
          x={midX}
          y={() => baseY - bar2H() / 2}
          opacity={whaleBadgeOpacity}
          scale={whaleBadgeScale}
          layout
          direction="column"
          alignItems="center"
          gap={6}
        >
          <Img
            src={'/assets/vid_20261031_001/whale_lock_icon.png'}
            width={wide ? 64 : 70}
            height={wide ? 64 : 70}
          />
        </Rect>

        {/* Live Percentage Counter Above Bar */}
        <Txt
          x={midX}
          y={() => baseY - bar2H() - (wide ? 34 : 36)}
          text={() => `${Math.round(val2())}%`}
          fontFamily={FONTS.data}
          fontSize={wide ? 42 : 40}
          fontWeight={700}
          fill={PALETTE.crimson}
          opacity={pillar2Opacity}
        />

        {/* Top Callout Pill: Tidak Dijual Ke Publik */}
        <Rect
          x={midX}
          y={() => baseY - bar2H() - (wide ? 76 : 82)}
          opacity={lockedPillOpacity}
          layout
          padding={wide ? [6, 12] : [8, 14]}
          fill={PALETTE.crimsonBg}
          stroke={PALETTE.crimson}
          lineWidth={2}
          radius={6}
        >
          <Txt
            text="TIDAK DIJUAL KE PUBLIK"
            fontFamily={FONTS.data}
            fontSize={wide ? 18 : 20}
            fontWeight={700}
            fill={PALETTE.crimson}
          />
        </Rect>

        {/* Bottom Label & Meta Below Baseline */}
        <Rect
          x={midX}
          y={baseY + (wide ? 58 : 68)}
          opacity={pillar2Opacity}
          layout
          direction="column"
          alignItems="center"
          gap={wide ? 6 : 8}
        >
          <Txt
            text="DIKUNCI 4 PEMILIK"
            fontFamily={FONTS.heading}
            fontSize={wide ? 24 : 24}
            fontWeight={700}
            fill={PALETTE.crimson}
          />
          <Rect
            layout
            padding={wide ? [4, 10] : [6, 12]}
            fill={PALETTE.crimson}
            radius={4}
          >
            <Txt
              text="97% TERKUNCI RAPAT"
              fontFamily={FONTS.data}
              fontSize={wide ? 18 : 20}
              fontWeight={700}
              fill={PALETTE.surface}
            />
          </Rect>
          <Txt
            text="DIPEGANG 4 ENTITAS"
            fontFamily={FONTS.data}
            fontSize={wide ? 18 : 20}
            fontWeight={600}
            fill={PALETTE.muted}
          />
        </Rect>
      </Node>

      {/* ===== PILLAR 3: SAHAM DI PASAR BEBAS (3%) + CALIPER ===== */}
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

        {/* Live Value Label Above Sliver Bar */}
        <Txt
          x={rightX}
          y={() => baseY - bar3H() - (wide ? 32 : 34)}
          text={() => `${Math.round(val3())}%`}
          fontFamily={FONTS.data}
          fontSize={wide ? 42 : 40}
          fontWeight={700}
          fill={PALETTE.amber}
          opacity={pillar3Opacity}
        />

        {/* Bottom Label & Meta Below Baseline */}
        <Rect
          x={rightX}
          y={baseY + (wide ? 58 : 68)}
          opacity={pillar3Opacity}
          layout
          direction="column"
          alignItems="center"
          gap={wide ? 6 : 8}
        >
          <Txt
            text="SAHAM PUBLIK"
            fontFamily={FONTS.heading}
            fontSize={wide ? 24 : 24}
            fontWeight={700}
            fill={PALETTE.amber}
          />
          <Rect
            layout
            padding={wide ? [4, 10] : [6, 12]}
            fill={PALETTE.amber}
            radius={4}
          >
            <Txt
              text="FREE FLOAT: CUMA 3%"
              fontFamily={FONTS.data}
              fontSize={wide ? 18 : 20}
              fontWeight={700}
              fill={PALETTE.surface}
            />
          </Rect>
          <Txt
            text="SANGAT TIPIS & RAWAN"
            fontFamily={FONTS.data}
            fontSize={wide ? 18 : 20}
            fontWeight={600}
            fill={PALETTE.muted}
          />
        </Rect>
      </Node>

      {/* ===== CHASM CALIPER & FLOATING WARNING CARD ===== */}
      {/* Top Reference Projection Line from Pillar 2 (97%) to Pillar 3 */}
      <Line
        points={[
          [midX + barWidth / 2, baseY - bar2MaxH],
          [rightX, baseY - bar2MaxH],
        ]}
        stroke={PALETTE.amber}
        lineWidth={3}
        lineDash={[8, 8]}
        end={caliperEnd}
      />

      {/* Vertical Caliper Bracket Measuring the 94% Gap */}
      <Line
        points={[
          [rightX + (wide ? 130 : 100), baseY - bar2MaxH + 10],
          [rightX + (wide ? 130 : 100), baseY - 24],
        ]}
        stroke={PALETTE.amber}
        lineWidth={4}
        startArrow
        endArrow
        arrowSize={14}
        end={caliperEnd}
      />

      {/* Floating Caliper Warning Card with Slow Sinusoidal Wobble */}
      <Rect
        x={rightX}
        y={baseY - bar2MaxH * 0.52}
        opacity={warningBadgeOpacity}
        scale={() => focalScale(focalId, 3, warningBadgeScale, time)}
        layout
        direction="column"
        alignItems="center"
        padding={wide ? [14, 20] : [16, 20]}
        gap={6}
        fill={PALETTE.surface}
        stroke={PALETTE.amber}
        lineWidth={3}
        radius={10}
      >
        <Txt
          text="CUMA 3% BISA DIBELI WARGA"
          fontFamily={FONTS.heading}
          fontSize={wide ? 24 : 22}
          fontWeight={700}
          fill={PALETTE.amber}
        />
        <Txt
          text="HARGA GAMPANG DIGORENG"
          fontFamily={FONTS.data}
          fontSize={wide ? 18 : 20}
          fontWeight={700}
          fill={PALETTE.crimson}
        />
      </Rect>
    </Node>
  );

  // --- Choreography Sequence (Scene 02 Total duration: 18.71s) ---
  const sceneStart = SCENE_TIMINGS[1].start; // 20.75
  const sceneDuration = SCENE_TIMINGS[1].duration; // 18.71
  const rel = (absSec: number) => absSec - sceneStart;

  // t = 0.3s (rel): Baseline and header reveal
  yield* waitUntilSceneTime(0.3, t0);
  yield* all(
    baselineEnd(1, 0.6, easeOutExpo),
    headerOpacity(1, 0.4, easeOutExpo),
  );

  // t = 1.5s (rel): Stub for Pillar 1 appears as narrator introduces market problem
  yield* waitUntilSceneTime(1.5, t0);
  yield* all(
    pillar1Opacity(0.6, 0.4, easeOutExpo),
    bar1H(20, 0.4, easeOutExpo),
    val1(150, 0.4, easeOutExpo),
  );

  // t = 6.39s (rel 27.14s): Narrator: "seribu lima ratus triliun rupiah" (~27.54s spoken)
  yield* waitUntilSceneTime(rel(27.14), t0);
  focalId(1);
  yield* all(
    pillar1Opacity(1, 0.2),
    bar1H(maxChartH, 1.4, easeOutExpo),
    val1(1500, 1.4, easeOutExpo),
  );

  // t = 9.27s (rel 30.02s): Narrator: "lebih mahal dari Bank BCA" (~30.20s - 30.74s spoken)
  yield* waitUntilSceneTime(rel(30.02), t0);
  yield* all(
    bcaPillOpacity(1, 0.2),
    bcaPillScale(1.15, 0.25, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
  );

  // t = 11.31s (rel 32.06s): Narrator: "Tapi ternyata, 97% sahamnya dikunci rapat" (~32.54s)
  yield* waitUntilSceneTime(rel(32.06), t0);
  focalId(2);
  yield* all(
    pillar2Opacity(1, 0.2),
    bar2H(bar2MaxH, 1.2, easeOutExpo),
    val2(97, 1.2, easeOutExpo),
    lockedPillOpacity(1, 0.4),
  );

  // t = 13.00s (rel 33.75s): Whale lock badge pops in as "4 pemilik aslinya saja" spoken
  yield* waitUntilSceneTime(rel(33.75), t0);
  yield* all(
    whaleBadgeOpacity(1, 0.2),
    whaleBadgeScale(1.15, 0.25, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
  );

  // t = 15.89s (rel 36.64s): Narrator: "yang beneran beredar di pasar..."
  yield* waitUntilSceneTime(rel(36.64), t0);
  focalId(3);
  yield* caliperEnd(1, 0.6, easeOutExpo);

  // t = 17.10s (rel 37.85s): Narrator: "cuma 3%!" (~38.50s spoken)
  yield* waitUntilSceneTime(rel(37.85), t0);
  yield* all(
    pillar3Opacity(1, 0.2),
    bar3H(bar3MaxH, 0.4, easeOutExpo),
    val3(3, 0.4, easeOutExpo),
    warningBadgeOpacity(1, 0.2),
    warningBadgeScale(1.15, 0.2, easeOutExpo).to(1.0, 0.15, easeInOutCubic),
  );

  // Strict Hold-Time: Complete diagram stays visible until 18.71s (hold >= 1.5s)
  yield* finishSceneAt(sceneDuration, t0);
});

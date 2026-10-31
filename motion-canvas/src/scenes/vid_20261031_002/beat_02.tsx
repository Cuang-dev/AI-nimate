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
  BEAT_LABELS,
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
  emeraldBg: '#D1FADF',
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
  setupBaseStage(view, BEAT_LABELS[1]);

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
  const bar1MaxH = maxChartH * 0.95; // 95% height for Modal Dibakar
  const bar2MaxH = maxChartH * 0.82; // 82% height for Janji Pertumbuhan
  const bar3MaxH = Math.max(maxChartH * 0.05, 18); // 5% sliver for Untung Nyata

  // Animation signals
  const focalId = createSignal(0);
  const baselineEnd = createSignal(0);
  const headerOpacity = createSignal(0);

  // Pillar 1: Modal Dibakar (Crimson, 95%)
  const pillar1Opacity = createSignal(0);
  const bar1H = createSignal(0);
  const val1 = createSignal(0);
  const furnaceIconOpacity = createSignal(0);
  const furnaceIconScale = createSignal(0.85);
  const burnPillOpacity = createSignal(0);
  const burnPillScale = createSignal(0.85);

  // Pillar 2: Janji Pertumbuhan (Amber, 82%)
  const pillar2Opacity = createSignal(0);
  const bar2H = createSignal(0);
  const val2 = createSignal(0);
  const storyPillOpacity = createSignal(0);
  const storyPillScale = createSignal(0.85);

  // Pillar 3: Untung Bersih Nyata (Cyan, 5%) + Caliper
  const caliperEnd = createSignal(0);
  const pillar3Opacity = createSignal(0);
  const bar3H = createSignal(0);
  const warningCardOpacity = createSignal(0);
  const warningCardScale = createSignal(0.85);

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
            text="ANATOMI VALUASI SEMU // JANJI VS UNTUNG"
            fontFamily={FONTS.data}
            fontSize={wide ? 18 : 20}
            fontWeight={700}
            fill={PALETTE.surface}
            letterSpacing={1.2}
          />
        </Rect>
        <Txt
          text="DIBANGUN DARI BAKAR UANG TRILIUNAN"
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

      {/* ===== PILLAR 1: MODAL DIBAKAR (Rp1.000T+) ===== */}
      <Node scale={() => focalScale(focalId, 1, () => 1.0, time)}>
        {/* Towering Crimson Bar */}
        <Rect
          x={leftX}
          y={baseY}
          offset={[0, 1]}
          width={barWidth}
          height={() => bar1H()}
          fill={PALETTE.crimson}
          opacity={pillar1Opacity}
          radius={[8, 8, 0, 0]}
        />

        {/* Furnace Icon Inside Bar */}
        <Rect
          x={leftX}
          y={() => baseY - bar1H() / 2}
          opacity={furnaceIconOpacity}
          scale={furnaceIconScale}
          layout
          direction="column"
          alignItems="center"
        >
          <Img
            src={'/assets/vid_20261031_002/cash_burn_furnace_icon.png'}
            width={wide ? 64 : 70}
            height={wide ? 64 : 70}
          />
        </Rect>

        {/* Live Value Counter Above Bar */}
        <Txt
          x={leftX}
          y={() => baseY - bar1H() - (wide ? 34 : 36)}
          text={() => `Rp${Math.round(val1()).toLocaleString('id-ID')}T+`}
          fontFamily={FONTS.data}
          fontSize={wide ? 42 : 40}
          fontWeight={700}
          fill={PALETTE.crimson}
          opacity={pillar1Opacity}
        />

        {/* Top Callout Pill: DISKON & MESIN AI */}
        <Rect
          x={leftX}
          y={() => baseY - bar1H() - (wide ? 76 : 82)}
          opacity={burnPillOpacity}
          scale={burnPillScale}
          layout
          padding={wide ? [6, 12] : [8, 14]}
          fill={PALETTE.crimsonBg}
          stroke={PALETTE.crimson}
          lineWidth={2}
          radius={6}
        >
          <Txt
            text="DISKON & MESIN AI"
            fontFamily={FONTS.data}
            fontSize={wide ? 18 : 20}
            fontWeight={700}
            fill={PALETTE.crimson}
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
            text="MODAL DIBAKAR"
            fontFamily={FONTS.heading}
            fontSize={wide ? 24 : 24}
            fontWeight={700}
            fill={PALETTE.crimson}
          />
          <Rect
            layout
            padding={wide ? [4, 10] : [6, 12]}
            fill={PALETTE.crimsonBg}
            radius={4}
          >
            <Txt
              text="SUBSIDI & SERVER"
              fontFamily={FONTS.data}
              fontSize={wide ? 18 : 20}
              fontWeight={700}
              fill={PALETTE.crimson}
            />
          </Rect>
          <Txt
            text="UANG DIBAKAR"
            fontFamily={FONTS.data}
            fontSize={wide ? 18 : 20}
            fontWeight={600}
            fill={PALETTE.muted}
          />
        </Rect>
      </Node>

      {/* ===== PILLAR 2: JANJI PERTUMBUHAN (100% HYPE) ===== */}
      <Node scale={() => focalScale(focalId, 2, () => 1.0, time)}>
        {/* Tall Amber Bar */}
        <Rect
          x={midX}
          y={baseY}
          offset={[0, 1]}
          width={barWidth}
          height={() => bar2H()}
          fill={PALETTE.amber}
          opacity={pillar2Opacity}
          radius={[8, 8, 0, 0]}
        />

        {/* Live Percentage Counter Above Bar */}
        <Txt
          x={midX}
          y={() => baseY - bar2H() - (wide ? 34 : 36)}
          text={() => `${Math.round(val2())}% HYPE`}
          fontFamily={FONTS.data}
          fontSize={wide ? 42 : 40}
          fontWeight={700}
          fill={PALETTE.amber}
          opacity={pillar2Opacity}
        />

        {/* Top Callout Pill: DINILAI DARI CERITA */}
        <Rect
          x={midX}
          y={() => baseY - bar2H() - (wide ? 76 : 82)}
          opacity={storyPillOpacity}
          scale={storyPillScale}
          layout
          padding={wide ? [6, 12] : [8, 14]}
          fill={PALETTE.amberBg}
          stroke={PALETTE.amber}
          lineWidth={2}
          radius={6}
        >
          <Txt
            text="DINILAI DARI CERITA"
            fontFamily={FONTS.data}
            fontSize={wide ? 18 : 20}
            fontWeight={700}
            fill={PALETTE.amber}
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
            text="HARGA SAHAM"
            fontFamily={FONTS.heading}
            fontSize={wide ? 24 : 24}
            fontWeight={700}
            fill={PALETTE.amber}
          />
          <Rect
            layout
            padding={wide ? [4, 10] : [6, 12]}
            fill={PALETTE.amberBg}
            radius={4}
          >
            <Txt
              text="JANJI MASA DEPAN"
              fontFamily={FONTS.data}
              fontSize={wide ? 18 : 20}
              fontWeight={700}
              fill={PALETTE.amber}
            />
          </Rect>
          <Txt
            text="JANJI PERTUMBUHAN"
            fontFamily={FONTS.data}
            fontSize={wide ? 18 : 20}
            fontWeight={600}
            fill={PALETTE.muted}
          />
        </Rect>
      </Node>

      {/* ===== PILLAR 3: UNTUNG BERSIH NYATA (~0%) + CALIPER ===== */}
      <Node scale={() => focalScale(focalId, 3, () => 1.0, time)}>
        {/* Tiny Sliver Bar */}
        <Rect
          x={rightX}
          y={baseY}
          offset={[0, 1]}
          width={barWidth}
          height={() => bar3H()}
          fill={PALETTE.cyan}
          opacity={pillar3Opacity}
          radius={[6, 6, 0, 0]}
        />

        {/* Live Value Label Above Sliver Bar */}
        <Txt
          x={rightX}
          y={() => baseY - bar3H() - (wide ? 32 : 34)}
          text="~0%"
          fontFamily={FONTS.data}
          fontSize={wide ? 42 : 40}
          fontWeight={700}
          fill={PALETTE.cyan}
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
            text="LABA BERSIH"
            fontFamily={FONTS.heading}
            fontSize={wide ? 24 : 24}
            fontWeight={700}
            fill={PALETTE.ink}
          />
          <Rect
            layout
            padding={wide ? [4, 10] : [6, 12]}
            fill={PALETTE.crimsonBg}
            radius={4}
          >
            <Txt
              text="MINUS TRILIUNAN"
              fontFamily={FONTS.data}
              fontSize={wide ? 18 : 20}
              fontWeight={700}
              fill={PALETTE.crimson}
            />
          </Rect>
          <Txt
            text="UNTUNG BERSIH NYATA"
            fontFamily={FONTS.data}
            fontSize={wide ? 18 : 20}
            fontWeight={600}
            fill={PALETTE.muted}
          />
        </Rect>
      </Node>

      {/* ===== CHASM CALIPER & FLOATING WARNING CARD ===== */}
      {/* Top Reference Projection Line from Pillar 2 to Pillar 3 */}
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

      {/* Vertical Caliper Bracket Measuring the Gap */}
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

      {/* Floating Caliper Warning Card with Slow Sinusoidal Breathe */}
      <Rect
        x={rightX}
        y={baseY - bar2MaxH * 0.52}
        opacity={warningCardOpacity}
        scale={() => focalScale(focalId, 3, warningCardScale, time)}
        layout
        direction="column"
        alignItems="center"
        padding={wide ? [14, 20] : [16, 20]}
        gap={6}
        fill={PALETTE.surface}
        stroke={PALETTE.crimson}
        lineWidth={3}
        radius={10}
      >
        <Txt
          text="UNTUNG ASLI TIPIS / RUGI"
          fontFamily={FONTS.heading}
          fontSize={wide ? 24 : 22}
          fontWeight={700}
          fill={PALETTE.crimson}
        />
        <Txt
          text="UANG HABIS SEBELUM BALIK MODAL"
          fontFamily={FONTS.data}
          fontSize={wide ? 18 : 20}
          fontWeight={700}
          fill={PALETTE.crimson}
        />
      </Rect>
    </Node>
  );

  // --- Choreography Sequence (Scene 02 Total duration: 16.85s) ---
  const sceneStart = SCENE_TIMINGS[1].start; // 14.231
  const sceneDuration = SCENE_TIMINGS[1].duration; // 16.850
  const rel = (absSec: number) => absSec - sceneStart;

  // t = 0.3s (rel): Baseline and header reveal
  yield* waitUntilSceneTime(0.3, t0);
  yield* all(
    baselineEnd(1, 0.6, easeOutExpo),
    headerOpacity(1, 0.4, easeOutExpo),
  );

  // t = 17.51s (rel ~3.28s): Narrator: "bukan dari untung nyatanya" (~17.51s - 18.21s)
  yield* waitUntilSceneTime(rel(17.51), t0);
  focalId(3);
  yield* all(
    pillar3Opacity(1, 0.3, easeOutExpo),
    bar3H(bar3MaxH, 0.5, easeOutExpo),
    caliperEnd(1, 0.6, easeOutExpo),
    warningCardOpacity(1, 0.3, easeOutExpo),
    warningCardScale(1.15, 0.25, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
  );

  // t = 19.80s (rel ~5.57s): Narrator: "seberapa heboh janjinya" (~19.77s - 20.33s)
  yield* waitUntilSceneTime(rel(19.80), t0);
  focalId(2);
  yield* all(
    pillar2Opacity(1, 0.3, easeOutExpo),
    bar2H(bar2MaxH, 1.2, easeOutExpo),
    val2(100, 1.2, easeOutExpo),
    storyPillOpacity(1, 0.4, easeOutExpo),
    storyPillScale(1.15, 0.25, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
  );

  // t = 21.97s (rel ~7.74s): Narrator: "mereka bakar uang triliunan" (~21.97s - 23.31s)
  yield* waitUntilSceneTime(rel(21.97), t0);
  focalId(1);
  yield* all(
    pillar1Opacity(1, 0.3, easeOutExpo),
    bar1H(bar1MaxH, 1.2, easeOutExpo),
    val1(1000, 1.2, easeOutExpo),
    furnaceIconOpacity(1, 0.3, easeOutExpo),
    furnaceIconScale(1.15, 0.25, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
  );

  // t = 23.79s (rel ~9.56s): Narrator: "buat kasih diskon dan gratis ongkir" (~23.79s - 25.05s)
  yield* waitUntilSceneTime(rel(23.79), t0);
  yield* all(
    burnPillOpacity(1, 0.3, easeOutExpo),
    burnPillScale(1.15, 0.25, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
  );

  // t = 27.20s (rel ~12.97s): Narrator: "bakar ribuan triliun" (~27.27s - 28.47s)
  yield* waitUntilSceneTime(rel(27.20), t0);
  yield* all(
    val1(1500, 0.6, easeOutCubic),
    burnPillScale(1.12, 0.2, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
  );

  // t = 29.09s (rel ~14.86s): Narrator: "buat borong mesin akal imitasi" (~29.09s - 30.21s)
  yield* waitUntilSceneTime(rel(29.09), t0);
  focalId(1);
  yield* all(
    furnaceIconScale(1.2, 0.2, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
  );

  // Strict Hold-Time: Diagram stays visible until 16.85s (hold >= 1.9s)
  yield* finishSceneAt(sceneDuration, t0);
});

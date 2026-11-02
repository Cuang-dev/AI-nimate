import { Img, Line, makeScene2D, Node, Rect, Txt } from '@motion-canvas/2d';
import {
  all,
  createRef,
  createSignal,
  easeInOutCubic,
  easeOutExpo,
  useThread,
} from '@motion-canvas/core';
import {
  BEAT_LABELS,
  FONTS,
  HEADING_FONT,
  PALETTE,
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

export default makeScene2D(function* (view) {
  const time = useThread().time;
  const t0 = time();

  // Setup Swiss Base Stage (Grid lines, watermark, subtitle pill)
  setupBaseStage(view, BEAT_LABELS[1]);

  const wide = isWidescreen(view);
  const typo = getTypo(wide);
  const assets = getAssets(wide);

  // Layout coordinates (Dual-aspect safe zones)
  const headerY = wide ? -340 : -620;
  const baseY = wide ? 220 : 260;
  const colX = wide ? [-380, 0, 380] : [-300, 0, 300];
  const barW = wide ? 240 : 220;
  const yAxisX = wide ? -540 : -425;
  const baselineLeft = wide ? -550 : -435;
  const baselineRight = wide ? 560 : 435;

  // Animation signals
  const focalId = createSignal(0);
  const headerOpacity = createSignal(0);
  const baselineEnd = createSignal(0);

  // Bar 1 (Left): Untung Nyata (~0%)
  const bar1Opacity = createSignal(0);
  const bar1H = createSignal(0);

  // Bar 2 (Middle): Janji Manis (100%)
  const bar2Opacity = createSignal(0);
  const bar2H = createSignal(0);
  const val2 = createSignal(0);

  // Bar 3 (Right): Bakar Uang (Rp1.500T+)
  const bar3Opacity = createSignal(0);
  const bar3H = createSignal(0);
  const val3 = createSignal(100);
  const furnaceOpacity = createSignal(0);
  const furnaceScale = createSignal(1.0);
  const burnPillOpacity = createSignal(0);

  const camera = createRef<Node>();

  view.add(
    <Node ref={camera}>
      {/* ===== HEADER TITLE (Single bold title, no eyebrow clutter) ===== */}
      <Txt
        x={0}
        y={headerY}
        opacity={headerOpacity}
        text="JANJI MANIS VS UNTUNG"
        fontFamily={HEADING_FONT}
        fontSize={wide ? 48 : 52}
        fontWeight={800}
        fill={PALETTE.ink}
      />

      {/* ===== QUANTITATIVE CHART AXES & GRIDLINES ===== */}
      {/* 50% Horizontal Gridline */}
      <Line
        points={[
          [yAxisX, baseY - 230],
          [baselineRight, baseY - 230],
        ]}
        stroke={'#CBD5E1'}
        lineWidth={1.5}
        lineDash={[6, 6]}
        opacity={() => baselineEnd() * 0.75}
      />
      <Txt
        x={yAxisX - 35}
        y={baseY - 230}
        text="50%"
        fontFamily={FONTS.data}
        fontSize={18}
        fontWeight={700}
        fill={PALETTE.muted}
        opacity={() => baselineEnd() * 0.8}
        textAlign="right"
      />

      {/* 100% Horizontal Gridline */}
      <Line
        points={[
          [yAxisX, baseY - 460],
          [baselineRight, baseY - 460],
        ]}
        stroke={'#CBD5E1'}
        lineWidth={1.5}
        lineDash={[6, 6]}
        opacity={() => baselineEnd() * 0.75}
      />
      <Txt
        x={yAxisX - 35}
        y={baseY - 460}
        text="100%"
        fontFamily={FONTS.data}
        fontSize={18}
        fontWeight={700}
        fill={PALETTE.muted}
        opacity={() => baselineEnd() * 0.8}
        textAlign="right"
      />

      {/* Y-Axis Line */}
      <Line
        points={[
          [yAxisX, baseY + 10],
          [yAxisX, baseY - 520],
        ]}
        stroke={PALETTE.ink}
        lineWidth={assets.strokePrimary}
        endArrow
        arrowSize={12}
        end={baselineEnd}
      />

      {/* X-Axis Baseline */}
      <Line
        points={[
          [baselineLeft, baseY],
          [baselineRight, baseY],
        ]}
        stroke={PALETTE.ink}
        lineWidth={assets.strokePrimary}
        endArrow
        arrowSize={12}
        end={baselineEnd}
      />

      {/* ===== BAR 1 (Left): UNTUNG NYATA (~0%) ===== */}
      <Node scale={() => focalScale(focalId, 1, () => 1.0, time)}>
        {/* Sliver Cyan Bar */}
        <Rect
          x={colX[0]}
          y={baseY}
          offset={[0, 1]}
          width={barW}
          height={() => bar1H()}
          fill={PALETTE.cyan}
          opacity={bar1Opacity}
          radius={[6, 6, 0, 0]}
        />

        {/* Value Above Bar */}
        <Txt
          x={colX[0]}
          y={baseY - 65}
          text="~0%"
          fontFamily={HEADING_FONT}
          fontSize={48}
          fontWeight={800}
          fill={PALETTE.cyan}
          opacity={bar1Opacity}
        />

        {/* Pill Above Value */}
        <Rect
          x={colX[0]}
          y={baseY - 135}
          width={210}
          height={50}
          radius={8}
          fill={PALETTE.surface}
          stroke={PALETTE.cyan}
          lineWidth={2}
          opacity={bar1Opacity}
          layout
          justifyContent="center"
          alignItems="center"
        >
          <Txt
            text="RUGI / TIPIS"
            fontFamily={FONTS.data}
            fontSize={20}
            fontWeight={800}
            fill={PALETTE.cyan}
          />
        </Rect>

        {/* Single Label Below Baseline */}
        <Txt
          x={colX[0]}
          y={baseY + 55}
          text="UNTUNG NYATA"
          fontFamily={HEADING_FONT}
          fontSize={28}
          fontWeight={800}
          fill={PALETTE.ink}
          opacity={bar1Opacity}
        />
      </Node>

      {/* ===== BAR 2 (Middle): JANJI MANIS (100%) ===== */}
      <Node scale={() => focalScale(focalId, 2, () => 1.0, time)}>
        {/* Tall Amber Bar */}
        <Rect
          x={colX[1]}
          y={baseY}
          offset={[0, 1]}
          width={barW}
          height={() => bar2H()}
          fill={PALETTE.amber}
          opacity={bar2Opacity}
          radius={[8, 8, 0, 0]}
        />

        {/* Value Above Bar */}
        <Txt
          x={colX[1]}
          y={baseY - 360 - 45}
          text={() => `${Math.round(val2())}%`}
          fontFamily={HEADING_FONT}
          fontSize={48}
          fontWeight={800}
          fill={PALETTE.amber}
          opacity={bar2Opacity}
        />

        {/* Pill Above Value */}
        <Rect
          x={colX[1]}
          y={baseY - 360 - 115}
          width={230}
          height={50}
          radius={8}
          fill={PALETTE.surface}
          stroke={PALETTE.amber}
          lineWidth={2}
          opacity={bar2Opacity}
          layout
          justifyContent="center"
          alignItems="center"
        >
          <Txt
            text="MODAL CERITA"
            fontFamily={FONTS.data}
            fontSize={20}
            fontWeight={800}
            fill={PALETTE.amber}
          />
        </Rect>

        {/* Single Label Below Baseline */}
        <Txt
          x={colX[1]}
          y={baseY + 55}
          text="JANJI MANIS"
          fontFamily={HEADING_FONT}
          fontSize={28}
          fontWeight={800}
          fill={PALETTE.ink}
          opacity={bar2Opacity}
        />
      </Node>

      {/* ===== BAR 3 (Right): UANG DIBAKAR (Rp1.500T+) ===== */}
      <Node scale={() => focalScale(focalId, 3, () => 1.0, time)}>
        {/* Towering Crimson Bar */}
        <Rect
          x={colX[2]}
          y={baseY}
          offset={[0, 1]}
          width={barW}
          height={() => bar3H()}
          fill={PALETTE.crimson}
          opacity={bar3Opacity}
          radius={[8, 8, 0, 0]}
        />

        {/* Furnace Icon Centered Inside Bar */}
        <Img
          src={'/assets/vid_20261031_002/cash_burn_furnace_icon.png'}
          x={colX[2]}
          y={baseY - 230}
          width={84}
          height={84}
          opacity={furnaceOpacity}
          scale={furnaceScale}
        />

        {/* Value Above Bar */}
        <Txt
          x={colX[2]}
          y={baseY - 460 - 45}
          text={() => `Rp${Math.round(val3()).toLocaleString('id-ID')}T+`}
          fontFamily={HEADING_FONT}
          fontSize={48}
          fontWeight={800}
          fill={PALETTE.crimson}
          opacity={bar3Opacity}
        />

        {/* Pill Above Value */}
        <Rect
          x={colX[2]}
          y={baseY - 460 - 115}
          width={230}
          height={50}
          radius={8}
          fill={PALETTE.crimson}
          opacity={burnPillOpacity}
          layout
          justifyContent="center"
          alignItems="center"
        >
          <Txt
            text="DISKON & AI"
            fontFamily={FONTS.data}
            fontSize={20}
            fontWeight={800}
            fill={'#FFFFFF'}
          />
        </Rect>

        {/* Single Label Below Baseline */}
        <Txt
          x={colX[2]}
          y={baseY + 55}
          text="UANG DIBAKAR"
          fontFamily={HEADING_FONT}
          fontSize={28}
          fontWeight={800}
          fill={PALETTE.crimson}
          opacity={bar3Opacity}
        />
      </Node>
    </Node>
  );

  // --- Choreography Sequence (Scene 02 Total duration: 16.85s) ---
  const sceneStart = SCENE_TIMINGS[1].start; // 14.231
  const sceneDuration = SCENE_TIMINGS[1].duration; // 16.850
  const rel = (absSec: number) => absSec - sceneStart;

  // t = 0.3s (rel): Baseline and Header reveal
  yield* waitUntilSceneTime(0.3, t0);
  yield* all(
    baselineEnd(1, 0.5, easeOutExpo),
    headerOpacity(1, 0.4, easeOutExpo),
  );

  // t = 17.20s: Bar 1 reveals FIRST ("bukan dari untung nyatanya")
  yield* waitUntilSceneTime(rel(17.20), t0);
  focalId(1);
  yield* all(
    bar1Opacity(1, 0.3, easeOutExpo),
    bar1H(28, 0.5, easeOutExpo),
  );

  // t = 19.50s: Bar 2 reveals SECOND ("seberapa heboh janjinya")
  yield* waitUntilSceneTime(rel(19.50), t0);
  focalId(2);
  yield* all(
    bar2Opacity(1, 0.3, easeOutExpo),
    bar2H(360, 0.8, easeOutExpo),
    val2(100, 0.8, easeOutExpo),
  );

  // t = 21.80s: Bar 3 reveals THIRD ("bakar uang triliunan")
  yield* waitUntilSceneTime(rel(21.80), t0);
  focalId(3);
  yield* all(
    bar3Opacity(1, 0.3, easeOutExpo),
    bar3H(460, 0.8, easeOutExpo),
    val3(1500, 0.6, easeOutExpo),
    furnaceOpacity(1, 0.4, easeOutExpo),
  );

  // t = 23.79s: Pill above Bar 3 reveals ("diskon")
  yield* waitUntilSceneTime(rel(23.79), t0);
  yield* burnPillOpacity(1, 0.3, easeOutExpo);

  // t = 27.20s: Narrator "bakar ribuan triliun"
  yield* waitUntilSceneTime(rel(27.20), t0);
  yield* furnaceScale(1.2, 0.2, easeOutExpo).to(1.0, 0.2, easeInOutCubic);

  // t = 29.09s: Narrator "buat borong mesin akal imitasi"
  yield* waitUntilSceneTime(rel(29.09), t0);
  yield* furnaceScale(1.2, 0.2, easeOutExpo).to(1.0, 0.2, easeInOutCubic);

  // Strict Hold-Time: Diagram remains fully visible until 16.85s (hold >= 1.9s)
  yield* finishSceneAt(sceneDuration, t0);
});

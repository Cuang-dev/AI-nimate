import { Img, Line, makeScene2D, Node, Rect, Txt } from '@motion-canvas/2d';
import { all, createRef, createSignal, easeInOutCubic, easeOutBack, easeOutExpo, useThread } from '@motion-canvas/core';
import { createEditorialStage, COLORS, PALETTE, FONTS, HEADING_FONT } from './layout';
import { finishSceneAt, focalRotation, focalScale, SCENE_TIMINGS, waitUntilSceneTime } from './timings';

export default makeScene2D(function* (view) {
  const time = useThread().time;
  const t0 = time();
  const sceneStart = SCENE_TIMINGS[4]?.start ?? 214.684;
  const sceneDur = SCENE_TIMINGS[4]?.duration ?? 56.631;

  // Mount responsive Swiss stage
  createEditorialStage(view, 4);

  // Scene state signals
  const focalId = createSignal(1);
  const leftCardOpacity = createSignal(0);
  const leftCardScale = createSignal(0.92);

  const rightCardOpacity = createSignal(0);
  const rightCardScale = createSignal(0.94);
  const axesOpacity = createSignal(0);

  const col1Progress = createSignal(0);
  const col1Opacity = createSignal(0);
  const col2Progress = createSignal(0);
  const col2Opacity = createSignal(0);
  const heroBadgeScale = createSignal(0.85);

  // Layout metrics (Widescreen 1920x1080)
  const leftX = -460;
  const rightX = 360;
  const cardY = -30;
  const cardHeight = 640;
  const leftWidth = 720;
  const rightWidth = 900;

  // Right card chart coordinates
  const chartX0 = rightX - 380;
  const chartX1 = rightX + 380;
  const chartY0 = cardY - 190;
  const chartY1 = cardY + 220;

  const col1CenterX = chartX0 + 200;
  const col2CenterX = chartX0 + 520;
  const col1MaxH = 95;
  const col2MaxH = 340;

  const stage = createRef<Node>();
  const leftRef = createRef<Node>();
  const rightRef = createRef<Node>();

  view.add(
    <Node ref={stage}>
      {/* ===== LEFT CARD: MONETIZATION ARCHITECTURE ===== */}
      <Node
        ref={leftRef}
        x={leftX}
        y={cardY}
        opacity={leftCardOpacity}
        scale={() => focalScale(focalId, 1, leftCardScale, time)}
        rotation={() => focalRotation(focalId, 1, time)}
      >
        <Rect
          width={leftWidth}
          height={cardHeight}
          fill={COLORS.surface}
          stroke={COLORS.gridLine}
          lineWidth={2}
          radius={16}
        />

        {/* Card Header */}
        <Txt
          x={0}
          y={-280}
          text="STRUKTUR MONETISASI"
          fontFamily={FONTS.heading}
          fontSize={18}
          fontWeight={800}
          fill={COLORS.accent}
          letterSpacing={1.2}
        />
        <Txt
          x={0}
          y={-248}
          text="Lounge Mahjong Komersial"
          fontFamily={FONTS.body}
          fontSize={20}
          fontWeight={600}
          fill={COLORS.secondaryInk}
        />

        {/* Hero Illustration */}
        <Img
          src="/assets/vid_20261102_001/beat05_fnb_dimsum_tea.png"
          width={330}
          height={330}
          y={-20}
          radius={12}
        />

        {/* Dual Comparison Pill */}
        <Rect
          y={210}
          width={leftWidth - 50}
          height={110}
          fill={COLORS.bg}
          stroke={COLORS.gridLine}
          lineWidth={2}
          radius={14}
        />
        {/* Left Sub-box: Sewa Meja */}
        <Txt
          x={-160}
          y={190}
          text="SEWA MEJA (PRODUK UMPAN)"
          fontFamily={FONTS.heading}
          fontSize={18}
          fontWeight={700}
          fill={COLORS.secondaryInk}
        />
        <Txt
          x={-160}
          y={225}
          text="Rp15.000 / Org / Jam"
          fontFamily={FONTS.data}
          fontSize={20}
          fontWeight={800}
          fill={COLORS.ink}
        />

        {/* Right Sub-box: F&B Cash Cow */}
        <Txt
          x={160}
          y={190}
          text="F&B CASH COW (MESIN PROFIT)"
          fontFamily={FONTS.heading}
          fontSize={18}
          fontWeight={700}
          fill={COLORS.compliantGreen}
        />
        <Txt
          x={160}
          y={225}
          text="Margin Kotor Tebal 70%"
          fontFamily={FONTS.data}
          fontSize={20}
          fontWeight={800}
          fill={COLORS.compliantGreen}
        />
      </Node>

      {/* ===== RIGHT CARD: CHASM SCALE BAR CHART ===== */}
      <Node
        ref={rightRef}
        x={rightX}
        y={cardY}
        opacity={rightCardOpacity}
        scale={() => focalScale(focalId, 2, rightCardScale, time)}
        rotation={() => focalRotation(focalId, 2, time)}
      >
        <Rect
          width={rightWidth}
          height={cardHeight}
          fill={COLORS.surface}
          stroke={COLORS.gridLine}
          lineWidth={2}
          radius={16}
        />
      </Node>

      {/* Chart Content in Stage Coordinates */}
      <Node opacity={axesOpacity}>
        {/* Chart Header */}
        <Txt
          x={rightX}
          y={cardY - 265}
          text="LOSS-LEADER VS PROFIT ENGINE"
          fontFamily={FONTS.heading}
          fontSize={22}
          fontWeight={800}
          fill={COLORS.ink}
          letterSpacing={1}
        />

        {/* Y-Axis Line */}
        <Line
          points={[
            [chartX0, chartY1],
            [chartX0, chartY0 - 20],
          ]}
          stroke={COLORS.ink}
          lineWidth={3}
          endArrow
          arrowSize={12}
        />

        {/* X-Axis Line */}
        <Line
          points={[
            [chartX0, chartY1],
            [chartX1 + 25, chartY1],
          ]}
          stroke={COLORS.ink}
          lineWidth={3}
          endArrow
          arrowSize={12}
        />

        {/* Dashed Gridlines */}
        <Line
          points={[
            [chartX0, chartY0 + 35],
            [chartX1, chartY0 + 35],
          ]}
          stroke={COLORS.gridLine}
          lineWidth={2}
          lineDash={[6, 6]}
        />
        <Txt
          x={chartX1 - 10}
          y={chartY0 + 15}
          offset={[1, 0]}
          text="70% Margin Laba F&B"
          fontFamily={FONTS.data}
          fontSize={18}
          fontWeight={700}
          fill={COLORS.compliantGreen}
        />

        <Line
          points={[
            [chartX0, chartY1 - col1MaxH],
            [chartX1, chartY1 - col1MaxH],
          ]}
          stroke={COLORS.gridLine}
          lineWidth={2}
          lineDash={[6, 6]}
        />
        <Txt
          x={col1CenterX}
          y={chartY1 - col1MaxH - 20}
          text="0% Break-Even Sewa"
          fontFamily={FONTS.data}
          fontSize={18}
          fontWeight={700}
          fill={COLORS.secondaryInk}
        />

        {/* Column 1: Sewa Meja (Umpan) */}
        <Rect
          x={col1CenterX}
          y={() => chartY1 - (col1MaxH * col1Progress()) / 2}
          width={240}
          height={() => Math.max(4, col1MaxH * col1Progress())}
          fill="#CBD5E1"
          stroke={COLORS.secondaryInk}
          lineWidth={1.5}
          radius={[8, 8, 0, 0]}
        />
        <Txt
          x={col1CenterX}
          y={chartY1 + 25}
          text="SEWA MEJA (UMPAN)"
          fontFamily={FONTS.heading}
          fontSize={18}
          fontWeight={700}
          fill={COLORS.secondaryInk}
          opacity={col1Opacity}
        />
        <Txt
          x={col1CenterX}
          y={chartY1 - col1MaxH - 45}
          text="Margin Tipis: Cuma Tutup Listrik"
          fontFamily={FONTS.body}
          fontSize={18}
          fontWeight={600}
          fill={COLORS.secondaryInk}
          opacity={col1Opacity}
        />

        {/* Column 2: F&B Cash Cow Engine */}
        <Rect
          x={col2CenterX}
          y={() => chartY1 - (col2MaxH * col2Progress()) / 2}
          width={240}
          height={() => Math.max(4, col2MaxH * col2Progress())}
          fill={COLORS.compliantGreen}
          stroke="#0D5A38"
          lineWidth={2}
          radius={[8, 8, 0, 0]}
        />
        <Txt
          x={col2CenterX}
          y={chartY1 + 25}
          text="MESIN F&B (PROFIT)"
          fontFamily={FONTS.heading}
          fontSize={18}
          fontWeight={800}
          fill={COLORS.compliantGreen}
          opacity={col2Opacity}
        />
        <Txt
          x={col2CenterX}
          y={() => chartY1 - (col2MaxH * col2Progress()) / 2 + 15}
          text="Dimsum, Liang Teh & Kopi"
          fontFamily={FONTS.body}
          fontSize={18}
          fontWeight={600}
          fill={COLORS.surface}
          opacity={col2Opacity}
        />
        <Txt
          x={col2CenterX}
          y={() => chartY1 - (col2MaxH * col2Progress()) / 2 - 25}
          text="MARGIN KOTOR 70%"
          fontFamily={FONTS.heading}
          fontSize={22}
          fontWeight={800}
          fill={COLORS.surface}
          opacity={col2Opacity}
          scale={heroBadgeScale}
        />
      </Node>
    </Node>
  );

  // ===== CHOREOGRAPHY TIMED TO AUDIO =====
  // 0.0s - 1.5s: Reveal left card
  yield* all(
    leftCardOpacity(1, 0.8, easeOutExpo),
    leftCardScale(1, 0.8, easeOutBack)
  );

  // 17.96s: "hanyalah umpan pancingan" -> Right card & axes reveal
  yield* waitUntilSceneTime(17.96, t0);
  focalId(2);
  yield* all(
    rightCardOpacity(1, 0.8, easeOutExpo),
    rightCardScale(1, 0.8, easeOutBack),
    axesOpacity(1, 0.7, easeOutExpo)
  );

  // 22.46s: "uang sewa meja murni bahkan hampir tidak cukup bayar listrik" -> Col 1 expands
  yield* waitUntilSceneTime(22.46, t0);
  yield* all(
    col1Progress(1, 1.0, easeOutExpo),
    col1Opacity(1, 0.8, easeOutExpo)
  );

  // 28.74s: "Mesin uang aslinya ada pada makanan dan minuman" -> Col 2 begins rising
  yield* waitUntilSceneTime(28.74, t0);
  yield* all(
    col2Progress(0.5, 1.2, easeInOutCubic),
    col2Opacity(1, 0.8, easeOutExpo)
  );

  // 41.78s: "es liang teh manis, kopi susu, mi goreng, dimsum" -> Col 2 continues rise
  yield* waitUntilSceneTime(41.78, t0);
  yield* col2Progress(0.85, 1.2, easeInOutCubic);

  // 51.64s: "margin laba kotor luar biasa tebal, mencapai 70%" -> Peak surge!
  yield* waitUntilSceneTime(51.64, t0);
  yield* all(
    col2Progress(1.0, 0.8, easeOutExpo),
    heroBadgeScale(1.08, 0.4, easeOutBack)
  );

  // Hold cleanly until beat completion (target >= 2.7s before end)
  yield* finishSceneAt(sceneDur, t0);
});

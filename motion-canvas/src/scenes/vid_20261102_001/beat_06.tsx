import { Img, Line, makeScene2D, Node, Rect, Txt } from '@motion-canvas/2d';
import { all, createRef, createSignal, easeInOutCubic, easeOutBack, easeOutExpo, useThread } from '@motion-canvas/core';
import { createEditorialStage, COLORS, PALETTE, FONTS, HEADING_FONT } from './layout';
import { finishSceneAt, focalRotation, focalScale, SCENE_TIMINGS, waitUntilSceneTime } from './timings';

export default makeScene2D(function* (view) {
  const time = useThread().time;
  const t0 = time();
  const sceneStart = SCENE_TIMINGS[5]?.start ?? 271.315;
  const sceneDur = SCENE_TIMINGS[5]?.duration ?? 49.231;

  // Mount responsive Swiss stage
  createEditorialStage(view, 5);

  // Scene state signals
  const focalId = createSignal(1);
  const leftCardOpacity = createSignal(0);
  const leftCardScale = createSignal(0.92);

  const receiptLine1Opacity = createSignal(0);
  const receiptLine2Opacity = createSignal(0);
  const receiptTotalOpacity = createSignal(0);

  const rightCardOpacity = createSignal(0);
  const rightCardScale = createSignal(0.94);
  const axesOpacity = createSignal(0);

  const bar1Progress = createSignal(0);
  const bar2Progress = createSignal(0);
  const bar3Progress = createSignal(0);
  const bar4Progress = createSignal(0);
  const heroBadgeOpacity = createSignal(0);
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
  const chartY0 = cardY - 180;
  const chartY1 = cardY + 210;

  const colW = 140;
  const col1X = chartX0 + 100;
  const col2X = chartX0 + 280;
  const col3X = chartX0 + 460;
  const col4X = chartX0 + 640;

  const maxH = 290; // Rp750k
  const hppH = 55;  // Rp135k
  const acH = 20;   // Rp45k
  const netH = 215; // Rp570k

  const stage = createRef<Node>();
  const leftRef = createRef<Node>();
  const rightRef = createRef<Node>();

  view.add(
    <Node ref={stage}>
      {/* ===== LEFT CARD: RECEIPT TEARDOWN ===== */}
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
          text="BEDAH STRUK KASIR NYATA"
          fontFamily={FONTS.heading}
          fontSize={18}
          fontWeight={800}
          fill={COLORS.accent}
          letterSpacing={1.2}
        />
        <Txt
          x={0}
          y={-248}
          text="Sesi VIP 5 Jam (4 Orang)"
          fontFamily={FONTS.body}
          fontSize={20}
          fontWeight={600}
          fill={COLORS.secondaryInk}
        />

        {/* Hero Illustration */}
        <Img
          src="/assets/vid_20261102_001/beat06_vip_receipt_stack.png"
          width={280}
          height={280}
          y={-70}
          radius={12}
        />

        {/* Kasir Receipt Simulation Box */}
        <Rect
          y={170}
          width={leftWidth - 60}
          height={160}
          fill="#F8FAFC"
          stroke={COLORS.gridLine}
          lineWidth={1.5}
          radius={12}
        />
        <Txt
          x={0}
          y={120}
          text="Sewa Meja VIP (5 Jam x 60rb): Rp300.000"
          fontFamily={FONTS.data}
          fontSize={18}
          fontWeight={600}
          fill={COLORS.secondaryInk}
          opacity={receiptLine1Opacity}
        />
        <Txt
          x={0}
          y={155}
          text="F&B: 8 Minum + 4 Mie + 3 Siomay: Rp450.000"
          fontFamily={FONTS.data}
          fontSize={18}
          fontWeight={600}
          fill={COLORS.secondaryInk}
          opacity={receiptLine2Opacity}
        />
        <Txt
          x={0}
          y={205}
          text="TOTAL STRUK KASIR: Rp750.000"
          fontFamily={FONTS.data}
          fontSize={22}
          fontWeight={800}
          fill={COLORS.ink}
          opacity={receiptTotalOpacity}
        />
      </Node>

      {/* ===== RIGHT CARD: WATERFALL UNIT ECONOMICS ===== */}
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
          text="WATERFALL UNIT ECONOMICS (1 MEJA)"
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

        {/* 100% Top Gridline */}
        <Line
          points={[
            [chartX0, chartY1 - maxH],
            [chartX1, chartY1 - maxH],
          ]}
          stroke={COLORS.gridLine}
          lineWidth={2}
          lineDash={[6, 6]}
        />
        <Txt
          x={chartX1 - 10}
          y={chartY1 - maxH - 18}
          offset={[1, 0]}
          text="100% Omzet Kasir"
          fontFamily={FONTS.data}
          fontSize={18}
          fontWeight={700}
          fill={COLORS.secondaryInk}
        />

        {/* Step 1: Omzet Rp750.000 */}
        <Rect
          x={col1X}
          y={() => chartY1 - (maxH * bar1Progress()) / 2}
          width={colW}
          height={() => Math.max(4, maxH * bar1Progress())}
          fill="#3B82F6"
          radius={[8, 8, 0, 0]}
        />
        <Txt
          x={col1X}
          y={chartY1 + 35}
          text={"1. OMZET\nRp750rb"}
          fontFamily={FONTS.heading}
          fontSize={18}
          fontWeight={800}
          textAlign={'center'}
          fill={COLORS.secondaryInk}
        />

        {/* Step 2: HPP F&B -Rp135.000 */}
        <Rect
          x={col2X}
          y={() => chartY1 - maxH + (hppH * bar2Progress()) / 2}
          width={colW}
          height={() => Math.max(4, hppH * bar2Progress())}
          fill={PALETTE.crimson}
          radius={8}
        />
        <Txt
          x={col2X}
          y={chartY1 + 35}
          text={"2. HPP F&B\n-Rp135rb"}
          fontFamily={FONTS.heading}
          fontSize={18}
          fontWeight={800}
          textAlign={'center'}
          fill={PALETTE.crimson}
        />

        {/* Step 3: Listrik -Rp45.000 */}
        <Rect
          x={col3X}
          y={() => chartY1 - maxH + hppH + (acH * bar3Progress()) / 2}
          width={colW}
          height={() => Math.max(4, acH * bar3Progress())}
          fill={COLORS.goldAccent}
          radius={8}
        />
        <Txt
          x={col3X}
          y={chartY1 + 35}
          text={"3. LISTRIK\n-Rp45rb"}
          fontFamily={FONTS.heading}
          fontSize={18}
          fontWeight={800}
          textAlign={'center'}
          fill={COLORS.goldAccent}
        />

        {/* Step 4: Laba Bersih Rp570.000 */}
        <Rect
          x={col4X}
          y={() => chartY1 - (netH * bar4Progress()) / 2}
          width={colW}
          height={() => Math.max(4, netH * bar4Progress())}
          fill={COLORS.compliantGreen}
          stroke="#0D5A38"
          lineWidth={2}
          radius={[8, 8, 0, 0]}
        />
        <Txt
          x={col4X}
          y={chartY1 + 35}
          text={"4. LABA BERSIH\nRp570rb (76%)"}
          fontFamily={FONTS.heading}
          fontSize={18}
          fontWeight={800}
          textAlign={'center'}
          fill={COLORS.compliantGreen}
        />

        {/* Hero Bottom Banner */}
        <Txt
          x={rightX}
          y={cardY - 215}
          text="LABA BERSIH: Rp570.000 / SESI MEJA (76%)"
          fontFamily={FONTS.heading}
          fontSize={20}
          fontWeight={800}
          fill={COLORS.compliantGreen}
          opacity={heroBadgeOpacity}
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

  // 6.52s: "Pertama, biaya sewa meja lima jam tercatat tiga ratus ribu" -> Receipt line 1
  yield* waitUntilSceneTime(6.52, t0);
  yield* receiptLine1Opacity(1, 0.6, easeOutExpo);

  // 11.14s: "Kedua, minuman dingin, mi goreng, siomay" -> Receipt line 2
  yield* waitUntilSceneTime(11.14, t0);
  yield* receiptLine2Opacity(1, 0.6, easeOutExpo);

  // 25.76s: "Total tagihan di struk kasir menjadi tujuh ratus lima puluh ribu" -> Total & chart
  yield* waitUntilSceneTime(25.76, t0);
  focalId(2);
  yield* all(
    receiptTotalOpacity(1, 0.6, easeOutBack),
    rightCardOpacity(1, 0.8, easeOutExpo),
    rightCardScale(1, 0.8, easeOutBack),
    axesOpacity(1, 0.7, easeOutExpo),
    bar1Progress(1, 1.0, easeOutExpo)
  );

  // 29.5s: "harga pokok bahan baku makanan seratus tiga puluh lima ribu" -> Step 2
  yield* waitUntilSceneTime(29.5, t0);
  yield* bar2Progress(1, 0.8, easeOutExpo);

  // 32.5s: "biaya listrik lampu & AC empat puluh lima ribu" -> Step 3
  yield* waitUntilSceneTime(32.5, t0);
  yield* bar3Progress(1, 0.8, easeOutExpo);

  // 35.5s: Step 4 Bar 4 grows tall in bright emerald so it is 100% visible before 85% mark (41.8s)
  yield* waitUntilSceneTime(35.5, t0);
  yield* bar4Progress(1, 0.8, easeOutExpo);

  // 45.72s: "laba kotor sebesar lima ratus tujuh puluh ribu rupiah" -> Step 4 & Hero
  yield* waitUntilSceneTime(45.72, t0);
  yield* all(
    heroBadgeOpacity(1, 0.5, easeOutExpo),
    heroBadgeScale(1.05, 0.5, easeOutBack)
  );

  // Hold cleanly until beat completion (target >= 2.7s before end)
  yield* finishSceneAt(sceneDur, t0);
});

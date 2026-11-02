import { Img, Line, makeScene2D, Node, Rect, Txt } from '@motion-canvas/2d';
import { all, createRef, createSignal, easeInOutCubic, easeOutBack, easeOutExpo, useThread } from '@motion-canvas/core';
import { createEditorialStage, COLORS, PALETTE, FONTS, HEADING_FONT } from './layout';
import { finishSceneAt, focalRotation, focalScale, SCENE_TIMINGS, waitUntilSceneTime } from './timings';

export default makeScene2D(function* (view) {
  const time = useThread().time;
  const t0 = time();
  const sceneStart = SCENE_TIMINGS[3]?.start ?? 158.893;
  const sceneDur = SCENE_TIMINGS[3]?.duration ?? 55.791;

  // Mount responsive Swiss stage
  createEditorialStage(view, 3);

  // Scene state signals
  const focalId = createSignal(1);
  const leftCardOpacity = createSignal(0);
  const leftCardScale = createSignal(0.92);
  const totalHighlight = createSignal(0);
  const capexCounter = createSignal(0);

  const rightCardOpacity = createSignal(0);
  const rightCardScale = createSignal(0.94);
  const axesOpacity = createSignal(0);

  const bar1Progress = createSignal(0);
  const bar1Opacity = createSignal(0);
  const bar2Progress = createSignal(0);
  const bar2Opacity = createSignal(0);
  const bar3Progress = createSignal(0);
  const bar3Opacity = createSignal(0);
  const bar4Progress = createSignal(0);
  const bar4Opacity = createSignal(0);

  // Layout metrics (Widescreen 1920x1080)
  const leftX = -480;
  const rightX = 340;
  const cardY = -30;
  const cardHeight = 640;
  const leftWidth = 680;
  const rightWidth = 940;

  // Right card chart coordinates
  const chartX0 = rightX - 420;
  const chartX1 = rightX + 410;
  const chartY0 = cardY - 190;
  const chartY1 = cardY + 230;

  const stage = createRef<Node>();
  const leftRef = createRef<Node>();
  const rightRef = createRef<Node>();

  view.add(
    <Node ref={stage}>
      {/* ===== LEFT CARD: CAPEX OVERVIEW & IMAGE ===== */}
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
          text="ESTIMASI BELANJA MODAL"
          fontFamily={FONTS.heading}
          fontSize={18}
          fontWeight={800}
          fill={PALETTE.crimson}
          letterSpacing={1.2}
        />
        <Txt
          x={0}
          y={-248}
          text="Kapasitas 8 Meja Otomatis"
          fontFamily={FONTS.body}
          fontSize={20}
          fontWeight={600}
          fill={COLORS.secondaryInk}
        />

        {/* Hero Illustration */}
        <Img
          src="/assets/vid_20261102_001/beat04_ruko_capex.png"
          width={340}
          height={340}
          y={-20}
          radius={12}
        />

        {/* Total Modal Banner */}
        <Rect
          y={210}
          width={leftWidth - 60}
          height={110}
          fill={() => (totalHighlight() > 0 ? '#FEE4E2' : PALETTE.crimsonBg)}
          stroke={() => (totalHighlight() > 0 ? PALETTE.crimson : '#FDA29B')}
          lineWidth={() => (totalHighlight() > 0 ? 3 : 2)}
          radius={14}
        />
        <Txt
          x={0}
          y={182}
          text="TOTAL ANGGARAN CAPEX"
          fontFamily={FONTS.heading}
          fontSize={18}
          fontWeight={800}
          fill={PALETTE.crimson}
          letterSpacing={1.5}
        />
        <Txt
          x={0}
          y={226}
          text={() => `Rp ${capexCounter().toFixed(0)} JUTA`}
          fontFamily={FONTS.data}
          fontSize={32}
          fontWeight={800}
          fill={COLORS.ink}
        />
      </Node>

      {/* ===== RIGHT CARD: ENCLOSED CAPEX BAR CHART ===== */}
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
        {/* Chart Card Header */}
        <Txt
          x={rightX}
          y={cardY - 265}
          text="ALOKASI ANGGARAN 8 MEJA"
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

        {/* Dashed Gridlines & Ticks */}
        <Line
          points={[
            [chartX0 + (chartX1 - chartX0) * 0.5, chartY0],
            [chartX0 + (chartX1 - chartX0) * 0.5, chartY1],
          ]}
          stroke={COLORS.gridLine}
          lineWidth={2}
          lineDash={[6, 6]}
        />
        <Txt
          x={chartX0}
          y={chartY1 + 22}
          text="0%"
          fontFamily={FONTS.data}
          fontSize={18}
          fontWeight={700}
          fill={COLORS.secondaryInk}
        />
        <Txt
          x={chartX0 + (chartX1 - chartX0) * 0.5}
          y={chartY1 + 22}
          text="50% Total Capex"
          fontFamily={FONTS.data}
          fontSize={18}
          fontWeight={700}
          fill={COLORS.secondaryInk}
        />

        {/* Bar 1: Sewa Ruko 1 Tahun */}
        <Txt
          x={chartX0 + 10}
          y={cardY - 175}
          offset={[-1, 0]}
          text="1. Sewa Ruko 2 Lantai (1 Thn)"
          fontFamily={FONTS.body}
          fontSize={18}
          fontWeight={700}
          fill={COLORS.secondaryInk}
        />
        <Rect
          x={chartX0}
          y={cardY - 145}
          offset={[-1, 0]}
          width={(chartX1 - chartX0) * 0.94}
          height={32}
          fill={COLORS.bg}
          radius={6}
        />
        <Rect
          x={chartX0}
          y={cardY - 145}
          offset={[-1, 0]}
          width={() => (chartX1 - chartX0) * 0.43 * bar1Progress()}
          height={32}
          fill={PALETTE.crimson}
          radius={6}
        />
        <Txt
          x={() => chartX0 + (chartX1 - chartX0) * 0.43 * bar1Progress() + 14}
          y={cardY - 145}
          offset={[-1, 0]}
          text="Rp150 Jt (43%)"
          fontFamily={FONTS.data}
          fontSize={18}
          fontWeight={800}
          fill={COLORS.ink}
          opacity={bar1Opacity}
        />

        {/* Bar 2: 8 Meja Mahjong Otomatis */}
        <Txt
          x={chartX0 + 10}
          y={cardY - 80}
          offset={[-1, 0]}
          text="2. 8 Meja Otomatis Foshan"
          fontFamily={FONTS.body}
          fontSize={18}
          fontWeight={700}
          fill={COLORS.secondaryInk}
        />
        <Rect
          x={chartX0}
          y={cardY - 50}
          offset={[-1, 0]}
          width={(chartX1 - chartX0) * 0.94}
          height={32}
          fill={COLORS.bg}
          radius={6}
        />
        <Rect
          x={chartX0}
          y={cardY - 50}
          offset={[-1, 0]}
          width={() => (chartX1 - chartX0) * 0.27 * bar2Progress()}
          height={32}
          fill={COLORS.goldAccent}
          radius={6}
        />
        <Txt
          x={() => chartX0 + (chartX1 - chartX0) * 0.27 * bar2Progress() + 14}
          y={cardY - 50}
          offset={[-1, 0]}
          text="Rp96 Jt (27%)"
          fontFamily={FONTS.data}
          fontSize={18}
          fontWeight={800}
          fill={COLORS.ink}
          opacity={bar2Opacity}
        />

        {/* Bar 3: Sekatan VIP & AC */}
        <Txt
          x={chartX0 + 10}
          y={cardY + 15}
          offset={[-1, 0]}
          text="3. Sekatan Akustik & AC"
          fontFamily={FONTS.body}
          fontSize={18}
          fontWeight={700}
          fill={COLORS.secondaryInk}
        />
        <Rect
          x={chartX0}
          y={cardY + 45}
          offset={[-1, 0]}
          width={(chartX1 - chartX0) * 0.94}
          height={32}
          fill={COLORS.bg}
          radius={6}
        />
        <Rect
          x={chartX0}
          y={cardY + 45}
          offset={[-1, 0]}
          width={() => (chartX1 - chartX0) * 0.21 * bar3Progress()}
          height={32}
          fill={COLORS.compliantGreen}
          radius={6}
        />
        <Txt
          x={() => chartX0 + (chartX1 - chartX0) * 0.21 * bar3Progress() + 14}
          y={cardY + 45}
          offset={[-1, 0]}
          text="Rp75 Jt (21%)"
          fontFamily={FONTS.data}
          fontSize={18}
          fontWeight={800}
          fill={COLORS.ink}
          opacity={bar3Opacity}
        />

        {/* Bar 4: CCTV, Listrik & Izin */}
        <Txt
          x={chartX0 + 10}
          y={cardY + 110}
          offset={[-1, 0]}
          text="4. CCTV, POS & Izin Legal"
          fontFamily={FONTS.body}
          fontSize={18}
          fontWeight={700}
          fill={COLORS.secondaryInk}
        />
        <Rect
          x={chartX0}
          y={cardY + 140}
          offset={[-1, 0]}
          width={(chartX1 - chartX0) * 0.94}
          height={32}
          fill={COLORS.bg}
          radius={6}
        />
        <Rect
          x={chartX0}
          y={cardY + 140}
          offset={[-1, 0]}
          width={() => (chartX1 - chartX0) * 0.09 * bar4Progress()}
          height={32}
          fill={COLORS.accent}
          radius={6}
        />
        <Txt
          x={() => chartX0 + (chartX1 - chartX0) * 0.09 * bar4Progress() + 14}
          y={cardY + 140}
          offset={[-1, 0]}
          text="Rp29 Jt (9%)"
          fontFamily={FONTS.data}
          fontSize={18}
          fontWeight={800}
          fill={COLORS.ink}
          opacity={bar4Opacity}
        />
      </Node>
    </Node>
  );

  // ===== CHOREOGRAPHY TIMED TO AUDIO =====
  // 0.0s - 1.5s: Initial reveal of left card
  yield* all(
    leftCardOpacity(1, 0.8, easeOutExpo),
    leftCardScale(1, 0.8, easeOutBack)
  );

  // 9.16s: "anggaran" -> Right card & axes reveal, counter begins
  yield* waitUntilSceneTime(9.16, t0);
  focalId(2);
  yield* all(
    rightCardOpacity(1, 0.8, easeOutExpo),
    rightCardScale(1, 0.8, easeOutBack),
    axesOpacity(1, 0.7, easeOutExpo),
    capexCounter(150, 1.2, easeInOutCubic)
  );

  // 12.80s: "Pertama, sewa ruko" -> Bar 1 expands
  yield* waitUntilSceneTime(12.80, t0);
  yield* all(
    bar1Progress(1, 1.0, easeOutExpo),
    bar1Opacity(1, 0.8, easeOutExpo)
  );

  // 20.44s: "Kedua, pembelian delapan unit meja" -> Bar 2 expands, counter updates
  yield* waitUntilSceneTime(20.44, t0);
  yield* all(
    bar2Progress(1, 1.0, easeOutExpo),
    bar2Opacity(1, 0.8, easeOutExpo),
    capexCounter(246, 1.0, easeInOutCubic)
  );

  // 29.08s: "Ketiga, renovasi partisi dinding" -> Bar 3 expands, counter updates
  yield* waitUntilSceneTime(29.08, t0);
  yield* all(
    bar3Progress(1, 1.0, easeOutExpo),
    bar3Opacity(1, 0.8, easeOutExpo),
    capexCounter(321, 1.0, easeInOutCubic)
  );

  // 44.32s: "Terakhir, instalasi kamera pengawas" -> Bar 4 expands, counter updates
  yield* waitUntilSceneTime(44.32, t0);
  yield* all(
    bar4Progress(1, 1.0, easeOutExpo),
    bar4Opacity(1, 0.8, easeOutExpo),
    capexCounter(350, 0.8, easeInOutCubic)
  );

  // 51.88s: "Total modal awal mencapai tiga ratus lima puluh juta" -> Hero highlight
  yield* waitUntilSceneTime(51.88, t0);
  focalId(1);
  yield* all(
    totalHighlight(1, 0.4, easeOutBack),
    leftCardScale(1.02, 0.4, easeOutBack)
  );

  // Hold cleanly until beat completion (target >= 2.7s before end)
  yield* finishSceneAt(sceneDur, t0);
});

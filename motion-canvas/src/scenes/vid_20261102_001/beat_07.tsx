import { Img, Line, makeScene2D, Node, Rect, Txt } from '@motion-canvas/2d';
import { all, createRef, createSignal, easeInOutCubic, easeOutBack, easeOutExpo, useThread } from '@motion-canvas/core';
import { createEditorialStage, COLORS, PALETTE, FONTS, HEADING_FONT } from './layout';
import { finishSceneAt, focalRotation, focalScale, SCENE_TIMINGS, waitUntilSceneTime } from './timings';

export default makeScene2D(function* (view) {
  const time = useThread().time;
  const t0 = time();
  const sceneStart = SCENE_TIMINGS[6]?.start ?? 320.546;
  const sceneDur = SCENE_TIMINGS[6]?.duration ?? 54.111;

  // Mount responsive Swiss stage
  createEditorialStage(view, 6);

  // Scene state signals
  const focalId = createSignal(1);
  const leftCardOpacity = createSignal(0);
  const leftCardScale = createSignal(0.92);

  const rightCardOpacity = createSignal(0);
  const rightCardScale = createSignal(0.94);
  const axesOpacity = createSignal(0);

  const zone1Progress = createSignal(0);
  const zone1Opacity = createSignal(0);
  const opexLineOpacity = createSignal(0);
  const zone2Progress = createSignal(0);
  const zone2Opacity = createSignal(0);
  const ceilingHighlight = createSignal(0);

  // Layout metrics (Widescreen 1920x1080)
  const leftX = -480;
  const rightX = 340;
  const cardY = -30;
  const cardHeight = 640;
  const leftWidth = 680;
  const rightWidth = 940;

  // Right card chart coordinates
  const chartX0 = rightX - 410;
  const chartX1 = rightX + 410;
  const chartY0 = cardY - 180;
  const chartY1 = cardY + 220;

  const totalChartH = chartY1 - chartY0;
  const ceilingY = chartY0 + 20;
  const midY = (ceilingY + chartY1) / 2;
  const lowY = chartY1 - (chartY1 - ceilingY) * 0.15;

  const colW = 280;
  const zone1X = chartX0 + 190;
  const zone2X = chartX0 + 550;
  const zone1MaxH = (chartY1 - ceilingY) * 0.15;
  const zone2MaxH = chartY1 - ceilingY;

  const stage = createRef<Node>();
  const leftRef = createRef<Node>();
  const rightRef = createRef<Node>();

  view.add(
    <Node ref={stage}>
      {/* ===== LEFT CARD: OPERATIONAL REALITY ===== */}
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
          text="OPERASIONAL REALISTIS"
          fontFamily={FONTS.heading}
          fontSize={18}
          fontWeight={800}
          fill={PALETTE.crimson}
          letterSpacing={1.2}
        />
        <Txt
          x={0}
          y={-248}
          text="Jebakan Hari Kerja vs Akhir Pekan"
          fontFamily={FONTS.body}
          fontSize={20}
          fontWeight={600}
          fill={COLORS.secondaryInk}
        />

        {/* Hero Illustration */}
        <Img
          src="/assets/vid_20261102_001/beat07_weekday_empty_vs_weekend.png"
          width={330}
          height={330}
          y={-30}
          radius={12}
        />

        {/* Golden Hours Summary Banner */}
        <Rect
          y={205}
          width={leftWidth - 60}
          height={110}
          fill={PALETTE.crimsonBg}
          stroke={PALETTE.crimson}
          lineWidth={2}
          radius={14}
        />
        <Txt
          x={0}
          y={182}
          text="30 JAM EMAS / MINGGU"
          fontFamily={FONTS.data}
          fontSize={26}
          fontWeight={800}
          fill={PALETTE.crimson}
        />
        <Txt
          x={0}
          y={225}
          text="Menutup 168 Jam Beban Tetap Ruko & Gaji"
          fontFamily={FONTS.body}
          fontSize={18}
          fontWeight={600}
          fill={COLORS.ink}
        />
      </Node>

      {/* ===== RIGHT CARD: WEEKLY OCCUPANCY & CAPACITY WALL ===== */}
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
          text="KURVA OKUPANSI MINGGUAN & BOTTLENECK"
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

        {/* 100% Ceiling Gridline */}
        <Line
          points={[
            [chartX0, ceilingY],
            [chartX1, ceilingY],
          ]}
          stroke={() => (ceilingHighlight() > 0 ? PALETTE.crimson : '#FDA29B')}
          lineWidth={() => (ceilingHighlight() > 0 ? 3 : 2)}
          lineDash={[6, 6]}
        />
        <Txt
          x={chartX1 - 10}
          y={ceilingY - 18}
          offset={[1, 0]}
          text="100% CAPACITY WALL (MAX 32 ORANG)"
          fontFamily={FONTS.data}
          fontSize={18}
          fontWeight={800}
          fill={PALETTE.crimson}
        />

        {/* 50% Mid Gridline */}
        <Line
          points={[
            [chartX0, midY],
            [chartX1, midY],
          ]}
          stroke={COLORS.gridLine}
          lineWidth={2}
          lineDash={[6, 6]}
        />
        <Txt
          x={chartX1 - 10}
          y={midY - 18}
          offset={[1, 0]}
          text="50% Target Titik Impas"
          fontFamily={FONTS.data}
          fontSize={18}
          fontWeight={700}
          fill={COLORS.secondaryInk}
        />

        {/* 15% Low Gridline */}
        <Line
          points={[
            [chartX0, lowY],
            [chartX1, lowY],
          ]}
          stroke={COLORS.goldAccent}
          lineWidth={2}
          lineDash={[6, 6]}
        />
        <Txt
          x={chartX1 - 10}
          y={lowY - 18}
          offset={[1, 0]}
          text="15% Zona Sepi Siang"
          fontFamily={FONTS.data}
          fontSize={18}
          fontWeight={700}
          fill={COLORS.goldAccent}
        />

        {/* Zone 1: Senin-Kamis (Siang) */}
        <Rect
          x={zone1X}
          y={() => chartY1 - (zone1MaxH * zone1Progress()) / 2}
          width={colW}
          height={() => Math.max(4, zone1MaxH * zone1Progress())}
          fill="#FEE4E2"
          stroke={PALETTE.crimson}
          lineWidth={1.5}
          radius={[8, 8, 0, 0]}
        />
        <Txt
          x={zone1X}
          y={chartY1 + 25}
          text="SENIN - KAMIS (15% SEPI)"
          fontFamily={FONTS.heading}
          fontSize={18}
          fontWeight={800}
          fill={PALETTE.crimson}
          opacity={zone1Opacity}
        />
        <Txt
          x={zone1X}
          y={lowY - 45}
          text="Meja Kosong Melompong"
          fontFamily={FONTS.body}
          fontSize={18}
          fontWeight={600}
          fill={COLORS.secondaryInk}
          opacity={zone1Opacity}
        />

        {/* 168-Hour Fixed Opex Barrier Line */}
        <Line
          points={[
            [chartX0, midY + 40],
            [chartX1, midY + 40],
          ]}
          stroke={COLORS.secondaryInk}
          lineWidth={2}
          lineDash={[5, 5]}
          opacity={opexLineOpacity}
        />
        <Txt
          x={zone1X}
          y={midY + 22}
          text="Titik Impas (Beban 168 Jam)"
          fontFamily={FONTS.data}
          fontSize={18}
          fontWeight={700}
          fill={COLORS.secondaryInk}
          opacity={opexLineOpacity}
        />

        {/* Zone 2: Jumat-Minggu (Malam) */}
        <Rect
          x={zone2X}
          y={() => chartY1 - (zone2MaxH * zone2Progress()) / 2}
          width={colW}
          height={() => Math.max(4, zone2MaxH * zone2Progress())}
          fill={COLORS.compliantGreen}
          stroke="#0D5A38"
          lineWidth={2}
          radius={[8, 8, 0, 0]}
        />
        <Txt
          x={zone2X}
          y={chartY1 + 25}
          text="JUMAT - MINGGU (100% PENUH)"
          fontFamily={FONTS.heading}
          fontSize={18}
          fontWeight={800}
          fill={COLORS.compliantGreen}
          opacity={zone2Opacity}
        />
        <Txt
          x={zone2X}
          y={ceilingY + 35}
          text="ANTREAN PENUH 100%"
          fontFamily={FONTS.heading}
          fontSize={18}
          fontWeight={800}
          fill={COLORS.surface}
          opacity={zone2Opacity}
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

  // 18.42s: "Realitas di lapangan sangat berbeda: Dari Senin sampai Kamis siang" -> Axes & Zone 1
  yield* waitUntilSceneTime(18.42, t0);
  focalId(2);
  yield* all(
    rightCardOpacity(1, 0.8, easeOutExpo),
    rightCardScale(1, 0.8, easeOutBack),
    axesOpacity(1, 0.7, easeOutExpo),
    zone1Progress(1, 1.0, easeOutExpo),
    zone1Opacity(1, 0.8, easeOutExpo)
  );

  // 30.20s: "tagihan sewa ruko dan gaji karyawan tetap berjalan setiap detik" -> Opex Line
  yield* waitUntilSceneTime(30.20, t0);
  yield* opexLineOpacity(1, 0.6, easeOutExpo);

  // 35.22s: "Sebaliknya saat hari Jumat malam hingga Minggu malam permintaan meledak 100%" -> Zone 2
  yield* waitUntilSceneTime(35.22, t0);
  yield* all(
    zone2Progress(1, 1.2, easeOutExpo),
    zone2Opacity(1, 0.8, easeOutExpo)
  );

  // 43.28s: "kapasitas meja terkunci maksimal tiga puluh dua orang" -> Ceiling Wall Alert
  yield* waitUntilSceneTime(43.28, t0);
  yield* ceilingHighlight(1, 0.5, easeOutBack);

  // 48.00s: "lo cuma punya jendela emas sekitar 30 jam per minggu" -> Return focal to left card
  yield* waitUntilSceneTime(48.00, t0);
  focalId(1);
  yield* leftCardScale(1.02, 0.4, easeOutBack);

  // Hold cleanly until beat completion (target >= 2.7s before end)
  yield* finishSceneAt(sceneDur, t0);
});

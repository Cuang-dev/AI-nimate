import { Line, makeScene2D, Node, Rect, Txt } from '@motion-canvas/2d';
import { all, createRef, createSignal, easeInOutCubic, easeOutExpo, useThread } from '@motion-canvas/core';
import { COLORS, FONTS, HEADING_FONT, PALETTE, isWidescreen, setupBaseStage, BEAT_LABELS } from './layout';
import { finishSceneAt, focalScale, SCENE_TIMINGS, waitUntilSceneTime } from './timings';

export default makeScene2D(function* (view) {
  const time = useThread().time;
  const t0 = time();

  // Setup Swiss Base Stage (Grid lines, top navigation pill bar, section indicator, subtitle pill)
  setupBaseStage(view, BEAT_LABELS[3]);

  const wide = isWidescreen(view);
  const sceneDuration = SCENE_TIMINGS[3].duration;

  // Contained Chart Card dimensions
  const cardW = wide ? 1280 : 900;
  const cardH = wide ? 520 : 680;
  const cardY = wide ? 20 : -70;

  // Plot bounds inside contained card
  const axisLeft = wide ? -480 : -310;
  const axisRight = wide ? +520 : +390;
  const axisTop = wide ? -190 : -240;
  const axisBottom = wide ? 140 : 140;

  // Milestone points along the plunge curve inside contained card
  const p0: [number, number] = [-260, -140];
  const p1: [number, number] = [20, -20];
  const p2: [number, number] = [300, 110];

  // Animation signals
  const focalId = createSignal(0);

  const headerOpacity = createSignal(0);
  const headerScale = createSignal(0.95);

  const chartOpacity = createSignal(0);
  const chartScale = createSignal(0.95);

  const axisLineEnd = createSignal(0);
  const refLineEnd = createSignal(0);
  const refBadgeOpacity = createSignal(0);

  const crashLineEnd = createSignal(0);

  const node1Opacity = createSignal(0);
  const node1Scale = createSignal(0.85);

  const node2Opacity = createSignal(0);
  const node2Scale = createSignal(0.85);

  const node3Opacity = createSignal(0);
  const node3Scale = createSignal(0.85);
  const crashPercentVal = createSignal(0);

  const impactOpacity = createSignal(0);
  const impactScale = createSignal(0.9);

  const camera = createRef<Node>();

  view.add(
    <Node ref={camera}>
      {/* ===== HEADER: ONE SINGLE BOLD TITLE ===== */}
      <Txt
        x={0}
        y={wide ? -340 : -620}
        opacity={headerOpacity}
        scale={headerScale}
        text="TERJUN BEBAS -85%"
        fontFamily={HEADING_FONT}
        fontSize={wide ? 48 : 52}
        fontWeight={800}
        fill={PALETTE.ink}
      />

      {/* ===== CONTAINED CHART CARD ===== */}
      <Rect
        x={0}
        y={cardY}
        width={cardW}
        height={cardH}
        fill={'#FFFFFF'}
        stroke={PALETTE.ink}
        lineWidth={3}
        radius={20}
        opacity={chartOpacity}
        scale={chartScale}
      >
        {/* Y-Axis Line */}
        <Line
          points={[
            [axisLeft, axisBottom + 15],
            [axisLeft, axisTop - 25],
          ]}
          stroke={PALETTE.ink}
          lineWidth={3.5}
          endArrow
          arrowSize={12}
          end={axisLineEnd}
        />

        {/* X-Axis Line */}
        <Line
          points={[
            [axisLeft - 15, axisBottom],
            [axisRight + 20, axisBottom],
          ]}
          stroke={PALETTE.ink}
          lineWidth={3.5}
          endArrow
          arrowSize={12}
          end={axisLineEnd}
        />

        {/* Horizontal Dashed Gridlines & Y-Axis Labels */}
        {/* Top (y = -180): 100% Benchmark */}
        <Txt
          x={axisLeft - 65}
          y={-180}
          text="100%"
          fontFamily={FONTS.data}
          fontSize={22}
          fontWeight={800}
          fill={PALETTE.emerald}
          textAlign="center"
        />
        <Line
          points={[
            [axisLeft, -180],
            [axisRight, -180],
          ]}
          stroke={PALETTE.emerald}
          lineWidth={2.5}
          lineDash={[8, 6]}
          end={refLineEnd}
        />
        <Rect
          x={40}
          y={-225}
          width={440}
          height={46}
          radius={10}
          fill={'#ECFDF5'}
          stroke={PALETTE.emerald}
          lineWidth={2}
          opacity={refBadgeOpacity}
          layout
          justifyContent="center"
          alignItems="center"
        >
          <Txt
            text="BISNIS SEHAT: UNTUNG NYATA"
            fontFamily={FONTS.data}
            fontSize={20}
            fontWeight={800}
            fill={PALETTE.emerald}
          />
        </Rect>

        {/* Mid (y = -20): -50% Gridline */}
        <Txt
          x={axisLeft - 65}
          y={-20}
          text="-50%"
          fontFamily={FONTS.data}
          fontSize={22}
          fontWeight={700}
          fill={PALETTE.muted}
          textAlign="center"
        />
        <Line
          points={[
            [axisLeft, -20],
            [axisRight, -20],
          ]}
          stroke={'#CBD5E1'}
          lineWidth={2}
          lineDash={[6, 6]}
          opacity={0.8}
        />

        {/* Bottom (y = +110): -85% Gridline */}
        <Txt
          x={axisLeft - 65}
          y={110}
          text="-85%"
          fontFamily={FONTS.data}
          fontSize={22}
          fontWeight={800}
          fill={PALETTE.crimson}
          textAlign="center"
        />
        <Line
          points={[
            [axisLeft, 110],
            [axisRight, 110],
          ]}
          stroke={'#FECDD3'}
          lineWidth={2}
          lineDash={[6, 6]}
          opacity={0.8}
        />

        {/* X-Axis Time Labels */}
        <Txt
          x={-240}
          y={axisBottom + 35}
          text="AWAL IPO"
          fontFamily={FONTS.data}
          fontSize={20}
          fontWeight={800}
          fill={PALETTE.muted}
          textAlign="center"
        />
        <Txt
          x={30}
          y={axisBottom + 35}
          text="MODAL HABIS"
          fontFamily={FONTS.data}
          fontSize={20}
          fontWeight={800}
          fill={PALETTE.muted}
          textAlign="center"
        />
        <Txt
          x={300}
          y={axisBottom + 35}
          text="SEKARANG"
          fontFamily={FONTS.data}
          fontSize={20}
          fontWeight={800}
          fill={PALETTE.crimson}
          textAlign="center"
        />

        {/* Plunging Crimson Crash Line */}
        <Line
          points={[p0, p1, p2]}
          stroke={PALETTE.crimson}
          lineWidth={wide ? 7 : 8}
          radius={28}
          end={crashLineEnd}
        />

        {/* Milestone 1 (@ 51.20s): Dot + Pill placed ABOVE-RIGHT of dot */}
        <Rect
          x={p0[0]}
          y={p0[1]}
          width={16}
          height={16}
          radius={8}
          fill={PALETTE.crimson}
          stroke={'#FFFFFF'}
          lineWidth={3}
          opacity={node1Opacity}
        />
        <Rect
          x={-90}
          y={-155}
          width={280}
          height={48}
          radius={8}
          fill={'#FFFFFF'}
          stroke={PALETTE.ink}
          lineWidth={2.5}
          opacity={node1Opacity}
          scale={() => focalScale(focalId, 1, () => node1Scale(), time)}
          layout
          justifyContent="center"
          alignItems="center"
        >
          <Txt
            text="IPO RATUSAN RP"
            fontFamily={FONTS.data}
            fontSize={20}
            fontWeight={800}
            fill={PALETTE.ink}
          />
        </Rect>

        {/* Milestone 2 (@ 53.80s): Dot + Pill placed ABOVE-RIGHT */}
        <Rect
          x={p1[0]}
          y={p1[1]}
          width={16}
          height={16}
          radius={8}
          fill={PALETTE.crimson}
          stroke={'#FFFFFF'}
          lineWidth={3}
          opacity={node2Opacity}
        />
        <Rect
          x={190}
          y={-50}
          width={240}
          height={48}
          radius={8}
          fill={'#FFFFFF'}
          stroke={PALETTE.crimson}
          lineWidth={2.5}
          opacity={node2Opacity}
          scale={() => focalScale(focalId, 2, () => node2Scale(), time)}
          layout
          justifyContent="center"
          alignItems="center"
        >
          <Txt
            text="MODAL HABIS"
            fontFamily={FONTS.data}
            fontSize={20}
            fontWeight={800}
            fill={PALETTE.crimson}
          />
        </Rect>

        {/* Milestone 3 (@ 56.20s): Dot + Giant Crimson Hero Badge below */}
        <Rect
          x={p2[0]}
          y={p2[1]}
          width={20}
          height={20}
          radius={10}
          fill={PALETTE.crimson}
          stroke={'#FFFFFF'}
          lineWidth={4}
          opacity={node3Opacity}
        />
        <Rect
          x={30}
          y={wide ? 205 : 255}
          width={520}
          height={76}
          radius={14}
          fill={PALETTE.crimson}
          stroke={PALETTE.ink}
          lineWidth={3}
          opacity={node3Opacity}
          scale={() => focalScale(focalId, 3, () => node3Scale(), time)}
          layout
          justifyContent="center"
          alignItems="center"
        >
          <Txt
            text={() => `-${Math.round(crashPercentVal())}% NILAI HILANG`}
            fontFamily={FONTS.data}
            fontSize={34}
            fontWeight={800}
            fill={'#FFFFFF'}
          />
        </Rect>
      </Rect>

      {/* ===== BOTTOM PILL (Reveals @ 60.10s) ===== */}
      <Rect
        x={0}
        y={wide ? 340 : 350}
        width={760}
        height={64}
        radius={12}
        fill={'#FFF1F2'}
        stroke={PALETTE.crimson}
        lineWidth={2.5}
        opacity={impactOpacity}
        scale={impactScale}
      >
        <Txt
          text="ERA JANJI MANIS RESMI TAMAT"
          fontFamily={HEADING_FONT}
          fontSize={28}
          fontWeight={800}
          fill={PALETTE.crimson}
        />
      </Rect>
    </Node>
  );

  // --- Choreography & Sync (Duration: 14.442s, global: 48.668s - 63.11s) ---

  // t = 0.20s (global 48.97s "bursa"): Header, contained chart card, axes, and benchmark line fade in
  yield* waitUntilSceneTime(0.2, t0);
  yield* all(
    headerOpacity(1, 0.4),
    headerScale(1.0, 0.5, easeOutExpo),
    chartOpacity(1, 0.5, easeOutExpo),
    chartScale(1.0, 0.5, easeOutExpo),
    axisLineEnd(1, 0.8, easeOutExpo),
    refLineEnd(1, 0.8, easeOutExpo),
    refBadgeOpacity(1, 0.4),
  );

  // t = 2.53s (global 51.20s "ratusan rupiah"):
  // Milestone 1: Dot at p0 & Pill placed above-right pop in
  yield* waitUntilSceneTime(2.53, t0);
  focalId(1);
  yield* all(
    node1Opacity(1, 0.3),
    node1Scale(1.15, 0.3, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
  );

  // t = 5.13s (global 53.80s "terjun bebas"):
  // Line draws to p1, Milestone 2 pops in
  yield* waitUntilSceneTime(5.13, t0);
  focalId(2);
  yield* all(
    crashLineEnd(0.5, 0.8, easeInOutCubic),
    node2Opacity(1, 0.3),
    node2Scale(1.15, 0.3, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
  );

  // t = 7.53s (global 56.20s "delapan puluh lima persen"):
  // Line draws to p2, Hero badge reveals and counter counts 0 -> 85%
  yield* waitUntilSceneTime(7.53, t0);
  focalId(3);
  yield* all(
    crashLineEnd(1.0, 0.7, easeInOutCubic),
    node3Opacity(1, 0.2),
    node3Scale(1.15, 0.25, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
    crashPercentVal(85, 0.8, easeOutExpo),
  );

  // t = 11.43s (global 60.10s "janji manis" -> 62.15s "resmi tamat"):
  // Bottom impact pill reveals
  yield* waitUntilSceneTime(11.43, t0);
  yield* all(
    impactOpacity(1, 0.3),
    impactScale(1.05, 0.3, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
  );

  // Hold until end of beat (14.442s)
  yield* finishSceneAt(sceneDuration, t0);
});

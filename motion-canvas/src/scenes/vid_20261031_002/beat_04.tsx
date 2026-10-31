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
  const cardW = wide ? 1300 : 900;
  const cardH = wide ? 520 : 680;
  const cardY = wide ? 30 : -80;

  // Milestone points along the plunge curve inside contained card
  const p0: [number, number] = wide ? [-460, -100] : [-340, -120];
  const p1: [number, number] = wide ? [-80, 15] : [-60, 20];
  const p2: [number, number] = wide ? [340, 130] : [240, 170];

  const benchY = wide ? -180 : -230;
  const benchLineX = wide ? 540 : 380;

  // Animation signals
  const focalId = createSignal(0);

  const headerOpacity = createSignal(0);
  const headerScale = createSignal(0.95);

  const chartOpacity = createSignal(0);
  const chartScale = createSignal(0.95);

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
        {/* Top Green Benchmark Line */}
        <Line
          points={[
            [-benchLineX, benchY],
            [benchLineX, benchY],
          ]}
          stroke={PALETTE.emerald}
          lineWidth={3}
          lineDash={[8, 6]}
          end={refLineEnd}
        />

        {/* Top Green Benchmark Centered Pill */}
        <Rect
          x={0}
          y={benchY}
          width={520}
          height={52}
          radius={10}
          fill={'#ECFDF5'}
          stroke={PALETTE.emerald}
          lineWidth={2}
          opacity={refBadgeOpacity}
        >
          <Txt
            text="BISNIS SEHAT: UNTUNG NYATA"
            fontFamily={FONTS.data}
            fontSize={22}
            fontWeight={800}
            fill={PALETTE.emerald}
          />
        </Rect>

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
          x={wide ? -260 : -150}
          y={wide ? -135 : -155}
          width={340}
          height={52}
          radius={8}
          fill={'#FFFFFF'}
          stroke={PALETTE.ink}
          lineWidth={2.5}
          opacity={node1Opacity}
          scale={() => focalScale(focalId, 1, () => node1Scale(), time)}
        >
          <Txt
            text="IPO RATUSAN RUPIAH"
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
          x={wide ? 130 : 140}
          y={wide ? -20 : -15}
          width={320}
          height={52}
          radius={8}
          fill={'#FFFFFF'}
          stroke={PALETTE.crimson}
          lineWidth={2.5}
          opacity={node2Opacity}
          scale={() => focalScale(focalId, 2, () => node2Scale(), time)}
        >
          <Txt
            text="MODAL BAKAR HABIS"
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
          x={0}
          y={wide ? 190 : 245}
          width={540}
          height={84}
          radius={14}
          fill={PALETTE.crimson}
          stroke={PALETTE.ink}
          lineWidth={3}
          opacity={node3Opacity}
          scale={() => focalScale(focalId, 3, () => node3Scale(), time)}
        >
          <Txt
            text={() => `-${Math.round(crashPercentVal())}% NILAI HILANG`}
            fontFamily={FONTS.data}
            fontSize={36}
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

  // t = 0.20s (global 48.97s "bursa"): Header, contained chart card, and benchmark line fade in
  yield* waitUntilSceneTime(0.2, t0);
  yield* all(
    headerOpacity(1, 0.4),
    headerScale(1.0, 0.5, easeOutExpo),
    chartOpacity(1, 0.5, easeOutExpo),
    chartScale(1.0, 0.5, easeOutExpo),
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

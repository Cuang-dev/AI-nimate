import { Img, Line, makeScene2D, Node, Rect, Txt } from '@motion-canvas/2d';
import { all, createRef, createSignal, easeInOutCubic, easeOutExpo, useThread } from '@motion-canvas/core';
import { COLORS, FONTS, getAssets, getTypo, isWidescreen, setupBaseStage } from './layout';
import { finishSceneAt, focalScale, waitUntilSceneTime } from './timings';

const PALETTE = {
  cyan: '#0284C7',
  amber: '#D97706',
  crimson: '#DC2626',
  emerald: '#16A34A',
  ink: COLORS.ink,
  surface: COLORS.surface,
  bg: COLORS.bg,
  secondaryInk: COLORS.secondaryInk,
  gridLine: COLORS.gridLine,
};

export default makeScene2D(function* (view) {
  const time = useThread().time;
  const t0 = time();

  // Setup Swiss Base Stage (Grid lines, section indicator, subtitle pill)
  setupBaseStage(view, 'KNP? // 04: SAHAM NYANGKUT');

  const wide = isWidescreen(view);
  const baseTypo = getTypo(wide);
  const baseAssets = getAssets(wide);

  const typo = {
    ...baseTypo,
    heroTitle: wide ? 38 : 34,
    cardTitle: wide ? 26 : 28,
    badge: wide ? 18 : 20,
    pill: wide ? 20 : 22,
    sublabel: wide ? 18 : 20,
    counter: wide ? 30 : 32,
  };

  const assets = {
    ...baseAssets,
    badgeSquare: wide ? 48 : 56,
  };

  // Chart frame dimensions
  const originX = wide ? -580 : -420;
  const endX = wide ? 580 : 420;
  const topY = wide ? -180 : -340;
  const botY = wide ? 170 : 210;

  // Milestone points along the plunge curve
  const p0: [number, number] = [originX + 20, topY + 40];
  const p1: [number, number] = [originX + (endX - originX) * 0.25, topY + (botY - topY) * 0.22];
  const p2: [number, number] = [originX + (endX - originX) * 0.50, topY + (botY - topY) * 0.48];
  const p3: [number, number] = [originX + (endX - originX) * 0.75, topY + (botY - topY) * 0.74];
  const p4: [number, number] = [endX - 30, botY];

  // Animation signals
  const focalId = createSignal(0);

  const headerOpacity = createSignal(0);
  const headerScale = createSignal(0.95);

  const axesOpacity = createSignal(0);
  const refLineEnd = createSignal(0);
  const refBadgeOpacity = createSignal(0);

  const crashLineEnd = createSignal(0);

  const node1Opacity = createSignal(0);
  const node1Scale = createSignal(0.8);

  const node2Opacity = createSignal(0);
  const node2Scale = createSignal(0.8);

  const node3Opacity = createSignal(0);
  const node3Scale = createSignal(0.8);

  const node4Opacity = createSignal(0);
  const node4Scale = createSignal(0.8);
  const menguapVal = createSignal(0);

  const impactOpacity = createSignal(0);
  const impactScale = createSignal(0.9);

  const camera = createRef<Node>();

  view.add(
    <Node ref={camera}>
      {/* ===== HEADER TITLE BLOCK ===== */}
      <Rect
        x={0}
        y={wide ? -370 : -620}
        opacity={headerOpacity}
        scale={headerScale}
        layout
        direction="column"
        alignItems="center"
        gap={wide ? 8 : 12}
      >
        <Rect
          layout
          padding={wide ? [6, 16] : [8, 18]}
          fill={PALETTE.crimson}
          radius={6}
        >
          <Txt
            text="EFEK DOMINO BURSA // KEPERCAYAAN RUNTUH"
            fontFamily={FONTS.data}
            fontSize={typo.badge}
            fontWeight={700}
            fill={PALETTE.surface}
            letterSpacing={1.2}
          />
        </Rect>
        <Txt
          text="DANA ASING KABUR, KITA IKUT RUGI"
          fontFamily={FONTS.heading}
          fontSize={typo.heroTitle}
          fontWeight={700}
          fill={PALETTE.ink}
        />
      </Rect>

      {/* ===== QUANTITATIVE CRASH CHART AXES ===== */}
      <Node opacity={axesOpacity}>
        {/* Y-Axis */}
        <Line
          points={[
            [originX, botY + 10],
            [originX, topY - 20],
          ]}
          stroke={PALETTE.ink}
          lineWidth={3.5}
          endArrow
          arrowSize={12}
        />

        {/* X-Axis */}
        <Line
          points={[
            [originX - 10, botY],
            [endX + 30, botY],
          ]}
          stroke={PALETTE.ink}
          lineWidth={3.5}
          endArrow
          arrowSize={12}
        />

        {/* Horizontal Level Gridlines */}
        {[
          { y: topY, label: 'INDEX PUNCAK' },
          { y: (topY + botY) / 2, label: '-25% CORRECTION' },
          { y: botY, label: 'CRASH WALL' },
        ].map((lvl, idx) => (
          <Node key={`grid-${idx}`}>
            <Line
              points={[
                [originX, lvl.y],
                [endX, lvl.y],
              ]}
              stroke={PALETTE.gridLine}
              lineWidth={2}
              lineDash={[6, 6]}
            />
            <Txt
              x={originX - 16}
              y={lvl.y}
              offset={[1, 0]}
              text={lvl.label}
              fontFamily={FONTS.data}
              fontSize={typo.badge}
              fontWeight={700}
              fill={PALETTE.secondaryInk}
            />
          </Node>
        ))}

        {/* IDX Bull Icon in corner */}
        <Rect
          x={endX - 30}
          y={topY - 10}
          layout
          direction="row"
          alignItems="center"
          gap={10}
          padding={[6, 12]}
          fill={PALETTE.surface}
          stroke={PALETTE.gridLine}
          lineWidth={2}
          radius={8}
        >
          <Img
            src={'/assets/vid_20261031_001/idx_bull_icon.png'}
            width={assets.badgeSquare}
            height={assets.badgeSquare}
          />
          <Txt
            text="IDX COMPOSITE"
            fontFamily={FONTS.data}
            fontSize={typo.badge}
            fontWeight={700}
            fill={PALETTE.secondaryInk}
          />
        </Rect>
      </Node>

      {/* ===== TOP FLAT REFERENCE LINE: WORLD TRANSPARENCY STANDARD ===== */}
      <Line
        points={[
          [originX, topY + 25],
          [endX - 120, topY + 25],
        ]}
        stroke={PALETTE.emerald}
        lineWidth={4}
        lineDash={[8, 6]}
        end={refLineEnd}
      />

      <Rect
        x={wide ? -120 : 0}
        y={topY - 15}
        opacity={refBadgeOpacity}
        layout
        padding={wide ? [6, 14] : [8, 16]}
        fill={PALETTE.surface}
        stroke={PALETTE.emerald}
        lineWidth={2.5}
        radius={6}
      >
        <Txt
          text="STANDAR TRANSPARANSI DUNIA (AMAN & STABIL)"
          fontFamily={FONTS.data}
          fontSize={typo.pill}
          fontWeight={700}
          fill={PALETTE.emerald}
        />
      </Rect>

      {/* ===== PLUNGING RED CRASH CURVE ===== */}
      <Line
        points={[p0, p1, p2, p3, p4]}
        stroke={PALETTE.crimson}
        lineWidth={wide ? 7 : 8}
        radius={28}
        end={crashLineEnd}
      />

      {/* Milestone Node 1: WASIT DUNIA CURIGA */}
      <Node
        x={p1[0]}
        y={p1[1]}
        opacity={node1Opacity}
        scale={() => focalScale(focalId, 1, node1Scale, time)}
      >
        <Rect
          width={16}
          height={16}
          radius={8}
          fill={PALETTE.crimson}
          stroke={PALETTE.surface}
          lineWidth={3}
        />
        <Rect
          y={wide ? -36 : -40}
          layout
          padding={wide ? [6, 12] : [8, 14]}
          fill={PALETTE.surface}
          stroke={PALETTE.ink}
          lineWidth={2.5}
          radius={6}
        >
          <Txt
            text="WASIT DUNIA CURIGA"
            fontFamily={FONTS.data}
            fontSize={typo.badge}
            fontWeight={700}
            fill={PALETTE.ink}
          />
        </Rect>
      </Node>

      {/* Milestone Node 2: MODAL ASING TARIK DANA */}
      <Node
        x={p2[0]}
        y={p2[1]}
        opacity={node2Opacity}
        scale={() => focalScale(focalId, 2, node2Scale, time)}
      >
        <Rect
          width={16}
          height={16}
          radius={8}
          fill={PALETTE.crimson}
          stroke={PALETTE.surface}
          lineWidth={3}
        />
        <Rect
          y={wide ? -36 : -40}
          layout
          padding={wide ? [6, 12] : [8, 14]}
          fill={PALETTE.surface}
          stroke={PALETTE.crimson}
          lineWidth={2.5}
          radius={6}
        >
          <Txt
            text="MODAL ASING TARIK DANA"
            fontFamily={FONTS.data}
            fontSize={typo.badge}
            fontWeight={700}
            fill={PALETTE.crimson}
          />
        </Rect>
      </Node>

      {/* Milestone Node 3: SAHAM BAGUS IKUT AMBRUK */}
      <Node
        x={p3[0]}
        y={p3[1]}
        opacity={node3Opacity}
        scale={() => focalScale(focalId, 3, node3Scale, time)}
      >
        <Rect
          width={16}
          height={16}
          radius={8}
          fill={PALETTE.crimson}
          stroke={PALETTE.surface}
          lineWidth={3}
        />
        <Rect
          y={wide ? -36 : -40}
          layout
          padding={wide ? [6, 12] : [8, 14]}
          fill={PALETTE.surface}
          stroke={PALETTE.crimson}
          lineWidth={2.5}
          radius={6}
        >
          <Txt
            text="SAHAM BAGUS IKUT AMBRUK"
            fontFamily={FONTS.data}
            fontSize={typo.badge}
            fontWeight={700}
            fill={PALETTE.crimson}
          />
        </Rect>
      </Node>

      {/* Milestone Node 4: -Rp500T+ MENGUAP */}
      <Node
        x={p4[0]}
        y={p4[1]}
        opacity={node4Opacity}
        scale={() => focalScale(focalId, 4, node4Scale, time)}
      >
        <Rect
          width={20}
          height={20}
          radius={10}
          fill={PALETTE.crimson}
          stroke={PALETTE.surface}
          lineWidth={4}
        />
        <Rect
          x={wide ? -140 : -110}
          y={wide ? -45 : -50}
          layout
          padding={wide ? [8, 16] : [10, 18]}
          fill={PALETTE.crimson}
          stroke={PALETTE.ink}
          lineWidth={3}
          radius={8}
        >
          <Txt
            text={() => `-Rp${Math.round(menguapVal())}T+ MENGUAP`}
            fontFamily={FONTS.data}
            fontSize={typo.counter}
            fontWeight={700}
            fill={PALETTE.surface}
          />
        </Rect>
      </Node>

      {/* ===== BOTTOM IMPACT CALLOUT CARD ===== */}
      <Rect
        x={0}
        y={wide ? 285 : 365}
        opacity={impactOpacity}
        scale={impactScale}
        layout
        padding={wide ? [12, 24] : [16, 26]}
        fill={PALETTE.surface}
        stroke={PALETTE.crimson}
        lineWidth={3}
        radius={12}
      >
        <Txt
          text="TABUNGAN SAHAM, REKSA DANA & DANA PENSIUN KITA IKUT TERGERUS"
          fontFamily={FONTS.heading}
          fontSize={typo.cardTitle}
          fontWeight={700}
          fill={PALETTE.crimson}
          textAlign="center"
        />
      </Rect>
    </Node>
  );

  // --- Choreography & Sync (Duration: 16.00s, global: 61.72s - 77.72s) ---

  // t = 0.2s: Header, chart axes, and top reference line fade in
  yield* waitUntilSceneTime(0.2, t0);
  yield* all(
    headerOpacity(1, 0.4),
    headerScale(1.0, 0.5, easeOutExpo),
    axesOpacity(1, 0.5, easeOutExpo),
    refLineEnd(1, 0.8, easeOutExpo),
    refBadgeOpacity(1, 0.4),
  );

  // t = 1.8s (global 63.50s, "wasit dunia menolak saham"):
  // Plunge curve draws to Node 1
  yield* waitUntilSceneTime(1.8, t0);
  focalId(1);
  yield* all(
    crashLineEnd(0.25, 0.8, easeInOutCubic),
    node1Opacity(1, 0.3),
    node1Scale(1.15, 0.3, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
  );

  // t = 5.9s (global 67.64s, "investor besar langsung panik tarik uang"):
  // Plunge curve draws to Node 2
  yield* waitUntilSceneTime(5.9, t0);
  focalId(2);
  yield* all(
    crashLineEnd(0.50, 0.8, easeInOutCubic),
    node2Opacity(1, 0.3),
    node2Scale(1.15, 0.3, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
  );

  // t = 9.2s (global 70.90s, "harga saham langsung ambruk mentok batas bawah"):
  // Plunge curve draws to Node 3
  yield* waitUntilSceneTime(9.2, t0);
  focalId(3);
  yield* all(
    crashLineEnd(0.75, 0.8, easeInOutCubic),
    node3Opacity(1, 0.3),
    node3Scale(1.15, 0.3, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
  );

  // t = 13.5s (global 75.22s, "nilai lebih dari 500 triliun rupiah menguap"):
  // Plunge curve bottoms out at Node 4, counter tweens 0 -> 500, impact card reveals
  yield* waitUntilSceneTime(13.5, t0);
  focalId(4);
  yield* all(
    crashLineEnd(1.0, 0.5, easeInOutCubic),
    node4Opacity(1, 0.2),
    node4Scale(1.15, 0.25, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
    menguapVal(500, 0.8, easeOutExpo),
    impactOpacity(1, 0.3),
    impactScale(1.05, 0.3, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
  );

  // Strict Hold-Time: Diagram holds until 16.00s (hold = 1.7s)
  yield* finishSceneAt(16.0, t0);
});

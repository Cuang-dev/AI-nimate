import { Img, Line, makeScene2D, Node, Rect, Txt } from '@motion-canvas/2d';
import { all, createRef, createSignal, easeInOutCubic, easeOutExpo, useThread } from '@motion-canvas/core';
import { COLORS, FONTS, getAssets, getTypo, isWidescreen, setupBaseStage, BEAT_LABELS } from './layout';
import { finishSceneAt, focalScale, SCENE_TIMINGS, waitUntilSceneTime } from './timings';

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

  // Setup Swiss Base Stage (Grid lines, top navigation pill bar, section indicator, subtitle pill)
  setupBaseStage(view, BEAT_LABELS[3]);

  const wide = isWidescreen(view);
  const baseTypo = getTypo(wide);
  const baseAssets = getAssets(wide);
  const sceneDuration = SCENE_TIMINGS[3].duration;

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
  const crashPercentVal = createSignal(0);

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
            text="REALITA BURSA SAHAM RI // DARI PUNCAK KE DASAR"
            fontFamily={FONTS.data}
            fontSize={typo.badge}
            fontWeight={700}
            fill={PALETTE.surface}
            letterSpacing={1.2}
          />
        </Rect>
        <Txt
          text="TERJUN BEBAS -85% DARI HARGA AWAL"
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
          { y: topY, label: 'HARGA IPO (PUCUK)' },
          { y: (topY + botY) / 2, label: '-50% DROP' },
          { y: botY, label: 'CRASH FLOOR' },
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

        {/* Tech Cliff Icon in corner */}
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
            src={'/assets/vid_20261031_002/chart_cliff_icon.png'}
            width={assets.badgeSquare}
            height={assets.badgeSquare}
          />
          <Txt
            text="IDX TECH SECTOR"
            fontFamily={FONTS.data}
            fontSize={typo.badge}
            fontWeight={700}
            fill={PALETTE.secondaryInk}
          />
        </Rect>
      </Node>

      {/* ===== TOP FLAT REFERENCE LINE: BISNIS SEHAT ===== */}
      <Line
        points={[
          [originX, topY + 25],
          [endX - 140, topY + 25],
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
          text="BISNIS SEHAT: CETAK UNTUNG & KAS NYATA"
          fontFamily={FONTS.data}
          fontSize={typo.pill}
          fontWeight={700}
          fill={PALETTE.emerald}
        />
      </Rect>

      {/* ===== PLUNGING CRIMSON CRASH CURVE ===== */}
      <Line
        points={[p0, p1, p2, p3, p4]}
        stroke={PALETTE.crimson}
        lineWidth={wide ? 7 : 8}
        radius={28}
        end={crashLineEnd}
      />

      {/* Milestone Node 1: MASUK BURSA RATUSAN RUPIAH */}
      <Node
        x={p1[0]}
        y={p1[1]}
        opacity={node1Opacity}
        scale={() => focalScale(focalId, 1, () => node1Scale(), time)}
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
            text="MASUK BURSA RATUSAN RUPIAH"
            fontFamily={FONTS.data}
            fontSize={typo.badge}
            fontWeight={700}
            fill={PALETTE.ink}
          />
        </Rect>
      </Node>

      {/* Milestone Node 2: MODAL BAKAR UANG HABIS */}
      <Node
        x={p2[0]}
        y={p2[1]}
        opacity={node2Opacity}
        scale={() => focalScale(focalId, 2, () => node2Scale(), time)}
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
            text="MODAL BAKAR UANG HABIS"
            fontFamily={FONTS.data}
            fontSize={typo.badge}
            fontWeight={700}
            fill={PALETTE.crimson}
          />
        </Rect>
      </Node>

      {/* Milestone Node 3: JEBOL BATAS HARGA RP 50 */}
      <Node
        x={p3[0]}
        y={p3[1]}
        opacity={node3Opacity}
        scale={() => focalScale(focalId, 3, () => node3Scale(), time)}
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
            text="JEBOL BATAS HARGA RP 50"
            fontFamily={FONTS.data}
            fontSize={typo.badge}
            fontWeight={700}
            fill={PALETTE.crimson}
          />
        </Rect>
      </Node>

      {/* Milestone Node 4: -85% NILAI HILANG */}
      <Node
        x={p4[0]}
        y={p4[1]}
        opacity={node4Opacity}
        scale={() => focalScale(focalId, 4, () => node4Scale(), time)}
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
            text={() => `-${Math.round(crashPercentVal())}% NILAI HILANG`}
            fontFamily={FONTS.data}
            fontSize={typo.counter}
            fontWeight={700}
            fill={PALETTE.surface}
          />
        </Rect>
      </Node>

      {/* ===== BOTTOM IMPACT CALLOUT BANNER ===== */}
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
          text="ERA BELI SAHAM CUMA KARENA JANJI MANIS MASA DEPAN SUDAH RESMI TAMAT"
          fontFamily={FONTS.heading}
          fontSize={typo.cardTitle}
          fontWeight={700}
          fill={PALETTE.crimson}
          textAlign="center"
        />
      </Rect>
    </Node>
  );

  // --- Choreography & Sync (Duration: 14.442s, global: 48.668s - 63.11s) ---

  // t = 0.2s (global 48.97s "bursa"): Header, chart axes, and top reference line fade in
  yield* waitUntilSceneTime(0.2, t0);
  yield* all(
    headerOpacity(1, 0.4),
    headerScale(1.0, 0.5, easeOutExpo),
    axesOpacity(1, 0.5, easeOutExpo),
    refLineEnd(1, 0.8, easeOutExpo),
    refBadgeOpacity(1, 0.4),
  );

  // t = 2.7s (global 51.35s "ratusan rupiah"):
  // Plunge curve draws to Node 1
  yield* waitUntilSceneTime(2.7, t0);
  focalId(1);
  yield* all(
    crashLineEnd(0.25, 0.8, easeInOutCubic),
    node1Opacity(1, 0.3),
    node1Scale(1.15, 0.3, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
  );

  // t = 4.3s: Plunge curve draws to Node 2 (MODAL BAKAR UANG HABIS)
  yield* waitUntilSceneTime(4.3, t0);
  focalId(2);
  yield* all(
    crashLineEnd(0.50, 0.8, easeInOutCubic),
    node2Opacity(1, 0.3),
    node2Scale(1.15, 0.3, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
  );

  // t = 5.5s (global 54.10s "terjun bebas"): Plunge curve draws to Node 3
  yield* waitUntilSceneTime(5.5, t0);
  focalId(3);
  yield* all(
    crashLineEnd(0.75, 0.8, easeInOutCubic),
    node3Opacity(1, 0.3),
    node3Scale(1.15, 0.3, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
  );

  // t = 7.74s (global 56.41s "85% nilainya"):
  // Plunge curve reaches bottom Node 4, counter tweens 0 -> 85%
  yield* waitUntilSceneTime(7.74, t0);
  focalId(4);
  yield* all(
    crashLineEnd(1.0, 0.5, easeInOutCubic),
    node4Opacity(1, 0.2),
    node4Scale(1.15, 0.25, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
    crashPercentVal(85, 0.8, easeOutExpo),
  );

  // t = 11.5s (global 60.10s "janji manis" -> 62.15s "resmi tamat"):
  // Impact card reveals
  yield* waitUntilSceneTime(11.5, t0);
  yield* all(
    impactOpacity(1, 0.3),
    impactScale(1.05, 0.3, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
  );

  // Hold until end of beat (14.442s)
  yield* finishSceneAt(sceneDuration, t0);
});

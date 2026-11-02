import { Line, makeScene2D, Node, Rect, Txt } from '@motion-canvas/2d';
import {
  all,
  createRef,
  createSignal,
  easeInOutCubic,
  easeOutExpo,
  useThread,
} from '@motion-canvas/core';
import {
  COLORS,
  FONTS,
  getAssets,
  getTypo,
  isWidescreen,
  setupBaseStage,
  BEAT_LABELS,
} from './layout';
import { finishSceneAt, focalScale, waitUntilSceneTime } from './timings';

const PALETTE = {
  cyan: '#0284C7',
  amber: '#D97706',
  crimson: '#DC2626',
  crimsonBg: '#FEE4E2',
  emerald: '#16A34A',
  ink: COLORS.ink,
  surface: COLORS.surface,
  bg: COLORS.bg,
  secondaryInk: '#334155',
  gridLine: COLORS.gridLine,
};

export default makeScene2D(function* (view) {
  const time = useThread().time;
  const t0 = time();

  // Setup Swiss Base Stage (Grid lines, section indicator, subtitle pill)
  setupBaseStage(view, BEAT_LABELS[3]);

  const wide = isWidescreen(view);
  const typo = getTypo(wide);
  const assets = getAssets(wide);

  // Card dimensions
  const cardW = wide ? 1100 : 900;
  const cardH = wide ? 560 : 600;
  const cardY = wide ? 20 : -70;

  // Milestone points on plunge curve (relative to chart container)
  const p0: [number, number] = [wide ? -260 : -200, -140];
  const p1: [number, number] = [wide ? -110 : -90, -20];
  const p2: [number, number] = [wide ? 70 : 50, 50];
  const p3: [number, number] = [wide ? 250 : 190, 110];

  // Animation signals
  const focalId = createSignal(0);

  const headerOpacity = createSignal(0);
  const headerScale = createSignal(0.95);

  const cardOpacity = createSignal(0);
  const refLineEnd = createSignal(0);
  const refBadgeOpacity = createSignal(0);

  const crashLineEnd = createSignal(0);

  const node1Opacity = createSignal(0);
  const node1Scale = createSignal(0.85);

  const node2Opacity = createSignal(0);
  const node2Scale = createSignal(0.85);

  const node3Opacity = createSignal(0);
  const node3Scale = createSignal(0.85);
  const menguapVal = createSignal(0);

  const impactOpacity = createSignal(0);
  const impactScale = createSignal(0.9);

  const camera = createRef<Node>();

  view.add(
    <Node ref={camera}>
      {/* ===== HEADER TITLE BLOCK (Eyebrow pill removed) ===== */}
      <Rect
        x={0}
        y={wide ? -370 : -620}
        opacity={headerOpacity}
        scale={headerScale}
        layout
        direction="column"
        alignItems="center"
      >
        <Txt
          text="DANA ASING KABUR, KITA IKUT RUGI"
          fontFamily={FONTS.heading}
          fontSize={wide ? 38 : 34}
          fontWeight={800}
          fill={PALETTE.ink}
        />
      </Rect>

      {/* ===== CLEAN CONTAINED 900PX CHART CARD ===== */}
      {(() => {
        const yAxisX = wide ? -480 : -310;
        return (
          <Rect
            x={0}
            y={cardY}
            width={cardW}
            height={cardH}
            opacity={cardOpacity}
            fill={PALETTE.surface}
            stroke={PALETTE.ink}
            lineWidth={3}
            radius={16}
          >
            {/* Y-Axis Line (Directional Arrow pointing UP) */}
            <Line
              points={[
                [yAxisX, 140],
                [yAxisX, -255],
              ]}
              stroke={PALETTE.ink}
              lineWidth={2.5}
              endArrow
            />

            {/* X-Axis Line (Directional Arrow pointing RIGHT) */}
            <Line
              points={[
                [wide ? -490 : -325, 140],
                [wide ? 470 : 405, 140],
              ]}
              stroke={PALETTE.ink}
              lineWidth={2.5}
              endArrow
            />

            {/* Horizontal Dashed Gridlines: 100% (-180), -50% (-20), -85% (+110) */}
            <Line
              points={[
                [yAxisX, -180],
                [wide ? 450 : 380, -180],
              ]}
              stroke={PALETTE.emerald}
              lineWidth={2}
              lineDash={[8, 6]}
              end={refLineEnd}
            />
            <Line
              points={[
                [yAxisX, -20],
                [wide ? 450 : 380, -20],
              ]}
              stroke={'#94A3B8'}
              lineWidth={1.5}
              lineDash={[6, 6]}
              opacity={0.6}
            />
            <Line
              points={[
                [yAxisX, 110],
                [wide ? 450 : 380, 110],
              ]}
              stroke={PALETTE.crimson}
              lineWidth={1.5}
              lineDash={[6, 6]}
              opacity={0.6}
            />

            {/* Inside-Card Y-Axis Labels at x = wide ? -510 : -375 */}
            <Txt
              text="AMAN"
              x={wide ? -510 : -375}
              y={-180}
              fontFamily={FONTS.data}
              fontSize={18}
              fontWeight={700}
              fill={PALETTE.emerald}
            />
            <Txt
              text="TURUN"
              x={wide ? -510 : -375}
              y={-20}
              fontFamily={FONTS.data}
              fontSize={18}
              fontWeight={700}
              fill={PALETTE.secondaryInk}
            />
            <Txt
              text="KRISIS"
              x={wide ? -510 : -375}
              y={110}
              fontFamily={FONTS.data}
              fontSize={18}
              fontWeight={700}
              fill={PALETTE.crimson}
            />

            {/* X-Axis Labels below baseline at y = +175 */}
            <Txt
              text="AWAL"
              x={wide ? -240 : -180}
              y={175}
              fontFamily={FONTS.data}
              fontSize={18}
              fontWeight={700}
              fill={PALETTE.secondaryInk}
            />
            <Txt
              text="PANIK"
              x={wide ? 0 : 20}
              y={175}
              fontFamily={FONTS.data}
              fontSize={18}
              fontWeight={700}
              fill={PALETTE.crimson}
            />
            <Txt
              text="KINI"
              x={wide ? 260 : 200}
              y={175}
              fontFamily={FONTS.data}
              fontSize={18}
              fontWeight={700}
              fill={PALETTE.crimson}
            />

            {/* Single Centered Green Benchmark Pill */}
            <Rect
              x={wide ? -40 : 0}
              y={-180}
              opacity={refBadgeOpacity}
              layout
              padding={wide ? [6, 16] : [7, 18]}
              fill={PALETTE.surface}
              stroke={PALETTE.emerald}
              lineWidth={2.5}
              radius={6}
            >
              <Txt
                text="STANDAR BURSA DUNIA: AMAN"
                fontFamily={FONTS.data}
                fontSize={18}
                fontWeight={700}
                fill={PALETTE.emerald}
              />
            </Rect>

            {/* Plunging Red Crash Curve */}
            <Line
              points={[p0, p1, p2, p3]}
              stroke={PALETTE.crimson}
              lineWidth={wide ? 7 : 8}
              radius={32}
              end={crashLineEnd}
            />

            {/* Milestone Node 1: WASIT CURIGA */}
            <Node
              x={p1[0]}
              y={p1[1]}
              opacity={node1Opacity}
              scale={() => focalScale(focalId, 1, node1Scale, time)}
            >
              <Rect
                width={18}
                height={18}
                radius={9}
                fill={PALETTE.crimson}
                stroke={PALETTE.surface}
                lineWidth={3}
              />
              <Rect
                y={-48}
                layout
                padding={[6, 12]}
                fill={PALETTE.surface}
                stroke={PALETTE.ink}
                lineWidth={2.5}
                radius={6}
              >
                <Txt
                  text="WASIT CURIGA"
                  fontFamily={FONTS.data}
                  fontSize={18}
                  fontWeight={700}
                  fill={PALETTE.ink}
                />
              </Rect>
            </Node>

            {/* Milestone Node 2: MODAL ASING KABUR */}
            <Node
              x={p2[0]}
              y={p2[1]}
              opacity={node2Opacity}
              scale={() => focalScale(focalId, 2, node2Scale, time)}
            >
              <Rect
                width={18}
                height={18}
                radius={9}
                fill={PALETTE.crimson}
                stroke={PALETTE.surface}
                lineWidth={3}
              />
              <Rect
                y={-48}
                layout
                padding={[6, 12]}
                fill={PALETTE.surface}
                stroke={PALETTE.crimson}
                lineWidth={2.5}
                radius={6}
              >
                <Txt
                  text="MODAL ASING KABUR"
                  fontFamily={FONTS.data}
                  fontSize={18}
                  fontWeight={700}
                  fill={PALETTE.crimson}
                />
              </Rect>
            </Node>

            {/* Milestone Node 3 Dot: Plunge Terminus on KRISIS Line */}
            <Node
              x={p3[0]}
              y={p3[1]}
              opacity={node3Opacity}
              scale={() => focalScale(focalId, 3, node3Scale, time)}
            >
              <Rect
                width={22}
                height={22}
                radius={11}
                fill={PALETTE.crimson}
                stroke={PALETTE.surface}
                lineWidth={4}
              />
            </Node>

            {/* Hero Badge cleanly positioned below X-axis at x = +30, y = +255 */}
            <Rect
              x={30}
              y={255}
              opacity={node3Opacity}
              scale={() => focalScale(focalId, 3, node3Scale, time)}
              layout
              padding={wide ? [10, 24] : [10, 20]}
              fill={PALETTE.crimson}
              stroke={PALETTE.ink}
              lineWidth={2.5}
              radius={10}
            >
              <Txt
                text={() => `-Rp${Math.round(menguapVal())}T+ MENGUAP`}
                fontFamily={FONTS.data}
                fontSize={wide ? 24 : 22}
                fontWeight={800}
                fill={PALETTE.surface}
              />
            </Rect>
          </Rect>
        );
      })()}

      {/* ===== BOTTOM IMPACT CALLOUT CARD ===== */}
      <Rect
        x={0}
        y={wide ? 340 : 365}
        width={cardW}
        opacity={impactOpacity}
        scale={impactScale}
        layout
        justifyContent="center"
        alignItems="center"
        padding={wide ? [12, 24] : [16, 24]}
        fill={PALETTE.surface}
        stroke={PALETTE.crimson}
        lineWidth={3}
        radius={12}
      >
        <Txt
          text="TABUNGAN SAHAM & DANA PENSIUN KITA IKUT TERGERUS"
          fontFamily={FONTS.heading}
          fontSize={wide ? 24 : 22}
          fontWeight={800}
          fill={PALETTE.crimson}
          textAlign="center"
        />
      </Rect>
    </Node>
  );

  // --- Choreography & Sync (Duration: 16.00s, global: 61.72s - 77.72s) ---

  // t = 0.2s: Header, card, and top reference line fade in
  yield* waitUntilSceneTime(0.2, t0);
  yield* all(
    headerOpacity(1, 0.4),
    headerScale(1.0, 0.45, easeOutExpo),
    cardOpacity(1, 0.5, easeOutExpo),
    refLineEnd(1, 0.8, easeOutExpo),
    refBadgeOpacity(1, 0.4),
  );

  // t = 1.8s (global 63.50s, "wasit dunia menolak saham"):
  // Plunge curve draws to Node 1 (WASIT CURIGA)
  yield* waitUntilSceneTime(1.8, t0);
  focalId(1);
  yield* all(
    crashLineEnd(0.35, 0.8, easeInOutCubic),
    node1Opacity(1, 0.3),
    node1Scale(1.1, 0.3, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
  );

  // t = 5.9s (global 67.64s, "investor besar langsung panik tarik uang"):
  // Plunge curve draws to Node 2 (MODAL ASING KABUR)
  yield* waitUntilSceneTime(5.9, t0);
  focalId(2);
  yield* all(
    crashLineEnd(0.70, 0.8, easeInOutCubic),
    node2Opacity(1, 0.3),
    node2Scale(1.1, 0.3, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
  );

  // t = 13.5s (global 75.22s, "nilai lebih dari 500 triliun rupiah menguap"):
  // Plunge curve bottoms out at Node 3 (-Rp500T+ MENGUAP)
  yield* waitUntilSceneTime(13.5, t0);
  focalId(3);
  yield* all(
    crashLineEnd(1.0, 0.5, easeInOutCubic),
    node3Opacity(1, 0.2),
    node3Scale(1.12, 0.25, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
    menguapVal(500, 0.8, easeOutExpo),
    impactOpacity(1, 0.3),
    impactScale(1.05, 0.3, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
  );

  // Strict Hold-Time: Diagram holds until 16.00s
  yield* finishSceneAt(16.0, t0);
});

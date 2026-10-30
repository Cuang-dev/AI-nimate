import { Img, Line, makeScene2D, Node, Rect, Txt } from '@motion-canvas/2d';
import { all, createRef, createSignal, easeInOutCubic, easeOutExpo, useThread } from '@motion-canvas/core';
import { COLORS, FONTS, isWidescreen, setupBaseStage } from './layout';
import { finishSceneAt, focalScale, waitUntilSceneTime } from './timings';

export default makeScene2D(function* (view) {
  const time = useThread().time;
  const t0 = time();

  // Setup Swiss Base Stage (Grid lines, section indicator, subtitle pill)
  setupBaseStage(view, '04 // 2000 TELECOM VS 2026 AI');

  const wide = isWidescreen(view);
  const originX = wide ? -580 : -390;
  const endX = wide ? 580 : 430;
  const topY = wide ? -230 : -420;
  const botY = wide ? 200 : 310;
  const yr3X = originX + (endX - originX) * 0.28;
  const yr10X = originX + (endX - originX) * 0.56;

  // Animation signals
  const focalId = createSignal(1);

  const axesOpacity = createSignal(0.0);
  const debtTagOpacity = createSignal(0.0);
  const debtTagScale = createSignal(0.8);

  const fiberLineEnd = createSignal(0.0);
  const fiberBadgeOpacity = createSignal(0.0);
  const fiberBadgeScale = createSignal(0.8);

  const cashTagOpacity = createSignal(0.0);
  const cashTagScale = createSignal(0.8);

  const gpuLineEnd = createSignal(0.0);
  const gpuBadgeOpacity = createSignal(0.0);
  const gpuBadgeScale = createSignal(0.8);

  const camera = createRef<Node>();

  view.add(
    <Node ref={camera}>
      {/* ===== QUANTITATIVE ASSET RETENTION AXES ===== */}
      {/* Vertical Y-Axis */}
      <Line
        points={[
          [originX, botY],
          [originX, topY - 20],
        ]}
        stroke={COLORS.ink}
        lineWidth={4}
        endArrow
        arrowSize={12}
        opacity={axesOpacity}
      />

      {/* Horizontal X-Axis */}
      <Line
        points={[
          [originX, botY],
          [endX + 30, botY],
        ]}
        stroke={COLORS.ink}
        lineWidth={4}
        endArrow
        arrowSize={12}
        opacity={axesOpacity}
      />

      {/* Horizontal Value Gridlines: 100%, 50%, 0% */}
      {[
        { y: topY, label: '100%' },
        { y: (topY + botY) / 2, label: '50%' },
        { y: botY, label: '0%' },
      ].map((g, idx) => (
        <Node key={`grid-${idx}`} opacity={axesOpacity}>
          <Line
            points={[
              [originX, g.y],
              [endX, g.y],
            ]}
            stroke={COLORS.gridLine}
            lineWidth={2}
            lineDash={[6, 6]}
          />
          <Txt
            x={originX - 18}
            y={g.y}
            offset={[1, 0]}
            text={g.label}
            fontFamily={FONTS.data}
            fontSize={wide ? 20 : 22}
            fontWeight={700}
            fill={COLORS.secondaryInk}
          />
        </Node>
      ))}

      {/* X-Axis Ticks: YR 0, YR 3, YR 10, YR 25 */}
      {[
        { x: originX, label: 'YR 0' },
        { x: yr3X, label: 'YR 3' },
        { x: yr10X, label: 'YR 10' },
        { x: endX - 20, label: 'YR 25' },
      ].map((tick, idx) => (
        <Node key={`tick-${idx}`} opacity={axesOpacity}>
          <Line
            points={[
              [tick.x, botY - 10],
              [tick.x, botY + 10],
            ]}
            stroke={COLORS.ink}
            lineWidth={3}
          />
          <Txt
            x={tick.x}
            y={botY + (wide ? 28 : 34)}
            text={tick.label}
            fontFamily={FONTS.data}
            fontSize={wide ? 20 : 22}
            fontWeight={700}
            fill={COLORS.secondaryInk}
          />
        </Node>
      ))}

      {/* Axis Titles */}
      <Txt
        x={originX - (wide ? 72 : 82)}
        y={(topY + botY) / 2}
        text="ASSET VALUE"
        rotation={-90}
        fontFamily={FONTS.data}
        fontSize={wide ? 18 : 20}
        fontWeight={700}
        fill={COLORS.secondaryInk}
        opacity={axesOpacity}
      />
      <Txt
        x={(originX + endX) / 2}
        y={botY + (wide ? 62 : 76)}
        text="TIME HORIZON (YEARS)"
        fontFamily={FONTS.data}
        fontSize={wide ? 18 : 22}
        fontWeight={700}
        fill={COLORS.secondaryInk}
        opacity={axesOpacity}
      />

      {/* ===== CURVE 1: 2000 TELECOM DARK FIBER (25-YEAR FLAT LINE) ===== */}
      <Line
        points={[
          [originX, topY + 20],
          [endX, topY + 45],
        ]}
        stroke={COLORS.compliantGreen}
        lineWidth={10}
        end={fiberLineEnd}
      />

      {/* Curve 1 Badge at right end */}
      <Rect
        x={endX - (wide ? 250 : 235)}
        y={topY - (wide ? 38 : 48)}
        opacity={fiberBadgeOpacity}
        scale={() => focalScale(focalId, 1, () => fiberBadgeScale(), time)}
        layout
        direction="row"
        alignItems="center"
        gap={14}
        padding={wide ? [12, 22] : [14, 22]}
        fill={COLORS.surface}
        stroke={COLORS.compliantGreen}
        lineWidth={3.5}
        radius={10}
      >
        <Img
          src={'/assets/vid_20261029_002/telecom_fiber_icon.png'}
          width={wide ? 50 : 54}
          height={wide ? 50 : 54}
        />
        <Txt
          text="2000 DARK FIBER: 25+ YR LIFE"
          fontFamily={FONTS.data}
          fontSize={wide ? 24 : 23}
          fontWeight={700}
          fill={COLORS.compliantGreen}
        />
      </Rect>

      {/* Funding Tag at left - Cleanly below the green Dark Fiber curve */}
      <Rect
        x={originX + (wide ? 280 : 245)}
        y={topY + (wide ? 76 : 88)}
        opacity={debtTagOpacity}
        scale={() => focalScale(focalId, 1, () => debtTagScale(), time)}
        layout
        padding={wide ? [8, 18] : [10, 20]}
        fill={COLORS.goldAccent}
        stroke={COLORS.surface}
        lineWidth={2}
        radius={8}
      >
        <Txt
          text="FUNDED BY JUNK DEBT"
          fontFamily={FONTS.data}
          fontSize={wide ? 22 : 22}
          fontWeight={700}
          fill={COLORS.surface}
        />
      </Rect>

      {/* Cash-Flow Tag - Cleanly to the right of red slope */}
      <Rect
        x={yr3X + (wide ? 240 : 195)}
        y={(topY + botY) / 2 - 10}
        opacity={cashTagOpacity}
        scale={() => focalScale(focalId, 2, () => cashTagScale(), time)}
        layout
        padding={wide ? [8, 18] : [10, 20]}
        fill={COLORS.ink}
        stroke={COLORS.surface}
        lineWidth={2}
        radius={8}
      >
        <Txt
          text="CASH-FLOW FUNDED • FAST DECAY"
          fontFamily={FONTS.data}
          fontSize={wide ? 22 : 22}
          fontWeight={700}
          fill={COLORS.surface}
        />
      </Rect>

      {/* ===== CURVE 2: 2026 AI GPU SERVERS (3-YEAR CLIFF) ===== */}
      <Line
        points={[
          [originX, topY + 20],
          [originX + (yr3X - originX) * 0.35, topY + 45],
          [yr3X, botY - 20],
          [endX - 100, botY - 10],
        ]}
        stroke={COLORS.accent}
        lineWidth={10}
        end={gpuLineEnd}
      />

      {/* Curve 2 Badge near cliff */}
      <Rect
        x={yr3X + (wide ? 260 : 205)}
        y={botY - (wide ? 95 : 110)}
        opacity={gpuBadgeOpacity}
        scale={() => focalScale(focalId, 2, () => gpuBadgeScale(), time)}
        layout
        direction="row"
        alignItems="center"
        gap={14}
        padding={wide ? [12, 22] : [14, 22]}
        fill={COLORS.surface}
        stroke={COLORS.accent}
        lineWidth={3.5}
        radius={10}
      >
        <Img
          src={'/assets/vid_20261029_002/nvidia_logo.png'}
          width={wide ? 50 : 54}
          height={wide ? 50 : 54}
        />
        <Txt
          text="2026 AI GPUS: 3-YR THERMAL CLIFF"
          fontFamily={FONTS.data}
          fontSize={wide ? 24 : 22}
          fontWeight={700}
          fill={COLORS.accent}
        />
      </Rect>
    </Node>
  );

  // --- Choreography (Total duration: 17.36s) ---

  // t = 0.4s: Quantitative axes + gridlines fade in
  yield* waitUntilSceneTime(0.4, t0);
  yield* axesOpacity(1.0, 0.6, easeOutExpo);

  // t = 2.8s: 2000 DARK FIBER badge pops in as narrator asks about telecom crash
  yield* waitUntilSceneTime(2.8, t0);
  yield* all(
    fiberBadgeOpacity(1.0, 0.2),
    fiberBadgeScale(1.14, 0.2, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
  );

  // t = 5.3s: FUNDED BY JUNK DEBT gold pill pops in as narrator says "telecoms use junk debt"
  yield* waitUntilSceneTime(5.3, t0);
  yield* all(
    debtTagOpacity(1.0, 0.2),
    debtTagScale(1.14, 0.2, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
  );

  // t = 7.0s: Green 2000 DARK FIBER curve draws across 25-yr horizon as narrator says "to lay dark fiber cables that lasted 25 years"
  yield* waitUntilSceneTime(7.0, t0);
  yield* fiberLineEnd(1.0, 1.5, easeOutExpo);

  // t = 10.0s: CASH-FLOW FUNDED • FAST DECAY badge pops in as narrator says "funding AI out of massive cash flows"
  yield* waitUntilSceneTime(10.0, t0);
  focalId(2);
  yield* all(
    cashTagOpacity(1.0, 0.2),
    cashTagScale(1.14, 0.2, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
  );

  // t = 12.4s: Red 2026 AI GPUS curve plunges down 3-year cliff as narrator says "buying fast rotting GPUs"
  yield* waitUntilSceneTime(12.4, t0);
  yield* gpuLineEnd(1.0, 1.2, easeOutExpo);

  // t = 13.9s: 2026 AI GPUS: 3-YR THERMAL CLIFF callout badge pops in as narrator says "lose value in just three years", finishes at t = 14.35s
  yield* waitUntilSceneTime(13.9, t0);
  yield* all(
    gpuBadgeOpacity(1.0, 0.2),
    gpuBadgeScale(1.14, 0.225, easeOutExpo).to(1.0, 0.225, easeInOutCubic),
  );

  // Strict Hold-Time: Diagram remains fully visible until 17.36s (hold >= 3.01s)
  yield* finishSceneAt(17.36, t0);
});

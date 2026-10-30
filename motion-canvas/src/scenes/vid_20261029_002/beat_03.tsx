import { Camera, Img, Line, makeScene2D, Node, Rect, Txt } from '@motion-canvas/2d';
import { all, createRef, createSignal, easeInOutCubic, easeOutExpo, useThread } from '@motion-canvas/core';
import { COLORS, FONTS, isWidescreen, setupBaseStage } from './layout';
import { finishSceneAt, waitUntilSceneTime } from './timings';

export default makeScene2D(function* (view) {
  const time = useThread().time;
  const t0 = time();

  // Setup Swiss Base Stage (Grid lines, section indicator, subtitle pill)
  setupBaseStage(view, '03 // THE DEPRECIATION CLOCK');

  const wide = isWidescreen(view);
  const trackLeft = wide ? -640 : -380;
  const trackRight = wide ? 640 : 380;
  const trackSpan = trackRight - trackLeft;

  const y1 = wide ? -150 : -240;
  const y2 = wide ? 110 : 140;
  const wallX = trackLeft + trackSpan * (2 / 6);

  // Animation signals
  const acctProgress = createSignal(0.0);
  const acctBadgeOpacity = createSignal(0.0);
  const acctBadgeScale = createSignal(0.8);

  const gpuTrackOpacity = createSignal(0.0);
  const gpuProgress = createSignal(0.0);
  const wallLineEnd = createSignal(0.0);

  const writeDownOpacity = createSignal(0.0);
  const writeDownScale = createSignal(0.8);

  const camera = createRef<Camera>();

  view.add(
    <Camera ref={camera}>
      {/* ===== TRACK 1: 10-K ACCOUNTING SCHEDULE ===== */}
      <Rect
        x={trackLeft}
        y={y1 - 65}
        offset={[-1, 0]}
        layout
        direction="row"
        alignItems="center"
        gap={14}
      >
        <Img
          src={'/assets/vid_20261029_002/bigtech_capex_badge.png'}
          width={90}
          height={45}
        />
        <Txt
          text="10-K ACCOUNTING SCHEDULE"
          fontFamily={FONTS.heading}
          fontSize={wide ? 34 : 24}
          fontWeight={700}
          fill={COLORS.ink}
        />
      </Rect>

      {/* Track 1 Background Rail */}
      <Line
        points={[
          [trackLeft, y1],
          [trackRight, y1],
        ]}
        stroke={COLORS.gridLine}
        lineWidth={8}
        lineCap="round"
      />

      {/* Track 1 Animated Gold Accounting Bar */}
      <Line
        points={() => [
          [trackLeft, y1],
          [trackLeft + trackSpan * acctProgress(), y1],
        ]}
        stroke={COLORS.goldAccent}
        lineWidth={16}
        lineCap="round"
        endArrow
        arrowSize={14}
      />

      {/* Track 1 Ticks: YR 0, YR 3, YR 6 */}
      {[0, 3, 6].map((yr) => {
        const tx = trackLeft + trackSpan * (yr / 6);
        return (
          <Node key={`t1-tick-${yr}`}>
            <Line
              points={[
                [tx, y1 - 10],
                [tx, y1 + 10],
              ]}
              stroke={COLORS.secondaryInk}
              lineWidth={2}
            />
            <Txt
              x={tx}
              y={y1 + 24}
              text={`YR ${yr}`}
              fontFamily={FONTS.data}
              fontSize={16}
              fontWeight={600}
              fill={COLORS.secondaryInk}
            />
          </Node>
        );
      })}

      {/* Track 1 Callout Pill at YR 6 */}
      <Rect
        x={wide ? trackRight - 110 : trackRight - 90}
        y={y1 - 55}
        opacity={acctBadgeOpacity}
        scale={acctBadgeScale}
        layout
        padding={[8, 16]}
        fill={COLORS.goldAccent}
        radius={6}
      >
        <Txt
          text="STRETCHED TO 6.0 YRS (BOOSTS EPS)"
          fontFamily={FONTS.data}
          fontSize={wide ? 20 : 14}
          fontWeight={700}
          fill={COLORS.surface}
        />
      </Rect>

      {/* ===== TRACK 2: PHYSICAL GPU SILICON CADENCE ===== */}
      <Rect
        x={trackLeft}
        y={y2 - 65}
        offset={[-1, 0]}
        layout
        direction="row"
        alignItems="center"
        gap={14}
        opacity={gpuTrackOpacity}
      >
        <Img
          src={'/assets/vid_20261029_002/nvidia_logo.png'}
          width={50}
          height={50}
        />
        <Txt
          text="PHYSICAL GPU SILICON CADENCE"
          fontFamily={FONTS.heading}
          fontSize={wide ? 34 : 24}
          fontWeight={700}
          fill={COLORS.ink}
        />
      </Rect>

      {/* Track 2 Background Rail */}
      <Line
        points={[
          [trackLeft, y2],
          [trackRight, y2],
        ]}
        stroke={COLORS.gridLine}
        lineWidth={8}
        lineCap="round"
        opacity={gpuTrackOpacity}
      />

      {/* Track 2 Active Silicon Bar Stopping at YR 2 */}
      <Line
        points={() => [
          [trackLeft, y2],
          [trackLeft + (wallX - trackLeft) * gpuProgress(), y2],
        ]}
        stroke={COLORS.accent}
        lineWidth={16}
        lineCap="round"
        opacity={gpuTrackOpacity}
      />

      {/* Track 2 Milestone Pins: YR 0: H100, YR 1: BLACKWELL, YR 2: RUBIN */}
      {[
        { yr: 0, label: 'YR 0: H100' },
        { yr: 1, label: wide ? 'YR 1: BLACKWELL' : 'YR 1: B200' },
        { yr: 2, label: wide ? 'YR 2: RUBIN WALL' : 'YR 2: RUBIN' },
      ].map((m) => {
        const mx = trackLeft + trackSpan * (m.yr / 6);
        return (
          <Node key={`m-${m.yr}`} opacity={gpuTrackOpacity}>
            <Line
              points={[
                [mx, y2 - 10],
                [mx, y2 + 10],
              ]}
              stroke={COLORS.accent}
              lineWidth={3}
            />
            <Txt
              x={mx}
              y={y2 + 26}
              text={m.label}
              fontFamily={FONTS.data}
              fontSize={wide ? 16 : 12}
              fontWeight={700}
              fill={COLORS.accent}
            />
          </Node>
        );
      })}

      {/* Vertical Red Obsolescence Wall at YR 2 */}
      <Line
        points={[
          [wallX, y1 - 20],
          [wallX, y2 + 70],
        ]}
        stroke={COLORS.accent}
        lineWidth={4}
        lineDash={[10, 8]}
        end={wallLineEnd}
      />

      {/* Red Danger Callout Spanning Unamortized Gap from YR 2 to YR 6 */}
      <Rect
        x={(wallX + trackRight) / 2}
        y={y2 + (wide ? 65 : 75)}
        opacity={writeDownOpacity}
        scale={writeDownScale}
        layout
        padding={[10, 20]}
        fill={COLORS.accent}
        stroke={COLORS.ink}
        lineWidth={2}
        radius={8}
      >
        <Txt
          text="4 UNUSED YRS = $100B+ WRITE-DOWNS"
          fontFamily={FONTS.data}
          fontSize={wide ? 24 : 17}
          fontWeight={700}
          fill={COLORS.surface}
        />
      </Rect>
    </Camera>
  );

  // --- Choreography (Total duration: 19.99s) ---

  // t = 2.5s: Track 1 fills to YR 3 (acctProgress: 0 -> 0.5)
  yield* waitUntilSceneTime(2.5, t0);
  yield* acctProgress(0.5, 1.2, easeOutExpo);

  // t = 5.8s: Track 1 stretches to YR 6 (acctProgress: 0.5 -> 1.0) + badge pops in
  yield* waitUntilSceneTime(5.8, t0);
  yield* all(
    acctProgress(1.0, 1.4, easeOutExpo),
    acctBadgeOpacity(1.0, 0.3),
    acctBadgeScale(1.14, 0.25, easeOutExpo).to(1.0, 0.25, easeInOutCubic),
  );

  // t = 8.8s: Track 2 fades in
  yield* waitUntilSceneTime(8.8, t0);
  yield* gpuTrackOpacity(1.0, 0.6, easeOutExpo);

  // t = 11.5s: GPU silicon bar races to YR 2
  yield* waitUntilSceneTime(11.5, t0);
  yield* gpuProgress(1.0, 1.2, easeOutExpo);

  // t = 14.0s: Vertical Red Obsolescence Wall drops
  yield* waitUntilSceneTime(14.0, t0);
  yield* wallLineEnd(1.0, 0.7, easeOutExpo);

  // t = 16.2s: Callout pops in with overshoot (1.14 -> 1.0), finishes at t = 16.8s
  yield* waitUntilSceneTime(16.2, t0);
  yield* all(
    writeDownOpacity(1.0, 0.25),
    writeDownScale(1.14, 0.3, easeOutExpo).to(1.0, 0.3, easeInOutCubic),
  );

  // Strict Hold-Time: Diagram remains fully visible until 19.99s (hold >= 3.1s)
  yield* finishSceneAt(19.99, t0);
});

import { Img, Line, makeScene2D, Node, Rect, Txt } from '@motion-canvas/2d';
import { all, createRef, createSignal, easeInOutCubic, easeOutExpo, useThread } from '@motion-canvas/core';
import { COLORS, FONTS, isWidescreen, setupBaseStage } from './layout';
import { finishSceneAt, focalScale, waitUntilSceneTime } from './timings';

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
  const focalId = createSignal(1);

  const t1Opacity = createSignal(0.0);
  const acctProgress = createSignal(0.0);
  const acctBadgeOpacity = createSignal(0.0);
  const acctBadgeScale = createSignal(0.8);

  const gpuTrackOpacity = createSignal(0.0);
  const gpuProgress = createSignal(0.0);
  const wallLineEnd = createSignal(0.0);

  const caliperEnd = createSignal(0.0);
  const writeDownOpacity = createSignal(0.0);
  const writeDownScale = createSignal(0.8);

  const camera = createRef<Node>();

  view.add(
    <Node ref={camera}>
      {/* ===== TRACK 1: 10-K ACCOUNTING SCHEDULE ===== */}
      <Node opacity={t1Opacity} scale={() => focalScale(focalId, 1, () => 1.0, time)}>
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
      </Node>

      {/* ===== TRACK 2: PHYSICAL GPU SILICON CADENCE ===== */}
      <Node opacity={gpuTrackOpacity} scale={() => focalScale(focalId, 2, () => 1.0, time)}>
        <Rect
          x={trackLeft}
          y={y2 - 65}
          offset={[-1, 0]}
          layout
          direction="row"
          alignItems="center"
          gap={14}
          fill={COLORS.bg}
          padding={[4, 10]}
          radius={4}
          zIndex={2}
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
        />

        {/* Track 2 Milestone Pins: YR 0: H100, YR 1: BLACKWELL, YR 2: RUBIN */}
        {[
          { yr: 0, label: 'YR 0: H100' },
          { yr: 1, label: wide ? 'YR 1: BLACKWELL' : 'YR 1: B200' },
          { yr: 2, label: wide ? 'YR 2: RUBIN WALL' : 'YR 2: RUBIN' },
        ].map((m) => {
          const mx = trackLeft + trackSpan * (m.yr / 6);
          return (
            <Node key={`m-${m.yr}`} zIndex={2}>
              <Line
                points={[
                  [mx, y2 - 10],
                  [mx, y2 + 10],
                ]}
                stroke={COLORS.accent}
                lineWidth={3}
              />
              <Rect x={mx} y={y2 + 28} layout padding={[3, 8]} fill={COLORS.bg} radius={4}>
                <Txt
                  text={m.label}
                  fontFamily={FONTS.data}
                  fontSize={wide ? 16 : 12}
                  fontWeight={700}
                  fill={COLORS.accent}
                />
              </Rect>
            </Node>
          );
        })}
      </Node>

      {/* Vertical Red Obsolescence Wall at YR 2 */}
      <Line
        points={[
          [wallX, y1 - 25],
          [wallX, y2 + 15],
        ]}
        stroke={COLORS.accent}
        lineWidth={4}
        lineDash={[10, 8]}
        end={wallLineEnd}
        zIndex={0}
      />

      {/* Horizontal Double-Arrow Caliper Line at YR 2 to YR 6 Gap */}
      <Line
        points={[
          [wallX + 10, (y1 + y2) / 2 + 10],
          [trackRight - 10, (y1 + y2) / 2 + 10],
        ]}
        stroke={COLORS.accent}
        lineWidth={3}
        lineDash={[6, 4]}
        startArrow
        endArrow
        arrowSize={8}
        end={caliperEnd}
        zIndex={0}
      />

      {/* Red Danger Callout Spanning Unamortized Gap from YR 2 to YR 6 */}
      <Rect
        x={(wallX + trackRight) / 2}
        y={y2 + (wide ? 72 : 78)}
        opacity={writeDownOpacity}
        scale={() => focalScale(focalId, 3, () => writeDownScale(), time)}
        layout
        padding={[10, 20]}
        fill={COLORS.accent}
        stroke={COLORS.ink}
        lineWidth={2}
        radius={8}
        zIndex={2}
      >
        <Txt
          text="4 UNUSED YRS = $100B+ WRITE-DOWNS"
          fontFamily={FONTS.data}
          fontSize={wide ? 24 : 17}
          fontWeight={700}
          fill={COLORS.surface}
        />
      </Rect>
    </Node>
  );

  // --- Choreography (Total duration: 19.99s) ---

  // t = 0.3s: Track 1 header + rail + ticks fade in as narrator says "The real time bomb sits on the balance sheet."
  yield* waitUntilSceneTime(0.3, t0);
  yield* t1Opacity(1.0, 0.5, easeOutExpo);

  // t = 2.8s: Track 1 gold bar fills to YR 3 as narrator says "Tech giants stretch their server depreciation"
  yield* waitUntilSceneTime(2.8, t0);
  yield* acctProgress(0.5, 1.2, easeOutExpo);

  // t = 5.0s: Track 1 gold bar stretches from YR 3 to YR 6
  yield* waitUntilSceneTime(5.0, t0);
  yield* acctProgress(1.0, 1.3, easeOutExpo);

  // t = 6.3s: STRETCHED TO 6.0 YRS badge pops in as narrator says "schedules to six full years to keep quarterly profits looking high."
  yield* waitUntilSceneTime(6.3, t0);
  yield* all(
    acctBadgeOpacity(1.0, 0.2),
    acctBadgeScale(1.14, 0.2, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
  );

  // t = 8.9s: Track 2 header, rail, milestone pins fade in as narrator says "But Nvidia launches a new GPU architecture"
  yield* waitUntilSceneTime(8.9, t0);
  focalId(2);
  yield* gpuTrackOpacity(1.0, 0.5, easeOutExpo);

  // t = 10.8s: Track 2 red silicon bar races to YR 2 as narrator says "every 12 to 24 months."
  yield* waitUntilSceneTime(10.8, t0);
  yield* gpuProgress(1.0, 1.3, easeOutExpo);

  // t = 13.0s: Vertical Red Obsolescence Wall drops at YR 2 as narrator says "When Blackwell and Rubin make older chips too power hungry"
  yield* waitUntilSceneTime(13.0, t0);
  yield* wallLineEnd(1.0, 0.7, easeOutExpo);

  // t = 15.8s: Horizontal 4-year gap caliper + 4 UNUSED YRS pill pops in as narrator says "hundreds of billions in silicon face sudden write-downs"
  yield* waitUntilSceneTime(15.8, t0);
  focalId(3);
  yield* all(
    caliperEnd(1.0, 0.5, easeOutExpo),
    writeDownOpacity(1.0, 0.2),
    writeDownScale(1.14, 0.3, easeOutExpo).to(1.0, 0.3, easeInOutCubic),
  );

  // Strict Hold-Time: Diagram remains fully visible until 19.99s (hold >= 3.59s)
  yield* finishSceneAt(19.99, t0);
});

import { Camera, Img, Line, makeScene2D, Rect, Txt } from '@motion-canvas/2d';
import { all, createRef, createSignal, easeInOutCubic, easeOutExpo, useThread } from '@motion-canvas/core';
import { COLORS, FONTS, isWidescreen, setupBaseStage } from './layout';
import { finishSceneAt, waitUntilSceneTime } from './timings';

export default makeScene2D(function* (view) {
  const time = useThread().time;
  const t0 = time();

  // Setup Swiss Base Stage (Grid lines, section indicator, subtitle pill)
  setupBaseStage(view, '02 // ROUND-TRIP REVENUE');

  const wide = isWidescreen(view);

  // Coordinates for Station A (Hyperscaler Cloud) & Station B (Frontier AI Labs)
  const hubAX = wide ? -460 : 0;
  const hubAY = wide ? -30 : -280;
  const hubBX = wide ? 460 : 0;
  const hubBY = wide ? -30 : 210;
  const hubW = wide ? 430 : 620;

  // Animation signals
  const hubAOpacity = createSignal(0);
  const hubAScale = createSignal(0.92);
  const hubAStroke = createSignal<string>(COLORS.ink);

  const hubBOpacity = createSignal(0);
  const hubBScale = createSignal(0.92);

  const outPathEnd = createSignal(0);
  const outBadgeOpacity = createSignal(0);

  const retPathEnd = createSignal(0);
  const retBadgeOpacity = createSignal(0);

  const loopAlertOpacity = createSignal(0);
  const loopAlertScale = createSignal(0.8);

  const camera = createRef<Camera>();

  // Orthogonal conduit points
  const outPoints: [number, number][] = wide
    ? [
        [hubAX + 120, hubAY - 95],
        [hubAX + 120, hubAY - 210],
        [hubBX - 120, hubBY - 210],
        [hubBX - 120, hubBY - 95],
      ]
    : [
        [-210, hubAY + 85],
        [-340, hubAY + 85],
        [-340, hubBY - 85],
        [-210, hubBY - 85],
      ];

  const retPoints: [number, number][] = wide
    ? [
        [hubBX - 120, hubBY + 95],
        [hubBX - 120, hubBY + 210],
        [hubAX + 120, hubAY + 210],
        [hubAX + 120, hubAY + 95],
      ]
    : [
        [210, hubBY - 85],
        [340, hubBY - 85],
        [340, hubAY + 85],
        [210, hubAY + 85],
      ];

  view.add(
    <Camera ref={camera}>
      {/* ===== OUTBOUND ORTHOGONAL CONDUIT (Top / Left) ===== */}
      <Line
        points={outPoints}
        stroke={COLORS.ink}
        lineWidth={5}
        radius={24}
        endArrow
        arrowSize={14}
        end={outPathEnd}
      />

      {/* Opaque Masked Label on Outbound Conduit */}
      <Rect
        x={wide ? 0 : -250}
        y={wide ? hubAY - 210 : (hubAY + hubBY) / 2 - 42}
        opacity={outBadgeOpacity}
        layout
        padding={[8, 16]}
        fill={COLORS.surface}
        stroke={COLORS.ink}
        lineWidth={2}
        radius={6}
      >
        <Txt
          text="$20B+ COMPUTE CREDITS"
          fontFamily={FONTS.data}
          fontSize={wide ? 20 : 15}
          fontWeight={700}
          fill={COLORS.ink}
        />
      </Rect>

      {/* ===== RETURN ORTHOGONAL CONDUIT (Bottom / Right) ===== */}
      <Line
        points={retPoints}
        stroke={COLORS.accent}
        lineWidth={5}
        lineDash={[14, 8]}
        radius={24}
        endArrow
        arrowSize={14}
        end={retPathEnd}
      />

      {/* Opaque Masked Label on Return Conduit */}
      <Rect
        x={wide ? 0 : 250}
        y={wide ? hubAY + 210 : (hubAY + hubBY) / 2 + 42}
        opacity={retBadgeOpacity}
        layout
        padding={[8, 16]}
        fill={COLORS.accent}
        stroke={COLORS.ink}
        lineWidth={2}
        radius={6}
      >
        <Txt
          text="100% RE-BOOKED AS CLOUD REVENUE"
          fontFamily={FONTS.data}
          fontSize={wide ? 20 : 14}
          fontWeight={700}
          fill={COLORS.surface}
        />
      </Rect>

      {/* ===== STATION A: HYPERSCALER CLOUD HUB ===== */}
      <Rect
        x={hubAX}
        y={hubAY}
        width={hubW}
        opacity={hubAOpacity}
        scale={hubAScale}
        layout
        direction="column"
        padding={[22, 26]}
        gap={12}
        fill={COLORS.surface}
        stroke={hubAStroke}
        lineWidth={3}
        radius={12}
      >
        <Rect layout direction="row" alignItems="center" justifyContent="space-between" width="100%">
          <Img
            src={'/assets/vid_20261029_002/aws_azure_badge.png'}
            width={92}
            height={46}
          />
          <Rect layout padding={[4, 10]} fill={COLORS.bg} radius={4}>
            <Txt
              text="STATION 01"
              fontFamily={FONTS.data}
              fontSize={14}
              fontWeight={700}
              fill={COLORS.secondaryInk}
            />
          </Rect>
        </Rect>
        <Txt
          text="HYPERSCALER CLOUD"
          fontFamily={FONTS.heading}
          fontSize={wide ? 28 : 24}
          fontWeight={700}
          fill={COLORS.ink}
        />
        <Txt
          text="MICROSOFT AZURE • AMAZON AWS"
          fontFamily={FONTS.data}
          fontSize={15}
          fontWeight={600}
          fill={COLORS.secondaryInk}
        />
      </Rect>

      {/* ===== STATION B: FRONTIER AI LABS HUB ===== */}
      <Rect
        x={hubBX}
        y={hubBY}
        width={hubW}
        opacity={hubBOpacity}
        scale={hubBScale}
        layout
        direction="column"
        padding={[22, 26]}
        gap={12}
        fill={COLORS.surface}
        stroke={COLORS.ink}
        lineWidth={3}
        radius={12}
      >
        <Rect layout direction="row" alignItems="center" justifyContent="space-between" width="100%">
          <Img
            src={'/assets/vid_20261029_002/openai_logo.png'}
            width={44}
            height={44}
          />
          <Rect layout padding={[4, 10]} fill={COLORS.bg} radius={4}>
            <Txt
              text="STATION 02"
              fontFamily={FONTS.data}
              fontSize={14}
              fontWeight={700}
              fill={COLORS.secondaryInk}
            />
          </Rect>
        </Rect>
        <Txt
          text="FRONTIER AI LABS"
          fontFamily={FONTS.heading}
          fontSize={wide ? 28 : 24}
          fontWeight={700}
          fill={COLORS.ink}
        />
        <Txt
          text="OPENAI • ANTHROPIC CLUSTER SPEND"
          fontFamily={FONTS.data}
          fontSize={15}
          fontWeight={600}
          fill={COLORS.secondaryInk}
        />
      </Rect>

      {/* ===== CENTER ROUND-TRIP VERDICT BADGE ===== */}
      <Rect
        x={0}
        y={wide ? hubAY : (hubAY + hubBY) / 2}
        opacity={loopAlertOpacity}
        scale={loopAlertScale}
        layout
        direction="column"
        alignItems="center"
        padding={[12, 22]}
        gap={4}
        fill={COLORS.ink}
        stroke={COLORS.accent}
        lineWidth={3}
        radius={8}
      >
        <Txt
          text="ROUND-TRIPPING"
          fontFamily={FONTS.heading}
          fontSize={wide ? 24 : 20}
          fontWeight={700}
          fill={COLORS.surface}
        />
        <Txt
          text="ZERO EXTERNAL CASH FLOW"
          fontFamily={FONTS.data}
          fontSize={wide ? 14 : 13}
          fontWeight={700}
          fill={COLORS.accent}
        />
      </Rect>
    </Camera>
  );

  // --- Choreography (Total duration: 21.27s) ---

  // t = 1.2s: Both Hub Stations appear on canvas
  yield* waitUntilSceneTime(1.2, t0);
  yield* all(
    hubAOpacity(1, 0.5, easeOutExpo),
    hubAScale(1, 0.5, easeOutExpo),
    hubBOpacity(1, 0.5, easeOutExpo),
    hubBScale(1, 0.5, easeOutExpo),
  );

  // t = 4.8s: Outbound conduit draws from Station A -> Station B ($20B+ Compute Credits)
  yield* waitUntilSceneTime(4.8, t0);
  yield* all(
    outPathEnd(1, 1.4, easeInOutCubic),
    outBadgeOpacity(1, 0.5),
  );

  // t = 10.5s: Return conduit draws back from Station B -> Station A (100% Re-booked as Cloud Revenue)
  yield* waitUntilSceneTime(10.5, t0);
  yield* all(
    retPathEnd(1, 1.4, easeInOutCubic),
    retBadgeOpacity(1, 0.5),
    hubAStroke(COLORS.accent, 0.6),
  );

  // t = 15.8s: Center "ROUND-TRIPPING // ZERO EXTERNAL CASH FLOW" verdict badge locks in (finishes ~16.4s)
  yield* waitUntilSceneTime(15.8, t0);
  yield* all(
    loopAlertOpacity(1, 0.25),
    loopAlertScale(1.14, 0.3, easeOutExpo).to(1.0, 0.25, easeInOutCubic),
  );

  // Strict Hold-Time: Diagram remains fully visible until 21.27s (hold >= 4.8s)
  yield* finishSceneAt(21.27, t0);
});

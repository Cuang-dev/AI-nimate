import { Img, Line, makeScene2D, Node, Rect, Txt } from '@motion-canvas/2d';
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
  const hubAScale = createSignal(0.85);
  const hubAStroke = createSignal<string>(COLORS.ink);

  const hubBOpacity = createSignal(0);
  const hubBScale = createSignal(0.85);

  const outPathEnd = createSignal(0);
  const outBadgeOpacity = createSignal(0);
  const outBadgeScale = createSignal(0.8);

  const retPathEnd = createSignal(0);
  const retBadgeOpacity = createSignal(0);
  const retBadgeScale = createSignal(0.8);

  const loopAlertOpacity = createSignal(0);
  const loopAlertScale = createSignal(0.8);

  const camera = createRef<Node>();

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
    <Node ref={camera}>
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
        scale={outBadgeScale}
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
        lineDashOffset={() => -time() * 45}
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
        scale={retBadgeScale}
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
    </Node>
  );

  // --- Choreography (Total duration: 21.27s) ---

  // t = 0.8s: Station A (HYPERSCALER CLOUD) pops/fades in
  yield* waitUntilSceneTime(0.8, t0);
  yield* all(
    hubAOpacity(1, 0.4, easeOutExpo),
    hubAScale(1, 0.6, easeOutExpo),
  );

  // t = 2.6s: Station B (FRONTIER AI LABS) pops/fades in
  yield* waitUntilSceneTime(2.6, t0);
  yield* all(
    hubBOpacity(1, 0.4, easeOutExpo),
    hubBScale(1, 0.6, easeOutExpo),
  );

  // t = 5.0s: Outbound orthogonal conduit draws from Station A to Station B
  yield* waitUntilSceneTime(5.0, t0);
  yield* outPathEnd(1, 1.3, easeInOutCubic);

  // t = 7.4s: $20B+ COMPUTE CREDITS masked badge pops in on outbound conduit
  yield* waitUntilSceneTime(7.4, t0);
  yield* all(
    outBadgeOpacity(1, 0.2),
    outBadgeScale(1.12, 0.25, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
  );

  // t = 10.2s: Return orthogonal conduit draws back from Station B to Station A + Station A stroke turns red
  yield* waitUntilSceneTime(10.2, t0);
  yield* all(
    retPathEnd(1, 1.3, easeInOutCubic),
    hubAStroke(COLORS.accent, 0.8),
  );

  // t = 12.8s: 100% RE-BOOKED AS CLOUD REVENUE masked badge pops in on return conduit
  yield* waitUntilSceneTime(12.8, t0);
  yield* all(
    retBadgeOpacity(1, 0.2),
    retBadgeScale(1.12, 0.25, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
  );

  // t = 15.6s: Center "ROUND-TRIPPING // ZERO EXTERNAL CASH FLOW" verdict stamp locks in (finishes at 16.2s)
  yield* waitUntilSceneTime(15.6, t0);
  yield* all(
    loopAlertOpacity(1, 0.2),
    loopAlertScale(1.14, 0.3, easeOutExpo).to(1.0, 0.3, easeInOutCubic),
  );

  // Strict Hold-Time: Diagram remains fully visible until 21.27s (hold = 5.07s)
  yield* finishSceneAt(21.27, t0);
});

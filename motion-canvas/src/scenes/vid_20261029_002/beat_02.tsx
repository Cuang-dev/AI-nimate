import { Img, Line, makeScene2D, Node, Rect, Txt } from '@motion-canvas/2d';
import { all, createRef, createSignal, easeInOutCubic, easeOutExpo, useThread } from '@motion-canvas/core';
import { COLORS, FONTS, isWidescreen, setupBaseStage } from './layout';
import { finishSceneAt, focalScale, waitUntilSceneTime } from './timings';

export default makeScene2D(function* (view) {
  const time = useThread().time;
  const t0 = time();

  // Setup Swiss Base Stage (Grid lines, section indicator, subtitle pill)
  setupBaseStage(view, '02 // ROUND-TRIP REVENUE');

  const wide = isWidescreen(view);

  // Coordinates for Station A (Hyperscaler Cloud) & Station B (Frontier AI Labs)
  const hubAX = wide ? -480 : 0;
  const hubAY = wide ? -20 : -390;
  const hubBX = wide ? 480 : 0;
  const hubBY = wide ? -20 : 280;
  const hubW = wide ? 490 : 860;

  // Animation signals
  const focalId = createSignal(0);

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
        [hubAX + 120, hubAY - 115],
        [hubAX + 120, hubAY - 245],
        [hubBX - 120, hubBY - 245],
        [hubBX - 120, hubBY - 115],
      ]
    : [
        [-260, hubAY + 115],
        [-390, hubAY + 115],
        [-390, hubBY - 115],
        [-260, hubBY - 115],
      ];

  const retPoints: [number, number][] = wide
    ? [
        [hubBX - 120, hubBY + 115],
        [hubBX - 120, hubBY + 245],
        [hubAX + 120, hubAY + 245],
        [hubAX + 120, hubAY + 115],
      ]
    : [
        [260, hubBY - 115],
        [390, hubBY - 115],
        [390, hubAY + 115],
        [260, hubAY + 115],
      ];

  view.add(
    <Node ref={camera}>
      {/* ===== OUTBOUND ORTHOGONAL CONDUIT (Top / Left) ===== */}
      <Line
        points={outPoints}
        stroke={COLORS.ink}
        lineWidth={6}
        radius={24}
        endArrow
        arrowSize={16}
        end={outPathEnd}
      />

      {/* Opaque Masked Label on Outbound Conduit */}
      <Rect
        x={wide ? 0 : -170}
        y={wide ? hubAY - 245 : -175}
        opacity={outBadgeOpacity}
        scale={() => focalScale(focalId, 4, outBadgeScale, time)}
        layout
        padding={wide ? [10, 20] : [12, 22]}
        fill={COLORS.surface}
        stroke={COLORS.ink}
        lineWidth={3}
        radius={8}
      >
        <Txt
          text="$20B+ COMPUTE CREDITS"
          fontFamily={FONTS.data}
          fontSize={wide ? 22 : 23}
          fontWeight={700}
          fill={COLORS.ink}
        />
      </Rect>

      {/* ===== RETURN ORTHOGONAL CONDUIT (Bottom / Right) ===== */}
      <Line
        points={retPoints}
        stroke={COLORS.accent}
        lineWidth={6}
        lineDash={[14, 8]}
        lineDashOffset={() => -time() * 45}
        radius={24}
        endArrow
        arrowSize={16}
        end={retPathEnd}
      />

      {/* Opaque Masked Label on Return Conduit */}
      <Rect
        x={wide ? 0 : 120}
        y={wide ? hubAY + 245 : 65}
        opacity={retBadgeOpacity}
        scale={() => focalScale(focalId, 5, retBadgeScale, time)}
        layout
        padding={wide ? [10, 20] : [12, 22]}
        fill={COLORS.accent}
        stroke={COLORS.ink}
        lineWidth={3}
        radius={8}
      >
        <Txt
          text={wide ? '100% RE-BOOKED AS CLOUD REVENUE' : '100% RE-BOOKED AS CLOUD REV'}
          fontFamily={FONTS.data}
          fontSize={wide ? 22 : 22}
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
        scale={() => focalScale(focalId, 1, hubAScale, time)}
        layout
        direction="column"
        padding={wide ? [26, 30] : [30, 36]}
        gap={wide ? 14 : 16}
        fill={COLORS.surface}
        stroke={hubAStroke}
        lineWidth={3.5}
        radius={14}
      >
        <Rect layout direction="row" alignItems="center" justifyContent="space-between" width="100%">
          <Img
            src={'/assets/vid_20261029_002/aws_azure_badge.png'}
            width={wide ? 116 : 140}
            height={wide ? 58 : 70}
          />
          <Rect layout padding={[6, 14]} fill={COLORS.bg} radius={4}>
            <Txt
              text="STATION 01"
              fontFamily={FONTS.data}
              fontSize={wide ? 17 : 20}
              fontWeight={700}
              fill={COLORS.secondaryInk}
            />
          </Rect>
        </Rect>
        <Txt
          text="HYPERSCALER CLOUD"
          fontFamily={FONTS.heading}
          fontSize={wide ? 32 : 38}
          fontWeight={700}
          fill={COLORS.ink}
        />
        <Txt
          text="MICROSOFT AZURE • AMAZON AWS"
          fontFamily={FONTS.data}
          fontSize={wide ? 18 : 22}
          fontWeight={700}
          fill={COLORS.secondaryInk}
        />
      </Rect>

      {/* ===== STATION B: FRONTIER AI LABS HUB ===== */}
      <Rect
        x={hubBX}
        y={hubBY}
        width={hubW}
        opacity={hubBOpacity}
        scale={() => focalScale(focalId, 2, hubBScale, time)}
        layout
        direction="column"
        padding={wide ? [26, 30] : [30, 36]}
        gap={wide ? 14 : 16}
        fill={COLORS.surface}
        stroke={COLORS.ink}
        lineWidth={3.5}
        radius={14}
      >
        <Rect layout direction="row" alignItems="center" justifyContent="space-between" width="100%">
          <Img
            src={'/assets/vid_20261029_002/openai_logo.png'}
            width={wide ? 58 : 70}
            height={wide ? 58 : 70}
          />
          <Rect layout padding={[6, 14]} fill={COLORS.bg} radius={4}>
            <Txt
              text="STATION 02"
              fontFamily={FONTS.data}
              fontSize={wide ? 17 : 20}
              fontWeight={700}
              fill={COLORS.secondaryInk}
            />
          </Rect>
        </Rect>
        <Txt
          text="FRONTIER AI LABS"
          fontFamily={FONTS.heading}
          fontSize={wide ? 32 : 38}
          fontWeight={700}
          fill={COLORS.ink}
        />
        <Txt
          text="OPENAI • ANTHROPIC CLUSTER SPEND"
          fontFamily={FONTS.data}
          fontSize={wide ? 18 : 22}
          fontWeight={700}
          fill={COLORS.secondaryInk}
        />
      </Rect>

      {/* ===== CENTER ROUND-TRIP VERDICT BADGE ===== */}
      <Rect
        x={0}
        y={wide ? hubAY : -55}
        opacity={loopAlertOpacity}
        scale={() => focalScale(focalId, 3, loopAlertScale, time)}
        layout
        direction="column"
        alignItems="center"
        padding={wide ? [14, 26] : [16, 28]}
        gap={6}
        fill={COLORS.ink}
        stroke={COLORS.accent}
        lineWidth={3.5}
        radius={10}
      >
        <Txt
          text="ROUND-TRIPPING"
          fontFamily={FONTS.heading}
          fontSize={wide ? 28 : 30}
          fontWeight={700}
          fill={COLORS.surface}
        />
        <Txt
          text="ZERO EXTERNAL CASH FLOW"
          fontFamily={FONTS.data}
          fontSize={wide ? 17 : 20}
          fontWeight={700}
          fill={COLORS.accent}
        />
      </Rect>
    </Node>
  );

  // --- Choreography (Total duration: 21.27s) ---

  // t = 0.4s: Station A pops in as narrator asks "Why does cloud revenue look so booming anyway?"
  yield* waitUntilSceneTime(0.4, t0);
  focalId(1);
  yield* all(
    hubAOpacity(1, 0.4, easeOutExpo),
    hubAScale(1, 0.6, easeOutExpo),
  );

  // t = 3.2s: Center ROUND-TRIPPING badge pops in as narrator says "Because of a Wall Street illusion called round-tripping"
  yield* waitUntilSceneTime(3.2, t0);
  focalId(3);
  yield* all(
    loopAlertOpacity(1, 0.2),
    loopAlertScale(1.14, 0.3, easeOutExpo).to(1.0, 0.25, easeInOutCubic),
  );

  // t = 6.2s: Station B pops in as narrator says "Hyperscalers invest tens of billions into AI labs like OpenAI and Anthropic"
  yield* waitUntilSceneTime(6.2, t0);
  focalId(2);
  yield* all(
    hubBOpacity(1, 0.4, easeOutExpo),
    hubBScale(1, 0.6, easeOutExpo),
  );

  // t = 8.6s: Outbound orthogonal conduit draws from Station A to Station B
  yield* waitUntilSceneTime(8.6, t0);
  yield* outPathEnd(1, 1.4, easeInOutCubic);

  // t = 11.2s: $20B+ COMPUTE CREDITS badge pops in as narrator says "not just in cash, but in cloud compute credits"
  yield* waitUntilSceneTime(11.2, t0);
  focalId(4);
  yield* all(
    outBadgeOpacity(1, 0.2),
    outBadgeScale(1.14, 0.3, easeOutExpo).to(1.0, 0.25, easeInOutCubic),
  );

  // t = 13.7s: Return conduit draws back as narrator says "When those startups burn those credits training models on Azure or AWS"
  yield* waitUntilSceneTime(13.7, t0);
  yield* retPathEnd(1, 1.4, easeInOutCubic);

  // t = 16.8s: 100% RE-BOOKED AS CLOUD REVENUE badge pops in & Station A stroke turns accent (finishes at 17.4s)
  yield* waitUntilSceneTime(16.8, t0);
  focalId(5);
  yield* all(
    retBadgeOpacity(1, 0.2),
    retBadgeScale(1.14, 0.3, easeOutExpo).to(1.0, 0.3, easeInOutCubic),
    hubAStroke(COLORS.accent, 0.6),
  );

  // Strict Hold-Time: Diagram remains fully visible until 21.27s (hold = 3.87s)
  yield* finishSceneAt(21.27, t0);
});

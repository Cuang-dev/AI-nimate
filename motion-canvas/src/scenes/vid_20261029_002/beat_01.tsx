import { Img, Line, makeScene2D, Node, Rect, Txt } from '@motion-canvas/2d';
import { all, createRef, createSignal, easeInOutCubic, easeOutExpo, useThread } from '@motion-canvas/core';
import { COLORS, FONTS, isWidescreen, setupBaseStage } from './layout';
import { finishSceneAt, focalScale, waitUntilSceneTime } from './timings';

export default makeScene2D(function* (view) {
  const time = useThread().time;
  const t0 = time();

  // Setup Swiss Base Stage (Grid lines, section indicator, subtitle pill)
  setupBaseStage(view, '01 // THE $600B CHASM');

  const wide = isWidescreen(view);
  const baseY = wide ? 185 : 320;
  const colSpan = wide ? 680 : 475;
  const leftX = wide ? -460 : -320;
  const midX = 0;
  const rightX = wide ? 460 : 320;
  const barWidth = wide ? 220 : 210;

  const maxCapexH = wide ? 250 : 390;
  const maxReqH = wide ? 460 : 730;
  const maxRevH = wide ? 40 : 60;

  // Animation signals
  const focalId = createSignal(0);
  const baselineEnd = createSignal(0);

  const capexBarH = createSignal(0);
  const capexVal = createSignal(0);
  const capexOpacity = createSignal(0);
  const capexSubOpacity = createSignal(0);
  const capexBadgeOpacity = createSignal(0);
  const capexBadgeScale = createSignal(0.85);

  const reqBarH = createSignal(0);
  const reqVal = createSignal(320);
  const reqOpacity = createSignal(0);
  const reqSubOpacity = createSignal(0);
  const reqSubScale = createSignal(0.8);

  const revBarH = createSignal(0);
  const revOpacity = createSignal(0);

  const caliperEnd = createSignal(0);
  const chasmBadgeOpacity = createSignal(0);
  const chasmBadgeScale = createSignal(0.8);

  const camera = createRef<Node>();

  view.add(
    <Node ref={camera}>
      {/* Horizontal Baseline */}
      <Line
        points={[
          [-colSpan, baseY],
          [colSpan, baseY],
        ]}
        stroke={COLORS.ink}
        lineWidth={4}
        lineCap="round"
        end={baselineEnd}
      />

      {/* ===== PILLAR 1: $320B/YR AI CAPEX (Left) ===== */}
      <Node scale={() => focalScale(focalId, 1, () => 1, time)}>
        {/* Growing Dark Slate Bar */}
        <Rect
          x={leftX}
          y={baseY}
          offset={[0, 1]}
          width={barWidth}
          height={() => capexBarH()}
          fill={COLORS.ink}
          opacity={capexOpacity}
          radius={[8, 8, 0, 0]}
        />
        {/* Live Value Label Above Bar */}
        <Txt
          x={leftX}
          y={() => baseY - capexBarH() - 32}
          text={() => `$${Math.round(capexVal())}B/YR`}
          fontFamily={FONTS.data}
          fontSize={wide ? 44 : 40}
          fontWeight={700}
          fill={COLORS.ink}
          opacity={capexOpacity}
        />
        {/* Label & Badge Below Baseline */}
        <Rect
          x={leftX}
          y={baseY + (wide ? 64 : 84)}
          opacity={capexSubOpacity}
          layout
          direction="column"
          alignItems="center"
          gap={wide ? 8 : 10}
        >
          <Txt
            text="AI CAPEX SPEND"
            fontFamily={FONTS.heading}
            fontSize={wide ? 26 : 26}
            fontWeight={700}
            fill={COLORS.ink}
          />
          <Txt
            text={wide ? '2025–2026 HYPERSCALERS' : 'HYPERSCALERS'}
            fontFamily={FONTS.data}
            fontSize={wide ? 16 : 18}
            fontWeight={700}
            fill={COLORS.secondaryInk}
          />
          <Img
            src={'/assets/vid_20261029_002/bigtech_capex_badge.png'}
            width={wide ? 116 : 128}
            height={wide ? 58 : 64}
            opacity={capexBadgeOpacity}
            scale={capexBadgeScale}
          />
        </Rect>
      </Node>

      {/* ===== PILLAR 2: $600B REQ TARGET (Center) ===== */}
      <Node
        opacity={reqOpacity}
        scale={() => focalScale(focalId, 2, () => 1, time)}
      >
        {/* Dashed Gold Target Bar */}
        <Rect
          x={midX}
          y={baseY}
          offset={[0, 1]}
          width={barWidth}
          height={() => reqBarH()}
          fill={'rgba(217, 119, 6, 0.14)'}
          stroke={COLORS.goldAccent}
          lineWidth={4}
          lineDash={[10, 8]}
          radius={[8, 8, 0, 0]}
        />
        {/* Live Value Label Above Target Bar */}
        <Txt
          x={midX}
          y={() => baseY - reqBarH() - 32}
          text={() => `$${Math.round(reqVal())}B REQ`}
          fontFamily={FONTS.data}
          fontSize={wide ? 44 : 40}
          fontWeight={700}
          fill={COLORS.goldAccent}
        />
        {/* Target Sub-Badge Below Baseline */}
        <Rect
          x={midX}
          y={baseY + (wide ? 64 : 84)}
          opacity={reqSubOpacity}
          scale={reqSubScale}
          layout
          direction="column"
          alignItems="center"
          gap={wide ? 10 : 12}
        >
          <Txt
            text="2X TCO TARGET"
            fontFamily={FONTS.heading}
            fontSize={wide ? 26 : 26}
            fontWeight={700}
            fill={COLORS.goldAccent}
          />
          <Rect
            layout
            padding={wide ? [6, 14] : [8, 14]}
            fill={COLORS.goldAccent}
            radius={6}
          >
            <Txt
              text={wide ? 'SEQUOIA BENCHMARK' : 'SEQUOIA 2X RULE'}
              fontFamily={FONTS.data}
              fontSize={wide ? 17 : 18}
              fontWeight={700}
              fill={COLORS.surface}
            />
          </Rect>
        </Rect>
      </Node>

      {/* ===== PILLAR 3: < $45B ACTUAL AI REVENUE (Right) ===== */}
      <Node
        opacity={revOpacity}
        scale={() => focalScale(focalId, 3, () => 1, time)}
      >
        {/* Tiny Red Revenue Block */}
        <Rect
          x={rightX}
          y={baseY}
          offset={[0, 1]}
          width={barWidth}
          height={() => revBarH()}
          fill={COLORS.accent}
          radius={[6, 6, 0, 0]}
        />
        {/* Value Label Above Revenue Bar */}
        <Txt
          x={rightX}
          y={() => baseY - revBarH() - 30}
          text="< $45B"
          fontFamily={FONTS.data}
          fontSize={wide ? 42 : 40}
          fontWeight={700}
          fill={COLORS.accent}
        />
        {/* Label & OpenAI Logo Below Baseline */}
        <Rect
          x={rightX}
          y={baseY + (wide ? 64 : 84)}
          layout
          direction="column"
          alignItems="center"
          gap={wide ? 10 : 12}
        >
          <Txt
            text="ACTUAL AI REV"
            fontFamily={FONTS.heading}
            fontSize={wide ? 26 : 26}
            fontWeight={700}
            fill={COLORS.accent}
          />
          <Img
            src={'/assets/vid_20261029_002/openai_logo.png'}
            width={wide ? 54 : 64}
            height={wide ? 54 : 64}
          />
        </Rect>
      </Node>

      {/* ===== CHASM CALIPER & $555B DEFICIT CALLOUT ===== */}
      {/* Top Horizontal Reference Projection Line from $600B Top to Right Pillar */}
      <Line
        points={[
          [midX + barWidth / 2, baseY - maxReqH],
          [rightX, baseY - maxReqH],
        ]}
        stroke={COLORS.accent}
        lineWidth={3.5}
        lineDash={[8, 8]}
        end={caliperEnd}
      />

      {/* Vertical Double-Arrow Caliper Measuring the $555B Chasm */}
      <Line
        points={[
          [rightX, baseY - maxReqH + 10],
          [rightX, baseY - maxRevH - 64],
        ]}
        stroke={COLORS.accent}
        lineWidth={5}
        startArrow
        endArrow
        arrowSize={14}
        end={caliperEnd}
      />

      {/* Opaque Masked Callout Pill Centered Over the Chasm */}
      <Rect
        x={wide ? rightX - 95 : rightX - 45}
        y={wide ? baseY - maxReqH * 0.54 : baseY - maxReqH * 0.56}
        opacity={chasmBadgeOpacity}
        scale={() => focalScale(focalId, 4, chasmBadgeScale, time)}
        layout
        direction="column"
        alignItems="center"
        padding={wide ? [14, 24] : [16, 22]}
        gap={6}
        fill={COLORS.accent}
        stroke={COLORS.ink}
        lineWidth={3}
        radius={10}
      >
        <Txt
          text="$555B REVENUE CHASM"
          fontFamily={FONTS.data}
          fontSize={wide ? 28 : 26}
          fontWeight={700}
          fill={COLORS.surface}
        />
        <Txt
          text="92% SHORTFALL VS CAPEX TARGET"
          fontFamily={FONTS.data}
          fontSize={wide ? 18 : 18}
          fontWeight={600}
          fill={COLORS.surface}
        />
      </Rect>
    </Node>
  );

  // --- Choreography (Total duration: 26.38s) ---

  // t = 0.4s: Baseline draws across stage
  yield* waitUntilSceneTime(0.4, t0);
  yield* baselineEnd(1, 0.7, easeOutExpo);

  // t = 2.1s: Left Pillar base label fades in as narrator says "what is actually inflating"
  yield* waitUntilSceneTime(2.1, t0);
  focalId(1);
  yield* capexSubOpacity(1, 0.5);

  // t = 5.6s: Left Pillar outline/stub appears as narrator says "Between 2025 and 2026"
  yield* waitUntilSceneTime(5.6, t0);
  yield* all(
    capexOpacity(1, 0.3),
    capexBarH(24, 0.4, easeOutExpo),
    capexVal(50, 0.4, easeOutExpo),
  );

  // t = 8.2s: Big Tech capex badge pops in as narrator names "Microsoft, Meta, Google, and Amazon"
  yield* waitUntilSceneTime(8.2, t0);
  yield* all(
    capexBadgeOpacity(1, 0.15),
    capexBadgeScale(1.15, 0.25, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
  );

  // t = 10.6s: Left Pillar rockets up to maxCapexH as narrator says "over $320 billion a year"
  yield* waitUntilSceneTime(10.6, t0);
  yield* all(
    capexBarH(maxCapexH, 2.0, easeOutExpo),
    capexVal(320, 2.0, easeOutExpo),
  );

  // t = 15.2s: Center Pillar rises to maxReqH as narrator says "according to Sequoia's famous $600 billion formula"
  yield* waitUntilSceneTime(15.2, t0);
  focalId(2);
  yield* all(
    reqOpacity(1, 0.3),
    reqSubOpacity(1, 0.4),
    reqSubScale(1.14, 0.35, easeOutExpo).to(1.0, 0.25, easeInOutCubic),
    reqBarH(maxReqH, 2.1, easeOutExpo),
    reqVal(600, 2.1, easeOutExpo),
  );

  // t = 19.0s: Right Pillar pops in as narrator says "all pure play AI software today earns less than $45 billion"
  yield* waitUntilSceneTime(19.0, t0);
  focalId(3);
  yield* all(
    revOpacity(1, 0.3),
    revBarH(maxRevH, 0.9, easeOutExpo),
  );

  // t = 21.8s: Red Chasm Caliper draws & $555B pill pops in (finishes at 22.9s)
  yield* waitUntilSceneTime(21.8, t0);
  focalId(4);
  yield* all(
    caliperEnd(1, 0.7, easeOutExpo),
    chasmBadgeOpacity(1, 0.2),
    chasmBadgeScale(1.14, 0.6, easeOutExpo).to(1.0, 0.5, easeInOutCubic),
  );

  // Strict Hold-Time: Diagram remains fully visible until 26.38s (hold = 3.48s)
  yield* finishSceneAt(26.38, t0);
});

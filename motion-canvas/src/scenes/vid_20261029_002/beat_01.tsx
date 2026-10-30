import { Img, Line, makeScene2D, Node, Rect, Txt } from '@motion-canvas/2d';
import { all, createRef, createSignal, easeInOutCubic, easeOutExpo, useThread } from '@motion-canvas/core';
import { COLORS, FONTS, isWidescreen, setupBaseStage } from './layout';
import { finishSceneAt, waitUntilSceneTime } from './timings';

export default makeScene2D(function* (view) {
  const time = useThread().time;
  const t0 = time();

  // Setup Swiss Base Stage (Grid lines, section indicator, subtitle pill)
  setupBaseStage(view, '01 // THE $600B CHASM');

  const wide = isWidescreen(view);
  const baseY = wide ? 190 : 310;
  const colSpan = wide ? 640 : 410;
  const leftX = wide ? -440 : -270;
  const midX = 0;
  const rightX = wide ? 440 : 270;
  const barWidth = wide ? 200 : 155;

  const maxCapexH = wide ? 240 : 290;
  const maxReqH = wide ? 440 : 540;
  const maxRevH = wide ? 36 : 44;

  // Animation signals
  const baselineEnd = createSignal(0);

  const capexBarH = createSignal(0);
  const capexVal = createSignal(0);
  const capexOpacity = createSignal(0);
  const capexSubOpacity = createSignal(0);
  const capexSubScale = createSignal(0.8);

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
      <Node opacity={capexOpacity}>
        {/* Growing Dark Slate Bar */}
        <Rect
          x={leftX}
          y={baseY}
          offset={[0, 1]}
          width={barWidth}
          height={() => capexBarH()}
          fill={COLORS.ink}
          radius={[8, 8, 0, 0]}
        />
        {/* Live Value Label Above Bar */}
        <Txt
          x={leftX}
          y={() => baseY - capexBarH() - 28}
          text={() => `$${Math.round(capexVal())}B/YR`}
          fontFamily={FONTS.data}
          fontSize={wide ? 38 : 28}
          fontWeight={700}
          fill={COLORS.ink}
        />
        {/* Label & Badge Below Baseline */}
        <Rect
          x={leftX}
          y={baseY + 54}
          opacity={capexSubOpacity}
          scale={capexSubScale}
          layout
          direction="column"
          alignItems="center"
          gap={8}
        >
          <Txt
            text="AI CAPEX SPEND"
            fontFamily={FONTS.heading}
            fontSize={wide ? 22 : 17}
            fontWeight={700}
            fill={COLORS.ink}
          />
          <Img
            src={'/assets/vid_20261029_002/bigtech_capex_badge.png'}
            width={wide ? 96 : 80}
            height={wide ? 48 : 40}
          />
        </Rect>
      </Node>

      {/* ===== PILLAR 2: $600B REQ TARGET (Center) ===== */}
      <Node opacity={reqOpacity}>
        {/* Dashed Gold Target Bar */}
        <Rect
          x={midX}
          y={baseY}
          offset={[0, 1]}
          width={barWidth}
          height={() => reqBarH()}
          fill={'rgba(217, 119, 6, 0.14)'}
          stroke={COLORS.goldAccent}
          lineWidth={3}
          lineDash={[10, 8]}
          radius={[8, 8, 0, 0]}
        />
        {/* Live Value Label Above Target Bar */}
        <Txt
          x={midX}
          y={() => baseY - reqBarH() - 28}
          text={() => `$${Math.round(reqVal())}B REQ`}
          fontFamily={FONTS.data}
          fontSize={wide ? 38 : 28}
          fontWeight={700}
          fill={COLORS.goldAccent}
        />
        {/* Target Sub-Badge Below Baseline */}
        <Rect
          x={midX}
          y={baseY + 54}
          opacity={reqSubOpacity}
          scale={reqSubScale}
          layout
          direction="column"
          alignItems="center"
          gap={8}
        >
          <Txt
            text="2X TCO TARGET"
            fontFamily={FONTS.heading}
            fontSize={wide ? 22 : 17}
            fontWeight={700}
            fill={COLORS.goldAccent}
          />
          <Rect
            layout
            padding={[4, 12]}
            fill={COLORS.goldAccent}
            radius={4}
          >
            <Txt
              text="SEQUOIA BENCHMARK"
              fontFamily={FONTS.data}
              fontSize={wide ? 14 : 12}
              fontWeight={700}
              fill={COLORS.surface}
            />
          </Rect>
        </Rect>
      </Node>

      {/* ===== PILLAR 3: < $45B ACTUAL AI REVENUE (Right) ===== */}
      <Node opacity={revOpacity}>
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
          y={() => baseY - revBarH() - 24}
          text="< $45B"
          fontFamily={FONTS.data}
          fontSize={wide ? 34 : 26}
          fontWeight={700}
          fill={COLORS.accent}
        />
        {/* Label & OpenAI Logo Below Baseline */}
        <Rect
          x={rightX}
          y={baseY + 54}
          layout
          direction="column"
          alignItems="center"
          gap={8}
        >
          <Txt
            text="ACTUAL AI REV"
            fontFamily={FONTS.heading}
            fontSize={wide ? 22 : 17}
            fontWeight={700}
            fill={COLORS.accent}
          />
          <Img
            src={'/assets/vid_20261029_002/openai_logo.png'}
            width={wide ? 42 : 36}
            height={wide ? 42 : 36}
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
        lineWidth={3}
        lineDash={[8, 8]}
        end={caliperEnd}
      />

      {/* Vertical Double-Arrow Caliper Measuring the $555B Chasm */}
      <Line
        points={[
          [rightX, baseY - maxReqH + 8],
          [rightX, baseY - maxRevH - 52],
        ]}
        stroke={COLORS.accent}
        lineWidth={4}
        startArrow
        endArrow
        arrowSize={12}
        end={caliperEnd}
      />

      {/* Opaque Masked Callout Pill Centered Over the Chasm */}
      <Rect
        x={rightX - (wide ? 80 : 40)}
        y={baseY - maxReqH * 0.54}
        opacity={chasmBadgeOpacity}
        scale={chasmBadgeScale}
        layout
        direction="column"
        alignItems="center"
        padding={[12, 20]}
        gap={4}
        fill={COLORS.accent}
        stroke={COLORS.ink}
        lineWidth={2}
        radius={8}
      >
        <Txt
          text="$555B REVENUE CHASM"
          fontFamily={FONTS.data}
          fontSize={wide ? 26 : 19}
          fontWeight={700}
          fill={COLORS.surface}
        />
        <Txt
          text="92% SHORTFALL VS CAPEX TARGET"
          fontFamily={FONTS.data}
          fontSize={wide ? 15 : 12}
          fontWeight={600}
          fill={COLORS.surface}
        />
      </Rect>
    </Node>
  );

  // --- Choreography (Total duration: 26.38s) ---

  // t = 0.6s: Baseline draws in
  yield* waitUntilSceneTime(0.6, t0);
  yield* baselineEnd(1, 0.7, easeOutExpo);

  // t = 1.8s: Left Pillar ($320B/YR CapEx bar + live counter) rises
  yield* waitUntilSceneTime(1.8, t0);
  yield* all(
    capexOpacity(1, 0.3),
    capexBarH(maxCapexH, 2.0, easeOutExpo),
    capexVal(320, 2.0, easeOutExpo),
  );

  // t = 5.0s: Left Pillar sub-badge pops in below baseline
  yield* waitUntilSceneTime(5.0, t0);
  yield* all(
    capexSubOpacity(1, 0.25),
    capexSubScale(1.12, 0.25, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
  );

  // t = 8.2s: Center Pillar ($600B REQ dashed gold bar + live counter) rises
  yield* waitUntilSceneTime(8.2, t0);
  yield* all(
    reqOpacity(1, 0.3),
    reqBarH(maxReqH, 2.0, easeOutExpo),
    reqVal(600, 2.0, easeOutExpo),
  );

  // t = 11.5s: 2X TCO TARGET // SEQUOIA BENCHMARK sub-badge pops in below Center Pillar
  yield* waitUntilSceneTime(11.5, t0);
  yield* all(
    reqSubOpacity(1, 0.25),
    reqSubScale(1.14, 0.25, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
  );

  // t = 14.8s: Right Pillar (< $45B actual AI revenue + OpenAI logo) pops in
  yield* waitUntilSceneTime(14.8, t0);
  yield* all(
    revOpacity(1, 0.3),
    revBarH(maxRevH, 0.9, easeOutExpo),
  );

  // t = 17.6s: Red Chasm Caliper draws from $600B top down to < $45B
  yield* waitUntilSceneTime(17.6, t0);
  yield* caliperEnd(1, 0.9, easeOutExpo);

  // t = 19.6s: $555B REVENUE CHASM masked pill pops in (finishes at 20.2s)
  yield* waitUntilSceneTime(19.6, t0);
  yield* all(
    chasmBadgeOpacity(1, 0.25),
    chasmBadgeScale(1.14, 0.3, easeOutExpo).to(1.0, 0.3, easeInOutCubic),
  );

  // Strict Hold-Time: Diagram remains fully visible until 26.38s (hold = 6.18s)
  yield* finishSceneAt(26.38, t0);
});

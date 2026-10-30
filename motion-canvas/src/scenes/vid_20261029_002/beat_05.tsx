import { Img, Line, makeScene2D, Node, Rect, Txt } from '@motion-canvas/2d';
import { all, createRef, createSignal, easeInOutCubic, easeOutExpo, useThread } from '@motion-canvas/core';
import { COLORS, FONTS, isWidescreen, setupBaseStage } from './layout';
import { finishSceneAt, waitUntilSceneTime } from './timings';

export default makeScene2D(function* (view) {
  const time = useThread().time;
  const t0 = time();

  // Setup Swiss Base Stage (Grid lines, section indicator, subtitle pill)
  setupBaseStage(view, '05 // WHAT POPS VS SURVIVES');

  const wide = isWidescreen(view);
  const stackW = wide ? 1240 : 880;

  const y3 = wide ? -190 : -280;
  const y2 = wide ? -20 : -60;
  const y1 = wide ? 150 : 160;

  // Layer 3 Signals (Top: Application / Thin AI Wrappers)
  const l3Opacity = createSignal(0.0);
  const l3Scale = createSignal(0.94);
  const l3Stroke = createSignal<string>(COLORS.ink);
  const l3BadgeBg = createSignal<string>(COLORS.ink);
  const l3BadgeText = createSignal('API CONSUMERS');
  const l3BadgeScale = createSignal(1.0);

  // Layer 2 Signals (Middle: Workflow Automation / Systems of Record)
  const l2Opacity = createSignal(0.0);
  const l2Scale = createSignal(0.97);
  const l2Stroke = createSignal<string>(COLORS.gridLine);
  const l2BadgeBg = createSignal<string>(COLORS.bg);
  const l2BadgeText = createSignal('SYSTEMS OF RECORD');
  const l2BadgeScale = createSignal(1.0);

  // Layer 1 Signals (Bottom: Infrastructure / Power & Cloud)
  const l1Opacity = createSignal(0.0);
  const l1Scale = createSignal(0.97);
  const l1Stroke = createSignal<string>(COLORS.gridLine);
  const l1BadgeBg = createSignal<string>(COLORS.bg);
  const l1BadgeText = createSignal('UTILITY & PHYSICAL');
  const l1BadgeScale = createSignal(1.0);

  // Dependency Arrows Signal
  const arrowOpacity = createSignal(0.0);

  const camera = createRef<Node>();

  view.add(
    <Node ref={camera}>
      {/* ===== DEPENDENCY ARROWS (L1 -> L2 -> L3) ===== */}
      <Line
        points={[
          [0, y1 - 135 / 2 - 2],
          [0, y2 + 135 / 2 + 6],
        ]}
        stroke={COLORS.secondaryInk}
        lineWidth={3}
        lineDash={[6, 4]}
        endArrow
        arrowSize={10}
        opacity={arrowOpacity}
      />
      <Line
        points={[
          [0, y2 - 135 / 2 - 2],
          [0, y3 + 135 / 2 + 6],
        ]}
        stroke={COLORS.secondaryInk}
        lineWidth={3}
        lineDash={[6, 4]}
        endArrow
        arrowSize={10}
        opacity={arrowOpacity}
      />

      {/* ===== LAYER 3: THIN AI WRAPPERS (TOP) ===== */}
      <Rect
        y={y3}
        width={stackW}
        height={135}
        layout
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        padding={[0, wide ? 36 : 20]}
        fill={COLORS.surface}
        stroke={l3Stroke}
        lineWidth={3}
        radius={10}
        opacity={l3Opacity}
        scale={l3Scale}
      >
        <Rect layout direction="row" alignItems="center" gap={wide ? 18 : 12}>
          <Txt
            text="L3 // APPLICATION"
            fontFamily={FONTS.data}
            fontSize={wide ? 22 : 16}
            fontWeight={700}
            fill={COLORS.secondaryInk}
          />
          <Img
            src={'/assets/vid_20261029_002/openai_logo.png'}
            width={wide ? 48 : 38}
            height={wide ? 48 : 38}
          />
          <Txt
            text="THIN AI WRAPPERS"
            fontFamily={FONTS.heading}
            fontSize={wide ? 34 : 24}
            fontWeight={700}
            fill={COLORS.ink}
          />
        </Rect>

        <Rect
          layout
          padding={[8, 16]}
          fill={l3BadgeBg}
          radius={6}
          scale={l3BadgeScale}
        >
          <Txt
            text={l3BadgeText}
            fontFamily={FONTS.data}
            fontSize={wide ? 20 : 15}
            fontWeight={700}
            fill={COLORS.surface}
          />
        </Rect>
      </Rect>

      {/* ===== LAYER 2: DEEP WORKFLOW AUTOMATION (MIDDLE) ===== */}
      <Rect
        y={y2}
        width={stackW}
        height={135}
        layout
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        padding={[0, wide ? 36 : 20]}
        fill={COLORS.surface}
        stroke={l2Stroke}
        lineWidth={3}
        radius={10}
        opacity={l2Opacity}
        scale={l2Scale}
      >
        <Rect layout direction="row" alignItems="center" gap={wide ? 18 : 12}>
          <Txt
            text="L2 // WORKFLOW"
            fontFamily={FONTS.data}
            fontSize={wide ? 22 : 16}
            fontWeight={700}
            fill={COLORS.secondaryInk}
          />
          <Txt
            text="DEEP WORKFLOW AUTOMATION"
            fontFamily={FONTS.heading}
            fontSize={wide ? 34 : 24}
            fontWeight={700}
            fill={COLORS.ink}
          />
        </Rect>

        <Rect
          layout
          padding={[8, 16]}
          fill={l2BadgeBg}
          radius={6}
          scale={l2BadgeScale}
        >
          <Txt
            text={l2BadgeText}
            fontFamily={FONTS.data}
            fontSize={wide ? 20 : 15}
            fontWeight={700}
            fill={() =>
              l2BadgeBg() === COLORS.bg ? COLORS.secondaryInk : COLORS.surface
            }
          />
        </Rect>
      </Rect>

      {/* ===== LAYER 1: POWER GRIDS & CLOUD INFRA (BOTTOM) ===== */}
      <Rect
        y={y1}
        width={stackW}
        height={135}
        layout
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        padding={[0, wide ? 36 : 20]}
        fill={COLORS.surface}
        stroke={l1Stroke}
        lineWidth={4}
        radius={10}
        opacity={l1Opacity}
        scale={l1Scale}
      >
        <Rect layout direction="row" alignItems="center" gap={wide ? 18 : 12}>
          <Txt
            text="L1 // INFRASTRUCTURE"
            fontFamily={FONTS.data}
            fontSize={wide ? 22 : 16}
            fontWeight={700}
            fill={COLORS.secondaryInk}
          />
          <Img
            src={'/assets/vid_20261029_002/aws_azure_badge.png'}
            width={wide ? 92 : 72}
            height={wide ? 46 : 36}
          />
          <Txt
            text="POWER GRIDS & CLOUD INFRA"
            fontFamily={FONTS.heading}
            fontSize={wide ? 34 : 24}
            fontWeight={700}
            fill={COLORS.ink}
          />
        </Rect>

        <Rect
          layout
          padding={[8, 16]}
          fill={l1BadgeBg}
          radius={6}
          scale={l1BadgeScale}
        >
          <Txt
            text={l1BadgeText}
            fontFamily={FONTS.data}
            fontSize={wide ? 20 : 15}
            fontWeight={700}
            fill={() =>
              l1BadgeBg() === COLORS.bg ? COLORS.secondaryInk : COLORS.surface
            }
          />
        </Rect>
      </Rect>
    </Node>
  );

  // --- Choreography (Total duration: 17.32s) ---

  // t = 0.3s..0.9s: Staggered upward cascade entry
  yield* waitUntilSceneTime(0.3, t0);
  yield* all(
    l1Opacity(0.65, 0.35, easeOutExpo),
    l2Opacity(0.65, 0.45, easeOutExpo),
    l3Opacity(1.0, 0.6, easeOutExpo),
    l3Scale(1.0, 0.6, easeOutExpo),
    arrowOpacity(0.6, 0.5, easeOutExpo),
  );

  // t = 2.4s: Layer 3 badge highlights RENTED COMPUTE in gold with overshoot
  yield* waitUntilSceneTime(2.4, t0);
  l3BadgeText('RENTED COMPUTE');
  yield* all(
    l3BadgeBg(COLORS.goldAccent, 0.25),
    l3BadgeScale(1.12, 0.2, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
    l3Stroke(COLORS.goldAccent, 0.3),
  );

  // t = 5.2s: Model costs fall toward zero -> Layer 3 badge flips to 90% WIPEOUT (COMMODITIZED)
  yield* waitUntilSceneTime(5.2, t0);
  l3BadgeText(wide ? '90% WIPEOUT (COMMODITIZED)' : '90% WIPEOUT');
  yield* all(
    l3BadgeBg(COLORS.accent, 0.25),
    l3BadgeScale(1.14, 0.2, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
    l3Stroke(COLORS.accent, 0.35),
  );

  // t = 8.2s: Layer 3 compresses slightly (scale 1.0 -> 0.96, opacity 1.0 -> 0.78), while L2 & L1 expand to scale 1.0, opacity 1.0, stroke ink
  yield* waitUntilSceneTime(8.2, t0);
  yield* all(
    l3Opacity(0.78, 0.45, easeInOutCubic),
    l3Scale(0.96, 0.45, easeInOutCubic),
    l2Opacity(1.0, 0.45, easeOutExpo),
    l2Scale(1.0, 0.45, easeOutExpo),
    l2Stroke(COLORS.ink, 0.45),
    l1Opacity(1.0, 0.45, easeOutExpo),
    l1Scale(1.0, 0.45, easeOutExpo),
    l1Stroke(COLORS.ink, 0.45),
  );

  // t = 11.0s: Layer 2 locks in with emerald green border & ENDURING MOAT
  yield* waitUntilSceneTime(11.0, t0);
  l2BadgeText('ENDURING MOAT');
  yield* all(
    l2Stroke(COLORS.compliantGreen, 0.35),
    l2BadgeBg(COLORS.compliantGreen, 0.25),
    l2BadgeScale(1.14, 0.2, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
  );

  // t = 13.6s: Layer 1 locks in with emerald green border & DISCOUNTED INFRA ROI, finishing at t = 14.2s
  yield* waitUntilSceneTime(13.6, t0);
  l1BadgeText(wide ? 'DISCOUNTED INFRA ROI' : 'BARGAIN ROI');
  yield* all(
    l1Stroke(COLORS.compliantGreen, 0.35),
    l1BadgeBg(COLORS.compliantGreen, 0.25),
    l1BadgeScale(1.14, 0.3, easeOutExpo).to(1.0, 0.3, easeInOutCubic),
  );

  // Strict Hold-Time: Diagram remains fully visible until 17.32s (hold >= 3.12s)
  yield* finishSceneAt(17.32, t0);
});

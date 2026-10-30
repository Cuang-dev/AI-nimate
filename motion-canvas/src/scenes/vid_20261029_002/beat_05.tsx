import { Img, Line, makeScene2D, Node, Rect, Txt } from '@motion-canvas/2d';
import { all, createRef, createSignal, easeInOutCubic, easeOutExpo, useThread } from '@motion-canvas/core';
import { COLORS, FONTS, isWidescreen, setupBaseStage } from './layout';
import { finishSceneAt, focalScale, waitUntilSceneTime } from './timings';

export default makeScene2D(function* (view) {
  const time = useThread().time;
  const t0 = time();

  // Setup Swiss Base Stage (Grid lines, section indicator, subtitle pill)
  setupBaseStage(view, '05 // WHAT POPS VS SURVIVES');

  const wide = isWidescreen(view);
  const stackW = wide ? 1320 : 940;
  const cardH = wide ? 145 : 195;

  const y3 = wide ? -195 : -340;
  const y2 = wide ? -20 : -60;
  const y1 = wide ? 155 : 220;

  // Focal Tracking Signal (3: Layer 3, 2: Layer 2, 1: Layer 1)
  const focalId = createSignal(3);

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
          [0, y1 - cardH / 2 - 4],
          [0, y2 + cardH / 2 + 8],
        ]}
        stroke={COLORS.secondaryInk}
        lineWidth={4}
        lineDash={[6, 4]}
        endArrow
        arrowSize={12}
        opacity={arrowOpacity}
      />
      <Line
        points={[
          [0, y2 - cardH / 2 - 4],
          [0, y3 + cardH / 2 + 8],
        ]}
        stroke={COLORS.secondaryInk}
        lineWidth={4}
        lineDash={[6, 4]}
        endArrow
        arrowSize={12}
        opacity={arrowOpacity}
      />

      {/* ===== LAYER 3: THIN AI WRAPPERS (TOP) ===== */}
      <Rect
        y={y3}
        width={stackW}
        height={cardH}
        layout
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        padding={wide ? [0, 38] : [22, 32]}
        fill={COLORS.surface}
        stroke={l3Stroke}
        lineWidth={3}
        radius={10}
        opacity={l3Opacity}
        scale={() => focalScale(focalId, 3, () => l3Scale(), time)}
      >
        <Rect
          layout
          direction={wide ? 'row' : 'column'}
          alignItems={wide ? 'center' : 'start'}
          gap={wide ? 20 : 12}
        >
          <Txt
            text="L3 // APPLICATION"
            fontFamily={FONTS.data}
            fontSize={wide ? 24 : 22}
            fontWeight={700}
            fill={COLORS.secondaryInk}
          />
          <Rect layout direction="row" alignItems="center" gap={16}>
            <Img
              src={'/assets/vid_20261029_002/openai_logo.png'}
              width={56}
              height={56}
            />
            <Txt
              text="THIN AI WRAPPERS"
              fontFamily={FONTS.heading}
              fontSize={wide ? 38 : 34}
              fontWeight={700}
              fill={COLORS.ink}
            />
          </Rect>
        </Rect>

        <Rect
          layout
          padding={wide ? [10, 20] : [14, 22]}
          fill={l3BadgeBg}
          radius={8}
          scale={l3BadgeScale}
        >
          <Txt
            text={l3BadgeText}
            fontFamily={FONTS.data}
            fontSize={wide ? 22 : 23}
            fontWeight={700}
            fill={COLORS.surface}
          />
        </Rect>
      </Rect>

      {/* ===== LAYER 2: DEEP WORKFLOW AUTOMATION (MIDDLE) ===== */}
      <Rect
        y={y2}
        width={stackW}
        height={cardH}
        layout
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        padding={wide ? [0, 38] : [22, 32]}
        fill={COLORS.surface}
        stroke={l2Stroke}
        lineWidth={3}
        radius={10}
        opacity={l2Opacity}
        scale={() => focalScale(focalId, 2, () => l2Scale(), time)}
      >
        <Rect
          layout
          direction={wide ? 'row' : 'column'}
          alignItems={wide ? 'center' : 'start'}
          gap={wide ? 20 : 12}
        >
          <Txt
            text="L2 // WORKFLOW"
            fontFamily={FONTS.data}
            fontSize={wide ? 24 : 22}
            fontWeight={700}
            fill={COLORS.secondaryInk}
          />
          <Rect layout direction="row" alignItems="center" gap={16}>
            <Txt
              text="DEEP WORKFLOW AUTOMATION"
              fontFamily={FONTS.heading}
              fontSize={wide ? 38 : 34}
              fontWeight={700}
              fill={COLORS.ink}
            />
          </Rect>
        </Rect>

        <Rect
          layout
          padding={wide ? [10, 20] : [14, 22]}
          fill={l2BadgeBg}
          radius={8}
          scale={l2BadgeScale}
        >
          <Txt
            text={l2BadgeText}
            fontFamily={FONTS.data}
            fontSize={wide ? 22 : 23}
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
        height={cardH}
        layout
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        padding={wide ? [0, 38] : [22, 32]}
        fill={COLORS.surface}
        stroke={l1Stroke}
        lineWidth={4}
        radius={10}
        opacity={l1Opacity}
        scale={() => focalScale(focalId, 1, () => l1Scale(), time)}
      >
        <Rect
          layout
          direction={wide ? 'row' : 'column'}
          alignItems={wide ? 'center' : 'start'}
          gap={wide ? 20 : 12}
        >
          <Txt
            text="L1 // INFRASTRUCTURE"
            fontFamily={FONTS.data}
            fontSize={wide ? 24 : 22}
            fontWeight={700}
            fill={COLORS.secondaryInk}
          />
          <Rect layout direction="row" alignItems="center" gap={16}>
            <Img
              src={'/assets/vid_20261029_002/aws_azure_badge.png'}
              width={wide ? 112 : 110}
              height={wide ? 56 : 55}
            />
            <Txt
              text="POWER GRIDS & CLOUD INFRA"
              fontFamily={FONTS.heading}
              fontSize={wide ? 38 : 34}
              fontWeight={700}
              fill={COLORS.ink}
            />
          </Rect>
        </Rect>

        <Rect
          layout
          padding={wide ? [10, 20] : [14, 22]}
          fill={l1BadgeBg}
          radius={8}
          scale={l1BadgeScale}
        >
          <Txt
            text={l1BadgeText}
            fontFamily={FONTS.data}
            fontSize={wide ? 22 : 23}
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

  // t = 0.3s: 3-tier architectural stack cascades onto screen
  yield* waitUntilSceneTime(0.3, t0);
  yield* all(
    l1Opacity(0.65, 0.35, easeOutExpo),
    l2Opacity(0.65, 0.45, easeOutExpo),
    l3Opacity(1.0, 0.6, easeOutExpo),
    l3Scale(1.0, 0.6, easeOutExpo),
    arrowOpacity(0.6, 0.5, easeOutExpo),
  );

  // t = 3.4s: Layer 3 highlights RENTED COMPUTE in gold as narrator says "generic chatbots on rented compute"
  yield* waitUntilSceneTime(3.4, t0);
  l3BadgeText('RENTED COMPUTE');
  yield* all(
    l3BadgeBg(COLORS.goldAccent, 0.25),
    l3BadgeScale(1.12, 0.2, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
    l3Stroke(COLORS.goldAccent, 0.3),
  );

  // t = 6.4s: Layer 3 flips to 90% WIPEOUT (COMMODITIZED) as narrator says "model costs fall toward zero"
  yield* waitUntilSceneTime(6.4, t0);
  l3BadgeText(wide ? '90% WIPEOUT (COMMODITIZED)' : '90% WIPEOUT');
  yield* all(
    l3BadgeBg(COLORS.accent, 0.25),
    l3BadgeScale(1.14, 0.2, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
    l3Stroke(COLORS.accent, 0.35),
  );

  // t = 9.8s: Layer 3 compresses slightly while Layer 2 & 1 expand as narrator says "Meanwhile, the real winners"
  yield* waitUntilSceneTime(9.8, t0);
  yield* all(
    l3Opacity(0.80, 0.45, easeInOutCubic),
    l3Scale(0.96, 0.45, easeInOutCubic),
    l2Opacity(1.0, 0.45, easeOutExpo),
    l2Scale(1.0, 0.45, easeOutExpo),
    l2Stroke(COLORS.ink, 0.45),
    l1Opacity(1.0, 0.45, easeOutExpo),
    l1Scale(1.0, 0.45, easeOutExpo),
    l1Stroke(COLORS.ink, 0.45),
  );

  // t = 11.5s: Layer 1 locks in with emerald green border & UTILITY & CLOUD MOAT as narrator says "power grid infrastructure"
  yield* waitUntilSceneTime(11.5, t0);
  focalId(1);
  l1BadgeText(wide ? 'UTILITY & CLOUD MOAT' : 'CLOUD MOAT');
  yield* all(
    l1Stroke(COLORS.compliantGreen, 0.35),
    l1BadgeBg(COLORS.compliantGreen, 0.25),
    l1BadgeScale(1.14, 0.2, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
  );

  // t = 13.0s: Layer 2 locks in with emerald green border & ENDURING MOAT as narrator says "and deep workflow automation"
  yield* waitUntilSceneTime(13.0, t0);
  focalId(2);
  l2BadgeText('ENDURING MOAT');
  yield* all(
    l2Stroke(COLORS.compliantGreen, 0.35),
    l2BadgeBg(COLORS.compliantGreen, 0.25),
    l2BadgeScale(1.14, 0.2, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
  );

  // t = 14.2s: Layer 1 badge updates/pulses to DISCOUNTED INFRA ROI as narrator says "will buy up that discounted compute", finishes at t = 14.6s
  yield* waitUntilSceneTime(14.2, t0);
  focalId(1);
  l1BadgeText(wide ? 'DISCOUNTED INFRA ROI' : 'BARGAIN ROI');
  yield* all(
    l1BadgeScale(1.14, 0.2, easeOutExpo).to(1.0, 0.2, easeInOutCubic),
  );

  // Strict Hold-Time: Diagram remains fully visible until 17.32s (hold >= 2.72s)
  yield* finishSceneAt(17.32, t0);
});
